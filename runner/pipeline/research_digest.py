"""Deterministic research-work digest for the local ingestion system.

This is intentionally not an agent. It performs no model calls and makes no
state changes. It gathers the queue, corpus, source-offload, transfer, and
knowledge-quality state into a compact daily coordination report.
"""
from __future__ import annotations

import json
import sqlite3
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from runner.pipeline import knowledge_quality, source_queue, system_health

DIGEST_DIR = "digests"
DIGEST_SCHEMA_VERSION = "research-digest-v1.0"


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _stamp(value: str | None = None) -> str:
    if value:
        return value
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception:
        return default


def _queue_connection(path: Path):
    if not path.exists():
        return None
    try:
        conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error:
        return None


def _flag_list(row: sqlite3.Row) -> list[str]:
    flags = []
    for name in ("needs_testimony_review", "needs_legal_review", "needs_media_review", "needs_book_splitting"):
        if int(row[name] or 0):
            flags.append(name)
    return flags


def _queue_summary(corpus_dir: Path, *, limit: int = 12) -> dict:
    db_path = source_queue.queue_db_path(corpus_dir)
    conn = _queue_connection(db_path)
    if conn is None:
        return {
            "db_path": str(db_path),
            "exists": db_path.exists(),
            "available": False,
            "counts_by_status": {},
            "counts_by_priority": {},
            "overnight_safe_count": 0,
            "review_flagged_count": 0,
            "next_export_candidates": [],
            "review_flagged_examples": [],
        }

    try:
        by_status = {
            row["status"]: int(row["n"])
            for row in conn.execute("SELECT status, COUNT(*) AS n FROM source_queue GROUP BY status")
        }
        by_priority = {
            row["priority"]: int(row["n"])
            for row in conn.execute("SELECT priority, COUNT(*) AS n FROM source_queue GROUP BY priority")
        }
        rows = conn.execute(
            "SELECT * FROM source_queue WHERE status IN ('triaged','ready_to_ingest') "
            "ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END, added_at DESC "
            "LIMIT ?",
            (max(limit * 4, 25),),
        ).fetchall()
    except sqlite3.Error:
        conn.close()
        return {
            "db_path": str(db_path),
            "exists": True,
            "available": False,
            "counts_by_status": {},
            "counts_by_priority": {},
            "overnight_safe_count": 0,
            "review_flagged_count": 0,
            "next_export_candidates": [],
            "review_flagged_examples": [],
        }
    finally:
        conn.close()

    candidates = []
    flagged = []
    overnight_safe_count = 0
    review_flagged_count = 0
    for row in rows:
        flags = _flag_list(row)
        safe = bool(row["triage_model_used"]) and row["status"] in {"triaged", "ready_to_ingest"} and bool(row["overnight_batch_safe"]) and not flags
        if safe:
            overnight_safe_count += 1
            if len(candidates) < limit:
                candidates.append({
                    "id": row["id"],
                    "status": row["status"],
                    "priority": row["priority"],
                    "source_type": row["source_type"],
                    "recommended_llm": row["recommended_llm"],
                    "title": row["title"],
                    "url": row["url"],
                })
        elif flags:
            review_flagged_count += 1
            if len(flagged) < limit:
                flagged.append({
                    "id": row["id"],
                    "status": row["status"],
                    "priority": row["priority"],
                    "flags": flags,
                    "title": row["title"],
                    "url": row["url"],
                })

    return {
        "db_path": str(db_path),
        "exists": True,
        "available": True,
        "counts_by_status": dict(sorted(by_status.items())),
        "counts_by_priority": dict(sorted(by_priority.items())),
        "overnight_safe_count": overnight_safe_count,
        "review_flagged_count": review_flagged_count,
        "next_export_candidates": candidates,
        "review_flagged_examples": flagged,
    }


def _load_quality(config, *, refresh_quality: bool = False) -> dict:
    if refresh_quality:
        return knowledge_quality.write_knowledge_quality_report(
            Path(config.corpus_dir),
            Path(config.exports_dir),
            config=config,
        )["report"]
    path = Path(config.exports_dir) / knowledge_quality.KNOWLEDGE_EXPORT_DIR / knowledge_quality.KNOWLEDGE_QUALITY_JSON
    report = _read_json(path, {})
    if isinstance(report, dict) and report:
        return report
    return knowledge_quality.build_knowledge_quality_report(
        Path(config.corpus_dir),
        Path(config.exports_dir),
        config=config,
    )


def _top_next_actions(health: dict, quality: dict, queue: dict) -> list[str]:
    actions: list[str] = []
    seen: set[str] = set()

    def add_action(item: str) -> None:
        text = str(item).strip()
        if not text:
            return
        key = (
            text.lower()
            .replace("researcher ", "")
            .replace("proposal(s)", "proposals")
            .replace("await review", "await review")
        )
        if key in seen:
            return
        seen.add(key)
        actions.append(text)

    for item in (health.get("blockers") or [])[:5]:
        add_action(str(item))
    for item in (health.get("actions") or [])[:6]:
        add_action(str(item))
    for item in (quality.get("recommendations") or [])[:6]:
        add_action(str(item))
    if queue.get("overnight_safe_count"):
        add_action(f"{queue['overnight_safe_count']} queue item(s) look safe for source-offload export/overnight processing.")
    if queue.get("review_flagged_count"):
        add_action(f"{queue['review_flagged_count']} queue item(s) need special-handling review before unattended processing.")
    if not actions:
        actions.append("No immediate blockers or quality warnings found.")
    return actions[:12]


def _markdown(digest: dict) -> str:
    health = digest.get("system_health") or {}
    queue = digest.get("queue") or {}
    quality = digest.get("knowledge_quality") or {}
    corpus = health.get("corpus") or {}
    knowledge = health.get("knowledge") or {}
    transfer = health.get("transfer") or {}

    lines = [
        "# SurvivingSOGICE Research Digest",
        "",
        f"Generated: `{digest.get('generated_at')}`",
        f"Status: **{health.get('status', 'unknown')}**",
        "",
        "## Next Actions",
    ]
    for item in digest.get("next_actions") or []:
        lines.append(f"- {item}")

    lines.extend([
        "",
        "## Corpus",
        f"- Documents: {corpus.get('documents', 0)}",
        f"- Analyzed: {corpus.get('analyzed', 0)}",
        f"- Uploaded: {corpus.get('uploaded', 0)}",
        f"- Active incomplete: {corpus.get('active_no_analysis_docs', 0)}",
        f"- Pending enrichment proposals: {corpus.get('pending_enrichment_proposals', 0)}",
        "",
        "## Source Queue",
        f"- Queue DB: `{queue.get('db_path', '')}`",
        f"- Status counts: `{queue.get('counts_by_status', {})}`",
        f"- Priority counts: `{queue.get('counts_by_priority', {})}`",
        f"- Safe candidate rows sampled: {len(queue.get('next_export_candidates') or [])}",
    ])
    if queue.get("next_export_candidates"):
        lines.append("")
        lines.append("### Candidate Queue Items")
        for row in queue["next_export_candidates"][:8]:
            title = row.get("title") or row.get("url") or ""
            lines.append(f"- `{row.get('id')}` · {row.get('priority')} · {row.get('status')} · {title}")

    lines.extend([
        "",
        "## Mac Studio / Transfer",
        f"- Direct incoming folders: {transfer.get('direct_incoming_folder_count', 0)}",
        f"- Incoming archives: {transfer.get('incoming_archive_count', 0)}",
        f"- Returned archives: {transfer.get('returned_archive_count', 0)}",
        "",
        "## Knowledge Exports",
        f"- Profiles: {knowledge.get('document_profiles_count', 0)}",
        f"- Graph nodes: {knowledge.get('node_count', 0)}",
        f"- Graph edges: {knowledge.get('edge_count', 0)}",
        f"- Evidence strength: `{knowledge.get('evidence_strength', {})}`",
        "",
        "## Quality Snapshot",
        f"- Extraction quality: `{(quality.get('extraction') or {}).get('preprocess_quality', {})}`",
        f"- Zero-text docs: {len((quality.get('extraction') or {}).get('zero_text_docs') or [])}",
        f"- Tag registry available: {(quality.get('tag_registry') or {}).get('available')}",
        f"- Quote-backed ratio: {(quality.get('graph') or {}).get('quote_backed_ratio', 0)}",
    ])
    return "\n".join(lines) + "\n"


def build_research_digest(
    config,
    *,
    mac_studio: bool = False,
    source_offload_root: Path | str | None = None,
    transfer_root: Path | str | None = None,
    refresh_quality: bool = False,
) -> dict:
    """Build a read-only coordination digest for the current local setup."""
    health = system_health.build_system_health(
        config,
        mac_studio=mac_studio,
        source_offload_root=source_offload_root,
        transfer_root=transfer_root,
    )
    quality = _load_quality(config, refresh_quality=refresh_quality)
    queue = _queue_summary(Path(config.corpus_dir))
    digest = {
        "schema_version": DIGEST_SCHEMA_VERSION,
        "generated_at": _now(),
        "system_health": health,
        "queue": queue,
        "knowledge_quality": quality,
        "next_actions": _top_next_actions(health, quality, queue),
    }
    digest["markdown"] = _markdown(digest)
    return digest


def write_research_digest(
    config,
    *,
    out_dir: Path | str | None = None,
    stamp: str | None = None,
    mac_studio: bool = False,
    source_offload_root: Path | str | None = None,
    transfer_root: Path | str | None = None,
    refresh_quality: bool = False,
) -> dict:
    digest = build_research_digest(
        config,
        mac_studio=mac_studio,
        source_offload_root=source_offload_root,
        transfer_root=transfer_root,
        refresh_quality=refresh_quality,
    )
    root = Path(out_dir).expanduser() if out_dir else Path(config.exports_dir) / DIGEST_DIR
    root.mkdir(parents=True, exist_ok=True)
    name = f"{_stamp(stamp)}_research_digest"
    json_path = root / f"{name}.json"
    md_path = root / f"{name}.md"
    json_payload = dict(digest)
    json_payload.pop("markdown", None)
    json_path.write_text(json.dumps(json_payload, indent=2), encoding="utf-8")
    md_path.write_text(digest["markdown"], encoding="utf-8")
    return {
        "json_path": str(json_path),
        "markdown_path": str(md_path),
        "digest": digest,
    }
