STATUS: live

# The four games on the era websites: how they run in a static page, and what it costs (S400, 17 Nov 2026)

*UiB job 29 Part C. His words (16 Nov, `FABLE_DECISIONS_2026-11-16.md` B6): "They are Optional, you are not supposed to
play the game in 2026, it is just a suggestion of Lamby … also we should add all the games in the Close HTML's".
Written before the build, then corrected with the measured numbers.*

## How a game runs inside a static page

The four games are already self-contained. Each is one class that knows nothing about the room:

- **FIT IN** (`src/games/fitIn.ts`), **CLEAR** (`src/games/clear.ts`) and **MATCH MADE SIMPLE** (`src/games/matchMade.ts`)
  are `DeviceGame`s. They draw only with `fillStyle` + `fillRect` and take `tick`, `tap` and `key`. In the room,
  `heldDevice.ts` ticks them, draws them when their frame key changes and hands them the presses.
- **FloppySheep** (`src/desktop/apps/floppysheep.ts`) is the `FloppySheep` class on Vera's phone. It draws with the whole
  Canvas 2D and takes `update`, `tap` and `draw(ctx, W, H)`.

So a page can run **the same code**, unchanged. There is no second version to keep in step.

1. **The build.** `tools/build-site-games.mjs` uses esbuild (already in the project through Vite; `tools/game_preview.mjs`
   uses it the same way). It bundles each game, with its data and theme, into one plain script beside its page:
   `public/sites/<year>/game.js`. The script is an IIFE: no modules and nothing imported while it runs.
2. **What the page cannot give the game is swapped at build time.** In the piece, four modules connect a game to the
   piece: the frame's one mute (`gameMenuBus`), the mixer (`mix`), the session's motion setting (`motion`, which reads the
   ledger) and the sound registry (`tapeAudio`). On a page they are replaced by small stand-ins in
   `src/sitegames/shims/`. The page has one mute. Nothing sounds before the first press on the game; after that, a Sound
   button decides. Motion follows the visitor's own system setting. FloppySheep's song is the site's own file.
3. **The host.** `src/sitegames/shell.ts` does what `heldDevice.ts` does in the room:
   - it ticks the game and draws it when its frame key changes;
   - it resolves a tap on release, behind the piece's 10 px / 1.2 s threshold, so a thumb scrolling the page is not a tap;
   - the device's buttons are real `<button>`s;
   - the keyboard reaches the game only while the device has focus (the piece's map: arrows or WASD, Space or Z = A,
     X = B, Enter = START);
   - the clock runs only while the glass can be seen.
   FloppySheep has a small host of its own (`src/sitegames/floppysheep.ts`). Its Back arrow goes to a one-icon home
   screen, and a tap on the icon opens the game again.
4. **The page.** `tools/gen_era_sites.mjs` writes each game into its year's **Media** tab, in the year's own device:
   - 1997: the four-green handheld, with d-pad, A, B, SELECT and START;
   - 2003: the open flip phone (glass, earpiece, carrier mark, keypad half);
   - 2016: Vera's phone;
   - 2026: the console with its two grips.
   The devices are CSS only, with no picture files. Every colour is a theme token read from `src/desktop/theme/` (the
   generator's own rule). The Story tab's "What you meet" row for the game gets a link to it. `npm run gen-sites` writes
   the pages and the four scripts together.
5. **Nothing changes in the room.** No room, engine or desktop file is touched. The games stay optional there, as they
   are.

## What it costs

| | FIT IN (1997) | CLEAR (2003) | FloppySheep (2016) | MATCH MADE SIMPLE (2026) |
|---|---|---|---|---|
| script (minified) | 30.0 KB | 43.8 KB | 104.0 KB | 77.2 KB |
| gzipped | 11.2 KB | 17.4 KB | 39.1 KB | 31.8 KB |
| draws | on frame-key change | on frame-key change | 30 / s while running | on frame-key change |
| loads besides the script | nothing | nothing | the song (after a press), Roboto (2 × 22 KB, the project's own copy) | nothing |
| work to host | small | small | most (full canvas, its type, its song, a home screen) | small (a wide page breakout) |

None of the four was much harder than the others, so all four are built.

- **Bytes.** 255 KB for all four scripts (100 KB gzipped). Each page loads only its own. For scale: one tape poster or
  plate on the same pages is 100–300 KB.
- **CPU.** The clock stops when the game is out of view: another tab, a closed panel, or scrolled past. A page left open
  costs nothing. While playing, three of the games draw only when something visible moved.
- **Data notes stay home.** The data files' working notes (keys starting `_`) are removed at build. Internal notes and
  names do not go out in a public script.
- **The law on the pages changes, and the check moves with it.** Since S283 the era pages said and checked "no scripts".
  They now carry exactly one script each: the year's game, local, loaded with `defer`. The checks:
  - `check-era-sites.mjs` allows that one script and no other;
  - it reads `game.js` for any network or storage API (the same list as `check-invariants.mjs`) and for any outside
    address;
  - it requires a Content-Security-Policy on the page with `connect-src 'none'` and `script-src 'self'`, so the browser
    itself refuses any request the script might try.
  The hub page stays script-free. The two sentences that promised "no scripts" now say what is true: one script, the
  game, which sends and records nothing. The hub's sentence is also read by the in-piece site viewer.
- **Staleness.** Every change to a game's code, its data or its theme makes the site's copy stale. `npm test` then fails
  until `npm run gen-sites` is run. The pages already behave this way against their data. A merge of parallel work that
  touches a game, `data/dialog/s1_fitin|s2_clear|s3_floppysheep*|s4_matchmade|s4_v3.json`, or the themes
  (`calendar.ts`, `era3.ts`, `era4.ts`, `chrome.ts`, `fonts.ts`) needs one `npm run gen-sites` afterwards.
- **Licences.** `game.js` is the project's own code, generated: `check-licences.mjs` claims it by name, as it claims the
  generated pages.
- **2016's page type.** The 2016 page declares the project's own Roboto (`@font-face`, local files) so the game draws in
  its platform face. The page's body stack already named Roboto second. On a machine without Segoe UI (a Mac, a phone)
  the page's own text is now Roboto too, where it was Helvetica or the system face. That matches the viewer in the
  piece.

## What it does not do (open)

- **The in-piece site viewer** (the Close's canvas copy of the sites, also in the headset) does not run the games. It
  shows the same Media tab without them. In the browser its "Open as a web page" button reaches the page with the game.
  Running a game inside that viewer would mean routing presses through `xrMount.ts`. That is a separate job, if he wants
  it.
- **No storage, so no best score.** That is right for these games (FloppySheep's law: "no best is kept"), and the heap in
  FIT IN lives only as long as the page.
- **MATCH MADE SIMPLE on the page has no chat.** In the piece the AI's chat sets the handle at its beats. On the page the
  handle starts at 94%, the game's own value when nothing has set it. The tug of war plays as in the piece.
- Checked in headless Chrome on a computer-sized page (1280 × 900) and a phone-sized one (390 × 844, touch), each game
  pressed and played (`research/article-images-2026-11-17/job29-partC-S400/probe.mjs`). All four play. There were no
  Content-Security-Policy violations and no console errors (only the test server's missing favicon). Each page asked
  for itself and its `game.js`, nothing more; 2016 also asked for the two Roboto files and, after a press, its song.
  **Not checked on a real phone, in Safari or in Firefox.**

## As built (S400)

- `src/sitegames/`: `shell.ts` (the host), `sound.ts` (the page's one mute), `shims/` (the four stand-ins), and
  one entry per game (`fitin.ts`, `clear.ts`, `floppysheep.ts`, `matchmade.ts`). No code file of the room, the engine or
  the desktop was changed. The games are imported as they are.
- `tools/build-site-games.mjs` builds them (`--check`, `--sizes`). `tools/gen_era_sites.mjs` calls it, writes each
  device and the game's words (`data/strings/era_sites.json` `eras.<year>.game`, `common.game*`), and adds the CSP
  and the script tag. `tools/check-era-sites.mjs` and `tools/check-licences.mjs` know the one script.
- The glass sizes: FIT IN at 2× (320 px, square pixels); CLEAR at about 1.5× (364 px); FloppySheep at the phone's
  270 px × the screen's pixel ratio; MATCH MADE SIMPLE across the page's width, up to 740 px, smooth when shrunk. On a
  narrow screen the console's grips go under the glass.
- The flip phone's keypad: 4 and 6 aim, 5 fires, 2 and 8 swap. The other keys are printed, not wired. The two soft
  keys pause and swap.
