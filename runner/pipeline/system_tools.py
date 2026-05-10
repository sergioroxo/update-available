"""Small helpers for locating external media tools in user-space installs."""
from __future__ import annotations

import os
import shutil
from pathlib import Path


COMMON_BIN_DIRS = (
    Path("/opt/homebrew/bin"),
    Path("/usr/local/bin"),
    Path.home() / "bin",
)


def tool_path(name: str) -> str:
    """Resolve an executable from PATH or common macOS user install locations."""
    found = shutil.which(name)
    if found:
        return found
    for directory in COMMON_BIN_DIRS:
        candidate = directory / name
        if candidate.exists() and os.access(candidate, os.X_OK):
            return str(candidate)
    return ""


def ensure_tool_path_env() -> None:
    """Prepend common tool dirs so subprocess-based libraries can find tools."""
    current = os.environ.get("PATH", "")
    parts = current.split(os.pathsep) if current else []
    for directory in reversed(COMMON_BIN_DIRS):
        directory_str = str(directory)
        if directory.exists() and directory_str not in parts:
            parts.insert(0, directory_str)
    os.environ["PATH"] = os.pathsep.join(parts)
