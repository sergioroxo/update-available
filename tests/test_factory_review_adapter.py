from __future__ import annotations

import json
from pathlib import Path

import pytest

from runner.pipeline.factory_review_adapter import (
    preview_returned_proposals,
    route_returned_proposals,
)


def _review() -> dict:
    return {
        "campaign_state": "already_complete_read_only",
        "archive_sha256": "a" * 64,
        "execution": {"run_id": "semantic-source-run"},
        "enrichment": {
            "doc-a": {
                "document_id": "doc-a",
                "lexicon_proposals": [{"term": "Candidate term", "exact_quote": "Evidence"}],
                "entity_proposals": [{"name": "Example Org", "entity_type": "organization"}],
                "tactic_proposals": [],
                "practice_descriptions": [],
            },
        },
    }


def test_proposal_preview_is_read_only_and_requires_complete_verified_results(tmp_path):
    review = _review()
    candidates = preview_returned_proposals(review)
    assert len(candidates) == 2
    assert all(row["provisional"] and not row["automatic_promotion"] for row in candidates)
    assert not list(tmp_path.iterdir())
    review["campaign_state"] = "running"
    with pytest.raises(ValueError, match="verified and complete"):
        preview_returned_proposals(review)


def test_explicit_routing_uses_existing_enrichment_queues_and_deduplicates(tmp_path):
    doc = tmp_path / "doc-a"
    doc.mkdir()
    path = doc / "enrichment.json"
    path.write_text(json.dumps({
        "lexicon_proposals": [], "entity_proposals": [],
        "tactic_proposals": [], "practice_descriptions": [],
    }), encoding="utf-8")
    review = _review()
    ids = [row["proposal_id"] for row in preview_returned_proposals(review)]
    first = route_returned_proposals(
        corpus_root=tmp_path, review=review, accepted_proposal_ids=ids,
    )
    assert first["routed"] == tuple(ids)
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert len(payload["lexicon_proposals"]) == len(payload["entity_proposals"]) == 1
    assert all(
        row["proposal_status"] == "pending"
        and row["approved"] is row["pushed_to_sanity"] is False
        and row["automatic_promotion"] is False
        for family in ("lexicon_proposals", "entity_proposals")
        for row in payload[family]
    )
    before = path.read_bytes()
    second = route_returned_proposals(
        corpus_root=tmp_path, review=review, accepted_proposal_ids=ids,
    )
    assert second["routed"] == () and second["duplicates"] == tuple(ids)
    assert path.read_bytes() == before


def test_unknown_or_cross_document_target_fails_before_mutation(tmp_path):
    doc = tmp_path / "doc-a"
    doc.mkdir()
    path = doc / "enrichment.json"
    path.write_text("{}", encoding="utf-8")
    before = path.read_bytes()
    with pytest.raises(ValueError, match="absent"):
        route_returned_proposals(
            corpus_root=tmp_path, review=_review(), accepted_proposal_ids=("forged",),
        )
    assert path.read_bytes() == before
    review = _review()
    review["enrichment"]["../escape"] = review["enrichment"].pop("doc-a")
    review["enrichment"]["../escape"]["document_id"] = "../escape"
    proposal_id = preview_returned_proposals(review)[0]["proposal_id"]
    with pytest.raises(ValueError, match="target document"):
        route_returned_proposals(
            corpus_root=tmp_path, review=review,
            accepted_proposal_ids=(proposal_id,),
        )
    assert path.read_bytes() == before
