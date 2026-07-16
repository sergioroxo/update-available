import json
import os
from pathlib import Path
from types import SimpleNamespace

import pytest

from runner.pipeline.citation_units import build_citation_units
from runner.pipeline.dependency_impact import (
    EDGES,
    NODES,
    build_dependency_snapshot,
    preview_dependency_changes,
    validate_dependency_snapshot,
    validate_impact_preview,
)
from runner.pipeline.processing_projection import build_processing_projection
from runner.pipeline.source_queue import add_item, apply_triage_result, open_db, queue_db_path
from runner.pipeline.specialist_dispatch import build_dispatch_plan
from runner.pipeline.workflow_batch import plan_workflow_batch
from runner.dependency_impact_ui import impact_table_rows


def _write(path: Path, payload, *, mtime: int = 200) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")
    os.utime(path, ns=(mtime, mtime))


def _triage(**changes):
    values = dict(
        doc_type_hint="academic", recommended_llm="litelm", routing_reason="route",
        complexity="moderate", needs_book_splitting=False,
        needs_testimony_review=False, needs_media_review=False,
        needs_legal_review=False, overnight_batch_safe=True,
        suggested_process_route="standard", triage_succeeded=True,
    )
    values.update(changes)
    return SimpleNamespace(**values)


def _bundle(tmp_path: Path, *, specialist: bool = False, media: bool = False):
    corpus = tmp_path / "corpus"
    corpus.mkdir(parents=True)
    db = open_db(queue_db_path(corpus))
    item = add_item(db, "https://example.org/phase-10")
    apply_triage_result(
        db, item.id, _triage(
            needs_testimony_review=specialist, needs_media_review=media,
            overnight_batch_safe=not (specialist or media),
        ),
        model_name="triage-model",
    )
    doc_id = "phase-ten-doc"
    (corpus / doc_id).mkdir()
    db.execute("UPDATE source_queue SET corpus_doc_id=? WHERE id=?", (doc_id, item.id))
    db.commit()
    workflow = plan_workflow_batch(
        db, workflow_batch_id="phase-10-fixture", selected_item_ids=[item.id],
    )
    dispatch = build_dispatch_plan(workflow, corpus)
    db.close()
    return corpus, workflow, dispatch


def _artifacts(doc: Path) -> None:
    text = "Exact Phase 10 evidence for a bounded archival workflow."
    _write(doc / "intake.json", {"url": "https://example.org/phase-10"}, mtime=100)
    _write(doc / "preprocess.json", {"text_length": len(text)}, mtime=110)
    doc.joinpath("extracted.txt").write_text(text, encoding="utf-8")
    os.utime(doc / "extracted.txt", ns=(110, 110))
    _write(doc / "citation_units.json", build_citation_units(text, doc_id=doc.name), mtime=200)
    _write(doc / "analysis.json", {
        "type": "Pro-SOGICE", "format": "Blog-Post", "evidence": [],
        "scope": "Core", "narrative_register": "Legal-Policy",
        "summary": "Evidence", "confidence": {"status": "high", "overall_score": 0.9},
    }, mtime=200)
    _write(doc / "analysis_audit.json", {
        "errors": [], "model": "analysis-fixture", "prompt_sha256": "a" * 64,
        "prompt_template_sha256": "b" * 64, "lexicon_terms_injected": 12,
    }, mtime=200)
    _write(doc / "enrichment.json", {
        "doc_id": doc.name, "enrichment_model": "fixture",
        "lexicon_proposals": [], "entity_proposals": [], "tactic_proposals": [],
        "ingestion_queue": [], "corpus_connections": [],
        "practice_descriptions": [], "statistical_claims": [],
    }, mtime=300)
    _write(doc / "enrichment_audit.json", {
        "errors": [], "model": "enrichment-fixture", "prompt_sha256": "c" * 64,
        "lexicon_terms_injected": 20,
    }, mtime=300)
    _write(doc / "embedding.json", {
        "model": "embedding-fixture", "dimension": 3, "embedding": [0.1, 0.2, 0.3],
    }, mtime=300)


def _snapshot(tmp_path: Path, *, specialist: bool = False, media: bool = False):
    corpus, workflow, dispatch = _bundle(tmp_path, specialist=specialist, media=media)
    _artifacts(corpus / "phase-ten-doc")
    projection = build_processing_projection(workflow, dispatch, corpus)
    snapshot = build_dependency_snapshot(
        workflow, dispatch, corpus, processing_projection=projection,
    )
    return corpus, workflow, dispatch, projection, snapshot


def _nodes(preview, change_id):
    return {
        row["node"] for row in preview["rows"] if row["change_id"] == change_id
    }


def test_snapshot_is_bounded_read_only_content_addressed_and_deterministic(tmp_path):
    corpus, workflow, dispatch, projection, snapshot = _snapshot(tmp_path)
    before = sorted((path.relative_to(tmp_path), path.stat().st_size) for path in tmp_path.rglob("*") if path.is_file())

    second = build_dependency_snapshot(
        workflow, dispatch, corpus, processing_projection=projection,
    )

    after = sorted((path.relative_to(tmp_path), path.stat().st_size) for path in tmp_path.rglob("*") if path.is_file())
    assert before == after
    assert snapshot["evidence_fingerprint"] == second["evidence_fingerprint"]
    assert snapshot["captured_at"] == second["captured_at"] or snapshot["captured_at"] != ""
    assert snapshot["read_only"] is True
    assert snapshot["execution_authorized"] is False
    assert snapshot["automatic_rerun"] is False
    assert snapshot["remote_checked"] is False
    validate_dependency_snapshot(snapshot)


def test_graph_is_acyclic_and_extraction_impacts_expected_descendants(tmp_path):
    *_, snapshot = _snapshot(tmp_path)
    preview = preview_dependency_changes(snapshot, ["extraction_bytes"])
    nodes = _nodes(preview, "extraction_bytes")

    assert {"extraction", "citation_units", "analysis", "embedding", "enrichment"} <= nodes
    assert {"provisional_memory", "tag_projection", "compilation", "review_pack", "review_dossier"} <= nodes
    assert "acquisition" not in nodes
    assert "preservation" not in nodes
    assert ("provisional_memory", "enrichment") not in EDGES
    assert len(NODES) == len(set(NODES))
    validate_impact_preview(preview, snapshot)


def test_method_drift_is_reaudit_not_observed_stale_and_preserves_embedding(tmp_path):
    *_, snapshot = _snapshot(tmp_path)
    preview = preview_dependency_changes(snapshot, ["analysis_prompt_or_model"])
    analysis = next(row for row in preview["rows"] if row["node"] == "analysis")

    assert analysis["impact_class"] == "would_require_revalidation"
    assert analysis["observed_status"] == "complete"
    assert analysis["existing_artifact_preserved"] is True
    assert "embedding" not in _nodes(preview, "analysis_prompt_or_model")
    assert "citation_units" not in _nodes(preview, "analysis_prompt_or_model")
    assert all(row["automatic_action"] is False for row in preview["rows"])


def test_lexicon_change_reaudits_analysis_and_enrichment_without_reextracting(tmp_path):
    *_, snapshot = _snapshot(tmp_path)
    preview = preview_dependency_changes(snapshot, ["lexicon_input"])
    nodes = _nodes(preview, "lexicon_input")

    assert {"analysis", "enrichment", "provisional_memory", "compilation"} <= nodes
    assert "extraction" not in nodes
    assert "citation_units" not in nodes
    assert "embedding" not in nodes


def test_dossier_decision_only_refreshes_decision_projection(tmp_path):
    *_, snapshot = _snapshot(tmp_path)
    preview = preview_dependency_changes(snapshot, ["dossier_decision_event"])

    assert _nodes(preview, "dossier_decision_event") == {"decision_projection"}
    assert preview["rows"][0]["recommended_action"].startswith("Refresh the Review Inbox")
    assert preview["existing_artifacts_preserved"] is True


def test_publication_policy_only_rechecks_public_release(tmp_path):
    *_, snapshot = _snapshot(tmp_path)
    preview = preview_dependency_changes(snapshot, ["publication_policy"])

    assert _nodes(preview, "publication_policy") == {"public_release"}
    assert "compilation" not in _nodes(preview, "publication_policy")
    assert "review_pack" not in _nodes(preview, "publication_policy")
    assert "sanity_upload" not in _nodes(preview, "publication_policy")


def test_multiple_changes_deduplicate_document_stage_rows(tmp_path):
    *_, snapshot = _snapshot(tmp_path)
    preview = preview_dependency_changes(
        snapshot, ["analysis_prompt_or_model", "lexicon_input"],
    )
    analysis_rows = [row for row in preview["rows"] if row["node"] == "analysis"]

    assert len(analysis_rows) == 1
    assert analysis_rows[0]["change_ids"] == ["analysis_prompt_or_model", "lexicon_input"]
    assert len({(row["doc_id"], row["node"]) for row in preview["rows"]}) == len(preview["rows"])


def test_enrichment_edit_has_archive_fanout_warning_but_stays_batch_bounded(tmp_path):
    *_, snapshot = _snapshot(tmp_path)
    preview = preview_dependency_changes(snapshot, ["enrichment_output"])

    assert preview["outside_scope_fanout"] == "unknown"
    assert preview["summary"]["selected_documents"] == 1
    assert {row["doc_id"] for row in preview["rows"]} == {"phase-ten-doc"}
    assert "analysis" not in _nodes(preview, "enrichment_output")
    assert {"provisional_memory", "tag_projection", "compilation", "review_pack"} <= _nodes(preview, "enrichment_output")


def test_specialist_change_is_not_applied_when_route_is_not_required(tmp_path):
    *_, snapshot = _snapshot(tmp_path, specialist=False)
    preview = preview_dependency_changes(snapshot, ["specialist_evidence"])
    assert preview["rows"] == []


def test_required_specialist_files_are_fingerprinted_and_byte_changes_are_detected(tmp_path):
    corpus, workflow, dispatch, projection, _ = _snapshot(tmp_path, specialist=True)
    candidates = corpus / "phase-ten-doc" / "testimony_candidates.json"
    _write(candidates, {"candidates": []}, mtime=400)
    projection = build_processing_projection(workflow, dispatch, corpus)
    first = build_dependency_snapshot(
        workflow, dispatch, corpus, processing_projection=projection,
    )
    specialist = first["items"][0]["stage_snapshots"]["specialist"]

    assert specialist["specialist_route_bindings"][0]["route"] == "testimony"
    assert {row["name"] for row in specialist["files"]} >= {
        "analysis.json", "testimony_candidates.json",
    }

    old_mtime = candidates.stat().st_mtime_ns
    _write(candidates, {"candidates": [], "revision": "changed"}, mtime=old_mtime)
    changed_projection = build_processing_projection(workflow, dispatch, corpus)
    changed = build_dependency_snapshot(
        workflow, dispatch, corpus, processing_projection=changed_projection,
    )
    assert changed["evidence_fingerprint"] != first["evidence_fingerprint"]


def test_specialist_impact_is_route_specific_and_does_not_overflag_media(tmp_path):
    *_, testimony_snapshot = _snapshot(tmp_path / "testimony", specialist=True)
    testimony = preview_dependency_changes(
        testimony_snapshot, ["analysis_prompt_or_model"],
    )
    testimony_row = next(row for row in testimony["rows"] if row["node"] == "specialist")
    assert testimony_row["affected_specialist_routes"] == ["testimony"]

    *_, media_snapshot = _snapshot(tmp_path / "media", media=True)
    media = preview_dependency_changes(media_snapshot, ["analysis_prompt_or_model"])
    assert not any(row["node"] == "specialist" for row in media["rows"])


def test_enrichment_change_does_not_invalidate_required_second_opinion(tmp_path):
    corpus, workflow, _ = _bundle(tmp_path)
    _artifacts(corpus / "phase-ten-doc")
    analysis_path = corpus / "phase-ten-doc" / "analysis.json"
    analysis = json.loads(analysis_path.read_text(encoding="utf-8"))
    analysis["needs_review"] = True
    _write(analysis_path, analysis, mtime=400)
    dispatch = build_dispatch_plan(workflow, corpus)
    projection = build_processing_projection(workflow, dispatch, corpus)
    snapshot = build_dependency_snapshot(
        workflow, dispatch, corpus, processing_projection=projection,
    )
    assert snapshot["items"][0]["second_opinion_required"] is True

    preview = preview_dependency_changes(snapshot, ["enrichment_output"])
    assert not any(row["node"] == "second_opinion" for row in preview["rows"])


def test_same_mtime_byte_change_changes_snapshot_fingerprint(tmp_path):
    corpus, workflow, dispatch, projection, snapshot = _snapshot(tmp_path)
    path = corpus / "phase-ten-doc" / "analysis.json"
    old_mtime = path.stat().st_mtime_ns
    payload = json.loads(path.read_text(encoding="utf-8"))
    payload["summary"] = "Different bytes"
    path.write_text(json.dumps(payload), encoding="utf-8")
    os.utime(path, ns=(old_mtime, old_mtime))

    changed_projection = build_processing_projection(workflow, dispatch, corpus)
    changed = build_dependency_snapshot(
        workflow, dispatch, corpus, processing_projection=changed_projection,
    )
    assert changed["evidence_fingerprint"] != snapshot["evidence_fingerprint"]


def test_missing_legacy_provenance_is_reported_unknown_not_current(tmp_path):
    corpus, workflow, dispatch, _, _ = _snapshot(tmp_path)
    _write(corpus / "phase-ten-doc" / "analysis_audit.json", {"errors": []}, mtime=400)
    projection = build_processing_projection(workflow, dispatch, corpus)
    snapshot = build_dependency_snapshot(
        workflow, dispatch, corpus, processing_projection=projection,
    )
    preview = preview_dependency_changes(snapshot, ["analysis_prompt_or_model"])
    analysis = next(row for row in preview["rows"] if row["node"] == "analysis")
    assert analysis["impact_class"] == "provenance_unknown"
    assert analysis["provenance_coverage"] == "unknown"


def test_snapshot_strips_historical_chunk_error_excerpts(tmp_path):
    corpus, workflow, dispatch, _, _ = _snapshot(tmp_path)
    secret = "PRIVATE TESTIMONY RESPONSE EXCERPT"
    _write(corpus / "phase-ten-doc" / "enrichment_audit.json", {
        "model": "legacy-model",
        "chunked": True,
        "chunks": [{
            "index": 1,
            "char_count": 100,
            "succeeded": False,
            "model": "legacy-model",
            "validation_path": "failed",
            "validation_attempts": 3,
            "normalization_repairs": 0,
            "error": f"Raw response: {secret}",
        }],
    }, mtime=400)
    projection = build_processing_projection(workflow, dispatch, corpus)
    snapshot = build_dependency_snapshot(
        workflow, dispatch, corpus, processing_projection=projection,
    )

    encoded = json.dumps(snapshot)
    assert secret not in encoded
    chunk = snapshot["items"][0]["stage_snapshots"]["enrichment"]["recorded_provenance"]["chunks"][0]
    assert chunk["error"] == "model_attempt_failed"


def test_symlinked_selected_evidence_fails_closed(tmp_path):
    corpus, workflow, dispatch, _, _ = _snapshot(tmp_path)
    analysis = corpus / "phase-ten-doc" / "analysis.json"
    target = corpus / "phase-ten-doc" / "analysis-real.json"
    analysis.rename(target)
    analysis.symlink_to(target.name)
    projection = build_processing_projection(workflow, dispatch, corpus)

    with pytest.raises(ValueError, match="regular local file"):
        build_dependency_snapshot(
            workflow, dispatch, corpus, processing_projection=projection,
        )


def test_preview_rejects_unknown_scenario_and_wrong_projection_binding(tmp_path):
    corpus, workflow, dispatch, projection, snapshot = _snapshot(tmp_path)
    with pytest.raises(ValueError, match="Unsupported dependency change"):
        preview_dependency_changes(snapshot, ["invented_change"])

    projection["workflow_fingerprint"] = "0" * 64
    with pytest.raises(ValueError, match="not exactly bound"):
        build_dependency_snapshot(
            workflow, dispatch, corpus, processing_projection=projection,
        )


def test_snapshot_rejects_truncated_or_tampered_processing_projection(tmp_path):
    corpus, workflow, dispatch, projection, _ = _snapshot(tmp_path)
    projection["items"] = []

    with pytest.raises(ValueError, match="fingerprint does not match"):
        build_dependency_snapshot(
            workflow, dispatch, corpus, processing_projection=projection,
        )


def test_ui_rows_explain_impact_path_without_action_controls(tmp_path):
    *_, snapshot = _snapshot(tmp_path)
    preview = preview_dependency_changes(snapshot, ["analysis_output"])
    rows = impact_table_rows(preview)

    assert rows
    assert any("Analysis → Enrichment" in row["Dependency path"] for row in rows)
    assert all("Suggested next step" in row for row in rows)
    assert "not_triggered" in preview
