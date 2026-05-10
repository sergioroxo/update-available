import pytest

from runner.config import load_config


SERVICE_ENV = [
    "SANITY_PROJECT_ID",
    "SANITY_DATASET",
    "SANITY_WRITE_TOKEN",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
]


def test_load_config_can_skip_service_credentials_for_local_commands(monkeypatch, tmp_path):
    for key in SERVICE_ENV:
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("CORPUS_DIR", str(tmp_path / "corpus"))
    monkeypatch.setenv("EXPORTS_DIR", str(tmp_path / "exports"))

    config = load_config(require_services=False)

    assert config.sanity_project_id == ""
    assert config.supabase_url == ""
    assert config.corpus_dir == tmp_path / "corpus"


def test_load_config_requires_service_credentials_by_default(monkeypatch, tmp_path):
    for key in SERVICE_ENV:
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("CORPUS_DIR", str(tmp_path / "corpus"))
    monkeypatch.setenv("EXPORTS_DIR", str(tmp_path / "exports"))

    with pytest.raises(EnvironmentError, match="SANITY_PROJECT_ID"):
        load_config()
