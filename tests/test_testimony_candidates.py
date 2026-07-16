from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from runner.main import app
from runner.pipeline.archive_summary import build_archive_summary
from runner.pipeline.citation_units import build_citation_units
from runner.pipeline.testimony_candidates import (
    apply_testimony_candidate_refresh,
    build_testimony_candidates,
    export_testimony_candidates,
    iter_doc_dirs,
    preview_testimony_candidate_refresh,
    validate_testimony_candidates_payload,
)


def test_scoped_refresh_archives_prior_payload_and_refuses_stale_preview(tmp_path):
    doc = _doc(tmp_path)
    prior = build_testimony_candidates(doc, generated_at="prior", generator_git_commit="")
    _write_json(doc / "testimony_candidates.json", prior)
    preview = preview_testimony_candidate_refresh(doc)
    apply_testimony_candidate_refresh(doc, preview)

    history_rows = (doc / "testimony_candidate_history.jsonl").read_text(encoding="utf-8").splitlines()
    archived = json.loads(history_rows[-1])
    assert archived["prior_payload"] == prior

    stale = preview_testimony_candidate_refresh(doc)
    _write_json(doc / "analysis.json", {"summary": "inputs changed after preview"})
    with pytest.raises(ValueError, match="changed after preview"):
        apply_testimony_candidate_refresh(doc, stale)

    wrong_doc = dict(preview_testimony_candidate_refresh(doc))
    wrong_doc["doc_id"] = "another-doc"
    with pytest.raises(ValueError, match="different document"):
        apply_testimony_candidate_refresh(doc, wrong_doc)


class _Config:
    def __init__(self, corpus_dir: Path, exports_dir: Path) -> None:
        self.corpus_dir = corpus_dir
        self.exports_dir = exports_dir


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _doc(tmp_path: Path, doc_id: str = "doc-testimony") -> Path:
    doc = tmp_path / "corpus" / doc_id
    doc.mkdir(parents=True)
    text = (
        "The therapist presents a case story about a client who claimed he was "
        "healed from unwanted homosexuality through reparative therapy.\n\n"
        "A survivor later described coercion and harm from conversion therapy."
    )
    (doc / "extracted.txt").write_text(text, encoding="utf-8")
    _write_json(doc / "citation_units.json", build_citation_units(text, doc_id=doc_id))
    _write_json(doc / "analysis.json", {
        "type": "Pro-SOGICE",
        "format": "Book",
        "summary": "Book with testimony-like clinical case stories.",
        "testimony_flag": True,
        "tactic": ["Tactic: Testimony-as-Proof"],
        "practice": ["Practice: Reparative Therapy"],
    })
    _write_json(doc / "analysis_audit.json", {"model": "core-qwen", "llm_flag": "litelm"})
    return doc


def test_iter_doc_dirs_skips_hidden_internal_and_unrelated_folders(tmp_path):
    corpus = tmp_path / "corpus"
    valid = corpus / "doc-valid"
    valid.mkdir(parents=True)
    (valid / "analysis.json").write_text("{}", encoding="utf-8")
    hidden = corpus / ".document_sets"
    hidden.mkdir()
    (hidden / "example.json").write_text("{}", encoding="utf-8")
    unrelated = corpus / "exports"
    unrelated.mkdir()

    assert list(iter_doc_dirs(corpus)) == [valid]


def test_build_testimony_candidates_from_longform_and_analysis(tmp_path):
    doc = _doc(tmp_path)
    section = {
        "schema_version": "longform-review-v0.1",
        "doc_id": doc.name,
        "section_id": f"{doc.name}-section-001",
        "section_index": 1,
        "page_start": "1",
        "page_end": "2",
        "status": "succeeded",
        "model_provider": "litelm",
        "model_name": "core-gemma",
        "analysis": {
            "section_summary": "This section uses case stories as proof of change.",
            "terms": [{"term": "unwanted homosexuality", "confidence": 0.9}],
            "tactics": [{"name": "Testimony-as-Proof", "confidence": 0.95}],
            "practices": [{"name": "Reparative Therapy", "confidence": 0.95}],
            "actors": [{"name": "Joseph Nicolosi", "confidence": 0.9}],
            "evidence_quotes": [{
                "quote": "case story about a client who claimed he was healed",
                "note": "Clinical case story used as legitimating evidence.",
                "locator": {"section_id": f"{doc.name}-section-001", "page_label": "1"},
            }],
        },
    }
    (doc / "longform_section_analyses.jsonl").write_text(json.dumps(section) + "\n", encoding="utf-8")

    payload = build_testimony_candidates(doc)

    assert payload["candidate_count"] >= 2
    types = {item["testimony_type"] for item in payload["candidates"]}
    assert "clinical_case_story" in types
    assert payload["public_policy"]["default_public_display"] is False
    clinical = next(
        item for item in payload["candidates"]
        if item["testimony_type"] == "clinical_case_story"
        and item["source_kind"] == "longform_evidence_quote"
    )
    assert clinical["linked_tactics"] == ["Testimony-as-Proof"]
    assert clinical["linked_practices"] == ["Reparative Therapy"]
    assert clinical["public"]["public_readiness"] == "private_review_required"
    assert clinical["model_attribution"]["model"] == "core-gemma"


def test_testimony_candidates_from_enrichment_quote_include_locator(tmp_path):
    doc = _doc(tmp_path)
    _write_json(doc / "enrichment.json", {
        "enrichment_model": "core-gemma",
        "practice_descriptions": [{
            "practice": "Reparative Therapy",
            "harm_quote": "coercion and harm from conversion therapy",
            "model_confidence": 0.88,
        }],
    })

    payload = build_testimony_candidates(doc)

    survivor = next(item for item in payload["candidates"] if item["testimony_type"] == "survivor_testimony")
    assert survivor["evidence_locator"]["status"] == "located"
    assert survivor["evidence_quote_hash"]
    assert survivor["confidence"] == 0.88


def test_candidate_level_publication_defaults_are_fail_closed(tmp_path):
    doc = _doc(tmp_path)
    payload = build_testimony_candidates(doc)
    payload["candidates"][0]["public"]["public_display"] = True

    with pytest.raises(ValueError, match="private pending researcher review"):
        validate_testimony_candidates_payload(payload, doc_id=doc.name)


def test_entity_documentarian_evidence_is_not_testimony_candidate(tmp_path):
    doc = tmp_path / "corpus" / "doc-documentarian"
    doc.mkdir(parents=True)
    _write_json(doc / "enrichment.json", {
        "enrichment_model": "core-gemma",
        "entity_proposals": [{
            "name": "Lucas Wilson",
            "entity_type": "person",
            "role_in_sogice": "Researcher/Documentarian of SOGICE harms and survivor experiences",
            "evidence_quote": (
                "He is the editor of Shame-Sex Attraction: Survivors' Stories "
                "of Conversion Therapy and is currently working on a new collection."
            ),
            "model_confidence": 0.9,
        }],
    })

    payload = build_testimony_candidates(doc)

    assert payload["candidate_count"] == 0


def test_archive_summary_reports_testimony_candidates_and_reviews(tmp_path):
    doc = _doc(tmp_path)
    payload = build_testimony_candidates(doc)
    _write_json(doc / "testimony_candidates.json", payload)
    first = payload["candidates"][0]
    _write_json(doc / "testimony_candidate_reviews.json", {
        "schema_version": "testimony-candidate-reviews-v0.1",
        "doc_id": doc.name,
        "reviews": {
            first["candidate_id"]: {
                "review_state": "public_approved",
                "public_readiness": "public_display_approved",
                "public_display": True,
            }
        },
    })

    summary = build_archive_summary(doc)

    assert summary["testimony_candidates"]["exists"] is True
    assert summary["testimony_candidates"]["candidate_count"] == payload["candidate_count"]
    assert summary["testimony_candidates"]["reviewed_count"] == 1
    assert summary["testimony_candidates"]["public_ready_count"] == 1


def test_export_testimony_candidates_jsonl(tmp_path):
    corpus = tmp_path / "corpus"
    exports = tmp_path / "exports"
    doc = _doc(tmp_path)
    _write_json(doc / "testimony_candidates.json", build_testimony_candidates(doc))

    result = export_testimony_candidates(corpus, exports)

    assert result["candidate_count"] >= 1
    out = Path(result["path"])
    assert out.exists()
    assert "doc-testimony" in out.read_text(encoding="utf-8")


def test_testimony_candidates_cli_builds_sidecars_and_export(monkeypatch, tmp_path):
    corpus = tmp_path / "corpus"
    exports = tmp_path / "exports"
    _doc(tmp_path)
    monkeypatch.setattr("runner.main.load_config", lambda *a, **kw: _Config(corpus, exports))

    result = CliRunner().invoke(app, ["testimony-candidates-build", "--export"])

    assert result.exit_code == 0, result.output
    assert "Testimony candidates written" in result.output
    assert (corpus / "doc-testimony" / "testimony_candidates.json").exists()
    assert (exports / "review" / "testimony_candidates.jsonl").exists()
