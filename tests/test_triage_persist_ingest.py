"""TASK G2 ingest triage safety wiring.

Covered here:
- `runner ingest --triage` writes triage_result.json into the doc folder once
  the doc_id exists.
- upload-related code can load that optional triage result, tolerating absence.
- `runner ingest --yes` uses analysis and persisted triage flags to hold
  testimony/legal-sensitive documents locally instead of uploading/enriching.

No real network/LLM: the ingest pipeline stages are stubbed; only the
triage persistence/load wiring under test runs for real.
"""
from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest
from typer.testing import CliRunner

from runner.models.document import AnalysisResult
from runner.models.triage import TriageResult
from runner.pipeline import triage as triage_mod
from runner.pipeline import upload as upload_mod


# ---------------------------------------------------------------------------
# 1. upload.load_triage_result -- load / tolerate-missing contract
# ---------------------------------------------------------------------------

def _cfg(tmp_path: Path) -> SimpleNamespace:
    return SimpleNamespace(corpus_dir=tmp_path)


def test_upload_loader_returns_none_when_missing(tmp_path):
    cfg = _cfg(tmp_path)
    assert upload_mod.load_triage_result("no-such-doc", cfg) is None


def test_upload_loader_returns_none_for_corrupt_file(tmp_path):
    cfg = _cfg(tmp_path)
    doc_dir = tmp_path / "doc-bad"
    doc_dir.mkdir()
    (doc_dir / "triage_result.json").write_text("{not json", encoding="utf-8")
    assert upload_mod.load_triage_result("doc-bad", cfg) is None


def test_upload_loader_retrieves_flags_when_present(tmp_path):
    cfg = _cfg(tmp_path)
    result = TriageResult(
        triage_succeeded=True,
        doc_type_hint="testimony",
        needs_testimony_review=True,
        needs_legal_review=True,
        overnight_batch_safe=False,
    )
    triage_mod.save_triage_result("doc-flags", result, cfg)

    loaded = upload_mod.load_triage_result("doc-flags", cfg)
    assert loaded is not None
    assert loaded.needs_testimony_review is True
    assert loaded.needs_legal_review is True
    assert loaded.overnight_batch_safe is False


# ---------------------------------------------------------------------------
# 2. Helper behaviour: disk triage is not loaded implicitly by upload helpers
# ---------------------------------------------------------------------------

def _analysis(doc_type: str = "Anti-SOGICE", *, testimony_flag: bool = False) -> AnalysisResult:
    return AnalysisResult(
        type=doc_type,
        format="Website-Page",
        evidence=[],
        scope="Core",
        narrative_register="Journalistic",
        testimony_flag=testimony_flag,
        summary="A normal non-testimony document.",
    )


def _normal_analysis() -> AnalysisResult:
    return _analysis()


def test_consent_gate_still_ignores_triage_flags(tmp_path):
    """requires_consent_gate only sees the triage object explicitly passed in."""
    cfg = _cfg(tmp_path)
    triage_mod.save_triage_result(
        "doc-x",
        TriageResult(triage_succeeded=True, needs_testimony_review=True),
        cfg,
    )
    analysis = _normal_analysis()
    assert upload_mod.requires_consent_gate(analysis) is False


# ---------------------------------------------------------------------------
# 3. ingest --triage persists triage_result.json once doc_id exists
# ---------------------------------------------------------------------------

@pytest.fixture
def stub_pipeline(monkeypatch, tmp_path):
    """Stub every ingest pipeline stage EXCEPT triage.save_triage_result, which
    is the wiring under test. Returns the corpus dir used by the fake config."""
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    cfg = SimpleNamespace(
        corpus_dir=corpus,
        embedding_model="embed-model",
        litelm_embedding_model="research-embedding",
    )

    import runner.main as main_mod

    monkeypatch.setattr(main_mod, "load_config", lambda *a, **k: cfg)

    # Triage: snippet + run stubbed; save_triage_result stays REAL.
    monkeypatch.setattr(
        main_mod.triage, "extract_snippet", lambda src, **k: ("snippet text", "note")
    )
    monkeypatch.setattr(
        main_mod.triage,
        "run",
        lambda text, config, **k: TriageResult(
            triage_succeeded=True,
            doc_type_hint="testimony",
            needs_testimony_review=True,
            overnight_batch_safe=False,
        ),
    )

    # Intake returns a doc with a known id; save_triage_result will create the dir.
    monkeypatch.setattr(
        main_mod.intake, "find_existing_by_source", lambda src, config: []
    )
    monkeypatch.setattr(
        main_mod.intake,
        "run",
        lambda *a, **k: SimpleNamespace(
            doc_id="doc-test",
            source_type="url",
            declared_type="",
            batch_id="b1",
            source_url="",
            testimony_consent="",
        ),
    )

    # Preprocess / embed / analyze / upload all stubbed.
    monkeypatch.setattr(
        main_mod.preprocess,
        "run",
        lambda *a, **k: SimpleNamespace(
            text="body text",
            truncated=False,
            intake_declared_type=None,
            intake_batch_id=None,
            intake_source_url=None,
        ),
    )
    monkeypatch.setattr(main_mod.embed, "run", lambda *a, **k: [0.1, 0.2])
    monkeypatch.setattr(
        main_mod.analyze, "run",
        lambda *a, **k: _normal_analysis(),
    )
    monkeypatch.setattr(main_mod.upload, "run", lambda *a, **k: None)
    monkeypatch.setattr(main_mod.upload, "save_locally", lambda *a, **k: corpus / "doc-test")
    monkeypatch.setattr(main_mod.enrich, "run", lambda *a, **k: None)
    monkeypatch.setattr(main_mod.enrich, "save", lambda *a, **k: corpus / "doc-test" / "enrichment.json")

    # Review checkpoints: non-interactive pass-through.
    monkeypatch.setattr(main_mod.review, "checkpoint_triage", lambda result, llm: llm)
    monkeypatch.setattr(main_mod.review, "checkpoint_intake", lambda r: True)
    monkeypatch.setattr(main_mod.review, "checkpoint_preprocess", lambda r: True)
    monkeypatch.setattr(
        main_mod.review, "checkpoint_analysis", lambda result, doc_id, yes: result
    )
    monkeypatch.setattr(
        main_mod.review,
        "checkpoint_testimony_consent",
        lambda doc_id, result, config, *, triage_result=None, yes=False: "not_required",
    )
    monkeypatch.setattr(main_mod.review, "checkpoint_upload", lambda doc_id, result: True)

    return corpus


def test_ingest_with_triage_saves_triage_result(stub_pipeline):
    from runner.main import app

    result = CliRunner().invoke(
        app,
        ["ingest", "https://example.org/doc", "--triage", "--no-enrich", "--llm", "claude"],
    )
    assert result.exit_code == 0, result.output

    saved = stub_pipeline / "doc-test" / "triage_result.json"
    assert saved.exists(), "ingest --triage must persist triage_result.json"

    loaded = TriageResult.model_validate_json(saved.read_text(encoding="utf-8"))
    assert loaded.needs_testimony_review is True
    assert loaded.overnight_batch_safe is False


def test_ingest_without_triage_writes_no_triage_file(stub_pipeline):
    from runner.main import app

    result = CliRunner().invoke(
        app,
        ["ingest", "https://example.org/doc", "--no-enrich", "--llm", "claude"],
    )
    assert result.exit_code == 0, result.output

    saved = stub_pipeline / "doc-test" / "triage_result.json"
    assert not saved.exists(), "no --triage flag => no triage_result.json written"


def test_ingest_triage_rejected_at_intake_writes_no_file(stub_pipeline, monkeypatch):
    """If the researcher rejects the intake checkpoint, persistence must not run
    — no corpus folder should be left holding only triage_result.json."""
    import runner.main as main_mod
    monkeypatch.setattr(main_mod.review, "checkpoint_intake", lambda r: False)

    from runner.main import app

    result = CliRunner().invoke(
        app,
        ["ingest", "https://example.org/doc", "--triage", "--no-enrich", "--llm", "claude"],
    )
    # typer.Exit() with no code => clean exit 0.
    assert result.exit_code == 0, result.output

    saved = stub_pipeline / "doc-test" / "triage_result.json"
    assert not saved.exists(), (
        "rejecting intake must not persist triage_result.json"
    )


def test_ingest_persists_failed_triage_after_accepted_intake(stub_pipeline, monkeypatch):
    """A fail-closed triage result is still persisted (after intake is accepted)
    so its safety state is recorded, not silently dropped."""
    import runner.main as main_mod
    monkeypatch.setattr(
        main_mod.triage, "run",
        lambda text, config, **k: TriageResult.failed("model down"),
    )

    from runner.main import app

    result = CliRunner().invoke(
        app,
        ["ingest", "https://example.org/doc", "--triage", "--no-enrich", "--llm", "claude"],
    )
    assert result.exit_code == 0, result.output

    saved = stub_pipeline / "doc-test" / "triage_result.json"
    assert saved.exists(), "a failed triage must still be persisted after accepted intake"

    loaded = TriageResult.model_validate_json(saved.read_text(encoding="utf-8"))
    assert loaded.triage_succeeded is False
    assert loaded.overnight_batch_safe is False


def test_ingest_yes_analysis_testimony_saves_local_without_upload_or_enrich(
    stub_pipeline, monkeypatch
):
    """Under --yes, a testimony analysis must be held locally, not uploaded or enriched."""
    import runner.main as main_mod

    calls = {"saved": 0, "uploaded": 0, "enriched": 0}

    monkeypatch.setattr(
        main_mod.analyze,
        "run",
        lambda *a, **k: _analysis("Testimony", testimony_flag=True),
    )
    monkeypatch.setattr(
        main_mod.review,
        "checkpoint_testimony_consent",
        lambda doc_id, result, config, *, triage_result=None, yes=False: "pending"
        if yes
        else "not_required",
    )

    def _save_locally(*args, **kwargs):
        calls["saved"] += 1
        return stub_pipeline / "doc-test"

    def _upload(*args, **kwargs):
        calls["uploaded"] += 1

    def _enrich(*args, **kwargs):
        calls["enriched"] += 1

    monkeypatch.setattr(main_mod.upload, "save_locally", _save_locally)
    monkeypatch.setattr(main_mod.upload, "run", _upload)
    monkeypatch.setattr(main_mod.enrich, "run", _enrich)

    from runner.main import app

    result = CliRunner().invoke(
        app,
        ["ingest", "https://example.org/doc", "--yes", "--llm", "claude"],
    )
    assert result.exit_code == 0, result.output
    assert calls == {"saved": 1, "uploaded": 0, "enriched": 0}


def test_ingest_yes_loads_persisted_triage_testimony_and_holds_upload(
    stub_pipeline, monkeypatch
):
    """When --yes skips live triage, ingest still loads persisted triage and honors it."""
    import runner.main as main_mod

    triage_mod.save_triage_result(
        "doc-test",
        TriageResult(triage_succeeded=True, needs_testimony_review=True),
        SimpleNamespace(corpus_dir=stub_pipeline),
    )
    calls = {"saved": 0, "uploaded": 0, "enriched": 0}
    captured = {}

    def _checkpoint(doc_id, result, config, *, triage_result=None, yes=False):
        captured["triage_result"] = triage_result
        captured["yes"] = yes
        return "pending" if triage_result and triage_result.needs_testimony_review else "not_required"

    def _save_locally(*args, **kwargs):
        calls["saved"] += 1
        return stub_pipeline / "doc-test"

    monkeypatch.setattr(main_mod.review, "checkpoint_testimony_consent", _checkpoint)
    monkeypatch.setattr(main_mod.upload, "save_locally", _save_locally)
    monkeypatch.setattr(main_mod.upload, "run", lambda *a, **k: calls.__setitem__("uploaded", calls["uploaded"] + 1))
    monkeypatch.setattr(main_mod.enrich, "run", lambda *a, **k: calls.__setitem__("enriched", calls["enriched"] + 1))

    from runner.main import app

    result = CliRunner().invoke(
        app,
        ["ingest", "https://example.org/doc", "--yes", "--llm", "claude"],
    )
    assert result.exit_code == 0, result.output
    assert captured["yes"] is True
    assert captured["triage_result"] is not None
    assert captured["triage_result"].needs_testimony_review is True
    assert calls == {"saved": 1, "uploaded": 0, "enriched": 0}


def test_ingest_yes_legal_review_saves_local_without_upload_or_enrich(
    stub_pipeline, monkeypatch
):
    """Legal-sensitive documents in --yes mode are held locally without consent wording."""
    import runner.main as main_mod

    calls = {"saved": 0, "uploaded": 0, "enriched": 0}

    monkeypatch.setattr(
        main_mod.analyze,
        "run",
        lambda *a, **k: _analysis("Legal-Instrument"),
    )
    monkeypatch.setattr(
        main_mod.review,
        "checkpoint_testimony_consent",
        lambda doc_id, result, config, *, triage_result=None, yes=False: "not_required",
    )

    def _save_locally(*args, **kwargs):
        calls["saved"] += 1
        return stub_pipeline / "doc-test"

    monkeypatch.setattr(main_mod.upload, "save_locally", _save_locally)
    monkeypatch.setattr(main_mod.upload, "run", lambda *a, **k: calls.__setitem__("uploaded", calls["uploaded"] + 1))
    monkeypatch.setattr(main_mod.enrich, "run", lambda *a, **k: calls.__setitem__("enriched", calls["enriched"] + 1))

    from runner.main import app

    result = CliRunner().invoke(
        app,
        ["ingest", "https://example.org/doc", "--yes", "--llm", "claude"],
    )
    assert result.exit_code == 0, result.output
    assert calls == {"saved": 1, "uploaded": 0, "enriched": 0}
    assert "legal review hold" in result.output
    assert "consent pending" not in result.output.lower()


def test_ingest_attended_legal_review_can_upload_after_checkpoint(
    stub_pipeline, monkeypatch
):
    """In attended mode, legal review is a warning path; the upload checkpoint decides."""
    import runner.main as main_mod

    calls = {"saved": 0, "uploaded": 0}
    monkeypatch.setattr(main_mod.analyze, "run", lambda *a, **k: _analysis("Legal-Instrument"))
    monkeypatch.setattr(main_mod.upload, "save_locally", lambda *a, **k: calls.__setitem__("saved", calls["saved"] + 1))
    monkeypatch.setattr(main_mod.upload, "run", lambda *a, **k: calls.__setitem__("uploaded", calls["uploaded"] + 1))
    monkeypatch.setattr(main_mod.review, "checkpoint_upload", lambda doc_id, result: True)

    from runner.main import app

    result = CliRunner().invoke(
        app,
        ["ingest", "https://example.org/doc", "--no-enrich", "--llm", "claude"],
    )
    assert result.exit_code == 0, result.output
    assert calls == {"saved": 0, "uploaded": 1}


def test_ingest_attended_legal_review_decline_uses_legal_hold_panel(
    stub_pipeline, monkeypatch
):
    """If attended legal review declines upload, the saved-local panel names the hold."""
    import runner.main as main_mod

    calls = {"saved": 0, "uploaded": 0}
    monkeypatch.setattr(main_mod.analyze, "run", lambda *a, **k: _analysis("Legal-Instrument"))
    monkeypatch.setattr(main_mod.review, "checkpoint_upload", lambda doc_id, result: False)

    def _save_locally(*args, **kwargs):
        calls["saved"] += 1
        return stub_pipeline / "doc-test"

    monkeypatch.setattr(main_mod.upload, "save_locally", _save_locally)
    monkeypatch.setattr(main_mod.upload, "run", lambda *a, **k: calls.__setitem__("uploaded", calls["uploaded"] + 1))

    from runner.main import app

    result = CliRunner().invoke(
        app,
        ["ingest", "https://example.org/doc", "--no-enrich", "--llm", "claude"],
    )
    assert result.exit_code == 0, result.output
    assert calls == {"saved": 1, "uploaded": 0}
    assert "legal review hold" in result.output
