"""
Tests for the Readiness / Next Actions helper functions in
``runner/app_readiness.py``.

All helpers are pure (no ``st.*`` calls), so no Streamlit stub is needed.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from runner.app_readiness import (
    CATEGORY_BLOCKER,
    CATEGORY_NOTE,
    CATEGORY_QUALITY,
    STATUS_LABELS,
    STATUS_NEEDS_REVIEW,
    STATUS_NO_DATA,
    STATUS_QUALITY,
    STATUS_READY,
    DocumentReadiness,
    ReadinessItem,
    build_document_readiness,
    summarize_enrichment_lifecycle,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")


def _make_doc_dir(
    tmp_path: Path,
    *,
    languages=("en",),
    document_date=None,
    enrichment=None,
    with_analysis=True,
) -> Path:
    """Create a doc_dir that, by default, has a clean analysis (no warnings)."""
    doc_dir = tmp_path / "deadbeef"
    doc_dir.mkdir(exist_ok=True)
    if with_analysis:
        if document_date is None:
            document_date = {"year": 2024, "month": 1, "day": 1}
        analysis = {
            "languages": list(languages),
            "document_date": document_date,
        }
        _write_json(doc_dir / "analysis.json", analysis)
    if enrichment is not None:
        _write_json(doc_dir / "enrichment.json", enrichment)
    return doc_dir


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

class TestDataModel:
    def test_readiness_item_fields(self):
        item = ReadinessItem(
            category=CATEGORY_BLOCKER,
            title="X",
            detail="why",
            where_to_fix="here",
        )
        assert item.category == "blocker"
        assert item.handler == ""

    def test_actionable_count(self):
        dr = DocumentReadiness(
            status=STATUS_NEEDS_REVIEW,
            status_label="x",
            status_explanation="y",
            blockers=[ReadinessItem(CATEGORY_BLOCKER, "a", "", "")],
            quality=[ReadinessItem(CATEGORY_QUALITY, "b", "", "")],
            notes=[ReadinessItem(CATEGORY_NOTE, "c", "", "")],
        )
        assert dr.actionable_count == 2

    def test_status_labels_cover_all_statuses(self):
        for status in (
            STATUS_NEEDS_REVIEW,
            STATUS_QUALITY,
            STATUS_READY,
            STATUS_NO_DATA,
        ):
            assert status in STATUS_LABELS
            assert isinstance(STATUS_LABELS[status], str)


# ---------------------------------------------------------------------------
# summarize_enrichment_lifecycle
# ---------------------------------------------------------------------------

class TestLifecycleSummary:
    def test_absent_file(self, tmp_path):
        summary = summarize_enrichment_lifecycle(tmp_path)
        assert summary["exists"] is False
        assert summary["total"] == 0

    def test_corrupt_file(self, tmp_path):
        (tmp_path / "enrichment.json").write_text("not json", encoding="utf-8")
        summary = summarize_enrichment_lifecycle(tmp_path)
        assert summary["exists"] is False
        assert summary["total"] == 0

    def test_counts_by_state(self, tmp_path):
        enrichment = {
            "lexicon_proposals": [
                {"term": "pending one"},                                  # pending
                {"term": "approved one", "proposal_status": "approved"},  # approved-unpushed
                {"term": "pushed one", "proposal_status": "pushed"},      # pushed
                {"term": "rejected one", "proposal_status": "rejected"},  # rejected
            ],
            "tactic_proposals": [
                {"name": "boolean approved", "approved": True},  # approved-unpushed
            ],
        }
        summary = summarize_enrichment_lifecycle(_make_doc_dir(tmp_path, enrichment=enrichment))
        assert summary["total"] == 5
        assert summary["pending"] == 1
        assert summary["approved_unpushed"] == 2
        assert summary["pushed"] == 1
        assert summary["rejected"] == 1

    def test_boolean_pushed_state(self, tmp_path):
        enrichment = {
            "lexicon_proposals": [
                {"term": "t", "approved": True, "pushed_to_sanity": True},
            ],
        }
        summary = summarize_enrichment_lifecycle(_make_doc_dir(tmp_path, enrichment=enrichment))
        assert summary["pushed"] == 1
        assert summary["approved_unpushed"] == 0

    def test_registry_fit_holds_counted(self, tmp_path):
        enrichment = {
            "entity_proposals": [
                {"name": "A Podcast", "registry_fit": "media_or_source"},
                {"name": "Real Org", "registry_fit": "registry_entity"},
                # rejected holds should not count
                {"name": "Junk", "registry_fit": "not_entity", "proposal_status": "rejected"},
            ],
        }
        summary = summarize_enrichment_lifecycle(_make_doc_dir(tmp_path, enrichment=enrichment))
        assert summary["registry_fit_holds"] == 1

    def test_non_dict_items_skipped(self, tmp_path):
        enrichment = {"lexicon_proposals": ["oops", None, {"term": "ok"}]}
        summary = summarize_enrichment_lifecycle(_make_doc_dir(tmp_path, enrichment=enrichment))
        assert summary["total"] == 1
        assert summary["pending"] == 1


# ---------------------------------------------------------------------------
# build_document_readiness — status resolution
# ---------------------------------------------------------------------------

class TestReadinessStatus:
    def test_no_analysis_is_no_data(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path, with_analysis=False)
        dr = build_document_readiness(doc_dir)
        assert dr.status == STATUS_NO_DATA

    def test_clean_doc_is_ready(self, tmp_path):
        # Clean analysis, no enrichment.json absent → "enrichment not yet run"
        # would downgrade to quality, so provide a fully-pushed enrichment.
        enrichment = {
            "lexicon_proposals": [
                {"term": "done", "proposal_status": "pushed"},
            ],
        }
        doc_dir = _make_doc_dir(tmp_path, enrichment=enrichment)
        dr = build_document_readiness(doc_dir)
        assert dr.status == STATUS_READY
        assert dr.blockers == []
        assert dr.quality == []

    def test_missing_entity_id_is_blocker(self, tmp_path):
        enrichment = {
            "entity_proposals": [
                {"name": "SEGM", "action": "enrich_existing"},  # no existing_entity_id
            ],
        }
        doc_dir = _make_doc_dir(tmp_path, enrichment=enrichment)
        dr = build_document_readiness(doc_dir)
        assert dr.status == STATUS_NEEDS_REVIEW
        titles = [b.title for b in dr.blockers]
        assert "Missing existing_entity_id" in titles

    def test_missing_date_is_quality(self, tmp_path):
        # Missing date is action_needed → quality, not a blocker.
        doc_dir = _make_doc_dir(
            tmp_path,
            document_date={},
            enrichment={"lexicon_proposals": [{"term": "x", "proposal_status": "pushed"}]},
        )
        dr = build_document_readiness(doc_dir)
        assert dr.status == STATUS_QUALITY
        assert any(q.title == "Date unknown" for q in dr.quality)

    def test_pending_proposals_downgrade_to_quality(self, tmp_path):
        enrichment = {"lexicon_proposals": [{"term": "pending"}]}
        doc_dir = _make_doc_dir(tmp_path, enrichment=enrichment)
        dr = build_document_readiness(doc_dir)
        assert dr.status == STATUS_QUALITY
        assert any("await review" in q.title for q in dr.quality)

    def test_no_enrichment_suggests_running_it(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path)  # no enrichment.json
        dr = build_document_readiness(doc_dir)
        assert dr.status == STATUS_QUALITY
        titles = [q.title for q in dr.quality]
        assert "Enrichment not yet run" in titles
        # ties complement enrichment into the lifecycle
        item = next(q for q in dr.quality if q.title == "Enrichment not yet run")
        assert item.handler == "complement_enrichment"

    def test_blocker_beats_quality_in_status(self, tmp_path):
        enrichment = {
            "entity_proposals": [
                {"name": "SEGM", "action": "enrich_existing"},  # blocker
            ],
            "lexicon_proposals": [{"term": "pending"}],          # quality
        }
        doc_dir = _make_doc_dir(tmp_path, document_date={}, enrichment=enrichment)
        dr = build_document_readiness(doc_dir)
        assert dr.status == STATUS_NEEDS_REVIEW
        assert dr.blockers
        assert dr.quality  # quality items still surfaced, just not status-deciding


# ---------------------------------------------------------------------------
# build_document_readiness — item content / categorization
# ---------------------------------------------------------------------------

class TestReadinessItems:
    def test_entity_id_blocker_has_resolver_handler(self, tmp_path):
        enrichment = {
            "entity_proposals": [
                {"name": "Genspect", "action": "enrich_existing"},
            ],
        }
        doc_dir = _make_doc_dir(tmp_path, enrichment=enrichment)
        dr = build_document_readiness(doc_dir)
        blocker = next(b for b in dr.blockers if b.title == "Missing existing_entity_id")
        assert blocker.handler == "entity_resolver"
        assert blocker.where_to_fix  # carries navigation text

    def test_registry_fit_hold_is_note(self, tmp_path):
        enrichment = {
            "entity_proposals": [
                {"name": "A Podcast", "registry_fit": "media_or_source",
                 "approved": True},
            ],
        }
        doc_dir = _make_doc_dir(tmp_path, enrichment=enrichment)
        dr = build_document_readiness(doc_dir)
        assert any("held out of the registry" in n.title for n in dr.notes)

    def test_approved_unpushed_is_quality(self, tmp_path):
        enrichment = {
            "lexicon_proposals": [
                {"term": "ready", "proposal_status": "approved"},
            ],
        }
        doc_dir = _make_doc_dir(tmp_path, enrichment=enrichment)
        dr = build_document_readiness(doc_dir)
        assert any("ready to push" in q.title for q in dr.quality)

    def test_status_label_and_explanation_match_status(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path, with_analysis=False)
        dr = build_document_readiness(doc_dir)
        assert dr.status_label == STATUS_LABELS[STATUS_NO_DATA]
        assert dr.status_explanation
