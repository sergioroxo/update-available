import copy
import json
import os
import sqlite3
from pathlib import Path
from types import SimpleNamespace

import pytest
from typer.testing import CliRunner

from runner.pipeline import workflow_attempts
from runner import main
from runner.pipeline.source_queue import add_item, apply_triage_result, open_db, queue_db_path
from runner.pipeline.specialist_dispatch import build_dispatch_plan
from runner.pipeline.workflow_attempts import (
    ALLOWED_COMMANDS,
    build_attempt_plan,
    list_attempts,
    open_attempt_ledger,
    persist_attempt_plan,
    reconcile_attempt_plan,
    validate_attempt_plan,
    validate_attempt_plan_against_bundle,
    write_attempt_plan,
)
from runner.pipeline.workflow_batch import plan_workflow_batch
from runner.pipeline.workflow_attestation import build_workflow_attestation
from runner.pipeline.workflow_integrity import canonical_fingerprint
from runner.pipeline.testimony_candidates import build_testimony_candidates


def _triage(**changes):
    payload = dict(
        doc_type_hint="academic", recommended_llm="litelm", routing_reason="route",
        complexity="moderate", needs_book_splitting=False,
        needs_testimony_review=False, needs_media_review=False,
        needs_legal_review=False, overnight_batch_safe=True,
        suggested_process_route="standard", triage_succeeded=True,
    )
    payload.update(changes)
    return SimpleNamespace(**payload)


def _write(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _bundle(tmp_path: Path, *, longform_doc_id: str = ""):
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    db = open_db(queue_db_path(corpus))
    definitions = [
        ("ordinary", {}, "doc-ordinary"),
        ("media", {"needs_media_review": True, "overnight_batch_safe": False}, "doc-media"),
        ("testimony", {"needs_testimony_review": True, "overnight_batch_safe": False}, "doc-testimony"),
        ("legal", {"needs_legal_review": True, "overnight_batch_safe": False}, "doc-legal"),
        ("longform", {"needs_book_splitting": True, "overnight_batch_safe": False}, longform_doc_id),
    ]
    ids = []
    for name, flags, doc_id in definitions:
        item = add_item(db, f"https://example.org/{name}")
        apply_triage_result(db, item.id, _triage(**flags), model_name="triage-model")
        if doc_id:
            db.execute("UPDATE source_queue SET corpus_doc_id=? WHERE id=?", (doc_id, item.id))
        ids.append(item.id)
    db.commit()
    (corpus / "doc-ordinary").mkdir()
    _write(corpus / "doc-media" / "intake.json", {"source": "media"})
    _write(corpus / "doc-media" / "media_metadata.json", {"duration": 10})
    _write(corpus / "doc-testimony" / "analysis.json", {
        "testimony_flag": True,
        "summary": "A clinical case story is used as testimony of change.",
    })
    _write(corpus / "doc-legal" / "analysis.json", {"type": "Legal-Instrument"})
    _write(corpus / "doc-legal" / "intake.json", {"source": "law"})
    if longform_doc_id:
        _write(corpus / longform_doc_id / "analysis.json", {"type": "Report"})
        (corpus / longform_doc_id / "extracted.txt").write_text("Longform source text", encoding="utf-8")

    workflow = plan_workflow_batch(
        db,
        workflow_batch_id="attempt-fixture",
        selected_item_ids=ids,
    )
    dispatch = build_dispatch_plan(workflow, corpus)
    attestation = build_workflow_attestation(workflow, dispatch, corpus)
    return corpus, workflow, dispatch, attestation


def _plan(tmp_path: Path, **kwargs):
    corpus, workflow, dispatch, attestation = _bundle(tmp_path)
    plan = build_attempt_plan(workflow, dispatch, attestation, corpus, **kwargs)
    return corpus, workflow, dispatch, attestation, plan


def _refingerprint(plan: dict) -> None:
    plan["evidence_fingerprint"] = canonical_fingerprint(workflow_attempts._plan_stable(plan))


def test_attempt_plan_accounts_for_runnable_human_held_and_satisfied_states(tmp_path):
    _, _, _, _, plan = _plan(tmp_path)

    assert plan["planner_only"] is True
    assert plan["execution_authorized"] is False
    assert plan["remote_writes"] is False
    assert plan["summary"] == {
        "rows": 10,
        "held_prerequisite": 3,
        "human_required": 1,
        "planned_not_authorized": 2,
        "satisfied": 4,
        "settled": 0,
    }
    commands = [row["command"] for row in plan["rows"] if row["command"]]
    assert {command[3] for command in commands} == {
        "media-report", "testimony-candidates-build",
    }
    assert all(row["execution_authorized"] is False for row in plan["rows"])
    assert all(row["lease_acquired"] is False for row in plan["rows"])


@pytest.mark.parametrize("mode", ["retry_failed", "resume_interrupted"])
def test_retry_and_resume_have_no_eligible_rows_before_execution_exists(tmp_path, mode):
    _, _, _, _, plan = _plan(tmp_path, mode=mode)

    assert plan["rows"] == []
    assert plan["summary"]["rows"] == 0
    assert plan["request"]["no_eligible_reason"] == "planner_only_has_no_execution_events"


def test_run_selected_is_subset_bound_and_workflow_ordered(tmp_path):
    corpus, workflow, dispatch, attestation = _bundle(tmp_path)
    selected = [workflow["items"][2]["queue_item_id"], workflow["items"][0]["queue_item_id"]]
    plan = build_attempt_plan(
        workflow, dispatch, attestation, corpus,
        mode="run_selected", selected_item_ids=selected,
    )

    assert plan["request"]["selected_queue_item_ids"] == [
        workflow["items"][0]["queue_item_id"], workflow["items"][2]["queue_item_id"],
    ]
    assert {row["queue_item_id"] for row in plan["rows"]} == set(selected)


def test_selected_later_stage_preserves_its_required_route_sequence(tmp_path):
    _, _, _, _, plan = _plan(tmp_path, selected_stages=["testimony-deep-review", "local_base"])

    assert plan["request"]["selected_stages"] == ["local_base", "testimony-deep-review"]
    assert {row["stage"] for row in plan["rows"]} == {
        "local_base", "testimony-candidates-build", "testimony-deep-review",
    }
    testimony = [row for row in plan["rows"] if row["route"] == "testimony"]
    assert [row["route_sequence"] for row in testimony] == [1, 2]
    assert testimony[0]["depends_on_attempt_ids"] == []
    assert testimony[1]["depends_on_attempt_ids"] == [testimony[0]["attempt_id"]]
    assert testimony[1]["stage_input_status"] == "pending_dependency"
    assert testimony[1]["stage_input_fingerprint"] == ""


def test_specialist_route_filter_selects_all_runnable_route_commands(tmp_path):
    _, _, _, _, plan = _plan(tmp_path, selected_stages=["specialist:testimony"])

    assert {row["stage"] for row in plan["rows"]} == {
        "testimony-candidates-build", "testimony-deep-review",
    }


def test_planned_stage_inputs_bind_actual_local_files_and_detect_change(tmp_path):
    corpus, workflow, dispatch, attestation, plan = _plan(tmp_path)
    row = next(value for value in plan["rows"] if value["stage"] == "media-report")

    assert row["stage_input_status"] == "captured"
    assert {value["name"] for value in row["stage_input_evidence"]} == {"media_metadata.json"}
    (corpus / "doc-media" / "media_metadata.json").write_text(
        '{"duration":10,"research_note":"changed"}', encoding="utf-8",
    )
    with pytest.raises(ValueError, match="current workflow bundle|current corpus state"):
        validate_attempt_plan_against_bundle(plan, workflow, dispatch, attestation, corpus)


def test_request_scoped_hash_cache_reuses_only_unchanged_file_identity(tmp_path):
    corpus, _, _, _ = _bundle(tmp_path)
    cache = {}
    first, evidence = workflow_attempts._stage_input_snapshot(
        corpus, "doc-media", "media-report", hash_cache=cache,
    )
    second, repeated = workflow_attempts._stage_input_snapshot(
        corpus, "doc-media", "media-report", hash_cache=cache,
    )
    assert first == second
    assert evidence == repeated
    assert len(cache) == 1

    path = corpus / "doc-media" / "media_metadata.json"
    old_mtime = path.stat().st_mtime_ns
    path.write_text('{"duration":11}', encoding="utf-8")
    os.utime(path, ns=(old_mtime, old_mtime))
    changed, _ = workflow_attempts._stage_input_snapshot(
        corpus, "doc-media", "media-report", hash_cache=cache,
    )
    assert changed != first
    assert len(cache) == 2


def test_replan_after_first_stage_captures_new_inputs_for_second_stage(tmp_path):
    corpus, workflow, _, _ = _bundle(tmp_path)
    _write(
        corpus / "doc-testimony" / "testimony_candidates.json",
        build_testimony_candidates(corpus / "doc-testimony"),
    )
    dispatch = build_dispatch_plan(workflow, corpus)
    attestation = build_workflow_attestation(workflow, dispatch, corpus)
    plan = build_attempt_plan(
        workflow, dispatch, attestation, corpus, selected_stages=["specialist:testimony"],
    )
    testimony = [row for row in plan["rows"] if row["route"] == "testimony"]

    assert [row["disposition"] for row in testimony] == ["satisfied", "planned_not_authorized"]
    assert testimony[0]["command"] == []
    assert testimony[1]["command"][3] == "testimony-deep-review"
    assert testimony[1]["depends_on_attempt_ids"] == [testimony[0]["attempt_id"]]
    assert {value["name"] for value in testimony[1]["stage_input_evidence"]} >= {
        "testimony_candidates.json",
    }


def test_invalid_prerequisite_artifact_is_not_treated_as_satisfied(tmp_path):
    corpus, workflow, _, _ = _bundle(tmp_path)
    _write(corpus / "doc-testimony" / "testimony_candidates.json", {"candidates": "invalid"})
    dispatch = build_dispatch_plan(workflow, corpus)
    attestation = build_workflow_attestation(workflow, dispatch, corpus)
    plan = build_attempt_plan(
        workflow, dispatch, attestation, corpus, selected_stages=["specialist:testimony"],
    )
    testimony = [row for row in plan["rows"] if row["route"] == "testimony"]

    assert [row["disposition"] for row in testimony] == [
        "planned_not_authorized", "held_prerequisite",
    ]


def test_publicly_enabled_candidate_sidecar_is_not_treated_as_satisfied(tmp_path):
    corpus, workflow, _, _ = _bundle(tmp_path)
    payload = build_testimony_candidates(corpus / "doc-testimony")
    if not payload["candidates"]:
        payload["candidates"] = [{
            "candidate_id": "candidate-unsafe", "doc_id": "doc-testimony",
            "review_state": "model_proposed",
            "public": {
                "public_display": True,
                "public_readiness": "private_review_required",
                "requires_researcher_review": True,
            },
        }]
        payload["candidate_count"] = 1
    else:
        payload["candidates"][0]["public"]["public_display"] = True
    _write(corpus / "doc-testimony" / "testimony_candidates.json", payload)
    dispatch = build_dispatch_plan(workflow, corpus)
    attestation = build_workflow_attestation(workflow, dispatch, corpus)
    plan = build_attempt_plan(
        workflow, dispatch, attestation, corpus, selected_stages=["specialist:testimony"],
    )
    testimony = [row for row in plan["rows"] if row["route"] == "testimony"]
    assert [row["disposition"] for row in testimony] == [
        "planned_not_authorized", "held_prerequisite",
    ]


def test_structurally_valid_but_stale_candidates_are_replanned(tmp_path):
    corpus, workflow, _, _ = _bundle(tmp_path)
    candidates_path = corpus / "doc-testimony" / "testimony_candidates.json"
    _write(candidates_path, build_testimony_candidates(corpus / "doc-testimony"))
    analysis_path = corpus / "doc-testimony" / "analysis.json"
    newer = candidates_path.stat().st_mtime_ns + 2_000_000_000
    os.utime(analysis_path, ns=(newer, newer))
    dispatch = build_dispatch_plan(workflow, corpus)
    attestation = build_workflow_attestation(workflow, dispatch, corpus)
    plan = build_attempt_plan(
        workflow, dispatch, attestation, corpus, selected_stages=["specialist:testimony"],
    )
    testimony = [row for row in plan["rows"] if row["route"] == "testimony"]

    assert [row["disposition"] for row in testimony] == [
        "planned_not_authorized", "held_prerequisite",
    ]


def test_valid_builder_with_invalid_downstream_plans_downstream_repair(tmp_path):
    corpus, workflow, _, _ = _bundle(tmp_path)
    _write(
        corpus / "doc-testimony" / "testimony_candidates.json",
        build_testimony_candidates(corpus / "doc-testimony"),
    )
    (corpus / "doc-testimony" / "testimony_segment_analyses.jsonl").write_text(
        "{malformed\n", encoding="utf-8",
    )
    dispatch = build_dispatch_plan(workflow, corpus)
    testimony_dispatch = next(
        value for row in dispatch["items"] if row["doc_id"] == "doc-testimony"
        for value in row["specialists"] if value["route"] == "testimony"
    )
    assert testimony_dispatch["status"] == "invalid"
    attestation = build_workflow_attestation(workflow, dispatch, corpus)
    plan = build_attempt_plan(
        workflow, dispatch, attestation, corpus, selected_stages=["specialist:testimony"],
    )
    testimony = [row for row in plan["rows"] if row["route"] == "testimony"]

    assert [row["disposition"] for row in testimony] == [
        "satisfied", "planned_not_authorized",
    ]
    assert testimony[1]["command"][3] == "testimony-deep-review"


def test_structurally_valid_but_stale_longform_build_is_replanned(tmp_path):
    doc_id = "doc-longform"
    corpus, workflow, _, _ = _bundle(tmp_path, longform_doc_id=doc_id)
    doc_dir = corpus / doc_id
    for name in ("longform_source.json", "bibliographic.json", "longform_quality.json"):
        _write(doc_dir / name, {"doc_id": doc_id})
    _write(doc_dir / "page_map.jsonl", {"page": 1})
    _write(doc_dir / "text_blocks.jsonl", {"block_id": "block-1", "text": "old"})
    newest_output = max((doc_dir / name).stat().st_mtime_ns for name in workflow_attempts.STAGE_COMPLETION_FILES["longform-build"])
    newer = newest_output + 2_000_000_000
    os.utime(doc_dir / "extracted.txt", ns=(newer, newer))
    dispatch = build_dispatch_plan(workflow, corpus)
    attestation = build_workflow_attestation(workflow, dispatch, corpus)
    plan = build_attempt_plan(
        workflow, dispatch, attestation, corpus, selected_stages=["specialist:longform"],
    )
    longform = [row for row in plan["rows"] if row["route"] == "longform"]

    assert [row["disposition"] for row in longform] == [
        "planned_not_authorized", "held_prerequisite",
    ]


def test_bundle_tampering_and_current_corpus_drift_fail_closed(tmp_path):
    corpus, workflow, dispatch, attestation, plan = _plan(tmp_path)
    tampered = copy.deepcopy(workflow)
    tampered["items"][0]["title"] = "tampered"
    with pytest.raises(ValueError, match="fingerprint"):
        validate_attempt_plan_against_bundle(plan, tampered, dispatch, attestation, corpus)

    (corpus / "doc-media" / "media_metadata.json").write_text("{broken", encoding="utf-8")
    with pytest.raises(ValueError, match="current corpus state"):
        validate_attempt_plan_against_bundle(plan, workflow, dispatch, attestation, corpus)


@pytest.mark.parametrize(
    "command",
    [
        [".venv/bin/python", "-m", "runner.main", "upload-doc", "doc-media"],
        ["python", "-m", "runner.main", "media-report", "doc-media"],
        [".venv/bin/python", "-m", "runner.main", "media-report", "../escape"],
        [".venv/bin/python", "-m", "runner.main", "batch-run", "doc-media"],
    ],
)
def test_self_consistent_unsupported_commands_are_still_refused(tmp_path, command):
    _, _, _, _, plan = _plan(tmp_path)
    row = next(value for value in plan["rows"] if value["disposition"] == "planned_not_authorized")
    row["command"] = command
    row["command_fingerprint"] = canonical_fingerprint(command)
    row["stage"] = command[3]
    intent = {
        "request_key": row["request_key"], "queue_item_id": row["queue_item_id"],
        "doc_id": row["doc_id"], "stage": row["stage"], "route": row["route"],
        "disposition": row["disposition"], "command": row["command"],
        "item_ordinal": row["item_ordinal"],
        "route_sequence": row["route_sequence"],
        "depends_on_attempt_ids": row["depends_on_attempt_ids"],
        "proposal_input_fingerprint": row["proposal_input_fingerprint"],
        "stage_input_status": row["stage_input_status"],
        "stage_input_fingerprint": row["stage_input_fingerprint"],
        "stage_input_evidence": row["stage_input_evidence"],
        "workflow_fingerprint": row["workflow_fingerprint"],
        "dispatch_fingerprint": row["dispatch_fingerprint"],
        "attestation_fingerprint": row["attestation_fingerprint"],
    }
    row["intent_key"] = canonical_fingerprint(intent)
    row["attempt_id"] = f"attempt-{row['intent_key'][:24]}"
    row["log_path"] = f"logs/{row['attempt_id']}.log"
    _refingerprint(plan)

    with pytest.raises(ValueError, match="allowlisted|safe|identity"):
        validate_attempt_plan(plan)


def test_self_consistent_invented_row_is_refused_against_bundle(tmp_path):
    corpus, workflow, dispatch, attestation, plan = _plan(tmp_path)
    invented = copy.deepcopy(plan)
    invented["rows"][0]["reason"] = "invented reason"
    _refingerprint(invented)

    with pytest.raises(ValueError, match="current workflow bundle"):
        validate_attempt_plan_against_bundle(invented, workflow, dispatch, attestation, corpus)


def test_immutable_plan_replay_preserves_first_timestamp_and_refuses_collision(tmp_path):
    corpus, workflow, dispatch, attestation, plan = _plan(tmp_path)
    out = tmp_path / "out"
    path = write_attempt_plan(
        plan, out, workflow=workflow, dispatch=dispatch, attestation=attestation, corpus_dir=corpus,
    )
    original = path.read_bytes()
    replay = copy.deepcopy(plan)
    replay["generated_at"] = "2099-01-01T00:00:00+00:00"
    assert write_attempt_plan(
        replay, out, workflow=workflow, dispatch=dispatch, attestation=attestation, corpus_dir=corpus,
    ) == path
    assert path.read_bytes() == original
    latest = out / "attempt-fixture" / "latest_workflow_attempt_plan.json"
    latest_before = latest.read_bytes()
    path.write_text(json.dumps({"different": True}), encoding="utf-8")
    with pytest.raises(ValueError, match="collision"):
        write_attempt_plan(
            plan, out, workflow=workflow, dispatch=dispatch, attestation=attestation, corpus_dir=corpus,
        )
    assert latest.read_bytes() == latest_before


def test_persistence_is_append_only_idempotent_and_restart_reconcilable(tmp_path):
    corpus, workflow, dispatch, attestation, plan = _plan(tmp_path)
    ledger = tmp_path / "ledger.sqlite3"
    kwargs = dict(workflow=workflow, dispatch=dispatch, attestation=attestation, corpus_dir=corpus)

    first = persist_attempt_plan(plan, ledger, **kwargs)
    second = persist_attempt_plan(plan, ledger, **kwargs)

    assert first == {
        "plan_fingerprint": plan["evidence_fingerprint"],
        "inserted": 10, "reused": 0, "events_inserted": 10,
        "execution_authorized": False,
    }
    assert second["inserted"] == 0
    assert second["reused"] == 10
    assert second["events_inserted"] == 0
    assert len(list_attempts(ledger)) == 10
    audit = reconcile_attempt_plan(plan, ledger, **kwargs)
    assert audit["consistent"] == 10
    assert audit["missing"] == []
    assert audit["inconsistent"] == []
    assert audit["unexpected"] == []
    assert audit["ok"] is True

    reopened = list_attempts(ledger)
    testimony = [row for row in reopened if row["route"] == "testimony"]
    assert [row["route_sequence"] for row in testimony] == [1, 2]
    assert testimony[1]["depends_on_attempt_ids"] == [testimony[0]["attempt_id"]]
    assert testimony[0]["stage_input_evidence"]


def test_reconciliation_reports_unexpected_intents_for_same_plan_request(tmp_path):
    corpus, workflow, dispatch, attestation, plan = _plan(tmp_path)
    ledger = tmp_path / "ledger.sqlite3"
    kwargs = dict(workflow=workflow, dispatch=dispatch, attestation=attestation, corpus_dir=corpus)
    persist_attempt_plan(plan, ledger, **kwargs)
    db = sqlite3.connect(ledger)
    db.row_factory = sqlite3.Row
    original = dict(db.execute("SELECT * FROM attempt_intents LIMIT 1").fetchone())
    original["attempt_id"] = "attempt-unexpected"
    original["intent_key"] = "f" * 64
    columns = list(original)
    db.execute(
        f"INSERT INTO attempt_intents ({','.join(columns)}) VALUES ({','.join('?' for _ in columns)})",
        [original[column] for column in columns],
    )
    db.commit()
    db.close()

    audit = reconcile_attempt_plan(plan, ledger, **kwargs)

    assert audit["unexpected"] == ["attempt-unexpected"]
    assert audit["ok"] is False


def test_reconciliation_refuses_self_hashed_extra_event_semantics(tmp_path):
    corpus, workflow, dispatch, attestation, plan = _plan(tmp_path)
    ledger = tmp_path / "ledger.sqlite3"
    kwargs = dict(workflow=workflow, dispatch=dispatch, attestation=attestation, corpus_dir=corpus)
    persist_attempt_plan(plan, ledger, **kwargs)
    attempt_id = plan["rows"][0]["attempt_id"]
    db = sqlite3.connect(ledger)
    db.row_factory = sqlite3.Row
    previous = db.execute(
        "SELECT event_fingerprint FROM attempt_events WHERE attempt_id=? AND sequence=1",
        (attempt_id,),
    ).fetchone()[0]
    payload = {
        "event_key": "e" * 64, "attempt_id": attempt_id, "sequence": 2,
        "event_type": "execution_succeeded", "disposition": "succeeded",
        "detail_json": "{}", "previous_event_fingerprint": previous,
        "recorded_at": "2026-07-13T00:00:00+00:00",
    }
    event_fingerprint = canonical_fingerprint(payload)
    db.execute(
        """INSERT INTO attempt_events
           (event_key,attempt_id,sequence,event_type,disposition,detail_json,
            previous_event_fingerprint,event_fingerprint,recorded_at)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (
            payload["event_key"], payload["attempt_id"], payload["sequence"], payload["event_type"],
            payload["disposition"], payload["detail_json"], payload["previous_event_fingerprint"],
            event_fingerprint, payload["recorded_at"],
        ),
    )
    db.commit()
    db.close()

    audit = reconcile_attempt_plan(plan, ledger, **kwargs)

    assert attempt_id in audit["inconsistent"]
    assert audit["ok"] is False
    projection = next(row for row in list_attempts(ledger) if row["attempt_id"] == attempt_id)
    assert projection["hash_chain_valid"] is True
    assert projection["event_history_valid"] is False
    assert projection["execution_state"] == "inconsistent_event_history"
    assert projection["terminal_outcome"] == ""
    assert projection["grant_recorded"] is False
    assert projection["preservation_recorded"] is False
    assert projection["execution_started_recorded"] is False
    assert projection["terminal_recorded"] is False
    assert projection["execution_run_id"] == ""
    assert projection["recovery_check_required"] is False

    with pytest.raises(ValueError, match="transition sequence"):
        persist_attempt_plan(plan, ledger, **kwargs)


def test_plan_or_request_association_mismatch_is_detected_before_reuse(tmp_path):
    corpus, workflow, dispatch, attestation, plan = _plan(tmp_path)
    ledger = tmp_path / "ledger.sqlite3"
    kwargs = dict(workflow=workflow, dispatch=dispatch, attestation=attestation, corpus_dir=corpus)
    persist_attempt_plan(plan, ledger, **kwargs)
    db = sqlite3.connect(ledger)
    db.execute("DROP TRIGGER attempt_intents_no_update")
    db.execute(
        "UPDATE attempt_intents SET request_key=? WHERE attempt_id=?",
        ("0" * 64, plan["rows"][0]["attempt_id"]),
    )
    db.commit()
    db.close()

    with pytest.raises(ValueError, match="append-only protections"):
        reconcile_attempt_plan(plan, ledger, **kwargs)
    with pytest.raises(ValueError, match="append-only protections"):
        persist_attempt_plan(plan, ledger, **kwargs)


@pytest.mark.parametrize("table", ["attempt_intents", "attempt_events"])
@pytest.mark.parametrize("operation", ["update", "delete"])
def test_direct_mutation_of_append_only_tables_is_rejected(tmp_path, table, operation):
    corpus, workflow, dispatch, attestation, plan = _plan(tmp_path)
    ledger = tmp_path / "ledger.sqlite3"
    persist_attempt_plan(
        plan, ledger, workflow=workflow, dispatch=dispatch,
        attestation=attestation, corpus_dir=corpus,
    )
    db = sqlite3.connect(ledger)
    with pytest.raises(sqlite3.IntegrityError, match="append-only"):
        if operation == "update":
            db.execute(f"UPDATE {table} SET recorded_at=recorded_at" if table == "attempt_events" else f"UPDATE {table} SET reason=reason")
        else:
            db.execute(f"DELETE FROM {table}")
    db.close()


def test_collision_rolls_back_new_rows_transactionally(tmp_path):
    corpus, workflow, dispatch, attestation, plan = _plan(tmp_path)
    ledger = tmp_path / "ledger.sqlite3"
    db = open_attempt_ledger(ledger)
    target = plan["rows"][1]
    record = workflow_attempts._intent_record(plan, target, "existing")
    record["attempt_id"] = "attempt-conflicting-key"
    columns = [row[1] for row in db.execute("PRAGMA table_info(attempt_intents)")]
    db.execute(
        f"INSERT INTO attempt_intents ({','.join(columns)}) VALUES ({','.join('?' for _ in columns)})",
        [record[column] for column in columns],
    )
    db.commit()
    db.close()

    with pytest.raises(ValueError, match="unexpected|mismatched|collided"):
        persist_attempt_plan(
            plan, ledger, workflow=workflow, dispatch=dispatch,
            attestation=attestation, corpus_dir=corpus,
        )
    db = sqlite3.connect(ledger)
    ids = {row[0] for row in db.execute("SELECT attempt_id FROM attempt_intents")}
    db.close()
    assert ids == {"attempt-conflicting-key"}


def test_module_has_no_process_execution_capability():
    source = Path(workflow_attempts.__file__).read_text(encoding="utf-8")
    assert "import subprocess" not in source
    assert "os.system" not in source
    assert "Popen(" not in source
    assert "batch-run" not in source
    assert set(ALLOWED_COMMANDS) == {
        "media-report", "testimony-candidates-build", "testimony-deep-review",
        "longform-build", "longform-review", "second-opinion",
    }


def test_planner_cli_attests_persists_lists_and_reconciles_without_execute_option(monkeypatch, tmp_path):
    corpus, workflow, dispatch, _ = _bundle(tmp_path)
    exports = tmp_path / "exports"
    config = type("Config", (), {"corpus_dir": corpus, "exports_dir": exports})()
    monkeypatch.setattr(main, "load_config", lambda **kwargs: config)
    workflow_path = tmp_path / "workflow.json"
    dispatch_path = tmp_path / "dispatch.json"
    _write(workflow_path, workflow)
    _write(dispatch_path, dispatch)
    runner = CliRunner()

    attested = runner.invoke(main.app, ["workflow-attest", str(workflow_path), str(dispatch_path)])
    assert attested.exit_code == 0, attested.stdout
    assert "not assessed or authorized" in attested.stdout
    attestation_path = next((exports / "workflow_attestations").glob("*/attestations/*.json"))

    planned = runner.invoke(main.app, [
        "workflow-attempt-plan", str(workflow_path), str(dispatch_path), str(attestation_path),
    ])
    assert planned.exit_code == 0, planned.stdout
    assert "No stored command was run" in planned.stdout
    plan_path = next((exports / "workflow_attempts").glob("*/plans/*.json"))
    ledger = exports / "workflow_attempts" / "attempts.sqlite3"
    assert ledger.is_file()

    listed = runner.invoke(main.app, ["workflow-attempt-list", "--ledger", str(ledger)])
    assert listed.exit_code == 0, listed.stdout
    assert "Read-only display" in listed.stdout
    reconciled = runner.invoke(main.app, [
        "workflow-attempt-reconcile", str(plan_path), str(workflow_path), str(dispatch_path),
        str(attestation_path), "--ledger", str(ledger),
    ])
    assert reconciled.exit_code == 0, reconciled.stdout
    assert "ok=True" in reconciled.stdout

    help_result = runner.invoke(main.app, ["workflow-attempt-plan", "--help"])
    assert help_result.exit_code == 0
    assert "--execute" not in help_result.stdout
