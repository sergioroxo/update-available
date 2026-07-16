"""Streamlit completion surface for one exact frozen workflow bundle.

This module only composes local research artifacts. It has no model,
subprocess, upload, publication, queue-mutation, or remote-service adapter.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import streamlit as st

from runner.pipeline.batch_outcome import (
    compile_workflow_batch_outcome,
    validate_batch_outcome,
)
from runner.pipeline.processing_projection import (
    BASE_STAGES,
    compilation_visibility_status,
    discover_bound_tail_artifact_record,
)
from runner.pipeline.review_pack import DEFAULT_QUESTIONS, generate_review_pack, validate_review_pack
from runner.pipeline.workflow_integrity import canonical_fingerprint
from runner.pipeline.compilation_manifest import compilation_batch_key


UNSTABLE_STATES = {"running", "partial", "inconsistent", "invalid"}
UNRESOLVED_STATES = {"missing", "waiting", "ready", "stale", "unknown"}
ACCOUNTABLE_TERMINAL_STATES = {"complete", "held", "failed", "human_required"}


def workflow_completion_gate(projection: dict[str, Any]) -> dict[str, Any]:
    """Say whether current evidence is stable enough for an accountable audit."""
    blockers: list[str] = []
    accepted_exceptions: list[str] = []
    for item in projection.get("items") or []:
        queue_id = str(item.get("queue_item_id") or "unknown item")
        route = str(item.get("base_route") or "")
        linkage = str(item.get("linkage_state") or "")
        if route == "deferred":
            accepted_exceptions.append(f"{queue_id}: triage-settled/deferred")
            continue
        if route == "technical_hold":
            accepted_exceptions.append(f"{queue_id}: triage technical hold")
            continue
        if item.get("attempt_binding_status") == "conflict":
            blockers.append(f"{queue_id}: attempt ledger conflicts with the frozen workflow")
            continue
        if linkage != "linked":
            blockers.append(f"{queue_id}: ordinary processing row is {linkage or 'unlinked'}")
            continue
        stages = item.get("stages") or {}
        for stage_id in BASE_STAGES:
            stage = stages.get(stage_id) or {}
            if not stage.get("required"):
                continue
            status = str(stage.get("status") or "unknown")
            if status not in {"complete", "held", "failed", "human_required"}:
                blockers.append(f"{queue_id}: required {stage_id.replace('_', ' ')} is {status}")
            elif status in {"held", "failed", "human_required"}:
                accepted_exceptions.append(f"{queue_id}: {stage_id.replace('_', ' ')} is {status}")
        for stage_id in ("specialist", "second_opinion"):
            stage = stages.get(stage_id) or {}
            if not stage.get("required"):
                continue
            status = str(stage.get("status") or "unknown")
            if status not in ACCOUNTABLE_TERMINAL_STATES:
                blockers.append(f"{queue_id}: required {stage_id.replace('_', ' ')} is {status}")
            elif status != "complete":
                accepted_exceptions.append(f"{queue_id}: {stage_id.replace('_', ' ')} is {status}")
        if any(
            str(stage.get("consistency_status") or "") == "conflict"
            for stage in stages.values() if isinstance(stage, dict)
        ):
            blockers.append(f"{queue_id}: stage attempt history is inconsistent")
    return {
        "ready": not blockers,
        "blockers": list(dict.fromkeys(blockers)),
        "accepted_exceptions": list(dict.fromkeys(accepted_exceptions)),
    }


def _artifact_download(path: Path, label: str, *, key: str, mime: str) -> None:
    if path.is_file() and not path.is_symlink():
        st.download_button(
            label, data=path.read_bytes(), file_name=path.name, mime=mime, key=key,
        )


def _has_compilation_attempt(exports_dir: Path, batch_id: str) -> bool:
    if not batch_id:
        return False
    attempt_root = (
        Path(exports_dir) / "compilations" / compilation_batch_key(batch_id) / "attempts"
    )
    return attempt_root.is_dir() and any(attempt_root.glob("*/attempt.json"))


def _historical_outcomes(exports_dir: Path, *, limit: int = 20) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    paths = sorted(
        (exports_dir / "batch_outcomes").glob("*/latest_batch_outcome.json"),
        key=lambda value: value.stat().st_mtime_ns if value.is_file() else 0,
        reverse=True,
    )
    for path in paths[:100]:
        if not path.is_file() or path.is_symlink() or path.stat().st_size > 100 * 1024 * 1024:
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        batch_id = str(payload.get("batch_id") or "") if isinstance(payload, dict) else ""
        if _has_compilation_attempt(exports_dir, batch_id):
            continue
        if isinstance(payload, dict) and payload.get("workflow_binding") is None:
            rows.append({
                "label": str(payload.get("batch_id") or path.parent.name),
                "schema": str(payload.get("schema_version") or "historical"),
                "audit_id": str(payload.get("audit_id") or ""),
                "path": str(path.resolve()),
                "visibility": "legacy pre-Phase-12 (no compilation attempt)",
            })
        if len(rows) >= limit:
            break
    return rows


def _historical_review_packs(exports_dir: Path, *, limit: int = 20) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    paths = sorted(
        (exports_dir / "review_packs").glob("*/latest_review_pack.json"),
        key=lambda value: value.stat().st_mtime_ns if value.is_file() else 0,
        reverse=True,
    )
    for path in paths[:100]:
        if not path.is_file() or path.is_symlink() or path.stat().st_size > 100 * 1024 * 1024:
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        binding = payload.get("batch_outcome_binding") if isinstance(payload, dict) else {}
        source_binding = (
            (payload.get("selection_source") or {}).get("batch_outcome_binding")
            if isinstance(payload, dict) and isinstance(payload.get("selection_source"), dict)
            else {}
        )
        batch_id = str((binding or source_binding or {}).get("batch_id") or "")
        if _has_compilation_attempt(exports_dir, batch_id):
            continue
        if isinstance(payload, dict) and payload.get("workflow_binding") is None:
            rows.append({
                "label": str(payload.get("label") or path.parent.name),
                "pack_id": str(payload.get("pack_id") or ""),
                "privacy": str(payload.get("privacy_mode") or "historical"),
                "path": str(path.resolve()),
                "visibility": "legacy pre-Phase-12 (no compilation attempt)",
            })
        if len(rows) >= limit:
            break
    return rows


def render_workflow_outputs(
    config: Any, *, workflow: dict[str, Any], dispatch: dict[str, Any],
    projection: dict[str, Any], key_prefix: str,
) -> None:
    """Render one bounded local completion lane for the selected workflow."""
    exports_dir = Path(config.exports_dir)
    corpus_dir = Path(config.corpus_dir)
    expected_binding = {
        "workflow_batch_id": workflow["workflow_batch_id"],
        "workflow_fingerprint": workflow["evidence_fingerprint"],
        "dispatch_fingerprint": dispatch["evidence_fingerprint"],
    }
    identity = canonical_fingerprint(expected_binding)
    state_prefix = f"{key_prefix}_workflow_outputs"
    if st.session_state.get(f"{state_prefix}_identity") != identity:
        st.session_state[f"{state_prefix}_identity"] = identity
        st.session_state.pop(f"{state_prefix}_outcome_result", None)
        st.session_state.pop(f"{state_prefix}_pack_result", None)

    with st.expander("Finish selected workflow — local research files", expanded=False):
        st.markdown(
            f"**Selected workflow:** `{workflow['workflow_batch_id']}` · "
            f"{len(workflow.get('items') or [])} frozen item(s)"
        )
        st.caption(
            "Uses the same frozen workflow shown above. It compiles existing local evidence and can "
            "create a bounded Review Pack. It does not call a model, rerun triage, ingest, upload, "
            "publish, or approve draft terms and tags. Compilation also refreshes derived local "
            "provisional-memory and dry-run tag-projection files; it does not write document sidecars."
        )
        gate = workflow_completion_gate(projection)
        if gate["ready"]:
            st.success("The selected workflow is stable enough to compile an accountable local audit.")
        else:
            st.error(
                "Compilation is paused because current evidence is unfinished or contradictory. "
                "Resolve these items in the Processing Queue first."
            )
            st.dataframe(
                [{"Blocking condition": value} for value in gate["blockers"]],
                hide_index=True, use_container_width=True,
            )
        if gate["accepted_exceptions"]:
            st.info(
                "These are retained as visible exceptions, not silently treated as successful: "
                + "; ".join(gate["accepted_exceptions"])
            )

        outcome_record = discover_bound_tail_artifact_record(
            exports_dir, "batch_outcomes", "latest_batch_outcome.json",
            workflow=workflow, dispatch=dispatch,
        )
        outcome = outcome_record["payload"] if outcome_record else None
        outcome_path = Path(outcome_record["path"]) if outcome_record else None
        if outcome_record and outcome_record.get("visibility_mode") == "legacy_fallback":
            st.warning(outcome_record["disclosure"])
        elif outcome_record is None:
            visibility = compilation_visibility_status(exports_dir, workflow["workflow_batch_id"])
            if visibility["state"] == "phase12_incomplete":
                st.warning(visibility["disclosure"])
        if outcome is not None:
            try:
                validate_batch_outcome(
                    outcome, workflow=workflow, dispatch=dispatch,
                    corpus_dir=corpus_dir, require_bound=True,
                )
            except Exception as exc:
                st.error(f"The existing bound Batch Outcome failed validation: {exc}")
                outcome = None
                outcome_path = None
        tail_is_current = all(
            row.get("base_route") in {"deferred", "technical_hold"}
            or row.get("stages", {}).get("compilation", {}).get("status") == "complete"
            for row in projection.get("items") or []
        )
        if outcome is not None and not tail_is_current:
            st.warning(
                "The existing Batch Outcome is bound to this workflow but its recorded source "
                "artifacts are no longer current. Recheck before creating another Review Pack."
            )
            outcome = None
            outcome_path = None

        compile_label = (
            "Recheck batch against current local evidence" if outcome is not None
            else "Create batch audit summary"
        )
        if st.button(
            compile_label, key=f"{state_prefix}_compile", disabled=not gate["ready"],
            help=(
                "Writes immutable/latest local audit files plus derived provisional-memory and "
                "dry-run tag-projection exports; no document sidecars or remote records."
            ),
        ):
            try:
                result = compile_workflow_batch_outcome(
                    workflow, dispatch, corpus_dir, exports_dir / "batch_outcomes",
                    policy_path=Path(__file__).resolve().parent / "data" / "batch_outcome_policy.json",
                )
            except Exception as exc:
                st.error(f"Batch audit compilation failed closed: {exc}")
            else:
                outcome = result["outcome"]
                outcome_path = Path(result["outcome_path"])
                st.success(
                    "Batch audit summary is ready. Every frozen workflow row is accounted for; "
                    "no model was called and nothing was uploaded or published."
                )

        if outcome is not None and outcome_path is not None:
            summary = outcome.get("summary") or {}
            cols = st.columns(4)
            cols[0].metric("Accounted", summary.get("accounted_for", 0))
            cols[1].metric("Expected", summary.get("expected_items", 0))
            cols[2].metric("Triage holds", summary.get("routed_holds", 0))
            cols[3].metric("Audit changes", len((outcome.get("changes_from_previous") or {}).get("changed") or []))
            st.caption(
                f"Bound audit `{outcome.get('audit_id', '')}` · content fingerprint "
                f"`{str(outcome.get('content_fingerprint') or '')[:16]}…`"
            )
            exception_rows = [
                row for row in outcome.get("items") or []
                if isinstance(row, dict) and (
                    row.get("primary_outcome") != "ordinary_ready"
                    or any(
                        str(route.get("status") or "") not in {"complete", "not_applicable"}
                        for route in row.get("specialist_routes") or [] if isinstance(route, dict)
                    )
                )
            ]
            exception_rows.extend(
                row for row in outcome.get("routed_holds") or [] if isinstance(row, dict)
            )
            if exception_rows:
                st.dataframe([{
                    "Item": row.get("item_id", ""),
                    "Document": row.get("doc_id", "") or "not linked",
                    "Outcome": row.get("primary_outcome", row.get("status", "")),
                    "Reason": "; ".join(
                        str(value.get("message") or value.get("reason") or "")
                        for value in row.get("findings") or row.get("specialist_routes") or []
                        if isinstance(value, dict)
                    ) or str(row.get("error") or ""),
                } for row in exception_rows], hide_index=True, use_container_width=True)
            download_cols = st.columns(2)
            with download_cols[0]:
                _artifact_download(
                    outcome_path, "Download audit JSON",
                    key=f"{state_prefix}_outcome_json", mime="application/json",
                )
            with download_cols[1]:
                markdown_path = (
                    outcome_path.with_name("latest_batch_outcome.md")
                    if outcome_path.name == "latest_batch_outcome.json"
                    else outcome_path.with_name("batch_outcome.md")
                )
                _artifact_download(
                    markdown_path, "Download audit Markdown",
                    key=f"{state_prefix}_outcome_md", mime="text/markdown",
                )

            st.divider()
            st.markdown("**Codex Review Pack**")
            st.caption(
                "A bounded packet for close review or an external AI consultation. Suggestions remain "
                "provisional and cannot become canonical records from this action."
            )
            linked_documents = [
                row for row in outcome.get("items") or []
                if isinstance(row, dict) and str(row.get("doc_id") or "")
            ]
            privacy_mode = st.selectbox(
                "Sharing mode",
                ["private_local", "external_safe"],
                format_func=lambda value: (
                    "Private research pack (full local evidence)" if value == "private_local"
                    else "Shareable draft (paths and sensitive specialist contents withheld)"
                ),
                key=f"{state_prefix}_privacy",
            )
            if privacy_mode == "external_safe":
                st.warning(
                    "Shareable draft is a conservative path/sensitive-content transform, not an "
                    "anonymization guarantee. Review it before sharing."
                )
            questions_text = st.text_area(
                "Optional review questions (one per line)", height=90,
                key=f"{state_prefix}_questions",
            )
            questions = [line.strip() for line in questions_text.splitlines() if line.strip()]
            effective_questions = questions or DEFAULT_QUESTIONS
            pack_request_fingerprint = canonical_fingerprint({
                "outcome_content_fingerprint": outcome.get("content_fingerprint"),
                "privacy_mode": privacy_mode,
                "questions": effective_questions,
            })
            if not linked_documents:
                st.info("This audit contains no linked local documents, so there is no Review Pack to create.")
            if st.button(
                "Create Review Pack", key=f"{state_prefix}_pack",
                disabled=not linked_documents,
            ):
                try:
                    pack_result = generate_review_pack(
                        corpus_dir, exports_dir / "review_packs", outcome_path=outcome_path,
                        review_questions=questions or None, privacy_mode=privacy_mode,
                    )
                    validate_review_pack(
                        pack_result["pack"], expected_workflow_binding=expected_binding,
                        source_outcome=outcome, require_bound=True,
                    )
                except Exception as exc:
                    st.error(f"Review Pack generation failed closed: {exc}")
                else:
                    pack_result["request_fingerprint"] = pack_request_fingerprint
                    st.session_state[f"{state_prefix}_pack_result"] = pack_result
                    st.success(
                        "Review Pack ready. No model was called and no draft, archive record, "
                        "upload, or publication state was changed."
                    )
            pack_result = st.session_state.get(f"{state_prefix}_pack_result") or {}
            pack = pack_result.get("pack") or {}
            if (
                pack.get("workflow_binding") != expected_binding
                or pack_result.get("request_fingerprint") != pack_request_fingerprint
            ):
                existing_pack_record = discover_bound_tail_artifact_record(
                    exports_dir, "review_packs", "latest_review_pack.json",
                    workflow=workflow, dispatch=dispatch,
                )
                if existing_pack_record and existing_pack_record.get("visibility_mode") == "legacy_fallback":
                    st.warning(existing_pack_record["disclosure"])
                existing_pack = existing_pack_record["payload"] if existing_pack_record else {}
                try:
                    if existing_pack:
                        validate_review_pack(
                            existing_pack, expected_workflow_binding=expected_binding,
                            source_outcome=outcome, require_bound=True,
                        )
                except Exception:
                    existing_pack = {}
                if (
                    existing_pack.get("privacy_mode") == privacy_mode
                    and existing_pack.get("review_questions") == effective_questions
                ):
                    latest_json = Path(existing_pack_record["path"])
                    pack_result = {
                        "pack": existing_pack,
                        "json_path": latest_json,
                        "markdown_path": latest_json.with_name("latest_review_pack.md"),
                        "request_fingerprint": pack_request_fingerprint,
                    }
                    pack = existing_pack
            if (
                pack.get("workflow_binding") == expected_binding
                and pack_result.get("request_fingerprint") == pack_request_fingerprint
            ):
                st.caption(
                    f"Pack `{pack.get('pack_id', '')}` · {pack.get('document_count', 0)} document(s) · "
                    f"`{pack.get('privacy_mode', '')}`"
                )
                pack_cols = st.columns(2)
                with pack_cols[0]:
                    _artifact_download(
                        Path(pack_result["markdown_path"]), "Download Review Pack Markdown",
                        key=f"{state_prefix}_pack_md", mime="text/markdown",
                    )
                with pack_cols[1]:
                    _artifact_download(
                        Path(pack_result["json_path"]), "Download Review Pack JSON",
                        key=f"{state_prefix}_pack_json", mime="application/json",
                    )

        historical = _historical_outcomes(exports_dir)
        historical_packs = _historical_review_packs(exports_dir)
        if historical or historical_packs:
            st.divider()
            if st.checkbox(
                "Show historical unbound outputs (read only)",
                key=f"{state_prefix}_historical",
            ):
                st.warning(
                    "These older files remain available for research provenance, but they are not "
                    "bound to the selected workflow and cannot mark Processing Queue stages complete."
                )
                if historical:
                    st.markdown("**Batch Outcomes**")
                    choices = {f"{row['label']} · {row['audit_id'] or row['schema']}": row for row in historical}
                    selected = choices[st.selectbox(
                        "Historical Batch Outcome", list(choices), key=f"{state_prefix}_historical_outcome_select",
                    )]
                    st.dataframe(historical, hide_index=True, use_container_width=True)
                    _artifact_download(
                        Path(selected["path"]), "Download historical Outcome JSON",
                        key=f"{state_prefix}_historical_outcome_download", mime="application/json",
                    )
                if historical_packs:
                    st.markdown("**Review Packs**")
                    pack_choices = {f"{row['label']} · {row['pack_id']}": row for row in historical_packs}
                    selected_pack = pack_choices[st.selectbox(
                        "Historical Review Pack", list(pack_choices), key=f"{state_prefix}_historical_pack_select",
                    )]
                    st.dataframe(historical_packs, hide_index=True, use_container_width=True)
                    _artifact_download(
                        Path(selected_pack["path"]), "Download historical Review Pack JSON",
                        key=f"{state_prefix}_historical_pack_download", mime="application/json",
                    )
