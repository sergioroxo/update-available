import sqlite3
import stat
from pathlib import Path

import pytest

from runner.pipeline.review_decisions import (
    append_decision,
    derive_effective_state,
    open_decision_ledger,
    read_cluster_history,
    register_dossier,
    validate_ledger_integrity,
)
from runner.pipeline.review_dossier import DOSSIER_SCHEMA_VERSION
from runner.pipeline.workflow_integrity import canonical_fingerprint


OUTCOME = "a" * 64


def _dossier(label: str, *, outcome: str = OUTCOME, family: str = "tag") -> dict:
    return {
        "schema_version": DOSSIER_SCHEMA_VERSION,
        "dossier_id": "dossier-" + canonical_fingerprint([
            outcome, "cluster-religious-practice",
        ])[:20],
        "workflow_batch_id": "workflow-test",
        "workflow_fingerprint": "c" * 64,
        "dispatch_fingerprint": "d" * 64,
        "cluster_id": "cluster-religious-practice",
        "outcome_content_fingerprint": outcome,
        "memory_fingerprint": "e" * 64,
        "family": family,
        "label": label,
        "normalised_label": label.casefold(),
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


@pytest.fixture
def ledger(tmp_path: Path):
    db = open_decision_ledger(tmp_path / "review" / "decisions.sqlite3")
    try:
        yield db
    finally:
        db.close()


def _register(db: sqlite3.Connection, label: str, **kwargs) -> str:
    return register_dossier(db, _dossier(label, **kwargs))["dossier_fingerprint"]


def _append(db, fingerprint, action, payload=None, *, key="decision-1", head=None):
    return append_decision(
        db,
        dossier_fingerprint=fingerprint,
        action=action,
        reviewer="researcher-1",
        reason="Evidence reviewed in the source context.",
        payload=payload,
        idempotency_key=key,
        expected_head=head,
    )


def test_initializes_hardened_schema_and_readonly_reopen(tmp_path: Path):
    path = tmp_path / "decisions.sqlite3"
    db = open_decision_ledger(path)
    assert db.execute("PRAGMA foreign_keys").fetchone()[0] == 1
    assert db.execute("PRAGMA journal_mode").fetchone()[0].lower() == "wal"
    assert db.execute("PRAGMA synchronous").fetchone()[0] == 2
    assert db.execute("PRAGMA busy_timeout").fetchone()[0] == 30_000
    assert db.execute("PRAGMA recursive_triggers").fetchone()[0] == 1
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    assert validate_ledger_integrity(db) == {"dossiers": 0, "events": 0}
    db.close()

    readonly = open_decision_ledger(path, create=False)
    assert readonly.execute("PRAGMA query_only").fetchone()[0] == 1
    with pytest.raises(sqlite3.OperationalError, match="readonly"):
        readonly.execute("INSERT INTO ledger_metadata VALUES ('wrong','now')")
    readonly.close()


def test_refuses_symlinked_ledger_paths(tmp_path: Path):
    real = tmp_path / "real.sqlite3"
    db = open_decision_ledger(real)
    db.close()
    linked = tmp_path / "linked.sqlite3"
    linked.symlink_to(real)
    with pytest.raises(ValueError, match="safe regular file"):
        open_decision_ledger(linked)
    with pytest.raises(ValueError, match="safe regular file"):
        open_decision_ledger(linked, create=False)


def test_registration_requires_strict_phase9b_dossier_contract(ledger):
    with pytest.raises(ValueError, match="versioned contract"):
        register_dossier(ledger, {
            "cluster_id": "fabricated",
            "family": "tag",
            "outcome_content_fingerprint": OUTCOME,
        })


def test_refuses_nonledger_database(tmp_path: Path):
    path = tmp_path / "not-ledger.sqlite3"
    with sqlite3.connect(path) as db:
        db.execute("CREATE TABLE unrelated(value TEXT)")
    with pytest.raises(ValueError, match="non-ledger"):
        open_decision_ledger(path)


def test_registers_exact_dossier_and_does_not_inherit_revised_snapshot(ledger):
    original = _register(ledger, "Prayer")
    event = _append(ledger, original, "accept")
    revised = _register(ledger, "Prayer ministry")

    assert revised != original
    assert derive_effective_state(ledger, original)["disposition"]["action"] == "accept"
    assert derive_effective_state(ledger, revised)["disposition"] is None
    history = read_cluster_history(ledger, "cluster-religious-practice")
    assert {row["dossier_fingerprint"] for row in history} == {original, revised}
    assert sorted(row["decision_count"] for row in history) == [0, 1]
    assert event["sequence"] == 1
    assert validate_ledger_integrity(ledger) == {"dossiers": 2, "events": 1}


def test_all_actions_are_bounded_and_effective_state_accumulates_amendments(ledger):
    source = _register(ledger, "Prayer")
    target = _register(ledger, "Religious practice")
    actions = [
        ("add_variant", {"variant": "pray the gay away"}),
        ("add_evidence", {"doc_id": "doc-2", "quote": "quoted text", "locator": "para. 4"}),
        ("accept", {}),
        ("edit", {"label": "Religious conversion practice"}),
        ("defer", {}),
        ("reject", {}),
        ("merge_into", {"target_dossier_fingerprint": target}),
    ]
    head = None
    for index, (action, payload) in enumerate(actions, start=1):
        event = _append(ledger, source, action, payload, key=f"decision-{index}", head=head)
        head = event["event_fingerprint"]
    state = derive_effective_state(ledger, source)
    assert state["event_count"] == len(actions)
    assert state["head_fingerprint"] == head
    assert state["disposition"]["action"] == "merge_into"
    assert [item["payload"]["variant"] for item in state["variants"]] == ["pray the gay away"]
    assert [item["payload"]["doc_id"] for item in state["evidence"]] == ["doc-2"]
    assert [item["payload"]["label"] for item in state["edits"]] == [
        "Religious conversion practice"
    ]
    assert validate_ledger_integrity(ledger)["events"] == len(actions)


@pytest.mark.parametrize(
    ("action", "payload"),
    [
        ("accept", {"silent_publish": True}),
        ("edit", {"label": ""}),
        ("add_variant", {"variant": "x" * 501}),
        ("add_evidence", {"doc_id": "doc-1", "quote": "text"}),
        ("merge_into", {"target_dossier_fingerprint": "not-a-hash"}),
        ("unknown", {}),
    ],
)
def test_rejects_unsupported_or_unbounded_payloads(ledger, action, payload):
    fingerprint = _register(ledger, "Prayer")
    with pytest.raises(ValueError):
        _append(ledger, fingerprint, action, payload)
    assert derive_effective_state(ledger, fingerprint)["event_count"] == 0


def test_exact_idempotent_replay_and_collision(ledger):
    fingerprint = _register(ledger, "Prayer")
    first = _append(ledger, fingerprint, "accept")
    replay = _append(ledger, fingerprint, "accept")
    assert replay["event_fingerprint"] == first["event_fingerprint"]
    assert derive_effective_state(ledger, fingerprint)["event_count"] == 1

    with pytest.raises(ValueError, match="Idempotency key collision"):
        _append(ledger, fingerprint, "reject")
    assert derive_effective_state(ledger, fingerprint)["event_count"] == 1


def test_expected_head_prevents_stale_concurrent_decision(ledger):
    fingerprint = _register(ledger, "Prayer")
    first = _append(ledger, fingerprint, "accept")
    with pytest.raises(ValueError, match="head changed"):
        _append(ledger, fingerprint, "reject", key="decision-2", head=None)
    second = _append(
        ledger, fingerprint, "reject", key="decision-2", head=first["event_fingerprint"]
    )
    assert second["sequence"] == 2


def test_append_only_triggers_block_update_and_delete(ledger):
    fingerprint = _register(ledger, "Prayer")
    _append(ledger, fingerprint, "accept")
    operations = [
        ("UPDATE dossier_snapshots SET family='claim'", "dossier snapshots"),
        ("DELETE FROM dossier_snapshots", "dossier snapshots"),
        ("UPDATE decision_events SET action='reject'", "decision events"),
        ("DELETE FROM decision_events", "decision events"),
        ("UPDATE ledger_metadata SET schema_version='wrong'", "ledger metadata"),
        ("DELETE FROM ledger_migrations", "ledger migrations"),
    ]
    for sql, message in operations:
        with pytest.raises(sqlite3.IntegrityError, match=message):
            ledger.execute(sql)
        ledger.rollback()
    assert validate_ledger_integrity(ledger) == {"dossiers": 1, "events": 1}


def test_insert_or_replace_cannot_bypass_append_only_dossier_trigger(ledger):
    fingerprint = _register(ledger, "Prayer")
    row = ledger.execute(
        "SELECT * FROM dossier_snapshots WHERE dossier_fingerprint=?", (fingerprint,),
    ).fetchone()
    with pytest.raises(sqlite3.IntegrityError, match="append-only"):
        ledger.execute(
            """INSERT OR REPLACE INTO dossier_snapshots
               (dossier_fingerprint,cluster_id,outcome_content_fingerprint,family,dossier_json,created_at)
               VALUES (?,?,?,?,?,?)""",
            (
                row["dossier_fingerprint"], row["cluster_id"],
                row["outcome_content_fingerprint"], "changed-family",
                row["dossier_json"], row["created_at"],
            ),
        )
    ledger.rollback()
    assert validate_ledger_integrity(ledger) == {"dossiers": 1, "events": 0}


def test_merge_requires_same_binding_and_family_and_prevents_cycles(ledger):
    source = _register(ledger, "Prayer")
    other_outcome = _register(ledger, "Prayer later", outcome="b" * 64)
    other_family = _register(ledger, "Claim", family="claim")
    with pytest.raises(ValueError, match="exact outcome binding and family"):
        _append(
            ledger, source, "merge_into", {"target_dossier_fingerprint": other_outcome}
        )
    with pytest.raises(ValueError, match="exact outcome binding and family"):
        _append(
            ledger, source, "merge_into", {"target_dossier_fingerprint": other_family},
            key="decision-2",
        )
    with pytest.raises(ValueError, match="itself"):
        _append(
            ledger, source, "merge_into", {"target_dossier_fingerprint": source},
            key="decision-3",
        )

    target = _register(ledger, "Religious practice")
    first = _append(
        ledger, source, "merge_into", {"target_dossier_fingerprint": target}, key="merge-a-b"
    )
    assert first["sequence"] == 1
    with pytest.raises(ValueError, match="cycle"):
        _append(
            ledger, target, "merge_into", {"target_dossier_fingerprint": source}, key="merge-b-a"
        )


def test_superseded_merge_does_not_create_a_false_cycle(ledger):
    source = _register(ledger, "Prayer")
    target = _register(ledger, "Religious practice")
    merged = _append(
        ledger, source, "merge_into", {"target_dossier_fingerprint": target}, key="merge-a-b"
    )
    _append(ledger, source, "accept", key="undo-merge", head=merged["event_fingerprint"])
    _append(
        ledger, target, "merge_into", {"target_dossier_fingerprint": source}, key="merge-b-a"
    )
    assert validate_ledger_integrity(ledger) == {"dossiers": 2, "events": 3}


def test_ledger_writes_never_change_source_bytes(tmp_path: Path):
    corpus = tmp_path / "corpus" / "doc-1"
    corpus.mkdir(parents=True)
    source = corpus / "enrichment.json"
    source.write_bytes(b'{"proposals": [{"label": "Prayer"}]}\n')
    before = source.read_bytes()

    db = open_decision_ledger(tmp_path / "exports" / "review-decisions.sqlite3")
    fingerprint = _register(db, "Prayer")
    _append(db, fingerprint, "accept")
    db.close()

    assert source.read_bytes() == before
    assert list(corpus.iterdir()) == [source]
