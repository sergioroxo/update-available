"""Thin Streamlit renderer for Phase 10A dependency impact previews."""
from __future__ import annotations

from pathlib import Path
from typing import Any

import streamlit as st

from runner.pipeline.dependency_impact import (
    build_dependency_snapshot,
    preview_dependency_changes,
    scenario_options,
)


IMPACT_LABELS = {
    "directly_changed": "Direct change",
    "would_become_stale": "Would become stale",
    "would_require_revalidation": "Re-audit candidate",
    "conditional_downstream": "Conditional downstream",
    "provenance_unknown": "Provenance unknown",
}


def impact_table_rows(preview: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten the bounded preview into researcher-readable rows."""
    return [{
        "Document": row.get("doc_id") or row.get("queue_item_id") or "unlinked",
        "Change": row.get("change") or "—",
        "Stage/artifact": str(row.get("node") or "").replace("_", " ").title(),
        "Impact": IMPACT_LABELS.get(str(row.get("impact_class") or ""), row.get("impact_class") or "unknown"),
        "Current evidence": row.get("observed_status") or "unknown",
        "Provenance": str(row.get("provenance_coverage") or "unknown").replace("_", " "),
        "Dependency path": " → ".join(
            str(value).replace("_", " ").title() for value in (row.get("reason_path") or [])
        ),
        "Suggested next step": row.get("recommended_action") or "—",
    } for row in preview.get("rows") or []]


def receipt_table_rows(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in snapshot.get("items") or []:
        for stage_id in ("analysis", "enrichment"):
            stage = (item.get("stage_snapshots") or {}).get(stage_id) or {}
            provenance = stage.get("recorded_provenance") or {}
            receipt = provenance.get("input_receipt") if isinstance(provenance.get("input_receipt"), dict) else {}
            validation = stage.get("input_receipt_validation") if isinstance(stage.get("input_receipt_validation"), dict) else {}
            coverage = str(stage.get("provenance_coverage") or "unknown")
            validated_exact = coverage == "exact" and validation.get("valid") is True
            route = validation.get("model_route") if validated_exact else (
                receipt.get("routing_model_alias") or receipt.get("resolved_model") or provenance.get("model") or "—"
            )
            identity_scope = validation.get("model_identity_scope") if validated_exact else "unvalidated / historical"
            rows.append({
                "Document": item.get("doc_id") or item.get("queue_item_id") or "unlinked",
                "Stage": stage_id.title(),
                "Receipt coverage": coverage,
                "Validated complete inputs": "yes" if validated_exact else "no — historical/partial/untrusted",
                "Model route / identity": route,
                "Model identity scope": identity_scope,
                "Request fingerprint": (
                    str(validation.get("request_sha256") or "")[:16] + "…"
                    if validated_exact else "— (unvalidated)"
                ),
                "Extracted-text fingerprint": (
                    str(receipt.get("extracted_text_sha256") or "")[:16] + "…"
                    if validated_exact else "— (unvalidated)"
                ),
            })
    return rows


def render_dependency_impact_preview(
    *,
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    corpus_dir: Path,
    processing_projection: dict[str, Any],
    outcome: dict[str, Any] | None = None,
    review_pack: dict[str, Any] | None = None,
    key_prefix: str = "dependency_impact",
) -> None:
    """Render a no-action scenario preview for the currently selected batch."""
    with st.expander("Change impact preview — read only", expanded=False):
        st.caption(
            "Phase 10A answers ‘what would need attention if something changed?’ for this exact "
            "maximum-15 workflow. It does not stop ingestion, change current statuses, rerun a "
            "model, rebuild an artifact, upload, or publish."
        )
        options = scenario_options()
        labels = {key: label for key, label in options}
        selected = st.multiselect(
            "Declared change to preview",
            [key for key, _ in options],
            default=[],
            format_func=lambda value: labels.get(value, value),
            key=f"{key_prefix}_scenarios",
        )
        show_receipts = st.checkbox(
            "Inspect current Analysis/Enrichment input receipts",
            value=False,
            key=f"{key_prefix}_receipts",
            help="Hashes and model settings only; raw document and prompt text are not displayed.",
        )
        if not selected and not show_receipts:
            st.info(
                "Choose one or more hypothetical changes. Nothing is marked stale merely because "
                "a newer model or prompt exists."
            )
            st.caption(
                "New Analysis/Enrichment runs record exact content-free resolved-input receipts. "
                "Older runs remain correctly labelled partial when those receipts do not exist. "
                "Review dossier/decision history remains in the Phase 9B ledger and is not yet "
                "fingerprinted here. Phase 10A reports these limits instead of guessing."
            )
            return
        try:
            snapshot = build_dependency_snapshot(
                workflow, dispatch, Path(corpus_dir),
                processing_projection=processing_projection,
                outcome=outcome, review_pack=review_pack,
            )
            preview = preview_dependency_changes(snapshot, selected) if selected else None
        except Exception as exc:
            st.error(
                "Impact preview refused evidence that changed or could not be safely bound. "
                f"Refresh after the active ingest step finishes. Detail: {exc}"
            )
            return

        if show_receipts:
            st.markdown("**Resolved model-input receipts (Phase 10B)**")
            st.caption(
                "Exact means this run bound extracted text, complete system/user inputs, resolved model "
                "route/identity scope, parameters, lexicon, provisional memory, tag registry, and policy identities. "
                "A routing alias identifies the route used, not immutable model weights. "
                "Historical runs without that producer receipt are never upgraded retroactively."
            )
            st.dataframe(receipt_table_rows(snapshot), hide_index=True, width="stretch")
        if not selected:
            st.caption(f"Snapshot `{snapshot['evidence_fingerprint'][:16]}…` · read only · no action triggered")
            return

        summary = preview["summary"]
        cols = st.columns(4)
        cols[0].metric("Selected docs", summary["selected_documents"])
        cols[1].metric("Affected docs", summary["affected_documents"])
        cols[2].metric("Would be stale", summary["would_become_stale"])
        cols[3].metric("Re-audit / unknown", summary["revalidation_or_unknown"])
        if preview.get("outside_scope_fanout") == "unknown":
            st.warning(
                "Provisional memory is archive-wide. This bounded preview does not scan all 4,000 "
                "documents, so possible effects outside this selected batch remain unknown."
            )
        rows = impact_table_rows(preview)
        if rows:
            st.dataframe(rows, hide_index=True, width="stretch")
        else:
            st.info("The selected change has no applicable linked stage in this workflow.")
        st.caption(
            f"Snapshot `{snapshot['evidence_fingerprint'][:16]}…` · preview "
            f"`{preview['evidence_fingerprint'][:16]}…` · local files only · no action triggered"
        )
        st.warning(
            "This is a planning aid, not an execution control. Existing artifacts and decisions "
            "remain addressable; a later selective rerun requires a separately reviewed plan."
        )
