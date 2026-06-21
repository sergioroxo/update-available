"""
SurvivingSOGICE ingestion runner.

Usage:
  python -m runner ingest <url-or-file>
  python -m runner ingest document.pdf --tier 2 --batch batch-07
  python -m runner ingest recording.mp4 --llm local
  python -m runner ingest document.pdf --llm both
  python -m runner ingest <url-or-file> --no-enrich   # skip Stage 3c for quick tests
  python -m runner status
  python -m runner upload-doc <doc_id>
  python -m runner export batch-07
  python -m runner embed-test
"""
from typing import List, Optional
from pathlib import Path
import typer
from rich.console import Console
from rich.panel import Panel

from .config import load_config
from .pipeline import embed  # imported directly so embed-test works without full config
from .pipeline import intake, preprocess, analyze, enrich, review, triage, upload, ollama_memory, research_annotate, related_search, media_review, screenshots, second_opinion, archive_summary, knowledge_graph, system_health
from .pipeline import search as search_mod
from .pipeline.system_tools import tool_path

app = typer.Typer(name="runner", add_completion=False)
console = Console()


@app.command()
def ingest(
    source: str = typer.Argument(..., help="URL, PDF path, video file, SRT, or EPUB"),
    llm: str = typer.Option("litelm", help="LLM: litelm | litelm-heavy | litelm-reasoning | claude | local | local-heavy | local-reasoning | openrouter | both | prefer-local | prefer-claude"),
    tier: Optional[int] = typer.Option(None, help="Override auto-assigned tier (1|2|3)"),
    batch: Optional[str] = typer.Option(None, help="Assign to existing batch ID"),
    source_url: Optional[str] = typer.Option(None, "--source-url", help="Original/provenance URL for a local file"),
    max_chars: Optional[int] = typer.Option(None, "--max-chars", help="Truncation limit in characters (overrides .env). Use 0 for no truncation."),
    yes: bool = typer.Option(False, "--yes", "-y", help="Auto-approve all checkpoints (no interactive prompts)"),
    run_triage: bool = typer.Option(False, "--triage", help="Run fast pre-screen triage to recommend which model to use"),
    run_enrich: bool = typer.Option(True, "--enrich/--no-enrich", help="Run Stage 3c enrichment after upload (default on; use --no-enrich to skip for quick tests or resource-constrained runs)"),
    enrich_model: Optional[str] = typer.Option(None, "--enrich-model", help="LiteLLM model alias for enrichment, e.g. lexicon-llm or core-gemma"),
    second_opinion: bool = typer.Option(False, "--second-opinion", help="Also run alternate enrichment model and save a comparison file"),
    collect_comments: bool = typer.Option(False, "--collect-comments", help="For video platforms, collect a bounded lower-trust comment evidence artifact"),
    max_comments: int = typer.Option(50, "--max-comments", help="Maximum comments to retain when --collect-comments is enabled"),
    skip_whisper: bool = typer.Option(False, "--skip-whisper", help="For video/audio, stop if platform captions are unavailable instead of running Whisper"),
):
    """Full ingestion pipeline: intake → preprocess → embed → classify → review → upload → enrich.

    Enrichment (Stage 3c) runs by default after a confirmed upload.
    Use --no-enrich to skip it for quick tests or resource-constrained runs.
    """
    config = load_config(llm=llm)
    if collect_comments:
        config.media_collect_comments = True
        config.media_max_comments = max_comments
    if skip_whisper:
        config.media_allow_whisper = False

    # Stage 0.5 — Triage (optional): fast pre-screen to recommend analysis model
    triage_result = None
    _triage_audit: dict | None = None
    if run_triage and not yes:
        snippet = ""
        note = ""
        try:
            snippet, note = triage.extract_snippet(source)
            console.print(f"[dim]{note}[/dim]")
        except Exception as exc:
            console.print(f"[yellow]Triage snippet extraction failed: {exc}[/yellow]")
        if snippet:
            _triage_audit = {}
            triage_result = triage.run(
                snippet,
                config,
                source_label=triage.source_context_label(
                    source, extraction_note=note, snippet=snippet,
                ),
                _audit=_triage_audit,
            )
            llm = review.checkpoint_triage(triage_result, llm)

    # Deduplication check — offer update-in-place or new document
    _force_doc_id: str | None = None
    if not yes:
        existing = intake.find_existing_by_source(source, config)
        if existing:
            # Show most recent match
            ex = existing[-1]
            status_label = "(uploaded to Sanity)" if ex.get("uploaded") else "(local only)"
            console.print(Panel(
                f"[yellow]Already ingested as [bold]{ex['doc_id']}[/bold] {status_label}[/yellow]\n"
                f"Batch: {ex.get('batch_id', '?')}  |  "
                f"Archive: {ex.get('archive_url') or 'none'}",
                title=f"Duplicate source detected ({len(existing)} existing)",
            ))
            console.print(
                "  [bold]u[/bold] = update existing record (re-run analysis, overwrite Sanity + Supabase)\n"
                "  [bold]n[/bold] = create new document with a fresh doc_id\n"
                "  [bold]a[/bold] = abort"
            )
            choice = typer.prompt("Choice", default="u").strip().lower()
            if choice == "a":
                raise typer.Exit()
            elif choice == "u":
                _force_doc_id = ex["doc_id"]
                console.print(f"[dim]Re-using doc_id {_force_doc_id}[/dim]")
            # "n" falls through to generate a new doc_id as normal

    # Stage 1 — Intake
    if source_url is None and not source.startswith(("http://", "https://")) and not yes:
        source_url = typer.prompt(
            "Where was this local file obtained? Paste URL or leave blank",
            default="",
            show_default=False,
        ).strip()
    intake_result = intake.run(
        source,
        tier=tier,
        batch=batch,
        config=config,
        force_doc_id=_force_doc_id,
        source_url=source_url or "",
    )
    if not yes and not review.checkpoint_intake(intake_result):
        raise typer.Exit()
    # Persist triage only AFTER the intake checkpoint is accepted, so rejecting
    # intake never leaves a corpus folder containing only triage_result.json.
    # If --yes skipped live triage, load any prior result for the cross-stage
    # testimony/legal safety checks below. Persistence remains non-fatal.
    if triage_result is not None:
        try:
            triage.save_triage_result(
                intake_result.doc_id, triage_result, config, _audit=_triage_audit
            )
        except Exception as exc:
            console.print(f"[yellow]Could not persist triage result: {exc}[/yellow]")
    else:
        triage_result = triage.load_triage_result(intake_result.doc_id, config)

    # Stage 2 — Preprocessing
    # max_chars=0 means no truncation; None means pick from config by LLM mode
    if max_chars is not None:
        effective_max = max_chars
    elif intake_result.source_type == "url":
        effective_max = None
    elif llm in ("local", "local-heavy", "local-reasoning", "prefer-local",
                 "litelm", "litelm-heavy", "litelm-reasoning"):
        effective_max = config.truncation_limit_local
    else:
        effective_max = config.truncation_limit
    preprocess_result = preprocess.run(intake_result, config=config, max_chars=effective_max)
    preprocess_result.intake_declared_type = intake_result.declared_type or None
    preprocess_result.intake_batch_id = intake_result.batch_id or None
    preprocess_result.intake_source_url = intake_result.source_url or None
    if not yes and not review.checkpoint_preprocess(preprocess_result):
        raise typer.Exit()

    # Stage 3 — Analysis + embedding
    # For litelm*, run analysis first, unload the large analysis model, then
    # generate embeddings. This avoids keeping the embedding and LLM models in
    # Mac Studio RAM at the same time.
    _analysis_audit: dict = {}
    if llm.startswith("litelm"):
        analysis_result = analyze.run(preprocess_result, llm=llm, config=config, _audit=_analysis_audit)
        try:
            if ollama_memory.unload_litelm_analysis(config, llm):
                console.print("[dim]Unloaded LiteLLM analysis model before embedding.[/dim]")
            else:
                console.print("[yellow]Could not unload LiteLLM analysis model; set LITELM_OLLAMA_BASE_URL and backing model names.[/yellow]")
        except Exception as exc:
            console.print(f"[yellow]Could not unload LiteLLM analysis model: {exc}[/yellow]")
        embedding_vector = embed.run_litelm(preprocess_result.text, config=config)
        try:
            if ollama_memory.unload_litelm_embedding(config):
                console.print("[dim]Unloaded LiteLLM embedding model after embedding.[/dim]")
            else:
                console.print("[yellow]Could not unload LiteLLM embedding model; set LITELM_OLLAMA_BASE_URL and LITELM_OLLAMA_EMBEDDING_MODEL.[/yellow]")
        except Exception as exc:
            console.print(f"[yellow]Could not unload LiteLLM embedding model: {exc}[/yellow]")
    else:
        embedding_vector = embed.run(preprocess_result.text, config=config)
        analysis_result = analyze.run(preprocess_result, llm=llm, config=config, _audit=_analysis_audit)

    # Stage 4 — Analysis review (Checkpoint 3)
    final_analysis = review.checkpoint_analysis(
        analysis_result, doc_id=intake_result.doc_id, yes=yes
    )
    if final_analysis is None:
        raise typer.Exit()

    # Stage 5 — Testimony consent gate + upload confirmation (Checkpoint 4)
    consent_status = review.checkpoint_testimony_consent(
        intake_result.doc_id, final_analysis, config,
        triage_result=triage_result, yes=yes,
    )
    if consent_status == "refused":
        raise typer.Exit()
    if consent_status in {"confirmed", "pending"}:
        intake_result.testimony_consent = consent_status
    hold_reason: str | None = None
    if consent_status == "pending":
        saved_path = upload.save_locally(
            intake_result, preprocess_result, embedding_vector, final_analysis,
            config=config, llm_used=llm,
            embedding_model=config.litelm_embedding_model if llm.startswith("litelm") else config.embedding_model,
            _audit=_analysis_audit,
        )
        console.print(Panel(
            f"Saved locally at [bold]{saved_path}[/bold]\n\n"
            "Testimony consent is pending. Upload is blocked until consent is confirmed.",
            title="Saved locally — consent pending",
        ))
        confirmed = False
    else:
        legal_hold = upload.requires_legal_review(final_analysis, triage_result)
        if legal_hold and yes:
            confirmed = False
            hold_reason = "legal"
        elif legal_hold:
            console.print(Panel(
                "This document appears to require legal-accuracy review before publication.\n\n"
                "Reason: legal-sensitive document type or triage flagged legal review.\n"
                "This is a review hold, not a testimony consent gate.",
                title="Legal review recommended",
            ))
            confirmed = review.checkpoint_upload(intake_result.doc_id, final_analysis)
            if not confirmed:
                hold_reason = "legal"
        else:
            confirmed = yes or review.checkpoint_upload(intake_result.doc_id, final_analysis)
    if confirmed:
        upload.run(
            intake_result, preprocess_result, embedding_vector, final_analysis,
            config=config, llm_used=llm,
            _audit=_analysis_audit,
        )
    elif consent_status != "pending":
        saved_path = upload.save_locally(
            intake_result, preprocess_result, embedding_vector, final_analysis,
            config=config, llm_used=llm,
            embedding_model=config.litelm_embedding_model if llm.startswith("litelm") else config.embedding_model,
            _audit=_analysis_audit,
        )
        console.print(Panel(
            f"Saved locally at [bold]{saved_path}[/bold]\n\n"
            + (
                "Held for legal review. Review legal accuracy, then upload manually with: "
                f"[bold]python -m runner upload-doc {intake_result.doc_id}[/bold]"
                if hold_reason == "legal"
                else f"Upload later with: [bold]python -m runner upload-doc {intake_result.doc_id}[/bold]"
            ),
            title="Saved locally — legal review hold" if hold_reason == "legal" else "Saved locally",
        ))

    # Stage 3c — Enrichment (default on, skipped with --no-enrich or when upload was not confirmed)
    if run_enrich and confirmed:
        console.print("\n[dim]Running Stage 3c enrichment pass...[/dim]")
        enrich_llm = "litelm" if llm.startswith("litelm") else llm
        resolved_enrich_model = enrich_model or config.litelm_enrichment_model
        try:
            _enrich_audit: dict = {}
            enrichment_result = enrich.run(
                intake_result.doc_id, preprocess_result, final_analysis,
                config=config, llm=enrich_llm, model=enrich_model,
                _audit=_enrich_audit,
            )
            if yes or review.checkpoint_enrichment(enrichment_result, intake_result.doc_id):
                saved = enrich.save(intake_result.doc_id, enrichment_result, config, _audit=_enrich_audit)
                console.print(f"[green]Enrichment saved → {saved}[/green]")
            if second_opinion and enrich_llm.startswith("litelm"):
                alt_model = config.litelm_enrichment_model_alt
                alt = enrich.run(
                    intake_result.doc_id, preprocess_result, final_analysis,
                    config=config, llm=enrich_llm, model=alt_model,
                )
                alt_saved = enrich.save_alt(intake_result.doc_id, alt, config, label=alt_model.replace("/", "-"))
                console.print(f"[green]Second-opinion enrichment saved → {alt_saved}[/green]")
        except Exception as exc:
            console.print(Panel(f"[red]Enrichment failed: {exc}[/red]", title="Stage 3c error"))
        finally:
            if enrich_llm.startswith("litelm"):
                try:
                    if ollama_memory.unload_litelm_enrichment(config, resolved_enrich_model):
                        console.print("[dim]Unloaded LiteLLM enrichment model after Stage 3c.[/dim]")
                    else:
                        console.print("[yellow]Could not unload LiteLLM enrichment model; set LITELM_OLLAMA_BASE_URL and backing model names.[/yellow]")
                except Exception as exc:
                    console.print(f"[yellow]Could not unload LiteLLM enrichment model: {exc}[/yellow]")

    return intake_result.doc_id


@app.command(name="reanalyze")
def reanalyze_doc(
    doc_id: str = typer.Argument(..., help="doc_id of an already-ingested document"),
    llm: str = typer.Option("litelm", help="LLM to use: litelm | litelm-heavy | claude | local"),
    upload_after: bool = typer.Option(False, "--upload", help="Upload to Sanity + Supabase after saving"),
    yes: bool = typer.Option(False, "--yes", "-y", help="Auto-accept result without review"),
    force_reviewed: bool = typer.Option(
        False,
        "--force-reviewed",
        "--force",
        help="Allow replacing a reviewed/corrected Sanity document when used with --upload",
    ),
):
    """Re-run Stage 3b analysis on an already-ingested document.

    Useful when the original classification was wrong, you want to try a
    different model, or the ingestion prompt has been updated.
    Previous analysis.json is archived as analysis_{timestamp}.json before overwrite.
    """
    import json as _json
    import shutil
    from datetime import datetime
    config = load_config(llm=llm)
    doc_dir = config.corpus_dir / doc_id

    preprocess_path = doc_dir / "preprocess.json"
    extracted_path  = doc_dir / "extracted.txt"
    analysis_path   = doc_dir / "analysis.json"

    if not doc_dir.exists():
        console.print(f"[red]No local folder found for {doc_id}[/red]")
        raise typer.Exit(1)
    if not extracted_path.exists():
        console.print(f"[red]extracted.txt not found for {doc_id} — cannot re-analyse without document text[/red]")
        raise typer.Exit(1)

    from .models.document import PreprocessResult
    if preprocess_path.exists():
        preprocess = upload._load_preprocess(preprocess_path)
    else:
        preprocess = PreprocessResult(
            doc_id=doc_id, tool_used="unknown", quality="low",
            text=extracted_path.read_text(encoding="utf-8"),
        )

    # Archive the previous analysis before overwriting
    if analysis_path.exists():
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        archive = doc_dir / f"analysis_{ts}.json"
        shutil.copy2(analysis_path, archive)
        console.print(f"[dim]Previous analysis archived → {archive.name}[/dim]")

    analyze.enrich_preprocess_from_intake(preprocess, doc_dir / "intake.json")
    console.print(f"[dim]Re-analysing {doc_id} with {llm}...[/dim]")
    _reanalyze_audit: dict = {}
    try:
        new_analysis = analyze.run(preprocess, llm=llm, config=config, _audit=_reanalyze_audit)
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Analysis failed"))
        raise typer.Exit(1)

    final = review.checkpoint_analysis(new_analysis, doc_id=doc_id, yes=yes)
    if final is None:
        console.print("[yellow]Aborted — previous analysis archive kept.[/yellow]")
        raise typer.Exit()

    import json as _json
    analysis_path.write_text(
        _json.dumps(upload._stamp_analysis_dict(final), indent=2), encoding="utf-8"
    )
    from .pipeline.audit import write_analysis_audit as _write_analysis_audit
    _write_analysis_audit(
        doc_dir, _reanalyze_audit, final,
        doc_id=doc_id,
        prompt_version=analyze.PROMPT_VERSION,
        ontology_version=upload._ONTOLOGY_VERSION,
    )
    console.print(f"[green]analysis.json updated for {doc_id} (prompt_version stamped)[/green]")

    if upload_after:
        upload.upload_saved(
            doc_id,
            config,
            force_sanity_overwrite=force_reviewed,
        )


@app.command(name="second-opinion")
def second_opinion_cmd(
    doc_id: str = typer.Argument(..., help="doc_id of an already-ingested document"),
    llm: str = typer.Option("litelm-reasoning", "--llm", help="Second-opinion LLM route"),
):
    """Run a safe second-opinion analysis without replacing analysis.json."""
    config = load_config(llm=llm, require_services=False)
    try:
        payload = second_opinion.run_second_opinion(doc_id, config=config, llm=llm)
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Second opinion failed"))
        raise typer.Exit(1)

    comparison = payload["comparison"]
    console.print(Panel(
        f"Alt analysis: [bold]{payload['alt_path'].name}[/bold]\n"
        f"Comparison: [bold]{payload['comparison_path'].name}[/bold]\n"
        f"Fields differed: {', '.join(comparison.get('fields_that_differed', [])) or 'none'}\n\n"
        "No canonical analysis was changed.",
        title="[green]Second opinion saved[/green]",
    ))


@app.command(name="decide-second-opinion")
def decide_second_opinion_cmd(
    doc_id: str = typer.Argument(..., help="doc_id of an already-ingested document"),
    comparison_file: str = typer.Argument(..., help="analysis_comparison_*.json or analysis_alt_*.json filename"),
    outcome: str = typer.Option("kept_original", "--outcome", help="kept_original | adopted_alt"),
    note: str = typer.Option("", "--note", help="Researcher decision note"),
):
    """Record a second-opinion decision and optionally promote the alt result."""
    if outcome == "edited":
        console.print("[red]Use the Streamlit editor for edited second-opinion decisions.[/red]")
        raise typer.Exit(1)
    config = load_config(require_services=False)
    try:
        comparison = second_opinion.decide_second_opinion(
            doc_id=doc_id,
            comparison_file=comparison_file,
            outcome=outcome,
            config=config,
            researcher_note=note,
        )
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Second opinion decision failed"))
        raise typer.Exit(1)
    console.print(Panel(
        f"Outcome: [bold]{comparison['outcome']}[/bold]\n"
        f"Decided at: {comparison.get('decided_at', '')}\n"
        f"Fields differed: {', '.join(comparison.get('fields_that_differed', [])) or 'none'}",
        title="[green]Second opinion decision saved[/green]",
    ))


@app.command(name="adopt-second-opinion")
def adopt_second_opinion_cmd(
    doc_id: str = typer.Argument(..., help="doc_id of an already-ingested document"),
    comparison_or_alt_file: str = typer.Argument(..., help="analysis_comparison_*.json or analysis_alt_*.json filename"),
    note: str = typer.Option("", "--note", help="Researcher decision note"),
):
    """Promote a second-opinion alt analysis to canonical analysis.json."""
    config = load_config(require_services=False)
    try:
        comparison = second_opinion.decide_second_opinion(
            doc_id=doc_id,
            comparison_file=comparison_or_alt_file,
            outcome="adopted_alt",
            config=config,
            researcher_note=note,
        )
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Adopt second opinion failed"))
        raise typer.Exit(1)
    console.print(Panel(
        f"Promoted: [bold]{comparison.get('promoted_file', comparison.get('alt_file', ''))}[/bold]\n"
        f"Previous analysis.json was archived first.",
        title="[green]Second opinion adopted[/green]",
    ))


@app.command(name="enrich")
def enrich_doc(
    doc_id: str = typer.Argument(..., help="doc_id of an already-ingested document"),
    llm: str = typer.Option("litelm", help="LLM for enrichment: litelm | claude | local"),
    model: Optional[str] = typer.Option(None, "--model", help="LiteLLM model alias for enrichment"),
    second_opinion: bool = typer.Option(False, "--second-opinion", help="Save alternate model result separately"),
    yes: bool = typer.Option(False, "--yes", "-y", help="Auto-save without review"),
):
    """Run Stage 3c enrichment on a previously ingested document."""
    import json as _json
    config = load_config(llm=llm)
    doc_dir = config.corpus_dir / doc_id

    # Load saved analysis + preprocess results
    analysis_path = doc_dir / "analysis.json"
    preprocess_path = doc_dir / "preprocess.json"
    if not analysis_path.exists():
        console.print(f"[red]No analysis.json found for {doc_id}[/red]")
        raise typer.Exit(1)

    from .models.document import AnalysisResult, PreprocessResult
    analysis = AnalysisResult.model_validate(_json.loads(analysis_path.read_text()))

    if preprocess_path.exists():
        preprocess = upload._load_preprocess(preprocess_path)
    else:
        extracted_path = doc_dir / "extracted.txt"
        text = extracted_path.read_text(encoding="utf-8") if extracted_path.exists() else ""
        if not text:
            console.print("[yellow]preprocess.json not found — enrichment will have no document text[/yellow]")
        preprocess = PreprocessResult(
            doc_id=doc_id, tool_used="unknown", quality="low", text=text
        )

    console.print(f"[dim]Running enrichment on {doc_id} with {llm}...[/dim]")
    _enrich_audit: dict = {}
    resolved_enrich_model = model or config.litelm_enrichment_model
    try:
        enrichment_result = enrich.run(doc_id, preprocess, analysis, config=config, llm=llm, model=model, _audit=_enrich_audit)
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Enrichment failed"))
        raise typer.Exit(1)

    if yes or review.checkpoint_enrichment(enrichment_result, doc_id):
        saved = enrich.save(doc_id, enrichment_result, config, _audit=_enrich_audit)
        console.print(f"[green]Enrichment saved → {saved}[/green]")
        if second_opinion and llm.startswith("litelm"):
            alt_model = config.litelm_enrichment_model_alt
            alt = enrich.run(doc_id, preprocess, analysis, config=config, llm=llm, model=alt_model)
            alt_saved = enrich.save_alt(doc_id, alt, config, label=alt_model.replace("/", "-"))
            console.print(f"[green]Second-opinion enrichment saved → {alt_saved}[/green]")
    else:
        console.print("[yellow]Enrichment skipped.[/yellow]")

    if llm.startswith("litelm"):
        try:
            if ollama_memory.unload_litelm_enrichment(config, resolved_enrich_model):
                console.print("[dim]Unloaded LiteLLM enrichment model after Stage 3c.[/dim]")
            else:
                console.print("[yellow]Could not unload LiteLLM enrichment model; set LITELM_OLLAMA_BASE_URL and backing model names.[/yellow]")
        except Exception as exc:
            console.print(f"[yellow]Could not unload LiteLLM enrichment model: {exc}[/yellow]")


def _extract_markdown_for_split(source: str) -> tuple[str, str]:
    """Extract markdown text from a source for book splitting.

    Returns ``(markdown_text, tool_used)``.  Does not create corpus
    directories, does not write to Sanity or Supabase, and does not call
    any analysis or enrichment stage.

    Routing:
      .md / .txt  → read directly (no conversion)
      PDF / EPUB / DOCX → Docling via preprocess._preprocess_pdf
      http(s) URL → Trafilatura via preprocess._preprocess_url
    """
    path = Path(source)

    # Plain markdown / plain text: read directly, no conversion
    if path.suffix.lower() in {".md", ".txt"} and path.exists():
        return path.read_text(encoding="utf-8"), "direct"

    # PDF / EPUB / DOCX: use Docling (Unstructured fallback in preprocess)
    if path.suffix.lower() in {".pdf", ".epub", ".docx", ".doc", ".odt"} and path.exists():
        result = preprocess._preprocess_pdf(path)
        return result.markdown or result.text, result.tool_used

    # URL: Trafilatura extraction
    if source.startswith(("http://", "https://")):
        result = preprocess._preprocess_url(source)
        return result.markdown or result.text, result.tool_used

    raise ValueError(
        f"Cannot extract text from {source!r}.\n"
        "Expected a local .pdf/.epub/.docx/.md/.txt file or an http(s) URL."
    )


@app.command(name="split-book")
def split_book(
    source: str = typer.Argument(..., help="Local PDF/EPUB/DOCX/.md file or URL"),
    min_chars: int = typer.Option(
        3000, "--min-chars",
        help="Minimum characters per section; shorter sections are merged forward",
    ),
    max_level: int = typer.Option(
        2, "--max-level",
        help="Maximum heading depth to split on (1 = H1 only, 2 = H1 + H2)",
    ),
    preview_chars: int = typer.Option(
        200, "--preview-chars",
        help="Characters of section body to show in the preview",
    ),
    out: Optional[str] = typer.Option(
        None, "--out",
        help="Write preview JSON to this path (e.g. preview.json)",
    ),
):
    """Preview proposed book/report sections without ingesting.

    Extracts text from a local file or URL using existing preprocessing,
    splits at heading boundaries using the book splitter, and prints a
    table of proposed sections (index, heading level, title, char count,
    short text preview).

    This is --preview only: no corpus writes, no analysis, no enrichment,
    no Sanity or Supabase writes. Use --out to save the preview as JSON.

    Typical next step after reviewing the preview:
      python -m runner ingest <section-file> --llm litelm
    """
    from .pipeline.book_splitter import estimate_section_count, split_by_headings
    from rich.table import Table as RichTable

    console.print(f"[dim]Extracting text from {source!r}…[/dim]")
    try:
        markdown, tool_used = _extract_markdown_for_split(source)
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Extraction failed"))
        raise typer.Exit(1)

    if not markdown.strip():
        console.print(Panel(
            "[yellow]No text extracted — the document may be empty or unsupported.[/yellow]",
            title="Nothing to split",
        ))
        raise typer.Exit(0)

    total_chars = len(markdown)
    estimated = estimate_section_count(markdown, max_level=max_level)
    sections = split_by_headings(markdown, min_chars=min_chars, max_level=max_level)

    console.print(Panel(
        f"Source:              [bold]{source}[/bold]\n"
        f"Tool:                {tool_used}\n"
        f"Total characters:    {total_chars:,}\n"
        f"Estimated sections (before merge):                  {estimated}\n"
        f"Actual sections (after merge at ≥{min_chars:,} chars):  {len(sections)}",
        title="Book/Report Split Preview",
    ))

    if not sections:
        console.print("[yellow]No sections produced.[/yellow]")
    else:
        table = RichTable(
            show_header=True,
            header_style="bold",
            box=None,
            padding=(0, 1),
        )
        table.add_column("#", style="dim", width=4, justify="right")
        table.add_column("Lvl", width=4, justify="center")
        table.add_column("Title", min_width=28)
        table.add_column("Chars", width=8, justify="right")
        table.add_column("Preview")

        for s in sections:
            lvl_label = f"H{s.level}" if s.level > 0 else "—"
            # Body text: strip the heading line itself so the preview shows prose
            body = s.text.lstrip()
            if body.startswith("#"):
                newline = body.find("\n")
                body = body[newline:].strip() if newline != -1 else ""
            snippet = body[:preview_chars].replace("\n", " ").strip()
            if len(body) > preview_chars:
                snippet += "…"
            table.add_row(
                str(s.section_index),
                lvl_label,
                s.title,
                f"{len(s.text):,}",
                snippet,
            )
        console.print(table)

    if out:
        import json as _json

        payload = {
            "source": source,
            "tool_used": tool_used,
            "total_chars": total_chars,
            "estimated_section_count": estimated,
            "actual_section_count": len(sections),
            "min_chars": min_chars,
            "max_level": max_level,
            "sections": [
                {
                    "section_index": s.section_index,
                    "title": s.title,
                    "level": s.level,
                    "char_count": len(s.text),
                    "start_char": s.start_char,
                    "end_char": s.end_char,
                    "preview": s.text[:preview_chars].replace("\n", " ").strip(),
                }
                for s in sections
            ],
        }
        out_path = Path(out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            _json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        console.print(f"\n[green]Preview JSON written → {out_path}[/green]")
    else:
        console.print("\n[dim]Tip: use --out preview.json to save as JSON.[/dim]")


@app.command(name="research-annotate")
def research_annotate_cmd(
    doc_id: str = typer.Argument(..., help="doc_id of an already-ingested document"),
    profile: str = typer.Option(..., "--profile", help="Research profile to run"),
    llm: str = typer.Option("litelm", help="LLM: litelm | litelm-heavy | litelm-reasoning | claude | local | local-heavy | local-reasoning"),
    model: Optional[str] = typer.Option(None, "--model", help="Override model alias/name"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Run and validate without saving or writing Sanity"),
    overwrite: bool = typer.Option(False, "--overwrite", help="Overwrite local file without archiving prior version"),
    force_reviewed: bool = typer.Option(False, "--force-reviewed", help="Allow replacing reviewed/corrected annotations"),
    save_local_only: bool = typer.Option(False, "--save-local-only", help="Save local annotation but do not write Sanity"),
):
    """Run a selected research annotation profile on an already-ingested document."""
    config = load_config(llm=llm)
    try:
        annotation = research_annotate.annotate_document(
            doc_id=doc_id,
            profile=profile,
            config=config,
            llm=llm,
            model=model,
            dry_run=dry_run,
            overwrite=overwrite,
            force_reviewed=force_reviewed,
            save_local_only=save_local_only,
        )
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Research annotation failed"))
        raise typer.Exit(1)

    save_note = "validated only" if dry_run else "saved locally"
    if not dry_run and not save_local_only:
        save_note += " + written to Sanity"
    console.print(Panel(
        f"Document: [bold]{annotation.doc_id}[/bold]\n"
        f"Profile: [bold]{annotation.profile}[/bold]\n"
        f"Stance: [bold]{annotation.source_stance}[/bold]\n"
        f"Status: {annotation.annotation_status}\n"
        f"Result: {save_note}",
        title="[green]Research annotation complete[/green]",
    ))


@app.command(name="research-annotations")
def research_annotations_cmd(
    doc_id: str = typer.Argument(..., help="doc_id of an already-ingested document"),
):
    """List local and Sanity research annotations for a document."""
    from rich.table import Table as RichTable

    config = load_config(require_services=False)
    table = RichTable(title=f"Research annotations — {doc_id}")
    table.add_column("Location")
    table.add_column("Profile")
    table.add_column("Status")
    table.add_column("Visibility")
    table.add_column("Generated")
    table.add_column("Detail", overflow="fold")

    local_rows = research_annotate.list_local_annotations(doc_id, config)
    for row in local_rows:
        table.add_row(
            "local",
            row.get("profile", ""),
            row.get("annotationStatus", ""),
            row.get("publicVisibility", ""),
            row.get("generatedAt", ""),
            row.get("path", ""),
        )

    try:
        sanity_rows = __import__(
            "runner.clients.sanity", fromlist=["fetch_research_annotations_for_doc"]
        ).fetch_research_annotations_for_doc(doc_id, config)
        for row in sanity_rows:
            table.add_row(
                "Sanity",
                row.get("profile", ""),
                row.get("annotationStatus", ""),
                row.get("publicVisibility", ""),
                row.get("generatedAt", ""),
                row.get("_id", ""),
            )
    except Exception as exc:
        table.add_row("Sanity", "unavailable", "", "", "", str(exc))

    if not local_rows:
        console.print("[dim]No local research annotation files found.[/dim]")
    console.print(table)


@app.command(name="set-research-profile")
def set_research_profile_cmd(
    doc_id: str = typer.Argument(..., help="doc_id of an already-ingested document"),
    profile: str = typer.Option(..., "--profile", help="Research profile to activate/deactivate"),
    active: bool = typer.Option(True, "--active/--inactive", help="Activate or deactivate this profile"),
    reason: str = typer.Option("", "--reason", help="Optional reason for profile status"),
    reviewer_note: str = typer.Option("", "--reviewer-note", help="Optional researcher note"),
    local_only: bool = typer.Option(False, "--local-only", help="Update local media_metadata.json only"),
):
    """Set mediaMetadata profile activation for a sogiceDocument."""
    config = load_config(require_services=not local_only)
    try:
        data = research_annotate.set_profile_status(
            doc_id=doc_id,
            profile=profile,
            active=active,
            config=config,
            reason=reason,
            reviewer_note=reviewer_note,
            write_sanity=not local_only,
        )
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Profile update failed"))
        raise typer.Exit(1)

    console.print(Panel(
        f"Document: [bold]{doc_id.removeprefix('doc-')}[/bold]\n"
        f"Profile: [bold]{profile}[/bold]\n"
        f"Active: [bold]{active}[/bold]\n"
        f"Active profiles: {', '.join(data.get('activeResearchProfiles', []))}",
        title="[green]Research profile updated[/green]",
    ))


@app.command(name="annotate-batch")
def annotate_batch_cmd(
    profile: str = typer.Argument(..., help="Research annotation profile to run"),
    llm: str = typer.Option("litelm", "--llm", help="LLM route for annotation"),
    filter_format: str = typer.Option("", "--format", help="Only annotate docs with this analysis format"),
    filter_type: str = typer.Option("", "--type", help="Only annotate docs with this analysis type"),
    filter_set: str = typer.Option("", "--set", help="Only annotate docs in this saved document set"),
    skip_existing: bool = typer.Option(True, "--skip-existing/--no-skip-existing", help="Skip existing non-rejected annotations"),
    force_reviewed: bool = typer.Option(False, "--force-reviewed", help="Allow replacing reviewed/corrected annotations"),
    save_local_only: bool = typer.Option(True, "--save-local-only/--push-sanity", help="Save locally only by default"),
    delay_seconds: float = typer.Option(2.0, "--delay-seconds", help="Pause between documents"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Print candidate docs without running annotations"),
):
    """Run a research annotation profile over multiple corpus documents."""
    import json
    import time

    if profile == "documentary_analysis":
        console.print(
            "[red]documentary_analysis is intentionally manual-only.[/red]\n"
            "Run it one document at a time from Media Review or `research-annotate`."
        )
        raise typer.Exit(1)

    config = load_config(llm=llm, require_services=not save_local_only)
    candidates = _annotation_batch_candidates(
        config=config,
        filter_format=filter_format,
        filter_type=filter_type,
        filter_set=filter_set,
    )
    annotated = skipped = errors = 0
    total = len(candidates)
    console.print(f"[bold]Batch annotation:[/bold] {profile} over {total} candidate document(s)")

    try:
        for index, doc_id in enumerate(candidates, start=1):
            status = "done"
            try:
                existing = research_annotate.load_local_annotation(doc_id, profile, config)
                if skip_existing and existing and existing.annotation_status != "rejected":
                    skipped += 1
                    status = "skipped"
                elif dry_run:
                    status = "dry-run"
                else:
                    research_annotate.annotate_document(
                        doc_id=doc_id,
                        profile=profile,
                        config=config,
                        llm=llm,
                        force_reviewed=force_reviewed,
                        save_local_only=save_local_only,
                        overwrite=True,
                    )
                    annotated += 1
                    if delay_seconds > 0:
                        time.sleep(delay_seconds)
            except Exception as exc:
                errors += 1
                status = f"error: {exc}"
            console.print(f"{index}/{total}  {doc_id}  {profile}  [{status}]", markup=False)
    except KeyboardInterrupt:
        console.print("[yellow]Interrupted by user. Completed annotations remain saved.[/yellow]")

    console.print(Panel(
        f"Annotated: {annotated}\nSkipped: {skipped}\nErrors: {errors}",
        title="[green]Batch annotation summary[/green]" if errors == 0 else "[yellow]Batch annotation summary[/yellow]",
    ))


@app.command(name="review-annotation")
def review_annotation_cmd(
    doc_id: str = typer.Argument(..., help="Document id"),
    profile: str = typer.Argument(..., help="Research annotation profile"),
    status: str = typer.Option("researcher_reviewed", "--status", help="model_generated | researcher_reviewed | corrected | rejected"),
    reviewer_notes: str = typer.Option("", "--notes", help="Reviewer notes to store locally"),
    public_visibility: str = typer.Option("", "--public-visibility", help="Optional visibility override"),
    push_sanity: bool = typer.Option(False, "--push-sanity", help="Also write the reviewed annotation to Sanity"),
):
    """Update human review status for a local research annotation."""
    config = load_config(require_services=push_sanity)
    try:
        annotation = research_annotate.update_annotation_review(
            doc_id=doc_id,
            profile=profile,
            config=config,
            annotation_status=status,
            reviewer_notes=reviewer_notes,
            public_visibility=public_visibility or None,
            write_sanity=push_sanity,
        )
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Review annotation failed"))
        raise typer.Exit(1)

    console.print(Panel(
        f"Document: [bold]{annotation.doc_id}[/bold]\n"
        f"Profile: [bold]{annotation.profile}[/bold]\n"
        f"Status: {annotation.annotation_status}\n"
        f"Visibility: {annotation.public_visibility}\n"
        f"Reviewed at: {annotation.reviewed_at or 'not set'}",
        title="[green]Annotation review updated[/green]",
    ))


@app.command(name="export-annotations")
def export_annotations_cmd(
    profile: str = typer.Argument(..., help="Research annotation profile to export"),
    output: str = typer.Option("", "--output", "-o", help="Markdown output path"),
    filter_format: str = typer.Option("", "--format", help="Only include docs with this analysis format"),
    filter_type: str = typer.Option("", "--type", help="Only include docs with this analysis type"),
):
    """Export local research annotations as a Markdown corpus-reading file."""
    config = load_config(require_services=False)
    try:
        path = research_annotate.export_annotations_markdown(
            profile=profile,
            config=config,
            output_path=Path(output) if output else None,
            filter_format=filter_format,
            filter_type=filter_type,
        )
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Export annotations failed"))
        raise typer.Exit(1)
    console.print(f"[green]Exported annotations:[/green] {path}")


@app.command(name="push-approved-networks")
def push_approved_networks_cmd(
    doc_id: str = typer.Argument(..., help="Document id whose approved suggestedNetworks should be promoted"),
):
    """Promote approved suggestedNetworks on a Sanity document to organization records."""
    config = load_config(require_services=True)
    try:
        from runner.clients.sanity import promote_approved_suggested_networks

        result = promote_approved_suggested_networks(doc_id, config)
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Network promotion failed"))
        raise typer.Exit(1)
    title = "[green]Network promotion complete[/green]" if not result["errors"] else "[yellow]Network promotion completed with errors[/yellow]"
    console.print(Panel(
        f"Pushed: {len(result['pushed'])}\n"
        f"Skipped not approved: {result['skipped']}\n"
        f"Errors: {len(result['errors'])}\n"
        + ("\n".join(result["errors"]) if result["errors"] else ""),
        title=title,
    ))


@app.command(name="capture-screenshots")
def capture_screenshots_cmd(
    doc_id: str = typer.Argument(..., help="Document id with a documentary annotation"),
    profile: str = typer.Option("documentary_analysis", "--profile", help="Annotation profile with screenshot suggestions"),
    video_path: str = typer.Option("", "--video-path", help="Local video file path if not stored in intake metadata"),
    output_dir: str = typer.Option("", "--output-dir", help="Directory for screenshots"),
    limit: int = typer.Option(20, "--limit", help="Maximum screenshots to capture"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Show planned screenshots without running ffmpeg"),
):
    """Capture local screenshot evidence from annotation timestamp suggestions."""
    config = load_config(require_services=False)
    try:
        payload = screenshots.capture_screenshots(
            doc_id=doc_id,
            profile=profile,
            config=config,
            video_path=video_path,
            output_dir=output_dir,
            limit=limit,
            dry_run=dry_run,
        )
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Capture screenshots failed"))
        raise typer.Exit(1)

    console.print(Panel(
        f"Document: [bold]{payload['doc_id']}[/bold]\n"
        f"Profile: {payload['profile']}\n"
        f"Video: {payload['videoPath']}\n"
        f"Screenshots: {payload['timestampCount']}\n"
        f"Output: {payload['outputDir']}",
        title="[green]Screenshot capture plan[/green]" if dry_run else "[green]Screenshots captured[/green]",
    ))


@app.command(name="make-set")
def make_set_cmd(
    name: str = typer.Argument(..., help="Document set name"),
    doc_ids: list[str] = typer.Argument(None, help="Doc IDs to include"),
    description: str = typer.Option("", "--description", help="Optional set description"),
):
    """Create or replace a local document set."""
    config = load_config(require_services=False)
    payload = _write_document_set(config, name, list(doc_ids or []), description)
    console.print(f"[green]Saved set {payload['name']} with {len(payload['docIds'])} document(s).[/green]")


@app.command(name="list-sets")
def list_sets_cmd():
    """List saved local document sets."""
    from rich.table import Table as RichTable

    config = load_config(require_services=False)
    table = RichTable(title="Document Sets")
    table.add_column("Name")
    table.add_column("Docs")
    table.add_column("Created")
    table.add_column("Description", overflow="fold")
    for item in _list_document_sets(config):
        table.add_row(item["name"], str(len(item.get("docIds", []))), item.get("createdAt", ""), item.get("description", ""))
    console.print(table)


@app.command(name="show-set")
def show_set_cmd(name: str = typer.Argument(..., help="Document set name")):
    """Show doc_ids in a saved document set."""
    config = load_config(require_services=False)
    payload = _read_document_set(config, name)
    console.print(Panel("\n".join(payload.get("docIds", [])) or "(empty)", title=f"Set: {payload['name']}"))


@app.command(name="add-to-set")
def add_to_set_cmd(
    name: str = typer.Argument(..., help="Document set name"),
    doc_id: str = typer.Argument(..., help="Doc ID to add"),
):
    """Add a document to a saved set."""
    config = load_config(require_services=False)
    payload = _read_document_set(config, name)
    doc_ids = list(dict.fromkeys([*payload.get("docIds", []), doc_id.removeprefix("doc-")]))
    payload = _write_document_set(config, name, doc_ids, payload.get("description", ""))
    console.print(f"[green]Set {name} now has {len(payload['docIds'])} document(s).[/green]")


@app.command(name="remove-from-set")
def remove_from_set_cmd(
    name: str = typer.Argument(..., help="Document set name"),
    doc_id: str = typer.Argument(..., help="Doc ID to remove"),
):
    """Remove a document from a saved set."""
    config = load_config(require_services=False)
    payload = _read_document_set(config, name)
    target = doc_id.removeprefix("doc-")
    doc_ids = [item for item in payload.get("docIds", []) if item != target]
    payload = _write_document_set(config, name, doc_ids, payload.get("description", ""))
    console.print(f"[green]Set {name} now has {len(payload['docIds'])} document(s).[/green]")


def _document_sets_dir(config):
    path = config.corpus_dir / ".document_sets"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _set_path(config, name: str):
    safe = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in name.strip()).strip("_")
    if not safe:
        raise ValueError("Set name is required")
    return _document_sets_dir(config) / f"{safe}.json"


def _write_document_set(config, name: str, doc_ids: list[str], description: str = "") -> dict:
    from datetime import datetime, timezone
    import json

    clean_ids = list(dict.fromkeys(item.strip().removeprefix("doc-") for item in doc_ids if item.strip()))
    payload = {
        "name": _set_path(config, name).stem,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "description": description,
        "docIds": clean_ids,
    }
    _set_path(config, name).write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def _read_document_set(config, name: str) -> dict:
    import json

    path = _set_path(config, name)
    if not path.exists():
        raise FileNotFoundError(f"No document set named {name!r}")
    return json.loads(path.read_text(encoding="utf-8"))


def _list_document_sets(config) -> list[dict]:
    import json

    rows = []
    for path in sorted(_document_sets_dir(config).glob("*.json")):
        try:
            rows.append(json.loads(path.read_text(encoding="utf-8")))
        except Exception:
            continue
    return rows


def _annotation_batch_candidates(config, filter_format: str = "", filter_type: str = "", filter_set: str = "") -> list[str]:
    import json

    allowed = None
    if filter_set:
        allowed = set(_read_document_set(config, filter_set).get("docIds", []))
    candidates: list[str] = []
    for doc_dir in sorted(config.corpus_dir.iterdir()):
        if not doc_dir.is_dir() or doc_dir.name.startswith("."):
            continue
        if allowed is not None and doc_dir.name not in allowed:
            continue
        analysis_path = doc_dir / "analysis.json"
        extracted_path = doc_dir / "extracted.txt"
        if not analysis_path.exists() or not extracted_path.exists():
            continue
        try:
            analysis = json.loads(analysis_path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if filter_format and str(analysis.get("format", "")).lower() != filter_format.lower():
            continue
        if filter_type and str(analysis.get("type", "")).lower() != filter_type.lower():
            continue
        candidates.append(doc_dir.name)
    return candidates


@app.command()
def status(
    doc_id: Optional[str] = typer.Argument(None, help="Optional doc_id for a detailed pipeline trace"),
    limit: int = typer.Option(50, "--limit", help="Max pending docs to scan (0 = unlimited)"),
):
    """List pending documents, or show a detailed status trace for one document."""
    config = load_config(require_services=False)
    if doc_id:
        upload.print_document_status(doc_id, config)
    else:
        actual_limit = limit if limit > 0 else None
        upload.list_pending(config, limit=actual_limit)


@app.command()
def upload_doc(
    doc_id: str = typer.Argument(..., help="doc_id of a locally saved document"),
    force_reviewed: bool = typer.Option(
        False,
        "--force-reviewed",
        "--force",
        help="Allow replacing a reviewed/corrected Sanity document",
    ),
):
    """Upload a locally saved document to Sanity and Supabase."""
    config = load_config()
    upload.upload_saved(
        doc_id,
        config,
        force_sanity_overwrite=force_reviewed,
    )


@app.command(name="push-enrichment")
def push_enrichment(
    doc_id: str = typer.Argument(..., help="doc_id of a document with an enrichment.json"),
):
    """Push all approved (not yet sent) enrichment proposals from enrichment.json to Sanity."""
    config = load_config()
    try:
        result = enrich.push_approved_to_sanity(doc_id, config)
    except FileNotFoundError as exc:
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(1)

    pushed_total = sum(v for k, v in result.items() if k != "errors")
    if pushed_total:
        console.print(
            "[green]Pushed enrichment proposals to Sanity: "
            f"lexicon={result['lexicon']}, entities={result['entities']}, "
            f"tactics={result['tactics']}, practices={result['practices']}, "
            f"statistical_claims={result['statistical_claims']}.[/green]"
        )
    else:
        console.print("[yellow]Nothing to push — no approved-not-yet-pushed proposals found.[/yellow]")

    if result["errors"]:
        for err in result["errors"]:
            console.print(f"[red]  Error: {err}[/red]")
        raise typer.Exit(1)


@app.command(name="queue")
def show_queue(
    doc_id: Optional[str] = typer.Argument(None, help="Show ingestion queue for one doc_id, or all if omitted"),
):
    """Show URLs queued for ingestion from enrichment.json results."""
    from rich.table import Table as RichTable
    config = load_config()

    def _show_for_doc(did: str) -> int:
        result = enrich.load(did, config)
        if not result or not result.ingestion_queue:
            return 0
        for item in result.ingestion_queue:
            table.add_row(
                did,
                item.url,
                item.title[:60] if item.title else "",
                item.source_type,
                item.priority,
                "yes" if item.already_in_corpus else "no",
            )
        return len(result.ingestion_queue)

    table = RichTable(title="Ingestion Queue")
    table.add_column("doc_id", style="dim")
    table.add_column("url", overflow="fold")
    table.add_column("title")
    table.add_column("type")
    table.add_column("priority")
    table.add_column("in corpus")

    total = 0
    if doc_id:
        total = _show_for_doc(doc_id)
    else:
        for doc_dir in sorted(config.corpus_dir.iterdir()):
            if doc_dir.is_dir() and (doc_dir / "enrichment.json").exists():
                total += _show_for_doc(doc_dir.name)

    if total == 0:
        console.print("[green]No queued ingestion candidates.[/green]")
        return
    console.print(table)
    console.print(f"[dim]Total: {total} candidates. Ingest with: python -m runner ingest <url>[/dim]")


# ---------------------------------------------------------------------------
# Pre-ingestion source queue commands
# ---------------------------------------------------------------------------

@app.command(name="queue-add")
def queue_add(
    url: Optional[str] = typer.Argument(None, help="Single URL to add (omit to read from --file or stdin)"),
    file: Optional[Path] = typer.Option(None, "--file", "-f", help="Text/CSV file with one URL per line"),
    priority: str = typer.Option("medium", "--priority", "-p", help="Priority: high | medium | low | skip"),
    batch: str = typer.Option("", "--batch", "-b", help="Batch group label, e.g. 'UN sources'"),
    notes: str = typer.Option("", "--notes", "-n", help="Free-text notes for all added items"),
    tags: str = typer.Option("", "--tags", "-t", help="Comma-separated tags, e.g. 'sogice,evidence'"),
    triage_now: bool = typer.Option(False, "--triage-now", help="Run fast triage immediately after adding"),
):
    """Add one or more URLs to the pre-ingestion source queue.

    \b
    Examples:
      runner queue-add https://example.com
      runner queue-add https://example.com --triage-now
      runner queue-add --file urls.txt --batch "UN sources" --priority high
      cat urls.txt | runner queue-add --file -
    """
    from .pipeline.source_queue import (
        open_db, queue_db_path, add_items_from_text, list_items,
        apply_triage_result, VALID_PRIORITIES,
    )
    if priority not in VALID_PRIORITIES:
        console.print(f"[red]Invalid priority {priority!r}. Choose from: {sorted(VALID_PRIORITIES)}[/red]")
        raise typer.Exit(1)

    config = load_config(require_services=False)
    db = open_db(queue_db_path(config.corpus_dir))

    # Collect text to parse
    text: str = ""
    if url:
        text = url
    elif file:
        if str(file) == "-":
            import sys as _sys
            text = _sys.stdin.read()
        else:
            text = file.read_text(encoding="utf-8", errors="ignore")
    else:
        console.print("[dim]Paste URLs (one per line). Press Ctrl-D when done.[/dim]")
        import sys as _sys
        text = _sys.stdin.read()

    added, dup_queue, dup_corpus = add_items_from_text(
        db, text, config.corpus_dir,
        priority=priority, notes=notes, tags=tags, batch_group=batch,
    )
    parts = []
    if added:
        parts.append(f"[green]{added} added[/green]")
    if dup_corpus:
        parts.append(f"[yellow]{dup_corpus} already in corpus (association noted, status=new)[/yellow]")
    if dup_queue:
        parts.append(f"[dim]{dup_queue} duplicate(s) skipped[/dim]")
    if not parts:
        console.print("[dim]No URLs found in input.[/dim]")
    else:
        console.print("  ".join(parts))
    console.print(f"[dim]Queue DB: {queue_db_path(config.corpus_dir)}[/dim]")

    if triage_now and (added + dup_corpus) > 0:
        from .pipeline import triage as triage_mod
        # Triage only the items we just added (status=new, batch matches if set)
        new_items = list_items(db, status="new", batch_group=batch or None, limit=added + dup_corpus + 10)
        model_name = "litelm/triage" if config.litelm_base_url else config.local_analysis_model
        console.print(f"[cyan]Triaging {len(new_items)} item(s) with {model_name}...[/cyan]")
        for i, item in enumerate(new_items, 1):
            console.print(f"  [{i}/{len(new_items)}] {item.url[:80]}")
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
                apply_triage_result(db, item.id, result, model_name=model_name)
                console.print(
                    f"    → [cyan]{result.doc_type_hint}[/cyan] "
                    f"[yellow]{result.recommended_llm}[/yellow] "
                    f"{result.routing_reason[:55]}"
                )
            except Exception as exc:
                console.print(f"    [red]Triage failed: {exc}[/red]")


@app.command(name="queue-list")
def queue_list(
    status: Optional[str] = typer.Option(None, "--status", "-s",
        help="Filter by status: new | triaged | ready_to_ingest | ingested | skipped"),
    priority: Optional[str] = typer.Option(None, "--priority", "-p",
        help="Filter by priority: high | medium | low | skip"),
    batch: Optional[str] = typer.Option(None, "--batch", "-b", help="Filter by batch group"),
    limit: int = typer.Option(100, "--limit", "-n", help="Maximum rows to show"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show triage comment and corpus association"),
):
    """List the pre-ingestion source queue.

    \b
    Lifecycle: new → triaged → ready_to_ingest → ingested
    ready_to_ingest = approved by researcher but NOT yet ingested.
    """
    from rich.table import Table as RichTable
    from .pipeline.source_queue import open_db, queue_db_path, list_items, queue_stats

    config = load_config(require_services=False)
    db_path = queue_db_path(config.corpus_dir)
    if not db_path.exists():
        console.print("[dim]Source queue is empty. Use: runner queue-add <url>[/dim]")
        return
    db = open_db(db_path)

    stats = queue_stats(db)
    by_s = stats["by_status"]
    stat_parts = [f"Total: {stats['total']}"]
    for s in ("new", "triaged", "ready_to_ingest", "ingested", "skipped"):
        n = by_s.get(s, 0)
        if n:
            colour = {"ready_to_ingest": "green", "ingested": "dim",
                      "skipped": "red", "triaged": "cyan"}.get(s, "white")
            stat_parts.append(f"[{colour}]{s}: {n}[/{colour}]")
    console.print("  |  ".join(stat_parts))

    items = list_items(db, status=status, priority=priority, batch_group=batch, limit=limit)
    if not items:
        console.print("[dim]No items match the filter.[/dim]")
        return

    tbl = RichTable(title="Source Queue")
    tbl.add_column("id", style="dim", width=10)
    tbl.add_column("status", width=18)
    tbl.add_column("prio", width=7)
    tbl.add_column("type", width=9)
    tbl.add_column("llm", width=16)
    tbl.add_column("model", width=14)
    tbl.add_column("corpus", width=10)
    tbl.add_column("url", overflow="fold")

    _status_colour = {
        "new": "white", "triaged": "cyan", "ready_to_ingest": "green",
        "ingested": "dim", "skipped": "red",
    }
    _prio_colour = {"high": "red", "medium": "yellow", "low": "dim", "skip": "red"}

    for item in items:
        sc = _status_colour.get(item.status, "white")
        pc = _prio_colour.get(item.priority, "white")
        corpus_cell = f"[yellow]{item.corpus_doc_id}[/yellow]" if item.corpus_doc_id else "—"
        tbl.add_row(
            item.id,
            f"[{sc}]{item.status}[/{sc}]",
            f"[{pc}]{item.priority}[/{pc}]",
            item.source_type,
            item.recommended_llm or "—",
            item.triage_model_used[:12] if item.triage_model_used else "—",
            corpus_cell,
            item.url,
        )
    console.print(tbl)

    if verbose:
        console.print()
        for item in items:
            if item.routing_reason or item.notes:
                console.print(
                    f"  [dim]{item.id}[/dim]  "
                    + (f"[cyan]{item.routing_reason[:70]}[/cyan]" if item.routing_reason else "")
                    + (f"  notes: {item.notes[:50]}" if item.notes else "")
                )

    # Ingest commands only for ready_to_ingest items
    ready = [i for i in items if i.status == "ready_to_ingest"]
    if ready:
        console.print(f"\n[green]Ready for ingest ({len(ready)} item(s)):[/green]")
        for item in ready:
            llm = item.recommended_llm or "litelm"
            console.print(f'  python -m runner ingest "{item.url}" --llm {llm}')

    if len(items) == limit:
        console.print(f"[dim](showing first {limit}; use --limit N for more)[/dim]")


@app.command(name="queue-triage")
def queue_triage(
    limit: int = typer.Option(10, "--limit", "-n", help="Maximum items to triage in one run"),
    batch: Optional[str] = typer.Option(None, "--batch", "-b", help="Triage only items in this batch group"),
    force: bool = typer.Option(False, "--force", help="Re-triage items already in 'triaged' status"),
):
    """Run fast triage on new source-queue items.

    Fetches each URL, sends a snippet to the triage model, and updates
    priority / recommended_llm / doc_type_hint in the queue.
    """
    from .pipeline.source_queue import (
        open_db, queue_db_path, list_items, apply_triage_result
    )
    from .pipeline import triage as triage_mod

    config = load_config(require_services=False)
    db = open_db(queue_db_path(config.corpus_dir))

    status_filter = None if force else "new"
    candidates = list_items(db, status=status_filter, batch_group=batch, limit=limit)
    if force:
        candidates = [i for i in candidates if i.status in ("new", "triaged")]

    if not candidates:
        console.print("[dim]No new items to triage.[/dim]")
        return

    model_name = "litelm/triage" if config.litelm_base_url else config.local_analysis_model
    console.print(f"[cyan]Triaging {len(candidates)} item(s) with {model_name}...[/cyan]")
    for i, item in enumerate(candidates, 1):
        console.print(f"[dim]({i}/{len(candidates)})[/dim] {item.url[:80]}")
        try:
            snippet, note = triage_mod.extract_snippet(item.url)
            console.print(f"  [dim]{note[:60]}[/dim]")
            triage_audit: dict = {}
            result = triage_mod.run(
                snippet,
                config,
                source_label=triage_mod.source_context_label(
                    item.url,
                    extraction_note=note,
                    snippet=snippet,
                    researcher_note=item.notes,
                ),
                _audit=triage_audit,
            )
            apply_triage_result(db, item.id, result, model_name=model_name)
            if not result.triage_succeeded:
                # run() returned a fail-closed result (model/network/parse failure).
                console.print(
                    f"  [red]→ triage failed — not batch-safe[/red] "
                    f"[dim]{result.routing_reason[:80]}[/dim]"
                )
            else:
                console.print(
                    f"  → [cyan]{result.doc_type_hint}[/cyan]  "
                    f"[yellow]{result.recommended_llm}[/yellow]  "
                    f"{result.routing_reason[:60]}"
                )
        except Exception as exc:
            # Snippet extraction (or any other step) raised. Persist a fail-closed
            # triage result so the row is never left at the default-safe state.
            console.print(f"  [red]Triage failed: {exc}[/red]")
            failed = triage_mod.TriageResult.failed(f"snippet/extraction error: {exc}")
            apply_triage_result(db, item.id, failed, model_name=model_name)
            console.print("  [red]→ triage failed — not batch-safe[/red]")

    console.print(
        f"[green]Done.[/green] Use [dim]runner queue-list[/dim] to review. "
        "Mark approved items with: [dim]runner queue-mark <id> --status ready_to_ingest[/dim]"
    )


@app.command(name="queue-mark")
def queue_mark(
    item_id: str = typer.Argument(..., help="Queue item ID (8-char, from queue-list)"),
    status: Optional[str] = typer.Option(None, "--status", "-s",
        help="New status: new | triaged | ready_to_ingest | ingested | skipped"),
    priority: Optional[str] = typer.Option(None, "--priority", "-p",
        help="New priority: high | medium | low | skip"),
    notes: Optional[str] = typer.Option(None, "--notes", "-n", help="Update notes field"),
    batch: Optional[str] = typer.Option(None, "--batch", "-b", help="Update batch group"),
    title: Optional[str] = typer.Option(None, "--title", help="Update title"),
):
    """Update a source-queue item's status, priority, or notes."""
    from .pipeline.source_queue import (
        open_db, queue_db_path, update_status, update_priority, update_notes,
        get_item, VALID_STATUSES, VALID_PRIORITIES,
    )

    config = load_config(require_services=False)
    db = open_db(queue_db_path(config.corpus_dir))
    item = get_item(db, item_id)
    if item is None:
        console.print(f"[red]No queue item with id={item_id!r}[/red]")
        raise typer.Exit(1)

    changed: list[str] = []
    if status:
        if status not in VALID_STATUSES:
            console.print(f"[red]Invalid status {status!r}. Choose from: {sorted(VALID_STATUSES)}[/red]")
            raise typer.Exit(1)
        update_status(db, item_id, status)
        changed.append(f"status={status}")
    if priority:
        if priority not in VALID_PRIORITIES:
            console.print(f"[red]Invalid priority {priority!r}. Choose from: {sorted(VALID_PRIORITIES)}[/red]")
            raise typer.Exit(1)
        update_priority(db, item_id, priority)
        changed.append(f"priority={priority}")
    if any(v is not None for v in (notes, batch, title)):
        update_notes(db, item_id, notes=notes, batch_group=batch, title=title)
        if notes is not None:
            changed.append("notes")
        if batch is not None:
            changed.append(f"batch={batch}")
        if title is not None:
            changed.append("title")

    if changed:
        console.print(f"[green]Updated {item_id}: {', '.join(changed)}[/green]")
    else:
        console.print(f"[yellow]Nothing to change — pass --status, --priority, --notes, --batch, or --title[/yellow]")


@app.command(name="related-source-search")
def related_source_search_cmd(
    doc_id: str = typer.Argument(..., help="doc_id with a discovery_seed_queue.json"),
    provider: str = typer.Option("duckduckgo", "--provider", help="Search provider: duckduckgo"),
    max_queries: int = typer.Option(5, "--max-queries", help="Maximum discovery seed queries to run"),
    max_results: int = typer.Option(5, "--max-results", help="Maximum search results per query"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Show seeds without searching or writing candidate_sources.json"),
):
    """Search related sources from discovery seeds and save a review-only candidate queue."""
    from rich.table import Table as RichTable

    config = load_config(require_services=False)
    try:
        payload = related_search.run_related_source_search(
            doc_id=doc_id,
            config=config,
            provider=provider,
            max_queries=max_queries,
            max_results_per_query=max_results,
            dry_run=dry_run,
        )
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Related source search failed"))
        raise typer.Exit(1)

    if dry_run:
        table = RichTable(title=f"Discovery seeds — {doc_id}")
        table.add_column("Query")
        table.add_column("Type")
        table.add_column("Reason", overflow="fold")
        for seed in payload["seedsUsed"]:
            table.add_row(seed.get("query", ""), seed.get("seedType", ""), seed.get("reason", ""))
        console.print(table)
        console.print("[dim]Dry run only: no search performed and no files written.[/dim]")
        return

    table = RichTable(title=f"Candidate sources — {doc_id}")
    table.add_column("Score")
    table.add_column("Platform")
    table.add_column("Category")
    table.add_column("In corpus")
    table.add_column("Title", overflow="fold")
    table.add_column("URL", overflow="fold")
    for row in payload["candidates"][:20]:
        table.add_row(
            str(row.get("score", "")),
            row.get("platform", ""),
            row.get("candidateCategory", ""),
            "yes" if row.get("alreadyInCorpus") else "no",
            row.get("title", ""),
            row.get("url", ""),
        )
    console.print(table)
    console.print(
        f"[green]Saved {payload['candidateCount']} candidate source(s) to "
        f"{config.corpus_dir / payload['doc_id'] / 'candidate_sources.json'}[/green]\n"
        "[dim]Review manually. This command never ingests candidates automatically.[/dim]"
    )


@app.command(name="media-report")
def media_report_cmd(
    doc_id: str = typer.Argument(..., help="doc_id with media extraction artifacts"),
):
    """Show transcript, comment, duplicate, and related-source media artifacts."""
    from rich.table import Table as RichTable

    config = load_config(require_services=False)
    try:
        report = media_review.media_extraction_report(doc_id, config)
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Media report failed"))
        raise typer.Exit(1)

    summary = (
        f"Document: [bold]{report['doc_id']}[/bold]\n"
        f"Format: {report.get('contentFormat') or 'unknown'} / {report.get('mediaMode') or 'unknown'}\n"
        f"Platforms: {', '.join(report.get('platforms') or []) or 'none recorded'}\n"
        f"Views: {report.get('platformViewCount') if report.get('platformViewCount') is not None else 'not recorded'} "
        "(platform metadata, not independently verified)\n"
        f"Primary transcript chunks: {report.get('primaryTranscriptChunkCount', 0)}\n"
        f"Comments collected: {report.get('commentEvidenceCount', 0)} "
        f"({report.get('commentAnalysisStatus', 'not_available')})\n"
        f"Related candidates: {report.get('relatedCandidateCount', 0)}"
    )
    console.print(Panel(summary, title="[green]Media Extraction Report[/green]"))

    versions = RichTable(title="Transcript Versions")
    versions.add_column("Label")
    versions.add_column("Language")
    versions.add_column("Source")
    versions.add_column("Kind")
    versions.add_column("Chunks")
    versions.add_column("Chars")
    for row in report.get("transcriptVersions", []):
        versions.add_row(
            row.get("label", ""),
            row.get("language", ""),
            row.get("source", ""),
            row.get("kind", ""),
            str(row.get("chunkCount", "")),
            str(row.get("charCount", "")),
        )
    console.print(versions)

    comparisons = report.get("transcriptComparison", {}).get("comparisons", [])
    if comparisons:
        table = RichTable(title="Transcript Comparisons")
        table.add_column("Left")
        table.add_column("Right")
        table.add_column("Similarity")
        table.add_column("Char Δ")
        table.add_column("Chunk Δ")
        for row in comparisons:
            table.add_row(
                row.get("left", ""),
                row.get("right", ""),
                str(row.get("similarity", "")),
                str(row.get("charDelta", "")),
                str(row.get("chunkDelta", "")),
            )
        console.print(table)

    actions = report.get("nextRecommendedActions", [])
    if actions:
        console.print("[yellow]Next media checks:[/yellow]")
        for action in actions:
            console.print(f"  - {action}")


@app.command(name="collect-comments")
def collect_comments_cmd(
    doc_id: str = typer.Argument(..., help="doc_id with a video/audio platform source"),
    max_comments: int = typer.Option(50, "--max-comments", help="Maximum comments to retain for review"),
):
    """Collect platform comments after ingest and build a lower-trust review queue."""
    config = load_config(require_services=False)
    try:
        result = media_review.collect_comments_for_document(
            doc_id=doc_id,
            config=config,
            max_comments=max_comments,
        )
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Collect comments failed"))
        raise typer.Exit(1)

    platform_total = result.get("platformCommentCount")
    console.print(Panel(
        f"Document: [bold]{result['doc_id']}[/bold]\n"
        f"Platform comment count: {platform_total if platform_total is not None else 'not reported'}\n"
        f"Collected for review: {result['collectedCount']}\n"
        f"LLM analysis status: {result['queue'].get('analysisStatus', '')}\n"
        "Use: comments remain lower-trust context, not source claims.",
        title="[green]Comments collected[/green]",
    ))


@app.command(name="repair-media-metadata")
def repair_media_metadata_cmd(
    doc_id: str = typer.Argument(..., help="doc_id with media_metadata.json"),
    push_sanity: bool = typer.Option(False, "--push-sanity", help="Patch structured mediaMetadata into Sanity"),
):
    """Promote table-ready fields from raw yt-dlp metadata into structured media metadata."""
    config = load_config(require_services=push_sanity)
    try:
        result = media_review.repair_media_metadata_from_raw(
            doc_id=doc_id,
            config=config,
            write_sanity=push_sanity,
        )
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Repair media metadata failed"))
        raise typer.Exit(1)

    changed = result.get("changed", {})
    lines = [
        f"Document: [bold]{result['doc_id']}[/bold]",
        f"Changed fields: {result['changedCount']}",
        f"Local file: {result['mediaMetadataPath']}",
    ]
    if result.get("sanityId"):
        lines.append(f"Patched Sanity: {result['sanityId']}")
    if changed:
        lines.append("Fields: " + ", ".join(changed.keys()))
    console.print(Panel("\n".join(lines), title="[green]Media metadata repaired[/green]"))


@app.command(name="attach-srt")
def attach_srt_cmd(
    doc_id: str = typer.Argument(..., help="doc_id of an existing corpus document"),
    srt_path: str = typer.Argument(..., help="Path to researcher-provided SRT/VTT"),
    label: str = typer.Option("", "--label", help="Stable label for this transcript version"),
    language: str = typer.Option("", "--language", help="Transcript language code, e.g. en, pt, no"),
    make_primary: bool = typer.Option(True, "--make-primary/--compare-only", help="Use uploaded SRT as primary extracted transcript"),
):
    """Attach a researcher-provided SRT/VTT to an existing media document."""
    config = load_config(require_services=False)
    try:
        result = media_review.attach_srt_to_document(
            doc_id=doc_id,
            srt_path=srt_path,
            config=config,
            label=label,
            language=language,
            make_primary=make_primary,
        )
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Attach SRT failed"))
        raise typer.Exit(1)

    console.print(Panel(
        f"Document: [bold]{result['doc_id']}[/bold]\n"
        f"Transcript: [bold]{result['label']}[/bold]\n"
        f"Chunks: {result['chunkCount']}  Chars: {result['charCount']}\n"
        f"Primary: {result['makePrimary']}\n"
        f"Saved: {result['transcriptPath']}",
        title="[green]Transcript attached[/green]",
    ))


@app.command(name="comment-evidence-queue")
def comment_evidence_queue_cmd(
    doc_id: str = typer.Argument(..., help="doc_id with media_comments.json"),
):
    """Create or show the lower-trust comment evidence queue for later review."""
    config = load_config(require_services=False)
    try:
        queue = media_review.load_or_build_comment_queue(doc_id, config, save=True)
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Comment evidence queue failed"))
        raise typer.Exit(1)

    console.print(Panel(
        f"Document: [bold]{doc_id}[/bold]\n"
        f"Comments: {queue.get('commentCount', 0)}\n"
        f"Review status: {queue.get('reviewStatus', '')}\n"
        f"LLM analysis status: {queue.get('analysisStatus', '')}\n"
        f"Use: comments remain lower-trust context, not source claims.",
        title="[green]Comment Evidence Queue[/green]",
    ))


@app.command(name="batch-plan")
def batch_plan_cmd(
    batch: Optional[str] = typer.Option(None, "--batch", "-b", help="Only inspect items in this batch group"),
    limit: int = typer.Option(10, "--limit", "-n", help="Maximum items to include (hard cap: 15)"),
    priority: Optional[str] = typer.Option(None, "--priority", "-p", help="Filter by priority: high | medium | low"),
    out: Optional[Path] = typer.Option(None, "--out", help="Write manifest JSON to this path (optional)"),
):
    """Dry-run batch plan: show which queue items are safe to process unattended.

    \b
    Applies all overnight-safety gates without mutating any state.
    No ingestion, analysis, upload, or queue changes are made.
    All four safety checks must pass for an item to be included:
      • triage was run and succeeded
      • status is triaged or ready_to_ingest
      • triage did not flag the document as unsafe
      • no testimony / legal / media / book-splitting review flag is set

    \b
    Excluded items are listed with the reason they failed the safety check.
    Use this output to decide whether to proceed with: runner batch-run (Slice 2, not yet built).
    """
    import json as _json
    from rich.table import Table
    from .pipeline.source_queue import open_db, queue_db_path
    from .pipeline.batch import plan_batch, MAX_BATCH_LIMIT

    config = load_config(require_services=False)
    db = open_db(queue_db_path(config.corpus_dir))
    manifest = plan_batch(
        db,
        batch_group=batch or "",
        limit=limit,
        priority_filter=priority or "",
    )

    console.print(f"\n[bold]Batch Plan[/bold]  [dim](generated {manifest.generated_at})[/dim]")
    console.print(
        f"  Candidates inspected: {manifest.total_candidates}"
        + (f"  |  batch group: [cyan]{manifest.batch_group_filter}[/cyan]" if manifest.batch_group_filter else "")
        + (f"  |  priority filter: [cyan]{manifest.priority_filter}[/cyan]" if manifest.priority_filter else "")
    )
    console.print(
        f"  [green]Included: {manifest.total_included}[/green]"
        f"  [yellow]Excluded: {manifest.total_excluded}[/yellow]"
        f"  [dim]Limit: {manifest.limit} (hard cap: {MAX_BATCH_LIMIT})[/dim]"
    )

    if manifest.included:
        t = Table(title=f"Included ({manifest.total_included})", show_lines=False)
        t.add_column("#",             style="dim",    width=3)
        t.add_column("ID",            style="cyan",   no_wrap=True)
        t.add_column("URL",           no_wrap=False,  max_width=55)
        t.add_column("Status",        style="green",  no_wrap=True)
        t.add_column("Priority",      no_wrap=True)
        t.add_column("LLM",           no_wrap=True)
        t.add_column("Type hint",     no_wrap=True)
        for i, item in enumerate(manifest.included, 1):
            t.add_row(
                str(i),
                item.item_id[:12],
                item.url[:55],
                item.status,
                item.priority,
                item.recommended_llm,
                item.doc_type_hint,
            )
        console.print(t)
    else:
        console.print("[yellow]No items eligible for batch processing.[/yellow]")

    if manifest.excluded:
        t2 = Table(title=f"Excluded ({manifest.total_excluded})", show_lines=False)
        t2.add_column("ID",     style="dim",  no_wrap=True)
        t2.add_column("URL",    no_wrap=False, max_width=55)
        t2.add_column("Status", style="dim",  no_wrap=True)
        t2.add_column("Reason", style="red",  no_wrap=True)
        for item in manifest.excluded:
            t2.add_row(
                item.item_id[:12],
                item.url[:55],
                item.status,
                item.exclusion_reason,
            )
        console.print(t2)

    for note in manifest.notes:
        console.print(f"[yellow]▲ {note}[/yellow]")

    if out:
        out.write_text(
            _json.dumps(manifest.to_dict(), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        console.print(f"[dim]Manifest written → {out}[/dim]")


@app.command(name="batch-run")
def batch_run_cmd(
    batch: Optional[str] = typer.Option(None, "--batch", "-b", help="Only process items in this batch group"),
    limit: int = typer.Option(10, "--limit", "-n", help="Maximum items to include (hard cap: 15)"),
    priority: Optional[str] = typer.Option(None, "--priority", "-p", help="Filter by priority: high | medium | low"),
    out_dir: Optional[Path] = typer.Option(None, "--out-dir", help="Directory for batch ledger JSON"),
    execute: bool = typer.Option(False, "--execute", help="Actually ingest included items. Omit for rehearsal only."),
    run_enrich: bool = typer.Option(True, "--enrich/--no-enrich", help="Run Stage 3c enrichment during each ingest"),
    enrich_model: Optional[str] = typer.Option(None, "--enrich-model", help="LiteLLM model alias for Stage 3c enrichment, e.g. core-gemma"),
    skip_preflight: bool = typer.Option(
        False,
        "--skip-preflight",
        help="[DANGER] Skip pre-flight connectivity checks. Use only for isolated testing.",
    ),
):
    """Guarded batch ingestion from the source queue.

    Without --execute, this command only writes a rehearsal ledger. With
    --execute, it runs pre-flight checks (credentials + LiteLLM reachability),
    then processes eligible queue items through ingest(..., --yes), stops on
    the first failure, and marks only successful items as ingested.
    """
    from datetime import datetime, timezone
    from rich.table import Table
    from .pipeline.source_queue import open_db, queue_db_path, mark_ingested
    from .pipeline.batch import (
        _next_action,
        batch_preflight,
        build_batch_ledger,
        plan_batch,
        write_batch_ledger,
        write_batch_report,
    )

    config = load_config(require_services=False)
    db = open_db(queue_db_path(config.corpus_dir))
    manifest = plan_batch(
        db,
        batch_group=batch or "",
        limit=limit,
        priority_filter=priority or "",
    )
    batch_id = datetime.now(timezone.utc).strftime("batch-%Y%m%d-%H%M%S")
    ledger = build_batch_ledger(manifest, batch_id=batch_id, execute=execute)
    ledger_dir = out_dir or (config.exports_dir / "batch_ledgers")

    console.print(f"\n[bold]Batch Run[/bold]  [dim]{batch_id}[/dim]")
    console.print(
        f"  Eligible items: {manifest.total_included}"
        f"  [yellow]Excluded: {manifest.total_excluded}[/yellow]"
        f"  [dim]execute={execute}[/dim]"
    )

    if not manifest.included:
        ledger.completed = False
        ledger.stop_reason = "no eligible items"
        path = write_batch_ledger(ledger, ledger_dir)
        report_path = write_batch_report(ledger, ledger_dir)
        console.print("[yellow]No eligible items to ingest.[/yellow]")
        _act = _next_action(ledger)
        if _act:
            console.print(f"[bold]Next:[/bold] {_act}")
        console.print(f"[dim]Ledger written → {path}[/dim]")
        console.print(f"[dim]Report → {report_path}[/dim]")
        return

    if not execute:
        for item in ledger.items:
            item.status = "not_executed"
        ledger.completed = False
        ledger.stop_reason = "execute flag not provided"
        path = write_batch_ledger(ledger, ledger_dir)
        report_path = write_batch_report(ledger, ledger_dir)
        console.print("[yellow]Rehearsal only. Re-run with --execute to ingest.[/yellow]")
        _act = _next_action(ledger)
        if _act:
            console.print(f"[bold]Next:[/bold] {_act}")
        console.print(f"[dim]Ledger written → {path}[/dim]")
        console.print(f"[dim]Report → {report_path}[/dim]")
        return

    # ── Pre-flight checks (execute mode only) ────────────────────────────
    if not skip_preflight:
        preflight = batch_preflight(config, manifest, ledger_dir=ledger_dir)
        failed = [r for r in preflight if not r.ok]
        for r in preflight:
            icon = "[green]✓[/green]" if r.ok else "[red]✗[/red]"
            hint = f"  [dim]{r.detail[:80]}[/dim]" if (not r.ok and r.detail) else ""
            console.print(f"  {icon} {r.check}: {r.message}{hint}")
        if failed:
            ledger.completed = False
            ledger.stop_reason = f"preflight_failed:{failed[0].check}"
            path = write_batch_ledger(ledger, ledger_dir)
            report_path = write_batch_report(ledger, ledger_dir)
            console.print(Panel(
                "\n".join(
                    f"{r.check}: {r.message}\n  {r.detail}"
                    if r.detail else f"{r.check}: {r.message}"
                    for r in failed
                ),
                title="[red]Pre-flight failed — batch not started[/red]",
            ))
            _act = _next_action(ledger)
            if _act:
                console.print(f"[bold]Next:[/bold] {_act}")
            console.print(f"[dim]Ledger written → {path}[/dim]")
            console.print(f"[dim]Report → {report_path}[/dim]")
            raise typer.Exit(1)

    by_id = {item.item_id: item for item in manifest.included}
    for ledger_item in ledger.items:
        manifest_item = by_id[ledger_item.item_id]
        ledger_item.started_at = datetime.now(timezone.utc).isoformat()
        ledger_item.status = "running"
        try:
            doc_id = ingest(
                manifest_item.url,
                llm=manifest_item.recommended_llm or "litelm",
                tier=None,
                batch=batch_id,
                source_url=None,
                max_chars=None,
                yes=True,
                run_triage=False,
                run_enrich=run_enrich,
                enrich_model=enrich_model,
                second_opinion=False,
                collect_comments=False,
                max_comments=50,
                skip_whisper=False,
            )
            ledger_item.doc_id = doc_id or ""
            ledger_item.status = "succeeded"
            mark_ingested(db, ledger_item.item_id, ledger_item.doc_id)
            console.print(
                f"[green]✓[/green] {ledger_item.item_id[:12]} → {ledger_item.doc_id}"
            )
        except Exception as exc:
            ledger_item.status = "failed"
            ledger_item.error = str(exc)
            ledger_item.finished_at = datetime.now(timezone.utc).isoformat()
            ledger.completed = False
            ledger.stop_reason = f"failed:{ledger_item.item_id}"
            path = write_batch_ledger(ledger, ledger_dir)
            report_path = write_batch_report(ledger, ledger_dir)
            console.print(Panel(
                f"{manifest_item.url}\n\n{exc}\n\nLedger: {path}",
                title="[red]Batch stopped on first failure[/red]",
            ))
            _act = _next_action(ledger)
            if _act:
                console.print(f"[bold]Next:[/bold] {_act}")
            console.print(f"[dim]Report → {report_path}[/dim]")
            raise typer.Exit(1)
        ledger_item.finished_at = datetime.now(timezone.utc).isoformat()

    ledger.completed = True
    path = write_batch_ledger(ledger, ledger_dir)
    report_path = write_batch_report(ledger, ledger_dir)

    t = Table(title="Batch complete", show_lines=False)
    t.add_column("ID", style="dim", no_wrap=True)
    t.add_column("Status", no_wrap=True)
    t.add_column("Doc ID", style="green", no_wrap=True)
    for item in ledger.items:
        t.add_row(item.item_id[:12], item.status, item.doc_id)
    console.print(t)
    _act = _next_action(ledger)
    if _act:
        console.print(f"[bold]Next:[/bold] {_act}")
    console.print(f"[dim]Ledger written → {path}[/dim]")
    console.print(f"[dim]Report → {report_path}[/dim]")


@app.command(name="offload-export")
def offload_export_cmd(
    doc_ids: List[str] = typer.Argument(
        ...,
        help="One or more corpus doc IDs (bare id or doc- prefixed) to package",
    ),
    package_id: Optional[str] = typer.Option(
        None, "--package-id", help="Explicit package id (default: auto-generated)"
    ),
    offload_root: Optional[Path] = typer.Option(
        None,
        "--offload-root",
        help="Offload root directory (default: <exports_dir>/offload)",
    ),
):
    """Export selected documents into a bounded Mac Studio offload package.

    \b
    Builds a conservative `analysis_package` in <offload_root>/inbox/<package_id>.
    Copies only intake/preprocess/extracted text (+ present optional context) for
    the chosen documents, with SHA-256 hashes and a per-document stage summary.

    \b
    This command is local-only. It never touches source_queue.db, never calls
    Sanity/Supabase, and never calls any LLM/Ollama/LiteLLM. A document is refused
    (and no package is written) unless its required artifacts are present and valid.
    """
    from rich.table import Table
    from .pipeline.offload import build_analysis_package

    config = load_config(require_services=False)
    root = Path(offload_root) if offload_root else (config.exports_dir / "offload")

    try:
        manifest = build_analysis_package(
            corpus_dir=config.corpus_dir,
            doc_ids=list(doc_ids),
            offload_root=root,
            package_id=package_id,
        )
    except (ValueError, FileExistsError) as exc:
        console.print(Panel(str(exc), title="[red]Offload export refused[/red]"))
        raise typer.Exit(1)

    package_dir = root / manifest.lifecycle_state / manifest.package_id
    manifest_path = package_dir / "offload_manifest.json"

    console.print(f"\n[bold]Offload package created[/bold]  [dim]{manifest.package_kind}[/dim]")
    console.print(f"  Package ID:    [cyan]{manifest.package_id}[/cyan]")
    console.print(f"  Lifecycle:     [green]{manifest.lifecycle_state}[/green]")
    console.print(f"  Documents:     {len(manifest.documents)}")
    console.print(f"  Manifest:      [dim]{manifest_path}[/dim]")

    t = Table(title="Source stage summary", show_lines=False)
    t.add_column("doc_id", style="cyan", no_wrap=True)
    t.add_column("type", no_wrap=True)
    t.add_column("quality", no_wrap=True)
    t.add_column("tool", no_wrap=True)
    t.add_column("text", no_wrap=True)
    t.add_column("html", no_wrap=True)
    t.add_column("wayback", no_wrap=True)
    t.add_column("media", no_wrap=True)
    t.add_column("ocr", no_wrap=True)
    for doc in manifest.documents:
        s = doc.source_stage_summary
        t.add_row(
            doc.doc_id[:16],
            str(s.get("source_type") or "-"),
            str(s.get("preprocess_quality") or "-"),
            str(s.get("preprocess_tool") or "-"),
            "yes" if s.get("extracted_text_ready") else "no",
            str(s.get("html_capture_status") or "-"),
            str(s.get("wayback_metadata_status") or "-"),
            str(s.get("media_or_video_context_status") or "-"),
            str(s.get("ocr_status") or "-"),
        )
    console.print(t)
    console.print(
        "[dim]Manual cleanup only — packages are kept until import is verified.[/dim]"
    )


@app.command(name="offload-verify")
def offload_verify_cmd(
    package_dir: Path = typer.Argument(
        ...,
        help="Path to a package directory (…/offload/<state>/<package_id>)",
    ),
):
    """Read-only integrity check of an offload package.

    \b
    Verifies the manifest loads, the lifecycle folder matches the manifest state,
    every present artifact still exists, and every SHA-256 still matches. Reports
    missing/mismatched artifacts and the per-document source-stage summary.

    \b
    This command never repairs, moves, or deletes anything, and never calls any
    service. It exits non-zero on any missing/mismatched artifact, lifecycle
    mismatch, or corrupt/missing manifest.
    """
    from rich.table import Table
    from .pipeline.offload import verify_package

    report = verify_package(package_dir)

    console.print(f"\n[bold]Offload package verify[/bold]  [dim]{report['package_dir']}[/dim]")
    if report["package_id"]:
        console.print(f"  Package ID: [cyan]{report['package_id']}[/cyan]")

    if report["errors"]:
        console.print(Panel("\n".join(report["errors"]), title="[red]Manifest errors[/red]"))
        raise typer.Exit(1)

    life = report["lifecycle"] or {}
    if life.get("consistent"):
        console.print(
            f"  Lifecycle:  [green]consistent[/green] "
            f"([dim]{life.get('folder_state')} == {life.get('manifest_state')}[/dim])"
        )
    else:
        console.print(
            f"  Lifecycle:  [red]MISMATCH[/red] "
            f"(folder=[yellow]{life.get('folder_state')}[/yellow] "
            f"manifest=[yellow]{life.get('manifest_state')}[/yellow])"
        )

    if report["documents"]:
        t = Table(title="Source stage summary", show_lines=False)
        t.add_column("doc_id", style="cyan", no_wrap=True)
        t.add_column("verified", justify="right", no_wrap=True)
        t.add_column("type", no_wrap=True)
        t.add_column("text", no_wrap=True)
        t.add_column("html", no_wrap=True)
        t.add_column("wayback", no_wrap=True)
        t.add_column("media", no_wrap=True)
        for doc in report["documents"]:
            s = doc.get("source_stage_summary") or {}
            t.add_row(
                str(doc["doc_id"])[:16],
                str(doc.get("verified_artifacts", 0)),
                str(s.get("source_type") or "-"),
                "yes" if s.get("extracted_text_ready") else "no",
                str(s.get("html_capture_status") or "-"),
                str(s.get("wayback_metadata_status") or "-"),
                str(s.get("media_or_video_context_status") or "-"),
            )
        console.print(t)

    for entry in report["missing_artifacts"]:
        console.print(
            f"[red]✗ missing[/red] {entry['doc_id']}: {entry['relative_path']} ({entry['label']})"
        )
    for entry in report["mismatched_artifacts"]:
        console.print(
            f"[red]✗ hash mismatch[/red] {entry['doc_id']}: {entry['relative_path']} "
            f"[dim](expected {entry['expected_sha256'][:12]}…, got {entry['actual_sha256'][:12]}…)[/dim]"
        )

    if report["ok"]:
        console.print("[green]✓ Package verified — all artifacts present and hashes match.[/green]")
    else:
        console.print("[red]✗ Package verification failed.[/red]")
        raise typer.Exit(1)


@app.command(name="offload-move")
def offload_move_cmd(
    package_dir: Path = typer.Argument(
        ...,
        help="Path to a package directory (…/offload/<state>/<package_id>)",
    ),
    to: str = typer.Option(
        ...,
        "--to",
        help="Target lifecycle state: inbox | processing | outbox | imported | failed | archive",
    ),
    no_verify: bool = typer.Option(
        False,
        "--no-verify",
        help="[DANGER] Skip integrity verification before a forward move. Ignored for failed/archive.",
    ),
):
    """Move an offload package to another lifecycle state, enforcing the transition graph.

    \b
    The from-state is inferred from the package path. Forward transitions verify
    the package first (hashes, artifacts, lifecycle consistency) and refuse on
    failure; moves into failed/archive always succeed so a broken package can be
    quarantined. Local-only: no queue, Sanity/Supabase, or LLM calls.
    """
    from .pipeline.offload import transition_package_state

    pkg = Path(package_dir)
    from_state = pkg.parent.name
    package_id = pkg.name
    offload_root = pkg.parent.parent

    try:
        new_path = transition_package_state(
            offload_root=offload_root,
            package_id=package_id,
            from_state=from_state,
            to_state=to,
            verify=not no_verify,
        )
    except (ValueError, FileNotFoundError, FileExistsError) as exc:
        console.print(Panel(str(exc), title="[red]Offload move refused[/red]"))
        raise typer.Exit(1)

    console.print(
        f"[green]✓ Moved[/green] [cyan]{package_id}[/cyan]: "
        f"{from_state} → [green]{to}[/green]"
    )
    console.print(f"  New location: [dim]{new_path}[/dim]")


@app.command(name="offload-import")
def offload_import_cmd(
    package_dir: Path = typer.Argument(
        ...,
        help="Path to a returned package in outbox (…/offload/outbox/<package_id>)",
    ),
    corpus_root: Optional[Path] = typer.Option(
        None,
        "--corpus-root",
        help="Corpus directory to import into (default: configured CORPUS_DIR)",
    ),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        help="Verify and report what would be imported, without writing anything.",
    ),
):
    """Import a worker-returned offload package's outputs into the local corpus.

    \b
    Validate-all-before-copy: verifies the result manifest, expected doc IDs,
    allowed artifacts, in-package paths, SHA-256 hashes, and schemas. Only on full
    success are allowed artifacts written into the corpus (existing files backed up
    to <artifact>.preimport-<ts>) with an offload_import.json provenance sidecar,
    after which the package is moved outbox → imported. On any failure the corpus
    is left untouched and the package is not marked imported. Never touches
    source_queue.db, Sanity/Supabase, or any model.
    """
    from .pipeline.offload import import_result_package, transition_package_state

    config = load_config(require_services=False)
    corpus_dir = Path(corpus_root) if corpus_root else config.corpus_dir
    pkg = Path(package_dir)

    summary = import_result_package(pkg, corpus_dir=corpus_dir, dry_run=dry_run)

    console.print(f"\n[bold]Offload import[/bold]  [dim]{summary['package_dir']}[/dim]")
    if summary["package_id"]:
        console.print(f"  Package ID: [cyan]{summary['package_id']}[/cyan]")

    if not summary["ok"]:
        console.print(Panel("\n".join(summary["errors"]) or "validation failed",
                            title="[red]Import refused — corpus untouched[/red]"))
        raise typer.Exit(1)

    if dry_run:
        for doc in summary["documents"]:
            console.print(
                f"  [yellow]would import[/yellow] {doc['doc_id']}: "
                f"{', '.join(doc['would_write'])}"
            )
        console.print("[dim]Dry run — nothing was written and the package was not moved.[/dim]")
        return

    for doc in summary["documents"]:
        backups = f" (backed up: {', '.join(doc['backups'])})" if doc["backups"] else ""
        console.print(
            f"  [green]✓ imported[/green] {doc['doc_id']}: "
            f"{', '.join(doc['written'])}{backups}"
        )

    # Mark the package imported only after a fully successful corpus write.
    pkg_path = Path(summary["package_dir"])
    try:
        new_path = transition_package_state(
            offload_root=pkg_path.parent.parent,
            package_id=pkg_path.name,
            from_state=pkg_path.parent.name,
            to_state="imported",
            verify=False,  # corpus already written; package contents unchanged
        )
        console.print(f"[green]✓ Package marked imported[/green] [dim]{new_path}[/dim]")
    except (ValueError, FileNotFoundError, FileExistsError) as exc:
        console.print(Panel(
            f"Artifacts were imported into the corpus, but the package could not be "
            f"moved to 'imported':\n{exc}\n\nMove it manually with offload-move once resolved.",
            title="[yellow]Imported, but package not marked[/yellow]",
        ))
        raise typer.Exit(1)


@app.command(name="offload-worker")
def offload_worker_cmd(
    package_dir: Path = typer.Argument(
        ...,
        help="Path to an inbox package (…/offload/inbox/<package_id>)",
    ),
    llm: str = typer.Option(
        "litelm",
        "--llm",
        help="Analysis/enrichment route: litelm | litelm-heavy | litelm-reasoning | local | …",
    ),
    enrich_model: Optional[str] = typer.Option(
        None, "--enrich-model", help="LiteLLM model alias for Stage 3c enrichment (e.g. core-gemma)",
    ),
):
    """Process one inbox offload package on this (Mac Studio) node.

    \b
    Claims the package (inbox → processing), runs analysis/enrichment/embedding
    per document against the local LiteLLM/Ollama stack, unloads each heavy model
    between stages, writes the allowed result artifacts + result_manifest, then
    moves the package to outbox on full success or failed on any failure.

    \b
    Package-only I/O: never reads/writes the live corpus, source_queue.db,
    Sanity, or Supabase, and never fetches/parses/OCRs/transcribes — it consumes
    only already-prepared package artifacts. A single PID worker lock prevents
    concurrent heavy model loads.
    """
    from .pipeline.offload_worker import run_offload_worker

    config = load_config(require_services=False)

    try:
        summary = run_offload_worker(
            package_dir, config, llm=llm, enrich_model=enrich_model,
        )
    except RuntimeError as exc:  # worker lock held by another process
        console.print(Panel(str(exc), title="[red]Worker not started[/red]"))
        raise typer.Exit(1)

    console.print(f"\n[bold]Offload worker[/bold]  [dim]{summary['package_dir']}[/dim]")
    console.print(f"  Package ID: [cyan]{summary['package_id']}[/cyan]")
    console.print(f"  Final state: {summary['final_state']}")
    for doc in summary["documents"]:
        icon = "[green]✓[/green]" if doc.get("status") == "succeeded" else "[red]✗[/red]"
        err = f"  [dim]{doc['error']}[/dim]" if doc.get("error") else ""
        console.print(f"  {icon} {doc['doc_id']}{err}")

    if summary["ok"]:
        if summary.get("partial"):
            console.print(
                f"[yellow]✓ Worker partial — package moved to outbox "
                f"({summary.get('succeeded_count', 0)} succeeded, "
                f"{summary.get('failed_count', 0)} failed).[/yellow]"
            )
        else:
            console.print(
                f"[green]✓ Worker complete — package moved to outbox "
                f"({len(summary['documents'])} doc(s)).[/green]"
            )
    else:
        if summary["errors"]:
            console.print(Panel("\n".join(summary["errors"]), title="[red]Worker failed[/red]"))
        console.print(
            f"[red]✗ Worker failed — package in {summary['final_state']}. "
            f"See worker_report.json.[/red]"
        )
        raise typer.Exit(1)


@app.command(name="source-offload-export")
def source_offload_export_cmd(
    queue_id: List[str] = typer.Option(
        [], "--queue-id", help="Source Queue item ID(s) to package (read-only; queue is not mutated)",
    ),
    file: List[Path] = typer.Option(
        [], "--file", help="Local source file(s) to copy into the package",
    ),
    url: List[str] = typer.Option(
        [], "--url", help="Ad-hoc URL(s) to package as url items (not fetched)",
    ),
    queue_snapshot: List[str] = typer.Option(
        [],
        "--queue-snapshot",
        help=(
            "Attach a browser-saved snapshot to a queue item: 'QID:/path/to/saved.html'. "
            "Packages the saved FILE (so the Mac Studio processes the snapshot, not the "
            "blocked URL) while preserving the original source URL + queue metadata. "
            "Use for Cloudflare/challenge/dynamic pages."
        ),
    ),
    package_id: Optional[str] = typer.Option(
        None, "--package-id", help="Explicit package id (default: auto-generated)",
    ),
    source_offload_root: Optional[Path] = typer.Option(
        None,
        "--source-offload-root",
        help="Source offload root directory (default: <exports_dir>/source_offload)",
    ),
):
    """Build a Mac Studio *source* package from queue items / files / URLs (Slice S1).

    \b
    Packages raw source material (not extracted text) so the Mac Studio can run
    the full pipeline later (S2). Builds a `source_package` in
    <source_offload_root>/inbox/<package_id>:
      - URL items store URL + queue metadata only (no fetch, no blob)
      - local files are copied in with SHA-256 + byte size recorded

    \b
    Local-only and side-effect-free: it never fetches a URL, never calls a model,
    Sanity, or Supabase, never writes the live corpus, and never mutates
    source_queue.db (queue items are read only). A bad input (unsafe id, missing
    file, invalid URL, duplicate doc) is refused and no package is written.
    """
    from rich.table import Table
    from .pipeline import intake as intake_mod
    from .pipeline.offload_source import (
        SourceItemSpec, build_snapshot_spec, build_source_package,
    )

    if not queue_id and not file and not url and not queue_snapshot:
        console.print(
            Panel(
                "Provide at least one of --queue-id, --queue-snapshot, --file, or --url.",
                title="[red]Nothing to export[/red]",
            )
        )
        raise typer.Exit(1)

    config = load_config(require_services=False)
    root = Path(source_offload_root) if source_offload_root else (config.exports_dir / "source_offload")

    specs: list[SourceItemSpec] = []

    # Source Queue items (read-only) — plain URL items and saved-snapshot items.
    if queue_id or queue_snapshot:
        from .pipeline.source_queue import open_db, queue_db_path, get_item

        db = open_db(queue_db_path(config.corpus_dir))
        try:
            for qid in queue_id:
                item = get_item(db, qid)
                if item is None:
                    console.print(Panel(f"Queue item not found: {qid}", title="[red]Export refused[/red]"))
                    raise typer.Exit(1)
                specs.append(
                    SourceItemSpec(
                        source_kind="url",
                        declared_source_type=intake_mod._detect_source_type(item.url),
                        url=item.url,
                        queue_item_id=item.id,
                        url_hash=item.url_hash,
                        title=item.title,
                        notes=item.notes,
                        priority=item.priority,
                        recommended_llm=item.recommended_llm,
                        overnight_batch_safe=item.overnight_batch_safe,
                        tags=item.tags,
                        doc_type_hint=item.doc_type_hint,
                        suggested_process_route=item.suggested_process_route,
                    )
                )

            # Browser-saved snapshots attached to queue items: 'QID:/path/to/file'.
            for mapping in queue_snapshot:
                qid, sep, raw_path = mapping.partition(":")
                qid = qid.strip()
                raw_path = raw_path.strip()
                if not qid or not sep or not raw_path:
                    console.print(Panel(
                        f"Invalid --queue-snapshot {mapping!r}. "
                        "Expected 'QID:/path/to/saved.html'.",
                        title="[red]Export refused[/red]"))
                    raise typer.Exit(1)
                snap = Path(raw_path).expanduser()
                if not snap.is_file():
                    console.print(Panel(
                        f"Snapshot file not found for {qid}: {snap}",
                        title="[red]Export refused[/red]"))
                    raise typer.Exit(1)
                item = get_item(db, qid)
                if item is None:
                    console.print(Panel(f"Queue item not found: {qid}", title="[red]Export refused[/red]"))
                    raise typer.Exit(1)
                specs.append(build_snapshot_spec(
                    queue_item=item,
                    snapshot_path=str(snap),
                    declared_source_type=intake_mod._detect_source_type(str(snap)),
                ))
        finally:
            db.close()

    # Ad-hoc URLs.
    for u in url:
        specs.append(
            SourceItemSpec(
                source_kind="url",
                declared_source_type=intake_mod._detect_source_type(u),
                url=u,
            )
        )

    # Local files.
    for f in file:
        specs.append(
            SourceItemSpec(
                source_kind="file",
                declared_source_type=intake_mod._detect_source_type(str(f)),
                file_path=str(f),
            )
        )

    try:
        manifest = build_source_package(
            specs=specs,
            source_offload_root=root,
            package_id=package_id,
        )
    except (ValueError, FileNotFoundError, FileExistsError) as exc:
        console.print(Panel(str(exc), title="[red]Source offload export refused[/red]"))
        raise typer.Exit(1)

    package_dir = root / manifest.lifecycle_state / manifest.package_id
    manifest_path = package_dir / "source_manifest.json"

    console.print(f"\n[bold]Source package created[/bold]  [dim]{manifest.package_kind}[/dim]")
    console.print(f"  Package ID:    [cyan]{manifest.package_id}[/cyan]")
    console.print(f"  Lifecycle:     [green]{manifest.lifecycle_state}[/green]")
    console.print(f"  Items:         {len(manifest.items)}")
    console.print(f"  Manifest:      [dim]{manifest_path}[/dim]")

    t = Table(title="Source items", show_lines=False)
    t.add_column("doc_id", style="cyan", no_wrap=True)
    t.add_column("kind", no_wrap=True)
    t.add_column("type", no_wrap=True)
    t.add_column("queue id", no_wrap=True)
    t.add_column("bytes", justify="right", no_wrap=True)
    t.add_column("url / blob", no_wrap=False)
    for it in manifest.items:
        t.add_row(
            it.doc_id[:16],
            it.source_kind,
            it.declared_source_type,
            (it.queue_item_id or "-")[:16],
            str(it.bytes) if it.source_kind == "file" else "-",
            it.url if it.source_kind == "url" else it.relative_path,
        )
    console.print(t)
    console.print(
        "[dim]Manual cleanup only — keep package until import is verified. "
        "Source files may be private; store owner-only.[/dim]"
    )


@app.command(name="source-offload-verify")
def source_offload_verify_cmd(
    package_dir: Path = typer.Argument(
        ...,
        help="Path to a source package directory (…/source_offload/<state>/<package_id>)",
    ),
):
    """Read-only integrity check of a source package (Slice S1).

    \b
    Verifies the manifest loads, schema/kind match, lifecycle is consistent,
    doc IDs and manifest paths are safe, each source_item.json + file blob exists
    with matching SHA-256/bytes, URL items carry valid URL metadata, item
    coverage is exact, and no unexpected files are present. Never repairs, moves,
    or deletes anything, and calls no service. Exits non-zero on any problem.
    """
    from .pipeline.offload_source import verify_source_inputs, verify_source_package

    report = verify_source_package(package_dir)
    input_report = verify_source_inputs(package_dir)

    console.print(f"\n[bold]Source package verify[/bold]  [dim]{report['package_dir']}[/dim]")
    if report["package_id"]:
        console.print(f"  Package ID: [cyan]{report['package_id']}[/cyan]")

    life = report["lifecycle"]
    if life is not None:
        if life.get("consistent"):
            console.print(
                f"  Lifecycle:  [green]consistent[/green] "
                f"([dim]{life.get('folder_state')} == {life.get('manifest_state')}[/dim])"
            )
        else:
            console.print(
                f"  Lifecycle:  [red]MISMATCH[/red] "
                f"(folder=[yellow]{life.get('folder_state')}[/yellow] "
                f"manifest=[yellow]{life.get('manifest_state')}[/yellow])"
            )

    for item in report["items"]:
        icon = "[green]✓[/green]" if item.get("verified") else "[red]✗[/red]"
        console.print(f"  {icon} {item['doc_id'][:16]} [dim]({item.get('source_kind')})[/dim]")

    if report["errors"]:
        console.print(Panel("\n".join(report["errors"]), title="[red]Verification errors[/red]"))
    if report["unexpected"]:
        console.print(
            Panel("\n".join(report["unexpected"]), title="[yellow]Unexpected files (surfaced)[/yellow]")
        )

    if report["ok"]:
        console.print("[green]✓ Source package verified — items, hashes, and coverage all match.[/green]")
    elif input_report["ok"]:
        console.print(
            "[yellow]Strict verification found worker-owned retry artifacts, but "
            "source inputs verified. The source worker will clean stale outputs at claim time.[/yellow]"
        )
    else:
        console.print("[red]✗ Source package verification failed.[/red]")
        raise typer.Exit(1)


@app.command(name="source-offload-archive")
def source_offload_archive_cmd(
    package_dir: Path = typer.Argument(
        ...,
        help="Path to a source package directory (…/source_offload/<state>/<package_id>)",
    ),
    output_dir: Optional[Path] = typer.Option(
        None, "--output-dir",
        help="Where to write <package_id>.tar.gz + .sha256 (default: the package's parent state dir)",
    ),
):
    """Pack a lifecycle package into one .tar.gz + .sha256 for manual transfer (Slice D).

    \b
    Produces <package_id>.tar.gz (contents under a single <package_id>/ folder)
    plus a <package_id>.tar.gz.sha256 sidecar. Move the single archive + sidecar
    through an iCloud shared folder / AirDrop / external drive — never the live
    package tree (partial sync corrupts it). The original package is never
    deleted; a non-quarantine package must carry a valid source_manifest.json.
    """
    from .pipeline.offload_source import archive_source_package

    try:
        res = archive_source_package(package_dir, output_dir=output_dir)
    except (FileNotFoundError, FileExistsError, ValueError) as exc:
        console.print(Panel(str(exc), title="[red]Archive refused[/red]"))
        raise typer.Exit(1)

    console.print(f"\n[bold]Source package archived[/bold]  [dim]{res['folder_state']}[/dim]")
    console.print(f"  Package ID: [cyan]{res['package_id']}[/cyan]")
    console.print(f"  Archive:    [dim]{res['archive_path']}[/dim]")
    console.print(f"  Checksum:   [dim]{res['sha256_path']}[/dim]")
    console.print(f"  SHA-256:    {res['sha256']}")
    console.print(f"  Bytes:      {res['bytes']}")
    for w in res["warnings"]:
        console.print(f"  [yellow]⚠ {w}[/yellow]")
    console.print(
        "[green]✓ Archive written. Move BOTH the .tar.gz and .sha256; unpack on "
        "the other machine with `source-offload-unpack`.[/green]"
    )


@app.command(name="source-offload-unpack")
def source_offload_unpack_cmd(
    archive: Path = typer.Argument(
        ..., help="Path to a <package_id>.tar.gz produced by source-offload-archive",
    ),
    source_offload_root: Path = typer.Option(
        ..., "--source-offload-root",
        help="Destination source offload root (…/source_offload)",
    ),
    state: Optional[str] = typer.Option(
        None, "--state",
        help="Lifecycle folder to unpack into (default: the archive's manifest state, e.g. inbox/outbox)",
    ),
):
    """Verify + extract a transferred package archive into a lifecycle folder (Slice D).

    \b
    Verifies the SHA-256 sidecar and archive shape (single safe top-level package
    dir, source_manifest.json present, no traversal/absolute/symlink members)
    before extracting. Refuses to overwrite an existing lifecycle package,
    reconciles the manifest lifecycle_state to the destination, and verifies
    package shape after unpack. The archive is never deleted.
    """
    from .pipeline.offload_source import unpack_source_archive

    try:
        res = unpack_source_archive(archive, source_offload_root=source_offload_root, state=state)
    except (FileNotFoundError, FileExistsError, ValueError) as exc:
        console.print(Panel(str(exc), title="[red]Unpack refused[/red]"))
        raise typer.Exit(1)

    verify = res["verify"]
    console.print(f"\n[bold]Source package unpacked[/bold]  [dim]{res['state']}[/dim]")
    console.print(f"  Package ID: [cyan]{res['package_id']}[/cyan]")
    console.print(f"  Path:       [dim]{res['package_dir']}[/dim]")
    if verify.get("ok"):
        console.print("[green]✓ Unpacked and verified — manifest, items, and hashes match.[/green]")
    else:
        for e in verify.get("errors", []):
            console.print(f"  [red]✗ {e}[/red]")
        for u in verify.get("unexpected", []):
            console.print(f"  [yellow]⚠ unexpected: {u}[/yellow]")
        console.print("[red]✗ Unpacked but post-unpack verification failed.[/red]")
        raise typer.Exit(1)


@app.command(name="source-worker")
def source_worker_cmd(
    package_dir: Path = typer.Argument(
        ...,
        help="Path to an inbox source package (…/source_offload/inbox/<package_id>)",
    ),
    llm: str = typer.Option(
        "litelm",
        "--llm",
        help="Analysis/enrichment route: litelm | litelm-heavy | litelm-reasoning | local | …",
    ),
    enrich_model: Optional[str] = typer.Option(
        None, "--enrich-model", help="LiteLLM model alias for Stage 3c enrichment (e.g. core-gemma)",
    ),
):
    """Process one inbox source package end-to-end on this (Mac Studio) node (Slice S2).

    \b
    Verifies the source inputs, claims the package (inbox → processing), and for
    every item runs the full pipeline (intake → preprocess → analysis →
    enrichment → embedding) against a package-local staging corpus
    (<package>/docs/<doc_id>/), unloading each heavy model between stages. On full
    success it writes complete corpus-style document folders, per-doc + root
    worker_report.json, and an `ingest_result` result_manifest.json, then moves
    the package to outbox; on any failure it writes the root worker_report.json
    and moves the package to failed.

    \b
    Never reads/writes the live corpus (corpus_dir points inside the package),
    never writes source_queue.db / Sanity / Supabase, and never auto-deletes. A
    single PID worker lock prevents concurrent heavy model loads.
    """
    from .pipeline.source_worker import run_source_worker

    config = load_config(require_services=False)

    try:
        summary = run_source_worker(
            package_dir, config, llm=llm, enrich_model=enrich_model,
        )
    except RuntimeError as exc:  # worker lock held by another process
        console.print(Panel(str(exc), title="[red]Worker not started[/red]"))
        raise typer.Exit(1)

    console.print(f"\n[bold]Source worker[/bold]  [dim]{summary['package_dir']}[/dim]")
    console.print(f"  Package ID:  [cyan]{summary['package_id']}[/cyan]")
    console.print(f"  Kind:        {summary['package_kind']}")
    console.print(f"  Final state: {summary['final_state']}")
    for doc in summary["documents"]:
        icon = "[green]✓[/green]" if doc.get("status") == "succeeded" else "[red]✗[/red]"
        err = f"  [dim]{doc['error']}[/dim]" if doc.get("error") else ""
        console.print(f"  {icon} {doc['doc_id']}{err}")

    if summary["ok"]:
        console.print(
            f"[green]✓ Worker complete — package moved to outbox "
            f"({len(summary['documents'])} doc(s)).[/green]"
        )
    else:
        if summary["errors"]:
            console.print(Panel("\n".join(summary["errors"]), title="[red]Worker failed[/red]"))
        console.print(
            f"[red]✗ Worker failed — package in {summary['final_state']}. "
            f"See worker_report.json.[/red]"
        )
        raise typer.Exit(1)


@app.command(name="source-offload-import")
def source_offload_import_cmd(
    package_dir: Path = typer.Argument(
        ...,
        help="Path to a returned source package in outbox (…/source_offload/outbox/<package_id>)",
    ),
    corpus_root: Optional[Path] = typer.Option(
        None, "--corpus-root", help="Corpus directory to import into (default: configured CORPUS_DIR)",
    ),
    dry_run: bool = typer.Option(
        False, "--dry-run", help="Verify and report what would be imported, writing nothing.",
    ),
    force: bool = typer.Option(
        False, "--force", help="Overwrite even researcher-reviewed/edited corpus docs (backed up first).",
    ),
):
    """Import a returned `ingest_result` source package into the live corpus (Slice S3).

    \b
    Validate-all-before-copy: verifies schema/kind/outbox lifecycle, exact document
    coverage, safe canonical paths, SHA-256/bytes, the allowed artifact set (incl.
    the copied original), no unexpected files, and core-artifact schemas. Only on
    full success are complete corpus-style document folders written into the corpus
    (existing files backed up to <label>.preimport-<ts>) with an offload_import.json
    provenance sidecar. Researcher-reviewed/edited docs are refused unless --force.

    \b
    After a successful corpus write the source queue is relinked (mark_ingested,
    preferring queue_item_id then url_hash) and the package is moved outbox →
    imported. Queue is never written before corpus success, and a relink failure is
    reported without rolling back the corpus (the corpus import is the source of
    truth). Never calls Sanity/Supabase and never auto-deletes.
    """
    from .pipeline.offload_source import (
        import_ingest_result, ingest_result_linkages, move_source_package_state,
    )

    config = load_config(require_services=False)
    corpus_dir = Path(corpus_root) if corpus_root else config.corpus_dir
    pkg = Path(package_dir)

    summary = import_ingest_result(pkg, corpus_dir=corpus_dir, dry_run=dry_run, force=force)

    console.print(f"\n[bold]Source import[/bold]  [dim]{summary['package_dir']}[/dim]")
    if summary["package_id"]:
        console.print(f"  Package ID: [cyan]{summary['package_id']}[/cyan]")
    if summary.get("partial"):
        omitted = ", ".join(summary.get("omitted_doc_ids") or [])
        console.print(
            f"  [yellow]Partial result:[/yellow] importing completed docs only"
            + (f"; failed/omitted docs: {omitted}" if omitted else "")
        )

    if not summary["ok"]:
        title = "[red]Import refused — corpus untouched[/red]"
        if summary["reviewed_blocked"]:
            title = "[red]Import refused — reviewed docs (use --force)[/red]"
        console.print(Panel("\n".join(summary["errors"]) or "validation failed", title=title))
        raise typer.Exit(1)

    if dry_run:
        for doc in summary["documents"]:
            console.print(
                f"  [yellow]would import[/yellow] {doc['doc_id']}: {', '.join(doc['would_write'])}"
            )
        console.print("[dim]Dry run — nothing written, queue untouched, package not moved.[/dim]")
        return

    for doc in summary["documents"]:
        backups = f" (backed up: {', '.join(doc['backups'])})" if doc["backups"] else ""
        console.print(
            f"  [green]✓ imported[/green] {doc['doc_id']}: {', '.join(doc['written'])}{backups}"
        )

    # ── Queue relink (only after a fully successful corpus write) ──
    pkg_path = Path(summary["package_dir"])
    try:
        from .pipeline.source_queue import open_db, queue_db_path, mark_ingested

        db = open_db(queue_db_path(config.corpus_dir))
        try:
            for link in ingest_result_linkages(pkg_path):
                doc_id = link["doc_id"]
                item_id = link["queue_item_id"]
                via = "queue_item_id"
                if not item_id and link["url_hash"]:
                    row = db.execute(
                        "SELECT id FROM source_queue WHERE url_hash = ?", (link["url_hash"],)
                    ).fetchone()
                    if row:
                        item_id = row["id"]
                        via = "url_hash"
                if item_id and mark_ingested(db, item_id, doc_id):
                    console.print(f"  [green]↳ queue relinked[/green] {doc_id} → {item_id} [dim]({via})[/dim]")
                else:
                    console.print(f"  [dim]↳ no queue row for {doc_id} (ad-hoc item)[/dim]")
        finally:
            db.close()
    except Exception as exc:  # noqa: BLE001 — corpus is source of truth; do not roll back
        console.print(Panel(
            f"Corpus import succeeded, but source-queue relink failed:\n{exc}\n\n"
            "The corpus is the source of truth — relink manually if needed.",
            title="[yellow]Imported, queue relink failed[/yellow]",
        ))

    # ── Move outbox → imported ──
    try:
        new_path = move_source_package_state(
            offload_root=pkg_path.parent.parent, package_id=pkg_path.name,
            from_state=pkg_path.parent.name, to_state="imported",
        )
        console.print(f"[green]✓ Package marked imported[/green] [dim]{new_path}[/dim]")
    except (ValueError, FileNotFoundError, FileExistsError) as exc:
        console.print(Panel(
            f"Artifacts were imported into the corpus, but the package could not be "
            f"moved to 'imported':\n{exc}\n\nMove it manually once resolved.",
            title="[yellow]Imported, but package not marked[/yellow]",
        ))
        raise typer.Exit(1)


@app.command(name="export")
def export_batch(
    batch_id: str = typer.Argument(..., help="Batch ID to export"),
):
    """Export all documents in a batch as JSON to exports/{batch_id}/."""
    config = load_config()
    upload.export_batch(batch_id, config)


@app.command(name="export-csv")
def export_csv_cmd(
    batch_id: str = typer.Argument("", help="Batch ID to export (omit for all documents)"),
    out: str = typer.Option("", "--out", help="Output CSV path (default: exports/{batch_id|all}/...)"),
):
    """Export corpus as a flat CSV for analysis in R, SPSS, or Excel."""
    config = load_config(llm=None, require_services=False)
    out_path = Path(out) if out else None
    upload.export_corpus_csv(config, batch_id=batch_id, out_path=out_path)


@app.command(name="archive-summary-build")
def archive_summary_build_cmd(
    doc_id: str = typer.Argument("", help="Document ID to summarize (omit for all corpus docs)"),
    corpus_root: str = typer.Option("", "--corpus-root", help="Override corpus directory"),
):
    """Build regenerable per-document archive_summary.json profiles (KG-0)."""
    config = load_config(llm=None, require_services=False)
    corpus_dir = Path(corpus_root).expanduser() if corpus_root else config.corpus_dir
    if doc_id:
        doc_dir = corpus_dir / doc_id
        if not doc_dir.is_dir():
            console.print(Panel(str(doc_dir), title="[red]Document folder not found[/red]"))
            raise typer.Exit(1)
        out = archive_summary.write_archive_summary(doc_dir, config=config)
        summary = archive_summary.read_json_safe(out, {})
        console.print(f"[green]✓ Archive summary written[/green] [dim]{out}[/dim]")
        console.print(
            f"  doc_id={summary.get('doc_id')}  "
            f"trust_state={summary.get('trust_state')}  "
            f"readiness={summary.get('readiness', {}).get('status', '')}"
        )
        return

    summaries = archive_summary.build_corpus_archive_summaries(
        corpus_dir,
        config=config,
        write=True,
    )
    console.print(
        f"[green]✓ Archive summaries written[/green] "
        f"{len(summaries)} document(s) in [dim]{corpus_dir}[/dim]"
    )


@app.command(name="archive-summary-export")
def archive_summary_export_cmd(
    out: str = typer.Option("", "--out", help="Output JSONL path (default: exports/knowledge/document_profiles.jsonl)"),
    corpus_root: str = typer.Option("", "--corpus-root", help="Override corpus directory"),
    refresh_sidecars: bool = typer.Option(False, "--refresh-sidecars", help="Also write archive_summary.json beside each document"),
):
    """Export central document_profiles.jsonl from local corpus artifacts (KG-0)."""
    config = load_config(llm=None, require_services=False)
    corpus_dir = Path(corpus_root).expanduser() if corpus_root else config.corpus_dir
    out_path = Path(out).expanduser() if out else None
    result = archive_summary.export_document_profiles(
        corpus_dir,
        config.exports_dir,
        config=config,
        out_path=out_path,
        write_doc_summaries=refresh_sidecars,
    )
    console.print(
        f"[green]✓ Document profiles exported[/green] "
        f"{result['count']} document(s) → [dim]{result['path']}[/dim]"
    )
    if refresh_sidecars:
        console.print("[dim]Per-document archive_summary.json sidecars refreshed.[/dim]")


@app.command(name="knowledge-graph-export")
def knowledge_graph_export_cmd(
    out_dir: str = typer.Option("", "--out-dir", help="Output directory (default: exports/knowledge)"),
    corpus_root: str = typer.Option("", "--corpus-root", help="Override corpus directory"),
    include_proposed: bool = typer.Option(False, "--include-proposed", help="Include model-proposed/unreviewed edges"),
):
    """Export KG-1 evidence graph CSV/JSON files from local corpus artifacts."""
    config = load_config(llm=None, require_services=False)
    corpus_dir = Path(corpus_root).expanduser() if corpus_root else config.corpus_dir
    out_path = Path(out_dir).expanduser() if out_dir else None
    result = knowledge_graph.export_knowledge_graph(
        corpus_dir,
        config.exports_dir,
        config=config,
        out_dir=out_path,
        include_proposed=include_proposed,
    )
    console.print(
        f"[green]✓ Knowledge graph exported[/green] "
        f"{result['node_count']} node(s), {result['edge_count']} edge(s)"
    )
    console.print(f"  Nodes: [dim]{result['nodes_path']}[/dim]")
    console.print(f"  Edges: [dim]{result['edges_path']}[/dim]")
    console.print(f"  Graph: [dim]{result['graph_path']}[/dim]")
    if include_proposed:
        console.print("[yellow]Included model-proposed/unreviewed edges. Treat as discovery material, not reviewed evidence.[/yellow]")


@app.command(name="system-health")
def system_health_cmd(
    json_output: bool = typer.Option(False, "--json", help="Print the full machine-readable health report"),
    mac_studio: bool = typer.Option(False, "--mac-studio", help="Use Mac Studio default transfer paths"),
    source_offload_root: str = typer.Option("", "--source-offload-root", help="Override source-offload lifecycle root"),
    transfer_root: str = typer.Option("", "--transfer-root", help="Override shared transfer root"),
):
    """Summarize local corpus/offload/transfer/KG state without mutating anything."""
    config = load_config(llm=None, require_services=False)
    report = system_health.build_system_health(
        config,
        mac_studio=mac_studio,
        source_offload_root=Path(source_offload_root).expanduser() if source_offload_root else None,
        transfer_root=Path(transfer_root).expanduser() if transfer_root else None,
    )
    if json_output:
        console.print_json(data=report)
        return

    status = report.get("status", "unknown")
    colour = "green" if status == "ready" else "yellow" if status == "needs_attention" else "red"
    console.print(Panel(status, title=f"[{colour}]System health[/{colour}]"))

    for title, key, style in (
        ("Blockers", "blockers", "red"),
        ("Next actions", "actions", "yellow"),
        ("Notes", "notes", "cyan"),
    ):
        items = report.get(key) or []
        if not items:
            continue
        console.print(f"\n[bold]{title}[/bold]")
        for item in items:
            console.print(f"  [{style}]•[/{style}] {item}")

    from rich.table import Table as RichTable

    table = RichTable(title="Local state", show_lines=False)
    table.add_column("Area")
    table.add_column("Metric")
    table.add_column("Value", justify="right")
    corpus = report.get("corpus", {})
    source = report.get("source_offload", {})
    transfer = report.get("transfer", {})
    knowledge = report.get("knowledge", {})
    rows = [
        ("Corpus", "documents", corpus.get("documents", 0)),
        ("Corpus", "pending upload", corpus.get("pending_upload", 0)),
        ("Corpus", "pending enrichment proposals", corpus.get("pending_enrichment_proposals", 0)),
        ("Source offload", "failed packages", source.get("failed_count", 0)),
        ("Source offload", "folder/manifest drift", source.get("inconsistent_count", 0)),
        ("Transfer", "incoming archives", transfer.get("incoming_archive_count", 0)),
        ("Transfer", "returned archives", transfer.get("returned_archive_count", 0)),
        ("Knowledge", "document profiles", knowledge.get("document_profiles_count", 0)),
        ("Knowledge", "graph nodes", knowledge.get("node_count", 0)),
        ("Knowledge", "graph edges", knowledge.get("edge_count", 0)),
    ]
    for area, metric, value in rows:
        table.add_row(area, metric, str(value))
    console.print(table)

    def _clip(value, limit: int = 88) -> str:
        text = str(value or "")
        return text if len(text) <= limit else text[: limit - 1] + "…"

    failed_rows = []
    for pkg in source.get("failed_reports") or []:
        for doc in pkg.get("docs") or []:
            failed_rows.append({
                "package": pkg.get("package_id", ""),
                "doc_id": doc.get("doc_id", ""),
                "queue_item_id": doc.get("queue_item_id", ""),
                "error": str(doc.get("error", "")).splitlines()[0],
                "source_url": doc.get("source_url", ""),
            })
    if failed_rows:
        t = RichTable(title="Failed source-worker documents", show_lines=False)
        t.add_column("Package")
        t.add_column("Doc")
        t.add_column("Queue")
        t.add_column("Error")
        t.add_column("Source URL")
        for row in failed_rows[:15]:
            t.add_row(
                _clip(row["package"], 24),
                _clip(row["doc_id"], 16),
                _clip(row["queue_item_id"], 12),
                _clip(row["error"], 54),
                _clip(row["source_url"], 64),
            )
        console.print(t)

    package_rows = []
    packages_by_state = source.get("packages_by_state") or {}
    if isinstance(packages_by_state, dict):
        for state in ("inbox", "processing", "outbox", "imported", "failed", "archive"):
            for row in packages_by_state.get(state) or []:
                if isinstance(row, dict):
                    package_rows.append(row)
    if package_rows:
        t = RichTable(title="Source-offload packages by lifecycle", show_lines=False)
        t.add_column("Package")
        t.add_column("Folder")
        t.add_column("Manifest")
        t.add_column("Kind")
        t.add_column("Issue")
        for row in package_rows[:20]:
            t.add_row(
                _clip(row.get("package_id"), 28),
                _clip(row.get("folder_state"), 12),
                _clip(row.get("manifest_state"), 12),
                _clip(row.get("kind"), 14),
                _clip(row.get("error"), 40),
            )
        console.print(t)

    no_analysis_rows = corpus.get("no_analysis_doc_rows") or []
    if no_analysis_rows:
        t = RichTable(title="Corpus folders without analysis", show_lines=False)
        t.add_column("Doc")
        t.add_column("Title/source")
        t.add_column("Next action")
        for row in no_analysis_rows[:15]:
            title = row.get("title") or row.get("source") or ""
            t.add_row(
                _clip(row.get("doc_id"), 16),
                _clip(title, 64),
                _clip(row.get("next_action"), 80),
            )
        console.print(t)

    enrichment_rows = corpus.get("enrichment_attention_rows") or []
    if enrichment_rows:
        t = RichTable(title="Enrichment review queue", show_lines=False)
        t.add_column("Doc")
        t.add_column("Pending", justify="right")
        t.add_column("Approved", justify="right")
        t.add_column("Title")
        t.add_column("Next action")
        for row in enrichment_rows[:20]:
            t.add_row(
                _clip(row.get("doc_id"), 16),
                str(row.get("pending") or 0),
                str(row.get("approved_unpushed") or 0),
                _clip(row.get("title"), 52),
                _clip(row.get("next_action"), 42),
            )
        console.print(t)

    direct_rows = transfer.get("direct_incoming_folders") or []
    if direct_rows:
        t = RichTable(title="Direct transfer folders", show_lines=False)
        t.add_column("Package")
        t.add_column("Path")
        t.add_column("Recommendation")
        for row in direct_rows[:10]:
            if isinstance(row, dict):
                package_id = row.get("package_id", "")
                path = row.get("path", "")
            else:
                package_id = str(row)
                path = ""
            t.add_row(
                _clip(package_id, 24),
                _clip(path, 80),
                "Prefer archive transfer (.tar.gz + .sha256)",
            )
        console.print(t)


@app.command(name="stats")
def stats_cmd():
    """Show corpus statistics: totals, by type, confidence, language, upload status."""
    config = load_config(llm=None, require_services=False)
    from rich.table import Table as RichTable

    s = upload.corpus_stats(config)

    console.print(f"\n[bold]Corpus Overview[/bold]")
    console.print(f"  Total documents:   [cyan]{s['total']}[/cyan]")
    console.print(f"  Uploaded:          [green]{s['uploaded']}[/green]")
    console.print(f"  Pending upload:    [yellow]{s['pending_upload']}[/yellow]")
    console.print(f"  Partial (no analysis): [dim]{s['partial']}[/dim]")
    console.print(f"  Testimony flagged: {s['testimony_flagged']}")
    console.print(f"  Low confidence:    [red]{len(s['low_confidence_docs'])}[/red]")

    if s["by_type"]:
        t = RichTable(title="By document type")
        t.add_column("type"); t.add_column("count", justify="right")
        for k, v in s["by_type"].most_common():
            t.add_row(k, str(v))
        console.print(t)

    if s["by_confidence"]:
        t2 = RichTable(title="By confidence")
        t2.add_column("confidence"); t2.add_column("count", justify="right")
        for k, v in s["by_confidence"].most_common():
            color = "green" if k == "high" else "yellow" if k == "medium" else "red"
            t2.add_row(f"[{color}]{k}[/{color}]", str(v))
        console.print(t2)

    if s["by_language"]:
        t3 = RichTable(title="By language")
        t3.add_column("language"); t3.add_column("count", justify="right")
        for k, v in s["by_language"].most_common(10):
            t3.add_row(k, str(v))
        console.print(t3)

    if s["low_confidence_docs"]:
        console.print(f"\n[red]Low-confidence documents:[/red] {', '.join(s['low_confidence_docs'][:10])}")
        if len(s["low_confidence_docs"]) > 10:
            console.print(f"  ...and {len(s['low_confidence_docs']) - 10} more")


@app.command(name="search")
def search_cmd(
    query: str = typer.Argument(..., help="Text query to search for similar documents"),
    top_k: int = typer.Option(10, "--top-k", "-k", help="Number of results to return"),
    doc_type: str = typer.Option("", "--type", "-t", help="Filter by document type"),
    scope: str = typer.Option("", "--scope", "-s", help="Filter by scope"),
    tier: str = typer.Option("", "--tier", help="Filter by tier (1, 2, 3)"),
    llm: str = typer.Option("litelm", "--llm", help="Embedding route: litelm | local"),
):
    """Search the corpus for documents semantically similar to a text query."""
    config = load_config(llm=None, require_services=True)
    from rich.table import Table as RichTable

    console.print(f"[dim]Embedding query and searching corpus...[/dim]")
    try:
        results = search_mod.search_corpus(
            query, config, top_k=top_k,
            doc_type=doc_type, scope=scope, tier=str(tier) if tier else "",
            llm_mode=llm,
        )
    except Exception as exc:
        console.print(f"[red]Search failed: {exc}[/red]")
        raise typer.Exit(1)

    if not results:
        console.print("[yellow]No results found.[/yellow]")
        return

    t = RichTable(title=f"Search results for: {query!r}")
    t.add_column("#", style="dim", width=3)
    t.add_column("doc_id", style="cyan")
    t.add_column("sim", width=5)
    t.add_column("type", width=20)
    t.add_column("scope", width=12)
    t.add_column("confidence", width=10)
    t.add_column("summary", overflow="fold")

    for i, r in enumerate(results, 1):
        sim = r.get("similarity", 0)
        sim_str = f"{sim:.3f}" if sim else "—"
        t.add_row(
            str(i),
            r.get("doc_id", ""),
            sim_str,
            r.get("type", "?"),
            r.get("scope", "?"),
            str(r.get("confidence", "?")),
            r.get("summary", ""),
        )
    console.print(t)


@app.command(name="verify")
def verify(
    limit: int = typer.Option(10, help="Number of recent records to show from each system"),
):
    """Query Sanity and Supabase directly and print what is actually stored there."""
    config = load_config()
    upload.verify_uploads(limit, config)


@app.command(name="discard-doc")
def discard_doc(
    doc_id: str = typer.Argument(..., help="doc_id to mark as discarded (e.g. 250b9c33)"),
    reason: str = typer.Option("", "--reason", "-r", help="Human-readable reason for discarding"),
    sanity: bool = typer.Option(True, "--sanity/--no-sanity",
                                help="Patch workflowStatus=discarded in Sanity (default: yes)"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Show what would happen without writing anything"),
):
    """Mark a document as discarded — local marker + optional Sanity patch.

    Creates a discarded.json marker in the corpus folder (creating a minimal
    folder if none exists) and optionally patches workflowStatus=discarded
    in Sanity.  Nothing is deleted permanently.

    The document remains in Sanity and can be restored by running:
      runner discard-doc <doc_id> --no-sanity  (if you only want to undo locally)
    or by manually setting workflowStatus back to 'unverified' in Sanity Studio.

    'runner verify' will exclude discarded documents from the
    'in Sanity but missing from Supabase' mismatch warning.
    """
    import json as _json
    from datetime import datetime, timezone
    from .clients.sanity import patch_workflow_status as _patch_ws

    config = load_config()
    doc_dir = config.corpus_dir / doc_id

    sanity_id = f"doc-{doc_id}"

    marker = {
        "doc_id":      doc_id,
        "discarded_at": datetime.now(timezone.utc).isoformat(),
        "reason":       reason or "marked discarded by researcher",
        "sanity_id":    sanity_id,
    }

    if dry_run:
        console.print(Panel(
            f"[bold]Dry run — nothing will be written.[/bold]\n\n"
            f"Would create: [cyan]{doc_dir / 'discarded.json'}[/cyan]\n"
            f"  {_json.dumps(marker, indent=2)}\n\n"
            + (f"Would patch Sanity {sanity_id} → workflowStatus=discarded"
               if sanity else "Sanity patch skipped (--no-sanity)"),
            title=f"discard-doc {doc_id} — dry run",
        ))
        return

    # ── Write local marker ────────────────────────────────────────────────
    doc_dir.mkdir(parents=True, exist_ok=True)
    marker_path = doc_dir / "discarded.json"
    marker_path.write_text(_json.dumps(marker, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    console.print(f"[green]✓[/green] Wrote {marker_path}")

    # ── Append to audit log ───────────────────────────────────────────────
    ts = marker["discarded_at"]
    with (doc_dir / "audit.log").open("a", encoding="utf-8") as f:
        f.write(f"{ts} discarded — {marker['reason']}\n")
    console.print(f"[green]✓[/green] Appended to {doc_dir / 'audit.log'}")

    # ── Sanity patch ──────────────────────────────────────────────────────
    if sanity:
        try:
            _patch_ws(sanity_id, "discarded", config)
            console.print(f"[green]✓[/green] Sanity {sanity_id} → workflowStatus=discarded")
        except Exception as exc:
            console.print(Panel(
                f"[red]Sanity patch failed: {exc}[/red]\n\n"
                "The local discarded.json marker was written successfully.\n"
                "Re-run without --no-sanity, or set workflowStatus=discarded\n"
                "manually in Sanity Studio.",
                title="[yellow]Partial discard[/yellow]",
            ))
            raise typer.Exit(1)
    else:
        console.print("[dim]Sanity patch skipped (--no-sanity)[/dim]")

    console.print(Panel(
        f"[bold green]Document {doc_id} discarded.[/bold green]\n\n"
        f"Local marker: {marker_path}\n"
        f"Sanity: {'workflowStatus=discarded' if sanity else 'unchanged (--no-sanity)'}\n\n"
        "Nothing was permanently deleted.  To restore:\n"
        "  • Delete the discarded.json file from the corpus folder\n"
        "  • Set workflowStatus back to 'unverified' in Sanity Studio",
        title=f"Discarded {doc_id}",
    ))


@app.command(name="migrate-supabase")
def migrate_supabase(
    confirm: bool = typer.Option(False, "--confirm", help="Execute the migration without prompting"),
):
    """Recreate document_embeddings with vector(4096). Drops existing embeddings."""
    from .clients import supabase as supabase_client

    config = load_config()
    sql = supabase_client.MIGRATE_DOCUMENT_EMBEDDINGS_SQL
    console.print(Panel(sql, title="Supabase migration SQL"))
    if not confirm and not typer.confirm(
        "This drops all existing document embeddings. Continue?",
        default=False,
    ):
        console.print("[yellow]Migration cancelled.[/yellow]")
        return
    try:
        supabase_client.migrate_document_embeddings(config)
        console.print(
            "[green]Migration complete.[/green] Existing embeddings were dropped; "
            "re-run ingestion or upload to repopulate."
        )
    except RuntimeError:
        project_id = config.supabase_url.split("//")[1].split(".")[0] if "//" in config.supabase_url else "<project>"
        console.print(Panel(
            "Supabase does not expose a built-in SQL RPC — run the migration manually:\n\n"
            f"  1. Open: [bold]https://supabase.com/dashboard/project/{project_id}/sql[/bold]\n"
            "  2. Paste the SQL shown above\n"
            "  3. Click [bold]Run[/bold]\n\n"
            "Then run [bold]python3 -m runner doctor[/bold] to verify the table exists.",
            title="[yellow]Manual step required[/yellow]",
        ))
        raise typer.Exit(1)


@app.command(name="migrate-corpus")
def migrate_corpus(
    confirm: bool = typer.Option(False, "--confirm", help="Actually write changes (default: dry-run)"),
):
    """Backfill missing provenance fields (ingested_at, prompt_version, ontology_version) across the corpus."""
    from .pipeline import upload as upload_pipeline

    config = load_config()
    dry_run = not confirm
    if dry_run:
        console.print("[yellow]Dry-run mode — no files will be changed. Pass --confirm to write.[/yellow]")
    result = upload_pipeline.migrate_corpus_files(config, dry_run=dry_run)
    console.print(
        f"[green]Done.[/green] "
        f"Scanned: {result['docs_scanned']}, "
        f"Patched: {result['docs_patched']}, "
        f"Fields written: {result['fields_written']}"
        + (" (dry run — nothing written)" if dry_run else "")
    )


@app.command(name="embed-test")
def embed_test(
    llm: str = typer.Option(
        "litelm",
        help="Embedding source: litelm (Mac Studio via LiteLLM) | local (MacBook Ollama)",
    ),
):
    """Test the embedding model and print the vector dimension.

    litelm (default) — hits Mac Studio via Tailscale/LiteLLM proxy.
                       Mac Studio must be reachable (check with: ping mac-studio).
    local            — hits local Ollama on this machine (ollama serve must be running).

    Expected result: 4096 dimensions (qwen3-embedding:8b).
    """
    import os
    from dotenv import load_dotenv
    load_dotenv("runner/.env")
    load_dotenv()

    use_litelm = llm.startswith("litelm")

    if use_litelm:
        litelm_url = os.getenv("LITELM_BASE_URL", "")
        if not litelm_url:
            console.print(Panel(
                "[red]LITELM_BASE_URL not set in runner/.env[/red]\n\n"
                "Add: [bold]LITELM_BASE_URL=http://<mac-studio-tailscale-ip>:4000[/bold]",
                title="Config error",
            ))
            raise typer.Exit(1)
        embed_url = litelm_url.rstrip("/")
        model = os.getenv("LITELM_EMBEDDING_MODEL", "research-embedding")
        console.print(
            f"Testing [bold]{model}[/bold] via LiteLLM at [bold]{embed_url}[/bold]\n"
            f"[dim](Mac Studio → qwen3-embedding:8b)[/dim]"
        )
    else:
        embed_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        model = os.getenv("EMBEDDING_MODEL", "qwen3-embedding:8b")
        console.print(f"Testing [bold]{model}[/bold] at [bold]{embed_url}[/bold] (local Ollama) ...")

    try:
        if use_litelm:
            dim = embed.test_dimension_litelm(embed_url, model)
        else:
            dim = embed.test_dimension(embed_url, model)
    except Exception as exc:
        err = str(exc)
        if "Connect" in type(exc).__name__ or "connect" in err.lower():
            if use_litelm:
                console.print(Panel(
                    "[red]Cannot reach LiteLLM proxy (Mac Studio).[/red]\n\n"
                    "Check: Is Mac Studio on? Is Tailscale connected?\n"
                    f"Test with: [bold]curl {embed_url}/health[/bold]",
                    title="Connection error",
                ))
            else:
                console.print(Panel(
                    "[red]Cannot connect to local Ollama.[/red]\n\n"
                    "Start it with: [bold]ollama serve[/bold]\n"
                    f"Then pull the model: [bold]ollama pull {model}[/bold]",
                    title="Connection error",
                ))
        else:
            console.print(Panel(f"[red]{exc}[/red]", title="Error"))
        raise typer.Exit(1)

    status = "[bold green]✓ correct[/bold green]" if dim == 4096 else f"[bold red]✗ unexpected — expected 4096[/bold red]"
    console.print(Panel(
        f"[bold green]{model}  →  {dim} dimensions[/bold green]  {status}\n\n"
        + (
            "Supabase table is correctly sized at [bold]vector(4096)[/bold]."
            if dim == 4096 else
            f"[red]Supabase table must use vector({dim}) — run migrate-supabase --confirm.[/red]"
        ),
        title="Embedding Dimension Test ✓" if dim == 4096 else "Embedding Dimension Test — MISMATCH",
    ))


@app.command(name="litelm-test")
def litelm_test(
    chat:  bool = typer.Option(True,  "--chat/--no-chat",  help="Test a tiny chat completion"),
    embed: bool = typer.Option(True,  "--embed/--no-embed", help="Test a tiny embedding request"),
    model: Optional[str] = typer.Option(None, "--model", help="Override chat model (default: LITELM_ANALYSIS_MODEL)"),
    embed_model: Optional[str] = typer.Option(None, "--embed-model", help="Override embedding model (default: LITELM_EMBEDDING_MODEL)"),
    timeout: int = typer.Option(60, "--timeout", help="Request timeout in seconds"),
):
    """Deep health test for LiteLLM / Mac Studio — chat completion + embedding.

    Sends real (tiny) inference requests to the Mac Studio and classifies
    any failure precisely:

      NETWORK_UNREACHABLE  Mac Studio offline or Tailscale disconnected
      AUTH_FAILURE         Wrong LITELM_API_KEY
      HTTP_500_PTY         Mac Studio hit macOS PTY/process-limit (restart Ollama)
      HTTP_500_UPSTREAM    Ollama model-runner error (model not loaded, OOM)
      HTTP_500_LITELM      LiteLLM internal error
      HTTP_500_UNKNOWN     500 with no interpretable body
      JSON_PARSE           Malformed response (model output or proxy bug)
      DIMENSION_MISMATCH   Embedding returned wrong vector length

    Prints the exact URL and model used for each request.
    Run after 'runner doctor' passes to confirm Mac Studio is actually serving.
    See docs/MAC_STUDIO_TROUBLESHOOTING.md for remediation steps.
    """
    import os
    from dotenv import load_dotenv
    from rich.table import Table as RichTable
    from .pipeline.diagnostics import (
        probe_health, probe_chat, probe_embedding,
        ErrorKind, get_process_count, get_pty_count, get_pty_limit,
    )

    load_dotenv("runner/.env")
    load_dotenv()

    litelm_url   = os.getenv("LITELM_BASE_URL", "").rstrip("/")
    litelm_key   = os.getenv("LITELM_API_KEY", "")
    chat_model   = model        or os.getenv("LITELM_ANALYSIS_MODEL",  "core-qwen")
    emb_model    = embed_model  or os.getenv("LITELM_EMBEDDING_MODEL", "research-embedding")

    if not litelm_url:
        console.print(Panel(
            "[red]LITELM_BASE_URL not set in runner/.env[/red]\n\n"
            "Add: [bold]LITELM_BASE_URL=http://<mac-studio-tailscale-ip>:4000[/bold]",
            title="Config error",
        ))
        raise typer.Exit(1)

    console.print(f"\n[bold]LiteLLM deep test[/bold] → [cyan]{litelm_url}[/cyan]")
    console.print(f"  chat model : [bold]{chat_model}[/bold]")
    console.print(f"  embed model: [bold]{emb_model}[/bold]\n")

    results: list[tuple[str, str, str, str]] = []   # (step, endpoint, status, detail)
    any_failure = False

    def _row(step: str, endpoint: str, dr) -> None:
        nonlocal any_failure
        # HEALTH_SLOW = service is up, /health just timed out — treat as warning not failure
        if dr.ok or dr.kind == ErrorKind.HEALTH_SLOW:
            icon = "[green]✓[/green]" if dr.ok else "[yellow]~[/yellow]"
        else:
            icon = "[red]✗[/red]"
            any_failure = True
        results.append((step, endpoint, icon, dr.message))

    # 1. Health endpoint
    console.print("[dim]1/3  GET /v1/models + /health …[/dim]")
    dr = probe_health(litelm_url, api_key=litelm_key, timeout=10)
    _row("Health", f"{litelm_url}/v1/models", dr)
    if not dr.ok and dr.kind == ErrorKind.NETWORK_UNREACHABLE:
        # No point testing further if we can't reach the host
        table = RichTable(show_lines=False)
        table.add_column("Step"); table.add_column("Endpoint")
        table.add_column("", width=3); table.add_column("Result", overflow="fold")
        for r in results:
            table.add_row(*r)
        console.print(table)
        console.print(Panel(
            "[red]Cannot reach LiteLLM proxy.[/red]\n\n"
            "• Is Mac Studio powered on?\n"
            "• Is Tailscale connected? (check menu bar icon)\n"
            f"• Quick test: [bold]curl {litelm_url}/health[/bold]\n\n"
            "See docs/MAC_STUDIO_TROUBLESHOOTING.md § Connectivity.",
            title="[red]Network unreachable — further tests skipped[/red]",
        ))
        raise typer.Exit(1)

    # 2. Chat completion
    if chat:
        console.print(f"[dim]2/3  POST /chat/completions  model={chat_model} …[/dim]")
        dr = probe_chat(litelm_url, api_key=litelm_key, model=chat_model, timeout=timeout)
        _row("Chat", f"{litelm_url}/chat/completions", dr)
    else:
        results.append(("Chat", "—", "[dim]—[/dim]", "skipped (--no-chat)"))

    # 3. Embedding
    if embed:
        console.print(f"[dim]3/3  POST /embeddings        model={emb_model} …[/dim]")
        dr = probe_embedding(litelm_url, api_key=litelm_key, model=emb_model, timeout=timeout)
        _row("Embedding", f"{litelm_url}/embeddings", dr)
    else:
        results.append(("Embedding", "—", "[dim]—[/dim]", "skipped (--no-embed)"))

    # ── Print table ───────────────────────────────────────────────────────
    table = RichTable(title="LiteLLM Deep Test", show_lines=False)
    table.add_column("Step")
    table.add_column("Endpoint")
    table.add_column("", width=3)
    table.add_column("Result", overflow="fold")
    for r in results:
        table.add_row(*r)

    # System resources (informational)
    proc    = get_process_count()
    pty_cur = get_pty_count()
    pty_max = get_pty_limit()
    if proc is not None or pty_cur is not None:
        table.add_section()
        if proc is not None:
            table.add_row("Local processes", "(this machine)", "[dim]ℹ[/dim]", str(proc))
        if pty_cur is not None:
            pty_str = str(pty_cur)
            if pty_max:
                pct = pty_cur * 100 // pty_max
                pty_str = f"{pty_cur} / {pty_max}  ({pct}%)"
                if pct >= 80:
                    pty_str += "  ← HIGH"
            table.add_row("PTY devices (/dev/ttys*)", "(this machine)", "[dim]ℹ[/dim]", pty_str)

    console.print(table)

    if not any_failure:
        console.print(Panel(
            "[bold green]All LiteLLM probes passed.[/bold green]\n\n"
            "Mac Studio is reachable, authenticated, and serving both chat and embeddings.\n"
            "You can run: [bold]python -m runner ingest <url>[/bold]",
            title="Mac Studio — healthy ✓",
        ))
    else:
        # Find the most informative failure for a tailored summary
        from .pipeline.diagnostics import ErrorKind as _EK
        last_kind = None
        last_detail = ""
        for step, _, icon, msg in results:
            if "✗" in icon:
                # look up the DiagnosticResult kind via the message prefix
                last_detail = f"{step}: {msg}"
        pane_lines = [f"[red]One or more probes failed.[/red]\n"]

        # Check if any failure is PTY-related
        fail_msgs = " ".join(m for _, _, icon, m in results if "✗" in icon).lower()
        if "pty" in fail_msgs or "forkpty" in fail_msgs or "pseudo-tty" in fail_msgs:
            pane_lines.append(
                "PTY / process exhaustion detected on Mac Studio.\n"
                "See docs/MAC_STUDIO_TROUBLESHOOTING.md § PTY exhaustion."
            )
        elif "auth" in fail_msgs or "401" in fail_msgs or "403" in fail_msgs:
            pane_lines.append(
                "Authentication failure — check LITELM_API_KEY in runner/.env."
            )
        else:
            pane_lines.append(
                "Run: [bold]python -m runner litelm-test[/bold] again after restarting\n"
                "the Mac Studio or Ollama service.\n"
                "See docs/MAC_STUDIO_TROUBLESHOOTING.md for remediation steps."
            )
        console.print(Panel("\n".join(pane_lines), title="[red]Mac Studio — unhealthy[/red]"))
        raise typer.Exit(1)


@app.command(name="doctor")
def doctor():
    """Pre-flight check — verify every prerequisite before the first ingest.

    Checks: .env file, required credentials, Ollama reachability + model,
    embedding dimension, Sanity API, Supabase table schema.
    Run this before your first 'runner ingest' to catch missing config early.
    """
    import os
    from dotenv import load_dotenv
    from rich.table import Table as RichTable

    load_dotenv()

    checks: list[tuple[str, bool, str]] = []   # (label, ok, detail)

    def ok(label: str, detail: str = "") -> None:
        checks.append((label, True, detail))

    def fail(label: str, detail: str = "") -> None:
        checks.append((label, False, detail))

    # ── .env file ──────────────────────────────────────────────────────────
    env_path = None
    for candidate in [".env", "runner/.env"]:
        if os.path.exists(candidate):
            env_path = candidate
            break
    if env_path:
        ok(".env file", env_path)
    else:
        fail(".env file", "Not found. Copy runner/.env.example to runner/.env and fill in keys.")

    # ── Required credentials ──────────────────────────────────────────────
    always_required = {
        "SANITY_PROJECT_ID":    "Sanity project",
        "SANITY_DATASET":       "Sanity dataset",
        "SANITY_WRITE_TOKEN":   "Sanity write token",
        "SUPABASE_URL":         "Supabase project URL",
        "SUPABASE_SERVICE_KEY": "Supabase service role key",
    }
    placeholders = ("", "https://<project>.supabase.co", "sk-local-research-key-change-this")
    for key, description in always_required.items():
        val = os.getenv(key, "")
        if val and val not in placeholders:
            ok(key, description)
        else:
            fail(key, f"Missing or placeholder — {description}")

    # Claude API key is optional — only needed for --llm claude
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    if anthropic_key and anthropic_key not in ("sk-ant-...",):
        ok("ANTHROPIC_API_KEY", "Set (used only for --llm claude)")
    else:
        ok("ANTHROPIC_API_KEY", "Not set — not needed unless you use --llm claude")

    # ── LiteLLM proxy (primary analysis path) ────────────────────────────
    from .pipeline.diagnostics import (
        probe_health as _probe_health,
        ErrorKind as _EK,
        get_process_count as _proc_count,
        get_pty_count as _pty_count,
        get_pty_limit as _pty_limit,
    )
    litelm_url  = os.getenv("LITELM_BASE_URL", "")
    litelm_key  = os.getenv("LITELM_API_KEY", "")
    litelm_chat = os.getenv("LITELM_ANALYSIS_MODEL", "core-qwen")
    litelm_emb  = os.getenv("LITELM_EMBEDDING_MODEL", "research-embedding")
    if not litelm_url:
        fail("LiteLLM proxy",
             "LITELM_BASE_URL not set — primary analysis path unavailable.\n"
             "Add the Mac Studio Tailscale URL to runner/.env")
    else:
        dr = _probe_health(litelm_url, api_key=litelm_key, timeout=15)
        if dr.ok or dr.kind == _EK.HEALTH_SLOW:
            # HEALTH_SLOW = /v1/models confirmed reachable but /health timed out
            # (LiteLLM pings all cold models before responding — can take 30–60 s)
            suffix = "  [yellow](health slow — cold model ping, inference OK)[/yellow]" if dr.kind == _EK.HEALTH_SLOW else ""
            ok("LiteLLM proxy",
               f"Reachable at {litelm_url}{suffix}  "
               f"(chat={litelm_chat}, embed={litelm_emb})")
        else:
            _hints = {
                _EK.NETWORK_UNREACHABLE: (
                    "Cannot connect — Mac Studio offline, Tailscale down, or LiteLLM\n"
                    "bound to 127.0.0.1 instead of 0.0.0.0.\n"
                    "Fix: restart LiteLLM with --host 0.0.0.0\n"
                    "  litellm --config ~/sogice/litellm_config.yaml --port 4000 --host 0.0.0.0\n"
                    "See docs/MAC_STUDIO_TROUBLESHOOTING.md § Connectivity."
                ),
                _EK.AUTH_FAILURE: (
                    "HTTP 401/403 — LITELM_API_KEY in runner/.env does not match\n"
                    "master_key in LiteLLM config.yaml on Mac Studio."
                ),
                _EK.HTTP_500_PTY: (
                    "HTTP 500 with PTY exhaustion — Mac Studio has hit the macOS\n"
                    "pseudo-terminal limit.  Restart Ollama on Mac Studio.\n"
                    "See docs/MAC_STUDIO_TROUBLESHOOTING.md § PTY exhaustion."
                ),
                _EK.HTTP_500_UPSTREAM: (
                    "HTTP 500 from Ollama — model runner error (model not loaded,\n"
                    "OOM, or Ollama crashed).  Check 'ollama ps' on Mac Studio."
                ),
            }
            hint = _hints.get(dr.kind, "")
            fail("LiteLLM proxy",
                 f"{dr.message}\n{hint}\nDetail: {dr.detail[:120]}" if hint
                 else f"{dr.message}\n{dr.detail[:200]}")

    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    embedding_model = os.getenv("EMBEDDING_MODEL", "qwen3-embedding:8b")
    analysis_model  = os.getenv("LOCAL_ANALYSIS_MODEL", "qwen3.5:9b")

    # ── Ollama reachability + embedding model ─────────────────────────────
    installed_models: set[str] = set()
    try:
        import httpx as _httpx
        r = _httpx.get(f"{ollama_base_url}/api/tags", timeout=5)
        r.raise_for_status()
        installed_models = {m["name"] for m in r.json().get("models", [])}
        ok("Ollama (local)", f"Running at {ollama_base_url}, {len(installed_models)} model(s)")
    except Exception as exc:
        fail("Ollama (local)", f"Not reachable at {ollama_base_url}: {exc}\nRun: ollama serve")

    if installed_models:
        if any(m.startswith(embedding_model.split(":")[0]) for m in installed_models):
            ok("Embedding model", embedding_model)
        else:
            fail("Embedding model", f"{embedding_model} not found in Ollama.\nRun: ollama pull {embedding_model}")

    # Local analysis model: optional since Mac Studio is primary
    if installed_models:
        if any(m.startswith(analysis_model.split(":")[0]) for m in installed_models):
            ok("Local analysis model", f"{analysis_model} (fallback for --llm local)")
        else:
            ok("Local analysis model", f"{analysis_model} not installed — only needed for offline/fallback (--llm local)")

    # ── Media extraction tools ───────────────────────────────────────────
    try:
        import yt_dlp as _yt_dlp
        version_mod = getattr(_yt_dlp, "version", None)
        ok("yt-dlp", f"Installed ({getattr(version_mod, '__version__', 'version unknown')})")
    except Exception as exc:
        import sys as _sys
        if "No module named" in str(exc):
            fail(
                "yt-dlp",
                f"Not importable by {_sys.executable}. "
                "Run doctor via the project venv: .venv/bin/python3 -m runner doctor",
            )
        else:
            fail("yt-dlp", f"Not importable: {exc}. Install/update yt-dlp before media ingest.")

    ffmpeg_path = tool_path("ffmpeg")
    if ffmpeg_path:
        ok("ffmpeg", ffmpeg_path)
    else:
        fail("ffmpeg", "Not found. Install ffmpeg for reliable audio fallback, screenshots, and video tooling.")

    js_runtimes = [name for name in ("deno", "node", "bun") if tool_path(name)]
    if js_runtimes:
        ok("YouTube JS runtime", ", ".join(js_runtimes))
    else:
        fail(
            "YouTube JS runtime",
            "No deno/node/bun found. yt-dlp may miss YouTube formats or metadata as YouTube extraction changes.",
        )

    # ── Embedding dimension ───────────────────────────────────────────────
    if installed_models and any(m.startswith(embedding_model.split(":")[0]) for m in installed_models):
        try:
            dim = embed.test_dimension(ollama_base_url, embedding_model)
            if dim == 4096:
                ok("Embedding dimension", f"{dim}d ✓ matches vector(4096) in Supabase")
            else:
                fail("Embedding dimension", f"{dim}d — expected 4096. Run migrate-supabase if the table was created with a different dimension.")
        except Exception as exc:
            fail("Embedding dimension", f"Could not test: {exc}")

    # ── Sanity API ────────────────────────────────────────────────────────
    sanity_id    = os.getenv("SANITY_PROJECT_ID", "")
    sanity_ds    = os.getenv("SANITY_DATASET", "production")
    sanity_token = os.getenv("SANITY_WRITE_TOKEN", "")
    if sanity_id and sanity_token and "placeholder" not in sanity_token:
        try:
            import httpx as _httpx
            r = _httpx.get(
                f"https://{sanity_id}.api.sanity.io/v2024-01-01/data/query/{sanity_ds}",
                params={"query": '*[_type == "sogiceDocument"][0..0]{ _id }'},
                headers={"Authorization": f"Bearer {sanity_token}"},
                timeout=10,
            )
            r.raise_for_status()
            ok("Sanity API", f"project={sanity_id} dataset={sanity_ds}")
        except Exception as exc:
            fail("Sanity API", f"Query failed: {exc}")

    # ── Supabase + document_embeddings table ──────────────────────────────
    supa_url = os.getenv("SUPABASE_URL", "")
    supa_key = os.getenv("SUPABASE_SERVICE_KEY", "")
    if supa_url and supa_key and "project" not in supa_url:
        try:
            from supabase import create_client as _sb
            sb = _sb(supa_url, supa_key)
            sb.table("document_embeddings").select("doc_id").limit(1).execute()
            ok("Supabase document_embeddings", "Table exists and is reachable")
        except Exception as exc:
            from .pipeline.diagnostics import classify_supabase_error as _csb
            dr = _csb(exc)
            fail("Supabase document_embeddings", f"{dr.message}\n{dr.detail}" if dr.detail else dr.message)

    # ── Prompt files ──────────────────────────────────────────────────────
    from pathlib import Path as _Path
    import re as _re
    for prompt_file in ["02_working_tools/Claude_Ingestion_Prompt.md",
                        "02_working_tools/ENRICHMENT_PROMPT_v1.0.md"]:
        p = _Path(prompt_file)
        if not p.exists():
            fail(f"Prompt file: {p.name}", "File not found — pipeline will crash at analysis stage")
            continue
        raw = p.read_text()
        if _re.search(r"## SYSTEM PROMPT\s*\n```\n", raw):
            ok(f"Prompt file: {p.name}", "Parseable")
        else:
            fail(f"Prompt file: {p.name}", "Cannot parse — '## SYSTEM PROMPT\\n```' section not found")

    # ── System resource counts (informational — macOS PTY / process limits) ──
    #    Shown as context only; not included in the pass/fail count.
    info_rows: list[tuple[str, str]] = []

    proc = _proc_count()
    if proc is not None:
        info_rows.append(("Running processes", str(proc)))

    pty_cur  = _pty_count()
    pty_max  = _pty_limit()
    if pty_cur is not None:
        pty_str = str(pty_cur)
        if pty_max:
            pct = pty_cur * 100 // pty_max
            pty_str = f"{pty_cur} / {pty_max}  ({pct}%)"
            if pct >= 80:
                pty_str += "  ← HIGH — Mac Studio may be approaching PTY limit"
        info_rows.append(("PTY devices (/dev/ttys*)", pty_str))

    # ── Print results ─────────────────────────────────────────────────────
    table = RichTable(title="Pre-flight Check", show_lines=False)
    table.add_column("Check")
    table.add_column("Status")
    table.add_column("Detail", overflow="fold")
    for label, passed, detail in checks:
        table.add_row(
            label,
            "[green]✓[/green]" if passed else "[red]✗[/red]",
            detail,
        )
    if info_rows:
        table.add_section()
        for label, value in info_rows:
            table.add_row(label, "[dim]ℹ[/dim]", value)
    console.print(table)

    failures = [label for label, passed, _ in checks if not passed]
    if not failures:
        console.print(Panel(
            "[bold green]All checks passed.[/bold green]\n\n"
            "You're ready to ingest. Default path uses the Mac Studio via LiteLLM:\n"
            "  [bold]python -m runner ingest https://example.org/document[/bold]\n\n"
            "For Tier 1 / high-stakes docs, override to Claude:\n"
            "  [bold]python -m runner ingest <url> --llm claude[/bold]\n\n"
            "Or open the Streamlit workbench:\n"
            "  [bold]cd runner && streamlit run app.py[/bold]\n\n"
            "To deep-test Mac Studio (chat + embedding):\n"
            "  [bold]python -m runner litelm-test[/bold]",
            title="Ready ✓",
        ))
    else:
        console.print(Panel(
            f"[red]{len(failures)} check(s) failed.[/red] Fix the items marked ✗ above before ingesting.\n\n"
            "If LiteLLM shows HTTP 500: run [bold]python -m runner litelm-test[/bold] for a detailed diagnosis.\n"
            "Common cause: Mac Studio hit macOS PTY limit — see docs/MAC_STUDIO_TROUBLESHOOTING.md.",
            title="[red]Not ready[/red]",
        ))
        raise typer.Exit(1)


@app.command(name="seed-lexicon")
def seed_lexicon_cmd(
    dry_run: bool = typer.Option(False, "--dry-run", help="Parse and count entries without writing to Sanity"),
    force:   bool = typer.Option(False, "--force",   help="Overwrite existing Sanity entries (default: skip if exists)"),
):
    """Seed Sanity with all ~163 lexicon terms from SOGICE_Lexicon_v2.1.md.

    Parses the markdown file, converts each term entry to a draft lexiconEntry,
    and writes it to Sanity using createOrReplace. Existing entries are skipped
    unless --force is given.

    Run with --dry-run first to verify the parser finds all expected terms.
    """
    from .pipeline.seed import parse_lexicon_md, seed_lexicon

    if dry_run:
        entries = parse_lexicon_md()
        console.print(f"[bold]Dry run:[/bold] parsed {len(entries)} terms — no writes performed.")
        for e in entries[:10]:
            console.print(f"  {e['term']:45s} cluster={e['proposed_cluster']}  fn={e['function']}")
        if len(entries) > 10:
            console.print(f"  … and {len(entries) - 10} more")
        return

    config = load_config()
    console.print("[bold]Seeding lexicon from SOGICE_Lexicon_v2.1.md …[/bold]")
    summary = seed_lexicon(config, dry_run=False, force=force)

    console.print(
        f"\n[bold green]Done.[/bold green] "
        f"{summary['created']} created, "
        f"{summary['skipped']} skipped (already exist), "
        f"{len(summary['errors'])} errors "
        f"(of {summary['attempted']} attempted)"
    )
    if summary["errors"]:
        console.print("\n[red]Errors:[/red]")
        for err in summary["errors"][:20]:
            console.print(f"  {err}")
        if len(summary["errors"]) > 20:
            console.print(f"  … and {len(summary['errors']) - 20} more")


@app.command(name="seed-tactics")
def seed_tactics_cmd(
    dry_run: bool = typer.Option(False, "--dry-run", help="Parse and count without writing"),
    force:   bool = typer.Option(False, "--force",   help="Overwrite existing Sanity entries"),
):
    """Seed Sanity with all 30 tactics from the ontology and ingestion prompt.

    Parses SOGICE_Ontology_v3.0.md (Part III cluster mappings + extended
    definitions) and Claude_Ingestion_Prompt.md (vocabulary + inline definitions)
    to build tacticEntry records with name, primary/secondary cluster, definition,
    and boundaries.

    The tacticEntry type is dynamic — cultural variants, historical periods,
    and linked lexicon terms can be added as the corpus grows.

    Requires the tacticEntry schema to be deployed to your Sanity studio first.
    """
    from .pipeline.seed import parse_tactics, seed_tactics

    if dry_run:
        entries = parse_tactics()
        console.print(f"[bold]Dry run:[/bold] parsed {len(entries)} tactics — no writes performed.")
        for e in entries[:15]:
            pcluster = e.get("primary_cluster", "?")[:20]
            has_def  = "✓ def" if e.get("definition") else "  no def"
            console.print(f"  {e['tactic']:45s} {pcluster:22s} {has_def}")
        if len(entries) > 15:
            console.print(f"  … and {len(entries) - 15} more")
        no_def = [e["tactic"] for e in entries if not e.get("definition")]
        if no_def:
            console.print(f"\n[yellow]{len(no_def)} tactics without definitions:[/yellow] {', '.join(no_def)}")
        return

    config = load_config()
    console.print("[bold]Seeding tactics from ontology + ingestion prompt …[/bold]")
    summary = seed_tactics(config, dry_run=False, force=force)

    console.print(
        f"\n[bold green]Done.[/bold green] "
        f"{summary['created']} created, "
        f"{summary['skipped']} skipped, "
        f"{len(summary['errors'])} errors "
        f"(of {summary['attempted']} attempted)"
    )
    if summary["errors"]:
        console.print("\n[red]Errors:[/red]")
        for err in summary["errors"][:20]:
            console.print(f"  {err}")


@app.command(name="seed-lexicon-variants")
def seed_lexicon_variants_cmd(
    dry_run: bool = typer.Option(False, "--dry-run", help="Count variants without writing"),
):
    """Seed multilingualVariants from Section 11 of SOGICE_Lexicon_v2.1.md.

    Reads the multilingual translation table and language-specific note paragraphs,
    then appends each non-English term as a multilingualVariant on its parent
    lexiconEntry in Sanity.

    Parent entries that don't yet exist are created as minimal stubs automatically.
    Safe to re-run — duplicate variant keys are ignored by Sanity.

    Run seed-lexicon first so most parents already exist.
    """
    from .pipeline.seed import parse_multilingual_variants_md, seed_lexicon_variants

    if dry_run:
        variants = parse_multilingual_variants_md()
        by_lang: dict[str, int] = {}
        for v in variants:
            by_lang[v["language"]] = by_lang.get(v["language"], 0) + 1
        console.print(f"[bold]Dry run:[/bold] {len(variants)} variants parsed across {len(by_lang)} languages.")
        for lang, count in sorted(by_lang.items()):
            console.print(f"  {lang}: {count} variants")
        console.print("\n[bold]Sample (first 10):[/bold]")
        for v in variants[:10]:
            console.print(f"  {v['variant_term']:40s} [{v['language']}] → {v['canonical_term']}")
        return

    config = load_config()
    console.print("[bold]Seeding multilingual variants from SOGICE_Lexicon_v2.1.md Section 11 …[/bold]")
    summary = seed_lexicon_variants(config, dry_run=False)

    console.print(
        f"\n[bold green]Done.[/bold green] "
        f"{summary['appended']} variants appended, "
        f"{summary['stub_created']} parent stubs created, "
        f"{len(summary['errors'])} errors "
        f"(of {summary['attempted']} attempted)"
    )
    if summary["errors"]:
        console.print("\n[red]Errors:[/red]")
        for err in summary["errors"][:20]:
            console.print(f"  {err}")


@app.command(name="seed-entities")
def seed_entities_cmd(
    entity_type: str = typer.Option("all", "--type", help="org | person | law | event | all"),
    dry_run: bool    = typer.Option(False, "--dry-run", help="Parse and count without writing"),
):
    """Seed Sanity with organizations, persons, laws, and events from Entity_Registry_v1.1.md.

    Writes records with registryStatus='seeded'. Existing records are replaced
    (createOrReplace). Safe to re-run — idempotent via stable Sanity IDs.

    Use --type to import only one section:
      --type org      → organizations only
      --type person   → persons only
      --type law      → laws and policies only
      --type event    → events only
    """
    from .pipeline.seed import parse_entity_registry_md, seed_entities

    valid_types = {"org", "person", "law", "event", "all"}
    if entity_type not in valid_types:
        console.print(f"[red]Unknown --type '{entity_type}'. Choose from: {', '.join(sorted(valid_types))}[/red]")
        raise typer.Exit(1)

    if dry_run:
        registry = parse_entity_registry_md()
        orgs    = len(registry["orgs"])    if entity_type in ("org",    "all") else 0
        persons = len(registry["persons"]) if entity_type in ("person", "all") else 0
        laws    = len(registry["laws"])    if entity_type in ("law",    "all") else 0
        events  = len(registry["events"])  if entity_type in ("event",  "all") else 0
        total = orgs + persons + laws + events
        console.print(
            f"[bold]Dry run:[/bold] {total} entities parsed — "
            f"orgs={orgs}, persons={persons}, laws={laws}, events={events}"
        )
        if entity_type in ("org", "all"):
            console.print("\n[bold]Organizations (first 10):[/bold]")
            for e in registry["orgs"][:10]:
                console.print(f"  {e['name']}")
        if entity_type in ("person", "all"):
            console.print("\n[bold]Persons (first 10):[/bold]")
            for e in registry["persons"][:10]:
                console.print(f"  {e['name']}  ({e.get('role', '')})")
        return

    config = load_config()
    console.print(f"[bold]Seeding entities (type={entity_type}) from Entity_Registry_v1.1.md …[/bold]")
    summary = seed_entities(config, dry_run=False, entity_type=entity_type)  # type: ignore[arg-type]

    console.print(
        f"\n[bold green]Done.[/bold green] "
        f"{summary['created']} created, "
        f"{summary['skipped']} skipped, "
        f"{len(summary['errors'])} errors "
        f"(of {summary['attempted']} attempted)"
    )
    if summary["errors"]:
        console.print("\n[red]Errors:[/red]")
        for err in summary["errors"][:20]:
            console.print(f"  {err}")
        if len(summary["errors"]) > 20:
            console.print(f"  … and {len(summary['errors']) - 20} more")


@app.command(name="seed-practices")
def seed_practices_cmd(
    dry_run: bool = typer.Option(False, "--dry-run", help="Parse and preview without writing to Sanity"),
):
    """Seed Sanity with SOGICE practice entries (14 practices).

    Writes practiceEntry records with registryStatus='seeded'. Safe to re-run — idempotent.

    Includes 12 practices from the vocabulary CSV plus 2 missing from the CSV but
    present in the ingestion prompt (Physical-Coercion, Verbal-Abuse-Humiliation).

    NOTE: Practice: Coaching/Counselling-Rebrand overlaps with the Rebranding-SOGICE
    tactic — flagged in the record notes for researcher review.
    """
    from .pipeline.seed import parse_practices, seed_practices

    if dry_run:
        practices = parse_practices()
        console.print(f"\n[bold]Dry run:[/bold] {len(practices)} practices parsed\n")
        for p in practices:
            has_def = "[green]✓ def[/green]" if p.get("definition") else "[yellow]no def[/yellow]"
            overlap = "  [red]⚠ tactic-overlap[/red]" if p.get("notes") else ""
            console.print(f"  [{p.get('practice_type', '?'):14}] {p['practice']}  ({has_def}){overlap}")
        return

    config = load_config()
    console.print("[bold]Seeding practices to Sanity …[/bold]")
    summary = seed_practices(config, dry_run=False)
    console.print(
        f"\n[bold green]Done.[/bold green] "
        f"{summary['written']} written, {summary['failed']} failed "
        f"(of {summary['total']} total)"
    )


@app.command(name="seed-tag-registry")
def seed_tag_registry_cmd(
    dry_run: bool = typer.Option(False, "--dry-run", help="Parse and preview without writing to Sanity"),
    category: str = typer.Option(
        "all", "--category", "-c",
        help="Category to seed: Type|Format|Evidence|Country|Function|Harm|Migration|all",
    ),
):
    """Seed Sanity tagRegistry with controlled vocabulary from the vocabulary CSV.

    Categories: Type (16), Format (19), Evidence (9), Country (26),
    Function (10), Harm (7), Migration (5). Total: ~92 tags.

    Network entries are seeded separately via seed-networks (written as organization records).

    Harm taxonomy note: CSV severity-first labels (Mild/Moderate/Severe) conflict with the
    ingestion prompt type-first taxonomy (Psychological/Physical/Spiritual). Severity tags
    are flagged as 'superseded' in promptAlignment field.

    Migration taxonomy note: CSV directional tags (To-Europe/From-Europe) differ from the
    prompt protection-claim tags (Asylum-Related). Both preserved with alignment notes.
    """
    from .pipeline.seed import parse_vocabulary_csv, seed_tag_registry, _TAG_CATEGORIES

    valid_cats = _TAG_CATEGORIES | {"all"}
    if category not in valid_cats:
        console.print(
            f"[red]Unknown category '{category}'. "
            f"Choose from: {', '.join(sorted(valid_cats))}[/red]"
        )
        raise typer.Exit(1)

    cats = None if category == "all" else {category}

    if dry_run:
        from collections import Counter
        tags = parse_vocabulary_csv(categories=cats)
        by_cat = Counter(t["category"] for t in tags)
        console.print(f"\n[bold]Dry run:[/bold] {len(tags)} tags\n")
        for cat_name, count in sorted(by_cat.items()):
            console.print(f"  [bold]{cat_name}[/bold] ({count})")
        console.print()
        for t in tags:
            align = t.get("prompt_alignment", "")
            align_str = f"  [dim][{align}][/dim]" if align else ""
            console.print(f"  {t['tag']}{align_str}")
        return

    config = load_config()
    console.print(f"[bold]Seeding tag registry (category={category}) …[/bold]")
    summary = seed_tag_registry(config, dry_run=False, categories=cats)
    console.print(
        f"\n[bold green]Done.[/bold green] "
        f"{summary['written']} written, {summary['failed']} failed "
        f"(of {summary['total']} total)"
    )


@app.command(name="seed-networks")
def seed_networks_cmd(
    dry_run: bool = typer.Option(False, "--dry-run", help="Parse and preview without writing to Sanity"),
):
    """Seed Sanity with Network entries from the vocabulary CSV as organization records.

    34 network entries are written as organization records with type='advocacy-network'.
    Some entries duplicate organizations already in the entity registry (IFTCC, NARTH, ADF, etc.)
    — these will be overwritten safely. Run seed-entities first to preserve the richer
    entity registry data where available.
    """
    from .pipeline.seed import parse_networks, seed_networks

    if dry_run:
        networks = parse_networks()
        console.print(f"\n[bold]Dry run:[/bold] {len(networks)} network entries\n")
        for n in networks:
            has_desc = "[green]✓ desc[/green]" if n.get("description") else "[yellow]no desc[/yellow]"
            console.print(f"  {n['name']}  ({has_desc})")
        return

    config = load_config()
    console.print("[bold]Seeding network organizations to Sanity …[/bold]")
    summary = seed_networks(config, dry_run=False)
    console.print(
        f"\n[bold green]Done.[/bold green] "
        f"{summary['written']} written, {summary['failed']} failed "
        f"(of {summary['total']} total)"
    )


@app.command(name="seed-exclusion-clauses")
def seed_exclusion_clauses_cmd(
    dry_run: bool = typer.Option(False, "--dry-run", help="Parse and preview without writing to Sanity"),
):
    """Seed the 6 exclusionClause records from SOGICE_Ontology_v3.0.md Part IV.

    Also seeds 2 missing parent laws (Germany 2020, Canada C-4) that are referenced
    by the exclusion clauses but absent from Entity_Registry_v1.1.md.

    All 6 clauses are flagged with interpretation risks documenting how pro-SOGICE
    actors exploit or contest each exclusion:

      EC-MT-1   Malta 2016          exploration/affirmation carve-out (Grech acquittal)
      EC-DE-1   Germany 2020        ICD-10 §302 disorder-treatment carve-out
      EC-BE-1   Belgium 2023        exploration/affirmation (same risk as Malta)
      EC-CA-1   Canada C-4 (2021)   model clause — 'without favouring' standard
      EC-FR-1   France 2022         youth-transition prudence carve-out (most contested)
      EC-UK-MOU UK MoU              pastoral support exemption (Ozanne loophole)
    """
    from .pipeline.seed import parse_exclusion_clauses, seed_exclusion_clauses

    if dry_run:
        from .pipeline.seed import _MISSING_EXCLUSION_CLAUSE_LAWS
        clauses = parse_exclusion_clauses()
        console.print(f"\n[bold]Dry run:[/bold] {len(clauses)} exclusion clauses + {len(_MISSING_EXCLUSION_CLAUSE_LAWS)} missing parent laws\n")
        console.print("[bold]Missing parent laws to seed:[/bold]")
        for law in _MISSING_EXCLUSION_CLAUSE_LAWS:
            console.print(f"  {law['name']}")
        console.print("\n[bold]Exclusion clauses:[/bold]")
        for c in clauses:
            used = "  [yellow]⚠ used in policy arguments[/yellow]" if c.get("used_in_policy_arguments") else ""
            console.print(f"  EC-{c['id']:<8}  {c['parent_law_id'][:55]}{used}")
        return

    config = load_config()
    console.print("[bold]Seeding exclusion clauses (+ 2 missing parent laws) to Sanity …[/bold]")
    summary = seed_exclusion_clauses(config, dry_run=False)
    console.print(
        f"\n[bold green]Done.[/bold green] "
        f"{summary['written_laws']} laws written, "
        f"{summary['written_clauses']} clauses written, "
        f"{summary['failed']} failed "
        f"(of {summary['total_clauses']} clauses total)"
    )


if __name__ == "__main__":
    app()
