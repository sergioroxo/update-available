import json
import sys
import types

from runner.models.document import PreprocessResult
from runner.pipeline.preprocess import (
    _audio_source_for_whisper,
    _media_metadata_from_ytdlp,
    _preprocess_srt,
    _preprocess_video,
    _save_artifacts,
)
from runner.pipeline.transcripts import (
    compare_transcript_versions,
    deoverlap_caption_chunks,
    parse_timed_text,
    transcript_version,
)
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
    assert metadata["citation_units_path"] == "citation_units.json"
    assert (tmp_path / "extracted.txt").read_text() == "full extracted text"
    assert (tmp_path / "extracted.md").read_text() == "# Full extracted text"
    citation_units = json.loads((tmp_path / "citation_units.json").read_text())
    assert citation_units["doc_id"] == "doc-1"
    assert citation_units["unit_count"] == 1
    assert citation_units["units"][0]["char_start"] == 0


def test_save_artifacts_writes_media_and_transcript_sidecars(tmp_path):
    result = PreprocessResult(
        doc_id="doc-1",
        tool_used="srt",
        quality="high",
        text="[00:00:01.000 --> 00:00:02.000] Hello",
        media_metadata={"mediaMode": "video", "rawYtDlpMetadata": {"id": "abc"}},
        transcript_chunks=[
            {
                "index": 0,
                "start": "00:00:01.000",
                "end": "00:00:02.000",
                "text": "Hello",
                "sourceFormat": "srt",
            }
        ],
        transcript_versions=[
            {
                "label": "manual",
                "language": "en",
                "source": "researcher_provided",
                "kind": "uploaded_srt",
                "chunkCount": 1,
                "charCount": 5,
                "textHash": "a" * 64,
            }
        ],
        transcript_comparison={"versionCount": 1, "comparisons": []},
        media_comments=[
            {
                "index": 0,
                "commentId": "c1",
                "text": "Conversion discussion",
                "trustLevel": "lower_trust_platform_comment",
                "reviewStatus": "needs_review",
            }
        ],
        duplicate_candidates=[
            {
                "url": "https://rumble.com/example",
                "platform": "rumble",
                "reviewStatus": "needs_review",
            }
        ],
        discovery_seed_queue=[
            {
                "query": '"Example"',
                "reviewStatus": "needs_review",
                "autonomousIngestAllowed": False,
            }
        ],
    )

    _save_artifacts(result, tmp_path)

    metadata = json.loads((tmp_path / "preprocess.json").read_text())
    assert metadata["media_metadata_path"] == "media_metadata.json"
    assert metadata["transcript_chunk_count"] == 1
    assert json.loads((tmp_path / "media_metadata.json").read_text())["rawYtDlpMetadata"]["id"] == "abc"
    assert json.loads((tmp_path / "video_metadata.json").read_text())["id"] == "abc"
    assert json.loads((tmp_path / "transcript_chunks.json").read_text())[0]["text"] == "Hello"
    assert json.loads((tmp_path / "media_comments.json").read_text())["comments"][0]["commentId"] == "c1"
    assert json.loads((tmp_path / "duplicate_candidates.json").read_text())[0]["platform"] == "rumble"
    assert json.loads((tmp_path / "discovery_seed_queue.json").read_text())[0]["autonomousIngestAllowed"] is False


def test_preprocess_srt_preserves_timestamps_as_chunks(tmp_path):
    srt = tmp_path / "sample.srt"
    srt.write_text(
        "1\n00:00:01,000 --> 00:00:02,500\nHello <i>there</i>\n\n"
        "2\n00:00:03,000 --> 00:00:04,000\nSecond cue\n",
        encoding="utf-8",
    )

    result = _preprocess_srt(srt)

    assert result.tool_used == "srt"
    assert result.transcript_chunks[0]["start"] == "00:00:01.000"
    assert result.transcript_chunks[0]["text"] == "Hello there"
    assert "[00:00:03.000 --> 00:00:04.000] Second cue" in result.text
    assert result.transcript_versions[0]["kind"] == "uploaded_srt"


def test_deoverlap_caption_chunks_removes_youtube_rolling_window():
    chunks = [
        {
            "index": 0,
            "start": "00:00:02.560",
            "end": "00:00:02.570",
            "text": "I'm Dr. Jennifer Roback Morse I'm",
        },
        {
            "index": 1,
            "start": "00:00:02.570",
            "end": "00:00:04.420",
            "text": "I'm Dr. Jennifer Roback Morse I'm founder and president of the Ruth",
        },
        {
            "index": 2,
            "start": "00:00:04.420",
            "end": "00:00:04.430",
            "text": "founder and president of the Ruth",
        },
        {
            "index": 3,
            "start": "00:00:04.430",
            "end": "00:00:06.519",
            "text": "founder and president of the Ruth Institute the mission of the Ruth",
        },
    ]

    cleaned = deoverlap_caption_chunks(chunks)

    assert [chunk["text"] for chunk in cleaned] == [
        "I'm Dr. Jennifer Roback Morse I'm",
        "founder and president of the Ruth",
        "Institute the mission of the Ruth",
    ]
    assert cleaned[1]["overlapTrimmed"] is True
    assert cleaned[2]["index"] == 2


def test_deoverlap_caption_chunks_leaves_non_overlapping_cues_alone():
    chunks = [
        {"index": 0, "start": "00:00:01.000", "end": "00:00:02.000", "text": "First sentence"},
        {"index": 1, "start": "00:00:03.000", "end": "00:00:04.000", "text": "Second sentence"},
    ]

    assert deoverlap_caption_chunks(chunks) == chunks


def test_audio_source_for_whisper_downloads_url_audio(monkeypatch, tmp_path):
    class FakeYoutubeDL:
        def __init__(self, opts):
            self.opts = opts

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def extract_info(self, source, download=True):
            audio_path = tmp_path / "abc.m4a"
            audio_path.write_text("audio", encoding="utf-8")
            return {
                "id": "abc",
                "title": "Captionless video",
                "requested_downloads": [{"filepath": str(audio_path)}],
            }

    monkeypatch.setitem(sys.modules, "yt_dlp", types.SimpleNamespace(YoutubeDL=FakeYoutubeDL))

    audio_source, info = _audio_source_for_whisper("https://youtu.be/abc", tmp_path)

    assert audio_source == str(tmp_path / "abc.m4a")
    assert info["title"] == "Captionless video"


def test_preprocess_video_can_require_researcher_transcript_before_whisper(monkeypatch):
    class FakeYoutubeDL:
        def __init__(self, opts):
            self.opts = opts

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def extract_info(self, source, download=True):
            return {"id": "abc", "title": "Captionless video"}

    config = types.SimpleNamespace(media_allow_whisper=False, media_collect_comments=False)
    monkeypatch.setitem(sys.modules, "yt_dlp", types.SimpleNamespace(YoutubeDL=FakeYoutubeDL))

    try:
        _preprocess_video("https://youtu.be/abc", config=config)
    except RuntimeError as exc:
        assert "Upload an SRT/VTT transcript" in str(exc)
    else:
        raise AssertionError("Expected transcript checkpoint RuntimeError")


def test_media_metadata_maps_table_ready_youtube_fields():
    metadata = _media_metadata_from_ytdlp(
        {
            "title": "Example video",
            "uploader": "Example Channel",
            "uploader_id": "@example",
            "channel_url": "https://www.youtube.com/@example",
            "upload_date": "20210308",
            "duration": 120,
            "view_count": 24432,
            "like_count": 1200,
            "comment_count": 345,
            "availability": "public",
            "webpage_url": "https://www.youtube.com/watch?v=abc",
        },
        "https://www.youtube.com/watch?v=abc",
    )

    general = metadata["general"]
    assert general["channelUrl"] == "https://www.youtube.com/@example"
    assert general["channelHandle"] == "@example"
    assert general["likeCount"] == 1200
    assert general["commentCount"] == 345
    assert general["availability"] == "public"


def test_transcript_comparison_reports_similarity_and_deltas():
    left_chunks = parse_timed_text("1\n00:00:01,000 --> 00:00:02,000\nhello world\n")
    right_chunks = parse_timed_text("1\n00:00:01,000 --> 00:00:02,000\nhello worlds\n")
    versions = [
        transcript_version("left", left_chunks),
        transcript_version("right", right_chunks),
    ]

    comparison = compare_transcript_versions(
        versions,
        {"left": "hello world", "right": "hello worlds"},
    )

    assert comparison["versionCount"] == 2
    assert comparison["comparisons"][0]["similarity"] > 0.9
    assert comparison["comparisons"][0]["sameHash"] is False


def test_load_preprocess_rehydrates_text_from_extracted_txt(tmp_path):
    preprocess_path = tmp_path / "preprocess.json"
    preprocess_path.write_text(
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
    before = preprocess_path.read_text(encoding="utf-8")

    result = _load_preprocess(preprocess_path)

    assert result.text == "full extracted text"
    assert result.tool_used == "trafilatura"
    assert preprocess_path.read_text(encoding="utf-8") == before


def test_load_preprocess_ignores_app_manual_overrides(tmp_path):
    preprocess_path = tmp_path / "preprocess.json"
    preprocess_path.write_text(
        json.dumps(
            {
                "doc_id": "doc-1",
                "tool_used": "trafilatura",
                "quality": "high",
                "char_count": 19,
                "truncated": False,
                "_manual_overrides": {"title": "researcher_confirmed"},
            }
        ),
        encoding="utf-8",
    )
    (tmp_path / "extracted.txt").write_text("full extracted text", encoding="utf-8")

    result = _load_preprocess(preprocess_path)

    assert result.text == "full extracted text"
    assert result.doc_id == "doc-1"


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
