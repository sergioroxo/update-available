from __future__ import annotations

import json
from pathlib import Path

from typer.testing import CliRunner

from runner.main import app
from runner.pipeline.archive_summary import build_archive_summary
from runner.pipeline.citation_units import build_citation_units
from runner.pipeline.testimony_deep_review import (
    build_segments_sidecar,
    deep_review_status,
    run_testimony_deep_review,
)


class _Config:
    def __init__(self, corpus_dir: Path, exports_dir: Path) -> None:
        self.corpus_dir = corpus_dir
        self.exports_dir = exports_dir
        self.litelm_analysis_model_heavy = "core-gemma"
        self.litelm_analysis_model = "core-qwen"
        self.litelm_analysis_model_reasoning = "review-qwen"


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _doc(tmp_path: Path, doc_id: str = "doc-testimony") -> Path:
    doc = tmp_path / "corpus" / doc_id
    doc.mkdir(parents=True)
    text = (
        "I was told that reparative therapy would heal me, but the sessions "
        "left me isolated and ashamed.\n\n"
        "The book also describes editors and researchers who collect survivor stories."
    )
    (doc / "extracted.txt").write_text(text, encoding="utf-8")
    _write_json(doc / "citation_units.json", build_citation_units(text, doc_id=doc_id))
    quote = "I was told that reparative therapy would heal me"
    _write_json(doc / "testimony_candidates.json", {
        "schema_version": "testimony-candidates-v0.1",
        "doc_id": doc_id,
        "candidate_count": 1,
        "candidates": [{
            "candidate_id": "testimony-doc-testimony-001",
            "doc_id": doc_id,
            "testimony_type": "survivor_testimony",
            "speaker_position": "survivor",
            "source_artifact": "longform_section_analyses.jsonl",
            "source_kind": "longform_evidence_quote",
            "source_index": 1,
            "summary": "Survivor describes harm from reparative therapy.",
            "extracted_text": quote,
            "evidence_quote": quote,
            "evidence_locator": {},
            "linked_terms": ["reparative therapy"],
            "linked_tactics": ["Testimony-as-Proof"],
            "linked_practices": ["Reparative Therapy"],
            "linked_actors": [],
            "public": {"public_display": False, "public_readiness": "private_review_required"},
        }],
    })
    return doc


def _fake_model(system: str, user: str, llm: str, model: str | None, config: _Config):
    return {
        "candidate_assessment": {
            "is_testimony": True,
            "assessment": "actual_testimony",
            "recommended_review_state": "approved",
            "reason": "First-person account of a conversion-practice experience.",
        },
        "segments": [{
            "segment_type": "direct_survivor_testimony",
            "speaker_label": "unknown survivor",
            "speaker_position": "survivor",
            "testimony_text": "I was told that reparative therapy would heal me",
            "summary": "The speaker reports being promised healing through reparative therapy.",
            "mediation": "first_person_narrative",
            "narrative_function": "harm_account",
            "practice_descriptions": [{
                "practice": "Reparative Therapy",
                "description": "Therapeutic change effort presented as healing.",
                "evidence": "reparative therapy would heal me",
                "confidence": 0.91,
            }],
            "lexicon_terms": [{
                "term": "reparative therapy",
                "definition_as_used": "A claimed healing practice.",
                "evidence": "reparative therapy would heal me",
                "confidence": 0.9,
            }],
            "tactics": [{
                "name": "Healing Frame",
                "description": "Frames change as healing.",
                "evidence": "would heal me",
                "confidence": 0.83,
            }],
            "actors": [],
            "evidence_quote": "I was told that reparative therapy would heal me",
            "confidence": 0.92,
            "public_recommendation": {
                "public_display": False,
                "public_readiness": "private_review_required",
                "consent_status": "needs_review",
                "sensitivity": "high",
                "reason": "First-person testimony requires researcher review.",
            },
        }],
        "limitations": [],
    }


def test_run_testimony_deep_review_extracts_segments_and_locators(tmp_path):
    doc = _doc(tmp_path)
    config = _Config(tmp_path / "corpus", tmp_path / "exports")

    result = run_testimony_deep_review(doc, config=config, model_call=_fake_model)

    assert result["segment_count"] == 1
    payload = json.loads((doc / "testimony_segments.json").read_text(encoding="utf-8"))
    segment = payload["segments"][0]
    assert segment["segment_type"] == "direct_survivor_testimony"
    assert segment["practice_descriptions"][0]["practice"] == "Reparative Therapy"
    assert segment["lexicon_terms"][0]["term"] == "reparative therapy"
    assert segment["evidence_locator"]["status"] == "located"
    assert segment["public_recommendation"]["public_display"] is False


def test_deep_review_status_reports_document_level_progress(tmp_path):
    doc = _doc(tmp_path)
    config = _Config(tmp_path / "corpus", tmp_path / "exports")

    before = deep_review_status(doc)
    assert before["candidate_count"] == 1
    assert before["reviewed_count"] == 0
    assert before["pending_count"] == 1

    run_testimony_deep_review(doc, config=config, model_call=_fake_model)

    after = deep_review_status(doc)
    assert after["candidate_count"] == 1
    assert after["reviewed_count"] == 1
    assert after["pending_count"] == 0
    assert after["segment_count"] == 1


def test_document_level_deep_review_resume_skips_succeeded_candidates(tmp_path):
    doc = _doc(tmp_path)
    config = _Config(tmp_path / "corpus", tmp_path / "exports")

    first = run_testimony_deep_review(doc, config=config, model_call=_fake_model)
    second = run_testimony_deep_review(doc, config=config, model_call=_fake_model)

    assert first["selected_count"] == 1
    assert second["selected_count"] == 0
    rows = (doc / "testimony_segment_analyses.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(rows) == 1


def test_unlocated_candidate_holds_before_model_or_writes(tmp_path):
    doc = _doc(tmp_path)
    payload = json.loads((doc / "testimony_candidates.json").read_text())
    payload["candidates"][0]["evidence_quote"] = "Invented… quotation"
    payload["candidates"][0]["extracted_text"] = "Invented… quotation"
    payload["candidates"][0]["evidence_locator"] = {"status": "not_found"}
    _write_json(doc / "testimony_candidates.json", payload)
    calls = []

    def spy(*args, **kwargs):
        calls.append(1)
        return _fake_model(*args, **kwargs)

    result = run_testimony_deep_review(doc, config=_Config(tmp_path / "corpus", tmp_path / "exports"), model_call=spy)
    assert result["evidence_hold_count"] == 1
    assert calls == []
    assert not (doc / "testimony_segment_analyses.jsonl").exists()
    assert not (doc / "testimony_segments.json").exists()


def test_unlocated_overwrite_preserves_prior_success(tmp_path):
    doc = _doc(tmp_path)
    config = _Config(tmp_path / "corpus", tmp_path / "exports")
    run_testimony_deep_review(doc, config=config, model_call=_fake_model)
    prior = (doc / "testimony_segment_analyses.jsonl").read_bytes()
    payload = json.loads((doc / "testimony_candidates.json").read_text())
    payload["candidates"][0]["evidence_quote"] = "missing quote"
    payload["candidates"][0]["extracted_text"] = "missing quote"
    payload["candidates"][0]["evidence_locator"] = {"status": "not_found"}
    _write_json(doc / "testimony_candidates.json", payload)
    calls = []
    result = run_testimony_deep_review(
        doc, config=config, model_call=lambda *a, **k: calls.append(1), overwrite=True
    )
    assert result["evidence_hold_count"] == 1
    assert calls == []
    assert (doc / "testimony_segment_analyses.jsonl").read_bytes() == prior


def test_archive_summary_reports_deep_testimony_counts_without_text(tmp_path):
    doc = _doc(tmp_path)
    config = _Config(tmp_path / "corpus", tmp_path / "exports")
    run_testimony_deep_review(doc, config=config, model_call=_fake_model)

    summary = build_archive_summary(doc)

    deep = summary["testimony_segments"]
    assert deep["exists"] is True
    assert deep["segment_count"] == 1
    assert deep["counts_by_segment_type"] == {"direct_survivor_testimony": 1}
    assert deep["high_sensitivity_count"] == 1
    assert deep["contains_sensitive_text"] is False
    assert "I was told" not in json.dumps(deep)


def test_segments_sidecar_accepts_about_testimony_not_testimony():
    rows = [{
        "status": "succeeded",
        "candidate_id": "candidate-1",
        "model_name": "core-gemma",
        "analysis": {
            "candidate_assessment": {
                "is_testimony": False,
                "assessment": "about_testimony_not_testimony",
                "recommended_review_state": "rejected",
                "reason": "This identifies an editor of stories, not a speaker testimony.",
            },
            "segments": [{
                "segment_id": "segment-1",
                "segment_type": "about_testimony_not_testimony",
                "summary": "Contextual note about testimony collection.",
                "public_recommendation": {"public_display": False, "sensitivity": "medium"},
            }],
        },
    }]

    payload = build_segments_sidecar("doc-1", rows, {"candidate_count": 1})

    assert payload["segment_count"] == 1
    assert payload["assessments"][0]["assessment"] == "about_testimony_not_testimony"


def test_testimony_deep_review_cli_dry_run(monkeypatch, tmp_path):
    corpus = tmp_path / "corpus"
    exports = tmp_path / "exports"
    _doc(tmp_path)
    monkeypatch.setattr("runner.main.load_config", lambda *a, **kw: _Config(corpus, exports))

    result = CliRunner().invoke(app, ["testimony-deep-review", "doc-testimony", "--dry-run"])

    assert result.exit_code == 0, result.output
    assert "Testimony deep review prepared" in result.output
