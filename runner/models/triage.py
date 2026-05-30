"""
Triage model — Stage 0.5 output.

A fast pre-screen to recommend which analysis model to use for a given document.
"""
from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, ConfigDict


class TriageResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    doc_type_hint: Literal[
        "promotional", "policy", "legal", "academic",
        "testimony", "news", "media", "unknown",
    ] = "unknown"
    languages: list[str] = ["en"]
    complexity: Literal["simple", "moderate", "complex"] = "moderate"
    estimated_tokens: int = 0
    recommended_llm: str = "litelm"
    routing_reason: str = ""

    # Workflow routing flags -- used by source queue and batch runner
    needs_book_splitting: bool = False    # long PDF/EPUB requiring split-book before ingest
    needs_testimony_review: bool = False  # contains testimony; consent gate required
    needs_media_review: bool = False      # video/audio requiring transcript processing
    needs_legal_review: bool = False      # court/legislative; researcher must confirm
    overnight_batch_safe: bool = True     # False blocks unattended batch processing
    suggested_process_route: str = ""     # "standard" | "split-book" | "media-ingest"
