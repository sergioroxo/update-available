"""Tests for metadata reconciliation helpers and Sanity patch functions."""
from __future__ import annotations
import json
from pathlib import Path
from unittest.mock import patch
import pytest

from runner import clients
from runner.clients import sanity


# ── Minimal config stub ──────────────────────────────────────────────────────

class _Config:
    sanity_project_id = "test-proj"
    sanity_dataset = "production"
    sanity_write_token = "tok"
    corpus_dir = Path("/tmp/corpus")


# ── Sanity patch helpers ─────────────────────────────────────────────────────

def test_write_content_metadata_update_title_and_language(monkeypatch):
    calls = []

    def fake_mutate(mutations, config):
        calls.append(mutations)
        return {"results": [{"id": "doc-abc123"}]}

    monkeypatch.setattr(sanity, "_mutate", fake_mutate)
    result = sanity.write_content_metadata_update("abc123", "My Title", "en", _Config())

    assert result == "doc-abc123"
    patch_op = calls[0][0]["patch"]
    assert patch_op["id"] == "doc-abc123"
    assert patch_op["set"]["content.title"] == "My Title"
    assert patch_op["set"]["content.languageDetected"] == "en"
    assert patch_op["set"]["mediaMetadata.general.episodeTitle"] == "My Title"


def test_write_content_metadata_update_title_only(monkeypatch):
    calls = []
    monkeypatch.setattr(sanity, "_mutate", lambda m, c: (calls.append(m), {"results": [{"id": "doc-x"}]})[1])
    sanity.write_content_metadata_update("x", "Title Only", None, _Config())
    patch_op = calls[0][0]["patch"]
    assert "content.title" in patch_op["set"]
    assert "content.languageDetected" not in patch_op["set"]


def test_write_content_metadata_update_raises_if_empty(monkeypatch):
    monkeypatch.setattr(sanity, "_mutate", lambda m, c: {"results": [{"id": "x"}]})
    with pytest.raises(ValueError):
        sanity.write_content_metadata_update("x", None, None, _Config())


def test_write_classification_update(monkeypatch):
    calls = []
    monkeypatch.setattr(sanity, "_mutate", lambda m, c: (calls.append(m), {"results": [{"id": "doc-y"}]})[1])
    result = sanity.write_classification_update(
        "y", ["Germany", "Austria"], "Anti-SOGICE", "documentary", _Config()
    )
    assert result == "doc-y"
    patch_op = calls[0][0]["patch"]
    assert patch_op["set"]["classification.country"] == ["Germany", "Austria"]
    assert patch_op["set"]["classification.type"] == "Anti-SOGICE"
    assert patch_op["set"]["classification.format"] == "documentary"


def test_write_classification_update_partial(monkeypatch):
    calls = []
    monkeypatch.setattr(sanity, "_mutate", lambda m, c: (calls.append(m), {"results": [{"id": "doc-z"}]})[1])
    sanity.write_classification_update("z", None, "Pro-SOGICE", None, _Config())
    patch_op = calls[0][0]["patch"]
    assert "classification.country" not in patch_op["set"]
    assert patch_op["set"]["classification.type"] == "Pro-SOGICE"
    assert "classification.format" not in patch_op["set"]


def test_write_classification_update_raises_if_empty(monkeypatch):
    monkeypatch.setattr(sanity, "_mutate", lambda m, c: {"results": [{"id": "x"}]})
    with pytest.raises(ValueError):
        sanity.write_classification_update("x", None, None, None, _Config())


# ── Local save helpers ────────────────────────────────────────────────────────

def _write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def test_save_confirmed_title_writes_preprocess_and_media(tmp_path):
    from runner.app import _save_confirmed_title

    _write_json(tmp_path / "preprocess.json", {"title": "", "text": "hello"})
    _write_json(tmp_path / "media_metadata.json", {"general": {"creator": "Test"}})

    _save_confirmed_title(tmp_path, "My Confirmed Title")

    pre = _read_json(tmp_path / "preprocess.json")
    assert pre["title"] == "My Confirmed Title"
    assert pre["_manual_overrides"]["title"] == "researcher_confirmed"

    media = _read_json(tmp_path / "media_metadata.json")
    assert media["general"]["episodeTitle"] == "My Confirmed Title"


def test_save_confirmed_title_no_media_file(tmp_path):
    from runner.app import _save_confirmed_title

    _write_json(tmp_path / "preprocess.json", {"title": ""})
    # media_metadata.json absent — should not crash
    _save_confirmed_title(tmp_path, "Title Without Media")

    pre = _read_json(tmp_path / "preprocess.json")
    assert pre["title"] == "Title Without Media"
    assert not (tmp_path / "media_metadata.json").exists()


def test_save_confirmed_title_preserves_existing_overrides(tmp_path):
    from runner.app import _save_confirmed_title

    _write_json(tmp_path / "preprocess.json", {
        "title": "old",
        "_manual_overrides": {"language_detected": "researcher_confirmed"},
    })
    _save_confirmed_title(tmp_path, "New Title")

    pre = _read_json(tmp_path / "preprocess.json")
    assert pre["_manual_overrides"]["language_detected"] == "researcher_confirmed"
    assert pre["_manual_overrides"]["title"] == "researcher_confirmed"


def test_save_confirmed_language_writes_preprocess(tmp_path):
    from runner.app import _save_confirmed_language

    _write_json(tmp_path / "preprocess.json", {"language_detected": "", "text": "x"})
    _save_confirmed_language(tmp_path, "pt")

    pre = _read_json(tmp_path / "preprocess.json")
    assert pre["language_detected"] == "pt"
    assert pre["_manual_overrides"]["language_detected"] == "researcher_confirmed"


def test_save_confirmed_language_does_not_erase_title_override(tmp_path):
    from runner.app import _save_confirmed_language

    _write_json(tmp_path / "preprocess.json", {
        "_manual_overrides": {"title": "researcher_confirmed"},
    })
    _save_confirmed_language(tmp_path, "de")

    pre = _read_json(tmp_path / "preprocess.json")
    assert pre["_manual_overrides"]["title"] == "researcher_confirmed"
    assert pre["_manual_overrides"]["language_detected"] == "researcher_confirmed"


def test_save_confirmed_classification_writes_analysis(tmp_path):
    from runner.app import _save_confirmed_classification

    _write_json(tmp_path / "analysis.json", {
        "type": "Unknown",
        "format": "article",
        "country": [],
    })
    _save_confirmed_classification(tmp_path, ["Germany"], "Anti-SOGICE", "documentary")

    ana = _read_json(tmp_path / "analysis.json")
    assert ana["type"] == "Anti-SOGICE"
    assert ana["format"] == "documentary"
    assert ana["country"] == ["Germany"]
    assert ana["_manual_overrides"]["type"] == "researcher_confirmed"
    assert ana["_manual_overrides"]["format"] == "researcher_confirmed"
    assert ana["_manual_overrides"]["country"] == "researcher_confirmed"


def test_save_confirmed_classification_partial(tmp_path):
    from runner.app import _save_confirmed_classification

    _write_json(tmp_path / "analysis.json", {"type": "Unknown", "format": "article", "country": []})
    # Only changing type
    _save_confirmed_classification(tmp_path, None, "Pro-SOGICE", None)

    ana = _read_json(tmp_path / "analysis.json")
    assert ana["type"] == "Pro-SOGICE"
    assert "country" not in ana.get("_manual_overrides", {})
    assert "format" not in ana.get("_manual_overrides", {})


# ── Transcript primary selection ─────────────────────────────────────────────

def test_set_primary_transcript_updates_media_metadata(tmp_path):
    from runner.app import _set_primary_transcript

    (tmp_path / "transcripts").mkdir()
    _write_json(
        tmp_path / "transcripts" / "en_version.json",
        {"label": "en_version", "chunks": [{"start": "00:00", "text": "Hello"}]},
    )
    _write_json(tmp_path / "media_metadata.json", {
        "transcriptEvidence": {"selectedTranscriptLabel": "old_version"},
    })

    _set_primary_transcript("abc", tmp_path, "en_version", push_sanity=False, config=None)

    media = _read_json(tmp_path / "media_metadata.json")
    assert media["transcriptEvidence"]["selectedTranscriptLabel"] == "en_version"

    chunks = _read_json(tmp_path / "transcript_chunks.json")
    assert chunks[0]["text"] == "Hello"


def test_set_primary_transcript_no_chunks_raises(tmp_path):
    """Version file exists but has no chunks — must raise rather than silently leaving stale data."""
    from runner.app import _set_primary_transcript

    (tmp_path / "transcripts").mkdir()
    _write_json(tmp_path / "transcripts" / "empty.json", {"label": "empty", "chunks": []})
    _write_json(tmp_path / "media_metadata.json", {"transcriptEvidence": {}})

    with pytest.raises(ValueError, match="no chunks"):
        _set_primary_transcript("abc", tmp_path, "empty", push_sanity=False, config=None)

    # Neither media_metadata label nor transcript_chunks.json should be touched.
    media = _read_json(tmp_path / "media_metadata.json")
    assert "selectedTranscriptLabel" not in media.get("transcriptEvidence", {})
    assert not (tmp_path / "transcript_chunks.json").exists()


def test_set_primary_transcript_version_file_missing_raises(tmp_path):
    """No version file — must raise rather than silently updating only the label."""
    from runner.app import _set_primary_transcript

    (tmp_path / "transcripts").mkdir()
    _write_json(tmp_path / "media_metadata.json", {"transcriptEvidence": {}})

    with pytest.raises(ValueError, match="No transcript file found"):
        _set_primary_transcript("abc", tmp_path, "nonexistent", push_sanity=False, config=None)

    media = _read_json(tmp_path / "media_metadata.json")
    assert "selectedTranscriptLabel" not in media.get("transcriptEvidence", {})
