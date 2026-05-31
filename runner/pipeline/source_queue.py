"""
Pre-ingestion source queue — SQLite-backed.

URLs live here before the full ingestion pipeline runs. Researchers paste or
import candidate sources, optionally run fast triage, set priorities, and
batch-group them. The queue gates what flows into ``runner ingest``.

DB path  : {corpus_dir.parent}/source_queue.db
No external deps — stdlib sqlite3 only.

Status lifecycle
----------------
  new              → captured but not yet triaged
  triaged          → fast model has inspected it; routing/priority suggested
  ready_to_ingest  → researcher reviewed and approved — NOT yet ingested
  ingested         → ``runner ingest`` completed; corpus_doc_id set
  skipped          → researcher decided not to ingest

Priority values: high | medium | low | skip

URL source types (detect_url_source_type)
-----------------------------------------
  pdf      → URL ends in .pdf
  docx     → URL ends in .doc or .docx
  youtube  → youtube.com/watch, youtu.be, youtube shorts
  video    → other video platforms (vimeo, rumble, …) or video file extension
  audio    → audio platform or audio file extension
  webpage  → any other http/https URL
  unknown  → cannot determine
"""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse, urlunparse

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

VALID_STATUSES: frozenset[str] = frozenset(
    {"new", "triaged", "ready_to_ingest", "ingested", "skipped"}
)
VALID_PRIORITIES: frozenset[str] = frozenset({"high", "medium", "low", "skip"})

_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS source_queue (
    id                TEXT PRIMARY KEY,
    url               TEXT NOT NULL,
    url_hash          TEXT NOT NULL UNIQUE,
    title             TEXT NOT NULL DEFAULT '',
    source_type       TEXT NOT NULL DEFAULT 'webpage',
    doc_type_hint     TEXT NOT NULL DEFAULT 'unknown',
    priority          TEXT NOT NULL DEFAULT 'medium',
    recommended_llm   TEXT NOT NULL DEFAULT 'litelm',
    routing_reason    TEXT NOT NULL DEFAULT '',
    notes             TEXT NOT NULL DEFAULT '',
    tags              TEXT NOT NULL DEFAULT '',
    batch_group       TEXT NOT NULL DEFAULT '',
    status            TEXT NOT NULL DEFAULT 'new',
    added_at          TEXT NOT NULL,
    triaged_at        TEXT NOT NULL DEFAULT '',
    corpus_doc_id     TEXT NOT NULL DEFAULT '',
    triage_model_used TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_sq_status    ON source_queue (status);
CREATE INDEX IF NOT EXISTS idx_sq_priority  ON source_queue (priority);
CREATE INDEX IF NOT EXISTS idx_sq_batch     ON source_queue (batch_group);
"""

# Columns added after initial schema — handled by _migrate_db()
_MIGRATIONS: list[tuple[str, str]] = [
    ("triage_model_used",       "ALTER TABLE source_queue ADD COLUMN triage_model_used TEXT NOT NULL DEFAULT ''"),
    ("needs_book_splitting",    "ALTER TABLE source_queue ADD COLUMN needs_book_splitting INTEGER NOT NULL DEFAULT 0"),
    ("needs_testimony_review",  "ALTER TABLE source_queue ADD COLUMN needs_testimony_review INTEGER NOT NULL DEFAULT 0"),
    ("needs_media_review",      "ALTER TABLE source_queue ADD COLUMN needs_media_review INTEGER NOT NULL DEFAULT 0"),
    ("needs_legal_review",      "ALTER TABLE source_queue ADD COLUMN needs_legal_review INTEGER NOT NULL DEFAULT 0"),
    ("overnight_batch_safe",    "ALTER TABLE source_queue ADD COLUMN overnight_batch_safe INTEGER NOT NULL DEFAULT 1"),
    ("suggested_process_route", "ALTER TABLE source_queue ADD COLUMN suggested_process_route TEXT NOT NULL DEFAULT ''"),
]


# ---------------------------------------------------------------------------
# Data class
# ---------------------------------------------------------------------------

_BOOL_COLUMNS: frozenset[str] = frozenset({
    "needs_book_splitting",
    "needs_testimony_review",
    "needs_media_review",
    "needs_legal_review",
    "overnight_batch_safe",
})


@dataclass
class QueueItem:
    id: str
    url: str
    url_hash: str
    title: str = ""
    source_type: str = "webpage"
    doc_type_hint: str = "unknown"
    priority: str = "medium"
    recommended_llm: str = "litelm"
    routing_reason: str = ""
    notes: str = ""
    tags: str = ""
    batch_group: str = ""
    status: str = "new"
    added_at: str = ""
    triaged_at: str = ""
    corpus_doc_id: str = ""
    triage_model_used: str = ""
    # Workflow routing flags (persisted as SQLite INTEGER 0/1)
    needs_book_splitting: bool = False
    needs_testimony_review: bool = False
    needs_media_review: bool = False
    needs_legal_review: bool = False
    overnight_batch_safe: bool = True
    suggested_process_route: str = ""

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "QueueItem":
        data = {}
        for k in row.keys():
            v = row[k]
            if k in _BOOL_COLUMNS:
                data[k] = bool(v)   # SQLite INTEGER 0/1 -> Python bool
            else:
                data[k] = v or ""   # NULL/empty text -> ""
        return cls(**data)


# Special-handling flags that each block unattended processing on their own.
_SPECIAL_REVIEW_FLAGS: tuple[str, ...] = (
    "needs_testimony_review",
    "needs_legal_review",
    "needs_media_review",
    "needs_book_splitting",
)

# Queue statuses from which an item may be processed unattended.
_OVERNIGHT_ELIGIBLE_STATUSES: frozenset[str] = frozenset({"triaged", "ready_to_ingest"})


def is_overnight_safe(item: QueueItem) -> bool:
    """Return True only when an item is safe for unattended (overnight) processing.

    Fails closed: legacy rows, never-triaged rows, and rows where triage failed
    all return False. ALL of the following must hold:

    - triage actually ran: ``triage_model_used`` is recorded (non-empty). A
      failed triage clears ``overnight_batch_safe`` even though a model name is
      recorded, so it is still excluded by the flag check below.
    - status is ``triaged`` or ``ready_to_ingest`` (the researcher-reachable
      states after triage); ``new`` / ``ingested`` / ``skipped`` are not eligible.
    - ``overnight_batch_safe`` is True.
    - none of the special-review flags (testimony, legal, media, book splitting)
      is set.

    This is the single authority the batch runner (TASK F, not built yet) must
    consult; do not query ``overnight_batch_safe`` directly.
    """
    if not item.triage_model_used:
        return False
    if item.status not in _OVERNIGHT_ELIGIBLE_STATUSES:
        return False
    if not item.overnight_batch_safe:
        return False
    if any(getattr(item, flag, False) for flag in _SPECIAL_REVIEW_FLAGS):
        return False
    return True


def exclusion_reason(item: QueueItem) -> str:
    """Return why this item cannot be batch-processed, or "" if it is safe.

    Mirrors the logic of is_overnight_safe() exactly — any change to that
    function must be reflected here. Returns a stable string constant so
    callers (batch plan, tests, UI) can assert on exact values.

    Reason strings:
      ""                          — item is overnight-safe (no exclusion)
      "not_triaged"               — triage_model_used is empty
      "status:<value>"            — status is not triaged / ready_to_ingest
      "triage_flagged_unsafe"     — overnight_batch_safe is False
      "needs_review:<flag_name>"  — a special-review flag is set
    """
    if not item.triage_model_used:
        return "not_triaged"
    if item.status not in _OVERNIGHT_ELIGIBLE_STATUSES:
        return f"status:{item.status}"
    if not item.overnight_batch_safe:
        return "triage_flagged_unsafe"
    for flag in _SPECIAL_REVIEW_FLAGS:
        if getattr(item, flag, False):
            return f"needs_review:{flag}"
    return ""


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def queue_db_path(corpus_dir: Path) -> Path:
    """Return the queue DB path adjacent to the corpus directory."""
    return corpus_dir.parent / "source_queue.db"


def _migrate_db(conn: sqlite3.Connection) -> None:
    """Add columns that were introduced after the initial schema.

    SQLite does not support IF NOT EXISTS in ALTER TABLE, so we check the
    existing column names from PRAGMA table_info and only add missing ones.
    """
    existing = {row[1] for row in conn.execute("PRAGMA table_info(source_queue)")}
    for col_name, alter_sql in _MIGRATIONS:
        if col_name not in existing:
            conn.execute(alter_sql)
    conn.commit()


def open_db(path: Path) -> sqlite3.Connection:
    """Open (or create) the queue DB with WAL mode enabled."""
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    for stmt in _CREATE_SQL.strip().split(";"):
        stmt = stmt.strip()
        if stmt:
            conn.execute(stmt)
    conn.commit()
    _migrate_db(conn)
    return conn


# ---------------------------------------------------------------------------
# URL normalization
# ---------------------------------------------------------------------------

def normalise_url(url: str) -> str:
    """Normalise URL for stable deduplication.

    - Lowercase scheme and host
    - Treat empty path and "/" as equivalent (both → "")
    - Strip trailing slash on all other paths
    - Drop URL fragment
    """
    url = url.strip()
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    path = parsed.path
    # Canonicalise root: both "" and "/" → ""
    if path in ("", "/"):
        path = ""
    else:
        path = path.rstrip("/")
    return urlunparse((scheme, netloc, path, parsed.params, parsed.query, ""))


def url_hash(url: str) -> str:
    """Return a 24-char hex digest of the normalised URL."""
    return hashlib.sha256(normalise_url(url).encode()).hexdigest()[:24]


def detect_url_source_type(url: str) -> str:
    """Classify a URL's source type using extension/domain heuristics only.

    No network requests are made.

    Returns one of:
      ``"pdf"``     — URL path ends in .pdf
      ``"docx"``    — URL path ends in .doc or .docx
      ``"youtube"`` — YouTube watch/shorts/embed URL
      ``"video"``   — other video platform or video file extension
      ``"audio"``   — audio platform or audio file extension
      ``"webpage"`` — any other http/https URL
      ``"unknown"`` — cannot determine (non-http input, no extension)
    """
    if not url.strip():
        return "unknown"
    lower = url.lower()
    # YouTube (specific category per task spec)
    if any(p in lower for p in (
        "youtube.com/watch", "youtube.com/shorts/", "youtube.com/embed/",
        "youtu.be/",
    )):
        return "youtube"
    # Other video platforms
    if any(d in lower for d in (
        "vimeo.com/", "rumble.com/", "odysee.com/", "bitchute.com/",
        "dailymotion.com/", "facebook.com/watch", "fb.watch",
    )):
        return "video"
    # File extension
    ext = Path(urlparse(url).path).suffix.lower()
    if ext == ".pdf":
        return "pdf"
    if ext in {".doc", ".docx"}:
        return "docx"
    if ext in {".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v", ".flv"}:
        return "video"
    if ext in {".mp3", ".wav", ".m4a", ".ogg", ".aac", ".flac"}:
        return "audio"
    # Audio platforms
    if any(d in lower for d in (
        "soundcloud.com/", "open.spotify.com/", "podcasts.apple.com/",
    )):
        return "audio"
    # Generic web page
    if url.startswith(("http://", "https://")):
        return "webpage"
    return "unknown"


# Private alias used internally (keeps backward compat with old callers)
_detect_source_type = detect_url_source_type


# ---------------------------------------------------------------------------
# Text parsing — Zotero / Notion / browser-tabs / plain-text / CSV
# ---------------------------------------------------------------------------

_URL_RE = re.compile(r"https?://[^\s,\"'<>]+")


def parse_pasted_urls(text: str) -> list[str]:
    """Extract valid URLs from freeform pasted text.

    Handles:
    - One URL per line
    - Lines with trailing title after a tab (Zotero plain-text export)
    - CSV lines — takes the first https:// field per line
    - Lines starting with ``#`` are skipped (comments)
    - Zotero RIS / BibTeX — pulls UR/url fields
    - Duplicate URLs within the same paste are deduplicated (order preserved)
    """
    seen: set[str] = set()
    urls: list[str] = []

    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue

        # Zotero RIS: "UR  - https://..."
        if re.match(r"^UR\s+-\s+", line):
            candidate = line.split("-", 1)[1].strip()
            if candidate.startswith(("http://", "https://")):
                _add_url(urls, seen, candidate)
            continue

        # BibTeX: url = {https://...}
        bib_m = re.match(r"url\s*=\s*[{\"](https?://[^}\"]+)[}\"]", line, re.I)
        if bib_m:
            _add_url(urls, seen, bib_m.group(1))
            continue

        # CSV — extract all http(s) tokens, take the first
        if "," in line:
            for m in _URL_RE.finditer(line):
                _add_url(urls, seen, m.group(0).rstrip(".,;)>"))
                break
            continue

        # Tab-separated (Zotero plain export: URL\tTitle)
        if "\t" in line:
            candidate = line.split("\t")[0].strip()
            if candidate.startswith(("http://", "https://")):
                _add_url(urls, seen, candidate)
            continue

        # Plain URL line (possibly with trailing garbage after a space)
        if line.startswith(("http://", "https://")):
            token = line.split()[0].rstrip(".,;)>")
            _add_url(urls, seen, token)
            continue

        # Last resort: pull any URL from the line
        for m in _URL_RE.finditer(line):
            _add_url(urls, seen, m.group(0).rstrip(".,;)>"))
            break

    return urls


def _add_url(urls: list[str], seen: set[str], raw: str) -> None:
    norm = normalise_url(raw)
    if norm not in seen:
        seen.add(norm)
        urls.append(raw)


# ---------------------------------------------------------------------------
# Corpus dedup
# ---------------------------------------------------------------------------

def already_in_corpus(url: str, corpus_dir: Path) -> Optional[str]:
    """Return doc_id if the URL already exists in the local corpus; else None.

    Checks both ``source`` and ``source_url`` fields in intake.json.
    """
    if not corpus_dir.exists():
        return None
    norm = normalise_url(url)
    for doc_dir in corpus_dir.iterdir():
        if not doc_dir.is_dir():
            continue
        intake_path = doc_dir / "intake.json"
        if not intake_path.exists():
            continue
        try:
            data = json.loads(intake_path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for key in ("source", "source_url"):
            val = data.get(key) or ""
            if val and normalise_url(val) == norm:
                return doc_dir.name
    return None


# ---------------------------------------------------------------------------
# Priority / LLM derivation
# ---------------------------------------------------------------------------

def priority_from_triage(triage_result) -> str:
    """Derive a priority label from a TriageResult."""
    doc_type = getattr(triage_result, "doc_type_hint", "unknown")
    complexity = getattr(triage_result, "complexity", "moderate")
    if doc_type in ("legal", "policy") or complexity == "complex":
        return "high"
    if doc_type in ("promotional", "news") and complexity == "simple":
        return "low"
    return "medium"


def source_type_from_triage(triage_result) -> str:
    doc_type = getattr(triage_result, "doc_type_hint", "unknown")
    if doc_type == "media":
        return "video"
    return "webpage"


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def add_item(
    db: sqlite3.Connection,
    url: str,
    *,
    title: str = "",
    priority: str = "medium",
    notes: str = "",
    tags: str = "",
    batch_group: str = "",
    corpus_doc_id: str = "",
    status: str = "new",
) -> Optional[QueueItem]:
    """Add a single URL to the queue.

    Returns the new ``QueueItem`` on success, or ``None`` if the URL is
    already in the queue (deduplication by url_hash).
    Raises ``ValueError`` for invalid priority.
    """
    if priority not in VALID_PRIORITIES:
        raise ValueError(
            f"Invalid priority: {priority!r}. Choose from {sorted(VALID_PRIORITIES)}"
        )
    if status not in VALID_STATUSES:
        raise ValueError(
            f"Invalid status: {status!r}. Choose from {sorted(VALID_STATUSES)}"
        )
    url = url.strip()
    h = url_hash(url)
    existing = db.execute(
        "SELECT id FROM source_queue WHERE url_hash = ?", (h,)
    ).fetchone()
    if existing:
        return None

    item_id = str(uuid.uuid4())[:8]
    now = _now()
    item = QueueItem(
        id=item_id,
        url=url,
        url_hash=h,
        title=title,
        source_type=detect_url_source_type(url),
        priority=priority,
        notes=notes,
        tags=tags,
        batch_group=batch_group,
        status=status,
        added_at=now,
        corpus_doc_id=corpus_doc_id,
    )
    db.execute(
        """INSERT INTO source_queue
           (id, url, url_hash, title, source_type, doc_type_hint, priority,
            recommended_llm, routing_reason, notes, tags, batch_group,
            status, added_at, triaged_at, corpus_doc_id, triage_model_used)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            item.id, item.url, item.url_hash, item.title, item.source_type,
            item.doc_type_hint, item.priority, item.recommended_llm,
            item.routing_reason, item.notes, item.tags, item.batch_group,
            item.status, item.added_at, item.triaged_at, item.corpus_doc_id,
            item.triage_model_used,
        ),
    )
    db.commit()
    return item


def add_items_from_text(
    db: sqlite3.Connection,
    text: str,
    corpus_dir: Path,
    *,
    priority: str = "medium",
    notes: str = "",
    tags: str = "",
    batch_group: str = "",
) -> tuple[int, int, int]:
    """Parse pasted text, dedup, and bulk-add to the queue.

    Returns ``(added, dup_queue, dup_corpus)`` counts where:

    - ``added``     — new items added with status=new
    - ``dup_queue`` — URLs already present in the queue (not re-added)
    - ``dup_corpus`` — URLs found in the local corpus; added to the queue
      with ``corpus_doc_id`` set and status=new so the researcher can review
      and confirm.  Status is **not** automatically set to ``ingested`` —
      that requires explicit researcher confirmation.
    """
    raw_urls = parse_pasted_urls(text)
    added = dup_queue = dup_corpus = 0

    for raw_url in raw_urls:
        doc_id = already_in_corpus(raw_url, corpus_dir)
        if doc_id:
            # Add to queue with corpus association noted, but status=new.
            # The researcher sees "Already in corpus: <doc_id>" and can
            # decide whether to mark it ingested or skip it.
            result = add_item(
                db, raw_url,
                priority=priority, notes=notes, tags=tags,
                batch_group=batch_group,
                corpus_doc_id=doc_id, status="new",
            )
            if result is None:
                dup_queue += 1
            else:
                dup_corpus += 1
            continue

        result = add_item(
            db, raw_url,
            priority=priority, notes=notes, tags=tags,
            batch_group=batch_group,
        )
        if result is None:
            dup_queue += 1
        else:
            added += 1

    return added, dup_queue, dup_corpus


def get_item(db: sqlite3.Connection, item_id: str) -> Optional[QueueItem]:
    """Fetch a single queue item by ID."""
    row = db.execute(
        "SELECT * FROM source_queue WHERE id = ?", (item_id,)
    ).fetchone()
    return QueueItem.from_row(row) if row else None


def list_items(
    db: sqlite3.Connection,
    *,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    batch_group: Optional[str] = None,
    limit: int = 500,
) -> list[QueueItem]:
    """List queue items with optional filters, newest first."""
    where: list[str] = []
    params: list = []
    if status:
        where.append("status = ?")
        params.append(status)
    if priority:
        where.append("priority = ?")
        params.append(priority)
    if batch_group is not None and batch_group != "":
        where.append("batch_group = ?")
        params.append(batch_group)
    sql = "SELECT * FROM source_queue"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY added_at DESC LIMIT ?"
    params.append(limit)
    return [QueueItem.from_row(r) for r in db.execute(sql, params).fetchall()]


def update_status(db: sqlite3.Connection, item_id: str, status: str) -> bool:
    """Set the status of a queue item. Returns True if the row was found."""
    if status not in VALID_STATUSES:
        raise ValueError(
            f"Invalid status: {status!r}. Choose from {sorted(VALID_STATUSES)}"
        )
    cur = db.execute(
        "UPDATE source_queue SET status = ? WHERE id = ?", (status, item_id)
    )
    db.commit()
    return cur.rowcount > 0


def update_priority(db: sqlite3.Connection, item_id: str, priority: str) -> bool:
    """Set the priority of a queue item."""
    if priority not in VALID_PRIORITIES:
        raise ValueError(f"Invalid priority: {priority!r}")
    cur = db.execute(
        "UPDATE source_queue SET priority = ? WHERE id = ?", (priority, item_id)
    )
    db.commit()
    return cur.rowcount > 0


def apply_triage_result(
    db: sqlite3.Connection,
    item_id: str,
    triage_result,
    *,
    model_name: str = "",
) -> bool:
    """Write TriageResult fields to the queue row and set status=triaged.

    ``model_name`` is the human-readable name of the model that ran triage
    (e.g. ``"litelm/triage"`` or ``"qwen3.5:9b"``).  Stored in
    ``triage_model_used`` for provenance.
    """
    priority = priority_from_triage(triage_result)
    s_type = source_type_from_triage(triage_result)
    cur = db.execute(
        """UPDATE source_queue SET
               doc_type_hint          = ?,
               recommended_llm        = ?,
               routing_reason         = ?,
               priority               = ?,
               source_type            = CASE WHEN source_type IN ('webpage', 'url') THEN ? ELSE source_type END,
               needs_book_splitting   = ?,
               needs_testimony_review = ?,
               needs_media_review     = ?,
               needs_legal_review     = ?,
               overnight_batch_safe   = ?,
               suggested_process_route = ?,
               status                 = 'triaged',
               triaged_at             = ?,
               triage_model_used      = ?
           WHERE id = ?""",
        (
            triage_result.doc_type_hint,
            triage_result.recommended_llm,
            triage_result.routing_reason,
            priority,
            s_type,
            int(getattr(triage_result, "needs_book_splitting",    False)),
            int(getattr(triage_result, "needs_testimony_review",  False)),
            int(getattr(triage_result, "needs_media_review",      False)),
            int(getattr(triage_result, "needs_legal_review",      False)),
            # Fail closed: a triage object without this attribute is not safe.
            int(getattr(triage_result, "overnight_batch_safe",    False)),
            getattr(triage_result,     "suggested_process_route", ""),
            _now(),
            model_name,
            item_id,
        ),
    )
    db.commit()
    return cur.rowcount > 0


def mark_ingested(db: sqlite3.Connection, item_id: str, doc_id: str) -> bool:
    """Mark a queue item as ingested and link it to the corpus doc_id."""
    cur = db.execute(
        "UPDATE source_queue SET status = 'ingested', corpus_doc_id = ? WHERE id = ?",
        (doc_id, item_id),
    )
    db.commit()
    return cur.rowcount > 0


def update_notes(
    db: sqlite3.Connection,
    item_id: str,
    *,
    notes: Optional[str] = None,
    tags: Optional[str] = None,
    batch_group: Optional[str] = None,
    title: Optional[str] = None,
) -> bool:
    """Patch one or more metadata fields on a queue item."""
    pairs: list[tuple[str, str]] = []
    if notes is not None:
        pairs.append(("notes", notes))
    if tags is not None:
        pairs.append(("tags", tags))
    if batch_group is not None:
        pairs.append(("batch_group", batch_group))
    if title is not None:
        pairs.append(("title", title))
    if not pairs:
        return False
    set_clause = ", ".join(f"{col} = ?" for col, _ in pairs)
    values = [v for _, v in pairs] + [item_id]
    cur = db.execute(
        f"UPDATE source_queue SET {set_clause} WHERE id = ?", values
    )
    db.commit()
    return cur.rowcount > 0


def delete_item(db: sqlite3.Connection, item_id: str) -> bool:
    """Permanently remove a queue item."""
    cur = db.execute("DELETE FROM source_queue WHERE id = ?", (item_id,))
    db.commit()
    return cur.rowcount > 0


def queue_stats(db: sqlite3.Connection) -> dict:
    """Return counts by status and priority."""
    by_status: dict[str, int] = {}
    for row in db.execute(
        "SELECT status, COUNT(*) AS n FROM source_queue GROUP BY status"
    ):
        by_status[row["status"]] = row["n"]
    by_priority: dict[str, int] = {}
    for row in db.execute(
        "SELECT priority, COUNT(*) AS n FROM source_queue GROUP BY priority"
    ):
        by_priority[row["priority"]] = row["n"]
    total = db.execute("SELECT COUNT(*) AS n FROM source_queue").fetchone()["n"]
    return {"total": total, "by_status": by_status, "by_priority": by_priority}


def batch_groups(db: sqlite3.Connection) -> list[str]:
    """Return sorted list of non-empty batch group names."""
    rows = db.execute(
        "SELECT DISTINCT batch_group FROM source_queue WHERE batch_group != '' ORDER BY batch_group"
    ).fetchall()
    return [r["batch_group"] for r in rows]
