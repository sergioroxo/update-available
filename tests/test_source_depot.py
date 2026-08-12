from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path

import pytest
from pydantic import ValidationError

from runner.models.reprocessing import (
    CampaignSourceReferenceV1,
    HostStorageAssessmentV1,
    StorageComponentsV1,
    StudioInventoryV1,
    TwoHostStoragePreflightV1,
)
from runner.pipeline.source_depot import (
    SourcePlanRequest,
    estimate_two_host_storage,
    plan_source_depot,
)


NOW = datetime(2026, 8, 11, 12, 0, tzinfo=timezone.utc)


def _inventory(*hashes: str, available_bytes: int | None = 1_000_000) -> StudioInventoryV1:
    return StudioInventoryV1(
        inventory_id="inventory-test-1",
        host_id="mac-studio-test",
        emitted_at=NOW,
        verified_source_hashes=tuple(sorted(hashes)),
        available_bytes=available_bytes,
    )


def _components(value: int = 1) -> StorageComponentsV1:
    return StorageComponentsV1(
        new_source_bytes=value,
        local_cache_bytes=value,
        result_archive_bytes=value,
        temporary_space_bytes=value,
        current_index_bytes=value,
        previous_index_bytes=value,
        safety_reserve_bytes=value,
    )


def _tree_snapshot(root: Path) -> dict[str, str]:
    return {
        path.relative_to(root).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(root.rglob("*")) if path.is_file()
    }


def test_report_only_plan_classifies_reuse_publish_url_capture_and_held(tmp_path):
    reused = tmp_path / "reused.pdf"
    reused.write_bytes(b"fixture-reused")
    publish = tmp_path / "publish.txt"
    publish.write_bytes(b"fixture-publish")
    reused_hash = hashlib.sha256(reused.read_bytes()).hexdigest()
    missing_hash = "f" * 64

    requests = [
        SourcePlanRequest(
            doc_id="doc-reuse", source_ref_kind="local_file",
            local_path=str(reused), safe_extension="pdf",
        ),
        SourcePlanRequest(
            doc_id="doc-publish", source_ref_kind="local_file",
            local_path=str(publish), safe_extension="txt", media_type="text/plain",
        ),
        SourcePlanRequest(
            doc_id="doc-url", source_ref_kind="url_descriptor",
            url="HTTPS://Example.org:443/path#fragment",
            acquisition_policy="descriptor_only",
        ),
        SourcePlanRequest(
            doc_id="doc-missing-object", source_ref_kind="source_object",
            source_sha256=missing_hash, safe_extension="pdf",
        ),
        SourcePlanRequest(
            doc_id="doc-missing-file", source_ref_kind="local_file",
            local_path=str(tmp_path / "absent.pdf"), safe_extension="pdf",
        ),
    ]

    first = plan_source_depot(requests, _inventory(reused_hash))
    second = plan_source_depot(list(reversed(requests)), _inventory(reused_hash))

    assert first == second
    assert first.report_only is True
    assert first.counts == {"reuse": 1, "publish": 1, "url_capture": 1, "held": 2}
    by_doc = {row.doc_id: row for row in first.decisions}
    assert by_doc["doc-reuse"].classification == "reuse"
    assert by_doc["doc-publish"].classification == "publish"
    assert by_doc["doc-url"].classification == "url_capture"
    assert by_doc["doc-url"].reference.source_sha256 == ""
    assert by_doc["doc-url"].reference.url_descriptor_sha256
    assert by_doc["doc-missing-object"].reason == "missing_source_object"
    assert by_doc["doc-missing-file"].reason == "local_source_missing"


def test_report_only_plan_does_not_copy_or_mutate_authority_roots(tmp_path):
    fixture = tmp_path / "fixture.txt"
    fixture.write_text("synthetic fixture", encoding="utf-8")
    protected = tmp_path / "protected"
    for relative, value in (
        ("corpus/doc/analysis.json", b"analysis"),
        ("source_queue.db", b"queue"),
        ("workflow/attempts.sqlite3", b"ledger"),
        ("syncthing/to-mac-studio/existing.json", b"transfer"),
    ):
        path = protected / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(value)
    before = _tree_snapshot(protected)

    plan = plan_source_depot(
        [SourcePlanRequest(
            doc_id="doc-fixture", source_ref_kind="local_file",
            local_path=str(fixture), safe_extension="txt", media_type="text/plain",
        )],
        _inventory(),
    )

    assert plan.decisions[0].classification == "publish"
    assert _tree_snapshot(protected) == before
    assert not (tmp_path / "sources").exists()


def test_checksum_mismatch_and_conflicting_duplicate_ids_are_rejected(tmp_path):
    source = tmp_path / "fixture.pdf"
    source.write_bytes(b"fixture")
    request = SourcePlanRequest(
        doc_id="doc-one", source_ref_kind="local_file", local_path=str(source),
        safe_extension="pdf", expected_sha256="0" * 64,
    )
    with pytest.raises(ValueError, match="checksum mismatch"):
        plan_source_depot([request], _inventory())

    conflicting = SourcePlanRequest(
        doc_id="doc-one", source_ref_kind="url_descriptor",
        url="https://example.org/one", acquisition_policy="descriptor_only",
    )
    with pytest.raises(ValueError, match="conflicting duplicate doc_id"):
        plan_source_depot([request, conflicting], _inventory())


@pytest.mark.parametrize(
    "path",
    ["/absolute/source.pdf", "../escape/source.pdf", "sources\\evil.pdf"],
)
def test_campaign_source_reference_rejects_nonportable_paths(path):
    with pytest.raises(ValidationError, match="relative path"):
        CampaignSourceReferenceV1(
            ref_id="ref-one", doc_id="doc-one", source_ref_kind="source_object",
            source_sha256="a" * 64, relative_object_path=path,
        )


def test_contracts_reject_unknown_fields():
    with pytest.raises(ValidationError, match="Extra inputs"):
        StudioInventoryV1(
            inventory_id="inventory-one", host_id="studio-one", emitted_at=NOW,
            available_bytes=1, unexpected=True,
        )


def test_unknown_studio_capacity_holds_storage():
    result = estimate_two_host_storage(
        macbook_components=_components(), studio_components=_components(),
        macbook_available_bytes=100, studio_available_bytes=None,
    )
    assert result.status == "held_storage"
    assert result.mac_studio.reason == "capacity_unknown"
    assert result.reasons == ("mac-studio:capacity_unknown",)


def test_insufficient_disk_holds_and_sufficient_two_host_capacity_passes():
    held = estimate_two_host_storage(
        macbook_components=_components(10), studio_components=_components(10),
        macbook_available_bytes=69, studio_available_bytes=1_000,
    )
    assert held.status == "held_storage"
    assert held.macbook.required_bytes == 70
    assert held.macbook.reason == "insufficient_disk"

    ready = estimate_two_host_storage(
        macbook_components=_components(10), studio_components=_components(20),
        macbook_available_bytes=70, studio_available_bytes=140,
    )
    assert ready.status == "ready"
    assert ready.reasons == ()


def _assessment(
    host_id: str,
    *,
    available_bytes: int | None,
) -> HostStorageAssessmentV1:
    components = _components()
    if available_bytes is None:
        status, reason = "held_storage", "capacity_unknown"
    elif available_bytes < components.required_bytes:
        status, reason = "held_storage", "insufficient_disk"
    else:
        status, reason = "ready", "capacity_sufficient"
    return HostStorageAssessmentV1(
        host_id=host_id,
        components=components,
        required_bytes=components.required_bytes,
        available_bytes=available_bytes,
        status=status,
        reason=reason,
    )


def test_host_storage_contract_rejects_forged_relational_values():
    components = _components()
    with pytest.raises(ValidationError, match="component total"):
        HostStorageAssessmentV1(
            host_id="macbook", components=components, required_bytes=0,
            available_bytes=7, status="ready", reason="capacity_sufficient",
        )
    with pytest.raises(ValidationError, match="contradict available capacity"):
        HostStorageAssessmentV1(
            host_id="macbook", components=components, required_bytes=7,
            available_bytes=0, status="ready", reason="capacity_sufficient",
        )
    with pytest.raises(ValidationError, match="contradict available capacity"):
        HostStorageAssessmentV1.model_validate({
            "host_id": "mac-studio", "components": components,
            "required_bytes": 7, "available_bytes": None,
            "status": "held_storage", "reason": "capacity_sufficient",
        })


def test_two_host_storage_contract_rejects_forged_aggregate_values():
    macbook_ready = _assessment("macbook", available_bytes=7)
    studio_ready = _assessment("mac-studio", available_bytes=7)
    studio_held = _assessment("mac-studio", available_bytes=None)

    with pytest.raises(ValidationError, match="status contradicts"):
        TwoHostStoragePreflightV1(
            macbook=macbook_ready, mac_studio=studio_held,
            status="ready", reasons=("mac-studio:capacity_unknown",),
        )
    with pytest.raises(ValidationError, match="macbook field"):
        TwoHostStoragePreflightV1(
            macbook=studio_ready,
            mac_studio=_assessment("macbook", available_bytes=7),
            status="ready", reasons=(),
        )
    with pytest.raises(ValidationError, match="reasons contradict"):
        TwoHostStoragePreflightV1(
            macbook=macbook_ready, mac_studio=studio_held,
            status="held_storage", reasons=(),
        )
