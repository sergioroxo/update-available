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

## Prompt B — 2026: the room half of v3 (after the screens are merged)

Repository: sergioroxo/update-available, branch `reinterp`.
**Work in your own folder:** `git worktree add -b codex/e4-v3-room ../codex-e4-room origin/reinterp` (from the main
folder, after `git fetch origin`). Never `git checkout` in the main folder. Push your branch, not `reinterp`.

Read CLAUDE.md, docs/ETHICS_CONSTRAINTS.md, **docs/reinterp/DESIGN_2026_V3_PRESSURE_2026-11-07.md** (the plan,
with the lead's rulings), **docs/reinterp/E4_V3_SCREENS_BUILT_2026-11-07.md** (what Claude built: the screens, the
shared painters, where each beat is marked) and **src/narrative/e4Beats.ts** (the contract). The screens MARK beats;
the room READS them with `e4Has` / `e4Progress` / `e4BeatsVersion`, and re-applies when `ledgerGeneration` changes.
You mark `room` and `tryon`.

Build the room, one commit each:
1. **The restyle toward "male"**, a full restyle as the lead asked. Each refusal beat (`number`, `meridian`, `left`)
   takes one of her things out of Maya's room and puts the system's crude "default" in its place:
   - the plant goes;
   - the pride flag goes;
   - the friends' photo strip goes, and a framed "You, restored" (the shared goal painter) goes up;
   - the pink throw turns grey;
   - more, as far as the impact needs.

   Apply each change while the player faces the screens ("sequence over presence"). Use `cullAbsentProps`, so a
   removed prop is not drawn. Draw calls must go DOWN, never above 75.
2. **The paper strips and the ticket.**
   - A paper strip appears on her wall for each headline once `link` is marked.
   - The deli-counter ticket appears at `number`. It shows the clinic's current number and grows each time the
     number rises.
   - Painted textures, `FILTER_NEAREST`, upload on dirty only.
3. **The conducted turn** after `left`. The piece turns her once to see the room, then marks `room`. A real turn, not
   a look the player must choose (the 10 Oct rule).
4. **The ceiling map** at `map`: the contagion network projected across her ceiling (`src/room/ceilingWitness.ts` may
   be the place). Junie's dot is red until `junie` turns it warm. The ceiling plays the shared `drawContagionClip`.
5. **"Try it on", the room side only.** Claude builds the mirror reveal on the worn session screen and marks
   `tryon` (see the screens report). You add only what the 2D screen cannot do, if anything. For example, in XR the
   player's own controller hands become the man's hands during the reveal. Do not duplicate the screen's reveal.
   **Also replace the old ballroom poster** ("CATEGORY IS / ALL WELCOME / FRI 23 OCT") with the birthday fundraiser
   stream's poster.
6. **The stream as TransJesus's birthday fundraiser for trans youth** (mutual aid; research thread 5).
   - A fund bar the system cannot read.
   - Every red dot of the ceiling map becomes a viewer: 41 → 42.
   - There is NO donate button for the player.
   - Mark `stream` where it begins if the screens did not.
7. **The room restored after `terminated`:** her things come back where they were.

Laws: no network, no storage, invented marks, no real people/faces/brands, colours only from the theme, the stream
never a trap, satire only in the system's self-presentation and it collapses. Verify: `npx tsc --noEmit -p .`,
`npm test`, stills of each step, draw calls at the seat and in the stream, and
`node tools/walk.mjs --port 3115 --max 2600 --require-close` reaching the Close. Report:
`docs/reinterp/CODEX_E4_V3_ROOM_REPORT_2026-11-07.md`. One BUILD_LOG line. Reply with the branch, the commits, the
walk result, draw calls, and an 8-line plain summary.
