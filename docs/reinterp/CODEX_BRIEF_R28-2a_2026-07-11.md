# BUILD BRIEF — R28-2a: the side-message guide system (+ stretch: the infomercial port)

*Prepared by Fable 2026-07-11 for any capable build model (Opus 4.8 / Codex / Sonnet 5 in a
fresh session). Sérgio may paste this whole file as the session prompt. One session's scope;
the stretch lane only if the primary lands verified with time to spare.*

## Context in three sentences
You are building the REINTERPRETATION version of "YOUR UPDATE HAS FAILED" in the git worktree
`/Users/sergiogalvaoroxo/update-available-reinterp/` (branch `reinterp`; the original folder
`/Users/sergiogalvaoroxo/update-available/` is read-only reference). Round 28 made the piece a
co-guided, multi-room experience: Era 1 is guided by IMPERSONAL SYSTEM SIDE-MESSAGES (no
assistant character until Era 2 — see the "REINTERP AMENDMENTS (R28)" block in CLAUDE.md).
This session builds that side-message system as a data-driven guide thread.

## Read order (before any action)
1. `docs/reinterp/00_START_HERE.md` — hard rails, session protocol. BINDING.
2. `CLAUDE.md` (root) — invariants + the R28 amendments block. BINDING.
3. `docs/REINTERP_R28-2_GUIDED_NARRATIVE_SPEC_2026-07-10.md` — YOUR SPEC IS §2 (the
   side-message system) + the witness-symmetry rule imported via
   `docs/REINTERP_ERA_MINING_R28_2026-07-10.md` FIND #4 and #5.
4. The last 3 entries of `docs/reinterp/01_SESSION_LOG.md` (Sessions 25–27): current state,
   verification methods that actually work in this build, and the existing
   `floppyHint`/`movementHint` plumbing you will GENERALIZE.

## PRIMARY LANE — R28-2a, the side-message system
Era 1's guide: one active message max, terse imperative, never "I", never praise, disappears
on compliance. The thread (spec §2): power on → insert the floppy → open the kit → the tape
prompt (points at the boombox on the bookcase shelf — placed in Session 27) → the channel
(IRC) → the packet → the diary → the update notice. Session 27 already shipped two one-off
hints (`floppyHint` in `data/strings/reinterp.json` + the movement hint): REFACTOR those into
one data-driven system rather than adding eight more one-offs.

Requirements:
- **Data-driven:** a `sideMessages` list (either in `data/strings/reinterp.json` or a new
  `data/dialog/s1_guide.json` — your call, document it): each entry = id, trigger condition
  key, text, dismissal/compliance condition key. ALL text `_doc: "PLACEHOLDER — Sérgio voice
  pass pending"`. Conditions resolve against existing OS/ledger state (os.kit, os.phase,
  windows opened, etc.) — thin condition registry in code, content in data.
- **Register law:** these are DIEGETIC system-status lines (the apparatus's voice —
  `operable`), rendered in the OS status-line style the floppyHint already uses — NOT the
  non-diegetic frame chrome of movementHint. Keep the two visually distinct.
- **One at a time; compliance retires it; the next eligible one surfaces.** No queue UI, no
  checklist, no progress indication.
- **Witness symmetry (BINDING — mining FIND #4):** each side-message files BOTH ways:
  complied → a witness line (e.g. `guidance: followed`), ignored past its beat → filed too
  (`guidance: declined`, or a quiet equivalent). Copy for witness labels lives in data. There
  is no response that isn't data.
- **First-filing check (mining FIND #5):** verify the opening's very FIRST profile
  interaction files to the witness/ledger immediately (not batched at commit). If it doesn't,
  make it so — one line of plumbing, big doctrine value.
- **The last pre-update message** seeds Lamby's debut (spec §2): PLACEHOLDER along the lines
  of "assistance will be improved in the next version." Data, not code.

## STRETCH LANE (only if primary is VERIFIED with time left) — port the E2 infomercial
Port the shipped build's `data/dialog/s2_media.json` (read it from the ORIGINAL folder, copy
into this worktree's data/) + build the minimal canvas player for it behind `?reinterp=1` at
Era 2: the faux-VHS interruption pop-up per
`docs/ERA2_EVANGELIST_COMMERCIAL_SCRIPT_2026-06-30.md` §A (scanlines, RGB-split, lower-thirds,
timestamp — cheap 2D canvas; AUDIO SLOTS EMPTY for now, scenes advance on their `at` timings
with a global mute assumption; karaoke bar renders the lyric text). Skip = allowed and FILED
(`ad skipped → avoidant`); completion files `testimony viewed`. Keep it ONE surface inside the
E2 desktop (no app sprawl). If this lane feels like more than half a session, STOP after the
data port + a stub trigger and log the player as next-up.

## Hard rails (violating any = the session is wrong)
- Everything behind `?reinterp=1`; baselines `/` and `/?flat=1` byte-identical behavior, zero
  console errors, zero new requests.
- `npm test` + `npm run build` green at the end. No network/storage. No keyboard input for
  players. All display text in data JSON with PLACEHOLDER `_doc`s. No score/streak/progress UI.
- Do NOT touch: final copy, G6/G7 provotype content, the trans-masc alcove, x.b3,
  `01_SESSION_LOG.md` history (append only), anything in the Do-NOT-touch lists of prior briefs.

## Verification (do not close on build-green alone)
Real browser verification (Chrome-backed preview tools if available to you): fresh load
`?reinterp=1&debug=1`; drive the opening with REAL pointer events (see Session 24's log entry
for the worldToScreen method — `os.debugJump` does NOT drive the opening wall); watch the
side-messages surface/retire in sequence through at least power→floppy→kit→tape; flip to the
witness side and confirm the guidance lines filed both for a complied AND an ignored message;
baselines clean. If your environment cannot drive a browser (a documented failure mode of
some sessions here): mark every unverified item "implemented, unverified" in the log — do NOT
infer success from a clean build. Fable/Sérgio will close the loop.

## Close-out (session protocol, no exceptions)
Append a Session entry to `docs/reinterp/01_SESSION_LOG.md` (what shipped, HOW verified,
anything discovered); one line in `BUILD_LOG.md`; commit on `reinterp` with a clear message;
creative judgment calls you had to make → list them under "FABLE/SÉRGIO CHECK" in the log
entry, and add any decision needing Sérgio's eye to `docs/reinterp/06_SERGIO_CHECKLIST.md`
section A as a new D-item (follow the existing format).
