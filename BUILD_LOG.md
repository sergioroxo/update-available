# BUILD_LOG

- 2026-06-12 — repo scaffolded (Vite + TS + PlayCanvas npm; boot screen; CI invariants). Tool: Claude Code (Claude Fable 5).
- 2026-06-12 — Vertical slice v1: warning → boot → name → desktop → mIRC + MentorRob DM → log toast → flip (F2/⟲, dead controls, computed INTAKE RECORD) → dossier card #1. Verified end-to-end in browser preview. Bug found+fixed: 'f' flip shortcut hijacked typing → moved to F2. Asset strategy: no Aseprite (docs/ASSET_STRATEGY.md). Tool: Claude Code (Claude Fable 5).
- 2026-06-12 — OS splash phase added (BIOS → PHASE/2 95 loading screen → name); render scale ×3 (logical 512×288, backing 1536×864) for VR text legibility. Verified visually. Skills installed by Sérgio: playcanvas-engine + aframe-webxr (claude-design-skillstack plugin cache) — references for the room/XR milestone.

## 2026-06-12 — Era-1 logic + the room blockout + ?flat=1
- docs/ERA1_LOGIC_v1.md: the era's iterable script — beats S1.0–S1.9
  (insert kit → tape → go online → channel → flip → escalation → packet →
  suspension), object logic table, room requirements, data architecture.
  Camp ending staged as administrative violence (approved by Sérgio):
  packet → screen powers down → `profile suspended — enrolled`.
- data/room/era1.json: full room layout (70+ props, 5 lights) — editable
  numbers, hot-reloads; src/room/era1room.ts builds flat-shaded boxes
  (v0.7 aesthetic law: flat low-poly, pixel art on screens only).
- src/engine/app.ts: meters scale (CRT screen 0.40×0.225 at origin, eye at
  0.7m), drag-to-look off-monitor (yaw ±110°, pitch ±55°; the flip stays
  the meaningful act), warm/cold light grammar, CSS vignette (taste call:
  no particles), witness side = oversized sharp repository wall (1.8×1.0m)
  in the dark back-of-house with filing furniture.
- src/flat/flat.ts + main.ts: `?flat=1` universal fallback — desktop canvas
  alone, no WebGL; same ledger/flip/dossier grammar (Codex Gap C closed).
- Verified in preview: warning→BIOS→splash→name on the in-room CRT, drag
  both directions (kit envelope visible on desk pre-S1.2), F2 flip to the
  intake wall, ESC return, flat mode. npm test (invariants) + build clean.
