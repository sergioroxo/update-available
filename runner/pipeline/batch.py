"""TASK F — Batch planning and guarded execution ledgers.

plan_batch() inspects the source queue and builds a BatchManifest that
separates overnight-safe items (included) from excluded items with reasons.
It does NOT mutate the queue, does NOT call ingest, and makes no network
requests.

BatchLedger records what batch-run did or would do. Execution itself lives in
runner.main so the CLI can reuse the existing ingest() path.
"""
from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from pathlib import Path

from .source_queue import (
    QueueItem,
    exclusion_reason,
    list_items,
)

# Priority sort order for included items (high first).
_PRIORITY_ORDER: dict[str, int] = {"high": 0, "medium": 1, "low": 2, "skip": 3}

# Absolute ceiling — never exceed this without researcher oversight.
MAX_BATCH_LIMIT: int = 15

# Default limit when none is specified.
DEFAULT_BATCH_LIMIT: int = 10


def _now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class ManifestItem:
    """One queue item as reported in the batch manifest."""
    item_id: str
    url: str
    status: str
    priority: str
    batch_group: str
    recommended_llm: str
    doc_type_hint: str
    included: bool
    exclusion_reason: str    # "" when included


@dataclass
class BatchManifest:
    """Read-only view of batch feasibility. Output of plan_batch().

    No mutations occur during or after creation. Write to disk with
    json.dumps(manifest.to_dict()) if a persistent record is needed.
    """
    generated_at: str
    batch_group_filter: str  # "" = no filter applied
    priority_filter: str     # "" = no filter applied
    limit: int               # effective limit used (after capping at MAX_BATCH_LIMIT)
    total_candidates: int    # items inspected from the queue
    included: list[ManifestItem] = field(default_factory=list)
    excluded: list[ManifestItem] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    @property
    def total_included(self) -> int:
        return len(self.included)

    @property
    def total_excluded(self) -> int:
        return len(self.excluded)

    def to_dict(self) -> dict:
        """Return a JSON-serialisable dict including computed counts."""
        d = asdict(self)
        d["total_included"] = self.total_included
        d["total_excluded"] = self.total_excluded
        return d


@dataclass
class LedgerItem:
    """Execution record for one manifest item."""
    item_id: str
    url: str
    recommended_llm: str
    status: str = "planned"
    doc_id: str = ""
    error: str = ""
    started_at: str = ""
    finished_at: str = ""


@dataclass
class BatchLedger:
    """Persistent record of a batch-run attempt.

    ``execute=False`` ledgers are rehearsals only. ``execute=True`` ledgers
    record each attempted ingest and stop on the first failure.
    """
    batch_id: str
    generated_at: str
    execute: bool
    manifest: dict
    completed: bool = False
    stop_reason: str = ""
    items: list[LedgerItem] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def build_batch_ledger(
    manifest: BatchManifest,
    *,
    batch_id: str,
    execute: bool,
) -> BatchLedger:
    """Create an execution ledger from a dry-run manifest."""
    return BatchLedger(
        batch_id=batch_id,
        generated_at=_now_utc(),
        execute=execute,
        manifest=manifest.to_dict(),
        items=[
            LedgerItem(
                item_id=item.item_id,
                url=item.url,
                recommended_llm=item.recommended_llm,
            )
            for item in manifest.included
        ],
    )


def write_batch_ledger(ledger: BatchLedger, out_dir: Path) -> Path:
    """Write a batch ledger JSON file and return its path."""
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{ledger.batch_id}_ledger.json"
    path.write_text(
        json.dumps(ledger.to_dict(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return path


def plan_batch(
    db: sqlite3.Connection,
    *,
    batch_group: str = "",
    limit: int = DEFAULT_BATCH_LIMIT,
    priority_filter: str = "",
) -> BatchManifest:
    """Inspect the source queue and return a dry-run batch manifest.

    Applies exclusion_reason() (which mirrors is_overnight_safe()) to every
    candidate item. Safe items are sorted by priority (high → medium → low)
    and capped at ``limit``. Items beyond the cap are reported in excluded
    with reason "over_limit".

    Parameters
    ----------
    db:
        Open SQLite connection to the source queue.
    batch_group:
        If non-empty, only inspect items in this batch group.
    limit:
        Maximum included items. Silently capped at MAX_BATCH_LIMIT (15).
        Must be ≥ 1.
    priority_filter:
        If non-empty, only inspect items with this priority level.

    Returns
    -------
    BatchManifest
        Read-only. No queue state is modified.
    """
    effective_limit = min(max(1, limit), MAX_BATCH_LIMIT)
    generated_at = _now_utc()

    # Read a broad set from the queue — no status filter so we can surface
    # excluded items (e.g. status=new needs triage, status=ingested is done).
    candidates: list[QueueItem] = list_items(
        db,
        batch_group=batch_group or None,
        priority=priority_filter or None,
        limit=500,  # internal read ceiling; manifest limit applied after filtering
    )

    safe: list[ManifestItem] = []
    excluded: list[ManifestItem] = []

    for item in candidates:
        reason = exclusion_reason(item)
        mi = ManifestItem(
            item_id=item.id,
            url=item.url,
            status=item.status,
            priority=item.priority,
            batch_group=item.batch_group,
            recommended_llm=item.recommended_llm,
            doc_type_hint=item.doc_type_hint,
            included=False,          # set True below after limit check
            exclusion_reason=reason,
        )
        if reason:
            excluded.append(mi)
        else:
            safe.append(mi)

    # Sort safe items: priority order first, then preserve original queue order
    # (list_items returns newest-first, so stable sort preserves that within tier).
    safe.sort(key=lambda x: _PRIORITY_ORDER.get(x.priority, 2))

    # Apply limit — overflow items go to excluded with reason "over_limit".
    included: list[ManifestItem] = safe[:effective_limit]
    over_limit: list[ManifestItem] = safe[effective_limit:]

    for mi in included:
        mi.included = True
    for mi in over_limit:
        mi.exclusion_reason = "over_limit"
        excluded.append(mi)

    # Build human-readable advisory notes.
    notes: list[str] = []
    not_triaged = sum(1 for e in excluded if e.exclusion_reason == "not_triaged")
    if not_triaged:
        notes.append(
            f"{not_triaged} item(s) need triage first — "
            f"run: python -m runner queue-triage"
        )
    review_blocked = sum(
        1 for e in excluded if e.exclusion_reason.startswith("needs_review:")
    )
    if review_blocked:
        notes.append(
            f"{review_blocked} item(s) excluded: testimony/legal/media/book-splitting "
            f"review flag set — requires attended processing"
        )
    unsafe = sum(1 for e in excluded if e.exclusion_reason == "triage_flagged_unsafe")
    if unsafe:
        notes.append(
            f"{unsafe} item(s) excluded: triage flagged as not batch-safe"
        )
    if over_limit:
        notes.append(
            f"{len(over_limit)} safe item(s) deferred — over the batch limit "
            f"({effective_limit}). Run again after reviewing this batch."
        )

    return BatchManifest(
        generated_at=generated_at,
        batch_group_filter=batch_group,
        priority_filter=priority_filter,
        limit=effective_limit,
        total_candidates=len(candidates),
        included=included,
        excluded=excluded,
        notes=notes,
    )
