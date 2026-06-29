# Acquisition Fallbacks

The ingestion pipeline separates acquisition from extraction. Acquisition gets
source bytes or rendered text; extraction turns that material into
`extracted.txt`, `extracted.md`, `preprocess.json`, `acquisition.json`, and
`citation_units.json`.

## Default URL Order

For normal URL ingest and source-queue triage, the default order is:

1. Trafilatura live fetch.
2. httpx live fetch with ordinary browser-like headers.
3. Public WordPress REST API, when the URL looks like a WordPress post/page.
4. Wayback closest snapshot and conservative variants.
5. Wayback CDX older successful snapshots.
6. Hold for researcher capture if no usable document is found.

Cloudflare, bot, JavaScript-wall, HTTP-status, SSL, and empty-body failures are
not treated as safe documents. They are recorded in `acquisition.json` and the
queue item is held rather than marked overnight-safe.

## Optional MarkItDown

If the `markitdown` Python package is installed, local file preprocessing can
use it as a fallback for PDFs and other file-like documents after Docling and
Unstructured fail or only produce weak text.

MarkItDown is optional. The repository does not require it for tests or normal
ingest. When it succeeds, `tool_used` is `markitdown`, `extracted.md` preserves
the converted Markdown, and `extracted.txt` contains a plain-text version for
analysis and citation-unit matching.

Install only if needed:

```bash
cd /Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest
.venv/bin/python -m pip install markitdown
```

## Optional Crawl4AI

Crawl4AI is an opt-in rendered-page fallback for public URLs:

```bash
export SOGICE_ENABLE_CRAWL4AI=1
.venv/bin/python -m runner queue-triage --limit 50
```

or add this to `runner/.env`:

```bash
SOGICE_ENABLE_CRAWL4AI=true
```

This may start local browser/Playwright processes. The runner uses no cookies,
no persistent browser profile, no proxies, no stealth mode, and no CAPTCHA
solving. If the rendered output is still a challenge page, it is classified and
held. When Crawl4AI succeeds, `acquisition.json` records `fetch_tool=crawl4ai`
and the acquired Markdown/HTML lengths.

Use it for dynamic pages and brittle older sites; do not expect it to bypass
institutional access controls or Cloudflare challenges.

## Researcher Workflow

For queue work:

```bash
cd /Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest
PY="$PWD/.venv/bin/python"

"$PY" -m runner queue-triage --limit 50
"$PY" -m runner batch-plan --priority high --limit 20
```

If many items are held for `blocker_text`, `cf-mitigated:challenge`, or SSL
errors, choose one of:

- enable Crawl4AI for a deliberate retry batch;
- save the rendered page manually and use the Source Offload snapshot workflow;
- keep the item held for later Browsertrix/WACZ work.

Do not manually mark a held item `ready_to_ingest` unless you have supplied a
usable snapshot or file. The overnight batch gates are intentionally fail-closed.
