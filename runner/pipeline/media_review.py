"""Media review helpers for transcript, comment, and source-discovery artifacts."""
from __future__ import annotations

from datetime import datetime, timezone
import json
import shutil
from pathlib import Path

from ..config import Config
from .doc_ids import resolve_doc_dir
from .transcripts import (
    chunks_to_text,
    compare_transcript_versions,
    parse_timed_text,
    transcript_version,
)
from .media_evidence import comment_evidence_from_ytdlp


def media_extraction_report(doc_id: str, config: Config) -> dict:
    """Summarise media extraction artifacts for one local corpus document."""
    local_doc_id, doc_dir = _doc_dir(doc_id, config)
    media_metadata = _read_json(doc_dir / "media_metadata.json", {})
    versions = _read_json(doc_dir / "transcript_versions.json", [])
    comparison = _read_json(doc_dir / "transcript_comparison.json", {})
    chunks = _read_json(doc_dir / "transcript_chunks.json", [])
    comment_queue = load_or_build_comment_queue(doc_id, config, save=False)
    candidate_sources = _read_json(doc_dir / "candidate_sources.json", {})
    duplicate_candidates = _read_json(doc_dir / "duplicate_candidates.json", [])
    transcripts_dir = doc_dir / "transcripts"

    return {
        "doc_id": local_doc_id,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "mediaMetadataPresent": bool(media_metadata),
        "contentFormat": media_metadata.get("contentFormat", ""),
        "mediaMode": media_metadata.get("mediaMode", ""),
        "platforms": [
            row.get("platform", "")
            for row in media_metadata.get("platformDistribution", [])
            if isinstance(row, dict)
        ],
        "platformViewCount": _platform_view_count(media_metadata),
        "platformCommentCount": _platform_comment_count(media_metadata),
        "commentsCollected": bool(comment_queue.get("comments")),
        "transcriptEvidence": media_metadata.get("transcriptEvidence", {}),
        "transcriptVersionCount": len(versions) if isinstance(versions, list) else 0,
        "transcriptVersions": versions if isinstance(versions, list) else [],
        "primaryTranscriptChunkCount": len(chunks) if isinstance(chunks, list) else 0,
        "primaryTranscriptCharCount": len(chunks_to_text(chunks, include_timestamps=False))
        if isinstance(chunks, list)
        else 0,
        "storedTranscriptFiles": sorted(path.name for path in transcripts_dir.glob("*.json"))
        if transcripts_dir.exists()
        else [],
        "transcriptComparison": comparison if isinstance(comparison, dict) else {},
        "commentEvidenceCount": len(comment_queue.get("comments", [])),
        "commentAnalysisStatus": comment_queue.get("analysisStatus", "not_available"),
        "duplicateCandidateCount": len(duplicate_candidates) if isinstance(duplicate_candidates, list) else 0,
        "relatedCandidateCount": int(candidate_sources.get("candidateCount") or 0)
        if isinstance(candidate_sources, dict)
        else 0,
        "relatedCandidateErrors": int(candidate_sources.get("errorCount") or 0)
        if isinstance(candidate_sources, dict)
        else 0,
        "nextRecommendedActions": _next_media_actions(
            media_metadata=media_metadata,
            versions=versions if isinstance(versions, list) else [],
            comment_queue=comment_queue,
            candidate_sources=candidate_sources if isinstance(candidate_sources, dict) else {},
        ),
    }


def repair_media_metadata_from_raw(
    doc_id: str,
    config: Config,
    write_sanity: bool = False,
) -> dict:
    """Promote table-ready fields from local rawYtDlpMetadata into structured metadata."""
    local_doc_id, doc_dir = _doc_dir(doc_id, config)
    path = doc_dir / "media_metadata.json"
    media_metadata = _read_json(path, {})
    if not media_metadata:
        raise FileNotFoundError(f"No media_metadata.json found for {doc_id}")
    raw = media_metadata.get("rawYtDlpMetadata") or _read_json(doc_dir / "video_metadata.json", {})
    if not raw:
        raise FileNotFoundError(f"No raw yt-dlp metadata found for {doc_id}")

    general = media_metadata.setdefault("general", {})
    updates = {
        "channelUrl": raw.get("channel_url") or "",
        "channelHandle": raw.get("uploader_id") or "",
        "likeCount": raw.get("like_count"),
        "commentCount": raw.get("comment_count"),
        "availability": raw.get("availability") or "",
    }
    changed: dict[str, object] = {}
    for key, value in updates.items():
        if value in (None, ""):
            continue
        if general.get(key) != value:
            general[key] = value
            changed[f"general.{key}"] = value

    if "platformAlgorithmicSignals" in media_metadata and raw.get("comment_count") is not None:
        signals = media_metadata.setdefault("platformAlgorithmicSignals", {})
        if signals.get("commentCount") != raw.get("comment_count"):
            signals["commentCount"] = raw.get("comment_count")
            changed["platformAlgorithmicSignals.commentCount"] = raw.get("comment_count")

    path.write_text(json.dumps(media_metadata, indent=2), encoding="utf-8")
    _write_audit_event(doc_dir, f"repaired_media_metadata fields={len(changed)}")

    sanity_id = ""
    if write_sanity and changed:
        from ..clients import sanity as sanity_client

        patch = dict(media_metadata)
        patch.pop("rawYtDlpMetadata", None)
        sanity_id = sanity_client.write_media_metadata_update(local_doc_id, patch, config)

    return {
        "doc_id": local_doc_id,
        "changed": changed,
        "changedCount": len(changed),
        "sanityId": sanity_id,
        "mediaMetadataPath": str(path),
    }


def recommended_profiles(format_value: str = "", type_value: str = "") -> list[dict]:
    """Return recommended research annotation profiles for a document shape."""
    fmt = (format_value or "").lower().replace("_", " ").replace("-", " ")
    typ = (type_value or "").lower().replace("_", " ").replace("-", " ")
    text = f"{fmt} {typ}"

    def row(profile: str, reason: str) -> dict:
        return {"profile": profile, "reason": reason}

    if "testimony" in text or "personal account" in text:
        return [row("testimony_analysis", "Privacy-first profile for personal witness/testimony material.")]
    if any(term in text for term in ("podcast", "audio")):
        return [
            row("podcast_analysis", "Audio-first structure, host/guest dynamics, and episode framing."),
            row("shame_article", "Format-agnostic theoretical reading of shame, identity, and harm."),
        ]
    if any(term in text for term in ("documentary", "video", "social video", "youtube")):
        profiles = [
            row("documentary_analysis", "Media-form reading of narrative structure, testimony, and visual rhetoric."),
            row("shame_article", "Theoretical reading of shame, identity, and SOGICE framing."),
        ]
        if "testimony" in text:
            profiles.append(row("testimony_analysis", "Use because this video appears to include witness segments."))
        return profiles
    if any(term in text for term in ("website", "article", "webpage", "blog")):
        return [
            row("shame_article", "Baseline textual/rhetorical profile for articles and websites."),
            row("anti_gender_network", "Network mapping profile for organisational or campaign material."),
        ]
    if any(term in text for term in ("legal", "legislative", "law", "policy")):
        return []
    return [row("shame_article", "Baseline profile for mixed or unclear material.")]


def collect_comments_for_document(
    doc_id: str,
    config: Config,
    max_comments: int = 50,
) -> dict:
    """Collect platform comments after ingest and prepare the review queue."""
    local_doc_id, doc_dir = _doc_dir(doc_id, config)
    intake = _read_json(doc_dir / "intake.json", {})
    source = intake.get("source_url") or intake.get("source") or ""
    if not source.startswith(("http://", "https://")):
        raise ValueError(f"No HTTP(S) source URL found in intake.json for {doc_id}")

    try:
        import yt_dlp
    except ImportError as exc:
        raise RuntimeError("yt-dlp is required to collect platform comments") from exc

    opts = {
        "skip_download": True,
        "quiet": True,
        "ignoreerrors": True,
        "getcomments": True,
        "extractor_args": {"youtube": {"comment_sort": ["top"]}},
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(source, download=False) or {}

    comments = comment_evidence_from_ytdlp(info, max_comments=max_comments)
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceUrl": source,
        "platformCommentCount": info.get("comment_count"),
        "collectedCount": len(comments),
        "maxComments": max_comments,
        "trustLevel": "lower_trust_platform_comment",
        "reviewStatus": "needs_review" if comments else "empty",
        "comments": comments,
    }
    (doc_dir / "media_comments.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    queue = build_comment_queue(comments)
    (doc_dir / "comment_evidence_queue.json").write_text(json.dumps(queue, indent=2), encoding="utf-8")
    _update_media_comment_metadata(doc_dir, info, payload)
    _write_audit_event(doc_dir, f"collected_comments count={len(comments)}")
    return {
        "doc_id": local_doc_id,
        "sourceUrl": source,
        "platformCommentCount": info.get("comment_count"),
        "collectedCount": len(comments),
        "queue": queue,
    }


def attach_srt_to_document(
    doc_id: str,
    srt_path: str | Path,
    config: Config,
    label: str = "",
    language: str = "",
    make_primary: bool = True,
) -> dict:
    """Attach a researcher-provided SRT/VTT to an existing document."""
    local_doc_id, doc_dir = _doc_dir(doc_id, config)
    path = Path(srt_path).expanduser()
    if not path.exists():
        raise FileNotFoundError(f"SRT/VTT not found: {path}")
    raw = path.read_text(encoding="utf-8", errors="replace")
    chunks = parse_timed_text(raw, source_format=path.suffix.lstrip(".") or "srt")
    if not chunks:
        raise ValueError(f"No timed transcript chunks parsed from {path}")

    safe_label = _safe_label(label or path.stem)
    version = transcript_version(
        label=safe_label,
        chunks=chunks,
        language=language,
        source="researcher_provided",
        kind="uploaded_srt",
    )
    version["sourcePath"] = str(path)
    version["attachedAt"] = datetime.now(timezone.utc).isoformat()

    transcripts_dir = doc_dir / "transcripts"
    transcripts_dir.mkdir(parents=True, exist_ok=True)
    transcript_file = transcripts_dir / f"{safe_label}.json"
    if transcript_file.exists():
        _archive_file(transcript_file, doc_dir / "transcript_archive")
    transcript_file.write_text(
        json.dumps({"version": version, "chunks": chunks}, indent=2),
        encoding="utf-8",
    )

    versions = _read_json(doc_dir / "transcript_versions.json", [])
    versions = [row for row in versions if isinstance(row, dict) and row.get("label") != safe_label]

    selected_chunks = chunks
    selected_label = safe_label
    if make_primary:
        existing_chunks = _read_json(doc_dir / "transcript_chunks.json", [])
        if existing_chunks:
            _archive_file(doc_dir / "transcript_chunks.json", doc_dir / "transcript_archive")
        (doc_dir / "transcript_chunks.json").write_text(json.dumps(chunks, indent=2), encoding="utf-8")
        (doc_dir / "extracted.txt").write_text(chunks_to_text(chunks, include_timestamps=True), encoding="utf-8")
    else:
        existing_chunks = _read_json(doc_dir / "transcript_chunks.json", [])
        if existing_chunks:
            selected_chunks = existing_chunks
            selected = _read_json(doc_dir / "media_metadata.json", {}).get("transcriptEvidence", {})
            selected_label = selected.get("selectedTranscriptLabel") or "current_primary"
            if not any(row.get("label") == selected_label for row in versions):
                versions.append(
                    transcript_version(
                        label=selected_label,
                        chunks=selected_chunks,
                        source="existing_primary",
                        kind="current_primary",
                    )
                )

    versions.append(version)
    (doc_dir / "transcript_versions.json").write_text(json.dumps(versions, indent=2), encoding="utf-8")

    texts_by_label = _texts_for_versions(doc_dir, versions, selected_label, selected_chunks)
    texts_by_label[safe_label] = chunks_to_text(chunks, include_timestamps=False)
    comparison = compare_transcript_versions(versions, texts_by_label)
    (doc_dir / "transcript_comparison.json").write_text(json.dumps(comparison, indent=2), encoding="utf-8")

    media_metadata = _read_json(doc_dir / "media_metadata.json", {})
    media_metadata.setdefault("contentFormat", "other")
    media_metadata.setdefault("mediaMode", "video")
    media_metadata["transcriptEvidence"] = {
        **(media_metadata.get("transcriptEvidence") or {}),
        "selectedTranscriptLabel": safe_label if make_primary else selected_label,
        "transcriptVersionCount": len(versions),
        "transcriptChunkCount": len(chunks) if make_primary else len(selected_chunks),
        "latestUploadedTranscriptLabel": safe_label,
        "latestUploadedTranscriptPath": str(path),
        "latestUploadedTranscriptAttachedAt": version["attachedAt"],
        "primaryTranscriptSource": "researcher_provided" if make_primary else "unchanged",
    }
    (doc_dir / "media_metadata.json").write_text(json.dumps(media_metadata, indent=2), encoding="utf-8")
    _write_audit_event(doc_dir, f"attached_transcript {safe_label} make_primary={make_primary}")

    return {
        "doc_id": local_doc_id,
        "label": safe_label,
        "language": language,
        "chunkCount": len(chunks),
        "charCount": version["charCount"],
        "makePrimary": make_primary,
        "transcriptPath": str(transcript_file),
        "comparison": comparison,
    }


def load_or_build_comment_queue(doc_id: str, config: Config, save: bool = True) -> dict:
    _local_doc_id, doc_dir = _doc_dir(doc_id, config)
    path = doc_dir / "comment_evidence_queue.json"
    if path.exists():
        return _read_json(path, {})
    raw = _read_json(doc_dir / "media_comments.json", {})
    comments = raw.get("comments", []) if isinstance(raw, dict) else []
    queue = build_comment_queue(comments)
    if save and comments:
        path.write_text(json.dumps(queue, indent=2), encoding="utf-8")
        _write_audit_event(doc_dir, "created_comment_evidence_queue")
    return queue


def build_comment_queue(comments: list[dict]) -> dict:
    rows: list[dict] = []
    for item in comments:
        if not isinstance(item, dict):
            continue
        row = dict(item)
        row.setdefault("reviewStatus", "needs_review")
        row.setdefault("trustLevel", "lower_trust_platform_comment")
        row.setdefault("evidenceUse", "context_only_not_source_claim")
        row.setdefault("llmAnalysisStatus", "not_requested")
        row.setdefault("llmAnalysisProfile", "")
        row.setdefault("llmAnalysisRequestedAt", "")
        row.setdefault("llmAnalysisCompletedAt", "")
        row.setdefault("llmAnalysisResultPath", "")
        row["riskFlags"] = _comment_risk_flags(str(row.get("text") or ""))
        rows.append(row)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "trustLevel": "lower_trust_platform_comment",
        "reviewStatus": "needs_review" if rows else "empty",
        "analysisStatus": "not_requested" if rows else "not_available",
        "analysisNote": "Prepared for later LLM or researcher review; comments are not treated as source claims.",
        "commentCount": len(rows),
        "comments": rows,
    }


def _platform_view_count(media_metadata: dict) -> int | None:
    reach = media_metadata.get("reachMetrics") or {}
    if reach.get("totalEstimatedViews") is not None:
        return reach.get("totalEstimatedViews")
    for row in media_metadata.get("platformDistribution") or []:
        if isinstance(row, dict) and row.get("viewCount") is not None:
            return row.get("viewCount")
    return None


def _platform_comment_count(media_metadata: dict) -> int | None:
    signals = media_metadata.get("platformAlgorithmicSignals") or {}
    if signals.get("commentCount") is not None:
        return signals.get("commentCount")
    raw = media_metadata.get("rawYtDlpMetadata") or {}
    return raw.get("comment_count")


def _update_media_comment_metadata(doc_dir: Path, info: dict, payload: dict) -> None:
    path = doc_dir / "media_metadata.json"
    media_metadata = _read_json(path, {})
    if not isinstance(media_metadata, dict):
        media_metadata = {}
    signals = media_metadata.setdefault("platformAlgorithmicSignals", {})
    signals["commentCount"] = info.get("comment_count")
    signals["commentsCollectedCount"] = payload["collectedCount"]
    signals["commentsCollectedAt"] = payload["generatedAt"]
    path.write_text(json.dumps(media_metadata, indent=2), encoding="utf-8")


def _texts_for_versions(
    doc_dir: Path,
    versions: list[dict],
    selected_label: str,
    selected_chunks: list[dict],
) -> dict[str, str]:
    texts: dict[str, str] = {}
    for version in versions:
        label = str(version.get("label") or "")
        if not label:
            continue
        transcript_file = doc_dir / "transcripts" / f"{_safe_label(label)}.json"
        payload = _read_json(transcript_file, {})
        chunks = payload.get("chunks") if isinstance(payload, dict) else None
        if isinstance(chunks, list) and chunks:
            texts[label] = chunks_to_text(chunks, include_timestamps=False)
    if selected_label and selected_chunks:
        texts[selected_label] = chunks_to_text(selected_chunks, include_timestamps=False)
    return texts


def _next_media_actions(
    media_metadata: dict,
    versions: list[dict],
    comment_queue: dict,
    candidate_sources: dict,
) -> list[str]:
    actions: list[str] = []
    if not media_metadata:
        actions.append("Run or repair media preprocessing so media_metadata.json exists.")
    if not versions:
        actions.append("Attach or extract at least one timed transcript version.")
    elif len(versions) == 1:
        actions.append("Add another transcript source if comparison is needed.")
    if comment_queue.get("commentCount", 0) and comment_queue.get("analysisStatus") == "not_requested":
        actions.append("Review comment_evidence_queue.json before any later LLM comment analysis.")
    elif media_metadata and not comment_queue.get("commentCount", 0):
        actions.append("Run collect-comments if platform comments are needed for lower-trust contextual review.")
    if not candidate_sources:
        actions.append("Run related-source-search after reviewing discovery seeds.")
    elif candidate_sources.get("errorCount"):
        actions.append("Review related-source-search errors and rerun failed queries if needed.")
    return actions


def _comment_risk_flags(text: str) -> list[str]:
    lowered = text.lower()
    flags: list[str] = []
    if any(term in lowered for term in ("kill", "suicide", "self-harm", "self harm")):
        flags.append("self_harm_or_violence_language")
    if any(term in lowered for term in ("slur", "faggot", "tranny")):
        flags.append("potential_harmful_language")
    if any(term in lowered for term in ("testimony", "my story", "i was", "i am")):
        flags.append("possible_personal_testimony")
    return flags


def _doc_dir(doc_id: str, config: Config) -> tuple[str, Path]:
    local_doc_id, doc_dir = resolve_doc_dir(doc_id, config)
    if not doc_dir.exists():
        raise FileNotFoundError(f"No corpus folder found for {doc_id}")
    return local_doc_id, doc_dir


def _read_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _archive_file(path: Path, archive_dir: Path) -> None:
    archive_dir.mkdir(parents=True, exist_ok=True)
    archive = archive_dir / f"{path.stem}_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}{path.suffix}"
    shutil.copy2(path, archive)


def _write_audit_event(doc_dir: Path, event: str) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    with (doc_dir / "audit.log").open("a", encoding="utf-8") as f:
        f.write(f"{ts} {event}\n")


def _safe_label(value: str) -> str:
    label = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in value.strip())
    return label.strip("_") or "uploaded_transcript"
