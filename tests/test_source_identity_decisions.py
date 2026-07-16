from __future__ import annotations

import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import pytest

from runner.pipeline.source_identity import build_identity_snapshot
from runner.pipeline.source_identity_decisions import (
    apply_identity_decisions,
    append_identity_decision,
    candidate_fingerprint,
    create_identity_decision,
    load_identity_decisions,
    load_current_reviewed_identity_projection,
    validate_identity_decision,
    validate_reviewed_identity_projection,
    write_identity_decision,
    write_reviewed_identity_projection,
)


def _write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _doc(corpus: Path, doc_id: str, *, doi: str = "", sha: str = "") -> None:
    root = corpus / doc_id
    root.mkdir(parents=True)
    _write(root / "intake.json", {"doc_id": doc_id, "source_type": "file", "source": f"/{doc_id}.pdf"})
    _write(root / "preprocess.json", {"title": f"Title {doc_id}", "author": "Author"})
    _write(root / "bibliographic.json", {"identifiers": {"doi": doi}})
    if sha:
        _write(root / "longform_source.json", {"source_artifacts": [{"role": "source", "sha256": sha}]})


def test_field_decision_selects_only_observed_candidate(tmp_path):
    _doc(tmp_path, "a")
    snapshot = build_identity_snapshot(tmp_path)
    candidate = snapshot["documents"][0]["fields"]["title"]["candidates"][0]
    decision = create_identity_decision(
        snapshot, decision_type="field_resolution",
        subject={"doc_id": "a", "field_name": "title"},
        outcome={"state": "selected_candidate", "candidate_fingerprint": candidate_fingerprint(candidate)},
        researcher_id="researcher-1", rationale="Reviewed the sidecars.",
        decided_at="2026-07-15T12:00:00+00:00",
    )
    projection = apply_identity_decisions(snapshot, [decision])
    field = projection["documents"][0]["fields"]["title"]
    assert field["effective_value"] == candidate["value"]
    assert field["researcher_resolution"]["decision_id"] == decision["decision_id"]
    assert projection["automatic_merges"] is False


def test_field_decision_rejects_invented_candidate(tmp_path):
    _doc(tmp_path, "a")
    snapshot = build_identity_snapshot(tmp_path)
    with pytest.raises(ValueError, match="not present"):
        create_identity_decision(
            snapshot, decision_type="field_resolution",
            subject={"doc_id": "a", "field_name": "title"},
            outcome={"state": "selected_candidate", "candidate_fingerprint": "f" * 64},
            researcher_id="r",
        )


def test_explicit_family_assignment_changes_counts_without_merging(tmp_path):
    _doc(tmp_path, "a")
    _doc(tmp_path, "b")
    snapshot = build_identity_snapshot(tmp_path)
    decisions = [
        create_identity_decision(
            snapshot, decision_type="family_assignment", subject={"doc_id": doc_id},
            outcome={"state": "assigned", "family_id": "family-one"}, researcher_id="r",
            decided_at=f"2026-07-15T12:00:0{index}+00:00",
        )
        for index, doc_id in enumerate(("a", "b"))
    ]
    projection = apply_identity_decisions(snapshot, decisions)
    assert {row["confirmed_document_family_id"] for row in projection["documents"]} == {"family-one"}
    assert projection["count_summary"]["source_family_count"] == 1
    assert projection["count_summary"]["reviewed_family_coverage"] == 1.0
    assert projection["automatic_merges"] is False


def test_relationship_acceptance_never_assigns_family_or_affects_counts(tmp_path):
    digest = "a" * 64
    _doc(tmp_path, "a", sha=digest)
    _doc(tmp_path, "b", sha=digest)
    snapshot = build_identity_snapshot(tmp_path)
    suggestion = snapshot["relationship_suggestions"][0]
    decision = create_identity_decision(
        snapshot, decision_type="relationship_review",
        subject={"suggestion_id": suggestion["suggestion_id"]}, outcome={"status": "accepted"},
        researcher_id="r", decided_at="2026-07-15T12:00:00+00:00",
    )
    projection = apply_identity_decisions(snapshot, [decision])
    assert projection["relationships"][0]["status"] == "accepted"
    assert projection["relationships"][0]["affects_family_counts"] is False
    assert projection["count_summary"]["source_family_count"] is None
    assert all(not row.get("confirmed_document_family_id") for row in projection["documents"])


def test_later_decision_must_explicitly_supersede_active_record(tmp_path):
    _doc(tmp_path, "a")
    snapshot = build_identity_snapshot(tmp_path)
    first = create_identity_decision(
        snapshot, decision_type="family_assignment", subject={"doc_id": "a"},
        outcome={"state": "assigned", "family_id": "family-one"}, researcher_id="r",
        decided_at="2026-07-15T12:00:00+00:00",
    )
    unsafe_second = create_identity_decision(
        snapshot, decision_type="family_assignment", subject={"doc_id": "a"},
        outcome={"state": "assigned", "family_id": "family-two"}, researcher_id="r",
        decided_at="2026-07-15T12:01:00+00:00",
    )
    with pytest.raises(ValueError, match="supersession root"):
        apply_identity_decisions(snapshot, [first, unsafe_second])
    safe_second = create_identity_decision(
        snapshot, decision_type="family_assignment", subject={"doc_id": "a"},
        outcome={"state": "assigned", "family_id": "family-two"}, researcher_id="r",
        supersedes_decision_id=first["decision_id"], decided_at="2026-07-15T12:01:00+00:00",
    )
    projection = apply_identity_decisions(snapshot, [first, safe_second])
    assert projection["documents"][0]["confirmed_document_family_id"] == "family-two"
    assert projection["applied_decision_ids"] == [safe_second["decision_id"]]


def test_decision_is_content_addressed_append_only_and_loadable(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "a")
    snapshot = build_identity_snapshot(corpus)
    decision = create_identity_decision(
        snapshot, decision_type="family_assignment", subject={"doc_id": "a"},
        outcome={"state": "deferred"}, researcher_id="r",
        decided_at="2026-07-15T12:00:00+00:00",
    )
    path = write_identity_decision(decision, tmp_path / "exports")
    assert decision["decision_fingerprint"] in path.name
    assert load_identity_decisions(tmp_path / "exports") == [decision]
    tampered = dict(decision)
    tampered["researcher_id"] = "somebody-else"
    with pytest.raises(ValueError, match="fingerprint"):
        validate_identity_decision(tampered)


def test_decision_bound_to_old_snapshot_fails_closed(tmp_path):
    _doc(tmp_path, "a")
    old_snapshot = build_identity_snapshot(tmp_path)
    decision = create_identity_decision(
        old_snapshot, decision_type="family_assignment", subject={"doc_id": "a"},
        outcome={"state": "deferred"}, researcher_id="r",
        decided_at="2026-07-15T12:00:00+00:00",
    )
    prep = json.loads((tmp_path / "a" / "preprocess.json").read_text())
    prep["title"] = "Changed title"
    _write(tmp_path / "a" / "preprocess.json", prep)
    new_snapshot = build_identity_snapshot(tmp_path)
    with pytest.raises(ValueError, match="stale"):
        apply_identity_decisions(new_snapshot, [decision])


def test_decision_survives_unrelated_corpus_growth(tmp_path):
    _doc(tmp_path, "a")
    old_snapshot = build_identity_snapshot(tmp_path)
    decision = create_identity_decision(
        old_snapshot, decision_type="family_assignment", subject={"doc_id": "a"},
        outcome={"state": "assigned", "family_id": "family-a"}, researcher_id="r",
        decided_at="2026-07-15T12:00:00+00:00",
    )
    _doc(tmp_path, "unrelated")
    current = build_identity_snapshot(tmp_path)
    projection = apply_identity_decisions(current, [decision])
    assert next(row for row in projection["documents"] if row["doc_id"] == "a")["confirmed_document_family_id"] == "family-a"
    assert decision["source_snapshot_fingerprint"] != current["snapshot_fingerprint"]


def test_manual_correction_requires_and_preserves_provenance(tmp_path):
    _doc(tmp_path, "a")
    snapshot = build_identity_snapshot(tmp_path)
    with pytest.raises(ValueError, match="provenance"):
        create_identity_decision(
            snapshot, decision_type="field_resolution", subject={"doc_id": "a", "field_name": "title"},
            outcome={"state": "manual_correction", "value": "Correct title", "provenance": ""},
            researcher_id="r", rationale="Checked title page.",
        )
    decision = create_identity_decision(
        snapshot, decision_type="field_resolution", subject={"doc_id": "a", "field_name": "title"},
        outcome={"state": "manual_correction", "value": "Correct title", "provenance": "PDF title page"},
        researcher_id="r", rationale="Checked title page.", decided_at="2026-07-15T12:00:00+00:00",
    )
    field = apply_identity_decisions(snapshot, [decision])["documents"][0]["fields"]["title"]
    assert field["effective_value"] == "Correct title"
    assert field["researcher_resolution"]["provenance"] == "PDF title page"


def test_backdated_superseding_decision_uses_chain_not_clock_order(tmp_path):
    _doc(tmp_path, "a")
    snapshot = build_identity_snapshot(tmp_path)
    first = create_identity_decision(
        snapshot, decision_type="family_assignment", subject={"doc_id": "a"},
        outcome={"state": "assigned", "family_id": "old"}, researcher_id="r",
        decided_at="2026-07-15T13:00:00+00:00",
    )
    correction = create_identity_decision(
        snapshot, decision_type="family_assignment", subject={"doc_id": "a"},
        outcome={"state": "assigned", "family_id": "corrected"}, researcher_id="r",
        supersedes_decision_id=first["decision_id"], decided_at="2026-07-15T12:00:00+00:00",
    )
    assert apply_identity_decisions(snapshot, [correction, first])["documents"][0]["confirmed_document_family_id"] == "corrected"


def test_partial_scope_never_emits_definitive_corpus_family_count(tmp_path):
    _doc(tmp_path, "a")
    _doc(tmp_path, "b")
    snapshot = build_identity_snapshot(tmp_path, doc_ids=["a"])
    decision = create_identity_decision(
        snapshot, decision_type="family_assignment", subject={"doc_id": "a"},
        outcome={"state": "assigned", "family_id": "only-reviewed"}, researcher_id="r",
    )
    counts = apply_identity_decisions(snapshot, [decision])["count_summary"]
    assert counts["source_family_count"] is None
    assert "Partial" in counts["source_family_count_reason"]


def test_reviewed_projection_is_replay_validated_and_discoverable(tmp_path):
    corpus, exports = tmp_path / "corpus", tmp_path / "exports"
    _doc(corpus, "a")
    snapshot = build_identity_snapshot(corpus)
    decision = create_identity_decision(
        snapshot, decision_type="family_assignment", subject={"doc_id": "a"},
        outcome={"state": "assigned", "family_id": "family-a"}, researcher_id="r",
        decided_at="2026-07-15T12:00:00+00:00",
    )
    write_identity_decision(decision, exports)
    projection = apply_identity_decisions(snapshot, [decision])
    path = write_reviewed_identity_projection(projection, exports, snapshot, [decision])
    assert projection["projection_fingerprint"] in path.name
    assert load_current_reviewed_identity_projection(exports) == projection
    forged = json.loads(json.dumps(projection))
    forged["documents"][0]["confirmed_document_family_id"] = "forged"
    from runner.pipeline.workflow_integrity import canonical_fingerprint
    forged["projection_fingerprint"] = canonical_fingerprint({key: value for key, value in forged.items() if key != "projection_fingerprint"})
    with pytest.raises(ValueError, match="not reproducible"):
        validate_reviewed_identity_projection(forged, snapshot, [decision])


def test_unsafe_family_id_and_symlink_output_fail_closed(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "a")
    snapshot = build_identity_snapshot(corpus)
    with pytest.raises(ValueError, match="identifier"):
        create_identity_decision(
            snapshot, decision_type="family_assignment", subject={"doc_id": "a"},
            outcome={"state": "assigned", "family_id": "../unsafe"}, researcher_id="r",
        )
    decision = create_identity_decision(
        snapshot, decision_type="family_assignment", subject={"doc_id": "a"},
        outcome={"state": "deferred"}, researcher_id="r",
    )
    actual = tmp_path / "actual"
    actual.mkdir()
    exports = tmp_path / "exports"
    exports.symlink_to(actual, target_is_directory=True)
    with pytest.raises(ValueError, match="symlink"):
        write_identity_decision(decision, exports)


def test_compare_and_append_prevents_concurrent_supersession_branch(tmp_path):
    corpus, exports = tmp_path / "corpus", tmp_path / "exports"
    _doc(corpus, "a")
    snapshot = build_identity_snapshot(corpus)
    first = create_identity_decision(
        snapshot, decision_type="family_assignment", subject={"doc_id": "a"},
        outcome={"state": "assigned", "family_id": "first"}, researcher_id="r",
        decided_at="2026-07-15T12:00:00+00:00",
    )
    append_identity_decision(first, exports)
    contenders = [create_identity_decision(
        snapshot, decision_type="family_assignment", subject={"doc_id": "a"},
        outcome={"state": "assigned", "family_id": family_id}, researcher_id="r",
        supersedes_decision_id=first["decision_id"], decided_at=f"2026-07-15T12:0{index}:00+00:00",
    ) for index, family_id in enumerate(("second-a", "second-b"), start=1)]

    def attempt(record):
        try:
            append_identity_decision(record, exports)
        except ValueError as exc:
            return str(exc)
        return "saved"

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, contenders))
    assert results.count("saved") == 1
    assert sum("refresh" in result for result in results) == 1
    ledger = load_identity_decisions(exports)
    apply_identity_decisions(snapshot, ledger)  # remains a single valid chain
