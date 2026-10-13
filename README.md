# YOUR UPDATE HAS FAILED

*PC Simulator · SurvivingSOGICE · University of Bergen, Center for Digital
Narrative.* A browser + WebXR (Quest 3) narrative experience about how
conversion-practice (SOGICE) networks target queer people online — and how
the demand never changes, only the disguise.

**Status: four-era development build.** `?reinterp=1` enables the current
reinterpretation, including the scripted era journeys and the Close. Browser
and WebXR share the 3D room and monitor; headset verification is still pending
for the changes documented below.

## Run

```bash
npm install
npm run dev          # → http://localhost:5173
npm run build        # type-check + static build to dist/
npm test             # no-network / no-storage invariants + room fold + spec laws
```

`npm test` runs four checkers in `tools/`:

| checker | defends |
|---|---|
| `check-invariants.mjs` | no runtime network, no storage of user input |
| `check-licences.mjs` | every shipped asset has a credit and compatible licence |
| `check-rooms.mjs` | the room deltas fold cleanly over the base room |
| `check-spec.mjs` | dossier `status`, felt-scene purity, `tier`/`register` vocabulary, the ≤3-hero Quest budget, a palette ratchet, doc lifecycle tracking (`STATUS:` headers, supersession links, opt-in `KILLS:` assertions — see `docs/reinterp/08_STATUS_REGISTER.md` §5), `?debug=1` panel completeness (every `debugJump` id `os.ts` accepts has a panel button or a documented exclusion — C6), and an authoring-marker leak ratchet (no `PLACEHOLDER`/`Sérgio`/`[VERIFY SOURCE]`/etc. in player-visible `data/**.json` strings, growth-only like the palette ratchet — C7) |

### Scripted travel clearance (`?reinterp=1`)

Era crossings pass below the measured doorway undersides (2.14 m and 2.18 m).
Closed partitions on scripted sends fade as the camera approaches and restore
once it clears them; head direction does not trigger this. The comfort envelope
remains 0.43 m/s and 9.1°/s. Each era rise fits its duration to the actual
starting seat and facing; the room cascade shares that timing. Cross-room reset
uses the send's 39-second duration.
Headset comfort and tracked-head clearance still need an in-headset pass.

For the offline mesh audit and five photographs per leg, start Vite on an
explicit unused port, then run `node tools/travel-walls.mjs --port 3203 --phase after`.
It writes live mesh bounds, GLB accessor bounds, crossings, measured speeds and
screenshots under `out/travel-walls/after/`. Add `--only alternate --phase after-alternate`
to test the real era-shift seam from other seats. The report and baseline photographs
for W1-B11 are in `out/travel-walls/`; captures are review states, while the full
`tools/walk.mjs` run checks narrative reachability.
### Exhibition build (14–22 October 2026)

With `?reinterp=1`, LambyOS Home paints from a small entry bundle before the room engine is imported. After Home’s initial images and two paint opportunities, local engine/model assets prepare behind it; the fiction starts only on Enter. One application shell and one model-load promise carry through to browser/XR entry. Production loads four models at a time; development keeps the serial retry. XR preparation enables its buttons before the original gesture requests a session.

Seven larger stereo audio distribution files are 128 kbps MP3, with duration, sample rate and channels preserved and masters retained in `assets/audio/`. The short-door logo is lossless WebP with its PNG master in `assets/logo/`. Existing Home/Library WebP art and model geometry are unchanged. PNG app icons stay for home-screen compatibility; lossless WebP made the four small JPEG room plates larger, so those stay JPEG.

Cold-cache built preview on port 3205, headless Chrome and Puppeteer’s Fast 4G preset: Home’s median first complete frame improved from 2.30 s to 1.31 s; a real notice press responded by 2.36 s → 1.37 s. Total `dist/` decreased from 43.99 MB to 39.76 MB (decimal MB). These are desktop measurements without CPU throttling, not device or headset timings.

```bash
npm run build
npx vite preview --port 3205 --strictPort
node tools/exhibition-measure.mjs after   # three cold-cache Fast 4G trials; port 3205
node tools/exhibition-check.mjs           # hold model requests, verify Home + handover; port 3205
node tools/walk.mjs --port 3205 --max 2600 --require-close
```

For an offline exhibition, serve the complete `dist/` locally; phone/tablet and Quest need access to that same local server. Use trusted HTTPS for device orientation permission and immersive WebXR. No CDN, analytics, persistent browser storage or service-worker cache is added. Loading a previously unseen file still needs the local server, so disconnecting all networking after opening the page is not an offline installation strategy. Real phone/Quest startup, listening on exhibition speakers, stereo XR, and 72 Hz remain unverified; the XR entry/window handover was checked with the existing mocked manager and real mono WebGL.

### Build-time voice lines (offline, never runtime)
Some apparatus/system lines (never survivor-side lines) are voiced with a local
TTS pass and committed as ordinary `.wav` assets — see `tools/tts/render.py`
for setup and the ethics boundary. One-time local step, not part of `npm run
build`:
```bash
pip install supertonic   # first synthesis call auto-downloads model weights, ~415MB, once, outside the repo
npm run tts -- --id lamby_puremail_apology
```

### Quest 3 loop
```bash
npm run dev -- --host --port 3000
tailscale serve --https=443 localhost:3000   # gives an HTTPS URL
# open that URL in the Quest browser
```

### Flat review tool
`?flat=1` renders the desktop canvas alone for inspecting 2D work. The browser
3D room remains the audience experience when immersive XR is unavailable.

### Reinterpretation worktree
This branch carries the isolated reinterpretation build. `?reinterp=1`
enables reinterpretation-only hooks; without that flag the shipped path is
the regression baseline. For flat preview, use `?flat=1&reinterp=1`.

**The Close’s Library** (`src/room/closeMonitor.ts`, `src/desktop/home/library.ts`): the ending stays on Daniel’s monitor in the 3D room, including WebXR. A scripted approach brings the viewer to its screen. The Lexicon (including Sources), receipt, four era return computers, plaque, Start again bell, Leave door and dismissible Lamby bubbles share the glass’s published hit rectangles. The backdrop covers the whole glass with a side crop; separately fitted object layers keep the door and all computers inside. Only the four years and the Lexicon carry default labels; the other names appear on keyboard focus and remain in the hit metadata and spoken focus status. Tab follows the art’s 1–10 order. Lamby’s bubble fits its words above the mascot, clear of every interactive object. Start again wipes the ledger and reloads with `#home-armed`; Leave opens the existing interim page. Art is loaded with the room from `public/library/` (2048×1152 scale, WebP q90 with alpha), generated by `node tools/library-art.mjs <round1-directory>`; credits are in both asset ledgers. `startLibraryMusic()` plays the supplied `lambyos_home_loop.mp3` through the shared tape-audio registry at volume 0.18, looping while the monitor is read and stopping on era return or Leave for good; menu pause and mute reach it. The DOM Home return mode remains in place but is no longer called by the Close; the idle cycle still returns to arrival Home.
Browser desk framing (`src/engine/app.ts`, W1-B9) centres the monitor and eases to at least 32 degrees in Eras 1-3 or 30 degrees in Era 4, maintaining an era-specific horizontal width at every aspect ratio. Scripted moves, other seats, held devices and witness views use the wider room framing. Wheel/pinch zoom still wins until Recentre. These adjustments apply only behind `?reinterp=1` outside immersive XR; the XR rig and tracked head retain their existing poses. `node tools/screen-and-cues.mjs after` measures the four screen corners with `worldToScreen` and photographs the seats at 1280x720, 1440x900 and 390x844 on port 3204. The phase argument labels artifacts; it does not switch revisions. `node tools/screen-and-cues-check.mjs` checks the diary handoff, programme minimisation/restore and record-to-job return. Artifacts are in `out/screen-and-cues/`.

Return cues (W1-B5) name their destination: the pending Family Form opens DIARY.TXT with an explicit handoff, Un-Walk's Minimise leaves its existing taskbar return hint, the 2016 record returns to the job it came from, and frame subviews return to Menu, Credits or the Library. New wording is in `data/strings/`. Respite closures remain quiet.

**The Close’s Library** (`src/room/closeMonitor.ts`, `src/desktop/home/library.ts`): the ending stays on Daniel’s monitor in the 3D room, including WebXR. A scripted approach brings the viewer to its screen. The Lexicon (including Sources), receipt, four era return computers, plaque, Start again bell, Leave door and dismissible Lamby bubbles share the glass’s published hit rectangles. Tab follows the art’s 1–10 order. Start again wipes the ledger and reloads with `#home-armed`; Leave opens the existing interim page. Art is loaded with the room from `public/library/` (2048×1152 scale, WebP q90 with alpha), generated by `node tools/library-art.mjs <round1-directory>`; credits are in both asset ledgers. `startLibraryMusic()` plays the supplied `lambyos_home_loop.mp3` through the shared tape-audio registry at volume 0.18, looping while the monitor is read and stopping on era return or Leave for good; menu pause and mute reach it. The DOM Home return mode remains in place but is no longer called by the Close; the idle cycle still returns to arrival Home.

XR verification note: the Library uses the existing monitor plane and controller ray resolution. Headless Chrome verifies ray coordinate round-trips; an in-headset check on Quest/Vision Pro and a real phone gyro check are still needed.
**LambyOS Home in XR** (`src/desktop/home/homeXr.ts`): the headset card's **View Home in VR** opens an immersive Home before story entry. Its existing illustrated room is composited into a 3840×2160 canvas on one 2.4 m window, 2.2 m ahead. Controller selects and hand pinches press the same Home controls; the content-note gate and full/Speedrun cut remain in `lambyosHome.ts`. Only the headset card offers Enter while immersive. The window stays up during asset loading and hands over to 1997 when room construction resolves, using the same session. Textures upload only after changes. Existing Home art/credits are reused.

`node tools/home-xr-check.mjs --port 3202` saves texture and mono quad photographs plus checks in `out/home-xr/`. It mocks XR support/manager activity and input events; it does **not** emulate a stereo compositor or verify Quest 3/Vision Pro rendering, physical controller/hand tracking, comfort, or 72 Hz. These need an in-headset pass. The ending's existing return still ends XR before its DOM Home.

**LambyOS Home's return** (`src/desktop/home/lambyosHome.ts`, `mode: 'return'`, words in `data/strings/home.json` → `return.*`): the door's Leave opens the Leave page (`src/frame/leavePage.ts`, one shared instance; its way back, or Esc, lands in Home), the plaque gives the fuller explainer, the first press on the lit Lexicon gets Lamby's "saved for later" bubble, and the Lexicon (`src/room/lexicon.ts`, shared with the Close) has a fourth tab, Sources: the links in `data/dossier/links.json` verified in `docs/reinterp/RESEARCH_LEXICON_2026-10-02.md`, printed as text.

**Exhibition idle cycle** (`src/frame/attract.ts`, words in `data/strings/attract.json`):
15 min untouched shows the screensavers and a call-in card (with an empty slot,
`setAdvert`, for the advert), a touch asks "Start from the beginning?", and 30 min
returns to LambyOS Home as a fresh visit, then repeats. `?kiosk=0` turns it off
(the walk and screenshot tools pass it); `?idlescale=N` sets seconds per minute
for review (`1` makes 15 min 15 s).

### Standalone prototypes
`?lambyrig=1` opens the isolated Lamby rig lab. It is a canvas-only procedural
prototype for the assistant-as-guide work and is not integrated into the OS.

## Structure

```
src/engine/    PlayCanvas boot, cameras, (later) XR session + the flip
src/desktop/   the offscreen-canvas OS: window manager + apps + era themes
src/witness/   non-interactive back-of-house scenes (computed intake record)
src/dossier/   the dossier (in-OS app in browser; clipboard in VR)
src/state/     the ledger (in-memory only — see CLAUDE.md invariants)
data/          scenes, dialog, strings, paths — ALL narrative text lives here
assets/        aseprite sources (committed) → exported atlases; palettes
tools/         invariant checker, atlas export
docs/          design docs (copies; source of truth = the knowledge base)
```

## Rules of the house

Read **CLAUDE.md** first (AI assistants and humans alike): the privacy
invariants, the register laws (`operable | felt | respite`), the Soft Lo-Fi
doctrine, and the era-update transition grammar.

## Privacy by architecture

No backend. No analytics. No cookies. No storage. The typed name lives in
memory only and is wiped on exit — enforced by CI (`npm test`) and, in
deployment, by CSP. This page cannot phone home even if code tried.

### Restore entrance: setup in the stars (2026-10-13)

`?reinterp=1&entrance=restore` opens the night-blue pixel starfield in the 3D scene. Streaming is half the previous speed; the DOT title gathers over 2.4 seconds and holds for 17 seconds in a 24-second cycle. A deliberate tap, key or XR select releases the title and fades in the existing LambyOS Setup desktop on one nearest-filtered floating quad. It is 2 m wide, 2.2 m ahead at eye height in XR; browser framing uses 70% of the view width, or 95% below 600 px. The same desktop canvas renders the balloons, information windows, content note, versions, advert and asterisk card. Only dirty setup frames upload. Setup is never uploaded onto Daniel’s monitor.

Start folds the floating window into a single star, then types “Restoring previous session…”. The stars assemble Daniel’s 1997 room over seven seconds; “Room found. User profile pending.” precedes the conducted seat flight. The existing single 0.65-second Enter glitch hands over to Daniel’s ordinary 1997 opening. `prefers-reduced-motion` stops streaming, fades the window away in place, cross-fades the room, takes the seat without flight and skips the glitch.

The content note remains the only gate, including the existing four-second arm after Close. Versions show no durations. The existing advert plays its animated picture; Skip is immediate and omits the post-play asterisk card. Esc/pause holds setup and the entrance; Leave-for-good cancels the hand-off. The 30-minute idle fresh visit preserves `entrance=restore`, removes review-era jumps and returns to WAKE. LambyOS Home remains the default. `?home=0` still selects the short door even with `entrance=restore`; omit it when reviewing this entrance. `?descent=0` reviews restore by cross-fade at the seat.

Browser mouse/touch rays and the existing XR controller/hand-select rays intersect the same quad. No gaze selection. In debug mode, `#restore-entrance` publishes read-only `data-setup-stage` and projected `data-setup-hits` for real walker presses. No imported asset is added. XR comfort, controller/pinch behavior and 72 Hz require an in-headset check; phone viewports do not establish real orientation permission behavior.

```bash
npm run dev -- --port 3208 --strictPort
node tools/setup-stars-stills.mjs --port 3208
node tools/setup-stars-edge-checks.mjs --port 3208
node tools/walk.mjs --port 3208 --max 1400 --one-era --entrance restore
node tools/walk.mjs --port 3208 --max 1200 --one-era
```

Screenshots and capture assertions are in `out/setup-in-stars/`; one-era reports are in `out/walks/` with separate restore/default filenames.

### Lamblippy setup review (2026-10-13)

`?reinterp=1&setup=1&debug=1&home=0&kiosk=0&descent=0` opens Daniel’s 1997 room at the monitor seat with LambyOS Setup on the existing desktop canvas. The restore entrance calls `startSetup()` from `src/desktop/setup/setup.ts` in the starfield, then awaits `{ cut: 'full' | 'speedrun' }` and runs its Enter glitch. This review route hands off to the existing 1997 opening after Start; it does not implement E1’s starfield or glitch.

All new copy is in `data/strings/setup.json`. Lamblippy is silent; the information windows hide him. The content note opens even on the experienced route, and Start is disabled until it has closed and four seconds have elapsed. The setup files nothing; captions and device-look preferences remain in memory. The optional advert uses the existing player with ledger filing disabled and immediate Skip. After playback finishes, the lead’s asterisk wording appears in a plain card with one Close button; Skip omits it. No new shipped assets.

Run on a dedicated port: `npm run dev -- --port 3207 --strictPort`. Capture every step with `node tools/setup-stills.mjs --port 3207`; PNGs and behavioral assertions go to `out/setup-lamblippy/`. Walk setup plus Era 1 with `node tools/walk.mjs --port 3207 --max 900 --one-era --setup`; reports go to `out/walks/`. The walker chooses full and skips the advert offer; advert Play is forbidden because the 114-second film exceeds its per-step patience. The capture checks Play and immediate Skip separately.

Hardware note: laptop/phone viewport rendering and hit rectangles are checked in headless Chrome. Real phone orientation permissions and an in-headset pass remain to be checked on hardware. The asterisk card uses the lead-supplied wording verbatim, marked in the data as his dossier phrasing drafted by Claude, pending his final word.

### Screensaver gallery (more-screensavers, 2026-10-13)

Behind `?reinterp=1`, quiet era desktops still sleep after 150 seconds and wake
with one swallowed press. While asleep they rotate every 24 seconds through
`data/strings/screensavers.json`: voxel pipes (1997), winged lamb flock (2003),
Lexicon star words (all eras), programme marquee (2016/2026), and pixel maze
(all eras), alongside the existing savers. The maze is a canvas picture; the
visitor remains seated. Reduced motion holds a still frame.

The exhibition cycle interleaves the new drawings with the old ones and shows
the call-in card every third slide. Review the drawings at desktop and phone
viewport sizes with `node tools/screensaver-stills.mjs --port <your-port>`;
results go to `out/more-screensavers/`. Headset and physical-phone checks remain
pending; browser screenshots do not verify either device.
