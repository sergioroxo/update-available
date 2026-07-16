import json
from pathlib import Path

import pytest

from runner.pipeline import provisional_memory
from runner.pipeline.source_identity import build_identity_snapshot
from runner.pipeline.source_identity_decisions import apply_identity_decisions, create_identity_decision


def _write(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _doc(corpus: Path, doc_id: str, host: str, score: float) -> Path:
    doc = corpus / doc_id
    quote = "The document uses the phrase reparative pathway directly."
    _write(doc / "intake.json", {"source": f"https://{host}/{doc_id}", "tier": 2})
    _write(doc / "preprocess.json", {"quality": "ok"})
    _write(doc / "analysis.json", {
        "type": "Pro-SOGICE", "format": "Article", "summary": "Summary",
        "term": ["Term: Reparative-Pathway"], "tactic": [], "actor": [],
        "confidence": {"overall_score": 0.81, "status": "high", "reasons": ["clear source"]},
        "field_confidence": {"term": 0.76},
    })
    _write(doc / "analysis_audit.json", {"model": "analysis-model", "prompt_version": "a-v1"})
    _write(doc / "enrichment.json", {
        "doc_id": doc_id, "enrichment_model": "enrich-model",
        "lexicon_proposals": [{
            "proposal_id": f"proposal-{doc_id}", "term": "Reparative Pathway",
            "exact_quote": quote, "model_confidence": score,
            "confidence_rationale": "Exact phrase is present.",
        }],
    })
    _write(doc / "enrichment_audit.json", {"prompt_version": "e-v1"})
    _write(doc / "citation_units.json", {
        "units": [{"unit_id": "p0001", "source_artifact": "extracted.txt",
                   "char_start": 0, "char_end": len(quote), "text": quote}],
    })
    return doc


def test_memory_preserves_confidence_evidence_provenance_and_source_independence(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1", "one.example", 0.72)
    _doc(corpus, "d2", "two.example", 0.88)

    result = provisional_memory.build_provisional_memory(
        corpus, tmp_path / "memory", recurrence_threshold=2,
    )

    memory = result["memory"]
    assert len(memory["records"]) == 2
    record = memory["records"][0]
    assert record["evidence"]["located"] is True
    assert record["model_confidence"]["proposal_score"] == 0.72
    assert record["model_confidence"]["analysis_overall_score"] == 0.81
    assert record["provenance"]["analysis_model"] == "analysis-model"
    cluster = memory["clusters"][0]
    assert cluster["trust_state"] == "recurring_provisional"
    assert cluster["source_family_count"] is None
    assert cluster["source_hostname_proxy_count"] == 2
    assert cluster["source_independence"]["independence_claim"] is False
    assert cluster["model_confidence_summary"]["mean"] == 0.8


def test_same_hostname_does_not_become_recurring_source_proxy(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1", "same.example", 0.7)
    _doc(corpus, "d2", "same.example", 0.9)
    memory = provisional_memory.build_provisional_memory(
        corpus, tmp_path / "memory", recurrence_threshold=2,
    )["memory"]
    cluster = memory["clusters"][0]
    assert cluster["document_count"] == 2
    assert cluster["source_family_count"] is None
    assert cluster["source_hostname_proxy_count"] == 1
    assert cluster["trust_state"] == "source_attested"


def test_only_complete_researcher_family_review_produces_family_count(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1", "one.example", 0.7)
    _doc(corpus, "d2", "two.example", 0.9)
    snapshot = build_identity_snapshot(corpus)
    first = create_identity_decision(
        snapshot, decision_type="family_assignment", subject={"doc_id": "d1"},
        outcome={"state": "assigned", "family_id": "family-one"}, researcher_id="researcher",
    )
    incomplete_decisions = [first]
    incomplete = apply_identity_decisions(snapshot, incomplete_decisions)
    memory = provisional_memory.build_provisional_memory(
        corpus, tmp_path / "incomplete", identity_projection=incomplete,
        identity_snapshot=snapshot, identity_decisions=incomplete_decisions,
    )["memory"]
    cluster = memory["clusters"][0]
    assert cluster["source_family_count"] is None
    assert cluster["source_independence"]["reviewed_document_coverage"] == 0.5

    second = create_identity_decision(
        snapshot, decision_type="family_assignment", subject={"doc_id": "d2"},
        outcome={"state": "assigned", "family_id": "family-one"}, researcher_id="researcher",
    )
    complete_decisions = [first, second]
    complete = apply_identity_decisions(snapshot, complete_decisions)
    memory = provisional_memory.build_provisional_memory(
        corpus, tmp_path / "complete", identity_projection=complete,
        identity_snapshot=snapshot, identity_decisions=complete_decisions,
    )["memory"]
    cluster = memory["clusters"][0]
    assert cluster["source_family_count"] == 1
    assert cluster["source_families"] == ["family-one"]
    assert cluster["source_independence"]["count_complete"] is True
    assert cluster["source_independence"]["independence_claim"] is False


def test_invalid_identity_projection_fails_closed_without_reviewed_count(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1", "one.example", 0.8)
    memory = provisional_memory.build_provisional_memory(
        corpus, tmp_path / "memory",
        identity_projection={
            "source_snapshot_fingerprint": "tampered",
            "decision_ledger_fingerprint": "b" * 64,
            "applied_decision_ids": ["decision-1"],
            "documents": [{
                "doc_id": "d1", "family_resolution_state": "researcher_confirmed",
                "confirmed_document_family_id": "family-one",
            }],
        },
    )["memory"]
    assert memory["source_identity_review"]["available"] is False
    assert memory["source_identity_review"]["reviewed_document_families"] == {}
    assert memory["clusters"][0]["source_family_count"] is None


def test_rehashed_forged_family_assignment_is_rejected_against_ledger(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1", "one.example", 0.8)
    snapshot = build_identity_snapshot(corpus)
    decision = create_identity_decision(
        snapshot, decision_type="family_assignment", subject={"doc_id": "d1"},
        outcome={"state": "assigned", "family_id": "real-family"}, researcher_id="researcher",
    )
    projection = apply_identity_decisions(snapshot, [decision])
    forged = json.loads(json.dumps(projection))
    forged["documents"][0]["confirmed_document_family_id"] = "forged-family"
    forged["documents"][0]["candidate_document_family_id"] = "forged-family"
    forged["projection_fingerprint"] = provisional_memory._hash({
        key: value for key, value in forged.items() if key != "projection_fingerprint"
    })
    memory = provisional_memory.build_provisional_memory(
        corpus, tmp_path / "memory", identity_projection=forged,
        identity_snapshot=snapshot, identity_decisions=[decision],
    )["memory"]
    assert memory["source_identity_review"]["available"] is False
    assert memory["clusters"][0]["source_family_count"] is None


def test_tag_projection_is_derived_and_sidecar_write_is_explicit(monkeypatch, tmp_path):
    corpus = tmp_path / "corpus"
    doc = _doc(corpus, "d1", "one.example", 0.8)
    analysis_before = (doc / "analysis.json").read_bytes()
    memory = provisional_memory.build_provisional_memory(
        corpus, tmp_path / "memory", recurrence_threshold=2,
    )["memory"]
    monkeypatch.setattr(provisional_memory, "_registry_index", lambda: {
        ("Term", "reparative pathway"): {
            "key": "Term:reparative-pathway", "tag": "Reparative Pathway",
        }
    })

    dry = provisional_memory.build_tag_projections(
        corpus, memory, tmp_path / "projection.json", doc_ids={"d1"},
    )
    assert not (doc / "tag_projection.json").exists()
    term_tag = next(
        tag for tag in dry["projection"]["projections"][0]["tags"]
        if tag["field"] == "term"
    )
    assert term_tag["model_confidence"] == 0.76

    provisional_memory.build_tag_projections(
        corpus, memory, tmp_path / "projection-written.json",
        doc_ids={"d1"}, write_doc_sidecars=True,
    )
    assert (doc / "tag_projection.json").is_file()
    assert (doc / "analysis.json").read_bytes() == analysis_before


def test_enrichment_context_uses_attested_memory_with_explicit_warning(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1", "one.example", 0.8)
    memory = provisional_memory.build_provisional_memory(
        corpus, tmp_path / "memory", recurrence_threshold=2,
    )["memory"]

    context = provisional_memory.enrichment_memory_context(
        memory,
        {"summary": "A discussion of reparative pathway practices.", "term": []},
    )

    assert context["selected_cluster_count"] == 1
    assert "retrieval hints only" in context["prompt_block"]
    assert "Do not treat recurrence or model confidence as verification" in context["prompt_block"]


def test_rejected_draft_stays_in_history_but_is_not_retrieved(tmp_path):
    corpus = tmp_path / "corpus"
    doc = _doc(corpus, "d1", "one.example", 0.8)
    enrichment = json.loads((doc / "enrichment.json").read_text())
    enrichment["lexicon_proposals"][0]["rejected"] = True
    _write(doc / "enrichment.json", enrichment)
    memory = provisional_memory.build_provisional_memory(
        corpus, tmp_path / "memory", recurrence_threshold=2,
    )["memory"]

    assert memory["records"][0]["trust_state"] == "rejected_match"
    assert memory["clusters"][0]["trust_state"] == "inactive_history"
    context = provisional_memory.enrichment_memory_context(
        memory, {"summary": "reparative pathway"},
    )
    assert context["selected_cluster_count"] == 0


def test_analysis_candidate_term_is_preserved_as_discovery_hint(tmp_path):
    corpus = tmp_path / "corpus"
    doc = _doc(corpus, "d1", "one.example", 0.8)
    analysis = json.loads((doc / "analysis.json").read_text())
    analysis["candidate_terms"] = [{
        "term": "Recovered Language", "context_quote": "The document uses the phrase reparative pathway directly.",
    }]
    _write(doc / "analysis.json", analysis)

    memory = provisional_memory.build_provisional_memory(
        corpus, tmp_path / "memory", recurrence_threshold=2,
    )["memory"]

    hint = next(
        record for record in memory["records"]
        if record["provenance"]["origin_stage"] == "analysis_candidate_terms"
    )
    assert hint["label"] == "Recovered Language"
    assert hint["model_confidence"]["proposal_score"] == 0.76
    assert hint["evidence"]["located"] is True


def test_focus_keeps_leading_doc_prefix_as_exact_document_identity(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "doc-abc", "one.example", 0.8)
    _doc(corpus, "abc", "two.example", 0.7)

    memory = provisional_memory.build_provisional_memory(
        corpus,
        tmp_path / "memory",
        focus_doc_ids={"doc-abc"},
        recurrence_threshold=2,
    )["memory"]

    assert memory["focus_doc_ids"] == ["doc-abc"]
    focused = {
        cluster["cluster_id"]
        for cluster in memory["clusters"]
        if "doc-abc" in cluster["document_ids"]
    }
    assert focused
    assert set(memory["focused_cluster_ids"]) == focused


def test_duplicate_model_proposal_ids_remain_distinct_draft_identities(tmp_path):
    corpus = tmp_path / "corpus"
    first = _doc(corpus, "d1", "one.example", 0.8)
    second = _doc(corpus, "d2", "two.example", 0.7)
    for doc in (first, second):
        enrichment = json.loads((doc / "enrichment.json").read_text(encoding="utf-8"))
        enrichment["lexicon_proposals"][0]["proposal_id"] = "model-reused-id"
        _write(doc / "enrichment.json", enrichment)

    memory = provisional_memory.build_provisional_memory(
        corpus, tmp_path / "memory", recurrence_threshold=2,
    )["memory"]
    records = [
        row for row in memory["records"]
        if row["provenance"]["proposal_id"] == "model-reused-id"
    ]
    assert len(records) == 2
    assert len({row["draft_id"] for row in records}) == 2


def test_memory_collection_skips_symlinked_document_directories(tmp_path):
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    outside = tmp_path / "outside"
    _doc(tmp_path, "outside", "outside.example", 0.9)
    (corpus / "linked").symlink_to(outside, target_is_directory=True)
    memory = provisional_memory.build_provisional_memory(
        corpus, tmp_path / "memory", recurrence_threshold=2,
    )["memory"]
    assert memory["records"] == []


def test_memory_collection_fails_closed_on_malformed_existing_json(tmp_path):
    corpus = tmp_path / "corpus"
    doc = _doc(corpus, "d1", "one.example", 0.8)
    (doc / "enrichment.json").write_text("{broken", encoding="utf-8")
    with pytest.raises(ValueError, match="malformed JSON"):
        provisional_memory.build_provisional_memory(
            corpus, tmp_path / "memory", recurrence_threshold=2,
        )
