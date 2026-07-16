from __future__ import annotations

from pathlib import Path

import pytest

from runner.pipeline.research_upload import stage_research_source


def test_stage_upload_is_content_addressed_and_dedupes_filenames(tmp_path):
    first = stage_research_source(b"pdf-content", "first.pdf", tmp_path / "uploads")
    second = stage_research_source(b"pdf-content", "../renamed.pdf", tmp_path / "uploads")
    assert first["path"] == second["path"]
    assert second["duplicate"] is True
    assert len(list((tmp_path / "uploads").iterdir())) == 1


def test_stage_upload_rejects_unsupported_empty_and_oversized(tmp_path):
    with pytest.raises(ValueError, match="non-empty"):
        stage_research_source(b"", "source.pdf", tmp_path / "uploads")
    with pytest.raises(ValueError, match="Unsupported"):
        stage_research_source(b"x", "source.exe", tmp_path / "uploads")
    with pytest.raises(ValueError, match="larger"):
        stage_research_source(b"xx", "source.pdf", tmp_path / "uploads", max_bytes=1)


def test_stage_upload_rejects_symlink_root(tmp_path):
    real = tmp_path / "real"
    real.mkdir()
    link = tmp_path / "linked"
    link.symlink_to(real, target_is_directory=True)
    with pytest.raises(ValueError, match="symbolic link"):
        stage_research_source(b"x", "source.pdf", link)

