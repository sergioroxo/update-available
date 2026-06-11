"""U2 — queue-item + browser-saved snapshot workflow.

A researcher attaches a manually-saved HTML/PDF snapshot to an existing Source
Queue item (for a Cloudflare/challenge/dynamic URL). The package is file-backed
so the Mac Studio worker processes the saved file, but the original source URL +
queue linkage are preserved and S3 import relinks the queue item.

No network / model / Sanity / Supabase. Export never mutates the queue.
"""
from __future__ import annotations

import json
import types
from pathlib import Path

import pytest
from typer.testing import CliRunner

import runner.app as app_mod
from runner import main
from runner.models.document import AnalysisResult
from runner.models.enrichment import EnrichmentResult
from runner.pipeline import source_worker as sw
from runner.pipeline.offload_source import (
    build_snapshot_spec,
    import_ingest_result,
    load_source_manifest,
)
from runner.pipeline.source_queue import QueueItem, add_item, open_db, queue_db_path


# ---------------------------------------------------------------------------
# Config / queue fixtures
# ---------------------------------------------------------------------------

class _CliConfig:
    def __init__(self, base: Path):
        self.corpus_dir = base / "corpus"
        self.exports_dir = base / "exports"
        self.corpus_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)


def _patch_config(monkeypatch, tmp_path) -> _CliConfig:
    cfg = _CliConfig(tmp_path)
    monkeypatch.setattr(main, "load_config", lambda *a, **k: cfg)
    return cfg


def _add_queue_item(cfg, url="https://blocked.example/article", **kw):
    db = open_db(queue_db_path(cfg.corpus_dir))
    try:
        return add_item(db, url=url, title=kw.pop("title", "Blocked article"), **kw)
    finally:
        db.close()


def _queue_snapshot_count(cfg) -> int:
    db = open_db(queue_db_path(cfg.corpus_dir))
    try:
        return db.execute("SELECT COUNT(*) AS n FROM source_queue").fetchone()["n"]
    finally:
        db.close()


def _queue_status(cfg, item_id):
    db = open_db(queue_db_path(cfg.corpus_dir))
    try:
        row = db.execute(
            "SELECT status, corpus_doc_id FROM source_queue WHERE id = ?", (item_id,)
        ).fetchone()
        return (row["status"], row["corpus_doc_id"]) if row else None
    finally:
        db.close()


def _saved_html(tmp_path, name="saved.html") -> Path:
    f = tmp_path / name
    f.write_text("<html><body><p>Researcher-saved article body.</p></body></html>",
                 encoding="utf-8")
    return f


# ---------------------------------------------------------------------------
# build_snapshot_spec — pure helper
# ---------------------------------------------------------------------------

def test_build_snapshot_spec_preserves_url_and_metadata():
    item = QueueItem(
        id="qid7", url="https://blocked.example/a", url_hash="hh",
        title="T", notes="n", priority="high", recommended_llm="litelm",
        overnight_batch_safe=False, tags="tag", doc_type_hint="report",
        suggested_process_route="manual",
    )
    spec = build_snapshot_spec(queue_item=item, snapshot_path="/x/saved.html",
                               declared_source_type="html")
    assert spec.source_kind == "file"
    assert spec.file_path == "/x/saved.html"
    assert spec.url == "https://blocked.example/a"   # ORIGINAL url preserved
    assert spec.queue_item_id == "qid7"
    assert spec.url_hash == "hh"
    assert (spec.title, spec.notes, spec.priority) == ("T", "n", "high")
    assert spec.recommended_llm == "litelm"
    assert spec.overnight_batch_safe is False
    assert (spec.doc_type_hint, spec.suggested_process_route) == ("report", "manual")
    assert spec.declared_source_type == "html"


# ---------------------------------------------------------------------------
# CLI — --queue-snapshot builds a file-backed package, queue untouched
# ---------------------------------------------------------------------------

def test_cli_queue_snapshot_builds_file_backed_package(tmp_path, monkeypatch):
    cfg = _patch_config(monkeypatch, tmp_path)
    item = _add_queue_item(cfg)
    snap = _saved_html(tmp_path)

    result = CliRunner().invoke(
        main.app,
        ["source-offload-export", "--queue-snapshot", f"{item.id}:{snap}",
         "--package-id", "snap-pkg"],
    )
    assert result.exit_code == 0, result.output

    pkg = cfg.exports_dir / "source_offload" / "inbox" / "snap-pkg"
    manifest = load_source_manifest(pkg)
    assert len(manifest.items) == 1
    rec = manifest.items[0]
    assert rec.source_kind == "file"
    assert rec.url == item.url                       # original URL preserved
    assert rec.queue_item_id == item.id
    assert rec.url_hash == item.url_hash
    assert rec.relative_path.endswith("source.html")  # blob copied in

    # source_item.json preserves the original URL + queue IDs.
    item_json = json.loads((pkg / rec.item_record_path).read_text(encoding="utf-8"))
    assert item_json["source_kind"] == "file"
    assert item_json["url"] == item.url
    assert item_json["queue_item_id"] == item.id
    assert item_json["url_hash"] == item.url_hash

    # Export is read-only: queue not mutated.
    assert _queue_status(cfg, item.id) == ("new", "")
    assert _queue_snapshot_count(cfg) == 1


def test_cli_queue_snapshot_missing_file_is_refused(tmp_path, monkeypatch):
    cfg = _patch_config(monkeypatch, tmp_path)
    item = _add_queue_item(cfg)
    result = CliRunner().invoke(
        main.app,
        ["source-offload-export", "--queue-snapshot", f"{item.id}:{tmp_path/'nope.html'}"],
    )
    assert result.exit_code == 1
    assert "not found" in result.output.lower()
    assert not (cfg.exports_dir / "source_offload" / "inbox").exists()


def test_cli_queue_snapshot_bad_mapping_is_refused(tmp_path, monkeypatch):
    cfg = _patch_config(monkeypatch, tmp_path)
    _add_queue_item(cfg)
    result = CliRunner().invoke(
        main.app, ["source-offload-export", "--queue-snapshot", "no-colon-here"],
    )
    assert result.exit_code == 1
    assert "Invalid --queue-snapshot" in result.output


def test_cli_adhoc_file_behavior_unchanged(tmp_path, monkeypatch):
    cfg = _patch_config(monkeypatch, tmp_path)
    snap = _saved_html(tmp_path, "doc.html")
    result = CliRunner().invoke(
        main.app, ["source-offload-export", "--file", str(snap), "--package-id", "file-pkg"],
    )
    assert result.exit_code == 0, result.output
    rec = load_source_manifest(cfg.exports_dir / "source_offload" / "inbox" / "file-pkg").items[0]
    assert rec.source_kind == "file"
    assert rec.url == ""              # ad-hoc file has no queue linkage
    assert rec.queue_item_id == ""


# ---------------------------------------------------------------------------
# Worker receives the file path (not the URL); import relinks the queue item
# ---------------------------------------------------------------------------

def _worker_cfg(live: Path):
    return types.SimpleNamespace(
        corpus_dir=live,
        litelm_analysis_model="core-qwen", litelm_analysis_model_heavy="h",
        litelm_analysis_model_reasoning="r", litelm_enrichment_model="lexicon-llm",
        litelm_embedding_model="research-embedding", embedding_model="emb",
        local_analysis_model="local", wayback_enabled=False, truncation_limit=24000,
    )


def _worker_stubs(seen):
    analysis = AnalysisResult.model_validate({
        "type": "Anti-SOGICE", "format": "Blog-Post", "evidence": ["e"],
        "scope": "Core", "narrative_register": "Legal-Policy", "summary": "s",
    })

    def fake_intake(*, source, tier, batch, config, force_doc_id, source_url):
        seen["source"] = source
        seen["source_url"] = source_url
        d = Path(config.corpus_dir) / force_doc_id
        d.mkdir(parents=True, exist_ok=True)
        (d / "intake.json").write_text(
            json.dumps({"doc_id": force_doc_id, "source": source, "local_copy_path": ""}),
            encoding="utf-8")
        # A file item copies the blob in; mirror that the worker passes the blob path.
        local_copy = ""
        if not source.startswith(("http://", "https://")):
            local_copy = str(Path(source))
        return types.SimpleNamespace(
            doc_id=force_doc_id, source=source, source_type="html",
            local_dir=d, local_copy_path=local_copy)

    def fake_preprocess(intake, *, config):
        d = Path(intake.local_dir)
        (d / "extracted.txt").write_text("text " + intake.doc_id, encoding="utf-8")
        (d / "preprocess.json").write_text(
            json.dumps({"doc_id": intake.doc_id, "quality": "high"}), encoding="utf-8")
        return types.SimpleNamespace(doc_id=intake.doc_id, text="text " + intake.doc_id)

    return dict(
        intake_fn=fake_intake, preprocess_fn=fake_preprocess,
        analyze_fn=lambda preprocess, **kw: analysis,
        enrich_fn=lambda doc_id, preprocess, analysis_, **kw: EnrichmentResult(doc_id=doc_id),
        embed_fn=lambda text, config: [0.1, 0.2, 0.3],
        unload_analysis_fn=lambda c, l: True,
        unload_enrichment_fn=lambda c, a: True,
        unload_embedding_fn=lambda c: True,
    )


def test_worker_receives_file_path_and_import_relinks(tmp_path, monkeypatch):
    cfg = _patch_config(monkeypatch, tmp_path)
    item = _add_queue_item(cfg)
    snap = _saved_html(tmp_path)
    assert CliRunner().invoke(
        main.app,
        ["source-offload-export", "--queue-snapshot", f"{item.id}:{snap}",
         "--package-id", "snap-w"],
    ).exit_code == 0

    root = cfg.exports_dir / "source_offload"
    inbox = root / "inbox" / "snap-w"
    seen: dict = {}
    summary = sw.run_source_worker(inbox, _worker_cfg(tmp_path / "live"), **_worker_stubs(seen))
    assert summary["final_state"] == "outbox", summary["errors"]

    # Worker processed the saved FILE blob, not the blocked URL — but kept the
    # original source URL as provenance.
    assert seen["source"].endswith("source.html")
    assert not seen["source"].startswith("http")
    assert seen["source_url"] == item.url

    # S3 import relinks the original queue item.
    outbox = root / "outbox" / "snap-w"
    res = CliRunner().invoke(main.app, ["source-offload-import", str(outbox)])
    assert res.exit_code == 0, res.output
    status, corpus_doc_id = _queue_status(cfg, item.id)
    assert status == "ingested"
    assert corpus_doc_id  # relinked to the imported doc


# ---------------------------------------------------------------------------
# Streamlit helpers — selection → specs (mixed url + snapshot)
# ---------------------------------------------------------------------------

def test_selection_specs_mix_url_and_snapshot(tmp_path):
    snap = _saved_html(tmp_path)
    a = QueueItem(id="a", url="https://ok.example/a", url_hash="ha")
    b = QueueItem(id="b", url="https://blocked.example/b", url_hash="hb")
    specs = app_mod._source_specs_from_selection([a, b], {"b": str(snap)})
    by_qid = {s.queue_item_id: s for s in specs}
    assert by_qid["a"].source_kind == "url"
    assert by_qid["b"].source_kind == "file"
    assert by_qid["b"].url == "https://blocked.example/b"   # original preserved
    assert by_qid["b"].file_path == str(snap)


def test_selection_specs_blank_snapshot_is_url(tmp_path):
    a = QueueItem(id="a", url="https://ok.example/a", url_hash="ha")
    specs = app_mod._source_specs_from_selection([a], {"a": "   "})
    assert specs[0].source_kind == "url"


def test_snapshot_spec_helper_rejects_missing_file(tmp_path):
    a = QueueItem(id="a", url="https://x.example/a", url_hash="ha")
    with pytest.raises(ValueError, match="not found"):
        app_mod._source_snapshot_spec(a, str(tmp_path / "missing.html"))
