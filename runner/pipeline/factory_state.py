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
        "document_station_conflict",
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
    schema_version: Literal["factory-state-projection-v1.1"] = (
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


def project_factory_receipts(
    receipts: list[FactoryReceiptV1] | tuple[FactoryReceiptV1, ...],
    *,
    run_id: str | None = None,
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

    states: dict[str, EntityProjection] = {
        f"campaign:{resolved_run}": EntityProjection(
            entity_kind="campaign", entity_id=resolved_run,
            state="pending", attempt=0, last_sequence=0,
        )
    }
    for receipt in ordered:
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
            continue
        if event.to_state not in _ALLOWED_TRANSITIONS[event.from_state]:
            issues.append(ProjectionIssue(
                code="invalid_transition", sequence=event.sequence, entity_key=key,
                detail=f"{event.from_state} -> {event.to_state} is not allowed",
            ))
            continue
        states[key] = EntityProjection(
            entity_kind=event.entity_kind,
            entity_id=event.entity_id,
            station_id=event.station_id,
            state=event.to_state,
            attempt=event.attempt,
            last_sequence=event.sequence,
        )

    campaign = states[f"campaign:{resolved_run}"]
    stations = tuple(sorted(
        (row for row in states.values() if row.entity_kind == "station"),
        key=lambda row: row.entity_id,
    ))
    documents = tuple(sorted(
        (row for row in states.values() if row.entity_kind == "document"),
        key=lambda row: (row.entity_id, row.station_id),
    ))
    ordered_issues = tuple(sorted(
        issues, key=lambda row: (row.sequence, row.code, row.entity_key, row.detail),
    ))
    last_sequence = max(sequences, default=0)
    stable = {
        "schema_version": "factory-state-projection-v1.1",
        "run_id": resolved_run,
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
        schema_version="factory-state-projection-v1.1",
        run_id=resolved_run,
        campaign=campaign,
        stations=stations,
        documents=documents,
        issues=ordered_issues,
        last_sequence=last_sequence,
        valid=not ordered_issues,
        projection_sha256=digest,
    )
