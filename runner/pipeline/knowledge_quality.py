"""Local quality audit for archive summaries, tags, and evidence graph exports.

The knowledge quality report is a derived, read-only diagnostic. It answers:

* how good the extracted text/profile coverage looks;
* whether analysis tags are populated coherently;
* whether the legacy tag registry is matching document text;
* how much enrichment review work remains;
* whether the evidence graph is mostly quote-backed or only classification tags.

No model calls, no network, no Sanity/Supabase writes.
"""
from __future__ import annotations

import json
import statistics
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from runner.pipeline.archive_summary import (
    DOCUMENT_PROFILES_JSONL,
    KNOWLEDGE_EXPORT_DIR,
    build_archive_summary,
    iter_corpus_doc_dirs,
    read_json_safe,
)
from runner.pipeline.knowledge_graph import GRAPH_JSON, build_knowledge_graph


KNOWLEDGE_QUALITY_JSON = "knowledge_quality.json"

TAG_FIELDS = (
    "tactic",
    "practice",
    "term",
    "actor",
    "network",
    "harm",
    "function",
    "country",
    "languages",
)

OPERATIONAL_ENRICHMENT_FAMILIES = (
    "lexicon_proposals",
    "entity_proposals",
    "tactic_proposals",
    "practice_descriptions",
    "statistical_claims",
)

DEFERRED_ENRICHMENT_FAMILIES = (
    "corpus_connections",
)

LOW_TEXT_CHAR_THRESHOLD = 1_000


def _counter_dict(counter: Counter) -> dict[str, int]:
    return dict(sorted((str(k), int(v)) for k, v in counter.items()))


def _median(values: list[int]) -> int:
    if not values:
        return 0
    return int(statistics.median(values))


def _read_profiles(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(item, dict):
            rows.append(item)
    return rows


def _profiles(corpus_dir: Path, exports_dir: Path, *, config=None, prefer_export: bool = True) -> list[dict]:
    export_path = Path(exports_dir) / KNOWLEDGE_EXPORT_DIR / DOCUMENT_PROFILES_JSONL
    if prefer_export:
        rows = _read_profiles(export_path)
        if rows:
            return rows
    return [build_archive_summary(doc_dir, config=config) for doc_dir in iter_corpus_doc_dirs(corpus_dir)]


def _graph(corpus_dir: Path, exports_dir: Path, *, config=None, prefer_export: bool = True) -> dict:
    export_path = Path(exports_dir) / KNOWLEDGE_EXPORT_DIR / GRAPH_JSON
    if prefer_export:
        payload = read_json_safe(export_path, {})
        if isinstance(payload, dict) and isinstance(payload.get("edges"), list):
            return payload
    return build_knowledge_graph(corpus_dir, config=config)


def _proposal_state(item: dict) -> str:
    status = item.get("proposal_status")
    if status in {"pending", "approved", "rejected", "pushed"}:
        return str(status)
    if item.get("rejected"):
        return "rejected"
    if item.get("approved") and item.get("pushed_to_sanity"):
        return "pushed"
    if item.get("approved"):
        return "approved"
    return "pending"


def _extraction_section(profiles: list[dict]) -> dict:
    char_rows = []
    quality = Counter()
    challenge_docs = []
    for profile in profiles:
        doc_id = str(profile.get("doc_id") or "")
        content = profile.get("content") or {}
        source = profile.get("source") or {}
        char_count = int(content.get("char_count") or 0)
        char_rows.append((doc_id, char_count, str(content.get("title") or source.get("source_url") or "")))
        quality[str(content.get("preprocess_quality") or "missing")] += 1
        if source.get("acquisition_challenge"):
            challenge_docs.append({
                "doc_id": doc_id,
                "signal": str(source.get("acquisition_signal") or ""),
                "source_url": str(source.get("source_url") or ""),
            })

    counts = [count for _, count, _ in char_rows]
    zero_text = [
        {"doc_id": doc_id, "char_count": count, "title": title}
        for doc_id, count, title in char_rows
        if count == 0
    ]
    low_text = [
        {"doc_id": doc_id, "char_count": count, "title": title}
        for doc_id, count, title in char_rows
        if 0 < count < LOW_TEXT_CHAR_THRESHOLD
    ]
    return {
        "preprocess_quality": _counter_dict(quality),
        "char_count": {
            "min": min(counts) if counts else 0,
            "median": _median(counts),
            "max": max(counts) if counts else 0,
            "low_text_threshold": LOW_TEXT_CHAR_THRESHOLD,
        },
        "zero_text_docs": zero_text,
        "low_text_docs": sorted(low_text, key=lambda row: row["char_count"])[:25],
        "acquisition_challenge_docs": challenge_docs[:25],
    }


def _tag_coverage_section(profiles: list[dict]) -> dict:
    fields: dict[str, dict] = {}
    missing_core = []
    for field in TAG_FIELDS:
        docs_with = 0
        total_values = 0
        top = Counter()
        for profile in profiles:
            values = (profile.get("classification") or {}).get(field) or []
            if not isinstance(values, list):
                values = [values]
            values = [str(value).strip() for value in values if str(value or "").strip()]
            if values:
                docs_with += 1
                total_values += len(values)
                top.update(values)
        fields[field] = {
            "docs_with_values": docs_with,
            "total_values": total_values,
            "top_values": top.most_common(12),
        }

    for profile in profiles:
        if profile.get("trust_state") == "incomplete":
            continue
        cls = profile.get("classification") or {}
        missing = [
            field for field in ("tactic", "harm", "function", "country")
            if not cls.get(field)
        ]
        if missing:
            missing_core.append({
                "doc_id": profile.get("doc_id"),
                "missing_fields": missing,
                "title": (profile.get("content") or {}).get("title") or (profile.get("source") or {}).get("source_url") or "",
            })

    return {
        "fields": fields,
        "missing_core_tag_docs": missing_core[:25],
        "interpretation": (
            "Analysis tags are document-level classification signals. "
            "They become graph edges with evidence_strength=classification_tag; "
            "they are not the same as enrichment proposals, which should carry quotes."
        ),
    }


def _tag_registry_section(corpus_dir: Path) -> dict:
    try:
        from runner.pipeline.tag_registry import detect_tag_matches, load_tag_registry
    except Exception as exc:  # noqa: BLE001
        return {
            "available": False,
            "error": str(exc),
            "used_for_enrichment": True,
            "mode": "connection_hints_not_proof",
        }

    try:
        registry_rows = load_tag_registry()
    except Exception as exc:  # noqa: BLE001
        return {
            "available": False,
            "error": str(exc),
            "used_for_enrichment": True,
            "mode": "connection_hints_not_proof",
        }

    docs_scanned = 0
    docs_with_matches = 0
    categories = Counter()
    top_docs = []
    for doc_dir in iter_corpus_doc_dirs(corpus_dir):
        text_path = doc_dir / "extracted.txt"
        if not text_path.exists():
            continue
        try:
            text = text_path.read_text(encoding="utf-8")
        except Exception:
            continue
        if not text.strip():
            continue
        docs_scanned += 1
        try:
            matches = detect_tag_matches(text)
        except Exception:
            matches = []
        if matches:
            docs_with_matches += 1
            categories.update(str(match.get("category") or "Unknown") for match in matches)
            top_docs.append({
                "doc_id": doc_dir.name,
                "match_count": len(matches),
                "categories": _counter_dict(Counter(str(match.get("category") or "Unknown") for match in matches)),
            })

    return {
        "available": bool(registry_rows),
        "registry_rows": len(registry_rows),
        "docs_scanned": docs_scanned,
        "docs_with_matches": docs_with_matches,
        "category_matches": _counter_dict(categories),
        "top_docs": sorted(top_docs, key=lambda row: row["match_count"], reverse=True)[:15],
        "used_for_enrichment": True,
        "mode": "connection_hints_not_proof",
        "prompt_role": (
            "During enrichment, detected registry matches are injected into the prompt as "
            "'TAG REGISTRY MATCHES FOUND IN TEXT (use as connection hints, not proof)'."
        ),
    }


def _enrichment_section(corpus_dir: Path) -> dict:
    docs_with_enrichment = 0
    family_counts = Counter()
    deferred_family_counts = Counter()
    lifecycle = Counter()
    docs_needing_review = []
    for doc_dir in iter_corpus_doc_dirs(corpus_dir):
        data = read_json_safe(doc_dir / "enrichment.json", {})
        if not isinstance(data, dict) or not data:
            continue
        docs_with_enrichment += 1
        pending_for_doc = 0
        for family in OPERATIONAL_ENRICHMENT_FAMILIES:
            items = data.get(family) or []
            if not isinstance(items, list):
                continue
            family_counts[family] += len(items)
            for item in items:
                if not isinstance(item, dict):
                    continue
                state = _proposal_state(item)
                lifecycle[state] += 1
                if state == "pending":
                    pending_for_doc += 1
        for family in DEFERRED_ENRICHMENT_FAMILIES:
            items = data.get(family) or []
            if isinstance(items, list):
                deferred_family_counts[family] += len(items)
        if pending_for_doc:
            docs_needing_review.append({
                "doc_id": doc_dir.name,
                "pending": pending_for_doc,
            })
    return {
        "docs_with_enrichment": docs_with_enrichment,
        "family_counts": _counter_dict(family_counts),
        "lifecycle": _counter_dict(lifecycle),
        "deferred_family_counts": _counter_dict(deferred_family_counts),
        "deferred_note": "corpus_connections are excluded from pending review totals until retrieval grounding is enabled.",
        "docs_needing_review": sorted(docs_needing_review, key=lambda row: row["pending"], reverse=True)[:25],
    }


def _graph_section(graph: dict) -> dict:
    nodes = graph.get("nodes") or []
    edges = graph.get("edges") or []
    edge_strength = Counter(str(edge.get("evidence_strength") or "unknown") for edge in edges if isinstance(edge, dict))
    edge_basis = Counter(str(edge.get("edge_basis") or "unknown") for edge in edges if isinstance(edge, dict))
    edge_types = Counter(str(edge.get("type") or "unknown") for edge in edges if isinstance(edge, dict))
    node_types = Counter(str(node.get("type") or "unknown") for node in nodes if isinstance(node, dict))
    quote_backed = edge_strength.get("quote_backed", 0)
    return {
        "node_count": len(nodes),
        "edge_count": len(edges),
        "node_types": _counter_dict(node_types),
        "edge_types": dict(edge_types.most_common(20)),
        "evidence_strength": _counter_dict(edge_strength),
        "edge_basis": _counter_dict(edge_basis),
        "quote_backed_ratio": round(quote_backed / len(edges), 3) if edges else 0,
    }


def _recommendations(report: dict) -> list[str]:
    recommendations: list[str] = []
    extraction = report.get("extraction") or {}
    tag_coverage = report.get("tag_coverage") or {}
    tag_registry = report.get("tag_registry") or {}
    enrichment = report.get("enrichment") or {}
    graph = report.get("graph") or {}
    profiles = report.get("profiles") or {}

    if profiles.get("incomplete"):
        recommendations.append(f"{profiles['incomplete']} document(s) are incomplete; use system-health to decide retry vs discard.")
    if extraction.get("zero_text_docs"):
        recommendations.append(f"{len(extraction['zero_text_docs'])} document(s) have zero extracted text.")
    if extraction.get("low_text_docs"):
        recommendations.append(f"{len(extraction['low_text_docs'])} document(s) have low extracted text under {LOW_TEXT_CHAR_THRESHOLD} characters.")
    missing_core = (tag_coverage.get("missing_core_tag_docs") or [])
    if missing_core:
        recommendations.append(f"{len(missing_core)} analyzed document(s) are missing at least one core tag field.")
    if tag_registry.get("available") is False:
        detail = str(tag_registry.get("error") or "registry not found")
        recommendations.append(f"Tag registry is unavailable for match auditing/enrichment hints: {detail}")
    pending = int((enrichment.get("lifecycle") or {}).get("pending", 0))
    if pending:
        recommendations.append(f"{pending} enrichment proposal(s) await researcher review.")
    if graph.get("edge_count") and graph.get("quote_backed_ratio", 0) < 0.5:
        recommendations.append("Less than half of graph edges are quote-backed; keep graph interpretation conservative.")
    if not recommendations:
        recommendations.append("No quality warnings found in the current knowledge export snapshot.")
    return recommendations


def build_knowledge_quality_report(
    corpus_dir: Path,
    exports_dir: Path,
    *,
    config=None,
    prefer_exports: bool = True,
) -> dict:
    """Build a local quality report from corpus summaries, enrichment, and graph exports."""
    corpus_dir = Path(corpus_dir)
    exports_dir = Path(exports_dir)
    profiles = _profiles(corpus_dir, exports_dir, config=config, prefer_export=prefer_exports)
    graph = _graph(corpus_dir, exports_dir, config=config, prefer_export=prefer_exports)
    trust = Counter(str(profile.get("trust_state") or "unknown") for profile in profiles)
    readiness = Counter(str((profile.get("readiness") or {}).get("status") or "unknown") for profile in profiles)
    report = {
        "schema_version": "knowledge-quality-v1.0",
        "profiles": {
            "count": len(profiles),
            "trust_state": _counter_dict(trust),
            "readiness": _counter_dict(readiness),
            "uploaded": sum(1 for profile in profiles if (profile.get("publication") or {}).get("uploaded")),
            "incomplete": trust.get("incomplete", 0),
        },
        "extraction": _extraction_section(profiles),
        "tag_coverage": _tag_coverage_section(profiles),
        "tag_registry": _tag_registry_section(corpus_dir),
        "enrichment": _enrichment_section(corpus_dir),
        "graph": _graph_section(graph),
    }
    report["recommendations"] = _recommendations(report)
    return report


def write_knowledge_quality_report(
    corpus_dir: Path,
    exports_dir: Path,
    *,
    config=None,
    out_path: Path | None = None,
    prefer_exports: bool = True,
) -> dict:
    """Write ``knowledge_quality.json`` and return a small result payload."""
    report = build_knowledge_quality_report(
        corpus_dir,
        exports_dir,
        config=config,
        prefer_exports=prefer_exports,
    )
    if out_path is None:
        out_path = Path(exports_dir) / KNOWLEDGE_EXPORT_DIR / KNOWLEDGE_QUALITY_JSON
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {
        "ok": True,
        "path": str(out_path),
        "profile_count": report["profiles"]["count"],
        "edge_count": report["graph"]["edge_count"],
        "recommendation_count": len(report["recommendations"]),
        "report": report,
    }
