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
  **→ SUPERSEDED by Sérgio's answer (same day):** one camera position per room
  IS the design — rotation in place is the exploration; cross-room jumps are
  SYSTEM-SENT TASKS starting at Era 3 ("the system sends you there to do tasks
  and learn about each experience"). No extra nodes needed. The guided/task
  structure is also how the piece de-centers the gay narrative: E3 starts
  lesbian-led, E4 trans-led.
- **D14 (2026-07-10)** — Sérgio's full playtest triage dispatched as R28-0c
  (13 items): bookcase 90° rotation (both instances — Session 25's "rotation
  fine" conclusion was wrong, both were sideways), bed wall-clipping, boombox
  onto a shelf, marker clicks stealing prop clicks (his shelf click teleported
  him), markers now E3+ only, E2 keeps walls CLOSED (rooms open moves to
  E2→E3), remind-later return must replay the full ritual (his run skipped
  EULA/changelog — the breakage beats got lost), diary "(press to keep it)"
  cutoff, Rob's stale "i read what you typed" line, floppy-disk guidance
  (prompt + static highlight — it's a guided experience), CRT light error at
  E2 load, witness-board clipping + the bare "undone board" state, and killing
  every non-marker way to move rooms (the "gaze jump" he still felt).
- **D15 (2026-07-10)** — **E2 = HOMECOMING** (Sérgio's framing, adopted as the
  era's emotional law): Daniel COMES BACK from the placement — the E1→E2
  update must read as passage of time and finally returning home; the
  love-interest era; the ex-gay ministries' breakage as the symbolic backdrop.
  The morph staging + E2 conductor beats get spec'd to this in R28-2. This is
  why E2 stays a closed single room (D14's wall change).
- **D16 (2026-07-10)** — "Remind me later" = the **collect-your-belongings
  beat** (Sérgio's proposal, adopted for spec): deferring the update grants
  time in the room to gather/keep things (ties to the packet's "bring anything
  from before" and the graying-task lineage — his "clear off the room" idea);
  pressing Update now keeps it short. The "works once" law stays. Fable specs
  the beat in R28-2; the mechanic must never become a score/checklist.
- **D17 (2026-07-10)** — **Cassette system reinstated** (deliberately reverses
  the B3 removal): the kit's companion cassette becomes REAL — physical tape
  prop(s) + the boombox as the player-facing player, multiple tapes = a
  multi-step audio beat with proper sound design. Content candidates per
  Sérgio: period music compilation, prayers/hymns, conversion-program
  publicity of the era. G1 gate applies to prayer/hymn content; period
  publicity claims need KB verification before scripting. Production order:
  Fable drafts tape SCRIPTS (PLACEHOLDER) → Sérgio's pass → audio production
  (note: Ollama is text-only — audio wants your Sonauto/Suno-class lineage,
  same as the Lamby chime). See Q4 below.
- **R28 §5 strike 4 recorded as ADOPTED-in-substance:** your Esc request ("it
  should offer more options, like how to use the buttons") IS the game menu —
  Esc/pause opens the non-diegetic menu with controls help. Strike 2
  (assistant caps) remains the only law still pending.
- **D18 CORRECTED (2026-07-10)** — no singing-prayer audio exists yet; ALL tape
  audio is to-be-generated. Fable researched + drafted the Suno/Sonauto prompts
  (spec Appendix A: prayer, companion bed, publicity bed, mixtape tracks, Lamby
  E2 chime — all original material, cassette character, clean-vs-degraded
  audio doctrine: system audio clean, human tapes degraded). Sérgio runs them;
  nothing blocks on it (builds ship with placeholder hiss).
- **D19 (2026-07-10)** — **R28-2 GUIDED NARRATIVE SPEC written**:
  `docs/REINTERP_R28-2_GUIDED_NARRATIVE_SPEC_2026-07-10.md`. The flow-level
  implementation of your playtest direction: per-era emotional laws (E1 =
  being found, E2 = homecoming), the E1 side-message guide thread (pre-Lamby,
  per Q5), the 3-tape system (companion+prayer / period publicity / Daniel's
  mixtape-that-resists), the belongings beat with kept-objects-survive-unaged
  payoff, E2 homecoming staging + Lamby debut, the love-interest thread
  (SPEC-ONLY, gated on your read), side-quest taxonomy applied. Build lanes
  R28-2a…e sequenced inside.
- **D11 (2026-07-10)** — Opening cork PANEL retired as onboarding (your call
  ratified); the board's witness lineage (cork → filed record) SURVIVES.
  Replacement = orienting card (non-diegetic) + game menu + Lamby-conducted
  three-verb setup (look/move/interact). Spec in R28 §4 — glance before the
  build session.

- **D21 (2026-07-11)** — R28-2a SHIPPED + FULLY VERIFIED (Sessions 28–29,
  commits `ac99c52` + `a767af4`): the Era-1 side-message guide thread
  (floppy→kit→tape→channel→packet→diary→update, one active at a time,
  witness-symmetric filings, first profile click files instantly, the last
  message seeds Lamby's debut). The "O1 Continue broken" scare was a test-
  harness artifact (backgrounded tab suspends the arm timer) — the build was
  innocent; your real mouse was never affected. **Your check:** the guidance
  strings + their witness-line wording (followed/declined per message) live in
  `data/dialog/s1_guide.json` — newer than the copy inventory, so voice-pass
  them directly in that file.
- **D22 (2026-07-11, Session 28's discovered question — YOUR CALL):** the
  guided thread's spec opens with a "power on" beat, but the reinterp opening
  AUTO-BOOTS after O1 (and a dark monitor can't carry its own status line).
  Restoring a true power-on beat needs a small choreography change (don't
  auto-boot; a room-caption surface guides the first press). Options: (a) keep
  auto-boot, thread starts at the floppy (as built); (b) restore the power
  beat with a room caption. Deliberately NOT improvised — say a or b.
  **→ ANSWERED (a) by Sérgio 2026-07-11: auto-boot, guidance starts at the
  floppy. CLOSED as built — no change needed.**
- **D24 (2026-07-12)** — R28-2b SHIPPED + FULLY VERIFIED (Session 30): the
  three-tape system (props on the Room 1 bookcase shelf, boombox play/stop,
  data-driven captions, witness-symmetric filing). Judgment calls made without
  waiting on you (flagged, not buried): (1) **mixtape (Tape C) repositioned**
  from its old desk-side spot to sit beside the two new tapes on the shelf,
  reinterp-only (`data/room/reinterp_deltas.json` r1 override) — era1.json
  itself, and the shipped baseline, are untouched; (2) **tape colors**: A
  (companion) `#D4D0C8` pale grey-beige, B (broadcast) `#9FB4C0` blue-grey,
  reused from the existing era1 palette family, no new hex; (3) **replay
  semantics**: stopping and pressing play again on the SAME tape RESUMES from
  where it left off (no rewind-on-stop) — a cassette holds its position; (4)
  **witness filing is once-per-tape-ever**: the first decisive outcome
  (played-through or stopped-midway) is permanent — replaying a stopped tape
  to completion later does NOT upgrade/refile it. All four are easy to revisit
  if they read wrong in a headset pass. **Your check:** every caption in
  `data/dialog/s1_tapes.json` is PLACEHOLDER — Tape A's prayer segment is
  deliberately a bracketed stage-direction ("the group begins to sing"), not
  sung lyrics (G1 gate — your words, whenever you write them); Tape B's ad
  captions carry `[VERIFY SOURCE]` per line (period-shifted from the already-
  authored `s2_media.json` infomercial). The self-generated tape-hiss loop
  (`public/assets/audio/tape-hiss.mp3`, documented in `assets/LICENSES.md`) is
  a placeholder — your Suno/Sonauto files (prayer, jingle, mixtape tracks)
  drop into per-segment `audio` slots later, one registry line each in
  `src/audio/tapeAudio.ts`, no other code changes needed.
- **D23 (2026-07-11)** — Infomercial audio architecture (Sérgio's call,
  adopted): a LOOPABLE INSTRUMENTAL BED is the base asset (enter/exit at any
  point; reusable as Restorify ambience), with the sung "New You" hook as a
  separate 10–15s stinger remixed FROM the bed (Suno Cover/Extend) and dropped
  at the karaoke + tag moments. Prompts in the audio guide §7c. Supersedes the
  single-jingle approach.
- **D20 (2026-07-10)** — Era-doc mining done at Sérgio's direction:
  `docs/REINTERP_ERA_MINING_R28_2026-07-10.md` (10 finds). Headlines: the
  shipped Era-2 already contains the love interest (CALEB: romance → live
  redaction → streak death → returns as the messenger) — import, don't invent;
  **Lamby's Song audio already exists in the repo** (E2 leitmotif produced);
  the evangelist infomercial + jingle = Tape B, fully scripted; witness-
  symmetry doctrine adopted piece-wide; conductor lineage locked end-to-end
  (side-messages → Lamby → Lambient → Echo); Era-4's "Room Rewrites You" and
  the cyclorama finale fit the reinterp's real 3D rooms better than the
  shipped build's screen. Sérgio's audio queue SHRINKS to: singing prayer +
  mixtape tracks (+ optional broken-music-box render).

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
- [ ] **R28-2 spec glance** — read §§2–5 of
  `docs/REINTERP_R28-2_GUIDED_NARRATIVE_SPEC_2026-07-10.md` (side-messages,
  tapes, belongings beat, homecoming staging): strike/amend, then say go for
  R28-2a. The love-interest thread (§5) especially needs your read before any
  build.
- [ ] **Run the audio prompts** — START HERE:
  `docs/REINTERP_AUDIO_PRODUCTION_GUIDE_2026-07-11.md` (paste-ready Suno AND
  Sonauto versions of the prayer fitted to each tool's limits, the
  solo-boy-ending trick, the VO voice menu — note: Ollama can't do voices;
  edge-tts/Kokoro/ElevenLabs-free can — and the degradation pass that makes
  every take period-authentic). Queue by narrative value: prayer → jingle +
  instrumental → VO cast → mixtape. Builds don't block on any of it.
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

*(none open — all answered; see below)*

### Answered
- **Q4 — cassettes** *(ANSWERED YES 2026-07-10)*: tapes as optional
  reduce/expand narrative triggers ("it triggers separate things" — they're
  narrative-tributary side quests). The existing **singing-prayer** recording
  is the emotional anchor tape. Fable drafts the tape scripts (PLACEHOLDER,
  prayer wording deferred to Sérgio per G1, period publicity carries
  [VERIFY SOURCE]) → executed as **D18** in the R28-2 spec.
- **Q5 — assistant law** *(ANSWERED 2026-07-10, as an amendment)*: **there is
  NO Lamby character in Era 1** — E1 guidance = impersonal system
  side-messages (short clues that help navigate and PREPARE the user for
  Lamby); the Lamby character-conductor debuts with the E2 update. This
  supersedes R9's "Lamby-as-Clippy already installed at login" (LambyOS the
  brand boots; Lamby the character comes later). All four §5 strikes now
  resolved → CLAUDE.md carries the "REINTERP AMENDMENTS (R28)" block; the
  opening rebuild spec + MASTER_PLAN_v2 are unblocked.

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
