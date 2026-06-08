"""Mac Studio offload worker — runs analysis/enrichment/embedding on a package.

Runs on the Mac Studio against a single ``inbox`` offload package. It claims the
package (``inbox -> processing``), runs the model-heavy stages per document
against the local LiteLLM/Ollama stack, unloads each heavy model between stages,
writes the allowed result artifacts + a ``result_manifest.json`` into the
package, and moves it to ``outbox`` on full success or ``failed`` on any failure.

Hard boundaries (kept by what this module imports and does NOT do):
  - never reads or writes ``config.corpus_dir`` — all I/O is inside the package
  - never writes Sanity/Supabase; never touches ``source_queue.db``
  - never fetches/parses/OCRs/transcribes — it consumes only prepared package
    artifacts (``intake.json`` / ``preprocess.json`` / ``extracted.txt|md``)
  - one heavy model resident at a time: strictly sequential stage batches, with
    an unload between stages, guarded by a PID worker lock so two workers cannot
    load heavy models concurrently.

It does NOT call ``enrich.save`` / ``embed.save`` / ``upload.*`` (those target the
corpus / external services); it serialises the in-memory results into the package
itself. Lexicon context (a Sanity read inside analyze/enrich) is best-effort and
the worker still runs if Sanity is unavailable.
"""
from __future__ import annotations

import json
import os
import time
from dataclasses import fields as _dc_fields
from datetime import datetime, timezone
from pathlib import Path

try:
    from runner.config import Config
    from runner.models.document import AnalysisResult, PreprocessResult
    from runner.models.enrichment import EnrichmentResult
    from runner.pipeline import analyze as analyze_mod
    from runner.pipeline import embed as embed_mod
    from runner.pipeline import enrich as enrich_mod
    from runner.pipeline import offload
    from runner.pipeline import ollama_memory
    from runner.pipeline.atomic_io import atomic_write_json, atomic_write_text
    from runner.pipeline.audit import write_analysis_audit, write_enrichment_audit
except ImportError:  # pragma: no cover - import shim
    from ..config import Config  # type: ignore[no-redef]
    from ..models.document import AnalysisResult, PreprocessResult  # type: ignore[no-redef]
    from ..models.enrichment import EnrichmentResult  # type: ignore[no-redef]
    from . import analyze as analyze_mod  # type: ignore[no-redef]
    from . import embed as embed_mod  # type: ignore[no-redef]
    from . import enrich as enrich_mod  # type: ignore[no-redef]
    from . import offload  # type: ignore[no-redef]
    from . import ollama_memory  # type: ignore[no-redef]
    from .atomic_io import atomic_write_json, atomic_write_text  # type: ignore[no-redef]
    from .audit import write_analysis_audit, write_enrichment_audit  # type: ignore[no-redef]


WORKER_LOCK_NAME = ".worker.lock"
CLAIM_SOURCE_STATE = "inbox"

# Per-doc artifacts the worker writes under docs/<doc_id>/ on a successful run.
# Every one is in offload.ALLOWED_IMPORT_ARTIFACTS and is listed in result_manifest.
PER_DOC_OUTPUT_ARTIFACTS = (
    "analysis.json",
    "analysis_audit.json",
    "enrichment.json",
    "enrichment_audit.json",
    "embedding.json",
    "worker_report.json",
)

# The audit writers (write_analysis_audit / write_enrichment_audit) archive an
# existing file to "<stem>_<timestamp>.json" before overwriting. On a
# failed -> inbox retry that would accumulate unmanifested backups that the
# importer's unexpected-file check rejects. These globs match only those backups
# (note the trailing "_": distinct from the legit "<stem>.json" outputs).
_WORKER_BACKUP_GLOBS = (
    "analysis_audit_*.json",
    "enrichment_audit_*.json",
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean_stale_worker_outputs(doc_dir: Path) -> None:
    """Remove worker-owned outputs + audit backups left by a prior (failed) run.

    Only the worker output set and the audit-archive pattern for those exact
    audits are removed — never input/source/context artifacts. This lets a
    failed -> inbox retry produce a package with no unmanifested extra files so
    the importer still accepts it.
    """
    doc_dir = Path(doc_dir)
    if not doc_dir.is_dir():
        return
    for name in PER_DOC_OUTPUT_ARTIFACTS:
        try:
            (doc_dir / name).unlink(missing_ok=True)
        except OSError:
            pass
    for pattern in _WORKER_BACKUP_GLOBS:
        for stray in doc_dir.glob(pattern):
            try:
                stray.unlink(missing_ok=True)
            except OSError:
                pass


# ---------------------------------------------------------------------------
# Worker lock (prevents concurrent heavy model loads)
# ---------------------------------------------------------------------------

def _worker_lock_path(offload_root: Path) -> Path:
    return Path(offload_root) / WORKER_LOCK_NAME


def _pid_alive(pid) -> bool:
    try:
        pid_int = int(pid or 0)
    except (TypeError, ValueError):
        return False
    if pid_int <= 0:
        return False
    try:
        os.kill(pid_int, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def acquire_worker_lock(offload_root: Path) -> dict:
    """Acquire the offload-root worker lock or raise ``RuntimeError``.

    Clears a stale lock whose PID is no longer running. The lock spans one worker
    invocation so two workers cannot load heavy models at the same time.
    """
    path = _worker_lock_path(offload_root)
    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            existing = None
        if existing and _pid_alive(existing.get("pid")):
            raise RuntimeError(
                f"Another offload worker is already running "
                f"(PID {existing.get('pid')}, started {existing.get('started_at')})."
            )
        path.unlink(missing_ok=True)  # stale lock — clear it
    path.parent.mkdir(parents=True, exist_ok=True)
    lock = {"pid": os.getpid(), "started_at": _now_iso()}
    atomic_write_json(path, lock)
    return lock


def release_worker_lock(offload_root: Path, lock: dict | None = None) -> None:
    path = _worker_lock_path(offload_root)
    if not path.exists():
        return
    if lock is None:
        path.unlink(missing_ok=True)
        return
    try:
        current = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        path.unlink(missing_ok=True)
        return
    if str(current.get("pid", "")) == str(lock.get("pid", "")):
        path.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Input reconstruction (package-only; never touches corpus_dir)
# ---------------------------------------------------------------------------

def _load_package_preprocess(doc_dir: Path, doc_id: str) -> PreprocessResult:
    """Rebuild a PreprocessResult from the package's preprocess.json + extracted text."""
    data: dict = {}
    pp_path = doc_dir / "preprocess.json"
    if pp_path.exists():
        try:
            loaded = json.loads(pp_path.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                data = loaded
        except Exception:
            data = {}

    text = data.get("text") or ""
    if not text:
        for name in ("extracted.txt", "extracted.md"):
            p = doc_dir / name
            if p.exists():
                text = p.read_text(encoding="utf-8")
                break

    known = {f.name for f in _dc_fields(PreprocessResult)}
    kwargs = {k: v for k, v in data.items() if k in known}
    kwargs.pop("page_intel", None)  # nested dataclass — don't reconstruct from raw dict
    kwargs["doc_id"] = doc_id
    kwargs["tool_used"] = kwargs.get("tool_used") or "unknown"
    kwargs["quality"] = kwargs.get("quality") or "low"
    kwargs["text"] = text
    return PreprocessResult(**kwargs)


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

def run_offload_worker(
    package_dir: Path,
    config: Config,
    *,
    llm: str = "litelm",
    enrich_model: str | None = None,
    analyze_fn=None,
    embed_fn=None,
    enrich_fn=None,
    unload_analysis_fn=None,
    unload_enrichment_fn=None,
    unload_embedding_fn=None,
) -> dict:
    """Process one inbox offload package end to end. Returns a summary dict.

    ``*_fn`` parameters are dependency-injection seams for testing; in production
    they default to the real compute / unload functions.
    """
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

    summary: dict = {
        "package_id": package_id,
        "package_dir": str(package_dir),
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
        # ── Stage 0: claim (inbox -> processing) with integrity verification ──
        try:
            processing_dir = offload.transition_package_state(
                offload_root=offload_root,
                package_id=package_id,
                from_state=CLAIM_SOURCE_STATE,
                to_state="processing",
                verify=True,
            )
        except (ValueError, FileNotFoundError, FileExistsError) as exc:
            summary["errors"].append(f"claim_failed:{exc}")
            return summary

        summary["package_dir"] = str(processing_dir)
        summary["final_state"] = "processing"
        manifest = offload.load_manifest(processing_dir)

        # Build per-doc working state.
        docs: list[dict] = []
        for record in manifest.documents:
            doc_id = record.doc_id
            doc_dir = processing_dir / record.package_dir
            docs.append({
                "doc_id": doc_id,
                "doc_dir": doc_dir,
                "preprocess": None,
                "analysis": None,
                "stages": {},
                "status": "pending",
                "error": "",
            })

        if not docs:
            summary["errors"].append("package_has_no_documents")
            return _finalize_failed(processing_dir, offload_root, package_id, summary, docs)

        # Reconstruct inputs (package-only).
        for doc in docs:
            try:
                doc["preprocess"] = _load_package_preprocess(doc["doc_dir"], doc["doc_id"])
            except Exception as exc:  # noqa: BLE001
                doc["status"] = "failed"
                doc["error"] = f"preprocess_load_failed:{exc}"
        if any(d["status"] == "failed" for d in docs):
            return _finalize_failed(processing_dir, offload_root, package_id, summary, docs)

        # Clear any worker-owned outputs / audit backups left by a prior (failed)
        # run before re-writing, so a failed -> inbox retry stays importable.
        for doc in docs:
            _clean_stale_worker_outputs(doc["doc_dir"])

        analysis_alias = _analysis_model_alias(config, llm)
        embed_alias = _embedding_model_alias(config, llm)

        # ── Stage A: analysis (all docs) ──
        for doc in docs:
            started = time.perf_counter()
            try:
                audit: dict = {}
                result = analyze_fn(doc["preprocess"], llm=llm, config=config, _audit=audit)
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
        _record_unload(summary, "analysis", lambda: unload_analysis_fn(config, llm))
        if any(d["status"] == "failed" for d in docs):
            return _finalize_failed(processing_dir, offload_root, package_id, summary, docs)

        # ── Stage B: enrichment (all docs) ──
        for doc in docs:
            started = time.perf_counter()
            try:
                audit = {}
                result = enrich_fn(
                    doc["doc_id"], doc["preprocess"], doc["analysis"],
                    config=config, llm=llm, model=enrich_model, _audit=audit,
                )
                atomic_write_text(
                    doc["doc_dir"] / "enrichment.json",
                    result.model_dump_json(indent=2, by_alias=True) + "\n",
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
        _record_unload(summary, "enrichment", lambda: unload_enrichment_fn(config, enrich_alias))
        if any(d["status"] == "failed" for d in docs):
            return _finalize_failed(processing_dir, offload_root, package_id, summary, docs)

        # ── Stage C: embedding (all docs) ──
        for doc in docs:
            started = time.perf_counter()
            try:
                vector = embed_fn(doc["preprocess"].text, config)
                if not isinstance(vector, list) or not vector:
                    raise ValueError("embedding model returned an empty vector")
                payload = {
                    "doc_id": doc["doc_id"],
                    "model": embed_alias,
                    "dimension": len(vector),
                    "vector": vector,
                }
                atomic_write_json(doc["doc_dir"] / "embedding.json", payload)
                doc["stages"]["embedding"] = {
                    "status": "succeeded", "model": embed_alias,
                    "duration_ms": int((time.perf_counter() - started) * 1000),
                }
            except Exception as exc:  # noqa: BLE001
                doc["status"] = "failed"
                doc["error"] = f"embedding_failed:{exc}"
                doc["stages"]["embedding"] = {"status": "failed", "model": embed_alias}
        _record_unload(summary, "embedding", lambda: unload_embedding_fn(config))
        if any(d["status"] == "failed" for d in docs):
            return _finalize_failed(processing_dir, offload_root, package_id, summary, docs)

        # ── Full success ──
        return _finalize_success(processing_dir, offload_root, package_id, summary, docs)
    finally:
        release_worker_lock(offload_root, lock)


def _record_unload(summary: dict, stage: str, call) -> None:
    """Run an unload best-effort; record outcome. Unload failure never fails a doc."""
    try:
        ok = bool(call())
        summary["unloads"].append({"stage": stage, "ok": ok})
    except Exception as exc:  # noqa: BLE001
        summary["unloads"].append({"stage": stage, "ok": False, "error": str(exc)})


def _doc_status(doc: dict) -> str:
    return "failed" if doc["status"] == "failed" else "succeeded"


def _root_report_payload(summary: dict, docs: list[dict], *, worker_status: str) -> dict:
    return {
        "package_id": summary["package_id"],
        "worker_status": worker_status,
        "produced_at": _now_iso(),
        "llm": summary["llm"],
        "enrich_model": summary["enrich_model"],
        "unloads": summary["unloads"],
        "errors": summary["errors"],
        "documents": [
            {
                "doc_id": d["doc_id"],
                "status": _doc_status(d) if worker_status == "failed" else "succeeded",
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
        failed_dir = offload.transition_package_state(
            offload_root=offload_root, package_id=package_id,
            from_state="processing", to_state="failed", verify=False,
        )
        summary["final_state"] = "failed"
        summary["package_dir"] = str(failed_dir)
    except Exception as exc:  # noqa: BLE001
        summary["errors"].append(f"move_to_failed_failed:{exc}")
    return summary


def _finalize_success(processing_dir, offload_root, package_id, summary, docs) -> dict:
    """Write per-doc worker reports + result_manifest, then move to outbox."""
    result_documents = []
    for doc in docs:
        doc_dir = doc["doc_dir"]
        rel = Path(doc_dir.name)  # = doc_id under docs/
        rel_prefix = f"docs/{doc['doc_id']}"

        # Per-doc worker report (importable provenance — no raw extracted text).
        core_labels = [a for a in PER_DOC_OUTPUT_ARTIFACTS if a != "worker_report.json"]
        core_artifacts = []
        for label in core_labels:
            p = doc_dir / label
            core_artifacts.append({
                "label": label,
                "sha256": offload.sha256_file(p),
                "bytes": p.stat().st_size,
            })
        per_doc_report = {
            "doc_id": doc["doc_id"],
            "package_id": package_id,
            "status": "succeeded",
            "produced_at": _now_iso(),
            "llm": summary["llm"],
            "enrich_model": summary["enrich_model"],
            "stages": doc["stages"],
            "artifacts": core_artifacts,
        }
        atomic_write_json(doc_dir / "worker_report.json", per_doc_report)

        # result_manifest entry: all six per-doc artifacts with fresh hashes.
        artifacts = []
        for label in PER_DOC_OUTPUT_ARTIFACTS:
            p = doc_dir / label
            artifacts.append({
                "label": label,
                "relative_path": f"{rel_prefix}/{label}",
                "sha256": offload.sha256_file(p),
                "bytes": p.stat().st_size,
            })
        result_documents.append({"doc_id": doc["doc_id"], "artifacts": artifacts})

    result_manifest = {
        "schema_version": offload.RESULT_SCHEMA_VERSION,
        "package_id": package_id,
        "package_kind": offload.PACKAGE_KIND_RESULT,
        "produced_at": _now_iso(),
        "documents": result_documents,
    }
    atomic_write_json(processing_dir / offload.RESULT_MANIFEST_NAME, result_manifest)
    summary["result_manifest_written"] = True

    atomic_write_json(
        processing_dir / "worker_report.json",
        _root_report_payload(summary, docs, worker_status="succeeded"),
    )

    summary["documents"] = [
        {"doc_id": d["doc_id"], "status": "succeeded", "stages": d["stages"], "error": ""}
        for d in docs
    ]

    try:
        outbox_dir = offload.transition_package_state(
            offload_root=offload_root, package_id=package_id,
            from_state="processing", to_state="outbox", verify=True,
        )
        summary["final_state"] = "outbox"
        summary["package_dir"] = str(outbox_dir)
        summary["ok"] = True
    except Exception as exc:  # noqa: BLE001
        summary["errors"].append(f"move_to_outbox_failed:{exc}")
        summary["ok"] = False
    return summary
