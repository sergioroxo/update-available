"""Source import (Slice S3) tests — verify + import of ingest_result packages.

All local-only with stubbed pipeline functions: no network, no model calls, no
Sanity/Supabase. Outbox packages are produced by running the S2 worker with
stubs, then imported into a throwaway corpus.
"""
from __future__ import annotations

import json
import types
from pathlib import Path

import pytest
from typer.testing import CliRunner

from runner import main
from runner.models.document import AnalysisResult
from runner.models.enrichment import EnrichmentResult
from runner.pipeline import offload_source
from runner.pipeline import source_worker as sw
from runner.pipeline.offload_source import (
    SourceItemSpec,
    build_source_package,
    import_ingest_result,
    ingest_result_linkages,
    move_source_package_state,
    verify_ingest_result,
)

_ANALYSIS_JSON = {
    "type": "Anti-SOGICE", "format": "Blog-Post", "evidence": ["e"],
    "scope": "Core", "narrative_register": "Legal-Policy", "summary": "s",
}


# ---------------------------------------------------------------------------
# Worker stubs to produce a real outbox ingest_result package
# ---------------------------------------------------------------------------

def _wcfg(live: Path) -> types.SimpleNamespace:
    return types.SimpleNamespace(
        corpus_dir=live,
        litelm_analysis_model="core-qwen", litelm_analysis_model_heavy="h",
        litelm_analysis_model_reasoning="r", litelm_enrichment_model="lexicon-llm",
        litelm_embedding_model="research-embedding", embedding_model="emb",
        local_analysis_model="local", wayback_enabled=False, truncation_limit=24000,
    )


def _stubs():
    analysis = AnalysisResult.model_validate(_ANALYSIS_JSON)

    def fake_intake(*, source, tier, batch, config, force_doc_id, source_url):
        d = Path(config.corpus_dir) / force_doc_id
        d.mkdir(parents=True, exist_ok=True)
        (d / "intake.json").write_text(
            json.dumps({"doc_id": force_doc_id, "source": source}), encoding="utf-8"
        )
        local_copy = ""
        if not source.startswith(("http://", "https://")):
            blob = Path(source)
            target = d / blob.name
            target.write_bytes(blob.read_bytes())
            local_copy = str(target)
        return types.SimpleNamespace(
            doc_id=force_doc_id, source=source,
            source_type=("url" if source.startswith("http") else "pdf"),
            local_dir=d, local_copy_path=local_copy,
        )

    def fake_preprocess(intake, *, config):
        d = Path(intake.local_dir)
        (d / "extracted.txt").write_text("text for " + intake.doc_id, encoding="utf-8")
        (d / "preprocess.json").write_text(
            json.dumps({"doc_id": intake.doc_id, "quality": "high"}), encoding="utf-8"
        )
        return types.SimpleNamespace(doc_id=intake.doc_id, text="text for " + intake.doc_id)

    return dict(
        intake_fn=fake_intake, preprocess_fn=fake_preprocess,
        analyze_fn=lambda preprocess, **kw: analysis,
        enrich_fn=lambda doc_id, preprocess, analysis_, **kw: EnrichmentResult(doc_id=doc_id),
        embed_fn=lambda text, config: [0.1, 0.2, 0.3],
        unload_analysis_fn=lambda c, l: True,
        unload_enrichment_fn=lambda c, a: True,
        unload_embedding_fn=lambda c: True,
    )


def _make_outbox(tmp_path, *, with_file=False, url=("urldoc", "https://example.org/a", "qi_url", "h_url"),
                 package_id="src-i"):
    root = tmp_path / "source_offload"
    doc_id, u, qid, uh = url
    specs = [SourceItemSpec(source_kind="url", declared_source_type="url", doc_id=doc_id,
                            url=u, queue_item_id=qid, url_hash=uh)]
    if with_file:
        f = tmp_path / "paper.pdf"
        f.write_bytes(b"%PDF-1.7 src")
        specs.append(SourceItemSpec(source_kind="file", declared_source_type="pdf",
                                    doc_id="filedoc", file_path=str(f),
                                    queue_item_id="qi_file", url_hash="h_file"))
    build_source_package(specs=specs, source_offload_root=root, package_id=package_id)
    live = tmp_path / "worker_live"
    live.mkdir(exist_ok=True)
    summary = sw.run_source_worker(root / "inbox" / package_id, _wcfg(live), **_stubs())
    assert summary["final_state"] == "outbox", summary["errors"]
    return root, root / "outbox" / package_id


def _tamper_result_manifest(pkg: Path, mutate) -> None:
    p = pkg / "result_manifest.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    mutate(data)
    p.write_text(json.dumps(data), encoding="utf-8")


# ---------------------------------------------------------------------------
# verify_ingest_result
# ---------------------------------------------------------------------------

def test_verify_ok_on_fresh_package(tmp_path):
    root, outbox = _make_outbox(tmp_path, with_file=True)
    corpus = tmp_path / "corpus"
    report = verify_ingest_result(outbox, corpus_dir=corpus)
    assert report["ok"] is True, report["errors"] + report["unexpected"]
    assert {d["doc_id"] for d in report["documents"]} == {"urldoc", "filedoc"}


def test_verify_rejects_missing_result_doc(tmp_path):
    root, outbox = _make_outbox(tmp_path)
    _tamper_result_manifest(outbox, lambda d: d["documents"].clear())
    report = verify_ingest_result(outbox, corpus_dir=tmp_path / "corpus")
    assert report["ok"] is False
    assert any("missing_result_doc:urldoc" in e for e in report["errors"]) or \
        "result_manifest_has_no_documents" in report["errors"]


def test_verify_allows_declared_partial_when_enabled(tmp_path):
    root, outbox = _make_outbox(tmp_path, with_file=True)

    def _mut(d):
        omitted = d["documents"].pop()
        d["partial"] = True
        d["omitted_documents"] = [
            {"doc_id": omitted["doc_id"], "status": "failed", "error": "embedding_failed:boom"}
        ]

    _tamper_result_manifest(outbox, _mut)

    strict = verify_ingest_result(outbox, corpus_dir=tmp_path / "corpus")
    assert strict["ok"] is False
    assert any("missing_result_doc:filedoc" in e for e in strict["errors"])

    partial = verify_ingest_result(outbox, corpus_dir=tmp_path / "corpus", allow_partial=True)
    assert partial["ok"] is True, partial["errors"]
    assert partial["partial"] is True
    assert partial["omitted_doc_ids"] == ["filedoc"]
    assert {d["doc_id"] for d in partial["documents"]} == {"urldoc"}


def test_import_declared_partial_writes_only_successful_docs(tmp_path):
    root, outbox = _make_outbox(tmp_path, with_file=True)

    def _mut(d):
        omitted = d["documents"].pop()
        d["partial"] = True
        d["omitted_documents"] = [
            {"doc_id": omitted["doc_id"], "status": "failed", "error": "embedding_failed:boom"}
        ]

    _tamper_result_manifest(outbox, _mut)
    corpus = tmp_path / "corpus"

    summary = import_ingest_result(outbox, corpus_dir=corpus)

    assert summary["ok"] is True
    assert summary["imported"] is True
    assert summary["partial"] is True
    assert summary["omitted_doc_ids"] == ["filedoc"]
    assert (corpus / "urldoc" / "analysis.json").is_file()
    assert not (corpus / "filedoc").exists()
    assert [d["doc_id"] for d in summary["documents"]] == ["urldoc"]


def test_verify_rejects_unknown_doc(tmp_path):
    root, outbox = _make_outbox(tmp_path)

    def _mut(d):
        d["documents"].append({"doc_id": "ghost", "artifacts": []})

    _tamper_result_manifest(outbox, _mut)
    report = verify_ingest_result(outbox, corpus_dir=tmp_path / "corpus")
    assert report["ok"] is False
    assert any("unknown_doc_id:ghost" in e for e in report["errors"])


def test_verify_rejects_hash_mismatch(tmp_path):
    root, outbox = _make_outbox(tmp_path)
    (outbox / "docs" / "urldoc" / "analysis.json").write_text("{}", encoding="utf-8")
    report = verify_ingest_result(outbox, corpus_dir=tmp_path / "corpus")
    assert report["ok"] is False
    assert any("hash_mismatch" in e for e in report["errors"])


def test_verify_rejects_unexpected_file(tmp_path):
    root, outbox = _make_outbox(tmp_path)
    (outbox / "docs" / "urldoc" / "stray.json").write_text("{}", encoding="utf-8")
    report = verify_ingest_result(outbox, corpus_dir=tmp_path / "corpus")
    assert report["ok"] is False
    assert any("stray.json" in u for u in report["unexpected"])


def test_verify_rejects_wrong_kind(tmp_path):
    root, outbox = _make_outbox(tmp_path)
    _tamper_result_manifest(outbox, lambda d: d.update({"package_kind": "analysis_result"}))
    report = verify_ingest_result(outbox, corpus_dir=tmp_path / "corpus")
    assert report["ok"] is False
    assert any("unexpected_result_kind" in e for e in report["errors"])


def test_verify_rejects_non_outbox(tmp_path):
    root, outbox = _make_outbox(tmp_path)
    imported = move_source_package_state(
        offload_root=root, package_id="src-i", from_state="outbox", to_state="imported",
    )
    report = verify_ingest_result(imported, corpus_dir=tmp_path / "corpus")
    assert report["ok"] is False
    assert any("not_in_outbox" in e for e in report["errors"])


# ---------------------------------------------------------------------------
# import_ingest_result
# ---------------------------------------------------------------------------

def test_import_happy_path_writes_corpus_and_provenance(tmp_path):
    root, outbox = _make_outbox(tmp_path, with_file=True)
    corpus = tmp_path / "corpus"
    summary = import_ingest_result(outbox, corpus_dir=corpus)
    assert summary["imported"] is True
    for doc_id in ("urldoc", "filedoc"):
        d = corpus / doc_id
        for name in ("intake.json", "preprocess.json", "extracted.txt", "analysis.json",
                     "enrichment.json", "embedding.json", "source_item.json",
                     "worker_report.json", "offload_import.json"):
            assert (d / name).is_file(), f"{doc_id}/{name} missing"
    prov = json.loads((corpus / "urldoc" / "offload_import.json").read_text(encoding="utf-8"))
    assert prov["package_kind"] == "ingest_result"
    assert prov["queue_item_id"] == "qi_url"
    # The copied original lands in the corpus folder too.
    assert (corpus / "filedoc" / "source.pdf").is_file()


def test_import_dry_run_writes_nothing(tmp_path):
    root, outbox = _make_outbox(tmp_path)
    corpus = tmp_path / "corpus"
    summary = import_ingest_result(outbox, corpus_dir=corpus, dry_run=True)
    assert summary["imported"] is False
    assert summary["ok"] is True
    assert not corpus.exists() or not any(corpus.iterdir())


def test_import_backup_before_overwrite(tmp_path):
    root, outbox = _make_outbox(tmp_path)
    corpus = tmp_path / "corpus"
    doc = corpus / "urldoc"
    doc.mkdir(parents=True)
    (doc / "analysis.json").write_text("OLD CONTENT", encoding="utf-8")
    summary = import_ingest_result(outbox, corpus_dir=corpus)
    assert summary["imported"] is True
    backups = list(doc.glob("analysis.json.preimport-*"))
    assert len(backups) == 1
    assert backups[0].read_text(encoding="utf-8") == "OLD CONTENT"
    assert (doc / "analysis.json").read_text(encoding="utf-8") != "OLD CONTENT"


def test_import_rollback_on_write_failure(tmp_path, monkeypatch):
    root, outbox = _make_outbox(tmp_path)
    corpus = tmp_path / "corpus"

    calls = {"n": 0}
    real = offload_source.atomic_write_bytes

    def flaky(path, data):
        calls["n"] += 1
        if calls["n"] >= 2:
            raise RuntimeError("disk full")
        return real(path, data)

    monkeypatch.setattr(offload_source, "atomic_write_bytes", flaky)
    summary = import_ingest_result(outbox, corpus_dir=corpus)
    assert summary["imported"] is False
    assert any("write_failed_rolled_back" in e for e in summary["errors"])
    # Newly created files were rolled back.
    assert not (corpus / "urldoc" / "intake.json").exists()


# ---------------------------------------------------------------------------
# Reviewed-doc guard
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("marker", ["sanity_record.json", "metadata.json"])
def test_import_refuses_reviewed_doc_by_marker_file(tmp_path, marker):
    root, outbox = _make_outbox(tmp_path)
    corpus = tmp_path / "corpus"
    (corpus / "urldoc").mkdir(parents=True)
    (corpus / "urldoc" / marker).write_text("{}", encoding="utf-8")
    summary = import_ingest_result(outbox, corpus_dir=corpus)
    assert summary["imported"] is False
    assert summary["reviewed_blocked"] == ["urldoc"]


def test_import_refuses_reviewed_doc_by_manual_overrides(tmp_path):
    root, outbox = _make_outbox(tmp_path)
    corpus = tmp_path / "corpus"
    (corpus / "urldoc").mkdir(parents=True)
    (corpus / "urldoc" / "analysis.json").write_text(
        json.dumps({"_manual_overrides": {"type": "researcher_confirmed"}}), encoding="utf-8"
    )
    summary = import_ingest_result(outbox, corpus_dir=corpus)
    assert summary["imported"] is False
    assert "urldoc" in summary["reviewed_blocked"]


def test_force_overrides_reviewed_doc(tmp_path):
    root, outbox = _make_outbox(tmp_path)
    corpus = tmp_path / "corpus"
    (corpus / "urldoc").mkdir(parents=True)
    (corpus / "urldoc" / "sanity_record.json").write_text("{}", encoding="utf-8")
    summary = import_ingest_result(outbox, corpus_dir=corpus, force=True)
    assert summary["imported"] is True


def test_bare_offload_import_allows_reimport(tmp_path):
    root, outbox = _make_outbox(tmp_path)
    corpus = tmp_path / "corpus"
    (corpus / "urldoc").mkdir(parents=True)
    (corpus / "urldoc" / "offload_import.json").write_text("{}", encoding="utf-8")
    summary = import_ingest_result(outbox, corpus_dir=corpus)
    assert summary["imported"] is True  # prior auto-import is not "reviewed"


# ---------------------------------------------------------------------------
# Linkages helper + module guard
# ---------------------------------------------------------------------------

def test_ingest_result_linkages(tmp_path):
    root, outbox = _make_outbox(tmp_path, with_file=True)
    links = {l["doc_id"]: l for l in ingest_result_linkages(outbox)}
    assert links["urldoc"]["queue_item_id"] == "qi_url"
    assert links["urldoc"]["url_hash"] == "h_url"
    assert links["filedoc"]["queue_item_id"] == "qi_file"


def test_offload_source_does_not_import_source_queue():
    import ast

    tree = ast.parse(Path(offload_source.__file__).read_text(encoding="utf-8"))
    imported: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported += [a.name for a in node.names]
        elif isinstance(node, ast.ImportFrom):
            base = node.module or ""
            imported += [f"{base}.{a.name}" for a in node.names]
    blob = " ".join(imported).lower()
    for forbidden in ("source_queue", "supabase", "sanity", "upload"):
        assert forbidden not in blob, f"offload_source must not import {forbidden!r}"


# ---------------------------------------------------------------------------
# CLI — relink + lifecycle
# ---------------------------------------------------------------------------

class _CliConfig:
    def __init__(self, base: Path):
        self.corpus_dir = base / "corpus"
        self.exports_dir = base / "exports"
        self.corpus_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)


def _patch_config(monkeypatch, tmp_path: Path) -> _CliConfig:
    cfg = _CliConfig(tmp_path)
    monkeypatch.setattr(main, "load_config", lambda *a, **k: cfg)
    return cfg


def _queue_row(cfg, item_id):
    from runner.pipeline.source_queue import open_db, queue_db_path
    db = open_db(queue_db_path(cfg.corpus_dir))
    try:
        row = db.execute(
            "SELECT status, corpus_doc_id FROM source_queue WHERE id = ?", (item_id,)
        ).fetchone()
        return (row["status"], row["corpus_doc_id"]) if row else None
    finally:
        db.close()


def test_cli_import_relinks_queue_by_item_id(tmp_path, monkeypatch):
    cfg = _patch_config(monkeypatch, tmp_path)
    from runner.pipeline.source_queue import open_db, queue_db_path, add_item
    db = open_db(queue_db_path(cfg.corpus_dir))
    item = add_item(db, url="https://example.org/q", title="Q")
    db.close()

    root, outbox = _make_outbox(
        tmp_path, url=("urldoc", item.url, item.id, item.url_hash), package_id="src-cli",
    )
    result = CliRunner().invoke(main.app, ["source-offload-import", str(outbox)])
    assert result.exit_code == 0, result.output
    assert (cfg.corpus_dir / "urldoc" / "analysis.json").is_file()
    assert _queue_row(cfg, item.id) == ("ingested", "urldoc")
    assert (root / "imported" / "src-cli").is_dir()
    assert not (root / "outbox" / "src-cli").exists()


def test_cli_import_relinks_queue_by_url_hash_fallback(tmp_path, monkeypatch):
    cfg = _patch_config(monkeypatch, tmp_path)
    from runner.pipeline.source_queue import open_db, queue_db_path, add_item
    db = open_db(queue_db_path(cfg.corpus_dir))
    item = add_item(db, url="https://example.org/q2", title="Q2")
    db.close()

    # queue_item_id intentionally blank; only url_hash matches.
    root, outbox = _make_outbox(
        tmp_path, url=("urldoc", item.url, "", item.url_hash), package_id="src-cli2",
    )
    result = CliRunner().invoke(main.app, ["source-offload-import", str(outbox)])
    assert result.exit_code == 0, result.output
    assert _queue_row(cfg, item.id) == ("ingested", "urldoc")


def test_cli_import_adhoc_item_no_queue_row(tmp_path, monkeypatch):
    cfg = _patch_config(monkeypatch, tmp_path)
    root, outbox = _make_outbox(
        tmp_path, url=("urldoc", "https://example.org/adhoc", "", ""), package_id="src-cli3",
    )
    result = CliRunner().invoke(main.app, ["source-offload-import", str(outbox)])
    assert result.exit_code == 0, result.output
    assert (cfg.corpus_dir / "urldoc" / "analysis.json").is_file()
    assert (root / "imported" / "src-cli3").is_dir()


def test_cli_dry_run_no_queue_or_corpus_or_move(tmp_path, monkeypatch):
    cfg = _patch_config(monkeypatch, tmp_path)
    from runner.pipeline.source_queue import open_db, queue_db_path, add_item
    db = open_db(queue_db_path(cfg.corpus_dir))
    item = add_item(db, url="https://example.org/dry", title="D")
    db.close()

    root, outbox = _make_outbox(
        tmp_path, url=("urldoc", item.url, item.id, item.url_hash), package_id="src-dry",
    )
    result = CliRunner().invoke(main.app, ["source-offload-import", str(outbox), "--dry-run"])
    assert result.exit_code == 0, result.output
    assert not (cfg.corpus_dir / "urldoc").exists()          # corpus untouched
    assert _queue_row(cfg, item.id) == ("new", "")           # queue untouched
    assert (root / "outbox" / "src-dry").is_dir()            # not moved


def test_cli_reviewed_block_keeps_queue_and_package(tmp_path, monkeypatch):
    cfg = _patch_config(monkeypatch, tmp_path)
    from runner.pipeline.source_queue import open_db, queue_db_path, add_item
    db = open_db(queue_db_path(cfg.corpus_dir))
    item = add_item(db, url="https://example.org/rev", title="R")
    db.close()

    root, outbox = _make_outbox(
        tmp_path, url=("urldoc", item.url, item.id, item.url_hash), package_id="src-rev",
    )
    (cfg.corpus_dir / "urldoc").mkdir(parents=True)
    (cfg.corpus_dir / "urldoc" / "sanity_record.json").write_text("{}", encoding="utf-8")

    blocked = CliRunner().invoke(main.app, ["source-offload-import", str(outbox)])
    assert blocked.exit_code == 1
    assert _queue_row(cfg, item.id) == ("new", "")           # queue untouched on refusal
    assert (root / "outbox" / "src-rev").is_dir()            # package not moved

    forced = CliRunner().invoke(main.app, ["source-offload-import", str(outbox), "--force"])
    assert forced.exit_code == 0, forced.output
    assert _queue_row(cfg, item.id) == ("ingested", "urldoc")
    assert (root / "imported" / "src-rev").is_dir()
