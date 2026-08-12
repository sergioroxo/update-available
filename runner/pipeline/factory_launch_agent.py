"""Render and validate an uninstalled user-level Mac Studio LaunchAgent."""
from __future__ import annotations

import argparse
import json
import plistlib
from pathlib import Path
from typing import Any

from runner.models.reprocessing import require_safe_id
from .atomic_io import atomic_write_bytes


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
    poll_seconds: float = 5.0,
) -> bytes:
    if not label or any(character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-" for character in label):
        raise ValueError("LaunchAgent label is invalid")
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
    arguments = [
        str(python_path), "-m", "runner.pipeline.factory_service", "run",
        "--to-studio", str(to_studio),
        "--from-studio", str(from_studio),
        "--state-root", str(state_root),
        "--log-root", str(log_root),
        "--run-id", run_id,
        "--receipt-private-key", str(receipt_private_key),
        "--host-role", "mac-studio",
        "--poll-seconds", str(poll_seconds),
    ]
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


def validate_launch_agent(data: bytes) -> dict[str, Any]:
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
    serialized = json.dumps(payload, sort_keys=True).lower()
    if any(token in serialized for token in ("private key content", "api_key=", "token=")):
        raise ValueError("LaunchAgent contains secret material")
    return {
        "valid": True,
        "label": payload["Label"],
        "program_arguments": tuple(arguments),
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
    render.add_argument("--run-id", required=True)
    render.add_argument("--command-public-key", required=True, action="append", type=Path)
    render.add_argument("--receipt-private-key", required=True, type=Path)
    render.add_argument("--poll-seconds", type=float, default=5.0)
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
