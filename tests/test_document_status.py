from dataclasses import dataclass
import json

from runner.pipeline.upload import inspect_document_status


@dataclass
class _Config:
    corpus_dir: object
    embedding_model: str = "embedding-model"


def test_inspect_document_status_reports_partial_intake_next_action(tmp_path):
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "intake.json").write_text(
        json.dumps({"doc_id": "doc-1", "source": "https://example.org", "source_type": "url"}),
        encoding="utf-8",
    )

    status = inspect_document_status("doc-1", _Config(corpus_dir=tmp_path))

    assert status["exists"] is True
    assert status["summary"]["source"] == "https://example.org"
    assert "extracted.txt is required" in status["next_action"]


def test_inspect_document_status_warns_for_missing_text_after_preprocess(tmp_path):
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "intake.json").write_text(
        json.dumps({"doc_id": "doc-1", "source": "https://example.org", "source_type": "url"}),
        encoding="utf-8",
    )
    (doc_dir / "preprocess.json").write_text(
        json.dumps({"doc_id": "doc-1", "tool_used": "trafilatura", "quality": "high", "char_count": 1200}),
        encoding="utf-8",
    )

    status = inspect_document_status("doc-1", _Config(corpus_dir=tmp_path))

    assert any("extracted.txt is missing" in warning for warning in status["warnings"])


def test_inspect_document_status_suggests_upload_after_analysis(tmp_path):
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "intake.json").write_text(
        json.dumps({"doc_id": "doc-1", "source": "https://example.org", "source_type": "url"}),
        encoding="utf-8",
    )
    (doc_dir / "extracted.txt").write_text("document text", encoding="utf-8")
    (doc_dir / "analysis.json").write_text(
        json.dumps(
            {
                "type": "Anti-SOGICE",
                "format": "Blog-Post",
                "confidence": {"overall_score": 0.9},
            }
        ),
        encoding="utf-8",
    )

    status = inspect_document_status("doc-1", _Config(corpus_dir=tmp_path))

    assert "upload-doc doc-1" in status["next_action"]
