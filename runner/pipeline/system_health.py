"""Local system health checks for the ingestion/offload workflow.

This module is intentionally boring: it reads local files and produces a small
structured report. No model calls, no network, no Sanity/Supabase writes, no
package moves. It exists to answer the researcher's practical question:

    "Is the corpus/offload/export state coherent enough for me to keep working?"
"""
from __future__ import annotations

import json
import os
from collections import Counter
from pathlib import Path
from typing import Any

from runner.app_readiness import STATUS_NO_DATA, collect_corpus_readiness
from runner.pipeline.archive_summary import (
    DOCUMENT_PROFILES_JSONL,
    KNOWLEDGE_EXPORT_DIR,
    SUMMARY_FILENAME,
)
from runner.pipeline.knowledge_graph import EDGES_CSV, GRAPH_JSON, NODES_CSV
from runner.pipeline.offload import LIFECYCLE_STATES
from runner.pipeline.offload_source import (
    ARCHIVE_SUFFIX,
    INGEST_RESULT_MANIFEST_NAME,
    SOURCE_MANIFEST_NAME,
    inspect_source_archive,
    load_source_manifest,
)

_SUMMARY_SOURCE_FILES = (
    "intake.json",
    "preprocess.json",
    "analysis.json",
    "analysis_audit.json",
    "enrichment.json",
    "enrichment_audit.json",
    "embedding.json",
    "metadata.json",
    "sanity_record.json",
    "review_status.json",
    "legal_review.json",
    "testimony_review.json",
    "offload_import.json",
    "source_item.json",
)


def _read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception:
        return default


def _count_jsonl(path: Path) -> int:
    if not path.exists():
        return 0
    try:
        return sum(1 for line in path.read_text(encoding="utf-8").splitlines() if line.strip())
    except Exception:
        return 0


def _mtime(path: Path) -> float:
    try:
        return Path(path).stat().st_mtime
    except OSError:
        return 0.0


def _latest_mtime(paths) -> float:
    return max((_mtime(Path(path)) for path in paths), default=0.0)


def _doc_source_mtime(doc_dir: Path) -> float:
    return _latest_mtime(doc_dir / name for name in _SUMMARY_SOURCE_FILES)


def _incomplete_doc_state(doc_dir: Path) -> tuple[str, str]:
    """Classify a corpus folder that has no analysis.json into an action bucket."""
    if (doc_dir / "discarded.json").exists():
        return (
            "discarded",
            "Already marked discarded; no pipeline retry needed. Archive/remove the folder only if you want a cleaner corpus count.",
        )
    if (doc_dir / "preprocess.json").exists() or (doc_dir / "extracted.txt").exists() or (doc_dir / "extracted.md").exists():
        return (
            "preprocessed_no_analysis",
            "Run/retry analysis, enrichment, and embedding; preprocessing artifacts already exist.",
        )
    if (doc_dir / "intake.json").exists():
        return (
            "intake_only",
            "Run/retry preprocessing and analysis, or archive/remove this folder if it is a stale partial ingest.",
        )
    return (
        "stub_no_pipeline_artifacts",
        "Review/archive/remove this stub folder; it has no intake, preprocess, or analysis artifact.",
    )


def _transfer_root(*, mac_studio: bool = False, transfer_root: Path | str | None = None) -> Path:
    if transfer_root:
        return Path(transfer_root).expanduser()
    env = os.getenv("SOURCE_OFFLOAD_TRANSFER_ROOT", "").strip() or os.getenv("SOGICE_TRANSFER_ROOT", "").strip()
    if env:
        return Path(env).expanduser()
    if mac_studio:
        return Path(os.getenv("MAC_STUDIO_TRANSFER_ROOT", "/Users/cdn-ai/sogice-transfer")).expanduser()
    return Path(
        os.getenv(
            "MACBOOK_TRANSFER_ROOT",
            str(Path.home() / "Documents" / "surviving-sogice-studio"),
        )
    ).expanduser()


def _corpus_health(config) -> dict:
    corpus_dir = Path(config.corpus_dir)
    rows = collect_corpus_readiness(corpus_dir, config=config) if corpus_dir.exists() else []
    doc_dirs = [p for p in sorted(corpus_dir.iterdir()) if p.is_dir() and not p.name.startswith(".")] if corpus_dir.exists() else []
    analyzed = sum(1 for p in doc_dirs if (p / "analysis.json").exists())
    uploaded = sum(1 for p in doc_dirs if (p / "sanity_record.json").exists())
    offload_imported = sum(1 for p in doc_dirs if (p / "offload_import.json").exists())
    with_summary = sum(1 for p in doc_dirs if (p / SUMMARY_FILENAME).exists())
    stale_summary_docs = [
        p.name for p in doc_dirs
        if (p / SUMMARY_FILENAME).exists()
        and _doc_source_mtime(p) > _mtime(p / SUMMARY_FILENAME)
    ]
    latest_source_mtime = max((_doc_source_mtime(p) for p in doc_dirs), default=0.0)
    status_counts = Counter(row.get("status") for row in rows)
    pending = sum(int(row.get("pending") or 0) for row in rows)
    approved_unpushed = sum(int(row.get("approved_unpushed") or 0) for row in rows)
    blockers = sum(int(row.get("blocker_count") or 0) for row in rows)
    quality = sum(int(row.get("quality_count") or 0) for row in rows)
    doc_by_id = {p.name: p for p in doc_dirs}
    no_analysis_rows = [
        {
            "doc_id": str(row.get("doc_id") or ""),
            "title": str(row.get("title") or ""),
            "source": str(row.get("source") or ""),
            "partial_state": _incomplete_doc_state(doc_by_id.get(str(row.get("doc_id") or ""), corpus_dir / str(row.get("doc_id") or "")))[0],
            "next_action": _incomplete_doc_state(doc_by_id.get(str(row.get("doc_id") or ""), corpus_dir / str(row.get("doc_id") or "")))[1],
        }
        for row in rows
        if row.get("status") == STATUS_NO_DATA
    ]
    pending_upload_docs = [
        p.name
        for p in doc_dirs
        if (p / "analysis.json").exists() and not (p / "sanity_record.json").exists()
    ][:25]
    enrichment_attention_rows = [
        {
            "doc_id": str(row.get("doc_id") or ""),
            "title": str(row.get("title") or ""),
            "pending": int(row.get("pending") or 0),
            "approved_unpushed": int(row.get("approved_unpushed") or 0),
            "next_action": (
                f"Review {int(row.get('pending') or 0)} pending proposal(s)"
                if int(row.get("pending") or 0)
                else f"Push {int(row.get('approved_unpushed') or 0)} approved proposal(s)"
            ),
        }
        for row in rows
        if int(row.get("pending") or 0) or int(row.get("approved_unpushed") or 0)
    ][:50]

    return {
        "path": str(corpus_dir),
        "exists": corpus_dir.exists(),
        "documents": len(doc_dirs),
        "analyzed": analyzed,
        "incomplete": len(doc_dirs) - analyzed,
        "uploaded": uploaded,
        "pending_upload": max(analyzed - uploaded, 0),
        "source_offload_imported": offload_imported,
        "with_archive_summary": with_summary,
        "missing_archive_summary": max(len(doc_dirs) - with_summary, 0),
        "stale_archive_summary_count": len(stale_summary_docs),
        "stale_archive_summary_docs": stale_summary_docs[:25],
        "latest_source_mtime": latest_source_mtime,
        "readiness": dict(sorted(status_counts.items())),
        "incomplete_by_state": dict(sorted(Counter(row["partial_state"] for row in no_analysis_rows).items())),
        "readiness_rows": len(rows),
        "blocker_count": blockers,
        "quality_count": quality,
        "pending_enrichment_proposals": pending,
        "approved_unpushed_proposals": approved_unpushed,
        "no_analysis_docs": status_counts.get(STATUS_NO_DATA, 0),
        "no_analysis_doc_rows": no_analysis_rows[:25],
        "pending_upload_docs": pending_upload_docs,
        "enrichment_attention_rows": enrichment_attention_rows,
    }


def _source_offload_health(config, *, source_offload_root: Path | str | None = None) -> dict:
    root = Path(source_offload_root).expanduser() if source_offload_root else Path(config.exports_dir) / "source_offload"
    by_state: dict[str, int] = {state: 0 for state in LIFECYCLE_STATES}
    packages_by_state: dict[str, list[dict]] = {state: [] for state in LIFECYCLE_STATES}
    inconsistent: list[dict] = []
    returned_wrong_folder: list[dict] = []
    failed: list[str] = []
    failed_reports: list[dict] = []

    if root.exists():
        for state in LIFECYCLE_STATES:
            state_dir = root / state
            if not state_dir.exists():
                continue
            for pkg in sorted(state_dir.iterdir()):
                if not pkg.is_dir() or pkg.name.startswith("."):
                    continue
                by_state[state] += 1
                if state == "failed":
                    failed.append(pkg.name)
                    failed_reports.append(_failed_source_worker_report(pkg))
                manifest_state = ""
                manifest_error = ""
                if (pkg / SOURCE_MANIFEST_NAME).exists():
                    try:
                        manifest_state = load_source_manifest(pkg).lifecycle_state
                    except Exception as exc:  # noqa: BLE001
                        manifest_error = str(exc)
                else:
                    manifest_error = "source_manifest_not_found"
                packages_by_state[state].append({
                    "package_id": pkg.name,
                    "folder_state": state,
                    "manifest_state": manifest_state,
                    "kind": "ingest_result" if (pkg / INGEST_RESULT_MANIFEST_NAME).exists() else "source_package",
                    "path": str(pkg),
                    "error": manifest_error,
                })
                if manifest_error or (manifest_state and manifest_state != state):
                    inconsistent.append({
                        "package_id": pkg.name,
                        "folder_state": state,
                        "manifest_state": manifest_state,
                        "error": manifest_error,
                    })
                if state not in {"outbox", "imported", "archive"} and (pkg / INGEST_RESULT_MANIFEST_NAME).exists():
                    returned_wrong_folder.append({
                        "package_id": pkg.name,
                        "folder_state": state,
                        "manifest_state": manifest_state,
                    })

    return {
        "root": str(root),
        "exists": root.exists(),
        "by_state": by_state,
        "packages_by_state": packages_by_state,
        "failed_packages": failed,
        "failed_count": len(failed),
        "failed_reports": failed_reports,
        "inconsistent": inconsistent,
        "inconsistent_count": len(inconsistent),
        "returned_wrong_folder": returned_wrong_folder,
        "returned_wrong_folder_count": len(returned_wrong_folder),
    }


def _source_manifest_item_map(pkg: Path) -> dict[str, dict]:
    manifest = _read_json(pkg / SOURCE_MANIFEST_NAME, {})
    items = manifest.get("items") if isinstance(manifest, dict) else []
    if not isinstance(items, list):
        return {}
    return {
        str(item.get("doc_id") or ""): item
        for item in items
        if isinstance(item, dict) and item.get("doc_id")
    }


def _failed_source_worker_report(pkg: Path) -> dict:
    """Summarise a failed source-worker package without exposing raw text."""
    report = _read_json(pkg / "worker_report.json", {})
    source_by_doc = _source_manifest_item_map(pkg)
    docs: list[dict] = []
    if isinstance(report, dict):
        for doc in report.get("documents") or []:
            if not isinstance(doc, dict):
                continue
            doc_id = str(doc.get("doc_id") or "")
            status = str(doc.get("status") or "")
            if status == "succeeded":
                continue
            src = source_by_doc.get(doc_id, {})
            docs.append({
                "doc_id": doc_id,
                "queue_item_id": str(src.get("queue_item_id") or ""),
                "source_url": str(src.get("url") or ""),
                "status": status or "omitted",
                "error": str(doc.get("error") or "unknown_failure"),
            })
    return {
        "package_id": pkg.name,
        "worker_status": str(report.get("worker_status") or "") if isinstance(report, dict) else "",
        "docs": docs,
    }


def _archive_rows(folder: Path) -> list[dict]:
    rows: list[dict] = []
    if not folder.exists():
        return rows
    for archive in sorted(folder.glob(f"*{ARCHIVE_SUFFIX}")):
        if archive.name.startswith("."):
            continue
        row = {
            "archive": str(archive),
            "package_id": archive.name.removesuffix(ARCHIVE_SUFFIX),
            "checksum_ok": False,
            "manifest_state": "",
            "error": "",
        }
        try:
            info = inspect_source_archive(archive)
            row["package_id"] = info.get("package_id", row["package_id"])
            row["manifest_state"] = info.get("manifest_state", "")
            row["checksum_ok"] = True
        except Exception as exc:  # noqa: BLE001
            row["error"] = str(exc)
        rows.append(row)
    return rows


def _transfer_health(*, mac_studio: bool = False, transfer_root: Path | str | None = None) -> dict:
    root = _transfer_root(mac_studio=mac_studio, transfer_root=transfer_root)
    incoming = root / "to-mac-studio"
    returned = root / "from-mac-studio"
    incoming_archives = _archive_rows(incoming)
    returned_archives = _archive_rows(returned)
    direct_incoming = []
    if incoming.exists():
        direct_incoming = [
            {"package_id": p.name, "path": str(p)}
            for p in sorted(incoming.iterdir())
            if p.is_dir()
            and not p.name.startswith(".")
            and p.name not in {"old", "to-mac-studio", "from-mac-studio"}
        ]
    return {
        "root": str(root),
        "exists": root.exists(),
        "to_mac_studio": str(incoming),
        "from_mac_studio": str(returned),
        "incoming_archive_count": len(incoming_archives),
        "returned_archive_count": len(returned_archives),
        "incoming_archives": incoming_archives,
        "returned_archives": returned_archives,
        "direct_incoming_folders": direct_incoming,
        "direct_incoming_folder_count": len(direct_incoming),
    }


def _knowledge_health(config) -> dict:
    root = Path(config.exports_dir) / KNOWLEDGE_EXPORT_DIR
    profiles = root / DOCUMENT_PROFILES_JSONL
    nodes = root / NODES_CSV
    edges = root / EDGES_CSV
    graph_path = root / GRAPH_JSON
    graph = _read_json(graph_path, {})
    graph_nodes = graph.get("nodes") if isinstance(graph.get("nodes"), list) else []
    graph_edges = graph.get("edges") if isinstance(graph.get("edges"), list) else []
    missing = [
        path.name for path in (profiles, nodes, edges, graph_path)
        if not path.exists()
    ]
    evidence_strength = Counter(
        str(edge.get("evidence_strength") or "") for edge in graph_edges
        if isinstance(edge, dict)
    )
    return {
        "root": str(root),
        "exists": root.exists(),
        "missing_files": missing,
        "document_profiles_count": _count_jsonl(profiles),
        "document_profiles_mtime": _mtime(profiles),
        "nodes_mtime": _mtime(nodes),
        "edges_mtime": _mtime(edges),
        "graph_mtime": _mtime(graph_path),
        "node_count": len(graph_nodes),
        "edge_count": len(graph_edges),
        "evidence_strength": dict(sorted(evidence_strength.items())),
    }


def build_system_health(
    config,
    *,
    mac_studio: bool = False,
    source_offload_root: Path | str | None = None,
    transfer_root: Path | str | None = None,
) -> dict:
    """Build a local health report for corpus/offload/transfer/KG state."""
    corpus = _corpus_health(config)
    source_offload = _source_offload_health(config, source_offload_root=source_offload_root)
    transfer = _transfer_health(mac_studio=mac_studio, transfer_root=transfer_root)
    knowledge = _knowledge_health(config)

    blockers: list[str] = []
    actions: list[str] = []
    notes: list[str] = []

    if not corpus["exists"]:
        blockers.append(f"Corpus directory missing: {corpus['path']}")
    if source_offload["inconsistent_count"]:
        blockers.append(f"{source_offload['inconsistent_count']} source-offload package(s) have folder/manifest drift.")
    if source_offload["returned_wrong_folder_count"]:
        blockers.append(f"{source_offload['returned_wrong_folder_count']} returned source package(s) are not in outbox.")
    if transfer["direct_incoming_folder_count"]:
        actions.append(
            f"{transfer['direct_incoming_folder_count']} direct package folder(s) in transfer/to-mac-studio; prefer .tar.gz + .sha256 archives."
        )
    if source_offload["failed_count"]:
        details = []
        for report in source_offload.get("failed_reports", [])[:3]:
            docs = report.get("docs") or []
            if docs:
                first = docs[0]
                label = first.get("queue_item_id") or first.get("doc_id") or "unknown_doc"
                err = str(first.get("error") or "").splitlines()[0]
                details.append(f"{report.get('package_id')}:{label}:{err}")
            else:
                details.append(str(report.get("package_id") or "unknown_package"))
        suffix = f" ({'; '.join(details)})" if details else ""
        actions.append(f"{source_offload['failed_count']} source-offload package(s) are in failed/{suffix}.")
    if corpus["pending_upload"]:
        actions.append(f"{corpus['pending_upload']} analyzed corpus doc(s) are not uploaded.")
    if corpus["pending_enrichment_proposals"]:
        actions.append(f"{corpus['pending_enrichment_proposals']} enrichment proposal(s) await review.")
    if corpus["approved_unpushed_proposals"]:
        actions.append(f"{corpus['approved_unpushed_proposals']} approved proposal(s) are not pushed.")
    if knowledge["missing_files"]:
        actions.append(f"Knowledge exports missing: {', '.join(knowledge['missing_files'])}.")
    if knowledge["document_profiles_count"] and knowledge["document_profiles_count"] != corpus["documents"]:
        actions.append(
            f"document_profiles.jsonl has {knowledge['document_profiles_count']} profile(s), corpus has {corpus['documents']} doc folder(s); refresh summaries."
        )
    if corpus["missing_archive_summary"]:
        actions.append(f"{corpus['missing_archive_summary']} corpus doc(s) are missing archive_summary.json; refresh profiles.")
    if corpus["stale_archive_summary_count"]:
        actions.append(f"{corpus['stale_archive_summary_count']} archive_summary.json sidecar(s) are older than their source artifacts; refresh profiles.")
    if knowledge["document_profiles_mtime"] and corpus["latest_source_mtime"] > knowledge["document_profiles_mtime"]:
        actions.append("document_profiles.jsonl is older than corpus source artifacts; refresh profiles.")
    if knowledge["graph_mtime"] and knowledge["document_profiles_mtime"] > knowledge["graph_mtime"]:
        actions.append("Knowledge graph is older than document_profiles.jsonl; refresh the graph export.")
    if knowledge["edge_count"] and knowledge["evidence_strength"].get("", 0):
        actions.append("Knowledge graph is missing edge evidence-strength labels; refresh the graph export.")
    if corpus["no_analysis_docs"]:
        notes.append(f"{corpus['no_analysis_docs']} corpus folder(s) have no analysis.json yet.")

    if blockers:
        status = "blocked"
    elif actions:
        status = "needs_attention"
    else:
        status = "ready"

    return {
        "status": status,
        "blockers": blockers,
        "actions": actions,
        "notes": notes,
        "corpus": corpus,
        "source_offload": source_offload,
        "transfer": transfer,
        "knowledge": knowledge,
    }
