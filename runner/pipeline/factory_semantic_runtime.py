"""Explicit host-local bridge from authenticated campaigns to the accepted runtime."""
from __future__ import annotations

import json
import os
import re
import stat
import subprocess
from pathlib import Path
from typing import Mapping
from urllib.parse import urlsplit

import yaml
from pydantic import SecretStr

from runner.models.reprocessing import AnalysisLexiconSnapshotV1

from .atomic_io import atomic_write_bytes
from .factory_messages import canonical_json_bytes, sha256_bytes, verify_checksum_pair
from .factory_semantic_campaign import (
    AcceptedSemanticRuntimeAdapter,
    SemanticCampaignApprovalV1,
    SemanticCampaignV1,
)
from .factory_semantic_pilot import (
    CopiedSemanticPilotContractV1,
    build_contract,
    endpoint_config,
    run_copied_semantic_pilot,
)


SEMANTIC_BASE_URL_ENV = "SOGICE_SEMANTIC_BASE_URL"
SEMANTIC_API_KEY_ENV = "SOGICE_SEMANTIC_API_KEY"
ACCEPTED_SWAP_GROWTH_BYTES = 2 * 1024**3
MAXIMUM_SEMANTIC_CREDENTIAL_FILE_BYTES = 1024 * 1024


def _inside(path: Path, root: Path) -> bool:
    path = path.resolve(strict=False)
    root = root.resolve(strict=False)
    return path == root or root in path.parents


def validate_loopback_semantic_base_url(value: str) -> str:
    """Return one normalized, credential-free loopback LiteLLM base URL."""
    if not isinstance(value, str) or not value or value != value.strip():
        raise ValueError("semantic runtime base URL is invalid")
    parsed = urlsplit(value)
    if (
        parsed.scheme != "http"
        or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}
        or parsed.port is None
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or parsed.path not in {"", "/"}
    ):
        raise ValueError("semantic runtime base URL must be credential-free loopback HTTP")
    return value.rstrip("/")


def validate_semantic_credential_file_metadata(
    path: Path, *, shared_roots: tuple[Path, ...],
) -> Path:
    """Validate a host-local credential file without reading its contents."""
    candidate = Path(path)
    if not candidate.is_absolute():
        raise ValueError("semantic credential path must be absolute")
    if candidate.is_symlink():
        raise ValueError("semantic credential file must not be a symlink")
    try:
        resolved = candidate.resolve(strict=True)
        metadata = candidate.lstat()
    except OSError as exc:
        raise ValueError("semantic credential file is unavailable") from exc
    if resolved != candidate:
        raise ValueError("semantic credential path must not traverse symlinks")
    if not stat.S_ISREG(metadata.st_mode):
        raise ValueError("semantic credential file must be regular")
    if metadata.st_uid != os.getuid():
        raise PermissionError("semantic credential file owner is invalid")
    if stat.S_IMODE(metadata.st_mode) != 0o600:
        raise PermissionError("semantic credential file mode must be 0600")
    if not 0 < metadata.st_size <= MAXIMUM_SEMANTIC_CREDENTIAL_FILE_BYTES:
        raise ValueError("semantic credential file size is invalid")
    if any(_inside(resolved, Path(root)) for root in shared_roots):
        raise ValueError("semantic credential file must remain outside shared trees")
    return resolved


def load_process_local_semantic_api_key(
    path: Path, *, shared_roots: tuple[Path, ...],
) -> SecretStr:
    """Read only LiteLLM's master key from a verified host-local YAML file."""
    resolved = validate_semantic_credential_file_metadata(
        path, shared_roots=shared_roots,
    )
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    try:
        descriptor = os.open(resolved, flags)
        try:
            metadata = os.fstat(descriptor)
            if (
                not stat.S_ISREG(metadata.st_mode)
                or metadata.st_uid != os.getuid()
                or stat.S_IMODE(metadata.st_mode) != 0o600
                or not 0 < metadata.st_size <= MAXIMUM_SEMANTIC_CREDENTIAL_FILE_BYTES
            ):
                raise PermissionError("semantic credential file identity changed")
            data = os.read(descriptor, MAXIMUM_SEMANTIC_CREDENTIAL_FILE_BYTES + 1)
        finally:
            os.close(descriptor)
    except OSError as exc:
        raise ValueError("semantic credential file could not be read safely") from exc
    if len(data) != metadata.st_size:
        raise ValueError("semantic credential file changed while reading")
    try:
        decoded = data.decode("utf-8", errors="strict")
        payload = yaml.safe_load(decoded)
    except (UnicodeDecodeError, yaml.YAMLError) as exc:
        raise ValueError("semantic credential configuration is malformed") from exc
    general = payload.get("general_settings") if isinstance(payload, dict) else None
    value = general.get("master_key") if isinstance(general, dict) else None
    if (
        not isinstance(value, str)
        or not value
        or value != value.strip()
        or len(value) > 4096
        or "\x00" in value
        or "\n" in value
        or "\r" in value
    ):
        raise ValueError("semantic credential configuration has no valid master key")
    return SecretStr(value)


def _write_immutable(path: Path, data: bytes, *, mode: int = 0o600) -> None:
    path = Path(path)
    if path.is_symlink():
        raise ValueError("semantic runtime immutable path is a symlink")
    if path.exists():
        if not path.is_file() or path.read_bytes() != data:
            raise ValueError("semantic runtime immutable identity changed")
        return
    atomic_write_bytes(path, data)
    os.chmod(path, mode)


def prepare_accepted_runtime_contract(
    *,
    campaign: SemanticCampaignV1,
    approval: SemanticCampaignApprovalV1,
    to_studio: Path,
    from_studio: Path,
    run_state: Path,
) -> CopiedSemanticPilotContractV1:
    """Bind authenticated authority and copied objects into one strict pilot input."""
    to_studio = Path(to_studio).resolve(strict=False)
    from_studio = Path(from_studio).resolve(strict=False)
    run_state = Path(run_state).resolve(strict=False)
    expected_run_state = run_state.parent / campaign.run_id
    if run_state != expected_run_state:
        raise ValueError("semantic runtime state is not bound to its run ID")
    workspace = run_state / "semantic-runtime"
    if _inside(workspace, to_studio) or _inside(workspace, from_studio):
        raise ValueError("semantic runtime workspace overlaps a shared tree")
    if campaign.run_id != approval.run_id or campaign.approval_id != approval.approval_id:
        raise ValueError("semantic runtime campaign/approval identity mismatch")
    if campaign.routes != approval.routes or campaign.memory_policy != approval.memory_policy:
        raise ValueError("semantic runtime campaign authority changed")
    policy = campaign.memory_policy
    if (
        not policy.global_model_lease
        or policy.maximum_resident_models != 1
        or policy.route_transition_concurrency != 1
        or not policy.explicit_unload_required
        or policy.maximum_swap_growth_bytes != ACCEPTED_SWAP_GROWTH_BYTES
    ):
        raise ValueError("semantic runtime memory policy is not accepted")

    snapshot_source = to_studio / campaign.lexicon_snapshot_relative_path
    verify_checksum_pair(
        snapshot_source, relative_path=campaign.lexicon_snapshot_relative_path,
    )
    snapshot_bytes = snapshot_source.read_bytes()
    snapshot = AnalysisLexiconSnapshotV1.model_validate_json(snapshot_bytes)
    if (
        snapshot.snapshot_id != campaign.lexicon_snapshot_id
        or snapshot.canonical_sha256 != campaign.lexicon_snapshot_sha256
        or snapshot.canonical_sha256 != approval.lexicon_snapshot_sha256
    ):
        raise ValueError("semantic runtime frozen vocabulary identity changed")
    snapshot_target = workspace / "lexicon_snapshot.json"
    _write_immutable(snapshot_target, snapshot_bytes)

    approvals = {row.document_id: row for row in approval.documents}
    references = {row.doc_id: row for row in campaign.source_references}
    if tuple(sorted(approvals)) != campaign.document_ids:
        raise ValueError("semantic runtime approval document authority changed")
    if tuple(sorted(references)) != campaign.document_ids:
        raise ValueError("semantic runtime source authority changed")
    documents = []
    for document_id in campaign.document_ids:
        document = approvals[document_id]
        reference = references[document_id]
        if reference.source_ref_kind != "source_object":
            raise ValueError("semantic runtime requires copied source objects")
        if reference.source_sha256 != document.source_sha256:
            raise ValueError("semantic runtime source hash authority changed")
        source = to_studio / reference.relative_object_path
        verify_checksum_pair(source, relative_path=reference.relative_object_path)
        source_bytes = source.read_bytes()
        if len(source_bytes) != document.source_bytes or sha256_bytes(source_bytes) != document.source_sha256:
            raise ValueError("semantic runtime source bytes changed")
        try:
            source_text = source_bytes.decode("utf-8", errors="strict")
        except UnicodeDecodeError as exc:
            raise ValueError("semantic runtime source is not strict UTF-8") from exc
        if len(source_text) != document.source_characters:
            raise ValueError("semantic runtime source character identity changed")
        source_target = workspace / "input" / document_id / "source.txt"
        _write_immutable(source_target, source_bytes)
        documents.append({
            "document_id": document_id,
            "title": document.title,
            "source_sha256": document.source_sha256,
            "source_bytes": document.source_bytes,
            "source_characters": document.source_characters,
            "source_path": str(source_target),
            "source_family_id": document.source_family_id,
            "stance": document.stance,
            "language": document.language,
        })

    authority_bytes = canonical_json_bytes({
        "schema_version": "authenticated-semantic-runtime-authority-v1.0",
        "campaign": campaign.model_dump(mode="json"),
        "approval": approval.model_dump(mode="json"),
        "lexicon_snapshot_sha256": snapshot.canonical_sha256,
    })
    contract = build_contract({
        "run_id": campaign.run_id,
        "prompt_id": "authenticated-semantic-runtime",
        "prompt_body_sha256": sha256_bytes(authority_bytes),
        "prompt_body_bytes": len(authority_bytes),
        "approval_text": approval.researcher_confirmation_text,
        "approved_document_count": len(documents),
        "documents": tuple(documents),
        "workspace": str(workspace),
        "forbidden_roots": tuple(sorted((str(to_studio), str(from_studio)))),
        "route_aliases": campaign.routes.model_dump(mode="json"),
        "mapper_maximum_concurrency": 1,
        "lexicon_snapshot_sha256": campaign.lexicon_snapshot_sha256,
        "lexicon_snapshot_path": str(snapshot_target),
        "remote_writes": False,
        "publication": False,
        "corpus_import": False,
    })
    _write_immutable(
        workspace / "contract.json",
        json.dumps(
            contract.model_dump(mode="json"), sort_keys=True,
            ensure_ascii=False, separators=(",", ":"),
        ).encode("utf-8") + b"\n",
    )
    return contract


def _capture_memory_baseline(workspace: Path) -> None:
    path = Path(workspace) / "state" / "memory_safety_baseline.json"
    if path.exists():
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload.get("swap_used_bytes"), int):
            raise ValueError("semantic runtime memory baseline is malformed")
        return
    completed = subprocess.run(
        ["/usr/sbin/sysctl", "vm.swapusage"], check=False,
        capture_output=True, text=True, timeout=30,
    )
    match = re.search(r"used = ([0-9.]+)([MG])", completed.stdout)
    if completed.returncode != 0 or match is None:
        raise RuntimeError("semantic runtime swap baseline is unavailable")
    swap_used = float(match.group(1)) * (
        1024**3 if match.group(2) == "G" else 1024**2
    )
    payload = {
        "schema_version": "semantic-runtime-memory-baseline-v1.0",
        "swap_used_bytes": int(swap_used),
        "maximum_swap_growth_bytes": ACCEPTED_SWAP_GROWTH_BYTES,
        "content_free": True,
    }
    _write_immutable(
        path,
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode() + b"\n",
    )


def run_accepted_local_semantic_runtime(
    *,
    campaign: SemanticCampaignV1,
    approval: SemanticCampaignApprovalV1,
    to_studio: Path,
    from_studio: Path,
    run_state: Path,
    base_url: str,
    api_key: str,
) -> Path:
    contract = prepare_accepted_runtime_contract(
        campaign=campaign, approval=approval, to_studio=to_studio,
        from_studio=from_studio, run_state=run_state,
    )
    workspace = Path(contract.workspace)
    _capture_memory_baseline(workspace)
    endpoint = endpoint_config(
        base_url=base_url, api_key=api_key,
        global_model_lease_path=str(workspace / "state" / "global_model.lease"),
        durable_receipt_path=str(workspace / "state" / "model_receipts.json"),
        durable_response_path=str(workspace / "state" / "model_responses.json"),
    )
    report = run_copied_semantic_pilot(
        contract=contract, endpoint=endpoint, host_role="mac-studio",
    )
    if report.get("run_id") != campaign.run_id:
        raise ValueError("semantic runtime returned another run identity")
    sealed = workspace / "sealed-results"
    if sealed.is_symlink() or not sealed.is_dir():
        raise ValueError("semantic runtime did not seal results")
    return sealed


def build_accepted_local_runtime_adapter(
    *,
    to_studio: Path,
    from_studio: Path,
    state_root: Path,
    host_role: str,
    environment: Mapping[str, str] | None = None,
) -> AcceptedSemanticRuntimeAdapter:
    """Construct the real adapter only for an explicit verified Mac Studio path."""
    if host_role != "mac-studio":
        raise PermissionError("accepted local semantic runtime requires the Mac Studio")
    values = os.environ if environment is None else environment
    base_url = values.get(SEMANTIC_BASE_URL_ENV, "").strip()
    api_key = values.get(SEMANTIC_API_KEY_ENV, "")
    if not base_url:
        raise RuntimeError("semantic runtime base URL is not configured")
    if not api_key:
        raise RuntimeError("semantic runtime API key is not configured")
    base_url = validate_loopback_semantic_base_url(base_url)
    # Validate the endpoint and route set before a campaign can be leased.
    endpoint_config(base_url=base_url, api_key=api_key)
    state_root = Path(state_root).resolve(strict=False)

    def runtime_runner(**kwargs) -> Path:
        run_state = Path(kwargs["run_state"]).resolve(strict=False)
        if run_state.parent != state_root:
            raise ValueError("semantic runtime escaped the configured state root")
        return run_accepted_local_semantic_runtime(
            campaign=kwargs["campaign"], approval=kwargs["approval"],
            to_studio=to_studio, from_studio=from_studio,
            run_state=run_state, base_url=base_url, api_key=api_key,
        )

    return AcceptedSemanticRuntimeAdapter(runtime_runner=runtime_runner)
