"""Resumable local-only semantic pilot for an approved copied-text selection.

The runner is intentionally independent of Streamlit.  It accepts one strict,
hash-bound contract, reads only its copied workspace inputs, and never exposes
an import, publication, or remote-write path.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import os
import re
import socket
import subprocess
import tarfile
import time
from contextlib import contextmanager, nullcontext
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal, Sequence

import numpy as np
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    SecretStr,
    field_validator,
    model_validator,
)

from runner.models.reprocessing import require_safe_id, require_sha256
from runner.models.reprocessing import AnalysisLexiconSnapshotV1
from runner.models.retrieval import SourceUnitRowV1, canonical_contract_sha256
from runner.pipeline.analysis_sections import (
    CompilerInputReductionReceiptV1,
    DocumentCompilationV1,
    SectionAnalysisError,
    SectionAnalysisStore,
    build_adaptive_analysis_plan,
    build_compiler_input_reduction_receipt,
    content_free_section_failure,
    execute_document_compiler,
    run_parallel_jobs,
    validate_compilation,
)
from runner.pipeline.atomic_io import atomic_write_bytes
from runner.pipeline.citation_units_v2 import (
    CitationUnitsV2,
    SectionsV2,
    artifact_sha256,
    build_citation_units_v2,
    build_sections_v2,
    canonical_artifact_bytes,
)
from runner.pipeline.retrieval import hybrid_retrieve
from runner.pipeline.retrieval_context import (
    build_grounded_enrichment_request,
    build_retrieval_context,
    build_retrieval_query,
    execute_grounded_enrichment,
    validate_grounded_enrichment_output,
)
from runner.pipeline.retrieval_index import (
    build_retrieval_index,
    validate_bge_m3_shadow_vectors,
    verify_retrieval_index,
)
from runner.pipeline.semantic_model_adapters import (
    LocalDocumentCompilerExecutor,
    LocalEmbeddingProvider,
    LocalGroundedEnrichmentExecutor,
    LocalModelRouteV1,
    LocalSectionExecutor,
    ModelCallReceiptV1,
    OpenAICompatibleLocalClient,
    SemanticEndpointConfigV1,
)


RUN021_VALIDATED_MODELS = {
    "section_mapper": "ollama_chat/qwen3.6:35b-mlx",
    "document_compiler": "ollama_chat/gemma4:31b-mlx",
    "qwen38_mapper_repair": "ollama_chat/qwen3.8:27b-mlx",
    "qwen38_compiler_candidate": "ollama_chat/qwen3.8:27b-mlx",
    "qwen_embedding": "ollama/qwen3-embedding:8b",
    "bge_shadow": "ollama/bge-m3:latest",
    "grounded_enrichment": "ollama_chat/gemma4:31b-mlx",
}
TRUNCATION_MARKER = "[TRUNCATED MIDDLE"
NO_SNAPSHOT_SHA256 = hashlib.sha256(b"no-approved-snapshot-v1.0").hexdigest()
SEALED_ROOT_FILES = frozenset({
    "anchor_candidates.json",
    "content_free_failures.json",
    "execution_summary.json",
    "index_manifest.json",
    "model_receipts.json",
    "pilot_projection.json",
    "researcher_comparison_report.json",
    "route_provenance.json",
    "source_partition_manifest.json",
})
SEALED_DIRECTORIES = frozenset({
    "analysis", "compiler-input", "compilers", "enrichment", "retrieval",
})


class SemanticPilotError(ValueError):
    """Content-free copied-pilot contract or execution failure."""

    def __init__(self, error_code: str):
        super().__init__(error_code)
        self.error_code = error_code


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)


class PilotDocumentV1(_Strict):
    document_id: str
    title: str = Field(min_length=1, max_length=300)
    source_sha256: str
    source_bytes: int = Field(ge=1)
    source_characters: int = Field(ge=1)
    source_path: str
    source_family_id: str
    stance: Literal["supporting", "opposed", "neutral", "unknown"]
    language: str = Field(min_length=2, max_length=20)

    @field_validator("document_id", "source_family_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("source_sha256")
    @classmethod
    def _hash(cls, value: str) -> str:
        return require_sha256(value, field="source_sha256")

    @field_validator("title", "language")
    @classmethod
    def _text_metadata(cls, value: str) -> str:
        if value != value.strip() or any(char in value for char in ("\n", "\r", "\x00")):
            raise ValueError("pilot source metadata is malformed")
        return value


class PilotRouteAliasesV1(_Strict):
    section_mapper: Literal["core-qwen"] = "core-qwen"
    document_compiler: Literal["core-gemma"] = "core-gemma"
    qwen38_mapper_repair: Literal["compiler-qwen38"] = "compiler-qwen38"
    qwen38_compiler_candidate: Literal["compiler-qwen38"] = "compiler-qwen38"
    qwen_embedding: Literal["research-embedding"] = "research-embedding"
    bge_shadow: Literal["bge-m3-shadow"] = "bge-m3-shadow"
    grounded_enrichment: Literal["core-gemma"] = "core-gemma"


class CopiedSemanticPilotContractV1(_Strict):
    schema_version: Literal["copied-semantic-pilot-contract-v1.0"] = (
        "copied-semantic-pilot-contract-v1.0"
    )
    run_id: str
    prompt_id: str
    prompt_body_sha256: str
    prompt_body_bytes: int = Field(ge=1)
    approval_text: str = Field(min_length=1, max_length=2000)
    approval_sha256: str
    approved_document_count: int = Field(ge=1, le=12)
    documents: tuple[PilotDocumentV1, ...]
    selection_sha256: str
    workspace: str
    forbidden_roots: tuple[str, ...]
    sections_version: Literal["sections-v2.0"] = "sections-v2.0"
    citation_units_version: Literal["citation-units-v2.0"] = "citation-units-v2.0"
    route_aliases: PilotRouteAliasesV1 = PilotRouteAliasesV1()
    mapper_maximum_concurrency: int = Field(default=4, ge=1, le=4)
    mapper_maximum_attempts: Literal[2] = 2
    mapper_repair_attempts: Literal[1] = 1
    retrieval_policy: Literal["hybrid-rrf-source-only-v1.0"] = (
        "hybrid-rrf-source-only-v1.0"
    )
    retrieval_limit: int = Field(default=8, ge=1, le=20)
    per_family_cap: int = Field(default=3, ge=1, le=20)
    contradiction_slots: int = Field(default=2, ge=0, le=10)
    lexicon_snapshot_sha256: str = NO_SNAPSHOT_SHA256
    lexicon_snapshot_path: str = ""
    remote_writes: Literal[False] = False
    publication: Literal[False] = False
    corpus_import: Literal[False] = False
    contract_sha256: str

    @field_validator("run_id", "prompt_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator(
        "prompt_body_sha256", "approval_sha256", "selection_sha256", "contract_sha256",
        "lexicon_snapshot_sha256",
    )
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @model_validator(mode="after")
    def _authority(self) -> "CopiedSemanticPilotContractV1":
        if self.approval_sha256 != hashlib.sha256(self.approval_text.encode()).hexdigest():
            raise ValueError("pilot approval hash mismatch")
        if len(self.documents) != self.approved_document_count:
            raise ValueError("pilot approved document count mismatch")
        if len({row.document_id for row in self.documents}) != len(self.documents):
            raise ValueError("pilot document IDs must be unique")
        if len({row.source_sha256 for row in self.documents}) != len(self.documents):
            raise ValueError("pilot source hashes must be unique")
        ordered = tuple(sorted(self.documents, key=lambda row: row.document_id))
        selection = hashlib.sha256(json.dumps(
            [row.model_dump(mode="json") for row in ordered],
            sort_keys=True, ensure_ascii=False, separators=(",", ":"),
        ).encode()).hexdigest()
        if selection != self.selection_sha256:
            raise ValueError("pilot selection hash mismatch")
        if self.contract_sha256 != canonical_contract_sha256(
            self, omit={"contract_sha256"},
        ):
            raise ValueError("pilot contract hash mismatch")
        workspace = Path(self.workspace)
        if not workspace.is_absolute():
            raise ValueError("pilot workspace must be absolute")
        resolved_workspace = workspace.resolve(strict=False)
        for root_value in self.forbidden_roots:
            root = Path(root_value)
            if not root.is_absolute():
                raise ValueError("pilot forbidden root must be absolute")
            resolved_root = root.resolve(strict=False)
            if resolved_workspace == resolved_root or resolved_root in resolved_workspace.parents:
                raise ValueError("pilot workspace overlaps a forbidden root")
        expected_input = resolved_workspace / "input"
        for row in self.documents:
            path = Path(row.source_path)
            if not path.is_absolute() or path.resolve(strict=False) != (
                expected_input / row.document_id / "source.txt"
            ):
                raise ValueError("pilot source path is outside its bound input slot")
        if self.lexicon_snapshot_sha256 == NO_SNAPSHOT_SHA256:
            if self.lexicon_snapshot_path:
                raise ValueError("pilot no-snapshot identity cannot declare a snapshot path")
        else:
            snapshot_path = Path(self.lexicon_snapshot_path)
            if not snapshot_path.is_absolute() or snapshot_path.resolve(strict=False) != (
                resolved_workspace / "lexicon_snapshot.json"
            ):
                raise ValueError("pilot lexicon snapshot is outside its bound workspace slot")
        return self


def build_contract(values: dict[str, Any]) -> CopiedSemanticPilotContractV1:
    """Hash a fully populated contract draft; useful to callers and tests."""
    payload = dict(values)
    documents = tuple(PilotDocumentV1.model_validate(row) for row in payload["documents"])
    payload["documents"] = documents
    payload["forbidden_roots"] = tuple(payload["forbidden_roots"])
    if "route_aliases" in payload:
        payload["route_aliases"] = PilotRouteAliasesV1.model_validate(payload["route_aliases"])
    payload["selection_sha256"] = hashlib.sha256(json.dumps(
        [row.model_dump(mode="json") for row in sorted(documents, key=lambda row: row.document_id)],
        sort_keys=True, ensure_ascii=False, separators=(",", ":"),
    ).encode()).hexdigest()
    payload["approval_sha256"] = hashlib.sha256(payload["approval_text"].encode()).hexdigest()
    payload["contract_sha256"] = "0" * 64
    draft = CopiedSemanticPilotContractV1.model_construct(**payload)
    payload["contract_sha256"] = canonical_contract_sha256(
        draft, omit={"contract_sha256"},
    )
    return CopiedSemanticPilotContractV1.model_validate(payload)


def load_contract(path: Path) -> CopiedSemanticPilotContractV1:
    return CopiedSemanticPilotContractV1.model_validate_json(Path(path).read_bytes())


def _json_bytes(value: Any, *, indent: int | None = None) -> bytes:
    return (json.dumps(
        value, sort_keys=True, ensure_ascii=False, separators=(",", ":") if indent is None else None,
        indent=indent,
    ) + ("\n" if indent is not None else "")).encode()


def _sha_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _require_git_object_id(value: str) -> str:
    if re.fullmatch(r"(?:[0-9a-f]{40}|[0-9a-f]{64})", value) is None:
        raise SemanticPilotError("pilot_source_commit_malformed")
    return value


def _write_json(path: Path, payload: Any) -> None:
    atomic_write_bytes(path, _json_bytes(payload, indent=2))


def _inside(path: Path, root: Path) -> bool:
    path = path.resolve(strict=False)
    root = root.resolve(strict=False)
    return path == root or root in path.parents


def _verify_sources(
    contract: CopiedSemanticPilotContractV1,
) -> dict[str, tuple[str, SectionsV2, CitationUnitsV2]]:
    verified: dict[str, tuple[str, SectionsV2, CitationUnitsV2]] = {}
    for document in sorted(contract.documents, key=lambda row: row.document_id):
        path = Path(document.source_path)
        if not path.is_file() or path.is_symlink():
            raise SemanticPilotError("pilot_bound_source_missing_or_unsafe")
        raw = path.read_bytes()
        if len(raw) != document.source_bytes or _sha_bytes(raw) != document.source_sha256:
            raise SemanticPilotError("pilot_bound_source_hash_or_size_mismatch")
        try:
            text = raw.decode("utf-8", errors="strict")
        except UnicodeDecodeError as exc:
            raise SemanticPilotError("pilot_bound_source_not_strict_utf8") from exc
        if len(text) != document.source_characters:
            raise SemanticPilotError("pilot_bound_source_character_count_mismatch")
        if TRUNCATION_MARKER in text.upper():
            raise SemanticPilotError("pilot_bound_source_historical_truncation_marker")
        source_artifact = f"input/{document.document_id}/source.txt"
        sections = build_sections_v2(
            text, doc_id=document.document_id, source_artifact=source_artifact,
            source_version="approved-copied-public-source-v1.0",
        )
        units = build_citation_units_v2(
            text, doc_id=document.document_id, source_artifact=source_artifact,
            source_version="approved-copied-public-source-v1.0",
        )
        for partition in (sections, units):
            reconstructed = "".join(row.text for row in partition.spans)
            if reconstructed.encode() != raw:
                raise SemanticPilotError("pilot_v2_partition_not_exact_reconstruction")
        evidence_dir = Path(contract.workspace) / "evidence" / document.document_id
        atomic_write_bytes(evidence_dir / "sections_v2.json", canonical_artifact_bytes(sections))
        atomic_write_bytes(evidence_dir / "citation_units_v2.json", canonical_artifact_bytes(units))
        verified[document.document_id] = (text, sections, units)
    return verified


def _verified_lexicon_terms(contract: CopiedSemanticPilotContractV1) -> tuple[dict[str, Any], ...]:
    if contract.lexicon_snapshot_sha256 == NO_SNAPSHOT_SHA256:
        return ()
    path = Path(contract.lexicon_snapshot_path)
    if path.is_symlink() or not path.is_file():
        raise SemanticPilotError("pilot_lexicon_snapshot_missing")
    try:
        snapshot = AnalysisLexiconSnapshotV1.model_validate_json(path.read_bytes())
    except Exception as exc:
        raise SemanticPilotError("pilot_lexicon_snapshot_invalid") from exc
    if snapshot.canonical_sha256 != contract.lexicon_snapshot_sha256:
        raise SemanticPilotError("pilot_lexicon_snapshot_stale")
    return tuple({
        "term_id": row.term_id,
        "preferred_term": row.preferred_term,
        "definition": row.definition,
        "variants": [variant.model_dump(mode="json") for variant in row.variants],
    } for row in snapshot.terms)


def endpoint_config(
    *, base_url: str, api_key: str,
    global_model_lease_path: str | None = None,
    durable_receipt_path: str | None = None,
) -> SemanticEndpointConfigV1:
    routes = (
        LocalModelRouteV1(
            route_id="mapper", purpose="section_mapper", requested_model="core-qwen",
            expected_resolved_models=(RUN021_VALIDATED_MODELS["section_mapper"],),
            maximum_output_tokens=4096,
        ),
        LocalModelRouteV1(
            route_id="compiler", purpose="document_compiler", requested_model="core-gemma",
            expected_resolved_models=(RUN021_VALIDATED_MODELS["document_compiler"],),
            maximum_output_tokens=8192,
        ),
        LocalModelRouteV1(
            route_id="mapper-repair", purpose="qwen38_mapper_repair",
            requested_model="compiler-qwen38",
            expected_resolved_models=(RUN021_VALIDATED_MODELS["qwen38_mapper_repair"],),
            maximum_output_tokens=4096,
        ),
        LocalModelRouteV1(
            route_id="comparison-compiler", purpose="qwen38_compiler_candidate",
            requested_model="compiler-qwen38",
            expected_resolved_models=(RUN021_VALIDATED_MODELS["qwen38_compiler_candidate"],),
            maximum_output_tokens=8192,
        ),
        LocalModelRouteV1(
            route_id="qwen-embedding", purpose="qwen_embedding",
            requested_model="research-embedding",
            expected_resolved_models=(RUN021_VALIDATED_MODELS["qwen_embedding"],),
            expected_dimension=4096,
        ),
        LocalModelRouteV1(
            route_id="bge-shadow", purpose="bge_shadow",
            requested_model="bge-m3-shadow",
            expected_resolved_models=(RUN021_VALIDATED_MODELS["bge_shadow"],),
            expected_dimension=1024,
        ),
        LocalModelRouteV1(
            route_id="grounded-enrichment", purpose="grounded_enrichment",
            requested_model="core-gemma",
            expected_resolved_models=(RUN021_VALIDATED_MODELS["grounded_enrichment"],),
            maximum_output_tokens=4096,
        ),
    )
    return SemanticEndpointConfigV1(
        base_url=base_url, api_key=SecretStr(api_key), timeout_seconds=600,
        global_model_lease_path=global_model_lease_path,
        durable_receipt_path=durable_receipt_path,
        routes=routes,
    )


def reuse_run021_bindings(client: OpenAICompatibleLocalClient) -> dict[str, str]:
    """Reuse the prompt-authorized single initial inventory observation."""
    bindings = {
        route.route_id: RUN021_VALIDATED_MODELS[route.purpose]
        for route in client.config.routes
    }
    return client.reuse_prevalidated_bindings(bindings)


class LocalModelPhaseGuard:
    """Fail-closed Ollama phase transitions with durable content-free snapshots."""

    OLLAMA = "/Applications/Ollama.app/Contents/Resources/ollama"
    MAX_SWAP_GROWTH_BYTES = 2 * 1024**3

    def __init__(self, *, workspace: Path, client: OpenAICompatibleLocalClient):
        self.workspace = Path(workspace)
        self.client = client
        baseline_path = self.workspace / "state" / "memory_safety_baseline.json"
        if not baseline_path.exists():
            raise SemanticPilotError("memory_safety_baseline_missing")
        baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
        swap = baseline.get("swap_used_bytes")
        if not isinstance(swap, int) or swap < 0:
            raise SemanticPilotError("memory_safety_baseline_malformed")
        self.baseline_swap_bytes = swap
        self.audit_path = self.workspace / "state" / "model_transition_audit.json"

    @staticmethod
    def _run(command: list[str], *, timeout: float = 30) -> subprocess.CompletedProcess:
        return subprocess.run(
            command, capture_output=True, text=True, timeout=timeout, check=False,
        )

    def _snapshot(self) -> dict[str, Any]:
        ps = self._run([self.OLLAMA, "ps"])
        if ps.returncode != 0:
            raise SemanticPilotError("ollama_ps_unavailable")
        resident = [
            row.split()[0] for row in ps.stdout.splitlines()[1:] if row.strip()
        ]
        pressure = self._run(["/usr/bin/memory_pressure", "-Q"])
        match = re.search(r"([0-9]+)%", pressure.stdout + pressure.stderr)
        if pressure.returncode != 0 or match is None:
            raise SemanticPilotError("memory_pressure_observation_failed")
        free_percent = int(match.group(1))
        pressure_state = (
            "normal" if free_percent >= 10
            else ("warning" if free_percent >= 5 else "critical")
        )
        swap = self._run(["/usr/sbin/sysctl", "vm.swapusage"])
        match = re.search(r"used = ([0-9.]+)([MG])", swap.stdout)
        if swap.returncode != 0 or match is None:
            raise SemanticPilotError("swap_observation_failed")
        swap_used = float(match.group(1)) * (
            1024**3 if match.group(2) == "G" else 1024**2
        )
        return {
            "resident_model_count": len(resident),
            "resident_models": resident,
            "memory_free_percent": free_percent,
            "memory_pressure_state": pressure_state,
            "swap_used_bytes": int(swap_used),
            "swap_growth_from_baseline_bytes": int(swap_used) - self.baseline_swap_bytes,
        }

    def _check_snapshot(self, snapshot: dict[str, Any]) -> None:
        if snapshot["resident_model_count"] > 1:
            raise SemanticPilotError("memory_safety_multiple_models_resident")
        if snapshot["memory_pressure_state"] != "normal":
            raise SemanticPilotError("memory_pressure_not_normal")
        if snapshot["swap_growth_from_baseline_bytes"] > self.MAX_SWAP_GROWTH_BYTES:
            raise SemanticPilotError("memory_safety_swap_growth_exceeded")

    def _record(self, *, phase: str, event: str, snapshot: dict[str, Any]) -> None:
        payload = {
            "schema_version": "run021-model-transition-audit-v1.0",
            "baseline_swap_used_bytes": self.baseline_swap_bytes,
            "events": [],
        }
        if self.audit_path.exists():
            payload = json.loads(self.audit_path.read_text(encoding="utf-8"))
            if payload.get("schema_version") != "run021-model-transition-audit-v1.0":
                raise SemanticPilotError("model_transition_audit_schema_mismatch")
        payload["events"].append({
            "sequence": len(payload["events"]) + 1,
            "phase": phase,
            "event": event,
            "snapshot": snapshot,
        })
        _write_json(self.audit_path, payload)

    def begin(self, *, phase: str) -> None:
        snapshot = self._snapshot()
        self._record(phase=phase, event="before_load", snapshot=snapshot)
        self._check_snapshot(snapshot)
        if snapshot["resident_model_count"] != 0:
            raise SemanticPilotError("model_phase_requires_empty_ollama_state")

    def finish(self, *, phase: str, resolved_model: str) -> None:
        before = self._snapshot()
        self._record(phase=phase, event="before_unload", snapshot=before)
        self._check_snapshot(before)
        active = self.client.active_resolved_model
        model_name = resolved_model.split("/", 1)[-1]
        if active is not None:
            stopped = self._run([self.OLLAMA, "stop", model_name], timeout=60)
            if stopped.returncode != 0:
                raise SemanticPilotError("ollama_explicit_unload_failed")
        after = None
        for _ in range(60):
            after = self._snapshot()
            if after["resident_model_count"] == 0:
                break
            time.sleep(1)
        assert after is not None
        self._record(phase=phase, event="after_unload", snapshot=after)
        self._check_snapshot(after)
        unloaded = after["resident_model_count"] == 0
        if not unloaded:
            raise SemanticPilotError("ollama_model_remained_loaded")
        if active is not None:
            self.client.release_model_lease_after_verified_unload(
                resolved_model, verify_unloaded=lambda: unloaded,
            )

    def before_model_activation(
        self, current_model: str | None, next_model: str,
    ) -> None:
        """Unload and verify every real dense-route transition before activation."""
        if current_model is not None:
            self.finish(
                phase=f"transition-from-{current_model}",
                resolved_model=current_model,
            )
        self.begin(phase=f"activate-{next_model}")

    def finish_active(self) -> None:
        active = self.client.active_resolved_model
        if active is not None:
            self.finish(phase=f"finalize-{active}", resolved_model=active)

    @contextmanager
    def phase(self, *, phase: str, resolved_model: str):
        # Per-request activation owns transitions because mapper repair can
        # cross routes inside the durable section scheduler.
        del phase, resolved_model
        yield


class PersistentEmbeddingCache:
    BATCH_SIZE = 8

    def __init__(self, provider: LocalEmbeddingProvider, path: Path):
        self.provider = provider
        self.path = Path(path)
        if self.path.exists():
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            if (
                payload.get("schema_version") != "copied-pilot-embedding-cache-v1.0"
                or payload.get("purpose") != provider.purpose
            ):
                raise SemanticPilotError("pilot_embedding_cache_identity_mismatch")
            self.values = dict(payload.get("values") or {})
        else:
            self.values: dict[str, list[float]] = {}

    def has_all(self, texts: Sequence[str]) -> bool:
        return all(hashlib.sha256(text.encode()).hexdigest() in self.values for text in texts)

    def _persist(self) -> None:
        atomic_write_bytes(self.path, _json_bytes({
            "schema_version": "copied-pilot-embedding-cache-v1.0",
            "purpose": self.provider.purpose,
            "values": self.values,
        }))

    def embed(self, texts: Sequence[str]) -> Sequence[Sequence[float]]:
        keys = [hashlib.sha256(text.encode()).hexdigest() for text in texts]
        missing: list[tuple[str, str]] = []
        observed = set(self.values)
        for text, key in zip(texts, keys):
            if key not in observed:
                missing.append((key, text))
                observed.add(key)
        for start in range(0, len(missing), self.BATCH_SIZE):
            batch = missing[start:start + self.BATCH_SIZE]
            vectors = self.provider.embed([row[1] for row in batch])
            if len(vectors) != len(batch):
                raise SemanticPilotError("pilot_embedding_cache_batch_mismatch")
            for (key, _text), vector in zip(batch, vectors):
                self.values[key] = list(vector)
            self._persist()
        return [self.values[key] for key in keys]


def _persist_failure(
    path: Path, error: BaseException, *, stage: str, requested_alias: str, attempt: int = 1,
) -> None:
    evidence = content_free_section_failure(
        error, requested_alias=requested_alias, attempt=attempt, stage=stage,
        error_code=(
            getattr(error, "error_code", "")
            if isinstance(error, (SectionAnalysisError, SemanticPilotError))
            else "unexpected_pilot_boundary_failure"
        ),
    )
    payload = {"schema_version": "copied-pilot-failure-log-v1.0", "failures": []}
    if path.exists():
        payload = json.loads(path.read_text(encoding="utf-8"))
        if payload.get("schema_version") != "copied-pilot-failure-log-v1.0":
            raise SemanticPilotError("pilot_failure_log_schema_mismatch")
    row = evidence.model_dump(mode="json")
    if row not in payload["failures"]:
        payload["failures"].append(row)
    _write_json(path, payload)


def _load_or_compile(
    *, path: Path, packet, executor: LocalDocumentCompilerExecutor, failure_log: Path,
    legacy_packet=None,
) -> DocumentCompilationV1:
    try:
        if path.exists():
            output = DocumentCompilationV1.model_validate_json(path.read_bytes())
            try:
                validate_compilation(packet, output)
            except SectionAnalysisError as exc:
                if (
                    exc.error_code != "compiler_output_packet_mismatch"
                    or legacy_packet is None
                ):
                    raise
                validate_compilation(legacy_packet, output)
            return output
        output = execute_document_compiler(packet, executor)
        atomic_write_bytes(path, _json_bytes(output.model_dump(mode="json")))
        return output
    except Exception as exc:
        _persist_failure(
            failure_log, exc, stage="document_compiler",
            requested_alias=executor.route.requested_model,
        )
        raise


def _analysis_payload(results) -> dict[str, Any]:
    findings = [
        finding
        for result in sorted(results, key=lambda row: row.job_id)
        for finding in result.findings
    ]
    return {
        "type": "independent_section_analysis",
        "format": "approved_copied_public_text",
        "scope": "bounded_six_document_pilot",
        "summary": "Completed independent Analysis findings used only for retrieval orientation.",
        "evidence": [row.statement for row in findings[:40]],
        "candidate_terms": sorted({row.prompt_id for row in findings}),
        "result_sha256s": [row.output_sha256 for row in sorted(results, key=lambda row: row.job_id)],
    }


def _compilation_disagreements(
    primary: DocumentCompilationV1, comparison: DocumentCompilationV1,
) -> dict[str, Any]:
    def projection(output: DocumentCompilationV1) -> list[dict[str, Any]]:
        return [{
            "claim_id": row.claim_id,
            "statement_sha256": hashlib.sha256(row.statement.encode()).hexdigest(),
            "citation_unit_ids": list(row.citation_unit_ids),
            "support_status": row.support_status,
        } for row in output.claims]

    left = projection(primary)
    right = projection(comparison)
    left_keys = {(row["statement_sha256"], tuple(row["citation_unit_ids"]), row["support_status"]) for row in left}
    right_keys = {(row["statement_sha256"], tuple(row["citation_unit_ids"]), row["support_status"]) for row in right}
    return {
        "document_id": primary.document_id,
        "primary_model": primary.requested_model,
        "comparison_model": comparison.requested_model,
        "primary_claims": left,
        "comparison_claims": right,
        "exact_agreement_count": len(left_keys & right_keys),
        "primary_only_count": len(left_keys - right_keys),
        "comparison_only_count": len(right_keys - left_keys),
        "model_truth_declaration": False,
    }


def _shadow_rankings(
    *, cache: PersistentEmbeddingCache, rows: list[SourceUnitRowV1],
    queries: dict[str, Any], top_k: int,
) -> dict[str, Any]:
    unit_vectors = validate_bge_m3_shadow_vectors(cache.embed([row.text for row in rows]))
    query_ids = sorted(queries)
    query_vectors = validate_bge_m3_shadow_vectors(cache.embed([
        "\n".join(queries[doc].components) for doc in query_ids
    ]))
    output: dict[str, Any] = {}
    vector_hashes = [hashlib.sha256(row.tobytes()).hexdigest() for row in unit_vectors]
    for query_id, query_vector in zip(query_ids, query_vectors):
        scores = unit_vectors @ query_vector
        eligible = [index for index, row in enumerate(rows) if row.document_id != query_id]
        ordered = sorted(
            eligible, key=lambda index: (-float(scores[index]), rows[index].document_id, rows[index].unit_id),
        )[:top_k]
        output[query_id] = [{
            "rank": rank,
            "document_id": rows[index].document_id,
            "unit_id": rows[index].unit_id,
            "score": float(scores[index]),
        } for rank, index in enumerate(ordered, start=1)]
    return {
        "schema_version": "bge-shadow-ranking-comparison-v1.0",
        "requested_model": "bge-m3-shadow",
        "dimension": 1024,
        "unit_count": len(rows),
        "vector_sha256s": vector_hashes,
        "rankings": output,
    }


def _validate_or_execute_enrichment(
    *, path: Path, request, executor: LocalGroundedEnrichmentExecutor, failure_log: Path,
) -> dict[str, Any]:
    try:
        if path.exists():
            saved = json.loads(path.read_text(encoding="utf-8"))
            expected = saved.pop("output_sha256", "")
            validated = validate_grounded_enrichment_output(request, saved)
            if validated["output_sha256"] != expected:
                raise SemanticPilotError("pilot_grounded_output_hash_mismatch")
            return validated
        output = execute_grounded_enrichment(request, executor)
        _write_json(path, output)
        return output
    except Exception as exc:
        _persist_failure(
            failure_log, exc, stage="grounded_enrichment",
            requested_alias=executor.route.requested_model,
        )
        raise


def _merge_receipts(path: Path, receipts: Sequence[ModelCallReceiptV1]) -> list[dict[str, Any]]:
    existing: list[dict[str, Any]] = []
    if path.exists():
        payload = json.loads(path.read_text(encoding="utf-8"))
        if payload.get("schema_version") != "copied-pilot-model-receipts-v1.0":
            raise SemanticPilotError("pilot_receipt_log_schema_mismatch")
        existing = list(payload.get("receipts") or [])
    known = {row["receipt_sha256"] for row in existing}
    for receipt in receipts:
        row = receipt.model_dump(mode="json")
        if row["receipt_sha256"] not in known:
            existing.append(row)
            known.add(row["receipt_sha256"])
    existing.sort(key=lambda row: row["receipt_sha256"])
    _write_json(path, {
        "schema_version": "copied-pilot-model-receipts-v1.0",
        "receipts": existing,
    })
    return existing


def _sealed_path_allowed(relative: Path) -> bool:
    if relative.is_absolute() or ".." in relative.parts or relative.suffix != ".json":
        return False
    if len(relative.parts) == 1:
        return relative.name in SEALED_ROOT_FILES
    return len(relative.parts) == 2 and relative.parts[0] in SEALED_DIRECTORIES


def validate_sealed_results(directory: Path) -> tuple[Path, ...]:
    files = tuple(sorted(path for path in Path(directory).rglob("*") if path.is_file()))
    if not files:
        raise SemanticPilotError("pilot_sealed_results_empty")
    for path in files:
        relative = path.relative_to(directory)
        if not _sealed_path_allowed(relative) or path.is_symlink():
            raise SemanticPilotError("pilot_sealed_result_member_forbidden")
        folded = relative.as_posix().casefold()
        if any(marker in folded for marker in (
            "source.txt", ".sqlite", "-wal", "-journal", ".env", "cache", "vector", "key",
        )):
            raise SemanticPilotError("pilot_sealed_result_sensitive_member")
        json.loads(path.read_text(encoding="utf-8"))
    return files


def build_results_archive(
    *, sealed_directory: Path, archive_path: Path, source_commit: str,
) -> dict[str, Any]:
    files = validate_sealed_results(sealed_directory)
    archive_path = Path(archive_path)
    raw = io.BytesIO()
    with tarfile.open(fileobj=raw, mode="w", format=tarfile.PAX_FORMAT) as archive:
        for path in files:
            relative = path.relative_to(sealed_directory).as_posix()
            data = path.read_bytes()
            info = tarfile.TarInfo(relative)
            info.size = len(data)
            info.mode = 0o644
            info.mtime = 0
            info.uid = info.gid = 0
            info.uname = info.gname = ""
            archive.addfile(info, io.BytesIO(data))
    compressed = io.BytesIO()
    with gzip.GzipFile(fileobj=compressed, mode="wb", mtime=0, filename="") as stream:
        stream.write(raw.getvalue())
    archive_bytes = compressed.getvalue()
    atomic_write_bytes(archive_path, archive_bytes)
    members = [{
        "path": path.relative_to(sealed_directory).as_posix(),
        "bytes": path.stat().st_size,
        "sha256": _sha_bytes(path.read_bytes()),
    } for path in files]
    manifest = {
        "schema_version": "copied-semantic-pilot-results-manifest-v1.0",
        "source_commit": _require_git_object_id(source_commit),
        "archive_path": archive_path.name,
        "archive_bytes": len(archive_bytes),
        "archive_sha256": _sha_bytes(archive_bytes),
        "members": members,
        "source_payload_members": 0,
        "raw_vector_members": 0,
        "remote_writes": 0,
    }
    return manifest


def _stage_sealed_results(
    *, workspace: Path, contract: CopiedSemanticPilotContractV1,
    partition_manifest: dict[str, Any], analyses: dict[str, Any],
    primary: dict[str, DocumentCompilationV1], comparison: dict[str, DocumentCompilationV1],
    index_manifest: Any, contexts: dict[str, Any], enrichments: dict[str, Any],
    bge: dict[str, Any], comparison_report: dict[str, Any], projection: dict[str, Any],
    receipts: list[dict[str, Any]], bindings: dict[str, str], execution_summary: dict[str, Any],
    compiler_input_receipts: dict[str, CompilerInputReductionReceiptV1],
) -> None:
    sealed = workspace / "sealed-results"
    sealed.mkdir(parents=True, exist_ok=True)
    _write_json(sealed / "source_partition_manifest.json", partition_manifest)
    for doc, payload in analyses.items():
        _write_json(sealed / "analysis" / f"{doc}.json", payload)
    for doc in sorted(primary):
        _write_json(sealed / "compilers" / f"{doc}-primary.json", primary[doc].model_dump(mode="json"))
        _write_json(sealed / "compilers" / f"{doc}-qwen38-comparison.json", comparison[doc].model_dump(mode="json"))
    for receipt_id, receipt in sorted(compiler_input_receipts.items()):
        _write_json(
            sealed / "compiler-input" / f"{receipt_id}.json",
            receipt.model_dump(mode="json"),
        )
    _write_json(sealed / "index_manifest.json", index_manifest.model_dump(mode="json"))
    for doc, context in contexts.items():
        _write_json(sealed / "retrieval" / f"{doc}-qwen.json", context.model_dump(mode="json"))
    _write_json(sealed / "retrieval" / "bge-shadow-rankings.json", bge)
    for doc, enrichment in enrichments.items():
        _write_json(sealed / "enrichment" / f"{doc}.json", enrichment)
    _write_json(sealed / "researcher_comparison_report.json", comparison_report)
    anchor_candidates = {
        "schema_version": "copied-pilot-anchor-candidates-v1.0",
        "researcher_approval_required": True,
        "automatic_truth_threshold": False,
        "documents": [{
            "document_id": doc,
            "candidate_claim_ids": [row.claim_id for row in primary[doc].claims],
        } for doc in sorted(primary)],
    }
    _write_json(sealed / "anchor_candidates.json", anchor_candidates)
    _write_json(sealed / "pilot_projection.json", projection)
    _write_json(sealed / "model_receipts.json", {
        "schema_version": "copied-pilot-model-receipts-v1.0", "receipts": receipts,
    })
    _write_json(sealed / "route_provenance.json", {
        "schema_version": "copied-pilot-route-provenance-v1.0",
        "bindings": bindings,
        "remote_routes": 0,
    })
    failures = {"schema_version": "copied-pilot-content-free-failures-v1.0", "failures": []}
    failure_path = workspace / "state" / "pilot_failures.json"
    if failure_path.exists():
        failures["failures"].extend(json.loads(failure_path.read_text(encoding="utf-8"))["failures"])
    for document in contract.documents:
        store = SectionAnalysisStore(workspace / "state" / f"{document.document_id}.sqlite")
        try:
            failures["failures"].extend(store.failure_evidence())
        finally:
            store.close()
    _write_json(sealed / "content_free_failures.json", failures)
    _write_json(sealed / "execution_summary.json", execution_summary)
    validate_sealed_results(sealed)


def run_copied_semantic_pilot(
    *, contract: CopiedSemanticPilotContractV1, endpoint: SemanticEndpointConfigV1,
    host_role: str, transport=None,
) -> dict[str, Any]:
    if host_role != "mac-studio":
        raise SemanticPilotError("copied_semantic_pilot_requires_mac_studio_role")
    if contract.remote_writes or contract.publication or contract.corpus_import:
        raise SemanticPilotError("copied_semantic_pilot_authority_contradiction")
    workspace = Path(contract.workspace).resolve(strict=False)
    for forbidden in contract.forbidden_roots:
        if _inside(workspace, Path(forbidden)):
            raise SemanticPilotError("copied_semantic_pilot_workspace_forbidden")
    workspace.mkdir(parents=True, exist_ok=True)
    try:
        effective_mapper_concurrency = int(
            os.environ.get(
                "SOGICE_SEMANTIC_PILOT_CONCURRENCY",
                str(contract.mapper_maximum_concurrency),
            )
        )
    except ValueError as exc:
        raise SemanticPilotError("pilot_mapper_concurrency_override_malformed") from exc
    if not 1 <= effective_mapper_concurrency <= contract.mapper_maximum_concurrency:
        raise SemanticPilotError("pilot_mapper_concurrency_override_out_of_bounds")
    recover_abandoned_runner = os.environ.get(
        "SOGICE_SEMANTIC_PILOT_RECOVER_ABANDONED_RUNNER", "",
    )
    if recover_abandoned_runner not in {"", "1"}:
        raise SemanticPilotError("pilot_abandoned_runner_recovery_flag_malformed")
    recover_local_service = os.environ.get(
        "SOGICE_SEMANTIC_PILOT_RECOVER_LOCAL_SERVICE", "",
    )
    if recover_local_service not in {"", "1"}:
        raise SemanticPilotError("pilot_local_service_recovery_flag_malformed")
    verified = _verify_sources(contract)
    lexicon_terms = _verified_lexicon_terms(contract)
    client = OpenAICompatibleLocalClient(endpoint, transport=transport)
    phase_guard = None
    try:
        bindings = reuse_run021_bindings(client)
        phase_guard = (
            LocalModelPhaseGuard(workspace=workspace, client=client)
            if endpoint.global_model_lease_path else None
        )
        if phase_guard is not None:
            client.set_before_model_activation(phase_guard.before_model_activation)
        mapper_alias = endpoint.route("section_mapper").requested_model
        repair_alias = endpoint.route("qwen38_mapper_repair").requested_model
        units_by_doc = {doc: value[2] for doc, value in verified.items()}
        plans = {doc: build_adaptive_analysis_plan(
            run_id=contract.run_id, units=units, small_model_route=mapper_alias,
            repair_model_route=repair_alias, target_chars=5000, overlap_units=1,
            maximum_prompts_per_section=6,
            maximum_attempts=contract.mapper_maximum_attempts,
        ) for doc, units in units_by_doc.items()}
        results: dict[str, Any] = {}
        analyses: dict[str, Any] = {}
        for doc, plan in sorted(plans.items()):
            store = SectionAnalysisStore(
                workspace / "state" / f"{doc}.sqlite",
                forbidden_roots=tuple(Path(row) for row in contract.forbidden_roots),
            )
            try:
                store.seed(plan)
                if recover_abandoned_runner == "1":
                    store.recover_confirmed_abandoned_runner()
                if recover_local_service == "1":
                    store.recover_after_confirmed_local_service_restart()
                store.recover_expired(datetime.now(timezone.utc))
                store.migrate_exhausted_transport_holds()
                store.requeue_mapper_json_output_holds()
                results[doc] = run_parallel_jobs(
                    store=store, plan=plan,
                    executor=LocalSectionExecutor(
                        client, concurrency_level=effective_mapper_concurrency,
                        lexicon_snapshot_sha256=contract.lexicon_snapshot_sha256,
                        lexicon_terms=lexicon_terms,
                    ),
                    max_workers=effective_mapper_concurrency,
                )
                if len(results[doc]) != len(plan.jobs):
                    raise SemanticPilotError("pilot_analysis_jobs_not_all_successful")
            finally:
                store.close()
            analyses[doc] = _analysis_payload(results[doc])
            _write_json(workspace / "outputs" / "analysis" / f"{doc}.json", analyses[doc])

        primary_packets = {}
        primary_legacy_packets = {}
        comparison_packets = {}
        compiler_input_receipts: dict[str, CompilerInputReductionReceiptV1] = {}
        compiler_receipt_dir = workspace / "outputs" / "compiler-input-receipts"
        for doc in sorted(plans):
            primary_path = workspace / "outputs" / "compilers" / f"{doc}-primary.json"
            original, derived, receipt = build_compiler_input_reduction_receipt(
                plan=plans[doc], results=results[doc], units=units_by_doc[doc],
                compiler_model_route=endpoint.route("document_compiler").requested_model,
            )
            if primary_path.exists():
                used = DocumentCompilationV1.model_validate_json(
                    primary_path.read_bytes(),
                ).packet_sha256
                if used != receipt.used_packet_sha256:
                    original, derived, receipt = build_compiler_input_reduction_receipt(
                        plan=plans[doc], results=results[doc], units=units_by_doc[doc],
                        compiler_model_route=endpoint.route("document_compiler").requested_model,
                        used_packet_sha256=used,
                    )
            primary_legacy_packets[doc] = original
            primary_packets[doc] = derived
            compiler_input_receipts[f"{doc}-primary"] = receipt
            _write_json(
                compiler_receipt_dir / f"{doc}-primary.json",
                receipt.model_dump(mode="json"),
            )

            _original_compare, derived_compare, compare_receipt = (
                build_compiler_input_reduction_receipt(
                    plan=plans[doc], results=results[doc], units=units_by_doc[doc],
                    compiler_model_route=endpoint.route(
                        "qwen38_compiler_candidate"
                    ).requested_model,
                )
            )
            comparison_path = workspace / "outputs" / "compilers" / f"{doc}-qwen38.json"
            if comparison_path.exists():
                used = DocumentCompilationV1.model_validate_json(
                    comparison_path.read_bytes(),
                ).packet_sha256
                if used != compare_receipt.used_packet_sha256:
                    _original_compare, derived_compare, compare_receipt = (
                        build_compiler_input_reduction_receipt(
                            plan=plans[doc], results=results[doc], units=units_by_doc[doc],
                            compiler_model_route=endpoint.route(
                                "qwen38_compiler_candidate"
                            ).requested_model,
                            used_packet_sha256=used,
                        )
                    )
            comparison_packets[doc] = derived_compare
            compiler_input_receipts[f"{doc}-qwen38"] = compare_receipt
            _write_json(
                compiler_receipt_dir / f"{doc}-qwen38.json",
                compare_receipt.model_dump(mode="json"),
            )
        failure_log = workspace / "state" / "pilot_failures.json"
        primary_executor = LocalDocumentCompilerExecutor(client)
        comparison_executor = LocalDocumentCompilerExecutor(
            client, purpose="qwen38_compiler_candidate",
        )
        primary_needs_calls = any(
            not (workspace / "outputs" / "compilers" / f"{doc}-primary.json").exists()
            for doc in plans
        )
        primary_phase = (
            phase_guard.phase(
                phase="primary-gemma-compilation",
                resolved_model=RUN021_VALIDATED_MODELS["document_compiler"],
            )
            if phase_guard is not None and primary_needs_calls else nullcontext()
        )
        with primary_phase:
            primary = {doc: _load_or_compile(
                path=workspace / "outputs" / "compilers" / f"{doc}-primary.json",
                packet=primary_packets[doc], executor=primary_executor,
                failure_log=failure_log, legacy_packet=primary_legacy_packets[doc],
            ) for doc in sorted(plans)}

        comparison_needs_calls = any(
            not (workspace / "outputs" / "compilers" / f"{doc}-qwen38.json").exists()
            for doc in plans
        )
        comparison_phase = (
            phase_guard.phase(
                phase="qwen38-comparison-compilation",
                resolved_model=RUN021_VALIDATED_MODELS["qwen38_compiler_candidate"],
            )
            if phase_guard is not None and comparison_needs_calls else nullcontext()
        )
        with comparison_phase:
            comparison = {doc: _load_or_compile(
                path=workspace / "outputs" / "compilers" / f"{doc}-qwen38.json",
                packet=comparison_packets[doc], executor=comparison_executor,
                failure_log=failure_log,
            ) for doc in sorted(plans)}

        documents = {row.document_id: row for row in contract.documents}
        rows: list[SourceUnitRowV1] = []
        for doc, units in sorted(units_by_doc.items()):
            metadata = documents[doc]
            for unit in units.spans:
                rows.append(SourceUnitRowV1(
                    run_id=contract.run_id, document_id=doc, unit_id=unit.span_id,
                    source_family_id=metadata.source_family_id, stance=metadata.stance,
                    language=metadata.language,
                    canonical_text_sha256=units.canonical_text_sha256,
                    unit_text_sha256=unit.text_sha256,
                    char_start=unit.char_start, char_end=unit.char_end, text=unit.text,
                    source_artifact=f"input/{doc}/source.txt",
                    source_version="approved-copied-public-source-v1.0",
                    provenance_kind="source_v2_unit",
                ))
        rows.sort(key=lambda row: (row.document_id, row.unit_id))
        qwen_cache = PersistentEmbeddingCache(
            LocalEmbeddingProvider(client, "qwen_embedding"),
            workspace / "state" / "qwen_embedding_cache.json",
        )
        source_metadata = {doc: {
            "title": documents[doc].title,
            "language": documents[doc].language,
            "source_type": "approved_public_copied_text",
        } for doc in sorted(documents)}
        queries = {doc: build_retrieval_query(
            query_id=f"query-{doc}", requesting_document_id=doc,
            analysis_payload=analyses[doc], source_metadata=source_metadata[doc],
        ) for doc in sorted(documents)}
        query_texts = [
            "\n".join(queries[doc].components) for doc in sorted(queries)
        ]
        qwen_needs_calls = not qwen_cache.has_all(
            [row.text for row in rows] + query_texts,
        )
        qwen_phase = (
            phase_guard.phase(
                phase="qwen-embedding-and-retrieval",
                resolved_model=RUN021_VALIDATED_MODELS["qwen_embedding"],
            )
            if phase_guard is not None and qwen_needs_calls else nullcontext()
        )
        source_policy_sha = hashlib.sha256(_json_bytes({
            "selection_sha256": contract.selection_sha256,
            "provenance_kind": "source_v2_unit",
        })).hexdigest()
        sealed_at = datetime(2026, 8, 22, 12, 0, tzinfo=timezone.utc)
        with qwen_phase:
            manifest, index_reused = build_retrieval_index(
                workspace / "frozen-qwen-index", rows=rows, embedder=qwen_cache,
                index_id="copied-pilot-index-021", run_id=contract.run_id,
                sealed_at=sealed_at, source_policy_snapshot_sha256=source_policy_sha,
                build_host_id="mac-studio",
            )
            rebuild, rebuild_reused = build_retrieval_index(
                workspace / "frozen-qwen-index-rebuild", rows=rows, embedder=qwen_cache,
                index_id="copied-pilot-index-021", run_id=contract.run_id,
                sealed_at=sealed_at, source_policy_snapshot_sha256=source_policy_sha,
                build_host_id="mac-studio",
            )
            verify_retrieval_index(workspace / "frozen-qwen-index")
            verify_retrieval_index(workspace / "frozen-qwen-index-rebuild")
            if any(getattr(manifest, field) != getattr(rebuild, field) for field in (
                "manifest_sha256", "database_sha256", "vectors_sha256",
                "embedding_records_sha256",
            )):
                raise SemanticPilotError("pilot_index_rebuild_not_deterministic")

            qwen_cache.embed(query_texts)
            contexts = {}
            for doc, query in sorted(queries.items()):
                hits, exclusions = hybrid_retrieve(
                    workspace / "frozen-qwen-index", query=query, embedder=qwen_cache,
                    limit=contract.retrieval_limit,
                    per_family_cap=contract.per_family_cap,
                    contradiction_slots=contract.contradiction_slots,
                    exclude_requesting_document=True,
                    allow_single_document_fallback=True,
                )
                within_document = all(row.document_id == doc for row in hits)
                if within_document and not (
                    manifest.document_count == 1
                    and {row.document_id for row in rows} == {doc}
                ):
                    raise SemanticPilotError("pilot_retrieval_self_exclusion_failed")
                retrieval_scope = (
                    "within_document_source_grounding"
                    if within_document else "cross_document_source_grounding"
                )
                contexts[doc] = build_retrieval_context(
                    context_id=f"context-{doc}",
                    index_manifest_sha256=manifest.manifest_sha256,
                    query=query, hits=hits, exclusions=exclusions,
                    per_family_cap=contract.per_family_cap,
                    contradiction_slots=(0 if within_document else contract.contradiction_slots),
                    retrieval_scope=retrieval_scope,
                )

        bge_cache = PersistentEmbeddingCache(
            LocalEmbeddingProvider(client, "bge_shadow"),
            workspace / "state" / "bge_embedding_cache.json",
        )
        bge_texts = [row.text for row in rows] + query_texts
        bge_needs_calls = not bge_cache.has_all(bge_texts)
        bge_phase = (
            phase_guard.phase(
                phase="bge-m3-shadow-embedding",
                resolved_model=RUN021_VALIDATED_MODELS["bge_shadow"],
            )
            if phase_guard is not None and bge_needs_calls else nullcontext()
        )
        with bge_phase:
            bge = _shadow_rankings(
                cache=bge_cache, rows=rows, queries=queries,
                top_k=contract.retrieval_limit,
            )
        enrich_executor = LocalGroundedEnrichmentExecutor(client)
        enrichments = {}
        enrichment_needs_calls = any(
            not (workspace / "outputs" / "enrichment" / f"{doc}.json").exists()
            for doc in contexts
        )
        enrichment_phase = (
            phase_guard.phase(
                phase="gemma-grounded-enrichment",
                resolved_model=RUN021_VALIDATED_MODELS["grounded_enrichment"],
            )
            if phase_guard is not None and enrichment_needs_calls else nullcontext()
        )
        with enrichment_phase:
            for doc, context in sorted(contexts.items()):
                request = build_grounded_enrichment_request(
                    run_id=contract.run_id, document_id=doc,
                    analysis_payload=analyses[doc],
                    source_metadata=source_metadata[doc], context=context,
                    lexicon_snapshot_sha256=contract.lexicon_snapshot_sha256,
                    entity_snapshot_sha256=NO_SNAPSHOT_SHA256,
                    lexicon_terms=lexicon_terms,
                    requested_model=endpoint.route("grounded_enrichment").requested_model,
                )
                enrichments[doc] = _validate_or_execute_enrichment(
                    path=workspace / "outputs" / "enrichment" / f"{doc}.json",
                    request=request, executor=enrich_executor,
                    failure_log=failure_log,
                )

        comparison_rows = [
            _compilation_disagreements(primary[doc], comparison[doc])
            for doc in sorted(primary)
        ]
        qwen_rankings = {doc: [{
            "rank": row.final_rank,
            "document_id": row.document_id,
            "unit_id": row.unit_id,
            "score": row.fused_score,
        } for row in contexts[doc].selected_hits] for doc in sorted(contexts)}
        comparison_report = {
            "schema_version": "copied-pilot-researcher-comparison-v1.0",
            "compiler_comparisons": comparison_rows,
            "retrieval_rankings": {
                "qwen_4096": qwen_rankings,
                "bge_m3_1024": bge["rankings"],
            },
            "retrieval_scope": {
                doc: contexts[doc].retrieval_scope for doc in sorted(contexts)
            },
            "cross_document_support_present": {
                doc: contexts[doc].cross_document_support_present for doc in sorted(contexts)
            },
            "independent_supporting_source_count": sum(
                context.cross_document_support_present and row.stance == "supporting"
                for context in contexts.values() for row in context.selected_hits
            ),
            "independent_contradictory_source_count": sum(
                context.cross_document_support_present and row.stance == "opposed"
                for context in contexts.values() for row in context.selected_hits
            ),
            "automatic_winner": None,
            "researcher_review_required": True,
        }
        partition_manifest = {
            "schema_version": "copied-pilot-source-partitions-v1.0",
            "documents": [{
                "document_id": doc,
                "source_sha256": documents[doc].source_sha256,
                "source_bytes": documents[doc].source_bytes,
                "source_characters": documents[doc].source_characters,
                "sections_sha256": artifact_sha256(verified[doc][1]),
                "citation_units_sha256": artifact_sha256(verified[doc][2]),
                "section_count": len(verified[doc][1].spans),
                "unit_count": len(verified[doc][2].spans),
                "reconstruction_percent": 100,
            } for doc in sorted(verified)],
            "total_source_bytes": sum(row.source_bytes for row in contract.documents),
            "historical_truncation_markers": 0,
        }
        projection_payload = {
            "contract_sha256": contract.contract_sha256,
            "analysis_sha256s": {
                doc: hashlib.sha256(_json_bytes(analyses[doc])).hexdigest() for doc in sorted(analyses)
            },
            "primary_compilation_sha256s": {doc: primary[doc].output_sha256 for doc in sorted(primary)},
            "comparison_compilation_sha256s": {doc: comparison[doc].output_sha256 for doc in sorted(comparison)},
            "index_manifest_sha256": manifest.manifest_sha256,
            "index_rebuild_manifest_sha256": rebuild.manifest_sha256,
            "retrieval_context_sha256s": {doc: contexts[doc].context_sha256 for doc in sorted(contexts)},
            "grounded_enrichment_sha256s": {doc: enrichments[doc]["output_sha256"] for doc in sorted(enrichments)},
            "bge_shadow_sha256": hashlib.sha256(_json_bytes(bge)).hexdigest(),
        }
        projection = {
            "schema_version": "copied-semantic-pilot-projection-v1.0",
            "payload": projection_payload,
            "projection_sha256": hashlib.sha256(_json_bytes(projection_payload)).hexdigest(),
        }
        all_receipts = _merge_receipts(
            workspace / "state" / "model_receipts.json", client.receipts,
        )
        history_path = workspace / "state" / "successful_runs.json"
        history = {"schema_version": "copied-pilot-run-history-v1.0", "runs": []}
        if history_path.exists():
            history = json.loads(history_path.read_text(encoding="utf-8"))
        invocation = {
            "sequence": len(history["runs"]) + 1,
            "projection_sha256": projection["projection_sha256"],
            "new_chat_call_count": sum(row.purpose not in {"qwen_embedding", "bge_shadow"} for row in client.receipts),
            "new_embedding_call_count": sum(row.purpose in {"qwen_embedding", "bge_shadow"} for row in client.receipts),
            "new_model_call_count": len(client.receipts),
        }
        history["runs"].append(invocation)
        _write_json(history_path, history)
        execution_summary = {
            "schema_version": "copied-pilot-execution-summary-v1.0",
            "run_id": contract.run_id,
            "host_role": host_role,
            "hostname_sha256": hashlib.sha256(socket.gethostname().encode()).hexdigest(),
            "document_count": len(contract.documents),
            "analysis_job_count": sum(len(row.jobs) for row in plans.values()),
            "effective_mapper_concurrency": effective_mapper_concurrency,
            "analysis_attempt_count": sum(
                sum(store_attempts.values())
                for store_attempts in [
                    _store_attempts(workspace / "state" / f"{doc}.sqlite") for doc in sorted(plans)
                ]
            ),
            "primary_compilation_count": len(primary),
            "comparison_compilation_count": len(comparison),
            "indexed_unit_count": manifest.unit_count,
            "qwen_dimension": 4096,
            "bge_dimension": 1024,
            "index_reused": index_reused,
            "index_rebuild_reused": rebuild_reused,
            "index_rebuild_deterministic": True,
            "retrieval_context_count": len(contexts),
            "retrieval_scope": {
                doc: contexts[doc].retrieval_scope for doc in sorted(contexts)
            },
            "cross_document_support_present": {
                doc: contexts[doc].cross_document_support_present for doc in sorted(contexts)
            },
            "self_retrieval_hits": sum(
                row.document_id == doc
                for doc, context in contexts.items()
                for row in context.selected_hits
            ),
            "independent_supporting_source_count": sum(
                context.cross_document_support_present and row.stance == "supporting"
                for context in contexts.values() for row in context.selected_hits
            ),
            "independent_contradictory_source_count": sum(
                context.cross_document_support_present and row.stance == "opposed"
                for context in contexts.values() for row in context.selected_hits
            ),
            "grounded_enrichment_count": len(enrichments),
            "grounded_invalid_citation_count": 0,
            "new_call_counts": invocation,
            "run_history": history["runs"],
            "remote_writes": 0,
            "publication": False,
            "corpus_import": False,
            "projection_sha256": projection["projection_sha256"],
        }
        _stage_sealed_results(
            workspace=workspace, contract=contract,
            partition_manifest=partition_manifest, analyses=analyses,
            primary=primary, comparison=comparison, index_manifest=manifest,
            contexts=contexts, enrichments=enrichments, bge=bge,
            comparison_report=comparison_report, projection=projection,
            receipts=all_receipts, bindings=bindings,
            execution_summary=execution_summary,
            compiler_input_receipts=compiler_input_receipts,
        )
        _write_json(workspace / "pilot_report.json", execution_summary)
        return execution_summary
    finally:
        if phase_guard is not None:
            phase_guard.finish_active()
        client.close()


def _store_attempts(path: Path) -> dict[str, int]:
    store = SectionAnalysisStore(path)
    try:
        return store.attempts()
    finally:
        store.close()


def pilot_status(contract: CopiedSemanticPilotContractV1) -> dict[str, Any]:
    workspace = Path(contract.workspace)
    report_path = workspace / "pilot_report.json"
    report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else None
    states = {}
    for document in contract.documents:
        path = workspace / "state" / f"{document.document_id}.sqlite"
        if path.exists():
            store = SectionAnalysisStore(path)
            try:
                states[document.document_id] = store.counts()
            finally:
                store.close()
    return {
        "schema_version": "copied-pilot-status-v1.0",
        "run_id": contract.run_id,
        "status": "succeeded" if report else "incomplete",
        "document_states": states,
        "report": report,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Local copied-text semantic pilot")
    subparsers = parser.add_subparsers(dest="command", required=True)
    run_parser = subparsers.add_parser("run")
    run_parser.add_argument("--contract", type=Path, required=True)
    run_parser.add_argument(
        "--base-url", default=os.environ.get("SOGICE_SEMANTIC_BASE_URL", "http://127.0.0.1:4000"),
    )
    status_parser = subparsers.add_parser("status")
    status_parser.add_argument("--contract", type=Path, required=True)
    package_parser = subparsers.add_parser("package-results")
    package_parser.add_argument("--contract", type=Path, required=True)
    package_parser.add_argument("--archive", type=Path, required=True)
    package_parser.add_argument("--source-commit", required=True)
    args = parser.parse_args(argv)
    contract = load_contract(args.contract)
    if args.command == "status":
        print(json.dumps(pilot_status(contract), sort_keys=True))
        return 0
    if args.command == "package-results":
        manifest = build_results_archive(
            sealed_directory=Path(contract.workspace) / "sealed-results",
            archive_path=args.archive, source_commit=args.source_commit,
        )
        print(json.dumps(manifest, sort_keys=True))
        return 0
    report = run_copied_semantic_pilot(
        contract=contract,
        endpoint=endpoint_config(
            base_url=args.base_url,
            api_key=os.environ.get("SOGICE_SEMANTIC_API_KEY", ""),
            global_model_lease_path=str(
                Path(contract.workspace) / "state" / "global_model.lease"
            ),
            durable_receipt_path=str(
                Path(contract.workspace) / "state" / "model_receipts.json"
            ),
        ),
        host_role=os.environ.get("SOGICE_FACTORY_HOST_ROLE", ""),
    )
    print(json.dumps(report, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
