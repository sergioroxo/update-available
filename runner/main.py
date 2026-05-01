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
from .pipeline import intake, preprocess, analyze, review, upload

app = typer.Typer(name="runner", add_completion=False)
console = Console()


@app.command()
def ingest(
    source: str = typer.Argument(..., help="URL, PDF path, video file, SRT, or EPUB"),
    llm: str = typer.Option("claude", help="LLM: claude | local | local-heavy | local-reasoning | litelm | litelm-heavy | litelm-reasoning | openrouter | both | prefer-local | prefer-claude"),
    tier: Optional[int] = typer.Option(None, help="Override auto-assigned tier (1|2|3)"),
    batch: Optional[str] = typer.Option(None, help="Assign to existing batch ID"),
    max_chars: Optional[int] = typer.Option(None, "--max-chars", help="Truncation limit in characters (overrides .env). Use 0 for no truncation."),
    yes: bool = typer.Option(False, "--yes", "-y", help="Auto-approve all checkpoints (no interactive prompts)"),
):
    """Full ingestion pipeline: intake → preprocess → embed → classify → review → upload."""
    config = load_config(llm=llm)

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
                               force_doc_id=_force_doc_id)
    if not yes and not review.checkpoint_intake(intake_result):
        raise typer.Exit()

    # Stage 2 — Preprocessing
    # max_chars=0 means no truncation; None means pick from config by LLM mode
    if max_chars is not None:
        effective_max = None if max_chars == 0 else max_chars
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
