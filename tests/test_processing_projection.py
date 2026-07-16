import json
import os
from pathlib import Path
from types import SimpleNamespace

import pytest

from runner.pipeline.citation_units import build_citation_units
from runner.pipeline.batch_outcome import compile_workflow_batch_outcome
from runner.pipeline.processing_projection import (
    build_processing_projection,
    compilation_visibility_status,
    discover_bound_tail_artifact,
    discover_bound_tail_artifact_record,
    discover_latest_completed_artifact,
    discover_workflow_bundles,
    filter_processing_items,
)
from runner.pipeline.compilation_manifest import compilation_batch_key, publish_completed_compilation
from runner.pipeline.source_queue import add_item, apply_triage_result, open_db, queue_db_path
from runner.pipeline.specialist_dispatch import build_dispatch_plan, validate_dispatch_plan
from runner.pipeline.review_pack import generate_review_pack
from runner.pipeline.workflow_batch import plan_workflow_batch
from runner.processing_queue_ui import processing_matrix_rows, processing_worklist_rows
from runner.workflow_outputs_ui import (
    _historical_outcomes,
    _historical_review_packs,
    workflow_completion_gate,
)


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


def _bundle(
    tmp_path: Path, *, linked: bool = True, triaged: bool = True,
    settled: bool = False, media: bool = False, batch_id: str = "projection-fixture",
):
    corpus = tmp_path / "corpus"
    corpus.mkdir(parents=True)
    db = open_db(queue_db_path(corpus))
    item = add_item(db, "https://example.org/source")
    if triaged:
        apply_triage_result(
            db, item.id,
            _triage(needs_media_review=media, overnight_batch_safe=not media),
            model_name="triage-model",
        )
    doc_id = "doc-one" if linked else ""
    if doc_id:
        (corpus / doc_id).mkdir()
        db.execute("UPDATE source_queue SET corpus_doc_id=? WHERE id=?", (doc_id, item.id))
    if settled:
        db.execute("UPDATE source_queue SET status='ingested' WHERE id=?", (item.id,))
    db.commit()
    workflow = plan_workflow_batch(
        db, workflow_batch_id=batch_id, selected_item_ids=[item.id],
    )
    dispatch = build_dispatch_plan(workflow, corpus)
    return corpus, workflow, dispatch


def _write_base_artifacts(doc: Path) -> None:
    text = "A bounded archival source with citable evidence."
    _write(doc / "intake.json", {"url": "https://example.org/source"}, mtime=100)
    _write(doc / "preprocess.json", {"text_length": len(text)}, mtime=110)
    doc.joinpath("extracted.txt").write_text(text, encoding="utf-8")
    os.utime(doc / "extracted.txt", ns=(110, 110))
    _write(doc / "citation_units.json", build_citation_units(text, doc_id=doc.name), mtime=200)
    _write(doc / "analysis.json", {
        "type": "Pro-SOGICE", "format": "Blog-Post", "evidence": [],
        "scope": "Core", "narrative_register": "Legal-Policy",
        "summary": "Evidence", "confidence": {"status": "high", "overall_score": 0.9},
    }, mtime=200)
    _write(doc / "analysis_audit.json", {"errors": []}, mtime=200)
    _write(doc / "enrichment.json", {
        "doc_id": doc.name, "enrichment_model": "fixture",
        "lexicon_proposals": [], "entity_proposals": [], "tactic_proposals": [],
        "ingestion_queue": [], "corpus_connections": [],
        "practice_descriptions": [], "statistical_claims": [],
    }, mtime=300)
    _write(doc / "enrichment_audit.json", {"errors": []}, mtime=300)
    _write(doc / "embedding.json", {
        "model": "fixture-embedding", "dimension": 3, "embedding": [0.1, 0.2, 0.3],
    }, mtime=300)


def test_projection_is_read_only_bound_and_does_not_fuzzy_link(tmp_path):
    corpus, workflow, dispatch = _bundle(tmp_path, linked=False)
    before = sorted(path.relative_to(tmp_path) for path in tmp_path.rglob("*"))

    projection = build_processing_projection(workflow, dispatch, corpus)

    after = sorted(path.relative_to(tmp_path) for path in tmp_path.rglob("*"))
    assert before == after
    assert projection["read_only"] is True
    assert projection["execution_authorized"] is False
    assert projection["remote_checked"] is False
    assert projection["items"][0]["linkage_state"] == "unlinked"
    assert projection["items"][0]["doc_id"] == ""
    assert projection["items"][0]["stages"]["second_opinion"]["required"] is False
    assert "fuzzy match was attempted" in projection["items"][0]["linkage_detail"]


def test_projection_accepts_frozen_dispatch_after_base_processing_advances(tmp_path):
    # Use a real linked bundle, then freeze a planning-time status that is now
    # outdated because the exact workflow-bound document directory exists.
    corpus, workflow, dispatch = _bundle(tmp_path, linked=True, batch_id="advanced")
    dispatch["items"][0]["base_status"] = "waiting_for_base_processing"
    from runner.pipeline.specialist_dispatch import dispatch_stable_projection
    from runner.pipeline.workflow_integrity import canonical_fingerprint
    dispatch["evidence_fingerprint"] = canonical_fingerprint(dispatch_stable_projection(dispatch))

    with pytest.raises(ValueError, match="base status"):
        validate_dispatch_plan(dispatch, workflow, corpus_dir=corpus)
    projection = build_processing_projection(workflow, dispatch, corpus)
    assert projection["items"][0]["linkage_state"] == "linked"


def test_projection_reports_exact_stage_truth_and_tail_work(tmp_path):
    corpus, workflow, dispatch = _bundle(tmp_path)
    _write_base_artifacts(corpus / "doc-one")

    projection = build_processing_projection(workflow, dispatch, corpus)
    item = projection["items"][0]

    for stage in ("acquisition", "extraction", "citation_units", "analysis", "enrichment", "embedding"):
        assert item["stages"][stage]["status"] == "complete"
    assert item["overall_status"] == "complete"
    assert item["needs_attention"] is True
    assert item["next_action"] == "Compile the stable batch outcome"
    assert item["stages"]["supabase_reconciliation"]["status"] == "unknown"
    assert workflow_completion_gate(projection)["ready"] is True


def test_corrupt_citation_and_embedding_fail_closed(tmp_path):
    corpus, workflow, dispatch = _bundle(tmp_path)
    _write_base_artifacts(corpus / "doc-one")
    _write(corpus / "doc-one" / "citation_units.json", {"units": []}, mtime=400)
    _write(corpus / "doc-one" / "embedding.json", {
        "model": "fixture", "dimension": 1, "embedding": [float("nan")],
    }, mtime=400)

    item = build_processing_projection(workflow, dispatch, corpus)["items"][0]
    assert item["stages"]["citation_units"]["status"] == "invalid"
    assert item["stages"]["embedding"]["status"] == "invalid"
    assert item["overall_status"] == "invalid"
    gate = workflow_completion_gate(build_processing_projection(workflow, dispatch, corpus))
    assert gate["ready"] is False
    assert any("citation units is invalid" in value for value in gate["blockers"])


def test_capture_needed_is_visible_as_a_hold(tmp_path):
    corpus, workflow, dispatch = _bundle(tmp_path)
    _write_base_artifacts(corpus / "doc-one")
    _write(corpus / "doc-one" / "preservation_status.json", {
        "preservation_status": "capture_needed", "capture_needed": True,
        "capture_reason": "Dynamic page is not locally preserved.",
        "suggested_capture_route": "browser_capture", "public_archive_status": "unknown",
        "local_html_path": "", "local_html_sha256": "", "notes": [],
    }, mtime=400)

    item = build_processing_projection(workflow, dispatch, corpus)["items"][0]
    assert item["stages"]["preservation"]["status"] == "held"
    assert item["stages"]["preservation"]["required"] is True
    assert item["overall_status"] == "held"
    assert workflow_completion_gate(build_processing_projection(workflow, dispatch, corpus))["ready"] is True
    outcome = compile_workflow_batch_outcome(
        workflow, dispatch, corpus, tmp_path / "exports" / "batch_outcomes",
    )["outcome"]
    assert outcome["items"][0]["primary_outcome"] == "capture_exception"
    assert outcome["items"][0]["stages"]["preservation"]["status"] == "blocked"


def test_specialist_and_receipt_states_keep_human_and_remote_boundaries(tmp_path):
    corpus, workflow, dispatch = _bundle(tmp_path, media=True)
    _write_base_artifacts(corpus / "doc-one")
    _write(corpus / "doc-one" / "media_metadata.json", {"duration": 90}, mtime=400)
    _write(corpus / "doc-one" / "sanity_record.json", {
        "sanity_id": "private-record", "doc_id": "doc-one",
        "uploaded_at": "2026-07-13T10:00:00+00:00",
    }, mtime=500)

    item = build_processing_projection(workflow, dispatch, corpus)["items"][0]
    assert item["stages"]["specialist"]["required"] is True
    assert item["stages"]["sanity_upload"]["status"] == "receipt_present_unverified"
    assert item["stages"]["sanity_upload"]["completed"] is False
    assert item["stages"]["supabase_reconciliation"]["status"] == "unknown"
    assert item["stages"]["public_release"]["status"] == "human_required"


def test_receipts_fail_closed_without_claiming_remote_verification(tmp_path):
    corpus, workflow, dispatch = _bundle(tmp_path)
    _write(corpus / "doc-one" / "sanity_record.json", {"_id": "not-a-receipt"})
    _write(corpus / "doc-one" / "supabase_record.json", {"doc_id": "doc-one"})

    projection = build_processing_projection(workflow, dispatch, corpus)
    item = projection["items"][0]
    assert projection["remote_checked"] is False
    assert item["stages"]["sanity_upload"]["status"] == "invalid"
    assert item["stages"]["supabase_reconciliation"]["status"] == "invalid"
    assert item["stages"]["public_release"]["status"] == "human_required"


def test_attempts_require_exact_binding_and_do_not_overwrite_artifact_truth(tmp_path):
    corpus, workflow, dispatch = _bundle(tmp_path, media=True)
    _write(corpus / "doc-one" / "intake.json", {"doc_id": "doc-one", "source": "https://example.org"})
    _write(corpus / "doc-one" / "media_metadata.json", {"duration": 90}, mtime=300)
    common = {
        "workflow_batch_id": workflow["workflow_batch_id"],
        "workflow_fingerprint": workflow["evidence_fingerprint"],
        "dispatch_fingerprint": dispatch["evidence_fingerprint"],
        "queue_item_id": workflow["items"][0]["queue_item_id"],
        "doc_id": "doc-one", "created_at": "2026-07-13T10:00:00Z",
        "attempt_id": "attempt-bound", "route": workflow["items"][0]["base_route"], "stage": "local_base",
        "event_history_valid": True, "terminal_outcome": "failed",
        "execution_state": "execution_failed", "execution_run_id": "run-1",
    }
    wrong = {
        **common, "attempt_id": "attempt-wrong", "doc_id": "other",
        "stage": "media-report", "created_at": "2026-07-13T11:00:00Z",
    }

    item = build_processing_projection(
        workflow, dispatch, corpus, attempts=[wrong, common],
    )["items"][0]

    assert item["stages"]["specialist"]["artifact_status"] == "ready"
    assert item["stages"]["specialist"]["status"] == "ready"
    assert item["stages"]["specialist"]["operation_status"] == "not_recorded"
    assert item["attempt_binding_status"] == "conflict"
    assert item["overall_status"] == "inconsistent"
    assert item["next_action"] == "Audit attempt-ledger integrity before further work"
    assert [row["attempt_id"] for row in item["attempts"]] == ["attempt-bound"]
    assert [row["attempt_id"] for row in item["rejected_attempts"]] == ["attempt-wrong"]


def test_attempt_route_and_stage_must_be_permitted_by_frozen_dispatch(tmp_path):
    corpus, workflow, dispatch = _bundle(tmp_path, media=True)
    attempt = {
        "workflow_batch_id": workflow["workflow_batch_id"],
        "workflow_fingerprint": workflow["evidence_fingerprint"],
        "dispatch_fingerprint": dispatch["evidence_fingerprint"],
        "queue_item_id": workflow["items"][0]["queue_item_id"],
        "doc_id": "doc-one", "created_at": "2026-07-13T10:00:00Z",
        "attempt_id": "attempt-impossible-legal", "route": "legal",
        "stage": "specialist:legal", "event_history_valid": True,
        "terminal_outcome": "", "execution_state": "proposal_recorded",
    }

    item = build_processing_projection(
        workflow, dispatch, corpus, attempts=[attempt],
    )["items"][0]
    assert item["attempt_binding_status"] == "conflict"
    assert item["attempts"] == []
    assert item["rejected_attempts"][0]["attempt_id"] == "attempt-impossible-legal"
    assert item["overall_status"] == "inconsistent"


def test_specialist_operation_is_separate_from_current_artifact_status(tmp_path):
    corpus, workflow, dispatch = _bundle(tmp_path, media=True)
    _write(corpus / "doc-one" / "intake.json", {"doc_id": "doc-one", "source": "https://example.org"})
    _write(corpus / "doc-one" / "media_metadata.json", {"duration": 90}, mtime=300)
    attempt = {
        "workflow_batch_id": workflow["workflow_batch_id"],
        "workflow_fingerprint": workflow["evidence_fingerprint"],
        "dispatch_fingerprint": dispatch["evidence_fingerprint"],
        "queue_item_id": workflow["items"][0]["queue_item_id"],
        "doc_id": "doc-one", "created_at": "2026-07-13T10:00:00Z",
        "attempt_id": "attempt-media", "route": "media", "stage": "media-report",
        "event_history_valid": True, "terminal_outcome": "failed",
        "execution_state": "execution_failed", "execution_run_id": "run-1",
    }

    specialist = build_processing_projection(
        workflow, dispatch, corpus, attempts=[attempt],
    )["items"][0]["stages"]["specialist"]
    assert specialist["status"] == "ready"
    assert specialist["artifact_status"] == "ready"
    assert specialist["operation_status"] == "failed"
    assert specialist["consistency_status"] == "unverified_history"


def test_next_action_honours_required_second_opinion_before_compilation(tmp_path):
    corpus, workflow, _ = _bundle(tmp_path)
    _write_base_artifacts(corpus / "doc-one")
    analysis_path = corpus / "doc-one" / "analysis.json"
    analysis = json.loads(analysis_path.read_text(encoding="utf-8"))
    analysis["needs_review"] = True
    _write(analysis_path, analysis, mtime=400)
    enrichment_path = corpus / "doc-one" / "enrichment.json"
    enrichment = json.loads(enrichment_path.read_text(encoding="utf-8"))
    _write(enrichment_path, enrichment, mtime=500)
    _write(corpus / "doc-one" / "enrichment_audit.json", {"errors": []}, mtime=500)
    dispatch = build_dispatch_plan(workflow, corpus)

    item = build_processing_projection(workflow, dispatch, corpus)["items"][0]
    assert item["stages"]["second_opinion"]["required"] is True
    assert item["next_action"] == "Run the already-planned second opinion after a fresh preflight"


def test_bound_outcome_retains_frozen_human_required_second_opinion(tmp_path):
    corpus, workflow, _ = _bundle(tmp_path)
    _write_base_artifacts(corpus / "doc-one")
    doc = corpus / "doc-one"
    analysis = json.loads((doc / "analysis.json").read_text())
    analysis["needs_review"] = True
    _write(doc / "analysis.json", analysis, mtime=400)
    _write(doc / "enrichment.json", json.loads((doc / "enrichment.json").read_text()), mtime=500)
    _write(doc / "enrichment_audit.json", {"errors": []}, mtime=500)
    _write(doc / "analysis_alt.json", {**analysis, "summary": "Alternate"}, mtime=510)
    _write(doc / "analysis_comparison_test.json", {
        "outcome": "pending", "alt_file": "analysis_alt.json",
        "original_file": "analysis.json", "differences": ["summary"],
    }, mtime=520)
    dispatch = build_dispatch_plan(workflow, corpus)
    projection = build_processing_projection(workflow, dispatch, corpus)
    assert projection["items"][0]["stages"]["second_opinion"]["status"] == "human_required"
    assert workflow_completion_gate(projection)["ready"] is True

    outcome = compile_workflow_batch_outcome(
        workflow, dispatch, corpus, tmp_path / "exports" / "batch_outcomes",
    )["outcome"]
    row = outcome["items"][0]
    second = next(route for route in row["specialist_routes"] if route["route"] == "second_opinion")
    assert second["status"] == "human_required"
    assert row["stages"]["second_opinion"]["status"] == "human_required"
    assert any(finding["code"] == "specialist_attention" for finding in row["findings"])

    comparison_path = doc / "analysis_comparison_test.json"
    decided = json.loads(comparison_path.read_text())
    decided.update({"outcome": "kept_original", "decided_at": "2026-07-14T10:00:00+00:00"})
    _write(comparison_path, decided, mtime=900)
    stale = build_processing_projection(
        workflow, dispatch, corpus, outcome=outcome,
    )["items"][0]["stages"]["compilation"]
    assert stale["status"] == "stale"


def test_deferred_and_technical_hold_do_not_reinvent_triage(tmp_path):
    corpus, workflow, dispatch = _bundle(tmp_path / "settled", settled=True)
    settled = build_processing_projection(workflow, dispatch, corpus)["items"][0]
    assert settled["base_route"] == "deferred"
    assert settled["linkage_state"] == "settled"
    assert settled["overall_status"] == "complete"
    assert settled["needs_attention"] is False

    corpus, workflow, dispatch = _bundle(
        tmp_path / "held", linked=False, triaged=False, batch_id="held",
    )
    held = build_processing_projection(workflow, dispatch, corpus)["items"][0]
    assert held["base_route"] == "technical_hold"
    assert held["linkage_state"] == "held"
    assert held["overall_status"] == "held"
    assert "triage" in held["next_action"].lower()
    assert workflow_completion_gate(
        build_processing_projection(workflow, dispatch, corpus)
    )["ready"] is True


def test_completion_gate_blocks_unlinked_ordinary_work(tmp_path):
    corpus, workflow, dispatch = _bundle(tmp_path, linked=False)
    gate = workflow_completion_gate(build_processing_projection(workflow, dispatch, corpus))
    assert gate["ready"] is False
    assert any("unlinked" in value for value in gate["blockers"])


def test_bound_outcome_and_review_pack_require_exact_batch_and_doc(tmp_path):
    corpus, workflow, dispatch = _bundle(tmp_path)
    _write_base_artifacts(corpus / "doc-one")
    bad_outcome = {"schema_version": "batch-outcome-v2.1", "batch_id": "other", "items": []}
    bad_pack = {"schema_version": "codex-review-pack-v1.1", "label": "other", "documents": []}
    item = build_processing_projection(
        workflow, dispatch, corpus, outcome=bad_outcome, review_pack=bad_pack,
    )["items"][0]
    assert item["stages"]["compilation"]["status"] == "invalid"
    assert item["stages"]["review_pack"]["status"] == "invalid"


def test_tail_artifacts_require_exact_workflow_binding_and_complete_when_verified(tmp_path):
    corpus, workflow, dispatch = _bundle(tmp_path)
    _write_base_artifacts(corpus / "doc-one")
    exports = tmp_path / "exports"
    outcome_result = compile_workflow_batch_outcome(
        workflow, dispatch, corpus, exports / "batch_outcomes",
    )
    outcome = outcome_result["outcome"]
    pack_result = generate_review_pack(
        corpus, exports / "review_packs", outcome_path=outcome_result["outcome_path"],
    )
    pack = pack_result["pack"]
    item = build_processing_projection(
        workflow, dispatch, corpus, outcome=outcome, review_pack=pack,
    )["items"][0]
    assert item["stages"]["compilation"]["status"] == "complete"
    assert item["stages"]["compilation"]["completed"] is True
    assert item["stages"]["review_pack"]["status"] == "complete"

    assert discover_bound_tail_artifact(
        exports, "batch_outcomes", "latest_batch_outcome.json",
        workflow=workflow, dispatch=dispatch,
    ) == outcome


def test_bound_tail_becomes_stale_when_compiled_source_bytes_change(tmp_path):
    corpus, workflow, dispatch = _bundle(tmp_path)
    _write_base_artifacts(corpus / "doc-one")
    outcome = compile_workflow_batch_outcome(
        workflow, dispatch, corpus, tmp_path / "exports" / "batch_outcomes",
    )["outcome"]
    assert build_processing_projection(
        workflow, dispatch, corpus, outcome=outcome,
    )["items"][0]["stages"]["compilation"]["status"] == "complete"

    analysis_path = corpus / "doc-one" / "analysis.json"
    analysis = json.loads(analysis_path.read_text())
    analysis["summary"] = "Current evidence changed but remains structurally valid."
    _write(analysis_path, analysis, mtime=800)
    stale = build_processing_projection(
        workflow, dispatch, corpus, outcome=outcome,
    )["items"][0]["stages"]["compilation"]
    assert stale["status"] == "stale"
    assert stale["completed"] is False


def test_reader_uses_completed_manifest_instead_of_newer_replaceable_latest(tmp_path):
    _, workflow, dispatch = _bundle(tmp_path)
    exports = tmp_path / "exports"
    binding = {
        "workflow_batch_id": workflow["workflow_batch_id"],
        "workflow_fingerprint": workflow["evidence_fingerprint"],
        "dispatch_fingerprint": dispatch["evidence_fingerprint"],
    }
    immutable_outcome = exports / "immutable" / "batch_outcome.json"
    memory = exports / "immutable" / "memory.json"
    projection = exports / "immutable" / "tags.json"
    _write(immutable_outcome, {"workflow_binding": binding, "marker": "completed"})
    _write(memory, {"marker": "memory"})
    _write(projection, {"marker": "tags"})
    publish_completed_compilation(
        exports, workflow["workflow_batch_id"], [
            ("provisional_memory", memory), ("tag_projection", projection),
            ("batch_outcome", immutable_outcome),
        ], source="test",
    )
    replaceable = exports / "batch_outcomes" / workflow["workflow_batch_id"] / "latest_batch_outcome.json"
    _write(replaceable, {"workflow_binding": binding, "marker": "half-written-newer"})

    record = discover_bound_tail_artifact_record(
        exports, "batch_outcomes", "latest_batch_outcome.json",
        workflow=workflow, dispatch=dispatch,
    )
    assert record["payload"]["marker"] == "completed"
    assert record["visibility_mode"] == "completed_manifest"


def test_reader_discloses_legacy_fallback_and_suppresses_it_after_attempt(tmp_path):
    _, workflow, dispatch = _bundle(tmp_path)
    exports = tmp_path / "exports"
    binding = {
        "workflow_batch_id": workflow["workflow_batch_id"],
        "workflow_fingerprint": workflow["evidence_fingerprint"],
        "dispatch_fingerprint": dispatch["evidence_fingerprint"],
    }
    latest = exports / "batch_outcomes" / workflow["workflow_batch_id"] / "latest_batch_outcome.json"
    _write(latest, {"workflow_binding": binding, "marker": "legacy"})
    record = discover_bound_tail_artifact_record(
        exports, "batch_outcomes", "latest_batch_outcome.json",
        workflow=workflow, dispatch=dispatch,
    )
    assert record["visibility_mode"] == "legacy_fallback"
    assert "Legacy pre-Phase-12" in record["disclosure"]

    attempt = exports / "compilations" / workflow["workflow_batch_id"] / "attempts" / "attempt-1" / "attempt.json"
    _write(attempt, {"status": "staging"})
    assert discover_bound_tail_artifact_record(
        exports, "batch_outcomes", "latest_batch_outcome.json",
        workflow=workflow, dispatch=dispatch,
    ) is None
    status = compilation_visibility_status(exports, workflow["workflow_batch_id"])
    assert status["state"] == "phase12_incomplete"
    assert status["visible"] is False
    assert "intentionally hidden" in status["disclosure"]


def test_global_completed_reader_never_falls_back_during_partial_attempt(tmp_path):
    exports = tmp_path / "exports"
    legacy = exports / "provisional_memory" / "latest_provisional_memory.json"
    _write(legacy, {"marker": "legacy"})
    assert discover_latest_completed_artifact(
        exports, "provisional_memory", legacy_path=legacy,
    )["visibility_mode"] == "legacy_fallback"
    _write(exports / "compilations" / "batch" / "attempts" / "a" / "attempt.json", {"status": "staging"})
    assert discover_latest_completed_artifact(
        exports, "provisional_memory", legacy_path=legacy,
    ) is None


def test_historical_outcome_uses_collision_resistant_attempt_key(tmp_path):
    exports = tmp_path / "exports"
    batch_id = "unsafe/batch"
    _write(
        exports / "batch_outcomes" / "unsafe-batch" / "latest_batch_outcome.json",
        {"batch_id": batch_id, "workflow_binding": None, "audit_id": "partial"},
    )
    _write(
        exports / "compilations" / compilation_batch_key(batch_id)
        / "attempts" / "attempt-1" / "attempt.json",
        {"status": "staging", "batch_id": batch_id},
    )
    assert _historical_outcomes(exports) == []


def test_historical_review_pack_uses_collision_resistant_attempt_key(tmp_path):
    exports = tmp_path / "exports"
    batch_id = "unsafe/batch"
    _write(
        exports / "review_packs" / "unsafe-batch" / "latest_review_pack.json",
        {
            "label": "Unsafe batch", "workflow_binding": None,
            "batch_outcome_binding": {"batch_id": batch_id},
        },
    )
    _write(
        exports / "compilations" / compilation_batch_key(batch_id)
        / "attempts" / "attempt-1" / "attempt.json",
        {"status": "staging", "batch_id": batch_id},
    )
    assert _historical_review_packs(exports) == []


def test_discovery_is_bounded_paired_and_filtering_uses_projection_state(tmp_path):
    exports = tmp_path / "exports"
    for batch_id in ("older", "newer"):
        _write(exports / "workflow_batches" / batch_id / "latest_workflow_batch.json", {"id": batch_id})
        _write(exports / "specialist_dispatch" / batch_id / "latest_specialist_dispatch.json", {"id": batch_id})
    os.utime(exports / "workflow_batches" / "newer" / "latest_workflow_batch.json", ns=(500, 500))
    rows = discover_workflow_bundles(exports, limit=1)
    assert [row["workflow_batch_id"] for row in rows] == ["newer"]
    assert rows[0]["paired"] is True

    items = [
        {"needs_attention": True, "overall_status": "invalid", "linkage_state": "linked", "stages": {"specialist": {"required": False}}},
        {"needs_attention": False, "overall_status": "complete", "linkage_state": "linked", "stages": {"specialist": {"required": False}}},
    ]
    assert len(filter_processing_items(items, "Needs attention")) == 1
    assert filter_processing_items(items, "Core processing complete")[0]["overall_status"] == "complete"


def test_streamlit_rows_expose_next_action_and_every_stage(tmp_path):
    corpus, workflow, dispatch = _bundle(tmp_path)
    item = build_processing_projection(workflow, dispatch, corpus)["items"][0]

    worklist = processing_worklist_rows([item])[0]
    matrix = processing_matrix_rows([item])[0]

    assert worklist["Next action"]
    assert worklist["Why"]
    assert set(matrix) == {
        "Document", "Specialist operation", "Attempt integrity",
        "Acquisition", "Preservation", "Extraction", "Citation Units",
        "Analysis", "Enrichment", "Embedding", "Specialist", "Second Opinion",
        "Draft Review", "Compilation", "Review Pack", "Sanity Upload",
        "Supabase Reconciliation", "Public Release",
    }
