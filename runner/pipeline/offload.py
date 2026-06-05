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

from .atomic_io import atomic_write_json


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
