"""Safe local staging for researcher-supplied source files.

This is intentionally not a second ingestion pipeline. It stores one bounded,
content-addressed copy and returns a path that the existing Ingest Workbench can
triage, preserve, extract, analyse, and enrich.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path


ALLOWED_SOURCE_SUFFIXES = {
    ".pdf", ".docx", ".odt", ".epub", ".txt", ".md", ".html", ".htm", ".rtf"
}
MAX_SOURCE_BYTES = 75 * 1024 * 1024


def stage_research_source(
    data: bytes,
    filename: str,
    staging_root: Path,
    *,
    max_bytes: int = MAX_SOURCE_BYTES,
) -> dict:
    """Write an immutable, content-addressed source copy under ``staging_root``.

    Re-uploading identical bytes returns the existing path. The original file is
    never modified and user-supplied path components are never used.
    """
    if not isinstance(data, bytes) or not data:
        raise ValueError("Choose a non-empty source file.")
    if len(data) > max_bytes:
        raise ValueError(f"File is larger than the {max_bytes // (1024 * 1024)} MB staging limit.")
    supplied = Path(str(filename or ""))
    suffix = supplied.suffix.lower()
    if suffix not in ALLOWED_SOURCE_SUFFIXES:
        allowed = ", ".join(sorted(ALLOWED_SOURCE_SUFFIXES))
        raise ValueError(f"Unsupported source type {suffix or '(none)'}. Allowed: {allowed}.")

    digest = hashlib.sha256(data).hexdigest()
    root_input = Path(staging_root).expanduser()
    if root_input.is_symlink():
        raise ValueError("The managed upload directory cannot be a symbolic link.")
    root = root_input.resolve()
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    # Digest-only naming makes identical bytes dedupe even when the researcher
    # uploads them under a different filename.
    target = root / f"{digest}{suffix}"
    if target.is_symlink():
        raise ValueError("Refusing to replace a symbolic-link upload target.")
    if target.exists():
        if not target.is_file() or hashlib.sha256(target.read_bytes()).hexdigest() != digest:
            raise ValueError("A conflicting managed upload already exists.")
        return {"path": str(target), "sha256": digest, "size_bytes": len(data), "duplicate": True}

    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    fd = os.open(target, flags, 0o600)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
    except Exception:
        try:
            target.unlink()
        except OSError:
            pass
        raise
    return {"path": str(target), "sha256": digest, "size_bytes": len(data), "duplicate": False}
