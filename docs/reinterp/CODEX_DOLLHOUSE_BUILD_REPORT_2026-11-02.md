STATUS: live

# Dollhouse room build — S307

On `codex/dollhouse-build`, the transition miniature grows vertically from its floor over eight seconds for e3/e4. Batch AABBs classify Room 1 (|x| < 2.13), Room 2 (x < -2.13), and Room 3 (x > 2.13). If a copied batch crosses those boundaries, the whole copied house grows together. Rebatching resets the growth clock; handling the turntable does not reset it. The normal hold remains 13 seconds, extended only if a late rebatch needs time to finish growing.

The original one-draw-per-material miniature exceeded the draw budget in review. Its copied batch geometry is now consolidated into at most two meshes (held/growing), with source material diffuse colours baked into vertex colours. The miniature uses an unlit palette-coloured material: the frame layer has no room lights. Source room meshes/materials remain untouched; only owned miniature meshes are disposed on rebuild/close.

The headset menu has a Dollhouse row, using the current era with steady lamps and no year clock or growth. It keeps the existing stick/hand turntable and hold behaviour. Nine menu rows now fit above the controls footer. Display text stays in data/strings/gameMenu.json. No new runtime network, storage, input type, or texture-upload loop.

Checks: `npx tsc --noEmit -p .`, `npm test`, Vite startup, and mocked-headset photographs from `tools/xr-layer-review.mjs`. The review now captures e3/e4 halfway builds, batch AABBs and scales, on-demand models, and draw-call maxima; it fails for page errors or more than 75 calls while a miniature is present.

Final review output: `/tmp/codex-dollhouse-verified/report.json`. Peaks from `window.__drawCalls` while a model existed: e1 **48**, e2 **55**, e3 **58**, e4 **52**, with no page errors. Halfway growth scales were approximately **0.52**; on-demand scales were **1**, and the year plate was disabled in all four eras. Both later-era batch lists span rooms, so these photographs exercise the whole-house fallback. Photographs: `/tmp/codex-dollhouse-verified/e3-dollhouse-half-build.png` and `/tmp/codex-dollhouse-verified/e4-dollhouse-half-build.png`. Visually checked the room build and the palette-coloured miniature. These are mocked single-camera counts, not stereo hardware measurements.

Real Quest 3 / Vision Pro still required: stereo draw count and 72 Hz timing, floor-up readability during the actual update/rebatch, the current-era menu press, hand/controller turning and zoom, target size/legibility, and comfort/placement. Headless review proves rendering, not headset reachability or performance. README was already modified locally and was not staged. No push.
