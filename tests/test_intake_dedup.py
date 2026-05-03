from dataclasses import dataclass
import json

from runner.pipeline.intake import find_existing_by_source
from runner.pipeline.intake import update_intake_consent


@dataclass
class _Config:
    corpus_dir: object


def test_find_existing_by_source_matches_source_url_for_downloaded_file(tmp_path):
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "intake.json").write_text(
        json.dumps(
            {
                "doc_id": "doc-1",
                "source": "/tmp/downloaded.pdf",
                "source_url": "https://example.org/downloaded.pdf",
                "batch_id": "batch-1",
            }
        ),
        encoding="utf-8",
    )
    (doc_dir / "analysis.json").write_text("{}", encoding="utf-8")
    (doc_dir / "extracted.txt").write_text("text", encoding="utf-8")

    matches = find_existing_by_source(
        "https://example.org/downloaded.pdf",
        _Config(corpus_dir=tmp_path),
    )

    assert len(matches) == 1
    assert matches[0]["doc_id"] == "doc-1"
    assert matches[0]["complete"] is True


def test_find_existing_by_source_handles_empty_corpus(tmp_path):
    matches = find_existing_by_source("https://example.org/none", _Config(corpus_dir=tmp_path))

    assert matches == []


def test_update_intake_consent_patches_existing_intake_json(tmp_path):
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "intake.json").write_text(
        json.dumps({"doc_id": "doc-1", "source": "https://example.org"}),
        encoding="utf-8",
    )

    update_intake_consent("doc-1", "confirmed", _Config(corpus_dir=tmp_path))

    data = json.loads((doc_dir / "intake.json").read_text())
    assert data["testimony_consent"] == "confirmed"
    assert data["testimony_consent_updated_at"]
