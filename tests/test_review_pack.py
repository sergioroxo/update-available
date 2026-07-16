import json
import copy
from pathlib import Path

import pytest
from typer.testing import CliRunner

from runner import main
from runner.pipeline.review_pack import (
    generate_review_pack,
    review_pack_stable_projection,
    validate_review_pack,
)
from runner.pipeline.workflow_integrity import canonical_fingerprint


def _write(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _doc(corpus: Path, doc_id: str) -> Path:
    doc = corpus / doc_id
    _write(doc / "intake.json", {"doc_id": doc_id, "source": "https://example.org/source", "tier": 2})
    _write(doc / "preprocess.json", {"title": "Source title", "quality": "ok"})
    _write(doc / "analysis.json", {"doc_id": doc_id, "type": "Pro-SOGICE", "summary": "Research summary"})
    _write(doc / "analysis_audit.json", {"model": "local-model", "errors": []})
    quote = "The source describes a recurring practice in exact language."
    _write(doc / "citation_units.json", {
        "schema_version": "citation-units-v1.0", "doc_id": doc_id,
        "source_artifact": "extracted.txt", "unit_count": 1, "char_count": len(quote),
        "text_sha256": "hash", "units": [{
            "unit_id": "p0001-test", "source_artifact": "extracted.txt",
            "char_start": 0, "char_end": len(quote), "text": quote,
        }],
    })
    _write(doc / "enrichment.json", {
        "doc_id": doc_id,
        "lexicon_proposals": [{"term": "Recurring term", "exact_quote": quote}],
        "entity_proposals": [], "tactic_proposals": [], "practice_descriptions": [],
        "statistical_claims": [], "ingestion_queue": [], "corpus_connections": [],
    })
    return doc


def _outcome(path: Path, doc_id: str) -> Path:
    _write(path, {
        "schema_version": "batch-outcome-v2.0", "batch_id": "batch-one",
        "audit_id": "audit-1", "evidence_fingerprint": "evidence-1",
        "items": [{
            "item_id": "queue-1", "doc_id": doc_id, "primary_outcome": "ordinary_ready",
            "review_assignment": {"lane": "ai_managed_provisional", "group_count": 1},
            "specialist_routes": [],
        }],
    })
    return path


def _rehash_pack(pack: dict) -> None:
    fingerprint = canonical_fingerprint(review_pack_stable_projection(pack))
    pack["content_fingerprint"] = fingerprint
    pack["evidence_fingerprint"] = fingerprint
    pack["pack_id"] = f"{pack['pack_id'].rsplit('--', 1)[0]}--{fingerprint[:12]}"


def test_review_pack_composes_existing_evidence_without_mutating_corpus(tmp_path):
    corpus = tmp_path / "corpus"
    doc = _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    before = {path.name: path.read_bytes() for path in doc.iterdir()}

    result = generate_review_pack(corpus, tmp_path / "exports", outcome_path=outcome)

    pack = result["pack"]
    assert pack["document_count"] == 1
    packet = pack["documents"][0]
    assert packet["source_url"] == "https://example.org/source"
    assert packet["evidence"][0]["locator"]["unit_id"] == "p0001-test"
    assert packet["enrichment"]["lexicon_proposals"]["included"] == 1
    assert result["json_path"].is_file()
    assert result["markdown_path"].is_file()
    assert {path.name: path.read_bytes() for path in doc.iterdir()} == before


def test_review_pack_is_bounded_and_reuses_identical_snapshot(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    first = generate_review_pack(corpus, tmp_path / "exports", outcome_path=outcome)
    second = generate_review_pack(corpus, tmp_path / "exports", outcome_path=outcome)
    assert first["pack"]["pack_id"] == second["pack"]["pack_id"]
    assert second["reused"] is True

    with pytest.raises(ValueError, match="bounded"):
        generate_review_pack(
            corpus, tmp_path / "other", doc_ids=[f"d{i}" for i in range(16)],
        )


def test_review_pack_cli_uses_batch_outcome(monkeypatch, tmp_path):
    corpus = tmp_path / "corpus"
    exports = tmp_path / "exports"
    _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    config = type("Config", (), {"corpus_dir": corpus, "exports_dir": exports})()
    monkeypatch.setattr(main, "load_config", lambda **kwargs: config)

    result = CliRunner().invoke(main.app, ["review-pack", str(outcome)])

    assert result.exit_code == 0, result.stdout
    assert "No model was called" in result.stdout
    assert len(list((exports / "review_packs" / "batch-one" / "packs").iterdir())) == 1


def test_external_safe_pack_withholds_sensitive_document_content(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    payload = json.loads(outcome.read_text())
    payload["items"][0]["specialist_routes"] = [{
        "flag": "needs_testimony_review", "route": "testimony_candidates_and_deep_review",
        "status": "pending",
    }]
    _write(outcome, payload)

    result = generate_review_pack(
        corpus, tmp_path / "exports", outcome_path=outcome,
        privacy_mode="external_safe",
    )

    document = result["pack"]["documents"][0]
    assert document["local_path"] == ""
    assert document["analysis"]["withheld"] is True
    assert document["evidence"] == []
    assert result["pack"]["privacy_mode"] == "external_safe"
    assert "/Users/" not in json.dumps(result["pack"])


def test_markdown_includes_provisional_memory_clusters_without_exceptions(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    payload = json.loads(outcome.read_text())
    payload["provisional_memory"] = {
        "clusters": [{
            "preferred_draft_label": "Draft term", "trust_state": "source_attested",
            "document_count": 1, "source_family_count": 1, "located_evidence_count": 1,
            "model_confidence_summary": {"mean": 0.77},
        }],
    }
    _write(outcome, payload)

    result = generate_review_pack(corpus, tmp_path / "exports", outcome_path=outcome)

    markdown = result["markdown_path"].read_text()
    assert "## Provisional memory clusters" in markdown
    assert "Draft term" in markdown
    assert "corpus source-family count=1" in markdown


def test_markdown_does_not_turn_incomplete_family_review_into_zero(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    payload = json.loads(outcome.read_text())
    payload["provisional_memory"] = {
        "clusters": [{
            "preferred_draft_label": "Draft term", "trust_state": "source_attested",
            "document_count": 1, "source_family_count": None,
            "source_hostname_proxy_count": 1, "located_evidence_count": 1,
            "model_confidence_summary": {"mean": 0.77},
        }],
    }
    _write(outcome, payload)

    markdown = generate_review_pack(
        corpus, tmp_path / "exports", outcome_path=outcome,
    )["markdown_path"].read_text()
    assert "corpus source-family count=not resolved (incomplete review)" in markdown
    assert "hostname proxy=1" in markdown


def test_review_pack_detects_nested_content_tampering(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    result = generate_review_pack(corpus, tmp_path / "exports", outcome_path=outcome)
    tampered = copy.deepcopy(result["pack"])
    tampered["documents"][0]["analysis"]["summary"] = "Silently changed"

    with pytest.raises(ValueError, match="content fingerprint"):
        validate_review_pack(tampered, source_outcome=json.loads(outcome.read_text()))


def test_external_safe_validation_rejects_rehashed_local_path(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    result = generate_review_pack(
        corpus, tmp_path / "exports", outcome_path=outcome, privacy_mode="external_safe",
    )
    tampered = copy.deepcopy(result["pack"])
    tampered["documents"][0]["local_path"] = "/Users/researcher/private/d1"
    fingerprint = canonical_fingerprint(review_pack_stable_projection(tampered))
    tampered["content_fingerprint"] = fingerprint
    tampered["evidence_fingerprint"] = fingerprint
    tampered["pack_id"] = f"{tampered['label']}--{fingerprint[:12]}"

    with pytest.raises(ValueError, match="local path"):
        validate_review_pack(tampered, source_outcome=json.loads(outcome.read_text()))


def test_review_pack_binds_exact_source_outcome_payload(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    result = generate_review_pack(corpus, tmp_path / "exports", outcome_path=outcome)
    changed_outcome = json.loads(outcome.read_text())
    changed_outcome["items"][0]["primary_outcome"] = "deferred"

    with pytest.raises(ValueError, match="embedded item|supplied Batch Outcome bytes"):
        validate_review_pack(result["pack"], source_outcome=changed_outcome)


def test_review_pack_refuses_tampered_immutable_snapshot_on_reuse(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    result = generate_review_pack(corpus, tmp_path / "exports", outcome_path=outcome)
    payload = json.loads(result["json_path"].read_text())
    payload["documents"][0]["analysis"]["summary"] = "tampered"
    _write(result["json_path"], payload)

    with pytest.raises(ValueError, match="content fingerprint"):
        generate_review_pack(corpus, tmp_path / "exports", outcome_path=outcome)


def test_review_pack_rejects_symlinked_and_duplicate_outcome_sources(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    symlink = tmp_path / "outcome-link.json"
    symlink.symlink_to(outcome)
    with pytest.raises(ValueError, match="safe regular file"):
        generate_review_pack(corpus, tmp_path / "exports-a", outcome_path=symlink)

    payload = json.loads(outcome.read_text())
    payload["items"].append({**payload["items"][0], "item_id": "queue-2"})
    duplicate = tmp_path / "duplicate.json"
    _write(duplicate, payload)
    with pytest.raises(ValueError, match="duplicate document"):
        generate_review_pack(corpus, tmp_path / "exports-b", outcome_path=duplicate)


def test_review_pack_rejects_rehashed_embedded_outcome_forgery(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    source = json.loads(outcome.read_text())
    pack = copy.deepcopy(generate_review_pack(corpus, tmp_path / "exports", outcome_path=outcome)["pack"])
    pack["documents"][0]["batch_outcome"]["primary_outcome"] = "deferred"
    _rehash_pack(pack)

    with pytest.raises(ValueError, match="embedded item"):
        validate_review_pack(pack, source_outcome=source)


def test_review_pack_rejects_rehashed_selection_source_forgery(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    source = json.loads(outcome.read_text())
    pack = copy.deepcopy(generate_review_pack(corpus, tmp_path / "exports", outcome_path=outcome)["pack"])
    pack["selection_source"]["provisional_memory"] = {"clusters": [{"label": "forged"}]}
    _rehash_pack(pack)

    with pytest.raises(ValueError, match="selection source"):
        validate_review_pack(pack, source_outcome=source)


def test_external_safe_rejects_rehashed_restored_sensitive_content(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    source = json.loads(outcome.read_text())
    source["items"][0]["specialist_routes"] = [{
        "flag": "needs_testimony_review", "route": "testimony_candidates_and_deep_review",
        "status": "human_required",
    }]
    _write(outcome, source)
    pack = copy.deepcopy(generate_review_pack(
        corpus, tmp_path / "exports", outcome_path=outcome, privacy_mode="external_safe",
    )["pack"])
    pack["documents"][0]["analysis"] = {"summary": "restored sensitive text"}
    _rehash_pack(pack)

    with pytest.raises(ValueError, match="restored sensitive"):
        validate_review_pack(pack, source_outcome=source)


def test_review_pack_rejects_unknown_top_level_field_without_rehash(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    pack = copy.deepcopy(generate_review_pack(corpus, tmp_path / "exports", outcome_path=outcome)["pack"])
    pack["unhashed_semantic_claim"] = "forged"

    with pytest.raises(ValueError, match="top-level fields"):
        validate_review_pack(pack, source_outcome=json.loads(outcome.read_text()))


def test_review_pack_refuses_tampered_immutable_markdown(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "d1")
    outcome = _outcome(tmp_path / "batch_outcome.json", "d1")
    result = generate_review_pack(corpus, tmp_path / "exports", outcome_path=outcome)
    result["markdown_path"].write_text("TAMPERED MARKDOWN", encoding="utf-8")

    with pytest.raises(ValueError, match="Markdown differs"):
        generate_review_pack(corpus, tmp_path / "exports", outcome_path=outcome)
