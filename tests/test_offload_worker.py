"""Mac Studio offload worker tests.

All local-only with stubbed models: no real model calls, no Sanity/Supabase,
no source_queue.db, no live corpus reads/writes, no fetch/parse/OCR/transcribe.
"""
from __future__ import annotations

import json
import os
import types
from pathlib import Path

import pytest

from runner.models.document import AnalysisResult
from runner.models.enrichment import EnrichmentResult
from runner.pipeline import offload
from runner.pipeline import offload_worker as worker


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _make_corpus_doc(corpus_dir: Path, doc_id: str) -> None:
    d = corpus_dir / doc_id
    d.mkdir(parents=True, exist_ok=True)
    _write_json(d / "intake.json", {"doc_id": doc_id, "source": "https://example.org/d", "source_type": "url"})
    _write_json(d / "preprocess.json", {"doc_id": doc_id, "quality": "high", "tool_used": "trafilatura", "ocr_images": []})
    (d / "extracted.txt").write_text("Extracted source text for " + doc_id, encoding="utf-8")


def _build_inbox(tmp_path: Path, doc_ids=("abc123",), package_id="pkg-w") -> tuple[Path, Path, Path]:
    """Return (build_corpus, inbox_package_dir, offload_root)."""
    build_corpus = tmp_path / "build_corpus"
    for doc_id in doc_ids:
        _make_corpus_doc(build_corpus, doc_id)
    offload_root = tmp_path / "offload"
    offload.build_analysis_package(
        corpus_dir=build_corpus, doc_ids=list(doc_ids),
        offload_root=offload_root, package_id=package_id,
    )
    return build_corpus, offload_root / "inbox" / package_id, offload_root


_ANALYSIS_JSON = {
    "type": "Anti-SOGICE", "format": "Blog-Post", "evidence": ["e"],
    "scope": "Core", "narrative_register": "Legal-Policy", "summary": "s",
}


def _worker_config(corpus_dir: Path) -> types.SimpleNamespace:
    return types.SimpleNamespace(
        corpus_dir=corpus_dir,
        litelm_analysis_model="core-qwen",
        litelm_analysis_model_heavy="core-gemma",
        litelm_analysis_model_reasoning="review-qwen",
        litelm_enrichment_model="lexicon-llm",
        litelm_embedding_model="research-embedding",
        embedding_model="qwen3-embedding:8b",
        local_analysis_model="qwen3.5:9b",
    )


def _stubs(events: list, *, fail_stage: str | None = None, fail_doc: str | None = None):
    analysis = AnalysisResult.model_validate(_ANALYSIS_JSON)

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
        analyze_fn=fake_analyze, enrich_fn=fake_enrich, embed_fn=fake_embed,
        unload_analysis_fn=unload_analysis, unload_enrichment_fn=unload_enrichment,
        unload_embedding_fn=unload_embedding,
    )


def _run(tmp_path, doc_ids=("abc123",), *, fail_stage=None, fail_doc=None, config=None):
    build_corpus, inbox_pkg, offload_root = _build_inbox(tmp_path, doc_ids)
    events: list = []
    cfg = config or _worker_config(tmp_path / "worker_corpus")
    summary = worker.run_offload_worker(
        inbox_pkg, cfg, llm="litelm", enrich_model=None,
        **_stubs(events, fail_stage=fail_stage, fail_doc=fail_doc),
    )
    return summary, build_corpus, offload_root, events


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------

def test_worker_happy_path_moves_to_outbox(tmp_path):
    summary, build_corpus, offload_root, _ = _run(tmp_path)

    assert summary["ok"] is True
    assert summary["final_state"] == "outbox"
    outbox = offload_root / "outbox" / "pkg-w"
    assert outbox.exists()
    assert not (offload_root / "inbox" / "pkg-w").exists()

    doc_dir = outbox / "docs" / "abc123"
    for name in ("analysis.json", "analysis_audit.json", "enrichment.json",
                 "enrichment_audit.json", "embedding.json", "worker_report.json"):
        assert (doc_dir / name).exists(), f"missing {name}"
    assert (outbox / "result_manifest.json").exists()
    assert (outbox / "worker_report.json").exists()  # root-level package report


def test_worker_output_verifies_with_importer(tmp_path):
    summary, build_corpus, offload_root, _ = _run(tmp_path)
    outbox = offload_root / "outbox" / "pkg-w"
    report = offload.verify_result_package(outbox, corpus_dir=build_corpus)
    assert report["ok"] is True, report["errors"]


def test_worker_claims_inbox_processing_outbox(tmp_path):
    summary, _, offload_root, _ = _run(tmp_path)
    # End state is outbox, manifest lifecycle consistent.
    outbox = offload_root / "outbox" / "pkg-w"
    assert offload.load_manifest(outbox).lifecycle_state == "outbox"
    assert offload.lifecycle_consistency(outbox)["consistent"] is True


def test_worker_exact_document_coverage_in_result_manifest(tmp_path):
    summary, build_corpus, offload_root, _ = _run(tmp_path, doc_ids=("doca", "docb"))
    outbox = offload_root / "outbox" / "pkg-w"
    rm = json.loads((outbox / "result_manifest.json").read_text(encoding="utf-8"))
    assert {d["doc_id"] for d in rm["documents"]} == {"doca", "docb"}
    # And the importer accepts it.
    assert offload.verify_result_package(outbox, corpus_dir=build_corpus)["ok"] is True


def test_worker_per_doc_report_is_contract_valid_and_has_no_raw_text(tmp_path):
    summary, build_corpus, offload_root, _ = _run(tmp_path)
    outbox = offload_root / "outbox" / "pkg-w"
    per_doc = json.loads((outbox / "docs" / "abc123" / "worker_report.json").read_text(encoding="utf-8"))
    assert per_doc["doc_id"] == "abc123"
    assert per_doc["status"] == "succeeded"
    assert set(per_doc["stages"]) == {"analysis", "enrichment", "embedding"}
    labels = {a["label"] for a in per_doc["artifacts"]}
    assert "analysis.json" in labels and "embedding.json" in labels
    assert all(a["sha256"] for a in per_doc["artifacts"])
    # No raw extracted text anywhere in the report.
    assert "Extracted source text" not in json.dumps(per_doc)
    # It is listed in result_manifest (imported as provenance).
    rm = json.loads((outbox / "result_manifest.json").read_text(encoding="utf-8"))
    rm_labels = {a["label"] for a in rm["documents"][0]["artifacts"]}
    assert "worker_report.json" in rm_labels


def test_worker_unloads_between_stages(tmp_path):
    _, _, _, events = _run(tmp_path, doc_ids=("doca", "docb"))
    names = [e[0] for e in events]
    ua, ue, ub = names.index("unload_analysis"), names.index("unload_enrichment"), names.index("unload_embedding")
    # All analyze before unload_analysis; that before any enrich; etc.
    assert max(i for i, e in enumerate(events) if e[0] == "analyze") < ua
    assert ua < min(i for i, e in enumerate(events) if e[0] == "enrich")
    assert max(i for i, e in enumerate(events) if e[0] == "enrich") < ue
    assert ue < min(i for i, e in enumerate(events) if e[0] == "embed")
    assert max(i for i, e in enumerate(events) if e[0] == "embed") < ub


# ---------------------------------------------------------------------------
# Failure handling
# ---------------------------------------------------------------------------

def test_worker_failure_moves_to_failed_no_result_manifest(tmp_path):
    summary, _, offload_root, events = _run(tmp_path, doc_ids=("doca", "docb"), fail_stage="enrichment", fail_doc="docb")

    assert summary["ok"] is False
    assert summary["final_state"] == "failed"
    failed = offload_root / "failed" / "pkg-w"
    assert failed.exists()
    assert not (offload_root / "outbox" / "pkg-w").exists()
    # Root worker_report explains the failure; no result_manifest.
    assert (failed / "worker_report.json").exists()
    assert not (failed / "result_manifest.json").exists()
    report = json.loads((failed / "worker_report.json").read_text(encoding="utf-8"))
    assert report["worker_status"] == "failed"
    docb = next(d for d in report["documents"] if d["doc_id"] == "docb")
    assert "enrichment_failed" in docb["error"]
    # Embedding stage never ran (failure short-circuits later stages).
    assert "embed" not in [e[0] for e in events]
    assert "unload_embedding" not in [e[0] for e in events]


def test_worker_analysis_failure_skips_later_stages(tmp_path):
    summary, _, offload_root, events = _run(tmp_path, fail_stage="analysis")
    assert summary["ok"] is False
    assert summary["final_state"] == "failed"
    names = [e[0] for e in events]
    assert "unload_analysis" in names  # unloads still happen
    assert "enrich" not in names and "embed" not in names


# ---------------------------------------------------------------------------
# Worker lock
# ---------------------------------------------------------------------------

def test_worker_lock_blocks_concurrent_run(tmp_path):
    _, inbox_pkg, offload_root = _build_inbox(tmp_path)
    held = worker.acquire_worker_lock(offload_root)  # simulate another live worker
    try:
        with pytest.raises(RuntimeError, match="already running"):
            worker.run_offload_worker(inbox_pkg, _worker_config(tmp_path / "wc"), **_stubs([]))
        # Package not claimed.
        assert inbox_pkg.exists()
        assert not (offload_root / "processing" / "pkg-w").exists()
    finally:
        worker.release_worker_lock(offload_root, held)


def test_worker_lock_clears_stale_lock(tmp_path):
    offload_root = tmp_path / "offload"
    offload_root.mkdir(parents=True)
    lock_path = worker._worker_lock_path(offload_root)
    lock_path.write_text(json.dumps({"pid": 2147483600, "started_at": "x"}), encoding="utf-8")  # dead PID

    lock = worker.acquire_worker_lock(offload_root)
    assert lock["pid"] == os.getpid()
    assert json.loads(lock_path.read_text(encoding="utf-8"))["pid"] == os.getpid()
    worker.release_worker_lock(offload_root, lock)
    assert not lock_path.exists()


def test_worker_releases_lock_after_run(tmp_path):
    _, _, offload_root, _ = _run(tmp_path)
    assert not worker._worker_lock_path(offload_root).exists()


# ---------------------------------------------------------------------------
# Boundaries: no corpus / no Sanity / Supabase / source_queue
# ---------------------------------------------------------------------------

def test_worker_does_not_touch_config_corpus_dir(tmp_path):
    worker_corpus = tmp_path / "worker_corpus"
    worker_corpus.mkdir()
    cfg = _worker_config(worker_corpus)
    summary, _, offload_root, _ = _run(tmp_path, config=cfg)
    assert summary["ok"] is True
    # The worker must never write into config.corpus_dir.
    assert list(worker_corpus.iterdir()) == []


def test_worker_calls_no_sanity_supabase_or_source_queue_writes(tmp_path, monkeypatch):
    import runner.clients.supabase as supabase_mod
    import runner.clients.sanity as sanity_mod
    import runner.pipeline.source_queue as sq_mod

    def _boom(*a, **k):
        raise AssertionError("forbidden external call")

    monkeypatch.setattr(supabase_mod, "_client", _boom, raising=False)
    monkeypatch.setattr(sanity_mod, "_mutate", _boom, raising=False)
    monkeypatch.setattr(sq_mod, "open_db", _boom, raising=False)

    summary, build_corpus, offload_root, _ = _run(tmp_path)
    assert summary["ok"] is True  # would have raised if any forbidden path were hit


# ---------------------------------------------------------------------------
# CLI guard
# ---------------------------------------------------------------------------

def test_worker_retry_after_failure_leaves_no_stray_audit_backups(tmp_path):
    """failed → inbox → re-run must produce an importable package with no stray
    audit-archive files left from the first partial run."""
    build_corpus, inbox_pkg, offload_root = _build_inbox(tmp_path)
    cfg = _worker_config(tmp_path / "worker_corpus")

    # 1+2. First run fails at enrichment, so analysis.json + analysis_audit.json
    # (partial outputs) are left in the failed package.
    s1 = worker.run_offload_worker(inbox_pkg, cfg, **_stubs([], fail_stage="enrichment"))
    assert s1["ok"] is False and s1["final_state"] == "failed"
    failed_doc_dir = offload_root / "failed" / "pkg-w" / "docs" / "abc123"
    assert (failed_doc_dir / "analysis.json").exists()
    assert (failed_doc_dir / "analysis_audit.json").exists()

    # 3. Operator retries: failed → inbox.
    reclaimed = offload.transition_package_state(
        offload_root=offload_root, package_id="pkg-w", from_state="failed", to_state="inbox",
    )

    # 4. Second run succeeds.
    s2 = worker.run_offload_worker(reclaimed, cfg, **_stubs([]))
    assert s2["ok"] is True and s2["final_state"] == "outbox"

    outbox = offload_root / "outbox" / "pkg-w"
    # 5a. Importer accepts the retried package.
    assert offload.verify_result_package(outbox, corpus_dir=build_corpus)["ok"] is True, \
        offload.verify_result_package(outbox, corpus_dir=build_corpus)["errors"]

    # 5b. No stray audit-archive / backup files remain in the doc dir. The audit
    # writers' archive pattern is "<stem>_<timestamp>.json" → "*_audit_*.json"
    # (distinct from the legit "*_audit.json" outputs).
    doc_dir = outbox / "docs" / "abc123"
    strays = list(doc_dir.glob("*_audit_*.json")) + list(doc_dir.glob("*.bak"))
    assert strays == [], f"unexpected stray files: {[p.name for p in strays]}"
    # Doc dir holds exactly the inputs + the six worker outputs.
    names = {p.name for p in doc_dir.iterdir()}
    assert names == {
        "intake.json", "preprocess.json", "extracted.txt",
        "analysis.json", "analysis_audit.json", "enrichment.json",
        "enrichment_audit.json", "embedding.json", "worker_report.json",
    }, names


def test_worker_refuses_non_inbox_package(tmp_path):
    build_corpus, inbox_pkg, offload_root = _build_inbox(tmp_path)
    moved = offload.move_package_state(
        offload_root=offload_root, package_id="pkg-w", from_state="inbox", to_state="processing"
    )
    summary = worker.run_offload_worker(moved, _worker_config(tmp_path / "wc"), **_stubs([]))
    assert summary["ok"] is False
    assert any(e.startswith("not_in_inbox") for e in summary["errors"])
