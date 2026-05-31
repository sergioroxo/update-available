"""Tests for embedding_model provenance fix in upload_saved() (Item A5) and
save_locally() embedding_model parameter (Item A2)."""
from __future__ import annotations
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Literal
from unittest.mock import MagicMock, patch

from runner.models.document import AnalysisResult, IntakeResult, PreprocessResult


@dataclass
class _Config:
    corpus_dir: Path
    embedding_model: str = "default-model"
    sanity_project_id: str = "testproj"
    sanity_dataset: str = "production"
    sanity_write_token: str = "token"
    supabase_url: str = "https://test.supabase.co"
    supabase_service_key: str = "key"
    ollama_base_url: str = ""
    litelm_base_url: str = ""
    litelm_api_key: str = ""
    anthropic_api_key: str = ""


def _write_doc_dir(
    tmp_path: Path,
    doc_id: str = "doc-embed-test",
    embedding_json_model: str | None = None,
    metadata_model: str = "old-model",
) -> Path:
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    analysis = AnalysisResult.model_validate({
        "type": "Anti-SOGICE",
        "format": "Blog-Post",
        "evidence": ["Evidence."],
        "scope": "Core",
        "narrative_register": "Legal-Policy",
        "summary": "Summary.",
        "confidence": {"overall_score": 0.85, "status": "high"},
    })
    (doc_dir / "analysis.json").write_text(analysis.model_dump_json(indent=2), encoding="utf-8")

    (doc_dir / "intake.json").write_text(
        json.dumps({"doc_id": doc_id, "source": "https://example.com", "testimony_consent": ""}),
        encoding="utf-8",
    )
    (doc_dir / "metadata.json").write_text(
        json.dumps({"llm_used": "litelm", "embedding_model": metadata_model, "saved_at": "2026-01-01T00:00:00+00:00"}),
        encoding="utf-8",
    )
    (doc_dir / "extracted.txt").write_text("source text", encoding="utf-8")

    vector = [0.1] * 10
    if embedding_json_model is not None:
        (doc_dir / "embedding.json").write_text(
            json.dumps({"model": embedding_json_model, "dimension": len(vector), "vector": vector}),
            encoding="utf-8",
        )
    else:
        # No embedding.json — test fallback path
        (doc_dir / "embedding.json").write_text(
            json.dumps({"model": None, "dimension": len(vector), "vector": vector}),
            encoding="utf-8",
        )

    return doc_dir


def _run_upload_saved_capture_model(tmp_path: Path, doc_id: str, config: _Config) -> str:
    """Run upload_saved() with mocked external calls and capture the embedding_model used."""
    from runner.pipeline import upload

    captured: dict = {}

    def _fake_upsert(doc_id, embedding, analysis, config, tier, language, embedding_model):
        captured["embedding_model"] = embedding_model

    def _fake_write_document(pkg, config):
        return "sanity-id-fake"

    def _fake_enforce(intake, analysis, triage_result=None):
        pass

    with (
        patch.object(upload.sanity_client, "write_document", side_effect=_fake_write_document),
        patch.object(upload.supabase_client, "upsert_embedding", side_effect=_fake_upsert),
        patch.object(upload, "_enforce_testimony_upload_gate", side_effect=_fake_enforce),
        patch.object(upload, "_repair_analysis_date_from_source", return_value=False),
    ):
        upload.upload_saved(doc_id, config)

    return captured.get("embedding_model", "")


def test_embedding_model_read_from_embedding_json_when_present(tmp_path):
    _write_doc_dir(
        tmp_path,
        doc_id="doc-embed-test",
        embedding_json_model="qwen3-embedding:8b",
        metadata_model="old-model",
    )
    config = _Config(corpus_dir=tmp_path)

    used_model = _run_upload_saved_capture_model(tmp_path, "doc-embed-test", config)
    assert used_model == "qwen3-embedding:8b"


def test_embedding_model_falls_back_to_metadata_json(tmp_path):
    # Write embedding.json with model=None to simulate missing model key in embedding.json
    doc_dir = _write_doc_dir(
        tmp_path,
        doc_id="doc-embed-fallback",
        embedding_json_model=None,  # model will be None in embedding.json
        metadata_model="metadata-model",
    )
    config = _Config(corpus_dir=tmp_path)

    used_model = _run_upload_saved_capture_model(tmp_path, "doc-embed-fallback", config)
    assert used_model == "metadata-model"


# ---------------------------------------------------------------------------
# Item A2 — save_locally() embedding_model parameter
# ---------------------------------------------------------------------------

def _make_analysis() -> AnalysisResult:
    return AnalysisResult.model_validate({
        "type": "Anti-SOGICE",
        "format": "Blog-Post",
        "evidence": ["Evidence."],
        "scope": "Core",
        "narrative_register": "Legal-Policy",
        "summary": "Summary.",
        "confidence": {"overall_score": 0.85, "status": "high"},
    })


def _make_intake(tmp_path: Path, doc_id: str = "doc-save-test") -> IntakeResult:
    return IntakeResult(
        doc_id=doc_id,
        source="https://example.com",
        source_type="url",
        declared_type="url",
        tier=1,
        batch_id="test",
        language=None,
        local_dir=tmp_path / doc_id,
    )


def _make_preprocess(doc_id: str = "doc-save-test") -> PreprocessResult:
    return PreprocessResult(
        doc_id=doc_id,
        tool_used="trafilatura",
        quality="high",
        text="Some extracted text.",
    )


def test_save_locally_writes_correct_embedding_model_for_litelm(tmp_path):
    """When embedding_model='research-embedding' is passed, embedding.json must record it."""
    from runner.pipeline.upload import save_locally

    config = _Config(corpus_dir=tmp_path)
    intake = _make_intake(tmp_path)
    preprocess = _make_preprocess()
    embedding = [0.1, 0.2, 0.3]

    save_locally(intake, preprocess, embedding, _make_analysis(), config,
                 llm_used="litelm", embedding_model="research-embedding")

    doc_dir = tmp_path / intake.doc_id
    data = json.loads((doc_dir / "embedding.json").read_text(encoding="utf-8"))
    assert data["model"] == "research-embedding"

    meta = json.loads((doc_dir / "metadata.json").read_text(encoding="utf-8"))
    assert meta["embedding_model"] == "research-embedding"


def test_save_locally_falls_back_to_config_embedding_model(tmp_path):
    """When embedding_model is not passed, save_locally uses config.embedding_model."""
    from runner.pipeline.upload import save_locally

    config = _Config(corpus_dir=tmp_path, embedding_model="config-model")
    intake = _make_intake(tmp_path, doc_id="doc-fallback")
    preprocess = _make_preprocess(doc_id="doc-fallback")
    embedding = [0.1, 0.2, 0.3]

    save_locally(intake, preprocess, embedding, _make_analysis(), config, llm_used="local")

    doc_dir = tmp_path / intake.doc_id
    data = json.loads((doc_dir / "embedding.json").read_text(encoding="utf-8"))
    assert data["model"] == "config-model"
