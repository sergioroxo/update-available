STATUS: live

# Prompts for Codex — heavy builds, to save Claude's weekly quota (2026-10-11)
*His ask (2026-10-11): "since we don't want to run out of our weekly quota, is there stuff that CODEX could be doing
here in the project in terms of coding … very heavy stuff?" Yes. These are self-contained builds with clear checks.
Codex works in ITS OWN git worktree and branch (never in the main checkout, which Claude and the walks use), on its
own port, and never merges: Claude reviews, walks and cherry-picks. Paste the PREAMBLE first, then ONE prompt.
Run at most two at once (each starts its own browser; more than that crashes the walks on this machine).*

---

## PREAMBLE (paste before every prompt)

```
You are working on "YOUR UPDATE HAS FAILED", a PlayCanvas + Vite + TypeScript WebXR/browser art piece (repo:
/Users/sergiogalvaoroxo/update-available-reinterp, branch `reinterp`). Before anything, read CLAUDE.md fully and obey it:
no runtime network calls, NO storage of any kind (no localStorage/sessionStorage/indexedDB/cookies), all display text in
data/strings/*.json, colours only from src/desktop/theme/, invented marks only, credits for every shipped asset (npm
test runs tools/check-licences.mjs), the frame never plays, and the rule "we should not expect people to look around
at any part, we need to take the viewer there".

WORKSPACE RULES (strict):
1. Work in your own worktree: `git -C /Users/sergiogalvaoroxo/update-available-reinterp worktree add
   ../update-available-codex-<TASK> -b codex/<TASK> reinterp`, then `cd` there and
   `ln -s /Users/sergiogalvaoroxo/update-available-reinterp/node_modules node_modules`. Never edit files in the main
   checkout. Never push, never merge into reinterp.
2. Your own Vite port (given in the task). NEVER use port 3000 (the lead's walks run there). tools/walk-eras.mjs has
   no --help and defaults to port 3000 — always pass --port.
3. Never edit src/, data/ or public/ while one of your own walks runs (it reloads the page and kills the walk).
4. Debug URL: http://localhost:<PORT>/?reinterp=1&debug=1&descent=0&home=0&kiosk=0 (&era=1..4 jumps to an era).
5. Checks before you finish: `npx tsc --noEmit` and `npm test` pass; screenshots of your change (headless Chrome via
   puppeteer-core, see tools/stills.mjs) saved under out/<TASK>/ and LOOKED AT; the walk named in the task passes
   (read its report in out/walks/ — "spine: done", console clean).
6. Commit on your branch with explicit paths (never `git add -A`); message starts with "CODEX: <TASK> —" and ends with
   the line: Co-Authored-By: Codex (OpenAI) <noreply@openai.com>
   Append one line to BUILD_LOG.md.
7. Finish with a REPORT in out/<TASK>/REPORT.md: branch, commit, files changed, every new or changed display string as
   a numbered BEFORE/AFTER list, screenshots, walk result, and anything you could not verify. Be honest.
```

---

## C1 · The Library on the Close's computer (port 3201) — the biggest one

```
TASK = library. The piece should END on Daniel's computer at the Close: its screen becomes "LambyOS Home — Library"
(art you already made: /Users/sergiogalvaoroxo/update-available-reinterp/output/lambyos-library/round1/ — room.png,
object layers, layout.json with ids lexicon, era-1997, era-2003, era-2016, era-2026, receipt, plaque, start-again,
door, lamby, speech-bubble, Tab order 1–10). Read docs/reinterp/PROMPT_GPT_LAMBYOS_LIBRARY_2026-10-11.md and
docs/reinterp/LAMBYOS_HOME_DESIGN_2026-10-09.md §7.

Today the Close ends on a Restart card drawn on that monitor (src/room/closeMonitor.ts; app.ts CLOSE_SWEEP / closeCard /
returnToHome; S230 added "Return to LambyOS Home", which leaves the 3D room for the DOM page
src/desktop/home/lambyosHome.ts in mode 'return'). Replace that ending: the Restart card's place is taken by the
Library, drawn on the monitor's canvas texture in the 3D room (so it works in the headset too), and the piece TAKES the
viewer to it (camera brought to the monitor; never wait for them to look).
- Assets: derivatives into public/library/ (WebP q90 with alpha; one size fitting the monitor texture at 2048×1152,
  plus the art's own 3840 for the phone/flat close-up if you need it); credits rows like the existing lh_*.webp ones
  (assets/LICENSES.md, docs/reinterp/ATTRIBUTIONS.md, regenerate data/strings/attributions.json).
- Objects: the Lexicon (opens the existing Lexicon, src/room/lexicon.ts, with its Sources tab); the four era
  computers = "go back to a room" (the Restart card already has go-back-to-a-room actions — reuse them, one era each);
  the receipt (the Close's existing receipt — find it, src/room or src/desktop, and open it); the plaque (the explainer
  already written in data/strings/home.json `return.plaque`); the bell = Start again (the menu's Restart path: wipe
  ledger, #home-armed, reload); the door = the Leave page (src/frame/leavePage.ts, mountLeavePage); Lamby bubbles from
  home.json `return.lamby` (programme voice). Hit rects published the way the Restart card publishes them now, so the
  walker can see them; add `^library-(bell|door|era-.*)$` to tools/walk.mjs FORBIDDEN so it never restarts, leaves, or
  travels back.
- Music: play public/assets/audio/lambyos_home_loop.mp3 looping, softly, while the Library is up (Claude is adding
  that file and its registry entry in src/audio/tapeAudio.ts; if it is not there yet, leave a clearly named hook).
- The DOM Home 'return' mode becomes unused by the Close; leave its code in place (the idle cycle still lands on
  arrival Home) but stop calling it from the Close.
- XR: the Library is on the monitor in the room, so nothing extra is needed; make sure hit-testing works with the XR
  controller ray the same way the Restart card's does today.
Walk: `node tools/walk.mjs --port 3201 --max 900 --from-era 4 --require-close` must report the Close reached; extend
the walker's end condition so it stops when the Library is showing.
```

## C2 · LambyOS Home in the headset (port 3202)

```
TASK = home-xr. LambyOS Home (src/desktop/home/lambyosHome.ts + homeArt.ts, art in public/home/lh_*.webp, layout in
src/desktop/home/homeLayout.json) is a DOM page, so a Quest 3 or Vision Pro headset in immersive mode cannot see it.
Build its XR face: when the visitor enters immersive VR from Home (or arrives already in a headset), show Home as a
large floating window in front of them (a textured quad ~2.4 m wide at ~2.2 m, the 3840×2160 room drawn into a canvas
texture with the object layers composited, upload only when it changes), with the same objects pressable by the XR
controller ray / hand pinch (select), the same content-note gate, the same three choices (in XR the headset choice is
the only Enter shown, with the full / Speedrun choice), Lamby's bubbles drawn into the texture. Reuse the hit rects
from homeLayout.json; one source of truth for logic (lambyosHome.ts) — do not fork the gate/cut/handover logic, add a
renderer. Find how the piece already draws 2D UI into XR (the desktop canvas on the monitor, src/desktop/, the Close
monitor) and follow it. Budget: CLAUDE.md's Quest numbers (≤75 draw calls, 72 Hz). Also: "a floating window that
allows the system to load" — while the 3D room loads behind it, the window stays up and the handover into 1997
happens only when the room is ready.
You cannot test in a real headset: use the WebXR emulation available in headless Chrome if you can (or a mocked
navigator.xr) and photograph the texture; say exactly what was and was not verified. Walk:
`node tools/walk.mjs --port 3202 --max 1200 --one-era` (passes through Home in flat mode; must still enter 1997).
```

## C3 · The travels between eras pass through walls (W1-B11) (port 3203)

```
TASK = travel-walls. Walkthrough row W1-B11 (docs/reinterp/WALKTHROUGH_1_2026-10-08.md): "The travels between eras
pass through walls." The era changes fly the camera along scripted legs (src/engine/app.ts: RELOC_*, the relocation
legs, sends.ts, driveMorphSpace; src/room/cluster.ts / clusterMorph.ts for the walls). Find every leg (E1→E2, E2→E3,
E3→E4, and the scripted sends inside eras) whose path crosses a wall, lintel or ceiling slab, using the room geometry
(measure the meshes, not screenshots: GLB accessors carry min/max). Fix each by re-routing the control points (through
doorways or over walls under the ceiling) or by fading the wall it must cross — keeping the comfort law in the code
comments (≤ 9.1 °/s rotation, the speeds already documented). Produce a table in out/travel-walls/REPORT.md: leg,
crossing found (which wall, where), fix. Photograph each leg at 5 points before and after. Walk: the full walk on
your port: `node tools/walk.mjs --port 3203 --max 2600 --require-close`.
```

## C4 · Make the computer's screen feel bigger (W1-B9) + the go-back cues (W1-B5) (port 3204)

```
TASK = screen-and-cues. Two walkthrough rows (docs/reinterp/WALKTHROUGH_1_2026-10-08.md):
W1-B9 "Make the computer's screen feel bigger": in the browser look-modes the seat's camera frames the monitor; make
the screen fill more of the view at the seat in each era (FOV, seat distance, or a gentle lean-in when the desktop is
in use and a lean-out when the story needs the room — the lead's rule: never require looking, take the viewer there).
Measure from the seat: worldToScreen the monitor's corners at 1280×720, 1440×900 and 390×844 and report the % of the
view the screen covers before/after, per era. Do not change XR (the head is the camera there).
W1-B5 "The 'go back' cues need checking across the piece": list every place a closed window or a back action brings
something back (the diary safety net etc.), and make each cue clear in the frame's plain voice or the era's own
software voice. Produce the list with before/after in the REPORT.
Walk: `node tools/walk.mjs --port 3204 --max 2600 --require-close`.
```

## C5 · The exhibition build: size, load time, offline (port 3205)

```
TASK = exhibition-build. The piece runs at an exhibition (14–22 Oct 2026) on a laptop, a phone/tablet and a Quest 3,
possibly offline. Run `npm run build`; report the dist size by type (audio, images, models, JS), the largest 30 files,
and the time to first interactive frame on a throttled connection (Chrome DevTools "Fast 4G" via puppeteer). Then
make it lighter without losing quality the lead can see: audio to sensible bitrates (keep originals in assets/),
images to WebP where they are not already, models with meshopt/draco only if the loader already supports it, code
split so LambyOS Home shows before the 3D room's assets finish loading (Home must appear fast; the room loads behind
it). Nothing may be fetched from the network at runtime beyond the piece's own files. Report before/after numbers.
Do not change any display text or any art's look. Walk: `node tools/walk.mjs --port 3205 --max 2600 --require-close`
against `npx vite preview --port 3205` of the built output if possible (say which you used).
```

## C1b · The Library: three fixes after review (port 3201) — paste into the SAME Codex chat as C1

```
Claude reviewed CODEX: library (merged into reinterp). Three fixes, same rules as before; rebase your worktree first:
`git fetch` is not needed (same repo) — run `git rebase reinterp` on codex/library, or start a new branch
codex/library-2 from reinterp.
1. FAR FEWER LABELS. Every object carries a dark-blue label (Leave, Start again, What this is, Receipt, Lamby, THE
   LEXICON, the four "year · name"). Bob had none, and the front door (LambyOS Home) shows labels only on its four
   key objects. Keep visible labels ONLY on the four era computers ("1997", "2003", "2016", "2026" — drop the names)
   and the Lexicon. All other labels appear only on keyboard focus (and stay in the hit rects / aria names).
2. FILL THE MONITOR. The Library is letterboxed: black bands above and below waste about a third of the glass, and a
   title strip "LambyOS Home — Library" duplicates the painted sign. Remove the strip and scale the room to cover the
   whole glass (crop the room's left/right edges a little if the monitor's aspect differs; keep the door and the 2026
   computer fully inside).
3. LAMBY'S BUBBLE covers the right-hand bookshelf and the receipt. Place it where it covers no object (above Lamby,
   tail down, or on the wall left of the round window), and shrink it to its line.
Screenshots at 1280×720 and 390×844 to out/library/; walk: node tools/walk.mjs --port 3201 --max 900 --from-era 4
--require-close. Commit "CODEX: library-2 — …", report as before.
```

---

## E1 · The entrance: wake (the starfield) → restore (the stars become the room) → the monitor (port 3206)
*Plan: docs/reinterp/PLAN_ENTRANCE_RESTORE_SESSION_2026-10-13.md (read it all first, especially §1 and §2 — the
aesthetic reasons are the brief). Paste the PREAMBLE first. Revised 2026-10-13: the starfield, not pipes.*

```
TASK = entrance-restore. Read docs/reinterp/PLAN_ENTRANCE_RESTORE_SESSION_2026-10-13.md fully; §2 explains why this
must look like the rest of the piece. Build, behind `?entrance=restore` (LambyOS Home in src/desktop/home/ stays the
default and stays reachable as `?entrance=home`; `?home=0` keeps meaning the short door):
1. WAKE — THE STARFIELD IN 3D. The piece already has a pixel warp starfield that gathers into words: starfield() in
   src/frame/leavePage.ts (its DOT font, timing and colours REFERENCE.saverSky/saverStar/saverDim in
   src/desktop/theme/chrome.ts) and its full-screen use for the idle card in src/frame/attract.ts. Rebuild that look IN
   THE PLAYCANVAS SCENE so it is the same in a headset: square pixel stars (tiny camera-facing quads or 90°-step cubes,
   instanced/merged, ≤ 10 draw calls added) streaming past the viewer in a NIGHT-BLUE space (the Close's backdrop rule:
   never black — use the night-blue the Close's point cloud uses, src/room/pointCloud.ts / data/room/cluster.json), then
   gathering, in front of the viewer at a comfortable distance, into the dot-matrix title YOUR UPDATE / HAS FAILED
   (the same 3×5 DOT glyphs), holding, and drifting apart again, on a loop. Under it, frame-voice lines "Click or
   press any key" and, small, "Session still active." (DOM text in the browser; in XR a small world-space text panel
   or dots — say which). Words in data/strings/entrance.json. Warm stars (the lamp pool's warm tone used by the Close's
   PERSON points) with a few cool ones (the APPARATUS tone): the same two tones as the Close's constellation, so the
   piece's first image answers its last. Any press / key / XR select → RESTORE.
2. RESTORE — THE STARS BECOME THE ROOM. "Restoring previous session…" types in (frame voice, bottom-left, monospace,
   as in the lead's concept image). The stars fly to points sampled on Daniel's 1997 room surfaces (sample vertices of
   the room's meshes); where they land, the room's own low-poly materials fade up from dark, so the room is rebuilt out
   of points over ~6–8 s (reuse the cluster / clusterMorph machinery and the existing entrance flight in
   src/engine/app.ts — search `the entrance`, `descent`, ENTRANCE — rather than inventing new systems). Then "Room found.
   User profile pending." The camera is TAKEN to the seat facing the monitor (never make the viewer look for it). The
   monitor wakes into the setup (job E2). Comfort: the camera rules already in app.ts (≤ 9.1 °/s rotation, the
   documented speeds). Reduced motion: a slow cross-fade instead of the flight.
3. HAND-OFF: create `src/desktop/setup/setup.ts` exporting `startSetup(): Promise<{ cut: 'full' | 'speedrun' }>` as a
   STUB that resolves at once with the URL's cut (job E2 replaces this file — keep the signature). After the room is
   restored: `await startSetup()`, then chooseCut(cut), run the Enter glitch (4), and continue exactly as LambyOS Home's
   Enter does today (main.ts `mountDoor` → onContinue(choice) with the computer; find it) so the 1997 story begins.
4. THE ENTER GLITCH: export `entranceGlitch(): Promise<void>` that, for ≤ 0.8 s, shows the room "as it was": flat cool
   fluorescent light, saturation about halved, a slight green cast (a light/material state of the existing room — no
   new art), then restores it; ≤ 2 flashes; skipped with prefers-reduced-motion.
5. IDLE CYCLE: src/frame/attract.ts's 30-minute fresh visit reloads to LambyOS Home today; under the restore entrance it
   must reload to the WAKE starfield (the content note lives in the setup, so nothing the visitor must read is skipped).
6. The walker: add `--entrance restore` to tools/walk.mjs (default unchanged) so it walks wake → restore → (stub)
   setup → 1997; it must never press anything that reloads.
Checks: screenshots of wake (stars streaming; title gathered), mid-restore, the room restored at the monitor, and the
glitch frame — at 1280×720 and 390×844 — to out/entrance-restore/, LOOKED AT next to the idle card's starfield
(src/frame/attract.ts) so the two read as one language; `node tools/walk.mjs --port 3206 --max 1200 --one-era
--entrance restore` reaches 2003; the default path unchanged: `node tools/walk.mjs --port 3206 --max 1200 --one-era`.
```

## E2 · LambyOS Setup on the monitor, with Lamblippy (port 3207)

```
TASK = setup-lamblippy. Read docs/reinterp/PLAN_ENTRANCE_RESTORE_SESSION_2026-10-13.md fully — §3 holds the exact
steps and words (use them verbatim; put every string in data/strings/setup.json). Build the 1997 PC's first screen,
"LambyOS Setup", drawn on the DESKTOP CANVAS that is textured onto the monitor (src/desktop/ — the one UI surface;
FILTER_NEAREST; era-1 palette and the existing Win95 chrome helpers in src/desktop/theme/ and os.ts/apps/*), so it
works in the browser, on a phone and in a headset with the same hit rects the desktop already publishes:
- The monitor wakes from the starfield entrance (job E1): first a short black-to-teal Win95 boot, then a Windows 95
  desktop (teal, a few icons, a taskbar "Start" button inert) with LAMBLIPPY: Lamby (the piece's lamb
  mascot — find its existing pixel sprite/cartoon in src/desktop, e.g. lamby_pop / the 2003 Lamby drawing) restyled
  as a Clippy-like assistant on a little pad, with a yellow Win95 tooltip-style balloon and buttons in it. Text only —
  no voice, no sound for Lamblippy. One balloon at a time; the balloon's buttons are hit rects.
- The windows it opens (plain Win95 windows, frame voice): "About this project" as a 1997 web browser window (reuse
  the 1997 browser look from src/desktop/apps/browser.ts) showing home.json `return.plaque` paragraphs + "More to be
  added soon."; the sound window (a test chime via tapeAudio's playOnce of an existing UI sound; Sound on / Keep it
  quiet → captions on via ledger.view.captions); "How to look" with three small pixel pictures you draw in code (a hand
  dragging on a laptop, a phone being turned, a head turning in a headset) and the device-permission button where
  needed (reuse the existing "Look with your device" flow); the CONTENT NOTE window (the existing content-note text —
  find it in data/strings/orientingCard.json — the only gate: Start stays disabled until it has been opened and closed,
  then 4 s, exactly as LambyOS Home's gate); the version choice (the full piece / the Speedrun Version → the cut; NO durations — the lead's ruling); the advert offer (play the
  existing "Discover the New You" infomercial — src/desktop/apps/netvision.ts / data/dialog/s2_media.json — in a
  period player window, Skip always available); Start.
- Export from `src/desktop/setup/setup.ts`: `startSetup(): Promise<{ cut: 'full' | 'speedrun' }>` (job E1 calls it;
  if E1's stub is not in your tree, create the file with this signature and add a review route `?setup=1` that opens
  the 1997 room at the seat with the setup on the monitor).
- Nothing is stored; Home files nothing in the ledger; the frame never plays (Lamblippy is the PROGRAMME's voice:
  register operable; it never states the content note, facts or sources — the windows do).
- The walker: publish every balloon button and window close as hit rects so tools/walk.mjs can press through
  setup (it must open and close the content note, choose full, Skip the advert, press Start); add the setup's
  "advert Play" to its FORBIDDEN list only if playing would exceed its patience (say which).
Checks: screenshots of each step on the monitor at 1280×720 and 390×844 (and the canvas itself) to
out/setup-lamblippy/, LOOKED AT; `?setup=1` walk: `node tools/walk.mjs --port 3207 --max 900 --one-era` with whatever
flag reaches the setup (document it); tsc + npm test.
```

## E3 · The setup floats in the stars; then Daniel's session is restored (port 3208)
*His review of E1+E2 (2026-10-13): "I do like E1, but I wished what happened at E2 with the setup could be like a
floating window in the stars (that need to be slower). So it does make sense to have the session opening with Daniel."
E1 and E2 are merged into reinterp (commits "CODEX: entrance-restore …" and "CODEX: setup-lamblippy …"). New chat,
PREAMBLE first, effort high.*

```
TASK = setup-in-stars. E1 (src: the restore entrance — wake starfield → the stars become Daniel's room → the camera
at the monitor) and E2 (src/desktop/setup/: LambyOS Setup with Lamblippy, drawn on the monitor's desktop canvas, via
startSetup()) are both in reinterp. Reorder them into ONE sequence, behind `?entrance=restore` as now:
1. WAKE, SLOWER: the starfield streams at about half its current speed, and gathers and holds the title longer
   (calm, a screensaver at rest). Same look, tones and night-blue.
2. SETUP IN THE STARS: on the first press the title's stars drift apart and slow almost to a stop; a floating
   Windows 95 window fades in, in the starfield in front of the viewer (~2.2 m ahead, eye height, ~2 m wide in XR; in
   the browser it fills ~70% of the view's width, on a phone ~95%): it shows the SAME LambyOS Setup E2 built — the
   teal Win95 desktop with Lamblippy, its balloons, its windows (About, Sound, How to look, the content note gate,
   the version choice, the advert and the asterisk card, Start). Render E2's setup canvas onto a world-space quad
   (upload only when dirty), and hit-test it the same way in all modes: mouse/touch ray in the browser, the controller
   ray / pinch in XR (reuse the floating-window approach of src/desktop/home/homeXr.ts and src/frame/xrInput.ts rather
   than inventing one). The setup must NOT appear on Daniel's monitor any more.
3. START → RESTORE: when Start is pressed, the window folds into a single star that joins the others; "Restoring
   previous session…" types in; THEN E1's restore runs (the stars become Daniel's 1997 room; "Room found. User profile
   pending."; the camera taken to the seat facing the monitor); then the Enter glitch; then the 1997 story begins on
   the monitor exactly as LambyOS Home's Enter did (Daniel's session opens).
4. Keep: the content note as the only gate; no durations on the version choice; the advert and asterisk card as E2
   built them (check the advert actually plays its picture in the player — E2's screenshot showed only stars); the
   idle cycle returning to WAKE after 30 min; reduced motion (slow fades, no flight, no glitch); the Quest budget
   (≤ 75 draw calls; the window is one quad).
5. Walker: `--entrance restore` must walk wake → the floating setup (publish the window's hit rects so the walker can
   press them: open/close the content note, choose the full piece, Skip the advert, Start) → restore → 1997 → 2003.
Checks: screenshots at 1280×720 and 390×844 — wake (slower), the floating setup at 3 steps, the content note, Start,
mid-restore, the room at the monitor with 1997 starting — to out/setup-in-stars/, LOOKED AT; walks:
`node tools/walk.mjs --port 3208 --max 1400 --one-era --entrance restore` reaches 2003, and the default path
`node tools/walk.mjs --port 3208 --max 1200 --one-era` is unchanged.
```

---

## E4 · The entrance, his first walkthrough (2026-10-13) — fix round (port 3209)
*His notes after playing the entrance (2026-10-13), each answered below. New chat, PREAMBLE first, effort high. Words
are Claude's (approved process: Claude writes, he edits); use them verbatim, all in data/strings/setup.json or
entrance.json.*

```
TASK = entrance-polish. The restore entrance (src/room/restoreEntrance.ts, src/desktop/setup/, data/strings/setup.json
and entrance.json) is the default front door. The lead played it and wrote these notes; fix each one. Read
docs/reinterp/PLAN_ENTRANCE_RESTORE_SESSION_2026-10-13.md first (style reasons), then:

A. REGRESSIONS (fix first; compare against `?entrance=home`, which builds the same room the old way):
 1. "The racket is on the wall" — Daniel's tennis racket (models.json `tennisRacket`, placed by the bed with a tilt)
    floats against the wall after the restore. 2. "The game boy is without textures." 3. "There is a flash of
    white — why?" Find it (a clear colour, a texture upload, the glitch, a DOM layer) and remove it.
    Likely cause for 1–2: the restore's fade-up of the room's materials/transforms (stars landing → surfaces fading up)
    does not restore some props' own transforms/materials, or runs before src/room/assets.ts's shared model
    preparation (changed by the exhibition-build commit) has finished. After the restore every prop must be exactly
    as `?entrance=home` leaves it (positions, tilts, textures). Add a check script that compares the two.
 4. "The sound is completely off; it starts after the computer is already on." The first press on the wake screen is
    the user gesture: start audio there. From that press until Start, LambyOS Home's loop plays softly
    (lambyos_home_loop.mp3, already registered — "it is a good vibe"); it fades as the room is restored.

B. THE WAKE SCREEN
 5. "The specks of 'YOUR UPDATE HAS FAILED' need to be slower and more readable": bigger, brighter dots for the
    gathered title, a slower gather, a longer hold; legible at 390×844.
 6. "The fade to the OS doesn't work": the hand-over from the wake title to the setup window must be a visible,
    smooth transition (no pop, no black).

C. THE SETUP WINDOW
 7. "I like the fact that the computer screen becomes a star, so maybe it should come as a star from the beginning,
    but from a different side": the window ARRIVES as one star flying in from the side (not the centre), which
    grows and unfolds into the window; at Start it folds back into a star and leaves the other way.
 8. ⚑ REVISED by him (2026-10-13): NOT the whole frame — "it is a bit too much to jump from a void to that so quickly".
    The window opens LARGER than today but not full-frame (about 80% of the view's width on a laptop, ~92% on a
    phone, a large panel in XR), and it grows there gradually as the star unfolds (an eased 1.5–2 s unfold), with
    the starfield still visible around it.
 9. "Lamby should appear with the Hi": Lamblippy is on screen with the very first balloon, not after it.
 10. Sound step: the headphones line is Lamblippy's, and "Play a test sound" plays the chime IN PLACE — no jump to
    another panel. Balloon: "Things sound better with headphones! Want a test sound?" — [Play a test sound]
    [Sound on] [Keep it quiet]. Remove the separate Sound window.
 11. The About page's second paragraph reads more smoothly. Replace it with: "It is part of SurvivingSOGICE, a research
    project at the University of Bergen's Center for Digital Narrative. Everything in it rests on that research: at
    the end you will find a Library with the Lexicon — the words these networks used and the reasons they gave — and
    the full list of sources is in the menu, under Credits & attributions."
 12. "It is missing the point of explaining the 'user profile' and what this project is about, the stories": add a
    step right after About. Balloon: "You'll be restoring someone's session. Three of them, actually!" — [Whose?]
    [Later]. [Whose?] opens a plain window "Whose session?" (frame voice): "On this one machine: three people's
    sessions, four updates, thirty years of care. Their user profiles are still pending: you fill them in as you go,
    and the programme keeps what you give it." (His ruling: no names, no years, no "invented" — it is 3 people in 4
    eras; "thirty years of care" is the programme's own phrase, said straight.)
 13. "The advert needs to be introduced a bit more" — ⚑ his ruling: the advert IS the introduction to the experience,
    not a TV curiosity. Balloon: "Before we begin, let me show you what we do!" — [Show me] [Skip]. No date, no "it
    ran on TV".
 14. "It is missing the reduce motion button": the CONTENT NOTE window gets a checkbox "Reduce motion" (checked when
    the device asks for reduced motion). Ticking it makes the whole piece behave as prefers-reduced-motion does
    (cuts instead of flights, no glitch, no noise animation) — find every place that reads the media query and route
    it through one function that also honours this switch (memory only; no storage).
 15. "I like the How to Look" — keep it as it is.

D. THE TRAVEL INTO THE ROOM
 16. "The transition to the travelling is almost there; I don't like that it goes to black; it should flow better
    from the stars to pixels and pixels to the image": no black frame anywhere. The stars become pixels (they grow
    into square pixels in the room's colours as they land), and the pixels resolve into the room's image; the camera
    flight overlaps the resolve. One continuous movement.

E. THE FLOATING SPECKS
 17. "I don't know how it happened, but I love these floating specks, and would like them more integrated throughout
    the experience": after the restore, some of the entrance's stars stay in Daniel's room as slow drifting specks
    (warm and a few cool). Make this deliberate: a sparse, slow field of specks (≤ 40, one merged mesh, ≤ 1 draw call)
    in every room in every era, warm and cool in the Close's two tones, denser in the dark corners and thinning in the
    lamp's pool, never in front of the monitor or any device the viewer is reading, frozen with reduced motion. They
    are the same points the piece began as and ends as (the Close's constellation). Keep within the Quest budget.

Checks: tsc, npm test; screenshots of every step at 1280×720 and 390×844 (wake title, arrival of the window as a star,
the full-frame setup with Lamblippy from the first balloon, the sound balloon, Whose session?, the content note with
Reduce motion, the advert intro, the fold, the stars→pixels→room resolve, the room with specks, the racket and Game Boy
up close next to the `?entrance=home` versions) in out/entrance-polish/, LOOKED AT. Walks: `node tools/walk.mjs --port
3209 --max 1400 --one-era` reaches 2003; `node tools/walk.mjs --port 3209 --max 2600 --require-close` reaches the Close
(run under `caffeinate -i`). List every new/changed string numbered BEFORE/AFTER in the report.
```

## E5 · More screensavers (port 3210)
*His note (2026-10-13): "we need more screensavers". New chat, PREAMBLE first, effort medium. Can run with E4.*

```
TASK = more-screensavers. The piece's screensavers live in src/desktop/apps/screensaver.ts (kinds stars, text, lambs,
lock, orb; words in data/strings/screensavers.json), shown in-fiction after ~150 s idle in each era and full-screen in
the exhibition's idle cycle (src/frame/attract.ts, its `cycle` in data/strings/attract.json). Read both, and
src/frame/leavePage.ts's starfield (the pixel stars that gather into words: the piece's screensaver language). Add
FOUR new savers in that language (era palettes from src/desktop/theme/, pixel discipline, FILTER_NEAREST, ≤ 3 flashes
a second, reduced motion → a still frame):
 1. `pipes` — the classic 3D pipes, as square-section voxel pipes in the 1997 palette (ochre, orange, teal on navy),
    drawn on the 2D canvas in a simple isometric projection; 1997's saver alongside its others.
 2. `flock` — "flying toasters" turned into the programme's lambs: small pixel lambs with little wings crossing the
    screen diagonally in a loose flock, one of them always slightly out of line; 2003.
 3. `lexicon` — the starfield gathering, each time, into one word from the Lexicon (data/strings/lexicon.json `terms`,
    the `word` field), holding it, then scattering; any era; also in the idle cycle.
 4. `marquee` — Windows' scrolling marquee: the programme's slogans from the piece's own data (the infomercial's
    lines in data/dialog/s2_media.json, the Word of the Day lines) crossing slowly in each era's typeface; 2016/2026.
 5. `maze` — his ask (2026-10-13): the Windows 95 3D Maze, in our language: a first-person flight through a pixel
    maze whose walls are the piece's rooms' own wallpapers and doors (era palettes), at a slow pace, turning at
    corners; instead of the original's rat and smiley, a small pixel lamb (the programme's mascot) appears at a turn
    now and then; the floor is Daniel's carpet, the ceiling the night-blue. 2D canvas raycaster (like a 1990s maze),
    pixel discipline; any era; also in the idle cycle.
REFERENCES (names and look only — draw everything yourself, copy nothing): the Windows 95/98 set as listed at
https://cs.gettysburg.edu/~duncjo01/archive/screensavers/windows/95&98/ (3D Maze, 3D Pipes, 3D Text, 3D Flying
Objects, Flying Through Space, Flying Windows, Mystify Your Mind, Curves and Colors, Scrolling Marquee) and the
Windows XP set at https://archive.org/details/windows_xp_screen_savers (Bezier, Flowerbox, Marquee, Mystify, Pipes,
Starfield, 3D Text, My Pictures). The lead's local copies are executables (.scr) — do NOT run them. Recordings of
the piece's own savers: /Users/sergiogalvaoroxo/Pc_Simulation/screensavers/*.mp4.
Add them to the in-fiction rotation per era (screensavers.json) and to the idle cycle (attract.json `cycle`, between
the existing ones; the call-in card still every third slide). Screenshots of each at 1280×720 and 390×844 in
out/more-screensavers/, LOOKED AT; tsc, npm test; `node tools/walk.mjs --port 3210 --max 1400 --one-era`.
```

## A1 · The LambyOS advert, as a real video (port 3211) — replaces the "storyboard" curiosity prompt
*His correction (2026-10-13): "I didn't want a storyboard, I wanted to see the video." Not wired into the piece. New
chat, PREAMBLE first, effort high. (A cloud-Claude version of the same brief is Prompt 8 in PROMPTS_CLOUD_2026-10-09.md
— run both and compare.)*

```
TASK = lambyos-advert-video. Make the advert "LambyOS — Welcome Home" as a finished VIDEO FILE: read
docs/reinterp/LAMBYOS_HOME_DESIGN_2026-10-09.md §"The advert" (the shot table, timings, the narrator's lines, the
revised ending: the tape chews → TV noise → the noise's dots gather into OVER 30 YEARS / SOLD AS CARE! → the small print
scrolls "…not therapy, not a cure… your old self may not be recoverable…" → "Sources: open the menu, then Credits &
attributions."), docs/reinterp/LAMBYOS_HOME_THINKING_2026-10-12.md (the programme's kit: the "Let go!" box of False
Images, the House Rules sampler, the approved guest book — put them in the product parade), and CLAUDE.md's ethics
(satire only of the programme's pitch, and it collapses; hands, backs and empty rooms — no queer person "fixed", no
faces; invented marks only; no voice for Lamby).
LOOK: visually OVER-THE-TOP (his standing rule for new versions): a 1997 infomercial gone too far — saturated
gradients, star wipes, spinning product pedestals, chunky 3D type, lens flares, a VHS layer (chroma bleed, tracking
lines, a timecode), all built in the piece's palettes (src/desktop/theme/) and its low-poly Soft Lo-Fi objects where
rooms appear. Make it as a canvas/WebGL animation (you may use the piece's PlayCanvas and its room models from
public/assets/ for the empty rooms and the product parade), then RENDER it to video: drive it frame-by-frame in
headless Chrome (puppeteer-core) at 1920×1080, 30 fps, and encode with ffmpeg (/opt/homebrew/bin/ffmpeg) to H.264 MP4.
SOUND: captions burned in for every line; for the narrator use build-time TTS only if the project already has it
(search tools/ for render.py / Supertonic — register `apparatus`); otherwise leave the voice out and keep the captions.
Music: the lead's own jingles in /Users/sergiogalvaoroxo/Pc_Simulation/Sources/Jingle_Brand New/ (his Suno/Treblo
generations — pick one of the "Morning Joy Loop" files; credit it as his). ~75 s.
DELIVER in output/lambyos-advert/: lambyos_welcome_home.mp4, the animation source (HTML/TS), a contact sheet of 12
frames, NOTES.md (what you made, what is placeholder, credits). Do NOT touch src/, data/ or public/; do not commit the
mp4 to git.
```
