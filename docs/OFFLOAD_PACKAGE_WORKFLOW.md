# Offload Package Workflow

Status: foundation + `offload-export` / `offload-verify` CLI implemented;
lifecycle-move, import, Mac Studio worker, and Streamlit UX still pending.

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

## Next Implementation Slice

Still pending (in suggested order):

- a lifecycle-move command (`inbox → processing → outbox → imported/failed`)
- an import command that writes returned outputs into the corpus only after
  hash/schema checks (atomic writes), records offload provenance, and leaves
  Sanity/Supabase push as a separate researcher-gated step
- the Mac Studio worker script (localhost inference only, single heavy job,
  unload between models)
- Streamlit Source Queue UX to export checked batch rows and import results

Worker and import are intentionally **not** built yet.
