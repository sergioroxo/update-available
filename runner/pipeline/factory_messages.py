"""Checksum-bound factory message publication and transfer validation.

Only closed immutable files are accepted. A payload is visible to consumers
only when its final ``.sha256`` sidecar exists and verifies.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path, PurePosixPath
from typing import Any

from pydantic import BaseModel

from .atomic_io import atomic_write_bytes
from runner.models.reprocessing import require_relative_path


_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_FORBIDDEN_EXACT = {
    ".env", "source_queue.db", "workflow_attempts.db", "worker.db",
}
_FORBIDDEN_SUFFIXES = {
    ".db", ".sqlite", ".sqlite3", ".wal", ".journal", ".shm",
    ".faiss", ".hnsw", ".ann", ".index",
}
_FORBIDDEN_ENDINGS = ("-wal", "-journal", "-shm")
_SECRET_TOKENS = ("secret", "api_key", "apikey", "access_token", "private_key")


def canonical_json_bytes(payload: BaseModel | dict[str, Any]) -> bytes:
    value = payload.model_dump(mode="json") if isinstance(payload, BaseModel) else payload
    return (
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        + "\n"
    ).encode("utf-8")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def validate_transfer_member(relative_path: str) -> str:
    safe = require_relative_path(relative_path, field="transfer member")
    path = PurePosixPath(safe)
    for part in path.parts:
        lowered = part.lower()
        if lowered in _FORBIDDEN_EXACT or lowered.endswith(_FORBIDDEN_ENDINGS):
            raise ValueError(f"forbidden mutable transfer member: {relative_path}")
        if any(lowered.endswith(suffix) for suffix in _FORBIDDEN_SUFFIXES):
            raise ValueError(f"forbidden mutable transfer member: {relative_path}")
        if any(token in lowered for token in _SECRET_TOKENS):
            raise ValueError(f"forbidden secret-like transfer member: {relative_path}")
    if "indexes" in {part.lower() for part in path.parts}:
        filename = path.name.lower()
        if not (filename.endswith(".tar.gz") or filename.endswith(".tar.gz.sha256")):
            raise ValueError("only closed index archives and sidecars may be transferred")
    return safe


def checksum_sidecar_path(payload_path: Path) -> Path:
    return Path(str(Path(payload_path)) + ".sha256")


def _read_sidecar(sidecar: Path, *, expected_filename: str) -> str:
    if sidecar.is_symlink() or not sidecar.is_file():
        raise ValueError(f"incomplete checksum pair: missing {sidecar.name}")
    raw = sidecar.read_text(encoding="utf-8")
    if not raw.endswith("\n"):
        raise ValueError("incomplete checksum sidecar")
    parts = raw.strip().split()
    if len(parts) != 2 or not _SHA256_RE.fullmatch(parts[0]):
        raise ValueError("malformed checksum sidecar")
    if parts[1] != expected_filename:
        raise ValueError("checksum sidecar filename mismatch")
    return parts[0]


def verify_checksum_pair(payload_path: Path, *, relative_path: str | None = None) -> dict[str, Any]:
    payload_path = Path(payload_path)
    member = validate_transfer_member(relative_path or payload_path.name)
    if payload_path.name.endswith(".partial"):
        raise ValueError("partial payload is not publishable")
    if payload_path.is_symlink() or not payload_path.is_file():
        raise ValueError("checksum payload is missing or linked")
    sidecar = checksum_sidecar_path(payload_path)
    expected = _read_sidecar(sidecar, expected_filename=payload_path.name)
    data = payload_path.read_bytes()
    actual = sha256_bytes(data)
    if actual != expected:
        raise ValueError("checksum mismatch")
    return {
        "relative_path": member,
        "sha256": actual,
        "bytes": len(data),
        "sidecar": sidecar.name,
        "complete": True,
    }


def publish_checksum_bound_json(
    payload: BaseModel | dict[str, Any],
    destination: Path,
    *,
    relative_path: str | None = None,
) -> dict[str, Any]:
    """Publish immutable JSON with the checksum sidecar as visibility boundary."""
    destination = Path(destination)
    validate_transfer_member(relative_path or destination.name)
    if destination.name.endswith((".partial", ".sha256")):
        raise ValueError("destination is not a canonical payload filename")
    sidecar = checksum_sidecar_path(destination)
    data = canonical_json_bytes(payload)
    digest = sha256_bytes(data)
    if destination.exists() or sidecar.exists():
        if destination.is_file() and sidecar.is_file():
            verified = verify_checksum_pair(
                destination, relative_path=relative_path or destination.name,
            )
            if verified["sha256"] == digest and destination.read_bytes() == data:
                return {**verified, "reused": True}
        raise FileExistsError("immutable message path is occupied or incomplete")
    atomic_write_bytes(destination, data)
    # Consumers ignore the payload until this final atomic sidecar publication.
    atomic_write_bytes(sidecar, f"{digest}  {destination.name}\n".encode("utf-8"))
    return {
        **verify_checksum_pair(destination, relative_path=relative_path or destination.name),
        "reused": False,
    }


def publish_checksum_bound_bytes(
    data: bytes,
    destination: Path,
    *,
    relative_path: str | None = None,
) -> dict[str, Any]:
    """Publish caller-supplied immutable bytes with sidecar-last visibility."""
    if not isinstance(data, bytes):
        raise TypeError("checksum-bound payload must be bytes")
    destination = Path(destination)
    validate_transfer_member(relative_path or destination.name)
    if destination.name.endswith((".partial", ".sha256")):
        raise ValueError("destination is not a canonical payload filename")
    sidecar = checksum_sidecar_path(destination)
    digest = sha256_bytes(data)
    if destination.exists() or sidecar.exists():
        if destination.is_file() and sidecar.is_file():
            verified = verify_checksum_pair(
                destination, relative_path=relative_path or destination.name,
            )
            if verified["sha256"] == digest and destination.read_bytes() == data:
                return {**verified, "reused": True}
        raise FileExistsError("immutable message path is occupied or incomplete")
    atomic_write_bytes(destination, data)
    atomic_write_bytes(sidecar, f"{digest}  {destination.name}\n".encode("utf-8"))
    return {
        **verify_checksum_pair(destination, relative_path=relative_path or destination.name),
        "reused": False,
    }


def scan_checksum_pairs(root: Path) -> dict[str, Any]:
    """Return complete verified payloads and explicit held/incomplete entries."""
    root = Path(root)
    ready: list[dict[str, Any]] = []
    held: list[dict[str, str]] = []
    if not root.exists():
        return {"ready": ready, "held": held}
    for path in sorted(root.rglob("*")):
        if not path.is_file() or ".partial" in path.name:
            continue
        relative = path.relative_to(root).as_posix()
        if path.name.endswith(".sha256"):
            payload = Path(str(path)[:-len(".sha256")])
            if payload.is_file():
                # The payload branch verifies and reports each complete pair once.
                continue
            payload_relative = relative[:-len(".sha256")]
            try:
                validate_transfer_member(payload_relative)
                reason = f"incomplete checksum pair: missing {payload.name}"
            except ValueError as exc:
                reason = str(exc)
            held.append({"relative_path": relative, "reason": reason})
            continue
        try:
            ready.append(verify_checksum_pair(path, relative_path=relative))
        except ValueError as exc:
            held.append({"relative_path": relative, "reason": str(exc)})
    return {"ready": ready, "held": held}
