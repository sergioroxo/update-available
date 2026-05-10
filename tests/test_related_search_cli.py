from dataclasses import dataclass

from typer.testing import CliRunner

from runner import main


@dataclass
class _Config:
    corpus_dir: object = None


def test_related_source_search_cli_dry_run_smoke(monkeypatch):
    runner = CliRunner()
    load_kwargs = []
    monkeypatch.setattr(
        main,
        "load_config",
        lambda **kwargs: load_kwargs.append(kwargs) or _Config(),
    )
    monkeypatch.setattr(
        main.related_search,
        "run_related_source_search",
        lambda **kwargs: {
            "dryRun": True,
            "seedsUsed": [
                {
                    "query": '"Example Documentary"',
                    "seedType": "exact_title",
                    "reason": "Exact title search.",
                }
            ],
        },
    )

    result = runner.invoke(main.app, ["related-source-search", "doc-1", "--dry-run"])

    assert result.exit_code == 0
    assert "Discovery seeds" in result.stdout
    assert load_kwargs == [{"require_services": False}]
