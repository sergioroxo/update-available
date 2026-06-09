"""Source worker (Slice S2) tests.

All local-only with stubbed pipeline functions: no real network, no real model
calls, no real OCR/transcription, no Sanity/Supabase, no live corpus writes, no
source_queue.db writes.
"""
from __future__ import annotations

import json
import os
import types
from pathlib import Path

import pytest

from runner.models.document import AnalysisResult
from runner.models.enrichment import EnrichmentResult
from runner.pipeline import offload_source
from runner.pipeline import source_worker as sw
from runner.pipeline.offload_source import SourceItemSpec, build_source_package


_ANALYSIS_JSON = {
    "type": "Anti-SOGICE", "format": "Blog-Post", "evidence": ["e"],
    "scope": "Core", "narrative_register": "Legal-Policy", "summary": "s",
}

# A sentinel that must never appear in any worker report (no raw extracted text).
_RAW_TEXT_SENTINEL = "RAWTEXTSENTINEL-do-not-leak"


# ---------------------------------------------------------------------------
# Config + stubs
# ---------------------------------------------------------------------------

def _worker_config(live_corpus: Path) -> types.SimpleNamespace:
    return types.SimpleNamespace(
        corpus_dir=live_corpus,  # the worker must replace this with <package>/docs
        litelm_analysis_model="core-qwen",
        litelm_analysis_model_heavy="core-gemma",
        litelm_analysis_model_reasoning="review-qwen",
        litelm_enrichment_model="lexicon-llm",
        litelm_embedding_model="research-embedding",
        embedding_model="qwen3-embedding:8b",
        local_analysis_model="qwen3.5:9b",
        wayback_enabled=False,
        truncation_limit=24000,
    )


def _stubs(events: list, *, fail_stage=None, fail_doc=None, extra_file=None):
    analysis = AnalysisResult.model_validate(_ANALYSIS_JSON)

    def fake_intake(*, source, tier, batch, config, force_doc_id, source_url):
        events.append(("intake", force_doc_id, source))
        events.append(("intake_corpus", str(config.corpus_dir)))
        d = Path(config.corpus_dir) / force_doc_id
        d.mkdir(parents=True, exist_ok=True)
        (d / "intake.json").write_text(
            json.dumps({"doc_id": force_doc_id, "source": source, "source_url": source_url}),
            encoding="utf-8",
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
        events.append(("preprocess", intake.doc_id))
        if fail_stage == "preprocess" and (fail_doc is None or intake.doc_id == fail_doc):
            raise RuntimeError("preprocess boom")
        d = Path(intake.local_dir)
        (d / "extracted.txt").write_text(_RAW_TEXT_SENTINEL + " " + intake.doc_id, encoding="utf-8")
        (d / "preprocess.json").write_text(
            json.dumps({"doc_id": intake.doc_id, "quality": "high"}), encoding="utf-8"
        )
        if extra_file and (fail_doc is None or intake.doc_id == fail_doc):
            (d / extra_file).write_text("junk", encoding="utf-8")
        return types.SimpleNamespace(doc_id=intake.doc_id, text=_RAW_TEXT_SENTINEL + " " + intake.doc_id)

    def fake_analyze(preprocess, *, llm, config, _audit):
        events.append(("analyze", preprocess.doc_id))
        if fail_stage == "analysis" and (fail_doc is None or preprocess.doc_id == fail_doc):
            raise RuntimeError("analysis boom")
        return analysis

    def fake_enrich(doc_id, preprocess, analysis_, *, config, llm, model, _audit):
        events.append(("enrich", doc_id))
        if fail_stage == "enrichment" and (fail_doc is None or doc_id == fail_doc):
            raise RuntimeError("enrichment boom")
        return EnrichmentResult(doc_id=doc_id)

    def fake_embed(text, config):
        events.append(("embed", None))
        if fail_stage == "embedding":
            raise RuntimeError("embedding boom")
        return [0.1, 0.2, 0.3]

    def unload_analysis(config, llm):
        events.append(("unload_analysis", None)); return True

    def unload_enrichment(config, alias):
        events.append(("unload_enrichment", None)); return True

    def unload_embedding(config):
        events.append(("unload_embedding", None)); return True

    return dict(
        intake_fn=fake_intake, preprocess_fn=fake_preprocess,
        analyze_fn=fake_analyze, enrich_fn=fake_enrich, embed_fn=fake_embed,
        unload_analysis_fn=unload_analysis, unload_enrichment_fn=unload_enrichment,
        unload_embedding_fn=unload_embedding,
    )


def _build_source_inbox(tmp_path, *, with_file=False, package_id="src-w"):
    root = tmp_path / "source_offload"
    specs = [
        SourceItemSpec(
            source_kind="url", declared_source_type="url", doc_id="urldoc",
            url="https://example.org/a", queue_item_id="qi_url", url_hash="h_url",
        )
    ]
    if with_file:
        f = tmp_path / "paper.pdf"
        f.write_bytes(b"%PDF-1.7 source bytes")
        specs.append(SourceItemSpec(
            source_kind="file", declared_source_type="pdf", doc_id="filedoc",
            file_path=str(f), queue_item_id="qi_file", url_hash="h_file",
        ))
    build_source_package(specs=specs, source_offload_root=root, package_id=package_id)
    return root, root / "inbox" / package_id


def _run(tmp_path, *, with_file=False, fail_stage=None, fail_doc=None, extra_file=None,
         live_corpus=None, events=None):
    root, inbox = _build_source_inbox(tmp_path, with_file=with_file)
    events = events if events is not None else []
    live = live_corpus or (tmp_path / "live_corpus")
    live.mkdir(parents=True, exist_ok=True)
    cfg = _worker_config(live)
    summary = sw.run_source_worker(
        inbox, cfg, llm="litelm", enrich_model=None,
        **_stubs(events, fail_stage=fail_stage, fail_doc=fail_doc, extra_file=extra_file),
    )
    return summary, root, events, live


# ---------------------------------------------------------------------------
# Happy paths
# ---------------------------------------------------------------------------

def test_happy_path_url_item_to_outbox(tmp_path):
    summary, root, events, live = _run(tmp_path)
    assert summary["ok"] is True
    assert summary["final_state"] == "outbox"
    outbox = root / "outbox" / "src-w"
    assert outbox.is_dir()
    assert not (root / "inbox" / "src-w").exists()
    doc_dir = outbox / "docs" / "urldoc"
    for name in ("intake.json", "preprocess.json", "extracted.txt", "analysis.json",
                 "analysis_audit.json", "enrichment.json", "enrichment_audit.json",
                 "embedding.json", "source_item.json", "worker_report.json"):
        assert (doc_dir / name).is_file(), f"missing {name}"


def test_happy_path_local_file_item(tmp_path):
    summary, root, events, live = _run(tmp_path, with_file=True)
    assert summary["ok"] is True
    outbox = root / "outbox" / "src-w"
    # The copied original lands in the doc folder and is manifested.
    assert (outbox / "docs" / "filedoc" / "source.pdf").is_file()
    rm = json.loads((outbox / "result_manifest.json").read_text(encoding="utf-8"))
    file_doc = next(d for d in rm["documents"] if d["doc_id"] == "filedoc")
    assert file_doc["local_source_filename"] == "source.pdf"
    assert any(a["label"] == "source.pdf" for a in file_doc["artifacts"])


def test_url_vs_file_source_passed_to_intake(tmp_path):
    summary, root, events, live = _run(tmp_path, with_file=True)
    intakes = {doc_id: source for tag, doc_id, source in
               (e for e in events if e[0] == "intake")}
    assert intakes["urldoc"] == "https://example.org/a"
    assert intakes["filedoc"].endswith("items/filedoc/source.pdf")


def test_package_local_config_corpus_dir_only(tmp_path):
    summary, root, events, live = _run(tmp_path)
    corpus_paths = [p for tag, p in (e for e in events if e[0] == "intake_corpus")]
    assert corpus_paths, "intake never ran"
    for p in corpus_paths:
        assert p.endswith(os.path.join("processing", "src-w", "docs")) or p.endswith(
            os.path.join("outbox", "src-w", "docs")
        )


def test_no_live_corpus_writes(tmp_path):
    live = tmp_path / "live_corpus"
    summary, root, events, _ = _run(tmp_path, live_corpus=live)
    assert summary["ok"] is True
    assert not any(live.iterdir()), "worker wrote into the live corpus"


def test_source_item_copied_into_docs(tmp_path):
    summary, root, events, live = _run(tmp_path)
    si = root / "outbox" / "src-w" / "docs" / "urldoc" / "source_item.json"
    assert si.is_file()
    data = json.loads(si.read_text(encoding="utf-8"))
    assert data["queue_item_id"] == "qi_url"
    assert data["url"] == "https://example.org/a"


def test_exact_document_coverage(tmp_path):
    summary, root, events, live = _run(tmp_path, with_file=True)
    rm = json.loads((root / "outbox" / "src-w" / "result_manifest.json").read_text(encoding="utf-8"))
    assert {d["doc_id"] for d in rm["documents"]} == {"urldoc", "filedoc"}


def test_result_manifest_kind_schema_artifacts_valid(tmp_path):
    summary, root, events, live = _run(tmp_path)
    rm = json.loads((root / "outbox" / "src-w" / "result_manifest.json").read_text(encoding="utf-8"))
    assert rm["package_kind"] == offload_source.PACKAGE_KIND_INGEST
    assert rm["schema_version"] == offload_source.INGEST_RESULT_SCHEMA_VERSION
    doc = rm["documents"][0]
    assert doc["queue_item_id"] == "qi_url"
    assert doc["url_hash"] == "h_url"
    assert doc["source_url"] == "https://example.org/a"
    assert doc["declared_source_type"] == "url"
    labels = {a["label"] for a in doc["artifacts"]}
    assert {"analysis.json", "embedding.json", "source_item.json", "worker_report.json"} <= labels
    for a in doc["artifacts"]:
        assert a["relative_path"] == f"docs/urldoc/{a['label']}"
        assert a["sha256"] and a["bytes"] > 0


def test_worker_reports_contain_no_raw_text(tmp_path):
    summary, root, events, live = _run(tmp_path)
    pkg = root / "outbox" / "src-w"
    root_report = (pkg / "worker_report.json").read_text(encoding="utf-8")
    per_doc = (pkg / "docs" / "urldoc" / "worker_report.json").read_text(encoding="utf-8")
    assert _RAW_TEXT_SENTINEL not in root_report
    assert _RAW_TEXT_SENTINEL not in per_doc


def test_unload_order(tmp_path):
    summary, root, events, live = _run(tmp_path)
    order = [tag for tag, *_ in events if tag in (
        "analyze", "unload_analysis", "enrich", "unload_enrichment", "embed", "unload_embedding"
    )]
    assert order == ["analyze", "unload_analysis", "enrich", "unload_enrichment", "embed", "unload_embedding"]


# ---------------------------------------------------------------------------
# Failures
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("stage", ["preprocess", "analysis", "enrichment", "embedding"])
def test_failure_moves_to_failed_without_result_manifest(tmp_path, stage):
    summary, root, events, live = _run(tmp_path, fail_stage=stage)
    assert summary["ok"] is False
    assert summary["final_state"] == "failed"
    failed = root / "failed" / "src-w"
    assert failed.is_dir()
    assert (failed / "worker_report.json").is_file()
    assert not (failed / "result_manifest.json").exists()


def test_intake_preprocess_failure_skips_later_stages(tmp_path):
    summary, root, events, live = _run(tmp_path, fail_stage="preprocess")
    assert not any(e[0] == "analyze" for e in events)


def test_unexpected_pipeline_artifact_fails_package(tmp_path):
    summary, root, events, live = _run(tmp_path, extra_file="junk.bin")
    assert summary["ok"] is False
    assert summary["final_state"] == "failed"
    assert not (root / "failed" / "src-w" / "result_manifest.json").exists()
    assert any("unexpected_pipeline_artifact" in d["error"] for d in summary["documents"])


def test_retry_after_failure_leaves_no_stale_audit_backups(tmp_path):
    # Run 1: fail at embedding (analysis/enrichment audits get written).
    root, inbox = _build_source_inbox(tmp_path)
    live = tmp_path / "live_corpus"; live.mkdir()
    cfg = _worker_config(live)
    s1 = sw.run_source_worker(inbox, cfg, **_stubs([], fail_stage="embedding"))
    assert s1["final_state"] == "failed"
    failed = root / "failed" / "src-w"
    assert (failed / "docs" / "urldoc" / "analysis_audit.json").is_file()

    # Retry: failed -> inbox, then a clean run.
    reclaimed = offload_source.move_source_package_state(
        offload_root=root, package_id="src-w", from_state="failed", to_state="inbox",
    )
    s2 = sw.run_source_worker(reclaimed, cfg, **_stubs([]))
    assert s2["ok"] is True
    assert s2["final_state"] == "outbox"
    doc_dir = root / "outbox" / "src-w" / "docs" / "urldoc"
    strays = list(doc_dir.glob("*_audit_*.json")) + list(doc_dir.glob("*.bak"))
    assert not strays, f"stale audit backups remain: {strays}"
    rm = json.loads((root / "outbox" / "src-w" / "result_manifest.json").read_text(encoding="utf-8"))
    assert {d["doc_id"] for d in rm["documents"]} == {"urldoc"}


# ---------------------------------------------------------------------------
# Lock / lifecycle / isolation
# ---------------------------------------------------------------------------

def test_worker_lock_blocks_concurrent_run(tmp_path):
    root, inbox = _build_source_inbox(tmp_path)
    (root / ".worker.lock").write_text(
        json.dumps({"pid": os.getpid(), "started_at": "now"}), encoding="utf-8"
    )
    cfg = _worker_config(tmp_path / "live")
    with pytest.raises(RuntimeError):
        sw.run_source_worker(inbox, cfg, **_stubs([]))
    # The package was not claimed.
    assert (root / "inbox" / "src-w").is_dir()


def test_worker_clears_stale_lock(tmp_path):
    root, inbox = _build_source_inbox(tmp_path)
    (root / ".worker.lock").write_text(
        json.dumps({"pid": 999999, "started_at": "old"}), encoding="utf-8"
    )
    cfg = _worker_config(tmp_path / "live")
    summary = sw.run_source_worker(inbox, cfg, **_stubs([]))
    assert summary["ok"] is True
    assert not (root / ".worker.lock").exists()  # released after run


def test_non_inbox_package_refused(tmp_path):
    root, inbox = _build_source_inbox(tmp_path)
    processing = offload_source.move_source_package_state(
        offload_root=root, package_id="src-w", from_state="inbox", to_state="processing",
    )
    cfg = _worker_config(tmp_path / "live")
    summary = sw.run_source_worker(processing, cfg, **_stubs([]))
    assert summary["ok"] is False
    assert any("not_in_inbox" in e for e in summary["errors"])


def test_source_queue_and_services_not_written(tmp_path, monkeypatch):
    """The worker must never write the queue / Sanity / Supabase."""
    import runner.pipeline.source_queue as sq

    def _boom(*a, **k):
        raise AssertionError("source_queue must not be written by the worker")

    monkeypatch.setattr(sq, "add_item", _boom)
    monkeypatch.setattr(sq, "mark_ingested", _boom)
    monkeypatch.setattr(sq, "update_status", _boom)

    summary, root, events, live = _run(tmp_path)
    assert summary["ok"] is True


def test_module_has_no_queue_or_service_imports():
    """The worker must not import the queue / Sanity / Supabase / upload modules.

    AST-based so docstring prose (which legitimately mentions these as boundaries)
    is ignored — only real import statements are inspected.
    """
    import ast

    tree = ast.parse(Path(sw.__file__).read_text(encoding="utf-8"))
    imported: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported += [a.name for a in node.names]
        elif isinstance(node, ast.ImportFrom):
            base = node.module or ""
            imported += [f"{base}.{a.name}" for a in node.names]
    blob = " ".join(imported).lower()
    for forbidden in ("source_queue", "supabase", "sanity", "upload", "httpx", "requests"):
        assert forbidden not in blob, f"source_worker must not import {forbidden!r}"
