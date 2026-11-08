STATUS: live

# Codex, next two prompts (7 Nov 2026)

*Prompt A now. Prompt B only after Claude says the 2026 screens are merged into `reinterp`. Paste each into a NEW
Codex chat.*

---

## Prompt A — 2016: turn the notice into the phone mirror

Repository: sergioroxo/update-available, branch `reinterp`. Your 3 Nov Brief 8 build (Orla's notice, the groups,
Notes, the camera roll) is MERGED into `reinterp` (S320, 9b06022a). Thank you, it walked to the Close.

**Work in your own folder:** `cd /Users/sergiogalvaoroxo/update-available-reinterp && git fetch origin && git worktree add -b codex/e3-phone-mirror ../codex-e3-mirror origin/reinterp`,
then work only in /Users/sergiogalvaoroxo/codex-e3-mirror (symlink node_modules). NEVER run `git checkout` in
/Users/sergiogalvaoroxo/update-available-reinterp. Push your branch at the end, not `reinterp`.

Build **docs/reinterp/CODEX_BRIEF8_PHONE_MIRROR_2026-11-07.md**, Steps 0–6, ON TOP of what you already built:
- **Step 0 first** (Lambient works). The lead's latest test said Lambient was not really functional.
- **Step 1:** the sign-in notice card is REPLACED by the PocketPane mirror window beside GracePlatform. Your shared
  thread API, quiet gates, Notes and camera roll stay and now show inside the mirror. Retire the notice card and its
  optional map row.
- **Step 2:** the evening's banners, with the copy exactly as given. Orla's first line is now the brief's "quiz at the
  wick tonight…", not "are you coming thursday…".
- **Step 3:** remove the car-park note (Notes = the Mam draft + "shop: oat milk · bin bags · card for dee"). Add the
  conducted Notes moment. Your sprite approach for photos is good; add Orla's 22:51 photo the same way.
- **Steps 4, 5, 6** as written.

Verify as the brief says. The walk `node tools/walk.mjs --port 3114 --max 2600 --require-close` must reach the Close.
Report: `docs/reinterp/CODEX_E3_PHONE_MIRROR_REPORT_2026-11-07.md`. One BUILD_LOG line. Reply with the branch, the
commits, the walk result and an 8-line plain summary.

---

## Prompt B — 2026: the room half of v3 (the screens are merged: S322; checked 8 Nov)

Repository: sergioroxo/update-available, branch `reinterp`.
**Work in your own folder:** from /Users/sergiogalvaoroxo/update-available-reinterp run `git fetch origin && git worktree add -b codex/e4-v3-room ../codex-e4-room origin/reinterp`,
then work only in /Users/sergiogalvaoroxo/codex-e4-room (symlink node_modules). Never `git checkout` in the main
folder. Push your branch, not `reinterp`.

Read first:
- CLAUDE.md and docs/ETHICS_CONSTRAINTS.md;
- **docs/reinterp/DESIGN_2026_V3_PRESSURE_2026-11-07.md** (the plan, with the lead's rulings);
- **docs/reinterp/E4_V3_SCREENS_BUILT_2026-11-07.md**, above all its section "For the room builder (Codex)": what is
  already built, the moved desk and seat, the shared painters, where each beat is marked, and the timing;
- **src/narrative/e4Beats.ts** (the contract). The screens and the shell MARK beats. You READ them (`e4Has`,
  `e4Progress`, `e4BeatsVersion`) and re-apply when `ledgerGeneration` changes. You mark only `room`.

Since that doc was written, her friends' chat is called **"the lot"** (Ola, Priya, Rae, Sam), not "the house". The
id stays `house`.

Build the room, one commit each:

1. **The restyle toward "male"**, a full restyle as the lead asked. Find Maya's things in Room 3 (r4 in
   `data/room/reinterp_deltas.json` and the 2026 room code). Each refusal beat (`number`, `meridian`, `left`) takes
   one of her things out and puts the system's crude "default" in its place:
   - the plant goes;
   - the pride flag goes;
   - the friends' photo strip goes, and a framed "You, restored" goes up (shared `drawGoalPicture`);
   - the pink throw turns grey;
   - the desk photo frame shows the goal from `newyou` until `original`;
   - more, as far as the impact needs.

   The system's idea of "male" is crude on purpose: the satire, which collapses at the end. Apply each change while
   the player faces the screens ("sequence over presence"). Use `cullAbsentProps`, so a removed prop is not drawn.
   Draw calls must go DOWN, and never above 75 (the desk is 37 now).
2. **The paper strips and the ticket.**
   - One paper strip appears on her walls per news article as the articles open (from `link`). Headline-sized
     words from the article data in `data/dialog/s4_v3.json`, painted, readable from the seat.
   - The deli-counter ticket appears at `number` and shows the clinic's CURRENT number. It lives in `browser.ts`
     (`clinicNumber`, private); add a read-only getter and change nothing else there. The ticket grows each time
     the number rises.
   - Painted textures, `FILTER_NEAREST`, upload on dirty only.
3. **The conducted turn** after `left`: the piece turns her once to see the room, then marks `room`. A real turn, not
   a look the player must choose. Respect the screens' `ROOM_WAIT` (5–12 s). Add the `room` row to
   `data/strings/map.json` and `src/witness/map.ts` (the screens doc says how).
4. **The ceiling map** at `map`: the contagion network across her ceiling (look at `src/room/ceilingWitness.ts`).
   Junie's dot is red until `junie` turns it warm. While the monitor's clip takeover runs, the ceiling plays the same
   `drawContagionClip`, in sync.
5. **"The lot" keeps writing while muted** (the lead's answer, 8 Nov). If the player pressed the bot's "Mute 2 more",
   her friends go on writing all evening, and she doesn't see it. The messages arrive into the muted chat as a grey
   unread count that climbs on Kettle's list. Nobody pings or glows. Copy (exact, in `s4_v3.json`, Claude's
   writing):
   - Ola: "maya?? we're at rae's"
   - Rae: "we did the candles anyway. 18 of them. the cake leans"
   - Priya: "saving you the corner slice"
   - Sam: "sorry about earlier. i'm here if you want"
   - Ola: "love you. no pressure x"

   After `terminated`, when the room comes back, the muted chat shows its count ("the lot · 5 unread") and opens to
   these lines. Nothing is filed and nothing is lost: they waited. If she did NOT press "Mute 2 more", she sees them
   arrive normally.
6. **"Try it on" is DONE on the glass** (`src/desktop/apps/mirror.ts`, timeline `TRYON`). Add only what a 2D screen
   cannot do: in XR the player's own controller hands may become the man's hands, timed to `TRYON.hands`, with the
   glass's pixel hands hidden while yours show. If that isn't clean, skip it and say so. Do not duplicate the reveal.
7. **The stream as TransJesus's birthday fundraiser for trans youth** (mutual aid; research thread 5).
   - Replace the old ballroom poster ("CATEGORY IS / ALL WELCOME / FRI 23 OCT") with the fundraiser's poster: her
     birthday, the stream, "for trans youth".
   - A fund bar the system can't read.
   - Every red dot of the ceiling map becomes a viewer: 41 → 42.
   - NO donate button for the player.
8. **The room restored after `terminated`:** her things come back where they were, and the goal picture leaves the
   frame and the wall.

Laws: no network, no storage, invented marks, no real people/faces/brands, colours only from the theme, the stream is
never a trap, and satire lives only in the system's self-presentation and collapses.

Verify:
- `npx tsc --noEmit -p .` and `npm test`;
- stills of each step from the seat (`tools/tour-e4.mjs` and `tools/stills.mjs`);
- draw calls at the seat and in the stream;
- **Walk only 2026, to save your quota:** `node tools/walk.mjs --port 3116 --from-era 4 --max 900 --require-close`
  must reach the Close. Run it in the background with its output sent to a file, and read only the final lines and
  the WALK_*.md report it writes. Do not watch it step by step. **Do NOT run the full entrance walk.** Claude runs the
  full walk of the combined build locally after merging.

Report: `docs/reinterp/CODEX_E4_V3_ROOM_REPORT_2026-11-08.md`. One BUILD_LOG line. Reply with the branch, the commits,
the walk result, draw calls, and an 8-line plain summary.

---

## Prompt C — sharper text in the headset (after Prompt B; his 8 Nov: "We need better quality in the text, so we need to find a solution")

Repository: sergioroxo/update-available, branch `reinterp`. From /Users/sergiogalvaoroxo/update-available-reinterp run
`git fetch origin && git worktree add -b codex/xr-text ../codex-xr-text origin/reinterp`, then work only in
/Users/sergiogalvaoroxo/codex-xr-text. Never `git checkout` in the main folder. Push your branch, not `reinterp`.

Read your own report docs/reinterp/CODEX__REPORT_2026-11-02.md (quad layers blocked by PlayCanvas 2.19.6's WebGL
base-layer handling) and docs/reinterp/META_WEBXR_NOTES_2026-11-01.md. **The lead now authorises the controlled
engine patch you proposed:**
- keep the room's own `XRWebGLLayer` and include it beside a monitor quad layer;
- make PlayCanvas's framebuffer and viewport use that retained room layer instead of `renderState.baseLayer`;
- keep MSAA, `?xrscale`, Recentre and session cleanup;
- the monitor bridge: upload its canvas only when it changes, track its pose, and hide its ordinary plane while the
  quad is active.

Keep the patch reproducible (`patch-package` or an equivalent committed patch with a test that fails if the engine
version changes). Put it all behind `?quad=1`, on the 1997 monitor first, and leave the default path untouched.

**Also measure the cheap wins on the default path,** because they help every device, not only the Quest:
- each screen canvas's real pixel size against its size on the glass at the seat (texels per degree);
- the mipmap and filter settings of the screen textures (mipmaps off, `FILTER_NEAREST` or linear: what is sharper
  at 0.55–0.8 m);
- the smallest font size actually used on each era's screens.

Report the numbers in a table, era by era, with a recommendation for the minimum font size per era.

Verify: `npx tsc --noEmit -p .`, `npm test`, a headless emulated-XR check that `?quad=1` enters, shows the monitor,
selects, exits and re-enters cleanly, and `?quad=0`/default unchanged. **Walk only era 1**:
`node tools/walk.mjs --port 3117 --from-era 1 --one-era`, in the background, and read only the report. Only a real
Quest 3 can say whether text is sharper, so write the exact test steps for the lead (what to compare, with and
without `?quad=1`). Report: `docs/reinterp/CODEX_XR_TEXT_REPORT_2026-11-08.md`. One BUILD_LOG line. Reply with the
branch, the commits, and an 8-line plain summary.

---

## Prompt D — ten small fixes from the 8 Nov headset session (Codex quota is low: keep it small)

Repository: sergioroxo/update-available, branch `reinterp`. From /Users/sergiogalvaoroxo/update-available-reinterp run
`git fetch origin && git worktree add -b codex/small-fixes-8nov ../codex-small origin/reinterp`, then work only in
/Users/sergiogalvaoroxo/codex-small. Never `git checkout` in the main folder. Push your branch, not `reinterp`.
Read CLAUDE.md's laws only. The list is docs/reinterp/TODO.md; each id below is one row there, with the headset
reports (docs/reinterp/HEADSET_SESSION_2026-11-08*.md) for detail.

Fix, smallest change each, one commit for the lot:
- **T14** PureMail is read aloud in Lamby's voice: stop that (text only).
- **T19** 2003 diary: after "Removal stalled" the entry continues by itself. Remove the auto-continue.
- **T20** 1997 Family Form: the last button says "Return". It leads on, so it says "Continue".
- **T26** 2003 Caleb messenger: messages type in letter by letter. Show each message whole when it beeps.
- **T27** A controller user sees the "look at your wrist" hint, which is meant for hands. Show it only with hand
  tracking.
- **T30** Clipped text. Make each fit its box (wrap or widen, never shrink below the era's size):
  - "My family is religious" (1997 profile setup);
  - "Go to the next task" outside its button;
  - "Restorify is closing" under a bar;
  - Caleb's "say nothing yet" cut at the bracket;
  - "Not yet available" drawn over Allow / Not now on the Lambient dialog.
- **T31** 2016: two Back buttons (top and bottom) on the same screen; keep the bottom one. The phone window (the
  handset/mirror window) has no minimise button.
- **T32** 2016: The Wick card's rise-once must end resting ON the table by the notepad. Today it stays floating.
- **T33** 1997: the Lamby boot sound starts after LambyOS is already on screen. Start it with the screen.
- **T42** 2003 Restorify "Terms of Continued Care": "Agree" looks greyed on page 1. It's live only on the last page,
  so on page 1 it reads as plainly unavailable, not broken: one consistent disabled style, and "Read on" is the
  primary button.

Verify: `npx tsc --noEmit -p .` and `npm test`. One still per fix (tools/stills.mjs). NO full walk: run
`node tools/walk.mjs --port 3118 --from-era 2 --one-era` in the background and read only its last lines. One
BUILD_LOG line. Reply with the branch, the commit, and one line per id.
