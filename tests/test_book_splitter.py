"""Tests for runner/pipeline/book_splitter.py.

All tests are pure Python -- no network calls, no LLM, no filesystem.
Fixtures use small synthetic markdown strings that mimic Docling ATX output.
"""
from __future__ import annotations

import pytest

from runner.pipeline.book_splitter import (
    BookSection,
    estimate_section_count,
    merge_short_sections,
    split_by_headings,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _long(n: int = 4000) -> str:
    """Return filler prose of at least n characters."""
    word = "Lorem ipsum dolor sit amet. "
    return (word * (n // len(word) + 1))[:n]


def _raw_section(title: str, text: str, level: int = 1, index: int = 1) -> BookSection:
    """Build a BookSection without worrying about char offsets."""
    return BookSection(
        title=title,
        level=level,
        text=text,
        section_index=index,
        start_char=0,
        end_char=len(text),
    )


# ---------------------------------------------------------------------------
# H1 / H2 splitting -- basic cases
# ---------------------------------------------------------------------------

def test_split_h1_only():
    md = f"# Chapter 1\n\n{_long()}\n\n# Chapter 2\n\n{_long()}\n"
    sections = split_by_headings(md, min_chars=100)
    assert len(sections) == 2
    assert sections[0].title == "Chapter 1"
    assert sections[0].level == 1
    assert sections[1].title == "Chapter 2"
    assert sections[1].level == 1


def test_split_h1_and_h2():
    md = (
        f"# Chapter 1\n\n{_long()}\n\n"
        f"## 1.1 Sub-section\n\n{_long()}\n\n"
        f"# Chapter 2\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=100)
    assert len(sections) == 3
    assert sections[0].title == "Chapter 1"
    assert sections[0].level == 1
    assert sections[1].title == "1.1 Sub-section"
    assert sections[1].level == 2
    assert sections[2].title == "Chapter 2"
    assert sections[2].level == 1


# ---------------------------------------------------------------------------
# Numbered chapters
# ---------------------------------------------------------------------------

def test_numbered_chapters_colon_style():
    md = (
        f"# Chapter 1: Historical Background\n\n{_long()}\n\n"
        f"# Chapter 2: Theological Frameworks\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=100)
    assert len(sections) == 2
    assert sections[0].title == "Chapter 1: Historical Background"
    assert sections[1].title == "Chapter 2: Theological Frameworks"


def test_numbered_subsections():
    md = (
        f"# 1. Origins\n\n{_long()}\n\n"
        f"## 1.1 Early history\n\n{_long()}\n\n"
        f"## 1.2 Consolidation\n\n{_long()}\n\n"
        f"# 2. Modern period\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=100)
    assert len(sections) == 4
    assert sections[0].title == "1. Origins"
    assert sections[1].title == "1.1 Early history"
    assert sections[2].title == "1.2 Consolidation"
    assert sections[3].title == "2. Modern period"


# ---------------------------------------------------------------------------
# Unnumbered sections
# ---------------------------------------------------------------------------

def test_unnumbered_sections():
    md = (
        f"## Introduction\n\n{_long()}\n\n"
        f"## Methods\n\n{_long()}\n\n"
        f"## Conclusion\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=100)
    assert len(sections) == 3
    assert [s.title for s in sections] == ["Introduction", "Methods", "Conclusion"]


def test_mix_numbered_and_unnumbered():
    md = (
        f"# Introduction\n\n{_long()}\n\n"
        f"## Background\n\n{_long()}\n\n"
        f"# Part I: Theory\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=100)
    assert len(sections) == 3
    assert sections[2].title == "Part I: Theory"


# ---------------------------------------------------------------------------
# Preamble handling
# ---------------------------------------------------------------------------

def test_long_preamble_becomes_own_section():
    preamble = _long(500)
    md = f"{preamble}\n\n# Chapter 1\n\n{_long()}\n"
    sections = split_by_headings(md, min_chars=200)
    assert sections[0].title == "[Preamble]"
    assert sections[0].level == 0
    assert sections[1].title == "Chapter 1"


def test_short_preamble_merged_into_first_chapter():
    preamble = "Short preamble content.\n\n"
    md = f"{preamble}# Chapter 1\n\n{_long()}\n"
    sections = split_by_headings(md, min_chars=500)
    assert len(sections) == 1
    assert sections[0].title == "Chapter 1"
    assert preamble in sections[0].text


def test_no_preamble_when_doc_starts_with_heading():
    md = f"# Chapter 1\n\n{_long()}\n\n# Chapter 2\n\n{_long()}\n"
    sections = split_by_headings(md, min_chars=100)
    assert all(s.title != "[Preamble]" for s in sections)
    assert len(sections) == 2


def test_whitespace_only_preamble_not_treated_as_section():
    md = f"\n\n\n# Chapter 1\n\n{_long()}\n"
    sections = split_by_headings(md, min_chars=100)
    assert sections[0].title == "Chapter 1"
    assert len(sections) == 1


# ---------------------------------------------------------------------------
# Short section merging
# ---------------------------------------------------------------------------

def test_short_section_merged_forward():
    short = "Brief section content.\n\n"
    md = (
        f"# Preface\n\n{short}"
        f"# Chapter 1\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=500)
    assert len(sections) == 1
    assert sections[0].title == "Chapter 1"
    assert "Preface" in sections[0].text


def test_multiple_consecutive_short_sections_merged_forward():
    short = "Brief.\n\n"
    md = (
        f"# Chapter 1\n\n{short}"
        f"# Chapter 2\n\n{short}"
        f"# Chapter 3\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=500)
    assert len(sections) == 1
    assert sections[0].title == "Chapter 3"
    assert "Chapter 1" in sections[0].text
    assert "Chapter 2" in sections[0].text


def test_last_short_section_kept_as_is():
    md = (
        f"# Chapter 1\n\n{_long()}\n\n"
        f"# Chapter 2\n\nShort ending.\n"
    )
    sections = split_by_headings(md, min_chars=500)
    assert len(sections) == 2
    assert sections[1].title == "Chapter 2"


def test_merge_short_sections_standalone():
    sections = [
        _raw_section("A", "x" * 50, index=1),
        _raw_section("B", "y" * 50, index=2),
        _raw_section("C", "z" * 5000, index=3),
    ]
    result = merge_short_sections(sections, min_chars=200)
    assert len(result) == 1
    assert result[0].title == "C"


def test_merge_short_sections_empty_input():
    assert merge_short_sections([], min_chars=100) == []


def test_merge_short_sections_single_section():
    s = _raw_section("A", "x" * 50)
    result = merge_short_sections([s], min_chars=100)
    assert len(result) == 1
    assert result[0].title == "A"


# ---------------------------------------------------------------------------
# No-headings fallback
# ---------------------------------------------------------------------------

def test_no_headings_returns_single_document_section():
    md = _long(500)
    sections = split_by_headings(md, min_chars=100)
    assert len(sections) == 1
    assert sections[0].title == "[Document]"
    assert sections[0].level == 0
    assert sections[0].section_index == 1
    assert sections[0].text == md


def test_empty_string_returns_empty_list():
    assert split_by_headings("") == []


def test_whitespace_only_returns_empty_list():
    assert split_by_headings("   \n\n  \t  \n") == []


# ---------------------------------------------------------------------------
# Non-English headings
# ---------------------------------------------------------------------------

def test_german_headings():
    md = (
        f"# Kapitel 1: Historischer Hintergrund\n\n{_long()}\n\n"
        f"# Kapitel 2: Theologische Rahmen\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=100)
    assert sections[0].title == "Kapitel 1: Historischer Hintergrund"
    assert sections[1].title == "Kapitel 2: Theologische Rahmen"


def test_french_headings():
    md = (
        f"# Chapitre 1 : Introduction\n\n{_long()}\n\n"
        f"## 1.1 Contexte historique\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=100)
    assert sections[0].title == "Chapitre 1 : Introduction"
    assert sections[1].title == "1.1 Contexte historique"


def test_spanish_headings():
    md = (
        f"# Capítulo 1: Antecedentes históricos\n\n{_long()}\n\n"
        f"# Capítulo 2: Marcos teológicos\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=100)
    assert sections[0].title == "Capítulo 1: Antecedentes históricos"
    assert sections[1].title == "Capítulo 2: Marcos teológicos"


# ---------------------------------------------------------------------------
# Roman numeral chapters
# ---------------------------------------------------------------------------

def test_roman_numeral_chapters():
    md = (
        f"# I. Historical Background\n\n{_long()}\n\n"
        f"# II. Theological Frameworks\n\n{_long()}\n\n"
        f"# III. Policy Responses\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=100)
    assert len(sections) == 3
    assert sections[0].title == "I. Historical Background"
    assert sections[1].title == "II. Theological Frameworks"
    assert sections[2].title == "III. Policy Responses"


def test_roman_numeral_with_h2():
    md = (
        f"# I. Introduction\n\n{_long()}\n\n"
        f"## I.A Background\n\n{_long()}\n\n"
        f"# II. Methods\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=100)
    assert len(sections) == 3
    assert sections[1].title == "I.A Background"
    assert sections[1].level == 2


# ---------------------------------------------------------------------------
# max_level filtering
# ---------------------------------------------------------------------------

def test_h3_not_split_at_max_level_2():
    md = (
        f"# Chapter 1\n\n{_long()}\n\n"
        f"### 1.1.1 Deep subsection\n\n{_long()}\n\n"
        f"# Chapter 2\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=100, max_level=2)
    assert len(sections) == 2
    assert sections[0].title == "Chapter 1"
    assert "1.1.1 Deep subsection" in sections[0].text
    assert sections[1].title == "Chapter 2"


def test_max_level_1_ignores_h2():
    md = (
        f"# Part I\n\n{_long()}\n\n"
        f"## Chapter 1\n\n{_long()}\n\n"
        f"## Chapter 2\n\n{_long()}\n\n"
        f"# Part II\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=100, max_level=1)
    assert len(sections) == 2
    assert sections[0].title == "Part I"
    assert sections[1].title == "Part II"
    assert "Chapter 1" in sections[0].text
    assert "Chapter 2" in sections[0].text


def test_max_level_3_splits_at_h3():
    md = (
        f"# Chapter 1\n\n{_long()}\n\n"
        f"### 1.1.1 Sub-subsection\n\n{_long()}\n\n"
        f"# Chapter 2\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=100, max_level=3)
    assert len(sections) == 3
    assert sections[1].title == "1.1.1 Sub-subsection"
    assert sections[1].level == 3


# ---------------------------------------------------------------------------
# Section metadata correctness
# ---------------------------------------------------------------------------

def test_section_index_is_1_based():
    md = f"# A\n\n{_long()}\n\n# B\n\n{_long()}\n\n# C\n\n{_long()}\n"
    sections = split_by_headings(md, min_chars=100)
    assert [s.section_index for s in sections] == [1, 2, 3]


def test_section_indices_sequential_after_merge():
    short = "Brief.\n\n"
    md = (
        f"# Chapter 1\n\n{short}"
        f"# Chapter 2\n\n{_long()}\n\n"
        f"# Chapter 3\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=500)
    assert [s.section_index for s in sections] == [1, 2]


def test_section_text_includes_heading():
    md = f"# Chapter 1\n\n{_long()}\n"
    sections = split_by_headings(md, min_chars=100)
    assert "# Chapter 1" in sections[0].text


def test_section_boundaries_cover_full_document():
    md = f"# Chapter 1\n\n{_long()}\n\n# Chapter 2\n\n{_long()}\n"
    sections = split_by_headings(md, min_chars=100)
    assert sections[0].start_char == 0
    assert sections[-1].end_char == len(md)
    assert "".join(s.text for s in sections) == md


def test_merged_sections_cover_full_document():
    short = "Brief.\n\n"
    md = (
        f"# Chapter 1\n\n{short}"
        f"# Chapter 2\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=500)
    assert sections[0].start_char == 0
    assert sections[-1].end_char == len(md)
    assert "".join(s.text for s in sections) == md


def test_heading_trailing_whitespace_stripped():
    md = f"# Chapter 1   \n\n{_long()}\n"
    sections = split_by_headings(md, min_chars=100)
    assert sections[0].title == "Chapter 1"


# ---------------------------------------------------------------------------
# estimate_section_count
# ---------------------------------------------------------------------------

def test_estimate_count_h1():
    md = "# A\n\ncontent\n\n# B\n\ncontent\n\n# C\n\ncontent\n"
    assert estimate_section_count(md, max_level=2) == 3


def test_estimate_count_filters_deep():
    md = "# A\n\n## A1\n\n### A1a\n\ncontent\n"
    assert estimate_section_count(md, max_level=2) == 2
    assert estimate_section_count(md, max_level=1) == 1


def test_estimate_count_empty_returns_0():
    assert estimate_section_count("") == 0


def test_estimate_count_whitespace_only_returns_0():
    assert estimate_section_count("   \n\n  \t  \n") == 0


def test_estimate_count_nonempty_no_headings_returns_1():
    assert estimate_section_count("no headings here") == 1
    assert estimate_section_count(_long(500)) == 1


def test_estimate_count_starts_with_heading_no_preamble():
    md = f"# A\n\n{_long()}\n\n# B\n\n{_long()}\n"
    assert estimate_section_count(md) == 2


def test_estimate_count_preamble_plus_two_headings():
    md = f"{_long(200)}\n\n# Chapter 1\n\n{_long()}\n\n# Chapter 2\n\n{_long()}\n"
    assert estimate_section_count(md) == 3


def test_estimate_count_matches_split_count():
    md = (
        f"# Chapter 1\n\n{_long()}\n\n"
        f"## 1.1 Sub\n\n{_long()}\n\n"
        f"# Chapter 2\n\n{_long()}\n"
    )
    count = estimate_section_count(md, max_level=2)
    sections = split_by_headings(md, min_chars=100)
    assert count == len(sections)


# ---------------------------------------------------------------------------
# Fenced code block handling
# ---------------------------------------------------------------------------

def test_heading_in_backtick_fence_not_a_split_point():
    md = (
        f"# Chapter 1\n\n{_long()}\n\n"
        "```\n# This looks like a heading but is inside a code fence\n```\n\n"
        f"# Chapter 2\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=100)
    assert len(sections) == 2
    assert sections[0].title == "Chapter 1"
    assert sections[1].title == "Chapter 2"


def test_heading_in_tilde_fence_not_a_split_point():
    md = (
        f"# Chapter 1\n\n{_long()}\n\n"
        "~~~\n# Not a real heading\n~~~\n\n"
        f"# Chapter 2\n\n{_long()}\n"
    )
    sections = split_by_headings(md, min_chars=100)
    assert len(sections) == 2
    assert sections[0].title == "Chapter 1"
    assert sections[1].title == "Chapter 2"


def test_estimate_count_ignores_heading_in_fence():
    md = (
        f"# Chapter 1\n\n{_long()}\n\n"
        "```python\n# comment, not a heading\n```\n\n"
        f"# Chapter 2\n\n{_long()}\n"
    )
    assert estimate_section_count(md) == 2
