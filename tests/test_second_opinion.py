from dataclasses import dataclass
import json

from runner.models.document import AnalysisResult
from runner.pipeline import second_opinion


@dataclass
class _Config:
    corpus_dir: object
    litelm_analysis_model: str = "core-qwen"
    litelm_analysis_model_heavy: str = "core-gemma"
    litelm_analysis_model_reasoning: str = "review-qwen"
    local_analysis_model: str = "qwen"
    local_analysis_model_heavy: str = "gemma"
    local_analysis_model_reasoning: str = "reasoning"
    claude_model: str = "claude"
    local_context_tokens: int = 8192
    local_output_tokens: int = 4096
    litelm_base_url: str = ""
    litelm_api_key: str = ""
    ollama_base_url: str = ""
    anthropic_api_key: str = ""


def _analysis(doc_type: str = "Mixed", confidence: float = 0.65) -> AnalysisResult:
    return AnalysisResult.model_validate(
        {
            "type": doc_type,
            "format": "Video",
            "evidence": ["Example evidence."],
            "scope": "Core",
            "narrative_register": "Testimonial-Personal",
            "summary": f"{doc_type} summary.",
            "confidence": {"overall_score": confidence, "status": "medium"},
            "tactic": ["Pastoral-Coercion"],
            "country": ["UK"],
        }
    )


def _doc(tmp_path):
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "analysis.json").write_text(_analysis().model_dump_json(indent=2), encoding="utf-8")
    (doc_dir / "extracted.txt").write_text("source text", encoding="utf-8")
    (doc_dir / "metadata.json").write_text('{"llm_used": "litelm"}', encoding="utf-8")
    return doc_dir


def test_run_second_opinion_saves_alt_and_comparison_without_overwrite(tmp_path, monkeypatch):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = _doc(tmp_path)
    original_text = (doc_dir / "analysis.json").read_text(encoding="utf-8")

    monkeypatch.setattr(
        second_opinion.analyze,
        "run",
        lambda preprocess, llm, config, **kwargs: _analysis("Pro-SOGICE", 0.88),
    )

    payload = second_opinion.run_second_opinion("doc-1", config, llm="litelm-reasoning")

    assert payload["alt_path"].name.startswith("analysis_alt_review-qwen_")
    assert payload["comparison_path"].name.startswith("analysis_comparison_")
    assert (doc_dir / "analysis.json").read_text(encoding="utf-8") == original_text
    comparison = payload["comparison"]
    assert comparison["outcome"] == "pending"
    assert "type" in comparison["fields_that_differed"]
    assert comparison["original_model"] == "litelm"
    assert comparison["second_opinion_model"] == "review-qwen"


def test_second_opinion_persists_content_free_paired_audit(tmp_path, monkeypatch):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = _doc(tmp_path)
    (doc_dir / "extracted.txt").write_text("sensitive testimony", encoding="utf-8")

    def _run(preprocess, llm, config, *, _audit=None):
        assert _audit is not None
        _audit.update({
            "llm_flag": llm,
            "model": "review-qwen",
            "input_receipt": {
                "schema_version": "resolved-model-input-v1",
                "exact": True,
                "request_sha256": "a" * 64,
                "extracted_text_sha256": "b" * 64,
            },
        })
        return _analysis("Pro-SOGICE", 0.88)

    monkeypatch.setattr(second_opinion.analyze, "run", _run)
    payload = second_opinion.run_second_opinion(
        "doc-1", config, llm="litelm-reasoning",
    )

    audit_path = payload["audit_path"]
    assert audit_path.name == f"audit_{payload['alt_path'].name}"
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    assert audit["artifact_file"] == payload["alt_path"].name
    assert len(audit["artifact_sha256"]) == 64
    assert audit["input_receipt"]["exact"] is True
    assert "sensitive testimony" not in audit_path.read_text(encoding="utf-8")
    assert not list(doc_dir.glob("analysis_alt_*audit*.json"))


def test_keep_original_records_decision_without_overwrite(tmp_path, monkeypatch):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = _doc(tmp_path)
    original_text = (doc_dir / "analysis.json").read_text(encoding="utf-8")
    monkeypatch.setattr(
        second_opinion.analyze,
        "run",
        lambda preprocess, llm, config, **kwargs: _analysis("Pro-SOGICE", 0.88),
    )
    payload = second_opinion.run_second_opinion("doc-1", config, llm="litelm-reasoning")

    decision = second_opinion.decide_second_opinion(
        "doc-1",
        payload["comparison_path"].name,
        "kept_original",
        config,
        researcher_note="Original better matched context.",
    )

    assert decision["outcome"] == "kept_original"
    assert decision["researcher_note"] == "Original better matched context."
    assert (doc_dir / "analysis.json").read_text(encoding="utf-8") == original_text


def test_adopt_alt_archives_original_and_promotes_alt(tmp_path, monkeypatch):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = _doc(tmp_path)
    monkeypatch.setattr(
        second_opinion.analyze,
        "run",
        lambda preprocess, llm, config, **kwargs: _analysis("Pro-SOGICE", 0.88),
    )
    payload = second_opinion.run_second_opinion("doc-1", config, llm="litelm-reasoning")

    decision = second_opinion.decide_second_opinion(
        "doc-1",
        payload["comparison_path"].name,
        "adopted_alt",
        config,
        researcher_note="Second opinion captured source stance.",
    )

    canonical = AnalysisResult.model_validate_json((doc_dir / "analysis.json").read_text(encoding="utf-8"))
    assert canonical.type == "Pro-SOGICE"
    assert decision["outcome"] == "adopted_alt"
    assert list(doc_dir.glob("analysis_*.json"))


def test_edited_decision_validates_and_promotes_edited_json(tmp_path, monkeypatch):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = _doc(tmp_path)
    monkeypatch.setattr(
        second_opinion.analyze,
        "run",
        lambda preprocess, llm, config, **kwargs: _analysis("Pro-SOGICE", 0.88),
    )
    payload = second_opinion.run_second_opinion("doc-1", config, llm="litelm-reasoning")
    edited = _analysis("Anti-SOGICE", 0.91)
    edited.summary = "Researcher edited summary."

    decision = second_opinion.decide_second_opinion(
        "doc-1",
        payload["comparison_path"].name,
        "edited",
        config,
        edited_json=edited.model_dump_json(indent=2),
    )

    canonical = json.loads((doc_dir / "analysis.json").read_text(encoding="utf-8"))
    assert canonical["summary"] == "Researcher edited summary."
    assert decision["outcome"] == "edited"
    assert decision["promoted_file"].startswith("analysis_edited_")


# ── Version stamping in alt and promoted files ────────────────────────────────

def test_second_opinion_alt_file_has_version_stamps(monkeypatch, tmp_path):
    from runner.pipeline.upload import PROMPT_VERSION, _ONTOLOGY_VERSION
    config = _Config(corpus_dir=tmp_path)
    doc_dir = _doc(tmp_path)

    alt_analysis = _analysis("Pro-SOGICE", 0.82)
    monkeypatch.setattr(second_opinion.analyze, "run", lambda *a, **kw: alt_analysis)
    monkeypatch.setattr(second_opinion.analyze, "enrich_preprocess_from_intake", lambda *a: None)

    payload = second_opinion.run_second_opinion("doc-1", config, llm="litelm-reasoning")
    alt_data = json.loads(payload["alt_path"].read_text(encoding="utf-8"))

    assert alt_data["prompt_version"] == PROMPT_VERSION
    assert alt_data["ontology_version"] == _ONTOLOGY_VERSION


def test_stamp_analysis_dict_adds_version_keys():
    from runner.pipeline.upload import _stamp_analysis_dict, PROMPT_VERSION, _ONTOLOGY_VERSION
    from runner.models.document import AnalysisResult
    analysis = AnalysisResult.model_validate({
        "type": "Anti-SOGICE",
        "format": "Blog-Post",
        "evidence": ["Evidence."],
        "scope": "Core",
        "narrative_register": "Legal-Policy",
        "summary": "Summary.",
        "confidence": {"overall_score": 0.85, "status": "high"},
    })
    stamped = _stamp_analysis_dict(analysis)
    assert stamped["prompt_version"] == PROMPT_VERSION
    assert stamped["ontology_version"] == _ONTOLOGY_VERSION
    assert stamped["type"] == "Anti-SOGICE"
