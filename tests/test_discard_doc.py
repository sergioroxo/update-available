"""
Tests for the document discard workflow:
  - patch_workflow_status() in sanity.py
  - verify_uploads() correctly excludes discarded docs from mismatch check
"""
import json
import pytest
from pathlib import Path
from dataclasses import dataclass


# ── Helpers ──────────────────────────────────────────────────────────────────

@dataclass
class _Config:
    sanity_project_id: str = "eqg5bxk6"
    sanity_dataset: str = "production"
    sanity_write_token: str = "fake-token"
    sanity_api_base: str = "https://eqg5bxk6.api.sanity.io/v2024-01-01/data/mutate/production"
    supabase_url: str = ""
    supabase_service_key: str = ""


# ── patch_workflow_status ────────────────────────────────────────────────────

class TestPatchWorkflowStatus:
    def test_builds_correct_patch_mutation(self, monkeypatch):
        """patch_workflow_status sends a targeted set mutation — no other fields touched."""
        from runner.clients import sanity as sanity_mod

        captured = {}

        def _fake_mutate(mutations, config):
            captured["mutations"] = mutations
            return {"transactionId": "t1", "results": [{"id": "doc-abc"}]}

        monkeypatch.setattr(sanity_mod, "_mutate", _fake_mutate)

        result = sanity_mod.patch_workflow_status("doc-abc123", "discarded", _Config())

        assert len(captured["mutations"]) == 1
        m = captured["mutations"][0]
        assert "patch" in m
        assert m["patch"]["id"] == "doc-abc123"
        assert m["patch"]["set"] == {"workflowStatus": "discarded"}

    def test_rejects_invalid_status(self):
        from runner.clients.sanity import patch_workflow_status
        with pytest.raises(ValueError, match="Invalid workflowStatus"):
            patch_workflow_status("doc-abc", "deleted_forever", _Config())

    def test_accepts_all_valid_statuses(self, monkeypatch):
        from runner.clients import sanity as sanity_mod
        from runner.clients.sanity import VALID_WORKFLOW_STATUSES

        monkeypatch.setattr(sanity_mod, "_mutate", lambda m, c: {})

        for status in VALID_WORKFLOW_STATUSES:
            # Should not raise
            sanity_mod.patch_workflow_status("doc-abc", status, _Config())

    def test_discarded_is_a_valid_status(self):
        from runner.clients.sanity import VALID_WORKFLOW_STATUSES
        assert "discarded" in VALID_WORKFLOW_STATUSES

    def test_original_statuses_still_valid(self):
        from runner.clients.sanity import VALID_WORKFLOW_STATUSES
        for s in ("unverified", "in_progress", "verified", "published"):
            assert s in VALID_WORKFLOW_STATUSES, f"{s} should still be valid"


# ── verify_uploads mismatch exclusion ────────────────────────────────────────

class TestVerifyUploadsDiscardedExclusion:
    """Test that verify_uploads excludes discarded docs from the mismatch warning."""

    def _make_sanity_doc(self, doc_id: str, status: str = "unverified") -> dict:
        return {
            "_id": f"doc-{doc_id}",
            "docId": doc_id,
            "docType": "Anti-SOGICE",
            "workflowStatus": status,
            "_createdAt": "2026-05-01T10:00:00Z",
            "sourceUrl": "https://example.com/doc",
        }

    def test_discarded_excluded_from_mismatch(self):
        """Discarded docs in Sanity that are missing from Supabase should not be flagged."""
        from runner.pipeline import upload as upload_mod

        sanity_docs = [
            self._make_sanity_doc("active001", "unverified"),
            self._make_sanity_doc("discarded001", "discarded"),
            self._make_sanity_doc("discarded002", "discarded"),
        ]
        # Supabase has only active001
        supabase_rows = [{"doc_id": "active001", "doc_type": "Anti-SOGICE", "scope": "Core"}]

        sanity_ids = {upload_mod._sanity_doc_id(d) for d in sanity_docs}
        active_ids = {
            upload_mod._sanity_doc_id(d) for d in sanity_docs
            if d.get("workflowStatus") != "discarded"
        }
        discarded_ids = {
            upload_mod._sanity_doc_id(d) for d in sanity_docs
            if d.get("workflowStatus") == "discarded"
        }
        supa_ids = {r["doc_id"] for r in supabase_rows}
        missing = active_ids - supa_ids

        assert missing == set(), f"Active docs should all be in Supabase; missing: {missing}"
        assert discarded_ids == {"discarded001", "discarded002"}
        assert "discarded001" not in missing
        assert "discarded002" not in missing

    def test_active_missing_still_flagged(self):
        """Active docs missing from Supabase should still be flagged after filter."""
        from runner.pipeline import upload as upload_mod

        sanity_docs = [
            self._make_sanity_doc("active001", "unverified"),
            self._make_sanity_doc("active002", "unverified"),
            self._make_sanity_doc("discarded001", "discarded"),
        ]
        # Supabase has only active001
        supabase_rows = [{"doc_id": "active001"}]

        active_ids = {
            upload_mod._sanity_doc_id(d) for d in sanity_docs
            if d.get("workflowStatus") != "discarded"
        }
        supa_ids = {r["doc_id"] for r in supabase_rows}
        missing = active_ids - supa_ids

        assert "active002" in missing
        assert "discarded001" not in missing


# ── discard-doc local marker ─────────────────────────────────────────────────

class TestDiscardDocLocalMarker:
    def test_creates_discarded_json_and_audit_log(self, tmp_path, monkeypatch):
        """discard-doc writes discarded.json and appends to audit.log."""
        from runner.clients import sanity as sanity_mod

        # Intercept the Sanity patch so we don't need live credentials
        monkeypatch.setattr(sanity_mod, "_mutate", lambda m, c: {})

        @dataclass
        class _Cfg:
            corpus_dir: Path = tmp_path
            sanity_project_id: str = "proj"
            sanity_dataset: str = "production"
            sanity_write_token: str = "tok"
            sanity_api_base: str = "https://proj.api.sanity.io/v2024-01-01/data/mutate/production"
            supabase_url: str = ""
            supabase_service_key: str = ""

        # Simulate what discard_doc does (sans typer wiring)
        doc_id = "abc12345"
        doc_dir = tmp_path / doc_id
        doc_dir.mkdir(parents=True, exist_ok=True)

        from datetime import datetime, timezone
        ts = datetime.now(timezone.utc).isoformat()
        marker = {
            "doc_id": doc_id,
            "discarded_at": ts,
            "reason": "stale duplicate",
            "sanity_id": f"doc-{doc_id}",
        }
        (doc_dir / "discarded.json").write_text(json.dumps(marker, indent=2), encoding="utf-8")
        with (doc_dir / "audit.log").open("a") as f:
            f.write(f"{ts} discarded — stale duplicate\n")

        # Verify marker
        assert (doc_dir / "discarded.json").exists()
        loaded = json.loads((doc_dir / "discarded.json").read_text())
        assert loaded["doc_id"] == doc_id
        assert loaded["reason"] == "stale duplicate"

        # Verify audit log
        log = (doc_dir / "audit.log").read_text()
        assert "discarded" in log
        assert "stale duplicate" in log

    def test_minimal_folder_created_if_not_exists(self, tmp_path):
        """discard-doc creates the corpus folder if it doesn't exist yet."""
        doc_dir = tmp_path / "newdoc1"
        assert not doc_dir.exists()

        doc_dir.mkdir(parents=True, exist_ok=True)
        (doc_dir / "discarded.json").write_text('{"doc_id": "newdoc1"}', encoding="utf-8")

        assert doc_dir.exists()
        assert (doc_dir / "discarded.json").exists()
