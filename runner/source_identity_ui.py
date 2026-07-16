"""Streamlit renderer for the read-only-first Phase 11 identity projection."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import streamlit as st

from runner.pipeline.source_identity import build_identity_snapshot, write_identity_snapshot
from runner.pipeline.source_identity_decisions import (
    apply_identity_decisions,
    append_identity_decision,
    candidate_fingerprint,
    create_identity_decision,
    load_identity_decisions,
    partition_identity_decisions,
    validate_reviewed_identity_projection,
    write_reviewed_identity_projection,
)


def _display_value(value: Any) -> str:
    if isinstance(value, list):
        return "; ".join(str(item) for item in value) or "—"
    return str(value or "—")


def identity_table_rows(snapshot: dict) -> list[dict]:
    rows = []
    for document in snapshot.get("documents") or []:
        fields = document.get("fields") or {}
        rows.append({
            "Document": document.get("doc_id"),
            "Title": _display_value((fields.get("title") or {}).get("resolved_value")),
            "DOI": _display_value((fields.get("doi") or {}).get("resolved_value")),
            "Canonical URL": _display_value((fields.get("canonical_url") or {}).get("resolved_value")),
            "Authors / producers": _display_value((fields.get("authors") or {}).get("resolved_value")),
            "Publication": _display_value((fields.get("publication") or {}).get("resolved_value")),
            "Date": _display_value((fields.get("publication_date") or {}).get("resolved_value")),
            "Identity conflicts": sum(
                (field or {}).get("resolution_state") == "conflicted" for field in fields.values()
            ),
            "Family status": document.get("family_resolution_state") or "unreviewed",
        })
    return rows


def relationship_table_rows(snapshot: dict) -> list[dict]:
    return [{
        "Source": row.get("source_doc_id"),
        "Target": row.get("target_doc_id"),
        "Suggested relationship": str(row.get("relationship") or "").replace("_", " "),
        "Confidence": row.get("confidence"),
        "Evidence bases": ", ".join(str(item.get("field")) for item in row.get("matching_bases") or []),
        "Status": row.get("review_status") or row.get("status"),
        "Changes family counts": "no",
    } for row in snapshot.get("relationship_suggestions") or []]


def _matching_decisions(snapshot: dict, exports_dir: Path) -> tuple[list[dict], list[dict]]:
    records = load_identity_decisions(exports_dir)
    applicable, stale = partition_identity_decisions(snapshot, records)
    return applicable, stale


def _superseded_id(decisions: list[dict], decision_type: str, subject: dict) -> str:
    matches = [
        row for row in decisions
        if row.get("decision_type") == decision_type and row.get("subject") == subject
    ]
    if not matches:
        return ""
    superseded = {row.get("supersedes_decision_id") for row in matches if row.get("supersedes_decision_id")}
    active = [row for row in matches if row.get("decision_id") not in superseded]
    if len(active) != 1:
        raise ValueError("Existing decision history is branched; resolve the ledger before adding a decision")
    return active[0]["decision_id"]


def _save_decision(config, snapshot: dict, decisions: list[dict], **kwargs) -> None:
    subject = kwargs["subject"]
    kwargs["supersedes_decision_id"] = _superseded_id(decisions, kwargs["decision_type"], subject)
    record = create_identity_decision(snapshot, **kwargs)
    path = append_identity_decision(record, Path(config.exports_dir))
    st.session_state["source_identity_decision_saved"] = path.name
    st.rerun()


def _render_decision_controls(config, snapshot: dict, decisions: list[dict]) -> None:
    documents = snapshot.get("documents") or []
    relationships = snapshot.get("relationship_suggestions") or []
    st.subheader("Researcher decisions (Phase 11B)")
    st.caption(
        "Every save creates an immutable, content-addressed decision record. Later changes explicitly "
        "supersede an earlier record; history is never overwritten. Relationship acceptance never merges documents."
    )
    researcher_id = st.text_input(
        "Researcher identifier",
        key="source_identity_researcher_id",
        placeholder="Initials or a stable project identifier",
        help="Recorded in the local audit ledger. Do not enter sensitive personal data.",
    )

    with st.expander("Resolve a conflicted or uncertain field", expanded=False):
        doc_id = st.selectbox("Document", [row["doc_id"] for row in documents], key="source_field_doc")
        document = next(row for row in documents if row["doc_id"] == doc_id)
        fields = document.get("fields") or {}
        field_name = st.selectbox("Field", list(fields), key="source_field_name")
        field = fields[field_name]
        candidates = field.get("candidates") or []
        options = ["Defer this field", "Mark unresolved", "Enter a researcher correction"] + [
            f"Use candidate {index + 1}: {_display_value(row.get('value'))} — {row.get('source_file')}"
            for index, row in enumerate(candidates)
        ]
        selection = st.selectbox("Researcher decision", options, key="source_field_outcome")
        correction = st.text_area(
            "Corrected value",
            key="source_field_correction",
            height=90,
            disabled=selection != "Enter a researcher correction",
            help="For authors, enter one name per line. This value is preserved as a researcher correction, not model output.",
        )
        provenance = st.text_input(
            "Correction provenance",
            key="source_field_provenance",
            disabled=selection != "Enter a researcher correction",
            placeholder="For example: title page, publisher catalogue, or researcher note",
        )
        rationale = st.text_area("Decision note", key="source_field_rationale", height=100)
        confirm = st.checkbox("I reviewed this field evidence", key="source_field_confirm")
        correction_missing = selection == "Enter a researcher correction" and (not correction.strip() or not provenance.strip() or not rationale.strip())
        if st.button("Save field decision", disabled=not confirm or not researcher_id.strip() or correction_missing):
            if selection.startswith("Use candidate"):
                index = options.index(selection) - 3
                outcome = {"state": "selected_candidate", "candidate_fingerprint": candidate_fingerprint(candidates[index])}
            elif selection == "Enter a researcher correction":
                value = [line.strip() for line in correction.splitlines() if line.strip()] if field_name == "authors" else correction.strip()
                outcome = {"state": "manual_correction", "value": value, "provenance": provenance.strip()}
            else:
                outcome = {"state": "unresolved" if selection == "Mark unresolved" else "deferred"}
            try:
                _save_decision(
                    config, snapshot, decisions, decision_type="field_resolution",
                    subject={"doc_id": doc_id, "field_name": field_name}, outcome=outcome,
                    researcher_id=researcher_id, rationale=rationale,
                )
            except Exception as exc:
                st.error(f"Field decision failed closed: {exc}")

    with st.expander("Assign a document family", expanded=False):
        st.warning(
            "This is the only decision that can affect reviewed family counts. Use the same family ID only "
            "after deciding that records belong to one documentary family; files are not merged or deleted."
        )
        doc_id = st.selectbox("Document", [row["doc_id"] for row in documents], key="source_family_doc")
        family_state = st.radio(
            "Family decision", ["Assign family", "Defer", "Leave unresolved"],
            key="source_family_state", horizontal=True,
        )
        existing_families = sorted({
            str(row.get("outcome", {}).get("family_id")) for row in decisions
            if row.get("decision_type") == "family_assignment" and row.get("outcome", {}).get("state") == "assigned"
        })
        reuse_family = st.selectbox(
            "Reuse an existing family ID",
            ["Enter a new family ID"] + existing_families,
            key="source_family_reuse",
            disabled=family_state != "Assign family" or not existing_families,
        )
        family_id = st.text_input(
            "Confirmed family ID", key="source_family_id", placeholder="family-stable-project-label",
            disabled=family_state != "Assign family" or reuse_family != "Enter a new family ID",
        )
        effective_family_id = reuse_family if reuse_family != "Enter a new family ID" else family_id.strip()
        rationale = st.text_area("Decision note", key="source_family_rationale", height=100)
        confirm = st.checkbox("I reviewed this family assignment", key="source_family_confirm")
        disabled = not confirm or not researcher_id.strip() or (family_state == "Assign family" and not effective_family_id)
        if st.button("Save family decision", disabled=disabled):
            outcome = (
                {"state": "assigned", "family_id": effective_family_id}
                if family_state == "Assign family"
                else {"state": "deferred" if family_state == "Defer" else "unassigned"}
            )
            try:
                _save_decision(
                    config, snapshot, decisions, decision_type="family_assignment",
                    subject={"doc_id": doc_id}, outcome=outcome,
                    researcher_id=researcher_id, rationale=rationale,
                )
            except Exception as exc:
                st.error(f"Family decision failed closed: {exc}")

    with st.expander("Review a suggested relationship", expanded=False):
        if not relationships:
            st.info("No relationship suggestions exist in this snapshot.")
        else:
            relation_ids = [row["suggestion_id"] for row in relationships]
            suggestion_id = st.selectbox("Suggestion", relation_ids, key="source_relation_id")
            relation = next(row for row in relationships if row["suggestion_id"] == suggestion_id)
            st.write(
                f"{relation['source_doc_id']} → {relation['target_doc_id']} · "
                f"suggested {str(relation['relationship']).replace('_', ' ')} · confidence {relation['confidence']}"
            )
            status = st.radio("Review decision", ["accepted", "rejected", "deferred"], key="source_relation_status", horizontal=True)
            rationale = st.text_area("Decision note", key="source_relation_rationale", height=100)
            confirm = st.checkbox("I reviewed this relationship evidence", key="source_relation_confirm")
            if st.button("Save relationship decision", disabled=not confirm or not researcher_id.strip()):
                try:
                    _save_decision(
                        config, snapshot, decisions, decision_type="relationship_review",
                        subject={"suggestion_id": suggestion_id}, outcome={"status": status},
                        researcher_id=researcher_id, rationale=rationale,
                    )
                except Exception as exc:
                    st.error(f"Relationship decision failed closed: {exc}")


def render_source_identity_page(config) -> None:
    st.title("Source Identity")
    saved = st.session_state.pop("source_identity_decision_saved", "")
    if saved:
        st.success(f"Saved immutable researcher decision: {saved}")
    st.info(
        "Phase 11 reconciles metadata already present in the corpus. It does not rerun Triage, "
        "open the external PDF library, call a model, merge documents, or claim independent attestations."
    )
    st.caption(
        "Relationship suggestions are review leads only. Until a later append-only researcher decision "
        "accepts a family relationship, they do not change source-family counts."
    )

    if st.button("Build read-only identity preview", type="primary"):
        try:
            st.session_state["source_identity_snapshot"] = build_identity_snapshot(config.corpus_dir)
        except Exception as exc:
            st.error(f"Identity preview failed closed: {exc}")

    snapshot = st.session_state.get("source_identity_snapshot")
    if not isinstance(snapshot, dict):
        st.info("Build a preview to inspect current local identity evidence. Nothing is written by default.")
        return

    try:
        decisions, stale_decisions = _matching_decisions(snapshot, Path(config.exports_dir))
        reviewed = apply_identity_decisions(snapshot, decisions)
        validate_reviewed_identity_projection(reviewed, snapshot, decisions)
    except Exception as exc:
        st.error(f"Researcher decision ledger failed closed: {exc}")
        return
    documents = reviewed.get("documents") or []
    if not documents:
        st.info("No eligible local document sidecars were found for this preview.")
        return

    counts = reviewed.get("count_summary") or {}
    cols = st.columns(5)
    cols[0].metric("Documents", counts.get("document_count", 0))
    cols[1].metric("Byte groups", counts.get("byte_identity_group_count", 0))
    cols[2].metric("Hostname proxy", counts.get("hostname_proxy_count", 0))
    cols[3].metric("Reviewed families", counts.get("researcher_resolved_document_family_count", 0))
    cols[4].metric("Pending relations", counts.get("unresolved_relationship_count", 0))
    st.warning(
        "These are document, byte-group, hostname, actor, publication, and reviewed-family measures—not independent attestations. "
        f"Definitive source-family count: {counts.get('source_family_count') or 'not yet resolved'}."
    )
    st.dataframe(identity_table_rows({"documents": documents}), hide_index=True, width="stretch")
    st.caption(
        f"Active decisions for this exact snapshot: {len(reviewed.get('applied_decision_ids') or [])}. "
        f"Stale or currently out-of-scope decisions: {len(stale_decisions)}. Decisions survive corpus growth when their bound evidence is unchanged."
    )
    if decisions:
        with st.expander(f"Decision history ({len(decisions)} immutable records)", expanded=False):
            st.dataframe([{
                "Decision": row.get("decision_id"), "Type": row.get("decision_type"),
                "Subject": json.dumps(row.get("subject"), ensure_ascii=False),
                "Outcome": json.dumps(row.get("outcome"), ensure_ascii=False),
                "Researcher": row.get("researcher_id"), "Decided": row.get("decided_at"),
                "Supersedes": row.get("supersedes_decision_id") or "—",
            } for row in sorted(decisions, key=lambda item: item.get("decided_at", ""))], hide_index=True, width="stretch")
    if stale_decisions:
        with st.expander(f"Stale or out-of-scope decision history ({len(stale_decisions)})", expanded=False):
            st.warning("These records remain immutable but are not applied to the current evidence snapshot.")
            st.dataframe([{
                "Decision": row.get("decision_id"), "Type": row.get("decision_type"),
                "Subject": json.dumps(row.get("subject"), ensure_ascii=False),
                "Original snapshot": row.get("source_snapshot_fingerprint"),
            } for row in stale_decisions], hide_index=True, width="stretch")

    with st.expander(
        f"Relationship suggestions ({len(reviewed.get('relationships') or [])})",
        expanded=False,
    ):
        relations = relationship_table_rows({"relationship_suggestions": reviewed.get("relationships") or []})
        if relations:
            st.dataframe(relations, hide_index=True, width="stretch")
        else:
            st.info("No deterministic hash/DOI/canonical-URL/title-author-year relationship was suggested.")

    selected = st.selectbox(
        "Inspect field provenance",
        [row["doc_id"] for row in documents if row.get("doc_id")],
        key="source_identity_inspect_doc",
    )
    document = next((row for row in documents if row.get("doc_id") == selected), None)
    if not document:
        st.error("The selected document is no longer present in this preview. Rebuild the preview.")
        return
    for field_name, field in (document.get("fields") or {}).items():
        shown_value = field.get("effective_value") if "researcher_resolution" in field else field.get("resolved_value")
        shown_state = (field.get("researcher_resolution") or {}).get("state") or field.get("resolution_state")
        with st.expander(
            f"{field_name.replace('_', ' ').title()}: {_display_value(shown_value)} "
            f"({shown_state})",
            expanded=field.get("resolution_state") == "conflicted",
        ):
            st.dataframe(field.get("candidates") or [], hide_index=True, width="stretch")

    _render_decision_controls(config, snapshot, decisions)

    projection_confirm = st.checkbox(
        "Save the validated reviewed projection for Review Packs and provisional memory",
        key="source_identity_reviewed_save_confirm",
        help="Writes a content-addressed local projection and latest pointer; it does not publish or merge documents.",
    )
    if st.button("Save reviewed identity projection", disabled=not projection_confirm):
        try:
            path = write_reviewed_identity_projection(
                reviewed, Path(config.exports_dir), snapshot, decisions,
            )
        except Exception as exc:
            st.error(f"Reviewed projection save failed closed: {exc}")
        else:
            st.success(f"Saved validated reviewed projection: {path.name}")

    save_confirm = st.checkbox(
        "Save this content-addressed local projection",
        key="source_identity_save_confirm",
        help="Writes only under exports/review/source_identity; source/canonical files are untouched.",
    )
    if st.button("Save identity snapshot", disabled=not save_confirm):
        try:
            path = write_identity_snapshot(snapshot, Path(config.exports_dir))
        except Exception as exc:
            st.error(f"Snapshot save failed closed: {exc}")
        else:
            st.success(f"Saved immutable local snapshot: {path.name}")
