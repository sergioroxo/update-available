from __future__ import annotations

import os
from pathlib import Path

import pytest

import runner.pipeline.factory_semantic_runtime as semantic_runtime
import runner.pipeline.factory_service as factory_service
from runner.pipeline.factory_semantic_campaign import AcceptedSemanticRuntimeAdapter


TEST_KEY = "test-only-process-local-key-not-operational"


def _config(path: Path, *, key: str = TEST_KEY, mode: int = 0o600) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "model_list: []\n"
        "general_settings:\n"
        f"  master_key: {key}\n",
        encoding="utf-8",
    )
    path.chmod(mode)
    return path


def test_process_local_loader_extracts_only_master_key(tmp_path):
    path = _config(tmp_path / "host-local" / "litellm.yaml")
    secret = semantic_runtime.load_process_local_semantic_api_key(
        path, shared_roots=(tmp_path / "to", tmp_path / "from"),
    )
    assert secret.get_secret_value() == TEST_KEY
    assert TEST_KEY not in repr(secret)


@pytest.mark.parametrize(
    ("payload", "message"),
    (
        ("not: [valid", "malformed"),
        ("general_settings: {}\n", "no valid master key"),
        ("general_settings:\n  master_key: ''\n", "no valid master key"),
    ),
)
def test_process_local_loader_rejects_malformed_or_missing_key(
    tmp_path, payload, message,
):
    path = tmp_path / "litellm.yaml"
    path.write_text(payload, encoding="utf-8")
    path.chmod(0o600)
    with pytest.raises(ValueError, match=message):
        semantic_runtime.load_process_local_semantic_api_key(
            path, shared_roots=(tmp_path / "to", tmp_path / "from"),
        )


def test_process_local_loader_rejects_mode_symlink_and_shared_tree(tmp_path):
    loose = _config(tmp_path / "loose.yaml", mode=0o644)
    with pytest.raises(PermissionError, match="0600"):
        semantic_runtime.load_process_local_semantic_api_key(
            loose, shared_roots=(tmp_path / "to", tmp_path / "from"),
        )

    target = _config(tmp_path / "target.yaml")
    link = tmp_path / "link.yaml"
    link.symlink_to(target)
    with pytest.raises(ValueError, match="symlink"):
        semantic_runtime.load_process_local_semantic_api_key(
            link, shared_roots=(tmp_path / "to", tmp_path / "from"),
        )

    shared = _config(tmp_path / "to" / "litellm.yaml")
    with pytest.raises(ValueError, match="outside shared"):
        semantic_runtime.load_process_local_semantic_api_key(
            shared, shared_roots=(tmp_path / "to", tmp_path / "from"),
        )


def test_service_passes_secret_in_private_mapping_without_global_environment(
    tmp_path, monkeypatch, capsys,
):
    credential = _config(tmp_path / "host-local" / "litellm.yaml")
    captured = {}

    def fake_builder(**kwargs):
        captured.update(kwargs)
        return AcceptedSemanticRuntimeAdapter(runtime_runner=lambda **_kwargs: tmp_path)

    monkeypatch.delenv(semantic_runtime.SEMANTIC_API_KEY_ENV, raising=False)
    monkeypatch.delenv(semantic_runtime.SEMANTIC_BASE_URL_ENV, raising=False)
    monkeypatch.setattr(
        semantic_runtime, "build_accepted_local_runtime_adapter", fake_builder,
    )
    monkeypatch.setattr(
        factory_service,
        "run_service_scan_once",
        lambda **_kwargs: {
            "schema_version": "test-v1", "status": "idle", "content_free": True,
        },
    )
    result = factory_service._main([
        "run",
        "--to-studio", str(tmp_path / "exchange" / "to"),
        "--from-studio", str(tmp_path / "exchange" / "from"),
        "--state-root", str(tmp_path / "state"),
        "--log-root", str(tmp_path / "logs"),
        "--command-public-key", str(tmp_path / "command-public.pem"),
        "--receipt-private-key", str(tmp_path / "receipt-private.pem"),
        "--host-role", "mac-studio",
        "--semantic-runtime", "accepted-local",
        "--semantic-base-url", "http://127.0.0.1:4000",
        "--semantic-api-key-file", str(credential),
        "--once",
    ])
    assert result == 0
    assert captured["environment"] == {
        semantic_runtime.SEMANTIC_BASE_URL_ENV: "http://127.0.0.1:4000",
        semantic_runtime.SEMANTIC_API_KEY_ENV: TEST_KEY,
    }
    assert semantic_runtime.SEMANTIC_API_KEY_ENV not in os.environ
    assert semantic_runtime.SEMANTIC_BASE_URL_ENV not in os.environ
    assert TEST_KEY not in capsys.readouterr().out


def test_service_missing_process_local_credential_fails_content_free(
    tmp_path, capsys,
):
    result = factory_service._main([
        "run",
        "--to-studio", str(tmp_path / "exchange" / "to"),
        "--from-studio", str(tmp_path / "exchange" / "from"),
        "--state-root", str(tmp_path / "state"),
        "--log-root", str(tmp_path / "logs"),
        "--command-public-key", str(tmp_path / "command-public.pem"),
        "--receipt-private-key", str(tmp_path / "receipt-private.pem"),
        "--host-role", "mac-studio",
        "--semantic-runtime", "accepted-local",
        "--semantic-base-url", "http://127.0.0.1:4000",
        "--once",
    ])
    output = capsys.readouterr().out
    assert result == 1
    assert '"status": "fault"' in output
    assert "master_key" not in output
    assert "semantic-api-key-file" not in output


@pytest.mark.parametrize(
    "value",
    (
        "https://127.0.0.1:4000",
        "http://10.0.0.2:4000",
        "http://user:secret@127.0.0.1:4000",
        "http://127.0.0.1:4000/v1",
    ),
)
def test_semantic_base_url_is_loopback_only(value):
    with pytest.raises(ValueError, match="loopback"):
        semantic_runtime.validate_loopback_semantic_base_url(value)
