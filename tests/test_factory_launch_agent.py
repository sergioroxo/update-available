from pathlib import Path

import pytest

from runner.pipeline.factory_launch_agent import (
    installation_plan, render_launch_agent, rollback_plan, validate_launch_agent,
)


def _render(tmp_path: Path) -> bytes:
    return render_launch_agent(
        label="org.survivingsogice.factory.test",
        python_path=Path("/opt/sogice/.venv/bin/python"),
        working_directory=Path("/opt/sogice/repository"),
        to_studio=tmp_path / "exchange" / "to",
        from_studio=tmp_path / "exchange" / "from",
        state_root=tmp_path / "state",
        log_root=tmp_path / "logs",
        run_id="production-canary-009",
        command_public_keys=(tmp_path / "keys" / "command.public.pem",),
        receipt_private_key=tmp_path / "keys" / "receipt.private.pem",
    )


def test_launch_agent_is_argument_based_secret_free_and_uninstalled(tmp_path):
    data = _render(tmp_path)
    validated = validate_launch_agent(data)
    assert validated["valid"] is True
    assert validated["persistent_installation_performed"] is False
    assert "-c" not in validated["program_arguments"]
    assert "runner.pipeline.factory_service" in validated["program_arguments"]
    assert b"PrivateKey" not in data
    plan = installation_plan(tmp_path / "candidate.plist", validated["label"])
    assert plan["authorized"] is False
    assert rollback_plan(validated["label"])["installed"] is False
    assert not (Path.home() / "Library" / "LaunchAgents" / f"{validated['label']}.plist").exists()


def test_launch_agent_rejects_key_inside_shared_tree(tmp_path):
    shared = tmp_path / "exchange" / "to"
    with pytest.raises(ValueError, match="outside shared"):
        render_launch_agent(
            label="org.survivingsogice.factory.test",
            python_path=Path("/opt/sogice/python"), working_directory=tmp_path,
            to_studio=shared, from_studio=tmp_path / "exchange" / "from",
            state_root=tmp_path / "state", log_root=tmp_path / "logs",
            run_id="run-009", command_public_keys=(shared / "public.pem",),
            receipt_private_key=tmp_path / "private.pem",
        )
