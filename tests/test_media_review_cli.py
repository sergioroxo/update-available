from dataclasses import dataclass

from typer.testing import CliRunner

from runner import main


@dataclass
class _Config:
    corpus_dir: object = None


def test_media_report_cli_smoke(monkeypatch):
    runner = CliRunner()
    monkeypatch.setattr(main, "load_config", lambda **kwargs: _Config())
    monkeypatch.setattr(
        main.media_review,
        "media_extraction_report",
        lambda doc_id, config: {
            "doc_id": doc_id,
            "contentFormat": "social_video",
            "mediaMode": "video",
            "platforms": ["youtube"],
            "primaryTranscriptChunkCount": 2,
            "commentEvidenceCount": 1,
            "relatedCandidateCount": 3,
            "transcriptVersions": [],
            "transcriptComparison": {},
            "nextRecommendedActions": [],
        },
    )

    result = runner.invoke(main.app, ["media-report", "doc-1"])

    assert result.exit_code == 0
    assert "Media Extraction Report" in result.stdout


def test_attach_srt_cli_smoke(monkeypatch):
    runner = CliRunner()
    monkeypatch.setattr(main, "load_config", lambda **kwargs: _Config())
    monkeypatch.setattr(
        main.media_review,
        "attach_srt_to_document",
        lambda **kwargs: {
            "doc_id": kwargs["doc_id"],
            "label": "manual",
            "chunkCount": 1,
            "charCount": 17,
            "makePrimary": kwargs["make_primary"],
            "transcriptPath": "/tmp/manual.json",
        },
    )

    result = runner.invoke(main.app, ["attach-srt", "doc-1", "/tmp/manual.srt", "--language", "en"])

    assert result.exit_code == 0
    assert "Transcript attached" in result.stdout


def test_comment_evidence_queue_cli_smoke(monkeypatch):
    runner = CliRunner()
    monkeypatch.setattr(main, "load_config", lambda **kwargs: _Config())
    monkeypatch.setattr(
        main.media_review,
        "load_or_build_comment_queue",
        lambda doc_id, config, save=True: {
            "commentCount": 2,
            "reviewStatus": "needs_review",
            "analysisStatus": "not_requested",
        },
    )

    result = runner.invoke(main.app, ["comment-evidence-queue", "doc-1"])

    assert result.exit_code == 0
    assert "Comment Evidence Queue" in result.stdout


def test_collect_comments_cli_smoke(monkeypatch):
    runner = CliRunner()
    monkeypatch.setattr(main, "load_config", lambda **kwargs: _Config())
    monkeypatch.setattr(
        main.media_review,
        "collect_comments_for_document",
        lambda **kwargs: {
            "doc_id": kwargs["doc_id"],
            "platformCommentCount": 24000,
            "collectedCount": 10,
            "queue": {"analysisStatus": "not_requested"},
        },
    )

    result = runner.invoke(main.app, ["collect-comments", "doc-1", "--max-comments", "10"])

    assert result.exit_code == 0
    assert "Comments collected" in result.stdout
    assert "24000" in result.stdout


def test_repair_media_metadata_cli_smoke(monkeypatch):
    runner = CliRunner()
    monkeypatch.setattr(main, "load_config", lambda **kwargs: _Config())
    monkeypatch.setattr(
        main.media_review,
        "repair_media_metadata_from_raw",
        lambda **kwargs: {
            "doc_id": kwargs["doc_id"],
            "changed": {"general.channelUrl": "https://www.youtube.com/@example"},
            "changedCount": 1,
            "mediaMetadataPath": "/tmp/media_metadata.json",
            "sanityId": "",
        },
    )

    result = runner.invoke(main.app, ["repair-media-metadata", "doc-1"])

    assert result.exit_code == 0
    assert "Media metadata repaired" in result.stdout
    assert "general.channelUrl" in result.stdout
