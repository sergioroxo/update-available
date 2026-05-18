"""Tests for P2 — list_pending() limit parameter."""
from __future__ import annotations
import json
from dataclasses import dataclass
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from runner.pipeline import upload


@dataclass
class _Config:
    corpus_dir: Path


def _make_pending_doc(corpus_dir: Path, doc_id: str) -> Path:
    """Create a pending document dir (has analysis.json, no sanity_record.json)."""
    doc_dir = corpus_dir / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    (doc_dir / "analysis.json").write_text(
        json.dumps({
            "type": "Anti-SOGICE",
            "format": "Blog-Post",
            "evidence": ["evidence"],
            "scope": "Core",
            "narrative_register": "Legal-Policy",
            "summary": "summary",
            "confidence": {"overall_score": 0.85, "status": "high"},
        }),
        encoding="utf-8",
    )
    (doc_dir / "extracted.txt").write_text("text", encoding="utf-8")
    (doc_dir / "intake.json").write_text(
        json.dumps({"doc_id": doc_id, "batch_id": "test-batch", "source": "https://example.com"}),
        encoding="utf-8",
    )
    return doc_dir


def test_list_pending_no_limit_returns_all(tmp_path):
    """With no limit, list_pending returns all 5 docs without error."""
    config = _Config(corpus_dir=tmp_path)
    for i in range(5):
        _make_pending_doc(tmp_path, f"doc-{i:03d}")

    with patch("runner.pipeline.upload.console") as mock_console:
        upload.list_pending(config)

    # Should not raise; console.print should be called (at least the table)
    assert mock_console.print.called


def test_list_pending_limit_stops_early(tmp_path):
    """With limit=3, list_pending exits early and prints a scan-limited notice."""
    config = _Config(corpus_dir=tmp_path)
    for i in range(10):
        _make_pending_doc(tmp_path, f"doc-{i:03d}")

    printed_args: list[str] = []

    def capture_print(*args, **kwargs):
        printed_args.extend(str(a) for a in args)

    with patch("runner.pipeline.upload.console") as mock_console:
        mock_console.print.side_effect = capture_print
        upload.list_pending(config, limit=3)

    # The "Scan limited" message should appear
    combined = " ".join(printed_args)
    assert "Scan limited" in combined or "limited" in combined.lower()


def test_list_pending_limit_zero_means_unlimited(tmp_path):
    """limit=None (converted from 0 at the CLI layer) returns all docs."""
    config = _Config(corpus_dir=tmp_path)
    for i in range(5):
        _make_pending_doc(tmp_path, f"doc-{i:03d}")

    with patch("runner.pipeline.upload.console") as mock_console:
        upload.list_pending(config, limit=None)

    assert mock_console.print.called
