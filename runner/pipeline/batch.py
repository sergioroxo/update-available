"""TASK F — Batch planning (Slice 1: dry-run manifest only).

plan_batch() inspects the source queue and builds a BatchManifest that
separates overnight-safe items (included) from excluded items with reasons.
It does NOT mutate the queue, does NOT call ingest, and makes no network
requests.

Slice 2 (batch execution) is deliberately NOT in this file yet.
"""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone

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
    generated_at = datetime.now(timezone.utc).isoformat()

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
