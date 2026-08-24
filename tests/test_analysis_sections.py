from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from runner.models.retrieval import canonical_contract_sha256
from runner.pipeline.analysis_sections import (
    COMPILER_MAX_EVIDENCE_ITEMS,
    COMPILER_MAX_EXCERPT_CHARACTERS,
    COMPILER_MAX_PACKET_BYTES,
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
    build_compiler_input_reduction_receipt,
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


def _result(
    job, section, *, attempt=1, unit_id=None, requested_model=None,
    repair_error_code=None,
):
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
        requested_model=requested_model or job.model_route,
        provider_resolved_model="synthetic-model", attempt=attempt,
        repair_error_code=repair_error_code,
        findings=(finding,), output_sha256="0" * 64,
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


def test_declared_repair_route_is_hash_bound_and_attempt_limited():
    plan = build_adaptive_analysis_plan(
        run_id="run-020c", units=_units(), small_model_route="core-qwen",
        repair_model_route="compiler-qwen38", target_chars=1800,
        maximum_attempts=2,
    )
    assert {job.repair_model_route for job in plan.jobs} == {"compiler-qwen38"}
    bad = plan.jobs[0].model_dump(mode="python")
    bad["repair_model_route"] = "other-repair"
    with pytest.raises(ValidationError, match="hash mismatch"):
        SectionPromptJobV1.model_validate(bad)
    bad = plan.jobs[0].model_dump(mode="python")
    bad["maximum_attempts"] = 3
    with pytest.raises(ValidationError, match="exactly two"):
        SectionPromptJobV1.model_validate(bad)


def test_result_accepts_only_declared_attempt_two_schema_repair():
    plan = build_adaptive_analysis_plan(
        run_id="run-020c", units=_units(), small_model_route="core-qwen",
        repair_model_route="compiler-qwen38", target_chars=1800,
        maximum_attempts=2,
    )
    job = plan.jobs[0]
    section = next(row for row in plan.sections if row.section_id == job.section_id)
    repaired = _result(
        job, section, attempt=2, requested_model="compiler-qwen38",
        repair_error_code="section_mapper_schema_validation_retryable",
    )
    validate_section_result(job, section, repaired)
    output_repaired = _result(
        job, section, attempt=2, requested_model="compiler-qwen38",
        repair_error_code="section_mapper_output_contract_retryable",
    )
    validate_section_result(job, section, output_repaired)

    attempt_one = repaired.model_copy(update={"attempt": 1})
    with pytest.raises(SectionAnalysisError, match="undeclared_repair"):
        validate_section_result(job, section, attempt_one)
    wrong_route = repaired.model_copy(update={"requested_model": "other-repair"})
    with pytest.raises(SectionAnalysisError, match="route_or_prompt"):
        validate_section_result(job, section, wrong_route)
    third = repaired.model_copy(update={"attempt": 3})
    with pytest.raises(SectionAnalysisError, match="attempt_exceeds"):
        validate_section_result(job, section, third)

    no_repair_plan = build_adaptive_analysis_plan(
        run_id="run-020c", units=_units(), small_model_route="core-qwen",
        target_chars=1800,
    )
    no_repair_job = no_repair_plan.jobs[0]
    no_repair_section = next(
        row for row in no_repair_plan.sections
        if row.section_id == no_repair_job.section_id
    )
    forged = _result(
        no_repair_job, no_repair_section, attempt=2,
        requested_model="compiler-qwen38",
        repair_error_code="section_mapper_schema_validation_retryable",
    )
    with pytest.raises(SectionAnalysisError, match="undeclared_repair"):
        validate_section_result(no_repair_job, no_repair_section, forged)


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


def test_targeted_resume_requeues_only_exact_legacy_held_job(tmp_path):
    plan = build_adaptive_analysis_plan(
        run_id="run-020d", units=_units(), small_model_route="core-qwen",
        repair_model_route="compiler-qwen38", target_chars=4000,
        maximum_prompts_per_section=2,
    )
    held_id = plan.jobs[0].job_id

    class LegacyExecutor:
        def execute(self, job, section, attempt):
            if job.job_id == held_id:
                raise SectionAnalysisError("invalid_or_terminal_executor_failure")
            return _result(job, section, attempt=attempt)

    store = SectionAnalysisStore(tmp_path / "legacy.sqlite")
    try:
        store.seed(plan)
        results = run_parallel_jobs(
            store=store, plan=plan, executor=LegacyExecutor(), max_workers=2,
        )
        assert len(results) == len(plan.jobs) - 1
        snapshot = store.targeted_resume_snapshot()
        held = next(row for row in snapshot if row["job_id"] == held_id)
        assert held == {
            "job_id": held_id,
            "state": "held",
            "attempt": 1,
            "has_result": False,
            "terminal_reason": "invalid_or_terminal_executor_failure",
            "has_lease": False,
        }
        assert store.failure_evidence() == ({
            "job_id": held_id,
            "attempt": 1,
            "stage": "executor_contract",
            "error_code": "invalid_or_terminal_executor_failure",
            "http_status_category": "",
            "pydantic_diagnostics": [],
            "requested_alias": "core-qwen",
        },)
        assert store.requeue_legacy_held_contract_jobs((held_id,)) == 1
        resumed = next(
            row for row in store.targeted_resume_snapshot()
            if row["job_id"] == held_id
        )
        assert resumed["state"] == "pending"
        assert resumed["attempt"] == 1
        assert resumed["terminal_reason"] == "section_mapper_output_contract_retryable"
        with pytest.raises(SectionAnalysisError, match="state_changed"):
            store.requeue_legacy_held_contract_jobs((held_id,))
    finally:
        store.close()


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


def test_final_result_validation_failure_is_distinct_and_content_free(tmp_path):
    plan = build_adaptive_analysis_plan(
        run_id="run-020d", units=_units(), small_model_route="core-qwen",
        target_chars=5000, maximum_prompts_per_section=2,
    )

    class InvalidCitationExecutor:
        def execute(self, job, section, attempt):
            return _result(job, section, attempt=attempt, unit_id="unknown-unit")

    store = SectionAnalysisStore(tmp_path / "final-validation.sqlite")
    try:
        store.seed(plan)
        assert run_parallel_jobs(
            store=store, plan=plan, executor=InvalidCitationExecutor(), max_workers=1,
        ) == ()
        evidence = store.failure_evidence()
        assert len(evidence) == len(plan.jobs)
        assert {row["stage"] for row in evidence} == {"final_result_validation"}
        assert {row["error_code"] for row in evidence} == {
            "finding_unknown_source_citation",
        }
        assert {row["requested_alias"] for row in evidence} == {"core-qwen"}
        assert all(row["pydantic_diagnostics"] == [] for row in evidence)
    finally:
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
    unsupported = output.model_dump(mode="python")
    unsupported["claims"][0]["support_status"] = "unsupported"
    unsupported["claims"] = tuple(
        CompilerClaimV1.model_validate(row) for row in unsupported["claims"]
    )
    draft = DocumentCompilationV1.model_construct(**{
        **unsupported, "output_sha256": "0" * 64,
    })
    unsupported["output_sha256"] = canonical_contract_sha256(
        draft, omit={"output_sha256"},
    )
    with pytest.raises(SectionAnalysisError, match="unsupported_claim_has_citation"):
        validate_compilation(packet, DocumentCompilationV1.model_validate(unsupported))


def test_compiler_packet_bounds_repeated_excerpt_expansion_without_source_loss():
    units = _units()
    plan = build_adaptive_analysis_plan(
        run_id="run-bounded-compiler", units=units, small_model_route="small-moe",
        target_chars=5000, maximum_prompts_per_section=2,
    )
    base = tuple(
        _result(job, next(row for row in plan.sections if row.section_id == job.section_id))
        for job in plan.jobs
    )
    packet = build_compiler_packet(
        plan=plan, results=base * 30, units=units,
        compiler_model_route="compiler-27b",
    )
    assert 0 < len(packet.evidence) <= COMPILER_MAX_EVIDENCE_ITEMS
    assert sum(
        sum(len(value) for value in row.exact_source_excerpts)
        for row in packet.evidence
    ) <= COMPILER_MAX_EXCERPT_CHARACTERS
    legacy = build_compiler_packet(
        plan=plan, results=base * 30, units=units,
        compiler_model_route="compiler-27b", apply_bounds=False,
    )
    assert len(legacy.evidence) > len(packet.evidence)


def test_compiler_reduction_receipt_binds_order_omissions_bytes_and_source_hashes():
    units = _units("doc-reduction-receipt")
    plan = build_adaptive_analysis_plan(
        run_id="run-reduction-receipt", units=units, small_model_route="small-moe",
        target_chars=5000, maximum_prompts_per_section=2,
    )
    base = tuple(
        _result(job, next(row for row in plan.sections if row.section_id == job.section_id))
        for job in plan.jobs
    )
    original, derived, receipt = build_compiler_input_reduction_receipt(
        plan=plan, results=base * 30, units=units,
        compiler_model_route="compiler-27b",
    )
    repeated = build_compiler_input_reduction_receipt(
        plan=plan, results=base * 30, units=units,
        compiler_model_route="compiler-27b",
    )[2]
    assert receipt == repeated
    assert receipt.original_packet_sha256 == original.packet_sha256
    assert receipt.derived_packet_sha256 == derived.packet_sha256
    assert receipt.used_packet_sha256 == derived.packet_sha256
    assert receipt.input_kind == "derived"
    assert receipt.original_finding_count == len(original.evidence)
    assert receipt.included_finding_count == len(derived.evidence)
    assert receipt.omitted_finding_count > 0
    assert receipt.derived_packet_bytes <= COMPILER_MAX_PACKET_BYTES
    assert receipt.included_excerpt_characters <= COMPILER_MAX_EXCERPT_CHARACTERS
    assert len(derived.evidence) <= COMPILER_MAX_EVIDENCE_ITEMS
    assert set(receipt.included_source_excerpt_sha256s).issubset(
        receipt.original_source_excerpt_sha256s
    )
    assert set(receipt.included_citation_unit_ids).issubset(
        receipt.original_citation_unit_ids
    )


def test_store_rejects_transfer_tree_path(tmp_path):
    shared = tmp_path / "to-studio"
    with pytest.raises(ValueError, match="transfer tree"):
        SectionAnalysisStore(shared / "worker.sqlite", forbidden_roots=(shared,))


def test_store_requeues_only_legacy_mapper_json_hold_for_declared_repair(tmp_path):
    units = build_citation_units_v2("Public evidence. " * 20, doc_id="doc-json-hold")
    plan = build_adaptive_analysis_plan(
        run_id="run-json-hold", units=units, small_model_route="core-qwen",
        repair_model_route="compiler-qwen38", target_chars=2000,
        maximum_prompts_per_section=2,
    )
    store = SectionAnalysisStore(tmp_path / "json-hold.sqlite")
    try:
        store.seed(plan)
        job_id = plan.jobs[0].job_id
        with store.connection:
            store.connection.execute(
                "UPDATE section_jobs SET state='held',attempt=1,terminal_reason=? WHERE job_id=?",
                ("local_model_response_truncated_json", job_id),
            )
        assert store.requeue_mapper_json_output_holds() == 1
        row = store.connection.execute(
            "SELECT state,attempt,terminal_reason FROM section_jobs WHERE job_id=?", (job_id,),
        ).fetchone()
        assert (row["state"], row["attempt"], row["terminal_reason"]) == (
            "pending", 1, "section_mapper_schema_validation_retryable",
        )
        assert store.requeue_mapper_json_output_holds() == 0
    finally:
        store.close()


def test_store_migrates_one_exhausted_transport_hold_without_new_semantic_attempt(tmp_path):
    units = build_citation_units_v2("Public evidence. " * 20, doc_id="doc-transport")
    plan = build_adaptive_analysis_plan(
        run_id="run-transport", units=units, small_model_route="core-qwen",
        repair_model_route="compiler-qwen38", target_chars=2000,
        maximum_prompts_per_section=2,
    )
    store = SectionAnalysisStore(tmp_path / "transport-hold.sqlite")
    try:
        store.seed(plan)
        job_id = plan.jobs[0].job_id
        with store.connection:
            store.connection.execute(
                "UPDATE section_jobs SET state='held',attempt=2,terminal_reason=? WHERE job_id=?",
                ("local_chat_transport_retryable", job_id),
            )
            store.connection.execute(
                "INSERT INTO section_job_failures(job_id,attempt,stage,error_code,"
                "http_status_category,pydantic_diagnostics_json,requested_alias) "
                "VALUES(?,?,?,?,?,?,?)",
                (
                    job_id, 1, "pydantic_validation",
                    "section_mapper_schema_validation_retryable", "", "[]", "core-qwen",
                ),
            )
        assert store.migrate_exhausted_transport_holds() == 1
        row = store.connection.execute(
            "SELECT state,attempt,terminal_reason,transport_retry_count FROM section_jobs "
            "WHERE job_id=?", (job_id,),
        ).fetchone()
        assert tuple(row) == (
            "pending", 1, "section_mapper_schema_validation_retryable", 1,
        )
        assert store.migrate_exhausted_transport_holds() == 0
    finally:
        store.close()


def test_confirmed_abandoned_runner_recovery_preserves_attempt_and_diagnostic(tmp_path):
    units = build_citation_units_v2("Public evidence. " * 20, doc_id="doc-abandoned")
    plan = build_adaptive_analysis_plan(
        run_id="run-abandoned", units=units, small_model_route="core-qwen",
        repair_model_route="compiler-qwen38", target_chars=2000,
        maximum_prompts_per_section=2,
    )
    store = SectionAnalysisStore(tmp_path / "abandoned.sqlite")
    try:
        store.seed(plan)
        now = datetime.now(timezone.utc)
        job, _token, attempt = store.claim(now, lease_seconds=900)
        assert attempt == 1
        assert store.recover_confirmed_abandoned_runner() == 1
        row = store.connection.execute(
            "SELECT state,attempt,lease_token,lease_expires_at FROM section_jobs WHERE job_id=?",
            (job.job_id,),
        ).fetchone()
        assert tuple(row) == ("pending", 0, None, None)
        failure = store.failure_evidence()[0]
        assert failure["error_code"] == "runner_abandoned_after_scheduler_recovery"
        assert failure["stage"] == "http_transport"
        assert failure["attempt"] == 1
    finally:
        store.close()


def test_local_service_restart_recovers_only_transport_held_rows(tmp_path):
    units = build_citation_units_v2("Public evidence. " * 20, doc_id="doc-service")
    plan = build_adaptive_analysis_plan(
        run_id="run-service", units=units, small_model_route="core-qwen",
        repair_model_route="compiler-qwen38", target_chars=2000,
        maximum_prompts_per_section=2,
    )
    store = SectionAnalysisStore(tmp_path / "service.sqlite")
    try:
        store.seed(plan)
        job_id = plan.jobs[0].job_id
        with store.connection:
            store.connection.execute(
                "UPDATE section_jobs SET state='held',attempt=2,terminal_reason=?,"
                "transport_retry_count=1 WHERE job_id=?",
                ("local_chat_transport_retryable", job_id),
            )
        assert store.recover_after_confirmed_local_service_restart() == 1
        row = store.connection.execute(
            "SELECT state,attempt,terminal_reason,transport_retry_count FROM section_jobs "
            "WHERE job_id=?", (job_id,),
        ).fetchone()
        assert tuple(row) == ("pending", 0, "", 0)
        assert store.failure_evidence()[0]["error_code"] == "local_service_restart_recovery"
    finally:
        store.close()
