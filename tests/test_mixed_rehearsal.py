import json
from types import SimpleNamespace

import pytest

from runner.pipeline.mixed_rehearsal import verify_mixed_rehearsal, write_mixed_rehearsal
from runner.pipeline import mixed_rehearsal
from runner.pipeline.source_queue import add_item, apply_triage_result, open_db, queue_db_path
from runner.pipeline.specialist_dispatch import build_dispatch_plan
from runner.pipeline.workflow_batch import plan_workflow_batch


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


def _mixed(tmp_path):
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    db = open_db(queue_db_path(corpus))
    flags = [
        {}, {"needs_media_review": True}, {"needs_testimony_review": True},
        {"needs_legal_review": True}, {"needs_book_splitting": True},
    ]
    ids = []
    for index, values in enumerate(flags):
        item = add_item(db, f"https://example.org/{index}")
        apply_triage_result(db, item.id, _triage(**values), model_name="triage-model")
        ids.append(item.id)
    workflow = plan_workflow_batch(db, workflow_batch_id="mixed", selected_item_ids=ids)
    dispatch = build_dispatch_plan(workflow, corpus)
    return workflow, dispatch


def test_mixed_rehearsal_covers_all_routes_without_authorizing_execution(tmp_path):
    workflow, dispatch = _mixed(tmp_path)

    report = verify_mixed_rehearsal(workflow, dispatch)

    assert report["routing_coverage_passed"] is True
    assert all(len(report["route_items"][route]) == 1 for route in report["required_routes"])
    assert report["execution_readiness"] == "not_assessed"
    assert report["execution_authorized"] is False
    assert len(report["evidence_fingerprint"]) == 64


def test_missing_route_fails_coverage_but_remains_non_executing(tmp_path):
    workflow, dispatch = _mixed(tmp_path)

    report = verify_mixed_rehearsal(
        workflow, dispatch,
        required_routes=("ordinary", "media", "testimony", "legal", "longform", "missing"),
    )

    assert report["routing_coverage_passed"] is False
    assert any("missing" in error for error in report["errors"])
    assert report["execution_authorized"] is False


def test_mismatched_dispatch_fingerprint_is_refused(tmp_path):
    workflow, dispatch = _mixed(tmp_path)
    dispatch["workflow_fingerprint"] = "wrong"
    with pytest.raises(ValueError, match="fingerprint"):
        verify_mixed_rehearsal(workflow, dispatch)


def test_rehearsal_writes_immutable_and_latest_snapshots(tmp_path):
    workflow, dispatch = _mixed(tmp_path)
    report = verify_mixed_rehearsal(workflow, dispatch)

    path = write_mixed_rehearsal(
        report, tmp_path / "out", workflow=workflow, dispatch=dispatch
    )

    assert path.is_file()
    assert path.parent.name == "rehearsals"
    latest = tmp_path / "out" / "mixed" / "latest_mixed_rehearsal.json"
    assert json.loads(latest.read_text())["evidence_fingerprint"] == report["evidence_fingerprint"]
    original = path.read_bytes()
    changed_timestamp = {**report, "generated_at": "2099-01-01T00:00:00Z"}
    assert write_mixed_rehearsal(
        changed_timestamp,
        tmp_path / "out",
        workflow=workflow,
        dispatch=dispatch,
    ) == path
    assert path.read_bytes() == original


def test_tampered_workflow_content_is_refused(tmp_path):
    workflow, dispatch = _mixed(tmp_path)
    workflow["items"][0]["title"] = "tampered"
    with pytest.raises(ValueError, match="bind"):
        verify_mixed_rehearsal(workflow, dispatch)


def test_more_than_fifteen_is_refused_before_rehearsal(tmp_path):
    workflow, dispatch = _mixed(tmp_path)
    for index in range(11):
        source = dict(workflow["items"][0])
        source["queue_item_id"] = f"extra-{index}"
        workflow["items"].append(source)
        planned = dict(dispatch["items"][0])
        planned["queue_item_id"] = f"extra-{index}"
        dispatch["items"].append(planned)
    workflow["selection"]["selected_queue_item_ids"] = [row["queue_item_id"] for row in workflow["items"]]
    workflow["evidence_fingerprint"] = mixed_rehearsal._fingerprint(mixed_rehearsal._workflow_stable(workflow))
    dispatch["workflow_fingerprint"] = workflow["evidence_fingerprint"]
    dispatch["summary"]["items"] = len(dispatch["items"])
    dispatch["evidence_fingerprint"] = mixed_rehearsal._fingerprint(mixed_rehearsal._dispatch_stable(dispatch))

    with pytest.raises(ValueError, match="between 1 and the selected limit"):
        verify_mixed_rehearsal(workflow, dispatch)


def test_unsafe_batch_id_is_refused_for_output(tmp_path):
    workflow, dispatch = _mixed(tmp_path)
    workflow["workflow_batch_id"] = "../escape"
    dispatch["workflow_batch_id"] = "../escape"
    workflow["evidence_fingerprint"] = mixed_rehearsal._fingerprint(mixed_rehearsal._workflow_stable(workflow))
    dispatch["workflow_fingerprint"] = workflow["evidence_fingerprint"]
    dispatch["evidence_fingerprint"] = mixed_rehearsal._fingerprint(mixed_rehearsal._dispatch_stable(dispatch))
    with pytest.raises(ValueError, match="safe"):
        verify_mixed_rehearsal(workflow, dispatch)


def test_writer_refuses_report_tampered_after_verification(tmp_path):
    workflow, dispatch = _mixed(tmp_path)
    report = verify_mixed_rehearsal(workflow, dispatch)
    report["execution_authorized"] = True
    with pytest.raises(ValueError, match="cannot authorize"):
        write_mixed_rehearsal(
            report, tmp_path / "out", workflow=workflow, dispatch=dispatch
        )


def test_writer_refuses_self_consistent_report_that_claims_execution_authority(tmp_path):
    workflow, dispatch = _mixed(tmp_path)
    report = verify_mixed_rehearsal(workflow, dispatch)
    report["execution_authorized"] = True
    report["evidence_fingerprint"] = mixed_rehearsal._fingerprint(
        mixed_rehearsal._report_stable(report)
    )

    with pytest.raises(ValueError, match="cannot authorize"):
        write_mixed_rehearsal(
            report, tmp_path / "out", workflow=workflow, dispatch=dispatch
        )
    assert not (tmp_path / "out").exists()


def test_writer_refuses_self_consistent_false_claim_of_route_coverage(tmp_path):
    workflow, dispatch = _mixed(tmp_path)
    report = verify_mixed_rehearsal(workflow, dispatch)
    report["route_items"]["media"] = []
    report["route_statuses"]["media"] = []
    report["evidence_fingerprint"] = mixed_rehearsal._fingerprint(
        mixed_rehearsal._report_stable(report)
    )

    with pytest.raises(ValueError, match="non-empty evidence"):
        write_mixed_rehearsal(
            report, tmp_path / "out", workflow=workflow, dispatch=dispatch
        )
    assert not (tmp_path / "out").exists()


def test_writer_recomputes_report_from_bound_workflow_and_dispatch(tmp_path):
    workflow, dispatch = _mixed(tmp_path)
    report = verify_mixed_rehearsal(workflow, dispatch)
    report["route_items"]["media"] = ["invented-item"]
    report["route_statuses"]["media"] = [
        {"queue_item_id": "invented-item", "status": "pending", "next_action": "invented"}
    ]
    report["evidence_fingerprint"] = mixed_rehearsal._fingerprint(
        mixed_rehearsal._report_stable(report)
    )

    with pytest.raises(ValueError, match="does not match its workflow"):
        write_mixed_rehearsal(
            report, tmp_path / "out", workflow=workflow, dispatch=dispatch
        )
