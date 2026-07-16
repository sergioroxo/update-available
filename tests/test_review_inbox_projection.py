import json

from runner.pipeline.review_inbox_projection import (
    dossier_table_rows,
    filter_dossiers,
    resolve_proposal_editor_target,
)


def test_filters_keep_batch_and_archive_counts_distinct():
    dossier = {
        "dossier_fingerprint": "a" * 64,
        "family": "lexicon_proposals",
        "preferred_draft_label": "Reparative pathway",
        "batch_references": [{"doc_id": "d1"}],
        "archive_context_references": [{"doc_id": "d2"}, {"doc_id": "d3"}],
        "trust_state": "recurring_provisional",
        "conflict_detected": True,
        "located_evidence_count": 2,
        "review": {"human_decision_required": True, "review_lane": "sensitive_human_exception"},
        "signals": {"publication_blocked": True},
    }
    assert filter_dossiers([dossier], "Evidence conflicts") == [dossier]
    assert filter_dossiers([dossier], "Recurring provisional") == [dossier]
    assert filter_dossiers([dossier], "Human exceptions") == [dossier]
    assert filter_dossiers([dossier], "Publication blocked") == [dossier]
    row = dossier_table_rows([dossier])[0]
    assert row["Proposal records in batch"] == 1
    assert row["Proposal records across archive"] == 3


def test_decision_filter_is_bound_to_dossier_snapshot_fingerprint():
    dossier = {"dossier_fingerprint": "a" * 64, "cluster_id": "memory-a"}
    assert filter_dossiers([dossier], "Undecided locally") == [dossier]
    states = {"a" * 64: {"disposition": "accept"}}
    assert filter_dossiers([dossier], "Decided locally", decision_states=states) == [dossier]
    changed = {"dossier_fingerprint": "b" * 64}
    assert filter_dossiers([changed], "Undecided locally", decision_states=states) == [changed]
    assert filter_dossiers(
        [dossier], "Prior snapshot decisions", prior_clusters={"memory-a"},
    ) == [dossier]


def test_resolve_editor_uses_unique_proposal_id_not_stored_index(tmp_path):
    corpus = tmp_path / "corpus"
    doc = corpus / "doc-abc"
    doc.mkdir(parents=True)
    path = doc / "enrichment.json"
    path.write_text(json.dumps({
        "lexicon_proposals": [
            {"proposal_id": "p-other", "term": "Other"},
            {"proposal_id": "p-target", "term": "Target"},
        ]
    }), encoding="utf-8")

    target = resolve_proposal_editor_target(
        corpus, family="lexicon_proposals", doc_id="doc-abc", proposal_id="p-target",
    )
    assert target is not None
    assert target["queue"] == "Lexicon Queue"
    assert target["widget_value"].endswith("::doc-abc::1")


def test_resolve_editor_fails_closed_on_duplicate_or_analysis_only_id(tmp_path):
    corpus = tmp_path / "corpus"
    doc = corpus / "d1"
    doc.mkdir(parents=True)
    (doc / "enrichment.json").write_text(json.dumps({
        "lexicon_proposals": [
            {"proposal_id": "same"}, {"proposal_id": "same"},
        ]
    }), encoding="utf-8")
    assert resolve_proposal_editor_target(
        corpus, family="lexicon_proposals", doc_id="d1", proposal_id="same",
    ) is None
    assert resolve_proposal_editor_target(
        corpus, family="lexicon_proposals", doc_id="d1", proposal_id="analysis-candidate-x",
    ) is None


def test_resolve_editor_rejects_symlinked_document_directory(tmp_path):
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "enrichment.json").write_text(json.dumps({
        "lexicon_proposals": [{"proposal_id": "outside-id"}],
    }), encoding="utf-8")
    (corpus / "linked").symlink_to(outside, target_is_directory=True)
    assert resolve_proposal_editor_target(
        corpus, family="lexicon_proposals", doc_id="linked", proposal_id="outside-id",
    ) is None
