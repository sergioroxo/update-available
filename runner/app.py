"""
SurvivingSOGICE — Streamlit researcher UI.

Run with:
  cd runner && streamlit run app.py

Pages:
  Document List    — browse locally saved documents with Sanity status
  Pending Upload   — docs saved locally but not yet pushed to Sanity
  Model Routing    — spec sheet: which model for which document type
  Triage Tool      — paste a snippet and get a model recommendation
"""
from __future__ import annotations
import json
import os
import sys
from pathlib import Path

# Ensure the project root (parent of runner/) is on sys.path so that
# `runner.*` package imports work regardless of launch directory.
_project_root = Path(__file__).resolve().parent.parent
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
        ["Document List", "Pending Upload", "Model Routing", "Triage Tool"],
        label_visibility="collapsed",
    )

    st.sidebar.divider()
    st.sidebar.caption(
        "CLI commands:\n"
        "```\npython -m runner ingest <url>\n"
        "python -m runner verify\n"
        "python -m runner enrich <doc_id>\n```"
    )

    if page == "Document List":
        page_document_list()
    elif page == "Pending Upload":
        page_pending_upload()
    elif page == "Model Routing":
        page_model_routing()
    elif page == "Triage Tool":
        page_triage_tool()


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

        uploaded = (doc_dir / ".uploaded").exists()
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
        if (doc_dir / ".uploaded").exists():
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

    for p in pending:
        col1, col2 = st.columns([3, 1])
        col1.write(f"**{p['doc_id']}** — {p['type']}")
        col2.code(f"python -m runner upload {p['doc_id']}")


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
    st.dataframe(pd.DataFrame(data), use_container_width=True, hide_index=True)

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
