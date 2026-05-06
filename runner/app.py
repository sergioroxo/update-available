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
    "/Users/sergiogalvaoroxo/Library/CloudStorage/OneDrive-UniversityofBergen/"
    "SurvivingSOGICE/SurvivingSOGICE_Tagger/Old_Artifact_Bakcup"
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

    page = st.sidebar.radio(
        "Navigate",
        [
            "Dashboard",
            "Ingest Workbench",
            "Document List",
            "Pending Upload",
            "Lexicon",
            "Tag Registry",
            "Testimony Review",
            "Activity Log",
            "Guide",
            "Model Routing",
            "Triage Tool",
            "Mac Studio Node",
            "Seed Data",
        ],
        label_visibility="collapsed",
    )

    st.sidebar.divider()
    st.sidebar.caption(
        "CLI commands:\n"
        "```\npython -m runner ingest <url>\n"
        "python -m runner verify\n"
        "python -m runner enrich <doc_id>\n```"
    )

    if page == "Dashboard":
        page_dashboard()
    elif page == "Ingest Workbench":
        page_ingest_workbench()
    elif page == "Document List":
        page_document_list()
    elif page == "Pending Upload":
        page_pending_upload()
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

    stats = _corpus_stats(config.corpus_dir)
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Local documents", stats["total"])
    c2.metric("Uploaded", stats["uploaded"])
    c3.metric("Pending upload", stats["pending"])
    c4.metric("Enriched", stats["enriched"])

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

    if stats["pending"]:
        st.warning(f"{stats['pending']} document(s) are saved locally but not uploaded yet. Go to Pending Upload.")

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
    with c2:
        tier = st.selectbox("Tier", ["auto", "1", "2", "3"], index=0)
        _render_tier_help()
    with c3:
        batch = st.text_input("Batch", value=st.session_state.ingest["batch"], placeholder="unassigned")
        st.session_state.ingest["batch"] = batch

    c4, c5 = st.columns([1, 1])
    with c4:
        max_chars = st.number_input("Max chars (0 = no truncation)", min_value=0, value=0, step=1000)
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
        st.caption("Enrichment creates proposals. It does not change the live lexicon until you approve them.")

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
            f"approved entities not pushed: {gate['approved_unpushed_entities']}"
        )
        st.caption("Open Lexicon → Local Proposals to approve/reject proposals and push approved records.")
    _render_stage_progress()

    btn_col1, btn_col2 = st.columns([1, 3])
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
        st.caption(
            "Runs all stages automatically and stops at the JSON review step."
            + (" Enrichment checkbox is ON — will also run enrichment after upload." if run_enrich else "")
        )

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


def _blank_ingest_state() -> dict:
    return {
        "source": "",
        "source_url": "",
        "llm": "litelm",
        "batch": "",
        "run_enrich": False,
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
    st.success(f"Created doc_id {result.doc_id}")


def _effective_max_chars(max_chars: int, llm: str, config) -> int | None:
    if max_chars == 0:
        return None
    if max_chars:
        return max_chars
    if llm in ("local", "local-heavy", "local-reasoning", "prefer-local", "litelm", "litelm-heavy", "litelm-reasoning"):
        return config.truncation_limit_local
    return config.truncation_limit


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
    from runner.pipeline import analyze, embed

    preprocess_result = st.session_state.ingest["preprocess"]
    with st.spinner("Generating embedding and running analysis..."):
        try:
            if llm.startswith("litelm"):
                embedding_vector = embed.run_litelm(preprocess_result.text, config=config)
            else:
                embedding_vector = embed.run(preprocess_result.text, config=config)
            result = analyze.run(preprocess_result, llm=llm, config=config)
        except Exception as exc:
            err_msg = str(exc)
            st.error(f"Analysis failed: {err_msg}")
            with st.expander("Copy error details"):
                st.code(err_msg)
            return
    st.session_state.ingest.update({
        "embedding": embedding_vector,
        "analysis": result,
        "analysis_json": result.model_dump_json(indent=2),
        "analysis_valid": True,
        "enrichment": None,
        "uploaded": False,
    })
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

    c1, c2, c3, c4 = st.columns(4)
    testimony_blocked = _testimony_requires_review(
        st.session_state.ingest["intake"].doc_id,
        st.session_state.ingest.get("analysis"),
        config,
    )
    if testimony_blocked:
        st.warning(
            "This document is flagged for testimony. Upload is blocked until Testimony Review records consent status."
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
                st.success("Uploaded to Sanity and Supabase.")
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
        st.dataframe([t.model_dump() for t in _tuc], use_container_width=True)
    if analysis.candidate_terms:
        st.write("**Candidate terms:**")
        st.dataframe([t.model_dump() for t in analysis.candidate_terms], use_container_width=True)
    if analysis.suggested_actors:
        st.write("**Suggested actors:**")
        st.dataframe([a.model_dump() for a in analysis.suggested_actors], use_container_width=True)


def _render_enrichment_result(result) -> None:
    st.subheader("Enrichment")
    st.caption(
        "These are review proposals saved locally. They become live Sanity lexicon/entity changes only after an approval workflow writes them."
    )
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Lexicon proposals", len(result.lexicon_proposals))
    c2.metric("Entity proposals", len(result.entity_proposals))
    c3.metric("Ingestion queue", len(result.ingestion_queue))
    c4.metric("Connections", len(result.corpus_connections))
    if result.lexicon_proposals:
        st.write("**Lexicon proposals:**")
        st.dataframe([p.model_dump(by_alias=True) for p in result.lexicon_proposals], width="stretch")
    if result.entity_proposals:
        st.write("**Entity proposals:**")
        st.dataframe([p.model_dump() for p in result.entity_proposals], width="stretch")
    if result.ingestion_queue:
        st.write("**Documents to ingest next:**")
        st.dataframe([p.model_dump() for p in result.ingestion_queue], width="stretch")
    if result.practice_descriptions:
        st.write("**Practice descriptions:**")
        st.dataframe([p.model_dump() for p in result.practice_descriptions], width="stretch")
    if result.statistical_claims:
        st.write("**Statistical claims:**")
        st.dataframe([p.model_dump() for p in result.statistical_claims], width="stretch")


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
    col1, col2, col3 = st.columns(3)
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

    filtered = docs
    if filter_type:
        filtered = [d for d in filtered if d.get("type") in filter_type]
    if filter_batch:
        filtered = [d for d in filtered if d.get("batch_id") in filter_batch]
    if filter_uploaded == "Uploaded":
        filtered = [d for d in filtered if d.get("uploaded")]
    elif filter_uploaded == "Local only":
        filtered = [d for d in filtered if not d.get("uploaded")]

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

    for doc in filtered:
        _render_doc_card(doc, corpus_dir)


def _load_local_docs(corpus_dir: Path) -> list[dict]:
    docs = []
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
            "batch_id":    intake.get("batch_id", "—"),
            "source":      intake.get("source", ""),
            "uploaded":    uploaded,
            "has_enrichment": has_enrichment,
        })

    return docs


def _render_doc_card(doc: dict, corpus_dir: Path):
    conf = doc["confidence"]
    conf_color = "🟢" if conf >= 0.85 else "🟡" if conf >= 0.70 else "🔴"
    upload_badge = "☁️ Sanity" if doc["uploaded"] else "💾 Local"
    enrich_badge = " ✨ Enriched" if doc["has_enrichment"] else ""

    header = f"{conf_color} **{doc['doc_id']}** — {doc['type']} | {doc['format']} | {upload_badge}{enrich_badge}"

    with st.expander(header, expanded=False):
        col1, col2 = st.columns([2, 1])
        with col1:
            if doc["summary"]:
                st.markdown(doc["summary"])
            if doc["source"]:
                st.caption(f"Source: {doc['source']}")
        with col2:
            st.metric("Confidence", f"{conf:.2f} ({doc['conf_status']})")
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

        # Show enrichment summary if available
        enrich_path = corpus_dir / doc["doc_id"] / "enrichment.json"
        if enrich_path.exists():
            with st.container():
                try:
                    er = json.loads(enrich_path.read_text())
                    st.divider()
                    ec1, ec2, ec3, ec4 = st.columns(4)
                    ec1.metric("Lexicon proposals", len(er.get("lexicon_proposals", [])))
                    ec2.metric("Entity proposals",  len(er.get("entity_proposals", [])))
                    ec3.metric("Ingestion queue",   len(er.get("ingestion_queue", [])))
                    ec4.metric("Corpus connections", len(er.get("corpus_connections", [])))
                except Exception:
                    pass

        # Raw JSON toggle
        if st.toggle("Show raw analysis JSON", key=f"raw_{doc['doc_id']}"):
            analysis_path = corpus_dir / doc["doc_id"] / "analysis.json"
            if analysis_path.exists():
                st.json(json.loads(analysis_path.read_text()))

        # ── Actions ───────────────────────────────────────────────────────
        st.divider()
        act_cols = st.columns([1, 2, 1])

        with act_cols[0]:
            if not doc["uploaded"]:
                if st.button("⬆ Upload to Sanity", key=f"upload_{doc['doc_id']}", type="primary"):
                    with st.spinner("Uploading…"):
                        r = __import__("subprocess").run(
                            ["python3", "-m", "runner", "upload-doc", doc["doc_id"]],
                            capture_output=True, text=True, cwd=_project_root,
                        )
                    if r.returncode == 0:
                        st.success("Uploaded.")
                    else:
                        st.error(r.stderr[-600:] or r.stdout[-600:])
                    st.rerun()
            else:
                st.caption("☁️ Uploaded to Sanity")

        with act_cols[1]:
            llm_opts = ["litelm", "litelm-heavy", "litelm-reasoning", "claude", "local"]
            ra_llm = st.selectbox("Model", llm_opts, key=f"ra_llm_{doc['doc_id']}", label_visibility="collapsed")
            if st.button("🔄 Reanalyze", key=f"reanalyze_{doc['doc_id']}"):
                with st.spinner(f"Re-running analysis with {ra_llm}…"):
                    r = __import__("subprocess").run(
                        ["python3", "-m", "runner", "reanalyze", doc["doc_id"],
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
                        ["python3", "-m", "runner", "enrich", doc["doc_id"], "--yes"],
                        capture_output=True, text=True, cwd=_project_root,
                    )
                if r.returncode == 0:
                    st.success("Enrichment saved.")
                else:
                    st.error(r.stderr[-600:] or r.stdout[-600:])
                st.rerun()


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
                    ["python3", "-m", "runner", "upload-doc", p["doc_id"]],
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
                    ["python3", "-m", "runner", "upload-doc", p["doc_id"]],
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


def page_lexicon():
    st.title("Lexicon")

    config = _load_config_safe()
    if not config:
        st.error("Could not load config. Check runner/.env.")
        return

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
        if st.button("Refresh Lexicon"):
            st.session_state.pop("lexicon_terms", None)
        if "lexicon_terms" not in st.session_state:
            try:
                from runner.clients.sanity import fetch_lexicon_terms
                st.session_state.lexicon_terms = fetch_lexicon_terms(config)
            except Exception as exc:
                st.error(f"Could not fetch lexicon from Sanity: {exc}")
                st.session_state.lexicon_terms = []
        terms = st.session_state.lexicon_terms
        st.caption(f"{len(terms)} draft/validated terms")
        if terms:
            st.dataframe(terms, width="stretch", hide_index=True)

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


def _render_local_proposal_queue(config) -> None:
    lexicon_records = _local_enrichment_proposal_records(config.corpus_dir, "lexicon_proposals")
    entity_records = _local_enrichment_proposal_records(config.corpus_dir, "entity_proposals")
    queue_tabs = st.tabs(["Lexicon Queue", "Entity Queue", "Ingestion Queue", "Gate Status"])

    with queue_tabs[0]:
        _render_lexicon_queue(config, lexicon_records)
    with queue_tabs[1]:
        _render_entity_queue(config, entity_records)
    with queue_tabs[2]:
        _render_ingestion_queue(config)
    with queue_tabs[3]:
        st.json(_proposal_gate_status(config.corpus_dir))


def _render_lexicon_queue(config, records: list[dict]) -> None:
    st.caption(f"{len(records)} local lexicon proposal(s)")
    if not records:
        st.info("No local lexicon proposals found yet.")
        return
    st.dataframe([
        {
            "doc_id": record["doc_id"],
            "index": record["index"],
            "term": record["item"].get("term", ""),
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
            except Exception as exc:
                errors.append(f"{record['doc_id']} / {item.get('term', '?')}: {exc}")
        st.session_state.pop("lexicon_terms", None)
        if pushed:
            st.success(f"Pushed {pushed} approved draft term(s) to Sanity.")
        if errors:
            st.error("\n".join(errors))

    st.subheader("Review Proposals")
    for record in records:
        item = record["item"]
        label = f"{record['doc_id']} · {item.get('term', '(missing term)')}"
        with st.expander(label):
            _render_single_proposal_editor(record)


def _render_entity_queue(config, records: list[dict]) -> None:
    st.caption(f"{len(records)} local entity proposal(s)")
    if not records:
        st.info("No local entity proposals found yet.")
        return
    st.dataframe([
        {
            "doc_id": record["doc_id"],
            "index": record["index"],
            "name": record["item"].get("name", ""),
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
            except Exception as exc:
                errors.append(f"{record['doc_id']} / {item.get('name', '?')}: {exc}")
        st.session_state.pop("entity_registry", None)
        if pushed:
            st.success(f"Pushed {pushed} approved entit(ies) to Sanity.")
        if errors:
            st.error("\n".join(errors))

    st.subheader("Review Entities")
    for record in records:
        item = record["item"]
        label = f"{record['doc_id']} · {item.get('name', '(missing name)')}"
        with st.expander(label):
            _render_single_entity_editor(record)


def _render_single_proposal_editor(record: dict) -> None:
    item = dict(record["item"])
    prefix = f"proposal_{record['doc_id']}_{record['index']}"
    c1, c2 = st.columns([1, 1])
    with c1:
        item["term"] = st.text_input("Term", value=item.get("term", ""), key=f"{prefix}_term")
        item["language"] = st.text_input("Language", value=item.get("language", "en"), key=f"{prefix}_language")
        item["action"] = st.selectbox(
            "Action",
            ["add_new", "add_variant", "add_evidence", "add_definition", "merge_into"],
            index=_option_index(["add_new", "add_variant", "add_evidence", "add_definition", "merge_into"], item.get("action", "add_new")),
            key=f"{prefix}_action",
        )
        item["proposed_cluster"] = st.text_input("Cluster", value=item.get("proposed_cluster", ""), key=f"{prefix}_cluster")
        item["function"] = st.text_input("Function", value=item.get("function", ""), key=f"{prefix}_function")
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

    item["exact_quote"] = st.text_area("Origin quote", value=item.get("exact_quote", ""), height=100, key=f"{prefix}_quote")
    item["researcher_note"] = st.text_area("Researcher note", value=item.get("researcher_note", ""), height=80, key=f"{prefix}_note")
    st.caption(f"Origin: {record['path']} · proposal index {record['index']}")

    b1, b2, b3 = st.columns(3)
    with b1:
        if st.button("Save Edits", key=f"{prefix}_save"):
            _update_enrichment_proposal(record["path"], "lexicon_proposals", record["index"], item)
            st.success("Saved proposal edits.")
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

    pending = [r for r in rows if not r["in_corpus"]]
    already = [r for r in rows if r["in_corpus"]]

    st.caption(f"{len(pending)} pending · {len(already)} already in corpus · {len(rows)} total")

    if pending:
        st.markdown("**Pending — not yet ingested**")
        for r in pending:
            priority_colour = "🔴" if r["priority"] == "high" else "🟡" if r["priority"] == "medium" else "⚪"
            with st.expander(f"{priority_colour} [{r['type']}] {r['title'] or r['url'][:80]}"):
                st.code(f"python3 -m runner ingest '{r['url']}' --llm litelm", language="bash")
                st.caption(f"Source doc: `{r['doc_id']}`")
                st.markdown(f"[Open URL]({r['url']})")

    if already:
        with st.expander(f"{len(already)} already in corpus"):
            for r in already:
                st.caption(f"`{r['doc_id']}` — {r['url'][:80]}")


def _proposal_gate_status(corpus_dir: Path) -> dict:
    lexicon = _local_enrichment_proposal_records(corpus_dir, "lexicon_proposals")
    entities = _local_enrichment_proposal_records(corpus_dir, "entity_proposals")

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
    }
    status["blocked"] = any(status.values())
    return status


def _option_index(options: list[str], value: str) -> int:
    try:
        return options.index(value)
    except ValueError:
        return 0


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

    consent = st.selectbox(
        "Consent status",
        ["unclear", "confirmed", "withdrawn"],
        index=_option_index(["unclear", "confirmed", "withdrawn"], existing.get("consent_status", "unclear")),
    )
    public_display = st.checkbox("Allow public display", value=bool(existing.get("public_display", False)))
    public_excerpt = st.text_area("Public excerpt (optional, max 200 words)", value=existing.get("public_excerpt", ""), height=120)
    notes = st.text_area("Researcher notes", value=existing.get("notes", ""), height=120)

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
        st.success("Saved testimony review.")


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
    if not analysis:
        return False
    if not getattr(analysis, "testimony_flag", False):
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

    docs = _activity_rows(config.corpus_dir)
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
                            st.warning("No row found in Supabase — use upload-doc to push the embedding.")
                    except Exception as exc:
                        st.error(f"Supabase query failed: {exc}")
        else:
            st.warning("No local embedding.json — embedding has not been generated yet.")
            if config and st.button("Generate + push embedding now", key=f"gen_emb_{selected}"):
                from runner.pipeline import embed as _embed
                from runner.clients import supabase as _sb
                with st.spinner("Generating embedding…"):
                    try:
                        extracted = (doc_dir / "extracted.txt").read_text(encoding="utf-8")
                        try:
                            vec = _embed.run_litelm(extracted, config)
                        except Exception:
                            vec = _embed.run(extracted, config)
                        _embed.save(selected, vec, config)
                        analysis_data = json.loads((doc_dir / "analysis.json").read_text()) if (doc_dir / "analysis.json").exists() else {}
                        from runner.models.document import AnalysisResult as _AR
                        ar = _AR.model_validate(analysis_data)
                        intake_data = json.loads((doc_dir / "intake.json").read_text()) if (doc_dir / "intake.json").exists() else {}
                        _sb.upsert_embedding(selected, vec, ar, config,
                                             tier=str(intake_data.get("tier", "")),
                                             language=intake_data.get("language", ""),
                                             embedding_model=config.embedding_model)
                        st.success(f"Embedding generated ({len(vec)}d) and pushed to Supabase.")
                    except Exception as exc:
                        st.error(f"Failed: {exc}")


def _activity_rows(corpus_dir: Path) -> list[dict]:
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
            "embedded": (doc_dir / "embedding.json").exists(),
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
5. **Upload / Enrich** writes approved records to Sanity/Supabase and optionally proposes lexicon/entity updates.
6. **Resolve proposals** approves or rejects enrichment findings. This queue is non-blocking, but approved terms/entities should be pushed to Sanity when ready so future runs use the updated living lexicon and registry.

### Which page to use

- **Ingest Workbench**: run a new document through the pipeline.
- **Document List**: browse local analyses and enrichment counts.
- **Pending Upload**: find documents saved locally but not sent to Sanity.
- **Lexicon**: inspect current terms, registry entities, approve/reject local proposals, preview seed lexicon imports, and push approved drafts/entities to Sanity.
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
- If the enrichment queue is growing, open Lexicon → Local Proposals. Approve/reject proposals and push approved term/entity records when you are ready.
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
            "core-gemma (gemma4:31b-it)",
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
        "Uses **triage** LiteLLM alias (`gemma4:e4b-it` on Mac Studio).  \n"
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

    with col2:
        st.markdown("### What happens")
        st.markdown(
            "The **triage model** (`gemma4:e4b-it` on Mac Studio, or local qwen3.5:9b) "
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
            st.dataframe({"model": litellm_models}, use_container_width=True)
        else:
            st.info("No models returned (LiteLLM offline or no aliases configured)")
    with m2:
        st.subheader("Ollama installed")
        if ollama_models:
            st.dataframe({"model": ollama_models}, use_container_width=True)
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
                    use_container_width=True,
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
                    use_container_width=True,
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
                    use_container_width=True,
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
                    use_container_width=True,
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
                    use_container_width=True,
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
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    main()
