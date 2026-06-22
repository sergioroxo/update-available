from __future__ import annotations

import json
import os
from pathlib import Path
from types import SimpleNamespace

from runner.pipeline import system_health


def _cfg(tmp_path: Path):
    corpus = tmp_path / "corpus"
    exports = tmp_path / "exports"
    corpus.mkdir()
    exports.mkdir()
    return SimpleNamespace(corpus_dir=corpus, exports_dir=exports)


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _doc(corpus: Path, doc_id: str, *, analysis: bool = True, uploaded: bool = False) -> Path:
    doc = corpus / doc_id
    doc.mkdir(parents=True)
    if analysis:
        _write_json(doc / "analysis.json", {
            "type": "Anti-SOGICE",
            "format": "Blog-Post",
            "confidence": {"overall_score": 0.9, "status": "high"},
            "needs_review": False,
            "flags": [],
            "testimony_flag": False,
        })
    if uploaded:
        _write_json(doc / "sanity_record.json", {"sanity_id": f"doc-{doc_id}"})
    return doc


def test_system_health_reports_pending_upload_and_missing_knowledge_exports(tmp_path, monkeypatch):
    config = _cfg(tmp_path)
    _doc(config.corpus_dir, "doc-a", analysis=True, uploaded=False)
    monkeypatch.setenv("SOURCE_OFFLOAD_TRANSFER_ROOT", str(tmp_path / "transfer"))

    report = system_health.build_system_health(config)

    assert report["status"] == "needs_attention"
    assert report["corpus"]["documents"] == 1
    assert report["corpus"]["pending_upload"] == 1
    assert any("analyzed corpus doc" in item for item in report["actions"])
    assert any("Knowledge exports missing" in item for item in report["actions"])


def test_system_health_detects_source_offload_manifest_drift(tmp_path, monkeypatch):
    config = _cfg(tmp_path)
    monkeypatch.setenv("SOURCE_OFFLOAD_TRANSFER_ROOT", str(tmp_path / "transfer"))
    pkg = config.exports_dir / "source_offload" / "inbox" / "pkg-a"
    _write_json(pkg / "source_manifest.json", {
        "schema_version": 1,
        "package_id": "pkg-a",
        "package_kind": "source_package",
        "created_at": "2026-01-01T00:00:00+00:00",
        "lifecycle_state": "outbox",
        "retention_policy": "manual_delete",
        "privacy_policy": {"local_only": True},
        "items": [],
    })

    report = system_health.build_system_health(config)

    assert report["status"] == "blocked"
    assert report["source_offload"]["inconsistent_count"] == 1
    assert any("folder/manifest drift" in item for item in report["blockers"])


def test_system_health_uses_explicit_source_offload_root(tmp_path, monkeypatch):
    config = _cfg(tmp_path)
    monkeypatch.setenv("SOURCE_OFFLOAD_TRANSFER_ROOT", str(tmp_path / "transfer"))
    alternate_root = tmp_path / "studio-offload"
    pkg = alternate_root / "failed" / "pkg-failed"
    _write_json(pkg / "source_manifest.json", {
        "schema_version": 1,
        "package_id": "pkg-failed",
        "package_kind": "source_package",
        "created_at": "2026-01-01T00:00:00+00:00",
        "lifecycle_state": "failed",
        "retention_policy": "manual_delete",
        "privacy_policy": {"local_only": True},
        "items": [],
    })

    report = system_health.build_system_health(config, source_offload_root=alternate_root)

    assert report["source_offload"]["root"] == str(alternate_root)
    assert report["source_offload"]["failed_count"] == 1
    assert report["source_offload"]["packages_by_state"]["failed"][0]["package_id"] == "pkg-failed"
    assert report["source_offload"]["packages_by_state"]["failed"][0]["folder_state"] == "failed"
    assert report["source_offload"]["packages_by_state"]["failed"][0]["manifest_state"] == "failed"
    assert any("source-offload package(s) are in failed" in item for item in report["actions"])


def test_system_health_failed_package_report_includes_queue_linkage(tmp_path, monkeypatch):
    config = _cfg(tmp_path)
    monkeypatch.setenv("SOURCE_OFFLOAD_TRANSFER_ROOT", str(tmp_path / "transfer"))
    pkg = config.exports_dir / "source_offload" / "failed" / "pkg-failed"
    _write_json(pkg / "source_manifest.json", {
        "schema_version": 1,
        "package_id": "pkg-failed",
        "package_kind": "source_package",
        "created_at": "2026-01-01T00:00:00+00:00",
        "lifecycle_state": "failed",
        "retention_policy": "manual_delete",
        "privacy_policy": {"local_only": True},
        "items": [{
            "doc_id": "bad-doc",
            "source_kind": "url",
            "declared_source_type": "url",
            "url": "https://example.org/bad",
            "relative_path": "",
            "sha256": "",
            "bytes": 0,
            "item_record_path": "items/bad-doc/source_item.json",
            "item_record_sha256": "0" * 64,
            "queue_item_id": "qi_bad",
            "url_hash": "hash_bad",
        }],
    })
    _write_json(pkg / "worker_report.json", {
        "worker_status": "failed",
        "documents": [{
            "doc_id": "bad-doc",
            "status": "failed",
            "error": "embedding_failed:500",
        }],
    })

    report = system_health.build_system_health(config)

    assert report["source_offload"]["failed_reports"] == [{
        "package_id": "pkg-failed",
        "worker_status": "failed",
        "docs": [{
            "doc_id": "bad-doc",
            "queue_item_id": "qi_bad",
            "source_url": "https://example.org/bad",
            "status": "failed",
            "error": "embedding_failed:500",
        }],
    }]
    assert any("pkg-failed:qi_bad:embedding_failed:500" in item for item in report["actions"])


def test_system_health_does_not_block_on_imported_result_history(tmp_path, monkeypatch):
    config = _cfg(tmp_path)
    monkeypatch.setenv("SOURCE_OFFLOAD_TRANSFER_ROOT", str(tmp_path / "transfer"))
    pkg = config.exports_dir / "source_offload" / "imported" / "pkg-done"
    _write_json(pkg / "source_manifest.json", {
        "schema_version": 1,
        "package_id": "pkg-done",
        "package_kind": "source_package",
        "created_at": "2026-01-01T00:00:00+00:00",
        "lifecycle_state": "imported",
        "retention_policy": "manual_delete",
        "privacy_policy": {"local_only": True},
        "items": [],
    })
    _write_json(pkg / "result_manifest.json", {
        "schema_version": 1,
        "package_id": "pkg-done",
        "package_kind": "ingest_result",
        "documents": [],
    })

    report = system_health.build_system_health(config)

    assert report["source_offload"]["returned_wrong_folder_count"] == 0
    assert not any("returned source package" in item for item in report["blockers"])


def test_system_health_flags_direct_transfer_folders(tmp_path, monkeypatch):
    config = _cfg(tmp_path)
    transfer = tmp_path / "transfer"
    (transfer / "to-mac-studio" / "trial-folder").mkdir(parents=True)
    monkeypatch.setenv("SOURCE_OFFLOAD_TRANSFER_ROOT", str(transfer))

    report = system_health.build_system_health(config)

    assert report["transfer"]["direct_incoming_folder_count"] == 1
    assert any("direct package folder" in item for item in report["actions"])


def test_system_health_uses_explicit_transfer_root(tmp_path):
    config = _cfg(tmp_path)
    transfer = tmp_path / "explicit-transfer"
    (transfer / "to-mac-studio" / "trial-folder").mkdir(parents=True)

    report = system_health.build_system_health(config, transfer_root=transfer)

    assert report["transfer"]["root"] == str(transfer)
    assert report["transfer"]["direct_incoming_folders"] == [{
        "package_id": "trial-folder",
        "path": str(transfer / "to-mac-studio" / "trial-folder"),
    }]


def test_direct_transfer_cleanup_plan_is_move_only(tmp_path):
    transfer = tmp_path / "transfer"
    direct = transfer / "to-mac-studio" / "trial-folder"
    direct.mkdir(parents=True)
    (direct / "source_manifest.json").write_text("{}", encoding="utf-8")

    plan = system_health.plan_direct_transfer_folder_cleanup(transfer_root=transfer)

    assert plan["count"] == 1
    assert plan["folders"][0]["package_id"] == "trial-folder"
    assert plan["folders"][0]["source"] == str(direct)
    assert plan["folders"][0]["destination_parent"] == str(transfer / "older" / "direct-transfer-folders")
    assert direct.exists()


def test_direct_transfer_cleanup_execute_moves_without_deleting(tmp_path):
    config = _cfg(tmp_path)
    transfer = tmp_path / "transfer"
    direct = transfer / "to-mac-studio" / "trial-folder"
    direct.mkdir(parents=True)
    (direct / "source_manifest.json").write_text("{}", encoding="utf-8")

    result = system_health.move_direct_transfer_folders_to_older(transfer_root=transfer)

    assert len(result["moved"]) == 1
    moved_to = Path(result["moved"][0]["destination"])
    assert not direct.exists()
    assert moved_to.exists()
    assert (moved_to / "source_manifest.json").exists()
    report = system_health.build_system_health(config, transfer_root=transfer)
    assert report["transfer"]["direct_incoming_folder_count"] == 0


def test_system_health_reports_actionable_corpus_rows(tmp_path, monkeypatch):
    config = _cfg(tmp_path)
    _doc(config.corpus_dir, "doc-a", analysis=False)
    _doc(config.corpus_dir, "doc-b", analysis=True, uploaded=False)
    _write_json(config.corpus_dir / "doc-b" / "enrichment.json", {
        "lexicon_proposals": [{"proposal_id": "lex-1"}],
    })
    monkeypatch.setenv("SOURCE_OFFLOAD_TRANSFER_ROOT", str(tmp_path / "transfer"))

    report = system_health.build_system_health(config)

    assert report["corpus"]["no_analysis_doc_rows"][0]["doc_id"] == "doc-a"
    assert report["corpus"]["no_analysis_doc_rows"][0]["partial_state"] == "stub_no_pipeline_artifacts"
    assert "stub folder" in report["corpus"]["no_analysis_doc_rows"][0]["next_action"]
    assert report["corpus"]["active_no_analysis_docs"] == 1
    assert report["corpus"]["discarded_no_analysis_docs"] == 0
    assert report["corpus"]["pending_upload_docs"] == ["doc-b"]
    assert report["corpus"]["enrichment_attention_rows"][0]["doc_id"] == "doc-b"
    assert report["corpus"]["enrichment_attention_rows"][0]["pending"] == 1
    assert report["corpus"]["enrichment_attention_rows"][0]["next_action"] == "Review 1 pending proposal(s)"


def test_system_health_classifies_incomplete_doc_states(tmp_path, monkeypatch):
    config = _cfg(tmp_path)
    discarded = _doc(config.corpus_dir, "doc-discarded", analysis=False)
    _write_json(discarded / "discarded.json", {"doc_id": "doc-discarded"})
    intake_only = _doc(config.corpus_dir, "doc-intake", analysis=False)
    _write_json(intake_only / "intake.json", {"doc_id": "doc-intake"})
    preprocessed = _doc(config.corpus_dir, "doc-preprocessed", analysis=False)
    _write_json(preprocessed / "preprocess.json", {"doc_id": "doc-preprocessed"})
    monkeypatch.setenv("SOURCE_OFFLOAD_TRANSFER_ROOT", str(tmp_path / "transfer"))

    report = system_health.build_system_health(config)

    by_doc = {
        row["doc_id"]: row
        for row in report["corpus"]["no_analysis_doc_rows"]
    }
    assert by_doc["doc-discarded"]["partial_state"] == "discarded"
    assert "no pipeline retry needed" in by_doc["doc-discarded"]["next_action"]
    assert by_doc["doc-intake"]["partial_state"] == "intake_only"
    assert "preprocessing and analysis" in by_doc["doc-intake"]["next_action"]
    assert by_doc["doc-preprocessed"]["partial_state"] == "preprocessed_no_analysis"
    assert "preprocessing artifacts already exist" in by_doc["doc-preprocessed"]["next_action"]
    assert report["corpus"]["incomplete_by_state"] == {
        "discarded": 1,
        "intake_only": 1,
        "preprocessed_no_analysis": 1,
    }
    assert report["corpus"]["active_no_analysis_docs"] == 2
    assert report["corpus"]["discarded_no_analysis_docs"] == 1


def test_system_health_flags_document_profile_count_mismatch(tmp_path, monkeypatch):
    config = _cfg(tmp_path)
    _doc(config.corpus_dir, "doc-a", analysis=True, uploaded=True)
    _doc(config.corpus_dir, "doc-b", analysis=True, uploaded=True)
    knowledge = config.exports_dir / "knowledge"
    knowledge.mkdir()
    (knowledge / "document_profiles.jsonl").write_text(json.dumps({"doc_id": "doc-a"}) + "\n", encoding="utf-8")
    (knowledge / "archive_nodes.csv").write_text("id,label,type\n", encoding="utf-8")
    (knowledge / "archive_edges.csv").write_text("id,source,target,type\n", encoding="utf-8")
    _write_json(knowledge / "archive_graph.json", {"nodes": [], "edges": []})
    monkeypatch.setenv("SOURCE_OFFLOAD_TRANSFER_ROOT", str(tmp_path / "transfer"))

    report = system_health.build_system_health(config)

    assert report["knowledge"]["document_profiles_count"] == 1
    assert any("document_profiles.jsonl has 1 profile" in item for item in report["actions"])


def test_system_health_flags_stale_archive_summary(tmp_path, monkeypatch):
    config = _cfg(tmp_path)
    doc = _doc(config.corpus_dir, "doc-a", analysis=True, uploaded=True)
    summary = doc / "archive_summary.json"
    summary.write_text("{}", encoding="utf-8")
    os.utime(summary, (100, 100))
    os.utime(doc / "analysis.json", (200, 200))
    monkeypatch.setenv("SOURCE_OFFLOAD_TRANSFER_ROOT", str(tmp_path / "transfer"))

    report = system_health.build_system_health(config)

    assert report["corpus"]["stale_archive_summary_count"] == 1
    assert report["corpus"]["stale_archive_summary_docs"] == ["doc-a"]
    assert any("archive_summary.json sidecar" in item for item in report["actions"])


def test_system_health_flags_graph_older_than_profiles(tmp_path, monkeypatch):
    config = _cfg(tmp_path)
    _doc(config.corpus_dir, "doc-a", analysis=True, uploaded=True)
    knowledge = config.exports_dir / "knowledge"
    knowledge.mkdir()
    profiles = knowledge / "document_profiles.jsonl"
    graph = knowledge / "archive_graph.json"
    profiles.write_text(json.dumps({"doc_id": "doc-a"}) + "\n", encoding="utf-8")
    (knowledge / "archive_nodes.csv").write_text("id,label,type\n", encoding="utf-8")
    (knowledge / "archive_edges.csv").write_text("id,source,target,type\n", encoding="utf-8")
    _write_json(graph, {"nodes": [], "edges": []})
    os.utime(graph, (100, 100))
    os.utime(profiles, (200, 200))
    monkeypatch.setenv("SOURCE_OFFLOAD_TRANSFER_ROOT", str(tmp_path / "transfer"))

    report = system_health.build_system_health(config)

    assert any("older than document_profiles.jsonl" in item for item in report["actions"])


def test_system_health_flags_stale_graph_missing_evidence_strength(tmp_path, monkeypatch):
    config = _cfg(tmp_path)
    _doc(config.corpus_dir, "doc-a", analysis=True, uploaded=True)
    knowledge = config.exports_dir / "knowledge"
    knowledge.mkdir()
    (knowledge / "document_profiles.jsonl").write_text(json.dumps({"doc_id": "doc-a"}) + "\n", encoding="utf-8")
    (knowledge / "archive_nodes.csv").write_text("id,label,type\n", encoding="utf-8")
    (knowledge / "archive_edges.csv").write_text("id,source,target,type\n", encoding="utf-8")
    _write_json(knowledge / "archive_graph.json", {
        "nodes": [{"id": "doc-a"}],
        "edges": [{"id": "edge-a", "type": "attests_term"}],
    })
    monkeypatch.setenv("SOURCE_OFFLOAD_TRANSFER_ROOT", str(tmp_path / "transfer"))

    report = system_health.build_system_health(config)

    assert report["knowledge"]["evidence_strength"] == {"": 1}
    assert any("evidence-strength" in item for item in report["actions"])
