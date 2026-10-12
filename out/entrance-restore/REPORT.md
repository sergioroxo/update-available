STATUS: live

# entrance-restore — E1 report

Branch: `codex/entrance-restore`, based on `reinterp` at `cb1d775a`.
Worktree: `/Users/sergiogalvaoroxo/update-available-codex-entrance-restore`.
Implementation commit: `3d8811985b7ddef2bcaa345bdae09a5ae0111d8a`. Evidence is committed separately with this report. No push or merge.

## Result

The opt-in `?reinterp=1&entrance=restore` route opens a real PlayCanvas starfield: 900 camera-facing square quads in one merged mesh, using the existing 3×5 DOT glyphs and the idle card's 12-second cycle / 7-second title hold / 1.4-second gather and scatter. The Close's own night-blue backdrop and its warm PERSON / cool APPARATUS tones provide the bookend. The room is the existing ClusterMorph r1 fold, with area-weighted points sampled from its real mesh triangles. Stars arrive in material groups; those existing materials and lights fade up over seven seconds.

The existing entrance arc conducts the camera to the monitor. Its duration also accounts for combined pitch/yaw if a visitor drags before entry. No look triggers entrance progression. Taps use the existing release, 10 px / 1.2 s test; drags, pinches and gyro remain camera controls. Keyboard and XR select start the existing room sound and reset the idle clock.

The browser's frame words are DOM text. XR gets the same words on one small, nearest-filtered world-space text panel, with the second wake line smaller. A real-gesture Enter VR button appears when the running PlayCanvas manager reports support. No headset was available to verify it.

After the seat, `startSetup()` resolves the URL's full/speedrun cut, `chooseCut` applies it, `entranceGlitch()` shows one 0.65-second fluorescent/desaturated/slightly green material/light state, and the engine resumes its existing `beginReinterpOpening()` path. Reduced motion holds the stars/title still, cross-fades at the seat and skips the glitch. `?descent=0` cross-fades at the seat and retains the glitch. Esc freezes the entrance. Leave-for-good cancels pending flight/setup/glitch promises and leaves the existing inert left screen.

LambyOS Home remains the default and reachable as `?entrance=home`; `?home=0` retains the short door even alongside `entrance=restore`. The 30-minute fresh visit preserves restore mode and removes review-era jumps so it returns to WAKE. The normal Home idle URL is preserved exactly.

## Files changed

- `src/room/restoreEntrance.ts` — 3D saver, assembly, frame text, XR entry, glitch, cleanup/cancellation.
- `src/room/clusterMorph.ts` — deterministic sampling of the current room's mesh surfaces and materials.
- `src/engine/app.ts` — route integration, existing camera flight, narrative hold, input/exit integration, deferred emphasis unbatching.
- `src/main.ts` — opt-in route and computer-door hand-off.
- `src/desktop/setup/setup.ts` — requested E2 stub, unchanged promised signature.
- `src/frame/leavePage.ts` — exports the existing DOT table; no glyph or saver behavior changes.
- `src/frame/attract.ts` — recognizes the entrance and fresh-visit return to WAKE.
- `data/strings/entrance.json` — all new display copy.
- `tools/walk.mjs` — `--entrance restore`; distinct one-era reports and shot folders.
- `README.md` — route, hand-off, motion, verification and headset note.
- `BUILD_LOG.md` — one session line.
- `out/entrance-restore/` — this report, reviewed screenshots, browser-check scripts/results and final walk logs.
- `out/walks/` — the two final one-era walk reports and JSON logs.

No source files in the lead checkout were edited by this task. No Home art, room art, public assets, existing display strings or `_s` lines were changed. No imported asset was added; the existing licence/attribution check passes.

## Every new/changed display string — BEFORE / AFTER

All seven entries are new in `data/strings/entrance.json`; existing files' display strings are unchanged.

1. `title[0]` — BEFORE: absent in entrance copy. AFTER: `YOUR UPDATE` (same words as the idle card).
2. `title[1]` — BEFORE: absent in entrance copy. AFTER: `HAS FAILED` (same words as the idle card).
3. `invite` — BEFORE: absent. AFTER: `Click or press any key`.
4. `active` — BEFORE: absent. AFTER: `Session still active.`
5. `restoring` — BEFORE: absent. AFTER: `Restoring previous session…`.
6. `found` — BEFORE: absent. AFTER: `Room found. User profile pending.`
7. `enterVr` — BEFORE: absent in entrance copy. AFTER: `Enter VR`.

## Screenshots (headless Chrome; inspected)

For each viewport, the five requested entrance states and the existing idle-card reference are saved here:

| state | 1280 × 720 | 390 × 844 |
|---|---|---|
| stars streaming | [desktop](1280x720-wake-streaming.png) | [phone](390x844-wake-streaming.png) |
| title gathered | [desktop](1280x720-wake-title.png) | [phone](390x844-wake-title.png) |
| mid-restore | [desktop](1280x720-mid-restore.png) | [phone](390x844-mid-restore.png) |
| room at monitor | [desktop](1280x720-room-monitor.png) | [phone](390x844-room-monitor.png) |
| glitch | [desktop](1280x720-glitch.png) | [phone](390x844-glitch.png) |
| idle card reference | [desktop](1280x720-idle-reference.png) | [phone](390x844-idle-reference.png) |

The two use the same letters, grid spacing and gather/scatter cadence. Restore uses the warmer Close tones and its readable night-blue sky. The fixed status line clears the pause button in both sizes; on the phone the longer found line wraps cleanly. Debug overlays are visible because these are review URLs.

## Checks and walk results

- `npm run dev -- --host 127.0.0.1 --port 3206 --strictPort`: serves correctly; port 3000 never used.
- `npx tsc --noEmit`: passed.
- `npm test`: passed (invariants, room folds, spec, licences).
- `npm run build`: passed; Vite retains its large-chunk advisory. See `build.log`.
- `check.mjs`: passed reduced-motion hold/cross-fade, release-resolved drag/pinch separation, no pre-story ledger entries, pause/resume, cut=speedrun hand-off, Home/short-door compatibility and scaled 30-minute idle return to WAKE.
- `check-inputs.mjs`: passed keyboard and simulated PlayCanvas XR select entry, gaze rejection, sound start and idle reset. This is an event simulation, not headset validation.
- `check-exit.mjs`: passed real menu → Leave → Leave-for-good from wake, restore, flight and glitch; Enter afterward leaves the OS left.
- `check-flight.mjs`: all-frame browser maximum **72 draw calls** in the normal route; measured peak **0.41450 m/s**, **8.32091 °/s**. A prior drag lengthens the flight: **0.24097 m/s**, **9.09999 °/s**, and it still lands at x=0, y=1.16, z=0.7, yaw=0, pitch=0. The stars add one draw in the browser; the XR words add one further draw. The existing controller wands are unchanged. Physical Quest draw calls, tracked-head clearance and 72 Hz are unverified.
- `node tools/walk.mjs --port 3206 --max 1200 --one-era --entrance restore`: **passed**, reached `e2` / spine `e2`, 142 presses, 238 steps, console `[]`. Report: [restore walk](../walks/WALK_2026-10-13_ENTRANCE_RESTORE_ONE_ERA.md).
- `node tools/walk.mjs --port 3206 --max 1200 --one-era`: **passed**, reached `e2` / spine `e2`, 149 presses, 249 steps, console `[]`. Report: [default walk](../walks/WALK_2026-10-13_ONE_ERA.md).

Preliminary runs were stopped before source edits for profiling/cancellation corrections. Only the final reports below are acceptance evidence. No source/data/public files were edited while any own walk ran. The walker presses no reload control; kiosk=0 disables the automatic idle reload while it walks.

## Limits / E2 integration

`startSetup(): Promise<{ cut: 'full' | 'speedrun' }>` is intentionally an immediate URL-cut stub. E2 replaces that file with the actual monitor setup and content-note gate. This opt-in route is not a completed public exhibition setup yet; Home remains the default.

The requested `--one-era` walks stop on arrival in 2003. Their successful signal is e1 → e2, not `spine: done` (which belongs to a full Close walk). No full Close reachability claim is made.

No real phone, Safari, Quest 3 or Vision Pro was available. XR text placement/legibility, immersive entry/trigger behavior, tracked-head comfort and 72 Hz need the in-headset/device pass. The existing browser deprecation warning for `apple-mobile-web-app-capable` remains; no new render warning or page error appears in the final screenshot checks.
