"""Bounded, deterministic research Review Packs.

Review Packs compose existing local evidence. They do not call models, mutate
the corpus, alter review decisions, or publish to remote services.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .archive_summary import build_archive_summary, read_json_safe
from .atomic_io import atomic_write_json, atomic_write_text
from .batch_outcome import validate_batch_outcome
from .workflow_integrity import (
    canonical_fingerprint,
    valid_fingerprint,
    write_immutable_snapshot,
    write_immutable_text_snapshot,
)
from .citation_units import attach_locators_to_enrichment_payload, citation_summary


LEGACY_SCHEMA_VERSION = "codex-review-pack-v1.1"
SCHEMA_VERSION = "codex-review-pack-v1.2"
DEFAULT_QUESTIONS = [
    "Which findings are strongly supported by exact, located evidence?",
    "Which classifications or proposals conflict, remain uncertain, or need specialist attention?",
    "Which recurring concepts merit later lexicon or registry consolidation?",
    "What should remain visibly AI-generated and provisional?",
]
ENRICHMENT_FAMILIES = (
    "lexicon_proposals",
    "entity_proposals",
    "tactic_proposals",
    "practice_descriptions",
    "statistical_claims",
    "ingestion_queue",
    "corpus_connections",
)
SPECIALIST_FILES = (
    "legal_review.json",
    "testimony_review.json",
    "testimony_candidates.json",
    "testimony_candidate_reviews.json",
    "testimony_segments.json",
    "longform_quality.json",
    "longform_candidates.json",
    "longform_synthesis.json",
    "worker_report.json",
    "offload_import.json",
)
EVIDENCE_FIELDS = (
    "exact_quote", "evidence_quote", "harm_quote", "exact_description",
    "claim", "evidence", "source_cited",
)


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _slug(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.-]+", "-", value).strip("-") or "review-pack"


def _bounded(value: Any, *, string_limit: int = 6000, list_limit: int = 50) -> Any:
    if isinstance(value, str):
        return value if len(value) <= string_limit else value[:string_limit] + "… [truncated]"
    if isinstance(value, list):
        return [_bounded(item, string_limit=string_limit, list_limit=list_limit) for item in value[:list_limit]]
    if isinstance(value, dict):
        return {
            str(key): _bounded(item, string_limit=string_limit, list_limit=list_limit)
            for key, item in value.items()
        }
    return value


def _read_bounded_json_object(path: Path, *, max_bytes: int = 100 * 1024 * 1024) -> dict[str, Any]:
    path = Path(path)
    if not path.is_file() or path.is_symlink():
        raise ValueError(f"Review Pack source is not a safe regular file: {path}")
    if path.stat().st_size > max_bytes:
        raise ValueError(f"Review Pack source exceeds the bounded JSON size limit: {path}")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"Review Pack source is invalid JSON: {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise ValueError(f"Review Pack source must be a JSON object: {path}")
    return payload


def batch_outcome_binding(payload: dict[str, Any]) -> dict[str, Any]:
    """Bind a pack to the exact stored Batch Outcome content."""
    require_bound = isinstance(payload.get("workflow_binding"), dict)
    if payload.get("schema_version") in {"batch-outcome-v2.1", "batch-outcome-v2.2"}:
        validate_batch_outcome(payload, require_bound=require_bound)
    else:
        # Historical outcome exports predate the strict validator. Keep them
        # readable as review inputs, but never manufacture a workflow binding.
        items = payload.get("items")
        item_ids = [
            str(row.get("item_id") or "") for row in items or []
            if isinstance(row, dict)
        ]
        if (
            require_bound or not isinstance(items, list) or len(item_ids) != len(items)
            or not all(item_ids) or len(set(item_ids)) != len(item_ids)
        ):
            raise ValueError("Historical Batch Outcome items are malformed")
    return {
        "schema_version": str(payload.get("schema_version") or ""),
        "batch_id": str(payload.get("batch_id") or ""),
        "audit_id": str(payload.get("audit_id") or ""),
        "evidence_fingerprint": str(payload.get("evidence_fingerprint") or ""),
        "content_fingerprint": str(payload.get("content_fingerprint") or ""),
        "payload_fingerprint": canonical_fingerprint(payload),
    }


def _canonical_outcome_source_path(path: Path, payload: dict[str, Any]) -> Path:
    """Prefer the immutable audit snapshot over a replaceable latest projection."""
    path = Path(path).resolve()
    audit_id = str(payload.get("audit_id") or "")
    candidate = path.parent / "audits" / audit_id / "batch_outcome.json"
    if path.name == "latest_batch_outcome.json" and audit_id and candidate.is_file():
        candidate_payload = _read_bounded_json_object(candidate)
        if canonical_fingerprint(candidate_payload) != canonical_fingerprint(payload):
            raise ValueError("Latest Batch Outcome differs from its immutable audit snapshot")
        return candidate.resolve()
    return path


def _is_unresolved_outcome_item(item: dict[str, Any]) -> bool:
    return (
        item.get("primary_outcome") != "ordinary_ready"
        or any(
            str(route.get("status") or "") not in {"complete", "not_applicable"}
            for route in item.get("specialist_routes") or [] if isinstance(route, dict)
        )
    )


def _load_selection(
    *,
    outcome_path: Path | None,
    document_set_path: Path | None,
    doc_ids: list[str] | None,
) -> tuple[str, list[str], dict[str, dict], dict, dict[str, Any] | None]:
    supplied = sum(bool(value) for value in (outcome_path, document_set_path, doc_ids))
    if supplied != 1:
        raise ValueError("Provide exactly one of outcome_path, document_set_path, or doc_ids")
    item_outcomes: dict[str, dict] = {}
    source: dict[str, Any]
    source_outcome: dict[str, Any] | None = None
    if outcome_path:
        payload = _read_bounded_json_object(Path(outcome_path))
        outcome_binding = batch_outcome_binding(payload)
        canonical_source_path = _canonical_outcome_source_path(Path(outcome_path), payload)
        selected = []
        selected_items = []
        for item in payload["items"]:
            if not isinstance(item, dict) or not item.get("doc_id"):
                continue
            doc_id = str(item["doc_id"])
            selected.append(doc_id)
            selected_items.append({
                "item_id": str(item.get("item_id") or ""),
                "doc_id": doc_id,
            })
            item_outcomes[doc_id] = item
        if len(set(selected)) != len(selected):
            raise ValueError("Batch Outcome contains duplicate document identities")
        label = str(payload.get("batch_id") or Path(outcome_path).stem)
        source = {
            "kind": "batch_outcome",
            "path": str(canonical_source_path),
            "audit_id": str(payload.get("audit_id") or ""),
            "evidence_fingerprint": str(payload.get("evidence_fingerprint") or ""),
            "content_fingerprint": str(payload.get("content_fingerprint") or ""),
            "input_kind": str(payload.get("input_kind") or ""),
            "selected_items": selected_items,
            "workflow_binding": payload.get("workflow_binding"),
            "batch_outcome_binding": outcome_binding,
            "review_plan": payload.get("review_plan") if isinstance(payload.get("review_plan"), dict) else {},
            "provisional_memory": payload.get("provisional_memory") if isinstance(payload.get("provisional_memory"), dict) else {},
            "tag_projection": payload.get("tag_projection") if isinstance(payload.get("tag_projection"), dict) else {},
            "routed_holds": payload.get("routed_holds") if isinstance(payload.get("routed_holds"), list) else [],
            "unresolved_items": [
                item for item in payload["items"]
                if isinstance(item, dict) and _is_unresolved_outcome_item(item)
            ],
        }
        source_outcome = payload
    elif document_set_path:
        payload = read_json_safe(Path(document_set_path), None)
        values = payload.get("docIds") if isinstance(payload, dict) else None
        if not isinstance(values, list):
            values = payload.get("doc_ids") if isinstance(payload, dict) else None
        if not isinstance(values, list):
            raise ValueError(f"Invalid document set: {document_set_path}")
        selected = [str(value) for value in values if str(value).strip()]
        label = str(payload.get("name") or payload.get("set_name") or Path(document_set_path).stem)
        source = {
            "kind": "document_set", "path": str(Path(document_set_path).resolve()),
            "selected_items": [{"item_id": "", "doc_id": value} for value in selected],
            "workflow_binding": None, "batch_outcome_binding": None,
        }
    else:
        selected = [str(value) for value in (doc_ids or []) if str(value).strip()]
        label = "selected-documents"
        source = {
            "kind": "explicit_doc_ids", "path": "",
            "selected_items": [{"item_id": "", "doc_id": value} for value in selected],
            "workflow_binding": None, "batch_outcome_binding": None,
        }
    if len(set(selected)) != len(selected):
        raise ValueError("Selection contains duplicate document identities")
    return label, selected, item_outcomes, source, source_outcome


def _proposal_evidence(family: str, index: int, item: dict) -> list[dict]:
    rows = []
    locator_field = {
        "lexicon_proposals": "exact_quote",
        "entity_proposals": "evidence_quote",
        "tactic_proposals": "evidence_quote",
        "statistical_claims": "claim",
        "corpus_connections": "evidence",
    }.get(family, "")
    if family == "practice_descriptions":
        locator_field = "harm_quote" if str(item.get("harm_quote") or "").strip() else "exact_description"
    for field in EVIDENCE_FIELDS:
        text = str(item.get(field) or "").strip()
        if text:
            rows.append({
                "family": family,
                "proposal_index": index,
                "field": field,
                "quote": _bounded(text, string_limit=2500),
                "locator": (
                    item.get("evidence_locator")
                    if field == locator_field and isinstance(item.get("evidence_locator"), dict)
                    else {}
                ),
            })
    return rows


def _read_jsonl_bounded(path: Path, *, limit: int = 50) -> dict[str, Any]:
    rows = []
    total = 0
    try:
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                total += 1
                if len(rows) < limit:
                    try:
                        value = json.loads(line)
                    except json.JSONDecodeError:
                        value = {"unparsed": line.strip()}
                    rows.append(_bounded(value))
    except OSError:
        return {"total": 0, "included": 0, "rows": []}
    return {"total": total, "included": len(rows), "rows": rows}


def _document_packet(
    doc_id: str,
    corpus_dir: Path,
    item_outcome: dict,
    *,
    max_proposals_per_family: int,
) -> dict:
    doc_dir = Path(corpus_dir) / doc_id
    if not doc_dir.is_dir():
        return {
            "doc_id": doc_id,
            "local_path": str(doc_dir.resolve()),
            "missing": True,
            "batch_outcome": item_outcome,
        }
    summary = build_archive_summary(doc_dir)
    analysis = read_json_safe(doc_dir / "analysis.json", {})
    enrichment = read_json_safe(doc_dir / "enrichment.json", {})
    tag_projection = read_json_safe(doc_dir / "tag_projection.json", {})
    citation_units = read_json_safe(doc_dir / "citation_units.json", {})
    located = attach_locators_to_enrichment_payload(
        enrichment if isinstance(enrichment, dict) else {},
        citation_units if isinstance(citation_units, dict) else {},
    )
    families: dict[str, Any] = {}
    evidence: list[dict] = []
    for family in ENRICHMENT_FAMILIES:
        values = located.get(family) or []
        valid = [item for item in values if isinstance(item, dict)] if isinstance(values, list) else []
        selected = valid[:max_proposals_per_family]
        families[family] = {
            "total": len(valid),
            "included": len(selected),
            "omitted": max(0, len(valid) - len(selected)),
            "items": _bounded(selected),
        }
        for index, item in enumerate(selected):
            evidence.extend(_proposal_evidence(family, index, item))
    specialists = {
        filename.removesuffix(".json"): _bounded(read_json_safe(doc_dir / filename, {}))
        for filename in SPECIALIST_FILES
        if (doc_dir / filename).is_file()
    }
    for filename in ("testimony_segment_analyses.jsonl", "longform_section_analyses.jsonl"):
        if (doc_dir / filename).is_file():
            specialists[filename.removesuffix(".jsonl")] = _read_jsonl_bounded(doc_dir / filename)
    annotations_dir = doc_dir / "research_annotations"
    if annotations_dir.is_dir():
        specialists["research_annotations"] = {
            path.stem: _bounded(read_json_safe(path, {}))
            for path in sorted(annotations_dir.glob("*.json"))[:20]
        }
    return {
        "doc_id": doc_id,
        "missing": False,
        "local_path": str(doc_dir.resolve()),
        "source_url": str((summary.get("source") or {}).get("source_url") or ""),
        "archive_summary": summary,
        "analysis": _bounded(analysis if isinstance(analysis, dict) else {}),
        "enrichment": families,
        "tag_projection": _bounded(tag_projection if isinstance(tag_projection, dict) else {}),
        "evidence": evidence,
        "citations": citation_summary(citation_units if isinstance(citation_units, dict) else {}),
        "specialist_outputs": specialists,
        "batch_outcome": item_outcome,
    }


def _fingerprint_documents(documents: list[dict]) -> list[dict]:
    """Remove only compiler-time projections from otherwise complete evidence."""
    stable = json.loads(json.dumps(documents, ensure_ascii=False))
    for document in stable:
        summary = document.get("archive_summary")
        if isinstance(summary, dict):
            summary.pop("generated_at", None)
    return stable


def review_pack_stable_projection(pack: dict[str, Any]) -> dict[str, Any]:
    """Return every semantic field covered by the Review Pack content hash."""
    return {
        key: value for key, value in {
            "schema_version": pack.get("schema_version"),
            "label": pack.get("label"),
            "selection_source": pack.get("selection_source"),
            "workflow_binding": pack.get("workflow_binding"),
            "batch_outcome_binding": pack.get("batch_outcome_binding"),
            "document_count": pack.get("document_count"),
            "review_questions": pack.get("review_questions"),
            "privacy_mode": pack.get("privacy_mode"),
            "batch_exceptions": pack.get("batch_exceptions"),
            "documents": _fingerprint_documents(pack.get("documents") or []),
            "decision_boundary": pack.get("decision_boundary"),
            "sharing_policy": pack.get("sharing_policy"),
        }.items()
    }


def validate_review_pack(
    pack: dict[str, Any], *,
    expected_workflow_binding: dict[str, Any] | None = None,
    source_outcome: dict[str, Any] | None = None,
    require_bound: bool = False,
) -> None:
    """Fail closed on identity, source, privacy, and content-integrity drift."""
    if not isinstance(pack, dict) or pack.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("Unsupported Review Pack schema")
    expected_top_level = {
        "schema_version", "pack_id", "label", "generated_at",
        "evidence_fingerprint", "content_fingerprint", "selection_source",
        "workflow_binding", "batch_outcome_binding", "document_count",
        "review_questions", "privacy_mode", "batch_exceptions", "documents",
        "decision_boundary", "sharing_policy",
    }
    if set(pack) != expected_top_level:
        raise ValueError("Review Pack top-level fields differ from the v1.2 contract")
    documents = pack.get("documents")
    if not isinstance(documents, list) or not 1 <= len(documents) <= 15:
        raise ValueError("Review Pack must contain between 1 and 15 documents")
    doc_ids = [
        str(row.get("doc_id") or "") for row in documents if isinstance(row, dict)
    ]
    if (
        len(doc_ids) != len(documents) or not all(doc_ids)
        or len(set(doc_ids)) != len(doc_ids)
        or pack.get("document_count") != len(documents)
    ):
        raise ValueError("Review Pack document accounting is malformed")
    if pack.get("privacy_mode") not in {"private_local", "external_safe"}:
        raise ValueError("Review Pack privacy mode is unsupported")
    source = pack.get("selection_source")
    if not isinstance(source, dict):
        raise ValueError("Review Pack selection source is malformed")
    workflow_value = pack.get("workflow_binding")
    outcome_value = pack.get("batch_outcome_binding")
    if source.get("workflow_binding") != workflow_value:
        raise ValueError("Review Pack workflow binding differs from its selection source")
    if source.get("batch_outcome_binding") != outcome_value:
        raise ValueError("Review Pack Batch Outcome binding differs from its selection source")
    selected_items = source.get("selected_items")
    if not isinstance(selected_items, list):
        raise ValueError("Review Pack selected-item accounting is missing")
    selected_doc_ids = [
        str(row.get("doc_id") or "") for row in selected_items if isinstance(row, dict)
    ]
    if selected_doc_ids != doc_ids:
        raise ValueError("Review Pack document order differs from its selection source")
    source_kind = source.get("kind")
    if source_kind == "batch_outcome":
        if not isinstance(outcome_value, dict):
            raise ValueError("Outcome-based Review Pack lacks an exact Batch Outcome binding")
        source_items_by_identity: dict[tuple[str, str], dict[str, Any]] = {}
        if source_outcome is not None:
            source_items_by_identity = {
                (str(row.get("item_id") or ""), str(row.get("doc_id") or "")): row
                for row in source_outcome.get("items") or [] if isinstance(row, dict)
            }
        for selected, document in zip(selected_items, documents):
            embedded = document.get("batch_outcome") if isinstance(document, dict) else None
            if not isinstance(selected, dict) or not isinstance(embedded, dict):
                raise ValueError("Outcome-based Review Pack lacks embedded item evidence")
            if (
                str(embedded.get("item_id") or "") != str(selected.get("item_id") or "")
                or str(embedded.get("doc_id") or "") != str(selected.get("doc_id") or "")
            ):
                raise ValueError("Review Pack item identity differs from its Batch Outcome")
            if source_outcome is not None:
                source_item = source_items_by_identity.get((
                    str(selected.get("item_id") or ""), str(selected.get("doc_id") or ""),
                ))
                expected_item = (
                    _redact_local_paths(source_item)
                    if pack.get("privacy_mode") == "external_safe" else source_item
                )
                if source_item is None or embedded != expected_item:
                    raise ValueError("Review Pack embedded item differs from the exact Batch Outcome")
        expected_exceptions = [
            *(source.get("unresolved_items") or []), *(source.get("routed_holds") or []),
        ]
        if pack.get("batch_exceptions") != expected_exceptions:
            raise ValueError("Review Pack exception accounting differs from its Batch Outcome")
        if source_outcome is not None:
            if outcome_value != batch_outcome_binding(source_outcome):
                raise ValueError("Review Pack does not bind the supplied Batch Outcome bytes")
            if workflow_value != source_outcome.get("workflow_binding"):
                raise ValueError("Review Pack workflow binding differs from the Batch Outcome")
            expected_source = {
                "kind": "batch_outcome",
                "path": str(source.get("path") or ""),
                "audit_id": str(source_outcome.get("audit_id") or ""),
                "evidence_fingerprint": str(source_outcome.get("evidence_fingerprint") or ""),
                "content_fingerprint": str(source_outcome.get("content_fingerprint") or ""),
                "input_kind": str(source_outcome.get("input_kind") or ""),
                "selected_items": [
                    {"item_id": str(row.get("item_id") or ""), "doc_id": str(row.get("doc_id") or "")}
                    for row in source_outcome.get("items") or []
                    if isinstance(row, dict) and row.get("doc_id")
                ],
                "workflow_binding": source_outcome.get("workflow_binding"),
                "batch_outcome_binding": batch_outcome_binding(source_outcome),
                "review_plan": source_outcome.get("review_plan") if isinstance(source_outcome.get("review_plan"), dict) else {},
                "provisional_memory": source_outcome.get("provisional_memory") if isinstance(source_outcome.get("provisional_memory"), dict) else {},
                "tag_projection": source_outcome.get("tag_projection") if isinstance(source_outcome.get("tag_projection"), dict) else {},
                "routed_holds": source_outcome.get("routed_holds") if isinstance(source_outcome.get("routed_holds"), list) else [],
                "unresolved_items": [
                    row for row in source_outcome.get("items") or []
                    if isinstance(row, dict) and _is_unresolved_outcome_item(row)
                ],
            }
            expected_source = _privacy_source(expected_source, str(pack.get("privacy_mode") or ""))
            if source != expected_source:
                raise ValueError("Review Pack selection source differs from the exact Batch Outcome")
    elif source_kind in {"document_set", "explicit_doc_ids"}:
        if workflow_value is not None or outcome_value is not None:
            raise ValueError("Standalone Review Pack cannot claim workflow completion bindings")
    else:
        raise ValueError("Review Pack selection source kind is unsupported")
    if workflow_value is not None:
        if not isinstance(workflow_value, dict) or set(workflow_value) != {
            "workflow_batch_id", "workflow_fingerprint", "dispatch_fingerprint",
        }:
            raise ValueError("Review Pack workflow binding is malformed")
        if (
            not valid_fingerprint(workflow_value.get("workflow_fingerprint"))
            or not valid_fingerprint(workflow_value.get("dispatch_fingerprint"))
        ):
            raise ValueError("Review Pack workflow fingerprints are malformed")
    if require_bound and (source_kind != "batch_outcome" or workflow_value is None):
        raise ValueError("Review Pack is not bound to a workflow Batch Outcome")
    if expected_workflow_binding is not None and workflow_value != expected_workflow_binding:
        raise ValueError("Review Pack is not bound to the expected workflow")
    fingerprint = str(pack.get("content_fingerprint") or "")
    evidence_fingerprint = str(pack.get("evidence_fingerprint") or "")
    expected_fingerprint = canonical_fingerprint(review_pack_stable_projection(pack))
    if (
        not valid_fingerprint(fingerprint) or fingerprint != expected_fingerprint
        or evidence_fingerprint != fingerprint
    ):
        raise ValueError("Review Pack content fingerprint does not match stored content")
    expected_pack_id = f"{_slug(str(pack.get('label') or ''))}--{fingerprint[:12]}"
    if pack.get("pack_id") != expected_pack_id:
        raise ValueError("Review Pack ID is not bound to its content fingerprint")
    if pack.get("privacy_mode") == "external_safe":
        if _redact_local_paths(pack) != pack:
            raise ValueError("External-safe Review Pack still contains a local path")
        for document in documents:
            if document.get("local_path") or document.get("specialist_outputs"):
                raise ValueError("External-safe Review Pack contains private local material")
            outcome = document.get("batch_outcome") or {}
            sensitive = any(
                route.get("flag") in {"needs_testimony_review", "needs_legal_review"}
                for route in outcome.get("specialist_routes") or [] if isinstance(route, dict)
            )
            if sensitive and (
                document.get("analysis") != {
                    "withheld": True,
                    "reason": "Sensitive testimony/legal material omitted from external-safe pack.",
                }
                or document.get("enrichment") != {}
                or document.get("evidence") != []
                or document.get("source_url") != ""
            ):
                raise ValueError("External-safe Review Pack restored sensitive document content")


def _apply_privacy_mode(documents: list[dict], mode: str) -> list[dict]:
    if mode == "private_local":
        return documents
    protected = json.loads(json.dumps(documents, ensure_ascii=False))
    for document in protected:
        document["local_path"] = ""
        outcome = document.get("batch_outcome") or {}
        specialist_routes = outcome.get("specialist_routes") or []
        sensitive = any(
            route.get("flag") in {"needs_testimony_review", "needs_legal_review"}
            for route in specialist_routes if isinstance(route, dict)
        )
        if sensitive:
            document["analysis"] = {
                "withheld": True,
                "reason": "Sensitive testimony/legal material omitted from external-safe pack.",
            }
            document["enrichment"] = {}
            document["evidence"] = []
            document["specialist_outputs"] = {}
            document["source_url"] = ""
        else:
            document["specialist_outputs"] = {}
    return _redact_local_paths(protected)


def _redact_local_paths(value: Any, key: str = "") -> Any:
    from .privacy import redact_local_paths

    return redact_local_paths(value, key)


def _privacy_source(source: dict, mode: str) -> dict:
    if mode == "private_local":
        return source
    protected = json.loads(json.dumps(source, ensure_ascii=False))
    protected["path"] = ""
    for key in ("provisional_memory", "tag_projection"):
        if isinstance(protected.get(key), dict):
            protected[key]["path"] = ""
    for item in protected.get("routed_holds") or []:
        if isinstance(item, dict):
            item["url"] = ""
    return _redact_local_paths(protected)


def review_pack_markdown(pack: dict) -> str:
    lines = [
        f"# Codex Review Pack: {pack['label']}", "",
        f"Pack: `{pack['pack_id']}`  ",
        f"Generated: {pack['generated_at']}  ",
        f"Documents: {pack['document_count']}", "",
        f"Sharing mode: `{pack.get('privacy_mode', 'private_local')}`", "",
        f"> {pack.get('sharing_policy', '')}", "",
        "> This packet composes existing AI-assisted research artifacts. Proposals remain provisional; the packet does not approve, publish, or create canonical records.",
        "", "## Review questions", "",
    ]
    lines.extend(f"- {question}" for question in pack["review_questions"])
    if pack.get("batch_exceptions"):
        lines.extend(["", "## Batch exceptions and triage-held sources", ""])
        for item in pack["batch_exceptions"]:
            routes = ", ".join(
                str(route.get("route") or "") for route in item.get("specialist_routes") or []
                if isinstance(route, dict)
            )
            lines.append(
                f"- `{item.get('item_id', '')}` — {item.get('primary_outcome', 'routed hold')}"
                + (f"; routes: {routes}" if routes else "")
            )
    memory = (pack.get("selection_source") or {}).get("provisional_memory") or {}
    clusters = memory.get("clusters") or []
    if clusters:
        lines.extend(["", "## Provisional memory clusters", ""])
        for cluster in clusters[:25]:
            confidence = cluster.get("model_confidence_summary") or {}
            mean = confidence.get("mean")
            confidence_text = f"{mean:.2f}" if isinstance(mean, (int, float)) else "not reported"
            family_count = cluster.get("source_family_count")
            family_text = str(family_count) if isinstance(family_count, int) else "not resolved (incomplete review)"
            selected_count = cluster.get("reviewed_family_count_for_selected_scope")
            selected_text = f", reviewed families in selected scope={selected_count}" if isinstance(selected_count, int) else ""
            proxy_count = cluster.get("source_hostname_proxy_count")
            proxy_text = f", hostname proxy={proxy_count}" if isinstance(proxy_count, int) else ""
            lines.append(
                f"- **{cluster.get('preferred_draft_label')}** — `{cluster.get('trust_state')}`; "
                f"documents={cluster.get('document_count', 0)}, corpus source-family count={family_text}{selected_text}{proxy_text}, "
                f"located evidence={cluster.get('located_evidence_count', 0)}, model confidence mean={confidence_text}"
            )
    for doc in pack["documents"]:
        lines.extend(["", f"## {doc['doc_id']}", ""])
        if doc.get("missing"):
            lines.append(f"Local document directory is missing: `{doc['local_path']}`")
            continue
        profile = doc.get("archive_summary") or {}
        classification = profile.get("classification") or {}
        lines.extend([
            f"- Source: {doc.get('source_url') or '(no source URL recorded)'}",
            f"- Local path: `{doc['local_path']}`",
            f"- Type: {classification.get('type') or classification.get('primary_type') or 'unknown'}",
            f"- Processing outcome: {(doc.get('batch_outcome') or {}).get('primary_outcome', 'not supplied')}",
            f"- Review lane: {((doc.get('batch_outcome') or {}).get('review_assignment') or {}).get('lane', 'not supplied')}",
            "", "### Summary", "",
            str(classification.get("summary") or "No analysis summary recorded."),
        ])
        routes = (doc.get("batch_outcome") or {}).get("specialist_routes") or []
        if routes:
            lines.extend(["", "### Specialist routes", ""])
            lines.extend(
                f"- `{route.get('route')}` — {route.get('status')} ({route.get('reason')})"
                for route in routes
            )
        if doc.get("evidence"):
            lines.extend(["", "### Located evidence sample", ""])
            for row in doc["evidence"][:12]:
                locator = row.get("locator") or {}
                where = locator.get("unit_id") or locator.get("status") or "unlocated"
                lines.append(f"- **{row['family']} / {row['field']}** (`{where}`): {row['quote']}")
    lines.extend(["", "## Disclosure and decision boundary", "", pack["decision_boundary"], ""])
    return "\n".join(lines)


def _generate_review_pack_impl(
    corpus_dir: Path,
    out_root: Path,
    *,
    outcome_path: Path | None = None,
    document_set_path: Path | None = None,
    doc_ids: list[str] | None = None,
    review_questions: list[str] | None = None,
    max_documents: int = 15,
    max_proposals_per_family: int = 20,
    privacy_mode: str = "private_local",
) -> dict[str, Any]:
    """Generate or reuse one immutable Markdown + JSON Review Pack."""
    label, selected, outcomes, source, source_outcome = _load_selection(
        outcome_path=outcome_path,
        document_set_path=document_set_path,
        doc_ids=doc_ids,
    )
    # A Review Pack extends, but never mutates, a completed Phase 12
    # compilation. Legacy/document-set packs remain supported without
    # manufacturing a false compilation binding.
    compilation_context = None
    if outcome_path is not None:
        from .compilation_manifest import begin_compilation_attempt, load_latest_completed
        batch_id = str((source.get("batch_outcome_binding") or {}).get("batch_id") or "")
        exports_root = Path(out_root).parent
        previous_compilation = load_latest_completed(exports_root, batch_id) if batch_id else None
        if previous_compilation is not None:
            compilation_context = {
                "batch_id": batch_id,
                "exports_root": exports_root,
                "previous": previous_compilation,
                "attempt": begin_compilation_attempt(exports_root, batch_id, source="review_pack"),
            }
    limit = max(1, min(15, int(max_documents)))
    if len(selected) > limit:
        raise ValueError(f"Selection has {len(selected)} documents; Review Packs are bounded to {limit}")
    if not selected:
        raise ValueError("The selection contains no document IDs")
    questions = [str(q).strip() for q in (review_questions or DEFAULT_QUESTIONS) if str(q).strip()]
    if privacy_mode not in {"private_local", "external_safe"}:
        raise ValueError("privacy_mode must be private_local or external_safe")
    documents = [
        _document_packet(
            doc_id, Path(corpus_dir), outcomes.get(doc_id, {}),
            max_proposals_per_family=max(1, int(max_proposals_per_family)),
        )
        for doc_id in selected
    ]
    documents = _apply_privacy_mode(documents, privacy_mode)
    source = _privacy_source(source, privacy_mode)
    pack = {
        "schema_version": SCHEMA_VERSION,
        "label": label,
        "selection_source": source,
        "workflow_binding": source.get("workflow_binding"),
        "batch_outcome_binding": source.get("batch_outcome_binding"),
        "document_count": len(documents),
        "review_questions": questions,
        "privacy_mode": privacy_mode,
        "batch_exceptions": [
            *(source.get("unresolved_items") or []),
            *(source.get("routed_holds") or []),
        ],
        "documents": documents,
        "decision_boundary": (
            "AI may cluster, summarize supplied evidence, and identify uncertainties. "
            "It must not silently approve, reject, merge, verify a public claim, or publish."
        ),
        "sharing_policy": (
            "Private local pack: may contain sensitive evidence and absolute paths; do not share externally without review."
            if privacy_mode == "private_local" else
            "External-safe pack: local paths and specialist outputs are removed; testimony/legal document contents are withheld."
        ),
    }
    fingerprint = canonical_fingerprint(review_pack_stable_projection(pack))
    pack_id = f"{_slug(label)}--{fingerprint[:12]}"
    pack_dir = Path(out_root) / _slug(label) / "packs" / pack_id
    json_path = pack_dir / "review_pack.json"
    markdown_path = pack_dir / "review_pack.md"
    if json_path.is_file() and markdown_path.is_file():
        existing = _read_bounded_json_object(json_path)
        validate_review_pack(
            existing,
            expected_workflow_binding=source.get("workflow_binding"),
            source_outcome=source_outcome,
            require_bound=isinstance(source.get("workflow_binding"), dict),
        )
        if existing.get("content_fingerprint") != fingerprint:
            raise ValueError("Existing immutable Review Pack conflicts with current evidence")
        if markdown_path.is_symlink() or markdown_path.read_text(encoding="utf-8") != review_pack_markdown(existing):
            raise ValueError("Existing immutable Review Pack Markdown differs from validated JSON")
        result = {
            "pack": existing,
            "json_path": json_path,
            "markdown_path": markdown_path,
            "reused": True,
        }
        if compilation_context:
            result["compilation_manifest_path"] = _publish_review_pack_compilation(
                compilation_context, json_path, markdown_path,
            )["manifest_path"]
        return result
    pack.update({
        "pack_id": pack_id,
        "generated_at": _now(),
        "evidence_fingerprint": fingerprint,
        "content_fingerprint": fingerprint,
    })
    validate_review_pack(
        pack,
        expected_workflow_binding=source.get("workflow_binding"),
        source_outcome=source_outcome,
        require_bound=isinstance(source.get("workflow_binding"), dict),
    )
    markdown = review_pack_markdown(pack)
    stored = write_immutable_snapshot(json_path, pack, label="Review Pack")
    validate_review_pack(
        stored,
        expected_workflow_binding=source.get("workflow_binding"),
        source_outcome=source_outcome,
        require_bound=isinstance(source.get("workflow_binding"), dict),
    )
    pack = stored
    markdown = review_pack_markdown(pack)
    if markdown_path.exists() and (
        not markdown_path.is_file() or markdown_path.is_symlink()
        or markdown_path.read_text(encoding="utf-8") != markdown
    ):
        raise ValueError("Existing immutable Review Pack Markdown conflicts with validated JSON")
    write_immutable_text_snapshot(markdown_path, markdown, label="Review Pack Markdown")
    latest_dir = Path(out_root) / _slug(label)
    atomic_write_json(latest_dir / "latest_review_pack.json", pack)
    atomic_write_text(latest_dir / "latest_review_pack.md", markdown)
    result = {"pack": pack, "json_path": json_path, "markdown_path": markdown_path, "reused": False}
    if compilation_context:
        result["compilation_manifest_path"] = _publish_review_pack_compilation(
            compilation_context, json_path, markdown_path,
        )["manifest_path"]
    return result


def _publish_review_pack_compilation(
    context: dict[str, Any], json_path: Path, markdown_path: Path,
) -> dict[str, Any]:
    """Publish a new manifest containing prior base artifacts plus this pack."""
    from .compilation_manifest import publish_completed_compilation

    previous = context["previous"]
    artifacts = [
        (str(ref["kind"]), Path(str(ref["path"])))
        for ref in previous.get("artifacts") or []
        if ref.get("kind") not in {"review_pack_index", "review_pack_markdown"}
    ]
    artifacts.extend([
        ("review_pack_index", Path(json_path)),
        ("review_pack_markdown", Path(markdown_path)),
    ])
    return publish_completed_compilation(
        context["exports_root"],
        context["batch_id"],
        artifacts,
        source="review_pack",
        previous_manifest=previous,
        attempt_id=context["attempt"]["attempt_id"],
    )


def generate_review_pack(
    corpus_dir: Path,
    out_root: Path,
    *,
    outcome_path: Path | None = None,
    document_set_path: Path | None = None,
    doc_ids: list[str] | None = None,
    review_questions: list[str] | None = None,
    max_documents: int = 15,
    max_proposals_per_family: int = 20,
    privacy_mode: str = "private_local",
) -> dict[str, Any]:
    """Generate a pack and mark any Phase 12 pre-commit failure abandoned."""
    try:
        return _generate_review_pack_impl(
            corpus_dir, out_root, outcome_path=outcome_path,
            document_set_path=document_set_path, doc_ids=doc_ids,
            review_questions=review_questions, max_documents=max_documents,
            max_proposals_per_family=max_proposals_per_family,
            privacy_mode=privacy_mode,
        )
    except Exception as exc:
        from .compilation_manifest import abandon_active_compilation
        abandon_active_compilation(exc)
        raise
