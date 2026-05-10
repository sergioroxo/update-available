from dataclasses import dataclass
import json

from typer.testing import CliRunner

from runner import main


@dataclass
class _Config:
    corpus_dir: object


def _write_doc(corpus_dir, doc_id: str, *, format_value: str, type_value: str):
    doc_dir = corpus_dir / doc_id
    doc_dir.mkdir()
    (doc_dir / "extracted.txt").write_text("source text", encoding="utf-8")
    (doc_dir / "analysis.json").write_text(
        json.dumps({"format": format_value, "type": type_value}),
        encoding="utf-8",
    )


def test_document_set_helpers_round_trip(tmp_path):
    config = _Config(corpus_dir=tmp_path)

    payload = main._write_document_set(
        config,
        "Video Set",
        ["7b76c504", "abc12345", "7b76c504"],
        description="A focused review set",
    )

    assert payload["name"] == "Video_Set"
    assert payload["docIds"] == ["7b76c504", "abc12345"]
    assert main._read_document_set(config, "Video Set")["description"] == "A focused review set"
    assert [item["name"] for item in main._list_document_sets(config)] == ["Video_Set"]


def test_annotation_batch_candidates_filters_set_format_and_type(tmp_path):
    _write_doc(tmp_path, "7b76c504", format_value="Video", type_value="Anti-SOGICE")
    _write_doc(tmp_path, "abc12345", format_value="Article", type_value="Anti-SOGICE")
    _write_doc(tmp_path, "def67890", format_value="Video", type_value="Pro-SOGICE")
    config = _Config(corpus_dir=tmp_path)
    main._write_document_set(config, "video-review", ["7b76c504", "abc12345", "def67890"])

    candidates = main._annotation_batch_candidates(
        config,
        filter_format="Video",
        filter_type="Anti-SOGICE",
        filter_set="video-review",
    )

    assert candidates == ["7b76c504"]


def test_annotate_batch_dry_run_cli(monkeypatch, tmp_path):
    _write_doc(tmp_path, "7b76c504", format_value="Video", type_value="Anti-SOGICE")
    runner = CliRunner()

    monkeypatch.setattr(main, "load_config", lambda llm=None, **kwargs: _Config(corpus_dir=tmp_path))
    monkeypatch.setattr(main.research_annotate, "load_local_annotation", lambda *args, **kwargs: None)

    result = runner.invoke(
        main.app,
        ["annotate-batch", "shame_article", "--format", "Video", "--dry-run"],
    )

    assert result.exit_code == 0
    assert "7b76c504" in result.stdout
    assert "[dry-run]" in result.stdout
