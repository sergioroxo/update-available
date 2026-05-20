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
import socket
import time as _time
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
import typer

from ..config import Config
from ..models.document import AnalysisResult, DocumentPackage, IntakeResult, PageIntelligence, PreprocessResult
from ..clients import sanity as sanity_client
from ..clients import supabase as supabase_client
from .analyze import PROMPT_VERSION
from .doc_ids import resolve_doc_dir
from .preprocess import _preprocess_metadata, repair_preprocess_metadata
from .metadata_quality import archival_issues, date_parts, publication_metadata

_ONTOLOGY_VERSION = "v3.0"

console = Console()


class _EmbeddingStatusCache:
    """Simple TTL cache for Supabase embedding status checks.
    Prevents repeated round-trips for the same doc in a single session."""
    _TTL = 300  # seconds (5 minutes)

    def __init__(self):
        self._store: dict[str, tuple[float, dict]] = {}

    def get(self, doc_id: str) -> dict | None:
        if doc_id in self._store:
            ts, val = self._store[doc_id]
            if _time.monotonic() - ts < self._TTL:
                return val
        return None

    def set(self, doc_id: str, value: dict) -> None:
        self._store[doc_id] = (_time.monotonic(), value)

    def invalidate(self, doc_id: str) -> None:
        self._store.pop(doc_id, None)


_embedding_status_cache = _EmbeddingStatusCache()


def _stamp_analysis_dict(analysis: AnalysisResult) -> dict:
    """Return the analysis model dict with prompt_version + ontology_version stamped in.

    Use this everywhere analysis.json is written so provenance is consistent
    whether the write comes from initial ingest, reanalyze, second-opinion, or
    upload-saved date repair.
    """
    data = json.loads(analysis.model_dump_json())
    data["prompt_version"] = PROMPT_VERSION
    data["ontology_version"] = _ONTOLOGY_VERSION
    return data

# Types that require explicit consent before upload is allowed.
# Single source of truth — imported by app.py.
_CONSENT_GATED_TYPES: frozenset[str] = frozenset({"Testimony", "Survivor-Network-Material"})


def requires_consent_gate(analysis: AnalysisResult) -> bool:
    """Return True if this document type requires a consent gate before upload."""
    if analysis.testimony_flag:
        return True
    types = {analysis.type, analysis.primary_type, analysis.secondary_type}
    return bool(types & _CONSENT_GATED_TYPES)


def run(
    intake: IntakeResult,
    preprocess: PreprocessResult,
    embedding: list[float],
    analysis: AnalysisResult,
    config: Config,
    llm_used: str,
) -> None:
    _enforce_testimony_upload_gate(intake, analysis)
    _repair_analysis_date_from_source(analysis, preprocess)
    pkg = DocumentPackage(
        intake=intake,
        preprocess=preprocess,
        analysis=analysis,
        embedding=embedding,
        embedding_model=config.embedding_model,
        llm_used=llm_used,
        local_dir=config.corpus_dir / intake.doc_id,
    )
    save_locally(intake, preprocess, embedding, analysis, config, llm_used=llm_used)
    sanity_id = sanity_client.write_document(pkg, config)
    if embedding:
        supabase_client.upsert_embedding(
            intake.doc_id,
            embedding,
            analysis,
            config,
            tier=str(intake.tier),
            language=intake.language or preprocess.language_detected or "",
            embedding_model=config.embedding_model,
        )
    else:
        console.print(
            f"[yellow]No embedding vector for {intake.doc_id}; uploaded Sanity record only. "
            "Generate/push embedding later from Activity Log.[/yellow]"
        )

    # Record that this doc was uploaded
    (config.corpus_dir / intake.doc_id / "sanity_record.json").write_text(
        json.dumps(_sanity_record_payload(sanity_id, intake, preprocess), indent=2),
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
    llm_used: str = "unknown",
    embedding_model: str | None = None,   # explicit embedding model name
) -> Path:
    """Write all artifacts to ~/survivingsogice/corpus/{doc_id}/. Always called before upload."""
    doc_dir = config.corpus_dir / intake.doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)

    _embedding_model_name = embedding_model or config.embedding_model

    (doc_dir / "analysis.json").write_text(
        json.dumps(_stamp_analysis_dict(analysis), indent=2), encoding="utf-8"
    )
    (doc_dir / "embedding.json").write_text(
        json.dumps({
            "model":     _embedding_model_name,
            "dimension": len(embedding),
            "vector":    embedding,
        }, indent=2),
        encoding="utf-8",
    )
    _merge_intake_metadata(doc_dir / "intake.json", intake, preprocess)
    if preprocess.markdown:
        (doc_dir / "extracted.md").write_text(preprocess.markdown, encoding="utf-8")
    (doc_dir / "extracted.txt").write_text(preprocess.text, encoding="utf-8")
    (doc_dir / "preprocess.json").write_text(
        json.dumps(_preprocess_metadata(preprocess), indent=2),
        encoding="utf-8",
    )
    from datetime import datetime, timezone
    (doc_dir / "metadata.json").write_text(
        json.dumps({
            "llm_used": llm_used,
            "embedding_model": _embedding_model_name,
            "saved_at": datetime.now(timezone.utc).isoformat(),
        }, indent=2),
        encoding="utf-8",
    )
    _write_audit_event(doc_dir, "saved_locally")
    return doc_dir


def list_pending(config: Config, limit: int | None = None) -> None:
    """Print all local documents that have no sanity_record.json (not yet uploaded)."""
    pending: list[Path] = []
    partial: list[Path] = []
    incomplete: list[Path] = []
    for doc_dir in config.corpus_dir.iterdir():
        if limit is not None and len(pending) + len(partial) >= limit:
            break
        if not doc_dir.is_dir() or (doc_dir / "sanity_record.json").exists():
            continue
        if (doc_dir / "analysis.json").exists():
            pending.append(doc_dir)
            if not (doc_dir / "extracted.txt").exists():
                incomplete.append(doc_dir)
        elif (doc_dir / "intake.json").exists():
            partial.append(doc_dir)

    if limit is not None and len(pending) + len(partial) >= limit:
        console.print(f"[dim](Scan limited to first {limit} results)[/dim]")

    if not pending and not partial:
        console.print("[green]No pending or partial documents.[/green]")
        return

    if pending:
        table = Table(title=f"Pending upload ({len(pending)} documents)")
        table.add_column("doc_id")
        table.add_column("type")
        table.add_column("confidence")
        table.add_column("batch")
        table.add_column("text")

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
                    "ok" if (doc_dir / "extracted.txt").exists() else "missing extracted.txt",
                )
            except Exception:
                table.add_row(doc_dir.name, "?", "?", "?", "unknown")
        console.print(table)

    if partial:
        partial_table = Table(title=f"Partial intake runs ({len(partial)} documents)")
        partial_table.add_column("doc_id")
        partial_table.add_column("source", overflow="fold")
        partial_table.add_column("batch")
        for doc_dir in sorted(partial):
            try:
                intake_data = json.loads((doc_dir / "intake.json").read_text())
                partial_table.add_row(
                    doc_dir.name,
                    intake_data.get("source", ""),
                    intake_data.get("batch_id", "?"),
                )
            except Exception:
                partial_table.add_row(doc_dir.name, "?", "?")
        console.print(partial_table)

    if incomplete:
        console.print(
            "[yellow]Warning: some pending documents are missing extracted.txt; "
            "deferred upload/enrichment will have incomplete text provenance.[/yellow]"
        )


def inspect_document_status(doc_id: str, config: Config) -> dict:
    """Return a human-readable pipeline trace for one local document."""
    doc_id, doc_dir = resolve_doc_dir(doc_id, config)
    status = {
        "doc_id": doc_id,
        "exists": doc_dir.exists(),
        "doc_dir": str(doc_dir),
        "stages": [],
        "summary": {},
        "next_action": "",
        "warnings": [],
    }
    if not doc_dir.exists():
        status["next_action"] = "No local folder found. Check the doc_id or ingest the source first."
        return status

    intake = _read_json(doc_dir / "intake.json")
    preprocess_meta = repair_preprocess_metadata(
        _read_json(doc_dir / "preprocess.json"),
        doc_dir=doc_dir,
        base_url=intake.get("source") or intake.get("source_url", ""),
    )
    analysis = _read_json(doc_dir / "analysis.json")
    metadata = _read_json(doc_dir / "metadata.json")
    sanity_record = _read_json(doc_dir / "sanity_record.json")
    enrichment = _read_json(doc_dir / "enrichment.json")
    testimony_review = _read_json(doc_dir / "testimony_review.json")

    extracted = doc_dir / "extracted.txt"
    source_html = doc_dir / "source.html"
    local_copy = Path(intake.get("local_copy_path", "")) if intake.get("local_copy_path") else None

    def stage(name: str, ok: bool | None, detail: str = "") -> None:
        status["stages"].append({"stage": name, "ok": ok, "detail": detail})

    stage("Intake", bool(intake), _source_summary(intake))
    source_is_remote = str(intake.get("source") or "").startswith(("http://", "https://"))
    stage(
        "Source Copy",
        bool(local_copy and local_copy.exists()) if not source_is_remote else None,
        str(local_copy or "not applicable"),
    )
    stage(
        "HTML Snapshot",
        source_html.exists() if intake.get("source_type") == "url" else None,
        _snapshot_summary(doc_dir, preprocess_meta, intake),
    )
    stage("Preprocess Metadata", bool(preprocess_meta), _preprocess_summary(preprocess_meta))
    stage("Extracted Text", extracted.exists(), _text_summary(extracted))
    stage("Analysis", bool(analysis), _analysis_summary(analysis))
    embedding_status = _embedding_status(doc_dir, config)
    stage("Embedding", embedding_status["ok"], embedding_status["detail"])
    supabase_stage_ok = embedding_status["supabase_ok"]
    if embedding_status.get("supabase_state") in {"unreachable", "not_configured", "not_checked"}:
        supabase_stage_ok = None
    stage("Supabase", supabase_stage_ok, embedding_status["supabase_detail"])
    stage("Upload", bool(sanity_record), sanity_record.get("sanity_id", "not uploaded"))
    stage("Enrichment", bool(enrichment), _enrichment_summary(enrichment))
    stage(
        "Testimony Review",
        bool(testimony_review) if analysis.get("testimony_flag") else None,
        testimony_review.get("consent_status", "not applicable"),
    )

    status["summary"] = {
        "source": intake.get("source", ""),
        "source_url": intake.get("source_url", ""),
        "batch": intake.get("batch_id", ""),
        "type": analysis.get("type", ""),
        "confidence": analysis.get("confidence", {}).get("overall_score", ""),
        "uploaded": bool(sanity_record),
        "embedding_ok": embedding_status["ok"],
        "supabase_ok": embedding_status["supabase_ok"],
        "supabase_state": embedding_status.get("supabase_state", "not_checked"),
        "enriched": bool(enrichment),
    }

    if preprocess_meta and not extracted.exists():
        status["warnings"].append("preprocess.json exists but extracted.txt is missing; deferred enrichment/upload has no canonical text.")
    if source_html.exists() and not (preprocess_meta.get("source_html_sha256") or intake.get("source_html_sha256")):
        status["warnings"].append("source.html exists but no SHA-256 is recorded in preprocess/intake metadata.")
    if analysis.get("testimony_flag") and not testimony_review:
        status["warnings"].append("analysis marks testimony_flag=true but testimony_review.json is missing.")
    if not embedding_status["ok"]:
        status["warnings"].append("embedding is missing or empty; generate it before treating the record as complete.")
    elif sanity_record and embedding_status.get("supabase_state") == "missing":
        status["warnings"].append("Sanity record exists but Supabase embedding row was not found; regenerate/push embedding.")
    elif sanity_record and embedding_status.get("supabase_state") == "unreachable":
        status["warnings"].append("Sanity record exists but Supabase could not be reached; retry status when the network/service is available.")
    if enrichment:
        gate = _enrichment_gate(enrichment)
        if gate:
            status["warnings"].append(gate)
    for issue in archival_issues(analysis, preprocess_meta, intake):
        status["warnings"].append(
            f"{issue['severity']}: {issue['field']} — {issue['message']} {issue.get('suggestion', '')}".strip()
        )

    status["next_action"] = _next_action(status)
    return status


def print_document_status(doc_id: str, config: Config) -> None:
    """Print one document's pipeline trace."""
    status = inspect_document_status(doc_id, config)
    if not status["exists"]:
        console.print(f"[red]{status['next_action']}[/red]")
        return

    summary = status["summary"]
    lines = [
        f"Folder: {status['doc_dir']}",
        f"Source: {summary.get('source') or 'unknown'}",
    ]
    if summary.get("source_url"):
        lines.append(f"Source URL: {summary['source_url']}")
    if summary.get("type"):
        lines.append(f"Analysis type: {summary['type']}  confidence={summary.get('confidence') or '?'}")
    console.print(Panel("\n".join(lines), title=f"[bold]Document Status — {doc_id}[/bold]"))

    table = Table(title="Pipeline Trace")
    table.add_column("Stage")
    table.add_column("Status")
    table.add_column("Detail", overflow="fold")
    for item in status["stages"]:
        if item["ok"] is None:
            label = "[dim]n/a[/dim]"
        else:
            label = "[green]ok[/green]" if item["ok"] else "[yellow]missing[/yellow]"
        table.add_row(
            item["stage"],
            label,
            item["detail"],
        )
    console.print(table)

    if status["warnings"]:
        console.print(Panel("\n".join(f"• {w}" for w in status["warnings"]), title="[yellow]Warnings[/yellow]"))
    console.print(Panel(status["next_action"], title="[bold]Next Action[/bold]"))


def _read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _source_summary(intake: dict) -> str:
    if not intake:
        return "missing intake.json"
    parts = [intake.get("source_type", "unknown"), intake.get("batch_id", "")]
    if intake.get("wayback_status"):
        parts.append(f"Wayback={intake['wayback_status']}")
    return " | ".join(p for p in parts if p)


def _snapshot_summary(doc_dir: Path, preprocess_meta: dict, intake: dict) -> str:
    snapshot = doc_dir / "source.html"
    if not snapshot.exists():
        return "not present"
    sha = preprocess_meta.get("source_html_sha256") or intake.get("source_html_sha256")
    return f"{snapshot.name}, sha256={sha[:12] + '...' if sha else 'missing'}"


def _preprocess_summary(preprocess_meta: dict) -> str:
    if not preprocess_meta:
        return "missing preprocess.json"
    return (
        f"{preprocess_meta.get('tool_used', '?')} | "
        f"quality={preprocess_meta.get('quality', '?')} | "
        f"chars={preprocess_meta.get('char_count', '?')}"
    )


def _text_summary(path: Path) -> str:
    if not path.exists():
        return "missing extracted.txt"
    return f"{path.stat().st_size:,} bytes"


def _embedding_status(doc_dir: Path, config: Config) -> dict:
    cached = _embedding_status_cache.get(str(doc_dir))
    if cached is not None:
        return cached

    path = doc_dir / "embedding.json"
    status = {
        "ok": False,
        "detail": "missing embedding.json",
        "dimension": 0,
        "supabase_ok": False,
        "supabase_detail": "not checked",
        "supabase_state": "not_checked",
    }
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            vector = data.get("vector") or []
            dim = int(data.get("dimension") or len(vector))
            status["dimension"] = dim
            status["ok"] = bool(vector) and dim > 0
            status["detail"] = f"{data.get('model', '')} | dimension={dim}"
            if not status["ok"]:
                status["detail"] += " | empty vector"
        except Exception as exc:
            status["detail"] = f"invalid embedding.json: {exc}"

    try:
        from ..clients.supabase import _client as _sb_client

        result = (
            _sb_client(config)
            .table("document_embeddings")
            .select("doc_id,embedding_model")
            .eq("doc_id", doc_dir.name)
            .limit(1)
            .execute()
        )
        if result.data:
            status["supabase_ok"] = True
            status["supabase_state"] = "present"
            status["supabase_detail"] = result.data[0].get("embedding_model") or "row found"
        else:
            status["supabase_state"] = "missing"
            status["supabase_detail"] = "no row found"
    except (socket.gaierror, TimeoutError, ConnectionError) as exc:
        status["supabase_state"] = "unreachable"
        status["supabase_detail"] = f"unreachable: {exc}"
    except Exception as exc:
        if _looks_like_network_error(exc):
            status["supabase_state"] = "unreachable"
            status["supabase_detail"] = f"unreachable: {exc}"
        else:
            status["supabase_state"] = "error"
            status["supabase_detail"] = f"check failed: {exc}"
    _embedding_status_cache.set(str(doc_dir), status)
    return status


def _looks_like_network_error(exc: Exception) -> bool:
    text = str(exc).lower()
    name = type(exc).__name__.lower()
    return any(
        marker in text or marker in name
        for marker in (
            "nodename nor servname",
            "name or service not known",
            "temporary failure in name resolution",
            "connection refused",
            "connecterror",
            "timeout",
            "network",
            "dns",
        )
    )


def _analysis_summary(analysis: dict) -> str:
    if not analysis:
        return "missing analysis.json"
    warnings = analysis.get("normalisation_warnings") or []
    suffix = f" | corrections={len(warnings)}" if warnings else ""
    return f"{analysis.get('type', '?')} | {analysis.get('format', '?')}{suffix}"


def _enrichment_summary(enrichment: dict) -> str:
    if not enrichment:
        return "missing enrichment.json"
    return (
        f"terms={len(enrichment.get('lexicon_proposals', []))} | "
        f"entities={len(enrichment.get('entity_proposals', []))} | "
        f"tactics={len(enrichment.get('tactic_proposals', []))} | "
        f"practices={len(enrichment.get('practice_descriptions', []))} | "
        f"claims={len(enrichment.get('statistical_claims', []))} | "
        f"run_type={enrichment.get('run_type', 'main')}"
    )


def _enrichment_gate(enrichment: dict) -> str:
    proposals = (
        enrichment.get("lexicon_proposals", [])
        + enrichment.get("entity_proposals", [])
        + enrichment.get("tactic_proposals", [])
        + enrichment.get("practice_descriptions", [])
        + enrichment.get("statistical_claims", [])
    )
    unresolved = [
        p for p in proposals
        if not p.get("approved") and not p.get("rejected")
    ]
    approved_unpushed = [
        p for p in proposals
        if p.get("approved") and not p.get("pushed_to_sanity")
    ]
    if unresolved or approved_unpushed:
        return (
            f"enrichment queue needs attention: {len(unresolved)} unresolved, "
            f"{len(approved_unpushed)} approved-not-pushed."
        )
    return ""


def _next_action(status: dict) -> str:
    stage_map = {item["stage"]: item["ok"] for item in status["stages"]}
    if not stage_map.get("Intake"):
        return "Run intake again or inspect why intake.json was not written."
    if not stage_map.get("Extracted Text"):
        return "Run preprocessing again; extracted.txt is required for deferred enrichment and upload word counts."
    if not stage_map.get("Analysis"):
        return "Run analysis from the Ingest Workbench or CLI before upload."
    if not stage_map.get("Upload"):
        return f"Upload when reviewed: python -m runner upload-doc {status['doc_id']}"
    if status["warnings"]:
        return "Review the warnings above before uploading or re-enriching."
    if not stage_map.get("Enrichment"):
        return f"Optional: run enrichment with python -m runner enrich {status['doc_id']}"
    return "Record looks complete locally. Process any enrichment proposals when ready."


def upload_saved(doc_id: str, config: Config) -> None:
    """Load a locally saved document and upload it to Sanity + Supabase."""
    doc_dir = config.corpus_dir / doc_id
    if not doc_dir.exists():
        console.print(f"[red]No local document found for doc_id: {doc_id}[/red]")
        return

    analysis_path = doc_dir / "analysis.json"
    embedding_path = doc_dir / "embedding.json"
    intake_path    = doc_dir / "intake.json"
    metadata_path  = doc_dir / "metadata.json"
    preprocess_path = doc_dir / "preprocess.json"

    if not analysis_path.exists():
        console.print(f"[red]Missing analysis.json for {doc_id}[/red]")
        return

    analysis = AnalysisResult.model_validate_json(analysis_path.read_text())

    if embedding_path.exists():
        embedding = json.loads(embedding_path.read_text())["vector"]
    else:
        # Generate embedding now — it was missing or skipped during original upload
        console.print(f"[dim]embedding.json missing for {doc_id} — generating now...[/dim]")
        extracted_path = doc_dir / "extracted.txt"
        if not extracted_path.exists():
            console.print(f"[yellow]Cannot generate embedding: extracted.txt missing for {doc_id}[/yellow]")
            embedding = []
        else:
            try:
                from .embed import run_litelm, run, save as save_embedding
                text = extracted_path.read_text(encoding="utf-8")
                try:
                    embedding = run_litelm(text, config)
                except Exception:
                    embedding = run(text, config)
                save_embedding(doc_id, embedding, config)
                console.print(f"[dim]Embedding generated ({len(embedding)}d) and saved.[/dim]")
            except Exception as exc:
                console.print(f"[yellow]Embedding generation failed: {exc}[/yellow]")
                embedding = []

    intake_data = {}
    if intake_path.exists():
        intake_data = json.loads(intake_path.read_text())
    metadata = {}
    if metadata_path.exists():
        metadata = json.loads(metadata_path.read_text())

    # A5: prefer embedding.json model field (reflects re-embedding) over metadata.json
    _embedding_json_data: dict = {}
    if embedding_path.exists():
        try:
            _embedding_json_data = json.loads(embedding_path.read_text())
        except Exception:
            pass
    _resolved_embedding_model: str = (
        _embedding_json_data.get("model")
        or metadata.get("embedding_model")
        or config.embedding_model
    )

    intake = IntakeResult(
        doc_id=doc_id,
        source=intake_data.get("source", ""),
        source_type=intake_data.get("source_type", "url"),  # type: ignore[arg-type]
        declared_type=intake_data.get("declared_type", intake_data.get("source_type", "url")),
        tier=intake_data.get("tier", 1),
        batch_id=intake_data.get("batch_id", "unassigned"),
        language=intake_data.get("language"),
        archive_url=intake_data.get("archive_url"),
        wayback_status=intake_data.get("wayback_status", ""),
        wayback_checked_at=intake_data.get("wayback_checked_at", ""),
        wayback_error=intake_data.get("wayback_error", ""),
        ingested_at=intake_data.get("ingested_at") or metadata.get("saved_at", ""),
        source_url=intake_data.get("source_url", ""),
        original_filename=intake_data.get("original_filename", ""),
        local_copy_path=intake_data.get("local_copy_path", ""),
        source_html_sha256=intake_data.get("source_html_sha256", ""),
        testimony_consent=intake_data.get("testimony_consent", ""),
        local_dir=doc_dir,
    )
    if preprocess_path.exists():
        preprocess = _load_preprocess(preprocess_path)
    else:
        extracted_path = doc_dir / "extracted.txt"
        preprocess = PreprocessResult(
            doc_id=doc_id,
            tool_used="unknown",
            quality="low",
            text=extracted_path.read_text(encoding="utf-8") if extracted_path.exists() else "",
            )

    if _repair_analysis_date_from_source(analysis, preprocess):
        analysis_path.write_text(
            json.dumps(_stamp_analysis_dict(analysis), indent=2), encoding="utf-8"
        )

    pkg = DocumentPackage(
        intake=intake,
        preprocess=preprocess,
        analysis=analysis,
        embedding=embedding,
        embedding_model=_resolved_embedding_model,
        llm_used=metadata.get("llm_used", "unknown"),
        local_dir=doc_dir,
    )
    _enforce_testimony_upload_gate(intake, analysis)

    sanity_id = sanity_client.write_document(pkg, config)
    if embedding:
        supabase_client.upsert_embedding(
            doc_id,
            embedding,
            analysis,
            config,
            tier=str(intake.tier),
            language=intake.language or preprocess.language_detected or "",
            embedding_model=_resolved_embedding_model,
        )

    (doc_dir / "sanity_record.json").write_text(
        json.dumps(_sanity_record_payload(sanity_id, intake, preprocess), indent=2),
        encoding="utf-8",
    )
    _write_audit_event(doc_dir, "uploaded")
    console.print(f"[green]Uploaded {doc_id}[/green] → Sanity: {sanity_id}")


def export_batch(batch_id: str, config: Config) -> None:
    """Export all documents in a batch as JSONL to exports/{batch_id}/.

    Each line is a self-contained record merging analysis + provenance fields
    so the export is useful without the local corpus directory.
    """
    export_dir = config.exports_dir / batch_id
    export_dir.mkdir(parents=True, exist_ok=True)

    out_path = export_dir / f"{batch_id}.jsonl"
    count = 0
    with out_path.open("w", encoding="utf-8") as f:
        for doc_dir in sorted(config.corpus_dir.iterdir()):
            if not doc_dir.is_dir():
                continue
            intake_path = doc_dir / "intake.json"
            if not intake_path.exists():
                continue
            intake_data = _read_json(intake_path)
            if intake_data.get("batch_id") != batch_id:
                continue
            analysis_path = doc_dir / "analysis.json"
            if not analysis_path.exists():
                continue
            preprocess_meta = _read_json(doc_dir / "preprocess.json")
            sanity_record   = _read_json(doc_dir / "sanity_record.json")
            metadata        = _read_json(doc_dir / "metadata.json")

            doc = json.loads(analysis_path.read_text())
            doc["_export"] = {
                "doc_id":           doc_dir.name,
                "batch_id":         batch_id,
                "source":           intake_data.get("source", ""),
                "source_url":       intake_data.get("source_url", ""),
                "archive_url":      intake_data.get("archive_url", ""),
                "source_type":      intake_data.get("source_type", ""),
                "tier":             intake_data.get("tier", ""),
                "ingested_at":      intake_data.get("ingested_at", ""),
                "title":            preprocess_meta.get("title", ""),
                "author":           preprocess_meta.get("author", ""),
                "date_published":   preprocess_meta.get("date_published", ""),
                "char_count":       preprocess_meta.get("char_count", 0),
                "tool_used":        preprocess_meta.get("tool_used", ""),
                "llm_used":         metadata.get("llm_used", ""),
                "sanity_id":        sanity_record.get("sanity_id", ""),
                "uploaded":         bool(sanity_record),
            }
            f.write(json.dumps(doc, ensure_ascii=False) + "\n")
            count += 1

    if count == 0:
        console.print(f"[yellow]No documents found for batch: {batch_id}[/yellow]")
        return

    console.print(f"[green]Exported {count} documents → {out_path}[/green]")


def migrate_corpus_files(config: Config, dry_run: bool = True) -> dict:
    """Backfill missing provenance fields across the corpus.

    Walks every subdirectory of config.corpus_dir that contains an intake.json
    and backfills:
      - intake.json: ingested_at (from metadata.json saved_at) if missing
      - analysis.json: prompt_version and ontology_version if missing

    Returns {"docs_scanned": N, "docs_patched": M, "fields_written": K}
    """
    docs_scanned = 0
    docs_patched = 0
    fields_written = 0

    for doc_dir in sorted(config.corpus_dir.iterdir()):
        if not doc_dir.is_dir():
            continue
        intake_path = doc_dir / "intake.json"
        if not intake_path.exists():
            continue

        docs_scanned += 1
        doc_patched = False

        # a. Backfill intake.json ingested_at from metadata.json saved_at
        intake_data = _read_json(intake_path)
        if not intake_data.get("ingested_at"):
            metadata = _read_json(doc_dir / "metadata.json")
            saved_at = metadata.get("saved_at")
            if saved_at:
                if not dry_run:
                    intake_data["ingested_at"] = saved_at
                    intake_path.write_text(
                        json.dumps(intake_data, indent=2), encoding="utf-8"
                    )
                console.print(
                    f"{'[DRY RUN] ' if dry_run else ''}"
                    f"{doc_dir.name}: intake.json ← ingested_at={saved_at}"
                )
                fields_written += 1
                doc_patched = True

        # b. Backfill analysis.json prompt_version and ontology_version
        analysis_path = doc_dir / "analysis.json"
        if analysis_path.exists():
            analysis_data = _read_json(analysis_path)
            changed_fields: list[str] = []

            if not analysis_data.get("prompt_version"):
                analysis_data["prompt_version"] = PROMPT_VERSION
                changed_fields.append(f"prompt_version={PROMPT_VERSION}")
                fields_written += 1

            if not analysis_data.get("ontology_version"):
                analysis_data["ontology_version"] = _ONTOLOGY_VERSION
                changed_fields.append(f"ontology_version={_ONTOLOGY_VERSION}")
                fields_written += 1

            if changed_fields:
                if not dry_run:
                    analysis_path.write_text(
                        json.dumps(analysis_data, indent=2), encoding="utf-8"
                    )
                console.print(
                    f"{'[DRY RUN] ' if dry_run else ''}"
                    f"{doc_dir.name}: analysis.json ← {', '.join(changed_fields)}"
                )
                doc_patched = True

        if doc_patched:
            docs_patched += 1

    return {
        "docs_scanned": docs_scanned,
        "docs_patched": docs_patched,
        "fields_written": fields_written,
    }


def _sanity_doc_id(d: dict) -> str:
    """Extract the local doc_id from a Sanity document dict.
    Prefers the explicit docId field; falls back to stripping 'doc-' prefix."""
    if d.get("docId"):
        return d["docId"]
    raw = d.get("_id", "")
    return raw[4:] if raw.startswith("doc-") else raw


def export_corpus_csv(config: Config, batch_id: str = "", out_path: Path | None = None) -> Path:
    """Export corpus as a flat CSV for use in R, SPSS, or Excel.

    One row per document. Columns: doc_id, batch_id, type, primary_type, format, scope,
    tier, confidence_score, confidence_status, languages, country, tactic, source_type,
    source, title, date_published, char_count, llm_used, uploaded, sanity_id,
    ingested_at, prompt_version.

    If batch_id is given, exports only that batch. Otherwise exports all documents.
    """
    import csv

    if out_path is None:
        name = f"{batch_id or 'all-corpus'}.csv"
        out_dir = config.exports_dir / (batch_id or "all")
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / name

    fieldnames = [
        "doc_id", "batch_id", "type", "primary_type", "format", "scope",
        "tier", "confidence_score", "confidence_status",
        "languages", "country", "tactic",
        "source_type", "source", "title", "author", "date_published",
        "char_count", "llm_used", "prompt_version",
        "uploaded", "sanity_id",
        "ingested_at", "testimony_flag",
    ]

    count = 0
    with out_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()

        for doc_dir in sorted(config.corpus_dir.iterdir()):
            if not doc_dir.is_dir():
                continue
            intake_path = doc_dir / "intake.json"
            analysis_path = doc_dir / "analysis.json"
            if not intake_path.exists() or not analysis_path.exists():
                continue

            intake_data = _read_json(intake_path)
            if batch_id and intake_data.get("batch_id") != batch_id:
                continue

            try:
                analysis = json.loads(analysis_path.read_text())
            except Exception:
                continue

            preprocess_meta = _read_json(doc_dir / "preprocess.json")
            sanity_record   = _read_json(doc_dir / "sanity_record.json")
            metadata        = _read_json(doc_dir / "metadata.json")

            conf = analysis.get("confidence", {})

            row = {
                "doc_id":             doc_dir.name,
                "batch_id":           intake_data.get("batch_id", ""),
                "type":               analysis.get("type", ""),
                "primary_type":       analysis.get("primary_type", ""),
                "format":             analysis.get("format", ""),
                "scope":              analysis.get("scope", ""),
                "tier":               intake_data.get("tier", ""),
                "confidence_score":   conf.get("overall_score", ""),
                "confidence_status":  conf.get("status", ""),
                "languages":          "|".join(analysis.get("languages", [])),
                "country":            "|".join(analysis.get("country", [])),
                "tactic":             "|".join(analysis.get("tactic", [])),
                "source_type":        intake_data.get("source_type", ""),
                "source":             intake_data.get("source", ""),
                "title":              preprocess_meta.get("title", ""),
                "author":             preprocess_meta.get("author", ""),
                "date_published":     preprocess_meta.get("date_published", ""),
                "char_count":         preprocess_meta.get("char_count", ""),
                "llm_used":           metadata.get("llm_used", ""),
                "prompt_version":     analysis.get("prompt_version", ""),
                "uploaded":           "yes" if sanity_record else "no",
                "sanity_id":          sanity_record.get("sanity_id", ""),
                "ingested_at":        intake_data.get("ingested_at", ""),
                "testimony_flag":     "yes" if analysis.get("testimony_flag") else "no",
            }
            writer.writerow(row)
            count += 1

    console.print(f"[green]CSV export: {count} documents → {out_path}[/green]")
    return out_path


def corpus_stats(config: Config) -> dict:
    """Scan the corpus and return aggregate counts for the dashboard.

    Returns a dict with:
      total, uploaded, pending_upload, partial (intake only),
      by_type (Counter), by_scope (Counter), by_confidence (Counter),
      by_tier (Counter), by_language (Counter),
      low_confidence (list of doc_ids), needs_review (list of doc_ids),
      testimony_flagged (int)
    """
    from collections import Counter

    stats: dict = {
        "total": 0,
        "uploaded": 0,
        "pending_upload": 0,
        "partial": 0,
        "testimony_flagged": 0,
        "by_type": Counter(),
        "by_scope": Counter(),
        "by_confidence": Counter(),
        "by_tier": Counter(),
        "by_language": Counter(),
        "low_confidence_docs": [],
        "needs_review_docs": [],
    }

    for doc_dir in config.corpus_dir.iterdir():
        if not doc_dir.is_dir():
            continue
        intake_path = doc_dir / "intake.json"
        if not intake_path.exists():
            continue

        analysis_path = doc_dir / "analysis.json"
        if not analysis_path.exists():
            stats["partial"] += 1
            continue

        stats["total"] += 1

        sanity_record = _read_json(doc_dir / "sanity_record.json")
        if sanity_record:
            stats["uploaded"] += 1
        else:
            stats["pending_upload"] += 1

        try:
            analysis = json.loads(analysis_path.read_text())
        except Exception:
            continue

        intake_data = _read_json(intake_path)

        stats["by_type"][analysis.get("type", "unknown")] += 1
        stats["by_scope"][analysis.get("scope", "unknown")] += 1
        stats["by_tier"][str(intake_data.get("tier", "?"))] += 1

        conf = analysis.get("confidence", {})
        score = conf.get("overall_score", 0)
        status = conf.get("status", "unknown")
        stats["by_confidence"][status] += 1

        if status == "low" or (isinstance(score, (int, float)) and score < 0.70):
            stats["low_confidence_docs"].append(doc_dir.name)
        if analysis.get("needs_review"):
            stats["needs_review_docs"].append(doc_dir.name)
        if analysis.get("testimony_flag"):
            stats["testimony_flagged"] += 1

        for lang in analysis.get("languages", []):
            stats["by_language"][lang] += 1

    return stats


def verify_uploads(limit: int, config: Config) -> None:
    """Query Sanity and Supabase directly and print what's actually stored there."""
    import httpx

    console.print("\n[bold]Checking Sanity...[/bold]")
    sanity_docs: list[dict] = []
    try:
        query = (
            f'*[_type == "sogiceDocument"] | order(_createdAt desc)[0..{limit - 1}]'
            '{ _id, docId, "docType": classification.type, workflowStatus, _createdAt, "sourceUrl": meta.sourceUrl }'
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
        t.add_column("doc_id")
        t.add_column("_id", style="dim")
        t.add_column("type")
        t.add_column("status")
        t.add_column("created")
        t.add_column("source", overflow="fold")
        for d in sanity_docs:
            created = (d.get("_createdAt") or "")[:19].replace("T", " ")
            t.add_row(
                _sanity_doc_id(d),
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
    # Exclude discarded documents — they are intentionally absent from Supabase.
    active_sanity_ids = {
        _sanity_doc_id(d) for d in sanity_docs
        if d.get("workflowStatus") != "discarded"
    }
    discarded_ids = {
        _sanity_doc_id(d) for d in sanity_docs
        if d.get("workflowStatus") == "discarded"
    }
    supa_ids        = {r["doc_id"] for r in supabase_rows}
    missing_in_supa = active_sanity_ids - supa_ids

    if discarded_ids:
        console.print(
            f"\n[dim]Sanity records marked discarded (excluded from mismatch check):[/dim] "
            + ", ".join(sorted(discarded_ids))
        )
    if missing_in_supa:
        console.print(
            f"\n[yellow]In Sanity but missing from Supabase:[/yellow] "
            + ", ".join(sorted(missing_in_supa))
        )
    else:
        console.print("\n[green]✓ All active Sanity records also present in Supabase.[/green]")


def _write_audit_event(doc_dir: Path, event: str) -> None:
    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).isoformat()
    with (doc_dir / "audit.log").open("a", encoding="utf-8") as f:
        f.write(f"{ts} {event}\n")


def _sanity_record_payload(
    sanity_id: str,
    intake: IntakeResult,
    preprocess: PreprocessResult,
) -> dict:
    pub = publication_metadata({
        "date_published": preprocess.date_published,
        "sitename": preprocess.sitename,
        "hostname": preprocess.hostname,
        "page_intel": preprocess.page_intel.__dict__ if preprocess.page_intel else {},
    })
    from datetime import datetime, timezone
    return {
        "sanity_id": sanity_id,
        "doc_id": intake.doc_id,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "source_url": intake.source_url or (intake.source if intake.source_type == "url" else ""),
        "archive_url": intake.archive_url,
        "date_published": pub["date_published"],
        "date_modified": pub["date_modified"],
        "publisher": pub["publisher"],
        "hostname": pub["hostname"],
        "source_html_sha256": preprocess.source_html_sha256 or intake.source_html_sha256,
    }


def _merge_intake_metadata(
    intake_path: Path,
    intake: IntakeResult,
    preprocess: PreprocessResult,
) -> None:
    """Refresh known intake fields while preserving future/manual metadata."""
    existing = _read_json(intake_path)
    existing.update({
        "doc_id": intake.doc_id,
        "source": intake.source,
        "source_type": intake.source_type,
        "declared_type": intake.declared_type,
        "tier": intake.tier,
        "batch_id": intake.batch_id,
        "language": intake.language,
        "archive_url": intake.archive_url,
        "wayback_status": intake.wayback_status,
        "wayback_checked_at": intake.wayback_checked_at,
        "wayback_error": intake.wayback_error,
        "source_url": intake.source_url,
        "original_filename": intake.original_filename,
        "local_copy_path": intake.local_copy_path,
        "source_html_sha256": preprocess.source_html_sha256 or intake.source_html_sha256,
        "testimony_consent": getattr(intake, "testimony_consent", ""),
    })
    intake_path.write_text(json.dumps(existing, indent=2), encoding="utf-8")


def _load_preprocess(path: Path) -> PreprocessResult:
    doc_dir = path.parent
    intake = _read_json(doc_dir / "intake.json")
    data = repair_preprocess_metadata(
        json.loads(path.read_text()),
        doc_dir=doc_dir,
        base_url=intake.get("source") or intake.get("source_url", ""),
    )
    if not data.get("text"):
        extracted = doc_dir / "extracted.txt"
        data["text"] = extracted.read_text(encoding="utf-8") if extracted.exists() else ""
    if data.get("markdown") is None:
        extracted_md = doc_dir / "extracted.md"
        if extracted_md.exists():
            data["markdown"] = extracted_md.read_text(encoding="utf-8")
    artifact_map = {
        "media_metadata": "media_metadata.json",
        "transcript_chunks": "transcript_chunks.json",
        "transcript_versions": "transcript_versions.json",
        "transcript_comparison": "transcript_comparison.json",
        "duplicate_candidates": "duplicate_candidates.json",
        "discovery_seed_queue": "discovery_seed_queue.json",
    }
    for field_name, filename in artifact_map.items():
        if data.get(field_name):
            continue
        artifact = doc_dir / filename
        if artifact.exists():
            try:
                data[field_name] = json.loads(artifact.read_text(encoding="utf-8"))
            except Exception:
                pass
    data.pop("outbound_link_count", None)
    for key in (
        "media_metadata_path",
        "transcript_chunks_path",
        "transcript_versions_path",
            "transcript_comparison_path",
            "media_comments_path",
            "duplicate_candidates_path",
            "discovery_seed_queue_path",
            "transcript_chunk_count",
            "transcript_version_count",
            "media_comment_count",
            "duplicate_candidate_count",
            "discovery_seed_count",
    ):
        data.pop(key, None)
    comments_path = doc_dir / "media_comments.json"
    if not data.get("media_comments") and comments_path.exists():
        try:
            comments_data = json.loads(comments_path.read_text(encoding="utf-8"))
            data["media_comments"] = comments_data.get("comments", [])
        except Exception:
            pass
    page_intel = data.get("page_intel")
    if isinstance(page_intel, dict):
        data["page_intel"] = PageIntelligence(**page_intel)
    return PreprocessResult(**data)


def _repair_analysis_date_from_source(
    analysis: AnalysisResult,
    preprocess: PreprocessResult,
) -> bool:
    if analysis.document_date.year:
        return False
    pub = publication_metadata({
        "date_published": preprocess.date_published,
        "sitename": preprocess.sitename,
        "hostname": preprocess.hostname,
        "page_intel": preprocess.page_intel.__dict__ if preprocess.page_intel else {},
    })
    parts = date_parts(pub.get("date_published", ""))
    if not parts["year"]:
        return False
    analysis.document_date.year = parts["year"]
    analysis.document_date.month = parts["month"]
    analysis.document_date.day = parts["day"]
    analysis.document_date.confidence = "exact" if parts["month"] and parts["day"] else "approximate"
    analysis.normalisation_warnings = list(analysis.normalisation_warnings) + [
        "document_date backfilled from source publication metadata."
    ]
    return True


def _enforce_testimony_upload_gate(
    intake: IntakeResult,
    analysis: AnalysisResult,
) -> None:
    if not requires_consent_gate(analysis):
        return
    if intake.testimony_consent == "confirmed":
        return
    status = intake.testimony_consent or "missing"
    type_note = ""
    if analysis.type in _CONSENT_GATED_TYPES and not analysis.testimony_flag:
        type_note = f"\n\nDocument type is [bold]{analysis.type}[/bold] — consent gate applies regardless of testimony_flag."
    console.print(Panel(
        "This document requires consent confirmation before upload.\n\n"
        f"Current consent status: [bold]{status}[/bold]\n"
        "Upload is blocked. Confirm consent through the ingest review flow before uploading."
        + type_note,
        title="[yellow]Consent Gate — Upload Blocked[/yellow]",
    ))
    raise typer.Exit(1)
