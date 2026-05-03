"""
SurvivingSOGICE ingestion runner.

Usage:
  python -m runner ingest <url-or-file>
  python -m runner ingest document.pdf --tier 2 --batch batch-07
  python -m runner ingest recording.mp4 --llm local
  python -m runner ingest document.pdf --llm both
  python -m runner status
  python -m runner upload-doc <doc_id>
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
    source_url: Optional[str] = typer.Option(None, "--source-url", help="Original/provenance URL for a local file"),
    max_chars: Optional[int] = typer.Option(None, "--max-chars", help="Truncation limit in characters (overrides .env). Use 0 for no truncation."),
    yes: bool = typer.Option(False, "--yes", "-y", help="Auto-approve all checkpoints (no interactive prompts)"),
    run_triage: bool = typer.Option(False, "--triage", help="Run fast pre-screen triage to recommend which model to use"),
    run_enrich: bool = typer.Option(False, "--enrich", help="Run Stage 3c enrichment pass after upload (lexicon + entity proposals)"),
    enrich_model: Optional[str] = typer.Option(None, "--enrich-model", help="LiteLLM model alias for enrichment, e.g. lexicon-llm or core-gemma"),
    second_opinion: bool = typer.Option(False, "--second-opinion", help="Also run alternate enrichment model and save a comparison file"),
):
    """Full ingestion pipeline: intake → preprocess → embed → classify → review → upload."""
    config = load_config(llm=llm)

    # Stage 0.5 — Triage (optional): fast pre-screen to recommend analysis model
    if run_triage and not yes:
        snippet = ""
        try:
            snippet, note = triage.extract_snippet(source)
            console.print(f"[dim]{note}[/dim]")
        except Exception as exc:
            console.print(f"[yellow]Triage snippet extraction failed: {exc}[/yellow]")
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

    # Stage 2 — Preprocessing
    # max_chars=0 means no truncation; None means pick from config by LLM mode
    if max_chars is not None:
        effective_max = None if max_chars == 0 else max_chars
    elif intake_result.source_type == "url":
        effective_max = None
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

    # Stage 5 — Testimony consent gate + upload confirmation (Checkpoint 4)
    consent_status = review.checkpoint_testimony_consent(
        intake_result.doc_id, final_analysis, config
    )
    if consent_status == "refused":
        raise typer.Exit()
    if consent_status in {"confirmed", "pending"}:
        intake_result.testimony_consent = consent_status
    if consent_status == "pending":
        saved_path = upload.save_locally(
            intake_result, preprocess_result, embedding_vector, final_analysis,
            config=config, llm_used=llm,
        )
        console.print(Panel(
            f"Saved locally at [bold]{saved_path}[/bold]\n\n"
            "Testimony consent is pending. Upload is blocked until consent is confirmed.",
            title="Saved locally — consent pending",
        ))
        confirmed = False
    else:
        confirmed = yes or review.checkpoint_upload(intake_result.doc_id, final_analysis)
    if confirmed:
        upload.run(
            intake_result, preprocess_result, embedding_vector, final_analysis,
            config=config, llm_used=llm,
        )
    elif consent_status != "pending":
        saved_path = upload.save_locally(
            intake_result, preprocess_result, embedding_vector, final_analysis,
            config=config, llm_used=llm,
        )
        console.print(Panel(
            f"Saved locally at [bold]{saved_path}[/bold]\n\n"
            f"Upload later with: [bold]python -m runner upload-doc {intake_result.doc_id}[/bold]",
            title="Saved locally",
        ))

    # Stage 3c — Enrichment (optional, runs after upload)
    if run_enrich and confirmed:
        console.print("\n[dim]Running Stage 3c enrichment pass...[/dim]")
        enrich_llm = "litelm" if llm.startswith("litelm") else llm
        try:
            enrichment_result = enrich.run(
                intake_result.doc_id, preprocess_result, final_analysis,
                config=config, llm=enrich_llm, model=enrich_model,
            )
            if yes or review.checkpoint_enrichment(enrichment_result, intake_result.doc_id):
                saved = enrich.save(intake_result.doc_id, enrichment_result, config)
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
    try:
        enrichment_result = enrich.run(doc_id, preprocess, analysis, config=config, llm=llm, model=model)
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Enrichment failed"))
        raise typer.Exit(1)

    if yes or review.checkpoint_enrichment(enrichment_result, doc_id):
        saved = enrich.save(doc_id, enrichment_result, config)
        console.print(f"[green]Enrichment saved → {saved}[/green]")
        if second_opinion and llm.startswith("litelm"):
            alt_model = config.litelm_enrichment_model_alt
            alt = enrich.run(doc_id, preprocess, analysis, config=config, llm=llm, model=alt_model)
            alt_saved = enrich.save_alt(doc_id, alt, config, label=alt_model.replace("/", "-"))
            console.print(f"[green]Second-opinion enrichment saved → {alt_saved}[/green]")
    else:
        console.print("[yellow]Enrichment skipped.[/yellow]")


@app.command()
def status(
    doc_id: Optional[str] = typer.Argument(None, help="Optional doc_id for a detailed pipeline trace"),
):
    """List pending documents, or show a detailed status trace for one document."""
    config = load_config()
    if doc_id:
        upload.print_document_status(doc_id, config)
    else:
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
    except RuntimeError as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Migration failed"))
        raise typer.Exit(1)
    console.print(
        "[yellow]Migration complete. Existing embeddings were dropped; re-run ingestion/upload or re-embed documents.[/yellow]"
    )


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
