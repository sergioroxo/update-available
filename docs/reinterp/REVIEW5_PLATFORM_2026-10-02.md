STATUS: live

# REVIEW 5 — PLATFORM · performance, devices, access · 2026-10-02

Read-only review by code reading plus `node tools/check-invariants.mjs` (green) and three scratch scripts (audio-registry cross-check, GLB triangle count, palette contrast). Nothing was run in a browser, and no headset or phone was available. CONFIDENCE is "verified in code" when I read the lines that do it. It is "inferred" when the effect depends on device or browser behaviour I could not observe.

Ruled items in OPEN_ITEMS (R28 amendments, S80 input law, P7-26 by-design, the 150 s screensaver gate) are not re-raised. L-05 and L-09 are open and are cross-referenced where they apply.

## Findings, most severe first

### PLATFORM-01 — The game menu does not pause any audio
- WHERE: `src/engine/app.ts:3420` (`if (options.reinterp && gameMenuBus.isOpen) return;`), with `tapeAudio?.setGamePaused(os.paused)` at `:3630` and `roomBed.setGamePaused(os.paused)` at `:3634`. `src/desktop/gameMenu.ts:582-596` stops Esc from reaching `os.handleKey`, and `os.paused` is only ever set at `os.ts:3669`. `tapeAudio.ts:585` (`liveOneShots`) has no pause hook at all.
- WHAT A PLAYER EXPERIENCES: On desktop (Esc or the corner glyph), phone (glyph) and headset (grip), the frame loop freezes: clocks, captions, `tapes.update`, `os.update`. The sound does not. Tape audio, the room bed, L's voice lines, the jingle and song, the infomercial track, the PureMail read-aloud and the ball's loops all play on behind the menu. After Resume, every timed caption is behind its audio by however long the menu was open, for the rest of that clip.
- WHY IT MATTERS: It breaks the Esc/pause law, which is "pause literally pauses audio" in `tapeAudio`'s own doctrine and in the comment at `app.ts:3631`. Under `?reinterp=1`, `os.paused` is never true, so those calls are dead. It is also an access failure: captions are the access route for deaf and hard-of-hearing players, and they desynchronise.
- SEVERITY: High. CONFIDENCE: verified in code (no `gameMenuBus.onChange` listener touches audio; `visibilitychange` and `pagehide` are not handled either).
- SUGGESTED FIX: Subscribe once to `gameMenuBus.onChange` and pause or resume the bus, `roomBed` and every `liveOneShots` element, using the same `.pause()` / `.play()` pair as `setGamePaused`. Add a `setOneShotsPaused()` to `tapeAudio.ts`. Do the same on `visibilitychange`.

### PLATFORM-02 — There is no mute after Era 1 (and none in the menu or in VR)
- WHERE: `src/engine/app.ts:1104-1120` (the only mute control, `tapeMuteBtn`) and `:3657-3660` (`show = !!tapes.inserted`, otherwise `opacity 0; pointerEvents none`). `src/desktop/gameMenu.ts` and `src/frame/xrFrame.ts:178-182` have no sound row.
- WHAT A PLAYER EXPERIENCES: The button exists only while a tape is in the boombox, which is Era 1. From 2003 on (the jingle, the infomercial, L's voice, static, the termination, the hymn) the only way to silence the piece is the device's own volume. On a headset the DOM button is not visible at all.
- WHY IT MATTERS: Sensory and consent access, in a piece that carries loud failure sounds and distressing testimony. The code's own comment says "one mute, every source", but the control for it is Era 1 only.
- SEVERITY: Medium-High. CONFIDENCE: verified in code.
- SUGGESTED FIX: Add a "Sound: on / off" row to the DOM menu and to the XR frame menu. It should call the same three setters (`tapeAudio.setMuted`, `roomBed.setMuted`, `setOneShotsMuted`) and be plain frame voice.

### PLATFORM-03 — In the headset the pause menu has exactly one route, the grip squeeze
- WHERE: `src/frame/xrInput.ts:105-110` (`xr.input.on('squeezestart', ...)` is the only caller of `gameMenuBus.toggle()` in VR). `xrFrame.ts` has no in-world pause plate.
- WHAT A PLAYER EXPERIENCES: On Vision Pro (named in CLAUDE.md look-mode 1) the input sources are `transient-pointer`, which have a select (pinch) and no squeeze. On Quest with hand tracking, whether a squeeze is emitted depends on the hand gesture. In either case Resume, Map, Restart and Leave are unreachable from inside the session.
- WHY IT MATTERS: The "Esc/pause works from every state" amendment, and the way out (Leave, the ethics promise "you can leave at any time").
- SEVERITY: Medium. CONFIDENCE: inferred (WebXR input model; never run in a headset, as `xrInput.ts` itself says).
- SUGGESTED FIX: Add a small always-present "menu" plate that follows the head at the lower edge and is pressable with `select`. A held-pinch or palm-up shortcut would be a second route. Keep the grip as it is.

### PLATFORM-04 — Portrait phones get a vertical FOV of 42°, so the monitor is cropped at the seat
- WHERE: `src/engine/app.ts:570` (`fov: 42` at creation), `:2813` (`FOV_HOME = 42`). Nothing sets `horizontalFov` or reads the aspect ratio. `orientingCard.json` does not ask the player to rotate the device.
- WHAT A PLAYER EXPERIENCES: On a 390×844 phone held upright, the horizontal field is about 20°. The 0.5 m-wide monitor at about 1 m (about 28°) does not fit, and the 2D desktop, which is the one UI surface, is cropped at the seat. Pinching out toward 80° is the only remedy, and the player is never told that.
- WHY IT MATTERS: Look-mode 3 is a first-class target (S80). The "measure from the seat" and FOV audits were done in landscape.
- SEVERITY: Medium. CONFIDENCE: inferred (PlayCanvas defaults to vertical FOV; I did not measure).
- SUGGESTED FIX: When `innerHeight > innerWidth`, derive the vertical FOV from a target horizontal FOV (about 50°), clamped to the pinch range, and make Recentre restore it. Alternatively, tell portrait players to rotate on the door's phone card.

### PLATFORM-05 — The OS canvas is repainted in full on every frame, although only the upload is gated
- WHERE: `src/desktop/os.ts:2016` (`this.draw()` at the end of `update`, unconditional) and `:1775` (the paused path). The canvas is `ERA1_CANVAS × RENDER_SCALE 3`, which is 1536×1152 (`:444`). The S105 comment block at `:1940-1990` describes dirty-only discipline, but it covers the upload (`app.ts:3767`), not the 2D repaint.
- WHAT A PLAYER EXPERIENCES: In Eras 1 and 2 (the desktop monitor, 72 Hz on Quest), the whole desktop is repainted every frame even on a still screen. During the new screensavers it is worse. `drawDesktop` paints the full desktop and then `saver.draw` repaints over it (`os.ts:2565`). The 1997 "WALK ON" saver (`screensaver.ts:129-152`) runs a voxel loop of roughly 400-600 cells × 6 layers of `fillRect` per frame. Stepping the saver at about 11 Hz gates only the upload.
- WHY IT MATTERS: The 72 Hz floor and "render-texture uploads on dirty only". The upload law is met, but the CPU repaint is the same waste the S105 note says it removed.
- SEVERITY: Medium. CONFIDENCE: verified in code that the repaint is unconditional; the actual Quest cost is inferred (no timing was taken).
- SUGGESTED FIX: In `update()`, call `draw()` only when `this.dirty` is true or the hit list is empty, keeping `hits` between frames. Cache the saver frame between its 11 Hz steps. First count `draw()` calls in a headless run, as `era3Devices` already does with `drawCounts`.

### PLATFORM-06 — iOS page-zoom is disabled for the whole document, and the frame text is 10-12 px
- WHERE: `src/engine/app.ts:3129-3132` (`document.addEventListener('gesturestart'|'gesturechange'|'gestureend', killGesture)`, unconditional). The DOM frame text is `fontSize` 10-12.5 px in `orientingCard.ts:160-310` and `gameMenu.ts:168-370`.
- WHAT A PLAYER EXPERIENCES: On an iPhone or iPad, a player cannot pinch-zoom the front door's content note, the controls card, the map, the credits or the sources. At the same time they read it at 10-12 px monospace. On Android Chrome the pinch is not blocked (`touch-action: none` is on the canvas only).
- WHY IT MATTERS: The pinch was bound to the canvas (S86), but the `document` listener takes it from the DOM overlays too. The text the player has to read before consenting is the hardest to enlarge.
- SEVERITY: Medium. CONFIDENCE: inferred (WebKit gesture events); the code path is verified.
- SUGGESTED FIX: Bind `killGesture` on `canvasEl` only (or ignore events whose target is not the canvas). Raise frame text to 14 px or more, and use `rem` so it follows the system setting.

### PLATFORM-07 — Era 4's browser repaints and uploads a 2130×1152 canvas every frame at its start, and nobody measures upload cost
- WHERE: `src/desktop/apps/browser.ts:380-387` (`phase === 'restoring'`: `this.version++` every frame for about 6.5 s, from `BOOT_SECONDS 2.6 + RESTORE_SECONDS 2.4 + the tab gaps`) and `:393-403` (`mode === 'typing'`: per frame for about 2.4 s). The monitor canvas is `{710, 384, scale 3}` (`era3Devices.ts:117`).
- WHAT A PLAYER EXPERIENCES: On Quest, about 8-9 s of per-frame full-resolution (about 2.4 Mpx, about 10 MB) repaint and texture upload on the docked monitor, right as Era 4 begins.
- WHY IT MATTERS: "Uploads on dirty only". `QUEST_E4_2026-09-16.md` reports draw calls (worst 41/75) and camera comfort only. It has no upload count, no CPU or frame time, so this is the one budget line the tool cannot see.
- SEVERITY: Low-Medium. CONFIDENCE: verified in code; the cost is inferred.
- SUGGESTED FIX: Quantise both to about 12 Hz, as the stream already is ("repaints 12x a second"). Add `window.__uploads` per-second to `tools/quest-e4.mjs`'s table.

### PLATFORM-08 — The sound-caption strip is 12 px, unannounced, and the canvas has no accessible name
- WHERE: `src/engine/app.ts:1094-1104` (`font: italic 12px monospace`, `maxWidth: 70%`, no `aria-live`, no `role`), `index.html:70` (`<canvas id="app">` with no label); the mute button is 11 px with 4 px padding, about 22 px tall (`:1106-1112`).
- WHAT A PLAYER EXPERIENCES: On a phone, captions and sound names are small, italic and in a 273 px-wide box. A screen-reader user hears nothing (the captions are real DOM text but are never announced), and the canvas is silent.
- WHY IT MATTERS: Captions are the only access to the tapes and voices. The 22 px control is below WCAG 2.5.8's 24 px minimum.
- SEVERITY: Low-Medium. CONFIDENCE: verified in code.
- SUGGESTED FIX: Set `role="status"` and `aria-live="polite"` on `tapeCaption`, `role="application"` with a short `aria-label` on the canvas, caption size at least 16 px with `maxWidth: 90%` on narrow screens, and make the buttons at least 32 px.

### PLATFORM-09 — The only cue for waking a sleeping screen is 3.17:1 at 9 px (2026)
- WHERE: `src/desktop/apps/screensaver.ts:262-267` (`ERA4.dim` `#556677` on `ERA4.field` `#11111C`; contrast 3.17:1; 9 px logical). The same colour is used at 12 px for the "GraceOS" mark (`:258`). It is the wake line of both the arrival saver (`browser.ts:254`) and the idle saver (`:263`).
- WHAT A PLAYER EXPERIENCES: On the 2026 laptop or monitor, "press to continue" and "press to restore" are barely legible. At the arrival, the saver is the first thing on the monitor.
- WHY IT MATTERS: Contrast (below 4.5:1 for small text), and the screen is a pressable gate. Palette law is kept (`ERA4.meta`, `#6C7BA8`, gives 4.5:1 on the field).
- SEVERITY: Low. CONFIDENCE: verified in code, with contrast computed from the palette.
- SUGGESTED FIX: Draw the wake line in `ERA4.meta` or `ERA4.text` at 10 px or more.

### PLATFORM-10 — The era-2 screensaver can cover Lamby's debut or program prompt
- WHERE: `src/desktop/os.ts:683-689` (`desktopIdle()` does not include `lambyOnScreen` or `e2Stage !== 'active'`), against the gate at `:1019-1023`. Lamby's stages are at `:967-970`.
- WHAT A PLAYER EXPERIENCES: A player who looks around the room for 150 s while Lamby's debut dialog waits for a press (`lambyIntro` / `lambyProgram`) comes back to the flock of lambs and spends one press waking it before the dialog returns.
- WHY IT MATTERS: The saver is meant to run only "nothing open"; a pending system dialog is something open.
- SEVERITY: Low. CONFIDENCE: verified in code.
- SUGGESTED FIX: Add `&& !this.lambyOnScreen && (era !== 'e2' || this.e2Stage === 'active')` to the saver's start gate.

### PLATFORM-11 — The two 404s in `out/tour-e4/TOUR.md` ("page errors")
- WHERE: `index.html` has `rel="manifest"` and `rel="apple-touch-icon"` but no `<link rel="icon">`, and `public/` has no `favicon.ico`. `tools/tour-e4.mjs:56` records every console error, while `tools/tour.mjs:82-83` deliberately filters "Failed to load resource" and favicon (so the other tours do not show it). `docs/reinterp/01_SESSION_LOG.md:1283` already records "a 404 for `/favicon.ico`, which the 3D path has too".
- WHAT IT IS (most likely): the browser's automatic `/favicon.ico` probe. There is only one `page.goto` in the tour, so the second 404 is either a second favicon request (Chrome can repeat it) or one more I could not identify. I checked every other request the code can make:
  - all 39 models in `data/room/models.json` exist in `public/assets/models/` (note that `assets.ts:67` retries a failed model once, so one missing model would give two 404s, but none is missing);
  - all 120 `REGISTRY` audio names resolve to files in `public/assets/audio/`, and there are no unregistered files there;
  - `assets/close/era1-4.jpg`, `assets/logo/logo_480.png`, the manifest icons and `sources/index.html` all exist.
  - There are no external fonts, scripts or CDNs.
- WHAT A PLAYER EXPERIENCES: A console error and a tab with no icon. On GitHub Pages `/favicon.ico` is requested at the host root and not under `base`.
- WHY IT MATTERS: Noise that hides real asset 404s in the tour's page-error list.
- SEVERITY: Low. CONFIDENCE: inferred for the second request, verified for the first.
- SUGGESTED FIX: Add `<link rel="icon" href="./app-icon-192.png">` to `index.html`. To settle the second, add `page.on('response', r => r.status() >= 400 && errors.push(r.url()))` to `tour-e4.mjs`, as `tour.mjs:83` already does.

### PLATFORM-12 — Two uncompressed WAVs are fetched on demand mid-scene
- WHERE: `public/assets/audio/lamby_puremail_apology.wav` (2.7 MB) and `tapeA_side_one_intro.wav` (1.3 MB), registered at `tapeAudio.ts:~73-80`.
- WHAT A PLAYER EXPERIENCES: On a phone or a venue network, a pause before Lamby's death notice and Tape A's spoken side. The registry comment itself says the L clips went from 23 MB to 2 MB for exactly this latency reason.
- WHY IT MATTERS: Mid-scene latency; the shipped payload (35.8 MB of audio, all registered).
- SEVERITY: Low. CONFIDENCE: verified in code and file sizes.
- SUGGESTED FIX: Encode both as 96 kbps mono MP3 as `tools/tts/publish_mp3.sh` does, update the two REGISTRY lines and the two data references, and keep the WAVs as archives outside `public/`.

### PLATFORM-13 — No reduced-motion path and no photosensitivity or motion line in the content note
- WHERE: no `prefers-reduced-motion` anywhere in `src/` or `index.html`; `orientingCard.json` `contentNote` mentions neither flashing nor conducted camera moves.
- WHAT A PLAYER EXPERIENCES: The glitch overlay, the failure bands, the static cascade and the long unskippable conducted moves (the descent, the Close flight) play for everyone.
- WHY IT MATTERS: The glitch doctrine says "never strobe" and the comfort envelope is measured (≤9.1 °/s), so the build is careful. But a player cannot know that before choosing, and cannot dim anything.
- SEVERITY: Low. CONFIDENCE: verified (absence).
- SUGGESTED FIX: One sentence in the content note ("slow camera moves, some screen glitches, no flashing"). Optionally honour `prefers-reduced-motion` by shortening the glitch overlay.

### PLATFORM-14 — L-09 (idle wipe) is still absent, and the piece now has an idle clock
- WHERE: the ledger's only wipes are Leave, Restart and `beforeunload` (`src/state/ledger.ts:370`). The new screensavers (`os.ts:1019`, `graceQueueLite.ts:581`, `browser.ts:260`) detect 150 s of idleness on three surfaces but wipe nothing.
- WHAT A PLAYER EXPERIENCES: On an unattended exhibition machine, the last visitor's typed name and filings stay in memory for the next one.
- WHY IT MATTERS: CLAUDE.md's invariant says wiped on exit/idle/refusal. OPEN_ITEMS L-09 already lists this as an OPEN bug.
- SEVERITY: Low-Medium (exhibition only). CONFIDENCE: verified in code.
- SUGGESTED FIX: A single longer idle (for example 10 minutes with no press, whatever the surface) that calls the same wipe and restart as Leave. Only the 150 s sleep itself should stay non-destructive.

### PLATFORM-15 — A model that is preloaded but no longer placed
- WHERE: `data/room/models.json:449` (`handheld2016`, 3 950 triangles, 36 primitives) is not referenced by any prop in `data/room/*.json` (P7-10 removed the DS).
- WHAT A PLAYER EXPERIENCES: 192 KB fetched at start, and a credit row for an object that is not in the room. If it is ever placed again, 36 mesh instances will be 36 draw calls unless batched.
- WHY IT MATTERS: Startup size and the draw-call budget (≤75) if it returns.
- SEVERITY: Low. CONFIDENCE: verified in code.
- SUGGESTED FIX: Take it out of the preload list until it is placed (keep the file and credit). If it returns, merge its primitives by material first.

### PLATFORM-16 — The invariant checker cannot see the rules it is meant to protect for audio and images
- WHERE: `tools/check-invariants.mjs:14-26` forbids network and storage tokens only. The audio law (every element through the REGISTRY) and the image law are not machine-checked. A `new Audio('x.mp3')` in any file passes.
- WHAT A PLAYER EXPERIENCES: Nothing today. I confirmed no `new Audio(` exists outside `src/audio/tapeAudio.ts`, and `new Image` appears only at `pointCloud.ts:876` and `orientingCard.ts:179` (both local, existing assets).
- WHY IT MATTERS: "Every audio element through the registry" is a hard rule with no test, and an unregistered name is a silent failure.
- SEVERITY: Low. CONFIDENCE: verified in code.
- SUGGESTED FIX: Add `new Audio(` and `.src =` as tokens that are allowed only in `tapeAudio.ts` (and the two image sites), and add the audio cross-check I used here (REGISTRY keys, referenced names, files on disk) to `check-spec.mjs`.

## Observations that are not findings

- Triangles: all 39 GLBs total 32 223 triangles before instancing (the largest is `cassettePlayer` at 6 670), well inside 75k for any one view.
- Screen uploads are version-gated in `era3Devices.ts:1272-1312` and `screenTexture.ts` (counted as `__uploads`). The savers' about 11 Hz step reaches only the hosts that use it (`os.ts`, `graceQueueLite.ts`, `browser.ts`) and costs no draw call.
- Of the 120 registered audio names none is missing on disk, and none referenced in `src/` or `data/` is unregistered (the only miss is the doc example `name.mp3` in `s2_caleb.json`).

## What is solid and must not be touched

1. The tap law at `app.ts:3287-3288` (10 px of path length, 1.2 s, on release), with the pinch (`:3225-3238`) and the wheel changing only the FOV and never selecting.
2. The gyro chain at `app.ts:2236-2400`: no smoothing, the zero applied to heading only, the screen-angle cross-check against gravity, and Recentre restoring the FOV.
3. The registry law in `tapeAudio.ts` (an unregistered name is never requested), which holds across all 120 files and all callers.
4. Dirty-only screen uploads with the `__uploads` counter (`screenTexture.ts:36-40`) and the quantised-version pattern (`space.ts`, `era3Devices.ts`).
5. `check-invariants.mjs`, green over `src/`: no network and no storage tokens; `ledger.ts` memory-only with `beforeunload` wipe.
6. The XR input route (`xrInput.ts`): select only, never gaze, wand rays from PlayCanvas's world-space `getOrigin()`/`getDirection()`, and select swallowed during driven legs.
7. The comfort measurement in `QUEST_E4_2026-09-16.md` (draw-call peaks, sustained velocity and angular rate per leg); keep it, and add upload counts beside it (see PLATFORM-07).
8. The screensaver gate itself: only with nothing open and nothing playing (`anythingPlaying()`), a wake press that does nothing else, and no draw call added.
