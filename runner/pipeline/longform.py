"""Longform document sidecar builder.

This module creates the first backend substrate for books, reports, and other
large PDFs. It is intentionally local-only: no model calls, no network, no
Sanity/Supabase writes. The outputs are derived sidecars that can be safely
regenerated.
"""
from __future__ import annotations

import hashlib
import importlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from runner.pipeline.archive_summary import read_json_safe
from runner.pipeline.audit import current_git_commit
from runner.pipeline.citation_units import sha256_text


SCHEMA_VERSION = "longform-v0.1"
LONGFORM_SOURCE_FILENAME = "longform_source.json"
BIBLIOGRAPHIC_FILENAME = "bibliographic.json"
PAGE_MAP_FILENAME = "page_map.jsonl"
TEXT_BLOCKS_FILENAME = "text_blocks.jsonl"
LONGFORM_QUALITY_FILENAME = "longform_quality.json"

SOURCE_FILENAMES = (
    "source.pdf",
    "source.epub",
    "source.docx",
    "source.doc",
    "source.odt",
    "source.md",
    "source.txt",
    "source.html",
)


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_longform_sidecars(doc_dir: Path, *, overwrite: bool = True) -> dict[str, Any]:
    """Build longform sidecars for one corpus document directory.

    The builder prefers the original source artifact (for example
    ``source.pdf``) and falls back to ``extracted.txt`` when page-aware
    extraction is not available. Existing sidecars are overwritten by default
    because they are derived from source artifacts.
    """
    doc_dir = Path(doc_dir)
    if not doc_dir.is_dir():
        raise FileNotFoundError(doc_dir)

    doc_id = doc_dir.name
    source_path = find_source_artifact(doc_dir)
    extracted_path = doc_dir / "extracted.txt"
    intake = read_json_safe(doc_dir / "intake.json", {})
    preprocess = read_json_safe(doc_dir / "preprocess.json", {})
    analysis = read_json_safe(doc_dir / "analysis.json", {})
    source_item = read_json_safe(doc_dir / "source_item.json", {})
    offload_import = read_json_safe(doc_dir / "offload_import.json", {})

    extraction = extract_page_blocks(source_path, extracted_path, doc_id=doc_id)
    artifact = artifact_record(source_path, extracted_path)

    source_sidecar = build_longform_source(
        doc_id=doc_id,
        artifact=artifact,
        intake=intake,
        preprocess=preprocess,
        source_item=source_item,
        offload_import=offload_import,
        extraction=extraction,
    )
    bibliographic = build_bibliographic_record(
        doc_id=doc_id,
        artifact=artifact,
        intake=intake,
        preprocess=preprocess,
        analysis=analysis,
        source_item=source_item,
        offload_import=offload_import,
        extraction=extraction,
    )
    quality = build_longform_quality(
        doc_id=doc_id,
        artifact=artifact,
        extraction=extraction,
        preprocess=preprocess,
        extracted_path=extracted_path,
    )

    outputs = {
        LONGFORM_SOURCE_FILENAME: source_sidecar,
        BIBLIOGRAPHIC_FILENAME: bibliographic,
        LONGFORM_QUALITY_FILENAME: quality,
    }

    written: list[str] = []
    for filename, payload in outputs.items():
        out = doc_dir / filename
        if out.exists() and not overwrite:
            continue
        out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        written.append(filename)

    page_path = doc_dir / PAGE_MAP_FILENAME
    block_path = doc_dir / TEXT_BLOCKS_FILENAME
    if overwrite or not page_path.exists():
        write_jsonl(page_path, extraction["pages"])
        written.append(PAGE_MAP_FILENAME)
    if overwrite or not block_path.exists():
        write_jsonl(block_path, extraction["blocks"])
        written.append(TEXT_BLOCKS_FILENAME)

    return {
        "ok": True,
        "doc_id": doc_id,
        "schema_version": SCHEMA_VERSION,
        "source_artifact": artifact,
        "extraction": extraction["summary"],
        "quality": quality,
        "written": written,
        "paths": {
            "longform_source": str(doc_dir / LONGFORM_SOURCE_FILENAME),
            "bibliographic": str(doc_dir / BIBLIOGRAPHIC_FILENAME),
            "page_map": str(page_path),
            "text_blocks": str(block_path),
            "longform_quality": str(doc_dir / LONGFORM_QUALITY_FILENAME),
        },
    }


def find_source_artifact(doc_dir: Path) -> Path | None:
    for name in SOURCE_FILENAMES:
        path = Path(doc_dir) / name
        if path.is_file():
            return path
    return None


def artifact_record(source_path: Path | None, extracted_path: Path) -> dict[str, Any]:
    artifact = source_path if source_path and source_path.exists() else (extracted_path if extracted_path.exists() else None)
    if artifact is None:
        return {
            "artifact_id": "",
            "path": "",
            "filename": "",
            "mime_type": "",
            "sha256": "",
            "size_bytes": 0,
            "exists": False,
            "role": "missing",
        }
    suffix = artifact.suffix.lower()
    return {
        "artifact_id": f"file_{suffix.lstrip('.') or 'text'}_original",
        "path": str(artifact),
        "filename": artifact.name,
        "mime_type": mime_type_for_suffix(suffix),
        "sha256": sha256_file(artifact),
        "size_bytes": artifact.stat().st_size,
        "exists": True,
        "role": "source" if source_path and artifact == source_path else "canonical_extracted_text",
    }


def extract_page_blocks(source_path: Path | None, extracted_path: Path, *, doc_id: str) -> dict[str, Any]:
    if source_path and source_path.suffix.lower() == ".pdf" and source_path.exists():
        pdf_result = extract_pdf_with_pymupdf(source_path, doc_id=doc_id)
        if pdf_result["summary"]["status"] == "ok":
            return pdf_result

    if extracted_path.exists():
        return extract_from_extracted_text(extracted_path, doc_id=doc_id)

    return {
        "pages": [],
        "blocks": [],
        "summary": {
            "status": "missing_text",
            "method": "",
            "page_count": 0,
            "block_count": 0,
            "char_count": 0,
            "warnings": ["no source artifact or extracted.txt available"],
        },
    }


def extract_pdf_with_pymupdf(source_path: Path, *, doc_id: str) -> dict[str, Any]:
    try:
        fitz = importlib.import_module("fitz")
    except Exception as exc:
        return _pdf_failed("pymupdf_unavailable", str(exc))

    pages: list[dict[str, Any]] = []
    blocks: list[dict[str, Any]] = []
    warnings: list[str] = []
    global_start = 0

    try:
        pdf = fitz.open(source_path)
    except Exception as exc:
        return _pdf_failed("pdf_open_failed", str(exc))

    pdf_metadata = {}
    try:
        pdf_metadata = dict(getattr(pdf, "metadata", {}) or {})
        for page_index in range(len(pdf)):
            page = pdf[page_index]
            page_text = ""
            page_block_count = 0
            try:
                page_dict = page.get_text("dict")
            except Exception as exc:
                warnings.append(f"page_{page_index + 1}_text_failed:{exc}")
                page_dict = {"blocks": []}

            page_label = page_label_for(pdf, page_index)
            page_width = float(getattr(page.rect, "width", 0.0) or 0.0)
            page_height = float(getattr(page.rect, "height", 0.0) or 0.0)

            for block_index, block in enumerate(page_dict.get("blocks") or [], start=1):
                if not isinstance(block, dict):
                    continue
                text = text_from_pdf_block(block)
                if not text.strip():
                    continue
                text = text.rstrip()
                block_start = global_start
                block_end = block_start + len(text)
                block_id = f"b{page_index + 1:04d}_{block_index:03d}_{sha256_text(text)[:10]}"
                blocks.append({
                    "schema_version": SCHEMA_VERSION,
                    "doc_id": doc_id,
                    "block_id": block_id,
                    "page_id": f"p{page_index + 1:04d}",
                    "page_index": page_index,
                    "page_label": page_label,
                    "order": len(blocks) + 1,
                    "block_type": "paragraph",
                    "text": text,
                    "text_hash": sha256_text(text),
                    "char_start": block_start,
                    "char_end": block_end,
                    "char_count": len(text),
                    "bbox": normalize_bbox(block.get("bbox")),
                    "extractor": "pymupdf",
                    "source_artifact": source_path.name,
                    "review_state": "unreviewed",
                })
                page_block_count += 1
                page_text += (("\n\n" if page_text else "") + text)
                global_start = block_end + 2

            words_count = 0
            try:
                words_count = len(page.get_text("words") or [])
            except Exception:
                words_count = 0

            pages.append({
                "schema_version": SCHEMA_VERSION,
                "doc_id": doc_id,
                "page_id": f"p{page_index + 1:04d}",
                "page_index": page_index,
                "pdf_page_number": page_index + 1,
                "page_label": page_label,
                "width": page_width,
                "height": page_height,
                "rotation": int(getattr(page, "rotation", 0) or 0),
                "text_char_count": len(page_text),
                "word_count": words_count,
                "block_count": page_block_count,
                "text_density": round(len(page_text) / max(page_width * page_height, 1), 8),
                "has_native_text": bool(page_text.strip()),
                "ocr_used": False,
                "ocr_confidence": None,
                "extraction_status": "ok" if page_text.strip() else "no_text",
                "source_artifact": source_path.name,
            })
    finally:
        try:
            pdf.close()
        except Exception:
            pass

    empty_pages = sum(1 for page in pages if not page["has_native_text"])
    if empty_pages:
        warnings.append(f"{empty_pages}_page(s)_without_native_text")
    return {
        "pages": pages,
        "blocks": blocks,
        "summary": {
            "status": "ok",
            "method": "pymupdf",
            "page_count": len(pages),
            "block_count": len(blocks),
            "char_count": sum(int(block.get("char_count") or 0) for block in blocks),
            "empty_page_count": empty_pages,
            "warnings": warnings,
            "pdf_metadata": pdf_metadata,
        },
    }


def extract_from_extracted_text(extracted_path: Path, *, doc_id: str) -> dict[str, Any]:
    text = extracted_path.read_text(encoding="utf-8")
    block = {
        "schema_version": SCHEMA_VERSION,
        "doc_id": doc_id,
        "block_id": f"b0001_001_{sha256_text(text)[:10]}",
        "page_id": "p0001",
        "page_index": 0,
        "page_label": "",
        "order": 1,
        "block_type": "paragraph",
        "text": text,
        "text_hash": sha256_text(text),
        "char_start": 0,
        "char_end": len(text),
        "char_count": len(text),
        "bbox": [],
        "extractor": "extracted_txt_fallback",
        "source_artifact": "extracted.txt",
        "review_state": "unreviewed",
    }
    page = {
        "schema_version": SCHEMA_VERSION,
        "doc_id": doc_id,
        "page_id": "p0001",
        "page_index": 0,
        "pdf_page_number": None,
        "page_label": "",
        "width": 0,
        "height": 0,
        "rotation": 0,
        "text_char_count": len(text),
        "word_count": len(text.split()),
        "block_count": 1 if text.strip() else 0,
        "text_density": 0,
        "has_native_text": bool(text.strip()),
        "ocr_used": False,
        "ocr_confidence": None,
        "extraction_status": "fallback_extracted_txt" if text.strip() else "empty_text",
        "source_artifact": "extracted.txt",
    }
    return {
        "pages": [page],
        "blocks": [block] if text.strip() else [],
        "summary": {
            "status": "ok" if text.strip() else "empty_text",
            "method": "extracted_txt_fallback",
            "page_count": 1,
            "block_count": 1 if text.strip() else 0,
            "char_count": len(text),
            "empty_page_count": 0 if text.strip() else 1,
            "warnings": ["page_map_unavailable_used_extracted_txt_fallback"],
            "pdf_metadata": {},
        },
    }


def build_longform_source(
    *,
    doc_id: str,
    artifact: dict[str, Any],
    intake: dict[str, Any],
    preprocess: dict[str, Any],
    source_item: dict[str, Any],
    offload_import: dict[str, Any],
    extraction: dict[str, Any],
) -> dict[str, Any]:
    source_url = first_web_url(
        intake.get("source_url"),
        source_item.get("url"),
        offload_import.get("source_url"),
        intake.get("source"),
    )
    acquisition = preprocess.get("acquisition") if isinstance(preprocess.get("acquisition"), dict) else {}
    return {
        "schema_version": SCHEMA_VERSION,
        "doc_id": doc_id,
        "generated_at": utcnow_iso(),
        "generator_git_commit": current_git_commit(),
        "source_artifacts": [artifact] if artifact.get("exists") else [],
        "urls": {
            "source_url": source_url,
            "landing_page_url": first_web_url(source_item.get("url"), offload_import.get("source_url")),
            "pdf_url": source_url if str(artifact.get("mime_type")) == "application/pdf" and is_web_url(source_url) else "",
            "canonical_url": "",
            "archived_url": str(intake.get("archive_url") or ""),
            "retrieved_from": str(intake.get("source") or ""),
        },
        "acquisition": {
            "method": str(acquisition.get("fetch_tool") or preprocess.get("tool_used") or ""),
            "quality": str(preprocess.get("quality") or ""),
            "challenge": bool(acquisition.get("challenge")),
            "challenge_signal": str(acquisition.get("challenge_signal") or ""),
            "wayback_status": str(intake.get("wayback_status") or ""),
        },
        "representation": {
            "type": representation_type(artifact, extraction),
            "page_count": extraction["summary"].get("page_count", 0),
            "block_count": extraction["summary"].get("block_count", 0),
            "char_count": extraction["summary"].get("char_count", 0),
            "extraction_method": extraction["summary"].get("method", ""),
        },
        "extraction_runs": [{
            "run_id": f"longform_{utcnow_iso()}",
            "schema_version": SCHEMA_VERSION,
            "method": extraction["summary"].get("method", ""),
            "status": extraction["summary"].get("status", ""),
            "warnings": extraction["summary"].get("warnings", []),
        }],
    }


def build_bibliographic_record(
    *,
    doc_id: str,
    artifact: dict[str, Any],
    intake: dict[str, Any],
    preprocess: dict[str, Any],
    analysis: dict[str, Any],
    source_item: dict[str, Any],
    offload_import: dict[str, Any],
    extraction: dict[str, Any],
) -> dict[str, Any]:
    source_url = first_web_url(
        intake.get("source_url"),
        source_item.get("url"),
        offload_import.get("source_url"),
        intake.get("source"),
    )
    item_type = infer_item_type(artifact, analysis)
    title = str(preprocess.get("title") or analysis.get("title") or source_item.get("title") or "").strip()
    pdf_metadata = extraction["summary"].get("pdf_metadata") if isinstance(extraction["summary"].get("pdf_metadata"), dict) else {}
    title_candidate = first_title_candidate(extraction.get("blocks", []))
    if not title:
        title = str(pdf_metadata.get("title") or "").strip() or title_candidate
    title_source = (
        "preprocess_or_analysis"
        if (preprocess.get("title") or analysis.get("title") or source_item.get("title"))
        else ("pdf_metadata" if str(pdf_metadata.get("title") or "").strip() else ("first_page_candidate" if title_candidate else ""))
    )
    author = str(preprocess.get("author") or "").strip()
    if not author:
        author = str(pdf_metadata.get("author") or "").strip()
    author_source = "preprocess" if preprocess.get("author") else ("pdf_metadata" if author else "")
    isbns = extract_isbns_from_blocks(extraction.get("blocks", []))
    first_blocks = first_text_blocks(extraction.get("blocks", []), limit=12)
    return {
        "schema_version": SCHEMA_VERSION,
        "doc_id": doc_id,
        "record_type": "bibliographic_record",
        "item_type": item_type,
        "review_state": "machine_extracted",
        "titles": {
            "main": field_value(
                title,
                source=title_source,
                confidence=0.7 if title_source == "preprocess_or_analysis" else (0.45 if title else 0.0),
                review_state="unreviewed" if title_source == "preprocess_or_analysis" else ("needs_review" if title else "missing"),
            ),
            "subtitle": field_value("", source="", confidence=0.0),
            "alternate": [],
            "candidates": first_blocks[:5],
        },
        "creators": ([{
            "role": "author",
            "name": author,
            "entity_type": "",
            "identifiers": [],
            "source": author_source,
            "confidence": 0.65 if author_source == "preprocess" else 0.45,
            "review_state": "unreviewed" if author_source == "preprocess" else "needs_review",
        }] if author else []),
        "contributors": [],
        "publication": {
            "publisher": field_value("", source="", confidence=0.0),
            "place": field_value("", source="", confidence=0.0),
            "edition": field_value("", source="", confidence=0.0),
            "issued": date_field(preprocess.get("date_published") or analysis_document_date(analysis)),
            "copyright_date": field_value("", source="", confidence=0.0),
        },
        "extent": {
            "page_count_pdf": extraction["summary"].get("page_count", 0) if artifact.get("mime_type") == "application/pdf" else 0,
            "printed_page_range": "",
            "page_labels_present": any(bool(page.get("page_label")) for page in extraction.get("pages", [])),
            "text_char_count": extraction["summary"].get("char_count", 0),
        },
        "identifiers": {
            "doi": "",
            "isbn": isbns,
            "issn": [],
            "oclc": [],
            "openalex": [],
            "zotero_key": "",
            "local_accession": doc_id,
        },
        "urls": {
            "landing_page_url": first_web_url(source_item.get("url"), offload_import.get("source_url")),
            "pdf_url": source_url if artifact.get("mime_type") == "application/pdf" else "",
            "source_url": source_url,
            "canonical_url": "",
            "archived_url": str(intake.get("archive_url") or ""),
            "accessed_at": str(intake.get("ingested_at") or ""),
        },
        "container": None,
        "language": list_field(preprocess.get("languages") or preprocess.get("language_detected") or analysis.get("languages")),
        "subjects": {
            "author_keywords": [],
            "archive_tags": list_field(analysis.get("tactic")) + list_field(analysis.get("practice")),
            "machine_suggested": [],
        },
        "rights": {
            "license": "",
            "copyright_statement": "",
            "public_display_policy": "metadata_only",
        },
        "source_artifacts": [artifact] if artifact.get("exists") else [],
        "external_records": [],
        "metadata_candidates": {
            "pdf_metadata": pdf_metadata,
            "first_text_blocks": first_blocks,
            "isbn_candidates": isbns,
        },
        "crosswalks": {
            "csl_json": {},
            "dublin_core": {},
            "schema_org": {},
            "zotero": {},
        },
    }


def build_longform_quality(
    *,
    doc_id: str,
    artifact: dict[str, Any],
    extraction: dict[str, Any],
    preprocess: dict[str, Any],
    extracted_path: Path,
) -> dict[str, Any]:
    summary = extraction["summary"]
    warnings = list(summary.get("warnings") or [])
    page_count = int(summary.get("page_count") or 0)
    char_count = int(summary.get("char_count") or 0)
    preprocess_chars = int(preprocess.get("char_count") or preprocess.get("text_char_count") or 0)
    if artifact.get("mime_type") == "application/pdf" and page_count >= 50 and char_count < page_count * 500:
        warnings.append("suspiciously_short_text_for_large_pdf")
    if extracted_path.exists() and preprocess_chars and char_count and abs(preprocess_chars - char_count) > max(5000, preprocess_chars * 0.25):
        warnings.append("longform_text_count_differs_from_preprocess")
    missing_text_pages = [
        page.get("page_id") for page in extraction.get("pages", [])
        if not page.get("has_native_text")
    ]
    return {
        "schema_version": SCHEMA_VERSION,
        "doc_id": doc_id,
        "generated_at": utcnow_iso(),
        "source_artifact": artifact.get("filename", ""),
        "extraction_status": summary.get("status", ""),
        "extraction_method": summary.get("method", ""),
        "page_count": page_count,
        "block_count": int(summary.get("block_count") or 0),
        "char_count": char_count,
        "missing_text_page_count": len(missing_text_pages),
        "missing_text_pages": missing_text_pages[:100],
        "ocr_used": any(bool(page.get("ocr_used")) for page in extraction.get("pages", [])),
        "warnings": sorted(set(warnings)),
        "review_state": "unreviewed",
        "next_actions": quality_next_actions(warnings, missing_text_pages),
    }


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows),
        encoding="utf-8",
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def mime_type_for_suffix(suffix: str) -> str:
    return {
        ".pdf": "application/pdf",
        ".epub": "application/epub+zip",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc": "application/msword",
        ".odt": "application/vnd.oasis.opendocument.text",
        ".md": "text/markdown",
        ".txt": "text/plain",
        ".html": "text/html",
        ".htm": "text/html",
    }.get(suffix.lower(), "application/octet-stream")


def text_from_pdf_block(block: dict[str, Any]) -> str:
    if block.get("type") not in (0, None):
        return ""
    lines = []
    for line in block.get("lines") or []:
        spans = line.get("spans") if isinstance(line, dict) else []
        line_text = "".join(str(span.get("text") or "") for span in spans if isinstance(span, dict))
        if line_text.strip():
            lines.append(line_text.rstrip())
    return "\n".join(lines).strip()


def normalize_bbox(value: Any) -> list[float]:
    if not isinstance(value, (list, tuple)) or len(value) != 4:
        return []
    out: list[float] = []
    for item in value:
        try:
            out.append(round(float(item), 3))
        except Exception:
            return []
    return out


def page_label_for(pdf: Any, page_index: int) -> str:
    try:
        page = pdf[page_index]
        get_label = getattr(page, "get_label", None)
        if callable(get_label):
            label = str(get_label() or "").strip()
            if label:
                return label
    except Exception:
        pass
    return str(page_index + 1)


def first_web_url(*values: Any) -> str:
    for value in values:
        raw = str(value or "").strip()
        if is_web_url(raw):
            return raw
    return ""


def is_web_url(value: str) -> bool:
    try:
        parsed = urlparse(str(value or ""))
    except Exception:
        return False
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def infer_item_type(artifact: dict[str, Any], analysis: dict[str, Any]) -> str:
    fmt = str(analysis.get("format") or "").strip().lower()
    typ = str(analysis.get("type") or "").strip().lower()
    if "book" in fmt or "book" in typ:
        return "book"
    if "report" in fmt:
        return "report"
    if "article" in fmt:
        return "article"
    if artifact.get("mime_type") == "application/pdf":
        return "pdf_document"
    return "document"


def field_value(
    value: Any,
    *,
    source: str,
    confidence: float,
    review_state: str | None = None,
) -> dict[str, Any]:
    text = str(value or "").strip()
    return {
        "value": text,
        "source": source,
        "confidence": confidence,
        "review_state": review_state or ("unreviewed" if text else "missing"),
    }


def date_field(value: Any) -> dict[str, Any]:
    raw = str(value or "").strip()
    return {
        "raw": raw,
        "date_parts": [],
        "precision": "",
        "source": "preprocess_or_analysis" if raw else "",
        "confidence": 0.65 if raw else 0.0,
        "review_state": "unreviewed" if raw else "missing",
    }


def analysis_document_date(analysis: dict[str, Any]) -> str:
    doc_date = analysis.get("document_date")
    if not isinstance(doc_date, dict):
        return ""
    year = doc_date.get("year")
    if not year:
        return ""
    month = doc_date.get("month")
    day = doc_date.get("day")
    parts = [str(year)]
    if month:
        parts.append(f"{int(month):02d}")
    if day:
        parts.append(f"{int(day):02d}")
    return "-".join(parts)


def list_field(value: Any) -> list[str]:
    if value is None or value == "":
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return [str(value).strip()]


def representation_type(artifact: dict[str, Any], extraction: dict[str, Any]) -> str:
    if not artifact.get("exists"):
        return "missing"
    if artifact.get("mime_type") != "application/pdf":
        return "text_fallback" if extraction["summary"].get("method") == "extracted_txt_fallback" else "source_file"
    if extraction["summary"].get("method") != "pymupdf":
        return "pdf_without_page_map"
    empty_pages = int(extraction["summary"].get("empty_page_count") or 0)
    page_count = int(extraction["summary"].get("page_count") or 0)
    if page_count and empty_pages == page_count:
        return "scanned_or_empty_pdf"
    if empty_pages:
        return "mixed_pdf"
    return "born_digital_pdf"


def quality_next_actions(warnings: list[str], missing_text_pages: list[Any]) -> list[str]:
    actions = []
    if missing_text_pages:
        actions.append("Check whether OCR is needed for pages without native text.")
    if "suspiciously_short_text_for_large_pdf" in warnings:
        actions.append("Run a deeper PDF/OCR extraction before trusting longform analysis.")
    if "page_map_unavailable_used_extracted_txt_fallback" in warnings:
        actions.append("Install/enable a page-aware PDF extractor to build page locators.")
    return actions


def _pdf_failed(status: str, message: str) -> dict[str, Any]:
    return {
        "pages": [],
        "blocks": [],
        "summary": {
            "status": status,
            "method": "pymupdf",
            "page_count": 0,
            "block_count": 0,
            "char_count": 0,
            "warnings": [message] if message else [],
            "pdf_metadata": {},
        },
    }


def first_text_blocks(blocks: list[dict[str, Any]], *, limit: int = 12) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for block in blocks:
        text = str(block.get("text") or "").strip()
        if not text:
            continue
        out.append({
            "text": text[:500],
            "page_label": str(block.get("page_label") or ""),
            "page_index": block.get("page_index"),
            "block_id": str(block.get("block_id") or ""),
            "source": "text_blocks",
            "review_state": "candidate",
        })
        if len(out) >= limit:
            break
    return out


def first_title_candidate(blocks: list[dict[str, Any]]) -> str:
    for candidate in first_text_blocks(blocks, limit=8):
        text = str(candidate.get("text") or "").strip()
        if 3 <= len(text) <= 160 and not re.search(r"\b(printed|copyright|published|isbn)\b", text, flags=re.I):
            return text.title() if text.isupper() else text
    return ""


def extract_isbns_from_blocks(blocks: list[dict[str, Any]]) -> list[str]:
    text = "\n".join(str(block.get("text") or "") for block in blocks[:80])
    found = re.findall(r"\b(?:ISBN(?:-1[03])?:?\s*)?((?:97[89][-\s]?)?(?:\d[-\s]?){9,12}[\dXx])\b", text)
    cleaned: list[str] = []
    for raw in found:
        value = re.sub(r"[^0-9Xx]", "", raw).upper()
        if len(value) in {10, 13} and value not in cleaned:
            cleaned.append(value)
    return cleaned
