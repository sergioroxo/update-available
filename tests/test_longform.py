from __future__ import annotations

import json
from pathlib import Path

from typer.testing import CliRunner

from runner.main import app
from runner.pipeline import longform, longform_review
from runner.pipeline.archive_summary import build_archive_summary, read_json_safe


class _Config:
    def __init__(self, corpus_dir: Path, exports_dir: Path) -> None:
        self.corpus_dir = corpus_dir
        self.exports_dir = exports_dir
        self.litelm_analysis_model = "core-qwen"
        self.litelm_analysis_model_heavy = "core-gemma"
        self.litelm_analysis_model_reasoning = "review-qwen"
        self.local_analysis_model = "qwen"
        self.local_analysis_model_heavy = "gemma"
        self.local_analysis_model_reasoning = "reasoning"
        self.claude_model = "claude-test"


def _cfg(tmp_path: Path) -> _Config:
    corpus = tmp_path / "corpus"
    exports = tmp_path / "exports"
    corpus.mkdir()
    exports.mkdir()
    return _Config(corpus, exports)


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _make_doc(corpus_dir: Path, doc_id: str = "doc-book") -> Path:
    doc = corpus_dir / doc_id
    doc.mkdir(parents=True)
    _write_json(doc / "intake.json", {
        "source": "/tmp/source.pdf",
        "source_url": "https://example.org/book.pdf",
        "archive_url": "https://web.archive.org/book",
        "ingested_at": "2026-01-01T00:00:00+00:00",
    })
    _write_json(doc / "source_item.json", {
        "url": "https://example.org/book-landing",
        "title": "Landing Title",
    })
    _write_json(doc / "preprocess.json", {
        "title": "Healing Example",
        "author": "Example Author",
        "date_published": "2001",
        "languages": ["en"],
        "quality": "high",
        "tool_used": "unstructured",
        "char_count": 1200,
    })
    _write_json(doc / "analysis.json", {
        "type": "Pro-SOGICE",
        "format": "Book",
        "languages": ["en"],
        "tactic": ["Tactic: Religious Freedom Shield"],
        "practice": ["Practice: Pastoral Counselling"],
        "document_date": {"year": 2001, "month": 0, "day": 0},
    })
    return doc


def _read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def test_build_longform_sidecars_from_extracted_text_fallback(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir)
    (doc / "extracted.txt").write_text("First paragraph.\n\nSecond paragraph.", encoding="utf-8")

    result = longform.build_longform_sidecars(doc)

    assert result["ok"] is True
    assert result["extraction"]["method"] == "extracted_txt_fallback"
    assert (doc / "longform_source.json").exists()
    assert (doc / "bibliographic.json").exists()
    assert (doc / "page_map.jsonl").exists()
    assert (doc / "text_blocks.jsonl").exists()
    assert (doc / "longform_quality.json").exists()

    source = read_json_safe(doc / "longform_source.json", {})
    biblio = read_json_safe(doc / "bibliographic.json", {})
    quality = read_json_safe(doc / "longform_quality.json", {})
    pages = _read_jsonl(doc / "page_map.jsonl")
    blocks = _read_jsonl(doc / "text_blocks.jsonl")

    assert source["representation"]["type"] == "text_fallback"
    assert source["urls"]["source_url"] == "https://example.org/book.pdf"
    assert biblio["titles"]["main"]["value"] == "Healing Example"
    assert biblio["item_type"] == "book"
    assert quality["warnings"] == ["page_map_unavailable_used_extracted_txt_fallback"]
    assert len(pages) == 1
    assert len(blocks) == 1
    assert blocks[0]["source_artifact"] == "extracted.txt"

    summary = build_archive_summary(doc, config=config)
    assert summary["longform"]["exists"] is True
    assert summary["longform"]["item_type"] == "book"
    assert summary["longform"]["has_page_map"] is True
    assert summary["longform"]["has_text_blocks"] is True


def test_build_longform_sidecars_uses_pymupdf_when_available(monkeypatch, tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir)
    (doc / "source.pdf").write_bytes(b"%PDF fake")
    (doc / "extracted.txt").write_text("Fallback should not be used.", encoding="utf-8")

    class _Rect:
        width = 612
        height = 792

    class _Page:
        rect = _Rect()
        rotation = 0

        def __init__(self, text: str) -> None:
            self._text = text

        def get_label(self) -> str:
            return "i" if "Preface" in self._text else "1"

        def get_text(self, kind: str):
            if kind == "words":
                return self._text.split()
            return {
                "blocks": [{
                    "type": 0,
                    "bbox": [72, 100, 400, 140],
                    "lines": [{"spans": [{"text": self._text}]}],
                }]
            }

    class _Doc:
        def __init__(self) -> None:
            self.pages = [_Page("Preface text."), _Page("Chapter text.")]

        def __len__(self) -> int:
            return len(self.pages)

        def __getitem__(self, idx: int) -> _Page:
            return self.pages[idx]

        def close(self) -> None:
            pass

    class _Fitz:
        @staticmethod
        def open(path):
            return _Doc()

    monkeypatch.setattr(longform.importlib, "import_module", lambda name: _Fitz if name == "fitz" else None)

    result = longform.build_longform_sidecars(doc)

    assert result["extraction"]["method"] == "pymupdf"
    assert result["extraction"]["page_count"] == 2
    assert result["quality"]["warnings"] == []
    source = read_json_safe(doc / "longform_source.json", {})
    pages = _read_jsonl(doc / "page_map.jsonl")
    blocks = _read_jsonl(doc / "text_blocks.jsonl")
    assert source["representation"]["type"] == "born_digital_pdf"
    assert pages[0]["page_label"] == "i"
    assert pages[1]["page_label"] == "1"
    assert blocks[0]["bbox"] == [72.0, 100.0, 400.0, 140.0]
    assert blocks[0]["source_artifact"] == "source.pdf"


def test_build_longform_sidecars_extracts_title_and_isbn_candidates(monkeypatch, tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir)
    (doc / "source.pdf").write_bytes(b"%PDF fake")
    _write_json(doc / "source_item.json", {"url": "https://example.org/book-landing"})
    _write_json(doc / "preprocess.json", {
        "languages": ["en"],
        "quality": "high",
        "tool_used": "unstructured",
        "char_count": 1200,
    })

    class _Rect:
        width = 612
        height = 792

    class _Page:
        rect = _Rect()
        rotation = 0

        def get_label(self) -> str:
            return "1"

        def get_text(self, kind: str):
            if kind == "words":
                return ["HEALING", "HOMOSEXUALITY", "ISBN", "978-0-7657-0144-2"]
            return {
                "blocks": [
                    {
                        "type": 0,
                        "bbox": [72, 100, 400, 140],
                        "lines": [{"spans": [{"text": "HEALING HOMOSEXUALITY"}]}],
                    },
                    {
                        "type": 0,
                        "bbox": [72, 150, 400, 180],
                        "lines": [{"spans": [{"text": "ISBN 978-0-7657-0144-2"}]}],
                    },
                ]
            }

    class _Doc:
        metadata = {}

        def __len__(self) -> int:
            return 1

        def __getitem__(self, idx: int) -> _Page:
            return _Page()

        def close(self) -> None:
            pass

    class _Fitz:
        @staticmethod
        def open(path):
            return _Doc()

    monkeypatch.setattr(longform.importlib, "import_module", lambda name: _Fitz if name == "fitz" else None)

    longform.build_longform_sidecars(doc)

    biblio = read_json_safe(doc / "bibliographic.json", {})
    assert biblio["titles"]["main"]["value"] == "Healing Homosexuality"
    assert biblio["titles"]["main"]["source"] == "first_page_candidate"
    assert biblio["titles"]["main"]["review_state"] == "needs_review"
    assert biblio["identifiers"]["isbn"] == ["9780765701442"]


def test_longform_cli_builds_doc_sidecars(monkeypatch, tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir)
    (doc / "extracted.txt").write_text("CLI longform text.", encoding="utf-8")
    monkeypatch.setattr("runner.main.load_config", lambda *a, **kw: config)

    result = CliRunner().invoke(app, ["longform-build", "doc-book"])

    assert result.exit_code == 0, result.output
    assert "Longform sidecars built" in result.output
    assert (doc / "longform_source.json").exists()
    assert (doc / "bibliographic.json").exists()
    assert (doc / "page_map.jsonl").exists()
    assert (doc / "text_blocks.jsonl").exists()


def test_build_longform_sections_groups_text_blocks(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir)
    rows = [
        {
            "block_id": "doc-book-p0001-b0001",
            "page_index": 0,
            "page_label": "1",
            "text": "INTRODUCTION",
        },
        {
            "block_id": "doc-book-p0001-b0002",
            "page_index": 0,
            "page_label": "1",
            "text": "A" * 6000,
        },
        {
            "block_id": "doc-book-p0002-b0001",
            "page_index": 1,
            "page_label": "2",
            "text": "B" * 6000,
        },
    ]
    (doc / "text_blocks.jsonl").write_text(
        "".join(json.dumps(row) + "\n" for row in rows),
        encoding="utf-8",
    )

    result = longform_review.build_longform_sections(doc, max_section_chars=7000)

    assert result["section_count"] == 2
    assert result["sections"][0]["title"] == "INTRODUCTION"
    assert result["sections"][0]["page_start"] == "1"
    assert result["sections"][1]["page_start"] == "2"
    assert result["sections"][0]["block_ids"] == [
        "doc-book-p0001-b0001",
        "doc-book-p0001-b0002",
    ]
    assert result["sections"][0]["block_spans"][0]["block_id"] == "doc-book-p0001-b0001"


def test_run_longform_review_with_fake_model_writes_section_and_synthesis(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir)
    rows = [
        {
            "block_id": "doc-book-p0001-b0001",
            "page_index": 0,
            "page_label": "1",
            "text": "CHAPTER ONE\nThis section discusses reparative therapy.",
        }
    ]
    (doc / "text_blocks.jsonl").write_text(
        "".join(json.dumps(row) + "\n" for row in rows),
        encoding="utf-8",
    )
    _write_json(doc / "bibliographic.json", {
        "titles": {"main": {"value": "Healing Example"}},
    })
    _write_json(doc / "longform_quality.json", {"char_count": 52})

    calls = []

    def fake_model(system, user, llm, model, cfg):
        calls.append(user)
        if "SECTION ANALYSES JSON" in user:
            return {
                "archive_abstract": "A full-book synthesis.",
                "full_document_summary": "The reviewed section establishes the frame.",
                "coverage_statement": "All available sections were reviewed.",
                "section_overview": [],
                "bibliographic_needs": ["verify publisher"],
                "key_arguments": [],
                "sogice_contribution": [],
                "actors_networks": [],
                "lexicon_candidates": [],
                "tactics_practices": [],
                "evidence_highlights": [],
                "limitations": [],
            }
        return {
            "section_summary": "The section frames reparative therapy.",
            "sogice_relevance": "direct",
            "key_arguments": ["homosexuality is framed as changeable"],
            "actors": [],
            "terms": [{
                "term": "reparative therapy",
                "meaning_as_used": "therapy framed as repairing homosexuality",
                "evidence": "reparative therapy",
                "confidence": 0.91,
                "candidate_action": "lexicon_candidate",
            }],
            "tactics": [{
                "name": "Pathologizing developmental narrative",
                "evidence": "reparative therapy",
                "confidence": 0.8,
                "candidate_action": "tag_candidate",
            }],
            "practices": [],
            "evidence_quotes": [{"quote": "reparative therapy", "page_label": "1", "block_id": "doc-book-p0001-b0001", "note": "term"}],
            "limitations": [],
        }

    result = longform_review.run_longform_review(
        doc,
        config=config,
        llm="litelm-heavy",
        model_call=fake_model,
    )

    assert result["sections_reviewed"] == 1
    assert result["synthesis_status"] == "succeeded"
    section_rows = _read_jsonl(doc / "longform_section_analyses.jsonl")
    candidates = read_json_safe(doc / "longform_candidates.json", {})
    synthesis = read_json_safe(doc / "longform_synthesis.json", {})
    assert len(calls) == 2
    assert section_rows[0]["analysis"]["section_summary"] == "The section frames reparative therapy."
    quote = section_rows[0]["analysis"]["evidence_quotes"][0]
    assert quote["locator_status"] == "matched"
    assert quote["locator"]["block_id"] == "doc-book-p0001-b0001"
    assert candidates["candidate_count"] == 2
    assert candidates["counts_by_family"] == {"entity": 0, "lexicon": 1, "tactic": 1, "practice": 0}
    lexicon = [c for c in candidates["candidates"] if c["family"] == "lexicon"][0]
    assert lexicon["label"] == "reparative therapy"
    assert lexicon["confidence"] == 0.91
    assert lexicon["candidate_actions"] == ["lexicon_candidate"]
    assert synthesis["synthesis"]["archive_abstract"] == "A full-book synthesis."


def test_longform_review_cli_dry_run_builds_sections(monkeypatch, tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir)
    (doc / "text_blocks.jsonl").write_text(
        json.dumps({
            "block_id": "doc-book-p0001-b0001",
            "page_index": 0,
            "page_label": "1",
            "text": "A long enough block for review.",
        }) + "\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("runner.main.load_config", lambda *a, **kw: config)

    result = CliRunner().invoke(app, ["longform-review", "doc-book", "--dry-run"])

    assert result.exit_code == 0, result.output
    assert "Longform sections prepared" in result.output
    assert (doc / "longform_sections.json").exists()
    assert not (doc / "longform_section_analyses.jsonl").exists()
