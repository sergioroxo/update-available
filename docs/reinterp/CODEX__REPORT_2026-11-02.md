STATUS: live

# S306 — quad layers compatibility stop

**⚑ PROMPT STATUS: BLOCKED — PlayCanvas WebGL base-layer dependency; compatibility report complete.**

Branch: `codex/quad-layers`, based on `origin/reinterp` (`b06a3620`).

Stopped at the requested compatibility gate. Only this report and one BUILD_LOG.md line changed; no engine patch, bridge, optional-feature request, screen hiding or `?quad=0` switch was added. Browser and headset runtime code remain unchanged.

## Evidence

The installed PlayCanvas version is **2.19.6**. In `node_modules/playcanvas/build/playcanvas.mjs`:

- Lines 102397–102398 concatenate `options.optionalFeatures` into the session request: requesting `layers` is supported, but does not change the rendering backend.
- `WebglXrBridge.attachPresentation` (14231–14251) creates an `XRWebGLLayer` and installs it as `baseLayer`. The project's S270c/S292 handler in `src/engine/app.ts:617–634` replaces it with another `XRWebGLLayer` for MSAA and resolution scaling. Neither is an `XRProjectionLayer`.
- `beginFrame` (14203–14205), `getFramebufferSize` (14216–14222), and `getViewport` (14224–14229) read `frame.session.renderState.baseLayer`. With no base layer they select a null framebuffer, a 0 × 0 framebuffer size, and a zero-sized viewport.
- The projection-layer path elsewhere in this bundle belongs to `WebgpuXrBridge` (11654 onward), using `XRGPUBinding`; it does not provide a WebGL projection path for this task.

[WebXR Layers specification §11.2](https://immersive-web.github.io/layers/#updaterenderstate) makes the incompatibility explicit: submitting both properties throws; submitting `layers` clears `baseLayer`. Even including the existing `XRWebGLLayer` in the array leaves PlayCanvas's WebGL frame reads without their base layer. Restoring `baseLayer` clears the layers array. Preserving both requires renderer integration beyond the authorized bridge, so no workaround was attempted.

## Checks

- `npx tsc --noEmit -p .`: passed.
- `npm test`: passed.
- `npm run dev -- --host 127.0.0.1`: Vite ready on port 5173.
- Executed the actual installed `WebglXrBridge` class, extracted in memory from the bundle, against a mock frame. With a base layer, framebuffer, dimensions and viewport were valid. With the spec's resulting `{ baseLayer: null, layers: [quad, existingLayer] }`, assertions confirmed a null framebuffer, `[0, 0]` dimensions and a zero viewport. No installed files were changed. This verifies the engine failure path, not a headset compositor.
- No browser headset simulation was run: there is no new runtime path to exercise. Faking only `app.xr.active` as in `tools/xr-layer-review.mjs` would not validate render-state compatibility.

## Real Quest check

There is **no quad-layer A/B comparison in this branch**: default and `?quad=0` both retain the existing monitor plane. Do not interpret equal images as a failed compositor improvement. Once a compatible WebGL renderer path exists, compare the **1997 monitor text** in default versus `?quad=0`, at the same seated position and `xrscale`: small glyph edges, reading comfort, head-motion stability, Recentre alignment, session exit/re-entry, and dirty-only uploads. Crispness and compositor behavior still require a real Quest 3; none is claimed here.
