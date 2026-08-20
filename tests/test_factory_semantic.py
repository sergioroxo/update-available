from __future__ import annotations

import json
import sqlite3

from runner.pipeline.factory_semantic import simulate
from runner.production_line_ui import semantic_vertical_readiness_model


def test_complete_semantic_vertical_demo_and_idempotent_second_run(tmp_path):
    first = simulate(tmp_path, run_id="synthetic-test-019")
    second = simulate(tmp_path, run_id="synthetic-test-019")
    assert first["document_count"] == 3
    assert first["section_count"] > 3
    assert first["prompt_job_count"] > first["section_count"] * 2
    assert first["executor_invocations"] == first["prompt_job_count"] + 1
    assert first["retried_job_count"] == 1
    assert first["embedding_dimension"] == 4096
    assert first["contradiction_slots_filled"] == 1
    assert first["all_jobs_succeeded"]
    assert not first["index_reused"]
    assert second["executor_invocations"] == 0
    assert second["index_reused"]
    assert second["projection_sha256"] == first["projection_sha256"]
    assert first["model_calls"] == first["network_calls"] == first["remote_writes"] == 0

    saved = json.loads((tmp_path / "semantic_demo_report.json").read_text())
    assert saved == second


def test_worker_state_is_local_and_contains_no_generated_evidence_index_rows(tmp_path):
    simulate(tmp_path, run_id="synthetic-test-019")
    databases = sorted((tmp_path / "studio-local-state").glob("*.sqlite"))
    assert len(databases) == 3
    connection = sqlite3.connect(tmp_path / "frozen-index" / "retrieval.sqlite")
    try:
        assert connection.execute(
            "SELECT COUNT(*) FROM units WHERE provenance_kind!='source_v2_unit'"
        ).fetchone()[0] == 0
    finally:
        connection.close()


def test_content_free_semantic_ui_model_remains_disabled():
    model = semantic_vertical_readiness_model({
        "section_count": 10, "prompt_job_count": 50, "embedding_dimension": 4096,
    })
    assert model["sections"] == 10
    assert model["prompt_jobs"] == 50
    assert "source-only" in model["index"]
    assert "never become source evidence" in model["research_boundary"]
    assert not model["enabled"]
