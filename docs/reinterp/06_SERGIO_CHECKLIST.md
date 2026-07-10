# FOR SÉRGIO — decisions made, checks owed, questions open

*Living register, maintained by Fable. Established 2026-07-10 at Sérgio's direction:
Fable now makes creative/dramaturgy decisions autonomously instead of blocking on
approval rounds, and logs every such call HERE so Sérgio can review in batches.
Append-only within each section; Sérgio strikes items through (or comments inline)
as he clears them. This file is the source for the eventual pre-ship checklist.*

**What did NOT change (hard lines, regardless of autonomous mode):**
- Ethics gates (G1–G12) still require Sérgio's explicit greenlight. Nothing
  gated opens itself. (Trans-man alcove, R6, R11 stay BLOCKED.)
- All display copy stays `_doc: PLACEHOLDER` until Sérgio's voice pass. Fable
  drafts `operable`-register text for editing; `felt`-register text gets a brief,
  not a draft.
- CLAUDE.md invariants + ETHICS_CONSTRAINTS.md are binding as ever.
- Sérgio's trial observations override any decision logged here — striking a
  decision reverses it, no argument owed.

---

## A. DECISIONS MADE (review when convenient; strike = approved, comment = revisit)

- **D1 (2026-07-10)** — Operating model itself: autonomous decisions + this
  register, replacing per-item FABLE ROUND blocking for non-ethics calls.
  Delegation: mechanical build lanes go to Sonnet subagents with tight briefs
  (verified by Fable in-browser before closing); dramaturgy, specs, spatial-feel
  calls, and verification stay with Fable.
- **D2 (2026-07-10)** — C1 (Room 1 full modelization) delegated to a Sonnet
  subagent. No creative latitude granted: same Kenney idiom as the side rooms,
  hero-tier discipline (≤3 hero objects), desk anchors (`POWER_BTN`/`KIT_FLOPPY`)
  re-measured against the model desk per the R27 warning. Fable verifies live
  before the lane closes.
  **→ CLOSED same day** (commit `1c74425`, Session 24). Sonnet self-verified
  with real pointer events + numeric per-era probes; Fable re-verified live:
  full 360° sweep at `?reinterp=1` (desk/CRT/tower/kit-floppy/bookcase/door/
  cork board all correct, Soft Lo-Fi reads right), baseline `/` clean (zero
  console errors, zero .glb loads, no reinterp markers). Notable: the agent
  caught + prevented a baseline regression mid-session (`era1.json` is shared;
  the swap now lives entirely in the reinterp-only delta). Draw calls 47/60.
- **D8 (2026-07-10)** — Room 1 used only the already-staged Kenney family; the
  C1 agent DECLINED most of the new `Pc_Simulation/Assests` props (Computer
  90s, Radio, cassettes, Books, Desk Lamp…) on license (CC-BY), tier-discipline,
  or single-art-family grounds — reasoning logged in `assets/LICENSES.md`.
  Fable upholds this for now: one art family keeps the rooms coherent, and the
  D6 attribution surface isn't built yet. **But this partly overrides Sérgio's
  curation intent** (he assembled that library 2 days before) → check item
  added in section B; his call overrules.
- **D3 (2026-07-10)** — C2 (layout-X ending arm) will be built by Fable
  directly, INCLUDING the spatial-feel calls (point-cloud node density,
  brightness, the "glow in the dark star set" entry through the 4th arm) that
  were previously gated → FABLE ROUND. Decision rationale + screenshots will be
  logged here as **D4** when built, for your after-the-fact check.
- **D5 (2026-07-10)** — Update-trigger grounding (Sérgio's Q2 answer applied).
  The reinterp's `data/strings/updates.json` (u2/u3/u4) stays as the dramaturgic
  skeleton, but each trigger gets grounded in a documented failure, importing
  the SHIPPED build's verified material where it exists:
  - **u2 (1997→2003):** trigger stays the diary glitch / "object it cannot
    repair" (matches the shipped E1→E2 error-cascade logic in `s1_end.json`).
    Documentary grounding candidate: the ~2000 public collapses of ex-gay
    figureheads `[VERIFY SOURCE]`.
  - **u3 (2003→2016):** "the accountability network is no longer able to vouch
    for itself" → ground explicitly in the Exodus International 2013 shutdown +
    apology `[VERIFY SOURCE — likely already in KB]`.
  - **u4 (2016→now):** import the shipped build's **already-CONFIRMED Malta
    2016 source** (Act LV of 2016, first European nationwide ban — cleared in
    shipped `s3.json` `_sourceDoc`) + the SisterSignal→Flourish
    rebrand-under-legal-pressure mechanism and its softening changelog
    ("change"→"calling") as the u4 grounding. Candidate addition: app-store
    removals of conversion-therapy apps c. 2019 `[VERIFY SOURCE]`.
  Copy remains PLACEHOLDER; this decision is about WHICH documented failures
  motivate each update, not final wording.
- **D6 (2026-07-10)** — CC-BY attribution policy for the local prop library
  (`Pc_Simulation/Assests`): CC-BY assets ARE usable; attribution lives in
  `docs/reinterp/ATTRIBUTIONS.md` + a non-diegetic credits surface (end/exit
  screen, outside the fiction — the frame never plays, so credits never appear
  in the piece's own voice). CC0 (Quaternius) needs no entry. The C1 agent was
  instructed accordingly.
- **D7 (2026-07-10)** — Copy inventory (Q3 answer applied): generated per era
  as `docs/reinterp/COPY_INVENTORY_E1..E4.md` + `_CROSS.md`, by a Haiku sweep,
  reviewed by Fable before you use them. Each entry has a blank "voice pass:"
  line for you to fill directly in the file.
- **D9 (2026-07-10)** — **ROUND 28 RESTRUCTURE adopted** from Sérgio's live
  feedback (movement too harsh / co-guided / menu+instructions / logic broke /
  opening not working). Full plan: `docs/REINTERP_RESTRUCTURE_R28_2026-07-10.md`.
  Core design: **conducted movement** — remote-driven node-to-node moves, the
  era's Lamby-variant conducts (offers destinations), side quests = the
  unoffered nodes. Build queue reordered (R28-0…4 before C2). Doc consolidation
  into MASTER_PLAN_v2 planned after the §5 strikes below.
- **D10 (2026-07-10)** — Bookcase bug dispatched as R28-0. **→ CLOSED same day**
  (commit `9ca4078`). Real bugs: model props ignored their authored colors
  entirely, and both bookcases straddled the wall plane (measured, not guessed).
  Now: generic tint capability (all model props honor their colors — desk, lamp
  and plant visibly warmer too) + bookcase pulled off the wall. Fable-verified
  live: wood-brown, proud of the wall, facing the room; baseline clean.
- **D12 (2026-07-10)** — R28-1 movement prototype dispatched (Sonnet): floor
  markers at the existing camera seats, click-to-move with a short blink/fade,
  NEVER gaze-triggered, era-gated node lists in data (E1 = tight leash inside
  Room 1; E2+ = cross-room nodes as rooms open), scripted camera moves (O2 pan,
  update dollies, the TURN) always take precedence, one dismissable PLACEHOLDER
  instruction line on first availability. VR thumbstick wiring is scaffolded
  behind an input abstraction but only browser input ships now — headset feel
  is an A11 item. **Your feel-test of this prototype is the check** (already in
  section B).
  **→ BUILT + VERIFIED same day** (commit `f304aa3`, Session 26; Fable
  re-verified live: E2 offers exactly one marker, a player-driven click cuts
  cleanly spine → Room 2 with no intermediate frames, availability flips to
  offer the way back, gaze never arms anything, tests + build green).
- **D13 (2026-07-10)** — Honest finding from R28-1: there are only THREE real
  camera seats in the whole cluster (one desk per room), so the node graph is
  thin — E2 offers 1 destination, E3/E4 offer 2. The movement MECHANIC now
  works, but the exploration your R28 direction wants ("people be able to
  explore") needs MORE nodes per room (bed corner, bookcase, doorway
  thresholds, the respite corner, the ending arm). Adding nodes = new camera
  poses = spatial-feel work. Decision: Fable will draft the node-map per room
  as part of the conductor spec (R28-2) — markers at doorways rather than at
  chairs is already flagged by the builder as the V2 shape. Node positions
  get judged in your feel-test + A11.
- **D11 (2026-07-10)** — Opening cork PANEL retired as onboarding (your call
  ratified); the board's witness lineage (cork → filed record) SURVIVES.
  Replacement = orienting card (non-diegetic) + game menu + Lamby-conducted
  three-verb setup (look/move/interact). Spec in R28 §4 — glance before the
  build session.

## B. CHECKS OWED BY SÉRGIO (your queue — orders it however you like)

- [ ] **C3 voice-pass read of the full Era-1 chain** (kit → IRC → escalation →
  packet → diary tug-of-war → glitch → update). It now plays as one continuous
  piece; this is the G6/G7 ethics + register read the R27 brief flagged. ~20 min
  at `?flat=1&reinterp=1`. Highest-value check on this list.
- [ ] **A11 in-headset playtest** (Quest 3). Still gates ALL remaining spatial
  work tiers + batching phase 3. Every week this waits, the gated pile grows.
  Even a rough 15-minute pass unblocks a lot.
- [ ] **[VERIFY SOURCE] queue** — Fable will generate the consolidated list of
  every uncited claim as a section here (see Q3 below); until then, know it's
  accumulating.
- [ ] **R28 §5 LAW STRIKES — 2 of 4 done (2026-07-10):** ✅ (1) no-locomotion →
  remote-jump movement STRUCK; ✅ (3) click-only → +joystick/movement action
  STRUCK. Still pending your word: **(2) assistant caps → conductor-from-boot,
  ≤2 lines/beat** and **(4) frame-never-plays extended to the new menu**.
  These two gate the opening rebuild (the conductor teaches the verbs) and
  master plan v2 — a one-line "yes to 2 and 4" (or amendments) unblocks both.
- [ ] **R28 §4 opening glance** — confirm the three-layer replacement (card /
  menu / conductor-taught verbs) matches what you meant by "helps you
  understand the game and the overall space" before the rebuild session runs.
- [ ] **R28-1 movement feel-test** — when the movement prototype lands, drive
  it in the browser for 5 minutes: is player-initiated node movement the fix
  for the harshness you felt? Your verdict steers everything after it.
- [ ] **D8 / prop library policy** — Room 1 shipped with Kenney-only props;
  your new GLB library was mostly declined (license + one-art-family rule).
  If you WANT those props in (the 90s computer, radio, cassettes…), say so —
  it's an art-direction call: either accept mixed families per set-dressing
  tier, or we restyle. Screenshot the current Room 1 at `?reinterp=1` to judge.
- [ ] **Voice passes per era** — `COPY_INVENTORY_E2/E3/E4.md` are ~20 min each;
  `E1` + `CROSS` are the big sittings. Write into the "voice pass:" lines.
- [ ] **D-item reviews above** — batch-review section A whenever; nothing there
  is time-critical except that unreviewed decisions compound.

## C. OPEN QUESTIONS (answer inline, in chat, or by voice — whatever's cheapest)

*(none open right now — answered items move below)*

### Answered
- **Q1 — R8-2 character-creation opening** *(ANSWERED 2026-07-10 + found moot)*:
  Sérgio couldn't find the questions — because they were already resolved: his
  own Round-9 brief answered them ("they already know your name", profile
  chips), Fable wrote the OPENING_AND_FLOW_SPEC, and Session 5 BUILT it (the
  cork-board O1–O3 opening, verified in R26/R27). Nothing left to draft. His
  general rule stands and is adopted: ethics-adjacent specs may proceed with
  safeguards + tracking here, reviewed after the fact.
- **Q2 — update triggers** *(ANSWERED 2026-07-10)*: check the shipped build's
  existing triggers + suggest new ones → executed as **D5** above.
- **Q3 — copy inventory format** *(ANSWERED 2026-07-10)*: per-era files →
  executed as **D7** above.

## D. VERIFY-SOURCE QUEUE (generated, pending — see B/Q3)

*(placeholder — populated by an upcoming Haiku/Sonnet sweep of `data/`)*
