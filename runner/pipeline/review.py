"""
Human-in-the-loop checkpoints.

All four checkpoints use Rich panels for display and typer.confirm / Prompt
for researcher input. Each returns True to proceed, False to abort/defer.
"""
from __future__ import annotations
from pathlib import Path
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
import click
import typer

from ..models.document import AnalysisResult, IntakeResult, PreprocessResult
from ..models.triage import TriageResult
from ..models.enrichment import EnrichmentResult
from ..config import Config
from . import intake as intake_pipeline

console = Console()


def checkpoint_triage(triage: TriageResult, suggested_llm: str) -> str:
    """Checkpoint 0.5 — show triage recommendation, return the LLM to use.
    Researcher can override by typing a different --llm value."""
    _COMPLEXITY_COLOR = {"simple": "green", "moderate": "yellow", "complex": "red"}
    table = Table(show_header=False, box=None, padding=(0, 1))
    table.add_row("Doc type hint:", triage.doc_type_hint)
    table.add_row("Languages:", ", ".join(triage.languages))
    table.add_row(
        "Complexity:",
        Text(triage.complexity, style=_COMPLEXITY_COLOR.get(triage.complexity, "white")),
    )
    if triage.estimated_tokens:
        table.add_row("Est. tokens:", f"~{triage.estimated_tokens:,}")
    table.add_row(
        "Recommended model:",
        Text(triage.recommended_llm, style="bold cyan"),
    )
    if triage.routing_reason:
        table.add_row("Reason:", triage.routing_reason)

    console.print(Panel(table, title="[bold]TRIAGE RESULT[/bold]"))

    override = typer.prompt(
        f"Use model [{triage.recommended_llm}] or type another (Enter=accept)",
        default="",
    ).strip()
    return override if override else triage.recommended_llm


def checkpoint_intake(intake: IntakeResult) -> bool:
    """Checkpoint 1 — display source metadata, ask researcher to proceed."""
    table = Table(show_header=False, box=None, padding=(0, 1))
    table.add_row("Source:", intake.source)
    table.add_row("Type:", intake.source_type)
    table.add_row("Tier:", str(intake.tier))
    table.add_row("Batch:", intake.batch_id)
    table.add_row("Doc ID:", intake.doc_id)
    if intake.language:
        table.add_row("Language:", intake.language)
    if intake.archive_url:
        table.add_row("Archive URL:", intake.archive_url)
    if intake.wayback_status:
        table.add_row("Wayback:", intake.wayback_status)
    if intake.wayback_error:
        table.add_row("Wayback error:", intake.wayback_error)

    console.print(Panel(table, title="[bold]SOURCE INTAKE[/bold]"))
    return typer.confirm("Proceed with preprocessing?", default=True)


def checkpoint_preprocess(result: PreprocessResult) -> bool:
    """Checkpoint 2 — show preprocessing summary, let researcher inspect extracted.md."""
    table = Table(show_header=False, box=None, padding=(0, 1))
    table.add_row("Tool:", result.tool_used)
    table.add_row("Quality:", _quality_badge(result.quality))
    table.add_row("Characters:", str(result.char_count))
    table.add_row("Truncated:", "yes" if result.truncated else "no")
    if result.title:
        table.add_row("Title:", result.title)
    if result.sitename:
        table.add_row("Publisher:", result.sitename)
    if result.hostname:
        table.add_row("Domain:", result.hostname)
    if result.author:
        table.add_row("Author:", result.author)
    if result.date_published:
        table.add_row("Date published:", result.date_published)
    if result.outbound_links:
        table.add_row("Outbound links:", str(len(result.outbound_links)))
    intel = result.page_intel
    if intel:
        if intel.document_links:
            doc_summary = ", ".join(
                f"{d['file_type'].upper()}: {d['anchor_text'][:40] or d['url']}"
                for d in intel.document_links[:4]
            )
            table.add_row("Linked documents:", doc_summary)
        if intel.social_profiles:
            profiles = ", ".join(
                f"{p['platform']}{'/' + p['handle'] if p.get('handle') else ''}"
                for p in intel.social_profiles
            )
            table.add_row("Social profiles:", profiles)
        if intel.media_embeds:
            table.add_row("Embedded media:", ", ".join(
                f"{e['platform']}:{e['id']}" for e in intel.media_embeds[:4]
            ))
        if intel.emails:
            table.add_row("Emails found:", ", ".join(intel.emails[:3]))
    if result.language_detected:
        table.add_row("Language detected:", result.language_detected)
    if result.ocr_images:
        table.add_row("OCR images:", str(len(result.ocr_images)))

    console.print(Panel(table, title="[bold]PREPROCESSING RESULT[/bold]"))

    action = typer.prompt(
        "Action [Enter=proceed / e=edit / a=abort]",
        default="",
    ).strip().lower()
    if action in ("a", "abort"):
        return False
    if action in ("e", "edit"):
        _open_in_editor(result)
        return checkpoint_preprocess(result)
    return True  # Enter / "proceed" / anything else → proceed


def checkpoint_analysis(
    result: AnalysisResult,
    doc_id: str,
    yes: bool = False,
) -> Optional[AnalysisResult]:
    """Checkpoint 3 — display classification fields, return (possibly edited) result.
    Returns None if researcher aborts."""
    if yes:
        return result

    table = Table(show_header=False, box=None, padding=(0, 1))
    table.add_row("Type:",   result.type)
    table.add_row("Format:", result.format)
    table.add_row("Scope:",  result.scope)
    table.add_row("Confidence:", f"{result.confidence.overall_score:.2f} ({result.confidence.status})")
    if result.country:
        table.add_row("Country:", ", ".join(result.country))
    if result.tactic:
        table.add_row("Tactics:", ", ".join(result.tactic))
    if result.actor:
        table.add_row("Actors:", ", ".join(result.actor[:5]))
    if result.term:
        table.add_row("Terms:", ", ".join(result.term))
    if result.flags:
        table.add_row("Flags:", ", ".join(result.flags))
    table.add_row("Testimony flag:", "YES" if result.testimony_flag else "no")
    table.add_row("Candidate terms:", str(len(result.candidate_terms)))
    table.add_row("Suggested actors:", str(len(result.suggested_actors)))

    console.print(Panel(table, title=f"[bold]ANALYSIS — {doc_id}[/bold]"))
    console.print(Panel(result.summary, title="Summary"))

    # Show --llm both comparison if available
    local = getattr(result, "_local_comparison", None)
    if local is not None:
        _show_diff(result, local)

    if result.confidence.reasons:
        console.print(
            Panel("\n".join(f"• {r}" for r in result.confidence.reasons),
                  title="[yellow]Confidence notes[/yellow]")
        )
    if result.normalisation_warnings:
        console.print(
            Panel(
                "\n".join(f"• {warning}" for warning in result.normalisation_warnings),
                title="[yellow]Model output corrections[/yellow]",
            )
        )

    action = typer.prompt(
        "Action [Enter=accept / e=edit-json / a=abort]",
        default="",
    ).strip().lower()
    if action in ("a", "abort"):
        return None
    if action in ("e", "edit-json", "edit"):
        return _edit_analysis_json(result, doc_id)
    return result  # Enter / "accept" → proceed


def checkpoint_upload(doc_id: str, result: AnalysisResult) -> bool:
    """Checkpoint 4 — confirm Sanity + Supabase upload."""
    table = Table(show_header=False, box=None, padding=(0, 1))
    table.add_row("Doc ID:", doc_id)
    table.add_row("Type:", result.type)
    table.add_row("Scope:", result.scope)
    table.add_row("Confidence:", f"{result.confidence.overall_score:.2f} ({result.confidence.status})")
    table.add_row("Candidate terms:", str(len(result.candidate_terms)))
    table.add_row("Suggested actors:", str(len(result.suggested_actors)))

    will_do = Text()
    will_do.append("• Write to Sanity (workflowStatus: unverified)\n")
    will_do.append("• Sync embedding to Supabase\n")
    will_do.append("• Save local backup\n")

    console.print(Panel(table, title="[bold]UPLOAD CONFIRMATION[/bold]"))
    console.print(will_do)

    action = typer.prompt(
        "Action [Enter=upload / l=local-only / a=abort]",
        default="",
    ).strip().lower()
    return action not in ("l", "local-only", "a", "abort", "review-again")


def checkpoint_testimony_consent(
    doc_id: str,
    result: AnalysisResult,
    config: Config,
) -> str:
    """Ethics checkpoint for testimony-flagged documents.

    Returns one of: confirmed, pending, refused, not_required.
    """
    if not result.testimony_flag:
        return "not_required"

    console.print(Panel(
        "[bold yellow]TESTIMONY FLAG[/bold yellow]\n\n"
        "[bold]c[/bold] = confirmed — subject has given consent → proceed to upload\n"
        "[bold]p[/bold] = pending   — not yet obtained → save locally only, do not upload\n"
        "[bold]r[/bold] = refused   → suppress: do not save or upload",
        title="[bold yellow]⚠ TESTIMONY FLAG[/bold yellow]",
    ))
    while True:
        action = typer.prompt("Consent status [c/p/r]", default="p").strip().lower()
        if action in ("c", "confirmed"):
            intake_pipeline.update_intake_consent(doc_id, "confirmed", config)
            return "confirmed"
        if action in ("p", "pending"):
            intake_pipeline.update_intake_consent(doc_id, "pending", config)
            return "pending"
        if action in ("r", "refused"):
            console.print(
                "[red]Consent refused. Suppressing document: no local analysis package or upload will be written.[/red]"
            )
            return "refused"
        console.print("[yellow]Choose c, p, or r.[/yellow]")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _quality_badge(quality: str) -> Text:
    colors = {"high": "green", "medium": "yellow", "low": "red", "blocked": "bold red"}
    return Text(quality, style=colors.get(quality, "white"))


def _show_diff(claude: AnalysisResult, local: AnalysisResult) -> None:
    diff_table = Table(title="Claude vs Local LLM", show_header=True)
    diff_table.add_column("Field")
    diff_table.add_column("Claude")
    diff_table.add_column("Local")
    for field in ("type", "scope", "narrative_register"):
        cv = getattr(claude, field)
        lv = getattr(local, field)
        style = "" if cv == lv else "yellow"
        diff_table.add_row(field, str(cv), str(lv), style=style)
    for field in ("tactic", "country", "actor"):
        cv = set(getattr(claude, field))
        lv = set(getattr(local, field))
        only_c = cv - lv
        only_l = lv - cv
        if only_c or only_l:
            diff_table.add_row(
                field,
                f"+{sorted(only_c)}" if only_c else "—",
                f"+{sorted(only_l)}" if only_l else "—",
                style="yellow",
            )
    diff_table.add_row(
        "confidence",
        f"{claude.confidence.overall_score:.2f}",
        f"{local.confidence.overall_score:.2f}",
    )
    console.print(diff_table)


def _edit_analysis_json(result: AnalysisResult, doc_id: str) -> Optional[AnalysisResult]:
    import json, subprocess, os, tempfile
    data = json.loads(result.model_dump_json(indent=2))
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        json.dump(data, f, indent=2)
        tmp_path = f.name

    editor = os.environ.get("EDITOR", "nano")
    subprocess.call([editor, tmp_path])

    try:
        text = Path(tmp_path).read_text(encoding="utf-8").strip()
        if not text:
            console.print("[yellow]File was empty — no changes made.[/yellow]")
            retry = typer.confirm("Open editor again?", default=True)
            if retry:
                return _edit_analysis_json(result, doc_id)
            return result
        edited = json.loads(text)
        return AnalysisResult.model_validate(edited)
    except json.JSONDecodeError as exc:
        console.print(f"[red]Invalid JSON: {exc}[/red]")
        retry = typer.confirm("Retry editing?", default=True)
        if retry:
            return _edit_analysis_json(result, doc_id)
        return result
    except Exception as exc:
        console.print(f"[red]Validation error: {exc}[/red]")
        return result
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def checkpoint_enrichment(result: EnrichmentResult, doc_id: str) -> bool:
    """Checkpoint 3.5 — show enrichment proposal counts, ask researcher to proceed.
    Returns True to write enrichment.json and queue Sanity updates."""
    table = Table(show_header=False, box=None, padding=(0, 1))
    table.add_row("Doc ID:", doc_id)
    table.add_row("Model:", result.enrichment_model)
    table.add_row("Lexicon proposals:", str(len(result.lexicon_proposals)))
    table.add_row("Entity proposals:", str(len(result.entity_proposals)))
    table.add_row("Ingestion queue:", str(len(result.ingestion_queue)))
    table.add_row("Corpus connections:", str(len(result.corpus_connections)))
    table.add_row("Practice descriptions:", str(len(result.practice_descriptions)))
    table.add_row("Statistical claims:", str(len(result.statistical_claims)))

    console.print(Panel(table, title="[bold]ENRICHMENT — Checkpoint 3.5[/bold]"))

    if result.lexicon_proposals:
        term_table = Table("Term", "Cluster", "Action", show_header=True)
        for p in result.lexicon_proposals[:10]:
            term_table.add_row(
                p.term, p.proposed_cluster, p.action
            )
        if len(result.lexicon_proposals) > 10:
            term_table.add_row(
                f"... and {len(result.lexicon_proposals) - 10} more", "", ""
            )
        console.print(term_table)

    if result.ingestion_queue:
        console.print(
            f"[dim]Ingestion queue: {len(result.ingestion_queue)} URL(s). "
            f"Review with: python -m runner queue {doc_id}[/dim]"
        )

    action = typer.prompt(
        "Action [Enter=save / e=edit-json / s=skip-enrichment]",
        default="",
    ).strip().lower()
    if action in ("s", "skip"):
        return False
    if action in ("e", "edit"):
        return _edit_enrichment_json(result, doc_id)
    return True


def _edit_enrichment_json(result: EnrichmentResult, doc_id: str) -> bool:
    import json, subprocess, os, tempfile
    data = json.loads(result.model_dump_json(indent=2))
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        json.dump(data, f, indent=2)
        tmp_path = f.name

    editor = os.environ.get("EDITOR", "nano")
    subprocess.call([editor, tmp_path])
    Path(tmp_path).unlink(missing_ok=True)
    return True  # always save after editing


def _open_in_editor(result: PreprocessResult) -> None:
    import subprocess, os
    if result.markdown:
        path = _markdown_path(result)
        editor = os.environ.get("EDITOR", "nano")
        subprocess.call([editor, str(path)])


def _markdown_path(result: PreprocessResult) -> Path:
    from ..config import load_config
    config = load_config()
    return config.corpus_dir / result.doc_id / "extracted.md"
