from __future__ import annotations

import json
import os
import time
from pathlib import Path

import pytest

from runner.pipeline.factory_controller import create_synthetic_campaign
from runner.pipeline.factory_messages import canonical_json_bytes
from runner.pipeline.factory_supervisor import (
    _pid_matches, launch_worker, worker_status,
)


def _wait(job_root: Path, run_id: str) -> dict:
    for _ in range(200):
        status = worker_status(job_root, run_id)
        if status["status"] != "running":
            return status
        time.sleep(0.02)
    raise AssertionError("worker did not finish")


def test_real_supervisor_launch_survives_launcher_scope_and_records_completion(tmp_path):
    run_id = "supervised-run"
    create_synthetic_campaign(tmp_path, run_id=run_id)
    launch = launch_worker(
        to_studio=tmp_path / "exchange" / "to-mac-studio",
        from_studio=tmp_path / "exchange" / "from-mac-studio",
        state_root=tmp_path / "studio-local", job_root=tmp_path / "jobs",
        run_id=run_id,
    )
    pid = launch["pid"]
    del launch
    status = _wait(tmp_path / "jobs", run_id)
    assert status["status"] == "completed"
    assert status["exit_code"] == 0
    assert status["pid"] == pid
    assert status["content_free"] is True
    assert (tmp_path / "studio-local" / run_id / "worker.db").is_file()
    assert not list((tmp_path / "exchange").rglob("*.db"))
    reused = launch_worker(
        to_studio=tmp_path / "exchange" / "to-mac-studio",
        from_studio=tmp_path / "exchange" / "from-mac-studio",
        state_root=tmp_path / "studio-local", job_root=tmp_path / "jobs",
        run_id=run_id,
    )
    assert reused["reused"] is True
    assert reused["pid"] == pid


def test_duplicate_launch_is_prevented_for_running_record(tmp_path, monkeypatch):
    run_id = "duplicate-run"
    run_dir = tmp_path / "jobs" / run_id
    run_dir.mkdir(parents=True)
    (run_dir / "job.json").write_bytes(canonical_json_bytes({
        "run_id": run_id, "pid": 12345, "command_identity": "a" * 64,
    }))
    monkeypatch.setattr(
        "runner.pipeline.factory_supervisor._pid_matches", lambda pid, identity: True,
    )
    with pytest.raises(RuntimeError, match="already running"):
        launch_worker(
            to_studio=tmp_path / "to", from_studio=tmp_path / "from",
            state_root=tmp_path / "state", job_root=tmp_path / "jobs",
            run_id=run_id,
        )


def test_stale_and_identity_mismatched_job_records_are_safe(tmp_path):
    run_id = "stale-run"
    run_dir = tmp_path / run_id
    run_dir.mkdir(parents=True)
    (run_dir / "job.json").write_text(json.dumps({
        "run_id": "another-run", "pid": os.getpid(), "command_identity": "a" * 64,
    }), encoding="utf-8")
    status = worker_status(tmp_path, run_id)
    assert status == {
        "status": "stale", "run_id": run_id, "reason": "job_identity_mismatch",
    }
    assert _pid_matches(os.getpid(), run_id) is False


def test_missing_job_record_is_non_technical_not_started_state(tmp_path):
    assert worker_status(tmp_path, "never-started") == {
        "status": "not_started", "run_id": "never-started",
    }
