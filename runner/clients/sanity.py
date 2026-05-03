"""
Sanity Content API client (httpx, REST mutations).

Reference: https://www.sanity.io/docs/http-mutations
Writes use the /mutate endpoint with a createOrReplace transaction.
"""
from __future__ import annotations
from datetime import datetime, timezone

import httpx

from ..config import Config
from ..models.document import DocumentPackage


def write_document(pkg: DocumentPackage, config: Config) -> str:
    """Write a sogiceDocument record to Sanity. Returns the Sanity document _id."""
    doc = _build_sanity_document(pkg)
    result = _mutate([{"createOrReplace": doc}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(
            f"Unexpected Sanity response (check token permissions and schema):\n{result}"
        )


def fetch_lexicon_terms(config: Config) -> list[dict]:
    """GROQ: all draft + validated lexicon entries with term, cluster, function."""
    query = (
        '*[_type == "lexiconEntry" && status in ["draft","validated"]]'
        '{ term, proposedCluster, function }'
    )
    url = (
        f"https://{config.sanity_project_id}.api.sanity.io"
        f"/v2024-01-01/data/query/{config.sanity_dataset}"
    )
    headers = {"Authorization": f"Bearer {config.sanity_write_token}"}
    r = httpx.get(url, params={"query": query}, headers=headers, timeout=10)
    r.raise_for_status()
    return r.json().get("result", [])


def _build_sanity_document(pkg: DocumentPackage) -> dict:
    intake   = pkg.intake
    prep     = pkg.preprocess
    analysis = pkg.analysis
    now_iso  = datetime.now(timezone.utc).isoformat()

    # Omit None URL values — Sanity url fields cannot be null
    meta: dict = {
        "ingestedAt":           now_iso,
        "preprocessingTool":    prep.tool_used,
        "preprocessingQuality": prep.quality,
    }
    if intake.source_type == "url":
        meta["sourceUrl"] = intake.source
    if intake.archive_url:
        meta["archiveUrl"] = intake.archive_url

    doc: dict = {
        "_type": "sogiceDocument",
        "_id":   f"doc-{intake.doc_id}",

        "workflowStatus": "unverified",
        "tier":           str(intake.tier),
        "tierAssignedBy": "auto",

        "meta": meta,

        "classification": {
            "type":             analysis.type,
            "format":           analysis.format,
            "evidence":         analysis.evidence,
            "scope":            analysis.scope,
            "country":          analysis.country,
            "tactic":           analysis.tactic,
            "actor":            analysis.actor,
            "network":          analysis.network,
            "practice":         analysis.practice,
            "term":             analysis.term,
            "harm":             analysis.harm,
            "migration":        analysis.migration,
            "function":         analysis.function,
            "landmark":         analysis.landmark,
            "flags":            analysis.flags,
            "narrativeRegister": analysis.narrative_register,
        },

        "confidence": {
            "overallScore": analysis.confidence.overall_score,
            "status":       analysis.confidence.status,
            "reasons":      analysis.confidence.reasons,
            "signals": {
                "textQuality":      analysis.confidence.signals.text_quality,
                "languageClarity":  analysis.confidence.signals.language_clarity,
                "contentStructure": analysis.confidence.signals.content_structure,
            },
        },

        "fieldConfidence": {
            "type":   analysis.field_confidence.type,
            "format": analysis.field_confidence.format,
            "tactic": analysis.field_confidence.tactic,
            "term":   analysis.field_confidence.term,
            "actor":  analysis.field_confidence.actor,
            "scope":  analysis.field_confidence.scope,
        },

        "documentDate": {
            "year":           analysis.document_date.year,
            "month":          analysis.document_date.month,
            "day":            analysis.document_date.day,
            "dateConfidence": analysis.document_date.confidence,
        },

        "content": {
            "title":            prep.title,
            "summary":          analysis.summary,
            "wordCount":        len(prep.text.split()),
        },

        "priorityScore": {
            "artistic":  analysis.priority.artistic,
            "network":   analysis.priority.network,
            "lexicon":   analysis.priority.lexicon,
            "testimony": analysis.priority.testimony,
            "historical": analysis.priority.historical,
        },

        "candidateTerms": [
            {
                "_key":             f"term-{i}",
                "term":             t.term,
                "language":         t.language,
                "proposedCategory": t.proposed_category,
                "promotionalUse":   t.promotional_use,
                "draftDefinition":  t.draft_definition,
                "contextQuote":     t.context_quote,
                "approved":         False,
            }
            for i, t in enumerate(analysis.candidate_terms)
        ],

        "extractableAssets": [
            {
                "_key":        f"asset-{i}",
                "assetType":   a.asset_type,
                "content":     a.content,
                "targetModule": a.target_module,
                "extractedBy": a.extracted_by,
            }
            for i, a in enumerate(analysis.extractable_assets)
        ],

        "aiMetadata": {
            "primaryModel":    pkg.llm_used,
            "primaryProvider": "anthropic" if "claude" in pkg.llm_used else "local",
            "ontologyVersion": "v3.0",
            "processingDate":  now_iso,
            "inputLengthChars": prep.char_count,
            "truncated":       prep.truncated,
            "agreementStatus": "not_validated",
            "resolution":      "not_applicable",
        },

        "referencedUrls": _build_referenced_urls(prep),

        "testimonyFlag": analysis.testimony_flag,
        "needsReview":   analysis.needs_review,

        "validation": {
            "status": "not_validated",
        },
    }

    if prep.language_detected:
        doc["content"]["languageDetected"] = prep.language_detected

    # Provenance block — only set url fields that have values (Sanity rejects null urls)
    provenance: dict = {}
    if intake.source_type == "url":
        provenance["originalUrl"] = intake.source
    elif intake.source_url:
        provenance["originalUrl"] = intake.source_url
    if intake.archive_url:
        provenance["waybackUrl"] = intake.archive_url
    if provenance:
        doc["provenance"] = provenance

    return doc


def _build_referenced_urls(prep) -> list[dict]:
    """Merge outbound links + document links into the referencedUrls Sanity array.
    Document links are flagged with linkType='source' so they can be queued
    for future ingestion."""
    entries: list[dict] = []
    seen: set[str] = set()

    def _add(url: str, anchor: str, domain: str, link_type: str) -> None:
        if url in seen or not url:
            return
        seen.add(url)
        entries.append({
            "_key":       f"url-{len(entries)}",
            "url":        url,
            "anchorText": anchor[:200],
            "domain":     domain,
            "linkType":   link_type,
            "resolved":   False,
        })

    intel = prep.page_intel
    if intel:
        # Document links first — highest research priority
        for d in intel.document_links:
            _add(d["url"], d.get("anchor_text", ""), d.get("domain", ""), "source")
        # Social media profiles
        for p in intel.social_profiles:
            _add(p["url"], p.get("platform", ""), p.get("domain", p.get("platform", "")), "related")
        # Embedded media
        for e in intel.media_embeds:
            _add(e["url"], e.get("title", e["platform"]), e["platform"], "related")

    # Outbound links (up to 40)
    for lnk in prep.outbound_links[:40]:
        _add(lnk["url"], lnk.get("anchor_text", ""), lnk.get("domain", ""), "outbound")

    return entries


def _mutate(mutations: list[dict], config: Config) -> dict:
    url = config.sanity_api_base
    headers = {
        "Authorization": f"Bearer {config.sanity_write_token}",
        "Content-Type":  "application/json",
    }
    response = httpx.post(
        url,
        json={"mutations": mutations},
        params={"returnIds": "true"},
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()
