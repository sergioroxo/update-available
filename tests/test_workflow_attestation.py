import copy
import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from runner.pipeline.source_queue import add_item, apply_triage_result, open_db, queue_db_path
from runner.pipeline.specialist_dispatch import build_dispatch_plan
from runner.pipeline.workflow_attestation import (
    build_workflow_attestation,
    validate_attestation_against_bundle,
    validate_workflow_attestation,
    write_workflow_attestation,
)
from runner.pipeline.workflow_batch import plan_workflow_batch
from runner.pipeline.workflow_attempts import build_attempt_plan


def _ordinary_bundle(tmp_path: Path):
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    db = open_db(queue_db_path(corpus))
    item = add_item(db, "https://example.org/ordinary")
    triage = SimpleNamespace(
        doc_type_hint="academic", recommended_llm="litelm", routing_reason="ordinary",
        complexity="moderate", needs_book_splitting=False, needs_testimony_review=False,
        needs_media_review=False, needs_legal_review=False, overnight_batch_safe=True,
        suggested_process_route="standard", triage_succeeded=True,
    )
    apply_triage_result(db, item.id, triage, model_name="triage-model")
    db.execute("UPDATE source_queue SET corpus_doc_id=? WHERE id=?", ("doc-ordinary", item.id))
    db.commit()
    doc_dir = corpus / "doc-ordinary"
    doc_dir.mkdir()
    (doc_dir / "analysis.json").write_text(json.dumps({"summary": "ready"}), encoding="utf-8")
    workflow = plan_workflow_batch(
        db, workflow_batch_id="ordinary-attestation", selected_item_ids=[item.id],
    )
    dispatch = build_dispatch_plan(workflow, corpus)
    attestation = build_workflow_attestation(workflow, dispatch, corpus)
    return corpus, workflow, dispatch, attestation


def test_ordinary_only_batch_can_be_attested_without_mixed_route_fixture(tmp_path):
    corpus, workflow, dispatch, attestation = _ordinary_bundle(tmp_path)

    validate_attestation_against_bundle(attestation, workflow, dispatch, corpus)
    plan = build_attempt_plan(workflow, dispatch, attestation, corpus)
    assert attestation["observed_routes"] == ["ordinary"]
    assert attestation["summary"]["items"] == 1
    assert attestation["execution_authorized"] is False
    assert attestation["remote_writes"] is False
    assert plan["planner_only"] is True


def test_attestation_tampering_and_current_corpus_drift_fail_closed(tmp_path):
    corpus, workflow, dispatch, attestation = _ordinary_bundle(tmp_path)
    tampered = copy.deepcopy(attestation)
    tampered["execution_authorized"] = True
    with pytest.raises(ValueError, match="non-authorizing"):
        validate_workflow_attestation(tampered)

    (corpus / "doc-ordinary" / "analysis.json").unlink()
    (corpus / "doc-ordinary").rmdir()
    with pytest.raises(ValueError, match="current workflow bundle|current corpus state|corpus state"):
        validate_attestation_against_bundle(attestation, workflow, dispatch, corpus)


def test_attestation_snapshot_is_immutable_and_replay_safe(tmp_path):
    corpus, workflow, dispatch, attestation = _ordinary_bundle(tmp_path)
    out = tmp_path / "out"
    path = write_workflow_attestation(
        attestation, out, workflow=workflow, dispatch=dispatch, corpus_dir=corpus,
    )
    original = path.read_bytes()
    replay = copy.deepcopy(attestation)
    replay["generated_at"] = "2099-01-01T00:00:00+00:00"
    assert write_workflow_attestation(
        replay, out, workflow=workflow, dispatch=dispatch, corpus_dir=corpus,
    ) == path
    assert path.read_bytes() == original
