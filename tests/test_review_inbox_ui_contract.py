from runner.pipeline.review_decisions import (
    append_decision,
    derive_effective_state,
    open_decision_ledger,
    register_dossier,
)
from runner.pipeline.review_dossier import DOSSIER_SCHEMA_VERSION
from runner.pipeline.workflow_integrity import canonical_fingerprint
from runner.review_inbox_ui import _decision_dossier, _outcome_current


def _dossier(outcome: str = "a" * 64):
    cluster_id = "memory-one"
    stable = {
        "schema_version": DOSSIER_SCHEMA_VERSION,
        "dossier_id": "dossier-" + canonical_fingerprint([outcome, cluster_id])[:20],
        "workflow_batch_id": "workflow-test",
        "workflow_fingerprint": "c" * 64,
        "dispatch_fingerprint": "d" * 64,
        "cluster_id": cluster_id,
        "family": "lexicon_proposals",
        "outcome_content_fingerprint": outcome,
        "memory_fingerprint": "e" * 64,
        "label": "Reparative pathway",
        "normalised_label": "reparative pathway",
        "review_group_key": "",
        "trust_state": "raw_proposal",
        "conflict_detected": False,
        "conflict_signals": {},
        "review_lane": "not_in_review_plan",
        "human_decision_required": False,
        "selected_for_current_review": False,
        "batch_references": [],
        "archive_context_references": [],
        "batch_item_signals": [],
        "signals": {
            "specialist_attention": False,
            "publication_blocked": False,
            "evidence_conflict": False,
            "recurring_provisional": False,
            "human_exception": False,
        },
        "counts": {
            "all_records": 0,
            "batch_records": 0,
            "archive_context_records": 0,
            "all_documents": 0,
        },
    }
    return {**stable, "dossier_fingerprint": canonical_fingerprint(stable)}


def test_ui_dossier_fingerprint_is_the_ledger_snapshot_identity(tmp_path):
    dossier = _dossier()
    decision_snapshot = _decision_dossier(dossier)
    db = open_decision_ledger(tmp_path / "review.sqlite3")
    try:
        registered = register_dossier(db, decision_snapshot)
        assert registered["dossier_fingerprint"] == dossier["dossier_fingerprint"]
        append_decision(
            db,
            dossier_fingerprint=dossier["dossier_fingerprint"],
            action="accept",
            reviewer="Researcher",
            reason="Evidence checked for local research use.",
            payload={},
            idempotency_key="ui-integration-one",
            expected_head=None,
        )
        assert derive_effective_state(
            db, dossier["dossier_fingerprint"],
        )["disposition"]["action"] == "accept"
    finally:
        db.close()


def test_changed_outcome_produces_distinct_undecided_snapshot(tmp_path):
    old = _dossier("a" * 64)
    new = _dossier("b" * 64)
    assert old["dossier_fingerprint"] != new["dossier_fingerprint"]
    db = open_decision_ledger(tmp_path / "review.sqlite3")
    try:
        register_dossier(db, _decision_dossier(old))
        register_dossier(db, _decision_dossier(new))
        append_decision(
            db,
            dossier_fingerprint=old["dossier_fingerprint"],
            action="defer",
            reviewer="Researcher",
            reason="Awaiting another source.",
            payload={},
            idempotency_key="ui-integration-old",
            expected_head=None,
        )
        assert derive_effective_state(db, new["dossier_fingerprint"])["disposition"] is None
    finally:
        db.close()


def test_outcome_current_requires_compilation_complete_except_settled_holds():
    assert _outcome_current({"items": [
        {"base_route": "automatic", "stages": {"compilation": {"status": "complete"}}},
        {"base_route": "deferred", "stages": {"compilation": {"status": "missing"}}},
    ]}) is True
    assert _outcome_current({"items": [
        {"base_route": "automatic", "stages": {"compilation": {"status": "stale"}}},
    ]}) is False
