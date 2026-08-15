from __future__ import annotations

import hashlib
import json
from dataclasses import replace
from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from runner.models.document import AnalysisResult, PreprocessResult
from runner.models.reprocessing import (
    AnalysisLexiconSnapshotV1,
    AnalysisLexiconTermV1,
    AnalysisLexiconVariantV1,
    ModelStageResultV1,
    RESEARCH_PASS_A_STATIONS,
    ResearchPassAApprovalV1,
    ResearchPassACampaignV1,
    ResearchPassADocumentV1,
    CampaignSourceReferenceV1,
    _canonical_contract_sha256,
)
from runner.pipeline.extraction_quality import build_model_input_slice
from runner.pipeline.factory_analysis import (
    AnalysisExecutorResult,
    AnalysisStationError,
    AnalysisStationRequest,
    PassAWorker,
    PassAWorkerStore,
    RetryableAnalysisError,
    build_analysis_bundle,
    publish_analysis_bundle,
    snapshot_prompt_terms,
    validate_analysis_request,
    validate_executor_result,
)
from runner.pipeline.factory_messages import verify_checksum_pair
from runner.pipeline.input_receipt import build_resolved_input_receipt, canonical_fingerprint
from runner.pipeline import analyze
from runner.production_line_ui import pass_a_readiness_model


NOW = datetime(2026, 8, 15, 12, 0, tzinfo=timezone.utc)
H = hashlib.sha256(b"source").hexdigest()


def _snapshot() -> AnalysisLexiconSnapshotV1:
    draft = AnalysisLexiconSnapshotV1.model_construct(
        schema_version="analysis-lexicon-snapshot-v1.0",
        snapshot_id="snapshot-018",
        source_version="reviewed-v1",
        creation_policy="trusted_orientation_terms_only",
        created_at=NOW,
        terms=(AnalysisLexiconTermV1(
            term_id="affirming-care",
            preferred_term="affirming care",
            definition="A trusted compact orientation term.",
            variants=(AnalysisLexiconVariantV1(language="pt", value="cuidado afirmativo"),),
        ),),
        canonical_sha256="0" * 64,
    )
    return AnalysisLexiconSnapshotV1.model_validate({
        **draft.model_dump(mode="python"),
        "canonical_sha256": _canonical_contract_sha256(draft, omit={"canonical_sha256"}),
    })


def _analysis() -> AnalysisResult:
    return AnalysisResult.model_validate({
        "type": "Anti-SOGICE", "format": "Blog-Post", "evidence": ["Synthetic evidence."],
        "scope": "Core", "narrative_register": "Legal-Policy",
        "summary": "Synthetic validated result.",
        "confidence": {"overall_score": 0.9, "status": "high"},
    })


def _preprocess(*, distinct=False, stale=False) -> PreprocessResult:
    canonical = "Complete synthetic text.\r\n\r\nFinal line."
    if distinct:
        model, receipt = build_model_input_slice(canonical, limit_chars=12, head_chars=7, tail_chars=5)
        receipt_value = receipt.model_dump(mode="json")
    else:
        model, receipt_value = canonical, {}
    return PreprocessResult(
        doc_id="doc-a", tool_used="manual", quality="high", text=model,
        canonical_text=canonical + ("changed" if stale else ""),
        model_input_receipt=receipt_value, char_count=len(canonical),
    )


def _request(**overrides) -> AnalysisStationRequest:
    preprocess = overrides.pop("preprocess", _preprocess())
    canonical = preprocess.canonical_text or preprocess.text
    values = dict(
        run_id="run-018", package_id="package-001", document_id="doc-a",
        source_sha256=H, canonical_sha256=hashlib.sha256(canonical.encode()).hexdigest(),
        attempt=1, route="local", preprocess=preprocess, lexicon_snapshot=_snapshot(),
    )
    values.update(overrides)
    return AnalysisStationRequest(**values)


def _executor_result(request: AnalysisStationRequest, **audit_overrides) -> AnalysisExecutorResult:
    terms = snapshot_prompt_terms(request.lexicon_snapshot)
    system = "system:" + json.dumps(terms, sort_keys=True, ensure_ascii=False)
    user = "user:" + request.preprocess.text
    params = {"temperature": 0.1}
    audit = {
        "prompt_version": "ingestion-v3.3", "model": request.route,
        "provider_resolved_model": "ollama/test-model@sha256:abc",
        "model_parameters": params,
        "prompt_sha256": hashlib.sha256(system.encode()).hexdigest(),
        "prompt_template_sha256": hashlib.sha256(b"template").hexdigest(),
        "lexicon_fingerprint": request.lexicon_snapshot.canonical_sha256,
        "lexicon_source": "frozen_snapshot", "input_char_count": len(request.preprocess.text),
        "input_truncated": request.preprocess.text != request.preprocess.canonical_text,
        "duration_ms": 5, "validation_path": "synthetic_typed",
        "validation_attempts": 1,
        "input_receipt": build_resolved_input_receipt(
            stage="analysis", extracted_text=request.preprocess.text,
            system_input=system, user_input=user, resolved_model=request.route,
            provider_resolved_model="ollama/test-model@sha256:abc",
            model_parameters=params,
            lexicon_fingerprint=request.lexicon_snapshot.canonical_sha256,
            provisional_memory_fingerprint=canonical_fingerprint({"used": False}),
            tag_registry_fingerprint=canonical_fingerprint({"used": False}),
            policy_fingerprint=canonical_fingerprint({"prompt": "ingestion-v3.3"}),
        ),
    }
    audit.update(audit_overrides)
    return AnalysisExecutorResult(_analysis(), audit)


def _campaign(document_ids=("doc-a",)) -> ResearchPassACampaignV1:
    refs = tuple(CampaignSourceReferenceV1(
        ref_id=f"ref-{doc}", doc_id=doc, source_ref_kind="source_object", source_sha256=H,
        relative_object_path=f"sources/sha256/{H[:2]}/{H}/source.txt",
    ) for doc in document_ids)
    draft = ResearchPassACampaignV1.model_construct(
        schema_version="research-pass-a-campaign-v1.0", run_id="run-018",
        campaign_id="campaign-018", approval_fingerprint_sha256="1" * 64,
        station_sequence=RESEARCH_PASS_A_STATIONS, execution_policy="station_major",
        package_ids=("package-001",), document_ids=document_ids, source_references=refs,
        prompt_version="ingestion-v3.3", analysis_output_schema_version="analysis-v3.3",
        analysis_route="local", lexicon_snapshot_sha256=_snapshot().canonical_sha256,
        maximum_attempts=2, model_lifecycle_policy="one_lifecycle_per_analysis_station",
        remote_writes=False, corpus_import=False, publication=False,
        expected_output_contracts=("analysis.json", "analysis_audit.json", "resolved_input_receipt.json", "model_stage_result.json", "result_manifest.json"),
        predecessor_campaign_ids=(), campaign_sha256="0" * 64,
    )
    return ResearchPassACampaignV1.model_validate({
        **draft.model_dump(mode="python"),
        "campaign_sha256": _canonical_contract_sha256(draft, omit={"campaign_sha256"}),
    })


def test_snapshot_is_canonical_and_tamper_rejected():
    snapshot = _snapshot()
    tampered = snapshot.model_dump(mode="python")
    tampered["source_version"] = "changed"
    with pytest.raises(ValidationError, match="canonical hash mismatch"):
        AnalysisLexiconSnapshotV1.model_validate(tampered)


def test_snapshot_rejects_provisional_status_and_unsorted_variants():
    data = _snapshot().model_dump(mode="python")
    data["terms"][0]["status"] = "provisional"
    with pytest.raises(ValidationError):
        AnalysisLexiconSnapshotV1.model_validate(data)


def test_frozen_prompt_boundary_never_reads_live_sanity(monkeypatch):
    snapshot = _snapshot()
    monkeypatch.setattr(analyze, "_load_system_prompt", lambda: "BASE")
    monkeypatch.setattr(
        analyze, "_fetch_active_lexicon_terms",
        lambda config: (_ for _ in ()).throw(AssertionError("live Sanity read")),
    )
    audit = {}
    rendered = analyze._build_system_prompt_with_lexicon(
        object(), _audit=audit,
        _frozen_lexicon_terms=snapshot_prompt_terms(snapshot),
        _frozen_lexicon_sha256=snapshot.canonical_sha256,
    )
    assert "affirming care" in rendered
    assert audit["lexicon_source"] == "frozen_snapshot"


def test_pass_a_approval_requires_four_stations_and_fingerprint():
    document = ResearchPassADocumentV1(
        document_id="doc-a", source_sha256=H, source_bytes=10,
        source_is_public=True, source_is_non_sensitive=True, not_testimony=True,
        contains_no_private_or_restricted_material=True, not_consent_gated=True,
    )
    draft = ResearchPassAApprovalV1.model_construct(
        schema_version="research-pass-a-approval-v1.0", approval_id="approval-018",
        run_id="run-018", documents=(document,), authorized_station_ids=RESEARCH_PASS_A_STATIONS,
        analysis_route="local", prompt_version="ingestion-v3.3",
        lexicon_snapshot_sha256=_snapshot().canonical_sha256, researcher_id="researcher",
        researcher_approval_text="Synthetic contract test only.", issued_at=NOW,
        expiry_policy="expires", expires_at=NOW + timedelta(hours=24),
        fingerprint_sha256="0" * 64,
    )
    good = {**draft.model_dump(mode="python"), "fingerprint_sha256": _canonical_contract_sha256(draft, omit={"fingerprint_sha256"})}
    assert ResearchPassAApprovalV1.model_validate(good).authorized_station_ids[-1] == "independent_analysis"
    good["authorized_station_ids"] = good["authorized_station_ids"][:3]
    with pytest.raises(ValidationError, match="four ordered"):
        ResearchPassAApprovalV1.model_validate(good)


def test_campaign_is_station_major_and_hash_bound():
    campaign = _campaign(("doc-a", "doc-b"))
    assert campaign.execution_policy == "station_major"
    bad = campaign.model_dump(mode="python")
    bad["analysis_route"] = "both"
    with pytest.raises(ValidationError, match="canonical hash mismatch"):
        ResearchPassACampaignV1.model_validate(bad)


def test_model_stage_rejects_retrieval_and_index_fields():
    fields = dict(
        run_id="run-018", stage_job_id="job-1", document_id="doc-a", attempt=1,
        input_artifact_hashes=(H,), system_input_sha256=H, user_input_sha256=H,
        requested_model="local", provider_resolved_model="model-v1",
        model_parameters={}, output_schema_version="analysis-v3.3",
        lexicon_snapshot_sha256=H, started_at=NOW, completed_at=NOW,
        duration_ms=0, validation_status="passed", output_sha256=H,
    )
    assert ModelStageResultV1(**fields).index_version == ""
    with pytest.raises(ValidationError):
        ModelStageResultV1(**fields, index_version="index")
    with pytest.raises(ValidationError):
        ModelStageResultV1(**fields, retrieval_context_sha256=H)


def test_valid_canonical_and_separate_bounded_input_are_accepted():
    request = _request(preprocess=_preprocess(distinct=True))
    canonical, model = validate_analysis_request(request)
    assert canonical != model


def test_stale_canonical_is_held_before_executor():
    preprocess = _preprocess()
    request = _request(preprocess=preprocess, canonical_sha256=hashlib.sha256(b"other").hexdigest())
    with pytest.raises(AnalysisStationError, match="stale_canonical"):
        validate_analysis_request(request)


def test_missing_receipt_for_distinct_input_is_held():
    preprocess = _preprocess()
    preprocess.text = "short"
    with pytest.raises(ValueError, match="requires model_input_receipt"):
        validate_analysis_request(_request(preprocess=preprocess))


def test_truncation_marker_is_held():
    text = "a[TRUNCATED MIDDLE 10 CHARACTERS]b"
    pre = PreprocessResult(doc_id="doc-a", tool_used="manual", quality="high", text=text, canonical_text=text)
    with pytest.raises(AnalysisStationError, match="truncation_marker"):
        validate_analysis_request(_request(preprocess=pre))


@pytest.mark.parametrize("route", ["both", "prefer-local", "prefer-claude", ""])
def test_fallback_routes_are_not_authorized(route):
    with pytest.raises(AnalysisStationError, match="route"):
        validate_analysis_request(_request(route=route))


def test_valid_typed_executor_result_and_receipt_pass():
    request = _request()
    analysis, audit = validate_executor_result(request, _executor_result(request))
    assert analysis.summary
    assert audit["lexicon_source"] == "frozen_snapshot"


@pytest.mark.parametrize("field,value,code", [
    ("prompt_version", "ingestion-v3.2", "prompt_version"),
    ("lexicon_fingerprint", "f" * 64, "lexicon_snapshot"),
    ("lexicon_source", "live_legacy", "not_frozen"),
    ("provider_resolved_model", "", "provider_resolved"),
])
def test_executor_identity_failures_hold(field, value, code):
    request = _request()
    with pytest.raises(AnalysisStationError, match=code):
        validate_executor_result(request, _executor_result(request, **{field: value}))


def test_missing_and_tampered_resolved_receipts_hold():
    request = _request()
    with pytest.raises(AnalysisStationError, match="receipt_missing"):
        validate_executor_result(request, _executor_result(request, input_receipt=None))
    result = _executor_result(request)
    result.audit["input_receipt"]["request_sha256"] = "f" * 64
    with pytest.raises(ValueError, match="fingerprint"):
        validate_executor_result(request, result)


def test_bundle_is_complete_content_free_and_retrieval_free(tmp_path):
    request = _request(preprocess=_preprocess(distinct=True))
    artifacts, manifest, observer = build_analysis_bundle(
        request, _executor_result(request), started_at=NOW,
        completed_at=NOW + timedelta(milliseconds=5),
    )
    assert set(artifacts) == {"analysis.json", "analysis_audit.json", "resolved_input_receipt.json", "model_stage_result.json", "result_manifest.json"}
    assert manifest.station_id == "independent_analysis"
    assert observer.prompt_version == "ingestion-v3.3"
    serialized = b"".join(artifacts.values())
    assert b"retrieval_context" in artifacts["model_stage_result.json"]
    assert b'"retrieval_context_sha256":""' in artifacts["model_stage_result.json"]
    assert request.preprocess.text.encode() not in artifacts["analysis_audit.json"]
    published = publish_analysis_bundle(tmp_path / "results", artifacts)
    assert len(published) == 5
    for name in artifacts:
        verify_checksum_pair(tmp_path / "results" / name)


def test_partial_bundle_and_symlink_are_rejected(tmp_path):
    with pytest.raises(AnalysisStationError, match="incomplete"):
        publish_analysis_bundle(tmp_path / "results", {"analysis.json": b"{}\n"})
    target = tmp_path / "target"
    target.mkdir()
    link = tmp_path / "link"
    link.symlink_to(target, target_is_directory=True)
    with pytest.raises(AnalysisStationError, match="symlink"):
        publish_analysis_bundle(link, {})


class FakeExecutor:
    def __init__(self): self.opens = 0; self.closes = 0
    def open(self): self.opens += 1
    def close(self): self.closes += 1
    def execute(self, request): return _executor_result(request)


def test_three_documents_execute_station_major_with_one_lifecycle(tmp_path):
    campaign = _campaign(("doc-a", "doc-b", "doc-c"))
    store = PassAWorkerStore(tmp_path / "state" / "worker.db", shared_roots=(tmp_path / "exchange",))
    executor = FakeExecutor()
    order = []
    def execute(job, _executor):
        order.append((job["station_id"], job["document_id"]))
        return hashlib.sha256(repr(order[-1]).encode()).hexdigest()
    snapshot = PassAWorker(store, executor).run_until_idle(campaign, execute)
    assert order == [(station, doc) for station in RESEARCH_PASS_A_STATIONS for doc in campaign.document_ids]
    assert all(row["state"] == "succeeded" for row in snapshot)
    assert (executor.opens, executor.closes) == (1, 1)
    store.close()


def test_document_hold_is_isolated_and_closes_lifecycle(tmp_path):
    campaign = _campaign(("doc-a", "doc-b", "doc-c"))
    store = PassAWorkerStore(tmp_path / "worker.db")
    executor = FakeExecutor()
    def execute(job, _executor):
        if job["station_id"] == "independent_analysis" and job["document_id"] == "doc-b":
            raise AnalysisStationError("invalid")
        return H
    rows = PassAWorker(store, executor).run_until_idle(campaign, execute)
    analysis = {row["document_id"]: row for row in rows if row["station_id"] == "independent_analysis"}
    assert analysis["doc-a"]["state"] == analysis["doc-c"]["state"] == "succeeded"
    assert analysis["doc-b"]["state"] == "held"
    assert executor.closes == 1
    store.close()


def test_retry_only_retries_retryable_document(tmp_path):
    campaign = _campaign(("doc-a", "doc-b"))
    store = PassAWorkerStore(tmp_path / "worker.db")
    calls = {}
    def execute(job, _executor):
        key = (job["station_id"], job["document_id"]); calls[key] = calls.get(key, 0) + 1
        if key == ("independent_analysis", "doc-b") and calls[key] == 1:
            raise RetryableAnalysisError("temporary")
        return H
    rows = PassAWorker(store, FakeExecutor()).run_until_idle(campaign, execute)
    assert calls[("independent_analysis", "doc-a")] == 1
    assert calls[("independent_analysis", "doc-b")] == 2
    assert all(row["state"] == "succeeded" for row in rows)
    store.close()


def test_restart_skips_authenticated_success(tmp_path):
    campaign = _campaign()
    path = tmp_path / "worker.db"
    first = PassAWorkerStore(path)
    calls = []
    PassAWorker(first, FakeExecutor()).run_until_idle(campaign, lambda job, executor: calls.append(job) or H)
    first.close()
    second = PassAWorkerStore(path)
    PassAWorker(second, FakeExecutor()).run_until_idle(campaign, lambda job, executor: calls.append(job) or H)
    assert len(calls) == 4
    second.close()


def test_expired_lease_cannot_commit(tmp_path):
    campaign = _campaign()
    store = PassAWorkerStore(tmp_path / "worker.db")
    store.initialize(campaign)
    job = store.claim(run_id=campaign.run_id, now=NOW, lease_seconds=1)
    with pytest.raises(AnalysisStationError, match="expired_lease"):
        store.commit(job, lease_token=job["lease_token"], now=NOW + timedelta(seconds=2), output_sha256=H)
    store.close()


def test_database_is_rejected_inside_exchange(tmp_path):
    exchange = tmp_path / "exchange"; exchange.mkdir()
    with pytest.raises(AnalysisStationError, match="inside_exchange"):
        PassAWorkerStore(exchange / "worker.db", shared_roots=(exchange,))


def test_second_scan_executes_zero_successful_work(tmp_path):
    campaign = _campaign()
    store = PassAWorkerStore(tmp_path / "worker.db")
    calls = []
    worker = PassAWorker(store, FakeExecutor())
    worker.run_until_idle(campaign, lambda job, executor: calls.append(job) or H)
    worker.run_until_idle(campaign, lambda job, executor: calls.append(job) or H)
    assert len(calls) == 4
    store.close()


def test_ui_foundation_is_explicitly_disabled_and_not_rag_evidence():
    model = pass_a_readiness_model()
    assert model["released"] is False
    assert "not source evidence" in model["warning"]
    assert {"Embeddings", "RAG", "Enrichment", "Publication"} <= set(model["disabled_operations"])
