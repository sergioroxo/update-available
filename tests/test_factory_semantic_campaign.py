from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from runner.config import FactoryConfig
from runner.pipeline.factory_auth import generate_keypair, public_key_allowlist
from runner.pipeline.factory_semantic_campaign import (
    SEMANTIC_CAMPAIGN_STATIONS,
    SEMANTIC_CONFIRMATION,
    AcceptedSemanticRuntimeAdapter,
    DeterministicNoModelSemanticAdapter,
    build_semantic_approval,
    freeze_trusted_lexicon_snapshot,
    source_queue_inventory,
    verify_run021_results,
)
from runner.pipeline.factory_service import _main as factory_service_main, run_service_scan_once
from runner.pipeline.factory_semantic_runtime import prepare_accepted_runtime_contract
from runner.pipeline.syncthing_exchange import (
    forbidden_mutable_members,
    load_authenticated_factory_receipts,
    observe_authenticated_receipts,
    verify_authenticated_result_bundle,
)
from runner.production_line_ui import (
    RUN021_ARCHIVE_SHA256,
    create_semantic_campaign,
    publish_semantic_control,
    semantic_plan_model,
)
from runner.pipeline.factory_semantic_campaign import SourceInventoryRow
from runner.pipeline.source_queue import add_item, open_db, update_source_file_attachment


NOW = datetime(2026, 8, 24, 12, 0, tzinfo=timezone.utc)


def _keys(tmp_path: Path):
    mb_private = tmp_path / "keys" / "macbook-private.pem"
    mb_public = tmp_path / "keys" / "macbook-public.pem"
    st_private = tmp_path / "keys" / "studio-private.pem"
    st_public = tmp_path / "keys" / "studio-public.pem"
    generate_keypair(mb_private, mb_public)
    generate_keypair(st_private, st_public)
    return mb_private, mb_public, st_private, st_public


def _config(tmp_path: Path, mb_private: Path, mb_public: Path, st_public: Path):
    return FactoryConfig(
        to_studio=tmp_path / "exchange" / "to-studio",
        from_studio=tmp_path / "exchange" / "from-studio",
        state_root=tmp_path / "studio-state",
        job_root=tmp_path / "jobs",
        host_role="synthetic", dry_run_only=False, enabled=True, problems=(),
        production_canary_enabled=True,
        macbook_signing_private_key=mb_private,
        studio_command_public_keys=(mb_public,),
        macbook_receipt_public_keys=(st_public,),
        service_log_root=tmp_path / "logs",
        production_ready=True, production_problems=(),
    )


def _row(path: Path, document_id: str) -> SourceInventoryRow:
    data = path.read_bytes()
    text = data.decode()
    import hashlib
    return SourceInventoryRow(
        document_id=document_id, title=f"Title {document_id}", source_path=path,
        origin="synthetic_fixture", language="en", media_type="text/plain",
        byte_count=len(data), source_sha256=hashlib.sha256(data).hexdigest(),
        source_characters=len(text), prior_analysis=False, eligible=True, hold_reason="",
    )


def test_semantic_contract_and_frozen_trust_rule_are_strict():
    snapshot = freeze_trusted_lexicon_snapshot([
        {"_id": "validated", "term": "Affirmative care", "status": "validated"},
        {"_id": "trusted-draft", "term": "Trusted draft", "status": "draft", "includeInAnalysisLexicon": True},
        {"_id": "untrusted", "term": "Model draft", "status": "draft", "includeInAnalysisLexicon": False},
    ], snapshot_id="snapshot-022", source_version="sanity-trust-rule-v1", created_at=NOW)
    assert [row.term_id for row in snapshot.terms] == ["trusted-draft", "validated"]
    document = {
        "document_id": "doc-a", "title": "A", "source_sha256": "a" * 64,
        "source_bytes": 1, "source_characters": 1, "safe_display_filename": "a.txt",
        "media_type": "text/plain", "language": "en", "source_family_id": "family-a",
        "inventory_origin": "synthetic_fixture", "source_available": True,
        "canonical_quality": "complete", "prior_analysis": False,
    }
    approval = build_semantic_approval({
        "approval_id": "approval-022", "run_id": "semantic-022",
        "researcher_id": "researcher", "researcher_confirmation_text": SEMANTIC_CONFIRMATION,
        "approved_at": NOW, "expires_at": NOW + timedelta(hours=1),
        "documents": (document,), "lexicon_snapshot_id": snapshot.snapshot_id,
        "lexicon_snapshot_sha256": snapshot.canonical_sha256,
    })
    assert approval.station_ids == SEMANTIC_CAMPAIGN_STATIONS
    assert approval.memory_policy.maximum_resident_models == 1
    assert approval.remote_writes is approval.corpus_import is approval.publication is False
    tampered = approval.model_dump(mode="python")
    tampered["lexicon_snapshot_sha256"] = "b" * 64
    with pytest.raises(ValueError, match="approval hash mismatch"):
        type(approval).model_validate(tampered)


def test_no_model_semantic_exchange_uses_existing_controller_service_and_is_idempotent(tmp_path):
    mb_private, mb_public, st_private, st_public = _keys(tmp_path)
    config = _config(tmp_path, mb_private, mb_public, st_public)
    sources = tmp_path / "sources"
    sources.mkdir()
    first, second = sources / "first.txt", sources / "second.txt"
    first.write_text("Complete source A.\n", encoding="utf-8")
    second.write_text("Complete source B.\n", encoding="utf-8")
    selected = (_row(first, "doc-a"), _row(second, "doc-b"))
    assert semantic_plan_model(selected)["ready"] is True
    release = create_semantic_campaign(
        config, run_id="semantic-e2e-022", researcher_id="researcher",
        selected=selected, trusted_terms=[{
            "_id": "term-one", "term": "Affirmative care", "status": "validated",
        }], confirmed_text=SEMANTIC_CONFIRMATION, now=NOW,
    )
    assert release["source_published_bytes"] == first.stat().st_size + second.stat().st_size
    assert not (config.state_root / "semantic-e2e-022" / "worker.db").exists()
    command = publish_semantic_control(config, "semantic-e2e-022", "start_approved")
    assert command["command"].sequence == 1
    result = run_service_scan_once(
        to_studio=config.to_studio, from_studio=config.from_studio,
        state_root=config.state_root, log_root=config.service_log_root,
        command_public_key_paths=(mb_public,),
        receipt_signing_private_key=st_private, host_role="synthetic",
        semantic_station_adapter=DeterministicNoModelSemanticAdapter(),
        now=NOW + timedelta(minutes=1),
    )
    assert result["runs"][0]["status"] == "succeeded", result["runs"][0]
    allowed = public_key_allowlist((st_public,))
    receipts = load_authenticated_factory_receipts(
        config.from_studio, run_id="semantic-e2e-022",
        allowed_public_keys=allowed, now=NOW + timedelta(hours=1),
    )
    projection = observe_authenticated_receipts(
        config.from_studio, run_id="semantic-e2e-022",
        allowed_public_keys=allowed, now=NOW + timedelta(hours=1),
    )
    assert projection.valid and projection.campaign.state == "succeeded"
    assert len(projection.stations) == len(SEMANTIC_CAMPAIGN_STATIONS)
    assert len(projection.documents) == 2 * len(SEMANTIC_CAMPAIGN_STATIONS)
    for document_id in ("doc-a", "doc-b"):
        manifest = verify_authenticated_result_bundle(
            config.from_studio, run_id="semantic-e2e-022",
            document_id=document_id, station_id="sealed_results",
            allowed_public_keys=allowed, now=NOW + timedelta(hours=1),
        )
        assert manifest.station_id == "sealed_results"
    assert not forbidden_mutable_members(config.to_studio)
    assert not forbidden_mutable_members(config.from_studio)
    before_refresh = {
        path.relative_to(config.from_studio).as_posix(): path.read_bytes()
        for path in config.from_studio.rglob("*") if path.is_file()
    }
    repeat = run_service_scan_once(
        to_studio=config.to_studio, from_studio=config.from_studio,
        state_root=config.state_root, log_root=config.service_log_root,
        command_public_key_paths=(mb_public,), receipt_signing_private_key=st_private,
        host_role="synthetic", semantic_station_adapter=DeterministicNoModelSemanticAdapter(),
        now=NOW + timedelta(minutes=2),
    )
    repeated = load_authenticated_factory_receipts(
        config.from_studio, run_id="semantic-e2e-022",
        allowed_public_keys=allowed, now=NOW + timedelta(hours=1),
    )
    assert repeat["runs"][0]["steps"] == 0
    assert repeated == receipts
    assert before_refresh == {
        path.relative_to(config.from_studio).as_posix(): path.read_bytes()
        for path in config.from_studio.rglob("*") if path.is_file()
    }


def test_semantic_pause_resume_and_cancel_are_authenticated_and_cancel_only_unstarted(tmp_path):
    mb_private, mb_public, st_private, st_public = _keys(tmp_path)
    config = _config(tmp_path, mb_private, mb_public, st_public)
    source = tmp_path / "source.txt"
    source.write_text("Complete source.\n", encoding="utf-8")
    create_semantic_campaign(
        config, run_id="semantic-command-022", researcher_id="researcher",
        selected=(_row(source, "doc-a"),), trusted_terms=[],
        confirmed_text=SEMANTIC_CONFIRMATION, now=NOW,
    )
    actions = ("start_approved", "pause_after_current", "resume", "cancel_unstarted")
    published = [publish_semantic_control(config, "semantic-command-022", action) for action in actions]
    assert tuple(row["command"].sequence for row in published) == (1, 2, 3, 4)
    result = run_service_scan_once(
        to_studio=config.to_studio, from_studio=config.from_studio,
        state_root=config.state_root, log_root=config.service_log_root,
        command_public_key_paths=(mb_public,), receipt_signing_private_key=st_private,
        host_role="synthetic", semantic_station_adapter=DeterministicNoModelSemanticAdapter(),
        now=NOW + timedelta(minutes=1),
    )
    assert result["runs"][0]["status"] == "cancelled"
    projection = observe_authenticated_receipts(
        config.from_studio, run_id="semantic-command-022",
        allowed_public_keys=public_key_allowlist((st_public,)),
        now=NOW + timedelta(hours=1),
    )
    assert projection.valid and projection.campaign.state == "cancelled"
    assert all(row.state == "cancelled" for row in projection.documents)
    assert not list((config.from_studio / "campaigns" / "semantic-command-022" / "results").rglob("*.json"))


def test_accepted_runtime_adapter_is_pluggable_and_invoked_once_per_resumable_run(tmp_path):
    mb_private, mb_public, st_private, st_public = _keys(tmp_path)
    config = _config(tmp_path, mb_private, mb_public, st_public)
    source = tmp_path / "source.txt"
    source.write_text("Complete source.\n", encoding="utf-8")
    create_semantic_campaign(
        config, run_id="semantic-adapter-022", researcher_id="researcher",
        selected=(_row(source, "doc-a"),), trusted_terms=[],
        confirmed_text=SEMANTIC_CONFIRMATION, now=NOW,
    )
    publish_semantic_control(config, "semantic-adapter-022", "start_approved")
    calls: list[str] = []

    def fake_accepted_runner(**kwargs):
        calls.append(kwargs["campaign"].run_id)
        sealed = tmp_path / "accepted-sealed"
        for directory in ("analysis", "compilers", "retrieval", "enrichment"):
            (sealed / directory).mkdir(parents=True, exist_ok=True)
        for relative in (
            "analysis/doc-a.json", "compilers/doc-a-primary.json",
            "compilers/doc-a-qwen38-comparison.json", "retrieval/doc-a-qwen.json",
            "enrichment/doc-a.json", "index_manifest.json", "execution_summary.json",
            "pilot_projection.json", "researcher_comparison_report.json",
        ):
            (sealed / relative).write_text("{}\n", encoding="utf-8")
        return sealed

    result = run_service_scan_once(
        to_studio=config.to_studio, from_studio=config.from_studio,
        state_root=config.state_root, log_root=config.service_log_root,
        command_public_key_paths=(mb_public,), receipt_signing_private_key=st_private,
        host_role="synthetic",
        semantic_station_adapter=AcceptedSemanticRuntimeAdapter(
            runtime_runner=fake_accepted_runner,
        ),
        now=NOW + timedelta(minutes=1),
    )
    assert result["runs"][0]["status"] == "succeeded"
    assert calls == ["semantic-adapter-022"]
    allowed = public_key_allowlist((st_public,))
    for station_id in SEMANTIC_CAMPAIGN_STATIONS[3:]:
        manifest = verify_authenticated_result_bundle(
            config.from_studio, run_id="semantic-adapter-022",
            document_id="doc-a", station_id=station_id,
            allowed_public_keys=allowed, now=NOW + timedelta(hours=1),
        )
        assert manifest.station_id == station_id


def test_authenticated_campaign_converts_to_exact_host_local_runtime_contract(tmp_path):
    mb_private, mb_public, _st_private, st_public = _keys(tmp_path)
    config = _config(tmp_path, mb_private, mb_public, st_public)
    source = tmp_path / "glossary.txt"
    source.write_text("Complete glossary source.\n", encoding="utf-8")
    release = create_semantic_campaign(
        config, run_id="semantic-contract-023", researcher_id="researcher",
        selected=(_row(source, "doc-a"),), trusted_terms=[{
            "_id": "term-a", "term": "Approved term", "status": "validated",
        }], confirmed_text=SEMANTIC_CONFIRMATION, now=NOW,
    )
    run_state = config.state_root / "semantic-contract-023"
    contract = prepare_accepted_runtime_contract(
        campaign=release["campaign"], approval=release["approval"],
        to_studio=config.to_studio, from_studio=config.from_studio,
        run_state=run_state,
    )
    workspace = run_state / "semantic-runtime"
    assert Path(contract.workspace) == workspace
    assert contract.mapper_maximum_concurrency == 1
    assert contract.route_aliases.section_mapper == "core-qwen"
    assert contract.route_aliases.document_compiler == "core-gemma"
    assert contract.route_aliases.qwen38_mapper_repair == "compiler-qwen38"
    assert contract.route_aliases.qwen_embedding == "research-embedding"
    assert contract.route_aliases.bge_shadow == "bge-m3-shadow"
    assert Path(contract.documents[0].source_path).read_bytes() == source.read_bytes()
    assert Path(contract.lexicon_snapshot_path).is_file()
    assert (workspace / "contract.json").is_file()
    assert not forbidden_mutable_members(config.to_studio)
    assert not forbidden_mutable_members(config.from_studio)


def test_real_cli_explicit_runtime_completes_nine_barriers_and_restarts_idle(tmp_path):
    root = tmp_path / "enabled"
    mb_private, mb_public, st_private, st_public = _keys(root)
    config = _config(root, mb_private, mb_public, st_public)
    source = root / "source.txt"
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_text("Complete source.\n", encoding="utf-8")
    run_id = "semantic-cli-023"
    create_semantic_campaign(
        config, run_id=run_id, researcher_id="researcher",
        selected=(_row(source, "doc-a"),), trusted_terms=[],
        confirmed_text=SEMANTIC_CONFIRMATION, now=NOW,
    )
    publish_semantic_control(config, run_id, "start_approved")
    runner_calls: list[str] = []
    factory_constructions: list[str] = []

    def fake_runner(**kwargs):
        runner_calls.append(kwargs["campaign"].run_id)
        sealed = Path(kwargs["run_state"]) / "synthetic-no-network-sealed"
        for directory in ("analysis", "compilers", "retrieval", "enrichment"):
            (sealed / directory).mkdir(parents=True, exist_ok=True)
        for relative in (
            "analysis/doc-a.json", "compilers/doc-a-primary.json",
            "compilers/doc-a-qwen38-comparison.json", "retrieval/doc-a-qwen.json",
            "enrichment/doc-a.json", "index_manifest.json", "execution_summary.json",
            "pilot_projection.json", "researcher_comparison_report.json",
        ):
            (sealed / relative).write_text("{}\n", encoding="utf-8")
        return sealed

    def fixture_factory(**kwargs):
        factory_constructions.append(kwargs["host_role"])
        return AcceptedSemanticRuntimeAdapter(runtime_runner=fake_runner)

    arguments = [
        "run", "--to-studio", str(config.to_studio),
        "--from-studio", str(config.from_studio),
        "--state-root", str(config.state_root),
        "--log-root", str(config.service_log_root),
        "--command-public-key", str(mb_public),
        "--receipt-private-key", str(st_private),
        "--host-role", "synthetic", "--semantic-runtime", "accepted-local",
        "--once", "--validation-now", (NOW + timedelta(minutes=1)).isoformat(),
    ]
    assert factory_service_main(
        arguments, semantic_runtime_factory=fixture_factory,
    ) == 0
    allowed = public_key_allowlist((st_public,))
    receipts = load_authenticated_factory_receipts(
        config.from_studio, run_id=run_id, allowed_public_keys=allowed,
        now=NOW + timedelta(hours=1),
    )
    projection = observe_authenticated_receipts(
        config.from_studio, run_id=run_id, allowed_public_keys=allowed,
        now=NOW + timedelta(hours=1),
    )
    assert projection.valid and projection.campaign.state == "succeeded"
    assert len(projection.stations) == len(SEMANTIC_CAMPAIGN_STATIONS)
    assert {row.state for row in projection.stations} == {"succeeded"}
    with sqlite3.connect(config.state_root / run_id / "worker.db") as connection:
        attempts = connection.execute(
            "SELECT station_id,attempt FROM production_jobs ORDER BY station_sequence"
        ).fetchall()
    assert [row[0] for row in attempts] == list(SEMANTIC_CAMPAIGN_STATIONS)
    assert {row[1] for row in attempts} == {1}
    assert runner_calls == [run_id]

    assert factory_service_main(
        arguments, semantic_runtime_factory=fixture_factory,
    ) == 0
    repeated = load_authenticated_factory_receipts(
        config.from_studio, run_id=run_id, allowed_public_keys=allowed,
        now=NOW + timedelta(hours=1),
    )
    assert factory_constructions == ["synthetic", "synthetic"]
    assert runner_calls == [run_id]
    assert repeated == receipts
    assert not forbidden_mutable_members(config.to_studio)
    assert not forbidden_mutable_members(config.from_studio)


def test_real_cli_disabled_runtime_holds_before_semantic_execution(tmp_path):
    mb_private, mb_public, st_private, st_public = _keys(tmp_path)
    config = _config(tmp_path, mb_private, mb_public, st_public)
    source = tmp_path / "source.txt"
    source.write_text("Complete source.\n", encoding="utf-8")
    run_id = "semantic-cli-disabled-023"
    create_semantic_campaign(
        config, run_id=run_id, researcher_id="researcher",
        selected=(_row(source, "doc-a"),), trusted_terms=[],
        confirmed_text=SEMANTIC_CONFIRMATION, now=NOW,
    )
    publish_semantic_control(config, run_id, "start_approved")
    factory_calls = []
    result = factory_service_main([
        "run", "--to-studio", str(config.to_studio),
        "--from-studio", str(config.from_studio),
        "--state-root", str(config.state_root),
        "--log-root", str(config.service_log_root),
        "--command-public-key", str(mb_public),
        "--receipt-private-key", str(st_private),
        "--host-role", "synthetic", "--once", "--validation-now",
        (NOW + timedelta(minutes=1)).isoformat(),
    ], semantic_runtime_factory=lambda **kwargs: factory_calls.append(kwargs))
    assert result == 0 and factory_calls == []
    projection = observe_authenticated_receipts(
        config.from_studio, run_id=run_id,
        allowed_public_keys=public_key_allowlist((st_public,)),
        now=NOW + timedelta(hours=1),
    )
    assert projection.campaign.state == "held"
    assert not (
        config.state_root / run_id / "results" / "doc-a"
        / "independent_analysis" / "artifact_manifest.json"
    ).exists()


def test_run021_read_only_archive_verifies_without_calls_or_mutation():
    root = Path("/Users/sergiogalvaoroxo/Documents/surviving-sogice-stuff/Run-021")
    if not root.is_dir():
        pytest.skip("transferred Run-021 archive is host evidence")
    review = verify_run021_results(
        root / "surviving-sogice-direct-copied-semantic-pilot-021-results.tar.gz",
        root / "surviving-sogice-direct-copied-semantic-pilot-021-results.manifest.json",
        expected_archive_sha256=RUN021_ARCHIVE_SHA256,
    )
    assert review["member_count"] == 52
    assert review["projection_sha256"] == "7b6d538b21bbd9a8e27f0b72d32f6e6169cbcc1096b84b4b8141c263119f807f"
    assert review["model_calls"] == review["mutation_count"] == 0
    assert len(review["analysis"]) == len(review["enrichment"]) == 6
    assert len(review["retrieval"]) == 6
    assert review["receipt_count"] == 24 and review["receipt_gaps"] == ()


def test_source_queue_selection_is_read_only_and_never_exposes_database_path(tmp_path):
    database = tmp_path / "source_queue.db"
    source = tmp_path / "attached.txt"
    source.write_text("Complete attached source.\n", encoding="utf-8")
    connection = open_db(database)
    item = add_item(
        connection, "https://example.org/source", title="Queue source",
        status="triaged",
    )
    assert item is not None
    connection.execute(
        "UPDATE source_queue SET triage_model_used='fixture',overnight_batch_safe=1 "
        "WHERE id=?", (item.id,),
    )
    connection.commit()
    update_source_file_attachment(
        connection, item.id, source_file_path=str(source), needs_source_file=False,
    )
    connection.close()
    before = database.read_bytes()
    before_mtime = database.stat().st_mtime_ns
    inventory = source_queue_inventory(database)
    assert len(inventory) == 1 and inventory[0].eligible
    projection = json.dumps(inventory[0].display(), sort_keys=True)
    assert str(database) not in projection and str(source) not in projection
    assert database.read_bytes() == before
    assert database.stat().st_mtime_ns == before_mtime
