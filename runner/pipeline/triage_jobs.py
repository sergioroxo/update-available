"""Durable Source Queue triage jobs and single-worker coordination.

The database is operational state only. Source Queue rows remain authoritative
for triage results; this ledger records requested work, attempts, and failures.
"""
from __future__ import annotations

import json
import os
import sqlite3
import subprocess
import sys
import time
import uuid
import fcntl
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable


SCHEMA_VERSION = "triage-jobs-v1.0"
ACTIVE_STATUSES = ("queued", "running", "waiting")
TERMINAL_STATUSES = ("succeeded", "held", "failed", "cancelled")


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def triage_jobs_db_path(corpus_dir: Path) -> Path:
    return Path(corpus_dir).parent / "source_queue_triage_jobs.sqlite3"


def open_jobs_db(path: Path) -> sqlite3.Connection:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(str(path), timeout=30)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS triage_jobs (
            id TEXT PRIMARY KEY,
            schema_version TEXT NOT NULL,
            status TEXT NOT NULL,
            item_ids_json TEXT NOT NULL,
            force INTEGER NOT NULL DEFAULT 0,
            use_crawl4ai INTEGER NOT NULL DEFAULT 0,
            label TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            started_at TEXT NOT NULL DEFAULT '',
            completed_at TEXT NOT NULL DEFAULT '',
            attempt_count INTEGER NOT NULL DEFAULT 0,
            worker_pid INTEGER NOT NULL DEFAULT 0,
            last_error TEXT NOT NULL DEFAULT '',
            baseline_token TEXT NOT NULL DEFAULT '',
            lease_token TEXT NOT NULL DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS idx_triage_jobs_status_created
            ON triage_jobs(status, created_at);
        CREATE TABLE IF NOT EXISTS triage_job_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT NOT NULL,
            event_at TEXT NOT NULL,
            event TEXT NOT NULL,
            detail TEXT NOT NULL DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS idx_triage_job_events_job
            ON triage_job_events(job_id, id);
        """
    )
    existing = {row[1] for row in db.execute("PRAGMA table_info(triage_jobs)")}
    if "baseline_token" not in existing:
        db.execute("ALTER TABLE triage_jobs ADD COLUMN baseline_token TEXT NOT NULL DEFAULT ''")
    if "lease_token" not in existing:
        db.execute("ALTER TABLE triage_jobs ADD COLUMN lease_token TEXT NOT NULL DEFAULT ''")
    db.commit()
    return db


def _ids(row: sqlite3.Row | dict) -> list[str]:
    try:
        values = json.loads(row["item_ids_json"])
    except Exception:
        return []
    return [str(value) for value in values if str(value).strip()]


def _event(db: sqlite3.Connection, job_id: str, event: str, detail: str = "") -> None:
    db.execute(
        "INSERT INTO triage_job_events(job_id,event_at,event,detail) VALUES(?,?,?,?)",
        (job_id, _now(), event, detail),
    )


def enqueue_triage_job(
    db: sqlite3.Connection,
    item_ids: list[str],
    *,
    force: bool = False,
    use_crawl4ai: bool = False,
    label: str = "source-queue-triage",
    baseline_tokens: dict[str, str] | None = None,
) -> dict:
    """Atomically enqueue IDs not already owned by an active job."""
    requested = list(dict.fromkeys(str(value).strip() for value in item_ids if str(value).strip()))
    if not requested:
        raise ValueError("No queue item IDs selected for triage")
    db.execute("BEGIN IMMEDIATE")
    try:
        active_rows = db.execute(
            "SELECT item_ids_json FROM triage_jobs WHERE status IN ('queued','running','waiting')"
        ).fetchall()
        active_ids = {item_id for row in active_rows for item_id in _ids(row)}
        queued_ids = [item_id for item_id in requested if item_id not in active_ids]
        duplicate_ids = [item_id for item_id in requested if item_id in active_ids]
        job_ids: list[str] = []
        if queued_ids:
            now = _now()
            for item_id in queued_ids:
                job_id = "triage-" + uuid.uuid4().hex[:12]
                job_ids.append(job_id)
                db.execute(
                    """INSERT INTO triage_jobs
                       (id,schema_version,status,item_ids_json,force,use_crawl4ai,label,created_at,updated_at,baseline_token)
                       VALUES(?,?,?,?,?,?,?,?,?,?)""",
                    (
                        job_id, SCHEMA_VERSION, "queued", json.dumps([item_id]),
                        int(force), int(use_crawl4ai), label, now, now,
                        str((baseline_tokens or {}).get(item_id, "")),
                    ),
                )
                _event(db, job_id, "queued", f"item={item_id}")
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {
        "job_id": job_ids[0] if job_ids else "", "job_ids": job_ids,
        "queued_ids": queued_ids, "duplicate_ids": duplicate_ids,
    }


def list_jobs(db: sqlite3.Connection, *, limit: int = 50) -> list[dict]:
    rows = db.execute(
        "SELECT * FROM triage_jobs ORDER BY created_at DESC, id DESC LIMIT ?", (max(1, int(limit)),)
    ).fetchall()
    return [{**dict(row), "item_ids": _ids(row)} for row in rows]


def queue_counts(db: sqlite3.Connection) -> dict[str, int]:
    rows = db.execute("SELECT status, COUNT(*) AS n FROM triage_jobs GROUP BY status").fetchall()
    return {str(row["status"]): int(row["n"]) for row in rows}


def recover_interrupted_jobs(db: sqlite3.Connection) -> int:
    """Return jobs left running by a dead worker to the queue."""
    now = _now()
    rows = db.execute("SELECT id FROM triage_jobs WHERE status IN ('running','waiting')").fetchall()
    for row in rows:
        db.execute(
            "UPDATE triage_jobs SET status='queued',worker_pid=0,lease_token='',updated_at=?,last_error=? WHERE id=?",
            (now, "Recovered after worker interruption", row["id"]),
        )
        _event(db, row["id"], "recovered", "Previous worker was not active")
    db.commit()
    return len(rows)


def claim_next_job(db: sqlite3.Connection, *, worker_pid: int) -> dict | None:
    db.execute("BEGIN IMMEDIATE")
    try:
        row = db.execute(
            "SELECT * FROM triage_jobs WHERE status='queued' ORDER BY created_at,id LIMIT 1"
        ).fetchone()
        if row is None:
            db.commit()
            return None
        now = _now()
        lease_token = uuid.uuid4().hex
        db.execute(
            """UPDATE triage_jobs SET status='running',started_at=CASE WHEN started_at='' THEN ? ELSE started_at END,
               updated_at=?,attempt_count=attempt_count+1,worker_pid=?,lease_token=?,last_error=''
               WHERE id=? AND status='queued'""",
            (now, now, worker_pid, lease_token, row["id"]),
        )
        _event(db, row["id"], "started", f"worker_pid={worker_pid}")
        db.commit()
    except Exception:
        db.rollback()
        raise
    claimed = db.execute("SELECT * FROM triage_jobs WHERE id=?", (row["id"],)).fetchone()
    return {**dict(claimed), "item_ids": _ids(claimed)}


def finish_job(
    db: sqlite3.Connection,
    job_id: str,
    *,
    lease_token: str,
    status: str,
    error: str = "",
) -> bool:
    if status not in {"succeeded", "held", "failed", "cancelled"}:
        raise ValueError(f"Unsupported terminal triage status: {status}")
    now = _now()
    cur = db.execute(
        """UPDATE triage_jobs SET status=?,updated_at=?,completed_at=?,worker_pid=0,lease_token='',last_error=?
           WHERE id=? AND lease_token=? AND status IN ('running','waiting')""",
        (status, now, now, error[:4000], job_id, lease_token),
    )
    if cur.rowcount:
        _event(db, job_id, status, error[:4000])
    db.commit()
    return bool(cur.rowcount)


def set_waiting(db: sqlite3.Connection, job_id: str, lease_token: str, detail: str) -> bool:
    cur = db.execute(
        """UPDATE triage_jobs SET status='waiting',updated_at=?,last_error=?
           WHERE id=? AND lease_token=? AND status='running'""",
        (_now(), detail[:4000], job_id, lease_token),
    )
    if cur.rowcount:
        _event(db, job_id, "waiting", detail[:4000])
    db.commit()
    return bool(cur.rowcount)


def return_waiting_to_running(db: sqlite3.Connection, job_id: str, lease_token: str) -> bool:
    cur = db.execute(
        """UPDATE triage_jobs SET status='running',updated_at=?,last_error=''
           WHERE id=? AND lease_token=? AND status='waiting'""",
        (_now(), job_id, lease_token),
    )
    if cur.rowcount:
        _event(db, job_id, "resumed", "Blocking model job cleared")
    db.commit()
    return bool(cur.rowcount)


def cancel_active_jobs(
    db: sqlite3.Connection,
    reason: str = "Cancelled by researcher",
    *,
    include_queued: bool = False,
) -> int:
    statuses = ("running", "waiting", "queued") if include_queued else ("running", "waiting")
    placeholders = ",".join("?" for _ in statuses)
    rows = db.execute(
        f"SELECT id FROM triage_jobs WHERE status IN ({placeholders})", statuses,
    ).fetchall()
    now = _now()
    for row in rows:
        db.execute(
            """UPDATE triage_jobs SET status='cancelled',updated_at=?,completed_at=?,worker_pid=0,
               lease_token='',last_error=? WHERE id=? AND status IN ({placeholders})""".format(
                placeholders=placeholders
            ),
            (now, now, reason, row["id"], *statuses),
        )
        _event(db, row["id"], "cancelled", reason)
    db.commit()
    return len(rows)


def _pid_running(pid: object) -> bool:
    try:
        value = int(pid or 0)
        if value <= 0:
            return False
        os.kill(value, 0)
        return True
    except PermissionError:
        return True
    except (ProcessLookupError, TypeError, ValueError):
        return False


def active_lock(path: Path) -> dict | None:
    path = Path(path)
    if not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        try:
            age = time.time() - path.stat().st_mtime
        except OSError:
            return {"uncertain": True}
        # Fail closed around a concurrent/partial writer; an old malformed
        # file is not allowed to block the queue forever.
        return {"uncertain": True} if age < 30 else None
    return payload if _pid_running(payload.get("pid")) else None


def lock_is_held(path: Path) -> bool:
    """Check a flock-backed lease without trusting its diagnostic JSON."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return True
        fcntl.flock(fd, fcntl.LOCK_UN)
        return False
    finally:
        os.close(fd)


def acquire_worker_lock(path: Path) -> int:
    """Acquire an OS-held single-worker lock and return its file descriptor."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        os.close(fd)
        raise RuntimeError("A durable triage worker is already active")
    payload = json.dumps({"pid": os.getpid(), "started_at": _now()}).encode("utf-8")
    os.ftruncate(fd, 0)
    os.lseek(fd, 0, os.SEEK_SET)
    os.write(fd, payload)
    os.fsync(fd)
    return fd


def release_worker_lock(path: Path, fd: int) -> None:
    try:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)
    finally:
        # Keep the stable inode: flock lifetime, not pathname deletion, owns it.
        pass


def command_for_job(job: dict) -> list[str]:
    command = [sys.executable, "-m", "runner.main", "queue-triage", "--limit", str(len(job["item_ids"]))]
    if bool(job.get("force")):
        command.append("--force")
    if bool(job.get("use_crawl4ai")):
        command.append("--use-crawl4ai")
    for item_id in job["item_ids"]:
        command.extend(["--item-id", item_id])
    return command


def source_history_tokens(source_queue_path: Path, item_ids: list[str]) -> dict[str, str]:
    """Return the latest append-only triage-history id for each queue item."""
    path = Path(source_queue_path)
    if not path.is_file() or not item_ids:
        return {item_id: "" for item_id in item_ids}
    db = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True)
    db.row_factory = sqlite3.Row
    try:
        tokens: dict[str, str] = {}
        for item_id in item_ids:
            row = db.execute(
                "SELECT MAX(id) AS token FROM source_queue_triage_history WHERE item_id=?",
                (item_id,),
            ).fetchone()
            tokens[item_id] = str(row["token"] or "")
        return tokens
    finally:
        db.close()


def reconcile_recorded_outcome(source_queue_path: Path, job: dict) -> tuple[str, str] | None:
    """Detect a newer per-item triage result, including fail-closed outcomes."""
    path = Path(source_queue_path)
    item_ids = list(job.get("item_ids") or [])
    if not path.is_file() or len(item_ids) != 1:
        return None
    db = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True)
    db.row_factory = sqlite3.Row
    try:
        row = db.execute(
            """SELECT id,triage_succeeded,routing_reason FROM source_queue_triage_history
               WHERE item_id=? ORDER BY id DESC LIMIT 1""",
            (item_ids[0],),
        ).fetchone()
    finally:
        db.close()
    if row is None or int(row["id"]) <= int(job.get("baseline_token") or 0):
        return None
    if bool(row["triage_succeeded"]):
        return "succeeded", "Recorded triage result reconciled"
    return "held", str(row["routing_reason"] or "Triage failed closed")


def run_queued_jobs(
    db: sqlite3.Connection,
    *,
    project_root: Path,
    heavy_lock_path: Path,
    poll_seconds: float = 5.0,
    execute: Callable[[list[str], Path], tuple[int, str]] | None = None,
    once: bool = False,
    source_queue_path: Path | None = None,
    model_lease_path: Path | None = None,
) -> dict:
    """Drain durable jobs, waiting safely while another model job owns memory."""
    execute = execute or _execute_command
    processed = failed = 0
    while True:
        job = claim_next_job(db, worker_pid=os.getpid())
        if job is None:
            return {"processed": processed, "failed": failed}
        lease_token = str(job.get("lease_token") or "")
        if source_queue_path:
            reconciled = reconcile_recorded_outcome(source_queue_path, job)
            if reconciled:
                status, detail = reconciled
                finish_job(
                    db, job["id"], lease_token=lease_token, status=status, error=detail,
                )
                processed += 1
                failed += int(status == "failed")
                continue
        waited = False
        lease_fd: int | None = None
        while active_lock(heavy_lock_path) or (
            model_lease_path is not None and lock_is_held(model_lease_path)
        ):
            if not waited:
                set_waiting(db, job["id"], lease_token, "Waiting for active heavy model job")
                waited = True
            if once:
                # Return it to queued so the next worker/resume attempt owns it.
                db.execute(
                    """UPDATE triage_jobs SET status='queued',worker_pid=0,lease_token='',updated_at=?
                       WHERE id=? AND lease_token=? AND status='waiting'""",
                    (_now(), job["id"], lease_token),
                )
                db.commit()
                return {"processed": processed, "failed": failed, "waiting": 1}
            time.sleep(max(0.1, poll_seconds))
        if waited:
            if not return_waiting_to_running(db, job["id"], lease_token):
                continue
        if model_lease_path is not None:
            try:
                lease_fd = acquire_worker_lock(model_lease_path)
            except RuntimeError:
                # A heavy job won the check→acquire race; return this attempt
                # to waiting and retry without executing model work.
                set_waiting(db, job["id"], lease_token, "Waiting for shared model-resource lease")
                time.sleep(max(0.1, poll_seconds))
                return_waiting_to_running(db, job["id"], lease_token)
                db.execute(
                    """UPDATE triage_jobs SET status='queued',worker_pid=0,lease_token='',updated_at=?
                       WHERE id=? AND lease_token=? AND status='running'""",
                    (_now(), job["id"], lease_token),
                )
                db.commit()
                continue
        try:
            returncode, output = execute(command_for_job(job), Path(project_root))
        finally:
            if lease_fd is not None:
                release_worker_lock(model_lease_path, lease_fd)
        reconciled = reconcile_recorded_outcome(source_queue_path, job) if source_queue_path else None
        if reconciled:
            status, detail = reconciled
        elif returncode == 0 and source_queue_path:
            status, detail = "failed", "Triage command exited without recording a per-item outcome"
        elif returncode == 0:
            status, detail = "succeeded", ""
        else:
            status, detail = "failed", output
        finish_job(
            db, job["id"], lease_token=lease_token, status=status, error=detail,
        )
        processed += 1
        failed += int(status == "failed")


def _execute_command(command: list[str], cwd: Path) -> tuple[int, str]:
    completed = subprocess.run(
        command, cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    if completed.stdout:
        print(completed.stdout, end="")
    return int(completed.returncode), completed.stdout or ""
