from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from runner.models.reprocessing import FactoryEventV1, FactoryReceiptV1
from runner.pipeline.factory_auth import (
    generate_keypair,
    public_key_allowlist,
    sign_factory_message,
)
from runner.pipeline.factory_state import project_factory_receipts
from runner.pipeline.syncthing_exchange import (
    observe_authenticated_receipts,
    publish_exchange_json,
)


NOW = datetime(2026, 8, 24, 14, tzinfo=timezone.utc)
RUN_ID = "semantic-ui-canary-023"
DOCUMENT_ID = "c07f879e"
STATION_ID = "independent_analysis"


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
    receipt_id: str | None = None,
    event_id: str | None = None,
) -> FactoryReceiptV1:
    return FactoryReceiptV1(
        receipt_id=receipt_id or f"production-receipt-{sequence:06d}",
        event=FactoryEventV1(
            run_id=RUN_ID,
            event_id=event_id or f"production-event-{sequence:06d}",
            sequence=sequence,
            entity_kind=kind,
            entity_id=entity_id,
            station_id=station_id,
            document_id=document_id,
            from_state=from_state,
            to_state=to_state,
            attempt=attempt,
            occurred_at=NOW + timedelta(seconds=sequence),
            worker_id="mac-studio-production-service-v1",
        ),
        received_at=NOW + timedelta(seconds=sequence),
    )


def _historical_stream(
    *,
    resumed_attempt: int = 2,
    resumed_document: str = DOCUMENT_ID,
    resumed_station: str = STATION_ID,
) -> list[FactoryReceiptV1]:
    return [
        _receipt(
            1, kind="campaign", entity_id=RUN_ID,
            from_state="pending", to_state="running",
        ),
        _receipt(
            2, kind="station", entity_id=STATION_ID, station_id=STATION_ID,
            from_state="pending", to_state="running",
        ),
        _receipt(
            3, kind="document", entity_id=DOCUMENT_ID,
            document_id=DOCUMENT_ID, station_id=STATION_ID,
            from_state="pending", to_state="running", attempt=1,
        ),
        _receipt(
            4, kind="document", entity_id=resumed_document,
            document_id=resumed_document, station_id=resumed_station,
            from_state="ready", to_state="running", attempt=resumed_attempt,
        ),
        _receipt(
            5, kind="document", entity_id=resumed_document,
            document_id=resumed_document, station_id=resumed_station,
            from_state="running", to_state="succeeded", attempt=resumed_attempt,
        ),
        _receipt(
            6, kind="station", entity_id=STATION_ID, station_id=STATION_ID,
            from_state="running", to_state="succeeded",
        ),
        _receipt(
            7, kind="campaign", entity_id=RUN_ID,
            from_state="running", to_state="succeeded",
        ),
    ]


def _publish_authenticated(tmp_path, receipts):
    private = tmp_path / "keys" / "receipt-private.pem"
    public = tmp_path / "keys" / "receipt-public.pem"
    generate_keypair(private, public)
    exchange = tmp_path / "from-studio"
    for receipt in receipts:
        message = sign_factory_message(
            receipt,
            purpose="receipt",
            run_id=RUN_ID,
            message_id=receipt.receipt_id,
            private_key_path=private,
            issued_at=receipt.received_at,
            shared_roots=(exchange,),
        )
        publish_exchange_json(
            exchange,
            f"campaigns/{RUN_ID}/authenticated-receipts/"
            f"{receipt.event.sequence:06d}-{receipt.receipt_id}.auth.json",
            message,
        )
    return exchange, public


def test_run023_historical_pattern_requires_explicit_recovery_policy(tmp_path):
    receipts = _historical_stream()
    exchange, public = _publish_authenticated(tmp_path, receipts)
    strict = observe_authenticated_receipts(
        exchange,
        run_id=RUN_ID,
        allowed_public_keys=public_key_allowlist((public,)),
        now=NOW + timedelta(hours=1),
        projection_policy="strict_v1_1",
    )
    recovered = observe_authenticated_receipts(
        exchange,
        run_id=RUN_ID,
        allowed_public_keys=public_key_allowlist((public,)),
        now=NOW + timedelta(hours=1),
        projection_policy="recovery_aware_v1_3",
    )
    assert strict.valid is False
    assert [issue.code for issue in strict.issues] == ["state_conflict"]
    assert "recovery_inferences" not in strict.model_dump(mode="json")
    assert recovered.valid is True
    assert recovered.schema_version == "factory-state-projection-v1.3"
    assert "recovery_inferences" in recovered.model_dump(mode="json")
    assert recovered.campaign.state == "succeeded"
    assert {row.state for row in recovered.stations} == {"succeeded"}
    assert len(recovered.recovery_inferences) == 1
    inference = recovered.recovery_inferences[0]
    assert inference.entity_key == f"document:{DOCUMENT_ID}:{STATION_ID}"
    assert (inference.prior_attempt, inference.resumed_attempt) == (1, 2)


@pytest.mark.parametrize(
    ("receipts", "case"),
    [
        (_historical_stream(resumed_attempt=1), "same-attempt"),
        (_historical_stream(resumed_attempt=3), "attempt-jump"),
        (_historical_stream(resumed_document="other-doc"), "cross-document"),
        (_historical_stream(resumed_station="other-station"), "cross-station"),
    ],
)
def test_recovery_policy_rejects_adversarial_variants(receipts, case):
    projection = project_factory_receipts(
        receipts, run_id=RUN_ID, projection_policy="recovery_aware_v1_3",
    )
    assert projection.valid is False, case
    assert projection.recovery_inferences == (), case


def test_recovery_policy_rejects_recovery_after_terminal_state():
    receipts = _historical_stream()[:3]
    receipts.extend([
        _receipt(
            4, kind="document", entity_id=DOCUMENT_ID,
            document_id=DOCUMENT_ID, station_id=STATION_ID,
            from_state="running", to_state="succeeded", attempt=1,
        ),
        _receipt(
            5, kind="document", entity_id=DOCUMENT_ID,
            document_id=DOCUMENT_ID, station_id=STATION_ID,
            from_state="ready", to_state="running", attempt=2,
        ),
    ])
    projection = project_factory_receipts(
        receipts, run_id=RUN_ID, projection_policy="recovery_aware_v1_3",
    )
    assert projection.valid is False
    assert projection.documents[0].state == "succeeded"
    assert projection.recovery_inferences == ()


def test_conflicting_receipt_identity_remains_invalid_under_recovery_policy():
    receipts = _historical_stream()
    receipts.append(_receipt(
        8, kind="campaign", entity_id=RUN_ID,
        from_state="succeeded", to_state="running",
        receipt_id=receipts[3].receipt_id,
    ))
    projection = project_factory_receipts(
        receipts, run_id=RUN_ID, projection_policy="recovery_aware_v1_3",
    )
    assert projection.valid is False
    assert any(issue.code == "conflicting_receipt_id" for issue in projection.issues)


def test_future_explicit_recovery_chain_is_strictly_valid():
    receipts = _historical_stream()[:3]
    receipts.extend([
        _receipt(
            4, kind="document", entity_id=DOCUMENT_ID,
            document_id=DOCUMENT_ID, station_id=STATION_ID,
            from_state="running", to_state="failed", attempt=1,
        ),
        _receipt(
            5, kind="document", entity_id=DOCUMENT_ID,
            document_id=DOCUMENT_ID, station_id=STATION_ID,
            from_state="failed", to_state="ready", attempt=1,
        ),
        _receipt(
            6, kind="document", entity_id=DOCUMENT_ID,
            document_id=DOCUMENT_ID, station_id=STATION_ID,
            from_state="ready", to_state="running", attempt=2,
        ),
        _receipt(
            7, kind="document", entity_id=DOCUMENT_ID,
            document_id=DOCUMENT_ID, station_id=STATION_ID,
            from_state="running", to_state="succeeded", attempt=2,
        ),
        _receipt(
            8, kind="station", entity_id=STATION_ID, station_id=STATION_ID,
            from_state="running", to_state="succeeded",
        ),
        _receipt(
            9, kind="campaign", entity_id=RUN_ID,
            from_state="running", to_state="succeeded",
        ),
    ])
    projection = project_factory_receipts(
        receipts, run_id=RUN_ID, projection_policy="strict_v1_1",
    )
    assert projection.valid is True
    assert projection.recovery_inferences == ()


def test_recovery_projection_is_deterministic_for_any_input_order():
    receipts = _historical_stream()
    forward = project_factory_receipts(
        receipts, run_id=RUN_ID, projection_policy="recovery_aware_v1_3",
    )
    reverse = project_factory_receipts(
        list(reversed(receipts)), run_id=RUN_ID,
        projection_policy="recovery_aware_v1_3",
    )
    assert forward == reverse
    assert forward.valid is True
    assert len(forward.recovery_inferences) == 1
