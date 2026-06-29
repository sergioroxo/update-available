"""Evidence graph exports for the archive coordination layer (KG-1).

This module projects local corpus artifacts into graph-ready nodes and edges.
It deliberately exports an **Evidence Graph**, not a semantic/discovery graph:
default edges require researcher review or approval, and every edge carries
document provenance. No model calls, no network, no Sanity/Supabase writes.
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Any

from runner.models.document import _COUNTRY_ALIASES_MODEL
from runner.pipeline.archive_summary import (
    KNOWLEDGE_EXPORT_DIR,
    build_archive_summary,
    iter_corpus_doc_dirs,
    read_json_safe,
)
from runner.pipeline.citation_units import CITATION_UNITS_FILENAME, locate_quote


GRAPH_SCHEMA_VERSION = "archive-graph-v1.0"
NODES_CSV = "archive_nodes.csv"
EDGES_CSV = "archive_edges.csv"
GRAPH_JSON = "archive_graph.json"

NODE_FIELDS = [
    "id",
    "label",
    "type",
    "doc_id",
    "trust_state",
    "review_status",
    "sanity_id",
    "source_url",
    "provisional",
]

EDGE_FIELDS = [
    "id",
    "source",
    "target",
    "type",
    "source_type",
    "target_type",
    "doc_id",
    "source_url",
    "evidence_quote",
    "review_status",
    "confidence",
    "proposal_id",
    "source_artifact",
    "evidence_strength",
    "edge_basis",
    "evidence_locator_status",
    "evidence_unit_id",
    "evidence_char_start",
    "evidence_char_end",
    "evidence_quote_hash",
    "evidence_match_kind",
    "evidence_source_artifact",
    "provisional",
]

_DOC_TAG_FIELDS = {
    "country": "mentions_country",
    "tactic": "attests_tactic",
    "practice": "attests_practice",
    "term": "attests_term",
    "actor": "mentions_actor",
    "network": "mentions_network",
    "harm": "mentions_harm",
    "function": "mentions_function",
}

_DOC_TAG_NODE_TYPES = {
    "country": "country",
    "tactic": "tactic",
    "practice": "practice",
    "term": "term",
    "actor": "actor",
    "network": "network",
    "harm": "harm",
    "function": "function",
}


def slugify(value: str) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"^[a-z]+:\s*", "", text)
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "unknown"


def display_label(node_type: str, value: str) -> str:
    """Return a graph-facing label without model-prefix noise.

    The source artifacts remain unchanged; this is only for export readability
    and stable node identity. For example, ``Function: Political-Slogan`` and
    ``Political-Slogan`` should be one node, not two.
    """
    label = str(value or "").strip()
    label = re.sub(r"^(?:Actor|Country|Function|Harm|Network|Practice|Tactic|Term):\s*", "", label, flags=re.I)
    if node_type == "country":
        return _COUNTRY_ALIASES_MODEL.get(label, _COUNTRY_ALIASES_MODEL.get(label.upper(), label))
    return label


def _dedupe_key(*parts: Any) -> str:
    return "|".join(str(p or "") for p in parts)


def _proposal_state(item: dict) -> str:
    status = item.get("proposal_status")
    if status in {"pending", "approved", "rejected", "pushed"}:
        return status
    if item.get("rejected"):
        return "rejected"
    if item.get("approved") and item.get("pushed_to_sanity"):
        return "pushed"
    if item.get("approved"):
        return "approved"
    return "pending"


def _approved_or_pushed(item: dict) -> bool:
    return _proposal_state(item) in {"approved", "pushed"}


def _edge_allowed_from_doc(summary: dict, *, include_proposed: bool) -> bool:
    if include_proposed:
        return summary.get("trust_state") != "incomplete"
    return summary.get("trust_state") in {"researcher_reviewed", "uploaded"}


def _edge_allowed_from_proposal(item: dict, *, include_proposed: bool) -> bool:
    if _proposal_state(item) == "rejected" or item.get("rejected"):
        return False
    if include_proposed:
        return True
    return _approved_or_pushed(item)


def _node_id(node_type: str, label: str, *, stable_id: str = "") -> str:
    if stable_id:
        return f"{node_type}:{stable_id}"
    return f"{node_type}:{slugify(label)}"


def _add_node(nodes: dict[str, dict], node: dict) -> str:
    node_id = node["id"]
    existing = nodes.get(node_id)
    if existing:
        # Preserve the strongest local trust signal seen so far.
        if not existing.get("sanity_id") and node.get("sanity_id"):
            existing["sanity_id"] = node.get("sanity_id", "")
        if existing.get("provisional") == "true" and node.get("provisional") == "false":
            existing["provisional"] = "false"
        return node_id
    normalized = {field: str(node.get(field, "")) for field in NODE_FIELDS}
    nodes[node_id] = normalized
    return node_id


def _add_edge(edges: dict[str, dict], edge: dict) -> str:
    citation_units = edge.pop("_citation_units", None)
    edge = {**_edge_locator_fields(edge, citation_units), **edge}
    edge_id = edge.get("id") or _dedupe_key(
        edge.get("source"),
        edge.get("target"),
        edge.get("type"),
        edge.get("doc_id"),
        edge.get("proposal_id"),
    )
    normalized = {field: str(edge.get(field, "")) for field in EDGE_FIELDS}
    normalized["id"] = edge_id
    normalized["evidence_strength"] = normalized["evidence_strength"] or _edge_evidence_strength(normalized)
    normalized["edge_basis"] = normalized["edge_basis"] or _edge_basis(normalized)
    edges.setdefault(edge_id, normalized)
    return edge_id


def _edge_locator_fields(edge: dict, citation_units: dict | None) -> dict:
    quote = str(edge.get("evidence_quote") or "").strip()
    source_artifact = str(edge.get("source_artifact") or "")
    if source_artifact == "analysis.json" and not quote:
        status = "classification_only"
        locator = {}
    elif source_artifact == "archive_summary.json" and not quote:
        status = "source_metadata"
        locator = {}
    else:
        locator = locate_quote(citation_units, quote)
        status = str(locator.get("status") or "")
    return {
        "evidence_locator_status": status,
        "evidence_unit_id": str(locator.get("unit_id") or ""),
        "evidence_char_start": _locator_value(locator.get("char_start")),
        "evidence_char_end": _locator_value(locator.get("char_end")),
        "evidence_quote_hash": str(locator.get("quote_hash") or ""),
        "evidence_match_kind": str(locator.get("match_kind") or ""),
        "evidence_source_artifact": str(locator.get("source_artifact") or ""),
    }


def _locator_value(value: Any) -> str:
    if value in (None, ""):
        return ""
    return str(value)


def _source_url_for_doc(summary: dict) -> str:
    source = summary.get("source") or {}
    return str(source.get("source_url") or "").strip()


def _edge_evidence_strength(edge: dict) -> str:
    if edge.get("source_artifact") == "archive_summary.json":
        return "source_metadata"
    if str(edge.get("evidence_quote") or "").strip():
        return "quote_backed"
    if edge.get("source_artifact") == "analysis.json":
        return "classification_tag"
    return "proposal_no_quote"


def _edge_basis(edge: dict) -> str:
    source_artifact = str(edge.get("source_artifact") or "")
    if source_artifact == "analysis.json":
        return "analysis_classification"
    if source_artifact.startswith("enrichment.json:corpus_connections"):
        return "retrieval_grounded_connection"
    if source_artifact.startswith("enrichment.json:"):
        return "enrichment_proposal"
    return "local_artifact"


def _confidence_for_doc(summary: dict) -> str:
    cls = summary.get("classification") or {}
    return str(cls.get("confidence_score") or "")


def _doc_node(summary: dict) -> dict:
    doc_id = str(summary.get("doc_id") or "").strip()
    content = summary.get("content") or {}
    source = summary.get("source") or {}
    label = str(content.get("title") or source.get("source_url") or doc_id)
    publication = summary.get("publication") or {}
    return {
        "id": f"document:{doc_id}",
        "label": label,
        "type": "document",
        "doc_id": doc_id,
        "trust_state": str(summary.get("trust_state") or ""),
        "review_status": str((summary.get("readiness") or {}).get("status") or ""),
        "sanity_id": str(publication.get("sanity_id") or ""),
        "source_url": _source_url_for_doc(summary),
        "provisional": "false",
    }


def _add_source_domain_edge(summary: dict, nodes: dict[str, dict], edges: dict[str, dict]) -> None:
    source = summary.get("source") or {}
    hostname = str(source.get("hostname") or "").strip().lower()
    doc_id = str(summary.get("doc_id") or "").strip()
    if not hostname or not doc_id:
        return
    domain_node = _add_node(nodes, {
        "id": _node_id("source_domain", hostname),
        "label": hostname,
        "type": "source_domain",
        "doc_id": "",
        "trust_state": "",
        "review_status": "",
        "sanity_id": "",
        "source_url": "",
        "provisional": "false",
    })
    _add_edge(edges, {
        "source": f"document:{doc_id}",
        "target": domain_node,
        "type": "published_on_domain",
        "source_type": "document",
        "target_type": "source_domain",
        "doc_id": doc_id,
        "source_url": _source_url_for_doc(summary),
        "evidence_quote": "",
        "review_status": str(summary.get("trust_state") or ""),
        "confidence": "",
        "proposal_id": "",
        "source_artifact": "archive_summary.json",
        "provisional": "false",
    })


def _add_document_tag_edges(summary: dict, nodes: dict[str, dict], edges: dict[str, dict], *, include_proposed: bool) -> None:
    if not _edge_allowed_from_doc(summary, include_proposed=include_proposed):
        return
    doc_id = str(summary.get("doc_id") or "")
    if not doc_id:
        return
    doc_node = f"document:{doc_id}"
    source_url = _source_url_for_doc(summary)
    confidence = _confidence_for_doc(summary)
    cls = summary.get("classification") or {}
    for field, edge_type in _DOC_TAG_FIELDS.items():
        node_type = _DOC_TAG_NODE_TYPES[field]
        values = cls.get(field) or []
        if not isinstance(values, list):
            values = [values]
        for raw in values:
            label = display_label(node_type, str(raw or "").strip())
            if not label:
                continue
            target = _add_node(nodes, {
                "id": _node_id(node_type, label),
                "label": label,
                "type": node_type,
                "provisional": "true",
            })
            _add_edge(edges, {
                "source": doc_node,
                "target": target,
                "type": edge_type,
                "source_type": "document",
                "target_type": node_type,
                "doc_id": doc_id,
                "source_url": source_url,
                "evidence_quote": "",
                "review_status": str(summary.get("trust_state") or ""),
                "confidence": confidence,
                "proposal_id": "",
                "source_artifact": "analysis.json",
                "provisional": "true" if summary.get("trust_state") == "model_proposed" else "false",
            })


def _proposal_node_id(item: dict, node_type: str, label: str, id_fields: tuple[str, ...]) -> tuple[str, bool]:
    for field in id_fields:
        value = str(item.get(field) or "").strip()
        if value:
            return _node_id(node_type, label, stable_id=value), False
    return _node_id(node_type, label), True


def _proposal_confidence(item: dict) -> str:
    value = item.get("researcher_confidence")
    if value in (None, ""):
        value = item.get("model_confidence")
    return "" if value in (None, "") else str(value)


def _proposal_review_status(item: dict) -> str:
    return _proposal_state(item)


def _proposal_edge_common(doc_id: str, source_url: str, item: dict, source_artifact: str) -> dict:
    return {
        "doc_id": doc_id,
        "source_url": source_url,
        "review_status": _proposal_review_status(item),
        "confidence": _proposal_confidence(item),
        "proposal_id": str(item.get("proposal_id") or ""),
        "source_artifact": source_artifact,
        "provisional": "false" if _approved_or_pushed(item) else "true",
    }


def _add_enrichment_edges(
    doc_dir: Path,
    summary: dict,
    nodes: dict[str, dict],
    edges: dict[str, dict],
    *,
    include_proposed: bool,
) -> None:
    enrichment = read_json_safe(Path(doc_dir) / "enrichment.json", {})
    if not isinstance(enrichment, dict):
        return
    citation_units = read_json_safe(Path(doc_dir) / CITATION_UNITS_FILENAME, {})
    if not isinstance(citation_units, dict):
        citation_units = {}
    doc_id = str(enrichment.get("doc_id") or summary.get("doc_id") or Path(doc_dir).name)
    doc_node = f"document:{doc_id}"
    source_url = _source_url_for_doc(summary)

    for item in enrichment.get("entity_proposals") or []:
        if not isinstance(item, dict) or not _edge_allowed_from_proposal(item, include_proposed=include_proposed):
            continue
        label = str(item.get("name") or "").strip()
        if not label:
            continue
        entity_type = str(item.get("entity_type") or "organization")
        source_node, provisional = _proposal_node_id(
            item,
            entity_type,
            label,
            ("sanity_id", "existing_entity_id"),
        )
        _add_node(nodes, {
            "id": source_node,
            "label": label,
            "type": entity_type,
            "doc_id": doc_id,
            "sanity_id": item.get("sanity_id") or item.get("existing_entity_id") or "",
            "source_url": source_url,
            "provisional": "true" if provisional else "false",
        })
        common = {
            **_proposal_edge_common(doc_id, source_url, item, "enrichment.json:entity_proposals"),
            "_citation_units": citation_units,
        }
        _add_edge(edges, {
            "source": doc_node,
            "target": source_node,
            "type": "attests_entity",
            "source_type": "document",
            "target_type": entity_type,
            "evidence_quote": str(item.get("evidence_quote") or ""),
            **common,
        })
        for conn in item.get("network_connections") or []:
            if not isinstance(conn, dict):
                continue
            target_label = str(conn.get("entity_name") or "").strip()
            if not target_label:
                continue
            target = _add_node(nodes, {
                "id": _node_id("entity", target_label),
                "label": target_label,
                "type": "entity",
                "doc_id": doc_id,
                "source_url": source_url,
                "provisional": "true",
            })
            _add_edge(edges, {
                "source": source_node,
                "target": target,
                "type": str(conn.get("connection_type") or "connected_to"),
                "source_type": entity_type,
                "target_type": "entity",
                "evidence_quote": str(conn.get("evidence_quote") or item.get("evidence_quote") or ""),
                **{
                    **common,
                    "doc_id": str(conn.get("attested_in_doc") or doc_id),
                },
            })
        for person in item.get("key_individuals") or []:
            if not isinstance(person, dict):
                continue
            name = str(person.get("name") or "").strip()
            if not name:
                continue
            person_node = _add_node(nodes, {
                "id": _node_id("person", name),
                "label": name,
                "type": "person",
                "doc_id": doc_id,
                "source_url": source_url,
                "provisional": "true",
            })
            _add_edge(edges, {
                "source": source_node,
                "target": person_node,
                "type": "has_key_individual",
                "source_type": entity_type,
                "target_type": "person",
                "evidence_quote": str(person.get("quote") or item.get("evidence_quote") or ""),
                **common,
            })
        for org in item.get("affiliated_orgs") or []:
            org_label = str(org or "").strip()
            if not org_label:
                continue
            org_node = _add_node(nodes, {
                "id": _node_id("organization", org_label),
                "label": org_label,
                "type": "organization",
                "doc_id": doc_id,
                "source_url": source_url,
                "provisional": "true",
            })
            _add_edge(edges, {
                "source": source_node,
                "target": org_node,
                "type": "affiliated_with",
                "source_type": entity_type,
                "target_type": "organization",
                "evidence_quote": str(item.get("evidence_quote") or ""),
                **common,
            })

    for item in enrichment.get("lexicon_proposals") or []:
        if not isinstance(item, dict) or not _edge_allowed_from_proposal(item, include_proposed=include_proposed):
            continue
        label = display_label("term", str(item.get("term") or "").strip())
        if not label:
            continue
        term_node, provisional = _proposal_node_id(
            item,
            "term",
            label,
            ("sanity_id", "existing_entry_id", "merge_target_id"),
        )
        _add_node(nodes, {
            "id": term_node,
            "label": label,
            "type": "term",
            "doc_id": doc_id,
            "sanity_id": item.get("sanity_id") or item.get("existing_entry_id") or "",
            "source_url": source_url,
            "provisional": "true" if provisional else "false",
        })
        common = {
            **_proposal_edge_common(doc_id, source_url, item, "enrichment.json:lexicon_proposals"),
            "_citation_units": citation_units,
        }
        _add_edge(edges, {
            "source": doc_node,
            "target": term_node,
            "type": "attests_term",
            "source_type": "document",
            "target_type": "term",
            "evidence_quote": str(item.get("exact_quote") or item.get("definition_as_used") or ""),
            **common,
        })
        for rel in item.get("relationships") or []:
            if not isinstance(rel, dict):
                continue
            target_label = display_label("term", str(rel.get("existing_term") or "").strip())
            relation = str(rel.get("relationship") or "").strip()
            if not target_label or not relation:
                continue
            target = _add_node(nodes, {
                "id": _node_id("term", target_label),
                "label": target_label,
                "type": "term",
                "doc_id": doc_id,
                "source_url": source_url,
                "provisional": "true",
            })
            _add_edge(edges, {
                "source": term_node,
                "target": target,
                "type": relation,
                "source_type": "term",
                "target_type": "term",
                "evidence_quote": str(rel.get("evidence") or item.get("exact_quote") or ""),
                **common,
            })

    for item in enrichment.get("tactic_proposals") or []:
        if not isinstance(item, dict) or not _edge_allowed_from_proposal(item, include_proposed=include_proposed):
            continue
        label = display_label("tactic", str(item.get("tactic") or "").strip())
        if not label:
            continue
        tactic_node, provisional = _proposal_node_id(
            item,
            "tactic",
            label,
            ("sanity_id", "existing_tactic_id"),
        )
        _add_node(nodes, {
            "id": tactic_node,
            "label": label,
            "type": "tactic",
            "doc_id": doc_id,
            "sanity_id": item.get("sanity_id") or item.get("existing_tactic_id") or "",
            "source_url": source_url,
            "provisional": "true" if provisional else "false",
        })
        _add_edge(edges, {
            "source": doc_node,
            "target": tactic_node,
            "type": "attests_tactic",
            "source_type": "document",
            "target_type": "tactic",
            "evidence_quote": str(item.get("evidence_quote") or item.get("definition") or ""),
            **{
                **_proposal_edge_common(doc_id, source_url, item, "enrichment.json:tactic_proposals"),
                "_citation_units": citation_units,
            },
        })

    for item in enrichment.get("practice_descriptions") or []:
        if not isinstance(item, dict) or not _edge_allowed_from_proposal(item, include_proposed=include_proposed):
            continue
        label = display_label("practice", str(item.get("practice_id") or item.get("practice_cluster") or "").strip())
        if not label:
            continue
        practice_node, provisional = _proposal_node_id(
            item,
            "practice",
            label,
            ("sanity_id", "existing_practice_id"),
        )
        _add_node(nodes, {
            "id": practice_node,
            "label": label,
            "type": "practice",
            "doc_id": doc_id,
            "sanity_id": item.get("sanity_id") or item.get("existing_practice_id") or "",
            "source_url": source_url,
            "provisional": "true" if provisional else "false",
        })
        _add_edge(edges, {
            "source": doc_node,
            "target": practice_node,
            "type": "describes_practice",
            "source_type": "document",
            "target_type": "practice",
            "evidence_quote": str(item.get("harm_quote") or item.get("exact_description") or ""),
            **{
                **_proposal_edge_common(doc_id, source_url, item, "enrichment.json:practice_descriptions"),
                "_citation_units": citation_units,
            },
        })

    for item in enrichment.get("corpus_connections") or []:
        if not isinstance(item, dict):
            continue
        if not item.get("is_retrieval_grounded"):
            continue
        if not _edge_allowed_from_proposal(item, include_proposed=include_proposed):
            continue
        target_doc = str(item.get("doc_id") or "").strip()
        if not target_doc:
            continue
        target_node = _add_node(nodes, {
            "id": f"document:{target_doc}",
            "label": target_doc,
            "type": "document",
            "doc_id": target_doc,
            "provisional": "true",
        })
        _add_edge(edges, {
            "source": doc_node,
            "target": target_node,
            "type": str(item.get("connection_type") or "corpus_connection"),
            "source_type": "document",
            "target_type": "document",
            "evidence_quote": str(item.get("evidence") or ""),
            **{
                **_proposal_edge_common(doc_id, source_url, item, "enrichment.json:corpus_connections"),
                "_citation_units": citation_units,
            },
        })


def build_knowledge_graph(corpus_dir: Path, *, config=None, include_proposed: bool = False) -> dict:
    """Return ``{"nodes": [...], "edges": [...]}`` from local corpus artifacts."""
    nodes: dict[str, dict] = {}
    edges: dict[str, dict] = {}
    for doc_dir in iter_corpus_doc_dirs(corpus_dir):
        summary = build_archive_summary(doc_dir, config=config)
        _add_node(nodes, _doc_node(summary))
        _add_source_domain_edge(summary, nodes, edges)
        _add_document_tag_edges(summary, nodes, edges, include_proposed=include_proposed)
        _add_enrichment_edges(doc_dir, summary, nodes, edges, include_proposed=include_proposed)

    node_rows = sorted(nodes.values(), key=lambda n: (n["type"], n["id"]))
    edge_rows = sorted(edges.values(), key=lambda e: (e["type"], e["source"], e["target"], e["doc_id"]))
    return {
        "schema_version": GRAPH_SCHEMA_VERSION,
        "include_proposed": include_proposed,
        "nodes": node_rows,
        "edges": edge_rows,
        "counts": {
            "nodes": len(node_rows),
            "edges": len(edge_rows),
        },
    }


def _write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in fields})


def export_knowledge_graph(
    corpus_dir: Path,
    exports_dir: Path,
    *,
    config=None,
    out_dir: Path | None = None,
    include_proposed: bool = False,
) -> dict:
    graph = build_knowledge_graph(corpus_dir, config=config, include_proposed=include_proposed)
    out = Path(out_dir) if out_dir else Path(exports_dir) / KNOWLEDGE_EXPORT_DIR
    out.mkdir(parents=True, exist_ok=True)
    nodes_path = out / NODES_CSV
    edges_path = out / EDGES_CSV
    graph_path = out / GRAPH_JSON
    _write_csv(nodes_path, graph["nodes"], NODE_FIELDS)
    _write_csv(edges_path, graph["edges"], EDGE_FIELDS)
    graph_path.write_text(json.dumps(graph, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {
        "ok": True,
        "schema_version": GRAPH_SCHEMA_VERSION,
        "include_proposed": include_proposed,
        "nodes_path": str(nodes_path),
        "edges_path": str(edges_path),
        "graph_path": str(graph_path),
        "node_count": graph["counts"]["nodes"],
        "edge_count": graph["counts"]["edges"],
    }
