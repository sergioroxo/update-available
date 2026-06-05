"""Offload CLI tests: `offload-export` and read-only `offload-verify`.

All tests are local-only:
  - no network, no Sanity/Supabase, no LLM/Ollama/LiteLLM
  - no source_queue.db is touched
  - offload-verify never mutates the package

offload-export uses load_config(require_services=False); offload-verify needs no
config at all (it reads an explicit package directory).
"""
from __future__ import annotations

import json
from pathlib import Path

from typer.testing import CliRunner

from runner import main
from runner.pipeline.offload import build_analysis_package


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

class _CliConfig:
    def __init__(self, base: Path):
        self.corpus_dir = base / "corpus"
        self.exports_dir = base / "exports"
        self.corpus_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _make_doc(corpus_dir: Path, doc_id: str = "abc123") -> Path:
    doc_dir = corpus_dir / doc_id
    doc_dir.mkdir(parents=True)
    _write_json(doc_dir / "intake.json", {"doc_id": doc_id, "source": "https://example.org/doc", "source_type": "url"})
    _write_json(doc_dir / "preprocess.json", {"doc_id": doc_id, "quality": "high", "tool_used": "trafilatura", "ocr_images": []})
    (doc_dir / "extracted.txt").write_text("Extracted source text", encoding="utf-8")
    _write_json(doc_dir / "wayback.json", {"status": "existing"})
    return doc_dir


def _patch_config(monkeypatch, tmp_path: Path) -> _CliConfig:
    cfg = _CliConfig(tmp_path)
    monkeypatch.setattr(main, "load_config", lambda *args, **kwargs: cfg)
    return cfg


# ---------------------------------------------------------------------------
# offload-export
# ---------------------------------------------------------------------------

def test_offload_export_writes_package_under_default_root(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    _make_doc(cfg.corpus_dir, "abc123")

    result = CliRunner().invoke(main.app, ["offload-export", "abc123", "--package-id", "pkg-1"])

    assert result.exit_code == 0, result.stdout
    package_dir = cfg.exports_dir / "offload" / "inbox" / "pkg-1"
    assert (package_dir / "offload_manifest.json").exists()
    assert (package_dir / "docs" / "abc123" / "intake.json").exists()
    assert (package_dir / "docs" / "abc123" / "extracted.txt").exists()
    assert "pkg-1" in result.stdout


def test_offload_export_respects_offload_root_override(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    _make_doc(cfg.corpus_dir, "abc123")
    custom_root = tmp_path / "elsewhere" / "offload"

    result = CliRunner().invoke(
        main.app,
        ["offload-export", "abc123", "--package-id", "pkg-2", "--offload-root", str(custom_root)],
    )

    assert result.exit_code == 0, result.stdout
    assert (custom_root / "inbox" / "pkg-2" / "offload_manifest.json").exists()
    # Default root must NOT be used when override is provided.
    assert not (cfg.exports_dir / "offload" / "inbox" / "pkg-2").exists()


def test_offload_export_accepts_multiple_doc_ids(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    _make_doc(cfg.corpus_dir, "doca")
    _make_doc(cfg.corpus_dir, "docb")

    result = CliRunner().invoke(main.app, ["offload-export", "doca", "docb", "--package-id", "pkg-multi"])

    assert result.exit_code == 0, result.stdout
    package_dir = cfg.exports_dir / "offload" / "inbox" / "pkg-multi"
    assert (package_dir / "docs" / "doca" / "intake.json").exists()
    assert (package_dir / "docs" / "docb" / "intake.json").exists()


def test_offload_export_refuses_unsafe_doc_id_and_leaves_no_package(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    _make_doc(cfg.corpus_dir, "abc123")

    result = CliRunner().invoke(
        main.app, ["offload-export", "../secret", "--package-id", "pkg-unsafe"]
    )

    assert result.exit_code == 1
    assert "refused" in result.stdout.lower()
    assert not (cfg.exports_dir / "offload" / "inbox" / "pkg-unsafe").exists()


def test_offload_export_refuses_missing_required_artifacts(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    # Doc dir exists with only intake.json — preprocess + extracted text missing.
    bad = cfg.corpus_dir / "bad"
    bad.mkdir(parents=True)
    _write_json(bad / "intake.json", {"doc_id": "bad"})

    result = CliRunner().invoke(main.app, ["offload-export", "bad", "--package-id", "pkg-bad"])

    assert result.exit_code == 1
    assert not (cfg.exports_dir / "offload" / "inbox" / "pkg-bad").exists()


def test_offload_export_does_not_require_services(monkeypatch, tmp_path):
    cfg = _CliConfig(tmp_path)
    _make_doc(cfg.corpus_dir, "abc123")
    captured: dict = {}

    def fake_load_config(*args, **kwargs):
        captured.update(kwargs)
        return cfg

    monkeypatch.setattr(main, "load_config", fake_load_config)

    result = CliRunner().invoke(main.app, ["offload-export", "abc123", "--package-id", "pkg-svc"])

    assert result.exit_code == 0, result.stdout
    assert captured.get("require_services") is False


# ---------------------------------------------------------------------------
# offload-verify (read-only)
# ---------------------------------------------------------------------------

def _build_package(tmp_path: Path, package_id: str = "pkg-v") -> Path:
    corpus_dir = tmp_path / "corpus"
    _make_doc(corpus_dir, "abc123")
    build_analysis_package(
        corpus_dir=corpus_dir,
        doc_ids=["abc123"],
        offload_root=tmp_path / "offload",
        package_id=package_id,
    )
    return tmp_path / "offload" / "inbox" / package_id


def test_offload_verify_passes_on_clean_package(tmp_path):
    package_dir = _build_package(tmp_path)

    result = CliRunner().invoke(main.app, ["offload-verify", str(package_dir)])

    assert result.exit_code == 0, result.stdout
    assert "verified" in result.stdout.lower()


def test_offload_verify_fails_on_missing_artifact(tmp_path):
    package_dir = _build_package(tmp_path)
    (package_dir / "docs" / "abc123" / "wayback.json").unlink()

    result = CliRunner().invoke(main.app, ["offload-verify", str(package_dir)])

    assert result.exit_code == 1
    assert "missing" in result.stdout.lower()


def test_offload_verify_fails_on_hash_mismatch(tmp_path):
    package_dir = _build_package(tmp_path)
    # Tamper with an artifact after the manifest hash was recorded.
    (package_dir / "docs" / "abc123" / "extracted.txt").write_text("TAMPERED", encoding="utf-8")

    result = CliRunner().invoke(main.app, ["offload-verify", str(package_dir)])

    assert result.exit_code == 1
    assert "mismatch" in result.stdout.lower()


def test_offload_verify_reports_lifecycle_mismatch(tmp_path):
    package_dir = _build_package(tmp_path, package_id="pkg-life")
    # Simulate an interrupted move: folder is in processing/ but manifest still says inbox.
    moved = tmp_path / "offload" / "processing" / "pkg-life"
    moved.parent.mkdir(parents=True, exist_ok=True)
    package_dir.rename(moved)

    result = CliRunner().invoke(main.app, ["offload-verify", str(moved)])

    assert result.exit_code == 1
    assert "mismatch" in result.stdout.lower()


def test_offload_verify_fails_on_corrupt_manifest(tmp_path):
    package_dir = _build_package(tmp_path, package_id="pkg-corrupt")
    (package_dir / "offload_manifest.json").write_text("{not json", encoding="utf-8")

    result = CliRunner().invoke(main.app, ["offload-verify", str(package_dir)])

    assert result.exit_code == 1
    assert "error" in result.stdout.lower() or "corrupt" in result.stdout.lower()


def test_offload_verify_is_read_only(tmp_path):
    package_dir = _build_package(tmp_path, package_id="pkg-ro")
    before = {p.name: p.read_bytes() for p in (package_dir / "docs" / "abc123").iterdir()}
    manifest_before = (package_dir / "offload_manifest.json").read_bytes()

    result = CliRunner().invoke(main.app, ["offload-verify", str(package_dir)])

    assert result.exit_code == 0, result.stdout
    after = {p.name: p.read_bytes() for p in (package_dir / "docs" / "abc123").iterdir()}
    assert before == after
    assert (package_dir / "offload_manifest.json").read_bytes() == manifest_before
    # No package moved to another lifecycle folder.
    assert package_dir.exists()
    assert not (tmp_path / "offload" / "processing" / "pkg-ro").exists()
