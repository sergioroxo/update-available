STATUS: live

# Ideas: text in the headset (12 Nov 2026)

*Research only. Nothing in `src/`, `data/`, `public/`, `assets/` or `tools/` was changed. Answers T09, H40 and T57.
Measured on build `1a84b6cb` with a mocked headset in desktop Chrome (scratch scripts, not committed).*

## 1. Summary

1. In the headset most text is too **small in angle**. Resolution is not the main problem. Monitor body text is 0.70–0.81°. The small screens are 0.35–0.70°. Reading studies put the minimum near 0.8° and comfort at 1.2–1.3°.
2. The screen canvases already carry 50–60 texture pixels per degree. The eye buffer (at `xrscale` 1.4) carries only about 17 (my estimate). So more canvas pixels cannot help. Bigger letters can, and a sharper eye buffer can.
3. The frame's own planes (menu, site viewer, Close cards) are 1.1–1.7°: inside the comfortable band. The 2003 phone and Floppy Sheep, which he called "out of focus", are 0.35–0.7°. The numbers match his notes.
4. The 1997/2003 text is probably drawn in a thinner font in the headset than on the Mac. On Android, "Courier New" means Cutive Mono, a light typewriter face. This needs a two-minute check.
5. T57 went black in a way the code cannot catch: nothing throws, so the fallback never runs. The code also has four definite bugs. A staged re-test can find the cause in about five minutes of headset time.
6. **First batch:** (1) a headset type floor on the small screens, (2) check the fonts, then ship them, (3) bigger glass in the headset. Free test tonight, no build: `?reinterp=1&xrscale=1.6&debug=1`.

**⚑ His test (12 Nov), the free one from the summary (`?reinterp=1&xrscale=1.6&debug=1`), 1997's monitor in the headset: "it is looking better"** (his photo: the Seekr page and the taskbar's "Lamby 1997" read clean). The frame rate at 1.6 is not yet reported. It decides whether 1.6 can be 1997's default (idea 4: a per-era scale, 72 Hz floor).

## 2. How to read the numbers

- **Text size (°)** = the font size as seen from the seat, in degrees. Bigger is easier.
- **Targets.** Solum (2019): minimum 0.8–0.92°, comfortable 1.2–1.3°. Google (2017): 1.375° comfortable. Dingler (2018): 1.8° comfortable. All three are cited in Kilpeläinen & Häkkinen 2023. Microsoft's HoloLens figures are lower (minimum 0.35–0.5°, comfortable 0.6–0.8°), on a sharper display. I use **0.8° as the floor and 1.0–1.2° as the aim.**
- **Quest 3 display:** 25 pixels per degree (Meta).
- **Eye buffer** (what the room is drawn into before the lenses) at `xrscale` 1.4: about **17 pixels per degree** in the middle of the view. This is an estimate. Meta gives 1680 × 1760 per eye at scale 1.0 for native apps; ×1.4 gives 2352 × 2464. The Quest 3 field of view comes from a forum post. Both should be measured on the device (idea 13).
- **Eye position** = the seat plus the headset's 0.15 m lean (`xrComfort.ts` LEAN). A visitor who sits back sees everything smaller.
- **Pixel fonts** (the 5×7 game font): a "×1" capital is 7 pixels tall. I count that as a 10-pixel font, because capitals are about 70% of a font's size.

## 3. Pixels per degree, surface by surface

| Surface | Canvas in headset (px wide) | Glass (m) | Eye distance (m) | Canvas px per degree | Body text (°) | Smallest (°) | Verdict |
|---|---|---|---|---|---|---|---|
| Daniel's monitor, 1997 | 2048 | 0.40 × 0.30 | 0.56 | 50 | 0.81 (10 px) | 0.72 (9 px) | at the minimum |
| Daniel's monitor, 2003 | 2048 | 0.40 × 0.30 | 0.56 | 50 | 0.81–0.89 (10–11 px) | 0.72 (9 px); film card mark 0.56 (7 px) | at the minimum |
| Vera's workstation, 2016 | 2704 | 0.645 × 0.372 | 0.79 | 58 | 0.70–0.83 (10–12 px) | 0.56 (8 px) | below |
| Handset Window, normal view (phone ×0.92) | part of the workstation | – | 0.79 | 58 | 0.70–0.77 | 0.70 | below |
| Handset Window, larger view (×1.10) | part of the workstation | – | 0.79 | 58 | 0.84–0.92 | 0.84 | at the minimum |
| **Floppy Sheep** in the Handset Window | part of the workstation | – | 0.79 | 58 | 0.42–0.73 (its UI) | 0.35 (signs in the game) | **far below** |
| Maya's monitor, 2026 | 2840 | 0.533 × 0.288 | 0.66 | 61 | 0.72–0.78 (11–12 px) | 0.65 (10 px) | below |
| **2003 phone, CLEAR** (held) | 240 (game pixels) | 0.062 × 0.083 in hand | 0.42 | 28 | 0.35 (×1) · 0.70 (×2) | a ×1 stroke is 0.6 of an eye pixel | **far below** |
| 1997 handheld, FIT IN (held) | 160 (game pixels) | 0.069 × 0.062 in hand | 0.42 | 17 | 0.59 (×1) · 1.17 (×2) | – | mixed |
| 2026 console, MATCH MADE (held) | 960 (game pixels) | 0.211 × 0.122 in hand | 0.42 | 33 | 0.60 (×2) · 0.90 (×3) | – | mixed |
| Site viewer | 1536 | 0.90 × 0.675 | 0.80 | 24 | 1.38 (22 px) | 0.94 (15 px chips) | comfortable |
| Frame menu | 1024 | 0.62 × 0.465 | 0.62 | 18 | 1.23–1.68 (22–30 px) | 0.89 (16 px) | comfortable |
| Close card | 1024 | 0.84 × 0.46 | 1.15 | 25 | 1.23–1.63 (30–40 px) | 0.98 (24 px) | comfortable |
| Helper plate | 1024 | 0.50 × 0.066 | 0.67 | 24 | 1.08 (26 px) | – | good |
| Pointer tag | 1024 × 96 | ~1.7° tall at any distance | – | 56 | 0.71 (40 px) | – | small, but a label |
| Setup window in the stars | 2048 | 1.0 × 0.75 | 1.0 | 36 | 1.12 (10 px) | 1.01 (9 px) | good |
| Witness wall record | 1536 | 1.5 × 1.125 | 3.15 | 56 | 0.53–0.59 (10–11 px) | 0.43 (8 px) | below |

**What the table says**

- The canvases already deliver 17–61 texture pixels per degree. That is at or above the eye buffer's ~17 everywhere. So **raising canvas resolution cannot sharpen anything**: the mipmaps throw the extra away.
- The text that works (frame, site viewer, Close) is 1.1–1.7°. The monitors sit on the 0.8° floor or below it. The small screens are far below it. That is why text reads "only very close".
- The held devices hang at 0.42 m. That is under Meta's 0.5 m comfort floor for things you look at for a long time.
- CLEAR's ×1 letters have strokes thinner than one eye pixel. They turn grey and soft. That is the "out of focus" look.
- At 1997's 12.4 logical pixels per degree, one logical pixel is about 1.4 eye pixels. That uneven ratio makes pixel-art edges step unevenly. It is a likely part of the "serrated knife" look on the monitors.

**Where I estimated**
- The eye buffer's pixels per degree (see §2).
- The visitor's real head position. I used the seat plus the lean.
- The Handset Window and Floppy Sheep sizes come from the code: phone fonts 11–12 px × 0.92, and Floppy's `FS` map × 0.6 × 0.92. They were not caught in a run.
- The 2026 console on the desk, unheld, is 0.14–0.20°. I assume nobody needs to read it there.

**How I measured.** A scratch Puppeteer probe loaded each era with `?debug=1`, set XR to active (so the canvases took their headset size, ×4), and read each screen entity's world size and distance from the XR eye. It also hooked `fillText` to record every font size drawn on each canvas. The held sizes add each device's in-hand scale: `bigInHand` in `heldDevice.ts`, which is ×1.77 for the flip phone and ×1.3 for the others. Codex's table of 8 Nov is the same idea, but measured before the 0.15 m lean.

## 4. T57: why `quad=1` went black

**What he saw (10 Nov, 20:25–20:27, cast frames `202529`–`202620`).** He loaded `?reinterp=1&quad=1&xrscale=1.4&debug=1` and pressed Enter VR. The view was black for about a minute: no stars, no ray. With `quad=0` he entered normally (`202637`, the stars entrance).

**What `quad=1` does**
1. The session asks for the `layers` feature. Every Enter VR button does this, including the stars entrance.
2. On the **first headset frame** the quad code switches on, even in the stars. The OS starts in era `e1` and the monitor entity is enabled, so the code's check passes. It does not wait for the room or for the first press (calibration).
3. It moves the room's own `XRWebGLLayer` out of `baseLayer` and into `layers: [room, quad]`. The patched engine keeps drawing into the room layer.

**Most likely cause of the black (not proven).** The Quest did not show the room layer once it sat in the `layers` list, or once the `layers` feature was on.
- The spec allows this setup: the Layers explainer says an `XRWebGLLayer` may go in the list.
- But the official samples and three.js put an `XRProjectionLayer` there instead. So this path is less tested on the Quest.
- When a layer is simply not shown, nothing throws. The code's fallback only runs on an exception, so it never ran. That fits "black, nothing happening".
- Black screens with the layers feature on Quest are a known class of problem (a Babylon.js case is in the sources).

**Definite bugs (each must be fixed before any re-test)**

- **(a) A static layer that is redrawn.** The quad is created with `isStatic: true`, but the monitor changes all the time. The spec makes `getSubImage` throw when a static layer is drawn again without a redraw request. So even on a Quest where layers work, the quad would fail at the monitor's first change and retire. Codex's mock did not apply this rule.
- **(b) The pose is in the wrong space.**
  - The quad's position comes from `physicalPoint`, which gives world coordinates.
  - A quad's `space` is the XR reference space. In PlayCanvas that is the camera rig's local space: `xr-manager.js` sets the tracked head as the camera's local transform.
  - So the quad would hang one rig offset away from the glass, roughly 1.1 m too high, while the real monitor plane is hidden.
  - Its axes also use the world's right and up. That only fits a screen facing +Z, the 1997 one.
- **(c) It switches on too early:** in the stars, before calibration, before the room is ready.
- **(d) It draws over everything.** `[room, quad]` puts the quad in front of hands, the ray, the menu, Lamby's balloon and the site viewer. Layers have no depth test unless `depth-sorted-layers` is used.
- **(e) Too many texels and no mipmaps.** 2048 px across ~40° is ~50 texels per degree, for a 25 px per degree display, sampled once with no mipmaps. That will shimmer. About 1024–1280 px wide is right for the CRT.
- **(f) No way out in the headset.** The fallback needs an exception. A silent black screen keeps you stuck until you leave VR.

**A minimal, safe re-test** (debug only, never the default)

*First, on the desktop (no headset):*
- Fix (a)–(f):
  - a dynamic layer, drawn only when the canvas changes or the layer asks for a redraw;
  - the pose in rig-local space, using the screen's own axes;
  - switch on only after calibration, in Daniel's room;
  - a texture about 1280 × 960;
  - set `quality = 'text-optimized'` if the browser has it;
  - put the quad behind the room (`[quad, room]`) with an alpha-0 hole cut where the glass is, so hands and menus stay in front. Or hide the quad while any frame plane is up.
- Make the mock in `tools/xr-monitor-check.mjs` stricter. It should throw on a static redraw, clear `baseLayer` when `layers` is set, and check the quad's pose against the glass in reference space.
- Optional: run the WebXR Layers polyfill on an emulated session in desktop Chrome. It composites the layers itself, so you can see the quad's position and order.

*Then on the Quest, about a minute per step, a fresh load each time:*

| Step | URL flag (new, debug only) | Question it answers | If black |
|---|---|---|---|
| 1 | `quad=feature` | Does just asking for `layers` break entry? | Stop: the feature breaks this app on Quest. |
| 2 | `quad=room` | `layers: [room]`, no quad. Does Quest show our antialiased `XRWebGLLayer` from the list? | Stop: the path needs an `XRProjectionLayer`, which is a much bigger engine change. |
| 3 | `quad=test` | `[quad, room]` with a fixed test card 1 m ahead. Do compositing, pose and hole work? | The cast shows which part fails. |
| 4 | `quad=1` | The 1997 monitor, after the first press. | Use the live switch. |

- Add a **live switch** on a controller button under `?debug=1` that toggles the quad on and off in place. That gives a true A/B in the same seat and the same second, which is far better than two loads. It also gives a way out of black.
- If anything is black, read the console from the Mac. This needs the Quest in developer mode, a USB cable and `chrome://inspect`.

**Desktop or Quest?**
- *Desktop can check:* the spec rules, the pose maths, the order and hole logic, the upload and copy counters, and the fallback paths.
- *Only the Quest can check:* whether it shows an `XRWebGLLayer` from the list, whether it honours the room layer's alpha, real sharpness, shimmer, timing, and how it feels with hands near the glass.

## 5. Ideas, ranked

Ranked by gain × confidence, against cost × risk. ★ = recommended first batch.

### ★1. A headset type floor on the small screens ("Large Fonts", the period way)
- **What:**
  - In the headset only, raise any text under 0.8° to at least 0.8°, aiming for 1.0° for body text.
  - Frame it as each era's own large-text setting: Windows 95/98 "Large Fonts", XP's "Large" font size, iOS "Larger Text", 2026 zoom. *(Those settings are from memory; I did not open sources for them.)*
  - Start with the worst surfaces:
    - CLEAR's ×1 lines to ×2 (0.35° → 0.70°, and ~0.9° with ★3);
    - Floppy Sheep's UI floor to about 20 game units, and the larger Handset view while it plays (0.42–0.73° → about 0.8°);
    - 2016's 8–10 px to 12 px (0.56–0.70° → 0.83°);
    - 2026's 10 px to 12 px (0.65° → 0.78°);
    - FIT IN's ×1 lines to ×2.
- **Plus a check tool:** make the scratch probe permanent. It gives every `fillText` size in degrees from the headset seat and fails anything under the floor. "Too small" then becomes findable without a headset, the way `walk.mjs` finds "unreachable".
- **Gain:** letters ×1.2–2.0 bigger where it is worst. This is H40's own order: "larger type on the small screens before any compositor work".
- **Cost:** medium.
  - Layouts are tight (512 × 384, 676 × 390, 710 × 384). Lines will wrap or overflow, and each changed window needs stills and a walk.
  - No draw calls, no extra uploads.
- **Era look:** low risk if it follows each era's own large-text mode. The 5×7 font stays the 5×7 font.
- **Without a headset?** Yes for sizes and overflow (the tool and stills). Only the Quest can judge how it reads.
- **Files:** `src/desktop/theme/fonts.ts` (an XR floor in `fontFor`), `src/games/clear.ts`, `src/games/fitIn.ts`, `src/games/matchMade.ts`, `src/desktop/apps/floppysheep.ts` (`FS`), `src/room/graceQueueLite.ts` (Handset view), the 2016/2026 apps that use 8–10 px, and a new check in `tools/`.

### ★2. Find out which font the headset really draws, then ship the fonts
- **What:**
  - (1) *Probe, two minutes.* Under `?debug=1`, draw one sample line in each font stack (1997 mono, 2016 sans, 2026 sans, the frame's Tahoma) on the debug plate, with its measured width. Photograph it through the cast.
  - (2) *Ship the faces `fonts.ts` already names.* `public/assets/fonts/` does not exist yet, so none of them resolve. That means:
    - a sturdy bitmap-style mono for 1997/2003: the planned Fixedsys Excelsior, which `fonts.ts` calls public domain, or a VGA/Windows-era face from a pack with a clear licence;
    - Roboto for 2016;
    - Inter for 2026.
  - Load them with the other assets, before the first paint.
- **Why:**
  - On the Mac, the 1997 stack resolves to Menlo Bold, so every still we review shows Menlo.
  - In Android's font list, "Courier New" is an alias for **Cutive Mono**, a light typewriter face with no bold, so the browser fakes the bold.
  - "Lucida Console", Menlo and Consolas are not on Android, so the stack falls through to "Courier New".
  - If Quest keeps Android's list (likely, not proven), **all 1997/2003 text in the headset is thinner than anything we see in review.**
  - 2016, 2026 and the frame fall back to Roboto there, which is fine.
- **Gain:** unknown until the probe. If it shows Cutive Mono, this is probably the biggest single gain for 1997/2003, at zero runtime cost. It also makes our stills match the headset.
- **Cost:** small.
  - Font files (tens to hundreds of KB), `@font-face`, licence rows (`npm test` checks licences), and a wait for `document.fonts` before the first paint.
  - This is asset load, not a runtime network call.
- **Era look:** better. 1997 used bitmap system faces, as `fonts.ts` itself says.
- **Without a headset?** Partly. Install Cutive Mono locally to preview what the Quest probably draws. The probe itself needs the Quest (or the cast).
- **Files:** `src/desktop/theme/fonts.ts`, `index.html`, `public/assets/fonts/`, `assets/LICENSES.md`.

### ★3. Bigger glass in the headset, never closer than 0.5 m
- **What:**
  - *Held devices:* hold them at 0.5 m (Meta's comfort floor), not 0.42 m, and raise the in-hand scale so the angle still grows about 30%. CLEAR goes from ×1.77 to about ×2.75; FIT IN and the console from ×1.3 to about ×2.0.
  - *Monitors:* in the headset only, scale the glass and its monitor 1.2× around the glass centre:
    - 1997 CRT 0.40 → 0.48 m wide (about a 21-inch tube);
    - 2016 panel 0.645 → 0.77 m;
    - 2026 monitor 0.533 → 0.64 m.
  - Do not move the CRT nearer. It is 0.56 m away, already near the 0.5 m floor.
- **Gain:** every monitor letter ×1.2 (1997 body 0.81° → 0.97°). Held devices ×1.24–1.3. With ★1, most text reaches 0.9° or more.
- **Cost:** small to medium.
  - Same textures, same draw calls.
  - Check for collisions with the keyboard and props, and check that the hit tests scale with the plane.
- **Era look:** a bigger monitor, and a phone bigger than life "brought to the eye". Both are plausible but are **design calls for Sérgio**.
- **Without a headset?** Yes for angles and collisions (`tools/xr-tour.mjs` stills). Comfort only on the Quest.
- **Files:** `src/room/heldDevice.ts` (`XR_HOLD`, `bigInHand`), `src/room/handheld.ts` (`holdDist`), `src/engine/app.ts` (`SCREEN`, the monitor prop), `src/room/era3Devices.ts` (`PLACEMENT`).

### 4. More pixels in the eye buffer where the frame rate allows (free test tonight)
- **What:** raise `xrscale` from 1.4 to 1.6 (or 1.8) per era. The code already reads `?xrscale=`; it clamps at 1.6, so 1.8 needs that limit raised. Per era means a new layer during the era-change flyover.
- **Gain:** eye buffer about 17 → 19.4 px per degree at 1.6 (+15%), or 21.8 at 1.8 (+29%). This is an estimate. It gives sharper strokes, not bigger letters.
- **Cost:**
  - GPU fill +31% at 1.6, +65% at 1.8.
  - His 10 Nov readout: 82 fps in 1997; 56–68 fps in the 2003 video and 2016 windows (already under the 72 floor); 77–93 fps in 2026.
  - So 1997 and 2026 may take 1.6. 2003 and 2016 cannot until idea 6 frees time.
- **Era look:** none.
- **Without a headset?** No. **Free test, no build:** `?reinterp=1&xrscale=1.6&debug=1`, then read the fps in 1997.
- **Files:** `src/engine/app.ts` (~:660–675).

### 5. T57 done safely: one compositor layer for the main monitor
- **What:** §4's fixes and staged test, on Daniel's monitor first.
- **Gain:** the only way past the eye-buffer limit. About 17 → 25 px per degree (+48%), sampled once instead of twice. Meta says compositor layers let smaller text stay readable. It also allows the `text-optimized` hint. No draw calls; about 0.1 ms of compositor time per layer (Meta's Quest 2 figure).
- **Cost:** high. It keeps the engine patch, needs the hole and the order logic, and needs work for each screen.
- **Risk:** it went black once.
- **Era look:** none. It also helps the pixel-art edges: two display pixels per logical pixel is a more even ratio.
- **Without a headset?** The logic, yes (a stricter mock, the polyfill). The result, Quest only.
- **Files:** `src/frame/xrMonitorQuad.ts`, `tools/patch-playcanvas-xr.mjs`, `src/engine/app.ts`, `tools/xr-monitor-check.mjs`.

### 6. Buy back frame time: upload only what changed
- **What:**
  - (a) Upload only the changed rectangle of a canvas (WebGL2 `texSubImage2D` of a region, then rebuild the mipmaps).
  - (b) Draw the headset canvases at ×3, not ×4. They would still be 37–46 texels per degree, about twice the eye buffer.
- **Gain:** no direct sharpness. But Floppy Sheep redraws a ~165 × 330 window up to 30 times a second, and each redraw re-sends the whole 2704 × 1560 workstation canvas (16.9 MB). The 2003 film re-sends 2048 × 1536 (12.6 MB) about 30 times a second (Codex's 8 Nov count). Cutting that is the likeliest way to lift 2003/2016 above 72 fps, which idea 4 needs.
- **Cost:** medium. Bypass `Texture.upload` for a region, and keep the S105 upload counter honest.
- **Era look:** none.
- **Without a headset?** Yes for byte counts and stills. Frame rate only on the Quest.
- **Files:** `src/engine/screenTexture.ts`, `src/desktop/os.ts`, `src/room/era3Devices.ts`, `src/room/graceQueueLite.ts`.

### 7. Pixel-art game screens: keep the pixels square
- **What:**
  - The three games are drawn at game resolution (160 × 144, 240 × 320, 960 × 540) and magnified with linear filtering.
  - Held, FIT IN lands at about one eye pixel per game pixel, so each 1-pixel stroke smears over two eye pixels.
  - Fix: draw each game into a canvas 3× larger with nearest-neighbour (each game pixel becomes 3 × 3) before upload. Or use a "sharp bilinear" sampling tweak in the screen shader.
- **Gain:** crisp edges on the game screens. Best paired with ★1 and ★3: crisp alone does not make letters big enough.
- **Cost:** the canvas route sends 9× the bytes at the game's frame rate (CLEAR 0.3 → 2.8 MB a frame). The shader route sends no extra bytes but needs a shader chunk on three materials.
- **Era look:** better. Pixel art stays square.
- **Without a headset?** Yes (mocked-headset stills).
- **Files:** `src/room/heldDevice.ts`, `src/engine/screenTexture.ts`.

### 8. No pure white on pure black for small text in the headset
- **What:** Meta advises against pure white and pure black. He noticed jagged text "on black background" in the IRC. In the headset only, dim the screen material's glow a little (about 0.9, so white reads near #E6E6E6) and lift pure black slightly. Palettes stay as they are.
- **Gain:** small to moderate, on light-on-dark text.
- **Cost:** tiny (one material value).
- **Era look:** a slight dimming.
- **Without a headset?** No: it is about perception.
- **Files:** `src/engine/screenTexture.ts` (`makeScreenEntity`).

### 9. Less text per screen
- **What:** shorter lines, fewer per window. His own H08: "too much text". It frees room for ★1's bigger type.
- **Cost:** writing, which is Claude's per CLAUDE.md; his `_s` lines stay his.
- **Without a headset?** Yes (stills).
- **Files:** `data/strings/*`.

### 10. A light sharpen in the screen shader
- **What:** a small unsharp mask (four extra texture reads) to offset the two resampling steps.
- **Gain:** small. My guess is 10–20% more edge contrast.
- **Risk:** halos and shimmer when the head moves.
- **Without a headset?** Stills can show halos. Shimmer only on the Quest.
- **Files:** `src/engine/screenTexture.ts`.

### 11. The Handset Window drawn at the workstation's own scale
- **What:** the mirror is drawn at 2× and then stretched 1.84× inside the 4× workstation canvas. Draw it at 4× in the headset.
- **Gain:** small at the seat (still about 31 texels per degree, above the eye buffer). More if ★3 enlarges the glass.
- **Cost:** tiny.
- **Files:** `src/room/graceQueueLite.ts` (`SS`).

### 12. SDF/MSDF text for the frame's cards: not recommended
- The frame is already 1.1–1.7°.
- SDF helps when text is magnified. Our problem is shrinking into a coarse eye buffer.
- A 2026 three.js report on Quest 3 found SDF text shimmered and was not sharper. Raising the framebuffer scale to 1.35 or more was the fix there.
- It would also break the one-canvas law and add draw calls.

### 13. Measure on the device (enabler, tiny)
- Add the eye-buffer size and the field of view to the `?debug=1` plate.
- That turns this report's "about 17 px per degree" into a measured number, and tells us how much ideas 4 and 5 can really gain.
- **Files:** `src/frame/xrDebug.ts`.

### Checked and ruled out
- **More canvas resolution:** the canvases are already 50–61 texels per degree on the monitors, against about 17 in the eye buffer.
- **Mis-scaled images inside the 1997/2003 canvases:** a `drawImage` probe on the IRC, web, kit, Root Cause, diary, Restorify, media, NetVision and Caleb's chat found none. The only copy is NetVision's, at 1:1.
- **Foveation:** already 0. Keep it there.
- **Snapping text to the texel grid:** canvases at ×4 are about 3× oversampled, so snapping cannot show.

## 6. Sources

**Opened for this report**
- Meta, *Compare devices*. Quest 3: 2064 × 2208 per eye, 25 PPD, 110° × 96°. https://developers.meta.com/horizon/essentials/compare-devices
- Meta, *Render scale*. Quest 3 at scale 1.0: 1680 × 1760; about 1.2 matches the display. https://developers.meta.com/horizon/essentials/render-scale
- Meta, *Typography*. 14 px minimum, 18 px comfortable; heavier weights read better; test on hardware. https://developers.meta.com/horizon/design/styles_typography/
- Meta, *Design requirements (Android apps)*. Contrast 4.5:1; avoid pure white and black. https://developers.meta.com/horizon/documentation/android-apps/design-requirements
- Meta, *Display*. Look-at content at least 0.5 m away; about 1 m is comfortable. https://developers.meta.com/horizon/design/display/
- Meta, *WebXR fixed foveated rendering*. Text shows the artefacts; switching render targets mid-frame turns off FFR and MSAA. https://developers.meta.com/horizon/documentation/web/webxr-ffr/
- Meta, *WebXR Layers*. Higher-quality text and images; avoids double sampling. https://developers.meta.com/horizon/documentation/web/webxr-layers/
- Meta, *Compositor layers (native)*. Sampled once; smaller fonts stay readable; 16 layers; about 0.1 ms each on Quest 2; sharpening and supersampling flags. https://developers.meta.com/horizon/documentation/native/android/os-compositor-layers/
- W3C, *WebXR Layers API Level 1*, Working Draft, 11 Aug 2026. The `quality` attribute, `text-optimized`. https://www.w3.org/TR/webxrlayers-1/
- Immersive Web, *Layers editor's draft*. updateRenderState §11.2; static layers and `needsRedraw`; order back to front; no depth test without `depth-sorted-layers`. https://immersive-web.github.io/layers/
- Immersive Web, *Layers explainer*. An `XRWebGLLayer` may sit in the layers list. https://github.com/immersive-web/layers/blob/main/explainer.md
- Immersive Web, *quad-layer sample*. A projection layer plus a quad, drawn when `needsRedraw`. https://github.com/immersive-web/webxr-samples/blob/main/layers-samples/quad-layer.html
- Immersive Web, *WebXR Layers polyfill* (Apache 2.0). https://github.com/immersive-web/webxr-layers-polyfill
- Babylon.js forum. A black screen on Quest with the layers feature, fixed in the engine. https://forum.babylonjs.com/t/quest-2-black-screen-in-webxr-when-scene-autoclear-false-and-using-layers-feature/34518
- AOSP `fonts.xml`. "courier new" → serif-monospace = CutiveMono; tahoma, verdana and arial → sans-serif (Roboto); monospace = DroidSansMono. The file is marked deprecated, and Quest's own list is unverified. https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/data/fonts/fonts.xml
- Microsoft, *Text in Unity (HoloLens)*. Minimum 0.35–0.5°, comfortable 0.6–0.8°; avoid light weights. https://learn.microsoft.com/en-us/windows/mixed-reality/develop/unity/text-in-unity
- Kilpeläinen & Häkkinen 2023, *Frontiers in Virtual Reality*. Legibility cannot be read off PPD. Cites Solum 2019, Dingler 2018 and Google 2017 for angular sizes. https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2023.1243387/full
- Kojić et al. 2020 (QoMEX). The best angular size for reading in VR depends on text length. https://arxiv.org/abs/2004.01545
- three.js forum, Aug 2026. Quest 3: SDF (troika) shimmered and was not sharper; a framebuffer scale of 1.35 or more fixed it; the native factor reported 1. https://discourse.threejs.org/t/vr-web-applications-font-rendering-issues-bitmap-vs-sdf/93545
- NVIDIA developer forum. Quest 3 per-eye field of view, used for the eye-buffer estimate. https://forums.developer.nvidia.com/t/cloudxr-js-6-2-0-right-eye-projection-offset-on-quest-3-and-quest-pro-while-quest-2-is-correct/381281

**From memory (not opened):** Windows 95/98 "Large Fonts", XP's large font sizes, iOS "Larger Text". I did not check the licences of VGA-era font packs.

**Project:** `CODEX_XR_TEXT_REPORT_2026-11-08.md`, `HEADSET_SESSION_2026-11-10.md` (and its cast frames), `HEADSET_TRIAGE_2026-11-10.md`, `META_WEBXR_NOTES_2026-11-01.md`; the code in `src/frame/xrMonitorQuad.ts`, `src/engine/app.ts`, `src/engine/screenTexture.ts`, `src/frame/xrComfort.ts`, `src/room/heldDevice.ts`, `src/room/handheld.ts`, `src/room/era3Devices.ts`, `src/room/graceQueueLite.ts`, `src/desktop/theme/fonts.ts`; PlayCanvas 2.19.6 `xr-manager.js` and `webgl-xr-bridge.js`.
