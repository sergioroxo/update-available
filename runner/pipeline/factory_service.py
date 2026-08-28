"""Durable authenticated Mac Studio service for the three non-model stations."""
from __future__ import annotations

import argparse
import fcntl
import json
import os
import signal
import sqlite3
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable, Mapping

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from runner.models.reprocessing import (
    CopiedTextCanaryApprovalV1,
    CopiedTextPilotApprovalV1,
    FactoryCommandV1,
    FactoryEventV1,
    FactoryReceiptV1,
    ImmutableArtifactManifestV1,
    PRODUCTION_CANARY_STATIONS,
    ProductionCanaryCampaignV1,
    ProductionCanaryJobV1,
    ProductionPilotCampaignV1,
    ProductionPilotPackageV1,
    ProductionRecoveryUnitV1,
    require_safe_id,
)
from .factory_auth import (
    AuthenticatedFactoryMessageV1,
    FactoryAuthenticationError,
    load_private_key,
    public_key_allowlist,
    public_key_id,
    sign_factory_message,
    verify_factory_message,
)
from .atomic_io import atomic_write_bytes
from .factory_messages import (
    canonical_json_bytes,
    publish_checksum_bound_bytes,
    sha256_bytes,
    verify_checksum_pair,
)
from .factory_state import FactoryProjection, project_factory_receipts
from .factory_station_adapters import (
    DeterministicStationHold,
    StationMaterial,
    build_canonical_text_material,
    build_complete_units_material,
    build_source_verify_material,
    finalize_attempt_material,
    load_verified_source,
    verify_artifact_manifest,
    write_attempt_material,
)
from .syncthing_exchange import publish_exchange_json, verified_json_messages
from .factory_semantic_campaign import (
    SEMANTIC_CAMPAIGN_STATIONS,
    SemanticCampaignApprovalV1,
    SemanticCampaignJobV1,
    SemanticCampaignPackageV1,
    SemanticCampaignV1,
    SemanticStationAdapter,
)


PRODUCTION_DB_SCHEMA = "production-canary-worker-db-v1.1"
LEGACY_PRODUCTION_DB_SCHEMA = "production-canary-worker-db-v1.0"
LEASE_RECOVERY_REASON = "lease_expired_recovery"


class ProductionLeaseRejected(RuntimeError):
    pass


class ProductionWorkerCrash(RuntimeError):
    pass


def _inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


class ProductionWorkerStore:
    def __init__(self, path: Path, *, shared_roots: tuple[Path, Path]):
        self.path = Path(path)
        if any(_inside(self.path, root) for root in shared_roots):
            raise ValueError("production worker database must remain outside shared trees")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        existed = self.path.exists()
        self.connection = sqlite3.connect(self.path)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA journal_mode=DELETE")
        self.connection.execute("PRAGMA foreign_keys=ON")
        if existed:
            tables = {
                row[0] for row in self.connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                )
            }
            if tables and "production_meta" not in tables:
                self.connection.close()
                raise ValueError("worker database schema is not production-canary-v1 compatible")
        self._migrate()

    def _migrate(self) -> None:
        self.connection.executescript("""
        CREATE TABLE IF NOT EXISTS production_meta (
          key TEXT PRIMARY KEY, value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS production_jobs (
          run_id TEXT NOT NULL, package_id TEXT NOT NULL, document_id TEXT NOT NULL,
          station_id TEXT NOT NULL, station_sequence INTEGER NOT NULL,
          predecessor_station_id TEXT NOT NULL, predecessor_output_sha256 TEXT NOT NULL,
          bound_predecessor_output_sha256 TEXT NOT NULL DEFAULT '',
          source_sha256 TEXT NOT NULL, source_relative_path TEXT NOT NULL,
          input_fingerprint TEXT NOT NULL, executor_version TEXT NOT NULL,
          policy_version TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending',
          attempt INTEGER NOT NULL DEFAULT 0, maximum_attempts INTEGER NOT NULL,
          retry_classification TEXT NOT NULL, lease_token TEXT, lease_expiry TEXT,
          heartbeat_time TEXT, output_sha256 TEXT NOT NULL DEFAULT '',
          terminal_reason TEXT NOT NULL DEFAULT '',
          PRIMARY KEY(run_id,package_id,document_id,station_id)
        );
        CREATE TABLE IF NOT EXISTS production_messages (
          message_id TEXT PRIMARY KEY, purpose TEXT NOT NULL,
          payload_sha256 TEXT NOT NULL, sequence INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS production_receipts (
          sequence INTEGER PRIMARY KEY, receipt_id TEXT UNIQUE NOT NULL,
          station_id TEXT NOT NULL, document_id TEXT NOT NULL,
          to_state TEXT NOT NULL, authenticated_json TEXT NOT NULL,
          published INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS production_recoveries (
          run_id TEXT NOT NULL, package_id TEXT NOT NULL,
          document_id TEXT NOT NULL, station_id TEXT NOT NULL,
          attempt INTEGER NOT NULL, reason TEXT NOT NULL,
          completed INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY(run_id,package_id,document_id,station_id,attempt)
        );
        """)
        columns = {
            row[1] for row in self.connection.execute("PRAGMA table_info(production_jobs)")
        }
        if "bound_predecessor_output_sha256" not in columns:
            self.connection.execute(
                "ALTER TABLE production_jobs ADD COLUMN "
                "bound_predecessor_output_sha256 TEXT NOT NULL DEFAULT ''"
            )
        existing = self.get_meta("schema_version")
        if existing and existing not in {
            LEGACY_PRODUCTION_DB_SCHEMA, PRODUCTION_DB_SCHEMA,
        }:
            raise ValueError("production worker database requires an explicit migration")
        self.set_meta("schema_version", PRODUCTION_DB_SCHEMA)

    def close(self) -> None:
        self.connection.close()

    def set_meta(self, key: str, value: str) -> None:
        with self.connection:
            self.connection.execute(
                "INSERT INTO production_meta(key,value) VALUES(?,?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (key, value),
            )

    def get_meta(self, key: str, default: str = "") -> str:
        row = self.connection.execute(
            "SELECT value FROM production_meta WHERE key=?", (key,),
        ).fetchone()
        return str(row[0]) if row else default

    def initialize_jobs(
        self,
        campaign: ProductionCanaryCampaignV1 | ProductionPilotCampaignV1 | SemanticCampaignV1,
        package: ProductionRecoveryUnitV1 | ProductionPilotPackageV1 | SemanticCampaignPackageV1,
    ) -> None:
        previous_run = self.get_meta("run_id")
        if previous_run and previous_run != campaign.run_id:
            raise ValueError("production worker database belongs to another run")
        with self.connection:
            for job in package.jobs:
                existing = self.connection.execute(
                    "SELECT input_fingerprint,predecessor_output_sha256 FROM production_jobs "
                    "WHERE run_id=? AND package_id=? AND document_id=? AND station_id=?",
                    (job.run_id, job.package_id, job.document_id, job.station_id),
                ).fetchone()
                if existing and tuple(existing) != (
                    job.input_fingerprint, job.predecessor_output_sha256,
                ):
                    raise ValueError("existing production job identity changed")
                self.connection.execute("""
                INSERT OR IGNORE INTO production_jobs(
                  run_id,package_id,document_id,station_id,station_sequence,
                  predecessor_station_id,predecessor_output_sha256,source_sha256,
                  source_relative_path,input_fingerprint,executor_version,
                  policy_version,maximum_attempts,retry_classification
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, (
                    job.run_id, job.package_id, job.document_id, job.station_id,
                    job.station_sequence, job.predecessor_station_id,
                    job.predecessor_output_sha256, job.source_reference.source_sha256,
                    job.source_reference.relative_object_path, job.input_fingerprint,
                    job.executor_version, job.policy_version, job.maximum_attempts,
                    job.retry_classification,
                ))
        self.set_meta("run_id", campaign.run_id)

    def apply_command(
        self,
        command: FactoryCommandV1,
        *,
        message_id: str,
        payload_sha256: str,
        campaign_sha256: str,
    ) -> bool:
        existing = self.connection.execute(
            "SELECT purpose,payload_sha256,sequence FROM production_messages WHERE message_id=?",
            (message_id,),
        ).fetchone()
        if existing:
            if tuple(existing) != ("command", payload_sha256, command.sequence):
                raise ValueError("conflicting authenticated command message ID")
            return False
        if command.run_id != self.get_meta("run_id"):
            raise ValueError("authenticated command run mismatch")
        if command.campaign_sha256 != campaign_sha256:
            raise ValueError("authenticated command campaign mismatch")
        last = int(self.get_meta("last_command_sequence", "0"))
        if command.sequence <= last:
            raise ValueError("authenticated command sequence replay")
        with self.connection:
            self.connection.execute(
                "INSERT INTO production_messages(message_id,purpose,payload_sha256,sequence) VALUES(?,?,?,?)",
                (message_id, "command", payload_sha256, command.sequence),
            )
            self.connection.execute(
                "INSERT INTO production_meta(key,value) VALUES('last_command_sequence',?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (str(command.sequence),),
            )
            if command.action in {"start_approved", "resume"}:
                values = (("approved", "1"), ("paused", "0"))
            elif command.action == "pause_after_current":
                values = (("paused", "1"),)
            else:
                values = (("cancelled", "1"),)
            for key, value in values:
                self.connection.execute(
                    "INSERT INTO production_meta(key,value) VALUES(?,?) "
                    "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                    (key, value),
                )
            if command.action == "cancel_unstarted":
                self.connection.execute(
                    "UPDATE production_jobs SET state='cancelled',terminal_reason='cancelled_unstarted' "
                    "WHERE run_id=? AND state IN ('pending','ready')",
                    (command.run_id,),
                )
        return True

    def jobs(self) -> tuple[sqlite3.Row, ...]:
        return tuple(self.connection.execute(
            "SELECT * FROM production_jobs ORDER BY package_id,document_id,station_sequence"
        ).fetchall())

    def job(self, station_id: str, document_id: str = "") -> sqlite3.Row:
        if document_id:
            rows = self.connection.execute(
                "SELECT * FROM production_jobs WHERE station_id=? AND document_id=?",
                (station_id, document_id),
            ).fetchall()
        else:
            rows = self.connection.execute(
                "SELECT * FROM production_jobs WHERE station_id=?", (station_id,),
            ).fetchall()
        if len(rows) > 1:
            raise ValueError("document_id is required for a multi-document job lookup")
        row = rows[0] if rows else None
        if row is None:
            raise KeyError((document_id, station_id))
        return row

    def recover_expired(self, now: datetime) -> int:
        rows = tuple(self.connection.execute(
            "SELECT * FROM production_jobs WHERE state='running' "
            "AND output_sha256='' AND lease_expiry<=? "
            "ORDER BY package_id,document_id,station_sequence",
            (now.isoformat(),),
        ).fetchall())
        with self.connection:
            for row in rows:
                self.connection.execute(
                    "INSERT OR IGNORE INTO production_recoveries("
                    "run_id,package_id,document_id,station_id,attempt,reason"
                    ") VALUES(?,?,?,?,?,?)",
                    (
                        row["run_id"], row["package_id"], row["document_id"],
                        row["station_id"], row["attempt"], LEASE_RECOVERY_REASON,
                    ),
                )
                self.connection.execute(
                    "UPDATE production_jobs SET state='ready',terminal_reason=?,"
                    "lease_token=NULL,lease_expiry=NULL,heartbeat_time=NULL "
                    "WHERE run_id=? AND package_id=? AND document_id=? "
                    "AND station_id=? AND state='running' AND attempt=?",
                    (
                        LEASE_RECOVERY_REASON, row["run_id"], row["package_id"],
                        row["document_id"], row["station_id"], row["attempt"],
                    ),
                )
        return len(rows)

    def pending_recoveries(self) -> tuple[sqlite3.Row, ...]:
        return tuple(self.connection.execute(
            "SELECT * FROM production_recoveries WHERE completed=0 "
            "ORDER BY package_id,document_id,station_id,attempt"
        ).fetchall())

    def complete_recovery(self, row: sqlite3.Row) -> None:
        with self.connection:
            self.connection.execute(
                "UPDATE production_recoveries SET completed=1 WHERE run_id=? "
                "AND package_id=? AND document_id=? AND station_id=? AND attempt=?",
                (
                    row["run_id"], row["package_id"], row["document_id"],
                    row["station_id"], row["attempt"],
                ),
            )

    def has_exact_transition(
        self, *, document_id: str, station_id: str,
        from_state: str, to_state: str, attempt: int,
    ) -> bool:
        for message in self.receipts():
            event = FactoryReceiptV1.model_validate_json(
                canonical_json_bytes(message.payload)
            ).event
            if (
                event.entity_kind == "document"
                and event.document_id == document_id
                and event.station_id == station_id
                and event.from_state == from_state
                and event.to_state == to_state
                and event.attempt == attempt
            ):
                return True
        return False

    def claim(self, now: datetime, lease_seconds: int = 60) -> sqlite3.Row | None:
        if self.get_meta("approved") != "1" or self.get_meta("paused") == "1":
            return None
        if self.get_meta("cancelled") == "1":
            return None
        jobs = self.jobs()
        active_sequences = [
            int(row["station_sequence"]) for row in jobs
            if row["state"] in {"pending", "ready", "running"}
        ]
        if not active_sequences:
            return None
        barrier_sequence = min(active_sequences)
        for row in jobs:
            if int(row["station_sequence"]) != barrier_sequence:
                continue
            if row["state"] not in {"pending", "ready"}:
                continue
            predecessor = row["predecessor_station_id"]
            if predecessor:
                previous = self.job(predecessor, row["document_id"])
                if previous["state"] != "succeeded":
                    continue
                expected_predecessor = (
                    row["predecessor_output_sha256"]
                    or row["bound_predecessor_output_sha256"]
                )
                if not expected_predecessor:
                    self.hold_without_lease(row, "predecessor_output_unbound")
                    return None
                if previous["output_sha256"] != expected_predecessor:
                    self.hold_without_lease(row, "predecessor_output_changed")
                    return None
            token = uuid.uuid4().hex
            expiry = (now + timedelta(seconds=lease_seconds)).isoformat()
            with self.connection:
                cursor = self.connection.execute(
                    "UPDATE production_jobs SET state='running',attempt=attempt+1,lease_token=?,lease_expiry=?,heartbeat_time=? "
                    "WHERE run_id=? AND package_id=? AND document_id=? AND station_id=? AND state IN ('pending','ready')",
                    (token, expiry, now.isoformat(), row["run_id"], row["package_id"], row["document_id"], row["station_id"]),
                )
            if cursor.rowcount != 1:
                continue
            return self.job(row["station_id"], row["document_id"])
        return None

    def _lease(self, row: sqlite3.Row, token: str, now: datetime) -> None:
        current = self.job(row["station_id"], row["document_id"])
        if current["state"] != "running" or current["lease_token"] != token:
            raise ProductionLeaseRejected("stale production lease")
        if not current["lease_expiry"] or datetime.fromisoformat(current["lease_expiry"]) <= now:
            raise ProductionLeaseRejected("expired production lease")

    def heartbeat(self, row: sqlite3.Row, token: str, now: datetime) -> None:
        self._lease(row, token, now)
        with self.connection:
            self.connection.execute(
                "UPDATE production_jobs SET heartbeat_time=?,lease_expiry=? WHERE station_id=? AND document_id=?",
                (now.isoformat(), (now + timedelta(seconds=60)).isoformat(), row["station_id"], row["document_id"]),
            )

    def succeed(self, row: sqlite3.Row, token: str, now: datetime, output_sha256: str) -> None:
        self._lease(row, token, now)
        with self.connection:
            self.connection.execute(
                "UPDATE production_jobs SET state='succeeded',output_sha256=?,terminal_reason='',lease_token=NULL,lease_expiry=NULL "
                "WHERE station_id=? AND document_id=?",
                (output_sha256, row["station_id"], row["document_id"]),
            )
            self.connection.execute(
                "UPDATE production_jobs SET bound_predecessor_output_sha256=? "
                "WHERE run_id=? AND package_id=? AND document_id=? "
                "AND station_sequence=? AND predecessor_output_sha256=''",
                (
                    output_sha256, row["run_id"], row["package_id"],
                    row["document_id"], int(row["station_sequence"]) + 1,
                ),
            )

    def reconcile_success(self, station_id: str, document_id: str, output_sha256: str) -> None:
        with self.connection:
            row = self.job(station_id, document_id)
            self.connection.execute(
                "UPDATE production_jobs SET state='succeeded',output_sha256=?,terminal_reason='',lease_token=NULL,lease_expiry=NULL "
                "WHERE station_id=? AND document_id=?", (output_sha256, station_id, document_id),
            )
            self.connection.execute(
                "UPDATE production_jobs SET bound_predecessor_output_sha256=? "
                "WHERE run_id=? AND package_id=? AND document_id=? "
                "AND station_sequence=? AND predecessor_output_sha256=''",
                (
                    output_sha256, row["run_id"], row["package_id"],
                    document_id, int(row["station_sequence"]) + 1,
                ),
            )

    def fail(self, row: sqlite3.Row, token: str, now: datetime, reason: str, *, retryable: bool) -> str:
        self._lease(row, token, now)
        state = "ready" if retryable and row["attempt"] < row["maximum_attempts"] else "held"
        with self.connection:
            self.connection.execute(
                "UPDATE production_jobs SET state=?,terminal_reason=?,lease_token=NULL,lease_expiry=NULL "
                "WHERE station_id=? AND document_id=?",
                (state, reason, row["station_id"], row["document_id"]),
            )
        return state

    def expire_lease_for_test(
        self, station_id: str, now: datetime, document_id: str = "",
    ) -> tuple[sqlite3.Row, str]:
        row = self.job(station_id, document_id)
        token = str(row["lease_token"])
        with self.connection:
            self.connection.execute(
                "UPDATE production_jobs SET lease_expiry=? WHERE station_id=? AND document_id=?",
                ((now - timedelta(seconds=1)).isoformat(), station_id, row["document_id"]),
            )
        return row, token

    def hold_without_lease(self, row: sqlite3.Row, reason: str) -> None:
        with self.connection:
            self.connection.execute(
                "UPDATE production_jobs SET state='held',terminal_reason=? WHERE station_id=? AND document_id=?",
                (reason, row["station_id"], row["document_id"]),
            )

    def hold_descendants(self, row: sqlite3.Row, reason: str = "predecessor_held") -> int:
        with self.connection:
            cursor = self.connection.execute(
                "UPDATE production_jobs SET state='held',terminal_reason=? "
                "WHERE document_id=? AND station_sequence>? AND state IN ('pending','ready')",
                (reason, row["document_id"], row["station_sequence"]),
            )
        return cursor.rowcount

    def next_sequence(self) -> int:
        return int(self.connection.execute(
            "SELECT COALESCE(MAX(sequence),0)+1 FROM production_receipts"
        ).fetchone()[0])

    def add_receipt(
        self, receipt: FactoryReceiptV1, message: AuthenticatedFactoryMessageV1,
    ) -> None:
        event = receipt.event
        with self.connection:
            self.connection.execute(
                "INSERT INTO production_receipts(sequence,receipt_id,station_id,document_id,to_state,authenticated_json) "
                "VALUES(?,?,?,?,?,?)",
                (event.sequence, receipt.receipt_id, event.station_id, event.document_id,
                 event.to_state, message.model_dump_json()),
            )

    def receipts(self) -> tuple[AuthenticatedFactoryMessageV1, ...]:
        return tuple(
            AuthenticatedFactoryMessageV1.model_validate_json(row[0])
            for row in self.connection.execute(
                "SELECT authenticated_json FROM production_receipts ORDER BY sequence"
            )
        )

    def unpublished(self) -> tuple[tuple[int, AuthenticatedFactoryMessageV1], ...]:
        return tuple(
            (int(row[0]), AuthenticatedFactoryMessageV1.model_validate_json(row[1]))
            for row in self.connection.execute(
                "SELECT sequence,authenticated_json FROM production_receipts WHERE published=0 ORDER BY sequence"
            )
        )

    def mark_published(self, sequence: int) -> None:
        with self.connection:
            self.connection.execute(
                "UPDATE production_receipts SET published=1 WHERE sequence=?", (sequence,),
            )

    def has_transition(self, *, entity_kind: str, entity_id: str, station_id: str, to_state: str) -> bool:
        for message in self.receipts():
            event = FactoryReceiptV1.model_validate_json(
                canonical_json_bytes(message.payload)
            ).event
            if (
                event.entity_kind == entity_kind and event.entity_id == entity_id
                and event.station_id == station_id and event.to_state == to_state
            ):
                return True
        return False


class ProductionCanaryWorker:
    def __init__(
        self,
        *,
        to_studio: Path,
        from_studio: Path,
        state_root: Path,
        run_id: str,
        command_public_keys: Mapping[str, Ed25519PublicKey],
        receipt_signing_private_key: Path,
        semantic_station_adapter: SemanticStationAdapter | None = None,
        now: datetime | None = None,
    ):
        self.to_studio = Path(to_studio)
        self.from_studio = Path(from_studio)
        self.state_root = Path(state_root)
        self.run_id = require_safe_id(run_id, field="run_id")
        self.command_public_keys = dict(command_public_keys)
        self.receipt_signing_private_key = Path(receipt_signing_private_key)
        self.semantic_station_adapter = semantic_station_adapter
        self.now = now or datetime.now(timezone.utc)
        self.run_state = self.state_root / self.run_id
        self.store = ProductionWorkerStore(
            self.run_state / "worker.db",
            shared_roots=(self.to_studio, self.from_studio),
        )
        self.campaign: ProductionCanaryCampaignV1 | ProductionPilotCampaignV1 | SemanticCampaignV1 | None = None
        self.package: ProductionRecoveryUnitV1 | ProductionPilotPackageV1 | SemanticCampaignPackageV1 | None = None
        self.approval: CopiedTextCanaryApprovalV1 | CopiedTextPilotApprovalV1 | SemanticCampaignApprovalV1 | None = None
        self.campaign_sha256 = ""

    @property
    def station_ids(self) -> tuple[str, ...]:
        return (
            SEMANTIC_CAMPAIGN_STATIONS
            if isinstance(self.campaign, SemanticCampaignV1)
            else PRODUCTION_CANARY_STATIONS
        )

    def close(self) -> None:
        self.store.close()

    def _verified_existing_projection(self) -> FactoryProjection | None:
        """Verify durable receipts before accepting a historical terminal state."""
        messages = self.store.receipts()
        if not messages:
            return None
        public_key = load_private_key(
            self.receipt_signing_private_key,
            shared_roots=(self.to_studio, self.from_studio),
        ).public_key()
        allowed = {public_key_id(public_key): public_key}
        receipts = tuple(
            FactoryReceiptV1.model_validate_json(canonical_json_bytes(
                verify_factory_message(
                    message,
                    expected_purpose="receipt",
                    expected_run_id=self.run_id,
                    allowed_public_keys=allowed,
                    now=self.now,
                )
            ))
            for message in messages
        )
        projection = project_factory_receipts(receipts, run_id=self.run_id)
        return projection if projection.valid else None

    def ingest(self) -> None:
        semantic_path = (
            self.to_studio / "campaigns" / self.run_id / "semantic" / "campaign.auth.json"
        )
        root = (
            f"campaigns/{self.run_id}/semantic"
            if semantic_path.is_file()
            else f"campaigns/{self.run_id}/production"
        )
        campaign_relative = f"{root}/campaign.auth.json"
        campaign_path = self.to_studio / campaign_relative
        verify_checksum_pair(campaign_path, relative_path=campaign_relative)
        message = AuthenticatedFactoryMessageV1.model_validate_json(campaign_path.read_bytes())
        payload = verify_factory_message(
            message,
            expected_purpose="campaign_release",
            expected_run_id=self.run_id,
            allowed_public_keys=self.command_public_keys,
            now=self.now,
        )
        schema_version = payload.get("schema_version") if isinstance(payload, dict) else ""
        if schema_version == "production-canary-campaign-v1.0":
            campaign = ProductionCanaryCampaignV1.model_validate_json(
                canonical_json_bytes(payload)
            )
            approval_model = CopiedTextCanaryApprovalV1
            package_model = ProductionRecoveryUnitV1
        elif schema_version == "production-pilot-campaign-v1.0":
            campaign = ProductionPilotCampaignV1.model_validate_json(
                canonical_json_bytes(payload)
            )
            approval_model = CopiedTextPilotApprovalV1
            package_model = ProductionPilotPackageV1
        elif schema_version == "semantic-production-campaign-v1.0":
            campaign = SemanticCampaignV1.model_validate_json(canonical_json_bytes(payload))
            approval_model = SemanticCampaignApprovalV1
            package_model = SemanticCampaignPackageV1
        else:
            raise ValueError("unsupported authenticated production campaign schema")
        approval_relative, package_relative = f"{root}/approval.json", f"{root}/package.json"
        approval_path, package_path = self.to_studio / approval_relative, self.to_studio / package_relative
        verify_checksum_pair(approval_path, relative_path=approval_relative)
        verify_checksum_pair(package_path, relative_path=package_relative)
        approval = approval_model.model_validate_json(approval_path.read_bytes())
        package = package_model.model_validate_json(package_path.read_bytes())
        if sha256_bytes(canonical_json_bytes(approval)) != campaign.approval_sha256:
            raise ValueError("campaign approval hash mismatch")
        if sha256_bytes(canonical_json_bytes(package)) != campaign.package_manifest_sha256:
            raise ValueError("campaign package hash mismatch")
        if approval.run_id != self.run_id or package.run_id != self.run_id:
            raise ValueError("production campaign component run identity mismatch")
        if isinstance(campaign, ProductionCanaryCampaignV1):
            if (
                approval.document_id != campaign.document_id
                or package.document_id != campaign.document_id
                or package.package_id != campaign.package_id
            ):
                raise ValueError("production canary component identity mismatch")
        elif isinstance(campaign, ProductionPilotCampaignV1):
            if not isinstance(approval, CopiedTextPilotApprovalV1) or not isinstance(
                package, ProductionPilotPackageV1
            ):
                raise ValueError("production pilot component schema mismatch")
            approval_ids = tuple(row.document_id for row in approval.artifacts)
            approval_hashes = tuple(row.source_sha256 for row in approval.artifacts)
            campaign_hashes = tuple(row.source_sha256 for row in campaign.source_references)
            if (
                approval_ids != campaign.document_ids
                or package.document_ids != campaign.document_ids
                or package.package_id != campaign.package_id
                or approval_hashes != campaign_hashes
            ):
                raise ValueError("production pilot component identity mismatch")
        else:
            if not isinstance(approval, SemanticCampaignApprovalV1) or not isinstance(
                package, SemanticCampaignPackageV1
            ):
                raise ValueError("semantic campaign component schema mismatch")
            if (
                tuple(row.document_id for row in approval.documents) != campaign.document_ids
                or package.document_ids != campaign.document_ids
                or package.package_id != campaign.package_id
                or approval.lexicon_snapshot_sha256 != campaign.lexicon_snapshot_sha256
            ):
                raise ValueError("semantic campaign component identity mismatch")
            snapshot_path = self.to_studio / campaign.lexicon_snapshot_relative_path
            verify_checksum_pair(
                snapshot_path, relative_path=campaign.lexicon_snapshot_relative_path,
            )
            snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
            if snapshot.get("canonical_sha256") != campaign.lexicon_snapshot_sha256:
                raise ValueError("semantic campaign lexicon snapshot changed")
        try:
            approval.assert_current(self.now)
        except ValueError:
            existing = self._verified_existing_projection()
            if existing is None or existing.campaign.state != "succeeded":
                raise
        self.campaign, self.package, self.approval = campaign, package, approval
        self.campaign_sha256 = sha256_bytes(canonical_json_bytes(campaign))
        self.store.initialize_jobs(campaign, package)
        commands = verified_json_messages(self.to_studio, f"commands/{self.run_id}")
        for relative, raw in commands:
            if not relative.endswith(".auth.json"):
                raise FactoryAuthenticationError("unsigned production command is forbidden")
            command_message = AuthenticatedFactoryMessageV1.model_validate_json(
                canonical_json_bytes(raw)
            )
            envelope = command_message.envelope
            expired = envelope.expires_at is not None and self.now >= envelope.expires_at
            verification_time = self.now
            if expired:
                # Expiry prevents application, but it must not prevent us from
                # authenticating an immutable historical command.  Verify it at
                # the last representable instant in its signed validity window;
                # every non-temporal production check remains fail-closed.
                verification_time = envelope.expires_at - timedelta(microseconds=1)
            command_payload = verify_factory_message(
                command_message,
                expected_purpose="command",
                expected_run_id=self.run_id,
                allowed_public_keys=self.command_public_keys,
                now=verification_time,
            )
            command = FactoryCommandV1.model_validate_json(
                canonical_json_bytes(command_payload)
            )
            expected_relative = (
                f"commands/{self.run_id}/{command.sequence:06d}-"
                f"{command.command_id}.auth.json"
            )
            if relative != expected_relative:
                raise FactoryAuthenticationError(
                    "authenticated command filename identity mismatch"
                )
            if command.command_id != envelope.message_id:
                raise FactoryAuthenticationError(
                    "authenticated command message identity mismatch"
                )
            if (
                command.issued_at != envelope.issued_at
                or command.expires_at != envelope.expires_at
            ):
                raise FactoryAuthenticationError(
                    "authenticated command time binding mismatch"
                )
            if command.campaign_sha256 != self.campaign_sha256:
                raise FactoryAuthenticationError(
                    "authenticated command campaign mismatch"
                )
            if expired:
                continue
            self.store.apply_command(
                command,
                message_id=command_message.envelope.message_id,
                payload_sha256=command_message.envelope.payload_sha256,
                campaign_sha256=self.campaign_sha256,
            )

    def _job_contract(self, row: sqlite3.Row) -> ProductionCanaryJobV1 | SemanticCampaignJobV1:
        assert self.package is not None
        return next(
            job for job in self.package.jobs
            if job.station_id == row["station_id"] and job.document_id == row["document_id"]
        )

    def _document_approval(self, document_id: str) -> CopiedTextCanaryApprovalV1:
        assert self.approval is not None
        if isinstance(self.approval, CopiedTextCanaryApprovalV1):
            if self.approval.document_id != document_id:
                raise ValueError("canary approval/document mismatch")
            return self.approval
        if isinstance(self.approval, SemanticCampaignApprovalV1):
            document = next(
                (row for row in self.approval.documents if row.document_id == document_id),
                None,
            )
            if document is None:
                raise ValueError("semantic approval/document mismatch")
            return CopiedTextCanaryApprovalV1(
                approval_id=f"{self.approval.approval_id}-{document_id}",
                run_id=self.approval.run_id, document_id=document_id,
                source_sha256=document.source_sha256, source_bytes=document.source_bytes,
                safe_display_filename=document.safe_display_filename,
                media_type=document.media_type, approved_at=self.approval.approved_at,
                expires_at=self.approval.expires_at, researcher_id=self.approval.researcher_id,
                public_provenance_label=document.title,
                source_is_public=True, source_is_non_sensitive=True,
                not_anonymous_platform_testimony=True,
                contains_no_private_or_restricted_material=True,
                copied_local_bytes_only=True, authorized_station_ids=PRODUCTION_CANARY_STATIONS,
            )
        artifact = next(
            (row for row in self.approval.artifacts if row.document_id == document_id),
            None,
        )
        if artifact is None:
            raise ValueError("pilot document is absent from approval")
        return CopiedTextCanaryApprovalV1(
            approval_id=f"{self.approval.approval_id}-{document_id}",
            run_id=self.approval.run_id, document_id=document_id,
            source_sha256=artifact.source_sha256, source_bytes=artifact.source_bytes,
            safe_display_filename=artifact.safe_display_filename,
            media_type=artifact.media_type, public_source_url=artifact.public_source_url,
            public_provenance_label=artifact.public_provenance_label,
            approved_at=self.approval.approved_at, expires_at=self.approval.expires_at,
            researcher_id=self.approval.researcher_id, source_is_public=True,
            source_is_non_sensitive=True, not_anonymous_platform_testimony=True,
            contains_no_private_or_restricted_material=True,
            copied_local_bytes_only=True, authorized_station_ids=PRODUCTION_CANARY_STATIONS,
        )

    def _emit(
        self,
        *,
        entity_kind: str,
        entity_id: str,
        station_id: str = "",
        document_id: str = "",
        from_state: str,
        to_state: str,
        attempt: int = 0,
        output_sha256: str = "",
        error_class: str = "",
    ) -> FactoryReceiptV1:
        assert self.campaign is not None
        sequence = self.store.next_sequence()
        occurred = self.campaign.created_at + timedelta(seconds=100 + sequence)
        event = FactoryEventV1(
            run_id=self.run_id,
            event_id=f"production-event-{sequence:06d}",
            sequence=sequence,
            entity_kind=entity_kind,
            entity_id=entity_id,
            station_id=station_id,
            document_id=document_id,
            from_state=from_state,
            to_state=to_state,
            attempt=attempt,
            occurred_at=occurred,
            worker_id="mac-studio-production-service-v1",
            input_fingerprint=(
                self.store.job(station_id, document_id)["input_fingerprint"]
                if document_id else ""
            ),
            output_sha256=output_sha256,
            error_class=error_class,
        )
        receipt = FactoryReceiptV1(
            receipt_id=f"production-receipt-{sequence:06d}",
            event=event,
            received_at=occurred,
        )
        message = sign_factory_message(
            receipt,
            purpose="receipt",
            run_id=self.run_id,
            message_id=receipt.receipt_id,
            private_key_path=self.receipt_signing_private_key,
            issued_at=occurred,
            shared_roots=(self.to_studio, self.from_studio),
        )
        self.store.add_receipt(receipt, message)
        return receipt

    def publish_pending(self) -> int:
        count = 0
        for sequence, message in self.store.unpublished():
            receipt = FactoryReceiptV1.model_validate_json(
                canonical_json_bytes(message.payload)
            )
            publish_exchange_json(
                self.from_studio,
                f"campaigns/{self.run_id}/authenticated-receipts/{sequence:06d}-{receipt.receipt_id}.auth.json",
                message,
            )
            self.store.mark_published(sequence)
            count += 1
        return count

    def _local_final_dir(self, station_id: str, document_id: str) -> Path:
        return self.run_state / "results" / document_id / station_id

    def _station_entity_id(self, row: sqlite3.Row) -> str:
        # Station projection is campaign-wide; document/station isolation is
        # represented by the separately emitted document events.
        return str(row["station_id"])

    def _finish_station(self, station_id: str) -> bool:
        rows = [
            row for row in self.store.jobs() if row["station_id"] == station_id
        ]
        terminal_states = {"succeeded", "held", "cancelled"}
        if not rows or any(row["state"] not in terminal_states for row in rows):
            return False
        if any(
            self.store.has_transition(
                entity_kind="station", entity_id=station_id,
                station_id=station_id, to_state=state,
            )
            for state in terminal_states
        ):
            return False
        if any(row["state"] == "held" for row in rows):
            terminal = "held"
        elif any(row["state"] == "cancelled" for row in rows):
            terminal = "cancelled"
        else:
            terminal = "succeeded"
        running = self.store.has_transition(
            entity_kind="station", entity_id=station_id,
            station_id=station_id, to_state="running",
        )
        self._emit(
            entity_kind="station", entity_id=station_id, station_id=station_id,
            from_state=("running" if running else "pending"), to_state=terminal,
        )
        return True

    def _build_material(self, row: sqlite3.Row) -> StationMaterial:
        assert self.approval is not None and self.campaign is not None
        job = self._job_contract(row)
        approval = self._document_approval(row["document_id"])
        source_bytes, metadata = load_verified_source(self.to_studio, job=job)
        completed_at = self.campaign.created_at + timedelta(seconds=job.station_sequence)
        if job.station_id == "source_verify":
            return build_source_verify_material(
                job=job,
                source_bytes=source_bytes,
                metadata=metadata,
                approval=approval,
                completed_at=completed_at,
            )
        if job.station_id == "canonical_text_prepare":
            return build_canonical_text_material(
                job=job, source_bytes=source_bytes, completed_at=completed_at,
            )
        if job.station_id == "complete_units_v2":
            canonical = self._local_final_dir(
                "canonical_text_prepare", row["document_id"]
            ) / "extracted.txt"
            if canonical.is_symlink() or not canonical.is_file():
                raise DeterministicStationHold("canonical_predecessor_missing")
            return build_complete_units_material(
                job=job, canonical_bytes=canonical.read_bytes(), completed_at=completed_at,
            )
        if not isinstance(self.campaign, SemanticCampaignV1) or not isinstance(
            self.approval, SemanticCampaignApprovalV1
        ):
            raise DeterministicStationHold("semantic_station_not_authorized")
        if self.semantic_station_adapter is None:
            raise DeterministicStationHold("semantic_runtime_adapter_not_configured")
        return self.semantic_station_adapter.execute(
            campaign=self.campaign, approval=self.approval, job=job,
            run_state=self.run_state, completed_at=completed_at,
        )

    def _publish_material(self, row: sqlite3.Row, material: StationMaterial) -> None:
        base = (
            self.from_studio / "campaigns" / self.run_id / "results"
            / row["document_id"] / "stations" / row["station_id"]
        )
        for relative, data in sorted(material.artifacts.items()):
            destination = base / relative
            transfer_relative = destination.relative_to(self.from_studio).as_posix()
            publish_checksum_bound_bytes(data, destination, relative_path=transfer_relative)
        manifest_message = sign_factory_message(
            material.manifest,
            purpose="result_manifest",
            run_id=self.run_id,
            message_id=f"result-{row['document_id']}-{row['station_id']}",
            private_key_path=self.receipt_signing_private_key,
            issued_at=material.manifest.completed_at,
            shared_roots=(self.to_studio, self.from_studio),
        )
        publish_exchange_json(
            self.from_studio,
            (
                f"campaigns/{self.run_id}/results/{row['document_id']}/stations/"
                f"{row['station_id']}/artifact_manifest.auth.json"
            ),
            manifest_message,
        )

    def _reconcile_local_results(self) -> bool:
        progressed = False
        for row in self.store.jobs():
            final_dir = self._local_final_dir(row["station_id"], row["document_id"])
            manifest_path = final_dir / "artifact_manifest.json"
            if not manifest_path.is_file():
                continue
            manifest = ImmutableArtifactManifestV1.model_validate_json(manifest_path.read_bytes())
            verify_artifact_manifest(final_dir, manifest, allow_manifest_file=True)
            output_hash = sha256_bytes(canonical_json_bytes(manifest))
            if row["state"] != "succeeded" or row["output_sha256"] != output_hash:
                self.store.reconcile_success(
                    row["station_id"], row["document_id"], output_hash
                )
                row = self.store.job(row["station_id"], row["document_id"])
                progressed = True
            self._publish_material(row, StationMaterial(
                artifacts={entry.relative_path: (final_dir / entry.relative_path).read_bytes() for entry in manifest.artifacts},
                manifest=manifest,
                manifest_sha256=output_hash,
            ))
            if not self.store.has_transition(
                entity_kind="document", entity_id=row["document_id"],
                station_id=row["station_id"], to_state="succeeded",
            ):
                if not self.store.has_transition(
                    entity_kind="station", entity_id=self._station_entity_id(row),
                    station_id=row["station_id"], to_state="running",
                ):
                    self._emit(
                        entity_kind="station", entity_id=self._station_entity_id(row),
                        station_id=row["station_id"], from_state="pending", to_state="running",
                    )
                self._emit(
                    entity_kind="document", entity_id=row["document_id"],
                    document_id=row["document_id"], station_id=row["station_id"],
                    from_state="running", to_state="succeeded", attempt=row["attempt"] or 1,
                    output_sha256=output_hash,
                )
                self._finish_station(row["station_id"])
                progressed = True
        if progressed:
            self.publish_pending()
        return progressed

    def _finish_campaign(self) -> bool:
        assert self.campaign is not None
        rows = self.store.jobs()
        station_progressed = False
        for row in rows:
            if row["state"] != "cancelled" or self.store.has_transition(
                entity_kind="document", entity_id=row["document_id"],
                station_id=row["station_id"], to_state="cancelled",
            ):
                continue
            self._emit(
                entity_kind="document", entity_id=row["document_id"],
                document_id=row["document_id"], station_id=row["station_id"],
                from_state="pending", to_state="cancelled",
                error_class="cancelled_unstarted",
            )
            station_progressed = True
        for station_id in self.station_ids:
            if self._finish_station(station_id):
                station_progressed = True
        if any(row["state"] not in {"succeeded", "held", "cancelled"} for row in rows):
            if station_progressed:
                self.publish_pending()
            return station_progressed
        terminal = (
            "succeeded" if all(row["state"] == "succeeded" for row in rows)
            else "cancelled" if all(row["state"] == "cancelled" for row in rows)
            else "held"
        )
        if self.store.has_transition(
            entity_kind="campaign", entity_id=self.run_id, station_id="", to_state=terminal,
        ):
            if station_progressed:
                self.publish_pending()
            return station_progressed
        self._emit(
            entity_kind="campaign", entity_id=self.run_id,
            from_state="running", to_state=terminal,
        )
        self.publish_pending()
        return True

    def _publish_expired_recoveries(self) -> bool:
        progressed = self.store.recover_expired(self.now) > 0
        for recovery in self.store.pending_recoveries():
            identity = {
                "document_id": recovery["document_id"],
                "station_id": recovery["station_id"],
                "attempt": int(recovery["attempt"]),
            }
            if not self.store.has_exact_transition(
                **identity, from_state="running", to_state="failed",
            ):
                self._emit(
                    entity_kind="document",
                    entity_id=recovery["document_id"],
                    document_id=recovery["document_id"],
                    station_id=recovery["station_id"],
                    from_state="running", to_state="failed",
                    attempt=int(recovery["attempt"]),
                    error_class=recovery["reason"],
                )
                progressed = True
            if not self.store.has_exact_transition(
                **identity, from_state="failed", to_state="ready",
            ):
                self._emit(
                    entity_kind="document",
                    entity_id=recovery["document_id"],
                    document_id=recovery["document_id"],
                    station_id=recovery["station_id"],
                    from_state="failed", to_state="ready",
                    attempt=int(recovery["attempt"]),
                    error_class=recovery["reason"],
                )
                progressed = True
            self.store.complete_recovery(recovery)
        if progressed:
            self.publish_pending()
        return progressed

    def run_once(self, *, crash_point: str = "") -> bool:
        self.ingest()
        self.publish_pending()
        if self._reconcile_local_results():
            self._finish_campaign()
            return True
        if self.store.get_meta("approved") != "1":
            return False
        if not self.store.has_transition(
            entity_kind="campaign", entity_id=self.run_id, station_id="", to_state="running",
        ):
            self._emit(
                entity_kind="campaign", entity_id=self.run_id,
                from_state="pending", to_state="running",
            )
            self.publish_pending()
            return True
        if self._publish_expired_recoveries():
            return True
        row = self.store.claim(self.now)
        if row is None:
            return self._finish_campaign()
        token = str(row["lease_token"])
        if not self.store.has_transition(
            entity_kind="station", entity_id=self._station_entity_id(row),
            station_id=row["station_id"], to_state="running",
        ):
            self._emit(
                entity_kind="station", entity_id=self._station_entity_id(row), station_id=row["station_id"],
                from_state="pending", to_state="running",
            )
        self._emit(
            entity_kind="document", entity_id=row["document_id"],
            document_id=row["document_id"], station_id=row["station_id"],
            from_state=("pending" if row["attempt"] == 1 else "ready"),
            to_state="running", attempt=row["attempt"],
        )
        self.publish_pending()
        try:
            if crash_point == f"after_lease_claim:{row['station_id']}":
                raise ProductionWorkerCrash("after_lease_claim")
            material = self._build_material(row)
            predicted = ""
            if row["station_sequence"] < len(self.station_ids):
                next_station = self.station_ids[row["station_sequence"]]
                predicted = self.store.job(
                    next_station, row["document_id"]
                )["predecessor_output_sha256"]
            if predicted and predicted != material.manifest_sha256:
                raise DeterministicStationHold("predicted_output_mismatch")
            attempt_dir = (
                self.run_state / "attempts" / row["document_id"] / row["station_id"]
                / f"attempt-{row['attempt']:03d}-{token}"
            )
            write_attempt_material(attempt_dir, material)
            final_dir = self._local_final_dir(row["station_id"], row["document_id"])
            finalize_attempt_material(attempt_dir, final_dir)
            if crash_point == f"after_result_write:{row['station_id']}":
                raise ProductionWorkerCrash("after_result_write")
            self._publish_material(row, material)
            self.store.succeed(row, token, self.now, material.manifest_sha256)
            if crash_point == f"after_database_commit:{row['station_id']}":
                raise ProductionWorkerCrash("after_database_commit")
            self._emit(
                entity_kind="document", entity_id=row["document_id"],
                document_id=row["document_id"], station_id=row["station_id"],
                from_state="running", to_state="succeeded", attempt=row["attempt"],
                output_sha256=material.manifest_sha256,
            )
            self._finish_station(row["station_id"])
            self.publish_pending()
            self._finish_campaign()
            return True
        except ProductionWorkerCrash:
            raise
        except DeterministicStationHold as exc:
            descendants = [
                descendant for descendant in self.store.jobs()
                if (
                    descendant["document_id"] == row["document_id"]
                    and descendant["station_sequence"] > row["station_sequence"]
                    and descendant["state"] in {"pending", "ready"}
                )
            ]
            state = self.store.fail(
                row, token, self.now, exc.reason_code, retryable=False,
            )
            self.store.hold_descendants(row)
            self._emit(
                entity_kind="document", entity_id=row["document_id"],
                document_id=row["document_id"], station_id=row["station_id"],
                from_state="running", to_state=state, attempt=row["attempt"],
                error_class=exc.reason_code,
            )
            for descendant in descendants:
                if not self.store.has_transition(
                    entity_kind="station", entity_id=self._station_entity_id(descendant),
                    station_id=descendant["station_id"], to_state="running",
                ):
                    self._emit(
                        entity_kind="station",
                        entity_id=self._station_entity_id(descendant),
                        station_id=descendant["station_id"],
                        from_state="pending", to_state="running",
                    )
                self._emit(
                    entity_kind="document", entity_id=descendant["document_id"],
                    document_id=descendant["document_id"],
                    station_id=descendant["station_id"],
                    from_state=descendant["state"], to_state="held",
                    attempt=descendant["attempt"],
                    error_class="predecessor_held",
                )
            self._finish_station(row["station_id"])
            for descendant in descendants:
                self._finish_station(descendant["station_id"])
            self.publish_pending()
            self._finish_campaign()
            return True
        except OSError:
            state = self.store.fail(
                row, token, self.now, "infrastructure_io_failure", retryable=True,
            )
            self._emit(
                entity_kind="document", entity_id=row["document_id"],
                document_id=row["document_id"], station_id=row["station_id"],
                from_state="running", to_state=("failed" if state == "ready" else "held"),
                attempt=row["attempt"], error_class="infrastructure_io_failure",
            )
            if state == "ready":
                self._emit(
                    entity_kind="document", entity_id=row["document_id"],
                    document_id=row["document_id"], station_id=row["station_id"],
                    from_state="failed", to_state="ready", attempt=row["attempt"],
                )
            else:
                self._finish_station(row["station_id"])
            self.publish_pending()
            return True

    def run_until_idle(self, max_steps: int = 50) -> int:
        steps = 0
        while steps < max_steps and self.run_once():
            steps += 1
        if steps >= max_steps:
            raise RuntimeError("production worker did not become idle")
        return steps

    def projection(self) -> FactoryProjection:
        receipts = tuple(
            FactoryReceiptV1.model_validate_json(canonical_json_bytes(message.payload))
            for message in self.store.receipts()
        )
        return project_factory_receipts(receipts, run_id=self.run_id)


class FactoryServiceLock:
    def __init__(self, state_root: Path):
        self.path = Path(state_root) / "factory-service.lock"
        self.handle = None

    def __enter__(self) -> "FactoryServiceLock":
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.handle = self.path.open("a+")
        try:
            fcntl.flock(self.handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            self.handle.close()
            raise RuntimeError("factory service is already running") from exc
        return self

    def __exit__(self, *_args) -> None:
        if self.handle is not None:
            fcntl.flock(self.handle.fileno(), fcntl.LOCK_UN)
            self.handle.close()


def publish_service_status(
    *,
    from_studio: Path,
    to_studio: Path,
    run_id: str,
    status: str,
    receipt_signing_private_key: Path,
    issued_at: datetime,
) -> dict:
    safe_status = require_safe_id(status, field="status")
    stamp = issued_at.strftime("%Y%m%dT%H%M%S%fZ")
    payload = {
        "schema_version": "factory-service-status-v1.0",
        "run_id": run_id,
        "status": safe_status,
        "content_free": True,
        "issued_at": issued_at.isoformat(),
    }
    message = sign_factory_message(
        payload,
        purpose="service_status",
        run_id=run_id,
        message_id=f"service-{safe_status}-{stamp}",
        private_key_path=receipt_signing_private_key,
        issued_at=issued_at,
        shared_roots=(Path(to_studio), Path(from_studio)),
    )
    return publish_exchange_json(
        from_studio,
        f"campaigns/{run_id}/service/{stamp}-{safe_status}.auth.json",
        message,
    )


def discover_production_runs(to_studio: Path) -> tuple[tuple[str, ...], tuple[str, ...]]:
    """Discover only checksum-complete releases at the exact production path."""
    campaigns = Path(to_studio) / "campaigns"
    if not campaigns.exists():
        return (), ()
    if campaigns.is_symlink() or not campaigns.is_dir():
        raise ValueError("campaign exchange root is unsafe")
    accepted: list[str] = []
    rejected: list[str] = []
    for candidate in sorted(campaigns.iterdir(), key=lambda path: path.name):
        if candidate.is_symlink() or not candidate.is_dir():
            continue
        try:
            run_id = require_safe_id(candidate.name, field="run_id")
        except ValueError:
            continue
        candidates = (
            f"campaigns/{run_id}/semantic/campaign.auth.json",
            f"campaigns/{run_id}/production/campaign.auth.json",
        )
        present = [
            relative for relative in candidates
            if (Path(to_studio) / relative).is_file()
        ]
        if not present:
            continue
        if len(present) != 1:
            rejected.append(run_id)
            continue
        relative = present[0]
        campaign_path = Path(to_studio) / relative
        if campaign_path.is_symlink():
            rejected.append(run_id)
            continue
        sidecar = campaign_path.with_name(campaign_path.name + ".sha256")
        if sidecar.is_symlink() or not sidecar.is_file():
            rejected.append(run_id)
            continue
        try:
            verify_checksum_pair(campaign_path, relative_path=relative)
        except Exception:
            rejected.append(run_id)
            continue
        accepted.append(run_id)
    return tuple(accepted), tuple(rejected)


def _publish_host_health_once(
    *,
    from_studio: Path,
    to_studio: Path,
    state_root: Path,
    status: str,
    receipt_signing_private_key: Path,
    issued_at: datetime,
) -> bool:
    """Publish one authenticated content-free message per health transition."""
    safe_status = require_safe_id(status, field="status")
    marker = Path(state_root) / "host-health-state.json"
    if marker.is_symlink():
        raise ValueError("host health marker must not be a symlink")
    previous = ""
    if marker.is_file():
        try:
            previous = str(json.loads(marker.read_text(encoding="utf-8"))["status"])
        except Exception as exc:
            raise ValueError("host health marker is malformed") from exc
    if previous == safe_status:
        return False
    stamp = issued_at.strftime("%Y%m%dT%H%M%S%fZ")
    payload = {
        "schema_version": "factory-host-health-v1.0",
        "run_id": "factory-host-service",
        "status": safe_status,
        "content_free": True,
        "issued_at": issued_at.isoformat(),
    }
    message = sign_factory_message(
        payload, purpose="service_status", run_id="factory-host-service",
        message_id=f"host-service-{safe_status}-{stamp}",
        private_key_path=receipt_signing_private_key, issued_at=issued_at,
        shared_roots=(Path(to_studio), Path(from_studio)),
    )
    publish_exchange_json(
        from_studio, f"service/host/{stamp}-{safe_status}.auth.json", message,
    )
    atomic_write_bytes(
        marker,
        canonical_json_bytes({"status": safe_status, "updated_at": issued_at.isoformat()}),
    )
    return True


def _run_worker_unlocked(
    *,
    to_studio: Path,
    from_studio: Path,
    state_root: Path,
    run_id: str,
    keys: Mapping[str, Ed25519PublicKey],
    receipt_signing_private_key: Path,
    current: datetime,
    emit_run_status: bool,
    semantic_station_adapter: SemanticStationAdapter | None = None,
) -> dict:
    worker = ProductionCanaryWorker(
        to_studio=to_studio, from_studio=from_studio, state_root=state_root,
        run_id=run_id, command_public_keys=keys,
        receipt_signing_private_key=receipt_signing_private_key,
        semantic_station_adapter=semantic_station_adapter, now=current,
    )
    try:
        if emit_run_status:
            publish_service_status(
                from_studio=from_studio, to_studio=to_studio, run_id=run_id,
                status="startup", receipt_signing_private_key=receipt_signing_private_key,
                issued_at=current,
            )
        steps = worker.run_until_idle()
        projection = worker.projection()
        if emit_run_status:
            publish_service_status(
                from_studio=from_studio, to_studio=to_studio, run_id=run_id,
                status="ready", receipt_signing_private_key=receipt_signing_private_key,
                issued_at=current + timedelta(microseconds=1),
            )
        return {
            "schema_version": "factory-service-once-result-v1.0",
            "run_id": run_id, "status": projection.campaign.state,
            "steps": steps, "projection_sha256": projection.projection_sha256,
            "content_free": True,
        }
    finally:
        worker.close()


def run_service_once(
    *,
    to_studio: Path,
    from_studio: Path,
    state_root: Path,
    log_root: Path,
    run_id: str,
    command_public_key_paths: tuple[Path, ...],
    receipt_signing_private_key: Path,
    host_role: str,
    semantic_station_adapter: SemanticStationAdapter | None = None,
    now: datetime | None = None,
) -> dict:
    if host_role not in {"mac-studio", "synthetic"}:
        raise PermissionError("production factory service requires the Mac Studio host role")
    roots = (Path(to_studio), Path(from_studio))
    for local in (Path(state_root), Path(log_root), Path(receipt_signing_private_key)):
        if any(_inside(local, shared) for shared in roots):
            raise ValueError("factory service local paths must remain outside shared trees")
    Path(log_root).mkdir(parents=True, exist_ok=True)
    current = now or datetime.now(timezone.utc)
    keys = public_key_allowlist(command_public_key_paths, shared_roots=roots)
    with FactoryServiceLock(state_root):
        return _run_worker_unlocked(
            to_studio=to_studio, from_studio=from_studio,
            state_root=state_root, run_id=run_id, keys=keys,
            receipt_signing_private_key=receipt_signing_private_key,
            current=current, emit_run_status=True,
            semantic_station_adapter=semantic_station_adapter,
        )


def run_service_scan_once(
    *,
    to_studio: Path,
    from_studio: Path,
    state_root: Path,
    log_root: Path,
    command_public_key_paths: tuple[Path, ...],
    receipt_signing_private_key: Path,
    host_role: str,
    semantic_station_adapter: SemanticStationAdapter | None = None,
    now: datetime | None = None,
) -> dict:
    """Host-level deterministic discovery with per-run fault isolation."""
    if host_role not in {"mac-studio", "synthetic"}:
        raise PermissionError("production factory service requires the Mac Studio host role")
    roots = (Path(to_studio), Path(from_studio))
    for local in (Path(state_root), Path(log_root), Path(receipt_signing_private_key)):
        if any(_inside(local, shared) for shared in roots):
            raise ValueError("factory service local paths must remain outside shared trees")
    Path(log_root).mkdir(parents=True, exist_ok=True)
    current = now or datetime.now(timezone.utc)
    keys = public_key_allowlist(command_public_key_paths, shared_roots=roots)
    results: list[dict] = []
    with FactoryServiceLock(state_root):
        run_ids, incomplete_or_tampered = discover_production_runs(to_studio)
        for run_id in run_ids:
            try:
                results.append(_run_worker_unlocked(
                    to_studio=to_studio, from_studio=from_studio,
                    state_root=state_root, run_id=run_id, keys=keys,
                    receipt_signing_private_key=receipt_signing_private_key,
                    current=current, emit_run_status=False,
                    semantic_station_adapter=semantic_station_adapter,
                ))
            except Exception as exc:
                results.append({
                    "run_id": run_id, "status": "held",
                    "reason": type(exc).__name__, "content_free": True,
                })
        health = "idle" if not run_ids and not incomplete_or_tampered else (
            "held" if incomplete_or_tampered or any(row["status"] == "held" for row in results)
            else "ready"
        )
        health_published = _publish_host_health_once(
            from_studio=from_studio, to_studio=to_studio, state_root=state_root,
            status=health, receipt_signing_private_key=receipt_signing_private_key,
            issued_at=current,
        )
    return {
        "schema_version": "factory-service-scan-result-v1.0",
        "status": health, "run_count": len(run_ids),
        "rejected_count": len(incomplete_or_tampered),
        "runs": tuple(results), "health_published": health_published,
        "content_free": True,
    }


def _main(
    argv: list[str] | None = None,
    *,
    semantic_runtime_factory: Callable[..., SemanticStationAdapter] | None = None,
) -> int:
    parser = argparse.ArgumentParser(prog="factory_service")
    sub = parser.add_subparsers(dest="command", required=True)
    run = sub.add_parser("run")
    run.add_argument("--to-studio", required=True, type=Path)
    run.add_argument("--from-studio", required=True, type=Path)
    run.add_argument("--state-root", required=True, type=Path)
    run.add_argument("--log-root", required=True, type=Path)
    run.add_argument("--run-id", default="")
    run.add_argument("--command-public-key", required=True, action="append", type=Path)
    run.add_argument("--receipt-private-key", required=True, type=Path)
    run.add_argument("--host-role", required=True)
    run.add_argument(
        "--semantic-runtime", choices=("disabled", "accepted-local"),
        default="disabled",
    )
    run.add_argument("--semantic-base-url", default="")
    run.add_argument("--semantic-api-key-file", type=Path)
    run.add_argument("--once", action="store_true")
    run.add_argument("--poll-seconds", type=float, default=5.0)
    run.add_argument("--validation-now", default="")
    args = parser.parse_args(argv)
    validation_now = None
    if args.validation_now:
        if args.host_role != "synthetic":
            parser.error("--validation-now is restricted to synthetic validation")
        validation_now = datetime.fromisoformat(args.validation_now)
        if validation_now.tzinfo is None or validation_now.utcoffset() is None:
            parser.error("--validation-now must include a timezone")
    semantic_station_adapter = None
    if args.semantic_runtime == "accepted-local":
        try:
            if semantic_runtime_factory is None:
                from .factory_semantic_runtime import (
                    SEMANTIC_API_KEY_ENV,
                    SEMANTIC_BASE_URL_ENV,
                    build_accepted_local_runtime_adapter,
                    load_process_local_semantic_api_key,
                    validate_loopback_semantic_base_url,
                )

                if args.semantic_api_key_file is None:
                    raise RuntimeError("process-local semantic credential is not configured")
                base_url = validate_loopback_semantic_base_url(args.semantic_base_url)
                api_key = load_process_local_semantic_api_key(
                    args.semantic_api_key_file,
                    shared_roots=(args.to_studio, args.from_studio),
                )
                private_environment = {
                    SEMANTIC_BASE_URL_ENV: base_url,
                    SEMANTIC_API_KEY_ENV: api_key.get_secret_value(),
                }
                semantic_station_adapter = build_accepted_local_runtime_adapter(
                    to_studio=args.to_studio, from_studio=args.from_studio,
                    state_root=args.state_root, host_role=args.host_role,
                    environment=private_environment,
                )
            else:
                semantic_station_adapter = semantic_runtime_factory(
                    to_studio=args.to_studio, from_studio=args.from_studio,
                    state_root=args.state_root, host_role=args.host_role,
                )
        except Exception as exc:
            print(json.dumps({
                "run_id": args.run_id or "factory-host-service",
                "status": "fault", "reason": type(exc).__name__,
                "content_free": True,
            }, sort_keys=True))
            return 1
    stop = False

    def request_stop(_signum, _frame):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)
    while True:
        try:
            common = dict(
                to_studio=args.to_studio, from_studio=args.from_studio,
                state_root=args.state_root, log_root=args.log_root,
                command_public_key_paths=tuple(args.command_public_key),
                receipt_signing_private_key=args.receipt_private_key,
                host_role=args.host_role,
                semantic_station_adapter=semantic_station_adapter,
                now=validation_now,
            )
            result = (
                run_service_once(run_id=args.run_id, **common)
                if args.run_id else run_service_scan_once(**common)
            )
            print(json.dumps(result, sort_keys=True, separators=(",", ":")))
        except Exception as exc:
            print(json.dumps({
                "run_id": args.run_id or "factory-host-service",
                "status": "fault",
                "reason": type(exc).__name__,
                "content_free": True,
            }, sort_keys=True))
            return 1
        if args.once or stop:
            return 0
        time.sleep(max(0.1, min(args.poll_seconds, 300.0)))


if __name__ == "__main__":
    raise SystemExit(_main())
