"""
SurvivingSOGICE — Streamlit researcher UI.

Run with:
  cd runner && streamlit run app.py

Pages:
  Ingest           — submit URL or file path, stream pipeline output
  Document List    — browse corpus, view extracted text, spot stuck runs
  Enrichment Review — approve / reject lexicon and entity proposals
  Pending Upload   — docs saved locally but not yet pushed to Sanity
  Model Routing    — spec sheet: which model for which document type
  Triage Tool      — paste a snippet and get a model recommendation
"""
from __future__ import annotations
import json
import os
import subprocess
import sys
from pathlib import Path

# Ensure the project root (parent of runner/) is on sys.path so that
# `runner.*` package imports work regardless of launch directory.
_project_root = Path(__file__).resolve().parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

import streamlit as st

# ---------------------------------------------------------------------------
# Config bootstrap
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
        ["Ingest", "Document List", "Enrichment Review",
         "Pending Upload", "Model Routing", "Triage Tool"],
        label_visibility="collapsed",
    )

    st.sidebar.divider()
    st.sidebar.caption(
        "CLI commands:\n"
        "```\npython -m runner ingest <url>\n"
        "python -m runner enrich <doc_id>\n"
        "python -m runner verify\n```"
    )

    if page == "Ingest":
        page_ingest()
    elif page == "Document List":
        page_document_list()
    elif page == "Enrichment Review":
        page_enrichment_review()
    elif page == "Pending Upload":
        page_pending_upload()
    elif page == "Model Routing":
        page_model_routing()
    elif page == "Triage Tool":
        page_triage_tool()


# ---------------------------------------------------------------------------
# Ingest
# ---------------------------------------------------------------------------

def page_ingest():
    st.title("Ingest Document")
    st.markdown(
        "Run the full pipeline from the UI. "
        "Checkpoints are auto-approved (`--yes`). "
        "Use the CLI for the interactive checkpoint experience."
    )

    col1, col2 = st.columns([2, 1])
    with col1:
        source = st.text_input(
            "URL or file path",
            placeholder="https://example.org/document  or  /path/to/file.pdf",
        )
        source_url_override = st.text_input(
            "Provenance URL (for local files — where this file was obtained)",
            placeholder="https://...  leave blank when source is already a URL",
        )
    with col2:
        llm = st.selectbox(
            "Analysis model",
            ["litelm", "litelm-heavy", "litelm-reasoning",
             "claude", "local", "local-heavy", "local-reasoning", "openrouter"],
        )
        batch = st.text_input("Batch ID (optional)", placeholder="batch-01")
        run_triage = st.checkbox("Run triage first (--triage)")
        run_enrich = st.checkbox("Run enrichment after upload (--enrich)")

    if st.button("Start ingest", type="primary", disabled=not source.strip()):
        cmd = [
            sys.executable, "-m", "runner", "ingest",
            source.strip(), "--llm", llm, "--yes",
        ]
        if batch.strip():
            cmd += ["--batch", batch.strip()]
        if run_triage:
            cmd.append("--triage")
        if run_enrich:
            cmd.append("--enrich")
        if source_url_override.strip():
            cmd += ["--source-url", source_url_override.strip()]

        with st.spinner("Pipeline running…"):
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=str(_project_root),
            )

        if result.returncode == 0:
            st.success("Pipeline completed.")
        else:
            st.error(f"Pipeline exited with code {result.returncode}.")

        if result.stdout:
            st.code(result.stdout, language="text")
        if result.stderr:
            with st.expander("stderr / warnings"):
                st.code(result.stderr, language="text")


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
        st.info("No documents found. Use Ingest to add one.")
    else:
        col1, col2, col3 = st.columns(3)
        with col1:
            all_types = sorted({d.get("type", "Unknown") for d in docs})
            filter_type = st.multiselect("Document type", all_types)
        with col2:
            all_batches = sorted({d.get("batch_id", "—") for d in docs})
            filter_batch = st.multiselect("Batch", all_batches)
        with col3:
            filter_uploaded = st.selectbox("Upload status", ["All", "Uploaded", "Local only"])

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
        for doc in filtered:
            _render_doc_card(doc, corpus_dir)

    # Stuck / partial runs at the bottom
    _render_stuck_runs(corpus_dir)


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

        intake_path = doc_dir / "intake.json"
        intake: dict = {}
        if intake_path.exists():
            try:
                intake = json.loads(intake_path.read_text())
            except Exception:
                pass

        preprocess_path = doc_dir / "preprocess.json"
        preprocess: dict = {}
        if preprocess_path.exists():
            try:
                preprocess = json.loads(preprocess_path.read_text())
            except Exception:
                pass

        docs.append({
            "doc_id":           doc_dir.name,
            "type":             data.get("type", "Unknown"),
            "format":           data.get("format", ""),
            "scope":            data.get("scope", ""),
            "confidence":       data.get("confidence", {}).get("overall_score", 0),
            "conf_status":      data.get("confidence", {}).get("status", ""),
            "summary":          data.get("summary", ""),
            "country":          data.get("country", []),
            "tactic":           data.get("tactic", []),
            "candidate_terms":  len(data.get("candidate_terms", [])),
            "suggested_actors": len(data.get("suggested_actors", [])),
            "batch_id":         intake.get("batch_id", "—"),
            "source":           intake.get("source", ""),
            "title":            preprocess.get("title", "") or intake.get("source", ""),
            "uploaded":         (doc_dir / "sanity_record.json").exists(),
            "has_enrichment":   (doc_dir / "enrichment.json").exists(),
            "testimony_flag":   data.get("testimony_flag", False),
        })
    return docs


def _render_doc_card(doc: dict, corpus_dir: Path):
    conf = doc["confidence"]
    conf_color = "🟢" if conf >= 0.85 else "🟡" if conf >= 0.70 else "🔴"
    upload_badge = "☁️ Sanity" if doc["uploaded"] else "💾 Local"
    enrich_badge = " ✨ Enriched" if doc["has_enrichment"] else ""
    testimony_badge = " ⚠️ Testimony" if doc["testimony_flag"] else ""

    display_title = doc["title"][:80] if doc["title"] else doc["doc_id"]
    header = (
        f"{conf_color} **{doc['doc_id']}** — {display_title}  \n"
        f"{doc['type']} | {doc['format']} | {upload_badge}{enrich_badge}{testimony_badge}"
    )

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
            st.write(
                f"**Candidate terms:** {doc['candidate_terms']}  |  "
                f"**Actors:** {doc['suggested_actors']}"
            )

        # Enrichment summary
        enrich_path = corpus_dir / doc["doc_id"] / "enrichment.json"
        if enrich_path.exists():
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

        # Extracted text viewer
        ext_md  = corpus_dir / doc["doc_id"] / "extracted.md"
        ext_txt = corpus_dir / doc["doc_id"] / "extracted.txt"
        if ext_md.exists() or ext_txt.exists():
            if st.toggle("Show extracted text", key=f"ext_{doc['doc_id']}"):
                path = ext_md if ext_md.exists() else ext_txt
                raw = path.read_text(encoding="utf-8", errors="replace")
                char_count = len(raw)
                preview = raw[:6000]
                if ext_md.exists():
                    st.markdown(preview)
                else:
                    st.text(preview)
                if char_count > 6000:
                    st.caption(f"Showing first 6 000 of {char_count:,} chars. Full text in {path.name}")

        # Raw JSON toggle
        if st.toggle("Show raw analysis JSON", key=f"raw_{doc['doc_id']}"):
            analysis_path = corpus_dir / doc["doc_id"] / "analysis.json"
            if analysis_path.exists():
                st.json(json.loads(analysis_path.read_text()))


def _render_stuck_runs(corpus_dir: Path):
    """Find directories where intake started but the pipeline did not finish."""
    if not corpus_dir.exists():
        return
    stuck = []
    for doc_dir in sorted(corpus_dir.iterdir()):
        if not doc_dir.is_dir():
            continue
        if not (doc_dir / "intake.json").exists():
            continue
        if (doc_dir / "analysis.json").exists():
            continue
        stuck.append(doc_dir)
    if not stuck:
        return

    with st.expander(f"⚠️ {len(stuck)} incomplete run(s) — intake started but pipeline did not finish"):
        for doc_dir in stuck:
            intake_data: dict = {}
            try:
                intake_data = json.loads((doc_dir / "intake.json").read_text())
            except Exception:
                pass
            source = intake_data.get("source", "?")[:80]
            col1, col2 = st.columns([3, 1])
            col1.write(f"**{doc_dir.name}** — {source}")
            col2.code(
                f"python -m runner ingest {intake_data.get('source', doc_dir.name)!r}",
                language="bash",
            )


# ---------------------------------------------------------------------------
# Enrichment Review
# ---------------------------------------------------------------------------

def page_enrichment_review():
    st.title("Enrichment Review")
    st.markdown(
        "Approve or reject lexicon and entity proposals generated by Stage 3c enrichment. "
        "Decisions are written back to `enrichment.json` immediately on click."
    )

    config = _load_config_safe()
    if not config:
        st.error("Could not load config — is runner/.env configured?")
        return

    corpus_dir = config.corpus_dir
    if not corpus_dir.exists():
        st.info("Corpus directory is empty.")
        return

    enriched_docs = []
    for doc_dir in sorted(corpus_dir.iterdir()):
        if not doc_dir.is_dir():
            continue
        enrich_path = doc_dir / "enrichment.json"
        if not enrich_path.exists():
            continue
        try:
            er = json.loads(enrich_path.read_text())
            lexicon  = er.get("lexicon_proposals", [])
            entities = er.get("entity_proposals", [])
            pending_lex = sum(1 for p in lexicon  if not p.get("approved") and not p.get("rejected"))
            pending_ent = sum(1 for p in entities if not p.get("approved") and not p.get("rejected"))
            enriched_docs.append({
                "doc_id":      doc_dir.name,
                "enrich_path": enrich_path,
                "er":          er,
                "lexicon":     lexicon,
                "entities":    entities,
                "pending_lex": pending_lex,
                "pending_ent": pending_ent,
            })
        except Exception:
            continue

    if not enriched_docs:
        st.info(
            "No enrichment files found.  \n"
            "Run `python -m runner enrich <doc_id>` or ingest with `--enrich`."
        )
        return

    show_all = st.checkbox("Show fully reviewed documents too")
    visible = enriched_docs if show_all else [
        d for d in enriched_docs if d["pending_lex"] + d["pending_ent"] > 0
    ]

    if not visible:
        st.success("All enrichment proposals have been reviewed.")
        return

    # Summary row
    total_pending = sum(d["pending_lex"] + d["pending_ent"] for d in visible)
    st.caption(
        f"{len(visible)} document(s) with enrichment  ·  "
        f"{total_pending} proposal(s) awaiting decision"
    )

    for doc in visible:
        pending_total = doc["pending_lex"] + doc["pending_ent"]
        badge = f"🔵 {pending_total} pending" if pending_total > 0 else "✅ reviewed"
        label = (
            f"**{doc['doc_id']}** — {badge}  |  "
            f"{len(doc['lexicon'])} lexicon · {len(doc['entities'])} entity"
        )
        with st.expander(label, expanded=(pending_total > 0)):
            _render_enrichment_proposals(doc)


def _render_enrichment_proposals(doc: dict):
    er          = doc["er"]
    enrich_path = doc["enrich_path"]

    def _save():
        enrich_path.write_text(
            json.dumps(er, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        st.rerun()

    # ── Lexicon proposals ────────────────────────────────────────────────────
    if doc["lexicon"]:
        st.subheader("Lexicon proposals")
        for i, prop in enumerate(er.get("lexicon_proposals", [])):
            approved = prop.get("approved", False)
            rejected = prop.get("rejected", False)
            status   = "✅" if approved else ("❌" if rejected else "🔵")

            c1, c2, c3 = st.columns([5, 1, 1])
            c1.markdown(
                f"{status} **{prop.get('term', '?')}**  \n"
                f"_{prop.get('action', '?')}_ · `{prop.get('proposed_cluster', '?')}` · "
                f"`{prop.get('function', '?')}` · _{prop.get('register', '?')}_"
            )
            if c2.button("Approve", key=f"lex_app_{doc['doc_id']}_{i}",
                         disabled=approved, use_container_width=True):
                er["lexicon_proposals"][i]["approved"] = True
                er["lexicon_proposals"][i]["rejected"] = False
                _save()
            if c3.button("Reject", key=f"lex_rej_{doc['doc_id']}_{i}",
                         disabled=rejected, use_container_width=True):
                er["lexicon_proposals"][i]["approved"] = False
                er["lexicon_proposals"][i]["rejected"] = True
                _save()

            if prop.get("exact_quote"):
                with st.expander("Quote", expanded=False):
                    st.caption(prop["exact_quote"][:600])
            if prop.get("definition_as_used"):
                st.caption(f"Definition as used: {prop['definition_as_used'][:200]}")

    # ── Entity proposals ─────────────────────────────────────────────────────
    if doc["entities"]:
        st.subheader("Entity proposals")
        for i, prop in enumerate(er.get("entity_proposals", [])):
            approved = prop.get("approved", False)
            rejected = prop.get("rejected", False)
            status   = "✅" if approved else ("❌" if rejected else "🔵")

            c1, c2, c3 = st.columns([5, 1, 1])
            c1.markdown(
                f"{status} **{prop.get('name', '?')}**  \n"
                f"_{prop.get('entity_type', '?')}_ · {prop.get('action', '?')}"
            )
            if c2.button("Approve", key=f"ent_app_{doc['doc_id']}_{i}",
                         disabled=approved, use_container_width=True):
                er["entity_proposals"][i]["approved"] = True
                er["entity_proposals"][i]["rejected"] = False
                _save()
            if c3.button("Reject", key=f"ent_rej_{doc['doc_id']}_{i}",
                         disabled=rejected, use_container_width=True):
                er["entity_proposals"][i]["approved"] = False
                er["entity_proposals"][i]["rejected"] = True
                _save()

            if prop.get("evidence_quote"):
                with st.expander("Evidence", expanded=False):
                    st.caption(prop["evidence_quote"][:400])

    # ── Ingestion queue ───────────────────────────────────────────────────────
    queue = er.get("ingestion_queue", [])
    if queue:
        st.subheader("Ingestion queue")
        for item in queue:
            priority_icon = {"high": "🔴", "medium": "🟡", "low": "⚪"}.get(
                item.get("priority", "medium"), "🟡"
            )
            st.markdown(
                f"{priority_icon} [{item.get('title') or item.get('url', '?')}]"
                f"({item.get('url', '')})"
                f"  —  _{item.get('source_type', '?')}_"
            )

    # ── Researcher notes ──────────────────────────────────────────────────────
    st.divider()
    current_notes = er.get("researcher_notes", "")
    new_notes = st.text_area(
        "Researcher notes",
        value=current_notes,
        key=f"notes_{doc['doc_id']}",
        height=80,
    )
    if st.button("Save notes", key=f"save_notes_{doc['doc_id']}"):
        er["researcher_notes"] = new_notes
        _save()


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
        intake_data: dict = {}
        if (doc_dir / "intake.json").exists():
            try:
                intake_data = json.loads((doc_dir / "intake.json").read_text())
            except Exception:
                pass
        pending.append({
            "doc_id": doc_dir.name,
            "type":   data.get("type", "?"),
            "source": intake_data.get("source", ""),
        })

    if not pending:
        st.success("No documents waiting to be uploaded.")
        return

    st.warning(f"{len(pending)} document(s) saved locally but not yet uploaded to Sanity.")
    for p in pending:
        col1, col2 = st.columns([3, 1])
        col1.write(f"**{p['doc_id']}** — {p['type']}  \n{p['source'][:80]}")
        col2.code(f"python -m runner upload {p['doc_id']}", language="bash")


# ---------------------------------------------------------------------------
# Model Routing Spec Sheet
# ---------------------------------------------------------------------------

def page_model_routing():
    st.title("Model Routing Guide")
    st.markdown("Use this reference to choose the right `--llm` flag for each document type.")

    st.subheader("Analysis models")
    import pandas as pd

    data = {
        "Flag": [
            "`--llm litelm`", "`--llm litelm-heavy`", "`--llm litelm-reasoning`",
            "`--llm claude`", "`--llm local`", "`--llm local-heavy`",
            "`--llm local-reasoning`", "`--llm openrouter`",
        ],
        "Actual model": [
            "core-qwen (qwen3.6:35b-a3b)", "core-gemma (gemma4:31b-it)",
            "review-qwen (qwen3.6:27b)", "claude-sonnet-4-6",
            "qwen3.5:9b", "gemma-4-26B-A4B-it",
            "Ministral-3-14B-Reasoning-2512", "llama-3.3-70b-instruct:free",
        ],
        "Runs on": [
            "Mac Studio (Tailscale)", "Mac Studio (Tailscale)", "Mac Studio (Tailscale)",
            "Anthropic API", "MacBook (Ollama)", "MacBook (Ollama, check RAM)",
            "MacBook (Ollama)", "OpenRouter API",
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
            "200k chars", "200k chars", "200k chars", "24k chars (cost)",
            "32k tokens", "32k tokens", "32k tokens", "varies",
        ],
    }
    st.dataframe(pd.DataFrame(data), use_container_width=True, hide_index=True)

    st.subheader("Enrichment model (Stage 3c)")
    st.info(
        "Stage 3c uses **lexicon-llm** on Mac Studio (`qwen3.6:35b-a3b`) by default.  \n"
        "Alt model: **core-gemma** (`gemma4:31b`).  \n"
        "```\npython -m runner ingest <url> --enrich\n"
        "python -m runner enrich <doc_id> --second-opinion\n```"
    )

    st.subheader("Triage model (Stage 0.5)")
    st.info(
        "Fast pre-screen using **triage** alias (`gemma4:e4b-it` on Mac Studio).  \n"
        "`python -m runner ingest <url> --triage`"
    )

    st.subheader("Embedding models")
    emb_data = {
        "Context": ["Local (Ollama)", "Mac Studio (LiteLLM)"],
        "Model": ["qwen3-embedding:8b", "research-embedding → qwen3-embedding:8b"],
        "Dimension": ["4096d", "4096d"],
        "Triggered by": ["--llm local / claude / openrouter", "--llm litelm*"],
    }
    st.dataframe(pd.DataFrame(emb_data), use_container_width=True, hide_index=True)

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
                    import httpx
                    resp = httpx.get(input_url, timeout=15, follow_redirects=True)
                    text = resp.text[:3000]
                    st.caption(f"Fetched {len(text)} chars from {input_url}")
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
        st.code(
            f"python -m runner ingest <url_or_file> --llm {result.recommended_llm}",
            language="bash",
        )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    main()
