import json
from pathlib import Path

import pytest

from runner.pipeline import calibration, corpus_manifest, publication_gate, review_plan


def _write(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_calibration_record_extracts_model_and_human_fields(tmp_path):
    doc = tmp_path / "doc-1"
    _write(doc / "intake.json", {"doc_id": "doc-1", "tier": 2})
    _write(doc / "analysis.json", {
        "type": "Pro-SOGICE",
        "languages": ["en"],
        "prompt_version": "ingestion-v3.3",
        "confidence": {"overall_score": 0.91, "status": "high"},
    })
    _write(doc / "analysis_audit.json", {"resolved_model": "core-qwen"})

    row = calibration.build_calibration_record(
        doc,
        outcome="minor_correction",
        corrected_fields=["tactic", " tactic "],
        review_minutes=4.5,
        reviewed_at="2026-07-10T12:00:00+00:00",
    )

    assert row["doc_id"] == "doc-1"
    assert row["model_confidence"] == 0.91
    assert row["corrected_fields"] == ["tactic"]
    assert row["model"] == "core-qwen"


def test_calibration_append_refuses_duplicate_document(tmp_path):
    ledger = tmp_path / "calibration.jsonl"
    row = {"doc_id": "d1", "outcome": "accepted"}
    calibration.append_record(ledger, row)
    with pytest.raises(ValueError, match="already recorded"):
        calibration.append_record(ledger, row)


def test_anchor_report_does_not_derive_confidence_threshold():
    rows = [
        {"doc_id": "d1", "outcome": "accepted", "model_confidence": 0.9,
         "model_confidence_status": "high", "languages": ["en"], "corrected_fields": []},
        {"doc_id": "d2", "outcome": "major_correction", "model_confidence": 0.88,
         "model_confidence_status": "high", "languages": ["fr"], "corrected_fields": ["type"]},
    ]
    report = calibration.build_calibration_report(rows)
    assert report["sample_size"] == 2
    assert report["high_confidence_severe_error_docs"] == ["d2"]
    assert "No threshold is derived" in report["threshold_policy"]
    assert report["warnings"]


def test_anchor_set_is_selected_and_has_repeatable_protocol(tmp_path):
    _write(tmp_path / "d1" / "analysis.json", {"type": "Pro-SOGICE", "languages": ["en"]})
    _write(tmp_path / "d1" / "intake.json", {"tier": 3})
    anchor = calibration.build_anchor_set(tmp_path, ["d1", "d1"], rationale="Key thesis source")
    assert [row["doc_id"] for row in anchor["documents"]] == ["d1"]
    assert anchor["documents"][0]["tier"] == 3
    assert any("second model" in step for step in anchor["protocol"])


def test_review_plan_groups_duplicate_labels_and_prioritises_approved(tmp_path):
    for doc_id, approved in (("d1", False), ("d2", True)):
        doc = tmp_path / doc_id
        _write(doc / "analysis.json", {"type": "Pro-SOGICE", "testimony_flag": False})
        _write(doc / "enrichment.json", {
            "lexicon_proposals": [{
                "term": "Gender-exploratory therapy" if doc_id == "d1" else "Gender Exploratory Therapy",
                "evidence_quote": "quoted evidence",
                "approved": approved,
                "pushed_to_sanity": False,
            }]
        })

    plan = review_plan.build_review_plan(tmp_path, group_limit=10, recurrence_threshold=2)

    assert plan["raw_actionable_proposals"] == 2
    assert plan["review_groups"] == 1
    group = plan["selected_groups"][0]
    assert group["document_count"] == 2
    assert group["approved_unpushed"] == 1
    assert group["human_decision_required"] is True
    assert plan["ai_managed_groups"] == 0


def test_review_plan_excludes_rejected_and_pushed(tmp_path):
    doc = tmp_path / "d1"
    _write(doc / "enrichment.json", {
        "entity_proposals": [
            {"name": "Rejected Org", "rejected": True},
            {"name": "Pushed Org", "approved": True, "pushed_to_sanity": True},
        ]
    })
    assert review_plan.collect_review_items(tmp_path) == []


def test_review_plan_does_not_turn_one_off_provisional_output_into_human_backlog(tmp_path):
    doc = tmp_path / "d1"
    _write(doc / "intake.json", {"tier": 1})
    _write(doc / "enrichment.json", {
        "lexicon_proposals": [{"term": "One-off candidate", "evidence_quote": "source text"}]
    })
    plan = review_plan.build_review_plan(tmp_path, group_limit=10, recurrence_threshold=3)
    assert plan["human_candidate_groups"] == 0
    assert plan["ai_managed_groups"] == 1
    assert plan["selected_groups"] == []


def _publication_doc(tmp_path: Path) -> Path:
    doc = tmp_path / "d1"
    _write(doc / "intake.json", {"doc_id": "d1", "tier": 3, "source": "https://example.org/source"})
    _write(doc / "analysis.json", {
        "type": "Pro-SOGICE",
        "summary": "AI-generated source description.",
        "testimony_flag": False,
        "needs_review": False,
        "confidence": {"status": "high"},
    })
    _write(doc / "review_status.json", {"analysis_reviewed": True})
    _write(doc / "analysis_audit.json", {
        "model": "core-qwen",
        "prompt_version": "ingestion-v3.3",
        "validation_path": "outside_think_tags",
        "errors": [],
    })
    _write(doc / "citation_units.json", {"units": []})
    _write(doc / "sanity_record.json", {"sanity_id": "doc-d1"})
    return doc


def test_publication_gate_passes_evidence_presence_but_keeps_human_decision(tmp_path):
    row = publication_gate.assess_publication_readiness(_publication_doc(tmp_path))
    assert row["ready"] is True
    assert row["release_policy_decision_required"] is True
    assert row["lanes"]["researcher_verified"]["ready"] is True


def test_publication_gate_allows_disclosed_ai_lane_without_individual_review(tmp_path):
    doc = _publication_doc(tmp_path)
    (doc / "review_status.json").unlink()
    row = publication_gate.assess_publication_readiness(doc)
    assert row["recommended_lane"] == "ai_disclosed_summary_tags"
    assert row["lanes"]["ai_disclosed_summary_tags"]["ready"] is True
    assert row["lanes"]["researcher_verified"]["ready"] is False


def test_publication_gate_routes_low_confidence_to_independent_second_opinion(tmp_path):
    doc = _publication_doc(tmp_path)
    (doc / "review_status.json").unlink()
    analysis = json.loads((doc / "analysis.json").read_text())
    analysis["confidence"]["status"] = "medium"
    _write(doc / "analysis.json", analysis)

    blocked = publication_gate.assess_publication_readiness(doc)
    assert blocked["lanes"]["ai_disclosed_summary_tags"]["ready"] is False

    _write(doc / "analysis_comparison_20260710.json", {
        "outcome": "pending",
        "fields_that_differed": ["confidence.overall_score"],
    })
    agreed = publication_gate.assess_publication_readiness(doc)
    assert agreed["lanes"]["ai_disclosed_summary_tags"]["ready"] is True


def test_publication_gate_fails_closed_for_testimony(tmp_path):
    doc = _publication_doc(tmp_path)
    analysis = json.loads((doc / "analysis.json").read_text())
    analysis["testimony_flag"] = True
    _write(doc / "analysis.json", analysis)

    row = publication_gate.assess_publication_readiness(doc)
    assert row["ready"] is False
    assert any(
        "testimony review" in blocker
        for blocker in row["lanes"]["researcher_verified"]["blockers"]
    )


@pytest.mark.parametrize(
    "signal",
    ["survivor_network_material", "triage_only"],
)
def test_publication_gate_fails_closed_for_all_testimony_routes(tmp_path, signal):
    doc = _publication_doc(tmp_path)
    analysis = json.loads((doc / "analysis.json").read_text())
    if signal == "survivor_network_material":
        analysis["type"] = "Survivor-Network-Material"
    else:
        _write(doc / "triage_result.json", {"needs_testimony_review": True})
    _write(doc / "analysis.json", analysis)

    row = publication_gate.assess_publication_readiness(doc)
    assert row["ready"] is False
    assert any(
        "testimony review" in blocker
        for blocker in row["lanes"]["researcher_verified"]["blockers"]
    )


def test_publication_gate_requires_legal_review(tmp_path):
    doc = _publication_doc(tmp_path)
    analysis = json.loads((doc / "analysis.json").read_text())
    analysis["type"] = "Legal-Instrument"
    _write(doc / "analysis.json", analysis)
    row = publication_gate.assess_publication_readiness(doc)
    assert any(
        "legal review" in blocker
        for blocker in row["lanes"]["researcher_verified"]["blockers"]
    )


def test_manifest_roundtrip_and_detects_change(tmp_path):
    corpus = tmp_path / "corpus"
    (corpus / "d1").mkdir(parents=True)
    (corpus / "d1" / "analysis.json").write_text("one", encoding="utf-8")
    manifest_path = tmp_path / "manifest.json"
    corpus_manifest.write_corpus_manifest(corpus, manifest_path)

    assert corpus_manifest.verify_corpus_manifest(manifest_path)["ok"] is True
    (corpus / "d1" / "analysis.json").write_text("two", encoding="utf-8")
    report = corpus_manifest.verify_corpus_manifest(manifest_path)
    assert report["ok"] is False
    assert report["changed"] == ["d1/analysis.json"]


def test_manifest_can_verify_restored_copy(tmp_path):
    original = tmp_path / "original"
    restored = tmp_path / "restored"
    (original / "d1").mkdir(parents=True)
    (restored / "d1").mkdir(parents=True)
    (original / "d1" / "intake.json").write_text("same", encoding="utf-8")
    (restored / "d1" / "intake.json").write_text("same", encoding="utf-8")
    path = tmp_path / "manifest.json"
    corpus_manifest.write_corpus_manifest(original, path)
    assert corpus_manifest.verify_corpus_manifest(path, restored)["ok"] is True
