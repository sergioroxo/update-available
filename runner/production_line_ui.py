"""Non-technical, receipt-backed synthetic Production Line interfaces."""
from __future__ import annotations

from pathlib import Path
import shutil

import streamlit as st

from runner.config import FactoryConfig, load_factory_config
from runner.models.reprocessing import ResearchCampaignV2
from runner.pipeline.factory_controller import (
    DOCUMENT_IDS, FIXTURE_BYTES, publish_campaign_command,
    publish_synthetic_campaign,
)
from runner.pipeline.factory_messages import scan_checksum_pairs, verify_checksum_pair
from runner.pipeline.factory_messages import sha256_bytes
from runner.pipeline.factory_auth import public_key_allowlist
from runner.pipeline.factory_supervisor import launch_worker, worker_status
from runner.pipeline.syncthing_exchange import (
    discover_campaign_ids, forbidden_mutable_members, load_factory_receipts,
    observe_receipts, verified_json_messages,
)


CONFIRMATION = "I understand this authorizes synthetic local processing only."
PROHIBITED = "No models, RAG, remote writes, publication, or research data"
CANARY_STATIONS_LABEL = "Verify source → Prepare complete text → Build complete V2 units"


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


def render_production_line(config: FactoryConfig | None = None) -> None:
    config = config or load_factory_config()
    st.title("🏭 Production Line")
    st.info("Dry run only — synthetic local processing. Research sources and models are unavailable here.")
    st.subheader("Copied-text canary — not yet released")
    readiness = production_readiness_model(config)
    st.warning("Not yet released — Run-009 prepares the production foundation. A real copied file cannot be released here.")
    st.write(f"**Three safe steps:** {readiness['station_sequence']}")
    st.write(f"**Maximum copied text:** {readiness['maximum_bytes']:,} bytes · strict UTF-8 .txt or .md")
    st.write("**Authentication:** " + ("Ready" if readiness["configuration_ready"] else "Setup required"))
    st.write("**Storage preflight:** checked below · **Result import:** Not authorized")
    st.caption("No network acquisition, models, embeddings, RAG, import, remote destination, or publication action.")
    if readiness["reasons"]:
        for reason in readiness["reasons"]:
            st.caption(f"• {reason}")
    uploaded = st.file_uploader(
        "Preview one copied .txt or .md file (nothing is retained or sent)",
        type=["txt", "md"], key="production-canary-preview",
    )
    if uploaded is not None:
        preview = copied_canary_preview(
            uploaded.getvalue(), filename=uploaded.name,
            maximum_bytes=config.maximum_copied_text_bytes,
        )
        st.write(f"{preview['safe_filename']} · {preview['byte_count']:,} bytes")
        st.code(preview["sha256"])
        st.write("Strict UTF-8 valid" if preview["strict_utf8_valid"] else "Needs attention")
        st.caption("Preview only — no source object, campaign, or command was created.")
    st.info(f"Next gate: {readiness['next_gate']}")
    st.divider()
    setup = setup_model(config)
    st.subheader("Setup")
    st.write(f"This machine: **{setup['host_role']}**")
    if not setup["enabled"]:
        st.warning("Setup required")
        for problem in setup["problems"]:
            st.write(f"• {problem}")
        return
    for label, path in setup["paths"].items():
        st.write(f"**{label}:** {'Ready' if path and path.exists() else 'Folder will be created when used'}")
    capacity_root = config.job_root or Path.cwd()
    free = shutil.disk_usage(capacity_root if capacity_root.exists() else capacity_root.parent).free
    st.write(f"**Storage preflight:** {'Ready' if free >= 66 else 'Needs attention'} for 66 synthetic bytes")
    runs = discover_campaign_ids(config.to_studio) if config.to_studio else ()
    st.subheader("Campaigns")
    run_id = st.text_input("Exact dry-run ID", value="synthetic-console-008")
    st.write("Three synthetic documents · one package · synthetic preparation · retry limit 2")
    st.caption(f"{sum(map(len, FIXTURE_BYTES.values()))} source bytes · {PROHIBITED}")
    confirmed = st.checkbox(CONFIRMATION)
    if st.button("Create ready-to-sync campaign", disabled=not confirmed):
        result = create_confirmed_campaign(config, run_id, confirmed)
        st.success(
            f"Ready to sync — {result['source_published_bytes']} new bytes, "
            f"{result['source_reused_bytes']} reused."
        )
        runs = discover_campaign_ids(config.to_studio)
    if not runs:
        st.info("No dry-run campaigns yet.")
        return
    selected = st.selectbox("Campaign", runs, index=runs.index(run_id) if run_id in runs else 0)
    st.subheader("Commands")
    actions = {
        "Start": "start_approved", "Pause after current document": "pause_after_current",
        "Resume": "resume", "Cancel unstarted work": "cancel_unstarted",
    }
    for label, action in actions.items():
        if st.button(label, key=f"factory-command-{action}"):
            result = publish_control(config, selected, action)
            st.success(
                f"Ready to sync · command {result['command'].sequence} · "
                f"checksum {result['sha256'][:12]}…"
            )
    command_rows = []
    for relative, payload in verified_json_messages(config.to_studio, f"commands/{selected}"):
        command_rows.append({
            "Sequence": payload["sequence"], "Command": payload["command_id"],
            "Action": payload["action"], "Issued": payload["issued_at"],
            "Expires": payload["expires_at"],
            "Checksum": verify_checksum_pair(
                config.to_studio / relative, relative_path=relative,
            )["sha256"][:12] + "…",
        })
    if command_rows:
        st.dataframe(command_rows, hide_index=True, use_container_width=True)
    status = status_model(config, selected)
    st.subheader("Status")
    st.markdown(f"### {status['label']}")
    if status["documents"]:
        st.dataframe(status["documents"], hide_index=True, use_container_width=True)
        st.write(
            f"**{status['counts']['succeeded']} completed** · "
            f"**{status['counts']['held'] + status['counts']['failed']} need attention**"
        )
        st.caption(f"Latest verified update: {status['latest_update']}")
    transfer = transfer_model(config, selected)
    st.subheader("Transfer")
    st.write(f"{transfer['outgoing_ready']} files ready to sync · {transfer['returned_ready']} returned")
    if transfer["incomplete"]:
        st.warning(f"{len(transfer['incomplete'])} incomplete checksum pair(s)")
    if transfer["forbidden"]:
        st.error("Unsafe mutable files detected in a shared folder.")
    exceptions = [row for row in status["documents"] if row["state"] in {"held", "failed"}]
    st.subheader("Exceptions")
    if exceptions:
        st.dataframe(exceptions, hide_index=True, use_container_width=True)
    else:
        st.caption("Nothing needs attention.")
    with st.expander("Audit details"):
        st.write({key: status.get(key) for key in (
            "last_sequence", "projection_sha256", "barrier_eligible", "receipt_count",
        )})


def render_factory_console(config: FactoryConfig | None = None) -> None:
    config = config or load_factory_config()
    st.header("Factory campaigns")
    st.info("Dry run only — no models, uploads, publication, or research sources.")
    st.subheader("Production service readiness — service not installed")
    readiness = production_readiness_model(config)
    fingerprints = configured_key_fingerprints(config)
    st.write("**Configuration:** " + ("Ready" if readiness["configuration_ready"] else "Setup required"))
    st.write("**Service:** Not installed · Not running")
    st.write(f"**Three safe steps:** {readiness['station_sequence']}")
    if config.state_root:
        st.caption(f"Local state: `{config.state_root}`")
    if config.service_log_root:
        st.caption(f"Local service logs: `{config.service_log_root}`")
    for label, values in fingerprints.items():
        st.caption(f"{label.replace('_', ' ').title()}: {', '.join(values) if values else 'Not configured'}")
    st.warning("A separate host-local approval is required before installing or starting the service.")
    st.caption("Most recent authenticated service status: None")
    st.divider()
    if not config.enabled or config.host_role not in {"mac-studio", "synthetic"}:
        st.warning("Setup required for the Mac Studio factory folders.")
        return
    assert config.to_studio and config.from_studio and config.state_root and config.job_root
    runs = discover_campaign_ids(config.to_studio)
    if not runs:
        st.info("No checksum-complete campaigns are ready.")
        return
    run_id = st.selectbox("Ready campaign", runs, key="factory-studio-run")
    campaign, _ = _campaign(config, run_id)
    st.write(f"{len(campaign.selected_document_ids)} documents · synthetic preparation · stop at barrier")
    verified_sources = 0
    for reference in campaign.source_references:
        verify_checksum_pair(
            config.to_studio / reference.relative_object_path,
            relative_path=reference.relative_object_path,
        )
        verified_sources += 1
    st.write(f"**{verified_sources} source objects verified**")
    commands = verified_json_messages(config.to_studio, f"commands/{run_id}")
    st.write("**Command ready**" if commands else "**Waiting for MacBook approval**")
    st.caption(f"Local worker files: `{config.state_root / run_id}` (outside shared folders)")
    status = worker_status(config.job_root, run_id)
    labels = {
        "not_started": "Worker not started", "running": "Running on Mac Studio",
        "completed": "Worker completed", "failed": "Worker needs attention",
        "stale": "Worker record needs attention",
    }
    st.write(f"**{labels[status['status']]}**")
    col_run, col_refresh = st.columns(2)
    if col_run.button(
        "Run all ready work for this campaign",
        disabled=status["status"] == "running",
    ):
        launch_worker(
            to_studio=config.to_studio, from_studio=config.from_studio,
            state_root=config.state_root, job_root=config.job_root, run_id=run_id,
        )
        st.success("Worker started in the background. This page may now be closed.")
    col_refresh.button("Refresh status")
    receipt_status = status_model(config, run_id)
    st.write(f"{receipt_status['receipt_count']} verified receipts returned")
    results = verified_json_messages(
        config.from_studio, f"campaigns/{run_id}/results",
    )
    st.write(f"{len(results)} result records returned")
    transfer = transfer_model(config, run_id)
    if transfer["forbidden"]:
        st.error("Unsafe mutable files detected in a shared folder.")


def main() -> None:
    st.set_page_config(
        page_title="Synthetic Production Line", page_icon="🏭", layout="wide",
    )
    config = load_factory_config()
    if config.host_role == "mac-studio":
        render_factory_console(config)
    else:
        render_production_line(config)


if __name__ == "__main__":
    main()
