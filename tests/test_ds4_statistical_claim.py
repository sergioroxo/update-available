"""DS-4: verification_status on StatisticalClaim.

Covers:
  - Field default (unverified)
  - All five valid status values preserved through model validation
  - Field appears in model_dump / enrichment.json round-trip
  - Null / missing value falls back to "unverified" (no error)
  - Normalizer (_normalize_enrichment_payload) coerces unknown status
    strings to "unverified" and preserves valid ones
  - Idempotency: re-validating serialized output produces identical status
"""
from __future__ import annotations

import json

import pytest

from runner.models.enrichment import StatisticalClaim, EnrichmentResult
from runner.pipeline.enrich import _normalize_enrichment_payload


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _minimal_claim(**kwargs) -> dict:
    base = {"claim": "60% of participants reported improvement."}
    base.update(kwargs)
    return base


def _enrichment_payload_with_claim(**claim_kwargs) -> dict:
    return {
        "lexicon_proposals": [],
        "entity_proposals": [],
        "tactic_proposals": [],
        "ingestion_queue": [],
        "corpus_connections": [],
        "practice_descriptions": [],
        "statistical_claims": [_minimal_claim(**claim_kwargs)],
    }


# ---------------------------------------------------------------------------
# Model field tests
# ---------------------------------------------------------------------------

def test_statistical_claim_defaults_verification_status_to_unverified():
    claim = StatisticalClaim.model_validate(_minimal_claim())
    assert claim.verification_status == "unverified"


def test_statistical_claim_all_valid_statuses_accepted():
    valid = ["unverified", "verified", "disputed", "debunked", "unverifiable"]
    for status in valid:
        claim = StatisticalClaim.model_validate(_minimal_claim(verification_status=status))
        assert claim.verification_status == status, f"Expected {status!r}, got {claim.verification_status!r}"


def test_statistical_claim_verification_status_in_model_dump():
    """verification_status must appear in model_dump_json so enrichment.json contains it."""
    claim = StatisticalClaim.model_validate(_minimal_claim(verification_status="verified"))
    dumped = json.loads(claim.model_dump_json())
    assert dumped["verification_status"] == "verified"


def test_statistical_claim_null_verification_status_falls_back():
    """A null value from an LLM that sets the field to None should not raise."""
    # Pydantic will reject null for a Literal field — but the normalizer handles
    # null before the model sees it. Here we test the model's own default path
    # (omitted key → default "unverified").
    claim = StatisticalClaim.model_validate(_minimal_claim())
    assert claim.verification_status == "unverified"


def test_statistical_claim_verification_status_idempotent():
    """Re-validating a serialized claim produces identical status without mutation."""
    claim1 = StatisticalClaim.model_validate(_minimal_claim(verification_status="disputed"))
    claim2 = StatisticalClaim.model_validate(json.loads(claim1.model_dump_json()))
    assert claim2.verification_status == claim1.verification_status == "disputed"


# ---------------------------------------------------------------------------
# Normalizer tests
# ---------------------------------------------------------------------------

def test_normalizer_preserves_valid_verification_status():
    """Known status strings survive _normalize_enrichment_payload unchanged."""
    for status in ("verified", "disputed", "debunked", "unverifiable"):
        payload = _enrichment_payload_with_claim(verification_status=status)
        normalized, _ = _normalize_enrichment_payload(payload)
        result = normalized["statistical_claims"][0]["verification_status"]
        assert result == status, f"Expected {status!r}, got {result!r}"


def test_normalizer_unknown_status_coerces_to_unverified():
    """An unrecognised status value is coerced to 'unverified' by _renum, incrementing repair count."""
    payload = _enrichment_payload_with_claim(verification_status="fact_checked")
    normalized, repair_count = _normalize_enrichment_payload(payload)
    assert normalized["statistical_claims"][0]["verification_status"] == "unverified"
    assert repair_count >= 1


def test_normalizer_missing_status_defaults_to_unverified():
    """A claim dict without a verification_status key gets 'unverified'."""
    payload = _enrichment_payload_with_claim()  # no verification_status key
    normalized, _ = _normalize_enrichment_payload(payload)
    assert normalized["statistical_claims"][0]["verification_status"] == "unverified"


def test_normalizer_null_status_defaults_to_unverified():
    """A null verification_status from an LLM is repaired before Pydantic validation."""
    payload = _enrichment_payload_with_claim(verification_status=None)
    normalized, repair_count = _normalize_enrichment_payload(payload)
    assert normalized["statistical_claims"][0]["verification_status"] == "unverified"
    assert repair_count == 0


def test_enrichment_result_round_trip_preserves_verification_status():
    """Full EnrichmentResult serialization/deserialization preserves the field."""
    result = EnrichmentResult.model_validate({
        "doc_id": "doc-test",
        "statistical_claims": [_minimal_claim(verification_status="debunked")],
    })
    serialized = json.loads(result.model_dump_json())
    reloaded = EnrichmentResult.model_validate(serialized)
    assert reloaded.statistical_claims[0].verification_status == "debunked"
