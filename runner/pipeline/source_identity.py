"""Derived source-identity projection for Phase 11.

This module reconciles metadata already present in the corpus. It does not
rerun triage, open cloud PDF libraries, hash source files, call a model, merge
documents, or write canonical artifacts. Relationship rows are suggestions,
never claims of independent attestation.
"""
from __future__ import annotations

from datetime import datetime, timezone
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import unquote
from urllib.parse import urlsplit

from .atomic_io import atomic_write_json
from .source_queue import normalise_url
from .workflow_integrity import canonical_fingerprint, valid_fingerprint


SCHEMA_VERSION = "source-identity-index-v1.1"
RELATIONSHIP_TYPES = {"mirror_of", "version_of", "translation_of", "derived_from"}
MAX_JSON_BYTES = 8 * 1024 * 1024
MAX_IDENTITY_SNAPSHOT_BYTES = 256 * 1024 * 1024

_PRIORITY = {
    "researcher": 100,
    "reviewed_bibliographic": 90,
    "structured_metadata": 80,
    "intake": 70,
    "pdf_metadata": 60,
    "machine_extracted": 55,
    "analysis": 40,
    "filename": 20,
}


def _read_json(path: Path, *, max_bytes: int = MAX_JSON_BYTES) -> dict[str, Any]:
    path = Path(path)
    if not path.is_file() or path.is_symlink() or path.stat().st_size > max_bytes:
        return {}
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return value if isinstance(value, dict) else {}


def normalize_doi(value: Any) -> str:
    text = unquote(str(value or "")).strip().casefold()
    text = re.sub(r"^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)", "", text)
    text = text.rstrip(".,;:)]}>")
    match = re.search(r"10\.\d{4,9}/\S+", text)
    return match.group(0).rstrip(".,;:)]}>") if match else ""


def _norm_text(value: Any) -> str:
    if isinstance(value, list):
        return " | ".join(sorted({_norm_text(item) for item in value if _norm_text(item)}))
    return " ".join(re.sub(r"[^\w]+", " ", str(value or "").casefold()).split())


def _candidate(
    value: Any,
    *,
    source_file: str,
    pointer: str,
    source_kind: str,
    confidence: float,
    normalizer=_norm_text,
) -> dict[str, Any] | None:
    if value is None or value == "" or value == []:
        return None
    normalized = normalizer(value)
    if not normalized:
        return None
    return {
        "value": value,
        "normalized_value": normalized,
        "source_file": source_file,
        "json_pointer": pointer,
        "source_kind": source_kind,
        "confidence": max(0.0, min(1.0, float(confidence))),
        "priority": _PRIORITY[source_kind],
    }


def _safe_web_url(value: Any) -> str:
    """Normalize only absolute HTTP(S) identity URLs; reject local/pseudo URLs."""
    text = str(value or "").strip()
    try:
        parts = urlsplit(text)
    except ValueError:
        return ""
    if parts.scheme.casefold() not in {"http", "https"} or not parts.hostname:
        return ""
    return normalise_url(text)


def _bibliographic_kind(record: dict[str, Any], field: Any = None) -> str:
    """Do not describe machine-extracted bibliographic data as researcher reviewed."""
    states = {
        str(record.get("review_state") or "").casefold(),
        str(field.get("review_state") or "").casefold() if isinstance(field, dict) else "",
    }
    reviewed = {"approved", "reviewed", "researcher_confirmed", "human_reviewed"}
    return "reviewed_bibliographic" if states & reviewed else "machine_extracted"


def _resolve(candidates: list[dict[str, Any]]) -> dict[str, Any]:
    candidates = sorted(
        candidates,
        key=lambda row: (-int(row["priority"]), -float(row["confidence"]), str(row["normalized_value"])),
    )
    if not candidates:
        return {"resolved_value": "", "resolution_state": "missing", "confidence": 0.0, "candidates": []}
    winner = candidates[0]
    distinct = {json.dumps(row["normalized_value"], sort_keys=True) for row in candidates}
    return {
        "resolved_value": winner["value"],
        "resolution_state": "conflicted" if len(distinct) > 1 else "resolved",
        "confidence": winner["confidence"],
        "candidates": candidates,
    }


def _append(target: list[dict[str, Any]], value: Any, **kwargs) -> None:
    row = _candidate(value, **kwargs)
    if row and not any(
        item["normalized_value"] == row["normalized_value"]
        and item["source_file"] == row["source_file"]
        and item["json_pointer"] == row["json_pointer"]
        for item in target
    ):
        target.append(row)


def collect_document_identity(doc_dir: Path) -> dict[str, Any]:
    """Build one deterministic identity row using existing safe sidecars only."""
    doc_dir = Path(doc_dir)
    if not doc_dir.is_dir() or doc_dir.is_symlink():
        raise ValueError("Source identity requires a safe local document directory")
    doc_id = doc_dir.name
    intake = _read_json(doc_dir / "intake.json")
    prep = _read_json(doc_dir / "preprocess.json")
    biblio = _read_json(doc_dir / "bibliographic.json")
    longform = _read_json(doc_dir / "longform_source.json")
    source_item = _read_json(doc_dir / "source_item.json")
    analysis = _read_json(doc_dir / "analysis.json")
    page = prep.get("page_intel") if isinstance(prep.get("page_intel"), dict) else {}

    buckets: dict[str, list[dict[str, Any]]] = {
        key: [] for key in (
            "canonical_url", "doi", "title", "authors", "publication",
            "publication_date", "filename", "source_artifact_sha256",
            "source_html_sha256", "language",
        )
    }

    def add(field: str, value: Any, file: str, pointer: str, kind: str, confidence: float, normalizer=_norm_text):
        _append(
            buckets[field], value, source_file=file, pointer=pointer,
            source_kind=kind, confidence=confidence, normalizer=normalizer,
        )

    for pointer, value, confidence in (
        ("/page_intel/canonical_url", page.get("canonical_url"), 0.95),
        ("/source_url", intake.get("source_url"), 0.85),
        ("/source", intake.get("source") if intake.get("source_type") == "url" else "", 0.8),
        ("/urls/canonical_url", (biblio.get("urls") or {}).get("canonical_url"), 0.9),
        ("/urls/source_url", (biblio.get("urls") or {}).get("source_url"), 0.8),
    ):
        add("canonical_url", value, "preprocess.json" if pointer.startswith("/page") else "intake.json" if pointer in {"/source_url", "/source"} else "bibliographic.json", pointer, "structured_metadata" if pointer.startswith("/page") or pointer.startswith("/urls") else "intake", confidence, _safe_web_url)

    identifiers = biblio.get("identifiers") if isinstance(biblio.get("identifiers"), dict) else {}
    add("doi", identifiers.get("doi"), "bibliographic.json", "/identifiers/doi", _bibliographic_kind(biblio, identifiers), 0.95, normalize_doi)
    for url_row in buckets["canonical_url"]:
        doi = normalize_doi(url_row["value"])
        if doi:
            add("doi", doi, url_row["source_file"], url_row["json_pointer"], url_row["source_kind"], url_row["confidence"], normalize_doi)

    titles = biblio.get("titles") if isinstance(biblio.get("titles"), dict) else {}
    main_title = titles.get("main") if isinstance(titles.get("main"), dict) else {}
    add("title", main_title.get("value"), "bibliographic.json", "/titles/main/value", _bibliographic_kind(biblio, main_title), float(main_title.get("confidence") or 0.7))
    add("title", prep.get("title"), "preprocess.json", "/title", "structured_metadata", 0.85)
    add("title", source_item.get("title"), "source_item.json", "/title", "intake", 0.7)
    add("title", analysis.get("title"), "analysis.json", "/title", "analysis", 0.4)

    creators = biblio.get("creators") if isinstance(biblio.get("creators"), list) else []
    creator_names = [
        str(row.get("name") or row.get("literal") or "").strip()
        for row in creators if isinstance(row, dict) and str(row.get("name") or row.get("literal") or "").strip()
    ]
    add("authors", creator_names, "bibliographic.json", "/creators", _bibliographic_kind(biblio), 0.85)
    add("authors", [prep.get("author")] if prep.get("author") else [], "preprocess.json", "/author", "structured_metadata", 0.75)

    publication = biblio.get("publication") if isinstance(biblio.get("publication"), dict) else {}
    publisher = publication.get("publisher") if isinstance(publication.get("publisher"), dict) else {}
    add("publication", publisher.get("value"), "bibliographic.json", "/publication/publisher/value", _bibliographic_kind(biblio, publisher), float(publisher.get("confidence") or 0.7))
    add("publication", prep.get("sitename"), "preprocess.json", "/sitename", "structured_metadata", 0.7)
    issued = publication.get("issued") if isinstance(publication.get("issued"), dict) else {}
    add("publication_date", issued.get("raw"), "bibliographic.json", "/publication/issued/raw", _bibliographic_kind(biblio, issued), float(issued.get("confidence") or 0.65))
    add("publication_date", prep.get("date_published"), "preprocess.json", "/date_published", "structured_metadata", 0.85)

    add("filename", source_item.get("original_filename"), "source_item.json", "/original_filename", "intake", 0.85)
    add("filename", intake.get("original_filename"), "intake.json", "/original_filename", "intake", 0.8)
    artifacts = longform.get("source_artifacts") if isinstance(longform.get("source_artifacts"), list) else []
    for index, artifact in enumerate(artifacts):
        if not isinstance(artifact, dict) or artifact.get("role") != "source":
            continue
        add("source_artifact_sha256", artifact.get("sha256"), "longform_source.json", f"/source_artifacts/{index}/sha256", "pdf_metadata", 1.0, lambda value: str(value).lower() if re.fullmatch(r"[0-9a-fA-F]{64}", str(value or "")) else "")
        add("filename", artifact.get("filename"), "longform_source.json", f"/source_artifacts/{index}/filename", "pdf_metadata", 0.6)
    html_hash = prep.get("source_html_sha256") or intake.get("source_html_sha256")
    html_file = "preprocess.json" if prep.get("source_html_sha256") else "intake.json"
    add("source_html_sha256", html_hash, html_file, "/source_html_sha256", "structured_metadata", 1.0, lambda value: str(value).lower() if re.fullmatch(r"[0-9a-fA-F]{64}", str(value or "")) else "")
    add("language", biblio.get("language"), "bibliographic.json", "/language", _bibliographic_kind(biblio), 0.8)
    add("language", prep.get("language_detected"), "preprocess.json", "/language_detected", "structured_metadata", 0.75)
    add("language", intake.get("language"), "intake.json", "/language", "intake", 0.7)

    fields = {key: _resolve(value) for key, value in buckets.items()}
    input_fingerprint = canonical_fingerprint({
        "doc_id": doc_id,
        "fields": fields,
    })
    return {
        "doc_id": doc_id,
        "fields": fields,
        "candidate_document_family_id": "",
        "family_resolution_state": "unreviewed",
        "input_fingerprint": input_fingerprint,
    }


def _resolved(document: dict[str, Any], field: str) -> Any:
    return (document.get("fields", {}).get(field) or {}).get("resolved_value")


def _usable_resolved(document: dict[str, Any], field: str) -> Any:
    """Return a winner only when all observed candidates agree."""
    record = (document.get("fields", {}).get(field) or {})
    return record.get("resolved_value") if record.get("resolution_state") == "resolved" else None


def propose_relationships(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    suggestions: list[dict[str, Any]] = []
    for index, left in enumerate(documents):
        for right in documents[index + 1:]:
            bases: list[dict[str, Any]] = []
            relationship = ""
            confidence = 0.0
            matching_hash_field = next((
                field for field in ("source_artifact_sha256", "source_html_sha256")
                if _usable_resolved(left, field)
                and _usable_resolved(left, field) == _usable_resolved(right, field)
            ), "")
            left_doi, right_doi = normalize_doi(_usable_resolved(left, "doi")), normalize_doi(_usable_resolved(right, "doi"))
            left_url, right_url = _usable_resolved(left, "canonical_url"), _usable_resolved(right, "canonical_url")
            if matching_hash_field:
                digest = _usable_resolved(left, matching_hash_field)
                relationship, confidence = "mirror_of", 1.0
                bases.append({"field": matching_hash_field, "representation": matching_hash_field.removesuffix("_sha256"), "value_sha256": digest})
            elif left_doi and left_doi == right_doi:
                relationship, confidence = "version_of", 0.98
                bases.append({"field": "doi", "normalized_value": left_doi})
            elif left_url and right_url and normalise_url(left_url) == normalise_url(right_url):
                relationship, confidence = "version_of", 0.95
                bases.append({"field": "canonical_url", "normalized_value": normalise_url(left_url)})
            else:
                left_title, right_title = _norm_text(_usable_resolved(left, "title")), _norm_text(_usable_resolved(right, "title"))
                left_authors, right_authors = _norm_text(_usable_resolved(left, "authors")), _norm_text(_usable_resolved(right, "authors"))
                left_year = re.search(r"\b(?:18|19|20)\d{2}\b", str(_usable_resolved(left, "publication_date") or ""))
                right_year = re.search(r"\b(?:18|19|20)\d{2}\b", str(_usable_resolved(right, "publication_date") or ""))
                if left_title and left_title == right_title and left_authors and left_authors == right_authors and left_year and right_year and left_year.group() == right_year.group():
                    relationship, confidence = "version_of", 0.75
                    bases.extend([
                        {"field": "title", "normalized_value": left_title},
                        {"field": "authors", "normalized_value": left_authors},
                        {"field": "publication_year", "normalized_value": left_year.group()},
                    ])
            if not relationship:
                continue
            pair = sorted([left["doc_id"], right["doc_id"]])
            stable = {"documents": pair, "relationship": relationship, "bases": bases}
            suggestions.append({
                "suggestion_id": "source-rel-" + canonical_fingerprint(stable)[:24],
                "source_doc_id": pair[0],
                "target_doc_id": pair[1],
                "relationship": relationship,
                "confidence": confidence,
                "matching_bases": bases,
                "status": "pending",
                "affects_family_counts": False,
            })
    return sorted(suggestions, key=lambda row: row["suggestion_id"])


def summarize_identity_counts(
    documents: list[dict[str, Any]], relationships: list[dict[str, Any]],
) -> dict[str, Any]:
    hashes = {
        (field, _resolved(row, field))
        for row in documents
        for field in ("source_artifact_sha256", "source_html_sha256")
        if _resolved(row, field)
    }
    hosts = set()
    for row in documents:
        url = str(_resolved(row, "canonical_url") or "")
        match = re.match(r"https?://([^/]+)", url)
        if match:
            hosts.add(match.group(1).casefold())
    actors = {_norm_text(item) for row in documents for item in (_resolved(row, "authors") or []) if _norm_text(item)}
    publications = {_norm_text(_resolved(row, "publication")) for row in documents if _norm_text(_resolved(row, "publication"))}
    resolved_families = {
        row.get("candidate_document_family_id") for row in documents
        if row.get("family_resolution_state") == "researcher_confirmed" and row.get("candidate_document_family_id")
    }
    coverage = sum(row.get("family_resolution_state") == "researcher_confirmed" for row in documents) / len(documents) if documents else 0.0
    return {
        "document_count": len(documents),
        "byte_identity_group_count": len(hashes),
        "hostname_proxy_count": len(hosts),
        "recorded_producing_actor_count": len(actors),
        "recorded_publication_count": len(publications),
        "researcher_resolved_document_family_count": len(resolved_families),
        "unresolved_relationship_count": sum(row.get("status") == "pending" for row in relationships),
        "reviewed_family_coverage": round(coverage, 6),
        "source_family_count": len(resolved_families) if coverage == 1.0 else None,
        "source_family_count_reason": "Complete researcher family review" if coverage == 1.0 else "Incomplete identity review",
        "independence_claim": False,
    }


def _stable_snapshot(payload: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in payload.items() if key not in {"generated_at", "snapshot_fingerprint"}}


def build_identity_snapshot(corpus_dir: Path, *, doc_ids: list[str] | None = None) -> dict[str, Any]:
    corpus_dir = Path(corpus_dir)
    selected = set(doc_ids or [])
    documents = []
    for doc_dir in sorted(corpus_dir.iterdir() if corpus_dir.is_dir() else []):
        if not doc_dir.is_dir() or doc_dir.is_symlink() or (selected and doc_dir.name not in selected):
            continue
        if not (doc_dir / "intake.json").exists() and not (doc_dir / "preprocess.json").exists():
            continue
        documents.append(collect_document_identity(doc_dir))
    relationships = propose_relationships(documents)
    payload = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "scope": {
            "doc_ids": [row["doc_id"] for row in documents],
            "is_complete_corpus": not bool(selected),
        },
        "documents": documents,
        "relationship_suggestions": relationships,
        "count_summary": summarize_identity_counts(documents, relationships),
        "automatic_merges": False,
        "independent_attestation_claim": False,
    }
    payload["snapshot_fingerprint"] = canonical_fingerprint(_stable_snapshot(payload))
    validate_identity_snapshot(payload)
    return payload


def validate_identity_snapshot(payload: dict[str, Any]) -> None:
    expected_top = {
        "schema_version", "generated_at", "scope", "documents",
        "relationship_suggestions", "count_summary", "automatic_merges",
        "independent_attestation_claim", "snapshot_fingerprint",
    }
    if set(payload) != expected_top:
        raise ValueError("Source identity snapshot fields are invalid")
    if payload.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("Unsupported source identity schema")
    if payload.get("automatic_merges") is not False or payload.get("independent_attestation_claim") is not False:
        raise ValueError("Source identity must not claim automatic merges or independent attestation")
    fingerprint = payload.get("snapshot_fingerprint")
    if not valid_fingerprint(fingerprint) or canonical_fingerprint(_stable_snapshot(payload)) != fingerprint:
        raise ValueError("Source identity snapshot fingerprint does not bind its content")
    documents = payload.get("documents") or []
    if not isinstance(documents, list):
        raise ValueError("Source identity documents must be a list")
    doc_ids = [row.get("doc_id") for row in documents if isinstance(row, dict)]
    if len(doc_ids) != len(documents):
        raise ValueError("Source identity documents contain an invalid row")
    if len(doc_ids) != len(set(doc_ids)) or any(
        not isinstance(value, str)
        or not value
        or value in {".", ".."}
        or "/" in value
        or "\\" in value
        or any(ord(char) < 32 for char in value)
        for value in doc_ids
    ):
        raise ValueError("Source identity document ids are missing or duplicated")
    scope = payload.get("scope") or {}
    if set(scope) != {"doc_ids", "is_complete_corpus"} or scope.get("doc_ids") != doc_ids:
        raise ValueError("Source identity scope does not match its documents")
    completeness = scope.get("is_complete_corpus")
    if not isinstance(completeness, bool):
        raise ValueError("Source identity scope completeness is invalid")
    for document in documents:
        if set(document) != {
            "doc_id", "fields", "candidate_document_family_id",
            "family_resolution_state", "input_fingerprint",
        }:
            raise ValueError("Source identity document fields are invalid")
        if document.get("candidate_document_family_id") != "" or document.get("family_resolution_state") != "unreviewed":
            raise ValueError("Derived identity snapshots cannot contain researcher family decisions")
        fields = document.get("fields")
        if not isinstance(fields, dict):
            raise ValueError("Source identity document fields are invalid")
        expected_document_fingerprint = canonical_fingerprint({
            "doc_id": document["doc_id"],
            "fields": fields,
        })
        if document.get("input_fingerprint") != expected_document_fingerprint:
            raise ValueError("Source identity document fingerprint does not bind its fields")
        for field_name, field in fields.items():
            if not isinstance(field, dict) or not isinstance(field.get("candidates"), list):
                raise ValueError("Source identity field candidates are invalid")
            recomputed = _resolve(field["candidates"])
            if field != recomputed:
                raise ValueError(f"Source identity field resolution is not reproducible: {field_name}")
            for candidate in field["candidates"]:
                if set(candidate) != {
                    "value", "normalized_value", "source_file", "json_pointer",
                    "source_kind", "confidence", "priority",
                }:
                    raise ValueError("Source identity candidate fields are invalid")
                pointer = candidate.get("json_pointer")
                source_kind = candidate.get("source_kind")
                if (
                    not isinstance(pointer, str)
                    or not pointer.startswith("/")
                    or any(ord(char) < 32 for char in pointer)
                    or re.search(r"~(?![01])", pointer)
                ):
                    raise ValueError("Source identity candidate has an unsafe JSON pointer")
                if source_kind not in _PRIORITY or candidate.get("priority") != _PRIORITY[source_kind]:
                    raise ValueError("Source identity candidate provenance priority is invalid")
                if field_name == "canonical_url" and candidate.get("normalized_value") != _safe_web_url(candidate.get("value")):
                    raise ValueError("Source identity candidate has an unsafe canonical URL")
    relations = payload.get("relationship_suggestions") or []
    if not isinstance(relations, list):
        raise ValueError("Source identity relationships must be a list")
    for relation in relations:
        if relation.get("relationship") not in RELATIONSHIP_TYPES or relation.get("status") != "pending":
            raise ValueError("Source relationship suggestion is invalid")
        if relation.get("affects_family_counts") is not False:
            raise ValueError("Unreviewed source relationship cannot affect family counts")
        if relation.get("source_doc_id") not in doc_ids or relation.get("target_doc_id") not in doc_ids:
            raise ValueError("Source relationship references an unknown document")
    if relations != propose_relationships(documents):
        raise ValueError("Source identity relationships are not reproducible from resolved evidence")
    if payload.get("count_summary") != summarize_identity_counts(documents, relations):
        raise ValueError("Source identity counts are not reproducible")


def write_identity_snapshot(payload: dict[str, Any], exports_dir: Path) -> Path:
    validate_identity_snapshot(payload)
    exports_dir = Path(exports_dir)
    if exports_dir.is_symlink():
        raise ValueError("Source identity export directory cannot be a symlink")
    root = exports_dir / "review" / "source_identity"
    for candidate in (exports_dir / "review", root):
        if candidate.is_symlink():
            raise ValueError("Source identity output path cannot contain a symlink")
    root.mkdir(parents=True, exist_ok=True)
    immutable = root / f"source_identity_{payload['snapshot_fingerprint']}.json"
    latest = root / "latest_source_identity.json"
    if immutable.is_symlink() or latest.is_symlink():
        raise ValueError("Source identity output file cannot be a symlink")
    if immutable.exists():
        stored = _read_json(immutable, max_bytes=MAX_IDENTITY_SNAPSHOT_BYTES)
        if stored != payload and _stable_snapshot(stored) != _stable_snapshot(payload):
            raise ValueError("Source identity snapshot path collision")
    else:
        atomic_write_json(immutable, payload)
    atomic_write_json(latest, {
        "schema_version": "source-identity-latest-v1.0",
        "snapshot_fingerprint": payload["snapshot_fingerprint"],
        "snapshot_file": immutable.name,
    })
    return immutable


def load_latest_identity_snapshot(exports_dir: Path) -> dict[str, Any]:
    """Load the validated immutable snapshot named by the bounded latest manifest."""
    root = Path(exports_dir) / "review" / "source_identity"
    latest = root / "latest_source_identity.json"
    if root.is_symlink() or latest.is_symlink() or not latest.is_file():
        raise ValueError("No safe latest source identity snapshot is available")
    manifest = _read_json(latest)
    filename = str(manifest.get("snapshot_file") or "")
    fingerprint = str(manifest.get("snapshot_fingerprint") or "")
    expected = f"source_identity_{fingerprint}.json"
    if (
        manifest.get("schema_version") != "source-identity-latest-v1.0"
        or not valid_fingerprint(fingerprint) or filename != expected
    ):
        raise ValueError("Latest source identity manifest is invalid")
    path = root / filename
    if path.is_symlink() or not path.is_file():
        raise ValueError("Latest source identity snapshot file is unsafe or missing")
    if path.stat().st_size > MAX_IDENTITY_SNAPSHOT_BYTES:
        raise ValueError("Latest source identity snapshot exceeds the bounded 256 MiB limit")
    payload = _read_json(path, max_bytes=MAX_IDENTITY_SNAPSHOT_BYTES)
    validate_identity_snapshot(payload)
    if payload.get("snapshot_fingerprint") != fingerprint:
        raise ValueError("Latest source identity manifest does not bind its snapshot")
    return payload
