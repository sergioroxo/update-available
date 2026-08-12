from __future__ import annotations

import json
import socket
import subprocess
from pathlib import Path

import pytest
from pydantic import ValidationError

from runner.models.reprocessing import RecoveryUnitManifestV1, ResearchCampaignV2
from runner.pipeline.factory_controller import (
    DOCUMENT_IDS,
    FIXTURE_BYTES,
    build_campaign_and_packages,
    create_synthetic_campaign, simulate_three_documents,
)
from runner.pipeline.syncthing_exchange import discover_campaign_ids
from runner.pipeline.source_depot import publish_source_object


def _release(tmp_path: Path):
    fixtures = tmp_path / "fixtures"
    fixtures.mkdir()
    publications = []
    for doc_id in DOCUMENT_IDS:
        path = fixtures / f"{doc_id}.txt"
        path.write_bytes(FIXTURE_BYTES[doc_id])
        publications.append(
            publish_source_object(
                path, tmp_path / "to-mac-studio", doc_id=doc_id,
                safe_extension="txt", media_type="text/plain",
            )
        )
    return build_campaign_and_packages(
        run_id="synthetic-factory-test", publications=tuple(publications),
    )


def _json_contract(model, payload):
    return model.model_validate_json(json.dumps(payload, separators=(",", ":")))


def test_strict_campaign_and_recovery_unit_contracts(tmp_path):
    campaign, packages = _release(tmp_path)
    assert campaign.execution_mode == "synthetic_no_model"
    assert campaign.authorized_station_ids == ("synthetic_prepare",)
    assert campaign.remote_writes is False
    assert campaign.publication is False
    assert campaign.verified_local_import_authority is False
    assert packages[0].documents[0].document_id == "fixture-good-a"

    payload = campaign.model_dump(mode="json")
    payload["unexpected_authority"] = True
    with pytest.raises(ValidationError, match="Extra inputs"):
        _json_contract(ResearchCampaignV2, payload)

    payload = campaign.model_dump(mode="json")
    payload["remote_writes"] = True
    with pytest.raises(ValidationError):
        _json_contract(ResearchCampaignV2, payload)


def test_recovery_unit_rejects_more_than_fifteen_and_duplicate_documents(tmp_path):
    _, packages = _release(tmp_path)
    payload = packages[0].model_dump(mode="json")
    template = payload["documents"][0]
    payload["documents"] = []
    for index in range(16):
        row = dict(template)
        row["document_id"] = f"doc-{index:02d}"
        row["source_reference"] = dict(row["source_reference"])
        row["source_reference"]["doc_id"] = row["document_id"]
        payload["documents"].append(row)
    with pytest.raises(ValidationError, match="1-15"):
        _json_contract(RecoveryUnitManifestV1, payload)

    payload = packages[0].model_dump(mode="json")
    payload["documents"] = [payload["documents"][0], payload["documents"][0]]
    with pytest.raises(ValidationError, match="sorted and unique"):
        _json_contract(RecoveryUnitManifestV1, payload)


def test_campaign_rejects_missing_source_and_hash_disagreement(tmp_path):
    campaign, _ = _release(tmp_path)
    payload = campaign.model_dump(mode="json")
    payload["source_references"] = payload["source_references"][:-1]
    with pytest.raises(ValidationError, match="exactly one"):
        _json_contract(ResearchCampaignV2, payload)

    payload = campaign.model_dump(mode="json")
    payload["required_source_hashes"] = ["f" * 64]
    with pytest.raises(ValidationError, match="required source hashes"):
        _json_contract(ResearchCampaignV2, payload)

    payload = campaign.model_dump(mode="json")
    payload["package_manifest_sha256s"] = []
    with pytest.raises(ValidationError, match="every package ID"):
        _json_contract(ResearchCampaignV2, payload)


def test_content_addressed_publication_reuses_exact_bytes_and_rejects_corruption(tmp_path):
    source = tmp_path / "fixture.txt"
    source.write_bytes(b"exact synthetic bytes\r\n")
    transfer = tmp_path / "transfer"
    first = publish_source_object(source, transfer, doc_id="doc-one", safe_extension="txt")
    second = publish_source_object(source, transfer, doc_id="doc-one", safe_extension="txt")
    assert first.published_bytes == len(source.read_bytes())
    assert first.reused_bytes == 0
    assert second.published_bytes == 0
    assert second.reused_bytes == len(source.read_bytes())

    object_path = transfer / first.reference.relative_object_path
    object_path.write_bytes(b"corrupt")
    with pytest.raises(ValueError, match="checksum mismatch"):
        publish_source_object(source, transfer, doc_id="doc-one", safe_extension="txt")


def test_source_publication_rejects_incomplete_object_and_non_regular_inputs(tmp_path):
    source = tmp_path / "fixture.txt"
    source.write_bytes(b"fixture")
    transfer = tmp_path / "transfer"
    result = publish_source_object(source, transfer, doc_id="doc-one", safe_extension="txt")
    (transfer / f"{result.reference.relative_object_path}.sha256").unlink()
    with pytest.raises(FileExistsError, match="incomplete"):
        publish_source_object(source, transfer, doc_id="doc-one", safe_extension="txt")

    link = tmp_path / "fixture-link"
    link.symlink_to(source)
    with pytest.raises(ValueError, match="non-symlink regular file"):
        publish_source_object(link, tmp_path / "elsewhere", doc_id="doc-link")
    with pytest.raises(ValueError, match="non-symlink regular file"):
        publish_source_object(tmp_path, tmp_path / "elsewhere", doc_id="doc-dir")


def test_direct_simulation_isolates_poison_and_second_run_is_idempotent(
    tmp_path, monkeypatch,
):
    def forbid_network(*args, **kwargs):
        raise AssertionError("network access is forbidden in synthetic factory mode")

    monkeypatch.setattr(socket, "socket", forbid_network)
    first = simulate_three_documents(tmp_path, run_id="synthetic-factory-007-test")
    second = simulate_three_documents(tmp_path, run_id="synthetic-factory-007-test")

    assert first["source_published_bytes"] == sum(map(len, FIXTURE_BYTES.values()))
    assert first["source_reused_bytes"] == 0
    assert first["jobs"] == second["jobs"]
    assert first["jobs"]["fixture-good-a"]["attempt"] == 1
    assert first["jobs"]["fixture-good-b"]["attempt"] == 1
    assert first["jobs"]["fixture-poison"] == {
        "state": "held", "attempt": 2,
        "terminal_reason": "synthetic_executor_failure",
    }
    assert first["executor_invocations"] == {
        "fixture-good-a": 1, "fixture-good-b": 1, "fixture-poison": 2,
    }
    assert second["source_published_bytes"] == 0
    assert second["source_reused_bytes"] == sum(map(len, FIXTURE_BYTES.values()))
    assert second["executor_invocations"] == {}
    assert second["receipt_count"] == first["receipt_count"]
    assert second["projection_sha256"] == first["projection_sha256"]


def test_real_command_line_simulation_runs_twice_in_a_separate_process(tmp_path):
    command = [
        ".venv/bin/python", "-m", "runner.pipeline.factory_controller",
        "simulate-three-docs", "--workspace", str(tmp_path),
        "--run-id", "synthetic-cli-test",
    ]
    root = Path(__file__).resolve().parents[1]
    first = json.loads(subprocess.run(
        command, cwd=root, text=True, capture_output=True, check=True,
    ).stdout)
    second = json.loads(subprocess.run(
        command, cwd=root, text=True, capture_output=True, check=True,
    ).stdout)
    assert first["execution_number"] == 1
    assert second["execution_number"] == 2
    assert first["projection_sha256"] == second["projection_sha256"]
    assert second["source_published_bytes"] == 0
    assert second["executor_invocations"] == {}
    assert first["worker_database"] == "studio-local/synthetic-cli-test/worker.db"
    assert first["shared_tree_database_files"] == []


def test_two_run_scoped_campaigns_coexist_and_reuse_global_source_objects(tmp_path):
    first = create_synthetic_campaign(tmp_path, run_id="campaign-alpha")
    second = create_synthetic_campaign(tmp_path, run_id="campaign-beta")
    assert first["source_published_bytes"] == 66
    assert second["source_published_bytes"] == 0
    assert second["source_reused_bytes"] == 66
    assert discover_campaign_ids(tmp_path / "exchange" / "to-mac-studio") == (
        "campaign-alpha", "campaign-beta",
    )
    assert (
        tmp_path / "exchange" / "to-mac-studio" / "campaigns" /
        "campaign-alpha" / "campaign.json"
    ).is_file()
    assert (
        tmp_path / "exchange" / "to-mac-studio" / "campaigns" /
        "campaign-beta" / "campaign.json"
    ).is_file()


def test_two_complete_simulations_coexist_without_cross_run_consumption(tmp_path):
    alpha = simulate_three_documents(tmp_path, run_id="simulation-alpha")
    beta = simulate_three_documents(tmp_path, run_id="simulation-beta")
    assert alpha["source_published_bytes"] == 66
    assert beta["source_published_bytes"] == 0
    assert beta["source_reused_bytes"] == 66
    assert alpha["receipt_count"] == beta["receipt_count"] == 13
    assert alpha["projection_sha256"] != beta["projection_sha256"]
    assert (
        tmp_path / "studio-local" / "simulation-alpha" / "worker.db"
    ).is_file()
    assert (
        tmp_path / "studio-local" / "simulation-beta" / "worker.db"
    ).is_file()
