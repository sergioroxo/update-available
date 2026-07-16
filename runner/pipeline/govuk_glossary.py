"""Versioned GOV.UK glossary source attestation and bounded prompt memory."""
from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any


MANIFEST_PATH = Path(__file__).parents[2] / "00_infrastructure" / "govuk_conversion_therapy_glossary_2021.json"
SCHEMA_VERSION = "govuk-glossary-source-v1"
ALGORITHM_VERSION = "govuk-definition-memory-v1"
EXPECTED_TERM_COUNT = 35
EXPECTED_SOURCE = {
    "publisher": "UK Government Equalities Office",
    "publication_date": "2021-10-29",
    "url": "https://www.gov.uk/government/publications/conversion-therapy-an-evidence-assessment-and-qualitative-study/appendix-1-glossary",
    "licence": "Open Government Licence v3.0",
    "definition_representation": "Researcher-authored concise summaries of the source definitions, not verbatim transcriptions.",
}
EXPECTED_SOURCE_TERMS = {
    "Asexual", "Bisexual", "Cisgender", "Conversion therapy", "Ex-gay",
    "Ex-gay ministry", "Ex-gay movement", "Gay", "Gender dysphoria",
    "Gender expression", "Gender identity", "Gender identity change efforts",
    "Gender incongruence", "Gender reassignment", "Heterosexual", "Homosexual",
    "Intersex", "Lesbian", "LGBT", "Minority gender identity",
    "Minority sexual orientation", "Non-binary", "Pansexual", "Queer",
    "Reparative therapy", "Sex", "Sexual fluidity", "Sexual identity",
    "Sexual orientation", "Sexual orientation change efforts", "Straight",
    "Transgender or Trans", "Transsexualism", "Unwanted same-sex attraction",
    "Variations in sex characteristics",
}
MAX_HINTS = 12
MAX_DEFINITION_CHARS = 240
MAX_BLOCK_CHARS = 4000
ARCHIVE_CLASSIFICATION_HINTS = {
    "Ex-gay": ("SSA-Rhetoric", "Testimonial Marketing"),
    "Ex-gay Movement": ("SSA-Rhetoric", "Promotional Recruitment"),
    "Ex-gay Ministry": ("Pastoral-Coercion", "Promotional Recruitment"),
    "Gender Identity Change Efforts": ("Anti-Trans/ROGD", "Unknown"),
    "Reparative Therapy": ("Pseudo-Science", "Pseudo-Diagnostic"),
    "Sexual Orientation Change Efforts": ("Pseudo-Science", "Pseudo-Diagnostic"),
    "Unwanted Same-Sex Attraction": ("SSA-Rhetoric", "Euphemism"),
}


def load_manifest(path: Path | None = None) -> dict[str, Any]:
    payload = json.loads((path or MANIFEST_PATH).read_text(encoding="utf-8"))
    validate_manifest(payload)
    return payload


def validate_manifest(payload: dict[str, Any]) -> None:
    if payload.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("Unsupported GOV.UK glossary manifest schema.")
    source = payload.get("source") if isinstance(payload.get("source"), dict) else {}
    required_source = (
        "title", "publisher", "publication_date", "url", "licence", "scope_note",
        "definition_representation",
    )
    if any(not str(source.get(key) or "").strip() for key in required_source):
        raise ValueError("GOV.UK glossary source provenance is incomplete.")
    for key, expected in EXPECTED_SOURCE.items():
        if source.get(key) != expected:
            raise ValueError(f"GOV.UK glossary source {key} does not match the authority manifest contract.")
    rows = payload.get("terms")
    if not isinstance(rows, list) or len(rows) != EXPECTED_TERM_COUNT:
        raise ValueError(f"GOV.UK glossary manifest must contain exactly {EXPECTED_TERM_COUNT} terms.")
    source_ids, names = set(), set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("GOV.UK glossary records must be objects.")
        required = ("source_id", "source_term", "source_definition", "canonical_term", "mapping")
        if any(not str(row.get(key) or "").strip() for key in required):
            raise ValueError("GOV.UK glossary term provenance or mapping is incomplete.")
        sid = str(row["source_id"])
        name = _normalise(str(row["source_term"]))
        if sid in source_ids or name in names:
            raise ValueError("GOV.UK glossary source IDs and exact terms must be unique.")
        if row["mapping"] not in {"canonical", "variant"}:
            raise ValueError("GOV.UK glossary mapping must be canonical or variant.")
        source_ids.add(sid)
        names.add(name)
    if {str(row["source_term"]) for row in rows} != EXPECTED_SOURCE_TERMS:
        raise ValueError("GOV.UK glossary manifest does not contain the exact official term set.")


def manifest_fingerprint(payload: dict[str, Any] | None = None) -> str:
    data = payload or load_manifest()
    stable = json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(stable.encode("utf-8")).hexdigest()


def seed_memory_terms(path: Path | None = None) -> list[dict[str, Any]]:
    """Return source-attested drafts; never mark them validated or trusted."""
    payload = load_manifest(path)
    source = payload["source"]
    by_canonical: dict[str, dict[str, Any]] = {}
    for record in payload["terms"]:
        canonical = str(record["canonical_term"])
        key = _normalise(canonical)
        cluster, function = ARCHIVE_CLASSIFICATION_HINTS.get(canonical, ("Non-SOGICE", "Unknown"))
        row = by_canonical.setdefault(key, {
            "term": canonical,
            "status": "seed_draft",
            "proposedCluster": cluster,
            "function": function,
            "multilingualVariants": [],
            "source": "seed",
            "sourceNote": f"GOV.UK conversion therapy evidence assessment glossary — {source['url']}",
            "sourceAttestations": [],
            "includeInAnalysisLexicon": False,
        })
        attestation = {
            "sourceId": record["source_id"],
            "sourceTerm": record["source_term"],
            "sourceDefinitionSummary": record["source_definition"],
            "definitionRepresentation": source["definition_representation"],
            "sourceUrl": source["url"],
            "publicationDate": source["publication_date"],
            "publisher": source["publisher"],
            "licence": source["licence"],
            "reviewState": "source_attested_unreviewed",
        }
        row["sourceAttestations"].append(attestation)
        if record["mapping"] == "variant":
            row["multilingualVariants"].append({
                "variantTerm": record["source_term"],
                "language": "en",
                "sourceId": record["source_id"],
            })
    return list(by_canonical.values())


def sanity_authority_rows(path: Path | None = None) -> list[dict[str, Any]]:
    """Return idempotent Sanity draft inputs with structured source provenance.

    These rows never request canonical validation or Analysis-orientation trust.
    The source-definition field is the manifest's researcher-authored concise
    summary, explicitly not a verbatim transcription of the GOV.UK page.
    """
    rows: list[dict[str, Any]] = []
    for memory in seed_memory_terms(path):
        attestations = []
        for item in memory.get("sourceAttestations") or []:
            source_id = str(item.get("sourceId") or "")
            attestation = {
                "_key": "govuk-" + re.sub(r"[^a-z0-9]+", "-", source_id.casefold()).strip("-"),
                **item,
            }
            # The fingerprint covers only authority-owned provenance.  It does
            # not include reviewState, which remains researcher-controlled when
            # a later manifest revision refreshes the source summary.
            attestation["attestationFingerprint"] = _attestation_fingerprint(attestation)
            attestations.append(attestation)
        rows.append({
            "sanity_id": "lexicon-" + re.sub(
                r"[^a-z0-9]+", "-", str(memory["term"]).casefold()
            ).strip("-"),
            "term": memory["term"],
            "status": "draft",
            "includeInAnalysisLexicon": False,
            "proposedCluster": memory.get("proposedCluster"),
            "function": memory.get("function"),
            "draftDefinition": (
                attestations[0].get("sourceDefinitionSummary", "") if attestations else ""
            ),
            "sourceAttestations": attestations,
        })
    return rows


def _attestation_fingerprint(attestation: dict[str, Any]) -> str:
    authority_fields = {
        key: attestation.get(key)
        for key in (
            "sourceId", "sourceTerm", "sourceDefinitionSummary",
            "definitionRepresentation", "sourceUrl", "publicationDate",
            "publisher", "licence",
        )
    }
    stable = json.dumps(authority_fields, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(stable.encode("utf-8")).hexdigest()


def select_definition_memory(text: str, path: Path | None = None) -> dict[str, Any]:
    """Select only source terms actually present in text, with hard context caps."""
    payload = load_manifest(path)
    normalised_text = unicodedata.normalize("NFKC", str(text or ""))
    matches: dict[str, dict[str, Any]] = {}
    for record in payload["terms"]:
        form = str(record["source_term"])
        pattern = r"(?<!\w)" + re.escape(form) + r"(?!\w)"
        if not re.search(pattern, normalised_text, flags=re.IGNORECASE):
            continue
        canonical = str(record["canonical_term"])
        key = _normalise(canonical)
        selected = matches.setdefault(key, {
            "canonical_term": canonical,
            "matched_forms": [],
            "source_ids": [],
            "definitions": [],
        })
        selected["matched_forms"].append(form)
        selected["source_ids"].append(record["source_id"])
        selected["definitions"].append(str(record["source_definition"])[:MAX_DEFINITION_CHARS])
    rows = sorted(matches.values(), key=lambda row: _normalise(row["canonical_term"]))[:MAX_HINTS]
    lines = ["<govuk_glossary_reference_data>"]
    truncated = len(matches) > len(rows)
    for row in rows:
        definition = row["definitions"][0]
        line = (
            f"- {row['canonical_term']}: in the GOV.UK 2021 report, "
            f"{definition} [matched: {', '.join(sorted(set(row['matched_forms'])))}]"
        )
        if sum(len(part) + 1 for part in lines) + len(line) + len("</govuk_glossary_reference_data>") > MAX_BLOCK_CHARS:
            truncated = True
            break
        lines.append(line)
    lines.append("</govuk_glossary_reference_data>")
    block = "\n".join(lines) if len(lines) > 2 else ""
    included = rows[: max(0, len(lines) - 2)]
    return {
        "block": block,
        "receipt": {
            "manifest_fingerprint": manifest_fingerprint(payload),
            "algorithm_version": ALGORITHM_VERSION,
            "matched_source_forms": sorted({form for row in included for form in row["matched_forms"]}),
            "selected_canonical_terms": [row["canonical_term"] for row in included],
            "injected_count": len(included),
            "character_count": len(block),
            "truncated": truncated,
            "source_url": payload["source"]["url"],
        },
    }


def _normalise(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())
