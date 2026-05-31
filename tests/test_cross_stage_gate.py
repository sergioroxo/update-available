"""TASK G2-b-1 -- cross-stage testimony/legal gate helpers.

The upload safety gate now cross-checks triage flags against analysis:
- requires_consent_gate(analysis, triage_result=None): testimony consent gate,
  fires on analysis.testimony_flag, consent-gated type, OR triage
  needs_testimony_review.
- requires_legal_review(analysis, triage_result=None): SEPARATE legal-accuracy
  review hold (not consent), fires on legal-sensitive type OR triage
  needs_legal_review. Does NOT use analysis.legal_status.
- _enforce_testimony_upload_gate(intake, analysis, triage_result=None): hard
  backstop that now honours the triage cross-check.

This slice does NOT change main.ingest headless behaviour or
checkpoint_testimony_consent. No network/LLM.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import click
import pytest

from runner.models.document import (
    AnalysisResult,
    IntakeResult,
    LegalStatus,
    PreprocessResult,
)
from runner.models.triage import TriageResult
from runner.pipeline import triage as triage_mod
from runner.pipeline import upload as upload_mod
from runner.pipeline.upload import (
    _enforce_testimony_upload_gate,
    requires_consent_gate,
    requires_legal_review,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _analysis(doc_type: str = "Anti-SOGICE", **extra) -> AnalysisResult:
    data = {
        "type": doc_type,
        "format": "Blog-Post",
        "evidence": ["Evidence text."],
        "scope": "Core",
        "narrative_register": "Legal-Policy",
        "summary": "A short summary.",
    }
    data.update(extra)
    return AnalysisResult.model_validate(data)


def _intake(tmp_path, consent: str = "") -> IntakeResult:
    return IntakeResult(
        doc_id="doc-1",
        source="https://example.org/doc",
        source_type="url",
        declared_type="url",
        tier=2,
        batch_id="batch-1",
        language=None,
        testimony_consent=consent,
        local_dir=tmp_path,
    )


def _triage(**flags) -> TriageResult:
    return TriageResult(triage_succeeded=True, **flags)


# ---------------------------------------------------------------------------
# requires_consent_gate -- testimony cross-check
# ---------------------------------------------------------------------------

def test_consent_gate_normal_no_triage_is_false():
    assert requires_consent_gate(_analysis("Anti-SOGICE")) is False


def test_consent_gate_on_analysis_testimony_flag():
    assert requires_consent_gate(_analysis(testimony_flag=True)) is True


def test_consent_gate_on_consent_gated_type():
    a = _analysis("Testimony")
    assert a.testimony_flag is False
    assert requires_consent_gate(a) is True


def test_consent_gate_on_survivor_network_type():
    assert requires_consent_gate(_analysis("Survivor-Network-Material")) is True


def test_consent_gate_normal_plus_triage_testimony_is_true():
    assert requires_consent_gate(
        _analysis("Anti-SOGICE"), _triage(needs_testimony_review=True)
    ) is True


def test_consent_gate_normal_plus_triage_legal_only_is_false():
    # Legal review is NOT consent; a legal triage flag must not trip the gate.
    assert requires_consent_gate(
        _analysis("Anti-SOGICE"), _triage(needs_legal_review=True)
    ) is False


def test_consent_gate_single_positional_arg_still_supported():
    """app.py calls requires_consent_gate(analysis) positionally — must work."""
    assert requires_consent_gate(_analysis("Testimony")) is True
    assert requires_consent_gate(_analysis("Anti-SOGICE")) is False


# ---------------------------------------------------------------------------
# _enforce_testimony_upload_gate -- triage cross-check at the backstop
# ---------------------------------------------------------------------------

def test_enforce_blocks_triage_testimony_only_when_consent_missing(tmp_path):
    intake = _intake(tmp_path, consent="")
    analysis = _analysis("Anti-SOGICE")  # analysis itself is not testimony
    with pytest.raises(click.exceptions.Exit):
        _enforce_testimony_upload_gate(
            intake, analysis, _triage(needs_testimony_review=True)
        )


def test_enforce_passes_triage_testimony_only_when_consent_confirmed(tmp_path):
    intake = _intake(tmp_path, consent="confirmed")
    analysis = _analysis("Anti-SOGICE")
    # Should not raise.
    _enforce_testimony_upload_gate(
        intake, analysis, _triage(needs_testimony_review=True)
    )


def test_enforce_without_triage_is_unchanged_for_normal_doc(tmp_path):
    intake = _intake(tmp_path, consent="")
    _enforce_testimony_upload_gate(intake, _analysis("Anti-SOGICE"))  # no raise
    _enforce_testimony_upload_gate(intake, _analysis("Anti-SOGICE"), None)  # no raise


# ---------------------------------------------------------------------------
# requires_legal_review -- separate, non-consent helper
# ---------------------------------------------------------------------------

def test_legal_review_on_legal_instrument_type():
    assert requires_legal_review(_analysis("Legal-Instrument")) is True


def test_legal_review_on_regulatory_policy_type():
    assert requires_legal_review(_analysis("Regulatory-Policy-Document")) is True


def test_legal_review_normal_plus_triage_legal_is_true():
    assert requires_legal_review(
        _analysis("Anti-SOGICE"), _triage(needs_legal_review=True)
    ) is True


def test_legal_review_normal_no_triage_is_false():
    assert requires_legal_review(_analysis("Anti-SOGICE")) is False


def test_legal_review_does_not_fire_on_legal_status_alone():
    a = _analysis(
        "Anti-SOGICE",
        legal_status=LegalStatus(jurisdiction="UK", status="banned"),
    )
    assert a.legal_status is not None and a.legal_status.status == "banned"
    assert requires_legal_review(a) is False


def test_legal_review_triage_testimony_only_is_false():
    # A testimony triage flag must not trip the legal review helper.
    assert requires_legal_review(
        _analysis("Anti-SOGICE"), _triage(needs_testimony_review=True)
    ) is False


# ---------------------------------------------------------------------------
# Call-site tests: run() and upload_saved() must LOAD the persisted triage
# result and pass it to the testimony backstop.
# ---------------------------------------------------------------------------

@dataclass
class _Config:
    corpus_dir: Path
    embedding_model: str = "test-embed-model"


def _capture_enforce(monkeypatch):
    """Patch _enforce_testimony_upload_gate to capture its triage_result arg;
    returns the dict that will hold the captured value."""
    captured: dict = {}

    def _fake_enforce(intake, analysis, triage_result=None):
        captured["triage_result"] = triage_result

    monkeypatch.setattr(upload_mod, "_enforce_testimony_upload_gate", _fake_enforce)
    return captured


def test_upload_run_loads_and_passes_persisted_triage(tmp_path, monkeypatch):
    cfg = _Config(corpus_dir=tmp_path)
    doc_id = "doc-1"

    # Persist a triage flagging testimony review.
    triage_mod.save_triage_result(
        doc_id, TriageResult(triage_succeeded=True, needs_testimony_review=True), cfg
    )

    captured = _capture_enforce(monkeypatch)
    monkeypatch.setattr(upload_mod.sanity_client, "write_document", lambda pkg, config: "sanity-id")
    monkeypatch.setattr(upload_mod.supabase_client, "upsert_embedding", lambda *a, **k: None)
    monkeypatch.setattr(upload_mod, "_repair_analysis_date_from_source", lambda a, p: False)

    intake = _intake(tmp_path, consent="")
    preprocess = PreprocessResult(doc_id=doc_id, tool_used="manual", quality="high", text="body")

    upload_mod.run(intake, preprocess, [0.1] * 10, _analysis("Anti-SOGICE"), cfg, "litelm")

    assert "triage_result" in captured, "_enforce was not called"
    assert captured["triage_result"] is not None
    assert captured["triage_result"].needs_testimony_review is True


def test_upload_saved_loads_and_passes_persisted_triage(tmp_path, monkeypatch):
    cfg = _Config(corpus_dir=tmp_path)
    doc_id = "doc-saved"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    analysis = _analysis("Anti-SOGICE")
    (doc_dir / "analysis.json").write_text(analysis.model_dump_json(indent=2), encoding="utf-8")
    (doc_dir / "intake.json").write_text(
        json.dumps({"doc_id": doc_id, "source": "https://example.com", "testimony_consent": ""}),
        encoding="utf-8",
    )
    (doc_dir / "metadata.json").write_text(
        json.dumps({"llm_used": "litelm", "embedding_model": "m", "saved_at": "2026-01-01T00:00:00+00:00"}),
        encoding="utf-8",
    )
    (doc_dir / "extracted.txt").write_text("source text", encoding="utf-8")
    (doc_dir / "embedding.json").write_text(
        json.dumps({"model": "m", "dimension": 10, "vector": [0.1] * 10}), encoding="utf-8"
    )

    # Persist a triage flagging testimony review.
    triage_mod.save_triage_result(
        doc_id, TriageResult(triage_succeeded=True, needs_testimony_review=True), cfg
    )

    captured = _capture_enforce(monkeypatch)
    monkeypatch.setattr(upload_mod.sanity_client, "write_document", lambda pkg, config: "sanity-id")
    monkeypatch.setattr(upload_mod.supabase_client, "upsert_embedding", lambda *a, **k: None)
    monkeypatch.setattr(upload_mod, "_repair_analysis_date_from_source", lambda a, p: False)

    upload_mod.upload_saved(doc_id, cfg)

    assert "triage_result" in captured, "_enforce was not called"
    assert captured["triage_result"] is not None
    assert captured["triage_result"].needs_testimony_review is True
