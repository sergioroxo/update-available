"""Read-only PDF source inventory backed by a small rebuildable SQLite index.

The scanner never copies, moves, renames, deletes, or opens a PDF in its
default inventory mode.  This is important for OneDrive Files On-Demand:
opening a ``dataless`` placeholder can hydrate/download the full file.

Content hashing and lightweight PDF metadata extraction are available only via
the explicit ``inspect_local=True`` option, and are skipped for placeholders.
"""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


SCHEMA_VERSION = "pdf-asset-index-v1.0"
# Darwin's SF_DATALESS is not exposed by Python's stat module on every build.
SF_DATALESS = 0x40000000


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@dataclass(frozen=True)
class PDFRoot:
    path: str
    label: str
    enabled: bool = True


@dataclass
class PDFFileRecord:
    path: str
    root_path: str
    root_label: str
    filename: str
    relative_path: str
    logical_bytes: int
    allocated_bytes: int
    modified_ns: int
    file_flags: int
    availability: str
    sha256: str = ""
    inspection_status: str = "not_requested"
    page_count: int | None = None
    pdf_title: str = ""
    pdf_author: str = ""
    inspection_error: str = ""


def load_roots(path: Path) -> list[PDFRoot]:
    """Load an allow-list of PDF roots from JSON."""
    try:
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"Could not read PDF root configuration {path}: {exc}") from exc
    rows = payload.get("roots") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        raise ValueError("PDF root configuration must contain a roots list")
    roots: list[PDFRoot] = []
    seen: set[str] = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Every PDF root must be an object")
        raw_path = str(row.get("path") or "").strip()
        if not raw_path:
            raise ValueError("Every PDF root must define a path")
        normalized = str(Path(raw_path).expanduser())
        if normalized in seen:
            raise ValueError(f"Duplicate PDF root: {normalized}")
        seen.add(normalized)
        roots.append(PDFRoot(
            path=normalized,
            label=str(row.get("label") or Path(normalized).name),
            enabled=bool(row.get("enabled", True)),
        ))
    return roots


def _is_dataless(stat_result: os.stat_result | Any) -> bool:
    return bool(int(getattr(stat_result, "st_flags", 0) or 0) & SF_DATALESS)


def _allocated_bytes(stat_result: os.stat_result | Any) -> int:
    blocks = getattr(stat_result, "st_blocks", None)
    return int(blocks) * 512 if blocks is not None else int(stat_result.st_size)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _inspect_pdf(path: Path, record: PDFFileRecord) -> None:
    """Hash and inspect a local PDF. Caller must reject cloud placeholders."""
    record.sha256 = _sha256(path)
    try:
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        record.page_count = len(reader.pages)
        metadata = reader.metadata or {}
        record.pdf_title = str(getattr(metadata, "title", "") or "").strip()
        record.pdf_author = str(getattr(metadata, "author", "") or "").strip()
        record.inspection_status = "inspected"
    except Exception as exc:
        # A content hash is still useful even when the PDF structure is damaged.
        record.inspection_status = "inspection_failed"
        record.inspection_error = str(exc)[:500]


def iter_pdf_records(root: PDFRoot, *, inspect_local: bool = False) -> Iterable[PDFFileRecord]:
    """Yield records under one approved root without following symlinks."""
    root_path = Path(root.path).expanduser()
    if not root.enabled or not root_path.is_dir():
        return
    for directory, dirnames, filenames in os.walk(root_path, followlinks=False):
        dirnames[:] = sorted(name for name in dirnames if not Path(directory, name).is_symlink())
        for filename in sorted(filenames):
            if Path(filename).suffix.casefold() != ".pdf":
                continue
            path = Path(directory, filename)
            if path.is_symlink():
                continue
            try:
                stat_result = path.stat()
            except OSError:
                continue
            dataless = _is_dataless(stat_result)
            record = PDFFileRecord(
                path=str(path),
                root_path=str(root_path),
                root_label=root.label,
                filename=filename,
                relative_path=path.relative_to(root_path).as_posix(),
                logical_bytes=int(stat_result.st_size),
                allocated_bytes=_allocated_bytes(stat_result),
                modified_ns=int(stat_result.st_mtime_ns),
                file_flags=int(getattr(stat_result, "st_flags", 0) or 0),
                availability="cloud_placeholder" if dataless else "local",
                inspection_status="cloud_placeholder_skipped" if dataless and inspect_local else "not_requested",
            )
            if inspect_local and not dataless:
                _inspect_pdf(path, record)
            yield record


def inventory_roots(roots: list[PDFRoot], *, inspect_local: bool = False) -> tuple[list[PDFFileRecord], dict]:
    """Build an in-memory inventory. No database or source file is changed."""
    records: list[PDFFileRecord] = []
    root_summaries: list[dict] = []
    for root in roots:
        root_path = Path(root.path).expanduser()
        if not root.enabled:
            root_summaries.append({"label": root.label, "path": root.path, "status": "disabled", "pdfs": 0})
            continue
        if not root_path.is_dir():
            root_summaries.append({"label": root.label, "path": root.path, "status": "missing", "pdfs": 0})
            continue
        rows = list(iter_pdf_records(root, inspect_local=inspect_local))
        records.extend(rows)
        root_summaries.append({
            "label": root.label,
            "path": str(root_path),
            "status": "available",
            "pdfs": len(rows),
            "local": sum(row.availability == "local" for row in rows),
            "cloud_placeholders": sum(row.availability == "cloud_placeholder" for row in rows),
        })
    summary = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": _now(),
        "inspect_local": inspect_local,
        "roots": root_summaries,
        "pdfs": len(records),
        "local": sum(row.availability == "local" for row in records),
        "cloud_placeholders": sum(row.availability == "cloud_placeholder" for row in records),
        "hashed": sum(bool(row.sha256) for row in records),
        "inspected": sum(row.inspection_status == "inspected" for row in records),
        "inspection_failed": sum(row.inspection_status == "inspection_failed" for row in records),
    }
    return records, summary


_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS pdf_scan_runs (
    run_id TEXT PRIMARY KEY,
    schema_version TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT NOT NULL,
    inspect_local INTEGER NOT NULL,
    pdf_count INTEGER NOT NULL,
    summary_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pdf_roots (
    path TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    enabled INTEGER NOT NULL,
    last_scan_run_id TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pdf_files (
    path TEXT PRIMARY KEY,
    root_path TEXT NOT NULL,
    root_label TEXT NOT NULL,
    filename TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    logical_bytes INTEGER NOT NULL,
    allocated_bytes INTEGER NOT NULL,
    modified_ns INTEGER NOT NULL,
    file_flags INTEGER NOT NULL,
    availability TEXT NOT NULL,
    sha256 TEXT NOT NULL DEFAULT '',
    inspection_status TEXT NOT NULL,
    page_count INTEGER,
    pdf_title TEXT NOT NULL DEFAULT '',
    pdf_author TEXT NOT NULL DEFAULT '',
    inspection_error TEXT NOT NULL DEFAULT '',
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    last_scan_run_id TEXT NOT NULL,
    present INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_pdf_files_sha256 ON pdf_files (sha256);
CREATE INDEX IF NOT EXISTS idx_pdf_files_root ON pdf_files (root_path);
CREATE INDEX IF NOT EXISTS idx_pdf_files_availability ON pdf_files (availability);
"""


def open_index(path: Path) -> sqlite3.Connection:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(str(path))
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.executescript(_SCHEMA_SQL)
    return db


def write_inventory(
    db_path: Path,
    roots: list[PDFRoot],
    records: list[PDFFileRecord],
    summary: dict,
) -> dict:
    """Persist only index rows; source PDFs and folders remain untouched."""
    run_id = f"pdf-scan-{uuid.uuid4().hex[:12]}"
    started_at = str(summary.get("generated_at") or _now())
    finished_at = _now()
    db = open_index(db_path)
    try:
        with db:
            for root in roots:
                db.execute(
                    """INSERT INTO pdf_roots(path,label,enabled,last_scan_run_id,last_seen_at)
                       VALUES(?,?,?,?,?)
                       ON CONFLICT(path) DO UPDATE SET label=excluded.label,
                       enabled=excluded.enabled,last_scan_run_id=excluded.last_scan_run_id,
                       last_seen_at=excluded.last_seen_at""",
                    (root.path, root.label, int(root.enabled), run_id, finished_at),
                )
            for record in records:
                values = asdict(record)
                db.execute(
                    """INSERT INTO pdf_files(
                       path,root_path,root_label,filename,relative_path,logical_bytes,
                       allocated_bytes,modified_ns,file_flags,availability,sha256,
                       inspection_status,page_count,pdf_title,pdf_author,inspection_error,
                       first_seen_at,last_seen_at,last_scan_run_id,present)
                       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)
                       ON CONFLICT(path) DO UPDATE SET
                       root_path=excluded.root_path,root_label=excluded.root_label,
                       filename=excluded.filename,relative_path=excluded.relative_path,
                       logical_bytes=excluded.logical_bytes,allocated_bytes=excluded.allocated_bytes,
                       modified_ns=excluded.modified_ns,file_flags=excluded.file_flags,
                       availability=excluded.availability,
                       sha256=CASE WHEN excluded.sha256<>'' THEN excluded.sha256 ELSE pdf_files.sha256 END,
                       inspection_status=excluded.inspection_status,
                       page_count=COALESCE(excluded.page_count,pdf_files.page_count),
                       pdf_title=CASE WHEN excluded.pdf_title<>'' THEN excluded.pdf_title ELSE pdf_files.pdf_title END,
                       pdf_author=CASE WHEN excluded.pdf_author<>'' THEN excluded.pdf_author ELSE pdf_files.pdf_author END,
                       inspection_error=excluded.inspection_error,last_seen_at=excluded.last_seen_at,
                       last_scan_run_id=excluded.last_scan_run_id,present=1""",
                    (
                        values["path"], values["root_path"], values["root_label"], values["filename"],
                        values["relative_path"], values["logical_bytes"], values["allocated_bytes"],
                        values["modified_ns"], values["file_flags"], values["availability"],
                        values["sha256"], values["inspection_status"], values["page_count"],
                        values["pdf_title"], values["pdf_author"], values["inspection_error"],
                        finished_at, finished_at, run_id,
                    ),
                )
            scanned_roots = [root.path for root in roots if root.enabled and Path(root.path).is_dir()]
            for root_path in scanned_roots:
                db.execute(
                    "UPDATE pdf_files SET present=0 WHERE root_path=? AND last_scan_run_id<>?",
                    (root_path, run_id),
                )
            db.execute(
                "INSERT INTO pdf_scan_runs VALUES(?,?,?,?,?,?,?)",
                (
                    run_id, SCHEMA_VERSION, started_at, finished_at,
                    int(bool(summary.get("inspect_local"))), len(records),
                    json.dumps(summary, ensure_ascii=False, sort_keys=True),
                ),
            )
    finally:
        db.close()
    return {**summary, "run_id": run_id, "db_path": str(Path(db_path)), "written": True}


def scan_pdf_index(
    config_path: Path,
    *,
    db_path: Path | None = None,
    write: bool = False,
    inspect_local: bool = False,
) -> dict:
    """Inventory approved roots and optionally persist the small index database."""
    roots = load_roots(config_path)
    records, summary = inventory_roots(roots, inspect_local=inspect_local)
    if not write:
        return {**summary, "written": False, "db_path": str(db_path or "")}
    if db_path is None:
        raise ValueError("db_path is required when write=True")
    return write_inventory(db_path, roots, records, summary)
