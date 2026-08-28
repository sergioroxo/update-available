"""Render and validate an uninstalled user-level Mac Studio LaunchAgent."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import plistlib
import subprocess
from pathlib import Path
from typing import Any

from runner.models.reprocessing import require_safe_id
from .atomic_io import atomic_write_bytes
from .factory_semantic_runtime import (
    validate_loopback_semantic_base_url,
    validate_semantic_credential_file_metadata,
)


FACTORY_LAUNCH_AGENT_LABEL = "org.survivingsogice.factory-service"
FACTORY_LAUNCH_AGENT_TARGET = Path(
    "/Users/cdn-ai/Library/LaunchAgents/org.survivingsogice.factory-service.plist"
)


def _absolute(path: Path, field: str) -> Path:
    path = Path(path).expanduser()
    if not path.is_absolute():
        raise ValueError(f"{field} must be an absolute local path")
    return path


def _inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def render_launch_agent(
    *,
    label: str,
    python_path: Path,
    working_directory: Path,
    to_studio: Path,
    from_studio: Path,
    state_root: Path,
    log_root: Path,
    run_id: str,
    command_public_keys: tuple[Path, ...],
    receipt_private_key: Path,
    semantic_runtime: str = "disabled",
    semantic_base_url: str = "",
    semantic_api_key_file: Path | None = None,
    poll_seconds: float = 5.0,
) -> bytes:
    if not label or any(character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-" for character in label):
        raise ValueError("LaunchAgent label is invalid")
    if run_id:
        run_id = require_safe_id(run_id, field="run_id")
    python_path = _absolute(python_path, "python_path")
    working_directory = _absolute(working_directory, "working_directory")
    to_studio = _absolute(to_studio, "to_studio")
    from_studio = _absolute(from_studio, "from_studio")
    state_root = _absolute(state_root, "state_root")
    log_root = _absolute(log_root, "log_root")
    receipt_private_key = _absolute(receipt_private_key, "receipt_private_key")
    public_keys = tuple(_absolute(path, "command_public_key") for path in command_public_keys)
    if not public_keys:
        raise ValueError("LaunchAgent requires at least one command verification key")
    for local in (state_root, log_root, receipt_private_key, *public_keys):
        if _inside(local, to_studio) or _inside(local, from_studio):
            raise ValueError("LaunchAgent local state, logs, and keys must remain outside shared trees")
    if not 0.1 <= poll_seconds <= 300:
        raise ValueError("LaunchAgent polling interval is invalid")
    if semantic_runtime not in {"disabled", "accepted-local"}:
        raise ValueError("LaunchAgent semantic runtime is invalid")
    credential_path = None
    if semantic_runtime == "accepted-local":
        semantic_base_url = validate_loopback_semantic_base_url(semantic_base_url)
        if semantic_api_key_file is None:
            raise ValueError("LaunchAgent process-local semantic credential is required")
        credential_path = validate_semantic_credential_file_metadata(
            semantic_api_key_file, shared_roots=(to_studio, from_studio),
        )
    elif semantic_base_url or semantic_api_key_file is not None:
        raise ValueError("LaunchAgent semantic credential options require accepted-local")
    arguments = [
        str(python_path), "-m", "runner.pipeline.factory_service", "run",
        "--to-studio", str(to_studio),
        "--from-studio", str(from_studio),
        "--state-root", str(state_root),
        "--log-root", str(log_root),
        "--receipt-private-key", str(receipt_private_key),
        "--host-role", "mac-studio",
        "--semantic-runtime", semantic_runtime,
        "--poll-seconds", str(poll_seconds),
    ]
    if credential_path is not None:
        arguments.extend((
            "--semantic-base-url", semantic_base_url,
            "--semantic-api-key-file", str(credential_path),
        ))
    if run_id:
        arguments.extend(("--run-id", run_id))
    for key in public_keys:
        arguments.extend(("--command-public-key", str(key)))
    payload: dict[str, Any] = {
        "Label": label,
        "ProgramArguments": arguments,
        "WorkingDirectory": str(working_directory),
        "RunAtLoad": True,
        "KeepAlive": {"SuccessfulExit": False},
        "StandardOutPath": str(log_root / "factory-service.stdout.log"),
        "StandardErrorPath": str(log_root / "factory-service.stderr.log"),
        "ProcessType": "Background",
    }
    return plistlib.dumps(payload, fmt=plistlib.FMT_XML, sort_keys=True)


def validate_launch_agent(
    data: bytes, *, allow_legacy_credentialless: bool = False,
) -> dict[str, Any]:
    try:
        payload = plistlib.loads(data)
    except Exception as exc:
        raise ValueError("LaunchAgent plist is malformed") from exc
    required = {
        "Label", "ProgramArguments", "WorkingDirectory", "RunAtLoad",
        "KeepAlive", "StandardOutPath", "StandardErrorPath", "ProcessType",
    }
    if set(payload) != required:
        raise ValueError("LaunchAgent plist fields are not exact")
    arguments = payload["ProgramArguments"]
    if not isinstance(arguments, list) or not arguments or not all(
        isinstance(value, str) and value for value in arguments
    ):
        raise ValueError("LaunchAgent must use a non-empty argument list")
    if any(value in {"sh", "bash", "zsh", "-c"} for value in arguments):
        raise ValueError("LaunchAgent must not use a shell command")
    if "runner.pipeline.factory_service" not in arguments or "--host-role" not in arguments:
        raise ValueError("LaunchAgent does not start the production factory service")
    runtime_indexes = [
        index for index, value in enumerate(arguments) if value == "--semantic-runtime"
    ]
    if len(runtime_indexes) > 1:
        raise ValueError("LaunchAgent semantic runtime option is duplicated")
    semantic_runtime = "disabled"
    if runtime_indexes:
        index = runtime_indexes[0]
        if index + 1 >= len(arguments):
            raise ValueError("LaunchAgent semantic runtime option has no value")
        semantic_runtime = arguments[index + 1]
        if semantic_runtime not in {"disabled", "accepted-local"}:
            raise ValueError("LaunchAgent semantic runtime option is invalid")
    option_values: dict[str, str] = {}
    for option in ("--semantic-base-url", "--semantic-api-key-file"):
        indexes = [index for index, value in enumerate(arguments) if value == option]
        if len(indexes) > 1:
            raise ValueError(f"LaunchAgent {option} option is duplicated")
        if indexes:
            index = indexes[0]
            if index + 1 >= len(arguments):
                raise ValueError(f"LaunchAgent {option} option has no value")
            option_values[option] = arguments[index + 1]
    if semantic_runtime == "accepted-local":
        expected = {"--semantic-base-url", "--semantic-api-key-file"}
        if not option_values and allow_legacy_credentialless:
            process_local_credential_configured = False
        elif set(option_values) != expected:
            raise ValueError("LaunchAgent accepted-local credential options are incomplete")
        else:
            validate_loopback_semantic_base_url(option_values["--semantic-base-url"])
            if not Path(option_values["--semantic-api-key-file"]).is_absolute():
                raise ValueError("LaunchAgent semantic credential path must be absolute")
            process_local_credential_configured = True
    elif option_values:
        raise ValueError("LaunchAgent disabled runtime contains semantic credential options")
    else:
        process_local_credential_configured = False
    serialized = json.dumps(payload, sort_keys=True).lower()
    if any(token in serialized for token in ("private key content", "api_key=", "token=")):
        raise ValueError("LaunchAgent contains secret material")
    return {
        "valid": True,
        "label": payload["Label"],
        "program_arguments": tuple(arguments),
        "semantic_runtime": semantic_runtime,
        "process_local_credential_configured": process_local_credential_configured,
        "persistent_installation_performed": False,
    }


def installation_plan(plist_path: Path, label: str) -> dict[str, Any]:
    return {
        "schema_version": "factory-launch-agent-installation-plan-v1.0",
        "label": label,
        "validated_plist": str(_absolute(plist_path, "plist_path")),
        "target": f"~/Library/LaunchAgents/{label}.plist",
        "authorized": False,
        "next_gate": "separate host-local installation approval",
    }


def rollback_plan(label: str) -> dict[str, Any]:
    return {
        "schema_version": "factory-launch-agent-rollback-plan-v1.0",
        "label": label,
        "installed": False,
        "actions": ("stop only the identity-matched service", "remove only the installed plist"),
        "authorized": False,
    }


def status_check(plist_path: Path, label: str) -> dict[str, Any]:
    path = _absolute(plist_path, "plist_path")
    return {
        "schema_version": "factory-launch-agent-status-v1.0",
        "label": label,
        "candidate_exists": path.is_file(),
        "candidate_valid": bool(path.is_file() and validate_launch_agent(path.read_bytes())["valid"]),
        "service_installed": False,
        "service_running": False,
        "checked_without_launchctl": True,
    }


def install_validated_launch_agent(
    *,
    candidate_path: Path,
    target_path: Path,
    backup_directory: Path,
    label: str = FACTORY_LAUNCH_AGENT_LABEL,
) -> dict[str, Any]:
    """Install exact validated bytes while preserving any related predecessor."""
    candidate = _absolute(candidate_path, "candidate_path")
    target = _absolute(target_path, "target_path")
    backup = _absolute(backup_directory, "backup_directory")
    if candidate.is_symlink() or not candidate.is_file():
        raise ValueError("LaunchAgent candidate must be a regular non-symlink file")
    data = candidate.read_bytes()
    validated = validate_launch_agent(data)
    if validated["label"] != label:
        raise ValueError("LaunchAgent candidate label mismatch")
    installed_sha = hashlib.sha256(data).hexdigest()
    previous_sha = ""
    backup_path = None
    if target.exists():
        if target.is_symlink() or not target.is_file():
            raise ValueError("refusing to overwrite an unsafe LaunchAgent target")
        previous = target.read_bytes()
        previous_validated = validate_launch_agent(
            previous, allow_legacy_credentialless=True,
        )
        if previous_validated["label"] != label:
            raise ValueError("refusing to overwrite an unrelated LaunchAgent")
        previous_sha = hashlib.sha256(previous).hexdigest()
        if previous == data:
            return {
                "schema_version": "factory-launch-agent-install-v1.0",
                "label": label, "target": str(target), "installed_sha256": installed_sha,
                "previous_sha256": previous_sha, "backup_path": "",
                "changed": False, "mode": oct(target.stat().st_mode & 0o777),
            }
        backup_path = backup / f"{label}.{previous_sha}.plist"
        if backup_path.exists() and backup_path.read_bytes() != previous:
            raise ValueError("LaunchAgent backup identity collision")
        if not backup_path.exists():
            atomic_write_bytes(backup_path, previous)
            os.chmod(backup_path, 0o600)
    atomic_write_bytes(target, data)
    os.chmod(target, 0o644)
    return {
        "schema_version": "factory-launch-agent-install-v1.0",
        "label": label, "target": str(target), "installed_sha256": installed_sha,
        "previous_sha256": previous_sha,
        "backup_path": str(backup_path) if backup_path else "",
        "changed": True, "mode": "0o644",
    }


def launchctl_command(
    action: str,
    *,
    label: str = FACTORY_LAUNCH_AGENT_LABEL,
    target_path: Path = FACTORY_LAUNCH_AGENT_TARGET,
    uid: int | None = None,
) -> tuple[str, ...]:
    """Return an argument-only current-GUI-user launchctl operation."""
    if label != FACTORY_LAUNCH_AGENT_LABEL:
        raise ValueError("factory lifecycle requires the exact service label")
    domain = f"gui/{os.getuid() if uid is None else uid}"
    service = f"{domain}/{label}"
    target = str(_absolute(target_path, "target_path"))
    commands = {
        "bootstrap": ("launchctl", "bootstrap", domain, target),
        "status": ("launchctl", "print", service),
        "stop": ("launchctl", "bootout", service),
    }
    if action not in commands:
        raise ValueError("unsupported launchctl lifecycle action")
    return commands[action]


def execute_launchctl(
    action: str,
    *,
    host_role: str,
    label: str = FACTORY_LAUNCH_AGENT_LABEL,
    target_path: Path = FACTORY_LAUNCH_AGENT_TARGET,
    uid: int | None = None,
    runner=subprocess.run,
) -> dict[str, Any]:
    if host_role not in {"mac-studio", "synthetic"}:
        raise PermissionError("launchctl lifecycle is restricted to the Mac Studio")
    command = launchctl_command(
        action, label=label, target_path=target_path, uid=uid,
    )
    completed = runner(
        command, check=False, capture_output=True, text=True, shell=False,
    )
    output = (completed.stdout or "") + (completed.stderr or "")
    lowered = output.lower()
    return {
        "schema_version": "factory-launchctl-result-v1.0",
        "action": action, "label": label, "returncode": completed.returncode,
        "identity_present": label.lower() in lowered,
        "pid_reported": "pid =" in lowered,
        "content_free": True,
    }


def uninstall_identity_matched_launch_agent(
    *, target_path: Path, installed_sha256: str, label: str = FACTORY_LAUNCH_AGENT_LABEL,
) -> dict[str, Any]:
    target = _absolute(target_path, "target_path")
    if target.is_symlink() or not target.is_file():
        return {"label": label, "removed": False, "reason": "not_installed"}
    data = target.read_bytes()
    if validate_launch_agent(
        data, allow_legacy_credentialless=True,
    )["label"] != label:
        raise ValueError("refusing to remove an unrelated LaunchAgent")
    actual = hashlib.sha256(data).hexdigest()
    if actual != installed_sha256:
        raise ValueError("installed LaunchAgent identity changed")
    target.unlink()
    return {"label": label, "removed": True, "removed_sha256": actual}


def restore_launch_agent_backup(
    *, backup_path: Path, target_path: Path, expected_backup_sha256: str,
    label: str = FACTORY_LAUNCH_AGENT_LABEL,
) -> dict[str, Any]:
    backup = _absolute(backup_path, "backup_path")
    target = _absolute(target_path, "target_path")
    if backup.is_symlink() or not backup.is_file():
        raise ValueError("LaunchAgent backup is unavailable")
    data = backup.read_bytes()
    actual = hashlib.sha256(data).hexdigest()
    if actual != expected_backup_sha256:
        raise ValueError("LaunchAgent backup identity changed")
    if validate_launch_agent(
        data, allow_legacy_credentialless=True,
    )["label"] != label:
        raise ValueError("LaunchAgent backup label mismatch")
    if target.exists():
        raise ValueError("rollback target must be absent before restoration")
    atomic_write_bytes(target, data)
    os.chmod(target, 0o644)
    return {"label": label, "restored": True, "restored_sha256": actual}


def _main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="factory_launch_agent")
    sub = parser.add_subparsers(dest="command", required=True)
    render = sub.add_parser("render")
    render.add_argument("--output", required=True, type=Path)
    render.add_argument("--label", required=True)
    render.add_argument("--python", required=True, type=Path)
    render.add_argument("--working-directory", required=True, type=Path)
    render.add_argument("--to-studio", required=True, type=Path)
    render.add_argument("--from-studio", required=True, type=Path)
    render.add_argument("--state-root", required=True, type=Path)
    render.add_argument("--log-root", required=True, type=Path)
    render.add_argument("--run-id", default="")
    render.add_argument("--command-public-key", required=True, action="append", type=Path)
    render.add_argument("--receipt-private-key", required=True, type=Path)
    render.add_argument("--poll-seconds", type=float, default=5.0)
    render.add_argument(
        "--semantic-runtime", choices=("disabled", "accepted-local"),
        default="disabled",
    )
    render.add_argument("--semantic-base-url", default="")
    render.add_argument("--semantic-api-key-file", type=Path)
    validate = sub.add_parser("validate")
    validate.add_argument("--plist", required=True, type=Path)
    plan = sub.add_parser("installation-plan")
    plan.add_argument("--plist", required=True, type=Path)
    plan.add_argument("--label", required=True)
    rollback = sub.add_parser("rollback-plan")
    rollback.add_argument("--label", required=True)
    status = sub.add_parser("status-check")
    status.add_argument("--plist", required=True, type=Path)
    status.add_argument("--label", required=True)
    args = parser.parse_args(argv)
    if args.command == "render":
        data = render_launch_agent(
            label=args.label, python_path=args.python,
            working_directory=args.working_directory,
            to_studio=args.to_studio, from_studio=args.from_studio,
            state_root=args.state_root, log_root=args.log_root,
            run_id=args.run_id,
            command_public_keys=tuple(args.command_public_key),
            receipt_private_key=args.receipt_private_key,
            semantic_runtime=args.semantic_runtime,
            semantic_base_url=args.semantic_base_url,
            semantic_api_key_file=args.semantic_api_key_file,
            poll_seconds=args.poll_seconds,
        )
        atomic_write_bytes(args.output, data)
        print(json.dumps({
            "output": str(args.output), **validate_launch_agent(data),
        }, sort_keys=True))
    elif args.command == "validate":
        print(json.dumps(validate_launch_agent(args.plist.read_bytes()), sort_keys=True))
    elif args.command == "installation-plan":
        print(json.dumps(installation_plan(args.plist, args.label), sort_keys=True))
    elif args.command == "rollback-plan":
        print(json.dumps(rollback_plan(args.label), sort_keys=True))
    else:
        print(json.dumps(status_check(args.plist, args.label), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
