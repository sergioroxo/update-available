STATUS: superseded-by tools/shots.mjs

# tools/harness — CONSOLIDATED into `tools/shots.mjs` (Session 72)

The twelve scripts that lived here were written three separate times — S69, S70
part 2, S71 — and thrown away each time, because each session built them in its
own scratchpad. They were recovered from S71's scratchpad on 2026-08-04, minutes
before it would have been cleaned, and **S72 folded every one of them into
`tools/shots.mjs`, which has a CLI, no hardcoded paths, and assertions on top.**

This file is the tombstone. Nothing here runs any more.

```bash
npm run audit                       # L1 + L2 + L3 capture + L4 assertions
node tools/shots.mjs sweep --tag x  # the visual sweep alone
node tools/shots.mjs verify         # the cross-checks, against the live engine
```

## Where each one went
| was | is now |
|---|---|
| `sweep.mjs` | `shots.mjs sweep` — and it no longer carries a COPY of the seat/overlook tables (see below) |
| `capture.mjs`, `capture2.mjs` | `shots.mjs devices` |
| `compose.mjs`, `compose71.mjs` | `shots.mjs sheet` (auto-grid, any frame count) |
| `asserts.mjs` | assertion 5 inside `shots.mjs audit` |
| `relocmeasure.mjs` | assertions 1 + 2 — with a threshold and an exit code, which is what it always lacked |
| `verify-aabb.mjs` | `shots.mjs verify` (still reports r4: 185 props, worst corner error 0.00000 m) |
| `glb.mjs` | superseded by `tools/room-audit.mjs` |
| `probe.mjs`, `flat.mjs`, `f404.mjs` | one-off probes for questions already answered — not carried |

## The three hardcoded things, and what happened to them
- **the Chrome path** — now `--chrome`, then `$CHROME`/`$CHROME_PATH`/
  `$PUPPETEER_EXECUTABLE_PATH`, then a per-platform candidate list (macOS,
  Windows, Linux). Absent ⇒ the tool skips and exits 0; it never downloads one.
- **`http://localhost:5173`** — now `--port` / `$SHOTS_PORT`, and if nothing is
  answering the tool starts vite itself and stops it again.
- **⚑ the seat and overlook pose tables**, which were copies of `app.ts`'s and
  would have rotted silently — the tool now holds **no camera numbers at all**.
  `src/engine/app.ts` exports `CAMERA_POSES`, the debug panel publishes it as
  `window.__poses` under `?debug=1`, and the sweep photographs whatever the
  build actually flies.

## Why a headless-Chrome rig exists at all (still true, still the reason)
The sandboxed browser pane **cannot write downloads to disk**, and relaying a PNG
back as base64 through a tool boundary corrupted on the first chunk (S70 part 1
tried and correctly shipped nothing rather than a truncated file). So
verification images have to be produced by driving the real build in real Chrome
and writing with `fs`. `puppeteer-core` is a devDependency and is **optional**:
`npm test` never touches a browser or a dev server.
