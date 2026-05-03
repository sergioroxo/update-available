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
    llm: str = typer.Option("litelm", help="LLM: litelm | litelm-heavy | litelm-reasoning | claude | local | local-heavy | local-reasoning | openrouter | both | prefer-local | prefer-claude"),
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


@app.command(name="reanalyze")
def reanalyze_doc(
    doc_id: str = typer.Argument(..., help="doc_id of an already-ingested document"),
    llm: str = typer.Option("litelm", help="LLM to use: litelm | litelm-heavy | claude | local"),
    upload_after: bool = typer.Option(False, "--upload", help="Upload to Sanity + Supabase after saving"),
    yes: bool = typer.Option(False, "--yes", "-y", help="Auto-accept result without review"),
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

    console.print(f"[dim]Re-analysing {doc_id} with {llm}...[/dim]")
    try:
        new_analysis = analyze.run(preprocess, llm=llm, config=config)
    except Exception as exc:
        console.print(Panel(f"[red]{exc}[/red]", title="Analysis failed"))
        raise typer.Exit(1)

    final = review.checkpoint_analysis(new_analysis, doc_id=doc_id, yes=yes)
    if final is None:
        console.print("[yellow]Aborted — previous analysis archive kept.[/yellow]")
        raise typer.Exit()

    analysis_path.write_text(final.model_dump_json(indent=2), encoding="utf-8")
    console.print(f"[green]analysis.json updated for {doc_id}[/green]")

    if upload_after:
        upload.upload_saved(doc_id, config)


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


@app.command(name="push-enrichment")
def push_enrichment(
    doc_id: str = typer.Argument(..., help="doc_id of a document with an enrichment.json"),
):
    """Push all approved (not yet sent) lexicon/entity proposals from enrichment.json to Sanity."""
    config = load_config()
    try:
        result = enrich.push_approved_to_sanity(doc_id, config)
    except FileNotFoundError as exc:
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(1)

    if result["lexicon"] or result["entities"]:
        console.print(
            f"[green]Pushed {result['lexicon']} lexicon entr{'y' if result['lexicon'] == 1 else 'ies'} "
            f"and {result['entities']} entit{'y' if result['entities'] == 1 else 'ies'} to Sanity.[/green]"
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
    litelm_url = os.getenv("LITELM_BASE_URL", "")
    litelm_key = os.getenv("LITELM_API_KEY", "")
    litelm_placeholder = litelm_key in ("", "sk-local-research-key-change-this")
    if not litelm_url:
        fail("LiteLLM proxy", "LITELM_BASE_URL not set — primary analysis path unavailable.\nAdd the Mac Studio Tailscale URL to .env")
    else:
        try:
            import httpx as _httpx
            r = _httpx.get(f"{litelm_url}/health", timeout=5,
                           headers={"Authorization": f"Bearer {litelm_key}"})
            r.raise_for_status()
            ok("LiteLLM proxy", f"Reachable at {litelm_url}")
        except Exception as exc:
            fail("LiteLLM proxy", f"Not reachable at {litelm_url}: {type(exc).__name__}\nIs the Mac Studio on Tailscale and LiteLLM running?")

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
            err = str(exc)
            if "does not exist" in err or "42P01" in err:
                fail("Supabase document_embeddings", "Table not found. Run: python -m runner migrate-supabase --confirm")
            else:
                fail("Supabase document_embeddings", f"Query failed: {err[:120]}")

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
            "  [bold]cd runner && streamlit run app.py[/bold]",
            title="Ready ✓",
        ))
    else:
        console.print(Panel(
            f"[red]{len(failures)} check(s) failed.[/red] Fix the items marked ✗ above before ingesting.",
            title="[red]Not ready[/red]",
        ))
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
