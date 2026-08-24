"""Unified, receipt-backed Production Line interfaces with legacy fallbacks."""
from __future__ import annotations

from pathlib import Path
import shutil
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable

import streamlit as st

from runner.config import FactoryConfig, load_factory_config
from runner.models.reprocessing import ResearchCampaignV2
from runner.pipeline.factory_controller import (
    DOCUMENT_IDS, FIXTURE_BYTES, publish_campaign_command,
    publish_synthetic_campaign,
    publish_semantic_campaign_command, publish_semantic_campaign_release,
)
from runner.pipeline.factory_messages import canonical_json_bytes, scan_checksum_pairs, verify_checksum_pair
from runner.pipeline.factory_messages import sha256_bytes
from runner.pipeline.factory_auth import (
    AuthenticatedFactoryMessageV1, load_private_key, public_key_allowlist,
    public_key_id, verify_factory_message,
)
from runner.pipeline.factory_supervisor import worker_status
from runner.pipeline.factory_service import discover_production_runs
from runner.pipeline.factory_state import project_factory_receipts
from runner.pipeline.factory_review_adapter import (
    preview_returned_proposals, route_returned_proposals,
)
from runner.pipeline.factory_semantic_campaign import (
    SEMANTIC_CAMPAIGN_STATIONS, SEMANTIC_CONFIRMATION, SEMANTIC_ROUTE_PURPOSES,
    SemanticCampaignV1, SemanticDocumentV1, SourceInventoryRow,
    build_semantic_approval, corpus_inventory, freeze_trusted_lexicon_snapshot,
    source_queue_inventory, verify_run021_results,
)
from runner.pipeline.syncthing_exchange import (
    forbidden_mutable_members, load_factory_receipts,
    load_authenticated_factory_receipts, observe_receipts, verified_json_messages,
)


CONFIRMATION = "I understand this authorizes synthetic local processing only."
PROHIBITED = "No models, RAG, remote writes, publication, or research data"
CANARY_STATIONS_LABEL = "Verify source → Prepare complete text → Build complete V2 units"
PASS_A_STATIONS_LABEL = CANARY_STATIONS_LABEL + " → Independent Analysis"
SEMANTIC_CONFIRMATION_TEXT = SEMANTIC_CONFIRMATION
SEMANTIC_STATIONS_LABEL = " → ".join(SEMANTIC_CAMPAIGN_STATIONS)
RUN021_ARCHIVE_SHA256 = "571bbbc255515b4175f10769be94a12385975a66a1f1af68e966bf35bf3dec85"


def semantic_vertical_readiness_model(evidence: dict | None = None) -> dict:
    """Compatibility projection for the retained zero-model Run-019 fallback."""
    evidence = evidence or {}
    return {
        "status": "Legacy synthetic compatibility projection",
        "sections": int(evidence.get("section_count", 0)),
        "prompt_jobs": int(evidence.get("prompt_job_count", 0)),
        "parallel_route": "Bounded small/MoE batches",
        "compiler": "Larger-model boundary; not loaded",
        "index": f"Frozen source-only · {evidence.get('embedding_dimension', 4096)} dimensions",
        "retrieval": "SQLite lexical + exact semantic fusion",
        "enrichment": "Requires one immutable verified evidence pack",
        "held_reasons": tuple(evidence.get("held_reasons", ())),
        "research_boundary": "Analysis and generated summaries never become source evidence.",
        "enabled": False,
    }


def pass_a_readiness_model() -> dict:
    """Compatibility projection for the retained zero-model Run-018 fallback."""
    return {
        "released": False,
        "campaign_identity": "Not released",
        "document_count": 0,
        "station_sequence": PASS_A_STATIONS_LABEL,
        "current_station": "Not started",
        "requested_route": "Requires separate Studio validation",
        "lexicon_snapshot": "Requires frozen approved snapshot",
        "prompt_version": "ingestion-v3.3",
        "counts": {"complete": 0, "held": 0, "retryable": 0, "pending": 0},
        "model_lifecycle": "Not loaded",
        "analysis_validation": "Not executed",
        "warning": "Analysis is an interpretation layer, not source evidence for RAG.",
        "disabled_operations": (
            "Real Analysis release", "Embeddings", "RAG", "Enrichment",
            "Corpus import", "Publication",
        ),
    }


def copied_canary_preview(
    data: bytes,
    *,
    filename: str,
    maximum_bytes: int,
) -> dict:
    """Pure in-memory preview; never writes, retains, publishes, or queues bytes."""
    suffix = Path(filename).suffix.lower()
    problems: list[str] = []
    if suffix not in {".txt", ".md"}:
        problems.append("Choose one plain-text or Markdown file.")
    if len(data) > maximum_bytes:
        problems.append("The copied file is larger than the configured canary limit.")
    try:
        data.decode("utf-8", errors="strict")
        utf8_valid = True
    except UnicodeDecodeError:
        utf8_valid = False
        problems.append("The copied file is not valid UTF-8 text.")
    digest = sha256_bytes(data)
    return {
        "safe_filename": Path(filename).name,
        "byte_count": len(data),
        "sha256": digest,
        "strict_utf8_valid": utf8_valid,
        "proposed_document_id": f"copied-text-{digest[:16]}",
        "required_confirmations": (
            "Public source", "Non-sensitive", "Not anonymous platform testimony",
            "No private or restricted material", "Copied local bytes only",
        ),
        "ready": not problems,
        "problems": tuple(problems),
        "retained": False,
    }


def production_readiness_model(config: FactoryConfig) -> dict:
    return {
        "released": False,
        "configuration_ready": config.production_ready,
        "reasons": config.production_problems,
        "station_sequence": CANARY_STATIONS_LABEL,
        "maximum_bytes": config.maximum_copied_text_bytes,
        "service_ready": bool(
            config.production_ready and config.host_role in {"mac-studio", "synthetic"}
        ),
        "result_import_status": "Not authorized",
        "next_gate": "Independent Run-009 acceptance, then one separately approved Run-010 artifact",
    }


def configured_key_fingerprints(config: FactoryConfig) -> dict[str, tuple[str, ...]]:
    roots = tuple(path for path in (config.to_studio, config.from_studio) if path)
    result: dict[str, tuple[str, ...]] = {}
    for label, paths in (
        ("command_verification", config.studio_command_public_keys),
        ("receipt_verification", config.macbook_receipt_public_keys),
    ):
        try:
            result[label] = tuple(public_key_allowlist(paths, shared_roots=roots)) if paths else ()
        except ValueError:
            result[label] = ()
    for label, path in (
        ("command_signing", config.macbook_signing_private_key),
        ("receipt_signing", config.studio_receipt_signing_private_key),
    ):
        try:
            key = load_private_key(path, shared_roots=roots) if path else None
            result[label] = (public_key_id(key.public_key()),) if key else ()
        except ValueError:
            result[label] = ()
    return result


def setup_model(config: FactoryConfig) -> dict:
    return {
        "enabled": config.enabled, "host_role": config.host_role,
        "dry_run_only": config.dry_run_only,
        "paths": {
            "Ready to send": config.to_studio,
            "Returned from Mac Studio": config.from_studio,
            "Mac Studio local work": config.state_root,
            "Worker records": config.job_root,
        },
        "problems": config.problems,
    }


def create_confirmed_campaign(config: FactoryConfig, run_id: str, confirmed: bool) -> dict:
    if not config.enabled or config.host_role not in {"macbook", "synthetic"}:
        raise PermissionError("Synthetic campaign creation is not enabled on this machine.")
    if not confirmed:
        raise PermissionError(CONFIRMATION)
    assert config.to_studio and config.job_root
    return publish_synthetic_campaign(
        to_studio=config.to_studio,
        fixture_root=config.job_root / "synthetic-fixtures" / run_id,
        run_id=run_id, start_approved=False,
    )


def _campaign(config: FactoryConfig, run_id: str) -> tuple[ResearchCampaignV2, str]:
    assert config.to_studio
    relative = f"campaigns/{run_id}/campaign.json"
    path = config.to_studio / relative
    verified = verify_checksum_pair(path, relative_path=relative)
    campaign = ResearchCampaignV2.model_validate_json(path.read_bytes())
    if campaign.run_id != run_id:
        raise ValueError("Campaign path does not match campaign identity.")
    return campaign, verified["sha256"]


def discover_semantic_runs(
    root: Path,
) -> tuple[tuple[str, ...], tuple[str, ...], tuple[str, ...]]:
    """Partition shared factory discovery without inventing a second protocol."""
    runs, rejected = discover_production_runs(root)
    semantic = tuple(
        run_id for run_id in runs
        if (Path(root) / "campaigns" / run_id / "semantic" / "campaign.auth.json").is_file()
    )
    legacy = tuple(run_id for run_id in runs if run_id not in semantic)
    return semantic, rejected, legacy


def publish_control(config: FactoryConfig, run_id: str, action: str) -> dict:
    if config.host_role not in {"macbook", "synthetic"} or not config.dry_run_only:
        raise PermissionError("Commands are available only on the dry-run MacBook control surface.")
    assert config.to_studio
    _, digest = _campaign(config, run_id)
    existing = verified_json_messages(config.to_studio, f"commands/{run_id}")
    sequence = len(existing) + 1
    return publish_campaign_command(
        config.to_studio, run_id=run_id, campaign_sha256=digest,
        sequence=sequence, action=action,
    )


def status_model(config: FactoryConfig, run_id: str) -> dict:
    """Receipt-only view: deliberately accepts no state-root or database path."""
    assert config.from_studio
    receipts = load_factory_receipts(config.from_studio, run_id=run_id)
    if not receipts:
        return {
            "label": "Waiting for Mac Studio", "receipt_count": 0,
            "documents": [], "counts": {key: 0 for key in (
                "succeeded", "held", "failed", "cancelled", "pending",
            )},
        }
    projection = observe_receipts(config.from_studio, run_id=run_id)
    documents = [
        {"document_id": row.entity_id, "state": row.state, "attempt": row.attempt}
        for row in projection.documents
    ]
    counts = {key: sum(row["state"] == key for row in documents) for key in (
        "succeeded", "held", "failed", "cancelled", "pending",
    )}
    reasons = {
        receipt.event.document_id: receipt.event.error_class
        for receipt in receipts
        if receipt.event.entity_kind == "document" and receipt.event.error_class
    }
    for row in documents:
        row["reason"] = reasons.get(row["document_id"], "")
    return {
        "label": "Safe to continue" if projection.campaign.state in {"succeeded", "held"}
        else "Running on Mac Studio",
        "campaign_state": projection.campaign.state,
        "station_state": projection.stations[0].state if projection.stations else "pending",
        "documents": documents, "counts": counts, "receipt_count": len(receipts),
        "last_sequence": projection.last_sequence,
        "projection_sha256": projection.projection_sha256,
        "barrier_eligible": projection.campaign.state in {"succeeded", "held", "cancelled"},
        "latest_update": receipts[-1].received_at.isoformat(),
    }


def transfer_model(config: FactoryConfig, run_id: str) -> dict:
    assert config.to_studio and config.from_studio
    outgoing = scan_checksum_pairs(config.to_studio)
    incoming = scan_checksum_pairs(config.from_studio)
    return {
        "outgoing_ready": sum(run_id in row["relative_path"] for row in outgoing["ready"]),
        "returned_ready": sum(run_id in row["relative_path"] for row in incoming["ready"]),
        "incomplete": [*outgoing["held"], *incoming["held"]],
        "forbidden": [
            *forbidden_mutable_members(config.to_studio),
            *forbidden_mutable_members(config.from_studio),
        ],
    }


def unified_setup_model(config: FactoryConfig) -> dict[str, Any]:
    """Content-free readiness projection; never exposes key material or DB paths."""
    roots = tuple(path for path in (config.to_studio, config.from_studio) if path)
    outgoing = scan_checksum_pairs(config.to_studio) if config.to_studio else {"ready": [], "held": []}
    incoming = scan_checksum_pairs(config.from_studio) if config.from_studio else {"ready": [], "held": []}
    capacity = config.job_root or Path.cwd()
    capacity = capacity if capacity.exists() else capacity.parent
    studio_evidence = {"status": "not_yet_returned", "issued_at": "", "verified": False}
    if config.from_studio and config.macbook_receipt_public_keys:
        try:
            keys = public_key_allowlist(
                config.macbook_receipt_public_keys, shared_roots=roots,
            )
            for _relative, payload in verified_json_messages(config.from_studio, "service/host"):
                message = AuthenticatedFactoryMessageV1.model_validate(payload)
                verified = verify_factory_message(
                    message, expected_purpose="service_status",
                    expected_run_id="factory-host-service",
                    allowed_public_keys=keys, now=datetime.now(timezone.utc),
                )
                if verified.get("schema_version") != "factory-host-health-v1.0":
                    continue
                studio_evidence = {
                    "status": verified["status"],
                    "issued_at": verified["issued_at"], "verified": True,
                }
        except (OSError, ValueError):
            studio_evidence = {"status": "verification_needed", "issued_at": "", "verified": False}
    return {
        "host_role": config.host_role,
        "production_ready": config.production_ready,
        "paths": {
            label: bool(path and path.is_dir() and not path.is_symlink())
            for label, path in (
                ("Ready to send", config.to_studio),
                ("Returned from Mac Studio", config.from_studio),
                ("Mac Studio local work", config.state_root),
                ("Worker records", config.job_root),
            )
        },
        "available_bytes": shutil.disk_usage(capacity).free if capacity.exists() else 0,
        "key_fingerprints": configured_key_fingerprints(config),
        "outgoing_complete": len(outgoing["ready"]),
        "incoming_complete": len(incoming["ready"]),
        "incomplete_pairs": tuple([*outgoing["held"], *incoming["held"]]),
        "forbidden": tuple(
            row for root in roots for row in forbidden_mutable_members(root)
        ),
        "problems": tuple(dict.fromkeys([*config.problems, *config.production_problems])),
        "syncthing_api_key_required": False,
        "studio_service_evidence": studio_evidence,
    }


def selection_inventory(
    *, corpus_root: Path | None, queue_database: Path | None,
) -> tuple[SourceInventoryRow, ...]:
    rows: list[SourceInventoryRow] = []
    if queue_database and queue_database.is_file():
        rows.extend(source_queue_inventory(queue_database))
    if corpus_root:
        rows.extend(corpus_inventory(corpus_root))
    deduped: dict[tuple[str, str], SourceInventoryRow] = {}
    for row in rows:
        key = (row.document_id, row.source_sha256)
        previous = deduped.get(key)
        if previous is None or (row.eligible and not previous.eligible):
            deduped[key] = row
    return tuple(sorted(deduped.values(), key=lambda row: (row.document_id, row.origin)))


def semantic_plan_model(rows: Iterable[SourceInventoryRow]) -> dict[str, Any]:
    selected = tuple(rows)
    reasons = []
    if not 1 <= len(selected) <= 12:
        reasons.append("Select between 1 and 12 explicit documents.")
    if any(not row.eligible or row.source_path is None for row in selected):
        reasons.append("Every selected source must be complete, available, and eligible.")
    return {
        "ready": not reasons,
        "document_count": len(selected),
        "source_bytes": sum(row.byte_count for row in selected),
        "estimated_local_bytes": sum(row.byte_count for row in selected) * 12,
        "stations": SEMANTIC_CAMPAIGN_STATIONS,
        "route_purposes": SEMANTIC_ROUTE_PURPOSES,
        "maximum_attempts": 2,
        "prohibited": "No remote writes, corpus import, publication, or automatic promotion",
        "reasons": tuple(reasons),
    }


def create_semantic_campaign(
    config: FactoryConfig, *, run_id: str, researcher_id: str,
    selected: Iterable[SourceInventoryRow], trusted_terms: list[dict[str, Any]],
    confirmed_text: str, now: datetime | None = None,
) -> dict[str, Any]:
    if config.host_role not in {"macbook", "synthetic"} or not config.production_ready:
        raise PermissionError("Authenticated semantic campaign release is not ready on this machine.")
    if confirmed_text != SEMANTIC_CONFIRMATION_TEXT:
        raise PermissionError(SEMANTIC_CONFIRMATION_TEXT)
    if not config.to_studio or not config.macbook_signing_private_key:
        raise PermissionError("The authenticated controller is not configured.")
    rows = tuple(selected)
    plan = semantic_plan_model(rows)
    if not plan["ready"]:
        raise ValueError(" ".join(plan["reasons"]))
    issued = now or datetime.now(timezone.utc)
    snapshot = freeze_trusted_lexicon_snapshot(
        trusted_terms, snapshot_id=f"lexicon-{run_id}",
        source_version="sanity-analysis-trust-rule-v1.0", created_at=issued,
    )
    documents = tuple(SemanticDocumentV1(
        document_id=row.document_id, title=row.title,
        source_sha256=row.source_sha256, source_bytes=row.byte_count,
        source_characters=row.source_characters,
        safe_display_filename=Path(row.source_path).name,
        media_type=row.media_type,
        language=row.language if row.language != "unknown" else "und",
        source_family_id=f"family-{row.document_id}",
        inventory_origin=row.origin, prior_analysis=row.prior_analysis,
    ) for row in sorted(rows, key=lambda value: value.document_id))
    approval = build_semantic_approval({
        "approval_id": f"approval-{run_id}", "run_id": run_id,
        "researcher_id": researcher_id,
        "researcher_confirmation_text": confirmed_text,
        "approved_at": issued, "expires_at": issued + timedelta(hours=24),
        "documents": documents, "lexicon_snapshot_id": snapshot.snapshot_id,
        "lexicon_snapshot_sha256": snapshot.canonical_sha256,
    })
    return publish_semantic_campaign_release(
        to_studio=config.to_studio,
        source_paths={row.document_id: Path(row.source_path) for row in rows},
        approval=approval, lexicon_snapshot=snapshot,
        command_signing_private_key=config.macbook_signing_private_key,
        now=issued, include_start=False,
    )


def _load_semantic_campaign(
    config: FactoryConfig, run_id: str,
) -> tuple[SemanticCampaignV1, str]:
    if not config.to_studio:
        raise ValueError("Factory send folder is not configured.")
    relative = f"campaigns/{run_id}/semantic/campaign.auth.json"
    path = config.to_studio / relative
    verified = verify_checksum_pair(path, relative_path=relative)
    message = AuthenticatedFactoryMessageV1.model_validate_json(path.read_bytes())
    campaign = SemanticCampaignV1.model_validate_json(canonical_json_bytes(message.payload))
    if (
        campaign.run_id != run_id or message.envelope.run_id != run_id
        or message.envelope.purpose != "campaign_release"
    ):
        raise ValueError("Campaign path does not match its authenticated identity.")
    return campaign, verified["sha256"]


def publish_semantic_control(config: FactoryConfig, run_id: str, action: str) -> dict:
    if config.host_role not in {"macbook", "synthetic"} or not config.production_ready:
        raise PermissionError("Authenticated commands are not ready on this machine.")
    if not config.to_studio or not config.macbook_signing_private_key:
        raise PermissionError("The command signing key is not configured.")
    campaign, _ = _load_semantic_campaign(config, run_id)
    sequence = 1 + sum(
        relative.endswith(".auth.json")
        for relative, _ in verified_json_messages(config.to_studio, f"commands/{run_id}")
    )
    return publish_semantic_campaign_command(
        to_studio=config.to_studio, campaign=campaign, sequence=sequence,
        action=action, command_signing_private_key=config.macbook_signing_private_key,
    )


def semantic_status_model(config: FactoryConfig, run_id: str) -> dict[str, Any]:
    """Authenticated receipt-only view; no Studio state root or database is accepted."""
    empty = {key: 0 for key in ("succeeded", "held", "failed", "cancelled", "pending", "running")}
    waiting = {
        "label": "Waiting for Mac Studio", "receipt_count": 0,
        "documents": [], "stations": [], "counts": empty,
    }
    if not config.from_studio or not config.macbook_receipt_public_keys:
        return waiting
    roots = tuple(path for path in (config.to_studio, config.from_studio) if path)
    keys = public_key_allowlist(config.macbook_receipt_public_keys, shared_roots=roots)
    receipts = load_authenticated_factory_receipts(
        config.from_studio, run_id=run_id, allowed_public_keys=keys,
        now=datetime.now(timezone.utc),
    )
    if not receipts:
        return waiting
    projection = project_factory_receipts(receipts, run_id=run_id)
    reasons = {
        (row.event.document_id, row.event.station_id): row.event.error_class
        for row in receipts if row.event.error_class
    }
    documents = [{
        "document_id": row.entity_id, "state": row.state,
        "station": row.station_id, "attempt": row.attempt,
        "reason": reasons.get((row.entity_id, row.station_id), ""),
    } for row in projection.documents]
    stations = [{"station": row.entity_id, "state": row.state} for row in projection.stations]
    counts = {key: sum(row["state"] == key for row in documents) for key in empty}
    return {
        "label": "Review ready" if projection.campaign.state == "succeeded" else "Mac Studio update",
        "campaign_state": projection.campaign.state,
        "documents": documents, "stations": stations, "counts": counts,
        "receipt_count": len(receipts), "last_sequence": projection.last_sequence,
        "projection_sha256": projection.projection_sha256,
        "barrier_eligible": projection.campaign.state in {"succeeded", "held", "cancelled"},
        "latest_update": receipts[-1].received_at.isoformat(),
        "model_phase": next((row["station"] for row in reversed(stations) if row["state"] == "running"), "idle"),
    }


def _run021_review() -> dict[str, Any] | None:
    root = Path(os.environ.get(
        "SOGICE_RUN021_RESULTS_ROOT",
        "/Users/sergiogalvaoroxo/Documents/surviving-sogice-stuff/Run-021",
    ))
    archive = root / "surviving-sogice-direct-copied-semantic-pilot-021-results.tar.gz"
    manifest = root / "surviving-sogice-direct-copied-semantic-pilot-021-results.manifest.json"
    if not archive.is_file() or not manifest.is_file():
        return None
    return verify_run021_results(
        archive, manifest, expected_archive_sha256=RUN021_ARCHIVE_SHA256,
    )


def run021_document_review_model(
    review: dict[str, Any], document_id: str,
) -> dict[str, Any]:
    """Project one sealed document for non-technical, read-only inspection."""
    if document_id not in review["analysis"] or document_id not in review["enrichment"]:
        raise ValueError("review document is outside the verified sealed campaign")
    compiler = next((
        row for row in review["comparison"].get("compiler_comparisons", ())
        if row.get("document_id") == document_id
    ), None)
    if compiler is None:
        raise ValueError("verified compiler comparison is missing")
    rankings = review["comparison"].get("retrieval_rankings") or {}
    analysis = review["analysis"][document_id]
    enrichment = review["enrichment"][document_id]
    return {
        "document_id": document_id,
        "analysis_summary": analysis.get("summary", ""),
        "analysis_evidence": tuple(analysis.get("evidence") or ()),
        "candidate_terms": tuple(analysis.get("candidate_terms") or ()),
        "primary_model": compiler.get("primary_model", ""),
        "comparison_model": compiler.get("comparison_model", ""),
        "primary_claims": tuple(compiler.get("primary_claims") or ()),
        "comparison_claims": tuple(compiler.get("comparison_claims") or ()),
        "exact_agreement_count": compiler.get("exact_agreement_count", 0),
        "primary_only_count": compiler.get("primary_only_count", 0),
        "comparison_only_count": compiler.get("comparison_only_count", 0),
        "qwen_ranking": tuple((rankings.get("qwen_4096") or {}).get(document_id, ())),
        "bge_ranking": tuple((rankings.get("bge_m3_1024") or {}).get(document_id, ())),
        "retrieval_context": review.get("retrieval", {}).get(document_id, {}),
        "grounded_connections": tuple(enrichment.get("corpus_connections") or ()),
        "retrieval_context_sha256": enrichment.get("retrieval_context_sha256", ""),
        "receipt_count": review.get("receipt_count", 0),
        "receipt_gaps": tuple(review.get("receipt_gaps") or ()),
        "model_truth_declaration": compiler.get("model_truth_declaration", False),
    }


def _render_unified_setup(config: FactoryConfig) -> None:
    model = unified_setup_model(config)
    st.subheader("Setup")
    st.write(f"**This machine:** {model['host_role']}")
    st.dataframe([
        {"Folder": label, "Ready": "Yes" if ready else "Needs attention"}
        for label, ready in model["paths"].items()
    ], hide_index=True, width="stretch")
    st.write(f"**Available local storage:** {model['available_bytes'] / 1024**3:.1f} GiB")
    st.caption("Key fingerprints: " + "; ".join(
        f"{key}: {', '.join(values) or 'not configured'}"
        for key, values in model["key_fingerprints"].items()
    ))
    st.write("**Syncthing-facing readiness:** filesystem evidence only; no API key required")
    st.caption(
        "If complete pairs stop moving, open the existing Syncthing app on both machines "
        "and wait for the configured factory folders; no device or folder reconfiguration is needed."
    )
    evidence = model["studio_service_evidence"]
    st.write(
        "**Studio service evidence:** "
        + (f"authenticated {evidence['status']} · {evidence['issued_at']}" if evidence["verified"]
           else evidence["status"].replace("_", " "))
    )
    if model["incomplete_pairs"]:
        st.warning(f"{len(model['incomplete_pairs'])} incomplete checksum pair(s).")
    if model["forbidden"]:
        st.error("Forbidden mutable files were detected in a shared folder.")
    for problem in model["problems"]:
        st.caption(f"• {problem}")


def render_production_line(config: FactoryConfig | None = None) -> None:
    config = config or load_factory_config()
    st.title("🏭 Production Line")
    st.info("Authenticated local semantic campaigns · Mac Studio work continues when this page is closed.")
    _render_unified_setup(config)
    if not config.enabled:
        st.warning("Setup required before local inventories or campaigns can be displayed.")
        return

    corpus_root = Path(os.environ["CORPUS_DIR"]).expanduser() if os.environ.get("CORPUS_DIR") else None
    queue_path = Path(os.environ["SOURCE_QUEUE_DB_PATH"]).expanduser() if os.environ.get("SOURCE_QUEUE_DB_PATH") else (
        corpus_root.parent / "source_queue.db" if corpus_root else None
    )
    inventory = selection_inventory(corpus_root=corpus_root, queue_database=queue_path)
    st.subheader("Select sources")
    if inventory:
        st.dataframe([row.display() for row in inventory], hide_index=True, width="stretch")
    else:
        st.caption("No copied artifacts are visible in the local read-only inventories.")
    eligible = [row for row in inventory if row.eligible]
    labels = [f"{row.document_id} · {row.title}" for row in eligible]
    chosen = st.multiselect("Choose 1–12 explicit documents", labels, max_selections=12)
    chosen_ids = {value.split(" · ", 1)[0] for value in chosen}
    selected = tuple(row for row in eligible if row.document_id in chosen_ids)

    st.subheader("Plan campaign")
    plan = semantic_plan_model(selected)
    st.write(f"**{plan['document_count']} documents** · {plan['source_bytes']:,} source bytes · about {plan['estimated_local_bytes']:,} local working bytes")
    st.caption(SEMANTIC_STATIONS_LABEL)
    st.write("**Routes:** " + ", ".join(plan["route_purposes"]))
    st.write("**Scheduling:** one global model, concurrency one at route transitions, explicit verified unload")
    st.write(f"**Retry policy:** {plan['maximum_attempts']} bounded attempts per document/stage")
    st.caption(plan["prohibited"])
    for reason in plan["reasons"]:
        st.warning(reason)

    st.subheader("Freeze vocabulary")
    st.caption("Validated terms and only researcher-trusted drafts are eligible under the existing Analysis lexicon rule.")
    trusted_terms = st.session_state.get("factory_trusted_terms", [])
    if st.button("Load trusted vocabulary for freezing"):
        try:
            from runner.config import load_config
            from runner.pipeline.sanity_reads import fetch_analysis_orientation_terms
            trusted_terms = fetch_analysis_orientation_terms(load_config(require_services=False))
            st.session_state.factory_trusted_terms = trusted_terms
        except Exception as exc:
            st.error(f"Trusted vocabulary could not be loaded: {type(exc).__name__}")
    st.write(f"**Trusted terms ready to freeze:** {len(trusted_terms)}")
    st.caption("Returned proposals cannot alter this snapshot or the same campaign index.")

    st.subheader("Approve and release")
    run_id = st.text_input("Campaign ID", value="semantic-campaign-022")
    researcher_id = st.text_input("Researcher ID", value="researcher")
    confirmation = st.text_input("Type the exact approval sentence", value="")
    can_release = bool(plan["ready"] and confirmation == SEMANTIC_CONFIRMATION_TEXT and config.production_ready)
    if st.button("Publish authenticated campaign", disabled=not can_release):
        result = create_semantic_campaign(
            config, run_id=run_id, researcher_id=researcher_id,
            selected=selected, trusted_terms=trusted_terms,
            confirmed_text=confirmation,
        )
        st.success(
            f"Ready for Syncthing: {result['source_published_bytes']:,} new bytes, "
            f"{result['source_reused_bytes']:,} reused. The Studio worker was not launched."
        )

    runs = discover_semantic_runs(config.to_studio)[0] if config.to_studio else ()
    if runs:
        selected_run = st.selectbox("Released campaign", runs)
        st.subheader("Commands")
        for label, action in (
            ("Start approved work", "start_approved"),
            ("Pause after current", "pause_after_current"),
            ("Resume", "resume"),
            ("Cancel unstarted work", "cancel_unstarted"),
        ):
            if st.button(label, key=f"semantic-command-{action}"):
                result = publish_semantic_control(config, selected_run, action)
                st.success(f"Authenticated command {result['command'].sequence} · checksum {result['sha256'][:12]}…")
        st.subheader("Progress")
        status = semantic_status_model(config, selected_run)
        st.markdown(f"### {status['label']}")
        if status.get("stations"):
            st.dataframe(status["stations"], hide_index=True, width="stretch")
        if status.get("documents"):
            st.dataframe(status["documents"], hide_index=True, width="stretch")
        st.caption(
            f"Model phase: {status.get('model_phase', 'waiting')} · receipts: {status['receipt_count']} · "
            f"projection: {status.get('projection_sha256', 'waiting')} · last verified: {status.get('latest_update', 'waiting')}"
        )
        st.subheader("Transfers")
        transfer = transfer_model(config, selected_run)
        st.write(f"{transfer['outgoing_ready']} ready to send · {transfer['returned_ready']} returned")
        if transfer["incomplete"]:
            st.warning(f"{len(transfer['incomplete'])} incomplete pair(s)")
        if transfer["forbidden"]:
            st.error("Forbidden mutable transfer members detected.")

    st.subheader("Review results")
    review = _run021_review()
    if review:
        st.success(f"Run-021 verified read-only: {review['member_count']} members · projection {review['projection_sha256']}")
        st.warning("Analysis, comparisons, retrieval, and grounded Enrichment remain provisional.")
        st.write(f"**Analysis documents:** {len(review['analysis'])}")
        st.write("**Compiler comparison:** Gemma primary and Qwen3.8 comparison; no automatic winner")
        rankings = review["comparison"].get("retrieval_rankings") or {}
        st.write(f"**Retrieval comparison:** {', '.join(rankings) or 'sealed report available'}")
        st.write(f"**Grounded Enrichment:** {len(review['enrichment'])} documents · new model calls: {review['model_calls']}")
        st.write(
            f"**Receipt coverage:** {review['receipt_count']} sealed model receipts · "
            f"{len(review['receipt_gaps'])} identified gaps"
        )
        review_document = st.selectbox(
            "Inspect one verified document",
            sorted(review["analysis"]), key="run021-review-document",
        )
        detail = run021_document_review_model(review, review_document)
        with st.expander("Analysis evidence and candidate vocabulary"):
            st.write(detail["analysis_summary"])
            st.dataframe(
                [{"Source-attested evidence": value} for value in detail["analysis_evidence"]],
                hide_index=True, width="stretch",
            )
            st.caption("Candidate vocabulary: " + ", ".join(detail["candidate_terms"]))
        with st.expander("Gemma and Qwen3.8 compiler comparison"):
            st.write(
                f"{detail['primary_model']} primary · {detail['comparison_model']} comparison · "
                f"exact agreement {detail['exact_agreement_count']} · "
                f"primary-only {detail['primary_only_count']} · "
                f"comparison-only {detail['comparison_only_count']}"
            )
            st.dataframe([
                {
                    "route": route,
                    "claim": row.get("claim_id", ""),
                    "support": row.get("support_status", ""),
                    "citations": ", ".join(row.get("citation_unit_ids") or ()),
                    "statement_sha256": row.get("statement_sha256", ""),
                }
                for route, claims in (
                    ("primary", detail["primary_claims"]),
                    ("comparison", detail["comparison_claims"]),
                ) for row in claims
            ], hide_index=True, width="stretch")
            st.caption("Neither route is declared correct; omitted/different claim counts require researcher review.")
        with st.expander("Retrieval rankings, context, and grounded connections"):
            st.dataframe([
                {"embedding": route, **row}
                for route, rows in (
                    ("Qwen 4096", detail["qwen_ranking"]),
                    ("BGE-M3 1024", detail["bge_ranking"]),
                ) for row in rows
            ], hide_index=True, width="stretch")
            st.write({
                "retrieval_context_sha256": detail["retrieval_context_sha256"],
                "grounded_connections": detail["grounded_connections"],
                "receipt_gaps": detail["receipt_gaps"],
            })
        with st.expander("Methodological warnings"):
            for warning in review["methodological_warnings"]:
                st.write(f"• {warning}")
        st.subheader("Route proposals")
        candidates = preview_returned_proposals(review)
        if not candidates:
            st.caption("Run-021 contains grounded connections but no lexicon/entity/tactic/practice proposals to route.")
        elif corpus_root:
            choices = st.multiselect("Accept provisional proposals into existing local review queues", [row["proposal_id"] for row in candidates])
            if st.button("Route selected proposals for local review", disabled=not choices):
                result = route_returned_proposals(
                    corpus_root=corpus_root, review=review,
                    accepted_proposal_ids=choices,
                )
                st.success(f"{len(result['routed'])} routed; {len(result['duplicates'])} already present. No remote write occurred.")
        st.caption("Local import is preview-only; corpus or Source Queue mutation requires a later confirmed action.")
    else:
        st.caption("No verified sealed result archive is configured for read-only review.")


def render_factory_console(config: FactoryConfig | None = None) -> None:
    config = config or load_factory_config()
    st.header("Mac Studio Factory Console")
    st.info("Durable service console · closing this page does not stop the worker.")
    _render_unified_setup(config)
    if not config.enabled or config.host_role not in {"mac-studio", "synthetic"}:
        st.warning("Configure the Mac Studio factory folders to observe campaigns.")
        return
    if not config.to_studio or not config.from_studio or not config.state_root or not config.job_root:
        return
    runs, rejected, legacy = discover_semantic_runs(config.to_studio)
    st.subheader("Checksum and signature readiness")
    st.write(f"**Complete campaigns:** {len(runs)} · **incomplete/rejected:** {len(rejected)}")
    if legacy:
        st.caption(f"{len(legacy)} legacy/manual campaign(s) remain available in the controls below.")
    if not runs:
        st.caption("No checksum-complete campaign is ready.")
        return
    run_id = st.selectbox("Ready campaign", runs, key="factory-studio-run")
    campaign, _ = _load_semantic_campaign(config, run_id)
    st.write(f"**{len(campaign.document_ids)} documents** · {len(campaign.stage_barriers)} barriers")
    st.caption(SEMANTIC_STATIONS_LABEL)
    verified_sources = 0
    for reference in campaign.source_references:
        verify_checksum_pair(config.to_studio / reference.relative_object_path, relative_path=reference.relative_object_path)
        verified_sources += 1
    st.write(f"**Source verification:** {verified_sources}/{len(campaign.document_ids)} immutable objects complete")
    commands = [relative for relative, _ in verified_json_messages(config.to_studio, f"commands/{run_id}") if relative.endswith(".auth.json")]
    st.write("**Authenticated command ready**" if commands else "**Waiting for MacBook start approval**")
    st.caption(f"Local service state: {config.state_root / run_id} (outside Syncthing)")
    status = worker_status(config.job_root, run_id)
    st.subheader("Durable worker and model safety")
    st.write(f"**Service record:** {status['status']} · **Model phase:** receipt-observed or idle")
    st.write("**Resident model limit:** 1 · **Transition concurrency:** 1 · **Explicit unload:** required")
    st.write(f"**Swap growth guard:** {campaign.memory_policy.maximum_swap_growth_bytes / 1024**3:.1f} GiB")
    st.caption("The LaunchAgent/service owns execution. There is no database editor or remote-write control here.")
    receipt_status = semantic_status_model(config, run_id)
    st.subheader("Attempts, receipts, results, and held reasons")
    st.write(f"{receipt_status['receipt_count']} verified receipts")
    if receipt_status.get("documents"):
        st.dataframe(receipt_status["documents"], hide_index=True, width="stretch")
    results = verified_json_messages(config.from_studio, f"campaigns/{run_id}/results")
    st.write(f"{len(results)} checksum-complete result records returned")
    st.button("Refresh status")


def main() -> None:
    st.set_page_config(
        page_title="Production Line", page_icon="🏭", layout="wide",
    )
    config = load_factory_config()
    if config.host_role == "mac-studio":
        render_factory_console(config)
    else:
        render_production_line(config)


if __name__ == "__main__":
    main()
