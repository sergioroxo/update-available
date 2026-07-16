"""Bounded, read-only dependency snapshots and change-impact previews.

Phase 10A deliberately stops before execution.  It fingerprints the current
local evidence for one exact <=15-item workflow and answers a hypothetical
question: *if this declared input or method changed, what would need attention?*
It never changes an artifact's authoritative validator status, runs a command,
contacts a model/remote service, or schedules a rerun.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .batch_outcome import validate_batch_outcome
from .input_receipt import validate_input_receipt
from .review_pack import validate_review_pack
from .specialist_dispatch import validate_dispatch_plan
from .workflow_batch import validate_workflow_manifest
from .workflow_integrity import canonical_fingerprint, valid_fingerprint


SNAPSHOT_SCHEMA_VERSION = "dependency-snapshot-v1.0"
PREVIEW_SCHEMA_VERSION = "impact-preview-v1.0"
GRAPH_VERSION = "research-dependency-graph-v1.0"
MAX_WORKFLOW_ITEMS = 15
MAX_FILES_PER_DOCUMENT = 80
MAX_FILE_BYTES = 100 * 1024 * 1024

NODES = (
    "acquisition", "preservation", "extraction", "citation_units",
    "analysis", "enrichment", "embedding", "specialist", "second_opinion",
    "provisional_memory", "tag_projection", "draft_review", "compilation",
    "review_pack", "review_dossier", "decision_projection", "sanity_upload",
    "supabase_reconciliation", "public_release",
)

# This is a dependency graph, not an execution order.  Memory is intentionally
# one-way: an enrichment run contributes to the *next* memory projection.  A
# prior memory snapshot used by a run is represented by a declared scenario,
# avoiding an enrichment <-> memory cycle.
EDGES = (
    ("acquisition", "preservation"),
    ("acquisition", "extraction"),
    ("extraction", "citation_units"),
    ("extraction", "analysis"),
    ("extraction", "embedding"),
    ("extraction", "specialist"),
    ("citation_units", "specialist"),
    ("citation_units", "second_opinion"),
    ("citation_units", "provisional_memory"),
    ("analysis", "enrichment"),
    ("analysis", "specialist"),
    ("analysis", "second_opinion"),
    ("analysis", "provisional_memory"),
    ("analysis", "tag_projection"),
    ("enrichment", "specialist"),
    ("enrichment", "provisional_memory"),
    ("enrichment", "draft_review"),
    ("specialist", "compilation"),
    ("second_opinion", "compilation"),
    ("provisional_memory", "tag_projection"),
    ("provisional_memory", "compilation"),
    ("tag_projection", "compilation"),
    ("draft_review", "compilation"),
    ("compilation", "review_pack"),
    ("compilation", "review_dossier"),
    ("compilation", "sanity_upload"),
    ("compilation", "supabase_reconciliation"),
    ("compilation", "public_release"),
    ("review_pack", "public_release"),
    ("review_dossier", "decision_projection"),
    ("sanity_upload", "public_release"),
    ("supabase_reconciliation", "public_release"),
)

SCENARIOS: dict[str, dict[str, Any]] = {
    "extraction_bytes": {
        "label": "Extracted text or extraction changed",
        "roots": ("extraction",),
        "direct_class": "directly_changed",
        "downstream_class": "would_become_stale",
        "action": "Create a selective fresh plan after inspecting this preview.",
    },
    "analysis_prompt_or_model": {
        "label": "Analysis prompt, model, ontology, or method changed",
        "roots": ("analysis",),
        "direct_class": "would_require_revalidation",
        "downstream_class": "conditional_downstream",
        "action": "Consider a selective Analysis re-audit; do not relabel the historical run invalid.",
    },
    "analysis_output": {
        "label": "Analysis output bytes were edited or replaced",
        "roots": ("analysis",),
        "direct_class": "directly_changed",
        "downstream_class": "would_become_stale",
        "action": "Revalidate Enrichment and rebuild only bound downstream research artifacts.",
    },
    "enrichment_prompt_or_model": {
        "label": "Enrichment prompt or model changed",
        "roots": ("enrichment",),
        "direct_class": "would_require_revalidation",
        "downstream_class": "conditional_downstream",
        "action": "Consider a selective Enrichment re-audit; preserve the historical result.",
    },
    "lexicon_input": {
        "label": "Canonical lexicon input changed",
        "roots": ("analysis", "enrichment"),
        "direct_class": "would_require_revalidation",
        "downstream_class": "conditional_downstream",
        "action": "Re-audit consequential documents against the new lexicon snapshot first.",
    },
    "provisional_memory_input": {
        "label": "Provisional memory context changed",
        "roots": ("enrichment", "provisional_memory"),
        "direct_class": "would_require_revalidation",
        "downstream_class": "conditional_downstream",
        "action": "Inspect selected memory evidence before choosing an Enrichment re-audit.",
        "outside_scope_fanout": "unknown",
    },
    "tag_registry_input": {
        "label": "Tag-registry matching input changed",
        "roots": ("enrichment",),
        "direct_class": "would_require_revalidation",
        "downstream_class": "conditional_downstream",
        "action": "Recheck tag matching for consequential documents only.",
    },
    "enrichment_output": {
        "label": "Enrichment proposals or review sidecar changed",
        "roots": ("enrichment",),
        "direct_class": "directly_changed",
        "downstream_class": "would_become_stale",
        "action": "Rebuild memory, tag projection, compiler, and review artifacts for this scope.",
        "outside_scope_fanout": "unknown",
    },
    "embedding_model": {
        "label": "Embedding model or method changed",
        "roots": ("embedding",),
        "direct_class": "would_require_revalidation",
        "downstream_class": "conditional_downstream",
        "action": "Re-embed only documents selected for the new semantic-search index.",
    },
    "specialist_evidence": {
        "label": "Specialist evidence changed",
        "roots": ("specialist",),
        "direct_class": "directly_changed",
        "downstream_class": "would_become_stale",
        "action": "Recompile the bound outcome after the specialist result is validated.",
    },
    "second_opinion_evidence": {
        "label": "Second-opinion evidence changed",
        "roots": ("second_opinion",),
        "direct_class": "directly_changed",
        "downstream_class": "would_become_stale",
        "action": "Recompile the bound outcome after the second opinion is validated.",
    },
    "batch_outcome_policy": {
        "label": "Batch Outcome policy changed",
        "roots": ("compilation",),
        "direct_class": "would_require_revalidation",
        "downstream_class": "conditional_downstream",
        "action": "Preview and compile a new version; preserve the earlier outcome and packs.",
    },
    "publication_policy": {
        "label": "Publication or disclosure policy changed",
        "roots": ("public_release",),
        "direct_class": "would_require_revalidation",
        "downstream_class": "unaffected",
        "action": "Recheck publication readiness; public release remains researcher-owned.",
    },
    "dossier_decision_event": {
        "label": "A dossier decision was added",
        "roots": ("decision_projection",),
        "direct_class": "directly_changed",
        "downstream_class": "unaffected",
        "action": "Refresh the Review Inbox decision head; do not rerun Analysis or Enrichment.",
    },
}

_PROVENANCE_FIELDS = (
    "llm_flag", "model", "resolved_model", "model_parameters", "prompt_version",
    "prompt_sha256", "prompt_template_sha256", "git_commit", "ontology_version",
    "lexicon_terms_available", "lexicon_terms_injected", "lexicon_terms_sanity",
    "lexicon_terms_seed", "lexicon_terms_legacy", "provisional_memory_fingerprint",
    "provisional_memory_clusters_injected", "provisional_memory_cluster_ids",
    "tag_registry_fingerprint",
    "policy_fingerprint", "lexicon_fingerprint", "input_receipt",
    "whole_doc_input_receipt", "chunked", "chunks",
)

_SAFE_RECEIPT_FIELDS = (
    "schema_version", "stage", "extracted_text_sha256", "extracted_text_chars",
    "system_input_sha256", "system_input_chars", "user_input_sha256",
    "user_input_chars", "resolved_model", "routing_model_alias",
    "provider_resolved_model", "model_identity_scope", "model_parameters_sha256",
    "dependencies", "exact", "request_sha256", "chunk_count",
    "successful_chunk_count", "failed_chunk_count", "contributing_request_sha256",
    "coverage",
)


def _safe_label(value: Any, limit: int = 200) -> str:
    """Bound historical free text before it enters a shareable snapshot."""
    return " ".join(str(value or "").split())[:limit]


def _safe_receipt_projection(value: Any) -> dict[str, Any]:
    """Expose receipt identity fields, never arbitrary stored parameters/text."""
    if not isinstance(value, dict):
        return {}
    projected = {key: value[key] for key in _SAFE_RECEIPT_FIELDS if key in value}
    for key in (
        "resolved_model", "routing_model_alias", "provider_resolved_model",
        "model_identity_scope", "schema_version", "stage", "coverage",
    ):
        if key in projected:
            projected[key] = _safe_label(projected[key])
    return projected


def _safe_chunk_projection(value: Any) -> list[dict[str, Any]]:
    """Strip legacy chunk errors that could contain historical response excerpts."""
    if not isinstance(value, list):
        return []
    rows: list[dict[str, Any]] = []
    for raw in value:
        if not isinstance(raw, dict):
            continue
        row = {
            key: raw.get(key)
            for key in (
                "index", "char_count", "succeeded", "validation_path",
                "validation_attempts", "normalization_repairs",
            )
        }
        row["model"] = _safe_label(raw.get("model"))
        row["input_receipt"] = _safe_receipt_projection(raw.get("input_receipt"))
        row["error"] = "model_attempt_failed" if raw.get("error") else None
        rows.append(row)
    return rows


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def scenario_options() -> list[tuple[str, str]]:
    return [(key, str(value["label"])) for key, value in SCENARIOS.items()]


def _safe_doc_id(value: Any) -> str:
    doc_id = str(value or "")
    if doc_id and (
        doc_id != doc_id.strip() or doc_id in {".", ".."} or "\x00" in doc_id
        or Path(doc_id).is_absolute() or "/" in doc_id or "\\" in doc_id
        or ".." in Path(doc_id).parts
    ):
        raise ValueError("Dependency snapshot doc_id is unsafe")
    return doc_id


def _file_identity(path: Path) -> tuple[int, int, int, int, int, int]:
    stat = path.lstat()
    if path.is_symlink() or not path.is_file():
        raise ValueError(f"Dependency evidence is not a regular local file: {path.name}")
    if stat.st_size > MAX_FILE_BYTES:
        raise ValueError(f"Dependency evidence exceeds the per-file bound: {path.name}")
    return (stat.st_dev, stat.st_ino, stat.st_mode, stat.st_size, stat.st_mtime_ns, stat.st_ctime_ns)


def _hash_file(path: Path) -> dict[str, Any]:
    before = _file_identity(path)
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    after = _file_identity(path)
    if before != after:
        raise ValueError(f"Dependency evidence changed while being fingerprinted: {path.name}; refresh the preview")
    return {"name": path.name, "size": before[3], "sha256": digest.hexdigest()}


def _bounded_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    before = _file_identity(path)
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"Cannot read dependency provenance {path.name}: {exc}") from exc
    after = _file_identity(path)
    if before != after:
        raise ValueError(
            f"Dependency provenance changed while being read: {path.name}; refresh the preview"
        )
    if not isinstance(payload, dict):
        raise ValueError(f"Dependency provenance is not an object: {path.name}")
    return payload


def _stage_snapshot(
    doc_dir: Path, stage_id: str, stage: dict[str, Any],
    *, specialist_routes: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    names: list[str] = []
    route_bindings = []
    for route in specialist_routes or []:
        route_evidence = [str(value) for value in route.get("evidence") or []]
        route_dependencies = [str(value) for value in route.get("dependencies") or []]
        route_bindings.append({
            "route": str(route.get("stage_id") or ""),
            "observed_status": str(route.get("status") or "unknown"),
            "evidence": route_evidence,
            "dependencies": route_dependencies,
        })
    declared_names = [*(stage.get("dependencies") or []), *(stage.get("evidence") or [])]
    for route in route_bindings:
        declared_names.extend(route["dependencies"])
        declared_names.extend(route["evidence"])
    for value in declared_names:
        name = str(value or "")
        if not name or Path(name).name != name or name in names:
            continue
        names.append(name)
    if len(names) > MAX_FILES_PER_DOCUMENT:
        raise ValueError(f"Dependency evidence file count exceeds the bound for {doc_dir.name}")
    files = [_hash_file(doc_dir / name) for name in names if (doc_dir / name).exists()]
    provenance: dict[str, Any] = {}
    if stage_id in {"analysis", "enrichment"}:
        audit = _bounded_json(doc_dir / f"{stage_id}_audit.json")
        provenance = {key: audit[key] for key in _PROVENANCE_FIELDS if key in audit}
    if stage_id == "embedding":
        embedding = _bounded_json(doc_dir / "embedding.json")
        provenance = {
            key: embedding[key] for key in ("model", "embedding_model", "dimension")
            if key in embedding
        }
    if stage_id == "citation_units":
        citation = _bounded_json(doc_dir / "citation_units.json")
        provenance = {
            key: citation[key] for key in ("schema_version", "text_sha256", "unit_count", "char_count")
            if key in citation
        }
    receipt = provenance.get("input_receipt") if isinstance(provenance.get("input_receipt"), dict) else {}
    receipt_validation: dict[str, Any] = {
        "valid": False,
        "exact": False,
        "reason": "No producer-side input receipt was recorded.",
    }
    if stage_id in {"analysis", "enrichment"} and receipt:
        top_level_dependencies = {
            "lexicon_fingerprint": provenance.get("lexicon_fingerprint"),
            "provisional_memory_fingerprint": (
                provenance.get("provisional_memory_fingerprint")
                if stage_id == "enrichment"
                else canonical_fingerprint({
                    "used": False,
                    "reason": "provisional memory is not an Analysis input",
                })
            ),
            "tag_registry_fingerprint": provenance.get("tag_registry_fingerprint"),
            "policy_fingerprint": provenance.get("policy_fingerprint"),
        }
        try:
            receipt_validation = validate_input_receipt(
                receipt,
                expected_stage=stage_id,
                top_level_dependencies=top_level_dependencies,
                chunk_entries=(provenance.get("chunks") if provenance.get("chunked") is True else None),
            )
        except (TypeError, ValueError) as exc:
            receipt_validation = {
                "valid": False,
                "exact": False,
                "schema_version": str(receipt.get("schema_version") or "unknown"),
                "reason": str(exc)[:300],
            }
    # Validation above uses the complete bounded audit.  The shareable snapshot
    # retains only receipt identities and sanitized chunk evidence, ensuring
    # historical pre-10B error excerpts cannot be propagated or fingerprinted.
    if stage_id in {"analysis", "enrichment"}:
        if "input_receipt" in provenance:
            provenance["input_receipt"] = _safe_receipt_projection(provenance["input_receipt"])
        if "whole_doc_input_receipt" in provenance:
            provenance["whole_doc_input_receipt"] = _safe_receipt_projection(
                provenance["whole_doc_input_receipt"]
            )
        if "chunks" in provenance:
            provenance["chunks"] = _safe_chunk_projection(provenance["chunks"])
        for key in ("model", "resolved_model", "llm_flag"):
            if key in provenance:
                provenance[key] = _safe_label(provenance[key])
    if stage_id == "citation_units" and provenance.get("text_sha256"):
        coverage = "exact"
    elif stage_id in {"analysis", "enrichment"} and receipt_validation.get("valid") is True:
        coverage = "exact"
    elif stage_id in {"analysis", "enrichment", "embedding"}:
        coverage = "partial" if provenance else "unknown"
    elif files:
        coverage = "current_bytes_only"
    else:
        coverage = "unknown"
    stable = {
        "stage_id": stage_id,
        "observed_status": str(stage.get("status") or "unknown"),
        "freshness_authority": str(stage.get("authority") or "unknown"),
        "freshness_is_heuristic": stage.get("fresh") is not None and stage_id not in {"citation_units"},
        "files": files,
        "specialist_route_bindings": route_bindings,
        "recorded_provenance": provenance,
        "input_receipt_validation": receipt_validation,
        "provenance_coverage": coverage,
    }
    return {**stable, "evidence_fingerprint": canonical_fingerprint(stable)}


def _is_acyclic() -> bool:
    incoming = {node: 0 for node in NODES}
    adjacency = {node: [] for node in NODES}
    for source, target in EDGES:
        adjacency[source].append(target)
        incoming[target] += 1
    ready = [node for node, count in incoming.items() if count == 0]
    visited = 0
    while ready:
        node = ready.pop()
        visited += 1
        for target in adjacency[node]:
            incoming[target] -= 1
            if incoming[target] == 0:
                ready.append(target)
    return visited == len(NODES)


def build_dependency_snapshot(
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    corpus_dir: Path,
    *,
    processing_projection: dict[str, Any],
    outcome: dict[str, Any] | None = None,
    review_pack: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Capture bounded current evidence without mutating or locking ingestion."""
    validate_workflow_manifest(workflow)
    validate_dispatch_plan(dispatch, workflow, corpus_dir=Path(corpus_dir), verify_current_base_status=False)
    if not _is_acyclic():
        raise RuntimeError("Dependency graph contains a cycle")
    if len(workflow.get("items") or []) > MAX_WORKFLOW_ITEMS:
        raise ValueError("Dependency preview is limited to 15 workflow items")
    if (
        processing_projection.get("workflow_batch_id") != workflow.get("workflow_batch_id")
        or processing_projection.get("workflow_fingerprint") != workflow.get("evidence_fingerprint")
        or processing_projection.get("dispatch_fingerprint") != dispatch.get("evidence_fingerprint")
        or processing_projection.get("read_only") is not True
    ):
        raise ValueError("Processing projection is not exactly bound to the selected workflow")
    projection_fingerprint = str(processing_projection.get("projection_fingerprint") or "")
    projection_stable = {
        key: value for key, value in processing_projection.items()
        if key not in {"verified_at", "projection_fingerprint"}
    }
    if (
        not valid_fingerprint(projection_fingerprint)
        or projection_fingerprint != canonical_fingerprint(projection_stable)
    ):
        raise ValueError("Processing projection fingerprint does not match its content")
    projection_items = processing_projection.get("items")
    workflow_items = workflow.get("items") or []
    dispatch_items = dispatch.get("items") or []
    if not isinstance(projection_items, list) or len(projection_items) != len(workflow_items):
        raise ValueError("Processing projection does not account for every frozen workflow item")
    for ordinal, (projected, workflow_item, dispatch_item) in enumerate(
        zip(projection_items, workflow_items, dispatch_items), start=1
    ):
        if not isinstance(projected, dict) or (
            projected.get("queue_item_id") != workflow_item.get("queue_item_id")
            or str(projected.get("doc_id") or "") != str(dispatch_item.get("doc_id") or "")
        ):
            raise ValueError(
                f"Processing projection row {ordinal} differs from the frozen workflow/dispatch identity"
            )
    expected_binding = {
        "workflow_batch_id": workflow["workflow_batch_id"],
        "workflow_fingerprint": workflow["evidence_fingerprint"],
        "dispatch_fingerprint": dispatch["evidence_fingerprint"],
    }
    if outcome is not None:
        validate_batch_outcome(
            outcome, workflow=workflow, dispatch=dispatch,
            corpus_dir=Path(corpus_dir), require_bound=True,
        )
    if review_pack is not None:
        validate_review_pack(
            review_pack, expected_workflow_binding=expected_binding,
            source_outcome=outcome, require_bound=True,
        )

    corpus_dir = Path(corpus_dir)
    seen: set[str] = set()
    items = []
    for row in projection_items:
        doc_id = _safe_doc_id(row.get("doc_id"))
        if doc_id and doc_id in seen:
            raise ValueError("Dependency preview refuses duplicate corpus document links")
        if doc_id:
            seen.add(doc_id)
        doc_dir = corpus_dir / doc_id if doc_id else corpus_dir / "__unlinked__"
        if doc_id and doc_dir.exists() and (not doc_dir.is_dir() or doc_dir.is_symlink()):
            raise ValueError(f"Dependency document directory is unsafe: {doc_id}")
        stage_snapshots = {}
        if row.get("linkage_state") == "linked":
            stage_snapshots = {
                stage_id: _stage_snapshot(
                    doc_dir, stage_id, stage,
                    specialist_routes=(row.get("specialist_routes") or []) if stage_id == "specialist" else None,
                )
                for stage_id, stage in (row.get("stages") or {}).items()
                if stage_id in NODES
            }
        items.append({
            "queue_item_id": str(row.get("queue_item_id") or ""),
            "doc_id": doc_id,
            "title": str(row.get("title") or ""),
            "linkage_state": str(row.get("linkage_state") or "unknown"),
            "stage_snapshots": stage_snapshots,
            "specialist_required": bool((row.get("stages") or {}).get("specialist", {}).get("required")),
            "specialist_route_ids": sorted(
                str(route.get("stage_id") or "")
                for route in (row.get("specialist_routes") or [])
                if str(route.get("stage_id") or "")
            ),
            "second_opinion_required": bool((row.get("stages") or {}).get("second_opinion", {}).get("required")),
        })

    stable = {
        "schema_version": SNAPSHOT_SCHEMA_VERSION,
        "graph_version": GRAPH_VERSION,
        "workflow_batch_id": workflow["workflow_batch_id"],
        "workflow_fingerprint": workflow["evidence_fingerprint"],
        "dispatch_fingerprint": dispatch["evidence_fingerprint"],
        "processing_projection_fingerprint": processing_projection.get("projection_fingerprint"),
        "outcome_fingerprint": str((outcome or {}).get("evidence_fingerprint") or ""),
        "review_pack_fingerprint": str((review_pack or {}).get("evidence_fingerprint") or ""),
        "nodes": list(NODES),
        "edges": [list(edge) for edge in EDGES],
        "items": items,
        "read_only": True,
        "execution_authorized": False,
        "automatic_rerun": False,
        "remote_checked": False,
        "historical_artifacts_preserved": True,
        "lineage_limit": (
            "Exact producer-side receipts are used only for new Analysis/Enrichment runs that bind "
            "extracted text, complete system/user inputs, model parameters, lexicon, memory, tag registry, "
            "and policy identities. Historical runs without a valid receipt remain partial or unknown."
        ),
        "unindexed_lineage": [
            "review dossier history and decision heads remain independently addressable in Phase 9B, "
            "but Phase 10A does not yet fingerprint those ledgers into this Processing Queue snapshot"
        ],
    }
    return {**stable, "captured_at": _now(), "evidence_fingerprint": canonical_fingerprint(stable)}


def validate_dependency_snapshot(snapshot: dict[str, Any]) -> None:
    if snapshot.get("schema_version") != SNAPSHOT_SCHEMA_VERSION:
        raise ValueError("Unsupported dependency snapshot schema")
    if snapshot.get("nodes") != list(NODES) or snapshot.get("edges") != [list(edge) for edge in EDGES]:
        raise ValueError("Dependency snapshot graph differs from the declared graph")
    if snapshot.get("read_only") is not True or snapshot.get("execution_authorized") is not False:
        raise ValueError("Dependency snapshot safety flags are invalid")
    fingerprint = str(snapshot.get("evidence_fingerprint") or "")
    stable = {key: value for key, value in snapshot.items() if key not in {"captured_at", "evidence_fingerprint"}}
    if not valid_fingerprint(fingerprint) or fingerprint != canonical_fingerprint(stable):
        raise ValueError("Dependency snapshot fingerprint does not match its content")


def _paths_from(roots: tuple[str, ...]) -> dict[str, list[str]]:
    adjacency = {node: [] for node in NODES}
    for source, target in EDGES:
        adjacency[source].append(target)
    paths: dict[str, list[str]] = {root: [root] for root in roots}
    queue = list(roots)
    while queue:
        source = queue.pop(0)
        for target in adjacency[source]:
            candidate = [*paths[source], target]
            if target not in paths or (len(candidate), candidate) < (len(paths[target]), paths[target]):
                paths[target] = candidate
                queue.append(target)
    return paths


_SPECIALIST_CHANGE_ROUTES = {
    "extraction_bytes": {"testimony", "legal", "longform"},
    "analysis_prompt_or_model": {"testimony", "legal"},
    "analysis_output": {"testimony", "legal"},
    "enrichment_prompt_or_model": {"testimony"},
    "lexicon_input": {"testimony", "legal"},
    "provisional_memory_input": {"testimony"},
    "tag_registry_input": {"testimony"},
    "enrichment_output": {"testimony"},
    "specialist_evidence": {"media", "testimony", "legal", "longform"},
}


def _affected_specialist_routes(item: dict[str, Any], change_id: str) -> list[str]:
    allowed = _SPECIALIST_CHANGE_ROUTES.get(change_id, set())
    return sorted(set(item.get("specialist_route_ids") or []) & allowed)


def _applicable(item: dict[str, Any], node: str, *, change_id: str = "") -> bool:
    if item.get("linkage_state") != "linked":
        return False
    if node == "specialist":
        return bool(_affected_specialist_routes(item, change_id))
    if node == "second_opinion" and not item.get("second_opinion_required"):
        return False
    return True


def preview_dependency_changes(snapshot: dict[str, Any], changes: list[str] | tuple[str, ...]) -> dict[str, Any]:
    """Return deterministic hypothetical impact; perform no automatic action."""
    validate_dependency_snapshot(snapshot)
    change_ids = sorted(set(str(value) for value in changes))
    unknown = [value for value in change_ids if value not in SCENARIOS]
    if unknown:
        raise ValueError(f"Unsupported dependency change scenario: {', '.join(unknown)}")
    raw_rows = []
    outside_scope = "none_declared"
    for change_id in change_ids:
        spec = SCENARIOS[change_id]
        if spec.get("outside_scope_fanout") == "unknown":
            outside_scope = "unknown"
        roots = tuple(spec["roots"])
        paths = _paths_from(roots)
        for item in snapshot["items"]:
            if not any(_applicable(item, root, change_id=change_id) for root in roots):
                continue
            for node, path in paths.items():
                if not _applicable(item, node, change_id=change_id):
                    continue
                direct = node in roots
                impact_class = str(spec["direct_class"] if direct else spec["downstream_class"])
                if impact_class == "unaffected" and not direct:
                    continue
                observed = (item.get("stage_snapshots") or {}).get(node, {})
                provenance = str(observed.get("provenance_coverage") or "unknown")
                if (
                    direct and impact_class == "would_require_revalidation"
                    and provenance not in {"exact", "partial"}
                ):
                    display_class = "provenance_unknown"
                else:
                    display_class = impact_class
                raw_rows.append({
                    "change_id": change_id,
                    "change": spec["label"],
                    "queue_item_id": item["queue_item_id"],
                    "doc_id": item["doc_id"],
                    "title": item["title"],
                    "node": node,
                    "impact_class": display_class,
                    "declared_impact_class": impact_class,
                    "observed_status": str(observed.get("observed_status") or "not_separately_projected"),
                    "provenance_coverage": provenance,
                    "reason_path": path,
                    "affected_specialist_routes": (
                        _affected_specialist_routes(item, change_id) if node == "specialist" else []
                    ),
                    "recommended_action": spec["action"],
                    "automatic_action": False,
                    "existing_artifact_preserved": True,
                })
    precedence = {
        "unaffected": 0,
        "conditional_downstream": 1,
        "would_require_revalidation": 2,
        "provenance_unknown": 3,
        "would_become_stale": 4,
        "directly_changed": 5,
    }
    grouped: dict[tuple[str, str, str], dict[str, Any]] = {}
    for row in raw_rows:
        key = (row["queue_item_id"], row["doc_id"], row["node"])
        if key not in grouped:
            grouped[key] = {
                **row,
                "change_ids": [row["change_id"]],
                "changes": [row["change"]],
                "reason_paths": [row["reason_path"]],
                "recommended_actions": [row["recommended_action"]],
            }
            continue
        current = grouped[key]
        if precedence[row["impact_class"]] > precedence[current["impact_class"]]:
            for field in ("impact_class", "declared_impact_class", "reason_path"):
                current[field] = row[field]
        for field, value in (
            ("change_ids", row["change_id"]),
            ("changes", row["change"]),
            ("reason_paths", row["reason_path"]),
            ("recommended_actions", row["recommended_action"]),
        ):
            if value not in current[field]:
                current[field].append(value)
    rows = []
    for row in grouped.values():
        row["change_id"] = ", ".join(row["change_ids"])
        row["change"] = " + ".join(row["changes"])
        row["recommended_action"] = " ".join(row["recommended_actions"])
        rows.append(row)
    rows.sort(key=lambda row: (row["doc_id"], NODES.index(row["node"]), row["change_id"]))
    stable = {
        "schema_version": PREVIEW_SCHEMA_VERSION,
        "snapshot_fingerprint": snapshot["evidence_fingerprint"],
        "workflow_batch_id": snapshot["workflow_batch_id"],
        "changes": change_ids,
        "rows": rows,
        "summary": {
            "selected_documents": len(snapshot["items"]),
            "affected_documents": len({row["doc_id"] for row in rows if row["doc_id"]}),
            "impact_rows": len(rows),
            "direct_changes": sum(row["declared_impact_class"] == "directly_changed" for row in rows),
            "would_become_stale": sum(row["impact_class"] == "would_become_stale" for row in rows),
            "revalidation_or_unknown": sum(
                row["impact_class"] in {"would_require_revalidation", "provenance_unknown"}
                for row in rows
            ),
        },
        "outside_scope_fanout": outside_scope,
        "read_only": True,
        "execution_authorized": False,
        "automatic_rerun": False,
        "remote_checked": False,
        "existing_artifacts_preserved": True,
        "not_triggered": ["triage", "ingestion", "model call", "rerun", "upload", "publication"],
    }
    return {**stable, "previewed_at": _now(), "evidence_fingerprint": canonical_fingerprint(stable)}


def validate_impact_preview(preview: dict[str, Any], snapshot: dict[str, Any]) -> None:
    validate_dependency_snapshot(snapshot)
    if preview.get("schema_version") != PREVIEW_SCHEMA_VERSION:
        raise ValueError("Unsupported impact preview schema")
    if preview.get("snapshot_fingerprint") != snapshot.get("evidence_fingerprint"):
        raise ValueError("Impact preview is not bound to this dependency snapshot")
    if preview.get("automatic_rerun") is not False or preview.get("execution_authorized") is not False:
        raise ValueError("Impact preview safety flags are invalid")
    fingerprint = str(preview.get("evidence_fingerprint") or "")
    stable = {key: value for key, value in preview.items() if key not in {"previewed_at", "evidence_fingerprint"}}
    if not valid_fingerprint(fingerprint) or fingerprint != canonical_fingerprint(stable):
        raise ValueError("Impact preview fingerprint does not match its content")
