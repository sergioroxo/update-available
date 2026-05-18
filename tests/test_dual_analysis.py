"""Tests for DualAnalysisResult (Item C5)."""
from __future__ import annotations
from dataclasses import dataclass
from unittest.mock import patch

from runner.models.document import AnalysisResult, PreprocessResult
from runner.pipeline.analyze import DualAnalysisResult
from runner.pipeline import review


@dataclass
class _Config:
    corpus_dir: object
    litelm_analysis_model: str = "core-qwen"
    litelm_analysis_model_heavy: str = "core-gemma"
    litelm_analysis_model_reasoning: str = "review-qwen"
    local_analysis_model: str = "qwen"
    local_analysis_model_heavy: str = "gemma"
    local_analysis_model_reasoning: str = "reasoning"
    claude_model: str = "claude-sonnet-4-6"
    local_context_tokens: int = 8192
    local_output_tokens: int = 4096
    litelm_base_url: str = ""
    litelm_api_key: str = ""
    ollama_base_url: str = ""
    anthropic_api_key: str = ""
    openrouter_api_key: str = ""
    openrouter_model: str = ""
    claude_output_tokens: int = 4096


def _make_analysis(doc_type: str = "Anti-SOGICE", confidence: float = 0.85) -> AnalysisResult:
    return AnalysisResult.model_validate(
        {
            "type": doc_type,
            "format": "Blog-Post",
            "evidence": ["Some evidence."],
            "scope": "Core",
            "narrative_register": "Legal-Policy",
            "summary": f"{doc_type} summary.",
            "confidence": {"overall_score": confidence, "status": "high"},
        }
    )


def _make_preprocess() -> PreprocessResult:
    return PreprocessResult(
        doc_id="doc-test",
        tool_used="trafilatura",
        quality="good",
        text="hello",
    )


# ── Test 1 ──────────────────────────────────────────────────────────────────

def test_dual_analysis_result_has_primary_and_comparison():
    primary = _make_analysis("Anti-SOGICE", 0.9)
    comparison = _make_analysis("Pro-SOGICE", 0.7)
    dual = DualAnalysisResult(primary=primary, comparison=comparison)

    assert dual.primary is primary
    assert dual.comparison is comparison
    assert dual.primary.type == "Anti-SOGICE"
    assert dual.comparison.type == "Pro-SOGICE"


# ── Test 2 ──────────────────────────────────────────────────────────────────

def test_run_both_returns_dual_analysis_result(tmp_path):
    from runner.pipeline import analyze

    config = _Config(corpus_dir=tmp_path)
    preprocess = _make_preprocess()

    claude_result = _make_analysis("Anti-SOGICE", 0.9)
    local_result = _make_analysis("Pro-SOGICE", 0.6)

    with (
        patch.object(analyze, "_analyze_with_claude", return_value=claude_result) as mock_claude,
        patch.object(analyze, "_analyze_with_ollama", return_value=local_result) as mock_ollama,
        patch.object(analyze, "_build_system_prompt_with_lexicon", return_value="prompt"),
    ):
        result = analyze.run(preprocess, "both", config)

    assert isinstance(result, DualAnalysisResult)
    assert result.primary is claude_result
    assert result.comparison is local_result
    mock_claude.assert_called_once()
    mock_ollama.assert_called_once()


# ── Test 3 ──────────────────────────────────────────────────────────────────

def test_checkpoint_analysis_unwraps_dual_result():
    primary = _make_analysis("Anti-SOGICE", 0.9)
    comparison = _make_analysis("Pro-SOGICE", 0.6)
    dual = DualAnalysisResult(primary=primary, comparison=comparison)

    returned = review.checkpoint_analysis(dual, doc_id="doc-test", yes=True)

    assert isinstance(returned, AnalysisResult)
    assert not isinstance(returned, DualAnalysisResult)
    assert returned is primary


# ── Test 4 ──────────────────────────────────────────────────────────────────

def test_checkpoint_analysis_passthrough_for_plain_result():
    plain = _make_analysis("Mixed", 0.75)

    returned = review.checkpoint_analysis(plain, doc_id="doc-test", yes=True)

    assert returned is plain
