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

## 2026-06-12 — Round 9: Sérgio's playtest notes applied (verified in preview)
- Era-1 canvas → 4:3 (512×384), CRT casing rebuilt squarish with FLUSH
  bezels — the cut text he reported was bezel overlap. IRC window enlarged
  for 4:3; chat lines clip with … before the nick list (measureText).
- S1.0 power-on beat: warning → 'off' phase (dark glass, DOM hint, no blur
  per Sérgio) → clickable power button on the CRT (ray test) / dark glass /
  Enter → BIOS, which now ends NEW OPERATING SYSTEM FOUND / INSTALLING
  PHASE/2 95 (TM) / "EVERY PHASE PASSES." (⚑ tagline placeholder). Boot
  lines moved from code into data/strings/slice.json (Codex Gap A).
- Free mouse look: yaw unclamped — you can turn to the witness side by
  dragging; crossing the hemisphere does the filing bookkeeping however you
  got there; ⟲/F2 is now an assist tween. Pitch ±55°.
- Witness wall dormant ("· · ·" in the dark) until the first record exists
  (interim: mirc-log; moves to kit-inserted with S1.2).
- Room enlarged (~4.3×4.4m), chair back lowered out of view, bed/shelf/
  door/witness furniture repositioned.
- ERA1_LOGIC_v1 §6.5 added: the poster conversion (queer pop poster swaps
  to religious imagery mid-era — the room itself gets converted).
- Verified: 4:3 warning uncut → off+hint → power click → boot → name →
  desktop → manual 180° drag shows DORMANT wall → chat+DM → flip shows
  ACTIVE record (2 messages, pastoral-referral). Build + invariants clean.
