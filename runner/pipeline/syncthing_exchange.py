"""Immutable checksum-bound exchange helpers for the synthetic factory runtime."""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from pydantic import ValidationError

from runner.models.reprocessing import (
    FactoryCommandV1, FactoryReceiptV1, ImmutableArtifactManifestV1,
    ResearchCampaignV2, require_safe_id,
)
from .factory_auth import (
    AuthenticatedFactoryMessageV1, verify_factory_message,
)
from .factory_messages import (
    publish_checksum_bound_json,
    scan_checksum_pairs,
    validate_transfer_member,
    verify_checksum_pair,
)
from .factory_state import FactoryProjection, project_factory_receipts


MUTABLE_SUFFIXES = (
    ".db", ".sqlite", ".sqlite3", ".wal", ".journal", ".shm",
    "-wal", "-journal", "-shm", ".lock", ".pid",
)


def publish_exchange_json(root: Path, relative_path: str, payload: Any) -> dict[str, Any]:
    relative = validate_transfer_member(relative_path)
    return publish_checksum_bound_json(
        payload, Path(root) / relative, relative_path=relative,
    )


def verified_json_messages(root: Path, prefix: str) -> list[tuple[str, dict[str, Any]]]:
    root = Path(root)
    scan = scan_checksum_pairs(root)
    rows: list[tuple[str, dict[str, Any]]] = []
    normalized = prefix.rstrip("/") + "/"
    for item in scan["ready"]:
        relative = item["relative_path"]
        if not relative.startswith(normalized) or not relative.endswith(".json"):
            continue
        payload = json.loads((root / relative).read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError(f"exchange JSON must be an object: {relative}")
        rows.append((relative, payload))
    return sorted(rows)


def discover_campaign_ids(root: Path) -> tuple[str, ...]:
    """Return only checksum-complete, identity-matching run-scoped campaigns."""
    found: list[str] = []
    for relative, payload in verified_json_messages(root, "campaigns"):
        parts = Path(relative).parts
        if len(parts) != 3 or parts[2] != "campaign.json":
            continue
        run_id = require_safe_id(parts[1], field="run_id")
        campaign = ResearchCampaignV2.model_validate_json(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        )
        if campaign.run_id != run_id:
            raise ValueError("cross-run campaign path injection")
        found.append(run_id)
    return tuple(sorted(set(found)))


def scan_factory_commands(root: Path, *, run_id: str | None = None) -> tuple[FactoryCommandV1, ...]:
    commands: list[FactoryCommandV1] = []
    prefix = f"commands/{require_safe_id(run_id, field='run_id')}" if run_id else "commands"
    for relative, payload in verified_json_messages(root, prefix):
        try:
            command = FactoryCommandV1.model_validate_json(
                json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
            )
            path_run = Path(relative).parts[1] if len(Path(relative).parts) >= 3 else command.run_id
            if command.run_id != path_run or (run_id and command.run_id != run_id):
                raise ValueError("cross-run command path injection")
            commands.append(command)
        except ValidationError as exc:
            raise ValueError("invalid factory command") from exc
    return tuple(sorted(commands, key=lambda row: (row.sequence, row.command_id)))


def load_factory_receipts(root: Path, *, run_id: str | None = None) -> tuple[FactoryReceiptV1, ...]:
    receipts: list[FactoryReceiptV1] = []
    prefix = (
        f"campaigns/{require_safe_id(run_id, field='run_id')}/receipts"
        if run_id else "campaigns"
    )
    for relative, payload in verified_json_messages(root, prefix):
        parts = Path(relative).parts
        if len(parts) < 4 or parts[-2] != "receipts":
            continue
        receipt = FactoryReceiptV1.model_validate_json(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        )
        path_run = parts[1]
        if receipt.event.run_id != path_run or (run_id and path_run != run_id):
            raise ValueError("cross-run receipt path injection")
        receipts.append(receipt)
    return tuple(sorted(receipts, key=lambda row: (row.event.sequence, row.receipt_id)))


def observe_receipts(root: Path, *, run_id: str) -> FactoryProjection:
    """MacBook observer: only campaign identity and verified receipts are accepted."""
    return project_factory_receipts(load_factory_receipts(root, run_id=run_id), run_id=run_id)


def load_authenticated_factory_receipts(
    root: Path,
    *,
    run_id: str,
    allowed_public_keys: dict[str, Ed25519PublicKey],
    now: datetime,
) -> tuple[FactoryReceiptV1, ...]:
    """Verify Studio signatures and return only run-scoped receipt payloads."""
    safe_run = require_safe_id(run_id, field="run_id")
    prefix = f"campaigns/{safe_run}/authenticated-receipts"
    receipts: list[FactoryReceiptV1] = []
    message_ids: dict[str, str] = {}
    for relative, payload in verified_json_messages(root, prefix):
        parts = Path(relative).parts
        if len(parts) != 4 or parts[1] != safe_run or parts[2] != "authenticated-receipts":
            raise ValueError("cross-run authenticated receipt path injection")
        message = AuthenticatedFactoryMessageV1.model_validate_json(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        )
        verified = verify_factory_message(
            message,
            expected_purpose="receipt",
            expected_run_id=safe_run,
            allowed_public_keys=allowed_public_keys,
            now=now,
        )
        previous = message_ids.get(message.envelope.message_id)
        if previous is not None and previous != message.envelope.payload_sha256:
            raise ValueError("conflicting authenticated receipt message ID")
        message_ids[message.envelope.message_id] = message.envelope.payload_sha256
        receipt = FactoryReceiptV1.model_validate_json(
            json.dumps(verified, ensure_ascii=False, separators=(",", ":"))
        )
        if receipt.event.run_id != safe_run:
            raise ValueError("authenticated receipt payload run mismatch")
        receipts.append(receipt)
    ordered = tuple(sorted(receipts, key=lambda row: (row.event.sequence, row.receipt_id)))
    if len({row.receipt_id for row in ordered}) != len(ordered):
        raise ValueError("duplicate authenticated receipt identity")
    return ordered


def observe_authenticated_receipts(
    root: Path,
    *,
    run_id: str,
    allowed_public_keys: dict[str, Ed25519PublicKey],
    now: datetime,
) -> FactoryProjection:
    return project_factory_receipts(
        load_authenticated_factory_receipts(
            root,
            run_id=run_id,
            allowed_public_keys=allowed_public_keys,
            now=now,
        ),
        run_id=run_id,
    )


def verify_authenticated_result_bundle(
    root: Path,
    *,
    run_id: str,
    document_id: str,
    station_id: str,
    allowed_public_keys: dict[str, Ed25519PublicKey],
    now: datetime,
) -> ImmutableArtifactManifestV1:
    safe_run = require_safe_id(run_id, field="run_id")
    safe_document = require_safe_id(document_id, field="document_id")
    safe_station = require_safe_id(station_id, field="station_id")
    relative_root = (
        f"campaigns/{safe_run}/results/{safe_document}/stations/{safe_station}"
    )
    bundle_root = Path(root) / relative_root
    manifest_relative = f"{relative_root}/artifact_manifest.auth.json"
    manifest_path = Path(root) / manifest_relative
    verify_checksum_pair(manifest_path, relative_path=manifest_relative)
    message = AuthenticatedFactoryMessageV1.model_validate_json(manifest_path.read_bytes())
    payload = verify_factory_message(
        message,
        expected_purpose="result_manifest",
        expected_run_id=safe_run,
        allowed_public_keys=allowed_public_keys,
        now=now,
    )
    manifest = ImmutableArtifactManifestV1.model_validate_json(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    )
    if (
        manifest.run_id != safe_run or manifest.document_id != safe_document
        or manifest.station_id != safe_station
    ):
        raise ValueError("authenticated result manifest path identity mismatch")
    expected_payloads = {row.relative_path for row in manifest.artifacts}
    expected_files = {
        "artifact_manifest.auth.json", "artifact_manifest.auth.json.sha256",
        *expected_payloads,
        *(f"{path}.sha256" for path in expected_payloads),
    }
    actual_files = {
        path.relative_to(bundle_root).as_posix()
        for path in bundle_root.rglob("*") if path.is_file()
    }
    if actual_files != expected_files:
        raise ValueError("returned result contains missing or unmanifested artifacts")
    for entry in manifest.artifacts:
        relative = f"{relative_root}/{entry.relative_path}"
        path = Path(root) / relative
        verified = verify_checksum_pair(path, relative_path=relative)
        if verified["bytes"] != entry.byte_count or verified["sha256"] != entry.sha256:
            raise ValueError("returned result artifact does not match manifest")
    return manifest


def forbidden_mutable_members(root: Path) -> tuple[str, ...]:
    root = Path(root)
    if not root.exists():
        return ()
    bad: list[str] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() and not path.is_symlink():
            continue
        name = path.name.lower()
        if name in {".env"} or any(name.endswith(suffix) for suffix in MUTABLE_SUFFIXES):
            bad.append(path.relative_to(root).as_posix())
        elif any(token in name for token in ("secret", "api_key", "access_token")):
            bad.append(path.relative_to(root).as_posix())
    return tuple(bad)


def assert_clean_transfer_tree(root: Path) -> None:
    bad = forbidden_mutable_members(root)
    if bad:
        raise ValueError(f"forbidden mutable transfer members: {bad}")
