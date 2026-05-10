"""Safe second-opinion analysis workflow.

This module never overwrites analysis.json during the model run. It writes an
alternate analysis file plus a comparison/decision record. Promotion to
analysis.json happens only through an explicit decision step.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import re
import shutil
from pathlib import Path
from typing import Any

from runner.config import Config
from runner.models.document import AnalysisResult, PreprocessResult
from runner.pipeline import analyze, upload
from runner.pipeline.doc_ids import resolve_doc_dir


VALID_OUTCOMES = {"pending", "kept_original", "adopted_alt", "edited"}


def run_second_opinion(
    doc_id: str,
    config: Config,
    llm: str = "litelm-reasoning",
) -> dict:
    """Run a second-opinion model and save alt/comparison files only."""
    doc_id, doc_dir = resolve_doc_dir(doc_id, config)
    analysis_path = doc_dir / "analysis.json"
    extracted_path = doc_dir / "extracted.txt"
    if not analysis_path.exists():
        raise FileNotFoundError(
            f"analysis.json is required before a second opinion can be run for {doc_id}"
        )
    if not extracted_path.exists():
        raise FileNotFoundError(f"extracted.txt is required for {doc_id}")

    original = AnalysisResult.model_validate_json(analysis_path.read_text(encoding="utf-8"))
    preprocess = _load_preprocess_for_second_opinion(doc_id, doc_dir)
    alt = analyze.run(preprocess, llm=llm, config=config)

    timestamp = _timestamp()
    model_label = _safe_label(_model_label_for_llm(llm, config))
    alt_path = doc_dir / f"analysis_alt_{model_label}_{timestamp}.json"
    alt_path.write_text(alt.model_dump_json(indent=2), encoding="utf-8")

    comparison = build_analysis_comparison(
        doc_id=doc_id,
        original=original,
        second=alt,
        original_file="analysis.json",
        alt_file=alt_path.name,
        original_model=_original_model(doc_dir),
        second_opinion_model=_model_label_for_llm(llm, config),
        outcome="pending",
    )
    comparison_path = doc_dir / f"analysis_comparison_{timestamp}.json"
    comparison["comparison_file"] = comparison_path.name
    comparison_path.write_text(json.dumps(comparison, indent=2), encoding="utf-8")
    return {
        "doc_id": doc_id,
        "alt_path": alt_path,
        "comparison_path": comparison_path,
        "comparison": comparison,
    }


def build_analysis_comparison(
    doc_id: str,
    original: AnalysisResult,
    second: AnalysisResult,
    original_file: str,
    alt_file: str,
    original_model: str = "",
    second_opinion_model: str = "",
    outcome: str = "pending",
) -> dict:
    """Build a structured field-level diff for two AnalysisResult objects."""
    if outcome not in VALID_OUTCOMES:
        raise ValueError(f"Invalid comparison outcome: {outcome}")
    original_data = original.model_dump(mode="json")
    second_data = second.model_dump(mode="json")
    differences = _analysis_differences(original_data, second_data)
    return {
        "doc_id": doc_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "original_model": original_model,
        "second_opinion_model": second_opinion_model,
        "original_file": original_file,
        "alt_file": alt_file,
        "original_hash": _sha256_json(original_data),
        "alt_hash": _sha256_json(second_data),
        "outcome": outcome,
        "decided_at": "",
        "fields_that_differed": [row["field"] for row in differences],
        "differences": differences,
        "researcher_note": "",
    }


def list_second_opinions(doc_id: str, config: Config) -> list[dict]:
    """Return comparison records for a document, newest first."""
    doc_id, doc_dir = resolve_doc_dir(doc_id, config)
    rows = []
    for path in sorted(doc_dir.glob("analysis_comparison_*.json"), reverse=True):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        rows.append({"path": str(path), "filename": path.name, **data})
    return rows


def decide_second_opinion(
    doc_id: str,
    comparison_file: str,
    outcome: str,
    config: Config,
    researcher_note: str = "",
    edited_json: str = "",
) -> dict:
    """Record a decision and optionally promote the alt/edited result."""
    if outcome not in {"kept_original", "adopted_alt", "edited"}:
        raise ValueError("outcome must be kept_original, adopted_alt, or edited")
    doc_id, doc_dir = resolve_doc_dir(doc_id, config)
    comparison_path = _resolve_comparison_path(doc_dir, comparison_file)
    comparison = json.loads(comparison_path.read_text(encoding="utf-8"))
    analysis_path = doc_dir / "analysis.json"
    if not analysis_path.exists():
        raise FileNotFoundError(f"analysis.json is missing for {doc_id}")

    promoted_file = ""
    if outcome == "adopted_alt":
        alt_path = doc_dir / comparison["alt_file"]
        if not alt_path.exists():
            raise FileNotFoundError(f"Alt analysis file not found: {alt_path}")
        AnalysisResult.model_validate_json(alt_path.read_text(encoding="utf-8"))
        _archive_analysis(analysis_path)
        shutil.copy2(alt_path, analysis_path)
        promoted_file = alt_path.name
    elif outcome == "edited":
        if not edited_json.strip():
            raise ValueError("edited_json is required when outcome is edited")
        edited = AnalysisResult.model_validate_json(edited_json)
        edited_path = doc_dir / f"analysis_edited_{_timestamp()}.json"
        edited_path.write_text(edited.model_dump_json(indent=2), encoding="utf-8")
        _archive_analysis(analysis_path)
        analysis_path.write_text(edited.model_dump_json(indent=2), encoding="utf-8")
        promoted_file = edited_path.name

    comparison["outcome"] = outcome
    comparison["decided_at"] = datetime.now(timezone.utc).isoformat()
    comparison["researcher_note"] = researcher_note
    if promoted_file:
        comparison["promoted_file"] = promoted_file
    comparison_path.write_text(json.dumps(comparison, indent=2), encoding="utf-8")
    return comparison


def _load_preprocess_for_second_opinion(doc_id: str, doc_dir: Path) -> PreprocessResult:
    preprocess_path = doc_dir / "preprocess.json"
    if preprocess_path.exists():
        return upload._load_preprocess(preprocess_path)
    extracted_path = doc_dir / "extracted.txt"
    return PreprocessResult(
        doc_id=doc_id,
        tool_used="unknown",
        quality="low",
        text=extracted_path.read_text(encoding="utf-8") if extracted_path.exists() else "",
    )


def _analysis_differences(original: dict, second: dict) -> list[dict]:
    fields = [
        "type",
        "format",
        "scope",
        "narrative_register",
        "rhetorical_intensity",
        "framing_balance",
        "testimony_flag",
        "needs_review",
        "confidence.overall_score",
        "confidence.status",
        "country",
        "tactic",
        "actor",
        "network",
        "practice",
        "term",
        "harm",
        "flags",
        "summary",
    ]
    rows = []
    for field in fields:
        left = _get_path(original, field)
        right = _get_path(second, field)
        if _normalise_for_compare(left) == _normalise_for_compare(right):
            continue
        row = {"field": field, "original": left, "second_opinion": right}
        if isinstance(left, list) or isinstance(right, list):
            left_set = {str(item) for item in (left or [])}
            right_set = {str(item) for item in (right or [])}
            row["added"] = sorted(right_set - left_set)
            row["removed"] = sorted(left_set - right_set)
        rows.append(row)
    return rows


def _get_path(data: dict, path: str) -> Any:
    current: Any = data
    for part in path.split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return current


def _normalise_for_compare(value: Any) -> Any:
    if isinstance(value, list):
        return sorted(str(item) for item in value)
    if isinstance(value, float):
        return round(value, 4)
    return value


def _archive_analysis(analysis_path: Path) -> Path:
    archive = analysis_path.parent / f"analysis_{_timestamp()}.json"
    shutil.copy2(analysis_path, archive)
    return archive


def _resolve_comparison_path(doc_dir: Path, comparison_file: str) -> Path:
    raw = Path(comparison_file)
    if raw.is_absolute():
        return raw
    if raw.name.startswith("analysis_alt_"):
        matches = [
            path for path in doc_dir.glob("analysis_comparison_*.json")
            if _read_json(path).get("alt_file") == raw.name
        ]
        if not matches:
            raise FileNotFoundError(f"No comparison record references {raw.name}")
        return sorted(matches)[-1]
    path = doc_dir / raw.name
    if not path.exists():
        raise FileNotFoundError(f"Comparison file not found: {path}")
    return path


def _read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _original_model(doc_dir: Path) -> str:
    metadata = _read_json(doc_dir / "metadata.json")
    return metadata.get("llm_used", "")


def _model_label_for_llm(llm: str, config: Config) -> str:
    if llm == "litelm":
        return config.litelm_analysis_model
    if llm == "litelm-heavy":
        return config.litelm_analysis_model_heavy
    if llm == "litelm-reasoning":
        return config.litelm_analysis_model_reasoning
    if llm == "local":
        return config.local_analysis_model
    if llm == "local-heavy":
        return config.local_analysis_model_heavy
    if llm == "local-reasoning":
        return config.local_analysis_model_reasoning
    if llm == "claude":
        return config.claude_model
    return llm


def _safe_label(value: str) -> str:
    value = value or "model"
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-") or "model"


def _sha256_json(value: dict) -> str:
    payload = json.dumps(value, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")
