from __future__ import annotations

import hashlib
import inspect
import json
import os
import sqlite3
from pathlib import Path
from types import SimpleNamespace

import pytest
from typer.testing import CliRunner

from runner.main import app
from runner.pipeline.citation_units import build_citation_units
from runner.pipeline.source_queue import add_item, apply_triage_result, open_db, queue_db_path
from runner.pipeline.specialist_dispatch import build_dispatch_plan
from runner.pipeline.workflow_attestation import build_workflow_attestation
from runner.pipeline.workflow_attempts import (
    build_attempt_plan,
    open_attempt_ledger,
    list_attempts,
    persist_attempt_plan,
    reconcile_attempt_plan,
    reconcile_attempt_plan_history,
)
from runner.pipeline.workflow_batch import plan_workflow_batch
from runner.pipeline.workflow_integrity import canonical_fingerprint
from runner.pipeline.testimony_candidates import build_testimony_candidates
from runner.pipeline.workflow_execution import (
    execute_testimony_candidates_attempt,
    preflight_selected_testimony_attempt,
    recover_interrupted_testimony_attempt,
    verify_testimony_execution_evidence,
)
from runner.pipeline import workflow_execution
from runner.pipeline.triage_jobs import acquire_worker_lock, release_worker_lock


class SimulatedCrash(BaseException):
    pass


class _Config:
    def __init__(self, corpus_dir: Path, exports_dir: Path) -> None:
        self.corpus_dir = corpus_dir
        self.exports_dir = exports_dir


def _write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _triage() -> SimpleNamespace:
    return SimpleNamespace(
        doc_type_hint="academic", recommended_llm="litelm", routing_reason="route",
        complexity="moderate", needs_book_splitting=False, needs_testimony_review=True,
        needs_media_review=False, needs_legal_review=False, overnight_batch_safe=False,
        suggested_process_route="standard", triage_succeeded=True,
    )


def _fixture(
    tmp_path: Path, *, malformed_analysis: bool = False, prior_sidecar: bytes | None = None,
    prior_mtime_ns: int | None = None, valid_stale_prior: bool = False,
) -> dict:
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    db = open_db(queue_db_path(corpus))
    item = add_item(db, "https://example.org/testimony")
    apply_triage_result(db, item.id, _triage(), model_name="triage-model")
    db.execute("UPDATE source_queue SET corpus_doc_id=? WHERE id=?", ("doc-testimony", item.id))
    db.commit()

    doc = corpus / "doc-testimony"
    doc.mkdir()
    text = (
        "The therapist presents a case story about a client who claimed he was healed "
        "through reparative therapy. A survivor later described coercion and harm."
    )
    (doc / "extracted.txt").write_text(text, encoding="utf-8")
    _write_json(doc / "citation_units.json", build_citation_units(text, doc_id=doc.name))
    if malformed_analysis:
        (doc / "analysis.json").write_text("{not-json", encoding="utf-8")
    else:
        _write_json(doc / "analysis.json", {
            "type": "Pro-SOGICE", "summary": "Clinical case story and survivor account.",
            "testimony_flag": True, "tactic": ["Tactic: Testimony-as-Proof"],
            "practice": ["Practice: Reparative Therapy"],
        })
    _write_json(doc / "analysis_audit.json", {"model": "core-qwen", "llm_flag": "litelm"})
    if prior_sidecar is not None:
        (doc / "testimony_candidates.json").write_bytes(prior_sidecar)
        if prior_mtime_ns is not None:
            os.utime(
                doc / "testimony_candidates.json",
                ns=(prior_mtime_ns, prior_mtime_ns),
            )
    if valid_stale_prior:
        _write_json(
            doc / "testimony_candidates.json",
            build_testimony_candidates(doc, generator_git_commit=""),
        )
        candidate_mtime = 1_000_000_000
        os.utime(
            doc / "testimony_candidates.json",
            ns=(candidate_mtime, candidate_mtime),
        )
        os.utime(doc / "analysis.json", ns=(candidate_mtime + 1, candidate_mtime + 1))

    workflow = plan_workflow_batch(
        db, workflow_batch_id="execution-fixture", selected_item_ids=[item.id],
    )
    dispatch = build_dispatch_plan(workflow, corpus)
    attestation = build_workflow_attestation(workflow, dispatch, corpus)
    plan = build_attempt_plan(
        workflow, dispatch, attestation, corpus,
        mode="run_selected", selected_item_ids=[item.id],
        selected_stages=["specialist:testimony"],
    )
    row = next(value for value in plan["rows"] if value["stage"] == "testimony-candidates-build")
    assert row["disposition"] == "planned_not_authorized"
    ledger = tmp_path / "attempts.sqlite3"
    persist_attempt_plan(
        plan, ledger, workflow=workflow, dispatch=dispatch,
        attestation=attestation, corpus_dir=corpus,
    )
    return {
        "corpus": corpus, "doc": doc, "workflow": workflow, "dispatch": dispatch,
        "attestation": attestation, "plan": plan, "row": row, "ledger": ledger,
        "evidence": tmp_path / "execution-evidence", "item_id": item.id,
    }


def _execute(bundle: dict, **overrides):
    kwargs = {
        "workflow": bundle["workflow"], "dispatch": bundle["dispatch"],
        "attestation": bundle["attestation"], "corpus_dir": bundle["corpus"],
        "evidence_root": bundle["evidence"], "authorize_local_sidecar": True,
        "confirmed_attempt_id": bundle["row"]["attempt_id"],
    }
    kwargs.update(overrides)
    return execute_testimony_candidates_attempt(
        bundle["plan"], bundle["row"]["attempt_id"], bundle["ledger"], **kwargs,
    )


def _event_types(bundle: dict) -> list[str]:
    db = open_attempt_ledger(bundle["ledger"], create=False)
    try:
        return [
            str(row[0]) for row in db.execute(
                "SELECT event_type FROM attempt_events WHERE attempt_id=? ORDER BY sequence",
                (bundle["row"]["attempt_id"],),
            )
        ]
    finally:
        db.close()


def test_preflight_is_read_only_and_requires_exact_current_evidence(tmp_path):
    bundle = _fixture(tmp_path)
    ledger_hash = hashlib.sha256(bundle["ledger"].read_bytes()).hexdigest()

    result = preflight_selected_testimony_attempt(
        bundle["plan"], bundle["row"]["attempt_id"], bundle["ledger"],
        workflow=bundle["workflow"], dispatch=bundle["dispatch"],
        attestation=bundle["attestation"], corpus_dir=bundle["corpus"],
    )

    assert result["ok"] is True
    assert result["remote_writes"] is False
    assert hashlib.sha256(bundle["ledger"].read_bytes()).hexdigest() == ledger_hash
    assert not (bundle["doc"] / "testimony_candidates.json").exists()


def test_success_is_one_use_preserved_and_requires_fresh_replanning(tmp_path, monkeypatch):
    bundle = _fixture(tmp_path)
    monkeypatch.setattr(
        "runner.pipeline.testimony_candidates.current_git_commit",
        lambda: (_ for _ in ()).throw(AssertionError("git subprocess path must not be used")),
    )
    inputs_before = {
        row["name"]: hashlib.sha256((bundle["doc"] / row["name"]).read_bytes()).hexdigest()
        for row in bundle["row"]["stage_input_evidence"]
    }

    result = _execute(bundle)

    assert result["ok"] is True
    assert result["receipt"]["status"] == "succeeded"
    assert result["receipt"]["remote_writes"] is False
    assert result["receipt"]["model_calls"] is False
    assert result["receipt"]["publication"] is False
    assert result["receipt"]["prior_artifact"] is None
    assert result["evidence_audit"]["ok"] is True
    projection = next(
        row for row in list_attempts(bundle["ledger"])
        if row["attempt_id"] == bundle["row"]["attempt_id"]
    )
    assert projection["execution_authorized"] is False
    assert projection["grant_recorded"] is True
    assert projection["execution_state"] == "lease_released"
    assert projection["preservation_recorded"] is True
    assert projection["execution_started_recorded"] is True
    assert projection["terminal_recorded"] is True
    assert projection["terminal_outcome"] == "succeeded"
    assert projection["lease_released"] is True
    assert projection["execution_run_id"] == result["run_id"]
    assert projection["recovery_check_required"] is False
    assert _event_types(bundle) == [
        "proposal_recorded", "execution_authorized", "lease_acquired",
        "preservation_recorded", "execution_started", "execution_succeeded",
        "lease_released",
    ]
    for name, digest in inputs_before.items():
        assert hashlib.sha256((bundle["doc"] / name).read_bytes()).hexdigest() == digest
    with pytest.raises(ValueError, match="one-use execution grant"):
        _execute(bundle)
    with pytest.raises(ValueError, match="current workflow bundle|current corpus state"):
        reconcile_attempt_plan(
            bundle["plan"], bundle["ledger"], workflow=bundle["workflow"],
            dispatch=bundle["dispatch"], attestation=bundle["attestation"],
            corpus_dir=bundle["corpus"],
        )
    assert reconcile_attempt_plan_history(bundle["plan"], bundle["ledger"])["ok"] is True

    fresh_dispatch = build_dispatch_plan(bundle["workflow"], bundle["corpus"])
    fresh_attestation = build_workflow_attestation(
        bundle["workflow"], fresh_dispatch, bundle["corpus"],
    )
    fresh_plan = build_attempt_plan(
        bundle["workflow"], fresh_dispatch, fresh_attestation, bundle["corpus"],
        mode="run_selected", selected_item_ids=[bundle["item_id"]],
        selected_stages=["specialist:testimony"],
    )
    testimony = [row for row in fresh_plan["rows"] if row["route"] == "testimony"]
    assert [row["disposition"] for row in testimony] == ["satisfied", "planned_not_authorized"]


def test_failure_restores_exact_prior_sidecar_and_records_failure(tmp_path, monkeypatch):
    prior = b'{"candidates":"stale-invalid"}\n'
    prior_mtime = 1_500_000_000
    bundle = _fixture(tmp_path, prior_sidecar=prior, prior_mtime_ns=prior_mtime)

    def fail(_doc: Path, **_kwargs):
        raise RuntimeError("injected builder failure")

    monkeypatch.setattr("runner.pipeline.workflow_execution.build_testimony_candidates", fail)
    result = _execute(bundle)

    assert result["ok"] is False
    assert result["status"] == "failed"
    assert result["restoration_ok"] is True
    assert (bundle["doc"] / "testimony_candidates.json").read_bytes() == prior
    assert (bundle["doc"] / "testimony_candidates.json").stat().st_mtime_ns == prior_mtime
    assert _event_types(bundle)[-2:] == ["execution_failed", "lease_released"]
    audit = verify_testimony_execution_evidence(
        bundle["plan"], bundle["row"]["attempt_id"], bundle["ledger"],
        corpus_dir=bundle["corpus"], evidence_root=bundle["evidence"],
    )
    assert audit["receipt"]["prior_artifact"]["sha256"] == hashlib.sha256(prior).hexdigest()


def test_malformed_declared_json_is_refused_before_authorization(tmp_path):
    bundle = _fixture(tmp_path, malformed_analysis=True)

    with pytest.raises(ValueError, match="Declared stage input is malformed"):
        _execute(bundle)

    assert _event_types(bundle) == ["proposal_recorded"]
    assert not (bundle["doc"] / "testimony_candidates.json").exists()


@pytest.mark.parametrize("boundary", ["after_lease_commit", "after_output_replace"])
def test_ambiguous_crash_is_recovered_to_hold_without_rerunning_adapter(
    tmp_path, boundary, monkeypatch,
):
    bundle = _fixture(tmp_path)

    def crash(point: str) -> None:
        if point == boundary:
            raise SimulatedCrash(point)

    monkeypatch.setattr("runner.pipeline.workflow_execution._TEST_FAULT_INJECTOR", crash)
    with pytest.raises(SimulatedCrash):
        _execute(bundle)
    monkeypatch.setattr("runner.pipeline.workflow_execution._TEST_FAULT_INJECTOR", None)

    result = recover_interrupted_testimony_attempt(
        bundle["plan"], bundle["row"]["attempt_id"], bundle["ledger"],
        corpus_dir=bundle["corpus"], evidence_root=bundle["evidence"],
        confirmed_attempt_id=bundle["row"]["attempt_id"],
    )

    assert result["status"] == "recovery_hold"
    assert result["adapter_invoked"] is False
    assert _event_types(bundle)[-2:] == ["execution_recovery_hold", "lease_released"]
    assert not (bundle["doc"] / "testimony_candidates.json").exists()
    fresh_dispatch = build_dispatch_plan(bundle["workflow"], bundle["corpus"])
    testimony_dispatch = fresh_dispatch["items"][0]["specialists"][0]
    assert testimony_dispatch["status"] == "blocked"
    assert fresh_dispatch["items"][0]["next_action"] == "resolve_specialist_hold"
    fresh_attestation = build_workflow_attestation(
        bundle["workflow"], fresh_dispatch, bundle["corpus"],
    )
    fresh_plan = build_attempt_plan(
        bundle["workflow"], fresh_dispatch, fresh_attestation, bundle["corpus"],
        mode="run_selected", selected_item_ids=[bundle["item_id"]],
        selected_stages=["specialist:testimony"],
    )
    testimony = [row for row in fresh_plan["rows"] if row["route"] == "testimony"]
    assert testimony
    assert all(row["disposition"] != "planned_not_authorized" for row in testimony)


@pytest.mark.parametrize("boundary", ["after_success_receipt", "after_success_event_before_release"])
def test_crash_after_complete_receipt_finalizes_exact_output_without_rerun(
    tmp_path, boundary, monkeypatch,
):
    bundle = _fixture(tmp_path)

    def crash(point: str) -> None:
        if point == boundary:
            raise SimulatedCrash(point)

    monkeypatch.setattr("runner.pipeline.workflow_execution._TEST_FAULT_INJECTOR", crash)
    with pytest.raises(SimulatedCrash):
        _execute(bundle)
    monkeypatch.setattr("runner.pipeline.workflow_execution._TEST_FAULT_INJECTOR", None)

    result = recover_interrupted_testimony_attempt(
        bundle["plan"], bundle["row"]["attempt_id"], bundle["ledger"],
        corpus_dir=bundle["corpus"], evidence_root=bundle["evidence"],
        confirmed_attempt_id=bundle["row"]["attempt_id"],
    )

    assert result["status"] == "succeeded"
    assert result["adapter_invoked"] is False
    assert result["evidence_audit"]["receipt"]["status"] == "succeeded"
    assert _event_types(bundle)[-2:] == ["execution_succeeded", "lease_released"]


def test_tampered_interrupted_success_receipt_routes_to_hold_not_success(tmp_path, monkeypatch):
    bundle = _fixture(tmp_path)

    def crash(point: str) -> None:
        if point == "after_success_receipt":
            raise SimulatedCrash(point)

    monkeypatch.setattr("runner.pipeline.workflow_execution._TEST_FAULT_INJECTOR", crash)
    with pytest.raises(SimulatedCrash):
        _execute(bundle)
    monkeypatch.setattr("runner.pipeline.workflow_execution._TEST_FAULT_INJECTOR", None)
    receipt_path = next(bundle["evidence"].rglob("execution_receipt.json"))
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    receipt["request_key"] = "0" * 64
    stable = {key: value for key, value in receipt.items() if key != "evidence_fingerprint"}
    receipt["evidence_fingerprint"] = canonical_fingerprint(stable)
    receipt_path.write_text(json.dumps(receipt), encoding="utf-8")

    result = recover_interrupted_testimony_attempt(
        bundle["plan"], bundle["row"]["attempt_id"], bundle["ledger"],
        corpus_dir=bundle["corpus"], evidence_root=bundle["evidence"],
        confirmed_attempt_id=bundle["row"]["attempt_id"],
    )

    assert result["status"] == "recovery_hold"
    assert _event_types(bundle)[-2:] == ["execution_recovery_hold", "lease_released"]
    assert not (bundle["doc"] / "testimony_candidates.json").exists()


def test_stale_prior_mtime_is_restored_and_recovery_hold_blocks_fresh_planning(
    tmp_path, monkeypatch,
):
    bundle = _fixture(tmp_path, valid_stale_prior=True)
    prior_path = bundle["doc"] / "testimony_candidates.json"
    prior_bytes = prior_path.read_bytes()
    prior_mtime = prior_path.stat().st_mtime_ns

    def crash(point: str) -> None:
        if point == "after_output_replace":
            raise SimulatedCrash(point)

    monkeypatch.setattr("runner.pipeline.workflow_execution._TEST_FAULT_INJECTOR", crash)
    with pytest.raises(SimulatedCrash):
        _execute(bundle)
    monkeypatch.setattr("runner.pipeline.workflow_execution._TEST_FAULT_INJECTOR", None)
    result = recover_interrupted_testimony_attempt(
        bundle["plan"], bundle["row"]["attempt_id"], bundle["ledger"],
        corpus_dir=bundle["corpus"], evidence_root=bundle["evidence"],
        confirmed_attempt_id=bundle["row"]["attempt_id"],
    )

    assert result["status"] == "recovery_hold"
    assert prior_path.read_bytes() == prior_bytes
    assert prior_path.stat().st_mtime_ns == prior_mtime
    fresh_dispatch = build_dispatch_plan(bundle["workflow"], bundle["corpus"])
    assert fresh_dispatch["items"][0]["specialists"][0]["status"] == "blocked"


def test_receipt_or_output_tampering_fails_evidence_verification(tmp_path):
    bundle = _fixture(tmp_path)
    result = _execute(bundle)
    output = bundle["doc"] / "testimony_candidates.json"
    output.write_text("{}", encoding="utf-8")

    with pytest.raises(ValueError, match="differs from the success receipt"):
        verify_testimony_execution_evidence(
            bundle["plan"], bundle["row"]["attempt_id"], bundle["ledger"],
            corpus_dir=bundle["corpus"], evidence_root=bundle["evidence"],
        )

    receipt_path = Path(result["receipt_path"])
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    receipt["remote_writes"] = True
    receipt_path.write_text(json.dumps(receipt), encoding="utf-8")
    with pytest.raises(ValueError, match="authority boundary|fingerprint"):
        verify_testimony_execution_evidence(
            bundle["plan"], bundle["row"]["attempt_id"], bundle["ledger"],
            corpus_dir=bundle["corpus"], evidence_root=bundle["evidence"],
        )


def test_wrong_confirmation_and_evidence_inside_corpus_are_refused(tmp_path):
    bundle = _fixture(tmp_path)
    with pytest.raises(ValueError, match="attempt confirmation"):
        _execute(bundle, confirmed_attempt_id="attempt-wrong")
    with pytest.raises(ValueError, match="outside the corpus"):
        _execute(bundle, evidence_root=bundle["corpus"] / ".evidence")
    assert _event_types(bundle) == ["proposal_recorded"]


@pytest.mark.parametrize("kind", ["directory", "oversize"])
def test_unpreservable_existing_output_is_refused_before_grant(tmp_path, kind):
    bundle = _fixture(tmp_path)
    output = bundle["doc"] / "testimony_candidates.json"
    if kind == "directory":
        output.mkdir()
        pattern = "non-regular"
    else:
        with output.open("wb") as handle:
            handle.truncate(50 * 1024 * 1024 + 1)
        pattern = "preservation bound"
    with pytest.raises(ValueError, match=pattern):
        _execute(bundle)
    assert _event_types(bundle) == ["proposal_recorded"]


def test_corpus_scoped_lock_blocks_other_evidence_roots_before_grant(tmp_path):
    bundle = _fixture(tmp_path)
    lock_path = workflow_execution._execution_lock_path(
        bundle["corpus"], bundle["row"]["doc_id"],
    )
    fd = acquire_worker_lock(lock_path)
    try:
        with pytest.raises(RuntimeError, match="already active"):
            _execute(bundle, evidence_root=tmp_path / "different-evidence-root")
    finally:
        release_worker_lock(lock_path, fd)
    assert _event_types(bundle) == ["proposal_recorded"]


def test_post_commit_audit_error_never_reverts_success(tmp_path, monkeypatch):
    bundle = _fixture(tmp_path)

    def fail_after_commit(point: str) -> None:
        if point == "after_terminal_commit":
            raise RuntimeError("post-commit audit injection")

    monkeypatch.setattr(
        "runner.pipeline.workflow_execution._TEST_FAULT_INJECTOR", fail_after_commit,
    )
    result = _execute(bundle)

    assert result["ok"] is False
    assert result["status"] == "succeeded"
    assert result["execution_committed"] is True
    assert result["verification_ok"] is False
    assert result["post_commit_audit_error"]["code"] == "RuntimeError"
    assert (bundle["doc"] / "testimony_candidates.json").is_file()
    assert verify_testimony_execution_evidence(
        bundle["plan"], bundle["row"]["attempt_id"], bundle["ledger"],
        corpus_dir=bundle["corpus"], evidence_root=bundle["evidence"],
    )["ok"] is True


def test_executor_public_signature_has_no_arbitrary_adapter_or_process_surface():
    parameters = inspect.signature(execute_testimony_candidates_attempt).parameters
    assert "build_fn" not in parameters
    assert "command" not in parameters
    assert "fault_inject" not in parameters
    source = inspect.getsource(workflow_execution)
    assert "import subprocess" not in source
    assert "subprocess." not in source
    assert "requests." not in source


def test_canary_cli_is_dry_run_by_default_then_requires_exact_one_use_confirmation(
    tmp_path, monkeypatch,
):
    bundle = _fixture(tmp_path)
    artifact_paths = []
    for name in ("plan", "workflow", "dispatch", "attestation"):
        path = tmp_path / f"{name}.json"
        _write_json(path, bundle[name])
        artifact_paths.append(path)
    monkeypatch.setattr(
        "runner.main.load_config",
        lambda *args, **kwargs: _Config(bundle["corpus"], tmp_path / "exports"),
    )
    base_args = [
        "workflow-testimony-canary", *[str(path) for path in artifact_paths],
        "--attempt-id", bundle["row"]["attempt_id"],
        "--ledger", str(bundle["ledger"]),
        "--evidence-root", str(bundle["evidence"]),
    ]
    runner = CliRunner()

    listed = runner.invoke(app, [
        "workflow-attempt-list", "--ledger", str(bundle["ledger"]), "--limit", "100",
    ])
    assert listed.exit_code == 0, listed.output
    assert "Copyable testimony canary attempt ID" in listed.output
    assert bundle["row"]["attempt_id"] in listed.output

    bad_root_args = list(base_args)
    bad_root_args[-1] = str(bundle["corpus"] / ".evidence")
    bad_root = runner.invoke(app, bad_root_args)
    assert bad_root.exit_code == 1
    assert "outside the corpus" in bad_root.output
    assert _event_types(bundle) == ["proposal_recorded"]

    dry_run = runner.invoke(app, base_args)
    assert dry_run.exit_code == 0, dry_run.output
    assert "Dry run only" in dry_run.output
    assert _event_types(bundle) == ["proposal_recorded"]
    assert not (bundle["doc"] / "testimony_candidates.json").exists()

    refused = runner.invoke(app, [*base_args, "--execute", "--confirm-attempt", "attempt-wrong"])
    assert refused.exit_code == 1
    assert "exact attempt ID" in refused.output
    assert _event_types(bundle) == ["proposal_recorded"]

    executed = runner.invoke(app, [
        *base_args, "--execute", "--confirm-attempt", bundle["row"]["attempt_id"],
    ])
    assert executed.exit_code == 0, executed.output
    assert "committed and verified" in executed.output
    assert _event_types(bundle)[-2:] == ["execution_succeeded", "lease_released"]

    verified = runner.invoke(app, [
        "workflow-testimony-evidence-verify", str(artifact_paths[0]),
        "--attempt-id", bundle["row"]["attempt_id"],
        "--ledger", str(bundle["ledger"]),
        "--evidence-root", str(bundle["evidence"]),
    ])
    assert verified.exit_code == 0, verified.output
    assert "Execution evidence verified" in verified.output


def test_evidence_verify_cli_reports_interrupted_prefix_as_incomplete(
    tmp_path, monkeypatch,
):
    bundle = _fixture(tmp_path)

    def crash(point: str) -> None:
        if point == "after_start_commit":
            raise SimulatedCrash(point)

    monkeypatch.setattr("runner.pipeline.workflow_execution._TEST_FAULT_INJECTOR", crash)
    with pytest.raises(SimulatedCrash):
        _execute(bundle)
    monkeypatch.setattr("runner.pipeline.workflow_execution._TEST_FAULT_INJECTOR", None)
    plan_path = tmp_path / "plan.json"
    _write_json(plan_path, bundle["plan"])
    monkeypatch.setattr(
        "runner.main.load_config",
        lambda *args, **kwargs: _Config(bundle["corpus"], tmp_path / "exports"),
    )

    result = CliRunner().invoke(app, [
        "workflow-testimony-evidence-verify", str(plan_path),
        "--attempt-id", bundle["row"]["attempt_id"],
        "--ledger", str(bundle["ledger"]),
        "--evidence-root", str(bundle["evidence"]),
    ])

    assert result.exit_code == 1
    assert "evidence is incomplete" in result.output
    assert "workflow-testimony-recover" in result.output

    wrong = CliRunner().invoke(app, [
        "workflow-testimony-recover", str(plan_path),
        "--attempt-id", bundle["row"]["attempt_id"],
        "--confirm-attempt", "attempt-wrong",
        "--ledger", str(bundle["ledger"]),
        "--evidence-root", str(bundle["evidence"]),
    ])
    assert wrong.exit_code == 1
    assert _event_types(bundle)[-1] == "execution_started"

    recovered = CliRunner().invoke(app, [
        "workflow-testimony-recover", str(plan_path),
        "--attempt-id", bundle["row"]["attempt_id"],
        "--confirm-attempt", bundle["row"]["attempt_id"],
        "--ledger", str(bundle["ledger"]),
        "--evidence-root", str(bundle["evidence"]),
    ])
    assert recovered.exit_code == 0, recovered.output
    assert "adapter was not rerun" in recovered.output
    assert "blocks downstream" in recovered.output
    assert _event_types(bundle)[-2:] == ["execution_recovery_hold", "lease_released"]


@pytest.mark.parametrize("failure_mode", ["builder", "post_commit_audit"])
def test_canary_cli_exits_nonzero_for_failed_or_unverified_execution(
    tmp_path, monkeypatch, failure_mode,
):
    bundle = _fixture(tmp_path)
    artifact_paths = []
    for name in ("plan", "workflow", "dispatch", "attestation"):
        path = tmp_path / f"{name}.json"
        _write_json(path, bundle[name])
        artifact_paths.append(path)
    monkeypatch.setattr(
        "runner.main.load_config",
        lambda *args, **kwargs: _Config(bundle["corpus"], tmp_path / "exports"),
    )
    if failure_mode == "builder":
        def fail_builder(_doc: Path, **_kwargs):
            raise RuntimeError("CLI builder failure")
        monkeypatch.setattr(
            "runner.pipeline.workflow_execution.build_testimony_candidates", fail_builder,
        )
    else:
        def fail_audit(point: str) -> None:
            if point == "after_terminal_commit":
                raise RuntimeError("CLI post-commit audit failure")
        monkeypatch.setattr(
            "runner.pipeline.workflow_execution._TEST_FAULT_INJECTOR", fail_audit,
        )
    attempt_id = bundle["row"]["attempt_id"]
    result = CliRunner().invoke(app, [
        "workflow-testimony-canary", *[str(path) for path in artifact_paths],
        "--attempt-id", attempt_id,
        "--ledger", str(bundle["ledger"]),
        "--evidence-root", str(bundle["evidence"]),
        "--execute", "--confirm-attempt", attempt_id,
    ])

    assert result.exit_code == 1
    assert "execution_committed=True" in result.output
    assert "verification_ok=False" in result.output
    if failure_mode == "builder":
        assert "status=failed" in result.output
        assert _event_types(bundle)[-2:] == ["execution_failed", "lease_released"]
    else:
        assert "status=succeeded" in result.output
        assert _event_types(bundle)[-2:] == ["execution_succeeded", "lease_released"]


def test_unknown_stage_attempt_cannot_enter_adapter(tmp_path):
    bundle = _fixture(tmp_path)
    other = next(row for row in bundle["plan"]["rows"] if row["stage"] == "testimony-deep-review")
    with pytest.raises(ValueError, match="eligible deterministic"):
        execute_testimony_candidates_attempt(
            bundle["plan"], other["attempt_id"], bundle["ledger"],
            workflow=bundle["workflow"], dispatch=bundle["dispatch"],
            attestation=bundle["attestation"], corpus_dir=bundle["corpus"],
            evidence_root=bundle["evidence"], authorize_local_sidecar=True,
            confirmed_attempt_id=other["attempt_id"],
        )
    assert _event_types(bundle) == ["proposal_recorded"]


def test_v1_0_ledger_migrates_once_and_tampered_lineage_is_refused(tmp_path):
    bundle = _fixture(tmp_path)
    db = sqlite3.connect(bundle["ledger"])
    db.execute("DROP TRIGGER ledger_migrations_no_update")
    db.execute("DROP TRIGGER ledger_migrations_no_delete")
    db.execute("UPDATE ledger_metadata SET schema_version='workflow-attempt-ledger-v1.0'")
    db.execute("DELETE FROM ledger_migrations")
    db.commit()
    db.close()

    migrated = open_attempt_ledger(bundle["ledger"])
    try:
        rows = migrated.execute("SELECT migration_id FROM ledger_migrations").fetchall()
        assert [row[0] for row in rows] == ["v1.0-to-v1.1"]
    finally:
        migrated.close()
    reopened = open_attempt_ledger(bundle["ledger"])
    reopened.close()

    db = sqlite3.connect(bundle["ledger"])
    db.execute("DROP TRIGGER ledger_migrations_no_update")
    db.execute(
        """UPDATE ledger_migrations
           SET migration_fingerprint=(CASE substr(migration_fingerprint,1,1)
               WHEN '0' THEN '1' ELSE '0' END) || substr(migration_fingerprint,2)"""
    )
    db.execute(
        """CREATE TRIGGER ledger_migrations_no_update
           BEFORE UPDATE ON ledger_migrations
           BEGIN SELECT RAISE(ABORT, 'ledger migrations are append-only'); END"""
    )
    db.commit()
    db.close()
    with pytest.raises(ValueError, match="migration history is malformed"):
        open_attempt_ledger(bundle["ledger"], create=False)
