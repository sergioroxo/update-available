import json
import sqlite3
from pathlib import Path
from types import SimpleNamespace

import pytest
from typer.testing import CliRunner

from runner import main
from runner import app as app_mod
from runner.pipeline.source_queue import add_item, apply_triage_result, get_item, open_db, open_db_readonly, queue_db_path
from runner.pipeline.specialist_dispatch import build_dispatch_plan, write_dispatch_plan
from runner.pipeline.workflow_batch import WorkflowPolicy, plan_workflow_batch


def _triage(**changes):
    data = dict(
        doc_type_hint="academic", recommended_llm="litelm", routing_reason="route",
        complexity="moderate", needs_book_splitting=False,
        needs_testimony_review=False, needs_media_review=False,
        needs_legal_review=False, overnight_batch_safe=True,
        suggested_process_route="standard", triage_succeeded=True,
    )
    data.update(changes)
    return SimpleNamespace(**data)


def _db(tmp_path: Path):
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    return corpus, open_db(queue_db_path(corpus))


def test_selection_happens_before_routing_and_remains_maximum_fifteen(tmp_path):
    corpus, db = _db(tmp_path)
    ids = []
    flags = [
        {}, {"needs_media_review": True}, {"needs_testimony_review": True},
        {"needs_legal_review": True}, {"needs_book_splitting": True},
    ]
    for index in range(15):
        item = add_item(db, f"https://example.org/{index}", batch_group="mixed")
        apply_triage_result(db, item.id, _triage(**flags[index % len(flags)]), model_name="triage-model")
        ids.append(item.id)

    manifest = plan_workflow_batch(
        db, workflow_batch_id="wf-1", selected_item_ids=ids,
        policy=WorkflowPolicy(research_purpose="mixed-route validation"),
    )

    assert manifest["summary"]["selected"] == 15
    assert len(manifest["items"]) == 15
    assert manifest["summary"]["ordinary"] == 3
    assert manifest["summary"]["attended_base"] == 12
    assert manifest["summary"]["specialist_routes"] == 12
    assert all(get_item(db, item_id).status == "triaged" for item_id in ids)


def test_explicit_selection_over_limit_fails_closed(tmp_path):
    _, db = _db(tmp_path)
    ids = [add_item(db, f"https://example.org/{index}").id for index in range(16)]
    with pytest.raises(ValueError, match="limit"):
        plan_workflow_batch(db, workflow_batch_id="too-many", selected_item_ids=ids)


def test_core_workflow_policy_rejects_unknown_model_policy(tmp_path):
    _, db = _db(tmp_path)
    item = add_item(db, "https://example.org/policy")
    with pytest.raises(ValueError, match="model_policy"):
        plan_workflow_batch(
            db, workflow_batch_id="bad-policy", selected_item_ids=[item.id],
            policy=WorkflowPolicy(model_policy="invented"),
        )


def test_untriaged_and_missing_attachment_are_explicit_technical_holds(tmp_path):
    _, db = _db(tmp_path)
    untriaged = add_item(db, "https://example.org/untriaged")
    missing = add_item(db, "https://example.org/missing")
    apply_triage_result(db, missing.id, _triage(), model_name="triage-model")
    db.execute(
        "UPDATE source_queue SET needs_source_file=1, source_file_path='' WHERE id=?",
        (missing.id,),
    )
    db.commit()

    manifest = plan_workflow_batch(
        db, workflow_batch_id="holds", selected_item_ids=[untriaged.id, missing.id],
    )

    by_id = {item["queue_item_id"]: item for item in manifest["items"]}
    assert by_id[untriaged.id]["hold_code"] == "triage_required"
    assert by_id[missing.id]["hold_code"] == "source_attachment"
    assert manifest["summary"]["technical_hold"] == 2


def test_readonly_queue_connection_cannot_mutate_source_queue(tmp_path):
    corpus, db = _db(tmp_path)
    item = add_item(db, "https://example.org/readonly")
    db.close()

    readonly = open_db_readonly(queue_db_path(corpus))
    assert get_item(readonly, item.id) is not None
    with pytest.raises(sqlite3.OperationalError, match="readonly"):
        readonly.execute("UPDATE source_queue SET title='changed' WHERE id=?", (item.id,))
    readonly.close()


def test_external_safe_workflow_redacts_local_attachment_path(tmp_path):
    _, db = _db(tmp_path)
    source = tmp_path / "private" / "source.pdf"
    source.parent.mkdir()
    source.write_bytes(b"%PDF-1.4")
    item = add_item(db, "https://example.org/source.pdf")
    apply_triage_result(db, item.id, _triage(), model_name="triage-model")
    db.execute("UPDATE source_queue SET source_file_path=? WHERE id=?", (str(source), item.id))
    db.commit()

    manifest = plan_workflow_batch(
        db, workflow_batch_id="external", selected_item_ids=[item.id],
        policy=WorkflowPolicy(disclosure_mode="external_safe"),
    )

    assert manifest["items"][0]["source_attachment"]["path"] == ""
    assert str(tmp_path) not in json.dumps(manifest)


def test_external_safe_workflow_recursively_withholds_paths_in_all_metadata(tmp_path):
    _, db = _db(tmp_path)
    private_path = "/Users/researcher/Secret Folder/source.pdf"
    item = add_item(db, "https://example.org/private")
    apply_triage_result(db, item.id, _triage(), model_name="triage-model")
    db.execute(
        "UPDATE source_queue SET title=?,routing_reason=?,source_file_url=? WHERE id=?",
        (private_path, f"Inspect {private_path}", f"file://{private_path}", item.id),
    )
    db.commit()

    manifest = plan_workflow_batch(
        db, workflow_batch_id="external-recursive", selected_item_ids=[item.id],
        policy=WorkflowPolicy(
            disclosure_mode="external_safe",
            research_purpose=f"Study material stored at {private_path}",
            research_questions=[f"What appears in {private_path}?"],
        ),
    )

    serialized = json.dumps(manifest)
    assert "/Users/" not in serialized
    assert "file:///" not in serialized


def test_dispatch_plan_calls_existing_workflows_but_executes_nothing(tmp_path):
    corpus, db = _db(tmp_path)
    item = add_item(db, "https://example.org/video")
    apply_triage_result(db, item.id, _triage(needs_media_review=True), model_name="triage-model")
    manifest = plan_workflow_batch(db, workflow_batch_id="dispatch", selected_item_ids=[item.id])

    plan = build_dispatch_plan(manifest, corpus)

    assert plan["dry_run"] is True
    assert plan["remote_writes"] is False
    assert plan["items"][0]["base_status"] == "waiting_for_base_processing"
    specialist = plan["items"][0]["specialists"][0]
    assert specialist["route"] == "media"
    assert specialist["commands"] == []
    assert specialist["planned_after_base"][0][-2:] == ["media-report", "<doc_id>"]
    assert not any(corpus.iterdir())


def test_existing_low_confidence_document_adds_second_opinion_plan(tmp_path):
    corpus, db = _db(tmp_path)
    item = add_item(db, "https://example.org/doc")
    apply_triage_result(db, item.id, _triage(), model_name="triage-model")
    doc_id = "doc-existing"
    doc = corpus / doc_id
    doc.mkdir()
    (doc / "analysis.json").write_text(json.dumps({"needs_review": True}))
    db.execute("UPDATE source_queue SET corpus_doc_id=? WHERE id=?", (doc_id, item.id))
    db.commit()
    manifest = plan_workflow_batch(db, workflow_batch_id="opinion", selected_item_ids=[item.id])

    plan = build_dispatch_plan(manifest, corpus)

    routes = [row["route"] for row in plan["items"][0]["specialists"]]
    assert routes == ["second_opinion"]


def test_human_required_legal_route_has_no_runnable_command(tmp_path):
    corpus, db = _db(tmp_path)
    item = add_item(db, "https://example.org/legal")
    apply_triage_result(db, item.id, _triage(needs_legal_review=True), model_name="triage-model")
    doc_id = "doc-legal"
    doc = corpus / doc_id
    doc.mkdir()
    (doc / "analysis.json").write_text(json.dumps({"type": "Legal-Instrument"}))
    (doc / "intake.json").write_text(json.dumps({"source": "law"}))
    db.execute("UPDATE source_queue SET corpus_doc_id=? WHERE id=?", (doc_id, item.id))
    db.commit()
    manifest = plan_workflow_batch(db, workflow_batch_id="legal", selected_item_ids=[item.id])

    plan = build_dispatch_plan(manifest, corpus)
    specialist = plan["items"][0]["specialists"][0]

    assert specialist["status"] == "human_required"
    assert specialist["commands"] == []
    assert plan["items"][0]["next_action"] == "researcher_decision_required"


def test_complete_longform_route_emits_no_runnable_commands(tmp_path):
    corpus, db = _db(tmp_path)
    item = add_item(db, "https://example.org/book")
    apply_triage_result(db, item.id, _triage(needs_book_splitting=True), model_name="triage-model")
    doc_id = "doc-book"
    doc = corpus / doc_id
    doc.mkdir()
    (doc / "preprocess.json").write_text(json.dumps({"quality": "ok"}))
    (doc / "longform_sections.json").write_text(json.dumps({"sections": [{"section_id": "s1", "text_hash": "h1"}]}))
    (doc / "longform_section_analyses.jsonl").write_text(json.dumps({
        "section_id": "s1", "text_hash": "h1", "status": "succeeded",
        "analysis": {"section_summary": "Reviewed"},
    }) + "\n")
    (doc / "longform_synthesis.json").write_text(json.dumps({
        "section_count": 1, "section_analyses_count": 1,
        "synthesis": {"archive_abstract": "Complete"},
    }))
    db.execute("UPDATE source_queue SET corpus_doc_id=? WHERE id=?", (doc_id, item.id))
    db.commit()
    manifest = plan_workflow_batch(db, workflow_batch_id="longform", selected_item_ids=[item.id])

    plan = build_dispatch_plan(manifest, corpus)
    specialist = plan["items"][0]["specialists"][0]

    assert specialist["status"] == "complete"
    assert specialist["commands"] == []
    assert specialist["planned_after_base"]
    assert plan["items"][0]["next_action"] == "compile_outcome"


def test_dispatch_plan_is_fingerprinted_and_written_immutably(tmp_path):
    corpus, db = _db(tmp_path)
    item = add_item(db, "https://example.org/dispatch")
    apply_triage_result(db, item.id, _triage(), model_name="triage-model")
    manifest = plan_workflow_batch(db, workflow_batch_id="immutable", selected_item_ids=[item.id])

    plan = build_dispatch_plan(manifest, corpus)
    path = write_dispatch_plan(
        plan,
        tmp_path / "dispatch",
        workflow_manifest=manifest,
        corpus_dir=corpus,
    )

    assert len(plan["evidence_fingerprint"]) == 64
    assert path.parent.name == "plans"
    assert path.is_file()
    assert (tmp_path / "dispatch" / "immutable" / "latest_specialist_dispatch.json").is_file()


def test_workflow_and_dispatch_cli_are_dry_run(monkeypatch, tmp_path):
    corpus, db = _db(tmp_path)
    exports = tmp_path / "exports"
    item = add_item(db, "https://example.org/media", batch_group="cli-group")
    apply_triage_result(db, item.id, _triage(needs_media_review=True), model_name="triage-model")
    config = type("Config", (), {"corpus_dir": corpus, "exports_dir": exports})()
    monkeypatch.setattr(main, "load_config", lambda **kwargs: config)

    planned = CliRunner().invoke(main.app, [
        "workflow-batch-plan", "--item-id", item.id, "--purpose", "CLI test",
    ])
    assert planned.exit_code == 0, planned.stdout
    manifests = list((exports / "workflow_batches").glob("*/plans/*.json"))
    assert len(manifests) == 1

    dispatched = CliRunner().invoke(main.app, ["specialist-plan", str(manifests[0])])
    assert dispatched.exit_code == 0, dispatched.stdout
    assert "Dry run only" in dispatched.stdout
    assert len(list((exports / "specialist_dispatch").glob("*/latest_specialist_dispatch.json"))) == 1


def test_streamlit_action_uses_explicit_checked_rows_without_reassigning_batch(monkeypatch, tmp_path):
    corpus, db = _db(tmp_path)
    exports = tmp_path / "exports"
    ordinary = add_item(db, "https://example.org/ordinary", batch_group="old-a")
    media = add_item(db, "https://example.org/media-checked", batch_group="old-b")
    apply_triage_result(db, ordinary.id, _triage(), model_name="triage-model")
    apply_triage_result(db, media.id, _triage(needs_media_review=True), model_name="triage-model")
    config = type("Config", (), {"corpus_dir": corpus, "exports_dir": exports})()

    result = app_mod._plan_workflow_batch_action(
        config, db, batch_group="ignored", limit=2,
        purpose="Explicit selection", questions=["What is evidenced?"],
        selected_item_ids=[ordinary.id, media.id],
    )

    assert result["manifest"]["selection"]["method"] == "explicit_queue_ids"
    assert result["manifest"]["summary"]["selected"] == 2
    assert result["manifest"]["summary"]["specialist_routes"] == 1
    assert get_item(db, ordinary.id).batch_group == "old-a"
    assert get_item(db, media.id).batch_group == "old-b"

    attempts = app_mod._plan_workflow_attempts_action(
        config,
        workflow=result["manifest"],
        dispatch=result["dispatch"],
        selected_stages=["local_base"],
    )
    assert attempts["plan"]["planner_only"] is True
    assert attempts["plan"]["execution_authorized"] is False
    assert attempts["reconciliation"]["ok"] is True
    assert attempts["attestation_path"].is_file()
    assert attempts["plan_path"].is_file()
    assert attempts["ledger_path"].is_file()


class _WorkflowPanelSt:
    def __init__(self, state):
        self.session_state = state
        self.messages = []
        self.multiselect_defaults = {}

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def expander(self, *args, **kwargs):
        return self

    def columns(self, spec):
        count = spec if isinstance(spec, int) else len(spec)
        return [self for _ in range(count)]

    def selectbox(self, _label, options, key=None, **_kwargs):
        return self.session_state.get(key, options[0])

    def radio(self, _label, options, key=None, **_kwargs):
        return self.session_state.get(key, options[0])

    def text_input(self, _label, key=None, **_kwargs):
        return self.session_state.get(key, "")

    def text_area(self, _label, key=None, **_kwargs):
        return self.session_state.get(key, "")

    def multiselect(self, label, _options, default=None, key=None, **_kwargs):
        values = list(self.session_state.get(key, default or []))
        self.multiselect_defaults[label] = values
        return values

    def checkbox(self, _label, key=None, **_kwargs):
        return bool(self.session_state.get(key, False))

    def button(self, *_args, **_kwargs):
        return False

    def dataframe(self, *_args, **_kwargs):
        self.messages.append("dataframe")

    def spinner(self, *_args, **_kwargs):
        return self

    def __getattr__(self, name):
        if name in {"caption", "markdown", "warning", "success", "error", "info"}:
            return lambda message, **_kwargs: self.messages.append(str(message))
        raise AttributeError(name)


def test_streamlit_attempt_panel_is_read_only_by_default_stale_safe_and_longform_opt_in(monkeypatch, tmp_path):
    corpus, db = _db(tmp_path)
    exports = tmp_path / "exports"
    ordinary = add_item(db, "https://example.org/ordinary")
    longform = add_item(db, "https://example.org/book")
    apply_triage_result(db, ordinary.id, _triage(), model_name="triage-model")
    apply_triage_result(
        db, longform.id, _triage(needs_book_splitting=True, overnight_batch_safe=False),
        model_name="triage-model",
    )
    config = type("Config", (), {"corpus_dir": corpus, "exports_dir": exports})()
    result = app_mod._plan_workflow_batch_action(
        config, db, batch_group="", limit=2, purpose="", questions=[],
        selected_item_ids=[ordinary.id, longform.id],
    )
    ui_key = app_mod._workflow_ui_input_fingerprint(
        batch_group="", selected_item_ids=[ordinary.id, longform.id], limit=2,
        purpose="", questions=[], model_policy="triage_recommended",
        disclosure_mode="internal_research", audit_sample_rule="exceptions_and_researcher_selected",
    )
    result["ui_input_fingerprint"] = ui_key
    prefix = "mock"
    fake = _WorkflowPanelSt({
        f"{prefix}_workflow_result": result,
        f"{prefix}_workflow_selection_mode": "Checked rows",
        f"{prefix}_workflow_model_policy": "triage_recommended",
        f"{prefix}_workflow_disclosure": "internal_research",
        f"{prefix}_workflow_audit_rule": "exceptions_and_researcher_selected",
        f"{prefix}_attempt_result": {
            "workflow_fingerprint": "stale",
            "dispatch_fingerprint": "stale",
            "ui_request_key": "stale",
        },
    })
    before = sorted(str(path.relative_to(exports)) for path in exports.rglob("*") if path.is_file())
    original_st = app_mod.st
    app_mod.st = fake
    monkeypatch.setattr(
        app_mod, "_plan_workflow_attempts_action",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("render executed planner")),
    )
    try:
        app_mod._render_workflow_batch_panel(
            config, db, batch_group="", limit=2, key_prefix=prefix,
            selected_item_ids=[ordinary.id, longform.id],
        )
    finally:
        app_mod.st = original_st
    after = sorted(str(path.relative_to(exports)) for path in exports.rglob("*") if path.is_file())

    assert before == after
    assert "specialist:longform" not in fake.multiselect_defaults["Stages to record (longform is opt-in)"]
    assert any("workflow evidence or attempt selection changed" in message for message in fake.messages)
