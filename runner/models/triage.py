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
