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
import difflib
import json
import os
import re
import sys
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
        "Corpus Intelligence",
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
        "Seed Data",
    ]
    if st.session_state.get("page") not in pages:
        st.session_state["page"] = pages[0]
    requested_page = st.session_state.pop("_nav_to", None)
    if requested_page in pages:
        st.session_state["page"] = requested_page

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
    elif page == "Corpus Intelligence":
        page_corpus_intelligence()
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

    if pending_upload_count:
        st.warning(f"{pending_upload_count} document(s) are saved locally but not uploaded yet. Go to Pending Upload.")

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


def _dashboard_ingest_readiness(config):
    st.subheader("Before Continuing Ingestion")
    docs = _load_local_docs(config.corpus_dir) if config.corpus_dir.exists() else []
    intel_rows = _corpus_intelligence_rows(config.corpus_dir) if config.corpus_dir.exists() else []
    gate = _proposal_gate_status(config.corpus_dir) if config.corpus_dir.exists() else {}

    missing_dates = [doc for doc in docs if not doc.get("publication_date")]
    embedding_gaps = [
        doc for doc in docs
        if not doc.get("embedding_ok") or not doc.get("supabase_ok")
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
                st.bar_chart(year_counts, x="year", y="documents")
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
            ["Analyze", "Upload (analysis already done)"],
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
        run_enrich = st.checkbox("Run enrichment after analysis", value=st.session_state.ingest["run_enrich"])
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
                triage_result = _triage_mod.run(snippet, config)
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

    # Load analysis if already done and stage is Upload
    analysis_result = None
    analysis_json = ""
    analysis_valid = False
    if stage.startswith("Upload") and analysis_path.exists():
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
        "uploaded":       False,
    })
    loaded = []
    if intake_result:    loaded.append("intake")
    if preprocess_result: loaded.append("extraction")
    if analysis_result:  loaded.append("analysis")
    st.success(f"Loaded `{doc_id}` — {', '.join(loaded)} ready. Scroll down to continue.")

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
        "run_enrich": False,
        "allow_whisper": False,
        "enrich_model": "",
        "intake": None,
        "preprocess": None,
        "embedding": None,
        "analysis": None,
        "analysis_json": "",
        "analysis_valid": False,
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

    # ── Step 1: LLM Analysis ────────────────────────────────────────────────
    st.markdown("**Step 1 of 2 — LLM Analysis**")
    with st.spinner(f"Sending document to `{llm}` for classification…"):
        try:
            result = analyze.run(preprocess_result, llm=llm, config=config)
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
        with st.spinner("Running enrichment..."):
            result = enrich.run(
                st.session_state.ingest["intake"].doc_id,
                st.session_state.ingest["preprocess"],
                final,
                config=config,
                llm=enrich_llm,
                model=st.session_state.ingest.get("enrich_model") or None,
            )
        enrich.save(st.session_state.ingest["intake"].doc_id, result, config)
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
    testimony_blocked = _testimony_requires_review(
        st.session_state.ingest["intake"].doc_id,
        st.session_state.ingest.get("analysis"),
        config,
    )
    if testimony_blocked:
        _analysis_obj = st.session_state.ingest.get("analysis")
        _doc_type = getattr(_analysis_obj, "type", "") or ""
        _type_note = (
            f" Document type is **{_doc_type}** — consent gate applies to Testimony and Survivor-Network-Material regardless of testimony_flag."
            if _doc_type in upload._CONSENT_GATED_TYPES
            else ""
        )
        st.warning(
            "Upload is blocked — consent review required before this document can be uploaded."
            + _type_note
            + " Complete Testimony Review and confirm consent status."
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
        if st.button("Upload", disabled=(not st.session_state.ingest.get("analysis_valid") or testimony_blocked)):
            try:
                final = AnalysisResult.model_validate(json.loads(st.session_state.ingest["analysis_json"]))
                upload.run(
                    st.session_state.ingest["intake"],
                    st.session_state.ingest["preprocess"],
                    st.session_state.ingest["embedding"] or [],
                    final,
                    config=config,
                    llm_used=llm,
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

        note = st.text_input("Decision note", key=f"second_note_{filename}")
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

    docs = _load_local_docs(corpus_dir)
    if not docs:
        st.info("No documents found in local corpus. Run `python -m runner ingest <url>` to add one.")
        return

    # Filters
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        all_types = sorted({d.get("type", "Unknown") for d in docs})
        filter_type = st.multiselect("Document type", all_types)
    with col2:
        all_batches = sorted({d.get("batch_id", "—") for d in docs})
        filter_batch = st.multiselect("Batch", all_batches)
    with col3:
        filter_uploaded = st.selectbox(
            "Upload status", ["All", "Uploaded", "Local only"]
        )
    with col4:
        filter_intensity = st.selectbox(
            "Rhetorical intensity",
            ["All", "hook", "pathologizing", "active-conduct", "— (unset)"],
        )

    filtered = docs
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

    sort_col1, sort_col2 = st.columns([1, 3])
    with sort_col1:
        sort_by = st.selectbox(
            "Sort by",
            ["doc_id", "confidence ↓", "rhetorical_intensity", "analysis_saved_at ↓"],
        )
    if sort_by == "confidence ↓":
        filtered = sorted(filtered, key=lambda d: d.get("confidence", 0), reverse=True)
    elif sort_by == "rhetorical_intensity":
        _ri_order = {"active-conduct": 0, "pathologizing": 1, "hook": 2, None: 3, "—": 3}
        filtered = sorted(filtered, key=lambda d: _ri_order.get(d.get("rhetorical_intensity") or None, 3))
    elif sort_by == "analysis_saved_at ↓":
        filtered = sorted(filtered, key=lambda d: str(d.get("analysis_saved_at") or ""), reverse=True)

    st.caption(f"Showing {len(filtered)} of {len(docs)} documents")

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
        set_desc = st.text_input("Description", key="doc_set_desc")
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

    for doc in filtered:
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
            rows.append(json.loads(path.read_text(encoding="utf-8")))
        except Exception:
            continue
    return rows


def _pending_second_opinion_summary(doc_dir: Path) -> dict:
    pending = []
    for path in sorted(doc_dir.glob("analysis_comparison_*.json"), reverse=True):
        payload = _read_json_file(path, {})
        if payload.get("outcome") == "pending":
            pending.append(payload)
    latest = pending[0].get("generated_at", "") if pending else ""
    return {"count": len(pending), "latest_generated_at": latest}


def _load_local_docs(corpus_dir: Path) -> list[dict]:
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
        embedding_status = _local_embedding_status(doc_dir, config)
        media = _read_json_file(doc_dir / "media_metadata.json", {})
        general = media.get("general", {}) if isinstance(media, dict) else {}
        preprocess = _read_json_file(doc_dir / "preprocess.json", {})
        metadata = _read_json_file(doc_dir / "metadata.json", {})
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
            "harm": data.get("harm", []),
        })

    return docs


def _render_doc_card(doc: dict, corpus_dir: Path):
    conf = doc["confidence"]
    conf_color = "🟢" if conf >= 0.85 else "🟡" if conf >= 0.70 else "🔴"
    upload_badge = "☁️ Sanity" if doc["uploaded"] else "💾 Local"
    embedding_badge = " · Supabase" if doc.get("supabase_ok") else " · Embedding missing"
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

    header = (
        f"{conf_color} **{doc['doc_id']}** — {doc['type']} | {doc['format']} | "
        f"{upload_badge}{embedding_badge}{enrich_badge}{media_badge}{annotation_badge}{second_opinion_badge}"
    )

    with st.expander(header, expanded=False):
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
        col1, col2 = st.columns([2, 1])
        with col1:
            if doc["summary"]:
                st.markdown(doc["summary"])
            if doc["source"]:
                st.caption(f"Source: {doc['source']}")
        with col2:
            st.metric("Confidence", f"{conf:.2f} ({doc['conf_status']})")
            date_rows = [
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
            elif not doc.get("supabase_ok"):
                st.warning(f"No Supabase embedding row found: {doc.get('supabase_detail')}")

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
                if st.button("⬆ Upload to Sanity", key=f"upload_{doc['doc_id']}", type="primary"):
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
        elif uploaded and not supabase_ok:
            # Embedding exists locally + Sanity record written, but Supabase row is missing
            if st.button("Push embedding to Supabase", key=f"push_supa_{doc['doc_id']}",
                         help="Embedding exists locally; Supabase row is missing. Re-uploads to Sanity + Supabase."):
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
                    st.success("Analysis updated.")
                else:
                    st.error(r.stderr[-600:] or r.stdout[-600:])
                st.rerun()

        with act_cols[2]:
            if st.button("✨ Re-enrich", key=f"reenrich_{doc['doc_id']}"):
                with st.spinner("Running enrichment…"):
                    r = __import__("subprocess").run(
                        [sys.executable, "-m", "runner", "enrich", doc["doc_id"], "--yes"],
                        capture_output=True, text=True, cwd=_project_root,
                    )
                if r.returncode == 0:
                    st.success("Enrichment saved.")
                else:
                    st.error(r.stderr[-600:] or r.stdout[-600:])
                st.rerun()


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


def _local_embedding_status(doc_dir: Path, config) -> dict:
    status = {
        "ok": False,
        "detail": "missing embedding.json",
        "supabase_ok": False,
        "supabase_detail": "not checked",
    }
    emb_path = doc_dir / "embedding.json"
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
    if config:
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
    return status


def _generate_and_push_embedding(doc_id: str, corpus_dir: Path, config) -> tuple[bool, str]:
    if not config:
        return False, "Could not load config."
    doc_dir = corpus_dir / doc_id
    try:
        extracted = (doc_dir / "extracted.txt").read_text(encoding="utf-8")
        from runner.pipeline import embed as _embed
        from runner.clients import supabase as _sb

        attempts: list[str] = []
        vec: list[float] = []
        if getattr(config, "litelm_base_url", ""):
            try:
                vec = _embed.run_litelm(extracted, config)
                attempts.append(f"LiteLLM {config.litelm_embedding_model}: ok ({len(vec)}d)")
            except Exception as exc:
                attempts.append(f"LiteLLM {config.litelm_embedding_model}: failed: {exc}")

        if not vec and getattr(config, "litelm_ollama_base_url", ""):
            try:
                vec = _embed._call(
                    config.litelm_ollama_base_url,
                    config.litelm_ollama_embedding_model,
                    extracted,
                )
                attempts.append(f"Mac Studio Ollama {config.litelm_ollama_embedding_model}: ok ({len(vec)}d)")
            except Exception as exc:
                attempts.append(f"Mac Studio Ollama {config.litelm_ollama_embedding_model}: failed: {exc}")

        if not vec:
            try:
                vec = _embed.run(extracted, config)
                attempts.append(f"Local Ollama {config.embedding_model}: ok ({len(vec)}d)")
            except Exception as exc:
                attempts.append(f"Local Ollama {config.embedding_model}: failed: {exc}")

        if not vec:
            return False, "Embedding generation failed. Attempts:\n" + "\n".join(f"- {item}" for item in attempts)
        _embed.save(doc_id, vec, config)

        from runner.models.document import AnalysisResult as _AR

        analysis_data = json.loads((doc_dir / "analysis.json").read_text())
        ar = _AR.model_validate(analysis_data)
        intake_data = json.loads((doc_dir / "intake.json").read_text()) if (doc_dir / "intake.json").exists() else {}
        _sb.upsert_embedding(
            doc_id,
            vec,
            ar,
            config,
            tier=str(intake_data.get("tier", "")),
            language=intake_data.get("language", ""),
            embedding_model=config.embedding_model,
        )
        return True, f"Embedding generated ({len(vec)}d) and pushed to Supabase.\n" + "\n".join(attempts)
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

def _render_sanity_lexicon_tab(config) -> None:
    """Show Sanity lexicon terms as per-document research dossiers."""
    c_refresh, c_search, c_status = st.columns([1, 3, 2])
    with c_refresh:
        if st.button("Refresh", key="sanity_lexicon_refresh"):
            st.session_state.pop("lexicon_terms", None)
    with c_search:
        search_q = st.text_input(
            "Search terms",
            placeholder="Filter by term...",
            label_visibility="collapsed",
            key="sanity_lexicon_search",
        )
    with c_status:
        status_filter = st.selectbox(
            "Status",
            ["all", "candidate", "draft", "validated"],
            label_visibility="collapsed",
            key="sanity_lexicon_status",
        )

    if "lexicon_terms" not in st.session_state:
        try:
            from runner.clients.sanity import fetch_lexicon_terms

            st.session_state.lexicon_terms = fetch_lexicon_terms(config)
        except Exception as exc:
            st.error(f"Could not fetch lexicon from Sanity: {exc}")
            st.session_state.lexicon_terms = []

    terms = st.session_state.lexicon_terms
    visible = terms
    if search_q:
        sq = search_q.lower()
        visible = [row for row in visible if sq in (row.get("term") or "").lower()]
    if status_filter != "all":
        visible = [row for row in visible if row.get("status") == status_filter]

    total_evidence = sum(len(row.get("evidenceDossier") or []) for row in terms)
    confirmed = sum(
        1
        for row in terms
        for evidence in (row.get("evidenceDossier") or [])
        if evidence.get("confirmed")
    )
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Terms", len(terms))
    m2.metric("Showing", len(visible))
    m3.metric("Evidence records", total_evidence)
    m4.metric("Confirmed", f"{confirmed}/{total_evidence}")
    st.caption(
        "Each evidence record is one document-specific usage of a term. Confirming a record means "
        "you reviewed that usage; it does not mean every use of the term has the same meaning."
    )

    if not visible:
        st.info("No lexicon terms match the current filters.")
        return

    for term_entry in visible:
        term_name = term_entry.get("term", "?")
        status = term_entry.get("status", "draft")
        cluster = term_entry.get("proposedCluster") or "-"
        function = term_entry.get("function") or "-"
        dossier = term_entry.get("evidenceDossier") or []
        confirmed_count = sum(1 for row in dossier if row.get("confirmed"))
        pending_count = len(dossier) - confirmed_count
        header = (
            f"{term_name} - {status} - {cluster} / {function} - "
            f"{len(dossier)} evidence record(s), {pending_count} pending"
        )
        with st.expander(header, expanded=(pending_count > 0 and len(visible) <= 8)):
            definition = term_entry.get("draftDefinition") or term_entry.get("accessibleDefinition") or ""
            if definition:
                st.write(definition)
            if not dossier:
                st.caption("No evidence dossier records yet.")
                continue
            for evidence in dossier:
                _render_lexicon_evidence_record(term_entry, evidence, config)


def _render_lexicon_evidence_record(term_entry: dict, evidence: dict, config) -> None:
    evidence_key = evidence.get("_key", "")
    sanity_id = term_entry.get("_id", "")
    doc_ref = (evidence.get("docRef") or "unknown").replace("doc-", "")
    confirmed = bool(evidence.get("confirmed"))
    model_conf = _format_confidence(evidence.get("modelConfidence"))
    researcher_conf = _format_confidence(evidence.get("researcherConfidence"))
    register = evidence.get("usageRegister") or evidence.get("stanceProfile") or "-"
    lang = evidence.get("language") or "-"
    st.markdown(
        f"**{'Confirmed' if confirmed else 'Pending'}** | "
        f"doc `{doc_ref}` | language `{lang}` | register `{register}` | "
        f"model confidence `{model_conf}` | researcher confidence `{researcher_conf}`"
    )

    quote = evidence.get("exactQuote") or evidence.get("excerpt") or ""
    if quote:
        st.markdown(f"> {quote}")
    definition_as_used = evidence.get("definitionAsUsed") or ""
    if definition_as_used:
        st.markdown(f"**Definition as used in this source:** {definition_as_used}")

    detail_bits = {
        "Co-occurring terms": ", ".join(evidence.get("coOccurringTerms") or []),
        "Relationship notes": evidence.get("relationshipNotes") or "",
        "Model rationale": evidence.get("confidenceRationale") or "",
        "Researcher note": evidence.get("researcherNote") or "",
        "Confirmation note": evidence.get("confirmedNote") or "",
    }
    if any(detail_bits.values()):
        with st.expander("Evidence details"):
            for label, value in detail_bits.items():
                if value:
                    st.markdown(f"**{label}:** {value}")

    if not confirmed and sanity_id and evidence_key:
        with st.form(f"confirm_lexicon_{sanity_id}_{evidence_key}"):
            note = st.text_input(
                "Confirmation note",
                placeholder="Optional note about why this usage is confirmed",
            )
            submitted = st.form_submit_button("Confirm this evidence record")
        if submitted:
            try:
                from runner.clients.sanity import confirm_lexicon_context

                confirm_lexicon_context(sanity_id, evidence_key, config, note=note)
                st.session_state.pop("lexicon_terms", None)
                st.success("Lexicon evidence record confirmed.")
                st.rerun()
            except Exception as exc:
                st.error(f"Could not confirm evidence record: {exc}")
    st.divider()


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
        confirmed_count = sum(1 for e in dossier if e.get("confirmed"))
        pending_count = len(dossier) - confirmed_count

        status_badge = {"validated": "✅", "draft": "🔵", "candidate": "🟡"}.get(status, "⬜")
        pending_badge = f"  🔴 {pending_count} pending" if pending_count else ""
        header = f"{status_badge} **{term_name}** — {cluster} · {func} · {freq} doc(s){pending_badge}"

        with st.expander(header, expanded=(pending_count > 0 and len(visible) <= 10)):
            def_text = term_entry.get("draftDefinition") or term_entry.get("accessibleDefinition") or ""
            if def_text:
                st.caption(def_text[:300])

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
        "Evidence confirmed",
        f"{overview.get('evidence_confirmed', 0)}/{overview.get('evidence_total', 0)}",
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
        bucket = overview.get("by_type", {}).get(schema_type)
        if not bucket:
            continue
        states = bucket.get("states", {})
        rows.append(
            {
                "registry": bucket.get("label", schema_type),
                "total": bucket.get("total", 0),
                "validated": states.get("validated", 0),
                "needs_validation": states.get("needs_review", 0),
                "deprecated": states.get("deprecated", 0),
            }
        )
    if rows:
        st.dataframe(rows, width="stretch", hide_index=True)

    review_rows = overview.get("review_rows", [])
    if review_rows:
        with st.expander(f"Needs validation queue ({len(review_rows)})"):
            st.caption(
                "This queue covers lexicon terms, entity records, tactics, practices, and tag registry rows. "
                "Confirming here changes the Sanity registry status; lexicon evidence records still have "
                "their own per-document confirmation buttons in the Sanity Lexicon tab."
            )
            filter_options = ["All"] + [
                bucket["label"]
                for key in type_order
                if (bucket := overview.get("by_type", {}).get(key))
            ]
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
                _render_registry_validation_row(row, config)
            if len(visible) > 100:
                st.caption(f"Showing first 100 of {len(visible)} records. Use Sanity Studio for bulk cleanup.")


def _registry_type_label(schema_type: str) -> str:
    return {
        "lexiconEntry": "Lexicon",
        "organization": "Organizations",
        "person": "People",
        "tacticEntry": "Tactics",
        "practiceEntry": "Practices",
        "tagRegistry": "Tags",
    }.get(schema_type, schema_type or "Unknown")


def _render_registry_validation_row(row: dict, config) -> None:
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

    row_col, action_col = st.columns([5, 1])
    with row_col:
        st.markdown(f"**{label}**")
        st.caption(meta)
    with action_col:
        if st.button("Validate", key=f"validate_registry_{sanity_id}"):
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


def page_lexicon():
    st.title("Lexicon")

    config = _load_config_safe()
    if not config:
        st.error("Could not load config. Check runner/.env.")
        return

    _render_registry_status_overview(config)

    st.info(
        "Analysis and enrichment fetch current Sanity lexicon/registry data at run time. "
        "Local proposals are saved after enrichment; approval-to-Sanity is intentionally separate."
    )

    tabs = st.tabs([
        "Sanity Lexicon",
        "Entity Registry",
        "Local Proposals",
        "Seed Import Preview",
        "Variant Import Preview",
        "Legacy Vocabulary Preview",
        "Sanity Schema Files",
        "Seed Docs",
        "Three-System Reference",
        "Ingestion Prompt",
    ])

    with tabs[0]:
        _render_sanity_lexicon_tab(config)

    with tabs[1]:
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

    with tabs[2]:
        _render_local_proposal_queue(config)

    with tabs[3]:
        _render_seed_lexicon_import(config)

    with tabs[4]:
        _render_variant_import(config)

    with tabs[5]:
        _render_legacy_vocabulary_import(config)

    with tabs[6]:
        schema_files = {
            "Document schema": _project_root / "studio" / "schemas" / "document.ts",
            "Lexicon entry schema": _project_root / "studio" / "schemas" / "lexiconEntry.ts",
            "Organization schema": _project_root / "studio" / "schemas" / "organization.ts",
            "Person schema": _project_root / "studio" / "schemas" / "person.ts",
            "Schema index": _project_root / "studio" / "schemas" / "index.ts",
        }
        selected = st.selectbox("Schema file", list(schema_files.keys()))
        _show_text_file(schema_files[selected], language="typescript")

    with tabs[7]:
        st.info(
            "Seed lexicon import policy: entries with clear definition and source evidence can become validated; "
            "entries without source URL/evidence should enter Sanity as draft so new ingestions can collect validating evidence and regional variants."
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

    with tabs[8]:
        _render_three_system_reference()

    with tabs[9]:
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
    try:
        from runner.pipeline.tag_registry import OVERRIDES_PATH, load_tag_registry, save_tag_override
    except Exception as exc:
        st.error(f"Could not load tag registry: {exc}")
        return

    if st.button("Reload Tag Registry"):
        st.session_state.pop("tag_registry_rows", None)
    if "tag_registry_rows" not in st.session_state:
        st.session_state.tag_registry_rows = load_tag_registry()
    rows = st.session_state.tag_registry_rows
    if not rows:
        st.warning("No tag registry rows found.")
        return

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Tags", len(rows))
    c2.metric("Categories", len({row["category"] for row in rows}))
    c3.metric("Active", sum(1 for row in rows if row.get("active", True)))
    c4.metric("With connections", sum(1 for row in rows if row.get("connections")))

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


def _render_seed_lexicon_import(config) -> None:
    st.info(
        "Preview the local Markdown lexicon before it enters Sanity. "
        "Validated is recommended only when an entry has a definition plus explicit source evidence; otherwise it imports as draft."
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
            "status": st.column_config.SelectboxColumn("Status", options=["draft", "validated"]),
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
        if canonical in {"Gender Ideology", "Reparative Therapy", "Conversion Therapy", "Conversion Practices", "Pastoral Support", "Watchful Waiting", "Self-determination", "Same-sex attraction"}:
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
                ["draft", "validated"],
                index=_option_index(["draft", "validated"], row.get("status", "draft")),
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
                ["draft", "validated"],
                index=_option_index(["draft", "validated"], row.get("status", "draft")),
                key=f"{prefix}_status",
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
    heading_re = re.compile(r"^\*\*(.+?)\*\*(?:\s*\((.*?)\))?\s*$")
    inline_re = re.compile(r"^\*\*(.+?)\*\*\s+—\s+(.+)$")

    def flush() -> None:
        if not current_heading:
            return
        entry = _parse_seed_entry(current_heading[0], current_heading[1], current_lines)
        if entry:
            entries.append(entry)

    for line in text.splitlines():
        stripped = line.strip()
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
    recommended_status = "validated" if definition and has_source_evidence else "draft"
    reason = "definition plus source evidence" if recommended_status == "validated" else "needs source evidence from ingested documents"
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
    if item.get("rejected"):
        return "Rejected"
    if item.get("approved") and item.get("pushed_to_sanity"):
        return "Pushed"
    if item.get("approved"):
        return "Approved, not pushed"
    return "Needs review"


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


def _render_proposal_status_metrics(records: list[dict]) -> None:
    status_counts = _proposal_status_counts(records)
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Needs review", status_counts["Needs review"])
    c2.metric("Approved, not pushed", status_counts["Approved, not pushed"])
    c3.metric("Pushed", status_counts["Pushed"])
    c4.metric("Rejected", status_counts["Rejected"])


def _proposal_display_position(record: dict) -> int:
    return int(record.get("index", 0)) + 1


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
    queue_tabs = st.tabs([
        "Lexicon Queue",
        "Entity Queue",
        "Tactic Queue",
        "Practice Queue",
        "Claims Queue",
        "Ingestion Queue",
        "Gate Status",
    ])

    with queue_tabs[0]:
        _render_lexicon_queue(config, lexicon_records)
    with queue_tabs[1]:
        _render_entity_queue(config, entity_records)
    with queue_tabs[2]:
        _render_tactic_queue(config, tactic_records)
    with queue_tabs[3]:
        _render_practice_queue(config, practice_records)
    with queue_tabs[4]:
        _render_claim_queue(config, claim_records)
    with queue_tabs[5]:
        _render_ingestion_queue(config)
    with queue_tabs[6]:
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
                item["researcher_note"] = (item.get("researcher_note", "") + "\nPushed to Sanity as draft.").strip()
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
        if errors:
            st.error("\n".join(errors))

    st.subheader("Review Proposals")
    for record in records:
        item = record["item"]
        label = _proposal_expander_label(record, item.get("term", "(missing term)"))
        with st.expander(label):
            _render_single_proposal_editor(record)


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
            try:
                from runner.clients.sanity import write_entity_from_proposal
                sanity_id = write_entity_from_proposal(item, record["doc_id"], config)
                item["pushed_to_sanity"] = True
                item["sanity_id"] = sanity_id
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
    for record in records:
        item = record["item"]
        label = _proposal_expander_label(record, item.get("name", "(missing name)"))
        with st.expander(label):
            _render_single_entity_editor(record)


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
            try:
                from runner.clients.sanity import write_tactic_from_proposal
                sanity_id = write_tactic_from_proposal(item, record["doc_id"], config)
                item["pushed_to_sanity"] = True
                item["sanity_id"] = sanity_id
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
    for record in records:
        item = record["item"]
        label = _proposal_expander_label(record, item.get("tactic", "(missing tactic)"))
        with st.expander(label):
            _render_single_tactic_editor(record)


def _render_practice_queue(config, records: list[dict]) -> None:
    st.caption(f"{len(records)} local practice proposal(s)")
    if not records:
        st.info("No local practice descriptions found yet.")
        return
    records = sorted(records, key=lambda record: _proposal_review_sort_key(record, "practice_id"))
    _render_proposal_status_metrics(records)
    st.caption(
        "Proposal # is the local JSON position for editing/saving. It is not a model confidence score."
    )
    st.dataframe([
        {
            "status": _proposal_review_status(record["item"]),
            "doc_id": record["doc_id"],
            "proposal #": _proposal_display_position(record),
            "practice_id": record["item"].get("practice_id", ""),
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

    if st.button("Push approved practices to Sanity"):
        pushed = 0
        errors: list[str] = []
        pushed_ids: list[str] = []
        for record in records:
            item = record["item"]
            if not item.get("approved") or item.get("rejected") or item.get("pushed_to_sanity"):
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

    st.subheader("Review Practices")
    for record in records:
        item = record["item"]
        label = _proposal_expander_label(record, item.get("practice_id", "(missing practice)"))
        with st.expander(label):
            _render_single_practice_editor(record)


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
    for record in records:
        item = record["item"]
        label = _proposal_expander_label(record, _short_label(item.get("claim", "(missing claim)"), 90))
        with st.expander(label):
            _render_single_claim_editor(record)


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
            _update_enrichment_proposal(record["path"], "lexicon_proposals", record["index"], item)
            st.success("Approved locally. Push approved drafts to Sanity when ready.")
    with b3:
        if st.button("Reject", key=f"{prefix}_reject"):
            item["approved"] = False
            item["rejected"] = True
            _update_enrichment_proposal(record["path"], "lexicon_proposals", record["index"], item)
            st.success("Rejected locally.")


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
    with c2:
        item["self_description"] = st.text_area(
            "Self-description",
            value=item.get("self_description", ""),
            height=100,
            key=f"{prefix}_description",
        )
        item["role_in_sogice"] = st.text_input("Role in SOGICE", value=item.get("role_in_sogice", ""), key=f"{prefix}_role")

    c3, c4 = st.columns([1, 1])
    with c3:
        item["country_of_origin"] = st.text_input(
            "Country of origin",
            value=item.get("country_of_origin", ""),
            key=f"{prefix}_country",
            help="ISO country code or full country name where the entity is based or registered (e.g. 'NO', 'Germany'). "
                 "Confirm against the source document or the entity's own website before approving.",
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
        st.write("**Network connections:**")
        st.dataframe(item["network_connections"], width="stretch")
    if item.get("key_individuals"):
        st.write("**Key individuals:**")
        st.dataframe(item["key_individuals"], width="stretch")
    _render_proposal_confidence_editor(item, prefix)

    b1, b2, b3 = st.columns(3)
    with b1:
        if st.button("Save Entity Edits", key=f"{prefix}_save"):
            _update_enrichment_proposal(record["path"], "entity_proposals", record["index"], item)
            st.success("Saved entity edits.")
    with b2:
        if st.button("Approve Entity", key=f"{prefix}_approve"):
            item["approved"] = True
            item["rejected"] = False
            _update_enrichment_proposal(record["path"], "entity_proposals", record["index"], item)
            st.success("Approved locally. Push approved entities to Sanity when ready.")
    with b3:
        if st.button("Reject Entity", key=f"{prefix}_reject"):
            item["approved"] = False
            item["rejected"] = True
            _update_enrichment_proposal(record["path"], "entity_proposals", record["index"], item)
            st.success("Rejected locally.")


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
        item["existing_tactic_id"] = st.text_input("Existing Sanity tactic id", value=item.get("existing_tactic_id", "") or "", key=f"{prefix}_existing")

    item["definition"] = st.text_area("Definition", value=item.get("definition", ""), height=100, key=f"{prefix}_definition")
    item["evidence_quote"] = st.text_area("Evidence quote", value=item.get("evidence_quote", ""), height=100, key=f"{prefix}_quote")
    item["researcher_note"] = st.text_area("Researcher note", value=item.get("researcher_note", ""), height=80, key=f"{prefix}_note")
    _render_proposal_confidence_editor(item, prefix)
    _render_review_buttons(record, "tactic_proposals", item, prefix, "tactic")


def _render_single_practice_editor(record: dict) -> None:
    item = dict(record["item"])
    prefix = f"practice_{record['doc_id']}_{record['index']}"
    c1, c2 = st.columns([1, 1])
    with c1:
        item["practice_id"] = st.text_input("Practice id", value=item.get("practice_id", ""), key=f"{prefix}_id")
        item["harm_stance"] = st.selectbox(
            "Harm stance",
            ["denied", "minimized", "reframed", "acknowledged", "not_mentioned"],
            index=_option_index(["denied", "minimized", "reframed", "acknowledged", "not_mentioned"], item.get("harm_stance", "not_mentioned")),
            key=f"{prefix}_harm",
        )
    with c2:
        item["sanity_id"] = st.text_input("Sanity id", value=item.get("sanity_id", "") or "", disabled=True, key=f"{prefix}_sanity")
        item["pushed_to_sanity"] = st.checkbox("Pushed to Sanity", value=item.get("pushed_to_sanity", False), disabled=True, key=f"{prefix}_pushed")

    item["exact_description"] = st.text_area("Exact description", value=item.get("exact_description", ""), height=120, key=f"{prefix}_description")
    item["harm_quote"] = st.text_area("Harm quote", value=item.get("harm_quote", ""), height=100, key=f"{prefix}_quote")
    item["researcher_note"] = st.text_area("Researcher note", value=item.get("researcher_note", ""), height=80, key=f"{prefix}_note")
    _render_proposal_confidence_editor(item, prefix)
    _render_review_buttons(record, "practice_descriptions", item, prefix, "practice")


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
            _update_enrichment_proposal(record["path"], key, record["index"], item)
            st.success(f"Approved {label} locally. Push approved records to Sanity when ready.")
    with b3:
        if st.button(f"Reject {label.title()}", key=f"{prefix}_reject"):
            item["approved"] = False
            item["rejected"] = True
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
            records.append({
                "path": enrich_path,
                "doc_id": enrich_path.parent.name,
                "index": index,
                "item": item,
            })
    return records


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

    rows = _testimony_review_rows(config.corpus_dir)
    if not rows:
        st.info("No testimony-flagged documents or testimony excerpts found locally.")
        return

    st.info(
        "Testimony defaults to consentStatus=unclear and publicDisplay=false. "
        "Upload is blocked for testimony-flagged workbench documents until a review exists."
    )
    st.dataframe(rows, width="stretch", hide_index=True)

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
            # Only sync recognised 5-value consent states; skip "withdrawn" (revoked) — that
            # should remain as-is in intake.json; the gate will block upload regardless.
            if consent in ("confirmed", "pending", "unclear", "refused", "withdrawn"):
                update_intake_consent(selected, consent, config)
        except Exception:
            pass  # intake.json may not exist for older ingest records; not fatal

        if consent == "confirmed":
            st.success(
                f"Saved testimony_review.json and updated intake.json → consent: **{consent}**. "
                "Upload gate will now pass for this document."
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
                "Upload will remain blocked until consent is confirmed."
            )


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
        if not analysis.get("testimony_flag") and not testimony_assets:
            continue
        review = _load_json_if_exists(doc_dir / "testimony_review.json") or {}
        rows.append({
            "doc_id": doc_dir.name,
            "type": analysis.get("type", "?"),
            "testimony_flag": analysis.get("testimony_flag", False),
            "testimony_excerpts": len(testimony_assets),
            "consent_status": review.get("consent_status", "unreviewed"),
            "public_display": review.get("public_display", False),
            "reviewed": review.get("reviewed", False),
        })
    return rows


def _testimony_review_path(config, doc_id: str) -> Path:
    return config.corpus_dir / doc_id / "testimony_review.json"


def _testimony_requires_review(doc_id: str, analysis, config) -> bool:
    """Return True when the document requires consent review before upload.

    Mirrors upload.requires_consent_gate: gates on testimony_flag and on
    document type, so typed Testimony / Survivor-Network-Material documents
    cannot bypass the gate by omitting testimony_flag.
    """
    from runner.pipeline.upload import requires_consent_gate

    if not analysis:
        return False
    if not requires_consent_gate(analysis):
        return False
    path = _testimony_review_path(config, doc_id)
    data = _load_json_if_exists(path)
    return not bool(data and data.get("reviewed"))


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
    tabs = st.tabs(["Audit", "Intake", "Wayback", "HTML Snapshot", "Analysis", "Enrichment", "Sanity Record", "Supabase"])
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
        _show_json_file(doc_dir / "enrichment.json")
    with tabs[6]:
        _show_json_file(doc_dir / "sanity_record.json")
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

def page_guide():
    st.title("Guide")

    st.markdown(
        """
### What this app does

The app is the ingestion cockpit. A document moves through five stages:

1. **Intake** creates a document ID, detects source type, creates the local folder, and captures archive metadata when possible.
2. **Extract** turns a URL, PDF, transcript, or file into readable text for review. URL ingests also keep a local `source.html` snapshot.
3. **Analyze** sends the extracted text to the selected model and returns structured JSON.
4. **Review** is where you edit and validate the JSON before it becomes part of the archive.
5. **Upload / Enrich** writes reviewed documents to Sanity/Supabase and optionally proposes registry/document-asset updates.
6. **Resolve proposals** approves or rejects enrichment findings. This queue is non-blocking, but approved terms, entities, tactics, practices, and claims should be pushed to Sanity when ready so future runs use the updated living lexicon and registries.

### Which page to use

- **Ingest Workbench**: run a new document through the pipeline.
- **Document List**: browse local analyses and enrichment counts.
- **Pending Upload**: find documents saved locally but not sent to Sanity.
- **Lexicon**: inspect current terms, registry entities, approve/reject local proposals, preview seed lexicon imports, and push approved proposal records to Sanity.
- **Tag Registry**: inspect/edit local tags used as enrichment connection hints.
- **Testimony Review**: handle testimony flags, consent status, public-display decisions, and researcher notes.
- **Activity Log**: see what happened for each document, including Wayback metadata and local HTML snapshots.
- **Model Routing**: decide which model to use.
- **Triage Tool**: quick routing only; it is not a substitute for ingestion.

### Model choice

- Use `litelm` for normal web pages and most articles.
- Use `litelm-heavy` for long PDFs, books, transcripts, or reports.
- Use `litelm-reasoning` when relevance is ambiguous.
- Use `claude` for legal/court/high-stakes final classification.
- Use `local` only when the Mac Studio or APIs are unavailable.

### Troubleshooting

- If extraction is under 500 characters, the source may be blocked or mostly boilerplate. Paste text manually or download the source as a file.
- If analysis fails, check the service status on Dashboard and confirm the required API key for the selected model is in `runner/.env`.
- If upload fails, check Sanity/Supabase credentials and use Activity Log to verify the local `analysis.json` was saved.
- If JSON validation fails, fix the specific field named in the error. Most failures are invalid controlled-vocabulary values or malformed arrays.
- If the enrichment queue is growing, open Lexicon → Local Proposals. Approve/reject proposals and push approved records when you are ready.
- If the starting lexicon needs to be loaded, open Lexicon → Seed Import Preview. Review the draft/validated recommendation, edit definitions if needed, select rows, and push them to Sanity.
- If translations/regional terms need to be attached, open Lexicon → Variant Import Preview. Canonical terms must exist in Sanity before variants can attach.
- If older tagger vocabulary needs review, open Lexicon → Legacy Vocabulary Preview. It imports pending April 2026 glossary entries as draft and skips rows already present in the current seed lexicon.
- If broader tags need review, open Tag Registry. These tags are matched against document text during enrichment to suggest possible actors, networks, practices, tactics, harms, and evidence links.
- If testimony upload is blocked, open Testimony Review and record consent status. Public display is allowed only with confirmed consent.
"""
    )


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
        run_enrich = st.checkbox("Run enrichment")
    with c3:
        auto_yes = st.checkbox("Auto-approve checkpoints")

    parts = ["python -m runner ingest"]
    parts.append(f'"{source}"' if source else '"<url-or-file>"')
    parts.extend(["--llm", llm])
    if batch.strip():
        parts.extend(["--batch", batch.strip()])
    if run_triage:
        parts.append("--triage")
    if run_enrich:
        parts.append("--enrich")
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
            "core-qwen (qwen3.6:35b-a3b)",
            "core-gemma (gemma4:31b)",
            "review-qwen (qwen3.6:27b)",
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
        "Stage 3c always uses **lexicon-llm** on Mac Studio (`qwen3.6:35b-a3b`).  \n"
        "Run with: `python -m runner ingest <url> --enrich`  \n"
        "Or on an existing doc: `python -m runner enrich <doc_id>`"
    )

    st.subheader("Triage model (Stage 0.5)")
    st.info(
        "Fast pre-screen to recommend which model to use.  \n"
        "Uses **triage** LiteLLM alias (`gemma4:e4b` on Mac Studio).  \n"
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
            "The **triage model** (`gemma4:e4b` on Mac Studio, or local qwen3.5:9b) "
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
                result = triage_run(text, config)
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

def page_mac_studio_node():
    import httpx
    from datetime import datetime

    st.title("Mac Studio Node")
    st.caption(f"Last refresh: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} — refresh the browser to update")

    config = _load_config_safe()
    litelm_url  = (config.litelm_base_url.rstrip("/") if config and config.litelm_base_url else "")
    litelm_key  = (config.litelm_api_key if config else "")

    # Derive Mac Studio Ollama URL from env or fallback: swap LiteLLM port for 11434
    import os
    mac_ollama_url = os.getenv("MAC_STUDIO_OLLAMA_URL", "")
    if not mac_ollama_url and litelm_url:
        from urllib.parse import urlparse, urlunparse
        parsed = urlparse(litelm_url)
        mac_ollama_url = urlunparse(parsed._replace(netloc=parsed.hostname + ":11434"))
    mac_dashboard_url = os.getenv("MAC_STUDIO_DASHBOARD_URL", "")

    # ── Services ─────────────────────────────────────────────────────────────
    st.header("AI Services")
    s1, s2, s3 = st.columns(3)

    # LiteLLM
    litellm_models = []
    if litelm_url:
        try:
            r = httpx.get(
                f"{litelm_url}/v1/models",
                headers={"Authorization": f"Bearer {litelm_key}"},
                timeout=5,
            )
            if r.status_code == 200:
                s1.success(f"LiteLLM online ({litelm_url})")
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
    if mac_ollama_url:
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
        s2.warning("MAC_STUDIO_OLLAMA_URL not set (add to .env)")

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
            "LITELM_BASE_URL=http://<tailscale-ip>:4000\n"
            "LITELM_API_KEY=sk-local-research-key-change-this\n\n"
            "# Add these for full Mac Studio visibility:\n"
            "MAC_STUDIO_OLLAMA_URL=http://<tailscale-ip>:11434\n"
            "MAC_STUDIO_DASHBOARD_URL=https://mqvlfwcwmc.tail379051.ts.net:8502\n"
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
        cfg = config
        checks.append(("SANITY_PROJECT_ID", bool(cfg and cfg.sanity_project_id)))
        checks.append(("SANITY_WRITE_TOKEN", bool(cfg and cfg.sanity_write_token)))
        checks.append(("SUPABASE_URL", bool(cfg and cfg.supabase_url)))
        checks.append(("SUPABASE_SERVICE_KEY", bool(cfg and cfg.supabase_service_key)))
        checks.append(("LITELM_BASE_URL", bool(cfg and cfg.litelm_base_url)))
        # Service reachability
        import httpx as _httpx
        if cfg and cfg.litelm_base_url:
            try:
                r = _httpx.get(f"{cfg.litelm_base_url.rstrip('/')}/health", timeout=4)
                checks.append(("LiteLLM reachable", r.status_code < 400))
            except Exception:
                checks.append(("LiteLLM reachable", False))
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
        ("Embedding", "embedding.json", "Required for Supabase semantic search."),
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
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    main()
