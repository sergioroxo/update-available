"""Helpers for local corpus doc_id handling."""
from __future__ import annotations

from pathlib import Path

from ..config import Config


def normalise_local_doc_id(doc_id: str) -> str:
    """Return the local corpus folder id from either local id or Sanity _id."""
    return _validate_doc_id(doc_id.strip().removeprefix("doc-"))


def _validate_doc_id(doc_id: str) -> str:
    raw = doc_id.strip()
    if not raw:
        raise ValueError("Invalid doc_id: empty value.")
    if Path(raw).is_absolute() or ".." in Path(raw).parts or "/" in raw or "\\" in raw:
        raise ValueError(f"Invalid doc_id (path traversal attempt): {raw!r}")
    return raw


def resolve_doc_dir(doc_id: str, config: Config) -> tuple[str, Path]:
    """Resolve a corpus folder from either bare id or Sanity-style doc-* id."""
    raw = _validate_doc_id(doc_id)
    candidates = [raw, normalise_local_doc_id(raw)]
    seen: set[str] = set()
    for candidate in candidates:
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        path = config.corpus_dir / candidate
        if path.exists():
            return candidate, path
    return raw, config.corpus_dir / raw
