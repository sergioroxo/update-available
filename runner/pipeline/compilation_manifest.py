"""Atomic, append-only publication manifests for derived compilation artifacts.

The generators remain responsible for immutable artifacts.  This module is the
single visibility boundary: an attempt is useful to readers only after every
referenced byte has been validated and ``latest_completed_compilation.json``
has been atomically replaced with a complete manifest.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import uuid
import threading
import fcntl
import stat
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable

from .atomic_io import atomic_write_json
from .workflow_integrity import canonical_fingerprint, valid_fingerprint, write_immutable_snapshot


SCHEMA_VERSION = "compilation-manifest-v1.0"
ATTEMPT_SCHEMA_VERSION = "compilation-attempt-v1.0"
INDEX_SCHEMA_VERSION = "compilation-index-v1.0"
MAX_ARTIFACT_BYTES = 256 * 1024 * 1024
_ACTIVE = threading.local()
ARTIFACT_KINDS = {
    "provisional_memory", "tag_projection", "batch_outcome", "route_plan",
    "batch_outcome_markdown", "review_pack_index", "review_pack_markdown",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_attempt_id() -> str:
    return f"{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}--{uuid.uuid4().hex[:12]}"


def compilation_batch_key(value: str) -> str:
    raw = str(value)
    if not raw or len(raw) > 500 or any(ord(char) < 32 for char in raw):
        raise ValueError("Compilation batch ID is invalid")
    slug = re.sub(r"[^a-zA-Z0-9_.-]+", "-", raw).strip("-") or "compilation"
    if slug in {".", ".."}:
        slug = "compilation"
    if slug != raw:
        slug = f"{slug}--{hashlib.sha256(raw.encode('utf-8')).hexdigest()[:10]}"
    return slug


def _safe_dir(path: Path, exports_root: Path, *, create: bool) -> Path:
    """Return a descendant directory while refusing symlinked components."""
    exports = Path(exports_root).absolute()
    if exports.is_symlink():
        raise ValueError("Exports root must not be a symlink")
    if not exports.exists():
        if not create:
            raise ValueError("Exports root does not exist")
        exports.mkdir(parents=True, exist_ok=True)
    if not exports.is_dir():
        raise ValueError("Exports root is not a directory")
    target = Path(path).absolute()
    try:
        parts = target.relative_to(exports).parts
    except ValueError as exc:
        raise ValueError("Compilation directory is outside exports") from exc
    current = exports
    for part in parts:
        current = current / part
        if current.exists() or current.is_symlink():
            if current.is_symlink() or not current.is_dir():
                raise ValueError(f"Compilation directory component is unsafe: {current}")
        elif create:
            try:
                os.mkdir(current, 0o700)
            except FileExistsError:
                # A concurrent compiler may have created the same safe parent.
                pass
            mode = os.lstat(current).st_mode
            if not stat.S_ISDIR(mode) or stat.S_ISLNK(mode):
                raise ValueError(f"Compilation directory creation was unsafe: {current}")
        else:
            raise ValueError(f"Compilation directory does not exist: {current}")
    return current


def _sha256(path: Path, *, max_bytes: int = MAX_ARTIFACT_BYTES) -> str:
    path = Path(path)
    if not path.is_file() or path.is_symlink():
        raise ValueError(f"Compilation artifact is not a safe regular file: {path}")
    if path.stat().st_size > max_bytes:
        raise ValueError(f"Compilation artifact exceeds the bounded size limit: {path}")
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def artifact_reference(kind: str, path: Path) -> dict[str, Any]:
    """Capture one immutable artifact by path, byte hash, and optional JSON fingerprint."""
    path = Path(path).resolve()
    ref: dict[str, Any] = {
        "kind": str(kind),
        "path": str(path),
        "sha256": _sha256(path),
        "size_bytes": path.stat().st_size,
    }
    if path.suffix.lower() == ".json":
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            raise ValueError(f"Compilation JSON artifact is malformed: {path}") from exc
        if not isinstance(payload, dict):
            raise ValueError(f"Compilation JSON artifact must be an object: {path}")
        declared = payload.get("content_fingerprint") or payload.get("evidence_fingerprint")
        if declared:
            if not valid_fingerprint(declared):
                raise ValueError(f"Compilation artifact declares an invalid fingerprint: {path}")
            ref["declared_fingerprint"] = declared
        if payload.get("schema_version"):
            ref["schema_version"] = str(payload["schema_version"])
    return ref


def validate_artifact_reference(ref: dict[str, Any]) -> None:
    required = {"kind", "path", "sha256", "size_bytes"}
    if not required <= set(ref) or set(ref) - (required | {"declared_fingerprint", "schema_version"}):
        raise ValueError("Compilation artifact reference is incomplete")
    if ref.get("kind") not in ARTIFACT_KINDS:
        raise ValueError("Compilation artifact kind is unsupported")
    if not Path(str(ref.get("path") or "")).is_absolute():
        raise ValueError("Compilation artifact path must be absolute")
    if not valid_fingerprint(ref.get("sha256")):
        raise ValueError("Compilation artifact SHA-256 is malformed")
    if (
        not isinstance(ref.get("size_bytes"), int)
        or ref["size_bytes"] < 0
        or ref["size_bytes"] > MAX_ARTIFACT_BYTES
    ):
        raise ValueError("Compilation artifact size is malformed")
    path = Path(str(ref["path"]))
    if path.stat().st_size != ref["size_bytes"] or _sha256(path) != ref["sha256"]:
        kind = str(ref.get("kind") or "artifact")
        if kind == "batch_outcome":
            raise ValueError("Batch Outcome content fingerprint changed after manifest commit")
        if kind == "route_plan":
            raise ValueError("Batch route-plan accounting/content fingerprint changed after manifest commit")
        if kind == "batch_outcome_markdown":
            raise ValueError("Batch Outcome Markdown differs from the committed manifest")
        raise ValueError(f"Compilation artifact changed after staging: {path}")


def _stable_manifest(manifest: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in manifest.items() if key not in {"manifest_fingerprint"}}


def validate_compilation_manifest(
    manifest: dict[str, Any], *, validate_files: bool = True,
    exports_root: Path | None = None,
) -> None:
    if manifest.get("schema_version") != SCHEMA_VERSION or manifest.get("status") != "completed":
        raise ValueError("Compilation manifest is not a completed supported manifest")
    expected_keys = {
        "schema_version", "status", "attempt_id", "batch_id", "source",
        "completed_at", "artifacts", "supersedes_manifest_fingerprint",
        "manifest_fingerprint",
    }
    if set(manifest) != expected_keys:
        raise ValueError("Compilation manifest fields do not match the supported schema")
    compilation_batch_key(str(manifest.get("batch_id") or ""))
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}", str(manifest.get("attempt_id") or "")):
        raise ValueError("Compilation manifest attempt ID is invalid")
    if not str(manifest.get("source") or "").strip() or len(str(manifest["source"])) > 200:
        raise ValueError("Compilation manifest source is invalid")
    predecessor = str(manifest.get("supersedes_manifest_fingerprint") or "")
    if predecessor and not valid_fingerprint(predecessor):
        raise ValueError("Compilation manifest predecessor fingerprint is invalid")
    artifacts = manifest.get("artifacts")
    if not isinstance(artifacts, list) or not artifacts:
        raise ValueError("Compilation manifest has no artifacts")
    kinds = [str(row.get("kind") or "") for row in artifacts if isinstance(row, dict)]
    if len(kinds) != len(artifacts) or len(set(kinds)) != len(kinds):
        raise ValueError("Compilation manifest artifact kinds must be unique")
    required = {"provisional_memory", "tag_projection", "batch_outcome"}
    if not required <= set(kinds):
        raise ValueError("Compilation manifest is missing a required derived artifact")
    expected = canonical_fingerprint(_stable_manifest(manifest))
    if not valid_fingerprint(manifest.get("manifest_fingerprint")) or manifest["manifest_fingerprint"] != expected:
        raise ValueError("Compilation manifest fingerprint mismatch")
    if validate_files:
        for ref in artifacts:
            if exports_root is not None:
                try:
                    Path(str(ref["path"])).resolve().relative_to(Path(exports_root).resolve())
                except ValueError as exc:
                    raise ValueError("Compilation manifest references a path outside exports") from exc
            validate_artifact_reference(ref)


def _attempt_root(exports_root: Path, batch_id: str, attempt_id: str) -> Path:
    path = Path(exports_root).absolute() / "compilations" / compilation_batch_key(batch_id) / "attempts" / attempt_id
    return _safe_dir(path, exports_root, create=False)


def begin_compilation_attempt(exports_root: Path, batch_id: str, *, source: str) -> dict[str, Any]:
    """Persist the in-progress visibility marker before any derived child write."""
    attempt_id = _new_attempt_id()
    attempts_root = Path(exports_root).absolute() / "compilations" / compilation_batch_key(batch_id) / "attempts"
    _safe_dir(attempts_root, exports_root, create=True)
    attempt_root = attempts_root / attempt_id
    os.mkdir(attempt_root, 0o700)
    attempt_root = _safe_dir(attempt_root, exports_root, create=False)
    state_path = attempt_root / "attempt.json"
    state = {
        "schema_version": ATTEMPT_SCHEMA_VERSION,
        "attempt_id": attempt_id,
        "batch_id": str(batch_id),
        "source": source,
        "status": "staging",
        "started_at": _now(),
        "artifacts": [],
        "retention": "Preserve for diagnosis; pruning requires a separate explicit policy and command.",
    }
    atomic_write_json(state_path, state)
    _ACTIVE.value = (Path(exports_root), str(batch_id), attempt_id)
    return {"attempt_id": attempt_id, "attempt_path": state_path, "state": state}


def abandon_compilation_attempt(
    exports_root: Path, batch_id: str, attempt_id: str, *, error_type: str,
) -> Path:
    """Mark a pre-publication attempt abandoned without deleting diagnostics."""
    state_path = _attempt_root(exports_root, batch_id, attempt_id) / "attempt.json"
    if not state_path.is_file() or state_path.is_symlink():
        raise ValueError("Compilation attempt marker is missing or unsafe")
    state = json.loads(state_path.read_text(encoding="utf-8"))
    if state.get("status") == "completed":
        return state_path
    state.update({"status": "abandoned", "abandoned_at": _now(), "error_type": str(error_type)})
    atomic_write_json(state_path, state)
    return state_path


def abandon_active_compilation(error: BaseException) -> None:
    active = getattr(_ACTIVE, "value", None)
    if not active:
        return
    try:
        abandon_compilation_attempt(*active, error_type=type(error).__name__)
    finally:
        _ACTIVE.value = None


def publish_completed_compilation(
    exports_root: Path,
    batch_id: str,
    artifacts: Iterable[tuple[str, Path]],
    *,
    source: str,
    previous_manifest: dict[str, Any] | None = None,
    attempt_id: str | None = None,
    failure_injector: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    """Stage, verify, and atomically expose one completed compilation.

    ``failure_injector`` is deliberately test-only plumbing.  Any exception
    leaves a diagnostic attempt but cannot replace the latest completed file.
    """
    if attempt_id is None:
        begun = begin_compilation_attempt(exports_root, batch_id, source=source)
        attempt_id = begun["attempt_id"]
        state_path = begun["attempt_path"]
        state = begun["state"]
    else:
        if (
            not isinstance(attempt_id, str) or not attempt_id or len(attempt_id) > 100
            or attempt_id in {".", ".."}
            or not all(ch.isalnum() or ch in "-_." for ch in attempt_id)
        ):
            raise ValueError("Compilation attempt ID is unsafe")
        attempt_root = _attempt_root(exports_root, batch_id, attempt_id)
        state_path = attempt_root / "attempt.json"
        if not state_path.is_file() or state_path.is_symlink():
            raise ValueError("Existing compilation attempt marker is missing or unsafe")
        state = json.loads(state_path.read_text(encoding="utf-8"))
        if state.get("status") != "staging" or state.get("batch_id") != str(batch_id):
            raise ValueError("Existing compilation attempt is not a matching staging attempt")
    attempt_root = state_path.parent
    published = False
    try:
        refs = []
        for kind, path in artifacts:
            original = Path(path).absolute()
            exports_absolute = Path(exports_root).absolute()
            if exports_absolute.is_symlink():
                raise ValueError("Exports root must not be a symlink")
            try:
                relative_parts = original.relative_to(exports_absolute).parts
            except ValueError as exc:
                raise ValueError(f"Compilation artifact is outside the exports root: {original}") from exc
            component = exports_absolute
            for part in relative_parts:
                component = component / part
                if component.is_symlink():
                    raise ValueError(f"Compilation artifact has a symlinked path component: {component}")
            resolved = original.resolve()
            try:
                resolved.relative_to(Path(exports_root).resolve())
            except ValueError as exc:
                raise ValueError(f"Compilation artifact is outside the exports root: {resolved}") from exc
            refs.append(artifact_reference(kind, resolved))
            state["artifacts"] = refs
            atomic_write_json(state_path, state)
            if failure_injector:
                failure_injector(f"after_stage_{kind}")
        for ref in refs:
            validate_artifact_reference(ref)
        if failure_injector:
            failure_injector("after_validation")
        manifest: dict[str, Any] = {
            "schema_version": SCHEMA_VERSION,
            "status": "completed",
            "attempt_id": attempt_id,
            "batch_id": str(batch_id),
            "source": source,
            "completed_at": _now(),
            "artifacts": refs,
            "supersedes_manifest_fingerprint": (
                str((previous_manifest or {}).get("manifest_fingerprint") or "")
            ),
        }
        manifest["manifest_fingerprint"] = canonical_fingerprint(_stable_manifest(manifest))
        validate_compilation_manifest(manifest)
        completed_path = attempt_root / "completed_manifest.json"
        write_immutable_snapshot(completed_path, manifest, label="completed compilation manifest")
        if failure_injector:
            failure_injector("after_completed_manifest")
        batch_root = _safe_dir(
            Path(exports_root).absolute() / "compilations" / compilation_batch_key(batch_id),
            exports_root, create=True,
        )
        latest = batch_root / "latest_completed_compilation.json"
        lock = latest.parent / ".publish.lock"
        lock.parent.mkdir(parents=True, exist_ok=True)
        lock_fd = os.open(lock, os.O_WRONLY | os.O_CREAT, 0o600)
        try:
            try:
                fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as exc:
                raise RuntimeError("Another compilation is publishing this batch") from exc
            current = load_latest_completed(exports_root, batch_id)
            expected_previous = str((previous_manifest or {}).get("manifest_fingerprint") or "")
            actual_previous = str((current or {}).get("manifest_fingerprint") or "")
            if actual_previous != expected_previous:
                raise RuntimeError("Compilation latest pointer changed during this attempt")
            atomic_write_json(latest, manifest)
            published = True
        finally:
            try:
                fcntl.flock(lock_fd, fcntl.LOCK_UN)
            finally:
                os.close(lock_fd)
        state.update({"status": "completed", "completed_at": manifest["completed_at"], "manifest_path": str(completed_path)})
        atomic_write_json(state_path, state)
        _ACTIVE.value = None
        if failure_injector:
            failure_injector("after_publish")
        return {"manifest": manifest, "manifest_path": completed_path, "latest_path": latest, "attempt_path": state_path}
    except Exception as exc:
        if not published:
            state.update({"status": "abandoned", "abandoned_at": _now(), "error_type": type(exc).__name__})
        atomic_write_json(state_path, state)
        _ACTIVE.value = None
        raise


def load_latest_completed(exports_root: Path, batch_id: str) -> dict[str, Any] | None:
    batch_root = Path(exports_root).absolute() / "compilations" / compilation_batch_key(batch_id)
    if not batch_root.exists() and not batch_root.is_symlink():
        return None
    batch_root = _safe_dir(batch_root, exports_root, create=False)
    path = batch_root / "latest_completed_compilation.json"
    if not path.exists():
        return None
    if not path.is_file() or path.is_symlink() or path.stat().st_size > 4 * 1024 * 1024:
        raise ValueError("Latest compilation manifest is not a safe bounded file")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("batch_id") != str(batch_id):
        raise ValueError("Latest compilation manifest batch ID does not match its lookup key")
    validate_compilation_manifest(payload, exports_root=exports_root)
    return payload


def repair_latest_completed(exports_root: Path, batch_id: str) -> dict[str, Any]:
    """Repoint latest to the newest valid completed attempt; never delete files."""
    base = _safe_dir(
        Path(exports_root).absolute() / "compilations" / compilation_batch_key(batch_id),
        exports_root, create=False,
    )
    latest = base / "latest_completed_compilation.json"
    lock = base / ".publish.lock"
    lock_fd = os.open(lock, os.O_WRONLY | os.O_CREAT, 0o600)
    try:
        fcntl.flock(lock_fd, fcntl.LOCK_EX)
        candidates: list[tuple[str, dict[str, Any], Path]] = []
        for path in (base / "attempts").glob("*/completed_manifest.json"):
            try:
                if path.is_symlink() or path.parent.is_symlink() or path.parent.parent.is_symlink():
                    continue
                payload = json.loads(path.read_text(encoding="utf-8"))
                validate_compilation_manifest(payload, exports_root=exports_root)
                if payload.get("batch_id") != str(batch_id):
                    continue
                candidates.append((str(payload.get("completed_at") or ""), payload, path))
            except (OSError, ValueError, TypeError, json.JSONDecodeError):
                continue
        if not candidates:
            raise ValueError("No valid completed compilation is available for repair")
        _, selected, source_path = max(candidates, key=lambda row: (row[0], row[1]["attempt_id"]))
        atomic_write_json(latest, selected)
    finally:
        try:
            fcntl.flock(lock_fd, fcntl.LOCK_UN)
        finally:
            os.close(lock_fd)
    return {"manifest": selected, "source_path": source_path, "latest_path": latest}


def rebuild_compilation_index(exports_root: Path) -> dict[str, Any]:
    """Reindex valid completed manifests without modifying or deleting artifacts."""
    root_path = Path(exports_root).absolute() / "compilations"
    root = _safe_dir(root_path, exports_root, create=True)
    rows = []
    for path in root.glob("*/attempts/*/completed_manifest.json"):
        try:
            if path.is_symlink() or any(parent.is_symlink() for parent in (path.parent, path.parent.parent, path.parent.parent.parent)):
                continue
            payload = json.loads(path.read_text(encoding="utf-8"))
            validate_compilation_manifest(payload, exports_root=exports_root)
            rows.append({
                "batch_id": payload["batch_id"],
                "attempt_id": payload["attempt_id"],
                "completed_at": payload["completed_at"],
                "manifest_fingerprint": payload["manifest_fingerprint"],
                "path": str(path.resolve()),
            })
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            continue
    rows.sort(key=lambda row: (row["batch_id"], row["completed_at"], row["attempt_id"]))
    stable = {"schema_version": INDEX_SCHEMA_VERSION, "completed_compilations": rows}
    payload = {**stable, "generated_at": _now(), "index_fingerprint": canonical_fingerprint(stable)}
    path = root / "compilation_index.json"
    atomic_write_json(path, payload)
    return {"index": payload, "path": path}
