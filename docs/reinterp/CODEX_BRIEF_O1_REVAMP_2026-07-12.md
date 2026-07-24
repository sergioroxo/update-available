# CODEX BRIEF — O1 opening revamp: a NEW interpretation (2026-07-12)
STATUS: history-only

*Prepared by Fable at Sérgio's direction: "the board is not working well, it needs a full
revamp — make a NEW interpretation for the idea, do NOT reuse what already exists."
This is a DESIGN-FIRST session: produce a design + greybox prototype behind a flag, not a
final build. Sérgio judges by feel and picks.*

## Context (read first)
- `docs/reinterp/00_START_HERE.md` (hard rails, session protocol) + root `CLAUDE.md`
  including the REINTERP AMENDMENTS block. BINDING.
- `docs/REINTERP_MASTER_PLAN_v2_2026-07-12.md` — the plan of record; §5 ERA 1 describes
  what O1 must hand into (auto-boot → profile → the guide thread).
- The current O1 (what Sérgio is rejecting): the physical cork board carrying the
  disclaimer + start-up options as pinned paper cards. It works mechanically (Sessions
  23–29 verified it) — the problem is FEEL: it reads cluttered/undone, the text-on-board
  metaphor fights legibility, and it asks one surface to be disclaimer + controls +
  options at once.

## What O1 must DO (invariant jobs — the what, not the how)
1. The disclaimer (content note + "you can leave at any time; nothing you do is kept"),
   readable BEFORE the fiction, with the existing 4s arm law before Continue can fire.
2. Start-up options: where are you (this screen / headset) + conducted view on/off.
3. Leave, working, from frame one. Esc/pause law respected.
4. The room visible around it, window-lit only (the monitor dark until the boot) — the
   player should FEEL the room exists before the fiction claims them.
5. Hands into: auto-boot → O3 profile on the monitor (unchanged; already verified).
6. Non-diegetic frame voice — plain, undecorated (the frame never plays).

## The ask: propose 2–3 GENUINELY NEW interpretations, build the best as a greybox
Do not iterate the cork board. Think from zero: what is the most legible, atmospheric,
period-true way to hold a pre-fiction disclaimer inside a 1997 bedroom at night? Candidate
directions to beat (yours may be better): a CRT boot-screen overlay BEFORE the room lights
(the disclaimer as the machine's own pre-boot text — but non-diegetic in voice); a clean
DOM card floating over the darkened room (cinematic title-card grammar); the paper letter
(a physical single sheet on the desk you read up close). Whatever you choose: ONE surface,
ONE reading column, generous type, no decorative sticky notes.

Build the winner as a parallel implementation behind `?o1=v2` (the existing O1 stays
default and untouched — Sérgio A/Bs them), reinterp-only, baseline byte-identical.
`npm test` + `npm run build` green. All display text in data with PLACEHOLDER `_doc`s.

## Verification + close-out (session protocol, no exceptions)
Verify what you CAN in your environment and state plainly what you could not (your
browser access has failed before — "implemented, unverified" is the honest status; never
infer success). Append the session entry to `docs/reinterp/01_SESSION_LOG.md`, one
BUILD_LOG.md line, commit on `reinterp`. Log design rationale + the discarded options in
the session entry so the choice is reviewable. Add a D-item to
`docs/reinterp/06_SERGIO_CHECKLIST.md` (next free number): "O1 v2 ready for your A/B —
`?reinterp=1` vs `?reinterp=1&o1=v2`."
