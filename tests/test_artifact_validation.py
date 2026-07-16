import json
import os
from pathlib import Path

from runner.pipeline.artifact_validation import (
    validate_preservation_stage,
    validate_specialist,
    validate_stage,
)
from runner.pipeline.citation_units import build_citation_units


def _write(path: Path, payload, *, mtime: int = 100) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")
    os.utime(path, ns=(mtime, mtime))


def test_analysis_requires_valid_payload_and_error_free_audit(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "preprocess.json", {"ok": True}, mtime=100)
    _write(doc / "analysis.json", {
        "type": "Pro-SOGICE", "format": "Blog-Post", "evidence": [],
        "scope": "Core", "narrative_register": "Legal-Policy",
        "summary": "Evidence", "confidence": {"status": "high", "overall_score": 0.9},
    }, mtime=200)
    _write(doc / "analysis_audit.json", {"errors": []}, mtime=200)
    assert validate_stage(doc, "analysis")["status"] == "complete"

    _write(doc / "analysis_audit.json", {"errors": ["parse"]}, mtime=300)
    result = validate_stage(doc, "analysis")
    assert result["status"] == "invalid"
    assert "audit reports" in result["detail"]


def test_analysis_and_enrichment_require_structured_error_audits(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "preprocess.json", {"ok": True}, mtime=100)
    (doc / "extracted.txt").write_text("Canonical text", encoding="utf-8")
    _write(doc / "analysis.json", {
        "type": "Pro-SOGICE", "format": "Blog-Post", "evidence": [],
        "scope": "Core", "narrative_register": "Legal-Policy",
        "summary": "Evidence", "confidence": {"status": "high", "overall_score": 0.9},
    }, mtime=200)
    _write(doc / "analysis_audit.json", [], mtime=200)
    assert validate_stage(doc, "analysis")["status"] == "invalid"

    _write(doc / "analysis_audit.json", {"errors": "none"}, mtime=200)
    assert validate_stage(doc, "analysis")["status"] == "invalid"

    _write(doc / "enrichment.json", {"doc_id": "doc"}, mtime=300)
    _write(doc / "enrichment_audit.json", 5, mtime=300)
    assert validate_stage(doc, "enrichment")["status"] == "invalid"


def test_newer_dependency_marks_derived_stage_stale(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "preprocess.json", {"ok": True}, mtime=300)
    _write(doc / "analysis.json", {
        "type": "Pro-SOGICE", "format": "Blog-Post", "evidence": [],
        "scope": "Core", "narrative_register": "Legal-Policy",
        "summary": "Old", "confidence": {"status": "high", "overall_score": 0.9},
    }, mtime=200)
    _write(doc / "analysis_audit.json", {"errors": []}, mtime=200)

    result = validate_stage(doc, "analysis")

    assert result["status"] == "stale"
    assert result["fresh"] is False


def test_canonical_text_change_cascades_staleness(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "preprocess.json", {"ok": True}, mtime=100)
    (doc / "extracted.txt").write_text("Original text", encoding="utf-8")
    os.utime(doc / "extracted.txt", ns=(100, 100))
    _write(doc / "analysis.json", {
        "type": "Pro-SOGICE", "format": "Blog-Post", "evidence": [],
        "scope": "Core", "narrative_register": "Legal-Policy",
        "summary": "Evidence", "confidence": {"status": "high", "overall_score": 0.9},
    }, mtime=200)
    _write(doc / "analysis_audit.json", {"errors": []}, mtime=200)
    _write(doc / "enrichment.json", {"doc_id": "doc"}, mtime=300)
    _write(doc / "enrichment_audit.json", {"errors": []}, mtime=300)
    _write(doc / "embedding.json", {
        "model": "fixture", "dimension": 1, "embedding": [0.1],
    }, mtime=200)

    (doc / "extracted.txt").write_text("Changed canonical text", encoding="utf-8")
    os.utime(doc / "extracted.txt", ns=(400, 400))

    assert validate_stage(doc, "analysis")["status"] == "stale"
    assert validate_stage(doc, "enrichment")["status"] == "stale"
    assert validate_stage(doc, "embedding")["status"] == "stale"


def test_acquisition_rejects_mismatched_intake_doc_id(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "intake.json", {"doc_id": "other", "source": "https://example.org"})
    assert validate_stage(doc, "acquisition")["status"] == "invalid"


def test_enrichment_sidecar_without_audit_is_missing_not_complete(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "analysis.json", {"summary": "Evidence"})
    _write(doc / "enrichment.json", {"lexicon_proposals": []})

    result = validate_stage(doc, "enrichment")

    assert result["status"] == "missing"
    assert "enrichment_audit.json" in result["detail"]


def test_testimony_review_requires_human_review_and_freshness(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "analysis.json", {"testimony_flag": True}, mtime=100)
    _write(doc / "testimony_candidates.json", {"candidates": []}, mtime=200)
    _write(doc / "testimony_review.json", {"reviewed": False}, mtime=300)
    assert validate_specialist(doc, "testimony")["status"] == "human_required"

    _write(doc / "testimony_review.json", {"reviewed": True, "consent_status": "confirmed"}, mtime=300)
    assert validate_specialist(doc, "testimony")["status"] == "complete"

    _write(doc / "testimony_candidates.json", {"candidates": [{"id": "new"}]}, mtime=400)
    assert validate_specialist(doc, "testimony")["status"] == "stale"


def test_interrupted_testimony_execution_marker_is_explicitly_blocked(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "analysis.json", {"testimony_flag": True})
    _write(doc / "testimony_candidates.json", {"candidates": []})
    _write(doc / "testimony_candidates.execution_hold.json", {
        "reason": "interrupted_execution_requires_manual_review",
    })

    result = validate_specialist(doc, "testimony")

    assert result["status"] == "blocked"
    assert result["valid"] is False
    assert "interrupted" in result["detail"].lower()


def test_longform_synthesis_is_stale_when_sections_change(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "longform_sections.json", {"sections": [{"section_id": "s1", "text_hash": "h1"}]}, mtime=300)
    analyses = doc / "longform_section_analyses.jsonl"
    analyses.write_text(json.dumps({"section_id": "s1", "text_hash": "h1", "status": "succeeded", "analysis": {"section_summary": "Reviewed"}}) + "\n")
    os.utime(analyses, ns=(300, 300))
    _write(doc / "longform_synthesis.json", {
        "section_count": 1, "section_analyses_count": 1,
        "synthesis": {"archive_abstract": "Old"},
    }, mtime=200)

    result = validate_specialist(doc, "longform")

    assert result["status"] == "stale"


def test_media_invalid_json_is_not_ready_for_report(tmp_path):
    doc = tmp_path / "doc"
    doc.mkdir()
    (doc / "media_metadata.json").write_text("{broken")

    result = validate_specialist(doc, "media")

    assert result["status"] == "invalid"


def test_testimony_review_cannot_complete_without_candidate_register(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "analysis.json", {"testimony_flag": True})
    _write(doc / "testimony_review.json", {
        "reviewed": True, "consent_status": "confirmed",
    })

    assert validate_specialist(doc, "testimony")["status"] == "pending"


def test_testimony_review_requires_explicit_consent_state(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "analysis.json", {"testimony_flag": True})
    _write(doc / "testimony_candidates.json", {"candidates": []})
    _write(doc / "testimony_review.json", {"reviewed": True})

    assert validate_specialist(doc, "testimony")["status"] == "human_required"


def test_legal_review_matches_existing_human_sidecar_contract(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "analysis.json", {"type": "Legal-Instrument"})
    _write(doc / "intake.json", {"source": "law"})
    _write(doc / "legal_review.json", {"reviewed": True})
    assert validate_specialist(doc, "legal")["status"] == "human_required"

    _write(doc / "legal_review.json", {
        "reviewed": True, "reviewed_at": "2026-07-12T00:00:00Z",
        "reviewed_by": "researcher", "notes": "Reviewed version and citations.",
    }, mtime=300)
    assert validate_specialist(doc, "legal")["status"] == "complete"


def test_failed_longform_synthesis_is_invalid(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "longform_sections.json", {"sections": [{"section_id": "s1", "text_hash": "h1"}]})
    analyses = doc / "longform_section_analyses.jsonl"
    analyses.write_text(json.dumps({"section_id": "s1", "text_hash": "h1", "status": "succeeded", "analysis": {"section_summary": "Reviewed"}}) + "\n")
    _write(doc / "longform_synthesis.json", {
        "status": "failed", "error": "boom", "section_count": 1,
        "section_analyses_count": 1,
    })

    assert validate_specialist(doc, "longform")["status"] == "invalid"


def test_empty_media_payloads_are_invalid(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "media_metadata.json", [])
    _write(doc / "transcript_chunks.json", [])
    assert validate_specialist(doc, "media")["status"] == "invalid"


def test_pending_second_opinion_requires_human_decision(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "analysis.json", {"summary": "Original"})
    _write(doc / "analysis_alt_model.json", {"summary": "Alternative"})
    _write(doc / "analysis_comparison_1.json", {
        "outcome": "pending", "original_file": "analysis.json",
        "alt_file": "analysis_alt_model.json", "differences": [],
    }, mtime=300)

    result = validate_specialist(doc, "second_opinion")
    assert result["status"] == "human_required"
    assert result["completed"] is False


def test_second_opinion_rejects_traversal_and_absolute_references(tmp_path):
    doc = tmp_path / "doc"
    outside = tmp_path / "outside.json"
    _write(outside, {"summary": "outside"})
    _write(doc / "analysis.json", {"summary": "Original"})
    _write(doc / "analysis_alt_model.json", {"summary": "Alternative"})
    _write(doc / "analysis_comparison_1.json", {
        "outcome": "kept_original", "decided_at": "2026-07-13T00:00:00Z",
        "original_file": "../../outside.json", "alt_file": "analysis_alt_model.json",
        "differences": [],
    })
    assert validate_specialist(doc, "second_opinion")["status"] == "invalid"

    _write(doc / "analysis_comparison_2.json", {
        "outcome": "kept_original", "decided_at": "2026-07-13T00:00:00Z",
        "original_file": "analysis.json", "alt_file": str(outside.resolve()),
        "differences": [],
    }, mtime=300)
    assert validate_specialist(doc, "second_opinion")["status"] == "invalid"


def test_missing_document_does_not_report_present_or_valid(tmp_path):
    result = validate_specialist(tmp_path / "missing", "testimony")
    assert result["status"] == "waiting_for_base_processing"
    assert result["present"] is False
    assert result["valid"] is False


def test_duplicate_testimony_analysis_cannot_cover_missing_candidate(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "analysis.json", {"testimony_flag": True})
    _write(doc / "testimony_candidates.json", {
        "candidates": [{"candidate_id": "a"}, {"candidate_id": "b"}],
    }, mtime=100)
    analyses = doc / "testimony_segment_analyses.jsonl"
    analyses.write_text("\n".join([
        json.dumps({"candidate_id": "a", "status": "succeeded"}),
        json.dumps({"candidate_id": "a", "status": "succeeded"}),
    ]) + "\n")
    os.utime(analyses, ns=(200, 200))
    _write(doc / "testimony_segments.json", {
        "assessments": [{"candidate_id": "a"}], "segments": [],
    }, mtime=200)
    _write(doc / "testimony_review.json", {
        "reviewed": True, "consent_status": "confirmed",
    }, mtime=300)

    result = validate_specialist(doc, "testimony")
    assert result["status"] != "complete"
    assert result["valid"] is False


def test_current_testimony_candidate_ids_can_complete_after_human_gate(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "analysis.json", {"testimony_flag": True}, mtime=100)
    _write(doc / "testimony_candidates.json", {
        "candidates": [{"candidate_id": "a"}, {"candidate_id": "b"}],
    }, mtime=200)
    analyses = doc / "testimony_segment_analyses.jsonl"
    analyses.write_text("\n".join([
        json.dumps({"candidate_id": "a", "status": "succeeded", "analysis": {
            "candidate_assessment": {"assessment": "actual_testimony", "recommended_review_state": "approved"},
            "segments": [],
        }}),
        json.dumps({"candidate_id": "b", "status": "succeeded", "analysis": {
            "candidate_assessment": {"assessment": "not_testimony", "recommended_review_state": "rejected"},
            "segments": [],
        }}),
    ]) + "\n")
    os.utime(analyses, ns=(300, 300))
    _write(doc / "testimony_segments.json", {
        "assessments": [
            {"candidate_id": "a", "assessment": "actual_testimony", "recommended_review_state": "approved"},
            {"candidate_id": "b", "assessment": "not_testimony", "recommended_review_state": "rejected"},
        ],
        "segments": [],
    }, mtime=300)
    _write(doc / "testimony_review.json", {
        "reviewed": True, "consent_status": "confirmed",
    }, mtime=400)

    result = validate_specialist(doc, "testimony")
    assert result["status"] == "complete"
    assert result["valid"] is True
    assert result["completed"] is True


def test_unrelated_longform_rows_cannot_satisfy_current_sections(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "longform_sections.json", {"sections": [
        {"section_id": "s1", "text_hash": "h1"},
        {"section_id": "s2", "text_hash": "h2"},
    ]})
    analyses = doc / "longform_section_analyses.jsonl"
    analyses.write_text("\n".join([
        json.dumps({"section_id": "wrong", "text_hash": "x", "status": "succeeded"}),
        json.dumps({"section_id": "wrong", "text_hash": "x", "status": "succeeded"}),
    ]) + "\n")
    _write(doc / "longform_synthesis.json", {
        "section_count": 2, "section_analyses_count": 2,
        "synthesis": {"archive_abstract": "False complete"},
    })
    assert validate_specialist(doc, "longform")["status"] == "invalid"


def test_decided_second_opinion_requires_decision_timestamp(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "analysis.json", {"summary": "Original"})
    _write(doc / "analysis_alt_model.json", {"summary": "Alternative"})
    _write(doc / "analysis_comparison_1.json", {
        "outcome": "kept_original", "original_file": "analysis.json",
        "alt_file": "analysis_alt_model.json", "differences": [],
    })
    assert validate_specialist(doc, "second_opinion")["status"] == "invalid"


def test_media_readiness_requires_source_provenance(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "media_metadata.json", {"contentFormat": "video"}, mtime=200)
    assert validate_specialist(doc, "media")["status"] == "stale"
    _write(doc / "intake.json", {"source": "https://example.org/video"}, mtime=100)
    assert validate_specialist(doc, "media")["status"] == "ready_for_report"


def test_extraction_requires_structured_preprocess_and_canonical_text(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "intake.json", {"source": "https://example.org"}, mtime=100)
    _write(doc / "preprocess.json", {"quality": "high"}, mtime=200)

    assert validate_stage(doc, "extraction")["status"] == "missing"

    (doc / "extracted.txt").write_text("", encoding="utf-8")
    assert validate_stage(doc, "extraction")["status"] == "invalid"

    (doc / "extracted.txt").write_text("Canonical evidence", encoding="utf-8")
    assert validate_stage(doc, "extraction")["status"] == "complete"


def test_citation_units_must_match_current_text_hash_offsets_and_doc_id(tmp_path):
    doc = tmp_path / "doc-1"
    doc.mkdir()
    text = "First paragraph.\n\nSecond paragraph."
    (doc / "extracted.txt").write_text(text, encoding="utf-8")
    os.utime(doc / "extracted.txt", ns=(100, 100))
    _write(doc / "citation_units.json", build_citation_units(text, doc_id="doc-1"), mtime=200)

    assert validate_stage(doc, "citation_units")["status"] == "complete"

    (doc / "extracted.txt").write_text(text + " Changed.", encoding="utf-8")
    result = validate_stage(doc, "citation_units")
    assert result["status"] == "invalid"
    assert "do not exactly match" in result["detail"]


def test_embedding_requires_finite_vector_model_and_matching_dimension(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "preprocess.json", {"quality": "high"}, mtime=100)
    _write(doc / "embedding.json", {
        "model": "research-embedding", "dimension": 2, "vector": [0.1, 0.2],
    }, mtime=200)
    assert validate_stage(doc, "embedding")["status"] == "complete"

    _write(doc / "embedding.json", {
        "model": "research-embedding", "dimension": 2, "vector": [0.1, float("nan")],
    }, mtime=200)
    assert validate_stage(doc, "embedding")["status"] == "invalid"


def test_preservation_capture_needed_is_blocked_not_complete(tmp_path):
    doc = tmp_path / "doc"
    _write(doc / "intake.json", {"source": "https://example.org"}, mtime=100)
    _write(doc / "preprocess.json", {"quality": "blocked"}, mtime=100)
    _write(doc / "preservation_status.json", {
        "preservation_status": "capture_needed",
        "capture_needed": True,
        "capture_reason": "Challenge page",
        "suggested_capture_route": "browsertrix",
        "public_archive_status": "not-found",
        "local_html_path": "",
        "local_html_sha256": "",
        "notes": [],
    }, mtime=200)

    result = validate_preservation_stage(doc)
    assert result["status"] == "blocked"
    assert result["completed"] is False


def test_preservation_captured_html_requires_safe_matching_local_hash(tmp_path):
    import hashlib

    doc = tmp_path / "doc"
    doc.mkdir()
    _write(doc / "intake.json", {"source": "https://example.org"}, mtime=100)
    _write(doc / "preprocess.json", {"quality": "high"}, mtime=100)
    source = doc / "source.html"
    source.write_text("<html>captured</html>", encoding="utf-8")
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    _write(doc / "preservation_status.json", {
        "preservation_status": "captured_html",
        "capture_needed": False,
        "capture_reason": "",
        "suggested_capture_route": "",
        "public_archive_status": "existing",
        "local_html_path": str(source),
        "local_html_sha256": digest,
        "notes": [],
    }, mtime=200)

    assert validate_preservation_stage(doc)["status"] == "complete"
    source.write_text("tampered", encoding="utf-8")
    assert validate_preservation_stage(doc)["status"] == "invalid"


def test_linked_json_artifact_fails_closed(tmp_path):
    external = tmp_path / "external.json"
    _write(external, {"source": "outside"})
    doc = tmp_path / "doc"
    doc.mkdir()
    (doc / "intake.json").symlink_to(external)

    result = validate_stage(doc, "acquisition")
    assert result["status"] == "invalid"
    assert "symbolic link" in result["detail"]
