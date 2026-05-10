"""Profile-based research annotation pipeline.

This module consumes already-ingested corpus folders. It never replaces
analysis.json, embeddings, enrichment, or upload behavior.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import re
import shutil
from pathlib import Path

from ..config import Config
from ..models.research_annotation import (
    ANNOTATION_PROFILES,
    AnnotationStatus,
    PROFILE_VERSION,
    PublicVisibility,
    ProfileStatus,
    ResearchAnnotation,
    validate_annotation_profile,
    validate_profile,
)
from .doc_ids import resolve_doc_dir
from .transcripts import chunks_to_text

PROMPT_DIR = Path(__file__).parents[1] / "prompts" / "research_profiles"


def annotate_document(
    doc_id: str,
    profile: str,
    config: Config,
    llm: str = "litelm",
    model: str | None = None,
    dry_run: bool = False,
    overwrite: bool = False,
    force_reviewed: bool = False,
    save_local_only: bool = False,
) -> ResearchAnnotation:
    """Run one research profile over one already-ingested document."""
    profile = validate_annotation_profile(profile)
    doc_id, doc_dir = resolve_doc_dir(doc_id, config)
    extracted_path = doc_dir / "extracted.txt"
    analysis_path = doc_dir / "analysis.json"

    if not doc_dir.exists():
        raise FileNotFoundError(f"No corpus folder found for {doc_id}")
    if not extracted_path.exists():
        raise FileNotFoundError(f"extracted.txt is required for {doc_id}")
    _enforce_annotation_consent_gate(doc_dir, profile)

    existing = load_local_annotation(doc_id, profile, config)
    if existing and not force_reviewed and existing.annotation_status in {
        "researcher_reviewed",
        "corrected",
    }:
        raise RuntimeError(
            f"{profile} for {doc_id} is reviewed/corrected; pass --force-reviewed to replace it"
        )

    text = load_annotation_text(doc_dir)
    analysis_text = analysis_path.read_text(encoding="utf-8") if analysis_path.exists() else ""
    prompt = load_profile_prompt(profile)

    model_response = _call_annotation_model(
        llm=llm,
        system_prompt=_build_system_prompt(profile, prompt),
        user_message=_build_user_message(doc_id, profile, text, analysis_text),
        config=config,
        model=model,
    )
    if isinstance(model_response, str):
        model_response = AnnotationModelResponse(
            model_response,
            requested_model=_model_name_for_llm(llm, config, model),
        )
    raw = model_response.content
    try:
        result_json = _parse_json_response(raw)
        source_stance = result_json.get("sourceStance")
        if not source_stance:
            raise ValueError("Profile result must include sourceStance")
        annotation = ResearchAnnotation(
            doc_id=doc_id,
            profile=profile,
            modelProvider=_provider_for_llm(llm),
            modelName=model_response.requested_model or _model_name_for_llm(llm, config, model),
            resolvedModelName=model_response.resolved_model,
            promptVersion=f"research-profile-{profile}-v1.0",
            inputTextHash=_sha256(text),
            inputAnalysisHash=_sha256(analysis_text) if analysis_text else "",
            sourceStance=source_stance,
            resultJson=result_json,
        )
    except Exception:
        save_invalid_raw(doc_id, profile, raw, config)
        raise

    if dry_run:
        return annotation

    save_annotation(
        annotation,
        config,
        overwrite=overwrite,
        force_reviewed=force_reviewed,
    )

    if not save_local_only:
        from ..clients import sanity as sanity_client

        sanity_client.write_research_annotation(
            annotation, config, force_reviewed=force_reviewed
        )

    return annotation


def _enforce_annotation_consent_gate(doc_dir: Path, profile: str) -> None:
    if profile != "testimony_analysis":
        return
    intake = _read_json(doc_dir / "intake.json", {})
    analysis = _read_json(doc_dir / "analysis.json", {})
    consent = intake.get("testimony_consent", "")
    if analysis.get("testimony_flag") or consent:
        if consent != "confirmed":
            raise RuntimeError(
                "testimony_analysis requires confirmed testimony consent in intake.json "
                f"(current: {consent or 'missing'})."
            )


def load_profile_prompt(profile: str) -> str:
    profile = validate_annotation_profile(profile)
    path = PROMPT_DIR / f"{profile}.md"
    if not path.exists():
        raise FileNotFoundError(f"Missing research profile prompt: {path}")
    return path.read_text(encoding="utf-8")


def load_annotation_text(doc_dir: Path) -> str:
    """Load the fullest text available for a research annotation pass."""
    transcript_path = doc_dir / "transcript_chunks.json"
    if transcript_path.exists():
        try:
            chunks = json.loads(transcript_path.read_text(encoding="utf-8"))
        except Exception:
            chunks = []
        if isinstance(chunks, list) and chunks:
            transcript_text = chunks_to_text(chunks, include_timestamps=True)
            if transcript_text.strip():
                return transcript_text
    return (doc_dir / "extracted.txt").read_text(encoding="utf-8")


def annotation_path(doc_id: str, profile: str, config: Config) -> Path:
    profile = validate_annotation_profile(profile)
    local_doc_id, _doc_dir = resolve_doc_dir(doc_id, config)
    return config.corpus_dir / local_doc_id / "research_annotations" / f"{profile}.json"


def load_local_annotation(
    doc_id: str, profile: str, config: Config
) -> ResearchAnnotation | None:
    path = annotation_path(doc_id, profile, config)
    if not path.exists():
        return None
    return ResearchAnnotation.model_validate(json.loads(path.read_text(encoding="utf-8")))


def list_local_annotations(doc_id: str, config: Config) -> list[dict]:
    _local_doc_id, doc_dir = resolve_doc_dir(doc_id, config)
    root = doc_dir / "research_annotations"
    rows: list[dict] = []
    if not root.exists():
        return rows
    for path in sorted(root.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            data = {}
        rows.append(
            {
                "profile": data.get("profile") or path.stem,
                "annotationStatus": data.get("annotationStatus", ""),
                "publicVisibility": data.get("publicVisibility", ""),
                "generatedAt": data.get("generatedAt", ""),
                "path": str(path),
            }
        )
    return rows


def save_annotation(
    annotation: ResearchAnnotation,
    config: Config,
    overwrite: bool = False,
    force_reviewed: bool = False,
) -> Path:
    path = annotation_path(annotation.doc_id, annotation.profile, config)
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.exists():
        existing = ResearchAnnotation.model_validate(
            json.loads(path.read_text(encoding="utf-8"))
        )
        if not force_reviewed and existing.annotation_status in {
            "researcher_reviewed",
            "corrected",
        }:
            raise RuntimeError(
                f"{annotation.profile} for {annotation.doc_id} is reviewed/corrected; "
                "pass --force-reviewed to replace it"
            )
        if not overwrite:
            archive_dir = path.parent / "archive"
            archive_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, archive_dir / f"{annotation.profile}_{_timestamp()}.json")

    path.write_text(annotation.model_dump_json(indent=2, by_alias=True), encoding="utf-8")
    return path


def update_annotation_review(
    doc_id: str,
    profile: str,
    config: Config,
    annotation_status: AnnotationStatus,
    reviewer_notes: str = "",
    public_visibility: PublicVisibility | None = None,
    write_sanity: bool = False,
) -> ResearchAnnotation:
    """Update human review fields for a local annotation, optionally mirroring to Sanity."""
    if annotation_status not in {"model_generated", "researcher_reviewed", "corrected", "rejected"}:
        raise ValueError(f"Unknown annotation status: {annotation_status}")
    if public_visibility is not None and public_visibility not in {
        "private",
        "internal_research",
        "public_metadata_only",
        "public_table_candidate",
        "published",
    }:
        raise ValueError(f"Unknown public visibility: {public_visibility}")
    annotation = load_local_annotation(doc_id, profile, config)
    if annotation is None:
        raise FileNotFoundError(f"No local {profile} annotation found for {doc_id}")

    annotation.annotation_status = annotation_status
    annotation.reviewer_notes = reviewer_notes
    if annotation_status in {"researcher_reviewed", "corrected", "rejected"}:
        annotation.reviewed_at = datetime.now(timezone.utc)
    if public_visibility is not None:
        annotation.public_visibility = public_visibility

    save_annotation(
        annotation,
        config,
        overwrite=True,
        force_reviewed=True,
    )

    if write_sanity:
        from ..clients import sanity as sanity_client

        sanity_client.write_research_annotation(
            annotation,
            config,
            force_reviewed=True,
        )

    return annotation


def save_invalid_raw(doc_id: str, profile: str, raw: str, config: Config) -> Path:
    profile = validate_annotation_profile(profile)
    debug_dir = (
        config.corpus_dir
        / doc_id.strip()
        / "research_annotations"
        / "debug"
    )
    debug_dir.mkdir(parents=True, exist_ok=True)
    path = debug_dir / f"{profile}_invalid_raw_{_timestamp()}.txt"
    path.write_text(raw, encoding="utf-8")
    return path


def export_annotations_markdown(
    profile: str,
    config: Config,
    output_path: Path | None = None,
    filter_format: str = "",
    filter_type: str = "",
) -> Path:
    """Export local annotations for corpus-level reading in NotebookLM/Zotero/etc."""
    profile = validate_annotation_profile(profile)
    rows: list[tuple[str, dict, dict]] = []
    for doc_dir in sorted(config.corpus_dir.iterdir()):
        if not doc_dir.is_dir() or doc_dir.name.startswith("."):
            continue
        ann_path = doc_dir / "research_annotations" / f"{profile}.json"
        if not ann_path.exists():
            continue
        analysis = _read_json(doc_dir / "analysis.json", {})
        if filter_format and str(analysis.get("format", "")).lower() != filter_format.lower():
            continue
        if filter_type and str(analysis.get("type", "")).lower() != filter_type.lower():
            continue
        annotation = _read_json(ann_path, {})
        rows.append((doc_dir.name, analysis, annotation))

    if output_path is None:
        exports_dir = config.corpus_dir.parent / "exports"
        exports_dir.mkdir(parents=True, exist_ok=True)
        output_path = exports_dir / f"{profile}_annotations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    else:
        output_path.parent.mkdir(parents=True, exist_ok=True)

    parts = [
        f"# {profile} annotations export",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        f"Documents: {len(rows)}",
        "",
    ]
    for doc_id, analysis, annotation in rows:
        result = annotation.get("resultJson") or {}
        title = (
            analysis.get("title")
            or result.get("title")
            or analysis.get("summary")
            or doc_id
        )
        parts.extend(
            [
                f"## {doc_id} — {title}",
                "",
                f"- Type: {analysis.get('type', 'unknown')}",
                f"- Format: {analysis.get('format', 'unknown')}",
                f"- Source stance: {annotation.get('sourceStance', result.get('sourceStance', 'unknown'))}",
                f"- Annotation status: {annotation.get('annotationStatus', 'unknown')}",
                f"- Model: {annotation.get('modelName', '')}"
                + (f" -> {annotation.get('resolvedModelName')}" if annotation.get("resolvedModelName") else ""),
                "",
            ]
        )
        parts.extend(_markdown_result_summary(profile, result))
        if annotation.get("reviewerNotes"):
            parts.extend(["", "Researcher notes:", "", annotation["reviewerNotes"], ""])
        parts.append("")

    output_path.write_text("\n".join(parts).strip() + "\n", encoding="utf-8")
    return output_path


def set_profile_status(
    doc_id: str,
    profile: str,
    active: bool,
    config: Config,
    reason: str = "",
    reviewer_note: str = "",
    write_sanity: bool = True,
) -> dict:
    profile = validate_profile(profile)
    doc_id, doc_dir = resolve_doc_dir(doc_id, config)
    doc_dir.mkdir(parents=True, exist_ok=True)
    path = doc_dir / "media_metadata.json"
    data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}

    active_profiles = set(data.get("activeResearchProfiles") or [])
    active_profiles.add("archive_core")
    if active:
        active_profiles.add(profile)
    elif profile != "archive_core":
        active_profiles.discard(profile)

    statuses = [
        item for item in data.get("profileStatus", []) if item.get("profile") != profile
    ]
    status = ProfileStatus(
        profile=profile,
        active=active,
        status="active" if active else "excluded",
        reason=reason,
        reviewerNote=reviewer_note,
    ).model_dump(by_alias=True)
    statuses.append(status)

    data["activeResearchProfiles"] = sorted(active_profiles)
    data["profileStatus"] = statuses
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    if write_sanity:
        from ..clients import sanity as sanity_client

        sanity_client.write_media_metadata_update(doc_id, data, config)

    return data


def available_profiles() -> tuple[str, ...]:
    return ANNOTATION_PROFILES


def recommended_profiles(format: str, doc_type: str) -> list[str]:
    """Return suggested annotation profiles for a document's format and type."""
    format_lower = (format or "").lower()
    type_lower = (doc_type or "").lower()
    profiles: list[str] = []
    is_testimony = "testimony" in type_lower or any(
        f in format_lower for f in ("testimony", "interview", "personal")
    )
    if is_testimony:
        profiles.append("testimony_analysis")
        return profiles

    if any(f in format_lower for f in ("video", "documentary", "podcast", "audio")):
        if "podcast" in format_lower:
            profiles.append("podcast_analysis")
        else:
            profiles.append("documentary_analysis")

    if "pro-sogice" in type_lower or "mixed" in type_lower or "pro_sogice" in type_lower:
        profiles.append("shame_article")
    elif any(f in format_lower for f in ("video", "documentary", "podcast", "article", "webpage")):
        profiles.append("shame_article")

    if (
        "network" in type_lower
        or "organisation" in type_lower
        or "organization" in type_lower
        or (
            any(f in format_lower for f in ("website", "webpage", "page"))
            and any(t in type_lower for t in ("pro-sogice", "mixed", "pro_sogice"))
        )
    ):
        profiles.append("anti_gender_network")
    return list(dict.fromkeys(profiles))


def _build_system_prompt(profile: str, profile_prompt: str) -> str:
    return f"""You are a professional academic media-studies research assistant for the SurvivingSOGICE archive.

Return valid JSON only. Do not wrap it in Markdown.
Every analytical claim must be evidence-grounded. Include timestamps, page references, or quote snippets where available.
Always distinguish a source promoting harmful SOGICE language from a source quoting, documenting, criticizing, or reporting it.
Do not identify private individuals unless clearly named in the source or metadata.
Do not set hateGroupDesignation as fact unless it is explicitly supplied by a researcher, imported spreadsheet, or documented external reference.
Use uncertainty labels instead of inventing facts. No final public-facing claims are made without researcher review.

Profile: {profile}
Profile version: {PROFILE_VERSION}

{profile_prompt}
"""


def _build_user_message(
    doc_id: str, profile: str, text: str, analysis_text: str
) -> str:
    return "\n\n".join(
        [
            f"DOCUMENT ID: {doc_id}",
            f"PROFILE: {profile}",
            "EXISTING analysis.json CONTEXT:\n" + (analysis_text or "{}"),
            "EXTRACTED TEXT:\n" + text,
        ]
    )


def _parse_json_response(raw: str) -> dict:
    original = raw.strip()
    outside = re.sub(r"<think>.*?</think>", "", original, flags=re.DOTALL).strip()

    def _try(text: str) -> dict | None:
        text = re.sub(r"^```(?:json)?\s*", "", text.strip())
        text = re.sub(r"\s*```$", "", text.strip())
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return None
        data = json.loads(match.group(0))
        if not isinstance(data, dict):
            raise ValueError("Research annotation response must be a JSON object")
        return data

    parsed = _try(outside)
    if parsed is not None:
        return parsed
    for block in re.findall(r"<think>(.*?)</think>", original, re.DOTALL):
        parsed = _try(block)
        if parsed is not None:
            return parsed
    raise ValueError("No valid JSON object found in research annotation response")


class AnnotationModelResponse:
    def __init__(self, content: str, requested_model: str = "", resolved_model: str = ""):
        self.content = content
        self.requested_model = requested_model
        self.resolved_model = resolved_model


def _call_annotation_model(
    llm: str,
    system_prompt: str,
    user_message: str,
    config: Config,
    model: str | None = None,
) -> AnnotationModelResponse:
    if llm == "claude":
        return AnnotationModelResponse(
            _call_claude(system_prompt, user_message, config),
            requested_model=config.claude_model,
            resolved_model=config.claude_model,
        )
    if llm == "local":
        return AnnotationModelResponse(
            _call_ollama(system_prompt, user_message, config, config.local_analysis_model),
            requested_model=config.local_analysis_model,
            resolved_model=config.local_analysis_model,
        )
    if llm == "local-heavy":
        return AnnotationModelResponse(
            _call_ollama(system_prompt, user_message, config, config.local_analysis_model_heavy),
            requested_model=config.local_analysis_model_heavy,
            resolved_model=config.local_analysis_model_heavy,
        )
    if llm == "local-reasoning":
        return AnnotationModelResponse(
            _call_ollama(system_prompt, user_message, config, config.local_analysis_model_reasoning),
            requested_model=config.local_analysis_model_reasoning,
            resolved_model=config.local_analysis_model_reasoning,
        )
    if llm == "litelm":
        return _call_litelm(system_prompt, user_message, config, model or config.litelm_analysis_model)
    if llm == "litelm-heavy":
        return _call_litelm(system_prompt, user_message, config, model or config.litelm_analysis_model_heavy)
    if llm == "litelm-reasoning":
        return _call_litelm(system_prompt, user_message, config, model or config.litelm_analysis_model_reasoning)
    raise ValueError(f"Unknown LLM option: {llm!r}")


def _call_litelm(system_prompt: str, user_message: str, config: Config, model: str) -> AnnotationModelResponse:
    import httpx

    response = httpx.post(
        f"{config.litelm_base_url}/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {config.litelm_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.1,
            "max_tokens": config.local_output_tokens,
        },
        timeout=600,
    )
    response.raise_for_status()
    data = response.json()
    return AnnotationModelResponse(
        content=data["choices"][0]["message"]["content"],
        requested_model=model,
        resolved_model=str(data.get("model") or ""),
    )


def _call_claude(system_prompt: str, user_message: str, config: Config) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=config.anthropic_api_key)
    response = client.messages.create(
        model=config.claude_model,
        max_tokens=config.local_output_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text


def _call_ollama(system_prompt: str, user_message: str, config: Config, model: str) -> str:
    import httpx

    response = httpx.post(
        f"{config.ollama_base_url}/api/chat",
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "stream": False,
            "keep_alive": 0,
            "format": "json",
            "think": False,
            "options": {
                "temperature": 0.1,
                "num_ctx": config.local_context_tokens,
                "num_predict": config.local_output_tokens,
            },
        },
        timeout=600,
    )
    response.raise_for_status()
    msg = response.json()["message"]
    raw = msg.get("content", "").strip() or msg.get("thinking", "")
    if not raw:
        raise ValueError(f"Ollama returned empty response. Message keys: {list(msg.keys())}")
    return raw


def _provider_for_llm(llm: str) -> str:
    if llm == "claude":
        return "anthropic"
    if llm.startswith("litelm"):
        return "litelm"
    return "local"


def _model_name_for_llm(llm: str, config: Config, model: str | None = None) -> str:
    if model:
        return model
    if llm == "claude":
        return config.claude_model
    if llm == "local":
        return config.local_analysis_model
    if llm == "local-heavy":
        return config.local_analysis_model_heavy
    if llm == "local-reasoning":
        return config.local_analysis_model_reasoning
    if llm == "litelm":
        return config.litelm_analysis_model
    if llm == "litelm-heavy":
        return config.litelm_analysis_model_heavy
    if llm == "litelm-reasoning":
        return config.litelm_analysis_model_reasoning
    return llm


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _read_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _markdown_result_summary(profile: str, result: dict) -> list[str]:
    lines: list[str] = []
    if profile == "shame_article":
        phase = result.get("shamePhase") or {}
        lines.extend(
            [
                "Shame phases:",
                "",
                f"- Precondition: {'present' if phase.get('precondition') else 'absent'}",
                f"- Method: {'present' if phase.get('method') else 'absent'}",
                f"- Residue: {'present' if phase.get('residue') else 'absent'}",
                f"- Shame as structural: {'yes' if result.get('shameAsStructural') else 'no'}",
                "",
            ]
        )
        for field, label in [
            ("rhetoricalArguments", "Rhetorical arguments"),
            ("dominantMessaging", "Dominant messaging"),
            ("articleThemes", "Article themes"),
            ("researcherFollowupQuestions", "Researcher follow-up questions"),
        ]:
            values = result.get(field) or []
            if values:
                lines.extend([f"{label}:", ""])
                lines.extend(f"- {value}" for value in values)
                lines.append("")
    else:
        for field, label in [
            ("narrativeStructure", "Narrative structure"),
            ("emotionalArc", "Emotional arc"),
            ("beforeAfterTransformationLogic", "Before/after logic"),
            ("visualRhetoric", "Visual rhetoric"),
        ]:
            value = result.get(field)
            if value:
                lines.extend([f"{label}:", "", str(value), ""])

    quotable = result.get("quotablePassages") or []
    if quotable:
        lines.extend(["Quotable passages:", ""])
        for item in quotable:
            if isinstance(item, dict):
                timestamp = item.get("timestamp") or item.get("pageOrTimestamp") or ""
                quote = item.get("quote") or item.get("text") or ""
                significance = item.get("significance") or ""
                prefix = f"{timestamp}: " if timestamp else ""
                lines.append(f"- {prefix}{quote}")
                if significance:
                    lines.append(f"  Significance: {significance}")
            else:
                lines.append(f"- {item}")
        lines.append("")
    return lines


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")
