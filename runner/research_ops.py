"""Small, human-safe research operations exposed under ``runner research``."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel

from .app_review_overrides import mark_analysis_reviewed
from .config import load_config
from .pipeline import calibration, corpus_manifest, publication_gate, review_plan


app = typer.Typer(
    name="research",
    help="Anchor audits, bounded review, publication safety, and corpus integrity tools.",
    no_args_is_help=True,
)
console = Console()


def _config():
    return load_config(llm=None, require_services=False)


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)


@app.command("review-plan")
def review_plan_cmd(
    limit: int = typer.Option(25, "--limit", min=1, help="Maximum grouped decisions in this work session"),
    recurrence: int = typer.Option(3, "--recurrence", min=2, help="Documents needed before a provisional concept is promoted to human attention"),
    out_dir: str = typer.Option("", "--out-dir", help="Default: EXPORTS_DIR/review"),
):
    """Create a bounded human exception queue and AI-managed long-tail summary."""
    config = _config()
    root = Path(out_dir).expanduser() if out_dir else Path(config.exports_dir) / "review"
    plan = review_plan.build_review_plan(
        config.corpus_dir,
        group_limit=limit,
        recurrence_threshold=recurrence,
    )
    json_path = root / "review_plan.json"
    md_path = root / "review_plan.md"
    _write_json(json_path, plan)
    md_path.write_text(review_plan.review_plan_markdown(plan), encoding="utf-8")
    console.print(
        f"[green]Review plan written[/green]: {plan['raw_actionable_proposals']} proposals → "
        f"{plan['human_candidate_groups']} human-candidate groups + "
        f"{plan['ai_managed_groups']} AI-managed long-tail groups; "
        f"showing {len(plan['selected_groups'])}.\n"
        f"[dim]{md_path}[/dim]"
    )


@app.command("anchor-create")
def anchor_create_cmd(
    doc_id: list[str] = typer.Option(..., "--doc-id", help="Repeat for each deliberately selected anchor document"),
    title: str = typer.Option("SOGICE system anchor set", "--title"),
    rationale: str = typer.Option("", "--rationale"),
):
    """Create the selected-document manifest for repeatable system audits."""
    config = _config()
    try:
        manifest = calibration.build_anchor_set(
            config.corpus_dir,
            doc_id,
            title=title,
            rationale=rationale,
        )
    except ValueError as exc:
        console.print(Panel(str(exc), title="[red]Anchor set refused[/red]"))
        raise typer.Exit(1)
    path = Path(config.exports_dir) / "anchor_audit" / "anchor_set.json"
    _write_json(path, manifest)
    console.print(f"[green]Anchor set written[/green]: {len(manifest['documents'])} selected documents.\n[dim]{path}[/dim]")


@app.command("anchor-add")
@app.command("calibration-add")
def anchor_add_cmd(
    doc_id: str = typer.Argument(..., help="Reviewed corpus document ID"),
    outcome: str = typer.Option(..., "--outcome", help="accepted | minor_correction | major_correction | unusable"),
    corrected_field: list[str] = typer.Option([], "--corrected-field", help="Repeat for each corrected field"),
    review_minutes: float = typer.Option(0.0, "--review-minutes", min=0.0),
    notes: str = typer.Option("", "--notes"),
    reviewer: str = typer.Option("researcher", "--reviewer"),
):
    """Record a human verdict only when an anchor comparison needs adjudication."""
    config = _config()
    ledger = Path(config.exports_dir) / "anchor_audit" / "anchor_audit.jsonl"
    try:
        record = calibration.build_calibration_record(
            Path(config.corpus_dir) / doc_id,
            outcome=outcome,
            corrected_fields=corrected_field,
            review_minutes=review_minutes,
            reviewer=reviewer,
            notes=notes,
        )
        calibration.append_record(ledger, record)
    except ValueError as exc:
        console.print(Panel(str(exc), title="[red]Anchor audit record refused[/red]"))
        raise typer.Exit(1)
    console.print(f"[green]Anchor verdict recorded[/green] for {doc_id}\n[dim]{ledger}[/dim]")


@app.command("anchor-report")
@app.command("calibration-report")
def anchor_report_cmd(
    ledger_path: str = typer.Option("", "--ledger", help="Default: EXPORTS_DIR/anchor_audit/anchor_audit.jsonl"),
):
    """Compare anchor outcomes; never derives thresholds or blocks ingestion."""
    config = _config()
    ledger = Path(ledger_path).expanduser() if ledger_path else Path(config.exports_dir) / "anchor_audit" / "anchor_audit.jsonl"
    report = calibration.build_calibration_report(calibration.read_ledger(ledger))
    out = ledger.parent / "anchor_audit_report.json"
    _write_json(out, report)
    console.print(
        f"[green]Anchor audit report written[/green]: "
        f"{report['sample_size']} adjudicated anchor outcome(s); "
        f"acceptable rate {report['acceptable_rate']:.1%}.\n[dim]{out}[/dim]"
    )
    for warning in report["warnings"]:
        console.print(f"[yellow]• {warning}[/yellow]")


@app.command("publication-audit")
def publication_audit_cmd(
    out: str = typer.Option("", "--out", help="Default: EXPORTS_DIR/review/publication_audit.json"),
):
    """Audit disclosed-AI and researcher-verified lanes without publishing."""
    config = _config()
    report = publication_gate.audit_corpus_publication_readiness(config.corpus_dir)
    out_path = Path(out).expanduser() if out else Path(config.exports_dir) / "review" / "publication_audit.json"
    _write_json(out_path, report)
    console.print(
        f"[green]Publication audit written[/green]: "
        f"{report['ready_for_ai_disclosed_release']} AI-disclosed ready, "
        f"{report['ready_for_researcher_verified_release']} researcher-verified ready, "
        f"{report['blocked']} blocked from both lanes.\n"
        f"[dim]{out_path}[/dim]"
    )


@app.command("mark-analysis-reviewed")
def mark_analysis_reviewed_cmd(
    doc_id: str = typer.Argument(..., help="Corpus document ID personally reviewed by the researcher"),
    notes: str = typer.Option(..., "--notes", help="What was checked and any corrections/limitations"),
    reviewer: str = typer.Option("researcher", "--reviewer"),
):
    """Record an explicit human analysis review; no AI or remote write occurs."""
    config = _config()
    result = mark_analysis_reviewed(
        Path(config.corpus_dir) / doc_id,
        note=notes,
        reviewed_by=reviewer,
    )
    if not result.get("ok"):
        console.print(Panel(str(result.get("reason") or "review marker refused"), title="[red]Review not recorded[/red]"))
        raise typer.Exit(1)
    console.print(f"[green]Human analysis review recorded[/green] for {doc_id}\n[dim]{result['path']}[/dim]")


@app.command("manifest-create")
def manifest_create_cmd(
    out: str = typer.Option("", "--out", help="Output manifest path"),
):
    """Hash corpus files so a copied backup can later be verified."""
    config = _config()
    if out:
        out_path = Path(out).expanduser()
    else:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        out_path = Path(config.exports_dir) / "manifests" / f"corpus_manifest_{stamp}.json"
    manifest = corpus_manifest.write_corpus_manifest(config.corpus_dir, out_path)
    console.print(
        f"[green]Corpus manifest written[/green]: {manifest['file_count']} files, "
        f"{manifest['total_bytes']} bytes.\n[dim]{out_path}[/dim]"
    )


@app.command("manifest-verify")
def manifest_verify_cmd(
    manifest: str = typer.Argument(..., help="Manifest JSON created by manifest-create"),
    corpus_root: str = typer.Option("", "--corpus-root", help="Verify a restored copy instead of the live path"),
):
    """Verify the live corpus or a restored copy against a saved manifest."""
    report = corpus_manifest.verify_corpus_manifest(
        Path(manifest),
        Path(corpus_root).expanduser() if corpus_root else None,
    )
    if report["ok"]:
        console.print(f"[green]Integrity verified[/green]: {report['current_files']} files match.")
        return
    console.print(Panel(
        f"Missing: {len(report['missing'])}\nChanged: {len(report['changed'])}\nUnexpected: {len(report['unexpected'])}",
        title="[red]Corpus differs from manifest[/red]",
    ))
    raise typer.Exit(1)
