from pathlib import Path
import plistlib

import pytest

from runner.pipeline.factory_launch_agent import (
    install_validated_launch_agent, installation_plan, render_launch_agent,
    rollback_plan, validate_launch_agent,
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
    assert validated["semantic_runtime"] == "disabled"
    assert b"PrivateKey" not in data
    plan = installation_plan(tmp_path / "candidate.plist", validated["label"])
    assert plan["authorized"] is False
    assert rollback_plan(validated["label"])["installed"] is False
    assert not (Path.home() / "Library" / "LaunchAgents" / f"{validated['label']}.plist").exists()


def test_launch_agent_contains_explicit_accepted_local_runtime_when_requested(tmp_path):
    credential = tmp_path / "host-local" / "litellm.yaml"
    credential.parent.mkdir()
    credential.write_text(
        "general_settings:\n  master_key: test-only-secret-not-operational\n",
        encoding="utf-8",
    )
    credential.chmod(0o600)
    data = render_launch_agent(
        label="org.survivingsogice.factory.test",
        python_path=Path("/opt/sogice/.venv/bin/python"),
        working_directory=Path("/opt/sogice/repository"),
        to_studio=tmp_path / "exchange" / "to",
        from_studio=tmp_path / "exchange" / "from",
        state_root=tmp_path / "state", log_root=tmp_path / "logs",
        run_id="", command_public_keys=(tmp_path / "keys" / "command.public.pem",),
        receipt_private_key=tmp_path / "keys" / "receipt.private.pem",
        semantic_runtime="accepted-local",
        semantic_base_url="http://127.0.0.1:4000",
        semantic_api_key_file=credential,
    )
    validated = validate_launch_agent(data)
    arguments = validated["program_arguments"]
    index = arguments.index("--semantic-runtime")
    assert arguments[index + 1] == "accepted-local"
    assert arguments[arguments.index("--semantic-base-url") + 1] == "http://127.0.0.1:4000"
    assert arguments[arguments.index("--semantic-api-key-file") + 1] == str(credential)
    assert validated["semantic_runtime"] == "accepted-local"
    assert b"SOGICE_SEMANTIC_API_KEY" not in data
    assert b"test-only-secret-not-operational" not in data


def test_launch_agent_rejects_unsafe_process_local_credential(tmp_path):
    credential = tmp_path / "litellm.yaml"
    credential.write_text("general_settings:\n  master_key: test-only\n", encoding="utf-8")
    with pytest.raises(PermissionError, match="0600"):
        render_launch_agent(
            label="org.survivingsogice.factory.test",
            python_path=Path("/opt/sogice/.venv/bin/python"),
            working_directory=Path("/opt/sogice/repository"),
            to_studio=tmp_path / "exchange" / "to",
            from_studio=tmp_path / "exchange" / "from",
            state_root=tmp_path / "state", log_root=tmp_path / "logs",
            run_id="", command_public_keys=(tmp_path / "keys" / "command.public.pem",),
            receipt_private_key=tmp_path / "keys" / "receipt.private.pem",
            semantic_runtime="accepted-local",
            semantic_base_url="http://127.0.0.1:4000",
            semantic_api_key_file=credential,
        )


def test_strict_validation_rejects_legacy_accepted_local_plist(tmp_path):
    credential = tmp_path / "litellm.yaml"
    credential.write_text(
        "general_settings:\n  master_key: test-only\n", encoding="utf-8",
    )
    credential.chmod(0o600)
    current = render_launch_agent(
        label="org.survivingsogice.factory.test",
        python_path=Path("/opt/sogice/.venv/bin/python"),
        working_directory=Path("/opt/sogice/repository"),
        to_studio=tmp_path / "exchange" / "to",
        from_studio=tmp_path / "exchange" / "from",
        state_root=tmp_path / "state", log_root=tmp_path / "logs",
        run_id="", command_public_keys=(tmp_path / "keys" / "command.public.pem",),
        receipt_private_key=tmp_path / "keys" / "receipt.private.pem",
        semantic_runtime="accepted-local",
        semantic_base_url="http://127.0.0.1:4000",
        semantic_api_key_file=credential,
    )
    payload = plistlib.loads(current)
    arguments = payload["ProgramArguments"]
    for option in ("--semantic-api-key-file", "--semantic-base-url"):
        index = arguments.index(option)
        del arguments[index:index + 2]
    legacy = plistlib.dumps(payload, fmt=plistlib.FMT_XML, sort_keys=True)
    with pytest.raises(ValueError, match="incomplete"):
        validate_launch_agent(legacy)
    migrated = validate_launch_agent(legacy, allow_legacy_credentialless=True)
    assert migrated["process_local_credential_configured"] is False
    candidate = tmp_path / "candidate.plist"
    target = tmp_path / "LaunchAgents" / "org.survivingsogice.factory.test.plist"
    candidate.write_bytes(current)
    target.parent.mkdir()
    target.write_bytes(legacy)
    installed = install_validated_launch_agent(
        candidate_path=candidate, target_path=target,
        backup_directory=tmp_path / "backups",
        label="org.survivingsogice.factory.test",
    )
    assert installed["changed"] is True
    assert Path(installed["backup_path"]).read_bytes() == legacy
    assert validate_launch_agent(target.read_bytes())["process_local_credential_configured"]


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
