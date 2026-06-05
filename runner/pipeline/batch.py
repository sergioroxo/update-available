"""TASK F — Batch planning and guarded execution ledgers.

plan_batch() inspects the source queue and builds a BatchManifest that
separates overnight-safe items (included) from excluded items with reasons.
It does NOT mutate the queue, does NOT call ingest, and makes no network
requests.

BatchLedger records what batch-run did or would do. Execution itself lives in
runner.main so the CLI can reuse the existing ingest() path.

batch_preflight() runs before live execution to confirm that required services
are reachable and credentials are present. Rehearsal mode must skip it entirely.
"""
from __future__ import annotations

import json
import sqlite3
import httpx
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from pathlib import Path
from typing import NamedTuple, TYPE_CHECKING

from .atomic_io import atomic_write_json, atomic_write_text
from .diagnostics import probe_health as _probe_health, ErrorKind as _DiagErrorKind
from .source_queue import (
    QueueItem,
    exclusion_reason,
    list_items,
)

if TYPE_CHECKING:
    from ..config import Config

# Priority sort order for included items (high first).
_PRIORITY_ORDER: dict[str, int] = {"high": 0, "medium": 1, "low": 2, "skip": 3}

# Absolute ceiling — never exceed this without researcher oversight.
MAX_BATCH_LIMIT: int = 15

# Default limit when none is specified.
DEFAULT_BATCH_LIMIT: int = 10


def _now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Pre-flight infrastructure ─────────────────────────────────────────────────

# Credential values that should be treated as "not configured".
_CRED_PLACEHOLDERS: frozenset[str] = frozenset({
    "",
    "https://<project>.supabase.co",
    "sk-local-research-key-change-this",
})


class PreflightResult(NamedTuple):
    """Result of a single pre-flight check.

    ``check`` is a stable, snake_case identifier used in ledger stop_reason.
    ``ok`` is False for any check that should block live batch execution.
    ``detail`` is an optional remediation hint or raw error excerpt.
    """
    check:   str
    ok:      bool
    message: str
    detail:  str = ""


def _cred_ok(value: str) -> bool:
    """Return True when a credential string looks populated and non-placeholder."""
    return bool(value) and value not in _CRED_PLACEHOLDERS


def _needs_litelm(manifest: BatchManifest) -> bool:
    """Return True if any included item's effective LLM route uses LiteLLM.

    Items with an empty ``recommended_llm`` fall back to ``"litelm"`` in the
    execute loop, so they are treated as litelm-routed here.
    """
    return any(
        (item.recommended_llm or "litelm").startswith("litelm")
        for item in manifest.included
    )


def _control_headers(token: str = "") -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"} if token else {}


def _probe_model_control_endpoint(
    control_url: str,
    *,
    token: str = "",
    timeout: int = 5,
) -> PreflightResult:
    if not _cred_ok(control_url):
        return PreflightResult(
            "litelm_model_control", False,
            "MAC_STUDIO_MODEL_CONTROL_URL not configured",
            "Configure the Mac Studio model-control helper or direct Ollama unload access.",
        )
    try:
        response = httpx.get(
            f"{control_url.rstrip('/')}/health",
            headers=_control_headers(token),
            timeout=timeout,
        )
        response.raise_for_status()
    except Exception as exc:
        return PreflightResult(
            "litelm_model_control", False,
            f"Mac Studio model-control helper not reachable: {control_url}",
            str(exc),
        )
    return PreflightResult(
        "litelm_model_control", True,
        f"Mac Studio model-control helper reachable: {control_url}",
    )


def _probe_ollama_unload_endpoint(base_url: str, *, timeout: int = 5) -> PreflightResult:
    """Check direct Ollama access needed for model unloads.

    LiteLLM health can pass while direct Ollama is unreachable. In that state
    the pipeline can call Qwen, embeddings, and Gemma successfully but fail to
    unload them, which is dangerous on the 64 GB Mac Studio.
    """
    if not _cred_ok(base_url):
        return PreflightResult(
            "litelm_ollama_unload", False,
            "LITELM_OLLAMA_BASE_URL / MAC_STUDIO_OLLAMA_URL not configured",
            "Set it to the Mac Studio Ollama URL, e.g. http://<tailscale-host>:11434.",
        )
    try:
        response = httpx.get(f"{base_url.rstrip('/')}/api/tags", timeout=timeout)
        response.raise_for_status()
    except Exception as exc:
        return PreflightResult(
            "litelm_ollama_unload", False,
            f"Direct Ollama unload endpoint not reachable: {base_url}",
            str(exc),
        )
    return PreflightResult(
        "litelm_ollama_unload", True,
        f"Direct Ollama reachable for model unloads: {base_url}",
    )


def _probe_unload_path(config: Config) -> PreflightResult:
    control_url = str(getattr(config, "mac_studio_model_control_url", ""))
    if _cred_ok(control_url):
        return _probe_model_control_endpoint(
            control_url,
            token=str(getattr(config, "mac_studio_model_control_token", "")),
        )
    return _probe_ollama_unload_endpoint(
        str(getattr(config, "litelm_ollama_base_url", "")),
    )


def batch_preflight(
    config: Config,
    manifest: BatchManifest,
    *,
    ledger_dir: Path,
) -> list[PreflightResult]:
    """Run pre-flight checks before live batch execution.

    Checks (in order):
      1. Sanity credentials present — local, no I/O.
      2. Supabase credentials present — local, no I/O.
      3. LiteLLM endpoint reachable — one HTTP probe, only when included items
         route through a ``litelm*`` LLM path.
      4. Ledger directory writable — local filesystem write test.

    All checks run regardless of earlier failures so the researcher sees the
    complete picture.  The caller must test ``any(not r.ok for r in results)``
    to decide whether to proceed.

    Only call this when ``execute=True``.  Rehearsal mode must skip preflight.
    """
    results: list[PreflightResult] = []

    # ── 1. Sanity credentials (local) ─────────────────────────────────────
    sanity_missing = [
        k for k, v in [
            ("SANITY_PROJECT_ID",  str(config.sanity_project_id)),
            ("SANITY_DATASET",     str(config.sanity_dataset)),
            ("SANITY_WRITE_TOKEN", str(config.sanity_write_token)),
        ]
        if not _cred_ok(v)
    ]
    if sanity_missing:
        results.append(PreflightResult(
            "sanity_credentials", False,
            f"Sanity credentials missing or placeholder: {', '.join(sanity_missing)}",
            "Add the missing values to runner/.env and re-run.",
        ))
    else:
        results.append(PreflightResult(
            "sanity_credentials", True,
            "SANITY_PROJECT_ID + SANITY_DATASET + SANITY_WRITE_TOKEN present",
        ))

    # ── 2. Supabase credentials (local) ───────────────────────────────────
    supa_missing = [
        k for k, v in [
            ("SUPABASE_URL",         str(config.supabase_url)),
            ("SUPABASE_SERVICE_KEY", str(config.supabase_service_key)),
        ]
        if not _cred_ok(v)
    ]
    if supa_missing:
        results.append(PreflightResult(
            "supabase_credentials", False,
            f"Supabase credentials missing or placeholder: {', '.join(supa_missing)}",
            "Add the missing values to runner/.env and re-run.",
        ))
    else:
        results.append(PreflightResult(
            "supabase_credentials", True,
            "SUPABASE_URL + SUPABASE_SERVICE_KEY present",
        ))

    # ── 3. LiteLLM endpoint reachability (network, only when needed) ──────
    if _needs_litelm(manifest):
        litelm_url = str(config.litelm_base_url)
        if not _cred_ok(litelm_url):
            results.append(PreflightResult(
                "litelm_endpoint", False,
                "LITELM_BASE_URL not configured — batch items need the Mac Studio",
                "Set LITELM_BASE_URL in runner/.env to the LiteLLM Tailscale URL.",
            ))
        else:
            dr = _probe_health(
                litelm_url,
                api_key=str(config.litelm_api_key),
                timeout=15,
            )
            if dr.ok or dr.kind == _DiagErrorKind.HEALTH_SLOW:
                results.append(PreflightResult(
                    "litelm_endpoint", True,
                    f"LiteLLM reachable at {litelm_url}",
                    "Health check slow (cold model ping) — inference is OK."
                    if dr.kind == _DiagErrorKind.HEALTH_SLOW else "",
                ))
            else:
                results.append(PreflightResult(
                    "litelm_endpoint", False,
                    f"LiteLLM not reachable: {dr.message}",
                    dr.detail,
                ))
        results.append(_probe_unload_path(config))

    # ── 4. Ledger directory writable (local filesystem) ───────────────────
    try:
        ledger_dir.mkdir(parents=True, exist_ok=True)
        _test = ledger_dir / ".preflight_write_test"
        _test.write_text("ok")
        _test.unlink()
        results.append(PreflightResult(
            "ledger_dir_writable", True,
            f"Ledger directory writable: {ledger_dir}",
        ))
    except OSError as exc:
        results.append(PreflightResult(
            "ledger_dir_writable", False,
            f"Cannot write to ledger directory: {ledger_dir}",
            str(exc),
        ))

    return results


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
    atomic_write_json(path, ledger.to_dict())
    return path


# ── Batch run report ──────────────────────────────────────────────────────────

# Maps preflight check names to researcher-facing next-action hints.
_PREFLIGHT_NEXT_ACTIONS: dict[str, str] = {
    "sanity_credentials": (
        "Add SANITY_PROJECT_ID + SANITY_DATASET + SANITY_WRITE_TOKEN "
        "to runner/.env and re-run."
    ),
    "supabase_credentials": (
        "Add SUPABASE_URL + SUPABASE_SERVICE_KEY to runner/.env and re-run."
    ),
    "litelm_endpoint": (
        "Check Mac Studio / LiteLLM: is Tailscale connected? "
        "Run `runner doctor` for diagnostics."
    ),
    "litelm_ollama_unload": (
        "Enable direct Mac Studio Ollama access for unloads "
        "(set LITELM_OLLAMA_BASE_URL or MAC_STUDIO_OLLAMA_URL), then re-run."
    ),
    "ledger_dir_writable": (
        "Ledger directory not writable — use `--out-dir` to set a writable path."
    ),
}


def _next_action(ledger: BatchLedger) -> str:
    """Return a one-line next-action hint derived from the ledger state.

    Returns ``""`` when no specific guidance applies (e.g. an unrecognised
    stop_reason on an incomplete ledger).
    """
    sr = ledger.stop_reason
    if sr == "no eligible items":
        return (
            "Add sources to the queue, run `runner queue-triage` to triage them, "
            "then re-run batch-run."
        )
    if sr == "execute flag not provided":
        return "Re-run with `--execute` to start live ingestion."
    if sr.startswith("preflight_failed:"):
        check = sr[len("preflight_failed:"):]
        return _PREFLIGHT_NEXT_ACTIONS.get(
            check, "Fix the pre-flight failure above and re-run."
        )
    if sr.startswith("failed:"):
        return "Review the failed item, fix the issue, then re-run batch-run."
    if ledger.completed:
        return (
            "Review ingested documents. "
            "Push approved enrichments with `runner push-enrichment <doc_id>`."
        )
    return ""


def format_batch_report(ledger: BatchLedger, *, ledger_path: Path) -> str:
    """Return a human-readable Markdown report from a BatchLedger.

    The output is valid Markdown and also readable as plain text.
    Suitable for writing to a ``.md`` file or printing to the terminal.
    """
    m = ledger.manifest
    mode = "Live execution" if ledger.execute else "Rehearsal (--execute not provided)"

    sr = ledger.stop_reason
    if ledger.completed:
        result = "✓ Complete"
    elif sr == "no eligible items":
        result = "Skipped — no eligible items in queue"
    elif sr == "execute flag not provided":
        result = "Planned only"
    elif sr.startswith("preflight_failed:"):
        check = sr[len("preflight_failed:"):]
        result = f"✗ Pre-flight failed: {check}"
    elif sr.startswith("failed:"):
        result = "✗ Stopped on failure"
    elif sr:
        result = f"✗ Stopped — {sr}"
    else:
        result = "In progress"

    total_candidates = m.get("total_candidates", 0)
    total_included   = m.get("total_included",   0)
    total_excluded   = m.get("total_excluded",   0)
    notes: list[str] = m.get("notes", [])

    # Item status counts
    status_counts: dict[str, int] = {}
    for item in ledger.items:
        status_counts[item.status] = status_counts.get(item.status, 0) + 1
    status_line = ", ".join(
        f"{v} {k}" for k, v in sorted(status_counts.items())
    ) or "none"

    failed_items = [i for i in ledger.items if i.status == "failed"]
    next_act = _next_action(ledger)

    parts: list[str] = [
        f"# Batch Run Report: {ledger.batch_id}",
        f"",
        f"Mode:      {mode}",
        f"Generated: {ledger.generated_at}",
        f"Result:    {result}",
        f"Stop reason: {ledger.stop_reason or 'none'}",
        f"",
        f"## Manifest",
        f"",
        f"- Candidates: {total_candidates} total "
        f"({total_included} eligible, {total_excluded} excluded)",
    ]

    if notes:
        parts.append("")
        parts.append("Queue notes:")
        for note in notes:
            parts.append(f"  - {note}")

    parts.extend([
        f"",
        f"## Items",
        f"",
        f"- Status: {status_line}",
    ])

    if failed_items:
        fi = failed_items[0]
        parts.extend([
            f"",
            f"## Failure Detail",
            f"",
            f"- URL:   {fi.url}",
            f"- Error: {fi.error}",
        ])

    if next_act:
        parts.extend([
            f"",
            f"## Next Action",
            f"",
            f"{next_act}",
        ])

    parts.extend([
        f"",
        f"---",
        f"",
        f"Ledger: `{ledger_path}`",
    ])

    return "\n".join(parts) + "\n"


def write_batch_report(ledger: BatchLedger, ledger_dir: Path) -> Path:
    """Write a Markdown report next to the batch ledger and return its path.

    The report file is named ``{batch_id}_report.md`` and placed in
    ``ledger_dir``.  The directory is created if it does not exist.
    """
    ledger_dir.mkdir(parents=True, exist_ok=True)
    ledger_path = ledger_dir / f"{ledger.batch_id}_ledger.json"
    report_path = ledger_dir / f"{ledger.batch_id}_report.md"
    content = format_batch_report(ledger, ledger_path=ledger_path)
    atomic_write_text(report_path, content)
    return report_path


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
