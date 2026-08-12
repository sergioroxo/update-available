"""Durable SQLite-backed, no-model factory worker for the Phase-2A slice."""
from __future__ import annotations

import json
import argparse
import sqlite3
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Protocol

from runner.models.reprocessing import (
    FactoryCommandV1,
    FactoryEventV1,
    FactoryReceiptV1,
    FactoryResultEvidenceV1,
    RecoveryUnitManifestV1,
    ResearchCampaignV2,
)
from .atomic_io import atomic_write_bytes
from .factory_messages import (
    canonical_json_bytes,
    publish_checksum_bound_json,
    sha256_bytes,
    verify_checksum_pair,
)
from .factory_state import FactoryProjection, project_factory_receipts
from .syncthing_exchange import (
    assert_clean_transfer_tree,
    load_factory_receipts,
    publish_exchange_json,
    scan_factory_commands,
)


STATION_ID = "synthetic_prepare"
SYNTHETIC_TIME = datetime(2026, 8, 11, tzinfo=timezone.utc)


class SyntheticCrash(RuntimeError):
    pass


class LeaseRejected(RuntimeError):
    pass


class StationExecutor(Protocol):
    version: str

    def execute(self, *, document_id: str, source_sha256: str, attempt: int) -> bytes: ...


@dataclass
class SyntheticNoModelExecutor:
    poison_document_ids: frozenset[str] = frozenset()
    version: str = "synthetic-no-model-v1.0"
    invocations: dict[str, int] = field(default_factory=dict)

    def execute(self, *, document_id: str, source_sha256: str, attempt: int) -> bytes:
        self.invocations[document_id] = self.invocations.get(document_id, 0) + 1
        if document_id in self.poison_document_ids:
            raise ValueError("synthetic_injected_failure")
        return canonical_json_bytes({
            "schema_version": "synthetic-station-output-v1.0",
            "document_id": document_id,
            "source_sha256": source_sha256,
            "attempt": attempt,
            "executor_version": self.version,
        })


def _inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


class WorkerStore:
    def __init__(self, database_path: Path, *, shared_roots: tuple[Path, Path]):
        self.path = Path(database_path)
        if any(_inside(self.path, root) for root in shared_roots):
            raise ValueError("worker database must be outside shared transfer trees")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(self.path)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA journal_mode=DELETE")
        self.connection.execute("PRAGMA foreign_keys=ON")
        self._migrate()

    def close(self) -> None:
        self.connection.close()

    def _migrate(self) -> None:
        self.connection.executescript("""
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY, value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS jobs (
          run_id TEXT NOT NULL, package_id TEXT NOT NULL, package_sequence INTEGER NOT NULL,
          document_id TEXT NOT NULL, station_id TEXT NOT NULL, source_sha256 TEXT NOT NULL,
          source_relative_path TEXT NOT NULL, input_fingerprint TEXT NOT NULL,
          state TEXT NOT NULL, attempt INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL,
          lease_token TEXT, lease_expiry TEXT, heartbeat_time TEXT,
          output_sha256 TEXT NOT NULL DEFAULT '', terminal_reason TEXT NOT NULL DEFAULT '',
          last_emitted_event_sequence INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (run_id, package_id, document_id, station_id)
        );
        CREATE TABLE IF NOT EXISTS commands (
          command_id TEXT PRIMARY KEY, payload_sha256 TEXT NOT NULL, sequence INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS events (
          sequence INTEGER PRIMARY KEY, receipt_id TEXT UNIQUE NOT NULL,
          entity_kind TEXT NOT NULL, entity_id TEXT NOT NULL, station_id TEXT NOT NULL,
          to_state TEXT NOT NULL, receipt_json TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0
        );
        """)
        self.connection.commit()

    def set_meta(self, key: str, value: str) -> None:
        self.connection.execute(
            "INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, value),
        )
        self.connection.commit()

    def get_meta(self, key: str, default: str = "") -> str:
        row = self.connection.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
        return str(row[0]) if row else default

    def initialize_jobs(
        self, campaign: ResearchCampaignV2, packages: tuple[RecoveryUnitManifestV1, ...],
    ) -> None:
        with self.connection:
            for package in sorted(packages, key=lambda row: row.package_sequence):
                for job in package.documents:
                    existing = self.connection.execute(
                        "SELECT input_fingerprint FROM jobs WHERE run_id=? AND package_id=? AND document_id=? AND station_id=?",
                        (campaign.run_id, package.package_id, job.document_id, job.station_id),
                    ).fetchone()
                    if existing and existing[0] != job.input_fingerprint:
                        raise ValueError("existing job input fingerprint changed")
                    self.connection.execute("""
                    INSERT OR IGNORE INTO jobs(
                      run_id,package_id,package_sequence,document_id,station_id,
                      source_sha256,source_relative_path,input_fingerprint,state,max_attempts
                    ) VALUES(?,?,?,?,?,?,?,?,?,?)
                    """, (
                        campaign.run_id, package.package_id, package.package_sequence,
                        job.document_id, job.station_id, job.source_reference.source_sha256,
                        job.source_reference.relative_object_path, job.input_fingerprint,
                        "pending", job.max_attempts,
                    ))
        self.set_meta("run_id", campaign.run_id)

    def apply_command(
        self, command: FactoryCommandV1, *, campaign_sha256: str, now: datetime,
    ) -> bool:
        payload_hash = sha256_bytes(canonical_json_bytes(command))
        existing = self.connection.execute(
            "SELECT payload_sha256 FROM commands WHERE command_id=?", (command.command_id,),
        ).fetchone()
        if existing:
            if existing[0] != payload_hash:
                raise ValueError("duplicate command ID has conflicting payload")
            return False
        if command.run_id != self.get_meta("run_id") or command.campaign_sha256 != campaign_sha256:
            return False
        if now < command.issued_at or now >= command.expires_at:
            return False
        last = int(self.get_meta("last_command_sequence", "0"))
        if command.sequence <= last:
            return False
        with self.connection:
            self.connection.execute(
                "INSERT INTO commands(command_id,payload_sha256,sequence) VALUES(?,?,?)",
                (command.command_id, payload_hash, command.sequence),
            )
            self.connection.execute(
                "INSERT INTO meta(key,value) VALUES('last_command_sequence',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (str(command.sequence),),
            )
            if command.action in {"start_approved", "resume"}:
                for key, value in (("approved", "1"), ("paused", "0")):
                    self.connection.execute(
                        "INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                        (key, value),
                    )
            elif command.action == "pause_after_current":
                self.connection.execute(
                    "INSERT INTO meta(key,value) VALUES('paused','1') ON CONFLICT(key) DO UPDATE SET value='1'"
                )
            elif command.action == "cancel_unstarted":
                self.connection.execute(
                    "INSERT INTO meta(key,value) VALUES('cancelled','1') ON CONFLICT(key) DO UPDATE SET value='1'"
                )
        return True

    def control(self) -> tuple[bool, bool, bool]:
        return (
            self.get_meta("approved", "0") == "1",
            self.get_meta("paused", "0") == "1",
            self.get_meta("cancelled", "0") == "1",
        )

    def recover_expired(self, now: datetime) -> int:
        with self.connection:
            cursor = self.connection.execute(
                "UPDATE jobs SET state='ready',lease_token=NULL,lease_expiry=NULL,heartbeat_time=NULL "
                "WHERE state='running' AND output_sha256='' AND lease_expiry IS NOT NULL AND lease_expiry<=?",
                (now.isoformat(),),
            )
        return cursor.rowcount

    def claim(self, now: datetime, lease_seconds: int = 30) -> sqlite3.Row | None:
        self.recover_expired(now)
        approved, paused, cancelled = self.control()
        if not approved or paused or cancelled:
            return None
        with self.connection:
            row = self.connection.execute(
                "SELECT * FROM jobs WHERE state IN ('pending','ready') "
                "ORDER BY package_sequence,document_id,station_id LIMIT 1"
            ).fetchone()
            if row is None:
                return None
            token = uuid.uuid4().hex
            expiry = (now + timedelta(seconds=lease_seconds)).isoformat()
            attempt = int(row["attempt"]) + 1
            self.connection.execute(
                "UPDATE jobs SET state='running',attempt=?,lease_token=?,lease_expiry=?,heartbeat_time=? "
                "WHERE run_id=? AND package_id=? AND document_id=? AND station_id=?",
                (attempt, token, expiry, now.isoformat(), row["run_id"], row["package_id"], row["document_id"], row["station_id"]),
            )
        return self.connection.execute(
            "SELECT * FROM jobs WHERE run_id=? AND package_id=? AND document_id=? AND station_id=?",
            (row["run_id"], row["package_id"], row["document_id"], row["station_id"]),
        ).fetchone()

    def _lease(self, row: sqlite3.Row, token: str, now: datetime) -> None:
        current = self.connection.execute(
            "SELECT lease_token,lease_expiry,state FROM jobs WHERE run_id=? AND package_id=? AND document_id=? AND station_id=?",
            (row["run_id"], row["package_id"], row["document_id"], row["station_id"]),
        ).fetchone()
        if not current or current[2] != "running" or current[0] != token:
            raise LeaseRejected("stale lease token")
        if not current[1] or datetime.fromisoformat(current[1]) <= now:
            raise LeaseRejected("lease expired")

    def heartbeat(self, row: sqlite3.Row, token: str, now: datetime, lease_seconds: int = 30) -> None:
        self._lease(row, token, now)
        with self.connection:
            self.connection.execute(
                "UPDATE jobs SET heartbeat_time=?,lease_expiry=? WHERE run_id=? AND package_id=? AND document_id=? AND station_id=?",
                (now.isoformat(), (now + timedelta(seconds=lease_seconds)).isoformat(), row["run_id"], row["package_id"], row["document_id"], row["station_id"]),
            )

    def record_output(self, row: sqlite3.Row, token: str, now: datetime, output_hash: str) -> None:
        self._lease(row, token, now)
        with self.connection:
            self.connection.execute(
                "UPDATE jobs SET output_sha256=? WHERE run_id=? AND package_id=? AND document_id=? AND station_id=?",
                (output_hash, row["run_id"], row["package_id"], row["document_id"], row["station_id"]),
            )

    def finalize_success(self, row: sqlite3.Row, token: str, now: datetime) -> None:
        self._lease(row, token, now)
        with self.connection:
            self.connection.execute(
                "UPDATE jobs SET state='succeeded',terminal_reason='',lease_token=NULL,lease_expiry=NULL "
                "WHERE run_id=? AND package_id=? AND document_id=? AND station_id=?",
                (row["run_id"], row["package_id"], row["document_id"], row["station_id"]),
            )

    def finalize_reconciled_success(self, row: sqlite3.Row) -> None:
        with self.connection:
            self.connection.execute(
                "UPDATE jobs SET state='succeeded',terminal_reason='',lease_token=NULL,lease_expiry=NULL "
                "WHERE run_id=? AND package_id=? AND document_id=? AND station_id=?",
                (row["run_id"], row["package_id"], row["document_id"], row["station_id"]),
            )

    def restore_output_hash(self, document_id: str, output_hash: str) -> None:
        with self.connection:
            self.connection.execute(
                "UPDATE jobs SET output_sha256=? WHERE document_id=? AND state='running'",
                (output_hash, document_id),
            )

    def fail_attempt(self, row: sqlite3.Row, token: str, now: datetime, reason: str) -> str:
        self._lease(row, token, now)
        state = "ready" if int(row["attempt"]) < int(row["max_attempts"]) else "held"
        with self.connection:
            self.connection.execute(
                "UPDATE jobs SET state=?,terminal_reason=?,lease_token=NULL,lease_expiry=NULL "
                "WHERE run_id=? AND package_id=? AND document_id=? AND station_id=?",
                (state, reason, row["run_id"], row["package_id"], row["document_id"], row["station_id"]),
            )
        return state

    def jobs(self) -> tuple[sqlite3.Row, ...]:
        return tuple(self.connection.execute(
            "SELECT * FROM jobs ORDER BY package_sequence,document_id,station_id"
        ).fetchall())

    def job(self, document_id: str) -> sqlite3.Row:
        row = self.connection.execute("SELECT * FROM jobs WHERE document_id=?", (document_id,)).fetchone()
        if row is None:
            raise KeyError(document_id)
        return row

    def next_sequence(self) -> int:
        return int(self.connection.execute("SELECT COALESCE(MAX(sequence),0)+1 FROM events").fetchone()[0])

    def add_receipt(self, receipt: FactoryReceiptV1) -> None:
        event = receipt.event
        with self.connection:
            self.connection.execute(
                "INSERT INTO events(sequence,receipt_id,entity_kind,entity_id,station_id,to_state,receipt_json) VALUES(?,?,?,?,?,?,?)",
                (event.sequence, receipt.receipt_id, event.entity_kind, event.entity_id,
                 event.station_id, event.to_state, receipt.model_dump_json()),
            )
            if event.entity_kind == "document":
                self.connection.execute(
                    "UPDATE jobs SET last_emitted_event_sequence=? WHERE document_id=? AND station_id=?",
                    (event.sequence, event.document_id, event.station_id),
                )

    def import_published_receipts(
        self, receipts: tuple[FactoryReceiptV1, ...], *, run_id: str,
    ) -> None:
        """Rebuild local job state from verified append-only transfer evidence."""
        if self.receipts():
            raise ValueError("receipt reconstruction requires an empty local event store")
        projection = project_factory_receipts(receipts, run_id=run_id)
        if not projection.valid:
            raise ValueError("cannot reconstruct worker state from invalid receipts")
        with self.connection:
            for receipt in receipts:
                event = receipt.event
                self.connection.execute(
                    "INSERT INTO events(sequence,receipt_id,entity_kind,entity_id,station_id,to_state,receipt_json,published) "
                    "VALUES(?,?,?,?,?,?,?,1)",
                    (
                        event.sequence, receipt.receipt_id, event.entity_kind,
                        event.entity_id, event.station_id, event.to_state,
                        receipt.model_dump_json(),
                    ),
                )
                if event.entity_kind != "document":
                    continue
                terminal_reason = (
                    event.error_class if event.to_state in {"held", "failed"} else ""
                )
                self.connection.execute(
                    "UPDATE jobs SET state=?,attempt=?,"
                    "output_sha256=CASE WHEN ?='' THEN output_sha256 ELSE ? END,"
                    "terminal_reason=?,last_emitted_event_sequence=?,"
                    "lease_token=NULL,lease_expiry=NULL "
                    "WHERE document_id=? AND station_id=?",
                    (
                        event.to_state, event.attempt, event.output_sha256,
                        event.output_sha256, terminal_reason, event.sequence,
                        event.document_id, event.station_id,
                    ),
                )

    def receipts(self) -> tuple[FactoryReceiptV1, ...]:
        return tuple(
            FactoryReceiptV1.model_validate_json(row[0])
            for row in self.connection.execute("SELECT receipt_json FROM events ORDER BY sequence")
        )

    def unpublished_receipts(self) -> tuple[FactoryReceiptV1, ...]:
        return tuple(
            FactoryReceiptV1.model_validate_json(row[0])
            for row in self.connection.execute("SELECT receipt_json FROM events WHERE published=0 ORDER BY sequence")
        )

    def mark_published(self, sequence: int) -> None:
        with self.connection:
            self.connection.execute("UPDATE events SET published=1 WHERE sequence=?", (sequence,))

    def has_terminal_event(self, document_id: str) -> bool:
        row = self.connection.execute(
            "SELECT 1 FROM events WHERE entity_kind='document' AND entity_id=? AND to_state='succeeded'",
            (document_id,),
        ).fetchone()
        return row is not None

    def expire_lease_for_test(self, document_id: str) -> tuple[sqlite3.Row, str]:
        row = self.job(document_id)
        token = str(row["lease_token"])
        with self.connection:
            self.connection.execute(
                "UPDATE jobs SET lease_expiry=? WHERE document_id=?",
                ((SYNTHETIC_TIME - timedelta(seconds=1)).isoformat(), document_id),
            )
        return row, token

    def verify_expired_lease_fence(self, now: datetime) -> bool:
        """Exercise an expired late commit on an isolated local probe row."""
        probe = ("lease-probe", "lease-probe", "lease-probe", STATION_ID)
        token = uuid.uuid4().hex
        with self.connection:
            self.connection.execute("""
            INSERT OR REPLACE INTO jobs(
              run_id,package_id,package_sequence,document_id,station_id,
              source_sha256,source_relative_path,input_fingerprint,state,attempt,max_attempts,
              lease_token,lease_expiry,heartbeat_time
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (*probe[:2], 999, probe[2], probe[3], "0" * 64,
                  "sources/sha256/00/" + "0" * 64 + "/source.bin", "1" * 64,
                  "running", 1, 1, token, (now - timedelta(seconds=1)).isoformat(),
                  (now - timedelta(seconds=2)).isoformat()))
        row = self.job("lease-probe")
        rejected = False
        try:
            self.record_output(row, token, now, "2" * 64)
        except LeaseRejected:
            rejected = True
        finally:
            with self.connection:
                self.connection.execute("DELETE FROM jobs WHERE document_id='lease-probe'")
        return rejected


class ReprocessingWorker:
    def __init__(
        self,
        *,
        to_studio: Path,
        from_studio: Path,
        state_dir: Path,
        executor: StationExecutor,
        run_id: str | None = None,
        now: datetime = SYNTHETIC_TIME,
    ):
        self.to_studio = Path(to_studio)
        self.from_studio = Path(from_studio)
        self.state_dir = Path(state_dir)
        self.executor = executor
        self.run_id = run_id
        self.now = now
        self.store = WorkerStore(
            self.state_dir / "worker.db", shared_roots=(self.to_studio, self.from_studio),
        )
        self.campaign: ResearchCampaignV2 | None = None
        self.packages: tuple[RecoveryUnitManifestV1, ...] = ()
        self.campaign_sha256 = ""

    def close(self) -> None:
        self.store.close()

    def ingest(self) -> None:
        if not self.run_id:
            from .syncthing_exchange import discover_campaign_ids
            runs = discover_campaign_ids(self.to_studio)
            if len(runs) != 1:
                raise ValueError("run_id is required when shared roots contain multiple campaigns")
            self.run_id = runs[0]
        campaign_relative = f"campaigns/{self.run_id}/campaign.json"
        campaign_path = self.to_studio / campaign_relative
        verified = verify_checksum_pair(campaign_path, relative_path=campaign_relative)
        campaign = ResearchCampaignV2.model_validate_json(campaign_path.read_bytes())
        if campaign.run_id != self.run_id:
            raise ValueError("cross-run campaign path injection")
        packages: list[RecoveryUnitManifestV1] = []
        for package_id in campaign.package_ids:
            relative = f"campaigns/{self.run_id}/packages/{package_id}.json"
            path = self.to_studio / relative
            verify_checksum_pair(path, relative_path=relative)
            package = RecoveryUnitManifestV1.model_validate_json(path.read_bytes())
            if package.run_id != self.run_id:
                raise ValueError("cross-run package path injection")
            packages.append(package)
        validate_campaign_packages(campaign, tuple(packages))
        for ref in campaign.source_references:
            verify_checksum_pair(
                self.to_studio / ref.relative_object_path,
                relative_path=ref.relative_object_path,
            )
        self.campaign = campaign
        self.packages = tuple(packages)
        self.campaign_sha256 = verified["sha256"]
        local_receipts_were_empty = not self.store.receipts()
        self.store.initialize_jobs(campaign, self.packages)
        transferred_receipts = load_factory_receipts(self.from_studio, run_id=self.run_id)
        if local_receipts_were_empty and transferred_receipts:
            self.store.import_published_receipts(
                transferred_receipts, run_id=campaign.run_id,
            )
            self._restore_transferred_outputs()
        for command in scan_factory_commands(self.to_studio, run_id=self.run_id):
            self.store.apply_command(command, campaign_sha256=self.campaign_sha256, now=self.now)

    def _emit(
        self, *, entity_kind: str, entity_id: str, from_state: str, to_state: str,
        attempt: int = 0, document_id: str = "", output_sha256: str = "",
        error_class: str = "",
    ) -> FactoryReceiptV1:
        assert self.campaign is not None
        sequence = self.store.next_sequence()
        occurred = SYNTHETIC_TIME + timedelta(seconds=sequence)
        event = FactoryEventV1(
            run_id=self.campaign.run_id,
            event_id=f"event-{sequence:06d}",
            sequence=sequence,
            entity_kind=entity_kind,
            entity_id=entity_id,
            station_id=(STATION_ID if entity_kind in {"station", "document"} else ""),
            document_id=(document_id if entity_kind == "document" else ""),
            from_state=from_state,
            to_state=to_state,
            attempt=attempt,
            occurred_at=occurred,
            worker_id="studio-worker-007",
            input_fingerprint=(self.store.job(document_id)["input_fingerprint"] if document_id else ""),
            output_sha256=output_sha256,
            error_class=error_class,
        )
        receipt = FactoryReceiptV1(
            receipt_id=f"receipt-{sequence:06d}", event=event, received_at=occurred,
        )
        self.store.add_receipt(receipt)
        return receipt

    def publish_pending(self) -> int:
        count = 0
        for receipt in self.store.unpublished_receipts():
            sequence = receipt.event.sequence
            publish_exchange_json(
                self.from_studio,
                f"campaigns/{receipt.event.run_id}/events/{sequence:06d}-{receipt.event.event_id}.json",
                receipt.event,
            )
            publish_exchange_json(
                self.from_studio,
                f"campaigns/{receipt.event.run_id}/receipts/{sequence:06d}-{receipt.receipt_id}.json",
                receipt,
            )
            self.store.mark_published(sequence)
            count += 1
        return count

    def _start_entities(self) -> bool:
        if self.store.receipts():
            return False
        approved, paused, cancelled = self.store.control()
        if not approved or paused or cancelled:
            return False
        assert self.campaign is not None
        self._emit(entity_kind="campaign", entity_id=self.campaign.run_id, from_state="pending", to_state="running")
        self._emit(entity_kind="station", entity_id=STATION_ID, from_state="pending", to_state="running")
        self.publish_pending()
        return True

    def _local_output_path(self, row: sqlite3.Row) -> Path:
        return self.state_dir / "outputs" / row["document_id"] / "result.json"

    def _publish_result(self, row: sqlite3.Row, output_hash: str) -> None:
        payload = FactoryResultEvidenceV1(
            run_id=row["run_id"], package_id=row["package_id"],
            document_id=row["document_id"], station_id=row["station_id"],
            attempt=row["attempt"], source_sha256=row["source_sha256"],
            input_fingerprint=row["input_fingerprint"], output_sha256=output_hash,
            executor_version=self.executor.version,
            completed_at=SYNTHETIC_TIME + timedelta(seconds=100),
        )
        publish_exchange_json(
            self.from_studio,
            f"campaigns/{row['run_id']}/results/{row['document_id']}/result.json",
            payload,
        )

    def _restore_transferred_outputs(self) -> None:
        for row in self.store.jobs():
            if row["state"] != "running" or row["output_sha256"]:
                continue
            relative = f"campaigns/{row['run_id']}/results/{row['document_id']}/result.json"
            path = self.from_studio / relative
            if not path.exists():
                continue
            verify_checksum_pair(path, relative_path=relative)
            evidence = FactoryResultEvidenceV1.model_validate_json(path.read_bytes())
            expected = {
                "run_id": row["run_id"], "package_id": row["package_id"],
                "document_id": row["document_id"], "station_id": row["station_id"],
                "attempt": row["attempt"], "source_sha256": row["source_sha256"],
                "input_fingerprint": row["input_fingerprint"],
            }
            if any(getattr(evidence, key) != value for key, value in expected.items()):
                raise ValueError("transferred result evidence contradicts reconstructed job")
            self.store.restore_output_hash(row["document_id"], evidence.output_sha256)

    def _reconcile_outputs(self) -> bool:
        progressed = False
        for row in self.store.jobs():
            if row["state"] != "running" or not row["output_sha256"]:
                continue
            self._publish_result(row, row["output_sha256"])
            if not self.store.has_terminal_event(row["document_id"]):
                self._emit(
                    entity_kind="document", entity_id=row["document_id"], document_id=row["document_id"],
                    from_state="running", to_state="succeeded", attempt=row["attempt"],
                    output_sha256=row["output_sha256"],
                )
                self.publish_pending()
            self.store.finalize_reconciled_success(row)
            progressed = True
        return progressed

    def _cancel_unstarted(self) -> bool:
        _, _, cancelled = self.store.control()
        if not cancelled:
            return False
        progressed = False
        for row in self.store.jobs():
            if row["state"] not in {"pending", "ready"}:
                continue
            self._emit(
                entity_kind="document", entity_id=row["document_id"], document_id=row["document_id"],
                from_state=row["state"], to_state="cancelled", attempt=row["attempt"],
            )
            with self.store.connection:
                self.store.connection.execute(
                    "UPDATE jobs SET state='cancelled',terminal_reason='cancel_unstarted' WHERE document_id=?",
                    (row["document_id"],),
                )
            progressed = True
        self.publish_pending()
        return progressed

    def _finish_entities(self) -> bool:
        assert self.campaign is not None
        rows = self.store.jobs()
        if not rows or any(row["state"] not in {"succeeded", "held", "cancelled"} for row in rows):
            return False
        receipts = self.store.receipts()
        if any(r.event.entity_kind == "campaign" and r.event.to_state in {"succeeded", "held", "cancelled"} for r in receipts):
            return False
        terminal = "succeeded" if all(row["state"] == "succeeded" for row in rows) else (
            "cancelled" if all(row["state"] in {"succeeded", "cancelled"} for row in rows) else "held"
        )
        self._emit(entity_kind="station", entity_id=STATION_ID, from_state="running", to_state=terminal)
        self._emit(entity_kind="campaign", entity_id=self.campaign.run_id, from_state="running", to_state=terminal)
        self.publish_pending()
        self.publish_inventory()
        return True

    def run_once(
        self,
        *,
        crash_after_output_document: str = "",
        crash_after_receipt_document: str = "",
    ) -> bool:
        self.ingest()
        self.publish_pending()
        if self._reconcile_outputs():
            self._finish_entities()
            return True
        if self._start_entities():
            return True
        if self._cancel_unstarted():
            self._finish_entities()
            return True
        row = self.store.claim(self.now)
        if row is None:
            return self._finish_entities()
        token = row["lease_token"]
        self._emit(
            entity_kind="document", entity_id=row["document_id"], document_id=row["document_id"],
            from_state=("pending" if row["attempt"] == 1 else "ready"),
            to_state="running", attempt=row["attempt"],
        )
        self.publish_pending()
        try:
            output = self.executor.execute(
                document_id=row["document_id"], source_sha256=row["source_sha256"], attempt=row["attempt"],
            )
        except Exception:
            self._emit(
                entity_kind="document", entity_id=row["document_id"], document_id=row["document_id"],
                from_state="running", to_state=("failed" if row["attempt"] < row["max_attempts"] else "held"),
                attempt=row["attempt"], error_class="synthetic_executor_failure",
            )
            next_state = self.store.fail_attempt(row, token, self.now, "synthetic_executor_failure")
            if next_state == "ready":
                self._emit(
                    entity_kind="document", entity_id=row["document_id"], document_id=row["document_id"],
                    from_state="failed", to_state="ready", attempt=row["attempt"],
                )
            else:
                publish_exchange_json(
                    self.from_studio,
                    f"campaigns/{row['run_id']}/results/{row['document_id']}/held.json",
                    {"schema_version": "factory-held-result-v1.0", "run_id": row["run_id"],
                     "package_id": row["package_id"], "document_id": row["document_id"],
                     "station_id": row["station_id"], "attempt": row["attempt"],
                     "terminal_reason": "synthetic_executor_failure"},
                )
            self.publish_pending()
            self._finish_entities()
            return True
        output_path = self._local_output_path(row)
        atomic_write_bytes(output_path, output)
        output_hash = sha256_bytes(output)
        self.store.record_output(row, token, self.now, output_hash)
        self._publish_result(row, output_hash)
        if row["document_id"] == crash_after_output_document:
            raise SyntheticCrash("after_output_before_receipt")
        self._emit(
            entity_kind="document", entity_id=row["document_id"], document_id=row["document_id"],
            from_state="running", to_state="succeeded", attempt=row["attempt"], output_sha256=output_hash,
        )
        self.publish_pending()
        if row["document_id"] == crash_after_receipt_document:
            raise SyntheticCrash("after_receipt_before_finalize")
        self.store.finalize_success(row, token, self.now)
        self._finish_entities()
        return True

    def run_until_idle(self, *, max_steps: int = 100) -> int:
        steps = 0
        while steps < max_steps and self.run_once():
            steps += 1
        if steps >= max_steps:
            raise RuntimeError("worker did not become idle")
        return steps

    def projection(self) -> FactoryProjection:
        assert self.campaign is not None
        return project_factory_receipts(self.store.receipts(), run_id=self.campaign.run_id)

    def publish_inventory(self) -> dict:
        rows = self.store.jobs()
        counts = {state: sum(row["state"] == state for row in rows) for state in ("succeeded", "held", "cancelled")}
        projection = self.projection()
        payload = {
            "schema_version": "factory-final-inventory-v1.0",
            "run_id": self.campaign.run_id if self.campaign else self.store.get_meta("run_id"),
            "counts": counts,
            "last_sequence": projection.last_sequence,
            "projection_sha256": projection.projection_sha256,
            "barrier_eligible": all(row["state"] in {"succeeded", "held", "cancelled"} for row in rows),
            "content_free": True,
        }
        publish_exchange_json(
            self.from_studio,
            f"campaigns/{payload['run_id']}/inventory/final.json", payload,
        )
        return payload


def validate_campaign_packages(
    campaign: ResearchCampaignV2,
    packages: tuple[RecoveryUnitManifestV1, ...],
) -> None:
    if tuple(sorted(row.package_id for row in packages)) != campaign.package_ids:
        raise ValueError("campaign/package IDs disagree")
    package_hashes = tuple(
        sha256_bytes(canonical_json_bytes(row))
        for row in sorted(packages, key=lambda item: item.package_id)
    )
    if package_hashes != campaign.package_manifest_sha256s:
        raise ValueError("campaign/package manifest hashes disagree")
    docs: list[str] = []
    for package in packages:
        if package.run_id != campaign.run_id:
            raise ValueError("package run identity mismatch")
        if package.campaign_identity_sha256 != campaign.campaign_identity_sha256:
            raise ValueError("package campaign identity mismatch")
        docs.extend(row.document_id for row in package.documents)
    if tuple(sorted(docs)) != campaign.selected_document_ids or len(docs) != len(set(docs)):
        raise ValueError("selected documents must appear exactly once across packages")


def _main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="reprocessing_worker")
    sub = parser.add_subparsers(dest="command", required=True)
    run = sub.add_parser("run-campaign")
    run.add_argument("--to-studio", required=True, type=Path)
    run.add_argument("--from-studio", required=True, type=Path)
    run.add_argument("--state-root", required=True, type=Path)
    run.add_argument("--job-root", required=True, type=Path)
    run.add_argument("--run-id", required=True)
    run.add_argument("--executor", required=True)
    args = parser.parse_args(argv)
    if args.executor != "synthetic-no-model":
        parser.error("Run-008 authorizes only the synthetic-no-model executor")
    exit_code = 1
    worker = None
    try:
        worker = ReprocessingWorker(
            to_studio=args.to_studio, from_studio=args.from_studio,
            state_dir=args.state_root / args.run_id, run_id=args.run_id,
            executor=SyntheticNoModelExecutor(
                poison_document_ids=frozenset({"fixture-poison"}),
            ),
            now=datetime.now(timezone.utc),
        )
        worker.run_until_idle()
        print(json.dumps({"run_id": args.run_id, "status": "idle", "content_free": True}))
        exit_code = 0
    except Exception as exc:
        print(json.dumps({
            "run_id": args.run_id, "status": "failed",
            "reason": type(exc).__name__, "content_free": True,
        }))
    finally:
        if worker is not None:
            worker.close()
        from .factory_supervisor import write_exit_record
        write_exit_record(args.job_root, args.run_id, exit_code)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(_main())
