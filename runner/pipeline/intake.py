"""
Stage 1 — Source intake.

Detects source type (URL / PDF / video / SRT / EPUB), generates a stable doc_id,
checks the Wayback Machine for URL sources, assigns tier and batch,
creates the local corpus directory, and writes intake.json.
"""
from __future__ import annotations
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import uuid

import httpx

from ..config import Config
from ..models.document import IntakeResult

_VIDEO_EXT = {'.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.flv'}
_AUDIO_EXT = {'.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac'}
_DOC_EXT   = {'.pdf', '.docx', '.doc', '.odt'}
_EPUB_EXT  = {'.epub'}
_SRT_EXT   = {'.srt', '.vtt'}


def run(
    source: str,
    tier: Optional[int],
    batch: Optional[str],
    config: Config,
    force_doc_id: Optional[str] = None,
    source_url: Optional[str] = None,   # provenance URL for local-file ingests
) -> IntakeResult:
    doc_id        = force_doc_id or _generate_doc_id()
    source_type   = _detect_source_type(source)
    assigned_tier = tier if tier is not None else _auto_assign_tier(source_type)
    batch_id      = batch or "unassigned"

    # For local files, record the original filename
    original_filename = (
        "" if source_type == "url"
        else Path(source).name
    )

    archive_url = None
    if source_type == "url":
        archive_url = _archive_url(source, config)

    local_dir = _create_local_dir(doc_id, config)

    result = IntakeResult(
        doc_id=doc_id,
        source=source,
        source_type=source_type,
        declared_type=source_type,
        tier=assigned_tier,
        batch_id=batch_id,
        language=None,
        archive_url=archive_url,
        local_dir=local_dir,
        source_url=source_url,
        original_filename=original_filename,
    )

    _save_intake_json(result, local_dir)
    return result


def _save_intake_json(result: IntakeResult, local_dir: Path) -> None:
    """Write intake.json — the authoritative provenance record for this document."""
    data = {
        "doc_id":            result.doc_id,
        "source":            result.source,
        "source_type":       result.source_type,
        "declared_type":     result.declared_type,
        "tier":              result.tier,
        "batch_id":          result.batch_id,
        "language":          result.language,
        "archive_url":       result.archive_url,
        "local_dir":         str(result.local_dir),
        "source_url":        result.source_url,
        "original_filename": result.original_filename,
        "source_html_sha256": result.source_html_sha256,
        "ingested_at":       datetime.now(timezone.utc).isoformat(),
    }
    (local_dir / "intake.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def update_intake_sha256(doc_id: str, sha256: str, config: Config) -> None:
    """Called by preprocess to record the HTML hash after fetching."""
    intake_path = config.corpus_dir / doc_id / "intake.json"
    if not intake_path.exists():
        return
    data = json.loads(intake_path.read_text(encoding="utf-8"))
    data["source_html_sha256"] = sha256
    intake_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def _detect_source_type(source: str) -> str:
    if source.startswith(("http://", "https://")):
        return "url"
    suffix = Path(source).suffix.lower()
    if suffix in _DOC_EXT:
        return "pdf"
    if suffix in _VIDEO_EXT:
        return "video"
    if suffix in _AUDIO_EXT:
        return "audio"
    if suffix in _EPUB_EXT:
        return "epub"
    if suffix in _SRT_EXT:
        return "srt"
    if suffix in {".html", ".htm"}:
        return "html"
    return "html"


def _generate_doc_id() -> str:
    return str(uuid.uuid4())[:8]


def _auto_assign_tier(source_type: str) -> int:
    if source_type in ("video", "audio", "srt"):
        return 2
    return 1


def _archive_url(url: str, config: Config) -> Optional[str]:
    """Check Wayback Machine for existing snapshot; request a save if none found.
    Never blocks intake — returns None on any failure."""
    try:
        r = httpx.get(
            f"https://archive.org/wayback/available?url={url}",
            timeout=10,
        )
        r.raise_for_status()
        closest = r.json().get("archived_snapshots", {}).get("closest")
        if closest and closest.get("available"):
            return closest["url"]

        # Request a fresh save
        r2 = httpx.get(
            f"https://web.archive.org/save/{url}",
            timeout=30,
            follow_redirects=True,
        )
        loc = r2.headers.get("content-location") or r2.headers.get("x-cache-url")
        if loc:
            return loc if loc.startswith("http") else f"https://web.archive.org{loc}"
    except Exception:
        pass
    return None


def _create_local_dir(doc_id: str, config: Config) -> Path:
    doc_dir = config.corpus_dir / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    return doc_dir


def find_existing_by_source(source: str, config: Config) -> list[dict]:
    """Return any previously ingested documents with the same source URL/path."""
    matches: list[dict] = []
    if not config.corpus_dir.exists():
        return matches
    for doc_dir in config.corpus_dir.iterdir():
        intake_path = doc_dir / "intake.json"
        if not intake_path.exists():
            continue
        try:
            data = json.loads(intake_path.read_text(encoding="utf-8"))
            if data.get("source") == source:
                sanity_path = doc_dir / "sanity_record.json"
                if sanity_path.exists():
                    sanity_data = json.loads(sanity_path.read_text(encoding="utf-8"))
                    data["sanity_id"] = sanity_data.get("sanity_id")
                    data["uploaded"] = True
                else:
                    data["uploaded"] = False
                matches.append(data)
        except Exception:
            pass
    return matches
