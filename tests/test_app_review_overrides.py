"""
Tests for the researcher review-override helpers in
``runner/app_review_overrides.py``.

All helpers are pure (no ``st.*`` calls), so no Streamlit stub is needed.
They only read/write local JSON files and never touch the network, models,
or Sanity/Supabase.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from runner.app_review_overrides import (
    analysis_review_marker_available,
    analysis_review_record,
    clear_testimony_gate,
    legal_review_available,
    legal_review_record,
    mark_analysis_reviewed,
    mark_legal_review_complete,
)
# Aliased: bare names start with "test" and would be mis-collected as test cases.
from runner.app_review_overrides import (
    testimony_gate_cleared as _testimony_gate_cleared,
    testimony_override_available as _testimony_override_available,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write_analysis(doc_dir: Path, data: dict) -> None:
    doc_dir.mkdir(parents=True, exist_ok=True)
    (doc_dir / "analysis.json").write_text(json.dumps(data), encoding="utf-8")


def _read_analysis(doc_dir: Path) -> dict:
    return json.loads((doc_dir / "analysis.json").read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Visibility predicates
# ---------------------------------------------------------------------------

def test_testimony_override_available_on_flag_boolean():
    assert _testimony_override_available({"testimony_flag": True}) is True


def test_testimony_override_available_on_flag_string_case_insensitive():
    analysis = {"testimony_flag": False, "flags": ["Flag: Testimony-Extraction-Required"]}
    assert _testimony_override_available(analysis) is True
    # Different casing / whitespace still matches the validator's normalisation.
    assert _testimony_override_available(
        {"flags": ["  flag: testimony-extraction-required "]}
    ) is True


def test_testimony_override_not_available_when_clean():
    assert _testimony_override_available({"testimony_flag": False, "flags": []}) is False
    assert _testimony_override_available({}) is False
    assert _testimony_override_available(None) is False


def test_legal_review_available_for_legal_sensitive_types():
    assert legal_review_available({"type": "Legal-Instrument"}) is True
    assert legal_review_available({"primary_type": "Regulatory-Policy-Document"}) is True
    assert legal_review_available({"type": "Pro-SOGICE"}) is False
    # legal_status is intentionally not a trigger (mirrors upload.requires_legal_review)
    assert legal_review_available({"type": "Media-Coverage", "legal_status": "banned"}) is False
    assert legal_review_available(None) is False


def test_analysis_review_marker_available_on_needs_review_or_low_conf():
    assert analysis_review_marker_available({"needs_review": True}) is True
    assert analysis_review_marker_available(
        {"confidence": {"overall_score": 0.55}}
    ) is True
    assert analysis_review_marker_available(
        {"confidence": {"overall_score": 0.90}}
    ) is False
    assert analysis_review_marker_available({"confidence": {}}) is False
    assert analysis_review_marker_available(None) is False


# ---------------------------------------------------------------------------
# clear_testimony_gate
# ---------------------------------------------------------------------------

def test_clear_testimony_gate_sets_flag_false_and_removes_flag(tmp_path):
    doc_dir = tmp_path / "doc1"
    _write_analysis(doc_dir, {
        "testimony_flag": True,
        "flags": ["Flag: Testimony-Extraction-Required", "Flag: Media-Review"],
        "normalisation_warnings": ["pre-existing warning"],
    })

    result = clear_testimony_gate(doc_dir, note="Author quotes a public report, not a survivor.",
                                  now="2026-06-12T00:00:00+00:00")

    assert result["ok"] is True
    assert result["changed"] is True
    assert result["removed_flags"] == ["Flag: Testimony-Extraction-Required"]

    data = _read_analysis(doc_dir)
    assert data["testimony_flag"] is False
    assert data["flags"] == ["Flag: Media-Review"]
    assert data["_manual_overrides"]["testimony_flag"] == "researcher_confirmed_false"
    # Pre-existing warnings are preserved; a timestamped review warning is appended.
    assert data["normalisation_warnings"][0] == "pre-existing warning"
    assert "testimony gate cleared by researcher" in data["normalisation_warnings"][-1]
    assert "2026-06-12T00:00:00+00:00" in data["normalisation_warnings"][-1]
    assert "Author quotes a public report" in data["normalisation_warnings"][-1]


def test_clear_testimony_gate_requires_note(tmp_path):
    doc_dir = tmp_path / "doc1"
    _write_analysis(doc_dir, {"testimony_flag": True, "flags": []})
    result = clear_testimony_gate(doc_dir, note="   ")
    assert result["ok"] is False
    assert result["reason"] == "note_required"
    # analysis untouched
    assert _read_analysis(doc_dir)["testimony_flag"] is True


def test_clear_testimony_gate_no_analysis(tmp_path):
    doc_dir = tmp_path / "empty"
    doc_dir.mkdir()
    result = clear_testimony_gate(doc_dir, note="n/a")
    assert result["ok"] is False
    assert result["reason"] == "no_analysis"


def test_clear_testimony_gate_idempotent(tmp_path):
    doc_dir = tmp_path / "doc1"
    _write_analysis(doc_dir, {"testimony_flag": True,
                              "flags": ["Flag: Testimony-Extraction-Required"]})
    first = clear_testimony_gate(doc_dir, note="false positive")
    assert first["changed"] is True

    second = clear_testimony_gate(doc_dir, note="false positive")
    assert second["ok"] is True
    assert second["changed"] is False
    assert second["reason"] == "already_cleared"
    # Only one review warning accumulated, not two.
    warnings = _read_analysis(doc_dir)["normalisation_warnings"]
    assert sum("testimony gate cleared" in w for w in warnings) == 1


def test_clear_testimony_gate_does_not_touch_other_tags(tmp_path):
    doc_dir = tmp_path / "doc1"
    _write_analysis(doc_dir, {
        "testimony_flag": True,
        "flags": ["Flag: Testimony-Extraction-Required"],
        "tactic": ["Tactic: Pathologization"],
        "harm": ["Harm: Suicidality"],
        "type": "Testimony",
    })
    clear_testimony_gate(doc_dir, note="false positive")
    data = _read_analysis(doc_dir)
    # tactic / harm / type left exactly as-is — no silent reclassification.
    assert data["tactic"] == ["Tactic: Pathologization"]
    assert data["harm"] == ["Harm: Suicidality"]
    assert data["type"] == "Testimony"


def test_cleared_gate_survives_model_revalidation(tmp_path):
    """The whole point: removing the flag means the model validator will not
    silently re-raise testimony_flag on the next round-trip."""
    from runner.models.document import AnalysisResult

    doc_dir = tmp_path / "doc1"
    _write_analysis(doc_dir, {
        "type": "Media-Coverage",
        "format": "News-Article",
        "evidence": [],
        "scope": "Contextual",
        "summary": "x",
        "narrative_register": "Journalistic",
        "testimony_flag": True,
        "flags": ["Flag: Testimony-Extraction-Required"],
    })
    clear_testimony_gate(doc_dir, note="false positive")
    data = _read_analysis(doc_dir)

    revalidated = AnalysisResult.model_validate(data)
    assert revalidated.testimony_flag is False
    assert not any(
        f.strip().lower() == "flag: testimony-extraction-required"
        for f in revalidated.flags
    )


def test_testimony_gate_cleared_reader(tmp_path):
    doc_dir = tmp_path / "doc1"
    _write_analysis(doc_dir, {"testimony_flag": True,
                              "flags": ["Flag: Testimony-Extraction-Required"]})
    assert _testimony_gate_cleared(doc_dir) is False
    clear_testimony_gate(doc_dir, note="false positive")
    assert _testimony_gate_cleared(doc_dir) is True


# ---------------------------------------------------------------------------
# mark_legal_review_complete
# ---------------------------------------------------------------------------

def test_mark_legal_review_writes_sidecar(tmp_path):
    doc_dir = tmp_path / "doc1"
    doc_dir.mkdir()
    _write_analysis(doc_dir, {"type": "Legal-Instrument"})

    result = mark_legal_review_complete(
        doc_dir, note="Checked statute citation against EUR-Lex.",
        reviewed_by="Sérgio", now="2026-06-12T10:00:00+00:00",
    )
    assert result["ok"] is True
    record = legal_review_record(doc_dir)
    assert record["reviewed"] is True
    assert record["reviewed_by"] == "Sérgio"
    assert record["reviewed_at"] == "2026-06-12T10:00:00+00:00"
    assert record["notes"] == "Checked statute citation against EUR-Lex."
    # analysis.json untouched — no classification change.
    assert _read_analysis(doc_dir) == {"type": "Legal-Instrument"}


def test_mark_legal_review_requires_note(tmp_path):
    doc_dir = tmp_path / "doc1"
    doc_dir.mkdir()
    result = mark_legal_review_complete(doc_dir, note="")
    assert result["ok"] is False
    assert result["reason"] == "note_required"
    assert not (doc_dir / "legal_review.json").exists()


def test_mark_legal_review_no_document(tmp_path):
    result = mark_legal_review_complete(tmp_path / "missing", note="x")
    assert result["ok"] is False
    assert result["reason"] == "no_document"


# ---------------------------------------------------------------------------
# mark_analysis_reviewed
# ---------------------------------------------------------------------------

def test_mark_analysis_reviewed_writes_sidecar_without_touching_analysis(tmp_path):
    doc_dir = tmp_path / "doc1"
    doc_dir.mkdir()
    original = {"needs_review": True, "confidence": {"overall_score": 0.55}}
    _write_analysis(doc_dir, original)

    result = mark_analysis_reviewed(
        doc_dir, note="Reviewed; classification is correct despite low score.",
        now="2026-06-12T11:00:00+00:00",
    )
    assert result["ok"] is True
    record = analysis_review_record(doc_dir)
    assert record["analysis_reviewed"] is True
    assert record["reviewed_at"] == "2026-06-12T11:00:00+00:00"
    assert record["notes"].startswith("Reviewed; classification")
    # Validator is not fought: needs_review and confidence unchanged on disk.
    assert _read_analysis(doc_dir) == original


def test_mark_analysis_reviewed_requires_note(tmp_path):
    doc_dir = tmp_path / "doc1"
    doc_dir.mkdir()
    result = mark_analysis_reviewed(doc_dir, note="  ")
    assert result["ok"] is False
    assert result["reason"] == "note_required"
    assert not (doc_dir / "review_status.json").exists()


def test_record_readers_default_empty(tmp_path):
    doc_dir = tmp_path / "doc1"
    doc_dir.mkdir()
    assert legal_review_record(doc_dir) == {}
    assert analysis_review_record(doc_dir) == {}
