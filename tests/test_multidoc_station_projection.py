from __future__ import annotations

from datetime import datetime, timezone

import pytest

from runner.models.reprocessing import FactoryEventV1, FactoryReceiptV1
from runner.pipeline.factory_state import project_factory_receipts


NOW = datetime(2026, 8, 14, 12, tzinfo=timezone.utc)
RUN_ID = "synthetic-run-013"
STATIONS = ("source_verify", "canonical_text_prepare", "complete_units_v2")


def _receipt(
    sequence: int,
    *,
    kind: str,
    entity_id: str,
    from_state: str,
    to_state: str,
    station_id: str = "",
    document_id: str = "",
    attempt: int = 0,
    run_id: str = RUN_ID,
) -> FactoryReceiptV1:
    return FactoryReceiptV1(
        receipt_id=f"receipt-{sequence:06d}",
        event=FactoryEventV1(
            run_id=run_id,
            event_id=f"event-{sequence:06d}",
            sequence=sequence,
            entity_kind=kind,
            entity_id=entity_id,
            station_id=station_id,
            document_id=document_id,
            from_state=from_state,
            to_state=to_state,
            attempt=attempt,
            occurred_at=NOW,
            worker_id="synthetic-run-013-worker",
        ),
        received_at=NOW,
    )


def _multidoc_stream(
    *,
    document_count: int,
    legacy_station_hints: bool,
    held_documents: frozenset[str] = frozenset(),
) -> list[FactoryReceiptV1]:
    documents = tuple(f"pilot-doc-{index:02d}" for index in range(1, document_count + 1))
    receipts = []
    sequence = 1
    receipts.append(_receipt(
        sequence, kind="campaign", entity_id=RUN_ID,
        from_state="pending", to_state="running",
    ))
    sequence += 1
    for document_index, document_id in enumerate(documents):
        for station_id in STATIONS:
            if document_index == 0:
                receipts.append(_receipt(
                    sequence, kind="station", entity_id=station_id,
                    station_id=station_id,
                    from_state="pending", to_state="running",
                ))
                sequence += 1
            receipts.append(_receipt(
                sequence, kind="document", entity_id=document_id,
                document_id=document_id, station_id=station_id,
                from_state="pending", to_state="running", attempt=1,
            ))
            sequence += 1
            terminal = "held" if document_id in held_documents else "succeeded"
            receipts.append(_receipt(
                sequence, kind="document", entity_id=document_id,
                document_id=document_id, station_id=station_id,
                from_state="running", to_state=terminal, attempt=1,
            ))
            sequence += 1
            if legacy_station_hints:
                receipts.append(_receipt(
                    sequence, kind="station", entity_id=station_id,
                    station_id=station_id,
                    from_state="running", to_state=terminal,
                ))
                sequence += 1
            elif document_index == document_count - 1:
                aggregate = "held" if held_documents else "succeeded"
                receipts.append(_receipt(
                    sequence, kind="station", entity_id=station_id,
                    station_id=station_id,
                    from_state="running", to_state=aggregate,
                ))
                sequence += 1
    receipts.append(_receipt(
        sequence, kind="campaign", entity_id=RUN_ID,
        from_state="running",
        to_state=("held" if held_documents else "succeeded"),
    ))
    return receipts


def test_run010_single_document_keeps_v11_projection_compatibility():
    receipts = _multidoc_stream(document_count=1, legacy_station_hints=False)
    projection = project_factory_receipts(receipts)
    assert projection.schema_version == "factory-state-projection-v1.1"
    assert projection.valid is True
    assert projection == project_factory_receipts(list(reversed(receipts)))
    assert {row.state for row in projection.stations} == {"succeeded"}
    with pytest.raises(ValueError, match="requires authenticated distinct documents"):
        project_factory_receipts(
            receipts, projection_policy="multidoc_aggregate_v1_2",
        )


def test_run012_shaped_legacy_113_receipts_reproject_validly_and_deterministically():
    receipts = _multidoc_stream(
        document_count=12, legacy_station_hints=True,
    )
    assert len(receipts) == 113
    projection = project_factory_receipts(receipts)
    reversed_projection = project_factory_receipts(list(reversed(receipts)))
    historical = project_factory_receipts(
        receipts, projection_policy="strict_v1_1",
    )
    assert projection == reversed_projection
    assert projection.schema_version == "factory-state-projection-v1.2"
    assert projection.valid is True
    assert projection.issues == ()
    assert projection.last_sequence == 113
    assert len(projection.documents) == 36
    assert {(row.state, row.attempt) for row in projection.documents} == {
        ("succeeded", 1),
    }
    assert {row.entity_id for row in projection.stations} == set(STATIONS)
    assert {row.state for row in projection.stations} == {"succeeded"}
    assert historical.schema_version == "factory-state-projection-v1.1"
    assert historical.valid is False
    assert len([
        issue for issue in historical.issues if issue.code == "state_conflict"
    ]) == 33


def test_future_corrected_12_document_stream_is_valid_and_has_fewer_receipts():
    legacy = _multidoc_stream(
        document_count=12, legacy_station_hints=True,
    )
    corrected = _multidoc_stream(
        document_count=12, legacy_station_hints=False,
    )
    projection = project_factory_receipts(corrected)
    assert len(corrected) == 80
    assert len(corrected) < len(legacy)
    assert projection.valid is True
    assert projection.schema_version == "factory-state-projection-v1.2"
    assert len(projection.documents) == 36
    assert {row.state for row in projection.stations} == {"succeeded"}


def test_mixed_success_and_held_documents_derive_held_station_aggregates():
    receipts = _multidoc_stream(
        document_count=6,
        legacy_station_hints=False,
        held_documents=frozenset({"pilot-doc-03"}),
    )
    projection = project_factory_receipts(receipts)
    assert projection.valid is True
    assert projection.campaign.state == "held"
    assert {row.state for row in projection.stations} == {"held"}
    held = [
        row for row in projection.documents if row.entity_id == "pilot-doc-03"
    ]
    succeeded = [
        row for row in projection.documents if row.entity_id != "pilot-doc-03"
    ]
    assert len(held) == 3 and {row.state for row in held} == {"held"}
    assert len(succeeded) == 15 and {row.state for row in succeeded} == {"succeeded"}


def test_partial_legacy_stream_remains_running_and_not_prematurely_succeeded():
    receipts = [
        _receipt(1, kind="campaign", entity_id=RUN_ID, from_state="pending", to_state="running"),
        _receipt(2, kind="station", entity_id="source_verify", station_id="source_verify", from_state="pending", to_state="running"),
        _receipt(3, kind="document", entity_id="doc-a", document_id="doc-a", station_id="source_verify", from_state="pending", to_state="running", attempt=1),
        _receipt(4, kind="document", entity_id="doc-a", document_id="doc-a", station_id="source_verify", from_state="running", to_state="succeeded", attempt=1),
        _receipt(5, kind="station", entity_id="source_verify", station_id="source_verify", from_state="running", to_state="succeeded"),
        _receipt(6, kind="document", entity_id="doc-b", document_id="doc-b", station_id="source_verify", from_state="pending", to_state="running", attempt=1),
    ]
    projection = project_factory_receipts(receipts)
    assert projection.valid is True
    assert projection.schema_version == "factory-state-projection-v1.2"
    assert projection.stations[0].state == "running"


def test_unmatched_excessive_and_early_station_hints_remain_invalid():
    excessive = _multidoc_stream(
        document_count=2, legacy_station_hints=True,
    )
    campaign = excessive.pop()
    excessive.append(_receipt(
        campaign.event.sequence, kind="station",
        entity_id="complete_units_v2", station_id="complete_units_v2",
        from_state="running", to_state="succeeded",
    ))
    excessive.append(_receipt(
        campaign.event.sequence + 1, kind="campaign", entity_id=RUN_ID,
        from_state="running", to_state="succeeded",
    ))
    excessive_projection = project_factory_receipts(excessive)
    assert excessive_projection.valid is False
    assert any(
        issue.code in {"legacy_station_hint_conflict", "station_aggregate_conflict"}
        for issue in excessive_projection.issues
    )

    early = [
        _receipt(1, kind="campaign", entity_id=RUN_ID, from_state="pending", to_state="running"),
        _receipt(2, kind="station", entity_id="source_verify", station_id="source_verify", from_state="pending", to_state="running"),
        _receipt(3, kind="document", entity_id="doc-a", document_id="doc-a", station_id="source_verify", from_state="pending", to_state="running", attempt=1),
        _receipt(4, kind="station", entity_id="source_verify", station_id="source_verify", from_state="running", to_state="succeeded"),
        _receipt(5, kind="document", entity_id="doc-a", document_id="doc-a", station_id="source_verify", from_state="running", to_state="succeeded", attempt=1),
        _receipt(6, kind="document", entity_id="doc-b", document_id="doc-b", station_id="source_verify", from_state="pending", to_state="running", attempt=1),
        _receipt(7, kind="document", entity_id="doc-b", document_id="doc-b", station_id="source_verify", from_state="running", to_state="succeeded", attempt=1),
        _receipt(8, kind="station", entity_id="source_verify", station_id="source_verify", from_state="running", to_state="succeeded"),
        _receipt(9, kind="campaign", entity_id=RUN_ID, from_state="running", to_state="succeeded"),
    ]
    early_projection = project_factory_receipts(early)
    assert early_projection.valid is False
    assert any(
        issue.code == "legacy_station_hint_conflict"
        and issue.sequence == 4
        for issue in early_projection.issues
    )


def test_retry_attempts_remain_scoped_to_document_station():
    receipts = [
        _receipt(1, kind="campaign", entity_id=RUN_ID, from_state="pending", to_state="running"),
        _receipt(2, kind="station", entity_id="source_verify", station_id="source_verify", from_state="pending", to_state="running"),
        _receipt(3, kind="document", entity_id="doc-a", document_id="doc-a", station_id="source_verify", from_state="pending", to_state="running", attempt=1),
        _receipt(4, kind="document", entity_id="doc-a", document_id="doc-a", station_id="source_verify", from_state="running", to_state="failed", attempt=1),
        _receipt(5, kind="document", entity_id="doc-a", document_id="doc-a", station_id="source_verify", from_state="failed", to_state="ready", attempt=1),
        _receipt(6, kind="document", entity_id="doc-a", document_id="doc-a", station_id="source_verify", from_state="ready", to_state="running", attempt=2),
        _receipt(7, kind="document", entity_id="doc-a", document_id="doc-a", station_id="source_verify", from_state="running", to_state="succeeded", attempt=2),
        _receipt(8, kind="document", entity_id="doc-b", document_id="doc-b", station_id="source_verify", from_state="pending", to_state="running", attempt=1),
        _receipt(9, kind="document", entity_id="doc-b", document_id="doc-b", station_id="source_verify", from_state="running", to_state="succeeded", attempt=1),
        _receipt(10, kind="station", entity_id="source_verify", station_id="source_verify", from_state="running", to_state="succeeded"),
        _receipt(11, kind="campaign", entity_id=RUN_ID, from_state="running", to_state="succeeded"),
    ]
    projection = project_factory_receipts(receipts)
    assert projection.valid is True
    attempts = {
        row.entity_id: row.attempt for row in projection.documents
    }
    assert attempts == {"doc-a": 2, "doc-b": 1}


def test_duplicate_conflicting_gap_and_cross_run_evidence_still_rejects():
    receipts = _multidoc_stream(
        document_count=2, legacy_station_hints=False,
    )
    assert project_factory_receipts([*receipts, receipts[4]]) == project_factory_receipts(receipts)
    gap = [receipt for receipt in receipts if receipt.event.sequence != 5]
    assert any(
        issue.code == "sequence_gap"
        for issue in project_factory_receipts(gap).issues
    )
    conflicting = _receipt(
        receipts[4].event.sequence,
        kind="document", entity_id="doc-conflict", document_id="doc-conflict",
        station_id="source_verify", from_state="pending", to_state="running",
        attempt=1,
    )
    conflicting = conflicting.model_copy(update={
        "receipt_id": "receipt-conflicting-sequence",
        "event": conflicting.event.model_copy(update={
            "event_id": "event-conflicting-sequence",
        }),
    })
    assert any(
        issue.code == "conflicting_sequence"
        for issue in project_factory_receipts([*receipts, conflicting]).issues
    )
    cross_run = _receipt(
        len(receipts) + 1,
        kind="campaign", entity_id="other-run",
        from_state="pending", to_state="running", run_id="other-run",
    )
    with pytest.raises(ValueError, match="different runs"):
        project_factory_receipts([*receipts, cross_run])
