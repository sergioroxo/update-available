"""Shared conservative privacy transforms for derived external-safe artifacts."""
from __future__ import annotations

from typing import Any


LOCAL_PATH_MARKERS = ("/Users/", "/Volumes/", "/private/", "file:///", "\\Users\\")
PATH_KEYS = {"path", "local_path", "corpus_dir", "ledger_path", "package_dir"}


def redact_local_paths(value: Any, key: str = "") -> Any:
    """Recursively remove local paths, including paths embedded in prose/URLs.

    If a string contains a local path anywhere, withhold the complete string.
    This intentionally favors non-disclosure over preserving partial wording.
    It is path-safety, not anonymization certification.
    """
    if key in PATH_KEYS or key.endswith("_path"):
        return ""
    if isinstance(value, str):
        return "[local path withheld]" if any(marker in value for marker in LOCAL_PATH_MARKERS) else value
    if isinstance(value, list):
        return [redact_local_paths(item) for item in value]
    if isinstance(value, dict):
        return {str(name): redact_local_paths(item, str(name)) for name, item in value.items()}
    return value
