"""Repair missing or pending local document embeddings.

This module is deliberately small and side-effect scoped: it reads an existing
corpus document folder, regenerates ``embedding.json`` from ``extracted.txt``,
and optionally upserts the vector to Supabase. It does not upload documents to
Sanity and does not alter analysis/enrichment artifacts.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Literal

from ..config import Config
from ..models.document import AnalysisResult
from . import embed

EmbeddingRoute = Literal["auto", "litelm", "mac-studio-ollama", "local"]


@dataclass
class EmbeddingRepairResult:
    doc_id: str
    ok: bool
    local_ok: bool = False
    supabase_ok: bool = False
    model: str = ""
    dimension: int = 0
    attempts: list[str] = field(default_factory=list)
    message: str = ""


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _doc_dir(config: Config, doc_id: str) -> Path:
    return config.corpus_dir / doc_id


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def _embedding_exists(doc_dir: Path) -> bool:
    data = _read_json(doc_dir / "embedding.json")
    vector = data.get("vector") or data.get("embedding") or []
    try:
        dim = int(data.get("dimension") or len(vector))
    except Exception:
        dim = 0
    return bool(vector) and dim > 0


def _text_for_embedding(doc_dir: Path) -> str:
    extracted = doc_dir / "extracted.txt"
    if not extracted.exists():
        raise FileNotFoundError(f"extracted.txt missing for {doc_dir.name}")
    text = extracted.read_text(encoding="utf-8", errors="replace").strip()
    if not text:
        raise ValueError(f"extracted.txt is empty for {doc_dir.name}")
    return text


def _attempt_routes(route: EmbeddingRoute) -> list[EmbeddingRoute]:
    if route == "auto":
        return ["litelm", "mac-studio-ollama", "local"]
    return [route]


def _generate_with_route(text: str, config: Config, route: EmbeddingRoute) -> tuple[list[float], str]:
    if route == "litelm":
        return embed.run_litelm(text, config), getattr(config, "litelm_embedding_model", "") or "research-embedding"
    if route == "mac-studio-ollama":
        base = getattr(config, "litelm_ollama_base_url", "")
        model = getattr(config, "litelm_ollama_embedding_model", "") or getattr(config, "embedding_model", "")
        if not base:
            raise RuntimeError("LITELM_OLLAMA_BASE_URL / MAC_STUDIO_OLLAMA_URL is not configured")
        return embed._call(base, model, text), model
    if route == "local":
        return embed.run(text, config), getattr(config, "embedding_model", "")
    raise ValueError(f"unknown embedding route: {route}")


def _record_repair_metadata(
    doc_dir: Path,
    *,
    doc_id: str,
    model: str,
    dimension: int,
    attempts: list[str],
    previous_pending: dict[str, Any],
) -> None:
    payload = {
        "doc_id": doc_id,
        "repaired_at": _now_iso(),
        "model": model,
        "dimension": dimension,
        "attempts": attempts,
        "previous_pending": previous_pending or None,
    }
    _write_json(doc_dir / "embedding_repair.json", payload)

    metadata_path = doc_dir / "metadata.json"
    metadata = _read_json(metadata_path)
    metadata["embedding_model"] = model
    metadata["embedding_repaired_at"] = payload["repaired_at"]
    _write_json(metadata_path, metadata)


def push_embedding_to_supabase(doc_id: str, config: Config) -> EmbeddingRepairResult:
    """Push an existing local embedding.json to Supabase."""
    doc_dir = _doc_dir(config, doc_id)
    embedding = _read_json(doc_dir / "embedding.json")
    vector = embedding.get("vector") or embedding.get("embedding") or []
    if not vector:
        return EmbeddingRepairResult(doc_id=doc_id, ok=False, message="embedding.json is missing or empty")

    analysis_path = doc_dir / "analysis.json"
    if not analysis_path.exists():
        return EmbeddingRepairResult(doc_id=doc_id, ok=False, local_ok=True, message="analysis.json missing")

    try:
        from runner.clients import supabase as supabase_client

        analysis = AnalysisResult.model_validate_json(analysis_path.read_text(encoding="utf-8"))
        intake = _read_json(doc_dir / "intake.json")
        model = str(embedding.get("model") or getattr(config, "embedding_model", ""))
        supabase_client.upsert_embedding(
            doc_id,
            vector,
            analysis,
            config,
            tier=str(intake.get("tier", "")),
            language=str(intake.get("language") or ""),
            embedding_model=model,
        )
    except Exception as exc:  # noqa: BLE001
        return EmbeddingRepairResult(
            doc_id=doc_id,
            ok=False,
            local_ok=True,
            model=str(embedding.get("model") or ""),
            dimension=int(embedding.get("dimension") or len(vector)),
            message=f"Supabase push failed: {exc}",
        )

    return EmbeddingRepairResult(
        doc_id=doc_id,
        ok=True,
        local_ok=True,
        supabase_ok=True,
        model=str(embedding.get("model") or ""),
        dimension=int(embedding.get("dimension") or len(vector)),
        message="Embedding pushed to Supabase.",
    )


def repair_embedding(
    doc_id: str,
    config: Config,
    *,
    route: EmbeddingRoute = "auto",
    overwrite: bool = True,
    push_supabase: bool = False,
) -> EmbeddingRepairResult:
    """Regenerate ``embedding.json`` for an existing corpus document.

    ``route="auto"`` tries LiteLLM first, then the optional direct Mac Studio
    Ollama endpoint, then local Ollama. A successful local repair removes
    ``embedding_pending.json`` because the pending stage has been resolved.
    """
    doc_dir = _doc_dir(config, doc_id)
    if not doc_dir.exists():
        return EmbeddingRepairResult(doc_id=doc_id, ok=False, message=f"Document not found: {doc_id}")
    if not overwrite and _embedding_exists(doc_dir):
        return EmbeddingRepairResult(doc_id=doc_id, ok=False, message="embedding.json already exists")

    try:
        text = _text_for_embedding(doc_dir)
    except Exception as exc:  # noqa: BLE001
        return EmbeddingRepairResult(doc_id=doc_id, ok=False, message=str(exc))

    attempts: list[str] = []
    vector: list[float] = []
    model = ""
    for candidate in _attempt_routes(route):
        try:
            vector, model = _generate_with_route(text, config, candidate)
            if not isinstance(vector, list) or not vector:
                raise ValueError("embedding model returned an empty vector")
            attempts.append(f"{candidate}:{model}: ok ({len(vector)}d)")
            break
        except Exception as exc:  # noqa: BLE001
            attempts.append(f"{candidate}: failed: {exc}")

    if not vector:
        return EmbeddingRepairResult(
            doc_id=doc_id,
            ok=False,
            attempts=attempts,
            message="Embedding generation failed.",
        )

    pending_path = doc_dir / "embedding_pending.json"
    previous_pending = _read_json(pending_path)
    _write_json(doc_dir / "embedding.json", {
        "doc_id": doc_id,
        "model": model,
        "dimension": len(vector),
        "vector": vector,
    })
    _record_repair_metadata(
        doc_dir,
        doc_id=doc_id,
        model=model,
        dimension=len(vector),
        attempts=attempts,
        previous_pending=previous_pending,
    )
    if pending_path.exists():
        pending_path.unlink()

    if push_supabase:
        pushed = push_embedding_to_supabase(doc_id, config)
        if not pushed.ok:
            pushed.attempts = attempts
            pushed.local_ok = True
            pushed.model = model
            pushed.dimension = len(vector)
            return pushed
        return EmbeddingRepairResult(
            doc_id=doc_id,
            ok=True,
            local_ok=True,
            supabase_ok=True,
            model=model,
            dimension=len(vector),
            attempts=attempts,
            message=f"Embedding repaired ({len(vector)}d) and pushed to Supabase.",
        )

    return EmbeddingRepairResult(
        doc_id=doc_id,
        ok=True,
        local_ok=True,
        supabase_ok=False,
        model=model,
        dimension=len(vector),
        attempts=attempts,
        message=f"Embedding repaired locally ({len(vector)}d).",
    )


def embedding_gap_rows(corpus_dir: Path) -> list[dict[str, Any]]:
    """Return corpus documents missing a usable local embedding."""
    rows: list[dict[str, Any]] = []
    if not corpus_dir.exists():
        return rows
    for doc_dir in sorted(p for p in corpus_dir.iterdir() if p.is_dir()):
        if not (doc_dir / "analysis.json").exists():
            continue
        pending = _read_json(doc_dir / "embedding_pending.json")
        if _embedding_exists(doc_dir):
            continue
        rows.append({
            "doc_id": doc_dir.name,
            "pending": bool(pending),
            "pending_error": str(pending.get("error") or ""),
            "has_extracted_text": (doc_dir / "extracted.txt").exists(),
        })
    return rows
