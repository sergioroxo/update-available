# REINTERP SESSION LOG — append-only; newest at the top of DONE

## NEXT UP
Two live tracks, for Fable/Sérgio to sequence:
- **Opening continuation** — this session shipped **OP-1 (O1–O3)** per the OPENING & FLOW SPEC build order
  (§4). Next in that track: **OP-2 (Opus): O4 Lamby integration** (extract the `?lambyrig=1` procedural rig
  into the OS as the resident assistant with mood/line/anchor + dismissal/logging), then **OP-3 (Sonnet):
  O5–O7 wiring** (beginner panel, dark-surround tonality, first-filing reveal hooks). The opening now lands
  cleanly on the shipped Era-1 desktop, so both build on real ground.
- **R5 — the femininity homework ('16)**, per master plan archive §R5, on the same room-presence/felt-beat/
  close-phase grammar (commit 607a542). Ready per Round 14's R14-1 unpause.
**R7 (the graying task, Era 1)** still needs its own build spec first (master plan §R3-1) — do NOT improvise.

## BLOCKED / WAITING (carried forward, plus the opening additions)
- **Opening copy voice pass (Sérgio)** — OP-1 shipped with PLACEHOLDER throughout `data/strings/opening.json`
  (disclaimer, boot, chips/goals/icons, re-captions). → **FABLE ROUND question:** the O3 chip/goal/icon SETS
  and the pre-filled name ("Daniel" placeholder) are register demonstrations only (spec §5.1) — Fable/Sérgio
  choose the final set (criterion: each chip must be able to RETURN, recontextualised, in the witness record
  or an assistant line) and the pre-fill source. Nothing in the opening is final copy.
- **VR in-scene O1 (future, not blocking):** O1's start screen is a browser DOM overlay (correct for the
  browser-first scope: "build VR-compatible, validate later"). VR players can't see DOM, so a headset build
  will need an in-scene (world-space) equivalent of the disclaimer + start-up options. Flagged for the VR
  validation pass; out of scope this session by the brief.
- Pillow copy voice pass (Sérgio) — build shipped with PLACEHOLDER; final copy lands whenever ready.
- Origin Story Intake copy voice pass (Sérgio) — same, build shipped with PLACEHOLDER throughout.
- G6/G7 ethics read of both the pillow and the Origin Story Intake — Sérgio scheduling. Nothing in
  either build should be treated as cleared pending those reads. G7 (minor + adult-administered
  questioning) applies specifically to the new intake — see the DONE entry below for how it was kept
  load-bearing.
- In-headset playtest date (A11 gate) — gates ALL spatial sessions.
- R7 build spec — still needed (queue item 4); not written yet.
- **Minor open item, not a stop-the-session BLOCKED:** `origin_intake_e1`'s `cuts` is set to `["full"]`
  only. Master plan §R2-7 says "Festival = pillow mandatory + micro-refusals only," which reads as
  excluding other full provotypes from the Festival cut, but this isn't stated unambiguously for R4.
  Left `full`-only rather than guessing `festival` in; Fable/Sérgio can add it to `data/paths.json`
  composition later with no code change needed either way.
- **Schema note (carried from the pillow session, still unresolved):** `data/provotypes/_schema.json`
  still does not document the `close` object or `goto: "close"` (added in the pillow revision,
  commit 607a542) — confirmed again this session that no runtime validator reads this file, so nothing
  is broken, but it should be synced whenever a session has schema-only bandwidth.

## DONE
*(2026-07-04 · Session 5 — OP-1, opening beats O1–O3 behind `?reinterp=1`, in the 3D room
(`docs/REINTERP_OPENING_AND_FLOW_SPEC_2026-07-03.md` §1; §0-REV binding). This is the character-creation
opening that queue item 6 / master plan §R8-2 flagged as needing a Fable spec first — that spec now exists
(the OPENING & FLOW SPEC, synced this session), so it was built per its §4 build order (OP-1 = Sonnet-scoped;
run here) rather than improvised. **Doc sync first** (commit 62cf82c): master plan v1 R12–14, the Opening &
Flow spec, logo spec, fluid-trans-room geometry, archive R12–13, coordination R14–15, Fable round prompt;
the retired consult-mechanics research; `01_SESSION_LOG.md` left untouched per protocol.
**Architecture (all reinterp-gated; no-flag path byte-for-byte unchanged):** the shipped opening
(warning→off→boot→splash→name→desktop) is untouched; behind the flag four new DesktopOS phases
(`r_dark`/`r_boot`/`r_profile`/`r_recap`) REPLACE it. O1 is a NON-diegetic DOM overlay (`src/desktop/opening.ts`,
new) laid OVER the 3D room — deliberately NOT on the monitor, since the spec needs the window-lit room visible
behind the disclaimer with the monitor dark; the container is pointer-events:none so drag/arrow look-around
still reaches the canvas. While O1 is up the monitor sits in `r_dark`; the engine owns the overlay, the lights,
and the camera. O2/O3 render on the monitor canvas (the one UI surface). Flat mode (`?flat=1`, the testing
fallback) has no room/overlay, so it skips O1 and calls `beginReinterpOpening()` straight into the O2/O3 canvas
content — "desktop canvas alone" per §0-REV-1.
**O1 (`src/engine/app.ts`):** logo placeholder slot (asset per REINTERP_LOGO_SPEC later) + disclaimer (existing
4s-arm law, in the overlay) + start-up options: platform select (browser/VR — both shown; swaps the controls
hint) and the auto-cam/conducted toggle (§0-REV-4). Room lit only by window light (roomFill/lamp/screenGlow
dimmed at startup), monitor dark. Leave works from the first frame (overlay Leave → new public
`os.leaveNow()` → wipe + exit note). **O2 (Continue):** room lights on + desk-lamp symbolic over-throw
(intensity 2.6, more than real — R11-3 anchor); framed camera smoothstep-pans establishing→desk (new camera
POSITION move + shortest-path yaw). Under auto-cam ON the pan is conducted (drag/keys can't interrupt it);
under OFF it's the default framing the player can drag away from (§0-REV-3). LambyOS "this computer was made
for you" boot crawls on the monitor. **O3:** name PRE-FILLED (never typed — "they already know your name"),
pixel-icon grid (6 era-token objects drawn in code), three get-to-know-you chips (pick-3, live counter), one
insisted goal (no neutral option) plus an "I'd rather not say" that files as a choice too (Ethics #10 symmetry);
then the profile-complete screen re-captioning every pick in the system's categories (diary→"self-monitoring:
enabled", the goal→"orientation: flagged for correction", etc. — the thesis in ten seconds). Picks → in-memory
`ledger.tags` (`profile:icon:*`/`profile:chip:*`/`profile:goal:*`) in `commitProfile()`, written the moment
the recap opens; routing is IDENTICAL regardless of picks (recap Enter → the shipped desktop). **§0-REV-5
camera controls:** drag + arrow keys + R (reset view) + F (flip), reinterp-gated, camera-only; R/F suppressed
whenever a phase captures typed text (new `os.isCapturingText`) so a later IRC beat never loses a letter — the
opening captures none, so they're free there. All copy in `data/strings/opening.json` (new, PLACEHOLDER).
**One placeholder polish during verification:** the moon icon first rendered as a solid block (an offset-rect
carve in a non-bg colour); redrawn as a clear C-crescent — content-only, no code-path change.
**Verification:** `npm test` + `npm run build` green (pre-existing chunk-size warning only). Full
O1→O3→desktop playthrough driven IN THE 3D BROWSER VIEW on the worktree dev server (:5174) via the
`preview_*` managed browser (navigated to the worktree port, then synthetic pointer/keyboard dispatch — the
per-session recommended path; a small world→screen projection inverted the monitor coords since the camera
sits straight-on at the desk). Screenshots captured: start screen (room behind, monitor dark), options
(Headset + auto-cam On, controls hint swapped to the VR line), boot (lamp over-throw + "made for you"), profile
(3/3 chips + goal + armed "That's me"), re-caption, and the landing desktop. Auto-cam ON confirmed as a
conducted dock at the desk; auto-cam OFF confirmed interruptible (a drag mid-pan left the camera under free
control); drag-look, arrow-pan, and R-reset all confirmed; Leave-from-disclaimer confirmed (wipe + "Nothing was
kept."). Baselines re-checked clean: `?flat=1&reinterp=1` shows the opening on the canvas alone; `?flat=1`
shows the unchanged shipped warning; no-flag `/` shows the shipped 3D warning with NO overlay, NO `data-reinterp`,
NO reinterp marker, default room lighting. Ledger `tags` are not independently observable in-browser without a
debug hook (consistent with prior sessions' witness-only observability); they're written in the same
`commitProfile()` that opens the correctly re-captioned recap, so the recap content is the proxy evidence.
No ethics/creative calls made — opening copy + the chip/goal/icon final set routed → FABLE ROUND (see BLOCKED).)*

*(2026-07-03 · Session 4 — R4, the Origin Story Intake ('97, Era 1). Built
`data/provotypes/origin_intake_e1.json` on the REVISED provotype grammar (room-presence/felt-beat/
close-phase pattern from commit 607a542, not the pre-revision pillow shape) — `provotype.ts` left
completely unchanged; no framework gap found. Built out of queue order at explicit instruction (the
session brief cited master plan archive §R2-4/§R4-2 directly and named this as the session), since
Round 14 (§R14-1) had already unpaused R4/R5/R6 independent of the pillow/R7 track.
**Content:** a present-day-composite 1997 intake questionnaire administered BY Daniel's mother (not
chosen by him — G7's minor/adult-administered framing kept explicit in the invitation/frame copy, per the
session's hard rail), delivered through the established TriedPath Fellowship/Un-Walk canon (`s1_kit.json`,
`s1_end.json`) rather than inventing a new mark. Five questions: two verbatim quotes from van den
Aardweg's 1997 Anamnestic Questionnaire ("describe your emotional relationship with your father…", "how
did your father regard and treat you…"), one paraphrased childhood-play item (flagged as paraphrase, not
verbatim, in the debrief), and the archive §R2-4 merge of the v1 body's separate conformity-drill items
(walk/talk/sit correction, "healthy friendship" logging) folded into the same instrument. Every choice
tags the ledger via `choices[].ledgerTag` (no `goto` needed — a plain linear sequence, unlike the pillow's
Repeat/Finish loop) and deliberately does NOT override the shared response, so every answer produces the
identical "Recorded for the file." line — the silence failure shape made mechanical, not just narrated.
Felt beats on 2 of 5 questions (the two heaviest); the friendship-log felt line ties to the room's existing
unnamed mixtape prop (`data/room/era1.json` id:mixtape, the locked "resisting element," master plan §R4-3)
without naming him. Terminal state auto-reveals "Every answer here is recorded the same way. Recommendation:
further support recommended." regardless of any answer given, then a close beat ("The form goes back into
its envelope... Mom will mail it Monday.") before the debrief. Debrief: 4 sources — van den Aardweg
(documentary/high, merged verbatim+paraphrase disclosure in one entry), Love Won Out conference-guide
framing (documentary/medium), the carried-forward Guay/Flentje et al. 2013 sourcing for the merged
conformity-drill items (documentary/medium), and the plain G6 no-evidence APA line (documentary/high) — all
`[VERIFY SOURCE]` per house convention. All copy `_doc: "PLACEHOLDER — Sérgio voice pass + G6/G7 ethics gate
pending"`.
**Launcher wiring (os.ts, not provotype.ts):** the existing single provotype launcher only ever pointed at
one hardcoded provotype (`pillow.json`). Added a second desktop icon ("Family Form",
`reinterp.json`'s new `launcherIconIntake`) and generalized `openProvotype()` to take the data as a
parameter, so both provotypes coexist on the one Era-1 desktop that exists in code today — this is
temporary/prototyping (only the Era-1 theme exists in code; the pillow is nominally Era-2 content staged
here for the same reason) and not a statement about final in-game placement.
**Bug found and fixed during verification:** with 5 sources (an extra one, from not yet merging the
verbatim-quote and paraphrase-caveat sources) and pillow-length prose in `confidence` instead of pillow's
terse single-word labels, the debrief overflowed the fixed `WIN.h=336` window badly — text ran behind and
below the fixed Leave/Pause/Return row. Fixed by (1) merging the two overlapping sources into one and (2)
trimming every source's `text` to pillow's economy (short single-word `confidence`, ~1-2 line `text`) —
no `provotype.ts` change needed; this was purely a content-density problem, the same category of bug
Session 3 found in the pillow, now content-authored around rather than needing another window-height
change. Re-verified twice after trimming; all 4 sources now render fully above the fixed row.
**Verification:** `npm test` + `npm run build` green (pre-existing chunk-size warning only) at the end.
Full playthrough driven at `?flat=1&reinterp=1` on the worktree's dedicated dev server (port 5174):
invitation (TriedPath Fellowship — Family Companion, Mom's note) → frame (stakes-line naming Rob/Mom/New
Morning) → all 5 questions in order, each answer choice confirmed clickable and tagging correctly → both
felt beats confirmed as their own bare screens → terminal silence line auto-revealed with no options →
close phase → debrief (all 4 sources, statuses, confidence, [VERIFY SOURCE], fitting cleanly) → Return.
Baseline `?flat=1` (no reinterp flag) re-checked: HTTP 200, no `data-reinterp` marker, console clean.
**Tooling note for future sessions:** the `claude-in-chrome` extension tab intermittently lost real
OS-level visibility this session (`document.hidden` flapping true even with `document.hasFocus()` true),
which fully suspends `requestAnimationFrame` in Chromium and silently stalls every timer-gated phase
transition (boot scroll, splash hold, greeting hold) while clicks still register underneath — producing
misleading "stuck" screenshots. Worked around by using the `preview_*` tool's own managed browser instead:
`preview_start` (any launch.json entry — it always serves the MAIN repo's `dev` config regardless of the
name passed, confirmed again this session) then `preview_eval` to `window.location.href` the SAME tab over
to the worktree's own dev server port, after which synthetic `PointerEvent`/`KeyboardEvent` dispatch against
the canvas (replicating `flat.ts`'s own `destRect()`/`toLogical()` math) drove the whole flow reliably with
no visibility stalls. Recommend this as the default verification path for future flat-canvas sessions
rather than `claude-in-chrome`, which cost significant time this session before the workaround was found.
No ethics/creative calls made this session — G6/G7 reads still pending per BLOCKED below.)*

*(2026-07-03 · Session 3-revision — pillow embodiment fixes (§4 of
`docs/REINTERP_PROVOTYPE_EMBODIMENT_ANALYSIS_2026-07-03.md`, Fable's diagnosis of Sérgio's Round 12 report).
Scope-fenced to `src/desktop/apps/provotype.ts`, `data/provotypes/pillow.json`, `data/strings/reinterp.json`
only — the ledger/witness filing logic, the proxy framing, and the density law were NOT touched. Four
changes, all data/presentation, no new sources, no ethics/creative calls:
1. **Room/environment presence for the vignette + a new close phase.** Added `drawRoomBackdrop` (a quiet,
   abstracted low-poly corner — wall/floor/window/bed/lamp, ERA1 tokens only, deliberately not a
   reconstruction of the Brothers Road reference photo, G9) and `drawOverlayPanel` (a translucent card that
   leaves the room visible in the margins) to `provotype.ts`. Only the `vignette`/`close` phases render this
   way; `invitation`/`frame`/`debrief` keep the ordinary `ui.windowFrame` chrome unchanged.
2. **Daniel's felt line gets its own beat.** New `feltRevealed` state + a dedicated felt-only screen (system
   voice fully absent, one breath, 11pt ERA1.grey — bumped from 10pt per the analysis's "bare vs. nearly
   invisible" note) inserted between the response reveal and the state advance, for any state carrying
   `felt`. States without `felt` (Lift/Exhale, the terminal line) are unaffected — verified.
3. **One grounding stakes-line in the frame.** `pillow.json`'s frame text now names who "Dad" is to Daniel
   and why today ("Today continues last week's work on the ache your father caused...") in the system's own
   confident register (not hedged — the system's certainty about a false premise is the point), still ≤2
   sentences.
4. **A new `close` phase separates the narrative landing from the sourced debrief.** Added to the `Phase`
   union and the `Provotype` interface (optional `close?: {lines, continue}`, so R1-era data without it still
   falls straight to debrief); all four Repeat/Finish `goto: "debrief"` choices in `pillow.json` now route to
   `goto: "close"` first ("The room is quiet again." — felt register, still in the room, no chrome), then its
   own primary button proceeds to the unchanged `debrief`. `reinterp.json` gained a `windowTitle.close` entry
   (required once `close` joined the `Phase` union, since `chrome.windowTitle[this.phase]` is indexed by the
   full union — unused at render time since `close` never calls `ui.windowFrame`, but needed to type-check).
**Verification:** `npm test` + `npm run build` green (pre-existing chunk-size warning only) both before and
after a `git stash`/`stash pop` round-trip used to capture genuine before/after screenshots. Full playthrough
driven at `?flat=1&reinterp=1` on the worktree's dedicated dev server (added a `reinterp-dev` config, port
5174, to the ORIGINAL folder's `.claude/launch.json` — the preview tooling reads launch configs from the
session root, not the worktree; this was the missing piece the prior session's note flagged) — synthetic
`pointerdown`/`pointerup` dispatch computed against the live `destRect()` math (canvas is letterboxed within
a full-viewport backing store; a naive canvas-rect-fraction click is NOT reliable and produced one confusing
misclick earlier in this session before the destRect-based helper was written). Verified end-to-end: frame
(stakes-line) → vignette cycle 1 (Lift/Exhale/Strike, room visible, response-then-felt as two separate
screens) → Repeat/Finish choice (unaffected) → Finish → **close** ("The room is quiet again.") → Continue →
debrief (unchanged, all 4 sources render) → Return → clean exit, Session icon still present/relaunchable.
No-flag baseline re-checked: no console errors. Before/after screenshots captured via a temporary
`git stash` of the three edited files (reverted, screenshotted the shipped R2 chrome + generic frame text,
then `stash pop` restored this session's changes) — confirms the chrome-vs-room-presence and
frame-stakes-line changes against the actual prior build, not just the diagnosis doc's description.
**Schema note (out of scope, flagging for later sync):** `data/provotypes/_schema.json` was NOT updated
(scope-fenced) — it does not yet document the new `close` object or the `goto: "close"` choice value. No
runtime validator reads this file (confirmed — it's documentation only), so nothing is broken, but a future
session should sync it.)*

*(2026-07-03 · Session 3 — R2 the pillow ("Somatic Reprocessing", Era 2). Built
`data/provotypes/pillow.json` on the R1 framework: diegetic invitation (Restorify — "Release Work —
today's session"), 2-sentence frame, three escalating Lift/Exhale/Strike cycles (system responses
"Surface tension registered…" → "Incomplete emergence…" → "Resistance pattern unchanged…", Daniel's
minimal `felt` lines, restrained low-poly pose on Daniel's side per tap — no rhythm, no impact lines, no
swing satisfaction), a Repeat/Finish decision after every cycle, and an unwinnable terminal state ("Continue
until the deeper layer arrives. Nothing else changes.") that Repeat loops on forever, verified idempotent.
Player is the system's proxy throughout (authorises/advances; Daniel keeps the `felt` channel; Cohen named
nowhere except the debrief). Debrief/provenance card: 4 sources, each `status` + player-visible
`confidence` — Cohen/pillow-racket exercise (documentary, WaPo 2005 + GLAAD), the exact phrase "until
deeper feelings emerge" (speculative, disclosed as unconfirmed and NOT used as documented wording per
master plan §R2-2), Ferguson v. JONAH consumer-fraud finding (documentary), APA/UK Memorandum of
Understanding no-evidence line (documentary). Every string carries
`_doc: "PLACEHOLDER — Sérgio voice pass + G6 ethics gate pending"`.
**Framework addition (§R8-5, routed from Session 2):** `ProvotypeState.choices[]` —
`{label, ledgerTag?, response?, goto?}`. Choices register a ledger tag the moment they're clicked and may
override the state's shared response line; `goto` (a state index, or the literal `"debrief"`) lets a
choice navigate immediately instead of the generic show-response-then-Next flow — this is how Repeat/Finish
works without introducing narrative branching (states with no `buttons`/`choices` at all now auto-reveal
their response on entry, which is how the terminal "nothing else changes" line displays with no tap
needed). Legacy `buttons: string[]` (R1 dummy) still works unchanged. `data/provotypes/_schema.json`
extended to document `choices`/`goto`/`animPose`; `_dummy.json` untouched. `src/desktop/os.ts`'s launcher
now opens `pillow.json` (was `_dummy.json`). `ledger.provotypes[]` gained an optional `reps` field —
counted internally each time Repeat is chosen, never rendered as a score (master plan §R2-2).
**Bug found and fixed during verification:** the debrief window (fixed height, no scroll — click/tap only)
clipped the 4th provenance source behind the fixed Leave/Pause row. Fixed by growing `WIN.h` from 300→336
(kept below the era desktop's taskbar) and tightening `drawDebrief`'s line/gap spacing; re-verified all 4
sources render fully above the fixed row.
Verification: `npm test` + `npm run build` green (pre-existing Vite chunk-size warning only). Full
playthrough driven in the browser at `?flat=1&reinterp=1` on a dedicated dev server for this worktree
(`npm run dev -- --port 5174 --strictPort`, since the shared preview tooling only knows the main
worktree's `dev` config) — invitation (Restorify) → frame → cycle 1 (Lift/Exhale/Strike, response, felt,
pose) → Repeat → cycle 2 (escalated prompt, same three taps) → Repeat → cycle 3 → Repeat into the terminal
loop → confirmed a second Repeat there re-shows the identical screen (nothing changes) → Finish for now →
provenance card (all 4 sources, statuses, confidence, [VERIFY SOURCE]) → Return → clean exit to desktop,
Session icon still present/relaunchable. Leave verified mid-cycle (exits cleanly; the outcome files as
`abandoned` per the existing R1 filing logic — not independently re-inspected via the witness UI this
session, since the flip/witness view is gated behind the Era-1 kit/IRC flow, explicitly out of scope here).
No-flag baseline `?flat=1` re-checked end-to-end through name entry to desktop: no reinterp marker, no
Session icon, console clean. All copy PLACEHOLDER; no ethics/creative calls made — G6 read still pending
per BLOCKED below.)*

*(2026-07-03 · Parallel Codex task — R9-4 Lamby rig prototype. Built a standalone route
`?lambyrig=1` mounted from `src/main.ts` into `src/lambyrig/lambyRig.ts`, with no DesktopOS,
`provotype.ts`, `data/provotypes/`, boot/profile/lighting/beginner-panel/ceiling/witness integration
changes. The rig is fully procedural canvas: era-1 palette tokens only, nearest-neighbor scaled canvas,
integer layout, code-drawn Clippy-style Lamby/paperclip body, idle breathing, timed blink, point gesture,
appear and disappear reveal masks, and three moods (`cheerful`, `clinical`, `sterile`). Text lives in
`data/strings/lamby_rig.json` with `_doc: "PLACEHOLDER — Sérgio voice pass pending..."`. URL params
support deterministic QA frames, e.g. `?lambyrig=1&mood=sterile&action=disappear`; canvas buttons also
cycle moods/actions by click/tap only. Screenshots saved outside the repo: `/tmp/lamby-rig-01-cheerful-idle.png`,
`/tmp/lamby-rig-02-clinical-idle.png`, `/tmp/lamby-rig-03-sterile-idle.png`,
`/tmp/lamby-rig-04-cheerful-blink.png`, `/tmp/lamby-rig-05-cheerful-point.png`,
`/tmp/lamby-rig-06-clinical-appear.png`, `/tmp/lamby-rig-07-sterile-disappear.png`.

Verdict: **procedural is feasible and recommended for the first integrated Lamby-as-Clippy pass.** It
already gives the needed OS-assistant grammar: blink, breath, point, appear/disappear, and mood shift
without sprite asset management, and it can inherit era palettes/line discipline cheaply. Estimated cost
to productionize procedurally: 1 focused build session to extract the rig API (mood/action/line/anchor),
plus 1 polish pass for final silhouette, per-era variant names, and VR monitor readability. Sprite route:
better only if Sérgio wants plush/high-authored acting (turnarounds, smear frames, singing, complex
transformations); estimated cost is an asset pass per mood/action set plus integration and atlas QA, with
more iteration overhead whenever the assistant lineage changes. Recommendation: keep the final OS guide
procedural through the Opening & Flow spec; reserve authored sprites for one-off transformation/close-up
beats if the procedural silhouette starts feeling too mechanical. Verification: `npm test` passed;
`npm run build` passed with the existing Vite chunk-size warning; in-app Browser showed all seven frames
with no console errors; click proof changed the canvas controls to
`?lambyrig=1&mood=clinical&action=point`; baseline `/` and `/?flat=1` had no `data-lambyrig`, no overlay,
and no console errors.)*

*(2026-07-02 · Session 2 — R1 provotype framework. Built the one reusable grammar as a data-driven
runtime `src/desktop/apps/provotype.ts`: diegetic assistant INVITATION → ≤2-sentence FRAME → interactive
VIGNETTE (click states: prompt → choose → system response + optional bare `felt` line) → dossier-grade
DEBRIEF (provenance body + `sources[]`, each with `status: documentary|contested|speculative` + a
PLAYER-VISIBLE `confidence` label + `[VERIFY SOURCE]`). Laws honored: Leave + Pause live from frame one at
a fixed position every phase; click/tap only; NO score/streak/timer/progress-counter (no "n/total"); felt
lines rendered bare; both completion AND abandonment filed to the in-memory ledger (`ledger.provotypes[]`,
new field) with the witness/cold side gaining one line each (copy resolved from the provotype data, not
composed in TS). Rendered with Era-1 theme tokens (only theme in code today; comment notes multi-era
selection later). Schema `data/provotypes/_schema.json` extended to document invitation/frame/states/
debrief/ledgerTags/witness while keeping `cuts` + `failure` + `register`. Dummy round-trip
`data/provotypes/_dummy.json` (PLACEHOLDER, `_`-prefixed = non-content). Reinterp-only launcher wired into
`DesktopOS` (icon + modal routing + onClose), all behind `this.reinterp`. Framework chrome strings in
`data/strings/reinterp.json`; one witness heading in `slice.json` (guarded). Verification: `npm test` +
`npm run build` green (pre-existing Vite chunk-size warning only); FULL round-trip driven in the browser at
`?flat=1&reinterp=1` — invitation (Helpy) → frame → 3 states (choice → response + felt → Next) → debrief
(3 color-coded statuses + confidence + [VERIFY SOURCE]) → Close → flip to witness showing CLASSIFICATION
`provotype:dummy` + ASSIGNED SESSIONS "session: completed · outcome: none"; screenshots captured at each
step. No-flag baseline `?flat=1`: no `data-reinterp` attr, no era-palette marker in any frame, console
clean (baseline desktop screenshot not captured — background-tab RAF throttling stalled the scripted BIOS
boot; launcher-absence + inert launcher-spot click + dormant witness proven instead by 44 headless
assertions run against the exact bundled source: full round-trip, Leave-abandonment filing, pause/resume,
OS launcher gating + click routing + onClose, and baseline non-regression). All copy PLACEHOLDER; no
ethics/creative calls made. → FABLE ROUND note: framework advances on ANY choice button (no per-choice
branching yet) — fine for the pillow, revisit if a later provotype needs divergent choices.)*

*(2026-07-02 · Session 1 — R0 flag + namespaces. Added the `?reinterp=1` mount flag through
`src/main.ts`, `src/flat/flat.ts`, `src/engine/app.ts`, and `src/desktop/os.ts`; added a tiny
era-palette canvas marker plus `data-reinterp="1"` only when the flag is present; created
`data/provotypes/_schema.json` and `data/panels/`. Verification: `npm test` passed; `npm run build`
passed with the existing Vite chunk-size warning; in-app Browser preview passed for `/?flat=1&reinterp=1`
(marker + data hook, Leave click works, no console errors), `/?flat=1` baseline (no marker hook, no
console errors), and `/` baseline (no marker hook, no console errors). No content/copy finalized.)*

*(2026-07-02 · Session 0 — worktree setup + doc sync. Created
`/Users/sergiogalvaoroxo/update-available-reinterp/` on branch `reinterp` from the committed shipped
baseline, copied the required reinterp doc set from the original folder, installed dependencies in the
worktree, and verified the copied doc inventory. Verification: `npm test` passed; `npm run build` passed
after rerunning with filesystem access for Vite's worktree writes; preview returned HTTP 200 for `/` and
`/?flat=1&reinterp=1`. No player-facing code/content changed.)*

*(2026-07-02 · system created — no build sessions run yet. Plan of record:
`docs/REINTERP_MASTER_PLAN_v1_2026-07-02.md` through Feedback Round 4.)*
