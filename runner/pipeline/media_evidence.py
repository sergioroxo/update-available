"""Helpers for lower-trust media evidence and discovery scaffolding."""
from __future__ import annotations

from urllib.parse import urlparse
import re


VIDEO_PLATFORMS = {
    "youtube.com": "youtube",
    "youtu.be": "youtube",
    "vimeo.com": "vimeo",
    "rumble.com": "rumble",
    "odysee.com": "odysee",
    "bitchute.com": "bitchute",
    "dailymotion.com": "dailymotion",
    "facebook.com": "facebook",
    "fb.watch": "facebook",
    "archive.org": "internet_archive",
}


def comment_evidence_from_ytdlp(info: dict, max_comments: int = 50) -> list[dict]:
    """Extract a bounded, relevance-sorted comments artifact from yt-dlp info.

    Comments are lower-trust social evidence. This function does not decide that
    they are analytically true or public-safe; it only prepares them for review.
    """
    comments = info.get("comments") or []
    if not isinstance(comments, list):
        return []
    rows = []
    for index, item in enumerate(comments):
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        rows.append(
            {
                "index": index,
                "commentId": item.get("id") or "",
                "author": item.get("author") or "",
                "text": text,
                "timestamp": item.get("timestamp"),
                "likeCount": item.get("like_count"),
                "replyCount": item.get("reply_count"),
                "isFavorited": bool(item.get("is_favorited", False)),
                "isPinned": bool(item.get("is_pinned", False)),
                "relevanceScore": _comment_relevance_score(item),
                "trustLevel": "lower_trust_platform_comment",
                "reviewStatus": "needs_review",
                "evidenceUse": "context_only_not_source_claim",
                "llmAnalysisStatus": "not_requested",
                "llmAnalysisProfile": "",
                "llmAnalysisResultPath": "",
            }
        )
    return sorted(
        rows,
        key=lambda r: (
            -int(r.get("isPinned", False)),
            -float(r.get("relevanceScore") or 0),
            -(int(r.get("likeCount") or 0) if str(r.get("likeCount") or "").isdigit() else 0),
        ),
    )[:max_comments]


def duplicate_candidates_from_media(info: dict, source: str) -> list[dict]:
    """Suggest possible mirrors/reuploads from explicit links in metadata."""
    candidates: list[dict] = []
    current_url = info.get("webpage_url") or source
    current_platform = platform_for_url(current_url)
    seen = {current_url}
    for url in extract_urls(info.get("description") or ""):
        if url in seen:
            continue
        seen.add(url)
        platform = platform_for_url(url)
        if platform == "other":
            continue
        candidates.append(
            {
                "url": url,
                "platform": platform,
                "relationship": "possible_duplicate_or_distribution",
                "confidence": "candidate",
                "reason": "Linked from source description metadata.",
                "sourcePlatform": current_platform,
                "titleHint": info.get("title") or "",
                "durationSeconds": info.get("duration"),
                "reviewStatus": "needs_review",
            }
        )
    return candidates


def discovery_seed_queue_from_media(info: dict, source: str) -> list[dict]:
    """Create bounded discovery seeds without autonomous ingestion."""
    seeds: list[dict] = []
    title = info.get("title") or ""
    uploader = info.get("uploader") or info.get("channel") or ""
    tags = [str(t).strip() for t in (info.get("tags") or []) if str(t).strip()]
    hashtags = extract_hashtags(info.get("description") or "")
    description = info.get("description") or ""

    def add(query: str, reason: str, seed_type: str) -> None:
        query = re.sub(r"\s+", " ", query).strip()
        if not query or any(row["query"] == query for row in seeds):
            return
        seeds.append(
            {
                "query": query,
                "seedType": seed_type,
                "reason": reason,
                "sourceUrl": info.get("webpage_url") or source,
                "sourceTitle": title,
                "reviewStatus": "needs_review",
                "autonomousIngestAllowed": False,
            }
        )

    if title:
        add(f'"{title}"', "Exact title search for mirrors, citations, and reuploads.", "exact_title")
    if title and uploader:
        add(f'"{title}" "{uploader}"', "Title plus uploader/channel search.", "title_channel")
    for tag in tags[:20]:
        add(tag, "Exposed platform tag from media metadata.", "platform_tag")
    for hashtag in hashtags[:20]:
        add(hashtag, "Hashtag found in media description.", "hashtag")
    for phrase in description_seed_phrases(description)[:3]:
        add(f'"{phrase}"', "Distinctive phrase from source description.", "description_phrase")
    for term in sogice_terms_from_text(f"{title}\n{description}")[:8]:
        add(term, "SOGICE-relevant term found in title or description.", "sogice_term")
    return seeds


def extract_urls(text: str) -> list[str]:
    return re.findall(r"https?://[^\s)>\]\"']+", text or "")


def extract_hashtags(text: str) -> list[str]:
    return sorted(set(re.findall(r"#[\w-]+", text or "")))


def description_seed_phrases(text: str) -> list[str]:
    clean = re.sub(r"https?://\S+", "", text or "")
    sentences = re.split(r"(?<=[.!?])\s+", clean)
    phrases: list[str] = []
    for sentence in sentences:
        sentence = re.sub(r"\s+", " ", sentence).strip()
        if 25 <= len(sentence) <= 140 and _non_trivial_sentence(sentence):
            phrases.append(sentence)
    return phrases


def sogice_terms_from_text(text: str) -> list[str]:
    lowered = (text or "").lower()
    terms = [
        "ex-gay",
        "conversion therapy",
        "pray away the gay",
        "same-sex attraction",
        "sexual orientation change",
        "reparative therapy",
        "change efforts",
        "healing",
        "deliverance",
        "orientation change",
    ]
    return [term for term in terms if term in lowered]


def platform_for_url(url: str) -> str:
    host = urlparse(url).netloc.lower().removeprefix("www.")
    for domain, platform in VIDEO_PLATFORMS.items():
        if domain in host:
            return platform
    return "other"


def _non_trivial_sentence(sentence: str) -> bool:
    lowered = sentence.lower()
    weak_starts = (
        "thanks to",
        "visit ",
        "follow ",
        "subscribe",
        "like ",
        "patreon",
    )
    return not lowered.startswith(weak_starts)


def _comment_relevance_score(comment: dict) -> float:
    text = str(comment.get("text") or "").lower()
    score = 0.0
    for term in (
        "conversion", "change", "ex-gay", "ex gay", "same-sex attraction",
        "homosexual", "transgender", "detrans", "testimony", "healing",
        "deliverance", "therapy", "sogice",
    ):
        if term in text:
            score += 1.0
    if comment.get("is_pinned"):
        score += 3.0
    likes = comment.get("like_count") or 0
    try:
        score += min(int(likes), 100) / 100
    except Exception:
        pass
    return round(score, 3)
