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

    # Did a real model run AND its JSON parse/validate cleanly? Defaults False so
    # that a bare TriageResult() (the model/network/parse failure fallback) is
    # never mistaken for a genuine routing decision. Only _parse() sets this True.
    triage_succeeded: bool = False

    # Workflow routing flags -- used by source queue and batch runner.
    # overnight_batch_safe defaults False: an absent or failed triage must NEVER
    # present as safe for unattended processing (fail closed). A successful triage
    # sets this from the model's own decision.
    needs_book_splitting: bool = False    # long PDF/EPUB requiring split-book before ingest
    needs_testimony_review: bool = False  # contains testimony; consent gate required
    needs_media_review: bool = False      # video/audio requiring transcript processing
    needs_legal_review: bool = False      # court/legislative; researcher must confirm
    overnight_batch_safe: bool = False    # True only on a successful triage that cleared it
    suggested_process_route: str = ""     # "standard" | "split-book" | "media-ingest"

    @classmethod
    def failed(cls, reason: str = "") -> "TriageResult":
        """Build a fail-closed result for model/network/parse failures.

        triage_succeeded=False and overnight_batch_safe=False so the item is
        never treated as overnight-safe. ``reason`` is recorded in
        routing_reason for provenance.
        """
        return cls(
            triage_succeeded=False,
            overnight_batch_safe=False,
            routing_reason=(f"triage failed: {reason}" if reason else "triage failed"),
        )
