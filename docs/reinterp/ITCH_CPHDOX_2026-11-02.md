STATUS: live

# CPH:DOX — private itch.io festival copy

This is an upload-ready HTML build. No itch project has been created or uploaded by this session.
The password belongs to itch's project settings. There is no password screen or password in this repository.

## Build and package

From the repository root:

```sh
npm run build:itch
python3 tools/package-itch.py 2026-11-02
```

The script sets `VITE_EDITION=festival`. Vite keeps `base: './'` and writes `dist-itch/`.
`src/edition.ts` ignores review URL switches in that edition; `src/main.ts` defaults to reinterpretation.
The public front door is unchanged: stars → first press → LambyOS Setup → restored room.
No `?reinterp=1` is needed. `?debug=1`, flat view, era jumps, setup jumps, the rig lab and the full review cut cannot be enabled by URL.
Fullscreen reload bookkeeping still works. Ordinary builds retain their existing URL behavior.

The archive is `release/your-update-has-failed_itch_2026-11-02.zip`.
Its root contains `index.html`, not a containing `dist-itch` directory.
Both output directories are Git-ignored. Rebuild and repackage after code changes.
The packager checks exact-case source imports, literal resource URLs, root-relative asset paths,
archive integrity, filename collisions and itch's size/path/file limits. It writes measurements to `out/itch/package.json`.

## Exact itch settings

1. Create or edit the project. **Kind of project: HTML** (the documentation also calls this HTML Game).
2. Upload the zip. Tick **This file will be played in the browser**.
3. **Embed options: Embed in page**. Set **Viewport dimensions: 1280 × 720**.
4. Tick **Fullscreen Button**. Keep **Click to Play** enabled. Leave scrollbars off.
5. Tick **Mobile friendly**. Choose landscape orientation if offered; ask phone viewers to rotate to landscape.
6. **Visibility & access: Restricted**. Enable **Also allow a password to view page**, then set a password there.
7. Save. Test from a signed-out/private browser, then share the project-page link and password with CPH:DOX.

1280 × 720 gives the setup and room a readable landscape frame; the canvas resizes for fullscreen.
Mobile friendly describes the supported touch layout, not a claim of a physical iPhone test.
These settings follow [itch's HTML5 upload guide](https://itch.io/docs/creators/html5)
and [itch's access-control guide](https://itch.io/docs/creators/access-control).
Itch limits the extracted content to 500 MB, each file to 200 MB, paths to 240 characters,
and the archive to 1,000 files. The packager also checks the compressed zip is below 500 MB.

## Iframe behavior and code evidence

**Quest / WebXR.** A cross-origin iframe needs `allow="xr-spatial-tracking"` and a permitting parent
Permissions Policy for immersive tracking. Fullscreen does not grant XR permission.
The actual itch embed policy must be checked on the uploaded project; this local test deliberately denies XR.
`src/frame/xrAccess.ts` checks both a missing `navigator.xr` and a denied document policy.
In `src/engine/app.ts`, the festival application omits PlayCanvas's XR manager before initialization
when access is blocked. This avoids its automatic denied-session probes and keeps the 3D browser renderer running.
`src/room/restoreEntrance.ts` only shows Enter VR when both policy and device support allow it;
a failed session request hides the button and leaves the browser room available.
No navigation to a new window happens automatically.
See the [WebXR permission-policy specification](https://www.w3.org/TR/webxr/#permissions-policy).

**Phone / iOS gyro.** `src/engine/app.ts`, `requestMotion()`, calls
`DeviceOrientationEvent.requestPermission()` in the deliberate device-look press.
Rejection calls `stopMotion('denied')`; absent sensor events call `stopMotion('unavailable')` after 1.5 s.
Neither removes the drag handlers. The camera rig retains drag-to-look while the child camera handles gyro.
Iframe permission can fail even where the same page works in a separate tab. HTTPS and a user gesture remain necessary.
The opening Setup wires its device-look button to that same request path.
See the [orientation permission specification](https://www.w3.org/TR/orientation-event/#dom-deviceorientationevent-requestpermission).

**Audio.** `src/room/restoreEntrance.ts`, `press()`, starts the bundled Home loop on the first press.
The initial wake screen is silent. In the festival edition, pointer release / keyboard press starts that audio
before asking for fullscreen: fullscreen consumes transient activation, so the former ordering could prevent playback.
The Chrome test uses `--autoplay-policy=user-gesture-required`, confirms zero play calls before input,
and confirms successful playback after input. It needs no autoplay exemption on the iframe.

## Exact text for a festival juror

> Please open the link in a desktop browser. Chrome is recommended. Enter the supplied password on itch.io, then press Run game and use the fullscreen button. Use headphones. Click once inside the stars to begin. Allow about one hour; reading and exploration change the length. You can pause or leave from Esc or the corner menu.
>
> For VR, open the page in Meta Quest Browser. If Enter VR is missing or does not work inside itch, use Open in new window, or open the game's direct-frame link in a separate tab, then choose Enter VR. The browser room also works without VR. Ask the sender for the direct-frame link if itch does not show a new-window control.
>
> On a phone, turn to landscape. If motion access is refused, drag a finger to look and tap to choose.

“About one hour” is a scheduling estimate, not a measured full-play duration. Confirm it during the uploaded-page run.
Send the restricted project page as the main link. If a juror needs a direct-frame link, supply it privately after
checking it on Quest; it leaves the password-protected itch page and should not be used as the access-control gate.

## Local verification

```sh
npx tsc --noEmit -p .
npm test
npm run build
npm run build:itch
node tools/itch-smoke.mjs
python3 tools/package-itch.py 2026-11-02
```

`npm run dev -- --host 127.0.0.1 --port 5189` also returned HTTP 200 locally.
`tools/itch-iframe-test.html` embeds the nested build with
`sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"` and a fullscreen button permission.
The smoke server sends `Permissions-Policy: xr-spatial-tracking=()` and validates path case on every request.
Chrome is `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, headless, at 1280 × 720.
It tests the plain festival URL, a URL carrying review switches, keyboard entry, and ordinary-build behavior.
It checks wake → Setup, no debug probes, no visible blocked VR button, first-press audio,
zero console errors, zero failed HTTP responses, and zero requests to another host through this opening.
It does not claim a complete narrative playthrough or a real cross-origin itch/iOS/Quest test.

Screenshots and machine-readable evidence are in `out/itch/` (ignored by Git).
Package measurements are recorded in `out/itch/package.json`; screenshots end in `-opening.png` and `-setup.png`.
The initial package measured about 48.73 MB compressed, 53.81 MB extracted, 265 files;
the largest file was 13.36 MB. Repackaging reports the exact current byte counts.
A static audit resolved 943 relative source imports with exact case and found no root-relative asset URLs.
Normal builds still build into `dist/`. No README changes are part of this work.

## Uploaded-page checklist before sending

- Open the project signed out. Wrong/no password must deny entry; the correct password must work.
- Run the game without query parameters. Confirm stars, Setup and the content notice, not debug controls.
- Use fullscreen. Confirm readable controls at 1280 × 720 and after resize.
- Confirm sound starts after the first press. Check headphones, mute and sound captions.
- Complete one full visit. Check the advert video, fonts, models, later audio and the ending; time the visit.
- Check the game frame's console and network requests for missing files or unexpected hosts. Itch itself has its own requests.
- On Quest Browser, test Enter VR in the embed and the new-window/direct-frame route. Confirm browser-room fallback.
- On an iPhone, try gyro; refuse motion permission and confirm drag/tap still work. Check landscape and pinch zoom.
- Check pause, resume, restart and Leave. No input should survive a fresh visit.
- Send the restricted page link and password privately. Keep the password out of Git and build files.

In-headset note: the new policy check and session-failure path have only been tested in desktop Chrome.
A real Quest pass on the uploaded page is still required before promising immersive entry to jurors.
