from __future__ import annotations

import json
from types import SimpleNamespace

import pytest
from typer.testing import CliRunner

from runner.clients import sanity
from runner.main import app
from runner.models.document import (
    AnalysisResult,
    DocumentPackage,
    IntakeResult,
    PreprocessResult,
)


def _analysis() -> AnalysisResult:
    return AnalysisResult.model_validate(
        {
            "type": "Anti-SOGICE",
            "format": "Blog-Post",
            "evidence": ["Evidence text."],
            "scope": "Core",
            "narrative_register": "Journalistic",
            "summary": "A short summary.",
        }
    )


def _pkg(tmp_path) -> DocumentPackage:
    intake = IntakeResult(
        doc_id="doc-1",
        source="https://example.org/doc",
        source_type="url",
        declared_type="url",
        tier=2,
        batch_id="batch-1",
        language=None,
        local_dir=tmp_path,
    )
    preprocess = PreprocessResult(
        doc_id="doc-1",
        tool_used="trafilatura",
        quality="high",
        text="document text",
    )
    return DocumentPackage(
        intake=intake,
        preprocess=preprocess,
        analysis=_analysis(),
        embedding=[],
        embedding_model="embed-model",
        llm_used="litelm",
        local_dir=tmp_path,
    )


def _config(tmp_path):
    return SimpleNamespace(corpus_dir=tmp_path)


def test_write_document_allows_new_sanity_document(monkeypatch, tmp_path):
    calls = {"fetched": [], "mutations": []}

    def _fetch(doc_id, config, projection):
        calls["fetched"].append((doc_id, projection))
        return None

    def _mutate(mutations, config):
        calls["mutations"].append(mutations)
        return {"results": [{"id": "doc-doc-1"}]}

    monkeypatch.setattr(sanity, "_fetch_document_by_id", _fetch)
    monkeypatch.setattr(sanity, "_mutate", _mutate)

    assert sanity.write_document(_pkg(tmp_path), _config(tmp_path)) == "doc-doc-1"
    assert calls["fetched"][0][0] == "doc-doc-1"
    assert "workflowStatus" in calls["fetched"][0][1]
    assert calls["mutations"][0][0]["createOrReplace"]["_id"] == "doc-doc-1"


@pytest.mark.parametrize("status", ["verified", "published"])
def test_write_document_blocks_reviewed_workflow_status(monkeypatch, tmp_path, status):
    monkeypatch.setattr(
        sanity,
        "_fetch_document_by_id",
        lambda *a, **k: {"workflowStatus": status},
    )
    monkeypatch.setattr(
        sanity,
        "_mutate",
        lambda *a, **k: pytest.fail("reviewed document must not be mutated"),
    )

    with pytest.raises(RuntimeError, match="--force-reviewed"):
        sanity.write_document(_pkg(tmp_path), _config(tmp_path))


def test_write_document_blocks_explicit_human_review(monkeypatch, tmp_path):
    monkeypatch.setattr(
        sanity,
        "_fetch_document_by_id",
        lambda *a, **k: {
            "workflowStatus": "unverified",
            "aiMetadata": {
                "humanReview": {
                    "reviewedBy": "researcher",
                    "reviewedAt": "2026-01-01T00:00:00Z",
                }
            },
        },
    )
    monkeypatch.setattr(
        sanity,
        "_mutate",
        lambda *a, **k: pytest.fail("human-reviewed document must not be mutated"),
    )

    with pytest.raises(RuntimeError, match="humanReview"):
        sanity.write_document(_pkg(tmp_path), _config(tmp_path))


@pytest.mark.parametrize(
    "existing",
    [
        {"validation": {"resolution": "human_override"}},
        {
            "validation": {
                "status": "validated",
                "validationTrigger": "manual_researcher",
            }
        },
        {"aiMetadata": {"resolution": "human_override"}},
    ],
)
def test_write_document_blocks_corrected_validation_markers(monkeypatch, tmp_path, existing):
    monkeypatch.setattr(sanity, "_fetch_document_by_id", lambda *a, **k: existing)
    monkeypatch.setattr(
        sanity,
        "_mutate",
        lambda *a, **k: pytest.fail("corrected document must not be mutated"),
    )

    with pytest.raises(RuntimeError, match="reviewed/corrected"):
        sanity.write_document(_pkg(tmp_path), _config(tmp_path))


def test_write_document_force_reviewed_skips_guard_and_replaces(monkeypatch, tmp_path):
    calls = {"fetched": 0, "mutated": 0}

    def _fetch(*args, **kwargs):
        calls["fetched"] += 1
        return {"workflowStatus": "published"}

    def _mutate(mutations, config):
        calls["mutated"] += 1
        return {"results": [{"id": "doc-doc-1"}]}

    monkeypatch.setattr(sanity, "_fetch_document_by_id", _fetch)
    monkeypatch.setattr(sanity, "_mutate", _mutate)

    assert (
        sanity.write_document(
            _pkg(tmp_path),
            _config(tmp_path),
            force_reviewed=True,
        )
        == "doc-doc-1"
    )
    assert calls == {"fetched": 0, "mutated": 1}


def test_upload_saved_threads_force_reviewed_to_sanity(monkeypatch, tmp_path):
    from runner.pipeline import upload

    doc_id = "doc-1"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()
    (doc_dir / "analysis.json").write_text(_analysis().model_dump_json(), encoding="utf-8")
    (doc_dir / "intake.json").write_text(
        json.dumps({"doc_id": doc_id, "source": "https://example.org/doc"}),
        encoding="utf-8",
    )
    (doc_dir / "metadata.json").write_text(
        json.dumps({"llm_used": "litelm", "embedding_model": "embed-model"}),
        encoding="utf-8",
    )
    (doc_dir / "extracted.txt").write_text("document text", encoding="utf-8")
    (doc_dir / "embedding.json").write_text(
        json.dumps({"vector": [0.1, 0.2], "model": "embed-model"}),
        encoding="utf-8",
    )
    captured = {}
    cfg = SimpleNamespace(corpus_dir=tmp_path, embedding_model="embed-model")

    def _write_document(pkg, config, *, force_reviewed=False):
        captured["force_reviewed"] = force_reviewed
        return "doc-doc-1"

    monkeypatch.setattr(upload.sanity_client, "write_document", _write_document)
    monkeypatch.setattr(upload.supabase_client, "upsert_embedding", lambda *a, **k: None)
    monkeypatch.setattr(upload, "_enforce_testimony_upload_gate", lambda *a, **k: None)
    monkeypatch.setattr(upload, "_repair_analysis_date_from_source", lambda *a, **k: False)

    upload.upload_saved(doc_id, cfg, force_sanity_overwrite=True)

    assert captured["force_reviewed"] is True


def test_upload_doc_force_flag_threads_override(monkeypatch, tmp_path):
    import runner.main as main_mod

    captured = {}
    monkeypatch.setattr(main_mod, "load_config", lambda: _config(tmp_path))
    monkeypatch.setattr(
        main_mod.upload,
        "upload_saved",
        lambda doc_id, config, *, force_sanity_overwrite=False: captured.update(
            doc_id=doc_id,
            force_sanity_overwrite=force_sanity_overwrite,
        ),
    )

    result = CliRunner().invoke(app, ["upload-doc", "doc-1", "--force-reviewed"])

    assert result.exit_code == 0, result.output
    assert captured == {"doc_id": "doc-1", "force_sanity_overwrite": True}


def test_reanalyze_upload_force_flag_threads_override(monkeypatch, tmp_path):
    import runner.main as main_mod

    doc_id = "doc-1"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()
    (doc_dir / "extracted.txt").write_text("document text", encoding="utf-8")
    (doc_dir / "analysis.json").write_text(_analysis().model_dump_json(), encoding="utf-8")
    captured = {}
    cfg = _config(tmp_path)

    monkeypatch.setattr(main_mod, "load_config", lambda llm="litelm": cfg)
    monkeypatch.setattr(main_mod.analyze, "enrich_preprocess_from_intake", lambda *a, **k: None)
    monkeypatch.setattr(main_mod.analyze, "run", lambda *a, **k: _analysis())
    monkeypatch.setattr(main_mod.review, "checkpoint_analysis", lambda result, doc_id, yes: result)
    monkeypatch.setattr(
        main_mod.upload,
        "upload_saved",
        lambda doc_id, config, *, force_sanity_overwrite=False: captured.update(
            doc_id=doc_id,
            force_sanity_overwrite=force_sanity_overwrite,
        ),
    )

    result = CliRunner().invoke(
        app,
        ["reanalyze", doc_id, "--upload", "--yes", "--force", "--llm", "claude"],
    )

    assert result.exit_code == 0, result.output
    assert captured == {"doc_id": doc_id, "force_sanity_overwrite": True}
