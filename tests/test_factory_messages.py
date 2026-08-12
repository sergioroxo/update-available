from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from runner.models.reprocessing import (
    FactoryCommandV1,
    FactoryEventV1,
    FactoryReceiptV1,
    SourceObjectV1,
)
from runner.pipeline import factory_messages


NOW = datetime(2026, 8, 11, 12, 0, tzinfo=timezone.utc)


def _event() -> FactoryEventV1:
    return FactoryEventV1(
        run_id="run-002", event_id="event-001", sequence=1,
        entity_kind="campaign", entity_id="run-002",
        from_state="pending", to_state="ready", attempt=0,
        occurred_at=NOW, worker_id="studio-one",
    )


def test_strict_versioned_command_event_receipt_and_source_object_contracts():
    command = FactoryCommandV1(
        run_id="run-002", command_id="command-001", sequence=1,
        action="start_approved", issued_at=NOW, expires_at=NOW + timedelta(hours=1),
        campaign_sha256="a" * 64,
    )
    receipt = FactoryReceiptV1(
        receipt_id="receipt-001", event=_event(), received_at=NOW,
    )
    source = SourceObjectV1(
        source_sha256="b" * 64, bytes=7, media_type="text/plain",
        safe_extension="txt",
        relative_object_path=f"sources/sha256/bb/{'b' * 64}/source.txt",
        acquired_at=NOW, acquisition_type="copied_fixture",
        provenance_sha256="c" * 64,
    )
    assert command.schema_version == "factory-command-v1.0"
    assert receipt.schema_version == "factory-receipt-v1.0"
    assert source.verification_status == "verified"
    with pytest.raises(ValidationError, match="Extra inputs"):
        FactoryReceiptV1(
            receipt_id="receipt-001", event=_event(), received_at=NOW,
            raw_research_text="forbidden",
        )


@pytest.mark.parametrize(
    "member",
    [
        "/absolute.json", "../escape.json", "commands\\escape.json",
        "state/source_queue.db", "state/worker.sqlite3", "state/live.sqlite-wal",
        "state/live.db-journal", "indexes/current/index.sqlite3",
        "indexes/current/vectors.hnsw", "messages/api_key.json",
    ],
)
def test_transfer_contract_rejects_unsafe_mutable_and_secret_members(member):
    with pytest.raises(ValueError):
        factory_messages.validate_transfer_member(member)


def test_closed_index_archive_and_relative_message_are_allowed():
    assert factory_messages.validate_transfer_member("commands/run-002/0001.json")
    assert factory_messages.validate_transfer_member("indexes/index-v1.tar.gz")
    assert factory_messages.validate_transfer_member("indexes/index-v1.tar.gz.sha256")


def test_atomic_sidecar_boundary_publish_verify_and_idempotent_reuse(tmp_path):
    path = tmp_path / "command.json"
    payload = {"schema_version": "synthetic-v1.0", "value": 1}
    first = factory_messages.publish_checksum_bound_json(payload, path)
    second = factory_messages.publish_checksum_bound_json(payload, path)
    assert first["complete"] is True and first["reused"] is False
    assert second["complete"] is True and second["reused"] is True
    assert factory_messages.scan_checksum_pairs(tmp_path)["held"] == []


def test_publication_failure_before_sidecar_is_never_scanner_ready(tmp_path, monkeypatch):
    path = tmp_path / "event.json"
    real_write = factory_messages.atomic_write_bytes
    calls = 0

    def fail_sidecar(target, data):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise OSError("synthetic disk full")
        return real_write(target, data)

    monkeypatch.setattr(factory_messages, "atomic_write_bytes", fail_sidecar)
    with pytest.raises(OSError, match="disk full"):
        factory_messages.publish_checksum_bound_json({"value": 1}, path)
    assert path.is_file()
    assert not factory_messages.checksum_sidecar_path(path).exists()
    scan = factory_messages.scan_checksum_pairs(tmp_path)
    assert scan["ready"] == []
    assert "incomplete checksum pair" in scan["held"][0]["reason"]


def test_checksum_tamper_and_incomplete_sidecar_are_rejected(tmp_path):
    path = tmp_path / "receipt.json"
    factory_messages.publish_checksum_bound_json({"value": 1}, path)
    path.write_text('{"value":2}\n', encoding="utf-8")
    with pytest.raises(ValueError, match="checksum mismatch"):
        factory_messages.verify_checksum_pair(path)

    other = tmp_path / "event.json"
    other.write_text("{}\n", encoding="utf-8")
    sidecar = factory_messages.checksum_sidecar_path(other)
    sidecar.write_text("0" * 64, encoding="utf-8")
    with pytest.raises(ValueError, match="incomplete checksum sidecar"):
        factory_messages.verify_checksum_pair(other)


def test_orphan_checksum_sidecar_is_explicitly_held(tmp_path):
    sidecar = tmp_path / "event.json.sha256"
    sidecar.write_text(f"{'0' * 64}  event.json\n", encoding="utf-8")

    scan = factory_messages.scan_checksum_pairs(tmp_path)

    assert scan["ready"] == []
    assert scan["held"] == [{
        "relative_path": "event.json.sha256",
        "reason": "incomplete checksum pair: missing event.json",
    }]
