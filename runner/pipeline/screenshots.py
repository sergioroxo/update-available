"""Screenshot capture helpers for media research annotations."""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

from ..config import Config
from .doc_ids import resolve_doc_dir
from .system_tools import ensure_tool_path_env, tool_path


def capture_screenshots(
    doc_id: str,
    config: Config,
    profile: str = "documentary_analysis",
    video_path: str = "",
    output_dir: str = "",
    limit: int = 20,
    dry_run: bool = False,
) -> dict:
    """Capture ffmpeg screenshots from sceneScreenshotSuggestions."""
    local_doc_id, doc_dir = resolve_doc_dir(doc_id, config)
    ensure_tool_path_env()
    ffmpeg = tool_path("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required for screenshot capture. Install it and rerun doctor.")

    source_video = _resolve_video_path(doc_dir, video_path)
    annotation_path = doc_dir / "research_annotations" / f"{profile}.json"
    if not annotation_path.exists():
        raise FileNotFoundError(f"No local {profile} annotation found for {local_doc_id}")

    annotation = json.loads(annotation_path.read_text(encoding="utf-8"))
    suggestions = (annotation.get("resultJson") or {}).get("sceneScreenshotSuggestions") or []
    timestamps = _timestamps_from_suggestions(suggestions)
    if limit > 0:
        timestamps = timestamps[:limit]

    target_dir = Path(output_dir) if output_dir else doc_dir / "screenshots" / profile
    captured: list[dict] = []
    for index, timestamp in enumerate(timestamps, start=1):
        filename = f"{index:03d}_{_safe_timestamp(timestamp)}.jpg"
        target = target_dir / filename
        captured.append({"timestamp": timestamp, "path": str(target), "captured": False})
        if dry_run:
            continue
        target_dir.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-ss",
                timestamp,
                "-i",
                str(source_video),
                "-frames:v",
                "1",
                "-q:v",
                "2",
                str(target),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        captured[-1]["captured"] = True

    payload = {
        "doc_id": local_doc_id,
        "profile": profile,
        "videoPath": str(source_video),
        "outputDir": str(target_dir),
        "suggestionCount": len(suggestions),
        "timestampCount": len(timestamps),
        "dryRun": dry_run,
        "screenshots": captured,
    }
    if not dry_run:
        (target_dir / "capture_manifest.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def _resolve_video_path(doc_dir: Path, video_path: str) -> Path:
    if video_path:
        path = Path(video_path).expanduser()
        if not path.exists():
            raise FileNotFoundError(f"Video file not found: {path}")
        return path

    intake_path = doc_dir / "intake.json"
    if intake_path.exists():
        intake = json.loads(intake_path.read_text(encoding="utf-8"))
        for key in ("local_copy_path", "source"):
            candidate = str(intake.get(key) or "")
            if candidate and not candidate.startswith(("http://", "https://")):
                path = Path(candidate).expanduser()
                if path.exists():
                    return path

    preprocess_path = doc_dir / "preprocess.json"
    if preprocess_path.exists():
        preprocess = json.loads(preprocess_path.read_text(encoding="utf-8"))
        for key in ("local_copy_path", "source_path", "videoPath", "audio_source"):
            candidate = str(preprocess.get(key) or "")
            if candidate and not candidate.startswith(("http://", "https://")):
                path = Path(candidate).expanduser()
                if path.exists():
                    return path

    raise FileNotFoundError(
        "No local video file was found. Pass --video-path /path/to/video.mp4, "
        "or ingest from a local media file when screenshot capture is needed."
    )


def _timestamps_from_suggestions(suggestions: list) -> list[str]:
    timestamps: list[str] = []
    for item in suggestions:
        if isinstance(item, dict):
            raw = str(item.get("timestamp") or item.get("time") or item.get("start") or "")
        else:
            raw = str(item)
        match = re.search(r"\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?\b", raw)
        if not match:
            continue
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        millis = (match.group(4) or "000").ljust(3, "0")[:3]
        timestamps.append(f"{hours:02d}:{minutes:02d}:{seconds:02d}.{millis}")
    return list(dict.fromkeys(timestamps))


def _safe_timestamp(timestamp: str) -> str:
    return timestamp.replace(":", "-").replace(".", "_")
