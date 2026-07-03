from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

from runner.models.document import AnalysisResult
from runner.pipeline import embedding_repair


def _config(tmp_path: Path) -> SimpleNamespace:
    return SimpleNamespace(
        corpus_dir=tmp_path,
        litelm_embedding_model="research-embedding",
        litelm_ollama_base_url="http://macstudio-ollama",
        litelm_ollama_embedding_model="qwen3-embedding:8b",
        embedding_model="local-embedding",
    )


def _analysis_json() -> str:
    analysis = AnalysisResult.model_validate({
        "type": "Anti-SOGICE",
        "format": "Blog-Post",
        "evidence": ["Evidence."],
        "scope": "Core",
        "narrative_register": "Legal-Policy",
        "summary": "Summary.",
        "confidence": {"overall_score": 0.86, "status": "high"},
    })
    return analysis.model_dump_json(indent=2)


def _doc(tmp_path: Path, doc_id: str = "doc1", *, pending: bool = True) -> Path:
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()
    (doc_dir / "analysis.json").write_text(_analysis_json(), encoding="utf-8")
    (doc_dir / "intake.json").write_text(
        json.dumps({"tier": 2, "language": "en"}),
        encoding="utf-8",
    )
    (doc_dir / "extracted.txt").write_text("Some text to embed.", encoding="utf-8")
    if pending:
        (doc_dir / "embedding_pending.json").write_text(
            json.dumps({"model": "research-embedding", "error": "500"}),
            encoding="utf-8",
        )
    return doc_dir


def test_repair_embedding_clears_pending_and_records_actual_model(tmp_path, monkeypatch):
    doc_dir = _doc(tmp_path)
    cfg = _config(tmp_path)

    monkeypatch.setattr(
        embedding_repair.embed,
        "run_litelm",
        lambda text, config: (_ for _ in ()).throw(RuntimeError("proxy down")),
    )
    monkeypatch.setattr(
        embedding_repair.embed,
        "_call",
        lambda base, model, text: [0.1, 0.2, 0.3],
    )

    result = embedding_repair.repair_embedding("doc1", cfg, route="auto")

    assert result.ok
    assert result.model == "qwen3-embedding:8b"
    assert result.dimension == 3
    assert not (doc_dir / "embedding_pending.json").exists()

    embedding = json.loads((doc_dir / "embedding.json").read_text(encoding="utf-8"))
    assert embedding["model"] == "qwen3-embedding:8b"
    assert embedding["vector"] == [0.1, 0.2, 0.3]

    repair = json.loads((doc_dir / "embedding_repair.json").read_text(encoding="utf-8"))
    assert repair["previous_pending"]["error"] == "500"
    assert any("litelm: failed" in item for item in repair["attempts"])

    metadata = json.loads((doc_dir / "metadata.json").read_text(encoding="utf-8"))
    assert metadata["embedding_model"] == "qwen3-embedding:8b"
    assert metadata["embedding_repaired_at"]


def test_repair_embedding_respects_no_overwrite(tmp_path, monkeypatch):
    doc_dir = _doc(tmp_path, pending=False)
    (doc_dir / "embedding.json").write_text(
        json.dumps({"model": "existing", "dimension": 1, "vector": [0.1]}),
        encoding="utf-8",
    )
    monkeypatch.setattr(embedding_repair.embed, "run", lambda text, config: [0.2])

    result = embedding_repair.repair_embedding("doc1", _config(tmp_path), overwrite=False)

    assert not result.ok
    assert "already exists" in result.message
    embedding = json.loads((doc_dir / "embedding.json").read_text(encoding="utf-8"))
    assert embedding["model"] == "existing"


def test_repair_embedding_requires_extracted_text(tmp_path):
    doc_dir = _doc(tmp_path)
    (doc_dir / "extracted.txt").unlink()

    result = embedding_repair.repair_embedding("doc1", _config(tmp_path))

    assert not result.ok
    assert "extracted.txt missing" in result.message


def test_repair_embedding_can_push_to_supabase(tmp_path, monkeypatch):
    _doc(tmp_path, pending=False)
    cfg = _config(tmp_path)
    calls: list[dict] = []

    monkeypatch.setattr(embedding_repair.embed, "run_litelm", lambda text, config: [0.1, 0.2])

    def _fake_upsert(doc_id, vector, analysis, config, tier, language, embedding_model):
        calls.append({
            "doc_id": doc_id,
            "vector": vector,
            "tier": tier,
            "language": language,
            "embedding_model": embedding_model,
        })

    from runner.clients import supabase as supabase_client

    monkeypatch.setattr(supabase_client, "upsert_embedding", _fake_upsert)

    result = embedding_repair.repair_embedding("doc1", cfg, route="litelm", push_supabase=True)

    assert result.ok
    assert result.supabase_ok
    assert calls == [{
        "doc_id": "doc1",
        "vector": [0.1, 0.2],
        "tier": "2",
        "language": "en",
        "embedding_model": "research-embedding",
    }]


def test_embedding_gap_rows_lists_missing_and_pending_only(tmp_path):
    _doc(tmp_path, "pending", pending=True)
    missing = _doc(tmp_path, "missing", pending=False)
    good = _doc(tmp_path, "good", pending=False)
    (good / "embedding.json").write_text(
        json.dumps({"model": "m", "dimension": 2, "vector": [0.1, 0.2]}),
        encoding="utf-8",
    )
    (missing / "embedding.json").write_text(
        json.dumps({"model": "m", "dimension": 0, "vector": []}),
        encoding="utf-8",
    )

    rows = embedding_repair.embedding_gap_rows(tmp_path)

    assert [row["doc_id"] for row in rows] == ["missing", "pending"]
    assert rows[0]["pending"] is False
    assert rows[1]["pending"] is True
