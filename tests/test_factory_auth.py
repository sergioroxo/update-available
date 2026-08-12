from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from pydantic import ValidationError

from runner.pipeline.factory_auth import (
    AuthenticatedFactoryMessageV1,
    FactoryAuthenticationError,
    generate_keypair,
    public_key_allowlist,
    sign_factory_message,
    verify_factory_message,
)


NOW = datetime(2026, 8, 12, 12, tzinfo=timezone.utc)


def _keys(tmp_path: Path, name: str = "authority"):
    private = tmp_path / f"{name}.private.pem"
    public = tmp_path / f"{name}.public.pem"
    generated = generate_keypair(private, public)
    return private, public, public_key_allowlist((public,)), generated["key_id"]


def _message(tmp_path: Path):
    private, public, allowed, key_id = _keys(tmp_path)
    message = sign_factory_message(
        {"run_id": "production-run", "sequence": 1},
        purpose="command",
        run_id="production-run",
        message_id="command-000001",
        private_key_path=private,
        issued_at=NOW,
        expires_at=NOW + timedelta(minutes=10),
    )
    return message, allowed, private, public, key_id


def test_valid_signature_and_key_fingerprint(tmp_path):
    message, allowed, private, public, key_id = _message(tmp_path)
    assert message.envelope.key_id == key_id
    assert verify_factory_message(
        message,
        expected_purpose="command",
        expected_run_id="production-run",
        allowed_public_keys=allowed,
        now=NOW + timedelta(seconds=1),
    )["sequence"] == 1
    assert private.stat().st_mode & 0o777 == 0o600
    assert public.stat().st_mode & 0o777 == 0o644


@pytest.mark.parametrize("field,value", [
    ("purpose", "receipt"),
    ("run_id", "another-run"),
])
def test_wrong_purpose_or_run_is_rejected(tmp_path, field, value):
    message, allowed, *_ = _message(tmp_path)
    arguments = {
        "expected_purpose": "command",
        "expected_run_id": "production-run",
    }
    arguments[f"expected_{field}"] = value
    with pytest.raises(FactoryAuthenticationError, match="mismatch"):
        verify_factory_message(
            message, allowed_public_keys=allowed,
            now=NOW + timedelta(seconds=1), **arguments,
        )


def test_payload_and_signature_tampering_are_rejected(tmp_path):
    message, allowed, *_ = _message(tmp_path)
    payload_tamper = message.model_dump()
    payload_tamper["payload"]["sequence"] = 2
    with pytest.raises(ValidationError, match="payload hash mismatch"):
        AuthenticatedFactoryMessageV1.model_validate(payload_tamper)
    signature_tamper = message.model_dump()
    signature_tamper["envelope"]["signature_b64"] = "A" * 86 + "=="
    forged = AuthenticatedFactoryMessageV1.model_validate(signature_tamper)
    with pytest.raises(FactoryAuthenticationError, match="signature is invalid"):
        verify_factory_message(
            forged, expected_purpose="command", expected_run_id="production-run",
            allowed_public_keys=allowed, now=NOW + timedelta(seconds=1),
        )


def test_unknown_key_and_expired_action_are_rejected(tmp_path):
    message, _allowed, *_ = _message(tmp_path)
    _other_private, _other_public, other_allowed, _ = _keys(tmp_path, "other")
    with pytest.raises(FactoryAuthenticationError, match="not trusted"):
        verify_factory_message(
            message, expected_purpose="command", expected_run_id="production-run",
            allowed_public_keys=other_allowed, now=NOW + timedelta(seconds=1),
        )


def test_expired_action_with_trusted_key_is_rejected(tmp_path):
    message, allowed, *_ = _message(tmp_path)
    with pytest.raises(FactoryAuthenticationError, match="expired"):
        verify_factory_message(
            message, expected_purpose="command", expected_run_id="production-run",
            allowed_public_keys=allowed, now=NOW + timedelta(hours=1),
        )


def test_key_generation_refuses_overwrite_and_shared_tree(tmp_path):
    private, public, *_ = _keys(tmp_path)
    with pytest.raises(FileExistsError, match="overwrite"):
        generate_keypair(private, public)
    shared = tmp_path / "shared"
    shared.mkdir()
    with pytest.raises(FactoryAuthenticationError, match="outside shared"):
        generate_keypair(
            shared / "private.pem", tmp_path / "public-2.pem",
            shared_roots=(shared,),
        )


def test_unsafe_private_permissions_fail_closed(tmp_path):
    private, _public, *_ = _message(tmp_path)[2:]
    private.chmod(0o644)
    with pytest.raises(FactoryAuthenticationError, match="permissions"):
        sign_factory_message(
            {"run_id": "production-run"}, purpose="receipt",
            run_id="production-run", message_id="receipt-1",
            private_key_path=private, issued_at=NOW,
        )
