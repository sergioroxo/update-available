from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest

from runner.pipeline.factory_messages import canonical_json_bytes
from runner.pipeline.factory_semantic_campaign import SourceInventoryRow
from runner.pipeline.factory_semantic_pilot import build_results_archive
from runner.pipeline.factory_sealed_review import (
    AcceptedCampaignEvidence,
    append_review_disposition,
    build_reconciliation_preview,
    discover_accepted_campaign_evidence,
    discover_sealed_campaigns,
    load_review_events,
    review_disposition_projection,
    sealed_document_review_model,
    verify_sealed_campaign,
)


PROJECTION = "b" * 64
SOURCE_SHA = "c" * 64
RECEIPT_SHA = "d" * 64


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(canonical_json_bytes(payload))


def build_sealed_fixture(
    root: Path,
    *,
    run_id: str = "semantic-fixture-025",
    enrichment_document_id: str = "doc-a",
) -> tuple[Path, Path]:
    sealed = root / "sealed"
    files = {
        "analysis/doc-a.json": {
            "summary": "Provisional source-grounded summary.",
            "evidence": ["Bounded fixture evidence."],
            "candidate_terms": ["candidate term"],
        },
        "enrichment/doc-a.json": {
            "document_id": enrichment_document_id,
            "retrieval_context_sha256": "e" * 64,
            "corpus_connections": [{"document_id": "doc-b", "unit_id": "unit-b"}],
            "lexicon_proposals": [{
                "term": "Candidate vocabulary",
                "exact_quote": "Bounded fixture evidence.",
            }],
        },
        "retrieval/doc-a-qwen.json": {
            "query": {"requesting_document_id": "doc-a"},
            "selected_hits": [{
                "final_rank": 1, "document_id": "doc-b", "unit_id": "unit-b",
                "fused_score": 0.5, "text": "Retrieved fixture evidence.",
            }],
            "exclusions": [{"document_id": "doc-a", "reason": "requesting_document"}],
        },
        "source_partition_manifest.json": {
            "schema_version": "copied-pilot-source-partitions-v1.0",
            "documents": [{
                "document_id": "doc-a", "source_sha256": SOURCE_SHA,
                "source_bytes": 24, "source_characters": 24,
                "unit_count": 1, "section_count": 1,
                "reconstruction_percent": 100,
            }],
        },
        "execution_summary.json": {
            "schema_version": "copied-pilot-execution-summary-v1.0",
            "run_id": run_id, "projection_sha256": PROJECTION,
            "remote_writes": 0, "corpus_import": False, "publication": False,
            "new_call_counts": {
                "new_model_call_count": 0, "new_embedding_call_count": 0,
            },
        },
        "pilot_projection.json": {
            "schema_version": "copied-semantic-pilot-projection-v1.0",
            "payload": {}, "projection_sha256": PROJECTION,
        },
        "researcher_comparison_report.json": {
            "schema_version": "copied-pilot-researcher-comparison-v1.0",
            "compiler_comparisons": [{
                "document_id": "doc-a",
                "primary_model": "primary-fixture",
                "comparison_model": "comparison-fixture",
                "primary_claims": [{
                    "claim_id": "claim-a", "support_status": "supported",
                    "citation_unit_ids": ["unit-b"], "statement_sha256": "f" * 64,
                }],
                "comparison_claims": [], "exact_agreement_count": 0,
                "primary_only_count": 1, "comparison_only_count": 0,
                "model_truth_declaration": False,
            }],
            "comparison_provenance": {
                "doc-a": {
                    "purpose": "memory_safe_comparison_fallback",
                    "requested_model": "triage",
                    "provider_resolved_model": "fixture-local-model",
                    "fallback_reason": "bounded_fixture_fallback",
                },
            },
            "retrieval_rankings": {
                "qwen_4096": {"doc-a": [{"rank": 1, "unit_id": "unit-b"}]},
                "bge_m3_1024": {"doc-a": [{"rank": 1, "unit_id": "unit-c"}]},
            },
        },
        "model_receipts.json": {
            "schema_version": "copied-pilot-model-receipts-v1.0",
            "receipts": [{"receipt_sha256": RECEIPT_SHA}],
        },
        "route_provenance.json": {
            "schema_version": "copied-pilot-route-provenance-v1.0",
            "bindings": {"comparison": "fixture-local-model"},
            "remote_routes": 0,
        },
    }
    for relative, payload in files.items():
        _write_json(sealed / relative, payload)
    archive = root / f"{run_id}-results.tar.gz"
    manifest = build_results_archive(
        sealed_directory=sealed, archive_path=archive, source_commit="a" * 40,
    )
    manifest_path = root / f"{run_id}-results.manifest.json"
    _write_json(manifest_path, manifest)
    return archive, manifest_path


def _accepted(run_id: str, projection: str = PROJECTION) -> AcceptedCampaignEvidence:
    return AcceptedCampaignEvidence(
        run_id=run_id,
        schema_version="fixture-accepted-v1.0",
        campaign_state="succeeded",
        semantic_projection_sha256=projection,
        receipt_count=1,
        acceptance_status="accepted_fixture",
    )


def test_generic_sealed_review_verifies_documents_citations_retrieval_and_fallback(tmp_path):
    archive, manifest = build_sealed_fixture(tmp_path)
    review = verify_sealed_campaign(
        archive, manifest,
        accepted_evidence={"semantic-fixture-025": _accepted("semantic-fixture-025")},
    )
    assert review["verification_status"] == "verified_against_accepted_evidence"
    assert review["model_calls"] == review["embedding_calls"] == review["mutation_count"] == 0
    detail = sealed_document_review_model(review, "doc-a")
    assert detail["primary_claims"][0]["citation_unit_ids"] == ["unit-b"]
    assert detail["retrieval_hits"][0]["unit_id"] == "unit-b"
    assert detail["qwen_ranking"][0]["unit_id"] == "unit-b"
    assert detail["bge_ranking"][0]["unit_id"] == "unit-c"
    assert detail["comparison_provenance"]["purpose"] == "memory_safe_comparison_fallback"
    assert detail["comparison_provenance"]["fallback_reason"] == "bounded_fixture_fallback"


def test_discovery_is_filename_and_run_number_independent(tmp_path):
    archive, manifest = build_sealed_fixture(tmp_path / "arbitrary-folder", run_id="campaign-x")
    assert archive.is_file() and manifest.is_file()
    catalog = discover_sealed_campaigns((tmp_path,))
    verified = [row for row in catalog if row["status"] == "verified_sealed"]
    assert [row["run_id"] for row in verified] == ["campaign-x"]
    assert verified[0]["verification_status"] == "verified_manifest_and_members"


def test_accepted_run023_to_run025_evidence_is_discovered_by_schema_not_directory(tmp_path):
    reports = [
        {
            "schema_version": "run023-final-content-free-execution-report-v1.0",
            "content_free": True, "run_id": "semantic-ui-canary-023",
            "corrected_observer_projection": {
                "valid": True, "campaign_state": "succeeded",
                "verified_authenticated_receipt_count": 39,
            },
            "isolation": {"remote_research_writes": 0},
            "semantic_execution_counters": {"model_calls": 0, "embedding_calls": 0},
            "terminal_hashes": {"semantic_projection_sha256": "1" * 64},
            "source": {"commit": "a" * 40},
        },
        {
            "schema_version": "surviving-sogice-run024-content-free-final-report-v1.0",
            "content_free": True, "run_id": "semantic-multidocument-canary-024",
            "station_projection": {"campaign_state": "succeeded"},
            "authenticated_receipt_parity": {
                "exact_parity": True, "projection_valid": True, "verified_receipts": 80,
            },
            "terminal_projections": {"semantic_projection_sha256": "2" * 64},
            "prohibited_actions": {
                "remote_research_write": False, "corpus_import": False, "publication": False,
            },
            "source_release": {"final_commit": "b" * 40},
        },
        {
            "schema_version": "run025d-non-target-schema-migration-incident-v1.0",
            "content_free": True,
            "run025_verification": {
                "run_id": "autonomous-pilot-025", "campaign_state": "succeeded",
                "factory_projection_valid": True, "receipt_checksum_failures": 0,
                "receipt_checksums_verified": 5605,
                "semantic_projection_sha256": "3" * 64,
                "zero_work_invocation_steps": 0, "unchanged_after_zero_work": True,
            },
            "conditional_acceptance": {
                "accepted": True, "completion_marker": "COMPLETED_FIXTURE",
            },
        },
    ]
    for index, report in enumerate(reports):
        _write_json(tmp_path / "neutral" / f"evidence-report-{index}.json", report)
    evidence = discover_accepted_campaign_evidence((tmp_path,))
    assert set(evidence) == {
        "semantic-ui-canary-023", "semantic-multidocument-canary-024",
        "autonomous-pilot-025",
    }
    catalog = discover_sealed_campaigns((tmp_path,), evidence_roots=(tmp_path,))
    assert all(row["status"] == "accepted_evidence_only" for row in catalog)
    assert all(row["verification_status"] == "sealed_results_not_present_on_macbook" for row in catalog)


def test_archive_hash_projection_and_document_injection_fail_closed(tmp_path):
    archive, manifest = build_sealed_fixture(tmp_path / "valid")
    with pytest.raises(ValueError, match="accepted evidence"):
        verify_sealed_campaign(
            archive, manifest,
            accepted_evidence={"semantic-fixture-025": _accepted("semantic-fixture-025", "0" * 64)},
        )

    injected_archive, injected_manifest = build_sealed_fixture(
        tmp_path / "injected", enrichment_document_id="doc-b",
    )
    with pytest.raises(ValueError, match="Enrichment document identity"):
        verify_sealed_campaign(injected_archive, injected_manifest)

    before = archive.read_bytes()
    archive.write_bytes(before[:-1] + bytes([before[-1] ^ 1]))
    with pytest.raises(ValueError, match="archive identity"):
        verify_sealed_campaign(archive, manifest)


def test_duplicate_and_traversal_manifest_members_are_rejected_before_archive_read(tmp_path):
    archive, manifest_path = build_sealed_fixture(tmp_path)
    manifest = json.loads(manifest_path.read_text())
    manifest["members"].append(dict(manifest["members"][0]))
    _write_json(manifest_path, manifest)
    with pytest.raises(ValueError, match="duplicate members"):
        verify_sealed_campaign(archive, manifest_path)

    manifest["members"] = manifest["members"][:-1]
    manifest["members"][0]["path"] = "../outside.json"
    _write_json(manifest_path, manifest)
    with pytest.raises(ValueError, match="unsafe member path"):
        verify_sealed_campaign(archive, manifest_path)


def test_undeclared_member_campaign_injection_and_credentials_fail_closed(tmp_path):
    archive, manifest_path = build_sealed_fixture(tmp_path / "undeclared")
    manifest = json.loads(manifest_path.read_text())
    manifest["members"] = [
        row for row in manifest["members"] if row["path"] != "analysis/doc-a.json"
    ]
    _write_json(manifest_path, manifest)
    with pytest.raises(ValueError, match="undeclared member"):
        verify_sealed_campaign(archive, manifest_path)

    archive, manifest_path = build_sealed_fixture(tmp_path / "campaign-injection")
    manifest = json.loads(manifest_path.read_text())
    manifest["run_id"] = "another-campaign"
    _write_json(manifest_path, manifest)
    with pytest.raises(ValueError, match="campaign identities disagree"):
        verify_sealed_campaign(archive, manifest_path)

    root = tmp_path / "credential"
    archive, manifest_path = build_sealed_fixture(root)
    analysis_path = root / "sealed" / "analysis" / "doc-a.json"
    _write_json(analysis_path, {
        "summary": "sk-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        "evidence": [], "candidate_terms": [],
    })
    manifest = build_results_archive(
        sealed_directory=root / "sealed", archive_path=archive, source_commit="a" * 40,
    )
    _write_json(manifest_path, manifest)
    with pytest.raises(ValueError, match="credential-like material"):
        verify_sealed_campaign(archive, manifest_path)


def test_review_decisions_are_archive_bound_append_only_and_reversible(tmp_path):
    archive, manifest = build_sealed_fixture(tmp_path / "release")
    review = verify_sealed_campaign(archive, manifest)
    ledger = tmp_path / "review-ledger"
    first = append_review_disposition(
        ledger, review, subject_kind="document", subject_id="doc-a",
        action="accept_for_later_reconciliation", researcher_id="researcher",
        note="Ready for a later preview.", decided_at=datetime.now(timezone.utc),
    )
    second = append_review_disposition(
        ledger, review, subject_kind="document", subject_id="doc-a",
        action="undecided", researcher_id="researcher",
        note="Reopened.", decided_at=datetime.now(timezone.utc),
    )
    assert first["sequence"] == 1 and second["sequence"] == 2
    assert second["previous_action"] == "accept_for_later_reconciliation"
    assert len(load_review_events(ledger)) == 2
    projection = review_disposition_projection(ledger, review)
    assert projection["document:doc-a"]["action"] == "undecided"
    assert archive.is_file() and archive.read_bytes()

    first_path = sorted(ledger.iterdir())[0]
    tampered = json.loads(first_path.read_text())
    tampered["note"] = "forged"
    first_path.write_bytes(canonical_json_bytes(tampered))
    before_files = tuple(sorted(path.name for path in ledger.iterdir()))
    with pytest.raises(ValueError, match="event identity mismatch"):
        append_review_disposition(
            ledger, review, subject_kind="document", subject_id="doc-a",
            action="hold_for_follow_up", researcher_id="researcher", note="",
            decided_at=datetime.now(timezone.utc),
        )
    assert tuple(sorted(path.name for path in ledger.iterdir())) == before_files


def test_review_ledger_rejects_unexpected_directories(tmp_path):
    archive, manifest = build_sealed_fixture(tmp_path / "release")
    review = verify_sealed_campaign(archive, manifest)
    ledger = tmp_path / "review-ledger"
    append_review_disposition(
        ledger, review, subject_kind="document", subject_id="doc-a",
        action="hold_for_follow_up", researcher_id="researcher", note="",
        decided_at=datetime.now(timezone.utc),
    )
    (ledger / "unexpected").mkdir()
    with pytest.raises(ValueError, match="unexpected file"):
        load_review_events(ledger)


def test_lexicon_disposition_uses_verified_proposal_identity_without_routing(tmp_path):
    archive, manifest = build_sealed_fixture(tmp_path / "release")
    review = verify_sealed_campaign(archive, manifest)
    from runner.pipeline.factory_review_adapter import preview_returned_proposals

    proposal = preview_returned_proposals(review)[0]
    event = append_review_disposition(
        tmp_path / "ledger", review,
        subject_kind="lexicon_proposal", subject_id=proposal["proposal_id"],
        action="accept_for_later_routing", researcher_id="researcher", note="",
        decided_at=datetime.now(timezone.utc),
    )
    assert event["action"] == "accept_for_later_routing"
    assert not (tmp_path / "corpus").exists()


def _inventory(document_id: str, source_sha: str) -> SourceInventoryRow:
    return SourceInventoryRow(
        document_id=document_id, title=document_id, source_path=None,
        origin="synthetic_fixture", language="en", media_type="text/plain",
        byte_count=1, source_sha256=source_sha, source_characters=1,
        prior_analysis=False, eligible=True, hold_reason="",
    )


def test_reconciliation_is_additive_reversible_deterministic_and_zero_write(tmp_path):
    archive, manifest = build_sealed_fixture(tmp_path / "release")
    review = verify_sealed_campaign(archive, manifest)
    dispositions = {
        "document:doc-a": {"action": "accept_for_later_reconciliation"},
    }
    first = build_reconciliation_preview(
        review,
        corpus_rows=(_inventory("doc-a", SOURCE_SHA),),
        source_queue_rows=(_inventory("queue-alias", SOURCE_SHA),),
        dispositions=dispositions,
    )
    second = build_reconciliation_preview(
        review,
        corpus_rows=(_inventory("doc-a", SOURCE_SHA),),
        source_queue_rows=(_inventory("queue-alias", SOURCE_SHA),),
        dispositions=dispositions,
    )
    assert first == second
    assert first["preview_sha256"] == second["preview_sha256"]
    assert first["corpus_mutations"] == first["source_queue_mutations"] == 0
    assert first["import_authorized"] is False and first["later_authorization_required"] is True
    targets = {row["target"]: row for row in first["rows"][0]["targets"]}
    assert targets["corpus"]["action"] == "link_existing_exact_identity"
    assert targets["source_queue"]["action"] == "review_additive_alias"
    assert all(row["reversible"] and not row["overwrite"] for row in targets.values())


def test_malformed_inventory_identity_fails_without_writing(tmp_path):
    archive, manifest = build_sealed_fixture(tmp_path / "release")
    review = verify_sealed_campaign(archive, manifest)
    before = tuple(tmp_path.rglob("*"))
    with pytest.raises(ValueError, match="inventory source identity"):
        build_reconciliation_preview(
            review, corpus_rows=(_inventory("doc-a", "not-a-hash"),),
        )
    assert tuple(tmp_path.rglob("*")) == before


def test_existing_transferred_sealed_archive_is_discovered_without_legacy_configuration():
    root = Path("/Users/sergiogalvaoroxo/Documents/surviving-sogice-stuff")
    if not root.is_dir():
        pytest.skip("MacBook sealed-result evidence is unavailable")
    catalog = discover_sealed_campaigns((root,), evidence_roots=(root,))
    verified = [row for row in catalog if row["status"] == "verified_sealed"]
    assert verified
    assert all(row["review"]["model_calls"] == 0 for row in verified)
    accepted_unavailable = [row for row in catalog if row["status"] == "accepted_evidence_only"]
    assert {row["run_id"] for row in accepted_unavailable}.issuperset({
        "semantic-ui-canary-023",
        "semantic-multidocument-canary-024",
        "ai-sdlc-20260828-autonomous-multidocument-pilot-025",
    })
