"""
SurvivingSOGICE — Streamlit researcher UI.

Run with:
  cd runner && streamlit run app.py

Pages:
  Dashboard        — local/server status and corpus counters
  Ingest Workbench — run intake, extraction, analysis, JSON review, upload
  Document List    — browse locally saved documents with Sanity status
  Pending Upload   — docs saved locally but not yet pushed to Sanity
  Lexicon          — inspect Sanity lexicon entries
  Tag Registry     — inspect/edit local tag vocabulary used for enrichment hints
  Activity Log     — inspect local document audit trails
  Guide            — workflow guide and troubleshooting
  Model Routing    — spec sheet: which model for which document type
  Triage Tool      — paste a snippet and get a model recommendation
"""
from __future__ import annotations
from collections import Counter
import difflib
import hashlib
import json
import os
import re
import shutil
import shlex
import signal
import subprocess
import sys
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

# Streamlit puts the script directory (`runner/`) on sys.path. If that remains
# there, modules like `pipeline.triage` can be imported outside the `runner`
# package, breaking their relative imports. Keep only the project root.
_runner_dir = Path(__file__).resolve().parent
_project_root = Path(__file__).resolve().parent.parent
_legacy_vocab_dir = Path(
    os.getenv(
        "SOGICE_LEGACY_VOCAB_DIR",
        str(Path.home() / "Library/CloudStorage/OneDrive-UniversityofBergen"
            "/SurvivingSOGICE/SurvivingSOGICE_Tagger/Old_Artifact_Bakcup"),
    )
)
sys.path[:] = [
    p for p in sys.path
    if Path(p or os.getcwd()).resolve() != _runner_dir
]
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

import streamlit as st

# ---------------------------------------------------------------------------
# Config bootstrap (works without a running .env if keys are missing)
# ---------------------------------------------------------------------------

def _load_config_safe():
    try:
        from runner.config import load_config
        return load_config()
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Page routing
# ---------------------------------------------------------------------------

def main():
    st.set_page_config(
        page_title="SurvivingSOGICE Research",
        page_icon="📚",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    st.sidebar.title("SurvivingSOGICE")
    st.sidebar.markdown("*PhD research archive*")
    st.sidebar.divider()

    pages = [
        "Dashboard",
        "Review Inbox",
        "Corpus Intelligence",
        "Source Identity",
        "Source Queue",
        "Source Offload",
        "Ingest Workbench",
        "Document List",
        "Pending Upload",
        "Media Review",
        "Lexicon",
        "Tag Registry",
        "Testimony Review",
        "Activity Log",
        "Guide",
        "Model Routing",
        "Triage Tool",
        "Mac Studio Node",
        "Mac Studio Worker",
        "Offload Packages",
        "Seed Data",
    ]
    if st.session_state.get("page") not in pages:
        st.session_state["page"] = pages[0]
    requested_page = st.session_state.pop("_nav_to", None)
    if requested_page in pages:
        st.session_state["page"] = requested_page
        st.session_state["nav_page"] = requested_page

    page = st.sidebar.radio(
        "Navigate",
        pages,
        index=pages.index(st.session_state.get("page", pages[0])),
        key="nav_page",
        label_visibility="collapsed",
    )
    st.session_state["page"] = page

    st.sidebar.divider()
    st.sidebar.caption(
        "CLI commands:\n"
        "```\npython -m runner ingest <url>\n"
        "python -m runner verify\n"
        "python -m runner enrich <doc_id>\n```"
    )

    if page == "Dashboard":
        page_dashboard()
    elif page == "Review Inbox":
        page_review_inbox()
    elif page == "Corpus Intelligence":
        page_corpus_intelligence()
    elif page == "Source Identity":
        from runner.source_identity_ui import render_source_identity_page

        config = _load_config_safe()
        if config:
            render_source_identity_page(config)
        else:
            st.error("Could not load local corpus configuration.")
    elif page == "Source Queue":
        page_source_queue()
    elif page == "Source Offload":
        page_source_offload()
    elif page == "Ingest Workbench":
        page_ingest_workbench()
    elif page == "Document List":
        page_document_list()
    elif page == "Pending Upload":
        page_pending_upload()
    elif page == "Media Review":
        page_media_review()
    elif page == "Lexicon":
        page_lexicon()
    elif page == "Tag Registry":
        page_tag_registry()
    elif page == "Testimony Review":
        page_testimony_review()
    elif page == "Activity Log":
        page_activity_log()
    elif page == "Guide":
        page_guide()
    elif page == "Model Routing":
        page_model_routing()
    elif page == "Triage Tool":
        page_triage_tool()
    elif page == "Mac Studio Node":
        page_mac_studio_node()
    elif page == "Mac Studio Worker":
        page_mac_studio_worker()
    elif page == "Offload Packages":
        page_offload_packages()
    elif page == "Seed Data":
        page_seed_data()


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

def page_dashboard():
    st.title("Dashboard")

    config = _load_config_safe()
    if not config:
        st.error("Could not load config. Check runner/.env.")
        return

    # --- Corpus overview (single block, replaces old _corpus_stats row) ---
    st.subheader("Corpus Overview")
    pending_upload_count = 0
    try:
        from runner.pipeline.upload import corpus_stats
        s = corpus_stats(config)
        pending_upload_count = int(s.get("pending_upload", 0))
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Total analysed", s["total"])
        c2.metric("Uploaded to Sanity", s["uploaded"])
        c3.metric("Pending upload", pending_upload_count)
        c4.metric("Enriched locally", _corpus_stats(config.corpus_dir)["enriched"])
        if s.get("by_type"):
            with st.expander("By document type"):
                for k, v in sorted(s["by_type"].items(), key=lambda x: -x[1]):
                    st.write(f"**{k}**: {v}")
        if s.get("by_confidence"):
            bc1, bc2, bc3 = st.columns(3)
            bc1.metric("High confidence", s["by_confidence"].get("high", 0))
            bc2.metric("Medium confidence", s["by_confidence"].get("medium", 0))
            bc3.metric("Low confidence", s["by_confidence"].get("low", 0))
        if s.get("low_confidence_docs"):
            with st.expander(f"Low confidence docs ({len(s['low_confidence_docs'])}) — candidates for re-analysis"):
                for did in s["low_confidence_docs"][:20]:
                    st.write(f"- `{did}`")
    except Exception as _e:
        # Fallback to simple scan if pipeline import fails
        stats = _corpus_stats(config.corpus_dir)
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Local documents", stats["total"])
        c2.metric("Uploaded", stats["uploaded"])
        c3.metric("Pending upload", stats["pending"])
        c4.metric("Enriched", stats["enriched"])
        pending_upload_count = int(stats.get("pending", 0))
        st.caption(f"Extended stats unavailable: {_e}")

    st.subheader("Services")
    s1, s2, s3, s4 = st.columns(4)
    s1.metric("Ollama", _service_status(config.ollama_base_url))
    s2.metric("LiteLLM", _service_status(config.litelm_base_url) if config.litelm_base_url else "not set")
    s3.metric("Sanity", "configured" if config.sanity_project_id and config.sanity_write_token else "missing")
    s4.metric("Supabase", "configured" if config.supabase_url and config.supabase_service_key else "missing")

    st.subheader("How this app fits")
    st.info(
        "This Streamlit app is the researcher cockpit: use Ingest Workbench to run "
        "the pipeline, edit JSON, upload records, inspect terms, and troubleshoot "
        "local/Sanity/Supabase state."
    )

    _render_ingestion_operations_panel(config)

    if pending_upload_count:
        st.warning(f"{pending_upload_count} document(s) are saved locally but not uploaded yet. Go to Pending Upload.")

    _render_dashboard_research_worklist(config)
    _render_system_health_panel(config)
    _dashboard_ingest_readiness(config)

    st.subheader("Corpus Sets")
    sets = _app_list_document_sets(config.corpus_dir)
    if not sets:
        st.caption("No saved document sets yet. Create one from Document List.")
    else:
        rows = []
        for item in sets:
            doc_ids = item.get("docIds", [])
            annotated_profiles = set()
            last_annotation = ""
            for doc_id in doc_ids:
                ann_dir = config.corpus_dir / doc_id / "research_annotations"
                if not ann_dir.exists():
                    continue
                for path in ann_dir.glob("*.json"):
                    try:
                        ann = json.loads(path.read_text(encoding="utf-8"))
                    except Exception:
                        continue
                    annotated_profiles.add(ann.get("profile") or path.stem)
                    generated = ann.get("generatedAt", "")
                    if generated > last_annotation:
                        last_annotation = generated
            rows.append({
                "Set": item.get("name", ""),
                "Docs": len(doc_ids),
                "Profiles annotated": ", ".join(sorted(annotated_profiles)) or "—",
                "Last annotation": last_annotation[:19] if last_annotation else "—",
            })
        st.dataframe(rows, hide_index=True, width="stretch")

    # ── Setup checklist ───────────────────────────────────────────────────
    st.subheader("Setup status")
    checks = []
    checks.append(("Sanity credentials", bool(config.sanity_project_id and config.sanity_write_token)))
    checks.append(("Supabase credentials", bool(config.supabase_url and config.supabase_service_key)))
    checks.append(("LiteLLM proxy URL", bool(config.litelm_base_url)))
    checks.append(("Anthropic API key", bool(config.anthropic_api_key)))

    litelm_ok = _service_status(config.litelm_base_url) == "online" if config.litelm_base_url else False
    ollama_ok  = _service_status(config.ollama_base_url) == "online"
    checks.append(("Ollama reachable (embedding)", ollama_ok))
    checks.append(("LiteLLM reachable (analysis)", litelm_ok))

    all_ok = all(ok for _, ok in checks)
    cols = st.columns(3)
    for i, (label, ok) in enumerate(checks):
        cols[i % 3].markdown(f"{'✅' if ok else '❌'} {label}")

    if not all_ok:
        st.caption("Run doctor check in Mac Studio Node for detailed fix instructions.")

    # ── Verify: live Sanity + Supabase record counts ──────────────────────
    st.subheader("Live record counts (Verify)")
    if st.button("▶ Verify Sanity + Supabase", key="verify_btn"):
        import httpx as _httpx
        errors = []

        # Sanity counts
        st.markdown("**Sanity**")
        types = [
            ("lexiconEntry","Terms"), ("tacticEntry","Tactics"), ("practiceEntry","Practices"),
            ("tagRegistry","Tag Registry"), ("organization","Orgs/Networks"), ("person","Persons"),
            ("legalDefinition","Laws"), ("exclusionClause","Excl. Clauses"), ("event","Events"),
            ("sogiceDocument","Documents"),
        ]
        base_s = (
            f"https://{config.sanity_project_id}.api.sanity.io"
            f"/v2024-01-01/data/query/{config.sanity_dataset}"
        )
        headers_s = {"Authorization": f"Bearer {config.sanity_write_token}"}
        s_cols = st.columns(5)
        for i, (t, label) in enumerate(types):
            try:
                r = _httpx.get(base_s, params={"query": f'count(*[_type=="{t}"])'}, headers=headers_s, timeout=8)
                n = r.json().get("result","?") if r.status_code == 200 else f"err {r.status_code}"
            except Exception as exc:
                n = "unreachable"
                errors.append(f"Sanity {t}: {exc}")
            s_cols[i % 5].metric(label, n)

        # Supabase count
        st.markdown("**Supabase**")
        try:
            from runner.clients.supabase import count_embeddings
            emb_count = count_embeddings(config)
            st.metric("document_embeddings rows", emb_count)
        except Exception as exc:
            st.warning(f"Could not count Supabase rows: {exc}")

        if errors:
            with st.expander("Errors"):
                for e in errors:
                    st.caption(e)
        else:
            st.success("Verify complete — all services responded.")


def _dashboard_action_suggested_page(action: str) -> str:
    text = str(action or "").lower()
    if "tag registry" in text or "registry not found" in text or "registry is unavailable" in text:
        return "Tag Registry"
    if "enrichment proposal" in text or "review enrichment" in text or "lexicon" in text:
        return "Lexicon"
    if "transfer/" in text or "source-offload" in text or "source offload" in text or "package" in text:
        return "Source Offload"
    if "queue item" in text or "review-flagged queue" in text or "safe for source" in text:
        return "Source Queue"
    if (
        "incomplete" in text
        or "zero extracted text" in text
        or "zero-text" in text
        or "missing at least one core tag" in text
        or "knowledge" in text
        or "archive summary" in text
    ):
        return "Corpus Intelligence"
    if "upload" in text:
        return "Document List"
    return "Dashboard"


def _dashboard_digest_action_rows(preview: dict, *, limit: int = 8) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for idx, action in enumerate(preview.get("next_actions") or [], start=1):
        if len(rows) >= limit:
            break
        text = str(action).strip()
        if not text:
            continue
        rows.append({
            "Order": str(idx),
            "Next action": text,
            "Suggested page": _dashboard_action_suggested_page(text),
        })
    return rows


def _dashboard_worklist_pages(rows: list[dict[str, str]]) -> list[str]:
    page_order = [
        "Source Offload", "Lexicon", "Corpus Intelligence", "Tag Registry",
        "Source Queue", "Document List", "Review Inbox", "Dashboard",
    ]
    found = {row.get("Suggested page", "") for row in rows}
    return [page for page in page_order if page in found and page != "Dashboard"]


def _safe_git_value(args: list[str], *, cwd: Path | None = None) -> str:
    try:
        proc = subprocess.run(
            ["git", *args],
            cwd=cwd or _project_root,
            capture_output=True,
            text=True,
            timeout=2,
        )
    except Exception:
        return ""
    if proc.returncode != 0:
        return ""
    return proc.stdout.strip()


def _runtime_environment_snapshot(config) -> dict[str, str | int]:
    status = _safe_git_value(["status", "--short"])
    dirty_files = len([line for line in status.splitlines() if line.strip()])
    return {
        "repo": str(_project_root),
        "branch": _safe_git_value(["rev-parse", "--abbrev-ref", "HEAD"]) or "unknown",
        "commit": _safe_git_value(["rev-parse", "--short", "HEAD"]) or "unknown",
        "dirty_files": dirty_files,
        "python": sys.executable,
        "cwd": os.getcwd(),
        "corpus_dir": str(getattr(config, "corpus_dir", "")),
        "exports_dir": str(getattr(config, "exports_dir", "")),
        "app_jobs_dir": str(_project_root / "exports" / "app_jobs"),
    }


def _operation_boundary_rows() -> list[dict[str, str]]:
    return [
        {
            "State / artifact": "Source Queue item",
            "Not the same as": "Ingested corpus document",
            "Researcher action": "Triage, approve for offload, or hold for manual capture.",
        },
        {
            "State / artifact": "Source offload package",
            "Not the same as": "Imported analysis result",
            "Researcher action": "Unpack/run/archive on Mac Studio, then import returned outbox.",
        },
        {
            "State / artifact": "Imported corpus document",
            "Not the same as": "Published Sanity/Supabase record",
            "Researcher action": "Review readiness, fix blockers, then upload explicitly.",
        },
        {
            "State / artifact": "Longform sidecars/review",
            "Not the same as": "Canonical analysis.json replacement",
            "Researcher action": "Use as deeper evidence and candidate proposal review material.",
        },
        {
            "State / artifact": "Tag Registry hint",
            "Not the same as": "Approved enrichment proposal or Sanity registry entry",
            "Researcher action": "Treat as a connection hint until reviewed with source evidence.",
        },
        {
            "State / artifact": "Evidence graph export",
            "Not the same as": "Public graph / chatbot truth layer",
            "Researcher action": "Publish only reviewed/uploaded/quote-backed subsets later.",
        },
    ]


def _recent_app_job_log_rows(limit: int = 8, log_dir: Path | None = None) -> list[dict[str, str | int]]:
    root = log_dir or (_project_root / "exports" / "app_jobs")
    if not root.exists():
        return []
    rows: list[dict[str, str | int]] = []
    paths = sorted(
        [path for path in root.glob("*.log") if path.is_file()],
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    for path in paths[: max(0, limit)]:
        try:
            stat = path.stat()
        except OSError:
            continue
        rows.append({
            "name": path.name,
            "modified": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(timespec="seconds"),
            "bytes": stat.st_size,
            "path": str(path),
            "tail": _job_log_tail(path, limit=1200),
        })
    return rows


def _render_ingestion_operations_panel(config) -> None:
    st.subheader("Operations Control Plane")
    st.warning(
        "The biggest hidden risk is not a single broken extractor or model. "
        "This is now a research operations system: queue state, package state, "
        "corpus state, review state, and publication state are separate. Most "
        "future breakage will come from mixing those states or losing sight of "
        "which machine/path/job produced an artifact."
    )

    _render_active_app_job_lock_panel(expanded=False)

    with st.expander("State boundaries that prevent accidental trust leaks", expanded=False):
        st.dataframe(_operation_boundary_rows(), hide_index=True, width="stretch")

    with st.expander("Runtime, paths, and git state", expanded=False):
        snapshot = _runtime_environment_snapshot(config)
        st.dataframe(
            [{"Setting": key, "Value": value} for key, value in snapshot.items()],
            hide_index=True,
            width="stretch",
        )
        if int(snapshot.get("dirty_files", 0) or 0):
            st.caption(
                "Dirty files are expected during active development, but record them before "
                "interpreting a run as reproducible."
            )

    logs = _recent_app_job_log_rows()
    with st.expander("Recent background job logs", expanded=False):
        if not logs:
            st.caption("No app job logs found yet.")
        else:
            st.dataframe(
                [
                    {key: row[key] for key in ("name", "modified", "bytes", "path")}
                    for row in logs
                ],
                hide_index=True,
                width="stretch",
            )
            chosen = st.selectbox(
                "Inspect log tail",
                [str(row["name"]) for row in logs],
                key="dashboard_recent_log_tail",
            )
            selected = next((row for row in logs if row["name"] == chosen), None)
            if selected:
                st.code(str(selected.get("tail") or ""), language="text")

    runbook = _project_root / "docs" / "INGESTION_OPERATIONS_RUNBOOK.md"
    st.caption(f"Runbook: `{runbook}`")


def _render_dashboard_research_worklist(config) -> None:
    st.subheader("Research Worklist")
    paths = _latest_research_digest_paths(config)
    preview = _research_digest_preview(paths["json"])
    if preview:
        w1, w2, w3 = st.columns(3)
        w1.metric("Digest status", preview.get("status") or "unknown")
        w2.metric("Safe queue candidates", preview.get("safe_candidates", 0))
        w3.metric("Review-flagged queue", preview.get("review_flagged", 0))
        st.caption(f"Latest digest: `{paths['markdown']}`")
        rows = _dashboard_digest_action_rows(preview)
        if rows:
            st.dataframe(rows, hide_index=True, width="stretch")
            pages = _dashboard_worklist_pages(rows)
            if pages:
                st.caption("Jump to the pages that match today’s worklist:")
                cols = st.columns(min(len(pages), 4))
                for idx, page_name in enumerate(pages):
                    if cols[idx % len(cols)].button(f"Open {page_name}", key=f"dashboard_open_{page_name}"):
                        st.session_state["_nav_to"] = page_name
                        st.rerun()
        else:
            st.success("No digest next actions found.")
    else:
        st.info("No research digest found yet. Generate one to get a daily worklist.")

    c1, c2 = st.columns([1, 3])
    if c1.button("Refresh worklist", key="dashboard_refresh_research_digest"):
        try:
            result = _run_research_digest_action(config)
            citation_counts = result.get("citation_units", {}).get("counts", {})
            st.success(
                f"Refreshed {result['profiles']['count']} profile(s), "
                f"{result['graph']['edge_count']} graph edge(s), "
                f"{citation_counts.get('written', 0)} citation sidecar(s), and the digest."
            )
            st.caption(f"Digest: `{result['digest']['markdown_path']}`")
        except Exception as exc:
            st.error(f"Could not refresh research worklist: {exc}")
    c2.caption("This refreshes citation sidecars, archive summaries, the evidence graph, the quality audit, and the digest.")


def _render_system_health_panel(config, *, mac_studio: bool = False, source_offload_root=None, transfer_root=None):
    st.subheader("System Health")
    try:
        from runner.pipeline.system_health import build_system_health
        report = build_system_health(
            config,
            mac_studio=mac_studio,
            source_offload_root=source_offload_root,
            transfer_root=transfer_root,
        )
    except Exception as exc:
        st.warning(f"System health check unavailable: {exc}")
        return

    status = report.get("status", "unknown")
    if status == "ready":
        st.success("System state looks coherent. No blockers found.")
    elif status == "blocked":
        st.error("System state has blockers. Fix these before relying on import/export results.")
    else:
        st.warning("System state needs attention, but no hard blocker was found.")

    corpus = report.get("corpus", {})
    source = report.get("source_offload", {})
    transfer = report.get("transfer", {})
    knowledge = report.get("knowledge", {})
    c1, c2, c3, c4, c5, c6 = st.columns(6)
    c1.metric("Corpus docs", corpus.get("documents", 0))
    c2.metric("Pending upload", corpus.get("pending_upload", 0))
    c3.metric("Failed offload packages", source.get("failed_count", 0))
    c4.metric("Returned archives", transfer.get("returned_archive_count", 0))
    c5.metric("Stale summaries", corpus.get("stale_archive_summary_count", 0))
    c6.metric("KG edges", knowledge.get("edge_count", 0))

    blockers = report.get("blockers") or []
    actions = report.get("actions") or []
    notes = report.get("notes") or []
    if blockers or actions or notes:
        with st.expander("System health details", expanded=bool(blockers)):
            if blockers:
                st.markdown("**Blockers**")
                for item in blockers:
                    st.error(item)
            if actions:
                st.markdown("**Next actions**")
                for item in actions:
                    st.info(item)
            if notes:
                st.markdown("**Notes**")
                for item in notes:
                    st.caption(item)
            failed_rows = _source_failed_report_rows(report)
            if failed_rows:
                st.markdown("**Failed source-worker documents**")
                st.dataframe(failed_rows, hide_index=True, width="stretch")
            source_package_rows = _system_health_source_package_rows(report)
            if source_package_rows:
                st.markdown("**Source-offload packages by lifecycle**")
                st.dataframe(source_package_rows, hide_index=True, width="stretch")
            no_analysis_rows = _system_health_corpus_rows(report, "no_analysis_doc_rows")
            if no_analysis_rows:
                st.markdown("**Corpus folders without analysis**")
                st.dataframe(no_analysis_rows, hide_index=True, width="stretch")
            enrichment_rows = _system_health_corpus_rows(report, "enrichment_attention_rows")
            if enrichment_rows:
                st.markdown("**Enrichment review queue**")
                st.dataframe(enrichment_rows, hide_index=True, width="stretch")
            direct_transfer_rows = _system_health_direct_transfer_rows(report)
            if direct_transfer_rows:
                st.markdown("**Direct transfer folders**")
                st.caption("These can work, but archive transfer is safer because it has a checksum.")
                st.dataframe(direct_transfer_rows, hide_index=True, width="stretch")


def _dashboard_ingest_readiness(config):
    st.subheader("Before Continuing Ingestion")
    docs = _load_local_docs(config.corpus_dir) if config.corpus_dir.exists() else []
    intel_rows = _corpus_intelligence_rows(config.corpus_dir) if config.corpus_dir.exists() else []
    gate = _proposal_gate_status(config.corpus_dir) if config.corpus_dir.exists() else {}

    missing_dates = [doc for doc in docs if not doc.get("publication_date")]
    embedding_gaps = [
        doc for doc in docs
        if not doc.get("embedding_ok") or doc.get("supabase_ok") is False
    ]
    missing_recommended = [
        row for row in intel_rows
        if row.get("missingRecommended")
    ]
    comment_gaps = [
        row for row in intel_rows
        if row.get("isMedia") and not row.get("commentsCollected")
    ]
    unresolved = sum(
        int(gate.get(key, 0))
        for key in gate
        if key.startswith("unresolved_")
    )
    approved_unpushed = sum(
        int(gate.get(key, 0))
        for key in gate
        if key.startswith("approved_unpushed_")
    )

    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Missing publication dates", len(missing_dates))
    c2.metric("Embedding/Supabase gaps", len(embedding_gaps))
    c3.metric("Recommended annotations missing", len(missing_recommended))
    c4.metric("Media comment gaps", len(comment_gaps))
    c5.metric("Enrichment queue items", unresolved + approved_unpushed)

    if any([missing_dates, embedding_gaps, missing_recommended, comment_gaps, unresolved, approved_unpushed]):
        with st.expander("Action checklist", expanded=True):
            rows = []
            if missing_dates:
                rows.append({
                    "Priority": "High",
                    "Issue": "Some records are missing publication dates.",
                    "Where to fix": "Document List -> expand record -> Edit dates and publication metadata.",
                    "Why": "Dates are central for public table, citation, chronology, and Sanity queries.",
                })
            if embedding_gaps:
                rows.append({
                    "Priority": "High",
                    "Issue": "Some records have missing local embeddings or Supabase rows.",
                    "Where to fix": "Document List -> Generate + push embedding.",
                    "Why": "Semantic search and corpus comparison depend on the vector store.",
                })
            if missing_recommended:
                rows.append({
                    "Priority": "Medium",
                    "Issue": "Recommended annotation profiles have not been run.",
                    "Where to fix": "Corpus Intelligence -> Annotation Coverage, or Media Review -> Annotations.",
                    "Why": "These are optional deeper research layers, but important before close reading/citation.",
                })
            if comment_gaps:
                rows.append({
                    "Priority": "Medium",
                    "Issue": "Media comments are not collected for some media records.",
                    "Where to fix": "Media Review -> Comments / Collect comments.",
                    "Why": "Comments are lower-trust context, but useful for reception and discovery.",
                })
            if unresolved or approved_unpushed:
                rows.append({
                    "Priority": "Medium",
                    "Issue": f"{unresolved} unresolved and {approved_unpushed} approved-not-pushed enrichment proposal(s).",
                    "Where to fix": "Lexicon -> Local Proposals.",
                    "Why": "Approved terms/entities/tactics should reach Sanity before relying on the living registry.",
                })
            st.dataframe(rows, hide_index=True, width="stretch")
    else:
        st.success("No major local logistics gaps found. You can continue ingestion.")


def _corpus_stats(corpus_dir: Path) -> dict[str, int]:
    stats = {"total": 0, "uploaded": 0, "pending": 0, "enriched": 0}
    if not corpus_dir.exists():
        return stats
    for doc_dir in corpus_dir.iterdir():
        if not doc_dir.is_dir() or not (doc_dir / "analysis.json").exists():
            continue
        stats["total"] += 1
        if (doc_dir / "sanity_record.json").exists():
            stats["uploaded"] += 1
        else:
            stats["pending"] += 1
        if (doc_dir / "enrichment.json").exists():
            stats["enriched"] += 1
    return stats


def _service_status(base_url: str) -> str:
    if not base_url:
        return "not set"
    try:
        import httpx
        response = httpx.get(base_url, timeout=2)
        return "online" if response.status_code < 500 else "error"
    except Exception:
        return "offline"


@st.cache_data(ttl=30, show_spinner=False)
def _litelm_status_cached(base_url: str) -> str:
    return _service_status(base_url)


# ---------------------------------------------------------------------------
# Review Inbox
# ---------------------------------------------------------------------------

def _render_inbox_row(row: dict) -> None:
    """Render one document as a compact row in the Review Inbox.

    Four columns: doc_id | title / source | next action | open button.
    No nested expanders, no colour-only meaning.
    """
    doc_id = row["doc_id"]
    title = row.get("title") or ""
    source = row.get("source") or ""
    next_action = row.get("next_action_title") or ""

    # Prefer preprocess/analysis title; fall back to source URL; last resort "—"
    display_text = title or source or "—"
    if len(display_text) > 80:
        display_text = display_text[:79] + "…"

    # Issue count summary
    count_parts = []
    if row.get("blocker_count"):
        count_parts.append(f"{row['blocker_count']} blocker(s)")
    if row.get("quality_count"):
        count_parts.append(f"{row['quality_count']} quality item(s)")
    if row.get("pending"):
        count_parts.append(f"{row['pending']} pending")
    if row.get("approved_unpushed"):
        count_parts.append(f"{row['approved_unpushed']} ready to push")
    count_text = " · ".join(count_parts) if count_parts else ""

    # One-line next-action hint: first blocker/quality title + count context
    if next_action and count_text:
        action_text = f"{next_action}  ({count_text})"
    elif next_action:
        action_text = next_action
    elif count_text:
        action_text = count_text
    else:
        action_text = "No outstanding items"

    c_id, c_title, c_action, c_btn = st.columns([1, 3, 3, 1])
    c_id.write(f"`{doc_id}`")
    c_title.write(display_text)
    c_action.caption(action_text)
    if c_btn.button("Open", key=f"inbox_open_{doc_id}"):
        _open_document_from_inbox(doc_id)
        st.rerun()


def _open_document_from_inbox(doc_id: str) -> None:
    """Route to Document List and make the selected document visible.

    Streamlit keeps widget state separately from our page state. Set both the
    sidebar radio key and the page key, and reset Document List filters so the
    searched document is not hidden by stale filter selections.
    """
    st.session_state["doc_list_search"] = doc_id
    st.session_state["doc_list_open_doc_id"] = doc_id
    st.session_state["doc_list_filter_type"] = []
    st.session_state["doc_list_filter_batch"] = []
    st.session_state["doc_list_filter_uploaded"] = "All"
    st.session_state["doc_list_filter_intensity"] = "All"
    st.session_state["_nav_to"] = "Document List"
    st.session_state["page"] = "Document List"


def page_review_inbox():
    st.title("Review Inbox")
    st.caption(
        "Document readiness plus optional exact batch-bound grouped dossiers. "
        "The existing corpus-wide queue remains the default. All checks read local files only; "
        "no network calls. "
        "Open a document to use the repair widgets (entity ID resolver, "
        "connection-type dropdown, Complement enrichment)."
    )

    config = _load_config_safe()
    if not config:
        st.error("Could not load config. Check runner/.env.")
        return

    corpus_dir = config.corpus_dir
    if not corpus_dir.exists():
        st.info(f"Corpus directory does not exist yet: {corpus_dir}")
        return

    try:
        from runner.review_inbox_ui import render_batch_review_inbox
        batch_scope = render_batch_review_inbox(config)
    except Exception as exc:
        st.error(f"Batch dossier review failed closed: {exc}")
        batch_scope = {"selected": False, "doc_ids": None, "label": "Entire corpus"}

    rows = collect_corpus_readiness(
        corpus_dir,
        config=config,
        doc_ids=batch_scope.get("doc_ids") if batch_scope.get("selected") else None,
    )
    if not rows:
        if batch_scope.get("selected"):
            st.info("The selected workflow has no linked local document directories yet.")
        else:
            st.info(
                "No documents found in local corpus. "
                "Run `python -m runner ingest <url>` to add one."
            )
        return

    if batch_scope.get("selected"):
        st.subheader(f"Document readiness · {batch_scope.get('label')}")
        st.caption(
            "The groups below are the existing Review Inbox, limited to the exact linked "
            "documents in this frozen workflow."
        )

    # ── Summary counts ────────────────────────────────────────────────────
    _counts = {
        STATUS_NEEDS_REVIEW: 0,
        STATUS_QUALITY: 0,
        STATUS_READY: 0,
        STATUS_NO_DATA: 0,
    }
    for _r in rows:
        _s = _r["status"]
        if _s in _counts:
            _counts[_s] += 1

    _sc1, _sc2, _sc3, _sc4, _sc5 = st.columns(5)
    _sc1.metric("Total", len(rows))
    _sc2.metric("🔴 Need review",    _counts[STATUS_NEEDS_REVIEW])
    _sc3.metric("🟡 Quality work",   _counts[STATUS_QUALITY])
    _sc4.metric("🟢 Ready to push",  _counts[STATUS_READY])
    _sc5.metric("⚪ No analysis",    _counts[STATUS_NO_DATA])

    if st.button("🔄 Refresh", key="inbox_refresh"):
        st.rerun()

    st.divider()

    # ── Groups ────────────────────────────────────────────────────────────
    _groups = [
        (
            STATUS_NEEDS_REVIEW,
            "🔴 Needs review before push",
            (
                "Hard blockers — resolve before running `push-enrichment`. "
                "Typical causes: `enrich_existing` proposal missing an entity ID, "
                "or an invalid network connection type."
            ),
        ),
        (
            STATUS_QUALITY,
            "🟡 Review / quality actions remain",
            (
                "No hard blockers, but review, push, or quality work remains. "
                "Includes: pending proposals, approved-unpushed proposals, "
                "missing date or language, enrichment not yet run."
            ),
        ),
        (
            STATUS_READY,
            "🟢 Ready to push",
            "No blockers, pending review, or outstanding quality gaps.",
        ),
        (
            STATUS_NO_DATA,
            "⚪ No analysis yet",
            (
                "No `analysis.json` found. "
                "Run `python -m runner ingest <url>` or re-open the document "
                "in the Ingest Workbench."
            ),
        ),
    ]

    for _status_code, _heading, _explain in _groups:
        _group_rows = [_r for _r in rows if _r["status"] == _status_code]
        if not _group_rows:
            continue

        st.subheader(f"{_heading} ({len(_group_rows)})")
        st.caption(_explain)

        # Column header row
        _hc1, _hc2, _hc3, _hc4 = st.columns([1, 3, 3, 1])
        _hc1.caption("**Doc ID**")
        _hc2.caption("**Title / source**")
        _hc3.caption("**Next action**")

        for _row in _group_rows:
            _render_inbox_row(_row)

        st.write("")  # spacer between groups

    st.divider()
    scope_label = str(batch_scope.get("label") or "Entire corpus")
    st.caption(
        f"Scanned {len(rows)} document(s) from `{corpus_dir}` · scope: `{scope_label}`"
    )


# ---------------------------------------------------------------------------
# Corpus Intelligence
# ---------------------------------------------------------------------------

def page_corpus_intelligence():
    st.title("Corpus Intelligence")
    st.caption(
        "Local corpus overview for sampling decisions, annotation planning, and spotting gaps before close reading."
    )

    config = _load_config_safe()
    if not config:
        st.error("Could not load config. Check runner/.env.")
        return
    if not config.corpus_dir.exists():
        st.info(f"Corpus directory does not exist yet: {config.corpus_dir}")
        return

    rows = _corpus_intelligence_rows(config.corpus_dir)
    if not rows:
        st.info("No analysed local documents found yet.")
        return

    import pandas as pd

    df = pd.DataFrame(rows)
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Documents", len(df))
    c2.metric("Media docs", int(df["isMedia"].sum()))
    c3.metric("Uploaded", int(df["uploaded"].sum()))
    c4.metric("With annotations", int((df["annotationCount"] > 0).sum()))

    _render_research_digest_panel(config)
    _render_knowledge_exports_panel(config)

    with st.expander("Filters", expanded=True):
        f1, f2, f3, f4 = st.columns(4)
        with f1:
            type_filter = st.multiselect("Type", sorted(x for x in df["type"].unique() if x))
        with f2:
            format_filter = st.multiselect("Format", sorted(x for x in df["format"].unique() if x))
        with f3:
            country_filter = st.multiselect(
                "Country",
                sorted({country for row in rows for country in row.get("countryList", []) if country}),
            )
        with f4:
            only_needs_annotation = st.checkbox("Needs recommended annotation", value=False)

    filtered = df
    if type_filter:
        filtered = filtered[filtered["type"].isin(type_filter)]
    if format_filter:
        filtered = filtered[filtered["format"].isin(format_filter)]
    if country_filter:
        filtered = filtered[
            filtered["countryList"].apply(lambda values: any(country in values for country in country_filter))
        ]
    if only_needs_annotation:
        filtered = filtered[filtered["missingRecommended"].astype(bool)]

    st.caption(f"Showing {len(filtered)} of {len(df)} documents")

    tab_breakdown, tab_sources, tab_annotations, tab_gap, tab_table = st.tabs(
        ["Breakdowns", "Sources", "Annotation Coverage", "Gaps", "Table"]
    )

    with tab_breakdown:
        left, right = st.columns(2)
        with left:
            st.subheader("Type x format")
            if not filtered.empty:
                st.dataframe(
                    pd.crosstab(filtered["type"], filtered["format"]),
                    width="stretch",
                )
        with right:
            st.subheader("Year distribution")
            year_counts = (
                filtered[filtered["year"] != ""]
                .groupby("year")
                .size()
                .reset_index(name="documents")
                .sort_values("year")
            )
            if not year_counts.empty:
                try:
                    st.bar_chart(year_counts, x="year", y="documents")
                except ModuleNotFoundError as exc:
                    if exc.name != "altair":
                        raise
                    st.dataframe(year_counts, hide_index=True, width="stretch")
                    st.caption(
                        "Chart fallback: install `altair` in the app environment to render the bar chart."
                    )
            else:
                st.caption("No publication years found in local metadata.")

        cc1, cc2 = st.columns(2)
        with cc1:
            st.subheader("Countries")
            countries = []
            for values in filtered["countryList"]:
                countries.extend(values)
            country_df = _count_frame(countries, "country", "documents", pd)
            st.dataframe(country_df, hide_index=True, width="stretch")
        with cc2:
            st.subheader("Upload and enrichment")
            st.dataframe(
                pd.DataFrame(
                    [
                        {"State": "Uploaded", "Documents": int(filtered["uploaded"].sum())},
                        {"State": "Local only", "Documents": int((~filtered["uploaded"]).sum())},
                        {"State": "Enriched", "Documents": int(filtered["hasEnrichment"].sum())},
                        {"State": "Not enriched", "Documents": int((~filtered["hasEnrichment"]).sum())},
                    ]
                ),
                hide_index=True,
                width="stretch",
            )

    with tab_sources:
        s1, s2 = st.columns(2)
        with s1:
            st.subheader("Creators / channels")
            st.dataframe(
                _count_frame(filtered["creator"].tolist(), "creator", "documents", pd),
                hide_index=True,
                width="stretch",
            )
        with s2:
            st.subheader("Source hosts")
            st.dataframe(
                _count_frame(filtered["sourceHost"].tolist(), "host", "documents", pd),
                hide_index=True,
                width="stretch",
            )

    with tab_annotations:
        st.subheader("Profile coverage")
        profiles = [
            "documentary_analysis",
            "shame_article",
            "podcast_analysis",
            "testimony_analysis",
            "anti_gender_network",
            "search_discovery",
        ]
        coverage_rows = []
        for profile in profiles:
            has_profile = filtered["annotationProfiles"].apply(lambda values: profile in values)
            reviewed_profile = filtered["reviewedProfiles"].apply(lambda values: profile in values)
            coverage_rows.append(
                {
                    "Profile": profile,
                    "Annotated": int(has_profile.sum()),
                    "Reviewed/corrected": int(reviewed_profile.sum()),
                    "Missing": int((~has_profile).sum()),
                }
            )
        st.dataframe(coverage_rows, hide_index=True, width="stretch")

        st.subheader("Recommended but not yet run")
        needed = filtered[filtered["missingRecommended"].astype(bool)][
            ["doc_id", "type", "format", "recommendedProfiles", "missingRecommended"]
        ]
        st.dataframe(needed, hide_index=True, width="stretch")

    with tab_gap:
        st.subheader("Practical gaps")
        gap_rows = []
        for _, row in filtered.iterrows():
            gaps = []
            if row["isMedia"] and not row["hasTranscript"]:
                gaps.append("missing transcript evidence")
            if row["isMedia"] and row["commentsCollected"] == 0:
                gaps.append("comments not collected")
            if row["isMedia"] and row["transcriptVersionCount"] < 2:
                gaps.append("no alternate transcript/SRT comparison")
            if row["missingRecommended"]:
                gaps.append("recommended annotation not run")
            if not row["uploaded"]:
                gaps.append("local only")
            if gaps:
                gap_rows.append(
                    {
                        "doc_id": row["doc_id"],
                        "Type": row["type"],
                        "Format": row["format"],
                        "Gaps": "; ".join(gaps),
                    }
                )
        st.dataframe(gap_rows, hide_index=True, width="stretch")

        if gap_rows:
            set_name = st.text_input("Save these gap docs as set", key="ci_gap_set_name")
            if st.button("Save gap set", key="ci_save_gap_set"):
                if not set_name.strip():
                    st.error("Give the set a name first.")
                else:
                    payload = _app_write_document_set(
                        config.corpus_dir,
                        set_name,
                        [row["doc_id"] for row in gap_rows],
                        "Created from Corpus Intelligence gap view",
                    )
                    st.success(f"Saved `{payload['name']}` with {len(payload['docIds'])} document(s).")

    with tab_table:
        display_cols = [
            "doc_id", "type", "format", "country", "publicationDate", "analysisSavedAt",
            "uploadedAt", "latestAnnotationAt", "latestReviewAt", "creator", "sourceHost",
            "uploaded", "hasEnrichment", "annotationProfiles", "missingRecommended",
            "commentsCollected", "transcriptVersionCount",
        ]
        st.dataframe(
            filtered[display_cols],
            hide_index=True,
            width="stretch",
        )


def _knowledge_export_dir(config) -> Path:
    return Path(config.exports_dir) / "knowledge"


def _knowledge_export_paths(config) -> dict[str, Path]:
    root = _knowledge_export_dir(config)
    return {
        "document_profiles": root / "document_profiles.jsonl",
        "nodes": root / "archive_nodes.csv",
        "edges": root / "archive_edges.csv",
        "graph": root / "archive_graph.json",
        "quality": root / "knowledge_quality.json",
    }


def _knowledge_export_commands() -> dict[str, list[str]]:
    return {
        "citation_units": [sys.executable, "-m", "runner", "archive-citation-backfill"],
        "profiles": [sys.executable, "-m", "runner", "archive-summary-export", "--refresh-sidecars", "--backfill-citation-units"],
        "graph": [sys.executable, "-m", "runner", "knowledge-graph-export"],
        "graph_proposed": [sys.executable, "-m", "runner", "knowledge-graph-export", "--include-proposed"],
        "quality": [sys.executable, "-m", "runner", "knowledge-quality-report"],
    }


def _knowledge_export_file_descriptions() -> list[dict[str, str]]:
    return [
        {
            "File": "archive_summary.json",
            "Where": "inside each corpus document folder",
            "Use": "One derived index card for that document: source, dates, classification, review state, upload state, offload lineage, readiness.",
        },
        {
            "File": "document_profiles.jsonl",
            "Where": "exports/knowledge/",
            "Use": "One JSON line per document. This is the easiest machine-readable table for audits, notebooks, and future agents.",
        },
        {
            "File": "archive_nodes.csv",
            "Where": "exports/knowledge/",
            "Use": "Graph node table for documents, terms, entities, tactics, practices, countries, and other evidence nodes.",
        },
        {
            "File": "archive_edges.csv",
            "Where": "exports/knowledge/",
            "Use": "Evidence edge table. Every edge carries provenance, review status, evidence strength, and source document fields.",
        },
        {
            "File": "archive_graph.json",
            "Where": "exports/knowledge/",
            "Use": "The same graph as JSON for custom visualization, notebooks, and later GraphML/network tooling.",
        },
        {
            "File": "knowledge_quality.json",
            "Where": "exports/knowledge/",
            "Use": "Read-only audit of extraction quality, analysis tag coverage, tag-registry matches, enrichment review load, and graph evidence strength.",
        },
    ]


def _knowledge_file_status_rows(paths: dict[str, Path]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for path in paths.values():
        exists = Path(path).exists()
        modified = ""
        if exists:
            try:
                modified = datetime.fromtimestamp(Path(path).stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                modified = ""
        rows.append({
            "File": Path(path).name,
            "Present": "yes" if exists else "no",
            "Modified": modified,
            "Path": str(path),
        })
    return rows


def _citation_unit_status(config) -> dict:
    """Summarize citation-unit sidecars without mutating corpus files."""
    from runner.pipeline.citation_units import CITATION_UNITS_FILENAME

    corpus_dir = Path(config.corpus_dir)
    counts = {
        "docs": 0,
        "with_extracted": 0,
        "with_citation_units": 0,
        "missing_citation_units": 0,
        "missing_extracted": 0,
    }
    rows: list[dict[str, str]] = []
    if not corpus_dir.exists():
        return {"counts": counts, "rows": rows}
    for doc_dir in sorted(corpus_dir.iterdir()):
        if not doc_dir.is_dir() or doc_dir.name.startswith("."):
            continue
        extracted = doc_dir / "extracted.txt"
        citation_units = doc_dir / CITATION_UNITS_FILENAME
        counts["docs"] += 1
        has_extracted = extracted.exists()
        has_citation = citation_units.exists()
        if has_extracted:
            counts["with_extracted"] += 1
        else:
            counts["missing_extracted"] += 1
        if has_citation:
            counts["with_citation_units"] += 1
        if has_extracted and not has_citation:
            counts["missing_citation_units"] += 1
        if (has_extracted and not has_citation) or not has_extracted:
            rows.append({
                "doc_id": doc_dir.name,
                "status": "missing citation_units.json" if has_extracted else "missing extracted.txt",
                "action": "Backfill citation units" if has_extracted else "Retry/re-ingest/discard document",
                "path": str(doc_dir),
            })
    return {"counts": counts, "rows": rows}


def _source_failed_report_rows(report: dict) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    source = report.get("source_offload") or {}
    for pkg in source.get("failed_reports") or []:
        for doc in pkg.get("docs") or []:
            rows.append({
                "package_id": str(pkg.get("package_id") or ""),
                "doc_id": str(doc.get("doc_id") or ""),
                "queue_item_id": str(doc.get("queue_item_id") or ""),
                "status": str(doc.get("status") or ""),
                "error": str(doc.get("error") or "").splitlines()[0],
                "source_url": str(doc.get("source_url") or ""),
            })
    return rows


def _system_health_corpus_rows(report: dict, key: str) -> list[dict]:
    corpus = report.get("corpus") or {}
    rows = corpus.get(key) or []
    return rows if isinstance(rows, list) else []


def _system_health_direct_transfer_rows(report: dict) -> list[dict[str, str]]:
    transfer = report.get("transfer") or {}
    rows: list[dict[str, str]] = []
    for item in transfer.get("direct_incoming_folders") or []:
        if isinstance(item, dict):
            rows.append({
                "package_id": str(item.get("package_id") or ""),
                "path": str(item.get("path") or ""),
            })
        else:
            rows.append({"package_id": str(item), "path": ""})
    return rows


def _system_health_source_package_rows(report: dict) -> list[dict[str, str]]:
    source = report.get("source_offload") or {}
    by_state = source.get("packages_by_state") or {}
    rows: list[dict[str, str]] = []
    if not isinstance(by_state, dict):
        return rows
    for state in ("inbox", "processing", "outbox", "imported", "failed", "archive"):
        for item in by_state.get(state) or []:
            if not isinstance(item, dict):
                continue
            rows.append({
                "package_id": str(item.get("package_id") or ""),
                "folder_state": str(item.get("folder_state") or state),
                "manifest_state": str(item.get("manifest_state") or ""),
                "kind": str(item.get("kind") or ""),
                "error": str(item.get("error") or ""),
                "path": str(item.get("path") or ""),
            })
    return rows


def _research_digest_dir(config) -> Path:
    return Path(config.exports_dir) / "digests"


def _research_digest_command() -> list[str]:
    return [sys.executable, "-m", "runner", "research-digest", "--refresh-all"]


def _read_text_preview(path: Path, *, max_chars: int = 12000) -> str:
    path = Path(path)
    if not path.exists():
        return ""
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        return ""
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "\n\n...[preview truncated]"


def _download_mime_for_path(path: Path) -> str:
    suffix = Path(path).suffix.lower()
    if suffix == ".json":
        return "application/json"
    if suffix == ".jsonl":
        return "application/x-jsonlines"
    if suffix == ".csv":
        return "text/csv"
    if suffix == ".md":
        return "text/markdown"
    return "application/octet-stream"


def _latest_research_digest_paths(config) -> dict[str, Path]:
    root = _research_digest_dir(config)
    json_files = sorted(root.glob("*_research_digest.json"), key=lambda p: p.stat().st_mtime, reverse=True) if root.exists() else []
    md_files = sorted(root.glob("*_research_digest.md"), key=lambda p: p.stat().st_mtime, reverse=True) if root.exists() else []
    return {
        "json": json_files[0] if json_files else root / "latest_research_digest.json",
        "markdown": md_files[0] if md_files else root / "latest_research_digest.md",
    }


def _research_digest_preview(path: Path) -> dict:
    path = Path(path)
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    health = payload.get("system_health") or {}
    queue = payload.get("queue") or {}
    quality = payload.get("knowledge_quality") or {}
    return {
        "generated_at": payload.get("generated_at", ""),
        "status": health.get("status", ""),
        "next_actions": payload.get("next_actions") or [],
        "queue_counts": queue.get("counts_by_status") or {},
        "safe_candidates": queue.get("overnight_safe_count", 0),
        "review_flagged": queue.get("review_flagged_count", 0),
        "quality_recommendations": quality.get("recommendations") or [],
    }


def _run_research_digest_action(config) -> dict:
    from runner.pipeline import research_digest
    return research_digest.refresh_knowledge_and_digest(config)


def _render_research_digest_panel(config) -> None:
    paths = _latest_research_digest_paths(config)
    with st.expander("Research digest", expanded=False):
        st.caption(
            "A read-only daily coordination report over source queue, corpus, "
            "Mac Studio transfer/offload state, and knowledge quality."
        )
        st.write(f"Folder: `{_research_digest_dir(config)}`")
        preview = _research_digest_preview(paths["json"])
        if preview:
            d1, d2, d3 = st.columns(3)
            d1.metric("Digest status", preview.get("status") or "unknown")
            d2.metric("Safe queue candidates", preview.get("safe_candidates", 0))
            d3.metric("Review-flagged queue", preview.get("review_flagged", 0))
            st.caption(f"Latest digest: `{paths['markdown']}`")
            with st.expander("Digest next actions"):
                for item in preview.get("next_actions") or []:
                    st.info(item)
            with st.expander("Queue and quality snapshot"):
                st.json({
                    "queue_counts": preview.get("queue_counts"),
                    "quality_recommendations": preview.get("quality_recommendations"),
                })
            digest_text = _read_text_preview(paths["markdown"], max_chars=10000)
            if digest_text:
                with st.expander("Read latest digest Markdown", expanded=True):
                    st.markdown(digest_text)
                dl1, dl2 = st.columns(2)
                dl1.download_button(
                    "Download digest .md",
                    data=digest_text.encode("utf-8"),
                    file_name=paths["markdown"].name,
                    mime="text/markdown",
                    key="download_research_digest_md",
                )
                if paths["json"].exists():
                    dl2.download_button(
                        "Download digest .json",
                        data=paths["json"].read_bytes(),
                        file_name=paths["json"].name,
                        mime="application/json",
                        key="download_research_digest_json",
                    )
        else:
            st.info("No research digest found yet. Generate one after refreshing knowledge exports.")

        if st.button("Refresh profiles, graph, quality report, and digest", key="refresh_research_digest"):
            try:
                result = _run_research_digest_action(config)
                digest = result["digest"]
                citation_counts = result.get("citation_units", {}).get("counts", {})
                st.success(
                    f"Refreshed {result['profiles']['count']} profile(s), "
                    f"{result['graph']['edge_count']} graph edge(s), "
                    f"{citation_counts.get('written', 0)} citation sidecar(s), and the research digest."
                )
                st.caption(f"Digest: `{digest['markdown_path']}`")
                st.caption(f"JSON: `{digest['json_path']}`")
            except Exception as exc:
                st.error(f"Could not refresh research digest: {exc}")
        st.caption("Terminal equivalent:")
        st.code(shlex.join(_research_digest_command()), language="bash")
        st.caption("Open the digest folder from Terminal:")
        st.code(f"open {shlex.quote(str(_research_digest_dir(config)))}", language="bash")


def _knowledge_profile_preview(path: Path, *, limit: int = 25) -> list[dict]:
    rows: list[dict] = []
    path = Path(path)
    if not path.exists():
        return rows
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            if len(rows) >= limit:
                break
            if not line.strip():
                continue
            try:
                item = json.loads(line)
            except Exception:
                continue
            source = item.get("source") or {}
            content = item.get("content") or {}
            classification = item.get("classification") or {}
            readiness = item.get("readiness") or {}
            publication = item.get("publication") or {}
            rows.append({
                "doc_id": item.get("doc_id", ""),
                "trust_state": item.get("trust_state", ""),
                "readiness": readiness.get("status", ""),
                "uploaded": bool(publication.get("uploaded")),
                "type": classification.get("type", ""),
                "title": content.get("title", ""),
                "next_actions": "; ".join(readiness.get("next_action_titles") or []),
                "source_url": source.get("source_url", ""),
            })
    return rows


def _knowledge_graph_preview(path: Path) -> dict:
    from collections import Counter

    path = Path(path)
    if not path.exists():
        return {}
    try:
        graph = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    nodes = graph.get("nodes") if isinstance(graph.get("nodes"), list) else []
    edges = graph.get("edges") if isinstance(graph.get("edges"), list) else []
    return {
        "schema_version": graph.get("schema_version", ""),
        "include_proposed": bool(graph.get("include_proposed")),
        "node_count": len(nodes),
        "edge_count": len(edges),
        "node_types": dict(sorted(Counter(row.get("type", "") for row in nodes).items())),
        "edge_types": dict(sorted(Counter(row.get("type", "") for row in edges).items())),
        "evidence_strength": dict(sorted(Counter(row.get("evidence_strength", "") for row in edges).items())),
    }


def _knowledge_quality_preview(path: Path) -> dict:
    path = Path(path)
    if not path.exists():
        return {}
    try:
        report = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    if not isinstance(report, dict):
        return {}
    return {
        "profiles": report.get("profiles") or {},
        "extraction": report.get("extraction") or {},
        "tag_coverage": report.get("tag_coverage") or {},
        "tag_registry": report.get("tag_registry") or {},
        "enrichment": report.get("enrichment") or {},
        "graph": report.get("graph") or {},
        "recommendations": report.get("recommendations") or [],
    }


def _knowledge_quality_issue_tables(preview: dict) -> dict[str, list[dict]]:
    """Return concrete quality rows for Streamlit display.

    The quality report is intentionally broad; this helper keeps the UI focused
    on the documents a researcher can act on next.
    """
    extraction = preview.get("extraction") or {}
    tag_coverage = preview.get("tag_coverage") or {}
    enrichment = preview.get("enrichment") or {}
    tag_registry = preview.get("tag_registry") or {}

    missing_tags = []
    for row in tag_coverage.get("missing_core_tag_docs") or []:
        missing = row.get("missing_fields") or []
        if not isinstance(missing, list):
            missing = [missing]
        missing_tags.append({
            "doc_id": row.get("doc_id", ""),
            "missing_fields": ", ".join(str(item) for item in missing if str(item).strip()),
            "title": row.get("title", ""),
        })

    return {
        "zero_text_docs": list(extraction.get("zero_text_docs") or []),
        "low_text_docs": list(extraction.get("low_text_docs") or []),
        "acquisition_challenge_docs": list(extraction.get("acquisition_challenge_docs") or []),
        "missing_core_tag_docs": missing_tags,
        "enrichment_docs_needing_review": list(enrichment.get("docs_needing_review") or []),
        "tag_registry_top_docs": list(tag_registry.get("top_docs") or []),
    }


def _run_knowledge_export_action(config, action: str) -> dict:
    if action == "citation_units":
        from runner.pipeline import archive_summary
        return archive_summary.backfill_citation_units(Path(config.corpus_dir))
    if action == "profiles":
        from runner.pipeline import archive_summary
        return archive_summary.export_document_profiles(
            Path(config.corpus_dir),
            Path(config.exports_dir),
            config=config,
            write_doc_summaries=True,
        )
    if action == "graph":
        from runner.pipeline import knowledge_graph
        return knowledge_graph.export_knowledge_graph(
            Path(config.corpus_dir),
            Path(config.exports_dir),
            config=config,
            include_proposed=False,
        )
    if action == "graph_proposed":
        from runner.pipeline import knowledge_graph
        return knowledge_graph.export_knowledge_graph(
            Path(config.corpus_dir),
            Path(config.exports_dir),
            config=config,
            include_proposed=True,
        )
    if action == "quality":
        from runner.pipeline import knowledge_quality
        return knowledge_quality.write_knowledge_quality_report(
            Path(config.corpus_dir),
            Path(config.exports_dir),
            config=config,
        )
    raise ValueError(f"unknown knowledge export action: {action}")


def _render_knowledge_exports_panel(config) -> None:
    paths = _knowledge_export_paths(config)
    export_dir = _knowledge_export_dir(config)
    existing = {name: path.exists() for name, path in paths.items()}

    with st.expander("Knowledge exports", expanded=False):
        st.caption(
            "Build the derived archive summaries and evidence graph exports. "
            "These are local files only — no Sanity, Supabase, model calls, or network."
        )
        st.info(
            "`archive_summary.json` is a regenerable index card beside each document. "
            "`document_profiles.jsonl` is the corpus-wide version: one JSON line per document. "
            "The graph files are evidence exports for analysis and visualization, not publication."
        )
        st.write(f"Folder: `{export_dir}`")
        st.caption(
            "These files are in your configured data/export folder, not inside the git repo. "
            "Use the open command or download buttons below if Finder is showing the wrong `exports` directory."
        )
        with st.expander("What these files are"):
            st.dataframe(_knowledge_export_file_descriptions(), hide_index=True, width="stretch")
        if any(existing.values()):
            st.dataframe(_knowledge_file_status_rows(paths), hide_index=True, width="stretch")
            with st.expander("Open or download the generated files", expanded=True):
                st.code(f"open {shlex.quote(str(export_dir))}", language="bash")
                st.caption(
                    "`document_profiles.jsonl` is one JSON object per line. "
                    "Use the preview table for reading, or download it for notebooks / future agent passes."
                )
                download_cols = st.columns(3)
                for idx, path in enumerate(paths.values()):
                    path = Path(path)
                    if not path.exists():
                        continue
                    download_cols[idx % 3].download_button(
                        f"Download {path.name}",
                        data=path.read_bytes(),
                        file_name=path.name,
                        mime=_download_mime_for_path(path),
                        key=f"download_knowledge_{path.name}",
                    )
                st.caption("Pretty-print the first JSONL profile in Terminal:")
                st.code(
                    "head -1 "
                    + shlex.quote(str(paths["document_profiles"]))
                    + " | "
                    + shlex.join([sys.executable, "-m", "json.tool"]),
                    language="bash",
                )
        else:
            st.info("No knowledge export files found yet. Run the commands below to create them.")

        profile_rows = _knowledge_profile_preview(paths["document_profiles"], limit=25)
        if profile_rows:
            st.markdown("**Document profile preview**")
            st.caption("First 25 rows from `document_profiles.jsonl`.")
            st.dataframe(profile_rows, hide_index=True, width="stretch")

        graph_preview = _knowledge_graph_preview(paths["graph"])
        if graph_preview:
            g1, g2 = st.columns(2)
            g1.metric("Graph nodes", graph_preview["node_count"])
            g2.metric("Graph edges", graph_preview["edge_count"])
            with st.expander("Graph type counts"):
                st.write("Node types")
                st.json(graph_preview["node_types"])
                st.write("Edge types")
                st.json(graph_preview["edge_types"])
                st.write("Evidence strength")
                st.json(graph_preview["evidence_strength"])

        quality_preview = _knowledge_quality_preview(paths["quality"])
        if quality_preview:
            st.markdown("**Quality audit preview**")
            profiles = quality_preview.get("profiles") or {}
            extraction = quality_preview.get("extraction") or {}
            graph_quality = quality_preview.get("graph") or {}
            q1, q2, q3, q4 = st.columns(4)
            q1.metric("Profiles", profiles.get("count", 0))
            q2.metric("Incomplete", profiles.get("incomplete", 0))
            q3.metric("Zero-text docs", len(extraction.get("zero_text_docs") or []))
            q4.metric("Quote-backed edges", (graph_quality.get("evidence_strength") or {}).get("quote_backed", 0))
            with st.expander("Quality recommendations"):
                for item in quality_preview.get("recommendations") or []:
                    st.info(item)
            issue_tables = _knowledge_quality_issue_tables(quality_preview)
            with st.expander("Documents needing attention"):
                shown = False
                sections = [
                    ("Zero extracted text", issue_tables["zero_text_docs"]),
                    ("Low extracted text", issue_tables["low_text_docs"]),
                    ("Acquisition challenges", issue_tables["acquisition_challenge_docs"]),
                    ("Missing core analysis tags", issue_tables["missing_core_tag_docs"]),
                    ("Pending enrichment review", issue_tables["enrichment_docs_needing_review"]),
                    ("Top tag-registry match docs", issue_tables["tag_registry_top_docs"]),
                ]
                for title, rows in sections:
                    if not rows:
                        continue
                    shown = True
                    st.markdown(f"**{title}**")
                    st.dataframe(rows, hide_index=True, width="stretch")
                if not shown:
                    st.success("No document-level quality issues found in this report.")
            with st.expander("Tag registry and enrichment audit"):
                tag_registry = quality_preview.get("tag_registry") or {}
                enrichment = quality_preview.get("enrichment") or {}
                tag_coverage = quality_preview.get("tag_coverage") or {}
                st.caption(
                    "Tag registry matches are used during enrichment as connection hints, not proof. "
                    "Evidence graph edges from enrichment remain separate and quote-backed when possible."
                )
                st.json({
                    "tag_registry": {
                        "available": tag_registry.get("available"),
                        "registry_rows": tag_registry.get("registry_rows"),
                        "docs_scanned": tag_registry.get("docs_scanned"),
                        "docs_with_matches": tag_registry.get("docs_with_matches"),
                        "category_matches": tag_registry.get("category_matches"),
                        "mode": tag_registry.get("mode"),
                    },
                    "analysis_tag_coverage": tag_coverage.get("fields"),
                    "enrichment_lifecycle": enrichment.get("lifecycle"),
                    "enrichment_family_counts": enrichment.get("family_counts"),
                })

        citation_status = _citation_unit_status(config)
        citation_counts = citation_status["counts"]
        st.markdown("**Evidence locator sidecars**")
        st.caption(
            "`citation_units.json` is generated from `extracted.txt`. "
            "It gives evidence quotes stable paragraph/span IDs, offsets, and hashes for future graph, Wikia, and chatbot layers."
        )
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Docs with text", citation_counts["with_extracted"])
        c2.metric("Citation sidecars", citation_counts["with_citation_units"])
        c3.metric("Can backfill", citation_counts["missing_citation_units"])
        c4.metric("Missing text", citation_counts["missing_extracted"])
        if citation_status["rows"]:
            with st.expander("Citation / extraction gaps"):
                st.dataframe(citation_status["rows"], hide_index=True, width="stretch")

        cmds = _knowledge_export_commands()
        st.markdown("**Build / refresh**")
        b0, b1, b2, b3, b4 = st.columns(5)
        if b0.button("Backfill citation units", key="kg_backfill_citation_units"):
            try:
                result = _run_knowledge_export_action(config, "citation_units")
                counts = result.get("counts") or {}
                st.success(
                    "Citation-unit backfill complete: "
                    f"{counts.get('written', 0)} written, "
                    f"{counts.get('exists', 0)} already present, "
                    f"{counts.get('missing_extracted', 0)} missing extracted text."
                )
                if counts.get("missing_extracted", 0):
                    st.info("Docs without `extracted.txt` need retry, re-ingest, or discard; citation units cannot be generated for empty text.")
            except Exception as exc:
                st.error(f"Could not backfill citation units: {exc}")
        if b1.button("Refresh profiles", key="kg_refresh_profiles"):
            try:
                result = _run_knowledge_export_action(config, "profiles")
                st.success(f"Refreshed {result['count']} document profile(s).")
                st.caption(f"Wrote `{result['path']}` and per-document `archive_summary.json` sidecars.")
            except Exception as exc:
                st.error(f"Could not refresh profiles: {exc}")
        if b2.button("Refresh evidence graph", key="kg_refresh_graph"):
            try:
                result = _run_knowledge_export_action(config, "graph")
                st.success(f"Refreshed graph: {result['node_count']} node(s), {result['edge_count']} edge(s).")
                st.caption(f"Wrote `{result['graph_path']}`.")
            except Exception as exc:
                st.error(f"Could not refresh graph: {exc}")
        if b3.button("Refresh with proposed", key="kg_refresh_graph_proposed"):
            try:
                result = _run_knowledge_export_action(config, "graph_proposed")
                st.warning(
                    f"Refreshed exploratory graph: {result['node_count']} node(s), {result['edge_count']} edge(s). "
                    "This includes model-proposed/unreviewed material."
                )
            except Exception as exc:
                st.error(f"Could not refresh exploratory graph: {exc}")
        if b4.button("Refresh quality report", key="kg_refresh_quality"):
            try:
                result = _run_knowledge_export_action(config, "quality")
                st.success(
                    f"Refreshed quality report: {result['profile_count']} profile(s), "
                    f"{result['edge_count']} edge(s)."
                )
                st.caption(f"Wrote `{result['path']}`.")
            except Exception as exc:
                st.error(f"Could not refresh quality report: {exc}")

        st.caption("Terminal equivalents:")
        st.code(shlex.join(cmds["citation_units"]), language="bash")
        st.code(shlex.join(cmds["profiles"]), language="bash")
        st.code(shlex.join(cmds["graph"]), language="bash")
        st.code(shlex.join(cmds["quality"]), language="bash")

        with st.expander("Exploratory graph command"):
            st.caption("Includes model-proposed/unreviewed edges. Use for discovery, not as reviewed evidence.")
            st.code(shlex.join(cmds["graph_proposed"]), language="bash")

        if st.button("Open knowledge export folder in Finder", key="open_knowledge_export_folder"):
            try:
                export_dir.mkdir(parents=True, exist_ok=True)
                if sys.platform == "darwin":
                    subprocess.run(["open", str(export_dir)], check=False)
                    st.success(f"Opened `{export_dir}`")
                else:
                    st.info(f"Open this folder manually: `{export_dir}`")
            except Exception as exc:
                st.error(f"Could not open folder: {exc}")


def _corpus_intelligence_rows(corpus_dir: Path) -> list[dict]:
    from runner.pipeline.research_annotate import recommended_profiles
    from urllib.parse import urlparse

    rows = []
    for doc_dir in sorted(corpus_dir.iterdir()):
        if not doc_dir.is_dir() or doc_dir.name.startswith("."):
            continue
        analysis = _read_json_file(doc_dir / "analysis.json", {})
        if not analysis:
            continue
        intake = _read_json_file(doc_dir / "intake.json", {})
        media = _read_json_file(doc_dir / "media_metadata.json", {})
        general = media.get("general", {}) if isinstance(media, dict) else {}
        transcript_evidence = media.get("transcriptEvidence", {}) if isinstance(media, dict) else {}
        signals = media.get("platformAlgorithmicSignals", {}) if isinstance(media, dict) else {}
        collection = media.get("commentCollection", {}) if isinstance(media, dict) else {}

        country_list = analysis.get("country") or []
        if isinstance(country_list, str):
            country_list = [country_list]
        publication_date = (
            general.get("publicationDate")
            or analysis.get("publication_date")
            or analysis.get("date")
            or intake.get("date_published")
            or ""
        )
        year = str(publication_date)[:4] if re.match(r"^\d{4}", str(publication_date)) else ""
        source = intake.get("source_url") or intake.get("source") or ""
        source_host = urlparse(source).netloc.replace("www.", "") if source else ""
        profile_rows = _annotation_profile_summary(doc_dir)
        profiles = sorted(profile_rows.keys())
        reviewed = sorted(
            profile for profile, status in profile_rows.items()
            if status in {"researcher_reviewed", "corrected"}
        )
        recommended = recommended_profiles(analysis.get("format", ""), analysis.get("type", ""))
        missing = [profile for profile in recommended if profile not in profiles]
        latest_annotation, latest_review = _latest_annotation_dates(doc_dir)
        transcript_versions = int(transcript_evidence.get("transcriptVersionCount") or 0)
        comments_collected = int(
            collection.get("collectedCount")
            or signals.get("commentsCollectedCount")
            or 0
        )
        rows.append(
            {
                "doc_id": doc_dir.name,
                "type": analysis.get("type", "Unknown") or "Unknown",
                "format": analysis.get("format", "Unknown") or "Unknown",
                "country": ", ".join(country_list),
                "countryList": country_list,
                "year": year,
                "publicationDate": publication_date,
                "analysisSavedAt": _file_timestamp(doc_dir / "analysis.json"),
                "uploadedAt": _file_timestamp(doc_dir / "sanity_record.json"),
                "latestAnnotationAt": latest_annotation,
                "latestReviewAt": latest_review,
                "creator": general.get("creator") or analysis.get("source_actor") or "",
                "sourceHost": source_host,
                "uploaded": (doc_dir / "sanity_record.json").exists(),
                "hasEnrichment": (doc_dir / "enrichment.json").exists(),
                "isMedia": (doc_dir / "media_metadata.json").exists(),
                "hasTranscript": (doc_dir / "transcript_chunks.json").exists(),
                "transcriptVersionCount": transcript_versions,
                "commentsCollected": comments_collected,
                "annotationCount": len(profiles),
                "annotationProfiles": profiles,
                "reviewedProfiles": reviewed,
                "recommendedProfiles": recommended,
                "missingRecommended": missing,
            }
        )
    return rows


def _annotation_profile_summary(doc_dir: Path) -> dict[str, str]:
    root = doc_dir / "research_annotations"
    if not root.exists():
        return {}
    profiles: dict[str, str] = {}
    for path in root.glob("*.json"):
        data = _read_json_file(path, {})
        profile = data.get("profile") or path.stem
        profiles[profile] = data.get("annotationStatus", "")
    return profiles


def _read_json_file(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _read_jsonl_preview(path: Path, *, limit: int = 12) -> list[dict]:
    if not path.exists():
        return []
    rows: list[dict] = []
    try:
        with path.open("r", encoding="utf-8") as fh:
            for line in fh:
                if len(rows) >= limit:
                    break
                line = line.strip()
                if not line:
                    continue
                try:
                    value = json.loads(line)
                except Exception:
                    continue
                if isinstance(value, dict):
                    rows.append(value)
    except Exception:
        return []
    return rows


def _document_longform_status(doc_dir: Path) -> dict:
    """Return local longform sidecar status for a corpus document.

    Pure helper for the Streamlit panel. It never calls models, never writes,
    and treats missing sidecars as normal: a document can be a longform
    candidate before the researcher chooses to build the derived files.
    """
    doc_dir = Path(doc_dir)
    source_candidates = [
        doc_dir / name
        for name in ("source.pdf", "source.epub", "source.docx", "source.doc", "source.odt", "source.md", "source.txt")
        if (doc_dir / name).exists()
    ]
    source_artifact = source_candidates[0] if source_candidates else None

    analysis = _read_json_file(doc_dir / "analysis.json", {})
    fmt = str(analysis.get("format") or "").lower() if isinstance(analysis, dict) else ""
    typ = str(analysis.get("type") or "").lower() if isinstance(analysis, dict) else ""
    candidate = bool(source_artifact) or any(token in fmt or token in typ for token in ("book", "report", "pdf", "article"))

    source = _read_json_file(doc_dir / "longform_source.json", {})
    biblio = _read_json_file(doc_dir / "bibliographic.json", {})
    quality = _read_json_file(doc_dir / "longform_quality.json", {})
    preprocess = _read_json_file(doc_dir / "preprocess.json", {})
    analysis_audit = _read_json_file(doc_dir / "analysis_audit.json", {})
    page_map = doc_dir / "page_map.jsonl"
    text_blocks = doc_dir / "text_blocks.jsonl"
    has_sidecars = bool(source or biblio or quality or page_map.exists() or text_blocks.exists())

    representation = source.get("representation") if isinstance(source.get("representation"), dict) else {}
    titles = biblio.get("titles") if isinstance(biblio.get("titles"), dict) else {}
    title = titles.get("main") if isinstance(titles.get("main"), dict) else {}
    identifiers = biblio.get("identifiers") if isinstance(biblio.get("identifiers"), dict) else {}
    creators = biblio.get("creators") if isinstance(biblio.get("creators"), list) else []
    first_blocks = (
        biblio.get("metadata_candidates", {}).get("first_text_blocks", [])
        if isinstance(biblio.get("metadata_candidates"), dict)
        else []
    )
    if not first_blocks:
        first_blocks = [
            {
                "text": str(row.get("text") or "")[:500],
                "page_label": str(row.get("page_label") or ""),
                "page_index": row.get("page_index"),
                "block_id": str(row.get("block_id") or ""),
            }
            for row in _read_jsonl_preview(text_blocks, limit=12)
        ]

    warnings = quality.get("warnings") if isinstance(quality.get("warnings"), list) else []
    next_actions = quality.get("next_actions") if isinstance(quality.get("next_actions"), list) else []
    preprocess_char_count = int(preprocess.get("char_count") or preprocess.get("text_char_count") or 0) if isinstance(preprocess, dict) else 0
    analysis_input_char_count = int(analysis_audit.get("input_char_count") or 0) if isinstance(analysis_audit, dict) else 0
    longform_char_count = int(quality.get("char_count") or representation.get("char_count") or 0)
    baseline_chars = analysis_input_char_count or preprocess_char_count
    stale_reasons: list[str] = []
    if longform_char_count and baseline_chars and longform_char_count > max(baseline_chars * 1.5, baseline_chars + 5000):
        stale_reasons.append(
            f"longform text ({longform_char_count:,} chars) is much larger than the text used for current analysis ({baseline_chars:,} chars)"
        )
    if "longform_text_count_differs_from_preprocess" in warnings:
        stale_reasons.append("longform text count differs from preprocess text count")
    return {
        "candidate": candidate,
        "has_sidecars": has_sidecars,
        "source_artifact": str(source_artifact) if source_artifact else "",
        "source_artifact_name": source_artifact.name if source_artifact else "",
        "title": str(title.get("value") or ""),
        "title_source": str(title.get("source") or ""),
        "title_review_state": str(title.get("review_state") or ""),
        "creators": [str(item.get("name") or "") for item in creators if isinstance(item, dict) and str(item.get("name") or "").strip()],
        "isbns": [str(item) for item in identifiers.get("isbn", [])] if isinstance(identifiers.get("isbn"), list) else [],
        "item_type": str(biblio.get("item_type") or ""),
        "representation_type": str(representation.get("type") or ""),
        "extraction_method": str(quality.get("extraction_method") or representation.get("extraction_method") or ""),
        "page_count": int(quality.get("page_count") or representation.get("page_count") or 0),
        "block_count": int(quality.get("block_count") or representation.get("block_count") or 0),
        "char_count": longform_char_count,
        "preprocess_char_count": preprocess_char_count,
        "analysis_input_char_count": analysis_input_char_count,
        "analysis_likely_partial": bool(stale_reasons),
        "analysis_staleness_reasons": stale_reasons,
        "missing_text_page_count": int(quality.get("missing_text_page_count") or 0),
        "warnings": [str(item) for item in warnings],
        "next_actions": [str(item) for item in next_actions],
        "first_blocks": first_blocks[:12] if isinstance(first_blocks, list) else [],
        "paths": {
            "longform_source": str(doc_dir / "longform_source.json"),
            "bibliographic": str(doc_dir / "bibliographic.json"),
            "page_map": str(page_map),
            "text_blocks": str(text_blocks),
            "longform_quality": str(doc_dir / "longform_quality.json"),
        },
    }


def _document_longform_review_status(doc_dir: Path) -> dict:
    """Return status for deep longform review sidecars."""
    doc_dir = Path(doc_dir)
    sections = _read_json_file(doc_dir / "longform_sections.json", {})
    section_rows = _read_jsonl_preview(doc_dir / "longform_section_analyses.jsonl", limit=10000)
    candidates = _read_json_file(doc_dir / "longform_candidates.json", {})
    synthesis = _read_json_file(doc_dir / "longform_synthesis.json", {})
    section_count = int(sections.get("section_count") or len(sections.get("sections") or []) or 0) if isinstance(sections, dict) else 0
    try:
        from runner.pipeline.longform_review import filter_rows_for_section_plan

        usable_rows, stale_rows = filter_rows_for_section_plan(section_rows, sections if isinstance(sections, dict) else {})
    except Exception:
        usable_rows = section_rows
        stale_rows = []
    succeeded = len([row for row in usable_rows if row.get("status") == "succeeded"])
    failed = len([row for row in usable_rows if row.get("status") == "failed"])
    synthesis_payload = synthesis.get("synthesis") if isinstance(synthesis.get("synthesis"), dict) else {}
    return {
        "has_sections": bool(sections),
        "has_section_analyses": bool(section_rows),
        "has_synthesis": bool(synthesis_payload),
        "section_count": section_count,
        "sections_reviewed": succeeded,
        "sections_failed": failed,
        "stale_section_rows": len(stale_rows),
        "synthesis_status": "succeeded" if synthesis_payload else str(synthesis.get("status") or "missing"),
        "candidate_count": int(candidates.get("candidate_count") or 0) if isinstance(candidates, dict) else 0,
        "candidate_counts_by_family": candidates.get("counts_by_family") if isinstance(candidates.get("counts_by_family"), dict) else {},
        "archive_abstract": str(synthesis_payload.get("archive_abstract") or ""),
        "coverage_statement": str(synthesis_payload.get("coverage_statement") or ""),
        "paths": {
            "sections": str(doc_dir / "longform_sections.json"),
            "section_analyses": str(doc_dir / "longform_section_analyses.jsonl"),
            "candidates": str(doc_dir / "longform_candidates.json"),
            "synthesis": str(doc_dir / "longform_synthesis.json"),
        },
    }


def _longform_candidate_rows(corpus_dir: Path) -> list[dict]:
    """Collect model-proposed longform candidates across corpus docs."""
    rows: list[dict] = []
    if not corpus_dir.exists():
        return rows
    for path in sorted(corpus_dir.glob("*/longform_candidates.json")):
        payload = _read_json_file(path, {})
        candidates = payload.get("candidates") if isinstance(payload, dict) else []
        if not isinstance(candidates, list):
            continue
        for item in candidates:
            if not isinstance(item, dict):
                continue
            evidence = item.get("evidence") if isinstance(item.get("evidence"), list) else []
            rows.append({
                "doc_id": path.parent.name,
                "candidate_id": item.get("candidate_id") or "",
                "family": item.get("family") or "",
                "label": item.get("label") or "",
                "normalized_label": item.get("normalized_label") or "",
                "count": int(item.get("count") or 0),
                "confidence": item.get("confidence"),
                "review_state": item.get("review_state") or "model_proposed",
                "candidate_actions": item.get("candidate_actions") or [],
                "definitions": item.get("definitions") or [],
                "evidence": evidence,
                "source_path": str(path),
            })
    rows.sort(key=lambda row: (str(row["family"]), -int(row["count"]), str(row["label"]).lower()))
    return rows


def _longform_candidate_rows_for_doc(doc_dir: Path) -> list[dict]:
    """Collect model-proposed longform candidates for one corpus document."""
    return [
        row for row in _longform_candidate_rows(doc_dir.parent)
        if row.get("doc_id") == doc_dir.name
    ]


def _longform_candidate_tag_category(family: str) -> str:
    return {
        "lexicon": "Term (discovered)",
        "tactic": "Tactic",
        "practice": "Practice",
        "entity": "Actor",
    }.get(str(family or "").lower(), "Term (discovered)")


def _longform_candidate_to_tag_updates(candidate: dict) -> dict:
    definitions = candidate.get("definitions") if isinstance(candidate.get("definitions"), list) else []
    evidence = candidate.get("evidence") if isinstance(candidate.get("evidence"), list) else []
    definition = next((str(item).strip() for item in definitions if str(item).strip()), "")
    evidence_bits = []
    for item in evidence[:5]:
        if not isinstance(item, dict):
            continue
        quote = str(item.get("quote_or_note") or "").strip()
        if quote:
            where = str(item.get("section_id") or "").strip()
            evidence_bits.append(f"{where}: {quote}" if where else quote)
    return {
        "definition": definition,
        "concept_cluster": "Longform candidate",
        "connections": "\n".join(evidence_bits),
        "occurrences": int(candidate.get("count") or 0),
        "researcher_note": (
            f"Promoted from longform candidate register for {candidate.get('doc_id', '')}. "
            "Model-proposed; researcher should confirm before using as evidence."
        ),
        "active": True,
        "custom": "longform",
    }


def _longform_candidate_primary_text(candidate: dict) -> tuple[str, str]:
    definitions = candidate.get("definitions") if isinstance(candidate.get("definitions"), list) else []
    evidence = candidate.get("evidence") if isinstance(candidate.get("evidence"), list) else []
    definition = next((str(item).strip() for item in definitions if str(item).strip()), "")
    quote = ""
    for item in evidence:
        if isinstance(item, dict):
            quote = str(item.get("quote_or_note") or "").strip()
            if quote:
                break
    return definition, quote


def _proposal_id_for_longform_candidate(family: str, doc_id: str, item: dict) -> str | None:
    try:
        from runner.pipeline.enrich import _generate_proposal_id

        return _generate_proposal_id(family, doc_id, item)
    except Exception:
        return None


def _longform_candidate_to_enrichment_item(
    candidate: dict,
    *,
    target_family: str,
    entity_type: str = "person",
) -> tuple[str, dict]:
    doc_id = str(candidate.get("doc_id") or "").strip()
    label = str(candidate.get("label") or "").strip()
    if not doc_id:
        raise ValueError("Candidate has no source document ID.")
    if not label:
        raise ValueError("Candidate has no label.")

    definition, quote = _longform_candidate_primary_text(candidate)
    now = datetime.now(timezone.utc).isoformat()
    source_label = str(candidate.get("source_kind") or "longform candidate")
    base_note = (
        f"Created from {source_label} `{candidate.get('candidate_id') or label}`. "
        "Model-proposed; researcher must review before treating as registry evidence."
    )
    confidence = candidate.get("confidence")
    common = {
        "approved": False,
        "rejected": False,
        "pushed_to_sanity": False,
        "sanity_id": None,
        "researcher_note": base_note,
        "proposal_status": "pending",
        "source_longform_candidate_id": candidate.get("candidate_id") or "",
        "source_longform_family": candidate.get("family") or "",
        "source_longform_count": int(candidate.get("count") or 0),
        "converted_from_family": candidate.get("converted_from_family") or "longform_candidates",
        "converted_at": now,
    }
    if confidence is not None:
        common["model_confidence"] = confidence

    if target_family == "lexicon_proposals":
        item = {
            **common,
            "action": "add_new",
            "term": label,
            "language": "en",
            "proposed_cluster": "Unknown",
            "function": "Unknown",
            "exact_quote": quote,
            "definition_as_used": definition,
            "usage_register": "neutral",
            "variants": [],
            "relationships": [],
            "co_occurring_terms": [],
            "existing_entry_id": None,
            "existing_entry_term": None,
            "merge_target_id": None,
        }
        item["proposal_id"] = _proposal_id_for_longform_candidate("lexicon", doc_id, item)
        return target_family, item

    if target_family == "entity_proposals":
        if entity_type not in {"person", "organization"}:
            raise ValueError("Entity proposal target must be person or organization.")
        item = {
            **common,
            "action": "add_new",
            "entity_type": entity_type,
            "name": label,
            "registry_fit": "needs_review",
            "registry_fit_rationale": (
                "Created from a longform review candidate. Confirm whether this belongs "
                "in the organization/person registry before pushing."
            ),
            "self_description": definition,
            "activities_stated": [],
            "geographic_scope": [],
            "legal_entities_mentioned": [],
            "claims_made": [],
            "evidence_quote": quote,
            "network_connections": [],
            "key_individuals": [],
            "affiliated_orgs": [],
            "role_in_sogice": definition if entity_type == "person" else "",
            "existing_entity_id": None,
        }
        item["proposal_id"] = _proposal_id_for_longform_candidate("entity", doc_id, item)
        return target_family, item

    if target_family == "tactic_proposals":
        item = {
            **common,
            "action": "add_new",
            "tactic": label,
            "definition": definition,
            "evidence_quote": quote,
            "primary_cluster": "Unknown",
            "secondary_cluster": "Unknown",
            "tactic_level": "sub-tactic",
            "existing_tactic_id": None,
        }
        item["proposal_id"] = _proposal_id_for_longform_candidate("tactic", doc_id, item)
        return target_family, item

    if target_family == "practice_descriptions":
        item = {
            **common,
            "practice_id": f"Practice: {label}",
            "exact_description": quote or definition or label,
            "practice_fit": "candidate_evidence",
            "practice_cluster": "",
            "practice_fit_rationale": "Created from longform review candidate; keep as evidence until clustered or promoted.",
            "existing_practice_id": None,
            "harm_stance": "not_mentioned",
            "harm_quote": "",
        }
        item["proposal_id"] = _proposal_id_for_longform_candidate("practice", doc_id, item)
        return target_family, item

    raise ValueError(f"Unsupported proposal family: {target_family}")


def _longform_default_proposal_family(candidate_family: str) -> str:
    return {
        "lexicon": "lexicon_proposals",
        "entity": "entity_proposals",
        "tactic": "tactic_proposals",
        "practice": "practice_descriptions",
    }.get(str(candidate_family or "").lower(), "lexicon_proposals")


def _active_lexicon_proposal_exists(proposals: list[dict], *, term: str) -> bool:
    wanted = term.strip().casefold()
    for proposal in proposals:
        if not isinstance(proposal, dict) or proposal.get("rejected"):
            continue
        if str(proposal.get("term") or "").strip().casefold() == wanted:
            return True
    return False


def _active_practice_proposal_exists(proposals: list[dict], *, practice_id: str) -> bool:
    wanted = practice_id.strip().casefold()
    for proposal in proposals:
        if not isinstance(proposal, dict) or proposal.get("rejected"):
            continue
        if str(proposal.get("practice_id") or "").strip().casefold() == wanted:
            return True
    return False


def _create_longform_candidate_enrichment_proposal(
    corpus_dir: Path,
    candidate: dict,
    *,
    target_family: str,
    entity_type: str = "person",
) -> dict:
    doc_id = str(candidate.get("doc_id") or "").strip()
    if not doc_id:
        raise ValueError("Candidate has no source document ID.")
    doc_dir = corpus_dir / doc_id
    if not doc_dir.exists():
        raise ValueError(f"Source document not found: {doc_id}")
    enrich_path = doc_dir / "enrichment.json"
    data = _read_json_file(enrich_path, {})
    if not isinstance(data, dict):
        data = {}
    for key in (
        "lexicon_proposals",
        "entity_proposals",
        "tactic_proposals",
        "practice_descriptions",
        "statistical_claims",
        "ingestion_queue",
        "corpus_connections",
    ):
        data.setdefault(key, [])

    key, item = _longform_candidate_to_enrichment_item(
        candidate,
        target_family=target_family,
        entity_type=entity_type,
    )
    if key == "lexicon_proposals" and _active_lexicon_proposal_exists(data[key], term=item["term"]):
        raise ValueError(f"An active lexicon proposal named {item['term']!r} already exists.")
    if key == "entity_proposals" and _active_entity_proposal_exists(data[key], name=item["name"], entity_type=item["entity_type"]):
        raise ValueError(f"An active entity proposal named {item['name']!r} already exists.")
    if key == "tactic_proposals" and _active_tactic_proposal_exists(data[key], tactic=item["tactic"]):
        raise ValueError(f"An active tactic proposal named {item['tactic']!r} already exists.")
    if key == "practice_descriptions" and _active_practice_proposal_exists(data[key], practice_id=item["practice_id"]):
        raise ValueError(f"An active practice proposal named {item['practice_id']!r} already exists.")

    data[key].append(item)
    enrich_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return {"path": str(enrich_path), "key": key, "item": item}


# ---------------------------------------------------------------------------
# Provenance / Audit helpers — pure functions, no st.* calls
# Thin re-exports from runner.app_provenance so app.py stays dependency-free
# of the logic; tests import runner.app_provenance directly.
# ---------------------------------------------------------------------------

from runner.app_provenance import (  # noqa: E402
    ALLOWED_NETWORK_CONNECTION_TYPES,
    _load_analysis_audit,
    _load_enrichment_audit,
    _load_preservation_status_dict,
    _check_artifact_completeness,
)
from runner.app_readiness import (  # noqa: E402
    CATEGORY_BLOCKER,
    CATEGORY_QUALITY,
    CATEGORY_NOTE,
    STATUS_NEEDS_REVIEW,
    STATUS_QUALITY,
    STATUS_READY,
    STATUS_NO_DATA,
    build_document_readiness,
    collect_corpus_readiness,
)
from runner.app_review_overrides import (  # noqa: E402
    analysis_review_marker_available,
    analysis_review_record,
    clear_testimony_gate,
    legal_review_available,
    legal_review_record,
    mark_analysis_reviewed,
    mark_legal_review_complete,
    testimony_gate_cleared,
    testimony_override_available,
)
from runner.models.enrichment import infer_entity_registry_fit, infer_practice_cluster  # noqa: E402


def _collect_metadata_sources(doc_dir: Path) -> dict:
    """Read field values from all local source files for reconciliation display."""
    preprocess = _read_json_file(doc_dir / "preprocess.json", {})
    media = _read_json_file(doc_dir / "media_metadata.json", {})
    general = media.get("general", {}) if isinstance(media, dict) else {}
    analysis = _read_json_file(doc_dir / "analysis.json", {})
    intake = _read_json_file(doc_dir / "intake.json", {})
    pre_overrides = preprocess.get("_manual_overrides", {})
    ana_overrides = analysis.get("_manual_overrides", {})
    media_langs = general.get("languages") or ([general["language"]] if general.get("language") else [])
    return {
        "title": {
            "preprocess": preprocess.get("title") or "",
            "media": general.get("episodeTitle") or general.get("seriesTitle") or "",
            "confirmed": pre_overrides.get("title") == "researcher_confirmed",
        },
        "language": {
            "preprocess": preprocess.get("language_detected") or "",
            "media": ", ".join(media_langs) if media_langs else "",
            "analysis": analysis.get("language") or "",
            "confirmed": pre_overrides.get("language_detected") == "researcher_confirmed",
        },
        "creator": {
            "preprocess": preprocess.get("sitename") or preprocess.get("hostname") or "",
            "media": general.get("creator") or general.get("channel") or "",
        },
        "source_url": intake.get("source_url") or intake.get("source") or "",
        "type": {
            "analysis": analysis.get("type") or "",
            "confidence": analysis.get("confidence", {}).get("overall_score"),
            "confidence_status": analysis.get("confidence", {}).get("status", ""),
            "confirmed": ana_overrides.get("type") == "researcher_confirmed",
        },
        "format": {
            "analysis": analysis.get("format") or "",
            "confirmed": ana_overrides.get("format") == "researcher_confirmed",
        },
        "country": {
            "analysis": analysis.get("country") or [],
            "confirmed": ana_overrides.get("country") == "researcher_confirmed",
        },
    }


def _save_confirmed_title(doc_dir: Path, title: str) -> None:
    preprocess_path = doc_dir / "preprocess.json"
    preprocess = _read_json_file(preprocess_path, {})
    if preprocess is not None:
        preprocess["title"] = title
        preprocess.setdefault("_manual_overrides", {})["title"] = "researcher_confirmed"
        preprocess_path.write_text(json.dumps(preprocess, indent=2), encoding="utf-8")
    media_path = doc_dir / "media_metadata.json"
    if media_path.exists():
        media = _read_json_file(media_path, {})
        if media is not None:
            media.setdefault("general", {})["episodeTitle"] = title
            media_path.write_text(json.dumps(media, indent=2), encoding="utf-8")


_COUNTRY_ALIASES: dict[str, str] = {
    "UK": "United Kingdom",
    "GB": "United Kingdom",
    "Great Britain": "United Kingdom",
    "England": "United Kingdom",
    "US": "United States",
    "USA": "United States",
    "United States of America": "United States",
    "DE": "Germany",
    "NO": "Norway",
    "SE": "Sweden",
    "FI": "Finland",
    "DK": "Denmark",
    "IS": "Iceland",
    "NL": "Netherlands",
    "The Netherlands": "Netherlands",
    "Holland": "Netherlands",
    "FR": "France",
    "ES": "Spain",
    "IT": "Italy",
    "PL": "Poland",
    "AT": "Austria",
    "CH": "Switzerland",
    "BE": "Belgium",
    "PT": "Portugal",
    "IE": "Ireland",
    "HU": "Hungary",
    "CZ": "Czech Republic",
    "SK": "Slovakia",
    "RO": "Romania",
    "HR": "Croatia",
    "RS": "Serbia",
    "BA": "Bosnia and Herzegovina",
    "GR": "Greece",
    "BG": "Bulgaria",
    "UA": "Ukraine",
    "RU": "Russia",
    "TR": "Turkey",
    "EU": "European Union",
    "CA": "Canada",
    "AU": "Australia",
    "NZ": "New Zealand",
    "ZA": "South Africa",
    "BR": "Brazil",
}


def _normalise_country(name: str) -> str:
    """Expand ISO-2 codes and common abbreviations to full country names."""
    stripped = name.strip()
    return _COUNTRY_ALIASES.get(stripped, stripped)


def _normalise_country_list(countries: list) -> list[str]:
    return [_normalise_country(c) for c in countries if isinstance(c, str) and c.strip()]


def _save_confirmed_language(doc_dir: Path, language: str) -> None:
    preprocess_path = doc_dir / "preprocess.json"
    preprocess = _read_json_file(preprocess_path, {})
    if preprocess is not None:
        preprocess["language_detected"] = language
        preprocess.setdefault("_manual_overrides", {})["language_detected"] = "researcher_confirmed"
        preprocess_path.write_text(json.dumps(preprocess, indent=2), encoding="utf-8")


def _save_confirmed_classification(
    doc_dir: Path,
    country: list | None,
    doc_type: str | None,
    doc_format: str | None,
) -> None:
    analysis_path = doc_dir / "analysis.json"
    analysis = _read_json_file(analysis_path, {})
    if analysis is None:
        return
    overrides: dict = analysis.setdefault("_manual_overrides", {})
    if country is not None:
        analysis["country"] = _normalise_country_list(country)
        overrides["country"] = "researcher_confirmed"
    if doc_type:
        analysis["type"] = doc_type
        overrides["type"] = "researcher_confirmed"
    if doc_format:
        analysis["format"] = doc_format
        overrides["format"] = "researcher_confirmed"
    analysis_path.write_text(json.dumps(analysis, indent=2), encoding="utf-8")


def _save_confirmed_register_fields(
    doc_dir: Path,
    narrative_register: str | None,
    rhetorical_intensity: str | None,
    framing_balance: str | None,
) -> list[str]:
    """Save researcher-confirmed register/intensity/balance fields to analysis.json.

    Returns a list of field names that were actually changed.
    """
    analysis_path = doc_dir / "analysis.json"
    if not analysis_path.exists():
        return []
    analysis = _read_json_file(analysis_path, {})
    if not analysis:
        return []
    overrides: dict = analysis.setdefault("_manual_overrides", {})
    changed: list[str] = []
    if narrative_register:
        analysis["narrative_register"] = narrative_register
        overrides["narrative_register"] = "researcher_confirmed"
        changed.append("narrative_register")
    if rhetorical_intensity:
        analysis["rhetorical_intensity"] = rhetorical_intensity
        overrides["rhetorical_intensity"] = "researcher_confirmed"
        changed.append("rhetorical_intensity")
    if framing_balance:
        analysis["framing_balance"] = framing_balance
        overrides["framing_balance"] = "researcher_confirmed"
        changed.append("framing_balance")
    if changed:
        analysis_path.write_text(json.dumps(analysis, indent=2), encoding="utf-8")
    return changed


_SOGICE_TYPES = [
    "Pro-SOGICE", "Anti-SOGICE", "Neutral-Academic",
    "Legal-Instrument", "Testimony", "Media-Coverage",
    "Internal-Org-Document", "Mixed",
    "Training-Certification-Material", "Liturgical-Devotional-Material",
    "Clinical-Therapeutic-Protocol", "Survivor-Network-Material",
    "Regulatory-Policy-Document",
]

_DOCUMENT_FORMATS = [
    "Website-Page", "Blog-Post", "Social-Media-Post", "Video", "Podcast",
    "News-Article", "Academic-Paper", "NGO-Report", "Government-Report",
    "Court-Judgment", "Legislative-Submission", "Parliamentary-Debate",
    "Press-Release", "Book", "Book-Chapter", "Pamphlet", "Newsletter",
    "Email", "Manual", "Course-Material", "Event-Program", "Other",
]

_NARRATIVE_REGISTERS = [
    "", "Pastoral-Healing", "Scientific-Clinical", "Legal-Policy",
    "Testimonial-Personal", "Conspiratorial", "Activist-Advocacy",
    "Journalistic", "Academic-Analytical", "Mixed",
]

_RHETORICAL_INTENSITIES = [
    "", "hook", "pathologizing", "active-conduct",
]

_FRAMING_BALANCES = [
    "", "pro-dominant", "anti-dominant", "genuinely-mixed", "unclear",
]

_HIGH_HARM_INDICATORS = {"Harm: Suicidality", "Harm: Physical"}


def _has_high_harm(harm_list: list) -> bool:
    return bool(_HIGH_HARM_INDICATORS.intersection(harm_list))


# ── ISO 639-1 language options for controlled selectbox (U1) ─────────────────
# Displayed as "en — English" but selectbox returns the bare ISO code.
# Languages are ordered by expected corpus frequency, then alphabetically.
_ISO_LANGUAGES: dict[str, str] = {
    "en": "English",
    "no": "Norwegian",
    "nb": "Norwegian Bokmål",
    "nn": "Norwegian Nynorsk",
    "de": "German",
    "fr": "French",
    "es": "Spanish",
    "pt": "Portuguese",
    "it": "Italian",
    "nl": "Dutch",
    "pl": "Polish",
    "ro": "Romanian",
    "cs": "Czech",
    "hu": "Hungarian",
    "sv": "Swedish",
    "da": "Danish",
    "fi": "Finnish",
    "ca": "Catalan",
    "sk": "Slovak",
    "hr": "Croatian",
    "lt": "Lithuanian",
    "lv": "Latvian",
    "et": "Estonian",
    "ru": "Russian",
    "uk": "Ukrainian",
    "el": "Greek",
    "tr": "Turkish",
}
_ISO_LANGUAGE_CODES = list(_ISO_LANGUAGES.keys())
_ISO_LANGUAGE_UNKNOWN = "(other — type below)"


def _iso_lang_display(code: str) -> str:
    """Format an ISO code for display: 'en — English'.  Unknown codes returned as-is."""
    name = _ISO_LANGUAGES.get(code)
    return f"{code} — {name}" if name else code


# ── Panel session-state reset helper (U3) ────────────────────────────────────

def _panel_reset_on_doc_change(panel: str, doc_id: str, keys: list[str]) -> bool:
    """Clear panel-local session-state keys when the active document changes.

    Returns True if the document changed this render cycle (callers can use
    this to skip stale in-memory state and re-read from disk).

    Usage::
        changed = _panel_reset_on_doc_change("mr", doc_id, ["mr_srt_path", ...])
    """
    tracker_key = f"_panel_{panel}_last_doc"
    last_doc = st.session_state.get(tracker_key)
    if last_doc == doc_id:
        return False
    # Document switched — clear all panel-local keys
    for key in keys:
        st.session_state.pop(key, None)
    st.session_state[tracker_key] = doc_id
    return True

_LEXICON_CLUSTERS = [
    "Unknown", "SSA-Rhetoric", "Pastoral-Coercion", "Pseudo-Science",
    "Policy-Resistance", "Anti-Trans/ROGD", "Anti-Gender",
    "Pro-Trans-SOGICE", "Non-SOGICE",
]

_LEXICON_FUNCTIONS = [
    "Unknown", "Slur", "Euphemism", "Conspiracy", "Pseudo-Diagnostic",
    "Identity-Policing", "Moral-Purity Frame", "Political Slogan",
    "Recruitment Frame", "Pastoral Rhetoric", "Disinformation Narrative",
    "Promotional Recruitment", "Testimonial Marketing",
]

_ENRICHMENT_ACTION_HELP = {
    "add_new": "Create a new Sanity entry if it does not already exist.",
    "add_variant": "Attach this wording as a variant of an existing lexicon term.",
    "add_evidence": "Append this document's evidence to an existing lexicon entry.",
    "add_definition": "Use this source to improve an existing entry's definition.",
    "merge_into": "Merge this proposal into another existing lexicon entry.",
    "enrich_existing": "Add evidence/details to an existing registry record.",
}

_PERSON_ROLE_OPTIONS = [
    "founder", "leader", "influencer", "therapist", "pastor",
    "survivor", "researcher", "politician", "other",
]

_GENDER_DYSPHORIA_CANONICAL_ID = "lexicon-gender-dysphoria"
_GENDER_DYSPHORIA_CANONICAL_TERM = "Gender Dysphoria"


def _lexicon_canonical_id(term: str) -> str:
    """Canonical lexiconEntry _id for a term, matching the Sanity writer's slug.

    Mirrors clients.sanity._slugify so a seed/legacy target's id equals the
    live Sanity _id once it is materialised — letting the three worlds dedupe.
    """
    slug = re.sub(r"[^a-z0-9]+", "-", str(term or "").strip().lower()).strip("-")
    return f"lexicon-{slug or 'untitled'}"


def _lexicon_target_label(term: dict) -> str:
    origin = (term.get("origin") or "sanity").lower()
    status = term.get("status") or "unknown"
    value = term.get("term") or term.get("_id") or "(untitled)"
    if origin == "seed":
        return f"{value} · Seed draft · not pushed"
    if origin == "legacy":
        return f"{value} · Legacy draft · not pushed"
    return f"{value} · Sanity · {status}"


def _lexicon_target_options(
    sanity_terms: list[dict],
    seed_terms: list[dict] | None = None,
    legacy_terms: list[dict] | None = None,
) -> list[dict]:
    """Unified canonical-term picker across the live + seed + legacy worlds.

    Sanity terms keep their real ``_id`` and status. Seed/legacy terms are not in
    Sanity yet, so they carry a computed canonical id and ``status='draft'``; the
    push path materialises them on first link. Dedupe is by canonical id with
    Sanity winning over seed winning over legacy, so a concept that already exists
    live is never shown twice.
    """
    rows: list[dict] = []
    seen: set[str] = set()

    # Sanity first so live entries win the dedupe.
    for term in sanity_terms or []:
        term_id = str(term.get("_id") or "").strip()
        term_text = str(term.get("term") or "").strip()
        if not term_id or not term_text or term_id in seen:
            continue
        seen.add(term_id)
        row = {
            "_id": term_id,
            "term": term_text,
            "status": term.get("status") or "unknown",
            "origin": "sanity",
            "in_sanity": True,
        }
        row["label"] = _lexicon_target_label(row)
        rows.append(row)

    for origin, source in (("seed", seed_terms), ("legacy", legacy_terms)):
        for term in source or []:
            term_text = str(term.get("term") or "").strip()
            if not term_text:
                continue
            term_id = str(term.get("_id") or "").strip() or _lexicon_canonical_id(term_text)
            if term_id in seen:
                continue
            seen.add(term_id)
            row = {
                "_id": term_id,
                "term": term_text,
                "status": "draft",
                "origin": origin,
                "in_sanity": False,
            }
            row["label"] = _lexicon_target_label(row)
            rows.append(row)

    return sorted(rows, key=lambda row: row["term"].casefold())


def _local_lexicon_targets() -> dict[str, list[dict]]:
    """Curated seed + legacy draft terms as link targets (no network/Sanity call).

    These are the 'trusted seed drafts' / 'legacy drafts': real previous-system
    vocabulary that may not be in Sanity yet. Returned as minimal ``{"term": ...}``
    rows for the unified canonical-term picker. Parse failures degrade to empty.
    """
    seed: list[dict] = []
    legacy: list[dict] = []
    try:
        seed_path = _project_root / "00_infrastructure" / "SOGICE_Lexicon_v2.1.md"
        if seed_path.exists():
            seed = [
                {"term": str(row.get("term") or "").strip()}
                for row in _parse_seed_lexicon(seed_path)
                if str(row.get("term") or "").strip()
            ]
    except Exception:
        seed = []
    try:
        legacy = [
            {"term": str(row.get("term") or "").strip()}
            for row in _parse_legacy_vocabulary()
            if str(row.get("term") or "").strip()
        ]
    except Exception:
        legacy = []
    return {"seed": seed, "legacy": legacy}


def _proposal_target_index(options: list[dict], item: dict) -> int:
    target_id = str(
        item.get("existing_entry_id")
        or item.get("merge_target_id")
        or item.get("target_term_id")
        or ""
    ).strip()
    target_term = str(
        item.get("existing_entry_term")
        or item.get("canonical_term")
        or item.get("variant_of")
        or ""
    ).strip().casefold()
    if target_id:
        for idx, option in enumerate(options):
            if option["_id"] == target_id:
                return idx
    if target_term:
        for idx, option in enumerate(options):
            if option["term"].casefold() == target_term:
                return idx
    return 0


def _apply_lexicon_target(item: dict, target: dict, *, action: str) -> None:
    """Store the selected existing lexicon target using writer-compatible keys."""
    item["existing_entry_id"] = target["_id"]
    item["existing_entry_term"] = target["term"]
    # Provenance for the push path: seed/legacy targets are materialised as draft
    # canonicals on first link; "sanity" targets already exist.
    item["target_origin"] = target.get("origin", "sanity")
    if action == "merge_into":
        item["merge_target_id"] = target["_id"]
    elif item.get("merge_target_id") == target["_id"]:
        item.pop("merge_target_id", None)
    if action == "add_variant":
        variant = {
            "variant_term": item.get("term", ""),
            "language": item.get("language", "unknown") or "unknown",
            "attestation_tier": item.get("attestation_tier", "tier-2-ngo-academic"),
            "source_note": item.get("researcher_note", "") or item.get("exact_quote", ""),
        }
        variants = [
            row for row in (item.get("variants") or [])
            if str(row.get("variant_term", "")).casefold() != str(variant["variant_term"]).casefold()
        ]
        if variant["variant_term"]:
            variants.insert(0, variant)
        item["variants"] = variants


def _tactic_match_key(value: str) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"^tactic:\s*", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text).strip()
    return re.sub(r"\s+", " ", text)


def _tactic_target_label(row: dict) -> str:
    tactic = row.get("tactic") or row.get("_id") or "(untitled)"
    return f"{tactic} · {row.get('_id', '')}"


def _tactic_target_options(sanity_tactics: list[dict]) -> list[dict]:
    rows: list[dict] = []
    seen: set[str] = set()
    for tactic in sanity_tactics or []:
        tactic_id = str(tactic.get("_id") or "").strip()
        label = str(tactic.get("tactic") or "").strip()
        if not tactic_id or not label or tactic_id in seen:
            continue
        seen.add(tactic_id)
        row = {
            "_id": tactic_id,
            "tactic": label,
            "match_key": _tactic_match_key(label),
        }
        row["label"] = _tactic_target_label(row)
        rows.append(row)
    return sorted(rows, key=lambda row: row["tactic"].casefold())


def _tactic_target_index(options: list[dict], item: dict) -> int:
    target_id = str(item.get("existing_tactic_id") or item.get("sanity_id") or "").strip()
    target_label = _tactic_match_key(item.get("existing_tactic_name") or item.get("tactic") or "")
    if target_id:
        for idx, option in enumerate(options):
            if option["_id"] == target_id:
                return idx
    if target_label:
        for idx, option in enumerate(options):
            if option.get("match_key") == target_label:
                return idx
    return 0


def _apply_tactic_target(item: dict, target: dict) -> None:
    item["existing_tactic_id"] = target["_id"]
    item["existing_tactic_name"] = target["tactic"]
    item["tactic"] = target["tactic"]


def _entity_target_label(row: dict) -> str:
    name = row.get("name") or row.get("_id") or "(unnamed entity)"
    entity_type = str(row.get("_type") or row.get("entity_type") or "entity").replace("organization", "org")
    return f"{name} · {entity_type} · {row.get('_id', '')}"


def _entity_target_options(sanity_entities: list[dict], *, current_id: str = "") -> list[dict]:
    """Return stable entity picker options from Sanity registry rows.

    The first option is an explicit empty choice so ``enrich_existing`` can be
    saved without pretending a target exists. If the current saved id is not in
    the fetched registry, keep it as a fallback row instead of silently dropping
    researcher state.
    """
    rows: list[dict] = [{
        "_id": "",
        "_type": "",
        "name": "— choose an existing entity —",
        "label": "— choose an existing entity —",
        "missing_from_registry": False,
    }]
    seen: set[str] = set()
    for entity in sanity_entities or []:
        entity_id = str(entity.get("_id") or entity.get("id") or entity.get("sanity_id") or "").strip()
        name = str(entity.get("name") or entity.get("fullName") or "").strip()
        if not entity_id or not name or entity_id in seen:
            continue
        seen.add(entity_id)
        row = {
            "_id": entity_id,
            "_type": str(entity.get("_type") or entity.get("entity_type") or "").strip(),
            "name": name,
            "fullName": str(entity.get("fullName") or "").strip(),
            "countryOfOrigin": entity.get("countryOfOrigin") or entity.get("country_of_origin") or "",
            "website": entity.get("website") or entity.get("website_url") or "",
            "missing_from_registry": False,
        }
        row["label"] = _entity_target_label(row)
        rows.append(row)
    current_id = str(current_id or "").strip()
    if current_id and current_id not in seen:
        rows.append({
            "_id": current_id,
            "_type": "",
            "name": current_id,
            "label": f"{current_id} · current saved id not returned by registry",
            "missing_from_registry": True,
        })
    return [rows[0]] + sorted(rows[1:], key=lambda row: str(row["label"]).casefold())


def _entity_target_index(options: list[dict], item: dict) -> int:
    target_id = str(item.get("existing_entity_id") or item.get("sanity_id") or "").strip()
    if target_id:
        for idx, option in enumerate(options):
            if option.get("_id") == target_id:
                return idx
    target_name = str(item.get("existing_entity_name") or item.get("name") or "").strip().casefold()
    if target_name:
        for idx, option in enumerate(options):
            if str(option.get("name") or "").strip().casefold() == target_name:
                return idx
    return 0


def _apply_entity_target(item: dict, target: dict) -> None:
    target_id = str(target.get("_id") or "").strip()
    if not target_id:
        item["existing_entity_id"] = None
        item.pop("existing_entity_name", None)
        return
    item["existing_entity_id"] = target_id
    item["existing_entity_name"] = target.get("name") or target_id
    entity_type = str(target.get("_type") or "").strip()
    if entity_type in {"organization", "person"}:
        item["entity_type"] = entity_type



def _repair_known_lexicon_variant_for_review(item: dict) -> dict:
    """Route narrow previous-system variants to their canonical review target.

    This mirrors the enrichment normalizer, but runs in the Streamlit review
    queue so older enrichment.json files do not keep presenting known variants
    as brand-new canonical terms.
    """
    repaired = dict(item)
    if repaired.get("action") != "add_new":
        return repaired
    term = str(repaired.get("term") or "").casefold()
    if (
        "discordance between" not in term
        or "sex" not in term
        or ("perceived sex" not in term and "perceived gender" not in term)
    ):
        return repaired

    repaired["action"] = "add_variant"
    repaired["existing_entry_id"] = _GENDER_DYSPHORIA_CANONICAL_ID
    repaired["existing_entry_term"] = _GENDER_DYSPHORIA_CANONICAL_TERM
    repaired["target_origin"] = repaired.get("target_origin") or "seed"

    variant_term = str(repaired.get("term") or "").strip()
    variants = [
        dict(row)
        for row in (repaired.get("variants") or [])
        if isinstance(row, dict)
    ]
    seen = {
        str(row.get("variant_term") or "").casefold()
        for row in variants
    }
    if variant_term and variant_term.casefold() not in seen:
        variants.insert(0, {
            "variant_term": variant_term,
            "language": repaired.get("language") or "en",
            "attestation_tier": "tier-3-inferred",
            "source_note": repaired.get("exact_quote") or "",
        })
    repaired["variants"] = variants
    return repaired


def _sanity_studio_url(config, doc_id: str) -> str | None:
    """Return the Sanity Studio URL for a sogiceDocument, or None if credentials missing."""
    pid = getattr(config, "sanity_project_id", "") if config else ""
    dataset = getattr(config, "sanity_dataset", "production") if config else "production"
    if not pid or not doc_id:
        return None
    return f"https://{pid}.sanity.studio/{dataset}/structure/sogiceDocument;doc-{doc_id}"


def _sanity_studio_section_url(config, section: str) -> str | None:
    """Return a Sanity Studio URL for a content-type section (e.g. lexiconEntry, tacticEntry).

    section examples: 'lexiconEntry', 'tacticEntry', 'entityEntry'
    """
    pid = getattr(config, "sanity_project_id", "") if config else ""
    dataset = getattr(config, "sanity_dataset", "production") if config else "production"
    if not pid:
        return None
    return f"https://{pid}.sanity.studio/{dataset}/structure/{section}"


def _sanity_studio_record_url(config, sanity_id: str, section: str = "lexiconEntry") -> str | None:
    """Return a direct Sanity Studio URL for a specific record by its _id."""
    pid = getattr(config, "sanity_project_id", "") if config else ""
    dataset = getattr(config, "sanity_dataset", "production") if config else "production"
    if not pid or not sanity_id:
        return None
    return f"https://{pid}.sanity.studio/{dataset}/structure/{section};{sanity_id}"


def _render_metadata_reconciliation(doc_id: str, doc_dir: Path, config):
    """Side-by-side metadata source view with researcher confirmation controls."""
    src = _collect_metadata_sources(doc_dir)

    # ── Source comparison table ──────────────────────────────────────────────
    def _badge(confirmed: bool) -> str:
        return " ✓ confirmed" if confirmed else ""

    rows = [
        {
            "Field": f"title{_badge(src['title']['confirmed'])}",
            "preprocess.json": src["title"]["preprocess"] or "—",
            "media_metadata.json": src["title"]["media"] or "—",
        },
        {
            "Field": f"language{_badge(src['language']['confirmed'])}",
            "preprocess.json": src["language"]["preprocess"] or "—",
            "media_metadata.json": src["language"]["media"] or "—",
            "analysis.json": src["language"]["analysis"] or "—",
        },
        {
            "Field": "creator/channel",
            "preprocess.json": src["creator"]["preprocess"] or "—",
            "media_metadata.json": src["creator"]["media"] or "—",
        },
        {
            "Field": "source URL",
            "intake.json": (src["source_url"] or "—")[:60],
        },
        {
            "Field": f"type{_badge(src['type']['confirmed'])}",
            "analysis.json": (
                f"{src['type']['analysis'] or '—'}"
                + (f" ({src['type']['confidence_status']} {src['type']['confidence']:.2f})"
                   if src["type"]["confidence"] is not None else "")
            ),
        },
        {
            "Field": f"format{_badge(src['format']['confirmed'])}",
            "analysis.json": src["format"]["analysis"] or "—",
        },
        {
            "Field": f"country{_badge(src['country']['confirmed'])}",
            "analysis.json": ", ".join(src["country"]["analysis"]) if src["country"]["analysis"] else "—",
        },
    ]
    st.dataframe(rows, hide_index=True, width="stretch")

    # ── Title + language confirmation ────────────────────────────────────────
    st.markdown("**Confirm title and language**")
    best_title = src["title"]["preprocess"] or src["title"]["media"] or ""
    best_lang = (
        src["language"]["preprocess"]
        or src["language"]["analysis"]
        or src["language"]["media"]
        or ""
    )
    with st.form(f"meta_recon_{doc_id}"):
        confirmed_title = st.text_input(
            "Canonical title",
            value=best_title,
            placeholder="Enter or confirm title",
            help="Saved to preprocess.json and media_metadata.json. "
                 "Controls what appears in Sanity content.title on next upload.",
        )
        # U1: controlled ISO language selectbox — shows full name, stores bare code.
        # If the existing value is not in the known list, offer it as a custom option.
        _lang_options = _ISO_LANGUAGE_CODES + [_ISO_LANGUAGE_UNKNOWN]
        _lang_idx = (
            _lang_options.index(best_lang)
            if best_lang and best_lang in _lang_options
            else len(_lang_options) - 1  # "other" sentinel
        )
        _lang_selected = st.selectbox(
            "Canonical language",
            _lang_options,
            index=_lang_idx,
            format_func=lambda c: _iso_lang_display(c) if c != _ISO_LANGUAGE_UNKNOWN else c,
            help=(
                "Select from the list. For regional variants (e.g. pt-BR) or rare "
                "languages, choose '(other — type below)' and enter the BCP-47 code."
            ),
        )
        _lang_custom = ""
        if _lang_selected == _ISO_LANGUAGE_UNKNOWN:
            _lang_custom = st.text_input(
                "Custom language code (BCP-47, e.g. pt-BR, nb, sr-Latn)",
                value=best_lang if best_lang and best_lang not in _ISO_LANGUAGE_CODES else "",
                placeholder="pt-BR",
                help="Enter a valid BCP-47 or ISO 639-1 code.",
            )
        # Effective code: custom input overrides selectbox when "other" is chosen
        confirmed_lang = (_lang_custom.strip() if _lang_selected == _ISO_LANGUAGE_UNKNOWN
                          else _lang_selected)

        st.markdown("**Classification fields**")
        st.caption(
            "Editing these updates analysis.json and marks them researcher-confirmed. "
            "Changing type or country may affect recommended annotation profiles and public-table filtering."
        )
        type_options = _SOGICE_TYPES
        cur_type = src["type"]["analysis"] or ""
        type_idx = type_options.index(cur_type) if cur_type in type_options else 0
        confirmed_type = st.selectbox(
            "Type",
            type_options,
            index=type_idx,
            help="Changing this overrides the LLM classification.",
        )
        cur_format = src["format"]["analysis"] or "Other"
        confirmed_format = _controlled_select(
            "Format",
            cur_format,
            _DOCUMENT_FORMATS,
            key=f"recon_format_{doc_id}",
            help="Must match the Sanity controlled vocabulary.",
        )
        confirmed_country = st.text_input(
            "Country / countries (comma-separated)",
            value=", ".join(src["country"]["analysis"]) if src["country"]["analysis"] else "",
            placeholder="e.g. United Kingdom, Germany",
        )

        push_sanity = st.checkbox(
            "Push to Sanity now (live write — requires connection)",
            value=False,
            disabled=not bool(config),
            help=(
                "Off by default — local files are always saved first regardless. "
                "Enable only when you want to patch the live Sanity record immediately. "
                "Requires SANITY_WRITE_TOKEN and an active network connection."
            ),
        )
        submitted = st.form_submit_button("Save confirmed metadata")

    if not submitted:
        return

    changed: list[str] = []
    errors: list[str] = []

    confirmed_title = confirmed_title.strip()
    confirmed_lang = confirmed_lang.strip()
    if confirmed_lang and not _valid_language_code(confirmed_lang):
        st.error("Language must be an ISO-style code such as `en`, `pt`, `no`, `nb`, `de`, or `pt-BR`.")
        return

    if confirmed_title:
        _save_confirmed_title(doc_dir, confirmed_title)
        changed.append("title")
    if confirmed_lang:
        _save_confirmed_language(doc_dir, confirmed_lang)
        changed.append("language")

    country_list = [c.strip() for c in confirmed_country.split(",") if c.strip()]
    classification_changed = False
    if confirmed_type != (src["type"]["analysis"] or ""):
        classification_changed = True
    if confirmed_format != (src["format"]["analysis"] or "Other"):
        classification_changed = True
    if country_list != (src["country"]["analysis"] or []):
        classification_changed = True
    if classification_changed:
        _save_confirmed_classification(
            doc_dir,
            country_list if confirmed_country.strip() else None,
            confirmed_type if confirmed_type != (src["type"]["analysis"] or "") else None,
            confirmed_format if confirmed_format != (src["format"]["analysis"] or "Other") else None,
        )
        changed.append("classification")

    sanity_patched: list[str] = []
    if push_sanity and config:
        from runner.clients import sanity as sanity_client
        try:
            if confirmed_title or confirmed_lang:
                content_fields = []
                if confirmed_title:
                    content_fields += ["content.title", "mediaMetadata.general.episodeTitle"]
                if confirmed_lang:
                    content_fields.append("content.languageDetected")
                sanity_id = sanity_client.write_content_metadata_update(
                    doc_id,
                    confirmed_title or None,
                    confirmed_lang or None,
                    config,
                )
                sanity_patched.append(f"{', '.join(content_fields)} → {sanity_id}")
        except Exception as exc:
            errors.append(f"Sanity content patch: {exc}")
        try:
            if country_list or confirmed_type or confirmed_format.strip():
                class_fields = []
                if confirmed_type:
                    class_fields.append("classification.type")
                if confirmed_format and confirmed_format != "Other":
                    class_fields.append("classification.format")
                if country_list:
                    class_fields.append("classification.country")
                sanity_id = sanity_client.write_classification_update(
                    doc_id,
                    country_list if confirmed_country.strip() else None,
                    confirmed_type or None,
                    confirmed_format if confirmed_format != "Other" else None,
                    config,
                )
                sanity_patched.append(f"{', '.join(class_fields)} → {sanity_id}")
        except Exception as exc:
            errors.append(f"Sanity classification patch: {exc}")

    _file_hints = {
        "title": "preprocess.json + media_metadata.json",
        "language": "preprocess.json",
        "classification": "analysis.json (_manual_overrides)",
    }
    if changed:
        file_details = "; ".join(
            f"{f} → {_file_hints.get(f, 'local')}" for f in changed
        )
        st.success(f"Saved locally: {file_details}.")
        if not push_sanity:
            st.info(
                "Local files updated. These changes will be included the next time you "
                "upload or re-upload this document to Sanity. To push immediately, "
                "enable 'Push to Sanity now' and resubmit."
            )
    elif push_sanity and sanity_patched:
        st.info("No local values changed; Sanity patch was still sent from the confirmed form values.")
    elif not changed:
        st.info("No local values changed. Edit a field, or enable Sanity push to resend confirmed values.")
    if sanity_patched:
        st.success("Patched Sanity fields: " + "; ".join(sanity_patched))
        studio_url = _sanity_studio_url(config, doc_id)
        if studio_url:
            st.markdown(f"[Verify in Sanity Studio ↗]({studio_url})")
    if errors:
        for e in errors:
            st.error(e)
    if changed:
        st.rerun()

    # ── Register / intensity / balance correction ────────────────────────────
    st.markdown("**Narrative register, rhetorical intensity, framing balance**")
    st.caption(
        "These fields capture the rhetorical mode and SOGICE engagement level. "
        "Corrections are saved to analysis.json with a researcher_confirmed override marker. "
        "Leave blank to keep the current LLM value."
    )
    _analysis_now = _read_json_file(doc_dir / "analysis.json", {})
    _reg_overrides = _analysis_now.get("_manual_overrides", {})

    with st.form(key=f"recon_register_{doc_id}"):
        reg_col, int_col, bal_col = st.columns(3)
        with reg_col:
            cur_reg = _analysis_now.get("narrative_register") or ""
            confirmed_reg = _controlled_select(
                "Narrative register",
                cur_reg if cur_reg in _NARRATIVE_REGISTERS else "",
                _NARRATIVE_REGISTERS,
                key=f"recon_reg_{doc_id}",
                help="Overall tone and rhetorical mode of the document.",
            )
            if _reg_overrides.get("narrative_register") == "researcher_confirmed":
                st.caption("✓ researcher confirmed")
        with int_col:
            cur_int = _analysis_now.get("rhetorical_intensity") or ""
            confirmed_int = _controlled_select(
                "Rhetorical intensity",
                cur_int if cur_int in _RHETORICAL_INTENSITIES else "",
                _RHETORICAL_INTENSITIES,
                key=f"recon_int_{doc_id}",
                help="hook = soft framing; pathologizing = frames SOGIE as disorder; active-conduct = explicit SOGICE practice.",
            )
            if _reg_overrides.get("rhetorical_intensity") == "researcher_confirmed":
                st.caption("✓ researcher confirmed")
        with bal_col:
            cur_bal = _analysis_now.get("framing_balance") or ""
            confirmed_bal = _controlled_select(
                "Framing balance",
                cur_bal if cur_bal in _FRAMING_BALANCES else "",
                _FRAMING_BALANCES,
                key=f"recon_bal_{doc_id}",
                help="Whether the document's framing is pro-, anti-, mixed, or unclear.",
            )
            if _reg_overrides.get("framing_balance") == "researcher_confirmed":
                st.caption("✓ researcher confirmed")

        reg_submitted = st.form_submit_button("Save register corrections")

    if reg_submitted:
        reg_changed = _save_confirmed_register_fields(
            doc_dir,
            confirmed_reg or None,
            confirmed_int or None,
            confirmed_bal or None,
        )
        if reg_changed:
            st.success(
                f"Saved to analysis.json: {', '.join(reg_changed)} "
                "(marked researcher_confirmed in _manual_overrides). "
                "These will be included on next Sanity upload."
            )
            st.rerun()
        else:
            st.info("No register fields changed.")


def _render_document_date_editor(doc_id: str, doc_dir: Path, config, compact: bool = False):
    if not config:
        st.warning("Config unavailable; cannot edit dates.")
        return
    analysis = _read_json_file(doc_dir / "analysis.json", {})
    preprocess = _read_json_file(doc_dir / "preprocess.json", {})
    media = _read_json_file(doc_dir / "media_metadata.json", {})
    general = media.get("general", {}) if isinstance(media, dict) else {}
    document_date = analysis.get("document_date") or {}
    publication_date = (
        general.get("publicationDate")
        or preprocess.get("date_published")
        or analysis.get("publication_date")
        or ""
    )
    publication_date = _normalise_publication_date(str(publication_date or ""))

    st.markdown("**Source and document dates**")
    st.caption(
        "Publication date is the source/platform date. Document date is the archive classification date used in Sanity."
    )
    with st.form(f"doc_date_editor_{doc_id}_{'compact' if compact else 'full'}"):
        publication_input = st.text_input(
            "Source publication date",
            value=str(publication_date or ""),
            placeholder="YYYY-MM-DD",
        )
        c1, c2, c3, c4 = st.columns(4)
        year = c1.number_input(
            "Document year",
            min_value=0,
            max_value=2100,
            value=int(document_date.get("year") or _year_from_date(publication_date) or 0),
        )
        month = c2.number_input(
            "Month",
            min_value=0,
            max_value=12,
            value=int(document_date.get("month") or _month_from_date(publication_date) or 0),
        )
        day = c3.number_input(
            "Day",
            min_value=0,
            max_value=31,
            value=int(document_date.get("day") or _day_from_date(publication_date) or 0),
        )
        confidence_values = ["exact", "approximate", "unknown"]
        confidence = document_date.get("confidence") or document_date.get("dateConfidence") or "unknown"
        confidence_index = confidence_values.index(confidence) if confidence in confidence_values else 2
        date_confidence = c4.selectbox("Confidence", confidence_values, index=confidence_index)
        push_sanity = st.checkbox("Also push dates to Sanity", value=False)
        submitted = st.form_submit_button("Save dates")

    if not submitted:
        return

    publication_input = _normalise_publication_date(publication_input.strip())
    if publication_input and not re.match(r"^\d{4}(-\d{2})?(-\d{2})?$", publication_input):
        st.error("Use YYYY, YYYY-MM, YYYY-MM-DD, or an ISO datetime for source publication date.")
        return

    try:
        payload = _save_document_dates_local(
            doc_dir=doc_dir,
            publication_date=publication_input,
            document_date={
                "year": int(year),
                "month": int(month),
                "day": int(day),
                "confidence": date_confidence,
            },
        )
        sanity_id = ""
        if push_sanity:
            from runner.clients import sanity as sanity_client

            sanity_id = sanity_client.write_document_date_update(
                doc_id,
                payload["document_date"],
                payload["publication_date"],
                config,
            )
        if sanity_id:
            date_fields = []
            if payload.get("publication_date"):
                date_fields.append("mediaMetadata.general.publicationDate")
            if payload.get("document_date"):
                date_fields.append("mediaMetadata.general.documentDate")
            st.success(
                f"Saved locally and patched Sanity fields: {', '.join(date_fields) or 'dates'} → {sanity_id}. "
                f"Source published: {payload['publication_date'] or '—'}; "
                f"document date: {_document_date_to_text(payload['document_date']) or '—'}."
            )
            studio_url = _sanity_studio_url(config, doc_id)
            if studio_url:
                st.markdown(f"[Verify in Sanity Studio]({studio_url})")
        else:
            st.success(
                "Saved dates to analysis.json + preprocess.json. "
                f"Source published: {payload['publication_date'] or '—'}; "
                f"document date: {_document_date_to_text(payload['document_date']) or '—'}. "
                "Tick 'Also push dates to Sanity' and resubmit to push these to the live record."
            )
        st.rerun()
    except Exception as exc:
        st.error(str(exc))


def _save_document_dates_local(doc_dir: Path, publication_date: str, document_date: dict) -> dict:
    analysis_path = doc_dir / "analysis.json"
    analysis = _read_json_file(analysis_path, {})
    if analysis:
        analysis["document_date"] = document_date
        analysis["publication_date"] = publication_date
        analysis_path.write_text(json.dumps(analysis, indent=2), encoding="utf-8")

    preprocess_path = doc_dir / "preprocess.json"
    preprocess = _read_json_file(preprocess_path, {})
    if preprocess:
        preprocess["date_published"] = publication_date
        preprocess_path.write_text(json.dumps(preprocess, indent=2), encoding="utf-8")

    media_path = doc_dir / "media_metadata.json"
    media = _read_json_file(media_path, {})
    if media:
        media.setdefault("general", {})["publicationDate"] = publication_date
        media_path.write_text(json.dumps(media, indent=2), encoding="utf-8")

    return {"publication_date": publication_date, "document_date": document_date}


def _normalise_publication_date(value: str) -> str:
    value = (value or "").strip()
    match = re.match(r"^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?", value)
    if not match:
        return value
    parts = [part for part in match.groups() if part]
    if len(parts) == 1:
        return parts[0]
    if len(parts) == 2:
        return f"{parts[0]}-{parts[1]}"
    return f"{parts[0]}-{parts[1]}-{parts[2]}"


def _valid_language_code(value: str) -> bool:
    """Accept simple ISO 639 style codes and common BCP-47 regional variants."""
    return bool(re.match(r"^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$", (value or "").strip()))


def _year_from_date(value: str) -> int:
    return int(value[:4]) if value and re.match(r"^\d{4}", str(value)) else 0


def _month_from_date(value: str) -> int:
    return int(value[5:7]) if value and re.match(r"^\d{4}-\d{2}", str(value)) else 0


def _day_from_date(value: str) -> int:
    return int(value[8:10]) if value and re.match(r"^\d{4}-\d{2}-\d{2}", str(value)) else 0


def _document_date_to_text(document_date: dict) -> str:
    if not isinstance(document_date, dict):
        return ""
    year = int(document_date.get("year") or 0)
    month = int(document_date.get("month") or 0)
    day = int(document_date.get("day") or 0)
    if not year:
        return ""
    if month and day:
        return f"{year:04d}-{month:02d}-{day:02d}"
    if month:
        return f"{year:04d}-{month:02d}"
    return f"{year:04d}"


def _count_frame(values, label: str, count_label: str, pd):
    from collections import Counter

    clean = [str(value).strip() for value in values if str(value).strip()]
    counts = Counter(clean)
    rows = [
        {label: key, count_label: count}
        for key, count in counts.most_common(25)
    ]
    return pd.DataFrame(rows, columns=[label, count_label])


# ---------------------------------------------------------------------------
# Ingest Workbench
# ---------------------------------------------------------------------------

def page_ingest_workbench():
    st.title("Ingest Workbench")

    config = _load_config_safe()
    if not config:
        st.error("Could not load config. Check runner/.env.")
        return

    _init_ingest_state()

    with st.sidebar:
        if st.button("Reset Workbench"):
            st.session_state.ingest = _blank_ingest_state()
            st.rerun()

    # ── Resume an existing doc ───────────────────────────────────────────────
    with st.expander("Resume existing doc_id", expanded=False):
        st.caption(
            "Load a document that was already ingested (intake + extraction done) "
            "but still needs analysis, upload, or both. "
            "Paste the doc_id, pick the stage to continue from, then use the buttons below."
        )
        resume_id = st.text_input("doc_id to resume", placeholder="e.g. 3281c668", key="resume_doc_id")
        resume_stage = st.selectbox(
            "Continue from stage",
            ["Analyze", "Upload (analysis already done)", "Enrich (analysis already done)"],
            key="resume_stage",
        )
        if st.button("Load doc into workbench", key="resume_load"):
            if not resume_id.strip():
                st.error("Enter a doc_id first.")
            else:
                _workbench_resume(config, resume_id.strip(), resume_stage)

    source = st.text_input("Source URL or local file path", value=st.session_state.ingest["source"])
    st.session_state.ingest["source"] = source
    provenance_url = st.text_input(
        "Original/source URL for local files",
        value=st.session_state.ingest.get("source_url", ""),
        placeholder="Optional, but useful when a PDF/file came from the web",
    )
    st.session_state.ingest["source_url"] = provenance_url

    c1, c2, c3 = st.columns([1, 1, 1])
    with c1:
        llm = st.selectbox(
            "Analysis model",
            ["litelm", "litelm-heavy", "litelm-reasoning", "claude", "local", "local-heavy", "local-reasoning", "openrouter", "both"],
            index=["litelm", "litelm-heavy", "litelm-reasoning", "claude", "local", "local-heavy", "local-reasoning", "openrouter", "both"].index(st.session_state.ingest["llm"]),
        )
        st.session_state.ingest["llm"] = llm
        if llm.startswith("litelm") and config.litelm_base_url:
            _litelm_stat = _litelm_status_cached(config.litelm_base_url)
            _litelm_badge = {"online": "🟢 Mac Studio reachable", "offline": "🔴 Mac Studio offline", "error": "🟠 Mac Studio error"}.get(_litelm_stat, "⚪ Unknown")
            st.caption(_litelm_badge)
        elif llm.startswith("litelm") and not config.litelm_base_url:
            st.caption("⚪ LITELM_BASE_URL not set")
    with c2:
        tier = st.selectbox("Tier", ["auto", "1", "2", "3"], index=0)
        _render_tier_help()
    with c3:
        batch = st.text_input("Batch", value=st.session_state.ingest["batch"], placeholder="unassigned")
        st.session_state.ingest["batch"] = batch

    c4, c5 = st.columns([1, 1])
    with c4:
        max_chars = st.number_input(
            "Preprocess char limit (0 = full document)",
            min_value=0,
            value=0,
            step=1000,
            help=(
                "This is a character limit before analysis, not the model token window. "
                "Use 0 for no preprocessing truncation. Local/LiteLLM defaults use "
                f"{config.truncation_limit_local:,} chars when a limit is needed."
            ),
        )
        allow_whisper = st.checkbox(
            "Allow Whisper fallback for video/audio",
            value=st.session_state.ingest.get("allow_whisper", False),
            help=(
                "Off by default. If platform captions are unavailable, the workflow pauses "
                "so you can upload an SRT/VTT before analysis. Turn this on to transcribe locally."
            ),
        )
        st.session_state.ingest["allow_whisper"] = allow_whisper
        config.media_allow_whisper = allow_whisper
    with c5:
        run_enrich = st.checkbox(
            "Run enrichment after upload",
            value=st.session_state.ingest["run_enrich"],
            help=(
                "On by default. Enrichment (Stage 3c) mines the document for lexicon "
                "and entity proposals after a confirmed upload. Uncheck to skip for "
                "quick tests or when Mac Studio is offline."
            ),
        )
        st.session_state.ingest["run_enrich"] = run_enrich
        enrich_options = list(dict.fromkeys([config.litelm_enrichment_model, config.litelm_enrichment_model_alt, "lexicon-llm", "core-gemma"]))
        enrich_model = st.selectbox(
            "Enrichment model",
            enrich_options,
            index=0,
        )
        st.session_state.ingest["enrich_model"] = enrich_model
        st.caption("Enrichment creates proposals. It does not change live registries or document assets until you approve them.")

    st.divider()
    gate = _proposal_gate_status(config.corpus_dir)
    if gate["blocked"]:
        st.warning(
            "There are unresolved enrichment proposals. You can keep ingesting, but process the queue when ready so future analysis gets the best lexicon/registry context."
        )
        st.write(
            f"Unresolved lexicon: {gate['unresolved_lexicon']} | "
            f"approved lexicon not pushed: {gate['approved_unpushed_lexicon']} | "
            f"unresolved entities: {gate['unresolved_entities']} | "
            f"approved entities not pushed: {gate['approved_unpushed_entities']} | "
            f"unresolved tactics: {gate['unresolved_tactics']} | "
            f"approved tactics not pushed: {gate['approved_unpushed_tactics']} | "
            f"unresolved practices: {gate['unresolved_practices']} | "
            f"approved practices not pushed: {gate['approved_unpushed_practices']} | "
            f"unresolved claims: {gate['unresolved_statistical_claims']} | "
            f"approved claims not pushed: {gate['approved_unpushed_statistical_claims']}"
        )
        st.caption("Open Lexicon → Local Proposals to approve/reject proposals and push approved records.")
    _render_stage_progress()

    btn_col1, btn_col2, btn_col3 = st.columns([1, 1, 2])
    with btn_col1:
        enrich_label = " + Enrich" if run_enrich else ""
        run_all = st.button(
            f"▶ Run Pipeline{enrich_label}",
            type="primary",
            disabled=not source.strip(),
            help=(
                "Runs Intake → Extract → Analyze automatically, then stops for JSON review."
                + (" Also runs enrichment after upload." if run_enrich else "")
            ),
        )
    with btn_col2:
        run_triage_btn = st.button(
            "🔎 Triage",
            disabled=not source.strip(),
            help="Quick pre-screen: recommends which analysis model to use. Non-blocking — does not affect the pipeline.",
        )
    with btn_col3:
        st.caption(
            "Runs all stages automatically and stops at the JSON review step."
            + (" Enrichment checkbox is ON — will also run enrichment after upload." if run_enrich else "")
        )

    if run_triage_btn and source.strip():
        with st.spinner("Running triage…"):
            try:
                from runner.pipeline import triage as _triage_mod
                snippet, _method = _triage_mod.extract_snippet(source.strip())
                triage_result = _triage_mod.run(
                    snippet,
                    config,
                    source_label=_triage_mod.source_context_label(
                        source.strip(), extraction_note=_method, snippet=snippet,
                    ),
                )
                st.info(
                    f"**Triage recommendation:** `{triage_result.recommended_llm}`  \n"
                    f"**Type hint:** {triage_result.doc_type_hint}  |  "
                    f"**Complexity:** {triage_result.complexity}  \n"
                    f"**Reason:** {triage_result.routing_reason}"
                )
                if triage_result.recommended_llm and triage_result.recommended_llm != llm:
                    st.caption(
                        f"You are currently set to `{llm}`. "
                        "Update the model selector above if you want to follow this recommendation."
                    )
                # U6: persist triage result — save to doc folder if we have a doc_id,
                # otherwise stash in session state for intake to pick up later.
                _resume_doc = resume_id.strip() if resume_id.strip() else ""
                if _resume_doc:
                    _triage_mod.save_triage_result(_resume_doc, triage_result, config)
                    st.caption(f"Triage result saved to `{_resume_doc}/triage_result.json`.")
                else:
                    st.session_state["_pending_triage_result"] = triage_result
            except Exception as _triage_exc:
                st.warning(f"Triage failed (non-blocking): {_triage_exc}")

    if run_all:
        effective_max = _effective_max_chars(max_chars, llm, config)
        from runner.pipeline import intake as _intake_mod
        existing = _intake_mod.find_existing_by_source(source.strip(), config)
        if existing:
            ids = ", ".join(e["doc_id"] for e in existing)
            uploaded_flag = any(e.get("uploaded") for e in existing)
            status = "uploaded to Sanity" if uploaded_flag else "saved locally but not yet uploaded"
            st.session_state["_dup_pending"] = {
                "source": source, "tier": tier, "batch": batch,
                "provenance_url": provenance_url, "effective_max": effective_max,
                "llm": llm, "run_enrich": run_enrich,
                "ids": ids, "status": status,
            }
        else:
            _workbench_run_pipeline(config, source, tier, batch, provenance_url,
                                    effective_max, llm, run_enrich)

    # Duplicate gate — shown when a previous run_all found an existing source
    if "_dup_pending" in st.session_state:
        dup = st.session_state["_dup_pending"]
        ids, status = dup["ids"], dup["status"]
        st.warning(
            f"**Duplicate detected.** This source was already ingested as **{ids}** ({status}). "
            f"To view it, go to **Document List** or run `python3 -m runner status {ids}`."
        )
        st.markdown("Do you want to ingest it again as a separate document?")
        dc1, dc2 = st.columns([1, 3])
        with dc1:
            if st.button("Yes, ingest as new copy", type="primary"):
                params = st.session_state.pop("_dup_pending")
                _workbench_run_pipeline(
                    config, params["source"], params["tier"], params["batch"],
                    params["provenance_url"], params["effective_max"],
                    params["llm"], params["run_enrich"],
                )
                st.rerun()
        with dc2:
            if st.button("Cancel — keep existing"):
                st.session_state.pop("_dup_pending", None)
                st.rerun()

    intake_result = st.session_state.ingest.get("intake")
    if intake_result:
        st.subheader("Intake")
        intake_dict = _intake_to_dict(intake_result)
        st.json(intake_dict)
        # Show local HTML path when Wayback fails
        if intake_result.wayback_status in ("failed", "unavailable"):
            html_path = intake_result.local_dir / "source.html" if intake_result.local_dir else None
            if html_path and html_path.exists():
                st.info(
                    f"Wayback Machine {intake_result.wayback_status}. "
                    f"Source HTML saved locally at: `{html_path}`"
                )
            else:
                st.warning(f"Wayback Machine {intake_result.wayback_status}: {intake_result.wayback_error}")
        if not run_all:
            if st.button("2. Extract Text"):
                effective_max = _effective_max_chars(max_chars, llm, config)
                _workbench_preprocess(config, effective_max)
        if intake_result.source_type in {"video", "audio"} and not st.session_state.ingest.get("preprocess"):
            _render_pre_analysis_transcript_upload(config)

    preprocess_result = st.session_state.ingest.get("preprocess")
    if preprocess_result:
        _render_preprocess_review(preprocess_result)
        if not run_all and not st.session_state.ingest.get("analysis"):
            if st.button("3. Analyze Document"):
                _workbench_analyze(config, llm)

    analysis = st.session_state.ingest.get("analysis")
    if analysis:
        _render_analysis_editor(config, llm)

    with st.expander("What happens to the lexicon and registry during this run?"):
        st.markdown(
            """
- **Before analysis:** the runner fetches current draft + validated lexicon terms from Sanity and injects them into the prompt so the model does not re-propose known terms.
- **During analysis:** candidate terms and suggested actors are written into the document JSON for review.
- **During enrichment:** the runner fetches the current lexicon and entity registry again, scans the document for local tag-registry matches, then proposes additions, variants, evidence, entities, linked documents, practices, and statistical claims.
- **After enrichment:** proposals are saved to local `enrichment.json`. They are non-blocking queue work; process them when ready so later analysis gets better context.
"""
        )


def _render_tier_help() -> None:
    with st.expander("What is Tier?"):
        st.markdown(
            """
**Tier is the trust and publication rigor level.**

- **Tier 1 — Exploratory:** early pattern discovery, social posts, quick finds, internal exploration.
- **Tier 2 — Reviewed:** standard research material, organization pages, reports, testimony, network building.
- **Tier 3 — Published:** court judgments, legislation, landmark documents, public archive candidates. Requires strongest validation before publication.

Use **auto** when unsure. For a Christian Concern article or organization page, Tier 1 or 2 is normal; use Tier 2 when it is likely to matter for research writing or network evidence.
"""
        )


def _workbench_resume(config, doc_id: str, stage: str) -> None:
    """Load an existing doc's saved state into the workbench session."""
    from runner.pipeline.upload import _load_preprocess
    from runner.models.document import AnalysisResult

    doc_dir = config.corpus_dir / doc_id
    intake_path     = doc_dir / "intake.json"
    preprocess_path = doc_dir / "preprocess.json"
    extracted_path  = doc_dir / "extracted.txt"
    analysis_path   = doc_dir / "analysis.json"

    if not doc_dir.exists():
        st.error(f"No local folder found for `{doc_id}`.")
        return
    if not extracted_path.exists():
        st.error(f"`extracted.txt` not found for `{doc_id}` — extraction step missing.")
        return

    # Load intake record
    intake_result = None
    if intake_path.exists():
        try:
            from runner.models.document import IntakeResult
            intake_result = IntakeResult(**json.loads(intake_path.read_text()))
        except Exception as exc:
            st.warning(f"Could not load intake.json: {exc}")

    # Load preprocess record
    preprocess_result = None
    if preprocess_path.exists():
        try:
            preprocess_result = _load_preprocess(preprocess_path)
            if preprocess_result and intake_result:
                preprocess_result.intake_declared_type = getattr(intake_result, "declared_type", None) or None
                preprocess_result.intake_batch_id = getattr(intake_result, "batch_id", None) or None
                preprocess_result.intake_source_url = getattr(intake_result, "source_url", None) or None
        except Exception as exc:
            st.warning(f"Could not load preprocess.json: {exc}")

    # Load analysis if already done and stage needs it.
    analysis_result = None
    analysis_json = ""
    analysis_valid = False
    if (stage.startswith("Upload") or stage.startswith("Enrich")) and analysis_path.exists():
        try:
            raw = analysis_path.read_text()
            analysis_result = AnalysisResult.model_validate_json(raw)
            analysis_json = raw
            analysis_valid = True
        except Exception as exc:
            st.warning(f"Could not load analysis.json: {exc}")

    st.session_state.ingest.update({
        "source":         getattr(intake_result, "source", "") if intake_result else "",
        "intake":         intake_result,
        "preprocess":     preprocess_result,
        "analysis":       analysis_result,
        "analysis_json":  analysis_json,
        "analysis_valid": analysis_valid,
        "analysis_audit": None,
        "uploaded":       False,
    })
    loaded = []
    if intake_result:    loaded.append("intake")
    if preprocess_result: loaded.append("extraction")
    if analysis_result:  loaded.append("analysis")
    st.success(f"Loaded `{doc_id}` — {', '.join(loaded)} ready. Scroll down to continue.")
    if stage.startswith("Enrich") and analysis_valid:
        st.info("Ready for enrichment. Scroll to the JSON review buttons and click **Run Enrichment**.")

    # U6: surface any previously saved triage result for this doc
    try:
        from runner.pipeline.triage import load_triage_result
        _saved_triage = load_triage_result(doc_id, config)
        if _saved_triage:
            st.info(
                f"**Previous triage result:** recommended `{_saved_triage.recommended_llm}` "
                f"· type hint: {_saved_triage.doc_type_hint} · complexity: {_saved_triage.complexity}"
                + (f" · reason: {_saved_triage.routing_reason}" if _saved_triage.routing_reason else "")
            )
    except Exception:
        pass  # non-blocking


def _blank_ingest_state() -> dict:
    return {
        "source": "",
        "source_url": "",
        "llm": "litelm",
        "batch": "",
        "run_enrich": True,
        "allow_whisper": False,
        "enrich_model": "",
        "intake": None,
        "preprocess": None,
        "embedding": None,
        "analysis": None,
        "analysis_json": "",
        "analysis_valid": False,
        "analysis_audit": None,
        "enrichment": None,
        "uploaded": False,
    }


def _init_ingest_state() -> None:
    if "ingest" not in st.session_state:
        st.session_state.ingest = _blank_ingest_state()


def _render_stage_progress() -> None:
    state = st.session_state.ingest
    cols = st.columns(5)
    steps = [
        ("Intake", state.get("intake") is not None),
        ("Extract", state.get("preprocess") is not None),
        ("Analyze", state.get("analysis") is not None),
        ("Validate JSON", state.get("analysis_valid")),
        ("Upload", state.get("uploaded")),
    ]
    for col, (label, done) in zip(cols, steps):
        col.metric(label, "done" if done else "pending")


def _workbench_run_pipeline(config, source, tier, batch, provenance_url,
                            effective_max, llm, run_enrich) -> None:
    """Run the full auto-pipeline after duplicate gate has been cleared."""
    _workbench_intake(config, source, tier, batch, provenance_url)
    config.media_allow_whisper = st.session_state.ingest.get("allow_whisper", False)
    if st.session_state.ingest.get("intake"):
        _workbench_preprocess(config, effective_max)
    if st.session_state.ingest.get("preprocess"):
        _workbench_analyze(config, llm)
    if run_enrich and st.session_state.ingest.get("analysis_valid"):
        _workbench_enrich(config, llm)


def _workbench_intake(config, source: str, tier: str, batch: str, source_url: str = "") -> None:
    from runner.pipeline import intake

    with st.spinner("Creating intake record..."):
        try:
            tier_value = None if tier == "auto" else int(tier)
            result = intake.run(
                source.strip(),
                tier=tier_value,
                batch=batch.strip() or None,
                config=config,
                source_url=source_url.strip(),
            )
        except Exception as exc:
            st.error(f"Intake failed: {exc}")
            return
    st.session_state.ingest.update({
        "intake": result,
        "preprocess": None,
        "embedding": None,
        "analysis": None,
        "analysis_json": "",
        "analysis_valid": False,
        "analysis_audit": None,
        "enrichment": None,
        "uploaded": False,
    })
    # U6: flush any triage result that was run before intake assigned a doc_id
    _pending_triage = st.session_state.pop("_pending_triage_result", None)
    if _pending_triage is not None:
        try:
            from runner.pipeline import triage as _triage_mod
            _triage_mod.save_triage_result(result.doc_id, _pending_triage, config)
        except Exception:
            pass  # non-blocking — triage persistence should never break intake
    st.success(f"Created doc_id {result.doc_id}")


def _effective_max_chars(max_chars: int, llm: str, config) -> int | None:
    if max_chars == 0:
        return 0
    if max_chars:
        return max_chars
    if llm in ("local", "local-heavy", "local-reasoning", "prefer-local", "litelm", "litelm-heavy", "litelm-reasoning"):
        return config.truncation_limit_local
    return config.truncation_limit


_TRANSCRIPT_TYPE_REFERENCE = """\
**Transcript types and quality hierarchy (highest → lowest)**

| Type | Source | When to use |
|---|---|---|
| **Manual platform captions** | Uploader-provided SRT on YouTube/Vimeo | Best — exact wording, timestamps; use as-is |
| **Researcher SRT / UiO Autotekst** | Researcher transcribes or uses UiO Autotekst service | Preferred when platform captions are absent or auto-only |
| **Auto-captions** | Platform ASR (YouTube auto, Whisper-based) | Acceptable; check proper nouns and SOGICE terminology |
| **Whisper (local fallback)** | faster-whisper running locally | Last resort — enable deliberately; always review output |

After replacing a transcript, rerun any research annotations that reference the primary text. \
Annotations contain direct quotes; they may be misaligned if the source text changes.
"""


def _render_pre_analysis_transcript_upload(config) -> None:
    intake_result = st.session_state.ingest.get("intake")
    if not intake_result or not intake_result.local_dir:
        return

    with st.expander("Transcript checkpoint: upload SRT/VTT before analysis", expanded=True):
        st.info(
            "Platform captions were unavailable or not extracted. "
            "A researcher-provided SRT/VTT is preferred over Whisper — upload one here and it will "
            "become the primary text for analysis. You can also skip this and enable Whisper fallback above."
        )
        with st.expander("About transcript types", expanded=False):
            st.markdown(_TRANSCRIPT_TYPE_REFERENCE)

        uploaded = st.file_uploader(
            "Upload SRT or VTT",
            type=["srt", "vtt"],
            key=f"pre_analysis_srt_{intake_result.doc_id}",
        )
        language = st.text_input(
            "Transcript language code",
            value="",
            placeholder="en",
            key=f"pre_analysis_srt_lang_{intake_result.doc_id}",
            help="ISO-style language code, e.g. en, pt, no, nb, de.",
        )
        if st.button("Use uploaded transcript for analysis", disabled=uploaded is None, key=f"use_pre_analysis_srt_{intake_result.doc_id}"):
            if language.strip() and not _valid_language_code(language.strip()):
                st.error("Language must be an ISO-style code such as `en`, `pt`, `no`, `nb`, `de`, or `pt-BR`.")
                return
            try:
                from datetime import datetime, timezone
                from runner.models.document import PreprocessResult
                from runner.pipeline.media_review import attach_srt_to_document

                upload_dir = Path(intake_result.local_dir) / "researcher_transcripts"
                upload_dir.mkdir(parents=True, exist_ok=True)
                safe_name = re.sub(r"[^A-Za-z0-9_.-]+", "_", uploaded.name).strip("_") or "uploaded.srt"
                transcript_path = upload_dir / safe_name
                transcript_path.write_bytes(uploaded.getvalue())
                attach_result = attach_srt_to_document(
                    doc_id=intake_result.doc_id,
                    srt_path=transcript_path,
                    config=config,
                    language=language.strip(),
                    make_primary=True,
                )
                doc_dir = Path(intake_result.local_dir)

                # Write an immediate provenance record so the audit trail survives
                # even if session state is cleared before analysis runs.
                provenance = {
                    "tool_used": "researcher_srt",
                    "attachedAt": datetime.now(timezone.utc).isoformat(),
                    "label": attach_result.get("label", safe_name),
                    "sourcePath": str(transcript_path),
                    "language": language.strip(),
                    "chunkCount": attach_result.get("chunkCount", 0),
                    "_manual_overrides": {"transcript": "researcher_provided_pre_analysis"},
                }
                (doc_dir / "researcher_transcript_provenance.json").write_text(
                    json.dumps(provenance, indent=2), encoding="utf-8"
                )

                chunks = _read_json_file(doc_dir / "transcript_chunks.json", [])
                versions = _read_json_file(doc_dir / "transcript_versions.json", [])
                media = _read_json_file(doc_dir / "media_metadata.json", {})
                text = (doc_dir / "extracted.txt").read_text(encoding="utf-8")
                result = PreprocessResult(
                    doc_id=intake_result.doc_id,
                    tool_used="researcher_srt",
                    quality="high",
                    text=text,
                    char_count=len(text),
                    language_detected=language.strip() or None,
                    media_metadata=media,
                    transcript_chunks=chunks if isinstance(chunks, list) else [],
                    transcript_versions=versions if isinstance(versions, list) else [],
                    transcript_comparison=_read_json_file(doc_dir / "transcript_comparison.json", {}),
                )
                st.session_state.ingest.update({
                    "preprocess": result,
                    "embedding": None,
                    "analysis": None,
                    "analysis_json": "",
                    "analysis_valid": False,
                    "analysis_audit": None,
                    "enrichment": None,
                    "uploaded": False,
                })
                st.success(
                    f"Uploaded transcript `{attach_result.get('label', safe_name)}` "
                    f"({attach_result.get('chunkCount', 0)} chunks) is now the primary text. "
                    "Continue to analysis. If you later add research annotations, rerun them after any transcript replacement."
                )
                st.rerun()
            except Exception as exc:
                st.error(f"Transcript upload failed: {exc}")


def _workbench_preprocess(config, max_chars: int | None) -> None:
    from runner.pipeline import preprocess

    with st.spinner("Extracting readable text..."):
        try:
            result = preprocess.run(st.session_state.ingest["intake"], config=config, max_chars=max_chars)
        except Exception as exc:
            st.error(f"Preprocessing failed: {exc}")
            return
    if result.source_html_sha256:
        st.session_state.ingest["intake"].source_html_sha256 = result.source_html_sha256
    # Populate intake context so the analysis prompt sees researcher-declared hints
    _intake = st.session_state.ingest.get("intake")
    if _intake:
        result.intake_declared_type = getattr(_intake, "declared_type", None) or None
        result.intake_batch_id = getattr(_intake, "batch_id", None) or None
        result.intake_source_url = getattr(_intake, "source_url", None) or None
    st.session_state.ingest.update({
        "preprocess": result,
        "embedding": None,
        "analysis": None,
        "analysis_json": "",
        "analysis_valid": False,
        "analysis_audit": None,
        "enrichment": None,
        "uploaded": False,
    })
    st.success(f"Extracted {result.char_count:,} chars with {result.tool_used}")


def _workbench_analyze(config, llm: str) -> None:
    from runner.pipeline import analyze, embed, ollama_memory
    from runner.pipeline.analyze import DualAnalysisResult

    preprocess_result = st.session_state.ingest["preprocess"]
    embedding_vector: list = []
    comparison_result = None
    analysis_audit: dict = {}

    # ── Step 1: LLM Analysis ────────────────────────────────────────────────
    st.markdown("**Step 1 of 2 — LLM Analysis**")
    with st.spinner(f"Sending document to `{llm}` for classification…"):
        try:
            result = analyze.run(
                preprocess_result,
                llm=llm,
                config=config,
                _audit=analysis_audit,
            )
        except Exception as exc:
            err_msg = str(exc)
            st.error(f"Analysis failed: {err_msg}")
            with st.expander("Copy error details"):
                st.code(err_msg)
            return

    # Unwrap DualAnalysisResult (--llm both)
    if isinstance(result, DualAnalysisResult):
        comparison_result = result.comparison
        result = result.primary

    # Show the raw result immediately so the researcher can read it NOW
    with st.expander("Classification result (expand to review before embedding)", expanded=True):
        st.json(result.model_dump())

    if llm.startswith("litelm"):
        try:
            if ollama_memory.unload_litelm_analysis(config, llm):
                st.info("Analysis model unloaded from Mac Studio RAM.")
            else:
                st.warning(
                    "Could not unload analysis model — set LITELM_OLLAMA_BASE_URL "
                    "and backing model names to avoid RAM overlap."
                )
        except Exception as unload_exc:
            st.warning(f"Could not unload analysis model: {unload_exc}")

    # ── Step 2: Embedding ────────────────────────────────────────────────────
    st.markdown("**Step 2 of 2 — Embedding**")
    with st.spinner("Generating embedding vector…"):
        try:
            if llm.startswith("litelm"):
                embedding_vector = embed.run_litelm(preprocess_result.text, config=config)
            else:
                embedding_vector = embed.run(preprocess_result.text, config=config)
        except Exception as exc:
            st.warning(
                f"Embedding failed: {exc}\n\n"
                "You can still save and review the classification above. "
                "The Supabase row will be empty until you re-embed."
            )

    if llm.startswith("litelm") and embedding_vector:
        try:
            if ollama_memory.unload_litelm_embedding(config):
                st.info("Embedding model unloaded from Mac Studio RAM.")
        except Exception as unload_exc:
            st.warning(f"Could not unload embedding model: {unload_exc}")

    if embedding_vector:
        st.success(f"Embedding: {len(embedding_vector)}d vector generated.")

    # ── Save to session state ────────────────────────────────────────────────
    st.session_state.ingest.update({
        "embedding": embedding_vector,
        "analysis": result,
        "analysis_json": result.model_dump_json(indent=2),
        "analysis_valid": True,
        "analysis_audit": analysis_audit,
        "enrichment": None,
        "uploaded": False,
    })

    if comparison_result is not None:
        _show_diff(result, comparison_result)
        st.info(
            "**--llm both:** Claude result (above) is primary. "
            "Local model comparison shown. Edit or accept in the JSON editor below."
        )

    st.success("Analysis complete. Review and edit the JSON before saving or uploading.")


def _workbench_enrich(config, llm: str) -> None:
    from runner.pipeline import enrich
    from runner.models.document import AnalysisResult

    try:
        final = AnalysisResult.model_validate(
            json.loads(st.session_state.ingest["analysis_json"])
        )
        enrich_llm = "litelm" if llm.startswith("litelm") else llm
        _enrich_audit: dict = {}
        with st.spinner("Running enrichment..."):
            result = enrich.run(
                st.session_state.ingest["intake"].doc_id,
                st.session_state.ingest["preprocess"],
                final,
                config=config,
                llm=enrich_llm,
                model=st.session_state.ingest.get("enrich_model") or None,
                _audit=_enrich_audit,
            )
        enrich.save(st.session_state.ingest["intake"].doc_id, result, config, _audit=_enrich_audit)
        st.session_state.ingest["enrichment"] = result
        st.session_state.pop("lexicon_terms", None)
        st.session_state.pop("entity_registry", None)
        st.success("Enrichment saved.")
    except Exception as exc:
        err_msg = str(exc)
        st.error(f"Enrichment failed: {err_msg}")
        with st.expander("Copy error details"):
            st.code(err_msg)


def _render_preprocess_review(result) -> None:
    st.subheader("Extracted Text Review")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Tool", result.tool_used)
    c2.metric("Quality", result.quality)
    c3.metric("Chars", f"{result.char_count:,}")
    c4.metric("Truncated", "yes" if result.truncated else "no")
    if result.tool_used == "whisper":
        st.warning(
            "**Whisper fallback transcript.** Review for accuracy before analysis — Whisper can mis-transcribe "
            "proper nouns, SOGICE-specific terminology, and non-English content. "
            "If you have a researcher-provided SRT/VTT or can produce one with UiO Autotekst, "
            "attach it in Media Review → Transcripts and rerun any research annotations that reference the primary text."
        )
    elif result.tool_used in {"yt-dlp", "researcher_srt"}:
        source_label = "platform captions" if result.tool_used == "yt-dlp" else "researcher-provided SRT"
        st.success(
            f"Transcript is timestamped ({source_label}) and suitable for transcript-based analysis. "
            "If you later replace the primary transcript, rerun any research annotations that reference it."
        )

    meta = {
        "title": result.title,
        "author": result.author,
        "date_published": result.date_published,
        "site": result.sitename,
        "domain": result.hostname,
        "language": result.language_detected,
        "source_html_path": result.source_html_path,
        "source_html_sha256": result.source_html_sha256,
    }
    st.json({k: v for k, v in meta.items() if v})
    st.text_area("Extracted text", result.text, height=300)

    if result.page_intel:
        with st.expander("Page intelligence"):
            st.json(result.page_intel.__dict__)


def _render_analysis_editor(config, llm: str) -> None:
    from runner.models.document import AnalysisResult
    from runner.pipeline import upload

    st.subheader("Analysis JSON")
    analysis_text = st.text_area(
        "Edit classification JSON",
        value=st.session_state.ingest["analysis_json"],
        height=520,
        key="analysis_json_editor",
    )
    st.session_state.ingest["analysis_json"] = analysis_text

    # Copy-friendly read-only code block for pasting into Claude
    with st.expander("Copy JSON (read-only, click to expand)", expanded=False):
        st.code(analysis_text, language="json")

    _render_archival_issue_panel(analysis_text)
    _render_second_opinion_gate(config, analysis_text)

    # U4: diff preview — compare current saved file vs. editor content
    _intake = st.session_state.ingest.get("intake")
    if _intake:
        _saved_analysis_path = (
            config.corpus_dir / _intake.doc_id / "analysis.json"
            if config else None
        )
        if _saved_analysis_path and _saved_analysis_path.exists():
            try:
                _current_text = _saved_analysis_path.read_text(encoding="utf-8")
                _old_lines = _current_text.splitlines()
                _new_lines = analysis_text.splitlines()
                _diff_lines = list(difflib.unified_diff(
                    _old_lines,
                    _new_lines,
                    fromfile="current",
                    tofile="after save",
                    lineterm="",
                ))
                if _diff_lines:
                    with st.expander("Preview changes"):
                        st.code("\n".join(_diff_lines), language="diff")
            except Exception:
                pass

    c1, c2, c3, c4 = st.columns(4)
    testimony_review_pending = _testimony_requires_review(
        st.session_state.ingest["intake"].doc_id,
        st.session_state.ingest.get("analysis"),
        config,
    )
    testimony_blocked = _testimony_archive_upload_blocked(
        st.session_state.ingest["intake"].doc_id,
        st.session_state.ingest.get("analysis"),
        config,
    )
    testimony_disagreement = _testimony_consent_disagreement(
        st.session_state.ingest["intake"].doc_id,
        st.session_state.ingest.get("analysis"),
        config,
    )
    if testimony_disagreement:
        st.warning(
            "`intake.json` and `testimony_review.json` record different testimony consent states. "
            "The safer state is being enforced; reconcile the records in Testimony Review."
        )
    if testimony_blocked:
        st.error(
            "Remote archive upload is blocked because testimony consent is refused or withdrawn. "
            "Review suppression/redaction requirements before any later remote action."
        )
    elif testimony_review_pending:
        _analysis_obj = st.session_state.ingest.get("analysis")
        _doc_type = getattr(_analysis_obj, "type", "") or ""
        _type_note = (
            f" Document type is **{_doc_type}** — consent gate applies to Testimony and Survivor-Network-Material regardless of testimony_flag."
            if _doc_type in upload._CONSENT_GATED_TYPES
            else ""
        )
        st.info(
            "Archive upload is allowed as an **unverified Sanity record**, while testimony review remains pending."
            + _type_note
            + " Public display, excerpts, verification, and publication remain blocked until Testimony Review is completed."
        )
    with c1:
        if st.button("Validate JSON"):
            try:
                parsed = AnalysisResult.model_validate(json.loads(analysis_text))
                st.session_state.ingest["analysis"] = parsed
                st.session_state.ingest["analysis_json"] = parsed.model_dump_json(indent=2)
                st.session_state.ingest["analysis_valid"] = True
                st.success("JSON is valid.")
            except Exception as exc:
                st.session_state.ingest["analysis_valid"] = False
                err_msg = str(exc)
                st.error(f"Invalid analysis JSON: {err_msg}")
                with st.expander("Copy error details"):
                    st.code(err_msg)
    with c2:
        if st.button("Save Locally", disabled=not st.session_state.ingest.get("analysis_valid")):
            try:
                final = AnalysisResult.model_validate(json.loads(st.session_state.ingest["analysis_json"]))
                saved = upload.save_locally(
                    st.session_state.ingest["intake"],
                    st.session_state.ingest["preprocess"],
                    st.session_state.ingest["embedding"] or [],
                    final,
                    config=config,
                    llm_used=llm,
                    _audit=st.session_state.ingest.get("analysis_audit"),
                )
                st.success(f"Saved locally: {saved}")
                if (saved / "media_metadata.json").exists():
                    if st.button("Open in Media Review", key="open_media_review_saved"):
                        st.session_state["mr_doc_id"] = saved.name
                        st.session_state["_nav_to"] = "Media Review"
                        st.rerun()
            except Exception as exc:
                err_msg = str(exc)
                st.error(f"Save failed: {err_msg}")
                with st.expander("Copy error details"):
                    st.code(err_msg)
    with c3:
        upload_label = (
            "Upload privately to Sanity (unverified)"
            if testimony_review_pending and not testimony_blocked
            else "Upload"
        )
        if st.button(upload_label, disabled=(not st.session_state.ingest.get("analysis_valid") or testimony_blocked)):
            try:
                final = AnalysisResult.model_validate(json.loads(st.session_state.ingest["analysis_json"]))
                upload.run(
                    st.session_state.ingest["intake"],
                    st.session_state.ingest["preprocess"],
                    st.session_state.ingest["embedding"] or [],
                    final,
                    config=config,
                    llm_used=llm,
                    _audit=st.session_state.ingest.get("analysis_audit"),
                )
                st.session_state.ingest["uploaded"] = True
                if st.session_state.ingest.get("embedding"):
                    st.success("Uploaded to Sanity and Supabase.")
                else:
                    st.warning("Uploaded to Sanity. No embedding vector was available, so Supabase was skipped.")
                doc_id = st.session_state.ingest["intake"].doc_id
                if (config.corpus_dir / doc_id / "media_metadata.json").exists():
                    if st.button("Open in Media Review", key="open_media_review_uploaded"):
                        st.session_state["mr_doc_id"] = doc_id
                        st.session_state["_nav_to"] = "Media Review"
                        st.rerun()
            except Exception as exc:
                err_msg = str(exc)
                st.error(f"Upload failed: {err_msg}")
                with st.expander("Copy error details"):
                    st.code(err_msg)
    with c4:
        if st.button("Run Enrichment", disabled=not st.session_state.ingest.get("analysis_valid")):
            _workbench_enrich(config, llm)

    analysis = st.session_state.ingest.get("analysis")
    if analysis:
        _render_analysis_summary(analysis)
    enrichment_result = st.session_state.ingest.get("enrichment")
    if enrichment_result:
        _render_enrichment_result(enrichment_result)


def _render_archival_issue_panel(analysis_text: str) -> None:
    """Show researcher-fillable archival gaps before local save/upload."""
    try:
        analysis_data = json.loads(analysis_text) if analysis_text.strip() else {}
    except Exception:
        st.warning("Archival checks will appear after the JSON is parseable.")
        return
    if not isinstance(analysis_data, dict):
        return

    _harm_list = analysis_data.get("harm") or []
    if _has_high_harm(_harm_list):
        _high_harm_labels = sorted(_HIGH_HARM_INDICATORS.intersection(_harm_list))
        st.warning(
            f"**High-harm content:** {', '.join(_high_harm_labels)}. "
            "Handle with care — follow your safeguarding protocol before uploading."
        )

    preprocess = st.session_state.ingest.get("preprocess")
    intake = st.session_state.ingest.get("intake")
    preprocess_meta = {}
    if preprocess:
        page_intel = getattr(preprocess, "page_intel", None)
        preprocess_meta = {
            "title": getattr(preprocess, "title", ""),
            "date_published": getattr(preprocess, "date_published", ""),
            "sitename": getattr(preprocess, "sitename", ""),
            "hostname": getattr(preprocess, "hostname", ""),
            "page_intel": page_intel.__dict__ if page_intel else {},
        }
    intake_meta = {
        "source": getattr(intake, "source", ""),
        "source_url": getattr(intake, "source_url", ""),
        "source_type": getattr(intake, "source_type", ""),
    } if intake else {}

    from runner.pipeline.metadata_quality import archival_issues, publication_metadata

    pub = publication_metadata(preprocess_meta)
    issues = archival_issues(analysis_data, preprocess_meta, intake_meta)
    with st.expander("Archival completeness checks", expanded=bool(issues)):
        found = [
            f"published {pub['date_published']}" if pub.get("date_published") else "",
            f"publisher {pub['publisher']}" if pub.get("publisher") else "",
            f"host {pub['hostname']}" if pub.get("hostname") else "",
        ]
        found = [item for item in found if item]
        if found:
            st.caption("Source metadata found: " + " · ".join(found))
        if not issues:
            st.success("No fundamental archival gaps detected.")
            return
        st.warning("Review these before upload if you can resolve them.")
        st.dataframe(issues, width="stretch", hide_index=True)
        _render_manual_archival_fixes(analysis_data, preprocess_meta)


def _render_manual_archival_fixes(analysis_data: dict, preprocess_meta: dict) -> None:
    preprocess = st.session_state.ingest.get("preprocess")
    intake = st.session_state.ingest.get("intake")
    doc_id = getattr(intake, "doc_id", "") if intake else ""
    current_date = preprocess_meta.get("date_published", "")
    current_title = preprocess_meta.get("title", "")
    current_publisher = preprocess_meta.get("sitename", "")
    doc_date = analysis_data.get("document_date") or {}

    with st.form("manual_archival_fixes"):
        st.markdown("**Fill missing archival fields**")
        title = st.text_input("Source title", value=current_title)
        date_published = st.text_input(
            "Website/source publication date",
            value=current_date,
            placeholder="YYYY-MM-DD or full ISO date",
        )
        publisher = st.text_input("Publisher / site name", value=current_publisher)
        country = st.text_input(
            "Country / jurisdiction",
            value=", ".join(analysis_data.get("country") or []),
            placeholder="Canada, United States, United Kingdom...",
        )
        c1, c2, c3 = st.columns(3)
        year = c1.number_input("Document year", min_value=0, max_value=2100, value=int(doc_date.get("year") or 0))
        month = c2.number_input("Month", min_value=0, max_value=12, value=int(doc_date.get("month") or 0))
        day = c3.number_input("Day", min_value=0, max_value=31, value=int(doc_date.get("day") or 0))
        apply = st.form_submit_button("Apply fixes to local review state")

    if not apply:
        return

    if preprocess:
        preprocess.title = title.strip()
        preprocess.date_published = date_published.strip()
        preprocess.sitename = publisher.strip()
        if doc_id:
            try:
                from runner.pipeline.preprocess import _preprocess_metadata

                doc_dir = Path(getattr(intake, "local_dir", "") or "") if intake else Path()
                if not doc_dir or str(doc_dir) == ".":
                    config = _load_config_safe()
                    doc_dir = config.corpus_dir / doc_id if config else Path()
                if doc_dir:
                    (doc_dir / "preprocess.json").write_text(
                        json.dumps(_preprocess_metadata(preprocess), indent=2),
                        encoding="utf-8",
                    )
            except Exception as exc:
                st.warning(f"Could not write preprocess.json yet: {exc}")

    analysis_data["country"] = [item.strip() for item in country.split(",") if item.strip()]
    analysis_data["document_date"] = {
        "year": int(year),
        "month": int(month),
        "day": int(day),
        "confidence": "exact" if year and month and day else "approximate" if year else "unknown",
    }
    st.session_state.ingest["analysis_json"] = json.dumps(analysis_data, indent=2)
    try:
        from runner.models.document import AnalysisResult

        parsed = AnalysisResult.model_validate(analysis_data)
        st.session_state.ingest["analysis"] = parsed
        st.session_state.ingest["analysis_valid"] = True
    except Exception:
        st.session_state.ingest["analysis_valid"] = False
    st.success("Applied. The JSON review state and source metadata have been updated; click Save Locally or Upload when ready.")


def _render_analysis_summary(analysis) -> None:
    st.subheader("Readable Review")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Type", analysis.type)
    c2.metric("Format", analysis.format)
    c3.metric("Scope", analysis.scope)
    c4.metric("Confidence", f"{analysis.confidence.overall_score:.2f} ({analysis.confidence.status})")

    # Second row: intensity / framing / register / compound type
    r2c1, r2c2, r2c3, r2c4 = st.columns(4)
    r2c1.metric("Rhetorical Intensity", getattr(analysis, "rhetorical_intensity", None) or "—")
    r2c2.metric("Framing Balance", getattr(analysis, "framing_balance", None) or "—")
    r2c3.metric("Narrative Register", getattr(analysis, "narrative_register", "—"))
    _pt = getattr(analysis, "primary_type", None)
    _st = getattr(analysis, "secondary_type", None)
    compound = f"{_pt} + {_st}" if _pt and _st else (_pt or "—")
    r2c4.metric("Compound Type", compound)

    st.write(analysis.summary)

    _ls = getattr(analysis, "legal_status", None)
    if _ls and getattr(_ls, "jurisdiction", None):
        st.caption(
            f"⚖️ Legal status: **{_ls.status}** in **{_ls.jurisdiction}**"
            + (f" ({_ls.instrument})" if _ls.instrument else "")
        )

    if getattr(analysis, "normalisation_warnings", None):
        with st.expander("Model output corrections", expanded=True):
            st.warning(
                "The validator corrected these model-output quirks before saving. Review them if the classification looks surprising."
            )
            for warning in analysis.normalisation_warnings:
                st.write(f"- {warning}")
    if analysis.tactic:
        st.write("**Tactics:**", ", ".join(analysis.tactic))
    if analysis.term:
        st.write("**Existing terms used promotionally:**", ", ".join(analysis.term))
    _tuc = getattr(analysis, "term_use_context", None)
    if _tuc:
        st.write("**Terms used non-promotionally (definitional/critical/reported):**")
        st.dataframe([t.model_dump() for t in _tuc], width="stretch")
    if analysis.candidate_terms:
        st.write("**Candidate terms:**")
        st.dataframe([t.model_dump() for t in analysis.candidate_terms], width="stretch")
    if analysis.suggested_actors:
        st.write("**Suggested actors:**")
        st.dataframe([a.model_dump() for a in analysis.suggested_actors], width="stretch")

    _render_second_run_gate(analysis)


def _render_second_run_gate(analysis) -> None:
    """Show a human-gated second-opinion panel when the analysis warrants review.

    A second run is never triggered automatically. The researcher must read the
    explanation and click Approve before any additional model call is made.
    Steps are shown so the reviewer understands what will happen and can intervene.
    """
    score = analysis.confidence.overall_score
    needs_review = getattr(analysis, "needs_review", False)
    low_conf_reasons = getattr(analysis.field_confidence, "low_confidence_reasons", [])

    should_offer = needs_review or score < 0.75

    if not should_offer:
        return

    reasons: list[str] = []
    if score < 0.75:
        reasons.append(f"Overall confidence is **{score:.2f}** (threshold: 0.75). The model was uncertain about one or more primary fields.")
    if needs_review:
        reasons.append("The model flagged this document for human review (`needsReview: true`).")
    for r in (low_conf_reasons or []):
        field = getattr(r, "field", r.get("field", "")) if not hasattr(r, "items") else r.get("field", "")
        issue = getattr(r, "issue", r.get("issue", "")) if not hasattr(r, "items") else r.get("issue", "")
        sev = getattr(r, "severity", r.get("severity", "")) if not hasattr(r, "items") else r.get("severity", "")
        if field and issue:
            reasons.append(f"`{field}` ({sev}): {issue}")

    with st.expander("⚠️ Second opinion available — read before approving", expanded=True):
        st.warning("A second model run is recommended based on the analysis below. **This will not run automatically.** Read the reasons, then approve if you want to proceed.")

        st.markdown("**Why a second opinion is suggested:**")
        for r in reasons:
            st.markdown(f"- {r}")

        st.markdown("**What a second run does (steps):**")
        st.markdown(
            "1. Sends the same extracted text to `review-qwen` (second-opinion model via LiteLLM)\n"
            "2. Runs the same ingestion-v3.3 prompt — no changes to the classification task\n"
            "3. Shows a side-by-side diff of this result vs. the second opinion\n"
            "4. You choose which version to keep — neither is applied automatically\n"
            "5. If you accept the second opinion, it replaces `analysis.json` locally only (Sanity is not updated until you click Upload)"
        )

        doc_id = st.session_state.get("ingest", {}).get("doc_id", "")
        if not doc_id:
            st.caption("Second-run button requires a doc_id in session state (run from Ingest Workbench).")
            return

        approved_key = f"second_run_approved_{doc_id}"
        if st.button("Approve second opinion run", key=f"approve_second_{doc_id}"):
            st.session_state[approved_key] = True

        if st.session_state.get(approved_key):
            st.info("Running second opinion with `review-qwen`… (this may take 30–90 seconds)")
            import subprocess, sys
            proc = subprocess.run(
                [sys.executable, "-m", "runner", "reanalyze", doc_id, "--llm", "litelm-reasoning"],
                capture_output=True,
                text=True,
            )
            st.session_state.pop(approved_key, None)
            if proc.returncode == 0:
                st.success("Second opinion complete. Reload the Ingest Workbench to see the diff.")
            else:
                st.error(f"Second opinion run failed:\n{proc.stderr[-800:]}")


def _render_enrichment_result(result) -> None:
    st.subheader("Enrichment")
    st.caption(
        "These are review proposals saved locally. They become live Sanity registry/document changes only after an approval workflow writes them."
    )
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Lexicon proposals", len(result.lexicon_proposals))
    c2.metric("Entity proposals", len(result.entity_proposals))
    c3.metric("Tactic proposals", len(result.tactic_proposals))
    c4.metric("Practice descriptions", len(result.practice_descriptions))
    c5.metric("Claims", len(result.statistical_claims))
    if result.lexicon_proposals:
        st.write("**Lexicon proposals:**")
        st.dataframe([p.model_dump(by_alias=True) for p in result.lexicon_proposals], width="stretch")
    if result.entity_proposals:
        st.write("**Entity proposals:**")
        st.dataframe([p.model_dump() for p in result.entity_proposals], width="stretch")
    if result.tactic_proposals:
        st.write("**Tactic proposals:**")
        st.dataframe([p.model_dump() for p in result.tactic_proposals], width="stretch")
    if result.ingestion_queue:
        st.write("**Documents to ingest next:**")
        st.dataframe([p.model_dump() for p in result.ingestion_queue], width="stretch")
    if result.practice_descriptions:
        st.write("**Practice descriptions:**")
        st.dataframe([p.model_dump() for p in result.practice_descriptions], width="stretch")
    if result.statistical_claims:
        st.write("**Statistical claims:**")
        st.caption(
            "These are claims made by the source document. Presence does not verify accuracy. "
            "Each claim must be reviewed before use in research outputs."
        )
        st.dataframe([p.model_dump() for p in result.statistical_claims], width="stretch")


def _render_second_opinion_gate(config, analysis_text: str) -> None:
    from runner.models.document import AnalysisResult
    from runner.pipeline import second_opinion

    intake_result = st.session_state.ingest.get("intake")
    if not intake_result:
        return
    doc_id = intake_result.doc_id
    doc_dir = config.corpus_dir / doc_id
    try:
        current = AnalysisResult.model_validate(json.loads(analysis_text))
    except Exception:
        return

    comparisons = second_opinion.list_second_opinions(doc_id, config) if doc_dir.exists() else []
    should_offer = bool(current.needs_review or current.confidence.overall_score < 0.75)
    if not should_offer and not comparisons:
        return

    with st.expander("Second opinion review", expanded=should_offer):
        if should_offer:
            st.warning(
                "A second opinion is recommended because this analysis is low-confidence or marked for review. "
                "Running it saves an alternate analysis and comparison record; it does not change analysis.json."
            )
            reasons = []
            if current.confidence.overall_score < 0.75:
                reasons.append(f"Overall confidence is {current.confidence.overall_score:.2f}, below 0.75.")
            if current.needs_review:
                reasons.append("The analysis has `needs_review: true`.")
            for reason in current.field_confidence.low_confidence_reasons:
                reasons.append(f"{reason.field}: {reason.issue} ({reason.severity})")
            for reason in reasons:
                st.markdown(f"- {reason}")
            st.caption(
                "Workflow: run second model -> save `analysis_alt_*` -> save `analysis_comparison_*` -> "
                "choose keep original, adopt second opinion, or edit/adopt. Nothing is promoted automatically."
            )

            if not (doc_dir / "analysis.json").exists():
                st.info("Save locally first so the current analysis exists as `analysis.json` before comparison.")
            else:
                llm_choice = st.selectbox(
                    "Second-opinion model",
                    ["litelm-reasoning", "litelm-heavy", "litelm", "local-reasoning", "local-heavy", "local"],
                    key=f"second_opinion_llm_{doc_id}",
                )
                if st.button("Run second opinion", key=f"run_second_opinion_{doc_id}"):
                    try:
                        with st.spinner("Running second-opinion analysis..."):
                            payload = second_opinion.run_second_opinion(doc_id, config=config, llm=llm_choice)
                        st.success(f"Saved comparison: {payload['comparison_path'].name}")
                        st.rerun()
                    except Exception as exc:
                        st.error(str(exc))

        if comparisons:
            st.subheader("Second opinion comparisons")
            for comparison in comparisons:
                _render_second_opinion_comparison(config, doc_id, comparison)


def _render_second_opinion_comparison(config, doc_id: str, comparison: dict) -> None:
    from runner.models.document import AnalysisResult
    from runner.pipeline import second_opinion

    filename = comparison.get("filename") or comparison.get("comparison_file", "")
    outcome = comparison.get("outcome", "pending")
    fields = comparison.get("fields_that_differed") or []
    with st.expander(
        f"{filename} - {outcome} - {len(fields)} differing field(s)",
        expanded=outcome == "pending",
    ):
        st.caption(
            f"Original model: {comparison.get('original_model') or '-'} | "
            f"Second model: {comparison.get('second_opinion_model') or '-'}"
        )
        differences = comparison.get("differences") or []
        if differences:
            st.dataframe(
                [
                    {
                        "Field": row.get("field", ""),
                        "Original": _short_json_value(row.get("original")),
                        "Second opinion": _short_json_value(row.get("second_opinion")),
                        "Added": ", ".join(row.get("added", [])),
                        "Removed": ", ".join(row.get("removed", [])),
                    }
                    for row in differences
                ],
                hide_index=True,
                width="stretch",
            )
        else:
            st.success("No tracked fields differ.")

        if outcome != "pending":
            if comparison.get("researcher_note"):
                st.info(f"Decision note: {comparison['researcher_note']}")
            return

        note = st.text_area(
            "Decision note",
            key=f"second_note_{filename}",
            height=90,
            help="Researcher-authored reasoning. Do not paste sensitive raw testimony unless external writing-assistance use is permitted.",
        )
        d1, d2 = st.columns(2)
        with d1:
            if st.button("Keep original", key=f"keep_original_{filename}"):
                try:
                    second_opinion.decide_second_opinion(
                        doc_id, filename, "kept_original", config, researcher_note=note
                    )
                    st.success("Decision saved: kept original.")
                    st.rerun()
                except Exception as exc:
                    st.error(str(exc))
        with d2:
            # U4: two-step confirm before adopting (archives current analysis.json)
            _adopt_confirm_key = f"_confirm_adopt_{filename}"
            if not st.session_state.get(_adopt_confirm_key):
                if st.button("Adopt second opinion", key=f"adopt_alt_{filename}",
                             help="Archives the current analysis.json and promotes the alt. Requires confirmation."):
                    st.session_state[_adopt_confirm_key] = True
                    st.rerun()
            else:
                st.warning(
                    "⚠ This will **archive** `analysis.json` and promote the second-opinion result. "
                    "The archive copy is kept in the doc folder."
                )
                c1, c2 = st.columns(2)
                if c1.button("✓ Confirm adopt", key=f"adopt_alt_confirm_{filename}", type="primary"):
                    try:
                        second_opinion.decide_second_opinion(
                            doc_id, filename, "adopted_alt", config, researcher_note=note
                        )
                        _reload_workbench_analysis_from_disk(config, doc_id)
                        st.session_state.pop(_adopt_confirm_key, None)
                        st.success("Second opinion adopted; original was archived.")
                        st.rerun()
                    except Exception as exc:
                        st.session_state.pop(_adopt_confirm_key, None)
                        st.error(str(exc))
                if c2.button("✗ Cancel", key=f"adopt_alt_cancel_{filename}"):
                    st.session_state.pop(_adopt_confirm_key, None)
                    st.rerun()

        alt_path = config.corpus_dir / doc_id / str(comparison.get("alt_file", ""))
        if alt_path.exists():
            with st.expander("Edit second opinion before adopting"):
                edited = st.text_area(
                    "Edited analysis JSON",
                    value=alt_path.read_text(encoding="utf-8"),
                    height=360,
                    key=f"edited_second_opinion_{filename}",
                )
                # U4: two-step confirm for adopt-edited (also archives current analysis.json)
                _edit_confirm_key = f"_confirm_adopt_edited_{filename}"
                if not st.session_state.get(_edit_confirm_key):
                    if st.button("Validate and adopt edited version",
                                 key=f"adopt_edited_{filename}",
                                 help="Validates JSON, archives current analysis.json, promotes your edited version."):
                        try:
                            AnalysisResult.model_validate_json(edited)
                            st.session_state[_edit_confirm_key] = True
                            st.rerun()
                        except Exception as exc:
                            st.error(f"JSON validation failed: {exc}")
                else:
                    st.warning(
                        "⚠ This will **archive** `analysis.json` and promote your edited version."
                    )
                    ec1, ec2 = st.columns(2)
                    if ec1.button("✓ Confirm adopt edited", key=f"adopt_edited_confirm_{filename}", type="primary"):
                        try:
                            second_opinion.decide_second_opinion(
                                doc_id,
                                filename,
                                "edited",
                                config,
                                researcher_note=note,
                                edited_json=edited,
                            )
                            _reload_workbench_analysis_from_disk(config, doc_id)
                            st.session_state.pop(_edit_confirm_key, None)
                            st.success("Edited second opinion adopted; original was archived.")
                            st.rerun()
                        except Exception as exc:
                            st.session_state.pop(_edit_confirm_key, None)
                            st.error(str(exc))
                    if ec2.button("✗ Cancel", key=f"adopt_edited_cancel_{filename}"):
                        st.session_state.pop(_edit_confirm_key, None)
                        st.rerun()


def _reload_workbench_analysis_from_disk(config, doc_id: str) -> None:
    from runner.models.document import AnalysisResult

    path = config.corpus_dir / doc_id / "analysis.json"
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    parsed = AnalysisResult.model_validate_json(text)
    st.session_state.ingest["analysis"] = parsed
    st.session_state.ingest["analysis_json"] = parsed.model_dump_json(indent=2)
    st.session_state.ingest["analysis_valid"] = True
    st.session_state.ingest["uploaded"] = False


def _short_json_value(value, max_chars: int = 240) -> str:
    if isinstance(value, (dict, list)):
        text = json.dumps(value, ensure_ascii=False)
    else:
        text = "" if value is None else str(value)
    return _short_label(text, max_chars)


def _intake_to_dict(intake_result) -> dict:
    return {
        "doc_id": intake_result.doc_id,
        "source": intake_result.source,
        "source_type": intake_result.source_type,
        "tier": intake_result.tier,
        "batch_id": intake_result.batch_id,
        "archive_url": intake_result.archive_url,
        "wayback_status": intake_result.wayback_status,
        "wayback_checked_at": intake_result.wayback_checked_at,
        "wayback_error": intake_result.wayback_error,
        "source_url": intake_result.source_url,
        "original_filename": intake_result.original_filename,
        "local_copy_path": intake_result.local_copy_path,
        "source_html_sha256": intake_result.source_html_sha256,
        "local_dir": str(intake_result.local_dir) if intake_result.local_dir else "",
    }


# ---------------------------------------------------------------------------
# Document List
# ---------------------------------------------------------------------------

def page_document_list():
    st.title("Document List")

    config = _load_config_safe()
    if not config:
        st.error("Could not load config — is runner/.env configured?")
        return

    corpus_dir = config.corpus_dir
    if not corpus_dir.exists():
        st.info(f"Corpus directory does not exist yet: {corpus_dir}")
        return

    active_heavy_job = _read_app_job_lock()
    active_triage_job = _read_source_queue_triage_lock()
    if active_heavy_job or active_triage_job:
        with st.expander("Active background work", expanded=True):
            if active_heavy_job:
                st.warning(_format_app_job_lock(active_heavy_job))
            if active_triage_job:
                st.info(_format_app_job_lock(active_triage_job))

    check_supabase_live = st.checkbox(
        "Check Supabase rows while loading",
        value=False,
        key="doc_list_check_supabase_live",
        help=(
            "Off by default so Document List stays responsive on slow networks. "
            "Turn it on when you specifically need to find uploaded docs with missing Supabase rows."
        ),
    )
    if not check_supabase_live:
        st.caption(
            "Supabase row checks are skipped for this view. Local embedding files are still checked."
        )

    docs = _load_local_docs(corpus_dir, check_supabase=check_supabase_live)
    if not docs:
        st.info("No documents found in local corpus. Run `python -m runner ingest <url>` to add one.")
        return

    # ── Search ────────────────────────────────────────────────────────────
    search_q = st.text_input(
        "🔍 Search by doc_id or source URL",
        placeholder="e.g. 8fe67e19 or transdatalibrary",
        key="doc_list_search",
    )

    # Filters
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        all_types = sorted({d.get("type", "Unknown") for d in docs})
        filter_type = st.multiselect(
            "Document type", all_types, key="doc_list_filter_type"
        )
    with col2:
        all_batches = sorted({d.get("batch_id", "—") for d in docs})
        filter_batch = st.multiselect(
            "Batch", all_batches, key="doc_list_filter_batch"
        )
    with col3:
        filter_uploaded = st.selectbox(
            "Upload status", ["All", "Uploaded", "Local only"],
            key="doc_list_filter_uploaded",
        )
    with col4:
        filter_intensity = st.selectbox(
            "Rhetorical intensity",
            ["All", "hook", "pathologizing", "active-conduct", "— (unset)"],
            key="doc_list_filter_intensity",
        )
    workflow_col1, workflow_col2 = st.columns([1, 3])
    with workflow_col1:
        filter_workflow = st.selectbox(
            "Workflow status",
            [
                "All",
                "New source-offload imports",
                "Needs upload",
                "Ready to upload",
                "Needs review",
                "Missing artifacts",
                "Uploaded but Supabase missing",
            ],
            key="doc_list_filter_workflow",
        )

    filtered = docs
    if search_q:
        _sq = search_q.strip().lower()
        filtered = [
            d for d in filtered
            if _sq in d["doc_id"].lower()
            or _sq in (d.get("source") or "").lower()
        ]
    if filter_type:
        filtered = [d for d in filtered if d.get("type") in filter_type]
    if filter_batch:
        filtered = [d for d in filtered if d.get("batch_id") in filter_batch]
    if filter_uploaded == "Uploaded":
        filtered = [d for d in filtered if d.get("uploaded")]
    elif filter_uploaded == "Local only":
        filtered = [d for d in filtered if not d.get("uploaded")]
    if filter_intensity != "All":
        _intensity_value = None if filter_intensity == "— (unset)" else filter_intensity
        filtered = [
            d for d in filtered
            if (d.get("rhetorical_intensity") or None) == _intensity_value
        ]
    if filter_workflow != "All":
        if filter_workflow == "Uploaded but Supabase missing" and not check_supabase_live:
            st.warning(
                "Turn on **Check Supabase rows while loading** to use the Supabase-missing filter."
            )
        filtered = [
            d for d in filtered
            if _doc_matches_workflow_filter(d, filter_workflow)
        ]

    sort_col1, sort_col2 = st.columns([1, 3])
    with sort_col1:
        sort_by = st.selectbox(
            "Sort by",
            [
                "needs action first",
                "source-offload imported_at ↓",
                "doc_id",
                "confidence ↓",
                "rhetorical_intensity",
                "analysis_saved_at ↓",
            ],
        )
    if sort_by == "needs action first":
        filtered = sorted(filtered, key=_doc_workflow_sort_key)
    elif sort_by == "source-offload imported_at ↓":
        filtered = sorted(filtered, key=lambda d: str(d.get("offload_imported_at") or ""), reverse=True)
    elif sort_by == "confidence ↓":
        filtered = sorted(filtered, key=lambda d: d.get("confidence", 0), reverse=True)
    elif sort_by == "rhetorical_intensity":
        _ri_order = {"active-conduct": 0, "pathologizing": 1, "hook": 2, None: 3, "—": 3}
        filtered = sorted(filtered, key=lambda d: _ri_order.get(d.get("rhetorical_intensity") or None, 3))
    elif sort_by == "analysis_saved_at ↓":
        filtered = sorted(filtered, key=lambda d: str(d.get("analysis_saved_at") or ""), reverse=True)

    st.caption(f"Showing {len(filtered)} of {len(docs)} documents")

    display_mode = st.radio(
        "Display mode",
        ["One document at a time (recommended)", "Expanded cards"],
        horizontal=True,
        key="doc_list_display_mode",
        help=(
            "The recommended mode renders only one full document panel. Expanded cards can be slower "
            "because Streamlit executes every card body even when collapsed."
        ),
    )

    summary_rows = _doc_list_summary_rows(filtered)
    if summary_rows:
        st.dataframe(summary_rows, hide_index=True, width="stretch")

    # ── Export ────────────────────────────────────────────────────────────
    with st.expander("Export batch to JSON"):
        batch_id = st.text_input(
            "Batch ID (leave blank to export all local docs)",
            key="export_batch_id",
            placeholder="e.g. batch-07",
        )
        export_dest = st.text_input(
            "Export directory",
            value="exports/",
            key="export_dest",
        )
        if st.button("⬇ Export", key="export_btn"):
            import shutil as _shutil
            dest = Path(export_dest.strip()) / (batch_id.strip() or "all")
            dest.mkdir(parents=True, exist_ok=True)
            exported = 0
            for doc in docs:
                if batch_id and doc.get("batch_id") != batch_id:
                    continue
                did = doc["doc_id"]
                doc_dir = corpus_dir / did
                for fname in ("analysis.json", "intake.json", "preprocess.json", "enrichment.json"):
                    src = doc_dir / fname
                    if src.exists():
                        _shutil.copy2(src, dest / f"{did}_{fname}")
                        exported += 1
            st.success(f"Exported {exported} files to `{dest}`")

    with st.expander("Document sets and batch annotation", expanded=False):
        selected_docs = st.multiselect(
            "Select documents for a set",
            [doc["doc_id"] for doc in filtered],
            key="doc_set_selected",
        )
        set_name = st.text_input("Set name", key="doc_set_name", placeholder="e.g. youtube_sample_01")
        set_desc = st.text_area("Description", key="doc_set_desc", height=90)
        if st.button("Save selected as set", key="doc_set_save"):
            if not set_name.strip():
                st.error("Give the set a name first.")
            else:
                payload = _app_write_document_set(corpus_dir, set_name, selected_docs, set_desc)
                st.success(f"Saved `{payload['name']}` with {len(payload['docIds'])} document(s).")

        sets = _app_list_document_sets(corpus_dir)
        if sets:
            st.markdown("**Saved sets**")
            st.dataframe(
                [
                    {
                        "Name": item.get("name", ""),
                        "Docs": len(item.get("docIds", [])),
                        "Created": item.get("createdAt", "")[:19],
                        "Description": item.get("description", ""),
                    }
                    for item in sets
                ],
                hide_index=True,
                width="stretch",
            )
            batch_cols = st.columns(4)
            with batch_cols[0]:
                run_set = st.selectbox("Run on set", [item["name"] for item in sets], key="doc_set_run_name")
            with batch_cols[1]:
                run_profile = st.selectbox(
                    "Profile",
                    ["shame_article", "podcast_analysis", "testimony_analysis", "anti_gender_network", "search_discovery"],
                    key="doc_set_run_profile",
                    help="documentary_analysis is manual-only and is not available for batch runs.",
                )
            with batch_cols[2]:
                run_llm = st.selectbox("Model", ["litelm", "litelm-heavy", "litelm-reasoning", "claude", "local"], key="doc_set_run_llm")
            with batch_cols[3]:
                dry_run = st.checkbox("Dry run", value=True, key="doc_set_run_dry")
            if st.button("Run annotation profile on this set", key="doc_set_run_btn"):
                cmd = [
                    sys.executable, "-m", "runner", "annotate-batch",
                    run_profile, "--llm", run_llm, "--set", run_set,
                ]
                if dry_run:
                    cmd.append("--dry-run")
                with st.spinner("Running batch annotation…"):
                    r = __import__("subprocess").run(cmd, capture_output=True, text=True, cwd=_project_root)
                if r.returncode == 0:
                    st.success("Batch command completed.")
                    st.code(r.stdout[-3000:] or "(no output)")
                else:
                    st.error(r.stderr[-2000:] or r.stdout[-2000:])

    if not filtered:
        st.info("No documents match the current filters.")
        return

    if display_mode.startswith("One document"):
        selected_doc_id = st.session_state.get("doc_list_open_doc_id")
        doc_ids = [doc["doc_id"] for doc in filtered]
        default_index = doc_ids.index(selected_doc_id) if selected_doc_id in doc_ids else 0
        selected_id = st.selectbox(
            "Open document",
            doc_ids,
            index=default_index,
            format_func=lambda doc_id: _doc_select_label(next(d for d in filtered if d["doc_id"] == doc_id)),
            key="doc_list_selected_doc_id",
        )
        selected_doc = next(doc for doc in filtered if doc["doc_id"] == selected_id)
        st.session_state["doc_list_open_doc_id"] = selected_id
        _render_doc_card(selected_doc, corpus_dir, force_expanded=True)
    else:
        max_cards = st.number_input(
            "Maximum full cards to render",
            min_value=1,
            max_value=max(1, len(filtered)),
            value=min(10, len(filtered)),
            step=1,
            key="doc_list_max_cards",
            help="Rendering many full cards can be slow because each card computes readiness and sidecar panels.",
        )
        if len(filtered) > max_cards:
            st.info(f"Rendering the first {max_cards} document card(s). Narrow filters or increase the limit to see more.")
        for doc in filtered[: int(max_cards)]:
            _render_doc_card(doc, corpus_dir)


def _app_document_sets_dir(corpus_dir: Path) -> Path:
    path = corpus_dir / ".document_sets"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _app_safe_set_name(name: str) -> str:
    safe = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in name.strip()).strip("_")
    if not safe:
        raise ValueError("Set name is required")
    return safe


def _app_write_document_set(corpus_dir: Path, name: str, doc_ids: list[str], description: str = "") -> dict:
    payload = {
        "name": _app_safe_set_name(name),
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "description": description,
        "docIds": list(dict.fromkeys(doc_id.removeprefix("doc-") for doc_id in doc_ids)),
    }
    (_app_document_sets_dir(corpus_dir) / f"{payload['name']}.json").write_text(
        json.dumps(payload, indent=2),
        encoding="utf-8",
    )
    return payload


def _app_list_document_sets(corpus_dir: Path) -> list[dict]:
    rows = []
    for path in sorted(_app_document_sets_dir(corpus_dir).glob("*.json")):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(payload, dict):
            continue
        doc_ids = payload.get("docIds")
        if not isinstance(doc_ids, list):
            doc_ids = payload.get("doc_ids")
        if not isinstance(doc_ids, list):
            # Internal/derived JSON can never become a document set merely by
            # landing in this folder.  In particular, testimony_candidates.json
            # has no set name or document-id list and previously crashed the UI.
            continue
        name = str(payload.get("name") or payload.get("set_name") or path.stem).strip()
        if not name:
            continue
        rows.append({
            **payload,
            "name": _app_safe_set_name(name),
            "docIds": list(dict.fromkeys(
                str(doc_id).removeprefix("doc-")
                for doc_id in doc_ids
                if str(doc_id).strip()
            )),
        })
    return rows


def _pending_second_opinion_summary(doc_dir: Path) -> dict:
    pending = []
    for path in sorted(doc_dir.glob("analysis_comparison_*.json"), reverse=True):
        payload = _read_json_file(path, {})
        if payload.get("outcome") == "pending":
            pending.append(payload)
    latest = pending[0].get("generated_at", "") if pending else ""
    return {"count": len(pending), "latest_generated_at": latest}


def _load_local_docs(corpus_dir: Path, *, check_supabase: bool = False) -> list[dict]:
    docs = []
    config = _load_config_safe()
    for doc_dir in sorted(corpus_dir.iterdir()):
        if not doc_dir.is_dir():
            continue
        analysis_path = doc_dir / "analysis.json"
        if not analysis_path.exists():
            continue
        try:
            data = json.loads(analysis_path.read_text())
        except Exception:
            continue

        # Load intake meta if available
        intake_path = doc_dir / "intake.json"
        intake = {}
        if intake_path.exists():
            try:
                intake = json.loads(intake_path.read_text())
            except Exception:
                pass

        uploaded = (doc_dir / "sanity_record.json").exists()
        has_enrichment = (doc_dir / "enrichment.json").exists()
        has_preprocess = (doc_dir / "preprocess.json").exists()
        has_extracted = (doc_dir / "extracted.txt").exists() or (doc_dir / "extracted.md").exists()
        embedding_status = _local_embedding_status(doc_dir, config, check_supabase=check_supabase)
        media = _read_json_file(doc_dir / "media_metadata.json", {})
        general = media.get("general", {}) if isinstance(media, dict) else {}
        preprocess = _read_json_file(doc_dir / "preprocess.json", {})
        metadata = _read_json_file(doc_dir / "metadata.json", {})
        offload_import = _read_json_file(doc_dir / "offload_import.json", {})
        if not isinstance(offload_import, dict):
            offload_import = {}
        legal_review = legal_review_record(doc_dir)
        analysis_review = analysis_review_record(doc_dir)
        testimony_review = _read_json_file(doc_dir / "testimony_review.json", {})
        has_testimony_review = bool(testimony_review)
        testimony_state = _document_testimony_state(data, intake, testimony_review)
        latest_annotation, latest_review = _latest_annotation_dates(doc_dir)
        pending_second_opinions = _pending_second_opinion_summary(doc_dir)
        annotation_profiles = _annotation_profile_summary(doc_dir)
        reviewed_annotation_profiles = [
            profile for profile, status in annotation_profiles.items()
            if status in {"researcher_reviewed", "corrected"}
        ]
        source_publication_date = (
            general.get("publicationDate")
            or preprocess.get("date_published")
            or data.get("publication_date")
            or data.get("date")
            or ""
        )
        source_publication_date = _normalise_publication_date(str(source_publication_date or ""))
        document_date_text = _document_date_to_text(data.get("document_date") or {})
        display_publication_date = source_publication_date or document_date_text
        workflow = _document_workflow_summary(
            doc_dir=doc_dir,
            analysis=data,
            uploaded=uploaded,
            has_preprocess=has_preprocess,
            has_extracted=has_extracted,
            has_enrichment=has_enrichment,
            embedding_status=embedding_status,
            offload_import=offload_import,
            has_testimony_review=has_testimony_review,
            legal_review=legal_review,
            analysis_review=analysis_review,
            testimony_state=testimony_state,
        )

        docs.append({
            "doc_id":      doc_dir.name,
            "type":        data.get("type", "Unknown"),
            "format":      data.get("format", ""),
            "scope":       data.get("scope", ""),
            "confidence":  data.get("confidence", {}).get("overall_score", 0),
            "conf_status": data.get("confidence", {}).get("status", ""),
            "summary":     data.get("summary", ""),
            "country":     data.get("country", []),
            "tactic":      data.get("tactic", []),
            "rhetorical_intensity": data.get("rhetorical_intensity") or "—",
            "framing_balance":      data.get("framing_balance") or "—",
            "candidate_terms": len(data.get("candidate_terms", [])),
            "suggested_actors": len(data.get("suggested_actors", [])),
            "publication_date": display_publication_date,
            "source_publication_date": source_publication_date,
            "document_date_text": document_date_text,
            "analysis_saved_at": metadata.get("saved_at") or _file_timestamp(doc_dir / "analysis.json"),
            "uploaded_at": _file_timestamp(doc_dir / "sanity_record.json"),
            "offload_imported_at": workflow["offload_imported_at"],
            "offload_package_id": workflow["offload_package_id"],
            "is_source_offload_import": workflow["is_source_offload_import"],
            "latest_annotation_at": latest_annotation,
            "latest_review_at": latest_review,
            "pending_second_opinion_count": pending_second_opinions["count"],
            "latest_pending_second_opinion_at": pending_second_opinions["latest_generated_at"],
            "batch_id":    intake.get("batch_id", "—"),
            "source":      intake.get("source", ""),
            "uploaded":    uploaded,
            "is_media":    (doc_dir / "media_metadata.json").exists(),
            "annotation_profiles": sorted(annotation_profiles.keys()),
            "reviewed_annotation_profiles": sorted(reviewed_annotation_profiles),
            "embedding_ok": embedding_status["ok"],
            "embedding_detail": embedding_status["detail"],
            "supabase_ok": embedding_status["supabase_ok"],
            "supabase_detail": embedding_status["supabase_detail"],
            "has_enrichment": has_enrichment,
            "has_preprocess": has_preprocess,
            "has_extracted": has_extracted,
            "has_testimony_review": has_testimony_review,
            "testimony_review_pending": testimony_state["state"] in {
                "pending", "conflict_pending", "confirmed_publication_hold"
            },
            "testimony_upload_blocked": testimony_state["state"] == "blocked",
            "testimony_state": testimony_state["state"],
            "has_legal_review": bool(legal_review),
            "has_analysis_review": bool(analysis_review),
            "needs_action_reasons": workflow["reasons"],
            "needs_action_labels": workflow["labels"],
            "needs_action_count": workflow["action_count"],
            "workflow_rank": workflow["rank"],
            "ready_to_upload": workflow["ready_to_upload"],
            "harm": data.get("harm", []),
        })

    return docs


def _document_workflow_summary(
    *,
    doc_dir: Path,
    analysis: dict,
    uploaded: bool,
    has_preprocess: bool,
    has_extracted: bool,
    has_enrichment: bool,
    embedding_status: dict,
    offload_import: dict,
    has_testimony_review: bool,
    legal_review: dict,
    analysis_review: dict,
    testimony_state: dict | None = None,
) -> dict:
    """Return Document List workflow signals for one local corpus document.

    This is deliberately local-file based: it does not call Sanity/Supabase and
    can be unit-tested without Streamlit. The goal is to make the Document List
    act like an operational queue after Mac Studio overnight runs.
    """
    reasons: list[str] = []
    labels: list[str] = []

    package_kind = str(offload_import.get("package_kind") or "")
    is_source_offload_import = package_kind == "ingest_result"
    offload_imported_at = str(offload_import.get("imported_at") or "")
    offload_package_id = str(offload_import.get("package_id") or "")

    if is_source_offload_import:
        labels.append("Source offload")
    if offload_imported_at:
        labels.append(f"Imported {offload_imported_at[:10]}")

    missing = []
    if not has_preprocess:
        missing.append("preprocess")
    if not has_extracted:
        missing.append("extracted text")
    if not has_enrichment:
        missing.append("enrichment")
    if not embedding_status.get("ok"):
        missing.append("embedding")
    for name in missing:
        reasons.append(f"missing_{name.replace(' ', '_')}")
    if missing:
        labels.append("Missing " + ", ".join(missing))

    testimony_state = testimony_state or (
        {"state": "pending", "disagreement": False}
        if testimony_override_available(analysis) and not has_testimony_review
        else {"state": "not_required", "disagreement": False}
    )
    if testimony_state["state"] == "blocked":
        reasons.append("testimony_upload_blocked")
        labels.append("Testimony consent refused/withdrawn (archive upload blocked)")
    elif testimony_state["state"] == "conflict_pending":
        reasons.append("testimony_review")
        labels.append("Testimony consent records disagree (publication hold)")
    elif testimony_state["state"] == "pending":
        reasons.append("testimony_review")
        labels.append("Testimony review pending (publication hold)")
    elif testimony_state["state"] == "confirmed_publication_hold":
        reasons.append("testimony_publication_hold")
        labels.append("Consent confirmed; public display held")
    if legal_review_available(analysis) and not legal_review:
        reasons.append("legal_review")
        labels.append("Legal review")
    if analysis_review_marker_available(analysis) and not analysis_review:
        reasons.append("analysis_review")
        labels.append("Analysis review")

    if not uploaded:
        reasons.append("needs_upload")
        labels.append("Needs upload")
    elif embedding_status.get("ok") and embedding_status.get("supabase_ok") is False:
        reasons.append("supabase_missing")
        labels.append("Supabase missing")

    hard_review_reasons = {"legal_review", "analysis_review", "testimony_upload_blocked"}
    missing_blockers = {r for r in reasons if r.startswith("missing_")}
    ready_to_upload = (
        not uploaded
        and not missing_blockers
        and not (hard_review_reasons.intersection(reasons))
    )

    rank = 0
    if hard_review_reasons.intersection(reasons) or missing_blockers:
        rank = 0
    elif ready_to_upload:
        rank = 1
    elif "supabase_missing" in reasons:
        rank = 2
    elif is_source_offload_import:
        rank = 3
    else:
        rank = 4

    return {
        "is_source_offload_import": is_source_offload_import,
        "offload_imported_at": offload_imported_at,
        "offload_package_id": offload_package_id,
        "reasons": reasons,
        "labels": labels,
        "action_count": len([r for r in reasons if r != "needs_upload"]),
        "ready_to_upload": ready_to_upload,
        "rank": rank,
    }


def _doc_matches_workflow_filter(doc: dict, workflow_filter: str) -> bool:
    reasons = set(doc.get("needs_action_reasons") or [])
    if workflow_filter == "New source-offload imports":
        return bool(doc.get("is_source_offload_import"))
    if workflow_filter == "Needs upload":
        return "needs_upload" in reasons
    if workflow_filter == "Ready to upload":
        return bool(doc.get("ready_to_upload"))
    if workflow_filter == "Needs review":
        return bool({"testimony_review", "legal_review", "analysis_review"}.intersection(reasons))
    if workflow_filter == "Missing artifacts":
        return any(str(r).startswith("missing_") for r in reasons)
    if workflow_filter == "Uploaded but Supabase missing":
        return "supabase_missing" in reasons
    return True


def _doc_workflow_sort_key(doc: dict) -> tuple:
    """Sort actionable, recent offload imports before settled documents."""
    return (
        int(doc.get("workflow_rank", 4)),
        -int(doc.get("needs_action_count", 0)),
        -_iso_timestamp_for_sort(doc.get("offload_imported_at") or doc.get("analysis_saved_at")),
        str(doc.get("doc_id") or ""),
    )


def _iso_timestamp_for_sort(value) -> float:
    text = str(value or "").strip()
    if not text or text == "—":
        return 0.0
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def _doc_workflow_badge_text(doc: dict) -> str:
    labels = list(doc.get("needs_action_labels") or [])
    if not labels:
        return ""
    priority = [
        "Needs upload",
        "Testimony review",
        "Legal review",
        "Analysis review",
        "Supabase missing",
        "Source offload",
    ]
    ordered: list[str] = []
    for wanted in priority:
        for label in labels:
            if label == wanted and label not in ordered:
                ordered.append(label)
    for label in labels:
        if label.startswith("Missing ") and label not in ordered:
            ordered.append(label)
    if len(ordered) < 3:
        for label in labels:
            if label not in ordered and not label.startswith("Imported "):
                ordered.append(label)
            if len(ordered) >= 3:
                break
    return " · ".join(ordered[:3])


def _doc_embedding_status_label(doc: dict) -> str:
    """Human-readable embedding/Supabase status for compact document lists."""
    supabase_ok = doc.get("supabase_ok")
    if supabase_ok is True:
        return "Supabase OK"
    if doc.get("embedding_ok") and supabase_ok is False:
        return "Supabase missing"
    if doc.get("embedding_ok"):
        return "Local embedding OK"
    return "Embedding missing"


def _doc_embedding_badge(doc: dict) -> str:
    label = _doc_embedding_status_label(doc)
    if label == "Supabase OK":
        return " · Supabase OK"
    if label == "Supabase missing":
        return " · Supabase missing"
    if label == "Local embedding OK":
        return " · Local embedding"
    return " · Embedding missing"


def _doc_select_label(doc: dict) -> str:
    source = str(doc.get("source") or "").strip()
    if len(source) > 72:
        source = source[:69] + "..."
    bits = [
        str(doc.get("doc_id") or ""),
        str(doc.get("type") or "Unknown"),
        _doc_embedding_status_label(doc),
        "uploaded" if doc.get("uploaded") else "local",
    ]
    if source:
        bits.append(source)
    return " | ".join(bits)


def _doc_list_summary_rows(docs: list[dict]) -> list[dict]:
    rows = []
    for doc in docs:
        rows.append({
            "Doc ID": doc.get("doc_id", ""),
            "Type": doc.get("type", "Unknown"),
            "Workflow": _doc_workflow_badge_text(doc) or "—",
            "Upload": "Sanity" if doc.get("uploaded") else "Local only",
            "Embedding": _doc_embedding_status_label(doc),
            "Confidence": f"{float(doc.get('confidence') or 0):.2f}",
            "Date": doc.get("publication_date") or "—",
            "Source": doc.get("source") or "",
        })
    return rows


def _set_doc_action_feedback(doc_id: str, level: str, message: str) -> None:
    st.session_state[f"doc_action_feedback_{doc_id}"] = {
        "level": level,
        "message": message,
    }


def _render_doc_action_feedback(doc_id: str) -> None:
    feedback = st.session_state.pop(f"doc_action_feedback_{doc_id}", None)
    if not feedback:
        return
    level = feedback.get("level", "info")
    message = feedback.get("message", "")
    if level == "success":
        st.success(message)
    elif level == "warning":
        st.warning(message)
    elif level == "error":
        st.error(message)
    else:
        st.info(message)


def _complement_enrichment_command(doc_id: str) -> list[str]:
    return [sys.executable, "-m", "runner", "enrich", doc_id, "--yes"]


def _default_source_queue_batch_group() -> str:
    return datetime.now(timezone.utc).strftime("pilot-%Y-%m-%d-%H%M")


def _batch_run_command(
    *,
    batch_group: str = "",
    limit: int,
    priority: str = "",
    priority_mix: dict[str, int] | None = None,
    max_per_host: int = 0,
    execute: bool = False,
    run_enrich: bool = True,
    enrich_model: str = "",
    skip_preflight: bool = False,
) -> list[str]:
    command = [
        sys.executable,
        "-m",
        "runner",
        "batch-run",
    ]
    if batch_group:
        command.extend(["--batch", batch_group])
    command.extend(["--limit", str(limit)])
    if priority:
        command.extend(["--priority", priority])
    elif priority_mix:
        for priority_name, flag in (
            ("high", "--mix-high"),
            ("medium", "--mix-medium"),
            ("low", "--mix-low"),
        ):
            value = int(priority_mix.get(priority_name, 0) or 0)
            if value:
                command.extend([flag, str(value)])
    if max_per_host:
        command.extend(["--max-per-host", str(max_per_host)])
    if execute:
        command.append("--execute")
    if not run_enrich:
        command.append("--no-enrich")
    elif enrich_model:
        command.extend(["--enrich-model", enrich_model])
    if skip_preflight:
        command.append("--skip-preflight")
    return command


def _recent_batch_ledgers(config, limit: int = 20) -> list[Path]:
    root = Path(config.exports_dir) / "batch_ledgers"
    if not root.exists():
        return []
    return sorted(
        root.glob("*_ledger.json"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )[:limit]


def _compile_batch_outcome_action(config, ledger_path: Path) -> dict:
    from runner.pipeline.batch_outcome import compile_batch_outcome

    return compile_batch_outcome(
        ledger_path,
        Path(config.corpus_dir),
        Path(config.exports_dir) / "batch_outcomes",
        policy_path=_project_root / "runner" / "data" / "batch_outcome_policy.json",
    )


def _generate_batch_review_pack_action(config, outcome_path: Path) -> dict:
    from runner.pipeline.review_pack import generate_review_pack

    return generate_review_pack(
        Path(config.corpus_dir),
        Path(config.exports_dir) / "review_packs",
        outcome_path=Path(outcome_path),
    )


def _write_batch_tag_projection_sidecars_action(config, outcome: dict) -> dict:
    from runner.pipeline.provisional_memory import build_tag_projections

    memory_meta = outcome.get("provisional_memory") or {}
    memory_path = Path(str(memory_meta.get("path") or ""))
    if not memory_path.is_file():
        raise FileNotFoundError("The provisional-memory snapshot is missing; compile the batch again.")
    memory = json.loads(memory_path.read_text(encoding="utf-8"))
    doc_ids = {
        str(item.get("doc_id") or "") for item in outcome.get("items") or []
        if isinstance(item, dict) and item.get("doc_id")
    }
    return build_tag_projections(
        Path(config.corpus_dir),
        memory,
        Path(config.exports_dir) / "tag_projections" / str(outcome.get("batch_id") or "batch") / "latest_tag_projections.json",
        doc_ids=doc_ids,
        write_doc_sidecars=True,
    )


def _plan_workflow_batch_action(
    config, db, *, batch_group: str, limit: int, purpose: str, questions: list[str],
    selected_item_ids: list[str] | None = None,
    model_policy: str = "triage_recommended",
    remote_write_policy: str = "none",
    disclosure_mode: str = "internal_research",
    audit_sample_rule: str = "exceptions_and_researcher_selected",
) -> dict:
    from runner.pipeline.workflow_batch import WorkflowPolicy, plan_workflow_batch, write_workflow_batch
    from runner.pipeline.specialist_dispatch import build_dispatch_plan, write_dispatch_plan

    workflow_id = datetime.now(timezone.utc).strftime("workflow-%Y%m%d-%H%M%S")
    manifest = plan_workflow_batch(
        db,
        workflow_batch_id=workflow_id,
        selected_item_ids=selected_item_ids,
        batch_group=batch_group,
        limit=limit,
        policy=WorkflowPolicy(
            research_purpose=purpose,
            research_questions=questions,
            model_policy=model_policy,
            remote_write_policy=remote_write_policy,
            disclosure_mode=disclosure_mode,
            audit_sample_rule=audit_sample_rule,
        ),
    )
    manifest_path = write_workflow_batch(
        manifest, Path(config.exports_dir) / "workflow_batches"
    )
    dispatch = build_dispatch_plan(manifest, Path(config.corpus_dir))
    dispatch_path = write_dispatch_plan(
        dispatch,
        Path(config.exports_dir) / "specialist_dispatch",
        workflow_manifest=manifest,
        corpus_dir=Path(config.corpus_dir),
    )
    return {
        "manifest": manifest,
        "manifest_path": manifest_path,
        "dispatch": dispatch,
        "dispatch_path": dispatch_path,
    }


def _workflow_ui_input_fingerprint(
    *, batch_group: str, selected_item_ids: list[str] | None, limit: int,
    purpose: str, questions: list[str], model_policy: str,
    disclosure_mode: str, audit_sample_rule: str,
) -> str:
    payload = {
        "batch_group": batch_group if not selected_item_ids else "",
        "selected_item_ids": list(dict.fromkeys(selected_item_ids or [])),
        "limit": int(limit),
        "purpose": purpose,
        "questions": questions,
        "model_policy": model_policy,
        "remote_write_policy": "none",
        "disclosure_mode": disclosure_mode,
        "audit_sample_rule": audit_sample_rule,
    }
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def _plan_workflow_attempts_action(
    config,
    *,
    workflow: dict,
    dispatch: dict,
    selected_item_ids: list[str] | None = None,
    selected_stages: list[str] | None = None,
) -> dict:
    """Create local planner evidence and an append-only ledger; execute nothing."""
    from runner.pipeline.workflow_attestation import build_workflow_attestation, write_workflow_attestation
    from runner.pipeline.workflow_attempts import (
        build_attempt_plan,
        persist_attempt_plan,
        reconcile_attempt_plan,
        write_attempt_plan,
    )

    normalized_stages = list(dict.fromkeys(selected_stages or []))
    if not normalized_stages:
        raise ValueError("The researcher-facing planner requires at least one explicit stage")
    corpus_dir = Path(config.corpus_dir)
    attestation_root = Path(config.exports_dir) / "workflow_attestations"
    attempts_root = Path(config.exports_dir) / "workflow_attempts"
    ledger_path = attempts_root / "attempts.sqlite3"
    hash_cache = {}
    attestation = build_workflow_attestation(workflow, dispatch, corpus_dir)
    attestation_path = write_workflow_attestation(
        attestation,
        attestation_root,
        workflow=workflow,
        dispatch=dispatch,
        corpus_dir=corpus_dir,
    )
    selected_ids = list(dict.fromkeys(selected_item_ids or []))
    plan = build_attempt_plan(
        workflow,
        dispatch,
        attestation,
        corpus_dir,
        mode="run_selected" if selected_ids else "run_missing",
        selected_item_ids=selected_ids,
        selected_stages=normalized_stages,
        hash_cache=hash_cache,
    )
    plan_path = write_attempt_plan(
        plan,
        attempts_root,
        workflow=workflow,
        dispatch=dispatch,
        attestation=attestation,
        corpus_dir=corpus_dir,
        hash_cache=hash_cache,
    )
    persistence = persist_attempt_plan(
        plan,
        ledger_path,
        workflow=workflow,
        dispatch=dispatch,
        attestation=attestation,
        corpus_dir=corpus_dir,
        hash_cache=hash_cache,
    )
    reconciliation = reconcile_attempt_plan(
        plan,
        ledger_path,
        workflow=workflow,
        dispatch=dispatch,
        attestation=attestation,
        corpus_dir=corpus_dir,
        hash_cache=hash_cache,
    )
    if not reconciliation["ok"]:
        raise ValueError("The append-only attempt ledger did not reconcile with the new plan")
    return {
        "attestation": attestation,
        "attestation_path": attestation_path,
        "plan": plan,
        "plan_path": plan_path,
        "ledger_path": ledger_path,
        "persistence": persistence,
        "reconciliation": reconciliation,
    }


def _render_workflow_batch_panel(
    config, db, *, batch_group: str, limit: int, key_prefix: str,
    selected_item_ids: list[str] | None = None,
) -> None:
    from runner.pipeline.workflow_templates import load_templates, save_template

    with st.expander("Workflow batch: select before routing", expanded=False):
        st.caption(
            "Plans at most 15 Source Queue rows including specialist-flagged sources. "
            "It reuses existing triage, executes no model or pipeline stage, and makes no remote writes."
        )
        templates_path = Path(config.exports_dir) / "workflow_templates" / "templates.json"
        templates = load_templates(templates_path)
        template_by_name = {row["name"]: row for row in templates}
        template_name = st.selectbox(
            "Reusable research template",
            list(template_by_name),
            key=f"{key_prefix}_workflow_template",
        )
        if st.button("Apply template", key=f"{key_prefix}_workflow_apply_template"):
            template = template_by_name[template_name]
            st.session_state[f"{key_prefix}_workflow_purpose"] = template["research_purpose"]
            st.session_state[f"{key_prefix}_workflow_questions"] = "\n".join(template["research_questions"])
            st.session_state[f"{key_prefix}_workflow_model_policy"] = template["model_policy"]
            st.session_state[f"{key_prefix}_workflow_disclosure"] = template["disclosure_mode"]
            st.session_state[f"{key_prefix}_workflow_audit_rule"] = template["audit_sample_rule"]
            st.rerun()

        purpose = st.text_area(
            "Research purpose", key=f"{key_prefix}_workflow_purpose",
            placeholder="Why are these sources being processed together?", height=90,
        )
        questions_text = st.text_area(
            "Batch research questions (one per line)",
            key=f"{key_prefix}_workflow_questions", height=90,
        )
        policy_cols = st.columns(3)
        model_policy = policy_cols[0].selectbox(
            "Model policy", ["triage_recommended", "local_preferred", "researcher_selected"],
            key=f"{key_prefix}_workflow_model_policy",
        )
        disclosure_mode = policy_cols[1].selectbox(
            "Disclosure", ["internal_research", "external_safe"],
            key=f"{key_prefix}_workflow_disclosure",
        )
        audit_key = f"{key_prefix}_workflow_audit_rule"
        st.session_state.setdefault(audit_key, "exceptions_and_researcher_selected")
        audit_sample_rule = policy_cols[2].text_input("Audit sample rule", key=audit_key)
        save_cols = st.columns([2, 1])
        new_template_name = save_cols[0].text_input(
            "Save current settings as", key=f"{key_prefix}_workflow_new_template_name",
            placeholder="My recurring batch question",
        )
        if save_cols[1].button(
            "Save template", key=f"{key_prefix}_workflow_save_template",
            disabled=not bool(new_template_name.strip()),
        ):
            try:
                save_template(templates_path, {
                    "name": new_template_name,
                    "research_purpose": purpose,
                    "research_questions": [line.strip() for line in questions_text.splitlines() if line.strip()],
                    "model_policy": model_policy,
                    "remote_write_policy": "none",
                    "disclosure_mode": disclosure_mode,
                    "audit_sample_rule": audit_sample_rule,
                })
            except Exception as exc:
                st.error(f"Template was not saved: {exc}")
            else:
                st.success(f"Saved reusable template `{new_template_name.strip()}`.")

        explicit_ids = list(dict.fromkeys(selected_item_ids or []))
        selection_options = ["Checked rows", "Saved batch group"] if explicit_ids else ["Saved batch group"]
        selection_mode = st.radio(
            "Workflow selection", selection_options, horizontal=True,
            key=f"{key_prefix}_workflow_selection_mode",
        )
        use_explicit = selection_mode == "Checked rows"
        if use_explicit:
            st.caption(
                f"Using {len(explicit_ids)} checked row(s), including specialist-held rows. "
                "This does not rewrite their saved batch group."
            )
        if len(explicit_ids) > 15:
            st.error("A workflow batch can contain at most 15 checked rows. Clear some row selections first.")
        plan_disabled = (
            len(explicit_ids) > 15
            or (use_explicit and not explicit_ids)
            or (not use_explicit and not bool(batch_group))
        )
        questions = [line.strip() for line in questions_text.splitlines() if line.strip()]
        effective_ids = explicit_ids if use_explicit else None
        effective_limit = len(explicit_ids) if use_explicit else limit
        ui_input_fingerprint = _workflow_ui_input_fingerprint(
            batch_group=batch_group,
            selected_item_ids=effective_ids,
            limit=effective_limit,
            purpose=purpose,
            questions=questions,
            model_policy=model_policy,
            disclosure_mode=disclosure_mode,
            audit_sample_rule=audit_sample_rule,
        )
        if st.button(
            "Plan workflow routes",
            key=f"{key_prefix}_workflow_plan",
            disabled=plan_disabled,
        ):
            try:
                result = _plan_workflow_batch_action(
                    config, db, batch_group=batch_group,
                    limit=effective_limit,
                    purpose=purpose,
                    questions=questions,
                    selected_item_ids=effective_ids,
                    model_policy=model_policy,
                    remote_write_policy="none",
                    disclosure_mode=disclosure_mode,
                    audit_sample_rule=audit_sample_rule,
                )
            except Exception as exc:
                st.error(f"Workflow planning failed: {exc}")
            else:
                result["ui_input_fingerprint"] = ui_input_fingerprint
                st.session_state[f"{key_prefix}_workflow_result"] = result
        result = st.session_state.get(f"{key_prefix}_workflow_result")
        if not result:
            return
        if result.get("ui_input_fingerprint") != ui_input_fingerprint:
            st.info("The selection or research policy changed. Plan workflow routes again to refresh this result.")
            return
        manifest = result["manifest"]
        summary = manifest["summary"]
        st.success(
            f"Selected {summary['selected']} source(s): {summary['ordinary']} ordinary, "
            f"{summary['attended_base']} attended, {summary['technical_hold']} technical hold(s)."
        )
        st.dataframe(
            [{
                "Queue item": item["queue_item_id"],
                "Title/source": item["title"] or item["url"],
                "Base route": item["base_route"],
                "Specialists": ", ".join(item["specialist_routes"]) or "—",
                "Prerequisites": "; ".join(item["prerequisites"]) or "—",
                "Next action": item["next_action"],
            } for item in manifest["items"]],
            hide_index=True, use_container_width=True,
        )
        dispatch_rows = [
            {
                "Queue item": row["queue_item_id"],
                "Document": row["doc_id"] or "not ingested",
                "Base status": row["base_status"],
                "Specialist status": ", ".join(
                    f"{plan['route']}:{plan['status']}" for plan in row["specialists"]
                ) or "not applicable",
                "Next action": row["next_action"],
            }
            for row in result["dispatch"]["items"]
        ]
        st.markdown("**Dry-run specialist dispatch**")
        st.dataframe(dispatch_rows, hide_index=True, use_container_width=True)
        st.caption(f"Workflow plan: `{result['manifest_path']}`")
        st.caption(f"Dispatch plan: `{result['dispatch_path']}`")
        st.warning("This is planning only. Existing specialist commands were not executed.")

        st.markdown("**Append-only attempt planner**")
        st.caption(
            "Optionally record which existing local stages are runnable, satisfied, held, or human-owned. "
            "This creates local evidence only. A later stage stays held until its prerequisite finishes "
            "and you create a fresh plan."
        )
        item_labels = {
            row["queue_item_id"]: row["title"] or row["url"] or row["queue_item_id"]
            for row in manifest["items"]
        }
        attempt_item_ids = st.multiselect(
            "Limit attempt plan to workflow items (empty means all)",
            list(item_labels),
            format_func=lambda value: item_labels[value],
            key=f"{key_prefix}_attempt_item_ids",
        )
        specialist_routes = sorted({
            str(value["route"])
            for row in result["dispatch"]["items"]
            for value in row.get("specialists") or []
        })
        stage_options = ["local_base", *[f"specialist:{route}" for route in specialist_routes]]
        safe_stage_defaults = [
            value for value in stage_options if value != "specialist:longform"
        ]
        attempt_stages = st.multiselect(
            "Stages to record (longform is opt-in)",
            stage_options,
            default=safe_stage_defaults,
            key=f"{key_prefix}_attempt_stages",
        )
        attempt_ui_key = hashlib.sha256(json.dumps({
            "workflow_fingerprint": manifest["evidence_fingerprint"],
            "dispatch_fingerprint": result["dispatch"]["evidence_fingerprint"],
            "selected_item_ids": attempt_item_ids,
            "selected_stages": attempt_stages,
        }, sort_keys=True).encode("utf-8")).hexdigest()
        longform_selected = "specialist:longform" in attempt_stages
        longform_confirmed = False
        if longform_selected:
            st.caption(
                "Longform planning may hash a large local source to bind the proposal. "
                "The action shows a progress spinner and never copies the source."
            )
            longform_confirmed = st.checkbox(
                "Include longform source hashing in this planner action",
                key=f"{key_prefix}_attempt_longform_confirm",
            )
        elif not attempt_stages:
            st.info("Select at least one stage to create a planner ledger.")
        if st.button(
            "Create planner-only attempt ledger",
            key=f"{key_prefix}_attempt_plan",
            disabled=not attempt_stages or (longform_selected and not longform_confirmed),
        ):
            try:
                with st.spinner("Validating current evidence and hashing only declared stage inputs…"):
                    attempt_result = _plan_workflow_attempts_action(
                        config,
                        workflow=manifest,
                        dispatch=result["dispatch"],
                        selected_item_ids=attempt_item_ids,
                        selected_stages=attempt_stages,
                    )
            except Exception as exc:
                st.error(f"Attempt planning failed closed: {exc}")
            else:
                attempt_result["workflow_fingerprint"] = manifest["evidence_fingerprint"]
                attempt_result["dispatch_fingerprint"] = result["dispatch"]["evidence_fingerprint"]
                attempt_result["ui_request_key"] = attempt_ui_key
                st.session_state[f"{key_prefix}_attempt_result"] = attempt_result

        attempt_result = st.session_state.get(f"{key_prefix}_attempt_result")
        if not attempt_result:
            return
        if (
            attempt_result.get("workflow_fingerprint") != manifest["evidence_fingerprint"]
            or attempt_result.get("dispatch_fingerprint") != result["dispatch"]["evidence_fingerprint"]
            or attempt_result.get("ui_request_key") != attempt_ui_key
        ):
            st.info("The workflow evidence or attempt selection changed. Create a fresh attempt plan before using this ledger view.")
            return
        attempt_plan = attempt_result["plan"]
        attempt_summary = attempt_plan["summary"]
        try:
            from runner.pipeline.workflow_attempts import list_attempts
            ledger_rows = list_attempts(Path(attempt_result["ledger_path"]), limit=1000)
            execution_by_attempt = {
                str(row["attempt_id"]): row for row in ledger_rows
            }
        except Exception as exc:
            execution_by_attempt = {}
            st.warning(f"Execution-state projection could not be verified: {exc}")
        st.success(
            f"Recorded {attempt_summary['rows']} planner row(s): "
            f"{attempt_summary['planned_not_authorized']} proposed, "
            f"{attempt_summary['held_prerequisite']} held, "
            f"{attempt_summary['human_required']} human-owned."
        )
        st.dataframe(
            [{
                "Item": row["queue_item_id"],
                "Order": f"{row['item_ordinal']}.{row['route_sequence']}",
                "Stage": row["stage"],
                "Planner state": row["disposition"],
                "Execution state": execution_by_attempt.get(
                    row["attempt_id"], {},
                ).get("execution_state", "unavailable"),
                "Terminal outcome": execution_by_attempt.get(
                    row["attempt_id"], {},
                ).get("terminal_outcome", "") or "—",
                "Input evidence": row["stage_input_status"],
                "Depends on": ", ".join(value[:20] for value in row["depends_on_attempt_ids"]) or "—",
                "Inert proposal": row["command"][3] if row["command"] else "—",
            } for row in attempt_plan["rows"]],
            hide_index=True,
            use_container_width=True,
        )
        testimony_rows = [
            row for row in attempt_plan["rows"]
            if row.get("stage") == "testimony-candidates-build"
        ]
        if testimony_rows:
            canary_labels = {
                row["attempt_id"]: f"{row['queue_item_id']} · {row['attempt_id']}"
                for row in testimony_rows
            }
            selected_attempt_id = st.selectbox(
                "Inspect planned testimony canary",
                list(canary_labels),
                format_func=lambda value: canary_labels[value],
                key=f"{key_prefix}_planned_canary_attempt",
            )
            projection = execution_by_attempt.get(selected_attempt_id, {})
            selected_row = next(
                row for row in testimony_rows if row["attempt_id"] == selected_attempt_id
            )
            st.dataframe(
                _workflow_canary_step_rows({**selected_row, **projection}),
                hide_index=True,
                use_container_width=True,
            )
            preflight_ready = _workflow_canary_execution_eligible({
                **selected_row, **projection,
            })
            if st.button(
                "Validate selected testimony canary (read only)",
                key=f"{key_prefix}_planned_canary_preflight",
                disabled=not preflight_ready,
                help="Checks bound files, fingerprints, output target, and ledger without granting or running anything.",
            ):
                try:
                    from runner.pipeline.workflow_execution import preflight_selected_testimony_attempt
                    preflight = preflight_selected_testimony_attempt(
                        attempt_plan,
                        selected_attempt_id,
                        Path(attempt_result["ledger_path"]),
                        workflow=manifest,
                        dispatch=result["dispatch"],
                        attestation=attempt_result["attestation"],
                        corpus_dir=Path(config.corpus_dir),
                        evidence_root=Path(config.exports_dir) / "workflow_executions",
                    )
                except Exception as exc:
                    st.error(f"Read-only canary preflight refused: {exc}")
                else:
                    st.session_state[f"{key_prefix}_planned_canary_preflight_result"] = {
                        "attempt_id": selected_attempt_id,
                        **preflight,
                    }
            preflight_result = st.session_state.get(
                f"{key_prefix}_planned_canary_preflight_result", {}
            )
            if preflight_result.get("attempt_id") == selected_attempt_id:
                st.success(
                    "Read-only preflight passed against the evidence at check time. Execution "
                    "rechecks every current input. No grant, model call, sidecar write, upload, "
                    "or publication occurred."
                )
            command_base = [
                sys.executable, "-m", "runner", "workflow-testimony-canary",
                str(attempt_result["plan_path"]),
                str(result["manifest_path"]),
                str(result["dispatch_path"]),
                str(attempt_result["attestation_path"]),
                "--attempt-id", selected_attempt_id,
                "--ledger", str(attempt_result["ledger_path"]),
                "--evidence-root", str(Path(config.exports_dir) / "workflow_executions"),
            ]
            with st.expander("Canary commands and safety boundary", expanded=False):
                if preflight_ready:
                    st.caption("Read-only preflight (safe next check):")
                    st.code(shlex.join(command_base), language="bash")
                    st.caption("One-use deterministic execution (only after inspecting the exact attempt):")
                    st.code(
                        shlex.join([*command_base, "--execute", "--confirm-attempt", selected_attempt_id]),
                        language="bash",
                    )
                else:
                    st.warning(
                        "No execution command is shown: this attempt is held, untrusted, already granted, "
                        "or terminal. Create a fresh valid proposal instead of rerunning it."
                    )
                if projection.get("recovery_check_required"):
                    st.caption(
                        "Nonterminal grant recovery — use only after confirming no execution process "
                        "is active; this does not rerun the adapter:"
                    )
                    st.code(shlex.join([
                        sys.executable, "-m", "runner", "workflow-testimony-recover",
                        str(attempt_result["plan_path"]), "--attempt-id", selected_attempt_id,
                        "--confirm-attempt", selected_attempt_id,
                        "--ledger", str(attempt_result["ledger_path"]),
                        "--evidence-root", str(Path(config.exports_dir) / "workflow_executions"),
                    ]), language="bash")
                if projection.get("terminal_recorded"):
                    st.caption("Read-only execution-evidence verification:")
                    st.code(shlex.join([
                        sys.executable, "-m", "runner", "workflow-testimony-evidence-verify",
                        str(attempt_result["plan_path"]), "--attempt-id", selected_attempt_id,
                        "--ledger", str(attempt_result["ledger_path"]),
                        "--evidence-root", str(Path(config.exports_dir) / "workflow_executions"),
                    ]), language="bash")
        st.caption(f"Attestation: `{attempt_result['attestation_path']}`")
        st.caption(f"Attempt plan: `{attempt_result['plan_path']}`")
        st.caption(f"Append-only ledger: `{attempt_result['ledger_path']}`")
        st.warning(
            "This Streamlit panel cannot execute a proposal. Planner rows remain non-authorizing; "
            "the separate execution-state columns report any append-only canary events recorded elsewhere. "
            "No model, import, upload, or publication action is available here."
        )


def _render_batch_outcome_panel(config, *, key_prefix: str) -> None:
    ledgers = _recent_batch_ledgers(config)
    with st.expander("Batch outcome and re-audit", expanded=False):
        st.caption(
            "Compile one deterministic exception list from a completed batch. "
            "This reads local evidence only; it does not call a model, execute a route, or publish."
        )
        if not ledgers:
            st.info("No batch ledgers exist yet. Run a rehearsal or live batch first.")
            return
        selected = st.selectbox(
            "Batch ledger",
            ledgers,
            format_func=lambda path: path.name,
            key=f"{key_prefix}_outcome_ledger",
        )
        if st.button("Compile / re-audit outcome", key=f"{key_prefix}_compile_outcome"):
            try:
                result = _compile_batch_outcome_action(config, selected)
            except Exception as exc:
                st.error(f"Outcome compilation failed: {exc}")
            else:
                st.session_state[f"{key_prefix}_batch_outcome"] = result

        result = st.session_state.get(f"{key_prefix}_batch_outcome")
        if not result:
            return
        outcome = result.get("outcome") or {}
        if Path(str(outcome.get("ledger_path") or "")) != Path(selected).resolve():
            st.info("The selected ledger has changed. Compile it before using the displayed outcome.")
            return
        if result.get("reused"):
            st.info("Evidence and policy are unchanged; the existing audit snapshot was reused.")
        else:
            st.success("A new immutable batch audit snapshot was created.")
        counts = (outcome.get("summary") or {}).get("outcome_counts") or {}
        if counts:
            st.dataframe(
                [{"Outcome": name, "Documents": count} for name, count in sorted(counts.items())],
                hide_index=True,
                use_container_width=True,
            )
        summary = outcome.get("summary") or {}
        review_counts = summary.get("review_lane_counts") or {}
        specialist_counts = summary.get("specialist_route_counts") or {}
        if review_counts:
            st.markdown("**Research attention**")
            st.dataframe(
                [{"Lane": name, "Documents": count} for name, count in sorted(review_counts.items())],
                hide_index=True, use_container_width=True,
            )
        if specialist_counts or summary.get("routed_holds"):
            st.markdown("**Specialist routing**")
            st.dataframe(
                [
                    {"Route": name, "Documents": count}
                    for name, count in sorted(specialist_counts.items())
                ] + ([{
                    "Route": "triage-held before base processing",
                    "Documents": int(summary.get("routed_holds") or 0),
                }] if summary.get("routed_holds") else []),
                hide_index=True, use_container_width=True,
            )
        stage_counts = summary.get("stage_status_counts") or {}
        if stage_counts:
            with st.expander("Processing stages", expanded=False):
                st.dataframe(
                    [
                        {"Stage": stage_name, "Status": status, "Documents": count}
                        for stage_name, values in sorted(stage_counts.items())
                        for status, count in sorted(values.items())
                    ],
                    hide_index=True, use_container_width=True,
                )
        selected_groups = (outcome.get("review_plan") or {}).get("selected_groups") or []
        deferred_groups = (outcome.get("review_plan") or {}).get("deferred_human_candidate_groups") or 0
        if selected_groups:
            with st.expander(f"Grouped human exceptions ({len(selected_groups)})", expanded=False):
                st.dataframe(
                    [{
                        "Family": group.get("family_label"),
                        "Concept": group.get("label"),
                        "Documents": group.get("document_count"),
                        "Evidence": group.get("evidence_count"),
                        "Why": "; ".join(group.get("priority_reasons") or []),
                    } for group in selected_groups],
                    hide_index=True, use_container_width=True,
                )
                if deferred_groups:
                    st.warning(f"{deferred_groups} additional human-candidate group(s) are deferred, not downgraded to AI-managed work.")
        changes = (outcome.get("changes_from_previous") or {}).get("changed") or []
        if changes:
            st.warning(f"{len(changes)} document route(s) changed since the preceding audit.")
            st.dataframe(changes, hide_index=True, use_container_width=True)
        st.caption(f"Audit: `{result.get('outcome_path', '')}`")
        st.caption(f"Readable report: `{result.get('markdown_path', '')}`")
        memory_meta = outcome.get("provisional_memory") or {}
        if memory_meta:
            with st.expander("Provisional memory and normalized tag projection", expanded=False):
                memory_summary = memory_meta.get("summary") or {}
                m1, m2, m3 = st.columns(3)
                m1.metric("Draft records", int(memory_summary.get("draft_records") or 0))
                m2.metric("Recurring provisional", int(memory_summary.get("recurring_provisional") or 0))
                m3.metric("Conflicted", int(memory_summary.get("conflicted_provisional") or 0))
                st.caption(f"Memory snapshot: `{memory_meta.get('path', '')}`")
                st.caption(f"Dry-run tag projection: `{(outcome.get('tag_projection') or {}).get('path', '')}`")
                confirm_projection = st.checkbox(
                    "I understand this writes only derived tag_projection.json sidecars; original Analysis and Enrichment remain unchanged.",
                    key=f"{key_prefix}_confirm_tag_projection",
                )
                if st.button(
                    "Write derived tag projections",
                    key=f"{key_prefix}_write_tag_projections",
                    disabled=not confirm_projection,
                ):
                    try:
                        projection_result = _write_batch_tag_projection_sidecars_action(config, outcome)
                    except Exception as exc:
                        st.error(f"Tag projection write failed: {exc}")
                    else:
                        st.success(
                            f"Wrote derived projections for {projection_result['projection']['document_count']} document(s)."
                        )
        privacy_mode = st.selectbox(
            "Review Pack sharing mode",
            ["private_local", "external_safe"],
            format_func=lambda value: "Private local (full evidence)" if value == "private_local" else "External-safe (sensitive contents withheld)",
            key=f"{key_prefix}_review_pack_privacy",
        )
        review_questions_text = st.text_area(
            "Optional Review Pack questions (one per line)",
            key=f"{key_prefix}_review_pack_questions",
            height=90,
        )
        if st.button("Generate Codex Review Pack", key=f"{key_prefix}_generate_review_pack"):
            try:
                from runner.pipeline.review_pack import generate_review_pack
                questions = [line.strip() for line in review_questions_text.splitlines() if line.strip()]
                pack_result = generate_review_pack(
                    Path(config.corpus_dir),
                    Path(config.exports_dir) / "review_packs",
                    outcome_path=Path(result.get("outcome_path", "")),
                    review_questions=questions or None,
                    privacy_mode=privacy_mode,
                )
            except Exception as exc:
                st.error(f"Review Pack generation failed: {exc}")
            else:
                st.session_state[f"{key_prefix}_review_pack"] = pack_result
        pack_result = st.session_state.get(f"{key_prefix}_review_pack")
        if pack_result:
            pack = pack_result.get("pack") or {}
            st.success(
                f"Review Pack ready for {pack.get('document_count', 0)} document(s). "
                "No model was called and nothing was published."
            )
            st.caption(f"Markdown: `{pack_result.get('markdown_path', '')}`")
            st.caption(f"JSON: `{pack_result.get('json_path', '')}`")
            markdown_path = Path(str(pack_result.get("markdown_path") or ""))
            json_path = Path(str(pack_result.get("json_path") or ""))
            download_cols = st.columns(2)
            if markdown_path.is_file():
                download_cols[0].download_button(
                    "Download Markdown",
                    data=markdown_path.read_bytes(),
                    file_name=markdown_path.name,
                    mime="text/markdown",
                    key=f"{key_prefix}_download_review_pack_md",
                )
            if json_path.is_file():
                download_cols[1].download_button(
                    "Download JSON",
                    data=json_path.read_bytes(),
                    file_name=json_path.name,
                    mime="application/json",
                    key=f"{key_prefix}_download_review_pack_json",
                )


def _app_job_lock_path() -> Path:
    return _project_root / "exports" / "app_jobs" / "active_llm_job.json"


def _source_queue_triage_lock_path() -> Path:
    return _project_root / "exports" / "app_jobs" / "source_queue_triage_job.json"


def _model_job_lease_path() -> Path:
    return _project_root / "exports" / "app_jobs" / "active_llm_job.lease"


def _acquire_model_job_lease() -> int:
    from runner.pipeline.triage_jobs import acquire_worker_lock

    try:
        fd = acquire_worker_lock(_model_job_lease_path())
    except RuntimeError as exc:
        raise RuntimeError("Another model job acquired the shared resource lease. Please wait.") from exc
    os.set_inheritable(fd, True)
    return fd


def _release_model_job_lease(fd: int) -> None:
    from runner.pipeline.triage_jobs import release_worker_lock

    release_worker_lock(_model_job_lease_path(), fd)


def _pid_is_running(pid: int | str | None) -> bool:
    try:
        pid_int = int(pid or 0)
    except (TypeError, ValueError):
        return False
    if pid_int <= 0:
        return False
    try:
        os.kill(pid_int, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def _read_app_job_lock() -> dict | None:
    """Return the active heavy app job, clearing stale lock files."""
    path = _app_job_lock_path()
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        path.unlink(missing_ok=True)
        return None
    if _pid_is_running(data.get("pid")):
        return data
    path.unlink(missing_ok=True)
    return None


def _write_app_job_lock(job: dict) -> None:
    from runner.pipeline.atomic_io import atomic_write_json

    path = _app_job_lock_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "pid": job.get("pid"),
        "kind": job.get("kind", "job"),
        "mode": job.get("mode", ""),
        "started_at": job.get("started_at", ""),
        "log_path": job.get("log_path", ""),
        "command": job.get("command", ""),
        "item_count": job.get("item_count", ""),
        "label": job.get("label", ""),
    }
    atomic_write_json(path, payload)


def _clear_app_job_lock(job: dict | None = None) -> None:
    path = _app_job_lock_path()
    if not path.exists():
        return
    if not job:
        path.unlink(missing_ok=True)
        return
    try:
        current = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        path.unlink(missing_ok=True)
        return
    if str(current.get("pid", "")) == str(job.get("pid", "")):
        path.unlink(missing_ok=True)


def _read_source_queue_triage_lock() -> dict | None:
    """Return the active Source Queue triage job, clearing stale lock files."""
    path = _source_queue_triage_lock_path()
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        path.unlink(missing_ok=True)
        return None
    if _pid_is_running(data.get("pid")):
        return data
    path.unlink(missing_ok=True)
    return None


def _write_source_queue_triage_lock(job: dict) -> None:
    path = _source_queue_triage_lock_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "pid": job.get("pid"),
        "kind": job.get("kind", "source-queue-triage"),
        "mode": job.get("mode", ""),
        "started_at": job.get("started_at", ""),
        "log_path": job.get("log_path", ""),
        "command": job.get("command", ""),
        "item_count": job.get("item_count", ""),
        "label": job.get("label", ""),
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _clear_source_queue_triage_lock(job: dict | None = None) -> None:
    path = _source_queue_triage_lock_path()
    if not path.exists():
        return
    if not job:
        path.unlink(missing_ok=True)
        return
    try:
        current = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        path.unlink(missing_ok=True)
        return
    if str(current.get("pid", "")) == str(job.get("pid", "")):
        path.unlink(missing_ok=True)


def _format_app_job_lock(job: dict) -> str:
    kind = job.get("kind", "job")
    mode = job.get("mode", "")
    pid = job.get("pid", "unknown")
    started = job.get("started_at", "")
    label = f"{kind} {mode}".strip()
    return f"{label} is already running (PID {pid}, started {started})."


def _start_batch_run_job(
    *,
    batch_group: str,
    limit: int,
    priority: str = "",
    priority_mix: dict[str, int] | None = None,
    max_per_host: int = 0,
    execute: bool = False,
    run_enrich: bool = True,
    enrich_model: str = "",
    skip_preflight: bool = False,
) -> dict:
    """Start batch-run without blocking the Streamlit app."""
    mode = "live" if execute else "rehearsal"
    if execute:
        active = _read_app_job_lock()
        if active:
            raise RuntimeError(
                _format_app_job_lock(active)
                + " Wait for it to finish before starting another heavy model job."
            )
    safe_batch = re.sub(r"[^a-zA-Z0-9_.-]+", "-", batch_group).strip("-") or "batch"
    started = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_dir = _project_root / "exports" / "app_jobs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"{started}_{safe_batch}_{mode}_batch.log"
    command = _batch_run_command(
        batch_group=batch_group,
        limit=limit,
        priority=priority,
        priority_mix=priority_mix,
        max_per_host=max_per_host,
        execute=execute,
        run_enrich=run_enrich,
        enrich_model=enrich_model,
        skip_preflight=skip_preflight,
    )
    lease_fd = _acquire_model_job_lease() if execute else None
    try:
        with log_path.open("w", encoding="utf-8") as log_file:
            log_file.write(f"$ {shlex.join(command)}\n\n")
            log_file.flush()
            proc = subprocess.Popen(
                command,
                cwd=_project_root,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                text=True,
                pass_fds=(lease_fd,) if lease_fd is not None else (),
            )
        if lease_fd is not None:
            # The child inherited the lease; closing only the parent's copy
            # keeps the flock held until the model process exits.
            os.close(lease_fd)
            lease_fd = None
    except Exception:
        if lease_fd is not None:
            _release_model_job_lease(lease_fd)
        raise
    job = {
        "process": proc,
        "pid": proc.pid,
        "started_at": started,
        "log_path": str(log_path),
        "command": shlex.join(command),
        "kind": "batch",
        "mode": mode,
    }
    if execute:
        _write_app_job_lock(job)
    return job


def _job_log_tail(path: Path, limit: int = 2400) -> str:
    if not path.exists():
        return ""
    text = path.read_text(encoding="utf-8", errors="replace")
    return text[-limit:]


def _render_active_app_job_lock_panel(*, expanded: bool = False) -> bool:
    """Render the persisted app job lock when session_state lost the process.

    Streamlit reruns normally keep the Popen object in session_state, but browser
    reloads or server restarts can lose that object while the child process is
    still alive. The lock file is the recoverable source of truth.
    """
    active = _read_app_job_lock()
    if not active:
        return False
    with st.expander("Active background job / terminal log", expanded=expanded):
        st.warning(_format_app_job_lock(active))
        if active.get("command"):
            st.caption("Command")
            st.code(str(active["command"]), language="bash")
        log_path = Path(str(active.get("log_path") or ""))
        tail = _job_log_tail(log_path, limit=6000) if log_path else ""
        if tail:
            st.caption("Latest terminal output")
            st.code(tail, language="text")
        if log_path:
            st.caption(f"Log: `{log_path}`")
        st.caption(
            "This panel is recovered from the app job lock. If the PID no longer exists, "
            "the lock is cleared automatically on refresh."
        )
    return True


def _start_complement_enrichment_job(doc_id: str, key_prefix: str) -> dict:
    """Start merge-aware enrichment without blocking the Streamlit app."""
    active = _read_app_job_lock()
    if active:
        raise RuntimeError(
            _format_app_job_lock(active)
            + " Wait for it to finish before starting another heavy model job."
        )
    safe_prefix = re.sub(r"[^a-zA-Z0-9_.-]+", "-", key_prefix).strip("-") or "app"
    safe_doc_id = re.sub(r"[^a-zA-Z0-9_.-]+", "-", doc_id).strip("-") or "doc"
    started = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_dir = _project_root / "exports" / "app_jobs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"{started}_{safe_prefix}_{safe_doc_id}_enrich.log"
    command = _complement_enrichment_command(doc_id)
    lease_fd = _acquire_model_job_lease()
    try:
        with log_path.open("w", encoding="utf-8") as log_file:
            log_file.write(f"$ {shlex.join(command)}\n\n")
            log_file.flush()
            proc = subprocess.Popen(
                command, cwd=_project_root, stdout=log_file,
                stderr=subprocess.STDOUT, text=True, pass_fds=(lease_fd,),
            )
        os.close(lease_fd)
        lease_fd = None
    except Exception:
        if lease_fd is not None:
            _release_model_job_lease(lease_fd)
        raise
    job = {
        "process": proc,
        "pid": proc.pid,
        "started_at": started,
        "log_path": str(log_path),
        "command": shlex.join(command),
        "kind": "enrichment",
        "mode": "single",
    }
    _write_app_job_lock(job)
    return job


def _longform_review_command(
    doc_id: str,
    *,
    llm: str = "litelm-heavy",
    max_section_chars: int = 30000,
    section_limit: int = 0,
    no_overwrite: bool = False,
    retry_failed: bool = False,
) -> list[str]:
    command = [
        sys.executable,
        "-m",
        "runner",
        "longform-review",
        doc_id,
        "--llm",
        llm,
        "--max-section-chars",
        str(max_section_chars),
    ]
    if section_limit:
        command.extend(["--section-limit", str(section_limit)])
    if no_overwrite:
        command.append("--no-overwrite")
    if retry_failed:
        command.append("--retry-failed")
    return command


def _start_longform_review_job(
    doc_id: str,
    *,
    llm: str = "litelm-heavy",
    max_section_chars: int = 30000,
    section_limit: int = 0,
    no_overwrite: bool = False,
    retry_failed: bool = False,
) -> dict:
    """Start a deep longform review without blocking Streamlit."""
    active = _read_app_job_lock()
    if active:
        raise RuntimeError(
            _format_app_job_lock(active)
            + " Wait for it to finish before starting another heavy model job."
        )
    safe_doc_id = re.sub(r"[^a-zA-Z0-9_.-]+", "-", doc_id).strip("-") or "doc"
    started = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_dir = _project_root / "exports" / "app_jobs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"{started}_{safe_doc_id}_longform_review.log"
    command = _longform_review_command(
        doc_id,
        llm=llm,
        max_section_chars=max_section_chars,
        section_limit=section_limit,
        no_overwrite=no_overwrite,
        retry_failed=retry_failed,
    )
    lease_fd = _acquire_model_job_lease()
    try:
        with log_path.open("w", encoding="utf-8") as log_file:
            log_file.write(f"$ {shlex.join(command)}\n\n")
            log_file.flush()
            proc = subprocess.Popen(
                command, cwd=_project_root, stdout=log_file,
                stderr=subprocess.STDOUT, text=True, pass_fds=(lease_fd,),
            )
        os.close(lease_fd)
        lease_fd = None
    except Exception:
        if lease_fd is not None:
            _release_model_job_lease(lease_fd)
        raise
    job = {
        "process": proc,
        "pid": proc.pid,
        "started_at": started,
        "log_path": str(log_path),
        "command": shlex.join(command),
        "kind": "longform-review",
        "mode": llm,
    }
    _write_app_job_lock(job)
    return job


def _render_longform_review_job(job_key: str) -> bool:
    job = st.session_state.get(job_key)
    if not job:
        return False
    proc = job.get("process")
    returncode = proc.poll() if proc is not None else None
    log_path = Path(job.get("log_path", ""))

    if returncode is None:
        st.info(
            f"Longform review is running in the background "
            f"(PID {job.get('pid')}). You can keep using the app."
        )
        st.caption(
            "Completed sections are appended to `longform_section_analyses.jsonl` as they finish. "
            "Stopping now may lose only the section currently being reviewed."
        )
        c1, c2, c3 = st.columns([1, 1, 1])
        if c1.button("Refresh longform review status", key=f"{job_key}_refresh"):
            st.rerun()
        if c2.button("Stop now (keep completed sections)", key=f"{job_key}_stop_running"):
            message = _request_stop_app_job(job)
            _clear_app_job_lock(job)
            st.session_state.pop(job_key, None)
            st.warning(message)
            st.rerun()
        if c3.button("Forget this status card", key=f"{job_key}_forget_running"):
            st.session_state.pop(job_key, None)
            st.rerun()
        tail = _job_log_tail(log_path)
        if tail:
            with st.expander("Longform review log tail", expanded=False):
                st.code(tail, language="text")
        st.caption(f"Log: `{log_path}`")
        return True

    if returncode == 0:
        st.success(
            "Longform review finished. Refresh/reopen the document to inspect "
            "section analyses; a synthesis appears after all sections are reviewed."
        )
    else:
        st.error(f"Longform review exited with code {returncode}.")
    _clear_app_job_lock(job)
    tail = _job_log_tail(log_path)
    if tail:
        with st.expander("Longform review log tail", expanded=returncode != 0):
            st.code(tail, language="text")
    st.caption(f"Log: `{log_path}`")
    if st.button("Clear longform review status", key=f"{job_key}_clear_done"):
        st.session_state.pop(job_key, None)
        st.rerun()
    return False


def _render_complement_enrichment_job(job_key: str) -> bool:
    job = st.session_state.get(job_key)
    if not job:
        return False
    proc = job.get("process")
    returncode = proc.poll() if proc is not None else None
    log_path = Path(job.get("log_path", ""))

    if returncode is None:
        st.info(
            f"Complement enrichment is running in the background "
            f"(PID {job.get('pid')}). You can keep using the app."
        )
        c1, c2 = st.columns([1, 1])
        if c1.button("Refresh enrichment status", key=f"{job_key}_refresh"):
            st.rerun()
        if c2.button("Forget this status card", key=f"{job_key}_forget_running"):
            st.session_state.pop(job_key, None)
            st.rerun()
        tail = _job_log_tail(log_path)
        if tail:
            with st.expander("Enrichment log tail", expanded=False):
                st.code(tail, language="text")
        st.caption(f"Log: `{log_path}`")
        return True

    if returncode == 0:
        st.success("Complement enrichment finished. Refresh/reopen the document to review new merged proposals.")
    else:
        st.error(f"Complement enrichment exited with code {returncode}.")
    _clear_app_job_lock(job)
    tail = _job_log_tail(log_path)
    if tail:
        with st.expander("Enrichment log tail", expanded=returncode != 0):
            st.code(tail, language="text")
    st.caption(f"Log: `{log_path}`")
    if st.button("Clear enrichment status", key=f"{job_key}_clear_done"):
        st.session_state.pop(job_key, None)
        st.rerun()
    return False


def _render_batch_run_job(job_key: str) -> bool:
    job = st.session_state.get(job_key)
    if not job:
        return False
    proc = job.get("process")
    returncode = proc.poll() if proc is not None else None
    log_path = Path(job.get("log_path", ""))
    mode = job.get("mode", "batch")

    if returncode is None:
        if mode == "rehearsal":
            tail = _job_log_tail(log_path)
            if "Rehearsal only." in tail or "Report" in tail:
                returncode = 0
            else:
                st.info(
                    f"Batch rehearsal is checking eligibility in the background "
                    f"(PID {job.get('pid')}). Live run will unlock as soon as it finishes."
                )
                c1, c2 = st.columns([1, 1])
                if c1.button("Refresh batch status", key=f"{job_key}_refresh"):
                    st.rerun()
                if c2.button("Forget this status card", key=f"{job_key}_forget_running"):
                    st.session_state.pop(job_key, None)
                    st.rerun()
                if tail:
                    with st.expander("Batch log tail", expanded=False):
                        st.code(tail, language="text")
                st.caption(f"Log: `{log_path}`")
                return True

    if returncode is None:
        st.info(
            f"Batch {mode} is running in the background "
            f"(PID {job.get('pid')}). You can keep using the app."
        )
        c1, c2 = st.columns([1, 1])
        if c1.button("Refresh batch status", key=f"{job_key}_refresh"):
            st.rerun()
        if c2.button("Forget this status card", key=f"{job_key}_forget_running"):
            st.session_state.pop(job_key, None)
            st.rerun()
        tail = _job_log_tail(log_path)
        if tail:
            with st.expander("Batch log tail", expanded=False):
                st.code(tail, language="text")
        st.caption(f"Log: `{log_path}`")
        return True

    if returncode == 0:
        if mode == "rehearsal":
            st.success(
                "Rehearsal complete. This only checked eligibility; no documents were ingested. "
                "Use Start live batch to run the real ingest/enrichment pass."
            )
        else:
            st.success(
                "Batch finished. Check Document List/Review Inbox for new documents and proposals."
            )
    else:
        st.error(f"Batch exited with code {returncode}.")
    if mode == "live":
        _clear_app_job_lock(job)
    tail = _job_log_tail(log_path)
    if tail:
        with st.expander("Batch log tail", expanded=returncode != 0):
            st.code(tail, language="text")
    st.caption(f"Log: `{log_path}`")
    if st.button("Clear batch status", key=f"{job_key}_clear_done"):
        st.session_state.pop(job_key, None)
        st.rerun()
    return False


def _render_complement_enrichment_action(
    doc_id: str,
    *,
    key_prefix: str,
    feedback_to_doc_card: bool = False,
    show_caption: bool = True,
) -> None:
    """Render the merge-aware enrichment rerun action."""
    feedback_key = f"complement_enrichment_feedback_{key_prefix}_{doc_id}"
    job_key = f"complement_enrichment_job_{key_prefix}_{doc_id}"
    feedback = st.session_state.pop(feedback_key, None)
    if feedback:
        level = feedback.get("level", "info")
        message = feedback.get("message", "")
        if level == "success":
            st.success(message)
        elif level == "error":
            st.error(message)
        else:
            st.info(message)

    if show_caption:
        st.caption(
            "Runs enrichment again and merges new proposals into the existing "
            "`enrichment.json` without deleting reviewed proposals, IDs, notes, "
            "or push state."
        )
        st.caption(
            "This can take several minutes. The app now starts it as a background job "
            "so review work is not blocked."
        )

    job_active = _render_complement_enrichment_job(job_key)
    active_heavy_job = _read_app_job_lock()
    if active_heavy_job and str(active_heavy_job.get("pid", "")) != str(
        (st.session_state.get(job_key) or {}).get("pid", "")
    ):
        st.warning(
            _format_app_job_lock(active_heavy_job)
            + " Complement enrichment is locked until that job finishes."
        )
    command = shlex.join(_complement_enrichment_command(doc_id))
    with st.expander("Terminal command", expanded=False):
        st.code(command, language="bash")

    if st.button(
        "✨ Start background enrichment",
        key=f"complement_enrichment_{key_prefix}_{doc_id}",
        help=(
            "Starts merge-safe enrichment in the background. Existing reviewed proposals are preserved; "
            "new unique proposals are appended."
        ),
        disabled=job_active or bool(active_heavy_job),
    ):
        try:
            st.session_state[job_key] = _start_complement_enrichment_job(doc_id, key_prefix)
            if feedback_to_doc_card:
                _set_doc_action_feedback(
                    doc_id,
                    "info",
                    "Complement enrichment started in the background. Check the status card or log.",
                )
        except Exception as exc:
            st.session_state[feedback_key] = {
                "level": "error",
                "message": f"Could not start background enrichment: {exc}",
            }
        st.rerun()


def _render_longform_panel(doc_id: str, doc_dir: Path) -> None:
    status = _document_longform_status(doc_dir)
    review_status = _document_longform_review_status(doc_dir)
    if not status["candidate"] and not status["has_sidecars"]:
        return

    label = "📚 Longform book/report analysis"
    if status["has_sidecars"]:
        bits = []
        if status["page_count"]:
            bits.append(f"{status['page_count']} page(s)")
        if status["block_count"]:
            bits.append(f"{status['block_count']} block(s)")
        if status["warnings"]:
            bits.append(f"{len(status['warnings'])} warning(s)")
        if bits:
            label += " — " + " · ".join(bits)
    else:
        label += " — sidecars not built"

    with st.expander(label, expanded=bool(status["warnings"]) or not status["has_sidecars"]):
        st.caption(
            "Local-only derived sidecars for long PDFs/books/reports. This builds page maps, "
            "text blocks, bibliographic candidates, and extraction-quality warnings. It does "
            "not run analysis/enrichment, upload, or change reviewed proposals."
        )
        cmd = [sys.executable, "-m", "runner", "longform-build", doc_id]
        st.code(shlex.join(cmd), language="bash")

        if status["source_artifact_name"]:
            st.caption(f"Source artifact: `{status['source_artifact_name']}`")

        cols = st.columns(5)
        cols[0].metric("Pages", status["page_count"] or "—")
        cols[1].metric("Text blocks", status["block_count"] or "—")
        cols[2].metric("Characters", f"{status['char_count']:,}" if status["char_count"] else "—")
        cols[3].metric("Missing text pages", status["missing_text_page_count"])
        cols[4].metric("Warnings", len(status["warnings"]))

        if status["analysis_likely_partial"]:
            st.error(
                "Current `analysis.json` is likely partial or stale for this longform document. "
                + "; ".join(status["analysis_staleness_reasons"])
                + ". Treat the existing document summary as a short-source analysis until a longform synthesis pass is run."
            )
            st.caption(
                f"Current analysis input chars: `{status['analysis_input_char_count'] or status['preprocess_char_count'] or 0:,}` · "
                f"Longform extracted chars: `{status['char_count']:,}`"
            )

        if st.button(
            "Build / refresh longform sidecars",
            key=f"longform_build_{doc_id}",
            type="primary" if not status["has_sidecars"] else "secondary",
        ):
            try:
                from runner.pipeline import archive_summary, longform

                result = longform.build_longform_sidecars(doc_dir, overwrite=True)
                archive_summary.write_archive_summary(doc_dir, config=_load_config_safe())
                extraction = result.get("extraction", {})
                st.success(
                    "Longform sidecars refreshed: "
                    f"{extraction.get('page_count', 0)} page(s), "
                    f"{extraction.get('block_count', 0)} block(s), "
                    f"{extraction.get('char_count', 0):,} char(s)."
                )
            except Exception as exc:
                st.error(f"Longform build failed: {exc}")
            st.rerun()

        if not status["has_sidecars"]:
            st.info("No longform sidecars exist yet. Build them to inspect the book/report structure.")
            return

        st.divider()
        st.markdown("**Deep longform review**")
        st.caption(
            "Runs section-by-section model review and then writes a book/report synthesis sidecar. "
            "It does not overwrite `analysis.json`, enrichment proposals, embeddings, Sanity, or Supabase."
        )
        review_cols = st.columns(5)
        review_cols[0].metric("Sections", review_status["section_count"] or "—")
        review_cols[1].metric("Reviewed", review_status["sections_reviewed"])
        review_cols[2].metric("Failed", review_status["sections_failed"])
        review_cols[3].metric("Candidates", review_status["candidate_count"])
        review_cols[4].metric("Synthesis", review_status["synthesis_status"])
        if review_status.get("stale_section_rows"):
            st.warning(
                f"{review_status['stale_section_rows']} saved section-analysis row(s) do not match "
                "the current section plan. This usually happens when `Max chars / section` changed "
                "after some sections were reviewed. Resume with the original section size, or rebuild "
                "the review without keeping existing rows."
            )
        if review_status["candidate_count"]:
            family_bits = [
                f"{family}: {count}"
                for family, count in sorted(review_status["candidate_counts_by_family"].items())
                if count
            ]
            if family_bits:
                st.caption("Candidate register: " + " · ".join(family_bits))
            doc_candidates = _longform_candidate_rows_for_doc(doc_dir)
            if doc_candidates:
                with st.expander("Review candidates found in this longform document", expanded=True):
                    st.caption(
                        "These are model-proposed candidates from the section reviews. "
                        "Use Tag Registry → Longform review candidates to save them as local enrichment hints; "
                        "that still does not push anything to Sanity."
                    )
                    st.dataframe(
                        [
                            {
                                "family": row["family"],
                                "label": row["label"],
                                "count": row["count"],
                                "confidence": row["confidence"],
                                "actions": ", ".join(row.get("candidate_actions") or []),
                            }
                            for row in doc_candidates[:200]
                        ],
                        hide_index=True,
                        width="stretch",
                    )
                    nav_cols = st.columns([1, 3])
                    if nav_cols[0].button("Open Tag Registry", key=f"longform_candidates_open_tag_registry_{doc_id}"):
                        st.session_state["_nav_to"] = "Tag Registry"
                        st.rerun()

        if review_status["archive_abstract"]:
            st.markdown("**Longform archive abstract**")
            st.write(review_status["archive_abstract"])
            if review_status["coverage_statement"]:
                st.caption("Coverage: " + review_status["coverage_statement"])

        review_llm = st.selectbox(
            "Review model route",
            ["litelm-heavy", "litelm", "litelm-reasoning", "claude", "local-heavy"],
            index=0,
            key=f"longform_review_llm_{doc_id}",
            help="Use the heavy route for full books when available.",
        )
        if str(review_llm).startswith("litelm") and not _model_runtime_unload_configured(_load_config_safe()):
            st.warning(
                "This route uses Mac Studio LiteLLM, but the app does not see a configured model-unload path. "
                "For full books, that can leave Qwen/Gemma/embedding models resident and push the machine into swap. "
                "Use Mac Studio Worker/offload or configure `MAC_STUDIO_MODEL_CONTROL_URL` before large runs."
            )
        r1, r2, r3 = st.columns([1, 1, 1])
        max_section_chars = int(
            r1.number_input(
                "Max chars / section",
                min_value=5000,
                max_value=80000,
                value=30000,
                step=5000,
                key=f"longform_review_chars_{doc_id}",
            )
        )
        section_limit = int(
            r2.number_input(
                "Section limit",
                min_value=0,
                max_value=100,
                value=0,
                step=1,
                key=f"longform_review_limit_{doc_id}",
                help="0 means review all sections. Use 1-2 for a smoke test.",
            )
        )
        no_overwrite = r3.checkbox(
            "Keep existing section analyses",
            value=True,
            key=f"longform_review_no_overwrite_{doc_id}",
            help=(
                "Recommended for resume. Existing section rows are preserved and skipped. "
                "Unchecked means rebuild the section-analysis file from scratch."
            ),
        )
        review_cmd = _longform_review_command(
            doc_id,
            llm=review_llm,
            max_section_chars=max_section_chars,
            section_limit=section_limit,
            no_overwrite=no_overwrite,
        )
        st.code(shlex.join(review_cmd), language="bash")
        job_key = f"longform_review_job_{doc_id}"
        _render_longform_review_job(job_key)
        if st.button(
            "Start deep longform review",
            key=f"longform_review_start_{doc_id}",
            disabled=bool(_read_app_job_lock()),
        ):
            try:
                st.session_state[job_key] = _start_longform_review_job(
                    doc_id,
                    llm=review_llm,
                    max_section_chars=max_section_chars,
                    section_limit=section_limit,
                    no_overwrite=no_overwrite,
                )
                st.success("Longform review started in the background.")
            except Exception as exc:
                st.error(f"Could not start longform review: {exc}")
            st.rerun()

        retry_failed_cmd = _longform_review_command(
            doc_id,
            llm=review_llm,
            max_section_chars=max_section_chars,
            section_limit=section_limit,
            no_overwrite=True,
            retry_failed=True,
        )
        with st.expander("Retry failed section analyses", expanded=bool(review_status["sections_failed"])):
            st.caption(
                "Removes failed rows from the saved section-analysis file and reruns only those sections. "
                "Successful section analyses are kept. If Section limit is 0, all failed sections are retried; "
                "otherwise only that many failed sections are retried."
            )
            st.code(shlex.join(retry_failed_cmd), language="bash")
            if not review_status["sections_failed"]:
                st.info("No failed section rows match the current section plan.")
            if st.button(
                "Retry failed section(s)",
                key=f"longform_review_retry_failed_{doc_id}",
                disabled=bool(_read_app_job_lock()) or not bool(review_status["sections_failed"]),
            ):
                try:
                    st.session_state[job_key] = _start_longform_review_job(
                        doc_id,
                        llm=review_llm,
                        max_section_chars=max_section_chars,
                        section_limit=section_limit,
                        no_overwrite=True,
                        retry_failed=True,
                    )
                    st.success("Retry of failed longform section(s) started in the background.")
                except Exception as exc:
                    st.error(f"Could not start retry: {exc}")
                st.rerun()

        can_synthesize = (
            bool(review_status["section_count"])
            and review_status["sections_reviewed"] == review_status["section_count"]
            and review_status["sections_failed"] == 0
            and not review_status.get("stale_section_rows")
        )
        synthesis_cmd = _longform_review_command(
            doc_id,
            llm=review_llm,
            max_section_chars=max_section_chars,
            section_limit=0,
            no_overwrite=True,
        )
        with st.expander("Final synthesis from saved section analyses", expanded=can_synthesize and not review_status["has_synthesis"]):
            st.caption(
                "Runs the whole-book/report synthesis from the saved `longform_section_analyses.jsonl`. "
                "It keeps existing section analyses and does not rerun successful sections."
            )
            st.code(shlex.join(synthesis_cmd), language="bash")
            if not can_synthesize:
                st.warning(
                    "Final synthesis needs every section to have a successful saved analysis. "
                    "Current status: "
                    f"{review_status['sections_reviewed']}/{review_status['section_count'] or 0} succeeded, "
                    f"{review_status['sections_failed']} failed."
                )
                if review_status["sections_failed"]:
                    st.caption(
                        "Current resume mode skips failed rows too. A later retry-failed workflow should handle those "
                        "without rebuilding the whole book."
                    )
            if st.button(
                "Build / refresh final synthesis",
                key=f"longform_review_synthesis_{doc_id}",
                disabled=bool(_read_app_job_lock()) or not can_synthesize,
            ):
                try:
                    st.session_state[job_key] = _start_longform_review_job(
                        doc_id,
                        llm=review_llm,
                        max_section_chars=max_section_chars,
                        section_limit=0,
                        no_overwrite=True,
                    )
                    st.success("Final longform synthesis started in the background.")
                except Exception as exc:
                    st.error(f"Could not start final synthesis: {exc}")
                st.rerun()

        title_line = status["title"] or "—"
        if status["title_source"] or status["title_review_state"]:
            title_line += f"  ·  `{status['title_source'] or 'unknown source'}` / `{status['title_review_state'] or 'unknown review state'}`"
        st.markdown(f"**Title candidate:** {title_line}")
        if status["creators"]:
            st.markdown("**Creator candidates:** " + ", ".join(status["creators"]))
        if status["isbns"]:
            st.markdown("**ISBN candidates:** " + ", ".join(f"`{isbn}`" for isbn in status["isbns"]))
        if status["item_type"] or status["representation_type"] or status["extraction_method"]:
            st.caption(
                f"Item type: `{status['item_type'] or 'unknown'}` · "
                f"Representation: `{status['representation_type'] or 'unknown'}` · "
                f"Extractor: `{status['extraction_method'] or 'unknown'}`"
            )

        if status["warnings"]:
            st.warning("Longform quality warnings: " + "; ".join(status["warnings"]))
        if status["next_actions"]:
            st.info("Next actions: " + "; ".join(status["next_actions"]))

        if status["first_blocks"]:
            st.markdown("**First extracted text blocks / metadata candidates**")
            rows = []
            for block in status["first_blocks"][:12]:
                if not isinstance(block, dict):
                    continue
                rows.append({
                    "page": block.get("page_label") or (
                        str(int(block.get("page_index")) + 1)
                        if isinstance(block.get("page_index"), int)
                        else ""
                    ),
                    "block_id": block.get("block_id", ""),
                    "text": str(block.get("text") or "")[:300],
                })
            if rows:
                st.dataframe(rows, hide_index=True, width="stretch")

        with st.expander("Longform sidecar files", expanded=False):
            for name, path in status["paths"].items():
                p = Path(path)
                present = "present" if p.exists() else "missing"
                st.caption(f"`{name}`: `{present}` — {path}")


def _render_review_overrides(doc_id: str, doc_dir: Path) -> None:
    """Researcher review overrides for an already-imported corpus document.

    Three safe, local-only review actions (no Sanity/Supabase writes, no model
    re-run): clear a false-positive testimony gate, record a completed legal
    review, and mark a low-confidence analysis as reviewed. Each requires an
    explicit confirmation checkbox and a researcher note. Logic lives in the
    pure ``runner.app_review_overrides`` module; this only renders it.
    """
    analysis = _read_json_file(doc_dir / "analysis.json", {})
    if not isinstance(analysis, dict):
        analysis = {}

    show_testimony = testimony_override_available(analysis)
    show_legal = legal_review_available(analysis)
    show_review = analysis_review_marker_available(analysis)
    if not (show_testimony or show_legal or show_review):
        return

    with st.expander("🛠 Researcher review overrides", expanded=False):
        st.caption(
            "Local-only researcher decisions. These never write to Sanity or "
            "Supabase, never change tactic/practice/harm tags, and never re-run "
            "the model. Each action is recorded with your note for provenance."
        )

        # ── 1. Clear testimony gate (false-positive correction) ────────────
        if show_testimony:
            st.markdown("**Not testimony / clear testimony gate**")
            if testimony_gate_cleared(doc_dir):
                st.success(
                    "Testimony gate already cleared "
                    "(`_manual_overrides.testimony_flag = researcher_confirmed_false`)."
                )
            else:
                st.caption(
                    "Use only when the testimony flag is a false positive. Sets "
                    "`testimony_flag=false` and removes "
                    "`Flag: Testimony-Extraction-Required`. A typed *Testimony* / "
                    "*Survivor-Network-Material* document still trips the type-based "
                    "consent gate — this does not reclassify the document."
                )
                t_note = st.text_area(
                    "Researcher note (why this is not testimony)",
                    key=f"ro_testimony_note_{doc_id}",
                    height=80,
                )
                t_confirm = st.checkbox(
                    "I confirm this document is not testimony and the consent gate "
                    "should be cleared.",
                    key=f"ro_testimony_confirm_{doc_id}",
                )
                if st.button(
                    "Clear testimony gate",
                    key=f"ro_testimony_btn_{doc_id}",
                    disabled=not (t_confirm and t_note.strip()),
                ):
                    result = clear_testimony_gate(doc_dir, note=t_note)
                    if result["ok"] and result["changed"]:
                        st.success(
                            "Testimony gate cleared. "
                            f"Removed {len(result['removed_flags'])} flag(s); "
                            "warning appended to analysis provenance."
                        )
                    elif result["ok"]:
                        st.info("No change — testimony gate was already cleared.")
                    else:
                        st.error(f"Could not clear gate: {result['reason']}.")
                    st.rerun()
            st.divider()

        # ── 2. Legal review completed ──────────────────────────────────────
        if show_legal:
            st.markdown("**Legal review completed**")
            existing_legal = legal_review_record(doc_dir)
            if existing_legal.get("reviewed"):
                st.success(
                    "Legal review recorded "
                    f"({str(existing_legal.get('reviewed_at') or '')[:19]} by "
                    f"{existing_legal.get('reviewed_by', 'researcher')})."
                )
                if existing_legal.get("notes"):
                    st.caption(f"Note: {existing_legal['notes']}")
            st.caption(
                "Records that a human checked the legal accuracy of this "
                "legal-sensitive document. Does not change the model classification."
            )
            l_note = st.text_area(
                "Legal review note",
                key=f"ro_legal_note_{doc_id}",
                height=80,
            )
            l_confirm = st.checkbox(
                "I confirm I completed a legal-accuracy review of this document.",
                key=f"ro_legal_confirm_{doc_id}",
            )
            if st.button(
                "Save legal review",
                key=f"ro_legal_btn_{doc_id}",
                disabled=not (l_confirm and l_note.strip()),
            ):
                result = mark_legal_review_complete(doc_dir, note=l_note)
                if result["ok"]:
                    st.success("Legal review saved to legal_review.json.")
                else:
                    st.error(f"Could not save: {result['reason']}.")
                st.rerun()
            st.divider()

        # ── 3. Analysis reviewed (low-confidence / needs_review) ───────────
        if show_review:
            st.markdown("**Analysis reviewed**")
            existing_review = analysis_review_record(doc_dir)
            if existing_review.get("analysis_reviewed"):
                st.success(
                    "Analysis marked reviewed "
                    f"({str(existing_review.get('reviewed_at') or '')[:19]} by "
                    f"{existing_review.get('reviewed_by', 'researcher')})."
                )
                if existing_review.get("notes"):
                    st.caption(f"Note: {existing_review['notes']}")
            st.caption(
                "For low-confidence / needs-review documents. Records your human "
                "review without altering the model's confidence or `needs_review` "
                "flag — the validator is left untouched."
            )
            r_note = st.text_area(
                "Review note",
                key=f"ro_review_note_{doc_id}",
                height=80,
            )
            r_confirm = st.checkbox(
                "I confirm I reviewed this analysis.",
                key=f"ro_review_confirm_{doc_id}",
            )
            if st.button(
                "Mark analysis reviewed",
                key=f"ro_review_btn_{doc_id}",
                disabled=not (r_confirm and r_note.strip()),
            ):
                result = mark_analysis_reviewed(doc_dir, note=r_note)
                if result["ok"]:
                    st.success("Saved to review_status.json.")
                else:
                    st.error(f"Could not save: {result['reason']}.")
                st.rerun()


def _render_doc_card(doc: dict, corpus_dir: Path, *, force_expanded: bool = False):
    conf = doc["confidence"]
    conf_color = "🟢" if conf >= 0.85 else "🟡" if conf >= 0.70 else "🔴"
    upload_badge = "☁️ Sanity" if doc["uploaded"] else "💾 Local"
    embedding_badge = _doc_embedding_badge(doc)
    enrich_badge = " ✨ Enriched" if doc["has_enrichment"] else ""
    media_badge = " · Media" if doc.get("is_media") else ""
    annotation_count = len(doc.get("annotation_profiles") or [])
    reviewed_count = len(doc.get("reviewed_annotation_profiles") or [])
    annotation_badge = f" · Annotations {annotation_count}"
    if annotation_count:
        annotation_badge += f" ({reviewed_count} reviewed)"
    second_opinion_badge = ""
    if doc.get("pending_second_opinion_count"):
        second_opinion_badge = f" · Second opinions {doc['pending_second_opinion_count']} pending"
    workflow_badges = _doc_workflow_badge_text(doc)
    workflow_badge_text = f" · {workflow_badges}" if workflow_badges else ""

    header = (
        f"{conf_color} **{doc['doc_id']}** — {doc['type']} | {doc['format']} | "
        f"{upload_badge}{embedding_badge}{enrich_badge}{media_badge}{annotation_badge}"
        f"{second_opinion_badge}{workflow_badge_text}"
    )

    _selected_from_inbox = st.session_state.get("doc_list_open_doc_id") == doc["doc_id"]

    with st.expander(header, expanded=force_expanded or _selected_from_inbox):
        _render_doc_action_feedback(doc["doc_id"])
        if _has_high_harm(doc.get("harm", [])):
            high_harm_labels = sorted(_HIGH_HARM_INDICATORS.intersection(doc["harm"]))
            st.warning(
                f"**High-harm content:** {', '.join(high_harm_labels)}. "
                "Handle with care — follow your safeguarding protocol before reviewing or uploading."
            )
        if doc.get("pending_second_opinion_count"):
            generated = str(doc.get("latest_pending_second_opinion_at") or "")[:19] or "unknown date"
            st.warning(
                f"{doc['pending_second_opinion_count']} second-opinion comparison(s) are still pending a researcher decision. "
                f"Latest generated: {generated}. Resolve them in the second-opinion review panel before treating this analysis as settled."
            )
        if doc.get("needs_action_labels"):
            st.info("Workflow: " + " · ".join(doc["needs_action_labels"][:6]))
        col1, col2 = st.columns([2, 1])
        with col1:
            if doc["summary"]:
                st.markdown(doc["summary"])
            if doc["source"]:
                st.caption(f"Source: {doc['source']}")
        with col2:
            st.metric("Confidence", f"{conf:.2f} ({doc['conf_status']})")
            date_rows = [
                f"Source-offload imported: {str(doc.get('offload_imported_at') or '—')[:19]}",
                f"Offload package: {doc.get('offload_package_id') or '—'}",
                f"Source published: {doc.get('source_publication_date') or '—'}",
                f"Document date: {doc.get('document_date_text') or '—'}",
                f"Analysed/saved: {str(doc.get('analysis_saved_at') or '—')[:19]}",
                f"Uploaded: {str(doc.get('uploaded_at') or '—')[:19]}",
                f"Latest annotation: {str(doc.get('latest_annotation_at') or '—')[:19]}",
            ]
            st.caption("  \n".join(date_rows))
            if doc["country"]:
                st.write("**Countries:**", ", ".join(doc["country"]))
            if doc["tactic"]:
                st.write("**Tactics:**", ", ".join(doc["tactic"][:4]))
            ri = doc.get("rhetorical_intensity", "—")
            fb = doc.get("framing_balance", "—")
            st.write(f"**Intensity:** {ri}  |  **Framing:** {fb}")
            st.write(
                f"**Candidate terms:** {doc['candidate_terms']}  |  "
                f"**Actors:** {doc['suggested_actors']}"
            )
            if doc.get("annotation_profiles"):
                reviewed = ", ".join(doc.get("reviewed_annotation_profiles") or []) or "none reviewed"
                st.write(
                    f"**Annotations:** {', '.join(doc['annotation_profiles'])}  "
                    f"(**Reviewed:** {reviewed})"
                )
            if not doc.get("embedding_ok"):
                st.warning(f"Local embedding is missing or empty: {doc.get('embedding_detail')}")
            elif doc.get("supabase_ok") is False:
                st.warning(f"No Supabase embedding row found: {doc.get('supabase_detail')}")
            elif doc.get("supabase_ok") is None:
                st.info(
                    "Supabase row was not checked in this view. Turn on "
                    "`Check Supabase rows while loading` if you need live row status."
                )

        # Show enrichment summary if available
        enrich_path = corpus_dir / doc["doc_id"] / "enrichment.json"
        if enrich_path.exists():
            with st.container():
                try:
                    er = json.loads(enrich_path.read_text())
                    st.divider()
                    ec1, ec2, ec3, ec4, ec5 = st.columns(5)
                    ec1.metric("Lexicon proposals", len(er.get("lexicon_proposals", [])))
                    ec2.metric("Entity proposals",  len(er.get("entity_proposals", [])))
                    ec3.metric("Tactic proposals", len(er.get("tactic_proposals", [])))
                    ec4.metric("Practice descriptions", len(er.get("practice_descriptions", [])))
                    ec5.metric("Claims", len(er.get("statistical_claims", [])))
                    nav_cols = st.columns(2)
                    if nav_cols[0].button("Review in Lexicon", key=f"nav_lexicon_{doc['doc_id']}"):
                        st.session_state["_nav_to"] = "Lexicon"
                        st.rerun()
                    if nav_cols[1].button("Review in Tag Registry", key=f"nav_tags_{doc['doc_id']}"):
                        st.session_state["_nav_to"] = "Tag Registry"
                        st.rerun()
                except Exception:
                    pass
            _render_document_enrichment_proposals(doc["doc_id"], enrich_path)

        _render_document_analysis_tags(doc["doc_id"], corpus_dir / doc["doc_id"])

        # Raw JSON toggle
        if st.toggle("Show raw analysis JSON", key=f"raw_{doc['doc_id']}"):
            analysis_path = corpus_dir / doc["doc_id"] / "analysis.json"
            if analysis_path.exists():
                st.json(json.loads(analysis_path.read_text()))

        with st.expander("Edit dates and publication metadata", expanded=not doc.get("publication_date")):
            _render_document_date_editor(doc["doc_id"], corpus_dir / doc["doc_id"], _load_config_safe())

        src = _collect_metadata_sources(corpus_dir / doc["doc_id"])
        needs_recon = not src["title"]["preprocess"] or not src["language"]["preprocess"]
        with st.expander("Metadata sources / reconciliation", expanded=needs_recon):
            _render_metadata_reconciliation(doc["doc_id"], corpus_dir / doc["doc_id"], _load_config_safe())

        _render_longform_panel(doc["doc_id"], corpus_dir / doc["doc_id"])

        # Readiness / Next Actions + provenance (date, languages, entity IDs, …)
        _prov_cfg = _load_config_safe()
        _readiness = build_document_readiness(
            corpus_dir / doc["doc_id"], config=_prov_cfg
        )
        if _readiness.status == STATUS_NEEDS_REVIEW:
            _prov_label = (
                f"🔴 Readiness: Needs review before push "
                f"— {len(_readiness.blockers)} blocker(s)"
            )
        elif _readiness.status == STATUS_QUALITY:
            _prov_label = (
                f"🟡 Readiness: Review / quality actions "
                f"— {len(_readiness.quality)} item(s)"
            )
        elif _readiness.status == STATUS_READY:
            _prov_label = "🟢 Readiness: Ready to push"
        else:
            _prov_label = "⚪ Readiness: No analysis yet"
        # Auto-expand only when blockers exist — keep ready/quality calm.
        _prov_auto_expand = _readiness.status == STATUS_NEEDS_REVIEW or _selected_from_inbox
        with st.expander(_prov_label, expanded=_prov_auto_expand):
            _render_provenance_panel(
                doc["doc_id"], corpus_dir / doc["doc_id"], _prov_cfg
            )

        _render_review_overrides(doc["doc_id"], corpus_dir / doc["doc_id"])

        # ── Actions ───────────────────────────────────────────────────────
        st.divider()
        act_cols = st.columns([1, 2, 1])

        with act_cols[0]:
            if doc.get("is_media"):
                if st.button("Open in Media Review", key=f"open_mr_{doc['doc_id']}"):
                    st.session_state["mr_doc_id"] = doc["doc_id"]
                    st.session_state["_nav_to"] = "Media Review"
                    st.rerun()
            if not doc["uploaded"]:
                upload_label = (
                    "⬆ Upload privately to Sanity (unverified)"
                    if doc.get("testimony_review_pending")
                    else "⬆ Upload to Sanity"
                )
                if doc.get("testimony_upload_blocked"):
                    upload_label = "Upload blocked — testimony consent refused/withdrawn"
                if st.button(
                    upload_label,
                    key=f"upload_{doc['doc_id']}",
                    type="primary",
                    disabled=bool(doc.get("testimony_upload_blocked")),
                ):
                    with st.spinner("Uploading…"):
                        r = __import__("subprocess").run(
                            [sys.executable, "-m", "runner", "upload-doc", doc["doc_id"]],
                            capture_output=True, text=True, cwd=_project_root,
                        )
                    if r.returncode == 0:
                        if doc.get("embedding_ok"):
                            st.success("Uploaded.")
                        else:
                            st.warning("Uploaded to Sanity, but embedding is missing/empty. Generate and push embedding before considering it complete.")
                    else:
                        st.error(r.stderr[-600:] or r.stdout[-600:])
                    st.rerun()
            else:
                st.caption("☁️ Uploaded to Sanity")

        embedding_ok  = doc.get("embedding_ok", False)
        supabase_ok   = doc.get("supabase_ok", False)
        uploaded      = doc.get("uploaded", False)

        if not embedding_ok:
            # No local embedding vector — full regenerate + push
            if st.button("Generate + push embedding", key=f"doc_emb_{doc['doc_id']}"):
                ok, message = _generate_and_push_embedding(doc["doc_id"], corpus_dir, _load_config_safe())
                if ok:
                    st.success(message)
                else:
                    st.error(message)
                st.rerun()
        elif uploaded and supabase_ok is not True:
            # Embedding exists locally + Sanity record written; Supabase is missing or not checked.
            supabase_button_label = (
                "Push embedding to Supabase"
                if supabase_ok is False
                else "Push/refresh embedding in Supabase"
            )
            if st.button(
                supabase_button_label,
                key=f"push_supa_{doc['doc_id']}",
                help="Embedding exists locally. Re-runs upload-doc so Sanity/Supabase metadata are refreshed.",
            ):
                with st.spinner("Pushing to Supabase…"):
                    r = __import__("subprocess").run(
                        [sys.executable, "-m", "runner", "upload-doc", doc["doc_id"]],
                        capture_output=True, text=True, cwd=_project_root,
                    )
                if r.returncode == 0:
                    st.success("Pushed. Supabase row created.")
                else:
                    st.error(r.stderr[-400:] or r.stdout[-400:])
                st.rerun()

        with act_cols[1]:
            llm_opts = ["litelm", "litelm-heavy", "litelm-reasoning", "claude", "local"]
            ra_llm = st.selectbox("Model", llm_opts, key=f"ra_llm_{doc['doc_id']}", label_visibility="collapsed")
            if st.button("🔄 Reanalyze", key=f"reanalyze_{doc['doc_id']}"):
                with st.spinner(f"Re-running analysis with {ra_llm}…"):
                    r = __import__("subprocess").run(
                        [sys.executable, "-m", "runner", "reanalyze", doc["doc_id"],
                         "--llm", ra_llm, "--yes"],
                        capture_output=True, text=True, cwd=_project_root,
                    )
                if r.returncode == 0:
                    _set_doc_action_feedback(
                        doc["doc_id"],
                        "success",
                        "Analysis updated. Reopen this document to review the new analysis and provenance warnings.",
                    )
                else:
                    _set_doc_action_feedback(
                        doc["doc_id"],
                        "error",
                        "Reanalysis failed:\n\n" + (r.stderr[-1200:] or r.stdout[-1200:] or "(no output)"),
                    )
                st.rerun()

        with act_cols[2]:
            _render_complement_enrichment_action(
                doc["doc_id"],
                key_prefix="doc_card",
                feedback_to_doc_card=True,
                show_caption=False,
            )


def _render_entity_resolver(doc_dir: Path, proposal_name: str, config) -> None:
    """Render the entity ID resolver widget for one entity proposal.

    Shows exact Sanity matches (safe to auto-fill) and candidates
    (researcher must confirm). Writes back to local ``enrichment.json`` only —
    no Sanity mutations.
    """
    from runner.app_entity_resolver import match_entity_name, fill_entity_id_in_enrichment

    doc_id = doc_dir.name
    # Stable session-state keys scoped to this doc + entity
    _key = lambda suffix: f"eresolve_{doc_id}_{proposal_name}_{suffix}"

    st.markdown(f"**{proposal_name}** — `existing_entity_id` missing")

    btn_col, manual_col, use_col = st.columns([2, 4, 1])

    with btn_col:
        if st.button("🔍 Find in Sanity", key=_key("find")):
            if config:
                try:
                    from runner.pipeline.sanity_reads import fetch_entities_for_resolver
                    entities = fetch_entities_for_resolver(config)
                    matches  = match_entity_name(proposal_name, entities)
                    st.session_state[_key("results")] = matches
                except Exception as exc:
                    st.session_state[_key("results")] = f"__error__{exc}"
            else:
                st.session_state[_key("results")] = "__error__config unavailable"

    manual_id = manual_col.text_input(
        "Paste Sanity ID manually",
        placeholder="organization-segm",
        key=_key("manual"),
        label_visibility="collapsed",
    )
    with use_col:
        if st.button("✓ Use", key=_key("use_manual"), help="Apply the pasted Sanity ID"):
            sid = manual_id.strip()
            if sid:
                if fill_entity_id_in_enrichment(doc_dir, proposal_name, sid):
                    st.success(f"Filled `{sid}`")
                    st.rerun()
                else:
                    st.error("Could not update enrichment.json")
            else:
                st.warning("Paste a Sanity _id first.")

    # ── Show lookup results ────────────────────────────────────────────────
    results = st.session_state.get(_key("results"))
    if results is None:
        st.caption("Click **Find in Sanity** to search the registry, or paste an ID above.")
        return

    if isinstance(results, str) and results.startswith("__error__"):
        st.error(f"Lookup failed: {results[9:]}")
        return

    if not results:
        st.caption("No matches found in Sanity registry.")
        return

    exact_matches = [m for m in results if m.confidence == "exact"]
    candidates    = [m for m in results if m.confidence == "candidate"]

    if exact_matches:
        st.caption("✅ Exact matches — safe to use:")
        for m in exact_matches:
            ec1, ec2 = st.columns([4, 1])
            ec1.code(f"{m.sanity_id}  ({m.sanity_type}) — {m.name}", language="text")
            with ec2:
                if st.button("Use", key=_key(f"use_e_{m.sanity_id}"),
                             help="Fill existing_entity_id with this ID"):
                    if fill_entity_id_in_enrichment(doc_dir, proposal_name, m.sanity_id):
                        st.success(f"Filled `{m.sanity_id}`")
                        st.rerun()
                    else:
                        st.error("Could not update enrichment.json")

    if candidates:
        with st.expander(
            f"🟡 Candidates ({len(candidates)}) — review before using", expanded=False
        ):
            st.caption(
                "These are partial/contains matches. Verify the Sanity record before applying."
            )
            for m in candidates:
                cc1, cc2 = st.columns([4, 1])
                cc1.caption(f"`{m.sanity_id}` ({m.sanity_type}) — {m.name}")
                with cc2:
                    if st.button("Use", key=_key(f"use_c_{m.sanity_id}"),
                                 help="Fill existing_entity_id with this candidate ID"):
                        if fill_entity_id_in_enrichment(doc_dir, proposal_name, m.sanity_id):
                            st.success(f"Filled `{m.sanity_id}`")
                            st.rerun()
                        else:
                            st.error("Could not update enrichment.json")


_READINESS_STATUS_BADGE = {
    STATUS_NEEDS_REVIEW: "🔴 Needs review before push",
    STATUS_QUALITY:      "🟡 Review / quality actions remain",
    STATUS_READY:        "🟢 Ready to push",
    STATUS_NO_DATA:      "⚪ No analysis yet",
}


def _render_readiness_item(item, doc_dir: Path, config) -> None:
    """Render one ReadinessItem: title, detail, where-to-fix, optional widget."""
    st.markdown(f"**{item.title}**")
    if item.detail:
        st.caption(item.detail)
    if item.where_to_fix:
        st.caption(f"*Where to fix: {item.where_to_fix}*")

    # Attach the matching repair affordance so the fix lives next to the warning.
    if item.handler == "entity_resolver":
        enrichment_data = _read_json_file(doc_dir / "enrichment.json", {})
        missing_entities = [
            (p.get("name") or "?")
            for p in (enrichment_data.get("entity_proposals") or [])
            if p.get("action") == "enrich_existing"
            and not p.get("existing_entity_id")
        ]
        if missing_entities:
            st.caption("Resolve entity IDs (writes locally only — no Sanity changes):")
            for entity_name in missing_entities:
                with st.container():
                    _render_entity_resolver(doc_dir, entity_name, config)
                st.markdown("---")
    elif item.handler == "complement_enrichment":
        _render_complement_enrichment_action(
            doc_dir.name,
            key_prefix="readiness",
            feedback_to_doc_card=False,
            show_caption=False,
        )


def _render_readiness_summary(doc_id: str, doc_dir: Path, config) -> None:
    """Render the unified Readiness / Next Actions summary for one document.

    Three calm, text-labelled buckets (no colour-only meaning):
        "Needs review before push" — blockers
        "Review / quality actions remain" — non-blocking review/push work
        "Provenance notes" — informational
    """
    readiness = build_document_readiness(doc_dir, config=config)

    st.markdown(f"**Readiness: {_READINESS_STATUS_BADGE.get(readiness.status, readiness.status_label)}**")
    st.caption(readiness.status_explanation)

    if readiness.blockers:
        st.markdown("#### Needs review before push")
        st.caption("Resolve these before running `push-enrichment`.")
        for item in readiness.blockers:
            _render_readiness_item(item, doc_dir, config)

    if readiness.quality:
        st.markdown("#### Review / quality actions")
        st.caption("No hard blockers, but these items still need review, push, or quality attention.")
        for item in readiness.quality:
            _render_readiness_item(item, doc_dir, config)

    if readiness.notes:
        with st.expander("ℹ️ Provenance notes — informational, no action needed", expanded=False):
            for item in readiness.notes:
                st.markdown(f"**{item.title}**")
                if item.detail:
                    st.caption(item.detail)
                if item.where_to_fix:
                    st.caption(f"*{item.where_to_fix}*")

    if readiness.status == STATUS_READY and not readiness.notes:
        st.success("✓ No blockers, pending review, or quality gaps found.")


def _render_provenance_panel(doc_id: str, doc_dir: Path, config) -> None:
    """Render Readiness summary + provenance/audit sub-tabs."""
    _render_readiness_summary(doc_id, doc_dir, config)
    st.divider()

    # ── Sub-tabs ──────────────────────────────────────────────────────────
    tabs = st.tabs(["Analysis Audit", "Enrichment Audit", "Preservation", "Artifacts"])

    # ── Analysis Audit ────────────────────────────────────────────────────
    with tabs[0]:
        st.caption(
            "Proves which model, prompt, and git commit produced `analysis.json`. "
            "Use hashes to verify reproducibility or cite provenance in methodology."
        )
        audit = _load_analysis_audit(doc_dir)
        if not audit:
            st.info("No `analysis_audit.json` found for this document.")
        else:
            m1, m2, m3 = st.columns(3)
            m1.metric("Model", audit.get("model") or "?")
            m2.metric("LLM flag", audit.get("llm_flag") or "?")
            dur = audit.get("duration_ms")
            m3.metric("Duration", f"{int(dur / 1000)}s" if dur else "?")

            h1, h2 = st.columns(2)
            ph  = audit.get("prompt_sha256") or ""
            pth = audit.get("prompt_template_sha256") or ""
            h1.code(ph[:16]  + "…" if len(ph)  >= 16 else ph,  language="text")
            h1.caption("prompt_sha256 (truncated)")
            h2.code(pth[:16] + "…" if len(pth) >= 16 else pth, language="text")
            h2.caption("prompt_template_sha256 (truncated)")

            r1, r2, r3 = st.columns(3)
            gc = (audit.get("git_commit") or "")[:12]
            r1.write(f"**Git commit:** `{gc}{'…' if gc else ''}`")
            r2.write(f"**Validation:** `{audit.get('validation_path') or '—'}`")
            derived = audit.get("score_derived_from_status")
            r3.write(f"**Score derived:** {'⚠️ Yes' if derived else '✓ No'}")

            st.caption(
                f"Schema v{audit.get('schema_version', '?')} · "
                f"Prompt: {audit.get('prompt_version', '?')} · "
                f"Ontology: {audit.get('ontology_version', '?')}"
            )

            with st.expander("Full hashes & git commit", expanded=False):
                if ph:
                    st.code(ph, language="text")
                    st.caption("prompt_sha256 (full — copy for citation)")
                if pth:
                    st.code(pth, language="text")
                    st.caption("prompt_template_sha256 (full)")
                gc_full = audit.get("git_commit") or ""
                if gc_full:
                    st.code(gc_full, language="text")
                    st.caption("git_commit (full)")
                if not (ph or pth or gc_full):
                    st.caption("No hash/commit data in this audit file.")

            nw = audit.get("normalisation_warnings") or []
            if nw:
                with st.expander(f"Normalisation warnings ({len(nw)})"):
                    for w in nw:
                        st.caption(f"• {w}")

    # ── Enrichment Audit ──────────────────────────────────────────────────
    with tabs[1]:
        st.caption(
            "Proves which model, prompt, and git commit produced `enrichment.json`. "
            "Chunked flag indicates the document exceeded the enrichment context window."
        )
        # ── Proposal status summary ──────────────────────────────────────
        _enrich_data = _read_json_file(doc_dir / "enrichment.json", {})
        if _enrich_data:
            _all_props = []
            for _fkey in (
                "lexicon_proposals", "entity_proposals", "tactic_proposals",
                "practice_descriptions", "statistical_claims",
            ):
                _all_props.extend(
                    item for item in (_enrich_data.get(_fkey) or [])
                    if isinstance(item, dict)
                )
            if _all_props:
                _pcounts = _proposal_state_counts(_all_props)
                _ps1, _ps2, _ps3, _ps4 = st.columns(4)
                _ps1.metric("Pending", _pcounts.get("pending review", 0))
                _ps2.metric("Approved", _pcounts.get("approved locally", 0))
                _ps3.metric("Pushed to Sanity", _pcounts.get("pushed to Sanity", 0))
                _ps4.metric("Rejected", _pcounts.get("rejected", 0))
        _render_complement_enrichment_action(
            doc_id,
            key_prefix="provenance_enrichment",
        )
        st.divider()
        eaudit = _load_enrichment_audit(doc_dir)
        if not eaudit:
            st.info("No `enrichment_audit.json` found for this document.")
        else:
            m1, m2, m3 = st.columns(3)
            m1.metric("Model", eaudit.get("model") or "?")
            dur = eaudit.get("duration_ms")
            m2.metric("Duration", f"{int(dur / 1000)}s" if dur else "?")
            m3.metric("Chunked", "Yes" if eaudit.get("chunked") else "No")

            h1, h2 = st.columns(2)
            ph = eaudit.get("prompt_sha256") or ""
            gc = eaudit.get("git_commit") or ""
            h1.code(ph[:16] + "…" if len(ph) >= 16 else ph, language="text")
            h1.caption("prompt_sha256 (truncated)")
            h2.code(gc[:12] + "…" if len(gc) >= 12 else gc, language="text")
            h2.caption("git_commit (truncated)")

            with st.expander("Full hashes & git commit", expanded=False):
                if ph:
                    st.code(ph, language="text")
                    st.caption("prompt_sha256 (full — copy for citation)")
                pth_e = eaudit.get("prompt_template_sha256") or ""
                if pth_e:
                    st.code(pth_e, language="text")
                    st.caption("prompt_template_sha256 (full)")
                if gc:
                    st.code(gc, language="text")
                    st.caption("git_commit (full)")
                if not (ph or pth_e or gc):
                    st.caption("No hash/commit data in this audit file.")

            if eaudit.get("corpus_connections_suppressed"):
                st.info(
                    "Corpus connections suppressed — "
                    f"`{eaudit.get('corpus_connections_suppression_reason') or '?'}`"
                )
            repairs = eaudit.get("normalization_repairs") or 0
            if repairs:
                st.write(f"**Normalisation repairs:** {repairs}")
            merge_summary = eaudit.get("merge_summary") or {}
            if merge_summary:
                st.write("**Re-enrichment merge summary:**")
                ms1, ms2, ms3 = st.columns(3)
                ms1.metric("Preserved reviewed", merge_summary.get("carried_forward", 0))
                ms2.metric("New proposals", merge_summary.get("new_proposals", 0))
                ms3.metric("Kept from prior", merge_summary.get("appended_from_prior", 0))
            st.caption(
                f"Schema v{eaudit.get('schema_version', '?')} · "
                f"Prompt: {eaudit.get('prompt_version', '?')}"
            )

    # ── Preservation Status ───────────────────────────────────────────────
    with tabs[2]:
        st.caption(
            "Records what was captured locally and whether the public archive has a copy. "
            "Use capture_needed + suggested_route to plan Wayback/Browsertrix work."
        )
        pstatus = _load_preservation_status_dict(doc_dir)
        if not pstatus:
            st.info("No `preservation_status.json` found — run ingest again to generate it.")
        else:
            _PSTATUS_ICONS: dict[str, str] = {
                "captured_html":  "✅",
                "capture_needed": "⚠️",
                "metadata_only":  "ℹ️",
                "not_applicable": "—",
            }
            status = pstatus.get("preservation_status") or "?"
            icon   = _PSTATUS_ICONS.get(status, "❓")
            st.markdown(f"**Status:** {icon} `{status}`")

            c1, c2, c3 = st.columns(3)
            c1.metric("Capture needed", "⚠️ Yes" if pstatus.get("capture_needed") else "✓ No")
            c2.metric("Wayback",        pstatus.get("public_archive_status") or "?")
            c3.metric("Route",          pstatus.get("suggested_capture_route") or "—")

            if pstatus.get("capture_reason"):
                st.write(f"**Reason:** {pstatus['capture_reason']}")
            sha = pstatus.get("local_html_sha256") or ""
            if sha:
                st.caption(f"SHA-256: `{sha}`")
            for note in (pstatus.get("notes") or []):
                st.caption(f"• {note}")

    # ── Artifact Completeness ─────────────────────────────────────────────
    with tabs[3]:
        completeness = _check_artifact_completeness(doc_dir)
        present_count = sum(1 for v in completeness.values() if v)
        absent = [k for k, v in completeness.items() if not v]
        if absent:
            st.warning(f"Missing: {', '.join(f'`{a}`' for a in absent)}")
        items = list(completeness.items())
        col_a, col_b = st.columns(2)
        for k, v in items[:5]:
            col_a.write(f"{'✅' if v else '❌'} `{k}`")
        for k, v in items[5:]:
            col_b.write(f"{'✅' if v else '❌'} `{k}`")
        st.caption(f"{present_count}/{len(completeness)} artifacts present")


def _format_tag_list(values, *, limit: int = 40) -> str:
    if not values:
        return "—"
    if not isinstance(values, list):
        values = [values]
    cleaned = [str(value) for value in values if str(value or "").strip()]
    if not cleaned:
        return "—"
    shown = cleaned[:limit]
    suffix = f" (+{len(cleaned) - limit} more)" if len(cleaned) > limit else ""
    return ", ".join(shown) + suffix


def _proposal_state(item: dict) -> str:
    if item.get("rejected"):
        return "rejected"
    if item.get("pushed_to_sanity"):
        return "pushed to Sanity"
    if item.get("approved"):
        return "approved locally"
    return "pending review"


def _proposal_state_counts(items: list[dict]) -> dict[str, int]:
    counts = {"pushed to Sanity": 0, "approved locally": 0, "pending review": 0, "rejected": 0}
    for item in items:
        counts[_proposal_state(item)] = counts.get(_proposal_state(item), 0) + 1
    return counts


def _proposal_review_rows(enrichment: dict) -> dict[str, list[dict]]:
    def _rows(items: list[dict], name_key: str, extra_keys: list[str]) -> list[dict]:
        rows = []
        for item in items:
            if not isinstance(item, dict):
                continue
            row = {
                "Name": item.get(name_key, ""),
                "State": _proposal_state(item),
                "Sanity ID": item.get("sanity_id", ""),
            }
            for key in extra_keys:
                label = key.replace("_", " ").title()
                value = item.get(key, "")
                if isinstance(value, list):
                    value = ", ".join(str(v) for v in value if str(v or "").strip())
                row[label] = value
            rows.append(row)
        return rows

    return {
        "Lexicon terms": _rows(
            enrichment.get("lexicon_proposals") or [],
            "term",
            ["proposed_cluster", "function", "register", "model_confidence"],
        ),
        "Entities": _rows(
            enrichment.get("entity_proposals") or [],
            "name",
            ["entity_type", "role_in_sogice", "model_confidence"],
        ),
        "Tactics": _rows(
            enrichment.get("tactic_proposals") or [],
            "tactic",
            ["primary_cluster", "secondary_cluster", "tactic_level", "model_confidence"],
        ),
        "Practices": _rows(
            enrichment.get("practice_descriptions") or [],
            "practice_id",
            ["harm_stance", "model_confidence"],
        ),
        "Claims": _rows(
            enrichment.get("statistical_claims") or [],
            "claim",
            ["source_cited", "verifiable", "model_confidence"],
        ),
    }


def _render_document_enrichment_proposals(doc_id: str, enrich_path: Path) -> None:
    enrichment = _read_json_file(enrich_path, {})
    if not enrichment:
        return

    groups = _proposal_review_rows(enrichment)
    total = sum(len(rows) for rows in groups.values())
    if not total:
        return

    all_items = []
    for key in (
        "lexicon_proposals",
        "entity_proposals",
        "tactic_proposals",
        "practice_descriptions",
        "statistical_claims",
    ):
        all_items.extend(item for item in (enrichment.get(key) or []) if isinstance(item, dict))
    counts = _proposal_state_counts(all_items)

    with st.expander("Enrichment proposals", expanded=False):
        st.caption(
            "Candidate research objects extracted from this document. "
            "These are separate from official analysis tags; approved/pushed items remain reviewable evidence."
        )
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Pushed to Sanity", counts.get("pushed to Sanity", 0))
        c2.metric("Approved locally", counts.get("approved locally", 0))
        c3.metric("Pending review", counts.get("pending review", 0))
        c4.metric("Rejected", counts.get("rejected", 0))

        for label, rows in groups.items():
            if not rows:
                continue
            with st.expander(f"{label} ({len(rows)})", expanded=False):
                st.dataframe(rows, hide_index=True, width="stretch")


def _render_document_analysis_tags(doc_id: str, doc_dir: Path) -> None:
    analysis = _read_json_file(doc_dir / "analysis.json", {})
    if not analysis:
        return

    with st.expander("Analysis tags", expanded=False):
        st.caption(
            "Labels from the main ingestion analysis (`analysis.json`). "
            "These are separate from enrichment proposals and research annotations."
        )
        top_rows = [
            ("Type", analysis.get("type")),
            ("Primary / secondary type", " / ".join(
                value for value in [analysis.get("primary_type"), analysis.get("secondary_type")] if value
            ) or "—"),
            ("Format", analysis.get("format")),
            ("Scope", analysis.get("scope")),
            ("Narrative register", analysis.get("narrative_register")),
            ("Rhetorical intensity", analysis.get("rhetorical_intensity")),
            ("Framing balance", analysis.get("framing_balance")),
            ("Countries", analysis.get("country", [])),
        ]
        st.dataframe(
            [
                {"Field": label, "Value": _format_tag_list(value)}
                for label, value in top_rows
            ],
            hide_index=True,
            width="stretch",
        )

        tag_rows = [
            ("Tactics", analysis.get("tactic", [])),
            ("Practices", analysis.get("practice", [])),
            ("Functions", analysis.get("function", [])),
            ("Harms", analysis.get("harm", [])),
            ("Migration", analysis.get("migration", [])),
            ("Landmarks", analysis.get("landmark", [])),
            ("Flags", analysis.get("flags", [])),
            ("Actors", analysis.get("actor", [])),
            ("Networks", analysis.get("network", [])),
            ("Promotional terms", analysis.get("term", [])),
        ]
        st.dataframe(
            [
                {"Tag group": label, "Values": _format_tag_list(values)}
                for label, values in tag_rows
            ],
            hide_index=True,
            width="stretch",
        )

        term_context = analysis.get("term_use_context") or []
        if term_context:
            st.markdown("**Term-use context**")
            st.dataframe(
                [
                    {
                        "Term": item.get("term", ""),
                        "Use": item.get("use", ""),
                        "Quote": (item.get("quote", "") or "")[:220],
                    }
                    for item in term_context
                    if isinstance(item, dict)
                ],
                hide_index=True,
                width="stretch",
            )

        candidate_terms = analysis.get("candidate_terms") or []
        suggested_actors = analysis.get("suggested_actors") or []
        suggested_networks = analysis.get("suggested_networks") or []
        if candidate_terms or suggested_actors or suggested_networks:
            st.markdown("**Candidates proposed by the analysis**")
            c1, c2, c3 = st.columns(3)
            with c1:
                if candidate_terms:
                    st.caption("Candidate terms")
                    st.dataframe(
                        [
                            {
                                "Term": item.get("term", ""),
                                "Register": item.get("usage_register", item.get("register", "")),
                                "Confidence": item.get("confidence", item.get("model_confidence", "")),
                            }
                            for item in candidate_terms
                            if isinstance(item, dict)
                        ],
                        hide_index=True,
                        width="stretch",
                    )
            with c2:
                if suggested_actors:
                    st.caption("Suggested actors")
                    st.dataframe(
                        [
                            {
                                "Name": item.get("name", ""),
                                "Role": item.get("role", ""),
                            }
                            for item in suggested_actors
                            if isinstance(item, dict)
                        ],
                        hide_index=True,
                        width="stretch",
                    )
            with c3:
                if suggested_networks:
                    st.caption("Suggested networks")
                    st.dataframe(
                        [
                            {
                                "Name": item.get("name", ""),
                                "Role": item.get("role", ""),
                            }
                            for item in suggested_networks
                            if isinstance(item, dict)
                        ],
                        hide_index=True,
                        width="stretch",
                    )

        warnings = analysis.get("normalisation_warnings") or []
        if warnings:
            with st.expander("Normalisation warnings", expanded=False):
                for warning in warnings:
                    st.warning(str(warning))


def _local_embedding_status(doc_dir: Path, config, *, check_supabase: bool = True) -> dict:
    status = {
        "ok": False,
        "detail": "missing embedding.json",
        "supabase_ok": None,
        "supabase_detail": "not checked",
    }
    emb_path = doc_dir / "embedding.json"
    pending_path = doc_dir / "embedding_pending.json"
    if emb_path.exists():
        try:
            emb = json.loads(emb_path.read_text())
            vector = emb.get("vector") or []
            dim = int(emb.get("dimension") or len(vector))
            status["ok"] = bool(vector) and dim > 0
            status["detail"] = f"{emb.get('model', '')} | dimension={dim}"
            if not status["ok"]:
                status["detail"] += " | empty vector"
        except Exception as exc:
            status["detail"] = f"invalid embedding.json: {exc}"
    elif pending_path.exists():
        try:
            pending = json.loads(pending_path.read_text(encoding="utf-8"))
            model = pending.get("model") or "embedding"
            error = str(pending.get("error") or "pending retry")
            status["detail"] = f"pending retry: {model} | {error}"
        except Exception as exc:
            status["detail"] = f"pending retry marker unreadable: {exc}"
    if config and check_supabase:
        try:
            from runner.clients.supabase import _client as _sb_client

            result = _sb_client(config).table("document_embeddings").select(
                "doc_id,embedding_model"
            ).eq("doc_id", doc_dir.name).limit(1).execute()
            if result.data:
                status["supabase_ok"] = True
                status["supabase_detail"] = result.data[0].get("embedding_model") or "row found"
            else:
                status["supabase_detail"] = "no row found"
        except Exception as exc:
            status["supabase_detail"] = f"check failed: {exc}"
    elif not check_supabase:
        status["supabase_detail"] = "not checked in this view"
    return status


def _generate_and_push_embedding(doc_id: str, corpus_dir: Path, config) -> tuple[bool, str]:
    if not config:
        return False, "Could not load config."
    try:
        from runner.pipeline.embedding_repair import repair_embedding

        result = repair_embedding(
            doc_id,
            config,
            route="auto",
            overwrite=True,
            push_supabase=True,
        )
        details = "\n".join(f"- {item}" for item in result.attempts)
        message = result.message
        if details:
            message += "\n" + details
        return result.ok, message
    except Exception as exc:
        return False, f"Embedding generation/push failed: {exc}"


# ---------------------------------------------------------------------------
# Pending Upload
# ---------------------------------------------------------------------------

def page_pending_upload():
    st.title("Pending Upload")

    config = _load_config_safe()
    if not config:
        st.error("Could not load config.")
        return

    corpus_dir = config.corpus_dir
    if not corpus_dir.exists():
        st.info("Corpus directory is empty.")
        return

    pending = []
    for doc_dir in sorted(corpus_dir.iterdir()):
        if not doc_dir.is_dir():
            continue
        if (doc_dir / "sanity_record.json").exists():
            continue
        if not (doc_dir / "analysis.json").exists():
            continue
        try:
            data = json.loads((doc_dir / "analysis.json").read_text())
        except Exception:
            continue
        pending.append({"doc_id": doc_dir.name, "type": data.get("type", "?")})

    if not pending:
        st.success("No documents waiting to be uploaded.")
        return

    st.warning(f"{len(pending)} document(s) saved locally but not yet uploaded to Sanity.")

    if st.button("⬆ Upload all to Sanity", type="primary"):
        progress = st.progress(0)
        errors = []
        for i, p in enumerate(pending):
            with st.spinner(f"Uploading {p['doc_id']}…"):
                r = __import__("subprocess").run(
                    [sys.executable, "-m", "runner", "upload-doc", p["doc_id"]],
                    capture_output=True, text=True, cwd=_project_root,
                )
                if r.returncode != 0:
                    errors.append((p["doc_id"], r.stderr[-300:] or r.stdout[-300:]))
            progress.progress((i + 1) / len(pending))
        if errors:
            for doc_id, msg in errors:
                st.error(f"{doc_id}: {msg}")
        else:
            st.success(f"Uploaded {len(pending)} document(s).")
        st.rerun()

    st.divider()
    for p in pending:
        col1, col2, col3 = st.columns([3, 1, 1])
        col1.write(f"**{p['doc_id']}** — {p['type']}")
        if col2.button("Upload", key=f"pu_{p['doc_id']}"):
            with st.spinner("Uploading…"):
                r = __import__("subprocess").run(
                    [sys.executable, "-m", "runner", "upload-doc", p["doc_id"]],
                    capture_output=True, text=True, cwd=_project_root,
                )
            if r.returncode == 0:
                st.success(f"{p['doc_id']} uploaded.")
            else:
                st.error(r.stderr[-400:] or r.stdout[-400:])
            st.rerun()
        col3.code(p["doc_id"], language=None)


# ---------------------------------------------------------------------------
# Lexicon
# ---------------------------------------------------------------------------


def _render_three_system_reference() -> None:
    st.subheader("Three-System Persuasion Architecture")
    st.caption(
        "SOGICE discourse operates through three interlocking persuasion systems. "
        "Understanding which system a document uses determines the correct TACTIC tags "
        "and helps identify legislative loopholes the document is exploiting."
    )

    st.markdown("""
---
### System A — Causal / Medical
**Logic chain:** *You are not gay — you experience SSA (identity erasure). SSA is a symptom of unresolved psychological injury. By healing the injury, the symptom resolves naturally. We offer that healing.*

Change is presented as the organic consequence of trauma healing — not as the goal. This makes it legally defensible as "trauma therapy" rather than conversion.

**Key terms and tactics:**

| Term | Cluster | Role in System A |
|---|---|---|
| SSA / USSA | C1 | Gateway depersonalisation — must happen first |
| Father-Wound / Mother-Wound | C3 | The claimed trauma root |
| Gender-Role-Deficit | C3 | Peer-level developmental failure mechanism |
| Developmental-Arrest-Framing | C3 | Pseudo-scientific framing of the failure |
| Reparative-Drive | C3 | The eroticisation of the deficit |
| Reparative-Therapy / Reintegrative-Therapy | C1/C3 | The treatment |
| Healing-the-Root | C2 | The legislative defence — "we treat trauma, not orientation" |
| Causal-Theory-Frame | TACTIC | Signals System A is active |

---
### System B — Spiritual / Divine Design
**Logic chain:** *God created humanity with Divine Design — heterosexual, binary. Your SOGIE is a departure from that design through brokenness. You can return to your true self through spiritual work. This is what genuine love requires. Wholeness awaits.*

Change is presented as spiritual homecoming to an original, authentic self. Survives in pastoral exemptions even where clinical SOGICE is banned.

**Key terms and tactics:**

| Term | Cluster | Role in System B |
|---|---|---|
| Divine-Design | C2 | The theological premise — Protestant/evangelical variant |
| Fitra-SOGICE | C2 | Islamic equivalent of Divine-Design |
| Imago-Dei-Integrity-Argument | C2 | Catholic theological equivalent |
| Sexual-Brokenness | C2 | The departure from design |
| Side-B / Living-Chastely | C2 | Celibacy variant — no change claim needed |
| Sanctification-Trajectory | C2 | Ongoing journey frame — prevents exits |
| Spiritual-Wholeness | C2 | The coded destination state |
| Walking-in-Truth | C2 | Compliance phrase = living heterosexually/celibately |
| Healing-Retreat / Theophostic-Prayer | C2 | The spiritual intervention formats |
| Relapse-as-Deepening | C2 | Retains subjects after failure |
| Sjelesorg / Accompagnamento / Troska-Duszpasterska | C2 | Language-specific pastoral loophole terms |
| Fitra-Frame / PastoralCoercion-LegislativeLoophole | TACTIC | Signals System B is active |

---
### System C — Platform-Evasion / Policy
**Logic chain:** *We're not "conversion therapy" — we're offering therapeutic choice, pastoral support, life coaching, or identity exploration. Our clients freely choose this. Banning us criminalises prayer and parental rights. We operate under different names to protect access.*

Requires System A or B first to establish demand. System C is purely about legal/platform survival.

**Key terms and tactics:**

| Term | Cluster | Role in System C |
|---|---|---|
| USSA | C1 | Manufactured demand — "clients choose this" |
| Therapeutic-Choice / SAFE-T / Congruence-Therapy | C4 | Ban-resistant rebranding |
| Identity-Alignment | C1 | Wellness-coded SOGICE for content filters |
| Faith-Based-Life-Coaching | C1 | "Coaching" to evade licensed-practitioner ban definitions |
| Beratungsfreiheit / Libertà-Terapeutica / Terápiás-Szabadság | C4 | Rights-language capture in German, Italian, Hungarian |
| Einvernehmliche-Therapie | C4 | Adult consent carve-out argument |
| Exploratory-Therapy-Rebranding | C4 | Exploiting ban exemptions for affirming exploration |
| Therapeutic-Alliance-Performance | C4 | Appearing clinically neutral to regulators |
| Soft-Referral-Pipeline / Network-Laundering | TACTIC | Hidden routing to SOGICE providers |
| Platform-Evasion / Religious-Freedom-Shield / Conscience-Carve-Out | TACTIC | Signals System C is active |

---
### How the systems interlock

```
System A feeds C:  "we treat trauma, not identity" → the legislative loophole
System B feeds C:  "pastoral support" → exemption carve-out in every European ban
Both require C1:   SSA gateway must depersonalise identity before A or B can operate
```

**Tagging rule:** A single document can run all three systems simultaneously. Assign TACTIC tags from each active system. The `rhetorical_intensity` field captures how far the document moves toward active conduct.
""")


def _render_sanity_lexicon_tab(config) -> None:
    """Card-based view of lexicon entries with per-context confirmation buttons."""
    col_refresh, col_search, col_filter = st.columns([1, 3, 2])
    with col_refresh:
        if st.button("Refresh"):
            st.session_state.pop("lexicon_terms", None)
    with col_search:
        search_q = st.text_input("Search terms", placeholder="Filter by term…", label_visibility="collapsed")
    with col_filter:
        status_filter = st.selectbox(
            "Status", ["all", "candidate", "draft", "validated"], label_visibility="collapsed"
        )

    if "lexicon_terms" not in st.session_state:
        try:
            from runner.clients.sanity import fetch_lexicon_terms
            st.session_state.lexicon_terms = fetch_lexicon_terms(config)
        except Exception as exc:
            st.error(f"Could not fetch lexicon from Sanity: {exc}")
            st.session_state.lexicon_terms = []
    terms = st.session_state.lexicon_terms

    # Filter
    visible = terms
    if search_q:
        sq = search_q.lower()
        visible = [t for t in visible if sq in (t.get("term") or "").lower()]
    if status_filter != "all":
        visible = [t for t in visible if t.get("status") == status_filter]

    # Summary row
    total_evidence = sum(len(t.get("evidenceDossier") or []) for t in terms)
    confirmed_evidence = sum(
        sum(1 for e in (t.get("evidenceDossier") or []) if e.get("confirmed"))
        for t in terms
    )
    mc1, mc2, mc3, mc4 = st.columns(4)
    mc1.metric("Terms", len(terms))
    mc2.metric("Showing", len(visible))
    mc3.metric("Evidence records", total_evidence)
    mc4.metric("Confirmed", f"{confirmed_evidence}/{total_evidence}")

    st.divider()

    for term_entry in visible:
        term_name = term_entry.get("term", "?")
        status = term_entry.get("status", "candidate")
        cluster = term_entry.get("proposedCluster") or "—"
        func = term_entry.get("function") or "—"
        freq = term_entry.get("frequency") or 0
        dossier = term_entry.get("evidenceDossier") or []
        authority_sources = term_entry.get("sourceAttestations") or []
        confirmed_count = sum(1 for e in dossier if e.get("confirmed"))
        pending_count = len(dossier) - confirmed_count

        status_badge = {"validated": "✅", "draft": "🔵", "candidate": "🟡"}.get(status, "⬜")
        pending_badge = f"  🔴 {pending_count} pending" if pending_count else ""
        header = f"{status_badge} **{term_name}** — {cluster} · {func} · {freq} doc(s){pending_badge}"

        with st.expander(header, expanded=(pending_count > 0 and len(visible) <= 10)):
            def_text = term_entry.get("draftDefinition") or term_entry.get("accessibleDefinition") or ""
            if def_text:
                st.caption(def_text[:300])

            if authority_sources:
                with st.expander(
                    f"Authority sources ({len(authority_sources)})",
                    expanded=False,
                ):
                    st.caption(
                        "These preserve a named source's terminology and definition summary. "
                        "They do not automatically validate the archive term."
                    )
                    for source in authority_sources:
                        source_term = source.get("sourceTerm") or term_name
                        publisher = source.get("publisher") or "Named source"
                        review_state = source.get("reviewState") or "source_attested_unreviewed"
                        st.markdown(f"**{source_term}** · {publisher} · `{review_state}`")
                        if source.get("sourceDefinitionSummary"):
                            st.write(source["sourceDefinitionSummary"])
                        if source.get("sourceUrl"):
                            st.link_button(
                                "Open authority source",
                                source["sourceUrl"],
                                key=f"authority_{term_entry.get('_id')}_{source.get('_key')}",
                            )

            if not dossier:
                st.caption("No evidence records yet.")
            else:
                for ctx_i, ctx in enumerate(dossier):
                    key = ctx.get("_key", "")
                    doc_ref = (ctx.get("docRef") or "unknown").replace("doc-", "")
                    quote = ctx.get("exactQuote") or ctx.get("excerpt") or "—"
                    def_as_used = ctx.get("definitionAsUsed") or ""
                    register = ctx.get("usageRegister") or ctx.get("stanceProfile") or "—"
                    m_conf = ctx.get("modelConfidence")
                    r_conf = ctx.get("researcherConfidence")
                    conf_str = f"{m_conf:.2f}" if m_conf is not None else "—"
                    rationale = ctx.get("confidenceRationale") or ""
                    co_terms = ctx.get("coOccurringTerms") or []
                    rel_notes = ctx.get("relationshipNotes") or ""
                    r_note = ctx.get("researcherNote") or ""
                    lang = ctx.get("language") or "—"
                    is_confirmed = ctx.get("confirmed", False)

                    # Header row: status + doc + register + confidence
                    ctx_col1, ctx_col2 = st.columns([5, 1])
                    with ctx_col1:
                        badge = "✅ Confirmed" if is_confirmed else "🔴 Pending"
                        st.markdown(
                            f"{badge} · **doc:** `{doc_ref}` · **lang:** {lang} · "
                            f"**register:** {register} · **model conf:** {conf_str}"
                            + (f" · **researcher conf:** {r_conf:.2f}" if r_conf is not None else "")
                        )
                    with ctx_col2:
                        if not is_confirmed:
                            if st.button("Confirm ✓", key=f"confirm_{term_entry['_id']}_{key}"):
                                st.session_state[f"confirming_{term_entry['_id']}_{key}"] = True
                        else:
                            confirmed_at = (ctx.get("confirmedAt") or "")[:10]
                            st.caption(f"✅ {confirmed_at}")

                    # Confirmation note input (shows when confirm button was just clicked)
                    if st.session_state.get(f"confirming_{term_entry['_id']}_{key}"):
                        note_val = st.text_input(
                            "Confirmation note (optional — will be saved with this record)",
                            key=f"note_input_{term_entry['_id']}_{key}",
                        )
                        c_submit, c_cancel = st.columns(2)
                        with c_submit:
                            if st.button("Save confirmation", key=f"save_confirm_{term_entry['_id']}_{key}"):
                                try:
                                    from runner.clients.sanity import confirm_lexicon_context
                                    confirm_lexicon_context(term_entry["_id"], key, config, note=note_val)
                                    st.session_state.pop(f"confirming_{term_entry['_id']}_{key}", None)
                                    st.session_state.pop("lexicon_terms", None)
                                    st.rerun()
                                except Exception as exc:
                                    st.error(f"Confirm failed: {exc}")
                        with c_cancel:
                            if st.button("Cancel", key=f"cancel_confirm_{term_entry['_id']}_{key}"):
                                st.session_state.pop(f"confirming_{term_entry['_id']}_{key}", None)
                                st.rerun()

                    # Verbatim quote
                    st.markdown(f"> {quote[:600]}")

                    # Definition as used in this document (most important per-document field)
                    if def_as_used:
                        st.markdown(f"**Definition as used here:** {def_as_used[:400]}")

                    # Rich context — collapsible so it doesn't bury the primary content
                    has_extra = any([co_terms, rel_notes, rationale, r_note, is_confirmed and ctx.get("confirmedNote")])
                    if has_extra:
                        with st.expander("Context details", expanded=False):
                            if co_terms:
                                st.markdown(f"**Co-occurring terms:** {', '.join(co_terms)}")
                            if rel_notes:
                                st.markdown(f"**Relationship notes:** {rel_notes}")
                            if rationale:
                                st.markdown(f"**Model rationale:** {rationale}")
                            if r_note:
                                st.markdown(f"**Researcher note:** {r_note}")
                            if is_confirmed and ctx.get("confirmedNote"):
                                st.markdown(f"**Confirmation note:** {ctx['confirmedNote']}")

                    st.divider()


def _render_registry_status_overview(config) -> None:
    """Show validation status across all Sanity registry schemas."""
    st.subheader("Sanity Registry Status")
    try:
        from runner.clients.sanity import fetch_registry_status_overview

        if st.button("Refresh registry status", key="registry_status_refresh"):
            st.session_state.pop("registry_status_overview", None)
            st.session_state.pop("lexicon_terms", None)
            st.session_state.pop("entity_registry", None)
        if "registry_status_overview" not in st.session_state:
            st.session_state.registry_status_overview = fetch_registry_status_overview(config)
        overview = st.session_state.registry_status_overview
    except Exception as exc:
        st.caption(f"Could not load registry status from Sanity: {exc}")
        return

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Validated / confirmed", overview.get("validated", 0))
    c2.metric("Needs validation", overview.get("needs_review", 0))
    c3.metric("Deprecated / rejected", overview.get("deprecated", 0))
    c4.metric(
        "Lexicon evidence confirmed",
        f"{overview.get('lexicon_evidence_confirmed', 0)}/{overview.get('lexicon_evidence_total', 0)}",
    )
    st.caption(
        f"{overview.get('records_with_document_evidence', 0)} registry record(s) have linked corpus-document evidence. "
        "Registry validation confirms the canonical record; lexicon evidence confirmation separately checks each quoted usage."
    )

    type_order = [
        "lexiconEntry",
        "organization",
        "person",
        "tacticEntry",
        "practiceEntry",
        "tagRegistry",
    ]
    rows = []
    for schema_type in type_order:
        bucket = overview.get("by_type", {}).get(schema_type) or {}
        states = bucket.get("states", {})
        rows.append(
            {
                "registry": bucket.get("label") or _registry_type_label(schema_type),
                "total": bucket.get("total", 0),
                "validated": states.get("validated", 0),
                "needs_validation": states.get("needs_review", 0),
                "deprecated": states.get("deprecated", 0),
                "with_document_evidence": sum(
                    1 for row in bucket.get("rows", []) if row.get("hasDocumentEvidence")
                ),
            }
        )
    if rows:
        st.dataframe(rows, width="stretch", hide_index=True)

    local_evidence = _local_registry_evidence_index(config.corpus_dir)
    review_rows = [
        row for row in overview.get("review_rows", [])
        if row.get("_type") != "lexiconEntry"
    ]
    lexicon_review_count = sum(
        1 for row in overview.get("review_rows", [])
        if row.get("_type") == "lexiconEntry"
    )
    if review_rows:
        with st.expander(f"Non-lexicon validation queue ({len(review_rows)})"):
            st.caption(
                "This queue covers entity records, tactics, practices, and tag registry rows. "
                "The source/evidence lines show which corpus document supports a row. "
                "Validating here changes the canonical registry status. Lexicon term/evidence review lives in the Sanity Lexicon tab below."
            )
            filter_options = _registry_review_filter_options(review_rows, type_order)
            selected = st.selectbox(
                "Registry type",
                filter_options,
                key="registry_validation_filter",
            )
            visible = review_rows
            if selected != "All":
                visible = [
                    row
                    for row in visible
                    if _registry_type_label(row.get("_type", "")) == selected
                ]
            for row in visible[:100]:
                matches = _local_registry_evidence_matches(row, local_evidence)
                _render_registry_validation_row(row, config, matches)
            if len(visible) > 100:
                st.caption(f"Showing first 100 of {len(visible)} records. Use Sanity Studio for bulk cleanup.")
    if lexicon_review_count:
        st.caption(
            f"{lexicon_review_count} lexicon term(s) still need canonical/evidence review; use the Sanity Lexicon tab below so term status and per-document evidence are not split across two places."
        )


def _registry_type_label(schema_type: str) -> str:
    return {
        "lexiconEntry": "Lexicon",
        "organization": "Organizations",
        "person": "People",
        "tacticEntry": "Tactics",
        "practiceEntry": "Practices",
        "tagRegistry": "Tags",
    }.get(schema_type, schema_type or "Unknown")


def _registry_review_filter_options(review_rows: list[dict], type_order: list[str]) -> list[str]:
    present_types = {row.get("_type") for row in review_rows}
    options = [
        _registry_type_label(schema_type)
        for schema_type in type_order
        if schema_type in present_types
    ]
    return ["All"] + options


def _render_registry_validation_row(row: dict, config, local_matches: list[dict] | None = None) -> None:
    sanity_id = row.get("_id", "")
    schema_type = row.get("_type", "")
    label = row.get("label") or sanity_id or "Untitled"
    status = row.get("status") or "-"
    registry_status = row.get("registryStatus") or "-"
    evidence_total = int(row.get("evidenceTotal") or 0)
    evidence_confirmed = int(row.get("evidenceConfirmed") or 0)
    meta = f"{_registry_type_label(schema_type)} | status: {status} | registry: {registry_status}"
    if evidence_total:
        meta += f" | evidence: {evidence_confirmed}/{evidence_total}"
    document_refs = row.get("documentRefs") or []
    requires_document_evidence = schema_type in {
        "lexiconEntry",
        "organization",
        "person",
        "tacticEntry",
        "practiceEntry",
    }
    local_matches = local_matches or []
    direct_local_matches = [
        match for match in local_matches
        if match.get("match") in {"sanity_id", "label"}
    ]
    possible_local_matches = [
        match for match in local_matches
        if match.get("match") == "similar"
    ]
    can_validate = bool(document_refs) or bool(direct_local_matches) or not requires_document_evidence
    action_label = "Validate term" if schema_type == "lexiconEntry" else "Validate record"

    row_col, action_col = st.columns([5, 1])
    with row_col:
        st.markdown(f"**{label}**")
        st.caption(meta)
        if document_refs:
            st.markdown(
                "**Source document(s):** "
                + ", ".join(f"`{ref}`" for ref in document_refs[:6])
                + (" ..." if len(document_refs) > 6 else "")
            )
        elif requires_document_evidence and not possible_local_matches:
            st.caption("No linked Sanity source document/evidence is recorded yet.")
        if direct_local_matches:
            _render_local_registry_matches("Local pushed/approved evidence", direct_local_matches)
        if possible_local_matches:
            _render_local_registry_matches("Possible local duplicate/evidence match", possible_local_matches)
            st.caption(
                "Possible matches may differ by spelling/accent or may point to a separate Sanity record. "
                "Check or merge in Sanity before validating this row."
            )
        if requires_document_evidence and not document_refs and not direct_local_matches:
            st.caption("Validate after linking a source document or resolving a local duplicate.")
        _render_registry_evidence_preview(row)
    with action_col:
        if st.button(
            action_label,
            key=f"validate_registry_{sanity_id}",
            disabled=not can_validate,
            help=(
                "Requires at least one linked corpus document/evidence record."
                if not can_validate
                else "Mark this Sanity registry row as researcher-validated."
            ),
        ):
            try:
                from runner.clients.sanity import patch_registry_validation

                patch_registry_validation(sanity_id, schema_type, config)
                st.session_state.pop("registry_status_overview", None)
                st.session_state.pop("lexicon_terms", None)
                st.session_state.pop("entity_registry", None)
                st.success(f"Validated {label}.")
                st.rerun()
            except Exception as exc:
                st.error(f"Could not validate {label}: {exc}")


def _render_local_registry_matches(title: str, matches: list[dict]) -> None:
    with st.expander(f"{title} ({len(matches)})", expanded=False):
        for match in matches[:5]:
            status = match.get("status", "")
            sanity_id = match.get("sanity_id") or "not pushed"
            st.caption(
                f"`{match.get('doc_id', '')}` | {status} | Sanity `{sanity_id}` | {match.get('match', '')}"
            )
            quote = match.get("evidence_quote") or match.get("definition") or ""
            if quote:
                st.markdown(f"> {quote[:500]}")
        if len(matches) > 5:
            st.caption(f"{len(matches) - 5} more local match(es) not shown.")


def _render_registry_evidence_preview(row: dict) -> None:
    evidence_rows = row.get("evidenceDossier") or []
    if not evidence_rows:
        return
    with st.expander("Evidence preview", expanded=False):
        for evidence in evidence_rows[:5]:
            doc_ref = (evidence.get("docRef") or "").replace("doc-", "")
            quote = evidence.get("exactQuote") or evidence.get("excerpt") or ""
            confirmed = evidence.get("confirmed")
            confirmed_label = (
                "confirmed"
                if confirmed is True
                else "pending"
                if confirmed is False
                else "not separately confirmed"
            )
            prefix = f"`{doc_ref}` | {confirmed_label}" if doc_ref else confirmed_label
            st.caption(prefix)
            if quote:
                st.markdown(f"> {quote[:500]}")
        if len(evidence_rows) > 5:
            st.caption(f"{len(evidence_rows) - 5} more evidence record(s) not shown.")


def _local_registry_evidence_index(corpus_dir: Path) -> list[dict]:
    rows: list[dict] = []
    for key, schema_selector, label_field, quote_fields in [
        ("entity_proposals", _entity_schema_type_from_proposal, "name", ["evidence_quote", "self_description"]),
        ("tactic_proposals", lambda item: "tacticEntry", "tactic", ["evidence_quote", "definition"]),
        ("practice_descriptions", lambda item: "practiceEntry", "practice_id", ["exact_description", "harm_quote"]),
    ]:
        for record in _local_enrichment_proposal_records(corpus_dir, key):
            item = record["item"]
            label = _local_registry_label(item, label_field)
            if not label:
                continue
            rows.append(
                {
                    "schema_type": schema_selector(item),
                    "label": label,
                    "norm_label": _registry_match_key(label),
                    "doc_id": record["doc_id"],
                    "status": _proposal_review_status(item),
                    "sanity_id": item.get("sanity_id", ""),
                    "approved": bool(item.get("approved")),
                    "pushed_to_sanity": bool(item.get("pushed_to_sanity")),
                    "evidence_quote": _first_nonempty(item, quote_fields),
                }
            )
    return rows


def _entity_schema_type_from_proposal(item: dict) -> str:
    return "person" if item.get("entity_type") == "person" else "organization"


def _local_registry_label(item: dict, label_field: str) -> str:
    value = (item.get(label_field) or "").strip()
    if label_field == "practice_id":
        value = re.sub(r"^Practice:\s*", "", value).strip()
    return value


def _first_nonempty(item: dict, fields: list[str]) -> str:
    for field in fields:
        value = item.get(field)
        if value:
            return str(value)
    return ""


def _registry_match_key(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value or "")
    ascii_text = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", ascii_text.lower()).strip()


def _local_registry_evidence_matches(row: dict, local_evidence: list[dict]) -> list[dict]:
    schema_type = row.get("_type")
    sanity_id = row.get("_id") or ""
    label_key = _registry_match_key(row.get("label") or "")
    matches: list[dict] = []
    for local in local_evidence:
        if local.get("schema_type") != schema_type:
            continue
        if not (local.get("approved") or local.get("pushed_to_sanity")):
            continue
        match = ""
        if local.get("sanity_id") and local.get("sanity_id") == sanity_id:
            match = "sanity_id"
        elif local.get("norm_label") and local.get("norm_label") == label_key:
            match = "label"
        elif label_key and local.get("norm_label"):
            ratio = difflib.SequenceMatcher(None, label_key, local["norm_label"]).ratio()
            if ratio >= 0.88:
                match = "similar"
        if match:
            matches.append({**local, "match": match})
    return sorted(
        matches,
        key=lambda match: {"sanity_id": 0, "label": 1, "similar": 2}.get(match["match"], 9),
    )


def page_lexicon():
    st.title("Lexicon")

    config = _load_config_safe()
    if not config:
        st.error("Could not load config. Check runner/.env.")
        return

    show_registry_overview = st.checkbox(
        "Show live Sanity registry overview",
        value=False,
        key="lexicon_show_registry_overview",
        help=(
            "Fetches live registry counts from Sanity. Leave off while reviewing "
            "local proposals so save/approve actions stay fast."
        ),
    )
    if show_registry_overview:
        _render_registry_status_overview(config)

    st.info(
        "Analysis and enrichment fetch current Sanity lexicon/registry data at run time. "
        "Local proposals are saved after enrichment; approval-to-Sanity is intentionally separate."
    )

    lexicon_sections = [
        "Sanity Lexicon",
        "Entity Registry",
        "Local Proposals",
        "GOV.UK Source Glossary",
        "Seed Import Preview",
        "Variant Import Preview",
        "Legacy Vocabulary Preview",
        "Sanity Schema Files",
        "Seed Docs",
        "Three-System Reference",
        "Ingestion Prompt",
    ]
    selected_section = st.radio(
        "Lexicon section",
        lexicon_sections,
        horizontal=True,
        key="lexicon_active_section",
        help=(
            "Only the selected section is rendered. This keeps local proposal "
            "save/approve actions fast and avoids accidental Sanity fetches."
        ),
    )

    if selected_section == "Sanity Lexicon":
        _render_sanity_lexicon_tab(config)

    elif selected_section == "Entity Registry":
        if st.button("Refresh Registry"):
            st.session_state.pop("entity_registry", None)
        if "entity_registry" not in st.session_state:
            try:
                from runner.pipeline.enrich import _fetch_entity_registry
                st.session_state.entity_registry = _fetch_entity_registry(config)
            except Exception as exc:
                st.error(f"Could not fetch entity registry from Sanity: {exc}")
                st.session_state.entity_registry = []
        entities = st.session_state.entity_registry
        st.caption(f"{len(entities)} organizations/persons")
        if entities:
            st.dataframe(entities, width="stretch", hide_index=True)

    elif selected_section == "Local Proposals":
        _render_local_proposal_queue(config)

    elif selected_section == "GOV.UK Source Glossary":
        _render_govuk_source_glossary(config)

    elif selected_section == "Seed Import Preview":
        _render_seed_lexicon_import(config)

    elif selected_section == "Variant Import Preview":
        _render_variant_import(config)

    elif selected_section == "Legacy Vocabulary Preview":
        _render_legacy_vocabulary_import(config)

    elif selected_section == "Sanity Schema Files":
        schema_files = {
            "Document schema": _project_root / "studio" / "schemas" / "document.ts",
            "Lexicon entry schema": _project_root / "studio" / "schemas" / "lexiconEntry.ts",
            "Organization schema": _project_root / "studio" / "schemas" / "organization.ts",
            "Person schema": _project_root / "studio" / "schemas" / "person.ts",
            "Schema index": _project_root / "studio" / "schemas" / "index.ts",
        }
        selected = st.selectbox("Schema file", list(schema_files.keys()))
        _show_text_file(schema_files[selected], language="typescript")

    elif selected_section == "Seed Docs":
        st.info(
            "Seed lexicon import policy: every seed enters as draft. Source evidence establishes an attestation, "
            "while canonical validation and Analysis-orientation trust require separate explicit researcher decisions."
        )
        seed_files = {
            "Lexicon seed document (v2.1)": _project_root / "00_infrastructure" / "SOGICE_Lexicon_v2.1.md",
            "Entity registry seed document": _project_root / "00_infrastructure" / "Entity_Registry_v1.1.md",
            "Sanity schema reference": _project_root / "00_infrastructure" / "SANITY_SCHEMA_v1.0.md",
            "Ontology": _project_root / "00_infrastructure" / "SOGICE_Ontology_v3.0.md",
            "Legacy vocabulary document": _legacy_vocab_dir / "sogice_vocabulary_doc_2026-04-03.txt",
            "Legacy vocabulary CSV": _legacy_vocab_dir / "sogice_vocabulary_2026-04-03.csv",
            "Legacy glossary JSON": _legacy_vocab_dir / "sogice_glossary_2026-04-03.json",
        }
        selected = st.selectbox("Reference file", list(seed_files.keys()))
        _show_text_file(seed_files[selected], language="markdown")

    elif selected_section == "Three-System Reference":
        _render_three_system_reference()

    elif selected_section == "Ingestion Prompt":
        st.caption("Live read of `02_working_tools/Claude_Ingestion_Prompt.md` (ingestion-v3.3)")
        _show_text_file(
            _project_root / "02_working_tools" / "Claude_Ingestion_Prompt.md",
            language="markdown",
        )


def _local_enrichment_proposals(corpus_dir: Path) -> list[dict]:
    rows: list[dict] = []
    if not corpus_dir.exists():
        return rows
    for enrich_path in corpus_dir.glob("*/enrichment.json"):
        try:
            data = json.loads(enrich_path.read_text())
        except Exception:
            continue
        doc_id = enrich_path.parent.name
        for item in data.get("lexicon_proposals", []):
            rows.append({
                "doc_id": doc_id,
                "term": item.get("term", ""),
                "action": item.get("action", ""),
                "cluster": item.get("proposed_cluster", ""),
                "function": item.get("function", ""),
                "approved": item.get("approved", False),
                "rejected": item.get("rejected", False),
            })
    return rows


# ---------------------------------------------------------------------------
# Tag Registry
# ---------------------------------------------------------------------------

def page_tag_registry():
    st.title("Tag Registry")
    st.info(
        "This is the broader tag vocabulary used as enrichment signal material: actors, networks, practices, tactics, harms, evidence types, formats, countries, and terms. "
        "Edits are saved locally as researcher overrides; they do not change Sanity schema."
    )
    config = _load_config_safe()
    try:
        from runner.pipeline.tag_registry import OVERRIDES_PATH, load_tag_registry, registry_status, save_custom_tag, save_tag_override
    except Exception as exc:
        st.error(f"Could not load tag registry: {exc}")
        return

    status = registry_status()
    with st.expander("Registry source and enrichment-hint status", expanded=not status.get("available")):
        s1, s2, s3 = st.columns(3)
        s1.metric("Registry available", "yes" if status.get("available") else "no")
        s2.metric("Searchable rows", int(status.get("row_count") or 0))
        s3.metric("CSV present", "yes" if status.get("csv_exists") else "no")
        st.caption(
            "During enrichment, matching tags from this CSV are injected as connection hints, "
            "not proof. If the registry is unavailable, enrichment still runs but loses these hints."
        )
        st.write(f"Expected CSV: `{status.get('csv_path', '')}`")
        st.write(f"Configured by: `{status.get('env_var', 'SOGICE_LEGACY_VOCAB_DIR')}`")
        if status.get("env_value"):
            st.write(f"Current env value: `{status['env_value']}`")
        else:
            st.warning(
                "No `SOGICE_LEGACY_VOCAB_DIR` is set, so the app is using the default historical cloud path. "
                "Set it in `runner/.env` to a stable local folder containing the vocabulary CSV."
            )
        if status.get("error"):
            st.error(f"Could not access registry path: {status['error']}")
        if not status.get("csv_exists"):
            st.code(
                "SOGICE_LEGACY_VOCAB_DIR=/path/to/Old_Artifact_Bakcup",
                language="bash",
            )

    if st.button("Reload Tag Registry"):
        st.session_state.pop("tag_registry_rows", None)
    if "tag_registry_rows" not in st.session_state:
        st.session_state.tag_registry_rows = load_tag_registry()
    rows = st.session_state.tag_registry_rows
    if not rows:
        st.warning("No tag registry rows found. Check the source/status panel above.")
        return

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Tags", len(rows))
    c2.metric("Categories", len({row["category"] for row in rows}))
    c3.metric("Active", sum(1 for row in rows if row.get("active", True)))
    c4.metric("With connections", sum(1 for row in rows if row.get("connections")))

    if config is not None:
        _render_longform_candidate_registry(config.corpus_dir, save_custom_tag)

    categories = sorted({row["category"] for row in rows})
    col1, col2 = st.columns([1, 2])
    with col1:
        selected_categories = st.multiselect("Category", categories, default=categories[:])
    with col2:
        search = st.text_input("Search tags / definitions / connections")

    filtered = rows
    if selected_categories:
        filtered = [row for row in filtered if row["category"] in selected_categories]
    if search.strip():
        needle = search.lower().strip()
        filtered = [
            row for row in filtered
            if needle in row["tag"].lower()
            or needle in row.get("definition", "").lower()
            or needle in row.get("connections", "").lower()
        ]

    st.caption(f"Showing {len(filtered)} of {len(rows)} tags. Local overrides: {OVERRIDES_PATH}")
    st.dataframe(
        [
            {
                "category": row["category"],
                "tag": row["tag"],
                "active": row.get("active", True),
                "occurrences": row.get("occurrences", 0),
                "cluster": row.get("concept_cluster", ""),
                "definition": row.get("definition", ""),
            }
            for row in filtered
        ],
        width="stretch",
        hide_index=True,
    )

    tag_options = [f"{row['category']} · {row['tag']}" for row in filtered]
    if not tag_options:
        return
    selected_label = st.selectbox("Edit tag", tag_options)
    selected_row = filtered[tag_options.index(selected_label)]
    _render_tag_editor(selected_row, save_tag_override)


def _render_tag_editor(row: dict, save_tag_override) -> None:
    key = row["key"]
    with st.expander(f"Edit {row['category']} · {row['tag']}", expanded=True):
        c1, c2 = st.columns([1, 1])
        with c1:
            active = st.checkbox("Active for enrichment matching", value=row.get("active", True), key=f"tag_{key}_active")
            tag = st.text_input("Tag label", value=row.get("tag", ""), key=f"tag_{key}_label")
            concept_cluster = st.text_input("Concept cluster / grouping", value=row.get("concept_cluster", ""), key=f"tag_{key}_cluster")
        with c2:
            occurrences = st.number_input(
                "Occurrences",
                min_value=0,
                value=int(row.get("occurrences", 0) or 0),
                step=1,
                key=f"tag_{key}_occurrences",
            )
            st.text_input("Category", value=row.get("category", ""), disabled=True, key=f"tag_{key}_category")
        definition = st.text_area("Definition", value=row.get("definition", ""), height=110, key=f"tag_{key}_definition")
        connections = st.text_area("Connections from archive", value=row.get("connections", ""), height=120, key=f"tag_{key}_connections")
        researcher_note = st.text_area("Researcher note", value=row.get("researcher_note", ""), height=80, key=f"tag_{key}_note")
        if st.button("Save Tag Override", key=f"tag_{key}_save"):
            updates = {
                "active": active,
                "tag": tag,
                "concept_cluster": concept_cluster,
                "occurrences": occurrences,
                "definition": definition,
                "connections": connections,
                "researcher_note": researcher_note,
            }
            save_tag_override(key, updates)
            row.update(updates)
            st.success("Saved local tag override.")


def _render_longform_candidate_registry(corpus_dir: Path, save_custom_tag) -> None:
    candidates = _longform_candidate_rows(corpus_dir)
    with st.expander("📚 Longform review candidates", expanded=False):
        st.caption(
            "These are model-proposed candidates aggregated from deep longform review sections. "
            "They are not registry facts and they are not pushed to Sanity from here. "
            "Saving one creates a local Tag Registry hint for future enrichment/review; "
            "a Sanity record still requires the normal proposal approval/push flow."
        )
        if not candidates:
            st.info("No longform candidate registers found yet. Run deep longform review on a book/report first.")
            return
        counts = Counter(str(row["family"]) for row in candidates)
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Candidates", len(candidates))
        c2.metric("Terms", counts.get("lexicon", 0))
        c3.metric("Tactics", counts.get("tactic", 0))
        c4.metric("Practices / actors", counts.get("practice", 0) + counts.get("entity", 0))

        families = ["(all)"] + sorted(counts)
        family_filter = st.selectbox("Candidate family", families, key="tag_longform_family")
        search = st.text_input("Search longform candidates", key="tag_longform_search")
        visible = candidates
        if family_filter != "(all)":
            visible = [row for row in visible if row["family"] == family_filter]
        if search.strip():
            needle = search.lower().strip()
            visible = [
                row for row in visible
                if needle in str(row["label"]).lower()
                or needle in " ".join(str(item) for item in row.get("definitions", [])).lower()
            ]
        st.dataframe(
            [
                {
                    "doc_id": row["doc_id"],
                    "family": row["family"],
                    "label": row["label"],
                    "count": row["count"],
                    "confidence": row["confidence"],
                    "actions": ", ".join(row.get("candidate_actions") or []),
                }
                for row in visible[:300]
            ],
            hide_index=True,
            width="stretch",
        )
        if not visible:
            return
        options = [
            f"{row['family']} · {row['label']} · {row['doc_id']} · n={row['count']}"
            for row in visible
        ]
        selected = st.selectbox("Inspect candidate", options, key="tag_longform_selected")
        candidate = visible[options.index(selected)]
        st.markdown(f"**{candidate['label']}**")
        if candidate.get("definitions"):
            st.write("Definitions / roles:")
            for definition in candidate["definitions"][:5]:
                st.markdown(f"- {definition}")
        if candidate.get("evidence"):
            with st.expander("Evidence snippets", expanded=True):
                for item in candidate["evidence"][:8]:
                    st.caption(f"{item.get('section_id', '')} · {item.get('page_start', '')}-{item.get('page_end', '')}")
                    st.code(str(item.get("quote_or_note") or ""), language="text")

        category = _longform_candidate_tag_category(str(candidate["family"]))
        st.caption(f"Suggested local Tag Registry category: `{category}`")
        st.info(
            "Saving here means: local enrichment hint only. It will help future enrichment detect "
            "the term/tactic/practice/actor, but it does not create or push a Sanity registry record."
        )
        hint_col, proposal_col = st.columns(2)
        with hint_col:
            if st.button("Save as local enrichment hint (not Sanity)", key="tag_longform_promote"):
                try:
                    key = save_custom_tag(
                        category,
                        str(candidate["label"]),
                        _longform_candidate_to_tag_updates(candidate),
                    )
                except Exception as exc:
                    st.error(f"Could not save candidate: {exc}")
                else:
                    st.session_state.pop("tag_registry_rows", None)
                    st.success(f"Saved local tag override `{key}`. Reload Tag Registry to see it in the table.")
                    st.rerun()
        with proposal_col:
            family_options = {
                "Lexicon term": "lexicon_proposals",
                "Entity / actor": "entity_proposals",
                "Tactic": "tactic_proposals",
                "Practice evidence": "practice_descriptions",
            }
            default_family = _longform_default_proposal_family(str(candidate["family"]))
            labels = list(family_options)
            default_index = list(family_options.values()).index(default_family) if default_family in family_options.values() else 0
            proposal_label = st.selectbox(
                "Create review proposal as",
                labels,
                index=default_index,
                key="tag_longform_proposal_family",
            )
            target_family = family_options[proposal_label]
            entity_type = "person"
            if target_family == "entity_proposals":
                entity_type = st.selectbox(
                    "Entity type",
                    ["person", "organization"],
                    key="tag_longform_entity_type",
                    help="Use person for named individuals, organization for groups/projects/networks.",
                )
            if st.button("Create local proposal for review", key="tag_longform_create_proposal"):
                try:
                    created = _create_longform_candidate_enrichment_proposal(
                        corpus_dir,
                        candidate,
                        target_family=target_family,
                        entity_type=entity_type,
                    )
                except Exception as exc:
                    st.error(f"Could not create proposal: {exc}")
                else:
                    target_queue = {
                        "lexicon_proposals": "Lexicon Queue",
                        "entity_proposals": "Entity Queue",
                        "tactic_proposals": "Tactic Queue",
                        "practice_descriptions": "Practice Evidence",
                    }.get(created["key"], "Local Proposals")
                    st.session_state["lexicon_active_section"] = "Local Proposals"
                    st.session_state["local_proposal_active_queue"] = target_queue
                    st.session_state["_nav_to"] = "Lexicon"
                    st.success(f"Created `{candidate['label']}` in {target_queue}.")
                    st.rerun()


def _render_govuk_source_glossary(config) -> None:
    from runner.pipeline.govuk_glossary import (
        load_manifest,
        manifest_fingerprint,
        sanity_authority_rows,
        seed_memory_terms,
    )

    try:
        payload = load_manifest()
        memory_rows = seed_memory_terms()
    except Exception as exc:
        st.error(f"The GOV.UK glossary manifest is invalid and has been disabled: {exc}")
        return
    st.subheader("GOV.UK 2021 source glossary")
    st.markdown(
        "All **35 official source terms** are now stored in a versioned local manifest and are available "
        "to Enrichment as `seed_draft` reference memory. The compact source definitions are injected only "
        "when a matching term appears, with hard context limits."
    )
    st.warning(
        "These are **source-attested, not archive-validated**. The GOV.UK report establishes how that report "
        "uses the wording; it does not automatically validate a universal definition, a SOGICE relationship, "
        "or public publication. Draft trust for Analysis is also a separate decision."
    )
    c1, c2, c3 = st.columns(3)
    c1.metric("Official source terms", len(payload["terms"]))
    c2.metric("Canonical draft concepts", len(memory_rows))
    c3.metric("Analysis-trusted automatically", 0)
    st.caption(
        f"Manifest `{manifest_fingerprint(payload)[:16]}…` · {payload['source']['publication_date']} · "
        f"{payload['source']['licence']}"
    )
    st.markdown(f"[Open the official glossary]({payload['source']['url']})")
    st.dataframe(
        [
            {
                "Source term": row["source_term"],
                "Canonical mapping": row["canonical_term"],
                "Mapping": row["mapping"],
                "Source attested": "yes",
                "Analysis trusted": "no",
                "Archive policy default": "draft / separate review",
                "Researcher summary of source definition": row["source_definition"],
            }
            for row in payload["terms"]
        ],
        width="stretch",
        hide_index=True,
    )
    with st.expander("What still needs a researcher decision", expanded=True):
        st.markdown(
            "1. **Source attestation:** already recorded locally with URL, publisher, date, licence, and definition.\n"
            "2. **Trust for Analysis orientation:** remains off unless you explicitly enable a draft in Sanity.\n"
            "3. **Canonical archive validation:** remains a separate evidence-backed decision in Sanity Lexicon.\n\n"
            "The authority sync below is non-destructive: it creates missing drafts and appends missing source "
            "attestations, but never replaces definitions, evidence, validation status, or Analysis trust."
        )
    st.divider()
    st.markdown("**Optional Sanity authority sync**")
    st.caption(
        "This is a live write to Sanity. It materialises the 33 canonical draft concepts and all 35 source "
        "attestations. It does not validate terms, enable Analysis trust, or overwrite existing definitions."
    )
    confirmed = st.checkbox(
        "I understand this adds/updates draft source attestations in Sanity",
        key="govuk_authority_sync_confirm",
    )
    if st.button(
        "Sync GOV.UK attestations to Sanity",
        disabled=not confirmed,
        key="govuk_authority_sync_run",
    ):
        try:
            from runner.clients.sanity import sync_authority_lexicon_rows

            result = sync_authority_lexicon_rows(sanity_authority_rows(), config)
        except Exception as exc:
            st.error(f"GOV.UK authority sync stopped before completion: {exc}")
        else:
            st.success(
                f"Authority sync complete: {result['created']} created, {result['updated']} updated, "
                f"{result['unchanged']} unchanged. Canonical validation and Analysis trust were not changed."
            )


def _render_seed_lexicon_import(config) -> None:
    st.info(
        "Preview the local Markdown lexicon before it enters Sanity. "
        "A source verifies that the source used a term; it does not by itself validate the archive's canonical definition. "
        "Seed entries therefore default to draft and require a separate researcher validation decision."
    )
    seed_path = _project_root / "00_infrastructure" / "SOGICE_Lexicon_v2.1.md"
    if not seed_path.exists():
        st.error(f"Seed lexicon file not found: {seed_path}")
        return

    if st.button("Reload seed lexicon preview"):
        st.session_state.pop("seed_lexicon_rows", None)

    if "seed_lexicon_rows" not in st.session_state:
        st.session_state.seed_lexicon_rows = _parse_seed_lexicon(seed_path)

    rows = st.session_state.seed_lexicon_rows
    if not rows:
        st.warning("No lexicon entries were parsed from the seed document.")
        return

    draft_count = sum(1 for row in rows if row.get("recommended_status") == "draft")
    validated_count = sum(1 for row in rows if row.get("recommended_status") == "validated")
    pushed_count = sum(1 for row in rows if row.get("pushed_to_sanity"))
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Parsed entries", len(rows))
    c2.metric("Recommended draft", draft_count)
    c3.metric("Recommended validated", validated_count)
    c4.metric("Pushed this session", pushed_count)

    filter_status = st.selectbox("Status filter", ["All", "draft", "validated", "pushed"])
    visible_rows = rows
    if filter_status == "pushed":
        visible_rows = [row for row in rows if row.get("pushed_to_sanity")]
    elif filter_status != "All":
        visible_rows = [row for row in rows if row.get("status") == filter_status]

    st.caption("Use the table for batch selection/status changes, then use the detail editor for definitions and notes.")
    table_rows = [
        {
            "import_entry": row.get("import_entry", False),
            "term": row["term"],
            "status": row.get("status", "draft"),
            "recommended_status": row.get("recommended_status", "draft"),
            "cluster": row.get("proposed_cluster", ""),
            "function": row.get("function", ""),
            "has_source": bool(row.get("source_url") or row.get("source_note")),
            "pushed_to_sanity": row.get("pushed_to_sanity", False),
        }
        for row in visible_rows
    ]
    edited_rows = st.data_editor(
        table_rows,
        width="stretch",
        hide_index=True,
        disabled=["term", "recommended_status", "cluster", "function", "has_source", "pushed_to_sanity"],
        column_config={
            "import_entry": st.column_config.CheckboxColumn("Import"),
            "status": st.column_config.SelectboxColumn("Status", options=["draft"]),
        },
        key="seed_lexicon_editor",
    )
    _merge_seed_table_edits(rows, edited_rows)

    selected_terms = [row["term"] for row in rows]
    selected_term = st.selectbox("Detailed edit", selected_terms)
    selected_index = selected_terms.index(selected_term)
    _render_seed_entry_editor(rows, selected_index)

    selected_for_import = [
        row for row in rows
        if row.get("import_entry") and not row.get("pushed_to_sanity")
    ]
    checklist_errors = _selected_lexicon_checklist_errors(selected_for_import)
    st.caption(f"{len(selected_for_import)} selected entry/entries. Checklist issues: {len(checklist_errors)}.")
    if checklist_errors:
        with st.expander("Checklist issues before push", expanded=True):
            st.write("\n".join(checklist_errors[:30]))
    if st.button("Push selected seed entries to Sanity", type="primary", disabled=(not selected_for_import or bool(checklist_errors))):
        pushed = 0
        deferred_variants: list[str] = []
        errors: list[str] = []
        for row in selected_for_import:
            try:
                from runner.clients.sanity import write_seed_lexicon_entry
                sanity_id = write_seed_lexicon_entry(row, config)
                row["pushed_to_sanity"] = True
                row["sanity_id"] = sanity_id
                row["import_entry"] = False
                pushed += 1
            except Exception as exc:
                errors.append(f"{row.get('term', '?')}: {exc}")
        st.session_state.pop("lexicon_terms", None)
        if pushed:
            st.success(f"Pushed {pushed} seed lexicon entr{'y' if pushed == 1 else 'ies'} to Sanity.")
        if errors:
            st.error("\n".join(errors))


def _render_variant_import(config) -> None:
    st.info(
        "Attach translated/regional terms to their canonical lexicon entry. "
        "These variants stay searchable in Sanity and are injected into analysis/enrichment prompts."
    )
    seed_path = _project_root / "00_infrastructure" / "SOGICE_Lexicon_v2.1.md"
    if st.button("Reload variant preview"):
        st.session_state.pop("seed_variant_rows", None)
        st.session_state.pop("lexicon_terms", None)

    if "seed_variant_rows" not in st.session_state:
        st.session_state.seed_variant_rows = _parse_multilingual_variants(seed_path)
    if "lexicon_terms" not in st.session_state:
        try:
            from runner.clients.sanity import fetch_lexicon_terms
            st.session_state.lexicon_terms = fetch_lexicon_terms(config)
        except Exception as exc:
            st.error(f"Could not fetch canonical lexicon terms from Sanity: {exc}")
            st.session_state.lexicon_terms = []

    rows = st.session_state.seed_variant_rows
    terms = st.session_state.lexicon_terms
    term_ids = {term.get("term", ""): term.get("_id", "") for term in terms}
    for row in rows:
        row["canonical_id"] = term_ids.get(row["canonical_term"], row.get("canonical_id", ""))
        row["canonical_in_sanity"] = bool(row["canonical_id"])

    missing = sorted({row["canonical_term"] for row in rows if not row["canonical_in_sanity"]})
    c1, c2, c3 = st.columns(3)
    c1.metric("Variant rows", len(rows))
    c2.metric("Canonical terms found", len({row["canonical_term"] for row in rows if row["canonical_in_sanity"]}))
    c3.metric("Canonical terms missing", len(missing))
    if missing:
        st.warning(
            "Import the canonical seed terms first for: " + ", ".join(missing[:12])
            + ("..." if len(missing) > 12 else "")
        )

    edited_rows = st.data_editor(
        [
            {
                "import_variant": row.get("import_variant", False),
                "canonical_term": row["canonical_term"],
                "variant_term": row["variant_term"],
                "language": row["language"],
                "attestation_tier": row["attestation_tier"],
                "canonical_in_sanity": row["canonical_in_sanity"],
                "pushed_to_sanity": row.get("pushed_to_sanity", False),
            }
            for row in rows
        ],
        width="stretch",
        hide_index=True,
        disabled=["canonical_term", "variant_term", "language", "canonical_in_sanity", "pushed_to_sanity"],
        column_config={
            "import_variant": st.column_config.CheckboxColumn("Import"),
            "attestation_tier": st.column_config.SelectboxColumn(
                "Attestation",
                options=["tier-1-legal", "tier-2-ngo-academic", "tier-3-inferred"],
            ),
        },
        key="seed_variant_editor",
    )
    _merge_variant_table_edits(rows, edited_rows)

    selected = [
        row for row in rows
        if row.get("import_variant")
        and row.get("canonical_in_sanity")
        and not row.get("pushed_to_sanity")
    ]
    st.caption(f"{len(selected)} selected variant(s) ready to attach.")
    if st.button("Push selected variants to Sanity", type="primary", disabled=not selected):
        pushed = 0
        errors: list[str] = []
        for row in selected:
            try:
                from runner.clients.sanity import write_seed_lexicon_variant
                sanity_id = write_seed_lexicon_variant(row, config)
                row["pushed_to_sanity"] = True
                row["sanity_id"] = sanity_id
                row["import_variant"] = False
                pushed += 1
            except Exception as exc:
                errors.append(f"{row.get('canonical_term')} / {row.get('variant_term')}: {exc}")
        st.session_state.pop("lexicon_terms", None)
        if pushed:
            st.success(f"Attached {pushed} multilingual variant(s) to Sanity lexicon entries.")
        if errors:
            st.error("\n".join(errors))


def _merge_variant_table_edits(rows: list[dict], edited_rows: list[dict]) -> None:
    by_key = {(row["canonical_term"], row["variant_term"], row["language"]): row for row in rows}
    for edited in edited_rows:
        row = by_key.get((edited.get("canonical_term"), edited.get("variant_term"), edited.get("language")))
        if not row:
            continue
        row["import_variant"] = bool(edited.get("import_variant"))
        row["attestation_tier"] = edited.get("attestation_tier") or row["attestation_tier"]


def _parse_multilingual_variants(path: Path) -> list[dict]:
    rows: list[dict] = []
    language_codes = {
        "Norwegian": "no",
        "Italian": "it",
        "French": "fr",
        "German": "de",
        "Spanish": "es",
        "Polish": "pl",
        "Finnish": "fi",
        "Swedish": "sv",
        "Hungarian": "hu",
        "Greek": "el",
        "Maltese": "mt",
    }
    table_lines = [
        line.strip()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip().startswith("|")
    ]
    if not table_lines:
        return rows

    header: list[str] = []
    for line in table_lines:
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if cells and cells[0] == "English":
            header = cells
            continue
        if not header or not cells or cells[0] in {"---", "Tier"} or set(cells[0]) == {"-"}:
            continue
        if len(cells) != len(header):
            continue
        canonical = cells[0]
        if canonical in {"Gender Ideology", "Gender Dysphoria", "Reparative Therapy", "Conversion Therapy", "Conversion Practices", "Pastoral Support", "Watchful Waiting", "Self-determination", "Same-sex attraction"}:
            for lang_name, cell in zip(header[1:], cells[1:]):
                variant = cell.strip()
                if not variant or variant == "—":
                    continue
                rows.append({
                    "import_variant": False,
                    "canonical_term": canonical,
                    "canonical_id": "",
                    "canonical_in_sanity": False,
                    "variant_term": _clean_variant_cell(variant),
                    "language": language_codes.get(lang_name, "unknown"),
                    "attestation_tier": _attestation_tier_for_variant(lang_name, variant),
                    "source_note": f"SOGICE_Lexicon_v2.0 multilingual quick reference: {lang_name}.",
                    "pushed_to_sanity": False,
                })
    return rows


def _clean_variant_cell(value: str) -> str:
    return re.sub(r"\s*\(T[123]\)\s*", "", value).strip()


def _attestation_tier_for_variant(language_name: str, value: str) -> str:
    if "(T1)" in value:
        return "tier-1-legal"
    if "(T2)" in value:
        return "tier-2-ngo-academic"
    if language_name == "Hungarian":
        return "tier-3-inferred"
    return "tier-2-ngo-academic"


def _render_legacy_vocabulary_import(config) -> None:
    st.info(
        "Review the April 2026 legacy glossary before importing. "
        "Rows that already exist in the current seed lexicon are shown for comparison but are not pushed as new canonical entries."
    )
    if st.button("Reload legacy vocabulary"):
        st.session_state.pop("legacy_vocab_rows", None)

    if "legacy_vocab_rows" not in st.session_state:
        st.session_state.legacy_vocab_rows = _parse_legacy_vocabulary()

    rows = st.session_state.legacy_vocab_rows
    if not rows:
        st.warning("No legacy vocabulary rows were loaded. Check the OneDrive backup paths.")
        return

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Legacy terms", len(rows))
    c2.metric("New vs current seed", sum(1 for row in rows if not row.get("exists_in_seed")))
    c3.metric("Already in seed", sum(1 for row in rows if row.get("exists_in_seed")))
    c4.metric("With source URLs", sum(1 for row in rows if row.get("source_url")))

    filter_mode = st.selectbox(
        "Filter",
        ["New only", "All", "Already in current seed", "With source URL", "Non-English"],
        key="legacy_filter",
    )
    visible = rows
    if filter_mode == "New only":
        visible = [row for row in rows if not row.get("exists_in_seed")]
    elif filter_mode == "Already in current seed":
        visible = [row for row in rows if row.get("exists_in_seed")]
    elif filter_mode == "With source URL":
        visible = [row for row in rows if row.get("source_url")]
    elif filter_mode == "Non-English":
        visible = [row for row in rows if row.get("language") not in {"", "en", "unknown"}]

    edited_rows = st.data_editor(
        [
            {
                "import_entry": row.get("import_entry", False),
                "term": row["term"],
                "status": row.get("status", "draft"),
                "language": row.get("language", "unknown"),
                "cluster": row.get("proposed_cluster", ""),
                "function": row.get("function", ""),
                "occurrences": row.get("occurrence_count", 0),
                "has_source": bool(row.get("source_url")),
                "exists_in_seed": row.get("exists_in_seed", False),
                "pushed_to_sanity": row.get("pushed_to_sanity", False),
            }
            for row in visible
        ],
        width="stretch",
        hide_index=True,
        disabled=["term", "language", "cluster", "function", "occurrences", "has_source", "exists_in_seed", "pushed_to_sanity"],
        column_config={
            "import_entry": st.column_config.CheckboxColumn("Import"),
            "status": st.column_config.SelectboxColumn("Status", options=["draft", "validated"]),
        },
        key="legacy_vocab_editor",
    )
    _merge_legacy_table_edits(rows, edited_rows)

    terms = [row["term"] for row in rows]
    selected_term = st.selectbox("Detailed legacy term review", terms, key="legacy_detail_select")
    selected_index = terms.index(selected_term)
    _render_legacy_entry_editor(rows, selected_index)

    selected = [
        row for row in rows
        if row.get("import_entry")
        and not row.get("exists_in_seed")
        and not row.get("pushed_to_sanity")
    ]
    skipped_existing = sum(1 for row in rows if row.get("import_entry") and row.get("exists_in_seed"))
    if skipped_existing:
        st.warning(f"{skipped_existing} selected row(s) already exist in the current seed lexicon and will be skipped.")
    checklist_errors = _selected_lexicon_checklist_errors(selected)
    st.caption(f"{len(selected)} legacy term(s) selected. Checklist issues: {len(checklist_errors)}.")
    if checklist_errors:
        with st.expander("Checklist issues before push", expanded=True):
            st.write("\n".join(checklist_errors[:30]))
    if st.button("Push selected legacy terms to Sanity", type="primary", disabled=(not selected or bool(checklist_errors))):
        pushed = 0
        errors: list[str] = []
        for row in selected:
            try:
                from runner.clients.sanity import write_seed_lexicon_entry
                sanity_id = write_seed_lexicon_entry(row, config)
                row["pushed_to_sanity"] = True
                row["sanity_id"] = sanity_id
                row["import_entry"] = False
                pushed += 1
            except Exception as exc:
                errors.append(f"{row.get('term', '?')}: {exc}")
        st.session_state.pop("lexicon_terms", None)
        if pushed:
            st.success(f"Pushed {pushed} legacy term(s) to Sanity.")
        if errors:
            st.error("\n".join(errors))


def _render_legacy_entry_editor(rows: list[dict], index: int) -> None:
    row = dict(rows[index])
    prefix = f"legacy_{index}"
    with st.expander(f"Edit legacy term: {row['term']}", expanded=False):
        c1, c2 = st.columns([1, 1])
        with c1:
            row["term"] = st.text_input("Term", value=row.get("term", ""), key=f"{prefix}_term")
            row["language"] = st.text_input("Language", value=row.get("language", "unknown"), key=f"{prefix}_language")
            row["status"] = st.selectbox(
                "Import status",
                ["draft"],
                index=0,
                key=f"{prefix}_status",
            )
            row["proposed_cluster"] = st.text_input("Cluster", value=row.get("proposed_cluster", ""), key=f"{prefix}_cluster")
            row["function"] = st.text_input("Function", value=row.get("function", ""), key=f"{prefix}_function")
        with c2:
            row["source_url"] = st.text_input("Source URL", value=row.get("source_url", ""), key=f"{prefix}_source")
            row["occurrence_count"] = st.number_input(
                "Occurrence count",
                min_value=0,
                value=int(row.get("occurrence_count", 0) or 0),
                step=1,
                key=f"{prefix}_occurrences",
            )
            st.checkbox("Already exists in current seed", value=row.get("exists_in_seed", False), disabled=True, key=f"{prefix}_exists")
        row["draft_definition"] = st.text_area("Definition", value=row.get("draft_definition", ""), height=130, key=f"{prefix}_definition")
        row["accessible_definition"] = st.text_area(
            "Accessible definition",
            value=row.get("accessible_definition", ""),
            height=80,
            key=f"{prefix}_accessible",
        )
        row["source_note"] = st.text_area("Source/provenance note", value=row.get("source_note", ""), height=100, key=f"{prefix}_note")
        if st.button("Save legacy edits", key=f"{prefix}_save"):
            rows[index] = row
            st.success("Saved edits in the preview session.")


def _merge_legacy_table_edits(rows: list[dict], edited_rows: list[dict]) -> None:
    by_term = {row["term"]: row for row in rows}
    for edited in edited_rows:
        row = by_term.get(edited.get("term"))
        if not row:
            continue
        row["import_entry"] = bool(edited.get("import_entry"))
        row["status"] = edited.get("status") or row.get("status", "draft")


def _parse_legacy_vocabulary() -> list[dict]:
    glossary_path = _legacy_vocab_dir / "sogice_glossary_2026-04-03.json"
    csv_path = _legacy_vocab_dir / "sogice_vocabulary_2026-04-03.csv"
    if not glossary_path.exists():
        return []

    current_seed = {
        _term_key(row["term"])
        for row in _parse_seed_lexicon(_project_root / "00_infrastructure" / "SOGICE_Lexicon_v2.1.md")
    }
    csv_terms = _legacy_csv_terms(csv_path)

    data = json.loads(glossary_path.read_text(encoding="utf-8"))
    rows: list[dict] = []
    seen: set[str] = set()
    for entry in data.get("entries", []):
        term = (entry.get("term") or "").strip()
        if not term:
            continue
        key = _term_key(term)
        if key in seen:
            continue
        seen.add(key)
        csv_meta = csv_terms.get(key, {})
        source_urls = entry.get("source_urls") or []
        source_url = entry.get("source_url") or (source_urls[0] if source_urls else "")
        definition = entry.get("draft_definition") or csv_meta.get("definition", "")
        context_quote = entry.get("context_quote", "")
        source_note_parts = [
            "Legacy vocabulary import from April 3, 2026.",
            f"Review status: {entry.get('review_status', 'pending')}.",
        ]
        if context_quote:
            source_note_parts.append(f"Context quote: {context_quote}")
        if source_urls:
            source_note_parts.append("Source URLs: " + " | ".join(source_urls))
        if csv_meta.get("connections"):
            source_note_parts.append("CSV connections: " + csv_meta["connections"])

        rows.append({
            "import_entry": False,
            "term": term,
            "expansion": entry.get("suggests_new_tag", ""),
            "status": "draft",
            "recommended_status": "draft",
            "recommendation_reason": "legacy glossary entries were pending review; import as draft unless manually validated",
            "language": entry.get("language") or "unknown",
            "proposed_cluster": _map_legacy_cluster(entry.get("concept_cluster", "")),
            "function": _map_legacy_function(entry.get("proposed_category", "")),
            "draft_definition": definition,
            "accessible_definition": _plain_first_sentence(definition) if definition else "",
            "source_url": source_url,
            "source_note": " ".join(source_note_parts),
            "related": "",
            "occurrence_count": int(entry.get("occurrence_count") or csv_meta.get("occurrences") or 0),
            "frequency": int(entry.get("occurrence_count") or csv_meta.get("occurrences") or 0),
            "exists_in_seed": key in current_seed,
            "pushed_to_sanity": False,
        })
    return rows


def _legacy_csv_terms(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    import csv
    terms: dict[str, dict] = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("Category") not in {"Term", "Term (discovered)"}:
                continue
            term = (row.get("Tag") or "").replace("Term:", "", 1).strip()
            if not term:
                continue
            terms[_term_key(term)] = {
                "definition": row.get("Definition", ""),
                "connections": row.get("Connections from Archive", ""),
                "occurrences": row.get("Occurrences", "0"),
            }
    return terms


def _term_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _map_legacy_cluster(value: str) -> str:
    text = (value or "").lower()
    if "ssa" in text:
        return "SSA-Rhetoric"
    if "pastoral" in text:
        return "Pastoral-Coercion"
    if "pseudo" in text or "clinical" in text or "patholog" in text or "method" in text:
        return "Pseudo-Science"
    if "policy" in text or "rights" in text or "legal" in text:
        return "Policy-Resistance"
    if "anti-trans" in text or "detrans" in text or "social-contagion" in text:
        return "Anti-Trans/ROGD"
    if "anti-gender" in text or "political" in text:
        return "Anti-Gender"
    if "non-sogice" in text or "ethics" in text or "scientific" in text:
        return "Non-SOGICE"
    return ""


def _map_legacy_function(value: str) -> str:
    text = (value or "").lower()
    if "slur" in text or "hate" in text:
        return "Slur"
    if "euphemism" in text:
        return "Euphemism"
    if "conspiracy" in text:
        return "Conspiracy"
    if "pseudo" in text:
        return "Pseudo-Diagnostic"
    if "identity" in text:
        return "Identity-Policing"
    if "pastoral" in text:
        return "Pastoral Rhetoric"
    if "recruitment" in text:
        return "Recruitment Frame"
    if "slogan" in text or "policy" in text or "political" in text:
        return "Political Slogan"
    return ""


def _render_seed_entry_editor(rows: list[dict], index: int) -> None:
    row = dict(rows[index])
    prefix = f"seed_{index}"
    with st.expander(f"Edit {row['term']}", expanded=True):
        c1, c2 = st.columns([1, 1])
        with c1:
            row["term"] = st.text_input("Term", value=row.get("term", ""), key=f"{prefix}_term")
            row["status"] = st.selectbox(
                "Import status",
                ["draft"],
                index=0,
                key=f"{prefix}_status",
                help="Seed import creates drafts only. Canonical validation is a separate researcher action in Sanity Lexicon.",
            )
            row["proposed_cluster"] = st.text_input("Cluster", value=row.get("proposed_cluster", ""), key=f"{prefix}_cluster")
            row["function"] = st.text_input("Function", value=row.get("function", ""), key=f"{prefix}_function")
        with c2:
            row["source_url"] = st.text_input("Source URL", value=row.get("source_url", ""), key=f"{prefix}_source_url")
            row["source_note"] = st.text_area("Source note / provenance", value=row.get("source_note", ""), height=90, key=f"{prefix}_source_note")
            row["related"] = st.text_input("Related terms from seed", value=row.get("related", ""), key=f"{prefix}_related")

        row["draft_definition"] = st.text_area(
            "Academic definition",
            value=row.get("draft_definition", ""),
            height=150,
            key=f"{prefix}_definition",
        )
        row["accessible_definition"] = st.text_area(
            "Accessible definition",
            value=row.get("accessible_definition", ""),
            height=90,
            key=f"{prefix}_accessible",
        )
        st.caption(f"Recommended by parser: {row.get('recommended_status', 'draft')} · {row.get('recommendation_reason', '')}")
        if st.button("Save seed entry edits", key=f"{prefix}_save"):
            rows[index] = row
            st.success("Saved edits in the preview session.")


def _merge_seed_table_edits(rows: list[dict], edited_rows: list[dict]) -> None:
    by_term = {row["term"]: row for row in rows}
    for edited in edited_rows:
        row = by_term.get(edited.get("term"))
        if not row:
            continue
        row["import_entry"] = bool(edited.get("import_entry"))
        row["status"] = edited.get("status") or row.get("status", "draft")


def _selected_lexicon_checklist_errors(rows: list[dict]) -> list[str]:
    errors: list[str] = []
    for row in rows:
        issues = _lexicon_import_issues(row)
        if issues:
            errors.append(f"{row.get('term', '(missing term)')}: " + "; ".join(issues))
    return errors


def _lexicon_import_issues(row: dict) -> list[str]:
    issues: list[str] = []
    if not (row.get("term") or "").strip():
        issues.append("missing term")
    if not (row.get("proposed_cluster") or "").strip():
        issues.append("missing cluster")
    if not (row.get("function") or "").strip():
        issues.append("missing function")
    if not (row.get("draft_definition") or row.get("definition") or "").strip():
        issues.append("missing definition")
    if not (row.get("accessible_definition") or "").strip():
        issues.append("missing accessible definition")
    if row.get("status") == "validated" and not (row.get("source_url") or row.get("source_note")):
        issues.append("validated entries need source evidence")
    return issues


def _parse_seed_lexicon(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    entries: list[dict] = []
    current_heading: tuple[str, str] | None = None
    current_lines: list[str] = []
    current_section = ""
    heading_re = re.compile(r"^\*\*(.+?)\*\*(?:\s*\((.*?)\))?\s*$")
    inline_re = re.compile(r"^\*\*(.+?)\*\*\s+—\s+(.+)$")

    def flush() -> None:
        if not current_heading or current_section == "SECTION 13":
            return
        entry = _parse_seed_entry(current_heading[0], current_heading[1], current_lines)
        if entry:
            entries.append(entry)

    for line in text.splitlines():
        stripped = line.strip()
        section_match = re.match(r"^##\s+(SECTION\s+\d+)\b", stripped)
        if section_match:
            flush()
            current_heading = None
            current_lines = []
            current_section = section_match.group(1)
            continue
        if current_section == "SECTION 13":
            continue
        inline_match = inline_re.match(stripped)
        heading_match = heading_re.match(stripped)
        if inline_match:
            flush()
            current_heading = None
            current_lines = []
            entry = _parse_inline_seed_entry(inline_match.group(1).strip(), inline_match.group(2).strip())
            if entry:
                entries.append(entry)
        elif heading_match:
            flush()
            current_heading = (heading_match.group(1).strip(), (heading_match.group(2) or "").strip())
            current_lines = []
        elif current_heading:
            current_lines.append(line.rstrip())
    flush()
    return entries


def _parse_inline_seed_entry(term: str, remainder: str) -> dict | None:
    if "|" not in remainder:
        return None
    cluster_part, rest = remainder.split("|", 1)
    function_part, _, definition_part = rest.partition(".")
    definition = definition_part.strip()
    function_raw = function_part.strip()
    proposed_cluster = _normalize_seed_option(
        cluster_part,
        [
            "SSA-Rhetoric", "Pastoral-Coercion", "Pseudo-Science",
            "Policy-Resistance", "Anti-Trans/ROGD", "Anti-Gender",
            "Pro-Trans-SOGICE", "Non-SOGICE",
        ],
    )
    function = _normalize_seed_option(
        function_raw,
        [
            "Slur", "Euphemism", "Conspiracy", "Pseudo-Diagnostic",
            "Identity-Policing", "Moral-Purity Frame", "Political Slogan",
            "Recruitment Frame", "Pastoral Rhetoric", "Disinformation Narrative",
            "Promotional Recruitment", "Testimonial Marketing",
        ],
    )
    if not function and any(word in function_raw.lower() for word in ["pejorative", "dehumanizing", "troll"]):
        function = "Slur"
    if not proposed_cluster or not definition:
        return None

    definition = (
        'Mandatory framing: "This term appears in the SurvivingSOGICE corpus as a slur or harmful term used against LGBTQ+ people. '
        'It is documented here for research completeness. Documentation does not constitute endorsement." '
        + definition
    )
    return {
        "import_entry": False,
        "term": term,
        "expansion": "",
        "status": "draft",
        "recommended_status": "draft",
        "recommendation_reason": "inline harmful/reference term; requires corpus evidence before validation",
        "proposed_cluster": proposed_cluster,
        "function": function,
        "draft_definition": definition,
        "accessible_definition": _plain_first_sentence(definition),
        "source_url": "",
        "source_note": "Seed lexicon inline harmful/reference terminology section.",
        "related": "",
        "pushed_to_sanity": False,
    }


def _parse_seed_entry(term: str, expansion: str, lines: list[str]) -> dict | None:
    cluster_line = _first_prefixed_line(lines, "- Cluster:")
    definition = _first_prefixed_value(lines, "- Definition:")
    if not cluster_line or not definition:
        return None

    source_note = _first_prefixed_line(lines, "- Source:")
    related = _first_prefixed_value(lines, "- Related:")
    source_url = ""
    for line in lines:
        url_match = re.search(r"https?://\S+", line)
        if url_match:
            source_url = url_match.group(0).rstrip(".,)")
            break

    proposed_cluster = _normalize_seed_option(
        cluster_line.split("Cluster:", 1)[1].split("|", 1)[0],
        [
            "SSA-Rhetoric", "Pastoral-Coercion", "Pseudo-Science",
            "Policy-Resistance", "Anti-Trans/ROGD", "Anti-Gender",
            "Pro-Trans-SOGICE", "Non-SOGICE",
        ],
    )
    function_value = cluster_line.split("Function:", 1)[1] if "Function:" in cluster_line else ""
    function = _normalize_seed_option(
        function_value,
        [
            "Slur", "Euphemism", "Conspiracy", "Pseudo-Diagnostic",
            "Identity-Policing", "Moral-Purity Frame", "Political Slogan",
            "Recruitment Frame", "Pastoral Rhetoric", "Disinformation Narrative",
            "Promotional Recruitment", "Testimonial Marketing",
        ],
    )

    has_source_evidence = bool(source_url or source_note)
    recommended_status = "draft"
    reason = (
        "source-attested draft; canonical archive validation is a separate researcher decision"
        if has_source_evidence
        else "draft needs source evidence from ingested documents"
    )
    accessible_definition = _plain_first_sentence(definition)

    return {
        "import_entry": False,
        "term": term,
        "expansion": expansion,
        "status": recommended_status,
        "recommended_status": recommended_status,
        "recommendation_reason": reason,
        "proposed_cluster": proposed_cluster,
        "function": function,
        "draft_definition": definition,
        "accessible_definition": accessible_definition,
        "source_url": source_url,
        "source_note": source_note.replace("- Source:", "", 1).strip() if source_note else "",
        "related": related,
        "pushed_to_sanity": False,
    }


def _first_prefixed_line(lines: list[str], prefix: str) -> str:
    for line in lines:
        if line.strip().startswith(prefix):
            return line.strip()
    return ""


def _first_prefixed_value(lines: list[str], prefix: str) -> str:
    line = _first_prefixed_line(lines, prefix)
    return line.replace(prefix, "", 1).strip() if line else ""


def _normalize_seed_option(value: str, allowed: list[str]) -> str:
    cleaned = re.sub(r"\([^)]*\)", "", value).replace("Candidate — corpus validation required", "")
    pieces = [piece.strip() for piece in re.split(r"/|\|", cleaned) if piece.strip()]
    for piece in pieces:
        if piece in allowed:
            return piece
    for option in allowed:
        if option.lower() in cleaned.lower():
            return option
    return ""


def _plain_first_sentence(value: str, max_chars: int = 240) -> str:
    cleaned = re.sub(r"\*\*|`|→", "", value).strip()
    parts = re.split(r"(?<=[.!?])\s+", cleaned)
    first = parts[0] if parts else cleaned
    if len(first) <= max_chars:
        return first
    return first[: max_chars - 1].rstrip() + "…"


def _short_label(value: str, max_chars: int = 100) -> str:
    value = re.sub(r"\s+", " ", value or "").strip()
    if len(value) <= max_chars:
        return value
    return value[: max_chars - 1].rstrip() + "…"


def _proposal_review_status(item: dict) -> str:
    # P2: Use proposal_status if present (set by pipeline and kept in sync).
    # Falls back to boolean derivation for files that pre-date P2.
    status = item.get("proposal_status")
    if status == "pushed":
        return "Pushed"
    if status == "rejected":
        return "Rejected"
    if status == "approved":
        return "Approved, not pushed"
    if status == "pending":
        return "Needs review"
    # Backward-compat: derive from booleans for older enrichment files.
    if item.get("rejected"):
        return "Rejected"
    if item.get("approved") and item.get("pushed_to_sanity"):
        return "Pushed"
    if item.get("approved"):
        return "Approved, not pushed"
    return "Needs review"


_ENTITY_REGISTRY_FIT_OPTIONS = [
    "registry_entity",
    "media_or_source",
    "not_entity",
    "needs_review",
]

_ENTITY_REGISTRY_FIT_LABELS = {
    "registry_entity": "Registry entity",
    "media_or_source": "Media/source, not entity",
    "not_entity": "Not an entity",
    "needs_review": "Needs decision",
}

_ENTITY_REGISTRY_FIT_HELP = {
    "registry_entity": (
        "Eligible for Sanity organization/person registry after normal approval."
    ),
    "media_or_source": (
        "Keep as local evidence or ingest as a source/document; do not push as "
        "organization/person."
    ),
    "not_entity": "Reject locally; this proposal should not become a registry record.",
    "needs_review": "Hold for researcher decision before approval or push.",
}


_PRACTICE_FIT_OPTIONS = [
    "needs_clustering",
    "candidate_evidence",
    "existing_practice",
    "registry_practice",
    "not_practice",
]

_PRACTICE_FIT_LABELS = {
    "needs_clustering": "Needs framing",
    "candidate_evidence": "Evidence only",
    "existing_practice": "Existing practice evidence",
    "registry_practice": "Promote to registry practice",
    "not_practice": "Not a practice",
}

_PRACTICE_FIT_HELP = {
    "needs_clustering": (
        "Temporary state for model-created practice-like evidence before it is framed. "
        "Choose/save a cluster to keep it as evidence, or deliberately link/promote it."
    ),
    "candidate_evidence": (
        "Use when the quote is useful evidence under a broader cluster, tactic, or strategy, "
        "but should not become its own practice registry entry. It stays local and is blocked "
        "from Sanity push."
    ),
    "existing_practice": (
        "Use when Sanity already has the practice and this document only adds evidence. "
        "Fill existing_practice_id before approval so the push updates the right record "
        "instead of creating a duplicate."
    ),
    "registry_practice": (
        "Use only after researcher review decides this is a stable, reusable practice "
        "category. Approval makes it eligible to create a new Sanity practice draft."
    ),
    "not_practice": (
        "Use when the item is really a tactic, claim, entity, tag, vague phrase, or "
        "otherwise not practice-registry material. It is rejected locally."
    ),
}

_PRACTICE_FIT_DECISION_GUIDE = {
    "Needs framing": (
        "Temporary default for model-created labels like ROGD-Diagnosis. Once you choose "
        "a real cluster, save it as evidence unless you are deliberately linking/promoting."
    ),
    "Evidence only": (
        "Preserves the quote and rationale for later analysis, but prevents this item "
        "from becoming a public registry record. This is the normal path for sub-labels "
        "under a broader cluster such as ROGD."
    ),
    "Existing practice evidence": (
        "Use when the cluster already maps to a Sanity practice. Requires "
        "existing_practice_id before approval or push."
    ),
    "Promote to registry practice": (
        "Use sparingly, after comparing the cluster. This turns a local evidence pattern "
        "into a candidate public practice entry."
    ),
    "Not a practice": (
        "Rejects the proposal because it belongs in another review family or is not "
        "useful evidence."
    ),
}

_PRACTICE_EVIDENCE_DECISION_OPTIONS = [
    "keep_evidence",
    "link_existing",
    "flag_promotion",
    "reject",
]

_PRACTICE_EVIDENCE_DECISION_LABELS = {
    "keep_evidence": "Keep as evidence",
    "link_existing": "Keep as evidence and link to existing tactic/frame/practice",
    "flag_promotion": "Flag for promotion review",
    "reject": "Reject",
}

_PRACTICE_EVIDENCE_DECISION_HELP = {
    "keep_evidence": (
        "Default. Preserve the quote under a local cluster. It will not create "
        "or update a public practice registry record."
    ),
    "link_existing": (
        "Use when the evidence clearly belongs to an existing controlled tactic, "
        "frame, or practice. The link is local evidence metadata for now."
    ),
    "flag_promotion": (
        "Use rarely. This sends the cluster/item to a later batch curation pass; "
        "it does not create a Sanity practice entry."
    ),
    "reject": "Use when the item is noise, irrelevant, or belongs in another review family.",
}

_PRACTICE_LINK_TYPE_OPTIONS = ["tactic", "frame", "practice"]

_PRACTICE_DECISION_TO_LEGACY_FIT = {
    "keep_evidence": "candidate_evidence",
    "link_existing": "existing_practice",
    "flag_promotion": "registry_practice",
    "reject": "not_practice",
}

_LEGACY_FIT_TO_PRACTICE_DECISION = {
    "needs_clustering": "keep_evidence",
    "candidate_evidence": "keep_evidence",
    "existing_practice": "link_existing",
    "registry_practice": "flag_promotion",
    "not_practice": "reject",
}

_PRACTICE_CLUSTER_CATALOGUE = {
    "rogd": {
        "label": "ROGD / sudden-onset diagnosis frame",
        "description": (
            "Evidence that frames trans identity as Rapid Onset Gender Dysphoria, social contagion, "
            "peer influence, or a diagnostic explanation for youth transition."
        ),
        "review_hint": (
            "Usually keep narrow labels as evidence first. Promote only if the corpus supports one stable "
            "practice category rather than several wording variants."
        ),
        "examples": "ROGD-Diagnosis, ROGD-Promotion, social contagion framing",
    },
    "parent_guidance": {
        "label": "Parent / family guidance",
        "description": (
            "Evidence where parents, families, schools, or carers are instructed how to resist, delay, "
            "redirect, monitor, or manage a young person's SOGIE."
        ),
        "review_hint": (
            "Check whether this is a standalone practice or evidence for a broader family-intervention pattern. "
            "Use existing_practice when Sanity already has the broader parent-guidance entry."
        ),
        "examples": "Strategic-Guidance-for-Parents, Tactical-Guidance-for-Parents",
    },
    "pathologization": {
        "label": "Pathologization / pseudo-clinical framing",
        "description": (
            "Evidence that casts LGBTQ+ identity, gender nonconformity, or transition as pathology, confusion, "
            "trauma symptom, addiction, developmental failure, or clinical problem."
        ),
        "review_hint": (
            "Often overlaps with tactics and rhetoric. Keep as evidence unless the document describes a concrete "
            "repeatable intervention practice."
        ),
        "examples": "diagnosis language, trauma-cause framing, disorder/pathology claims",
    },
    "pastoral_guidance": {
        "label": "Pastoral / spiritual guidance",
        "description": (
            "Evidence of religious counselling, prayer, pastoral care, spiritual direction, discipleship, or "
            "faith-based instruction used to redirect or suppress SOGIE."
        ),
        "review_hint": (
            "Distinguish a general theological claim from a repeatable pastoral intervention. The former is usually "
            "evidence/tactic; the latter may become a practice."
        ),
        "examples": "pastoral care, prayer counselling, spiritual mentoring",
    },
    "clinical_authority": {
        "label": "Clinical authority / evidence laundering",
        "description": (
            "Evidence where credentials, medical language, research claims, or professional authority are used to "
            "legitimise SOGICE-adjacent intervention."
        ),
        "review_hint": (
            "Often belongs in tactics or network evidence. Promote as a practice only if the source describes a "
            "specific clinical intervention, not just authority signalling."
        ),
        "examples": "expert protocol claims, clinician guidance, medical misinformation",
    },
    "institutional_legitimation": {
        "label": "Institutional legitimation",
        "description": (
            "Evidence where institutions, accreditations, universities, NGOs, consultative status, or official "
            "processes are used to legitimise SOGICE-related claims or actors."
        ),
        "review_hint": (
            "Usually a tactic/network cluster rather than a practice. Keep as evidence unless there is an explicit "
            "repeatable intervention procedure."
        ),
        "examples": "UN status, university affiliation, professional body endorsement",
    },
    "media_dissemination": {
        "label": "Media dissemination",
        "description": (
            "Evidence of podcasts, channels, publications, newsletters, campaigns, or media projects spreading "
            "SOGICE-adjacent narratives."
        ),
        "review_hint": (
            "Usually route to media/source evidence or entity registry-fit review, not practice registry. Episodes "
            "can be ingested as documents and connected by tags/entities later."
        ),
        "examples": "podcast platform, interview series, campaign channel",
    },
    "legal_policy_advocacy": {
        "label": "Legal / policy advocacy",
        "description": (
            "Evidence of legal arguments, policy submissions, model bills, rights claims, or lobbying used to "
            "protect or advance SOGICE-adjacent activity."
        ),
        "review_hint": (
            "Often a tactic or policy-evidence cluster. Promote only when the item describes a repeatable practice, "
            "not merely an advocacy position."
        ),
        "examples": "religious freedom claims, school policy templates, consultation submissions",
    },
    "testimony_narrative": {
        "label": "Testimony / detransition narrative",
        "description": (
            "Evidence using personal testimony, survivor-style narrative, regret, detransition, or identity-change "
            "stories to justify intervention or discourage affirmation."
        ),
        "review_hint": (
            "Usually keep as evidence connected to testimony/media/tactic review. Promote only if a repeatable "
            "intervention process is described."
        ),
        "examples": "personal story, detransition testimony, ex-gay narrative",
    },
    "unclustered": {
        "label": "Unclustered / needs researcher framing",
        "description": (
            "No reliable local cluster has been inferred yet. This should be reviewed before promotion."
        ),
        "review_hint": "Assign a cluster or keep as evidence until similar material appears.",
        "examples": "new or one-off model label",
    },
}


def _entity_registry_fit(item: dict) -> str:
    fit = infer_entity_registry_fit(item)
    return fit if fit in _ENTITY_REGISTRY_FIT_OPTIONS else "needs_review"


def _practice_fit(item: dict) -> str:
    fit = str(item.get("practice_fit") or "").strip()
    return fit if fit in _PRACTICE_FIT_OPTIONS else "needs_clustering"


def _practice_evidence_decision(item: dict) -> str:
    decision = str(item.get("evidence_decision") or "").strip()
    if decision in _PRACTICE_EVIDENCE_DECISION_OPTIONS:
        return decision
    return _LEGACY_FIT_TO_PRACTICE_DECISION.get(_practice_fit(item), "keep_evidence")


def _apply_practice_evidence_decision(item: dict, decision: str) -> dict:
    decision = decision if decision in _PRACTICE_EVIDENCE_DECISION_OPTIONS else "keep_evidence"
    item["evidence_decision"] = decision
    item["practice_fit"] = _PRACTICE_DECISION_TO_LEGACY_FIT[decision]
    item["cluster_label"] = str(item.get("cluster_label") or item.get("practice_cluster") or "").strip()
    if item["cluster_label"]:
        item["practice_cluster"] = item["cluster_label"]
    if decision == "link_existing":
        linked_id = str(item.get("linked_type_id") or item.get("existing_practice_id") or "").strip()
        item["linked_type_id"] = linked_id
        item["linked_type_kind"] = str(item.get("linked_type_kind") or "practice").strip()
        if item["linked_type_kind"] == "practice":
            item["existing_practice_id"] = linked_id
        else:
            item["existing_practice_id"] = ""
        item["promotion_review_flag"] = False
        item["approved"] = False
        item["rejected"] = False
        item["proposal_status"] = "pending"
    elif decision == "flag_promotion":
        item["promotion_review_flag"] = True
        item["approved"] = False
        item["rejected"] = False
        item["proposal_status"] = "pending"
    elif decision == "reject":
        item["promotion_review_flag"] = False
        item["linked_type_id"] = ""
        item["linked_type_kind"] = ""
        item["existing_practice_id"] = ""
        item["approved"] = False
        item["rejected"] = True
        item["proposal_status"] = "rejected"
    else:
        item["promotion_review_flag"] = False
        item["linked_type_id"] = ""
        item["linked_type_kind"] = ""
        item["existing_practice_id"] = ""
        item["approved"] = False
        item["rejected"] = False
        item["proposal_status"] = "pending"
    return item


def _practice_push_block_reason(item: dict) -> str:
    decision = _practice_evidence_decision(item)
    if decision != "link_existing":
        return "practice evidence is local by default; public practice pushes are an advanced reconciliation step."
    fit = _practice_fit(item)
    if fit == "candidate_evidence":
        return "kept as evidence only; it is not a standalone practice registry entry."
    if fit not in {"registry_practice", "existing_practice"}:
        return (
            f"practice_fit={fit}; keep as evidence, cluster, link to an existing "
            "practice, or promote before pushing."
        )
    if fit == "existing_practice" and not item.get("existing_practice_id"):
        return "existing_practice requires existing_practice_id before push."
    return ""


def _practice_review_status(item: dict) -> str:
    if item.get("proposal_status") == "pushed" or item.get("pushed_to_sanity"):
        return "Pushed"
    decision = _practice_evidence_decision(item)
    if decision == "reject" or item.get("proposal_status") == "rejected" or item.get("rejected"):
        return "Rejected"
    if decision == "flag_promotion" or item.get("promotion_review_flag"):
        return "Promotion review"
    if decision == "link_existing":
        return "Linked evidence"
    if decision == "keep_evidence":
        return "Evidence only"
    if item.get("proposal_status") == "rejected" or item.get("rejected"):
        return "Rejected"
    if item.get("proposal_status") == "approved" or item.get("approved"):
        if _practice_push_block_reason(item):
            return "Needs review"
        return "Approved, not pushed"
    return "Needs review"


def _clear_stale_practice_approval_if_blocked(item: dict) -> bool:
    if item.get("pushed_to_sanity"):
        return False
    if not (item.get("approved") or item.get("proposal_status") == "approved"):
        return False
    if not _practice_push_block_reason(item):
        return False
    item["approved"] = False
    item["proposal_status"] = "pending"
    return True


def _save_cluster_as_evidence_if_ready(item: dict) -> bool:
    if _practice_evidence_decision(item) != "keep_evidence" and _practice_fit(item) != "needs_clustering":
        return False
    cluster = _practice_cluster_key(item)
    if cluster == "unclustered":
        return False
    item["cluster_label"] = cluster
    _apply_practice_evidence_decision(item, "keep_evidence")
    if not item.get("practice_fit_rationale"):
        item["practice_fit_rationale"] = (
            f"Kept as evidence under the `{cluster}` cluster; not a standalone practice entry."
        )
    return True


def _practice_cluster_key(item: dict) -> str:
    cluster = str(item.get("cluster_label") or item.get("practice_cluster") or "").strip()
    if cluster:
        return cluster
    try:
        inferred = str(infer_practice_cluster(item) or "").strip()
    except Exception:
        inferred = ""
    return inferred or "unclustered"


def _practice_cluster_info(cluster: str) -> dict:
    key = str(cluster or "").strip() or "unclustered"
    if key in _PRACTICE_CLUSTER_CATALOGUE:
        return _PRACTICE_CLUSTER_CATALOGUE[key]
    return {
        "label": key.replace("_", " ").title(),
        "description": "Local researcher-defined cluster not yet in the shared catalogue.",
        "review_hint": (
            "Use this as a temporary consolidation bucket. If it recurs, add it to the catalogue "
            "with a clearer definition before promoting practice entries."
        ),
        "examples": "",
    }


def _practice_cluster_display(cluster: str) -> str:
    key = str(cluster or "").strip() or "unclustered"
    info = _practice_cluster_info(key)
    return f"{key} — {info['label']}"


def _practice_cluster_options(current: str = "") -> list[str]:
    options = list(_PRACTICE_CLUSTER_CATALOGUE.keys())
    current = str(current or "").strip()
    if current and current not in options:
        options.insert(-1, current)
    return options


def _practice_cluster_summary(records: list[dict]) -> list[dict]:
    clusters: dict[str, dict] = {}
    for record in records:
        item = record["item"]
        cluster_key = _practice_cluster_key(item)
        row = clusters.setdefault(
            cluster_key,
            {
                "cluster": cluster_key,
                "proposals": 0,
                "needs_review": 0,
                "held_evidence": 0,
                "linked_evidence": 0,
                "promotion_review": 0,
                "_doc_ids": set(),
                "_examples": [],
            },
        )
        decision = _practice_evidence_decision(item)
        row["proposals"] += 1
        if _practice_review_status(item) == "Needs review":
            row["needs_review"] += 1
        if decision == "keep_evidence":
            row["held_evidence"] += 1
        if decision == "link_existing":
            row["linked_evidence"] += 1
        if decision == "flag_promotion":
            row["promotion_review"] += 1
        doc_id = str(record.get("doc_id", "")).strip()
        if doc_id:
            row["_doc_ids"].add(doc_id)
        practice_id = str(item.get("practice_id") or item.get("exact_description") or "").strip()
        if practice_id and practice_id not in row["_examples"] and len(row["_examples"]) < 4:
            row["_examples"].append(practice_id)

    summary: list[dict] = []
    for row in clusters.values():
        summary.append(
            {
                "cluster": row["cluster"],
                "meaning": _practice_cluster_info(row["cluster"])["label"],
                "proposals": row["proposals"],
                "needs_review": row["needs_review"],
                "held_evidence": row["held_evidence"],
                "linked_evidence": row["linked_evidence"],
                "promotion_review": row["promotion_review"],
                "docs": ", ".join(sorted(row["_doc_ids"])),
                "examples": "; ".join(row["_examples"]),
            }
        )
    return sorted(summary, key=lambda row: (row["cluster"] == "unclustered", row["cluster"].lower()))


def _proposal_review_sort_key(record: dict, label_field: str = "term") -> tuple[int, str, str]:
    item = record["item"]
    status_rank = {
        "Needs review": 0,
        "Approved, not pushed": 1,
        "Rejected": 2,
        "Pushed": 3,
    }
    return (
        status_rank.get(_proposal_review_status(item), 99),
        str(record.get("doc_id", "")),
        str(item.get(label_field, "")).lower(),
    )


def _proposal_status_counts(records: list[dict]) -> dict[str, int]:
    counts = {
        "Needs review": 0,
        "Approved, not pushed": 0,
        "Pushed": 0,
        "Rejected": 0,
    }
    for record in records:
        status = _proposal_review_status(record["item"])
        counts[status] = counts.get(status, 0) + 1
    return counts


def _practice_status_counts(records: list[dict]) -> dict[str, int]:
    counts = {
        "Needs review": 0,
        "Evidence only": 0,
        "Linked evidence": 0,
        "Promotion review": 0,
        "Pushed": 0,
        "Rejected": 0,
    }
    for record in records:
        status = _practice_review_status(record["item"])
        counts[status] = counts.get(status, 0) + 1
    return counts


def _render_proposal_status_metrics(records: list[dict]) -> None:
    status_counts = _proposal_status_counts(records)
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Needs review", status_counts["Needs review"])
    c2.metric("Approved, not pushed", status_counts["Approved, not pushed"])
    c3.metric("Pushed", status_counts["Pushed"])
    c4.metric("Rejected", status_counts["Rejected"])


def _render_practice_status_metrics(records: list[dict]) -> None:
    status_counts = _practice_status_counts(records)
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Evidence only", status_counts["Evidence only"])
    c2.metric("Linked evidence", status_counts["Linked evidence"])
    c3.metric("Promotion review", status_counts["Promotion review"])
    c4.metric("Rejected", status_counts["Rejected"])
    c5.metric("Legacy pushed", status_counts["Pushed"])


def _proposal_display_position(record: dict) -> int:
    return int(record.get("index", 0)) + 1


def _source_queue_initial_priority(add_mode: str, selected_priority: str) -> str:
    """Return the priority saved before optional immediate source-queue triage."""
    if "triage" in (add_mode or "").lower():
        return "medium"
    return selected_priority


def _source_queue_submission_candidates(rows: list) -> tuple[list, list]:
    """Split exact submitted rows into model-work and already-routed groups."""
    return (
        [row for row in rows if getattr(row, "status", "") == "new"],
        [row for row in rows if getattr(row, "status", "") != "new"],
    )


def _proposal_confidence(item: dict, *keys: str):
    for key in keys:
        value = item.get(key)
        if value in ("", None):
            continue
        try:
            return float(value)
        except (TypeError, ValueError):
            continue
    return None


def _format_confidence(value) -> str:
    if value is None:
        return "—"
    try:
        return f"{float(value):.2f}"
    except (TypeError, ValueError):
        return "—"


def _proposal_expander_label(record: dict, label: str) -> str:
    status = _proposal_review_status(record["item"])
    return f"[{status}] {record['doc_id']} · {label}"


def _practice_expander_label(record: dict, label: str) -> str:
    status = _practice_review_status(record["item"])
    return f"[{status}] {record['doc_id']} · {label}"


def _proposal_select_label(record: dict, label: str, *, practice: bool = False) -> str:
    status = _practice_review_status(record["item"]) if practice else _proposal_review_status(record["item"])
    return (
        f"[{status}] {record['doc_id']} · "
        f"#{_proposal_display_position(record)} · {_short_label(label, 90)}"
    )


def _proposal_record_key(record: dict) -> str:
    """Stable UI identity for one proposal across sorting/status changes."""
    path = str(record.get("path") or "")
    doc_id = str(record.get("doc_id") or "")
    index = int(record.get("index", 0))
    return f"{path}::{doc_id}::{index}"


def _proposal_source_doc_uploaded(corpus_dir: Path, doc_id: str) -> bool:
    """Return True when the local source document has a Sanity upload marker."""
    return bool(doc_id and (corpus_dir / doc_id / "sanity_record.json").exists())


def _proposal_source_upload_issue(record: dict, config, *, verify_remote: bool = False) -> str:
    """Human-readable reason a proposal cannot reference its source document yet."""
    doc_id = str(record.get("doc_id") or "")
    if not doc_id:
        return "missing source document id"
    if not _proposal_source_doc_uploaded(config.corpus_dir, doc_id):
        return (
            f"source document `{doc_id}` is not uploaded to Sanity yet. "
            f"Upload it first (`python -m runner upload-doc {doc_id}`), then push this proposal."
        )
    if verify_remote:
        sanity_ref = doc_id if doc_id.startswith("doc-") else f"doc-{doc_id}"
        try:
            from runner.clients.sanity import sanity_document_exists
            if not sanity_document_exists(doc_id, config):
                return (
                    f"local `sanity_record.json` exists, but Sanity does not contain `{sanity_ref}`. "
                    f"Re-run `python -m runner upload-doc {doc_id}` to recreate the source document, "
                    "or inspect/remove the stale local `sanity_record.json` before pushing proposals."
                )
        except Exception as exc:  # noqa: BLE001 - surfaced as a preflight failure
            return (
                f"could not verify `{sanity_ref}` exists in Sanity before pushing: {exc}. "
                "Check Sanity credentials/network, then retry."
            )
    return ""


def _render_proposal_source_context(record: dict) -> None:
    """Show where a proposal came from and whether Sanity can reference it."""
    config = _load_config_safe()
    doc_id = str(record.get("doc_id") or "")
    if not config or not doc_id:
        return

    doc_dir = config.corpus_dir / doc_id
    intake = _read_json_file(doc_dir / "intake.json", {})
    source = intake.get("source_url") or intake.get("source") or ""
    uploaded = _proposal_source_doc_uploaded(config.corpus_dir, doc_id)

    with st.container():
        cols = st.columns([2, 2, 1])
        cols[0].caption(f"Source document: `{doc_id}`")
        cols[1].caption(f"Source: {source or '—'}")
        if cols[2].button("Open source doc", key=f"open_source_for_proposal_{_proposal_record_key(record)}"):
            _open_document_from_inbox(doc_id)
            st.rerun()
        if uploaded:
            url = _sanity_studio_url(config, doc_id)
            if url:
                st.markdown(f"[Open source document in Sanity ↗]({url})")
            else:
                st.success("Source document has a local Sanity upload marker.")
        else:
            st.warning(
                "This proposal cannot be pushed as a Sanity registry record until "
                "the source document is uploaded. Sanity rejects references to "
                f"`doc-{doc_id}` while that document does not exist."
            )


def _render_selected_proposal_editor(
    records: list[dict],
    *,
    key: str,
    label_func,
    render_func,
) -> None:
    if not records:
        return
    record_by_key = {
        _proposal_record_key(record): record
        for record in records
    }
    record_keys = list(record_by_key.keys())
    if st.session_state.get(key) not in record_by_key:
        st.session_state[key] = record_keys[0]
    selected_key = st.selectbox(
        "Open proposal",
        record_keys,
        format_func=lambda record_key: label_func(record_by_key[record_key]),
        key=key,
        help=(
            "Only the selected proposal editor is rendered. This keeps local "
            "save/approve actions responsive."
        ),
    )
    selected_record = record_by_key[selected_key]
    _render_proposal_source_context(selected_record)
    render_func(selected_record)


def _ingestion_status(row: dict) -> str:
    if row.get("in_corpus"):
        return "Already in corpus"
    priority = str(row.get("priority", "medium")).lower()
    if priority == "high":
        return "Pending high"
    if priority == "low":
        return "Pending low"
    return "Pending medium"


def _ingestion_sort_key(row: dict) -> tuple[int, str, str]:
    rank = {
        "Pending high": 0,
        "Pending medium": 1,
        "Pending low": 2,
        "Already in corpus": 3,
    }
    return (
        rank.get(_ingestion_status(row), 99),
        str(row.get("doc_id", "")),
        str(row.get("title") or row.get("url") or "").lower(),
    )


def _render_ingestion_status_metrics(rows: list[dict]) -> None:
    counts = {
        "Pending high": 0,
        "Pending medium": 0,
        "Pending low": 0,
        "Already in corpus": 0,
    }
    for row in rows:
        status = _ingestion_status(row)
        counts[status] = counts.get(status, 0) + 1
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Pending high", counts["Pending high"])
    c2.metric("Pending medium", counts["Pending medium"])
    c3.metric("Pending low", counts["Pending low"])
    c4.metric("Already in corpus", counts["Already in corpus"])


def _render_local_proposal_queue(config) -> None:
    lexicon_records = _local_enrichment_proposal_records(config.corpus_dir, "lexicon_proposals")
    entity_records = _local_enrichment_proposal_records(config.corpus_dir, "entity_proposals")
    tactic_records = _local_enrichment_proposal_records(config.corpus_dir, "tactic_proposals")
    practice_records = _local_enrichment_proposal_records(config.corpus_dir, "practice_descriptions")
    claim_records = _local_enrichment_proposal_records(config.corpus_dir, "statistical_claims")
    queue_sections = [
        "Lexicon Queue",
        "Entity Queue",
        "Tactic Queue",
        "Practice Evidence",
        "Claims Queue",
        "Ingestion Queue",
        "Gate Status",
    ]
    selected_queue = st.radio(
        "Proposal queue",
        queue_sections,
        horizontal=True,
        key="local_proposal_active_queue",
        help=(
            "Only the selected proposal family is rendered. This avoids slow "
            "whole-page reruns when saving or approving one local proposal."
        ),
    )

    if selected_queue == "Lexicon Queue":
        _render_lexicon_queue(config, lexicon_records)
    elif selected_queue == "Entity Queue":
        _render_entity_queue(config, entity_records)
    elif selected_queue == "Tactic Queue":
        _render_tactic_queue(config, tactic_records)
    elif selected_queue == "Practice Evidence":
        _render_practice_queue(config, practice_records)
    elif selected_queue == "Claims Queue":
        _render_claim_queue(config, claim_records)
    elif selected_queue == "Ingestion Queue":
        _render_ingestion_queue(config)
    elif selected_queue == "Gate Status":
        st.json(_proposal_gate_status(config.corpus_dir))


def _render_lexicon_queue(config, records: list[dict]) -> None:
    st.caption(f"{len(records)} local lexicon proposal(s)")
    if not records:
        st.info("No local lexicon proposals found yet.")
        return
    records = sorted(records, key=lambda record: _proposal_review_sort_key(record, "term"))
    _render_proposal_status_metrics(records)
    st.caption(
        "Proposal # is only the item's position inside that document's local enrichment.json file. "
        "It is not a quality score or priority ranking."
    )
    st.dataframe([
        {
            "status": _proposal_review_status(record["item"]),
            "doc_id": record["doc_id"],
            "proposal #": _proposal_display_position(record),
            "term": record["item"].get("term", ""),
            "LLM confidence": _format_confidence(
                _proposal_confidence(record["item"], "model_confidence", "llm_confidence", "confidence")
            ),
            "researcher confidence": _format_confidence(
                _proposal_confidence(record["item"], "researcher_confidence")
            ),
            "action": record["item"].get("action", ""),
            "cluster": record["item"].get("proposed_cluster", ""),
            "function": record["item"].get("function", ""),
            "approved": record["item"].get("approved", False),
            "rejected": record["item"].get("rejected", False),
            "pushed_to_sanity": record["item"].get("pushed_to_sanity", False),
        }
        for record in records
    ], width="stretch", hide_index=True)
    if st.button("Push approved drafts to Sanity"):
        pushed = 0
        errors: list[str] = []
        pushed_ids: list[str] = []
        for record in records:
            item = record["item"]
            if not item.get("approved") or item.get("rejected") or item.get("pushed_to_sanity"):
                continue
            source_issue = _proposal_source_upload_issue(record, config, verify_remote=True)
            if source_issue:
                errors.append(f"{record['doc_id']} / {item.get('term', '?')}: {source_issue}")
                continue
            issues = _lexicon_import_issues({
                "term": item.get("term", ""),
                "proposed_cluster": item.get("proposed_cluster", ""),
                "function": item.get("function", ""),
                "draft_definition": item.get("definition_as_used", ""),
                "accessible_definition": item.get("accessible_definition", ""),
                "status": "draft",
            })
            if issues:
                errors.append(f"{record['doc_id']} / {item.get('term', '?')}: " + "; ".join(issues))
                continue
            try:
                from runner.clients.sanity import write_lexicon_draft_from_proposal
                sanity_id = write_lexicon_draft_from_proposal(item, record["doc_id"], config)
                item["pushed_to_sanity"] = True
                item["sanity_id"] = sanity_id
                item["proposal_status"] = "pushed"
                item["researcher_note"] = (item.get("researcher_note", "") + "\nPushed to Sanity as draft.").strip()
                if item.get("variant_push_deferred"):
                    variants = ", ".join(item.get("deferred_variant_terms") or []) or "proposed variants"
                    item["researcher_note"] = (
                        item["researcher_note"]
                        + f"\nVariant relationship deferred for separate review: {variants}."
                    )
                    deferred_variants.append(f"{item.get('term', '?')}: {variants}")
                _update_enrichment_proposal(record["path"], "lexicon_proposals", record["index"], item)
                pushed += 1
                pushed_ids.append(sanity_id)
            except Exception as exc:
                errors.append(f"{record['doc_id']} / {item.get('term', '?')}: {exc}")
        st.session_state.pop("lexicon_terms", None)
        if pushed:
            st.success(
                f"Pushed {pushed} draft term(s) to Sanity as `lexiconEntry` records (status: draft). "
                f"Sanity IDs: {', '.join(pushed_ids)}. "
                "Enrichment.json updated with pushed_to_sanity=True and sanity_id."
            )
            lex_url = _sanity_studio_section_url(config, "lexiconEntry")
            if lex_url:
                st.markdown(f"[Verify in Sanity Studio → lexiconEntry ↗]({lex_url})")
        if deferred_variants:
            st.warning(
                "Document evidence was attached, but these variant relationships still need "
                "a separate variant decision: " + "; ".join(deferred_variants)
            )
        if errors:
            st.error("\n".join(errors))

    st.subheader("Review Proposals")
    _render_selected_proposal_editor(
        records,
        key="lexicon_queue_selected_proposal",
        label_func=lambda record: _proposal_select_label(record, record["item"].get("term", "(missing term)")),
        render_func=_render_single_proposal_editor,
    )


def _render_entity_queue(config, records: list[dict]) -> None:
    st.caption(f"{len(records)} local entity proposal(s)")
    if not records:
        st.info("No local entity proposals found yet.")
        return
    records = sorted(records, key=lambda record: _proposal_review_sort_key(record, "name"))
    _render_proposal_status_metrics(records)
    st.caption(
        "Proposal # is the local JSON position for editing/saving. It is not a model confidence score."
    )
    st.dataframe([
        {
            "status": _proposal_review_status(record["item"]),
            "doc_id": record["doc_id"],
            "proposal #": _proposal_display_position(record),
            "name": record["item"].get("name", ""),
            "LLM confidence": _format_confidence(
                _proposal_confidence(record["item"], "model_confidence", "llm_confidence", "confidence")
            ),
            "researcher confidence": _format_confidence(
                _proposal_confidence(record["item"], "researcher_confidence")
            ),
            "registry_fit": _ENTITY_REGISTRY_FIT_LABELS.get(
                _entity_registry_fit(record["item"]),
                _entity_registry_fit(record["item"]),
            ),
            "entity_type": record["item"].get("entity_type", ""),
            "action": record["item"].get("action", ""),
            "approved": record["item"].get("approved", False),
            "rejected": record["item"].get("rejected", False),
            "pushed_to_sanity": record["item"].get("pushed_to_sanity", False),
        }
        for record in records
    ], width="stretch", hide_index=True)

    if st.button("Push approved entities to Sanity"):
        pushed = 0
        errors: list[str] = []
        pushed_ids: list[str] = []
        for record in records:
            item = record["item"]
            if not item.get("approved") or item.get("rejected") or item.get("pushed_to_sanity"):
                continue
            source_issue = _proposal_source_upload_issue(record, config, verify_remote=True)
            if source_issue:
                errors.append(f"{record['doc_id']} / {item.get('name', '?')}: {source_issue}")
                continue
            fit = _entity_registry_fit(item)
            if fit != "registry_entity":
                errors.append(
                    f"{record['doc_id']} / {item.get('name', '?')}: "
                    f"registry_fit={fit}; mark as Registry entity before pushing, "
                    "or keep it local / ingest it as a source instead."
                )
                continue
            try:
                from runner.clients.sanity import write_entity_from_proposal
                sanity_id = write_entity_from_proposal(item, record["doc_id"], config)
                item["pushed_to_sanity"] = True
                item["sanity_id"] = sanity_id
                item["proposal_status"] = "pushed"
                item["researcher_note"] = (item.get("researcher_note", "") + "\nPushed to Sanity registry.").strip()
                _update_enrichment_proposal(record["path"], "entity_proposals", record["index"], item)
                pushed += 1
                pushed_ids.append(sanity_id)
            except Exception as exc:
                errors.append(f"{record['doc_id']} / {item.get('name', '?')}: {exc}")
        st.session_state.pop("entity_registry", None)
        if pushed:
            st.success(
                f"Pushed {pushed} entit(ies) to Sanity entity registry. "
                f"Sanity IDs: {', '.join(pushed_ids)}."
            )
            entity_url = _sanity_studio_section_url(config, "entityEntry")
            if entity_url:
                st.markdown(f"[Verify in Sanity Studio → entityEntry ↗]({entity_url})")
        if errors:
            st.error("\n".join(errors))

    st.subheader("Review Entities")
    _render_selected_proposal_editor(
        records,
        key="entity_queue_selected_proposal",
        label_func=lambda record: _proposal_select_label(record, record["item"].get("name", "(missing name)")),
        render_func=_render_single_entity_editor,
    )


def _render_tactic_queue(config, records: list[dict]) -> None:
    st.caption(f"{len(records)} local tactic proposal(s)")
    if not records:
        st.info("No local tactic proposals found yet.")
        return
    records = sorted(records, key=lambda record: _proposal_review_sort_key(record, "tactic"))
    _render_proposal_status_metrics(records)
    st.caption(
        "Proposal # is the local JSON position for editing/saving. It is not a model confidence score."
    )
    st.dataframe([
        {
            "status": _proposal_review_status(record["item"]),
            "doc_id": record["doc_id"],
            "proposal #": _proposal_display_position(record),
            "tactic": record["item"].get("tactic", ""),
            "LLM confidence": _format_confidence(
                _proposal_confidence(record["item"], "model_confidence", "llm_confidence", "confidence")
            ),
            "researcher confidence": _format_confidence(
                _proposal_confidence(record["item"], "researcher_confidence")
            ),
            "action": record["item"].get("action", ""),
            "approved": record["item"].get("approved", False),
            "rejected": record["item"].get("rejected", False),
            "pushed_to_sanity": record["item"].get("pushed_to_sanity", False),
        }
        for record in records
    ], width="stretch", hide_index=True)

    if st.button("Push approved tactics to Sanity"):
        pushed = 0
        errors: list[str] = []
        pushed_ids: list[str] = []
        for record in records:
            item = record["item"]
            if not item.get("approved") or item.get("rejected") or item.get("pushed_to_sanity"):
                continue
            source_issue = _proposal_source_upload_issue(record, config, verify_remote=True)
            if source_issue:
                errors.append(f"{record['doc_id']} / {item.get('tactic', '?')}: {source_issue}")
                continue
            if item.get("action") == "enrich_existing" and not item.get("existing_tactic_id"):
                errors.append(
                    f"{record['doc_id']} / {item.get('tactic', '?')}: "
                    "`enrich_existing` requires `existing_tactic_id`; fill the existing Sanity tactic id or change Action to add_new."
                )
                continue
            try:
                from runner.clients.sanity import write_tactic_from_proposal
                sanity_id = write_tactic_from_proposal(item, record["doc_id"], config)
                item["pushed_to_sanity"] = True
                item["sanity_id"] = sanity_id
                item["proposal_status"] = "pushed"
                item["researcher_note"] = (item.get("researcher_note", "") + "\nPushed to Sanity tactic registry.").strip()
                _update_enrichment_proposal(record["path"], "tactic_proposals", record["index"], item)
                pushed += 1
                pushed_ids.append(sanity_id)
            except Exception as exc:
                errors.append(f"{record['doc_id']} / {item.get('tactic', '?')}: {exc}")
        if pushed:
            st.success(
                f"Pushed {pushed} tactic(s) to Sanity as `tacticEntry` records. "
                f"Sanity IDs: {', '.join(pushed_ids)}. "
                "Enrichment.json updated locally."
            )
            tactic_url = _sanity_studio_section_url(config, "tacticEntry")
            if tactic_url:
                st.markdown(f"[Verify in Sanity Studio → tacticEntry ↗]({tactic_url})")
        if errors:
            st.error("\n".join(errors))

    st.subheader("Review Tactics")
    _render_selected_proposal_editor(
        records,
        key="tactic_queue_selected_proposal",
        label_func=lambda record: _proposal_select_label(record, record["item"].get("tactic", "(missing tactic)")),
        render_func=_render_single_tactic_editor,
    )


def _render_practice_queue(config, records: list[dict]) -> None:
    st.caption(f"{len(records)} local practice evidence item(s)")
    if not records:
        st.info("No local practice evidence found yet.")
        return
    records = sorted(records, key=lambda record: _proposal_review_sort_key(record, "practice_id"))
    cluster_summary = _practice_cluster_summary(records)
    st.markdown("**Evidence clusters**")
    st.caption(
        "Clusters are provisional local evidence buckets. Most items should stay as evidence; "
        "link or flag only when the match is clear."
    )
    st.dataframe(cluster_summary, width="stretch", hide_index=True)
    cluster_options = ["All clusters"] + [row["cluster"] for row in cluster_summary]
    selected_cluster = st.selectbox(
        "Cluster filter",
        cluster_options,
        key="practice_cluster_filter",
        format_func=lambda value: value if value == "All clusters" else _practice_cluster_display(value),
        help=(
            "Filter Practice Evidence to one cluster when deciding whether labels are duplicate evidence, "
            "clear links to existing controlled records, or promotion-review candidates."
        ),
    )
    if selected_cluster != "All clusters":
        records = [
            record
            for record in records
            if _practice_cluster_key(record["item"]) == selected_cluster
        ]
        st.caption(f"Showing {len(records)} proposal(s) in cluster `{selected_cluster}`.")
        selected_info = _practice_cluster_info(selected_cluster)
        st.info(
            f"**{selected_info['label']}** — {selected_info['description']}\n\n"
            f"**Review hint:** {selected_info['review_hint']}"
        )
    _render_practice_status_metrics(records)
    st.caption(
        "Proposal # is the local JSON position for editing/saving. It is not a model confidence score."
    )
    st.dataframe([
        {
            "status": _practice_review_status(record["item"]),
            "doc_id": record["doc_id"],
            "proposal #": _proposal_display_position(record),
            "evidence label": record["item"].get("practice_id", ""),
            "decision": _PRACTICE_EVIDENCE_DECISION_LABELS.get(
                _practice_evidence_decision(record["item"]),
                _practice_evidence_decision(record["item"]),
            ),
            "cluster": _practice_cluster_key(record["item"]),
            "linked type": record["item"].get("linked_type_kind", ""),
            "linked id": record["item"].get("linked_type_id") or record["item"].get("existing_practice_id", ""),
            "LLM confidence": _format_confidence(
                _proposal_confidence(record["item"], "model_confidence", "llm_confidence", "confidence")
            ),
            "researcher confidence": _format_confidence(
                _proposal_confidence(record["item"], "researcher_confidence")
            ),
            "harm_stance": record["item"].get("harm_stance", ""),
            "approved": record["item"].get("approved", False),
            "rejected": record["item"].get("rejected", False),
            "pushed_to_sanity": record["item"].get("pushed_to_sanity", False),
        }
        for record in records
    ], width="stretch", hide_index=True)

    with st.expander("Advanced: legacy practiceEntry push", expanded=False):
        st.warning(
            "Practice evidence should usually stay local during the pilot. Use this only for "
            "already-curated, named intervention modalities that truly deserve a public Sanity practiceEntry."
        )
        if st.button("Push legacy approved practice records to Sanity"):
            pushed = 0
            errors: list[str] = []
            pushed_ids: list[str] = []
            for record in records:
                item = record["item"]
                if not item.get("approved") or item.get("rejected") or item.get("pushed_to_sanity"):
                    continue
                source_issue = _proposal_source_upload_issue(record, config, verify_remote=True)
                if source_issue:
                    errors.append(f"{record['doc_id']} / {item.get('practice_id', '?')}: {source_issue}")
                    continue
                block_reason = _practice_push_block_reason(item)
                if block_reason:
                    errors.append(
                        f"{record['doc_id']} / {item.get('practice_id', '?')}: "
                        f"{block_reason}"
                    )
                    continue
                try:
                    from runner.clients.sanity import append_extractable_asset_from_proposal, write_practice_from_proposal
                    sanity_id = write_practice_from_proposal(item, record["doc_id"], config)
                    append_extractable_asset_from_proposal(
                        item,
                        record["doc_id"],
                        config,
                        asset_type="practice_description",
                        content=item.get("exact_description", ""),
                        target_module="practice_registry",
                    )
                    item["pushed_to_sanity"] = True
                    item["sanity_id"] = sanity_id
                    item["proposal_status"] = "pushed"
                    item["researcher_note"] = (item.get("researcher_note", "") + "\nPushed to Sanity practice registry.").strip()
                    _update_enrichment_proposal(record["path"], "practice_descriptions", record["index"], item)
                    pushed += 1
                    pushed_ids.append(sanity_id)
                except Exception as exc:
                    errors.append(f"{record['doc_id']} / {item.get('practice_id', '?')}: {exc}")
            if pushed:
                st.success(
                    f"Pushed {pushed} practice(s) to Sanity practice registry. "
                    f"Sanity IDs: {', '.join(pushed_ids)}."
                )
                practice_url = _sanity_studio_section_url(config, "practiceEntry")
                if practice_url:
                    st.markdown(f"[Verify in Sanity Studio → practiceEntry ↗]({practice_url})")
            if errors:
                st.error("\n".join(errors))

    st.subheader("Review Practice Evidence")
    _render_selected_proposal_editor(
        records,
        key="practice_queue_selected_proposal",
        label_func=lambda record: _proposal_select_label(
            record,
            record["item"].get("practice_id", "(missing practice)"),
            practice=True,
        ),
        render_func=_render_single_practice_editor,
    )


def _render_claim_queue(config, records: list[dict]) -> None:
    st.caption(f"{len(records)} local statistical claim proposal(s)")
    if not records:
        st.info("No statistical claims found yet.")
        return
    records = sorted(records, key=lambda record: _proposal_review_sort_key(record, "claim"))
    _render_proposal_status_metrics(records)
    st.warning(
        "Claims are extracted claims made by the source. Approving a claim keeps it as a citable/fact-checkable "
        "source claim; it does not certify that the claim is externally true."
    )
    st.caption(
        "Proposal # is the local JSON position for editing/saving. Review the claim text, context, and source cited "
        "before approving or pushing to Sanity."
    )
    st.dataframe([
        {
            "status": _proposal_review_status(record["item"]),
            "doc_id": record["doc_id"],
            "proposal #": _proposal_display_position(record),
            "claim": _short_label(record["item"].get("claim", ""), 100),
            "LLM confidence": _format_confidence(
                _proposal_confidence(record["item"], "model_confidence", "llm_confidence", "confidence")
            ),
            "researcher confidence": _format_confidence(
                _proposal_confidence(record["item"], "researcher_confidence")
            ),
            "verifiable": record["item"].get("verifiable", False),
            "approved": record["item"].get("approved", False),
            "rejected": record["item"].get("rejected", False),
            "pushed_to_sanity": record["item"].get("pushed_to_sanity", False),
        }
        for record in records
    ], width="stretch", hide_index=True)

    if st.button("Push approved claims to Sanity"):
        pushed = 0
        errors: list[str] = []
        for record in records:
            item = record["item"]
            if not item.get("approved") or item.get("rejected") or item.get("pushed_to_sanity"):
                continue
            source_issue = _proposal_source_upload_issue(record, config, verify_remote=True)
            if source_issue:
                errors.append(f"{record['doc_id']} / {item.get('claim', '?')[:80]}: {source_issue}")
                continue
            try:
                from runner.clients.sanity import append_extractable_asset_from_proposal
                sanity_id = append_extractable_asset_from_proposal(
                    item,
                    record["doc_id"],
                    config,
                    asset_type="statistical_claim",
                    content=item.get("claim", ""),
                    target_module="fact_checking",
                )
                item["pushed_to_sanity"] = True
                item["sanity_id"] = sanity_id
                item["proposal_status"] = "pushed"
                item["researcher_note"] = (item.get("researcher_note", "") + "\nPushed to Sanity document assets.").strip()
                _update_enrichment_proposal(record["path"], "statistical_claims", record["index"], item)
                pushed += 1
            except Exception as exc:
                errors.append(f"{record['doc_id']} / {item.get('claim', '?')[:80]}: {exc}")
        if pushed:
            st.success(f"Pushed {pushed} approved claim(s) to Sanity.")
        if errors:
            st.error("\n".join(errors))

    st.subheader("Review Claims")
    _render_selected_proposal_editor(
        records,
        key="claim_queue_selected_proposal",
        label_func=lambda record: _proposal_select_label(
            record,
            _short_label(record["item"].get("claim", "(missing claim)"), 90),
        ),
        render_func=_render_single_claim_editor,
    )


def _render_single_proposal_editor(record: dict) -> None:
    item = dict(record["item"])
    prefix = f"proposal_{record['doc_id']}_{record['index']}"
    model_confidence = _proposal_confidence(item, "model_confidence", "llm_confidence", "confidence")
    researcher_confidence = _proposal_confidence(item, "researcher_confidence")
    c1, c2 = st.columns([1, 1])
    with c1:
        item["term"] = st.text_input("Term", value=item.get("term", ""), key=f"{prefix}_term")
        item["language"] = st.text_input(
            "Language",
            value=item.get("language", "en"),
            key=f"{prefix}_language",
            help="ISO 639 language code for this term evidence, usually `en`, `pt`, `no`, `de`, etc.",
        )
        item["action"] = st.selectbox(
            "Action",
            ["add_new", "add_variant", "add_evidence", "add_definition", "merge_into"],
            index=_option_index(["add_new", "add_variant", "add_evidence", "add_definition", "merge_into"], item.get("action", "add_new")),
            key=f"{prefix}_action",
            help=(
                "add_new creates a draft entry; add_evidence appends this document to an existing entry; "
                "add_variant adds an alternate wording; add_definition improves wording; merge_into folds this proposal into another term."
            ),
        )
        st.caption(_ENRICHMENT_ACTION_HELP.get(item["action"], ""))
        if item["action"] != "add_new":
            config = _load_config_safe()
            if st.button("Reload existing lexicon terms", key=f"{prefix}_reload_lexicon_targets"):
                st.session_state.pop("lexicon_terms", None)
                st.session_state.pop("local_lexicon_targets", None)
            if "lexicon_terms" not in st.session_state:
                try:
                    from runner.clients.sanity import fetch_lexicon_terms
                    st.session_state.lexicon_terms = fetch_lexicon_terms(config) if config else []
                except Exception as exc:
                    st.session_state.lexicon_terms = []
                    st.caption(f"Could not load Sanity lexicon targets: {exc}")
            if "local_lexicon_targets" not in st.session_state:
                st.session_state.local_lexicon_targets = _local_lexicon_targets()
            local_targets = st.session_state.get("local_lexicon_targets", {})
            target_options = _lexicon_target_options(
                st.session_state.get("lexicon_terms", []),
                local_targets.get("seed", []),
                local_targets.get("legacy", []),
            )
            if target_options:
                target = st.selectbox(
                    "Canonical term to connect",
                    target_options,
                    index=_proposal_target_index(target_options, item),
                    format_func=lambda row: row["label"],
                    key=f"{prefix}_existing_lexicon_target",
                    help=(
                        "Required for add_variant/add_evidence/add_definition/merge_into. "
                        "Combines live Sanity terms with curated seed and legacy drafts. "
                        "Selecting a 'Seed draft' or 'Legacy draft' target is safe: pushing "
                        "this proposal creates that canonical entry as a draft and attaches "
                        "the wording/evidence to it. It is not auto-validated."
                    ),
                )
                _apply_lexicon_target(item, target, action=item["action"])
                if target.get("in_sanity"):
                    st.caption(f"Will connect to `{target['term']}` (`{target['_id']}`, Sanity).")
                else:
                    st.caption(
                        f"Will create canonical draft `{target['term']}` "
                        f"(`{target['_id']}`, from {target.get('origin', 'seed')}) on push, "
                        "then attach this wording/evidence to it."
                    )
            else:
                st.warning(
                    "No lexicon terms loaded. Use Reload existing lexicon terms, "
                    "or approve as add_new only if this truly needs a new canonical entry."
                )
        item["proposed_cluster"] = _controlled_select(
            "Cluster",
            item.get("proposed_cluster", "Unknown"),
            _LEXICON_CLUSTERS,
            key=f"{prefix}_cluster",
            help="Controlled Sanity cluster. `Unknown` is saved locally but omitted from the Sanity field.",
        )
        item["function"] = _controlled_select(
            "Function",
            item.get("function", "Unknown"),
            _LEXICON_FUNCTIONS,
            key=f"{prefix}_function",
            help="Controlled Sanity function/category. `Unknown` is saved locally but omitted from the Sanity field.",
        )
    with c2:
        item["definition_as_used"] = st.text_area(
            "Definition as used",
            value=item.get("definition_as_used", ""),
            height=120,
            key=f"{prefix}_definition",
        )
        item["accessible_definition"] = st.text_area(
            "Accessible definition",
            value=item.get("accessible_definition", ""),
            height=80,
            key=f"{prefix}_accessible",
            help="Plain-language version of the definition — no academic jargon. "
                 "Used in the public archive so survivors, journalists, and non-specialists "
                 "can understand the term without prior knowledge of conversion therapy discourse.",
        )

        st.markdown("**Confidence**")
        if model_confidence is None:
            st.caption("LLM proposal confidence was not recorded for this older enrichment run. Re-enrich to generate it.")
        else:
            item["model_confidence"] = st.slider(
                "LLM proposal confidence",
                min_value=0.0,
                max_value=1.0,
                value=float(model_confidence),
                step=0.05,
                key=f"{prefix}_model_conf",
                help="The model's own confidence that this term proposal is relevant and correctly evidenced.",
            )
        researcher_default = (
            float(researcher_confidence)
            if researcher_confidence is not None
            else float(model_confidence)
            if model_confidence is not None
            else 0.5
        )
        item["researcher_confidence"] = st.slider(
            "Researcher confidence",
            min_value=0.0,
            max_value=1.0,
            value=researcher_default,
            step=0.05,
            key=f"{prefix}_researcher_conf",
            help="Your confidence after reading the quote and definition. This can be lower or higher than the LLM score.",
        )
        item["confidence_rationale"] = st.text_area(
            "Confidence rationale",
            value=item.get("confidence_rationale", ""),
            height=70,
            key=f"{prefix}_confidence_rationale",
        )

    item["exact_quote"] = st.text_area("Origin quote", value=item.get("exact_quote", ""), height=100, key=f"{prefix}_quote")
    item["researcher_note"] = st.text_area("Researcher note", value=item.get("researcher_note", ""), height=80, key=f"{prefix}_note")
    st.caption(
        f"Origin: {record['path']} · proposal #{_proposal_display_position(record)} "
        f"(JSON position {record['index']})"
    )
    st.caption(
        "**Save Edits** writes to the local enrichment.json only. "
        "**Approve as Draft** marks it ready; it will be sent to Sanity when you click "
        "'Push approved drafts to Sanity' at the top of the queue."
    )

    b1, b2, b3 = st.columns(3)
    with b1:
        if st.button("Save Edits", key=f"{prefix}_save"):
            _update_enrichment_proposal(record["path"], "lexicon_proposals", record["index"], item)
            st.success("Saved proposal edits to local enrichment.json.")
    with b2:
        if st.button("Approve as Draft", key=f"{prefix}_approve"):
            item["approved"] = True
            item["rejected"] = False
            item["proposal_status"] = "approved"
            _update_enrichment_proposal(record["path"], "lexicon_proposals", record["index"], item)
            st.success("Approved locally. Push approved drafts to Sanity when ready.")
    with b3:
        if st.button("Reject", key=f"{prefix}_reject"):
            item["approved"] = False
            item["rejected"] = True
            item["proposal_status"] = "rejected"
            _update_enrichment_proposal(record["path"], "lexicon_proposals", record["index"], item)
            st.success("Rejected locally.")

    with st.expander("Move this proposal to the Entity queue"):
        st.caption(
            "Use this when the model proposed an organization/person as a lexicon term. "
            "This rejects the lexicon proposal locally and creates a new entity proposal "
            "with the same source quote and confidence metadata. Nothing is pushed to Sanity."
        )
        move_cols = st.columns([1, 1])
        with move_cols[0]:
            entity_type = st.selectbox(
                "Entity type",
                ["organization", "person"],
                key=f"{prefix}_move_entity_type",
            )
            registry_fit = st.selectbox(
                "Registry fit",
                _ENTITY_REGISTRY_FIT_OPTIONS,
                format_func=lambda value: _ENTITY_REGISTRY_FIT_LABELS.get(value, value),
                key=f"{prefix}_move_registry_fit",
            )
        with move_cols[1]:
            if entity_type == "person":
                role_in_sogice = st.selectbox(
                    "Role in SOGICE",
                    _PERSON_ROLE_OPTIONS,
                    index=_option_index(_PERSON_ROLE_OPTIONS, "other"),
                    key=f"{prefix}_move_role_select",
                )
            else:
                role_in_sogice = st.text_input(
                    "Role in SOGICE",
                    value="",
                    key=f"{prefix}_move_role_text",
                    help="Optional short context for the organization, if known.",
                )
            move_note = st.text_area(
                "Conversion note",
                value="",
                height=70,
                key=f"{prefix}_move_note",
                help="Optional note explaining why this belongs in the entity queue.",
            )
        if st.button("Move to Entity queue", key=f"{prefix}_move_to_entity"):
            try:
                created = _convert_lexicon_proposal_to_entity(
                    record["path"],
                    record["index"],
                    item,
                    entity_type=entity_type,
                    registry_fit=registry_fit,
                    role_in_sogice=role_in_sogice,
                    researcher_note=move_note,
                )
                st.success(
                    f"Created entity proposal `{created.get('name')}` and rejected the lexicon proposal locally. "
                    "Open the Entity Queue to review and approve it."
                )
            except Exception as exc:
                st.error(f"Could not move proposal: {exc}")

    with st.expander("Move this proposal to the Tactic queue"):
        st.caption(
            "Use this when the model proposed a tactic/framing pattern as a lexicon term. "
            "This rejects the lexicon proposal locally and creates a pending tactic proposal "
            "with the same source quote and confidence metadata. Nothing is pushed to Sanity."
        )
        tactic_cols = st.columns([1, 1])
        with tactic_cols[0]:
            tactic_cluster = _controlled_select(
                "Primary cluster",
                item.get("proposed_cluster", "Unknown"),
                _LEXICON_CLUSTERS,
                key=f"{prefix}_move_tactic_cluster",
            )
        with tactic_cols[1]:
            tactic_level = st.selectbox(
                "Tactic level",
                ["structural", "sub-tactic", "campaign"],
                index=_option_index(["structural", "sub-tactic", "campaign"], "sub-tactic"),
                key=f"{prefix}_move_tactic_level",
            )
        tactic_note = st.text_area(
            "Conversion note",
            value="",
            height=70,
            key=f"{prefix}_move_tactic_note",
            help="Optional note explaining why this belongs in the tactic queue.",
        )
        if st.button("Move to Tactic queue", key=f"{prefix}_move_to_tactic"):
            try:
                created = _convert_lexicon_proposal_to_tactic(
                    record["path"],
                    record["index"],
                    item,
                    primary_cluster=tactic_cluster,
                    tactic_level=tactic_level,
                    researcher_note=tactic_note,
                )
                st.success(
                    f"Created tactic proposal `{created.get('tactic')}` and rejected the lexicon proposal locally. "
                    "Open Tag Registry → Tactics to review and approve it."
                )
            except Exception as exc:
                st.error(f"Could not move proposal: {exc}")


def _render_proposal_confidence_editor(item: dict, prefix: str) -> None:
    model_confidence = _proposal_confidence(item, "model_confidence", "llm_confidence", "confidence")
    researcher_confidence = _proposal_confidence(item, "researcher_confidence")
    st.markdown("**Confidence**")
    if model_confidence is None:
        st.caption("LLM proposal confidence was not recorded for this older enrichment run. Re-enrich to generate it.")
    else:
        item["model_confidence"] = st.slider(
            "LLM proposal confidence",
            min_value=0.0,
            max_value=1.0,
            value=float(model_confidence),
            step=0.05,
            key=f"{prefix}_model_conf",
            help="The model's confidence that this proposal is relevant and correctly evidenced.",
        )
    researcher_default = (
        float(researcher_confidence)
        if researcher_confidence is not None
        else float(model_confidence)
        if model_confidence is not None
        else 0.5
    )
    item["researcher_confidence"] = st.slider(
        "Researcher confidence",
        min_value=0.0,
        max_value=1.0,
        value=researcher_default,
        step=0.05,
        key=f"{prefix}_researcher_conf",
        help="Your confidence after reading the evidence. This may be lower or higher than the LLM score.",
    )
    item["confidence_rationale"] = st.text_area(
        "Confidence rationale",
        value=item.get("confidence_rationale", ""),
        height=70,
        key=f"{prefix}_confidence_rationale",
    )


def _render_single_entity_editor(record: dict) -> None:
    item = dict(record["item"])
    prefix = f"entity_{record['doc_id']}_{record['index']}"
    c1, c2 = st.columns([1, 1])
    with c1:
        item["name"] = st.text_input("Name", value=item.get("name", ""), key=f"{prefix}_name")
        item["entity_type"] = st.selectbox(
            "Entity type",
            ["organization", "person"],
            index=_option_index(["organization", "person"], item.get("entity_type", "organization")),
            key=f"{prefix}_type",
        )
        item["action"] = st.selectbox(
            "Action",
            ["add_new", "enrich_existing"],
            index=_option_index(["add_new", "enrich_existing"], item.get("action", "add_new")),
            key=f"{prefix}_action",
        )
        st.caption(_ENRICHMENT_ACTION_HELP.get(item["action"], ""))
        if item["action"] == "enrich_existing":
            config = _load_config_safe()
            if st.button("Reload existing entities", key=f"{prefix}_reload_entities"):
                st.session_state.pop("entity_registry", None)
            if "entity_registry" not in st.session_state:
                try:
                    from runner.pipeline.enrich import _fetch_entity_registry

                    st.session_state.entity_registry = _fetch_entity_registry(config) if config else []
                except Exception as exc:
                    st.session_state.entity_registry = []
                    st.caption(f"Could not load Sanity entities: {exc}")
            entity_options = _entity_target_options(
                st.session_state.get("entity_registry", []),
                current_id=str(item.get("existing_entity_id") or ""),
            )
            if len(entity_options) > 1:
                target = st.selectbox(
                    "Existing Sanity entity",
                    entity_options,
                    index=_entity_target_index(entity_options, item),
                    format_func=lambda row: row["label"],
                    key=f"{prefix}_existing_entity_picker",
                    help=(
                        "Select the existing organization/person registry record this proposal should enrich. "
                        "This writes `existing_entity_id` locally; nothing is pushed until you approve and push."
                    ),
                )
                _apply_entity_target(item, target)
                if target.get("_id"):
                    st.caption(f"Will enrich `{target.get('name')}` (`{target['_id']}`).")
            else:
                item["existing_entity_id"] = st.text_input(
                    "Existing Sanity entity id",
                    value=item.get("existing_entity_id", "") or "",
                    key=f"{prefix}_existing_manual",
                    help="Sanity entities could not be loaded; paste the existing organization/person id manually.",
                )
        current_fit = _entity_registry_fit(item)
        item["registry_fit"] = st.selectbox(
            "Registry fit",
            _ENTITY_REGISTRY_FIT_OPTIONS,
            index=_option_index(_ENTITY_REGISTRY_FIT_OPTIONS, current_fit),
            format_func=lambda value: _ENTITY_REGISTRY_FIT_LABELS.get(value, value),
            key=f"{prefix}_registry_fit",
            help=(
                "Controls whether this proposal is allowed to become an "
                "organization/person registry record in Sanity."
            ),
        )
        st.caption(_ENTITY_REGISTRY_FIT_HELP.get(item["registry_fit"], ""))
    with c2:
        item["self_description"] = st.text_area(
            "Self-description",
            value=item.get("self_description", ""),
            height=100,
            key=f"{prefix}_description",
        )
        if item.get("entity_type") == "person":
            item["role_in_sogice"] = st.selectbox(
                "Role in SOGICE",
                _PERSON_ROLE_OPTIONS,
                index=_option_index(_PERSON_ROLE_OPTIONS, item.get("role_in_sogice", "other")),
                key=f"{prefix}_role",
                help="Controlled role used by the Sanity person schema.",
            )
        else:
            item["role_in_sogice"] = st.text_input(
                "Role in SOGICE",
                value=item.get("role_in_sogice", ""),
                key=f"{prefix}_role",
                help="Free-text role/context for organization proposals. Person proposals use a controlled role list.",
            )
        item["registry_fit_rationale"] = st.text_area(
            "Registry-fit rationale",
            value=item.get("registry_fit_rationale", ""),
            height=70,
            key=f"{prefix}_registry_fit_rationale",
            help="Short note explaining why this is a registry entity, source/media item, or not an entity.",
        )

    if item.get("registry_fit") == "media_or_source":
        st.info(
            "This proposal will stay local and will not be pushed to the "
            "organization/person registry. Use this for podcasts, channels, "
            "publications, source projects, or other media artefacts. If it "
            "should be ingested as its own document, add the URL through the "
            "source queue or Ingest Workbench."
        )
    elif item.get("registry_fit") in {"not_entity", "needs_review"}:
        st.warning(
            "This proposal is not eligible for entity-registry push until it is "
            "changed to Registry entity and saved."
        )

    c3, c4 = st.columns([1, 1])
    with c3:
        item["country_of_origin"] = st.text_input(
            "Country of origin",
            value=item.get("country_of_origin", ""),
            key=f"{prefix}_country",
            help=(
                "Use the legal registration or headquarters country when known. For Europe-wide or international "
                "organizations, record the HQ/registration here and put operating scope such as `Europe-wide`, "
                "`EU`, or `international` in the note/geographic scope. Leave blank if the source does not support it."
            ),
        )
    with c4:
        item["website_url"] = st.text_input(
            "Website URL",
            value=item.get("website_url", ""),
            key=f"{prefix}_website",
            help="Official website. Verify the link is live and actually belongs to this entity before saving.",
        )

    item["evidence_quote"] = st.text_area("Evidence quote", value=item.get("evidence_quote", ""), height=100, key=f"{prefix}_quote")
    item["researcher_note"] = st.text_area("Researcher note", value=item.get("researcher_note", ""), height=80, key=f"{prefix}_note")
    if item.get("network_connections"):
        # Warn the researcher when connection_type was auto-repaired from an
        # invalid model output value so they can correct it before approving.
        _repair_warnings = [
            f"**{conn.get('entity_name', '?')}**: "
            f"{conn.get('repair_note') or 'Invalid connection type needs review.'}"
            for conn in item["network_connections"]
            if (
                conn.get("repair_note")
                or conn.get("invalid_connection_type")
                or conn.get("connection_repair_status") == "needs_review"
            )
        ]
        if _repair_warnings:
            st.warning(
                "⚠️ **Invalid `connection_type` value(s)** — choose an allowed type, "
                "or move person-role relations such as founder/team_member to "
                "`key_individuals` / `affiliated_orgs` before approving:\n\n"
                + "\n".join(f"• {w}" for w in _repair_warnings)
            )
            st.write("**Repair network connection types:**")
            for conn_index, conn in enumerate(item["network_connections"]):
                if not (
                    conn.get("repair_note")
                    or conn.get("invalid_connection_type")
                    or conn.get("connection_repair_status") == "needs_review"
                ):
                    continue
                repair_cols = st.columns([3, 2, 1])
                repair_cols[0].caption(
                    f"{item.get('name', '?')} -> {conn.get('entity_name', '?')} "
                    f"(invalid: `{conn.get('invalid_connection_type') or conn.get('connection_type') or '?'}`)"
                )
                selected_type = repair_cols[1].selectbox(
                    "Allowed connection type",
                    list(ALLOWED_NETWORK_CONNECTION_TYPES),
                    index=_option_index(
                        list(ALLOWED_NETWORK_CONNECTION_TYPES),
                        conn.get("connection_type", "affiliate"),
                    ),
                    key=f"{prefix}_conn_repair_{conn_index}",
                    label_visibility="collapsed",
                )
                if repair_cols[2].button("Save", key=f"{prefix}_conn_repair_save_{conn_index}"):
                    item["network_connections"][conn_index]["connection_type"] = selected_type
                    item["network_connections"][conn_index]["repair_note"] = ""
                    item["network_connections"][conn_index]["invalid_connection_type"] = ""
                    item["network_connections"][conn_index]["connection_repair_status"] = "valid"
                    _update_enrichment_proposal(record["path"], "entity_proposals", record["index"], item)
                    st.success("Saved repaired connection type locally.")
                    st.rerun()
        st.write("**Network connections:**")
        st.dataframe(item["network_connections"], width="stretch")
    if item.get("key_individuals"):
        st.write("**Key individuals:**")
        st.dataframe(item["key_individuals"], width="stretch")

    with st.expander("Move this entity proposal to another queue"):
        st.caption(
            "Use this when the model put a term, tactic, or practice evidence item in the Entity queue. "
            "This creates a new local proposal in the selected queue and rejects the original entity proposal. "
            "Nothing is pushed to Sanity."
        )
        target_family_label = st.selectbox(
            "Move to",
            ["Lexicon term", "Tactic", "Practice evidence"],
            key=f"{prefix}_move_family",
        )
        target_family = {
            "Lexicon term": "lexicon_proposals",
            "Tactic": "tactic_proposals",
            "Practice evidence": "practice_descriptions",
        }[target_family_label]
        move_cluster = "Unknown"
        move_level = "sub-tactic"
        if target_family == "tactic_proposals":
            move_cols = st.columns([1, 1])
            with move_cols[0]:
                move_cluster = _controlled_select(
                    "Primary cluster",
                    "Unknown",
                    _LEXICON_CLUSTERS,
                    key=f"{prefix}_move_tactic_cluster",
                )
            with move_cols[1]:
                move_level = st.selectbox(
                    "Tactic level",
                    ["structural", "sub-tactic", "campaign"],
                    index=_option_index(["structural", "sub-tactic", "campaign"], "sub-tactic"),
                    key=f"{prefix}_move_tactic_level",
                )
        move_note = st.text_area(
            "Conversion note",
            value="",
            height=70,
            key=f"{prefix}_move_note",
            help="Optional note explaining why this belongs in the selected queue.",
        )
        if st.button("Move proposal", key=f"{prefix}_move_to_family"):
            try:
                created = _convert_entity_proposal_to_family(
                    record["path"],
                    record["index"],
                    item,
                    target_family=target_family,
                    primary_cluster=move_cluster,
                    tactic_level=move_level,
                    researcher_note=move_note,
                )
                label = (
                    created.get("term")
                    or created.get("tactic")
                    or created.get("practice_id")
                    or created.get("proposal_id")
                    or "new proposal"
                )
                st.success(
                    f"Created `{label}` in {target_family_label} and rejected the entity proposal locally. "
                    "Open the relevant queue to review it."
                )
            except Exception as exc:
                st.error(f"Could not move proposal: {exc}")

    _render_proposal_confidence_editor(item, prefix)

    b1, b2, b3, b4 = st.columns(4)
    with b1:
        if st.button("Save Entity Edits", key=f"{prefix}_save"):
            _update_enrichment_proposal(record["path"], "entity_proposals", record["index"], item)
            st.success("Saved entity edits.")
    with b2:
        if st.button("Approve Entity", key=f"{prefix}_approve"):
            if item.get("registry_fit") != "registry_entity":
                st.error(
                    "This proposal is marked as media/source, not-entity, or needs decision. "
                    "Change Registry fit to Registry entity before approving it for Sanity."
                )
            else:
                item["approved"] = True
                item["rejected"] = False
                item["proposal_status"] = "approved"
                _update_enrichment_proposal(record["path"], "entity_proposals", record["index"], item)
                st.success("Approved locally. Push approved entities to Sanity when ready.")
    with b3:
        if st.button("Reject Entity", key=f"{prefix}_reject"):
            item["approved"] = False
            item["rejected"] = True
            item["proposal_status"] = "rejected"
            _update_enrichment_proposal(record["path"], "entity_proposals", record["index"], item)
            st.success("Rejected locally.")
    with b4:
        if st.button("Mark Media/Source", key=f"{prefix}_media_source"):
            item["registry_fit"] = "media_or_source"
            if not item.get("registry_fit_rationale"):
                item["registry_fit_rationale"] = "Reviewed as media/source material, not a registry entity."
            item["approved"] = False
            item["rejected"] = True
            item["proposal_status"] = "rejected"
            note = item.get("researcher_note", "")
            marker = "Marked as media/source, not an organization/person registry entity."
            if marker not in note:
                item["researcher_note"] = (note + "\n" + marker).strip()
            _update_enrichment_proposal(record["path"], "entity_proposals", record["index"], item)
            st.success("Marked as media/source and kept out of entity registry push.")


def _render_single_tactic_editor(record: dict) -> None:
    item = dict(record["item"])
    prefix = f"tactic_{record['doc_id']}_{record['index']}"
    c1, c2 = st.columns([1, 1])
    with c1:
        item["tactic"] = st.text_input("Tactic", value=item.get("tactic", ""), key=f"{prefix}_tactic")
        item["action"] = st.selectbox(
            "Action",
            ["add_new", "enrich_existing"],
            index=_option_index(["add_new", "enrich_existing"], item.get("action", "add_new")),
            key=f"{prefix}_action",
            help="add_new creates a new tacticEntry; enrich_existing appends evidence/details to an existing tacticEntry.",
        )
        st.caption(_ENRICHMENT_ACTION_HELP.get(item["action"], ""))
        if item["action"] == "enrich_existing" and not item.get("existing_tactic_id"):
            st.warning(
                "`enrich_existing` needs an existing Sanity tactic id. "
                "Without it the proposal cannot safely attach evidence to the intended tactic."
            )
        if item["action"] == "enrich_existing":
            config = _load_config_safe()
            if st.button("Reload existing Sanity tactics", key=f"{prefix}_reload_tactics"):
                st.session_state.pop("tactic_entries", None)
            if "tactic_entries" not in st.session_state:
                try:
                    from runner.clients.sanity import fetch_tactic_entries
                    st.session_state.tactic_entries = fetch_tactic_entries(config) if config else []
                except Exception as exc:
                    st.session_state.tactic_entries = []
                    st.caption(f"Could not load Sanity tactics: {exc}")
            tactic_options = _tactic_target_options(st.session_state.get("tactic_entries", []))
            if tactic_options:
                target = st.selectbox(
                    "Existing Sanity tactic",
                    tactic_options,
                    index=_tactic_target_index(tactic_options, item),
                    format_func=lambda row: row["label"],
                    key=f"{prefix}_existing_picker",
                    help=(
                        "Select the canonical tacticEntry to enrich. Spellings such as "
                        "`Religious Freedom Shield` and `Religious-Freedom-Shield` are matched "
                        "for lookup, but the real Sanity record remains explicit."
                    ),
                )
                _apply_tactic_target(item, target)
                st.caption(f"Will enrich `{target['tactic']}` (`{target['_id']}`).")
            else:
                item["existing_tactic_id"] = st.text_input(
                    "Existing Sanity tactic id",
                    value=item.get("existing_tactic_id", "") or "",
                    key=f"{prefix}_existing_manual",
                    help="Sanity tactics could not be loaded; paste the existing tacticEntry id manually.",
                )
        item["tactic_level"] = st.selectbox(
            "Tactic level",
            ["structural", "sub-tactic", "campaign"],
            index=_option_index(["structural", "sub-tactic", "campaign"], item.get("tactic_level", "structural")),
            key=f"{prefix}_level",
        )
    with c2:
        item["primary_cluster"] = _controlled_select(
            "Primary cluster",
            item.get("primary_cluster", "Unknown"),
            _LEXICON_CLUSTERS,
            key=f"{prefix}_primary",
            help="Controlled Sanity cluster for tacticEntry.primaryCluster.",
        )
        item["secondary_cluster"] = _controlled_select(
            "Secondary cluster",
            item.get("secondary_cluster", "Unknown"),
            _LEXICON_CLUSTERS,
            key=f"{prefix}_secondary",
            help="Optional controlled Sanity cluster for tacticEntry.secondaryCluster.",
        )
        if item["action"] != "enrich_existing" and item.get("existing_tactic_id"):
            st.caption(f"Existing tactic id kept on file: `{item['existing_tactic_id']}`")

    item["definition"] = st.text_area("Definition", value=item.get("definition", ""), height=100, key=f"{prefix}_definition")
    item["evidence_quote"] = st.text_area("Evidence quote", value=item.get("evidence_quote", ""), height=100, key=f"{prefix}_quote")
    item["researcher_note"] = st.text_area("Researcher note", value=item.get("researcher_note", ""), height=80, key=f"{prefix}_note")
    _render_proposal_confidence_editor(item, prefix)
    _render_review_buttons(record, "tactic_proposals", item, prefix, "tactic")


def _render_single_practice_editor(record: dict) -> None:
    item = dict(record["item"])
    prefix = f"practice_{record['doc_id']}_{record['index']}"
    flash_key = f"{prefix}_flash"
    if st.session_state.get(flash_key):
        st.success(st.session_state.pop(flash_key))

    current_decision = _practice_evidence_decision(item)
    with st.expander("Practice evidence decision guide", expanded=False):
        st.caption(
            "Evidence is the default and safest pilot decision. Public practice categories "
            "should be curated later from recurring clusters, not created item by item."
        )
        for value in _PRACTICE_EVIDENCE_DECISION_OPTIONS:
            st.markdown(
                f"**{_PRACTICE_EVIDENCE_DECISION_LABELS[value]}** — "
                f"{_PRACTICE_EVIDENCE_DECISION_HELP[value]}"
            )

    quote_text = (item.get("harm_quote") or item.get("exact_description") or "").strip()
    if quote_text:
        st.markdown("**Grounded evidence quote / description**")
        st.code(quote_text, language="text")
    else:
        st.warning(
            "This item has no grounded quote/description. Keep it as evidence only after "
            "adding a source note, or reject it if it cannot be grounded."
        )

    c1, c2 = st.columns([1, 1])
    with c1:
        item["practice_id"] = st.text_input(
            "Evidence label",
            value=item.get("practice_id", ""),
            key=f"{prefix}_id",
            help=(
                "Human-readable local label from the model or researcher. It is evidence metadata, "
                "not a public practiceEntry name by itself."
            ),
        )
        selected_decision = st.radio(
            "Decision",
            _PRACTICE_EVIDENCE_DECISION_OPTIONS,
            index=_option_index(_PRACTICE_EVIDENCE_DECISION_OPTIONS, current_decision),
            format_func=lambda value: _PRACTICE_EVIDENCE_DECISION_LABELS.get(value, value),
            key=f"{prefix}_decision",
            help="Primary review choice. Keeping evidence is the normal pilot path.",
        )
        st.caption(_PRACTICE_EVIDENCE_DECISION_HELP[selected_decision])
    with c2:
        inferred_cluster = _practice_cluster_key(item)
        cluster_options = _practice_cluster_options(inferred_cluster)
        selected_cluster = st.selectbox(
            "Evidence cluster",
            cluster_options,
            index=_option_index(cluster_options, inferred_cluster),
            key=f"{prefix}_cluster",
            format_func=_practice_cluster_display,
            help=(
                "Provisional local bucket for comparing similar evidence later. "
                "It does not create or update a public taxonomy record."
            ),
        )
        custom_cluster = st.text_input(
            "Custom cluster key",
            value="",
            key=f"{prefix}_cluster_custom",
            help=(
                "Optional. Use only when none of the listed categories fits. Prefer lowercase snake_case, "
                "for example `school_policy`."
            ),
        )
        item["cluster_label"] = custom_cluster.strip() or selected_cluster
        item["practice_cluster"] = item["cluster_label"]

    if selected_decision == "link_existing":
        link_cols = st.columns([1, 2])
        with link_cols[0]:
            item["linked_type_kind"] = st.selectbox(
                "Link type",
                _PRACTICE_LINK_TYPE_OPTIONS,
                index=_option_index(_PRACTICE_LINK_TYPE_OPTIONS, item.get("linked_type_kind") or "practice"),
                key=f"{prefix}_linked_kind",
                help="What kind of existing controlled record this evidence supports.",
            )
        with link_cols[1]:
            item["linked_type_id"] = st.text_input(
                "Existing tactic/frame/practice ID",
                value=item.get("linked_type_id") or item.get("existing_practice_id", "") or "",
                key=f"{prefix}_linked_id",
                help="Paste the existing Sanity ID or stable local ID. Leave blank if unsure and keep as evidence instead.",
            )
        if item.get("linked_type_kind") == "practice":
            item["existing_practice_id"] = item.get("linked_type_id", "")
    elif selected_decision == "flag_promotion":
        st.info(
            "This will be flagged for a later curation pass. It will not create a public "
            "practiceEntry now."
        )

    cluster_info = _practice_cluster_info(item.get("cluster_label", ""))
    with st.expander("Cluster meaning", expanded=False):
        st.markdown(f"**{_practice_cluster_display(item.get('cluster_label', ''))}**")
        st.write(cluster_info["description"])
        st.markdown(f"**Review hint:** {cluster_info['review_hint']}")
        if cluster_info.get("examples"):
            st.caption(f"Examples: {cluster_info['examples']}")

    item["researcher_note"] = st.text_area(
        "Researcher note",
        value=item.get("researcher_note", ""),
        height=90,
        key=f"{prefix}_note",
        help="Free-form note for context, caveats, follow-up checks, or why the evidence matters.",
    )
    _render_proposal_confidence_editor(item, prefix)

    with st.expander("Advanced fields", expanded=False):
        item["harm_stance"] = st.selectbox(
            "Harm stance",
            ["denied", "minimized", "reframed", "acknowledged", "not_mentioned"],
            index=_option_index(["denied", "minimized", "reframed", "acknowledged", "not_mentioned"], item.get("harm_stance", "not_mentioned")),
            key=f"{prefix}_harm",
            help=(
                "How the source treats harm: denied means harm is rejected; minimized means downplayed; "
                "reframed means presented as help/care; acknowledged means harm is recognized; "
                "not_mentioned means the source does not address harm."
            ),
        )
        item["exact_description"] = st.text_area("Exact description", value=item.get("exact_description", ""), height=100, key=f"{prefix}_description")
        item["harm_quote"] = st.text_area("Harm quote", value=item.get("harm_quote", ""), height=100, key=f"{prefix}_quote")
        item["practice_fit_rationale"] = st.text_area(
            "Evidence decision rationale",
            value=item.get("practice_fit_rationale", ""),
            height=70,
            key=f"{prefix}_fit_rationale",
            help="Short researcher memory note explaining why this item was kept as evidence, linked, flagged, or rejected.",
        )
        item["sanity_id"] = st.text_input("Sanity id", value=item.get("sanity_id", "") or "", disabled=True, key=f"{prefix}_sanity")
        item["pushed_to_sanity"] = st.checkbox("Pushed to Sanity", value=item.get("pushed_to_sanity", False), disabled=True, key=f"{prefix}_pushed")

    st.caption(
        f"Origin: {record['path']} · proposal #{_proposal_display_position(record)} "
        f"(JSON position {record['index']})"
    )
    b1, b2, b3 = st.columns(3)
    with b1:
        if st.button(
            "Save Evidence Review",
            key=f"{prefix}_save",
            help="Writes the current evidence decision to enrichment.json only. It does not push anything.",
        ):
            _apply_practice_evidence_decision(item, selected_decision)
            _update_enrichment_proposal(record["path"], "practice_descriptions", record["index"], item)
            st.session_state[flash_key] = f"Saved: {_PRACTICE_EVIDENCE_DECISION_LABELS[selected_decision]}."
            st.rerun()
    with b2:
        if st.button(
            "Save as Evidence",
            key=f"{prefix}_evidence",
            help="Shortcut: keep this item as local evidence under its selected cluster.",
        ):
            _apply_practice_evidence_decision(item, "keep_evidence")
            _update_enrichment_proposal(record["path"], "practice_descriptions", record["index"], item)
            st.session_state[flash_key] = "Saved as local evidence. It will not be pushed as a standalone practice."
            st.rerun()
    with b3:
        if st.button(
            "Reject",
            key=f"{prefix}_reject",
            help="Rejects this item locally; it will remain in enrichment.json as reviewed noise.",
        ):
            _apply_practice_evidence_decision(item, "reject")
            _update_enrichment_proposal(record["path"], "practice_descriptions", record["index"], item)
            st.session_state[flash_key] = "Rejected locally."
            st.rerun()


def _render_single_claim_editor(record: dict) -> None:
    item = dict(record["item"])
    prefix = f"claim_{record['doc_id']}_{record['index']}"
    st.info(
        "Read this as: 'the source claims...' until you have checked the quotation, context, and any external evidence. "
        "Use approval to keep it in the archive workflow, not to mark it as true."
    )
    item["claim"] = st.text_area("Claim", value=item.get("claim", ""), height=100, key=f"{prefix}_claim")
    c1, c2 = st.columns([1, 1])
    with c1:
        item["source_cited"] = st.text_input("Source cited", value=item.get("source_cited", ""), key=f"{prefix}_source")
        item["verifiable"] = st.checkbox("Verifiable", value=item.get("verifiable", False), key=f"{prefix}_verifiable")
    with c2:
        item["sanity_id"] = st.text_input("Sanity id", value=item.get("sanity_id", "") or "", disabled=True, key=f"{prefix}_sanity")
        item["pushed_to_sanity"] = st.checkbox("Pushed to Sanity", value=item.get("pushed_to_sanity", False), disabled=True, key=f"{prefix}_pushed")
    item["context"] = st.text_area("Context", value=item.get("context", ""), height=90, key=f"{prefix}_context")
    item["researcher_note"] = st.text_area("Researcher note", value=item.get("researcher_note", ""), height=80, key=f"{prefix}_note")
    _render_proposal_confidence_editor(item, prefix)
    _render_review_buttons(record, "statistical_claims", item, prefix, "claim")


def _render_review_buttons(record: dict, key: str, item: dict, prefix: str, label: str) -> None:
    st.caption(
        f"Origin: {record['path']} · proposal #{_proposal_display_position(record)} "
        f"(JSON position {record['index']})"
    )
    b1, b2, b3 = st.columns(3)
    with b1:
        if st.button(f"Save {label.title()} Edits", key=f"{prefix}_save"):
            _update_enrichment_proposal(record["path"], key, record["index"], item)
            st.success(f"Saved {label} edits.")
    with b2:
        if st.button(f"Approve {label.title()}", key=f"{prefix}_approve"):
            item["approved"] = True
            item["rejected"] = False
            item["proposal_status"] = "approved"
            _update_enrichment_proposal(record["path"], key, record["index"], item)
            st.success(f"Approved {label} locally. Push approved records to Sanity when ready.")
    with b3:
        if st.button(f"Reject {label.title()}", key=f"{prefix}_reject"):
            item["approved"] = False
            item["rejected"] = True
            item["proposal_status"] = "rejected"
            _update_enrichment_proposal(record["path"], key, record["index"], item)
            st.success(f"Rejected {label} locally.")


def _local_enrichment_proposal_records(corpus_dir: Path, key: str = "lexicon_proposals") -> list[dict]:
    records: list[dict] = []
    if not corpus_dir.exists():
        return records
    for enrich_path in sorted(corpus_dir.glob("*/enrichment.json")):
        try:
            data = json.loads(enrich_path.read_text())
        except Exception:
            continue
        for index, item in enumerate(data.get(key, [])):
            if key == "lexicon_proposals" and isinstance(item, dict):
                item = _repair_known_lexicon_variant_for_review(item)
            records.append({
                "path": enrich_path,
                "doc_id": enrich_path.parent.name,
                "index": index,
                "item": item,
            })
    return records


def _append_note(existing: str, marker: str) -> str:
    existing = (existing or "").strip()
    marker = marker.strip()
    if not marker:
        return existing
    if marker in existing:
        return existing
    return (existing + "\n" + marker).strip() if existing else marker


def _entity_item_from_lexicon_proposal(
    item: dict,
    doc_id: str,
    *,
    entity_type: str = "organization",
    registry_fit: str = "registry_entity",
    role_in_sogice: str = "",
    researcher_note: str = "",
) -> dict:
    if entity_type not in {"organization", "person"}:
        raise ValueError(f"Unsupported entity_type: {entity_type}")
    if registry_fit not in _ENTITY_REGISTRY_FIT_OPTIONS:
        raise ValueError(f"Unsupported registry_fit: {registry_fit}")

    name = str(item.get("term") or "").strip()
    if not name:
        raise ValueError("Lexicon proposal has no term to convert into an entity name.")

    model_confidence = _proposal_confidence(item, "model_confidence", "llm_confidence", "confidence")
    entity = {
        "action": "add_new",
        "entity_type": entity_type,
        "name": name,
        "registry_fit": registry_fit,
        "registry_fit_rationale": (
            "Researcher moved this proposal from the lexicon queue because it names "
            "an organization/person rather than a discourse term."
        ),
        "self_description": item.get("definition_as_used") or item.get("accessible_definition") or "",
        "activities_stated": [],
        "geographic_scope": [],
        "legal_entities_mentioned": [],
        "claims_made": [],
        "evidence_quote": item.get("exact_quote", ""),
        "network_connections": [],
        "key_individuals": [],
        "affiliated_orgs": [],
        "role_in_sogice": role_in_sogice,
        "approved": False,
        "rejected": False,
        "pushed_to_sanity": False,
        "sanity_id": None,
        "researcher_note": _append_note(
            researcher_note,
            f"Converted from lexicon proposal `{item.get('proposal_id') or name}` for researcher review.",
        ),
        "proposal_status": "pending",
        "source_lexicon_proposal_id": item.get("proposal_id"),
        "source_lexicon_term": name,
        "source_lexicon_action": item.get("action", ""),
        "converted_from_family": "lexicon_proposals",
        "converted_at": datetime.now(timezone.utc).isoformat(),
    }
    if model_confidence is not None:
        entity["model_confidence"] = model_confidence
    researcher_confidence = _proposal_confidence(item, "researcher_confidence")
    if researcher_confidence is not None:
        entity["researcher_confidence"] = researcher_confidence
    if item.get("confidence_rationale"):
        entity["confidence_rationale"] = item.get("confidence_rationale")

    try:
        from runner.pipeline.enrich import _generate_proposal_id

        entity["proposal_id"] = _generate_proposal_id("entity", doc_id, entity)
    except Exception:
        # Proposal IDs are helpful for merge stability, but the review tool should
        # still repair a misplaced proposal if the enrichment module is unavailable.
        entity["proposal_id"] = None
    return entity


def _tactic_item_from_lexicon_proposal(
    item: dict,
    doc_id: str,
    *,
    primary_cluster: str = "Unknown",
    tactic_level: str = "sub-tactic",
    researcher_note: str = "",
) -> dict:
    if primary_cluster not in _LEXICON_CLUSTERS:
        raise ValueError(f"Unsupported primary_cluster: {primary_cluster}")
    if tactic_level not in {"structural", "sub-tactic", "campaign"}:
        raise ValueError(f"Unsupported tactic_level: {tactic_level}")

    tactic = str(item.get("term") or "").strip()
    if not tactic:
        raise ValueError("Lexicon proposal has no term to convert into a tactic label.")

    model_confidence = _proposal_confidence(item, "model_confidence", "llm_confidence", "confidence")
    tactic_item = {
        "action": "add_new",
        "tactic": tactic,
        "primary_cluster": primary_cluster,
        "secondary_cluster": "Unknown",
        "tactic_level": tactic_level,
        "definition": item.get("definition_as_used") or item.get("accessible_definition") or "",
        "evidence_quote": item.get("exact_quote", ""),
        "approved": False,
        "rejected": False,
        "pushed_to_sanity": False,
        "sanity_id": None,
        "researcher_note": _append_note(
            researcher_note,
            f"Converted from lexicon proposal `{item.get('proposal_id') or tactic}` for researcher review.",
        ),
        "proposal_status": "pending",
        "source_lexicon_proposal_id": item.get("proposal_id"),
        "source_lexicon_term": tactic,
        "source_lexicon_action": item.get("action", ""),
        "converted_from_family": "lexicon_proposals",
        "converted_at": datetime.now(timezone.utc).isoformat(),
    }
    if model_confidence is not None:
        tactic_item["model_confidence"] = model_confidence
    researcher_confidence = _proposal_confidence(item, "researcher_confidence")
    if researcher_confidence is not None:
        tactic_item["researcher_confidence"] = researcher_confidence
    if item.get("confidence_rationale"):
        tactic_item["confidence_rationale"] = item.get("confidence_rationale")

    try:
        from runner.pipeline.enrich import _generate_proposal_id

        tactic_item["proposal_id"] = _generate_proposal_id("tactic", doc_id, tactic_item)
    except Exception:
        tactic_item["proposal_id"] = None
    return tactic_item


def _active_entity_proposal_exists(proposals: list[dict], *, name: str, entity_type: str) -> bool:
    wanted_name = name.strip().casefold()
    wanted_type = entity_type.strip().casefold()
    for proposal in proposals:
        if not isinstance(proposal, dict) or proposal.get("rejected"):
            continue
        if str(proposal.get("name", "")).strip().casefold() != wanted_name:
            continue
        if str(proposal.get("entity_type", "")).strip().casefold() == wanted_type:
            return True
    return False


def _active_tactic_proposal_exists(proposals: list[dict], *, tactic: str) -> bool:
    wanted = tactic.strip().casefold().replace("-", " ")
    for proposal in proposals:
        if not isinstance(proposal, dict) or proposal.get("rejected"):
            continue
        candidate = str(proposal.get("tactic", "")).strip().casefold().replace("-", " ")
        if candidate == wanted:
            return True
    return False


def _convert_lexicon_proposal_to_entity(
    path: Path,
    index: int,
    lexicon_item: dict | None = None,
    *,
    entity_type: str = "organization",
    registry_fit: str = "registry_entity",
    role_in_sogice: str = "",
    researcher_note: str = "",
) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    lexicon_proposals = data.setdefault("lexicon_proposals", [])
    if index >= len(lexicon_proposals):
        raise IndexError(f"Proposal index {index} no longer exists in {path}")

    current = dict(lexicon_item or lexicon_proposals[index])
    doc_id = path.parent.name
    entity = _entity_item_from_lexicon_proposal(
        current,
        doc_id,
        entity_type=entity_type,
        registry_fit=registry_fit,
        role_in_sogice=role_in_sogice,
        researcher_note=researcher_note,
    )
    entity_proposals = data.setdefault("entity_proposals", [])
    if _active_entity_proposal_exists(entity_proposals, name=entity["name"], entity_type=entity_type):
        raise ValueError(
            f"An active {entity_type} entity proposal named {entity['name']!r} already exists in this enrichment file."
        )

    entity_proposals.append(entity)

    marker = (
        f"Converted to entity proposal `{entity.get('proposal_id') or entity['name']}` "
        f"as {entity_type}; original lexicon proposal rejected locally."
    )
    current["approved"] = False
    current["rejected"] = True
    current["proposal_status"] = "rejected"
    current["converted_to_entity_proposal_id"] = entity.get("proposal_id")
    current["converted_to_entity_at"] = entity.get("converted_at")
    current["researcher_note"] = _append_note(current.get("researcher_note", ""), marker)
    lexicon_proposals[index] = current

    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return entity


def _convert_lexicon_proposal_to_tactic(
    path: Path,
    index: int,
    lexicon_item: dict | None = None,
    *,
    primary_cluster: str = "Unknown",
    tactic_level: str = "sub-tactic",
    researcher_note: str = "",
) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    lexicon_proposals = data.setdefault("lexicon_proposals", [])
    if index >= len(lexicon_proposals):
        raise IndexError(f"Proposal index {index} no longer exists in {path}")

    current = dict(lexicon_item or lexicon_proposals[index])
    doc_id = path.parent.name
    tactic = _tactic_item_from_lexicon_proposal(
        current,
        doc_id,
        primary_cluster=primary_cluster,
        tactic_level=tactic_level,
        researcher_note=researcher_note,
    )
    tactic_proposals = data.setdefault("tactic_proposals", [])
    if _active_tactic_proposal_exists(tactic_proposals, tactic=tactic["tactic"]):
        raise ValueError(f"An active tactic proposal named {tactic['tactic']!r} already exists in this enrichment file.")

    tactic_proposals.append(tactic)

    marker = (
        f"Converted to tactic proposal `{tactic.get('proposal_id') or tactic['tactic']}`; "
        "original lexicon proposal rejected locally."
    )
    current["approved"] = False
    current["rejected"] = True
    current["proposal_status"] = "rejected"
    current["converted_to_tactic_proposal_id"] = tactic.get("proposal_id")
    current["converted_to_tactic_at"] = tactic.get("converted_at")
    current["researcher_note"] = _append_note(current.get("researcher_note", ""), marker)
    lexicon_proposals[index] = current

    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return tactic


def _converted_entity_common(current: dict, *, target_family: str, researcher_note: str = "") -> dict:
    now = datetime.now(timezone.utc).isoformat()
    marker = (
        f"Converted from entity proposal `{current.get('proposal_id') or current.get('name') or ''}`. "
        "Model-proposed; researcher must review before treating as registry evidence."
    )
    note = _append_note(current.get("researcher_note", ""), marker)
    if researcher_note:
        note = _append_note(note, researcher_note)
    common = {
        "approved": False,
        "rejected": False,
        "pushed_to_sanity": False,
        "sanity_id": None,
        "proposal_status": "pending",
        "researcher_note": note,
        "converted_from_family": "entity_proposals",
        "converted_from_proposal_id": current.get("proposal_id"),
        "converted_at": now,
    }
    model_confidence = _proposal_confidence(current, "model_confidence", "llm_confidence", "confidence")
    if model_confidence is not None:
        common["model_confidence"] = model_confidence
    researcher_confidence = _proposal_confidence(current, "researcher_confidence")
    if researcher_confidence is not None:
        common["researcher_confidence"] = researcher_confidence
    if current.get("confidence_rationale"):
        common["confidence_rationale"] = current.get("confidence_rationale")
    common["target_family"] = target_family
    return common


def _lexicon_item_from_entity_proposal(current: dict, doc_id: str, *, researcher_note: str = "") -> dict:
    label = str(current.get("name") or "").strip()
    item = {
        **_converted_entity_common(current, target_family="lexicon_proposals", researcher_note=researcher_note),
        "action": "add_new",
        "term": label,
        "language": "en",
        "proposed_cluster": "Unknown",
        "function": "Unknown",
        "exact_quote": current.get("evidence_quote", ""),
        "definition_as_used": current.get("self_description") or current.get("role_in_sogice") or label,
        "accessible_definition": "",
        "usage_register": "neutral",
        "variants": [],
        "relationships": [],
        "co_occurring_terms": [],
        "existing_entry_id": None,
        "existing_entry_term": None,
        "merge_target_id": None,
    }
    try:
        from runner.pipeline.enrich import _generate_proposal_id

        item["proposal_id"] = _generate_proposal_id("lexicon", doc_id, item)
    except Exception:
        item["proposal_id"] = None
    return item


def _tactic_item_from_entity_proposal(
    current: dict,
    doc_id: str,
    *,
    primary_cluster: str = "Unknown",
    tactic_level: str = "sub-tactic",
    researcher_note: str = "",
) -> dict:
    label = str(current.get("name") or "").strip()
    item = {
        **_converted_entity_common(current, target_family="tactic_proposals", researcher_note=researcher_note),
        "action": "add_new",
        "tactic": label,
        "definition": current.get("self_description") or current.get("role_in_sogice") or label,
        "evidence_quote": current.get("evidence_quote", ""),
        "primary_cluster": primary_cluster,
        "secondary_cluster": "Unknown",
        "tactic_level": tactic_level,
        "existing_tactic_id": None,
    }
    try:
        from runner.pipeline.enrich import _generate_proposal_id

        item["proposal_id"] = _generate_proposal_id("tactic", doc_id, item)
    except Exception:
        item["proposal_id"] = None
    return item


def _practice_item_from_entity_proposal(current: dict, doc_id: str, *, researcher_note: str = "") -> dict:
    label = str(current.get("name") or "").strip()
    item = {
        **_converted_entity_common(current, target_family="practice_descriptions", researcher_note=researcher_note),
        "practice_id": f"Practice: {label}",
        "exact_description": current.get("evidence_quote") or current.get("self_description") or label,
        "practice_fit": "candidate_evidence",
        "practice_cluster": "",
        "practice_fit_rationale": "Converted from an entity proposal; keep as evidence until clustered or promoted.",
        "existing_practice_id": None,
        "harm_stance": "not_mentioned",
        "harm_quote": "",
    }
    try:
        from runner.pipeline.enrich import _generate_proposal_id

        item["proposal_id"] = _generate_proposal_id("practice", doc_id, item)
    except Exception:
        item["proposal_id"] = None
    return item


def _convert_entity_proposal_to_family(
    path: Path,
    index: int,
    entity_item: dict | None = None,
    *,
    target_family: str,
    primary_cluster: str = "Unknown",
    tactic_level: str = "sub-tactic",
    researcher_note: str = "",
) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    entity_proposals = data.setdefault("entity_proposals", [])
    if index >= len(entity_proposals):
        raise IndexError(f"Proposal index {index} no longer exists in {path}")

    current = dict(entity_item or entity_proposals[index])
    doc_id = path.parent.name
    if target_family == "lexicon_proposals":
        created = _lexicon_item_from_entity_proposal(current, doc_id, researcher_note=researcher_note)
        target = data.setdefault("lexicon_proposals", [])
        if _active_lexicon_proposal_exists(target, term=created["term"]):
            raise ValueError(f"An active lexicon proposal named {created['term']!r} already exists in this enrichment file.")
    elif target_family == "tactic_proposals":
        created = _tactic_item_from_entity_proposal(
            current,
            doc_id,
            primary_cluster=primary_cluster,
            tactic_level=tactic_level,
            researcher_note=researcher_note,
        )
        target = data.setdefault("tactic_proposals", [])
        if _active_tactic_proposal_exists(target, tactic=created["tactic"]):
            raise ValueError(f"An active tactic proposal named {created['tactic']!r} already exists in this enrichment file.")
    elif target_family == "practice_descriptions":
        created = _practice_item_from_entity_proposal(current, doc_id, researcher_note=researcher_note)
        target = data.setdefault("practice_descriptions", [])
        if _active_practice_proposal_exists(target, practice_id=created["practice_id"]):
            raise ValueError(
                f"An active practice evidence item named {created['practice_id']!r} already exists in this enrichment file."
            )
    else:
        raise ValueError(f"Unsupported target family: {target_family}")

    target.append(created)
    marker = (
        f"Converted to {target_family} proposal `{created.get('proposal_id') or created.get('term') or created.get('tactic') or created.get('practice_id')}`; "
        "original entity proposal rejected locally."
    )
    current["approved"] = False
    current["rejected"] = True
    current["proposal_status"] = "rejected"
    current[f"converted_to_{target_family}_id"] = created.get("proposal_id")
    current["converted_to_family"] = target_family
    current["converted_at"] = created.get("converted_at")
    current["researcher_note"] = _append_note(current.get("researcher_note", ""), marker)
    entity_proposals[index] = current

    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return created


def _update_enrichment_proposal(path: Path, key: str, index: int, item: dict) -> None:
    data = json.loads(path.read_text())
    proposals = data.setdefault(key, [])
    if index >= len(proposals):
        raise IndexError(f"Proposal index {index} no longer exists in {path}")
    proposals[index] = item
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _render_ingestion_queue(config) -> None:
    """Show URLs flagged as ingestion candidates from enrichment.json files."""
    st.caption(
        "These are documents — URLs, PDFs, or other sources — that the enrichment stage "
        "discovered inside already-ingested documents and flagged as worth ingesting next. "
        "They have **not** been ingested yet. Click the command to copy it and run it in the terminal, "
        "or ingest directly from the Ingest Workbench page."
    )
    from runner.pipeline import enrich as _enrich

    rows = []
    for doc_dir in sorted(config.corpus_dir.iterdir()):
        if not doc_dir.is_dir():
            continue
        enrichment_path = doc_dir / "enrichment.json"
        if not enrichment_path.exists():
            continue
        result = _enrich.load(doc_dir.name, config)
        if not result or not result.ingestion_queue:
            continue
        for item in result.ingestion_queue:
            rows.append({
                "doc_id":       doc_dir.name,
                "url":          item.url,
                "title":        item.title or "",
                "type":         item.source_type,
                "priority":     item.priority,
                "in_corpus":    item.already_in_corpus,
            })

    if not rows:
        st.info("No ingestion candidates found. Run enrichment on ingested documents to discover linked sources.")
        return

    rows = sorted(rows, key=_ingestion_sort_key)
    pending = [r for r in rows if not r["in_corpus"]]
    already = [r for r in rows if r["in_corpus"]]

    _render_ingestion_status_metrics(rows)
    st.dataframe([
        {
            "status": _ingestion_status(row),
            "doc_id": row["doc_id"],
            "priority": row["priority"],
            "type": row["type"],
            "title": row["title"],
            "url": row["url"],
        }
        for row in rows
    ], width="stretch", hide_index=True)

    if pending:
        st.markdown("**Pending — not yet ingested**")
        for r in pending:
            priority_colour = "🔴" if r["priority"] == "high" else "🟡" if r["priority"] == "medium" else "⚪"
            with st.expander(f"[{_ingestion_status(r)}] {priority_colour} {r['doc_id']} · [{r['type']}] {r['title'] or r['url'][:80]}"):
                st.code(f"python3 -m runner ingest '{r['url']}' --llm litelm", language="bash")
                st.caption(f"Source doc: `{r['doc_id']}`")
                st.markdown(f"[Open URL]({r['url']})")

    if already:
        with st.expander(f"{len(already)} already in corpus"):
            for r in already:
                st.caption(f"[{_ingestion_status(r)}] `{r['doc_id']}` — {r['url'][:80]}")


def _proposal_gate_status(corpus_dir: Path) -> dict:
    lexicon = _local_enrichment_proposal_records(corpus_dir, "lexicon_proposals")
    entities = _local_enrichment_proposal_records(corpus_dir, "entity_proposals")
    tactics = _local_enrichment_proposal_records(corpus_dir, "tactic_proposals")
    practices = _local_enrichment_proposal_records(corpus_dir, "practice_descriptions")
    claims = _local_enrichment_proposal_records(corpus_dir, "statistical_claims")

    def unresolved(records: list[dict]) -> int:
        return sum(
            1 for record in records
            if not record["item"].get("approved")
            and not record["item"].get("rejected")
        )

    def approved_unpushed(records: list[dict]) -> int:
        return sum(
            1 for record in records
            if record["item"].get("approved")
            and not record["item"].get("rejected")
            and not record["item"].get("pushed_to_sanity")
        )

    status = {
        "unresolved_lexicon": unresolved(lexicon),
        "approved_unpushed_lexicon": approved_unpushed(lexicon),
        "unresolved_entities": unresolved(entities),
        "approved_unpushed_entities": approved_unpushed(entities),
        "unresolved_tactics": unresolved(tactics),
        "approved_unpushed_tactics": approved_unpushed(tactics),
        "unresolved_practices": unresolved(practices),
        "approved_unpushed_practices": approved_unpushed(practices),
        "unresolved_statistical_claims": unresolved(claims),
        "approved_unpushed_statistical_claims": approved_unpushed(claims),
    }
    status["blocked"] = any(status.values())
    return status


def _option_index(options: list[str], value: str) -> int:
    try:
        return options.index(value)
    except ValueError:
        return 0


def _controlled_select(label: str, value: str, options: list[str], key: str, help: str = "") -> str:
    """Select a controlled-vocabulary value while preserving unexpected legacy values."""
    current = value or options[0]
    display_options = list(options)
    if current and current not in display_options:
        display_options.append(current)
        help = (help + " " if help else "") + "Current value is outside the controlled list; save a listed value before pushing to Sanity."
    return st.selectbox(
        label,
        display_options,
        index=_option_index(display_options, current),
        key=key,
        help=help,
    )


# ---------------------------------------------------------------------------
# Activity Log
# ---------------------------------------------------------------------------

def page_testimony_review():
    st.title("Testimony Review")

    config = _load_config_safe()
    if not config:
        st.error("Could not load config. Check runner/.env.")
        return

    st.warning(
        "Privacy note: Grammarly and other browser writing assistants are external services. "
        "The writing boxes use standard multi-line browser fields, but do not paste raw testimony, "
        "exact quotations, names, or sensitive case notes into them unless your research agreement "
        "explicitly permits that service."
    )
    _render_testimony_source_intake(config)

    build_col, export_col = st.columns([2, 3])
    with build_col:
        candidate_docs = sorted({
            path.parent.name
            for name in ("testimony_candidates.json", "analysis.json", "enrichment.json")
            for path in config.corpus_dir.glob(f"*/{name}")
        })
        refresh_doc = st.selectbox(
            "Candidate register to check",
            candidate_docs,
            key="testimony_refresh_doc",
            help="Checks one document in memory first; it does not rewrite all 4,000 documents.",
        ) if candidate_docs else ""
        if st.button("Preview candidate refresh", disabled=not refresh_doc):
            try:
                from runner.pipeline import testimony_candidates
                preview = testimony_candidates.preview_testimony_candidate_refresh(
                    config.corpus_dir / refresh_doc
                )
                st.session_state["testimony_refresh_preview"] = preview
            except Exception as exc:
                st.error(f"Could not preview testimony candidates: {exc}")
            else:
                st.success("Read-only comparison complete.")
        preview = st.session_state.get("testimony_refresh_preview") or {}
        if preview and preview.get("doc_id") == refresh_doc:
            st.caption(
                f"Saved {preview.get('saved_count', 0)} → current {preview.get('current_count', 0)}; "
                f"add {len(preview.get('added_ids', []))}, remove {len(preview.get('removed_ids', []))}, "
                f"change {len(preview.get('changed_ids', []))}."
            )
            if preview.get("removed_ids"):
                st.warning(
                    "Removed leads remain addressable: the full prior register is archived in "
                    "testimony_candidate_history.jsonl and decisions remain in "
                    "testimony_candidate_reviews.json."
                )
            if st.button(
                "Apply this document refresh",
                key="testimony_refresh_apply",
                disabled=not bool(preview.get("is_stale")),
            ):
                from runner.pipeline.testimony_candidates import (
                    apply_testimony_candidate_refresh,
                    testimony_candidate_source_fingerprint,
                )
                doc_dir = config.corpus_dir / refresh_doc
                current_fingerprint = testimony_candidate_source_fingerprint(doc_dir)
                if current_fingerprint != preview.get("source_fingerprint"):
                    st.error(
                        "Analysis/enrichment changed after this preview. Nothing was written; "
                        "run Preview candidate refresh again."
                    )
                else:
                    apply_testimony_candidate_refresh(doc_dir, preview)
                    st.session_state.pop("testimony_refresh_preview", None)
                    st.success(f"Refreshed only {refresh_doc}.")
                    st.rerun()
    with export_col:
        st.caption(
            "Candidate extraction is local and derived from analysis, longform review, enrichment, "
            "and citation units. A candidate is an AI lead, not confirmed testimony. Preview is read-only; "
            "apply refreshes only the selected document and never publishes."
        )
    _render_testimony_review_body(config)


def _render_testimony_source_intake(config) -> None:
    """Stage a testimony-bearing file and hand it to the existing triage queue."""
    with st.expander("1 · Add a file that may contain testimony", expanded=False):
        st.markdown(
            "Upload creates one private, content-addressed working copy. It **does not analyse, "
            "publish, or bypass triage**. The new Source Queue row remains `new`; run Triage there "
            "before sending it to the existing batch/ingestion workflow."
        )
        uploaded = st.file_uploader(
            "Source file",
            type=["pdf", "docx", "odt", "epub", "txt", "md", "html", "htm", "rtf"],
            key="testimony_source_upload",
            help="Maximum 75 MB. Your original file is never changed.",
        )
        source_url = st.text_input(
            "Original source URL (optional)",
            key="testimony_source_url",
            help="Keep the publication/download page as provenance when you have it.",
        )
        notes = st.text_area(
            "Research note (optional)",
            key="testimony_source_note",
            height=80,
            help="Researcher-authored note only; avoid sensitive testimony text if a browser writing assistant is active.",
        )
        if st.button("Stage file and add to Source Queue", key="testimony_source_stage", disabled=uploaded is None):
            try:
                from runner.pipeline.research_upload import stage_research_source
                from runner.pipeline import source_queue

                clean_source_url = source_url.strip()
                if clean_source_url and not clean_source_url.startswith(("http://", "https://")):
                    raise ValueError("Original source URL must be blank or start with http:// or https://.")
                staged = stage_research_source(
                    uploaded.getvalue(),
                    uploaded.name,
                    Path(config.exports_dir) / "researcher_uploads",
                )
                queue_url = clean_source_url or staged["path"]
                db = source_queue.open_db(source_queue.queue_db_path(config.corpus_dir))
                try:
                    item = source_queue.add_item(
                        db,
                        queue_url,
                        title=Path(uploaded.name).stem,
                        notes=("May contain testimony. " + notes.strip()).strip(),
                        tags="testimony-source",
                        batch_group="testimony-review",
                        status="new",
                    )
                    if item is None:
                        matches = source_queue.get_items_by_urls(db, [queue_url])
                        item = matches[0] if matches else None
                    if item is None:
                        raise RuntimeError("The staged file could not be linked to a Source Queue row.")
                    existing_attachment = str(getattr(item, "source_file_path", "") or "").strip()
                    if existing_attachment and Path(existing_attachment).resolve() != Path(staged["path"]).resolve():
                        raise ValueError(
                            "That source URL already has a different attached file. Nothing was replaced; "
                            "review the existing Source Queue row before changing its source bundle."
                        )
                    source_queue.update_source_file_attachment(
                        db,
                        item.id,
                        needs_source_file=False,
                        source_file_path=staged["path"],
                        source_file_relation="testimony_source",
                        source_file_url=clean_source_url,
                        source_file_note="Private staged copy; triage required before processing.",
                    )
                    db.execute(
                        "UPDATE source_queue SET needs_testimony_review = 1, overnight_batch_safe = 0 WHERE id = ?",
                        (item.id,),
                    )
                    db.commit()
                finally:
                    db.close()
            except Exception as exc:
                st.error(f"Could not stage the testimony source: {exc}")
            else:
                duplicate_note = " (identical staged copy already existed)" if staged["duplicate"] else ""
                st.success(
                    f"Added Source Queue row {item.id}{duplicate_note}. Next: open Source Queue and run Triage; "
                    "the testimony review flag prevents unattended processing."
                )
                if st.button("Open Source Queue", key="testimony_source_open_queue"):
                    st.session_state["_nav_to"] = "Source Queue"
                    st.rerun()

def _render_testimony_review_body(config) -> None:
    rows = _testimony_review_rows(config.corpus_dir)
    candidate_rows = _testimony_candidate_rows(config.corpus_dir)
    if not rows:
        if not candidate_rows:
            st.info("No testimony-flagged documents or testimony candidates found locally.")
            return
        st.info("No document-level testimony gates found, but testimony candidates exist below.")

    st.info(
        "Testimony defaults to consentStatus=unclear and publicDisplay=false. "
        "A document may be uploaded to Sanity as an unverified archive record while review is pending. "
        "Public display, excerpts, verification, and publication remain blocked. Refused or withdrawn consent blocks remote upload."
    )
    if rows:
        st.dataframe(rows, width="stretch", hide_index=True)

    tabs = st.tabs(["Document consent gate", "Testimony candidates"])
    with tabs[0]:
        if not rows:
            st.info("No document-level testimony gate is currently active.")
        else:
            selected = st.selectbox("Review document", [row["doc_id"] for row in rows])
            # U3: clear any pending consent-form state when the selected document changes
            _panel_reset_on_doc_change("testimony", selected, ["_testimony_consent_pending"])

            doc_dir = config.corpus_dir / selected
            analysis = _load_json_if_exists(doc_dir / "analysis.json") or {}
            existing = _load_json_if_exists(_testimony_review_path(config, selected)) or {}

            st.subheader(selected)
            st.write(analysis.get("summary", ""))
            assets = [
                asset for asset in analysis.get("extractable_assets", [])
                if asset.get("asset_type") == "testimony_excerpt"
            ]
            if assets:
                st.write("**Testimony excerpts detected:**")
                st.dataframe(assets, width="stretch")

            _CONSENT_OPTIONS = ["unclear", "pending", "confirmed", "refused", "withdrawn"]
            consent = st.selectbox(
                "Consent status",
                _CONSENT_OPTIONS,
                index=_option_index(_CONSENT_OPTIONS, existing.get("consent_status", "unclear")),
            )
            public_display = st.checkbox("Allow public display", value=bool(existing.get("public_display", False)))
            public_excerpt = st.text_area("Public excerpt (optional, max 200 words)", value=existing.get("public_excerpt", ""), height=120)
            notes = st.text_area("Researcher notes", value=existing.get("notes", ""), height=120)

            if consent == "withdrawn" and (doc_dir / "sanity_record.json").exists():
                st.warning(
                    "**Consent withdrawn — this document may already be live in Sanity.** "
                    "A `sanity_record.json` exists locally, indicating it was previously uploaded. "
                    "You must manually review the Sanity record, redact or remove any testimony content, "
                    "and patch `meta.testimonyConsent` to `withdrawn`. Do not re-upload without researcher sign-off."
                )

            if public_display and consent != "confirmed":
                st.error("Public display requires confirmed consent.")

            if st.button("Save Testimony Review", disabled=(public_display and consent != "confirmed")):
                payload = {
                    "doc_id": selected,
                    "consent_status": consent,
                    "consent_source": existing.get("consent_source", "unknown"),
                    "public_display": public_display,
                    "public_excerpt": public_excerpt,
                    "notes": notes,
                    "reviewed": True,
                    "reviewed_by": "researcher",
                    "reviewed_at": datetime.now(timezone.utc).isoformat(),
                }
                _testimony_review_path(config, selected).write_text(json.dumps(payload, indent=2), encoding="utf-8")

                # Sync consent status to intake.json so the upload gate can read it.
                # The upload gate checks intake.testimony_consent, not testimony_review.json.
                try:
                    from runner.pipeline.intake import update_intake_consent
                    if consent in ("confirmed", "pending", "unclear", "refused", "withdrawn"):
                        update_intake_consent(selected, consent, config)
                except Exception:
                    pass  # intake.json may not exist for older ingest records; not fatal

                if consent == "confirmed":
                    st.success(
                        f"Saved testimony_review.json and updated intake.json → consent: **{consent}**. "
                        "The document remains eligible for archive upload; public-display permission follows the saved review choices."
                    )
                elif consent in ("refused", "withdrawn"):
                    st.warning(
                        f"Saved testimony_review.json and updated intake.json → consent: **{consent}**. "
                        "Upload is blocked. If already uploaded to Sanity, manually patch "
                        "`meta.testimonyConsent` and redact any public-facing content."
                    )
                else:
                    st.info(
                        f"Saved testimony_review.json and updated intake.json → consent: **{consent}**. "
                        "Unverified archive upload remains allowed, but public display and publication stay blocked."
                    )

    with tabs[1]:
        _render_testimony_candidate_review(config.corpus_dir, candidate_rows)


def _testimony_review_rows(corpus_dir: Path) -> list[dict]:
    rows: list[dict] = []
    if not corpus_dir.exists():
        return rows
    for doc_dir in sorted(corpus_dir.iterdir()):
        analysis = _load_json_if_exists(doc_dir / "analysis.json")
        if not analysis:
            continue
        assets = analysis.get("extractable_assets", [])
        testimony_assets = [
            asset for asset in assets
            if asset.get("asset_type") == "testimony_excerpt"
        ]
        testimony_types = {
            analysis.get("type"), analysis.get("primary_type"), analysis.get("secondary_type")
        }
        if (
            not analysis.get("testimony_flag")
            and not testimony_assets
            and not testimony_types.intersection({"Testimony", "Survivor-Network-Material"})
        ):
            continue
        review = _load_json_if_exists(doc_dir / "testimony_review.json") or {}
        intake = _load_json_if_exists(doc_dir / "intake.json") or {}
        state = _document_testimony_state(analysis, intake, review)
        rows.append({
            "doc_id": doc_dir.name,
            "type": analysis.get("type", "?"),
            "testimony_flag": analysis.get("testimony_flag", False),
            "testimony_excerpts": len(testimony_assets),
            "consent_status": review.get("consent_status", "unreviewed"),
            "intake_consent": intake.get("testimony_consent", "missing") or "missing",
            "archive_state": state["state"],
            "consent_disagreement": state.get("disagreement", False),
            "public_display": review.get("public_display", False),
            "reviewed": review.get("reviewed", False),
        })
    return rows


def _testimony_review_path(config, doc_id: str) -> Path:
    return config.corpus_dir / doc_id / "testimony_review.json"


def _testimony_candidate_reviews_path(doc_dir: Path) -> Path:
    return Path(doc_dir) / "testimony_candidate_reviews.json"


def _testimony_candidate_rows(corpus_dir: Path) -> list[dict]:
    rows: list[dict] = []
    for path in sorted(Path(corpus_dir).glob("*/testimony_candidates.json")):
        payload = _load_json_if_exists(path) or {}
        reviews = _load_json_if_exists(path.parent / "testimony_candidate_reviews.json") or {}
        review_map = reviews.get("reviews") if isinstance(reviews.get("reviews"), dict) else {}
        for candidate in payload.get("candidates") or []:
            if not isinstance(candidate, dict):
                continue
            cid = str(candidate.get("candidate_id") or "")
            review = review_map.get(cid, {}) if isinstance(review_map, dict) else {}
            public = candidate.get("public") if isinstance(candidate.get("public"), dict) else {}
            rows.append({
                **candidate,
                "doc_id": path.parent.name,
                "candidate_id": cid,
                "review_decision": review.get("review_state", candidate.get("review_state", "model_proposed")),
                "review_public_display": review.get("public_display", public.get("public_display", False)),
                "review_public_readiness": review.get("public_readiness", public.get("public_readiness", "")),
                "review_public_excerpt": review.get("public_excerpt", public.get("public_excerpt", "")),
                "review_notes": review.get("notes", ""),
            })
    return rows


def _render_testimony_candidate_review(corpus_dir: Path, candidate_rows: list[dict]) -> None:
    st.subheader("2 · Verify AI testimony leads")
    st.caption(
        "A candidate is an AI lead, not confirmed testimony and not a validated lexicon/entity record. "
        "They can represent survivor testimony, ex-gay promotional stories, clinical case stories, "
        "founder memory, media excerpts, or institutional witness material. Confirm the source excerpt first."
    )
    if not candidate_rows:
        st.info("No testimony candidate sidecars found. Use Build / refresh testimony candidates first.")
        return

    counts = Counter(str(row.get("testimony_type") or "unclear_testimony") for row in candidate_rows)
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Candidates", len(candidate_rows))
    c2.metric("Survivor", counts.get("survivor_testimony", 0))
    c3.metric("Ex-gay / promo", counts.get("ex_gay_promotional_testimony", 0))
    c4.metric("Clinical cases", counts.get("clinical_case_story", 0))

    family_options = ["(all)"] + sorted(counts)
    selected_type = st.selectbox("Filter by testimony type", family_options, key="testimony_candidate_type_filter")
    search = st.text_input("Search candidates", key="testimony_candidate_search")
    visible = candidate_rows
    if selected_type != "(all)":
        visible = [row for row in visible if row.get("testimony_type") == selected_type]
    if search.strip():
        needle = search.lower().strip()
        visible = [
            row for row in visible
            if needle in str(row.get("extracted_text") or "").lower()
            or needle in str(row.get("summary") or "").lower()
            or needle in str(row.get("doc_id") or "").lower()
        ]

    st.dataframe(
        [
            {
                "doc_id": row.get("doc_id"),
                "type": row.get("testimony_type"),
                "speaker": row.get("speaker_position"),
                "function": row.get("narrative_function"),
                "review": row.get("review_decision"),
                "public": row.get("review_public_readiness"),
                "source": row.get("source_artifact"),
            }
            for row in visible[:400]
        ],
        width="stretch",
        hide_index=True,
    )
    if not visible:
        return

    _render_testimony_document_deep_review_controls(corpus_dir, visible)

    options = [
        f"{row.get('doc_id')} · {row.get('testimony_type')} · {row.get('candidate_id')}"
        for row in visible
    ]
    selected = st.selectbox("Open candidate", options, key="testimony_candidate_selected")
    candidate = visible[options.index(selected)]
    doc_dir = Path(corpus_dir) / str(candidate.get("doc_id"))

    try:
        from runner.pipeline.testimony_deep_review import context_for_candidate
        located_context = context_for_candidate(doc_dir, candidate)
        evidence_ready = True
        evidence_message = (
            f"Located in {located_context.get('source')} near characters "
            f"{located_context.get('char_start')}–{located_context.get('char_end')}."
        )
    except Exception as exc:
        evidence_ready = False
        evidence_message = str(exc)

    deep_payload = _load_json_if_exists(doc_dir / "testimony_segments.json") or {}
    deep_rows = [
        row for row in deep_payload.get("segments", [])
        if isinstance(row, dict) and str(row.get("candidate_id") or "") == str(candidate.get("candidate_id") or "")
    ]
    st.dataframe(
        [
            {"Step": "Source evidence", "Status": "ready" if evidence_ready else "hold", "What it means": evidence_message},
            {"Step": "AI deep extraction", "Status": "complete" if deep_rows else "not run", "What it means": f"{len(deep_rows)} AI-extracted segment(s), still requiring researcher review" if deep_rows else "Run only after source evidence is located."},
            {"Step": "Researcher decision", "Status": str(candidate.get("review_decision") or "pending"), "What it means": "Confirms/rejects this lead; publication remains separate."},
            {"Step": "Vocabulary/entity routing", "Status": "review separately", "What it means": "Terms, actors, tactics and practices go to their own Local Proposal queues."},
        ],
        width="stretch",
        hide_index=True,
    )

    st.markdown(f"**{candidate.get('testimony_type')}** · `{candidate.get('candidate_id')}`")
    st.caption(
        f"Source: `{candidate.get('source_artifact')}` / `{candidate.get('source_kind')}` · "
        f"Model: `{(candidate.get('model_attribution') or {}).get('model', '')}`"
    )
    if candidate.get("summary"):
        st.write(candidate.get("summary"))
    if candidate.get("extracted_text") or candidate.get("evidence_quote"):
        st.code(str(candidate.get("extracted_text") or candidate.get("evidence_quote") or ""), language="text")
    linked_rows = []
    for field, destination in (
        ("linked_terms", "Lexicon Queue"), ("linked_tactics", "Tactic Queue"),
        ("linked_practices", "Practice Evidence"), ("linked_actors", "Entity Queue"),
    ):
        for value in candidate.get(field, []) or []:
            linked_rows.append({"AI-linked item": str(value), "Review destination": destination})
    if linked_rows:
        st.markdown("**AI-linked vocabulary and actors — not validated here**")
        st.dataframe(linked_rows, width="stretch", hide_index=True)
        destinations = sorted({row["Review destination"] for row in linked_rows})
        route = st.selectbox("Open review queue", destinations, key="testimony_linked_destination")
        if st.button("Go to selected proposal queue", key="testimony_linked_open"):
            st.session_state["lexicon_active_section"] = "Local Proposals"
            st.session_state["local_proposal_active_queue"] = route
            st.session_state["_nav_to"] = "Lexicon"
            st.rerun()
    with st.expander("Technical provenance (locator, raw links, public defaults)", expanded=False):
        st.json({
            "evidence_locator": candidate.get("evidence_locator", {}),
            "linked": {
                "terms": candidate.get("linked_terms", []),
                "tactics": candidate.get("linked_tactics", []),
                "practices": candidate.get("linked_practices", []),
                "actors": candidate.get("linked_actors", []),
            },
            "public": candidate.get("public", {}),
            "section": candidate.get("section", {}),
        })

    try:
        from runner.pipeline.testimony_candidates import PUBLIC_READINESS, SPEAKER_POSITIONS, TESTIMONY_TYPES
    except Exception:
        TESTIMONY_TYPES = ("survivor_testimony", "ex_gay_promotional_testimony", "clinical_case_story", "unclear_testimony")
        SPEAKER_POSITIONS = ("unknown",)
        PUBLIC_READINESS = ("private_review_required", "research_only", "public_excerpt_candidate", "public_display_approved")

    review_state_options = ["model_proposed", "approved", "rejected", "research_only", "needs_deep_review", "public_approved"]
    decision = st.selectbox(
        "Review decision",
        review_state_options,
        index=_option_index(review_state_options, str(candidate.get("review_decision") or "model_proposed")),
        key="testimony_candidate_review_state",
    )
    type_value = _controlled_select(
        "Testimony type",
        str(candidate.get("testimony_type") or "unclear_testimony"),
        list(TESTIMONY_TYPES),
        key="testimony_candidate_type",
    )
    speaker = _controlled_select(
        "Speaker position",
        str(candidate.get("speaker_position") or "unknown"),
        list(SPEAKER_POSITIONS),
        key="testimony_candidate_speaker",
    )
    public_readiness = _controlled_select(
        "Public readiness",
        str(candidate.get("review_public_readiness") or "private_review_required"),
        list(PUBLIC_READINESS),
        key="testimony_candidate_public_readiness",
    )
    public_display = st.checkbox(
        "Allow public display for this candidate",
        value=bool(candidate.get("review_public_display")),
        key="testimony_candidate_public_display",
    )
    public_excerpt = st.text_area(
        "Public excerpt / redacted public text",
        value=str(candidate.get("review_public_excerpt") or ""),
        height=120,
        key="testimony_candidate_public_excerpt",
    )
    notes = st.text_area(
        "Researcher notes",
        value=str(candidate.get("review_notes") or ""),
        height=100,
        key="testimony_candidate_notes",
    )
    if public_display and public_readiness != "public_display_approved":
        st.warning("Public display should normally use `public_display_approved` readiness.")
    if st.button("Save Candidate Review", key="testimony_candidate_save"):
        path = _testimony_candidate_reviews_path(doc_dir)
        payload = _load_json_if_exists(path) or {
            "schema_version": "testimony-candidate-reviews-v0.1",
            "doc_id": doc_dir.name,
            "reviews": {},
        }
        reviews = payload.setdefault("reviews", {})
        reviews[str(candidate.get("candidate_id"))] = {
            "candidate_id": candidate.get("candidate_id"),
            "review_state": decision,
            "testimony_type": type_value,
            "speaker_position": speaker,
            "public_readiness": public_readiness,
            "public_display": public_display,
            "public_excerpt": public_excerpt,
            "notes": notes,
            "reviewed_by": "researcher",
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        }
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        st.success(f"Saved testimony candidate review to {path}.")
        st.rerun()

    st.divider()
    st.markdown("### 3 · Extract testimony segments")
    if not evidence_ready:
        st.error(
            "Deep analysis is blocked because the quoted evidence is not present in the canonical extracted text. "
            "Preview and apply a candidate refresh, or correct the extraction first. No model will receive this lead."
        )
    _render_testimony_deep_review_controls(doc_dir, candidate, evidence_ready=evidence_ready)


def _render_testimony_document_deep_review_controls(corpus_dir: Path, visible_rows: list[dict]) -> None:
    with st.expander("Run deep testimony review for a whole document", expanded=False):
        st.caption(
            "Use this for books, reports, and documents with many candidate segments. "
            "It runs the deep pass for every testimony candidate in the selected document and skips "
            "already-succeeded candidates unless you choose overwrite."
        )
        doc_ids = sorted({
            str(row.get("doc_id") or "")
            for row in visible_rows
            if str(row.get("doc_id") or "")
        })
        if not doc_ids:
            st.info("No visible candidate documents to review.")
            return
        doc_id = st.selectbox("Document to review", doc_ids, key="testimony_deep_doc_id")
        doc_dir = Path(corpus_dir) / doc_id
        config = _load_config_safe()
        if not config:
            return
        try:
            from runner.pipeline import testimony_deep_review

            status = testimony_deep_review.deep_review_status(doc_dir)
        except Exception as exc:
            st.error(f"Could not read deep-review status: {exc}")
            return

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Candidates", status.get("candidate_count", 0))
        c2.metric("Reviewed", status.get("reviewed_count", 0))
        c3.metric("Pending", status.get("pending_count", 0))
        c4.metric("Segments", status.get("segment_count", 0))
        if status.get("failed_count"):
            st.warning(
                f"{status.get('failed_count')} previous candidate review(s) failed. "
                "A normal run retries failed/pending candidates; overwrite also re-runs succeeded candidates."
            )

        llm = st.selectbox(
            "Deep review model",
            ["litelm-heavy", "litelm", "litelm-reasoning", "claude", "local-heavy"],
            key="testimony_deep_doc_llm",
        )
        limit = st.number_input(
            "Candidate limit (0 = all pending candidates)",
            min_value=0,
            max_value=max(0, int(status.get("candidate_count", 0))),
            value=0,
            step=1,
            key="testimony_deep_doc_limit",
        )
        overwrite = st.checkbox(
            "Overwrite existing deep analyses for this document",
            value=False,
            key="testimony_deep_doc_overwrite",
        )
        cmd = (
            f"{shlex.quote(sys.executable)} -m runner testimony-deep-review {shlex.quote(doc_id)} "
            f"--llm {shlex.quote(llm)}"
            + (f" --limit {int(limit)}" if int(limit) > 0 else "")
            + (" --overwrite" if overwrite else "")
        )
        st.code(cmd, language="bash")
        disabled = int(status.get("candidate_count", 0)) == 0
        if st.button(
            "Run deep testimony analysis for all candidates in this document",
            key="testimony_deep_doc_run",
            disabled=disabled,
        ):
            try:
                result = testimony_deep_review.run_testimony_deep_review(
                    Path(doc_dir),
                    config=config,
                    llm=llm,
                    limit=int(limit),
                    overwrite=overwrite,
                )
            except Exception as exc:
                st.error(f"Document-level deep testimony review failed: {exc}")
            else:
                st.success(
                    f"Deep review finished: {result.get('analyses_count', 0)} reviewed candidate(s), "
                    f"{result.get('segment_count', 0)} extracted segment(s), "
                    f"{result.get('failed_count', 0)} failure(s)."
                )
                st.rerun()


def _render_testimony_deep_review_controls(doc_dir: Path, candidate: dict, *, evidence_ready: bool = True) -> None:
    st.markdown("**Deep testimony segment review**")
    segments_payload = _load_json_if_exists(Path(doc_dir) / "testimony_segments.json") or {}
    candidate_id = str(candidate.get("candidate_id") or "")
    segment_rows = [
        row for row in segments_payload.get("segments", [])
        if isinstance(row, dict) and str(row.get("candidate_id") or "") == candidate_id
    ]
    if segment_rows:
        st.success(f"{len(segment_rows)} extracted testimony segment(s) already available for this candidate.")
        for row in segment_rows:
            with st.expander(
                f"{row.get('segment_type', 'segment')} · {row.get('mediation', 'unclear')} · confidence={row.get('confidence')}",
                expanded=False,
            ):
                if row.get("testimony_text"):
                    st.code(str(row.get("testimony_text")), language="text")
                st.write(row.get("summary") or "")
                st.json({
                    "speaker": {
                        "label": row.get("speaker_label"),
                        "position": row.get("speaker_position"),
                    },
                    "practice_descriptions": row.get("practice_descriptions", []),
                    "lexicon_terms": row.get("lexicon_terms", []),
                    "tactics": row.get("tactics", []),
                    "actors": row.get("actors", []),
                    "public_recommendation": row.get("public_recommendation", {}),
                    "evidence_locator": row.get("evidence_locator", {}),
                })
        _render_testimony_segment_proposal_bridge(Path(doc_dir), segment_rows)
    else:
        st.info("No deep segment analysis has been run for this candidate yet.")

    config = _load_config_safe()
    if not config:
        return
    llm = st.selectbox(
        "Deep review model",
        ["litelm-heavy", "litelm", "litelm-reasoning", "claude", "local-heavy"],
        key=f"testimony_deep_llm_{candidate_id}",
    )
    overwrite = st.checkbox(
        "Overwrite existing deep analysis for this candidate",
        value=False,
        key=f"testimony_deep_overwrite_{candidate_id}",
    )
    cmd = (
        f"{shlex.quote(sys.executable)} -m runner testimony-deep-review {shlex.quote(doc_dir.name)} "
        f"--candidate-id {shlex.quote(candidate_id)} --llm {shlex.quote(llm)}"
        + (" --overwrite" if overwrite else "")
    )
    st.code(cmd, language="bash")
    if st.button(
        "Run deep testimony analysis for this candidate",
        key=f"testimony_deep_run_{candidate_id}",
        disabled=not evidence_ready,
    ):
        try:
            from runner.pipeline import testimony_deep_review

            result = testimony_deep_review.run_testimony_deep_review(
                Path(doc_dir),
                config=config,
                candidate_id=candidate_id,
                llm=llm,
                overwrite=overwrite,
            )
        except Exception as exc:
            st.error(f"Deep testimony review failed: {exc}")
        else:
            st.success(
                f"Deep review finished: {result.get('segment_count', 0)} total segment(s), "
                f"{result.get('failed_count', 0)} failure(s), "
                f"{result.get('evidence_hold_count', 0)} evidence hold(s)."
            )
            st.rerun()


def _testimony_segment_proposal_candidates(doc_dir: Path, segment_rows: list[dict]) -> list[dict]:
    candidates: list[dict] = []
    family_specs = (
        ("lexicon_terms", "lexicon", "term", "definition_as_used"),
        ("tactics", "tactic", "name", "description"),
        ("practice_descriptions", "practice", "practice", "description"),
        ("actors", "entity", "name", "role"),
    )
    for segment in segment_rows:
        locator = segment.get("evidence_locator") if isinstance(segment.get("evidence_locator"), dict) else {}
        if locator.get("status") != "located":
            continue
        segment_id = str(segment.get("segment_id") or "")
        for source_key, family, label_key, definition_key in family_specs:
            for index, item in enumerate(segment.get(source_key) or []):
                item = item if isinstance(item, dict) else {label_key: str(item)}
                label = str(item.get(label_key) or item.get("label") or "").strip()
                if not label:
                    continue
                quote = str(item.get("evidence") or segment.get("testimony_text") or "").strip()
                candidates.append({
                    "candidate_id": f"{segment_id}:{source_key}:{index}",
                    "doc_id": doc_dir.name,
                    "family": family,
                    "label": label,
                    "definitions": [str(item.get(definition_key) or item.get("definition") or "").strip()],
                    "evidence": [{
                        "section_id": segment_id,
                        "quote_or_note": quote,
                    }],
                    "count": 1,
                    "confidence": item.get("confidence") or segment.get("confidence"),
                    "source_kind": "deep testimony segment",
                    "converted_from_family": "testimony_segments",
                })
    return candidates


def _render_testimony_segment_proposal_bridge(doc_dir: Path, segment_rows: list[dict]) -> None:
    candidates = _testimony_segment_proposal_candidates(doc_dir, segment_rows)
    st.markdown("**4 · Send extracted concepts to their review queues**")
    st.caption(
        "This creates a pending, unapproved local proposal. It does not validate a term, "
        "change the canonical lexicon, or push anything to Sanity."
    )
    if not candidates:
        st.info("No source-located segment concepts are available to route.")
        return
    labels = [f"{row['family']} · {row['label']}" for row in candidates]
    selected_label = st.selectbox("Extracted concept", labels, key=f"testimony_segment_concept_{doc_dir.name}")
    candidate = candidates[labels.index(selected_label)]
    target_family = {
        "lexicon": "lexicon_proposals",
        "entity": "entity_proposals",
        "tactic": "tactic_proposals",
        "practice": "practice_descriptions",
    }[candidate["family"]]
    entity_type = "person"
    if target_family == "entity_proposals":
        entity_type = st.selectbox(
            "Entity type",
            ["person", "organization"],
            key=f"testimony_segment_entity_type_{doc_dir.name}",
        )
    if st.button("Create pending local proposal", key=f"testimony_segment_create_{doc_dir.name}"):
        try:
            created = _create_longform_candidate_enrichment_proposal(
                doc_dir.parent,
                candidate,
                target_family=target_family,
                entity_type=entity_type,
            )
        except Exception as exc:
            st.error(f"Could not create local proposal: {exc}")
            return
        target_queue = {
            "lexicon_proposals": "Lexicon Queue",
            "entity_proposals": "Entity Queue",
            "tactic_proposals": "Tactic Queue",
            "practice_descriptions": "Practice Evidence",
        }[created["key"]]
        st.session_state["lexicon_active_section"] = "Local Proposals"
        st.session_state["local_proposal_active_queue"] = target_queue
        st.session_state["_nav_to"] = "Lexicon"
        st.success(f"Created `{candidate['label']}` as pending in {target_queue}.")
        st.rerun()


def _testimony_requires_review(doc_id: str, analysis, config) -> bool:
    """Return True when testimony review remains pending.

    Pending review does not block an unverified archive upload; it remains a
    publication/public-display hold.
    """
    from runner.pipeline.upload import requires_consent_gate

    if not analysis:
        return False
    if not requires_consent_gate(analysis):
        return False
    review = _load_json_if_exists(_testimony_review_path(config, doc_id)) or {}
    intake = _load_json_if_exists(config.corpus_dir / doc_id / "intake.json") or {}
    state = _document_testimony_state(
        analysis.model_dump() if hasattr(analysis, "model_dump") else analysis,
        intake,
        review,
    )
    return state["state"] in {"pending", "conflict_pending", "confirmed_publication_hold"}


def _testimony_archive_upload_blocked(doc_id: str, analysis, config) -> bool:
    """Block remote archive writes only for refused or withdrawn consent."""
    from runner.pipeline.upload import requires_consent_gate

    if not analysis or not requires_consent_gate(analysis):
        return False
    review = _load_json_if_exists(_testimony_review_path(config, doc_id)) or {}
    intake = _load_json_if_exists(config.corpus_dir / doc_id / "intake.json") or {}
    state = _document_testimony_state(
        analysis.model_dump() if hasattr(analysis, "model_dump") else analysis,
        intake,
        review,
    )
    return state["state"] == "blocked"


def _testimony_consent_disagreement(doc_id: str, analysis, config) -> bool:
    if not analysis:
        return False
    review = _load_json_if_exists(_testimony_review_path(config, doc_id)) or {}
    intake = _load_json_if_exists(config.corpus_dir / doc_id / "intake.json") or {}
    state = _document_testimony_state(
        analysis.model_dump() if hasattr(analysis, "model_dump") else analysis,
        intake,
        review,
    )
    return bool(state.get("disagreement"))


def _document_testimony_state(analysis: dict, intake: dict, review: dict) -> dict:
    """Return the explicit local testimony state used by Document List."""
    from runner.pipeline.upload import reconcile_testimony_consent

    analysis = analysis or {}
    types = {
        analysis.get("type"), analysis.get("primary_type"), analysis.get("secondary_type")
    }
    if not testimony_override_available(analysis) and not types.intersection(
        {"Testimony", "Survivor-Network-Material"}
    ):
        return {"state": "not_required", "disagreement": False}
    resolution = reconcile_testimony_consent(
        (intake or {}).get("testimony_consent"),
        (review or {}).get("consent_status"),
    )
    effective = resolution["effective_status"]
    if effective in {"refused", "withdrawn"}:
        state = "blocked"
    elif resolution["disagreement"]:
        state = "conflict_pending"
    elif effective != "confirmed":
        state = "pending"
    elif not bool((review or {}).get("public_display", False)):
        state = "confirmed_publication_hold"
    else:
        state = "confirmed_public"
    return {**resolution, "state": state}


def _load_json_if_exists(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except Exception:
        return None


def page_activity_log():
    st.title("Activity Log")

    config = _load_config_safe()
    if not config:
        st.error("Could not load config. Check runner/.env.")
        return

    docs = _activity_rows(config.corpus_dir, config)
    if not docs:
        st.info("No local activity yet.")
        return

    st.dataframe(docs, width="stretch", hide_index=True)

    selected = st.selectbox("Inspect document", [row["doc_id"] for row in docs])
    doc_dir = config.corpus_dir / selected
    tabs = st.tabs([
        "Audit", "Intake", "Wayback", "HTML Snapshot",
        "Analysis", "Enrichment", "Sanity Record", "Supabase",
        "Provenance",
    ])
    with tabs[0]:
        audit = doc_dir / "audit.log"
        st.code(audit.read_text() if audit.exists() else "No audit.log", language="text")
    with tabs[1]:
        _show_json_file(doc_dir / "intake.json")
    with tabs[2]:
        _show_json_file(doc_dir / "wayback.json")
    with tabs[3]:
        html_path = doc_dir / "source.html"
        if html_path.exists():
            st.caption(str(html_path))
            st.download_button(
                "Download HTML snapshot",
                data=html_path.read_text(encoding="utf-8", errors="replace"),
                file_name=f"{selected}-source.html",
                mime="text/html",
            )
            st.code(html_path.read_text(encoding="utf-8", errors="replace")[:20_000], language="html")
        else:
            st.info("No local HTML snapshot found for this document.")
    with tabs[4]:
        _show_json_file(doc_dir / "analysis.json")
    with tabs[5]:
        st.caption(
            "Review the active enrichment output. Complement enrichment runs a new pass "
            "and merge-preserves reviewed proposals instead of replacing this file."
        )
        _render_complement_enrichment_action(
            selected,
            key_prefix="activity_enrichment",
        )
        st.divider()
        _show_json_file(doc_dir / "enrichment.json")
    with tabs[6]:
        _show_json_file(doc_dir / "sanity_record.json")
    with tabs[8]:
        _render_provenance_panel(selected, doc_dir, config)
    with tabs[7]:
        emb_path = doc_dir / "embedding.json"
        if emb_path.exists():
            emb_data = json.loads(emb_path.read_text())
            c1, c2 = st.columns(2)
            c1.metric("Dimension", emb_data.get("dimension", "?"))
            c2.metric("Model", emb_data.get("model", "?"))
            st.caption(f"Local file: {emb_path}")
            vector = emb_data.get("vector") or []
            if not vector or int(emb_data.get("dimension") or 0) <= 0:
                st.warning("Local embedding file is empty. Regenerate it before considering Supabase complete.")
            if config:
                if st.button("Check Supabase row", key=f"chk_supabase_{selected}"):
                    try:
                        from runner.clients.supabase import _client as _sb_client
                        result = _sb_client(config).table("document_embeddings").select(
                            "doc_id,doc_type,scope,tier,language,embedded_at,embedding_model"
                        ).eq("doc_id", selected).execute()
                        if result.data:
                            st.json(result.data[0])
                        else:
                            st.warning("No row found in Supabase — regenerate and push the embedding.")
                    except Exception as exc:
                        st.error(f"Supabase query failed: {exc}")
                if st.button("Regenerate + push embedding", key=f"regen_emb_{selected}"):
                    ok, message = _generate_and_push_embedding(selected, config.corpus_dir, config)
                    if ok:
                        st.success(message)
                    else:
                        st.error(message)
        else:
            st.warning("No local embedding.json — embedding has not been generated yet.")
            if config and st.button("Generate + push embedding now", key=f"gen_emb_{selected}"):
                with st.spinner("Generating embedding…"):
                    ok, message = _generate_and_push_embedding(selected, config.corpus_dir, config)
                if ok:
                    st.success(message)
                else:
                    st.error(message)


def _activity_rows(corpus_dir: Path, config=None) -> list[dict]:
    rows: list[dict] = []
    if not corpus_dir.exists():
        return rows
    for doc_dir in sorted(corpus_dir.iterdir()):
        if not doc_dir.is_dir():
            continue
        analysis_path = doc_dir / "analysis.json"
        if not analysis_path.exists():
            continue
        try:
            analysis = json.loads(analysis_path.read_text())
        except Exception:
            analysis = {}
        rows.append({
            "doc_id": doc_dir.name,
            "type": analysis.get("type", "?"),
            "scope": analysis.get("scope", "?"),
            "uploaded": (doc_dir / "sanity_record.json").exists(),
            "embedded": _local_embedding_status(doc_dir, config).get("ok", False) if config else False,
            "enriched": (doc_dir / "enrichment.json").exists(),
            "audit_events": _audit_event_count(doc_dir / "audit.log"),
        })
    return rows


def _audit_event_count(path: Path) -> int:
    if not path.exists():
        return 0
    return len([line for line in path.read_text().splitlines() if line.strip()])


def _show_json_file(path: Path) -> None:
    if not path.exists():
        st.info(f"{path.name} does not exist.")
        return
    try:
        st.json(json.loads(path.read_text()))
    except Exception:
        st.code(path.read_text(), language="text")


def _show_text_file(path: Path, language: str = "text") -> None:
    if not path.exists():
        st.info(f"{path} does not exist.")
        return
    st.caption(str(path))
    st.code(path.read_text(encoding="utf-8"), language=language)


# ---------------------------------------------------------------------------
# Guide
# ---------------------------------------------------------------------------

def _guide_markdown() -> str:
    return """
### Start here

Use **Dashboard → Research Worklist** first. It is the daily cockpit: it
summarizes source queue state, Mac Studio/source-offload state, corpus health,
knowledge-export freshness, extraction quality, tag coverage, and pending
enrichment work. Click **Refresh worklist** after imports or new ingests.

Use **Corpus Intelligence → Knowledge exports** for the deeper audit:
`archive_summary.json`, `document_profiles.jsonl`, the evidence graph, and
`knowledge_quality.json`. This is also where you can inspect and backfill
`citation_units.json`, the local evidence-locator sidecar used to connect
quotes back to stable spans in `extracted.txt`.

### Scaled research model

The target workflow is **AI-managed long tail + human exception/promotion
queue**, not per-document adjudication. The researcher adds/contextualizes
sources, approves a batch policy, handles one compiled exception list, promotes
important memory, and curates research/story outputs.

Today, triage flags special routes and the guarded batch runner excludes
testimony/legal/media/long-form items from unattended execution. The Source
Queue can now compile an immutable, policy-versioned batch outcome and dry-run
route plan. The next workflow milestone is a **guarded outcome executor** in
confirmation mode, followed by retrieval-aware Enrichment.

The full proposed process is documented in
`docs/RESEARCHER_WORKFLOW_V2.md`.

### Normal MacBook workflow

1. **Source Queue** — add/triage URLs and decide what is safe for unattended
   processing. Review-flagged items need researcher attention before offload.
2. **Source Offload → Export** — build a `source_package` for queue items,
   ad-hoc URLs, files, or browser-saved snapshots.
3. **Source Offload → Transfer & worker** — move the package to the Mac Studio
   using archive transfer or the shared transfer folder.
4. **Mac Studio Worker** — on the Mac Studio, unpack incoming archives, run
   `source-worker`, and archive completed `outbox` packages back.
5. **Source Offload → Import results** — on the MacBook, unpack returned
   archives, dry-run import, then import into the live corpus. This relinks the
   source queue only after the corpus import succeeds.
6. **Dashboard → Refresh worklist** — refresh citation-unit sidecars, archive
   summaries, evidence graph, quality audit, and the digest. New documents
   should then appear in the current review/worklist state.
7. **Document List / Review Inbox** — inspect imported docs, clear review holds
   such as testimony/legal/low-confidence markers, and upload only when ready.
8. **Lexicon / Tag Registry** — approve/reject enrichment proposals and check
   registry hints. Tag registry matches are connection hints, not proof.
9. **Dashboard → Refresh worklist** again after review/upload/proposal work so
   the next action list reflects the new state.

### Direct local ingest

Use **Ingest Workbench** for one-off local runs on the MacBook. It follows the
same core stages: intake, preprocess/extract, analyze, enrich, review, upload.
For long/heavy runs, prefer Source Offload so the Mac Studio does the model
work. Both regular ingest and source offload now create `citation_units.json`
automatically when `extracted.txt` exists.

### What each page is for

- **Dashboard**: daily worklist, system health, setup status, and service checks.
- **Review Inbox**: cross-document review queues grouped by readiness.
- **Corpus Intelligence**: corpus summaries, knowledge exports, graph/quality
  audit, evidence-locator sidecar status, and the full research digest.
- **Source Queue**: source backlog and triage state.
- **Source Offload**: MacBook side of export/transfer/import.
- **Mac Studio Worker**: Mac Studio side of unpack/run/archive.
- **Document List**: inspect imported/analyzed documents and handle upload
  readiness.
- **Pending Upload**: documents saved locally but not uploaded to Sanity.
- **Lexicon**: review enrichment proposals and push approved terms/entities/
  tactics/practices/claims.
- **Tag Registry**: inspect/edit broad vocabulary used as enrichment hints and
  confirm the legacy CSV source path.
- **Testimony Review**: consent/public-display decisions.
- **Activity Log**: local artifacts, audit files, HTML snapshots, embeddings,
  and provenance.

### Evidence locators and knowledge exports

The archive now has an evidence-locator layer:

- `extracted.txt` is the canonical extracted text.
- `citation_units.json` is generated from `extracted.txt`. It stores stable
  paragraph/text-span IDs, character offsets, source artifact names, quote
  hashes, and text hashes.
- `archive_summary.json` summarizes each document, including whether citation
  units exist.
- `document_profiles.jsonl` is the corpus-wide version of those summaries.
- `archive_graph.json` / `archive_edges.csv` use citation locators when a
  quote-backed edge can be matched to `extracted.txt`.

Use **Corpus Intelligence → Knowledge exports → Evidence locator sidecars** to
see the current state:

- **Can backfill** means the document has `extracted.txt` but lacks
  `citation_units.json`; click **Backfill citation units**.
- **Missing text** means the document has no `extracted.txt`; it needs retry,
  re-ingest, manual snapshot, or discard. Re-enrichment alone will not fix it.

Use **Dashboard → Refresh worklist** after imports, review changes, uploads, or
proposal pushes. It backfills citation units where possible, refreshes archive
summaries, rebuilds the evidence graph, writes the quality audit, and produces
the human-readable research digest.

### Model routing

- Analysis route `litelm` normally uses the standard analysis alias.
- Use `litelm-heavy` / `core-gemma` for heavier enrichment or long documents
  when configured.
- Embedding uses `research-embedding`.
- Use **Model Routing** and **Mac Studio Node** when service/model state looks
  wrong.

### Tags, enrichment, and evidence

There are three layers:

1. **Analysis tags** in `analysis.json`: document-level classification fields
   such as tactic, practice, harm, actor, network, term, country, and language.
2. **Tag Registry matches**: broad legacy/local vocabulary injected into
   enrichment prompts as hints. They help the model notice known concepts, but
   are not evidence.
3. **Enrichment proposals** in `enrichment.json`: reviewable terms/entities/
   tactics/practices/claims. Approved quote-backed proposals become stronger
   evidence graph edges.

Quote-backed enrichment proposals also try to attach an `evidence_locator`
pointing back into `citation_units.json`. If the quote cannot be located, the
proposal remains available but is marked as unlocated rather than pretending
certainty.

Tactic labels are matched separator-insensitively for identity/export purposes:
`Religious Freedom Shield` and `Religious-Freedom-Shield` count as the same
concept. In **Lexicon → Tactic Queue**, choose `enrich_existing` and use the
**Existing Sanity tactic** dropdown rather than pasting tactic IDs by hand.

If the quality audit says the tag registry is unavailable, open **Tag Registry
→ Registry source and enrichment-hint status** and set
`SOGICE_LEGACY_VOCAB_DIR` in `runner/.env` to the folder containing
`sogice_vocabulary_2026-04-03.csv`.

### Troubleshooting

- If extraction is empty or tiny, the source may be blocked, dynamic, or mostly
  boilerplate. Use a browser-saved HTML/PDF snapshot attached to the queue item.
- If a worker package fails, read its `worker_report.json`; failed documents are
  not relinked as ingested.
- If returned packages appear in the wrong folder, use Source Offload import
  diagnostics or the archive/unpack flow rather than moving folders by hand.
- If **Knowledge exports** says citation units are missing, click **Backfill
  citation units**. If it says extracted text is missing, retry/re-ingest the
  source or discard the stale partial document.
- If upload is blocked, check Document List / Review Inbox for testimony,
  legal, low-confidence, embedding, or missing-artifact holds.
- If Lexicon/Sanity mutations fail because a source document is missing, upload
  the source document first, then push proposals.
- If the worklist says knowledge exports are stale, click **Refresh worklist**.
"""


def page_guide():
    st.title("Guide")
    st.markdown(_guide_markdown())
    runbook_path = _project_root / "docs" / "INGESTION_OPERATIONS_RUNBOOK.md"
    with st.expander("Ingestion operations runbook", expanded=False):
        _show_text_file(runbook_path, language="markdown")


# ---------------------------------------------------------------------------
# Start Ingest
# ---------------------------------------------------------------------------

def page_start_ingest():
    st.title("Start Ingest")

    source = st.text_input("Source URL or local file path")
    col1, col2 = st.columns([1, 1])
    with col1:
        llm = st.selectbox(
            "Analysis model",
            [
                "litelm",
                "litelm-heavy",
                "litelm-reasoning",
                "claude",
                "local",
                "local-heavy",
                "local-reasoning",
                "openrouter",
            ],
        )
    with col2:
        batch = st.text_input("Batch ID", placeholder="optional")

    c1, c2, c3 = st.columns(3)
    with c1:
        run_triage = st.checkbox("Run triage first")
    with c2:
        run_enrich = st.checkbox(
            "Run enrichment (default on)",
            value=True,
            help="Enrichment runs by default after upload. Uncheck to add --no-enrich.",
        )
    with c3:
        auto_yes = st.checkbox("Auto-approve checkpoints")

    parts = ["python -m runner ingest"]
    parts.append(f'"{source}"' if source else '"<url-or-file>"')
    parts.extend(["--llm", llm])
    if batch.strip():
        parts.extend(["--batch", batch.strip()])
    if run_triage:
        parts.append("--triage")
    if not run_enrich:
        parts.append("--no-enrich")
    if auto_yes:
        parts.append("--yes")

    st.subheader("Command")
    st.code(" ".join(parts), language="bash")

    if auto_yes:
        st.warning(
            "`--yes` skips the human review checkpoints and uploads automatically. "
            "Use it only for low-risk tests or documents you are comfortable accepting as-is."
        )
    else:
        st.info(
            "Run this in the terminal from the project root. The runner will pause at "
            "review checkpoints so you can approve, edit, upload, or save locally."
        )

    st.subheader("What will happen")
    st.markdown(
        "- Intake creates a document ID and local corpus folder.\n"
        "- Preprocessing extracts readable text and saves artifacts.\n"
        "- The selected model returns structured classification JSON.\n"
        "- You review the result before upload unless `--yes` is enabled.\n"
        "- Uploaded records go to Sanity and Supabase; local artifacts remain in the corpus folder."
    )


# ---------------------------------------------------------------------------
# Model Routing Spec Sheet
# ---------------------------------------------------------------------------

def page_model_routing():
    st.title("Model Routing Guide")
    st.markdown(
        "Use this reference to choose the right `--llm` flag for each document type."
    )

    st.subheader("Analysis models")

    data = {
        "Flag": [
            "`--llm litelm`",
            "`--llm litelm-heavy`",
            "`--llm litelm-reasoning`",
            "`--llm claude`",
            "`--llm local`",
            "`--llm local-heavy`",
            "`--llm local-reasoning`",
            "`--llm openrouter`",
        ],
        "Actual model": [
            "core-qwen (qwen3.6:35b-mlx)",
            "core-gemma (gemma4:31b-mlx)",
            "review-qwen (qwen3.6:27b-mlx)",
            "claude-sonnet-4-6",
            "qwen3.5:9b",
            "gemma-4-26B-A4B-it",
            "Ministral-3-14B-Reasoning-2512",
            "llama-3.3-70b-instruct:free",
        ],
        "Runs on": [
            "Mac Studio (Tailscale)",
            "Mac Studio (Tailscale)",
            "Mac Studio (Tailscale)",
            "Anthropic API",
            "MacBook (Ollama)",
            "MacBook (Ollama, check RAM)",
            "MacBook (Ollama)",
            "OpenRouter API",
        ],
        "Best for": [
            "Everyday ingestion — multilingual, strong JSON",
            "Long documents: books, SRTs, multi-section PDFs",
            "Ambiguous relevance, confidence scoring",
            "Court judgments, policy docs — gold standard",
            "Offline / Mac Studio unavailable",
            "Long docs offline (verify RAM first)",
            "Ambiguous docs offline",
            "Free tier, quick classification",
        ],
        "Max context": [
            "200k chars",
            "200k chars",
            "200k chars",
            "24k chars (cost)",
            "32k tokens",
            "32k tokens",
            "32k tokens",
            "varies",
        ],
    }

    import pandas as pd
    st.dataframe(pd.DataFrame(data), width="stretch", hide_index=True)

    st.subheader("Enrichment model (Stage 3c)")
    st.info(
        "Stage 3c uses **lexicon-llm** on Mac Studio (`gemma4:31b-mlx` in the current LiteLLM YAML).  \n"
        "Run with: `python -m runner ingest <url> --enrich`  \n"
        "Or on an existing doc: `python -m runner enrich <doc_id>`"
    )

    st.subheader("Triage model (Stage 0.5)")
    st.info(
        "Fast pre-screen to recommend which model to use.  \n"
        "Uses **triage** LiteLLM alias (`gemma4:12b-mlx` on Mac Studio).  \n"
        "Run with: `python -m runner ingest <url> --triage`"
    )

    st.subheader("Embedding models")
    emb_data = {
        "Context": ["Local (Ollama)", "Mac Studio (LiteLLM)"],
        "Model": ["qwen3-embedding:8b", "research-embedding → qwen3-embedding:8b"],
        "Dimension": ["4096d", "4096d"],
        "Triggered by": ["--llm local / claude / openrouter", "--llm litelm*"],
    }
    st.dataframe(pd.DataFrame(emb_data), width="stretch", hide_index=True)

    st.subheader("Decision flowchart")
    st.markdown(
        """
```
Is Mac Studio reachable?
├── YES → Is doc > 50k chars? → litelm-heavy
│         Is relevance unclear? → litelm-reasoning
│         Otherwise → litelm (default)
└── NO  → Is doc > 20k chars? → local-heavy (check RAM)
          Is relevance unclear? → local-reasoning
          Otherwise → local

Need gold-standard? (court docs, Tier 1 final) → claude
Free/quick test? → openrouter
```
"""
    )


# ---------------------------------------------------------------------------
# Triage Tool
# ---------------------------------------------------------------------------

def page_triage_tool():
    st.title("Triage Tool")
    st.markdown(
        "Paste a URL or document snippet to get a model routing recommendation "
        "without running the full pipeline."
    )

    col1, col2 = st.columns([2, 1])
    with col1:
        input_url = st.text_input("URL (optional — fetches first 3 000 chars automatically)")
        snippet = st.text_area(
            "Or paste document text / snippet",
            height=200,
            placeholder="Paste the beginning of the document here...",
        )
        # U6: optional doc_id association — saves result to doc folder for reload
        associate_doc_id = st.text_input(
            "Associate with existing doc_id (optional)",
            placeholder="e.g. 3281c668",
            help=(
                "If provided, the triage result is saved to that doc's folder as "
                "`triage_result.json` so it can be reloaded in the Ingest Workbench."
            ),
        )

    with col2:
        st.markdown("### What happens")
        st.markdown(
            "The **triage model** (`gemma4:12b-mlx` on Mac Studio, or local qwen3.5:9b) "
            "reads your snippet and recommends:\n"
            "- Which `--llm` flag to use\n"
            "- Document type hint\n"
            "- Estimated complexity\n"
            "- Languages present"
        )

    if st.button("Run triage", type="primary"):
        config = _load_config_safe()
        if not config:
            st.error("Config not loaded — check runner/.env")
            return

        text = snippet.strip()
        note = ""

        if not text and input_url:
            with st.spinner("Fetching URL..."):
                try:
                    from runner.pipeline.triage import extract_snippet
                    text, note = extract_snippet(input_url)
                    st.caption(f"{note} from {input_url}")
                    if len(text.strip()) < 500:
                        st.warning(
                            "Only a very short snippet was extracted. The recommendation may be weak; "
                            "paste the article text directly if the page blocks extraction."
                        )
                except Exception as exc:
                    st.error(f"Could not fetch URL: {exc}")
                    return

        if not text:
            st.warning("Paste some text or provide a URL.")
            return

        with st.spinner("Running triage..."):
            try:
                from runner.pipeline.triage import run as triage_run
                from runner.pipeline.triage import source_context_label
                result = triage_run(
                    text,
                    config,
                    source_label=source_context_label(
                        input_url, extraction_note=note if input_url else "", snippet=text,
                    ) if input_url else "",
                )
            except Exception as exc:
                st.error(f"Triage failed: {exc}")
                return

        st.success("Triage complete")

        r1, r2, r3, r4 = st.columns(4)
        r1.metric("Recommended model", result.recommended_llm)
        r2.metric("Doc type", result.doc_type_hint)
        r3.metric("Complexity", result.complexity)
        r4.metric("Est. tokens", f"~{result.estimated_tokens:,}" if result.estimated_tokens else "?")

        st.info(f"**Routing reason:** {result.routing_reason or '(not given)'}")

        if result.languages:
            st.write(f"**Languages detected:** {', '.join(result.languages)}")

        # U6: persist triage result to doc folder if doc_id provided
        _assoc = associate_doc_id.strip()
        if _assoc:
            try:
                from runner.pipeline.triage import save_triage_result
                saved_path = save_triage_result(_assoc, result, config)
                st.caption(f"Result saved to `{saved_path.relative_to(config.corpus_dir)}`.")
            except Exception as _save_exc:
                st.caption(f"Could not save to doc folder: {_save_exc}")

        st.divider()
        st.markdown("**Suggested CLI command:**")
        source_arg = input_url.strip() if input_url.strip() else "<url_or_file>"
        st.code(
            f"python -m runner ingest {source_arg} --llm {result.recommended_llm}",
            language="bash",
        )


# ---------------------------------------------------------------------------
# Mac Studio Node
# ---------------------------------------------------------------------------

def _remote_service_error_note(label: str, url: str, exc_or_detail: object) -> str:
    """Return a researcher-facing hint for common Mac Studio proxy failures."""
    from urllib.parse import urlparse

    host = urlparse(url).hostname or url
    detail = str(exc_or_detail or "").strip()
    note = f"{label}: {detail}" if detail else f"{label}: unreachable"
    lower = detail.lower()

    dns_phrases = (
        "nodename nor servname provided",
        "name or service not known",
        "temporary failure in name resolution",
        "failed to resolve",
        "no address associated with hostname",
    )
    if any(phrase in lower for phrase in dns_phrases):
        return (
            f"{note}\n\n"
            f"Tailscale MagicDNS is not resolving `{host}` from this MacBook/Streamlit process. "
            "Open Tailscale on the MacBook and confirm it is connected, then run "
            f"`tailscale status` and `curl -I https://{host}:4000/v1/models`. "
            "If MagicDNS stays broken, use the Mac Studio Tailscale IP in the env vars or restart Tailscale."
        )

    if "timed out" in lower or "readtimeout" in lower or "connecttimeout" in lower:
        return (
            f"{note}\n\n"
            "The hostname resolved, but the request timed out. Check that the Mac Studio is awake, "
            "`tailscale serve status` still lists the port, and the matching LaunchAgent is running."
        )

    if "403" in lower or "forbidden" in lower or "401" in lower or "unauthorized" in lower:
        return (
            f"{note}\n\n"
            "The service answered but rejected the request. Check the LiteLLM API key or "
            "MAC_STUDIO_MODEL_CONTROL_TOKEN in `runner/.env`, then restart Streamlit."
        )

    return note


def page_mac_studio_node():
    import httpx
    from datetime import datetime
    from runner.pipeline.diagnostics import ErrorKind, probe_health

    st.title("Mac Studio Node")
    st.caption(f"Last refresh: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} — refresh the browser to update")

    config = _load_config_safe()
    litelm_url  = (config.litelm_base_url.rstrip("/") if config and config.litelm_base_url else "")
    litelm_key  = (config.litelm_api_key if config else "")
    model_control_url = (
        config.mac_studio_model_control_url.rstrip("/")
        if config and config.mac_studio_model_control_url
        else ""
    )
    model_control_token = config.mac_studio_model_control_token if config else ""

    # Direct Ollama is optional. Prefer the model-control helper when configured:
    # it avoids exposing Ollama itself and is what batch preflight uses for unloads.
    import os
    mac_ollama_url = (
        os.getenv("MAC_STUDIO_OLLAMA_URL", "")
        or (config.litelm_ollama_base_url if config else "")
    ).rstrip("/")
    mac_dashboard_url = os.getenv("MAC_STUDIO_DASHBOARD_URL", "")

    # ── Services ─────────────────────────────────────────────────────────────
    st.header("AI Services")
    s1, s2, s3 = st.columns(3)

    # LiteLLM
    litellm_models = []
    if litelm_url:
        try:
            health = probe_health(litelm_url, api_key=litelm_key, timeout=15)
            r = httpx.get(
                f"{litelm_url}/v1/models",
                headers={"Authorization": f"Bearer {litelm_key}"},
                timeout=15,
            )
            if r.status_code == 200:
                s1.success(f"LiteLLM online ({litelm_url})")
                if health.kind == ErrorKind.HEALTH_SLOW:
                    s1.caption("API is reachable; `/health` is slow because it pings cold large models.")
                litellm_models = [m["id"] for m in r.json().get("data", [])]
            else:
                s1.error(f"LiteLLM HTTP {r.status_code}")
        except Exception as exc:
            s1.error(f"LiteLLM unreachable: {exc}")
    else:
        s1.warning("LITELM_BASE_URL not set")

    # Ollama on Mac Studio
    ollama_models = []
    ollama_loaded = []
    if model_control_url:
        headers = {"Authorization": f"Bearer {model_control_token}"} if model_control_token else {}
        try:
            ro = httpx.get(f"{model_control_url}/api/tags", headers=headers, timeout=10)
            if ro.status_code == 200:
                s2.success(f"Model control online ({model_control_url})")
                ollama_models = [m["name"] for m in ro.json().get("models", [])]
            else:
                s2.error(f"Model control HTTP {ro.status_code}")
        except Exception as exc:
            s2.error(f"Model control unreachable: {exc}")
        try:
            rp = httpx.get(f"{model_control_url}/api/ps", headers=headers, timeout=10)
            if rp.status_code == 200:
                ollama_loaded = [m["name"] for m in rp.json().get("models", [])]
        except Exception:
            pass
    elif mac_ollama_url:
        try:
            ro = httpx.get(f"{mac_ollama_url}/api/tags", timeout=5)
            if ro.status_code == 200:
                s2.success(f"Ollama online ({mac_ollama_url})")
                ollama_models = [m["name"] for m in ro.json().get("models", [])]
            else:
                s2.error(f"Ollama HTTP {ro.status_code}")
        except Exception as exc:
            s2.error(f"Ollama unreachable: {exc}")
        try:
            rp = httpx.get(f"{mac_ollama_url}/api/ps", timeout=5)
            if rp.status_code == 200:
                ollama_loaded = [m["name"] for m in rp.json().get("models", [])]
        except Exception:
            pass
    else:
        s2.warning("MAC_STUDIO_MODEL_CONTROL_URL not set (preferred) or MAC_STUDIO_OLLAMA_URL not set")

    # Dashboard link
    if mac_dashboard_url:
        s3.success(f"[Open Mac Studio Dashboard]({mac_dashboard_url})")
    else:
        s3.info("Set MAC_STUDIO_DASHBOARD_URL in .env to link the dashboard")

    # ── Models ───────────────────────────────────────────────────────────────
    st.header("Models")
    m1, m2 = st.columns(2)
    with m1:
        st.subheader("LiteLLM aliases")
        if litellm_models:
            st.dataframe({"model": litellm_models}, width="stretch")
        else:
            st.info("No models returned (LiteLLM offline or no aliases configured)")
    with m2:
        st.subheader("Ollama installed")
        if ollama_models:
            st.dataframe({"model": ollama_models}, width="stretch")
        else:
            st.info("No models returned")
        if ollama_loaded:
            st.caption("Currently loaded in memory: " + ", ".join(ollama_loaded))

    # ── Quick Model Test ──────────────────────────────────────────────────────
    st.header("Quick Model Test")
    test_models = litellm_models or [
        "triage", "core-qwen", "core-gemma",
        "review-qwen", "review-gemma", "coder", "lexicon-llm",
    ]
    t1, t2 = st.columns([3, 1])
    with t1:
        test_prompt = st.text_area(
            "Test prompt",
            value="Reply with exactly: DASHBOARD MODEL TEST OK",
            height=80,
        )
    with t2:
        test_model = st.selectbox("Model", test_models)

    if st.button("Run test", type="primary"):
        if not litelm_url:
            st.error("LITELM_BASE_URL not configured.")
        else:
            with st.spinner(f"Sending to {test_model}..."):
                try:
                    r = httpx.post(
                        f"{litelm_url}/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {litelm_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": test_model,
                            "messages": [{"role": "user", "content": test_prompt}],
                            "max_tokens": 256,
                        },
                        timeout=120,
                    )
                    if r.status_code == 200:
                        reply = r.json()["choices"][0]["message"]["content"]
                        st.success(reply)
                    else:
                        st.error(f"HTTP {r.status_code}")
                        with st.expander("Full response"):
                            st.code(r.text)
                except Exception as exc:
                    st.error(str(exc))

    # ── LiteLLM Logs ─────────────────────────────────────────────────────────
    st.header("LiteLLM Logs")
    st.caption(
        "Logs are read from the Mac Studio via SSH or a shared path. "
        "If MAC_STUDIO_DASHBOARD_URL is set, open the full dashboard for live logs."
    )
    log_path_out = os.getenv("MAC_STUDIO_LITELM_LOG", "")
    log_path_err = os.getenv("MAC_STUDIO_LITELM_ERR", "")
    if log_path_out or log_path_err:
        lc1, lc2 = st.columns(2)
        with lc1:
            st.subheader("stdout")
            if log_path_out and Path(log_path_out).exists():
                lines = Path(log_path_out).read_text(errors="replace").splitlines()
                st.code("\n".join(lines[-80:]))
            else:
                st.info(f"Not found: {log_path_out or '(not set)'}")
        with lc2:
            st.subheader("stderr")
            if log_path_err and Path(log_path_err).exists():
                lines = Path(log_path_err).read_text(errors="replace").splitlines()
                st.code("\n".join(lines[-80:]))
            else:
                st.info(f"Not found: {log_path_err or '(not set)'}")
    else:
        st.info(
            "Set `MAC_STUDIO_LITELM_LOG` and `MAC_STUDIO_LITELM_ERR` in `.env` "
            "to a path accessible from the MacBook (e.g. a Tailscale-mounted share). "
            "Otherwise use the Mac Studio Dashboard link above."
        )

    # ── Config reminder ───────────────────────────────────────────────────────
    with st.expander("How to configure this page (.env keys)"):
        st.code(
            "# Already set:\n"
            "LITELM_BASE_URL=https://<tailscale-host>.ts.net:4000\n"
            "LITELM_API_KEY=sk-local-research-key-change-this\n\n"
            "# Add these for full Mac Studio visibility:\n"
            "MAC_STUDIO_MODEL_CONTROL_URL=https://mqvlfwcwmc.tail379051.ts.net:11555\n"
            "MAC_STUDIO_MODEL_CONTROL_TOKEN=<token>\n"
            "MAC_STUDIO_DASHBOARD_URL=https://mqvlfwcwmc.tail379051.ts.net:8502\n"
            "# Optional only if direct Ollama is deliberately exposed:\n"
            "MAC_STUDIO_OLLAMA_URL=http://<tailscale-ip>:11434\n"
            "# Optional — only if logs are on a shared path:\n"
            "MAC_STUDIO_LITELM_LOG=/tmp/litelm.log\n"
            "MAC_STUDIO_LITELM_ERR=/tmp/litelm.err\n",
            language="bash",
        )

    st.divider()

    # ── Embedding dimension test ──────────────────────────────────────────
    st.subheader("Embedding Dimension Test")
    st.caption("Verify that Mac Studio returns 4096-dimension vectors (required for Supabase vector(4096) table).")
    if st.button("▶ Run embed-test (Mac Studio)", key="embed_test_btn"):
        import os as _os
        litelm_url_et = config.litelm_base_url.rstrip("/") if config and config.litelm_base_url else ""
        litelm_key_et = config.litelm_api_key if config else ""
        model_et = _os.getenv("LITELM_EMBEDDING_MODEL", "research-embedding")
        if not litelm_url_et:
            st.error("LITELM_BASE_URL not set in runner/.env")
        else:
            import httpx as _httpx
            with st.spinner(f"Sending test embedding to {litelm_url_et} …"):
                try:
                    r = _httpx.post(
                        f"{litelm_url_et}/v1/embeddings",
                        headers={"Authorization": f"Bearer {litelm_key_et}", "Content-Type": "application/json"},
                        json={"model": model_et, "input": "SurvivingSOGICE embedding dimension test."},
                        timeout=30,
                    )
                    r.raise_for_status()
                    dim = len(r.json()["data"][0]["embedding"])
                    if dim == 4096:
                        st.success(f"✅ {model_et} → {dim} dimensions — Supabase table correctly sized at vector(4096)")
                    else:
                        st.error(f"❌ {model_et} → {dim} dimensions — expected 4096. Run migrate-supabase below.")
                except Exception as exc:
                    st.error(f"Connection failed: {exc}")

    st.divider()

    # ── Pre-flight / Doctor ───────────────────────────────────────────────
    st.subheader("Pre-flight Check (Doctor)")
    st.caption("Checks all credentials, services, and dependencies before running the first ingest.")
    if st.button("▶ Run doctor", key="doctor_btn"):
        checks = []
        notes = []
        cfg = config
        checks.append(("SANITY_PROJECT_ID", bool(cfg and cfg.sanity_project_id)))
        checks.append(("SANITY_WRITE_TOKEN", bool(cfg and cfg.sanity_write_token)))
        checks.append(("SUPABASE_URL", bool(cfg and cfg.supabase_url)))
        checks.append(("SUPABASE_SERVICE_KEY", bool(cfg and cfg.supabase_service_key)))
        checks.append(("LITELM_BASE_URL", bool(cfg and cfg.litelm_base_url)))
        # Service reachability
        import httpx as _httpx
        if cfg and cfg.litelm_base_url:
            dr = probe_health(cfg.litelm_base_url, api_key=cfg.litelm_api_key, timeout=15)
            litelm_ok = dr.ok or dr.kind == ErrorKind.HEALTH_SLOW
            checks.append(("LiteLLM reachable", litelm_ok))
            if dr.kind == ErrorKind.HEALTH_SLOW:
                notes.append("LiteLLM `/health` is slow, but `/v1/models` is reachable. This is OK for batching.")
            elif not litelm_ok:
                notes.append(f"LiteLLM: {dr.message}")
                if dr.detail:
                    notes.append(_remote_service_error_note("LiteLLM", cfg.litelm_base_url, dr.detail))
        if cfg and cfg.mac_studio_model_control_url:
            try:
                headers = (
                    {"Authorization": f"Bearer {cfg.mac_studio_model_control_token}"}
                    if cfg.mac_studio_model_control_token else {}
                )
                r = _httpx.get(f"{cfg.mac_studio_model_control_url.rstrip('/')}/health", headers=headers, timeout=10)
                checks.append(("Mac Studio model-control reachable", r.status_code == 200))
            except Exception as exc:
                checks.append(("Mac Studio model-control reachable", False))
                notes.append(_remote_service_error_note(
                    "Mac Studio model-control",
                    cfg.mac_studio_model_control_url,
                    exc,
                ))
        if cfg:
            try:
                r = _httpx.get(f"{cfg.ollama_base_url}/api/tags", timeout=4)
                checks.append(("Local Ollama reachable", r.status_code == 200))
            except Exception:
                checks.append(("Local Ollama reachable", False))
        # Sanity reachability
        if cfg and cfg.sanity_project_id:
            try:
                r = _httpx.get(
                    f"https://{cfg.sanity_project_id}.api.sanity.io/v2024-01-01/data/query/{cfg.sanity_dataset}",
                    params={"query": "count(*[_type == 'lexiconEntry'])"},
                    headers={"Authorization": f"Bearer {cfg.sanity_write_token}"},
                    timeout=8,
                )
                checks.append(("Sanity API reachable", r.status_code == 200))
            except Exception:
                checks.append(("Sanity API reachable", False))

        all_ok = all(ok for _, ok in checks)
        col1, col2 = st.columns(2)
        for i, (label, ok) in enumerate(checks):
            (col1 if i % 2 == 0 else col2).markdown(f"{'✅' if ok else '❌'} {label}")
        if notes:
            with st.expander("Doctor notes", expanded=not all_ok):
                for note in notes:
                    st.write(f"- {note}")
        if all_ok:
            st.success("All checks passed — ready to ingest.")
        else:
            st.warning("Some checks failed. Fix the issues above, then re-run.")

    st.divider()

    # ── Supabase migration ────────────────────────────────────────────────
    st.subheader("Supabase Migration")
    st.caption(
        "Recreates the `document_embeddings` table with `vector(4096)`. "
        "**Destructive** — drops the existing table. Only run if the table was created with the wrong dimension."
    )
    st.info(
        "Supabase does not expose a REST SQL endpoint — paste the SQL below into the "
        "[Supabase SQL editor](https://supabase.com/dashboard/project/"
        + (config.supabase_url.split("//")[1].split(".")[0] if config and config.supabase_url else "your-project")
        + "/sql)."
    )
    migration_sql = """\
DROP TABLE IF EXISTS document_embeddings;
CREATE TABLE document_embeddings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id          text NOT NULL UNIQUE,
  embedding       vector(4096),
  doc_type        text,
  scope           text,
  tier            text,
  language        text,
  embedded_at     timestamptz DEFAULT now(),
  embedding_model text
);"""
    st.code(migration_sql, language="sql")
    if st.button("📋 Copy SQL to clipboard", key="copy_sql"):
        st.write('<script>navigator.clipboard.writeText(`' + migration_sql.replace('`','\\`') + '`)</script>', unsafe_allow_html=True)
        st.success("SQL shown above — copy and paste into Supabase SQL editor.")


# ---------------------------------------------------------------------------
# Seed Data page
# ---------------------------------------------------------------------------

def page_seed_data():
    st.title("Seed Data")
    st.caption(
        "Populate Sanity with the full research taxonomy. "
        "All operations are idempotent — safe to re-run. "
        "Run dry-run first to preview what will be written."
    )

    config = _load_config_safe()
    if not config:
        st.error("Cannot load config — check runner/.env.")
        return

    # Live counts from Sanity
    @st.cache_data(ttl=30, show_spinner=False)
    def _sanity_counts():
        import httpx as _httpx
        base = (
            f"https://{config.sanity_project_id}.api.sanity.io"
            f"/v2024-01-01/data/query/{config.sanity_dataset}"
        )
        headers = {"Authorization": f"Bearer {config.sanity_write_token}"}
        types = [
            "lexiconEntry", "tacticEntry", "practiceEntry", "tagRegistry",
            "organization", "person", "legalDefinition", "exclusionClause", "event",
        ]
        counts = {}
        for t in types:
            try:
                r = _httpx.get(base, params={"query": f'count(*[_type=="{t}"])'}, headers=headers, timeout=8)
                counts[t] = r.json().get("result", "?") if r.status_code == 200 else "err"
            except Exception:
                counts[t] = "—"
        return counts

    with st.spinner("Fetching current Sanity counts …"):
        counts = _sanity_counts()

    # Summary metrics row
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Terms",         counts.get("lexiconEntry", "—"))
    c2.metric("Tactics",       counts.get("tacticEntry", "—"))
    c3.metric("Practices",     counts.get("practiceEntry", "—"))
    c4.metric("Tag Registry",  counts.get("tagRegistry", "—"))
    c5.metric("Orgs/Networks", counts.get("organization", "—"))
    d1, d2, d3, d4 = st.columns(4)
    d1.metric("Persons",       counts.get("person", "—"))
    d2.metric("Laws",          counts.get("legalDefinition", "—"))
    d3.metric("Excl. Clauses", counts.get("exclusionClause", "—"))
    d4.metric("Events",        counts.get("event", "—"))

    if st.button("↻ Refresh counts"):
        st.cache_data.clear()
        st.rerun()

    st.divider()

    tabs = st.tabs([
        "Lexicon",
        "Tactics",
        "Practices",
        "Tag Registry",
        "Entities",
        "Networks",
        "Exclusion Clauses",
        "Variants",
    ])

    # ── Lexicon ──────────────────────────────────────────────────────────────
    with tabs[0]:
        st.subheader("Lexicon Terms")
        st.caption("145 terms from SOGICE_Lexicon_v2.1.md → lexiconEntry records")
        force = st.checkbox("Force overwrite existing entries", key="lex_force")
        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶ Dry run", key="lex_dry"):
                from runner.pipeline.seed import parse_lexicon_md
                terms = parse_lexicon_md()
                st.success(f"Would write {len(terms)} terms")
                st.dataframe(
                    [{"term": t["term"], "cluster": t.get("proposedCluster",""), "function": t.get("function","")} for t in terms[:20]],
                    width="stretch",
                )
                if len(terms) > 20:
                    st.caption(f"… and {len(terms)-20} more")
        with col2:
            if st.button("⬆ Seed Lexicon", key="lex_run", type="primary"):
                from runner.pipeline.seed import seed_lexicon
                with st.spinner("Seeding lexicon …"):
                    summary = seed_lexicon(config, dry_run=False, force=force)
                st.success(f"Done — {summary.get('written',0)} written, {summary.get('failed',0)} failed")
                st.cache_data.clear()

    # ── Tactics ──────────────────────────────────────────────────────────────
    with tabs[1]:
        st.subheader("Tactics")
        st.caption("44 tactics (structural + sub-tactics + campaign) from SOGICE_Ontology_v3.0.md → tacticEntry records")
        force_t = st.checkbox("Force overwrite existing entries", key="tac_force")
        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶ Dry run", key="tac_dry"):
                from runner.pipeline.seed import parse_tactics
                tactics = parse_tactics()
                structural = [t for t in tactics if t.get("tactic_level","structural") == "structural"]
                sub = [t for t in tactics if t.get("tactic_level") == "sub-tactic"]
                campaigns = [t for t in tactics if t.get("tactic_level") == "campaign"]
                st.success(f"Would write {len(tactics)} tactics — {len(structural)} structural, {len(sub)} sub-tactics, {len(campaigns)} campaigns")
                st.dataframe(
                    [{"tactic": t["tactic"], "level": t.get("tactic_level","structural"), "cluster": t.get("primary_cluster",""), "has_def": bool(t.get("definition"))} for t in tactics],
                    width="stretch",
                )
        with col2:
            if st.button("⬆ Seed Tactics", key="tac_run", type="primary"):
                from runner.pipeline.seed import seed_tactics
                with st.spinner("Seeding tactics …"):
                    summary = seed_tactics(config, dry_run=False, force=force_t)
                st.success(f"Done — {summary.get('written',0)} written, {summary.get('failed',0)} failed")
                st.cache_data.clear()

    # ── Practices ────────────────────────────────────────────────────────────
    with tabs[2]:
        st.subheader("Practices")
        st.caption("14 SOGICE practices → practiceEntry records")
        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶ Dry run", key="prac_dry"):
                from runner.pipeline.seed import parse_practices
                practices = parse_practices()
                st.success(f"Would write {len(practices)} practices")
                st.dataframe(
                    [{"practice": p["practice"], "type": p.get("practice_type",""), "has_def": bool(p.get("definition")), "tactic_overlap": bool(p.get("notes"))} for p in practices],
                    width="stretch",
                )
        with col2:
            if st.button("⬆ Seed Practices", key="prac_run", type="primary"):
                from runner.pipeline.seed import seed_practices
                with st.spinner("Seeding practices …"):
                    summary = seed_practices(config, dry_run=False)
                st.success(f"Done — {summary.get('written',0)} written, {summary.get('failed',0)} failed")
                st.cache_data.clear()

    # ── Tag Registry ─────────────────────────────────────────────────────────
    with tabs[3]:
        st.subheader("Tag Registry")
        st.caption("94 controlled vocabulary tags (Type/Format/Evidence/Country/Function/Harm/Migration) → tagRegistry records")
        from runner.pipeline.seed import _TAG_CATEGORIES
        cat_options = ["all"] + sorted(_TAG_CATEGORIES)
        selected_cat = st.selectbox("Category", cat_options, key="tag_cat")
        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶ Dry run", key="tag_dry"):
                from runner.pipeline.seed import parse_vocabulary_csv
                cats = None if selected_cat == "all" else {selected_cat}
                tags = parse_vocabulary_csv(categories=cats)
                from collections import Counter
                by_cat = Counter(t["category"] for t in tags)
                st.success(f"Would write {len(tags)} tags")
                for cat_name, n in sorted(by_cat.items()):
                    st.caption(f"  {cat_name}: {n}")
        with col2:
            if st.button("⬆ Seed Tag Registry", key="tag_run", type="primary"):
                from runner.pipeline.seed import seed_tag_registry
                cats = None if selected_cat == "all" else {selected_cat}
                with st.spinner("Seeding tag registry …"):
                    summary = seed_tag_registry(config, dry_run=False, categories=cats)
                st.success(f"Done — {summary.get('written',0)} written, {summary.get('failed',0)} failed")
                st.cache_data.clear()

    # ── Entities ─────────────────────────────────────────────────────────────
    with tabs[4]:
        st.subheader("Entity Registry")
        st.caption("Organizations, persons, laws, and events from Entity_Registry_v1.1.md")
        entity_type = st.selectbox("Entity type", ["all", "org", "person", "law", "event"], key="ent_type")
        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶ Dry run", key="ent_dry"):
                from runner.pipeline.seed import parse_entity_registry_md
                registry = parse_entity_registry_md()
                orgs    = len(registry["orgs"])    if entity_type in ("org", "all") else 0
                persons = len(registry["persons"]) if entity_type in ("person", "all") else 0
                laws    = len(registry["laws"])    if entity_type in ("law", "all") else 0
                events  = len(registry["events"])  if entity_type in ("event", "all") else 0
                total = orgs + persons + laws + events
                st.success(f"Would write {total} entities — orgs={orgs}, persons={persons}, laws={laws}, events={events}")
        with col2:
            if st.button("⬆ Seed Entities", key="ent_run", type="primary"):
                from runner.pipeline.seed import seed_entities
                with st.spinner(f"Seeding entities (type={entity_type}) …"):
                    summary = seed_entities(config, dry_run=False, entity_type=entity_type)
                st.success(
                    f"Done — {summary.get('created',0)} created, "
                    f"{summary.get('skipped',0)} skipped, "
                    f"{len(summary.get('errors',[]))} errors"
                )
                if summary.get("errors"):
                    with st.expander("Errors"):
                        for e in summary["errors"][:20]:
                            st.caption(e)
                st.cache_data.clear()

    # ── Networks ─────────────────────────────────────────────────────────────
    with tabs[5]:
        st.subheader("Networks")
        st.caption("34 network entries from vocabulary CSV → organization records (type=advocacy-network)")
        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶ Dry run", key="net_dry"):
                from runner.pipeline.seed import parse_networks
                networks = parse_networks()
                st.success(f"Would write {len(networks)} network organizations")
                st.dataframe(
                    [{"name": n["name"], "has_desc": bool(n.get("description"))} for n in networks],
                    width="stretch",
                )
        with col2:
            if st.button("⬆ Seed Networks", key="net_run", type="primary"):
                from runner.pipeline.seed import seed_networks
                with st.spinner("Seeding networks …"):
                    summary = seed_networks(config, dry_run=False)
                st.success(f"Done — {summary.get('written',0)} written, {summary.get('failed',0)} failed")
                st.cache_data.clear()

    # ── Exclusion Clauses ────────────────────────────────────────────────────
    with tabs[6]:
        st.subheader("Exclusion Clauses")
        st.caption(
            "6 exclusion clauses from SOGICE_Ontology_v3.0.md Part IV → exclusionClause records. "
            "Also seeds 2 missing parent laws (Germany 2020, Canada C-4)."
        )
        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶ Dry run", key="ec_dry"):
                from runner.pipeline.seed import parse_exclusion_clauses, _MISSING_EXCLUSION_CLAUSE_LAWS
                clauses = parse_exclusion_clauses()
                st.success(f"Would write {len(clauses)} clauses + {len(_MISSING_EXCLUSION_CLAUSE_LAWS)} parent laws")
                for c in clauses:
                    used = "⚠ policy argument" if c.get("used_in_policy_arguments") else ""
                    st.caption(f"EC-{c['id']}  {used}")
        with col2:
            if st.button("⬆ Seed Exclusion Clauses", key="ec_run", type="primary"):
                from runner.pipeline.seed import seed_exclusion_clauses
                with st.spinner("Seeding exclusion clauses …"):
                    summary = seed_exclusion_clauses(config, dry_run=False)
                st.success(
                    f"Done — {summary.get('written_laws',0)} laws + "
                    f"{summary.get('written_clauses',0)} clauses written, "
                    f"{summary.get('failed',0)} failed"
                )
                st.cache_data.clear()

    # ── Lexicon Variants ─────────────────────────────────────────────────────
    with tabs[7]:
        st.subheader("Multilingual Variants")
        st.caption(
            "107 multilingual variants from Section 11 of SOGICE_Lexicon_v2.1.md → "
            "appended to parent lexiconEntry records as multilingualVariants array. "
            "Run seed-lexicon first."
        )
        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶ Dry run", key="var_dry"):
                from runner.pipeline.seed import parse_multilingual_variants_md
                variants = parse_multilingual_variants_md()
                langs = {}
                for v in variants:
                    langs[v.get("language","?")] = langs.get(v.get("language","?"),0) + 1
                st.success(f"Would append {len(variants)} variants across {len(langs)} languages")
                st.dataframe(
                    [{"language": k, "count": v} for k,v in sorted(langs.items())],
                    width="stretch",
                )
        with col2:
            if st.button("⬆ Seed Variants", key="var_run", type="primary"):
                from runner.pipeline.seed import seed_lexicon_variants
                with st.spinner("Seeding multilingual variants …"):
                    summary = seed_lexicon_variants(config, dry_run=False)
                st.success(
                    f"Done — {summary.get('appended',0)} appended, "
                    f"{summary.get('stubs',0)} stubs created, "
                    f"{summary.get('errors',0)} errors"
                )
                st.cache_data.clear()


# ---------------------------------------------------------------------------
# Media Review
# ---------------------------------------------------------------------------

def page_media_review():
    st.title("Media Review")
    st.caption(
        "Transcript versions, research annotations, comment evidence, and related-source "
        "candidates for media documents. All annotations remain private until researcher review."
    )

    config = _load_config_safe()
    if not config:
        st.error("Could not load config — is runner/.env configured?")
        return

    corpus_dir = config.corpus_dir
    if not corpus_dir.exists():
        st.info(f"Corpus directory does not exist yet: {corpus_dir}")
        return

    media_docs = sorted(
        [d.name for d in corpus_dir.iterdir() if d.is_dir() and (d / "media_metadata.json").exists()]
    )
    if not media_docs:
        st.info("No media documents found. Ingest a video or attach an SRT file to get started.")
        return

    doc_id = st.selectbox("Document", media_docs, key="mr_doc_id")
    if not doc_id:
        return

    # U3: clear panel-local state when the selected document changes
    _panel_reset_on_doc_change(
        "mr", doc_id,
        ["mr_srt_path", "mr_srt_lang", "mr_srt_primary",
         "mr_comments_flagged", "mr_set_primary_confirm"],
    )

    doc_dir = corpus_dir / doc_id
    _mr_overview_section(doc_id, doc_dir, config)
    st.divider()

    tab_transcripts, tab_annotations, tab_comments, tab_candidates = st.tabs(
        ["Transcripts", "Annotations", "Comments", "Related Sources"]
    )
    with tab_transcripts:
        _mr_transcripts(doc_id, doc_dir, config)
    with tab_annotations:
        _mr_annotations(doc_id, doc_dir, config)
    with tab_comments:
        _mr_comments(doc_id, doc_dir, config)
    with tab_candidates:
        _mr_candidates(doc_id, doc_dir, config)


def _mr_read_json(path, default=None):
    if default is None:
        default = {}
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _file_timestamp(path: Path) -> str:
    if not path.exists():
        return "—"
    return datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat()


def _latest_annotation_dates(doc_dir: Path) -> tuple[str, str]:
    latest_generated = ""
    latest_reviewed = ""
    root = doc_dir / "research_annotations"
    if not root.exists():
        return latest_generated, latest_reviewed
    for path in root.glob("*.json"):
        data = _mr_read_json(path, {})
        generated = str(data.get("generatedAt") or "")
        reviewed = str(data.get("reviewedAt") or "")
        if generated > latest_generated:
            latest_generated = generated
        if reviewed > latest_reviewed:
            latest_reviewed = reviewed
    return latest_generated, latest_reviewed


def _mr_overview_section(doc_id: str, doc_dir: Path, config):
    """Platform metadata card + Sanity/Supabase/local status."""
    meta = _mr_read_json(doc_dir / "media_metadata.json")
    intake = _mr_read_json(doc_dir / "intake.json")
    general = meta.get("general", {})
    dist = meta.get("platformDistribution", [])
    reach = meta.get("reachMetrics", {})
    te = meta.get("transcriptEvidence", {})

    col_meta, col_status = st.columns([3, 1])
    with col_meta:
        title = general.get("episodeTitle") or general.get("seriesTitle") or doc_id
        st.subheader(title)
        creator = general.get("creator") or ""
        pub_date = general.get("publicationDate") or ""
        duration = general.get("durationMinutes")
        parts = []
        if creator:
            parts.append(f"**{creator}**")
        if pub_date:
            parts.append(pub_date)
        if duration:
            parts.append(f"{duration:.1f} min")
        if parts:
            st.markdown("  ·  ".join(parts))

        synopsis = general.get("synopsis") or ""
        if synopsis:
            with st.expander("Synopsis"):
                st.write(synopsis)

        if dist:
            rows_dist = []
            for p in dist:
                vc = p.get("viewCount")
                rows_dist.append({
                    "Platform": p.get("platform", ""),
                    "URL": p.get("url", ""),
                    "Views (platform metadata)": f"{vc:,}" if isinstance(vc, int) else str(vc or "—"),
                    "Status": p.get("status", ""),
                })
            st.dataframe(rows_dist, hide_index=True, width="stretch")

        total_views = reach.get("totalEstimatedViews")
        signals = meta.get("platformAlgorithmicSignals", {})
        comment_collection = meta.get("commentCollection") or {}
        comments_path = doc_dir / "media_comments.json"
        comments_payload = _mr_read_json(comments_path, {}) if comments_path.exists() else {}
        comment_count = (
            comment_collection.get("platformCommentCount")
            or signals.get("commentCount")
            or general.get("commentCount")
            or comments_payload.get("platformCommentCount")
        )
        comments_collected = (
            comment_collection.get("collectedCount")
            or signals.get("commentsCollectedCount")
            or comments_payload.get("collectedCount")
            or 0
        )
        c1, c2, c3 = st.columns(3)
        c1.metric("Platform views", f"{total_views:,}" if isinstance(total_views, int) else "—")
        c2.metric("Comments on platform", str(comment_count) if comment_count is not None else "not reported")
        c3.metric(
            "Comments collected for review",
            str(comments_collected),
            help="Run collect-comments <doc_id> to collect platform comments for lower-trust review.",
        )
        if not comments_collected:
            if comments_path.exists():
                generated = comments_payload.get("generatedAt", "")
                st.info(
                    "Comment collection has been attempted, but yt-dlp returned 0 usable comments. "
                    "This can mean comments are disabled, unavailable without login/cookies, rate-limited, "
                    "or not exposed by the extractor for this video."
                )
                if generated:
                    st.caption(f"Last collection attempt: {generated}. Local file: `media_comments.json`.")
            else:
                st.info(
                    f"No comments collected yet. Run:  \n"
                    f"```\npython -m runner collect-comments {doc_id}\n```"
                )
        feedback_key = f"mr_collect_comments_feedback_{doc_id}"
        if st.session_state.get(feedback_key):
            st.info(st.session_state[feedback_key])
        repair_col, comments_col = st.columns(2)
        with repair_col:
            if st.button("Repair table metadata", key=f"mr_repair_meta_{doc_id}"):
                try:
                    from runner.pipeline.media_review import repair_media_metadata_from_raw

                    result = repair_media_metadata_from_raw(doc_id, config, write_sanity=False)
                    st.success(f"Updated {result['changedCount']} local metadata field(s).")
                    st.rerun()
                except Exception as exc:
                    st.error(str(exc))
            st.caption("Promotes channel URL, handle, likes, comments, and availability from local yt-dlp metadata.")
        with comments_col:
            max_comments = st.number_input(
                "Max comments",
                min_value=1,
                max_value=500,
                value=50,
                step=10,
                key=f"mr_collect_comments_max_{doc_id}",
            )
            if st.button("Collect comments", key=f"mr_collect_comments_{doc_id}"):
                try:
                    from runner.pipeline.media_review import collect_comments_for_document

                    with st.spinner("Collecting platform comments with yt-dlp…"):
                        result = collect_comments_for_document(doc_id, config, max_comments=int(max_comments))
                    count = int(result.get("collectedCount") or 0)
                    if count:
                        st.session_state[feedback_key] = (
                            f"Collected {count} comment(s). Updated `media_comments.json` "
                            "and `comment_evidence_queue.json` locally."
                        )
                    else:
                        st.session_state[feedback_key] = (
                            "Collection ran and updated `media_comments.json`, but yt-dlp returned 0 usable comments. "
                            "No LLM analysis is run on comments automatically; comments are only a lower-trust review queue."
                        )
                    st.rerun()
                except Exception as exc:
                    st.error(str(exc))

        primary_label = te.get("selectedTranscriptLabel", "")
        chunk_count = te.get("transcriptChunkCount", 0)
        version_count = te.get("transcriptVersionCount", 0)
        st.caption(
            f"Transcript: {version_count} version(s) · primary: `{primary_label or 'none'}` · {chunk_count} chunks"
        )

    with col_status:
        st.subheader("Storage status")
        sanity_ok = (doc_dir / "sanity_record.json").exists()
        embedding_json = doc_dir / "embedding.json"
        embedding_data = _mr_read_json(embedding_json, {}) if embedding_json.exists() else {}
        embed_status = _embedding_payload_status(embedding_data)
        embed_ok = embedding_json.exists() and embed_status["ok"]

        if sanity_ok:
            st.success("Sanity: uploaded")
        else:
            st.warning("Sanity: local only")

        if embed_ok:
            st.success(f"Embedding: {embed_status['model']}, {embed_status['dimension']}d")
        else:
            st.warning(f"Embedding: {embed_status['detail'] if embedding_json.exists() else 'missing'}")

        try:
            from runner.pipeline.upload import _embedding_status as _upemb
            emb_status = _upemb(doc_dir, config)
            supa_state = emb_status.get("supabase_state", "")
            supa_detail = emb_status.get("supabase_detail", "")
            if emb_status.get("supabase_ok"):
                st.success(f"Supabase: {supa_detail}")
            elif supa_state == "unreachable":
                st.warning(f"Supabase: unreachable  \n{supa_detail}")
            else:
                st.error(f"Supabase: {supa_detail}")
        except Exception as exc:
            st.warning(f"Supabase: check unavailable ({exc})")

        source_url = intake.get("source_url") or intake.get("source", "")
        if source_url.startswith("http"):
            st.markdown(f"[Open source]({source_url})")

    _mr_dates_panel(doc_id, doc_dir, meta, intake)
    _mr_artifact_completeness_panel(doc_id, doc_dir)


def _mr_dates_panel(doc_id: str, doc_dir: Path, meta: dict, intake: dict):
    general = meta.get("general", {}) if isinstance(meta, dict) else {}
    analysis = _mr_read_json(doc_dir / "analysis.json", {})
    metadata = _mr_read_json(doc_dir / "metadata.json", {})
    latest_ann, latest_review = _latest_annotation_dates(doc_dir)
    rows = [
        {"Date": "Source publication", "Value": general.get("publicationDate") or analysis.get("publication_date") or "—", "From": "media_metadata.general / analysis"},
        {"Date": "Intake Wayback check", "Value": intake.get("wayback_checked_at") or "—", "From": "intake.json"},
        {"Date": "Local save / analysis package", "Value": metadata.get("saved_at") or _file_timestamp(doc_dir / "analysis.json"), "From": "metadata.json / analysis.json"},
        {"Date": "Sanity upload record", "Value": _file_timestamp(doc_dir / "sanity_record.json"), "From": "sanity_record.json"},
        {"Date": "Latest annotation generated", "Value": latest_ann or "—", "From": "research_annotations/*.json"},
        {"Date": "Latest annotation reviewed", "Value": latest_review or "—", "From": "research_annotations/*.json"},
    ]
    with st.expander("Dates and provenance", expanded=False):
        st.dataframe(rows, hide_index=True, width="stretch")
        _render_document_date_editor(doc_id, doc_dir, _load_config_safe(), compact=True)

    src = _collect_metadata_sources(doc_dir)
    needs_recon = not src["title"]["preprocess"] or not src["language"]["preprocess"]
    with st.expander("Metadata sources / reconciliation", expanded=needs_recon):
        _render_metadata_reconciliation(doc_id, doc_dir, _load_config_safe())


def _set_primary_transcript(doc_id: str, doc_dir: Path, label: str, push_sanity: bool, config) -> None:
    """Promote a transcript version to primary: update media_metadata + transcript_chunks.

    Raises ValueError when the version file is missing or contains no chunks so
    the caller can surface a blocking warning rather than leaving the label and
    the actual chunk content out of sync.
    """
    safe = "".join(c if c.isalnum() or c in {"-", "_"} else "_" for c in label).strip("_")
    version_file = doc_dir / "transcripts" / f"{safe}.json"

    if not version_file.exists():
        raise ValueError(
            f"No transcript file found for '{label}' "
            f"(expected transcripts/{safe}.json). "
            "Cannot set as primary without chunk data — attach or re-download the transcript first."
        )

    payload = json.loads(version_file.read_text(encoding="utf-8"))
    chunks = payload.get("chunks") or []

    if not chunks:
        raise ValueError(
            f"Transcript file for '{label}' exists but contains no chunks. "
            "Cannot set as primary — the file may be malformed or empty."
        )

    (doc_dir / "transcript_chunks.json").write_text(
        json.dumps(chunks, indent=2), encoding="utf-8"
    )

    media_path = doc_dir / "media_metadata.json"
    media = json.loads(media_path.read_text(encoding="utf-8")) if media_path.exists() else {}
    media.setdefault("transcriptEvidence", {})["selectedTranscriptLabel"] = label
    media_path.write_text(json.dumps(media, indent=2), encoding="utf-8")

    if push_sanity and config:
        from runner.clients import sanity as sanity_client
        sanity_client.write_media_metadata_update(doc_id, media, config)


def _mr_artifact_completeness_panel(doc_id: str, doc_dir: Path):
    checks = [
        ("Intake / source provenance", "intake.json", "Required for source URL, Wayback state, duplicate logic."),
        ("Extracted canonical text", "extracted.txt", "Required for analysis, enrichment, and research annotations."),
        ("Preprocess metadata", "preprocess.json", "Required for extraction provenance."),
        ("Main analysis", "analysis.json", "Required before upload/enrichment/research profiles."),
        ("Embedding", "embedding.json", "Required for Supabase semantic search. `embedding_pending.json` means analysis/enrichment succeeded and the embedding can be regenerated."),
        ("Media metadata", "media_metadata.json", "Required for media review and future public table fields."),
        ("Primary transcript chunks", "transcript_chunks.json", "Required for non-truncated timestamped annotation."),
        ("Transcript versions", "transcript_versions.json", "Needed for SRT/platform transcript comparison."),
        ("Transcript comparison", "transcript_comparison.json", "Needed to evaluate SRT differences."),
        ("Comments evidence queue", "comment_evidence_queue.json", "Lower-trust comment review artifact."),
        ("Related-source candidates", "candidate_sources.json", "Manual discovery/reupload/mirror review queue."),
        ("Research annotations", "research_annotations", "Profile-specific analytical layer."),
        ("Enrichment proposals", "enrichment.json", "Where candidate lexicon/entity/tactic/practice proposals live."),
        ("Sanity upload record", "sanity_record.json", "Local proof this sogiceDocument was uploaded."),
    ]
    rows = []
    for label, filename, reason in checks:
        path = doc_dir / filename
        exists = path.exists()
        if filename == "research_annotations":
            count = len(list(path.glob("*.json"))) if path.exists() else 0
            detail = f"{count} profile(s)" if count else "missing"
            exists = count > 0
        elif filename == "embedding.json":
            if path.exists():
                status = _embedding_payload_status(_mr_read_json(path, {}))
                exists = status["ok"]
                detail = status["detail"]
            elif (doc_dir / "embedding_pending.json").exists():
                pending = _mr_read_json(doc_dir / "embedding_pending.json", {})
                model = pending.get("model") or "embedding"
                error = str(pending.get("error") or "pending retry")
                detail = f"pending retry: {model} | {error}"
            else:
                detail = "missing"
        else:
            detail = "present" if exists else "missing"
        rows.append(
            {
                "Artifact": label,
                "Status": "OK" if exists else "Missing",
                "Detail": detail,
                "Why it matters": reason,
            }
        )
    missing_count = sum(1 for row in rows if row["Status"] == "Missing")
    with st.expander(f"Document completeness checklist ({missing_count} missing)", expanded=missing_count > 0):
        st.dataframe(rows, hide_index=True, width="stretch")


def _mr_transcripts(doc_id: str, doc_dir: Path, config):
    """Transcript versions table, full-text viewer, and cue-level diff."""
    from runner.pipeline.transcripts import diff_transcript_chunks, chunks_to_text

    with st.expander("About transcript types", expanded=False):
        st.markdown(_TRANSCRIPT_TYPE_REFERENCE)

    versions_path = doc_dir / "transcript_versions.json"
    versions = _mr_read_json(versions_path, [])
    if not isinstance(versions, list) or not versions:
        st.info("No transcript versions recorded. Ingest with a video URL or attach an SRT file.")

        st.subheader("Attach a researcher-provided SRT / VTT")
        srt_path = st.text_input("SRT / VTT file path", key="mr_srt_path")
        lang = st.text_input("Language code (e.g. en, pt, no)", key="mr_srt_lang")
        make_primary = st.checkbox("Set as primary transcript", value=True, key="mr_srt_primary")
        if st.button("Attach", key="mr_srt_attach"):
            if not srt_path:
                st.error("Paste the file path above first.")
            else:
                from runner.pipeline.media_review import attach_srt_to_document
                try:
                    result = attach_srt_to_document(
                        doc_id=doc_id, srt_path=srt_path, config=config,
                        language=lang, make_primary=make_primary,
                    )
                    st.success(f"Attached: {result['label']} — {result['chunkCount']} chunks")
                    st.rerun()
                except Exception as exc:
                    st.error(str(exc))
        return

    st.subheader("Transcript versions")
    primary_label_current = _mr_read_json(doc_dir / "media_metadata.json").get(
        "transcriptEvidence", {}
    ).get("selectedTranscriptLabel", "")
    rows = []
    for v in versions:
        label = v.get("label", "")
        rows.append({
            "Label": label,
            "Primary": "✓" if label == primary_label_current else "",
            "Language": v.get("language", ""),
            "Source": v.get("source", ""),
            "Kind": v.get("kind", ""),
            "Chunks": v.get("chunkCount", ""),
            "Chars": v.get("charCount", ""),
        })
    st.dataframe(rows, hide_index=True, width="stretch")

    labels = [v.get("label", "") for v in versions]
    if labels:
        st.markdown("**Set primary transcript**")
        prim_col, prim_btn_col = st.columns([3, 1])
        with prim_col:
            new_primary = st.selectbox(
                "Select version to make primary",
                labels,
                index=labels.index(primary_label_current) if primary_label_current in labels else 0,
                key="mr_set_primary_label",
            )
        prim_push = st.checkbox("Also patch Sanity mediaMetadata", value=False, key="mr_prim_push_sanity")
        with prim_btn_col:
            st.markdown("&nbsp;", unsafe_allow_html=True)
            if st.button("Set as primary", key="mr_set_primary_btn"):
                try:
                    _set_primary_transcript(doc_id, doc_dir, new_primary, prim_push, _load_config_safe())
                    sanity_note = ""
                    if prim_push:
                        sanity_note = " Sanity `mediaMetadata.transcriptEvidence.selectedTranscriptLabel` patched."
                    st.success(
                        f"Primary set to `{new_primary}`. "
                        f"Updated local files: `transcript_chunks.json`, `media_metadata.json`.{sanity_note} "
                        "If you have run research annotations, re-run them — they use the primary transcript."
                    )
                    if prim_push:
                        mr_url = _sanity_studio_url(_load_config_safe(), doc_id)
                        if mr_url:
                            st.markdown(f"[Verify in Sanity Studio ↗]({mr_url})")
                    st.rerun()
                except Exception as exc:
                    st.error(str(exc))

    comparison = _mr_read_json(doc_dir / "transcript_comparison.json", {})
    comps = comparison.get("comparisons", [])
    if comps:
        st.subheader("Summary comparison")
        comp_rows = []
        for c in comps:
            sim = c.get("similarity", 0)
            comp_rows.append({
                "Left": c.get("left", ""),
                "Right": c.get("right", ""),
                "Similarity": f"{sim:.2%}",
                "Char Δ": c.get("charDelta", ""),
                "Chunk Δ": c.get("chunkDelta", ""),
                "Assessment": "likely identical" if sim > 0.98 else
                              "minor formatting differences" if sim > 0.90 else
                              "moderate differences — review recommended" if sim > 0.70 else
                              "substantial differences",
            })
        st.dataframe(comp_rows, hide_index=True, width="stretch")

    st.subheader("Read a transcript version")
    primary_label = primary_label_current
    default_idx = labels.index(primary_label) if primary_label in labels else 0
    selected_label = st.selectbox("Version", labels, index=default_idx, key="mr_read_label")
    if selected_label:
        transcript_file = doc_dir / "transcripts" / f"{''.join(c if c.isalnum() or c in {'-','_'} else '_' for c in selected_label).strip('_')}.json"
        payload = _mr_read_json(transcript_file, {})
        chunks = payload.get("chunks") if isinstance(payload, dict) else None
        if chunks:
            show_ts = st.checkbox("Show timestamps", value=True, key="mr_show_ts")
            text = chunks_to_text(chunks, include_timestamps=show_ts)
            st.text_area("Transcript text", value=text, height=400, key="mr_text_area")
        else:
            chunk_file = doc_dir / "transcript_chunks.json"
            if chunk_file.exists() and selected_label == primary_label:
                chunks = _mr_read_json(chunk_file, [])
                show_ts = st.checkbox("Show timestamps", value=True, key="mr_show_ts_primary")
                text = chunks_to_text(chunks, include_timestamps=show_ts)
                st.text_area("Transcript text", value=text, height=400, key="mr_text_area_primary")
            else:
                st.warning("Transcript file not found for this version.")

    if len(labels) >= 2:
        st.subheader("Cue-level diff")
        col_l, col_r = st.columns(2)
        with col_l:
            left_label = st.selectbox("Left version", labels, index=0, key="mr_diff_left")
        with col_r:
            right_options = [l for l in labels if l != left_label]
            right_label = st.selectbox("Right version", right_options, key="mr_diff_right")

        if st.button("Run diff", key="mr_diff_btn"):
            left_chunks = _mr_load_chunks(doc_dir, left_label, primary_label)
            right_chunks = _mr_load_chunks(doc_dir, right_label, primary_label)
            if not left_chunks or not right_chunks:
                st.warning("Could not load chunks for one or both versions.")
            else:
                regions = diff_transcript_chunks(left_chunks, right_chunks, context_lines=1)
                changed = [r for r in regions if r["op"] != "equal"]
                equal_count = sum(r.get("collapsed", 0) for r in regions if r["op"] == "equal")
                st.caption(
                    f"{len(changed)} changed region(s)  ·  {equal_count} unchanged cue(s) collapsed"
                )
                _mr_render_diff(regions, left_label, right_label)

    st.divider()
    st.subheader("Attach a new SRT / VTT")
    srt_path2 = st.text_input("File path", key="mr_srt_path2")
    lang2 = st.text_input("Language code", key="mr_srt_lang2")
    make_primary2 = st.checkbox("Set as primary", value=False, key="mr_srt_primary2")
    if st.button("Attach", key="mr_srt_attach2"):
        if not srt_path2:
            st.error("Paste the file path above first.")
        else:
            from runner.pipeline.media_review import attach_srt_to_document
            try:
                result = attach_srt_to_document(
                    doc_id=doc_id, srt_path=srt_path2, config=config,
                    language=lang2, make_primary=make_primary2,
                )
                st.success(f"Attached: {result['label']} — {result['chunkCount']} chunks")
                st.rerun()
            except Exception as exc:
                st.error(str(exc))


def _mr_load_chunks(doc_dir: Path, label: str, primary_label: str) -> list:
    safe = "".join(c if c.isalnum() or c in {"-", "_"} else "_" for c in label).strip("_")
    transcript_file = doc_dir / "transcripts" / f"{safe}.json"
    payload = _mr_read_json(transcript_file, {})
    chunks = payload.get("chunks") if isinstance(payload, dict) else None
    if chunks:
        return chunks
    if label == primary_label:
        return _mr_read_json(doc_dir / "transcript_chunks.json", [])
    return []


def _mr_render_diff(regions: list, left_label: str, right_label: str):
    OP_COLORS = {
        "replace": ("#fff3cd", "#d1ecf1"),
        "delete":  ("#f8d7da", "#f8d7da"),
        "insert":  ("#d4edda", "#d4edda"),
        "equal":   ("transparent", "transparent"),
    }
    header = st.columns(2)
    header[0].markdown(f"**{left_label}** (left)")
    header[1].markdown(f"**{right_label}** (right)")

    for region in regions:
        op = region["op"]
        lc_bg, rc_bg = OP_COLORS.get(op, ("transparent", "transparent"))
        left_cues = region.get("leftCues", [])
        right_cues = region.get("rightCues", [])
        collapsed = region.get("collapsed", 0)

        col_l, col_r = st.columns(2)
        if op == "equal":
            label_text = "".join(
                f"`[{c.get('start','')}]` {c.get('text','')}\n" for c in left_cues
            )
            if collapsed:
                label_text += f"*… {collapsed} unchanged cue(s) …*"
            col_l.markdown(label_text or "—")
            col_r.markdown(label_text or "—")
        else:
            left_text = "\n\n".join(
                f"`[{c.get('start','')}]` {c.get('text','')}" for c in left_cues
            ) or "*(nothing)*"
            right_text = "\n\n".join(
                f"`[{c.get('start','')}]` {c.get('text','')}" for c in right_cues
            ) or "*(nothing)*"
            with col_l:
                st.markdown(
                    f'<div style="background:{lc_bg};padding:6px 8px;border-radius:4px;'
                    f'margin-bottom:4px">{left_text}</div>',
                    unsafe_allow_html=True,
                )
            with col_r:
                st.markdown(
                    f'<div style="background:{rc_bg};padding:6px 8px;border-radius:4px;'
                    f'margin-bottom:4px">{right_text}</div>',
                    unsafe_allow_html=True,
                )


def _mr_annotations(doc_id: str, doc_dir: Path, config):
    """Research annotation cards — structured view, not raw JSON."""
    from runner.pipeline.research_annotate import (
        list_local_annotations,
        available_profiles,
        annotate_document,
        recommended_profiles,
        update_annotation_review,
        export_annotations_markdown,
    )

    annotations = list_local_annotations(doc_id, config)
    analysis = _mr_read_json(doc_dir / "analysis.json", {})
    recommended = recommended_profiles(
        analysis.get("format", ""),
        analysis.get("type", ""),
    )
    existing_profiles = {a.get("profile") for a in annotations}
    recommendations = [
        {"profile": profile, "status": "already run" if profile in existing_profiles else "not run"}
        for profile in recommended
    ]

    _mr_annotation_process_guide()
    _mr_annotation_summary_table(annotations)

    if recommendations:
        st.subheader("Recommended Profiles For This Document")
        st.dataframe(
            [
                {
                    **row,
                    "purpose": _annotation_profile_purpose(row["profile"]),
                }
                for row in recommendations
            ],
            hide_index=True,
            width="stretch",
        )
    else:
        st.info("No extra research annotation profiles are recommended for this document type; enrichment may be enough.")

    if not annotations:
        st.info("No research annotations yet for this document.")
    else:
        for ann_meta in annotations:
            profile = ann_meta.get("profile", "")
            status = ann_meta.get("annotationStatus", "model_generated")
            visibility = ann_meta.get("publicVisibility", "private")
            generated = ann_meta.get("generatedAt", "")[:10]

            status_color = {
                "model_generated": "🟡",
                "researcher_reviewed": "🟢",
                "corrected": "🟢",
                "rejected": "🔴",
            }.get(status, "⚪")
            vis_badge = {"private": "🔒", "internal_research": "🔬"}.get(visibility, "👁")

            with st.expander(
                f"{status_color} {profile}  {vis_badge}  ·  {status}  ·  {generated}",
                expanded=True,
            ):
                path = Path(ann_meta.get("path", ""))
                if not path.exists():
                    st.warning("Annotation file not found.")
                    continue
                try:
                    data = json.loads(path.read_text(encoding="utf-8"))
                except Exception:
                    st.error("Could not parse annotation JSON.")
                    continue

                result = data.get("resultJson", {})
                model_name = data.get("modelName", "")
                resolved_model = data.get("resolvedModelName", "")
                model_provider = data.get("modelProvider", "")
                prompt_ver = data.get("promptVersion", "")
                input_hash = data.get("inputTextHash", "")[:12]

                c1, c2, c3 = st.columns(3)
                c1.metric("Source stance", result.get("sourceStance", "—"))
                model_line = f"`{model_name}`"
                if resolved_model and resolved_model != model_name:
                    model_line += f" → `{resolved_model}`"
                c2.markdown(f"**Model:** {model_line} ({model_provider})")
                c3.markdown(f"**Prompt:** `{prompt_ver}`  \n**Input hash:** `{input_hash}…`")

                if data.get("reviewerNotes"):
                    st.info(f"Researcher notes: {data['reviewerNotes']}")

                if data.get("profile") == "shame_article":
                    _render_shame_article_annotation(path, data, result)
                else:
                    _render_documentary_annotation(result, doc_id=doc_id, config=config, profile=profile)

                st.markdown("**Review decision**")
                review_cols = st.columns([1, 1, 2])
                with review_cols[0]:
                    next_status = st.selectbox(
                        "Status",
                        ["model_generated", "researcher_reviewed", "corrected", "rejected"],
                        index=["model_generated", "researcher_reviewed", "corrected", "rejected"].index(status)
                        if status in ["model_generated", "researcher_reviewed", "corrected", "rejected"] else 0,
                        key=f"review_status_{profile}_{path}",
                    )
                with review_cols[1]:
                    next_visibility = st.selectbox(
                        "Visibility",
                        ["private", "internal_research", "public_metadata_only", "public_table_candidate", "published"],
                        index=["private", "internal_research", "public_metadata_only", "public_table_candidate", "published"].index(visibility)
                        if visibility in ["private", "internal_research", "public_metadata_only", "public_table_candidate", "published"] else 0,
                        key=f"review_visibility_{profile}_{path}",
                    )
                with review_cols[2]:
                    next_notes = st.text_area(
                        "Reviewer notes",
                        value=data.get("reviewerNotes", ""),
                        key=f"review_notes_{profile}_{path}",
                    )
                push_sanity = st.checkbox(
                    "Also push this review decision to Sanity",
                    value=False,
                    key=f"review_push_sanity_{profile}_{path}",
                )
                if st.button("Save review decision", key=f"save_review_{profile}_{path}"):
                    try:
                        update_annotation_review(
                            doc_id=doc_id,
                            profile=profile,
                            config=config,
                            annotation_status=next_status,
                            reviewer_notes=next_notes,
                            public_visibility=next_visibility,
                            write_sanity=push_sanity,
                        )
                        sanity_msg = " Sanity `researchAnnotations` field patched." if push_sanity else (
                            " Local only — tick 'Also push to Sanity' and save again to push."
                        )
                        st.success(
                            f"Review decision saved to `research_annotations/{profile}.json`. "
                            f"Status: {next_status} · Visibility: {next_visibility}.{sanity_msg}"
                        )
                        if push_sanity:
                            doc_url = _sanity_studio_url(config, doc_id)
                            if doc_url:
                                st.markdown(f"[Verify in Sanity Studio ↗]({doc_url})")
                        st.rerun()
                    except Exception as exc:
                        st.error(str(exc))

                with st.expander("Raw result JSON"):
                    st.json(result)

    st.divider()
    st.subheader("Run a new research annotation")
    all_profiles = list(available_profiles())
    profile_choice = st.selectbox("Profile", all_profiles, key="mr_ann_profile")
    llm_choice = st.selectbox(
        "Model", ["litelm", "litelm-heavy", "litelm-reasoning", "claude", "local"],
        key="mr_ann_llm",
    )
    save_local_only = st.checkbox("Save locally only (don't push to Sanity)", value=True, key="mr_ann_local")
    overwrite = st.checkbox("Overwrite if model-generated annotation exists", value=False, key="mr_ann_overwrite")

    if profile_choice in existing_profiles:
        st.warning(f"An annotation for `{profile_choice}` already exists. Enable Overwrite to replace it.")

    if st.button("Run annotation", key="mr_ann_run"):
        with st.spinner(f"Running {profile_choice} annotation…"):
            try:
                result = annotate_document(
                    doc_id=doc_id,
                    profile=profile_choice,
                    config=config,
                    llm=llm_choice,
                    save_local_only=save_local_only,
                    overwrite=overwrite,
                )
                st.success(
                    f"Saved to `research_annotations/{profile_choice}.json`. "
                    f"Stance: {result.source_stance}  ·  Status: {result.annotation_status}. "
                    + ("Local only — push via 'Save review decision' when ready." if save_local_only else "Pushed to Sanity.")
                )
                st.rerun()
            except Exception as exc:
                st.error(str(exc))

    st.divider()
    st.subheader("Export annotation profile")
    export_cols = st.columns([1, 1, 2])
    with export_cols[0]:
        export_profile = st.selectbox("Export profile", all_profiles, key="mr_export_profile")
    with export_cols[1]:
        export_format = st.text_input("Format filter", value="", key="mr_export_format", placeholder="optional")
    with export_cols[2]:
        export_type = st.text_input("Type filter", value="", key="mr_export_type", placeholder="optional")
    if st.button("Export Markdown for NotebookLM / reading", key="mr_export_btn"):
        try:
            path = export_annotations_markdown(
                profile=export_profile,
                config=config,
                filter_format=export_format,
                filter_type=export_type,
            )
            st.success(f"Exported: {path}")
        except Exception as exc:
            st.error(str(exc))


def _mr_annotation_process_guide():
    with st.expander("How annotation review works", expanded=True):
        st.markdown(
            """
Research annotations are an optional layer on top of the existing `sogiceDocument`.
They do not replace intake, preprocessing, main analysis, embeddings, enrichment, or upload.

Review states:

- `model_generated`: created by a model and private by default; read before relying on it.
- `researcher_reviewed`: you checked the source/transcript and consider the annotation usable.
- `corrected`: you made or recorded substantive corrections in reviewer notes.
- `rejected`: keep the file for provenance, but do not use it analytically.

Visibility:

- `private`: local/internal only.
- `internal_research`: usable for your research workspace but not public.
- `public_metadata_only`: safe to expose as metadata, not as full analysis.
- `public_table_candidate`: candidate for later website/table inclusion.
- `published`: final public-facing state after separate review.
"""
        )
        st.dataframe(
            [
                {"Layer": "Main analysis", "File": "analysis.json", "Where it goes": "sogiceDocument fields in Sanity", "Human action": "Review/edit before upload."},
                {"Layer": "Enrichment proposals", "File": "enrichment.json", "Where it goes": "Lexicon/entity/tactic/practice Sanity records after approval", "Human action": "Approve in Lexicon/Pending Upload, then push enrichment."},
                {"Layer": "Research annotations", "File": "research_annotations/<profile>.json", "Where it goes": "researchAnnotation documents only if pushed", "Human action": "Mark reviewed/corrected/rejected; keep private by default."},
                {"Layer": "Suggested search terms", "File": "resultJson.searchTerms", "Where it goes": "Related-source search/research notes, not the lexicon", "Human action": "Use for discovery; do not treat as controlled vocabulary."},
                {"Layer": "Candidate lexicon terms", "File": "analysis.json / enrichment.json", "Where it goes": "lexiconEntry after researcher approval", "Human action": "Approve/push, then verify in Sanity."},
            ],
            hide_index=True,
            width="stretch",
        )
    with st.expander("Which annotations should be run for each document type?", expanded=True):
        st.dataframe(_annotation_selection_rows(), hide_index=True, width="stretch")
        st.caption(
            "`archive_core` is always the metadata baseline. The rows above describe optional deeper annotation profiles."
        )


def _annotation_selection_rows() -> list[dict]:
    return [
        {
            "Document format": "YouTube video / social video",
            "Profiles to run": "documentary_analysis + shame_article",
            "Notes": "Run both: documentary_analysis captures structure; shame_article captures the theoretical argument.",
        },
        {
            "Document format": "Full documentary (long video, SRT provided)",
            "Profiles to run": "documentary_analysis + shame_article + testimony_analysis",
            "Notes": "Add testimony_analysis only if personal witness segments are central.",
        },
        {
            "Document format": "Podcast episode",
            "Profiles to run": "podcast_analysis + shame_article",
            "Notes": "podcast_analysis replaces documentary_analysis for audio-first material.",
        },
        {
            "Document format": "Testimony / personal account",
            "Profiles to run": "testimony_analysis only",
            "Notes": "Privacy-first profile. Do not run documentary_analysis on personal testimonies.",
        },
        {
            "Document format": "Organisational website / article",
            "Profiles to run": "shame_article + anti_gender_network",
            "Notes": "Network mapping matters more than visual structure.",
        },
        {
            "Document format": "Legislative / legal document",
            "Profiles to run": "None of the above; enrichment only",
            "Notes": "These usually do not benefit from rhetorical/media profiles.",
        },
        {
            "Document format": "Mixed / unclear",
            "Profiles to run": "shame_article baseline, then add others after reading",
            "Notes": "shame_article is the most format-agnostic analytical profile.",
        },
    ]


def _mr_annotation_summary_table(annotations: list[dict]):
    if not annotations:
        return
    rows = []
    for ann_meta in annotations:
        path = Path(ann_meta.get("path", ""))
        data = _mr_read_json(path, {}) if path.exists() else {}
        result = data.get("resultJson", {}) if isinstance(data, dict) else {}
        rows.append(
            {
                "Profile": data.get("profile") or ann_meta.get("profile", ""),
                "Status": data.get("annotationStatus") or ann_meta.get("annotationStatus", ""),
                "Visibility": data.get("publicVisibility") or ann_meta.get("publicVisibility", ""),
                "Stance": data.get("sourceStance") or result.get("sourceStance", ""),
                "Generated": str(data.get("generatedAt") or ann_meta.get("generatedAt", ""))[:19],
                "Reviewed": str(data.get("reviewedAt") or "")[:19],
                "Model": _model_display(data),
                "Input hash": str(data.get("inputTextHash") or "")[:12],
            }
        )
    st.subheader("Annotations Table")
    st.dataframe(rows, hide_index=True, width="stretch")


def _model_display(data: dict) -> str:
    if not data:
        return ""
    model = data.get("modelName", "")
    resolved = data.get("resolvedModelName", "")
    if resolved and resolved != model:
        return f"{model} -> {resolved}"
    return model


def _as_display_list(value) -> list:
    if value is None or value == "":
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return [value]


def _embedding_payload_status(data: dict) -> dict:
    if not isinstance(data, dict):
        return {"ok": False, "model": "", "dimension": 0, "detail": "invalid embedding.json"}
    vector = data.get("vector")
    if vector is None:
        vector = data.get("embedding")
    vector = vector or []
    dim = int(data.get("dimension") or len(vector) or 0)
    model = data.get("model") or data.get("embedding_model") or ""
    ok = bool(vector) and dim > 0
    detail = f"{model or 'unknown model'}, {dim}d" if ok else "empty vector"
    return {"ok": ok, "model": model, "dimension": dim, "detail": detail}


def _annotation_profile_purpose(profile: str) -> str:
    return {
        "documentary_analysis": "Narrative structure, visual/rhetorical form, screenshot moments.",
        "shame_article": "Shame mechanics, rhetorical arguments, terminology, article relevance.",
        "podcast_analysis": "Audio-first structure, host/guest dynamics, spoken rhetoric.",
        "testimony_analysis": "Privacy-first reading of personal witness/testimony.",
        "anti_gender_network": "Actor/network positioning and movement infrastructure.",
        "search_discovery": "Discovery phrases and related-source search preparation.",
        "public_website_table": "Data-preparation view for future public table, not publication itself.",
        "visual_network": "Visual actor/network cues where media evidence supports it.",
    }.get(profile, "")


def _annotation_quote_fields(item) -> tuple[str, str, str]:
    """Return timestamp, quote, significance for loose annotation quote shapes."""
    if isinstance(item, dict):
        ts = item.get("timestamp") or item.get("pageOrTimestamp") or ""
        quote = item.get("quote") or item.get("text") or ""
        sig = item.get("significance") or ""
        return str(ts), str(quote), str(sig)
    return "", str(item), ""


def _render_documentary_annotation(result: dict, doc_id: str = "", config=None, profile: str = "documentary_analysis"):
    narrative = result.get("narrativeStructure") or result.get("narrative") or ""
    if narrative:
        st.markdown("**Narrative structure**")
        st.write(narrative)

    opening = result.get("openingFraming") or ""
    if opening:
        st.markdown("**Opening framing**")
        st.write(opening)

    emotional_arc = result.get("emotionalArc") or ""
    if emotional_arc:
        st.markdown("**Emotional arc**")
        st.write(emotional_arc)

    before_after = result.get("beforeAfterTransformationLogic") or ""
    if before_after:
        st.markdown("**Before/after transformation logic**")
        st.write(before_after)

    visual = result.get("visualRhetoric") or ""
    if visual:
        st.markdown("**Visual rhetoric** *(transcript-only — unverified)*")
        st.caption(visual)

    quotable = result.get("quotablePassages") or []
    if quotable:
        st.markdown("**Quotable passages**")
        for q in quotable:
            ts, quote, sig = _annotation_quote_fields(q)
            if not quote:
                continue
            ts_str = f"`{ts}`  " if ts else ""
            st.markdown(f"{ts_str}> {quote}")
            if sig:
                st.caption(sig)

    screenshots = _as_display_list(result.get("sceneScreenshotSuggestions"))
    if screenshots:
        st.markdown("**Screenshot suggestions**")
        for s in screenshots:
            st.markdown(f"- {s}")
        if doc_id and config:
            with st.expander("Capture suggested screenshots"):
                video_path = st.text_input(
                    "Local video path",
                    key=f"screenshot_video_path_{doc_id}",
                    placeholder="/path/to/video.mp4",
                )
                out_dir = st.text_input(
                    "Output directory",
                    key=f"screenshot_output_dir_{doc_id}",
                    placeholder="leave blank for corpus/<doc_id>/screenshots/documentary_analysis",
                )
                cols = st.columns(3)
                with cols[0]:
                    limit = st.number_input("Limit", min_value=1, max_value=100, value=20, key=f"screenshot_limit_{doc_id}")
                with cols[1]:
                    dry_run = st.checkbox("Dry run", value=True, key=f"screenshot_dry_{doc_id}")
                with cols[2]:
                    run_capture = st.button("Capture", key=f"screenshot_capture_{doc_id}")
                if run_capture:
                    try:
                        from runner.pipeline.screenshots import capture_screenshots

                        payload = capture_screenshots(
                            doc_id=doc_id,
                            config=config,
                            profile=profile,
                            video_path=video_path,
                            output_dir=out_dir,
                            limit=int(limit),
                            dry_run=dry_run,
                        )
                        if dry_run:
                            st.info(f"Planned {payload['timestampCount']} screenshot(s).")
                        else:
                            st.success(f"Captured {payload['timestampCount']} screenshot(s) to {payload['outputDir']}.")
                        st.dataframe(payload["screenshots"], hide_index=True, width="stretch")
                    except Exception as exc:
                        st.error(str(exc))

    actors = result.get("networkRelevantActors") or []
    if actors:
        st.markdown("**Actors / network**")
        actor_rows = [
            {"Name": a.get("name", ""), "Role": a.get("role", "")}
            for a in actors if isinstance(a, dict)
        ]
        st.dataframe(actor_rows, hide_index=True, width="stretch")

    search_terms = _as_display_list(result.get("searchTerms"))
    if search_terms:
        st.markdown("**Suggested search terms**")
        st.write("  ·  ".join(str(term) for term in search_terms))

    uncertainty = _as_display_list(result.get("uncertaintyNotes"))
    if uncertainty:
        with st.expander("Uncertainty notes"):
            for u in uncertainty:
                st.markdown(f"- {u}")


def _render_shame_article_annotation(path: Path, data: dict, result: dict):
    st.markdown("**Shame phases**")
    phase = result.get("shamePhase") or {}
    evidence = phase.get("phaseEvidence") or {}
    phase_cols = st.columns(3)
    for col, label, key, quote_key in zip(
        phase_cols,
        ["Precondition", "Method", "Residue"],
        ["precondition", "method", "residue"],
        ["preconditionQuote", "methodQuote", "residueQuote"],
    ):
        present = bool(phase.get(key))
        col.markdown(f"**{label}**  {'✓ present' if present else '— absent'}")
        quote = evidence.get(quote_key, "")
        if quote:
            col.caption(f"“{quote}”")

    structural = bool(result.get("shameAsStructural"))
    st.markdown(f"**STRUCTURAL:** {'Yes' if structural else 'No'}")
    if result.get("shameAsStructuralReasoning"):
        st.caption(result["shameAsStructuralReasoning"])

    _pill_section("Identity frames", result.get("identityFrames") or [])

    strategies = result.get("rhetoricalStrategies") or []
    if strategies:
        st.markdown("**Rhetorical strategies**")
        for item in strategies:
            if isinstance(item, dict):
                st.markdown(f"- `{item.get('strategy', '')}`")
                if item.get("evidenceQuote"):
                    st.caption(f"“{item['evidenceQuote']}”")
            else:
                st.markdown(f"- `{item}`")

    _pill_section("Narrative inversions", result.get("narrativeInversions") or [])
    _pill_section("Dominant messaging", result.get("dominantMessaging") or result.get("messagingFrames") or [])

    arguments = [
        "psychological_distress_as_cause",
        "culture_media_contagion",
        "exgay_detrans_as_evidence",
        "spiritual_moral_framing",
        "no_gay_gene",
        "physical_health_consequences",
        "trauma_as_cause",
        "narcissistic_motives",
        "ability_to_choose",
        "association_with_paedophilia",
        "brain_body_mismatch",
    ]
    present_arguments = set(result.get("rhetoricalArguments") or [])
    evidence_map = result.get("rhetoricalArgumentEvidence") or {}
    st.markdown("**Rhetorical arguments**")
    st.warning(
        "These are arguments or claims made by the source. Presence means the source uses that argument; "
        "it does not verify the argument as true."
    )
    st.dataframe(
        [{"Argument": arg, "Present": "✓" if arg in present_arguments else "—"} for arg in arguments],
        hide_index=True,
        width="stretch",
    )
    if evidence_map:
        with st.expander("Argument evidence"):
            for arg in arguments:
                quote = evidence_map.get(arg)
                if quote:
                    st.markdown(f"**{arg}**")
                    st.caption(f"“{quote}”")

    t1, t2, t3 = st.columns(3)
    t1.markdown("**Shame vocabulary**")
    t1.write(", ".join(f"`{x}`" for x in result.get("shameVocabulary", [])) or "—")
    t2.markdown("**Identity terms**")
    t2.write(", ".join(f"`{x}`" for x in result.get("identityTerminology", [])) or "—")
    t3.markdown("**Conversion terms**")
    t3.write(", ".join(f"`{x}`" for x in result.get("conversionTerminology", [])) or "—")

    st.markdown("**Audience**")
    audience_pos = result.get("audiencePositioning") or ""
    st.markdown(f"`{audience_pos}`" if audience_pos else "*not assessed*")
    if result.get("targetAudience"):
        st.write(result["targetAudience"])

    st.markdown("**SOGICE connection**")
    st.markdown(f"Implies change necessary: {'✓' if result.get('impliesChangeNecessary') else '—'}")
    _pill_section("Conversion approach shown", result.get("conversionApproachShown") or [])

    st.markdown("**Article relevance**")
    themes = result.get("articleThemes") or []
    if themes:
        st.markdown("Themes: " + "  ·  ".join(f"`{theme}`" for theme in themes))
    quotable = result.get("quotablePassages") or []
    for q in quotable:
        ts, quote, sig = _annotation_quote_fields(q)
        if not quote:
            continue
        st.markdown(f"{'`' + ts + '` ' if ts else ''}> {quote}")
        if sig:
            st.caption(sig)

    notes_key = f"shame_notes_{path}"
    notes = st.text_area("Researcher notes", value=result.get("researcherNotes", ""), key=notes_key)
    st.caption(
        "Saved locally only. To push to Sanity, use the review decision block below "
        "and enable 'Also push this review decision to Sanity'."
    )
    if st.button("Save researcher notes", key=f"save_shame_notes_{path}"):
        result["researcherNotes"] = notes
        data["resultJson"] = result
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        st.success("Saved locally.")

    followups = result.get("researcherFollowupQuestions") or []
    if followups:
        st.markdown("**Researcher follow-up questions**")
        for q in followups:
            st.markdown(f"- {q}")

    if result.get("publicTableCandidate"):
        st.success("Candidate for public table")
    else:
        st.caption("Not yet public-ready")


def _pill_section(title: str, values: list):
    if not values:
        return
    st.markdown(f"**{title}**")
    st.markdown(" ".join(f"`{v}`" for v in values))


def _mr_comments(doc_id: str, doc_dir: Path, config):
    """Lower-trust comment evidence queue with risk-flag highlighting."""
    queue_path = doc_dir / "comment_evidence_queue.json"
    queue = _mr_read_json(queue_path, {})
    comments = queue.get("comments", [])

    col_info, col_action = st.columns([2, 1])
    with col_info:
        count = queue.get("commentCount", len(comments))
        review_status = queue.get("reviewStatus", "empty")
        analysis_status = queue.get("analysisStatus", "not_available")
        st.metric("Comments in queue", count)
        st.caption(
            f"Review status: **{review_status}**  ·  LLM analysis: **{analysis_status}**  \n"
            "Comments are lower-trust platform data — not source claims. Review before any analysis."
        )
    with col_action:
        max_c = st.number_input("Max comments", min_value=10, max_value=500, value=50, step=10, key="mr_max_comments")
        if st.button("Collect / refresh comments", key="mr_collect_btn"):
            from runner.pipeline.media_review import collect_comments_for_document
            with st.spinner("Collecting platform comments…"):
                try:
                    result = collect_comments_for_document(
                        doc_id=doc_id, config=config, max_comments=int(max_c)
                    )
                    platform_total = result.get("platformCommentCount")
                    st.success(
                        f"Collected {result['collectedCount']} comments"
                        + (f" (platform total: {platform_total})" if platform_total else "")
                    )
                    st.rerun()
                except Exception as exc:
                    st.error(str(exc))

    if not comments:
        st.info("No comments collected yet.")
        return

    st.divider()

    filter_flagged = st.checkbox("Show flagged only", key="mr_comments_flagged")
    shown = [c for c in comments if c.get("riskFlags")] if filter_flagged else comments

    st.caption(f"Showing {len(shown)} of {len(comments)} comments")
    for idx, c in enumerate(shown):
        flags = c.get("riskFlags", [])
        pinned = c.get("isPinned", False)
        favorited = c.get("isFavorited", False)
        likes = c.get("likeCount")
        author = c.get("author", "")
        text = c.get("text", "")
        trust = c.get("trustLevel", "lower_trust_platform_comment")

        badges = []
        if pinned:
            badges.append("📌 pinned")
        if favorited:
            badges.append("⭐ creator-favorited")
        if "self_harm_or_violence_language" in flags:
            badges.append("🔴 self-harm language")
        if "potential_harmful_language" in flags:
            badges.append("🔴 harmful language")
        if "possible_personal_testimony" in flags:
            badges.append("🟡 possible personal testimony")

        with st.expander(
            f"{'🔴 ' if flags else ''}{author[:40] or 'Anonymous'}  ·  "
            f"{f'{likes} likes  ·' if isinstance(likes, int) else ''} "
            f"{'  ·  '.join(badges) or trust}",
            expanded=bool(flags),
        ):
            st.write(text)
            st.caption(
                f"Trust level: {trust}  ·  Evidence use: {c.get('evidenceUse', '')}  ·  "
                f"Review status: {c.get('reviewStatus', '')}"
            )


def _mr_candidates(doc_id: str, doc_dir: Path, config):
    """Related-source candidates grouped by category."""
    st.caption(
        "Identifies mirrors, re-uploads, and related documents that may need separate ingestion — "
        "e.g. the same video on another platform, prior coverage of the same event, or "
        "a document this source cites. Candidates are not ingested automatically; "
        "review and queue them manually."
    )
    from runner.pipeline.related_search import run_related_source_search

    candidates_path = doc_dir / "candidate_sources.json"
    payload = _mr_read_json(candidates_path, {})
    seeds_path = doc_dir / "discovery_seed_queue.json"
    seeds = _mr_read_json(seeds_path, [])

    col_seeds, col_run = st.columns([2, 1])
    with col_seeds:
        seed_count = len(seeds) if isinstance(seeds, list) else 0
        candidate_count = payload.get("candidateCount", 0)
        error_count = payload.get("errorCount", 0)
        st.metric("Discovery seeds", seed_count)
        st.metric("Candidates found", candidate_count)
        if error_count:
            st.warning(f"{error_count} search error(s) — check candidate_sources.json")
        generated = payload.get("generatedAt", "")[:10]
        if generated:
            st.caption(f"Last search: {generated}")
    with col_run:
        max_q = st.number_input("Max queries", min_value=1, max_value=20, value=5, key="mr_max_q")
        dry_run = st.checkbox("Dry run (don't save)", value=False, key="mr_dry_run")
        if st.button("Run search", key="mr_search_btn"):
            with st.spinner("Searching…"):
                try:
                    result = run_related_source_search(
                        doc_id=doc_id, config=config,
                        max_queries=int(max_q), dry_run=dry_run,
                    )
                    st.success(
                        f"Found {result['candidateCount']} candidates from {len(result['seedsUsed'])} queries"
                    )
                    st.rerun()
                except Exception as exc:
                    st.error(str(exc))

    if seeds and isinstance(seeds, list):
        with st.expander(f"Discovery seeds ({seed_count})"):
            seed_rows = [
                {
                    "Type": s.get("seedType", ""),
                    "Query": s.get("query", ""),
                    "Reason": s.get("reason", ""),
                    "Status": s.get("reviewStatus", ""),
                }
                for s in seeds if isinstance(s, dict)
            ]
            st.dataframe(seed_rows, hide_index=True, width="stretch")

    candidates = payload.get("candidates", [])
    if not candidates:
        if payload:
            st.info("Search completed but found no candidates.")
        else:
            st.info("No search results yet. Run the search above.")
        return

    st.divider()
    by_category: dict[str, list] = {}
    for c in candidates:
        cat = c.get("candidateCategory", "related_context_candidate")
        by_category.setdefault(cat, []).append(c)

    CATEGORY_LABELS = {
        "possible_mirror_or_reupload": "Possible mirrors / reuploads",
        "same_creator_or_channel_candidate": "Same creator / channel",
        "same_title_candidate": "Same title, different platform",
        "tag_or_hashtag_related": "Tag / hashtag related",
        "query_title_match": "Title match",
        "related_context_candidate": "Related context",
    }

    for cat, items in sorted(by_category.items(), key=lambda x: list(CATEGORY_LABELS).index(x[0]) if x[0] in CATEGORY_LABELS else 99):
        label = CATEGORY_LABELS.get(cat, cat)
        st.subheader(f"{label} ({len(items)})")
        for item in sorted(items, key=lambda x: -float(x.get("score", 0))):
            in_corpus = item.get("alreadyInCorpus", False)
            existing_ids = item.get("existingDocIds", [])
            platform = item.get("platform", "other")
            score = item.get("score", 0)
            url = item.get("url", "")
            title = item.get("title", url[:80])

            corpus_badge = f"✅ in corpus: {', '.join(existing_ids)}" if in_corpus else "⬜ not in corpus"
            with st.expander(f"[{platform}] {title[:80]}  ·  score {score:.1f}  ·  {corpus_badge}"):
                st.write(f"**URL:** {url}")
                snippet = item.get("snippet", "")
                if snippet:
                    st.caption(snippet)
                st.caption(
                    f"Seed: {item.get('seedType','')} — {item.get('seedReason','')}  ·  "
                    f"Review: {item.get('reviewStatus','')}  ·  "
                    f"Auto-ingest allowed: {item.get('autonomousIngestAllowed', False)}"
                )
                if not in_corpus:
                    ingest_cmd = f"python -m runner ingest \"{url}\""
                    st.code(ingest_cmd, language="bash")


# ---------------------------------------------------------------------------
# Source Queue page
# ---------------------------------------------------------------------------

def _source_queue_url_host(url: str) -> str:
    try:
        from urllib.parse import urlparse
        return (urlparse(url).hostname or "").lower().removeprefix("www.")
    except Exception:
        return ""


def _source_queue_is_videoish_url(url: str, source_type: str = "") -> bool:
    host = _source_queue_url_host(url)
    path = ""
    try:
        from urllib.parse import urlparse
        path = (urlparse(url).path or "").lower()
    except Exception:
        pass
    video_hosts = (
        "youtube.com", "youtu.be", "vimeo.com", "rumble.com", "odysee.com",
        "bitchute.com", "dailymotion.com", "facebook.com", "fb.watch",
    )
    return (
        source_type == "video"
        or host in video_hosts
        or any(host.endswith(f".{h}") for h in video_hosts)
        or "/watch" in path
        or "/video/" in path
    )


def _source_queue_hold_category(url: str, routing_reason: str = "", source_type: str = "") -> str:
    reason = (routing_reason or "").lower()
    if _source_queue_is_videoish_url(url, source_type):
        return "video_needs_transcript"
    if "cf-mitigated:challenge" in reason or "cloudflare_http" in reason:
        return "cloudflare"
    if "blocker_text" in reason:
        return "blocked_page"
    if "certificate_verify_failed" in reason or "certificate verify failed" in reason or "[ssl:" in reason:
        return "ssl"
    if "wayback" in reason and ("unavailable" in reason or "failed" in reason):
        return "wayback_unavailable"
    if "status 403" in reason or "access denied" in reason:
        return "http_blocked"
    if "timed out" in reason or "timeout" in reason:
        return "timeout"
    if reason.startswith("triage failed:"):
        return "triage_failed"
    return ""


def _source_queue_hold_label(category: str) -> str:
    return {
        "video_needs_transcript": "Media/video held: transcript or media metadata needed",
        "cloudflare": "Held: Cloudflare/security challenge",
        "blocked_page": "Held: blocker/login/challenge page detected",
        "ssl": "Held: SSL/certificate fetch problem",
        "wayback_unavailable": "Held: no usable Wayback fallback found",
        "http_blocked": "Held: HTTP blocked/forbidden",
        "timeout": "Held: fetch timed out",
        "triage_failed": "Held: triage failed closed",
    }.get(category, "Held for researcher review")


def _source_queue_hold_next_step(category: str) -> str:
    return {
        "video_needs_transcript": (
            "Use Media Review or attach a saved transcript/snapshot before unattended ingest."
        ),
        "cloudflare": (
            "Do not retry blindly. Open in a browser, save a rendered HTML/PDF snapshot, "
            "then export it through Source Offload as a queue snapshot."
        ),
        "blocked_page": (
            "Open in a browser and confirm whether this is a login/challenge shell or a real page. "
            "If real content is visible, save a snapshot and attach it to the queue item."
        ),
        "ssl": (
            "Retry after confirming the venv CA bundle. If it still fails, use a saved browser snapshot "
            "or Wayback/source file."
        ),
        "wayback_unavailable": (
            "Try a browser snapshot, PDF, or an alternate archived URL. The automatic archive search found no usable capture."
        ),
        "http_blocked": (
            "Use a browser-saved snapshot or another public representation; the server refused automated fetch."
        ),
        "timeout": (
            "Retry once later; if it repeats, use a saved snapshot or alternate source."
        ),
        "triage_failed": (
            "Retry triage after reviewing the reason, or add a researcher note/snapshot for more context."
        ),
    }.get(category, "Review this source manually before marking it ready.")


def _source_queue_hold_category_from_history(row: dict) -> str:
    note = str(row.get("acquisition_note") or "")
    reason = str(row.get("routing_reason") or "")
    return _source_queue_hold_category("", f"{note}; {reason}", str(row.get("source_type") or ""))


def _source_queue_triage_command(
    *,
    limit: int,
    batch: str = "",
    force: bool = False,
    use_crawl4ai: bool = False,
    item_ids: list[str] | None = None,
) -> str:
    command = [sys.executable, "-m", "runner", "queue-triage"]
    clean_item_ids = [str(item_id).strip() for item_id in (item_ids or []) if str(item_id).strip()]
    if clean_item_ids:
        for item_id in clean_item_ids:
            command.extend(["--item-id", item_id])
    else:
        command.extend(["--limit", str(max(1, int(limit)))])
    if batch and batch != "(all)":
        command.extend(["--batch", batch])
    if force:
        command.append("--force")
    if use_crawl4ai:
        command.append("--use-crawl4ai")
    return shlex.join(command)


def _source_queue_triage_command_args(
    *,
    limit: int,
    batch: str = "",
    force: bool = False,
    use_crawl4ai: bool = False,
    item_ids: list[str] | None = None,
) -> list[str]:
    return shlex.split(
        _source_queue_triage_command(
            limit=limit,
            batch=batch,
            force=force,
            use_crawl4ai=use_crawl4ai,
            item_ids=item_ids,
        )
    )


_SOURCE_QUEUE_RETRIAGE_STATUSES: frozenset[str] = frozenset({"new", "triaged", "ready_to_ingest"})


def _source_queue_retriage_candidate_ids(
    items,
    group: str,
    *,
    limit: int = 50,
) -> list[str]:
    """Return queue ids for intentional visible-row re-triage groups."""
    clean_limit = max(1, int(limit))
    result: list[str] = []
    for item in items:
        status = getattr(item, "status", "")
        if status not in _SOURCE_QUEUE_RETRIAGE_STATUSES:
            continue
        priority = getattr(item, "priority", "")
        routing_reason = str(getattr(item, "routing_reason", "") or "").strip()
        safe = bool(getattr(item, "overnight_batch_safe", False))
        if group == "visible":
            include = True
        elif group == "low":
            include = priority == "low" and status in {"triaged", "ready_to_ingest"}
        elif group == "medium":
            include = priority == "medium" and status in {"triaged", "ready_to_ingest"}
        elif group == "held":
            include = status == "triaged" and not safe and bool(routing_reason)
        else:
            include = False
        if include:
            result.append(str(item.id))
        if len(result) >= clean_limit:
            break
    return result


def _source_queue_new_candidate_ids(items, *, limit: int = 50) -> list[str]:
    """Return queue ids for new/untriaged rows in display order."""
    clean_limit = max(1, int(limit))
    result: list[str] = []
    for item in items:
        if getattr(item, "status", "") != "new":
            continue
        result.append(str(item.id))
        if len(result) >= clean_limit:
            break
    return result


def _source_queue_triage_comparison_rows(history_map: dict[str, list[dict]]) -> list[dict]:
    """Build newest-vs-previous triage rows for model-change review."""
    rows: list[dict] = []
    for item_id, history in history_map.items():
        if len(history) < 2:
            continue
        newest = history[0]
        previous = history[1]
        rows.append({
            "item": item_id,
            "new_when": str(newest.get("triaged_at", ""))[:19],
            "new_model": newest.get("model_name", ""),
            "new_priority": newest.get("priority", ""),
            "new_safe": bool(newest.get("overnight_batch_safe")),
            "new_type": newest.get("doc_type_hint", ""),
            "previous_when": str(previous.get("triaged_at", ""))[:19],
            "previous_model": previous.get("model_name", ""),
            "previous_priority": previous.get("priority", ""),
            "previous_safe": bool(previous.get("overnight_batch_safe")),
            "previous_type": previous.get("doc_type_hint", ""),
            "changed": (
                newest.get("model_name") != previous.get("model_name")
                or newest.get("priority") != previous.get("priority")
                or bool(newest.get("overnight_batch_safe")) != bool(previous.get("overnight_batch_safe"))
                or newest.get("doc_type_hint") != previous.get("doc_type_hint")
            ),
        })
    return rows


def _model_route_rows(config) -> list[dict[str, str]]:
    """Display the model routing contract used by Streamlit/CLI/worker paths."""
    return [
        {
            "process": "Triage",
            "route": "queue-triage / Source Queue triage",
            "LiteLLM alias": "triage",
            "expected Ollama model": getattr(config, "litelm_ollama_triage_model", "gemma4:12b-mlx"),
            "notes": "Configured in LiteLLM YAML; stored in history as litelm/triage.",
        },
        {
            "process": "Analysis",
            "route": "litelm",
            "LiteLLM alias": getattr(config, "litelm_analysis_model", "core-qwen"),
            "expected Ollama model": getattr(config, "litelm_ollama_analysis_model", "qwen3.6:35b-mlx"),
            "notes": "Default ingest/source-worker analysis route.",
        },
        {
            "process": "Analysis / longform heavy",
            "route": "litelm-heavy",
            "LiteLLM alias": getattr(config, "litelm_analysis_model_heavy", "core-gemma"),
            "expected Ollama model": getattr(config, "litelm_ollama_analysis_model_heavy", "gemma4:31b-mlx"),
            "notes": "Books, long reports, and intentionally heavy analysis.",
        },
        {
            "process": "Second opinion / reasoning",
            "route": "litelm-reasoning",
            "LiteLLM alias": getattr(config, "litelm_analysis_model_reasoning", "review-qwen"),
            "expected Ollama model": getattr(config, "litelm_ollama_analysis_model_reasoning", "qwen3.6:27b-mlx"),
            "notes": "Ambiguous or evidence-weighing passes.",
        },
        {
            "process": "Enrichment",
            "route": "--enrich-model",
            "LiteLLM alias": getattr(config, "litelm_enrichment_model", "lexicon-llm"),
            "expected Ollama model": getattr(config, "litelm_ollama_analysis_model_heavy", "gemma4:31b-mlx"),
            "notes": "Lexicon/entity/tactic/practice extraction. Usually lexicon-llm -> Gemma heavy.",
        },
        {
            "process": "Alternate enrichment",
            "route": "--enrich-model",
            "LiteLLM alias": getattr(config, "litelm_enrichment_model_alt", "core-gemma"),
            "expected Ollama model": getattr(config, "litelm_ollama_analysis_model_heavy", "gemma4:31b-mlx"),
            "notes": "Second-opinion enrichment fallback.",
        },
        {
            "process": "Embedding",
            "route": "litelm embedding",
            "LiteLLM alias": getattr(config, "litelm_embedding_model", "research-embedding"),
            "expected Ollama model": getattr(config, "litelm_ollama_embedding_model", "qwen3-embedding:8b"),
            "notes": "Used by ingest/source-worker and embedding repair.",
        },
    ]


def _model_runtime_preflight_rows(config) -> list[dict[str, str]]:
    """Return local, no-network model runtime safety checks for Streamlit pages.

    LiteLLM can be reachable while the underlying Ollama unload path is not. In
    that state the app may successfully call analysis/enrichment/embedding but
    leave several large models resident in memory. This helper is intentionally
    local/static so Source Queue rendering never hangs on network probes.
    """
    litelm_url = str(getattr(config, "litelm_base_url", "") or "").strip()
    model_control_url = str(getattr(config, "mac_studio_model_control_url", "") or "").strip()
    direct_ollama_url = str(getattr(config, "litelm_ollama_base_url", "") or "").strip()
    has_model_control = bool(model_control_url) and "<" not in model_control_url
    has_direct_ollama = bool(direct_ollama_url) and "<" not in direct_ollama_url
    unload_path = (
        "model-control"
        if has_model_control
        else "direct Ollama"
        if has_direct_ollama
        else "missing"
    )
    unload_status = (
        "configured"
        if (has_model_control or has_direct_ollama)
        else "not configured"
    )
    unload_detail = (
        model_control_url
        if has_model_control
        else direct_ollama_url
        if has_direct_ollama
        else "Set MAC_STUDIO_MODEL_CONTROL_URL, or LITELM_OLLAMA_BASE_URL / MAC_STUDIO_OLLAMA_URL."
    )
    app_job_lock = _read_app_job_lock()
    triage_lock = _read_source_queue_triage_lock()
    return [
        {
            "check": "LiteLLM inference endpoint",
            "status": "configured" if litelm_url else "not configured",
            "value": litelm_url or "Set LITELM_BASE_URL.",
            "why it matters": "Needed for triage, analysis, enrichment, longform, and embedding routes that use litelm*.",
        },
        {
            "check": "Model unload path",
            "status": unload_status,
            "value": f"{unload_path}: {unload_detail}",
            "why it matters": "Needed to evict Qwen/Gemma/embedding models between stages and avoid swap pressure.",
        },
        {
            "check": "Current heavy-job lock",
            "status": "active" if app_job_lock else "clear",
            "value": _format_app_job_lock(app_job_lock) if app_job_lock else "No longform/media/heavy app job lock.",
            "why it matters": "Prevents starting another large local/remote model job while one is already running.",
        },
        {
            "check": "Source Queue triage lock",
            "status": "active" if triage_lock else "clear",
            "value": _format_app_job_lock(triage_lock) if triage_lock else "No background queue triage job lock.",
            "why it matters": "Prevents invisible duplicate triage runs.",
        },
    ]


def _model_runtime_unload_configured(config) -> bool:
    model_control_url = str(getattr(config, "mac_studio_model_control_url", "") or "").strip()
    direct_ollama_url = str(getattr(config, "litelm_ollama_base_url", "") or "").strip()
    return (
        (bool(model_control_url) and "<" not in model_control_url)
        or (bool(direct_ollama_url) and "<" not in direct_ollama_url)
    )


def _render_model_runtime_preflight(config, *, expanded: bool = False) -> None:
    rows = _model_runtime_preflight_rows(config)
    unload_ok = _model_runtime_unload_configured(config)
    with st.expander("Model runtime / unload preflight", expanded=expanded or not unload_ok):
        st.caption(
            "This is a local configuration check. It does not ping the Mac Studio, "
            "so Source Queue stays responsive. Use Mac Studio Node → Doctor for live network tests."
        )
        st.dataframe(rows, hide_index=True, width="stretch")
        if not unload_ok:
            st.warning(
                "LiteLLM may still run, but no unload path is configured. Heavy routes can leave "
                "multiple Ollama models resident and cause swap. Prefer Mac Studio Worker/offload, "
                "or configure `MAC_STUDIO_MODEL_CONTROL_URL` before long local Streamlit jobs."
            )


def _ensure_durable_triage_worker(config, *, item_count: int = 0, label: str = "source-queue-triage") -> dict:
    """Start the single durable worker, or return the active worker record."""
    from runner.pipeline.triage_jobs import (
        acquire_worker_lock,
        active_lock,
        lock_is_held,
        release_worker_lock,
    )
    safe_label = re.sub(r"[^a-zA-Z0-9_.-]+", "-", label).strip("-") or "source-queue-triage"
    started = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    log_dir = _project_root / "exports" / "app_jobs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"{started}_{safe_label}.log"
    command = [sys.executable, "-m", "runner.main", "triage-jobs-run"]
    rendered_command = shlex.join(command)
    worker_lock_path = log_dir / "source_queue_triage_worker.lock"
    launch_lock_path = log_dir / "source_queue_triage_launcher.lock"
    launch_fd = acquire_worker_lock(launch_lock_path)
    try:
        worker_held = lock_is_held(worker_lock_path)
        worker = active_lock(worker_lock_path) if worker_held else None
        if worker_held:
            worker = worker or {}
            active_triage = _read_source_queue_triage_lock() or {
                "pid": worker.get("pid"), "kind": "source-queue-triage",
                "started_at": worker.get("started_at", ""), "log_path": "",
                "command": rendered_command, "item_count": item_count,
                "label": safe_label,
            }
            return active_triage
        with log_path.open("w", encoding="utf-8") as log_file:
            log_file.write(f"$ {rendered_command}\n\n")
            log_file.flush()
            proc = subprocess.Popen(
                command,
                cwd=_project_root,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                text=True,
                start_new_session=True,
            )
            # Keep the launcher flock until the child either owns the durable
            # worker flock or exits. This closes the Popen→worker-lock window.
            worker_ready = False
            for _ in range(500):
                if lock_is_held(worker_lock_path) or proc.poll() is not None:
                    worker_ready = True
                    break
                time.sleep(0.02)
            if not worker_ready:
                try:
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                finally:
                    raise RuntimeError("Durable triage worker did not acquire its lock within 10 seconds")
    finally:
        release_worker_lock(launch_lock_path, launch_fd)
    job = {
        "process": proc,
        "pid": proc.pid,
        "started_at": started,
        "log_path": str(log_path),
        "command": rendered_command,
        "kind": "source-queue-triage",
        "mode": "durable",
        "item_count": item_count,
        "label": safe_label,
    }
    _write_source_queue_triage_lock(job)
    return job


def _resume_durable_triage_worker(config) -> dict | None:
    """Resume queued/interrupted durable triage whenever Source Queue opens."""
    from runner.pipeline.triage_jobs import open_jobs_db, queue_counts, triage_jobs_db_path

    jobs_path = triage_jobs_db_path(config.corpus_dir)
    if not jobs_path.is_file():
        return None
    jobs_db = open_jobs_db(jobs_path)
    try:
        counts = queue_counts(jobs_db)
    finally:
        jobs_db.close()
    pending = sum(counts.get(status, 0) for status in ("queued", "running", "waiting"))
    if not pending:
        return None
    return _ensure_durable_triage_worker(config, item_count=pending, label="source-queue-triage-resume")


def _durable_triage_queue_state(config) -> dict:
    from runner.pipeline.triage_jobs import list_jobs, open_jobs_db, queue_counts, triage_jobs_db_path

    path = triage_jobs_db_path(config.corpus_dir)
    if not path.is_file():
        return {"counts": {}, "recent": []}
    db = open_jobs_db(path)
    try:
        return {"counts": queue_counts(db), "recent": list_jobs(db, limit=8)}
    finally:
        db.close()


def _cancel_running_durable_triage(*, include_queued: bool = False) -> int:
    from runner.pipeline.triage_jobs import cancel_active_jobs, open_jobs_db, triage_jobs_db_path

    config = _load_config_safe()
    if config is None:
        return 0
    db = open_jobs_db(triage_jobs_db_path(config.corpus_dir))
    try:
        return cancel_active_jobs(db, include_queued=include_queued)
    finally:
        db.close()


def _start_source_queue_triage_job(
    *,
    item_ids: list[str],
    limit: int,
    batch: str = "",
    force: bool = False,
    use_crawl4ai: bool = False,
    label: str = "source-queue-triage",
) -> dict:
    """Durably enqueue triage and ensure one resumable worker is active."""
    from runner.pipeline.triage_jobs import enqueue_triage_job, open_jobs_db, triage_jobs_db_path
    from runner.pipeline.triage_jobs import source_history_tokens
    from runner.pipeline.source_queue import queue_db_path

    clean_item_ids = [str(item_id).strip() for item_id in item_ids if str(item_id).strip()]
    if not clean_item_ids:
        raise RuntimeError("No queue item IDs selected for triage.")
    config = _load_config_safe()
    if config is None:
        raise RuntimeError("Configuration unavailable; triage request was not queued.")
    jobs_db = open_jobs_db(triage_jobs_db_path(config.corpus_dir))
    try:
        queued = enqueue_triage_job(
            jobs_db,
            clean_item_ids[:max(1, int(limit))],
            force=force,
            use_crawl4ai=use_crawl4ai,
            label=label,
            baseline_tokens=source_history_tokens(
                queue_db_path(config.corpus_dir), clean_item_ids[:max(1, int(limit))]
            ),
        )
    finally:
        jobs_db.close()
    if not queued["queued_ids"]:
        active_triage = _read_source_queue_triage_lock()
        if active_triage:
            return {**active_triage, "already_queued": len(queued["duplicate_ids"])}
        raise RuntimeError(f"{len(queued['duplicate_ids'])} selected item(s) are already queued for triage.")
    job = _ensure_durable_triage_worker(
        config, item_count=len(queued["queued_ids"]), label=label,
    )
    return {
        **job,
        "queued_job_id": queued["job_id"],
        "duplicate_item_count": len(queued["duplicate_ids"]),
    }


def _render_source_queue_triage_job(job_key: str) -> bool:
    job = st.session_state.get(job_key)
    recovered_from_lock = False
    if not job:
        job = _read_source_queue_triage_lock()
        if not job:
            return False
        recovered_from_lock = True
    proc = job.get("process")
    log_path = Path(job.get("log_path", ""))
    if proc is None:
        if not _pid_is_running(job.get("pid")):
            _clear_source_queue_triage_lock(job)
            st.session_state.pop(job_key, None)
            st.warning(
                "Recovered a stale Source Queue triage status. The recorded process is no longer running, "
                "so the triage lock was cleared."
            )
            tail = _job_log_tail(log_path, limit=6000)
            if tail:
                with st.expander("Last triage terminal log tail", expanded=True):
                    st.code(tail, language="text")
            return False
        returncode = None
        recovered_from_lock = True
    else:
        returncode = proc.poll()
    if returncode is None:
        if recovered_from_lock:
            st.warning(
                f"Source Queue triage appears to be running from a recovered lock "
                f"(PID {job.get('pid')}, {job.get('item_count', '?')} item(s)). "
                "This usually means Streamlit refreshed while the background process kept running."
            )
        else:
            st.info(
                f"Source Queue triage is running in the background "
                f"(PID {job.get('pid')}, {job.get('item_count', '?')} item(s)). "
                "You can keep using the app; refresh this status to see the latest terminal output."
            )
        c1, c2, c3 = st.columns([1, 1, 1])
        if c1.button("Refresh triage status", key=f"{job_key}_refresh"):
            st.rerun()
        if c2.button("Stop and cancel pending triage", key=f"{job_key}_stop_running"):
            cancelled = _cancel_running_durable_triage(include_queued=True)
            message = _request_stop_app_job(job)
            _clear_source_queue_triage_lock(job)
            st.session_state.pop(job_key, None)
            st.session_state["source_queue_triage_stop_message"] = (
                f"{message} Cancelled {cancelled} active or queued durable item job(s)."
            )
            st.rerun()
        if c3.button("Forget this status card", key=f"{job_key}_forget_running"):
            st.session_state.pop(job_key, None)
            st.rerun()
        tail = _job_log_tail(log_path, limit=6000)
        if tail:
            with st.expander("Triage terminal log tail", expanded=True):
                st.code(tail, language="text")
        st.caption(f"Log: `{log_path}`")
        return True

    if returncode == 0:
        st.success("Source Queue triage finished. Refresh the page or filters to see updated rows.")
    else:
        st.error(f"Source Queue triage exited with code {returncode}.")
    _clear_source_queue_triage_lock(job)
    tail = _job_log_tail(log_path, limit=6000)
    if tail:
        with st.expander("Triage terminal log tail", expanded=returncode != 0):
            st.code(tail, language="text")
    st.caption(f"Log: `{log_path}`")
    if st.button("Clear triage status", key=f"{job_key}_clear_done"):
        st.session_state.pop(job_key, None)
        st.rerun()
    return False


def _request_stop_app_job(job: dict) -> str:
    proc = job.get("process")
    pid = job.get("pid")
    if job.get("kind") == "source-queue-triage":
        try:
            pid_int = int(getattr(proc, "pid", None) or pid or 0)
            if pid_int > 0 and _pid_is_running(pid_int):
                os.killpg(os.getpgid(pid_int), signal.SIGTERM)
                return f"Stop requested for durable triage process group {pid_int}."
        except Exception as exc:
            return f"Could not stop durable triage process group: {exc}"
    if proc is not None:
        try:
            if proc.poll() is None:
                proc.terminate()
                return f"Stop requested for {job.get('kind', 'job')} PID {proc.pid}."
            return f"{job.get('kind', 'job')} already finished."
        except Exception as exc:
            return f"Could not stop process object: {exc}"
    try:
        pid_int = int(pid or 0)
    except (TypeError, ValueError):
        return "No valid process id to stop."
    if pid_int <= 0:
        return "No valid process id to stop."
    if not _pid_is_running(pid_int):
        return f"Process PID {pid_int} is no longer running."
    try:
        os.kill(pid_int, signal.SIGTERM)
    except Exception as exc:
        return f"Could not stop PID {pid_int}: {exc}"
    return f"Stop requested for PID {pid_int}."


def _source_queue_snapshot_command(item_id: str, snapshot_path: str, package_id: str = "") -> str:
    mapping = f"{item_id}:{snapshot_path or '/path/to/browser-saved-page.html'}"
    command = [sys.executable, "-m", "runner", "source-offload-export", "--queue-snapshot", mapping]
    if package_id:
        command.extend(["--package-id", package_id])
    return shlex.join(command)


def _source_split_book_command(
    source_path: str,
    *,
    out_path: str = "",
    min_chars: int = 3000,
    max_level: int = 2,
) -> str:
    command = [
        sys.executable,
        "-m",
        "runner",
        "split-book",
        source_path or "/path/to/book.pdf",
        "--min-chars",
        str(min_chars),
        "--max-level",
        str(max_level),
    ]
    if out_path.strip():
        command.extend(["--out", out_path.strip()])
    return shlex.join(command)


def _normalise_local_source_path(value: str) -> str:
    """Normalise a researcher-pasted local file path without touching meaning.

    Finder/Terminal copy-paste often leaves wrapping quotes around paths with
    spaces. Those quotes are command syntax, not part of the filename; strip one
    matching pair so Source Offload can find the actual file.
    """
    text = (value or "").strip()
    if len(text) >= 2 and text[0] == text[-1] and text[0] in {"'", '"'}:
        text = text[1:-1].strip()
    if text.startswith("file://"):
        text = text[7:]
    return text


def _source_parse_file_rows(text: str) -> list[dict[str, str]]:
    """Parse bulk local-file rows for Source Offload.

    Supported formats:
      /path/to/book.pdf
      /path/to/book.pdf | https://source-or-download-page.example | Optional title

    The optional URL is stored as provenance/source_url for the file-backed item.
    The Source Offload UI also packages it as a separate companion URL document
    so landing/download pages can contribute context and network evidence.
    """
    rows: list[dict[str, str]] = []
    for raw in (text or "").splitlines():
        line = raw.strip()
        if not line:
            continue
        parts = [part.strip() for part in line.split("|")]
        rows.append({
            "file_path": _normalise_local_source_path(parts[0]),
            "source_url": parts[1] if len(parts) > 1 else "",
            "title": parts[2] if len(parts) > 2 else "",
        })
    return rows


def _source_file_row_preview_rows(file_rows: list[dict[str, str]]) -> list[dict[str, str]]:
    """Human preview for local file rows before source package build."""
    rows: list[dict[str, str]] = []
    for idx, row in enumerate(file_rows, start=1):
        file_path = row.get("file_path", "").strip()
        source_url = row.get("source_url", "").strip()
        path = Path(file_path).expanduser()
        exists = path.is_file()
        rows.append({
            "row": str(idx),
            "package item": "file",
            "will analyze": file_path,
            "status": "found" if exists else "missing",
            "source/provenance URL": source_url or "—",
            "queue relink": "ad-hoc file" if not source_url else "file keeps source URL provenance",
            "note": row.get("title", "").strip(),
        })
        if source_url:
            rows.append({
                "row": str(idx),
                "package item": "companion URL",
                "will analyze": source_url,
                "status": "will fetch on worker",
                "source/provenance URL": source_url,
                "queue relink": "ad-hoc URL",
                "note": "Landing/download/source page is analyzed separately for context and network evidence.",
            })
    return rows


def _source_queue_latest_triage_history(db, item_id: str) -> dict:
    rows = db.execute(
        """
        SELECT * FROM source_queue_triage_history
        WHERE item_id = ?
        ORDER BY triaged_at DESC, id DESC
        LIMIT 1
        """,
        (item_id,),
    ).fetchall()
    return dict(rows[0]) if rows else {}


def _source_queue_visible_history_map(db, item_ids: list[str], *, limit_per_item: int = 8) -> dict[str, list[dict]]:
    """Bulk-load recent triage history for visible queue rows.

    The Source Queue page can show dozens of collapsed row expanders. Streamlit
    still executes those blocks while rendering, so querying history once per
    row makes the page feel like it is "doing triage" when it is only painting
    the UI. This keeps the UI read path bounded to one query.
    """
    clean_ids = [str(item_id).strip() for item_id in item_ids if str(item_id).strip()]
    if not clean_ids:
        return {}
    placeholders = ",".join("?" for _ in clean_ids)
    rows = db.execute(
        f"""
        SELECT * FROM source_queue_triage_history
        WHERE item_id IN ({placeholders})
        ORDER BY item_id ASC, triaged_at DESC, id DESC
        """,
        clean_ids,
    ).fetchall()
    grouped: dict[str, list[dict]] = {item_id: [] for item_id in clean_ids}
    for row in rows:
        data = dict(row)
        item_id = str(data.get("item_id") or "")
        if len(grouped.setdefault(item_id, [])) < limit_per_item:
            grouped[item_id].append(data)
    return {item_id: history for item_id, history in grouped.items() if history}


def _source_queue_recent_triage_logs(limit: int = 5) -> list[Path]:
    log_dir = _project_root / "exports" / "app_jobs"
    if not log_dir.exists():
        return []
    logs = {
        path
        for pattern in ("*source-queue-triage*.log", "*source-queue-retriage*.log")
        for path in log_dir.glob(pattern)
        if path.is_file()
    }
    return sorted(logs, key=lambda path: path.stat().st_mtime, reverse=True)[:limit]


def _source_queue_log_looks_failed(text: str) -> bool:
    lowered = text.lower()
    return any(
        marker in lowered
        for marker in (
            "traceback",
            "nameerror",
            "api connection error",
            "apiconnectionerror",
            "ollama_chatexception",
            "source queue triage exited with code",
            "error starting llama-server",
            "received model group",
        )
    )


def _render_source_queue_recent_triage_logs(*, exclude_path: Path | None = None) -> bool:
    excluded = Path(exclude_path).resolve() if exclude_path else None
    logs = [
        path for path in _source_queue_recent_triage_logs(limit=6)
        if excluded is None or path.resolve() != excluded
    ][:5]
    if not logs:
        return False
    latest_tail = _job_log_tail(logs[0], limit=10000)
    latest_failed = _source_queue_log_looks_failed(latest_tail)
    if latest_failed:
        st.error(
            "The most recent Source Queue triage log contains an error. "
            "Open the log below before retrying."
        )
    with st.expander("Triage terminal log history", expanded=latest_failed):
        for idx, log_path in enumerate(logs, 1):
            tail = _job_log_tail(log_path, limit=10000)
            label = f"{idx}. {log_path.name}"
            if _source_queue_log_looks_failed(tail):
                label += " · possible failure"
            with st.expander(label, expanded=idx == 1 and latest_failed):
                st.caption(f"Log: `{log_path}`")
                if tail:
                    st.code(tail, language="text")
                else:
                    st.caption("Log file is empty.")
    return True


def _workflow_canary_execution_eligible(row: dict) -> bool:
    """True only for an untouched, semantically valid, planner-only proposal."""
    return (
        row.get("event_history_valid") is True
        and row.get("disposition") == "planned_not_authorized"
        and row.get("execution_state") == "proposal_recorded"
        and row.get("grant_recorded") is not True
    )


def _workflow_canary_step_rows(row: dict) -> list[dict[str, str]]:
    """Project one validated testimony attempt into researcher-facing steps."""
    valid = bool(row.get("event_history_valid"))
    disposition = str(row.get("disposition") or "")
    eligible = valid and disposition == "planned_not_authorized"
    planner_ready = _workflow_canary_execution_eligible(row)
    granted = valid and bool(row.get("grant_recorded"))
    preserved = valid and bool(row.get("preservation_recorded"))
    started = valid and bool(row.get("execution_started_recorded"))
    terminal = str(row.get("terminal_outcome") or "") if valid else ""
    released = valid and bool(row.get("lease_released"))
    recovery_check_required = valid and bool(row.get("recovery_check_required"))

    if not valid:
        plan_status = "Blocked: ledger history is inconsistent"
    elif disposition == "planned_not_authorized" and granted and terminal:
        plan_status = f"Original proposal; one-use grant finished: {terminal}"
    elif disposition == "planned_not_authorized" and granted:
        plan_status = "Original proposal; one-use grant recorded (nonterminal)"
    elif disposition == "planned_not_authorized":
        plan_status = "Ready proposal: recorded but not authorized"
    elif disposition in {"satisfied", "satisfied_existing"}:
        plan_status = "Satisfied: required artifact already exists"
    elif disposition == "human_required":
        plan_status = "Human decision required"
    elif disposition == "held_prerequisite":
        plan_status = "Held: prerequisite must finish before a fresh plan"
    else:
        plan_status = f"Not execution-eligible: {disposition or 'not planned'}"

    if not valid:
        build_status = "Blocked: execution history is untrusted"
    elif not eligible:
        build_status = "Not eligible from this plan"
    elif recovery_check_required:
        build_status = "Nonterminal grant: running or interrupted; do not rerun"
    elif terminal == "succeeded":
        build_status = "Complete: succeeded"
    elif terminal == "failed":
        build_status = "Failed: prior sidecar restored and evidence recorded"
    elif terminal == "recovery_hold":
        build_status = "Held: recovery evidence requires researcher review"
    elif started:
        build_status = "Running or interrupted"
    elif granted:
        build_status = "Granted; adapter not yet recorded as started"
    else:
        build_status = "Pending explicit one-use confirmation"

    if not valid:
        evidence_status = "Blocked: execution history is untrusted"
    elif not eligible:
        evidence_status = "Not applicable to this plan row"
    elif terminal == "succeeded" and released:
        evidence_status = "Ready: verify output receipt and archived evidence"
    elif terminal == "failed" and released:
        evidence_status = "Ready: verify failure receipt and exact restoration evidence"
    elif terminal == "recovery_hold" and released:
        evidence_status = "Held: verify recovery receipt and corpus hold"
    elif recovery_check_required:
        evidence_status = "Check active execution; recover only if the run is interrupted"
    elif terminal:
        evidence_status = "Terminal event recorded; lease release incomplete"
    else:
        evidence_status = "Pending execution outcome"

    if not valid:
        replan_status = "Blocked until ledger integrity is restored"
    elif not eligible:
        replan_status = "Not applicable to this plan row"
    elif terminal == "succeeded" and released:
        replan_status = "Required: re-attest and create a fresh downstream plan"
    elif terminal in {"failed", "recovery_hold"}:
        replan_status = "Held for researcher review and a fresh plan"
    else:
        replan_status = "Pending verified terminal outcome"

    return [
        {"Step": "1. Plan + bind evidence", "Status": plan_status, "Action": "Planner only; cannot execute"},
        {"Step": "2. Read-only preflight", "Status": "Available" if planner_ready and not granted else "Passed or no longer applicable" if granted else "Blocked", "Action": "Validate current inputs"},
        {"Step": "3. One-use grant + lock", "Status": "Untrusted / blocked" if not valid else "Not eligible" if not eligible else "Recorded" if granted else "Not granted", "Action": "Exact attempt confirmation required"},
        {"Step": "4. Preserve prior sidecar", "Status": "Untrusted / blocked" if not valid else "Not applicable" if not eligible else "Recorded" if preserved else "Not recorded", "Action": "Automatic before build"},
        {"Step": "5. Deterministic candidate build", "Status": build_status, "Action": "Local sidecar only; no model or remote write"},
        {"Step": "6. Verify or recover evidence", "Status": evidence_status, "Action": "Read-only verify, or recovery without rerun"},
        {"Step": "7. Re-attest + re-plan", "Status": replan_status, "Action": "Required before downstream work"},
    ]


def _render_research_workflow_overview(config) -> None:
    """Keep the complete researcher flow and durable attempt state visible."""
    with st.expander("Research workflow: all steps and durable canary status", expanded=False):
        st.caption(
            "This is the adjustment layer over the existing pipeline. It does not replace the "
            "4,000 completed triage decisions or silently execute, promote, upload, or publish anything."
        )
        st.dataframe([
            {"Order": 1, "Step": "Add source + metadata", "Where": "Source Queue", "Automation": "Duplicate checks and durable triage request"},
            {"Order": 2, "Step": "Triage route + priority", "Where": "Source Queue", "Automation": "Model suggestion with history and terminal log"},
            {"Order": 3, "Step": "Select workflow batch (maximum 15)", "Where": "Workflow batch", "Automation": "Reuse triage; plan only missing work"},
            {"Order": 4, "Step": "Acquire, preserve, extract, create citation units", "Where": "Source Offload / Ingest Workbench", "Automation": "Existing base-pipeline stages; attempt plans only report readiness"},
            {"Order": 5, "Step": "Analysis", "Where": "Ingest Workbench", "Automation": "Existing first model pass with auditable evidence"},
            {"Order": 6, "Step": "Enrichment", "Where": "Ingest Workbench", "Automation": "Existing complementary pass; draft terms and tags remain proposals"},
            {"Order": 7, "Step": "Embeddings", "Where": "Existing ingest pipeline / semantic search", "Automation": "Generated from extracted text; direct ingest and source-worker order differ, and semantic search requires a valid embedding"},
            {"Order": 8, "Step": "Specialist annotations", "Where": "Media / Testimony / longform review", "Automation": "Only routes flagged by triage and analysis"},
            {"Order": 9, "Step": "Compile batch outcome", "Where": "Batch outcome and re-audit", "Automation": "Deterministic exceptions and draft-term/tag evidence"},
            {"Order": 10, "Step": "Review draft records", "Where": "Review Inbox / Lexicon / Tag Registry", "Automation": "Current manual review surfaces; grouped decision consolidation is still pending"},
            {"Order": 11, "Step": "Generate bounded Review Pack", "Where": "Codex Review Packs", "Automation": "Evidence, citations, provenance, and questions"},
            {"Order": 12, "Step": "Private remote upload", "Where": "Pending Upload", "Automation": "Separate researcher gate for Sanity/Supabase"},
            {"Order": 13, "Step": "Public release", "Where": "Publication workflow", "Automation": "Separate human decision; never implied by private upload"},
        ], hide_index=True, use_container_width=True)

        ledger_path = Path(config.exports_dir) / "workflow_attempts" / "attempts.sqlite3"
        try:
            from runner.pipeline.workflow_attempts import list_attempts
            attempts = list_attempts(ledger_path, limit=100)
        except Exception as exc:
            st.warning(f"Durable workflow-attempt status could not be verified: {exc}")
            return
        if not attempts:
            st.info("No durable workflow attempts yet. Create a workflow plan below when a batch is ready.")
            return
        st.markdown("**Recent durable workflow attempts**")
        st.dataframe([{
            "Item": row["queue_item_id"],
            "Attempt ID": row["attempt_id"],
            "Stage": row["stage"],
            "Planner": row["disposition"],
            "Execution": row["execution_state"],
            "Outcome": row["terminal_outcome"] or "—",
            "Events valid": "yes" if row["event_history_valid"] else "NO — blocked",
        } for row in attempts], hide_index=True, use_container_width=True)
        canaries = [row for row in attempts if row.get("stage") == "testimony-candidates-build"]
        if canaries:
            labels = {
                row["attempt_id"]: f"{row['queue_item_id']} · {row['attempt_id']}"
                for row in canaries
            }
            selected_id = st.selectbox(
                "Inspect testimony canary steps",
                list(labels),
                format_func=lambda value: labels[value],
                key="source_queue_durable_canary_attempt",
            )
            selected = next(row for row in canaries if row["attempt_id"] == selected_id)
            st.dataframe(
                _workflow_canary_step_rows(selected),
                hide_index=True,
                use_container_width=True,
            )
        st.caption(f"Append-only ledger: `{ledger_path}`")
        st.warning(
            "Status is visible here, but execution remains separately gated. A planner row is never "
            "authorization, and an invalid event history blocks derived status."
        )


def _source_queue_rendered_recovered(db, item_id: str) -> bool:
    row = _source_queue_latest_triage_history(db, item_id)
    if not row:
        return False
    if bool(row.get("rendered_fallback")):
        return True
    note = str(row.get("acquisition_note") or "").lower()
    return "crawl4ai" in note or "rendered" in note


def _source_manifest_apply_rendered_policy(manifest, db, *, include_rendered: bool):
    """UI-only policy filter for batches containing Crawl4AI-rendered recoveries."""
    if include_rendered:
        return manifest
    kept = []
    deferred = []
    for item in manifest.included:
        if _source_queue_rendered_recovered(db, item.item_id):
            item.included = False
            item.exclusion_reason = "rendered_fallback_excluded"
            deferred.append(item)
        else:
            kept.append(item)
    if deferred:
        manifest.included = kept
        manifest.excluded = deferred + manifest.excluded
        manifest.notes.append(
            f"{len(deferred)} safe item(s) deferred because they required the rendered/Crawl4AI fallback."
        )
    return manifest


def page_source_queue():
    st.title("📥 Source Queue")

    # Lifecycle caption — always visible
    st.info(
        "**Queue lifecycle:** "
        "🆕 New (captured, not yet triaged) → "
        "🔬 Triaged (model suggested routing & priority) → "
        "✳️ Ready for ingest (researcher approved — **not yet ingested**) → "
        "📦 Ingested (runner ingest completed)  ·  ⏭ Skipped (will not ingest)"
    )

    config = _load_config_safe()
    if config is None:
        st.error("Config unavailable — check runner/.env.")
        return

    try:
        from runner.pipeline.source_queue import (
            open_db, queue_db_path, add_items_from_text, list_items,
            update_status, update_priority, update_notes, delete_item,
            apply_triage_result, queue_stats, batch_groups,
            list_triage_history,
            update_source_file_attachment,
            normalise_url, parse_pasted_urls, get_items_by_urls,
            VALID_STATUSES, VALID_PRIORITIES,
        )
        from runner.pipeline.batch import plan_batch, MAX_BATCH_LIMIT
    except ImportError as exc:
        st.error(f"source_queue module unavailable: {exc}")
        return

    db_path = queue_db_path(config.corpus_dir)
    db = open_db(db_path)
    triage_job_key = "source_queue_triage_job"
    try:
        resumed_job = _resume_durable_triage_worker(config)
        if resumed_job and triage_job_key not in st.session_state:
            st.session_state[triage_job_key] = resumed_job
    except Exception as exc:
        st.warning(f"Durable triage queue could not resume automatically: {exc}")
    stop_message = st.session_state.pop("source_queue_triage_stop_message", "")
    if stop_message:
        st.warning(stop_message)
    add_message = st.session_state.pop("source_queue_add_message", "")
    if add_message:
        st.info(add_message)
    if not st.session_state.get("_sq_limit_initialized_for_fast_add"):
        try:
            current_limit = int(st.session_state.get("sq_limit", 50) or 50)
        except (TypeError, ValueError):
            current_limit = 50
        if current_limit > 100:
            st.session_state["sq_limit"] = 50
        st.session_state["_sq_limit_initialized_for_fast_add"] = True

    def _run_source_queue_triage(
        target_items,
        *,
        label: str = "Triaging",
        use_crawl4ai: bool = False,
    ) -> None:
        """Run queue triage for visible items and persist fail-closed results."""
        if not target_items:
            st.info("No queue items selected for triage.")
            return
        try:
            from runner.pipeline import triage as triage_mod
        except ImportError as exc:
            st.error(f"Triage module unavailable: {exc}")
            return

        model_name = "litelm/triage" if config.litelm_base_url else config.local_analysis_model
        progress = st.progress(0, text=f"{label}…")
        parsed = 0
        failed = 0
        old_crawl = os.environ.get("SOGICE_ENABLE_CRAWL4AI")
        if use_crawl4ai:
            os.environ["SOGICE_ENABLE_CRAWL4AI"] = "1"
        try:
            for idx, item in enumerate(target_items):
                progress.progress(
                    (idx + 1) / max(len(target_items), 1),
                    text=f"{label} {idx + 1}/{len(target_items)}: {item.url[:55]}",
                )
                try:
                    snippet, note = triage_mod.extract_snippet(item.url)
                    result = triage_mod.run(
                        snippet,
                        config,
                        source_label=triage_mod.source_context_label(
                            item.url,
                            extraction_note=note,
                            snippet=snippet,
                            researcher_note=item.notes,
                        ),
                    )
                    apply_triage_result(db, item.id, result, model_name=model_name, acquisition_note=note)
                    if result.triage_succeeded:
                        parsed += 1
                    else:
                        failed += 1
                        st.warning(f"Triage failed closed for {item.id}: {result.routing_reason}")
                except Exception as exc:
                    failed += 1
                    failed_result = triage_mod.TriageResult.failed(f"snippet/extraction error: {exc}")
                    apply_triage_result(
                        db,
                        item.id,
                        failed_result,
                        model_name=model_name,
                        acquisition_note=str(exc),
                    )
                    st.warning(f"Triage failed closed for {item.id}: {exc}")
        finally:
            if use_crawl4ai:
                if old_crawl is None:
                    os.environ.pop("SOGICE_ENABLE_CRAWL4AI", None)
                else:
                    os.environ["SOGICE_ENABLE_CRAWL4AI"] = old_crawl
        progress.empty()
        st.success(f"Triage complete with {model_name}: {parsed} parsed, {failed} failed closed.")

    # ── Stats bar ──────────────────────────────────────────────────────────
    stats = queue_stats(db)
    by_s = stats["by_status"]
    cols = st.columns(6)
    cols[0].metric("Total", stats["total"])
    cols[1].metric("🆕 New", by_s.get("new", 0))
    cols[2].metric("🔬 Triaged", by_s.get("triaged", 0))
    cols[3].metric("✳️ Ready for ingest", by_s.get("ready_to_ingest", 0),
                   help="Approved by researcher but NOT yet ingested into corpus")
    cols[4].metric("📦 Ingested", by_s.get("ingested", 0))
    cols[5].metric("⏭ Skipped", by_s.get("skipped", 0))

    with st.expander("Model routes used by triage, ingest, enrichment, longform, and embedding", expanded=False):
        st.caption(
            "Streamlit and the CLI pass stable route/alias names. The Mac Studio LiteLLM YAML maps those aliases "
            "to the actual MLX Ollama model tags."
        )
        st.dataframe(
            _model_route_rows(config),
            hide_index=True,
            use_container_width=True,
        )
    _render_model_runtime_preflight(config)

    st.divider()

    triage_status_rendered = _render_source_queue_triage_job(triage_job_key)
    active_heavy_job = _read_app_job_lock()
    if active_heavy_job:
        st.warning(
            _format_app_job_lock(active_heavy_job)
            + " Source Queue add/review remains available; starting triage waits for this model job."
        )
    visible_job = st.session_state.get(triage_job_key) or {}
    visible_log = Path(visible_job["log_path"]) if visible_job.get("log_path") else None
    _render_source_queue_recent_triage_logs(exclude_path=visible_log)
    durable_state = _durable_triage_queue_state(config)
    durable_counts = durable_state["counts"]
    pending_durable = sum(durable_counts.get(status, 0) for status in ("queued", "running", "waiting"))
    if pending_durable:
        st.info(
            f"Durable triage queue: {pending_durable} request(s) pending/running. "
            "They resume automatically after model-resource locks clear; you do not need to submit them again."
        )
    if durable_state["recent"]:
        with st.expander("Durable triage request history", expanded=False):
            st.dataframe(
                [{
                    "Request": row["id"], "Status": row["status"],
                    "Items": len(row["item_ids"]), "Attempts": row["attempt_count"],
                    "Created": row["created_at"], "Last error/wait": row["last_error"],
                } for row in durable_state["recent"]],
                hide_index=True, use_container_width=True,
            )
    _render_research_workflow_overview(config)
    from runner.processing_queue_ui import render_processing_queue
    render_processing_queue(config, key_prefix="source_queue_processing")

    # ── Fast add panel ─────────────────────────────────────────────────────
    st.subheader("Add sources")
    st.caption(
        "The normal action records each source and immediately queues triage so its priority and "
        "processing route are assigned. **Add only** is the exception for collecting material that "
        "must intentionally remain untriaged."
    )
    with st.form("sq_quick_add_form", clear_on_submit=True):
        quick_pasted = st.text_area(
            "URLs / source lines",
            height=120,
            placeholder=(
                "https://example.org/source-a\n"
                "https://example.org/source-b\n"
                "# Lines starting with # are skipped"
            ),
        )
        quick_cols = st.columns([1, 1, 1])
        quick_priority = quick_cols[0].selectbox(
            "Priority",
            ["medium", "high", "low", "skip"],
            key="sq_quick_priority",
            help="Used by Add only. When triage is queued, the model recommendation replaces this provisional value.",
        )
        quick_batch = quick_cols[1].text_input("Batch group", key="sq_quick_batch")
        quick_tags = quick_cols[2].text_input("Tags", key="sq_quick_tags")
        quick_notes = st.text_area(
            "Research notes",
            key="sq_quick_notes",
            height=80,
            help="Researcher-authored context in a standard multi-line browser field.",
        )
        quick_triage_max = st.number_input(
            "Max items to triage now",
            min_value=1,
            max_value=200,
            value=25,
            step=5,
            key="sq_quick_triage_max",
            help="Only used by Add + start triage. Extra added rows remain in the queue as new.",
        )
        quick_use_crawl4ai = st.checkbox(
            "Use Crawl4AI rendered-page fallback if triaging",
            value=False,
            key="sq_quick_use_crawl4ai",
            help=(
                "Opt-in browser rendering for public pages where static extraction fails. "
                "Challenge/login/CAPTCHA pages are still held for manual capture."
            ),
        )
        quick_submit_triage = st.form_submit_button("Add + queue triage", type="primary")
        quick_submit_add = st.form_submit_button("Add only")
    if quick_submit_add or quick_submit_triage:
        added, dup_q, dup_c = add_items_from_text(
            db,
            quick_pasted,
            config.corpus_dir,
            priority=_source_queue_initial_priority(
                "Add and triage now" if quick_submit_triage else "Add only",
                quick_priority,
            ),
            tags=quick_tags,
            batch_group=quick_batch,
            notes=quick_notes,
        )
        parts = []
        if added:
            parts.append(f"{added} added")
        if dup_c:
            parts.append(f"{dup_c} already in corpus; association noted")
        if dup_q:
            parts.append(f"{dup_q} already in queue")
        st.session_state["source_queue_add_message"] = (
            "Source Queue updated: " + "; ".join(parts)
            if parts else
            "No valid URLs found in the pasted text."
        )
        if quick_submit_triage and (added or dup_q or dup_c):
            pasted_urls = parse_pasted_urls(quick_pasted)
            matching_rows = get_items_by_urls(db, pasted_urls)
            # Never spend another model call on an already-triaged duplicate.
            # Intentional re-triage remains available in the dedicated controls.
            triage_candidates, already_routed = _source_queue_submission_candidates(matching_rows)
            if not triage_candidates:
                st.session_state["source_queue_add_message"] += (
                    " No new rows required triage; existing matching sources kept their current routing."
                )
            else:
                selected_candidates = triage_candidates[: int(quick_triage_max)]
                try:
                    st.session_state[triage_job_key] = _start_source_queue_triage_job(
                        item_ids=[item.id for item in selected_candidates],
                        limit=len(selected_candidates),
                        force=False,
                        use_crawl4ai=quick_use_crawl4ai,
                        label="source-queue-triage-added",
                    )
                    st.session_state["source_queue_add_message"] += (
                        f" Queued triage for {len(selected_candidates)} new item(s); route assignment follows automatically."
                    )
                    if already_routed:
                        st.session_state["source_queue_add_message"] += (
                            f" {len(already_routed)} existing matching item(s) kept their current route."
                        )
                    if len(triage_candidates) > len(selected_candidates):
                        st.session_state["source_queue_add_message"] += (
                            f" {len(triage_candidates) - len(selected_candidates)} extra matching item(s) "
                            "were left as new. Use **Continue triage for all new queue items** below to process them without pasting again."
                        )
                except RuntimeError as exc:
                    st.session_state["source_queue_add_message"] += f" Triage was not started: {exc}"
        st.rerun()

    # ── Import panel ───────────────────────────────────────────────────────
    with st.expander("➕ Advanced add sources with optional background triage", expanded=False):
        st.caption(
            "Paste URLs — one per line, CSV, Zotero RIS (UR  - …), "
            "BibTeX (url = {…}), or tab-separated URL\\tTitle. "
            "Lines starting with # are treated as comments."
        )
        pasted = st.text_area(
            "URLs",
            height=160,
            placeholder=(
                "https://www.christianconcern.com/...\n"
                "https://www.un.org/...\n"
                "# Lines starting with # are skipped"
            ),
            key="sq_paste_box",
        )

        add_mode = st.radio(
            "After adding",
            ["Add only", "Add and triage now"],
            horizontal=True,
            key="sq_add_mode",
            help=(
                "Add only: items enter with status=new. "
                "Add and triage now: fetches each URL and asks the fast model for routing — "
                "slower but gives priority/LLM suggestions immediately."
            ),
        )

        imp_col1, imp_col2, imp_col3 = st.columns(3)
        if add_mode == "Add and triage now":
            imp_col1.selectbox(
                "Priority",
                ["Let triage decide"],
                disabled=True,
                key="sq_import_priority_auto",
                help="The queue stores an initial medium value, then triage overwrites it with high/medium/low/skip when the model succeeds.",
            )
            imp_priority = _source_queue_initial_priority(add_mode, "medium")
        else:
            selected_priority = imp_col1.selectbox(
                "Priority",
                ["medium", "high", "low", "skip"],
                key="sq_import_priority",
                help="Manual priority used until you run triage. Triage can update this later.",
            )
            imp_priority = _source_queue_initial_priority(add_mode, selected_priority)
        imp_batch = imp_col2.text_input("Batch group", key="sq_import_batch",
                                         placeholder="e.g. UN sources")
        imp_tags = imp_col3.text_input("Tags", key="sq_import_tags",
                                        placeholder="e.g. sogice,legal")
        imp_notes = st.text_area(
            "Research notes",
            key="sq_import_notes",
            placeholder="optional researcher-authored context",
            height=80,
        )

        if add_mode == "Add and triage now":
            confirm_auto_triage = st.checkbox(
                "Start background triage immediately after adding",
                value=False,
                key="sq_confirm_auto_triage_after_add",
                help=(
                    "Leave unchecked when you only want to add sources. Checking this starts "
                    "network fetching and model triage after the URLs are written to the queue."
                ),
            )
            import_use_crawl4ai = st.checkbox(
                "Use Crawl4AI rendered-page fallback while triaging these new sources",
                value=False,
                key="sq_import_use_crawl4ai",
                help=(
                    "Opt-in browser rendering for public pages. Challenge/login/CAPTCHA pages "
                    "are still held, not treated as source text."
                ),
            )
            st.code(
                _source_queue_triage_command(
                    limit=max(1, len([line for line in pasted.splitlines() if line.strip()])),
                    batch=imp_batch,
                    force=False,
                    use_crawl4ai=import_use_crawl4ai,
                ),
                language="bash",
            )
            st.caption(
                "Priority will be assigned by the triage model. If triage fails for a URL, it is marked `triaged` but fail-closed so you can review or retry it."
            )
        else:
            confirm_auto_triage = False
            import_use_crawl4ai = False

        if st.button("Add to queue", type="primary", disabled=not pasted.strip()):
            with st.spinner("Adding…"):
                added, dup_q, dup_c = add_items_from_text(
                    db, pasted, config.corpus_dir,
                    priority=imp_priority,
                    tags=imp_tags,
                    batch_group=imp_batch,
                    notes=imp_notes,
                )
            parts = []
            if added:
                parts.append(f"✅ {added} added")
            if dup_c:
                parts.append(
                    f"⚠️ {dup_c} already in corpus — added with association noted "
                    f"(status=new; mark as ingested to confirm)"
                )
            if dup_q:
                parts.append(f"⏭ {dup_q} already in queue (skipped)")
            if parts:
                st.success("  ·  ".join(parts[:2]))
                if len(parts) > 2:
                    for p in parts[2:]:
                        st.caption(p)
            else:
                st.warning("No valid URLs found in the pasted text.")

            if add_mode == "Add and triage now" and not confirm_auto_triage and (added + dup_c) > 0:
                st.session_state["source_queue_add_message"] = (
                    "Added to Source Queue only. Background triage was not started because "
                    "the confirmation checkbox was not selected."
                )

            if add_mode == "Add and triage now" and confirm_auto_triage and (added + dup_c) > 0:
                pasted_urls = {normalise_url(url) for url in parse_pasted_urls(pasted)}
                new_items = [
                    item for item in list_items(db, status="new", batch_group=None, limit=5000)
                    if normalise_url(item.url) in pasted_urls
                ]
                if new_items:
                    try:
                        st.session_state[triage_job_key] = _start_source_queue_triage_job(
                            item_ids=[item.id for item in new_items],
                            limit=len(new_items),
                            force=False,
                            use_crawl4ai=import_use_crawl4ai,
                            label="source-queue-triage-new",
                        )
                        st.success(
                            f"Started background triage for {len(new_items)} newly pasted item(s). "
                            "Watch the status/log card below."
                        )
                    except RuntimeError as exc:
                        st.error(str(exc))

            st.rerun()

    # ── File import ────────────────────────────────────────────────────────
    with st.expander("📂 Import from file (.txt / .csv / .ris / .bib)"):
        st.caption("Upload a Zotero RIS export, CSV, or plain text file.")
        uploaded = st.file_uploader(
            "Choose file", type=["txt", "csv", "ris", "bib"],
            key="sq_file_upload",
        )
        if uploaded is not None:
            file_text = uploaded.read().decode("utf-8", errors="ignore")
            file_batch = st.text_input(
                "Batch group for this file", key="sq_file_batch",
                placeholder="e.g. Zotero export May 2026",
            )
            if st.button("Import file", key="sq_file_import"):
                with st.spinner("Importing…"):
                    added, dup_q, dup_c = add_items_from_text(
                        db, file_text, config.corpus_dir,
                        batch_group=file_batch,
                    )
                parts = [f"✅ {added} added"]
                if dup_c:
                    parts.append(f"⚠️ {dup_c} corpus associations noted")
                if dup_q:
                    parts.append(f"⏭ {dup_q} already in queue")
                st.success("  ·  ".join(parts))
                st.rerun()

    st.divider()

    # ── Filters ────────────────────────────────────────────────────────────
    filter_cols = st.columns([2, 2, 3, 2, 1])
    # Human-readable status labels for the filter
    _STATUS_LABELS = {
        "new": "🆕 new",
        "triaged": "🔬 triaged",
        "ready_to_ingest": "✳️ ready for ingest",
        "ingested": "📦 ingested",
        "skipped": "⏭ skipped",
    }
    status_options = ["(all)"] + sorted(VALID_STATUSES)
    status_labels  = ["(all)"] + [_STATUS_LABELS.get(s, s) for s in sorted(VALID_STATUSES)]
    status_sel_idx = filter_cols[0].selectbox(
        "Status", range(len(status_options)),
        format_func=lambda i: status_labels[i],
        key="sq_filter_status",
    )
    status_filter = None if status_sel_idx == 0 else status_options[status_sel_idx]

    priority_filter = filter_cols[1].selectbox(
        "Priority", ["(all)"] + sorted(VALID_PRIORITIES),
        key="sq_filter_priority",
    )
    batches = ["(all)"] + batch_groups(db)
    batch_filter = filter_cols[2].selectbox("Batch", batches, key="sq_filter_batch")
    hold_filter_options = [
        "(all)",
        "cloudflare",
        "blocked_page",
        "ssl",
        "wayback_unavailable",
        "http_blocked",
        "timeout",
        "video_needs_transcript",
        "triage_failed",
    ]
    hold_filter = filter_cols[3].selectbox(
        "Held category",
        hold_filter_options,
        format_func=lambda x: "(all)" if x == "(all)" else _source_queue_hold_label(x),
        key="sq_filter_hold_category",
        help="Filters visible rows by the current triage/acquisition hold reason.",
    )
    show_limit = filter_cols[4].number_input("Limit", min_value=10, max_value=2000,
                                              value=50, step=50, key="sq_limit")

    items = list_items(
        db,
        status=status_filter,
        priority=None if priority_filter == "(all)" else priority_filter,
        batch_group=None if batch_filter == "(all)" else batch_filter,
        limit=int(show_limit),
    )
    if hold_filter != "(all)":
        items = [
            item for item in items
            if _source_queue_hold_category(item.url, item.routing_reason, item.source_type) == hold_filter
        ]

    triage_locked = bool(_read_source_queue_triage_lock()) or bool(_read_app_job_lock())
    all_new_items = list_items(db, status="new", batch_group=None, limit=10000)
    all_new_count = len(all_new_items)
    if all_new_count:
        with st.expander("Continue triage for all new queue items", expanded=not items):
            st.caption(
                f"There are **{all_new_count} new/untriaged item(s)** in the queue, including rows that may be hidden by filters. "
                "This continues triage from the backlog; you do not need to paste the URLs again."
            )
            continue_cols = st.columns([2, 1, 1])
            continue_n = int(continue_cols[0].number_input(
                "Max new items",
                min_value=1,
                max_value=min(500, max(1, all_new_count)),
                value=min(200, all_new_count),
                step=25,
                key="sq_continue_new_triage_n",
                help="How many new/untriaged queue rows to process from the whole queue, independent of visible filters.",
            ))
            continue_use_crawl4ai = continue_cols[1].checkbox(
                "Crawl4AI",
                value=st.session_state.get("sq_use_crawl4ai_triage", False),
                key="sq_continue_new_triage_crawl4ai",
                help="Use rendered-page fallback for this continuation run.",
            )
            continue_ids = _source_queue_new_candidate_ids(all_new_items, limit=continue_n)
            continue_cols[2].metric("Will triage", len(continue_ids))
            st.code(
                _source_queue_triage_command(
                    limit=len(continue_ids) or 1,
                    force=False,
                    use_crawl4ai=continue_use_crawl4ai,
                    item_ids=continue_ids,
                ),
                language="bash",
            )
            if st.button(
                "Continue triage on new queue items",
                key="sq_continue_new_triage_btn",
                disabled=triage_locked or not continue_ids,
                type="primary",
                help="Starts a background triage job for new/untriaged rows across the whole queue.",
            ):
                try:
                    st.session_state[triage_job_key] = _start_source_queue_triage_job(
                        item_ids=continue_ids,
                        limit=len(continue_ids),
                        force=False,
                        use_crawl4ai=continue_use_crawl4ai,
                        label="source-queue-triage-all-new",
                    )
                except RuntimeError as exc:
                    st.error(str(exc))
                st.rerun()

    if not items:
        st.info("No items match the current filter.")
        return
    visible_triage_history = _source_queue_visible_history_map(
        db,
        [item.id for item in items],
        limit_per_item=8,
    )
    visible_triage_select_keys = {item.id: f"sq_triage_select_{item.id}" for item in items}
    selected_retriage_items = [
        item for item in items
        if item.status in _SOURCE_QUEUE_RETRIAGE_STATUSES
        and bool(st.session_state.get(visible_triage_select_keys[item.id], False))
    ]

    with st.expander("Rendered fallback / terminal triage command", expanded=False):
        use_crawl4ai_triage = st.checkbox(
            "Use Crawl4AI rendered-page fallback for this triage/retry action",
            value=False,
            key="sq_use_crawl4ai_triage",
            help=(
                "Opt-in browser rendering for public pages where Trafilatura/httpx/Wayback fail. "
                "It records provenance and still holds Cloudflare/CAPTCHA/login challenge pages."
            ),
        )
        st.caption(
            "Crawl4AI is useful for browser-rendered public pages. It is not a bypass for "
            "Cloudflare challenges, CAPTCHAs, logins, or paywalls; those stay held for manual capture."
        )
        preview_new_items = [i for i in items if i.status == "new"][:int(show_limit)]
        preview_retry_items = [
            i for i in items
            if i.status == "triaged" and not i.overnight_batch_safe and str(i.routing_reason or "").strip()
        ][:int(show_limit)]
        st.markdown("Copy-paste equivalent for new visible items:")
        st.code(
            _source_queue_triage_command(
                limit=len(preview_new_items) or int(show_limit),
                batch="" if batch_filter == "(all)" else batch_filter,
                force=False,
                use_crawl4ai=use_crawl4ai_triage,
                item_ids=[item.id for item in preview_new_items],
            ),
            language="bash",
        )
        st.markdown("Copy-paste equivalent for retrying visible held/triaged items:")
        st.code(
            _source_queue_triage_command(
                limit=len(preview_retry_items) or int(show_limit),
                batch="" if batch_filter == "(all)" else batch_filter,
                force=True,
                use_crawl4ai=use_crawl4ai_triage,
                item_ids=[item.id for item in preview_retry_items],
            ),
            language="bash",
        )

    recent_history = list_triage_history(db, limit=25)
    if recent_history:
        with st.expander("Recent triage attempts", expanded=False):
            st.dataframe(
                [
                    {
                        "when": row.get("triaged_at", "")[:19],
                        "item": row.get("item_id", ""),
                        "result": "parsed" if row.get("triage_succeeded") else "held",
                        "held_category": _source_queue_hold_category_from_history(row),
                        "rendered": bool(row.get("rendered_fallback")),
                        "safe": bool(row.get("overnight_batch_safe")),
                        "priority": row.get("priority", ""),
                        "llm": row.get("recommended_llm", ""),
                        "acquisition": row.get("acquisition_note", ""),
                        "reason": row.get("routing_reason", ""),
                    }
                    for row in recent_history
                ],
                hide_index=True,
                use_container_width=True,
            )

    comparison_rows = _source_queue_triage_comparison_rows(visible_triage_history)
    if comparison_rows:
        changed_rows = [row for row in comparison_rows if row["changed"]]
        with st.expander(
            f"Re-triage comparison for visible rows ({len(changed_rows)} changed)",
            expanded=False,
        ):
            st.caption(
                "Newest triage attempt compared with the previous attempt. This is useful after "
                "changing the triage model, because low/medium/high, safety, and route can legitimately change."
            )
            st.dataframe(
                comparison_rows,
                hide_index=True,
                use_container_width=True,
            )

    if not triage_status_rendered:
        _render_active_app_job_lock_panel(expanded=False)
    triage_locked = bool(_read_source_queue_triage_lock()) or bool(_read_app_job_lock())

    # ── Intentional re-triage controls ─────────────────────────────────────
    retriable_visible_ids = _source_queue_retriage_candidate_ids(
        items,
        "visible",
        limit=int(show_limit),
    )
    if retriable_visible_ids:
        with st.expander("🔁 Re-triage existing queue rows", expanded=False):
            st.caption(
                "Tick the **Triage** checkbox on queue rows below, then run re-triage here. "
                "Use this after changing the triage model or extraction fallback. Every run is append-only in "
                "`source_queue_triage_history`, so you can compare old and new recommendations."
            )
            rt_cols = st.columns([2, 1, 1])
            retriage_max = int(rt_cols[0].number_input(
                "Maximum rows for quick actions",
                min_value=1,
                max_value=200,
                value=min(50, len(retriable_visible_ids)),
                step=5,
                key="sq_retriage_max",
                help="Quick buttons only act on visible rows and stop at this limit.",
            ))
            retriage_use_crawl4ai = rt_cols[1].checkbox(
                "Crawl4AI",
                value=st.session_state.get("sq_use_crawl4ai_triage", False),
                key="sq_retriage_use_crawl4ai",
                help="Use rendered-page fallback during this re-triage run.",
            )
            rt_cols[2].metric("Visible triageable", len(retriable_visible_ids))

            select_cols = st.columns([1, 1, 1, 1, 2])
            if select_cols[0].button("Select visible", key="sq_retriage_select_visible"):
                for item_id in retriable_visible_ids[:retriage_max]:
                    st.session_state[visible_triage_select_keys[item_id]] = True
                st.rerun()
            for group, label, col in [
                ("low", "Select low", select_cols[1]),
                ("medium", "Select medium", select_cols[2]),
                ("held", "Select held", select_cols[3]),
            ]:
                if col.button(label, key=f"sq_retriage_select_{group}"):
                    for item_id in _source_queue_retriage_candidate_ids(items, group, limit=retriage_max):
                        st.session_state[visible_triage_select_keys[item_id]] = True
                    st.rerun()
            if select_cols[4].button("Clear triage checks", key="sq_retriage_clear_checks"):
                for key in visible_triage_select_keys.values():
                    st.session_state[key] = False
                st.rerun()

            selected_command_ids = [item.id for item in selected_retriage_items][:retriage_max]
            if selected_retriage_items:
                st.caption(
                    f"{len(selected_retriage_items)} visible row(s) checked for re-triage. "
                    f"This run will use the first {len(selected_command_ids)} by the current limit."
                )
                st.dataframe(
                    [
                        {
                            "item_id": item.id,
                            "priority": item.priority,
                            "status": item.status,
                            "safe": bool(item.overnight_batch_safe),
                            "type": item.doc_type_hint,
                            "url": item.url,
                        }
                        for item in selected_retriage_items[:retriage_max]
                    ],
                    hide_index=True,
                    use_container_width=True,
                )
            if selected_command_ids:
                st.code(
                    _source_queue_triage_command(
                        limit=len(selected_command_ids),
                        force=True,
                        use_crawl4ai=retriage_use_crawl4ai,
                        item_ids=selected_command_ids,
                    ),
                    language="bash",
                )
            selected_disabled = triage_locked or not selected_command_ids
            if st.button(
                "Re-triage selected",
                key="sq_retriage_selected_btn",
                disabled=selected_disabled,
                type="primary",
                help="Starts a background triage job for the selected visible rows.",
            ):
                try:
                    st.session_state[triage_job_key] = _start_source_queue_triage_job(
                        item_ids=selected_command_ids,
                        limit=len(selected_command_ids),
                        force=True,
                        use_crawl4ai=retriage_use_crawl4ai,
                        label="source-queue-retriage-selected",
                    )
                except RuntimeError as exc:
                    st.error(str(exc))
                st.rerun()

            quick_groups = [
                ("low", "Re-triage visible low"),
                ("medium", "Re-triage visible medium"),
                ("held", "Re-triage visible held/failed"),
            ]
            st.markdown("Quick re-triage groups")
            show_quick_commands = st.checkbox(
                "Show copy-paste commands for quick groups",
                value=False,
                key="sq_retriage_show_quick_commands",
            )
            quick_cols = st.columns(3)
            for idx, (group, label) in enumerate(quick_groups):
                group_ids = _source_queue_retriage_candidate_ids(
                    items,
                    group,
                    limit=retriage_max,
                )
                quick_cols[idx].caption(f"{len(group_ids)} row(s)")
                if show_quick_commands and group_ids:
                    quick_cols[idx].code(
                        _source_queue_triage_command(
                            limit=len(group_ids),
                            force=True,
                            use_crawl4ai=retriage_use_crawl4ai,
                            item_ids=group_ids,
                        ),
                        language="bash",
                    )

    # ── Bulk triage button ──────────────────────────────────────────────────
    new_count = sum(1 for i in items if i.status == "new")
    if new_count:
        triage_cols = st.columns([4, 1])
        triage_cols[0].caption(
            f"**{new_count} untriaged item(s) visible.** "
            "Triage fetches each URL, extracts a snippet, and asks the fast model "
            "for a doc-type / routing / priority recommendation. "
            "Triage does **not** ingest — it only updates queue metadata."
        )
        triage_n = triage_cols[1].number_input(
            "Max", min_value=1, max_value=200, value=min(new_count, 50),
            key="sq_triage_n",
            help="How many visible new items to triage in this click. Use filters/batches to keep long runs intentional.",
        )
        if triage_cols[0].button(
            "⚡ Run triage on new items",
            key="sq_triage_btn",
            disabled=triage_locked,
            help="Starts a background triage job and shows a live terminal log tail.",
        ):
            target = [i for i in items if i.status == "new"][:int(triage_n)]
            try:
                st.session_state[triage_job_key] = _start_source_queue_triage_job(
                    item_ids=[item.id for item in target],
                    limit=len(target),
                    force=False,
                    use_crawl4ai=use_crawl4ai_triage,
                    label="source-queue-triage-visible-new",
                )
            except RuntimeError as exc:
                st.error(str(exc))
            st.rerun()

    failed_triage_items = [
        i for i in items
        if i.status == "triaged" and not i.overnight_batch_safe and str(i.routing_reason or "").strip()
    ]
    if failed_triage_items:
        st.warning(
            f"{len(failed_triage_items)} visible triaged item(s) are held / not batch-safe. "
            "Retrying them is safe: failures stay held, and successful rows become usable suggestions."
        )
        held_counts = Counter(
            _source_queue_hold_category(item.url, item.routing_reason, item.source_type) or "other"
            for item in failed_triage_items
        )
        with st.expander("Held triage categories and retry command", expanded=False):
            st.dataframe(
                [
                    {
                        "held_category": _source_queue_hold_label(category) if category != "other" else "Other held triage",
                        "count": count,
                        "next_step": _source_queue_hold_next_step(category) if category != "other" else "Review the routing reason before retrying.",
                    }
                    for category, count in sorted(held_counts.items())
                ],
                hide_index=True,
                use_container_width=True,
            )
            retry_use_crawl4ai_preview = st.checkbox(
                "Use Crawl4AI rendered-page fallback for this held/failed retry",
                value=use_crawl4ai_triage,
                key="sq_retry_failed_use_crawl4ai",
                help=(
                    "Useful for public pages that need JavaScript rendering. It does not bypass "
                    "Cloudflare challenges, CAPTCHAs, logins, or paywalls."
                ),
            )
            retry_preview_items = failed_triage_items[: min(len(failed_triage_items), int(show_limit))]
            st.code(
                _source_queue_triage_command(
                    limit=len(retry_preview_items) or 1,
                    force=True,
                    use_crawl4ai=retry_use_crawl4ai_preview,
                    item_ids=[item.id for item in retry_preview_items],
                ),
                language="bash",
            )

        retry_cols = st.columns([3, 1, 1])
        retry_cols[0].caption(
            f"**{len(failed_triage_items)} failed triage item(s) visible.** "
            "Retry re-fetches each URL and asks the triage model again. It does not ingest."
        )
        retry_n = retry_cols[1].number_input(
            "Retry max", min_value=1, max_value=200,
            value=min(len(failed_triage_items), 50),
            key="sq_retry_failed_n",
            help="How many visible held/failed triage items to retry in this click.",
        )
        retry_use_crawl4ai = retry_cols[2].checkbox(
            "Crawl4AI",
            value=st.session_state.get("sq_retry_failed_use_crawl4ai", use_crawl4ai_triage),
            key="sq_retry_failed_use_crawl4ai_inline",
            help="Use rendered-page fallback for this retry.",
        )
        if retry_cols[0].button(
            "🔁 Retry held/failed triage",
            key="sq_retry_failed_btn",
            disabled=triage_locked,
            help="Starts a background retry job for visible held/failed triage rows.",
        ):
            target = failed_triage_items[:int(retry_n)]
            try:
                st.session_state[triage_job_key] = _start_source_queue_triage_job(
                    item_ids=[item.id for item in target],
                    limit=len(target),
                    force=True,
                    use_crawl4ai=retry_use_crawl4ai,
                    label="source-queue-triage-retry-held",
                )
            except RuntimeError as exc:
                st.error(str(exc))
            st.rerun()

    # ── Suggested Mac Studio source-offload batch ─────────────────────────
    if "sq_source_batch_package_id" not in st.session_state:
        st.session_state["sq_source_batch_package_id"] = _source_batch_default_package_id()

    with st.expander("🌙 Suggest Mac Studio source-offload batch", expanded=False):
        st.caption(
            "Automatically selects the next overnight-safe queue items using the same guarded "
            "`batch-plan` rules, then builds a source-offload archive for the Mac Studio. "
            "The queue is not marked ingested here."
        )
        if st.button("New package id", key="sq_source_batch_new_package_id"):
            st.session_state["sq_source_batch_package_id"] = _source_batch_default_package_id()
            st.rerun()

        sb_cols = st.columns([1, 1, 1, 3])
        source_batch_mode = sb_cols[0].selectbox(
            "Selection",
            ["Priority order", "Priority mix"],
            key="sq_source_batch_mode",
            help=(
                "Priority order keeps the existing high→medium→low behavior. "
                "Priority mix lets you deliberately sample across priority levels."
            ),
        )
        source_host_cap = int(sb_cols[1].number_input(
            "Max / website",
            min_value=0,
            max_value=MAX_BATCH_LIMIT,
            value=0,
            step=1,
            key="sq_source_batch_host_cap",
            help="0 allows clusters from the same hostname; 1 maximizes website diversity.",
        ))
        if source_batch_mode == "Priority order":
            source_batch_limit = int(sb_cols[2].number_input(
                "Items",
                min_value=1,
                max_value=MAX_BATCH_LIMIT,
                value=min(10, MAX_BATCH_LIMIT),
                step=1,
                key="sq_source_batch_limit",
                help=f"Maximum safe items to package. Hard cap is {MAX_BATCH_LIMIT}.",
            ))
            source_batch_priority = st.selectbox(
                "Priority filter",
                ["(all)", "high", "medium", "low"],
                key="sq_source_batch_priority",
                help="Optional priority filter for the suggested Mac Studio batch.",
            )
            source_priority_arg = "" if source_batch_priority == "(all)" else source_batch_priority
            source_priority_mix = None
        else:
            mix_cols = st.columns(3)
            source_priority_mix = {
                "high": int(mix_cols[0].number_input(
                    "High priority",
                    min_value=0,
                    max_value=MAX_BATCH_LIMIT,
                    value=3,
                    step=1,
                    key="sq_source_batch_mix_high",
                )),
                "medium": int(mix_cols[1].number_input(
                    "Medium priority",
                    min_value=0,
                    max_value=MAX_BATCH_LIMIT,
                    value=4,
                    step=1,
                    key="sq_source_batch_mix_medium",
                )),
                "low": int(mix_cols[2].number_input(
                    "Low priority",
                    min_value=0,
                    max_value=MAX_BATCH_LIMIT,
                    value=3,
                    step=1,
                    key="sq_source_batch_mix_low",
                )),
            }
            source_batch_limit = min(MAX_BATCH_LIMIT, sum(source_priority_mix.values()) or 1)
            source_priority_arg = ""
            st.caption(
                f"Priority mix target: {source_priority_mix['high']} high, "
                f"{source_priority_mix['medium']} medium, {source_priority_mix['low']} low "
                f"(max {source_batch_limit} item(s))."
            )
        source_package_id = sb_cols[3].text_input(
            "Package ID",
            key="sq_source_batch_package_id",
            help="Created under source_offload/inbox and archived to the Syncthing transfer folder.",
        ).strip()
        include_rendered_source_batch = st.checkbox(
            "Include Crawl4AI/rendered-fallback recovered items",
            value=True,
            key="sq_source_batch_include_rendered",
            help=(
                "Leave on for normal runs. Turn off for a conservative batch that excludes "
                "otherwise-safe rows whose latest triage was recovered through browser rendering."
            ),
        )
        source_manifest = plan_batch(
            db,
            limit=source_batch_limit,
            priority_filter=source_priority_arg,
            priority_mix=source_priority_mix,
            max_per_host=source_host_cap,
        )
        source_manifest = _source_manifest_apply_rendered_policy(
            source_manifest,
            db,
            include_rendered=include_rendered_source_batch,
        )

        source_mcols = st.columns(4)
        source_mcols[0].metric("Candidates", source_manifest.total_candidates)
        source_mcols[1].metric("Selected", source_manifest.total_included)
        source_mcols[2].metric("Excluded", source_manifest.total_excluded)
        source_mcols[3].metric("Limit", source_manifest.limit)
        for note in source_manifest.notes:
            st.warning(note)

        if source_manifest.included:
            st.dataframe(
                _source_manifest_item_rows(source_manifest.included),
                hide_index=True,
                use_container_width=True,
            )
        else:
            st.info("No safe queue items are available for a Mac Studio batch yet.")

        if source_manifest.excluded:
            with st.expander("Excluded items and reasons", expanded=False):
                st.dataframe(
                    _source_manifest_item_rows(source_manifest.excluded[:100]),
                    hide_index=True,
                    use_container_width=True,
                )

        transfer_out = _source_to_mac_studio_dir()
        st.caption(
            f"Archive destination: `{transfer_out}`. "
            "The Mac Studio Worker page will see the `.tar.gz` once Syncthing finishes."
        )
        build_disabled = not source_manifest.included or not source_package_id
        if st.button(
            "Build source package archive for Mac Studio",
            key="sq_source_batch_build_archive",
            type="primary",
            disabled=build_disabled,
        ):
            try:
                result = _source_build_and_archive_batch(
                    db,
                    config,
                    source_manifest,
                    package_id=source_package_id,
                    transfer_dir=transfer_out,
                )
            except Exception as exc:  # noqa: BLE001 — user-facing refusal
                st.error(f"Could not build source-offload batch: {exc}")
            else:
                st.success(
                    f"Built `{result['package_id']}` with {result['item_count']} item(s) "
                    "and wrote the transfer archive."
                )
                st.code(
                    "\n".join([
                        f"Package: {result['package_dir']}",
                        f"Archive: {result['archive_path']}",
                        f"Checksum: {result['sha256_path']}",
                    ]),
                    language="text",
                )
                if result["warnings"]:
                    for warning in result["warnings"]:
                        st.warning(warning)
                st.caption("Next: open the Mac Studio Worker page and unpack/run this package there.")

    # ── Batch workbench ───────────────────────────────────────────────────
    visible_select_keys = {item.id: f"sq_select_{item.id}" for item in items}
    selected_items = [
        item for item in items
        if bool(st.session_state.get(visible_select_keys[item.id], False))
    ]
    if "sq_batch_workbench_group" not in st.session_state:
        st.session_state["sq_batch_workbench_group"] = _default_source_queue_batch_group()

    with st.expander("🧪 Batch selected queue items", expanded=bool(selected_items)):
        st.caption(
            "Tick rows manually or auto-fill a temporary batch group from safe queue items, "
            "then rehearse or run the batch from here. Live batch runs include enrichment by default."
        )
        saved_batch_rows = [
            dict(row) for row in db.execute(
                """
                SELECT
                    batch_group AS batch,
                    COUNT(*) AS total,
                    SUM(CASE WHEN status IN ('triaged', 'ready_to_ingest') THEN 1 ELSE 0 END) AS triaged_or_ready,
                    SUM(CASE WHEN status = 'ingested' THEN 1 ELSE 0 END) AS ingested
                FROM source_queue
                WHERE batch_group != ''
                GROUP BY batch_group
                ORDER BY batch_group
                """
            ).fetchall()
        ]
        if saved_batch_rows:
            with st.expander("Saved batch groups", expanded=False):
                st.caption(
                    "These are queue rows that already have a batch group saved. "
                    "Pick one in the Saved batch dropdown below to rehearse or run it."
                )
                st.dataframe(saved_batch_rows, hide_index=True, use_container_width=True)

        select_cols = st.columns([1, 1, 3])
        if select_cols[0].button("Select visible triaged/ready", key="sq_batch_select_visible"):
            for item in items:
                st.session_state[visible_select_keys[item.id]] = (
                    item.status in ("triaged", "ready_to_ingest")
                )
            st.rerun()
        if select_cols[1].button("Clear visible selection", key="sq_batch_clear_visible"):
            for key in visible_select_keys.values():
                st.session_state[key] = False
            st.rerun()
        select_cols[2].caption(
            f"{len(selected_items)} visible item(s) selected. "
            "Batch planning still excludes unsafe, untriaged, already-ingested, or review-flagged items."
        )

        batch_cols = st.columns([3, 1, 1, 1, 2])
        saved_batch_groups = batch_groups(db)
        saved_batch_options = ["New / custom"] + saved_batch_groups
        current_batch_group = st.session_state.get("sq_batch_workbench_group", "")
        saved_batch_index = (
            saved_batch_options.index(current_batch_group)
            if current_batch_group in saved_batch_options else 0
        )
        saved_batch_choice = batch_cols[0].selectbox(
            "Saved batch",
            saved_batch_options,
            index=saved_batch_index,
            key="sq_batch_saved_group",
            help=(
                "Pick an existing saved batch group, or choose New / custom to "
                "create a fresh temporary batch from checked rows."
            ),
        )
        if saved_batch_choice == "New / custom":
            batch_group_name = batch_cols[0].text_input(
                "Batch group",
                key="sq_batch_workbench_group",
                help=(
                    "Temporary label used by the batch runner. Use a fresh name when you "
                    "want exactly the checked rows, or reuse a name to append more rows."
                ),
            ).strip()
        else:
            batch_group_name = saved_batch_choice
            batch_cols[0].caption(f"Using saved batch group: `{batch_group_name}`")
        batch_limit = int(batch_cols[1].number_input(
            "Limit",
            min_value=1,
            max_value=MAX_BATCH_LIMIT,
            value=min(3, MAX_BATCH_LIMIT),
            step=1,
            key="sq_batch_workbench_limit",
            help=f"Maximum items to process. Hard cap is {MAX_BATCH_LIMIT}.",
        ))
        batch_priority = batch_cols[2].selectbox(
            "Priority",
            ["(all)", "high", "medium", "low"],
            key="sq_batch_workbench_priority",
            help="Optional priority filter applied during batch planning.",
        )
        include_enrich = batch_cols[3].checkbox(
            "Enrich",
            value=True,
            key="sq_batch_workbench_enrich",
            help="Keep checked for normal pilot runs. Unchecking passes --no-enrich.",
        )
        enrich_model_options = list(dict.fromkeys([
            "core-gemma",
            config.litelm_enrichment_model_alt,
            config.litelm_enrichment_model,
            "lexicon-llm",
        ]))
        enrich_model = batch_cols[4].selectbox(
            "Enrich model",
            enrich_model_options,
            key="sq_batch_workbench_enrich_model",
            disabled=not include_enrich,
            help=(
                "Model alias passed to --enrich-model. core-gemma is the safer "
                "default for richer Stage 3c proposal extraction."
            ),
        )
        priority_arg = "" if batch_priority == "(all)" else batch_priority
        auto_cols = st.columns([1, 1, 2])
        local_batch_mode = auto_cols[0].selectbox(
            "Auto-fill mode",
            ["Priority order", "Priority mix"],
            key="sq_batch_auto_mode",
            help=(
                "Priority order uses the normal high→medium→low planner. Priority mix "
                "samples deliberately across priority tiers."
            ),
        )
        local_host_cap = int(auto_cols[1].number_input(
            "Max / website",
            min_value=0,
            max_value=MAX_BATCH_LIMIT,
            value=0,
            step=1,
            key="sq_batch_workbench_host_cap",
            help="0 disables same-website diversity; 1 allows at most one URL per hostname.",
        ))
        include_rendered_local_batch = st.checkbox(
            "Include Crawl4AI/rendered-fallback recovered items",
            value=True,
            key="sq_batch_workbench_include_rendered",
            help=(
                "Leave on for normal runs. Turn off to keep this MacBook-local batch to "
                "ordinary Trafilatura/httpx/Wayback triage recoveries only."
            ),
        )
        local_priority_mix = None
        if local_batch_mode == "Priority mix":
            mix_cols = st.columns(3)
            local_priority_mix = {
                "high": int(mix_cols[0].number_input(
                    "High priority",
                    min_value=0,
                    max_value=MAX_BATCH_LIMIT,
                    value=3,
                    step=1,
                    key="sq_batch_workbench_mix_high",
                )),
                "medium": int(mix_cols[1].number_input(
                    "Medium priority",
                    min_value=0,
                    max_value=MAX_BATCH_LIMIT,
                    value=4,
                    step=1,
                    key="sq_batch_workbench_mix_medium",
                )),
                "low": int(mix_cols[2].number_input(
                    "Low priority",
                    min_value=0,
                    max_value=MAX_BATCH_LIMIT,
                    value=3,
                    step=1,
                    key="sq_batch_workbench_mix_low",
                )),
            }
            batch_limit = min(MAX_BATCH_LIMIT, sum(local_priority_mix.values()) or 1)
            priority_arg = ""
            auto_cols[2].caption(
                f"Auto-fill target: {local_priority_mix['high']} high, "
                f"{local_priority_mix['medium']} medium, {local_priority_mix['low']} low "
                f"(max {batch_limit} item(s))."
            )
        else:
            auto_cols[2].caption(
                "Auto-fill uses the same safety gates as batch-plan; it does not ingest."
            )

        auto_fill_disabled = not batch_group_name
        if st.button(
            "Auto-fill this batch group from safe queue",
            key="sq_batch_auto_fill",
            disabled=auto_fill_disabled,
            help=(
                "Selects safe queue items using the current priority/mix and max/website "
                "settings, then writes this batch group onto those rows. It does not ingest."
            ),
        ):
            auto_manifest = plan_batch(
                db,
                limit=batch_limit,
                priority_filter=priority_arg,
                priority_mix=local_priority_mix,
                max_per_host=local_host_cap,
            )
            auto_manifest = _source_manifest_apply_rendered_policy(
                auto_manifest,
                db,
                include_rendered=include_rendered_local_batch,
            )
            changed = 0
            for manifest_item in auto_manifest.included:
                if update_notes(db, manifest_item.item_id, batch_group=batch_group_name):
                    changed += 1
            if changed:
                st.success(
                    f"Auto-filled `{batch_group_name}` with {changed} safe item(s). "
                    "Review the plan below, then run rehearsal or live batch."
                )
            else:
                st.warning("No safe queue items were available for this auto-fill plan.")
            st.rerun()

        assign_disabled = not selected_items or not batch_group_name
        if st.button(
            "Assign checked rows to this batch group",
            key="sq_batch_assign_selected",
            disabled=assign_disabled,
            help="Writes the batch group onto the selected queue rows. It does not ingest yet.",
        ):
            changed = 0
            for item in selected_items:
                if update_notes(db, item.id, batch_group=batch_group_name):
                    changed += 1
            st.success(f"Assigned {changed} selected item(s) to `{batch_group_name}`.")
            st.rerun()

        if batch_group_name:
            manifest = plan_batch(
                db,
                batch_group=batch_group_name,
                limit=batch_limit,
                priority_filter=priority_arg,
                priority_mix=local_priority_mix,
                max_per_host=local_host_cap,
            )
            manifest = _source_manifest_apply_rendered_policy(
                manifest,
                db,
                include_rendered=include_rendered_local_batch,
            )
            mcols = st.columns(4)
            mcols[0].metric("Candidates", manifest.total_candidates)
            mcols[1].metric("Eligible", manifest.total_included)
            mcols[2].metric("Excluded", manifest.total_excluded)
            mcols[3].metric("Limit", manifest.limit)
            if manifest.priority_mix:
                st.caption(f"Priority mix: `{manifest.priority_mix}`")
            if manifest.max_per_host:
                st.caption(f"Same-website cap: max `{manifest.max_per_host}` per host")
            if manifest.notes:
                for note in manifest.notes:
                    st.warning(note)
            if manifest.included:
                st.dataframe(
                    [
                        {
                            "item_id": item.item_id,
                            "priority": item.priority,
                            "llm": item.recommended_llm or "litelm",
                            "type": item.doc_type_hint or item.status,
                            "url": item.url,
                        }
                        for item in manifest.included
                    ],
                    hide_index=True,
                    use_container_width=True,
                )
            if manifest.excluded:
                missing_file_reasons = {
                    "needs_attachment:source_file",
                    "source_file_not_found",
                }
                missing_file_count = sum(
                    1 for item in manifest.excluded
                    if item.exclusion_reason in missing_file_reasons
                )
                if missing_file_count:
                    st.warning(
                        f"{missing_file_count} selected/planned item(s) need a source-file fix before batching. "
                        "Open the row's Source bundle panel, attach/download the PDF or source file, then re-run rehearsal."
                    )
                with st.expander("Excluded rows and reasons", expanded=bool(missing_file_count)):
                    st.dataframe(
                        _source_manifest_item_rows(manifest.excluded[:100]),
                        hide_index=True,
                        use_container_width=True,
                    )
            if not manifest.included and not selected_items:
                st.info("Tick queue rows below, then assign them to this batch group.")
            elif not manifest.included:
                st.warning(
                    "No eligible items in this batch group yet. Assign checked rows, "
                    "or triage/review the excluded items first."
                )

            command_preview = _batch_run_command(
                batch_group=batch_group_name,
                limit=batch_limit,
                priority=priority_arg,
                priority_mix=local_priority_mix,
                max_per_host=local_host_cap,
                execute=True,
                run_enrich=include_enrich,
                enrich_model=enrich_model if include_enrich else "",
            )
            with st.expander("Live command preview", expanded=False):
                st.code(shlex.join(command_preview), language="bash")

            job_key = f"sq_batch_job_{re.sub(r'[^a-zA-Z0-9_.-]+', '-', batch_group_name)}"
            job_active = _render_batch_run_job(job_key)
            active_job = st.session_state.get(job_key) or {}
            active_mode = active_job.get("mode", "")
            live_job_active = bool(job_active and active_mode == "live")
            active_heavy_job = _read_app_job_lock()
            if active_heavy_job and str(active_heavy_job.get("pid", "")) != str(active_job.get("pid", "")):
                st.warning(
                    _format_app_job_lock(active_heavy_job)
                    + " Live batching is locked until that job finishes."
                )
            run_cols = st.columns([1, 1, 2])
            if run_cols[0].button(
                "Run rehearsal",
                key="sq_batch_rehearsal",
                disabled=live_job_active or not batch_group_name,
                help="Dry run only: writes a ledger/report and confirms which items are eligible. Does not ingest.",
            ):
                st.session_state[job_key] = _start_batch_run_job(
                    batch_group=batch_group_name,
                    limit=batch_limit,
                    priority=priority_arg,
                    priority_mix=local_priority_mix,
                    max_per_host=local_host_cap,
                    execute=False,
                    run_enrich=include_enrich,
                    enrich_model=enrich_model if include_enrich else "",
                )
                st.rerun()
            if run_cols[1].button(
                "Start live batch",
                key="sq_batch_live",
                type="primary",
                disabled=live_job_active or bool(active_heavy_job) or manifest.total_included == 0,
                help=(
                    "Real run: executes ingest/upload and Stage 3c enrichment for eligible items. "
                    "A completed or running rehearsal does not block this."
                ),
            ):
                st.session_state[job_key] = _start_batch_run_job(
                    batch_group=batch_group_name,
                    limit=batch_limit,
                    priority=priority_arg,
                    priority_mix=local_priority_mix,
                    max_per_host=local_host_cap,
                    execute=True,
                    run_enrich=include_enrich,
                    enrich_model=enrich_model if include_enrich else "",
                )
                st.rerun()
            run_cols[2].caption(
                "Live mode runs preflight checks, ingests eligible items, uploads them, "
                "and runs enrichment when Enrich is checked."
            )
            _render_workflow_batch_panel(
                config,
                db,
                batch_group=batch_group_name,
                limit=batch_limit,
                key_prefix=job_key,
                selected_item_ids=[item.id for item in selected_items],
            )

        if not batch_group_name and selected_items:
            _render_workflow_batch_panel(
                config,
                db,
                batch_group="",
                limit=min(15, len(selected_items)),
                key_prefix="sq_explicit_workflow",
                selected_item_ids=[item.id for item in selected_items],
            )

    # ── Queue table ────────────────────────────────────────────────────────
    _STATUS_EMOJI = {
        "new": "🆕", "triaged": "🔬", "ready_to_ingest": "✳️",
        "ingested": "📦", "skipped": "⏭",
    }
    _PRIO_EMOJI = {"high": "🔴", "medium": "🟡", "low": "⚪", "skip": "⛔"}

    st.caption(f"Showing {len(items)} item(s)")

    for item in items:
        s_emoji = _STATUS_EMOJI.get(item.status, "")
        p_emoji = _PRIO_EMOJI.get(item.priority, "")
        header = (
            f"{s_emoji} {p_emoji}  "
            f"**{item.url[:80]}{'…' if len(item.url) > 80 else ''}**"
        )
        if item.title:
            header += f"  ·  {item.title[:50]}"
        if item.corpus_doc_id:
            header += f"  ⚠️ corpus: `{item.corpus_doc_id}`"
        elif item.batch_group:
            header += f"  `{item.batch_group}`"
        if item.needs_source_file and not item.source_file_path:
            header += "  📎 needs file"
        elif item.source_file_path:
            header += "  📎 file attached"

        with st.expander(header, expanded=False):
            meta_col, action_col = st.columns([3, 1])

            with meta_col:
                st.markdown(f"**URL:** {item.url}")

                # Status line with human explanation
                status_label = _STATUS_LABELS.get(item.status, item.status)
                row1 = (
                    f"Status: **{status_label}** · Priority: `{item.priority}` · "
                    f"Type: `{item.source_type}` · LLM: `{item.recommended_llm or '—'}`"
                )
                if item.doc_type_hint and item.doc_type_hint != "unknown":
                    row1 += f" · doc hint: `{item.doc_type_hint}`"
                st.caption(row1)

                # Triage provenance
                if item.triage_model_used:
                    st.caption(f"Triaged by: `{item.triage_model_used}`"
                               + (f"  ·  {item.triaged_at[:10]}" if item.triaged_at else ""))
                if item.routing_reason:
                    st.caption(f"Triage reason: {item.routing_reason}")
                if item.needs_source_file and not item.source_file_path:
                    st.warning(
                        "📎 This source is marked as needing a local/full-text file before Mac Studio batching. "
                        "Attach the PDF/DOC/EPUB below, or clear the requirement if the URL itself is enough."
                    )
                elif item.source_file_path:
                    st.success(
                        f"📎 Attached source file: `{item.source_file_path}`. "
                        "Mac Studio source-offload batches will process this file and also include the URL as a companion source."
                    )
                triage_history = visible_triage_history.get(item.id, [])
                if triage_history:
                    with st.expander(f"Triage history ({len(triage_history)} recent)", expanded=False):
                        st.dataframe(
                            [
                                {
                                    "when": row.get("triaged_at", "")[:19],
                                    "model": row.get("model_name", ""),
                                    "result": "parsed" if row.get("triage_succeeded") else "held",
                                    "held_category": _source_queue_hold_category_from_history(row),
                                    "rendered": bool(row.get("rendered_fallback")),
                                    "safe": bool(row.get("overnight_batch_safe")),
                                    "priority": row.get("priority", ""),
                                    "llm": row.get("recommended_llm", ""),
                                    "acquisition": row.get("acquisition_note", ""),
                                    "reason": row.get("routing_reason", ""),
                                }
                                for row in triage_history
                            ],
                            hide_index=True,
                            use_container_width=True,
                        )
                hold_category = _source_queue_hold_category(
                    item.url,
                    item.routing_reason,
                    item.source_type,
                )
                if hold_category and item.status in ("new", "triaged"):
                    st.warning(
                        f"**{_source_queue_hold_label(hold_category)}**  \n"
                        f"{_source_queue_hold_next_step(hold_category)}"
                    )
                    with st.expander("Manual capture / saved snapshot command", expanded=False):
                        st.caption(
                            "If the real content is visible in your browser, save it as HTML or PDF, "
                            "then build a source-offload package that preserves this queue item and "
                            "uses the saved file as the processable source."
                        )
                        snapshot_path = st.text_input(
                            "Saved HTML/PDF path",
                            value="",
                            placeholder="/Users/sergiogalvaoroxo/Downloads/source-page.html",
                            key=f"sq_snapshot_path_{item.id}",
                        )
                        snapshot_package = st.text_input(
                            "Package ID",
                            value=f"snapshot-{item.id}",
                            key=f"sq_snapshot_package_{item.id}",
                        )
                        st.code(
                            _source_queue_snapshot_command(item.id, snapshot_path, snapshot_package),
                            language="bash",
                        )

                with st.expander("Source bundle / attached PDF or file", expanded=bool(item.needs_source_file and not item.source_file_path)):
                    st.caption(
                        "Use this when the queue URL is a landing page, DOI, Google Books page, journal page, "
                        "or direct download link but the actual analyzable source is a local PDF/DOC/EPUB. "
                        "When attached, Source Offload sends the file to the Mac Studio and also ingests the URL separately as context."
                    )
                    attach_cols = st.columns([1, 1])
                    attach_needed = attach_cols[0].checkbox(
                        "Require file before batching",
                        value=bool(item.needs_source_file),
                        key=f"sq_attach_needed_{item.id}",
                        help="When checked, batch planning excludes this row until a local file path is saved.",
                    )
                    relation_options = [
                        "full_text_pdf",
                        "full_text_file",
                        "downloaded_pdf",
                        "saved_snapshot",
                        "supplement",
                        "metadata_companion",
                    ]
                    current_relation = item.source_file_relation or (
                        "full_text_pdf" if item.source_type == "pdf" else "full_text_file"
                    )
                    relation_index = (
                        relation_options.index(current_relation)
                        if current_relation in relation_options else 1
                    )
                    attach_relation = attach_cols[1].selectbox(
                        "Relationship",
                        relation_options,
                        index=relation_index,
                        key=f"sq_attach_relation_{item.id}",
                    )
                    attach_path = st.text_input(
                        "Local file path on this MacBook",
                        value=item.source_file_path or "",
                        placeholder="/Users/sergiogalvaoroxo/Downloads/full-text.pdf",
                        key=f"sq_attach_path_{item.id}",
                    )
                    attach_source_url = st.text_input(
                        "Direct file/source URL (optional)",
                        value=item.source_file_url or "",
                        placeholder="https://publisher.example/full-text.pdf",
                        key=f"sq_attach_source_url_{item.id}",
                        help="Optional direct PDF/download URL. The queue URL above remains the landing/context URL.",
                    )
                    attach_note = st.text_area(
                        "Attachment note",
                        value=item.source_file_note or "",
                        placeholder="Downloaded from publisher page; full book PDF.",
                        key=f"sq_attach_note_{item.id}",
                        height=80,
                    )
                    attach_path_norm = _normalise_local_source_path(attach_path)
                    if attach_path_norm and not Path(attach_path_norm).expanduser().is_file():
                        st.warning(
                            "The path does not exist locally yet. If it is in OneDrive/iCloud, download it first "
                            "or mark it as always available on this device."
                        )
                    if st.button("Save source bundle", key=f"sq_attach_save_{item.id}"):
                        update_source_file_attachment(
                            db,
                            item.id,
                            needs_source_file=attach_needed,
                            source_file_path=attach_path_norm,
                            source_file_relation=attach_relation,
                            source_file_url=attach_source_url,
                            source_file_note=attach_note,
                        )
                        st.rerun()

                # Corpus association — prominent warning
                if item.corpus_doc_id:
                    st.warning(
                        f"⚠️ **Already in corpus as `{item.corpus_doc_id}`**  ·  "
                        "Confirm with *Mark ingested* if this is the same document, "
                        "or *Skip* if you do not want to re-ingest it.",
                        icon="⚠️",
                    )

                if item.notes:
                    st.caption(f"Notes: {item.notes}")
                if item.tags:
                    st.caption(f"Tags: {item.tags}")
                if item.batch_group:
                    st.caption(f"Batch: {item.batch_group}")
                st.caption(f"Added: {item.added_at[:10]}  ·  ID: `{item.id}`")
                note_text = st.text_area(
                    "Research note",
                    value=item.notes or "",
                    height=80,
                    key=f"sq_note_text_{item.id}",
                    placeholder="Why this source matters, where it came from, or what to remember later.",
                )
                if st.button("Save note", key=f"sq_note_save_{item.id}"):
                    update_notes(db, item.id, notes=note_text)
                    st.rerun()

                # Ingest command — ONLY for ready_to_ingest
                if item.status == "ready_to_ingest":
                    llm_flag = item.recommended_llm or "litelm"
                    st.caption("**Ready for ingest** — copy command and run in terminal:")
                    st.code(
                        f'python -m runner ingest "{item.url}" --llm {llm_flag}',
                        language="bash",
                    )
                elif item.status == "ingested":
                    st.caption(
                        f"✅ Ingested as corpus doc `{item.corpus_doc_id or '(id unknown)'}` — "
                        "no further action needed."
                    )

            with action_col:
                st.checkbox(
                    "Batch",
                    key=visible_select_keys[item.id],
                    help="Tick this row, then use 'Batch selected queue items' above.",
                )
                st.checkbox(
                    "Triage",
                    key=visible_triage_select_keys[item.id],
                    disabled=item.id not in retriable_visible_ids,
                    help=(
                        "Tick this row, then use 'Re-triage existing queue rows' above. "
                        "This is separate from ingest batching."
                    ),
                )

                # Status transitions
                if item.status in ("new", "triaged"):
                    if st.button("🔁 Retry triage", key=f"sq_retry_{item.id}",
                                  disabled=triage_locked,
                                  help="Start a background retry job for this URL. Does not ingest."):
                        try:
                            st.session_state[triage_job_key] = _start_source_queue_triage_job(
                                item_ids=[item.id],
                                limit=1,
                                force=True,
                                use_crawl4ai=use_crawl4ai_triage,
                                label=f"source-queue-triage-{item.id}",
                            )
                        except RuntimeError as exc:
                            st.error(str(exc))
                        st.rerun()
                    if st.button("✳️ Ready for ingest", key=f"sq_ready_{item.id}",
                                  help="Mark as approved — still requires running runner ingest"):
                        update_status(db, item.id, "ready_to_ingest")
                        st.rerun()
                    if st.button("⏭ Skip", key=f"sq_skip_{item.id}"):
                        update_status(db, item.id, "skipped")
                        st.rerun()

                if item.status == "ready_to_ingest":
                    st.caption("Not ingested yet.\nRun the command shown →")
                    if st.button("↩ Back to triaged", key=f"sq_unready_{item.id}"):
                        update_status(db, item.id, "triaged" if item.triaged_at else "new")
                        st.rerun()
                    if st.button("⏭ Skip", key=f"sq_skip2_{item.id}"):
                        update_status(db, item.id, "skipped")
                        st.rerun()
                    if st.button("📦 Mark ingested", key=f"sq_ingest_{item.id}",
                                  help="Confirm that runner ingest was already run for this item"):
                        update_status(db, item.id, "ingested")
                        st.rerun()

                if item.status == "new" and item.corpus_doc_id:
                    if st.button("📦 Mark ingested", key=f"sq_corp_ingest_{item.id}",
                                  help="Confirm corpus association — mark as already ingested"):
                        update_status(db, item.id, "ingested")
                        st.rerun()

                if item.status == "skipped":
                    if st.button("↩ Restore to new", key=f"sq_restore_{item.id}"):
                        update_status(db, item.id, "new")
                        st.rerun()

                if item.status == "ingested":
                    if st.button("↩ Reopen", key=f"sq_reopen_{item.id}",
                                  help="Move back to new if you need to re-ingest"):
                        update_status(db, item.id, "new")
                        st.rerun()

                # Priority picker
                prio_opts = sorted(VALID_PRIORITIES)
                cur_prio_idx = prio_opts.index(item.priority) if item.priority in prio_opts else 0
                new_prio = st.selectbox(
                    "Priority",
                    prio_opts,
                    index=cur_prio_idx,
                    key=f"sq_prio_{item.id}",
                    label_visibility="collapsed",
                )
                if new_prio != item.priority:
                    update_priority(db, item.id, new_prio)
                    st.rerun()

                # Open URL
                st.markdown(f"[🔗 Open source]({item.url})")

                # Remove from queue (ingested/skipped only — corpus doc unaffected)
                if item.status in ("ingested", "skipped"):
                    if st.button("🗑 Remove from queue", key=f"sq_del_{item.id}",
                                  help="Remove entry from queue only — corpus document is NOT affected"):
                        delete_item(db, item.id)
                        st.rerun()

    st.caption(f"Queue DB: `{db_path}`")


# ---------------------------------------------------------------------------
# Offload Packages — Mac Studio offload lifecycle UX
# ---------------------------------------------------------------------------
#
# This page is a researcher-facing front end for the already-built offload
# pipeline (runner/pipeline/offload.py). It calls the pure pipeline functions
# directly for export / verify / move / import. It deliberately does NOT launch
# the Mac Studio worker: the worker must run on the Mac Studio against package
# files that live on that machine, so this page only displays copy-paste
# terminal commands for `offload-worker` / `offload-verify` / `offload-import`.

def _offload_root(config) -> Path:
    """Resolve the offload root (mirrors the CLI default: <exports_dir>/offload)."""
    return Path(config.exports_dir) / "offload"


def _offload_cli_command(verb: str, package_dir) -> list[str]:
    """Build a copy-paste terminal command for an offload CLI verb.

    Pure string builder — never executed from the app. The worker, in
    particular, is intentionally only ever shown as text for the researcher to
    run on the Mac Studio node.
    """
    return ["python3", "-m", "runner", verb, str(package_dir)]


def _offload_move_targets(state: str) -> list[str]:
    """Allowed lifecycle targets from ``state`` (sorted), per ALLOWED_TRANSITIONS."""
    from runner.pipeline.offload import ALLOWED_TRANSITIONS

    return sorted(ALLOWED_TRANSITIONS.get(state, frozenset()))


def _offload_browser_move_targets(state: str) -> list[str]:
    """Lifecycle targets offered as *normal* moves in the browser.

    ``outbox -> imported`` is intentionally excluded here: marking a package
    imported must only happen as the result of a successful confirmed import in
    the Import tab (which then calls ``transition_package_state`` itself, like
    the CLI). Offering it as a plain move would let a researcher mark a package
    imported without ever running ``offload-import``.
    """
    return [t for t in _offload_move_targets(state) if t != "imported"]


# Quarantine/retain targets that skip integrity verification on the way in.
_OFFLOAD_NO_VERIFY_TARGETS = frozenset({"failed", "archive"})


def _offload_import_allowed(state: str, dry_run_ok: bool, confirmed: bool) -> bool:
    """Gate the real import: outbox-only, dry-run succeeded, and confirmed."""
    return state == "outbox" and bool(dry_run_ok) and bool(confirmed)


def _offload_exportable_doc_ids(corpus_dir) -> list[str]:
    """Corpus doc IDs eligible for offload export.

    A document is eligible only when intake, preprocess metadata, and extracted
    text are all present — the same minimum ``build_analysis_package`` enforces.
    Pre-ingest items (e.g. Source Queue URLs) are intentionally excluded.
    """
    if not corpus_dir:
        return []
    root = Path(corpus_dir)
    if not root.exists():
        return []
    out: list[str] = []
    for doc_dir in sorted(root.iterdir()):
        if not doc_dir.is_dir() or doc_dir.name.startswith("."):
            continue
        if not (doc_dir / "intake.json").exists():
            continue
        if not (doc_dir / "preprocess.json").exists():
            continue
        if not ((doc_dir / "extracted.txt").exists() or (doc_dir / "extracted.md").exists()):
            continue
        out.append(doc_dir.name)
    return out


def _offload_package_rows(offload_root) -> list[dict]:
    """Summarise every package across all lifecycle folders.

    Read-only filesystem scan — no network, no models, no mutation. Each row
    reports folder state, manifest state, folder/manifest consistency, document
    count, kind, and created_at. A package whose manifest fails to load is still
    listed with an ``error`` so it is never silently hidden.
    """
    from runner.pipeline.offload import (
        LIFECYCLE_STATES,
        load_manifest,
    )

    rows: list[dict] = []
    root = Path(offload_root)
    for state in LIFECYCLE_STATES:
        state_dir = root / state
        if not state_dir.exists():
            continue
        for pkg in sorted(state_dir.iterdir()):
            if not pkg.is_dir() or pkg.name.startswith("."):
                continue
            row = {
                "package_id": pkg.name,
                "folder_state": state,
                "path": str(pkg),
                "doc_count": None,
                "created_at": "",
                "package_kind": "",
                "manifest_state": "",
                "consistent": None,
                "error": "",
            }
            try:
                manifest = load_manifest(pkg)
                row["doc_count"] = len(manifest.documents)
                row["created_at"] = manifest.created_at
                row["package_kind"] = manifest.package_kind
                row["manifest_state"] = manifest.lifecycle_state
                row["consistent"] = manifest.lifecycle_state == state
            except Exception as exc:  # noqa: BLE001 — surfaced, never hidden
                row["error"] = str(exc)
            rows.append(row)
    return rows


def _offload_worker_lock_info(offload_root) -> dict | None:
    """Best-effort read of the Mac Studio worker PID lock, if present.

    Display-only. Never created, cleared, or trusted by this page.
    """
    path = Path(offload_root) / ".worker.lock"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"raw": path.read_text(encoding="utf-8", errors="replace")}


def _offload_verify_reports(state: str, pkg_dir, corpus_dir) -> list[dict]:
    """Verify reports to show for a package, in display order.

    Base package verification (``verify_package``) is always included. For
    ``outbox`` packages the returned **result** package is additionally verified
    (``verify_result_package``) so a bad ``result_manifest`` / result artifact
    cannot show "Verified OK" in the browser and then fail at dry-run import.
    Read-only — no network, no models, no mutation.
    """
    from runner.pipeline.offload import verify_package, verify_result_package

    reports: list[dict] = []
    try:
        base = verify_package(Path(pkg_dir))
    except Exception as exc:  # noqa: BLE001 — surfaced, never hidden
        base = {"ok": False, "package_id": "", "errors": [f"verify_package_raised:{exc}"]}
    reports.append({"title": "Base package verification", "report": base})

    if state == "outbox":
        try:
            result = verify_result_package(Path(pkg_dir), corpus_dir=Path(corpus_dir))
        except Exception as exc:  # noqa: BLE001
            result = {"ok": False, "package_id": "", "errors": [f"verify_result_package_raised:{exc}"]}
        reports.append({"title": "Result package verification", "report": result})

    return reports


def _render_offload_commands(pkg_dir: Path) -> None:
    """Show copy-paste terminal commands for a package (worker is text-only)."""
    st.caption(
        "Run these in a terminal **on the Mac Studio** (worker) or locally "
        "(verify/import). This app never launches the worker."
    )
    st.code(shlex.join(_offload_cli_command("offload-worker", pkg_dir)), language="bash")
    st.code(shlex.join(_offload_cli_command("offload-verify", pkg_dir)), language="bash")
    st.code(shlex.join(_offload_cli_command("offload-import", pkg_dir)), language="bash")


def _render_offload_verify_report(report: dict, *, title: str = "Verification") -> None:
    """Render a verify report — failures are always shown, never hidden."""
    if report.get("ok"):
        st.success(f"{title}: OK — {report.get('package_id', '')}")
    else:
        st.error(f"{title}: FAILED — {report.get('package_id', '')}")
    lifecycle = report.get("lifecycle") or {}
    if lifecycle and not lifecycle.get("consistent", True):
        st.warning(
            "Lifecycle mismatch: folder="
            f"`{lifecycle.get('folder_state')}` vs manifest="
            f"`{lifecycle.get('manifest_state')}`. A process may have died mid-move."
        )
    errors = report.get("errors") or []
    missing = report.get("missing_artifacts") or []
    mismatched = report.get("mismatched_artifacts") or []
    if errors:
        st.error("Errors:\n" + "\n".join(f"- {e}" for e in errors))
    if missing:
        st.error("Missing artifacts:\n" + "\n".join(f"- {m.get('relative_path')}" for m in missing))
    if mismatched:
        st.error("Hash mismatches:\n" + "\n".join(f"- {m.get('relative_path')}" for m in mismatched))


def _render_offload_export(config, offload_root: Path) -> None:
    from runner.pipeline.offload import build_analysis_package

    st.subheader("Export documents to an offload package")
    st.caption(
        "Builds a bounded `analysis_package` in `inbox/`. Only documents with "
        "intake + preprocess + extracted text are eligible; full source "
        "fetching/OCR/Wayback stays on the MacBook."
    )
    eligible = _offload_exportable_doc_ids(config.corpus_dir)
    if not eligible:
        st.info("No export-eligible documents found (need intake, preprocess, and extracted text).")
        return

    selected = st.multiselect(
        "Documents to package",
        options=eligible,
        key="offload_export_docs",
        help="Each selected document is copied into a new inbox package.",
    )
    package_id = st.text_input(
        "Package ID (optional)",
        key="offload_export_pkgid",
        placeholder="auto-generated if blank (offload-<timestamp>-<rand>)",
    ).strip()

    if st.button("Build offload package", disabled=not selected, key="offload_export_build"):
        try:
            manifest = build_analysis_package(
                corpus_dir=Path(config.corpus_dir),
                doc_ids=selected,
                offload_root=offload_root,
                package_id=package_id or None,
            )
        except Exception as exc:  # noqa: BLE001 — refusal reasons shown verbatim
            st.error(f"Export refused — nothing was written:\n\n{exc}")
            return
        st.success(
            f"Created package `{manifest.package_id}` "
            f"({len(manifest.documents)} document(s)) in inbox."
        )
        not_ready = [d.doc_id for d in manifest.documents if not d.ready_for_worker]
        if not_ready:
            st.warning(
                "Some packaged documents are not marked worker-ready: "
                + ", ".join(not_ready)
            )
        pkg_dir = offload_root / "inbox" / manifest.package_id
        st.caption(f"Package path: `{pkg_dir}`")
        _render_offload_commands(pkg_dir)


def _render_offload_browser(config, offload_root: Path) -> None:
    from runner.pipeline.offload import transition_package_state

    st.subheader("Lifecycle browser")
    rows = _offload_package_rows(offload_root)
    if not rows:
        st.info(f"No packages under `{offload_root}`.")
        return

    by_state: dict[str, list[dict]] = {}
    for row in rows:
        by_state.setdefault(row["folder_state"], []).append(row)

    from runner.pipeline.offload import LIFECYCLE_STATES

    for state in LIFECYCLE_STATES:
        state_rows = by_state.get(state)
        if not state_rows:
            continue
        st.markdown(f"#### `{state}` ({len(state_rows)})")
        for row in state_rows:
            pkg_id = row["package_id"]
            pkg_dir = Path(row["path"])
            title = f"{pkg_id}"
            if row["doc_count"] is not None:
                title += f" · {row['doc_count']} doc(s)"
            if row["created_at"]:
                title += f" · {row['created_at']}"
            with st.expander(title, expanded=False):
                if row["error"]:
                    st.error(f"Manifest could not be loaded: {row['error']}")
                if row["consistent"] is False:
                    st.warning(
                        "Folder/manifest lifecycle mismatch: folder="
                        f"`{row['folder_state']}` vs manifest=`{row['manifest_state']}`."
                    )
                st.caption(f"Path: `{pkg_dir}`")

                # Verify (read-only). For outbox packages this shows BOTH base
                # package verification and result package verification, so a bad
                # returned result cannot show "Verified OK" here and then fail at
                # dry-run import.
                if st.button("Verify", key=f"offload_verify_{state}_{pkg_id}"):
                    for item in _offload_verify_reports(
                        state, pkg_dir, Path(config.corpus_dir)
                    ):
                        _render_offload_verify_report(
                            item["report"], title=item["title"]
                        )

                # Move / quarantine. `outbox -> imported` is intentionally not
                # offered here; it happens only via a confirmed import.
                targets = _offload_browser_move_targets(state)
                if targets:
                    target = st.selectbox(
                        "Move to",
                        options=targets,
                        key=f"offload_move_target_{state}_{pkg_id}",
                    )
                    ack = True
                    if target in _OFFLOAD_NO_VERIFY_TARGETS:
                        ack = st.checkbox(
                            f"I understand moving to `{target}` skips integrity verification.",
                            key=f"offload_move_ack_{state}_{pkg_id}",
                        )
                    if st.button(
                        f"Move to {target}",
                        key=f"offload_move_btn_{state}_{pkg_id}",
                        disabled=not ack,
                    ):
                        try:
                            transition_package_state(
                                offload_root=offload_root,
                                package_id=pkg_id,
                                from_state=state,
                                to_state=target,
                            )
                        except Exception as exc:  # noqa: BLE001 — refusal shown verbatim
                            st.error(f"Move refused:\n\n{exc}")
                        else:
                            st.success(f"Moved `{pkg_id}`: {state} → {target}")
                            st.rerun()
                else:
                    st.caption("Terminal state — no further moves.")

                _render_offload_commands(pkg_dir)


def _render_offload_import(config, offload_root: Path) -> None:
    from runner.pipeline.offload import import_result_package, transition_package_state

    st.subheader("Import returned results")
    st.caption(
        "Imports a worker-returned package's outputs into the live corpus. "
        "Import is offered **only** for `outbox` packages, requires a successful "
        "dry-run, and an explicit confirmation. Existing files are backed up; "
        "nothing is deleted."
    )
    outbox_dir = offload_root / "outbox"
    pkg_dirs = (
        [p for p in sorted(outbox_dir.iterdir()) if p.is_dir() and not p.name.startswith(".")]
        if outbox_dir.exists()
        else []
    )
    if not pkg_dirs:
        st.info("No packages in `outbox/` to import.")
        return

    pkg_names = [p.name for p in pkg_dirs]
    chosen = st.selectbox("Outbox package", options=pkg_names, key="offload_import_pkg")
    pkg_dir = outbox_dir / chosen

    dryrun_key = f"offload_dryrun_ok::{chosen}"

    if st.button("Dry-run import (preview)", key=f"offload_dryrun_{chosen}"):
        try:
            summary = import_result_package(
                pkg_dir, corpus_dir=Path(config.corpus_dir), dry_run=True
            )
        except Exception as exc:  # noqa: BLE001
            st.session_state[dryrun_key] = False
            st.error(f"Dry-run failed: {exc}")
        else:
            st.session_state[dryrun_key] = bool(summary.get("ok"))
            if summary.get("ok"):
                st.success("Dry-run OK — import would proceed. Review below, then confirm.")
                docs = summary.get("documents") or []
                if docs:
                    st.write(docs)
            else:
                st.error(
                    "Dry-run FAILED — corpus untouched:\n"
                    + "\n".join(f"- {e}" for e in (summary.get("errors") or []))
                )

    dry_run_ok = bool(st.session_state.get(dryrun_key))
    if dry_run_ok:
        st.info("Dry-run succeeded for this package in this session.")
    confirmed = st.checkbox(
        "I have reviewed the dry-run and confirm importing into the live corpus.",
        key=f"offload_import_confirm_{chosen}",
        disabled=not dry_run_ok,
    )

    can_import = _offload_import_allowed("outbox", dry_run_ok, confirmed)
    if st.button("Import into corpus", key=f"offload_import_go_{chosen}", disabled=not can_import):
        try:
            summary = import_result_package(
                pkg_dir, corpus_dir=Path(config.corpus_dir), dry_run=False
            )
        except Exception as exc:  # noqa: BLE001
            st.error(f"Import failed — corpus may be partially untouched: {exc}")
            return
        if summary.get("imported"):
            st.session_state.pop(dryrun_key, None)
            # Mark the package imported (outbox -> imported), mirroring the CLI.
            # verify=False: the corpus write already succeeded; the move must not
            # be blocked by a re-verification at this point.
            moved = False
            try:
                transition_package_state(
                    offload_root=offload_root,
                    package_id=chosen,
                    from_state="outbox",
                    to_state="imported",
                    verify=False,
                )
                moved = True
            except Exception as exc:  # noqa: BLE001
                st.warning(
                    "Imported into corpus, but package could not be marked "
                    f"imported; resolve manually.\n\n{exc}"
                )
            else:
                st.success(
                    f"Imported `{summary.get('package_id', chosen)}` into the corpus "
                    "and moved the package to `imported/`."
                )
            final_dir = (offload_root / "imported" / chosen) if moved else pkg_dir
            _render_offload_commands(final_dir)
        else:
            st.error(
                "Import did not complete — corpus left untouched:\n"
                + "\n".join(f"- {e}" for e in (summary.get("errors") or []))
            )


def page_offload_packages():
    st.title("📦 Offload Packages")
    st.caption(
        "**Result-stage offload: for documents already ingested into the corpus** "
        "(intake + extracted text present) — the Mac Studio re-runs "
        "analysis/enrichment/embedding. For queue items / sources **not yet "
        "ingested**, use **📤 Source Offload** instead. "
        "The worker runs on the Mac Studio; this page never launches it."
    )

    config = _load_config_safe()
    if config is None:
        st.error("Config unavailable — check runner/.env.")
        return

    offload_root = _offload_root(config)
    st.caption(f"Offload root: `{offload_root}`")

    lock_info = _offload_worker_lock_info(offload_root)
    if lock_info:
        st.warning(
            "A worker lock is present at `.worker.lock` "
            f"(pid {lock_info.get('pid', '?')}, started {lock_info.get('started_at', '?')}). "
            "A worker may be running on the Mac Studio node."
        )

    tab_export, tab_browse, tab_import = st.tabs(
        ["Export", "Lifecycle browser", "Import results"]
    )
    with tab_export:
        _render_offload_export(config, offload_root)
    with tab_browse:
        _render_offload_browser(config, offload_root)
    with tab_import:
        _render_offload_import(config, offload_root)


# ---------------------------------------------------------------------------
# Source Offload — Mac Studio source-stage lifecycle UX (Slice S4)
# ---------------------------------------------------------------------------
#
# This page is the front end for the SOURCE-stage offload pipeline
# (runner/pipeline/offload_source.py + source_worker.py). It is deliberately
# separate from the result-stage "Offload Packages" page:
#   - Source Offload  → queue items / files / URLs NOT yet ingested; the Mac
#     Studio runs the full pipeline (intake → … → embedding) and returns docs.
#   - Offload Packages → already-ingested corpus docs; the Mac Studio re-runs
#     analysis/enrichment/embedding only.
# The app never SSHes, rsyncs, or launches the worker — it shows copy-paste
# commands only. Import is gated on a passing dry-run + explicit confirmation,
# and the source queue is relinked only after a successful corpus import.

_SOURCE_OFFLOAD_ELIGIBLE_STATUSES = frozenset({"new", "triaged", "ready_to_ingest"})
_SOURCE_REVIEW_FLAGS = (
    "needs_testimony_review", "needs_legal_review",
    "needs_media_review", "needs_book_splitting",
)
_SOURCE_NO_VERIFY_TARGETS = frozenset({"failed", "archive"})
_SOURCE_WORKER_DEFAULT_LLM = os.getenv("SOURCE_WORKER_DEFAULT_LLM", "litelm")
_SOURCE_WORKER_DEFAULT_ENRICH_MODEL = os.getenv("SOURCE_WORKER_DEFAULT_ENRICH_MODEL", "core-gemma")


def _source_offload_root(config) -> Path:
    """Resolve the SOURCE offload root (CLI default: <exports_dir>/source_offload)."""
    return Path(config.exports_dir) / "source_offload"


def _source_cli_command(verb: str, *args) -> list[str]:
    """Build a copy-paste terminal command for a MacBook-local source-offload verb.

    Pure string builder — never executed from the app. Uses ``sys.executable`` so
    the shown command runs under the same (venv) Python as the app, avoiding
    bare-``python3`` paste failures from missing dependencies. The Mac Studio
    worker command is built separately (see ``_mac_studio_python``).
    """
    return [sys.executable, "-m", "runner", verb, *[str(a) for a in args]]


def _mac_studio_python() -> str:
    """Python interpreter to show in the Mac Studio worker command.

    Reads ``MAC_STUDIO_PYTHON``; defaults to a visible placeholder (the node's
    repo venv), never bare ``python3``, so a pasted command can't silently use a
    dependency-less interpreter.
    """
    return os.getenv("MAC_STUDIO_PYTHON", "").strip() or "<MAC_STUDIO_REPO>/.venv/bin/python"


def _source_move_targets(state: str) -> list[str]:
    from runner.pipeline.offload import ALLOWED_TRANSITIONS

    return sorted(ALLOWED_TRANSITIONS.get(state, frozenset()))


def _source_browser_move_targets(state: str) -> list[str]:
    """Normal browser move targets. ``outbox -> imported`` is excluded — that
    transition only happens via a confirmed import in the Import tab."""
    return [t for t in _source_move_targets(state) if t != "imported"]


def _source_import_allowed(state: str, dry_run_ok: bool, confirmed: bool) -> bool:
    """Gate the real source import: outbox-only, dry-run passed, and confirmed."""
    return state == "outbox" and bool(dry_run_ok) and bool(confirmed)


def _source_offload_eligible_items(db) -> list[dict]:
    """Source Queue items eligible for source offload (not yet ingested).

    Eligible statuses are new / triaged / ready_to_ingest; ingested / skipped are
    excluded. Each row surfaces special-review flags + ``exclusion_reason`` so the
    researcher sees testimony/legal/media/book holds before exporting.
    """
    from runner.pipeline.source_queue import list_items, exclusion_reason

    out: list[dict] = []
    for item in list_items(db, limit=1000):
        if item.status not in _SOURCE_OFFLOAD_ELIGIBLE_STATUSES:
            continue
        flags = [f for f in _SOURCE_REVIEW_FLAGS if getattr(item, f, False)]
        out.append({
            "id": item.id, "url": item.url, "title": item.title,
            "status": item.status, "priority": item.priority,
            "source_type": item.source_type, "flags": flags,
            "flagged": bool(flags), "exclusion_reason": exclusion_reason(item),
            "corpus_doc_id": item.corpus_doc_id,
            "needs_source_file": item.needs_source_file,
            "source_file_path": item.source_file_path,
        })
    return out


def _source_queue_file_spec(item):
    """Build a file-backed spec from a Source Queue row's attached file."""
    from runner.pipeline import intake as intake_mod
    from runner.pipeline.offload_source import SourceItemSpec

    file_path = _normalise_local_source_path(getattr(item, "source_file_path", "") or "")
    candidate_source_url = (
        getattr(item, "source_file_url", "") or getattr(item, "url", "") or ""
    ).strip()
    source_url = candidate_source_url if candidate_source_url.startswith(("http://", "https://")) else ""
    relation = getattr(item, "source_file_relation", "") or "full_text_file"
    notes = " ".join(
        part for part in [
            f"Queue-attached source file ({relation}).",
            getattr(item, "source_file_note", "") or "",
            f"Landing/source queue URL: {getattr(item, 'url', '')}" if getattr(item, "url", "") else "",
            getattr(item, "notes", "") or "",
        ]
        if part
    )
    return SourceItemSpec(
        source_kind="file",
        declared_source_type=intake_mod._detect_source_type(file_path),
        file_path=file_path,
        url=source_url,
        queue_item_id=getattr(item, "id", "") or "",
        url_hash=getattr(item, "url_hash", "") or "",
        title=getattr(item, "title", "") or "",
        notes=notes,
        priority=getattr(item, "priority", "") or "",
        recommended_llm=getattr(item, "recommended_llm", "") or "",
        overnight_batch_safe=bool(getattr(item, "overnight_batch_safe", True)),
        tags=getattr(item, "tags", "") or "",
        doc_type_hint=getattr(item, "doc_type_hint", "") or "",
        suggested_process_route=getattr(item, "suggested_process_route", "") or "",
    )


def _source_specs_from_queue_items(items) -> list:
    """Map QueueItem objects to SourceItemSpec(url) — mirrors the export CLI."""
    from runner.pipeline import intake as intake_mod
    from runner.pipeline.offload_source import SourceItemSpec

    specs = []
    for item in items:
        if getattr(item, "source_file_path", ""):
            specs.append(_source_queue_file_spec(item))
            queue_url = str(getattr(item, "url", "") or "").strip()
            attached_url = str(getattr(item, "source_file_url", "") or "").strip()
            companion_url = (
                queue_url if queue_url.startswith(("http://", "https://")) else attached_url
            )
            if companion_url.startswith(("http://", "https://")):
                specs.append(_source_companion_url_spec(
                    companion_url,
                    title=f"Source page for {getattr(item, 'title', '') or getattr(item, 'id', '')}",
                    notes=(
                        "Companion URL for a queue-attached source file. "
                        f"Queue relink remains attached to queue item {getattr(item, 'id', '')}."
                    ),
                ))
            continue
        specs.append(SourceItemSpec(
            source_kind="url",
            declared_source_type=intake_mod._detect_source_type(item.url),
            url=item.url, queue_item_id=item.id, url_hash=item.url_hash,
            title=item.title, notes=item.notes, priority=item.priority,
            recommended_llm=item.recommended_llm,
            overnight_batch_safe=item.overnight_batch_safe,
            tags=item.tags, doc_type_hint=item.doc_type_hint,
            suggested_process_route=item.suggested_process_route,
        ))
    return specs


def _source_companion_url_spec(url: str, *, title: str = "", notes: str = ""):
    """Build an ad-hoc URL spec used as the source/landing-page companion.

    It deliberately carries no queue_item_id/url_hash; if a saved PDF/file is
    attached to a Source Queue row, the queue relink belongs to the file-backed
    source, while this companion URL is ingested as separate contextual evidence.
    """
    from runner.pipeline import intake as intake_mod
    from runner.pipeline.offload_source import SourceItemSpec

    return SourceItemSpec(
        source_kind="url",
        declared_source_type=intake_mod._detect_source_type(url),
        url=url,
        title=title,
        notes=notes,
    )


def _source_snapshot_spec(item, snapshot_path: str):
    """Map a queue item + a browser-saved snapshot path to a file-backed spec.

    Validates the snapshot exists; raises ValueError otherwise. The original
    source URL and queue metadata are preserved so S3 import relinks the queue
    item. Mirrors the ``--queue-snapshot`` CLI path.
    """
    from pathlib import Path as _Path

    from runner.pipeline import intake as intake_mod
    from runner.pipeline.offload_source import build_snapshot_spec

    snap = _Path(_normalise_local_source_path(snapshot_path)).expanduser()
    if not snap.is_file():
        raise ValueError(f"Snapshot file not found: {snap}")
    return build_snapshot_spec(
        queue_item=item,
        snapshot_path=str(snap),
        declared_source_type=intake_mod._detect_source_type(str(snap)),
    )


def _source_specs_from_selection(items, snapshot_paths: dict) -> list:
    """Build specs for a queue selection, honoring optional saved snapshots.

    ``snapshot_paths`` maps queue_item_id → local snapshot path. Items with a
    non-empty mapped path become file-backed snapshot specs and also get a
    separate ad-hoc companion URL spec. The queue relink remains attached to the
    saved file, while the landing/download/source URL is independently ingested
    as contextual network evidence. Raises ValueError if a provided snapshot path
    does not exist.
    """
    specs = []
    for it in items:
        path = (snapshot_paths or {}).get(it.id, "").strip()
        if path:
            specs.append(_source_snapshot_spec(it, path))
            specs.append(_source_companion_url_spec(
                it.url,
                title=f"Source page for {getattr(it, 'title', '') or getattr(it, 'id', '')}",
                notes=(
                    "Companion URL for a file-backed Source Queue attachment. "
                    f"Queue relink remains attached to queue item {getattr(it, 'id', '')}."
                ),
            ))
        else:
            specs.extend(_source_specs_from_queue_items([it]))
    return specs


def _source_specs_from_file_rows(file_rows: list[dict[str, str]], explicit_urls: list[str] | None = None) -> list:
    """Build file specs and source-url companion specs from bulk file rows."""
    from runner.pipeline import intake as intake_mod
    from runner.pipeline.offload_source import SourceItemSpec

    specs = []
    seen_url_specs = {u.strip() for u in (explicit_urls or []) if u.strip()}
    for row in file_rows:
        file_path = row.get("file_path", "").strip()
        source_url = row.get("source_url", "").strip()
        title = row.get("title", "").strip()
        specs.append(SourceItemSpec(
            source_kind="file",
            declared_source_type=intake_mod._detect_source_type(file_path),
            file_path=file_path,
            url=source_url,
            title=title,
            notes="File-backed source; source URL is ingested separately when provided.",
        ))
        if source_url and source_url not in seen_url_specs:
            specs.append(_source_companion_url_spec(
                source_url,
                title=f"Source page for {title}" if title else "Source page for local file",
                notes=f"Companion URL for local file: {Path(file_path).name}",
            ))
            seen_url_specs.add(source_url)
    return specs


def _source_batch_default_package_id(prefix: str = "source-batch") -> str:
    """Return a stable-looking package id for suggested source-offload batches."""
    return f"{prefix}-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"


def _source_manifest_item_rows(items) -> list[dict]:
    """Rows for displaying a batch/offload manifest item list in Streamlit."""
    return [
        {
            "item_id": item.item_id,
            "priority": item.priority,
            "llm": item.recommended_llm or "litelm",
            "type": item.doc_type_hint or item.status,
            "reason": item.exclusion_reason,
            "url": item.url,
        }
        for item in items
    ]


def _source_build_and_archive_batch(
    db,
    config,
    manifest,
    *,
    package_id: str,
    transfer_dir: Path | str | None = None,
) -> dict:
    """Build a source package from a safe batch manifest and archive it.

    This is the Mac Studio/source-offload equivalent of ``batch-plan``: it reads
    queue rows selected by ``plan_batch()``, builds ``source_offload/inbox/<id>``,
    then writes ``<id>.tar.gz`` + ``.sha256`` into the transfer folder. It does
    not mutate the source queue and never launches a worker.
    """
    if not manifest.included:
        raise ValueError("No eligible queue items in the batch manifest.")

    from runner.pipeline.offload_source import archive_source_package, build_source_package
    from runner.pipeline.source_queue import get_item

    queue_items = []
    missing: list[str] = []
    for planned in manifest.included:
        item = get_item(db, planned.item_id)
        if item is None:
            missing.append(planned.item_id)
        else:
            queue_items.append(item)
    if missing:
        raise ValueError(f"Queue item(s) disappeared before packaging: {', '.join(missing)}")

    source_root = _source_offload_root(config)
    package_manifest = build_source_package(
        specs=_source_specs_from_queue_items(queue_items),
        source_offload_root=source_root,
        package_id=package_id.strip() or None,
    )
    package_dir = source_root / package_manifest.lifecycle_state / package_manifest.package_id
    archive_info = archive_source_package(
        package_dir,
        output_dir=Path(transfer_dir) if transfer_dir is not None else _source_to_mac_studio_dir(),
    )
    return {
        "package_id": package_manifest.package_id,
        "item_count": len(package_manifest.items),
        "queue_item_ids": [item.id for item in queue_items],
        "package_dir": str(package_dir),
        "archive_path": archive_info["archive_path"],
        "sha256_path": archive_info["sha256_path"],
        "sha256": archive_info["sha256"],
        "bytes": archive_info["bytes"],
        "warnings": archive_info.get("warnings", []),
    }


def _source_package_rows(source_offload_root) -> list[dict]:
    """Summarise every source package across lifecycle folders (read-only).

    A package whose manifest fails to load is still listed with an ``error`` so it
    is never silently hidden. ``has_result_manifest`` flags a returned package.
    """
    from runner.pipeline.offload import LIFECYCLE_STATES
    from runner.pipeline.offload_source import (
        INGEST_RESULT_MANIFEST_NAME, load_source_manifest,
    )

    rows: list[dict] = []
    root = Path(source_offload_root)
    for state in LIFECYCLE_STATES:
        state_dir = root / state
        if not state_dir.exists():
            continue
        for pkg in sorted(state_dir.iterdir()):
            if not pkg.is_dir() or pkg.name.startswith("."):
                continue
            row = {
                "package_id": pkg.name, "folder_state": state, "path": str(pkg),
                "item_count": None, "created_at": "", "package_kind": "",
                "manifest_state": "", "consistent": None,
                "has_result_manifest": (pkg / INGEST_RESULT_MANIFEST_NAME).is_file(),
                "error": "",
            }
            try:
                manifest = load_source_manifest(pkg)
                row["item_count"] = len(manifest.items)
                row["created_at"] = manifest.created_at
                row["package_kind"] = manifest.package_kind
                row["manifest_state"] = manifest.lifecycle_state
                row["consistent"] = manifest.lifecycle_state == state
            except Exception as exc:  # noqa: BLE001 — surfaced, never hidden
                row["error"] = str(exc)
            rows.append(row)
    return rows


def _mac_studio_transfer_target(config=None) -> tuple[str, str]:
    """(ssh_host, remote_root) for transfer commands, from env with placeholders."""
    host = os.getenv("MAC_STUDIO_SSH_HOST", "").strip() or "<MAC_STUDIO_HOST>"
    root = os.getenv("MAC_STUDIO_OFFLOAD_ROOT", "").strip() or "/Users/cdn-ai/sogice-offload"
    return host, root


def _source_offload_transfer_commands(
    pkg_dir, ssh_host: str, remote_root: str,
    mac_python: str = "<MAC_STUDIO_REPO>/.venv/bin/python",
    llm: str = _SOURCE_WORKER_DEFAULT_LLM,
    enrich_model: str = _SOURCE_WORKER_DEFAULT_ENRICH_MODEL,
) -> dict:
    """Build copy-paste rsync-up / source-worker / rsync-back commands (pure).

    Never executed — the app only displays these for the researcher to run. The
    worker line uses ``mac_python`` (the Mac Studio repo venv), never bare
    ``python3``.
    """
    pkg = Path(pkg_dir)
    pkg_id = pkg.name
    local_root = pkg.parent.parent  # …/source_offload
    remote_root = remote_root.rstrip("/")
    remote_inbox = f"{remote_root}/inbox/{pkg_id}"
    remote_outbox = f"{remote_root}/outbox/{pkg_id}"
    return {
        "rsync_up": (
            f"rsync -avz --chmod=D700,F600 {shlex.quote(str(local_root / 'inbox' / pkg_id))} "
            f"{ssh_host}:{remote_root}/inbox/"
        ),
        "worker": (
            f"{mac_python} -m runner source-worker {remote_inbox} "
            f"--llm {llm} --enrich-model {enrich_model}"
        ),
        "rsync_back": (
            f"rsync -avz --chmod=D700,F600 {ssh_host}:{remote_outbox} "
            f"{shlex.quote(str(local_root / 'outbox'))}/"
        ),
    }


def _source_offload_archive_commands(
    pkg_dir, remote_root: str,
    *,
    local_python=None,
    mac_python: str = "<MAC_STUDIO_REPO>/.venv/bin/python",
) -> dict:
    """Build copy-paste archive/unpack commands for SSH-free manual transfer (pure).

    Display-only — never executed by the app. Covers the round trip:
    MacBook archives the inbox package → copy the single .tar.gz + .sha256 by
    AirDrop / iCloud shared folder / external drive → Mac Studio unpacks into its
    inbox → (worker runs) → Mac Studio archives the outbox result → copy back →
    MacBook unpacks into its outbox. Local commands use the app's venv python;
    the Mac Studio command uses ``mac_python`` (its repo venv), never bare
    ``python3``.
    """
    import sys as _sys

    pkg = Path(pkg_dir)
    pkg_id = pkg.name
    local_root = pkg.parent.parent  # …/source_offload
    remote_root = remote_root.rstrip("/")
    lpy = local_python or _sys.executable
    archive_name = f"{pkg_id}.tar.gz"
    return {
        # MacBook → archive the inbox package (writes .tar.gz + .sha256).
        "archive_local": (
            f"{lpy} -m runner source-offload-archive "
            f"{shlex.quote(str(local_root / 'inbox' / pkg_id))}"
        ),
        # Verify the checksum after copying the archive anywhere.
        "verify_checksum": f"shasum -a 256 -c {shlex.quote(archive_name + '.sha256')}",
        # Mac Studio → unpack the transferred archive into its inbox.
        "unpack_remote_inbox": (
            f"{mac_python} -m runner source-offload-unpack {shlex.quote(archive_name)} "
            f"--source-offload-root {remote_root} --state inbox"
        ),
        # Mac Studio → archive the finished outbox package for the trip back.
        "archive_remote_outbox": (
            f"{mac_python} -m runner source-offload-archive {remote_root}/outbox/{pkg_id}"
        ),
        # MacBook → unpack the returned archive into its outbox (ready to import).
        "unpack_local_outbox": (
            f"{lpy} -m runner source-offload-unpack {shlex.quote(archive_name)} "
            f"--source-offload-root {shlex.quote(str(local_root))} --state outbox"
        ),
    }


def _source_transfer_root(*, mac_studio: bool = False) -> Path:
    """Resolve the Syncthing/AirDrop archive-transfer root for this machine."""
    env = (
        os.getenv("SOURCE_OFFLOAD_TRANSFER_ROOT", "").strip()
        or os.getenv("SOGICE_TRANSFER_ROOT", "").strip()
    )
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


def _source_to_mac_studio_dir(*, mac_studio: bool = False) -> Path:
    return _source_transfer_root(mac_studio=mac_studio) / "to-mac-studio"


def _source_from_mac_studio_dir(*, mac_studio: bool = False) -> Path:
    return _source_transfer_root(mac_studio=mac_studio) / "from-mac-studio"


def _source_archive_rows(archive_dir: Path) -> list[dict]:
    """Summarise transferred ``.tar.gz`` packages, including checksum status."""
    from runner.pipeline.offload_source import ARCHIVE_SUFFIX, inspect_source_archive

    archive_dir = Path(archive_dir)
    rows: list[dict] = []
    if not archive_dir.exists():
        return rows
    for archive in sorted(archive_dir.glob(f"*{ARCHIVE_SUFFIX}")):
        if archive.name.startswith("."):
            continue
        row = {
            "archive_path": str(archive),
            "archive_name": archive.name,
            "package_id": archive.name.removesuffix(ARCHIVE_SUFFIX),
            "manifest_state": "",
            "checksum_ok": False,
            "sha256_path": str(Path(str(archive) + ".sha256")),
            "sha256_exists": Path(str(archive) + ".sha256").is_file(),
            "bytes": archive.stat().st_size if archive.exists() else 0,
            "modified_at": datetime.fromtimestamp(
                archive.stat().st_mtime, timezone.utc
            ).isoformat() if archive.exists() else "",
            "error": "",
        }
        try:
            info = inspect_source_archive(archive)
            row["package_id"] = info.get("package_id", row["package_id"])
            row["manifest_state"] = info.get("manifest_state", "")
            row["checksum_ok"] = True
        except Exception as exc:  # noqa: BLE001 — surfaced in UI
            row["error"] = str(exc)
        rows.append(row)
    return rows


_SOURCE_TRANSFER_JUNK_NAMES = frozenset({".DS_Store", "Icon\r", "Thumbs.db"})


def _source_transfer_ignored_member(path: str) -> bool:
    p = Path(path)
    return (
        p.name in _SOURCE_TRANSFER_JUNK_NAMES
        or p.name.startswith("._")
        or p.name.startswith(".syncthing.")
    )


def _source_filter_transfer_unexpected(unexpected: list[str]) -> list[str]:
    return [u for u in unexpected if not _source_transfer_ignored_member(u)]


def _source_transfer_folder_rows(folder_dir: Path) -> list[dict]:
    """Summarise direct package folders in a transfer dir (legacy fallback)."""
    from runner.pipeline.offload_source import load_source_manifest, verify_source_inputs

    folder_dir = Path(folder_dir)
    rows: list[dict] = []
    if not folder_dir.exists():
        return rows
    for pkg in sorted(folder_dir.iterdir()):
        if (
            not pkg.is_dir()
            or pkg.name.startswith(".")
            or pkg.name in {"old", "to-mac-studio", "from-mac-studio"}
        ):
            continue
        row = {
            "package_id": pkg.name,
            "path": str(pkg),
            "ok": False,
            "state": "",
            "item_count": None,
            "errors": [],
            "unexpected": [],
            "error": "",
        }
        try:
            report = verify_source_inputs(pkg)
            errors = list(report.get("errors") or [])
            unexpected = _source_filter_transfer_unexpected(list(report.get("unexpected") or []))
            row["errors"] = errors
            row["unexpected"] = unexpected
            row["ok"] = not errors and not unexpected
            try:
                row["state"] = load_source_manifest(pkg).lifecycle_state
            except Exception:
                row["state"] = ""
            row["item_count"] = len(report.get("items") or [])
            if not row["ok"]:
                bits = errors + [f"unexpected:{u}" for u in unexpected]
                row["error"] = "; ".join(bits or ["verification failed"])
        except Exception as exc:  # noqa: BLE001
            row["error"] = str(exc)
        rows.append(row)
    return rows


def _source_reconcile_manifest_state(package_dir: Path, state: str) -> None:
    """Rewrite a copied source package manifest to match its destination state."""
    from runner.pipeline.atomic_io import atomic_write_json
    from runner.pipeline.offload_source import SOURCE_MANIFEST_NAME, load_source_manifest

    package_dir = Path(package_dir)
    manifest = load_source_manifest(package_dir)
    data = manifest.to_dict()
    data["lifecycle_state"] = state
    atomic_write_json(package_dir / SOURCE_MANIFEST_NAME, data)


def _source_misplaced_return_rows(source_offload_root: Path) -> list[dict]:
    """Find returned ingest_result packages that are not physically in outbox."""
    from runner.pipeline.offload_source import (
        INGEST_RESULT_MANIFEST_NAME,
        SOURCE_MANIFEST_NAME,
        load_source_manifest,
    )

    root = Path(source_offload_root)
    rows: list[dict] = []
    for state in ("inbox", "processing"):
        state_dir = root / state
        if not state_dir.exists():
            continue
        for pkg in sorted(state_dir.iterdir()):
            if not pkg.is_dir() or pkg.name.startswith("."):
                continue
            if not (pkg / INGEST_RESULT_MANIFEST_NAME).is_file():
                continue
            row = {
                "package_id": pkg.name,
                "folder_state": state,
                "path": str(pkg),
                "manifest_state": "",
                "error": "",
            }
            try:
                row["manifest_state"] = load_source_manifest(pkg).lifecycle_state
                if not (pkg / SOURCE_MANIFEST_NAME).is_file():
                    row["error"] = "source_manifest_not_found"
            except Exception as exc:  # noqa: BLE001
                row["error"] = str(exc)
            rows.append(row)
    return rows


def _source_repair_misplaced_return(source_offload_root: Path, package_id: str, *, from_state: str) -> Path:
    """Move a returned package from a wrong lifecycle folder into outbox.

    If an old outbox copy with the same package id exists, move it to failed as
    a quarantine first. Nothing is deleted.
    """
    from runner.pipeline.offload_source import (
        INGEST_RESULT_MANIFEST_NAME,
        validate_package_id,
    )

    root = Path(source_offload_root)
    pkg_id = validate_package_id(package_id)
    source = root / from_state / pkg_id
    target = root / "outbox" / pkg_id
    failed = root / "failed" / pkg_id
    if from_state == "outbox":
        return target
    if not source.is_dir():
        raise FileNotFoundError(source)
    if not (source / INGEST_RESULT_MANIFEST_NAME).is_file():
        raise ValueError(f"not_a_returned_ingest_result:{source}")
    if target.exists():
        if failed.exists():
            raise FileExistsError(
                f"{target} already exists and {failed} also exists; move one aside from the lifecycle browser first"
            )
        failed.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(target), str(failed))
        _source_reconcile_manifest_state(failed, "failed")
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(source), str(target))
    _source_reconcile_manifest_state(target, "outbox")
    return target


def _source_worker_verify_report(package_dir: Path) -> dict:
    """Verify source inputs for a worker run, tolerating stale retry outputs."""
    from runner.pipeline.offload_source import verify_source_inputs

    return verify_source_inputs(Path(package_dir))


def _source_unpacked_package_exists(source_offload_root: Path, state: str, package_id: str) -> bool:
    return (Path(source_offload_root) / state / package_id).is_dir()


def _source_existing_package_states(source_offload_root: Path, package_id: str) -> list[str]:
    from runner.pipeline.offload import LIFECYCLE_STATES

    root = Path(source_offload_root)
    return [state for state in LIFECYCLE_STATES if (root / state / package_id).is_dir()]


def _source_can_archive_inbox_then_unpack(existing_states: list[str], manifest_state: str) -> bool:
    """True when a returned outbox archive is blocked only by the original local
    inbox package. In that narrow case the UI can safely offer to move
    ``inbox/<pkg>`` to ``archive/<pkg>`` before unpacking the returned outbox."""
    return set(existing_states) == {"inbox"} and manifest_state == "outbox"


def _mac_studio_offload_root() -> Path:
    return Path(os.getenv("MAC_STUDIO_OFFLOAD_ROOT", "/Users/cdn-ai/sogice-offload")).expanduser()


def _start_source_worker_job(
    package_dir: Path,
    *,
    llm: str = _SOURCE_WORKER_DEFAULT_LLM,
    enrich_model: str = _SOURCE_WORKER_DEFAULT_ENRICH_MODEL,
) -> dict:
    """Start one local Mac Studio source worker in the background."""
    root = Path(package_dir).parent.parent
    lock_info = _offload_worker_lock_info(root)
    if lock_info:
        raise RuntimeError(
            "A source worker lock already exists "
            f"(pid {lock_info.get('pid', '?')}, started {lock_info.get('started_at', '?')})."
        )
    active = _read_app_job_lock()
    if active:
        raise RuntimeError(
            _format_app_job_lock(active)
            + " Wait for it to finish before starting another heavy model job."
        )
    pkg_id = re.sub(r"[^a-zA-Z0-9_.-]+", "-", Path(package_dir).name).strip("-") or "source"
    started = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_dir = _project_root / "exports" / "app_jobs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"{started}_{pkg_id}_source_worker.log"
    command = [
        sys.executable, "-m", "runner", "source-worker", str(package_dir),
        "--llm", llm, "--enrich-model", enrich_model,
    ]
    lease_fd = _acquire_model_job_lease()
    try:
        with log_path.open("w", encoding="utf-8") as log_file:
            log_file.write(f"$ {shlex.join(command)}\n\n")
            log_file.flush()
            proc = subprocess.Popen(
                command, cwd=_project_root, stdout=log_file,
                stderr=subprocess.STDOUT, text=True, pass_fds=(lease_fd,),
            )
        os.close(lease_fd)
        lease_fd = None
    except Exception:
        if lease_fd is not None:
            _release_model_job_lease(lease_fd)
        raise
    job = {
        "process": proc,
        "pid": proc.pid,
        "started_at": started,
        "log_path": str(log_path),
        "command": shlex.join(command),
        "kind": "source-worker",
        "mode": pkg_id,
    }
    _write_app_job_lock(job)
    return job


def _render_source_worker_job(job_key: str) -> bool:
    job = st.session_state.get(job_key)
    if not job:
        return False
    proc = job.get("process")
    returncode = proc.poll() if proc is not None else None
    log_path = Path(job.get("log_path", ""))
    if returncode is None:
        st.info(
            f"Source worker is running in the background "
            f"(PID {job.get('pid')}). You can leave this page open and refresh."
        )
        c1, c2 = st.columns([1, 1])
        if c1.button("Refresh worker status", key=f"{job_key}_refresh"):
            st.rerun()
        if c2.button("Forget this status card", key=f"{job_key}_forget_running"):
            st.session_state.pop(job_key, None)
            st.rerun()
        tail = _job_log_tail(log_path)
        if tail:
            with st.expander("Worker log tail", expanded=False):
                st.code(tail, language="text")
        st.caption(f"Log: `{log_path}`")
        return True
    _clear_app_job_lock(job)
    if returncode == 0:
        st.success("Source worker finished. Check `outbox/`, then archive the result.")
    else:
        st.error(f"Source worker exited with code {returncode}.")
    tail = _job_log_tail(log_path)
    if tail:
        with st.expander("Worker log tail", expanded=returncode != 0):
            st.code(tail, language="text")
    st.caption(f"Log: `{log_path}`")
    if st.button("Clear worker status", key=f"{job_key}_clear_done"):
        st.session_state.pop(job_key, None)
        st.rerun()
    return False


def _source_import_relink_preview(pkg_dir) -> list[dict]:
    """Queue-linkage preview for a returned package (read-only; no DB)."""
    from runner.pipeline.offload_source import ingest_result_linkages

    try:
        return ingest_result_linkages(Path(pkg_dir))
    except Exception:  # noqa: BLE001
        return []


def _source_worker_report_summary(pkg_dir) -> dict:
    """Summarise successful vs failed docs from a returned source-worker report."""
    pkg_dir = Path(pkg_dir)
    report_path = pkg_dir / "worker_report.json"
    source_path = pkg_dir / "source_manifest.json"
    result_path = pkg_dir / "result_manifest.json"
    summary = {
        "worker_status": "",
        "importable_doc_ids": [],
        "failed": [],
        "error": "",
    }
    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return summary
    except Exception as exc:  # noqa: BLE001
        summary["error"] = str(exc)
        return summary

    summary["worker_status"] = str(report.get("worker_status") or "")
    source_by_doc: dict[str, dict] = {}
    try:
        source = json.loads(source_path.read_text(encoding="utf-8"))
        source_by_doc = {
            str(item.get("doc_id") or ""): item
            for item in source.get("items", [])
            if item.get("doc_id")
        }
    except Exception:
        source_by_doc = {}

    importable: set[str] = set()
    try:
        result = json.loads(result_path.read_text(encoding="utf-8"))
        importable = {
            str(doc.get("doc_id") or "")
            for doc in result.get("documents", [])
            if doc.get("doc_id")
        }
    except Exception:
        importable = set()
    summary["importable_doc_ids"] = sorted(importable)

    failed: list[dict] = []
    for doc in report.get("documents", []):
        doc_id = str(doc.get("doc_id") or "")
        status = str(doc.get("status") or "")
        if status == "succeeded" and doc_id in importable:
            continue
        src = source_by_doc.get(doc_id, {})
        failed.append({
            "doc_id": doc_id,
            "queue_item_id": src.get("queue_item_id", ""),
            "source_url": src.get("url", ""),
            "status": status or "omitted",
            "error": str(doc.get("error") or "omitted_from_result_manifest"),
        })
    summary["failed"] = failed
    return summary


# ── Render helpers ─────────────────────────────────────────────────────────

def _render_source_local_commands(pkg_dir) -> None:
    st.caption("Local commands (verify / import on the MacBook):")
    st.code(shlex.join(_source_cli_command("source-offload-verify", pkg_dir)), language="bash")
    st.code(shlex.join(_source_cli_command("source-offload-import", pkg_dir)), language="bash")


def _render_source_import_errors(summary: dict) -> None:
    if summary.get("reviewed_blocked"):
        st.error(
            "Refused — researcher-reviewed/edited corpus docs: "
            + ", ".join(summary["reviewed_blocked"])
            + ". Tick **Force overwrite** to override (existing files are backed up)."
        )
    errs = [e for e in (summary.get("errors") or []) if not e.startswith("reviewed_doc_blocked")]
    if errs:
        st.error("Import refused — corpus untouched:\n" + "\n".join(f"- {e}" for e in errs))


def _open_document_in_document_list(doc_id: str) -> None:
    st.session_state["doc_list_search"] = doc_id
    st.session_state["doc_list_open_doc_id"] = doc_id
    st.session_state["_nav_to"] = "Document List"
    st.rerun()


def _render_imported_doc_actions(config, doc_ids: list[str], *, key_prefix: str) -> None:
    if not doc_ids:
        return
    st.markdown("#### Imported documents")
    for doc_id in doc_ids:
        cols = st.columns([2, 1, 1, 1])
        cols[0].write(f"`{doc_id}`")
        if cols[1].button("Open in Document List", key=f"{key_prefix}_open_{doc_id}"):
            _open_document_in_document_list(doc_id)
        if cols[2].button("Status", key=f"{key_prefix}_status_{doc_id}"):
            r = subprocess.run(
                [sys.executable, "-m", "runner", "status", doc_id],
                cwd=_project_root,
                capture_output=True,
                text=True,
                check=False,
            )
            output = (r.stdout or "") + (r.stderr or "")
            if r.returncode == 0:
                st.code(output or f"status OK for {doc_id}", language="text")
            else:
                st.error(output or f"`status` exited with {r.returncode}")
        if cols[3].button("Upload", key=f"{key_prefix}_upload_{doc_id}"):
            st.caption("Manual action: runs `upload-doc`; no upload happens unless you press this button.")
            r = subprocess.run(
                [sys.executable, "-m", "runner", "upload-doc", doc_id],
                cwd=_project_root,
                capture_output=True,
                text=True,
                check=False,
            )
            output = (r.stdout or "") + (r.stderr or "")
            if r.returncode == 0:
                st.success(f"Uploaded `{doc_id}`.")
                st.code(output, language="text")
            else:
                st.error(output or f"`upload-doc` exited with {r.returncode}")


def _render_source_received_archives(config, root: Path) -> None:
    """MacBook-side scanner for returned Syncthing/AirDrop archives."""
    from runner.pipeline.offload_source import move_source_package_state, unpack_source_archive

    incoming = _source_from_mac_studio_dir(mac_studio=False)
    st.markdown("#### Returned archives")
    st.caption(
        "Scans the shared transfer folder for Mac-Studio-returned archives. "
        "Unpack puts the package in `source_offload/outbox/`; nothing is imported "
        "or uploaded until you use the buttons below."
    )
    st.caption(f"Folder: `{incoming}`")
    rows = _source_archive_rows(incoming)
    if not rows:
        st.info("No returned `.tar.gz` archives found yet.")
        return
    for row in rows:
        label = row["package_id"]
        if row["checksum_ok"]:
            label += f" · checksum OK · manifest `{row.get('manifest_state') or '?'}`"
        else:
            label += " · checksum/problem"
        with st.expander(label):
            st.caption(f"Archive: `{row['archive_path']}`")
            if row["error"]:
                st.error(row["error"])
            else:
                st.success("Archive checksum and shape verified.")
            existing_states = _source_existing_package_states(root, row["package_id"])
            if "imported" in existing_states:
                st.success("Already imported into the corpus. This archive is retained only as transfer history.")
            elif "outbox" in existing_states:
                st.info("Already unpacked into `outbox/`; use the import controls below.")
            elif existing_states:
                st.info(
                    "This package already exists locally in: "
                    + ", ".join(f"`{state}/`" for state in existing_states)
                    + ". Move/archive it from the lifecycle browser if you need to retry."
                )
                if _source_can_archive_inbox_then_unpack(
                    existing_states, str(row.get("manifest_state") or "")
                ):
                    st.caption(
                        "This looks like the original outgoing inbox copy blocking the "
                        "returned outbox archive. This action keeps that original by "
                        "moving it to `archive/`, then unpacks the returned package into `outbox/`."
                    )
                    if st.button(
                        "Archive local inbox copy and unpack returned outbox",
                        key=f"src_recv_archive_inbox_unpack_{row['package_id']}",
                        disabled=bool(row["error"]),
                    ):
                        try:
                            move_source_package_state(
                                offload_root=root,
                                package_id=row["package_id"],
                                from_state="inbox",
                                to_state="archive",
                            )
                            result = unpack_source_archive(
                                Path(row["archive_path"]),
                                source_offload_root=root,
                                state="outbox",
                            )
                        except Exception as exc:  # noqa: BLE001
                            st.error(f"Could not archive inbox copy and unpack returned archive:\n\n{exc}")
                        else:
                            st.success(
                                f"Archived local inbox copy and unpacked `{result['package_id']}` "
                                f"to `{result['package_dir']}`."
                            )
                            st.rerun()
            if st.button(
                "Unpack into source_offload/outbox",
                key=f"src_recv_unpack_{row['package_id']}",
                disabled=bool(row["error"] or existing_states),
            ):
                try:
                    result = unpack_source_archive(
                        Path(row["archive_path"]),
                        source_offload_root=root,
                        state="outbox",
                    )
                except Exception as exc:  # noqa: BLE001
                    st.error(f"Unpack refused:\n\n{exc}")
                else:
                    st.success(f"Unpacked `{result['package_id']}` to `{result['package_dir']}`.")
                    st.rerun()


def _render_source_export(config, root: Path) -> None:
    from runner.pipeline.offload_source import (
        archive_source_package,
        build_source_package,
        verify_source_package,
    )

    st.subheader("Export queued/source items to a source package")
    st.caption(
        "For Source Queue items (and ad-hoc files/URLs) that have **not** been "
        "ingested yet. Builds a `source_package` in `inbox/`; the Mac Studio "
        "fetches + analyzes them later. The queue is not modified by export."
    )

    eligible: list[dict] = []
    try:
        from runner.pipeline.source_queue import open_db, queue_db_path
        db = open_db(queue_db_path(config.corpus_dir))
        try:
            eligible = _source_offload_eligible_items(db)
        finally:
            db.close()
    except Exception as exc:  # noqa: BLE001
        st.error(f"Source queue unavailable: {exc}")

    safe_items = [e for e in eligible if not e["flagged"]]
    flagged_items = [e for e in eligible if e["flagged"]]

    def _label(e: dict) -> str:
        return f"{e['id']} · {e['status']} · {e['priority']} · {e['url'][:60]}"

    chosen_ids: list[str] = []
    if safe_items:
        chosen_ids += st.multiselect(
            "Eligible queue items (not yet ingested)",
            options=[e["id"] for e in safe_items],
            format_func=lambda i: _label(next(e for e in safe_items if e["id"] == i)),
            key="src_export_items",
        )
    else:
        st.info("No unflagged eligible queue items (need status new / triaged / ready_to_ingest).")

    if flagged_items:
        with st.expander(f"⚠ Review-flagged items ({len(flagged_items)}) — extra care"):
            st.caption(
                "These carry testimony / legal / media / book-split flags. Include "
                "only after reviewing the special-handling requirement."
            )
            ack = st.checkbox(
                "I have reviewed these special-handling flags and want to include selected flagged items.",
                key="src_export_flag_ack",
            )
            fsel = st.multiselect(
                "Flagged items",
                options=[e["id"] for e in flagged_items],
                format_func=lambda i: _label(next(e for e in flagged_items if e["id"] == i))
                + " · ⚠ " + ",".join(next(e for e in flagged_items if e["id"] == i)["flags"]),
                key="src_export_flagged", disabled=not ack,
            )
            if ack:
                chosen_ids += fsel

    # Optional saved file per selected queue item (for blocked URLs, PDFs, books).
    snapshot_paths: dict[str, str] = {}
    if chosen_ids:
        with st.expander("Attach a saved file to selected queue items (PDF / book / browser snapshot)"):
            st.caption(
                "Use this when the queue item points to a landing page, download button, DOI, "
                "Cloudflare page, or other URL where you already have the real PDF/HTML/MD file. "
                "The Mac Studio will **process the saved file** with the queue id preserved for "
                "relinking, and it will also ingest the original URL as a separate companion "
                "source for context/network evidence. Leave blank to package the URL normally."
            )
            id_to_e = {e["id"]: e for e in eligible}
            for cid in chosen_ids:
                e = id_to_e.get(cid, {"url": ""})
                snapshot_paths[cid] = st.text_input(
                    f"Saved file for {cid} — {e.get('url', '')[:60]}",
                    key=f"src_export_snap_{cid}",
                    placeholder="/path/to/source.pdf  (optional)",
                ).strip()

    urls_text = st.text_area("Ad-hoc URLs (one per line, optional)", key="src_export_urls")
    files_text = st.text_area(
        "Local PDFs / books / source files (one per line, optional)",
        key="src_export_files",
        help=(
            "One row per local file. Use `/path/to/file.pdf` for file-only analysis, or "
            "`/path/to/file.pdf | https://source-or-download-page | Optional title` when the PDF/book "
            "has a landing page, DOI, Google Books page, download page, or source URL. "
            "With a URL, the package includes two items: the file itself and a separate companion URL."
        ),
        placeholder=(
            "/Users/sergiogalvaoroxo/Downloads/book.pdf | https://example.org/book-page | Book title\n"
            "/Users/sergiogalvaoroxo/Downloads/article.md"
        ),
    )
    file_rows = _source_parse_file_rows(files_text)
    if file_rows:
        st.info(
            "Parsed local file rows. When a source URL is provided after `|`, the package sends "
            "both items: the file is analyzed as the main source, and the URL is ingested separately "
            "as contextual/network evidence. Do not wrap Finder paths in quotes; the app strips them "
            "when possible, but raw paths are safest."
        )
        preview_rows = _source_file_row_preview_rows(file_rows)
        if preview_rows:
            st.markdown("**What will be sent**")
            st.dataframe(preview_rows, hide_index=True, width="stretch")
            missing_files = [row for row in preview_rows if row["package item"] == "file" and row["status"] == "missing"]
            if missing_files:
                st.warning(
                    "One or more local files are missing or still cloud-only. "
                    "Open/download them locally in Finder before building the source package."
                )
        with st.expander("Book/report splitting preview commands"):
            st.caption(
                "`split-book` is a preview-only helper for long PDFs/EPUB/DOCX/MD files. "
                "It extracts text using the same local preprocessing stack and proposes "
                "sections; it does not ingest, analyze, enrich, or upload anything."
            )
            min_chars = st.number_input(
                "Minimum characters per section",
                min_value=500,
                max_value=50000,
                value=3000,
                step=500,
                key="src_export_split_min_chars",
            )
            max_level = st.selectbox(
                "Heading depth",
                options=[1, 2, 3],
                index=1,
                format_func=lambda v: f"H1-H{v}",
                key="src_export_split_max_level",
            )
            for row in file_rows[:10]:
                src = row["file_path"]
                default_out = str(Path(src).with_suffix(".split-preview.json"))
                st.code(
                    _source_split_book_command(
                        src,
                        out_path=default_out,
                        min_chars=int(min_chars),
                        max_level=int(max_level),
                    ),
                    language="bash",
                )
            if len(file_rows) > 10:
                st.caption(f"Showing split commands for first 10 of {len(file_rows)} files.")
    package_id = st.text_input(
        "Package ID (optional)", key="src_export_pkgid",
        placeholder="auto-generated if blank",
    ).strip()

    url_list = [x.strip() for x in urls_text.splitlines() if x.strip()]
    has_input = bool(chosen_ids or url_list or file_rows)

    if st.button("Build source package", disabled=not has_input, key="src_export_build"):
        from runner.pipeline import intake as intake_mod
        from runner.pipeline.offload_source import SourceItemSpec

        specs = []
        if chosen_ids:
            try:
                from runner.pipeline.source_queue import open_db, queue_db_path, get_item
                db = open_db(queue_db_path(config.corpus_dir))
                try:
                    qitems = [q for q in (get_item(db, i) for i in chosen_ids) if q is not None]
                finally:
                    db.close()
                specs += _source_specs_from_selection(qitems, snapshot_paths)
            except Exception as exc:  # noqa: BLE001
                st.error(f"Queue read failed: {exc}")
                return
        for u in url_list:
            specs.append(SourceItemSpec(
                source_kind="url", declared_source_type=intake_mod._detect_source_type(u), url=u,
            ))
        specs.extend(_source_specs_from_file_rows(file_rows, explicit_urls=url_list))

        try:
            manifest = build_source_package(
                specs=specs, source_offload_root=root, package_id=package_id or None,
            )
        except Exception as exc:  # noqa: BLE001 — refusal reasons shown verbatim
            st.error(f"Export refused — nothing was written:\n\n{exc}")
            return

        st.success(f"Created `{manifest.package_id}` ({len(manifest.items)} item(s)) in inbox.")
        pkg_dir = root / "inbox" / manifest.package_id
        st.caption(f"Working package path: `{pkg_dir}`")
        _render_offload_verify_report(verify_source_package(pkg_dir), title="Source package verification")
        transfer_dir = _source_to_mac_studio_dir(mac_studio=False)
        try:
            archived = archive_source_package(pkg_dir, output_dir=transfer_dir)
        except FileExistsError:
            archive_path = transfer_dir / f"{manifest.package_id}.tar.gz"
            st.info(
                "Transfer archive already exists, so I did not overwrite it. "
                f"Syncthing should send: `{archive_path}` and `{archive_path}.sha256`."
            )
        except Exception as exc:  # noqa: BLE001
            st.warning(
                "The package was built and verified, but the transfer archive could "
                f"not be created in `{transfer_dir}`:\n\n{exc}"
            )
        else:
            st.success(
                "Transfer archive created for Syncthing: "
                f"`{archived['archive_path']}` + `{archived['sha256_path']}`."
            )
            st.caption("Next: open **Mac Studio Worker** on the Mac Studio and unpack it from Incoming archives.")


def _render_source_browser(config, root: Path) -> None:
    from runner.pipeline.offload import LIFECYCLE_STATES
    from runner.pipeline.offload_source import (
        move_source_package_state, verify_source_inputs, verify_source_package,
    )

    st.subheader("Lifecycle browser")
    rows = _source_package_rows(root)
    if not rows:
        st.info(f"No source packages under `{root}`.")
        return

    by_state: dict[str, list[dict]] = {}
    for row in rows:
        by_state.setdefault(row["folder_state"], []).append(row)

    for state in LIFECYCLE_STATES:
        state_rows = by_state.get(state)
        if not state_rows:
            continue
        st.markdown(f"#### `{state}` ({len(state_rows)})")
        for row in state_rows:
            pkg_id = row["package_id"]
            pkg_dir = Path(row["path"])
            title = pkg_id
            if row["item_count"] is not None:
                title += f" · {row['item_count']} item(s)"
            if row["has_result_manifest"]:
                title += " · ✓ result"
            if row["created_at"]:
                title += f" · {row['created_at']}"
            with st.expander(title):
                if row["error"]:
                    st.error(f"Manifest could not be loaded: {row['error']}")
                if row["consistent"] is False:
                    st.warning(
                        "Folder/manifest lifecycle mismatch: folder="
                        f"`{row['folder_state']}` vs manifest=`{row['manifest_state']}`."
                    )
                st.caption(f"Path: `{pkg_dir}`")

                if st.button("Verify", key=f"src_verify_{state}_{pkg_id}"):
                    if state in ("processing", "outbox", "imported"):
                        # Worker outputs (docs/) may be present — tolerate them.
                        _render_offload_verify_report(
                            verify_source_inputs(pkg_dir), title="Source inputs verification"
                        )
                    else:
                        _render_offload_verify_report(
                            verify_source_package(pkg_dir), title="Source package verification"
                        )

                if state == "failed":
                    if st.button("↻ Retry: move failed → inbox", key=f"src_retry_{pkg_id}"):
                        try:
                            move_source_package_state(
                                offload_root=root, package_id=pkg_id,
                                from_state="failed", to_state="inbox",
                            )
                        except Exception as exc:  # noqa: BLE001
                            st.error(f"Move refused:\n\n{exc}")
                        else:
                            st.success(f"Moved `{pkg_id}` failed → inbox. Re-transfer and re-run the worker.")
                            st.rerun()

                targets = _source_browser_move_targets(state)
                if targets:
                    tgt = st.selectbox("Move to", options=targets, key=f"src_movetgt_{state}_{pkg_id}")
                    ack = True
                    if tgt in _SOURCE_NO_VERIFY_TARGETS:
                        ack = st.checkbox(
                            f"I understand moving to `{tgt}` skips verification.",
                            key=f"src_moveack_{state}_{pkg_id}",
                        )
                    if st.button(f"Move to {tgt}", key=f"src_movebtn_{state}_{pkg_id}", disabled=not ack):
                        try:
                            move_source_package_state(
                                offload_root=root, package_id=pkg_id,
                                from_state=state, to_state=tgt,
                            )
                        except Exception as exc:  # noqa: BLE001
                            st.error(f"Move refused:\n\n{exc}")
                        else:
                            st.success(f"Moved `{pkg_id}`: {state} → {tgt}")
                            st.rerun()
                else:
                    st.caption("Terminal state — no further moves.")

                _render_source_local_commands(pkg_dir)


def _render_source_transfer(config, root: Path) -> None:
    st.subheader("Transfer & worker commands")
    host, rroot = _mac_studio_transfer_target(config)
    if host == "<MAC_STUDIO_HOST>":
        st.warning(
            "`MAC_STUDIO_SSH_HOST` is not set — the host below is a placeholder. "
            "Set `MAC_STUDIO_SSH_HOST` (and optionally `MAC_STUDIO_OFFLOAD_ROOT`) "
            "in `runner/.env` for ready-to-run commands."
        )
    mac_python = _mac_studio_python()
    if mac_python.startswith("<"):
        st.warning(
            "`MAC_STUDIO_PYTHON` is not set — the worker command below shows a "
            "placeholder interpreter. Set it to the Mac Studio repo venv "
            "(e.g. `/Users/cdn-ai/surviving-sogice-ingest/.venv/bin/python`) so "
            "the pasted command uses the right dependencies."
        )
    st.caption(f"Mac Studio: `{host}`  ·  remote root: `{rroot}`  ·  python: `{mac_python}`")

    rows = _source_package_rows(root)
    pkgs = sorted({r["package_id"] for r in rows})
    if not pkgs:
        st.info("No source packages yet — build one in the **Export** tab.")
        return
    chosen = st.selectbox("Package", options=pkgs, key="src_transfer_pkg")
    row = next((r for r in rows if r["package_id"] == chosen), None)
    pkg_dir = Path(row["path"]) if row else (root / "inbox" / chosen)
    cmds = _source_offload_transfer_commands(pkg_dir, host, rroot, mac_python)

    st.caption("The app never SSHes/rsyncs or launches the worker — copy-paste these in a terminal.")
    st.markdown("**1) Transfer the package to the Mac Studio:**")
    st.code(cmds["rsync_up"], language="bash")
    st.markdown("**2) Run the worker ON the Mac Studio:**")
    st.code(cmds["worker"], language="bash")
    st.markdown("**3) After it finishes, transfer the returned package back:**")
    st.code(cmds["rsync_back"], language="bash")
    st.caption("Then import it from the **Import results** tab.")

    st.divider()
    st.markdown("#### Manual archive transfer (no SSH — iCloud / AirDrop / external drive)")
    st.caption(
        "When SSH/rsync is blocked (e.g. on UiB networks), move a single "
        "`.tar.gz` + `.sha256` instead of the live folder. **Never sync the live "
        "package tree through iCloud** — partial sync corrupts it; archives are "
        "atomic and checksum-verified. The app only displays these commands."
    )
    arc = _source_offload_archive_commands(pkg_dir, rroot, mac_python=mac_python)
    st.markdown("**A) MacBook — archive the inbox package:**")
    st.code(arc["archive_local"], language="bash")
    st.markdown("**B) Copy the `.tar.gz` + `.sha256`** (AirDrop / iCloud shared folder / "
                "external drive), then verify the checksum where you copied it:")
    st.code(arc["verify_checksum"], language="bash")
    st.markdown("**C) Mac Studio — unpack into its inbox, then run the worker (step 2 above):**")
    st.code(arc["unpack_remote_inbox"], language="bash")
    st.markdown("**D) Mac Studio — archive the finished outbox package:**")
    st.code(arc["archive_remote_outbox"], language="bash")
    st.markdown("**E) Copy back, then MacBook — unpack into its outbox (ready to import):**")
    st.code(arc["unpack_local_outbox"], language="bash")


def _source_relink_queue(config, pkg_dir) -> None:
    """Relink source-queue rows after a successful corpus import (a queue write)."""
    try:
        from runner.pipeline.source_queue import open_db, queue_db_path, mark_ingested
        db = open_db(queue_db_path(config.corpus_dir))
        try:
            for link in _source_import_relink_preview(pkg_dir):
                doc_id = link.get("doc_id", "")
                item_id = link.get("queue_item_id", "")
                via = "queue_item_id"
                if not item_id and link.get("url_hash"):
                    r = db.execute(
                        "SELECT id FROM source_queue WHERE url_hash = ?", (link["url_hash"],)
                    ).fetchone()
                    if r:
                        item_id = r["id"]
                        via = "url_hash"
                if item_id and mark_ingested(db, item_id, doc_id):
                    st.write(f"↳ queue relinked **{doc_id}** → `{item_id}` ({via})")
                else:
                    st.write(f"↳ no queue row for **{doc_id}** (ad-hoc item)")
        finally:
            db.close()
    except Exception as exc:  # noqa: BLE001 — corpus is source of truth; do not roll back
        st.warning(f"Corpus import succeeded, but queue relink failed: {exc}\n\nThe corpus is the source of truth — relink manually if needed.")


def _render_source_import(config, root: Path) -> None:
    from runner.pipeline.offload_source import (
        INGEST_RESULT_MANIFEST_NAME, import_ingest_result, move_source_package_state,
    )

    st.subheader("Import returned results")
    st.caption(
        "Imports a Mac-Studio-returned `ingest_result` package into the live "
        "corpus. Offered **only** for `outbox` packages, requires a passing "
        "dry-run and explicit confirmation. Existing files are backed up; nothing "
        "is deleted. The source queue is relinked **only after** a successful "
        "corpus import."
    )
    _render_source_received_archives(config, root)
    misplaced = _source_misplaced_return_rows(root)
    if misplaced:
        st.markdown("#### Returned packages in the wrong local folder")
        st.caption(
            "These already contain Mac Studio results, but they are not physically "
            "in `source_offload/outbox/`, so the import controls below will not "
            "read them until they are repaired."
        )
        for row in misplaced:
            with st.expander(
                f"{row['package_id']} · currently in `{row['folder_state']}/` · "
                f"manifest `{row.get('manifest_state') or '?'}`"
            ):
                st.caption(f"Path: `{row['path']}`")
                if row.get("error"):
                    st.error(row["error"])
                else:
                    st.warning(
                        "This is a returned `ingest_result` package in the wrong "
                        "lifecycle folder. Repair will move it into `outbox/` so "
                        "it appears in the import selector."
                    )
                existing = _source_existing_package_states(root, row["package_id"])
                if "outbox" in existing:
                    st.info(
                        "An older `outbox/` copy with the same package id exists. "
                        "Repair will move that old copy to `failed/` first, then "
                        "move this returned package into `outbox/`. Nothing is deleted."
                    )
                if "failed" in existing and "outbox" in existing:
                    st.error(
                        "Cannot auto-repair because both `outbox/` and `failed/` "
                        "already contain this package id. Move one aside in the "
                        "Lifecycle browser first."
                    )
                if st.button(
                    "Repair: move returned package to outbox",
                    key=f"src_repair_misplaced_{row['folder_state']}_{row['package_id']}",
                    disabled=bool(row.get("error") or ("failed" in existing and "outbox" in existing)),
                ):
                    try:
                        target = _source_repair_misplaced_return(
                            root,
                            row["package_id"],
                            from_state=row["folder_state"],
                        )
                    except Exception as exc:  # noqa: BLE001
                        st.error(f"Repair refused:\n\n{exc}")
                    else:
                        st.success(f"Moved returned package to `{target}`.")
                        st.rerun()
    st.divider()
    st.markdown("#### Outbox packages ready to import")
    outbox_dir = root / "outbox"
    pkg_dirs = (
        [p for p in sorted(outbox_dir.iterdir())
         if p.is_dir() and not p.name.startswith(".") and (p / INGEST_RESULT_MANIFEST_NAME).is_file()]
        if outbox_dir.exists() else []
    )
    if not pkg_dirs:
        st.info("No returned `ingest_result` packages in `outbox/` to import.")
        return

    chosen = st.selectbox("Outbox package", options=[p.name for p in pkg_dirs], key="src_import_pkg")
    pkg_dir = outbox_dir / chosen

    worker_summary = _source_worker_report_summary(pkg_dir)
    failed_docs = worker_summary.get("failed") or []
    if failed_docs:
        st.warning(
            f"Partial result: {len(worker_summary.get('importable_doc_ids') or [])} "
            f"doc(s) are ready to import; {len(failed_docs)} failed/omitted doc(s) "
            "will **not** be relinked as ingested. They remain in the Source Queue "
            "for retry or manual capture."
        )
        with st.expander("Failed / omitted docs from worker report", expanded=True):
            st.write(failed_docs)

    preview = _source_import_relink_preview(pkg_dir)
    if preview:
        st.caption("Queue relink preview (applied only after a successful import):")
        st.write(preview)

    dryrun_key = f"src_dryrun_ok::{chosen}"
    force = st.checkbox(
        "Force overwrite researcher-reviewed/edited corpus docs (backed up first)",
        key=f"src_force_{chosen}",
    )

    if st.button("Dry-run import (preview)", key=f"src_dryrun_{chosen}"):
        try:
            summary = import_ingest_result(
                pkg_dir, corpus_dir=Path(config.corpus_dir), dry_run=True, force=force,
            )
        except Exception as exc:  # noqa: BLE001
            st.session_state[dryrun_key] = False
            st.error(f"Dry-run failed: {exc}")
        else:
            st.session_state[dryrun_key] = bool(summary.get("ok"))
            if summary.get("ok"):
                st.success("Dry-run OK — import would proceed. Review below, then confirm.")
                if summary.get("partial"):
                    omitted = ", ".join(summary.get("omitted_doc_ids") or [])
                    st.warning(
                        "Partial result: only completed documents will be imported."
                        + (f" Failed/omitted docs: {omitted}" if omitted else "")
                    )
                if summary.get("documents"):
                    st.write(summary["documents"])
            else:
                _render_source_import_errors(summary)

    dry_run_ok = bool(st.session_state.get(dryrun_key))
    if dry_run_ok:
        st.info("Dry-run succeeded for this package in this session.")
    confirmed = st.checkbox(
        "I have reviewed the dry-run and confirm importing into the live corpus.",
        key=f"src_confirm_{chosen}", disabled=not dry_run_ok,
    )

    can_import = _source_import_allowed("outbox", dry_run_ok, confirmed)
    if st.button("Import into corpus", key=f"src_import_go_{chosen}", disabled=not can_import):
        try:
            summary = import_ingest_result(
                pkg_dir, corpus_dir=Path(config.corpus_dir), dry_run=False, force=force,
            )
        except Exception as exc:  # noqa: BLE001
            st.error(f"Import failed — corpus may be partially untouched: {exc}")
            return
        if not summary.get("imported"):
            _render_source_import_errors(summary)
            return

        st.session_state.pop(dryrun_key, None)
        if summary.get("partial"):
            omitted = ", ".join(summary.get("omitted_doc_ids") or [])
            st.warning(
                f"Imported completed docs from partial package `{summary.get('package_id', chosen)}`."
                + (f" Failed/omitted docs: {omitted}" if omitted else "")
            )
        else:
            st.success(f"Imported `{summary.get('package_id', chosen)}` into the corpus.")
        imported_doc_ids: list[str] = []
        for doc in summary.get("documents", []):
            bk = f" (backed up: {', '.join(doc['backups'])})" if doc.get("backups") else ""
            st.write(f"✓ **{doc['doc_id']}**: {', '.join(doc['written'])}{bk}")
            if doc.get("doc_id"):
                imported_doc_ids.append(doc["doc_id"])

        # Queue relink — only now, after a successful corpus write.
        _source_relink_queue(config, pkg_dir)

        moved = False
        try:
            move_source_package_state(
                offload_root=root, package_id=chosen, from_state="outbox", to_state="imported",
            )
            moved = True
        except Exception as exc:  # noqa: BLE001
            st.warning(
                "Imported into corpus, but the package could not be marked "
                f"imported; resolve manually.\n\n{exc}"
            )
        else:
            st.success("Package moved to `imported/`.")
        _render_source_local_commands((root / "imported" / chosen) if moved else pkg_dir)
        _render_imported_doc_actions(config, imported_doc_ids, key_prefix=f"src_imported_{chosen}")


def page_source_offload():
    st.title("📤 Source Offload")
    st.caption(
        "**For queued / source documents that have NOT been ingested yet** — the "
        "Mac Studio fetches and analyzes raw sources, then returns completed "
        "corpus documents. This is **different from 📦 Offload Packages** "
        "(result-stage: already-ingested corpus docs). The app shows copy-paste "
        "commands only — it never SSHes, rsyncs, or launches the Mac Studio worker."
    )

    config = _load_config_safe()
    if config is None:
        st.error("Config unavailable — check runner/.env.")
        return

    root = _source_offload_root(config)
    st.caption(f"Source-offload root: `{root}`")

    lock_info = _offload_worker_lock_info(root)
    if lock_info:
        st.warning(
            "A worker lock is present at `.worker.lock` "
            f"(pid {lock_info.get('pid', '?')}, started {lock_info.get('started_at', '?')}). "
            "A worker may be running on the Mac Studio node."
        )

    tab_export, tab_browse, tab_transfer, tab_import = st.tabs(
        ["Export", "Lifecycle browser", "Transfer & worker", "Import results"]
    )
    with tab_export:
        _render_source_export(config, root)
    with tab_browse:
        _render_source_browser(config, root)
    with tab_transfer:
        _render_source_transfer(config, root)
    with tab_import:
        _render_source_import(config, root)


# ---------------------------------------------------------------------------
# Mac Studio Worker Console — local worker controls for archive transfer
# ---------------------------------------------------------------------------

def page_mac_studio_worker():
    from runner.pipeline.offload_source import (
        archive_source_package,
        unpack_source_archive,
    )

    st.title("🖥️ Mac Studio Worker")
    st.caption(
        "Local console for the Mac Studio side of source offload. It scans the "
        "Syncthing/AirDrop transfer folder, unpacks packages into the local "
        "source-offload inbox, runs `source-worker` locally, and archives finished "
        "outbox packages back to the transfer folder. No package is auto-deleted."
    )

    transfer_root = _source_transfer_root(mac_studio=True)
    offload_root = _mac_studio_offload_root()
    st.caption(f"Transfer root: `{transfer_root}`")
    st.caption(f"Mac Studio source-offload root: `{offload_root}`")

    config = _load_config_safe()
    if config:
        _render_system_health_panel(
            config,
            mac_studio=True,
            source_offload_root=offload_root,
            transfer_root=transfer_root,
        )
    else:
        st.warning("System health unavailable because runner/.env could not be loaded.")

    lock_info = _offload_worker_lock_info(offload_root)
    if lock_info:
        st.warning(
            "A source worker lock is present at `.worker.lock` "
            f"(pid {lock_info.get('pid', '?')}, started {lock_info.get('started_at', '?')}). "
            "Wait for the current worker to finish before starting another."
        )
    active = _read_app_job_lock()
    if active:
        st.info(_format_app_job_lock(active))

    job_key = "mac_studio_source_worker_job"
    _render_source_worker_job(job_key)

    tab_in, tab_worker, tab_out = st.tabs(
        ["Incoming archives", "Run worker", "Archive outbox"]
    )

    with tab_in:
        incoming = _source_to_mac_studio_dir(mac_studio=True)
        st.subheader("Incoming archives")
        st.caption(f"Folder: `{incoming}`")
        rows = _source_archive_rows(incoming)
        if not rows:
            st.info("No `.tar.gz` packages found in `to-mac-studio/`.")
        for row in rows:
            title = row["package_id"]
            title += " · checksum OK" if row["checksum_ok"] else " · checksum/problem"
            with st.expander(title):
                st.caption(f"Archive: `{row['archive_path']}`")
                if row["error"]:
                    st.error(row["error"])
                else:
                    st.success("Archive checksum and shape verified.")
                existing_states = _source_existing_package_states(offload_root, row["package_id"])
                if "inbox" in existing_states:
                    st.info("Already unpacked into `inbox/`; run it from the **Run worker** tab.")
                elif "outbox" in existing_states:
                    st.success("Already processed and present in `outbox/`; archive it from the **Archive outbox** tab.")
                elif existing_states:
                    st.info(
                        "This package already exists locally in: "
                        + ", ".join(f"`{state}/`" for state in existing_states)
                        + ". No need to unpack this transfer copy again."
                    )
                if st.button(
                    "Unpack to Mac Studio inbox",
                    key=f"ms_unpack_{row['package_id']}",
                    disabled=bool(row["error"] or existing_states),
                ):
                    try:
                        result = unpack_source_archive(
                            Path(row["archive_path"]),
                            source_offload_root=offload_root,
                            state="inbox",
                        )
                    except Exception as exc:  # noqa: BLE001
                        st.error(f"Unpack refused:\n\n{exc}")
                    else:
                        st.success(f"Unpacked `{result['package_id']}` to `{result['package_dir']}`.")
                        st.rerun()
        folder_rows = _source_transfer_folder_rows(incoming)
        if folder_rows:
            st.divider()
            st.markdown("#### Direct package folders")
            st.caption(
                "These are live package folders synced into `to-mac-studio/`. "
                "The safer path is `.tar.gz` + `.sha256`, but this fallback can "
                "copy a fully synced folder into the Mac Studio inbox. The transfer "
                "copy is not deleted."
            )
        for row in folder_rows:
            title = row["package_id"]
            title += " · verified" if row["ok"] else " · problem"
            with st.expander(title):
                st.caption(f"Folder: `{row['path']}`")
                if row["error"]:
                    st.error(row["error"])
                    if row.get("errors") or row.get("unexpected"):
                        st.caption("Details:")
                        st.write({
                            "errors": row.get("errors", []),
                            "unexpected": row.get("unexpected", []),
                        })
                else:
                    st.success("Folder package verified.")
                existing_states = _source_existing_package_states(offload_root, row["package_id"])
                if "inbox" in existing_states:
                    st.info("Already copied into `inbox/`; run it from the **Run worker** tab.")
                elif "outbox" in existing_states:
                    st.success("Already processed and present in `outbox/`; archive it from the **Archive outbox** tab.")
                elif existing_states:
                    st.info(
                        "This package already exists locally in: "
                        + ", ".join(f"`{state}/`" for state in existing_states)
                        + ". No need to copy this transfer folder again."
                    )
                target = offload_root / "inbox" / row["package_id"]
                if st.button(
                    "Copy folder to Mac Studio inbox",
                    key=f"ms_copy_folder_{row['package_id']}",
                    disabled=bool(row["error"] or existing_states),
                ):
                    try:
                        if target.exists():
                            raise FileExistsError(target)
                        target.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copytree(
                            row["path"],
                            target,
                            ignore=lambda _dir, names: [
                                n for n in names if _source_transfer_ignored_member(n)
                            ],
                        )
                        _source_reconcile_manifest_state(target, "inbox")
                    except Exception as exc:  # noqa: BLE001
                        st.error(f"Copy refused:\n\n{exc}")
                    else:
                        st.success(f"Copied `{row['package_id']}` to `{target}`.")
                        st.rerun()

    with tab_worker:
        st.subheader("Run source worker")
        st.caption(
            "Starts one local background worker using this app's Python environment. "
            "The app checks both the app heavy-job lock and the source-offload `.worker.lock`."
        )
        inbox_rows = [
            r for r in _source_package_rows(offload_root)
            if r["folder_state"] == "inbox" and not r.get("error")
        ]
        if not inbox_rows:
            st.info("No inbox packages ready to run.")
        else:
            chosen = st.selectbox(
                "Inbox package",
                options=[r["package_id"] for r in inbox_rows],
                key="ms_worker_pkg",
            )
            pkg_dir = offload_root / "inbox" / chosen
            llm = st.text_input(
                "Analysis route",
                value=_SOURCE_WORKER_DEFAULT_LLM,
                key="ms_worker_llm",
                help="`litelm` routes analysis through core-qwen. Use `litelm-heavy` only if you intentionally want analysis on core-gemma.",
            )
            enrich_model = st.text_input(
                "Enrichment model",
                value=_SOURCE_WORKER_DEFAULT_ENRICH_MODEL,
                key="ms_worker_enrich_model",
                help="`core-gemma` routes enrichment through gemma4:31b. Embedding still uses research-embedding.",
            )
            if st.button("Verify selected package", key=f"ms_verify_{chosen}"):
                _render_offload_verify_report(
                    _source_worker_verify_report(pkg_dir),
                    title="Source inputs verification",
                )
            disabled = bool(_offload_worker_lock_info(offload_root) or _read_app_job_lock())
            if st.button("Run source-worker", key=f"ms_run_{chosen}", disabled=disabled):
                try:
                    st.session_state[job_key] = _start_source_worker_job(
                        pkg_dir,
                        llm=llm.strip() or _SOURCE_WORKER_DEFAULT_LLM,
                        enrich_model=enrich_model.strip() or _SOURCE_WORKER_DEFAULT_ENRICH_MODEL,
                    )
                except Exception as exc:  # noqa: BLE001
                    st.error(f"Could not start worker:\n\n{exc}")
                else:
                    st.success("Source worker started. Use Refresh worker status to watch progress.")
                    st.rerun()

    with tab_out:
        st.subheader("Archive completed outbox packages")
        outgoing = _source_from_mac_studio_dir(mac_studio=True)
        st.caption(f"Destination: `{outgoing}`")
        outbox_rows = [
            r for r in _source_package_rows(offload_root)
            if r["folder_state"] == "outbox" and not r.get("error")
        ]
        if not outbox_rows:
            st.info("No completed outbox packages to archive.")
        for row in outbox_rows:
            pkg_id = row["package_id"]
            pkg_dir = Path(row["path"])
            archive_path = outgoing / f"{pkg_id}.tar.gz"
            with st.expander(f"{pkg_id} · {row.get('item_count') or '?'} item(s)"):
                st.caption(f"Package: `{pkg_dir}`")
                if archive_path.exists():
                    st.info(f"Archive already exists: `{archive_path}`")
                if st.button(
                    "Archive to from-mac-studio",
                    key=f"ms_archive_{pkg_id}",
                    disabled=archive_path.exists(),
                ):
                    try:
                        result = archive_source_package(pkg_dir, output_dir=outgoing)
                    except Exception as exc:  # noqa: BLE001
                        st.error(f"Archive refused:\n\n{exc}")
                    else:
                        st.success(
                            f"Archived `{pkg_id}`. Move/sync both files: "
                            f"`{result['archive_path']}` and `{result['sha256_path']}`."
                        )
                        st.rerun()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    main()
