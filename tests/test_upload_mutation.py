import json

import click
import pytest

from runner.clients.sanity import _build_sanity_document
from runner.models.document import (
    AnalysisResult,
    DocumentPackage,
    IntakeResult,
    PreprocessResult,
)
from runner.pipeline import analyze
from runner.pipeline.upload import _enforce_testimony_upload_gate, requires_consent_gate


def _analysis() -> AnalysisResult:
    return AnalysisResult.model_validate(
        {
            "type": "Anti-SOGICE",
            "format": "Blog-Post",
            "evidence": ["The document discusses opposition to conversion therapy."],
            "scope": "Core",
            "narrative_register": "Legal-Policy",
            "summary": "A short summary.",
        }
    )


def _testimony_analysis() -> AnalysisResult:
    result = _analysis()
    result.testimony_flag = True
    return result


def test_build_sanity_document_preserves_local_file_source_url_and_hash(tmp_path):
    intake = IntakeResult(
        doc_id="doc-1",
        source="/tmp/source.pdf",
        source_type="pdf",
        declared_type="pdf",
        tier=2,
        batch_id="batch-1",
        language=None,
        source_url="https://example.org/source.pdf",
        original_filename="source.pdf",
        local_copy_path=str(tmp_path / "source.pdf"),
        local_dir=tmp_path,
    )
    preprocess = PreprocessResult(
        doc_id="doc-1",
        tool_used="docling",
        quality="high",
        text="one two three",
        title="Document Title",
        source_html_sha256="b" * 64,
    )
    pkg = DocumentPackage(
        intake=intake,
        preprocess=preprocess,
        analysis=_analysis(),
        embedding=[],
        embedding_model="embedding-model",
        llm_used="litelm",
        local_dir=tmp_path,
    )

    doc = _build_sanity_document(pkg)

    assert doc["_type"] == "sogiceDocument"
    assert doc["meta"]["sourceUrl"] == "https://example.org/source.pdf"
    assert doc["content"]["title"] == "Document Title"
    assert doc["provenance"]["originalUrl"] == "https://example.org/source.pdf"
    assert doc["provenance"]["htmlSnapshotHash"] == "b" * 64
    assert "testimonyReview" not in doc


def test_analyze_save_stamps_versions(tmp_path):
    config = type("Config", (), {"corpus_dir": tmp_path})()
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()

    analyze.save("doc-1", _analysis(), config)

    payload = json.loads((doc_dir / "analysis.json").read_text())
    assert payload["prompt_version"]
    assert payload["ontology_version"]


def test_build_sanity_document_uses_stable_ingest_and_analysis_dates(tmp_path):
    (tmp_path / "metadata.json").write_text('{"saved_at": "2024-02-03T04:05:06+00:00"}')
    intake = IntakeResult(
        doc_id="doc-1",
        source="https://example.org/source",
        source_type="url",
        declared_type="url",
        tier=2,
        batch_id="batch-1",
        language=None,
        ingested_at="2024-01-02T03:04:05+00:00",
        local_dir=tmp_path,
    )
    preprocess = PreprocessResult(
        doc_id="doc-1",
        tool_used="trafilatura",
        quality="high",
        text="one two three",
    )
    pkg = DocumentPackage(
        intake=intake,
        preprocess=preprocess,
        analysis=_analysis(),
        embedding=[],
        embedding_model="embedding-model",
        llm_used="litelm",
        local_dir=tmp_path,
    )

    doc = _build_sanity_document(pkg)

    assert doc["meta"]["ingestedAt"] == "2024-01-02T03:04:05+00:00"
    assert doc["aiMetadata"]["processingDate"] == "2024-02-03T04:05:06+00:00"
    assert doc["aiMetadata"]["analysedAt"] == "2024-02-03T04:05:06+00:00"


def test_build_sanity_document_adds_testimony_consent_when_flagged(tmp_path):
    intake = IntakeResult(
        doc_id="doc-1",
        source="https://example.org/testimony",
        source_type="url",
        declared_type="url",
        tier=2,
        batch_id="batch-1",
        language=None,
        testimony_consent="confirmed",
        local_dir=tmp_path,
    )
    preprocess = PreprocessResult(
        doc_id="doc-1",
        tool_used="trafilatura",
        quality="high",
        text="one two three",
    )
    pkg = DocumentPackage(
        intake=intake,
        preprocess=preprocess,
        analysis=_testimony_analysis(),
        embedding=[],
        embedding_model="embedding-model",
        llm_used="claude",
        local_dir=tmp_path,
    )

    doc = _build_sanity_document(pkg)

    assert doc["meta"]["testimonyConsent"] == "confirmed"


def test_build_sanity_document_maps_media_metadata_without_raw_snapshot(tmp_path):
    intake = IntakeResult(
        doc_id="doc-1",
        source="https://www.youtube.com/watch?v=abc",
        source_type="url",
        declared_type="url",
        tier=2,
        batch_id="batch-1",
        language=None,
        local_dir=tmp_path,
    )
    preprocess = PreprocessResult(
        doc_id="doc-1",
        tool_used="yt-dlp",
        quality="high",
        text="one two three",
        media_metadata={
            "mediaMode": "video",
            "general": {
                "channelUrl": "https://www.youtube.com/@example",
                "channelHandle": "@example",
                "likeCount": 1200,
                "commentCount": 345,
                "availability": "public",
            },
            "platformDistribution": [
                {
                    "platform": "youtube",
                    "url": "https://www.youtube.com/watch?v=abc",
                    "status": "active",
                }
            ],
            "platformAlgorithmicSignals": {
                "tags": ["ex-gay"],
                "chapters": [{"title": "Intro", "startTime": 0}],
            },
            "rawYtDlpMetadata": {"id": "abc"},
        },
    )
    pkg = DocumentPackage(
        intake=intake,
        preprocess=preprocess,
        analysis=_analysis(),
        embedding=[],
        embedding_model="embedding-model",
        llm_used="litelm",
        local_dir=tmp_path,
    )

    doc = _build_sanity_document(pkg)

    assert doc["mediaMetadata"]["mediaMode"] == "video"
    assert doc["mediaMetadata"]["general"]["channelUrl"] == "https://www.youtube.com/@example"
    assert doc["mediaMetadata"]["general"]["channelHandle"] == "@example"
    assert doc["mediaMetadata"]["general"]["likeCount"] == 1200
    assert doc["mediaMetadata"]["general"]["commentCount"] == 345
    assert doc["mediaMetadata"]["general"]["availability"] == "public"
    assert "rawYtDlpMetadata" not in doc["mediaMetadata"]
    assert doc["mediaMetadata"]["platformDistribution"][0]["_key"]
    assert doc["mediaMetadata"]["platformAlgorithmicSignals"]["chapters"][0]["_key"]
    assert doc["aiMetadata"]["processingDate"] == doc["aiMetadata"]["analysedAt"]


def _make_intake(tmp_path) -> IntakeResult:
    return IntakeResult(
        doc_id="doc-1",
        source="https://example.org/doc",
        source_type="url",
        declared_type="url",
        tier=2,
        batch_id="batch-1",
        language=None,
        local_dir=tmp_path,
    )


def _typed_analysis(doc_type: str) -> AnalysisResult:
    return AnalysisResult.model_validate({
        "type": doc_type,
        "format": "Blog-Post",
        "evidence": ["Evidence text."],
        "scope": "Core",
        "narrative_register": "Testimonial-Personal",
        "summary": "A short summary.",
    })


# ── requires_consent_gate ───────────────────────────────────────────────────

def test_requires_consent_gate_on_testimony_flag():
    analysis = _testimony_analysis()
    assert requires_consent_gate(analysis) is True


def test_requires_consent_gate_on_testimony_type():
    analysis = _typed_analysis("Testimony")
    assert analysis.testimony_flag is False  # flag NOT set
    assert requires_consent_gate(analysis) is True


def test_requires_consent_gate_on_survivor_network_type():
    analysis = _typed_analysis("Survivor-Network-Material")
    assert analysis.testimony_flag is False
    assert requires_consent_gate(analysis) is True


def test_requires_consent_gate_false_for_normal_type():
    analysis = _typed_analysis("Anti-SOGICE")
    assert analysis.testimony_flag is False
    assert requires_consent_gate(analysis) is False


def test_requires_consent_gate_on_primary_type():
    analysis = _typed_analysis("Mixed")
    analysis.primary_type = "Testimony"
    assert requires_consent_gate(analysis) is True


# ── _enforce_testimony_upload_gate ──────────────────────────────────────────

def test_testimony_upload_gate_blocks_missing_consent(tmp_path):
    intake = _make_intake(tmp_path)
    with pytest.raises(click.exceptions.Exit):
        _enforce_testimony_upload_gate(intake, _testimony_analysis())


def test_gate_blocks_testimony_type_without_flag(tmp_path):
    """type=Testimony must be blocked even when testimony_flag is False."""
    intake = _make_intake(tmp_path)
    analysis = _typed_analysis("Testimony")
    assert analysis.testimony_flag is False
    with pytest.raises(click.exceptions.Exit):
        _enforce_testimony_upload_gate(intake, analysis)


def test_gate_blocks_survivor_network_type(tmp_path):
    """type=Survivor-Network-Material must be blocked without confirmed consent."""
    intake = _make_intake(tmp_path)
    analysis = _typed_analysis("Survivor-Network-Material")
    with pytest.raises(click.exceptions.Exit):
        _enforce_testimony_upload_gate(intake, analysis)


def test_gate_passes_with_confirmed_consent(tmp_path):
    """Confirmed consent clears the gate for all gated types."""
    intake = _make_intake(tmp_path)
    intake.testimony_consent = "confirmed"
    # Should not raise for any gated combination
    _enforce_testimony_upload_gate(intake, _testimony_analysis())
    _enforce_testimony_upload_gate(intake, _typed_analysis("Testimony"))
    _enforce_testimony_upload_gate(intake, _typed_analysis("Survivor-Network-Material"))


def test_gate_does_not_block_non_gated_type(tmp_path):
    """Normal documents must never be blocked by the consent gate."""
    intake = _make_intake(tmp_path)
    _enforce_testimony_upload_gate(intake, _typed_analysis("Anti-SOGICE"))
    _enforce_testimony_upload_gate(intake, _typed_analysis("Pro-SOGICE"))
    _enforce_testimony_upload_gate(intake, _typed_analysis("Media-Coverage"))


def test_testimony_gate_blocks_withdrawn_consent(tmp_path):
    intake = _make_intake(tmp_path)
    intake.testimony_consent = "withdrawn"

    with pytest.raises(click.exceptions.Exit):
        _enforce_testimony_upload_gate(intake, _testimony_analysis())


def test_testimony_gate_blocks_refused_consent(tmp_path):
    intake = _make_intake(tmp_path)
    intake.testimony_consent = "refused"

    with pytest.raises(click.exceptions.Exit):
        _enforce_testimony_upload_gate(intake, _testimony_analysis())


def test_prompt_version_imported_from_single_source():
    from runner.pipeline.analyze import PROMPT_VERSION as analyze_version
    from runner.pipeline.upload import PROMPT_VERSION as upload_version
    assert analyze_version == upload_version


def test_sanity_document_uses_prompt_version_from_analyze(tmp_path):
    from runner.pipeline.analyze import PROMPT_VERSION
    intake = IntakeResult(
        doc_id="doc-1",
        source="https://example.org/doc",
        source_type="url",
        declared_type="url",
        tier=2,
        batch_id="batch-1",
        language=None,
        local_dir=tmp_path,
    )
    preprocess = PreprocessResult(
        doc_id="doc-1",
        tool_used="trafilatura",
        quality="high",
        text="text",
    )
    pkg = DocumentPackage(
        intake=intake,
        preprocess=preprocess,
        analysis=_analysis(),
        embedding=[],
        embedding_model="test-model",
        llm_used="litelm",
        local_dir=tmp_path,
    )
    doc = _build_sanity_document(pkg)
    assert doc["aiMetadata"]["promptVersion"] == PROMPT_VERSION


def test_save_locally_stamps_prompt_and_ontology_version(tmp_path):
    from runner.config import Config
    from runner.pipeline.upload import save_locally, PROMPT_VERSION, _ONTOLOGY_VERSION

    config = Config(
        anthropic_api_key="",
        sanity_project_id="p",
        sanity_dataset="d",
        sanity_write_token="t",
        supabase_url="u",
        supabase_service_key="k",
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
    intake = IntakeResult(
        doc_id="doc-version-test",
        source="https://example.org/doc",
        source_type="url",
        declared_type="url",
        tier=2,
        batch_id="batch-1",
        language=None,
    )
    preprocess = PreprocessResult(
        doc_id="doc-version-test",
        tool_used="trafilatura",
        quality="high",
        text="text",
    )
    save_locally(intake, preprocess, [], _analysis(), config)

    analysis_file = tmp_path / "doc-version-test" / "analysis.json"
    data = json.loads(analysis_file.read_text())
    assert data["prompt_version"] == PROMPT_VERSION
    assert data["ontology_version"] == _ONTOLOGY_VERSION


# ── Consent sync: update_intake_consent ──────────────────────────────────────

def test_update_intake_consent_writes_to_intake_json(tmp_path):
    from runner.pipeline.intake import update_intake_consent
    from dataclasses import dataclass

    @dataclass
    class _Cfg:
        corpus_dir: object

    doc_dir = tmp_path / "doc-consent"
    doc_dir.mkdir()
    intake_path = doc_dir / "intake.json"
    intake_path.write_text('{"doc_id": "doc-consent"}', encoding="utf-8")

    cfg = _Cfg(corpus_dir=tmp_path)
    update_intake_consent("doc-consent", "confirmed", cfg)

    data = json.loads(intake_path.read_text(encoding="utf-8"))
    assert data["testimony_consent"] == "confirmed"
    assert "testimony_consent_updated_at" in data


def test_update_intake_consent_rejects_invalid_status(tmp_path):
    from runner.pipeline.intake import update_intake_consent
    from dataclasses import dataclass

    @dataclass
    class _Cfg:
        corpus_dir: object

    cfg = _Cfg(corpus_dir=tmp_path)
    with pytest.raises(ValueError, match="Invalid testimony consent status"):
        update_intake_consent("doc-x", "approved", cfg)


def test_update_intake_consent_all_valid_statuses(tmp_path):
    from runner.pipeline.intake import update_intake_consent
    from dataclasses import dataclass

    @dataclass
    class _Cfg:
        corpus_dir: object

    for status in ("unclear", "pending", "confirmed", "refused", "withdrawn"):
        doc_dir = tmp_path / f"doc-{status}"
        doc_dir.mkdir()
        intake_path = doc_dir / "intake.json"
        intake_path.write_text('{}', encoding="utf-8")
        update_intake_consent(f"doc-{status}", status, _Cfg(corpus_dir=tmp_path))
        data = json.loads(intake_path.read_text(encoding="utf-8"))
        assert data["testimony_consent"] == status


def test_update_intake_consent_no_op_when_intake_missing(tmp_path):
    """Should not raise if intake.json does not exist."""
    from runner.pipeline.intake import update_intake_consent
    from dataclasses import dataclass

    @dataclass
    class _Cfg:
        corpus_dir: object

    cfg = _Cfg(corpus_dir=tmp_path)
    # Should complete silently — no intake.json present
    update_intake_consent("nonexistent-doc", "confirmed", cfg)
