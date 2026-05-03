from dataclasses import dataclass
import json

from runner.models.enrichment import EnrichmentResult
from runner.pipeline import enrich


@dataclass
class _Config:
    corpus_dir: object


def test_enrichment_save_archives_existing_with_microsecond_timestamp(tmp_path):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "enrichment.json").write_text(
        EnrichmentResult(doc_id="doc-1", enrichment_model="first").model_dump_json(),
        encoding="utf-8",
    )

    enrich.save("doc-1", EnrichmentResult(doc_id="doc-1", enrichment_model="second"), config)

    archives = list(doc_dir.glob("enrichment_*.json"))
    assert len(archives) == 1
    assert archives[0].name.count("_") >= 3
    current = json.loads((doc_dir / "enrichment.json").read_text())
    assert current["run_type"] == "main"
    assert current["enrichment_model"] == "second"


def test_enrichment_save_alt_never_touches_main_file_and_marks_run_type(tmp_path):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "enrichment.json").write_text('{"doc_id": "doc-1", "run_type": "main"}', encoding="utf-8")

    alt_path = enrich.save_alt(
        "doc-1",
        EnrichmentResult(doc_id="doc-1", enrichment_model="core-gemma"),
        config,
        label="core-gemma",
    )

    assert json.loads((doc_dir / "enrichment.json").read_text())["run_type"] == "main"
    alt = json.loads(alt_path.read_text())
    assert alt["run_type"] == "alt"
    assert alt["enrichment_model"] == "core-gemma"
    history = enrich.list_history("doc-1", config)
    assert history[0]["run_type"] == "alt"
