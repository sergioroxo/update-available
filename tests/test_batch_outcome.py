import json
import sqlite3
from pathlib import Path
from types import SimpleNamespace

import pytest
from typer.testing import CliRunner

from runner.pipeline import batch_outcome
from runner.pipeline.citation_units import build_citation_units
from runner import main
from runner import app as app_ui
from runner.pipeline.source_queue import add_item, apply_triage_result, open_db, queue_db_path
from runner.pipeline.specialist_dispatch import build_dispatch_plan
from runner.pipeline.source_identity import build_identity_snapshot
from runner.pipeline.source_identity_decisions import (
    apply_identity_decisions,
    create_identity_decision,
    write_identity_decision,
    write_reviewed_identity_projection,
)
from runner.pipeline.workflow_batch import plan_workflow_batch


def _write(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _doc(corpus: Path, doc_id: str, *, doc_type: str = "Pro-SOGICE", proposals: bool = False, tier: int = 3) -> Path:
    doc = corpus / doc_id
    _write(doc / "intake.json", {"doc_id": doc_id, "source": f"https://{doc_id}.example.org/source", "tier": tier})
    _write(doc / "preprocess.json", {"quality": "ok"})
    extracted = "Candidate appears in this source."
    (doc / "extracted.txt").write_text(extracted, encoding="utf-8")
    _write(doc / "analysis.json", {
        "doc_id": doc_id,
        "type": doc_type,
        "format": "Blog-Post",
        "evidence": [],
        "scope": "Core",
        "narrative_register": "Legal-Policy",
        "summary": "Description",
        "confidence": {"status": "high", "overall_score": 0.9},
    })
    _write(doc / "analysis_audit.json", {
        "model": "core-qwen",
        "prompt_version": "test-v1",
        "validation_path": "typed",
        "errors": [],
    })
    _write(doc / "enrichment.json", {
        "doc_id": doc_id,
        "lexicon_proposals": [{
            "action": "add_new", "term": "Candidate",
            "exact_quote": "Candidate appears in this source.",
        }] if proposals else [],
    })
    _write(doc / "enrichment_audit.json", {"errors": [], "model": "core-gemma"})
    _write(doc / "citation_units.json", build_citation_units(extracted, doc_id=doc_id))
    return doc


def _ledger(path: Path, items: list[dict], batch_id: str = "batch-test") -> Path:
    _write(path, {"batch_id": batch_id, "items": items, "manifest": {}})
    return path


def _triage():
    return SimpleNamespace(
        doc_type_hint="academic", recommended_llm="litelm", routing_reason="route",
        complexity="moderate", needs_book_splitting=False,
        needs_testimony_review=False, needs_media_review=False,
        needs_legal_review=False, overnight_batch_safe=True,
        suggested_process_route="standard", triage_succeeded=True,
    )


def _workflow_bundle(tmp_path: Path):
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    db = open_db(queue_db_path(corpus))
    linked = add_item(db, "https://example.org/linked")
    held = add_item(db, "https://example.org/held")
    deferred = add_item(db, "https://example.org/deferred")
    for item in (linked, deferred):
        apply_triage_result(db, item.id, _triage(), model_name="triage-model")
    db.execute("UPDATE source_queue SET corpus_doc_id=? WHERE id=?", ("d1", linked.id))
    db.execute(
        "UPDATE source_queue SET corpus_doc_id=?, status='ingested' WHERE id=?",
        ("d2", deferred.id),
    )
    db.commit()
    _doc(corpus, "d1")
    _doc(corpus, "d2")
    workflow = plan_workflow_batch(
        db, workflow_batch_id="workflow-bound-test",
        selected_item_ids=[linked.id, held.id, deferred.id], limit=3,
    )
    dispatch = build_dispatch_plan(workflow, corpus)
    return corpus, workflow, dispatch


def test_compiler_accounts_for_every_item_and_routes_without_execution(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "ordinary")
    _doc(corpus, "testimony", doc_type="Testimony")
    _doc(corpus, "candidate", proposals=True)
    ledger = _ledger(tmp_path / "ledger.json", [
        {"item_id": "i1", "doc_id": "ordinary", "status": "succeeded"},
        {"item_id": "i2", "doc_id": "testimony", "status": "succeeded"},
        {"item_id": "i3", "doc_id": "candidate", "status": "succeeded"},
        {"item_id": "i4", "doc_id": "", "status": "failed", "error": "model unavailable"},
        {"item_id": "i5", "doc_id": "", "status": "not_executed"},
    ])

    result = batch_outcome.compile_batch_outcome(ledger, corpus, tmp_path / "out")
    outcome = result["outcome"]
    assert outcome["summary"]["accounted_for"] == 5
    assert outcome["summary"]["expected_items"] == 5
    by_id = {row["item_id"]: row["primary_outcome"] for row in outcome["items"]}
    assert by_id == {
        "i1": "ordinary_ready",
        "i2": "ordinary_ready",
        "i3": "ordinary_ready",
        "i4": "pipeline_exception",
        "i5": "deferred",
    }
    rows = {row["item_id"]: row for row in outcome["items"]}
    assert rows["i2"]["specialist_routes"][0]["route"] == "testimony_candidates_and_deep_review"
    assert rows["i3"]["knowledge_candidates"]["actionable_total"] == 1
    # The fixture is tier 3, so the existing review policy correctly treats it
    # as a bounded key-document exception rather than routine long-tail work.
    assert rows["i3"]["review_assignment"]["lane"] == "bounded_human_exception"
    assert rows["i1"]["stages"]["citation_units"]["status"] == "complete"
    assert rows["i1"]["stages"]["embedding"]["status"] == "missing"
    assert rows["i1"]["publication_readiness"]["recommended_lane"] == "blocked"
    route = json.loads(result["route_plan_path"].read_text())
    assert route["dry_run"] is True
    assert len(route["routes"]) == 5


def test_compiler_replays_reviewed_source_families_into_memory(tmp_path):
    """Exercise the saved Phase 11B ledger through the real compiler boundary."""
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1", proposals=True)
    _doc(corpus, "d2", proposals=True)
    snapshot = build_identity_snapshot(corpus)
    decisions = [
        create_identity_decision(
            snapshot,
            decision_type="family_assignment",
            subject={"doc_id": doc_id},
            outcome={"state": "assigned", "family_id": "reviewed-family-one"},
            researcher_id="researcher-test",
            decided_at=f"2026-07-15T12:00:0{index}+00:00",
        )
        for index, doc_id in enumerate(("d1", "d2"))
    ]
    for decision in decisions:
        write_identity_decision(decision, tmp_path)
    reviewed = apply_identity_decisions(snapshot, decisions)
    write_reviewed_identity_projection(reviewed, tmp_path, snapshot, decisions)

    ledger = _ledger(tmp_path / "ledger.json", [
        {"item_id": "i1", "doc_id": "d1", "status": "succeeded"},
        {"item_id": "i2", "doc_id": "d2", "status": "succeeded"},
    ])
    result = batch_outcome.compile_batch_outcome(ledger, corpus, tmp_path / "out")
    memory = json.loads(result["provisional_memory_path"].read_text(encoding="utf-8"))
    cluster = next(row for row in memory["clusters"] if row["preferred_draft_label"] == "Candidate")

    assert memory["source_identity_review"]["available"] is True
    assert memory["source_identity_review"]["decision_ledger_fingerprint"] == reviewed["decision_ledger_fingerprint"]
    assert cluster["source_family_count"] == 1
    assert cluster["source_families"] == ["reviewed-family-one"]
    assert cluster["source_independence"]["independence_claim"] is False


def test_identical_reaudit_reuses_immutable_snapshot(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    ledger = _ledger(tmp_path / "ledger.json", [
        {"item_id": "i1", "doc_id": "d1", "status": "succeeded"},
    ])
    first = batch_outcome.compile_batch_outcome(ledger, corpus, tmp_path / "out")
    second = batch_outcome.compile_batch_outcome(ledger, corpus, tmp_path / "out")
    assert first["outcome"]["audit_id"] == second["outcome"]["audit_id"]
    assert second["reused"] is True
    assert len(list((tmp_path / "out" / "batch-test" / "audits").iterdir())) == 1


def test_invalid_analysis_cannot_remain_ordinary_ready(tmp_path):
    corpus = tmp_path / "corpus"
    doc = _doc(corpus, "invalid-analysis")
    (doc / "analysis.json").write_text('{"nonsense": 1}', encoding="utf-8")
    ledger = _ledger(tmp_path / "ledger.json", [
        {"item_id": "i1", "doc_id": "invalid-analysis", "status": "succeeded"},
    ])

    outcome = batch_outcome.compile_batch_outcome(ledger, corpus, tmp_path / "out")["outcome"]

    assert outcome["items"][0]["primary_outcome"] == "reprocess_recommended"
    assert outcome["items"][0]["stages"]["analysis"]["status"] == "invalid"


def test_nonsense_enrichment_cannot_remain_ordinary_ready(tmp_path):
    corpus = tmp_path / "corpus"
    doc = _doc(corpus, "invalid-enrichment")
    (doc / "enrichment.json").write_text('{"nonsense": 1}', encoding="utf-8")
    ledger = _ledger(tmp_path / "ledger.json", [
        {"item_id": "i1", "doc_id": "invalid-enrichment", "status": "succeeded"},
    ])

    outcome = batch_outcome.compile_batch_outcome(ledger, corpus, tmp_path / "out")["outcome"]

    assert outcome["items"][0]["primary_outcome"] == "reprocess_recommended"
    assert outcome["items"][0]["stages"]["enrichment"]["status"] == "invalid"


def test_changed_policy_creates_new_audit_and_reports_changed_outcome(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1", doc_type="Media-Coverage")
    ledger = _ledger(tmp_path / "ledger.json", [
        {"item_id": "i1", "doc_id": "d1", "status": "succeeded"},
    ])
    first = batch_outcome.compile_batch_outcome(ledger, corpus, tmp_path / "out")
    policy = dict(batch_outcome.DEFAULT_POLICY)
    policy["policy_version"] = "batch-outcome-policy-v2.2"
    policy["testimony_types"] = [*policy["testimony_types"], "Media-Coverage"]
    policy_path = tmp_path / "policy-v2.json"
    _write(policy_path, policy)
    second = batch_outcome.compile_batch_outcome(
        ledger, corpus, tmp_path / "out", policy_path=policy_path,
    )

    assert first["outcome"]["items"][0]["primary_outcome"] == "ordinary_ready"
    assert second["outcome"]["items"][0]["primary_outcome"] == "ordinary_ready"
    assert second["outcome"]["items"][0]["specialist_routes"][0]["route"] == "testimony_candidates_and_deep_review"
    changed = second["outcome"]["changes_from_previous"]["changed"]
    assert len(changed) == 1
    assert changed[0]["item_id"] == "i1"
    assert changed[0]["from"]["specialist_routes"] == []
    assert changed[0]["to"]["specialist_routes"] == [{
        "route": "testimony_candidates_and_deep_review",
        "status": "pending",
    }]
    assert changed[0]["from"]["stage_statuses"]["specialist"] == "not_applicable"
    assert changed[0]["to"]["stage_statuses"]["specialist"] == "pending"
    assert len(list((tmp_path / "out" / "batch-test" / "audits").iterdir())) == 2


def test_artifact_change_creates_new_audit_without_overwriting_history(tmp_path):
    corpus = tmp_path / "corpus"
    doc = _doc(corpus, "d1")
    ledger = _ledger(tmp_path / "ledger.json", [
        {"item_id": "i1", "doc_id": "d1", "status": "succeeded"},
    ])
    first = batch_outcome.compile_batch_outcome(ledger, corpus, tmp_path / "out")
    (doc / "enrichment.json").unlink()
    second = batch_outcome.compile_batch_outcome(ledger, corpus, tmp_path / "out")
    assert first["outcome_path"] != second["outcome_path"]
    assert second["outcome"]["items"][0]["primary_outcome"] == "reprocess_recommended"
    assert first["outcome_path"].exists()


def test_invalid_or_duplicate_ledger_items_fail_closed(tmp_path):
    ledger = _ledger(tmp_path / "ledger.json", [
        {"item_id": "same", "status": "failed"},
        {"item_id": "same", "status": "failed"},
    ])
    with pytest.raises(ValueError, match="unique"):
        batch_outcome.compile_batch_outcome(ledger, tmp_path / "corpus", tmp_path / "out")


def test_batch_outcome_cli_compiles_local_dry_run(monkeypatch, tmp_path):
    corpus = tmp_path / "corpus"
    exports = tmp_path / "exports"
    _doc(corpus, "d1")
    ledger = _ledger(tmp_path / "ledger.json", [
        {"item_id": "i1", "doc_id": "d1", "status": "succeeded"},
    ])
    config = type("Config", (), {"corpus_dir": corpus, "exports_dir": exports})()
    monkeypatch.setattr(main, "load_config", lambda **kwargs: config)

    result = CliRunner().invoke(main.app, ["batch-outcome", str(ledger)])

    assert result.exit_code == 0
    assert "Accounted for" in result.stdout
    assert "nothing was published" in result.stdout
    assert len(list((exports / "batch_outcomes" / "batch-test" / "audits").iterdir())) == 1


def test_app_action_finds_and_compiles_recent_ledger(tmp_path):
    corpus = tmp_path / "corpus"
    exports = tmp_path / "exports"
    _doc(corpus, "d1")
    ledger = _ledger(exports / "batch_ledgers" / "batch-test_ledger.json", [
        {"item_id": "i1", "doc_id": "d1", "status": "succeeded"},
    ])
    config = type("Config", (), {"corpus_dir": corpus, "exports_dir": exports})()

    assert app_ui._recent_batch_ledgers(config) == [ledger]
    result = app_ui._compile_batch_outcome_action(config, ledger)

    assert result["outcome"]["summary"]["accounted_for"] == 1
    assert result["route_plan_path"].exists()


def test_compiler_reads_real_triage_flags_from_queue_without_mutating_it(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    db_path = tmp_path / "source_queue.db"
    with sqlite3.connect(db_path) as db:
        db.execute(
            """CREATE TABLE source_queue (
                id TEXT PRIMARY KEY, url TEXT, url_hash TEXT, corpus_doc_id TEXT,
                doc_type_hint TEXT, suggested_process_route TEXT,
                needs_media_review INTEGER, needs_testimony_review INTEGER,
                needs_legal_review INTEGER, needs_book_splitting INTEGER
            )"""
        )
        db.execute(
            "INSERT INTO source_queue VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("queue-1", "https://example.org/media", "hash-1", "d1", "Media",
             "analysis_then_media", 1, 0, 0, 0),
        )
    before = db_path.read_bytes()
    ledger = _ledger(tmp_path / "ledger.json", [
        {"item_id": "queue-1", "doc_id": "d1", "status": "succeeded"},
    ])

    result = batch_outcome.compile_batch_outcome(ledger, corpus, tmp_path / "out")

    row = result["outcome"]["items"][0]
    assert row["triage"]["specialist_flags"] == ["needs_media_review"]
    assert row["triage"]["suggested_process_route"] == "analysis_then_media"
    assert row["specialist_routes"][0]["route"] == "media_report"
    assert db_path.read_bytes() == before


def test_compiler_accepts_partial_worker_report_as_real_processing_input(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "done")
    worker_report = tmp_path / "worker_report.json"
    _write(worker_report, {
        "package_id": "pkg-1",
        "worker_status": "partial",
        "documents": [
            {"doc_id": "done", "status": "succeeded", "stages": {"analysis": {"status": "succeeded"}}},
            {"doc_id": "failed", "status": "failed", "error": "model unavailable"},
        ],
    })

    result = batch_outcome.compile_batch_outcome(worker_report, corpus, tmp_path / "out")

    assert result["outcome"]["input_kind"] == "worker_report"
    assert result["outcome"]["batch_id"] == "pkg-1"
    assert result["outcome"]["summary"]["accounted_for"] == 2
    assert [row["primary_outcome"] for row in result["outcome"]["items"]] == [
        "ordinary_ready", "pipeline_exception",
    ]


def test_compiler_preserves_specialist_held_manifest_rows_outside_execution_count(tmp_path):
    corpus = tmp_path / "corpus"
    db_path = tmp_path / "source_queue.db"
    with sqlite3.connect(db_path) as db:
        db.execute(
            """CREATE TABLE source_queue (
                id TEXT PRIMARY KEY, url TEXT, url_hash TEXT, corpus_doc_id TEXT,
                doc_type_hint TEXT, suggested_process_route TEXT,
                needs_media_review INTEGER, needs_testimony_review INTEGER,
                needs_legal_review INTEGER, needs_book_splitting INTEGER
            )"""
        )
        db.execute(
            "INSERT INTO source_queue VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("held-1", "https://example.org/video", "held-hash", "", "Media",
             "analysis_then_media", 1, 0, 0, 0),
        )
    ledger = _ledger(tmp_path / "ledger.json", [], batch_id="held-batch")
    payload = json.loads(ledger.read_text())
    payload["manifest"] = {"excluded": [{
        "item_id": "held-1", "url": "https://example.org/video",
        "exclusion_reason": "needs_review:needs_media_review",
    }]}
    _write(ledger, payload)

    result = batch_outcome.compile_batch_outcome(ledger, corpus, tmp_path / "out")

    assert result["outcome"]["summary"]["expected_items"] == 0
    assert result["outcome"]["summary"]["routed_holds"] == 1
    held = result["outcome"]["routed_holds"][0]
    assert held["specialist_routes"][0]["route"] == "media_report"
    assert held["specialist_routes"][0]["status"] == "waiting_for_base_processing"


def test_corpus_growth_changes_reaudit_and_review_lane(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1", proposals=True, tier=2)
    ledger = _ledger(tmp_path / "ledger.json", [
        {"item_id": "i1", "doc_id": "d1", "status": "succeeded"},
    ])
    first = batch_outcome.compile_batch_outcome(ledger, corpus, tmp_path / "out")
    assert first["outcome"]["items"][0]["review_assignment"]["lane"] == "ai_managed_provisional"

    _doc(corpus, "d2", proposals=True, tier=2)
    _doc(corpus, "d3", proposals=True, tier=2)
    second = batch_outcome.compile_batch_outcome(ledger, corpus, tmp_path / "out")

    assert second["reused"] is False
    assert first["outcome"]["audit_id"] != second["outcome"]["audit_id"]
    assert second["outcome"]["items"][0]["review_assignment"]["lane"] == "bounded_human_exception"


def test_human_candidate_beyond_limit_is_deferred_not_ai_managed(tmp_path):
    corpus = tmp_path / "corpus"
    for doc_id, claim in (("d1", "Alpha claim 10%"), ("d2", "Zulu claim 20%")):
        doc = _doc(corpus, doc_id, tier=3)
        _write(doc / "enrichment.json", {
            "statistical_claims": [{"claim": claim, "source_cited": "Source table"}],
        })
    ledger = _ledger(tmp_path / "ledger.json", [
        {"item_id": "i1", "doc_id": "d1", "status": "succeeded"},
        {"item_id": "i2", "doc_id": "d2", "status": "succeeded"},
    ])
    policy = dict(batch_outcome.DEFAULT_POLICY)
    policy["policy_version"] = "one-human-group"
    policy["review_group_limit"] = 1
    policy_path = tmp_path / "policy.json"
    _write(policy_path, policy)

    outcome = batch_outcome.compile_batch_outcome(
        ledger, corpus, tmp_path / "out", policy_path=policy_path,
    )["outcome"]

    lanes = {row["review_assignment"]["lane"] for row in outcome["items"]}
    assert lanes == {"bounded_human_exception", "deferred_human_exception"}


def test_workflow_bound_compiler_accounts_for_linked_held_and_deferred_rows(tmp_path):
    corpus, workflow, dispatch = _workflow_bundle(tmp_path)

    result = batch_outcome.compile_workflow_batch_outcome(
        workflow, dispatch, corpus, tmp_path / "out",
    )
    outcome = result["outcome"]

    assert outcome["schema_version"] == batch_outcome.BOUND_SCHEMA_VERSION
    assert outcome["input_kind"] == "workflow_projection"
    assert outcome["workflow_binding"] == batch_outcome.workflow_binding(
        workflow, dispatch, corpus_dir=corpus,
    )
    assert outcome["summary"]["expected_items"] == 3
    assert outcome["summary"]["accounted_for"] == 3
    assert [row["item_id"] for row in outcome["items"]] == [
        row["queue_item_id"] for row in workflow["items"]
    ]
    assert [row["primary_outcome"] for row in outcome["items"]] == [
        "ordinary_ready", "deferred", "deferred",
    ]
    batch_outcome.validate_batch_outcome(
        outcome, workflow=workflow, dispatch=dispatch, corpus_dir=corpus,
        require_bound=True,
    )
    route = json.loads(result["route_plan_path"].read_text(encoding="utf-8"))
    assert route["workflow_binding"] == outcome["workflow_binding"]
    assert route["outcome_content_fingerprint"] == outcome["content_fingerprint"]


def test_workflow_bound_reaudit_reuses_immutable_input_and_outcome(tmp_path):
    corpus, workflow, dispatch = _workflow_bundle(tmp_path)
    first = batch_outcome.compile_workflow_batch_outcome(
        workflow, dispatch, corpus, tmp_path / "out",
    )
    second = batch_outcome.compile_workflow_batch_outcome(
        workflow, dispatch, corpus, tmp_path / "out",
    )

    assert first["outcome_path"] == second["outcome_path"]
    assert first["workflow_input_path"] == second["workflow_input_path"]
    assert second["reused"] is True


def test_bound_outcome_content_or_binding_tamper_fails_validation(tmp_path):
    corpus, workflow, dispatch = _workflow_bundle(tmp_path)
    outcome = batch_outcome.compile_workflow_batch_outcome(
        workflow, dispatch, corpus, tmp_path / "out",
    )["outcome"]

    changed = json.loads(json.dumps(outcome))
    changed["items"][0]["primary_outcome"] = "pipeline_exception"
    with pytest.raises(ValueError, match="content fingerprint"):
        batch_outcome.validate_batch_outcome(changed, require_bound=True)

    changed = json.loads(json.dumps(outcome))
    changed["workflow_binding"]["dispatch_fingerprint"] = "0" * 64
    with pytest.raises(ValueError, match="content fingerprint|supplied workflow"):
        batch_outcome.validate_batch_outcome(
            changed, workflow=workflow, dispatch=dispatch, corpus_dir=corpus,
            require_bound=True,
        )


def test_legacy_compilation_stays_unbound_v21(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    ledger = _ledger(tmp_path / "ledger.json", [
        {"item_id": "i1", "doc_id": "d1", "status": "succeeded"},
    ])
    outcome = batch_outcome.compile_batch_outcome(
        ledger, corpus, tmp_path / "out",
    )["outcome"]
    assert outcome["schema_version"] == batch_outcome.SCHEMA_VERSION
    assert "workflow_binding" not in outcome
    assert "content_fingerprint" not in outcome
    batch_outcome.validate_batch_outcome(outcome)


def test_bound_compiler_refuses_duplicate_frozen_document_links(tmp_path):
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    _doc(corpus, "d1")
    db = open_db(queue_db_path(corpus))
    first = add_item(db, "https://example.org/first")
    second = add_item(db, "https://example.org/second")
    for item in (first, second):
        apply_triage_result(db, item.id, _triage(), model_name="triage-model")
        db.execute("UPDATE source_queue SET corpus_doc_id=? WHERE id=?", ("d1", item.id))
    db.commit()
    workflow = plan_workflow_batch(
        db, workflow_batch_id="duplicate-doc-workflow",
        selected_item_ids=[first.id, second.id], limit=2,
    )
    dispatch = build_dispatch_plan(workflow, corpus)

    with pytest.raises(ValueError, match="more than once"):
        batch_outcome.compile_workflow_batch_outcome(
            workflow, dispatch, corpus, tmp_path / "out",
        )


def test_bound_compiler_refuses_tampered_existing_immutable_snapshot(tmp_path):
    corpus, workflow, dispatch = _workflow_bundle(tmp_path)
    result = batch_outcome.compile_workflow_batch_outcome(
        workflow, dispatch, corpus, tmp_path / "out",
    )
    payload = json.loads(result["outcome_path"].read_text())
    payload["items"][0]["primary_outcome"] = "pipeline_exception"
    _write(result["outcome_path"], payload)

    with pytest.raises(ValueError, match="content fingerprint"):
        batch_outcome.compile_workflow_batch_outcome(
            workflow, dispatch, corpus, tmp_path / "out",
        )
    assert json.loads(result["outcome_path"].read_text())["items"][0]["primary_outcome"] == "pipeline_exception"


def test_compiler_refuses_symlinked_input_without_touching_target(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    ledger = _ledger(tmp_path / "ledger.json", [
        {"item_id": "i1", "doc_id": "d1", "status": "succeeded"},
    ])
    before = ledger.read_bytes()
    linked = tmp_path / "ledger-link.json"
    linked.symlink_to(ledger)

    with pytest.raises(ValueError, match="safe regular file"):
        batch_outcome.compile_batch_outcome(linked, corpus, tmp_path / "out")
    assert ledger.read_bytes() == before


def test_direct_bound_entry_refuses_rehashed_forged_workflow_item(tmp_path):
    corpus, workflow, dispatch = _workflow_bundle(tmp_path)
    payload = batch_outcome.build_workflow_outcome_input(workflow, dispatch, corpus)
    payload["items"][0]["doc_id"] = "forged-doc"
    payload["evidence_fingerprint"] = batch_outcome.canonical_fingerprint(
        batch_outcome._workflow_input_stable(payload)
    )
    path = tmp_path / "forged-workflow-input.json"
    _write(path, payload)

    with pytest.raises(ValueError, match="document identity"):
        batch_outcome.compile_batch_outcome(
            path, corpus, tmp_path / "out", workflow=workflow, dispatch=dispatch,
        )


def test_bound_compiler_refuses_tampered_immutable_route_plan(tmp_path):
    corpus, workflow, dispatch = _workflow_bundle(tmp_path)
    result = batch_outcome.compile_workflow_batch_outcome(
        workflow, dispatch, corpus, tmp_path / "out",
    )
    route = json.loads(result["route_plan_path"].read_text())
    route["routes"][0]["primary_outcome"] = "forged-route"
    _write(result["route_plan_path"], route)

    with pytest.raises(ValueError, match="route-plan accounting|content fingerprint"):
        batch_outcome.compile_workflow_batch_outcome(
            workflow, dispatch, corpus, tmp_path / "out",
        )
    assert json.loads(result["route_plan_path"].read_text())["routes"][0]["primary_outcome"] == "forged-route"


def test_bound_compiler_refuses_tampered_immutable_markdown(tmp_path):
    corpus, workflow, dispatch = _workflow_bundle(tmp_path)
    result = batch_outcome.compile_workflow_batch_outcome(
        workflow, dispatch, corpus, tmp_path / "out",
    )
    result["markdown_path"].write_text("TAMPERED", encoding="utf-8")

    with pytest.raises(ValueError, match="Markdown differs"):
        batch_outcome.compile_workflow_batch_outcome(
            workflow, dispatch, corpus, tmp_path / "out",
        )


@pytest.mark.parametrize("artifact_name", ["route_plan_path", "markdown_path"])
def test_bound_compiler_refuses_symlinked_immutable_siblings(tmp_path, artifact_name):
    corpus, workflow, dispatch = _workflow_bundle(tmp_path)
    result = batch_outcome.compile_workflow_batch_outcome(
        workflow, dispatch, corpus, tmp_path / "out",
    )
    path = result[artifact_name]
    target = tmp_path / f"target-{path.name}"
    target.write_bytes(path.read_bytes())
    path.unlink()
    path.symlink_to(target)

    with pytest.raises(ValueError, match="safe"):
        batch_outcome.compile_workflow_batch_outcome(
            workflow, dispatch, corpus, tmp_path / "out",
        )


def test_bound_reaudit_refuses_tampered_previous_snapshot(tmp_path):
    corpus, workflow, dispatch = _workflow_bundle(tmp_path)
    first = batch_outcome.compile_workflow_batch_outcome(
        workflow, dispatch, corpus, tmp_path / "out",
    )
    previous = json.loads(first["outcome_path"].read_text())
    previous["items"][0]["primary_outcome"] = "pipeline_exception"
    _write(first["outcome_path"], previous)
    enrichment_path = corpus / "d1" / "enrichment.json"
    enrichment = json.loads(enrichment_path.read_text())
    enrichment["lexicon_proposals"] = [{
        "action": "add_new", "term": "Changed",
        "exact_quote": "Candidate appears in this source.",
    }]
    _write(enrichment_path, enrichment)

    with pytest.raises(ValueError, match="content fingerprint"):
        batch_outcome.compile_workflow_batch_outcome(
            workflow, dispatch, corpus, tmp_path / "out",
        )
