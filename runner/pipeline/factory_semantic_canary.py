"""Physical Mac Studio synthetic semantic canary.

The command generates its own fixtures. It never accepts a research source or
corpus path and refuses workspaces that overlap configured exchange roots.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import resource
import shutil
import socket
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import numpy as np
from pydantic import SecretStr

from runner.models.retrieval import SourceUnitRowV1
from runner.pipeline.analysis_sections import (
    DocumentCompilationV1,
    RetryableSectionError,
    SectionAnalysisStore,
    build_adaptive_analysis_plan,
    build_compiler_packet,
    execute_document_compiler,
    run_parallel_jobs,
    validate_section_result,
)
from runner.pipeline.atomic_io import atomic_write_bytes
from runner.pipeline.citation_units_v2 import build_citation_units_v2
from runner.pipeline.factory_semantic import SyntheticGroundedEnrichmentExecutor
from runner.pipeline.retrieval import hybrid_retrieve
from runner.pipeline.retrieval_context import (
    build_grounded_enrichment_request,
    build_retrieval_context,
    build_retrieval_query,
    execute_grounded_enrichment,
)
from runner.pipeline.retrieval_index import build_retrieval_index
from runner.pipeline.semantic_model_adapters import (
    LocalDocumentCompilerExecutor,
    LocalEmbeddingProvider,
    LocalModelRouteV1,
    LocalSectionExecutor,
    MapperSchemaRetryableError,
    OpenAICompatibleLocalClient,
    SemanticAdapterError,
    SemanticEndpointConfigV1,
)


RUN_ID = "physical-synthetic-semantic-020"
MINIMUM_FREE_BYTES = 40 * 1024**3
FIXTURE_VERSION = "physical-semantic-synthetic-fixtures-v1.0"
POLICY_SHA = hashlib.sha256(b"physical-semantic-policy-v1.0").hexdigest()


class PhysicalCanaryError(ValueError):
    """Content-free physical canary preflight or validation failure."""


def _inside(path: Path, root: Path) -> bool:
    path = path.resolve(strict=False)
    root = root.resolve(strict=False)
    return path == root or root in path.parents


def verify_physical_canary_host(
    *, workspace: Path, host_role: str, shared_roots: tuple[Path, ...],
    minimum_free_bytes: int = MINIMUM_FREE_BYTES,
) -> dict:
    if host_role != "mac-studio":
        raise PhysicalCanaryError("physical_semantic_canary_requires_mac_studio_role")
    workspace = Path(workspace).resolve(strict=False)
    for root in shared_roots:
        root = Path(root).resolve(strict=False)
        if _inside(workspace, root) or _inside(root, workspace):
            raise PhysicalCanaryError("physical_semantic_workspace_overlaps_exchange_tree")
    capacity_root = workspace if workspace.exists() else workspace.parent
    while not capacity_root.exists():
        capacity_root = capacity_root.parent
    free = shutil.disk_usage(capacity_root).free
    if free < minimum_free_bytes:
        raise PhysicalCanaryError("physical_semantic_canary_storage_insufficient")
    return {
        "host_role": host_role, "hostname_sha256": hashlib.sha256(socket.gethostname().encode()).hexdigest(),
        "available_bytes": free, "workspace_outside_exchange": True,
    }


def default_endpoint_config(
    *, base_url: str, api_key: str = "", allowed_hosts: tuple[str, ...] = ("127.0.0.1", "localhost", "::1"),
    bge_shadow_alias: str | None = None, qwen38_alias: str | None = None,
) -> SemanticEndpointConfigV1:
    routes = [
        LocalModelRouteV1(
            route_id="mapper", purpose="section_mapper", requested_model="core-qwen",
            expected_resolved_models=("ollama_chat/qwen3.6:35b-mlx",),
            maximum_output_tokens=4096,
        ),
        LocalModelRouteV1(
            route_id="compiler", purpose="document_compiler", requested_model="core-gemma",
            expected_resolved_models=("ollama_chat/gemma4:31b-mlx",),
            maximum_output_tokens=8192,
        ),
        LocalModelRouteV1(
            route_id="embedding", purpose="qwen_embedding",
            requested_model="research-embedding",
            expected_resolved_models=("ollama/qwen3-embedding:8b",),
            expected_dimension=4096,
        ),
    ]
    if bge_shadow_alias:
        routes.append(LocalModelRouteV1(
            route_id="bge-shadow", purpose="bge_shadow", requested_model=bge_shadow_alias,
            expected_resolved_fragments=("bge-m3",), expected_dimension=1024,
        ))
    if qwen38_alias:
        routes.append(LocalModelRouteV1(
            route_id="qwen38-mapper-repair", purpose="qwen38_mapper_repair",
            requested_model=qwen38_alias,
            expected_resolved_fragments=("qwen3.8", "27b"),
            maximum_output_tokens=4096,
        ))
        routes.append(LocalModelRouteV1(
            route_id="qwen38-compiler", purpose="qwen38_compiler_candidate",
            requested_model=qwen38_alias,
            expected_resolved_fragments=("qwen3.8", "27b"), maximum_output_tokens=8192,
        ))
    return SemanticEndpointConfigV1(
        base_url=base_url, api_key=SecretStr(api_key), allowed_hosts=allowed_hosts,
        timeout_seconds=600, routes=tuple(routes),
    )


def _fixture_texts() -> dict[str, str]:
    paragraphs = {
        "synthetic-policy": (
            "A synthetic government policy report states a proposed regulation and a limitation. "
            "However, it records uncertainty and contrary evidence about implementation.\n\n"
        ),
        "synthetic-methods": (
            "A synthetic survey method describes participants, institutions, and explicit findings. "
            "The sample limitation qualifies the reported network and funding claim.\n\n"
        ),
        "synthetic-counter": (
            "A synthetic opposing text frames regulation through freedom and rights. "
            "Although it advances a legal claim, it also records counterevidence about harm.\n\n"
        ),
    }
    return {key: value * 45 for key, value in paragraphs.items()}


class PersistentEmbeddingCache:
    def __init__(self, provider: LocalEmbeddingProvider, path: Path):
        self.provider = provider
        self.path = Path(path)
        if self.path.exists():
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            if payload.get("schema_version") != "semantic-embedding-cache-v1.0":
                raise PhysicalCanaryError("semantic_embedding_cache_schema_mismatch")
            self.values = dict(payload.get("values") or {})
        else:
            self.values = {}

    def embed(self, texts: Sequence[str]) -> Sequence[Sequence[float]]:
        keys = [hashlib.sha256(text.encode()).hexdigest() for text in texts]
        missing_keys = [key for key in keys if key not in self.values]
        if missing_keys:
            missing_texts = [text for text, key in zip(texts, keys) if key in set(missing_keys)]
            vectors = self.provider.embed(missing_texts)
            for key, vector in zip(missing_keys, vectors):
                self.values[key] = vector
            atomic_write_bytes(self.path, json.dumps({
                "schema_version": "semantic-embedding-cache-v1.0",
                "purpose": self.provider.purpose, "values": self.values,
            }, sort_keys=True, separators=(",", ":")).encode())
        return [self.values[key] for key in keys]


def _benchmark_concurrency(
    *, path: Path, client: OpenAICompatibleLocalClient, plans: dict,
) -> dict:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    jobs = [
        (job, next(row for row in plan.sections if row.section_id == job.section_id))
        for plan in plans.values() for job in plan.jobs
    ]
    levels = []
    maximum_safe = 0

    class BenchmarkRetryFailure(Exception):
        def __init__(self, error, diagnostics):
            super().__init__(str(error))
            self.error = error
            self.diagnostics = diagnostics

    def execute_with_retry(executor, job, section):
        retry_count = 0
        schema_retry_count = 0
        retry_error_code = ""
        diagnostics = []
        for attempt in range(1, job.maximum_attempts + 1):
            try:
                result = (
                    executor.execute_with_retry_context(
                        job, section, attempt,
                        retry_error_code=retry_error_code,
                    )
                    if retry_error_code and job.repair_model_route is not None
                    else executor.execute(job, section, attempt)
                )
                validate_section_result(job, section, result)
                return result, retry_count, schema_retry_count, diagnostics
            except RetryableSectionError as exc:
                if isinstance(exc, MapperSchemaRetryableError):
                    diagnostics.append({
                        "attempt": attempt,
                        "issues": [row.model_dump(mode="json") for row in exc.issues],
                    })
                if attempt >= job.maximum_attempts:
                    raise BenchmarkRetryFailure(exc, diagnostics) from None
                retry_count += 1
                if str(exc) == "section_mapper_schema_validation_retryable":
                    schema_retry_count += 1
                    retry_error_code = str(exc)
                else:
                    retry_error_code = ""
        raise PhysicalCanaryError("semantic_mapper_retry_loop_exhausted")

    for level in (1, 2, 4):
        executor = LocalSectionExecutor(client, concurrency_level=level)
        started_receipts = len(client.receipts)
        started = datetime.now(timezone.utc)
        error = ""
        error_code = ""
        completed_jobs = 0
        retry_count = 0
        schema_retry_count = 0
        schema_diagnostics = []
        try:
            with ThreadPoolExecutor(max_workers=level) as pool:
                futures = {
                    pool.submit(execute_with_retry, executor, job, section): (job, section)
                    for job, section in jobs[:level]
                }
                for future in as_completed(futures):
                    _result, retries, schema_retries, diagnostics = future.result()
                    completed_jobs += 1
                    retry_count += retries
                    schema_retry_count += schema_retries
                    schema_diagnostics.extend(diagnostics)
            maximum_safe = level
        except Exception as exc:
            underlying = exc.error if isinstance(exc, BenchmarkRetryFailure) else exc
            if isinstance(exc, BenchmarkRetryFailure):
                schema_diagnostics.extend(exc.diagnostics)
            error = type(underlying).__name__
            error_code = (
                str(underlying) if isinstance(underlying, RetryableSectionError)
                else "terminal_or_unexpected_validation_failure"
            )
        completed = datetime.now(timezone.utc)
        receipts = client.receipts[started_receipts:]
        route_counts: dict[str, int] = {}
        provider_models: set[str] = set()
        for receipt in receipts:
            route_counts[receipt.requested_model] = route_counts.get(receipt.requested_model, 0) + 1
            provider_models.add(receipt.provider_resolved_model)
        levels.append({
            "concurrency": level, "status": "passed" if not error else "failed",
            "duration_ms": int((completed - started).total_seconds() * 1000),
            "completed_jobs": completed_jobs, "model_call_count": len(receipts),
            "retry_count": retry_count, "schema_retry_count": schema_retry_count,
            "schema_diagnostics": schema_diagnostics,
            "requested_model_counts": dict(sorted(route_counts.items())),
            "provider_resolved_models": sorted(provider_models),
            "receipt_sha256s": [row.receipt_sha256 for row in receipts],
            "error_type": error, "error_code": error_code,
        })
        if error:
            break
    report = {
        "schema_version": "semantic-concurrency-benchmark-v1.0",
        "levels": levels, "maximum_safe_concurrency": maximum_safe,
    }
    atomic_write_bytes(path, json.dumps(report, indent=2, sort_keys=True).encode() + b"\n")
    if maximum_safe < 1:
        raise PhysicalCanaryError("semantic_mapper_concurrency_one_failed")
    return report


def _load_or_compile(
    *, path: Path, packet, executor: LocalDocumentCompilerExecutor,
) -> DocumentCompilationV1:
    if path.exists():
        output = DocumentCompilationV1.model_validate_json(path.read_bytes())
        from runner.pipeline.analysis_sections import validate_compilation
        validate_compilation(packet, output)
        return output
    output = execute_document_compiler(packet, executor)
    atomic_write_bytes(
        path, json.dumps(output.model_dump(mode="json"), sort_keys=True, separators=(",", ":")).encode(),
    )
    return output


def _shadow_overlap(
    *, cache: PersistentEmbeddingCache, unit_texts: list[str], query_text: str,
    baseline_keys: set[str], top_k: int,
) -> dict:
    vectors = np.asarray(cache.embed(unit_texts), dtype=np.float32)
    query = np.asarray(cache.embed([query_text])[0], dtype=np.float32)
    scores = vectors @ query
    order = np.argsort(-scores, kind="stable")[:top_k]
    shadow_keys = {str(index) for index in order.tolist()}
    return {
        "status": "passed", "top_k": top_k,
        "baseline_shadow_overlap_count": len(baseline_keys & shadow_keys),
        "shadow_result_count": len(shadow_keys),
    }


def run_physical_canary(
    *, workspace: Path, endpoint_config: SemanticEndpointConfigV1,
    host_role: str, shared_roots: tuple[Path, ...] = (), transport=None,
    minimum_free_bytes: int = MINIMUM_FREE_BYTES,
) -> dict:
    host = verify_physical_canary_host(
        workspace=workspace, host_role=host_role, shared_roots=shared_roots,
        minimum_free_bytes=minimum_free_bytes,
    )
    workspace = Path(workspace).resolve(strict=False)
    workspace.mkdir(parents=True, exist_ok=True)
    client = OpenAICompatibleLocalClient(endpoint_config, transport=transport)
    try:
        bindings = client.preflight()
        texts = _fixture_texts()
        units_by_doc = {
            doc: build_citation_units_v2(text, doc_id=doc)
            for doc, text in texts.items()
        }
        mapper_alias = endpoint_config.route("section_mapper").requested_model
        try:
            mapper_repair_alias = endpoint_config.route("qwen38_mapper_repair").requested_model
        except SemanticAdapterError:
            mapper_repair_alias = None
        compiler_alias = endpoint_config.route("document_compiler").requested_model
        plans = {
            doc: build_adaptive_analysis_plan(
                run_id=RUN_ID, units=units, small_model_route=mapper_alias,
                repair_model_route=mapper_repair_alias,
                target_chars=5000, overlap_units=1, maximum_prompts_per_section=6,
            )
            for doc, units in units_by_doc.items()
        }
        benchmark = _benchmark_concurrency(
            path=workspace / "concurrency_benchmark.json", client=client, plans=plans,
        )
        max_workers = benchmark["maximum_safe_concurrency"]
        results = {}
        for doc, plan in plans.items():
            store = SectionAnalysisStore(workspace / "state" / f"{doc}.sqlite")
            try:
                store.seed(plan)
                results[doc] = run_parallel_jobs(
                    store=store, plan=plan,
                    executor=LocalSectionExecutor(client, concurrency_level=max_workers),
                    max_workers=max_workers,
                )
                if len(results[doc]) != len(plan.jobs):
                    raise PhysicalCanaryError("physical_section_jobs_not_terminal_success")
            finally:
                store.close()
        packets = {
            doc: build_compiler_packet(
                plan=plans[doc], results=results[doc], units=units_by_doc[doc],
                compiler_model_route=compiler_alias,
            )
            for doc in sorted(plans)
        }
        compiler = LocalDocumentCompilerExecutor(client)
        compilations = {
            doc: _load_or_compile(
                path=workspace / "compilations" / f"{doc}.json",
                packet=packet, executor=compiler,
            )
            for doc, packet in packets.items()
        }

        qwen_provider = PersistentEmbeddingCache(
            LocalEmbeddingProvider(client, "qwen_embedding"),
            workspace / "state" / "qwen_embedding_cache.json",
        )
        rows = []
        ordered_keys = []
        for doc, units in units_by_doc.items():
            stance = "opposed" if doc == "synthetic-counter" else "supporting"
            for unit in units.spans:
                ordered_keys.append((doc, unit.span_id))
                rows.append(SourceUnitRowV1(
                    run_id=RUN_ID, document_id=doc, unit_id=unit.span_id,
                    source_family_id=f"family-{doc}", stance=stance, language="en",
                    canonical_text_sha256=units.canonical_text_sha256,
                    unit_text_sha256=unit.text_sha256, char_start=unit.char_start,
                    char_end=unit.char_end, text=unit.text,
                    source_artifact="synthetic/extracted.txt",
                    source_version=FIXTURE_VERSION, provenance_kind="source_v2_unit",
                ))
        manifest, index_reused = build_retrieval_index(
            workspace / "frozen-qwen-index", rows=rows, embedder=qwen_provider,
            index_id="physical-synthetic-index-020", run_id=RUN_ID,
            sealed_at=datetime(2026, 8, 20, 12, 0, tzinfo=timezone.utc),
            source_policy_snapshot_sha256=POLICY_SHA, build_host_id="mac-studio",
        )
        analysis_payload = {
            "type": "Research", "format": "Synthetic report", "scope": "Core",
            "summary": "Policy, methods, limitations, contrary evidence and rights framing.",
            "tactic": ["synthetic policy advocacy"],
        }
        query = build_retrieval_query(
            query_id="physical-query-020", requesting_document_id="synthetic-policy",
            analysis_payload=analysis_payload,
            source_metadata={"title": "Generated synthetic policy fixture", "language": "en"},
        )
        hits, exclusions = hybrid_retrieve(
            workspace / "frozen-qwen-index", query=query, embedder=qwen_provider,
            limit=8, per_family_cap=3, contradiction_slots=1,
        )
        context = build_retrieval_context(
            context_id="physical-context-020", index_manifest_sha256=manifest.manifest_sha256,
            query=query, hits=hits, exclusions=exclusions, per_family_cap=3,
            contradiction_slots=1,
        )
        request = build_grounded_enrichment_request(
            run_id=RUN_ID, document_id="synthetic-policy", analysis_payload=analysis_payload,
            context=context, lexicon_snapshot_sha256=POLICY_SHA,
            entity_snapshot_sha256=POLICY_SHA, requested_model=mapper_alias,
        )
        enrichment = execute_grounded_enrichment(
            request, SyntheticGroundedEnrichmentExecutor(),
        )

        shadow = {"status": "SHADOW_ROUTE_NOT_CONFIGURED"}
        try:
            endpoint_config.route("bge_shadow")
        except SemanticAdapterError:
            pass
        else:
            shadow_cache = PersistentEmbeddingCache(
                LocalEmbeddingProvider(client, "bge_shadow"),
                workspace / "state" / "bge_shadow_cache.json",
            )
            baseline_keys = {
                str(ordered_keys.index((hit.document_id, hit.unit_id))) for hit in hits
            }
            shadow = _shadow_overlap(
                cache=shadow_cache, unit_texts=[row.text for row in rows],
                query_text="\n".join(query.components), baseline_keys=baseline_keys,
                top_k=len(hits),
            )

        qwen38 = {"status": "QWEN38_ROUTE_NOT_CONFIGURED"}
        try:
            qwen38_route = endpoint_config.route("qwen38_compiler_candidate")
        except SemanticAdapterError:
            pass
        else:
            candidate_doc = sorted(packets)[0]
            candidate_packet = build_compiler_packet(
                plan=plans[candidate_doc], results=results[candidate_doc],
                units=units_by_doc[candidate_doc],
                compiler_model_route=qwen38_route.requested_model,
            )
            candidate_cache = workspace / "compilations" / "qwen38-candidate.json"
            candidate = _load_or_compile(
                path=candidate_cache, packet=candidate_packet,
                executor=LocalDocumentCompilerExecutor(
                    client, purpose="qwen38_compiler_candidate",
                ),
            )
            qwen38 = {"status": "passed", "output_sha256": candidate.output_sha256}

        receipts = client.receipts
        projection_payload = {
            "plan_hashes": {doc: row.plan_sha256 for doc, row in sorted(plans.items())},
            "packet_hashes": {doc: row.packet_sha256 for doc, row in sorted(packets.items())},
            "compilation_hashes": {doc: row.output_sha256 for doc, row in sorted(compilations.items())},
            "index_manifest_sha256": manifest.manifest_sha256,
            "context_sha256": context.context_sha256,
            "enrichment_output_sha256": enrichment["output_sha256"],
        }
        projection_sha = hashlib.sha256(json.dumps(
            projection_payload, sort_keys=True, separators=(",", ":"),
        ).encode()).hexdigest()
        report = {
            "schema_version": "physical-semantic-canary-report-v1.0",
            "run_id": RUN_ID, "host": host,
            "model_bindings": bindings,
            "fixture_version": FIXTURE_VERSION,
            "document_count": len(plans),
            "section_count": sum(len(row.sections) for row in plans.values()),
            "prompt_job_count": sum(len(row.jobs) for row in plans.values()),
            "maximum_safe_mapper_concurrency": max_workers,
            "new_model_call_count": len(receipts),
            "model_call_receipt_sha256s": [row.receipt_sha256 for row in receipts],
            "model_call_duration_ms": sum(row.duration_ms for row in receipts),
            "process_peak_rss_raw": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
            "index_reused": index_reused, "indexed_unit_count": manifest.unit_count,
            "embedding_dimension": manifest.embedding_dimension,
            "retrieval_hit_count": len(hits),
            "contradiction_slots_filled": context.contradiction_slots_filled,
            "grounded_connection_count": len(enrichment["corpus_connections"]),
            "bge_shadow": shadow, "qwen38_candidate": qwen38,
            "projection_sha256": projection_sha,
            "research_documents": 0, "remote_writes": 0, "imports": 0,
        }
        atomic_write_bytes(
            workspace / "physical_semantic_canary_report.json",
            json.dumps(report, indent=2, sort_keys=True).encode() + b"\n",
        )
        return report
    finally:
        client.close()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Physical Mac Studio synthetic semantic canary")
    parser.add_argument("command", choices=("run",))
    parser.add_argument("--workspace", type=Path, required=True)
    parser.add_argument("--base-url", default=os.environ.get("SOGICE_SEMANTIC_BASE_URL", "http://127.0.0.1:4000"))
    parser.add_argument("--bge-shadow-alias", default=os.environ.get("SOGICE_BGE_SHADOW_ALIAS") or None)
    parser.add_argument("--qwen38-alias", default=os.environ.get("SOGICE_QWEN38_ALIAS") or None)
    args = parser.parse_args(argv)
    host_role = os.environ.get("SOGICE_FACTORY_HOST_ROLE", "")
    shared_roots = tuple(
        Path(value) for value in (
            os.environ.get("SOGICE_FACTORY_TO_STUDIO", ""),
            os.environ.get("SOGICE_FACTORY_FROM_STUDIO", ""),
        ) if value
    )
    allowed_hosts = tuple(dict.fromkeys(("127.0.0.1", "localhost", "::1", *(filter(None, os.environ.get("SOGICE_SEMANTIC_ALLOWED_HOSTS", "").split(","))))))
    config = default_endpoint_config(
        base_url=args.base_url,
        api_key=os.environ.get("SOGICE_SEMANTIC_API_KEY", ""),
        allowed_hosts=allowed_hosts,
        bge_shadow_alias=args.bge_shadow_alias,
        qwen38_alias=args.qwen38_alias,
    )
    report = run_physical_canary(
        workspace=args.workspace, endpoint_config=config,
        host_role=host_role, shared_roots=shared_roots,
    )
    print(json.dumps(report, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
