# Offload Package Workflow

Status: foundation + `offload-export` / `offload-verify` / `offload-move` /
`offload-import` CLI implemented; the Mac Studio worker script and Streamlit UX
are still pending.

This workflow is for overnight or long-running Mac Studio model work without
syncing the live MacBook corpus or `source_queue.db`.

## Principle

The MacBook remains the source of truth and the only place that pushes to
Sanity/Supabase.

The Mac Studio receives a bounded package of selected document artifacts, runs
model-heavy stages, unloads models between stages, and returns a result package.
No automatic deletion is performed. The researcher deletes old packages manually
after import has been verified.

## Package Lifecycle

Offload roots contain these folders:

- `inbox/` — packages exported by the MacBook and ready for worker pickup
- `processing/` — worker claimed package
- `outbox/` — worker completed package and wrote outputs/report
- `imported/` — MacBook verified and imported returned outputs
- `failed/` — worker/import failed; retained for inspection
- `archive/` — manually retained old packages

## Current Package Kind

`analysis_package` is the first conservative mode.

It assumes the MacBook has already completed intake and local extraction. The
package builder refuses any document missing:

- `intake.json`
- `preprocess.json`
- `extracted.txt` or `extracted.md`

It also refuses corrupt required JSON, non-object `intake.json` /
`preprocess.json`, empty extracted text, unsafe path-like document IDs, unsafe
package IDs, and duplicate document selections after `doc-` prefix
normalisation.

Optional context is copied when already present:

- `wayback.json`
- `preservation_status.json`
- `source.html`
- `html_snapshot.json`
- `media_metadata.json`
- `video_metadata.json`
- `transcript_chunks.json`
- `transcript_versions.json`
- `transcript_comparison.json`
- `media_comments.json`

The manifest includes SHA-256 hashes and a per-document source-stage summary:
intake, preprocess, extracted text, preprocess tool/quality, OCR image count,
HTML capture, Wayback metadata, preservation status, and media/transcript
context. Stage summaries distinguish `present`, `absent`, and
`not_applicable` for HTML/Wayback/media context where the source metadata makes
that distinction possible.

The manifest is self-contained and does not export the absolute MacBook corpus
path. Any future MacBook-side export ledger can retain local path details
privately if needed for import/recovery.

## Worker Contract

The package manifest states that the Mac Studio worker may write:

- `analysis.json`
- `analysis_audit.json`
- `enrichment.json`
- `enrichment_audit.json`
- `embedding.json`
- `worker_report.json`

The worker must not write:

- `source_queue.db`
- the live corpus
- Sanity
- Supabase

Required stage order:

1. Verify package hashes
2. Run analysis
3. Unload analysis model
4. Run enrichment
5. Unload enrichment model
6. Run embedding
7. Unload embedding model
8. Write result manifest

Lifecycle tools should also report folder-state / manifest-state consistency.
If a process dies during a move, a folder can be in `processing/` while the
manifest still says `inbox`; this is recoverable, but it must be visible before
an operator continues.

Ollama safety policy in the manifest:

- one heavy job at a time
- unload after each model
- `keep_alive = 0`
- `num_parallel = 1`

## Security / Cleanup

Packages contain only selected document artifacts, not the whole corpus. They
may still contain extracted text and source HTML, so treat the offload folder as
research data.

Recommended safeguards:

- use a private user folder or encrypted local volume on the Mac Studio
- avoid shared/public directories
- do not log raw extracted text
- keep packages until import is verified
- manually delete or archive packages after verification

No auto-delete is intentional. Failed imports need a recovery path.

## CLI Commands (built)

Two local-only commands exist. Neither touches `source_queue.db`, Sanity,
Supabase, or any LLM/Ollama/LiteLLM.

### `runner offload-export <doc_ids...> [--package-id] [--offload-root]`

Builds an `analysis_package` in `<offload_root>/inbox/<package_id>` (default
offload root: `<exports_dir>/offload`). Accepts one or more corpus doc IDs (bare
or `doc-` prefixed). Copies only intake/preprocess/extracted text plus any
present optional context, records SHA-256 hashes and a per-document stage
summary, and prints the package ID, lifecycle state, document count, manifest
path, and a stage-summary table.

A document is refused — and **no package is written** — if a required artifact
is missing, required JSON is invalid, extracted text is empty, the doc/package
ID is unsafe, or a doc ID is duplicated after `doc-` normalisation. Uses
`load_config(require_services=False)`.

### `runner offload-verify <package_dir>` (read-only)

Re-verifies a package without mutating it. Checks that the manifest loads, the
lifecycle folder name matches the manifest `lifecycle_state`, every artifact the
manifest marks present still exists, and every SHA-256 still matches. Prints the
per-document stage summary and any missing/mismatched artifacts. Exits non-zero
on any missing/mismatched artifact, a lifecycle mismatch, or a corrupt/missing
manifest. Never repairs, moves, or deletes anything; needs no config or services.

**Verifier-side path hardening.** Because a returned package may arrive from
another machine, `offload-verify` does not trust manifest-relative paths.
`validate_manifest_relative_path()` rejects any document `package_dir` or
artifact `relative_path` that is absolute, contains `..`, or contains a
backslash, before joining it to the package directory. Such a manifest fails
verification with a non-zero exit instead of reading outside the package.

### `runner offload-move <package_dir> --to <state>`

Moves a package to another lifecycle state, enforcing the transition graph
below. The from-state is inferred from the package path. Forward transitions
first run `verify_package` (hashes, artifacts, folder/manifest consistency) and
**refuse on failure**; moves into `failed` / `archive` skip verification so a
broken package can always be quarantined or retained. `--no-verify` exists for
isolated testing and is ignored for `failed` / `archive`. Local-only.

Lifecycle transition graph (no transition deletes anything):

```
inbox      → processing | failed | archive
processing → outbox | inbox (release) | failed | archive
outbox     → imported | failed | archive
imported   → archive
failed     → inbox (retry) | processing | archive
archive    → (terminal)
```

### `runner offload-import <package_dir> [--corpus-root] [--dry-run]`

Imports a worker-returned package's outputs into the local corpus. Import is
permitted **only** from a package whose manifest + folder lifecycle is `outbox`.

Validate-all-before-copy: the command first verifies the result manifest,
expected doc IDs, allowed artifacts, in-package paths, SHA-256 hashes, and
schemas. **Only if every check passes** are allowed artifacts written into
`<corpus>/<doc_id>/` (atomic writes; any existing target file is first backed up
to `<artifact>.preimport-<timestamp>`) with an `offload_import.json` provenance
sidecar. After a fully successful corpus write the package is moved
`outbox → imported`. On **any** validation or write failure the corpus is left
untouched and the package is **not** marked imported. `--dry-run` verifies and
reports what would be imported without writing or moving anything.

`offload-import` never touches `source_queue.db`, never calls Sanity/Supabase,
and never runs a model. Pushing imported analysis/embeddings to Sanity/Supabase
remains a separate, researcher-gated step.

#### Returned (result) package contract

The returned package is the same package (it still carries `offload_manifest.json`,
which supplies the expected doc IDs) plus a worker-written `result_manifest.json`
and output artifacts under `docs/<doc_id>/`:

```json
{
  "schema_version": 1,
  "package_id": "offload-…",
  "package_kind": "analysis_result",
  "produced_at": "2026-…Z",
  "documents": [
    { "doc_id": "abc123",
      "artifacts": [
        { "label": "analysis.json",
          "relative_path": "docs/abc123/analysis.json",
          "sha256": "…", "bytes": 1234 }
      ] }
  ]
}
```

Allowed import artifacts (mirrors the worker contract's `worker_may_write`):
`analysis.json`, `analysis_audit.json`, `enrichment.json`,
`enrichment_audit.json`, `embedding.json`, `worker_report.json`. Anything else,
any unexpected path, any doc ID not in the original `offload_manifest`, any
hash mismatch, any byte-size mismatch, any wrong/missing `schema_version`, any
unmanifested extra file under `docs/<doc_id>/`, or any schema failure
(`analysis.json` → `AnalysisResult`, `enrichment.json` → `EnrichmentResult`,
`embedding.json` → model + numeric vector matching `dimension`) is refused.

**Document coverage must be exact.** `result_manifest.documents` must cover
*exactly* the same doc IDs as `offload_manifest.documents` — no more, no fewer.
An expected doc that never came back is refused (`missing_result_doc:<doc_id>`)
before anything is written, so a partially completed batch can never be imported
as if it were complete. A partial worker run should be represented as a **failed
package** (move it to `failed/`) plus a `worker_report.json` explaining which
documents failed — not as an `outbox` package missing documents.

## Next Implementation Slice

Still pending (in suggested order):

- the Mac Studio worker script that produces the `result_manifest.json` contract
  above (localhost inference only, single heavy job, unload between models)
- Streamlit Source Queue UX to export checked batch rows, move package state, and
  import results

Worker and Streamlit UX are intentionally **not** built yet.
