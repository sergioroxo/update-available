"""Read-only sealed semantic review and preview-only reconciliation.

The functions in this module never extract archives, invoke a model, open a
worker database, import a source, or mutate corpus/Source Queue state.  The
only writer is the explicit researcher-decision helper, which adds one new
immutable event file to a dedicated local review ledger.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import tarfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path, PurePosixPath
from typing import Any, Iterable, Mapping, Sequence

from runner.pipeline.atomic_io import atomic_write_bytes
from runner.pipeline.factory_messages import canonical_json_bytes, sha256_bytes
from runner.pipeline.factory_review_adapter import preview_returned_proposals


_SHA256 = re.compile(r"^[0-9a-f]{64}$")
_SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$")
_EVENT_FILE = re.compile(r"^(\d{8})-([0-9a-f]{12})\.json$")
_MAX_MANIFEST_BYTES = 8 * 1024 * 1024
_MAX_MEMBER_BYTES = 64 * 1024 * 1024
_MAX_ARCHIVE_BYTES = 256 * 1024 * 1024
_MAX_TOTAL_MEMBER_BYTES = 256 * 1024 * 1024
_MAX_ARCHIVE_MEMBERS = 20_000
_MAX_NOTE_CHARACTERS = 1_000
_CREDENTIAL_MARKERS = (
    re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(rb"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(rb"\bgh[pousr]_[A-Za-z0-9]{36,}\b"),
    re.compile(rb"\bsk-[A-Za-z0-9_-]{20,}\b"),
)

_SEALED_ROOT_FILES = frozenset({
    "anchor_candidates.json",
    "content_free_failures.json",
    "execution_summary.json",
    "index_manifest.json",
    "model_receipts.json",
    "pilot_projection.json",
    "researcher_comparison_report.json",
    "route_provenance.json",
    "source_partition_manifest.json",
})
_SEALED_DIRECTORIES = frozenset({
    "analysis", "compiler-input", "compilers", "enrichment", "retrieval",
})
_REQUIRED_ROOT_FILES = frozenset({
    "execution_summary.json",
    "model_receipts.json",
    "pilot_projection.json",
    "researcher_comparison_report.json",
    "source_partition_manifest.json",
})
_FORBIDDEN_PATH_MARKERS = (
    "source.txt", "source.md", ".sqlite", ".sqlite3", "-wal", "-shm",
    "-journal", ".env", "cache", "vector", "credential", "private-key",
    "worker.db", ".log", ".pid", ".lock", ".npy", ".npz", ".gguf",
)

DOCUMENT_DISPOSITIONS = (
    "undecided",
    "accept_for_later_reconciliation",
    "hold_for_follow_up",
    "exclude_from_reconciliation",
)
PROPOSAL_DISPOSITIONS = (
    "undecided",
    "accept_for_later_routing",
    "reject",
    "hold_for_follow_up",
)


@dataclass(frozen=True)
class AcceptedCampaignEvidence:
    run_id: str
    schema_version: str
    campaign_state: str
    semantic_projection_sha256: str
    receipt_count: int
    acceptance_status: str
    source_commit: str = ""

    def display(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "campaign_state": self.campaign_state,
            "semantic_projection_sha256": self.semantic_projection_sha256,
            "receipt_count": self.receipt_count,
            "acceptance_status": self.acceptance_status,
        }


def _safe_id(value: Any, *, field: str) -> str:
    text = str(value or "")
    if not _SAFE_ID.fullmatch(text):
        raise ValueError(f"{field} is not a safe bounded identifier")
    return text


def _sha(value: Any, *, field: str) -> str:
    text = str(value or "")
    if not _SHA256.fullmatch(text):
        raise ValueError(f"{field} is not a SHA-256 identity")
    return text


def _read_json_file(path: Path, *, maximum_bytes: int = _MAX_MANIFEST_BYTES) -> dict[str, Any]:
    path = Path(path)
    if path.is_symlink() or not path.is_file():
        raise ValueError("review metadata path is missing or unsafe")
    if path.stat().st_size > maximum_bytes:
        raise ValueError("review metadata exceeds the bounded size")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError("review metadata is not canonical JSON") from exc
    if not isinstance(value, dict):
        raise ValueError("review metadata root must be an object")
    return value


def accepted_campaign_evidence(payload: Mapping[str, Any]) -> AcceptedCampaignEvidence | None:
    """Recognize accepted content-free campaign evidence by schema and invariants."""
    schema = str(payload.get("schema_version") or "")
    if schema == "run023-final-content-free-execution-report-v1.0":
        corrected = payload.get("corrected_observer_projection") or {}
        isolation = payload.get("isolation") or {}
        counters = payload.get("semantic_execution_counters") or {}
        terminal = payload.get("terminal_hashes") or {}
        if not (
            payload.get("content_free") is True
            and corrected.get("valid") is True
            and corrected.get("campaign_state") == "succeeded"
            and isolation.get("remote_research_writes") == 0
            and counters.get("model_calls") == 0
            and counters.get("embedding_calls") == 0
        ):
            raise ValueError("Run-023 acceptance evidence contradicts its safe terminal state")
        return AcceptedCampaignEvidence(
            run_id=_safe_id(payload.get("run_id"), field="run_id"),
            schema_version=schema,
            campaign_state="succeeded",
            semantic_projection_sha256=_sha(
                terminal.get("semantic_projection_sha256"),
                field="semantic_projection_sha256",
            ),
            receipt_count=int(corrected.get("verified_authenticated_receipt_count") or 0),
            acceptance_status="accepted_recovery_aware_projection",
            source_commit=str((payload.get("source") or {}).get("commit") or ""),
        )
    if schema == "surviving-sogice-run024-content-free-final-report-v1.0":
        station = payload.get("station_projection") or {}
        parity = payload.get("authenticated_receipt_parity") or {}
        terminal = payload.get("terminal_projections") or {}
        prohibited = payload.get("prohibited_actions") or {}
        if not (
            payload.get("content_free") is True
            and station.get("campaign_state") == "succeeded"
            and parity.get("exact_parity") is True
            and parity.get("projection_valid") is True
            and prohibited.get("remote_research_write") is False
            and prohibited.get("corpus_import") is False
            and prohibited.get("publication") is False
        ):
            raise ValueError("Run-024 acceptance evidence contradicts its safe terminal state")
        return AcceptedCampaignEvidence(
            run_id=_safe_id(payload.get("run_id"), field="run_id"),
            schema_version=schema,
            campaign_state="succeeded",
            semantic_projection_sha256=_sha(
                terminal.get("semantic_projection_sha256"),
                field="semantic_projection_sha256",
            ),
            receipt_count=int(parity.get("verified_receipts") or 0),
            acceptance_status="accepted_memory_safe_completion",
            source_commit=str((payload.get("source_release") or {}).get("final_commit") or ""),
        )
    if schema == "run025d-non-target-schema-migration-incident-v1.0":
        verification = payload.get("run025_verification") or {}
        acceptance = payload.get("conditional_acceptance") or {}
        if not (
            payload.get("content_free") is True
            and acceptance.get("accepted") is True
            and verification.get("campaign_state") == "succeeded"
            and verification.get("factory_projection_valid") is True
            and verification.get("receipt_checksum_failures") == 0
            and verification.get("zero_work_invocation_steps") == 0
            and verification.get("unchanged_after_zero_work") is True
        ):
            raise ValueError("Run-025 acceptance evidence contradicts its safe terminal state")
        return AcceptedCampaignEvidence(
            run_id=_safe_id(verification.get("run_id"), field="run_id"),
            schema_version=schema,
            campaign_state="succeeded",
            semantic_projection_sha256=_sha(
                verification.get("semantic_projection_sha256"),
                field="semantic_projection_sha256",
            ),
            receipt_count=int(verification.get("receipt_checksums_verified") or 0),
            acceptance_status=str(acceptance.get("completion_marker") or "accepted"),
        )
    return None


def discover_accepted_campaign_evidence(
    roots: Iterable[Path],
) -> dict[str, AcceptedCampaignEvidence]:
    """Find accepted content-free reports without relying on directory names."""
    discovered: dict[str, AcceptedCampaignEvidence] = {}
    candidates: set[Path] = set()
    for raw_root in roots:
        root = Path(raw_root)
        if root.is_symlink() or not root.is_dir():
            continue
        for pattern in ("*report*.json", "*audit*.json"):
            candidates.update(path for path in root.rglob(pattern) if path.is_file())
    for path in sorted(candidates):
        if path.is_symlink() or path.stat().st_size > _MAX_MANIFEST_BYTES:
            continue
        try:
            payload = _read_json_file(path)
        except ValueError:
            continue
        evidence = accepted_campaign_evidence(payload)
        if evidence is None:
            continue
        previous = discovered.get(evidence.run_id)
        if previous is not None and previous != evidence:
            raise ValueError("conflicting accepted campaign evidence was discovered")
        discovered[evidence.run_id] = evidence
    return discovered


def _sealed_member_name(value: Any) -> str:
    name = str(value or "")
    pure = PurePosixPath(name)
    if (
        not name or name.startswith("/") or "\\" in name
        or any(part in {"", ".", ".."} for part in pure.parts)
        or pure.suffix != ".json"
    ):
        raise ValueError("sealed result manifest contains an unsafe member path")
    if len(pure.parts) == 1:
        if pure.name not in _SEALED_ROOT_FILES:
            raise ValueError("sealed result manifest contains a forbidden root member")
    elif len(pure.parts) == 2:
        if pure.parts[0] not in _SEALED_DIRECTORIES:
            raise ValueError("sealed result manifest contains a forbidden member directory")
    else:
        raise ValueError("sealed result manifest member nesting is forbidden")
    folded = name.casefold()
    if any(marker in folded for marker in _FORBIDDEN_PATH_MARKERS):
        raise ValueError("sealed result manifest contains runtime or source material")
    return name


def _json_members(
    archive: Path, manifest: Mapping[str, Any], *, expected_archive_sha256: str,
) -> dict[str, dict[str, Any]]:
    archive = Path(archive)
    if archive.is_symlink() or not archive.is_file():
        raise ValueError("sealed results archive is missing or unsafe")
    if archive.stat().st_size > _MAX_ARCHIVE_BYTES:
        raise ValueError("sealed results archive exceeds the bounded size")
    archive_bytes = archive.read_bytes()
    if sha256_bytes(archive_bytes) != expected_archive_sha256:
        raise ValueError("sealed results archive identity mismatch")
    archive_size = manifest.get("archive_bytes", len(archive_bytes))
    if not isinstance(archive_size, int) or archive_size != len(archive_bytes):
        raise ValueError("sealed results archive byte count mismatch")
    declared_rows = manifest.get("members")
    if not isinstance(declared_rows, list) or not declared_rows:
        raise ValueError("sealed results manifest has no declared members")
    if len(declared_rows) > _MAX_ARCHIVE_MEMBERS:
        raise ValueError("sealed results manifest exceeds the member limit")
    declared: dict[str, dict[str, Any]] = {}
    for raw in declared_rows:
        if not isinstance(raw, dict):
            raise ValueError("sealed results manifest member is malformed")
        name = _sealed_member_name(raw.get("path"))
        if name in declared:
            raise ValueError("sealed results manifest contains duplicate members")
        size = raw.get("bytes")
        if not isinstance(size, int) or not 0 <= size <= _MAX_MEMBER_BYTES:
            raise ValueError("sealed results manifest member size is invalid")
        _sha(raw.get("sha256"), field="member_sha256")
        declared[name] = raw
    if sum(row["bytes"] for row in declared.values()) > _MAX_TOTAL_MEMBER_BYTES:
        raise ValueError("sealed results manifest exceeds the total member byte limit")
    if not _REQUIRED_ROOT_FILES.issubset(declared):
        raise ValueError("sealed results manifest is missing required review evidence")
    if manifest.get("source_payload_members", 0) != 0:
        raise ValueError("sealed results archive declares source payload members")
    if manifest.get("raw_vector_members", 0) != 0:
        raise ValueError("sealed results archive declares raw vector members")
    if manifest.get("remote_writes", 0) != 0:
        raise ValueError("sealed results manifest declares a remote write")

    observed: dict[str, dict[str, Any]] = {}
    with tarfile.open(archive, "r:gz") as handle:
        members = handle.getmembers()
        names = [member.name for member in members]
        if len(names) != len(set(names)):
            raise ValueError("sealed results archive contains duplicate members")
        for member in members:
            name = _sealed_member_name(member.name)
            if not member.isfile() or member.issym() or member.islnk():
                raise ValueError("sealed results archive contains a non-file member")
            if name not in declared:
                raise ValueError("sealed results archive contains an undeclared member")
            if member.size != declared[name]["bytes"] or member.size > _MAX_MEMBER_BYTES:
                raise ValueError("sealed results archive member byte count mismatch")
            extracted = handle.extractfile(member)
            if extracted is None:
                raise ValueError("sealed results archive member is unreadable")
            content = extracted.read(_MAX_MEMBER_BYTES + 1)
            if len(content) != member.size or sha256_bytes(content) != declared[name]["sha256"]:
                raise ValueError("sealed results archive member identity mismatch")
            if any(pattern.search(content) for pattern in _CREDENTIAL_MARKERS):
                raise ValueError("sealed results archive contains credential-like material")
            try:
                payload = json.loads(content.decode("utf-8"))
            except (UnicodeError, json.JSONDecodeError) as exc:
                raise ValueError("sealed results archive member is not canonical JSON") from exc
            if not isinstance(payload, dict):
                raise ValueError("sealed results archive JSON member is not an object")
            observed[name] = payload
    if set(observed) != set(declared):
        raise ValueError("sealed results archive member set mismatch")
    return observed


def verify_sealed_campaign(
    archive: Path,
    manifest_path: Path,
    *,
    accepted_evidence: Mapping[str, AcceptedCampaignEvidence] | None = None,
) -> dict[str, Any]:
    """Verify one sealed archive and return a read-only review projection."""
    manifest = _read_json_file(manifest_path)
    expected_archive_sha = _sha(manifest.get("archive_sha256"), field="archive_sha256")
    archive_name = str(manifest.get("archive_path") or "")
    if not archive_name or Path(archive_name).name != archive_name:
        raise ValueError("sealed results manifest archive path is unsafe")
    if Path(archive).name != archive_name:
        raise ValueError("sealed results manifest/archive filename mismatch")
    observed = _json_members(
        archive, manifest, expected_archive_sha256=expected_archive_sha,
    )
    execution = observed["execution_summary.json"]
    run_id = _safe_id(execution.get("run_id"), field="run_id")
    if manifest.get("run_id") not in {None, "", run_id}:
        raise ValueError("sealed manifest and execution campaign identities disagree")
    if execution.get("remote_writes", 0) != 0:
        raise ValueError("sealed execution summary declares remote writes")
    if execution.get("corpus_import", False) is not False:
        raise ValueError("sealed execution summary declares corpus import")
    if execution.get("publication", False) is not False:
        raise ValueError("sealed execution summary declares publication")

    projection = observed["pilot_projection.json"]
    projection_sha = _sha(
        projection.get("projection_sha256") or execution.get("projection_sha256"),
        field="projection_sha256",
    )
    if execution.get("projection_sha256") not in {None, "", projection_sha}:
        raise ValueError("sealed execution and projection identities disagree")
    if manifest.get("projection_sha256") not in {None, "", projection_sha}:
        raise ValueError("sealed manifest and projection identities disagree")
    security_scan = manifest.get("security_scan") or {}
    if not isinstance(security_scan, dict) or any(
        security_scan.get(field, 0) != 0
        for field in (
            "credential_match_count", "forbidden_member_count",
            "raw_vector_members", "source_payload_members",
        )
    ):
        raise ValueError("sealed manifest security scan is unsafe")

    partition = observed["source_partition_manifest.json"]
    source_rows = partition.get("documents")
    if not isinstance(source_rows, list) or not source_rows:
        raise ValueError("sealed source partition manifest has no documents")
    sources: dict[str, dict[str, Any]] = {}
    for raw in source_rows:
        if not isinstance(raw, dict):
            raise ValueError("sealed source partition row is malformed")
        document_id = _safe_id(raw.get("document_id"), field="document_id")
        if document_id in sources:
            raise ValueError("sealed source partition contains duplicate documents")
        source_sha = _sha(raw.get("source_sha256"), field="source_sha256")
        if raw.get("reconstruction_percent") != 100:
            raise ValueError("sealed source partition is not an exact reconstruction")
        sources[document_id] = {**raw, "source_sha256": source_sha}
    document_ids = frozenset(sources)

    analyses = {
        PurePosixPath(name).stem: payload
        for name, payload in observed.items() if name.startswith("analysis/")
    }
    enrichments = {
        PurePosixPath(name).stem: payload
        for name, payload in observed.items() if name.startswith("enrichment/")
    }
    retrieval = {
        PurePosixPath(name).stem.removesuffix("-qwen"): payload
        for name, payload in observed.items()
        if name.startswith("retrieval/") and name.endswith("-qwen.json")
    }
    if set(analyses) != document_ids or set(enrichments) != document_ids or set(retrieval) != document_ids:
        raise ValueError("sealed document review member coverage is incomplete")
    for document_id, analysis in analyses.items():
        if analysis.get("document_id") not in {None, document_id}:
            raise ValueError("sealed Analysis document identity mismatch")
    for document_id, enrichment in enrichments.items():
        if enrichment.get("document_id") != document_id:
            raise ValueError("sealed Enrichment document identity mismatch")
    for document_id, context in retrieval.items():
        query = context.get("query") or {}
        if query.get("requesting_document_id") not in {None, document_id}:
            raise ValueError("sealed retrieval context document identity mismatch")

    comparison = observed["researcher_comparison_report.json"]
    compiler_rows = comparison.get("compiler_comparisons")
    if not isinstance(compiler_rows, list):
        raise ValueError("sealed compiler comparison is malformed")
    compiler_ids = [row.get("document_id") for row in compiler_rows if isinstance(row, dict)]
    if len(compiler_ids) != len(compiler_rows) or set(compiler_ids) != document_ids:
        raise ValueError("sealed compiler comparison document coverage is incomplete")
    comparison_provenance = comparison.get("comparison_provenance") or {}
    if not isinstance(comparison_provenance, dict):
        raise ValueError("sealed comparison provenance is malformed")
    if comparison_provenance and set(comparison_provenance) != document_ids:
        raise ValueError("sealed comparison provenance document coverage is incomplete")

    receipt_log = observed["model_receipts.json"]
    receipts = receipt_log.get("receipts")
    if (
        receipt_log.get("schema_version") != "copied-pilot-model-receipts-v1.0"
        or not isinstance(receipts, list) or not receipts
    ):
        raise ValueError("sealed model receipt log is incomplete")
    receipt_ids = [row.get("receipt_sha256") for row in receipts if isinstance(row, dict)]
    if (
        len(receipt_ids) != len(receipts)
        or len(set(receipt_ids)) != len(receipt_ids)
        or any(not isinstance(value, str) or not _SHA256.fullmatch(value) for value in receipt_ids)
    ):
        raise ValueError("sealed model receipt identities are malformed or duplicated")

    route_provenance = observed.get("route_provenance.json") or {}
    if route_provenance:
        if route_provenance.get("remote_routes", 0) != 0:
            raise ValueError("sealed route provenance declares a remote route")
        if not isinstance(route_provenance.get("bindings") or {}, dict):
            raise ValueError("sealed route provenance bindings are malformed")

    evidence = (accepted_evidence or {}).get(run_id)
    verification_status = "verified_manifest_and_members"
    if evidence is not None:
        if evidence.campaign_state != "succeeded":
            raise ValueError("accepted campaign evidence is not terminally succeeded")
        if evidence.semantic_projection_sha256 != projection_sha:
            raise ValueError("sealed campaign projection does not match accepted evidence")
        verification_status = "verified_against_accepted_evidence"

    return {
        "schema_version": "semantic-sealed-review-v2.0",
        "run_id": run_id,
        "campaign_state": "already_complete_read_only",
        "verification_status": verification_status,
        "archive_sha256": expected_archive_sha,
        "manifest_schema_version": str(manifest.get("schema_version") or "legacy-compatible"),
        "member_count": len(observed),
        "document_count": len(document_ids),
        "projection_sha256": projection_sha,
        "model_calls": 0,
        "embedding_calls": 0,
        "mutation_count": 0,
        "analysis": analyses,
        "enrichment": enrichments,
        "retrieval": retrieval,
        "comparison": comparison,
        "execution": execution,
        "route_provenance": route_provenance,
        "source_documents": sources,
        "receipt_count": len(receipts),
        "receipt_gaps": (),
        "accepted_evidence": evidence.display() if evidence else None,
        "methodological_warnings": (
            "Analysis, comparisons, retrieval, and Enrichment remain provisional.",
            "No model, comparison route, ranking, claim, or proposal is declared correct.",
            "Review decisions do not authorize import, routing, promotion, or publication.",
        ),
    }


def discover_sealed_campaigns(
    result_roots: Iterable[Path],
    *,
    evidence_roots: Iterable[Path] = (),
) -> tuple[dict[str, Any], ...]:
    """Return verified, unavailable, and rejected campaign catalog entries."""
    result_roots = tuple(Path(root) for root in result_roots)
    evidence = discover_accepted_campaign_evidence((*result_roots, *evidence_roots))
    manifest_paths: set[Path] = set()
    for root in result_roots:
        if root.is_symlink() or not root.is_dir():
            continue
        manifest_paths.update(path for path in root.rglob("*.manifest.json") if path.is_file())
    entries: list[dict[str, Any]] = []
    verified_by_run: dict[str, dict[str, Any]] = {}
    for manifest_path in sorted(manifest_paths):
        try:
            manifest = _read_json_file(manifest_path)
        except ValueError:
            continue
        if not isinstance(manifest.get("members"), list) or not manifest.get("archive_sha256"):
            continue
        archive_name = str(manifest.get("archive_path") or "")
        candidate_label = manifest_path.name
        try:
            if not archive_name or Path(archive_name).name != archive_name:
                raise ValueError("result manifest archive name is unsafe")
            review = verify_sealed_campaign(
                manifest_path.parent / archive_name,
                manifest_path,
                accepted_evidence=evidence,
            )
            run_id = review["run_id"]
            previous = verified_by_run.get(run_id)
            if previous and previous["archive_sha256"] != review["archive_sha256"]:
                raise ValueError("multiple different sealed archives claim the same campaign")
            verified_by_run[run_id] = review
        except (OSError, tarfile.TarError, ValueError) as exc:
            entries.append({
                "run_id": "unresolved",
                "status": "rejected",
                "verification_status": "rejected",
                "candidate": candidate_label,
                "reason": str(exc),
                "review": None,
            })
    for run_id, review in verified_by_run.items():
        entries.append({
            "run_id": run_id,
            "status": "verified_sealed",
            "verification_status": review["verification_status"],
            "document_count": review["document_count"],
            "receipt_count": review["receipt_count"],
            "projection_sha256": review["projection_sha256"],
            "review": review,
        })
    for run_id, accepted in evidence.items():
        if run_id not in verified_by_run:
            entries.append({
                "run_id": run_id,
                "status": "accepted_evidence_only",
                "verification_status": "sealed_results_not_present_on_macbook",
                "document_count": 0,
                "receipt_count": accepted.receipt_count,
                "projection_sha256": accepted.semantic_projection_sha256,
                "review": None,
            })
    order = {"verified_sealed": 0, "accepted_evidence_only": 1, "rejected": 2}
    return tuple(sorted(entries, key=lambda row: (order[row["status"]], row["run_id"], row.get("candidate", ""))))


def sealed_document_review_model(review: Mapping[str, Any], document_id: str) -> dict[str, Any]:
    """Project one verified document for the non-technical review UI."""
    if review.get("campaign_state") != "already_complete_read_only":
        raise ValueError("sealed campaign is not verified for read-only review")
    document_id = _safe_id(document_id, field="document_id")
    analyses = review.get("analysis") or {}
    enrichments = review.get("enrichment") or {}
    sources = review.get("source_documents") or {}
    if document_id not in analyses or document_id not in enrichments or document_id not in sources:
        raise ValueError("review document is outside the verified sealed campaign")
    comparison = review.get("comparison") or {}
    compiler = next((
        row for row in comparison.get("compiler_comparisons") or ()
        if isinstance(row, dict) and row.get("document_id") == document_id
    ), None)
    if compiler is None:
        raise ValueError("verified compiler comparison is missing")
    rankings = comparison.get("retrieval_rankings") or {}
    provenance = (comparison.get("comparison_provenance") or {}).get(document_id) or {
        "purpose": "comparison_route_not_recorded_in_legacy_archive",
        "requested_model": compiler.get("comparison_model", ""),
        "provider_resolved_model": compiler.get("comparison_model", ""),
        "fallback_reason": None,
    }
    analysis = analyses[document_id]
    enrichment = enrichments[document_id]
    context = (review.get("retrieval") or {}).get(document_id) or {}
    return {
        "document_id": document_id,
        "verification_status": review.get("verification_status", ""),
        "source_partition": sources[document_id],
        "analysis_summary": analysis.get("summary", ""),
        "analysis_evidence": tuple(analysis.get("evidence") or ()),
        "candidate_terms": tuple(analysis.get("candidate_terms") or ()),
        "primary_model": compiler.get("primary_model", ""),
        "comparison_model": compiler.get("comparison_model", ""),
        "comparison_provenance": provenance,
        "primary_claims": tuple(compiler.get("primary_claims") or ()),
        "comparison_claims": tuple(compiler.get("comparison_claims") or ()),
        "exact_agreement_count": compiler.get("exact_agreement_count", 0),
        "primary_only_count": compiler.get("primary_only_count", 0),
        "comparison_only_count": compiler.get("comparison_only_count", 0),
        "qwen_ranking": tuple((rankings.get("qwen_4096") or {}).get(document_id, ())),
        "bge_ranking": tuple((rankings.get("bge_m3_1024") or {}).get(document_id, ())),
        "retrieval_context": context,
        "retrieval_hits": tuple(context.get("selected_hits") or context.get("hits") or ()),
        "retrieval_exclusions": tuple(context.get("exclusions") or ()),
        "grounded_connections": tuple(enrichment.get("corpus_connections") or ()),
        "retrieval_context_sha256": enrichment.get("retrieval_context_sha256", ""),
        "receipt_count": review.get("receipt_count", 0),
        "receipt_gaps": tuple(review.get("receipt_gaps") or ()),
        "model_truth_declaration": compiler.get("model_truth_declaration", False),
    }


def _review_subject_ids(review: Mapping[str, Any]) -> dict[str, set[str]]:
    documents = set((review.get("source_documents") or {}).keys())
    proposals = {
        row["proposal_id"] for row in preview_returned_proposals(dict(review))
        if row["family"] == "lexicon_proposals"
    }
    return {"document": documents, "lexicon_proposal": proposals}


def _event_hash(event: Mapping[str, Any]) -> str:
    payload = {key: value for key, value in event.items() if key != "event_sha256"}
    return sha256_bytes(canonical_json_bytes(payload))


def load_review_events(ledger_root: Path) -> tuple[dict[str, Any], ...]:
    """Validate and load the immutable event-file review ledger."""
    root = Path(ledger_root)
    if not root.exists():
        return ()
    if root.is_symlink() or not root.is_dir():
        raise ValueError("review ledger root is unsafe")
    entries = sorted(root.iterdir())
    if any(
        path.is_symlink() or not path.is_file() or not _EVENT_FILE.fullmatch(path.name)
        for path in entries
    ):
        raise ValueError("review ledger contains an unexpected file")
    files = entries
    events = []
    latest: dict[tuple[str, str, str, str], str] = {}
    for expected_sequence, path in enumerate(files, start=1):
        match = _EVENT_FILE.fullmatch(path.name)
        assert match is not None
        if int(match.group(1)) != expected_sequence:
            raise ValueError("review ledger event sequence is not contiguous")
        event = _read_json_file(path, maximum_bytes=64 * 1024)
        if event.get("schema_version") != "sealed-review-disposition-event-v1.0":
            raise ValueError("review ledger event schema is unsupported")
        if event.get("sequence") != expected_sequence:
            raise ValueError("review ledger event payload sequence is invalid")
        event_sha = _sha(event.get("event_sha256"), field="event_sha256")
        if event_sha != _event_hash(event) or not path.name.endswith(f"-{event_sha[:12]}.json"):
            raise ValueError("review ledger event identity mismatch")
        archive_sha = _sha(event.get("archive_sha256"), field="archive_sha256")
        run_id = _safe_id(event.get("run_id"), field="run_id")
        subject_kind = str(event.get("subject_kind") or "")
        subject_id = _safe_id(event.get("subject_id"), field="subject_id")
        actions = DOCUMENT_DISPOSITIONS if subject_kind == "document" else (
            PROPOSAL_DISPOSITIONS if subject_kind == "lexicon_proposal" else ()
        )
        if event.get("action") not in actions:
            raise ValueError("review ledger event disposition is invalid")
        decided_at = datetime.fromisoformat(str(event.get("decided_at") or ""))
        if decided_at.tzinfo is None or decided_at.utcoffset() is None:
            raise ValueError("review ledger timestamp lacks a timezone")
        _safe_id(event.get("researcher_id"), field="researcher_id")
        note = event.get("note")
        if not isinstance(note, str) or len(note) > _MAX_NOTE_CHARACTERS or "\x00" in note:
            raise ValueError("review ledger note is malformed")
        key = (archive_sha, run_id, subject_kind, subject_id)
        previous = latest.get(key, "undecided")
        if event.get("previous_action") != previous:
            raise ValueError("review ledger previous disposition chain is invalid")
        latest[key] = str(event["action"])
        events.append(event)
    return tuple(events)


def review_disposition_projection(
    ledger_root: Path, review: Mapping[str, Any],
) -> dict[str, dict[str, Any]]:
    """Project the latest decisions bound to one exact verified archive."""
    if review.get("campaign_state") != "already_complete_read_only":
        raise ValueError("review dispositions require a verified sealed campaign")
    archive_sha = _sha(review.get("archive_sha256"), field="archive_sha256")
    run_id = _safe_id(review.get("run_id"), field="run_id")
    subjects = _review_subject_ids(review)
    projection: dict[str, dict[str, Any]] = {}
    for event in load_review_events(ledger_root):
        if event["archive_sha256"] != archive_sha or event["run_id"] != run_id:
            continue
        if event["subject_id"] not in subjects[event["subject_kind"]]:
            raise ValueError("review ledger contains a cross-document or forged subject")
        projection[f"{event['subject_kind']}:{event['subject_id']}"] = event
    return projection


def append_review_disposition(
    ledger_root: Path,
    review: Mapping[str, Any],
    *,
    subject_kind: str,
    subject_id: str,
    action: str,
    researcher_id: str,
    note: str = "",
    decided_at: datetime,
) -> dict[str, Any]:
    """Append one explicit local review decision after full-ledger validation."""
    if decided_at.tzinfo is None or decided_at.utcoffset() is None:
        raise ValueError("review decision timestamp must include a timezone")
    archive_sha = _sha(review.get("archive_sha256"), field="archive_sha256")
    run_id = _safe_id(review.get("run_id"), field="run_id")
    subjects = _review_subject_ids(review)
    subject_id = _safe_id(subject_id, field="subject_id")
    if subject_kind not in subjects or subject_id not in subjects[subject_kind]:
        raise ValueError("review decision subject is outside the verified archive")
    allowed = DOCUMENT_DISPOSITIONS if subject_kind == "document" else PROPOSAL_DISPOSITIONS
    if action not in allowed:
        raise ValueError("review decision action is not allowed for this subject")
    researcher_id = _safe_id(researcher_id, field="researcher_id")
    if not isinstance(note, str) or len(note) > _MAX_NOTE_CHARACTERS or "\x00" in note:
        raise ValueError("review decision note is malformed")
    existing = load_review_events(ledger_root)
    projection = review_disposition_projection(ledger_root, review)
    previous = projection.get(f"{subject_kind}:{subject_id}", {}).get("action", "undecided")
    event = {
        "schema_version": "sealed-review-disposition-event-v1.0",
        "sequence": len(existing) + 1,
        "archive_sha256": archive_sha,
        "run_id": run_id,
        "subject_kind": subject_kind,
        "subject_id": subject_id,
        "previous_action": previous,
        "action": action,
        "researcher_id": researcher_id,
        "note": note,
        "decided_at": decided_at.isoformat(),
        "event_sha256": "",
    }
    event["event_sha256"] = _event_hash(event)
    root = Path(ledger_root)
    if root.exists() and (root.is_symlink() or not root.is_dir()):
        raise ValueError("review ledger root is unsafe")
    filename = f"{event['sequence']:08d}-{event['event_sha256'][:12]}.json"
    destination = root / filename
    if destination.exists():
        raise ValueError("review decision event already exists")
    atomic_write_bytes(destination, canonical_json_bytes(event))
    return event


def _inventory_identity(row: Any) -> tuple[str, str, bool]:
    document_id = _safe_id(getattr(row, "document_id", ""), field="inventory_document_id")
    source_sha = str(getattr(row, "source_sha256", "") or "")
    if source_sha and not _SHA256.fullmatch(source_sha):
        raise ValueError("inventory source identity is malformed")
    return document_id, source_sha, bool(getattr(row, "eligible", False))


def _target_preview(
    *, document_id: str, source_sha: str, rows: Sequence[Any], target: str,
) -> dict[str, Any]:
    identities = [_inventory_identity(row) for row in rows]
    exact = [identity for identity in identities if identity[0] == document_id and identity[1] == source_sha]
    same_id = [identity for identity in identities if identity[0] == document_id and identity[1] != source_sha]
    same_hash = [identity for identity in identities if identity[1] == source_sha and identity[0] != document_id]
    if len(exact) == 1:
        action, reason = "link_existing_exact_identity", "document ID and source hash match"
    elif len(exact) > 1:
        action, reason = "hold_duplicate_exact_identity", "multiple exact local identities require review"
    elif same_id:
        action, reason = "hold_identity_hash_conflict", "the local document ID has different source bytes"
    elif same_hash:
        action, reason = "review_additive_alias", "the source hash exists under another stable document ID"
    else:
        action, reason = "await_source_before_additive_entry", "sealed results contain no source payload to import"
    return {
        "target": target,
        "action": action,
        "reason": reason,
        "reversible": True,
        "rollback_intent": "Remove only the future additive link or entry created under separate authorization.",
        "overwrite": False,
        "delete": False,
        "move": False,
        "mutation_authorized": False,
    }


def build_reconciliation_preview(
    review: Mapping[str, Any],
    *,
    corpus_rows: Sequence[Any] = (),
    source_queue_rows: Sequence[Any] = (),
    dispositions: Mapping[str, Mapping[str, Any]] | None = None,
) -> dict[str, Any]:
    """Build a deterministic zero-write corpus and Source Queue reconciliation plan."""
    if review.get("campaign_state") != "already_complete_read_only":
        raise ValueError("reconciliation preview requires verified sealed results")
    sources = review.get("source_documents") or {}
    if not isinstance(sources, dict) or not sources:
        raise ValueError("reconciliation preview has no verified source identities")
    dispositions = dispositions or {}
    rows = []
    for document_id, source in sorted(sources.items()):
        document_id = _safe_id(document_id, field="document_id")
        if not isinstance(source, Mapping):
            raise ValueError("reconciliation source identity is malformed")
        source_sha = _sha(source.get("source_sha256"), field="source_sha256")
        disposition = (dispositions.get(f"document:{document_id}") or {}).get(
            "action", "undecided",
        )
        target_rows = (
            _target_preview(
                document_id=document_id, source_sha=source_sha,
                rows=corpus_rows, target="corpus",
            ),
            _target_preview(
                document_id=document_id, source_sha=source_sha,
                rows=source_queue_rows, target="source_queue",
            ),
        )
        if disposition != "accept_for_later_reconciliation":
            target_rows = tuple({
                **row,
                "planned": False,
                "prerequisite": "Explicitly accept this document for later reconciliation.",
            } for row in target_rows)
        else:
            target_rows = tuple({
                **row,
                "planned": True,
                "prerequisite": (
                    "A later separate researcher authorization plus all source and conflict checks."
                ),
            } for row in target_rows)
        rows.append({
            "document_id": document_id,
            "source_sha256": source_sha,
            "disposition": disposition,
            "targets": target_rows,
        })
    payload = {
        "schema_version": "sealed-result-reconciliation-preview-v1.0",
        "run_id": review["run_id"],
        "archive_sha256": review["archive_sha256"],
        "rows": rows,
        "additive_only": True,
        "reversible": True,
        "import_authorized": False,
        "corpus_mutations": 0,
        "source_queue_mutations": 0,
        "proposal_routes": 0,
        "remote_writes": 0,
        "later_authorization_required": True,
    }
    payload["preview_sha256"] = sha256_bytes(canonical_json_bytes(payload))
    return payload


def configured_review_roots(environment: Mapping[str, str] | None = None) -> tuple[Path, ...]:
    """Return generic read-only result roots without exposing them to the UI."""
    environment = environment or os.environ
    configured = str(environment.get("SOGICE_SEALED_RESULTS_ROOTS") or "").strip()
    if configured:
        return tuple(Path(value).expanduser() for value in configured.split(os.pathsep) if value)
    return (Path.home() / "Documents" / "surviving-sogice-stuff",)
