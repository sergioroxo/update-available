"""Fail-closed local model adapters for the physical semantic canary.

No client is created at import time. Credentials are accepted only as
``SecretStr`` and are never emitted in receipts or exception messages.
"""
from __future__ import annotations

import hashlib
import json
import math
import threading
import time
from dataclasses import dataclass
from typing import Any, Literal, Sequence
from urllib.parse import urlparse

import httpx
import numpy as np
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    SecretStr,
    ValidationError,
    field_validator,
    model_validator,
)

from runner.models.reprocessing import require_safe_id, require_sha256
from runner.models.retrieval import canonical_contract_sha256
from runner.pipeline.analysis_sections import (
    CompilerClaimV1,
    DocumentCompilationV1,
    DocumentCompilerPacketV1,
    MAPPER_OUTPUT_RETRY_REASON,
    MAPPER_REPAIRABLE_REASONS,
    MAPPER_SCHEMA_RETRY_REASON,
    ProcessingSectionV1,
    PROMPT_REGISTRY,
    RetryableSectionError,
    SectionAnalysisError,
    SectionFindingV1,
    SectionPassResultV1,
    SectionPromptJobV1,
)


class SemanticAdapterError(ValueError):
    """Terminal content-free adapter failure."""

    def __init__(self, error_code: str):
        super().__init__(error_code)
        self.error_code = error_code


class RetryableSemanticAdapterError(RuntimeError):
    """Retryable content-free local transport failure."""

    def __init__(self, error_code: str):
        super().__init__(error_code)
        self.error_code = error_code


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)


class _MapperFindingPayloadV1(_Strict):
    statement: str = Field(min_length=1, max_length=4000)
    evidence_state: Literal["supported", "hypothesis", "unsupported"]
    citation_unit_ids: list[str]
    confidence: float = Field(ge=0, le=1)

    @field_validator("statement")
    @classmethod
    def _nonblank_statement(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("mapper statement must contain non-whitespace text")
        return value


class _MapperResponsePayloadV1(_Strict):
    findings: list[_MapperFindingPayloadV1]


class _CompilerClaimPayloadV1(_Strict):
    statement: str = Field(min_length=1, max_length=1000)
    citation_unit_ids: list[str]
    support_status: Literal["supported", "unsupported"]

    @field_validator("statement")
    @classmethod
    def _nonblank_statement(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("compiler statement must contain non-whitespace text")
        return value


class _CompilerResponsePayloadV1(_Strict):
    claims: list[_CompilerClaimPayloadV1]


class MapperValidationIssueV1(_Strict):
    location: str = Field(min_length=1, max_length=200, pattern=r"^[A-Za-z0-9_.*-]+$")
    type_code: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_.-]+$")


class MapperSchemaRetryableError(RetryableSectionError):
    """Stable mapper failure carrying only bounded Pydantic locations/types."""

    def __init__(
        self, issues: tuple[MapperValidationIssueV1, ...], *, requested_alias: str = "",
    ):
        super().__init__(
            MAPPER_SCHEMA_RETRY_REASON, stage="pydantic_validation",
            issues=issues, requested_alias=requested_alias,
        )


class MapperOutputContractRetryableError(RetryableSectionError):
    """Known job-bound output violation eligible for the one repair route."""

    def __init__(
        self, issues: tuple[MapperValidationIssueV1, ...], *, requested_alias: str = "",
    ):
        super().__init__(
            MAPPER_OUTPUT_RETRY_REASON, stage="job_output_validation",
            issues=issues, requested_alias=requested_alias,
        )


def mapper_response_json_schema(
    job: SectionPromptJobV1 | None = None,
    section: ProcessingSectionV1 | None = None,
) -> dict[str, Any]:
    """Return the proven base structural grammar after optional job binding checks."""
    if (job is None) != (section is None):
        raise SectionAnalysisError("mapper_schema_requires_job_and_section")
    schema = _MapperResponsePayloadV1.model_json_schema()
    if job is None:
        return schema
    if (
        job.section_id != section.section_id
        or job.document_id != section.document_id
        or job.unit_ids != section.unit_ids
    ):
        raise SectionAnalysisError("mapper_schema_job_section_mismatch")
    return schema


def compiler_response_json_schema() -> dict[str, Any]:
    """Return the strict base structural grammar for compiler output."""
    return _CompilerResponsePayloadV1.model_json_schema()


def _mapper_validation_issues(
    error: ValidationError,
) -> tuple[MapperValidationIssueV1, ...]:
    rows: set[tuple[str, str]] = set()
    for issue in error.errors(
        include_url=False, include_context=False, include_input=False,
    )[:32]:
        location = ".".join(
            "*" if isinstance(part, int) else str(part)
            for part in issue.get("loc", ())
        ) or "response"
        type_code = str(issue.get("type") or "validation_error")
        rows.add((location[:200], type_code[:100]))
    return tuple(
        MapperValidationIssueV1(location=location, type_code=type_code)
        for location, type_code in sorted(rows)
    )


def _mapper_output_issues(
    payload: _MapperResponsePayloadV1,
    *, job: SectionPromptJobV1,
    section: ProcessingSectionV1,
) -> tuple[MapperValidationIssueV1, ...]:
    rows: set[tuple[str, str]] = set()
    if len(payload.findings) > job.maximum_output_items:
        rows.add(("findings", "too_long"))
    allowed = set(section.unit_ids)
    for index, finding in enumerate(payload.findings):
        prefix = f"findings.{index}.citation_unit_ids"
        if finding.evidence_state == "supported" and not finding.citation_unit_ids:
            rows.add((prefix, "supported_citation_required"))
        if len(finding.citation_unit_ids) != len(set(finding.citation_unit_ids)):
            rows.add((prefix, "unique_items"))
        if any(unit_id not in allowed for unit_id in finding.citation_unit_ids):
            rows.add((prefix, "enum"))
    return tuple(
        MapperValidationIssueV1(location=location, type_code=type_code)
        for location, type_code in sorted(rows)
    )


class LocalModelRouteV1(_Strict):
    route_id: str
    purpose: Literal[
        "section_mapper", "document_compiler", "qwen38_compiler_candidate",
        "qwen38_mapper_repair", "qwen_embedding", "bge_shadow",
    ]
    requested_model: str
    expected_resolved_models: tuple[str, ...] = ()
    expected_resolved_fragments: tuple[str, ...] = ()
    expected_dimension: int | None = Field(default=None, ge=1, le=8192)
    maximum_output_tokens: int = Field(default=4096, ge=128, le=32768)

    @field_validator("route_id", "requested_model")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("expected_resolved_models")
    @classmethod
    def _resolved_models(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        if len(value) != len(set(value)):
            raise ValueError("resolved-model identities must be unique")
        for row in value:
            if (
                not row or row != row.strip() or len(row) > 300
                or any(char in row for char in ("\n", "\r", "\x00"))
            ):
                raise ValueError("resolved-model identity is malformed")
        return value

    @field_validator("expected_resolved_fragments")
    @classmethod
    def _fragments(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        if not value or any(not row or row != row.casefold() for row in value):
            raise ValueError("resolved-model fragments must be non-empty casefolded values")
        return value

    @model_validator(mode="after")
    def _route_invariants(self) -> "LocalModelRouteV1":
        required = {
            "qwen_embedding": 4096,
            "bge_shadow": 1024,
        }
        if self.purpose in required and self.expected_dimension != required[self.purpose]:
            raise ValueError("embedding route dimension is not canonical")
        if self.purpose not in required and self.expected_dimension is not None:
            raise ValueError("chat route cannot declare an embedding dimension")
        baseline = {"section_mapper", "document_compiler", "qwen_embedding"}
        if self.purpose in baseline:
            if len(self.expected_resolved_models) != 1 or self.expected_resolved_fragments:
                raise ValueError("baseline route requires one exact resolved-model identity")
        elif bool(self.expected_resolved_models) == bool(self.expected_resolved_fragments):
            raise ValueError("optional route requires exactly one identity policy")
        return self


class SemanticEndpointConfigV1(_Strict):
    schema_version: Literal["semantic-endpoint-config-v1.0"] = "semantic-endpoint-config-v1.0"
    base_url: str
    api_key: SecretStr = SecretStr("")
    allowed_hosts: tuple[str, ...] = ("127.0.0.1", "localhost", "::1")
    timeout_seconds: float = Field(default=180.0, ge=1, le=1800)
    routes: tuple[LocalModelRouteV1, ...]

    @field_validator("base_url")
    @classmethod
    def _url(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError("semantic endpoint URL is malformed")
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError("semantic endpoint URL contains forbidden credentials or metadata")
        return value.rstrip("/")

    @model_validator(mode="after")
    def _endpoint_invariants(self) -> "SemanticEndpointConfigV1":
        host = (urlparse(self.base_url).hostname or "").casefold()
        allowed = {row.casefold() for row in self.allowed_hosts}
        if host not in allowed:
            raise ValueError("semantic endpoint host is not explicitly local/allowed")
        route_ids = [row.route_id for row in self.routes]
        purposes = [row.purpose for row in self.routes]
        if len(route_ids) != len(set(route_ids)) or len(purposes) != len(set(purposes)):
            raise ValueError("semantic endpoint routes must have unique IDs and purposes")
        required = {"section_mapper", "document_compiler", "qwen_embedding"}
        if not required.issubset(purposes):
            raise ValueError("semantic endpoint is missing a baseline route")
        return self

    def route(self, purpose: str) -> LocalModelRouteV1:
        for row in self.routes:
            if row.purpose == purpose:
                return row
        raise SemanticAdapterError("semantic_route_not_configured")


class ModelCallReceiptV1(_Strict):
    schema_version: Literal["local-model-call-receipt-v1.0"] = "local-model-call-receipt-v1.0"
    purpose: Literal[
        "section_mapper", "document_compiler", "qwen38_compiler_candidate",
        "qwen38_mapper_repair", "qwen_embedding", "bge_shadow",
    ]
    requested_model: str
    provider_resolved_model: str
    request_sha256: str
    response_sha256: str
    input_item_count: int = Field(ge=1)
    output_item_count: int = Field(ge=1)
    duration_ms: int = Field(ge=0)
    concurrency_level: int = Field(ge=1, le=4)
    dimension: int | None = Field(default=None, ge=1, le=8192)
    receipt_sha256: str

    @field_validator("requested_model", "provider_resolved_model")
    @classmethod
    def _models(cls, value: str) -> str:
        if (
            not value or value != value.strip() or len(value) > 300
            or any(char in value for char in ("\n", "\r", "\x00"))
        ):
            raise ValueError("model identity is malformed")
        return value

    @field_validator("request_sha256", "response_sha256", "receipt_sha256")
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @model_validator(mode="after")
    def _receipt_hash(self) -> "ModelCallReceiptV1":
        if self.receipt_sha256 != canonical_contract_sha256(self, omit={"receipt_sha256"}):
            raise ValueError("local model call receipt hash mismatch")
        return self


def _canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        value, sort_keys=True, ensure_ascii=False, separators=(",", ":"),
    ).encode("utf-8")


def _receipt(
    *, route: LocalModelRouteV1, resolved: str, request: Any, response: Any,
    input_count: int, output_count: int, duration_ms: int,
    concurrency_level: int, dimension: int | None = None,
) -> ModelCallReceiptV1:
    values = dict(
        schema_version="local-model-call-receipt-v1.0", purpose=route.purpose,
        requested_model=route.requested_model, provider_resolved_model=resolved,
        request_sha256=hashlib.sha256(_canonical_bytes(request)).hexdigest(),
        response_sha256=hashlib.sha256(_canonical_bytes(response)).hexdigest(),
        input_item_count=input_count, output_item_count=output_count,
        duration_ms=duration_ms, concurrency_level=concurrency_level,
        dimension=dimension, receipt_sha256="0" * 64,
    )
    draft = ModelCallReceiptV1.model_construct(**values)
    values["receipt_sha256"] = canonical_contract_sha256(draft, omit={"receipt_sha256"})
    return ModelCallReceiptV1.model_validate(values)


def _json_object(text: str) -> dict[str, Any]:
    if not isinstance(text, str):
        raise SemanticAdapterError("local_model_response_content_not_string")
    stripped = text.strip()
    if not stripped:
        raise SemanticAdapterError("local_model_response_json_empty")
    if not stripped.startswith("{"):
        raise SemanticAdapterError("local_model_response_json_not_object_prefixed")
    if not stripped.endswith("}"):
        raise SemanticAdapterError("local_model_response_json_incomplete")
    try:
        payload = json.loads(stripped)
    except (TypeError, json.JSONDecodeError) as exc:
        raise SemanticAdapterError("local_model_response_json_malformed") from exc
    if not isinstance(payload, dict):
        raise SemanticAdapterError("local_model_response_not_object")
    return payload


class OpenAICompatibleLocalClient:
    def __init__(self, config: SemanticEndpointConfigV1, *, transport=None):
        self.config = config
        headers = {"Content-Type": "application/json"}
        if config.api_key.get_secret_value():
            headers["Authorization"] = f"Bearer {config.api_key.get_secret_value()}"
        self.client = httpx.Client(
            base_url=config.base_url, headers=headers,
            timeout=config.timeout_seconds, transport=transport,
        )
        self._bindings: dict[str, str] = {}
        self._receipts: list[ModelCallReceiptV1] = []
        self._lock = threading.Lock()

    @property
    def receipts(self) -> tuple[ModelCallReceiptV1, ...]:
        with self._lock:
            return tuple(self._receipts)

    def close(self) -> None:
        self.client.close()

    def _record(self, receipt: ModelCallReceiptV1) -> None:
        with self._lock:
            self._receipts.append(receipt)

    def preflight(self) -> dict[str, str]:
        """Resolve LiteLLM aliases to underlying local model identities."""
        try:
            response = self.client.get("/model/info")
        except httpx.HTTPError as exc:
            raise RetryableSemanticAdapterError("local_model_inventory_unreachable") from exc
        if response.status_code >= 500 or response.status_code == 429:
            raise RetryableSemanticAdapterError("local_model_inventory_retryable")
        if response.status_code != 200:
            raise SemanticAdapterError("local_model_info_required_for_alias_binding")
        try:
            payload = response.json()
        except ValueError as exc:
            raise SemanticAdapterError("local_model_info_malformed") from exc
        rows = payload.get("data") if isinstance(payload, dict) else None
        if not isinstance(rows, list):
            raise SemanticAdapterError("local_model_info_missing_data")
        discovered: dict[str, str] = {}
        for row in rows:
            if not isinstance(row, dict):
                continue
            alias = row.get("model_name") or row.get("id")
            params = row.get("litellm_params") if isinstance(row.get("litellm_params"), dict) else {}
            resolved = params.get("model") or row.get("resolved_model")
            if isinstance(alias, str) and isinstance(resolved, str):
                discovered[alias] = resolved
        for route in self.config.routes:
            resolved = discovered.get(route.requested_model)
            if resolved is None:
                if route.purpose == "bge_shadow":
                    continue
                raise SemanticAdapterError("required_local_model_route_missing")
            self._validate_resolved(route, resolved)
            self._bindings[route.route_id] = resolved
        return dict(self._bindings)

    def reuse_prevalidated_bindings(self, bindings: dict[str, str]) -> dict[str, str]:
        """Reuse explicit prior host evidence without another endpoint probe."""
        expected = {route.route_id for route in self.config.routes}
        if set(bindings) != expected:
            raise SemanticAdapterError("prevalidated_model_bindings_incomplete")
        validated: dict[str, str] = {}
        for route in self.config.routes:
            resolved = bindings.get(route.route_id)
            if not isinstance(resolved, str):
                raise SemanticAdapterError("prevalidated_model_binding_malformed")
            validated[route.route_id] = self._validate_resolved(route, resolved)
        self._bindings = validated
        return dict(self._bindings)

    @staticmethod
    def _validate_resolved(route: LocalModelRouteV1, resolved: str) -> str:
        folded = resolved.casefold()
        if route.expected_resolved_models:
            if resolved not in route.expected_resolved_models:
                raise SemanticAdapterError("local_model_route_identity_mismatch")
        elif not all(fragment in folded for fragment in route.expected_resolved_fragments):
            raise SemanticAdapterError("local_model_route_identity_mismatch")
        if any(marker in folded for marker in ("openai/", "anthropic/", "azure/", "bedrock/")):
            raise SemanticAdapterError("cloud_model_route_forbidden")
        return resolved

    def binding(self, route: LocalModelRouteV1) -> str:
        resolved = self._bindings.get(route.route_id)
        if resolved is None:
            raise SemanticAdapterError("local_model_preflight_not_completed")
        return resolved

    def chat(
        self, route: LocalModelRouteV1, *, system: str, user: str,
        concurrency_level: int, response_schema: dict[str, Any] | None = None,
    ) -> tuple[dict[str, Any], ModelCallReceiptV1]:
        resolved = self.binding(route)
        request = {
            "model": route.requested_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0,
            "max_tokens": route.maximum_output_tokens,
            "response_format": (
                {
                    "type": "json_schema",
                    "json_schema": {
                        "name": (
                            "mapper_response_v1"
                            if route.purpose in {"section_mapper", "qwen38_mapper_repair"}
                            else "compiler_response_v1"
                        ),
                        "strict": True,
                        "schema": response_schema,
                    },
                }
                if response_schema is not None
                else {"type": "json_object"}
            ),
        }
        if route.purpose in {"qwen38_mapper_repair", "qwen38_compiler_candidate"}:
            request["reasoning_effort"] = "none"
        started = time.perf_counter()
        try:
            response = self.client.post("/v1/chat/completions", json=request)
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise RetryableSectionError(
                "local_chat_transport_retryable", stage="http_transport",
                requested_alias=route.requested_model,
            ) from exc
        duration_ms = int((time.perf_counter() - started) * 1000)
        if response.status_code == 429 or response.status_code >= 500:
            raise RetryableSectionError(
                "local_chat_status_retryable", stage="http_status",
                http_status_category=f"{response.status_code // 100}xx",
                requested_alias=route.requested_model,
            )
        if response.status_code != 200:
            raise SectionAnalysisError(
                "local_chat_status_terminal", stage="http_status",
                http_status_category=f"{response.status_code // 100}xx",
                requested_alias=route.requested_model,
            )
        try:
            envelope = response.json()
            choice = envelope["choices"][0]
            content = choice["message"]["content"]
            finish_reason = choice.get("finish_reason")
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise SectionAnalysisError(
                "local_chat_envelope_malformed", stage="response_envelope",
                requested_alias=route.requested_model,
            ) from exc
        response_model = str(envelope.get("model") or route.requested_model)
        if response_model != route.requested_model:
            try:
                self._validate_resolved(route, response_model)
            except SemanticAdapterError as exc:
                raise SectionAnalysisError(
                    exc.error_code, stage="route_identity",
                    requested_alias=route.requested_model,
                ) from None
        try:
            payload = _json_object(content)
        except SemanticAdapterError as exc:
            error_code = (
                "local_model_response_truncated_json"
                if finish_reason == "length"
                else exc.error_code
            )
            raise SectionAnalysisError(
                error_code, stage="response_json",
                requested_alias=route.requested_model,
            ) from None
        try:
            receipt = _receipt(
                route=route, resolved=resolved, request=request, response=payload,
                input_count=1, output_count=1, duration_ms=duration_ms,
                concurrency_level=concurrency_level,
            )
        except ValidationError as exc:
            raise SectionAnalysisError(
                "local_chat_receipt_construction_failed", stage="internal_consistency",
                issues=_mapper_validation_issues(exc),
                requested_alias=route.requested_model,
            ) from None
        self._record(receipt)
        return payload, receipt

    def embeddings(
        self, route: LocalModelRouteV1, texts: Sequence[str], *, concurrency_level: int = 1,
    ) -> tuple[list[list[float]], ModelCallReceiptV1]:
        resolved = self.binding(route)
        if route.expected_dimension is None:
            raise SemanticAdapterError("chat_route_used_for_embeddings")
        if not texts or any(not isinstance(row, str) or not row for row in texts):
            raise SemanticAdapterError("embedding_input_is_empty_or_malformed")
        request = {"model": route.requested_model, "input": list(texts)}
        started = time.perf_counter()
        try:
            response = self.client.post("/v1/embeddings", json=request)
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise RetryableSemanticAdapterError("local_embedding_transport_retryable") from exc
        duration_ms = int((time.perf_counter() - started) * 1000)
        if response.status_code == 429 or response.status_code >= 500:
            raise RetryableSemanticAdapterError("local_embedding_status_retryable")
        if response.status_code != 200:
            raise SemanticAdapterError("local_embedding_status_terminal")
        try:
            envelope = response.json()
            rows = envelope["data"]
        except (ValueError, KeyError, TypeError) as exc:
            raise SemanticAdapterError("local_embedding_envelope_malformed") from exc
        if not isinstance(rows, list) or len(rows) != len(texts):
            raise SemanticAdapterError("local_embedding_count_mismatch")
        if sorted(row.get("index") for row in rows if isinstance(row, dict)) != list(range(len(texts))):
            raise SemanticAdapterError("local_embedding_order_mismatch")
        ordered = sorted(rows, key=lambda row: row["index"])
        array = np.asarray([row.get("embedding") for row in ordered], dtype=np.float32)
        if array.shape != (len(texts), route.expected_dimension):
            raise SemanticAdapterError("local_embedding_dimension_mismatch")
        if not np.isfinite(array).all():
            raise SemanticAdapterError("local_embedding_non_finite")
        norms = np.linalg.norm(array, axis=1)
        if np.any(norms <= 0):
            raise SemanticAdapterError("local_embedding_zero_norm")
        normalised = np.asarray(array / norms[:, None], dtype=np.float32)
        response_model = str(envelope.get("model") or route.requested_model)
        if response_model != route.requested_model:
            self._validate_resolved(route, response_model)
        response_projection = {
            "model": response_model, "count": len(texts),
            "dimension": route.expected_dimension,
            "vector_sha256s": [hashlib.sha256(row.tobytes()).hexdigest() for row in normalised],
        }
        receipt = _receipt(
            route=route, resolved=resolved, request=request,
            response=response_projection, input_count=len(texts), output_count=len(texts),
            duration_ms=duration_ms, concurrency_level=concurrency_level,
            dimension=route.expected_dimension,
        )
        self._record(receipt)
        return normalised.tolist(), receipt


class LocalSectionExecutor:
    def __init__(self, client: OpenAICompatibleLocalClient, *, concurrency_level: int):
        self.client = client
        self.route = client.config.route("section_mapper")
        try:
            self.repair_route = client.config.route("qwen38_mapper_repair")
        except SemanticAdapterError:
            self.repair_route = None
        self.concurrency_level = concurrency_level

    def execute(
        self, job: SectionPromptJobV1, section: ProcessingSectionV1, attempt: int,
    ) -> SectionPassResultV1:
        return self._execute(
            job, section, attempt, retry_error_code="",
        )

    def execute_with_retry_context(
        self, job: SectionPromptJobV1, section: ProcessingSectionV1, attempt: int,
        *, retry_error_code: str,
    ) -> SectionPassResultV1:
        return self._execute(
            job, section, attempt, retry_error_code=retry_error_code,
        )

    def _execute(
        self, job: SectionPromptJobV1, section: ProcessingSectionV1, attempt: int,
        *, retry_error_code: str,
    ) -> SectionPassResultV1:
        if job.model_route != self.route.requested_model:
            raise SectionAnalysisError("section_mapper_route_mismatch")
        if attempt < 1 or attempt > job.maximum_attempts:
            raise SectionAnalysisError("section_mapper_attempt_out_of_range")
        repair_error_code = None
        selected_route = self.route
        if retry_error_code:
            if (
                retry_error_code not in MAPPER_REPAIRABLE_REASONS
                or attempt != 2
                or job.repair_model_route is None
                or self.repair_route is None
                or job.repair_model_route != self.repair_route.requested_model
            ):
                raise SectionAnalysisError("section_mapper_repair_context_mismatch")
            selected_route = self.repair_route
            repair_error_code = retry_error_code
        spec = PROMPT_REGISTRY[job.prompt_id]
        response_schema = mapper_response_json_schema(job, section)
        system = (
            "You are a bounded research extraction stage. Return one JSON object "
            "with exactly one key named findings. findings must be an array of objects "
            "with exactly statement, evidence_state, citation_unit_ids, and confidence. "
            "statement must be a non-empty string containing substantive text. If no "
            "relevant finding exists, return exactly {\"findings\":[]}; never emit a "
            "placeholder or a blank statement. Never cite a unit ID outside the supplied list. "
            "Use evidence_state supported only for source-attested statements; use "
            "hypothesis or unsupported otherwise. "
            + (
                "This is the single cross-model schema-repair attempt. The prior "
                "response failed strict validation; no prior response content is supplied. "
                if repair_error_code else ""
            )
            + spec.instruction
            + " Canonical response JSON Schema: "
            + _canonical_bytes(response_schema).decode("utf-8")
        )
        user = _canonical_bytes({
            "document_id": job.document_id, "section_id": section.section_id,
            "prompt_id": job.prompt_id, "allowed_unit_ids": list(section.unit_ids),
            "source_text": section.text,
        }).decode()
        payload, receipt = self.client.chat(
            selected_route, system=system, user=user,
            concurrency_level=self.concurrency_level,
            response_schema=response_schema,
        )
        try:
            validated_payload = _MapperResponsePayloadV1.model_validate(payload)
        except ValidationError as exc:
            raise MapperSchemaRetryableError(
                _mapper_validation_issues(exc),
                requested_alias=selected_route.requested_model,
            ) from None
        output_issues = _mapper_output_issues(
            validated_payload, job=job, section=section,
        )
        if output_issues:
            raise MapperOutputContractRetryableError(
                output_issues, requested_alias=selected_route.requested_model,
            )
        raw_findings = validated_payload.findings
        try:
            findings = []
            for index, row in enumerate(raw_findings):
                findings.append(SectionFindingV1(
                    finding_id=f"{job.job_id}-finding-{index + 1:03d}",
                    prompt_id=job.prompt_id, statement=row.statement,
                    evidence_state=row.evidence_state,
                    citation_unit_ids=tuple(row.citation_unit_ids),
                    confidence=row.confidence,
                ))
            values = dict(
                schema_version="section-pass-result-v1.0", job_id=job.job_id,
                job_sha256=job.job_sha256, document_id=job.document_id,
                section_id=job.section_id, prompt_id=job.prompt_id,
                requested_model=selected_route.requested_model,
                provider_resolved_model=receipt.provider_resolved_model,
                attempt=attempt, repair_error_code=repair_error_code,
                findings=tuple(findings), output_sha256="0" * 64,
            )
            draft = SectionPassResultV1.model_construct(**values)
            values["output_sha256"] = canonical_contract_sha256(
                draft, omit={"output_sha256"},
            )
            return SectionPassResultV1.model_validate(values)
        except ValidationError as exc:
            raise SectionAnalysisError(
                "section_mapper_result_construction_failed",
                stage="result_construction", issues=_mapper_validation_issues(exc),
                requested_alias=selected_route.requested_model,
            ) from None


class LocalDocumentCompilerExecutor:
    def __init__(
        self, client: OpenAICompatibleLocalClient,
        *, purpose: Literal["document_compiler", "qwen38_compiler_candidate"] = "document_compiler",
    ):
        self.client = client
        self.route = client.config.route(purpose)

    def execute(self, packet: DocumentCompilerPacketV1) -> DocumentCompilationV1:
        if packet.compiler_model_route != self.route.requested_model:
            raise SectionAnalysisError("document_compiler_route_mismatch")
        system = (
            "Compile a document-level research interpretation from the supplied "
            "structured findings and exact source excerpts. Return a JSON object "
            "with claims. A supported claim must cite only supplied unit IDs. "
            "Unsupported material must remain explicitly unsupported. Return at "
            "most 12 concise claims, with each statement at most 1000 characters. "
            "Return the JSON object only: begin with { and end with }; do not emit "
            "Markdown, code fences, commentary, or reasoning. Canonical response "
            "JSON Schema: "
            + _canonical_bytes(compiler_response_json_schema()).decode("utf-8")
        )
        user = _canonical_bytes(packet.model_dump(mode="json")).decode()
        payload, receipt = self.client.chat(
            self.route, system=system, user=user, concurrency_level=1,
            response_schema=compiler_response_json_schema(),
        )
        try:
            validated_payload = _CompilerResponsePayloadV1.model_validate(payload)
        except ValidationError as exc:
            raise SectionAnalysisError(
                "document_compiler_schema_validation_failed",
                stage="pydantic_validation", issues=_mapper_validation_issues(exc),
                requested_alias=self.route.requested_model,
            ) from None
        raw_claims = validated_payload.claims
        if len(raw_claims) > 12:
            raise SectionAnalysisError("document_compiler_claims_contract_mismatch")
        try:
            claims = tuple(CompilerClaimV1(
                claim_id=f"{packet.document_id}-claim-{index + 1:03d}",
                statement=row.statement,
                citation_unit_ids=tuple(row.citation_unit_ids),
                support_status=row.support_status,
            ) for index, row in enumerate(raw_claims))
            values = dict(
                schema_version="document-compilation-v1.0", document_id=packet.document_id,
                packet_sha256=packet.packet_sha256,
                requested_model=self.route.requested_model,
                provider_resolved_model=receipt.provider_resolved_model,
                claims=claims, output_sha256="0" * 64,
            )
            draft = DocumentCompilationV1.model_construct(**values)
            values["output_sha256"] = canonical_contract_sha256(
                draft, omit={"output_sha256"},
            )
            return DocumentCompilationV1.model_validate(values)
        except ValidationError as exc:
            raise SectionAnalysisError(
                "document_compiler_result_construction_failed",
                stage="result_construction", issues=_mapper_validation_issues(exc),
                requested_alias=self.route.requested_model,
            ) from None


@dataclass
class LocalEmbeddingProvider:
    client: OpenAICompatibleLocalClient
    purpose: Literal["qwen_embedding", "bge_shadow"] = "qwen_embedding"

    def embed(self, texts: Sequence[str]) -> Sequence[Sequence[float]]:
        route = self.client.config.route(self.purpose)
        vectors, _receipt_value = self.client.embeddings(route, texts)
        return vectors
