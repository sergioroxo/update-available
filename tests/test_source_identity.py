from __future__ import annotations

import json
from pathlib import Path

import pytest

from runner.pipeline import source_identity as source_identity_module
from runner.pipeline.source_identity import (
    build_identity_snapshot,
    collect_document_identity,
    load_latest_identity_snapshot,
    normalize_doi,
    validate_identity_snapshot,
    write_identity_snapshot,
)
from runner.pipeline.workflow_integrity import canonical_fingerprint
from runner.source_identity_ui import identity_table_rows, relationship_table_rows


def _write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _doc(
    corpus: Path,
    doc_id: str,
    *,
    url: str = "",
    doi: str = "",
    title: str = "Title",
    author: str = "Author",
    date: str = "2020",
    sha256: str = "",
    language: str = "en",
) -> Path:
    root = corpus / doc_id
    root.mkdir(parents=True)
    _write(root / "intake.json", {
        "doc_id": doc_id,
        "source": url or f"/local/{doc_id}.pdf",
        "source_type": "url" if url else "file",
        "source_url": url,
        "original_filename": f"{doc_id}.pdf",
        "language": language,
    })
    _write(root / "preprocess.json", {
        "doc_id": doc_id,
        "title": title,
        "author": author,
        "date_published": date,
        "language_detected": language,
        "sitename": "Publication",
        "page_intel": {"canonical_url": url},
    })
    _write(root / "bibliographic.json", {
        "titles": {"main": {"value": title, "confidence": 0.9}},
        "creators": [{"name": author}],
        "publication": {
            "publisher": {"value": "Publication", "confidence": 0.9},
            "issued": {"raw": date, "confidence": 0.9},
        },
        "identifiers": {"doi": doi},
        "urls": {"canonical_url": url},
        "language": language,
    })
    if sha256:
        _write(root / "longform_source.json", {
            "source_artifacts": [{
                "role": "source", "filename": f"{doc_id}.pdf", "sha256": sha256,
            }],
        })
    return root


@pytest.mark.parametrize("raw", [
    "10.1234/ABC.DEF",
    "doi:10.1234/ABC.DEF",
    "https://doi.org/10.1234/ABC.DEF",
    "https://doi.org/10.1234%2FABC.DEF).",
])
def test_doi_normalization(raw):
    assert normalize_doi(raw) == "10.1234/abc.def"


def test_projection_preserves_observed_url_and_normalizes_for_resolution(tmp_path):
    root = _doc(tmp_path, "a", url="HTTPS://Example.Org/report/#section")
    identity = collect_document_identity(root)
    field = identity["fields"]["canonical_url"]
    assert field["resolved_value"] == "HTTPS://Example.Org/report/#section"
    assert field["candidates"][0]["normalized_value"] == "https://example.org/report"


def test_exact_bytes_suggest_mirror_without_merging(tmp_path):
    digest = "a" * 64
    _doc(tmp_path, "a", url="https://one.example/report", sha256=digest)
    _doc(tmp_path, "b", url="https://two.example/report", sha256=digest)
    snapshot = build_identity_snapshot(tmp_path)

    relation = snapshot["relationship_suggestions"][0]
    assert relation["relationship"] == "mirror_of"
    assert relation["confidence"] == 1.0
    assert relation["matching_bases"][0]["field"] == "source_artifact_sha256"
    assert relation["matching_bases"][0]["representation"] == "source_artifact"
    assert relation["status"] == "pending"
    assert relation["affects_family_counts"] is False
    assert snapshot["automatic_merges"] is False
    assert snapshot["count_summary"]["source_family_count"] is None


def test_same_doi_different_bytes_suggests_version(tmp_path):
    _doc(tmp_path, "a", doi="doi:10.1000/X", sha256="a" * 64)
    _doc(tmp_path, "b", doi="https://doi.org/10.1000/x", sha256="b" * 64)
    snapshot = build_identity_snapshot(tmp_path)
    assert snapshot["relationship_suggestions"][0]["relationship"] == "version_of"
    assert snapshot["relationship_suggestions"][0]["matching_bases"][0]["field"] == "doi"


def test_conflicting_metadata_remains_visible(tmp_path):
    root = _doc(tmp_path, "a", title="Bibliographic Title")
    prep = json.loads((root / "preprocess.json").read_text())
    prep["title"] = "Different HTML Title"
    _write(root / "preprocess.json", prep)
    identity = collect_document_identity(root)
    assert identity["fields"]["title"]["resolution_state"] == "conflicted"
    assert len(identity["fields"]["title"]["candidates"]) == 2


def test_missing_metadata_is_valid_and_unresolved(tmp_path):
    root = tmp_path / "a"
    root.mkdir()
    _write(root / "intake.json", {"doc_id": "a", "source_type": "file", "source": "/local/a"})
    identity = collect_document_identity(root)
    assert identity["fields"]["doi"]["resolution_state"] == "missing"
    snapshot = build_identity_snapshot(tmp_path)
    validate_identity_snapshot(snapshot)


def test_projection_reuses_sidecar_hash_without_opening_source_file(tmp_path):
    root = _doc(tmp_path, "a", sha256="c" * 64)
    source = root / "source.pdf"
    source.symlink_to(tmp_path / "missing-cloud-placeholder.pdf")
    identity = collect_document_identity(root)
    assert identity["fields"]["source_artifact_sha256"]["resolved_value"] == "c" * 64


def test_pdf_and_html_hashes_are_representation_specific(tmp_path):
    left = _doc(tmp_path, "a", sha256="a" * 64)
    right = _doc(tmp_path, "b", sha256="b" * 64)
    for root in (left, right):
        prep = json.loads((root / "preprocess.json").read_text())
        prep["source_html_sha256"] = "c" * 64
        _write(root / "preprocess.json", prep)
    snapshot = build_identity_snapshot(tmp_path)
    relation = snapshot["relationship_suggestions"][0]
    assert relation["matching_bases"][0]["field"] == "source_html_sha256"
    assert relation["matching_bases"][0]["representation"] == "source_html"


def test_conflicted_winner_never_generates_relationship(tmp_path):
    left = _doc(tmp_path, "a", doi="10.1000/shared", title="One")
    _doc(tmp_path, "b", doi="10.1000/shared", title="Two")
    biblio = json.loads((left / "bibliographic.json").read_text())
    biblio["urls"] = {"canonical_url": "https://doi.org/10.1000/different"}
    _write(left / "bibliographic.json", biblio)
    snapshot = build_identity_snapshot(tmp_path)
    assert snapshot["documents"][0]["fields"]["doi"]["resolution_state"] == "conflicted"
    assert snapshot["relationship_suggestions"] == []


def test_machine_bibliographic_metadata_is_not_labelled_reviewed(tmp_path):
    root = _doc(tmp_path, "a")
    identity = collect_document_identity(root)
    candidate = next(
        row for row in identity["fields"]["title"]["candidates"]
        if row["source_file"] == "bibliographic.json"
    )
    assert candidate["source_kind"] == "machine_extracted"
    assert candidate["priority"] < 80


def test_non_web_canonical_urls_are_rejected(tmp_path):
    root = _doc(tmp_path, "a", url="file:///private/archive.pdf")
    identity = collect_document_identity(root)
    assert identity["fields"]["canonical_url"]["resolution_state"] == "missing"


def test_snapshot_tampering_fails_closed_and_write_is_content_addressed(tmp_path):
    _doc(tmp_path / "corpus", "a")
    snapshot = build_identity_snapshot(tmp_path / "corpus")
    path = write_identity_snapshot(snapshot, tmp_path / "exports")
    assert snapshot["snapshot_fingerprint"] in path.name
    assert (path.parent / "latest_source_identity.json").exists()

    snapshot["documents"][0]["doc_id"] = "tampered"
    with pytest.raises(ValueError, match="fingerprint"):
        validate_identity_snapshot(snapshot)


def test_recomputed_outer_fingerprint_cannot_hide_derived_tampering(tmp_path):
    _doc(tmp_path, "a", sha256="e" * 64)
    _doc(tmp_path, "b", sha256="e" * 64)
    snapshot = build_identity_snapshot(tmp_path)
    snapshot["relationship_suggestions"] = []
    snapshot["snapshot_fingerprint"] = canonical_fingerprint({
        key: value for key, value in snapshot.items()
        if key not in {"generated_at", "snapshot_fingerprint"}
    })
    with pytest.raises(ValueError, match="relationships are not reproducible"):
        validate_identity_snapshot(snapshot)


def test_snapshot_write_rejects_symlinked_output(tmp_path):
    corpus = tmp_path / "corpus"
    _doc(corpus, "a")
    snapshot = build_identity_snapshot(corpus)
    actual = tmp_path / "actual"
    actual.mkdir()
    exports = tmp_path / "exports"
    exports.symlink_to(actual, target_is_directory=True)
    with pytest.raises(ValueError, match="symlink"):
        write_identity_snapshot(snapshot, exports)


def test_snapshot_larger_than_sidecar_limit_remains_replayable(tmp_path):
    """Full-corpus identity snapshots need a larger bound than one input sidecar."""
    corpus = tmp_path / "corpus"
    _doc(corpus, "a")
    snapshot = build_identity_snapshot(corpus)
    document = snapshot["documents"][0]
    base = document["fields"]["title"]["candidates"][0]
    candidates = []
    for index in range(2_300):
        value = f"{index:04d} " + ("bounded identity candidate " * 180)
        candidates.append({
            **base,
            "value": value,
            "normalized_value": source_identity_module._norm_text(value),
            "json_pointer": f"/synthetic/{index}",
        })
    document["fields"]["title"] = source_identity_module._resolve(candidates)
    document["input_fingerprint"] = canonical_fingerprint({
        "doc_id": document["doc_id"], "fields": document["fields"],
    })
    snapshot["snapshot_fingerprint"] = canonical_fingerprint({
        key: value for key, value in snapshot.items()
        if key not in {"generated_at", "snapshot_fingerprint"}
    })
    assert len(json.dumps(snapshot).encode("utf-8")) > source_identity_module.MAX_JSON_BYTES

    write_identity_snapshot(snapshot, tmp_path / "exports")
    assert load_latest_identity_snapshot(tmp_path / "exports") == snapshot


def test_ui_language_never_claims_independent_attestations(tmp_path):
    _doc(tmp_path, "a", sha256="d" * 64)
    _doc(tmp_path, "b", sha256="d" * 64)
    snapshot = build_identity_snapshot(tmp_path)
    encoded = json.dumps({
        "documents": identity_table_rows(snapshot),
        "relations": relationship_table_rows(snapshot),
    }).casefold()
    assert "independent attestation" not in encoded
    assert all(row["Changes family counts"] == "no" for row in relationship_table_rows(snapshot))
