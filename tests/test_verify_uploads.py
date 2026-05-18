"""Tests for C6 — verify_uploads() robustness with explicit docId field."""
from runner.pipeline.upload import _sanity_doc_id


def test_sanity_doc_id_prefers_explicit_docId():
    d = {"_id": "doc-abc123", "docId": "abc123"}
    assert _sanity_doc_id(d) == "abc123"


def test_sanity_doc_id_strips_prefix_legacy():
    d = {"_id": "doc-abc123"}  # no docId field (legacy)
    assert _sanity_doc_id(d) == "abc123"


def test_sanity_doc_id_handles_non_prefixed_id():
    d = {"_id": "raw-id-without-prefix"}
    assert _sanity_doc_id(d) == "raw-id-without-prefix"
