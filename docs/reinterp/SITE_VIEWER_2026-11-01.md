STATUS: live

# The site viewer: the four era websites inside the piece (S291, 1 Nov 2026)

His ask: *"Would it be possible to open the website page inside of the VR headset and the experience on the browser, like the
same with the phone you press sources and a window comes closer to you like the design of the [period OS window] with minimize
and close button that you can scroll and interact as if it was an actual website."*

So Sources no longer sends anyone away. It opens a window **in** the piece: over the 3D view in the browser, as a plane that comes
to the visitor in the headset. The same window, the same drawing, in both.

## How to open it

- **Menu → "Sources — the four websites"** (a new row on the main menu, and the old link in Credits is now the same button).
  It opens the hub: four doors, one per year.
- **The Close: press a panel's Sources button.** It opens that year's site. This now works in the headset too (S283 opened a new
  tab, which a headset cannot do, so it fell back to the in-room dossier).
- **Headset menu plane:** a new "Sources — the four websites" row.
- A press elsewhere on a Close panel still turns it to the in-room dossier, as before.

## What it shows

The same seven tabs as the HTML sites, with the same content: the story, the practices, sources, images, media, the words,
"Missed it?". Each year in its own style, with the period OS's window around it:

| Year | Site | Window |
|---|---|---|
| 1997 | GeoCities home page: dotted tiles, under-construction stripe, framed contents column | Windows 95: beige, navy title bar, bevelled buttons |
| 2003 | portal: navy banner, rounded tabs | XP-style blue frame, red close |
| 2016 | flat platform: dark header bar, tab bar, white card | Aero glass title bar |
| 2026 | app: dark, pill tabs, cards | flat dark window, round buttons |
| hub | four coloured doors | Windows 95 |

Every colour is a token from `src/desktop/theme/*` (the same tokens the generator reads for the HTML pages). Type is sized
for a headset: body 22 px on a 1024 px-wide window that hangs 0.9 m wide.

## Controls

| | Browser | Headset |
|---|---|---|
| Press a button, tab, link | click / tap (resolved on release, 10 px threshold) | controller ray + trigger, or a fingertip, or a pinch |
| Scroll | wheel, trackpad, touch drag, arrow keys / PageUp / PageDown / Home / End, **▲ ▼ buttons**, press the track above or below the handle | **thumbstick**, **▲ ▼ buttons**, press the track |
| Minimise | the **_** button: folds to a small "Sources" tab at the bottom left; press it to restore | the **_** button: folds to a small tab on the wrist (the menu tab's grammar: turn the wrist towards you); also menu → Sources |
| Close | the **✕** button, or Esc (Esc closes the window first, the menu second) | the **✕** button, or the grip |
| "Open as a web page" | a button in the bar: opens `sites/<year>/index.html` in a new tab | not shown (a page cannot open over an immersive session) |

Links to outside sources are **shown with their address**. In the browser a press opens the source in a new tab (a navigation the
visitor chose). In the headset a press shows the address in a note ("Open this address on a phone or a computer: …"). Nothing
leaves the piece. Audio tracks on the Media tab have a Play / Stop button (project-owned files, through the mixer, so the menu's
volume and mute apply). ⚑ S371: films play IN the window too, in the browser and in the headset (below).

In the headset the window opens 1.5 m away and eases to 0.8 m in under half a second (no ease under reduced motion). The
helper's yellow plate stays down while it is up. A press that misses the window is swallowed: the room behind takes none.

## What was built

- `src/frame/siteViewer/` — `model.ts` (types for the generated model), `skins.ts` (the five skins, from theme tokens),
  `layout.ts` (blocks → draw ops, once per tab and width), `frame.ts` (window chrome, site headers, scroll bar), `core.ts`
  (state, renderer, hit-testing, press resolver), `domMount.ts` (browser overlay), `xrMount.ts` (headset plane + wrist tab),
  `audio.ts`, `bus.ts` (the one door: `siteViewerBus.open('hub' | '1997' | …)`), `index.ts`.
- `data/strings/era_sites_model.json` — **generated** by `tools/gen_era_sites.mjs` from the same data as the HTML pages (so the page and
  the window cannot disagree). `node tools/gen_era_sites.mjs --check` (in `npm test`) fails if it is stale.
- Wiring: `src/desktop/gameMenu.ts` (menu row, Credits button, Esc), `src/engine/app.ts` (the Close's Sources button; the headset
  mount, press routing, grip, fingertip, tick), `src/frame/xrFrame.ts` (menu row, `suspend()`, shared plane helpers),
  `src/frame/xrInput.ts` (`onStick`, the cursor dot on the window), `data/strings/gameMenu.json`.
- Review tools: `tools/site-viewer-review.mjs` (`--harness` photographs the window alone; `--app` goes through the menu, real
  mouse clicks, and a mocked headset), `tools/harness/site-viewer.html`. Under `?debug=1`: `window.__siteViewer`.

## Truth in Love

The 1997 site's Sources tab (HTML and window) now has a section "Truth in Love: the 1998–99 campaign": the sponsor's index page for its
two TV spots, the scripts of "Mom" and "Families", and the 1998 newspaper ads page: four Internet Archive captures read for
`SOURCES_AD_CAMPAIGNS_2026-10-31.md`, each in `data/dossier/era_links.json` with that doc as its `verifiedIn`, so the generator's
verbatim check applies. No picture, film, script text or phone number is reproduced. (The index and "Mom" pages also stay under 2003 as
period captures, from `REFERENCE_LINKS_CHECKED_2026-10-31.md`.)

## Performance

One canvas, one texture, uploaded only when the viewer changes (scroll, tab, hover, an image arriving, a note). Measured in the
mocked headset (`tools/site-viewer-review.mjs --app`): draw calls 40 → 42 with the window open (one plane; the limit is 75); screen
uploads while idle with the window open: 24 per 2 s, against 25 with it closed (the room's own). The browser overlay is a canvas
that repaints only when dirty.

## Limits, and what is not verified

- **Not seen in a headset.** Only desktop Chrome with a mocked `xr.active`, and ray presses simulated through the plane's own hit-test.
  Checked by hand on the Quest: distance and size (0.8 m, 0.9 m wide), the thumbstick scroll speed (900 px/s), whether a pinch lands
  on the ▲ ▼ buttons, the wrist tab for a minimised window, the approach ease.
- **Not on a phone.** The layout adapts to narrow widths (checked at 390 px in headless Chrome); touch-drag scrolling is by simulation.
- Not an accessibility equal of the HTML pages: the window is a picture. It carries a keyboard-reachable link to the page version and a
  close button for screen readers, and the HTML pages stay the accessible route.
- A pinch-drag to scroll in the headset is not built (▲ ▼, the track and the thumbstick are).
- Hand-tracking users with no thumbstick scroll with the buttons only.
- The window is a fixed 1024 × 768 canvas in the headset (×1.5 resolution); long pages are long scrolls (the Sources tab of 2016 and 2026 is
  ~9 000 px).
- ⚑ S371 (UiB job 17 Part A): ~~The film on the hub plays on the web page version only.~~ Films play inside the window. A hidden
  video element (`audio.ts` `viewerFilm`, under the mixer's FILM channel) is drawn onto the window's canvas: a poster before the
  first press (nothing loads until then), the picture with a progress line under it (time gone, length; a press on the line goes
  there), a press on the picture plays or pauses, and a Play / Pause button under it. One thing plays at a time (a track stops the
  film and the other way round); leaving the page or closing the window stops the film; minimising pauses it. In the browser each new
  picture repaints only the film's rect. In the headset the film's rect is a plane of its own (`xr-frame-site-film`, a child of the
  window, opaque, drawn before the window, which leaves that rect clear): its 768 × 477 texture, with no mip chain, is uploaded on
  each new picture, and the window's 1536 × 1152 texture is uploaded only when the window itself changes (a press, a hover, a
  scroll), never per picture. One more draw call while a
  film is loaded and on screen. Measured in the emulated headset by `tools/viewer-media-probe.mjs`: ≤ 51 draw calls, the window 0
  uploads/s, the film's rect 20–30/s. Never seen on a Quest: the in-headset pass is Sérgio's.
- ⚑ S371: every Play on the hub and the four sites is pressed by `node tools/viewer-media-probe.mjs --port <p>` (browser: the real
  mouse; emulated headset: world rays through `pressRay`), which reports the HTTP status, `playing` and a moving clock for each.
