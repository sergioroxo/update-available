STATUS: live

# Meta's WebXR pages, read against the piece (1 Nov 2026)

He sent four links. What each means for this build, plainly.

| Page | What it says | What it means here |
|---|---|---|
| Fixed foveated rendering — https://developers.meta.com/vr/documentation/web/webxr-ffr/ | The edge of the view is drawn at lower resolution to save GPU time; set `fixedFoveation` (0–1) on `XRWebGLLayer`, or request a level at session start. Text-heavy, high-contrast scenes show the artefacts most. Switching render targets mid-frame turns FFR (and MSAA) off. | We already set `fixedFoveation = 0` (src/engine/app.ts, S270c) because the piece is text-heavy and he reads screens at the edge of the view. Keep it at 0. If 2026 is still slow in the headset, try 0.25 there only, and check text. |
| Space Warp — https://developers.meta.com/vr/documentation/web/webxr-space-warp/ | The compositor can make up every other frame, but only with the WebXR Layers API (`XRProjectionLayer`, texture arrays), a motion-vector pass and depth for every object; no transparent objects; a browser flag. | Not possible with PlayCanvas today without rewriting its renderer, and the piece is full of transparent panels. Not worth it: S288 already brought the worst view under the draw budget. |
| Porting to WebXR — https://developers.meta.com/vr/documentation/web/port-vr-xr/ | HTTPS, WebXR-capable frameworks, the polyfill; points to the Meta Developer Center for tuning. | Nothing to change: PlayCanvas 2.19 is WebXR-native and the site is HTTPS. |
| WebVR → WebXR migration — https://github.com/immersive-web/webxr/blob/master/webvr-migration.md | The framebuffer is sized by the browser, scalable with `framebufferScaleFactor` at layer creation. | We already create our own `XRWebGLLayer` with antialias on and up to 1.3× (capped at native). |

## The one idea worth trying for sharp text: WebXR quad layers

The "serrated knife" text he sees on screens and menus comes from drawing a flat screen into the 3D eye buffer and then
resampling it. The WebXR Layers API (on Quest) can show a flat texture as an `XRQuadLayer`: the compositor draws it at
the headset's own resolution, so text stays crisp. It would suit the menu, the site viewer and the monitor screens.
PlayCanvas has no built-in support, so it needs a small bridge (`XRWebGLBinding.createQuadLayer`, the canvas copied into
the layer's texture on dirty only). Cost: a day's work and a headset check. Recommended after the next headset session
confirms text is still the worst problem.
