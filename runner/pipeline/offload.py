"""Offload package primitives for Mac Studio batch processing.

This module implements the first, conservative offload mode:

``analysis_package``
    The MacBook has already fetched/extracted/preprocessed the source. The
    package contains bounded document artifacts for the Mac Studio worker to run
    analysis/enrichment/embedding locally, then return a result package. It does
    not sync the live corpus or ``source_queue.db``.

No function here deletes packages automatically. Manual cleanup is intentional:
the researcher needs a recovery path if import or verification fails.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Literal

from .atomic_io import atomic_write_bytes, atomic_write_json


PACKAGE_SCHEMA_VERSION = 1
PACKAGE_KIND_ANALYSIS = "analysis_package"
LIFECYCLE_STATES = ("inbox", "processing", "outbox", "imported", "failed", "archive")
_SAFE_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")

REQUIRED_INPUT_ARTIFACTS = (
    "intake.json",
    "preprocess.json",
    "extracted_text",
)

OPTIONAL_CONTEXT_ARTIFACTS = (
    "wayback.json",
    "preservation_status.json",
    "source.html",
    "html_snapshot.json",
    "media_metadata.json",
    "video_metadata.json",
    "transcript_chunks.json",
    "transcript_versions.json",
    "transcript_comparison.json",
    "media_comments.json",
)

# ── Lifecycle transition graph ────────────────────────────────────────────────
# Explicit, reversible-where-sensible state machine over LIFECYCLE_STATES. No
# transition deletes anything. ``failed`` and ``archive`` are reachable from any
# active state so a broken package can always be quarantined or retained.
ALLOWED_TRANSITIONS: dict[str, frozenset[str]] = {
    "inbox":      frozenset({"processing", "failed", "archive"}),
    "processing": frozenset({"outbox", "inbox", "failed", "archive"}),  # inbox = release
    "outbox":     frozenset({"imported", "failed", "archive"}),
    "imported":   frozenset({"archive"}),
    "failed":     frozenset({"inbox", "processing", "archive"}),        # inbox/processing = retry
    "archive":    frozenset(),                                          # terminal
}

# Moves into these states are quarantine/retention and must work even when the
# package fails integrity verification (so a tampered package can be set aside).
_NO_VERIFY_TARGET_STATES: frozenset[str] = frozenset({"failed", "archive"})

# ── Result (returned) package contract ────────────────────────────────────────
RESULT_SCHEMA_VERSION = 1
PACKAGE_KIND_RESULT = "analysis_result"
RESULT_MANIFEST_NAME = "result_manifest.json"

# Only these worker-produced artifacts may be imported into the corpus. Mirrors
# ``_worker_contract()["worker_may_write"]``. Anything else is refused.
ALLOWED_IMPORT_ARTIFACTS: frozenset[str] = frozenset({
    "analysis.json",
    "analysis_audit.json",
    "enrichment.json",
    "enrichment_audit.json",
    "embedding.json",
    "worker_report.json",
})

# Import is only permitted from a package whose manifest + folder lifecycle is
# this state (worker completed and returned outputs).
IMPORT_SOURCE_STATE = "outbox"


@dataclass(frozen=True)
class ArtifactRecord:
    label: str
    relative_path: str
    present: bool
    sha256: str = ""
    bytes: int = 0
    required: bool = False


@dataclass(frozen=True)
class DocumentPackageRecord:
    doc_id: str
    source_dir: str
    package_dir: str
    ready_for_worker: bool
    missing_required: list[str]
    source_stage_summary: dict
    artifacts: list[ArtifactRecord]


@dataclass(frozen=True)
class OffloadPackageManifest:
    schema_version: int
    package_id: str
    package_kind: Literal["analysis_package"]
    lifecycle_state: str
    created_at: str
    retention_policy: str
    privacy_policy: dict
    worker_contract: dict
    documents: list[DocumentPackageRecord]

    def to_dict(self) -> dict:
        return asdict(self)


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def default_package_id(prefix: str = "offload") -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return f"{prefix}-{stamp}-{uuid.uuid4().hex[:8]}"


def normalise_doc_id(raw_doc_id: str) -> str:
    """Return a safe corpus document id or raise ``ValueError``.

    Existing runner commands commonly accept either ``abc123`` or ``doc-abc123``
    from Sanity-facing contexts.  Offload packages use local corpus directory
    names, so this preserves the existing ``doc-`` convenience while rejecting
    path traversal and path separators.
    """
    doc_id = str(raw_doc_id).strip().removeprefix("doc-")
    if not doc_id:
        raise ValueError("Empty doc_id is not valid for offload packaging")
    if (
        doc_id in {".", ".."}
        or "/" in doc_id
        or "\\" in doc_id
        or not _SAFE_ID_RE.match(doc_id)
    ):
        raise ValueError(f"Unsafe doc_id for offload package: {raw_doc_id!r}")
    return doc_id


def validate_package_id(package_id: str) -> str:
    package_id = str(package_id).strip()
    if not package_id:
        raise ValueError("Empty package_id is not valid")
    if (
        package_id in {".", ".."}
        or "/" in package_id
        or "\\" in package_id
        or not _SAFE_ID_RE.match(package_id)
    ):
        raise ValueError(f"Unsafe package_id: {package_id!r}")
    return package_id


def validate_manifest_relative_path(value: str, *, field: str) -> str:
    """Return a safe package-relative path from a manifest or raise ValueError."""
    raw = str(value).strip()
    if not raw:
        raise ValueError(f"Empty manifest path: {field}")
    path = Path(raw)
    if (
        path.is_absolute()
        or ".." in path.parts
        or "\\" in raw
    ):
        raise ValueError(f"Unsafe manifest path for {field}: {raw!r}")
    return raw


def prepare_offload_root(root: Path) -> Path:
    root = Path(root)
    for state in LIFECYCLE_STATES:
        (root / state).mkdir(parents=True, exist_ok=True)
    return root


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _artifact_record(
    doc_dir: Path,
    label: str,
    relative_path: str,
    *,
    required: bool = False,
) -> ArtifactRecord:
    path = doc_dir / relative_path
    if not path.is_file():
        return ArtifactRecord(
            label=label,
            relative_path=relative_path,
            present=False,
            required=required,
        )
    return ArtifactRecord(
        label=label,
        relative_path=relative_path,
        present=True,
        sha256=sha256_file(path),
        bytes=path.stat().st_size,
        required=required,
    )


def collect_document_artifacts(doc_dir: Path) -> list[ArtifactRecord]:
    """Return required + optional artifacts for a preprocessed document.

    ``extracted_text`` is satisfied by either ``extracted.txt`` or
    ``extracted.md``. Optional media, HTML, OCR/transcript, Wayback, and
    preservation artifacts are included when present so the worker/importer can
    prove what context was available without guessing.
    """
    doc_dir = Path(doc_dir)
    artifacts = [
        _artifact_record(doc_dir, "intake.json", "intake.json", required=True),
        _artifact_record(doc_dir, "preprocess.json", "preprocess.json", required=True),
    ]
    extracted_txt = doc_dir / "extracted.txt"
    extracted_md = doc_dir / "extracted.md"
    if extracted_txt.exists():
        artifacts.append(_artifact_record(doc_dir, "extracted_text", "extracted.txt", required=True))
    elif extracted_md.exists():
        artifacts.append(_artifact_record(doc_dir, "extracted_text", "extracted.md", required=True))
    else:
        artifacts.append(ArtifactRecord(
            label="extracted_text",
            relative_path="extracted.txt|extracted.md",
            present=False,
            required=True,
        ))

    for relative_path in OPTIONAL_CONTEXT_ARTIFACTS:
        artifacts.append(_artifact_record(doc_dir, relative_path, relative_path))
    return artifacts


def missing_required_artifacts(artifacts: Iterable[ArtifactRecord]) -> list[str]:
    return [
        artifact.label
        for artifact in artifacts
        if artifact.required and not artifact.present
    ]


def _load_json_dict(path: Path) -> tuple[dict, str]:
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return {}, f"invalid_json:{path.name}:{exc}"
    if not isinstance(loaded, dict):
        return {}, f"invalid_json:{path.name}:expected object"
    return loaded, ""


def validate_required_artifacts(doc_dir: Path, artifacts: Iterable[ArtifactRecord]) -> list[str]:
    """Return fail-closed readiness errors for required package inputs."""
    errors = missing_required_artifacts(artifacts)
    labels = _artifact_map(artifacts)
    for filename in ("intake.json", "preprocess.json"):
        record = labels.get(filename)
        if not record or not record.present:
            continue
        _loaded, error = _load_json_dict(Path(doc_dir) / record.relative_path)
        if error:
            errors.append(error)
    extracted = labels.get("extracted_text")
    if extracted and extracted.present:
        extracted_path = Path(doc_dir) / extracted.relative_path
        if extracted_path.stat().st_size == 0:
            errors.append("empty_extracted_text")
    return errors


def _artifact_map(artifacts: Iterable[ArtifactRecord]) -> dict[str, ArtifactRecord]:
    return {artifact.label: artifact for artifact in artifacts}


def _present(labels: Iterable[str], records: dict[str, ArtifactRecord]) -> bool:
    return any(records.get(label) and records[label].present for label in labels)


def summarise_source_stages(doc_dir: Path, artifacts: Iterable[ArtifactRecord]) -> dict:
    """Return a compact source-processing summary for package review.

    This is not a new processing pipeline. It only reports which already-local
    artifacts exist before Mac Studio offload, so a researcher can see whether
    intake, extraction, preservation, HTML capture, media/transcript handling,
    and OCR signals are represented in the bounded package.
    """
    records = _artifact_map(artifacts)
    preprocess = {}
    intake = {}
    preprocess_path = Path(doc_dir) / "preprocess.json"
    if preprocess_path.exists():
        preprocess, _error = _load_json_dict(preprocess_path)
    intake_path = Path(doc_dir) / "intake.json"
    if intake_path.exists():
        intake, _error = _load_json_dict(intake_path)

    ocr_images = preprocess.get("ocr_images") if isinstance(preprocess, dict) else None
    if not isinstance(ocr_images, list):
        ocr_images = []
    source_type = str(intake.get("source_type") or "")
    source = str(intake.get("source") or "")
    is_url_source = source.startswith(("http://", "https://")) or source_type in {"url", "html"}
    is_media_source = source_type in {"video", "audio", "srt"}

    html_present = _present(("source.html", "html_snapshot.json"), records)
    wayback_present = bool(records.get("wayback.json") and records["wayback.json"].present)
    media_present = _present((
        "media_metadata.json",
        "video_metadata.json",
        "transcript_chunks.json",
        "transcript_versions.json",
        "transcript_comparison.json",
        "media_comments.json",
    ), records)

    return {
        "intake_ready": bool(records.get("intake.json") and records["intake.json"].present),
        "preprocess_ready": bool(records.get("preprocess.json") and records["preprocess.json"].present),
        "extracted_text_ready": bool(records.get("extracted_text") and records["extracted_text"].present),
        "source_type": source_type,
        "preprocess_quality": str(preprocess.get("quality") or ""),
        "preprocess_tool": str(preprocess.get("tool_used") or ""),
        "ocr_images_recorded": len(ocr_images),
        "ocr_status": "present" if ocr_images else "absent",
        "html_capture_status": "present" if html_present else ("absent" if is_url_source else "not_applicable"),
        "wayback_metadata_status": "present" if wayback_present else ("absent" if is_url_source else "not_applicable"),
        "media_or_video_context_status": "present" if media_present else ("absent" if is_media_source else "not_applicable"),
        "html_capture_present": html_present,
        "wayback_metadata_present": wayback_present,
        "preservation_status_present": bool(
            records.get("preservation_status.json") and records["preservation_status.json"].present
        ),
        "media_or_video_context_present": media_present,
    }


def _copy_present_artifacts(
    *,
    doc_dir: Path,
    package_doc_dir: Path,
    artifacts: Iterable[ArtifactRecord],
) -> None:
    package_doc_dir.mkdir(parents=True, exist_ok=True)
    for artifact in artifacts:
        if not artifact.present:
            continue
        source = doc_dir / artifact.relative_path
        target = package_doc_dir / artifact.relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def _privacy_policy() -> dict:
    return {
        "storage": "bounded selected-document package",
        "encrypted_storage_recommended": True,
        "raw_text_in_logs": False,
        "sanity_supabase_push_allowed": False,
        "cleanup": "manual_after_verified_import",
    }


def _worker_contract() -> dict:
    return {
        "worker_may_write": [
            "analysis.json",
            "analysis_audit.json",
            "enrichment.json",
            "enrichment_audit.json",
            "embedding.json",
            "worker_report.json",
        ],
        "worker_must_not_write": [
            "source_queue.db",
            "live corpus",
            "Sanity",
            "Supabase",
        ],
        "required_stage_order": [
            "verify_package_hashes",
            "run_analysis",
            "unload_analysis_model",
            "run_enrichment",
            "unload_enrichment_model",
            "run_embedding",
            "unload_embedding_model",
            "write_result_manifest",
        ],
        "ollama_safety": {
            "single_heavy_job": True,
            "unload_after_each_model": True,
            "keep_alive": 0,
            "num_parallel": 1,
        },
    }


def build_analysis_package(
    *,
    corpus_dir: Path,
    doc_ids: Iterable[str],
    offload_root: Path,
    package_id: str | None = None,
) -> OffloadPackageManifest:
    """Create an analysis offload package in ``offload_root/inbox``.

    The function copies only selected document artifacts. It refuses to package
    a document unless intake, preprocess metadata, and extracted text are all
    present. This is intentional: full source fetching/OCR/video/Wayback remains
    on the MacBook for this first safer mode.
    """
    corpus_dir = Path(corpus_dir)
    offload_root = prepare_offload_root(offload_root)
    package_id = validate_package_id(package_id or default_package_id())
    selected_docs: list[tuple[str, Path, list[ArtifactRecord], dict]] = []
    seen_doc_ids: set[str] = set()
    for raw_doc_id in doc_ids:
        raw_text = str(raw_doc_id).strip()
        if not raw_text:
            continue
        doc_id = normalise_doc_id(raw_text)
        if doc_id in seen_doc_ids:
            raise ValueError(f"Duplicate doc_id in offload package: {doc_id}")
        seen_doc_ids.add(doc_id)
        doc_dir = corpus_dir / doc_id
        artifacts = collect_document_artifacts(doc_dir)
        missing = validate_required_artifacts(doc_dir, artifacts)
        if missing:
            raise ValueError(
                f"{doc_id} cannot be offloaded; missing required artifact(s): "
                + ", ".join(missing)
            )
        selected_docs.append((doc_id, doc_dir, artifacts, summarise_source_stages(doc_dir, artifacts)))

    if not selected_docs:
        raise ValueError("No valid doc_ids provided for offload package")

    package_dir = offload_root / "inbox" / package_id
    package_dir.mkdir(parents=True, exist_ok=False)

    documents: list[DocumentPackageRecord] = []
    for doc_id, doc_dir, artifacts, source_stage_summary in selected_docs:
        package_doc_dir = package_dir / "docs" / doc_id
        _copy_present_artifacts(
            doc_dir=doc_dir,
            package_doc_dir=package_doc_dir,
            artifacts=artifacts,
        )
        documents.append(DocumentPackageRecord(
            doc_id=doc_id,
            source_dir="",
            package_dir=str(package_doc_dir.relative_to(package_dir)),
            ready_for_worker=True,
            missing_required=[],
            source_stage_summary=source_stage_summary,
            artifacts=artifacts,
        ))

    manifest = OffloadPackageManifest(
        schema_version=PACKAGE_SCHEMA_VERSION,
        package_id=package_id,
        package_kind=PACKAGE_KIND_ANALYSIS,
        lifecycle_state="inbox",
        created_at=now_utc(),
        retention_policy="manual_cleanup_after_verified_import",
        privacy_policy=_privacy_policy(),
        worker_contract=_worker_contract(),
        documents=documents,
    )
    atomic_write_json(package_dir / "offload_manifest.json", manifest.to_dict())
    return manifest


def load_manifest(package_dir: Path) -> OffloadPackageManifest:
    data = json.loads((Path(package_dir) / "offload_manifest.json").read_text(encoding="utf-8"))
    documents = [
        DocumentPackageRecord(
            doc_id=row["doc_id"],
            source_dir=row.get("source_dir", ""),
            package_dir=row.get("package_dir", ""),
            ready_for_worker=bool(row.get("ready_for_worker")),
            missing_required=list(row.get("missing_required") or []),
            source_stage_summary=dict(row.get("source_stage_summary") or {}),
            artifacts=[ArtifactRecord(**artifact) for artifact in row.get("artifacts", [])],
        )
        for row in data.get("documents", [])
    ]
    return OffloadPackageManifest(
        schema_version=int(data["schema_version"]),
        package_id=data["package_id"],
        package_kind=data["package_kind"],
        lifecycle_state=data["lifecycle_state"],
        created_at=data["created_at"],
        retention_policy=data["retention_policy"],
        privacy_policy=dict(data.get("privacy_policy") or {}),
        worker_contract=dict(data.get("worker_contract") or {}),
        documents=documents,
    )


def lifecycle_consistency(package_dir: Path) -> dict:
    """Report whether folder lifecycle state matches manifest lifecycle state."""
    package_dir = Path(package_dir)
    manifest = load_manifest(package_dir)
    folder_state = package_dir.parent.name
    return {
        "package_id": manifest.package_id,
        "folder_state": folder_state,
        "manifest_state": manifest.lifecycle_state,
        "consistent": folder_state == manifest.lifecycle_state,
    }


def verify_package(package_dir: Path) -> dict:
    """Read-only integrity check of an offload package.

    Verifies, without mutating anything, that:
      - ``offload_manifest.json`` loads and is well-formed
      - the lifecycle folder name matches the manifest ``lifecycle_state``
      - every artifact the manifest marks ``present`` still exists on disk
      - every present artifact's SHA-256 still matches the manifest

    Returns a structured report. ``ok`` is True only when there are no manifest
    load errors, the lifecycle is consistent, and no artifact is missing or
    hash-mismatched. This function never repairs, moves, or deletes anything.
    """
    package_dir = Path(package_dir)
    report: dict = {
        "package_dir": str(package_dir),
        "package_id": "",
        "ok": False,
        "lifecycle": None,
        "documents": [],
        "missing_artifacts": [],
        "mismatched_artifacts": [],
        "errors": [],
    }

    manifest_path = package_dir / "offload_manifest.json"
    if not manifest_path.is_file():
        report["errors"].append("manifest_not_found:offload_manifest.json")
        return report
    try:
        manifest = load_manifest(package_dir)
    except Exception as exc:  # noqa: BLE001 - corrupt/missing keys must fail closed
        report["errors"].append(f"corrupt_manifest:{exc}")
        return report

    report["package_id"] = manifest.package_id
    folder_state = package_dir.parent.name
    lifecycle = {
        "package_id": manifest.package_id,
        "folder_state": folder_state,
        "manifest_state": manifest.lifecycle_state,
        "consistent": folder_state == manifest.lifecycle_state,
    }
    report["lifecycle"] = lifecycle

    for doc in manifest.documents:
        try:
            safe_doc_package_dir = validate_manifest_relative_path(
                doc.package_dir, field=f"{doc.doc_id}.package_dir"
            )
        except ValueError as exc:
            report["errors"].append(str(exc))
            report["documents"].append({
                "doc_id": doc.doc_id,
                "verified_artifacts": 0,
                "source_stage_summary": doc.source_stage_summary,
            })
            continue
        doc_root = package_dir / safe_doc_package_dir
        verified = 0
        for artifact in doc.artifacts:
            if not artifact.present:
                continue
            try:
                safe_artifact_path = validate_manifest_relative_path(
                    artifact.relative_path,
                    field=f"{doc.doc_id}.{artifact.label}",
                )
            except ValueError as exc:
                report["errors"].append(str(exc))
                continue
            rel = str(Path(safe_doc_package_dir) / safe_artifact_path)
            artifact_path = doc_root / safe_artifact_path
            if not artifact_path.is_file():
                report["missing_artifacts"].append({
                    "doc_id": doc.doc_id,
                    "label": artifact.label,
                    "relative_path": rel,
                })
                continue
            if artifact.sha256:
                actual = sha256_file(artifact_path)
                if actual != artifact.sha256:
                    report["mismatched_artifacts"].append({
                        "doc_id": doc.doc_id,
                        "label": artifact.label,
                        "relative_path": rel,
                        "expected_sha256": artifact.sha256,
                        "actual_sha256": actual,
                    })
                    continue
            verified += 1
        report["documents"].append({
            "doc_id": doc.doc_id,
            "verified_artifacts": verified,
            "source_stage_summary": doc.source_stage_summary,
        })

    report["ok"] = bool(
        not report["errors"]
        and lifecycle["consistent"]
        and not report["missing_artifacts"]
        and not report["mismatched_artifacts"]
    )
    return report


def move_package_state(
    *,
    offload_root: Path,
    package_id: str,
    from_state: str,
    to_state: str,
) -> Path:
    """Move a package between lifecycle folders without deleting it."""
    if from_state not in LIFECYCLE_STATES:
        raise ValueError(f"Unknown from_state: {from_state}")
    if to_state not in LIFECYCLE_STATES:
        raise ValueError(f"Unknown to_state: {to_state}")
    offload_root = prepare_offload_root(offload_root)
    package_id = validate_package_id(package_id)
    source = offload_root / from_state / package_id
    target = offload_root / to_state / package_id
    if not source.exists():
        raise FileNotFoundError(source)
    if target.exists():
        raise FileExistsError(target)
    shutil.move(str(source), str(target))

    manifest = load_manifest(target)
    updated = OffloadPackageManifest(
        schema_version=manifest.schema_version,
        package_id=manifest.package_id,
        package_kind=manifest.package_kind,
        lifecycle_state=to_state,
        created_at=manifest.created_at,
        retention_policy=manifest.retention_policy,
        privacy_policy=manifest.privacy_policy,
        worker_contract=manifest.worker_contract,
        documents=manifest.documents,
    )
    atomic_write_json(target / "offload_manifest.json", updated.to_dict())
    return target


# ---------------------------------------------------------------------------
# Lifecycle transitions
# ---------------------------------------------------------------------------

def validate_state_transition(from_state: str, to_state: str) -> None:
    """Raise ``ValueError`` if ``from_state -> to_state`` is not allowed."""
    if from_state not in LIFECYCLE_STATES:
        raise ValueError(f"Unknown from_state: {from_state!r}")
    if to_state not in LIFECYCLE_STATES:
        raise ValueError(f"Unknown to_state: {to_state!r}")
    if from_state == to_state:
        raise ValueError(f"No-op lifecycle transition: {from_state} -> {to_state}")
    allowed = ALLOWED_TRANSITIONS.get(from_state, frozenset())
    if to_state not in allowed:
        allowed_str = ", ".join(sorted(allowed)) or "none (terminal)"
        raise ValueError(
            f"Invalid lifecycle transition: {from_state} -> {to_state}. "
            f"Allowed from {from_state}: {allowed_str}."
        )


def transition_package_state(
    *,
    offload_root: Path,
    package_id: str,
    from_state: str,
    to_state: str,
    verify: bool = True,
) -> Path:
    """Validate the transition, integrity-check, then atomically move the package.

    The transition graph (``ALLOWED_TRANSITIONS``) is enforced. For forward
    transitions the package is first run through ``verify_package`` and the move
    is refused if it fails (hash mismatch, missing artifact, or folder/manifest
    lifecycle mismatch). Moves into ``failed`` / ``archive`` skip verification so
    a broken package can always be quarantined or retained.
    """
    validate_state_transition(from_state, to_state)
    offload_root = Path(offload_root)
    package_id = validate_package_id(package_id)
    source = offload_root / from_state / package_id
    if not source.is_dir():
        raise FileNotFoundError(source)

    if verify and to_state not in _NO_VERIFY_TARGET_STATES:
        report = verify_package(source)
        if not report["ok"]:
            problems = list(report["errors"])
            problems += [f"missing:{m['relative_path']}" for m in report["missing_artifacts"]]
            problems += [f"hash_mismatch:{m['relative_path']}" for m in report["mismatched_artifacts"]]
            lifecycle = report.get("lifecycle") or {}
            if not lifecycle.get("consistent", True):
                problems.append(
                    f"lifecycle_mismatch:folder={lifecycle.get('folder_state')}:"
                    f"manifest={lifecycle.get('manifest_state')}"
                )
            raise ValueError(
                f"Refusing to move {package_id} {from_state} -> {to_state}: "
                f"package failed verification ({'; '.join(problems) or 'unknown'})."
            )

    return move_package_state(
        offload_root=offload_root,
        package_id=package_id,
        from_state=from_state,
        to_state=to_state,
    )


# ---------------------------------------------------------------------------
# Result (returned) package: verify + import
# ---------------------------------------------------------------------------

def _fs_timestamp() -> str:
    """Filesystem-safe UTC timestamp (microsecond) for backup filenames."""
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")


def _rollback_import(created_files: list[Path], backup_pairs: list[tuple[Path, Path]]) -> None:
    """Best-effort undo of a partially written import.

    ``created_files`` are corpus files that did not exist before this import and
    are removed. ``backup_pairs`` are ``(dest, backup)`` of files that existed and
    were backed up before overwrite; each dest is restored from its backup and the
    backup is then removed, returning the corpus to its pre-import state.
    """
    for path in created_files:
        try:
            Path(path).unlink(missing_ok=True)
        except OSError:
            pass
    for dest, backup in backup_pairs:
        try:
            if Path(backup).exists():
                shutil.copy2(backup, dest)
                Path(backup).unlink(missing_ok=True)
        except OSError:
            pass


def _validate_result_artifact_schema(label: str, path: Path) -> str:
    """Return '' if the artifact parses and matches its expected schema, else an error.

    All allowed artifacts must be valid JSON objects. analysis.json and
    enrichment.json must validate against their Pydantic models; embedding.json
    must carry a model name and a numeric vector whose length matches dimension.
    Audit/report artifacts only need the JSON-object floor.
    """
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return f"invalid_json:{label}:{exc}"
    if not isinstance(loaded, dict):
        return f"schema_invalid:{label}:expected object"

    if label == "analysis.json":
        try:
            try:
                from runner.models.document import AnalysisResult
            except ImportError:
                from ..models.document import AnalysisResult  # type: ignore[no-redef]
            AnalysisResult.model_validate(loaded)
        except Exception as exc:
            return f"schema_invalid:analysis.json:{exc}"
    elif label == "enrichment.json":
        try:
            try:
                from runner.models.enrichment import EnrichmentResult
            except ImportError:
                from ..models.enrichment import EnrichmentResult  # type: ignore[no-redef]
            EnrichmentResult.model_validate(loaded)
        except Exception as exc:
            return f"schema_invalid:enrichment.json:{exc}"
    elif label == "embedding.json":
        model = loaded.get("model")
        vector = loaded.get("vector")
        dimension = loaded.get("dimension")
        if not isinstance(model, str) or not model.strip():
            return "schema_invalid:embedding.json:missing model"
        if not isinstance(vector, list) or not vector:
            return "schema_invalid:embedding.json:missing or empty vector"
        if not all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in vector):
            return "schema_invalid:embedding.json:non-numeric vector value"
        if not isinstance(dimension, int) or isinstance(dimension, bool) or dimension != len(vector):
            return "schema_invalid:embedding.json:dimension does not match vector length"
    # audits + worker_report.json: JSON-object floor already satisfied above.
    return ""


def verify_result_package(package_dir: Path, *, corpus_dir: Path) -> dict:
    """Read-only validation of a returned (result) package. Never writes/mutates.

    Confirms the package is an ``outbox`` analysis_result whose result_manifest
    references only expected, corpus-present doc IDs and only allowed artifacts,
    with safe in-package paths, matching SHA-256 hashes, and valid schemas.
    ``ok`` is True only when every check passes for at least one document and
    every referenced artifact is valid.
    """
    package_dir = Path(package_dir)
    corpus_dir = Path(corpus_dir)
    report: dict = {
        "package_dir": str(package_dir),
        "package_id": "",
        "ok": False,
        "lifecycle": None,
        "documents": [],
        "errors": [],
    }

    # 1. Offload manifest: source of expected doc IDs + lifecycle state.
    if not (package_dir / "offload_manifest.json").is_file():
        report["errors"].append("offload_manifest_not_found")
        return report
    try:
        omanifest = load_manifest(package_dir)
    except Exception as exc:  # noqa: BLE001 - corrupt/missing keys must fail closed
        report["errors"].append(f"corrupt_offload_manifest:{exc}")
        return report

    report["package_id"] = omanifest.package_id
    folder_state = package_dir.parent.name
    lifecycle = {
        "folder_state": folder_state,
        "manifest_state": omanifest.lifecycle_state,
        "consistent": folder_state == omanifest.lifecycle_state,
    }
    report["lifecycle"] = lifecycle
    if omanifest.lifecycle_state != IMPORT_SOURCE_STATE:
        report["errors"].append(
            f"not_in_outbox:manifest_state={omanifest.lifecycle_state}"
        )
    if not lifecycle["consistent"]:
        report["errors"].append(
            f"lifecycle_mismatch:folder={folder_state}:manifest={omanifest.lifecycle_state}"
        )

    # Refuse before any import if the imported/ destination already exists, so we
    # never write corpus files and then get stuck unable to move the package.
    imported_dest = package_dir.parent.parent / "imported" / package_dir.name
    if imported_dest.exists():
        report["errors"].append(f"imported_destination_exists:{imported_dest}")

    expected_doc_ids = {d.doc_id for d in omanifest.documents}
    omanifest_by_doc = {d.doc_id: d for d in omanifest.documents}

    # 2. Result manifest.
    result_path = package_dir / RESULT_MANIFEST_NAME
    if not result_path.is_file():
        report["errors"].append("result_manifest_not_found")
        return report
    try:
        rdata = json.loads(result_path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        report["errors"].append(f"corrupt_result_manifest:{exc}")
        return report
    if not isinstance(rdata, dict):
        report["errors"].append("corrupt_result_manifest:expected object")
        return report
    if rdata.get("schema_version") != RESULT_SCHEMA_VERSION:
        report["errors"].append(
            f"unexpected_result_schema_version:{rdata.get('schema_version')!r}"
            f"!={RESULT_SCHEMA_VERSION}"
        )
    if str(rdata.get("package_kind")) != PACKAGE_KIND_RESULT:
        report["errors"].append(f"unexpected_result_kind:{rdata.get('package_kind')!r}")
    if str(rdata.get("package_id")) != omanifest.package_id:
        report["errors"].append(
            f"result_package_id_mismatch:{rdata.get('package_id')!r}!={omanifest.package_id!r}"
        )

    documents = rdata.get("documents")
    if not isinstance(documents, list) or not documents:
        report["errors"].append("result_manifest_has_no_documents")
        documents = []

    seen_doc_ids: set[str] = set()
    for drow in documents:
        if not isinstance(drow, dict):
            report["errors"].append("result_document_not_object")
            continue
        raw_doc_id = str(drow.get("doc_id") or "")
        try:
            doc_id = normalise_doc_id(raw_doc_id)
        except ValueError:
            report["errors"].append(f"unsafe_doc_id:{raw_doc_id!r}")
            continue
        if doc_id in seen_doc_ids:
            report["errors"].append(f"duplicate_doc_id:{doc_id}")
            continue
        seen_doc_ids.add(doc_id)
        if doc_id not in expected_doc_ids:
            report["errors"].append(f"unknown_doc_id:{doc_id}")
            continue
        if not (corpus_dir / doc_id).is_dir():
            report["errors"].append(f"doc_not_in_corpus:{doc_id}")
            continue

        artifacts = drow.get("artifacts")
        if not isinstance(artifacts, list) or not artifacts:
            report["errors"].append(f"no_artifacts:{doc_id}")
            continue

        validated: list[dict] = []
        claimed_names: set[str] = set()  # filenames the result manifest declares for this doc
        for arow in artifacts:
            if not isinstance(arow, dict):
                report["errors"].append(f"artifact_not_object:{doc_id}")
                continue
            label = str(arow.get("label") or "")
            rel_raw_any = str(arow.get("relative_path") or "")
            if label:
                claimed_names.add(label)
            if rel_raw_any:
                claimed_names.add(Path(rel_raw_any).name)
            if label not in ALLOWED_IMPORT_ARTIFACTS:
                report["errors"].append(f"disallowed_artifact:{doc_id}:{label!r}")
                continue
            rel_raw = str(arow.get("relative_path") or "")
            try:
                safe_rel = validate_manifest_relative_path(rel_raw, field=f"{doc_id}.{label}")
            except ValueError as exc:
                report["errors"].append(str(exc))
                continue
            expected_rel = f"docs/{doc_id}/{label}"
            if safe_rel != expected_rel:
                report["errors"].append(
                    f"unexpected_artifact_path:{doc_id}:{safe_rel}!={expected_rel}"
                )
                continue
            artifact_path = package_dir / safe_rel
            # Defence in depth: the resolved path must stay inside the package.
            try:
                artifact_path.resolve().relative_to(package_dir.resolve())
            except ValueError:
                report["errors"].append(f"path_escapes_package:{doc_id}:{safe_rel}")
                continue
            if not artifact_path.is_file():
                report["errors"].append(f"missing_artifact:{doc_id}:{safe_rel}")
                continue
            expected_sha = str(arow.get("sha256") or "")
            actual_sha = sha256_file(artifact_path)
            if not expected_sha or actual_sha != expected_sha:
                report["errors"].append(f"hash_mismatch:{doc_id}:{safe_rel}")
                continue
            expected_bytes = arow.get("bytes")
            actual_bytes = artifact_path.stat().st_size
            if (
                not isinstance(expected_bytes, int)
                or isinstance(expected_bytes, bool)
                or expected_bytes != actual_bytes
            ):
                report["errors"].append(
                    f"bytes_mismatch:{doc_id}:{safe_rel}:{expected_bytes!r}!={actual_bytes}"
                )
                continue
            schema_error = _validate_result_artifact_schema(label, artifact_path)
            if schema_error:
                report["errors"].append(schema_error)
                continue
            validated.append({
                "label": label,
                "relative_path": safe_rel,
                "sha256": actual_sha,
                "bytes": artifact_path.stat().st_size,
            })

        # Reject any extra worker output left under docs/<doc_id>/ that is neither
        # an original input/context artifact (recorded in the offload manifest) nor
        # a result artifact declared in the result manifest.
        omanifest_doc = omanifest_by_doc.get(doc_id)
        input_files = {
            a.relative_path for a in omanifest_doc.artifacts if a.present
        } if omanifest_doc else set()
        allowed_names = input_files | claimed_names
        docs_doc_dir = package_dir / "docs" / doc_id
        if docs_doc_dir.is_dir():
            for entry in sorted(docs_doc_dir.iterdir(), key=lambda p: p.name):
                if entry.name not in allowed_names:
                    report["errors"].append(f"unexpected_file:{doc_id}:{entry.name}")

        report["documents"].append({"doc_id": doc_id, "artifacts": validated})

    # Document coverage: the result manifest must cover exactly the same doc IDs
    # as the original offload manifest. Extra/unknown IDs are already refused
    # above; here we refuse any expected doc that never came back. A partial
    # worker run must be represented as a failed package, not imported as complete.
    for missing_doc_id in sorted(expected_doc_ids - seen_doc_ids):
        report["errors"].append(f"missing_result_doc:{missing_doc_id}")

    report["ok"] = bool(
        not report["errors"]
        and report["documents"]
        and all(doc["artifacts"] for doc in report["documents"])
    )
    return report


def import_result_package(
    package_dir: Path,
    *,
    corpus_dir: Path,
    dry_run: bool = False,
) -> dict:
    """Validate a returned package in full, then atomically import allowed artifacts.

    Validate-all-before-copy: if any document/artifact fails verification, nothing
    is written and the corpus is left untouched. On success, each allowed artifact
    is written into ``corpus_dir/<doc_id>/`` atomically; any existing target file
    is first backed up to ``<artifact>.preimport-<ts>``; an ``offload_import.json``
    provenance sidecar records what came from which offload package. This function
    does not move the package, touch source_queue.db, call Sanity/Supabase, or run
    any model.
    """
    package_dir = Path(package_dir)
    corpus_dir = Path(corpus_dir)
    report = verify_result_package(package_dir, corpus_dir=corpus_dir)

    summary: dict = {
        "package_dir": str(package_dir),
        "package_id": report.get("package_id", ""),
        "ok": report["ok"],
        "dry_run": dry_run,
        "imported": False,
        "lifecycle": report.get("lifecycle"),
        "errors": list(report["errors"]),
        "documents": [],
    }

    if not report["ok"]:
        return summary  # nothing written — corpus untouched

    if dry_run:
        summary["documents"] = [
            {"doc_id": d["doc_id"], "would_write": [a["label"] for a in d["artifacts"]]}
            for d in report["documents"]
        ]
        return summary

    imported_at = now_utc()
    # Rollback ledger: on any write-phase exception we undo everything so the
    # corpus is left exactly as it was. (A hard process kill mid-write remains a
    # documented residual risk; normal Python exceptions roll back.)
    created_files: list[Path] = []                 # newly created — remove on failure
    backup_pairs: list[tuple[Path, Path]] = []     # (dest, backup) — restore on failure
    written_docs: list[dict] = []
    try:
        for doc in report["documents"]:
            doc_id = doc["doc_id"]
            corpus_doc_dir = corpus_dir / doc_id
            written: list[dict] = []
            backups: list[dict] = []

            def _record_write(dest: Path, label: str) -> None:
                if dest.exists():
                    backup = corpus_doc_dir / f"{label}.preimport-{_fs_timestamp()}"
                    shutil.copy2(dest, backup)
                    backup_pairs.append((dest, backup))
                    backups.append({"label": label, "backup_path": backup.name})
                else:
                    created_files.append(dest)

            for artifact in doc["artifacts"]:
                source = package_dir / artifact["relative_path"]
                dest = corpus_doc_dir / artifact["label"]
                _record_write(dest, artifact["label"])
                atomic_write_bytes(dest, source.read_bytes())
                written.append({
                    "label": artifact["label"],
                    "sha256": artifact["sha256"],
                    "bytes": artifact["bytes"],
                })

            provenance = {
                "imported_at": imported_at,
                "package_id": summary["package_id"],
                "package_kind": PACKAGE_KIND_RESULT,
                "source_lifecycle_state": (summary["lifecycle"] or {}).get("manifest_state", ""),
                "imported_artifacts": written,
                "backups": backups,
            }
            prov_dest = corpus_doc_dir / "offload_import.json"
            _record_write(prov_dest, "offload_import.json")
            atomic_write_json(prov_dest, provenance)

            written_docs.append({
                "doc_id": doc_id,
                "written": [w["label"] for w in written],
                "backups": [b["label"] for b in backups],
            })
    except Exception as exc:  # noqa: BLE001 - any write failure must roll back cleanly
        _rollback_import(created_files, backup_pairs)
        summary["ok"] = False
        summary["imported"] = False
        summary["documents"] = []
        summary["errors"].append(f"write_failed_rolled_back:{exc}")
        return summary

    summary["documents"] = written_docs
    summary["imported"] = True
    return summary
