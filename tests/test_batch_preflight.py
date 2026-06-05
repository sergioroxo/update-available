"""TASK F Slice 3 — batch_preflight() pre-flight checks.

Unit tests for batch_preflight() (no CLI, no network) and CLI integration
tests that confirm batch-run --execute is blocked by preflight failures.

Covers:
  batch_preflight() unit tests:
    - All checks pass when creds are present and no litelm items
    - Missing SANITY_PROJECT_ID → sanity_credentials fails
    - Missing SANITY_DATASET → sanity_credentials fails
    - Missing SANITY_WRITE_TOKEN → sanity_credentials fails
    - Missing SUPABASE_URL → supabase_credentials fails
    - Missing SUPABASE_SERVICE_KEY → supabase_credentials fails
    - Placeholder Supabase URL → supabase_credentials fails
    - litelm items + no LITELM_BASE_URL → litelm_endpoint fails
    - litelm items + probe returns OK → litelm_endpoint passes
    - litelm items + probe returns HEALTH_SLOW → litelm_endpoint passes
    - litelm items + probe returns NETWORK_UNREACHABLE → litelm_endpoint fails
    - local-only items → no litelm_endpoint check in results
    - empty manifest → no litelm_endpoint check in results
    - ledger dir writable → passes
    - result check names are stable snake_case strings

  CLI integration tests:
    - batch-run --execute blocked when sanity creds missing
    - batch-run --execute --skip-preflight bypasses checks, calls ingest
    - batch-run without --execute skips preflight entirely (rehearsal ok)
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from types import SimpleNamespace

import pytest
from typer.testing import CliRunner

from runner import main
from runner.pipeline.batch import (
    BatchManifest,
    ManifestItem,
    PreflightResult,
    _cred_ok,
    _needs_litelm,
    _probe_ollama_unload_endpoint,
    _probe_model_control_endpoint,
    batch_preflight,
)
from runner.pipeline.diagnostics import DiagnosticResult, ErrorKind
from runner.pipeline.source_queue import (
    add_item,
    apply_triage_result,
    get_item,
    open_db,
    queue_db_path,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _manifest_with_items(*recommended_llms: str) -> BatchManifest:
    """A BatchManifest whose included items have the given recommended_llm values."""
    items = [
        ManifestItem(
            item_id=f"item-{i}",
            url=f"https://example.org/{i}",
            status="triaged",
            priority="low",
            batch_group="",
            recommended_llm=llm,
            doc_type_hint="news",
            included=True,
            exclusion_reason="",
        )
        for i, llm in enumerate(recommended_llms)
    ]
    return BatchManifest(
        generated_at="2026-01-01T00:00:00+00:00",
        batch_group_filter="",
        priority_filter="",
        limit=10,
        total_candidates=len(items),
        included=items,
    )


def _empty_manifest() -> BatchManifest:
    return BatchManifest(
        generated_at="2026-01-01T00:00:00+00:00",
        batch_group_filter="",
        priority_filter="",
        limit=10,
        total_candidates=0,
    )


def _make_config(tmp_path: Path, **overrides) -> SimpleNamespace:
    """SimpleNamespace config with all-good defaults; use overrides to inject bad values."""
    defaults = dict(
        sanity_project_id="proj-abc123",
        sanity_dataset="production",
        sanity_write_token="tok-abc123",
        supabase_url="https://xxx.supabase.co",
        supabase_service_key="service-key-abc",
        litelm_base_url="",
        litelm_api_key="",
        litelm_ollama_base_url="",
        mac_studio_model_control_url="",
        mac_studio_model_control_token="",
        corpus_dir=tmp_path / "corpus",
        exports_dir=tmp_path / "exports",
    )
    defaults.update(overrides)
    cfg = SimpleNamespace(**defaults)
    Path(cfg.corpus_dir).mkdir(parents=True, exist_ok=True)
    Path(cfg.exports_dir).mkdir(parents=True, exist_ok=True)
    return cfg


def _ok_dr() -> DiagnosticResult:
    return DiagnosticResult(ErrorKind.OK, "Reachable — HTTP 200")


def _slow_dr() -> DiagnosticResult:
    return DiagnosticResult(
        ErrorKind.HEALTH_SLOW,
        "Reachable — /health timed out (LiteLLM cold-start model ping)",
        "Cold model.",
    )


def _unreachable_dr() -> DiagnosticResult:
    return DiagnosticResult(
        ErrorKind.NETWORK_UNREACHABLE,
        "Cannot reach host — connection refused or timed out",
        "Mac Studio offline.",
    )


# ---------------------------------------------------------------------------
# _cred_ok() helper tests
# ---------------------------------------------------------------------------

def test_cred_ok_empty_string():
    assert not _cred_ok("")


def test_cred_ok_placeholder_supabase():
    assert not _cred_ok("https://<project>.supabase.co")


def test_cred_ok_placeholder_litelm_key():
    assert not _cred_ok("sk-local-research-key-change-this")


def test_cred_ok_real_value():
    assert _cred_ok("real-token-abc")


# ---------------------------------------------------------------------------
# _needs_litelm() helper tests
# ---------------------------------------------------------------------------

def test_needs_litelm_with_litelm_items():
    m = _manifest_with_items("litelm")
    assert _needs_litelm(m) is True


def test_needs_litelm_with_litelm_heavy():
    m = _manifest_with_items("litelm-heavy")
    assert _needs_litelm(m) is True


def test_needs_litelm_with_empty_recommended_llm():
    # empty recommended_llm falls back to "litelm" in the execute loop
    m = _manifest_with_items("")
    assert _needs_litelm(m) is True


def test_needs_litelm_with_local_items():
    m = _manifest_with_items("local", "local-heavy")
    assert _needs_litelm(m) is False


def test_needs_litelm_with_empty_manifest():
    assert _needs_litelm(_empty_manifest()) is False


def test_needs_litelm_mixed_local_and_litelm():
    m = _manifest_with_items("local", "litelm")
    assert _needs_litelm(m) is True


# ---------------------------------------------------------------------------
# batch_preflight() unit tests — credential checks (no network)
# ---------------------------------------------------------------------------

def test_preflight_all_ok_no_litelm_items(tmp_path):
    cfg = _make_config(tmp_path)
    manifest = _manifest_with_items("local")
    ledger_dir = tmp_path / "ledgers"
    results = batch_preflight(cfg, manifest, ledger_dir=ledger_dir)

    checks = {r.check for r in results}
    assert "sanity_credentials" in checks
    assert "supabase_credentials" in checks
    assert "ledger_dir_writable" in checks
    assert "litelm_endpoint" not in checks  # no litelm items → skip probe
    assert all(r.ok for r in results)


def test_preflight_missing_sanity_project_id(tmp_path):
    cfg = _make_config(tmp_path, sanity_project_id="")
    results = batch_preflight(cfg, _empty_manifest(), ledger_dir=tmp_path / "ledgers")
    sanity = next(r for r in results if r.check == "sanity_credentials")
    assert not sanity.ok
    assert "SANITY_PROJECT_ID" in sanity.message


def test_preflight_missing_sanity_dataset(tmp_path):
    cfg = _make_config(tmp_path, sanity_dataset="")
    results = batch_preflight(cfg, _empty_manifest(), ledger_dir=tmp_path / "ledgers")
    sanity = next(r for r in results if r.check == "sanity_credentials")
    assert not sanity.ok
    assert "SANITY_DATASET" in sanity.message


def test_preflight_missing_sanity_write_token(tmp_path):
    cfg = _make_config(tmp_path, sanity_write_token="")
    results = batch_preflight(cfg, _empty_manifest(), ledger_dir=tmp_path / "ledgers")
    sanity = next(r for r in results if r.check == "sanity_credentials")
    assert not sanity.ok
    assert "SANITY_WRITE_TOKEN" in sanity.message


def test_preflight_both_sanity_missing_reported_together(tmp_path):
    cfg = _make_config(tmp_path, sanity_project_id="", sanity_write_token="")
    results = batch_preflight(cfg, _empty_manifest(), ledger_dir=tmp_path / "ledgers")
    sanity = next(r for r in results if r.check == "sanity_credentials")
    assert not sanity.ok
    assert "SANITY_PROJECT_ID" in sanity.message
    assert "SANITY_WRITE_TOKEN" in sanity.message


def test_preflight_missing_supabase_url(tmp_path):
    cfg = _make_config(tmp_path, supabase_url="")
    results = batch_preflight(cfg, _empty_manifest(), ledger_dir=tmp_path / "ledgers")
    supa = next(r for r in results if r.check == "supabase_credentials")
    assert not supa.ok
    assert "SUPABASE_URL" in supa.message


def test_preflight_missing_supabase_service_key(tmp_path):
    cfg = _make_config(tmp_path, supabase_service_key="")
    results = batch_preflight(cfg, _empty_manifest(), ledger_dir=tmp_path / "ledgers")
    supa = next(r for r in results if r.check == "supabase_credentials")
    assert not supa.ok
    assert "SUPABASE_SERVICE_KEY" in supa.message


def test_preflight_placeholder_supabase_url_fails(tmp_path):
    cfg = _make_config(tmp_path, supabase_url="https://<project>.supabase.co")
    results = batch_preflight(cfg, _empty_manifest(), ledger_dir=tmp_path / "ledgers")
    supa = next(r for r in results if r.check == "supabase_credentials")
    assert not supa.ok


def test_preflight_all_checks_run_even_after_sanity_failure(tmp_path):
    """All 3 checks must appear in results even when sanity_credentials fails."""
    cfg = _make_config(tmp_path, sanity_project_id="")
    manifest = _manifest_with_items("local")
    results = batch_preflight(cfg, manifest, ledger_dir=tmp_path / "ledgers")
    checks = [r.check for r in results]
    assert "sanity_credentials" in checks
    assert "supabase_credentials" in checks
    assert "ledger_dir_writable" in checks


# ---------------------------------------------------------------------------
# batch_preflight() unit tests — LiteLLM endpoint checks
# ---------------------------------------------------------------------------

def test_preflight_litelm_items_no_base_url(tmp_path):
    cfg = _make_config(tmp_path, litelm_base_url="")  # not configured
    manifest = _manifest_with_items("litelm")
    results = batch_preflight(cfg, manifest, ledger_dir=tmp_path / "ledgers")
    litelm = next(r for r in results if r.check == "litelm_endpoint")
    assert not litelm.ok
    assert "LITELM_BASE_URL" in litelm.message


def test_preflight_litelm_probe_ok(monkeypatch, tmp_path):
    cfg = _make_config(
        tmp_path,
        litelm_base_url="http://mac-studio:4000",
        litelm_ollama_base_url="http://mac-studio:11434",
    )
    monkeypatch.setattr("runner.pipeline.batch._probe_health", lambda *a, **kw: _ok_dr())
    monkeypatch.setattr(
        "runner.pipeline.batch._probe_ollama_unload_endpoint",
        lambda *a, **kw: PreflightResult("litelm_ollama_unload", True, "ok"),
    )
    manifest = _manifest_with_items("litelm")
    results = batch_preflight(cfg, manifest, ledger_dir=tmp_path / "ledgers")
    litelm = next(r for r in results if r.check == "litelm_endpoint")
    assert litelm.ok
    assert "http://mac-studio:4000" in litelm.message
    unload = next(r for r in results if r.check == "litelm_ollama_unload")
    assert unload.ok


def test_preflight_litelm_probe_health_slow_passes(monkeypatch, tmp_path):
    """HEALTH_SLOW = cold model ping; service is reachable — must not block."""
    cfg = _make_config(
        tmp_path,
        litelm_base_url="http://mac-studio:4000",
        litelm_ollama_base_url="http://mac-studio:11434",
    )
    monkeypatch.setattr("runner.pipeline.batch._probe_health", lambda *a, **kw: _slow_dr())
    monkeypatch.setattr(
        "runner.pipeline.batch._probe_ollama_unload_endpoint",
        lambda *a, **kw: PreflightResult("litelm_ollama_unload", True, "ok"),
    )
    manifest = _manifest_with_items("litelm")
    results = batch_preflight(cfg, manifest, ledger_dir=tmp_path / "ledgers")
    litelm = next(r for r in results if r.check == "litelm_endpoint")
    assert litelm.ok
    assert "cold model ping" in litelm.detail.lower() or "cold" in litelm.detail.lower()


def test_preflight_litelm_probe_unreachable_fails(monkeypatch, tmp_path):
    cfg = _make_config(
        tmp_path,
        litelm_base_url="http://mac-studio:4000",
        litelm_ollama_base_url="http://mac-studio:11434",
    )
    monkeypatch.setattr("runner.pipeline.batch._probe_health", lambda *a, **kw: _unreachable_dr())
    monkeypatch.setattr(
        "runner.pipeline.batch._probe_ollama_unload_endpoint",
        lambda *a, **kw: PreflightResult("litelm_ollama_unload", True, "ok"),
    )
    manifest = _manifest_with_items("litelm")
    results = batch_preflight(cfg, manifest, ledger_dir=tmp_path / "ledgers")
    litelm = next(r for r in results if r.check == "litelm_endpoint")
    assert not litelm.ok
    assert "not reachable" in litelm.message.lower() or "unreachable" in litelm.message.lower()
    assert "Mac Studio offline" in litelm.detail


def test_preflight_litelm_requires_ollama_unload_endpoint(monkeypatch, tmp_path):
    cfg = _make_config(tmp_path, litelm_base_url="http://mac-studio:4000")
    monkeypatch.setattr("runner.pipeline.batch._probe_health", lambda *a, **kw: _ok_dr())

    results = batch_preflight(cfg, _manifest_with_items("litelm"), ledger_dir=tmp_path / "ledgers")

    unload = next(r for r in results if r.check == "litelm_ollama_unload")
    assert not unload.ok
    assert "not configured" in unload.message


def test_probe_ollama_unload_endpoint_missing_base_url():
    result = _probe_ollama_unload_endpoint("")

    assert result.check == "litelm_ollama_unload"
    assert not result.ok
    assert "not configured" in result.message


def test_probe_model_control_endpoint_missing_base_url():
    result = _probe_model_control_endpoint("")

    assert result.check == "litelm_model_control"
    assert not result.ok
    assert "not configured" in result.message


def test_preflight_prefers_model_control_endpoint(monkeypatch, tmp_path):
    cfg = _make_config(
        tmp_path,
        litelm_base_url="http://mac-studio:4000",
        mac_studio_model_control_url="https://mac-studio:11555",
        mac_studio_model_control_token="secret",
    )
    monkeypatch.setattr("runner.pipeline.batch._probe_health", lambda *a, **kw: _ok_dr())
    direct_called = []
    monkeypatch.setattr(
        "runner.pipeline.batch._probe_ollama_unload_endpoint",
        lambda *a, **kw: direct_called.append(1) or PreflightResult("litelm_ollama_unload", False, "bad"),
    )
    monkeypatch.setattr(
        "runner.pipeline.batch._probe_model_control_endpoint",
        lambda url, **kw: PreflightResult("litelm_model_control", True, f"ok {url}"),
    )

    results = batch_preflight(cfg, _manifest_with_items("litelm"), ledger_dir=tmp_path / "ledgers")

    assert direct_called == []
    helper = next(r for r in results if r.check == "litelm_model_control")
    assert helper.ok


def test_preflight_local_items_no_probe_performed(monkeypatch, tmp_path):
    """local-only items — litelm_endpoint check must be absent from results."""
    probe_called = []
    unload_called = []
    monkeypatch.setattr(
        "runner.pipeline.batch._probe_health",
        lambda *a, **kw: probe_called.append(1) or _ok_dr(),
    )
    monkeypatch.setattr(
        "runner.pipeline.batch._probe_ollama_unload_endpoint",
        lambda *a, **kw: unload_called.append(1) or PreflightResult("litelm_ollama_unload", True, "ok"),
    )
    cfg = _make_config(tmp_path)
    manifest = _manifest_with_items("local", "local-heavy")
    results = batch_preflight(cfg, manifest, ledger_dir=tmp_path / "ledgers")
    assert probe_called == []
    assert unload_called == []
    assert not any(r.check == "litelm_endpoint" for r in results)
    assert not any(r.check == "litelm_ollama_unload" for r in results)


# ---------------------------------------------------------------------------
# batch_preflight() unit tests — ledger directory
# ---------------------------------------------------------------------------

def test_preflight_ledger_dir_created_and_writable(tmp_path):
    cfg = _make_config(tmp_path)
    ledger_dir = tmp_path / "new_subdir" / "ledgers"
    assert not ledger_dir.exists()
    results = batch_preflight(cfg, _empty_manifest(), ledger_dir=ledger_dir)
    ledger = next(r for r in results if r.check == "ledger_dir_writable")
    assert ledger.ok
    assert ledger_dir.exists()
    # No stale test file left behind
    assert not (ledger_dir / ".preflight_write_test").exists()


def test_preflight_result_check_names_are_stable(tmp_path):
    """check names must be stable snake_case strings used as stop_reason keys."""
    cfg = _make_config(tmp_path)
    results = batch_preflight(cfg, _empty_manifest(), ledger_dir=tmp_path / "l")
    for r in results:
        assert r.check == r.check.lower()
        assert " " not in r.check


# ---------------------------------------------------------------------------
# CLI integration tests — batch-run command
# ---------------------------------------------------------------------------

class _CliConfigFull:
    """Config-like object returned by monkeypatched load_config."""
    def __init__(self, base: Path, **cred_overrides):
        self.corpus_dir = base / "corpus"
        self.exports_dir = base / "exports"
        self.corpus_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)
        self.sanity_project_id  = cred_overrides.get("sanity_project_id",  "proj-123")
        self.sanity_dataset     = cred_overrides.get("sanity_dataset",     "production")
        self.sanity_write_token = cred_overrides.get("sanity_write_token",  "tok-123")
        self.supabase_url       = cred_overrides.get("supabase_url",        "https://xxx.supabase.co")
        self.supabase_service_key = cred_overrides.get("supabase_service_key", "key-123")
        self.litelm_base_url    = cred_overrides.get("litelm_base_url",    "")
        self.litelm_api_key     = cred_overrides.get("litelm_api_key",     "")


def _patch_full_config(monkeypatch, tmp_path: Path, **cred_overrides) -> _CliConfigFull:
    cfg = _CliConfigFull(tmp_path, **cred_overrides)
    monkeypatch.setattr(main, "load_config", lambda *args, **kwargs: cfg)
    return cfg


def _safe_triage(**kwargs):
    """Minimal triage result that marks an item as batch-safe."""
    from types import SimpleNamespace
    defaults = dict(
        doc_type_hint="promotional",
        recommended_llm="litelm",
        routing_reason="ok",
        complexity="simple",
        needs_book_splitting=False,
        needs_testimony_review=False,
        needs_media_review=False,
        needs_legal_review=False,
        overnight_batch_safe=True,
        suggested_process_route="standard",
        triage_succeeded=True,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def _add_safe_item(db: sqlite3.Connection, url: str) -> object:
    item = add_item(db, url)
    apply_triage_result(db, item.id, _safe_triage(), model_name="litelm/triage")
    return get_item(db, item.id)


def test_batch_run_execute_preflight_missing_sanity_blocks_ingest(monkeypatch, tmp_path):
    """Missing SANITY_WRITE_TOKEN → preflight fail → ingest not called, exit 1."""
    cfg = _patch_full_config(monkeypatch, tmp_path, sanity_write_token="")
    db = open_db(queue_db_path(cfg.corpus_dir))
    _add_safe_item(db, "https://example.org/doc")

    ingest_calls = []
    monkeypatch.setattr(main, "ingest", lambda *a, **kw: ingest_calls.append((a, kw)))

    result = CliRunner().invoke(
        main.app,
        ["batch-run", "--execute", "--out-dir", str(tmp_path / "ledgers")],
    )

    assert result.exit_code == 1
    assert ingest_calls == []

    ledgers = list((tmp_path / "ledgers").glob("*_ledger.json"))
    assert len(ledgers) == 1
    data = json.loads(ledgers[0].read_text(encoding="utf-8"))
    assert data["completed"] is False
    assert data["stop_reason"].startswith("preflight_failed:sanity_credentials")


def test_batch_run_execute_preflight_missing_supabase_blocks_ingest(monkeypatch, tmp_path):
    """Missing SUPABASE_URL → preflight fail → exit 1, ledger written."""
    cfg = _patch_full_config(monkeypatch, tmp_path, supabase_url="")
    db = open_db(queue_db_path(cfg.corpus_dir))
    _add_safe_item(db, "https://example.org/doc2")

    monkeypatch.setattr(main, "ingest", lambda *a, **kw: (_ for _ in ()).throw(AssertionError("ingest must not be called")))

    result = CliRunner().invoke(
        main.app,
        ["batch-run", "--execute", "--out-dir", str(tmp_path / "ledgers")],
    )
    assert result.exit_code == 1
    data = json.loads(next((tmp_path / "ledgers").glob("*_ledger.json")).read_text())
    # First failing check is sanity_credentials (checked before supabase)
    assert data["stop_reason"].startswith("preflight_failed:")


def test_batch_run_execute_skip_preflight_bypasses_bad_creds(monkeypatch, tmp_path):
    """--skip-preflight + missing creds → ingest IS called (preflight skipped)."""
    cfg = _patch_full_config(monkeypatch, tmp_path, sanity_write_token="")
    db = open_db(queue_db_path(cfg.corpus_dir))
    _add_safe_item(db, "https://example.org/skip")

    ingest_calls = []

    def fake_ingest(*args, **kwargs):
        ingest_calls.append((args, kwargs))
        return "doc-skip"

    monkeypatch.setattr(main, "ingest", fake_ingest)

    result = CliRunner().invoke(
        main.app,
        ["batch-run", "--execute", "--skip-preflight", "--out-dir", str(tmp_path / "ledgers")],
    )

    assert result.exit_code == 0
    assert len(ingest_calls) == 1, "ingest must have been called despite bad creds"


def test_batch_run_rehearsal_skips_preflight_despite_bad_creds(monkeypatch, tmp_path):
    """Rehearsal mode (no --execute) must not run preflight — bad creds are fine."""
    cfg = _patch_full_config(monkeypatch, tmp_path, sanity_write_token="", supabase_url="")
    db = open_db(queue_db_path(cfg.corpus_dir))
    _add_safe_item(db, "https://example.org/rehearsal")

    result = CliRunner().invoke(
        main.app,
        ["batch-run", "--out-dir", str(tmp_path / "ledgers")],
    )

    assert result.exit_code == 0
    assert "Rehearsal only" in result.stdout
    data = json.loads(next((tmp_path / "ledgers").glob("*_ledger.json")).read_text())
    assert data["execute"] is False
    assert data["stop_reason"] == "execute flag not provided"
