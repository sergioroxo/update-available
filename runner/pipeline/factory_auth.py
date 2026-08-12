"""Authenticated, domain-separated factory messages for production-shaped runs.

Checksums remain the transfer-integrity boundary.  These Ed25519 envelopes add
origin authentication, purpose separation, expiry, and stable message identity.
Unsigned payloads continue to exist only in the explicitly synthetic runtime.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import stat
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal, Mapping

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from runner.models.reprocessing import require_safe_id, require_sha256
from .factory_messages import canonical_json_bytes, sha256_bytes


MESSAGE_DOMAIN = b"SurvivingSOGICE.FactoryMessage.v1\x00"
MessagePurpose = Literal[
    "campaign_release", "command", "receipt", "result_manifest", "service_status"
]


class FactoryAuthenticationError(ValueError):
    """A fail-closed production authentication error."""


class AuthenticatedEnvelopeV1(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)

    schema_version: Literal["factory-authenticated-envelope-v1.0"] = (
        "factory-authenticated-envelope-v1.0"
    )
    purpose: MessagePurpose
    run_id: str
    message_id: str
    key_id: str
    payload_sha256: str
    issued_at: datetime
    expires_at: datetime | None = None
    signature_algorithm: Literal["Ed25519"] = "Ed25519"
    signature_b64: str

    @field_validator("run_id", "message_id", "key_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("payload_sha256")
    @classmethod
    def _payload_hash(cls, value: str) -> str:
        return require_sha256(value, field="payload_sha256")

    @field_validator("issued_at", "expires_at")
    @classmethod
    def _times(cls, value: datetime | None, info) -> datetime | None:
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError(f"{info.field_name} must include a timezone")
        return value

    @field_validator("signature_b64")
    @classmethod
    def _signature(cls, value: str) -> str:
        try:
            decoded = base64.b64decode(value, validate=True)
        except Exception as exc:
            raise ValueError("signature is not canonical base64") from exc
        if len(decoded) != 64 or base64.b64encode(decoded).decode("ascii") != value:
            raise ValueError("signature is not a canonical Ed25519 signature")
        return value

    @model_validator(mode="after")
    def _expiry(self) -> "AuthenticatedEnvelopeV1":
        if self.expires_at is not None and self.expires_at <= self.issued_at:
            raise ValueError("authenticated message expiry must follow issue time")
        if self.purpose == "command" and self.expires_at is None:
            raise ValueError("authenticated commands require expiry")
        return self


class AuthenticatedFactoryMessageV1(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)

    schema_version: Literal["authenticated-factory-message-v1.0"] = (
        "authenticated-factory-message-v1.0"
    )
    envelope: AuthenticatedEnvelopeV1
    payload: dict[str, Any]

    @model_validator(mode="after")
    def _payload_binding(self) -> "AuthenticatedFactoryMessageV1":
        if sha256_bytes(canonical_json_bytes(self.payload)) != self.envelope.payload_sha256:
            raise ValueError("authenticated payload hash mismatch")
        return self


def _inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def _require_local_absolute(path: Path, *, shared_roots: tuple[Path, ...]) -> Path:
    path = Path(path)
    if not path.is_absolute():
        raise FactoryAuthenticationError("key destination must be an absolute host-local path")
    if any(_inside(path, Path(root)) for root in shared_roots):
        raise FactoryAuthenticationError("key material must remain outside shared exchange roots")
    return path


def _write_exclusive(path: Path, data: bytes, mode: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    descriptor = os.open(path, flags, mode)
    try:
        with os.fdopen(descriptor, "wb", closefd=True) as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
    except Exception:
        try:
            path.unlink()
        except OSError:
            pass
        raise
    os.chmod(path, mode)


def public_key_id(public_key: Ed25519PublicKey) -> str:
    raw = public_key.public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw,
    )
    return f"ed25519-{hashlib.sha256(raw).hexdigest()[:32]}"


def generate_keypair(
    private_key_path: Path,
    public_key_path: Path,
    *,
    shared_roots: tuple[Path, ...] = (),
) -> dict[str, str]:
    """Generate one explicitly requested host-local key pair without overwrite."""
    private_path = _require_local_absolute(private_key_path, shared_roots=shared_roots)
    public_path = _require_local_absolute(public_key_path, shared_roots=shared_roots)
    if private_path == public_path:
        raise FactoryAuthenticationError("private and public key paths must differ")
    if private_path.exists() or public_path.exists() or private_path.is_symlink() or public_path.is_symlink():
        raise FileExistsError("key generation refuses to overwrite an existing path")
    private_key = Ed25519PrivateKey.generate()
    private_bytes = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    public_bytes = private_key.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    _write_exclusive(private_path, private_bytes, 0o600)
    try:
        _write_exclusive(public_path, public_bytes, 0o644)
    except Exception:
        private_path.unlink(missing_ok=True)
        raise
    return {
        "key_id": public_key_id(private_key.public_key()),
        "private_key_path": str(private_path),
        "public_key_path": str(public_path),
    }


def load_private_key(
    path: Path, *, shared_roots: tuple[Path, ...] = (),
) -> Ed25519PrivateKey:
    path = _require_local_absolute(path, shared_roots=shared_roots)
    if path.is_symlink() or not path.is_file():
        raise FactoryAuthenticationError("private key must be a regular host-local file")
    mode = stat.S_IMODE(path.stat().st_mode)
    if mode & 0o077:
        raise FactoryAuthenticationError("private key permissions must be 0600 or stricter")
    try:
        key = serialization.load_pem_private_key(path.read_bytes(), password=None)
    except Exception as exc:
        raise FactoryAuthenticationError("private key is malformed") from exc
    if not isinstance(key, Ed25519PrivateKey):
        raise FactoryAuthenticationError("private key is not Ed25519")
    return key


def load_public_key(path: Path, *, shared_roots: tuple[Path, ...] = ()) -> Ed25519PublicKey:
    path = _require_local_absolute(path, shared_roots=shared_roots)
    if path.is_symlink() or not path.is_file():
        raise FactoryAuthenticationError("public key must be a regular host-local file")
    try:
        key = serialization.load_pem_public_key(path.read_bytes())
    except Exception as exc:
        raise FactoryAuthenticationError("public key is malformed") from exc
    if not isinstance(key, Ed25519PublicKey):
        raise FactoryAuthenticationError("public key is not Ed25519")
    return key


def public_key_allowlist(
    paths: tuple[Path, ...], *, shared_roots: tuple[Path, ...] = (),
) -> dict[str, Ed25519PublicKey]:
    if not paths:
        raise FactoryAuthenticationError("production authentication allow-list is empty")
    result: dict[str, Ed25519PublicKey] = {}
    for path in paths:
        key = load_public_key(path, shared_roots=shared_roots)
        key_id = public_key_id(key)
        if key_id in result:
            raise FactoryAuthenticationError("duplicate public key in allow-list")
        result[key_id] = key
    return result


def _signing_fields(envelope: AuthenticatedEnvelopeV1) -> dict[str, Any]:
    fields = envelope.model_dump(mode="json")
    fields.pop("signature_b64")
    return fields


def signed_bytes(envelope: AuthenticatedEnvelopeV1) -> bytes:
    return MESSAGE_DOMAIN + canonical_json_bytes(_signing_fields(envelope))


def sign_factory_message(
    payload: BaseModel | Mapping[str, Any],
    *,
    purpose: MessagePurpose,
    run_id: str,
    message_id: str,
    private_key_path: Path,
    issued_at: datetime,
    expires_at: datetime | None = None,
    shared_roots: tuple[Path, ...] = (),
) -> AuthenticatedFactoryMessageV1:
    payload_dict = (
        payload.model_dump(mode="json") if isinstance(payload, BaseModel) else dict(payload)
    )
    private_key = load_private_key(private_key_path, shared_roots=shared_roots)
    unsigned = AuthenticatedEnvelopeV1(
        purpose=purpose,
        run_id=run_id,
        message_id=message_id,
        key_id=public_key_id(private_key.public_key()),
        payload_sha256=sha256_bytes(canonical_json_bytes(payload_dict)),
        issued_at=issued_at,
        expires_at=expires_at,
        signature_b64=base64.b64encode(b"\0" * 64).decode("ascii"),
    )
    signature = private_key.sign(signed_bytes(unsigned))
    envelope = unsigned.model_copy(update={
        "signature_b64": base64.b64encode(signature).decode("ascii"),
    })
    return AuthenticatedFactoryMessageV1(envelope=envelope, payload=payload_dict)


def verify_factory_message(
    message: AuthenticatedFactoryMessageV1,
    *,
    expected_purpose: MessagePurpose,
    expected_run_id: str,
    allowed_public_keys: Mapping[str, Ed25519PublicKey],
    now: datetime,
) -> dict[str, Any]:
    envelope = message.envelope
    if envelope.purpose != expected_purpose:
        raise FactoryAuthenticationError("authenticated message purpose mismatch")
    if envelope.run_id != expected_run_id:
        raise FactoryAuthenticationError("authenticated message run mismatch")
    if now.tzinfo is None or now.utcoffset() is None:
        raise FactoryAuthenticationError("verification time must include a timezone")
    if now < envelope.issued_at:
        raise FactoryAuthenticationError("authenticated message is not yet valid")
    if envelope.expires_at is not None and now >= envelope.expires_at:
        raise FactoryAuthenticationError("authenticated message has expired")
    key = allowed_public_keys.get(envelope.key_id)
    if key is None:
        raise FactoryAuthenticationError("authenticated message key is not trusted")
    if public_key_id(key) != envelope.key_id:
        raise FactoryAuthenticationError("authenticated message key identity mismatch")
    try:
        key.verify(base64.b64decode(envelope.signature_b64), signed_bytes(envelope))
    except (InvalidSignature, ValueError) as exc:
        raise FactoryAuthenticationError("authenticated message signature is invalid") from exc
    if sha256_bytes(canonical_json_bytes(message.payload)) != envelope.payload_sha256:
        raise FactoryAuthenticationError("authenticated message payload changed")
    return dict(message.payload)


def _main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="factory_auth")
    sub = parser.add_subparsers(dest="command", required=True)
    generate = sub.add_parser("generate-keypair")
    generate.add_argument("--private-key", required=True, type=Path)
    generate.add_argument("--public-key", required=True, type=Path)
    generate.add_argument("--shared-root", action="append", type=Path, default=[])
    args = parser.parse_args(argv)
    result = generate_keypair(
        args.private_key, args.public_key, shared_roots=tuple(args.shared_root),
    )
    print(json.dumps({"key_id": result["key_id"]}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
