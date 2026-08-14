"""Deterministic MacBook projection from append-only factory receipts."""
from __future__ import annotations

import json
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from runner.models.reprocessing import FactoryReceiptV1, FactoryState, require_sha256
from .factory_messages import sha256_bytes


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)


class ProjectionIssue(_StrictModel):
    code: Literal[
        "sequence_gap", "conflicting_sequence", "conflicting_receipt_id",
        "conflicting_event_id", "state_conflict", "invalid_transition",
        "document_station_conflict", "station_aggregate_conflict",
        "legacy_station_hint_conflict",
    ]
    sequence: int = Field(ge=0)
    entity_key: str = ""
    detail: str


class EntityProjection(_StrictModel):
    entity_kind: Literal["campaign", "station", "document"]
    entity_id: str
    station_id: str = ""
    state: FactoryState
    attempt: int = Field(ge=0)
    last_sequence: int = Field(ge=0)


class FactoryProjection(_StrictModel):
    schema_version: Literal[
        "factory-state-projection-v1.1", "factory-state-projection-v1.2",
    ] = (
        "factory-state-projection-v1.1"
    )
    run_id: str
    campaign: EntityProjection
    stations: tuple[EntityProjection, ...]
    documents: tuple[EntityProjection, ...]
    issues: tuple[ProjectionIssue, ...]
    last_sequence: int = Field(ge=0)
    valid: bool
    projection_sha256: str


_ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"ready", "running", "held", "held_storage", "cancelled"},
    "ready": {"running", "held", "held_storage", "cancelled"},
    "running": {"paused", "succeeded", "failed", "held", "held_storage", "cancelled"},
    "paused": {"running", "cancelled"},
    "held": {"ready", "cancelled"},
    "held_storage": {"ready", "cancelled"},
    "failed": {"ready", "cancelled"},
    "succeeded": set(),
    "cancelled": set(),
}

_DOCUMENT_TERMINAL_STATES = {"succeeded", "held", "held_storage", "cancelled"}
_STATION_TERMINAL_STATES = {"succeeded", "held", "held_storage", "cancelled"}
ProjectionPolicy = Literal[
    "auto", "strict_v1_1", "multidoc_aggregate_v1_2",
]


def _receipt_identity(receipt: FactoryReceiptV1) -> bytes:
    return json.dumps(
        receipt.model_dump(mode="json"), sort_keys=True, separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")


def _entity_key(receipt: FactoryReceiptV1) -> str:
    event = receipt.event
    if event.entity_kind == "document":
        document_id, station_id = event.document_station_key
        return f"document:{document_id}:{station_id}"
    return f"{event.entity_kind}:{event.entity_id}"


def _apply_strict_event(
    *,
    states: dict[str, EntityProjection],
    receipt: FactoryReceiptV1,
    issues: list[ProjectionIssue],
) -> bool:
    event = receipt.event
    key = _entity_key(receipt)
    current = states.get(key)
    if current is None:
        current = EntityProjection(
            entity_kind=event.entity_kind, entity_id=event.entity_id,
            station_id=event.station_id, state="pending", attempt=0,
            last_sequence=0,
        )
    if current.state != event.from_state:
        issues.append(ProjectionIssue(
            code="state_conflict", sequence=event.sequence, entity_key=key,
            detail=f"expected from_state {current.state}, got {event.from_state}",
        ))
        return False
    if event.to_state not in _ALLOWED_TRANSITIONS[event.from_state]:
        issues.append(ProjectionIssue(
            code="invalid_transition", sequence=event.sequence, entity_key=key,
            detail=f"{event.from_state} -> {event.to_state} is not allowed",
        ))
        return False
    states[key] = EntityProjection(
        entity_kind=event.entity_kind,
        entity_id=event.entity_id,
        station_id=event.station_id,
        state=event.to_state,
        attempt=event.attempt,
        last_sequence=event.sequence,
    )
    return True


def _station_terminal_for_documents(states: tuple[str, ...]) -> str:
    if any(state in {"held", "held_storage"} for state in states):
        return "held"
    if any(state == "cancelled" for state in states):
        return "cancelled"
    return "succeeded"


def _build_projection(
    *,
    schema_version: Literal[
        "factory-state-projection-v1.1", "factory-state-projection-v1.2",
    ],
    run_id: str,
    campaign: EntityProjection,
    stations: tuple[EntityProjection, ...],
    documents: tuple[EntityProjection, ...],
    issues: list[ProjectionIssue],
    last_sequence: int,
) -> FactoryProjection:
    ordered_issues = tuple(sorted(
        issues, key=lambda row: (row.sequence, row.code, row.entity_key, row.detail),
    ))
    stable = {
        "schema_version": schema_version,
        "run_id": run_id,
        "campaign": campaign.model_dump(mode="json"),
        "stations": [row.model_dump(mode="json") for row in stations],
        "documents": [row.model_dump(mode="json") for row in documents],
        "issues": [row.model_dump(mode="json") for row in ordered_issues],
        "last_sequence": last_sequence,
        "valid": not ordered_issues,
    }
    digest = sha256_bytes(json.dumps(
        stable, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
    ).encode("utf-8"))
    require_sha256(digest, field="projection_sha256")
    return FactoryProjection(
        schema_version=schema_version,
        run_id=run_id,
        campaign=campaign,
        stations=stations,
        documents=documents,
        issues=ordered_issues,
        last_sequence=last_sequence,
        valid=not ordered_issues,
        projection_sha256=digest,
    )


def _project_multidoc_aggregate_v1_2(
    *,
    ordered: tuple[FactoryReceiptV1, ...],
    run_id: str,
    issues: list[ProjectionIssue],
    last_sequence: int,
    document_ids: tuple[str, ...],
) -> FactoryProjection:
    states: dict[str, EntityProjection] = {
        f"campaign:{run_id}": EntityProjection(
            entity_kind="campaign", entity_id=run_id,
            state="pending", attempt=0, last_sequence=0,
        )
    }
    accepted_document_events = []
    for receipt in ordered:
        if receipt.event.entity_kind == "station":
            continue
        if _apply_strict_event(states=states, receipt=receipt, issues=issues):
            if receipt.event.entity_kind == "document":
                accepted_document_events.append(receipt.event)

    documents = tuple(sorted(
        (row for row in states.values() if row.entity_kind == "document"),
        key=lambda row: (row.entity_id, row.station_id),
    ))
    document_states = {
        (row.entity_id, row.station_id): row for row in documents
    }
    station_events: dict[str, list] = {}
    for receipt in ordered:
        event = receipt.event
        if event.entity_kind == "station":
            station_events.setdefault(event.station_id, []).append(event)
    station_ids = tuple(sorted({
        *(event.station_id for event in accepted_document_events),
        *station_events,
    }))
    station_rows = []
    for station_id in station_ids:
        events = station_events.get(station_id, [])
        running_events = []
        terminal_hints = []
        for event in events:
            key = f"station:{station_id}"
            if event.entity_id != station_id:
                issues.append(ProjectionIssue(
                    code="station_aggregate_conflict", sequence=event.sequence,
                    entity_key=key, detail="station entity and station_id disagree",
                ))
                continue
            if event.from_state == "pending" and event.to_state == "running":
                running_events.append(event)
            elif (
                event.from_state == "running"
                and event.to_state in _STATION_TERMINAL_STATES
            ):
                terminal_hints.append(event)
            else:
                code = (
                    "invalid_transition"
                    if event.to_state not in _ALLOWED_TRANSITIONS[event.from_state]
                    else "station_aggregate_conflict"
                )
                issues.append(ProjectionIssue(
                    code=code, sequence=event.sequence, entity_key=key,
                    detail=(
                        f"unsupported aggregate station hint "
                        f"{event.from_state} -> {event.to_state}"
                    ),
                ))
        if len(running_events) != 1:
            issues.append(ProjectionIssue(
                code="station_aggregate_conflict",
                sequence=(running_events[-1].sequence if running_events else 0),
                entity_key=f"station:{station_id}",
                detail="multi-document station requires exactly one running event",
            ))
        for event in running_events:
            if event.attempt != 0:
                issues.append(ProjectionIssue(
                    code="station_aggregate_conflict", sequence=event.sequence,
                    entity_key=f"station:{station_id}",
                    detail="aggregate station running attempt must be zero",
                ))
        first_document_sequence = min(
            (
                event.sequence for event in accepted_document_events
                if event.station_id == station_id
            ),
            default=0,
        )
        if (
            running_events and first_document_sequence
            and running_events[0].sequence >= first_document_sequence
        ):
            issues.append(ProjectionIssue(
                code="station_aggregate_conflict",
                sequence=running_events[0].sequence,
                entity_key=f"station:{station_id}",
                detail="aggregate station running event is not before document work",
            ))

        terminal_documents = {
            event.sequence: event
            for event in accepted_document_events
            if (
                event.station_id == station_id
                and event.to_state in _DOCUMENT_TERMINAL_STATES
            )
        }
        matched_sequences: set[int] = set()
        matched_hints: list[tuple] = []
        for hint in terminal_hints:
            key = f"station:{station_id}"
            preceding = terminal_documents.get(hint.sequence - 1)
            if preceding is None or preceding.sequence in matched_sequences:
                issues.append(ProjectionIssue(
                    code="legacy_station_hint_conflict", sequence=hint.sequence,
                    entity_key=key,
                    detail="station terminal hint has no unique preceding document terminal",
                ))
                continue
            if hint.attempt != 0:
                issues.append(ProjectionIssue(
                    code="legacy_station_hint_conflict", sequence=hint.sequence,
                    entity_key=key,
                    detail="aggregate station terminal attempt must be zero",
                ))
                continue
            matched_sequences.add(preceding.sequence)
            matched_hints.append((hint, preceding))

        projected = tuple(
            document_states.get((document_id, station_id))
            for document_id in document_ids
        )
        all_terminal = all(
            row is not None and row.state in _DOCUMENT_TERMINAL_STATES
            for row in projected
        )
        if all_terminal:
            terminal_states = tuple(row.state for row in projected if row is not None)
            aggregate_state = _station_terminal_for_documents(terminal_states)
            if len(terminal_hints) == 1:
                last_document = max(
                    terminal_documents.values(), key=lambda event: event.sequence,
                )
                if (
                    not matched_hints
                    or matched_hints[0][1].sequence != last_document.sequence
                    or terminal_hints[0].to_state != aggregate_state
                ):
                    issues.append(ProjectionIssue(
                        code="station_aggregate_conflict",
                        sequence=terminal_hints[0].sequence,
                        entity_key=f"station:{station_id}",
                        detail="corrected aggregate terminal does not follow final document state",
                    ))
            elif len(terminal_hints) == len(document_ids):
                legacy_states_match = all(
                    hint.to_state == (
                        "held"
                        if preceding.to_state in {"held", "held_storage"}
                        else preceding.to_state
                    )
                    for hint, preceding in matched_hints
                )
                if (
                    len(matched_hints) != len(document_ids)
                    or not legacy_states_match
                ):
                    issues.append(ProjectionIssue(
                        code="legacy_station_hint_conflict",
                        sequence=(terminal_hints[-1].sequence if terminal_hints else 0),
                        entity_key=f"station:{station_id}",
                        detail="legacy station terminal hints do not map one-to-one to documents",
                    ))
            else:
                issues.append(ProjectionIssue(
                    code="station_aggregate_conflict",
                    sequence=(terminal_hints[-1].sequence if terminal_hints else 0),
                    entity_key=f"station:{station_id}",
                    detail="terminal station hint count is neither corrected nor legacy complete",
                ))
        else:
            for hint, preceding in matched_hints:
                expected_hint = (
                    "held"
                    if preceding.to_state in {"held", "held_storage"}
                    else preceding.to_state
                )
                if hint.to_state != expected_hint:
                    issues.append(ProjectionIssue(
                        code="legacy_station_hint_conflict",
                        sequence=hint.sequence,
                        entity_key=f"station:{station_id}",
                        detail="partial legacy station hint contradicts document terminal",
                    ))
            aggregate_state = (
                "running"
                if running_events or any(row is not None for row in projected)
                else "pending"
            )
        last_station_sequence = max(
            (event.sequence for event in events),
            default=max(
                (
                    event.sequence for event in accepted_document_events
                    if event.station_id == station_id
                ),
                default=0,
            ),
        )
        station_rows.append(EntityProjection(
            entity_kind="station", entity_id=station_id,
            station_id=station_id, state=aggregate_state,
            attempt=0, last_sequence=last_station_sequence,
        ))

    return _build_projection(
        schema_version="factory-state-projection-v1.2",
        run_id=run_id,
        campaign=states[f"campaign:{run_id}"],
        stations=tuple(station_rows),
        documents=documents,
        issues=issues,
        last_sequence=last_sequence,
    )


def project_factory_receipts(
    receipts: list[FactoryReceiptV1] | tuple[FactoryReceiptV1, ...],
    *,
    run_id: str | None = None,
    projection_policy: ProjectionPolicy = "auto",
) -> FactoryProjection:
    if not receipts and not run_id:
        raise ValueError("run_id is required when no receipts are supplied")
    resolved_run = run_id or receipts[0].event.run_id
    if any(receipt.event.run_id != resolved_run for receipt in receipts):
        raise ValueError("receipts from different runs cannot share a projection")

    issues: list[ProjectionIssue] = []
    by_receipt: dict[str, FactoryReceiptV1] = {}
    by_event: dict[str, FactoryReceiptV1] = {}
    for receipt in receipts:
        existing = by_receipt.get(receipt.receipt_id)
        if existing is not None:
            if _receipt_identity(existing) == _receipt_identity(receipt):
                pass
            else:
                issues.append(ProjectionIssue(
                    code="conflicting_receipt_id", sequence=receipt.event.sequence,
                    detail=f"receipt_id {receipt.receipt_id} has conflicting payloads",
                ))
            continue
        existing_event = by_event.get(receipt.event.event_id)
        if existing_event is not None:
            if existing_event.event == receipt.event:
                pass
            else:
                issues.append(ProjectionIssue(
                    code="conflicting_event_id", sequence=receipt.event.sequence,
                    detail=f"event_id {receipt.event.event_id} has conflicting payloads",
                ))
            continue
        by_receipt[receipt.receipt_id] = receipt
        by_event[receipt.event.event_id] = receipt

    by_sequence: dict[int, list[FactoryReceiptV1]] = {}
    for receipt in by_receipt.values():
        by_sequence.setdefault(receipt.event.sequence, []).append(receipt)
    ordered: list[FactoryReceiptV1] = []
    for sequence in sorted(by_sequence):
        rows = sorted(by_sequence[sequence], key=lambda item: item.receipt_id)
        if len(rows) > 1:
            issues.append(ProjectionIssue(
                code="conflicting_sequence", sequence=sequence,
                detail="more than one distinct receipt claims this sequence",
            ))
        ordered.append(rows[0])

    sequences = sorted(by_sequence)
    if sequences:
        expected = set(range(1, sequences[-1] + 1))
        for missing in sorted(expected - set(sequences)):
            issues.append(ProjectionIssue(
                code="sequence_gap", sequence=missing,
                detail="receipt sequence is missing",
            ))

    document_ids = tuple(sorted({
        receipt.event.document_id
        for receipt in ordered
        if receipt.event.entity_kind == "document"
    }))
    use_multidoc = projection_policy == "multidoc_aggregate_v1_2" or (
        projection_policy == "auto" and len(document_ids) > 1
    )
    if projection_policy == "multidoc_aggregate_v1_2" and len(document_ids) < 2:
        raise ValueError(
            "multi-document projection policy requires authenticated distinct documents"
        )
    if use_multidoc:
        return _project_multidoc_aggregate_v1_2(
            ordered=tuple(ordered), run_id=resolved_run, issues=issues,
            last_sequence=max(sequences, default=0),
            document_ids=document_ids,
        )

    states: dict[str, EntityProjection] = {
        f"campaign:{resolved_run}": EntityProjection(
            entity_kind="campaign", entity_id=resolved_run,
            state="pending", attempt=0, last_sequence=0,
        )
    }
    for receipt in ordered:
        _apply_strict_event(states=states, receipt=receipt, issues=issues)

    campaign = states[f"campaign:{resolved_run}"]
    stations = tuple(sorted(
        (row for row in states.values() if row.entity_kind == "station"),
        key=lambda row: row.entity_id,
    ))
    documents = tuple(sorted(
        (row for row in states.values() if row.entity_kind == "document"),
        key=lambda row: (row.entity_id, row.station_id),
    ))
    last_sequence = max(sequences, default=0)
    return _build_projection(
        schema_version="factory-state-projection-v1.1",
        run_id=resolved_run,
        campaign=campaign,
        stations=stations,
        documents=documents,
        issues=issues,
        last_sequence=last_sequence,
    )
