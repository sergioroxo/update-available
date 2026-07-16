"""Append-only local research decisions for exact review dossier snapshots.

This ledger records researcher judgements without changing enrichment sidecars,
canonical records, remote services, or publication state.  A decision is bound
to one content-addressed dossier snapshot.  ``cluster_id`` supports explicit
historical comparison across revised snapshots, but history is never inherited.
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

from .workflow_integrity import canonical_fingerprint, valid_fingerprint
from .review_dossier import validate_review_dossier_snapshot


DB_SCHEMA_VERSION = "review-decisions-v1.0"
SUPPORTED_ACTIONS = frozenset(
    {"accept", "edit", "reject", "defer", "add_variant", "add_evidence", "merge_into"}
)
_IDENTITY = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}")
_IDEMPOTENCY = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _canonical_json(value: Any) -> str:
    try:
        return json.dumps(
            value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False,
        )
    except (TypeError, ValueError) as exc:
        raise ValueError("Decision data must be finite JSON") from exc


def _bounded_text(value: Any, *, label: str, maximum: int, allow_empty: bool = False) -> str:
    if type(value) is not str:
        raise ValueError(f"{label} must be text")
    cleaned = value.strip()
    if (not cleaned and not allow_empty) or len(cleaned) > maximum or "\x00" in cleaned:
        raise ValueError(f"{label} is missing or exceeds its safe bound")
    return cleaned


def _identity(value: Any, *, label: str) -> str:
    text = _bounded_text(value, label=label, maximum=200)
    if not _IDENTITY.fullmatch(text) or ".." in text:
        raise ValueError(f"{label} is malformed")
    return text


def _validate_dossier(dossier: Any) -> tuple[dict[str, Any], str, str]:
    if not isinstance(dossier, dict):
        raise ValueError("Dossier snapshot must be an object")
    if "dossier_fingerprint" in dossier:
        raise ValueError("Dossier content must not contain its derived fingerprint")
    # Round-trip also rejects non-JSON keys/types and gives the exact stored value.
    encoded = _canonical_json(dossier)
    decoded = json.loads(encoded)
    if not isinstance(decoded, dict):  # defensive; the input check already establishes this
        raise ValueError("Dossier snapshot must be an object")
    validate_review_dossier_snapshot(decoded, require_fingerprint=False)
    outcome = str(decoded.get("outcome_content_fingerprint") or "")
    if not valid_fingerprint(outcome):
        raise ValueError("Dossier outcome binding is missing or malformed")
    cluster_id = _identity(decoded.get("cluster_id"), label="Dossier cluster ID")
    family = _identity(decoded.get("family"), label="Dossier family")
    return decoded, cluster_id, family


def dossier_fingerprint(dossier: Mapping[str, Any]) -> str:
    """Return the content address after enforcing the dossier binding contract."""
    decoded, _, _ = _validate_dossier(dict(dossier))
    return canonical_fingerprint(decoded)


_SCHEMA_STATEMENTS = (
    """CREATE TABLE dossier_snapshots (
        dossier_fingerprint TEXT PRIMARY KEY,
        cluster_id TEXT NOT NULL,
        outcome_content_fingerprint TEXT NOT NULL,
        family TEXT NOT NULL,
        dossier_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    )""",
    """CREATE TABLE decision_events (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,
        idempotency_key TEXT NOT NULL UNIQUE,
        request_fingerprint TEXT NOT NULL UNIQUE,
        dossier_fingerprint TEXT NOT NULL REFERENCES dossier_snapshots(dossier_fingerprint),
        sequence INTEGER NOT NULL,
        action TEXT NOT NULL,
        reviewer TEXT NOT NULL,
        reason TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        expected_head_fingerprint TEXT NOT NULL,
        previous_event_fingerprint TEXT NOT NULL,
        event_fingerprint TEXT NOT NULL UNIQUE,
        recorded_at TEXT NOT NULL,
        UNIQUE(dossier_fingerprint, sequence)
    )""",
    """CREATE TABLE ledger_migrations (
        migration_id TEXT PRIMARY KEY,
        from_version TEXT NOT NULL,
        to_version TEXT NOT NULL,
        applied_at TEXT NOT NULL,
        migration_fingerprint TEXT NOT NULL UNIQUE
    )""",
    """CREATE TRIGGER dossier_snapshots_no_update BEFORE UPDATE ON dossier_snapshots
        BEGIN SELECT RAISE(ABORT, 'dossier snapshots are append-only'); END""",
    """CREATE TRIGGER dossier_snapshots_no_delete BEFORE DELETE ON dossier_snapshots
        BEGIN SELECT RAISE(ABORT, 'dossier snapshots are append-only'); END""",
    """CREATE TRIGGER decision_events_no_update BEFORE UPDATE ON decision_events
        BEGIN SELECT RAISE(ABORT, 'decision events are append-only'); END""",
    """CREATE TRIGGER decision_events_no_delete BEFORE DELETE ON decision_events
        BEGIN SELECT RAISE(ABORT, 'decision events are append-only'); END""",
    """CREATE TRIGGER ledger_metadata_no_update BEFORE UPDATE ON ledger_metadata
        BEGIN SELECT RAISE(ABORT, 'ledger metadata are append-only'); END""",
    """CREATE TRIGGER ledger_metadata_no_delete BEFORE DELETE ON ledger_metadata
        BEGIN SELECT RAISE(ABORT, 'ledger metadata are append-only'); END""",
    """CREATE TRIGGER ledger_migrations_no_update BEFORE UPDATE ON ledger_migrations
        BEGIN SELECT RAISE(ABORT, 'ledger migrations are append-only'); END""",
    """CREATE TRIGGER ledger_migrations_no_delete BEFORE DELETE ON ledger_migrations
        BEGIN SELECT RAISE(ABORT, 'ledger migrations are append-only'); END""",
)


def _configure(db: sqlite3.Connection, *, writable: bool) -> None:
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA busy_timeout=30000")
    db.execute("PRAGMA recursive_triggers=ON")
    if int(db.execute("PRAGMA recursive_triggers").fetchone()[0]) != 1:
        raise ValueError("Review decision ledger requires recursive trigger protection")
    if writable:
        mode = str(db.execute("PRAGMA journal_mode=WAL").fetchone()[0]).lower()
        if mode != "wal":
            raise ValueError("Review decision ledger requires WAL journal mode")
        db.execute("PRAGMA synchronous=FULL")
    else:
        db.execute("PRAGMA query_only=ON")


def _validate_schema(db: sqlite3.Connection) -> None:
    versions = [str(row[0]) for row in db.execute("SELECT schema_version FROM ledger_metadata")]
    if versions != [DB_SCHEMA_VERSION]:
        raise ValueError("Unsupported review decision ledger schema")
    required = {"ledger_metadata", "dossier_snapshots", "decision_events", "ledger_migrations"}
    tables = {
        str(row[0]) for row in db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
    }
    if not required <= tables:
        raise ValueError("Review decision ledger schema is incomplete")
    expected_columns = {
        "ledger_metadata": {"schema_version", "created_at"},
        "dossier_snapshots": {
            "dossier_fingerprint", "cluster_id", "outcome_content_fingerprint", "family",
            "dossier_json", "created_at",
        },
        "decision_events": {
            "event_id", "idempotency_key", "request_fingerprint", "dossier_fingerprint",
            "sequence", "action", "reviewer", "reason", "payload_json",
            "expected_head_fingerprint", "previous_event_fingerprint", "event_fingerprint",
            "recorded_at",
        },
        "ledger_migrations": {
            "migration_id", "from_version", "to_version", "applied_at",
            "migration_fingerprint",
        },
    }
    for table, expected in expected_columns.items():
        table_info = db.execute(f"PRAGMA table_info({table})").fetchall()
        actual = {str(row[1]) for row in table_info}
        if actual != expected:
            raise ValueError(f"Review decision ledger table is malformed: {table}")
    expected_primary_keys = {
        "ledger_metadata": ("schema_version",),
        "dossier_snapshots": ("dossier_fingerprint",),
        "decision_events": ("event_id",),
        "ledger_migrations": ("migration_id",),
    }
    expected_unique = {
        "ledger_metadata": {("schema_version",)},
        "dossier_snapshots": {("dossier_fingerprint",)},
        "decision_events": {
            ("idempotency_key",), ("request_fingerprint",),
            ("event_fingerprint",), ("dossier_fingerprint", "sequence"),
        },
        "ledger_migrations": {("migration_id",), ("migration_fingerprint",)},
    }
    for table in required:
        info = db.execute(f"PRAGMA table_info({table})").fetchall()
        primary = tuple(
            str(row[1]) for row in sorted(
                (row for row in info if int(row[5]) > 0), key=lambda row: int(row[5]),
            )
        )
        unique: set[tuple[str, ...]] = set()
        for index in db.execute(f"PRAGMA index_list({table})").fetchall():
            if int(index[2]) != 1:
                continue
            unique.add(tuple(
                str(row[2]) for row in sorted(
                    db.execute(f"PRAGMA index_info({index[1]})").fetchall(),
                    key=lambda row: int(row[0]),
                )
            ))
        if primary != expected_primary_keys[table] or unique != expected_unique[table]:
            raise ValueError(f"Review decision ledger key/uniqueness constraints are malformed: {table}")
    trigger_names = {
        f"{table}_{operation}"
        for table in ("dossier_snapshots", "decision_events", "ledger_metadata", "ledger_migrations")
        for operation in ("no_update", "no_delete")
    }
    triggers = {
        str(row[0]): " ".join(str(row[1] or "").lower().split())
        for row in db.execute("SELECT name,sql FROM sqlite_master WHERE type='trigger'")
    }
    if trigger_names - set(triggers):
        raise ValueError("Review decision ledger append-only protections are incomplete")
    for name in trigger_names:
        operation = "update" if name.endswith("no_update") else "delete"
        table = name.rsplit("_no_", 1)[0]
        if f"before {operation} on {table}" not in triggers[name] or "raise(abort" not in triggers[name]:
            raise ValueError("Review decision ledger append-only trigger is malformed")
    migrations = db.execute("SELECT * FROM ledger_migrations ORDER BY applied_at,migration_id").fetchall()
    if len(migrations) != 1:
        raise ValueError("Review decision ledger migration history is missing")
    migration = migrations[0]
    stable = {
        "migration_id": migration["migration_id"], "from_version": migration["from_version"],
        "to_version": migration["to_version"], "applied_at": migration["applied_at"],
    }
    if (
        migration["migration_id"] != "initial-v1.0"
        or migration["from_version"] != ""
        or migration["to_version"] != DB_SCHEMA_VERSION
        or migration["migration_fingerprint"] != canonical_fingerprint(stable)
    ):
        raise ValueError("Review decision ledger migration history is malformed")
    foreign_keys = db.execute("PRAGMA foreign_key_list(decision_events)").fetchall()
    if not any(
        str(row[2]) == "dossier_snapshots" and str(row[3]) == "dossier_fingerprint"
        and str(row[4]) == "dossier_fingerprint" for row in foreign_keys
    ):
        raise ValueError("Review decision ledger dossier foreign key is missing")


def open_decision_ledger(path: Path, *, create: bool = True) -> sqlite3.Connection:
    """Open and validate a dedicated review decision ledger."""
    path = Path(path)
    if path.is_symlink() or (path.exists() and not path.is_file()):
        raise ValueError(f"Review decision ledger is not a safe regular file: {path}")
    if not create:
        if not path.is_file():
            raise FileNotFoundError(f"Review decision ledger does not exist: {path}")
        db = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True, timeout=30)
        _configure(db, writable=False)
        _validate_schema(db)
        return db
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if not path.exists():
        fd = os.open(path, os.O_RDWR | os.O_CREAT | os.O_EXCL, 0o600)
        os.close(fd)
    os.chmod(path, 0o600)
    db = sqlite3.connect(str(path), timeout=30)
    _configure(db, writable=True)
    try:
        tables = {
            str(row[0]) for row in db.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
        }
        if tables and "ledger_metadata" not in tables:
            raise ValueError("Refusing to initialize a non-ledger SQLite database")
        if tables:
            _validate_schema(db)
            for sibling in (path, Path(str(path) + "-wal"), Path(str(path) + "-shm")):
                if sibling.exists() and not sibling.is_symlink():
                    os.chmod(sibling, 0o600)
            return db
        db.execute("BEGIN IMMEDIATE")
        db.execute("CREATE TABLE ledger_metadata (schema_version TEXT PRIMARY KEY, created_at TEXT NOT NULL)")
        for statement in _SCHEMA_STATEMENTS:
            db.execute(statement)
        now = _now()
        db.execute(
            "INSERT INTO ledger_metadata(schema_version,created_at) VALUES (?,?)",
            (DB_SCHEMA_VERSION, now),
        )
        migration = {
            "migration_id": "initial-v1.0", "from_version": "",
            "to_version": DB_SCHEMA_VERSION, "applied_at": now,
        }
        db.execute(
            """INSERT INTO ledger_migrations
               (migration_id,from_version,to_version,applied_at,migration_fingerprint)
               VALUES (?,?,?,?,?)""",
            (*migration.values(), canonical_fingerprint(migration)),
        )
        _validate_schema(db)
        db.commit()
        for sibling in (path, Path(str(path) + "-wal"), Path(str(path) + "-shm")):
            if sibling.exists() and not sibling.is_symlink():
                os.chmod(sibling, 0o600)
        return db
    except Exception:
        db.rollback()
        db.close()
        raise


def register_dossier(db: sqlite3.Connection, dossier: Mapping[str, Any]) -> dict[str, Any]:
    """Insert or exactly reuse one immutable dossier snapshot."""
    decoded, cluster_id, family = _validate_dossier(dict(dossier))
    encoded = _canonical_json(decoded)
    fingerprint = canonical_fingerprint(decoded)
    record = {
        "dossier_fingerprint": fingerprint,
        "cluster_id": cluster_id,
        "outcome_content_fingerprint": decoded["outcome_content_fingerprint"],
        "family": family,
        "dossier_json": encoded,
    }
    started = not db.in_transaction
    try:
        if started:
            db.execute("BEGIN IMMEDIATE")
        existing = db.execute(
            "SELECT * FROM dossier_snapshots WHERE dossier_fingerprint=?", (fingerprint,)
        ).fetchone()
        if existing is None:
            db.execute(
                """INSERT INTO dossier_snapshots
                   (dossier_fingerprint,cluster_id,outcome_content_fingerprint,family,dossier_json,created_at)
                   VALUES (?,?,?,?,?,?)""",
                (fingerprint, cluster_id, decoded["outcome_content_fingerprint"], family, encoded, _now()),
            )
        elif any(str(existing[key]) != str(value) for key, value in record.items()):
            raise ValueError("Dossier fingerprint collision")
        if started:
            db.commit()
    except Exception:
        if started:
            db.rollback()
        raise
    return {**decoded, "dossier_fingerprint": fingerprint}


def _validate_payload(action: str, payload: Any) -> dict[str, Any]:
    if type(action) is not str or action not in SUPPORTED_ACTIONS:
        raise ValueError("Unsupported review decision action")
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        raise ValueError("Review decision payload must be an object")
    expected = {
        "accept": set(), "reject": set(), "defer": set(),
        "edit": {"label"}, "add_variant": {"variant"},
        "add_evidence": {"doc_id", "quote", "locator"},
        "merge_into": {"target_dossier_fingerprint"},
    }[action]
    if set(payload) != expected:
        raise ValueError(f"{action} payload fields do not match the decision schema")
    if action == "edit":
        return {"label": _bounded_text(payload["label"], label="Edited label", maximum=500)}
    if action == "add_variant":
        return {"variant": _bounded_text(payload["variant"], label="Variant", maximum=500)}
    if action == "add_evidence":
        return {
            "doc_id": _identity(payload["doc_id"], label="Evidence document ID"),
            "quote": _bounded_text(payload["quote"], label="Evidence quote", maximum=8000),
            "locator": _bounded_text(payload["locator"], label="Evidence locator", maximum=1000),
        }
    if action == "merge_into":
        target = str(payload["target_dossier_fingerprint"] or "")
        if not valid_fingerprint(target):
            raise ValueError("Merge target dossier fingerprint is malformed")
        return {"target_dossier_fingerprint": target}
    return {}


def _event_stable(event: sqlite3.Row | Mapping[str, Any]) -> dict[str, Any]:
    return {
        "idempotency_key": event["idempotency_key"],
        "request_fingerprint": event["request_fingerprint"],
        "dossier_fingerprint": event["dossier_fingerprint"],
        "sequence": event["sequence"], "action": event["action"],
        "reviewer": event["reviewer"], "reason": event["reason"],
        "payload_json": event["payload_json"],
        "expected_head_fingerprint": event["expected_head_fingerprint"],
        "previous_event_fingerprint": event["previous_event_fingerprint"],
        "recorded_at": event["recorded_at"],
    }


def _assert_merge_allowed(
    db: sqlite3.Connection, source: sqlite3.Row, target_fingerprint: str,
) -> None:
    if target_fingerprint == source["dossier_fingerprint"]:
        raise ValueError("A dossier cannot merge into itself")
    target = db.execute(
        "SELECT * FROM dossier_snapshots WHERE dossier_fingerprint=?", (target_fingerprint,)
    ).fetchone()
    if target is None:
        raise ValueError("Merge target dossier is not registered")
    if (
        target["outcome_content_fingerprint"] != source["outcome_content_fingerprint"]
        or target["family"] != source["family"]
    ):
        raise ValueError("Merge target must share the exact outcome binding and family")
    seen = {str(source["dossier_fingerprint"])}
    current = target_fingerprint
    while current:
        if current in seen:
            raise ValueError("Dossier merge would create a cycle")
        seen.add(current)
        latest = db.execute(
            """SELECT action,payload_json FROM decision_events
               WHERE dossier_fingerprint=?
                 AND action IN ('accept','edit','reject','defer','merge_into')
               ORDER BY sequence DESC LIMIT 1""", (current,),
        ).fetchone()
        if latest is None or latest["action"] != "merge_into":
            break
        current = str(json.loads(latest["payload_json"])["target_dossier_fingerprint"])


def append_decision(
    db: sqlite3.Connection,
    *,
    dossier_fingerprint: str,
    action: str,
    reviewer: str,
    reason: str,
    payload: Mapping[str, Any] | None,
    idempotency_key: str,
    expected_head: str | None,
) -> dict[str, Any]:
    """Append one event with exact replay and optimistic concurrency semantics."""
    if not valid_fingerprint(dossier_fingerprint):
        raise ValueError("Dossier fingerprint is malformed")
    reviewer = _bounded_text(reviewer, label="Reviewer", maximum=200)
    reason = _bounded_text(reason, label="Decision reason", maximum=4000)
    if type(idempotency_key) is not str or not _IDEMPOTENCY.fullmatch(idempotency_key) or ".." in idempotency_key:
        raise ValueError("Idempotency key is malformed")
    if expected_head is not None and not valid_fingerprint(expected_head):
        raise ValueError("Expected decision head is malformed")
    normalized_payload = _validate_payload(action, {} if payload is None else payload)
    request = {
        "idempotency_key": idempotency_key,
        "dossier_fingerprint": dossier_fingerprint,
        "action": action,
        "reviewer": reviewer,
        "reason": reason,
        "payload": normalized_payload,
        "expected_head": expected_head or "",
    }
    request_fingerprint = canonical_fingerprint(request)
    try:
        db.execute("BEGIN IMMEDIATE")
        replay = db.execute(
            "SELECT * FROM decision_events WHERE idempotency_key=?", (idempotency_key,)
        ).fetchone()
        if replay is not None:
            if replay["request_fingerprint"] != request_fingerprint:
                raise ValueError("Idempotency key collision")
            db.commit()
            return dict(replay)
        dossier = db.execute(
            "SELECT * FROM dossier_snapshots WHERE dossier_fingerprint=?", (dossier_fingerprint,)
        ).fetchone()
        if dossier is None:
            raise ValueError("Dossier snapshot is not registered")
        previous = db.execute(
            "SELECT * FROM decision_events WHERE dossier_fingerprint=? ORDER BY sequence DESC LIMIT 1",
            (dossier_fingerprint,),
        ).fetchone()
        actual_head = str(previous["event_fingerprint"]) if previous is not None else ""
        if (expected_head or "") != actual_head:
            raise ValueError("Decision head changed; refresh before recording another decision")
        if action == "merge_into":
            _assert_merge_allowed(db, dossier, normalized_payload["target_dossier_fingerprint"])
        sequence = int(previous["sequence"]) + 1 if previous is not None else 1
        recorded_at = _now()
        stable = {
            "idempotency_key": idempotency_key,
            "request_fingerprint": request_fingerprint,
            "dossier_fingerprint": dossier_fingerprint,
            "sequence": sequence,
            "action": action,
            "reviewer": reviewer,
            "reason": reason,
            "payload_json": _canonical_json(normalized_payload),
            "expected_head_fingerprint": expected_head or "",
            "previous_event_fingerprint": actual_head,
            "recorded_at": recorded_at,
        }
        fingerprint = canonical_fingerprint(stable)
        db.execute(
            """INSERT INTO decision_events
               (idempotency_key,request_fingerprint,dossier_fingerprint,sequence,action,
                reviewer,reason,payload_json,expected_head_fingerprint,
                previous_event_fingerprint,event_fingerprint,recorded_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                idempotency_key, request_fingerprint, dossier_fingerprint, sequence, action,
                reviewer, reason, stable["payload_json"], expected_head or "", actual_head,
                fingerprint, recorded_at,
            ),
        )
        row = db.execute(
            "SELECT * FROM decision_events WHERE event_fingerprint=?", (fingerprint,)
        ).fetchone()
        db.commit()
        return dict(row)
    except Exception:
        db.rollback()
        raise


def _validate_event_chain(db: sqlite3.Connection, dossier: sqlite3.Row) -> list[sqlite3.Row]:
    rows = db.execute(
        "SELECT * FROM decision_events WHERE dossier_fingerprint=? ORDER BY sequence",
        (dossier["dossier_fingerprint"],),
    ).fetchall()
    previous = ""
    for sequence, event in enumerate(rows, start=1):
        if event["sequence"] != sequence or event["previous_event_fingerprint"] != previous:
            raise ValueError("Review decision event chain is discontinuous")
        payload = json.loads(event["payload_json"])
        normalized = _validate_payload(str(event["action"]), payload)
        if _canonical_json(normalized) != event["payload_json"]:
            raise ValueError("Review decision payload is not canonical")
        request = {
            "idempotency_key": event["idempotency_key"],
            "dossier_fingerprint": event["dossier_fingerprint"],
            "action": event["action"], "reviewer": event["reviewer"],
            "reason": event["reason"], "payload": normalized,
            "expected_head": event["expected_head_fingerprint"],
        }
        if (
            _bounded_text(event["reviewer"], label="Reviewer", maximum=200) != event["reviewer"]
            or _bounded_text(event["reason"], label="Decision reason", maximum=4000) != event["reason"]
            or event["request_fingerprint"] != canonical_fingerprint(request)
            or event["expected_head_fingerprint"] != previous
            or event["event_fingerprint"] != canonical_fingerprint(_event_stable(event))
        ):
            raise ValueError("Review decision event integrity check failed")
        if event["action"] == "merge_into":
            target = db.execute(
                "SELECT * FROM dossier_snapshots WHERE dossier_fingerprint=?",
                (normalized["target_dossier_fingerprint"],),
            ).fetchone()
            if target is None:
                raise ValueError("Merge target dossier is not registered")
            if target["dossier_fingerprint"] == dossier["dossier_fingerprint"]:
                raise ValueError("A dossier cannot merge into itself")
            if (
                target["outcome_content_fingerprint"] != dossier["outcome_content_fingerprint"]
                or target["family"] != dossier["family"]
            ):
                raise ValueError("Merge target must share the exact outcome binding and family")
        previous = str(event["event_fingerprint"])
    return rows


def validate_ledger_integrity(db: sqlite3.Connection) -> dict[str, int]:
    """Revalidate schema, immutable dossier bindings, hash chains, and merges."""
    _validate_schema(db)
    dossiers = db.execute("SELECT * FROM dossier_snapshots ORDER BY dossier_fingerprint").fetchall()
    events = 0
    for row in dossiers:
        try:
            dossier = json.loads(row["dossier_json"])
        except (TypeError, json.JSONDecodeError) as exc:
            raise ValueError("Stored dossier snapshot is malformed") from exc
        decoded, cluster_id, family = _validate_dossier(dossier)
        if (
            _canonical_json(decoded) != row["dossier_json"]
            or canonical_fingerprint(decoded) != row["dossier_fingerprint"]
            or cluster_id != row["cluster_id"]
            or family != row["family"]
            or decoded["outcome_content_fingerprint"] != row["outcome_content_fingerprint"]
        ):
            raise ValueError("Stored dossier snapshot integrity check failed")
        events += len(_validate_event_chain(db, row))
    # Validate the effective (not superseded historical) merge graph.
    for dossier in dossiers:
        current = db.execute(
            """SELECT action,payload_json FROM decision_events
               WHERE dossier_fingerprint=?
                 AND action IN ('accept','edit','reject','defer','merge_into')
               ORDER BY sequence DESC LIMIT 1""",
            (dossier["dossier_fingerprint"],),
        ).fetchone()
        if current is not None and current["action"] == "merge_into":
            _assert_merge_allowed(
                db, dossier, json.loads(current["payload_json"])["target_dossier_fingerprint"],
            )
    return {"dossiers": len(dossiers), "events": events}


def read_dossier_history(db: sqlite3.Connection, dossier_fingerprint: str) -> list[dict[str, Any]]:
    if not valid_fingerprint(dossier_fingerprint):
        raise ValueError("Dossier fingerprint is malformed")
    dossier = db.execute(
        "SELECT * FROM dossier_snapshots WHERE dossier_fingerprint=?", (dossier_fingerprint,)
    ).fetchone()
    if dossier is None:
        return []
    return [dict(row) for row in _validate_event_chain(db, dossier)]


def read_cluster_history(db: sqlite3.Connection, cluster_id: str) -> list[dict[str, Any]]:
    """Return versioned dossier summaries; this never supplies a current decision."""
    cluster_id = _identity(cluster_id, label="Dossier cluster ID")
    rows = db.execute(
        """SELECT d.*,
                  (SELECT COUNT(*) FROM decision_events e
                   WHERE e.dossier_fingerprint=d.dossier_fingerprint) AS decision_count
           FROM dossier_snapshots d WHERE cluster_id=? ORDER BY created_at,dossier_fingerprint""",
        (cluster_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def derive_effective_state(db: sqlite3.Connection, dossier_fingerprint: str) -> dict[str, Any]:
    """Derive the exact snapshot's exclusive disposition and amendments."""
    events = read_dossier_history(db, dossier_fingerprint)
    disposition: dict[str, Any] | None = None
    edits: list[dict[str, Any]] = []
    variants: list[dict[str, Any]] = []
    evidence: list[dict[str, Any]] = []
    for event in events:
        payload = json.loads(event["payload_json"])
        item = {
            "event_fingerprint": event["event_fingerprint"],
            "reviewer": event["reviewer"], "reason": event["reason"],
            "recorded_at": event["recorded_at"], "payload": payload,
        }
        if event["action"] in {"accept", "edit", "reject", "defer", "merge_into"}:
            disposition = {"action": event["action"], **item}
        if event["action"] == "edit":
            edits.append(item)
        elif event["action"] == "add_variant":
            variants.append(item)
        elif event["action"] == "add_evidence":
            evidence.append(item)
    return {
        "dossier_fingerprint": dossier_fingerprint,
        "head_fingerprint": events[-1]["event_fingerprint"] if events else "",
        "event_count": len(events),
        "disposition": disposition,
        "edits": edits,
        "variants": variants,
        "evidence": evidence,
    }
