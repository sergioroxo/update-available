"""Route verified semantic proposals into the established local review files."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Iterable

from runner.pipeline.atomic_io import atomic_write_bytes
from runner.pipeline.factory_messages import canonical_json_bytes


PROPOSAL_FAMILIES = {
    "lexicon_proposals": ("term",),
    "entity_proposals": ("name", "entity_type"),
    "tactic_proposals": ("tactic",),
    "practice_descriptions": ("practice_id",),
}


def _proposal_identity(family: str, document_id: str, item: dict[str, Any]) -> str:
    fields = PROPOSAL_FAMILIES[family]
    values = [str(item.get(field) or "").strip().casefold() for field in fields]
    if any(not value for value in values):
        raise ValueError("returned proposal is missing its existing queue identity fields")
    seed = json.dumps(
        [family, document_id, *values], ensure_ascii=False, separators=(",", ":"),
    ).encode("utf-8")
    return f"semantic-{hashlib.sha256(seed).hexdigest()[:24]}"


def preview_returned_proposals(review: dict[str, Any]) -> tuple[dict[str, Any], ...]:
    """Project proposal candidates without writing or promoting anything."""
    if review.get("campaign_state") != "already_complete_read_only":
        raise ValueError("semantic results must be verified and complete before proposal review")
    campaign_id = str(
        (review.get("execution") or {}).get("run_id") or review.get("run_id") or ""
    )
    candidates = []
    enrichments = review.get("enrichment") or {}
    for document_id, enrichment in sorted(enrichments.items()):
        if not isinstance(enrichment, dict) or enrichment.get("document_id") != document_id:
            raise ValueError("returned Enrichment document identity mismatch")
        for family in PROPOSAL_FAMILIES:
            rows = enrichment.get(family) or []
            if not isinstance(rows, list):
                raise ValueError("returned proposal family is malformed")
            for row in rows:
                if not isinstance(row, dict):
                    raise ValueError("returned proposal is malformed")
                proposal_id = _proposal_identity(family, document_id, row)
                candidates.append({
                    "proposal_id": proposal_id,
                    "source_campaign_id": campaign_id,
                    "document_id": document_id,
                    "family": family,
                    "proposal": row,
                    "provisional": True,
                    "automatic_promotion": False,
                })
    ids = [row["proposal_id"] for row in candidates]
    if len(ids) != len(set(ids)):
        raise ValueError("returned proposal set contains duplicate identities")
    return tuple(candidates)


def route_returned_proposals(
    *, corpus_root: Path, review: dict[str, Any], accepted_proposal_ids: Iterable[str],
) -> dict[str, Any]:
    """Explicitly append accepted proposals to existing ``enrichment.json`` queues.

    All candidates and all target files are validated before the first write.
    Existing active identities and prior semantic proposal IDs are idempotently
    skipped.  The adapter never approves, promotes, imports, or performs a
    remote write.
    """
    candidates = preview_returned_proposals(review)
    accepted = tuple(dict.fromkeys(str(value) for value in accepted_proposal_ids))
    by_id = {row["proposal_id"]: row for row in candidates}
    unknown = sorted(set(accepted) - set(by_id))
    if unknown:
        raise ValueError("accepted proposal identity is absent from verified results")
    root = Path(corpus_root)
    planned: dict[Path, dict[str, Any]] = {}
    changed_paths: set[Path] = set()
    routed = []
    duplicates = []
    for proposal_id in accepted:
        candidate = by_id[proposal_id]
        document_dir = root / candidate["document_id"]
        if document_dir.parent.resolve() != root.resolve() or not document_dir.is_dir():
            raise ValueError("proposal target document is not present in the local corpus")
        path = document_dir / "enrichment.json"
        if path.is_symlink():
            raise ValueError("proposal target enrichment file is unsafe")
        if path not in planned:
            if path.is_file():
                payload = json.loads(path.read_text(encoding="utf-8"))
                if not isinstance(payload, dict):
                    raise ValueError("proposal target enrichment file is malformed")
            else:
                payload = {}
            for family in PROPOSAL_FAMILIES:
                payload.setdefault(family, [])
                if not isinstance(payload[family], list):
                    raise ValueError("proposal target queue is malformed")
            planned[path] = payload
        payload = planned[path]
        family = candidate["family"]
        item = dict(candidate["proposal"])
        item.update({
            "proposal_id": proposal_id,
            "proposal_status": "pending",
            "approved": False,
            "rejected": False,
            "pushed_to_sanity": False,
            "source_semantic_campaign_id": candidate["source_campaign_id"],
            "source_semantic_archive_sha256": review["archive_sha256"],
            "provisional": True,
            "automatic_promotion": False,
        })
        identity_fields = PROPOSAL_FAMILIES[family]
        wanted = tuple(str(item.get(key) or "").strip().casefold() for key in identity_fields)
        exists = any(
            isinstance(row, dict)
            and not row.get("rejected")
            and (
                row.get("proposal_id") == proposal_id
                or tuple(str(row.get(key) or "").strip().casefold() for key in identity_fields)
                == wanted
            )
            for row in payload[family]
        )
        if exists:
            duplicates.append(proposal_id)
            continue
        payload[family].append(item)
        changed_paths.add(path)
        routed.append(proposal_id)
    for path in sorted(changed_paths):
        atomic_write_bytes(path, canonical_json_bytes(planned[path]))
    return {
        "schema_version": "semantic-proposal-routing-result-v1.0",
        "routed": tuple(routed),
        "duplicates": tuple(duplicates),
        "remote_writes": 0,
        "automatic_promotions": 0,
    }
