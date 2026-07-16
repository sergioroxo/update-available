"""Integrity helpers for dry-run workflow artifacts.

Immutable snapshots are content addressed and created with ``O_EXCL`` so a
second writer cannot replace history.  ``latest_*.json`` files remain atomic,
replaceable projections and are updated only after the immutable snapshot has
been created or verified.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any, Callable

from .atomic_io import atomic_write_json


_SAFE_BATCH_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,99}")
_FINGERPRINT = re.compile(r"[0-9a-f]{64}")


def canonical_fingerprint(payload: Any) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def valid_fingerprint(value: Any) -> bool:
    return bool(_FINGERPRINT.fullmatch(str(value or "")))


def safe_workflow_batch_id(value: Any) -> str:
    batch_id = str(value or "")
    if not _SAFE_BATCH_ID.fullmatch(batch_id) or ".." in batch_id:
        raise ValueError("workflow_batch_id is not safe for an output path")
    return batch_id


def require_bound_fingerprint(
    artifact: dict[str, Any],
    stable_projection: Callable[[dict[str, Any]], dict[str, Any]],
    *,
    label: str,
) -> str:
    fingerprint = str(artifact.get("evidence_fingerprint") or "")
    if not valid_fingerprint(fingerprint):
        raise ValueError(f"{label} evidence fingerprint is missing or malformed")
    if canonical_fingerprint(stable_projection(artifact)) != fingerprint:
        raise ValueError(f"{label} evidence fingerprint does not bind its content")
    return fingerprint


def _load_existing(path: Path, *, label: str) -> dict[str, Any]:
    if not path.is_file() or path.is_symlink():
        raise ValueError(f"Immutable {label} snapshot is not a safe regular file")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"Immutable {label} snapshot is malformed") from exc
    if not isinstance(payload, dict):
        raise ValueError(f"Immutable {label} snapshot is malformed")
    return payload


def _comparable(payload: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in payload.items() if key != "generated_at"}


def write_immutable_snapshot(
    path: Path,
    payload: dict[str, Any],
    *,
    label: str,
) -> dict[str, Any]:
    """Create once or reuse a timestamp-only equivalent immutable snapshot.

    The caller must validate ``payload`` before calling this function.  When a
    matching snapshot already exists, its original timestamp and bytes remain
    authoritative.  Any other same-path content is a collision and is refused.
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = (json.dumps(payload, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    try:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        stored = _load_existing(path, label=label)
    else:
        try:
            with os.fdopen(fd, "wb") as handle:
                handle.write(encoded)
                handle.flush()
                os.fsync(handle.fileno())
        except Exception:
            path.unlink(missing_ok=True)
            raise
        stored = payload

    if _comparable(stored) != _comparable(payload):
        raise ValueError(f"Immutable {label} path collision")
    return stored


def write_immutable_text_snapshot(path: Path, value: str, *, label: str) -> str:
    """Create once or verify one exact UTF-8 immutable text sibling."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = value.encode("utf-8")
    try:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        if not path.is_file() or path.is_symlink():
            raise ValueError(f"Immutable {label} is not a safe regular file")
        try:
            stored = path.read_text(encoding="utf-8")
        except Exception as exc:
            raise ValueError(f"Immutable {label} is malformed") from exc
    else:
        try:
            with os.fdopen(fd, "wb") as handle:
                handle.write(encoded)
                handle.flush()
                os.fsync(handle.fileno())
        except Exception:
            path.unlink(missing_ok=True)
            raise
        stored = value
    if stored != value:
        raise ValueError(f"Immutable {label} path collision")
    return stored


def write_latest_projection(path: Path, stored_snapshot: dict[str, Any]) -> Path:
    """Atomically point a replaceable latest projection at verified history."""
    return atomic_write_json(Path(path), stored_snapshot)
