"""
Book chapter splitting for large PDFs.

Uses the Markdown headings from Docling's extracted.md to split a book
into sections suitable for individual ingestion.

Short sections (below min_chars) are merged forward into the following
section so the LLM analysis prompt receives a meaningful chunk.
"""
from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class BookSection:
    title: str
    level: int          # 0 = preamble/no-heading, 1 = H1, 2 = H2, ...
    text: str
    section_index: int  # 1-based position after merging
    start_char: int     # character offset in original markdown
    end_char: int


_HEADING_RE = re.compile(r'^(#+)\s+(.+?)[ \t]*$', re.MULTILINE)
_FENCE_OPEN_RE = re.compile(r'^(`{3,}|~{3,})')
_FENCE_CLOSE_RE = re.compile(r'^(`{3,}|~{3,})[ \t]*$')


def _fence_ranges(text: str) -> list[tuple[int, int]]:
    """Return (start, end) char ranges of fenced code blocks (``` or ~~~).

    Prevents headings inside code examples from being treated as split points.
    Unclosed fences are ignored -- the rest of the document is treated as prose.
    """
    ranges: list[tuple[int, int]] = []
    fence_start: int | None = None
    fence_char: str | None = None
    fence_len: int = 0
    pos = 0
    for line in text.splitlines(keepends=True):
        if fence_start is None:
            m = _FENCE_OPEN_RE.match(line)
            if m:
                fence_start = pos
                fence_char = m.group(1)[0]
                fence_len = len(m.group(1))
        else:
            m = _FENCE_CLOSE_RE.match(line)
            if m and m.group(1)[0] == fence_char and len(m.group(1)) >= fence_len:
                ranges.append((fence_start, pos + len(line)))
                fence_start = None
                fence_char = None
                fence_len = 0
        pos += len(line)
    return ranges


def _in_fence(pos: int, ranges: list[tuple[int, int]]) -> bool:
    return any(start <= pos < end for start, end in ranges)


def split_by_headings(
    markdown: str,
    min_chars: int = 3000,
    max_level: int = 2,
) -> list[BookSection]:
    """Split Docling-extracted markdown at heading boundaries.

    Sections shorter than min_chars are merged into the following section.
    Returns sections in document order with 1-based section_index.
    """
    split_points: list[tuple[int, int, str]] = []  # (char_pos, level, title)
    fence_ranges = _fence_ranges(markdown)
    for m in _HEADING_RE.finditer(markdown):
        if _in_fence(m.start(), fence_ranges):
            continue
        level = len(m.group(1))
        if level <= max_level:
            split_points.append((m.start(), level, m.group(2).strip()))

    if not split_points:
        if not markdown.strip():
            return []
        return [BookSection(
            title="[Document]",
            level=0,
            text=markdown,
            section_index=1,
            start_char=0,
            end_char=len(markdown),
        )]

    raw: list[BookSection] = []

    preamble = markdown[:split_points[0][0]]
    if preamble.strip():
        raw.append(BookSection(
            title="[Preamble]",
            level=0,
            text=preamble,
            section_index=0,
            start_char=0,
            end_char=split_points[0][0],
        ))

    for i, (start, level, title) in enumerate(split_points):
        end = split_points[i + 1][0] if i + 1 < len(split_points) else len(markdown)
        raw.append(BookSection(
            title=title,
            level=level,
            text=markdown[start:end],
            section_index=0,
            start_char=start,
            end_char=end,
        ))

    merged = merge_short_sections(raw, min_chars)
    return [
        BookSection(
            title=s.title,
            level=s.level,
            text=s.text,
            section_index=i + 1,
            start_char=s.start_char,
            end_char=s.end_char,
        )
        for i, s in enumerate(merged)
    ]


def merge_short_sections(
    sections: list[BookSection],
    min_chars: int,
) -> list[BookSection]:
    """Merge consecutive sections that are individually too short.

    A short section is merged forward into the following section; the
    following section's title and level are preserved. The last section
    is never merged backward -- it is kept as-is if short.
    """
    if not sections:
        return []

    result: list[BookSection] = []
    i = 0
    while i < len(sections):
        current = sections[i]
        while len(current.text) < min_chars and i + 1 < len(sections):
            nxt = sections[i + 1]
            current = BookSection(
                title=nxt.title,
                level=nxt.level,
                text=current.text + nxt.text,
                section_index=current.section_index,
                start_char=current.start_char,
                end_char=nxt.end_char,
            )
            i += 1
        result.append(current)
        i += 1
    return result


def estimate_section_count(markdown: str, max_level: int = 2) -> int:
    """Estimate the section count that split_by_headings would produce.

    Returns:
      0  -- empty or whitespace-only markdown
      1  -- non-empty markdown with no counted headings
      n  -- n counted headings, plus 1 if non-empty content precedes the first
    """
    if not markdown.strip():
        return 0

    fence_ranges = _fence_ranges(markdown)
    first_pos: int | None = None
    count = 0
    for m in _HEADING_RE.finditer(markdown):
        if _in_fence(m.start(), fence_ranges):
            continue
        if len(m.group(1)) <= max_level:
            if first_pos is None:
                first_pos = m.start()
            count += 1

    if count == 0:
        return 1

    if first_pos is not None and markdown[:first_pos].strip():
        count += 1

    return count
