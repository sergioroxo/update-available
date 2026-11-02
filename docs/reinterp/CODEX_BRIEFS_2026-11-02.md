STATUS: live

# Codex briefs, 2 Nov 2026 — build jobs that need no decision from Sérgio

*Each brief stands alone: paste ONE into Codex. Every job starts from the `reinterp` branch and works on its own branch
(`codex/<name>`), so they never collide; Claude merges and checks them. Do not touch Era 4 (2026) files until the
2026 v2 build (branch `worktree-agent-afc47c4668b1cb907`, S293) is merged — brief 5 says when.*

**Shared rules for every brief (put this paragraph at the top of each paste):**
> Repository: /Users/sergiogalvaoroxo/update-available-reinterp (PlayCanvas + Vite + TypeScript WebXR art piece).
> First `git fetch && git checkout -b codex/<name> origin/reinterp`. Read CLAUDE.md before anything — its laws bind
> you: no runtime network calls; no storage; colours only from src/desktop/theme/*; click/tap only, no free text,
> no timers that punish; ≤75 draw calls; screen textures uploaded on change only; every docs/**.md starts with
> `STATUS:`; one line in BUILD_LOG.md (session number S306+ — check the last one); commit with explicit paths, never
> `git add -A`; never stage README.md. Verify with `npx tsc --noEmit -p .` and `npm test` (both must pass). Do not
> push; leave the branch for review. Write a short report file docs/reinterp/CODEX_<NAME>_REPORT_2026-11-02.md
> (STATUS: live): what you changed, how you checked it, what still needs a real headset.

---

## 1 · Sharp text in the headset: WebXR quad layers (`codex/quad-layers`)

**Why.** Sérgio sees screen text in the Quest 3 as jagged ("serrated knife"), even at 1.4× resolution with MSAA on
(S292). Flat screens are drawn into the eye buffer and resampled; a WebXR **quad layer** is composited by the headset
at its own resolution, so text stays crisp. Notes: docs/reinterp/META_WEBXR_NOTES_2026-11-01.md.

**Build.**
- Request the optional `'layers'` feature when the immersive session starts (find `xr.start(` in src/engine/app.ts
  and src/room/restoreEntrance.ts; PlayCanvas 2.19 `app.xr.start(camera, type, space, { optionalFeatures })` — check
  the engine source in node_modules/playcanvas/build/playcanvas.mjs for how optional features are passed).
- A small bridge module, src/frame/xrQuadLayers.ts: if `XRWebGLBinding` and `session.renderState.layers` exist,
  create an `XRQuadLayer` (`binding.createQuadLayer({ space, viewPixelWidth, viewPixelHeight, width, height,
  transform })`) for ONE screen first — the 1997/2003 desktop monitor (`desktop-screen` in app.ts; its canvas is
  `os.canvas`). Each frame: if the canvas changed (the existing upload counter / dirty flag), copy it into the
  layer's sub-image texture (`binding.getSubImage(layer, frame)` → `colorTexture`, `texSubImage2D` from the canvas);
  set the layer's transform from the screen entity's world transform every frame (it can move with Recentre).
- `session.updateRenderState({ layers: [quadLayer, projectionLayer] })` must keep PlayCanvas's own projection layer
  working — read how PlayCanvas sets `baseLayer` (it reads `renderState.baseLayer` each frame; S270c in app.ts
  replaces it with our own `XRWebGLLayer`). If layers and baseLayer cannot coexist in PlayCanvas 2.19, STOP and write
  that in the report with the evidence; do not hack the engine.
- Hide the screen's 3D plane while its quad layer is live; restore it on session end. Fallback: no layers → nothing
  changes. A URL switch `?quad=0` turns it off for comparison.
- **Done when:** browser behaviour unchanged; in a mocked headset (see tools/xr-layer-review.mjs for how the tools
  fake `app.xr.active`) nothing throws; the report says exactly what Sérgio should compare in the Quest
  (`?quad=0` vs default, the 1997 monitor text).

## 2 · Playing the handheld games with hands (`codex/hand-play`)

**Why.** Headset session B: the games (1997 FIT IN on the handheld, 2003 CLEAR on the flip phone, 2026 MATCH MADE
on the console) are "unplayable with hands". The controller works (stick = d-pad, A/B — src/frame/xrInput.ts). Since
S282 a held device comes to ≥0.42 m and is scaled up (src/room/heldDevice.ts `bigInHand`); since S278 the hint plate
hides while a device is held.

**Build.**
- In src/room/heldDevice.ts and src/room/handheld.ts: for hands (no controller), make the buttons' touch radius
  generous while held in XR (the 7–8 mm `r` values → about 18 mm, nearest-button wins); a fingertip touching a
  button presses it ONCE (debounce until the tip leaves), never a repeat.
- A fingertip touching the GLASS of a game that has `tap` (CLEAR, MATCH MADE) taps there; for FIT IN (no tap), the
  glass's left/right halves act as left/right and a tap in its upper third as A.
- Find how fingertip points reach the scene (`deps.input.points()` in src/frame/xrLayer.ts; xrInput.ts `points()`).
- No change for the browser or the controller.
- **Done when:** a mocked-hand probe (add tools/hand-play-probe.mjs) shows each button and the glass responding once
  per touch; npm test green.

## 3 · One voice at a time, everywhere (`codex/one-voice`)

**Why.** CLAUDE.md amendment 2: "One voice at a time: side-messages, conduction, toasts and guide wait for one
another." Headset B: a Lamby message was lost when a window opened on top. S304 made the 1997 placement letter wait
for Lamby (≤20 s, src/desktop/os.ts `packetLambyT`). The rule is still missing elsewhere.

**Build.**
- Audit every place in src/desktop/os.ts that opens a window or shows a toast on a timer (search `openPacket(`,
  `openProvotype(`, `this.toast =`, `openRestorify(`, `openAccountabilityAlert(`, `startEvening(`, the forced opens
  `formForced` / `checkinForced`) and make each wait while `this.lambyGuide.active`, capped (never more than 20 s —
  a balloon must not hold the story). Felt surfaces (Caleb, the 1997 folder) are untouched: Lamby is silent there by law.
- Do the same for the 2016 workstation (src/room/graceQueueLite.ts) and its Lambient.
- **Done when:** a list in the report of every opener and what it now waits for; npm test green.

## 4 · The dollhouse shows the next room being built (`codex/dollhouse-build`)

**Why.** Sérgio: at 2003 → 2016 "you should be able to see the room next to it build and to see in dollhouse
format the same that is happening in the space, slowly." The VR dollhouse (src/frame/xrLayer.ts `dollhouse()`,
`buildGeo`, `tickDoll`) copies the room's merged batch meshes; it holds 13 s with a year clock and lamp glows, and is
a turntable (stick / hand).

**Build.**
- While the dollhouse shows, reveal the room being added (the "to" room: Room 2 at x≈−3.88 for e3, Room 3 at
  x≈+3.88 for e4) growing from its floor up over ~8 s: classify each copied mesh instance by its AABB centre x
  (Room 1 |x|<2.13, Room 2 x<−2.13, Room 3 x>2.13); batches that span rooms (check `_batchList` AABBs) — if a batch
  spans rooms, fall back to growing the whole new geometry. Use a per-instance scale or a clip by height; keep draw
  calls within budget (the model already adds its own draws for 13 s — measure with `window.__drawCalls`).
- Also: a "Dollhouse" row in the headset menu (src/frame/xrFrame.ts) that shows the model of the current era on demand
  (no year clock), so the visitor can turn and look at the miniature any time.
- **Done when:** tools/xr-layer-review.mjs photographs the build half-way (add a frame) and npm test is green.

## 5 · AFTER the 2026 merge: the full walk and its fixes (`codex/walk-fix`)

**Only once Claude has merged the 2026 v2 build (S293) into `reinterp`.**
- Start Vite detached on port 3000 (`npx vite --port 3000 --strictPort &`), then
  `node tools/walk.mjs --port 3000 --max 2600 --require-close`. It must end with "✓ reachability: the walk reached
  the Close". If it stalls, read the log's last 40 lines, find the press it could not make, fix the cause (not the
  walker, unless the walker is wrong), and run again. New optional presses since S280 that the walker meets:
  2003's "Start here" (`ts-apply` / `ts-apply-close`), the forced Family Form after the intermission (S281), the
  forced check-in (S283), 2016's "Back to today" at the end of a job (S284).
- **Done when:** one full walk reaches the Close; its WALK_*.md is committed.

## Not for Codex (needs Sérgio first)

- The 2016 rebuild around Vera (RESEARCH_2016_VERA_APPARATUS_2026-11-01.md) — waits for his yes and three calls.
- Anything touching the TransJesus ending's content — his review of the S293 build first.
