"""Offload lifecycle move + result-package import tests.

All local-only: no network, no Sanity/Supabase, no LLM, no source_queue.db.
Covers the transition graph, read-only result verification, and the
validate-all-before-copy import (allowed artifacts, schema checks, path-traversal
protection, hashes, backups, provenance, and all-or-nothing failure).
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from runner import main
from runner.pipeline.offload import (
    ALLOWED_TRANSITIONS,
    build_analysis_package,
    import_result_package,
    lifecycle_consistency,
    load_manifest,
    move_package_state,
    transition_package_state,
    validate_state_transition,
    verify_package,
    verify_result_package,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _make_corpus_doc(corpus_dir: Path, doc_id: str = "abc123") -> Path:
    doc_dir = corpus_dir / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    _write_json(doc_dir / "intake.json", {"doc_id": doc_id, "source": "https://example.org/d", "source_type": "url"})
    _write_json(doc_dir / "preprocess.json", {"doc_id": doc_id, "quality": "high", "tool_used": "trafilatura", "ocr_images": []})
    (doc_dir / "extracted.txt").write_text("Extracted source text", encoding="utf-8")
    return doc_dir


def _build_inbox_package(tmp_path: Path, doc_id: str = "abc123", package_id: str = "pkg-1") -> Path:
    corpus_dir = tmp_path / "corpus"
    _make_corpus_doc(corpus_dir, doc_id)
    build_analysis_package(
        corpus_dir=corpus_dir,
        doc_ids=[doc_id],
        offload_root=tmp_path / "offload",
        package_id=package_id,
    )
    return tmp_path / "offload" / "inbox" / package_id


def _valid_analysis(doc_id: str) -> str:
    return json.dumps({
        "type": "Anti-SOGICE", "format": "Blog-Post", "evidence": ["e"],
        "scope": "Core", "narrative_register": "Legal-Policy", "summary": "s",
    })


def _valid_enrichment(doc_id: str) -> str:
    return json.dumps({"doc_id": doc_id})


def _valid_embedding(doc_id: str) -> str:
    return json.dumps({"doc_id": doc_id, "model": "qwen3-embedding:8b", "dimension": 3, "vector": [0.1, 0.2, 0.3]})


def _default_outputs(doc_id: str) -> dict[str, str]:
    return {
        "analysis.json": _valid_analysis(doc_id),
        "enrichment.json": _valid_enrichment(doc_id),
        "embedding.json": _valid_embedding(doc_id),
    }


def _write_result_package(
    package_dir: Path,
    *,
    package_id: str,
    doc_id: str,
    outputs: dict[str, str],
    kind: str = "analysis_result",
    package_id_in_manifest: str | None = None,
) -> None:
    """Write docs/<doc_id>/<label> output files + a correct result_manifest.json."""
    docs_dir = package_dir / "docs" / doc_id
    docs_dir.mkdir(parents=True, exist_ok=True)
    records = []
    for label, content in outputs.items():
        p = docs_dir / label
        p.write_text(content, encoding="utf-8")
        raw = p.read_bytes()
        records.append({
            "label": label,
            "relative_path": f"docs/{doc_id}/{label}",
            "sha256": _sha(raw),
            "bytes": len(raw),
        })
    manifest = {
        "schema_version": 1,
        "package_id": package_id_in_manifest or package_id,
        "package_kind": kind,
        "produced_at": "2026-06-06T00:00:00+00:00",
        "documents": [{"doc_id": doc_id, "artifacts": records}],
    }
    _write_json(package_dir / "result_manifest.json", manifest)


def _setup_outbox_result(tmp_path: Path, doc_id: str = "abc123", outputs: dict[str, str] | None = None) -> tuple[Path, Path]:
    """Return (corpus_dir, outbox_package_dir) ready for import."""
    _build_inbox_package(tmp_path, doc_id, "pkg-1")
    pkg = move_package_state(  # permissive primitive used only for test setup
        offload_root=tmp_path / "offload", package_id="pkg-1", from_state="inbox", to_state="outbox"
    )
    _write_result_package(pkg, package_id="pkg-1", doc_id=doc_id, outputs=outputs or _default_outputs(doc_id))
    return tmp_path / "corpus", pkg


def _corpus_has_outputs(corpus_dir: Path, doc_id: str) -> bool:
    d = corpus_dir / doc_id
    return any((d / name).exists() for name in ("analysis.json", "enrichment.json", "embedding.json", "offload_import.json"))


def _setup_two_doc_partial_outbox(tmp_path: Path) -> tuple[Path, Path]:
    """Two-doc offload package in outbox whose result_manifest covers only 'doca'."""
    corpus_dir = tmp_path / "corpus"
    _make_corpus_doc(corpus_dir, "doca")
    _make_corpus_doc(corpus_dir, "docb")
    build_analysis_package(
        corpus_dir=corpus_dir, doc_ids=["doca", "docb"],
        offload_root=tmp_path / "offload", package_id="pkg-cov",
    )
    pkg = move_package_state(offload_root=tmp_path / "offload", package_id="pkg-cov", from_state="inbox", to_state="outbox")
    docs_dir = pkg / "docs" / "doca"
    (docs_dir / "analysis.json").write_text(_valid_analysis("doca"), encoding="utf-8")
    raw = (docs_dir / "analysis.json").read_bytes()
    _write_json(pkg / "result_manifest.json", {
        "schema_version": 1, "package_id": "pkg-cov", "package_kind": "analysis_result",
        "documents": [{"doc_id": "doca", "artifacts": [
            {"label": "analysis.json", "relative_path": "docs/doca/analysis.json", "sha256": _sha(raw), "bytes": len(raw)}
        ]}],
    })
    return corpus_dir, pkg


# ---------------------------------------------------------------------------
# Transition validation (pure)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("frm,to", [
    ("inbox", "processing"), ("processing", "outbox"), ("outbox", "imported"),
    ("imported", "archive"), ("failed", "inbox"), ("processing", "inbox"),
    ("inbox", "failed"), ("outbox", "archive"),
])
def test_validate_state_transition_allows(frm, to):
    validate_state_transition(frm, to)  # must not raise


@pytest.mark.parametrize("frm,to", [
    ("inbox", "imported"), ("inbox", "outbox"), ("outbox", "processing"),
    ("archive", "inbox"), ("imported", "processing"), ("inbox", "inbox"),
    ("gone", "inbox"), ("inbox", "nowhere"),
])
def test_validate_state_transition_rejects(frm, to):
    with pytest.raises(ValueError):
        validate_state_transition(frm, to)


def test_transition_graph_has_all_states():
    from runner.pipeline.offload import LIFECYCLE_STATES
    assert set(ALLOWED_TRANSITIONS) == set(LIFECYCLE_STATES)


# ---------------------------------------------------------------------------
# transition_package_state
# ---------------------------------------------------------------------------

def test_transition_valid_move_updates_folder_and_manifest(tmp_path):
    _build_inbox_package(tmp_path)
    new_path = transition_package_state(
        offload_root=tmp_path / "offload", package_id="pkg-1",
        from_state="inbox", to_state="processing",
    )
    assert new_path == tmp_path / "offload" / "processing" / "pkg-1"
    assert not (tmp_path / "offload" / "inbox" / "pkg-1").exists()
    assert load_manifest(new_path).lifecycle_state == "processing"
    # Artifacts + hashes preserved.
    assert verify_package(new_path)["ok"] is True


def test_transition_invalid_does_not_move(tmp_path):
    _build_inbox_package(tmp_path)
    with pytest.raises(ValueError, match="Invalid lifecycle transition"):
        transition_package_state(
            offload_root=tmp_path / "offload", package_id="pkg-1",
            from_state="inbox", to_state="imported",
        )
    assert (tmp_path / "offload" / "inbox" / "pkg-1").exists()
    assert not (tmp_path / "offload" / "imported" / "pkg-1").exists()


def test_transition_refuses_tampered_forward_move(tmp_path):
    pkg = _build_inbox_package(tmp_path)
    (pkg / "docs" / "abc123" / "extracted.txt").write_text("TAMPERED", encoding="utf-8")
    with pytest.raises(ValueError, match="failed verification"):
        transition_package_state(
            offload_root=tmp_path / "offload", package_id="pkg-1",
            from_state="inbox", to_state="processing",
        )
    assert (tmp_path / "offload" / "inbox" / "pkg-1").exists()  # not moved


def test_transition_to_failed_allows_tampered_package(tmp_path):
    pkg = _build_inbox_package(tmp_path)
    (pkg / "docs" / "abc123" / "extracted.txt").write_text("TAMPERED", encoding="utf-8")
    new_path = transition_package_state(
        offload_root=tmp_path / "offload", package_id="pkg-1",
        from_state="inbox", to_state="failed",
    )
    assert new_path == tmp_path / "offload" / "failed" / "pkg-1"
    assert load_manifest(new_path).lifecycle_state == "failed"


def test_transition_refuses_on_lifecycle_mismatch(tmp_path):
    # Simulate an interrupted move: folder=processing but manifest still says inbox.
    pkg = _build_inbox_package(tmp_path)
    moved = tmp_path / "offload" / "processing" / "pkg-1"
    moved.parent.mkdir(parents=True, exist_ok=True)
    pkg.rename(moved)
    assert lifecycle_consistency(moved)["consistent"] is False
    with pytest.raises(ValueError, match="failed verification"):
        transition_package_state(
            offload_root=tmp_path / "offload", package_id="pkg-1",
            from_state="processing", to_state="outbox",
        )


# ---------------------------------------------------------------------------
# verify_result_package (read-only)
# ---------------------------------------------------------------------------

def test_verify_result_package_ok_on_clean_outbox(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    report = verify_result_package(pkg, corpus_dir=corpus_dir)
    assert report["ok"] is True
    assert report["errors"] == []
    labels = {a["label"] for a in report["documents"][0]["artifacts"]}
    assert labels == {"analysis.json", "enrichment.json", "embedding.json"}


def test_verify_result_package_requires_outbox(tmp_path):
    # Write a result manifest into an inbox package (not outbox).
    pkg = _build_inbox_package(tmp_path)
    _write_result_package(pkg, package_id="pkg-1", doc_id="abc123", outputs=_default_outputs("abc123"))
    report = verify_result_package(pkg, corpus_dir=tmp_path / "corpus")
    assert report["ok"] is False
    assert any(e.startswith("not_in_outbox") for e in report["errors"])


# ---------------------------------------------------------------------------
# import_result_package — happy path, dry run, provenance, backups
# ---------------------------------------------------------------------------

def test_import_happy_path_writes_outputs_and_provenance(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    summary = import_result_package(pkg, corpus_dir=corpus_dir)

    assert summary["ok"] is True and summary["imported"] is True
    doc_dir = corpus_dir / "abc123"
    assert (doc_dir / "analysis.json").exists()
    assert (doc_dir / "enrichment.json").exists()
    assert (doc_dir / "embedding.json").exists()
    prov = json.loads((doc_dir / "offload_import.json").read_text(encoding="utf-8"))
    assert prov["package_id"] == "pkg-1"
    assert prov["package_kind"] == "analysis_result"
    assert prov["source_lifecycle_state"] == "outbox"
    assert {a["label"] for a in prov["imported_artifacts"]} == {"analysis.json", "enrichment.json", "embedding.json"}
    assert all(a["sha256"] for a in prov["imported_artifacts"])


def test_import_dry_run_writes_nothing(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    summary = import_result_package(pkg, corpus_dir=corpus_dir, dry_run=True)
    assert summary["ok"] is True
    assert summary["imported"] is False
    assert summary["documents"][0]["would_write"]
    assert not _corpus_has_outputs(corpus_dir, "abc123")


def test_import_backup_before_overwrite(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    # Existing reviewed analysis.json in the corpus.
    (corpus_dir / "abc123" / "analysis.json").write_text('{"old": true}', encoding="utf-8")

    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["imported"] is True

    backups = list((corpus_dir / "abc123").glob("analysis.json.preimport-*"))
    assert len(backups) == 1
    assert json.loads(backups[0].read_text(encoding="utf-8")) == {"old": True}
    # New content is in place.
    assert json.loads((corpus_dir / "abc123" / "analysis.json").read_text(encoding="utf-8"))["type"] == "Anti-SOGICE"
    doc_summary = summary["documents"][0]
    assert "analysis.json" in doc_summary["backups"]


# ---------------------------------------------------------------------------
# import_result_package — refusals (corpus must stay untouched)
# ---------------------------------------------------------------------------

def test_import_refuses_tampered_hash(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    # Corrupt an artifact after the manifest hash was recorded.
    (pkg / "docs" / "abc123" / "analysis.json").write_text('{"type":"changed"}', encoding="utf-8")
    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    assert any(e.startswith("hash_mismatch") for e in summary["errors"])
    assert not _corpus_has_outputs(corpus_dir, "abc123")


def test_import_refuses_missing_artifact(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    (pkg / "docs" / "abc123" / "embedding.json").unlink()
    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    assert any(e.startswith("missing_artifact") for e in summary["errors"])
    assert not _corpus_has_outputs(corpus_dir, "abc123")


def test_import_refuses_unknown_doc_id(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    # Result manifest references a doc not in the offload manifest.
    _write_json(pkg / "result_manifest.json", {
        "schema_version": 1, "package_id": "pkg-1", "package_kind": "analysis_result",
        "documents": [{"doc_id": "ghost", "artifacts": [
            {"label": "analysis.json", "relative_path": "docs/ghost/analysis.json", "sha256": "x", "bytes": 1}
        ]}],
    })
    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    assert any(e == "unknown_doc_id:ghost" for e in summary["errors"])
    assert not _corpus_has_outputs(corpus_dir, "ghost")


def test_import_refuses_doc_not_in_corpus(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    # Remove the corpus doc dir so there is nothing to import into.
    import shutil
    shutil.rmtree(corpus_dir / "abc123")
    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    assert any(e == "doc_not_in_corpus:abc123" for e in summary["errors"])


def test_import_refuses_disallowed_artifact(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    docs = pkg / "docs" / "abc123"
    (docs / "secret.json").write_text("{}", encoding="utf-8")
    raw = (docs / "secret.json").read_bytes()
    _write_json(pkg / "result_manifest.json", {
        "schema_version": 1, "package_id": "pkg-1", "package_kind": "analysis_result",
        "documents": [{"doc_id": "abc123", "artifacts": [
            {"label": "secret.json", "relative_path": "docs/abc123/secret.json", "sha256": _sha(raw), "bytes": len(raw)}
        ]}],
    })
    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    assert any(e.startswith("disallowed_artifact") for e in summary["errors"])
    assert not (corpus_dir / "abc123" / "secret.json").exists()


def test_import_refuses_path_traversal(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    _write_json(pkg / "result_manifest.json", {
        "schema_version": 1, "package_id": "pkg-1", "package_kind": "analysis_result",
        "documents": [{"doc_id": "abc123", "artifacts": [
            {"label": "analysis.json", "relative_path": "../../../../etc/passwd", "sha256": "x", "bytes": 1}
        ]}],
    })
    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    assert any("Unsafe manifest path" in e for e in summary["errors"])
    assert not _corpus_has_outputs(corpus_dir, "abc123")


def test_import_refuses_unexpected_artifact_path(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    # Safe relative path, but not the canonical docs/<doc_id>/<label> location.
    raw = (pkg / "docs" / "abc123" / "analysis.json").read_bytes()
    _write_json(pkg / "result_manifest.json", {
        "schema_version": 1, "package_id": "pkg-1", "package_kind": "analysis_result",
        "documents": [{"doc_id": "abc123", "artifacts": [
            {"label": "analysis.json", "relative_path": "docs/other/analysis.json", "sha256": _sha(raw), "bytes": len(raw)}
        ]}],
    })
    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    assert any(e.startswith("unexpected_artifact_path") for e in summary["errors"])


def test_import_refuses_schema_invalid_analysis(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(
        tmp_path, outputs={"analysis.json": json.dumps({"not_a_valid": "analysis"})}
    )
    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    assert any(e.startswith("schema_invalid:analysis.json") for e in summary["errors"])
    assert not _corpus_has_outputs(corpus_dir, "abc123")


def test_import_refuses_schema_invalid_embedding(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(
        tmp_path,
        outputs={"embedding.json": json.dumps({"model": "m", "dimension": 9, "vector": [0.1]})},
    )
    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    assert any(e.startswith("schema_invalid:embedding.json") for e in summary["errors"])


def test_import_all_or_nothing_across_documents(tmp_path):
    # Two docs; doc B's artifact is tampered. Nothing must be written for either.
    corpus_dir = tmp_path / "corpus"
    _make_corpus_doc(corpus_dir, "doca")
    _make_corpus_doc(corpus_dir, "docb")
    build_analysis_package(
        corpus_dir=corpus_dir, doc_ids=["doca", "docb"],
        offload_root=tmp_path / "offload", package_id="pkg-2",
    )
    pkg = move_package_state(offload_root=tmp_path / "offload", package_id="pkg-2", from_state="inbox", to_state="outbox")

    # Build a correct two-doc result manifest, then tamper docb's file.
    records = []
    for doc_id in ("doca", "docb"):
        docs_dir = pkg / "docs" / doc_id
        docs_dir.mkdir(parents=True, exist_ok=True)
        content = _valid_analysis(doc_id)
        (docs_dir / "analysis.json").write_text(content, encoding="utf-8")
        raw = (docs_dir / "analysis.json").read_bytes()
        records.append({"doc_id": doc_id, "artifacts": [
            {"label": "analysis.json", "relative_path": f"docs/{doc_id}/analysis.json", "sha256": _sha(raw), "bytes": len(raw)}
        ]})
    _write_json(pkg / "result_manifest.json", {
        "schema_version": 1, "package_id": "pkg-2", "package_kind": "analysis_result", "documents": records,
    })
    # Tamper docb after the manifest was written.
    (pkg / "docs" / "docb" / "analysis.json").write_text('{"type":"changed"}', encoding="utf-8")

    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    # Neither doc was written — strict validate-all-before-copy.
    assert not _corpus_has_outputs(corpus_dir, "doca")
    assert not _corpus_has_outputs(corpus_dir, "docb")


# ---------------------------------------------------------------------------
# Safety hardening: rollback, preflight destination, full contract, extra files
# ---------------------------------------------------------------------------

def test_import_rolls_back_on_write_failure(monkeypatch, tmp_path):
    """A normal exception mid-write must restore/leave the corpus untouched."""
    import runner.pipeline.offload as offmod

    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    original = '{"old": "reviewed analysis"}'
    (corpus_dir / "abc123" / "analysis.json").write_text(original, encoding="utf-8")

    real_write = offmod.atomic_write_bytes
    calls = {"n": 0}

    def flaky_write(path, data):
        calls["n"] += 1
        if calls["n"] >= 2:  # fail after at least one artifact was written
            raise OSError("simulated disk failure")
        return real_write(path, data)

    monkeypatch.setattr(offmod, "atomic_write_bytes", flaky_write)

    summary = offmod.import_result_package(pkg, corpus_dir=corpus_dir)

    assert summary["ok"] is False
    assert summary["imported"] is False
    assert any(e.startswith("write_failed_rolled_back") for e in summary["errors"])
    # Pre-existing file restored to original; new files removed; no leftovers.
    assert (corpus_dir / "abc123" / "analysis.json").read_text(encoding="utf-8") == original
    assert not (corpus_dir / "abc123" / "enrichment.json").exists()
    assert not (corpus_dir / "abc123" / "embedding.json").exists()
    assert not (corpus_dir / "abc123" / "offload_import.json").exists()
    assert list((corpus_dir / "abc123").glob("*.preimport-*")) == []


def test_import_refuses_when_imported_destination_exists(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    (tmp_path / "offload" / "imported" / "pkg-1").mkdir(parents=True)

    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    assert any(e.startswith("imported_destination_exists") for e in summary["errors"])
    assert not _corpus_has_outputs(corpus_dir, "abc123")


def test_import_refuses_wrong_schema_version(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    rm = json.loads((pkg / "result_manifest.json").read_text(encoding="utf-8"))
    rm["schema_version"] = 99
    _write_json(pkg / "result_manifest.json", rm)

    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    assert any(e.startswith("unexpected_result_schema_version") for e in summary["errors"])
    assert not _corpus_has_outputs(corpus_dir, "abc123")


def test_import_refuses_missing_schema_version(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    rm = json.loads((pkg / "result_manifest.json").read_text(encoding="utf-8"))
    rm.pop("schema_version", None)
    _write_json(pkg / "result_manifest.json", rm)

    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    assert any(e.startswith("unexpected_result_schema_version") for e in summary["errors"])


def test_import_refuses_bytes_mismatch(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    rm = json.loads((pkg / "result_manifest.json").read_text(encoding="utf-8"))
    # Lie about the size while leaving the file (and its sha256) intact.
    rm["documents"][0]["artifacts"][0]["bytes"] = 999999
    _write_json(pkg / "result_manifest.json", rm)

    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    assert any(e.startswith("bytes_mismatch") for e in summary["errors"])
    assert not _corpus_has_outputs(corpus_dir, "abc123")


def test_import_refuses_unmanifested_extra_file(tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    # Worker left an extra output that is not declared in result_manifest.
    (pkg / "docs" / "abc123" / "secret.json").write_text("{}", encoding="utf-8")

    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    assert any(e == "unexpected_file:abc123:secret.json" for e in summary["errors"])
    assert not (corpus_dir / "abc123" / "secret.json").exists()


def test_import_allows_declared_input_and_result_files(tmp_path):
    """Original input/context files + declared result artifacts must NOT be flagged."""
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    report = verify_result_package(pkg, corpus_dir=corpus_dir)
    assert report["ok"] is True
    assert not any(e.startswith("unexpected_file") for e in report["errors"])


def test_verify_refuses_incomplete_document_coverage(tmp_path):
    corpus_dir, pkg = _setup_two_doc_partial_outbox(tmp_path)
    report = verify_result_package(pkg, corpus_dir=corpus_dir)
    assert report["ok"] is False
    assert "missing_result_doc:docb" in report["errors"]


def test_import_refuses_incomplete_document_coverage(tmp_path):
    corpus_dir, pkg = _setup_two_doc_partial_outbox(tmp_path)
    summary = import_result_package(pkg, corpus_dir=corpus_dir)
    assert summary["ok"] is False
    assert summary["imported"] is False
    assert "missing_result_doc:docb" in summary["errors"]
    # Nothing written for the returned doc or the missing one.
    assert not _corpus_has_outputs(corpus_dir, "doca")
    assert not _corpus_has_outputs(corpus_dir, "docb")


# ---------------------------------------------------------------------------
# CLI: offload-move
# ---------------------------------------------------------------------------

def test_cli_offload_move_valid(tmp_path):
    pkg = _build_inbox_package(tmp_path)
    result = CliRunner().invoke(main.app, ["offload-move", str(pkg), "--to", "processing"])
    assert result.exit_code == 0, result.stdout
    assert (tmp_path / "offload" / "processing" / "pkg-1").exists()
    assert not pkg.exists()


def test_cli_offload_move_invalid_transition(tmp_path):
    pkg = _build_inbox_package(tmp_path)
    result = CliRunner().invoke(main.app, ["offload-move", str(pkg), "--to", "imported"])
    assert result.exit_code == 1
    assert "refused" in result.stdout.lower()
    assert pkg.exists()  # unchanged


# ---------------------------------------------------------------------------
# CLI: offload-import
# ---------------------------------------------------------------------------

class _CliConfig:
    def __init__(self, corpus_dir: Path):
        self.corpus_dir = corpus_dir
        self.exports_dir = corpus_dir.parent / "exports"


def test_cli_offload_import_happy_moves_to_imported(monkeypatch, tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    monkeypatch.setattr(main, "load_config", lambda *a, **k: _CliConfig(corpus_dir))

    result = CliRunner().invoke(main.app, ["offload-import", str(pkg)])
    assert result.exit_code == 0, result.stdout
    assert (corpus_dir / "abc123" / "analysis.json").exists()
    assert (corpus_dir / "abc123" / "offload_import.json").exists()
    # Package moved outbox -> imported.
    assert (tmp_path / "offload" / "imported" / "pkg-1").exists()
    assert not pkg.exists()


def test_cli_offload_import_dry_run(monkeypatch, tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    monkeypatch.setattr(main, "load_config", lambda *a, **k: _CliConfig(corpus_dir))

    result = CliRunner().invoke(main.app, ["offload-import", str(pkg), "--dry-run"])
    assert result.exit_code == 0, result.stdout
    assert not _corpus_has_outputs(corpus_dir, "abc123")
    assert pkg.exists()  # still in outbox, not moved


def test_cli_offload_import_refusal_leaves_corpus_and_package(monkeypatch, tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    (pkg / "docs" / "abc123" / "analysis.json").write_text('{"type":"changed"}', encoding="utf-8")
    monkeypatch.setattr(main, "load_config", lambda *a, **k: _CliConfig(corpus_dir))

    result = CliRunner().invoke(main.app, ["offload-import", str(pkg)])
    assert result.exit_code == 1
    assert not _corpus_has_outputs(corpus_dir, "abc123")
    assert pkg.exists()  # still outbox; not marked imported
    assert not (tmp_path / "offload" / "imported" / "pkg-1").exists()


def test_cli_offload_import_refuses_incomplete_coverage(monkeypatch, tmp_path):
    corpus_dir, pkg = _setup_two_doc_partial_outbox(tmp_path)
    monkeypatch.setattr(main, "load_config", lambda *a, **k: _CliConfig(corpus_dir))

    result = CliRunner().invoke(main.app, ["offload-import", str(pkg)])
    assert result.exit_code == 1
    assert not _corpus_has_outputs(corpus_dir, "doca")
    assert not _corpus_has_outputs(corpus_dir, "docb")
    assert pkg.exists()  # still in outbox; not marked imported
    assert not (tmp_path / "offload" / "imported" / "pkg-cov").exists()


def test_cli_offload_import_uses_require_services_false(monkeypatch, tmp_path):
    corpus_dir, pkg = _setup_outbox_result(tmp_path)
    captured: dict = {}

    def fake_load_config(*args, **kwargs):
        captured.update(kwargs)
        return _CliConfig(corpus_dir)

    monkeypatch.setattr(main, "load_config", fake_load_config)
    result = CliRunner().invoke(main.app, ["offload-import", str(pkg), "--dry-run"])
    assert result.exit_code == 0, result.stdout
    assert captured.get("require_services") is False
