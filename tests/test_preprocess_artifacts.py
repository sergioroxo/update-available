import json

from runner.models.document import PreprocessResult
from runner.pipeline.preprocess import _save_artifacts
from runner.pipeline.upload import _load_preprocess, _merge_intake_metadata


def test_save_artifacts_keeps_preprocess_json_metadata_only(tmp_path):
    result = PreprocessResult(
        doc_id="doc-1",
        tool_used="trafilatura",
        quality="high",
        text="full extracted text",
        markdown="# Full extracted text",
        outbound_links=[{"url": "https://example.org", "anchor_text": "Example", "domain": "example.org"}],
        source_html_sha256="a" * 64,
    )

    _save_artifacts(result, tmp_path)

    metadata = json.loads((tmp_path / "preprocess.json").read_text())
    assert "text" not in metadata
    assert "markdown" not in metadata
    assert metadata["outbound_link_count"] == 1
    assert (tmp_path / "extracted.txt").read_text() == "full extracted text"
    assert (tmp_path / "extracted.md").read_text() == "# Full extracted text"


def test_load_preprocess_rehydrates_text_from_extracted_txt(tmp_path):
    (tmp_path / "preprocess.json").write_text(
        json.dumps(
            {
                "doc_id": "doc-1",
                "tool_used": "trafilatura",
                "quality": "high",
                "char_count": 19,
                "truncated": False,
                "outbound_link_count": 0,
            }
        ),
        encoding="utf-8",
    )
    (tmp_path / "extracted.txt").write_text("full extracted text", encoding="utf-8")

    result = _load_preprocess(tmp_path / "preprocess.json")

    assert result.text == "full extracted text"
    assert result.tool_used == "trafilatura"


def test_merge_intake_metadata_preserves_unknown_existing_fields(tmp_path):
    intake_path = tmp_path / "intake.json"
    intake_path.write_text(
        json.dumps({"doc_id": "doc-1", "ingested_at": "already-recorded"}),
        encoding="utf-8",
    )
    intake = type(
        "Intake",
        (),
        {
            "doc_id": "doc-1",
            "source": "https://example.org",
            "source_type": "url",
            "declared_type": "url",
            "tier": 1,
            "batch_id": "batch-1",
            "language": "en",
            "archive_url": "",
            "wayback_status": "existing",
            "wayback_checked_at": "now",
            "wayback_error": "",
            "source_url": "https://example.org",
            "original_filename": "",
            "local_copy_path": "",
            "source_html_sha256": "",
        },
    )()
    preprocess = PreprocessResult(
        doc_id="doc-1",
        tool_used="trafilatura",
        quality="high",
        text="text",
        source_html_sha256="c" * 64,
    )

    _merge_intake_metadata(intake_path, intake, preprocess)

    data = json.loads(intake_path.read_text())
    assert data["ingested_at"] == "already-recorded"
    assert data["source_url"] == "https://example.org"
    assert data["source_html_sha256"] == "c" * 64
