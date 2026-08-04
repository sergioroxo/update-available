STATUS: live

# tools/harness — the verification rig, salvaged rather than rebuilt again

**These twelve scripts were written three separate times** — S69, S70 part 2, and S71 — and thrown
away each time, because each session built them in its own scratchpad. They were recovered from
S71's scratchpad on 2026-08-04, minutes before it would have been cleaned.

⚑ **They are RAW SALVAGE, not a finished tool.** Paths are hardcoded, several are one-off probes for
a question that is already answered, and there is no CLI. **They are here so the next session starts
from something rather than from nothing** — consolidating them into a real `tools/shots.mjs` is
S72's job (`docs/reinterp/BUILD_QUEUE_LIVE.md`).

## Why a headless-Chrome rig exists at all
The sandboxed browser pane **cannot write downloads to disk**, and relaying a PNG back as base64
through a tool boundary corrupted on the first chunk (S70 part 1 tried and correctly shipped nothing
rather than a truncated file). So verification images have to be produced by driving the real build
in real Chrome and writing with `fs`.

The route that works, and it needs nothing added to `package.json`:
```bash
npm run dev
node tools/harness/sweep.mjs before
```
`puppeteer-core` → the system Chrome at `/Applications/Google Chrome.app/…`, with
`--enable-unsafe-swiftshader --use-gl=angle` so WebGL renders headless. **Same URL, same seats, same
debug beats as a human gets — only the readback is scripted.**

## What each one is
| file | what it does | worth keeping? |
|---|---|---|
| `sweep.mjs` | ⚑ **the visual sweep** — every seat × era state × room, plus the S67 overlooks, into `shots-<tag>/` | **yes — this is the core** |
| `capture.mjs` / `capture2.mjs` | grabs the offscreen device canvases (`__era3Devices()[n].toDataURL`) after driving debug beats | **yes** |
| `compose.mjs` / `compose71.mjs` | composites labelled A/B/C/D contact sheets at 1:1 pixels | yes |
| `asserts.mjs` | counts console asserts across era jumps — how the eight `terminalFrame` asserts were found | **yes** |
| `relocmeasure.mjs` | samples the live camera rig to measure a leg's peak m/s against the 0.43 envelope | **yes — the comfort law has no other check** |
| `verify-aabb.mjs` | cross-checks `room-audit.mjs`'s maths against the live engine (agreed to 0.00000 m) | yes |
| `glb.mjs` | dependency-free GLB reader; the same logic now lives in `tools/room-audit.mjs` | superseded |
| `probe.mjs`, `flat.mjs`, `f404.mjs` | one-off probes (console dump, `?flat=1` check, 404 check) | fold into the CLI |

## The hardcoded things a consolidation must parameterise
- the Chrome path (macOS-only today)
- `http://localhost:5173` — the dev server has served on 3000 before
- the seat and overlook pose tables in `sweep.mjs`, which are **copies of `app.ts`'s** and will
  silently rot. ⚑ They should be read from the app, not duplicated.
