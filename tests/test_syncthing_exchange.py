from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from runner.models.reprocessing import FactoryCommandV1
from runner.pipeline.factory_controller import simulate_three_documents
from runner.pipeline.factory_messages import scan_checksum_pairs
from runner.pipeline.syncthing_exchange import (
    assert_clean_transfer_tree,
    forbidden_mutable_members,
    load_factory_receipts,
    observe_receipts,
    publish_exchange_json,
    scan_factory_commands,
    verified_json_messages,
)


NOW = datetime(2026, 8, 11, tzinfo=timezone.utc)


def test_exchange_publication_is_checksum_bound_and_idempotent(tmp_path):
    first = publish_exchange_json(tmp_path, "messages/one.json", {"value": 1})
    second = publish_exchange_json(tmp_path, "messages/one.json", {"value": 1})
    assert first["reused"] is False
    assert second["reused"] is True
    assert verified_json_messages(tmp_path, "messages") == [
        ("messages/one.json", {"value": 1}),
    ]
    with pytest.raises(FileExistsError):
        publish_exchange_json(tmp_path, "messages/one.json", {"value": 2})


def test_incomplete_and_corrupted_exchange_messages_never_scan_ready(tmp_path):
    payload = tmp_path / "commands" / "one.json"
    payload.parent.mkdir(parents=True)
    payload.write_text("{}\n", encoding="utf-8")
    scan = scan_checksum_pairs(tmp_path)
    assert scan["ready"] == []
    assert scan["held"][0]["reason"] == (
        "incomplete checksum pair: missing one.json.sha256"
    )

    payload.unlink()
    publish_exchange_json(tmp_path, "commands/one.json", {"value": 1})
    payload.write_text('{"value":2}\n', encoding="utf-8")
    assert scan_checksum_pairs(tmp_path)["ready"] == []
    assert "checksum mismatch" in scan_checksum_pairs(tmp_path)["held"][0]["reason"]


def test_commands_scan_in_sequence_and_reject_unknown_contract_fields(tmp_path):
    late = FactoryCommandV1(
        run_id="run-command", command_id="command-002", sequence=2,
        action="resume", issued_at=NOW, expires_at=NOW + timedelta(hours=1),
        campaign_sha256="a" * 64,
    )
    early = FactoryCommandV1(
        run_id="run-command", command_id="command-001", sequence=1,
        action="start_approved", issued_at=NOW,
        expires_at=NOW + timedelta(hours=1), campaign_sha256="a" * 64,
    )
    publish_exchange_json(tmp_path, "commands/z-late.json", late)
    publish_exchange_json(tmp_path, "commands/a-early.json", early)
    assert [row.sequence for row in scan_factory_commands(tmp_path)] == [1, 2]

    bad = early.model_dump(mode="json")
    bad["model_authority"] = True
    publish_exchange_json(tmp_path, "commands/bad.json", bad)
    with pytest.raises(ValueError, match="invalid factory command"):
        scan_factory_commands(tmp_path)


def test_receipt_only_observer_matches_terminal_runtime_without_database_access(tmp_path):
    report = simulate_three_documents(tmp_path, run_id="synthetic-observer-test")
    from_studio = tmp_path / "exchange" / "from-mac-studio"
    receipts = load_factory_receipts(from_studio)
    projection = observe_receipts(from_studio, run_id="synthetic-observer-test")
    states = {row.entity_id: row.state for row in projection.documents}
    assert states == {
        "fixture-good-a": "succeeded",
        "fixture-good-b": "succeeded",
        "fixture-poison": "held",
    }
    assert projection.projection_sha256 == report["studio_projection_sha256"]
    assert projection.last_sequence == len(receipts)
    assert projection.valid


@pytest.mark.parametrize(
    "relative",
    [
        "state/worker.db", "state/worker.sqlite-wal", "state/job.sqlite3-shm",
        "state/process.pid", "locks/worker.lock", "secrets/api_secret.json",
    ],
)
def test_shared_tree_detects_database_lock_pid_and_secret_members(tmp_path, relative):
    path = tmp_path / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"synthetic")
    assert forbidden_mutable_members(tmp_path) == (relative,)
    with pytest.raises(ValueError, match="forbidden mutable"):
        assert_clean_transfer_tree(tmp_path)


def test_runtime_transfer_trees_contain_no_mutable_database_files(tmp_path):
    report = simulate_three_documents(tmp_path, run_id="synthetic-clean-tree-test")
    assert report["shared_tree_database_files"] == []
    assert forbidden_mutable_members(tmp_path / "exchange" / "to-mac-studio") == ()
    assert forbidden_mutable_members(tmp_path / "exchange" / "from-mac-studio") == ()
    assert (
        tmp_path / "studio-local" / "synthetic-clean-tree-test" / "worker.db"
    ).is_file()
    assert not list((tmp_path / "exchange").rglob("*.db"))


def test_run_scoped_command_and_receipt_injection_is_rejected(tmp_path):
    command = FactoryCommandV1(
        run_id="run-alpha", command_id="command-alpha", sequence=1,
        action="start_approved", issued_at=NOW,
        expires_at=NOW + timedelta(hours=1), campaign_sha256="a" * 64,
    )
    publish_exchange_json(tmp_path, "commands/run-beta/000001-command-alpha.json", command)
    with pytest.raises(ValueError, match="cross-run command"):
        scan_factory_commands(tmp_path, run_id="run-beta")
