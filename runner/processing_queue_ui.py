"""Thin Streamlit renderer for the bounded, read-only Processing Queue."""
from __future__ import annotations

from pathlib import Path
from typing import Any

import streamlit as st

from runner.pipeline.processing_projection import (
    STAGE_ORDER,
    build_processing_projection,
    compilation_visibility_status,
    discover_bound_tail_artifact_record,
    discover_workflow_bundles,
    filter_processing_items,
    load_workflow_bundle,
)


FOCUS_OPTIONS = (
    "Needs attention", "All", "Failed / invalid", "Stale / missing",
    "Specialist / human", "Unlinked", "Core processing complete",
)


def processing_worklist_rows(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Flatten only the high-value worklist fields for researcher scanning."""
    rows = []
    for row in items:
        specialist = row.get("stages", {}).get("specialist", {})
        second = row.get("stages", {}).get("second_opinion", {})
        operation = next((
            value for value in (
                specialist.get("operation_status"), second.get("operation_status"),
            ) if value and value != "not_recorded"
        ), "—")
        integrity = "conflict" if (
            row.get("attempt_binding_status") == "conflict"
            or specialist.get("consistency_status") == "conflict"
            or second.get("consistency_status") == "conflict"
        ) else "bound"
        rows.append({
        "Item": row.get("queue_item_id", ""),
        "Document": row.get("doc_id") or "not linked",
        "Title/source": row.get("title") or row.get("source_url") or "—",
        "Base route": row.get("base_route") or "—",
        "Overall": row.get("overall_status") or "unknown",
        "Specialists": ", ".join(
            value.get("stage_id", "") for value in row.get("specialist_routes") or []
        ) or "—",
        "Last operation": operation,
        "Attempt integrity": integrity,
        "Next action": row.get("next_action") or "—",
        "Why": row.get("attention_reason") or "—",
        })
    return rows


def processing_matrix_rows(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{
        "Document": row.get("doc_id") or row.get("queue_item_id") or "unlinked",
        "Specialist operation": row.get("stages", {}).get("specialist", {}).get("operation_status", "not_recorded"),
        "Attempt integrity": row.get("attempt_binding_status", "unknown"),
        **{
            stage_id.replace("_", " ").title(): row.get("stages", {}).get(stage_id, {}).get("status", "unknown")
            for stage_id in STAGE_ORDER
        },
    } for row in items]


def _attempt_rows(exports_dir: Path, workflow_batch_id: str) -> list[dict[str, Any]]:
    ledger = exports_dir / "workflow_attempts" / "attempts.sqlite3"
    if not ledger.is_file() or ledger.is_symlink():
        return []
    from runner.pipeline.workflow_attempts import list_attempts_for_workflow
    result = list_attempts_for_workflow(ledger, workflow_batch_id, limit=5000)
    if result["truncated"]:
        raise ValueError(
            f"Attempt history is incomplete ({len(result['rows'])} of {result['total']} rows); refusing a partial projection."
        )
    return result["rows"]


def render_processing_queue(config, *, key_prefix: str = "processing_queue") -> None:
    """Render persisted workflow evidence without executing or writing anything."""
    exports_dir = Path(config.exports_dir)
    corpus_dir = Path(config.corpus_dir)
    with st.expander("Processing Queue — read only", expanded=False):
        st.caption(
            "Shows current local evidence for one frozen workflow batch (maximum 15). "
            "It does not rerun triage, guess document links, call a model, check remote systems, "
            "upload, publish, or change any file."
        )
        bundles = discover_workflow_bundles(exports_dir)
        paired = [row for row in bundles if row["paired"]]
        if not paired:
            st.info("No paired persisted workflow and specialist-dispatch plan is available yet.")
            return
        bundle_by_id = {row["workflow_batch_id"]: row for row in paired}
        selected_id = st.selectbox(
            "Frozen workflow batch",
            list(bundle_by_id),
            key=f"{key_prefix}_batch_id",
        )
        bundle = bundle_by_id[selected_id]
        try:
            workflow, dispatch = load_workflow_bundle(bundle)
            attempts = _attempt_rows(exports_dir, selected_id)
            outcome_record = discover_bound_tail_artifact_record(
                exports_dir, "batch_outcomes", "latest_batch_outcome.json",
                workflow=workflow, dispatch=dispatch,
            )
            review_pack_record = discover_bound_tail_artifact_record(
                exports_dir, "review_packs", "latest_review_pack.json",
                workflow=workflow, dispatch=dispatch,
            )
            outcome = outcome_record["payload"] if outcome_record else None
            review_pack = review_pack_record["payload"] if review_pack_record else None
            projection = build_processing_projection(
                workflow, dispatch, corpus_dir, attempts=attempts,
                outcome=outcome, review_pack=review_pack,
            )
        except Exception as exc:
            st.error(f"Processing Queue refused untrusted or inconsistent local evidence: {exc}")
            return

        legacy_records = [
            row for row in (outcome_record, review_pack_record)
            if row and row.get("visibility_mode") == "legacy_fallback"
        ]
        if legacy_records:
            st.warning(legacy_records[0]["disclosure"])
        elif outcome_record is None:
            visibility = compilation_visibility_status(exports_dir, selected_id)
            if visibility["state"] == "phase12_incomplete":
                st.warning(visibility["disclosure"])

        summary = projection["summary"]
        metric_cols = st.columns(4)
        metric_cols[0].metric("Batch items", summary["items"])
        metric_cols[1].metric("Linked", summary["linked"])
        metric_cols[2].metric("Need attention", summary["needs_attention"])
        metric_cols[3].metric("Core complete", summary["complete"])
        st.caption(
            f"Verified locally: {projection['verified_at']} · fingerprint "
            f"`{projection['projection_fingerprint'][:16]}…` · remote state not checked"
        )

        focus = st.selectbox(
            "Focus",
            FOCUS_OPTIONS,
            key=f"{key_prefix}_focus",
        )
        visible = filter_processing_items(projection["items"], focus)
        worklist_tab, matrix_tab, detail_tab = st.tabs(
            ["Researcher worklist", "Stage matrix", "Evidence detail"]
        )
        with worklist_tab:
            rows = processing_worklist_rows(visible)
            if rows:
                st.dataframe(rows, hide_index=True, use_container_width=True)
            else:
                st.info("No workflow rows match this focus.")
        with matrix_tab:
            rows = processing_matrix_rows(visible)
            if rows:
                st.dataframe(rows, hide_index=True, use_container_width=True)
            else:
                st.info("No workflow rows match this focus.")
        with detail_tab:
            if not visible:
                st.info("Select a focus with at least one workflow row to inspect evidence.")
            else:
                item_by_key = {
                    f"{row.get('doc_id') or 'unlinked'} · {row['queue_item_id']}": row
                    for row in visible
                }
                selected_item = st.selectbox(
                    "Workflow row",
                    list(item_by_key),
                    key=f"{key_prefix}_detail_item",
                )
                item = item_by_key[selected_item]
                st.write(item.get("linkage_detail") or "No linkage detail recorded.")
                st.dataframe([{
                    "Stage": stage_id.replace("_", " ").title(),
                    "Required": stage["required"],
                    "Status": stage["status"],
                    "Artifact": stage["artifact_status"],
                    "Last operation": stage["operation_status"],
                    "History check": stage["consistency_status"],
                    "Authority": stage["authority"],
                    "Evidence": ", ".join(stage["evidence"]) or "—",
                    "Detail": stage["detail"] or "—",
                } for stage_id in STAGE_ORDER for stage in [item["stages"][stage_id]]],
                    hide_index=True, use_container_width=True,
                )
                if item.get("attempts"):
                    st.markdown("**Append-only attempt history for this row**")
                    st.dataframe(item["attempts"], hide_index=True, use_container_width=True)
                if item.get("rejected_attempts"):
                    st.error(item.get("attempt_binding_detail"))
                    st.dataframe(item["rejected_attempts"], hide_index=True, use_container_width=True)

        from runner.dependency_impact_ui import render_dependency_impact_preview
        render_dependency_impact_preview(
            workflow=workflow,
            dispatch=dispatch,
            corpus_dir=corpus_dir,
            processing_projection=projection,
            outcome=outcome,
            review_pack=review_pack,
            key_prefix=f"{key_prefix}_impact",
        )

        st.warning(
            "This view is diagnostic. Use the existing workflow planner and guarded controls for any "
            "later action; public release remains a separate researcher decision."
        )
        st.caption(f"Workflow: `{bundle['workflow_path']}`")
        st.caption(f"Dispatch: `{bundle['dispatch_path']}`")

    # Deliberately a sibling surface: actions never appear inside the
    # diagnostic read-only queue and always use its exact selected bundle.
    from runner.workflow_outputs_ui import render_workflow_outputs
    render_workflow_outputs(
        config, workflow=workflow, dispatch=dispatch, projection=projection,
        key_prefix=key_prefix,
    )
