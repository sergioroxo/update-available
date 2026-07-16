import copy
import hashlib
import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from runner.pipeline import batch_outcome, review_dossier
from runner.pipeline.citation_units import build_citation_units
from runner.pipeline.source_queue import add_item, apply_triage_result, open_db, queue_db_path
from runner.pipeline.specialist_dispatch import build_dispatch_plan
from runner.pipeline.workflow_batch import plan_workflow_batch
from runner.pipeline.workflow_integrity import canonical_fingerprint
from runner.review_inbox_ui import _ensure_dossier_snapshot


def _write(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _doc(corpus: Path, doc_id: str, *, term: str = "Candidate") -> Path:
    doc = corpus / doc_id
    quote = f"{term} appears in this source."
    _write(doc / "intake.json", {
        "doc_id": doc_id, "source": f"https://{doc_id}.example/source", "tier": 3,
    })
    _write(doc / "preprocess.json", {"quality": "ok"})
    (doc / "extracted.txt").write_text(quote, encoding="utf-8")
    _write(doc / "analysis.json", {
        "doc_id": doc_id, "type": "Pro-SOGICE", "format": "Report",
        "evidence": [], "scope": "Core", "narrative_register": "Legal-Policy",
        "summary": "Description", "confidence": {"status": "high", "overall_score": 0.8},
    })
    _write(doc / "analysis_audit.json", {"model": "local-analysis", "prompt_version": "test-v1", "errors": []})
    _write(doc / "enrichment.json", {
        "doc_id": doc_id,
        "lexicon_proposals": [{
            "proposal_id": f"lex-{doc_id}", "term": term, "exact_quote": quote,
            "model_confidence": 0.7, "proposal_status": "pending",
        }],
        "entity_proposals": [{
            "proposal_id": f"entity-{doc_id}", "name": term, "evidence_quote": quote,
            "model_confidence": 0.6, "proposal_status": "pending",
        }],
    })
    _write(doc / "enrichment_audit.json", {"enrichment_model": "local-enrichment", "errors": []})
    _write(doc / "citation_units.json", build_citation_units(quote, doc_id=doc_id))
    return doc


def _triage():
    return SimpleNamespace(
        doc_type_hint="academic", recommended_llm="local", routing_reason="route",
        complexity="moderate", needs_book_splitting=False,
        needs_testimony_review=False, needs_media_review=False,
        needs_legal_review=False, overnight_batch_safe=True,
        suggested_process_route="standard", triage_succeeded=True,
    )


def _bundle(tmp_path: Path):
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    batch_doc_id = "doc-alpha"
    _doc(corpus, batch_doc_id)
    _doc(corpus, "archive-context")
    db = open_db(queue_db_path(corpus))
    item = add_item(db, "https://example.org/batch")
    apply_triage_result(db, item.id, _triage(), model_name="triage-model")
    db.execute("UPDATE source_queue SET corpus_doc_id=? WHERE id=?", (batch_doc_id, item.id))
    db.commit()
    workflow = plan_workflow_batch(
        db, workflow_batch_id="workflow-dossier-test", selected_item_ids=[item.id], limit=1,
    )
    dispatch = build_dispatch_plan(workflow, corpus)
    result = batch_outcome.compile_workflow_batch_outcome(
        workflow, dispatch, corpus, tmp_path / "batch_outcomes",
    )
    outcome = result["outcome"]
    memory_path = Path(outcome["provisional_memory"]["path"])
    return corpus, workflow, dispatch, outcome, memory_path


def _memory_stable(memory: dict) -> dict:
    return {
        key: memory.get(key)
        for key in (
            "schema_version", "label", "recurrence_threshold", "focus_doc_ids",
            "records", "clusters", "focused_cluster_ids",
        )
    }


def _refingerprint_memory(memory: dict) -> None:
    memory["evidence_fingerprint"] = canonical_fingerprint(_memory_stable(memory))


def _tree_hash(root: Path) -> dict[str, str]:
    return {
        str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(root.rglob("*")) if path.is_file()
    }


def test_build_preserves_exact_identity_full_records_and_archive_context(tmp_path):
    _, workflow, dispatch, outcome, memory_path = _bundle(tmp_path)

    payload = review_dossier.build_review_dossier_index(
        workflow, dispatch, outcome, memory_path,
    )

    assert payload["schema_version"] == review_dossier.SCHEMA_VERSION
    assert payload["batch_doc_ids"] == ["doc-alpha"]  # never removeprefix("doc-")
    assert {row["family"] for row in payload["dossiers"]} == {
        "lexicon_proposals", "entity_proposals",
    }
    for dossier in payload["dossiers"]:
        assert dossier["outcome_content_fingerprint"] == outcome["content_fingerprint"]
        assert dossier["memory_fingerprint"] == outcome["provisional_memory"]["evidence_fingerprint"]
        assert [ref["record"]["document"]["doc_id"] for ref in dossier["batch_references"]] == ["doc-alpha"]
        assert [ref["record"]["document"]["doc_id"] for ref in dossier["archive_context_references"]] == ["archive-context"]
        assert dossier["batch_references"][0]["proposal_id"] in {"lex-doc-alpha", "entity-doc-alpha"}
        assert dossier["batch_references"][0]["record"]["evidence"]["text"]
        assert dossier["batch_references"][0]["record"]["provenance"]["enrichment_model"] == "local-enrichment"
        assert dossier["review_group_key"].startswith("review-group-")
        assert dossier["signals"]["publication_blocked"] is True
    # Equal labels from different proposal families remain separate dossiers.
    assert len({row["cluster_id"] for row in payload["dossiers"]}) == 2


def test_build_is_deterministic_except_timestamp_and_does_not_mutate_sources(tmp_path):
    corpus, workflow, dispatch, outcome, memory_path = _bundle(tmp_path)
    before_corpus = _tree_hash(corpus)
    before_memory = memory_path.read_bytes()

    first = review_dossier.build_review_dossier_index(workflow, dispatch, outcome, memory_path)
    second = review_dossier.build_review_dossier_index(workflow, dispatch, outcome, memory_path)

    assert first["content_fingerprint"] == second["content_fingerprint"]
    assert review_dossier.dossier_index_content_projection(first) == review_dossier.dossier_index_content_projection(second)
    assert _tree_hash(corpus) == before_corpus
    assert memory_path.read_bytes() == before_memory


def test_validator_rejects_rehashed_projection_with_a_focused_dossier_removed(tmp_path):
    _, workflow, dispatch, outcome, memory_path = _bundle(tmp_path)
    payload = review_dossier.build_review_dossier_index(
        workflow, dispatch, outcome, memory_path,
    )
    memory = review_dossier.load_provisional_memory(memory_path)
    forged = copy.deepcopy(payload)
    forged["dossiers"].pop()
    forged["summary"] = {
        "dossiers": len(forged["dossiers"]),
        "batch_records": sum(len(row["batch_references"]) for row in forged["dossiers"]),
        "archive_context_records": sum(
            len(row["archive_context_references"]) for row in forged["dossiers"]
        ),
        "human_decision_dossiers": sum(
            bool(row["human_decision_required"]) for row in forged["dossiers"]
        ),
        "conflicted_dossiers": sum(
            bool(row["conflict_detected"]) for row in forged["dossiers"]
        ),
    }
    forged["content_fingerprint"] = review_dossier.dossier_index_content_fingerprint(forged)

    with pytest.raises(ValueError, match="incomplete|exactly derived"):
        review_dossier.validate_review_dossier_index(
            forged, workflow, dispatch, outcome, memory,
        )


def test_memory_tamper_missing_and_duplicate_drafts_fail_closed(tmp_path):
    _, workflow, dispatch, outcome, memory_path = _bundle(tmp_path)
    memory = json.loads(memory_path.read_text(encoding="utf-8"))

    tampered = copy.deepcopy(memory)
    tampered["records"][0]["evidence"]["text"] = "forged"
    _write(memory_path, tampered)
    with pytest.raises(ValueError, match="fingerprint"):
        review_dossier.build_review_dossier_index(workflow, dispatch, outcome, memory_path)

    _write(memory_path, memory)
    missing = copy.deepcopy(memory)
    missing["records"].pop(0)
    _refingerprint_memory(missing)
    _write(memory_path, missing)
    with pytest.raises(ValueError, match="missing draft"):
        review_dossier.build_review_dossier_index(workflow, dispatch, outcome, memory_path)

    duplicate = copy.deepcopy(memory)
    duplicate["records"].append(copy.deepcopy(duplicate["records"][0]))
    _refingerprint_memory(duplicate)
    _write(memory_path, duplicate)
    with pytest.raises(ValueError, match="Duplicate"):
        review_dossier.build_review_dossier_index(workflow, dispatch, outcome, memory_path)


def test_memory_reader_rejects_symlink_oversize_and_missing(tmp_path):
    source = tmp_path / "source.json"
    source.write_text("{}", encoding="utf-8")
    link = tmp_path / "linked.json"
    link.symlink_to(source)
    with pytest.raises(ValueError, match="safe regular file"):
        review_dossier.load_provisional_memory(link)
    with pytest.raises(ValueError, match="bounded JSON size"):
        review_dossier.load_provisional_memory(source, max_bytes=1)
    with pytest.raises(ValueError, match="safe regular file"):
        review_dossier.load_provisional_memory(tmp_path / "missing.json")


def test_exact_outcome_and_memory_bindings_are_required(tmp_path):
    _, workflow, dispatch, outcome, memory_path = _bundle(tmp_path)
    changed = copy.deepcopy(outcome)
    changed["workflow_binding"]["dispatch_fingerprint"] = "0" * 64
    with pytest.raises(ValueError, match="content fingerprint|supplied workflow"):
        review_dossier.build_review_dossier_index(workflow, dispatch, changed, memory_path)

    other = tmp_path / "other-memory.json"
    other.write_bytes(memory_path.read_bytes())
    with pytest.raises(ValueError, match="declared"):
        review_dossier.build_review_dossier_index(workflow, dispatch, outcome, other)


def test_writer_creates_content_addressed_history_and_refuses_collision(tmp_path):
    _, workflow, dispatch, outcome, memory_path = _bundle(tmp_path)
    payload = review_dossier.build_review_dossier_index(workflow, dispatch, outcome, memory_path)

    paths = review_dossier.write_review_dossier_index(payload, tmp_path / "exports")
    original = paths["snapshot_path"].read_bytes()
    replay = copy.deepcopy(payload)
    replay["generated_at"] = "2099-01-01T00:00:00+00:00"
    assert review_dossier.write_review_dossier_index(replay, tmp_path / "exports") == paths
    assert paths["snapshot_path"].read_bytes() == original
    assert json.loads(paths["latest_path"].read_text(encoding="utf-8"))["content_fingerprint"] == payload["content_fingerprint"]

    collision = copy.deepcopy(payload)
    collision["summary"]["dossiers"] += 1
    with pytest.raises(ValueError, match="does not match|collision"):
        review_dossier.write_review_dossier_index(collision, tmp_path / "exports")


def test_writer_rejects_symlink_at_existing_immutable_snapshot_path(tmp_path):
    _, workflow, dispatch, outcome, memory_path = _bundle(tmp_path)
    payload = review_dossier.build_review_dossier_index(workflow, dispatch, outcome, memory_path)
    paths = review_dossier.write_review_dossier_index(payload, tmp_path / "exports")
    copied = tmp_path / "copied.json"
    copied.write_bytes(paths["snapshot_path"].read_bytes())
    paths["snapshot_path"].unlink()
    paths["snapshot_path"].symlink_to(copied)
    with pytest.raises(ValueError, match="safe regular file"):
        review_dossier.write_review_dossier_index(payload, tmp_path / "exports")


def test_ui_snapshot_reuse_is_timestamp_insensitive_and_tamper_evident(tmp_path):
    _, workflow, dispatch, outcome, memory_path = _bundle(tmp_path)
    payload = review_dossier.build_review_dossier_index(workflow, dispatch, outcome, memory_path)
    exports = tmp_path / "exports"
    paths = _ensure_dossier_snapshot(payload, exports)
    before = {
        name: (path.read_bytes(), path.stat().st_mtime_ns)
        for name, path in paths.items()
    }
    rebuilt = copy.deepcopy(payload)
    rebuilt["generated_at"] = "2099-01-01T00:00:00+00:00"
    assert _ensure_dossier_snapshot(rebuilt, exports) == paths
    assert {
        name: (path.read_bytes(), path.stat().st_mtime_ns)
        for name, path in paths.items()
    } == before

    paths["snapshot_path"].write_text("{}", encoding="utf-8")
    with pytest.raises(ValueError, match="immutable dossier snapshot failed"):
        _ensure_dossier_snapshot(rebuilt, exports)
