"""
SurvivingSOGICE ingestion runner.

Usage:
  python -m runner ingest <url-or-file>
  python -m runner ingest document.pdf --tier 2 --batch batch-07
  python -m runner ingest recording.mp4 --llm local
  python -m runner ingest document.pdf --llm both
  python -m runner status
  python -m runner upload <doc_id>
  python -m runner export batch-07
  python -m runner embed-test
"""
from typing import Optional
import typer
from rich.console import Console
from rich.panel import Panel

from .config import load_config
from .pipeline import embed  # imported directly so embed-test works without full config
from .pipeline import intake, preprocess, analyze, enrich, review, triage, upload

app = typer.Typer(name="runner", add_completion=False)
console = Console()


@app.command()
def ingest(
    source: str = typer.Argument(..., help="URL, PDF path, video file, SRT, or EPUB"),
    llm: str = typer.Option("claude", help="LLM: claude | local | local-heavy | local-reasoning | litelm | litelm-heavy | litelm-reasoning | openrouter | both | prefer-local | prefer-claude"),
    tier: Optional[int] = typer.Option(None, help="Override auto-assigned tier (1|2|3)"),
    batch: Optional[str] = typer.Option(None, help="Assign to existing batch ID"),
    max_chars: Optional[int] = typer.Option(None, "--max-chars", help="Truncation limit (chars). Use 0 for no limit."),
    yes: bool = typer.Option(False, "--yes", "-y", help="Auto-approve all checkpoints (no interactive prompts)"),
    run_triage: bool = typer.Option(False, "--triage", help="Run fast pre-screen triage to recommend which model to use"),
    run_enrich: bool = typer.Option(False, "--enrich", help="Run Stage 3c enrichment pass after upload"),
    enrich_model: Optional[str] = typer.Option(None, "--enrich-model", help="Override enrichment LiteLLM model name (e.g. core-gemma for Gemma4 second opinion)"),
    source_url: Optional[str] = typer.Option(None, "--source-url", help="For local files: URL where this document was obtained (for provenance tracking)"),
):
    """Full ingestion pipeline: intake → preprocess → embed → classify → review → upload."""
    config = load_config(llm=llm)

    # For local files: prompt for source URL if not given via flag
    if not source.startswith("http") and source_url is None and not yes:
        prompted = typer.prompt(
            "Where was this file obtained? (URL for provenance tracking, Enter to skip)",
            default="",
        ).strip()
        source_url = prompted or None

    # Stage 0.5 — Triage (optional): fast pre-screen to recommend analysis model
    if run_triage and not yes:
        import httpx as _httpx
        snippet = ""
        try:
            if source.startswith("http"):
                snippet = _httpx.get(source, timeout=15, follow_redirects=True).text[:3000]
            else:
                from pathlib import Path as _Path
                snippet = _Path(source).read_text(errors="ignore")[:3000]
        except Exception:
            pass
        if snippet:
            triage_result = triage.run(snippet, config)
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
    intake_result = intake.run(source, tier=tier, batch=batch, config=config,
                               force_doc_id=_force_doc_id, source_url=source_url)
    if not yes and not review.checkpoint_intake(intake_result):
        raise typer.Exit()

    # Stage 2 — Preprocessing
    # URL sources always use the large-model limit (trafilatura output is compact).
    # PDFs/video use the LLM-specific limit.
    if max_chars is not None:
        effective_max = None if max_chars == 0 else max_chars
    elif intake_result.source_type == "url":
        effective_max = config.truncation_limit_local  # webpages: no meaningful truncation
    elif llm in ("local", "local-heavy", "local-reasoning", "prefer-local",
                 "litelm", "litelm-heavy", "litelm-reasoning"):
        effective_max = config.truncation_limit_local
    else:
        effective_max = config.truncation_limit
    preprocess_result = preprocess.run(intake_result, config=config, max_chars=effective_max)
    if not yes and not review.checkpoint_preprocess(preprocess_result):
        raise typer.Exit()

    # Stage 3 — Embedding + Analysis
    # litelm* flags use the Mac Studio's research-embedding model via LiteLLM proxy
    if llm.startswith("litelm"):
        embedding_vector = embed.run_litelm(preprocess_result.text, config=config)
    else:
        embedding_vector = embed.run(preprocess_result.text, config=config)
    analysis_result = analyze.run(preprocess_result, llm=llm, config=config)

    # Stage 4 — Analysis review (Checkpoint 3)
    final_analysis = review.checkpoint_analysis(
        analysis_result, doc_id=intake_result.doc_id, yes=yes
    )
    if final_analysis is None:
        raise typer.Exit()

    # Stage 5 — Upload confirmation (Checkpoint 4)
    confirmed = yes or review.checkpoint_upload(intake_result.doc_id, final_analysis)
    if confirmed:
        upload.run(intake_result, preprocess_result, embedding_vector, final_analysis, config=config)
    else:
        saved_path = upload.save_locally(intake_result, preprocess_result, embedding_vector, final_analysis, config=config)
        console.print(Panel(
            f"Saved locally at [bold]{saved_path}[/bold]\n\n"
            f"Upload later with: [bold]python -m runner upload {intake_result.doc_id}[/bold]",
            title="Saved locally",
        ))

    # Stage 3c — Enrichment (optional, runs after upload)
    if run_enrich:
        enrich_llm = "litelm" if llm.startswith("litelm") else llm
        model_label = enrich_model or config.litelm_enrichment_model
        console.print(f"\n[dim]Running Stage 3c enrichment ({model_label})...[/dim]")
        try:
            enrichment_result = enrich.run(
                intake_result.doc_id, preprocess_result, final_analysis,
                config=config, llm=enrich_llm, enrich_model=enrich_model,
            )
            if yes or review.checkpoint_enrichment(enrichment_result, intake_result.doc_id):
                saved = enrich.save(intake_result.doc_id, enrichment_result, config)
                console.print(f"[green]Enrichment saved → {saved}[/green]")
                history = enrich.list_history(intake_result.doc_id, config)
                if history:
                    console.print(f"[dim]Previous enrichments archived: {len(history)} file(s)[/dim]")
        except Exception as exc:
            console.print(Panel(f"[red]Enrichment failed: {exc}[/red]", title="Stage 3c error"))


@app.command(name="enrich")
def enrich_doc(
    doc_id: str = typer.Argument(..., help="doc_id of an already-ingested document"),
    llm: str = typer.Option("litelm", help="LLM for enrichment: litelm | claude | local"),
    enrich_model: Optional[str] = typer.Option(None, "--enrich-model", help="Override LiteLLM model name (e.g. core-gemma for Gemma4)"),
    second_opinion: bool = typer.Option(False, "--second-opinion", help="Run alternate model for comparison"),
    yes: bool = typer.Option(False, "--yes", "-y", help="Auto-save without review"),
):
    """Run Stage 3c enrichment on a previously ingested document.

    Re-running archives the previous enrichment.json before writing a new one —
    existing researcher decisions are never overwritten.
    """
    import json as _json
    from pathlib import Path as _Path
    config = load_config(llm=llm)
    doc_dir = config.corpus_dir / doc_id

    analysis_path = doc_dir / "analysis.json"
    if not analysis_path.exists():
        console.print(f"[red]No analysis.json found for {doc_id}[/red]")
        raise typer.Exit(1)

    from .models.document import AnalysisResult, PreprocessResult

    analysis = AnalysisResult.model_validate(_json.loads(analysis_path.read_text()))

    # Load preprocess metadata + full text from extracted.txt
    preprocess_path = doc_dir / "preprocess.json"
    text_path       = doc_dir / "extracted.txt"

    text = text_path.read_text(encoding="utf-8") if text_path.exists() else ""
    if not text:
        console.print("[yellow]extracted.txt not found — enrichment will run without document text[/yellow]")

    raw_pre: dict = {}
    if preprocess_path.exists():
        raw_pre = _json.loads(preprocess_path.read_text())

    preprocess = PreprocessResult(
        doc_id=doc_id,
        tool_used=raw_pre.get("tool_used", "unknown"),
        quality=raw_pre.get("quality", "medium"),
        text=text,
        title=raw_pre.get("title", ""),
        author=raw_pre.get("author", ""),
        date_published=raw_pre.get("date_published", ""),
        sitename=raw_pre.get("sitename", ""),
        hostname=raw_pre.get("hostname", ""),
    )

    model_label = enrich_model or config.litelm_enrichment_model
    console.print(f"[dim]Running enrichment on {doc_id} with {llm} / {model_label}...[/dim]")

    existing = enrich.list_history(doc_id, config)
    if existing or (doc_dir / "enrichment.json").exists():
        total = len(existing) + (1 if (doc_dir / "enrichment.json").exists() else 0)
        console.print(f"[dim]{total} previous enrichment run(s) will be archived.[/dim]")

    try:
        enrichment_result = enrich.run(
            doc_id, preprocess, analysis, config=config, llm=llm, enrich_model=enrich_model,
        )
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Enrichment failed"))
        raise typer.Exit(1)

    if yes or review.checkpoint_enrichment(enrichment_result, doc_id):
        saved = enrich.save(doc_id, enrichment_result, config)
        console.print(f"[green]Enrichment saved → {saved}[/green]")
    else:
        console.print("[yellow]Enrichment skipped.[/yellow]")

    # Second-opinion run (separate file, never overwrites enrichment.json)
    if second_opinion:
        console.print(f"[dim]Running second-opinion enrichment ({config.litelm_enrichment_model_alt})...[/dim]")
        try:
            alt_result = enrich.run_second_opinion(doc_id, preprocess, analysis, config)
            alt_path = enrich.save_alt(doc_id, alt_result, config)
            console.print(f"[green]Second opinion saved → {alt_path}[/green]")
        except Exception as exc:
            console.print(f"[yellow]Second-opinion enrichment failed: {exc}[/yellow]")


@app.command()
def status():
    """List documents saved locally that have not yet been uploaded to Sanity."""
    config = load_config()
    upload.list_pending(config)


@app.command()
def upload_doc(
    doc_id: str = typer.Argument(..., help="doc_id of a locally saved document"),
):
    """Upload a locally saved document to Sanity and Supabase."""
    config = load_config()
    upload.upload_saved(doc_id, config)


@app.command(name="export")
def export_batch(
    batch_id: str = typer.Argument(..., help="Batch ID to export"),
):
    """Export all documents in a batch as JSON to exports/{batch_id}/."""
    config = load_config()
    upload.export_batch(batch_id, config)


@app.command(name="verify")
def verify(
    limit: int = typer.Option(10, help="Number of recent records to show from each system"),
):
    """Query Sanity and Supabase directly and print what is actually stored there."""
    config = load_config()
    upload.verify_uploads(limit, config)


@app.command(name="embed-test")
def embed_test():
    """Run a test embedding and print the vector dimension. Do this before Phase 0-B.
    Only needs Ollama running — no API keys required."""
    import os
    from dotenv import load_dotenv
    load_dotenv()

    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("EMBEDDING_MODEL", "qwen3-embedding:8b")

    console.print(f"Testing [bold]{model}[/bold] at [bold]{ollama_url}[/bold] ...")
    try:
        dim = embed.test_dimension(ollama_url, model)
    except Exception as exc:
        if "Connect" in type(exc).__name__:
            console.print(Panel(
                "[red]Cannot connect to Ollama.[/red]\n\n"
                "Start it with: [bold]ollama serve[/bold]\n"
                f"Then pull the model: [bold]ollama pull {model}[/bold]",
                title="Connection error",
            ))
        else:
            console.print(Panel(f"[red]{exc}[/red]", title="Error"))
        raise typer.Exit(1)

    console.print(Panel(
        f"[bold green]{model}  →  {dim} dimensions[/bold green]\n\n"
        f"Record this in CLAUDE.md under Open Questions (Q22):\n"
        f"  {model} output dimension = [bold]{dim}d[/bold]\n\n"
        f"Use [bold]vector({dim})[/bold] when creating the Supabase table.",
        title="Embedding Dimension Test ✓",
    ))


if __name__ == "__main__":
    app()
