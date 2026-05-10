from runner.pipeline.media_evidence import (
    comment_evidence_from_ytdlp,
    discovery_seed_queue_from_media,
    duplicate_candidates_from_media,
)


def test_comment_evidence_is_bounded_ranked_and_lower_trust():
    info = {
        "comments": [
            {"id": "1", "text": "Nice video", "like_count": 1},
            {"id": "2", "text": "Pinned testimony about healing", "is_pinned": True, "like_count": 5},
            {"id": "3", "text": "Conversion change discussion", "like_count": 20},
        ]
    }

    rows = comment_evidence_from_ytdlp(info, max_comments=2)

    assert len(rows) == 2
    assert rows[0]["commentId"] == "2"
    assert rows[0]["trustLevel"] == "lower_trust_platform_comment"
    assert rows[0]["reviewStatus"] == "needs_review"
    assert rows[0]["evidenceUse"] == "context_only_not_source_claim"
    assert rows[0]["llmAnalysisStatus"] == "not_requested"


def test_duplicate_candidates_from_description_platform_links():
    info = {
        "title": "Example Documentary",
        "duration": 120,
        "webpage_url": "https://www.youtube.com/watch?v=abc",
        "description": "Mirror: https://rumble.com/example-video and site https://example.org",
    }

    rows = duplicate_candidates_from_media(info, info["webpage_url"])

    assert len(rows) == 1
    assert rows[0]["platform"] == "rumble"
    assert rows[0]["reviewStatus"] == "needs_review"


def test_discovery_seed_queue_never_allows_autonomous_ingest():
    info = {
        "title": "Example Documentary",
        "uploader": "Example Channel",
        "webpage_url": "https://www.youtube.com/watch?v=abc",
        "tags": ["ex-gay", "testimony"],
        "description": "Description #conversion",
    }

    rows = discovery_seed_queue_from_media(info, info["webpage_url"])

    assert any(row["seedType"] == "exact_title" for row in rows)
    assert any(row["query"] == "#conversion" for row in rows)
    assert all(row["autonomousIngestAllowed"] is False for row in rows)


def test_discovery_seed_queue_uses_description_when_tags_are_empty():
    info = {
        "title": "How to respond to ex-gay claims",
        "uploader": "Example Channel",
        "webpage_url": "https://www.youtube.com/watch?v=abc",
        "tags": [],
        "description": (
            "What do you do when someone claims anyone can become straight if they want to be? "
            "Here's the truth about these ex-gay claims and conversion therapy."
        ),
    }

    rows = discovery_seed_queue_from_media(info, info["webpage_url"])

    assert any(row["seedType"] == "description_phrase" for row in rows)
    assert any(row["seedType"] == "sogice_term" and row["query"] == "ex-gay" for row in rows)
