from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from runner.models.reprocessing import FactoryCommandV1
from runner.pipeline.factory_controller import (
    DOCUMENT_IDS,
    FIXTURE_BYTES,
    build_campaign_and_packages,
    publish_campaign_release,
)
from runner.pipeline.reprocessing_worker import (
    LeaseRejected,
    ReprocessingWorker,
    SyntheticCrash,
    SyntheticNoModelExecutor,
    WorkerStore,
)
from runner.pipeline.source_depot import publish_source_object
from runner.pipeline.syncthing_exchange import load_factory_receipts


NOW = datetime(2026, 8, 11, tzinfo=timezone.utc)


def _runtime(tmp_path: Path, *, poison=frozenset({"fixture-poison"})):
    to_studio = tmp_path / "exchange" / "to-mac-studio"
    from_studio = tmp_path / "exchange" / "from-mac-studio"
    state_dir = tmp_path / "studio-local"
    fixtures = tmp_path / "fixtures"
    fixtures.mkdir(parents=True)
    publications = []
    for doc_id in DOCUMENT_IDS:
        path = fixtures / f"{doc_id}.txt"
        path.write_bytes(FIXTURE_BYTES[doc_id])
        publications.append(publish_source_object(
            path, to_studio, doc_id=doc_id, safe_extension="txt",
            media_type="text/plain",
        ))
    campaign, packages = build_campaign_and_packages(
        run_id="synthetic-worker-test", publications=tuple(publications),
    )
    release = publish_campaign_release(to_studio, campaign=campaign, packages=packages)
    executor = SyntheticNoModelExecutor(poison_document_ids=poison)
    worker = ReprocessingWorker(
        to_studio=to_studio, from_studio=from_studio,
        state_dir=state_dir, executor=executor,
    )
    return worker, executor, campaign, release, to_studio, from_studio, state_dir


def test_worker_database_is_refused_inside_either_shared_tree(tmp_path):
    left = tmp_path / "left"
    right = tmp_path / "right"
    with pytest.raises(ValueError, match="outside shared transfer"):
        WorkerStore(left / "worker.db", shared_roots=(left, right))
    with pytest.raises(ValueError, match="outside shared transfer"):
        WorkerStore(right / "nested" / "worker.sqlite", shared_roots=(left, right))


def test_lease_heartbeat_requires_current_token_and_expired_commit_is_fenced(tmp_path):
    worker, _, _, _, _, _, _ = _runtime(tmp_path, poison=frozenset())
    worker.ingest()
    worker.run_once()
    row = worker.store.claim(NOW)
    assert row is not None
    worker.store.heartbeat(row, row["lease_token"], NOW + timedelta(seconds=1))
    with pytest.raises(LeaseRejected, match="stale lease"):
        worker.store.heartbeat(row, "wrong-token", NOW + timedelta(seconds=2))
    refreshed = worker.store.job(row["document_id"])
    with worker.store.connection:
        worker.store.connection.execute(
            "UPDATE jobs SET lease_expiry=? WHERE document_id=?",
            ((NOW - timedelta(seconds=1)).isoformat(), row["document_id"]),
        )
    with pytest.raises(LeaseRejected, match="expired"):
        worker.store.record_output(refreshed, row["lease_token"], NOW, "a" * 64)
    assert worker.store.recover_expired(NOW) == 1
    assert worker.store.job(row["document_id"])["state"] == "ready"
    worker.close()


def test_restart_after_output_before_receipt_reconstructs_without_reexecution(tmp_path):
    worker, executor, _, _, to_studio, from_studio, state_dir = _runtime(
        tmp_path, poison=frozenset(),
    )
    worker.run_once()
    with pytest.raises(SyntheticCrash, match="after_output_before_receipt"):
        worker.run_once(crash_after_output_document="fixture-good-a")
    assert executor.invocations == {"fixture-good-a": 1}
    receipts_before = load_factory_receipts(from_studio)
    assert not any(
        row.event.document_id == "fixture-good-a" and row.event.to_state == "succeeded"
        for row in receipts_before
    )
    worker.close()

    restarted_executor = SyntheticNoModelExecutor()
    restarted = ReprocessingWorker(
        to_studio=to_studio, from_studio=from_studio,
        state_dir=state_dir, executor=restarted_executor,
    )
    restarted.run_until_idle()
    assert restarted_executor.invocations == {
        "fixture-good-b": 1, "fixture-poison": 1,
    }
    terminal = [
        row for row in load_factory_receipts(from_studio)
        if row.event.document_id == "fixture-good-a" and row.event.to_state == "succeeded"
    ]
    assert len(terminal) == 1
    restarted.close()


def test_restart_after_receipt_before_finalization_does_not_duplicate_receipt(tmp_path):
    worker, executor, _, _, to_studio, from_studio, state_dir = _runtime(
        tmp_path, poison=frozenset(),
    )
    worker.run_once()
    with pytest.raises(SyntheticCrash, match="after_receipt_before_finalize"):
        worker.run_once(crash_after_receipt_document="fixture-good-a")
    assert executor.invocations == {"fixture-good-a": 1}
    count_before = len(load_factory_receipts(from_studio))
    worker.close()

    restarted_executor = SyntheticNoModelExecutor()
    restarted = ReprocessingWorker(
        to_studio=to_studio, from_studio=from_studio,
        state_dir=state_dir, executor=restarted_executor,
    )
    restarted.run_until_idle()
    terminal = [
        row for row in load_factory_receipts(from_studio)
        if row.event.document_id == "fixture-good-a" and row.event.to_state == "succeeded"
    ]
    assert len(terminal) == 1
    assert len(load_factory_receipts(from_studio)) > count_before
    assert restarted_executor.invocations == {
        "fixture-good-b": 1, "fixture-poison": 1,
    }
    restarted.close()


def test_pause_resume_and_command_expiry_mismatch_order_and_idempotency(tmp_path):
    worker, _, campaign, release, _, _, _ = _runtime(tmp_path, poison=frozenset())
    worker.ingest()
    store = worker.store
    pause = FactoryCommandV1(
        run_id=campaign.run_id, command_id="command-000002-pause", sequence=2,
        action="pause_after_current", issued_at=NOW,
        expires_at=NOW + timedelta(hours=1),
        campaign_sha256=release["campaign_sha256"],
    )
    assert store.apply_command(pause, campaign_sha256=release["campaign_sha256"], now=NOW)
    assert store.control() == (True, True, False)
    assert not store.apply_command(pause, campaign_sha256=release["campaign_sha256"], now=NOW)
    conflicting_pause = pause.model_copy(update={"action": "resume"})
    with pytest.raises(ValueError, match="conflicting payload"):
        store.apply_command(
            conflicting_pause,
            campaign_sha256=release["campaign_sha256"], now=NOW,
        )
    assert store.claim(NOW) is None

    expired = FactoryCommandV1(
        run_id=campaign.run_id, command_id="command-000003-expired", sequence=3,
        action="resume", issued_at=NOW - timedelta(hours=2),
        expires_at=NOW - timedelta(hours=1),
        campaign_sha256=release["campaign_sha256"],
    )
    assert not store.apply_command(expired, campaign_sha256=release["campaign_sha256"], now=NOW)
    mismatch = FactoryCommandV1(
        run_id=campaign.run_id, command_id="command-000003-mismatch", sequence=3,
        action="resume", issued_at=NOW, expires_at=NOW + timedelta(hours=1),
        campaign_sha256="f" * 64,
    )
    assert not store.apply_command(mismatch, campaign_sha256=release["campaign_sha256"], now=NOW)
    resume = FactoryCommandV1(
        run_id=campaign.run_id, command_id="command-000003-resume", sequence=3,
        action="resume", issued_at=NOW, expires_at=NOW + timedelta(hours=1),
        campaign_sha256=release["campaign_sha256"],
    )
    assert store.apply_command(resume, campaign_sha256=release["campaign_sha256"], now=NOW)
    assert store.control() == (True, False, False)
    stale = resume.model_copy(update={"command_id": "command-stale", "sequence": 2})
    assert not store.apply_command(stale, campaign_sha256=release["campaign_sha256"], now=NOW)
    worker.close()


def test_cancel_unstarted_preserves_completed_evidence(tmp_path):
    worker, _, campaign, release, _, from_studio, _ = _runtime(tmp_path, poison=frozenset())
    worker.run_once()
    worker.run_once()
    assert worker.store.job("fixture-good-a")["state"] == "succeeded"
    cancel = FactoryCommandV1(
        run_id=campaign.run_id, command_id="command-000002-cancel", sequence=2,
        action="cancel_unstarted", issued_at=NOW, expires_at=NOW + timedelta(hours=1),
        campaign_sha256=release["campaign_sha256"],
    )
    assert worker.store.apply_command(
        cancel, campaign_sha256=release["campaign_sha256"], now=NOW,
    )
    worker.run_until_idle()
    states = {row["document_id"]: row["state"] for row in worker.store.jobs()}
    assert states == {
        "fixture-good-a": "succeeded",
        "fixture-good-b": "cancelled",
        "fixture-poison": "cancelled",
    }
    assert (
        from_studio / "campaigns" / campaign.run_id / "results" /
        "fixture-good-a" / "result.json"
    ).is_file()
    worker.close()


def test_local_database_is_reconstructable_from_campaign_and_receipts(tmp_path):
    worker, _, _, _, to_studio, from_studio, state_dir = _runtime(tmp_path)
    worker.run_until_idle()
    expected_projection = worker.projection().projection_sha256
    expected_jobs = {
        row["document_id"]: (row["state"], row["attempt"])
        for row in worker.store.jobs()
    }
    worker.close()
    (state_dir / "worker.db").unlink()

    executor = SyntheticNoModelExecutor(poison_document_ids=frozenset({"fixture-poison"}))
    reconstructed = ReprocessingWorker(
        to_studio=to_studio, from_studio=from_studio,
        state_dir=state_dir, executor=executor,
    )
    reconstructed.run_until_idle()
    assert executor.invocations == {}
    assert reconstructed.projection().projection_sha256 == expected_projection
    assert {
        row["document_id"]: (row["state"], row["attempt"])
        for row in reconstructed.store.jobs()
    } == expected_jobs
    reconstructed.close()


def test_database_loss_after_output_before_receipt_recovers_from_shared_result(tmp_path):
    worker, executor, _, _, to_studio, from_studio, state_dir = _runtime(
        tmp_path, poison=frozenset(),
    )
    worker.run_once()
    with pytest.raises(SyntheticCrash, match="after_output_before_receipt"):
        worker.run_once(crash_after_output_document="fixture-good-a")
    assert executor.invocations == {"fixture-good-a": 1}
    worker.close()
    (state_dir / "worker.db").unlink()

    reconstructed_executor = SyntheticNoModelExecutor()
    reconstructed = ReprocessingWorker(
        to_studio=to_studio, from_studio=from_studio,
        state_dir=state_dir, executor=reconstructed_executor,
    )
    reconstructed.run_until_idle()
    assert reconstructed_executor.invocations == {
        "fixture-good-b": 1, "fixture-poison": 1,
    }
    terminal = [
        row for row in load_factory_receipts(from_studio)
        if row.event.document_id == "fixture-good-a" and row.event.to_state == "succeeded"
    ]
    assert len(terminal) == 1
    reconstructed.close()
