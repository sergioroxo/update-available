"""Source offload package primitives (Slice S1).

This is the *source-stage* counterpart to ``offload.py``. Where ``offload.py``
packages **already-ingested** corpus documents so the Mac Studio can run
analysis/enrichment/embedding (a result-stage offload), this module packages
**raw source material** so the Mac Studio can later run the *full* pipeline
(intake → preprocess → analysis → enrichment → embedding) while the MacBook is
offline.

Slice S1 builds and verifies the package only. It does **not**:
  - fetch URLs or run any network call
  - run any model / Sanity / Supabase call
  - read or write the live corpus
  - mutate ``source_queue.db``
  - process the package (that is the S2 worker)

Package kind: ``source_package`` (schema version 1). Lifecycle folders and the
ID/path-safety primitives are shared with ``offload.py``. Source packages live
under a **separate** root (default ``<exports_dir>/source_offload``) so they
never mix with the existing ``<exports_dir>/offload`` result lifecycle.

On-disk layout (``inbox/<package_id>/``)::

    source_manifest.json
    items/<doc_id>/source_item.json
    items/<doc_id>/source.<ext>      # local file-backed items only

URL items carry only metadata (the URL is re-fetched on the Mac Studio in S2);
file items carry a copy of the source blob plus its SHA-256 and byte size. No
absolute MacBook paths are ever written into the portable manifest.

No function here deletes packages automatically — manual cleanup only.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterable

from . import offload as _offload
from .atomic_io import atomic_write_bytes, atomic_write_json
from .offload import (
    LIFECYCLE_STATES,
    default_package_id,
    normalise_doc_id,
    now_utc,
    prepare_offload_root,
    sha256_file,
    validate_manifest_relative_path,
    validate_package_id,
)

SOURCE_SCHEMA_VERSION = 1
PACKAGE_KIND_SOURCE = "source_package"
SOURCE_MANIFEST_NAME = "source_manifest.json"
SOURCE_ITEM_NAME = "source_item.json"
SOURCE_BLOB_STEM = "source"
# Canonical packaged-blob filename: ``source.<ext>`` with an alphanumeric ext,
# matching ``_safe_blob_ext``. Used by the verifier to reject non-canonical names.
_BLOB_NAME_RE = re.compile(r"^source\.[A-Za-z0-9]+$")

# Packages land in the inbox; everything else is reached via lifecycle moves.
_BUILD_STATE = "inbox"

VALID_SOURCE_KINDS: frozenset[str] = frozenset({"url", "file"})

# ── Returned (ingest_result) package contract — produced by the S2 worker ─────
# The source worker runs the *full* pipeline against a package-local staging
# corpus and returns complete corpus-style document folders under docs/<doc_id>/.
PACKAGE_KIND_INGEST = "ingest_result"
INGEST_RESULT_SCHEMA_VERSION = 1
INGEST_RESULT_MANIFEST_NAME = "result_manifest.json"

# Worker-owned siblings that may legitimately sit beside the source inputs after
# a run (and must be cleaned before a retry). They are NOT part of the portable
# source package and are tolerated by ``verify_source_inputs``.
WORKER_OWNED_SIBLINGS: frozenset[str] = frozenset(
    {"docs", INGEST_RESULT_MANIFEST_NAME, "worker_report.json"}
)

# Fixed-name artifacts allowed inside a returned docs/<doc_id>/ folder. The local
# source copy (e.g. ``source.pdf``) is additionally allowed by exact match to the
# per-doc ``local_source_filename`` recorded in the result manifest.
ALLOWED_INGEST_ARTIFACTS: frozenset[str] = frozenset({
    # Core pipeline outputs.
    "intake.json",
    "preprocess.json",
    "extracted.txt",
    "extracted.md",
    "analysis.json",
    "analysis_audit.json",
    "enrichment.json",
    "enrichment_audit.json",
    "embedding.json",
    # Queue linkage passthrough + worker provenance.
    "source_item.json",
    "worker_report.json",
    # Optional context (present only when the pipeline produced it).
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
    "duplicate_candidates.json",
    "discovery_seed_queue.json",
})

# Fixed-name core artifacts every returned document must include (extracted text
# is required separately as either extracted.txt or extracted.md).
REQUIRED_INGEST_CORE: tuple[str, ...] = (
    "intake.json",
    "preprocess.json",
    "analysis.json",
    "analysis_audit.json",
    "enrichment.json",
    "enrichment_audit.json",
    "embedding.json",
    "source_item.json",
    "worker_report.json",
)

# Local corpus-doc markers that indicate researcher review / edit / upload. A
# bare ``offload_import.json`` (a prior auto-import, never researcher-touched) is
# intentionally NOT in this set — that is a re-import, allowed with backup.
_REVIEWED_DOC_MARKERS: tuple[str, ...] = ("sanity_record.json", "metadata.json")

# Owner-only intent for private research material on a shared Mac Studio.
_DIR_MODE = 0o700
_FILE_MODE = 0o600


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class SourceItemSpec:
    """One item to package, before the package is built.

    ``file_path`` is an absolute MacBook path used only by the builder to copy
    the blob. It is **never** written into the portable manifest or item record.
    """

    source_kind: str  # "url" | "file"
    declared_source_type: str
    doc_id: str = ""  # pre-assigned by caller; generated if blank
    url: str = ""
    file_path: str = ""
    queue_item_id: str = ""
    url_hash: str = ""
    title: str = ""
    notes: str = ""
    priority: str = ""
    recommended_llm: str = ""
    overnight_batch_safe: bool = True
    tags: str = ""
    doc_type_hint: str = ""
    suggested_process_route: str = ""


@dataclass(frozen=True)
class SourceItemRecord:
    doc_id: str
    source_kind: str
    declared_source_type: str
    url: str
    relative_path: str  # blob path ("" for url items)
    sha256: str
    bytes: int
    item_record_path: str
    item_record_sha256: str
    queue_item_id: str
    url_hash: str


@dataclass(frozen=True)
class SourcePackageManifest:
    schema_version: int
    package_id: str
    package_kind: str
    lifecycle_state: str
    created_at: str
    retention_policy: str
    privacy_policy: dict
    items: list[SourceItemRecord] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def default_source_package_id() -> str:
    return default_package_id("source")


def _restrict(path: Path, mode: int) -> None:
    """Best-effort owner-only permissions; never fatal."""
    try:
        os.chmod(path, mode)
    except OSError:
        pass


def _safe_blob_ext(file_path: str) -> str:
    """Return a sanitised file extension for the packaged blob (no dot)."""
    suffix = Path(file_path).suffix.lstrip(".").lower()
    if suffix and suffix.isalnum():
        return suffix
    return "bin"


def _privacy_policy() -> dict:
    return {
        "contains_raw_source": True,
        "store_owner_only": True,
        "auto_delete": False,
        "note": (
            "Source packages may contain private research material (URLs, file "
            "copies, queue notes). Keep on an owner-only / encrypted volume; "
            "delete manually only after a verified import."
        ),
    }


def _validate_specs(specs: list[SourceItemSpec]) -> list[SourceItemSpec]:
    """Validate every spec before any package directory is created.

    Raises ``ValueError``/``FileNotFoundError`` on the first problem so a refused
    export never leaves a partial package on disk.
    """
    if not specs:
        raise ValueError("No source items to package")

    seen: set[str] = set()
    validated: list[SourceItemSpec] = []
    for spec in specs:
        kind = str(spec.source_kind)
        if kind not in VALID_SOURCE_KINDS:
            raise ValueError(
                f"Unknown source_kind {spec.source_kind!r}; expected one of "
                f"{sorted(VALID_SOURCE_KINDS)}"
            )
        if not str(spec.declared_source_type).strip():
            raise ValueError(f"Empty declared_source_type for item {spec!r}")

        doc_id = normalise_doc_id(spec.doc_id) if spec.doc_id else uuid.uuid4().hex[:12]
        doc_id = normalise_doc_id(doc_id)  # validate generated id too
        if doc_id in seen:
            raise ValueError(f"Duplicate doc_id in source package: {doc_id}")
        seen.add(doc_id)

        if kind == "url":
            url = str(spec.url).strip()
            if not url.startswith(("http://", "https://")):
                raise ValueError(f"URL item {doc_id} has invalid url: {spec.url!r}")
        else:  # file
            raw = str(spec.file_path).strip()
            if not raw:
                raise ValueError(f"File item {doc_id} is missing file_path")
            src = Path(raw)
            if not src.is_file():
                raise FileNotFoundError(f"Source file for item {doc_id} not found: {raw}")

        validated.append(
            SourceItemSpec(
                source_kind=kind,
                declared_source_type=str(spec.declared_source_type).strip(),
                doc_id=doc_id,
                url=str(spec.url).strip(),
                file_path=str(spec.file_path).strip(),
                queue_item_id=str(spec.queue_item_id),
                url_hash=str(spec.url_hash),
                title=str(spec.title),
                notes=str(spec.notes),
                priority=str(spec.priority),
                recommended_llm=str(spec.recommended_llm),
                overnight_batch_safe=bool(spec.overnight_batch_safe),
                tags=str(spec.tags),
                doc_type_hint=str(spec.doc_type_hint),
                suggested_process_route=str(spec.suggested_process_route),
            )
        )
    return validated


# ---------------------------------------------------------------------------
# Builder
# ---------------------------------------------------------------------------

def build_source_package(
    *,
    specs: Iterable[SourceItemSpec],
    source_offload_root: Path,
    package_id: str | None = None,
) -> SourcePackageManifest:
    """Build a ``source_package`` in ``<source_offload_root>/inbox/<package_id>``.

    Validates every item first; if anything is invalid (unsafe id, missing local
    file, bad URL, duplicate doc) the function raises and writes **no** package.
    Once writing begins, any failure removes the partial package directory before
    re-raising. No network/model/corpus/queue access.
    """
    spec_list = list(specs)
    validated = _validate_specs(spec_list)

    root = prepare_offload_root(Path(source_offload_root))
    pkg_id = validate_package_id(package_id or default_source_package_id())
    package_dir = root / _BUILD_STATE / pkg_id
    if package_dir.exists():
        raise FileExistsError(package_dir)

    created = False
    try:
        package_dir.mkdir(parents=True)
        _restrict(package_dir, _DIR_MODE)
        created = True
        items_root = package_dir / "items"
        items_root.mkdir()
        _restrict(items_root, _DIR_MODE)

        records: list[SourceItemRecord] = []
        for spec in validated:
            item_dir = items_root / spec.doc_id
            item_dir.mkdir()
            _restrict(item_dir, _DIR_MODE)

            blob_rel = ""
            blob_sha = ""
            blob_bytes = 0
            original_filename = ""
            if spec.source_kind == "file":
                ext = _safe_blob_ext(spec.file_path)
                blob_name = f"{SOURCE_BLOB_STEM}.{ext}"
                dst = item_dir / blob_name
                shutil.copy2(spec.file_path, dst)
                _restrict(dst, _FILE_MODE)
                blob_sha = sha256_file(dst)
                blob_bytes = dst.stat().st_size
                blob_rel = f"items/{spec.doc_id}/{blob_name}"
                original_filename = Path(spec.file_path).name

            item_rel = f"items/{spec.doc_id}/{SOURCE_ITEM_NAME}"
            item_payload = {
                "doc_id": spec.doc_id,
                "source_kind": spec.source_kind,
                "declared_source_type": spec.declared_source_type,
                "url": spec.url,
                "original_filename": original_filename,
                "source_blob": blob_rel,
                "queue_item_id": spec.queue_item_id,
                "url_hash": spec.url_hash,
                "title": spec.title,
                "notes": spec.notes,
                "priority": spec.priority,
                "recommended_llm": spec.recommended_llm,
                "overnight_batch_safe": spec.overnight_batch_safe,
                "tags": spec.tags,
                "doc_type_hint": spec.doc_type_hint,
                "suggested_process_route": spec.suggested_process_route,
                "added_to_package_at": now_utc(),
            }
            item_path = package_dir / item_rel
            atomic_write_json(item_path, item_payload)
            _restrict(item_path, _FILE_MODE)
            item_sha = sha256_file(item_path)

            records.append(
                SourceItemRecord(
                    doc_id=spec.doc_id,
                    source_kind=spec.source_kind,
                    declared_source_type=spec.declared_source_type,
                    url=spec.url,
                    relative_path=blob_rel,
                    sha256=blob_sha,
                    bytes=blob_bytes,
                    item_record_path=item_rel,
                    item_record_sha256=item_sha,
                    queue_item_id=spec.queue_item_id,
                    url_hash=spec.url_hash,
                )
            )

        manifest = SourcePackageManifest(
            schema_version=SOURCE_SCHEMA_VERSION,
            package_id=pkg_id,
            package_kind=PACKAGE_KIND_SOURCE,
            lifecycle_state=_BUILD_STATE,
            created_at=now_utc(),
            retention_policy="manual cleanup only — kept until import is verified",
            privacy_policy=_privacy_policy(),
            items=records,
        )
        manifest_path = package_dir / SOURCE_MANIFEST_NAME
        atomic_write_json(manifest_path, manifest.to_dict())
        _restrict(manifest_path, _FILE_MODE)
        return manifest
    except BaseException:
        if created:
            shutil.rmtree(package_dir, ignore_errors=True)
        raise


# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------

def load_source_manifest(package_dir: Path) -> SourcePackageManifest:
    import json

    data = json.loads((Path(package_dir) / SOURCE_MANIFEST_NAME).read_text(encoding="utf-8"))
    items = [
        SourceItemRecord(
            doc_id=row["doc_id"],
            source_kind=row.get("source_kind", ""),
            declared_source_type=row.get("declared_source_type", ""),
            url=row.get("url", ""),
            relative_path=row.get("relative_path", ""),
            sha256=row.get("sha256", ""),
            bytes=int(row.get("bytes", 0) or 0),
            item_record_path=row.get("item_record_path", ""),
            item_record_sha256=row.get("item_record_sha256", ""),
            queue_item_id=row.get("queue_item_id", ""),
            url_hash=row.get("url_hash", ""),
        )
        for row in data.get("items", [])
    ]
    return SourcePackageManifest(
        schema_version=int(data["schema_version"]),
        package_id=data["package_id"],
        package_kind=data["package_kind"],
        lifecycle_state=data.get("lifecycle_state", ""),
        created_at=data.get("created_at", ""),
        retention_policy=data.get("retention_policy", ""),
        privacy_policy=dict(data.get("privacy_policy") or {}),
        items=items,
    )


# ---------------------------------------------------------------------------
# Verifier (read-only)
# ---------------------------------------------------------------------------

def verify_source_package(package_dir: Path) -> dict:
    """Read-only integrity check of a source package.

    Verifies, without mutating anything:
      - ``source_manifest.json`` exists and parses
      - ``schema_version`` / ``package_kind`` match
      - folder lifecycle matches the manifest ``lifecycle_state`` (when stored)
      - every doc_id is safe and unique
      - every manifest-relative path is safe (no traversal / absolute / backslash)
      - each item's ``source_item.json`` exists and its SHA-256 matches
      - file items: the blob exists and its SHA-256 + byte size match
      - url items: a valid http(s) URL is present and no blob is declared
      - item coverage is exact (manifest doc_ids == ``items/`` subfolders)
      - unexpected files/dirs are surfaced

    ``ok`` is True only when there are no errors and no unexpected entries.
    Never repairs, moves, or deletes anything.
    """
    import json

    package_dir = Path(package_dir)
    report: dict = {
        "package_dir": str(package_dir),
        "package_id": "",
        "ok": False,
        "lifecycle": None,
        "items": [],
        "errors": [],
        "unexpected": [],
    }

    manifest_path = package_dir / SOURCE_MANIFEST_NAME
    if not manifest_path.is_file():
        report["errors"].append("source_manifest_not_found")
        return report
    try:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        report["errors"].append(f"corrupt_source_manifest:{exc}")
        return report
    if not isinstance(data, dict):
        report["errors"].append("corrupt_source_manifest:expected object")
        return report

    report["package_id"] = str(data.get("package_id", ""))

    if data.get("schema_version") != SOURCE_SCHEMA_VERSION:
        report["errors"].append(
            f"unexpected_schema_version:{data.get('schema_version')!r}!={SOURCE_SCHEMA_VERSION}"
        )
    if str(data.get("package_kind")) != PACKAGE_KIND_SOURCE:
        report["errors"].append(f"unexpected_package_kind:{data.get('package_kind')!r}")

    # Lifecycle folder/manifest consistency (only when the folder is a known state).
    folder_state = package_dir.parent.name
    manifest_state = str(data.get("lifecycle_state", ""))
    if folder_state in LIFECYCLE_STATES:
        consistent = folder_state == manifest_state
        report["lifecycle"] = {
            "folder_state": folder_state,
            "manifest_state": manifest_state,
            "consistent": consistent,
        }
        if not consistent:
            report["errors"].append(
                f"lifecycle_mismatch:folder={folder_state}:manifest={manifest_state}"
            )

    items = data.get("items")
    if not isinstance(items, list) or not items:
        report["errors"].append("source_manifest_has_no_items")
        items = []

    items_root = package_dir / "items"
    manifest_doc_ids: list[str] = []

    for row in items:
        if not isinstance(row, dict):
            report["errors"].append("item_not_object")
            continue
        raw_doc_id = str(row.get("doc_id") or "")
        try:
            doc_id = normalise_doc_id(raw_doc_id)
        except ValueError:
            report["errors"].append(f"unsafe_doc_id:{raw_doc_id!r}")
            continue
        if doc_id in manifest_doc_ids:
            report["errors"].append(f"duplicate_doc_id:{doc_id}")
            continue
        manifest_doc_ids.append(doc_id)

        item_status = {"doc_id": doc_id, "source_kind": row.get("source_kind", ""), "verified": False}
        item_errors: list[str] = []

        kind = str(row.get("source_kind", ""))
        if kind not in VALID_SOURCE_KINDS:
            item_errors.append(f"unknown_source_kind:{kind!r}")

        if not str(row.get("declared_source_type", "")).strip():
            item_errors.append("empty_declared_source_type")

        # source_item.json record — canonical path + integrity + parsed payload.
        expected_rec_rel = f"items/{doc_id}/{SOURCE_ITEM_NAME}"
        rec_rel = str(row.get("item_record_path", ""))
        rec_data: dict | None = None
        try:
            safe_rec_rel = validate_manifest_relative_path(
                rec_rel, field=f"{doc_id}.item_record_path"
            )
        except ValueError as exc:
            item_errors.append(str(exc))
        else:
            if safe_rec_rel != expected_rec_rel:
                item_errors.append(
                    f"noncanonical_item_record_path:{safe_rec_rel}!={expected_rec_rel}"
                )
            rec_path = package_dir / safe_rec_rel
            if not rec_path.is_file():
                item_errors.append(f"missing_source_item:{safe_rec_rel}")
            else:
                if sha256_file(rec_path) != str(row.get("item_record_sha256", "")):
                    item_errors.append(f"item_record_hash_mismatch:{safe_rec_rel}")
                try:
                    parsed = json.loads(rec_path.read_text(encoding="utf-8"))
                except Exception as exc:  # noqa: BLE001
                    item_errors.append(f"corrupt_source_item:{safe_rec_rel}:{exc}")
                else:
                    if isinstance(parsed, dict):
                        rec_data = parsed
                    else:
                        item_errors.append(f"corrupt_source_item:{safe_rec_rel}:not an object")

        manifest_blob_rel = str(row.get("relative_path", ""))
        if kind == "url":
            url = str(row.get("url", "")).strip()
            if not url.startswith(("http://", "https://")):
                item_errors.append(f"invalid_url:{row.get('url')!r}")
            if manifest_blob_rel:
                item_errors.append("url_item_should_not_declare_blob")
        elif kind == "file":
            try:
                safe_blob_rel = validate_manifest_relative_path(
                    manifest_blob_rel, field=f"{doc_id}.relative_path"
                )
            except ValueError as exc:
                item_errors.append(str(exc))
            else:
                blob_rel_path = Path(safe_blob_rel)
                # Canonical: items/<doc_id>/source.<ext> — never another item dir.
                if blob_rel_path.parent.as_posix() != f"items/{doc_id}":
                    item_errors.append(f"blob_outside_item_dir:{safe_blob_rel}")
                elif not _BLOB_NAME_RE.match(blob_rel_path.name):
                    item_errors.append(f"noncanonical_blob_name:{blob_rel_path.name}")
                blob_path = package_dir / safe_blob_rel
                if not blob_path.is_file():
                    item_errors.append(f"missing_source_blob:{safe_blob_rel}")
                else:
                    if sha256_file(blob_path) != str(row.get("sha256", "")):
                        item_errors.append(f"blob_hash_mismatch:{safe_blob_rel}")
                    if blob_path.stat().st_size != int(row.get("bytes", -1) or -1):
                        item_errors.append(f"blob_bytes_mismatch:{safe_blob_rel}")

        # Cross-check source_item.json identity against the manifest (drift guard).
        if rec_data is not None:
            for fld, manifest_val in (
                ("doc_id", doc_id),
                ("source_kind", str(row.get("source_kind", ""))),
                ("declared_source_type", str(row.get("declared_source_type", ""))),
                ("url", str(row.get("url", ""))),
                ("source_blob", manifest_blob_rel),
                ("queue_item_id", str(row.get("queue_item_id", ""))),
                ("url_hash", str(row.get("url_hash", ""))),
            ):
                if str(rec_data.get(fld, "")) != str(manifest_val):
                    item_errors.append(
                        f"item_record_drift:{fld}:{rec_data.get(fld)!r}!={manifest_val!r}"
                    )

        # Surface unexpected files inside this item's folder.
        item_dir = items_root / doc_id
        if item_dir.is_dir():
            allowed = {SOURCE_ITEM_NAME}
            if kind == "file":
                allowed.add(Path(str(row.get("relative_path", ""))).name)
            for child in sorted(item_dir.iterdir()):
                if child.name not in allowed:
                    report["unexpected"].append(f"items/{doc_id}/{child.name}")

        item_status["verified"] = not item_errors
        item_status["errors"] = item_errors
        report["items"].append(item_status)
        report["errors"].extend(f"{doc_id}:{e}" for e in item_errors)

    # Exact coverage: manifest doc_ids vs items/ subfolders.
    on_disk_dirs: set[str] = set()
    if items_root.is_dir():
        for child in sorted(items_root.iterdir()):
            if child.is_dir():
                on_disk_dirs.add(child.name)
            else:
                report["unexpected"].append(f"items/{child.name}")
    manifest_set = set(manifest_doc_ids)
    for missing in sorted(manifest_set - on_disk_dirs):
        report["errors"].append(f"missing_item_dir:{missing}")
    for extra in sorted(on_disk_dirs - manifest_set):
        report["unexpected"].append(f"items/{extra}/")

    # Surface unexpected top-level entries.
    allowed_top = {SOURCE_MANIFEST_NAME, "items"}
    for child in sorted(package_dir.iterdir()):
        if child.name not in allowed_top:
            report["unexpected"].append(child.name)

    report["ok"] = not report["errors"] and not report["unexpected"]
    return report


# ---------------------------------------------------------------------------
# S2 worker support — retry-tolerant verify + source-package state moves
# ---------------------------------------------------------------------------

def verify_source_inputs(package_dir: Path) -> dict:
    """Verify a source package's *inputs*, tolerating worker-owned siblings.

    Identical to ``verify_source_package`` except that the worker-generated
    siblings in ``WORKER_OWNED_SIBLINGS`` (``docs/``, ``result_manifest.json``,
    root ``worker_report.json``) are not treated as unexpected. The S2 worker
    uses this at claim time so a ``failed -> inbox`` retry — whose package still
    carries a partial ``docs/`` from the previous run — still verifies, while
    every genuine integrity check on the source inputs (manifest, items, hashes,
    canonical paths, coverage, drift) is unchanged.
    """
    report = verify_source_package(package_dir)
    filtered = [u for u in report["unexpected"] if u not in WORKER_OWNED_SIBLINGS]
    report["unexpected"] = filtered
    report["ok"] = not report["errors"] and not filtered
    return report


def move_source_package_state(
    *,
    offload_root: Path,
    package_id: str,
    from_state: str,
    to_state: str,
) -> Path:
    """Move a source package between lifecycle folders and update its manifest.

    Enforces the shared transition graph (``offload.validate_state_transition``)
    and rewrites ``source_manifest.json``'s ``lifecycle_state`` so folder and
    manifest stay consistent. Source packages carry ``source_manifest.json`` (not
    ``offload_manifest.json``), so the offload result-package movers cannot be
    reused here. No deletion; no verification (callers verify explicitly).
    """
    from . import offload as _offload

    _offload.validate_state_transition(from_state, to_state)
    offload_root = Path(offload_root)
    pkg_id = validate_package_id(package_id)
    source = offload_root / from_state / pkg_id
    target = offload_root / to_state / pkg_id
    if not source.is_dir():
        raise FileNotFoundError(source)
    if target.exists():
        raise FileExistsError(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(source), str(target))

    # Keep folder/manifest lifecycle consistent.
    manifest = load_source_manifest(target)
    data = manifest.to_dict()
    data["lifecycle_state"] = to_state
    atomic_write_json(target / SOURCE_MANIFEST_NAME, data)
    _restrict(target / SOURCE_MANIFEST_NAME, _FILE_MODE)
    return target


# ---------------------------------------------------------------------------
# S3 — verify + import of a returned ``ingest_result`` package
# ---------------------------------------------------------------------------

IMPORT_SOURCE_STATE = "outbox"  # only outbox packages may be imported


def _validate_ingest_artifact_schema(label: str, path: Path) -> str:
    """Return '' if the artifact is well-formed for its kind, else an error.

    JSON artifacts use the shared result-artifact validator (object floor +
    Pydantic checks for analysis/enrichment/embedding). Extracted text must be
    non-empty. Non-JSON artifacts (source.html, the local source copy) are only
    integrity-checked by hash/bytes elsewhere.
    """
    if label in ("extracted.txt", "extracted.md"):
        try:
            if not path.read_text(encoding="utf-8").strip():
                return f"empty_extracted_text:{label}"
        except Exception as exc:  # noqa: BLE001
            return f"unreadable_extracted_text:{label}:{exc}"
        return ""
    if label.endswith(".json"):
        return _offload._validate_result_artifact_schema(label, path)
    return ""


def _is_reviewed_corpus_doc(doc_dir: Path) -> bool:
    """True if an existing corpus doc folder shows researcher review / edit / upload.

    Markers: ``sanity_record.json`` / ``metadata.json`` (uploaded / upload path),
    a ``_manual_overrides`` key in ``analysis.json`` / ``preprocess.json``
    (Streamlit researcher confirmations), or a verified/published
    ``workflowStatus`` in a local record. A bare ``offload_import.json`` alone is
    not treated as reviewed (it is a prior auto-import; re-import is allowed).
    """
    doc_dir = Path(doc_dir)
    for marker in _REVIEWED_DOC_MARKERS:
        if (doc_dir / marker).exists():
            return True
    for name in ("analysis.json", "preprocess.json"):
        p = doc_dir / name
        if not p.exists():
            continue
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            continue
        if isinstance(data, dict):
            if data.get("_manual_overrides"):
                return True
            if str(data.get("workflowStatus", "")).lower() in ("verified", "published"):
                return True
    return False


def verify_ingest_result(package_dir: Path, *, corpus_dir: Path) -> dict:
    """Read-only full validation of a returned ``ingest_result`` package.

    Confirms it is an ``outbox`` ingest_result whose result manifest covers
    exactly the source manifest's doc IDs, with safe canonical paths, matching
    hashes/bytes, only allowed artifacts (incl. the per-doc local source copy),
    no unexpected files, and valid core-artifact schemas. Never mutates anything.
    ``ok`` is True only when there are no errors and no unexpected entries.
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
        "unexpected": [],
    }

    # 1. Source manifest — expected doc IDs + lifecycle + linkage source of truth.
    if not (package_dir / SOURCE_MANIFEST_NAME).is_file():
        report["errors"].append("source_manifest_not_found")
        return report
    try:
        smanifest = load_source_manifest(package_dir)
    except Exception as exc:  # noqa: BLE001
        report["errors"].append(f"corrupt_source_manifest:{exc}")
        return report

    report["package_id"] = smanifest.package_id
    folder_state = package_dir.parent.name
    lifecycle = {
        "folder_state": folder_state,
        "manifest_state": smanifest.lifecycle_state,
        "consistent": folder_state == smanifest.lifecycle_state,
    }
    report["lifecycle"] = lifecycle
    if smanifest.lifecycle_state != IMPORT_SOURCE_STATE:
        report["errors"].append(f"not_in_outbox:manifest_state={smanifest.lifecycle_state}")
    if not lifecycle["consistent"]:
        report["errors"].append(
            f"lifecycle_mismatch:folder={folder_state}:manifest={smanifest.lifecycle_state}"
        )

    expected_doc_ids = {d.doc_id for d in smanifest.items}
    source_by_doc = {d.doc_id: d for d in smanifest.items}

    # 2. Result manifest.
    result_path = package_dir / INGEST_RESULT_MANIFEST_NAME
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
    if rdata.get("schema_version") != INGEST_RESULT_SCHEMA_VERSION:
        report["errors"].append(
            f"unexpected_result_schema_version:{rdata.get('schema_version')!r}"
        )
    if str(rdata.get("package_kind")) != PACKAGE_KIND_INGEST:
        report["errors"].append(f"unexpected_result_kind:{rdata.get('package_kind')!r}")
    if str(rdata.get("package_id")) != smanifest.package_id:
        report["errors"].append(
            f"result_package_id_mismatch:{rdata.get('package_id')!r}!={smanifest.package_id!r}"
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

        local_source_filename = str(drow.get("local_source_filename") or "")
        doc_errors: list[str] = []
        artifacts = drow.get("artifacts")
        if not isinstance(artifacts, list) or not artifacts:
            doc_errors.append("no_artifacts")
            artifacts = []

        validated: list[dict] = []
        claimed_names: set[str] = set()
        for arow in artifacts:
            if not isinstance(arow, dict):
                doc_errors.append("artifact_not_object")
                continue
            label = str(arow.get("label") or "")
            try:
                safe_rel = validate_manifest_relative_path(
                    str(arow.get("relative_path", "")), field=f"{doc_id}.{label}.relative_path"
                )
            except ValueError as exc:
                doc_errors.append(str(exc))
                continue
            if safe_rel != f"docs/{doc_id}/{label}":
                doc_errors.append(f"noncanonical_artifact_path:{safe_rel}")
                continue
            if not (label in ALLOWED_INGEST_ARTIFACTS
                    or (local_source_filename and label == local_source_filename)):
                doc_errors.append(f"disallowed_artifact:{label}")
                continue
            p = package_dir / safe_rel
            if not p.is_file():
                doc_errors.append(f"missing_artifact:{safe_rel}")
                continue
            if sha256_file(p) != str(arow.get("sha256", "")):
                doc_errors.append(f"hash_mismatch:{safe_rel}")
            if p.stat().st_size != int(arow.get("bytes", -1) or -1):
                doc_errors.append(f"bytes_mismatch:{safe_rel}")
            schema_err = _validate_ingest_artifact_schema(label, p)
            if schema_err:
                doc_errors.append(schema_err)
            claimed_names.add(label)
            validated.append({
                "label": label, "relative_path": safe_rel,
                "sha256": str(arow.get("sha256", "")), "bytes": int(arow.get("bytes", 0) or 0),
            })

        # Required core artifacts + extracted text.
        for core in REQUIRED_INGEST_CORE:
            if core not in claimed_names:
                doc_errors.append(f"missing_required:{core}")
        if not ({"extracted.txt", "extracted.md"} & claimed_names):
            doc_errors.append("missing_required:extracted_text")

        # No unexpected files under docs/<doc_id>/.
        doc_dir = package_dir / "docs" / doc_id
        if doc_dir.is_dir():
            for child in sorted(doc_dir.iterdir()):
                if child.is_dir():
                    report["unexpected"].append(f"docs/{doc_id}/{child.name}/")
                elif child.name not in claimed_names:
                    report["unexpected"].append(f"docs/{doc_id}/{child.name}")

        # Linkage drift: result manifest vs source manifest record.
        src_rec = source_by_doc.get(doc_id)
        if src_rec is not None:
            for fld in ("queue_item_id", "url_hash"):
                if str(drow.get(fld, "")) != str(getattr(src_rec, fld, "") or ""):
                    doc_errors.append(
                        f"linkage_drift:{fld}:{drow.get(fld)!r}!={getattr(src_rec, fld, '')!r}"
                    )

        report["documents"].append({
            "doc_id": doc_id,
            "queue_item_id": str(drow.get("queue_item_id", "")),
            "url_hash": str(drow.get("url_hash", "")),
            "source_url": str(drow.get("source_url", "")),
            "declared_source_type": str(drow.get("declared_source_type", "")),
            "local_source_filename": local_source_filename,
            "artifacts": validated,
            "errors": doc_errors,
        })
        report["errors"].extend(f"{doc_id}:{e}" for e in doc_errors)

    # Exact coverage: every expected doc must come back.
    for missing in sorted(expected_doc_ids - seen_doc_ids):
        report["errors"].append(f"missing_result_doc:{missing}")

    report["ok"] = not report["errors"] and not report["unexpected"]
    return report


def ingest_result_linkages(package_dir: Path) -> list[dict]:
    """Per-doc queue linkage from a result manifest. Pure; no DB access.

    Returns ``[{doc_id, queue_item_id, url_hash, source_url}]`` for the importer
    CLI to relink the source queue after a successful corpus write.
    """
    data = json.loads((Path(package_dir) / INGEST_RESULT_MANIFEST_NAME).read_text(encoding="utf-8"))
    out: list[dict] = []
    for d in data.get("documents", []):
        if isinstance(d, dict):
            out.append({
                "doc_id": str(d.get("doc_id", "")),
                "queue_item_id": str(d.get("queue_item_id", "")),
                "url_hash": str(d.get("url_hash", "")),
                "source_url": str(d.get("source_url", "")),
            })
    return out


def import_ingest_result(
    package_dir: Path,
    *,
    corpus_dir: Path,
    dry_run: bool = False,
    force: bool = False,
) -> dict:
    """Validate a returned ingest_result package, then import into the live corpus.

    Validate-all-before-copy: if any document/artifact fails verification — or any
    existing corpus doc is researcher-reviewed/edited and ``force`` is False —
    nothing is written. On success each artifact (incl. the copied original) is
    written into ``corpus_dir/<doc_id>/`` atomically; any existing target is first
    backed up to ``<label>.preimport-<ts>``; an ``offload_import.json`` provenance
    sidecar is written. Any write-phase exception rolls the corpus back. This
    function never touches source_queue.db, Sanity/Supabase, the package
    lifecycle, or any model.
    """
    package_dir = Path(package_dir)
    corpus_dir = Path(corpus_dir)
    report = verify_ingest_result(package_dir, corpus_dir=corpus_dir)

    summary: dict = {
        "package_dir": str(package_dir),
        "package_id": report.get("package_id", ""),
        "ok": report["ok"],
        "dry_run": dry_run,
        "force": force,
        "imported": False,
        "lifecycle": report.get("lifecycle"),
        "errors": list(report["errors"]) + [f"unexpected:{u}" for u in report["unexpected"]],
        "reviewed_blocked": [],
        "documents": [],
    }

    if not report["ok"]:
        summary["ok"] = False
        return summary  # corpus untouched

    # Reviewed/local-edited guard — validate across all docs before any write.
    blocked = [
        doc["doc_id"] for doc in report["documents"]
        if (corpus_dir / doc["doc_id"]).exists()
        and _is_reviewed_corpus_doc(corpus_dir / doc["doc_id"])
        and not force
    ]
    if blocked:
        summary["ok"] = False
        summary["reviewed_blocked"] = blocked
        summary["errors"].append(
            "reviewed_doc_blocked:" + ",".join(blocked) + " (use --force to overwrite)"
        )
        return summary

    if dry_run:
        summary["documents"] = [
            {"doc_id": d["doc_id"], "would_write": [a["label"] for a in d["artifacts"]],
             "queue_item_id": d["queue_item_id"], "url_hash": d["url_hash"]}
            for d in report["documents"]
        ]
        return summary

    imported_at = now_utc()
    source_state = (report.get("lifecycle") or {}).get("manifest_state", "")
    created_files: list[Path] = []
    backup_pairs: list[tuple[Path, Path]] = []
    written_docs: list[dict] = []
    try:
        for doc in report["documents"]:
            doc_id = doc["doc_id"]
            corpus_doc_dir = corpus_dir / doc_id
            written: list[dict] = []
            backups: list[dict] = []

            def _record_write(dest: Path, label: str) -> None:
                if dest.exists():
                    backup = corpus_doc_dir / f"{label}.preimport-{_offload._fs_timestamp()}"
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
                    "sha256": artifact["sha256"], "bytes": artifact["bytes"],
                })

            provenance = {
                "imported_at": imported_at,
                "package_id": summary["package_id"],
                "package_kind": PACKAGE_KIND_INGEST,
                "source_lifecycle_state": source_state,
                "queue_item_id": doc["queue_item_id"],
                "url_hash": doc["url_hash"],
                "source_url": doc["source_url"],
                "declared_source_type": doc["declared_source_type"],
                "local_source_filename": doc["local_source_filename"],
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
                "queue_item_id": doc["queue_item_id"],
                "url_hash": doc["url_hash"],
            })
    except Exception as exc:  # noqa: BLE001 — any write failure must roll back cleanly
        _offload._rollback_import(created_files, backup_pairs)
        summary["ok"] = False
        summary["imported"] = False
        summary["documents"] = []
        summary["errors"].append(f"write_failed_rolled_back:{exc}")
        return summary

    summary["documents"] = written_docs
    summary["imported"] = True
    return summary
