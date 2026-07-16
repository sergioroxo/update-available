"""Shared local artifact validity and freshness rules.

These validators are deterministic and read-only. They distinguish presence,
structural validity, freshness, and human authority; they never execute repair.
"""
from __future__ import annotations

import json
import hashlib
import math
from pathlib import Path
from typing import Any

from .citation_units import SCHEMA_VERSION as CITATION_SCHEMA_VERSION, build_citation_units


SCHEMA_VERSION = "artifact-validation-v1.0"
MAX_VALIDATION_FILE_BYTES = 100 * 1024 * 1024


def _json(path: Path) -> tuple[Any, str]:
    if not path.is_file():
        return None, "missing"
    if path.is_symlink():
        return None, "invalid symbolic link"
    if path.stat().st_size > MAX_VALIDATION_FILE_BYTES:
        return None, "file exceeds validation size bound"
    try:
        return json.loads(path.read_text(encoding="utf-8")), ""
    except Exception as exc:
        return None, f"invalid JSON: {exc}"


def _jsonl(path: Path) -> tuple[list[dict], str]:
    if not path.is_file():
        return [], "missing"
    if path.is_symlink():
        return [], "invalid symbolic link"
    if path.stat().st_size > MAX_VALIDATION_FILE_BYTES:
        return [], "file exceeds validation size bound"
    rows: list[dict] = []
    try:
        for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if not line.strip():
                continue
            value = json.loads(line)
            if not isinstance(value, dict):
                return [], f"line {line_number} is not an object"
            rows.append(value)
    except Exception as exc:
        return [], f"invalid JSONL: {exc}"
    return rows, "" if rows else "empty"


def _fresh(outputs: list[Path], dependencies: list[Path]) -> tuple[bool | None, str]:
    if any(path.is_symlink() for path in [*outputs, *dependencies] if path.exists()):
        return False, "Linked evidence is not accepted as current local stage evidence."
    existing_outputs = [path for path in outputs if path.is_file()]
    missing_dependencies = [path.name for path in dependencies if not path.is_file()]
    if missing_dependencies:
        return False, f"Required dependencies are missing: {', '.join(missing_dependencies)}."
    existing_dependencies = list(dependencies)
    if not existing_outputs:
        return None, "Freshness cannot be compared because no output exists."
    if not existing_dependencies:
        return None, "No local dependency timestamp is available; freshness is unknown."
    oldest_output = min(path.stat().st_mtime_ns for path in existing_outputs)
    newest_dependency = max(path.stat().st_mtime_ns for path in existing_dependencies)
    if oldest_output < newest_dependency:
        return False, "A dependency is newer than the derived output."
    return True, "Derived output is at least as new as its recorded local dependencies."


def _safe_local_json_reference(doc_dir: Path, name: str) -> tuple[Path, Any, str]:
    """Resolve a sidecar filename without allowing absolute/traversal/symlink reads."""
    raw = str(name or "")
    candidate = doc_dir / raw if raw else doc_dir / "__missing_reference__"
    if (
        not raw or Path(raw).is_absolute() or Path(raw).name != raw
        or raw in {".", ".."} or "\x00" in raw
    ):
        return candidate, None, "unsafe local artifact reference"
    try:
        if candidate.resolve().parent != doc_dir.resolve():
            return candidate, None, "local artifact reference escapes the document directory"
    except OSError as exc:
        return candidate, None, f"local artifact reference cannot be resolved: {exc}"
    payload, error = _json(candidate)
    return candidate, payload, error


def _result(
    name: str,
    status: str,
    *,
    outputs: list[Path],
    dependencies: list[Path] | None = None,
    detail: str = "",
    completion_rule: str = "",
    human_authority: str = "",
    structurally_valid: bool | None = None,
) -> dict[str, Any]:
    dependencies = dependencies or []
    fresh, freshness_detail = _fresh(outputs, dependencies)
    if status == "complete" and fresh is False:
        status = "stale"
    present = bool(outputs) and all(path.is_file() for path in outputs)
    valid = (
        structurally_valid
        if structurally_valid is not None
        else status not in {"missing", "invalid", "blocked", "waiting_for_base_processing"}
    )
    return {
        "schema_version": SCHEMA_VERSION,
        "name": name,
        "status": status,
        "present": present,
        "valid": bool(valid),
        "completed": status == "complete",
        "fresh": fresh,
        "evidence": [path.name for path in outputs],
        "dependencies": [path.name for path in dependencies],
        "detail": "; ".join(value for value in (detail, freshness_detail) if value),
        "completion_rule": completion_rule,
        "human_authority": human_authority,
    }


def validate_stage(doc_dir: Path, stage: str) -> dict[str, Any]:
    doc_dir = Path(doc_dir)
    definitions = {
        "acquisition": (["intake.json"], [], "non-empty intake object"),
        "extraction": (["preprocess.json"], ["intake.json"], "preprocess object or non-empty extracted text"),
        "citation_units": (["citation_units.json"], ["preprocess.json", "extracted.txt"], "exact citation units for current extracted text"),
        "analysis": (["analysis.json", "analysis_audit.json"], ["preprocess.json", "extracted.txt"], "analysis object and error-free audit"),
        "enrichment": (["enrichment.json", "enrichment_audit.json"], ["analysis.json", "extracted.txt"], "enrichment object and error-free audit"),
        "embedding": (["embedding.json"], ["preprocess.json", "extracted.txt"], "non-empty embedding vector"),
    }
    if stage not in definitions:
        raise ValueError(f"Unsupported stage validator: {stage}")
    names, dependency_names, rule = definitions[stage]
    outputs = [doc_dir / name for name in names]
    dependencies = [doc_dir / name for name in dependency_names]
    if stage in {"citation_units", "analysis", "embedding"}:
        text_dependencies = [
            path for path in (doc_dir / "preprocess.json", doc_dir / "extracted.txt")
            if path.is_file()
        ]
        dependencies = text_dependencies or [doc_dir / "extracted.txt"]
    elif stage == "enrichment":
        dependencies = [doc_dir / "analysis.json"]
        if (doc_dir / "extracted.txt").is_file():
            dependencies.append(doc_dir / "extracted.txt")
    if stage == "extraction":
        preprocess, error = _json(doc_dir / "preprocess.json")
        extracted = doc_dir / "extracted.txt"
        extracted_error = ""
        extracted_valid = False
        if not extracted.is_file():
            extracted_error = "extracted.txt: missing"
        elif extracted.is_symlink():
            extracted_error = "extracted.txt: invalid symbolic link"
        elif extracted.stat().st_size > MAX_VALIDATION_FILE_BYTES:
            extracted_error = "extracted.txt: file exceeds validation size bound"
        else:
            extracted_valid = bool(
                extracted.read_text(encoding="utf-8", errors="replace").strip()
            )
            if not extracted_valid:
                extracted_error = "extracted.txt: empty"
        preprocess_valid = isinstance(preprocess, dict) and bool(preprocess)
        valid = preprocess_valid and extracted_valid
        errors = [
            value for value in (
                "" if preprocess_valid else f"preprocess.json: {error or 'empty or not an object'}",
                extracted_error,
            ) if value
        ]
        missing = any(value.endswith(": missing") for value in errors)
        return _result(
            stage, "complete" if valid else "missing" if missing else "invalid",
            outputs=[doc_dir / "preprocess.json", extracted], dependencies=dependencies,
            detail="; ".join(errors),
            completion_rule=rule, structurally_valid=valid,
        )

    payloads = []
    errors = []
    for path in outputs:
        payload, error = _json(path)
        payloads.append(payload)
        if error:
            errors.append(f"{path.name}: {error}")
    if any(error.endswith(": missing") for error in errors):
        return _result(stage, "missing", outputs=outputs, dependencies=dependencies, detail="; ".join(errors), completion_rule=rule, structurally_valid=False)
    if errors:
        return _result(stage, "invalid", outputs=outputs, dependencies=dependencies, detail="; ".join(errors), completion_rule=rule, structurally_valid=False)

    valid = True
    detail = ""
    if stage == "acquisition":
        valid = all(isinstance(payload, dict) and bool(payload) for payload in payloads)
        intake = payloads[0] if isinstance(payloads[0], dict) else {}
        if intake.get("doc_id") not in {None, "", doc_dir.name}:
            valid = False
            detail = "intake doc_id does not match the document directory"
    elif stage == "analysis":
        analysis = payloads[0] if isinstance(payloads[0], dict) else {}
        try:
            from runner.models.document import AnalysisResult
            AnalysisResult.model_validate(analysis)
            valid = True
        except Exception:
            valid = False
        if not valid:
            detail = "analysis does not satisfy the compatibility-aware AnalysisResult schema"
    elif stage == "enrichment":
        enrichment = payloads[0] if isinstance(payloads[0], dict) else {}
        try:
            from runner.models.enrichment import EnrichmentResult
            EnrichmentResult.model_validate(enrichment)
            valid = True
        except Exception:
            valid = False
        if not valid:
            detail = "enrichment does not satisfy EnrichmentResult"
    elif stage == "citation_units":
        payload = payloads[0] if isinstance(payloads[0], dict) else {}
        extracted = doc_dir / "extracted.txt"
        if not extracted.is_file() or extracted.is_symlink():
            valid = False
            detail = "canonical extracted.txt is missing or linked"
        elif extracted.stat().st_size > MAX_VALIDATION_FILE_BYTES:
            valid = False
            detail = "canonical extracted.txt exceeds validation size bound"
        else:
            text = extracted.read_text(encoding="utf-8", errors="replace")
            expected = build_citation_units(text, doc_id=doc_dir.name)
            valid = (
                payload.get("schema_version") == CITATION_SCHEMA_VERSION
                and payload.get("doc_id") == doc_dir.name
                and payload.get("source_artifact") == "extracted.txt"
                and payload.get("text_sha256") == expected["text_sha256"]
                and payload.get("char_count") == expected["char_count"]
                and payload.get("unit_count") == expected["unit_count"]
                and payload.get("units") == expected["units"]
            )
            if not valid:
                detail = "citation units do not exactly match the current canonical extracted text"
    elif stage == "embedding":
        payload = payloads[0] if isinstance(payloads[0], dict) else {}
        vector = payload.get("embedding") or payload.get("vector")
        model = payload.get("model") or payload.get("embedding_model")
        dimension = payload.get("dimension")
        valid = (
            isinstance(model, str) and bool(model.strip())
            and isinstance(vector, list) and bool(vector)
            and all(
                isinstance(value, (int, float)) and not isinstance(value, bool)
                and math.isfinite(float(value))
                for value in vector
            )
            and isinstance(dimension, int) and not isinstance(dimension, bool)
            and dimension == len(vector)
        )
        if not valid:
            detail = "embedding requires a model, finite numeric vector, and matching dimension"
    if stage in {"analysis", "enrichment"}:
        audit = payloads[-1]
        audit_errors = audit.get("errors") if isinstance(audit, dict) else None
        if (
            not isinstance(audit, dict)
            or not isinstance(audit_errors, list)
            or not all(isinstance(value, str) for value in audit_errors)
        ):
            valid = False
            detail = "audit must be an object with an errors list of text values"
        elif audit_errors:
            valid = False
            detail = f"audit reports {len(audit_errors)} error(s)"
    return _result(
        stage, "complete" if valid else "invalid", outputs=outputs,
        dependencies=dependencies, detail=detail, completion_rule=rule,
        structurally_valid=valid,
    )


def validate_preservation_stage(doc_dir: Path) -> dict[str, Any]:
    """Strictly project the existing preservation assessment without recapturing."""
    doc_dir = Path(doc_dir)
    status_path = doc_dir / "preservation_status.json"
    payload, error = _json(status_path)
    dependencies = [doc_dir / "intake.json", doc_dir / "preprocess.json"]
    if error == "missing":
        return _result(
            "preservation", "missing", outputs=[status_path], dependencies=dependencies,
            detail="No preservation assessment is recorded.",
            completion_rule="Record the existing preservation assessment; this validator performs no capture.",
            structurally_valid=False,
        )
    if error or not isinstance(payload, dict):
        return _result(
            "preservation", "invalid", outputs=[status_path], dependencies=dependencies,
            detail=error or "preservation status must be an object",
            structurally_valid=False,
        )
    raw = str(payload.get("preservation_status") or "")
    required_fields_valid = (
        raw in {"captured_html", "capture_needed", "metadata_only", "not_applicable"}
        and type(payload.get("capture_needed")) is bool
        and isinstance(payload.get("capture_reason"), str)
        and isinstance(payload.get("suggested_capture_route"), str)
        and isinstance(payload.get("public_archive_status"), str)
        and isinstance(payload.get("local_html_path"), str)
        and isinstance(payload.get("local_html_sha256"), str)
        and isinstance(payload.get("notes"), list)
        and all(isinstance(value, str) for value in payload.get("notes") or [])
    )
    if not required_fields_valid:
        return _result(
            "preservation", "invalid", outputs=[status_path], dependencies=dependencies,
            detail="preservation status fields or classifier are malformed",
            structurally_valid=False,
        )
    if raw == "captured_html":
        html_path = Path(payload["local_html_path"]) if payload["local_html_path"] else doc_dir / "__missing_source_html__"
        expected_hash = str(payload["local_html_sha256"])
        safe_html = False
        actual_hash = ""
        try:
            safe_html = (
                html_path.is_file() and not html_path.is_symlink()
                and html_path.resolve().parent == doc_dir.resolve()
                and html_path.stat().st_size <= MAX_VALIDATION_FILE_BYTES
                and len(expected_hash) == 64
            )
            if safe_html:
                actual_hash = hashlib.sha256(html_path.read_bytes()).hexdigest()
        except OSError:
            safe_html = False
        valid = safe_html and actual_hash == expected_hash and payload["capture_needed"] is False
        result = _result(
            "preservation", "complete" if valid else "invalid",
            outputs=[status_path],
            dependencies=dependencies,
            detail="Verified captured HTML path and SHA-256." if valid else "Captured HTML path/hash is missing, unsafe, or inconsistent.",
            completion_rule="Captured HTML must be a local regular file inside the document folder with a matching SHA-256.",
            structurally_valid=valid,
        )
        if safe_html:
            result["evidence"].append(html_path.name)
        return result
    if raw == "capture_needed":
        valid = payload["capture_needed"] is True and bool(payload["capture_reason"].strip())
        return _result(
            "preservation", "blocked" if valid else "invalid", outputs=[status_path],
            dependencies=dependencies,
            detail=payload["capture_reason"] or "Capture is required but no reason is recorded.",
            completion_rule="Use the recorded capture route before treating the source as preserved.",
            human_authority="Additional capture may require researcher access or review.",
            structurally_valid=valid,
        )
    if raw == "metadata_only":
        valid = payload["capture_needed"] is False and payload["suggested_capture_route"] == "media_metadata"
        return _result(
            "preservation", "ready" if valid else "invalid", outputs=[status_path],
            dependencies=dependencies,
            detail="Metadata-only is a preservation strategy; media evidence is validated separately.",
            completion_rule="Validate media metadata or transcript evidence before completion.",
            structurally_valid=valid,
        )
    valid = payload["capture_needed"] is False
    return _result(
        "preservation", "not_applicable" if valid else "invalid", outputs=[status_path],
        dependencies=dependencies,
        detail="HTML capture is not applicable to this local-file source.",
        structurally_valid=valid,
    )


def validate_specialist(doc_dir: Path, route: str) -> dict[str, Any]:
    doc_dir = Path(doc_dir)
    if not doc_dir.is_dir():
        return _result(
            route, "waiting_for_base_processing", outputs=[],
            detail="No corpus document exists yet.",
        )
    if route == "testimony":
        execution_hold = doc_dir / "testimony_candidates.execution_hold.json"
        if execution_hold.exists():
            hold, hold_error = _json(execution_hold)
            detail = (
                "A previous deterministic testimony-candidate execution was interrupted. "
                "Inspect its recovery evidence before clearing this hold."
            )
            if hold_error:
                detail += f" Hold marker error: {hold_error}."
            elif isinstance(hold, dict) and hold.get("reason"):
                detail += f" Reason: {hold['reason']}."
            return _result(
                route, "blocked", outputs=[execution_hold], detail=detail,
                completion_rule="Resolve the interrupted-execution hold before rebuilding or deep review.",
                human_authority="Clearing an ambiguous execution hold requires researcher review.",
                structurally_valid=False,
            )
        candidates_path = doc_dir / "testimony_candidates.json"
        analyses_path = doc_dir / "testimony_segment_analyses.jsonl"
        segments_path = doc_dir / "testimony_segments.json"
        review_path = doc_dir / "testimony_review.json"
        candidates, candidates_error = _json(candidates_path)
        analyses, analyses_error = _jsonl(analyses_path)
        segments, segments_error = _json(segments_path)
        review, review_error = _json(review_path)
        candidate_rows = candidates.get("candidates") if isinstance(candidates, dict) else None
        candidates_valid = isinstance(candidate_rows, list)
        candidate_count = len(candidate_rows) if candidates_valid else 0
        candidate_ids = {
            str(row.get("candidate_id") or "") for row in candidate_rows or []
            if isinstance(row, dict) and str(row.get("candidate_id") or "")
        }
        assessment_values = {
            "actual_testimony", "mediated_testimony", "case_story",
            "about_testimony_not_testimony", "not_testimony", "unclear",
        }
        review_states = {"approved", "rejected", "research_only", "needs_more_context"}

        def deep_row_valid(row: dict) -> bool:
            analysis = row.get("analysis") if isinstance(row.get("analysis"), dict) else {}
            assessment = analysis.get("candidate_assessment") if isinstance(analysis.get("candidate_assessment"), dict) else {}
            return (
                row.get("status") == "succeeded"
                and assessment.get("assessment") in assessment_values
                and assessment.get("recommended_review_state") in review_states
                and isinstance(analysis.get("segments"), list)
            )

        succeeded_ids = {
            str(row.get("candidate_id") or "") for row in analyses
            if deep_row_valid(row) and str(row.get("candidate_id") or "")
        }
        segment_rows = segments.get("segments") if isinstance(segments, dict) else None
        assessment_rows = segments.get("assessments") if isinstance(segments, dict) else []
        assessed_ids = {
            str(row.get("candidate_id") or "")
            for row in (assessment_rows or []) if isinstance(row, dict)
            if str(row.get("candidate_id") or "")
            and row.get("assessment") in assessment_values
            and row.get("recommended_review_state") in review_states
        }
        deep_required = candidate_count > 0
        deep_fresh = (
            not deep_required
            or (
                analyses_path.is_file() and segments_path.is_file()
                and min(analyses_path.stat().st_mtime_ns, segments_path.stat().st_mtime_ns)
                >= candidates_path.stat().st_mtime_ns
            )
        )
        deep_valid = (
            not deep_required
            or (
                not analyses_error and len(candidate_ids) == candidate_count
                and candidate_ids and candidate_ids == succeeded_ids == assessed_ids
                and not segments_error and isinstance(segment_rows, list)
                and deep_fresh
            )
        )
        consent = str(review.get("consent_status") or "") if isinstance(review, dict) else ""
        review_valid = (
            isinstance(review, dict) and review.get("reviewed") is True
            and consent in {"pending", "confirmed", "refused", "withdrawn"}
        )
        structural_errors = []
        if candidates_error:
            structural_errors.append(f"candidates: {candidates_error}")
        elif not candidates_valid:
            structural_errors.append("candidates: expected a candidates list")
        if deep_required and analyses_error:
            structural_errors.append(f"deep analyses: {analyses_error}")
        if deep_required and segments_error:
            structural_errors.append(f"segments: {segments_error}")
        if deep_required and candidate_ids != succeeded_ids:
            structural_errors.append("deep analyses do not cover every current candidate_id exactly")
        if deep_required and candidate_ids != assessed_ids:
            structural_errors.append("segments assessments do not cover every current candidate_id exactly")
        if review_error not in {"", "missing"}:
            structural_errors.append(f"review: {review_error}")
        if candidates_error == "missing":
            status = "pending"
        elif structural_errors and any("invalid" in error or "expected" in error for error in structural_errors):
            status = "invalid"
        elif not deep_valid:
            status = "stale" if deep_required and not deep_fresh else "in_progress"
        elif not review_valid:
            status = "human_required"
        else:
            status = "complete"
        if review_path.is_file():
            outputs = [review_path]
            dependencies = [doc_dir / "analysis.json", candidates_path]
            if deep_required:
                dependencies.extend([analyses_path, segments_path])
        else:
            outputs = [candidates_path]
            dependencies = [doc_dir / "analysis.json"]
            if deep_required:
                outputs.extend([analyses_path, segments_path])
        structurally_valid = (
            candidates_valid and candidates_error == "" and len(candidate_ids) == candidate_count
            and (not deep_required or (
                analyses_error == "" and segments_error == ""
                and candidate_ids == succeeded_ids == assessed_ids
            ))
            and review_error in {"", "missing"}
        )
        return _result(
            route, status, outputs=outputs, dependencies=dependencies,
            detail="; ".join(structural_errors), structurally_valid=structurally_valid,
            completion_rule="A valid candidate register; complete deep review for every candidate; reviewed=true; and an explicit consent state.",
            human_authority="Consent, public display, removal, and sensitive interpretation remain human-owned.",
        )
    if route == "legal":
        path = doc_dir / "legal_review.json"
        review, error = _json(path)
        complete = (
            isinstance(review, dict) and review.get("reviewed") is True
            and bool(str(review.get("reviewed_at") or "").strip())
            and bool(str(review.get("reviewed_by") or "").strip())
            and bool(str(review.get("notes") or "").strip())
        )
        status = "human_required" if error == "missing" else "invalid" if error else "complete" if complete else "human_required"
        return _result(
            route, status, outputs=[path], dependencies=[doc_dir / "analysis.json", doc_dir / "intake.json"],
            detail=error if error != "missing" else "",
            completion_rule="A human legal-review record has reviewed=true, reviewer, timestamp, and a non-empty interpretive note.",
            human_authority="Public legal interpretation remains human-owned.",
            structurally_valid=not bool(error),
        )
    if route == "longform":
        sections = doc_dir / "longform_sections.json"
        analyses_path = doc_dir / "longform_section_analyses.jsonl"
        synthesis = doc_dir / "longform_synthesis.json"
        sections_payload, sections_error = _json(sections)
        analyses, analyses_error = _jsonl(analyses_path)
        payload, synthesis_error = _json(synthesis)
        section_rows = sections_payload.get("sections") if isinstance(sections_payload, dict) else None
        section_count = len(section_rows) if isinstance(section_rows, list) else 0
        current_sections = {
            str(row.get("section_id") or ""): str(row.get("text_hash") or "")
            for row in section_rows or [] if isinstance(row, dict) and str(row.get("section_id") or "")
        }
        matched_ids = {
            str(row.get("section_id") or "")
            for row in analyses
            if row.get("status") == "succeeded"
            and str(row.get("section_id") or "") in current_sections
            and bool(current_sections[str(row.get("section_id") or "")])
            and str(row.get("text_hash") or "") == current_sections[str(row.get("section_id") or "")]
            and isinstance(row.get("analysis"), dict)
            and bool(str((row.get("analysis") or {}).get("section_summary") or "").strip())
        }
        current_identity_valid = (
            len(current_sections) == section_count
            and all(current_sections.values())
            and matched_ids == set(current_sections)
        )
        synthesis_valid = (
            isinstance(payload, dict) and payload.get("status") != "failed"
            and isinstance(payload.get("synthesis"), dict) and bool(payload.get("synthesis"))
            and int(payload.get("section_count") or 0) == section_count
            and int(payload.get("section_analyses_count") or 0) == len(matched_ids) == section_count
            and current_identity_valid
        )
        if sections_error == "missing":
            status = "pending"
        elif sections_error or not isinstance(section_rows, list) or not section_rows:
            status = "invalid"
        elif analyses_error or not current_identity_valid:
            status = "in_progress" if analyses_error in {"missing", "empty"} or matched_ids else "invalid"
        elif synthesis_error == "missing":
            status = "in_progress"
        elif synthesis_error or not synthesis_valid:
            status = "invalid"
        else:
            status = "complete"
        outputs = [path for path in (sections, analyses_path, synthesis) if path.is_file()]
        dependencies = [sections, analyses_path] if synthesis.is_file() else [doc_dir / "preprocess.json"]
        return _result(
            route, status, outputs=[synthesis] if synthesis.is_file() else outputs,
            dependencies=dependencies,
            detail="; ".join(value for value in (sections_error, analyses_error, synthesis_error) if value not in {"", "missing"}),
            completion_rule="Every current section has a succeeded analysis and the fresh synthesis reports matching section counts and a non-empty synthesis payload.",
            human_authority="Failed sections and synthesis disagreements remain visible.",
            structurally_valid=status not in {"invalid", "pending"},
        )
    if route == "media":
        metadata = doc_dir / "media_metadata.json"
        chunks = doc_dir / "transcript_chunks.json"
        metadata_payload, metadata_error = _json(metadata)
        chunks_payload, chunks_error = _json(chunks)
        metadata_valid = isinstance(metadata_payload, dict) and bool(metadata_payload)
        chunks_valid = (
            isinstance(chunks_payload, list) and bool(chunks_payload)
            and all(isinstance(row, dict) and bool(str(row.get("text") or row.get("content") or "").strip()) for row in chunks_payload)
        )
        candidates = [path for path, valid in ((metadata, metadata_valid), (chunks, chunks_valid)) if valid]
        existing = [path for path in (metadata, chunks) if path.is_file()]
        if not existing:
            return _result(route, "pending", outputs=[], completion_rule="Valid non-empty media metadata or transcript chunks exist; report remains derived on demand.", structurally_valid=False)
        errors = []
        if metadata.is_file() and not metadata_valid:
            errors.append(f"media_metadata.json: {metadata_error or 'expected non-empty object'}")
        if chunks.is_file() and not chunks_valid:
            errors.append(f"transcript_chunks.json: {chunks_error or 'expected non-empty text-bearing chunk list'}")
        media_status = "ready_for_report" if candidates else "invalid"
        if candidates and not (doc_dir / "intake.json").is_file():
            media_status = "stale"
            errors.append("intake.json is required to establish media source provenance")
        return _result(
            route, media_status, outputs=candidates or existing,
            dependencies=[doc_dir / "intake.json"], detail="; ".join(errors),
            completion_rule="Valid media extraction evidence exists; persist a report only when the research workflow requires it.",
            human_authority="Interpretive annotation profiles remain research-question driven.",
            structurally_valid=bool(candidates),
        )
    if route == "second_opinion":
        comparisons = sorted(doc_dir.glob("analysis_comparison_*.json"), key=lambda path: path.stat().st_mtime_ns)
        if not comparisons:
            return _result(route, "pending", outputs=[], dependencies=[doc_dir / "analysis.json"], completion_rule="A valid comparison exists and consequential disagreements remain explicit.")
        latest = comparisons[-1]
        payload, error = _json(latest)
        outcome = str(payload.get("outcome") or "") if isinstance(payload, dict) else ""
        alt_name = str(payload.get("alt_file") or "") if isinstance(payload, dict) else ""
        original_name = str(payload.get("original_file") or "") if isinstance(payload, dict) else ""
        alt_path, alt_payload, alt_error = _safe_local_json_reference(doc_dir, alt_name)
        original_path, original_payload, original_error = _safe_local_json_reference(doc_dir, original_name)
        structurally_valid = (
            not error and isinstance(payload, dict)
            and outcome in {"pending", "kept_original", "adopted_alt", "edited"}
            and bool(alt_name) and isinstance(alt_payload, dict) and bool(alt_payload)
            and bool(original_name) and isinstance(original_payload, dict) and bool(original_payload)
            and isinstance(payload.get("differences"), list)
        )
        if structurally_valid and outcome != "pending":
            structurally_valid = bool(str(payload.get("decided_at") or "").strip())
            if outcome in {"adopted_alt", "edited"}:
                promoted = str(payload.get("promoted_file") or "")
                _, promoted_payload, promoted_error = _safe_local_json_reference(doc_dir, promoted)
                structurally_valid = bool(
                    promoted and not promoted_error
                    and isinstance(promoted_payload, dict) and bool(promoted_payload)
                )
        status = (
            "invalid" if not structurally_valid
            else "human_required" if outcome == "pending"
            else "complete"
        )
        return _result(
            route, status, outputs=[latest, alt_path],
            dependencies=[original_path] if outcome == "pending" else [],
            detail="; ".join(value for value in (error, alt_error, original_error) if value),
            completion_rule="A structurally valid comparison and alternate analysis exist; pending comparisons require an explicit researcher decision.",
            human_authority="Consequential disagreement remains a researcher decision.",
            structurally_valid=structurally_valid,
        )
    raise ValueError(f"Unsupported specialist validator: {route}")
