from dataclasses import dataclass
import json

from runner.pipeline import related_search
from runner.pipeline.related_search import SearchResult


@dataclass
class _Config:
    corpus_dir: object


def _write_seed_queue(doc_dir):
    doc_dir.mkdir()
    (doc_dir / "discovery_seed_queue.json").write_text(
        json.dumps(
            [
                {
                    "query": '"Example Documentary"',
                    "seedType": "exact_title",
                    "reason": "Exact title search.",
                    "sourceUrl": "https://www.youtube.com/watch?v=abc",
                    "sourceTitle": "Example Documentary",
                    "reviewStatus": "needs_review",
                    "autonomousIngestAllowed": False,
                },
                {
                    "query": "ex-gay",
                    "seedType": "platform_tag",
                    "reason": "Tag.",
                    "sourceUrl": "https://www.youtube.com/watch?v=abc",
                    "sourceTitle": "Example Documentary",
                    "reviewStatus": "rejected",
                    "autonomousIngestAllowed": False,
                },
            ]
        ),
        encoding="utf-8",
    )


def test_related_source_search_dry_run_does_not_write(tmp_path, monkeypatch):
    doc_dir = tmp_path / "doc-1"
    _write_seed_queue(doc_dir)
    monkeypatch.setattr(related_search, "search", lambda *args, **kwargs: [])

    payload = related_search.run_related_source_search(
        "doc-1",
        _Config(corpus_dir=tmp_path),
        dry_run=True,
    )

    assert payload["dryRun"] is True
    assert len(payload["seedsUsed"]) == 1
    assert not (doc_dir / "candidate_sources.json").exists()


def test_related_source_search_writes_review_only_candidates(tmp_path, monkeypatch):
    doc_dir = tmp_path / "doc-1"
    _write_seed_queue(doc_dir)
    monkeypatch.setattr(
        related_search,
        "search",
        lambda *args, **kwargs: [
            SearchResult(
                title="Example Documentary mirror",
                url="https://rumble.com/example?utm_source=x",
                snippet="Mirror copy",
            ),
            SearchResult(
                title="Duplicate",
                url="https://rumble.com/example?utm_source=y",
                snippet="Duplicate URL after normalisation",
            ),
        ],
    )
    monkeypatch.setattr(related_search, "find_existing_by_source", lambda source, config: [])

    payload = related_search.run_related_source_search(
        "doc-1",
        _Config(corpus_dir=tmp_path),
    )

    assert payload["candidateCount"] == 1
    candidate = payload["candidates"][0]
    assert candidate["url"] == "https://rumble.com/example"
    assert candidate["candidateCategory"] == "possible_mirror_or_reupload"
    assert candidate["reviewStatus"] == "needs_review"
    assert candidate["autonomousIngestAllowed"] is False
    assert json.loads((doc_dir / "candidate_sources.json").read_text())["candidateCount"] == 1


def test_related_source_search_marks_existing_corpus_matches(tmp_path, monkeypatch):
    doc_dir = tmp_path / "doc-1"
    _write_seed_queue(doc_dir)
    monkeypatch.setattr(
        related_search,
        "search",
        lambda *args, **kwargs: [
            SearchResult(title="Existing", url="https://www.youtube.com/watch?v=abc"),
        ],
    )
    monkeypatch.setattr(
        related_search,
        "find_existing_by_source",
        lambda source, config: [{"doc_id": "doc-existing"}],
    )

    payload = related_search.run_related_source_search("doc-1", _Config(corpus_dir=tmp_path))

    assert payload["candidates"][0]["alreadyInCorpus"] is True
    assert payload["candidates"][0]["existingDocIds"] == ["doc-existing"]


def test_related_source_search_records_query_errors_and_continues(tmp_path, monkeypatch):
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "discovery_seed_queue.json").write_text(
        json.dumps(
            [
                {"query": "bad", "seedType": "platform_tag"},
                {"query": "good", "seedType": "platform_tag"},
            ]
        ),
        encoding="utf-8",
    )

    def fake_search(query, *args, **kwargs):
        if query == "bad":
            raise RuntimeError("network hiccup")
        return [SearchResult(title="Good result", url="https://rumble.com/good")]

    monkeypatch.setattr(related_search, "search", fake_search)
    monkeypatch.setattr(related_search, "find_existing_by_source", lambda source, config: [])

    payload = related_search.run_related_source_search("doc-1", _Config(corpus_dir=tmp_path))

    assert payload["errorCount"] == 1
    assert payload["errors"][0]["query"] == "bad"
    assert payload["candidateCount"] == 1
