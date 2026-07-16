import copy
import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from runner.pipeline.source_queue import add_item, apply_triage_result, open_db, queue_db_path
from runner.pipeline.specialist_dispatch import (
    build_dispatch_plan,
    dispatch_stable_projection,
    write_dispatch_plan,
)
from runner.pipeline.workflow_batch import (
    plan_workflow_batch,
    workflow_stable_projection,
    write_workflow_batch,
)
from runner.pipeline.workflow_integrity import canonical_fingerprint


def _triage(**changes):
    payload = dict(
        doc_type_hint="academic",
        recommended_llm="litelm",
        routing_reason="route",
        complexity="moderate",
        needs_book_splitting=False,
        needs_testimony_review=False,
        needs_media_review=False,
        needs_legal_review=False,
        overnight_batch_safe=True,
        suggested_process_route="standard",
        triage_succeeded=True,
    )
    payload.update(changes)
    return SimpleNamespace(**payload)


def _artifacts(tmp_path: Path, *, media: bool = True):
    corpus = tmp_path / "corpus"
    corpus.mkdir(parents=True)
    db = open_db(queue_db_path(corpus))
    item = add_item(db, "https://example.org/item")
    apply_triage_result(
        db,
        item.id,
        _triage(needs_media_review=media),
        model_name="triage-model",
    )
    workflow = plan_workflow_batch(
        db,
        workflow_batch_id="workflow-safe",
        selected_item_ids=[item.id],
    )
    dispatch = build_dispatch_plan(workflow, corpus)
    return corpus, workflow, dispatch


def _refingerprint_workflow(workflow: dict) -> None:
    workflow["evidence_fingerprint"] = canonical_fingerprint(workflow_stable_projection(workflow))


def _refingerprint_dispatch(dispatch: dict) -> None:
    dispatch["evidence_fingerprint"] = canonical_fingerprint(dispatch_stable_projection(dispatch))


@pytest.mark.parametrize(
    "unsafe_id",
    ["", ".", "..", "../escape", "/absolute", "nested/path", "nested\\path", "a" * 101],
)
def test_workflow_planner_refuses_unsafe_batch_ids(tmp_path, unsafe_id):
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    db = open_db(queue_db_path(corpus))
    item = add_item(db, "https://example.org/item")

    with pytest.raises(ValueError, match="safe"):
        plan_workflow_batch(db, workflow_batch_id=unsafe_id, selected_item_ids=[item.id])


@pytest.mark.parametrize("fingerprint", ["", "ABC", "g" * 64, "0" * 63])
def test_workflow_writer_refuses_missing_or_malformed_fingerprint(tmp_path, fingerprint):
    _, workflow, _ = _artifacts(tmp_path)
    workflow["evidence_fingerprint"] = fingerprint

    with pytest.raises(ValueError, match="fingerprint"):
        write_workflow_batch(workflow, tmp_path / "out")
    assert not (tmp_path / "out").exists()


def test_workflow_writer_refuses_tampered_stable_content(tmp_path):
    _, workflow, _ = _artifacts(tmp_path)
    workflow["items"][0]["title"] = "tampered"

    with pytest.raises(ValueError, match="does not bind"):
        write_workflow_batch(workflow, tmp_path / "out")


def test_both_writers_refuse_unsafe_batch_id_at_write_boundary(tmp_path):
    _, workflow, dispatch = _artifacts(tmp_path)
    workflow["workflow_batch_id"] = "../escape"
    _refingerprint_workflow(workflow)
    with pytest.raises(ValueError, match="safe"):
        write_workflow_batch(workflow, tmp_path / "workflow-out")

    dispatch["workflow_batch_id"] = "../escape"
    _refingerprint_dispatch(dispatch)
    with pytest.raises(ValueError, match="safe"):
        write_dispatch_plan(
            dispatch,
            tmp_path / "dispatch-out",
            workflow_manifest=workflow,
        )


@pytest.mark.parametrize("fingerprint", ["", "ABC", "g" * 64, "0" * 63])
def test_dispatch_writer_refuses_missing_or_malformed_fingerprint(tmp_path, fingerprint):
    _, workflow, dispatch = _artifacts(tmp_path)
    dispatch["evidence_fingerprint"] = fingerprint

    with pytest.raises(ValueError, match="fingerprint"):
        write_dispatch_plan(dispatch, tmp_path / "out", workflow_manifest=workflow)
    assert not (tmp_path / "out").exists()


def test_workflow_writer_refuses_duplicate_ids_and_selection_mismatch(tmp_path):
    _, workflow, _ = _artifacts(tmp_path)
    duplicate = copy.deepcopy(workflow["items"][0])
    workflow["items"].append(duplicate)
    workflow["selection"]["selected_queue_item_ids"].append(duplicate["queue_item_id"])
    workflow["summary"]["selected"] = 2
    workflow["summary"]["attended_base"] = 2
    workflow["summary"]["specialist_routes"] = 2
    _refingerprint_workflow(workflow)

    with pytest.raises(ValueError, match="unique"):
        write_workflow_batch(workflow, tmp_path / "out")

    _, workflow, _ = _artifacts(tmp_path / "second")
    workflow["selection"]["selected_queue_item_ids"] = ["different"]
    _refingerprint_workflow(workflow)
    with pytest.raises(ValueError, match="selection IDs/order"):
        write_workflow_batch(workflow, tmp_path / "out")


@pytest.mark.parametrize(
    "summary_field",
    ["selected", "ordinary", "attended_base", "technical_hold", "deferred", "specialist_routes"],
)
def test_workflow_writer_recomputes_every_summary_count(tmp_path, summary_field):
    _, workflow, _ = _artifacts(tmp_path)
    workflow["summary"][summary_field] += 1

    with pytest.raises(ValueError, match="summary"):
        write_workflow_batch(workflow, tmp_path / "out")


@pytest.mark.parametrize("lookalike", [True, 1.0])
def test_workflow_summary_rejects_non_integer_lookalikes(tmp_path, lookalike):
    _, workflow, _ = _artifacts(tmp_path)
    assert workflow["summary"]["selected"] == lookalike
    workflow["summary"]["selected"] = lookalike

    with pytest.raises(ValueError, match="summary"):
        write_workflow_batch(workflow, tmp_path / "out")


def test_workflow_timestamp_only_replay_reuses_original_snapshot(tmp_path):
    _, workflow, _ = _artifacts(tmp_path)
    out = tmp_path / "out"
    path = write_workflow_batch(workflow, out)
    original = path.read_bytes()
    original_timestamp = workflow["generated_at"]

    replay = copy.deepcopy(workflow)
    replay["generated_at"] = "2099-01-01T00:00:00+00:00"
    assert write_workflow_batch(replay, out) == path

    assert path.read_bytes() == original
    latest = json.loads((out / "workflow-safe" / "latest_workflow_batch.json").read_text())
    assert latest["generated_at"] == original_timestamp


def test_workflow_collision_does_not_change_latest_pointer(tmp_path):
    _, workflow, _ = _artifacts(tmp_path)
    out = tmp_path / "out"
    path = write_workflow_batch(workflow, out)
    latest_path = out / "workflow-safe" / "latest_workflow_batch.json"
    latest_before = latest_path.read_bytes()
    path.write_text(json.dumps({"different": True}), encoding="utf-8")

    with pytest.raises(ValueError, match="collision"):
        write_workflow_batch(workflow, out)
    assert latest_path.read_bytes() == latest_before


def test_dispatch_builder_refuses_tampered_workflow(tmp_path):
    corpus, workflow, _ = _artifacts(tmp_path)
    workflow["items"][0]["title"] = "tampered"

    with pytest.raises(ValueError, match="does not bind"):
        build_dispatch_plan(workflow, corpus)


def test_deferred_settled_item_is_never_routed_back_to_base_processing(tmp_path):
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    db = open_db(queue_db_path(corpus))
    item = add_item(db, "https://example.org/settled")
    apply_triage_result(db, item.id, _triage(), model_name="triage-model")
    db.execute("UPDATE source_queue SET status='ingested' WHERE id=?", (item.id,))
    db.commit()
    workflow = plan_workflow_batch(
        db,
        workflow_batch_id="workflow-settled",
        selected_item_ids=[item.id],
    )

    dispatch = build_dispatch_plan(workflow, corpus)

    assert workflow["items"][0]["base_route"] == "deferred"
    assert dispatch["items"][0]["next_action"] == "leave_settled"


@pytest.mark.parametrize("field", ["doc_id", "next_action", "base_status"])
def test_dispatch_writer_rechecks_document_and_derived_state(tmp_path, field):
    corpus, workflow, dispatch = _artifacts(tmp_path)
    if field == "doc_id":
        dispatch["items"][0][field] = "different-doc"
    elif field == "next_action":
        dispatch["items"][0][field] = "compile_outcome"
    else:
        dispatch["items"][0][field] = "already_processed"
    _refingerprint_dispatch(dispatch)

    with pytest.raises(ValueError, match="document identity|next action|base status"):
        write_dispatch_plan(
            dispatch,
            tmp_path / "out",
            workflow_manifest=workflow,
            corpus_dir=corpus,
        )


def test_derived_second_opinion_requires_current_corpus_evidence(tmp_path):
    corpus, workflow, dispatch = _artifacts(tmp_path, media=False)
    derived = {
        "route": "second_opinion",
        "status": "pending",
        "prerequisites": ["analysis.json"],
        "commands": [],
        "planned_after_base": [],
    }
    dispatch["items"][0]["specialists"] = [derived]
    dispatch["items"][0]["next_action"] = "run_existing_base_pipeline"
    dispatch["summary"]["specialist_routes"] = 1
    _refingerprint_dispatch(dispatch)

    with pytest.raises(ValueError, match="needs_review evidence"):
        write_dispatch_plan(
            dispatch,
            tmp_path / "out",
            workflow_manifest=workflow,
            corpus_dir=corpus,
        )


@pytest.mark.parametrize("mutation", ["base", "missing_route", "extra_route", "duplicate_route"])
def test_dispatch_writer_rejects_route_or_binding_inconsistency(tmp_path, mutation):
    _, workflow, dispatch = _artifacts(tmp_path)
    if mutation == "base":
        dispatch["items"][0]["base_route"] = "ordinary"
    elif mutation == "missing_route":
        dispatch["items"][0]["specialists"] = []
        dispatch["summary"]["specialist_routes"] = 0
        dispatch["summary"]["blocked_or_human"] = 0
    elif mutation == "extra_route":
        extra = copy.deepcopy(dispatch["items"][0]["specialists"][0])
        extra["route"] = "legal"
        dispatch["items"][0]["specialists"].append(extra)
        dispatch["summary"]["specialist_routes"] = 2
        dispatch["summary"]["blocked_or_human"] = sum(
            plan.get("status") in {"blocked", "invalid", "stale", "human_required", "waiting_for_base_processing"}
            for plan in dispatch["items"][0]["specialists"]
        )
    else:
        dispatch["items"][0]["specialists"].append(
            copy.deepcopy(dispatch["items"][0]["specialists"][0])
        )
        dispatch["summary"]["specialist_routes"] = 2
        dispatch["summary"]["blocked_or_human"] = sum(
            plan.get("status") in {"blocked", "invalid", "stale", "human_required", "waiting_for_base_processing"}
            for plan in dispatch["items"][0]["specialists"]
        )
    _refingerprint_dispatch(dispatch)

    with pytest.raises(ValueError, match="base route|specialist routes"):
        write_dispatch_plan(
            dispatch,
            tmp_path / "out",
            workflow_manifest=workflow,
        )


@pytest.mark.parametrize("summary_field", ["items", "specialist_routes", "blocked_or_human"])
def test_dispatch_writer_recomputes_every_summary_count(tmp_path, summary_field):
    _, workflow, dispatch = _artifacts(tmp_path)
    dispatch["summary"][summary_field] += 1
    _refingerprint_dispatch(dispatch)

    with pytest.raises(ValueError, match="summary"):
        write_dispatch_plan(dispatch, tmp_path / "out", workflow_manifest=workflow)


@pytest.mark.parametrize("lookalike", [True, 1.0])
def test_dispatch_summary_rejects_non_integer_lookalikes(tmp_path, lookalike):
    _, workflow, dispatch = _artifacts(tmp_path)
    assert dispatch["summary"]["items"] == lookalike
    dispatch["summary"]["items"] = lookalike
    _refingerprint_dispatch(dispatch)

    with pytest.raises(ValueError, match="summary"):
        write_dispatch_plan(dispatch, tmp_path / "out", workflow_manifest=workflow)


def test_dispatch_timestamp_replay_and_collision_are_fail_closed(tmp_path):
    _, workflow, dispatch = _artifacts(tmp_path)
    out = tmp_path / "out"
    path = write_dispatch_plan(dispatch, out, workflow_manifest=workflow)
    original = path.read_bytes()
    replay = copy.deepcopy(dispatch)
    replay["generated_at"] = "2099-01-01T00:00:00+00:00"

    assert write_dispatch_plan(replay, out, workflow_manifest=workflow) == path
    assert path.read_bytes() == original
    latest_path = out / "workflow-safe" / "latest_specialist_dispatch.json"
    latest_before = latest_path.read_bytes()
    path.write_text(json.dumps({"different": True}), encoding="utf-8")

    with pytest.raises(ValueError, match="collision"):
        write_dispatch_plan(dispatch, out, workflow_manifest=workflow)
    assert latest_path.read_bytes() == latest_before


def test_malformed_existing_snapshot_is_refused_without_repointing_latest(tmp_path):
    _, workflow, _ = _artifacts(tmp_path)
    out = tmp_path / "out"
    path = write_workflow_batch(workflow, out)
    latest_path = out / "workflow-safe" / "latest_workflow_batch.json"
    latest_before = latest_path.read_bytes()
    path.write_text("{not-json", encoding="utf-8")

    with pytest.raises(ValueError, match="malformed"):
        write_workflow_batch(workflow, out)
    assert latest_path.read_bytes() == latest_before
