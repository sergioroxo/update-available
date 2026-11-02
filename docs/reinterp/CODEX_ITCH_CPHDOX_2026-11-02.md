STATUS: live

# Codex prompt — an itch.io build for the CPH:DOX submission (password-protected)

*Paste everything below the line into a NEW Codex chat.*

---

Repository: /Users/sergiogalvaoroxo/update-available-reinterp (PlayCanvas + Vite + TypeScript, a browser + WebXR art
piece, "YOUR UPDATE HAS FAILED"). First `git fetch && git checkout -b codex/itch-cphdox origin/reinterp`. Read
CLAUDE.md first: its laws bind you (no runtime network calls after load; no storage of user input; never stage
README.md; commit with explicit paths, never `git add -A`; every docs/**.md starts with `STATUS:`; one line in
BUILD_LOG.md, next session number after the last one). Do not push.

**Goal.** A festival copy for CPH:DOX, uploaded to itch.io as an HTML5 project, protected by itch.io's own password
(Project page → Visibility & access → *Restricted* → set a password; that is itch's feature — do NOT build a password
screen into the piece, and never put a password in the repository). The build must open straight into the
reinterpretation, with no debug tools.

**Build.**
1. A build mode for itch: `npm run build:itch` (add the script) that sets a Vite env flag, e.g. `VITE_EDITION=festival`,
   so that WITHOUT any URL query the piece behaves exactly as `?reinterp=1` does today (find where `reinterp` is read
   from `location.search` and make the flag its default), with `debug` forced off, and the opening / entrance as the
   public sees it. Normal builds must not change.
2. Output to `dist-itch/`, with `index.html` at the zip's ROOT and only relative paths (Vite `base: './'` is already
   set — check every asset, font, model, audio and video URL resolves relatively; grep the built files for `"/assets`
   or other absolute paths).
3. Zip it to `release/your-update-has-failed_itch_<date>.zip` (gitignore `release/` and `dist-itch/`). itch.io
   limits: check the zip is under 500 MB and the file count is reasonable (report both numbers); file names are
   case-sensitive on itch — check imports match file names exactly.
4. itch.io runs HTML5 games inside an iframe. Report, with evidence from the code, what that changes:
   - **WebXR (Quest):** the immersive session needs the iframe to allow `xr-spatial-tracking`; itch's embed may not.
     Make the piece detect a blocked `navigator.xr` and still offer the browser 3D room; in the itch page settings,
     recommend "Embed in page" with the **fullscreen button**, and note that for the headset the visitor may need the
     itch page's *Open in new window* / direct-frame link — write exactly what to tell a festival juror.
   - **Phone gyro (iOS):** `DeviceOrientationEvent.requestPermission()` inside an iframe may be refused; keep the
     drag-to-look fallback working and say so in the report.
   - **Audio:** first sound only after a user gesture — check the opening still starts on the first press.
5. Size the embed: report the best itch "Viewport dimensions" (e.g. 1280 × 720) and that "Mobile friendly" can be
   ticked (landscape).
6. Write `docs/reinterp/ITCH_CPHDOX_2026-11-02.md` (STATUS: live): how to build, how to upload (Kind of project:
   HTML; upload the zip; tick "This file will be played in the browser"; viewport; fullscreen button; Visibility:
   Restricted + password), what a juror needs to know (desktop browser recommended; Quest browser for VR via the
   new-window link; headphones; about how long it takes), and a short checklist to test the uploaded page before
   sending the link and password to CPH:DOX.
7. Verify: `npx tsc --noEmit -p .`, `npm test`, `npm run build:itch`; serve `dist-itch/` locally in a sandboxed iframe
   page (write tools/itch-iframe-test.html that embeds it in an `<iframe sandbox="allow-scripts allow-same-origin
   allow-pointer-lock allow-popups">` the way itch does) and confirm with puppeteer-core (Chrome at
   '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless) that it loads, reaches the opening with
   no console errors and makes no network request to any other host. Screenshot it into out/itch/.

Reply with: the branch, the commit, the zip's path, size and file count, and a 10-line plain summary (short sentences;
the lead is dyslexic) including the exact itch.io settings to choose.
