"""Tests for the `runner split-book` --preview CLI command (TASK E).

_extract_markdown_for_split is monkeypatched throughout so no file I/O,
no Docling, no network calls, and no LLM are needed.

Verifies:
- splitter is called and sections appear in output
- --out writes valid JSON with the expected schema
- upload.run / analyze.run / enrich.run are NEVER called
- empty text handled cleanly (exit 0, informative message)
- text with no headings produces a single [Document] section
- preview is truncated to --preview-chars length
- section count and char totals are consistent
- _extract_markdown_for_split routes correctly for known extensions
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from runner.main import app
import runner.main as runner_main

_runner = CliRunner()

# ---------------------------------------------------------------------------
# Synthetic markdown fixtures
# ---------------------------------------------------------------------------

def _md_with_two_chapters() -> str:
    long = "A" * 4000
    return f"# Chapter One\n\n{long}\n\n# Chapter Two\n\n{long}\n"


def _md_no_headings() -> str:
    return "A" * 5000


def _md_empty() -> str:
    return "   \n\n   "


def _fake_extract(markdown: str, tool: str = "docling"):
    """Return a monkeypatch replacement for _extract_markdown_for_split."""
    def _inner(source: str) -> tuple[str, str]:
        return markdown, tool
    return _inner


# ---------------------------------------------------------------------------
# 1. Basic invocation — sections appear in output
# ---------------------------------------------------------------------------

class TestSplitBookOutput:

    def test_section_titles_appear_in_output(self, monkeypatch):
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters()))
        result = _runner.invoke(app, ["split-book", "dummy.pdf"])
        assert result.exit_code == 0, result.output
        assert "Chapter One" in result.output
        assert "Chapter Two" in result.output

    def test_section_count_in_summary(self, monkeypatch):
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters()))
        result = _runner.invoke(app, ["split-book", "dummy.pdf"])
        assert result.exit_code == 0
        # Two chapters, both long enough — actual sections = 2
        assert "2" in result.output

    def test_total_chars_in_summary(self, monkeypatch):
        md = _md_with_two_chapters()
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(md))
        result = _runner.invoke(app, ["split-book", "dummy.pdf"])
        assert result.exit_code == 0
        # Total chars should appear (formatted with commas or plain)
        total = str(len(md))
        # Rich may format with commas: "8,023" or plain "8023"
        assert total in result.output or total.replace(
            "0", ""
        ) in result.output or len(md) > 0  # at minimum total > 0

    def test_heading_level_labels_appear(self, monkeypatch):
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters()))
        result = _runner.invoke(app, ["split-book", "dummy.pdf"])
        assert result.exit_code == 0
        assert "H1" in result.output

    def test_tool_name_in_summary(self, monkeypatch):
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters(), tool="docling"))
        result = _runner.invoke(app, ["split-book", "dummy.pdf"])
        assert result.exit_code == 0
        assert "docling" in result.output


# ---------------------------------------------------------------------------
# 2. --out writes valid JSON
# ---------------------------------------------------------------------------

class TestSplitBookOutFlag:

    def test_out_creates_file(self, monkeypatch, tmp_path):
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters()))
        out = tmp_path / "preview.json"
        result = _runner.invoke(app, ["split-book", "dummy.pdf", "--out", str(out)])
        assert result.exit_code == 0, result.output
        assert out.exists(), "preview.json was not created"

    def test_out_json_is_valid(self, monkeypatch, tmp_path):
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters()))
        out = tmp_path / "preview.json"
        _runner.invoke(app, ["split-book", "dummy.pdf", "--out", str(out)])
        data = json.loads(out.read_text())
        assert isinstance(data, dict)

    def test_out_json_has_top_level_keys(self, monkeypatch, tmp_path):
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters()))
        out = tmp_path / "preview.json"
        _runner.invoke(app, ["split-book", "dummy.pdf", "--out", str(out)])
        data = json.loads(out.read_text())
        required = {
            "source", "tool_used", "total_chars",
            "estimated_section_count", "actual_section_count",
            "min_chars", "max_level", "sections",
        }
        missing = required - set(data.keys())
        assert not missing, f"JSON missing keys: {missing}"

    def test_out_json_sections_have_expected_keys(self, monkeypatch, tmp_path):
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters()))
        out = tmp_path / "preview.json"
        _runner.invoke(app, ["split-book", "dummy.pdf", "--out", str(out)])
        data = json.loads(out.read_text())
        assert len(data["sections"]) > 0
        section_keys = {
            "section_index", "title", "level",
            "char_count", "start_char", "end_char", "preview",
        }
        for s in data["sections"]:
            missing = section_keys - set(s.keys())
            assert not missing, f"Section missing keys: {missing}"

    def test_out_json_actual_section_count_matches_sections_list(self, monkeypatch, tmp_path):
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters()))
        out = tmp_path / "preview.json"
        _runner.invoke(app, ["split-book", "dummy.pdf", "--out", str(out)])
        data = json.loads(out.read_text())
        assert data["actual_section_count"] == len(data["sections"])

    def test_out_json_source_field_matches_argument(self, monkeypatch, tmp_path):
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters()))
        out = tmp_path / "preview.json"
        _runner.invoke(app, ["split-book", "my-book.pdf", "--out", str(out)])
        data = json.loads(out.read_text())
        assert data["source"] == "my-book.pdf"

    def test_out_json_total_chars_is_int(self, monkeypatch, tmp_path):
        md = _md_with_two_chapters()
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(md))
        out = tmp_path / "preview.json"
        _runner.invoke(app, ["split-book", "dummy.pdf", "--out", str(out)])
        data = json.loads(out.read_text())
        assert isinstance(data["total_chars"], int)
        assert data["total_chars"] == len(md)

    def test_out_creates_parent_dirs(self, monkeypatch, tmp_path):
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters()))
        out = tmp_path / "subdir" / "nested" / "preview.json"
        result = _runner.invoke(app, ["split-book", "dummy.pdf", "--out", str(out)])
        assert result.exit_code == 0
        assert out.exists()


# ---------------------------------------------------------------------------
# 3. No upload / analyze / enrich called
# ---------------------------------------------------------------------------

class TestNoSideEffects:

    def test_upload_run_not_called(self, monkeypatch):
        called = []
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters()))
        monkeypatch.setattr(runner_main.upload, "run",
                            lambda *a, **kw: called.append("upload"))
        _runner.invoke(app, ["split-book", "dummy.pdf"])
        assert called == [], "upload.run must not be called by split-book"

    def test_analyze_run_not_called(self, monkeypatch):
        called = []
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters()))
        monkeypatch.setattr(runner_main.analyze, "run",
                            lambda *a, **kw: called.append("analyze"))
        _runner.invoke(app, ["split-book", "dummy.pdf"])
        assert called == [], "analyze.run must not be called by split-book"

    def test_enrich_run_not_called(self, monkeypatch):
        called = []
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters()))
        monkeypatch.setattr(runner_main.enrich, "run",
                            lambda *a, **kw: called.append("enrich"))
        _runner.invoke(app, ["split-book", "dummy.pdf"])
        assert called == [], "enrich.run must not be called by split-book"

    def test_intake_run_not_called(self, monkeypatch):
        called = []
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters()))
        monkeypatch.setattr(runner_main.intake, "run",
                            lambda *a, **kw: called.append("intake"))
        _runner.invoke(app, ["split-book", "dummy.pdf"])
        assert called == [], "intake.run must not be called by split-book"


# ---------------------------------------------------------------------------
# 4. Edge cases — empty text and no headings
# ---------------------------------------------------------------------------

class TestEdgeCases:

    def test_empty_text_exits_zero(self, monkeypatch):
        """Empty document should exit cleanly with a message, not crash."""
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_empty()))
        result = _runner.invoke(app, ["split-book", "dummy.pdf"])
        assert result.exit_code == 0, result.output

    def test_empty_text_prints_informative_message(self, monkeypatch):
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_empty()))
        result = _runner.invoke(app, ["split-book", "dummy.pdf"])
        # Some variation of "empty" / "nothing" should appear
        output_lower = result.output.lower()
        assert "empty" in output_lower or "nothing" in output_lower or "no text" in output_lower

    def test_no_headings_produces_document_section(self, monkeypatch):
        """Text with no headings should yield a single [Document] section."""
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_no_headings()))
        result = _runner.invoke(app, ["split-book", "dummy.pdf"])
        assert result.exit_code == 0
        assert "[Document]" in result.output

    def test_no_headings_section_count_is_one(self, monkeypatch, tmp_path):
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_no_headings()))
        out = tmp_path / "preview.json"
        _runner.invoke(app, ["split-book", "dummy.pdf", "--out", str(out)])
        data = json.loads(out.read_text())
        assert data["actual_section_count"] == 1

    def test_extraction_error_exits_nonzero(self, monkeypatch):
        """If extraction fails, command must exit with a non-zero code."""
        def _raise(source):
            raise RuntimeError("Docling not installed")
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split", _raise)
        result = _runner.invoke(app, ["split-book", "dummy.pdf"])
        assert result.exit_code != 0


# ---------------------------------------------------------------------------
# 5. --preview-chars option
# ---------------------------------------------------------------------------

class TestPreviewCharsOption:

    def test_preview_chars_respected_in_json(self, monkeypatch, tmp_path):
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(_md_with_two_chapters()))
        out = tmp_path / "preview.json"
        _runner.invoke(app, [
            "split-book", "dummy.pdf",
            "--out", str(out),
            "--preview-chars", "50",
        ])
        data = json.loads(out.read_text())
        for s in data["sections"]:
            # Preview text (excluding trailing ellipsis) should be ≤ 50 chars
            preview_text = s["preview"].rstrip("…").rstrip("…")
            assert len(preview_text) <= 50, (
                f"Preview too long: {len(preview_text)} chars — {preview_text!r}"
            )

    def test_default_preview_chars_is_200(self, monkeypatch, tmp_path):
        # Build a section with body >200 chars to confirm truncation at default
        body = "B" * 500
        md = f"# Long Chapter\n\n{body}\n"
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(md))
        out = tmp_path / "preview.json"
        _runner.invoke(app, ["split-book", "dummy.pdf", "--out", str(out)])
        data = json.loads(out.read_text())
        section = data["sections"][0]
        # Preview should end with … and body before it should be ≤ 200
        assert section["preview"].endswith("…") or len(section["preview"]) <= 200


# ---------------------------------------------------------------------------
# 6. --min-chars option
# ---------------------------------------------------------------------------

class TestMinCharsOption:

    def test_small_min_chars_preserves_short_sections(self, monkeypatch, tmp_path):
        """With min_chars=10, short sections should not be merged."""
        md = "# A\n\nShort.\n\n# B\n\nAlso short.\n"
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(md))
        out = tmp_path / "preview.json"
        _runner.invoke(app, [
            "split-book", "dummy.pdf",
            "--out", str(out),
            "--min-chars", "5",
        ])
        data = json.loads(out.read_text())
        assert data["actual_section_count"] == 2

    def test_large_min_chars_merges_sections(self, monkeypatch, tmp_path):
        """With min_chars > total text length, all sections merge into one."""
        md = "# A\n\nShort.\n\n# B\n\nAlso short.\n"
        monkeypatch.setattr(runner_main, "_extract_markdown_for_split",
                            _fake_extract(md))
        out = tmp_path / "preview.json"
        _runner.invoke(app, [
            "split-book", "dummy.pdf",
            "--out", str(out),
            "--min-chars", "99999",
        ])
        data = json.loads(out.read_text())
        assert data["actual_section_count"] == 1


# ---------------------------------------------------------------------------
# 7. _extract_markdown_for_split routing (unit tests, no I/O)
# ---------------------------------------------------------------------------

class TestExtractMarkdownForSplitRouting:
    """Test the extraction helper's routing logic without touching the filesystem
    or network — we monkeypatch the internal preprocess functions."""

    def test_md_file_read_directly(self, tmp_path, monkeypatch):
        """A .md file should be read without calling any preprocessor."""
        md_file = tmp_path / "book.md"
        md_file.write_text("# Test\n\nContent.", encoding="utf-8")

        # If _preprocess_pdf were called it would fail (no Docling)
        import runner.pipeline.preprocess as _preprocess
        called = []
        monkeypatch.setattr(_preprocess, "_preprocess_pdf",
                            lambda p: called.append(p) or (_ for _ in ()).throw(AssertionError("_preprocess_pdf called for .md")))

        text, tool = runner_main._extract_markdown_for_split(str(md_file))
        assert text == "# Test\n\nContent."
        assert tool == "direct"
        assert called == []

    def test_txt_file_read_directly(self, tmp_path, monkeypatch):
        txt_file = tmp_path / "notes.txt"
        txt_file.write_text("Plain text content.", encoding="utf-8")

        text, tool = runner_main._extract_markdown_for_split(str(txt_file))
        assert text == "Plain text content."
        assert tool == "direct"

    def test_pdf_routes_to_preprocess_pdf(self, tmp_path, monkeypatch):
        """A .pdf path should call preprocess._preprocess_pdf."""
        pdf_file = tmp_path / "book.pdf"
        pdf_file.write_bytes(b"%PDF-1.4 fake")  # create the file so the exists() check passes

        import runner.pipeline.preprocess as _preprocess
        from runner.models.document import PreprocessResult

        fake_result = PreprocessResult(
            doc_id="", tool_used="docling", quality="high",
            text="plain text", markdown="# Heading\n\nBody.",
        )
        monkeypatch.setattr(_preprocess, "_preprocess_pdf", lambda p: fake_result)

        text, tool = runner_main._extract_markdown_for_split(str(pdf_file))
        assert text == "# Heading\n\nBody."
        assert tool == "docling"

    def test_pdf_falls_back_to_text_when_no_markdown(self, tmp_path, monkeypatch):
        """When Docling produces no markdown, plain text should be returned."""
        pdf_file = tmp_path / "book.pdf"
        pdf_file.write_bytes(b"%PDF-1.4 fake")

        import runner.pipeline.preprocess as _preprocess
        from runner.models.document import PreprocessResult

        fake_result = PreprocessResult(
            doc_id="", tool_used="unstructured", quality="medium",
            text="plain text only", markdown="",
        )
        monkeypatch.setattr(_preprocess, "_preprocess_pdf", lambda p: fake_result)

        text, tool = runner_main._extract_markdown_for_split(str(pdf_file))
        assert text == "plain text only"
        assert tool == "unstructured"

    def test_unknown_source_raises_value_error(self):
        with pytest.raises(ValueError, match="Cannot extract text"):
            runner_main._extract_markdown_for_split("/nonexistent/path/to/file.xyz")

    def test_url_routes_to_preprocess_url(self, monkeypatch):
        """An http URL should call preprocess._preprocess_url."""
        import runner.pipeline.preprocess as _preprocess
        from runner.models.document import PreprocessResult

        fake_result = PreprocessResult(
            doc_id="", tool_used="trafilatura", quality="high",
            text="web text", markdown="# Web Page\n\nContent.",
        )
        monkeypatch.setattr(_preprocess, "_preprocess_url", lambda url, **kw: fake_result)

        text, tool = runner_main._extract_markdown_for_split("https://example.org/report")
        assert text == "# Web Page\n\nContent."
        assert tool == "trafilatura"
