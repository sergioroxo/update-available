from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from runner.models.retrieval import canonical_contract_sha256
from runner.pipeline.analysis_sections import (
    PROMPT_REGISTRY,
    DocumentCompilationV1,
    CompilerClaimV1,
    RetryableSectionError,
    SectionAnalysisError,
    SectionAnalysisStore,
    SectionFindingV1,
    SectionPassResultV1,
    SectionPromptJobV1,
    build_adaptive_analysis_plan,
    build_compiler_packet,
    build_processing_sections,
    run_parallel_jobs,
    validate_compilation,
    validate_section_result,
)
from runner.pipeline.citation_units_v2 import build_citation_units_v2


def _units(doc_id="doc-a"):
    text = (
        "Policy and legal evidence describes a survey method and participant sample. "
        "However, the network funding claim has a limitation and contrary evidence.\n\n"
    ) * 80
    return build_citation_units_v2(text, doc_id=doc_id, target_chars=500, hard_max_chars=700)


def _result(job, section, *, attempt=1, unit_id=None):
    finding = SectionFindingV1(
        finding_id=f"finding-{hashlib.sha256(job.job_id.encode()).hexdigest()[:16]}",
        prompt_id=job.prompt_id, statement="Synthetic supported finding.",
        evidence_state="supported", citation_unit_ids=(unit_id or section.unit_ids[0],),
        confidence=0.8,
    )
    values = dict(
        schema_version="section-pass-result-v1.0", job_id=job.job_id,
        job_sha256=job.job_sha256, document_id=job.document_id,
        section_id=job.section_id, prompt_id=job.prompt_id,
        requested_model=job.model_route, provider_resolved_model="synthetic-model",
        attempt=attempt, findings=(finding,), output_sha256="0" * 64,
    )
    draft = SectionPassResultV1.model_construct(**values)
    values["output_sha256"] = canonical_contract_sha256(draft, omit={"output_sha256"})
    return SectionPassResultV1.model_validate(values)


def test_sections_are_bounded_exact_unit_views_with_declared_overlap():
    units = _units()
    sections = build_processing_sections(units, target_chars=1800, overlap_units=1)
    assert len(sections) > 2
    unit_map = {row.span_id: row for row in units.spans}
    for section in sections:
        assert section.text == "".join(unit_map[row].text for row in section.unit_ids)
        assert len(section.text) <= 1800
    for previous, current in zip(sections, sections[1:]):
        assert current.overlap_unit_ids == (previous.unit_ids[-1],)


def test_adaptive_plan_uses_only_closed_registry_and_content_changes_pass_count():
    plan = build_adaptive_analysis_plan(
        run_id="run-019", units=_units(), small_model_route="small-moe",
        target_chars=1800, maximum_prompts_per_section=6,
    )
    assert len(plan.jobs) > len(plan.sections) * 2
    assert {row.prompt_id for row in plan.jobs}.issubset(PROMPT_REGISTRY)
    assert "methods-limitations" in {row.prompt_id for row in plan.jobs}
    assert "policy-legal" in {row.prompt_id for row in plan.jobs}


def test_unknown_prompt_and_unbounded_plan_are_rejected():
    plan = build_adaptive_analysis_plan(
        run_id="run-019", units=_units(), small_model_route="small-moe",
        target_chars=1800,
    )
    bad = plan.jobs[0].model_dump(mode="python")
    bad["prompt_id"] = "invented-prompt"
    with pytest.raises(ValidationError, match="unknown"):
        SectionPromptJobV1.model_validate(bad)
    payload = plan.model_dump(mode="python")
    payload["maximum_prompts_per_section"] = 1
    with pytest.raises(ValidationError):
        type(plan).model_validate(payload)


def test_result_rejects_unknown_unit_and_compiler_rejects_generated_citation():
    units = _units()
    plan = build_adaptive_analysis_plan(
        run_id="run-019", units=units, small_model_route="small-moe",
        target_chars=1800,
    )
    job = plan.jobs[0]
    section = next(row for row in plan.sections if row.section_id == job.section_id)
    bad = _result(job, section, unit_id="unknown-unit")
    with pytest.raises(SectionAnalysisError, match="unknown_source"):
        validate_section_result(job, section, bad)


class _Executor:
    def __init__(self, retry_job):
        self.retry_job = retry_job
        self.calls = {}

    def execute(self, job, section, attempt):
        self.calls[job.job_id] = self.calls.get(job.job_id, 0) + 1
        if job.job_id == self.retry_job and attempt == 1:
            raise RetryableSectionError("retry")
        return _result(job, section, attempt=attempt)


def test_durable_parallel_retry_restart_and_no_successful_reexecution(tmp_path):
    plan = build_adaptive_analysis_plan(
        run_id="run-019", units=_units(), small_model_route="small-moe",
        target_chars=4000, maximum_prompts_per_section=3,
    )
    store = SectionAnalysisStore(tmp_path / "state" / "jobs.sqlite")
    store.seed(plan)
    executor = _Executor(plan.jobs[0].job_id)
    first = run_parallel_jobs(store=store, plan=plan, executor=executor, max_workers=4)
    attempts = store.attempts()
    store.close()
    assert len(first) == len(plan.jobs)
    assert attempts[plan.jobs[0].job_id] == 2
    assert all(value == 1 for key, value in attempts.items() if key != plan.jobs[0].job_id)

    reopened = SectionAnalysisStore(tmp_path / "state" / "jobs.sqlite")
    reopened.seed(plan)
    second_executor = _Executor(None)
    second = run_parallel_jobs(store=reopened, plan=plan, executor=second_executor, max_workers=2)
    reopened.close()
    assert second == first
    assert second_executor.calls == {}


def test_stale_lease_commit_is_fenced(tmp_path):
    plan = build_adaptive_analysis_plan(
        run_id="run-019", units=_units(), small_model_route="small-moe",
        target_chars=5000, maximum_prompts_per_section=2,
    )
    store = SectionAnalysisStore(tmp_path / "jobs.sqlite")
    store.seed(plan)
    now = datetime.now(timezone.utc)
    job, token, attempt = store.claim(now, lease_seconds=1)
    section = next(row for row in plan.sections if row.section_id == job.section_id)
    result = _result(job, section, attempt=attempt)
    with pytest.raises(SectionAnalysisError, match="stale"):
        store.commit(result, token, now + timedelta(seconds=2))
    store.close()


def test_compiler_packet_contains_exact_excerpts_and_rejects_unknown_claim_citation():
    units = _units()
    plan = build_adaptive_analysis_plan(
        run_id="run-019", units=units, small_model_route="small-moe",
        target_chars=5000, maximum_prompts_per_section=2,
    )
    results = tuple(
        _result(job, next(row for row in plan.sections if row.section_id == job.section_id))
        for job in plan.jobs
    )
    packet = build_compiler_packet(
        plan=plan, results=results, units=units, compiler_model_route="compiler-27b",
    )
    assert packet.evidence[0].exact_source_excerpts
    values = dict(
        schema_version="document-compilation-v1.0", document_id=plan.document_id,
        packet_sha256=packet.packet_sha256, requested_model="compiler-27b",
        provider_resolved_model="synthetic-compiler",
        claims=(CompilerClaimV1(
            claim_id="claim-1", statement="Invented", citation_unit_ids=("unknown",),
            support_status="supported",
        ),), output_sha256="0" * 64,
    )
    draft = DocumentCompilationV1.model_construct(**values)
    values["output_sha256"] = canonical_contract_sha256(draft, omit={"output_sha256"})
    output = DocumentCompilationV1.model_validate(values)
    with pytest.raises(SectionAnalysisError, match="unknown_source"):
        validate_compilation(packet, output)


def test_store_rejects_transfer_tree_path(tmp_path):
    shared = tmp_path / "to-studio"
    with pytest.raises(ValueError, match="transfer tree"):
        SectionAnalysisStore(shared / "worker.sqlite", forbidden_roots=(shared,))
