STATUS: live

# XR text experiment — 8 November 2026

Branch `codex/xr-text`, based on `origin/reinterp` at `f84abe63`. Opt in with `?reinterp=1&quad=1`. The quad is restricted to the 1997 CRT. Default and `quad=0` use the existing monitor plane and existing sampler policy. T10's film correction applies to both paths.

## Retained room layer

The application still creates its own antialiased `XRWebGLLayer`, with the existing `xrscale` clamp (1–1.6) and fixed foveation 0. The bridge submits `[roomLayer, monitorQuad]`. PlayCanvas's three WebGL framebuffer/size/viewport reads use the session's retained room layer only while this integration owns it. Otherwise they use the original `renderState.baseLayer` expression. No WebGPU changes.

`tools/patch-playcanvas-xr.mjs` applies the three exact replacements to the production, debug and profiler ESM distributions used by Vite. `postinstall` applies it; `npm test` checks it. Engine version must be exactly 2.19.6; both installation and the test fail on a version change or unexpected bridge content. The committed patch description is `patches/playcanvas-2.19.6-xr-room-layer.patch`. CJS/bundled distributions are not patched or used by this build.

The canvas is uploaded to an owned texture only on version changes. A framebuffer blit renders it into the compositor's opaque texture; opaque textures are never supplied to texImage2D/texSubImage2D. The static quad is copied again if the compositor requests a redraw, without another canvas upload. Raw framebuffer, texture, flip and scissor state is restored. Its pose is mapped through the same comfort transform as the room, including Recentre and desk matching. Its ordinary render component is hidden only after a successful quad copy; the entity remains available to the existing ray resolver. End destroys the quad and GL resources, removes the retained session property and restores the plane. Resize recreates the quad. Missing/denied layer support falls back to the room plane.

API basis: [WebXR Layers specification](https://immersive-web.github.io/layers/), particularly composition-layer drawing, opaque textures and updateRenderState. The compositor resamples a quad once; a room texture goes through the eye buffer first. This is a reason to test, not a claim of observed Quest sharpness.

## T10: film picture changes when the pointer moves

There is no HTMLVideoElement or video texture in NetVision: the film is painted in `src/desktop/apps/netvision.ts` onto the desktop canvas. The screen texture is created once. Previously the film marked itself dirty every update and drew fresh Math.random tape noise on every paint. The OS also repaints for pointer/target changes. Thus the same tape time had different pixels whenever repainted: a reproducible input-coupled picture instability, independent of fps or a texture being recreated.

The film now caches a picture per 30 Hz tape tick at the current render scale. Pointer redraws reuse it. Noise is deterministic within that tick, including redraws caused by hovering a different control; the authored signal break, captions, soundtrack clock, skip and close remain. Cached canvases are resized only when their dimensions change. No new animation frame loop or media element.

Controlled headless Chrome comparison, 2048 × 1536 canvas, 180 updates at an emulated 90 Hz (= 2 s), same clip opening:

| Counter | Before (`f84abe63`) | After |
|---|---:|---:|
| Dirty requests / potential screen uploads | 180 (90/s) | 59 (29.5/s; floating-point boundary) |
| OS paints submitted | 180 | 180 |
| Global random calls, including 10 extra pointer paints | 226,236 | 0 |
| Changed RGBA channels at fixed tape time after 10 pointer paints | 2,259 | 0 |
| CPU paint-loop time in the paired run | 43.9 ms | 12.2 ms |

These are controlled counters and CPU timings, not headset frame-rate measurements. The stand-alone final after-only run took 19.5 ms, showing the timing noise; the deterministic counters are the useful evidence. Other animated windows / real hover changes can still dirty the desktop. This fixes the reproduced repaint fault; whether it fully resolves the lead's observed headset symptom remains unverified.

Reproduce: `node tools/video-frame-check.mjs` (Vite 3117). For the paired baseline, place `git show f84abe63:src/desktop/apps/netvision.ts` in `src/desktop/apps/netvisionBefore.ts`, run with `--before`, then remove that temporary file. Do not include the baseline duplicate in npm test (it duplicates palette tokens). Results are in `out/xr-text/video*.json`.

## Screen density and type

`node tools/screen-density-check.mjs` records live canvas dimensions, texture samplers, actual fillText sizes and four-corner geometry. It samples profile, kit, diary, image viewer, film at six times, 2016 consent/board/jobs, and 2026 browser pages/laptop/visor. XR backing dimensions are measured by exercising the real resize code with the XR-active state emulated. Geometry and angular density below use the authored browser seat, before XR's 0.15 m lean and any physical head movement. H/V densities are source texels per degree, **not headset display pixels per degree**.

| Era · screen | Browser pixels → XR pixels | Glass metres W × H | Seat distance m; angular W × H | Texels/degree H/V, browser → XR | Browser mips; min/mag | Smallest rendered logical px → recommended reading minimum |
|---|---|---|---|---|---|---|
| 1997 · CRT | 1536 × 1152 → 2048 × 1536 | 0.400 × 0.300 | 0.705; 31.69° × 23.90° | 48.5/48.2 → 64.6/64.3 | off; nearest/nearest | 8 → 12 |
| 2003 · CRT | 1536 × 1152 → 2048 × 1536 | 0.400 × 0.300 | 0.705; 31.69° × 23.90° | 48.5/48.2 → 64.6/64.3 | off; nearest/nearest | 7 → 12 |
| 2016 · workstation + handset mirror | 2028 × 1170 → 2704 × 1560 | 0.645 × 0.372 | 0.934; 38.09° × 22.52° | 53.2/52.0 → 71.0/69.3 | off; nearest/nearest | 8 → 14 |
| 2016 · phone on stand | 540 × 1080 → 720 × 1440 | 0.059 × 0.119 | 0.961; 3.22° × 7.08° | 167.5/152.6 → 223.3/203.5 | on; trilinear/linear | 9 → 12 when held / mirrored |
| 2026 · laptop (present in base) | 672 × 420 → 896 × 560 | 0.300 × 0.188 | 0.902; 18.89° × 11.59° | 35.6/36.2 → 47.4/48.3 | on; trilinear/nearest | 8 → 11 |
| 2026 · monitor | 2130 × 1152 → 2840 × 1536 | 0.533 × 0.288 | 1.015; 29.20° × 16.01° | 72.9/72.0 → 97.3/95.9 | on; trilinear/nearest | 8 → 16 |
| 2026 · Commons stream (conditional) | 704 × 396 → 1408 × 792 | 0.560 × 0.315 | 1.225; 25.61° × 14.47° | 27.5/27.4 → 55.0/54.7 | off; nearest/nearest | not sampled → 12 |
| 2026 · visor (sampled stand/lift pose) | 1536 × 1152 → 2048 × 1536 | 0.186 × 0.105 | 0.963; 7.89° × 6.15° | 194.6/187.5 → 259.4/249.9 | on; trilinear/nearest | 10 → 12 |

The 8 px 1997 example is the image-viewer footer; most profile controls are 10 px. The 7 px 2003 example is a card mark in the film, not its main caption. In 2016 the 8 px example is the permission sticker; phone clock/detail text reaches 9 px. In 2026 the browser's × and small chrome reach 8 px; the laptop status bar is 8 px. These are observed minima for the sampled surfaces, not an assertion of exhaustive narrative reachability. The stream was not playing during the sample, so no live font minimum is claimed there. The recommendations are logical font sizes for reading/controls, not a blanket change to decorative marks.

The mirror is part of the workstation canvas, not another GPU screen texture. The base revision still has the 2026 laptop; its removal belongs to the separate work. There is no separate live 2026 phone canvas in this revision. The witness record shares a fixed 1536 × 1152 source (512 × 384 logical) across eras, on an initially 1.6 × 1.2 m surface; it does not get the OS's 4× resize. Its source contains 8 px annotations. Frame/menu/Home and setup have separate head-relative staging and are outside this monitor-first quad experiment.

Every `makeScreenTexture` already enables mipmaps, trilinear minification, linear magnification and device-capped anisotropy (up to 8) **during XR**, restoring the browser settings on end. Therefore 'turn mipmaps off' would undo existing XR anti-aliasing. No sampler/font changes were silently made to the default path.

For a face-on screen at 0.55–0.8 m, the CRT's 0.4 m width covers 39.97–28.07° (browser 38.4–54.7 source texels/degree; XR 51.2–73.0). A 0.645 m workstation covers 60.77–43.91° (browser 33.4–46.2; XR 44.5–61.6). A 0.533 m monitor covers 51.71–36.85° (browser 41.2–57.8; XR 54.9–77.1). These are normalized face-on comparisons, separate from the slanted seated measurements above.

Recommendation: preserve nearest magnification for browser pixel art, but trial the existing `'minify'` mode on the browser CRT and workstation (mips + trilinear, nearest magnification), which currently have no mipmaps. At these densities a screen is often minified into the eye/view buffer; nearest drops narrow strokes and shimmers as the view moves. Linear/trilinear averages those strokes, trading some still-edge hardness for stability. Linear magnification cannot create missing glyph detail. The actual sharper/comfortable setting needs the same seated visual comparison on Quest. Larger glyphs and stronger strokes help every device; more backing pixels alone do not enlarge the authored 7–10 px glyphs. Do not try to make the small phone-on-stand a reading surface merely by raising its texture resolution: its 3.22° width requires the existing lift/mirror.

## Verification

- `npx tsc --noEmit -p .`: passed.
- `npm test`: passed, including actual patched-engine execution for default / layers-only framebuffer, dimensions, viewports and cleanup, in all three ESM builds.
- `npm run dev -- --host 127.0.0.1 --port 3117`: ready.
- `node tools/xr-monitor-check.mjs`: passed. API-emulated XRSession/reference spaces/layers with real WebGL textures/framebuffers and PlayCanvas's real XR frame loop; default, `quad=0`, `quad=1`, two enter/select/end cycles each. Quad monitor texture contains pixels, layers-only room rendering remains 960 × 600, no WebGL errors, real kit control selection changes state, plane restores on exit. This is stronger than forcing only `xr.active`, but is still not a physical stereo compositor.
- `node tools/video-frame-check.mjs`: passed (0 fixed-time changed channels, ≤61 dirty requests per 180 updates).
- Era-1-only background walk (`node tools/walk.mjs --port 3117 --from-era 1 --one-era`): passed, 86 presses / 142 steps, reached e2 and stopped; console clean. Read only `out/walks/WALK_2026-11-08_SPEEDRUN_GUIDED_ONE_ERA.md`. No other era walked on this branch.

## Exact Quest 3 check for Sérgio (not yet run)

1. Serve this branch over HTTPS. Use the same headset/browser, seated position, display setting and `xrscale=1.4` for both runs. Start `?reinterp=1&quad=0&xrscale=1.4&debug=1`, enter VR, let the room settle, and Recentre from the menu. Use 1997 Profile setup, the Family Form and the kit: read the same small labels at a comfortable seat, then lean from about 0.8 m to 0.55 m.
2. Repeat from a fresh load with `?reinterp=1&quad=1&xrscale=1.4&debug=1`. Compare thin vertical/diagonal glyph edges, missing strokes, reading comfort and shimmer while slowly moving the head left/right. Do not compare a close-up quad with a distant baseline. Confirm text orientation, colour and glass alignment; there must be only one picture.
3. With quad active, select a real profile/kit button using the controller, then hands. Recentre twice, including after opening the menu while facing aside. Confirm the quad follows the glass and the same point still presses the same control.
4. Put a hand/controller between eye and monitor. A separate compositor quad sits above the room layer and does not share room depth: verify whether its foreground ordering is acceptable. Check menu/setup overlays too; a quad must not cover a panel the visitor needs. This experiment is not ready to become default until these compositor-ordering checks pass.
5. Exit VR, verify the browser monitor plane returns, re-enter twice. Try `xrscale=1.0` and `1.6` without changing the quad query; MSAA/room quality may differ but the monitor must stay aligned. With unsupported Layers, the ordinary plane must remain visible.
6. Continue normally into 2003: the quad must retire and its ordinary monitor return. With `quad=0`, play Lamby's video, hold the head still, move the controller across the glass and off it, then repeat with hands. Compare the same opening and the authored end-of-video signal break; only the authored break should break. Repeat with `quad=1` (2003 deliberately still uses the default plane). Check audio/captions, skip and pause.
7. Record query, distance, hand/controller mode, text comfort, shimmer, any foreground-order failure, Recentre, selection and re-entry. Only this check can establish improved Quest sharpness or resolution of the observed T10 symptom.
