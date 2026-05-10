from dataclasses import dataclass
import json

import pytest

from runner.models.research_annotation import ResearchAnnotation
from runner.pipeline import research_annotate


@dataclass
class _Config:
    corpus_dir: object
    litelm_enrichment_model: str = "lexicon-llm"
    litelm_analysis_model: str = "core-qwen"
    litelm_analysis_model_heavy: str = "core-gemma"
    litelm_analysis_model_reasoning: str = "review-qwen"
    local_analysis_model: str = "qwen"
    local_analysis_model_heavy: str = "gemma"
    local_analysis_model_reasoning: str = "reasoning"
    claude_model: str = "claude"
    local_output_tokens: int = 4096
    local_context_tokens: int = 8192
    litelm_base_url: str = ""
    litelm_api_key: str = ""
    ollama_base_url: str = ""
    anthropic_api_key: str = ""


def _annotation(status: str = "model_generated") -> ResearchAnnotation:
    return ResearchAnnotation(
        doc_id="doc-1",
        profile="search_discovery",
        annotationStatus=status,
        modelProvider="litelm",
        modelName="lexicon-llm",
        promptVersion="research-profile-search_discovery-v1.0",
        inputTextHash="a" * 64,
        sourceStance="mixed",
        resultJson={"sourceStance": "mixed", "phrases": []},
    )


def test_save_annotation_archives_existing_unless_overwrite(tmp_path):
    config = _Config(corpus_dir=tmp_path)
    first = _annotation()
    research_annotate.save_annotation(first, config)
    second = _annotation()
    second.result_json["phrases"] = ["new"]

    research_annotate.save_annotation(second, config)

    path = tmp_path / "doc-1" / "research_annotations" / "search_discovery.json"
    archive = tmp_path / "doc-1" / "research_annotations" / "archive"
    assert json.loads(path.read_text())["resultJson"]["phrases"] == ["new"]
    assert len(list(archive.glob("search_discovery_*.json"))) == 1


def test_save_annotation_preserves_reviewed_without_force(tmp_path):
    config = _Config(corpus_dir=tmp_path)
    research_annotate.save_annotation(_annotation("researcher_reviewed"), config)

    with pytest.raises(RuntimeError, match="reviewed/corrected"):
        research_annotate.save_annotation(_annotation(), config)


def test_update_annotation_review_sets_status_notes_and_reviewed_at(tmp_path):
    config = _Config(corpus_dir=tmp_path)
    research_annotate.save_annotation(_annotation(), config)

    updated = research_annotate.update_annotation_review(
        "doc-1",
        "search_discovery",
        config,
        annotation_status="researcher_reviewed",
        reviewer_notes="Looks usable after close reading.",
        public_visibility="internal_research",
    )

    assert updated.annotation_status == "researcher_reviewed"
    assert updated.reviewer_notes == "Looks usable after close reading."
    assert updated.public_visibility == "internal_research"
    assert updated.reviewed_at is not None


def test_invalid_raw_is_saved_to_debug(tmp_path):
    config = _Config(corpus_dir=tmp_path)
    path = research_annotate.save_invalid_raw(
        "doc-1", "search_discovery", "not-json", config
    )

    assert path.parent.name == "debug"
    assert path.name.startswith("search_discovery_invalid_raw_")
    assert path.read_text() == "not-json"


def test_annotate_document_save_local_only_uses_extracted_text_and_analysis(tmp_path, monkeypatch):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "extracted.txt").write_text("source text", encoding="utf-8")
    (doc_dir / "analysis.json").write_text('{"type": "Mixed"}', encoding="utf-8")

    monkeypatch.setattr(
        research_annotate,
        "_call_annotation_model",
        lambda **kwargs: '{"sourceStance": "mixed", "phrases": ["source text"]}',
    )

    annotation = research_annotate.annotate_document(
        "doc-1",
        "search_discovery",
        config,
        save_local_only=True,
    )

    assert annotation.source_stance == "mixed"
    assert (doc_dir / "research_annotations" / "search_discovery.json").exists()


def test_annotate_document_records_requested_and_resolved_model(tmp_path, monkeypatch):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "extracted.txt").write_text("source text", encoding="utf-8")

    monkeypatch.setattr(
        research_annotate,
        "_call_annotation_model",
        lambda **kwargs: research_annotate.AnnotationModelResponse(
            '{"sourceStance": "mixed"}',
            requested_model="core-qwen",
            resolved_model="qwen3.6:35b-a3b",
        ),
    )

    annotation = research_annotate.annotate_document(
        "doc-1",
        "search_discovery",
        config,
        save_local_only=True,
    )

    assert annotation.model_name == "core-qwen"
    assert annotation.resolved_model_name == "qwen3.6:35b-a3b"
    saved = json.loads((doc_dir / "research_annotations" / "search_discovery.json").read_text())
    assert saved["resolvedModelName"] == "qwen3.6:35b-a3b"


def test_testimony_annotation_requires_confirmed_consent(tmp_path, monkeypatch):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "extracted.txt").write_text("personal testimony", encoding="utf-8")
    (doc_dir / "analysis.json").write_text('{"testimony_flag": true}', encoding="utf-8")
    (doc_dir / "intake.json").write_text('{"testimony_consent": "pending"}', encoding="utf-8")

    monkeypatch.setattr(
        research_annotate,
        "_call_annotation_model",
        lambda **kwargs: '{"sourceStance": "mixed"}',
    )

    with pytest.raises(RuntimeError, match="confirmed testimony consent"):
        research_annotate.annotate_document(
            "doc-1",
            "testimony_analysis",
            config,
            save_local_only=True,
        )


def test_export_annotations_markdown_summarises_profile(tmp_path):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "analysis.json").write_text(
        json.dumps({"format": "Video", "type": "Mixed", "title": "Example video"}),
        encoding="utf-8",
    )
    annotation = _annotation()
    annotation.profile = "shame_article"
    annotation.result_json = {
        "sourceStance": "mixed",
        "shamePhase": {"precondition": True, "method": False, "residue": False},
        "rhetoricalArguments": ["ability_to_choose"],
        "quotablePassages": [{"timestamp": "00:01:02", "quote": "example quote"}],
    }
    research_annotate.save_annotation(annotation, config)

    path = research_annotate.export_annotations_markdown("shame_article", config)

    text = path.read_text(encoding="utf-8")
    assert "Example video" in text
    assert "ability_to_choose" in text
    assert "example quote" in text


def test_call_litelm_reads_resolved_model_from_response(monkeypatch, tmp_path):
    config = _Config(corpus_dir=tmp_path, litelm_base_url="http://litelm.test", litelm_api_key="key")

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "model": "qwen3.6:35b-a3b",
                "choices": [{"message": {"content": '{"sourceStance": "mixed"}'}}],
            }

    calls = []

    def fake_post(*args, **kwargs):
        calls.append(kwargs["json"]["model"])
        return FakeResponse()

    monkeypatch.setattr("httpx.post", fake_post)

    response = research_annotate._call_litelm("system", "user", config, "core-qwen")

    assert calls == ["core-qwen"]
    assert response.content == '{"sourceStance": "mixed"}'
    assert response.requested_model == "core-qwen"
    assert response.resolved_model == "qwen3.6:35b-a3b"


def test_recommended_profiles_for_common_media_formats():
    assert research_annotate.recommended_profiles("Video", "Anti-SOGICE") == [
        "documentary_analysis",
        "shame_article",
    ]
    assert research_annotate.recommended_profiles("Podcast episode", "Mixed") == [
        "podcast_analysis",
        "shame_article",
    ]
    assert research_annotate.recommended_profiles("Interview", "Testimony") == [
        "testimony_analysis",
    ]
    assert research_annotate.recommended_profiles("Website-Page", "Pro-SOGICE") == [
        "shame_article",
        "anti_gender_network",
    ]
    assert research_annotate.recommended_profiles("Legal-Policy", "Anti-SOGICE") == []


def test_annotate_document_prefers_full_transcript_chunks_over_extracted_text(tmp_path, monkeypatch):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "extracted.txt").write_text("truncated transcript", encoding="utf-8")
    (doc_dir / "transcript_chunks.json").write_text(
        json.dumps(
            [
                {
                    "index": 0,
                    "start": "00:00:01.000",
                    "end": "00:00:02.000",
                    "text": "full transcript chunk",
                }
            ]
        ),
        encoding="utf-8",
    )

    seen = {}

    def fake_model(**kwargs):
        seen["user_message"] = kwargs["user_message"]
        return '{"sourceStance": "mixed"}'

    monkeypatch.setattr(research_annotate, "_call_annotation_model", fake_model)

    annotation = research_annotate.annotate_document(
        "doc-1",
        "search_discovery",
        config,
        save_local_only=True,
    )

    assert "full transcript chunk" in seen["user_message"]
    assert "truncated transcript" not in seen["user_message"]
    assert annotation.input_text_hash == research_annotate._sha256(
        "[00:00:01.000 --> 00:00:02.000] full transcript chunk"
    )
