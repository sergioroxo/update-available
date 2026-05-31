"""TASK G2-b-2a -- headless-aware testimony consent checkpoint.

review.checkpoint_testimony_consent now:
- gates via upload.requires_consent_gate (testimony_flag OR consent-gated type
  OR triage needs_testimony_review) -- so consent-gated TYPES now gate even when
  testimony_flag is False (intentional tightening);
- in headless mode (yes=True) never prompts: a gated doc is held as "pending";
- in attended mode preserves the c/p/u/w/r prompt flow.

No network/LLM. typer.prompt is monkeypatched so a regression that prompts in
headless mode fails loudly instead of hanging.
"""
from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from runner.models.document import AnalysisResult
from runner.models.triage import TriageResult
from runner.pipeline import review as review_mod


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


def _triage(**flags) -> TriageResult:
    return TriageResult(triage_succeeded=True, **flags)


def _cfg_with_intake(tmp_path, doc_id: str) -> SimpleNamespace:
    """Create a doc dir + intake.json so update_intake_consent can persist."""
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()
    (doc_dir / "intake.json").write_text(
        json.dumps({"doc_id": doc_id, "testimony_consent": ""}), encoding="utf-8"
    )
    return SimpleNamespace(corpus_dir=tmp_path)


def _ban_prompt(monkeypatch):
    """Make any typer.prompt call fail — proves headless never prompts."""
    def _boom(*a, **k):
        raise AssertionError("typer.prompt must not be called in headless mode")

    monkeypatch.setattr(review_mod.typer, "prompt", _boom)


def _consent_status(tmp_path, doc_id: str) -> str:
    data = json.loads((tmp_path / doc_id / "intake.json").read_text(encoding="utf-8"))
    return data.get("testimony_consent", "")


# ---------------------------------------------------------------------------
# not gated
# ---------------------------------------------------------------------------

def test_not_gated_returns_not_required_and_does_not_prompt(tmp_path, monkeypatch):
    _ban_prompt(monkeypatch)
    cfg = _cfg_with_intake(tmp_path, "doc-normal")
    status = review_mod.checkpoint_testimony_consent(
        "doc-normal", _analysis("Anti-SOGICE"), cfg, triage_result=None, yes=False
    )
    assert status == "not_required"


# ---------------------------------------------------------------------------
# headless gated -> pending, no prompt
# ---------------------------------------------------------------------------

def test_analysis_testimony_yes_returns_pending_without_prompt(tmp_path, monkeypatch):
    _ban_prompt(monkeypatch)
    cfg = _cfg_with_intake(tmp_path, "doc-t")
    status = review_mod.checkpoint_testimony_consent(
        "doc-t", _analysis(testimony_flag=True), cfg, yes=True
    )
    assert status == "pending"
    assert _consent_status(tmp_path, "doc-t") == "pending"


def test_triage_only_testimony_yes_returns_pending(tmp_path, monkeypatch):
    _ban_prompt(monkeypatch)
    cfg = _cfg_with_intake(tmp_path, "doc-tr")
    status = review_mod.checkpoint_testimony_consent(
        "doc-tr", _analysis("Anti-SOGICE"), cfg,
        triage_result=_triage(needs_testimony_review=True), yes=True,
    )
    assert status == "pending"
    assert _consent_status(tmp_path, "doc-tr") == "pending"


def test_consent_gated_type_flag_false_yes_returns_pending(tmp_path, monkeypatch):
    _ban_prompt(monkeypatch)
    cfg = _cfg_with_intake(tmp_path, "doc-type")
    analysis = _analysis("Testimony")
    assert analysis.testimony_flag is False  # gated by TYPE, not flag
    status = review_mod.checkpoint_testimony_consent(
        "doc-type", analysis, cfg, yes=True
    )
    assert status == "pending"
    assert _consent_status(tmp_path, "doc-type") == "pending"


def test_triage_legal_only_yes_is_not_gated(tmp_path, monkeypatch):
    """Legal review is not a consent concept; a legal-only triage flag must not
    trip the consent checkpoint."""
    _ban_prompt(monkeypatch)
    cfg = _cfg_with_intake(tmp_path, "doc-legal")
    status = review_mod.checkpoint_testimony_consent(
        "doc-legal", _analysis("Anti-SOGICE"), cfg,
        triage_result=_triage(needs_legal_review=True), yes=True,
    )
    assert status == "not_required"


# ---------------------------------------------------------------------------
# attended gated -> prompt flow preserved
# ---------------------------------------------------------------------------

def test_attended_gated_confirm_path_returns_confirmed(tmp_path, monkeypatch):
    cfg = _cfg_with_intake(tmp_path, "doc-att")
    monkeypatch.setattr(review_mod.typer, "prompt", lambda *a, **k: "c")
    status = review_mod.checkpoint_testimony_consent(
        "doc-att", _analysis(testimony_flag=True), cfg, yes=False
    )
    assert status == "confirmed"
    assert _consent_status(tmp_path, "doc-att") == "confirmed"


def test_attended_gated_pending_path_returns_pending(tmp_path, monkeypatch):
    cfg = _cfg_with_intake(tmp_path, "doc-att2")
    monkeypatch.setattr(review_mod.typer, "prompt", lambda *a, **k: "p")
    status = review_mod.checkpoint_testimony_consent(
        "doc-att2", _analysis(testimony_flag=True), cfg, yes=False
    )
    assert status == "pending"
    assert _consent_status(tmp_path, "doc-att2") == "pending"
