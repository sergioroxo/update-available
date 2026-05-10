import pytest

from runner.models.research_annotation import (
    ResearchAnnotation,
    validate_annotation_profile,
    validate_profile,
)


def test_profile_validation_accepts_known_profiles():
    assert validate_profile("archive_core") == "archive_core"
    assert validate_annotation_profile("shame_article") == "shame_article"


def test_archive_core_is_not_an_llm_annotation_profile():
    with pytest.raises(ValueError, match="metadata-only"):
        validate_annotation_profile("archive_core")


def test_research_annotation_envelope_allows_flexible_result_json():
    annotation = ResearchAnnotation(
        doc_id="doc-123",
        profile="search_discovery",
        modelProvider="litelm",
        modelName="lexicon-llm",
        resolvedModelName="qwen3.6:35b-a3b",
        promptVersion="research-profile-search_discovery-v1.0",
        inputTextHash="a" * 64,
        sourceStance="mixed",
        resultJson={
            "sourceStance": "mixed",
            "phrases": ["change is possible"],
            "profileSpecificFutureField": {"nested": True},
        },
    )

    assert annotation.doc_id == "doc-123"
    assert annotation.resolved_model_name == "qwen3.6:35b-a3b"
    assert annotation.result_json["profileSpecificFutureField"]["nested"] is True


def test_research_annotation_rejects_mismatched_stance():
    with pytest.raises(ValueError, match="sourceStance"):
        ResearchAnnotation(
            doc_id="doc-123",
            profile="search_discovery",
            modelProvider="litelm",
            modelName="lexicon-llm",
            promptVersion="research-profile-search_discovery-v1.0",
            inputTextHash="a" * 64,
            sourceStance="mixed",
            resultJson={"sourceStance": "pro_sogice"},
        )
