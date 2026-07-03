"""Focused tests for the single-heavy-job app lock + Mac Studio error note.

These guard the safety mechanism that prevents two heavy LLM jobs (live batch +
complement enrichment) from running at once. Pure filesystem/process logic — no
Streamlit session, no network.

Every test that reads/writes/clears monkeypatches ``_app_job_lock_path`` to a
tmp file so the researcher's real ``exports/app_jobs/active_llm_job.json`` is
never touched.
"""
from __future__ import annotations

import json
import os

import pytest

import runner.app as app_mod


@pytest.fixture
def lock_path(tmp_path, monkeypatch):
    p = tmp_path / "app_jobs" / "active_llm_job.json"
    monkeypatch.setattr(app_mod, "_app_job_lock_path", lambda: p)
    return p


# ---------------------------------------------------------------------------
# _pid_is_running
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("bad", [None, 0, -1, "", "not-a-pid", "  "])
def test_pid_is_running_false_for_invalid(bad):
    assert app_mod._pid_is_running(bad) is False


def test_pid_is_running_true_for_current_process():
    assert app_mod._pid_is_running(os.getpid()) is True


def test_pid_is_running_accepts_numeric_string():
    assert app_mod._pid_is_running(str(os.getpid())) is True


def test_pid_is_running_false_when_process_absent(monkeypatch):
    def _raise(_pid, _sig):
        raise ProcessLookupError

    monkeypatch.setattr(app_mod.os, "kill", _raise)
    assert app_mod._pid_is_running(424242) is False


def test_pid_is_running_true_on_permission_error(monkeypatch):
    """A PID owned by another user exists but EPERM — treat as running."""
    def _raise(_pid, _sig):
        raise PermissionError

    monkeypatch.setattr(app_mod.os, "kill", _raise)
    assert app_mod._pid_is_running(424242) is True


# ---------------------------------------------------------------------------
# _write_app_job_lock / _read_app_job_lock
# ---------------------------------------------------------------------------

def test_read_returns_none_when_missing(lock_path):
    assert not lock_path.exists()
    assert app_mod._read_app_job_lock() is None


def test_write_then_read_roundtrip_live_pid(lock_path):
    job = {
        "process": object(),  # non-serialisable; must be dropped
        "pid": os.getpid(),
        "kind": "batch",
        "mode": "live",
        "started_at": "T",
        "log_path": "/tmp/x.log",
        "command": "runner batch-run --execute",
    }
    app_mod._write_app_job_lock(job)
    assert lock_path.exists()

    data = app_mod._read_app_job_lock()
    assert data is not None
    assert data["pid"] == os.getpid()
    assert data["kind"] == "batch"
    assert data["mode"] == "live"
    assert data["command"] == "runner batch-run --execute"


def test_write_persists_only_whitelisted_fields(lock_path):
    job = {
        "process": object(),
        "pid": os.getpid(),
        "kind": "enrichment",
        "mode": "single",
        "started_at": "T",
        "log_path": "L",
        "command": "C",
        "secret": "should-not-persist",
    }
    app_mod._write_app_job_lock(job)
    raw = json.loads(lock_path.read_text(encoding="utf-8"))
    assert set(raw.keys()) == {
        "pid",
        "kind",
        "mode",
        "started_at",
        "log_path",
        "command",
        "item_count",
        "label",
    }
    assert "process" not in raw
    assert "secret" not in raw


def test_read_clears_corrupt_lock(lock_path):
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    lock_path.write_text("{not json", encoding="utf-8")

    assert app_mod._read_app_job_lock() is None
    assert not lock_path.exists()  # corrupt lock removed so the app is not wedged


def test_read_clears_stale_dead_pid_lock(lock_path, monkeypatch):
    app_mod._write_app_job_lock({"pid": os.getpid(), "kind": "batch", "mode": "live"})
    monkeypatch.setattr(app_mod, "_pid_is_running", lambda _pid: False)

    assert app_mod._read_app_job_lock() is None
    assert not lock_path.exists()  # stale lock from a crashed job is cleared


def test_read_keeps_live_pid_lock(lock_path, monkeypatch):
    app_mod._write_app_job_lock({"pid": 999, "kind": "batch", "mode": "live"})
    monkeypatch.setattr(app_mod, "_pid_is_running", lambda _pid: True)

    data = app_mod._read_app_job_lock()
    assert data is not None
    assert data["pid"] == 999
    assert lock_path.exists()  # an active job's lock is preserved


# ---------------------------------------------------------------------------
# _clear_app_job_lock
# ---------------------------------------------------------------------------

def test_clear_no_file_is_noop(lock_path):
    assert not lock_path.exists()
    app_mod._clear_app_job_lock()              # must not raise
    app_mod._clear_app_job_lock({"pid": 1})    # must not raise
    assert not lock_path.exists()


def test_clear_without_job_removes_file(lock_path):
    app_mod._write_app_job_lock({"pid": os.getpid()})
    app_mod._clear_app_job_lock()
    assert not lock_path.exists()


def test_clear_matching_pid_removes_file(lock_path):
    app_mod._write_app_job_lock({"pid": os.getpid()})
    app_mod._clear_app_job_lock({"pid": os.getpid()})
    assert not lock_path.exists()


def test_clear_non_matching_pid_keeps_file(lock_path):
    """A different job must not clear someone else's active lock."""
    app_mod._write_app_job_lock({"pid": os.getpid()})
    app_mod._clear_app_job_lock({"pid": os.getpid() + 1})
    assert lock_path.exists()


def test_clear_corrupt_lock_removes_file(lock_path):
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    lock_path.write_text("{bad", encoding="utf-8")
    app_mod._clear_app_job_lock({"pid": os.getpid()})
    assert not lock_path.exists()


# ---------------------------------------------------------------------------
# _remote_service_error_note (Mac Studio proxy failure hints)
# ---------------------------------------------------------------------------

def test_remote_service_error_note_dns_failure_mentions_magicdns():
    note = app_mod._remote_service_error_note(
        "LiteLLM", "https://host.ts.net:4000", "nodename nor servname provided"
    )
    assert "MagicDNS" in note
    assert "host.ts.net" in note


def test_remote_service_error_note_timeout():
    note = app_mod._remote_service_error_note(
        "LiteLLM", "https://host.ts.net:4000", "Read timed out"
    )
    assert "timed out" in note.lower()


def test_remote_service_error_note_auth_rejection():
    note = app_mod._remote_service_error_note(
        "model-control", "https://host:11555", "403 Forbidden"
    )
    assert "rejected the request" in note


def test_remote_service_error_note_generic_passthrough():
    note = app_mod._remote_service_error_note(
        "LiteLLM", "https://host:4000", "some other error"
    )
    assert note == "LiteLLM: some other error"


def test_remote_service_error_note_no_detail():
    note = app_mod._remote_service_error_note("LiteLLM", "https://host:4000", None)
    assert note == "LiteLLM: unreachable"


# ---------------------------------------------------------------------------
# _request_stop_app_job
# ---------------------------------------------------------------------------

class _FakeRunningProcess:
    pid = 12345

    def __init__(self):
        self.terminated = False

    def poll(self):
        return None

    def terminate(self):
        self.terminated = True


class _FakeFinishedProcess:
    pid = 12345

    def poll(self):
        return 0

    def terminate(self):  # pragma: no cover - should not be called
        raise AssertionError("terminate should not be called")


def test_request_stop_app_job_terminates_live_process_object():
    proc = _FakeRunningProcess()

    message = app_mod._request_stop_app_job({"process": proc, "kind": "source-queue-triage"})

    assert proc.terminated is True
    assert "Stop requested" in message
    assert "12345" in message


def test_request_stop_app_job_reports_finished_process_object():
    message = app_mod._request_stop_app_job({"process": _FakeFinishedProcess(), "kind": "source-queue-triage"})

    assert "already finished" in message


def test_request_stop_app_job_kills_pid_from_recovered_lock(monkeypatch):
    calls = []

    monkeypatch.setattr(app_mod, "_pid_is_running", lambda _pid: True)
    monkeypatch.setattr(app_mod.os, "kill", lambda pid, sig: calls.append((pid, sig)))

    message = app_mod._request_stop_app_job({"pid": "999", "kind": "source-queue-triage"})

    assert calls == [(999, app_mod.signal.SIGTERM)]
    assert "999" in message


def test_request_stop_app_job_handles_stale_or_invalid_pid(monkeypatch):
    monkeypatch.setattr(app_mod, "_pid_is_running", lambda _pid: False)

    assert "No valid process id" in app_mod._request_stop_app_job({"pid": ""})
    assert "no longer running" in app_mod._request_stop_app_job({"pid": "999"})
