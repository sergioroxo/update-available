from __future__ import annotations

from datetime import datetime, timezone

from runner.models.reprocessing import FactoryEventV1, FactoryReceiptV1
from runner.pipeline.factory_state import project_factory_receipts


NOW = datetime(2026, 8, 11, 12, 0, tzinfo=timezone.utc)


def _receipt(
    sequence: int,
    *,
    kind: str,
    entity_id: str,
    from_state: str,
    to_state: str,
    station_id: str = "",
    document_id: str = "",
    receipt_id: str | None = None,
    event_id: str | None = None,
    attempt: int = 1,
) -> FactoryReceiptV1:
    return FactoryReceiptV1(
        receipt_id=receipt_id or f"receipt-{sequence:03d}",
        event=FactoryEventV1(
            run_id="run-002", event_id=event_id or f"event-{sequence:03d}",
            sequence=sequence, entity_kind=kind, entity_id=entity_id,
            station_id=station_id, document_id=document_id,
            from_state=from_state, to_state=to_state, attempt=attempt,
            occurred_at=NOW, worker_id="studio-one",
        ),
        received_at=NOW,
    )


def _successful_receipts() -> list[FactoryReceiptV1]:
    return [
        _receipt(1, kind="campaign", entity_id="run-002", from_state="pending", to_state="ready"),
        _receipt(2, kind="campaign", entity_id="run-002", from_state="ready", to_state="running"),
        _receipt(3, kind="station", entity_id="station-analysis", station_id="station-analysis", from_state="pending", to_state="running"),
        _receipt(4, kind="document", entity_id="doc-one", station_id="station-analysis", document_id="doc-one", from_state="pending", to_state="running"),
        _receipt(5, kind="document", entity_id="doc-one", station_id="station-analysis", document_id="doc-one", from_state="running", to_state="succeeded"),
        _receipt(6, kind="station", entity_id="station-analysis", station_id="station-analysis", from_state="running", to_state="succeeded"),
        _receipt(7, kind="campaign", entity_id="run-002", from_state="running", to_state="succeeded"),
    ]


def test_projection_reconstructs_campaign_station_document_and_is_order_deterministic():
    receipts = _successful_receipts()
    first = project_factory_receipts(receipts)
    second = project_factory_receipts(list(reversed(receipts)))
    assert first == second
    assert first.valid is True
    assert first.campaign.state == "succeeded"
    assert first.stations[0].state == "succeeded"
    assert first.documents[0].state == "succeeded"
    assert first.last_sequence == 7


def test_same_document_completes_four_sequential_station_projections():
    receipts = []
    sequence = 1
    for station_id in ("extraction", "analysis", "embedding", "enrichment"):
        receipts.extend([
            _receipt(
                sequence, kind="document", entity_id="doc-stable",
                station_id=station_id, document_id="doc-stable",
                from_state="pending", to_state="running",
            ),
            _receipt(
                sequence + 1, kind="document", entity_id="doc-stable",
                station_id=station_id, document_id="doc-stable",
                from_state="running", to_state="succeeded",
            ),
        ])
        sequence += 2

    projection = project_factory_receipts(receipts)
    reversed_projection = project_factory_receipts(list(reversed(receipts)))

    assert projection == reversed_projection
    assert projection.schema_version == "factory-state-projection-v1.1"
    assert projection.valid is True
    assert len(projection.documents) == 4
    assert {row.entity_id for row in projection.documents} == {"doc-stable"}
    assert {row.station_id for row in projection.documents} == {
        "extraction", "analysis", "embedding", "enrichment",
    }
    assert {row.state for row in projection.documents} == {"succeeded"}


def test_invalid_transition_is_rejected_within_document_station_pair():
    projection = project_factory_receipts([
        _receipt(
            1, kind="document", entity_id="doc-one", station_id="analysis",
            document_id="doc-one", from_state="pending", to_state="succeeded",
        ),
    ])
    assert projection.valid is False
    assert projection.documents == ()
    assert any(issue.code == "invalid_transition" for issue in projection.issues)


def test_duplicate_receipt_delivery_is_fully_idempotent():
    receipts = _successful_receipts()
    base = project_factory_receipts(receipts)
    duplicated = project_factory_receipts([*receipts, receipts[3], receipts[3]])
    assert duplicated == base


def test_sequence_gap_and_conflicting_sequence_are_detected():
    gap = project_factory_receipts([
        _receipt(1, kind="campaign", entity_id="run-002", from_state="pending", to_state="running"),
        _receipt(3, kind="campaign", entity_id="run-002", from_state="running", to_state="succeeded"),
    ])
    assert gap.valid is False
    assert any(issue.code == "sequence_gap" and issue.sequence == 2 for issue in gap.issues)

    conflict = project_factory_receipts([
        _receipt(1, kind="campaign", entity_id="run-002", from_state="pending", to_state="ready"),
        _receipt(
            1, kind="station", entity_id="station-one", station_id="station-one",
            from_state="pending", to_state="running", receipt_id="receipt-other",
            event_id="event-other",
        ),
    ])
    assert conflict.valid is False
    assert any(issue.code == "conflicting_sequence" for issue in conflict.issues)


def test_conflicting_receipt_id_and_invalid_state_transition_are_detected():
    same_id_a = _receipt(
        1, kind="campaign", entity_id="run-002", from_state="pending", to_state="ready",
        receipt_id="receipt-same",
    )
    same_id_b = _receipt(
        2, kind="campaign", entity_id="run-002", from_state="pending", to_state="running",
        receipt_id="receipt-same", event_id="event-other",
    )
    projection = project_factory_receipts([same_id_a, same_id_b])
    assert any(issue.code == "conflicting_receipt_id" for issue in projection.issues)

    invalid = project_factory_receipts([
        _receipt(1, kind="campaign", entity_id="run-002", from_state="pending", to_state="succeeded"),
    ])
    assert invalid.campaign.state == "pending"
    assert any(issue.code == "invalid_transition" for issue in invalid.issues)


def test_conflicting_attempt_under_one_event_id_is_detected():
    first = _receipt(
        1, kind="document", entity_id="doc-one", station_id="analysis",
        document_id="doc-one", from_state="pending", to_state="running",
        receipt_id="receipt-attempt-one", event_id="event-same", attempt=1,
    )
    conflicting = _receipt(
        1, kind="document", entity_id="doc-one", station_id="analysis",
        document_id="doc-one", from_state="pending", to_state="running",
        receipt_id="receipt-attempt-two", event_id="event-same", attempt=2,
    )
    projection = project_factory_receipts([first, conflicting])
    assert projection.valid is False
    assert any(issue.code == "conflicting_event_id" for issue in projection.issues)


def test_state_conflict_does_not_overwrite_projected_state():
    projection = project_factory_receipts([
        _receipt(1, kind="campaign", entity_id="run-002", from_state="pending", to_state="ready"),
        _receipt(2, kind="campaign", entity_id="run-002", from_state="pending", to_state="running"),
    ])
    assert projection.campaign.state == "ready"
    assert any(issue.code == "state_conflict" for issue in projection.issues)
