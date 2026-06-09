# Offload Package Workflow

Status: foundation + `offload-export` / `offload-verify` / `offload-move` /
`offload-import` / `offload-worker` CLI implemented, plus a Streamlit
**Offload Packages** page for export / lifecycle browsing / verify /
move-quarantine / dry-run + confirmed import. The Streamlit page does **not**
launch the worker (see "Streamlit Offload Packages page" below).

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

### `runner offload-worker <package_dir>` (Mac Studio node)

Processes one **inbox** package on the Mac Studio. It runs locally against the
node's own LiteLLM/Ollama stack and is strictly package-only: it never reads or
writes the live corpus, `source_queue.db`, Sanity, or Supabase, and it never
fetches/parses/OCRs/transcribes — it consumes only prepared package artifacts
(`intake.json`, `preprocess.json`, `extracted.txt|md`).

Flow:

1. Acquire the `<offload_root>/.worker.lock` PID lock (refuses if another worker
   is running; clears a stale lock whose PID is dead) — prevents concurrent heavy
   model loads.
2. Claim: `inbox → processing` (verifies input hashes + lifecycle first).
3. Stage A — analysis for all docs, then unload the analysis model.
4. Stage B — enrichment for all docs, then unload the enrichment model.
5. Stage C — embedding for all docs, then unload the embedding model.
   (One heavy model resident at a time; unload between stages.)
6. On **full success**: write a per-document `docs/<doc_id>/worker_report.json`
   (importable provenance — stage status, model aliases, durations, artifact
   hashes; **no raw extracted text**), write `result_manifest.json` covering
   exactly the offload manifest's doc IDs, write a package-level
   `worker_report.json` at the root, then `processing → outbox`.
7. On **any failure**: write only the **root** `worker_report.json` (per-doc
   statuses + errors), write **no** `result_manifest.json`, then
   `processing → failed`.

Outputs are limited to the allowed artifacts (`analysis.json`,
`analysis_audit.json`, `enrichment.json`, `enrichment_audit.json`,
`embedding.json`, and the per-doc `worker_report.json`), each listed in
`result_manifest.json` so the importer accepts them. The root-level
`worker_report.json` lives outside `docs/<doc_id>/` and is never imported.

Lexicon context is best-effort: analyze/enrich read Sanity for lexicon when
available and fall back to seed/legacy memory otherwise, so the worker runs even
with Sanity unreachable. (A package-carried lexicon snapshot is future work.)

## Streamlit Offload Packages page

A researcher-facing **Offload Packages** page (`runner/app.py`,
`page_offload_packages`) front-ends the offload pipeline. It calls the pure
pipeline functions directly — `build_analysis_package`, `verify_package`,
`transition_package_state`, `import_result_package` — and is organised in three
tabs:

- **Export** — select corpus documents that already have intake + preprocess +
  extracted text (pre-ingest items are excluded) and build an `inbox` package.
  Refusals are shown verbatim; nothing partial is written.
- **Lifecycle browser** — list every package grouped by folder state, flag any
  folder/manifest lifecycle mismatch, run a read-only **Verify** (failures are
  always shown, never hidden), and **Move/quarantine** using only the
  `ALLOWED_TRANSITIONS` targets. Moves into `failed` / `archive` require an
  explicit "skips verification" acknowledgement.
- **Import results** — offered **only** for `outbox` packages. The real import
  button stays disabled until a **dry-run** has succeeded for that package and a
  confirmation checkbox is ticked. Import reuses `import_result_package`
  (validate-all-before-copy, `.preimport-<ts>` backups, provenance sidecar).

**The page never launches the worker.** The worker must run on the Mac Studio
against package files that exist on that machine; launching it from a MacBook
Streamlit session could load heavy models locally or point at a path that does
not exist on the node. Instead the page **displays copy-paste terminal
commands** for `offload-worker`, `offload-verify`, and `offload-import`. The
page also shows (read-only) the Mac Studio `.worker.lock` if present, but never
creates or clears it. No auto-delete anywhere.

## Source Offload (source-stage) — Slice S1

The package kind above (`analysis_package`) is a **result-stage** offload: it
packages documents the MacBook has *already* fetched and extracted, so the Mac
Studio only runs analysis/enrichment/embedding. It does **not** let the MacBook
go offline while the Mac Studio fetches and extracts raw sources.

The **source-stage** offload (`source_package`) closes that gap. The MacBook
packages *raw source material* (queue URLs and/or local file copies); a later
slice (S2) lets the Mac Studio run the full pipeline (intake → preprocess →
analysis → enrichment → embedding) and return completed corpus documents.

**Slice S1 builds and verifies source packages only — no processing, no
worker, no import, no Streamlit UI, no queue mutation.**

### Separate root

Source packages live under a **separate** root, default
`<exports_dir>/source_offload`, so they never mix with the existing
`<exports_dir>/offload` result lifecycle browser. Same six lifecycle folders
(`inbox / processing / outbox / imported / failed / archive`).

### Package kind: `source_package` (schema version 1)

On-disk layout (`inbox/<package_id>/`):

```
source_manifest.json
items/<doc_id>/source_item.json
items/<doc_id>/source.<ext>        # local file-backed items only
```

- **URL items** store the URL + queue metadata in `source_item.json` and the
  manifest. No fetch and **no blob** is stored — the Mac Studio re-fetches in S2.
- **File items** copy the source file in as `source.<ext>` and record its
  SHA-256 + byte size.
- The manifest preserves `queue_item_id`, `url_hash`, source URL, declared type,
  and priority/safety hints. It carries **no absolute MacBook paths** (those, if
  ever needed for recovery, belong in a private per-machine export ledger that is
  not part of the portable package — and is itself flagged as unexpected if it
  leaks into the package directory).

The MacBook pre-assigns each `doc_id`, so the corpus folder name is stable
across the eventual roundtrip. **S1 does not mutate `source_queue.db`** and does
not add an `offloaded` status — queue relinking waits for the import slice.

### Security (shared Mac Studio)

Source packages may contain private research material. The builder writes
package directories `chmod 700` and files `chmod 600` (best-effort, owner-only).
On the Mac Studio, keep the source-offload root in a private folder under
`/Users/cdn-ai` (`chmod 700`), ideally on an encrypted APFS volume. No
auto-delete; delete manually only after a verified import.

### CLI (built)

- `runner source-offload-export [--queue-id ID ...] [--file PATH ...] [--url U ...]
  [--package-id ID] [--source-offload-root DIR]` — builds a `source_package` in
  `inbox/`. Reads `source_queue.db` **read-only** for `--queue-id` items; refuses
  (writing nothing) on an unsafe id, missing file, invalid URL, or duplicate doc.
  Never fetches, never calls a model/Sanity/Supabase, never writes the corpus.
- `runner source-offload-verify <package_dir>` — read-only integrity check:
  manifest parses, schema/kind match, lifecycle folder/manifest consistency,
  safe doc IDs and manifest-relative paths (no traversal), each
  `source_item.json` + file blob present with matching SHA-256/bytes, URL items
  carry valid URL metadata, **exact** item coverage, and any unexpected
  file/dir surfaced. Exits non-zero on any problem.

### Not in S1

Source worker (S2), source import (S3), Streamlit UI (S4), remote execution,
transfer automation, queue status changes, book splitting, and any new
OCR/transcription engine are all out of scope for this slice.

## Next Implementation Slice

Still pending:

- **S2 — Mac Studio source worker**: run the full pipeline against a
  package-local staging corpus and return an `ingest_result` package. No remote
  execution; explicit one-package CLI on the Mac Studio.
- **S3 — source import on MacBook**: validate + create/update corpus doc
  folders, relink the source queue, researcher-gated (no auto-push to
  Sanity/Supabase, no auto-delete).
- **S4 — Streamlit source UX** (export/lifecycle/verify/move/import; worker
  display-only, like the result UX).
- Result-stage remote worker execution and an optional `--claim-next` mode
  remain deferred until an explicit package-transfer story exists.

The worker has **no** daemon/background-service mode — it remains an explicit
one-package CLI command, run on the Mac Studio.
