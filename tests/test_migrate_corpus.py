"""Tests for migrate_corpus_files() (Item M3/A4)."""
from __future__ import annotations
import json
from dataclasses import dataclass
from pathlib import Path

from runner.pipeline.upload import migrate_corpus_files, PROMPT_VERSION, _ONTOLOGY_VERSION


@dataclass
class _Config:
    corpus_dir: Path


def _make_doc_dir(
    tmp_path: Path,
    doc_id: str = "doc-1",
    intake_has_ingested_at: bool = False,
    analysis_has_prompt_version: bool = False,
    analysis_has_ontology_version: bool = False,
    metadata_saved_at: str = "2026-01-01T10:00:00+00:00",
) -> Path:
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    intake = {"doc_id": doc_id, "source": "https://example.com"}
    if intake_has_ingested_at:
        intake["ingested_at"] = "2026-01-01T09:00:00+00:00"
    (doc_dir / "intake.json").write_text(json.dumps(intake), encoding="utf-8")

    metadata = {"llm_used": "litelm", "saved_at": metadata_saved_at}
    (doc_dir / "metadata.json").write_text(json.dumps(metadata), encoding="utf-8")

    analysis: dict = {"type": "Anti-SOGICE", "format": "Blog-Post"}
    if analysis_has_prompt_version:
        analysis["prompt_version"] = PROMPT_VERSION
    if analysis_has_ontology_version:
        analysis["ontology_version"] = _ONTOLOGY_VERSION
    (doc_dir / "analysis.json").write_text(json.dumps(analysis), encoding="utf-8")

    return doc_dir


def test_migrate_corpus_dry_run_does_not_write(tmp_path):
    doc_dir = _make_doc_dir(tmp_path)
    config = _Config(corpus_dir=tmp_path)

    original_intake = (doc_dir / "intake.json").read_text(encoding="utf-8")
    original_analysis = (doc_dir / "analysis.json").read_text(encoding="utf-8")

    result = migrate_corpus_files(config, dry_run=True)

    # Files must not change in dry-run mode
    assert (doc_dir / "intake.json").read_text(encoding="utf-8") == original_intake
    assert (doc_dir / "analysis.json").read_text(encoding="utf-8") == original_analysis

    # But counts should still reflect what would be patched
    assert result["docs_scanned"] == 1
    assert result["docs_patched"] == 1
    assert result["fields_written"] >= 1  # at least ingested_at


def test_migrate_corpus_backfills_ingested_at(tmp_path):
    saved_at = "2026-02-15T08:30:00+00:00"
    doc_dir = _make_doc_dir(
        tmp_path,
        intake_has_ingested_at=False,
        metadata_saved_at=saved_at,
        # Give analysis complete versions so only ingested_at is backfilled
        analysis_has_prompt_version=True,
        analysis_has_ontology_version=True,
    )
    config = _Config(corpus_dir=tmp_path)

    result = migrate_corpus_files(config, dry_run=False)

    intake_data = json.loads((doc_dir / "intake.json").read_text(encoding="utf-8"))
    assert intake_data["ingested_at"] == saved_at
    assert result["docs_patched"] == 1
    assert result["fields_written"] == 1


def test_migrate_corpus_backfills_prompt_version(tmp_path):
    doc_dir = _make_doc_dir(
        tmp_path,
        # ingested_at already set — only analysis is missing
        intake_has_ingested_at=True,
        analysis_has_prompt_version=False,
        analysis_has_ontology_version=False,
    )
    config = _Config(corpus_dir=tmp_path)

    result = migrate_corpus_files(config, dry_run=False)

    analysis_data = json.loads((doc_dir / "analysis.json").read_text(encoding="utf-8"))
    assert analysis_data["prompt_version"] == PROMPT_VERSION
    assert analysis_data["ontology_version"] == _ONTOLOGY_VERSION
    assert result["docs_patched"] == 1
    assert result["fields_written"] == 2  # prompt_version + ontology_version
