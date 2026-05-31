import json
import sys
import types

from runner.config import Config
from runner.models.document import AnalysisResult, PreprocessResult
from runner.pipeline import analyze
from runner.pipeline.analyze import _validate_response, _build_user_message


def _minimal_payload(**overrides):
    payload = {
        "type": "Anti-SOGICE",
        "format": "Blog-Post",
        "evidence": ["The article argues against conversion therapy bans."],
        "scope": "Core",
        "narrative_register": "Legal-Policy",
        "summary": "A short summary.",
        "confidence": {"overall_score": 0.85, "status": "high"},
    }
    payload.update(overrides)
    return payload


def test_normalise_llm_output_records_key_alias_and_scalar_fixes():
    result = AnalysisResult.model_validate(
        {
            "TYPE": ["Anti-SOGICE"],
            "FORMAT": "Blog-Post",
            "evidence": ["The article argues against conversion therapy bans."],
            "SCOPE": ["Core"],
            "NARRATIVE REGISTER": ["Legal-Policy"],
            "research_summary": "A short summary.",
            "confidence_model": {
                "status": "medium",
                "overall": 0.72,
                "field_scores": {"type": 0.8, "format": 0.7},
            },
        }
    )

    assert result.type == "Anti-SOGICE"
    assert result.scope == "Core"
    assert result.summary == "A short summary."
    assert result.confidence.overall_score == 0.72
    assert result.field_confidence.type == 0.8
    assert any("TYPE" in warning for warning in result.normalisation_warnings)
    assert any("research_summary" in warning for warning in result.normalisation_warnings)
    assert any("confidence.overall" in warning for warning in result.normalisation_warnings)
    assert any("single-item list" in warning for warning in result.normalisation_warnings)


def test_canonical_analysis_payload_has_no_normalisation_warnings():
    result = AnalysisResult.model_validate(_minimal_payload())

    assert result.normalisation_warnings == []


# ---------------------------------------------------------------------------
# DS-1: languages field
# ---------------------------------------------------------------------------

def test_languages_field_defaults_to_empty_list():
    """Old analysis.json files without a languages key produce an empty list."""
    result = AnalysisResult.model_validate(_minimal_payload())

    assert result.languages == []


def test_languages_null_coerced_to_empty_list():
    result = AnalysisResult.model_validate(_minimal_payload(languages=None))

    assert result.languages == []
    assert any("null" in w and "languages" in w for w in result.normalisation_warnings)


def test_languages_scalar_string_coerced_to_list():
    result = AnalysisResult.model_validate(_minimal_payload(languages="en"))

    assert result.languages == ["en"]
    assert any("scalar" in w and "languages" in w for w in result.normalisation_warnings)


def test_languages_list_preserved():
    result = AnalysisResult.model_validate(_minimal_payload(languages=["en", "fr"]))

    assert result.languages == ["en", "fr"]
    assert not any("languages" in w for w in result.normalisation_warnings)


def test_languages_in_model_dump_json():
    """languages must appear in the serialised dict so analysis.json contains it."""
    import json as _json

    result = AnalysisResult.model_validate(_minimal_payload(languages=["de"]))
    dumped = _json.loads(result.model_dump_json())

    assert dumped["languages"] == ["de"]


def test_languages_absent_from_payload_yields_empty_list_without_warning():
    """Completely omitting the key (old documents) should be silent."""
    payload = _minimal_payload()
    payload.pop("languages", None)
    result = AnalysisResult.model_validate(payload)

    assert result.languages == []
    assert not any("languages" in w for w in result.normalisation_warnings)


def test_validate_response_extracts_json_from_markdown_fence():
    payload = _minimal_payload(summary="Extracted from a fenced response.")
    raw = "```json\n" + json.dumps(payload) + "\n```"

    result = _validate_response(raw)

    assert result.summary == "Extracted from a fenced response."


def test_validate_response_extracts_json_outside_think_tags():
    payload = _minimal_payload(summary="Extracted outside reasoning tags.")
    raw = "<think>private reasoning only</think>\n" + json.dumps(payload)

    result = _validate_response(raw)

    assert result.summary == "Extracted outside reasoning tags."


def test_build_system_prompt_splits_static_and_dynamic_for_claude(monkeypatch, tmp_path):
    config = Config(
        anthropic_api_key="",
        sanity_project_id="project",
        sanity_dataset="dataset",
        sanity_write_token="token",
        supabase_url="url",
        supabase_service_key="key",
        corpus_dir=tmp_path,
        exports_dir=tmp_path,
        ollama_base_url="",
        embedding_model="qwen3-embedding:8b",
        local_analysis_model="local",
        local_analysis_model_heavy="heavy",
        local_analysis_model_reasoning="reasoning",
        claude_model="claude",
        openrouter_api_key="",
        openrouter_model="",
        litelm_base_url="",
        litelm_api_key="",
        litelm_analysis_model="",
        litelm_analysis_model_heavy="",
        litelm_analysis_model_reasoning="",
        litelm_embedding_model="",
        litelm_enrichment_model="",
        litelm_enrichment_model_alt="",
        truncation_limit=24000,
        truncation_limit_local=200000,
    )
    monkeypatch.setattr(analyze, "_load_system_prompt", lambda: "STATIC PROMPT")
    monkeypatch.setattr(
        analyze,
        "_fetch_active_lexicon_terms",
        lambda _config: [{"term": "known term", "proposedCluster": "Policy-Resistance", "function": "Political Slogan"}],
    )

    static_prompt, dynamic_prompt = analyze._build_system_prompt_with_lexicon(
        config, split_for_claude=True
    )
    joined = analyze._build_system_prompt_with_lexicon(config)

    assert static_prompt == "STATIC PROMPT"
    assert "known term" in dynamic_prompt
    assert joined == static_prompt + dynamic_prompt


def test_analyze_with_claude_uses_config_max_tokens(monkeypatch, tmp_path):
    calls = {}

    class _Messages:
        def create(self, **kwargs):
            calls.update(kwargs)
            return types.SimpleNamespace(content=[types.SimpleNamespace(text=json.dumps(_minimal_payload()))])

    class _Anthropic:
        def __init__(self, api_key):
            self.api_key = api_key
            self.messages = _Messages()

    monkeypatch.setitem(sys.modules, "anthropic", types.SimpleNamespace(Anthropic=_Anthropic))
    monkeypatch.setattr(analyze, "_build_system_prompt_with_lexicon", lambda *_args, **_kwargs: ("STATIC", "DYNAMIC"))

    config = _make_config(tmp_path)
    config.claude_output_tokens = 12345
    preprocess = PreprocessResult(doc_id="doc-1", tool_used="test", quality="high", text="Document text")

    result = analyze._analyze_with_claude(preprocess, config)

    assert result.type == "Anti-SOGICE"
    assert calls["max_tokens"] == 12345


def _make_config(tmp_path):
    return Config(
        anthropic_api_key="",
        sanity_project_id="project",
        sanity_dataset="dataset",
        sanity_write_token="token",
        supabase_url="url",
        supabase_service_key="key",
        corpus_dir=tmp_path,
        exports_dir=tmp_path,
        ollama_base_url="",
        embedding_model="qwen3-embedding:8b",
        local_analysis_model="local",
        local_analysis_model_heavy="heavy",
        local_analysis_model_reasoning="reasoning",
        claude_model="claude",
        openrouter_api_key="",
        openrouter_model="",
        litelm_base_url="",
        litelm_api_key="",
        litelm_analysis_model="",
        litelm_analysis_model_heavy="",
        litelm_analysis_model_reasoning="",
        litelm_embedding_model="",
        litelm_enrichment_model="",
        litelm_enrichment_model_alt="",
        truncation_limit=24000,
        truncation_limit_local=200000,
    )


def test_lexicon_injection_capped_at_200(monkeypatch, tmp_path, caplog):
    import logging
    config = _make_config(tmp_path)
    monkeypatch.setattr(analyze, "_load_system_prompt", lambda: "PROMPT")
    big_lexicon = [
        {"term": f"term-{i}", "proposedCluster": "Cluster", "function": "fn"}
        for i in range(250)
    ]
    monkeypatch.setattr(analyze, "_fetch_active_lexicon_terms", lambda _: big_lexicon)

    with caplog.at_level(logging.WARNING, logger="runner.pipeline.analyze"):
        prompt = analyze._build_system_prompt_with_lexicon(config)

    # At most 200 terms must appear in the prompt
    term_count = sum(1 for i in range(250) if f"term-{i}" in prompt)
    assert term_count == 200
    assert "capping injection at 200" in caplog.text


def test_lexicon_injection_no_cap_when_under_200(monkeypatch, tmp_path, caplog):
    import logging
    config = _make_config(tmp_path)
    monkeypatch.setattr(analyze, "_load_system_prompt", lambda: "PROMPT")
    small_lexicon = [
        {"term": f"term-{i}", "proposedCluster": "Cluster", "function": "fn"}
        for i in range(50)
    ]
    monkeypatch.setattr(analyze, "_fetch_active_lexicon_terms", lambda _: small_lexicon)

    with caplog.at_level(logging.WARNING, logger="runner.pipeline.analyze"):
        prompt = analyze._build_system_prompt_with_lexicon(config)

    term_count = sum(1 for i in range(50) if f"term-{i}" in prompt)
    assert term_count == 50
    assert "capping injection" not in caplog.text


# ── _build_user_message intake context (C2) ──────────────────────────────────

def _minimal_preprocess(**kwargs) -> PreprocessResult:
    defaults = dict(
        doc_id="doc-test",
        tool_used="trafilatura",
        quality="high",
        text="Some document text.",
    )
    defaults.update(kwargs)
    return PreprocessResult(**defaults)


def test_build_user_message_includes_declared_type():
    preprocess = _minimal_preprocess(intake_declared_type="Anti-SOGICE")
    msg = _build_user_message(preprocess)
    assert "RESEARCHER-DECLARED TYPE: Anti-SOGICE" in msg


def test_build_user_message_includes_batch_id():
    preprocess = _minimal_preprocess(intake_batch_id="batch-07")
    msg = _build_user_message(preprocess)
    assert "BATCH ID: batch-07" in msg


def test_build_user_message_includes_source_url():
    preprocess = _minimal_preprocess(intake_source_url="https://example.org/doc.pdf")
    msg = _build_user_message(preprocess)
    assert "CANONICAL SOURCE URL: https://example.org/doc.pdf" in msg


def test_build_user_message_no_intake_context_by_default():
    preprocess = _minimal_preprocess()
    msg = _build_user_message(preprocess)
    assert "RESEARCHER INTAKE CONTEXT" not in msg
    assert "RESEARCHER-DECLARED TYPE" not in msg


def test_build_user_message_partial_context():
    preprocess = _minimal_preprocess(intake_declared_type="Testimony", intake_batch_id="b-01")
    msg = _build_user_message(preprocess)
    assert "RESEARCHER-DECLARED TYPE: Testimony" in msg
    assert "BATCH ID: b-01" in msg
    assert "CANONICAL SOURCE URL" not in msg


# ── Model validators (F3, F6, F7, F8) ────────────────────────────────────────

def _high_confidence_payload(**overrides):
    base = _minimal_payload()
    base.update(overrides)
    return base


def test_anti_sogice_with_term_emits_normalisation_warning():
    result = AnalysisResult.model_validate(
        _high_confidence_payload(
            type="Anti-SOGICE",
            term=["Reparative Therapy"],
        )
    )
    assert any("non-promotional document type" in w for w in result.normalisation_warnings)


def test_neutral_academic_with_term_emits_normalisation_warning():
    result = AnalysisResult.model_validate(
        _high_confidence_payload(type="Neutral-Academic", term=["Reintegrative Therapy"])
    )
    assert any("non-promotional document type" in w for w in result.normalisation_warnings)


def test_pro_sogice_with_term_has_no_type_warning():
    result = AnalysisResult.model_validate(
        _high_confidence_payload(type="Pro-SOGICE", term=["Reparative Therapy"])
    )
    assert not any("non-promotional document type" in w for w in result.normalisation_warnings)


def test_low_confidence_forces_needs_review():
    result = AnalysisResult.model_validate(
        _minimal_payload(
            needs_review=False,
            confidence={"overall_score": 0.55, "status": "low"},
        )
    )
    assert result.needs_review is True
    assert any("needs_review forced" in w for w in result.normalisation_warnings)


def test_high_confidence_does_not_force_needs_review():
    result = AnalysisResult.model_validate(
        _minimal_payload(
            needs_review=False,
            confidence={"overall_score": 0.85, "status": "high"},
        )
    )
    assert result.needs_review is False


def test_exactly_at_threshold_does_not_force_needs_review():
    result = AnalysisResult.model_validate(
        _minimal_payload(
            needs_review=False,
            confidence={"overall_score": 0.70, "status": "medium"},
        )
    )
    assert result.needs_review is False


def test_unknown_tactic_emits_vocab_warning():
    result = AnalysisResult.model_validate(
        _high_confidence_payload(tactic=["UnknownTacticXYZ"])
    )
    assert any("tactic" in w and "vocab-warn" in w for w in result.normalisation_warnings)


def test_known_tactic_prefix_no_warning():
    result = AnalysisResult.model_validate(
        _high_confidence_payload(tactic=["Tactic:Religious-Freedom-Shield"])
    )
    assert not any("tactic" in w and "vocab-warn" in w for w in result.normalisation_warnings)


def test_unknown_landmark_emits_vocab_warning():
    result = AnalysisResult.model_validate(
        _high_confidence_payload(landmark=["UnknownLandmarkXYZ"])
    )
    assert any("landmark" in w and "vocab-warn" in w for w in result.normalisation_warnings)


def test_term_use_context_contradiction_emits_warning():
    result = AnalysisResult.model_validate(
        _high_confidence_payload(
            type="Pro-SOGICE",
            term=["Reparative Therapy"],
            term_use_context=[{"term": "Reparative Therapy", "use": "critical", "quote": "criticized it"}],
        )
    )
    assert any("Resolve the contradiction" in w for w in result.normalisation_warnings)


def test_term_use_context_promotional_no_contradiction():
    result = AnalysisResult.model_validate(
        _high_confidence_payload(
            type="Pro-SOGICE",
            term=["Reparative Therapy"],
            term_use_context=[{"term": "Reparative Therapy", "use": "promotional", "quote": "..."}],
        )
    )
    assert not any("Resolve the contradiction" in w for w in result.normalisation_warnings)


# ── End-aware truncation (D6) ─────────────────────────────────────────────────

def test_maybe_truncate_passthrough_when_under_limit():
    from runner.pipeline.preprocess import _maybe_truncate
    text = "a" * 1000
    result, truncated = _maybe_truncate(text, limit=2000)
    assert result == text
    assert truncated is False


def test_maybe_truncate_no_op_when_limit_zero():
    from runner.pipeline.preprocess import _maybe_truncate
    text = "a" * 50000
    result, truncated = _maybe_truncate(text, limit=0)
    assert result == text
    assert truncated is False


def test_maybe_truncate_includes_beginning_and_end():
    from runner.pipeline.preprocess import _maybe_truncate
    head = "START " * 3000
    tail = "END " * 2000
    middle = "MIDDLE " * 5000
    text = head + middle + tail
    result, truncated = _maybe_truncate(text, limit=22000, head_chars=16000, tail_chars=6000)
    assert truncated is True
    assert result.startswith("START")
    assert "END" in result
    assert "[TRUNCATED MIDDLE" in result
    assert "omitted]" in result


def test_maybe_truncate_marker_shows_omitted_count():
    from runner.pipeline.preprocess import _maybe_truncate
    text = "X" * 30000
    result, _ = _maybe_truncate(text, limit=22000, head_chars=16000, tail_chars=6000)
    omitted = 30000 - 16000 - 6000
    assert f"{omitted:,}" in result
