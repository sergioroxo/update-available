import json

import pytest

from runner.pipeline import screenshots


class _Config:
    def __init__(self, corpus_dir):
        self.corpus_dir = corpus_dir


def test_timestamps_from_suggestions_extracts_unique_normalised_values():
    values = screenshots._timestamps_from_suggestions(
        [
            {"timestamp": "00:01:02", "description": "opening"},
            "Consider 1:02 again",
            "At 00:02:03.40 show the claim",
            "no timestamp here",
        ]
    )

    assert values == ["00:01:02.000", "00:02:03.400"]


def test_capture_screenshots_dry_run_uses_local_video_and_annotation(tmp_path, monkeypatch):
    doc_dir = tmp_path / "7b76c504"
    doc_dir.mkdir()
    video = tmp_path / "source.mp4"
    video.write_bytes(b"fake-video")
    (doc_dir / "intake.json").write_text(
        json.dumps({"local_copy_path": str(video)}),
        encoding="utf-8",
    )
    ann_dir = doc_dir / "research_annotations"
    ann_dir.mkdir()
    (ann_dir / "documentary_analysis.json").write_text(
        json.dumps(
            {
                "resultJson": {
                    "sceneScreenshotSuggestions": [
                        {"timestamp": "00:01:02", "description": "opening"},
                    ]
                }
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(screenshots, "tool_path", lambda name: "/usr/bin/ffmpeg")

    payload = screenshots.capture_screenshots(
        "7b76c504",
        _Config(tmp_path),
        dry_run=True,
    )

    assert payload["timestampCount"] == 1
    assert payload["screenshots"][0]["path"].endswith("001_00-01-02_000.jpg")


def test_capture_screenshots_requires_ffmpeg(tmp_path, monkeypatch):
    monkeypatch.setattr(screenshots, "tool_path", lambda name: "")

    with pytest.raises(RuntimeError, match="ffmpeg"):
        screenshots.capture_screenshots("missing", _Config(tmp_path), dry_run=True)
