"""
Pure helper functions for the Provenance / Audit view in the Streamlit UI.

No ``streamlit`` imports — this module is safe to import in headless test
environments and CLI contexts.  ``runner/app.py`` imports from here so that the
Streamlit render functions can call these helpers.

Public API:
    ProvenanceWarning                               — structured finding dataclass
    _load_analysis_audit(doc_dir)                   → dict
    _load_enrichment_audit(doc_dir)                 → dict
    _load_preservation_status_dict(doc_dir)         → dict
    _check_artifact_completeness(doc_dir)           → dict[str, bool]
    _detect_commit_mismatch(doc_dir)                → ProvenanceWarning | None
    _collect_provenance_warnings(doc_dir, ...)      → list[ProvenanceWarning]
    _generate_researcher_checklist(warnings)        → list[str]
"""
from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass, field
from pathlib import Path


ALLOWED_NETWORK_CONNECTION_TYPES = (
    "partner",
    "funds",
    "funded_by",
    "affiliate",
    "parent_org",
    "child_org",
    "legal_defense",
    "training_provider",
    "media_outlet",
    "co-signatory",
    "opposes",
)


# ---------------------------------------------------------------------------
# Structured warning type
# ---------------------------------------------------------------------------

@dataclass
class ProvenanceWarning:
    """A single provenance or quality-control finding.

    severity
        ``action_needed``    — researcher should act before using this document
                               in the archive (e.g. missing language, unknown date).
        ``pre_push_blocker`` — must be resolved before running ``push-enrichment``
                               (e.g. ``enrich_existing`` proposal without an entity ID).
        ``provenance_note``  — informational; no action required now; worth recording
                               for methodology (e.g. triage misclassification, commit
                               mismatch between analysis and enrichment).
    """

    severity: str               # "action_needed" | "pre_push_blocker" | "provenance_note"
    title: str                  # Short label shown in checklists and section headers
    explanation: str            # Why this is a problem / what was observed
    suggested_action: str       # What the researcher should do (or "No action needed…")
    source_fields: list[str] = field(default_factory=list)
    """Optional file/field references, e.g. ``["analysis.json → languages"]``."""


# ---------------------------------------------------------------------------
# Internal I/O helper
# ---------------------------------------------------------------------------

def _read_json_safe(path: Path, default):
    """Load a JSON file, returning *default* on absent or corrupt file."""
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------

def _load_analysis_audit(doc_dir: Path) -> dict:
    """Load ``analysis_audit.json``, returning ``{}`` on absent or corrupt file."""
    return _read_json_safe(doc_dir / "analysis_audit.json", {})


def _load_enrichment_audit(doc_dir: Path) -> dict:
    """Load ``enrichment_audit.json``, returning ``{}`` on absent or corrupt file."""
    return _read_json_safe(doc_dir / "enrichment_audit.json", {})


def _load_preservation_status_dict(doc_dir: Path) -> dict:
    """Load ``preservation_status.json`` as a plain dict.

    Returns ``{}`` on absent or corrupt file.
    """
    result = _read_json_safe(doc_dir / "preservation_status.json", {})
    return result if isinstance(result, dict) else {}


# ---------------------------------------------------------------------------
# Artifact completeness
# ---------------------------------------------------------------------------

def _check_artifact_completeness(doc_dir: Path) -> dict[str, bool]:
    """Return a dict mapping artifact label → whether the file is present.

    The "extracted text" entry is True when either ``extracted.txt`` or
    ``extracted.md`` exists.
    """
    return {
        "intake.json":            (doc_dir / "intake.json").exists(),
        "preprocess.json":        (doc_dir / "preprocess.json").exists(),
        "extracted text":         (
            (doc_dir / "extracted.txt").exists()
            or (doc_dir / "extracted.md").exists()
        ),
        "analysis.json":          (doc_dir / "analysis.json").exists(),
        "analysis_audit.json":    (doc_dir / "analysis_audit.json").exists(),
        "embedding.json":         (doc_dir / "embedding.json").exists(),
        "sanity_record.json":     (doc_dir / "sanity_record.json").exists(),
        "enrichment.json":        (doc_dir / "enrichment.json").exists(),
        "enrichment_audit.json":  (doc_dir / "enrichment_audit.json").exists(),
        "preservation_status.json": (doc_dir / "preservation_status.json").exists(),
    }


# ---------------------------------------------------------------------------
# Commit mismatch detection
# ---------------------------------------------------------------------------

def _detect_commit_mismatch(doc_dir: Path) -> "ProvenanceWarning | None":
    """Return a ``provenance_note`` if analysis and enrichment git commits differ.

    Returns ``None`` when either audit file is absent, or when the commits match.
    """
    audit  = _load_analysis_audit(doc_dir)
    eaudit = _load_enrichment_audit(doc_dir)
    a_commit = (audit.get("git_commit") or "").strip()
    e_commit = (eaudit.get("git_commit") or "").strip()
    if a_commit and e_commit and a_commit != e_commit:
        return ProvenanceWarning(
            severity="provenance_note",
            title="Analysis/enrichment commit mismatch",
            explanation=(
                f"Analysis was produced at commit `{a_commit[:12]}` and enrichment "
                f"at `{e_commit[:12]}`. They ran against different versions of the "
                "prompt or schema."
            ),
            suggested_action=(
                "Safe to ignore — this is informational. "
                "Check git history if a schema change may have occurred between commits."
            ),
            source_fields=[
                "analysis_audit.json → git_commit",
                "enrichment_audit.json → git_commit",
            ],
        )
    return None


# ---------------------------------------------------------------------------
# Warning collector — pure logic, no I/O besides local file reads
# ---------------------------------------------------------------------------

def _collect_provenance_warnings(
    doc_dir: Path, *, config=None
) -> list[ProvenanceWarning]:
    """Return a list of structured provenance findings.

    Severity mapping:
        ``action_needed``    — missing languages, unknown date
        ``pre_push_blocker`` — ``enrich_existing`` proposals without ``existing_entity_id``
        ``provenance_note``  — source_type mismatch, analysis/enrichment commit mismatch

    All checks are derived from local files only — no network, no Sanity/Supabase.
    """
    warnings_out: list[ProvenanceWarning] = []

    analysis = _read_json_safe(doc_dir / "analysis.json", {})

    # 1. Missing languages ──────────────────────────────────────────────────
    if not analysis.get("languages"):
        warnings_out.append(ProvenanceWarning(
            severity="action_needed",
            title="Languages missing",
            explanation="`analysis.languages` is empty — the document language is unrecorded.",
            suggested_action=(
                "In the app: Document List → open this document → Reanalyze (or edit "
                "`analysis.json → languages` manually with ISO 639-1 code(s)). "
                "Not required before pushing to Sanity, but affects archive quality "
                "and multilingual export."
            ),
            source_fields=["analysis.json → languages"],
        ))

    # 2. Missing document/publication date ──────────────────────────────────
    doc_date = analysis.get("document_date") or {}
    preprocess = _read_json_safe(doc_dir / "preprocess.json", {})
    preprocess_date = str(preprocess.get("date_published") or "").strip()
    if not doc_date.get("year") and not preprocess_date:
        # Read intake.json to surface capture/ingest date as context only.
        # The ingest/Wayback date is NOT the publication date.
        intake_for_date = _read_json_safe(doc_dir / "intake.json", {})
        ingested_at = str(intake_for_date.get("ingested_at") or "").strip()
        archive_url = str(intake_for_date.get("archive_url") or "").strip()

        explanation_parts = [
            "Neither `document_date.year` nor `preprocess.date_published` is set. "
            "The document has no dateable anchor for the archive timeline.",
        ]
        if ingested_at:
            explanation_parts.append(
                f"The ingestion date (`{ingested_at[:10]}`) records when the page was "
                "fetched by this tool — it is **not** the publication date. "
                "Do not use it as a proxy for when the document was created or published."
            )
        elif archive_url:
            explanation_parts.append(
                "A Wayback Machine URL is present, but the Wayback capture date records "
                "when the page was archived, not when it was originally published. "
                "Do not use the Wayback date as the publication date."
            )
        else:
            explanation_parts.append(
                "Note: any Wayback capture date or ingestion timestamp records when the "
                "page was archived or fetched — not when it was created or published."
            )

        source_fields_date = [
            "analysis.json → document_date",
            "preprocess.json → date_published",
        ]
        if ingested_at:
            source_fields_date.append(
                f"intake.json → ingested_at = {ingested_at[:10]} (capture date only, "
                "not publication date)"
            )

        warnings_out.append(ProvenanceWarning(
            severity="action_needed",
            title="Date unknown",
            explanation=" ".join(explanation_parts),
            suggested_action=(
                "Check the source page or document header for a publication date. "
                "In the app: Document List → open this document → "
                "Edit dates and publication metadata. "
                "Not required before pushing to Sanity, but required for the archive "
                "timeline and temporal analysis. "
                "If the date is genuinely unknown, this can be marked in a future "
                "researcher-annotation slice — do not invent a date."
            ),
            source_fields=source_fields_date,
        ))

    # 3. Queue source_type / intake source_type disagreement ────────────────
    if config is not None:
        try:
            from runner.pipeline.source_queue import queue_db_path as _qdb_path
            db_path = _qdb_path(config.corpus_dir)
            if db_path.exists():
                intake = _read_json_safe(doc_dir / "intake.json", {})
                actual_st = str(intake.get("source_type") or "").strip()
                conn = sqlite3.connect(str(db_path))
                conn.row_factory = sqlite3.Row
                row = conn.execute(
                    "SELECT source_type, doc_type_hint FROM source_queue "
                    "WHERE corpus_doc_id = ? LIMIT 1",
                    (doc_dir.name,),
                ).fetchone()
                conn.close()
                if row:
                    q_st  = str(row["source_type"]  or "").strip()
                    q_dth = str(row["doc_type_hint"] or "").strip()
                    if q_st and actual_st and q_st != actual_st:
                        warnings_out.append(ProvenanceWarning(
                            severity="provenance_note",
                            title="Triage source_type mismatch",
                            explanation=(
                                f"Queue recorded `{q_st}` (doc_type_hint: `{q_dth}`), "
                                f"but intake used `{actual_st}`. "
                                "Triage may have misclassified the source type."
                            ),
                            suggested_action=(
                                "Safe to ignore — ingestion used the correct intake value. "
                                "Record this discrepancy in your methodology notes if relevant."
                            ),
                            source_fields=[
                                "source_queue → source_type",
                                "intake.json → source_type",
                            ],
                        ))
        except Exception:
            pass

    # 4. enrich_existing proposals with no existing_entity_id ───────────────
    enrichment = _read_json_safe(doc_dir / "enrichment.json", {})
    missing_ids = [
        str(p.get("name") or "?")
        for p in (enrichment.get("entity_proposals") or [])
        if p.get("action") == "enrich_existing" and not p.get("existing_entity_id")
    ]
    if missing_ids:
        names_str = ", ".join(missing_ids)
        warnings_out.append(ProvenanceWarning(
            severity="pre_push_blocker",
            title="Missing existing_entity_id",
            explanation=(
                f"`enrich_existing` proposal(s) for {names_str} have no "
                "`existing_entity_id`. Pushing without it will create a duplicate entity."
            ),
            suggested_action=(
                f"Required before push — pushing without it creates a duplicate entity. "
                f"Use the entity ID resolver in the app (shown below this warning) to look "
                f"up `{names_str}` in the Sanity registry. Or look up the `_id` in Sanity "
                "Studio and paste it manually. "
                "In the app: Document List → open this document → Provenance / Audit panel "
                "→ Before pushing to Sanity → entity ID resolver."
            ),
            source_fields=["enrichment.json → entity_proposals → existing_entity_id"],
        ))

    # 5. Invalid/repaired network connection types ─────────────────────────
    invalid_connections = []
    allowed_connections = set(ALLOWED_NETWORK_CONNECTION_TYPES)
    for proposal in enrichment.get("entity_proposals") or []:
        if not isinstance(proposal, dict):
            continue
        source_name = str(proposal.get("name") or "?")
        for connection in proposal.get("network_connections") or []:
            if not isinstance(connection, dict):
                continue
            connection_type = str(connection.get("connection_type") or "").strip()
            invalid_type = str(connection.get("invalid_connection_type") or "").strip()
            repair_status = str(connection.get("connection_repair_status") or "").strip()
            repair_note = str(connection.get("repair_note") or "").strip()
            if (
                connection_type not in allowed_connections
                or invalid_type
                or repair_status == "needs_review"
                or repair_note
            ):
                invalid_connections.append({
                    "source": source_name,
                    "target": str(connection.get("entity_name") or "?"),
                    "invalid_type": invalid_type or connection_type,
                    "current_type": connection_type,
                    "repair_note": repair_note,
                })

    if invalid_connections:
        examples = "; ".join(
            (
                f"{item['source']} -> {item['target']}: "
                f"Invalid connection type: {item['invalid_type']}. "
                f"Current local type: {item['current_type'] or '?'}"
            )
            for item in invalid_connections[:5]
        )
        warnings_out.append(ProvenanceWarning(
            severity="pre_push_blocker",
            title="Invalid network connection type",
            explanation=(
                examples
                + ". Choose an allowed type or move this relation to "
                  "key_individuals / affiliated_orgs."
            ),
            suggested_action=(
                "Required before push — open the entity proposal and choose one of "
                f"the allowed types ({', '.join(ALLOWED_NETWORK_CONNECTION_TYPES)}) "
                "from the local repair dropdown, or move person-role relations such "
                "as founder/team_member into key_individuals / affiliated_orgs."
            ),
            source_fields=[
                "enrichment.json → entity_proposals → network_connections → connection_type",
                "enrichment.json → entity_proposals → network_connections → invalid_connection_type",
            ],
        ))

    # 6. Analysis/enrichment git commit mismatch ────────────────────────────
    mismatch = _detect_commit_mismatch(doc_dir)
    if mismatch:
        warnings_out.append(mismatch)

    return warnings_out


# ---------------------------------------------------------------------------
# Researcher checklist helper
# ---------------------------------------------------------------------------

def _generate_researcher_checklist(warnings: list[ProvenanceWarning]) -> list[str]:
    """Return a concise action list derived from structured warnings.

    Includes ``action_needed`` and ``pre_push_blocker`` items only — these are
    the findings the researcher must address.  ``provenance_note`` items are
    excluded because they require no action.

    Each item is the warning ``title`` — a short, scannable label.
    """
    return [
        w.title
        for w in warnings
        if w.severity in ("action_needed", "pre_push_blocker")
    ]
