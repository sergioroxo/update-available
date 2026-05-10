from dataclasses import dataclass

from typer.testing import CliRunner

from runner import main
from runner.models.research_annotation import ResearchAnnotation


@dataclass
class _Config:
    corpus_dir: object = None


def _annotation() -> ResearchAnnotation:
    return ResearchAnnotation(
        doc_id="doc-1",
        profile="search_discovery",
        modelProvider="litelm",
        modelName="lexicon-llm",
        promptVersion="research-profile-search_discovery-v1.0",
        inputTextHash="a" * 64,
        sourceStance="mixed",
        resultJson={"sourceStance": "mixed"},
    )


def test_research_annotate_cli_smoke(monkeypatch):
    runner = CliRunner()
    monkeypatch.setattr(main, "load_config", lambda llm=None, **kwargs: _Config())
    monkeypatch.setattr(
        main.research_annotate,
        "annotate_document",
        lambda **kwargs: _annotation(),
    )

    result = runner.invoke(
        main.app,
        ["research-annotate", "doc-1", "--profile", "search_discovery", "--dry-run"],
    )

    assert result.exit_code == 0
    assert "Research annotation complete" in result.stdout


def test_set_research_profile_cli_smoke(monkeypatch):
    runner = CliRunner()
    monkeypatch.setattr(main, "load_config", lambda llm=None, **kwargs: _Config())
    monkeypatch.setattr(
        main.research_annotate,
        "set_profile_status",
        lambda **kwargs: {"activeResearchProfiles": ["archive_core", "search_discovery"]},
    )

    result = runner.invoke(
        main.app,
        ["set-research-profile", "doc-1", "--profile", "search_discovery", "--local-only"],
    )

    assert result.exit_code == 0
    assert "Research profile updated" in result.stdout
