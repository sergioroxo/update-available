from __future__ import annotations

import socket
from datetime import datetime, timezone
from pathlib import Path

import pytest
from streamlit.testing.v1 import AppTest

from runner.config import FactoryConfig, load_factory_config
from runner.production_line_ui import (
    CONFIRMATION, SEMANTIC_CONFIRMATION_TEXT, create_confirmed_campaign, render_factory_console,
    copied_canary_preview, production_readiness_model, publish_control,
    render_production_line, run021_document_review_model, setup_model, status_model,
    unified_setup_model,
)
from runner.pipeline.factory_auth import generate_keypair, sign_factory_message
from runner.pipeline.syncthing_exchange import publish_exchange_json
from runner.pipeline.syncthing_exchange import scan_factory_commands


def _config(tmp_path: Path, role: str = "synthetic") -> FactoryConfig:
    return FactoryConfig(
        to_studio=tmp_path / "exchange" / "to-mac-studio",
        from_studio=tmp_path / "exchange" / "from-mac-studio",
        state_root=tmp_path / "studio-local", job_root=tmp_path / "jobs",
        host_role=role, dry_run_only=True, enabled=True, problems=(),
    )


def test_factory_config_disabled_help_and_overlap_rejection():
    missing = load_factory_config({})
    assert not missing.enabled
    assert "Configure all four factory folders." in missing.problems
    overlap = load_factory_config({
        "SOGICE_FACTORY_TO_STUDIO": "/tmp/shared/to",
        "SOGICE_FACTORY_FROM_STUDIO": "/tmp/shared/from",
        "SOGICE_FACTORY_STATE_ROOT": "/tmp/shared/to/state",
        "SOGICE_FACTORY_JOB_ROOT": "/tmp/jobs",
        "SOGICE_FACTORY_HOST_ROLE": "mac-studio",
        "SOGICE_FACTORY_DRY_RUN_ONLY": "true",
    })
    assert not overlap.enabled
    assert "Shared and Studio-local folders must not overlap." in overlap.problems


def test_campaign_creation_requires_confirmation_and_never_launches_worker(tmp_path):
    config = _config(tmp_path, "macbook")
    with pytest.raises(PermissionError, match="synthetic local processing"):
        create_confirmed_campaign(config, "ui-run", False)
    result = create_confirmed_campaign(config, "ui-run", True)
    assert result["campaign"].execution_mode == "synthetic_no_model"
    assert result["source_published_bytes"] == 66
    assert not (config.state_root / "ui-run" / "worker.db").exists()
    assert not (config.job_root / "ui-run" / "job.json").exists()
    assert scan_factory_commands(config.to_studio, run_id="ui-run") == ()
    published = publish_control(config, "ui-run", "start_approved")
    assert published["command"].sequence == 1
    assert len(scan_factory_commands(config.to_studio, run_id="ui-run")) == 1


def test_receipt_only_status_never_needs_state_root(tmp_path):
    config = _config(tmp_path, "macbook")
    config.from_studio.mkdir(parents=True)
    result = status_model(config, "receipt-only-run")
    assert result["label"] == "Waiting for Mac Studio"
    assert result["receipt_count"] == 0


def test_page_import_and_disabled_render_make_no_network_call(monkeypatch):
    monkeypatch.setattr(socket, "socket", lambda *a, **k: (_ for _ in ()).throw(
        AssertionError("network forbidden")
    ))
    for name in (
        "SOGICE_FACTORY_TO_STUDIO", "SOGICE_FACTORY_FROM_STUDIO",
        "SOGICE_FACTORY_STATE_ROOT", "SOGICE_FACTORY_JOB_ROOT",
        "SOGICE_FACTORY_HOST_ROLE", "SOGICE_FACTORY_DRY_RUN_ONLY",
    ):
        monkeypatch.delenv(name, raising=False)
    app = AppTest.from_string(
        "from runner.production_line_ui import render_production_line\nrender_production_line()"
    ).run(timeout=10)
    assert not app.exception
    assert any("Authenticated local semantic campaigns" in value.value for value in app.info)
    assert any("Setup required" in value.value for value in app.warning)


def test_enabled_macbook_render_has_confirmation_and_no_worker_or_remote_controls(
    tmp_path, monkeypatch,
):
    env = {
        "SOGICE_FACTORY_TO_STUDIO": str(tmp_path / "exchange" / "to-mac-studio"),
        "SOGICE_FACTORY_FROM_STUDIO": str(tmp_path / "exchange" / "from-mac-studio"),
        "SOGICE_FACTORY_STATE_ROOT": str(tmp_path / "studio-local"),
        "SOGICE_FACTORY_JOB_ROOT": str(tmp_path / "jobs"),
        "SOGICE_FACTORY_HOST_ROLE": "macbook", "SOGICE_FACTORY_DRY_RUN_ONLY": "true",
    }
    app = AppTest.from_string(
        "from runner.production_line_ui import render_production_line\nrender_production_line()"
    )
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    app = app.run()
    assert not app.exception
    labels = [button.label for button in app.button]
    assert "Publish authenticated campaign" in labels
    assert "Run all ready work for this campaign" not in labels
    assert any(field.label == "Type the exact approval sentence" for field in app.text_input)
    rendered = " ".join(str(item.value) for item in [*app.info, *app.caption, *app.markdown])
    assert "one global model" in rendered
    assert "Sanity" not in rendered and "Supabase" not in rendered


def test_mac_studio_console_observes_service_without_launching_it(tmp_path, monkeypatch):
    config = _config(tmp_path, "mac-studio")
    create = _config(tmp_path, "synthetic")
    create_confirmed_campaign(create, "studio-ui-run", True)
    for key, value in {
        "SOGICE_FACTORY_TO_STUDIO": config.to_studio,
        "SOGICE_FACTORY_FROM_STUDIO": config.from_studio,
        "SOGICE_FACTORY_STATE_ROOT": config.state_root,
        "SOGICE_FACTORY_JOB_ROOT": config.job_root,
        "SOGICE_FACTORY_HOST_ROLE": "mac-studio",
        "SOGICE_FACTORY_DRY_RUN_ONLY": "true",
    }.items():
        monkeypatch.setenv(key, str(value))
    app = AppTest.from_string(
        "from runner.production_line_ui import render_factory_console\nrender_factory_console()"
    ).run()
    assert not app.exception
    labels = [button.label for button in app.button]
    assert "Run all ready work for this campaign" not in labels
    rendered = " ".join(str(item.value) for item in [*app.info, *app.markdown])
    assert "closing this page does not stop the worker" in rendered.lower()


def test_setup_model_never_exposes_secret_values(tmp_path):
    model = setup_model(_config(tmp_path))
    assert set(model) == {"enabled", "host_role", "dry_run_only", "paths", "problems"}


def test_unified_setup_verifies_serialized_signed_host_health(tmp_path):
    private = tmp_path / "keys" / "receipt-private.pem"
    public = tmp_path / "keys" / "receipt-public.pem"
    generate_keypair(private, public)
    config = FactoryConfig(
        to_studio=tmp_path / "exchange" / "to",
        from_studio=tmp_path / "exchange" / "from",
        state_root=tmp_path / "state", job_root=tmp_path / "jobs",
        host_role="macbook", dry_run_only=False, enabled=True, problems=(),
        production_canary_enabled=True,
        macbook_receipt_public_keys=(public,), production_ready=True,
    )
    issued = datetime.now(timezone.utc)
    message = sign_factory_message(
        {
            "schema_version": "factory-host-health-v1.0",
            "run_id": "factory-host-service",
            "status": "ready", "content_free": True,
            "issued_at": issued.isoformat(),
        },
        purpose="service_status", run_id="factory-host-service",
        message_id="host-service-ready-test", private_key_path=private,
        issued_at=issued,
        shared_roots=(config.to_studio, config.from_studio),
    )
    publish_exchange_json(
        config.from_studio, "service/host/ready.auth.json", message,
    )

    evidence = unified_setup_model(config)["studio_service_evidence"]
    assert evidence["verified"] is True
    assert evidence["status"] == "ready"
    assert evidence["issued_at"] == issued.isoformat()


def test_run025_start_requires_separate_exact_authorization():
    from runner.production_line_ui import RUN025_START_CONFIRMATION

    assert RUN025_START_CONFIRMATION == (
        "Run-025 is delivered. Authorize start_approved."
    )


def test_legacy_mac_studio_manual_controls_remain_registered():
    import inspect
    from runner.app import page_mac_studio_worker

    source = inspect.getsource(page_mac_studio_worker)
    assert "render_factory_console" in source
    assert "Legacy manual source packages" in source
    assert "Run source-worker" in source
    assert "Archive completed outbox packages" in source


def test_copied_canary_preview_is_in_memory_unreleased_and_strict_utf8(tmp_path):
    preview = copied_canary_preview(
        "  blåbær\r\n\r\nend  ".encode(), filename="public.md", maximum_bytes=100,
    )
    assert preview["ready"] is True
    assert preview["retained"] is False
    assert preview["strict_utf8_valid"] is True
    assert preview["proposed_document_id"].startswith("copied-text-")
    assert not list(tmp_path.iterdir())
    invalid = copied_canary_preview(b"\xff", filename="bad.txt", maximum_bytes=100)
    assert invalid["ready"] is False
    assert "not valid UTF-8" in invalid["problems"][0]


def test_production_readiness_remains_unreleased_and_fail_closed(tmp_path):
    config = _config(tmp_path)
    model = production_readiness_model(config)
    assert model["released"] is False
    assert model["configuration_ready"] is False
    assert model["result_import_status"] == "Not authorized"
    assert "Verify source" in model["station_sequence"]


def test_unified_ui_replaces_stale_foundation_placeholders(tmp_path, monkeypatch):
    for key, value in {
        "SOGICE_FACTORY_TO_STUDIO": tmp_path / "exchange" / "to",
        "SOGICE_FACTORY_FROM_STUDIO": tmp_path / "exchange" / "from",
        "SOGICE_FACTORY_STATE_ROOT": tmp_path / "state",
        "SOGICE_FACTORY_JOB_ROOT": tmp_path / "jobs",
        "SOGICE_FACTORY_HOST_ROLE": "macbook",
        "SOGICE_FACTORY_DRY_RUN_ONLY": "true",
    }.items():
        monkeypatch.setenv(key, str(value))
    app = AppTest.from_string(
        "from runner.production_line_ui import render_production_line\nrender_production_line()"
    ).run()
    assert not app.exception
    rendered = " ".join(str(item.value) for item in [
        *app.warning, *app.info, *app.markdown, *app.caption,
    ])
    assert "synthetic foundation only" not in rendered.lower()
    assert "authenticated local semantic campaigns" in rendered.lower()
    assert "source_verify" in rendered
    labels = [button.label for button in app.button]
    assert "Publish authenticated campaign" in labels
    assert all("canary" not in label.lower() for label in labels)


def test_run021_document_review_projects_citations_rankings_and_receipt_gaps():
    review = {
        "analysis": {"doc-a": {"summary": "Provisional", "evidence": ["Evidence"], "candidate_terms": ["term"]}},
        "enrichment": {"doc-a": {"retrieval_context_sha256": "a" * 64, "corpus_connections": [{"unit_id": "unit-a"}]}},
        "retrieval": {"doc-a": {"hits": [{"unit_id": "unit-a"}]}},
        "comparison": {
            "compiler_comparisons": [{
                "document_id": "doc-a", "primary_model": "Gemma",
                "comparison_model": "Qwen3.8", "primary_claims": [{"citation_unit_ids": ["unit-a"]}],
                "comparison_claims": [], "exact_agreement_count": 0,
                "primary_only_count": 1, "comparison_only_count": 0,
                "model_truth_declaration": False,
            }],
            "retrieval_rankings": {
                "qwen_4096": {"doc-a": [{"rank": 1, "unit_id": "unit-a"}]},
                "bge_m3_1024": {"doc-a": [{"rank": 1, "unit_id": "unit-b"}]},
            },
        },
        "receipt_count": 2, "receipt_gaps": (),
    }
    model = run021_document_review_model(review, "doc-a")
    assert model["primary_claims"][0]["citation_unit_ids"] == ["unit-a"]
    assert model["qwen_ranking"][0]["unit_id"] == "unit-a"
    assert model["bge_ranking"][0]["unit_id"] == "unit-b"
    assert model["grounded_connections"][0]["unit_id"] == "unit-a"
    assert model["receipt_count"] == 2 and model["receipt_gaps"] == ()
    assert model["model_truth_declaration"] is False
