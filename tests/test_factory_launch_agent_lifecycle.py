from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest

from runner.pipeline.factory_launch_agent import (
    FACTORY_LAUNCH_AGENT_LABEL,
    execute_launchctl,
    install_validated_launch_agent,
    launchctl_command,
    render_launch_agent,
    restore_launch_agent_backup,
    uninstall_identity_matched_launch_agent,
    validate_launch_agent,
)


def _candidate(tmp_path: Path, poll_seconds: float = 5.0) -> Path:
    path = tmp_path / f"candidate-{poll_seconds}.plist"
    path.write_bytes(render_launch_agent(
        label=FACTORY_LAUNCH_AGENT_LABEL,
        python_path=Path("/opt/sogice/.venv/bin/python"),
        working_directory=Path("/opt/sogice/repository"),
        to_studio=tmp_path / "exchange" / "to",
        from_studio=tmp_path / "exchange" / "from",
        state_root=tmp_path / "state", log_root=tmp_path / "logs",
        run_id="", command_public_keys=(tmp_path / "keys" / "command.public.pem",),
        receipt_private_key=tmp_path / "keys" / "receipt.private.pem",
        poll_seconds=poll_seconds,
    ))
    return path


def test_persistent_plist_uses_host_discovery_and_argument_list(tmp_path):
    candidate = _candidate(tmp_path)
    validated = validate_launch_agent(candidate.read_bytes())
    arguments = validated["program_arguments"]
    assert "--run-id" not in arguments
    assert "-c" not in arguments
    assert arguments[0] == "/opt/sogice/.venv/bin/python"


def test_identity_safe_install_backup_uninstall_and_rollback(tmp_path):
    first = _candidate(tmp_path, 5.0)
    second = _candidate(tmp_path, 7.0)
    target = tmp_path / "LaunchAgents" / f"{FACTORY_LAUNCH_AGENT_LABEL}.plist"
    backup = tmp_path / "backups"
    installed = install_validated_launch_agent(
        candidate_path=first, target_path=target, backup_directory=backup,
    )
    assert installed["changed"] is True
    assert target.stat().st_mode & 0o777 == 0o644
    repeated = install_validated_launch_agent(
        candidate_path=first, target_path=target, backup_directory=backup,
    )
    assert repeated["changed"] is False
    replacement = install_validated_launch_agent(
        candidate_path=second, target_path=target, backup_directory=backup,
    )
    assert replacement["previous_sha256"] == installed["installed_sha256"]
    removed = uninstall_identity_matched_launch_agent(
        target_path=target, installed_sha256=replacement["installed_sha256"],
    )
    assert removed["removed"] is True
    restored = restore_launch_agent_backup(
        backup_path=Path(replacement["backup_path"]), target_path=target,
        expected_backup_sha256=replacement["previous_sha256"],
    )
    assert restored["restored_sha256"] == installed["installed_sha256"]


def test_install_refuses_unrelated_target(tmp_path):
    candidate = _candidate(tmp_path)
    target = tmp_path / "unrelated.plist"
    target.write_text("not a plist", encoding="utf-8")
    with pytest.raises(ValueError):
        install_validated_launch_agent(
            candidate_path=candidate, target_path=target,
            backup_directory=tmp_path / "backups",
        )


def test_launchctl_interface_is_shell_free_and_identity_scoped(tmp_path):
    command = launchctl_command(
        "bootstrap", target_path=tmp_path / "factory.plist", uid=501,
    )
    assert command == (
        "launchctl", "bootstrap", "gui/501", str(tmp_path / "factory.plist"),
    )
    calls = []

    def fake_runner(arguments, **kwargs):
        calls.append((arguments, kwargs))
        return SimpleNamespace(
            returncode=0, stdout=f"{FACTORY_LAUNCH_AGENT_LABEL}\npid = 4242\n", stderr="",
        )

    result = execute_launchctl(
        "status", host_role="synthetic", target_path=tmp_path / "factory.plist",
        uid=501, runner=fake_runner,
    )
    assert result["identity_present"] is True
    assert result["pid_reported"] is True
    assert calls[0][1]["shell"] is False
    with pytest.raises(PermissionError):
        execute_launchctl(
            "status", host_role="macbook", target_path=tmp_path / "factory.plist",
            uid=501, runner=fake_runner,
        )

