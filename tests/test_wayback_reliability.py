"""Tests for S3 — Wayback reliability controls."""
from __future__ import annotations
import json
from dataclasses import dataclass
from pathlib import Path
from unittest.mock import MagicMock, patch, call

import httpx
import pytest

from runner.pipeline import intake
from runner.pipeline.intake import _wayback_check


@dataclass
class _Config:
    corpus_dir: Path
    wayback_enabled: bool = True


def _make_wayback_response(url: str = "https://web.archive.org/web/20240101/https://example.com") -> MagicMock:
    """Return a mock httpx.Response for a successful Wayback availability check."""
    mock = MagicMock()
    mock.raise_for_status = MagicMock()
    mock.json.return_value = {
        "archived_snapshots": {
            "closest": {
                "available": True,
                "url": url,
                "timestamp": "20240101000000",
                "status": "200",
            }
        }
    }
    return mock


def test_wayback_skipped_when_disabled(tmp_path):
    """When wayback_enabled=False, intake.run() must not call httpx.get for Wayback and
    the returned IntakeResult must have wayback_status == 'disabled'."""
    config = _Config(corpus_dir=tmp_path, wayback_enabled=False)
    source = "https://example.com/doc"

    def _raise_if_called(*args, **kwargs):
        raise AssertionError("httpx.get should not be called when wayback_enabled=False")

    with patch("runner.pipeline.intake.httpx.get", side_effect=_raise_if_called):
        result = intake.run(source, tier=1, batch="test", config=config)

    assert result.wayback_status == "disabled"


def test_wayback_called_when_enabled(tmp_path):
    """When wayback_enabled=True, intake.run() must call httpx.get and the result has
    wayback_status == 'existing' when a snapshot is found."""
    config = _Config(corpus_dir=tmp_path, wayback_enabled=True)
    source = "https://example.com/doc"

    with patch("runner.pipeline.intake.httpx.get", return_value=_make_wayback_response()):
        result = intake.run(source, tier=1, batch="test", config=config)

    assert result.wayback_status == "existing"


def test_wayback_retry_on_transient_failure(tmp_path):
    """_wayback_check() must retry up to 3 times on transient network errors and succeed
    when the 3rd attempt returns a valid snapshot."""
    url = "https://example.com/doc"

    connect_error = httpx.ConnectError("timeout")
    good_response = _make_wayback_response()

    side_effects = [connect_error, connect_error, good_response]

    with (
        patch("runner.pipeline.intake.httpx.get", side_effect=side_effects) as mock_get,
        patch("runner.pipeline.intake.time.sleep") as mock_sleep,
    ):
        result = _wayback_check(url)

    assert result["status"] == "existing", f"Expected 'existing', got: {result}"
    assert mock_get.call_count == 3
    # sleep should have been called twice (after 1st and 2nd failures)
    assert mock_sleep.call_count == 2
