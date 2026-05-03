"""
Stage 1 — Source intake.

Detects source type (URL / PDF / video / SRT / EPUB), generates a stable doc_id,
checks the Wayback Machine for URL sources, assigns tier and batch,
creates the local corpus directory.
"""
from __future__ import annotations
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
from typing import Optional
import uuid
from urllib.parse import quote

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
    source_url: str = "",
) -> IntakeResult:
    doc_id      = force_doc_id or _generate_doc_id()
    source_type = _detect_source_type(source)
    assigned_tier = tier if tier is not None else _auto_assign_tier(source_type)
    batch_id    = batch or "unassigned"

    wayback = {"archive_url": None, "status": "skipped", "checked_at": "", "error": ""}
    if source_type == "url":
        wayback = _wayback_check(source)

    local_dir = _create_local_dir(doc_id, config)
    _save_wayback_metadata(local_dir, source, wayback)
    local_copy_path = _copy_local_source(source, source_type, local_dir)

    result = IntakeResult(
        doc_id=doc_id,
        source=source,
        source_type=source_type,
        declared_type=source_type,
        tier=assigned_tier,
        batch_id=batch_id,
        language=None,
        archive_url=wayback.get("archive_url"),
        wayback_status=wayback.get("status", ""),
        wayback_checked_at=wayback.get("checked_at", ""),
        wayback_error=wayback.get("error", ""),
        source_url=source if source_type == "url" else source_url,
        original_filename=Path(source).name if source_type != "url" else "",
        local_copy_path=local_copy_path,
        testimony_consent="",
        local_dir=local_dir,
    )
    _save_intake_metadata(local_dir, result)
    return result


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


def _wayback_check(url: str) -> dict:
    """Check Wayback for a snapshot, request Save Page Now if needed, and return metadata.
    Never blocks intake — failures are recorded as metadata."""
    checked_at = datetime.now(timezone.utc).isoformat()
    try:
        r = httpx.get(
            "https://archive.org/wayback/available",
            params={"url": url},
            timeout=10,
        )
        r.raise_for_status()
        closest = r.json().get("archived_snapshots", {}).get("closest")
        if closest and closest.get("available"):
            return {
                "archive_url": closest.get("url"),
                "status": "existing",
                "checked_at": checked_at,
                "timestamp": closest.get("timestamp", ""),
                "http_status": closest.get("status", ""),
                "error": "",
            }

        # Request a fresh save
        r2 = httpx.get(
            f"https://web.archive.org/save/{quote(url, safe=':/?&=%#')}",
            timeout=30,
            follow_redirects=True,
        )
        loc = r2.headers.get("content-location") or r2.headers.get("x-cache-url")
        if loc:
            archive_url = loc if loc.startswith("http") else f"https://web.archive.org{loc}"
            return {
                "archive_url": archive_url,
                "status": "saved",
                "checked_at": checked_at,
                "timestamp": "",
                "http_status": str(r2.status_code),
                "error": "",
            }
        return {
            "archive_url": None,
            "status": "unavailable",
            "checked_at": checked_at,
            "timestamp": "",
            "http_status": str(r2.status_code),
            "error": "Save Page Now did not return an archive location.",
        }
    except Exception as exc:
        return {
            "archive_url": None,
            "status": "failed",
            "checked_at": checked_at,
            "timestamp": "",
            "http_status": "",
            "error": str(exc),
        }


def _archive_url(url: str, config: Config) -> Optional[str]:
    """Backward-compatible archive URL helper."""
    return _wayback_check(url).get("archive_url")


def _create_local_dir(doc_id: str, config: Config) -> Path:
    doc_dir = config.corpus_dir / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    return doc_dir


def _save_wayback_metadata(doc_dir: Path, source: str, wayback: dict) -> None:
    if wayback.get("status") == "skipped":
        return
    (doc_dir / "wayback.json").write_text(
        json.dumps({"source": source, **wayback}, indent=2),
        encoding="utf-8",
    )
    if wayback.get("status") in {"failed", "unavailable"}:
        _append_wayback_retry(doc_dir.parent, source, wayback)


def _save_intake_metadata(doc_dir: Path, intake: IntakeResult) -> None:
    (doc_dir / "intake.json").write_text(
        json.dumps({
            "doc_id": intake.doc_id,
            "source": intake.source,
            "source_type": intake.source_type,
            "declared_type": intake.declared_type,
            "tier": intake.tier,
            "batch_id": intake.batch_id,
            "language": intake.language,
            "archive_url": intake.archive_url,
            "wayback_status": intake.wayback_status,
            "wayback_checked_at": intake.wayback_checked_at,
            "wayback_error": intake.wayback_error,
            "source_url": intake.source_url,
            "original_filename": intake.original_filename,
            "local_copy_path": intake.local_copy_path,
            "source_html_sha256": intake.source_html_sha256,
            "testimony_consent": intake.testimony_consent,
        }, indent=2),
        encoding="utf-8",
    )


def update_intake_consent(doc_id: str, consent_status: str, config: Config) -> None:
    """Patch testimony consent status in intake.json."""
    if consent_status not in {"confirmed", "pending", "refused"}:
        raise ValueError(f"Invalid testimony consent status: {consent_status!r}")
    intake_path = config.corpus_dir / doc_id / "intake.json"
    if not intake_path.exists():
        return
    try:
        data = json.loads(intake_path.read_text(encoding="utf-8"))
    except Exception:
        data = {}
    data["testimony_consent"] = consent_status
    data["testimony_consent_updated_at"] = datetime.now(timezone.utc).isoformat()
    intake_path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _append_wayback_retry(corpus_dir: Path, source: str, wayback: dict) -> None:
    queue_path = corpus_dir / "wayback_retry_queue.json"
    try:
        queue = json.loads(queue_path.read_text(encoding="utf-8")) if queue_path.exists() else []
    except Exception:
        queue = []
    if any(item.get("source") == source for item in queue):
        return
    queue.append({"source": source, **wayback})
    queue_path.write_text(json.dumps(queue, indent=2), encoding="utf-8")


def _copy_local_source(source: str, source_type: str, doc_dir: Path) -> str:
    if source_type == "url":
        return ""
    path = Path(source).expanduser()
    if not path.exists() or not path.is_file():
        return ""
    target = doc_dir / path.name
    if path.resolve() == target.resolve():
        return str(target)
    try:
        shutil.copy2(path, target)
        return str(target)
    except Exception:
        return ""


def find_existing_by_source(source: str, config: Config) -> list[dict]:
    """Return previous ingests with the same source or provenance URL.

    This catches the common duplicate path where a source is ingested once as a
    URL and later as a local file downloaded from that URL.
    """
    matches: list[dict] = []
    if not config.corpus_dir.exists():
        return matches
    for doc_dir in config.corpus_dir.iterdir():
        intake_path = doc_dir / "intake.json"
        if not intake_path.exists():
            continue
        try:
            data = json.loads(intake_path.read_text(encoding="utf-8"))
            if data.get("source") == source or (
                source.startswith(("http://", "https://"))
                and data.get("source_url") == source
            ):
                sanity_path = doc_dir / "sanity_record.json"
                if sanity_path.exists():
                    sanity_data = json.loads(sanity_path.read_text(encoding="utf-8"))
                    data["sanity_id"] = sanity_data.get("sanity_id")
                    data["uploaded"] = True
                else:
                    data["uploaded"] = False
                data["complete"] = (doc_dir / "extracted.txt").exists() and (doc_dir / "analysis.json").exists()
                matches.append(data)
        except Exception:
            pass
    return matches
