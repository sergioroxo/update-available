"""Tests for lexicon audit fields in _build_system_prompt_with_lexicon().

Covers lexicon_terms_available, lexicon_terms_injected, and
lexicon_injection_cap in the _audit dict. The 200-term cap applies only
to Stage 3b analysis; enrichment is a separate flow and not tested here.

No network calls. _fetch_active_lexicon_terms is monkeypatched throughout.
"""
from __future__ import annotations

from runner.pipeline import analyze
from runner.pipeline.analyze import _build_system_prompt_with_lexicon


def _terms(n: int) -> list[dict]:
    """Return n minimal lexicon term dicts."""
    return [
        {
            "term": f"term-{i:03d}",
            "proposedCluster": "Pastoral-Coercion",
            "function": "Euphemism",
        }
        for i in range(n)
    ]


# ---------------------------------------------------------------------------
# Zero-terms cases
# ---------------------------------------------------------------------------

def test_zero_on_fetch_failure(monkeypatch):
    def _fail(_):
        raise Exception("Sanity unavailable")
    monkeypatch.setattr(analyze, "_fetch_active_lexicon_terms", _fail)

    audit: dict = {}
    _build_system_prompt_with_lexicon(object(), _audit=audit)

    assert audit["lexicon_terms_available"] == 0
    assert audit["lexicon_terms_injected"] == 0
    assert audit["lexicon_injection_cap"] == 200


def test_zero_on_empty_registry(monkeypatch):
    monkeypatch.setattr(analyze, "_fetch_active_lexicon_terms", lambda _: [])

    audit: dict = {}
    _build_system_prompt_with_lexicon(object(), _audit=audit)

    assert audit["lexicon_terms_available"] == 0
    assert audit["lexicon_terms_injected"] == 0
    assert audit["lexicon_injection_cap"] == 200


# ---------------------------------------------------------------------------
# Under-cap cases
# ---------------------------------------------------------------------------

def test_injected_equals_available_when_under_cap(monkeypatch):
    monkeypatch.setattr(analyze, "_fetch_active_lexicon_terms", lambda _: _terms(50))

    audit: dict = {}
    _build_system_prompt_with_lexicon(object(), _audit=audit)

    assert audit["lexicon_terms_available"] == 50
    assert audit["lexicon_terms_injected"] == 50
    assert audit["lexicon_injection_cap"] == 200


def test_exactly_at_cap_is_not_truncated(monkeypatch):
    monkeypatch.setattr(analyze, "_fetch_active_lexicon_terms", lambda _: _terms(200))

    audit: dict = {}
    _build_system_prompt_with_lexicon(object(), _audit=audit)

    assert audit["lexicon_terms_available"] == 200
    assert audit["lexicon_terms_injected"] == 200


# ---------------------------------------------------------------------------
# Over-cap case
# ---------------------------------------------------------------------------

def test_injected_capped_at_200(monkeypatch):
    monkeypatch.setattr(analyze, "_fetch_active_lexicon_terms", lambda _: _terms(250))

    audit: dict = {}
    _build_system_prompt_with_lexicon(object(), _audit=audit)

    assert audit["lexicon_terms_available"] == 250
    assert audit["lexicon_terms_injected"] == 200
    assert audit["lexicon_injection_cap"] == 200


def test_available_records_pre_cap_count(monkeypatch):
    monkeypatch.setattr(analyze, "_fetch_active_lexicon_terms", lambda _: _terms(300))

    audit: dict = {}
    _build_system_prompt_with_lexicon(object(), _audit=audit)

    assert audit["lexicon_terms_available"] == 300
    assert audit["lexicon_terms_injected"] == 200


# ---------------------------------------------------------------------------
# Backward-compat: no _audit has no side effects
# ---------------------------------------------------------------------------

def test_no_audit_returns_string_unchanged(monkeypatch):
    monkeypatch.setattr(analyze, "_fetch_active_lexicon_terms", lambda _: _terms(5))

    result = _build_system_prompt_with_lexicon(object())
    assert isinstance(result, str)
    assert len(result) > 0


def test_no_audit_split_for_claude_returns_tuple(monkeypatch):
    monkeypatch.setattr(analyze, "_fetch_active_lexicon_terms", lambda _: _terms(5))

    result = _build_system_prompt_with_lexicon(object(), split_for_claude=True)
    assert isinstance(result, tuple)
    assert len(result) == 2


# ---------------------------------------------------------------------------
# split_for_claude=True with _audit
# ---------------------------------------------------------------------------

def test_split_for_claude_also_populates_audit(monkeypatch):
    monkeypatch.setattr(analyze, "_fetch_active_lexicon_terms", lambda _: _terms(10))

    audit: dict = {}
    result = _build_system_prompt_with_lexicon(object(), split_for_claude=True, _audit=audit)

    assert isinstance(result, tuple)
    assert audit["lexicon_terms_injected"] == 10
    assert audit["lexicon_terms_available"] == 10


def test_split_for_claude_zero_terms_audit(monkeypatch):
    monkeypatch.setattr(analyze, "_fetch_active_lexicon_terms", lambda _: [])

    audit: dict = {}
    result = _build_system_prompt_with_lexicon(object(), split_for_claude=True, _audit=audit)

    assert isinstance(result, tuple) and len(result) == 2
    assert audit["lexicon_terms_injected"] == 0
