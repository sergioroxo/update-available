"""Streamlit integration for exact batch-bound proposal dossiers.

This is deliberately a sibling of the monolithic app.  It reuses the frozen
workflow, Batch Outcome, provisional memory, and existing Local Proposals page.
The only new mutable state is an append-only local research-decision ledger;
no action here changes enrichment, canonical registries, uploads, or release.
"""
from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import streamlit as st

from runner.pipeline.processing_projection import (
    build_processing_projection,
    compilation_visibility_status,
    discover_bound_tail_artifact_record,
    discover_workflow_bundles,
    load_workflow_bundle,
)
from runner.pipeline.review_decisions import (
    append_decision,
    derive_effective_state,
    open_decision_ledger,
    read_cluster_history,
    read_dossier_history,
    register_dossier,
    validate_ledger_integrity,
)
from runner.pipeline.review_dossier import (
    build_review_dossier_index,
    dossier_index_content_fingerprint,
    dossier_index_content_projection,
    write_review_dossier_index,
)
from runner.pipeline.review_inbox_projection import (
    FILTER_OPTIONS,
    dossier_table_rows,
    filter_dossiers,
    resolve_proposal_editor_target,
)
from runner.pipeline.workflow_integrity import canonical_fingerprint


_ACTIONS = {
    "Accept locally": "accept",
    "Edit preferred label": "edit",
    "Reject locally": "reject",
    "Defer": "defer",
    "Add variant": "add_variant",
    "Add evidence": "add_evidence",
    "Merge into dossier": "merge_into",
}


def _outcome_current(projection: dict[str, Any]) -> bool:
    return all(
        str(row.get("base_route") or "") in {"deferred", "technical_hold"}
        or str((row.get("stages") or {}).get("compilation", {}).get("status") or "")
        == "complete"
        for row in projection.get("items") or []
    )


def _decision_dossier(dossier: dict[str, Any]) -> dict[str, Any]:
    """Return exactly the content addressed by ``dossier_fingerprint``."""
    value = copy.deepcopy(dossier)
    expected = str(value.pop("dossier_fingerprint", ""))
    if canonical_fingerprint(value) != expected:
        raise ValueError("Dossier fingerprint does not bind its decision snapshot")
    return value


def _decision_states(
    ledger_path: Path, dossiers: list[dict[str, Any]],
) -> tuple[dict[str, dict[str, Any]], dict[str, int]]:
    if not ledger_path.is_file() or ledger_path.is_symlink():
        return {}, {}
    db = open_decision_ledger(ledger_path, create=False)
    try:
        validate_ledger_integrity(db)
        states = {
            str(dossier["dossier_fingerprint"]): derive_effective_state(
                db, str(dossier["dossier_fingerprint"]),
            )
            for dossier in dossiers
        }
        prior = {
            str(dossier["cluster_id"]): sum(
                int(row.get("decision_count") or 0) > 0
                and row.get("dossier_fingerprint") != dossier.get("dossier_fingerprint")
                for row in read_cluster_history(db, str(dossier["cluster_id"]))
            )
            for dossier in dossiers
        }
        return states, prior
    finally:
        db.close()


def _ensure_dossier_snapshot(dossier_index: dict[str, Any], exports_dir: Path) -> dict[str, Path]:
    """Reuse an exact existing projection without rewriting it on every rerun."""
    workflow_id = str((dossier_index.get("workflow_binding") or {}).get("workflow_batch_id") or "")
    outcome_fp = str((dossier_index.get("outcome_binding") or {}).get("content_fingerprint") or "")
    index_fp = str(dossier_index.get("content_fingerprint") or "")
    root = Path(exports_dir) / "review_dossiers" / workflow_id / outcome_fp
    snapshot = root / "snapshots" / index_fp / "proposal_dossier_index.json"
    latest = root / "latest_proposal_dossier_index.json"
    expected_projection = dossier_index_content_projection(dossier_index)

    def safe_load(path: Path) -> dict[str, Any] | None:
        if (
            not path.is_file() or path.is_symlink()
            or path.stat().st_size > 100 * 1024 * 1024
        ):
            return None
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return None
        return value if isinstance(value, dict) else None

    if snapshot.exists() or snapshot.is_symlink():
        stored_snapshot = safe_load(snapshot)
        if (
            stored_snapshot is None
            or dossier_index_content_fingerprint(stored_snapshot)
            != stored_snapshot.get("content_fingerprint")
            or dossier_index_content_projection(stored_snapshot) != expected_projection
        ):
            raise ValueError("Existing immutable dossier snapshot failed validation")
        stored_latest = safe_load(latest)
        if (
            stored_latest is not None
            and dossier_index_content_fingerprint(stored_latest)
            == stored_latest.get("content_fingerprint")
            and dossier_index_content_projection(stored_latest) == expected_projection
        ):
            return {"snapshot_path": snapshot, "latest_path": latest}
        # The immutable history is valid, but latest is absent/stale/corrupt;
        # let the shared writer repair only that replaceable projection.
    return write_review_dossier_index(dossier_index, exports_dir)


def _open_legacy_proposal(corpus_dir: Path, ref: dict[str, Any], family: str) -> bool:
    record = ref.get("record") if isinstance(ref.get("record"), dict) else {}
    document = record.get("document") if isinstance(record.get("document"), dict) else {}
    target = resolve_proposal_editor_target(
        corpus_dir,
        family=family,
        doc_id=str(document.get("doc_id") or ""),
        proposal_id=str(ref.get("proposal_id") or ""),
    )
    if target is None:
        return False
    st.session_state["lexicon_active_section"] = target["section"]
    st.session_state["local_proposal_active_queue"] = target["queue"]
    st.session_state[target["widget_key"]] = target["widget_value"]
    st.session_state["_nav_to"] = target["page"]
    st.session_state["page"] = target["page"]
    return True


def _render_evidence(corpus_dir: Path, dossier: dict[str, Any], *, key_prefix: str) -> None:
    batch_refs = dossier.get("batch_references") or []
    context_refs = dossier.get("archive_context_references") or []
    st.caption(
        f"{len(batch_refs)} proposal record(s) in this batch · "
        f"{len(context_refs)} additional archive-context record(s). "
        "Archive context does not expand batch membership."
    )
    for lane, refs in (("This batch", batch_refs), ("Archive context", context_refs)):
        if not refs:
            continue
        st.markdown(f"**{lane}**")
        page_size = 10
        page_count = (len(refs) + page_size - 1) // page_size
        page = 1
        if page_count > 1:
            page = st.selectbox(
                f"{lane} evidence page",
                list(range(1, page_count + 1)),
                key=f"{key_prefix}_{lane}_page",
                help=f"Shows at most {page_size} records per page.",
            )
        start = (int(page) - 1) * page_size
        visible_refs = refs[start:start + page_size]
        st.caption(
            f"Showing records {start + 1}–{start + len(visible_refs)} of {len(refs)}."
        )
        for offset, ref in enumerate(visible_refs):
            index = start + offset
            record = ref.get("record") if isinstance(ref.get("record"), dict) else {}
            document = record.get("document") if isinstance(record.get("document"), dict) else {}
            evidence = record.get("evidence") if isinstance(record.get("evidence"), dict) else {}
            provenance = record.get("provenance") if isinstance(record.get("provenance"), dict) else {}
            confidence = (
                record.get("model_confidence")
                if isinstance(record.get("model_confidence"), dict) else {}
            )
            doc_id = str(document.get("doc_id") or "")
            locator = evidence.get("locator") if isinstance(evidence.get("locator"), dict) else {}
            with st.container(border=True):
                st.caption(
                    f"`{doc_id}` · `{ref.get('draft_id', '')}` · "
                    f"state `{record.get('proposal_state', 'unknown')}` · "
                    f"origin `{provenance.get('origin_stage', 'unknown')}`"
                )
                st.caption(
                    f"Source: {document.get('source_url') or 'not recorded'} · "
                    f"source-family proxy: `{document.get('source_family') or 'unknown'}`"
                )
                quote = str(evidence.get("text") or "").strip()
                st.write(quote if quote else "No evidence quote was supplied by this proposal.")
                st.caption(
                    "Model confidence: "
                    f"{confidence.get('proposal_score') if confidence.get('proposal_score') is not None else 'not reported'} · "
                    f"researcher confidence: {confidence.get('researcher_score') if confidence.get('researcher_score') is not None else 'not recorded'}"
                )
                if confidence.get("proposal_rationale"):
                    st.caption(f"Confidence rationale: {confidence['proposal_rationale']}")
                st.caption(
                    "Model/prompt provenance: "
                    f"Analysis `{provenance.get('analysis_model') or 'unknown'}` / "
                    f"`{provenance.get('analysis_prompt_version') or provenance.get('analysis_prompt_hash') or 'unknown prompt'}` · "
                    f"Enrichment `{provenance.get('enrichment_model') or 'unknown'}` / "
                    f"`{provenance.get('enrichment_prompt_version') or provenance.get('enrichment_prompt_hash') or 'unknown prompt'}`"
                )
                st.caption("Full citation locator fields")
                st.json(locator if locator else {"status": "not recorded"})
                can_open = bool(ref.get("proposal_id")) and not str(ref.get("proposal_id")).startswith(
                    "analysis-candidate-"
                )
                if st.button(
                    "Open current proposal editor",
                    key=f"{key_prefix}_{lane}_{index}_{ref.get('draft_id', '')}",
                    disabled=not can_open,
                    help=(
                        "Resolves the stable proposal ID in the current enrichment file. "
                        "Analysis-only discovery hints do not have a proposal editor."
                    ),
                ):
                    if _open_legacy_proposal(corpus_dir, ref, str(dossier.get("family") or "")):
                        st.rerun()
                    st.error(
                        "The proposal ID no longer resolves uniquely. The dossier remains valid "
                        "historical evidence, but the current enrichment file has drifted."
                    )


def _action_payload(
    action: str, dossier: dict[str, Any], dossiers: list[dict[str, Any]], *, prefix: str,
) -> tuple[dict[str, Any], bool]:
    if action == "edit":
        label = st.text_input(
            "Corrected preferred label", value=str(dossier.get("label") or ""),
            key=f"{prefix}_edited_label",
        )
        return {"label": label}, bool(label.strip())
    if action == "add_variant":
        variant = st.text_input("Variant", key=f"{prefix}_variant")
        return {"variant": variant}, bool(variant.strip())
    if action == "add_evidence":
        doc_id = st.text_input("Evidence document ID", key=f"{prefix}_evidence_doc")
        quote = st.text_area("Evidence quote", key=f"{prefix}_evidence_quote")
        locator = st.text_input(
            "Citation locator", key=f"{prefix}_evidence_locator",
            help="For example: citation-unit ID, page, paragraph, or timestamp.",
        )
        return {"doc_id": doc_id, "quote": quote, "locator": locator}, bool(
            doc_id.strip() and quote.strip() and locator.strip()
        )
    if action == "merge_into":
        candidates = [
            row for row in dossiers
            if row.get("family") == dossier.get("family")
            and row.get("dossier_fingerprint") != dossier.get("dossier_fingerprint")
        ]
        if not candidates:
            st.info("No other dossier in this exact batch has a compatible family.")
            return {}, False
        by_fp = {str(row["dossier_fingerprint"]): row for row in candidates}
        target = st.selectbox(
            "Merge target", list(by_fp),
            format_func=lambda fp: str(by_fp[fp].get("label") or by_fp[fp].get("cluster_id")),
            key=f"{prefix}_merge_target",
        )
        return {"target_dossier_fingerprint": target}, True
    return {}, True


def _render_decision_panel(
    ledger_path: Path,
    dossier: dict[str, Any],
    dossiers: list[dict[str, Any]],
    state: dict[str, Any],
    *,
    current: bool,
    key_prefix: str,
) -> None:
    history: list[dict[str, Any]] = []
    if ledger_path.is_file() and not ledger_path.is_symlink():
        db = open_decision_ledger(ledger_path, create=False)
        try:
            history = read_dossier_history(db, str(dossier["dossier_fingerprint"]))
        finally:
            db.close()
    if history:
        st.markdown("**Immutable event history**")
        st.dataframe([{
            "Sequence": row.get("sequence"),
            "Action": row.get("action"),
            "Reviewer": row.get("reviewer"),
            "Reason": row.get("reason"),
            "Payload": row.get("payload_json"),
            "Recorded": row.get("recorded_at"),
            "Event fingerprint": row.get("event_fingerprint"),
        } for row in history], hide_index=True, use_container_width=True)
    else:
        st.caption("No immutable decision events exist for this exact dossier snapshot.")
    disposition = state.get("disposition")
    if isinstance(disposition, dict):
        st.info(
            f"Current local research decision: **{disposition.get('action', 'undecided')}** · "
            f"{state.get('event_count', 0)} immutable event(s)."
        )
    else:
        st.caption("No local grouped-dossier decision has been recorded for this exact snapshot.")
    st.warning(
        "These controls record local research judgement only. They do not approve a proposal in "
        "enrichment.json, change the canonical lexicon, upload to Sanity/Supabase, or authorize release."
    )
    reviewer = st.text_input("Researcher / reviewer", key=f"{key_prefix}_reviewer")
    action_label = st.selectbox("Local research action", list(_ACTIONS), key=f"{key_prefix}_action")
    action = _ACTIONS[action_label]
    reason = st.text_area(
        "Reason / audit note", key=f"{key_prefix}_reason",
        help="Required. Record why this judgement is appropriate for this exact evidence snapshot.",
    )
    payload, payload_ready = _action_payload(action, dossier, dossiers, prefix=key_prefix)
    disabled = not current or not reviewer.strip() or not reason.strip() or not payload_ready
    if not current:
        st.error(
            "This Batch Outcome is stale relative to current local artifacts. Evidence remains "
            "readable, but new decisions are disabled until the batch is recompiled."
        )
    if st.button(
        "Record append-only local decision", key=f"{key_prefix}_record", disabled=disabled,
    ):
        nonce_key = f"{key_prefix}_nonce"
        nonce = int(st.session_state.get(nonce_key, 0))
        idempotency = "ui-" + canonical_fingerprint({
            "dossier": dossier["dossier_fingerprint"], "action": action,
            "reviewer": reviewer, "reason": reason, "payload": payload, "nonce": nonce,
        })[:48]
        db = open_decision_ledger(ledger_path, create=True)
        try:
            for row in dossiers if action == "merge_into" else [dossier]:
                register_dossier(db, _decision_dossier(row))
            append_decision(
                db,
                dossier_fingerprint=str(dossier["dossier_fingerprint"]),
                action=action,
                reviewer=reviewer,
                reason=reason,
                payload=payload,
                idempotency_key=idempotency,
                expected_head=str(state.get("head_fingerprint") or "") or None,
            )
            validate_ledger_integrity(db)
        except Exception as exc:
            st.error(f"Decision was not recorded: {exc}")
        else:
            st.session_state[nonce_key] = nonce + 1
            st.success("Local research decision recorded without changing source proposals or remote records.")
            st.rerun()
        finally:
            db.close()


def render_batch_review_inbox(config: Any, *, key_prefix: str = "review_inbox_batch") -> dict[str, Any]:
    """Render Phase 9B and return the exact document scope for legacy Inbox rows."""
    exports_dir = Path(config.exports_dir)
    corpus_dir = Path(config.corpus_dir)
    result: dict[str, Any] = {"selected": False, "doc_ids": None, "label": "Entire corpus"}
    with st.expander("Batch and grouped-dossier review", expanded=False):
        st.caption(
            "Choose a frozen maximum-15 workflow to review its exact documents and grouped draft "
            "findings. Corpus-wide Review Inbox behavior remains the default."
        )
        bundles = [row for row in discover_workflow_bundles(exports_dir) if row.get("paired")]
        options = ["Entire corpus", *[str(row["workflow_batch_id"]) for row in bundles]]
        selected = st.selectbox("Review scope", options, key=f"{key_prefix}_scope")
        if selected == "Entire corpus":
            st.info("Showing the existing corpus-wide document readiness queue below.")
            return result
        bundle = next(row for row in bundles if row["workflow_batch_id"] == selected)
        try:
            workflow, dispatch = load_workflow_bundle(bundle)
        except Exception as exc:
            st.error(f"The selected workflow bundle was refused: {exc}")
            return result
        outcome_record = discover_bound_tail_artifact_record(
            exports_dir, "batch_outcomes", "latest_batch_outcome.json",
            workflow=workflow, dispatch=dispatch,
        )
        outcome = outcome_record["payload"] if outcome_record else None
        if outcome_record and outcome_record.get("visibility_mode") == "legacy_fallback":
            st.warning(outcome_record["disclosure"])
        elif outcome_record is None:
            visibility = compilation_visibility_status(exports_dir, selected)
            if visibility["state"] == "phase12_incomplete":
                st.warning(visibility["disclosure"])
        try:
            # This validates both <=15 workflow and exact dispatch contracts
            # before any document scope is trusted, including when compilation
            # has not happened yet.
            projection = build_processing_projection(
                workflow, dispatch, corpus_dir, outcome=outcome,
            )
        except Exception as exc:
            st.error(f"The selected workflow/dispatch contract was refused: {exc}")
            return result
        doc_ids = {
            str(row.get("doc_id") or "") for row in dispatch.get("items") or []
            if isinstance(row, dict) and str(row.get("doc_id") or "")
        }
        result = {"selected": True, "doc_ids": doc_ids, "label": selected}
        st.caption(
            f"Exact workflow `{selected}` · {len(workflow.get('items') or [])} frozen item(s) · "
            f"{len(doc_ids)} linked document(s)."
        )
        if outcome is None:
            st.warning(
                "No exact-bound Batch Outcome exists for this workflow yet. The document readiness "
                "queue below is still limited to its linked documents. Finish/compile the workflow "
                "in Source Queue before grouped dossier review."
            )
            return result
        try:
            dossier_index = build_review_dossier_index(
                workflow,
                dispatch,
                outcome,
                Path(str(
                    (outcome_record.get("manifest_artifacts") or {}).get("provisional_memory")
                    or (outcome.get("provisional_memory") or {}).get("path") or ""
                )),
                corpus_dir=corpus_dir,
            )
            written = _ensure_dossier_snapshot(dossier_index, exports_dir)
        except Exception as exc:
            st.error(f"Grouped review refused inconsistent or untrusted local evidence: {exc}")
            return result
        current = _outcome_current(projection)
        if current:
            st.success(
                "Exact batch, outcome, memory, and dossier fingerprints are current. "
                "Local grouped decisions are available."
            )
        else:
            st.warning(
                "This exact outcome is historical/stale relative to current document artifacts. "
                "Dossiers remain readable; new decisions are paused."
            )
        st.caption(
            f"Immutable dossier index `{dossier_index['content_fingerprint'][:16]}…` · "
            f"{written['snapshot_path']}"
        )
        dossiers = dossier_index.get("dossiers") or []
        if not dossiers:
            st.info("This batch contains no focused provisional proposal clusters.")
            return result
        ledger_path = exports_dir / "review_decisions" / "review_decisions.sqlite3"
        try:
            states, prior_counts = _decision_states(ledger_path, dossiers)
        except Exception as exc:
            st.error(f"The append-only decision ledger failed integrity validation: {exc}")
            return result
        metric_cols = st.columns(5)
        metric_cols[0].metric("Dossiers", len(dossiers))
        metric_cols[1].metric("Human exceptions", sum(bool(row.get("human_decision_required")) for row in dossiers))
        metric_cols[2].metric("Conflicts", sum(bool(row.get("conflict_detected")) for row in dossiers))
        metric_cols[3].metric("Decided locally", sum(bool((states.get(str(row["dossier_fingerprint"])) or {}).get("disposition")) for row in dossiers))
        metric_cols[4].metric("Prior snapshots", sum(prior_counts.values()))
        focus = st.selectbox("Dossier focus", FILTER_OPTIONS, key=f"{key_prefix}_focus")
        visible = filter_dossiers(
            dossiers,
            focus,
            decision_states=states,
            prior_clusters={cluster_id for cluster_id, count in prior_counts.items() if count},
        )
        if not visible:
            st.info("No batch dossier matches this focus.")
            return result
        st.dataframe(
            dossier_table_rows(visible, decision_states=states),
            hide_index=True, use_container_width=True,
        )
        by_fp = {str(row["dossier_fingerprint"]): row for row in visible}
        selected_fp = st.selectbox(
            "Open grouped dossier", list(by_fp),
            format_func=lambda fp: (
                f"{by_fp[fp].get('family', '').replace('_', ' ')} · "
                f"{by_fp[fp].get('label') or by_fp[fp].get('cluster_id')}"
            ),
            key=f"{key_prefix}_dossier",
        )
        dossier = by_fp[selected_fp]
        if prior_counts.get(str(dossier.get("cluster_id") or ""), 0):
            st.warning(
                "This concept has a decision on an older evidence snapshot. It is shown as history "
                "and is not silently inherited by the current dossier."
            )
        evidence_tab, decision_tab = st.tabs(["Evidence and provenance", "Local decision history"])
        with evidence_tab:
            _render_evidence(corpus_dir, dossier, key_prefix=f"{key_prefix}_{selected_fp[:12]}")
        with decision_tab:
            _render_decision_panel(
                ledger_path, dossier, dossiers, states.get(selected_fp) or {},
                current=current, key_prefix=f"{key_prefix}_{selected_fp[:12]}",
            )
    return result
