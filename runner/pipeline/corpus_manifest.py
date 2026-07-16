"""Content-hash manifests for corpus backup and integrity verification."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


SCHEMA_VERSION = "corpus-manifest-v1.0"
IGNORED_NAMES = {".DS_Store", ".worker.lock", ".app_job.lock"}


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _sha256(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def iter_corpus_files(corpus_dir: Path) -> Iterable[Path]:
    root = Path(corpus_dir)
    if not root.exists():
        return
    for path in sorted(root.rglob("*")):
        if path.is_file() and not path.is_symlink() and path.name not in IGNORED_NAMES:
            yield path


def build_corpus_manifest(corpus_dir: Path) -> dict:
    root = Path(corpus_dir).expanduser().resolve()
    files = []
    total_bytes = 0
    for path in iter_corpus_files(root):
        stat = path.stat()
        total_bytes += stat.st_size
        files.append({
            "path": path.relative_to(root).as_posix(),
            "size": stat.st_size,
            "sha256": _sha256(path),
        })
    return {
        "schema_version": SCHEMA_VERSION,
        "created_at": _now(),
        "corpus_root": str(root),
        "file_count": len(files),
        "total_bytes": total_bytes,
        "files": files,
    }


def write_corpus_manifest(corpus_dir: Path, output_path: Path) -> dict:
    manifest = build_corpus_manifest(corpus_dir)
    output_path = Path(output_path).expanduser()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(output_path.suffix + ".tmp")
    temporary.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    temporary.replace(output_path)
    return manifest


def verify_corpus_manifest(manifest_path: Path, corpus_dir: Path | None = None) -> dict:
    manifest_path = Path(manifest_path).expanduser()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    root = Path(corpus_dir).expanduser().resolve() if corpus_dir else Path(manifest["corpus_root"])
    expected = {row["path"]: row for row in manifest.get("files") or []}
    current_paths = {
        path.relative_to(root).as_posix(): path for path in iter_corpus_files(root)
    }
    missing = sorted(set(expected) - set(current_paths))
    unexpected = sorted(set(current_paths) - set(expected))
    changed = []
    for relative in sorted(set(expected) & set(current_paths)):
        row = expected[relative]
        path = current_paths[relative]
        if path.stat().st_size != int(row.get("size") or 0) or _sha256(path) != row.get("sha256"):
            changed.append(relative)
    return {
        "schema_version": "corpus-manifest-verification-v1.0",
        "verified_at": _now(),
        "manifest_path": str(manifest_path),
        "corpus_root": str(root),
        "ok": not missing and not unexpected and not changed,
        "missing": missing,
        "unexpected": unexpected,
        "changed": changed,
        "expected_files": len(expected),
        "current_files": len(current_paths),
    }
