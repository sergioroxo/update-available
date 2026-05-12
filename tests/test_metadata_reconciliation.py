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


# ── _save_confirmed_register_fields ──────────────────────────────────────────

def test_save_confirmed_register_fields_all_three(tmp_path):
    from runner.app import _save_confirmed_register_fields

    _write_json(tmp_path / "analysis.json", {
        "narrative_register": "Mixed",
        "rhetorical_intensity": "",
        "framing_balance": "",
    })
    changed = _save_confirmed_register_fields(
        tmp_path,
        "Legal-Policy",
        "pathologizing",
        "pro-dominant",
    )

    ana = _read_json(tmp_path / "analysis.json")
    assert ana["narrative_register"] == "Legal-Policy"
    assert ana["rhetorical_intensity"] == "pathologizing"
    assert ana["framing_balance"] == "pro-dominant"
    assert ana["_manual_overrides"]["narrative_register"] == "researcher_confirmed"
    assert ana["_manual_overrides"]["rhetorical_intensity"] == "researcher_confirmed"
    assert ana["_manual_overrides"]["framing_balance"] == "researcher_confirmed"
    assert set(changed) == {"narrative_register", "rhetorical_intensity", "framing_balance"}


def test_save_confirmed_register_fields_partial(tmp_path):
    from runner.app import _save_confirmed_register_fields

    _write_json(tmp_path / "analysis.json", {"narrative_register": "Mixed"})
    changed = _save_confirmed_register_fields(tmp_path, "Journalistic", None, None)

    ana = _read_json(tmp_path / "analysis.json")
    assert ana["narrative_register"] == "Journalistic"
    assert ana["_manual_overrides"]["narrative_register"] == "researcher_confirmed"
    assert "rhetorical_intensity" not in ana.get("_manual_overrides", {})
    assert "framing_balance" not in ana.get("_manual_overrides", {})
    assert changed == ["narrative_register"]


def test_save_confirmed_register_fields_empty_strings_are_noop(tmp_path):
    from runner.app import _save_confirmed_register_fields

    _write_json(tmp_path / "analysis.json", {"narrative_register": "Mixed"})
    changed = _save_confirmed_register_fields(tmp_path, "", "", "")

    ana = _read_json(tmp_path / "analysis.json")
    assert ana["narrative_register"] == "Mixed"
    assert "_manual_overrides" not in ana
    assert changed == []


def test_save_confirmed_register_fields_preserves_existing_overrides(tmp_path):
    from runner.app import _save_confirmed_register_fields

    _write_json(tmp_path / "analysis.json", {
        "narrative_register": "Mixed",
        "_manual_overrides": {"type": "researcher_confirmed"},
    })
    _save_confirmed_register_fields(tmp_path, "Academic-Analytical", None, None)

    ana = _read_json(tmp_path / "analysis.json")
    assert ana["_manual_overrides"]["type"] == "researcher_confirmed"
    assert ana["_manual_overrides"]["narrative_register"] == "researcher_confirmed"


def test_save_confirmed_register_fields_no_analysis_file(tmp_path):
    from runner.app import _save_confirmed_register_fields

    # analysis.json absent — should return empty list without crash
    changed = _save_confirmed_register_fields(tmp_path, "Legal-Policy", None, None)
    assert changed == []
    assert not (tmp_path / "analysis.json").exists()


# ── _normalise_country / _normalise_country_list ──────────────────────────────

def test_normalise_country_iso2_uk():
    from runner.app import _normalise_country
    assert _normalise_country("UK") == "United Kingdom"


def test_normalise_country_iso2_us():
    from runner.app import _normalise_country
    assert _normalise_country("US") == "United States"


def test_normalise_country_iso2_de():
    from runner.app import _normalise_country
    assert _normalise_country("DE") == "Germany"


def test_normalise_country_iso2_no():
    from runner.app import _normalise_country
    assert _normalise_country("NO") == "Norway"


def test_normalise_country_passthrough_unknown():
    from runner.app import _normalise_country
    assert _normalise_country("Ruritania") == "Ruritania"


def test_normalise_country_strips_whitespace():
    from runner.app import _normalise_country
    assert _normalise_country("  UK  ") == "United Kingdom"


def test_normalise_country_list_mixed():
    from runner.app import _normalise_country_list
    result = _normalise_country_list(["UK", "Germany", "US", "Norway"])
    assert result == ["United Kingdom", "Germany", "United States", "Norway"]


def test_normalise_country_list_skips_empty():
    from runner.app import _normalise_country_list
    result = _normalise_country_list(["UK", "", "  "])
    assert result == ["United Kingdom"]


def test_save_confirmed_classification_normalises_country(tmp_path):
    from runner.app import _save_confirmed_classification

    _write_json(tmp_path / "analysis.json", {"type": "Anti-SOGICE", "country": []})
    _save_confirmed_classification(tmp_path, ["UK", "US", "DE"], "Anti-SOGICE", None)

    ana = _read_json(tmp_path / "analysis.json")
    assert ana["country"] == ["United Kingdom", "United States", "Germany"]


# ── _annotation_quote_fields ─────────────────────────────────────────────────

def test_annotation_quote_fields_accepts_dict_shape():
    from runner.app import _annotation_quote_fields

    assert _annotation_quote_fields(
        {"timestamp": "00:01:02", "quote": "quoted text", "significance": "important"}
    ) == ("00:01:02", "quoted text", "important")


def test_annotation_quote_fields_accepts_page_timestamp_alias():
    from runner.app import _annotation_quote_fields

    assert _annotation_quote_fields(
        {"pageOrTimestamp": "p. 4", "text": "quoted text"}
    ) == ("p. 4", "quoted text", "")


def test_annotation_quote_fields_accepts_plain_string():
    from runner.app import _annotation_quote_fields

    assert _annotation_quote_fields("quoted text") == ("", "quoted text", "")


def test_as_display_list_wraps_plain_string():
    from runner.app import _as_display_list

    assert _as_display_list("visual rhetoric is inferred") == ["visual rhetoric is inferred"]


def test_as_display_list_preserves_list():
    from runner.app import _as_display_list

    assert _as_display_list(["one", "two"]) == ["one", "two"]


def test_embedding_payload_status_accepts_vector_schema():
    from runner.app import _embedding_payload_status

    status = _embedding_payload_status({"model": "qwen3-embedding:8b", "dimension": 4096, "vector": [0.1, 0.2]})
    assert status["ok"] is True
    assert status["model"] == "qwen3-embedding:8b"
    assert status["dimension"] == 4096


def test_embedding_payload_status_accepts_legacy_embedding_schema():
    from runner.app import _embedding_payload_status

    status = _embedding_payload_status({"embedding_model": "legacy", "embedding": [0.1, 0.2]})
    assert status["ok"] is True
    assert status["model"] == "legacy"
    assert status["dimension"] == 2


def test_embedding_payload_status_flags_empty_vector():
    from runner.app import _embedding_payload_status

    status = _embedding_payload_status({"model": "qwen3-embedding:8b", "dimension": 4096, "vector": []})
    assert status["ok"] is False
    assert status["detail"] == "empty vector"
