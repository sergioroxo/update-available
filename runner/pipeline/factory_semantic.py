"""Executable synthetic Run-019 semantic vertical-slice demonstration."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import numpy as np

from runner.models.retrieval import SourceUnitRowV1, canonical_contract_sha256
from runner.pipeline.analysis_sections import (
    CompilerClaimV1,
    DocumentCompilationV1,
    RetryableSectionError,
    SectionAnalysisStore,
    SectionFindingV1,
    SectionPassResultV1,
    build_adaptive_analysis_plan,
    build_compiler_packet,
    run_parallel_jobs,
    validate_compilation,
)
from runner.pipeline.atomic_io import atomic_write_bytes
from runner.pipeline.citation_units_v2 import build_citation_units_v2
from runner.pipeline.retrieval import hybrid_retrieve
from runner.pipeline.retrieval_context import (
    build_grounded_enrichment_request,
    build_retrieval_context,
    build_retrieval_query,
    execute_grounded_enrichment,
)
from runner.pipeline.retrieval_index import build_retrieval_index


RUN_ID = "synthetic-semantic-019"
NOW = datetime(2026, 8, 20, 12, 0, tzinfo=timezone.utc)
H = hashlib.sha256(b"synthetic-policy").hexdigest()


class DeterministicEmbeddingProvider:
    """Local test adapter with Qwen-shaped vectors and no model/network call."""

    def embed(self, texts: Sequence[str]) -> Sequence[Sequence[float]]:
        vectors = []
        for text in texts:
            vector = np.zeros(4096, dtype=np.float32)
            for token in re.findall(r"[^\W_]+", text.casefold(), flags=re.UNICODE):
                digest = hashlib.sha256(token.encode()).digest()
                index = int.from_bytes(digest[:4], "big") % 4096
                vector[index] += 1.0
            if not np.any(vector):
                vector[0] = 1.0
            vectors.append(vector.tolist())
        return vectors


class SyntheticSectionExecutor:
    def __init__(self, *, retry_job_id: str | None = None):
        self.retry_job_id = retry_job_id
        self.calls: dict[str, int] = {}
        self.lock = threading.Lock()

    def execute(self, job, section, attempt):
        with self.lock:
            self.calls[job.job_id] = self.calls.get(job.job_id, 0) + 1
        if job.job_id == self.retry_job_id and attempt == 1:
            raise RetryableSectionError("synthetic retry")
        citation = section.unit_ids[0]
        finding = SectionFindingV1(
            finding_id=f"finding-{hashlib.sha256(job.job_id.encode()).hexdigest()[:20]}",
            prompt_id=job.prompt_id,
            statement=f"Synthetic {job.prompt_id} finding for section {section.sequence}.",
            evidence_state="supported", citation_unit_ids=(citation,), confidence=0.8,
        )
        values = dict(
            schema_version="section-pass-result-v1.0", job_id=job.job_id,
            job_sha256=job.job_sha256, document_id=job.document_id,
            section_id=job.section_id, prompt_id=job.prompt_id,
            requested_model=job.model_route,
            provider_resolved_model="synthetic-small-moe-v1", attempt=attempt,
            findings=(finding,), output_sha256="0" * 64,
        )
        draft = SectionPassResultV1.model_construct(**values)
        values["output_sha256"] = canonical_contract_sha256(
            draft, omit={"output_sha256"},
        )
        return SectionPassResultV1.model_validate(values)


class SyntheticGroundedEnrichmentExecutor:
    def execute(self, request):
        hit = request.retrieval_context.selected_hits[0]
        return {
            "document_id": request.document_id,
            "retrieval_context_sha256": request.retrieval_context.context_sha256,
            "corpus_connections": [{
                "document_id": hit.document_id, "unit_id": hit.unit_id,
                "reason_code": "synthetic_related_source",
            }],
            "proposal_count": 1,
        }


def _texts() -> dict[str, str]:
    base = {
        "doc-alpha": (
            "Policy evidence describes a government proposal and its limitations. "
            "However, the report records uncertainty and contrary testimony.\n\n"
        ),
        "doc-beta": (
            "A survey method records participants, explicit claims, and institutional actors. "
            "The network received a grant, but the sample limitation remains material.\n\n"
        ),
        "doc-gamma": (
            "The opposing source frames regulation as freedom and rights. "
            "Although it makes legal claims, it supplies counterevidence about harm.\n\n"
        ),
    }
    return {doc_id: paragraph * 70 for doc_id, paragraph in base.items()}


def _compilation(packet):
    supported = next(row for row in packet.evidence if row.evidence_state == "supported")
    values = dict(
        schema_version="document-compilation-v1.0", document_id=packet.document_id,
        packet_sha256=packet.packet_sha256, requested_model="compiler-qwen-27b",
        provider_resolved_model="synthetic-compiler-v1",
        claims=(CompilerClaimV1(
            claim_id=f"claim-{packet.document_id}", statement="Synthetic compiled claim.",
            citation_unit_ids=supported.citation_unit_ids, support_status="supported",
        ),), output_sha256="0" * 64,
    )
    draft = DocumentCompilationV1.model_construct(**values)
    values["output_sha256"] = canonical_contract_sha256(draft, omit={"output_sha256"})
    result = DocumentCompilationV1.model_validate(values)
    validate_compilation(packet, result)
    return result


def simulate(workspace: Path, *, run_id: str = RUN_ID) -> dict:
    workspace = Path(workspace)
    state = workspace / "studio-local-state"
    state.mkdir(parents=True, exist_ok=True)
    units_by_doc = {
        doc_id: build_citation_units_v2(text, doc_id=doc_id)
        for doc_id, text in _texts().items()
    }
    plans = {
        doc_id: build_adaptive_analysis_plan(
            run_id=run_id, units=units, small_model_route="small-moe",
            target_chars=5000, overlap_units=1, maximum_prompts_per_section=6,
        )
        for doc_id, units in units_by_doc.items()
    }
    retry_job_id = plans["doc-beta"].jobs[0].job_id
    executor = SyntheticSectionExecutor(retry_job_id=retry_job_id)
    results_by_doc = {}
    attempts = {}
    for doc_id, plan in plans.items():
        store = SectionAnalysisStore(state / f"{doc_id}.sqlite")
        try:
            store.seed(plan)
            results_by_doc[doc_id] = run_parallel_jobs(
                store=store, plan=plan, executor=executor, max_workers=4,
            )
            attempts.update(store.attempts())
        finally:
            store.close()
    packets = {
        doc_id: build_compiler_packet(
            plan=plans[doc_id], results=results_by_doc[doc_id],
            units=units_by_doc[doc_id], compiler_model_route="compiler-qwen-27b",
        )
        for doc_id in sorted(plans)
    }
    compilations = {doc_id: _compilation(packet) for doc_id, packet in packets.items()}

    rows = []
    for doc_id, units in units_by_doc.items():
        stance = "opposed" if doc_id == "doc-gamma" else "supporting"
        for unit in units.spans:
            rows.append(SourceUnitRowV1(
                run_id=run_id, document_id=doc_id, unit_id=unit.span_id,
                source_family_id=f"family-{doc_id}", stance=stance, language="en",
                canonical_text_sha256=units.canonical_text_sha256,
                unit_text_sha256=unit.text_sha256, char_start=unit.char_start,
                char_end=unit.char_end, text=unit.text,
                source_artifact="extracted.txt", source_version="canonical-text-v2.0",
                provenance_kind="source_v2_unit",
            ))
    embedder = DeterministicEmbeddingProvider()
    manifest, reused = build_retrieval_index(
        workspace / "frozen-index", rows=rows, embedder=embedder,
        index_id="synthetic-index-019", run_id=run_id, sealed_at=NOW,
        source_policy_snapshot_sha256=H,
    )
    analysis_payload = {
        "type": "Research", "format": "Report", "scope": "Core",
        "summary": "Policy evidence, legal framing, survey methods and limitations.",
        "tactic": ["policy advocacy"],
    }
    query = build_retrieval_query(
        query_id="query-doc-alpha", requesting_document_id="doc-alpha",
        analysis_payload=analysis_payload,
        source_metadata={"title": "Synthetic policy report", "language": "en"},
    )
    hits, exclusions = hybrid_retrieve(
        workspace / "frozen-index", query=query, embedder=embedder,
        limit=8, per_family_cap=3, contradiction_slots=1,
    )
    context = build_retrieval_context(
        context_id="context-doc-alpha", index_manifest_sha256=manifest.manifest_sha256,
        query=query, hits=hits, exclusions=exclusions, per_family_cap=3,
        contradiction_slots=1,
    )
    request = build_grounded_enrichment_request(
        run_id=run_id, document_id="doc-alpha", analysis_payload=analysis_payload,
        context=context, lexicon_snapshot_sha256=H, entity_snapshot_sha256=H,
        requested_model="small-moe",
    )
    enrichment = execute_grounded_enrichment(
        request, SyntheticGroundedEnrichmentExecutor(),
    )
    projection = {
        "run_id": run_id,
        "plan_hashes": {doc: plan.plan_sha256 for doc, plan in sorted(plans.items())},
        "packet_hashes": {doc: packet.packet_sha256 for doc, packet in sorted(packets.items())},
        "compilation_hashes": {doc: row.output_sha256 for doc, row in sorted(compilations.items())},
        "index_manifest_sha256": manifest.manifest_sha256,
        "retrieval_context_sha256": context.context_sha256,
        "enrichment_output_sha256": enrichment["output_sha256"],
    }
    projection_sha = hashlib.sha256(json.dumps(
        projection, sort_keys=True, separators=(",", ":"),
    ).encode()).hexdigest()
    report = {
        "schema_version": "semantic-vertical-demo-v1.0", "run_id": run_id,
        "document_count": len(plans),
        "section_count": sum(len(plan.sections) for plan in plans.values()),
        "prompt_job_count": sum(len(plan.jobs) for plan in plans.values()),
        "executor_invocations": sum(executor.calls.values()),
        "retried_job_count": sum(value > 1 for value in attempts.values()),
        "all_jobs_succeeded": all(
            len(results_by_doc[doc]) == len(plans[doc].jobs) for doc in plans
        ),
        "index_reused": reused, "indexed_unit_count": manifest.unit_count,
        "embedding_dimension": manifest.embedding_dimension,
        "retrieval_hit_count": len(hits),
        "contradiction_slots_filled": context.contradiction_slots_filled,
        "grounded_connection_count": len(enrichment["corpus_connections"]),
        "projection_sha256": projection_sha,
        "model_calls": 0, "network_calls": 0, "remote_writes": 0,
    }
    atomic_write_bytes(
        workspace / "semantic_demo_report.json",
        json.dumps(report, indent=2, sort_keys=True).encode() + b"\n",
    )
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Synthetic semantic vertical-slice demo")
    parser.add_argument("command", choices=("simulate",))
    parser.add_argument("--workspace", required=True, type=Path)
    parser.add_argument("--run-id", default=RUN_ID)
    args = parser.parse_args(argv)
    report = simulate(args.workspace, run_id=args.run_id)
    print(json.dumps(report, sort_keys=True))
    return 0 if report["all_jobs_succeeded"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
