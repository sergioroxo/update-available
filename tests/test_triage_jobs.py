import json
import os
import subprocess
import sys
from types import SimpleNamespace

import pytest

from runner.pipeline.triage_jobs import (
    acquire_worker_lock,
    claim_next_job,
    cancel_active_jobs,
    enqueue_triage_job,
    finish_job,
    list_jobs,
    open_jobs_db,
    queue_counts,
    recover_interrupted_jobs,
    release_worker_lock,
    run_queued_jobs,
    source_history_tokens,
)
from runner.pipeline.source_queue import add_item, apply_triage_result, open_db, queue_db_path


def test_enqueue_atomically_deduplicates_active_item_ids(tmp_path):
    db = open_jobs_db(tmp_path / "jobs.sqlite3")

    first = enqueue_triage_job(db, ["a", "b", "a"])
    second = enqueue_triage_job(db, ["b", "c"])

    assert first["queued_ids"] == ["a", "b"]
    assert second["queued_ids"] == ["c"]
    assert second["duplicate_ids"] == ["b"]
    assert len(first["job_ids"]) == 2
    assert len(second["job_ids"]) == 1
    assert queue_counts(db) == {"queued": 3}


def test_interrupted_job_is_recovered_and_audited(tmp_path):
    db = open_jobs_db(tmp_path / "jobs.sqlite3")
    queued = enqueue_triage_job(db, ["a"])
    job = claim_next_job(db, worker_pid=999999)
    assert job["status"] == "running"

    assert recover_interrupted_jobs(db) == 1

    row = list_jobs(db)[0]
    assert row["id"] == queued["job_id"]
    assert row["status"] == "queued"
    events = db.execute(
        "SELECT event FROM triage_job_events WHERE job_id=? ORDER BY id", (queued["job_id"],)
    ).fetchall()
    assert [event["event"] for event in events] == ["queued", "started", "recovered"]


def test_worker_executes_exact_ids_and_persists_success(tmp_path):
    db = open_jobs_db(tmp_path / "jobs.sqlite3")
    queued = enqueue_triage_job(db, ["a", "b"], use_crawl4ai=True)
    commands = []

    result = run_queued_jobs(
        db,
        project_root=tmp_path,
        heavy_lock_path=tmp_path / "heavy.json",
        execute=lambda command, cwd: (commands.append((command, cwd)) or (0, "ok")),
    )

    assert result == {"processed": 2, "failed": 0}
    assert len(commands) == 2
    assert all(command.count("--item-id") == 1 for command, _ in commands)
    assert all("--use-crawl4ai" in command for command, _ in commands)
    assert {row["status"] for row in list_jobs(db)} == {"succeeded"}
    assert queued["job_id"] in {row["id"] for row in list_jobs(db)}


def test_worker_leaves_job_queued_when_heavy_model_is_active_in_once_mode(tmp_path):
    db = open_jobs_db(tmp_path / "jobs.sqlite3")
    enqueue_triage_job(db, ["a"])
    heavy = tmp_path / "heavy.json"
    heavy.write_text(json.dumps({"pid": os.getpid()}))

    result = run_queued_jobs(
        db,
        project_root=tmp_path,
        heavy_lock_path=heavy,
        once=True,
        execute=lambda command, cwd: pytest.fail("model command must not run while heavy lock is active"),
    )

    assert result["waiting"] == 1
    assert list_jobs(db)[0]["status"] == "queued"


def test_atomic_worker_lock_refuses_second_owner(tmp_path):
    path = tmp_path / "worker.lock"
    first_fd = acquire_worker_lock(path)
    try:
        with pytest.raises(RuntimeError, match="already active"):
            acquire_worker_lock(path)
    finally:
        release_worker_lock(path, first_fd)
    second_fd = acquire_worker_lock(path)
    release_worker_lock(path, second_fd)


def test_flock_refuses_owner_in_a_separate_process(tmp_path):
    path = tmp_path / "worker.lock"
    first_fd = acquire_worker_lock(path)
    script = (
        "from pathlib import Path; from runner.pipeline.triage_jobs import acquire_worker_lock; "
        "import sys; "
        "\ntry: acquire_worker_lock(Path(sys.argv[1]))\n"
        "except RuntimeError: print('blocked')\n"
        "else: print('acquired')"
    )
    try:
        completed = subprocess.run(
            [sys.executable, "-c", script, str(path)],
            cwd=os.getcwd(),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    finally:
        release_worker_lock(path, first_fd)
    assert completed.returncode == 0, completed.stderr
    assert completed.stdout.strip() == "blocked"


def test_worker_waits_for_shared_model_lease(tmp_path):
    db = open_jobs_db(tmp_path / "jobs.sqlite3")
    enqueue_triage_job(db, ["a"])
    lease_path = tmp_path / "model.lease"
    lease_fd = acquire_worker_lock(lease_path)
    try:
        result = run_queued_jobs(
            db, project_root=tmp_path, heavy_lock_path=tmp_path / "heavy.json",
            model_lease_path=lease_path, once=True,
            execute=lambda command, cwd: pytest.fail("must not run without the model lease"),
        )
    finally:
        release_worker_lock(lease_path, lease_fd)
    assert result["waiting"] == 1
    assert list_jobs(db)[0]["status"] == "queued"


def test_failed_command_is_terminal_and_retains_error(tmp_path):
    db = open_jobs_db(tmp_path / "jobs.sqlite3")
    enqueue_triage_job(db, ["a"])

    result = run_queued_jobs(
        db,
        project_root=tmp_path,
        heavy_lock_path=tmp_path / "heavy.json",
        execute=lambda command, cwd: (7, "model endpoint unavailable"),
    )

    assert result == {"processed": 1, "failed": 1}
    row = list_jobs(db)[0]
    assert row["status"] == "failed"
    assert "endpoint unavailable" in row["last_error"]


def test_stale_attempt_cannot_finish_recovered_attempt(tmp_path):
    db = open_jobs_db(tmp_path / "jobs.sqlite3")
    queued = enqueue_triage_job(db, ["a"])
    old = claim_next_job(db, worker_pid=111)
    old_lease = old["lease_token"]
    recover_interrupted_jobs(db)
    new = claim_next_job(db, worker_pid=222)

    assert finish_job(
        db, queued["job_id"], lease_token=old_lease, status="succeeded"
    ) is False
    assert list_jobs(db)[0]["status"] == "running"
    assert finish_job(
        db, queued["job_id"], lease_token=new["lease_token"], status="succeeded"
    ) is True


def test_cancelled_attempt_cannot_late_finish(tmp_path):
    db = open_jobs_db(tmp_path / "jobs.sqlite3")
    queued = enqueue_triage_job(db, ["a"])
    running = claim_next_job(db, worker_pid=111)

    assert cancel_active_jobs(db) == 1
    assert finish_job(
        db, queued["job_id"], lease_token=running["lease_token"], status="succeeded"
    ) is False
    assert list_jobs(db)[0]["status"] == "cancelled"


def test_cancel_with_include_queued_stops_entire_drain(tmp_path):
    db = open_jobs_db(tmp_path / "jobs.sqlite3")
    enqueue_triage_job(db, ["a", "b", "c"])
    claim_next_job(db, worker_pid=111)

    assert cancel_active_jobs(db, include_queued=True) == 3
    assert {row["status"] for row in list_jobs(db)} == {"cancelled"}
    assert queue_counts(db) == {"cancelled": 3}


def test_worker_reconciles_fail_closed_per_item_outcome(tmp_path):
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    source_db_path = queue_db_path(corpus)
    source_db = open_db(source_db_path)
    item = add_item(source_db, "https://example.org/held")
    jobs = open_jobs_db(tmp_path / "jobs.sqlite3")
    baseline = source_history_tokens(source_db_path, [item.id])
    enqueue_triage_job(jobs, [item.id], baseline_tokens=baseline)

    failed = SimpleNamespace(
        doc_type_hint="unknown", recommended_llm="litelm", routing_reason="model parse failed",
        priority="medium", needs_book_splitting=False, needs_testimony_review=False,
        needs_media_review=False, needs_legal_review=False, overnight_batch_safe=False,
        suggested_process_route="manual_review", triage_succeeded=False,
    )

    def execute(command, cwd):
        apply_triage_result(source_db, item.id, failed, model_name="triage-model")
        return 0, "command completed"

    result = run_queued_jobs(
        jobs, project_root=tmp_path, heavy_lock_path=tmp_path / "heavy.json",
        source_queue_path=source_db_path, execute=execute,
    )

    assert result == {"processed": 1, "failed": 0}
    row = list_jobs(jobs)[0]
    assert row["status"] == "held"
    assert "parse failed" in row["last_error"]


def test_recovery_reconciles_recorded_result_without_second_model_call(tmp_path):
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    source_db_path = queue_db_path(corpus)
    source_db = open_db(source_db_path)
    item = add_item(source_db, "https://example.org/recovered")
    jobs = open_jobs_db(tmp_path / "jobs.sqlite3")
    enqueue_triage_job(
        jobs, [item.id], force=True,
        baseline_tokens=source_history_tokens(source_db_path, [item.id]),
    )
    claim_next_job(jobs, worker_pid=999999)
    result = SimpleNamespace(
        doc_type_hint="report", recommended_llm="litelm", routing_reason="ordinary",
        priority="high", needs_book_splitting=False, needs_testimony_review=False,
        needs_media_review=False, needs_legal_review=False, overnight_batch_safe=True,
        suggested_process_route="standard", triage_succeeded=True,
    )
    apply_triage_result(source_db, item.id, result, model_name="triage-model")
    recover_interrupted_jobs(jobs)

    drained = run_queued_jobs(
        jobs, project_root=tmp_path, heavy_lock_path=tmp_path / "heavy.json",
        source_queue_path=source_db_path,
        execute=lambda command, cwd: pytest.fail("recorded result must prevent a repeated model call"),
    )

    assert drained == {"processed": 1, "failed": 0}
    assert list_jobs(jobs)[0]["status"] == "succeeded"
