"""
Sanity Content API client (httpx, REST mutations).

Reference: https://www.sanity.io/docs/http-mutations
Writes use the /mutate endpoint.
"""
from __future__ import annotations
from datetime import datetime, timezone
import json
import re

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
        '{ _id, term, proposedCluster, function, multilingualVariants }'
    )
    url = (
        f"https://{config.sanity_project_id}.api.sanity.io"
        f"/v2024-01-01/data/query/{config.sanity_dataset}"
    )
    headers = {"Authorization": f"Bearer {config.sanity_write_token}"}
    r = httpx.get(url, params={"query": query}, headers=headers, timeout=10)
    r.raise_for_status()
    return r.json().get("result", [])


def write_lexicon_draft_from_proposal(
    proposal: dict,
    doc_id: str,
    config: Config,
    approved_by: str = "researcher",
) -> str:
    """Create or replace a draft lexiconEntry from a reviewed enrichment proposal."""
    now_iso = datetime.now(timezone.utc).isoformat()
    term = (proposal.get("term") or "").strip()
    if not term:
        raise ValueError("Cannot write lexicon entry without a term")

    sanity_id = proposal.get("existing_entry_id") or f"lexicon-{_slugify(term)}"
    quote = _short_excerpt(proposal.get("exact_quote", ""))
    language = proposal.get("language") or "unknown"

    doc = {
        "_id": sanity_id,
        "_type": "lexiconEntry",
        "term": term,
        "status": "draft",
        "proposedCluster": _clean_unknown(proposal.get("proposed_cluster")),
        "function": _clean_unknown(proposal.get("function")),
        "draftDefinition": proposal.get("definition_as_used", ""),
        "accessibleDefinition": proposal.get("accessible_definition", ""),
        "approvedBy": approved_by,
        "approvedAt": now_iso,
        "approvedFromDocument": {
            "_type": "reference",
            "_ref": f"doc-{doc_id}",
        },
        "evidenceDossier": [
            {
                "_key": f"evidence-{_slugify(doc_id)}-0",
                "documentRef": {
                    "_type": "reference",
                    "_ref": f"doc-{doc_id}",
                },
                "excerpt": quote,
                "language": language,
                "stanceProfile": _stance_profile(proposal.get("register", "")),
                "confidence": 0.75,
                "extractedBy": "human",
            }
        ] if quote else [],
        "frequency": 1,
        "languagesSeen": [language] if language and language != "unknown" else [],
        "firstSeen": now_iso,
        "lastSeen": now_iso,
        "lastReanalyzed": now_iso,
    }
    if proposal.get("variants"):
        doc["multilingualVariants"] = [
            {
                "_key": f"variant-{i}",
                "variantTerm": v.get("variant_term", ""),
                "language": v.get("language", "unknown"),
                "attestationTier": v.get("attestation_tier", "tier-3-inferred"),
                "sourceNote": v.get("source_note", ""),
            }
            for i, v in enumerate(proposal.get("variants", []))
            if v.get("variant_term")
        ]

    result = _mutate([{"createOrReplace": doc}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for lexicon write:\n{result}")


def write_entity_from_proposal(
    proposal: dict,
    doc_id: str,
    config: Config,
) -> str:
    """Create or replace an organization/person record from a reviewed proposal."""
    name = (proposal.get("name") or "").strip()
    if not name:
        raise ValueError("Cannot write entity without a name")

    entity_type = proposal.get("entity_type", "organization")
    if entity_type not in {"organization", "person"}:
        entity_type = "organization"

    sanity_id = proposal.get("existing_entity_id") or f"{entity_type}-{_slugify(name)}"
    description = proposal.get("self_description") or proposal.get("evidence_quote", "")

    if entity_type == "person":
        doc = {
            "_id": sanity_id,
            "_type": "person",
            "name": name,
            "role": _person_role(proposal.get("role_in_sogice", "")),
            "countryOfOperation": _first_or_empty(proposal.get("geographic_scope", [])),
            "description": description,
            "sourceDocuments": [{"_type": "reference", "_ref": f"doc-{doc_id}"}],
            "registryStatus": "confirmed",
        }
        if proposal.get("affiliated_orgs"):
            doc["contestedFigureNote"] = "Affiliated orgs mentioned: " + ", ".join(proposal.get("affiliated_orgs", []))
    else:
        doc = {
            "_id": sanity_id,
            "_type": "organization",
            "name": name,
            "type": _organization_type(proposal),
            "country": _first_or_empty(proposal.get("geographic_scope", [])),
            "description": description,
            "visibility": "research_contextualized",
            "sourceDocuments": [{"_type": "reference", "_ref": f"doc-{doc_id}"}],
            "registryStatus": "confirmed",
        }

    result = _mutate([{"createOrReplace": doc}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for entity write:\n{result}")


def write_seed_lexicon_entry(entry: dict, config: Config) -> str:
    """Create or replace a lexiconEntry imported from the seed lexicon."""
    now_iso = datetime.now(timezone.utc).isoformat()
    term = (entry.get("term") or "").strip()
    if not term:
        raise ValueError("Cannot write seed lexicon entry without a term")

    status = entry.get("status") or entry.get("recommended_status") or "draft"
    if status not in {"candidate", "draft", "validated", "rejected"}:
        status = "draft"

    source_bits = [
        "Seed import from SOGICE_Lexicon_v2.1.md.",
        f"Recommended status: {entry.get('recommended_status', 'draft')}.",
    ]
    if entry.get("source_url"):
        source_bits.append(f"Source URL: {entry['source_url']}")
    if entry.get("source_note"):
        source_bits.append(f"Source note: {entry['source_note']}")
    if entry.get("related"):
        source_bits.append(f"Related terms from seed: {entry['related']}")
    if entry.get("expansion"):
        source_bits.append(f"Seed expansion/name: {entry['expansion']}")

    doc = {
        "_id": entry.get("sanity_id") or f"lexicon-{_slugify(term)}",
        "_type": "lexiconEntry",
        "term": term,
        "status": status,
        "proposedCluster": _clean_unknown(entry.get("proposed_cluster")),
        "function": _clean_unknown(entry.get("function")),
        "draftDefinition": entry.get("draft_definition") or entry.get("definition") or "",
        "accessibleDefinition": entry.get("accessible_definition") or "",
        "approvedBy": "researcher",
        "approvedAt": now_iso,
        "evidenceDossier": [],
        "frequency": int(entry.get("frequency") or 0),
        "languagesSeen": entry.get("languages_seen") or ([entry.get("language")] if entry.get("language") else []),
        "lastReanalyzed": now_iso,
        "validationHistory": [
            {
                "_key": "seed-import-0",
                "runDate": now_iso,
                "model": "seed-lexicon-import",
                "recommendation": "confirm" if status == "validated" else "revise",
                "reasoning": " ".join(bit for bit in source_bits if bit),
                "resolvedByResearcher": status in {"draft", "validated"},
            }
        ],
    }

    result = _mutate([{"createOrReplace": doc}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for seed lexicon write:\n{result}")


def write_seed_lexicon_variant(variant: dict, config: Config) -> str:
    """Append a multilingual variant to an existing lexiconEntry."""
    canonical_id = variant.get("canonical_id") or f"lexicon-{_slugify(variant.get('canonical_term', ''))}"
    variant_term = (variant.get("variant_term") or "").strip()
    if not canonical_id or not variant_term:
        raise ValueError("Cannot write multilingual variant without canonical_id and variant_term")

    item = {
        "_key": f"variant-{_slugify(variant_term)}-{variant.get('language', 'unknown')}",
        "variantTerm": variant_term,
        "language": variant.get("language", "unknown"),
        "attestationTier": variant.get("attestation_tier", "tier-3-inferred"),
        "sourceNote": variant.get("source_note", ""),
    }
    result = _mutate(
        [
            {
                "patch": {
                    "id": canonical_id,
                    "setIfMissing": {"multilingualVariants": []},
                    "insert": {"after": "multilingualVariants[-1]", "items": [item]},
                }
            }
        ],
        config,
    )
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for variant write:\n{result}")


def fetch_tactic_entries(config: Config) -> list[dict]:
    """GROQ: all draft + validated tactic entries."""
    query = '*[_type == "tacticEntry"]{ _id, tactic }'
    url = (
        f"https://{config.sanity_project_id}.api.sanity.io"
        f"/v2024-01-01/data/query/{config.sanity_dataset}"
    )
    headers = {"Authorization": f"Bearer {config.sanity_write_token}"}
    r = httpx.get(url, params={"query": query}, headers=headers, timeout=10)
    r.raise_for_status()
    return r.json().get("result", [])


def write_seed_tactic_entry(entry: dict, config: Config) -> str:
    """Create or replace a tacticEntry record from seed data."""
    name = (entry.get("tactic") or "").strip()
    if not name:
        raise ValueError("Cannot write tactic entry without a name")

    now_iso = datetime.now(timezone.utc).isoformat()
    sanity_id = f"tactic-{_slugify(name)}"

    def _clean_cluster(v: str) -> str | None:
        valid = {
            "SSA-Rhetoric", "Pastoral-Coercion", "Pseudo-Science",
            "Policy-Resistance", "Anti-Trans/ROGD", "Anti-Gender",
            "Pro-Trans-SOGICE", "Non-SOGICE",
        }
        v = v.strip()
        # Handle "Pseudo-Science" written as "Pseudo-science" in ontology
        for c in valid:
            if c.lower() == v.lower():
                return c
        return None

    doc: dict = {
        "_id": sanity_id,
        "_type": "tacticEntry",
        "tactic": name,
        "status": "draft",
        "registryStatus": "seeded",
        "approvedBy": "researcher",
        "approvedAt": now_iso,
        "frequency": 0,
        "lastReanalyzed": now_iso,
        "validationHistory": [
            {
                "_key": "seed-import-0",
                "runDate": now_iso,
                "model": "seed-tactics-import",
                "recommendation": "confirm",
                "reasoning": "Seeded from SOGICE_Ontology_v3.0.md and Claude_Ingestion_Prompt.md.",
                "resolvedByResearcher": True,
            }
        ],
    }
    if entry.get("definition"):
        doc["definition"] = entry["definition"]
    if entry.get("boundaries"):
        doc["boundaries"] = entry["boundaries"]
    if _clean_cluster(entry.get("primary_cluster", "")):
        doc["primaryCluster"] = _clean_cluster(entry["primary_cluster"])
    if _clean_cluster(entry.get("secondary_cluster", "")):
        doc["secondaryCluster"] = _clean_cluster(entry["secondary_cluster"])

    tactic_level = entry.get("tactic_level", "structural")
    if tactic_level in ("structural", "sub-tactic", "campaign"):
        doc["tacticLevel"] = tactic_level
    if entry.get("parent_tactic_id"):
        doc["parentTactic"] = {
            "_type": "reference",
            "_ref": entry["parent_tactic_id"],
        }

    doc = {k: v for k, v in doc.items() if v is not None}
    result = _mutate([{"createOrReplace": doc}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for tactic write:\n{result}")


def write_seed_organization(entry: dict, config: Config) -> str:
    """Create or replace an organization record from seed entity registry data."""
    name = (entry.get("name") or "").strip()
    if not name:
        raise ValueError("Cannot write organization without a name")

    sanity_id = f"organization-{_slugify(name)}"
    type_raw = entry.get("type", "")
    org_type = _org_type_from_seed(type_raw)

    doc: dict = {
        "_id": sanity_id,
        "_type": "organization",
        "name": name,
        "type": org_type,
        "visibility": "research_contextualized",
        "registryStatus": "seeded",
    }
    if entry.get("country"):
        doc["country"] = entry["country"].split("(")[0].strip().split("/")[0].strip()
    if entry.get("founded"):
        year_str = re.sub(r"[^\d]", "", str(entry["founded"]))
        if year_str.isdigit():
            doc["founded"] = int(year_str)
    if entry.get("dissolved"):
        year_str = re.sub(r"[^\d]", "", str(entry["dissolved"]))
        if year_str.isdigit():
            doc["dissolved"] = int(year_str)
    if entry.get("description"):
        doc["description"] = entry["description"]
    if entry.get("note"):
        doc["notes"] = entry["note"]
    if entry.get("expansion"):
        doc["fullName"] = entry["expansion"]

    doc = {k: v for k, v in doc.items() if v is not None}
    result = _mutate([{"createOrReplace": doc}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for seed org write:\n{result}")


def write_seed_person(entry: dict, config: Config) -> str:
    """Create or replace a person record from seed entity registry data."""
    name = (entry.get("name") or "").strip()
    if not name:
        raise ValueError("Cannot write person without a name")

    sanity_id = f"person-{_slugify(name)}"

    doc: dict = {
        "_id": sanity_id,
        "_type": "person",
        "name": name,
        "registryStatus": "seeded",
    }
    if entry.get("role"):
        doc["role"] = _person_role(entry["role"])
    if entry.get("country"):
        doc["countryOfOperation"] = entry["country"].split("/")[0].strip()
    if entry.get("description"):
        doc["description"] = entry["description"]
    if entry.get("contested_figure", "").lower() in ("true", "yes"):
        doc["contestedFigure"] = True
        if entry.get("contested_figure_note"):
            doc["contestedFigureNote"] = entry["contested_figure_note"]
    else:
        doc["contestedFigure"] = False
    if entry.get("affiliated_orgs_raw"):
        doc["affiliatedOrgNames"] = [
            a.strip() for a in re.split(r"[;,]", entry["affiliated_orgs_raw"]) if a.strip()
        ]

    doc = {k: v for k, v in doc.items() if v is not None}
    result = _mutate([{"createOrReplace": doc}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for seed person write:\n{result}")


def write_seed_law(entry: dict, config: Config) -> str:
    """Create or replace a legalDefinition record from seed entity registry data."""
    name = (entry.get("name") or "").strip()
    if not name:
        raise ValueError("Cannot write law without a name")

    sanity_id = f"law-{_slugify(name)}"
    doc: dict = {
        "_id": sanity_id,
        "_type": "legalDefinition",
        "name": name,
        "registryStatus": "seeded",
    }
    if entry.get("country"):
        doc["jurisdiction"] = entry["country"].split("(")[0].strip()
    if entry.get("year"):
        year_str = re.sub(r"[^\d]", "", str(entry["year"]))
        if year_str.isdigit():
            doc["year"] = int(year_str)
    if entry.get("applies_to"):
        doc["appliesTo"] = entry["applies_to"]
    if entry.get("description"):
        doc["description"] = entry["description"]
    if entry.get("historical_significance"):
        doc["historicalSignificance"] = entry["historical_significance"]
    if entry.get("status"):
        raw_status = entry["status"].lower()
        if "enacted" in raw_status:
            doc["enactmentStatus"] = "enacted"
        elif "pending" in raw_status:
            doc["enactmentStatus"] = "pending"
        else:
            doc["enactmentStatus"] = raw_status[:40]

    doc = {k: v for k, v in doc.items() if v is not None}
    result = _mutate([{"createOrReplace": doc}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for seed law write:\n{result}")


def write_seed_event(entry: dict, config: Config) -> str:
    """Create or replace an event record from seed entity registry data."""
    name = (entry.get("name") or "").strip()
    if not name:
        raise ValueError("Cannot write event without a name")

    sanity_id = f"event-{_slugify(name)}"
    doc: dict = {
        "_id": sanity_id,
        "_type": "event",
        "name": name,
        "registryStatus": "seeded",
    }
    if entry.get("type"):
        doc["eventType"] = entry["type"]
    if entry.get("date"):
        doc["date"] = entry["date"]
    if entry.get("description"):
        doc["description"] = entry["description"]
    if entry.get("actors_raw"):
        doc["actorNames"] = [
            a.strip() for a in re.split(r"[;,]", entry["actors_raw"]) if a.strip()
        ]
    if entry.get("historical_significance"):
        doc["historicalSignificance"] = entry["historical_significance"]

    doc = {k: v for k, v in doc.items() if v is not None}
    result = _mutate([{"createOrReplace": doc}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for seed event write:\n{result}")


def _org_type_from_seed(raw: str) -> str:
    raw = raw.lower()
    if "church" in raw:
        return "church"
    if "pseudo-professional" in raw or "pseudo_professional" in raw:
        return "pseudo-professional-body"
    if "therapy" in raw or "counselling" in raw:
        return "therapy_practice"
    if "media" in raw:
        return "media"
    if "ministry" in raw:
        return "ministry"
    if "network" in raw:
        return "network_node"
    if "political" in raw or "party" in raw:
        return "political_party"
    return "advocacy"


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
    source_url = intake.source if intake.source_type == "url" else intake.source_url
    if source_url:
        meta["sourceUrl"] = source_url
    if intake.archive_url:
        meta["archiveUrl"] = intake.archive_url
    if analysis.testimony_flag and intake.testimony_consent:
        meta["testimonyConsent"] = intake.testimony_consent

    provenance: dict = {
        "accessedVia": "direct",
        "chainNotes": _provenance_notes(pkg),
    }
    if source_url:
        provenance["originalUrl"] = source_url
    if intake.archive_url:
        provenance["waybackUrl"] = intake.archive_url
    html_hash = prep.source_html_sha256 or intake.source_html_sha256
    if html_hash:
        provenance["htmlSnapshotHash"] = html_hash

    doc: dict = {
        "_type": "sogiceDocument",
        "_id":   f"doc-{intake.doc_id}",

        "workflowStatus": "unverified",
        "tier":           str(intake.tier),
        "tierAssignedBy": "auto",

        "meta": meta,
        "provenance": provenance,

        "classification": {
            k: v for k, v in {
                "type":                analysis.type,
                "primaryType":         analysis.primary_type,
                "secondaryType":       analysis.secondary_type,
                "format":              analysis.format,
                "evidence":            analysis.evidence,
                "scope":               analysis.scope,
                "country":             analysis.country,
                "tactic":              analysis.tactic,
                "actor":               analysis.actor,
                "network":             analysis.network,
                "practice":            analysis.practice,
                "term":                analysis.term,
                "harm":                analysis.harm,
                "migration":           analysis.migration,
                "function":            analysis.function,
                "landmark":            analysis.landmark,
                "flags":               analysis.flags,
                "narrativeRegister":   analysis.narrative_register,
                "rhetoricalIntensity": analysis.rhetorical_intensity,
                "framingBalance":      analysis.framing_balance,
            }.items() if v is not None
        },

        "legalStatus": (
            {
                k: v for k, v in {
                    "jurisdiction": analysis.legal_status.jurisdiction,
                    "status":       analysis.legal_status.status,
                    "instrument":   analysis.legal_status.instrument,
                }.items() if v is not None
            }
            if analysis.legal_status and analysis.legal_status.jurisdiction
            else None
        ),

        "termUseContext": [
            {
                "_key":  f"tuc-{i}",
                "term":  t.term,
                "use":   t.use,
                "quote": t.quote,
            }
            for i, t in enumerate(analysis.term_use_context)
        ],

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
            "primaryProvider": _provider_for_llm(pkg.llm_used),
            "promptVersion":   "ingestion-v3.3",
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
    testimony_review = _load_testimony_review(pkg.local_dir)
    if testimony_review:
        doc["testimonyReview"] = testimony_review

    if prep.language_detected:
        doc["content"]["languageDetected"] = prep.language_detected

    # Strip top-level None values — Sanity rejects null for non-nullable fields
    doc = {k: v for k, v in doc.items() if v is not None}

    return doc


def _slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "untitled"


def _short_excerpt(value: str, max_words: int = 15) -> str:
    words = value.strip().split()
    return " ".join(words[:max_words])


def _clean_unknown(value: str | None) -> str:
    value = (value or "").strip()
    return "" if value == "Unknown" else value


def _stance_profile(register: str) -> str:
    if register in {"promotional", "defensive", "euphemistic", "conspiratorial", "testimonial"}:
        return "promotional"
    if register == "legal":
        return "legal_administrative"
    if register == "clinical":
        return "research_clinical"
    return "critical_advocacy" if register == "neutral" else "promotional"


def _first_or_empty(value: list | str | None) -> str:
    if isinstance(value, list):
        return str(value[0]) if value else ""
    return value or ""


def _organization_type(proposal: dict) -> str:
    text = " ".join(
        str(x).lower()
        for x in [
            proposal.get("self_description", ""),
            proposal.get("evidence_quote", ""),
            " ".join(proposal.get("activities_stated", [])),
        ]
    )
    if "church" in text:
        return "church"
    if "legal" in text or "law" in text:
        return "legal"
    if "therapy" in text or "counselling" in text or "counseling" in text:
        return "therapy_practice"
    if "media" in text or "news" in text:
        return "media"
    if "ministry" in text or "pastoral" in text:
        return "ministry"
    if "network" in text:
        return "network_node"
    return "advocacy"


def _person_role(value: str) -> str:
    text = value.lower()
    for role in ("founder", "leader", "influencer", "therapist", "pastor", "survivor", "researcher", "politician"):
        if role in text:
            return role
    return "other"


def _load_testimony_review(doc_dir) -> dict:
    path = doc_dir / "testimony_review.json"
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    consent_map = {
        "confirmed": "obtained",
        "unclear": "pending",
        "withdrawn": "withdrawn",
    }
    return {
        "consentStatus": consent_map.get(data.get("consent_status"), data.get("consent_status", "pending")),
        "consentSource": data.get("consent_source", "unknown"),
        "reviewedBy": data.get("reviewed_by", "researcher"),
        "reviewedAt": data.get("reviewed_at", ""),
        "publicDisplay": bool(data.get("public_display", False)),
        "publicExcerpt": data.get("public_excerpt", ""),
        "notes": data.get("notes", ""),
    }


def _provenance_notes(pkg: DocumentPackage) -> str:
    intake = pkg.intake
    notes = [
        f"Wayback status: {intake.wayback_status or 'unknown'}",
        f"Wayback checked at: {intake.wayback_checked_at or 'unknown'}",
    ]
    if intake.wayback_error:
        notes.append(f"Wayback error: {intake.wayback_error}")
    html_path = pkg.local_dir / "source.html"
    if html_path.exists():
        notes.append(f"Local HTML snapshot: {html_path}")
    html_hash = pkg.preprocess.source_html_sha256 or intake.source_html_sha256
    if html_hash:
        notes.append(f"source.html sha256: {html_hash}")
    if intake.original_filename:
        notes.append(f"Original filename: {intake.original_filename}")
    if intake.local_copy_path:
        notes.append(f"Local source copy: {intake.local_copy_path}")
    return " | ".join(notes)


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


def _provider_for_llm(llm_used: str) -> str:
    if "claude" in llm_used:
        return "anthropic"
    if llm_used.startswith("litelm"):
        return "litelm"
    if llm_used == "openrouter":
        return "openrouter"
    return "local"


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
