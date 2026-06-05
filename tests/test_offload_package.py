from __future__ import annotations

import json
from pathlib import Path

import pytest

from runner.pipeline.offload import (
    LIFECYCLE_STATES,
    build_analysis_package,
    collect_document_artifacts,
    lifecycle_consistency,
    load_manifest,
    missing_required_artifacts,
    move_package_state,
    normalise_doc_id,
    prepare_offload_root,
    summarise_source_stages,
    validate_manifest_relative_path,
    validate_required_artifacts,
    validate_package_id,
    verify_package,
)


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _make_doc(
    corpus_dir: Path,
    doc_id: str = "abc123",
    *,
    extracted_name: str = "extracted.txt",
    include_optional: bool = True,
    preprocess_extra: dict | None = None,
) -> Path:
    doc_dir = corpus_dir / doc_id
    doc_dir.mkdir(parents=True)
    _write_json(doc_dir / "intake.json", {"doc_id": doc_id, "source": "https://example.org/doc"})
    preprocess = {"doc_id": doc_id, "quality": "high", "tool_used": "trafilatura", "ocr_images": []}
    preprocess.update(preprocess_extra or {})
    _write_json(doc_dir / "preprocess.json", preprocess)
    (doc_dir / extracted_name).write_text("Extracted source text", encoding="utf-8")
    if include_optional:
        _write_json(doc_dir / "wayback.json", {"status": "existing"})
        _write_json(doc_dir / "preservation_status.json", {"preservation_status": "captured_html"})
        (doc_dir / "source.html").write_text("<html>captured</html>", encoding="utf-8")
        _write_json(doc_dir / "html_snapshot.json", {"sha256": "abc"})
        _write_json(doc_dir / "media_metadata.json", {"platform": "youtube"})
        _write_json(doc_dir / "transcript_chunks.json", [{"text": "Transcript"}])
    return doc_dir


def test_prepare_offload_root_creates_lifecycle_dirs(tmp_path):
    root = prepare_offload_root(tmp_path / "offload")

    assert all((root / state).is_dir() for state in LIFECYCLE_STATES)


def test_normalise_doc_id_accepts_local_and_sanity_prefixed_ids():
    assert normalise_doc_id("abc123") == "abc123"
    assert normalise_doc_id("doc-abc123") == "abc123"


@pytest.mark.parametrize("raw_doc_id", ["", " ", "../secret", "a/b", "a\\b", ".", ".."])
def test_normalise_doc_id_rejects_unsafe_ids(raw_doc_id):
    with pytest.raises(ValueError):
        normalise_doc_id(raw_doc_id)


def test_validate_package_id_accepts_generated_style_ids():
    assert validate_package_id("offload-20260605-120000-abc123ef") == "offload-20260605-120000-abc123ef"


@pytest.mark.parametrize("package_id", ["", "../pkg", "pkg/one", "pkg\\one", ".", ".."])
def test_validate_package_id_rejects_unsafe_ids(package_id):
    with pytest.raises(ValueError):
        validate_package_id(package_id)


def test_validate_manifest_relative_path_accepts_package_relative_path():
    assert validate_manifest_relative_path("docs/abc123", field="package_dir") == "docs/abc123"


@pytest.mark.parametrize("value", ["", "../secret", "/tmp/secret", "docs\\abc123"])
def test_validate_manifest_relative_path_rejects_unsafe_paths(value):
    with pytest.raises(ValueError):
        validate_manifest_relative_path(value, field="artifact")


def test_collect_document_artifacts_marks_required_and_optional_files(tmp_path):
    doc_dir = _make_doc(tmp_path / "corpus")

    artifacts = collect_document_artifacts(doc_dir)
    by_label = {artifact.label: artifact for artifact in artifacts}

    assert missing_required_artifacts(artifacts) == []
    assert by_label["intake.json"].required is True
    assert by_label["preprocess.json"].required is True
    assert by_label["extracted_text"].relative_path == "extracted.txt"
    assert by_label["source.html"].present is True
    assert by_label["wayback.json"].sha256


def test_collect_document_artifacts_accepts_extracted_markdown(tmp_path):
    doc_dir = _make_doc(tmp_path / "corpus", extracted_name="extracted.md")

    artifacts = collect_document_artifacts(doc_dir)
    by_label = {artifact.label: artifact for artifact in artifacts}

    assert by_label["extracted_text"].present is True
    assert by_label["extracted_text"].relative_path == "extracted.md"


def test_collect_document_artifacts_reports_missing_required_artifacts(tmp_path):
    doc_dir = tmp_path / "corpus" / "missing"
    doc_dir.mkdir(parents=True)
    _write_json(doc_dir / "intake.json", {"doc_id": "missing"})

    artifacts = collect_document_artifacts(doc_dir)

    assert missing_required_artifacts(artifacts) == ["preprocess.json", "extracted_text"]


def test_validate_required_artifacts_rejects_invalid_required_json(tmp_path):
    doc_dir = _make_doc(tmp_path / "corpus")
    (doc_dir / "preprocess.json").write_text("{not-json", encoding="utf-8")
    artifacts = collect_document_artifacts(doc_dir)

    errors = validate_required_artifacts(doc_dir, artifacts)

    assert any(error.startswith("invalid_json:preprocess.json") for error in errors)


def test_validate_required_artifacts_rejects_empty_extracted_text(tmp_path):
    doc_dir = _make_doc(tmp_path / "corpus")
    (doc_dir / "extracted.txt").write_text("", encoding="utf-8")
    artifacts = collect_document_artifacts(doc_dir)

    assert "empty_extracted_text" in validate_required_artifacts(doc_dir, artifacts)


def test_summarise_source_stages_reports_local_processing_state(tmp_path):
    doc_dir = _make_doc(
        tmp_path / "corpus",
        preprocess_extra={
            "quality": "medium",
            "tool_used": "docling",
            "ocr_images": [{"page": 1, "text": "OCR text"}],
        },
    )
    artifacts = collect_document_artifacts(doc_dir)

    summary = summarise_source_stages(doc_dir, artifacts)

    assert summary["intake_ready"] is True
    assert summary["preprocess_ready"] is True
    assert summary["extracted_text_ready"] is True
    assert summary["preprocess_quality"] == "medium"
    assert summary["preprocess_tool"] == "docling"
    assert summary["ocr_images_recorded"] == 1
    assert summary["ocr_status"] == "present"
    assert summary["html_capture_status"] == "present"
    assert summary["wayback_metadata_status"] == "present"
    assert summary["media_or_video_context_status"] == "present"
    assert summary["html_capture_present"] is True
    assert summary["wayback_metadata_present"] is True
    assert summary["preservation_status_present"] is True
    assert summary["media_or_video_context_present"] is True


def test_summarise_source_stages_distinguishes_not_applicable_context(tmp_path):
    doc_dir = _make_doc(
        tmp_path / "corpus",
        include_optional=False,
        preprocess_extra={"ocr_images": []},
    )
    _write_json(doc_dir / "intake.json", {"doc_id": "abc123", "source_type": "pdf", "source": "/tmp/doc.pdf"})
    artifacts = collect_document_artifacts(doc_dir)

    summary = summarise_source_stages(doc_dir, artifacts)

    assert summary["source_type"] == "pdf"
    assert summary["html_capture_status"] == "not_applicable"
    assert summary["wayback_metadata_status"] == "not_applicable"
    assert summary["media_or_video_context_status"] == "not_applicable"


def test_summarise_source_stages_marks_missing_video_context_as_absent(tmp_path):
    doc_dir = _make_doc(tmp_path / "corpus", include_optional=False)
    _write_json(doc_dir / "intake.json", {"doc_id": "abc123", "source_type": "video", "source": "https://youtu.be/x"})
    artifacts = collect_document_artifacts(doc_dir)

    summary = summarise_source_stages(doc_dir, artifacts)

    assert summary["media_or_video_context_status"] == "absent"


def test_build_analysis_package_copies_bounded_artifacts_and_manifest(tmp_path):
    corpus_dir = tmp_path / "corpus"
    _make_doc(corpus_dir, "doca")
    _make_doc(corpus_dir, "docb", include_optional=False)

    manifest = build_analysis_package(
        corpus_dir=corpus_dir,
        doc_ids=["doca", "docb"],
        offload_root=tmp_path / "offload",
        package_id="pkg-1",
    )

    package_dir = tmp_path / "offload" / "inbox" / "pkg-1"
    assert (package_dir / "offload_manifest.json").exists()
    assert (package_dir / "docs" / "doca" / "intake.json").exists()
    assert (package_dir / "docs" / "doca" / "source.html").exists()
    assert (package_dir / "docs" / "docb" / "source.html").exists() is False
    assert manifest.privacy_policy["cleanup"] == "manual_after_verified_import"
    assert manifest.privacy_policy["sanity_supabase_push_allowed"] is False
    assert manifest.worker_contract["ollama_safety"]["single_heavy_job"] is True
    assert manifest.worker_contract["ollama_safety"]["unload_after_each_model"] is True
    assert manifest.worker_contract["ollama_safety"]["keep_alive"] == 0
    assert "source_queue.db" in manifest.worker_contract["worker_must_not_write"]
    assert manifest.documents[0].source_dir == ""
    assert manifest.documents[0].source_stage_summary["html_capture_present"] is True
    assert manifest.documents[1].source_stage_summary["html_capture_present"] is False


def test_build_analysis_package_refuses_invalid_required_json_without_partial_package(tmp_path):
    corpus_dir = tmp_path / "corpus"
    doc_dir = _make_doc(corpus_dir, "badjson")
    (doc_dir / "intake.json").write_text("[]", encoding="utf-8")

    with pytest.raises(ValueError, match="invalid_json:intake.json"):
        build_analysis_package(
            corpus_dir=corpus_dir,
            doc_ids=["badjson"],
            offload_root=tmp_path / "offload",
            package_id="pkg-json",
        )

    assert not (tmp_path / "offload" / "inbox" / "pkg-json").exists()


def test_build_analysis_package_refuses_missing_required_without_partial_package(tmp_path):
    corpus_dir = tmp_path / "corpus"
    _make_doc(corpus_dir, "good")
    bad_dir = corpus_dir / "bad"
    bad_dir.mkdir(parents=True)
    _write_json(bad_dir / "intake.json", {"doc_id": "bad"})

    with pytest.raises(ValueError, match="bad cannot be offloaded"):
        build_analysis_package(
            corpus_dir=corpus_dir,
            doc_ids=["good", "bad"],
            offload_root=tmp_path / "offload",
            package_id="pkg-bad",
        )

    assert not (tmp_path / "offload" / "inbox" / "pkg-bad").exists()


def test_build_analysis_package_refuses_empty_doc_selection(tmp_path):
    with pytest.raises(ValueError, match="No valid doc_ids"):
        build_analysis_package(
            corpus_dir=tmp_path / "corpus",
            doc_ids=["", "   "],
            offload_root=tmp_path / "offload",
            package_id="pkg-empty",
        )

    assert not (tmp_path / "offload" / "inbox" / "pkg-empty").exists()


def test_build_analysis_package_rejects_duplicate_doc_ids_after_normalisation(tmp_path):
    corpus_dir = tmp_path / "corpus"
    _make_doc(corpus_dir, "abc123")

    with pytest.raises(ValueError, match="Duplicate doc_id"):
        build_analysis_package(
            corpus_dir=corpus_dir,
            doc_ids=["abc123", "doc-abc123"],
            offload_root=tmp_path / "offload",
            package_id="pkg-dup",
        )

    assert not (tmp_path / "offload" / "inbox" / "pkg-dup").exists()


def test_build_analysis_package_rejects_unsafe_package_id(tmp_path):
    corpus_dir = tmp_path / "corpus"
    _make_doc(corpus_dir, "abc123")

    with pytest.raises(ValueError, match="Unsafe package_id"):
        build_analysis_package(
            corpus_dir=corpus_dir,
            doc_ids=["abc123"],
            offload_root=tmp_path / "offload",
            package_id="../pkg",
        )


def test_load_manifest_round_trips_package_metadata(tmp_path):
    corpus_dir = tmp_path / "corpus"
    _make_doc(corpus_dir, "abc123")
    build_analysis_package(
        corpus_dir=corpus_dir,
        doc_ids=["abc123"],
        offload_root=tmp_path / "offload",
        package_id="pkg-load",
    )

    loaded = load_manifest(tmp_path / "offload" / "inbox" / "pkg-load")

    assert loaded.package_id == "pkg-load"
    assert loaded.lifecycle_state == "inbox"
    assert loaded.documents[0].doc_id == "abc123"
    assert loaded.documents[0].source_stage_summary["extracted_text_ready"] is True


def test_move_package_state_preserves_package_and_updates_manifest(tmp_path):
    corpus_dir = tmp_path / "corpus"
    _make_doc(corpus_dir, "abc123")
    build_analysis_package(
        corpus_dir=corpus_dir,
        doc_ids=["abc123"],
        offload_root=tmp_path / "offload",
        package_id="pkg-move",
    )

    target = move_package_state(
        offload_root=tmp_path / "offload",
        package_id="pkg-move",
        from_state="inbox",
        to_state="processing",
    )

    assert target == tmp_path / "offload" / "processing" / "pkg-move"
    assert not (tmp_path / "offload" / "inbox" / "pkg-move").exists()
    assert (target / "docs" / "abc123" / "extracted.txt").exists()
    assert load_manifest(target).lifecycle_state == "processing"


def test_lifecycle_consistency_reports_matching_state(tmp_path):
    corpus_dir = tmp_path / "corpus"
    _make_doc(corpus_dir, "abc123")
    build_analysis_package(
        corpus_dir=corpus_dir,
        doc_ids=["abc123"],
        offload_root=tmp_path / "offload",
        package_id="pkg-state",
    )

    report = lifecycle_consistency(tmp_path / "offload" / "inbox" / "pkg-state")

    assert report == {
        "package_id": "pkg-state",
        "folder_state": "inbox",
        "manifest_state": "inbox",
        "consistent": True,
    }


def test_lifecycle_consistency_reports_interrupted_move_mismatch(tmp_path):
    corpus_dir = tmp_path / "corpus"
    _make_doc(corpus_dir, "abc123")
    build_analysis_package(
        corpus_dir=corpus_dir,
        doc_ids=["abc123"],
        offload_root=tmp_path / "offload",
        package_id="pkg-mismatch",
    )
    source = tmp_path / "offload" / "inbox" / "pkg-mismatch"
    target = tmp_path / "offload" / "processing" / "pkg-mismatch"
    target.parent.mkdir(parents=True, exist_ok=True)
    source.rename(target)

    report = lifecycle_consistency(target)

    assert report["folder_state"] == "processing"
    assert report["manifest_state"] == "inbox"
    assert report["consistent"] is False


def test_verify_package_rejects_unsafe_doc_package_dir_from_manifest(tmp_path):
    corpus_dir = tmp_path / "corpus"
    _make_doc(corpus_dir, "abc123")
    build_analysis_package(
        corpus_dir=corpus_dir,
        doc_ids=["abc123"],
        offload_root=tmp_path / "offload",
        package_id="pkg-unsafe-manifest",
    )
    package_dir = tmp_path / "offload" / "inbox" / "pkg-unsafe-manifest"
    manifest_path = package_dir / "offload_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["documents"][0]["package_dir"] = "../abc123"
    _write_json(manifest_path, manifest)

    report = verify_package(package_dir)

    assert report["ok"] is False
    assert any("Unsafe manifest path" in error for error in report["errors"])


def test_verify_package_rejects_unsafe_artifact_path_from_manifest(tmp_path):
    corpus_dir = tmp_path / "corpus"
    _make_doc(corpus_dir, "abc123")
    build_analysis_package(
        corpus_dir=corpus_dir,
        doc_ids=["abc123"],
        offload_root=tmp_path / "offload",
        package_id="pkg-unsafe-artifact",
    )
    package_dir = tmp_path / "offload" / "inbox" / "pkg-unsafe-artifact"
    manifest_path = package_dir / "offload_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["documents"][0]["artifacts"][0]["relative_path"] = "../../secret"
    _write_json(manifest_path, manifest)

    report = verify_package(package_dir)

    assert report["ok"] is False
    assert any("Unsafe manifest path" in error for error in report["errors"])


def test_move_package_state_rejects_unknown_lifecycle_state(tmp_path):
    with pytest.raises(ValueError, match="Unknown from_state"):
        move_package_state(
            offload_root=tmp_path / "offload",
            package_id="pkg",
            from_state="gone",
            to_state="inbox",
        )


def test_move_package_state_rejects_unsafe_package_id(tmp_path):
    with pytest.raises(ValueError, match="Unsafe package_id"):
        move_package_state(
            offload_root=tmp_path / "offload",
            package_id="../pkg",
            from_state="inbox",
            to_state="processing",
        )
