"""Mac Studio source worker (Slice S2) — runs the *full* pipeline on a package.

Runs on the Mac Studio against a single ``inbox`` ``source_package``. It verifies
the source inputs, claims the package (``inbox -> processing``), and for every
item runs the existing pipeline end-to-end against a **package-local staging
corpus** (``<package>/docs/<doc_id>/``):

    intake -> preprocess -> analysis -> enrichment -> embedding

Heavy LLM stages are stage-batched with a model unload between them (one heavy
model resident at a time), guarded by a PID worker lock at the source-offload
root. On full success it writes complete corpus-style document folders, a per-doc
and root ``worker_report.json`` (no raw text), and an ``ingest_result``
``result_manifest.json``, then moves the package to ``outbox``. If some
documents succeed and others fail, it writes an importable partial
``result_manifest.json`` for successful documents only, records failed documents
in the root report, and still moves the package to ``outbox``. If no document
succeeds, it writes only the root ``worker_report.json`` and moves to ``failed``.

Hard boundaries:
  - constructs a package-local config (``corpus_dir = <package>/docs``); never
    reads or writes the live corpus
  - never writes ``source_queue.db`` / Sanity / Supabase; never auto-deletes
  - reuses the existing pipeline's fetch/parse/OCR/transcribe paths (best-effort
    network reads are allowed on the Mac Studio: Trafilatura / Docling / Wayback /
    media), but does not call ``upload.*`` / ``enrich.save`` / ``embed.save``
  - source inputs live under ``items/`` and are never modified; the entire
    ``docs/`` tree is worker-owned and regenerated each run.
"""
from __future__ import annotations

import copy
import dataclasses
import json
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    from runner.config import Config
    from runner.pipeline import analyze as analyze_mod
    from runner.pipeline import embed as embed_mod
    from runner.pipeline import enrich as enrich_mod
    from runner.pipeline import intake as intake_mod
    from runner.pipeline import offload_source
    from runner.pipeline import ollama_memory
    from runner.pipeline import preprocess as preprocess_mod
    from runner.pipeline.atomic_io import atomic_write_json, atomic_write_text
    from runner.pipeline.audit import write_analysis_audit, write_enrichment_audit
    from runner.pipeline.offload_worker import acquire_worker_lock, release_worker_lock
except ImportError:  # pragma: no cover - import shim
    from ..config import Config  # type: ignore[no-redef]
    from . import analyze as analyze_mod  # type: ignore[no-redef]
    from . import embed as embed_mod  # type: ignore[no-redef]
    from . import enrich as enrich_mod  # type: ignore[no-redef]
    from . import intake as intake_mod  # type: ignore[no-redef]
    from . import offload_source  # type: ignore[no-redef]
    from . import ollama_memory  # type: ignore[no-redef]
    from . import preprocess as preprocess_mod  # type: ignore[no-redef]
    from .atomic_io import atomic_write_json, atomic_write_text  # type: ignore[no-redef]
    from .audit import write_analysis_audit, write_enrichment_audit  # type: ignore[no-redef]
    from .offload_worker import acquire_worker_lock, release_worker_lock  # type: ignore[no-redef]


CLAIM_SOURCE_STATE = "inbox"

# Audit writers archive an existing file to "<stem>_<timestamp>.json" before
# overwriting. The source worker owns the *entire* docs/<doc_id>/ folder (inputs
# live under items/), so retry cleanup removes the whole regenerated folder — this
# also clears any stale analysis_audit_*.json / enrichment_audit_*.json backups
# that would otherwise be flagged as unexpected on a failed -> inbox retry.


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Package-local config + retry cleanup
# ---------------------------------------------------------------------------

def _make_package_config(config: Config, docs_root: Path):
    """Return a config whose ``corpus_dir`` points inside the package.

    Uses ``dataclasses.replace`` for the real ``Config`` dataclass; falls back to
    a shallow copy with ``corpus_dir`` reset for test doubles (SimpleNamespace).
    The live corpus is never touched.
    """
    if dataclasses.is_dataclass(config) and not isinstance(config, type):
        return dataclasses.replace(config, corpus_dir=docs_root)
    clone = copy.copy(config)
    try:
        clone.corpus_dir = docs_root
    except Exception:  # pragma: no cover - exotic config objects
        pass
    return clone


def _clean_worker_outputs(package_dir: Path) -> None:
    """Remove worker-owned outputs before a (re)run.

    The source worker owns all of ``docs/`` plus the root ``result_manifest.json``
    and ``worker_report.json``. Removing them makes a ``failed -> inbox`` retry
    start clean (no stale audit backups, no leftover partial artifacts) and lets
    the source-input verifier pass. Source inputs under ``items/`` and
    ``source_manifest.json`` are never touched.
    """
    package_dir = Path(package_dir)
    docs_dir = package_dir / "docs"
    if docs_dir.is_dir():
        shutil.rmtree(docs_dir, ignore_errors=True)
    for name in (offload_source.INGEST_RESULT_MANIFEST_NAME, "worker_report.json"):
        try:
            (package_dir / name).unlink(missing_ok=True)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Model alias resolution (for reports only — never selects behaviour)
# ---------------------------------------------------------------------------

def _analysis_model_alias(config: Config, llm: str) -> str:
    if llm == "litelm-heavy":
        return getattr(config, "litelm_analysis_model_heavy", "")
    if llm == "litelm-reasoning":
        return getattr(config, "litelm_analysis_model_reasoning", "")
    if llm.startswith("litelm"):
        return getattr(config, "litelm_analysis_model", "")
    if llm == "local-heavy":
        return getattr(config, "local_analysis_model_heavy", "")
    if llm == "local-reasoning":
        return getattr(config, "local_analysis_model_reasoning", "")
    return getattr(config, "local_analysis_model", "") if llm.startswith("local") else llm


def _embedding_model_alias(config: Config, llm: str) -> str:
    if llm.startswith("litelm"):
        return getattr(config, "litelm_embedding_model", "")
    return getattr(config, "embedding_model", "")


# ---------------------------------------------------------------------------
# Worker
# ---------------------------------------------------------------------------

def run_source_worker(
    package_dir: Path,
    config: Config,
    *,
    llm: str = "litelm",
    enrich_model: str | None = None,
    intake_fn=None,
    preprocess_fn=None,
    analyze_fn=None,
    enrich_fn=None,
    embed_fn=None,
    unload_analysis_fn=None,
    unload_enrichment_fn=None,
    unload_embedding_fn=None,
) -> dict:
    """Process one inbox ``source_package`` end to end. Returns a summary dict.

    ``*_fn`` parameters are dependency-injection seams for testing; in production
    they default to the real pipeline / unload functions.
    """
    intake_fn = intake_fn or (lambda **kw: intake_mod.run(**kw))
    preprocess_fn = preprocess_fn or (lambda intake, **kw: preprocess_mod.run(intake, **kw))
    analyze_fn = analyze_fn or (lambda preprocess, **kw: analyze_mod.run(preprocess, **kw))
    enrich_fn = enrich_fn or (lambda doc_id, preprocess, analysis, **kw: enrich_mod.run(doc_id, preprocess, analysis, **kw))
    if embed_fn is None:
        def embed_fn(text, config):  # noqa: ANN001
            if llm.startswith("litelm"):
                return embed_mod.run_litelm(text, config)
            return embed_mod.run(text, config)
    unload_analysis_fn = unload_analysis_fn or ollama_memory.unload_litelm_analysis
    unload_enrichment_fn = unload_enrichment_fn or ollama_memory.unload_litelm_enrichment
    unload_embedding_fn = unload_embedding_fn or ollama_memory.unload_litelm_embedding

    package_dir = Path(package_dir)
    offload_root = package_dir.parent.parent
    from_state = package_dir.parent.name
    package_id = package_dir.name
    enrich_alias = enrich_model or getattr(config, "litelm_enrichment_model", "") or "lexicon-llm"
    analysis_alias = _analysis_model_alias(config, llm)
    embed_alias = _embedding_model_alias(config, llm)

    summary: dict = {
        "package_id": package_id,
        "package_dir": str(package_dir),
        "package_kind": offload_source.PACKAGE_KIND_INGEST,
        "final_state": from_state,
        "ok": False,
        "result_manifest_written": False,
        "llm": llm,
        "enrich_model": enrich_alias,
        "documents": [],
        "unloads": [],
        "errors": [],
    }

    if from_state != CLAIM_SOURCE_STATE:
        summary["errors"].append(f"not_in_inbox:{from_state}")
        return summary

    lock = acquire_worker_lock(offload_root)
    try:
        # ── Verify source inputs (retry-tolerant), then clean worker outputs ──
        report = offload_source.verify_source_inputs(package_dir)
        if not report["ok"]:
            problems = list(report["errors"]) + [f"unexpected:{u}" for u in report["unexpected"]]
            summary["errors"].append(f"source_verify_failed:{';'.join(problems) or 'unknown'}")
            return summary
        _clean_worker_outputs(package_dir)

        # ── Claim: inbox -> processing ──
        try:
            processing_dir = offload_source.move_source_package_state(
                offload_root=offload_root, package_id=package_id,
                from_state=CLAIM_SOURCE_STATE, to_state="processing",
            )
        except (ValueError, FileNotFoundError, FileExistsError) as exc:
            summary["errors"].append(f"claim_failed:{exc}")
            return summary

        summary["package_dir"] = str(processing_dir)
        summary["final_state"] = "processing"

        manifest = offload_source.load_source_manifest(processing_dir)
        docs_root = processing_dir / "docs"
        worker_config = _make_package_config(config, docs_root)

        docs: list[dict] = []
        for record in manifest.items:
            docs.append({
                "doc_id": record.doc_id,
                "record": record,
                "doc_dir": docs_root / record.doc_id,
                "preprocess": None,
                "analysis": None,
                "local_source_filename": "",
                "stages": {},
                "status": "pending",
                "error": "",
            })

        if not docs:
            summary["errors"].append("package_has_no_documents")
            return _finalize_failed(processing_dir, offload_root, package_id, summary, docs)

        # ── Stage 0: intake + preprocess (all docs) ──
        for doc in docs:
            record = doc["record"]
            try:
                if record.source_kind == "url":
                    source = record.url
                else:
                    source = str(processing_dir / record.relative_path)
                started = time.perf_counter()
                intake_result = intake_fn(
                    source=source, tier=None, batch=package_id,
                    config=worker_config, force_doc_id=doc["doc_id"],
                    source_url=record.url,
                )
                preprocess_result = preprocess_fn(intake_result, config=worker_config)
                doc["preprocess"] = preprocess_result
                local_copy = getattr(intake_result, "local_copy_path", "") or ""
                doc["local_source_filename"] = Path(local_copy).name if local_copy else ""
                doc["stages"]["intake"] = {"status": "succeeded", "source_kind": record.source_kind}
                blocked_error = _preprocess_blocked_error(preprocess_result)
                preprocess_status = "blocked" if blocked_error else "succeeded"
                doc["stages"]["preprocess"] = {
                    "status": preprocess_status,
                    "duration_ms": int((time.perf_counter() - started) * 1000),
                }
                if blocked_error:
                    doc["status"] = "failed"
                    doc["error"] = blocked_error
            except Exception as exc:  # noqa: BLE001
                doc["status"] = "failed"
                doc["error"] = f"intake_preprocess_failed:{exc}"
                doc["stages"]["preprocess"] = {"status": "failed"}
        if not _any_success(docs):
            return _finalize_failed(processing_dir, offload_root, package_id, summary, docs)

        # ── Stage A: analysis (all docs) ──
        for doc in docs:
            if doc["status"] == "failed":
                continue
            started = time.perf_counter()
            try:
                audit: dict = {}
                result = analyze_fn(doc["preprocess"], llm=llm, config=worker_config, _audit=audit)
                if hasattr(result, "primary"):  # DualAnalysisResult
                    result = result.primary
                atomic_write_text(
                    doc["doc_dir"] / "analysis.json",
                    result.model_dump_json(indent=2, by_alias=True) + "\n",
                )
                write_analysis_audit(
                    doc["doc_dir"], audit, result,
                    doc_id=doc["doc_id"], prompt_version=analyze_mod.PROMPT_VERSION,
                )
                doc["analysis"] = result
                doc["stages"]["analysis"] = {
                    "status": "succeeded", "model": analysis_alias,
                    "duration_ms": int((time.perf_counter() - started) * 1000),
                }
            except Exception as exc:  # noqa: BLE001
                doc["status"] = "failed"
                doc["error"] = f"analysis_failed:{exc}"
                doc["stages"]["analysis"] = {"status": "failed", "model": analysis_alias}
        _record_unload(summary, "analysis", lambda: unload_analysis_fn(worker_config, llm))
        if not _any_success(docs):
            return _finalize_failed(processing_dir, offload_root, package_id, summary, docs)

        # ── Stage B: enrichment (all docs) ──
        for doc in docs:
            if doc["status"] == "failed":
                continue
            started = time.perf_counter()
            try:
                audit = {}
                result = enrich_fn(
                    doc["doc_id"], doc["preprocess"], doc["analysis"],
                    config=worker_config, llm=llm, model=enrich_model, _audit=audit,
                )
                atomic_write_text(
                    doc["doc_dir"] / "enrichment.json",
                    enrich_mod.enrichment_json_for_save(
                        result,
                        doc["doc_dir"],
                        trailing_newline=True,
                    ),
                )
                write_enrichment_audit(doc["doc_dir"], audit, result)
                doc["stages"]["enrichment"] = {
                    "status": "succeeded", "model": enrich_alias,
                    "duration_ms": int((time.perf_counter() - started) * 1000),
                }
            except Exception as exc:  # noqa: BLE001
                doc["status"] = "failed"
                doc["error"] = f"enrichment_failed:{exc}"
                doc["stages"]["enrichment"] = {"status": "failed", "model": enrich_alias}
        _record_unload(summary, "enrichment", lambda: unload_enrichment_fn(worker_config, enrich_alias))
        if not _any_success(docs):
            return _finalize_failed(processing_dir, offload_root, package_id, summary, docs)

        # ── Stage C: embedding (all docs) ──
        for doc in docs:
            if doc["status"] == "failed":
                continue
            started = time.perf_counter()
            try:
                vector = embed_fn(doc["preprocess"].text, worker_config)
                if not isinstance(vector, list) or not vector:
                    raise ValueError("embedding model returned an empty vector")
                atomic_write_json(doc["doc_dir"] / "embedding.json", {
                    "doc_id": doc["doc_id"], "model": embed_alias,
                    "dimension": len(vector), "vector": vector,
                })
                doc["stages"]["embedding"] = {
                    "status": "succeeded", "model": embed_alias,
                    "duration_ms": int((time.perf_counter() - started) * 1000),
                }
            except Exception as exc:  # noqa: BLE001
                doc["status"] = "failed"
                doc["error"] = f"embedding_failed:{exc}"
                doc["stages"]["embedding"] = {"status": "failed", "model": embed_alias}
        _record_unload(summary, "embedding", lambda: unload_embedding_fn(worker_config))
        if not _any_success(docs):
            return _finalize_failed(processing_dir, offload_root, package_id, summary, docs)

        # ── Carry queue linkage + validate produced artifacts ──
        for doc in docs:
            if doc["status"] == "failed":
                continue
            src_item = processing_dir / "items" / doc["doc_id"] / offload_source.SOURCE_ITEM_NAME
            if src_item.is_file():
                try:
                    shutil.copy2(src_item, doc["doc_dir"] / offload_source.SOURCE_ITEM_NAME)
                except OSError as exc:
                    doc["status"] = "failed"
                    doc["error"] = f"source_item_copy_failed:{exc}"
                    continue
            unexpected = _unexpected_artifacts(doc)
            if unexpected:
                doc["status"] = "failed"
                doc["error"] = "unexpected_pipeline_artifact:" + ",".join(unexpected)
        if not _any_success(docs):
            return _finalize_failed(processing_dir, offload_root, package_id, summary, docs)

        return _finalize_success(processing_dir, offload_root, package_id, summary, docs)
    finally:
        release_worker_lock(offload_root, lock)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _record_unload(summary: dict, stage: str, call) -> None:
    try:
        ok = bool(call())
        summary["unloads"].append({"stage": stage, "ok": ok})
    except Exception as exc:  # noqa: BLE001
        summary["unloads"].append({"stage": stage, "ok": False, "error": str(exc)})


def _allowed_artifact(name: str, local_source_filename: str) -> bool:
    if name in offload_source.ALLOWED_INGEST_ARTIFACTS:
        return True
    return bool(local_source_filename) and name == local_source_filename


def _unexpected_artifacts(doc: dict) -> list[str]:
    """Files under docs/<doc_id>/ not in the allow-list (excluding worker_report.json,
    which is written later). Subdirectories are always unexpected."""
    doc_dir = doc["doc_dir"]
    if not doc_dir.is_dir():
        return ["<missing_doc_dir>"]
    out: list[str] = []
    for child in sorted(doc_dir.iterdir()):
        if child.name == "worker_report.json":
            continue  # written in the success finalizer
        if child.is_dir() or not _allowed_artifact(child.name, doc["local_source_filename"]):
            out.append(child.name)
    return out


def _present_artifact_labels(doc: dict) -> list[str]:
    doc_dir = doc["doc_dir"]
    labels = []
    for child in sorted(doc_dir.iterdir()):
        if child.is_file() and (
            _allowed_artifact(child.name, doc["local_source_filename"])
        ):
            labels.append(child.name)
    return labels


def _doc_status(doc: dict) -> str:
    return "failed" if doc["status"] == "failed" else "succeeded"


def _successful_docs(docs: list[dict]) -> list[dict]:
    return [d for d in docs if d["status"] != "failed"]


def _any_success(docs: list[dict]) -> bool:
    return bool(_successful_docs(docs))


def _preprocess_blocked_error(preprocess_result) -> str:
    quality = str(getattr(preprocess_result, "quality", "") or "").lower()
    text = str(getattr(preprocess_result, "text", "") or "")
    if quality == "blocked":
        return "preprocess_blocked:capture_needed"
    if not text.strip():
        return "preprocess_empty_text:capture_needed"
    return ""


def _root_report_payload(summary: dict, docs: list[dict], *, worker_status: str) -> dict:
    return {
        "package_id": summary["package_id"],
        "package_kind": offload_source.PACKAGE_KIND_INGEST,
        "worker_status": worker_status,
        "produced_at": _now_iso(),
        "llm": summary["llm"],
        "enrich_model": summary["enrich_model"],
        "unloads": summary["unloads"],
        "errors": summary["errors"],
        "documents": [
            {
                "doc_id": d["doc_id"],
                "status": _doc_status(d) if worker_status in ("failed", "partial") else "succeeded",
                "stages": d["stages"],
                "error": d["error"],
            }
            for d in docs
        ],
    }


def _finalize_failed(processing_dir, offload_root, package_id, summary, docs) -> dict:
    """Write the root worker report (no result_manifest) and move to failed."""
    report = _root_report_payload(summary, docs, worker_status="failed")
    try:
        atomic_write_json(processing_dir / "worker_report.json", report)
    except Exception as exc:  # noqa: BLE001
        summary["errors"].append(f"root_report_write_failed:{exc}")
    summary["documents"] = report["documents"]
    summary["ok"] = False
    summary["result_manifest_written"] = False
    try:
        failed_dir = offload_source.move_source_package_state(
            offload_root=offload_root, package_id=package_id,
            from_state="processing", to_state="failed",
        )
        summary["final_state"] = "failed"
        summary["package_dir"] = str(failed_dir)
    except Exception as exc:  # noqa: BLE001
        summary["errors"].append(f"move_to_failed_failed:{exc}")
    return summary


def _finalize_success(processing_dir, offload_root, package_id, summary, docs) -> dict:
    """Write successful docs, an ingest_result manifest, then move to outbox.

    Failed docs are excluded from ``result_manifest.json`` (so import only writes
    completed corpus folders) but remain in the root ``worker_report.json``.
    """
    succeeded_docs = _successful_docs(docs)
    failed_docs = [d for d in docs if d["status"] == "failed"]
    if not succeeded_docs:
        return _finalize_failed(processing_dir, offload_root, package_id, summary, docs)

    result_documents = []
    for doc in succeeded_docs:
        doc_dir = doc["doc_dir"]
        record = doc["record"]
        rel_prefix = f"docs/{doc['doc_id']}"

        # Per-doc worker report — importable provenance, no raw extracted text.
        core_labels = [
            label for label in _present_artifact_labels(doc) if label != "worker_report.json"
        ]
        core_artifacts = [
            {"label": label, "sha256": offload_source.sha256_file(doc_dir / label),
             "bytes": (doc_dir / label).stat().st_size}
            for label in core_labels
        ]
        per_doc_report = {
            "doc_id": doc["doc_id"],
            "package_id": package_id,
            "package_kind": offload_source.PACKAGE_KIND_INGEST,
            "status": "succeeded",
            "produced_at": _now_iso(),
            "llm": summary["llm"],
            "enrich_model": summary["enrich_model"],
            "source_kind": record.source_kind,
            "queue_item_id": record.queue_item_id,
            "url_hash": record.url_hash,
            "source_url": record.url,
            "declared_source_type": record.declared_source_type,
            "local_source_filename": doc["local_source_filename"],
            "stages": doc["stages"],
            "artifacts": core_artifacts,
        }
        atomic_write_json(doc_dir / "worker_report.json", per_doc_report)

        # result_manifest entry: every allow-listed artifact present (incl.
        # worker_report.json and the local source copy) with fresh hashes.
        artifacts = []
        for label in _present_artifact_labels(doc):
            p = doc_dir / label
            artifacts.append({
                "label": label,
                "relative_path": f"{rel_prefix}/{label}",
                "sha256": offload_source.sha256_file(p),
                "bytes": p.stat().st_size,
            })
        result_documents.append({
            "doc_id": doc["doc_id"],
            "queue_item_id": record.queue_item_id,
            "url_hash": record.url_hash,
            "source_url": record.url,
            "declared_source_type": record.declared_source_type,
            "local_source_filename": doc["local_source_filename"],
            "artifacts": artifacts,
        })

    result_manifest = {
        "schema_version": offload_source.INGEST_RESULT_SCHEMA_VERSION,
        "package_id": package_id,
        "package_kind": offload_source.PACKAGE_KIND_INGEST,
        "produced_at": _now_iso(),
        "partial": bool(failed_docs),
        "omitted_documents": [
            {
                "doc_id": d["doc_id"],
                "status": "failed",
                "error": d["error"],
                "stages": d["stages"],
            }
            for d in failed_docs
        ],
        "documents": result_documents,
    }
    atomic_write_json(processing_dir / offload_source.INGEST_RESULT_MANIFEST_NAME, result_manifest)
    summary["result_manifest_written"] = True

    atomic_write_json(
        processing_dir / "worker_report.json",
        _root_report_payload(
            summary, docs, worker_status=("partial" if failed_docs else "succeeded")
        ),
    )

    summary["documents"] = [
        {"doc_id": d["doc_id"], "status": _doc_status(d), "stages": d["stages"], "error": d["error"]}
        for d in docs
    ]
    summary["partial"] = bool(failed_docs)
    summary["succeeded_count"] = len(succeeded_docs)
    summary["failed_count"] = len(failed_docs)

    try:
        outbox_dir = offload_source.move_source_package_state(
            offload_root=offload_root, package_id=package_id,
            from_state="processing", to_state="outbox",
        )
        summary["final_state"] = "outbox"
        summary["package_dir"] = str(outbox_dir)
        summary["ok"] = True
    except Exception as exc:  # noqa: BLE001
        summary["errors"].append(f"move_to_outbox_failed:{exc}")
        summary["ok"] = False
    return summary
