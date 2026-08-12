"""Safe local background supervision for synthetic Mac Studio factory workers."""
from __future__ import annotations

import json
import os
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

from runner.models.reprocessing import require_safe_id
from .atomic_io import atomic_write_bytes
from .factory_messages import canonical_json_bytes, sha256_bytes


PROJECT_ROOT = Path(__file__).resolve().parents[2]
PYTHON = PROJECT_ROOT / ".venv" / "bin" / "python"


def _record_path(job_root: Path, run_id: str) -> Path:
    return Path(job_root) / require_safe_id(run_id, field="run_id") / "job.json"


def _exit_path(job_root: Path, run_id: str) -> Path:
    return _record_path(job_root, run_id).with_name("exit.json")


def _read(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError):
        return {}


def _pid_matches(pid: int, run_id: str) -> bool:
    if pid <= 1:
        return False
    try:
        import psutil
        command = psutil.Process(pid).cmdline()
    except (ImportError, OSError):
        return False
    return "runner.pipeline.reprocessing_worker" in command and (
        "--run-id" in command and command[command.index("--run-id") + 1] == run_id
    )


def worker_status(job_root: Path, run_id: str) -> dict:
    record_path = _record_path(job_root, run_id)
    if not record_path.exists():
        return {"status": "not_started", "run_id": run_id}
    record = _read(record_path)
    if record.get("run_id") != run_id:
        return {"status": "stale", "run_id": run_id, "reason": "job_identity_mismatch"}
    exit_record = _read(_exit_path(job_root, run_id))
    if exit_record.get("command_identity") == record.get("command_identity"):
        code = exit_record.get("exit_code")
        return {**record, "status": "completed" if code == 0 else "failed", "exit_code": code}
    if _pid_matches(int(record.get("pid", 0)), run_id):
        return {**record, "status": "running"}
    return {**record, "status": "stale", "reason": "worker_process_not_found"}


def launch_worker(
    *, to_studio: Path, from_studio: Path, state_root: Path,
    job_root: Path, run_id: str,
) -> dict:
    run_id = require_safe_id(run_id, field="run_id")
    existing = worker_status(job_root, run_id)
    if existing["status"] == "running":
        raise RuntimeError("A worker is already running for this campaign.")
    if existing["status"] == "completed":
        return {**existing, "reused": True}
    run_jobs = Path(job_root) / run_id
    run_jobs.mkdir(parents=True, exist_ok=True)
    log_path = run_jobs / "worker.log"
    record_path = _record_path(job_root, run_id)
    exit_path = _exit_path(job_root, run_id)
    command = [
        str(PYTHON), "-m", "runner.pipeline.reprocessing_worker", "run-campaign",
        "--to-studio", str(Path(to_studio)), "--from-studio", str(Path(from_studio)),
        "--state-root", str(Path(state_root)), "--job-root", str(Path(job_root)),
        "--run-id", run_id, "--executor", "synthetic-no-model",
    ]
    identity = sha256_bytes(canonical_json_bytes(command))
    if exit_path.exists():
        exit_path.unlink()
    with log_path.open("ab", buffering=0) as log:
        process = subprocess.Popen(
            command, cwd=PROJECT_ROOT, stdin=subprocess.DEVNULL,
            stdout=log, stderr=log, close_fds=True, start_new_session=True,
        )
    record = {
        "schema_version": "factory-supervisor-job-v1.0", "run_id": run_id,
        "pid": process.pid, "started_at": datetime.now(timezone.utc).isoformat(),
        "command_identity": identity,
        "log_path": log_path.relative_to(Path(job_root)).as_posix(),
        "content_free": True,
    }
    atomic_write_bytes(record_path, canonical_json_bytes(record))
    return {**record, "status": "running"}


def write_exit_record(job_root: Path, run_id: str, exit_code: int) -> None:
    record = {}
    for _ in range(100):
        record = _read(_record_path(job_root, run_id))
        if record.get("command_identity"):
            break
        time.sleep(0.01)
    payload = {
        "schema_version": "factory-supervisor-exit-v1.0", "run_id": run_id,
        "command_identity": record.get("command_identity", ""),
        "exit_code": exit_code,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "content_free": True,
    }
    atomic_write_bytes(_exit_path(job_root, run_id), canonical_json_bytes(payload))
