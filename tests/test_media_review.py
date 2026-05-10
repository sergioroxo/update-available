from dataclasses import dataclass
import json
import sys
import types

from runner.pipeline import media_review


@dataclass
class _Config:
    corpus_dir: object


def test_attach_srt_updates_versions_primary_text_and_report(tmp_path):
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "extracted.txt").write_text("old transcript", encoding="utf-8")
    srt = tmp_path / "manual.srt"
    srt.write_text(
        "1\n00:00:01,000 --> 00:00:02,000\nManual transcript\n",
        encoding="utf-8",
    )

    result = media_review.attach_srt_to_document(
        "doc-1",
        srt,
        _Config(corpus_dir=tmp_path),
        language="en",
    )

    assert result["label"] == "manual"
    assert result["makePrimary"] is True
    assert "Manual transcript" in (doc_dir / "extracted.txt").read_text()
    assert json.loads((doc_dir / "transcript_versions.json").read_text())[0]["source"] == "researcher_provided"
    assert json.loads((doc_dir / "media_metadata.json").read_text())["transcriptEvidence"][
        "primaryTranscriptSource"
    ] == "researcher_provided"

    report = media_review.media_extraction_report("doc-doc-1", _Config(corpus_dir=tmp_path))

    assert report["doc_id"] == "doc-1"
    assert report["transcriptVersionCount"] == 1
    assert report["primaryTranscriptChunkCount"] == 1
    assert "manual.json" in report["storedTranscriptFiles"]


def test_attach_srt_compare_only_preserves_primary_transcript(tmp_path):
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "extracted.txt").write_text("primary transcript", encoding="utf-8")
    (doc_dir / "transcript_chunks.json").write_text(
        json.dumps(
            [
                {
                    "index": 0,
                    "start": "00:00:01.000",
                    "end": "00:00:02.000",
                    "text": "primary transcript",
                }
            ]
        ),
        encoding="utf-8",
    )
    srt = tmp_path / "other.srt"
    srt.write_text("1\n00:00:01,000 --> 00:00:02,000\nOther transcript\n", encoding="utf-8")

    result = media_review.attach_srt_to_document(
        "doc-1",
        srt,
        _Config(corpus_dir=tmp_path),
        make_primary=False,
    )

    assert result["makePrimary"] is False
    assert (doc_dir / "extracted.txt").read_text() == "primary transcript"
    comparison = json.loads((doc_dir / "transcript_comparison.json").read_text())
    assert comparison["versionCount"] == 2
    assert comparison["comparisons"][0]["left"] == "current_primary"


def test_attach_srt_compare_only_can_be_rerun_without_duplicate_versions(tmp_path):
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "extracted.txt").write_text("primary transcript", encoding="utf-8")
    (doc_dir / "transcript_chunks.json").write_text(
        json.dumps(
            [
                {
                    "index": 0,
                    "start": "00:00:01.000",
                    "end": "00:00:02.000",
                    "text": "primary transcript",
                }
            ]
        ),
        encoding="utf-8",
    )
    (doc_dir / "media_metadata.json").write_text(
        json.dumps({"transcriptEvidence": {"selectedTranscriptLabel": "platform_en"}}),
        encoding="utf-8",
    )
    srt = tmp_path / "other.srt"
    srt.write_text("1\n00:00:01,000 --> 00:00:02,000\nOther transcript\n", encoding="utf-8")

    config = _Config(corpus_dir=tmp_path)
    media_review.attach_srt_to_document("doc-1", srt, config, make_primary=False)
    media_review.attach_srt_to_document("doc-1", srt, config, make_primary=False)

    versions = json.loads((doc_dir / "transcript_versions.json").read_text())

    assert [row["label"] for row in versions].count("other") == 1
    assert [row["label"] for row in versions].count("platform_en") == 1


def test_comment_queue_tracks_later_llm_analysis_status(tmp_path):
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "media_comments.json").write_text(
        json.dumps(
            {
                "comments": [
                    {
                        "commentId": "c1",
                        "text": "My story about testimony",
                        "reviewStatus": "needs_review",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    queue = media_review.load_or_build_comment_queue("doc-1", _Config(corpus_dir=tmp_path))

    assert queue["analysisStatus"] == "not_requested"
    assert queue["comments"][0]["llmAnalysisStatus"] == "not_requested"
    assert queue["comments"][0]["evidenceUse"] == "context_only_not_source_claim"
    assert queue["comments"][0]["riskFlags"] == ["possible_personal_testimony"]
    assert (doc_dir / "comment_evidence_queue.json").exists()


def test_collect_comments_for_document_after_ingest(monkeypatch, tmp_path):
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "intake.json").write_text(
        json.dumps(
            {
                "source": "https://www.youtube.com/watch?v=abc",
                "source_url": "https://www.youtube.com/watch?v=abc",
            }
        ),
        encoding="utf-8",
    )
    (doc_dir / "media_metadata.json").write_text(
        json.dumps({"platformAlgorithmicSignals": {}}),
        encoding="utf-8",
    )

    class FakeYoutubeDL:
        def __init__(self, opts):
            self.opts = opts

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def extract_info(self, source, download=False):
            return {
                "comment_count": 24000,
                "comments": [
                    {"id": "c1", "text": "Conversion therapy discussion", "like_count": 10},
                    {"id": "c2", "text": "Nice video", "like_count": 1},
                ],
            }

    monkeypatch.setitem(sys.modules, "yt_dlp", types.SimpleNamespace(YoutubeDL=FakeYoutubeDL))

    result = media_review.collect_comments_for_document("doc-1", _Config(corpus_dir=tmp_path), max_comments=1)

    assert result["platformCommentCount"] == 24000
    assert result["collectedCount"] == 1
    assert json.loads((doc_dir / "media_comments.json").read_text())["collectedCount"] == 1
    assert json.loads((doc_dir / "comment_evidence_queue.json").read_text())["commentCount"] == 1
    media_metadata = json.loads((doc_dir / "media_metadata.json").read_text())
    assert media_metadata["platformAlgorithmicSignals"]["commentCount"] == 24000
    assert media_metadata["platformAlgorithmicSignals"]["commentsCollectedCount"] == 1


def test_media_report_distinguishes_views_from_collected_comments(tmp_path):
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "media_metadata.json").write_text(
        json.dumps(
            {
                "contentFormat": "social_video",
                "mediaMode": "video",
                "platformDistribution": [{"platform": "youtube", "viewCount": 24432}],
            }
        ),
        encoding="utf-8",
    )

    report = media_review.media_extraction_report("doc-1", _Config(corpus_dir=tmp_path))

    assert report["platformViewCount"] == 24432
    assert report["commentEvidenceCount"] == 0
    assert report["commentsCollected"] is False


def test_repair_media_metadata_from_raw_promotes_table_fields(tmp_path):
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "media_metadata.json").write_text(
        json.dumps(
            {
                "general": {"creator": "Example Channel"},
                "platformAlgorithmicSignals": {},
                "rawYtDlpMetadata": {
                    "channel_url": "https://www.youtube.com/@example",
                    "uploader_id": "@example",
                    "like_count": 1200,
                    "comment_count": 345,
                    "availability": "public",
                },
            }
        ),
        encoding="utf-8",
    )

    result = media_review.repair_media_metadata_from_raw("doc-1", _Config(corpus_dir=tmp_path))

    assert result["changedCount"] == 6
    metadata = json.loads((doc_dir / "media_metadata.json").read_text())
    assert metadata["general"]["channelUrl"] == "https://www.youtube.com/@example"
    assert metadata["general"]["channelHandle"] == "@example"
    assert metadata["general"]["likeCount"] == 1200
    assert metadata["general"]["commentCount"] == 345
    assert metadata["general"]["availability"] == "public"
    assert metadata["platformAlgorithmicSignals"]["commentCount"] == 345


def test_recommended_profiles_for_media_and_legal_docs():
    video_profiles = media_review.recommended_profiles("Video", "Anti-SOGICE")
    legal_profiles = media_review.recommended_profiles("Legal-Policy", "Anti-SOGICE")

    assert [row["profile"] for row in video_profiles] == [
        "documentary_analysis",
        "shame_article",
    ]
    assert legal_profiles == []
