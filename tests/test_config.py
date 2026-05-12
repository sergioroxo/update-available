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


def test_config_repr_redacts_credentials(monkeypatch, tmp_path):
    monkeypatch.setenv("SANITY_PROJECT_ID", "project")
    monkeypatch.setenv("SANITY_DATASET", "dataset")
    monkeypatch.setenv("SANITY_WRITE_TOKEN", "sanity-secret-token")
    monkeypatch.setenv("SUPABASE_URL", "https://supabase.example")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "supabase-secret-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "anthropic-secret-key")
    monkeypatch.setenv("LITELM_API_KEY", "litelm-secret-key")
    monkeypatch.setenv("CORPUS_DIR", str(tmp_path / "corpus"))
    monkeypatch.setenv("EXPORTS_DIR", str(tmp_path / "exports"))

    display = repr(load_config())

    assert "project" in display
    assert "dataset" in display
    assert "sanity-secret-token" not in display
    assert "supabase-secret-key" not in display
    assert "anthropic-secret-key" not in display
    assert "litelm-secret-key" not in display


def test_load_config_reads_optional_sanity_read_token(monkeypatch, tmp_path):
    for key in SERVICE_ENV:
        monkeypatch.setenv(key, f"value-{key.lower()}")
    monkeypatch.setenv("SANITY_READ_TOKEN", "sanity-read-only-token")
    monkeypatch.setenv("CORPUS_DIR", str(tmp_path / "corpus"))
    monkeypatch.setenv("EXPORTS_DIR", str(tmp_path / "exports"))

    config = load_config()

    assert config.sanity_read_token == "sanity-read-only-token"
