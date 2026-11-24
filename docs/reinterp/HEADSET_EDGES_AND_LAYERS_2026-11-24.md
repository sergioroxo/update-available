STATUS: live

# The headset's edges and text: what we use, what his links say, what is left (24 Nov 2026)

*His question, 23 Nov, with 17 links: "are [we] using MSAA for the anti aliasing?", and "should we do this?
https://developers.meta.com/vr/discover/metavr/ or setup mcp for it?" Answered by the orchestrator (S357gc) from the
code and from the 14 pages, read on 24 Nov. Nothing was built.*

## 1. What the piece uses today

| look | anti-aliasing | since |
|---|---|---|
| **Headset** | **MSAA on the headset's own layer.** PlayCanvas 2.19 creates its layer with `antialias: false` (`webgl-xr-bridge.js`, `attachPresentation`), so on `xr.start` the piece replaces it with its own `XRWebGLLayer({ antialias: true, framebufferScaleFactor: 1.4–1.5 (cap 1.6; `?xrscale=` tries others) })` and sets `fixedFoveation = 0` (`src/engine/app.ts` ~l. 709–726). The engine's own 4× back buffer is switched off for the session (`device.samples = 1`), so nothing renders through an intermediate target and the layer's MSAA reaches every pixel. | S270c (28 Oct: scale + foveation off, his "text… kind of blurry"), S292 (2 Nov: MSAA kept, 1.4–1.5×, his "serrated knife"), S357fp (22 Nov: the browser's MSAA steps aside in a headset) |
| **Computer and phone** | MSAA on the canvas (`antialias: true`; `?aa=0` turns it off). It had been off since the first scaffold. | S357fp, live 22 Nov |
| **Screens** (monitors, devices, the setup and Home windows) | mipmaps + trilinear + the device's maximum anisotropy (`makeScreenTexture(…, 'screen')`); the room's own textures keep `FILTER_NEAREST` | S346 / his 9 Nov ruling |

## 2. What his links say, and what applies

- **MDN, XRWebGLLayer:** `antialias` asks for anti-aliasing; "the specific type … is determined by the user agent"
  (no sample count given). We ask for it. ✔
- **PlayCanvas CameraFrame (MSAA / SMAA / TAA) and legacy FXAA:** each adds a full-screen pass or a full-size extra
  target per eye per frame. PlayCanvas staff advise leaving scene multisampling off because "the cost is too high"
  (forum 40208). FXAA is deprecated and was reported as a black screen in VR (forum 14106). **Not for the headset.**
  On a computer, MSAA is already on.
- **Fern.solutions (April 2026):** PlayCanvas cannot do MSAA and fixed foveation together, because it renders into its own
  multisampled back buffer and foveation applies only to the XR layer. **We do not hit this:** we draw straight into our
  own layer, and foveation is off on purpose (his blurry-text note). It matters only if we ever need GPU headroom back.
- **PlayCanvas "Optimizing WebXR":** fewer draw calls, watch fill rate and overdraw, no realtime shadows. We already
  follow it (≤ 75 draw calls, no shadows).
- **Analytical anti-aliasing (frost.kiwi):** edges computed from a shape's own maths in a shader. It does not apply to
  text drawn on a canvas texture. It could soften thin lines (the Close's star links), which is a small, optional gain.
- **WebXR Layers (Meta blog and docs, the immersive-web explainer, A-Frame's `layer`):** the one real gain left for
  **text**. A quad layer hands the monitor's picture to the headset's compositor, which samples it once instead of twice
  (Meta: "2D UI will look sharper and easier to read if rendered to a layer"). It also saves GPU time when the content
  does not change.

## 3. What is left: quad layers (T57 / the headset part of T09)

- **Already built, opt-in:** `?quad=1` (`src/frame/xrMonitorQuad.ts`, Codex, 8 Nov): the 1997 monitor as a quad layer
  beside the room's layer, with a guarded engine patch (`patches/playcanvas-2.19.6-xr-room-layer.patch`, applied on
  `npm install`, checked by `npm test`). The patch makes PlayCanvas keep drawing into the room's layer once `layers`
  replaces `baseLayer`. The patch is present in the engine build the app loads (3 replacements, checked 24 Nov).
- **10 Nov in his Quest:** black, and it could not enter VR (HEADSET_TRIAGE_2026-11-10 §0). So the cause is not the
  missing-patch case the explainer warns about. Only the headset can show it.
- **To find it:** one short session with the Quest on a USB cable, developer mode on, and the Quest Browser's console open
  on the Mac (`chrome://inspect`). Load `?quad=1`, read the error, fix it, try again. If it works, it can spread to the
  other eras' monitors one at a time, each checked in the headset.

## 4. Meta's "metavr" CLI and its MCP server

- **What it is:** Meta's developer tool for Quest (formerly Horizon Debug Bridge, `hzdb`), as a terminal command and an
  MCP server for coding agents (Claude Code included). It installs and launches apps, reads logs, takes screenshots,
  captures performance traces, searches Meta's docs, and publishes to the Horizon Store.
- **For this piece:** its pages describe native apps (Android packages, Unity, Unreal) and say nothing about WebXR or the
  Quest Browser. It is free; an account is optional (needed only for the Store). Installing it changes the shell setup,
  and its setup asks for telemetry consent.
- **Recommendation:** not now. The one place it might help is reading the headset's logs and taking screenshots during the
  quad-layer session, and the browser's own `chrome://inspect` already does that. If he wants it, it can be tried in that
  same session, with his yes before installing.

## 5. His yes (24 Nov): the cable session, next headset morning

His words: "Yes, let's set it up next headset session in the morning." (asked whether the Quest can be connected to a Mac
for the MCP). The plan, in order; each step is checked before the next.

**Already on the Mac (checked 24 Nov):** `adb` (Homebrew, `/opt/homebrew/bin/adb`; an adb key from July 2023, so this Mac
has debugged a device before), Google Chrome, Meta Quest Remote Desktop. Not installed: `metavr` / `hzdb`.

1. **Developer mode on the Quest** (his, on his phone): Meta Horizon app → the headset → Headset settings → Developer
   mode on. It needs a free Meta developer organisation; if he has none, the app sends him to make one.
2. **The cable:** a USB-C cable that carries data, Quest to Mac. In the headset: "Allow USB debugging?" → Allow (tick
   "Always allow from this computer").
3. **Proof it is connected:** `adb devices` lists the Quest.
4. **The browser's console on the Mac:** Chrome → `chrome://inspect/#devices` → the Quest Browser's tab with the piece →
   inspect. From here every error the headset sees is readable on the Mac.
5. **The quad-layer test (T57):** the live site with `?quad=1`, in the headset, the console open on the Mac. Read why it
   goes black or cannot enter VR; write it down; fix it in a branch; test again in the same session if time allows.
6. **Optional, only with his yes before installing:** Meta's `metavr` (`npm install -g metavr`, then `metavr mcp install
   claude-code`), declining telemetry; try `adb`-free screenshots and logs from the headset. Keep it only if it does
   something `adb` + `chrome://inspect` do not.

Nothing here changes the piece. Anything built from what the console shows is its own session, walked, and pushed only
on his yes.

**Added 24 Nov (S357gf), his words: "remember that we want to connect the headset to the computer and to be able to run the screenshot system of casting".** The same cable session runs the job 35 trial first: `HEADSET_TRIAL_2026-11-24.md` (the Mac follows the game with `tools/trial-watch.mjs`; headset pictures by `adb exec-out screencap`; the report by `tools/trial-report.mjs`). Then step 5 (`?quad=1`).
