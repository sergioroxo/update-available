"""Tests for the enrichment default-on behaviour introduced in TASK D.

Enrichment (Stage 3c) is now the normal post-analysis flow.  The CLI ingest
command defaults to run_enrich=True; the researcher passes --no-enrich to
skip it for quick tests or resource-constrained runs.

The Streamlit ingest workbench also starts with run_enrich=True in the
blank session state.

No network calls or LLM interactions are made here.
"""
from __future__ import annotations

import pytest


# ---------------------------------------------------------------------------
# 1. CLI — option default and flag surface
# ---------------------------------------------------------------------------

class TestCLIEnrichDefault:
    """The run_enrich parameter on the CLI ingest command must default to True."""

    def _get_ingest_param(self, name: str):
        """Retrieve a Click parameter from the ingest command by name."""
        import typer.main
        from runner.main import app

        click_cmd = typer.main.get_command(app)
        ingest_cmd = click_cmd.commands["ingest"]
        return next(p for p in ingest_cmd.params if p.name == name)

    def test_run_enrich_default_is_true(self):
        param = self._get_ingest_param("run_enrich")
        assert param.default is True, (
            "run_enrich must default to True — enrichment is now the normal "
            "post-analysis flow; researchers opt out with --no-enrich"
        )

    def test_no_enrich_flag_exists_in_help(self):
        """--no-enrich must appear in the ingest --help output."""
        from typer.testing import CliRunner
        from runner.main import app

        result = CliRunner().invoke(app, ["ingest", "--help"])
        assert result.exit_code == 0
        assert "--no-enrich" in result.output, (
            "--no-enrich opt-out must be visible in help so researchers "
            "know how to skip enrichment for quick tests"
        )

    def test_enrich_flag_still_present(self):
        """--enrich must still appear (it's the positive side of the boolean pair)."""
        from typer.testing import CliRunner
        from runner.main import app

        result = CliRunner().invoke(app, ["ingest", "--help"])
        assert result.exit_code == 0
        assert "--enrich" in result.output

    def test_module_docstring_mentions_no_enrich(self):
        """Module docstring must show --no-enrich as the skip path."""
        import runner.main as runner_main

        assert "--no-enrich" in runner_main.__doc__, (
            "Module docstring should mention --no-enrich so it shows in "
            "python -m runner --help overview"
        )

    def test_ingest_command_docstring_mentions_no_enrich(self):
        """The ingest command docstring should describe --no-enrich."""
        from runner.main import ingest

        assert "--no-enrich" in (ingest.__doc__ or ""), (
            "Ingest docstring should explain --no-enrich for researchers "
            "reading the help text"
        )


# ---------------------------------------------------------------------------
# 2. CLI — opt-out parameter inspection
# ---------------------------------------------------------------------------

class TestCLINoEnrichOptOut:
    """--no-enrich must be a valid opt-out that sets run_enrich=False."""

    def test_no_enrich_opt_is_declared(self):
        """Click must expose a --no-enrich secondary option on the boolean flag."""
        import typer.main
        from runner.main import app

        click_cmd = typer.main.get_command(app)
        ingest_cmd = click_cmd.commands["ingest"]
        param = next(p for p in ingest_cmd.params if p.name == "run_enrich")

        # Collect all declared option strings (primary + secondary)
        all_opts: list[str] = list(param.opts or [])
        if hasattr(param, "secondary_opts"):
            all_opts += list(param.secondary_opts)

        assert any("no-enrich" in o for o in all_opts), (
            f"Expected a '--no-enrich' option among {all_opts}"
        )

    def test_run_enrich_false_is_boolean(self):
        """run_enrich=False must be a bool, not 0 or any other falsy value."""
        import typer.main
        from runner.main import app

        click_cmd = typer.main.get_command(app)
        ingest_cmd = click_cmd.commands["ingest"]
        param = next(p for p in ingest_cmd.params if p.name == "run_enrich")

        # The default should be bool True, not any other truthy type
        assert isinstance(param.default, bool), (
            f"run_enrich default should be bool True, got {type(param.default).__name__!r}"
        )


# ---------------------------------------------------------------------------
# 3. Streamlit session state — blank ingest state
# ---------------------------------------------------------------------------

class TestStreamlitIngestDefault:
    """_blank_ingest_state() must start with run_enrich=True."""

    def test_blank_ingest_state_run_enrich_is_true(self):
        from runner.app import _blank_ingest_state

        state = _blank_ingest_state()
        assert "run_enrich" in state, "_blank_ingest_state must contain 'run_enrich' key"
        assert state["run_enrich"] is True, (
            "_blank_ingest_state must default run_enrich to True — "
            "enrichment is now the normal post-upload flow"
        )

    def test_blank_ingest_state_run_enrich_is_bool(self):
        """Must be Python bool True, not a truthy integer or string."""
        from runner.app import _blank_ingest_state

        state = _blank_ingest_state()
        assert isinstance(state["run_enrich"], bool), (
            f"run_enrich must be bool, got {type(state['run_enrich']).__name__!r}"
        )

    def test_blank_ingest_state_still_contains_all_expected_keys(self):
        """Adding run_enrich=True must not break the key set."""
        from runner.app import _blank_ingest_state

        state = _blank_ingest_state()
        required_keys = {
            "source", "source_url", "llm", "batch", "run_enrich",
            "allow_whisper", "enrich_model", "intake", "preprocess",
            "embedding", "analysis", "analysis_json", "analysis_valid",
            "enrichment", "uploaded",
        }
        missing = required_keys - set(state.keys())
        assert not missing, f"_blank_ingest_state is missing keys: {missing}"


# ---------------------------------------------------------------------------
# 4. Explicit opt-out (run_enrich=False) still supported
# ---------------------------------------------------------------------------

class TestExplicitOptOut:
    """A researcher who sets run_enrich=False must get a state with enrichment
    disabled — the opt-out path must remain fully functional."""

    def test_state_accepts_run_enrich_false(self):
        from runner.app import _blank_ingest_state

        state = _blank_ingest_state()
        state["run_enrich"] = False
        assert state["run_enrich"] is False

    def test_state_run_enrich_false_is_bool(self):
        """Opt-out value must also be a bool."""
        from runner.app import _blank_ingest_state

        state = _blank_ingest_state()
        state["run_enrich"] = False
        assert isinstance(state["run_enrich"], bool)

    def test_cli_run_enrich_param_is_a_flag_not_a_plain_option(self):
        """run_enrich must be a boolean flag (not a plain store option) so that
        both --enrich and --no-enrich can be passed without a value argument."""
        import typer.main
        from runner.main import app

        click_cmd = typer.main.get_command(app)
        ingest_cmd = click_cmd.commands["ingest"]
        param = next(p for p in ingest_cmd.params if p.name == "run_enrich")

        # Click stores boolean flag pairs with is_flag=True
        assert getattr(param, "is_flag", False), (
            "run_enrich must be a Click boolean flag — not a plain option — "
            "so --enrich / --no-enrich work without an argument"
        )
