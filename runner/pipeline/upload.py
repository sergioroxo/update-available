"""
Stage 5 — Upload and export.

After researcher approval at Checkpoint 4:
  1. Save full document package locally (always happens first)
  2. Write Sanity document record (workflowStatus: unverified)
  3. Insert/update Supabase document_embeddings row
  4. Write sanity_record.json locally

Sanity writes use httpx via clients/sanity.py.
Supabase writes use supabase-py via clients/supabase.py.
"""
from __future__ import annotations
import json
from pathlib import Path

from rich.console import Console
from rich.table import Table

from ..config import Config
from ..models.document import AnalysisResult, DocumentPackage, IntakeResult, PreprocessResult
from ..clients import sanity as sanity_client
from ..clients import supabase as supabase_client

console = Console()


def run(
    intake: IntakeResult,
    preprocess: PreprocessResult,
    embedding: list[float],
    analysis: AnalysisResult,
    config: Config,
) -> None:
    pkg = DocumentPackage(
        intake=intake,
        preprocess=preprocess,
        analysis=analysis,
        embedding=embedding,
        embedding_model=config.embedding_model,
        llm_used=config.claude_model,
        local_dir=config.corpus_dir / intake.doc_id,
    )
    save_locally(intake, preprocess, embedding, analysis, config)
    sanity_id = sanity_client.write_document(pkg, config)
    supabase_client.upsert_embedding(intake.doc_id, embedding, analysis, config)

    # Record that this doc was uploaded
    (config.corpus_dir / intake.doc_id / "sanity_record.json").write_text(
        json.dumps({"sanity_id": sanity_id, "doc_id": intake.doc_id}, indent=2),
        encoding="utf-8",
    )
    _write_audit_event(config.corpus_dir / intake.doc_id, "uploaded")
    console.print(f"[green]Uploaded[/green] → Sanity: {sanity_id}")


def save_locally(
    intake: IntakeResult,
    preprocess: PreprocessResult,
    embedding: list[float],
    analysis: AnalysisResult,
    config: Config,
) -> Path:
    """Write all artifacts to ~/survivingsogice/corpus/{doc_id}/. Always called before upload."""
    doc_dir = config.corpus_dir / intake.doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)

    (doc_dir / "analysis.json").write_text(
        analysis.model_dump_json(indent=2), encoding="utf-8"
    )
    (doc_dir / "embedding.json").write_text(
        json.dumps({
            "model":     config.embedding_model,
            "dimension": len(embedding),
            "vector":    embedding,
        }, indent=2),
        encoding="utf-8",
    )
    # intake.json is written by intake.run() and patched by preprocess.run() —
    # do not overwrite it here; that would drop source_url, original_filename,
    # source_html_sha256, and ingested_at which were set earlier in the pipeline.
    _write_audit_event(doc_dir, "saved_locally")
    return doc_dir


def list_pending(config: Config) -> None:
    """Print all local documents that have no sanity_record.json (not yet uploaded)."""
    pending = [
        d for d in config.corpus_dir.iterdir()
        if d.is_dir() and not (d / "sanity_record.json").exists()
        and (d / "analysis.json").exists()
    ]
    if not pending:
        console.print("[green]No pending documents.[/green]")
        return

    table = Table(title=f"Pending upload ({len(pending)} documents)")
    table.add_column("doc_id")
    table.add_column("type")
    table.add_column("confidence")
    table.add_column("batch")

    for doc_dir in sorted(pending):
        try:
            data = json.loads((doc_dir / "analysis.json").read_text())
            intake_data = {}
            if (doc_dir / "intake.json").exists():
                intake_data = json.loads((doc_dir / "intake.json").read_text())
            table.add_row(
                doc_dir.name,
                data.get("type", "?"),
                str(data.get("confidence", {}).get("overall_score", "?")),
                intake_data.get("batch_id", "?"),
            )
        except Exception:
            table.add_row(doc_dir.name, "?", "?", "?")

    console.print(table)


def upload_saved(doc_id: str, config: Config) -> None:
    """Load a locally saved document and upload it to Sanity + Supabase."""
    doc_dir = config.corpus_dir / doc_id
    if not doc_dir.exists():
        console.print(f"[red]No local document found for doc_id: {doc_id}[/red]")
        return

    analysis_path = doc_dir / "analysis.json"
    embedding_path = doc_dir / "embedding.json"
    intake_path    = doc_dir / "intake.json"

    if not analysis_path.exists():
        console.print(f"[red]Missing analysis.json for {doc_id}[/red]")
        return

    analysis = AnalysisResult.model_validate_json(analysis_path.read_text())
    embedding = json.loads(embedding_path.read_text())["vector"] if embedding_path.exists() else []

    intake_data = {}
    if intake_path.exists():
        intake_data = json.loads(intake_path.read_text())

    from ..models.document import IntakeResult as _IR, PreprocessResult as _PR
    intake = _IR(
        doc_id=doc_id,
        source=intake_data.get("source", ""),
        source_type=intake_data.get("source_type", "url"),  # type: ignore[arg-type]
        declared_type=intake_data.get("source_type", "url"),
        tier=intake_data.get("tier", 1),
        batch_id=intake_data.get("batch_id", "unassigned"),
        language=None,
        archive_url=intake_data.get("archive_url"),
        local_dir=doc_dir,
    )
    preprocess = _PR(
        doc_id=doc_id,
        tool_used="unknown",
        quality="high",
        text="",
    )

    pkg = DocumentPackage(
        intake=intake,
        preprocess=preprocess,
        analysis=analysis,
        embedding=embedding,
        embedding_model=config.embedding_model,
        llm_used="unknown",
        local_dir=doc_dir,
    )

    sanity_id = sanity_client.write_document(pkg, config)
    if embedding:
        supabase_client.upsert_embedding(doc_id, embedding, analysis, config)

    (doc_dir / "sanity_record.json").write_text(
        json.dumps({"sanity_id": sanity_id, "doc_id": doc_id}, indent=2),
        encoding="utf-8",
    )
    _write_audit_event(doc_dir, "uploaded")
    console.print(f"[green]Uploaded {doc_id}[/green] → Sanity: {sanity_id}")


def export_batch(batch_id: str, config: Config) -> None:
    """Export all documents in a batch as JSON to exports/{batch_id}/."""
    export_dir = config.exports_dir / batch_id
    export_dir.mkdir(parents=True, exist_ok=True)

    docs = []
    for doc_dir in sorted(config.corpus_dir.iterdir()):
        if not doc_dir.is_dir():
            continue
        intake_path = doc_dir / "intake.json"
        if not intake_path.exists():
            continue
        intake_data = json.loads(intake_path.read_text())
        if intake_data.get("batch_id") != batch_id:
            continue
        analysis_path = doc_dir / "analysis.json"
        if analysis_path.exists():
            docs.append(json.loads(analysis_path.read_text()))

    if not docs:
        console.print(f"[yellow]No documents found for batch: {batch_id}[/yellow]")
        return

    out_path = export_dir / f"{batch_id}.jsonl"
    with out_path.open("w", encoding="utf-8") as f:
        for doc in docs:
            f.write(json.dumps(doc) + "\n")

    console.print(f"[green]Exported {len(docs)} documents → {out_path}[/green]")


def verify_uploads(limit: int, config: Config) -> None:
    """Query Sanity and Supabase directly and print what's actually stored there."""
    import httpx

    console.print("\n[bold]Checking Sanity...[/bold]")
    sanity_docs: list[dict] = []
    try:
        query = (
            f'*[_type == "sogiceDocument"] | order(_createdAt desc)[0..{limit - 1}]'
            '{ _id, "docType": classification.type, workflowStatus, _createdAt, "sourceUrl": meta.sourceUrl }'
        )
        url = (
            f"https://{config.sanity_project_id}.api.sanity.io"
            f"/v2024-01-01/data/query/{config.sanity_dataset}"
        )
        r = httpx.get(
            url,
            params={"query": query},
            headers={"Authorization": f"Bearer {config.sanity_write_token}"},
            timeout=10,
        )
        r.raise_for_status()
        sanity_docs = r.json().get("result", [])
    except Exception as exc:
        console.print(f"[red]Sanity query failed: {exc}[/red]")

    console.print("\n[bold]Checking Supabase...[/bold]")
    supabase_rows: list[dict] = []
    try:
        from supabase import create_client
        sb = create_client(config.supabase_url, config.supabase_service_key)
        resp = (
            sb.table("document_embeddings")
            .select("doc_id, doc_type, scope")
            .limit(limit)
            .execute()
        )
        supabase_rows = resp.data or []
    except Exception as exc:
        console.print(f"[red]Supabase query failed: {exc}[/red]")

    # --- Sanity table ---
    if sanity_docs:
        t = Table(title=f"Sanity — last {len(sanity_docs)} sogiceDocuments")
        t.add_column("_id", style="dim")
        t.add_column("type")
        t.add_column("status")
        t.add_column("created")
        t.add_column("source", overflow="fold")
        for d in sanity_docs:
            created = (d.get("_createdAt") or "")[:19].replace("T", " ")
            t.add_row(
                d.get("_id", ""),
                d.get("docType", "?"),
                d.get("workflowStatus", "?"),
                created,
                d.get("sourceUrl", ""),
            )
        console.print(t)
    else:
        console.print("[yellow]No documents found in Sanity.[/yellow]")

    # --- Supabase table ---
    if supabase_rows:
        t2 = Table(title=f"Supabase — last {len(supabase_rows)} embeddings")
        t2.add_column("doc_id")
        t2.add_column("type")
        t2.add_column("scope")
        for row in supabase_rows:
            t2.add_row(row.get("doc_id", ""), row.get("doc_type", "?"), row.get("scope", "?"))
        console.print(t2)
    else:
        console.print("[yellow]No rows found in Supabase document_embeddings.[/yellow]")

    # --- Cross-check: in Sanity but not Supabase ---
    sanity_ids = {d["_id"].replace("doc-", "") for d in sanity_docs}
    supa_ids   = {r["doc_id"] for r in supabase_rows}
    missing_in_supa = sanity_ids - supa_ids
    if missing_in_supa:
        console.print(
            f"\n[yellow]In Sanity but missing from Supabase:[/yellow] "
            + ", ".join(sorted(missing_in_supa))
        )
    else:
        console.print("\n[green]✓ All Sanity records also present in Supabase.[/green]")


def _write_audit_event(doc_dir: Path, event: str) -> None:
    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).isoformat()
    with (doc_dir / "audit.log").open("a", encoding="utf-8") as f:
        f.write(f"{ts} {event}\n")
