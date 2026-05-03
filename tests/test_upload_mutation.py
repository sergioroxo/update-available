import click
import pytest

from runner.clients.sanity import _build_sanity_document
from runner.models.document import (
    AnalysisResult,
    DocumentPackage,
    IntakeResult,
    PreprocessResult,
)
from runner.pipeline.upload import _enforce_testimony_upload_gate


def _analysis() -> AnalysisResult:
    return AnalysisResult.model_validate(
        {
            "type": "Anti-SOGICE",
            "format": "Blog-Post",
            "evidence": ["The document discusses opposition to conversion therapy."],
            "scope": "Core",
            "narrative_register": "Legal-Policy",
            "summary": "A short summary.",
        }
    )


def _testimony_analysis() -> AnalysisResult:
    result = _analysis()
    result.testimony_flag = True
    return result


def test_build_sanity_document_preserves_local_file_source_url_and_hash(tmp_path):
    intake = IntakeResult(
        doc_id="doc-1",
        source="/tmp/source.pdf",
        source_type="pdf",
        declared_type="pdf",
        tier=2,
        batch_id="batch-1",
        language=None,
        source_url="https://example.org/source.pdf",
        original_filename="source.pdf",
        local_copy_path=str(tmp_path / "source.pdf"),
        local_dir=tmp_path,
    )
    preprocess = PreprocessResult(
        doc_id="doc-1",
        tool_used="docling",
        quality="high",
        text="one two three",
        title="Document Title",
        source_html_sha256="b" * 64,
    )
    pkg = DocumentPackage(
        intake=intake,
        preprocess=preprocess,
        analysis=_analysis(),
        embedding=[],
        embedding_model="embedding-model",
        llm_used="litelm",
        local_dir=tmp_path,
    )

    doc = _build_sanity_document(pkg)

    assert doc["_type"] == "sogiceDocument"
    assert doc["meta"]["sourceUrl"] == "https://example.org/source.pdf"
    assert doc["content"]["title"] == "Document Title"
    assert doc["provenance"]["originalUrl"] == "https://example.org/source.pdf"
    assert doc["provenance"]["htmlSnapshotHash"] == "b" * 64
    assert "testimonyReview" not in doc


def test_build_sanity_document_adds_testimony_consent_when_flagged(tmp_path):
    intake = IntakeResult(
        doc_id="doc-1",
        source="https://example.org/testimony",
        source_type="url",
        declared_type="url",
        tier=2,
        batch_id="batch-1",
        language=None,
        testimony_consent="confirmed",
        local_dir=tmp_path,
    )
    preprocess = PreprocessResult(
        doc_id="doc-1",
        tool_used="trafilatura",
        quality="high",
        text="one two three",
    )
    pkg = DocumentPackage(
        intake=intake,
        preprocess=preprocess,
        analysis=_testimony_analysis(),
        embedding=[],
        embedding_model="embedding-model",
        llm_used="claude",
        local_dir=tmp_path,
    )

    doc = _build_sanity_document(pkg)

    assert doc["meta"]["testimonyConsent"] == "confirmed"


def test_testimony_upload_gate_blocks_missing_consent(tmp_path):
    intake = IntakeResult(
        doc_id="doc-1",
        source="https://example.org/testimony",
        source_type="url",
        declared_type="url",
        tier=2,
        batch_id="batch-1",
        language=None,
        local_dir=tmp_path,
    )

    with pytest.raises(click.exceptions.Exit):
        _enforce_testimony_upload_gate(intake, _testimony_analysis())
