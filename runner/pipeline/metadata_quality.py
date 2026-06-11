from __future__ import annotations

import re


def publication_metadata(preprocess_meta: dict) -> dict:
    """Return source publication fields in a stable shape for review/upload."""
    page_intel = preprocess_meta.get("page_intel") if isinstance(preprocess_meta, dict) else {}
    if not isinstance(page_intel, dict):
        page_intel = {}
    return {
        "date_published": preprocess_meta.get("date_published") or page_intel.get("date_published", ""),
        "date_modified": page_intel.get("date_modified", ""),
        "publisher": preprocess_meta.get("sitename") or page_intel.get("publisher", ""),
        "hostname": preprocess_meta.get("hostname", ""),
        "canonical_url": page_intel.get("canonical_url", ""),
        "og_locale": page_intel.get("og_locale", ""),
    }


def archival_issues(analysis: dict, preprocess_meta: dict, intake: dict | None = None) -> list[dict]:
    """Flag missing archival fields that a researcher may need to fill manually."""
    intake = intake or {}
    issues: list[dict] = []
    source_type = intake.get("source_type", "")
    pub = publication_metadata(preprocess_meta)

    def add(field: str, severity: str, message: str, suggestion: str = "") -> None:
        issues.append({
            "field": field,
            "severity": severity,
            "message": message,
            "suggestion": suggestion,
        })

    if source_type == "url" and not (intake.get("source") or intake.get("source_url") or pub.get("canonical_url")):
        add("source_url", "error", "No source URL is recorded.", "Recover the original URL before upload.")

    if not preprocess_meta.get("title"):
        add("title", "warning", "No title was extracted from the source metadata.", "Fill content.title or rerun preprocessing from the original source.")

    if source_type == "url" and not pub["date_published"]:
        add(
            "date_published",
            "warning",
            "No website publication date was extracted from HTML metadata.",
            "Check the page, source HTML, JSON-LD, or Wayback snapshot and fill the date if available.",
        )

    doc_date = analysis.get("document_date") or {}
    if not doc_date.get("year"):
        add(
            "document_date.year",
            "warning",
            "The model did not identify a document date.",
            "Use the publication date or document text to set year/month/day if appropriate.",
        )

    countries = analysis.get("country") or []
    if not countries:
        add(
            "country",
            "warning",
            "No document country / jurisdiction was assigned.",
            "Add the country or countries that the document concerns.",
        )

    if analysis.get("legal_status") and not (analysis.get("legal_status") or {}).get("jurisdiction"):
        add("legal_status.jurisdiction", "warning", "Legal status exists without a jurisdiction.", "Fill the jurisdiction.")

    return issues


def year_from_date(value: str) -> int | None:
    match = re.search(r"\b(18|19|20)\d{2}\b", value or "")
    return int(match.group(0)) if match else None


def date_parts(value: str) -> dict:
    match = re.search(r"\b((?:18|19|20)\d{2})(?:-(\d{2})(?:-(\d{2}))?)?", value or "")
    if not match:
        return {"year": 0, "month": 0, "day": 0}
    return {
        "year": int(match.group(1)),
        "month": int(match.group(2) or 0),
        "day": int(match.group(3) or 0),
    }


def backfill_document_date(analysis, preprocess) -> bool:
    """Populate ``analysis.document_date`` from source publication metadata when
    the model left it unknown. Returns True if a date was set.

    Shared by the analysis stage (so regular ingest, reanalyze, both-LLM paths,
    and the source worker all emit ``analysis.json`` with a populated date) and
    by the upload-time repair (idempotent safety net).

    Semantics (matching the Slice Q date rules):
    - Publication date (``date_published`` / ``page_intel.date_published``) →
      ``exact`` when month+day are present, else ``approximate``.
    - No publication date but a *modified* date → ``approximate`` with a
      ``modified_date_fallback`` provenance warning. A modified date is never
      asserted as a publication date.
    - An LLM-provided ``document_date`` (year already set) is never overridden;
      a second call after the date is set returns False (idempotent).

    Duck-typed: operates on any objects exposing the expected attributes, so
    this module stays free of model imports.
    """
    if getattr(analysis.document_date, "year", 0):
        return False

    page_intel = preprocess.page_intel.__dict__ if getattr(preprocess, "page_intel", None) else {}
    pub = publication_metadata({
        "date_published": getattr(preprocess, "date_published", "") or "",
        "sitename": getattr(preprocess, "sitename", "") or "",
        "hostname": getattr(preprocess, "hostname", "") or "",
        "page_intel": page_intel,
    })

    parts = date_parts(pub.get("date_published", ""))
    if parts["year"]:
        analysis.document_date.year = parts["year"]
        analysis.document_date.month = parts["month"]
        analysis.document_date.day = parts["day"]
        analysis.document_date.confidence = (
            "exact" if parts["month"] and parts["day"] else "approximate"
        )
        analysis.normalisation_warnings = list(analysis.normalisation_warnings) + [
            "document_date backfilled from source publication metadata."
        ]
        return True

    # No publication date — fall back to the source *modified* date as a
    # low-confidence review candidate, clearly marked. Never asserted as a
    # publication date (date_published stays empty).
    mod_parts = date_parts(pub.get("date_modified", ""))
    if mod_parts["year"]:
        analysis.document_date.year = mod_parts["year"]
        analysis.document_date.month = mod_parts["month"]
        analysis.document_date.day = mod_parts["day"]
        analysis.document_date.confidence = "approximate"
        analysis.normalisation_warnings = list(analysis.normalisation_warnings) + [
            "document_date set from source modified date (modified_date_fallback) — "
            "no publication date available; review and confirm."
        ]
        return True
    return False
