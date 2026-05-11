"""Timed transcript parsing and comparison helpers."""
from __future__ import annotations

from difflib import SequenceMatcher
import hashlib
import re


def parse_timed_text(raw: str, source_format: str = "srt") -> list[dict]:
    """Parse SRT/VTT into timestamped chunks.

    The parser is intentionally forgiving because YouTube, exported SRT tools,
    and hand-edited transcripts all vary a little in cue formatting.
    """
    text = raw.replace("\ufeff", "").replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"^WEBVTT.*?\n\n", "", text, flags=re.DOTALL)
    blocks = re.split(r"\n\s*\n", text.strip())
    chunks: list[dict] = []
    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue
        if lines and re.fullmatch(r"\d+", lines[0]):
            lines = lines[1:]
        if not lines:
            continue
        timestamp_index = next((i for i, line in enumerate(lines) if "-->" in line), -1)
        if timestamp_index < 0:
            continue
        start, end = _parse_timestamp_line(lines[timestamp_index])
        cue_text = " ".join(lines[timestamp_index + 1 :]).strip()
        cue_text = clean_caption_text(cue_text)
        if not cue_text:
            continue
        chunks.append(
            {
                "index": len(chunks),
                "start": start,
                "end": end,
                "text": cue_text,
                "sourceFormat": source_format,
            }
        )
    return chunks


def chunks_to_text(chunks: list[dict], include_timestamps: bool = True) -> str:
    lines: list[str] = []
    for chunk in chunks:
        text = clean_caption_text(str(chunk.get("text", "")))
        if not text:
            continue
        if include_timestamps and chunk.get("start"):
            lines.append(f"[{chunk.get('start')} --> {chunk.get('end', '')}] {text}")
        else:
            lines.append(text)
    return "\n".join(lines).strip()


def deoverlap_caption_chunks(chunks: list[dict], min_overlap_words: int = 3) -> list[dict]:
    """Remove rolling-window overlap from auto-caption cue text.

    Some platform auto-captions, especially YouTube VTT, emit cues as a rolling
    phrase window:

        "I am Dr. X"
        "I am Dr. X founder of Y"
        "founder of Y Institute"

    Joining those cues directly creates an inflated transcript. This helper
    keeps timestamps but replaces each cue's text with only the new suffix when
    the current cue begins with at least `min_overlap_words` from the previous
    raw cue. Empty duplicate cues are dropped.
    """
    cleaned: list[dict] = []
    previous_text = ""
    for chunk in chunks:
        text = clean_caption_text(str(chunk.get("text", "")))
        if not text:
            continue
        deduped = _remove_previous_overlap(previous_text, text, min_overlap_words)
        previous_text = text
        if not deduped:
            continue
        next_chunk = dict(chunk)
        next_chunk["index"] = len(cleaned)
        next_chunk["text"] = deduped
        if deduped != text:
            next_chunk["overlapTrimmed"] = True
        cleaned.append(next_chunk)
    return cleaned


def clean_caption_text(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\{\\.*?\}", "", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _remove_previous_overlap(previous: str, current: str, min_overlap_words: int) -> str:
    if not previous or not current:
        return current

    previous_tokens = _caption_tokens(previous)
    current_tokens = _caption_tokens(current)
    if not previous_tokens or not current_tokens:
        return current

    max_overlap = min(len(previous_tokens), len(current_tokens))
    overlap = 0
    for size in range(max_overlap, min_overlap_words - 1, -1):
        previous_tail = [token[0] for token in previous_tokens[-size:]]
        current_head = [token[0] for token in current_tokens[:size]]
        if previous_tail == current_head:
            overlap = size
            break

    if not overlap:
        return current
    if overlap >= len(current_tokens):
        return ""
    return current[current_tokens[overlap][1]:].strip()


def _caption_tokens(text: str) -> list[tuple[str, int]]:
    tokens: list[tuple[str, int]] = []
    for match in re.finditer(r"\S+", text):
        normalised = re.sub(r"(^[^\w]+|[^\w]+$)", "", match.group(0).lower())
        if normalised:
            tokens.append((normalised, match.start()))
    return tokens


def transcript_version(
    label: str,
    chunks: list[dict],
    language: str = "",
    source: str = "",
    kind: str = "",
) -> dict:
    text = chunks_to_text(chunks, include_timestamps=False)
    return {
        "label": label,
        "language": language,
        "source": source,
        "kind": kind,
        "chunkCount": len(chunks),
        "charCount": len(text),
        "textHash": sha256_text(text),
    }


def compare_transcript_versions(versions: list[dict], texts_by_label: dict[str, str]) -> dict:
    comparisons: list[dict] = []
    for i, left in enumerate(versions):
        for right in versions[i + 1 :]:
            left_label = left.get("label", "")
            right_label = right.get("label", "")
            left_text = texts_by_label.get(left_label, "")
            right_text = texts_by_label.get(right_label, "")
            comparisons.append(
                {
                    "left": left_label,
                    "right": right_label,
                    "sameHash": bool(left.get("textHash") and left.get("textHash") == right.get("textHash")),
                    "similarity": round(_similarity(left_text, right_text), 4),
                    "charDelta": int(left.get("charCount") or 0) - int(right.get("charCount") or 0),
                    "chunkDelta": int(left.get("chunkCount") or 0) - int(right.get("chunkCount") or 0),
                }
            )
    return {"versionCount": len(versions), "comparisons": comparisons}


def diff_transcript_chunks(
    left_chunks: list[dict],
    right_chunks: list[dict],
    context_lines: int = 1,
) -> list[dict]:
    """Produce a cue-level diff between two parsed transcript chunk lists.

    Each item in the returned list has:
      op        — "equal" | "replace" | "insert" | "delete"
      leftCues  — list of cue dicts from left_chunks (empty for "insert")
      rightCues — list of cue dicts from right_chunks (empty for "delete")
      regionStart / regionEnd — timestamp range of the changed region (from the
                                non-empty side, or left if both present)

    Consecutive equal blocks are collapsed to at most `context_lines` cues on
    each side, keeping the diff human-reviewable even at 160 chunks.
    """
    left_texts = [clean_caption_text(c.get("text", "")) for c in left_chunks]
    right_texts = [clean_caption_text(c.get("text", "")) for c in right_chunks]

    matcher = SequenceMatcher(None, left_texts, right_texts, autojunk=False)
    opcodes = matcher.get_opcodes()

    regions: list[dict] = []
    for tag, i1, i2, j1, j2 in opcodes:
        lc = left_chunks[i1:i2]
        rc = right_chunks[j1:j2]
        if tag == "equal":
            if context_lines and lc:
                keep = lc[:context_lines]
                regions.append(
                    {
                        "op": "equal",
                        "leftCues": keep,
                        "rightCues": rc[:context_lines],
                        "collapsed": max(0, len(lc) - context_lines),
                        "regionStart": keep[0].get("start", ""),
                        "regionEnd": keep[-1].get("end", ""),
                    }
                )
        else:
            anchor = lc if lc else rc
            regions.append(
                {
                    "op": tag,
                    "leftCues": lc,
                    "rightCues": rc,
                    "collapsed": 0,
                    "regionStart": anchor[0].get("start", "") if anchor else "",
                    "regionEnd": anchor[-1].get("end", "") if anchor else "",
                }
            )
    return regions


def sha256_text(text: str) -> str:
    normalised = re.sub(r"\s+", " ", text).strip()
    return hashlib.sha256(normalised.encode("utf-8")).hexdigest()


def _parse_timestamp_line(line: str) -> tuple[str, str]:
    line = re.sub(r"\s+align:.*$", "", line)
    parts = [part.strip() for part in line.split("-->", 1)]
    if len(parts) != 2:
        return "", ""
    return _normalise_timestamp(parts[0]), _normalise_timestamp(parts[1].split()[0])


def _normalise_timestamp(value: str) -> str:
    value = value.replace(",", ".")
    if re.fullmatch(r"\d{1,2}:\d{2}\.\d{3}", value):
        value = "00:" + value
    return value


def _similarity(left: str, right: str) -> float:
    if not left and not right:
        return 1.0
    if not left or not right:
        return 0.0
    return SequenceMatcher(None, left[:200_000], right[:200_000]).ratio()
