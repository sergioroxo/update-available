import json

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
