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
from ..models.research_annotation import ResearchAnnotation, REVIEWED_STATUSES
from ..pipeline.analyze import PROMPT_VERSION
from ..pipeline.metadata_quality import publication_metadata


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


def write_research_annotation(
    annotation: ResearchAnnotation,
    config: Config,
    force_reviewed: bool = False,
) -> str:
    """Create or replace a researchAnnotation record for a profile/document pair."""
    doc = _build_research_annotation_document(annotation)
    if not force_reviewed:
        existing = _fetch_document_by_id(doc["_id"], config, "{ annotationStatus }")
        if existing and existing.get("annotationStatus") in REVIEWED_STATUSES:
            raise RuntimeError(
                f"Sanity annotation {doc['_id']} is reviewed/corrected; "
                "pass --force-reviewed to replace it"
            )

    mutations = [{"createOrReplace": doc}]
    public_candidate = bool(
        annotation.annotation_status in REVIEWED_STATUSES
        and annotation.result_json.get("publicTableCandidate")
    )
    if public_candidate:
        mutations.append(
            {
                "patch": {
                    "id": _sogice_document_ref(annotation.doc_id),
                    "setIfMissing": {
                        "mediaMetadata": {},
                        "mediaMetadata.classificationProvenance": {},
                    },
                    "set": {
                        "mediaMetadata.classificationProvenance.publicTableCandidate": True,
                        "mediaMetadata.classificationProvenance.publicTableCandidateSource": annotation.profile,
                        "mediaMetadata.classificationProvenance.publicTableCandidateReviewedAt": (
                            annotation.reviewed_at.isoformat()
                            if annotation.reviewed_at
                            else datetime.now(timezone.utc).isoformat()
                        ),
                    },
                }
            }
        )

    result = _mutate(mutations, config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(
            f"Unexpected Sanity response for research annotation write:\n{result}"
        )


def fetch_research_annotations_for_doc(doc_id: str, config: Config) -> list[dict]:
    """Return researchAnnotation records linked to a sogiceDocument."""
    query = (
        '*[_type == "researchAnnotation" && sourceDocument._ref == $doc_ref]'
        '|order(generatedAt desc)'
        '{ _id, profile, profileVersion, annotationStatus, generatedAt, reviewedAt, '
        'sourceStance, publicVisibility, modelProvider, modelName, resolvedModelName, promptVersion }'
    )
    return _query(query, config, {"doc_ref": _sogice_document_ref(doc_id)})


def write_media_metadata_update(
    doc_id: str,
    media_metadata_patch: dict,
    config: Config,
) -> str:
    """Patch mediaMetadata on an existing sogiceDocument."""
    media_metadata = _with_array_keys(_drop_empty(media_metadata_patch), prefix="media")
    set_fields = {
        f"mediaMetadata.{key}": value for key, value in media_metadata.items()
    }
    result = _mutate(
        [
            {
                "patch": {
                    "id": _sogice_document_ref(doc_id),
                    "setIfMissing": {"mediaMetadata": {}},
                    "set": set_fields,
                }
            }
        ],
        config,
    )
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(
            f"Unexpected Sanity response for media metadata update:\n{result}"
        )


def write_document_date_update(
    doc_id: str,
    document_date: dict,
    publication_date: str,
    config: Config,
) -> str:
    """Patch source/document dates on an existing sogiceDocument."""
    set_fields: dict = {}
    if document_date:
        set_fields["documentDate"] = {
            "year": int(document_date.get("year") or 0),
            "month": int(document_date.get("month") or 0),
            "day": int(document_date.get("day") or 0),
            "dateConfidence": document_date.get("dateConfidence")
            or document_date.get("confidence")
            or "unknown",
        }
    if publication_date:
        set_fields["mediaMetadata.general.publicationDate"] = publication_date

    if not set_fields:
        raise ValueError("No date fields supplied for Sanity update")

    result = _mutate(
        [
            {
                "patch": {
                    "id": _sogice_document_ref(doc_id),
                    "setIfMissing": {
                        "mediaMetadata": {},
                        "mediaMetadata.general": {},
                    },
                    "set": set_fields,
                }
            }
        ],
        config,
    )
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(
            f"Unexpected Sanity response for document date update:\n{result}"
        )


def write_content_metadata_update(
    doc_id: str,
    title: str | None,
    language_detected: str | None,
    config: Config,
) -> str:
    """Patch content.title / content.languageDetected on an existing sogiceDocument."""
    set_fields: dict = {}
    if_missing: dict = {}
    if title:
        set_fields["content.title"] = title
        set_fields["mediaMetadata.general.episodeTitle"] = title
        if_missing["content"] = {}
        if_missing["mediaMetadata"] = {}
        if_missing["mediaMetadata.general"] = {}
    if language_detected:
        set_fields["content.languageDetected"] = language_detected
        if_missing.setdefault("content", {})

    if not set_fields:
        raise ValueError("No content metadata fields supplied for Sanity update")

    result = _mutate(
        [{"patch": {"id": _sogice_document_ref(doc_id), "setIfMissing": if_missing, "set": set_fields}}],
        config,
    )
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for content metadata update:\n{result}")


def write_classification_update(
    doc_id: str,
    country: list | None,
    doc_type: str | None,
    doc_format: str | None,
    config: Config,
) -> str:
    """Patch classification.country / type / format on an existing sogiceDocument."""
    set_fields: dict = {}
    if country is not None:
        set_fields["classification.country"] = country
    if doc_type:
        set_fields["classification.type"] = doc_type
    if doc_format:
        set_fields["classification.format"] = doc_format

    if not set_fields:
        raise ValueError("No classification fields supplied for Sanity update")

    result = _mutate(
        [{"patch": {"id": _sogice_document_ref(doc_id), "setIfMissing": {"classification": {}}, "set": set_fields}}],
        config,
    )
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for classification update:\n{result}")


def fetch_lexicon_terms(config: Config) -> list[dict]:
    """GROQ: lexicon entries with per-document evidence dossiers."""
    query = (
        '*[_type == "lexiconEntry" && status in ["candidate","draft","validated"]]'
        '|order(term asc)'
        '{ _id, term, status, proposedCluster, function, draftDefinition, accessibleDefinition, '
        'frequency, firstSeen, lastSeen, multilingualVariants, '
        'evidenceDossier[]{ _key, "docRef": documentRef._ref, excerpt, exactQuote, '
        'definitionAsUsed, language, stanceProfile, usageRegister, coOccurringTerms, '
        'relationshipNotes, modelConfidence, researcherConfidence, confidenceRationale, '
        'extractedBy, extractionModel, confirmed, confirmedAt, confirmedNote, researcherNote } }'
    )
    url = (
        f"https://{config.sanity_project_id}.api.sanity.io"
        f"/v2024-01-01/data/query/{config.sanity_dataset}"
    )
    headers = {"Authorization": f"Bearer {config.sanity_write_token}"}
    r = httpx.get(url, params={"query": query}, headers=headers, timeout=10)
    r.raise_for_status()
    return r.json().get("result", [])


def confirm_lexicon_context(
    sanity_id: str,
    evidence_key: str,
    config: Config,
    note: str = "",
) -> str:
    """Mark one lexicon evidenceDossier record as researcher-confirmed."""
    if not sanity_id or not evidence_key:
        raise ValueError("sanity_id and evidence_key are required")
    now_iso = datetime.now(timezone.utc).isoformat()
    set_fields = {
        f'evidenceDossier[_key=="{evidence_key}"].confirmed': True,
        f'evidenceDossier[_key=="{evidence_key}"].confirmedAt': now_iso,
    }
    if note:
        set_fields[f'evidenceDossier[_key=="{evidence_key}"].confirmedNote'] = note
    result = _mutate(
        [{"patch": {"id": sanity_id, "set": set_fields}}],
        config,
    )
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for lexicon confirmation:\n{result}")


def write_lexicon_draft_from_proposal(
    proposal: dict,
    doc_id: str,
    config: Config,
    approved_by: str = "researcher",
) -> str:
    """Write a reviewed lexicon proposal without flattening per-document evidence."""
    now_iso = datetime.now(timezone.utc).isoformat()
    term = (proposal.get("term") or "").strip()
    if not term:
        raise ValueError("Cannot write lexicon entry without a term")

    sanity_id = _sanity_id_or_fallback(
        proposal.get("existing_entry_id"),
        f"lexicon-{_slugify(term)}",
    )
    language = proposal.get("language") or "unknown"
    evidence_item = _lexicon_evidence_item(proposal, doc_id, language, now_iso)
    variants = _lexicon_variant_items(proposal.get("variants", []))

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
        "evidenceDossier": [evidence_item] if evidence_item else [],
        "frequency": 1,
        "languagesSeen": [language] if language and language != "unknown" else [],
        "firstSeen": now_iso,
        "lastSeen": now_iso,
        "lastReanalyzed": now_iso,
    }
    if variants:
        doc["multilingualVariants"] = variants

    action = proposal.get("action", "add_new")
    if action == "add_new":
        mutations = [{"createOrReplace": doc}]
    else:
        set_fields = {
            "lastSeen": now_iso,
            "lastReanalyzed": now_iso,
        }
        if action == "add_definition" and proposal.get("definition_as_used"):
            set_fields["draftDefinition"] = proposal["definition_as_used"]
        mutations = [
            {
                "patch": {
                    "id": sanity_id,
                    "setIfMissing": {
                        "evidenceDossier": [],
                        "multilingualVariants": [],
                        "languagesSeen": [],
                    },
                    "set": set_fields,
                }
            }
        ]
        if evidence_item:
            mutations.append(
                {
                    "patch": {
                        "id": sanity_id,
                        "insert": {"after": "evidenceDossier[-1]", "items": [evidence_item]},
                    }
                }
            )
        if variants:
            mutations.append(
                {
                    "patch": {
                        "id": sanity_id,
                        "insert": {"after": "multilingualVariants[-1]", "items": variants},
                    }
                }
            )

    result = _mutate(mutations, config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for lexicon write:\n{result}")


def _lexicon_evidence_item(proposal: dict, doc_id: str, language: str, now_iso: str) -> dict | None:
    quote = (proposal.get("exact_quote") or "").strip()
    if not quote:
        return None
    model_confidence = _normalise_confidence(
        proposal.get("model_confidence")
        or proposal.get("llm_confidence")
        or proposal.get("confidence"),
        default=0.75,
    )
    researcher_confidence = proposal.get("researcher_confidence")
    item = {
        "_key": f"evidence-{_slugify(doc_id)}-{_slugify(proposal.get('term', 'term'))}",
        "documentRef": {"_type": "reference", "_ref": _sogice_document_ref(doc_id)},
        "language": language,
        "excerpt": _short_excerpt(quote),
        "exactQuote": quote,
        "definitionAsUsed": proposal.get("definition_as_used", ""),
        "stanceProfile": _stance_profile(proposal.get("register", "")),
        "usageRegister": proposal.get("register", ""),
        "coOccurringTerms": proposal.get("co_occurring_terms", []),
        "relationshipNotes": _relationship_notes(proposal.get("relationships", [])),
        "modelConfidence": model_confidence,
        "confidenceRationale": proposal.get("confidence_rationale", ""),
        "extractedBy": "llm_extracted",
        "researcherNote": proposal.get("researcher_note", ""),
        "confirmed": False,
    }
    if researcher_confidence not in (None, ""):
        item["researcherConfidence"] = _normalise_confidence(researcher_confidence, default=model_confidence)
    if proposal.get("confirmed"):
        item["confirmed"] = True
        item["confirmedAt"] = proposal.get("confirmed_at") or now_iso
        if proposal.get("confirmed_note"):
            item["confirmedNote"] = proposal["confirmed_note"]
    return _drop_empty(item)


def _lexicon_variant_items(variants: list[dict]) -> list[dict]:
    rows = []
    for i, variant in enumerate(variants or []):
        term = variant.get("variant_term", "")
        if not term:
            continue
        rows.append(
            {
                "_key": f"variant-{i}-{_slugify(term)}",
                "variantTerm": term,
                "language": variant.get("language", "unknown"),
                "attestationTier": variant.get("attestation_tier", "tier-3-inferred"),
                "sourceNote": variant.get("source_note", ""),
            }
        )
    return rows


def _relationship_notes(relationships: list[dict]) -> str:
    notes = []
    for rel in relationships or []:
        target = rel.get("existing_term", "")
        relationship = rel.get("relationship", "")
        evidence = rel.get("evidence", "")
        bits = [bit for bit in (relationship, target, evidence) if bit]
        if bits:
            notes.append(" — ".join(bits))
    return "\n".join(notes)


def _normalise_confidence(value, default: float = 0.75) -> float:
    try:
        score = float(value)
    except (TypeError, ValueError):
        return default
    return max(0.0, min(1.0, score))


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

    sanity_id = _sanity_id_or_fallback(
        proposal.get("existing_entity_id"),
        f"{entity_type}-{_slugify(name)}",
    )
    description = proposal.get("self_description") or proposal.get("evidence_quote", "")

    if entity_type == "person":
        doc = {
            "_id": sanity_id,
            "_type": "person",
            "name": name,
            "role": _person_role(proposal.get("role_in_sogice", "")),
            "countryOfOperation": _first_or_empty(proposal.get("geographic_scope", [])),
            "description": description,
            "sourceDocuments": [{"_type": "reference", "_key": f"src-{doc_id}", "_ref": f"doc-{doc_id}"}],
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
            "sourceDocuments": [{"_type": "reference", "_key": f"src-{doc_id}", "_ref": f"doc-{doc_id}"}],
            "registryStatus": "confirmed",
        }

    result = _mutate([{"createOrReplace": doc}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for entity write:\n{result}")


def write_network_from_suggestion(
    network: dict,
    doc_id: str,
    config: Config,
) -> str:
    """Promote an approved suggestedNetwork to an organization network record."""
    name = (network.get("name") or "").strip()
    if not name:
        raise ValueError("Cannot write network organization without a name")
    sanity_id = f"organization-{_slugify(name)}"
    doc = {
        "_id": sanity_id,
        "_type": "organization",
        "name": name,
        "type": "network_node",
        "description": network.get("description") or network.get("evidenceQuote", ""),
        "visibility": "research_contextualized",
        "sourceDocuments": [{"_type": "reference", "_key": f"src-{_slugify(doc_id)}", "_ref": _sogice_document_ref(doc_id)}],
        "registryStatus": "under_investigation",
    }
    if network.get("evidenceQuote"):
        doc["notes"] = "Suggested network evidence: " + network["evidenceQuote"]
    result = _mutate([{"createOrReplace": _drop_empty(doc)}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for network write:\n{result}")


def promote_approved_suggested_networks(doc_id: str, config: Config) -> dict:
    """Create organization records for approved suggestedNetworks on a sogiceDocument."""
    doc_ref = _sogice_document_ref(doc_id)
    doc = _fetch_document_by_id(
        doc_ref,
        config,
        "{ suggestedNetworks[]{ name, description, evidenceQuote, approved } }",
    ) or {}
    pushed: list[str] = []
    skipped = 0
    errors: list[str] = []
    for network in doc.get("suggestedNetworks") or []:
        if not network.get("approved"):
            skipped += 1
            continue
        try:
            pushed.append(write_network_from_suggestion(network, doc_id, config))
        except Exception as exc:
            errors.append(f"{network.get('name', '?')}: {exc}")
    return {"pushed": pushed, "skipped": skipped, "errors": errors}


def write_tactic_from_proposal(
    proposal: dict,
    doc_id: str,
    config: Config,
) -> str:
    """Create or replace a tacticEntry from a reviewed enrichment proposal."""
    name = (proposal.get("tactic") or "").strip()
    if not name:
        raise ValueError("Cannot write tactic entry without a name")

    now_iso = datetime.now(timezone.utc).isoformat()
    sanity_id = _sanity_id_or_fallback(
        proposal.get("existing_tactic_id"),
        f"tactic-{_slugify(name)}",
    )
    doc: dict = {
        "_id": sanity_id,
        "_type": "tacticEntry",
        "tactic": name,
        "status": "draft",
        "registryStatus": "confirmed",
        "approvedBy": "researcher",
        "approvedAt": now_iso,
        "approvedFromDocument": {"_type": "reference", "_ref": f"doc-{doc_id}"},
        "frequency": 1,
        "lastReanalyzed": now_iso,
    }
    if proposal.get("definition"):
        doc["definition"] = proposal["definition"]
    if proposal.get("evidence_quote"):
        doc["evidenceDossier"] = [
            {
                "_key": f"evidence-{_slugify(doc_id)}-0",
                "documentRef": {"_type": "reference", "_ref": f"doc-{doc_id}"},
                "excerpt": _short_excerpt(proposal["evidence_quote"]),
                "extractedBy": "llm_extracted",
            }
        ]
    if proposal.get("primary_cluster"):
        doc["primaryCluster"] = proposal["primary_cluster"]
    if proposal.get("secondary_cluster"):
        doc["secondaryCluster"] = proposal["secondary_cluster"]
    if proposal.get("tactic_level") in {"structural", "sub-tactic", "campaign"}:
        doc["tacticLevel"] = proposal["tactic_level"]

    doc = {k: v for k, v in doc.items() if v is not None}
    result = _mutate([{"createOrReplace": doc}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for tactic proposal write:\n{result}")


def write_practice_from_proposal(
    proposal: dict,
    doc_id: str,
    config: Config,
) -> str:
    """Create or replace a practiceEntry from a reviewed practice description."""
    raw_name = (proposal.get("practice_id") or "").strip()
    name = re.sub(r"^Practice:\s*", "", raw_name).strip()
    if not name:
        raise ValueError("Cannot write practice entry without a practice_id")

    now_iso = datetime.now(timezone.utc).isoformat()
    sanity_id = _sanity_id_or_fallback(
        proposal.get("existing_practice_id"),
        f"practice-{_slugify(name)}",
    )
    doc: dict = {
        "_id": sanity_id,
        "_type": "practiceEntry",
        "practice": name,
        "status": "draft",
        "registryStatus": "confirmed",
        "approvedBy": "researcher",
        "approvedAt": now_iso,
        "approvedFromDocument": {"_type": "reference", "_ref": f"doc-{doc_id}"},
        "frequency": 1,
        "lastReanalyzed": now_iso,
        "descriptionFromDocument": proposal.get("exact_description", ""),
        "harmStance": proposal.get("harm_stance", "not_mentioned"),
    }
    if proposal.get("harm_quote"):
        doc["harmQuote"] = proposal["harm_quote"]
    if proposal.get("researcher_note"):
        doc["notes"] = proposal["researcher_note"]

    doc = {k: v for k, v in doc.items() if v not in (None, "")}
    result = _mutate([{"createOrReplace": doc}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for practice proposal write:\n{result}")


def append_extractable_asset_from_proposal(
    proposal: dict,
    doc_id: str,
    config: Config,
    asset_type: str,
    content: str,
    target_module: str = "",
) -> str:
    """Append an approved claim/evidence-style proposal to a sogiceDocument."""
    if not content.strip():
        raise ValueError("Cannot write extractable asset without content")

    key = f"asset-{asset_type}-{_slugify(content)[:48]}"
    item = {
        "_key": key,
        "assetType": asset_type,
        "content": content,
        "targetModule": target_module,
        "extractedBy": "human_review",
    }
    if proposal.get("source_cited"):
        item["sourceCited"] = proposal["source_cited"]
    if proposal.get("context"):
        item["context"] = proposal["context"]
    if proposal.get("practice_id"):
        item["practiceId"] = proposal["practice_id"]
    if proposal.get("harm_stance"):
        item["harmStance"] = proposal["harm_stance"]
    if proposal.get("harm_quote"):
        item["evidenceQuote"] = proposal["harm_quote"]

    result = _mutate(
        [
            {
                "patch": {
                    "id": f"doc-{doc_id}",
                    "setIfMissing": {"extractableAssets": []},
                    "insert": {"after": "extractableAssets[-1]", "items": [item]},
                }
            }
        ],
        config,
    )
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for extractable asset patch:\n{result}")


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
    canonical_id = _sanity_id_or_fallback(
        variant.get("canonical_id"),
        f"lexicon-{_slugify(variant.get('canonical_term', ''))}",
    )
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


def write_seed_practice_entry(entry: dict, config: Config) -> str:
    """Create or replace a practiceEntry record from seed data."""
    name = (entry.get("practice") or "").strip()
    if not name:
        raise ValueError("Cannot write practice entry without a name")

    now_iso = datetime.now(timezone.utc).isoformat()
    sanity_id = f"practice-{_slugify(name)}"

    doc: dict = {
        "_id": sanity_id,
        "_type": "practiceEntry",
        "practice": name,
        "status": "draft",
        "registryStatus": "seeded",
        "frequency": 0,
    }
    if entry.get("definition"):
        doc["definition"] = entry["definition"]
    if entry.get("accessible_definition"):
        doc["accessibleDefinition"] = entry["accessible_definition"]
    if entry.get("practice_type"):
        doc["practiceType"] = entry["practice_type"]
    if entry.get("delivery_context"):
        ctx = entry["delivery_context"]
        doc["deliveryContext"] = ctx if isinstance(ctx, list) else [ctx]
    if entry.get("harm_categories"):
        harms = entry["harm_categories"]
        doc["harmCategories"] = harms if isinstance(harms, list) else [harms]
    if entry.get("religious_context"):
        rc = entry["religious_context"]
        doc["religiousContext"] = rc if isinstance(rc, list) else [rc]
    if entry.get("legal_status"):
        doc["legalStatus"] = entry["legal_status"]

    doc = {k: v for k, v in doc.items() if v is not None}
    result = _mutate([{"createOrReplace": doc}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for practice write:\n{result}")


def write_seed_tag_registry(entry: dict, config: Config) -> str:
    """Create or replace a tagRegistry record from vocabulary CSV data."""
    tag = (entry.get("tag") or "").strip()
    category = (entry.get("category") or "").strip()
    if not tag or not category:
        raise ValueError("Cannot write tag registry entry without tag and category")

    sanity_id = f"tag-{_slugify(tag)}"

    doc: dict = {
        "_id": sanity_id,
        "_type": "tagRegistry",
        "tag": tag,
        "category": category,
        "status": "active",
        "frequency": entry.get("frequency", 0),
    }
    if entry.get("definition"):
        doc["definition"] = entry["definition"]
    if entry.get("notes"):
        doc["notes"] = entry["notes"]
    if entry.get("prompt_alignment"):
        doc["promptAlignment"] = entry["prompt_alignment"]
    if entry.get("prompt_equivalent"):
        doc["promptEquivalent"] = entry["prompt_equivalent"]

    doc = {k: v for k, v in doc.items() if v is not None}
    result = _mutate([{"createOrReplace": doc}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for tag registry write:\n{result}")


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


def write_seed_exclusion_clause(entry: dict, config: Config) -> str:
    """Create or replace an exclusionClause record from seed data."""
    ec_id = (entry.get("id") or "").strip()
    parent_ref = (entry.get("parent_law_id") or "").strip()
    if not ec_id or not parent_ref:
        raise ValueError("Cannot write exclusion clause without id and parent_law_id")

    doc: dict = {
        "_id": f"ec-{ec_id.lower()}",
        "_type": "exclusionClause",
        "parentLegalDefinition": {"_type": "reference", "_ref": parent_ref},
        "usedInPolicyArguments": entry.get("used_in_policy_arguments", False),
    }
    if entry.get("excludes"):
        doc["excludes"] = entry["excludes"]
    if entry.get("text_excerpt"):
        doc["textExcerpt"] = entry["text_excerpt"]
    if entry.get("interpretation_risks"):
        doc["interpretationRisks"] = entry["interpretation_risks"]
    if entry.get("policy_argument_description"):
        doc["policyArgumentDescription"] = entry["policy_argument_description"]

    doc = {k: v for k, v in doc.items() if v is not None}
    result = _mutate([{"createOrReplace": doc}], config)
    try:
        return result["results"][0]["id"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Unexpected Sanity response for exclusion clause write:\n{result}")


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
    ingested_at = intake.ingested_at or now_iso
    analysed_at = _analysis_processing_date(pkg, now_iso)

    # Omit None URL values — Sanity url fields cannot be null
    meta: dict = {
        "ingestedAt":           ingested_at,
        "preprocessingTool":    prep.tool_used,
        "preprocessingQuality": prep.quality,
    }
    pub_meta = publication_metadata({
        "date_published": prep.date_published,
        "sitename": prep.sitename,
        "hostname": prep.hostname,
        "page_intel": prep.page_intel.__dict__ if prep.page_intel else {},
    })
    if pub_meta["date_published"]:
        meta["datePublished"] = pub_meta["date_published"]
    if pub_meta["date_modified"]:
        meta["dateModified"] = pub_meta["date_modified"]
    if pub_meta["publisher"]:
        meta["publisher"] = pub_meta["publisher"]
    if pub_meta["hostname"]:
        meta["hostname"] = pub_meta["hostname"]
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
    if pub_meta["canonical_url"]:
        provenance["canonicalUrl"] = pub_meta["canonical_url"]
    if pub_meta["date_published"]:
        provenance["sourceDatePublished"] = pub_meta["date_published"]
    if pub_meta["date_modified"]:
        provenance["sourceDateModified"] = pub_meta["date_modified"]
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
                    "jurisdiction": analysis.legal_status.jurisdiction or None,
                    "status":       analysis.legal_status.status,
                    "instrument":   analysis.legal_status.instrument,
                }.items() if v is not None
            }
            if analysis.legal_status
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
            "lowConfidenceReasons": [
                {
                    "_key":     f"lcr-{i}",
                    "field":    r.field,
                    "issue":    r.issue,
                    "severity": r.severity,
                }
                for i, r in enumerate(analysis.field_confidence.low_confidence_reasons)
            ],
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

        "suggestedActors": [
            {
                "_key":          f"actor-{i}",
                "name":          a.name,
                "type":          a.type,
                "country":       a.country,
                "role":          a.role,
                "evidenceQuote": a.evidence_quote,
                "approved":      False,
            }
            for i, a in enumerate(analysis.suggested_actors)
        ],

        "suggestedNetworks": [
            {
                "_key":          f"net-{i}",
                "name":          n.name,
                "description":   n.description,
                "evidenceQuote": n.evidence_quote,
                "approved":      False,
            }
            for i, n in enumerate(analysis.suggested_networks)
        ],

        "aiMetadata": {
            "primaryModel":          pkg.llm_used,
            "primaryProvider":       _provider_for_llm(pkg.llm_used),
            "promptVersion":         PROMPT_VERSION,
            "ontologyVersion":       "v3.0",
            "processingDate":        analysed_at,
            "analysedAt":            analysed_at,
            "inputLengthChars":      prep.char_count,
            "truncated":             prep.truncated,
            "agreementStatus":       "not_validated",
            "resolution":            "not_applicable",
            "normalisationWarnings": analysis.normalisation_warnings or [],
        },

        "referencedUrls": _build_referenced_urls(prep),

        "testimonyFlag": analysis.testimony_flag,
        "needsReview":   analysis.needs_review,

        "validation": {
            "status": "not_validated",
        },
    }
    if prep.media_metadata:
        media_metadata = dict(prep.media_metadata)
        media_metadata.pop("rawYtDlpMetadata", None)
        doc["mediaMetadata"] = _with_array_keys(_drop_empty(media_metadata), prefix="media")
    testimony_review = _load_testimony_review(pkg.local_dir)
    if testimony_review:
        doc["testimonyReview"] = testimony_review

    if prep.language_detected:
        doc["content"]["languageDetected"] = prep.language_detected

    # Strip top-level None values — Sanity rejects null for non-nullable fields
    doc = {k: v for k, v in doc.items() if v is not None}

    return doc


def _analysis_processing_date(pkg: DocumentPackage, fallback: str) -> str:
    metadata_path = pkg.local_dir / "metadata.json"
    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8")) if metadata_path.exists() else {}
    except Exception:
        metadata = {}
    for key in ("saved_at", "analysis_saved_at", "processing_date"):
        if metadata.get(key):
            return str(metadata[key])
    analysis_path = pkg.local_dir / "analysis.json"
    if analysis_path.exists():
        return datetime.fromtimestamp(analysis_path.stat().st_mtime, timezone.utc).isoformat()
    return fallback


def _slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "untitled"


def _valid_sanity_id(value: str | None) -> bool:
    if not value:
        return False
    return re.fullmatch(r"[A-Za-z0-9._-]+", value) is not None


def _sanity_id_or_fallback(candidate: str | None, fallback: str) -> str:
    candidate = (candidate or "").strip()
    return candidate if _valid_sanity_id(candidate) else fallback


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
        "confirmed":  "obtained",
        "unclear":    "pending",
        "pending":    "pending",
        "refused":    "refused",
        "withdrawn":  "withdrawn",
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


def _research_annotation_id(annotation: ResearchAnnotation) -> str:
    return f"researchAnnotation-{_slugify(annotation.doc_id.removeprefix('doc-'))}-{_slugify(annotation.profile)}"


def _build_research_annotation_document(annotation: ResearchAnnotation) -> dict:
    data = annotation.model_dump(by_alias=True, mode="json")
    doc_id = data.pop("doc_id")
    result_json = _with_array_keys(data.pop("resultJson", {}), prefix="result")
    doc = {
        "_id": _research_annotation_id(annotation),
        "_type": "researchAnnotation",
        "sourceDocument": {"_type": "reference", "_ref": _sogice_document_ref(doc_id)},
        "resultJson": result_json,
        **data,
    }
    return {k: v for k, v in doc.items() if v not in (None, "")}


def _sogice_document_ref(doc_id: str) -> str:
    doc_id = doc_id.strip()
    return doc_id if doc_id.startswith("doc-") else f"doc-{doc_id}"


def _with_array_keys(value, prefix: str = "item"):
    """Recursively add Sanity _key values to object items inside arrays."""
    if isinstance(value, list):
        result = []
        for index, item in enumerate(value):
            item = _with_array_keys(item, prefix=f"{prefix}-{index}")
            if isinstance(item, dict) and "_key" not in item:
                item = {"_key": f"{prefix}-{index}", **item}
            result.append(item)
        return result
    if isinstance(value, dict):
        return {k: _with_array_keys(v, prefix=f"{prefix}-{_slugify(str(k))}") for k, v in value.items()}
    return value


def _drop_empty(value):
    if isinstance(value, list):
        return [
            cleaned for item in value
            if (cleaned := _drop_empty(item)) not in (None, "", [], {})
        ]
    if isinstance(value, dict):
        return {
            key: cleaned for key, item in value.items()
            if (cleaned := _drop_empty(item)) not in (None, "", [], {})
        }
    return value


def _query(query: str, config: Config, params: dict | None = None) -> list[dict]:
    url = (
        f"https://{config.sanity_project_id}.api.sanity.io"
        f"/v2024-01-01/data/query/{config.sanity_dataset}"
    )
    headers = {"Authorization": f"Bearer {config.sanity_write_token}"}
    encoded_params = {"query": query}
    for key, value in (params or {}).items():
        encoded_params[key if key.startswith("$") else f"${key}"] = value
    response = httpx.get(
        url,
        params=encoded_params,
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()
    return response.json().get("result", [])


def _fetch_document_by_id(doc_id: str, config: Config, projection: str) -> dict | None:
    result = _query(f'*[_id == $doc_id][0]{projection}', config, {"doc_id": doc_id})
    return result if isinstance(result, dict) else None


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
    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        body = response.text[:2000]
        raise RuntimeError(f"Sanity mutation failed ({response.status_code}): {body}") from exc
    return response.json()
