"""Reusable researcher-owned workflow policy/question templates."""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from .atomic_io import atomic_write_json


SCHEMA_VERSION = "workflow-policy-templates-v1.0"
VALID_MODEL_POLICIES = {"triage_recommended", "local_preferred", "researcher_selected"}
VALID_DISCLOSURE_MODES = {"internal_research", "external_safe"}
BUILTIN_TEMPLATES: list[dict[str, Any]] = [
    {
        "name": "General archive analysis",
        "research_purpose": "Process a bounded archive batch for broad SOGICE evidence discovery.",
        "research_questions": ["What practices, actors, claims, terms, and relationships are evidenced?"],
        "model_policy": "triage_recommended",
        "remote_write_policy": "none",
        "disclosure_mode": "internal_research",
        "audit_sample_rule": "exceptions_and_researcher_selected",
        "builtin": True,
    },
    {
        "name": "Testimony-sensitive",
        "research_purpose": "Identify testimony evidence while preserving consent and disclosure boundaries.",
        "research_questions": [
            "Which passages may contain first-person testimony?",
            "What consent, safety, or public-display questions require researcher attention?",
        ],
        "model_policy": "triage_recommended",
        "remote_write_policy": "none",
        "disclosure_mode": "internal_research",
        "audit_sample_rule": "all_testimony_candidates",
        "builtin": True,
    },
    {
        "name": "Legal and policy instruments",
        "research_purpose": "Extract legal/policy evidence without delegating public legal interpretation.",
        "research_questions": ["What jurisdiction, version, date, claims, and exact provisions are evidenced?"],
        "model_policy": "triage_recommended",
        "remote_write_policy": "none",
        "disclosure_mode": "internal_research",
        "audit_sample_rule": "all_legal_routes",
        "builtin": True,
    },
    {
        "name": "Media and longform",
        "research_purpose": "Process media or long documents using resumable specialist evidence layers.",
        "research_questions": ["Which sections or time-coded units are most relevant to the research question?"],
        "model_policy": "triage_recommended",
        "remote_write_policy": "none",
        "disclosure_mode": "internal_research",
        "audit_sample_rule": "failed_and_low_confidence_sections",
        "builtin": True,
    },
]


def _safe_name(value: str) -> str:
    name = re.sub(r"\s+", " ", str(value or "").strip())
    if not name:
        raise ValueError("Template name is required")
    if len(name) > 100:
        raise ValueError("Template name must be 100 characters or fewer")
    return name


def _normalize(template: dict, *, builtin: bool = False) -> dict:
    normalized = {
        "name": _safe_name(template.get("name", "")),
        "research_purpose": str(template.get("research_purpose") or "").strip(),
        "research_questions": [
            str(value).strip() for value in template.get("research_questions") or [] if str(value).strip()
        ],
        "model_policy": str(template.get("model_policy") or "triage_recommended"),
        "remote_write_policy": str(template.get("remote_write_policy") or "none"),
        "disclosure_mode": str(template.get("disclosure_mode") or "internal_research"),
        "audit_sample_rule": str(template.get("audit_sample_rule") or "exceptions_and_researcher_selected"),
        "builtin": bool(builtin),
    }
    if normalized["model_policy"] not in VALID_MODEL_POLICIES:
        raise ValueError(f"Unsupported model policy: {normalized['model_policy']}")
    if normalized["disclosure_mode"] not in VALID_DISCLOSURE_MODES:
        raise ValueError(f"Unsupported disclosure mode: {normalized['disclosure_mode']}")
    # Reusable UI templates are planning-only. Private upload is an execution
    # decision and must never be activated indirectly by applying a template.
    if normalized["remote_write_policy"] != "none":
        raise ValueError("Workflow UI templates must use remote_write_policy=none")
    return normalized


def load_templates(path: Path, *, strict: bool = False) -> list[dict]:
    users: list[dict] = []
    path = Path(path)
    if path.is_file():
        import json
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(payload, dict) or payload.get("schema_version") != SCHEMA_VERSION:
                raise ValueError("Unsupported or missing workflow template schema")
            rows = payload.get("templates")
            if not isinstance(rows, list):
                raise ValueError("Workflow template store must contain a templates list")
            for index, row in enumerate(rows):
                if not isinstance(row, dict):
                    if strict:
                        raise ValueError(f"Template row {index + 1} is not an object")
                    continue
                try:
                    users.append(_normalize(row))
                except Exception:
                    if strict:
                        raise
        except Exception:
            if strict:
                raise
            users = []
    by_name = {row["name"].casefold(): _normalize(row, builtin=True) for row in BUILTIN_TEMPLATES}
    for row in users:
        # Researcher-owned templates may override a built-in only by choosing a
        # distinct name; built-in policy baselines remain stable.
        if row["name"].casefold() not in by_name:
            by_name[row["name"].casefold()] = row
    return list(by_name.values())


def save_template(path: Path, template: dict) -> dict:
    normalized = _normalize(template)
    builtins = {row["name"].casefold() for row in BUILTIN_TEMPLATES}
    if normalized["name"].casefold() in builtins:
        raise ValueError("Choose a different name; built-in templates are read-only")
    # A damaged store must be repaired deliberately; never overwrite it as if
    # it were empty and silently destroy recoverable researcher templates.
    existing = [row for row in load_templates(path, strict=True) if not row.get("builtin")]
    by_name = {row["name"].casefold(): row for row in existing}
    by_name[normalized["name"].casefold()] = normalized
    payload = {
        "schema_version": SCHEMA_VERSION,
        "templates": sorted(by_name.values(), key=lambda row: row["name"].casefold()),
    }
    atomic_write_json(Path(path), payload)
    return normalized
