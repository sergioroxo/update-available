# FOR SÉRGIO — decisions made, checks owed, questions open
STATUS: live

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

- **D38 (2026-07-13, Session 34)** — **THE E2 ARRIVAL BUILT** (R28-2d-i/ii,
  `docs/REINTERP_E2_HOMECOMING_SCRIPT_2026-07-12.md` S2R.0–S2R.2, feel-testable
  end-to-end now): 2003 daylight lands in the E1→E2 morph beat (`data/room/
  cluster.json`'s `e2` rig — the window light recolors from night-blue to a
  warm daytime hue and comes up from near-off to a real presence; the lamp was
  already reduced); THE SILENCE holds (no side-messages, no hints, monitor
  dark) until the return press ("Welcome back, Daniel. Press to continue with
  reboot." — the machine was already waiting); Lamby debuts (a small
  canvas-drawn lamb mark, exactly two lines, Begin/dismiss chips); dismissal
  always works and files, Lamby does not return until the Restorify desktop
  icon is opened by hand; Restorify's shell shows the 412-day purity streak +
  Daily Realignment chips (register, never branch). D33's two props (teddy
  bear box, rainbow duck) landed as part of this session's eligible-belongings
  set — see D33 below; the REJECTION beat there is still open. **Your checks:**
  the Lamby mark's look (small, canvas-drawn, charming-not-cute — a first
  pass, cheap to redo) and the daylight values (`cluster.json`'s e2 rig:
  moonlight 0.05→0.3 intensity, night-blue→`#F3EAD8`) are both judgment calls,
  not locked; all copy PLACEHOLDER as ever.
- **D43 (2026-07-13)** — **THE GAME MENU + ORIENTING CARD shipped** (Session
  36, commit `b4b36b0`; built by Sonnet, verified + closed out by Fable after
  another session-limit interruption). Your Esc ask is real: pause from
  anywhere via Esc or the "II" glyph — Resume / Restart (confirm + ledger
  wipe) / Controls / **Credits & attributions** (rendering the CC-BY table
  from ATTRIBUTIONS.md via a new generator — that standing item is closed) /
  Leave. Frame-voice throughout, and the menu NEVER files — the frame never
  plays. Plus the pre-fiction orienting card ("You will follow different
  lives through thirty years of one machine."), 4s-armed, shown once.
  **Your checks: the card's wording (it's the piece's first sentence now),
  glyph placement, and one thing I couldn't independently re-verify — pause
  DURING an update ritual and confirm it resumes cleanly.**
- **D44 (2026-07-16, Session 37)** — **THE THREE-SCREEN ROOM foundation
  shipped** (E3-i, per the R29-b deep revision you adopted: "I really like
  the 3 device"). Room 2 (Vera, 2016) now has three working device seats —
  laptop (the desk), tablet (on the bed), phone (on the nightstand) — each
  its own screen, reached by clicking its floor marker (the same
  click-to-move seam as the cross-room jumps). Content this session is a
  SHELL only: the laptop shows a SisterSignal login screen (no GraceQueue
  yet — that's next, gated on the trans-masc reader per the adaptation
  spec), the tablet a static True Daughters feed (4 placeholder posts), the
  phone a lock screen with one notification. Lambient's mark (the same
  scatter from the E2 dispersal) appears small on all three. All copy
  PLACEHOLDER. **MID-SESSION FIX (same day, your live note from a
  screenshot — "THE SCREEN READS TOO SMALL"):** the laptop's monitor was
  originally the room's shared 1997/2003-scale CRT (no new geometry) — this
  is now REPLACED, Room 2 only, with a period-correct 2016 flat panel (dark
  bezel, wider screen, pulled ~0.19m closer); the SisterSignal window now
  runs maximized with much bigger text (was a small centered box); the
  tablet/phone seats are pulled in to ~0.6-0.65m viewing distance (was
  ~1.3m). Re-verified live after the fix — draw calls still 27-35,
  budget-safe. **Your checks: (1) the readability fix itself — your
  screenshot was the acceptance test, so a final look decides if this
  lands or needs another pass; (2) the seat poses/distances (FABLE/SÉRGIO
  CHECK values — computed then screenshot-tuned, not measured; listed in
  the session log) — they read comfortably in my own browser pass but
  you're the one who'll feel it in-headset eventually; (3) nothing
  ethics-bearing here — no borderland/Noa/Mira/Ash content in this session,
  by design.**
- **D45 (2026-07-16, Session 38)** — **THE GRACEQUEUE PATTERN STRIP + CARD SET
  shipped** (E3-ii; your drafted cards are now playable). Sign in on Vera's
  laptop → the moderation queue: one card at a time, big type; the strip runs
  1→5→2→6→3→7→4 so on-script and off-script alternate (the training curve);
  the system auto-flags the three warm cards (tone review / doctrinal
  question / contact risk) and the two buttons are honest about power —
  [Move to review] is tinted and marked "▲ system suggests", [Let it stand]
  is plain, "your call". MIRA enters only after you have filed two flags —
  the eye is trained before it is tested — with the system band reading
  "bury recommended — may confuse newer sisters"; letting her stand files
  the era's glitch line ("I won't bury her story.") in the record's refusal
  amber and sets the state flag the later turn/counter-current beats will
  read (S3R.6 not built, by scope). THE TABLET is now the complicity
  surface: stories you approved appear with hearts + lamb-badges; stories
  you buried are simply absent; Mira, if you let her stand, pins to the top
  with "12 replies" (no thread yet). No scores, no streaks, no progress
  counter anywhere. All copy PLACEHOLDER (your card voices transcribed
  verbatim from the draft doc — your pass pending, especially Renata and
  Mira per the draft's own note). Verified across two full runs (both Mira
  outcomes); session was split by an account-limit outage mid-verification
  (WIP commit protected the tree; resumed and fully verified same day).
  **Your checks: (1) the Mira gate TIMING — she enters MID-strip the moment
  the second flag files (maximum heat), not at the strip's end; one data
  change flips this if it reads wrong; (2) the queue's type sizes on your
  screen (Session 37's readability rule applies); (3) the tablet fits ~4
  cards and a full warm feed overflows below the glass — a scroll pass is
  flagged, not built; (4) the done-screen line ("You're caught up.") is new
  placeholder copy, not from your draft.**
- **D46 (2026-07-17, Session 39)** — **E3 SCREENS RE-LAID-OUT FOR THEIR REAL
  FORMATS — your readability re-check.** Your report was exact: after the
  Session 37 flat-panel swap, the laptop's image had only been ENLARGED — the
  canvas still composed for the old squarer CRT shape and was stretched onto
  the wide panel (every pixel ~30% wider than tall). Fixed at the root: each
  device's offscreen canvas now matches its panel's real shape natively —
  laptop widescreen (26:15, the 2016 panel), tablet ~3:4, phone exactly 1:2 —
  square pixels everywhere, nothing stretched. And the GraceQueue/SisterSignal
  screens are now COMPOSED for widescreen: the card, the system band, and the
  verbs sit in one centered reading column (~50-char testimony lines) with
  real margins both sides, instead of text pinned left with dead space right;
  the Lambient foot band stays full-width like window chrome. Layout only —
  not one word of card copy or data changed, Mira's gate and the tablet
  consequences verified intact, the whole strip re-driven with real clicks
  after the change. **Your checks: (1) the acceptance test is yours again —
  a look at the laptop card view on your screen: does it now read as
  DESIGNED for the wide panel (not zoomed)?; (2) type sizes after the
  re-grid — the queue's card text should feel the same size as Session 38
  tuned it; if not, one number per device changes it (flagged in the session
  log); (3) tablet/phone are minor shape corrections only — a glance
  suffices.**
- **D47 (2026-07-23, R29)** — **THE TRACKING SYSTEM adopted (your header proposal,
  improved).** Your diagnosis ("this has been so hard to track that even you got
  confused") drove the round; the register is `docs/reinterp/08_STATUS_REGISTER.md`.
  Adopted: (1) a one-line `STATUS:` header on every doc (`live` / `superseded-by
  <file>` / `history-only`); (2) check-spec **C5** — headerless-doc count as a
  RATCHET (the C4 idiom: fails on growth, nags downward — this is what makes the
  migration incremental instead of the heroic pass R28 §6 promised and didn't
  finish), `superseded-by` targets must exist, and opt-in `KILLS:
  src/<path>#<symbol>` lines that fail CI if a doc-declared-dead symbol is still
  referenced; (3) read-only `tools/doc-status-report.mjs`. Stated limit: a checker
  catches a dead SYMBOL, not a dead JOB — partitions like the cork board's (the
  onboarding dies, the witness surface survives) still need a human sentence, now
  forced into one greppable place. Kept strictly SEPARATE from the provenance
  graph (the Close/dossier axis) — different questions, never one "status" field.
  Why R28 §6 failed, on the record: one-shot consolidation with no failure signal
  for the tedious half — v2 got written, the 40 headers and the 03/04 pointer
  updates didn't, and nothing broke, so nobody noticed for nineteen days. Build =
  S41. Strike to approve; process call made under autonomous mode (D1).
- **D48 (2026-07-23, R29)** — **TWO ARBITRATIONS for the S40 opening-layer-3 build**
  (ratify or veto — both are plan-consistency calls, not new design): (a) R28 §4
  layer 3 says "Lamby walks you through" the three verbs, but it was written hours
  before your Q5 strike (NO Lamby character in E1); the amendment wins — in E1 the
  verb-teacher is the IMPERSONAL side-message system (`s1_guide.json`), which is
  also already the built vehicle. Lamby still gets his conducted-tour moment — at
  his actual E2 debut. MOVE isn't teachable in E1 (zero nodes by design, R28-1);
  the existing movement-hint at first marker offer carries it. (b) The
  R28-§4-dead "Start-up options" panel retires IN THE SAME SESSION layer 3 ships,
  never before — so there is no gap where the piece has neither the old onboarding
  nor the new. The cork board itself, its O3 profile pinning, and its
  witness-lineage role are untouched — only the onboarding panel dies.
- **D39 (2026-07-13)** — **ECHO KEPT, as Lamby's final form** (your "wasn't it
  supposed to stay closer to Lamby?" answered structurally): Echo IS the
  lineage's end — the dispersal fragments reassembled into pure voice, no body
  left; the mask coming off IS the E4 thesis. Legibility added: Echo's arrival
  shows the lamb-fragments reassembling into its waveform mark, and the
  witness record carries the chain ("companion process v4: echo — migrated
  from lambient"). Minimal footprint law carried forward: same ≤2-lines-per-
  beat discipline as Lamby. Strike to approve.
- **D40 (2026-07-13)** — Echo's VOICE production plan: audition timbre on
  HF/Qwen (2–3 candidates, description in the E4 design §4), then Fable has a
  batch pipeline built (`tools/gen_echo_tts`, Kokoro local = free +
  deterministic + regenerable) so all ~50 lines generate in one command after
  your voice pass. No paid tools needed.
- **D41 (2026-07-13)** — Session 35 dispatched: the New You infomercial
  PLAYER (NetVision window, VHS chrome, silhouettes, karaoke ball, the fine-
  print crawl) with S2R.4's BREAK built in — the video wrecks itself at the
  end ("Call now! Call n—", freeze, static) and a first crack of Caleb's
  message surfaces through the static (fragment only; the full thread stays
  gated). Provisional trigger = after the first check-in, via Lamby's offer;
  moves to post-redaction when the Caleb lane builds. Audio slot empty —
  your song completes it.
- **D42 (2026-07-14, Session 35)** — **D41 BUILT: THE NETVISION PLAYER**
  (`src/desktop/apps/netvision.ts`, R28-2d-iv). Lamby offers the video (≤2
  lines, chips Watch/Not now) right after the FIRST completed Restorify
  check-in — "Not now" files and never re-offers this session. The player
  renders `data/dialog/s2_media.json`'s 13 scenes on the NetVision window:
  scanlines, cheap offset-tint "RGB-split" text, sparse tape noise, VHS
  chrome (▶ SP + burned-in timestamp), lower-thirds, before/after stamps,
  composite non-likeness silhouette busts (blocky pixel figures, single/trio
  for host/testimony/crowd shots), the karaoke bouncing ball on the chorus.
  THE BREAK (driven from the last 2 scripted scenes, never hardcoded):
  noise density climbs, a rolling tracking band appears, the CTA/offer card
  FREEZES (captured once, held "too long") while its line stutters
  ("Call now! Call now! Call n—", data-driven), then tears to full static;
  through the static, one clean/unfringed line renders — "1 new message —
  C___" (Caleb's message-fragment; the thread itself stays gated/untouched).
  The player then auto-closes; a small persistent mark stays in the E2
  taskbar's status well ("the notification mark persisting quietly").
  Skip (after `skipDelaySeconds`, data-driven) files `ad skipped → avoidant`;
  watching to the break files `testimony viewed → susceptibility ↑` PLUS a
  separate `media: interrupted — signal lost`. New `ledger.media` array,
  witness-symmetric, rendered in the witness session log. Audio: reuses the
  existing `TapeAudioBus` (tapes.ts's boombox is already torn down by the
  E2 era-shift, so the two never contend); `audioTrack:
  "new_you_program_song.mp3"` is deliberately NOT in tapeAudio.ts's
  REGISTRY yet — ambient hiss plays alone, zero console errors, confirmed
  in-browser (network log shows only tape-hiss.mp3 requested). One
  REGISTRY line + retimed `at`s finish it once your song lands. **Your
  checks (judgment calls, not locked):** (a) the silhouette look — blocky
  pixel head/shoulder busts, no faces, single figure for host/testimony,
  three for crowd; (b) THE BREAK's choreography — I froze whichever
  scene was active at the break's start (the offer/CTA card, since the
  ported data's last two scenes are offer→static, not a smiling portrait)
  rather than literally freezing a "portrait" shot as the spec's prose
  suggested — flagging the deviation rather than burying it; (c) the
  stutter's flicker rate (~2.5s cycle, text-length change only, no
  luminance flash — kept well under any strobe/photosensitivity concern);
  (d) the "cheap RGB-split" is implemented as ±1px offset-tinted text
  redraws (per §A's own suggested technique), not per-pixel channel
  extraction — cheaper, matches the doc's letter. Verified live
  (browser): the full offer→watch→break→static→notification→close chain,
  the skip path, the decline path (files + never re-offers), and the
  no-flag/`?flat=1` baselines swept clean before and after. `npm test` +
  `npm run build` green throughout.
- **D37 (2026-07-13)** — **ECHO SCRIPT DRAFT v1 written** (twelve units, enough
  to hear the era): `docs/REINTERP_E4_ECHO_SCRIPT_DRAFT_2026-07-13.md`. The
  deadname beats escalate by WARMTH (the apology grows while the record
  hardens); the chip foreclosure is visible U7→U10, with the correction chip
  ("my name is Maya") disappearing for exactly ONE unit — the era's darkest
  moment — then returning LIVE inside the careful-pause screen as the thread
  out; Echo's only broken sentence is the last one, cut mid-word by
  TRANSCENDANCE's `NO CATEGORY FOUND`. **Your verify: the four checks listed
  at the doc's end (Echo never villainous, warmth-escalation, visible
  foreclosure, curation-targeted split) — not line-by-line taste yet.**
- **D35 (2026-07-12, R29-c round)** — Your four E3 answers folded in: the
  **THREE-SCREEN ROOM is the E3 architecture of record**; the split-character
  option is drafted concretely so your "maybe 2" has something real to judge —
  **ASH ROWE** (Ash = the name the form can't parse; Rowe = the row it can't
  complete) carries the borderland, Noa stays Mira's advocate, one line each
  in the counter-current; my REC = split. **Felt-beat DRAFTS written at your
  delegation** (Noa's DM, the counter-current cards, Mira's thank-you — all
  DRAFT-FOR-SÉRGIO in the E3 spec §FELT; your verify is the pass). And "how
  it all fits" = **the CONTINUITY THREADS table** (master plan §5b): six
  threads — watcher/board/machine/name/warm-objects/law — each traced E1→
  Close, with the rule: a beat that sits on no thread is decoration; one that
  contradicts a thread is wrong. **Your checks: pick Noa-carries vs Ash
  split; verify the felt drafts; skim §5b.**
- **D30 (2026-07-12, R29 round)** — Your era-by-era direction, all applied:
  E2's return press is now the waiting screen ("Welcome back, Daniel. Press to
  continue with reboot" — the machine expected him); the infomercial is
  reframed as **LAMBY'S INTERVENTION VIDEO** after the Caleb relapse, breaking
  down glitchy at its end with Caleb's message arriving through the wreck
  (E2 script S2R.4 revised); E4 is now **AUDIO-FIRST** (Echo speaks — TTS by
  design, too clean; deadnaming + the LGB-anti-trans split foregrounded;
  TRANSCENDANCE kept; master plan §5 revised). Session 32 dispatched: your
  three real audio files wired into the tapes (mixtape = Family Design
  Solutions w/ subtitle captions; Tape B = Discover The New You framed as
  taped-off-the-radio, SWAPPABLE while you make versions; Tape A prayer =
  Fold My Hands) + the ffmpeg degradation tool (--tape97/--vhs03).
- **D31 (2026-07-12) — "LAMBY NEVER LEAVES" — ✅ STRUCK / ADOPTED by Sérgio
  2026-07-25** ("let's add the changes from the evidence"), after the GPAHE
  check he requested. Adopted WITH the evidence refinements: the uninstaller's
  line becomes *"could not be removed — RENAMED"* (GPAHE's documented mechanism:
  NARTH→ATCSI 2014, and medical-sounding relabelling to evade moderation), the
  beat carries `status: documentary`, real orgs stay dossier-only, and it is
  staged as **survival by scattering, never omnipotence** (2023: deplatforming
  partly worked). **S57 now BUILDS item 6 rather than leaving a seam.**
  Original proposal text follows.
  **(was:)** at the u3 install: "Restorify — removed." then smaller:
  "companion process — could not be removed. migrating." — Lamby fragments
  into the marks that become Lambient's badges at E3. The collapse scattered
  the apparatus into everything = WHY the rooms open. Strike to adopt, or
  amend (E2 script S2R.7).
  **⚑ EVIDENCE ADDED 2026-07-25 (Sérgio asked whether GPAHE helps decide this —
  it does): the beat is DOCUMENTED, not invented.** GPAHE's "The Players" records
  that after Exodus's 2013 shutdown the movement survived by *rebranding* and
  *decentralizing* "from centralized structures to networks of independent
  affiliates"; "The Ecosystem" finds the digital form "decentralizes authority —
  individual practitioners and small nonprofits reach global audiences without
  traditional institutional oversight." The project's OWN knowledge base already
  cites this (`docs/ChatGPT analysis.md`: "the rhetoric did not disappear. It
  migrated into platform-native forms"). Recommendation: **STRIKE — adopt**, and
  the beat can carry `status: documentary`. Refinement offered: GPAHE's mechanism
  is *renaming* (NARTH→ATCSI, 2014; "reintegrative therapy" to evade moderation),
  so *"could not be removed — renamed"* may beat *"migrating"*. Full analysis,
  incl. two cautions (Exodus Global Alliance is real and currently operating, so
  dossier-only; and 2023 shows deplatforming PARTLY worked, so don't stage it as
  omnipotence): `docs/REINTERP_D31_DISPERSAL_EVIDENCE_2026-07-25.md`.
- **D32 (2026-07-12) — E3 mechanics options searched (your ask):** three
  room-native replacements for the screen-bound queue in the E3 spec's R29
  addendum. **REC: Option 1, THE PINBOARD ROOM** — the community physically
  on Room 2's wall; moderating = moving cards by hand; the drawer is the
  bury; leaving Mira's card pinned IS the refusal; and it completes the board
  lineage (the cork board that filed you → the board you curate → Maya's wall
  → the constellation). Options 2 (welcome shelf) and 3 (voice switchboard)
  written up too. **Pick 1/2/3 or a mix.** Malta stays the breaking point.
- **D33 (2026-07-12) — belongings cast change (your idea, adopted pending
  props):** add the **rainbow duck** (already the canon ambient-resistance
  object) and a **teddy bear with the REJECTION beat** — one kept item the
  ritual refuses: "item unsuitable for the next phase" — the system reaching
  even into what you take. Filed, of course. Needs the two props + one beat;
  queued for the E2 staging lane. Confirm the teddy-rejection reading.
  **→ PROPS LANDED (Session 34, 2026-07-13):** both added to `data/room/
  era1.json` (small, set-tier, palette colors — the duck's yellow is the ONE
  new hex this session, the explicit "canon rainbow" exception) and to
  `data/room/belongings.json`'s eligible set (now 9 items, past the original
  5–8 range — flagged, not silently exceeded). **The REJECTION beat is still
  open** — not this session's scope; your teddy-rejection reading is still
  owed whenever that lane opens.
- **D34 (2026-07-12) — O1 FULL REVAMP brief written for Codex** (your ask —
  a NEW interpretation, not a rework):
  `docs/reinterp/CODEX_BRIEF_O1_REVAMP_2026-07-12.md`. Design-first, 2–3
  fresh takes, best one greyboxed behind `?o1=v2` so you A/B against the
  current board. Paste it into a Codex session whenever.
- **D29 (2026-07-12)** — **THE E3 ADAPTATION SPEC written**:
  `docs/REINTERP_E3_ADAPTATION_SPEC_2026-07-12.md`. Your borderland revision
  made structural: **Noa Field deepened to carry the butch/trans-masc
  borderland** (her locked name already says it — "unclassifiable data
  field"); the era's hardest surface is the TWO-EDGE POLISH BENCH — the same
  testimony flagged "soften her presentation" AND "gender confusion —
  exploratory mentorship," both rendered, neither endorsed, Noa never
  resolved (the piece never answers for her). Moderation tasks become the
  system-sent cross-room jumps (archive review → Daniel's aged Room 1;
  referral follow-up → a half-lit Room 3 facet preview that seeds E4). Malta
  2016 + the Flourish rebrand close the era. **Your reads: (1) Noa carrying
  the borderland vs. splitting into two people; (2) the felt beats are yours;
  (3) trans-masc reader gate before E3-iii content.** E3-i/ii are mechanical
  and can start when E2's lanes clear.
- **D28 (2026-07-12)** — **MASTER_PLAN_v2 WRITTEN** — the consolidation you
  asked for ("the documents all fit and not fit together"):
  `docs/REINTERP_MASTER_PLAN_v2_2026-07-12.md`. One current-truth document:
  the piece in one page, consolidated laws, the space, the guidance lineage
  (side-messages→Lamby→Lambient→Echo), the full era-by-era flow (E1 built ·
  E2 scripted · E3/E4 spines set), the update grammar with the EULA verb
  ladder, audio doctrine + asset state, content pipelines, the live build
  queue, and a supersession map. `00_START_HERE`'s read order now points to
  v2 — new sessions read FOUR docs instead of forty. **Your check: skim §1
  and §5 — if the one-page version of the piece doesn't match the piece in
  your head, that mismatch is the most valuable thing you can tell me.**
- **D25 (2026-07-12)** — **THE E2 HOMECOMING SCRIPT written** (the era's real
  narrative): `docs/REINTERP_E2_HOMECOMING_SCRIPT_2026-07-12.md`. Beats
  S2R.0–S2R.7: the silent return (kept objects un-aged, 2003 daylight), **the
  power press relocated to E2** (in '97 the machine booted for you; in '03
  Daniel turns it on himself — voluntary return IS the era), Lamby's 2-line
  debut, the streak that "counted while he was away," the CALEB thread
  (warm chat → live redaction → streak death → Caleb returns as the
  messenger), the New You infomercial placement, the collapse with the broken
  jingle, the residue line, the send to Room 2. **YOUR GATE: read S2R.3 (the
  Caleb beat) — the one new ethics territory; yes/amend before its build lane
  runs.** Operable copy is PLACEHOLDER-drafted; Caleb's words + the felt beats
  are yours alone.
- **D26 (2026-07-12)** — Sérgio's music-video structure for The New You
  registered as CANON (audio guide §7d): female announcer, in-song talking
  sections, SATB chorus, and the triple "Call now!" ending — the satire-
  collapse in musical form, protect it in any edit. Single-generation route;
  §7c loop+stinger stays as fallback. His verse/chorus lyrics enter the canon
  as HIS draft.
- **D27 (2026-07-12)** — R28-2c belongings beat dispatched (Sonnet): remind-
  me-later opens the gathering (guide-system message, no checklist/counter),
  click props to keep, kept objects survive the E1→E2 morph UN-AGED (the
  homecoming payoff), final-state-only filings, refusing to gather is a valid
  filed answer, update-now = "belongings: processed."
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
- **D30 (2026-07-12)** — R28-2c, the belongings beat: the eligible-item list
  Fable chose for `data/room/belongings.json` (7 of the spec's 5–8) —
  **the mixtape** (Tape C, designed candidate), **tapeA** (companion tape),
  **tapeB** (broadcast tape), **the plant**, **book1** ("a paperback"),
  **book2** ("a schoolbook"), **the poster** (`poster1` — stood in for the
  spec's "polaroid-ish decor" since no literal photo/polaroid prop exists in
  Room 1 yet). All labels/witness text PLACEHOLDER, per the rail. Also a
  judgment call, not an ethics gate: the pre-existing `update` guide
  message's retirement condition now differs by path — pressing "Remind me
  later" retires it immediately (freeing the guide's slot for the new
  `belongings` message), while the direct "Update now" path still waits for
  the actual era shift, exactly as Session 29 verified. Strike/amend either;
  full narrative context in `01_SESSION_LOG.md`'s Session 31 (R28-2c) entry.

- **D36 (2026-07-12)** — R28-2b-ii, real tape audio wired (Session 32): your
  three delivered Suno/Treblo tracks (Family Design Solutions, Discover The
  New You, Fold My Hands) are degraded (`tools/degrade_audio.sh --tape97`,
  a new production-only ffmpeg tool, plus a `--vhs03` sibling preset and a
  `--wrap` tuning-static modifier) and wired into Tape C track 1, Tape B, and
  Tape A's prayer segment respectively, with captions time-synced from their
  lyric sheets. **Listen-test the three tapes** — captions are auto-timed
  (precise for the two tracks with word-level LRC data, evenly-spaced
  approximation for Fold My Hands, which has none) and may want retiming by
  ear. Tape B is a SWAPPABLE CANDIDATE — more versions of that jingle are
  coming; swapping needs one line in `src/audio/tapeAudio.ts` + one filename
  change in `data/dialog/s1_tapes.json`. Also folded in from your live
  playtest feedback mid-session: the live hiss bed was too loud (now ducks
  from a 0.12 idle floor to 0.03 whenever a real clip plays — both numbers
  are ear-judgment placeholders, please listen and say if they need
  retuning) and the box-built boombox was clipping the Room 1 shelf's
  front-left support (re-measured the shelf's real bounding box and swapped
  in a real CC-BY model, `cassettePlayer.glb` by Jason Toff via Poly Pizza —
  attribution now lives in the new `docs/reinterp/ATTRIBUTIONS.md`, which
  didn't exist before this session; its exact scale/position is a first-pass
  screenshot judgment, not yet foreground-reviewed by you). Full detail in
  `01_SESSION_LOG.md`'s Session 32 entry.

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

- **⚑ Q-D49 (2026-07-26, from S59) — the dossier's visible STATUS line.**
  `ETHICS_CONSTRAINTS.md` #13 wants a visible `status` on dossier cards. But a rendered
  `STATUS: DOCUMENTARY` line is *precisely* the authoring voice you just asked to kill
  ("please no"). S59 moved provenance to `slice.json`'s `dossier._provenance` — present,
  unchanged, but INVISIBLE — and correctly refused to decide this for you.
  **Keep it invisible, or restore a rendered line?** *(My read, offered not assumed: keep it
  invisible HERE, because `referral_notes.txt` is now a found in-world document and a status
  stamp would break its fiction — but the rule should still bind the Close's constellation and
  any true dossier surface, where provenance IS the content. That would mean amending #13 to say
  "visible on provenance surfaces", not "visible everywhere".)*

- **⚑ Q-D50 (2026-07-26, from S61) — where does the OS surface live after you leave Room 1?**
  The slow fly-over exposed it: Daniel's CRT was showing a full "GracePlatform · testimony tools
  ready" desktop while you flew over it. S61 made it dead at E3 — but did NOT blanket-retire it,
  because the spine still arms u4 on that surface. So the question is real and structural: once
  the player's home base has migrated to Room 2, **what is Daniel's machine, and where does the
  OS live?** S61 explicitly declined to invent an answer. Options worth weighing: the OS follows
  the player to each room's machine; Daniel's CRT goes dark and permanently stays a prop; or it
  keeps running as an abandoned surface you can still see (which the infrastructure spine might
  actually want — the apparatus doesn't stop when you leave).

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

## D. VERIFY-SOURCE QUEUE
> **⚑ UPDATE 2026-07-24 — the research pass is DONE.** Sérgio ran the Deep Research prompt
> (`docs/CHATGPT_DEEPRESEARCH_SOURCE_VERIFICATION_2026-07-24.md`); results are converted into
> required build changes in **`docs/SOURCE_VERIFICATION_RESULTS_2026-07-24.md`**. Headline: every
> claim survived, but **six need rewording** (C1 Ferguson v. JONAH conflates jury verdict with
> injunction · C2 APA 2009 covers orientation only, cite 2021 for gender identity · C3 van den
> Aardweg is not a *validated* clinical instrument · C4 Love Won Out said parents, not schools ·
> C5 the pillow gap is narrower — only "deeper" is unsourced · C6 Truth in Love was print, not TV).
> **What's left for Sérgio: approve/rewrite C1–C6.** The rows below stay as the original sweep.
>
> Also resolved 2026-07-24: **Tape B** confirmed fine as invented content (no source owed) ·
> **`_dummy.json`** confirmed non-shippable scaffold, out of scope · **Malta** reverified
> (use Parliament of Malta + legislation.mt Chapter 567, *not* the NATLEX record).
>
> **⚑ UPDATE 2026-07-25 (S47) — corrections C1–C6 applied to the files as PROPOSED, not cleared.**
> Every row below still carries its `[VERIFY SOURCE]` tag; nothing is cleared by this session —
> that stays Sérgio's call (ETHICS_CONSTRAINTS #13/#14). What changed: D.1's four `pillow.json`
> rows (`:149` unchanged/no correction owed, `:155`/`:161`/`:167` reworded) and four
> `origin_intake_e1.json` rows (`:102`/`:108`/`:114`/`:120` reworded) each gained corrected text,
> source URLs, and an `"_proposed"` marker for in-file review — see
> `docs/reinterp/01_SESSION_LOG.md` for the exact diff list. D.2's `s2_media.json:2` row gained a
> sibling `_sourceNote` field with the C6-corrected text (newspaper not TV) — the original `_doc`
> clause it names is left untouched. D.3's u2/u3/u4 rows each gained a `_sourceGrounding` field
> with the hard dates/named cases from the results doc (Paulk, Chambers, Malta, the one app) — the
> player-facing copy in `updates.json` was not touched, since none of it asserted the imprecise
> claims being corrected. **Also this session:** the van den Aardweg quote-diff D.1's `:102` row
> asks for is done and reported in the session log — states[0]/[1]'s "direct quotes" are verbatim
> substrings of real items 1 and 9 (not adjacent items, and truncated/partial), not rewritten here
> (that's flagged for Sérgio, not applied).

*(generated 2026-07-24 — sweep of every JSON file in `data/`
for `[VERIFY SOURCE]` tags AND factual claims with no tag at all. Sit top-to-bottom;
each row is one thing to check. Nothing here has been reworded, retagged, or
status-assigned by this sweep — that stays your call per ETHICS_CONSTRAINTS.md #13/#14.)

### D.1 Provotype debrief sources (8 total — the only place `status:` fields exist)

| File | Claim | Dossier status | What verifying it takes |
|---|---|---|---|
| `data/provotypes/pillow.json:149` | Richard Cohen promoted an anger-release exercise (striking a pillow with a tennis racket, addressing a parent) — per a 2005 Washington Post profile and a GLAAD summary. | documentary (confidence: high) | URL check — find and re-read the WaPo profile + the GLAAD summary; confirm both describe this exercise as stated. |
| `data/provotypes/pillow.json:155` | The commonly-repeated addition ("continue until deeper feelings emerge") could **not** be confirmed in a primary source — the gap itself is what's disclosed, not used as scripted wording. | speculative (confidence: low) | Judgment call — this is already a documented non-claim (a disclosed absence); confirm you're comfortable with the "gap disclosed" framing rather than treating it as something still owed a source. |
| `data/provotypes/pillow.json:161` | *Ferguson v. JONAH* (New Jersey, 2015): a jury found the org's conversion-practice representations constituted consumer fraud; JONAH was barred from representing sexual orientation as curable. | documentary (confidence: high) | URL check — verify case name, jurisdiction, year, and the fraud/bar finding against a primary or reputable secondary source. |
| `data/provotypes/pillow.json:167` | Major professional bodies (incl. APA) and the UK's cross-government Memorandum of Understanding on Conversion Therapy state such practices lack evidence of benefit and carry risk of harm. | documentary (confidence: high) | URL check — confirm APA position statement wording + the UK MoU exists and says this; both are public documents. |
| `data/provotypes/origin_intake_e1.json:102` | Van den Aardweg's "Anamnestic Questionnaire" (1997) is a real clinical instrument; two prompts in the scene quote it directly, one paraphrases (the childhood-play question). | documentary (confidence: unspecified — check field) | KB lookup — confirm the instrument exists under this name/year, then a judgment call on whether the two "direct quotes" actually match its text and the third is fairly called a paraphrase. |
| `data/provotypes/origin_intake_e1.json:108` | Love Won Out published conference-guide material instructing parents/schools to monitor a child's gendered behavior; this scene's framing draws on that. | documentary | URL/KB lookup — locate the conference-guide material and confirm it instructs behavioral monitoring as described. |
| `data/provotypes/origin_intake_e1.json:114` | The behavioral-monitoring questions are composited from survivor testimony (e.g., "Guay") and clinical literature (Flentje et al., 2013) — not one surviving worksheet. | documentary | KB lookup — confirm the Flentje et al. 2013 citation is real and on-topic, and that "Guay" is a documented survivor account already in the KB (name currently unqualified — first/last, publication, where it lives). |
| `data/provotypes/origin_intake_e1.json:120` | Major professional bodies (incl. APA) state conversion practices lack evidence of benefit; this instrument's causal premises are unsupported. | documentary | Same APA position-statement check as the pillow.json row above — likely one verification serves both. |

### D.2 Other `[VERIFY SOURCE]` tags outside the provotype dossiers

| File | Claim | Dossier status | What verifying it takes |
|---|---|---|---|
| `data/dialog/s2_media.json:2` (file-level `_doc`) | The New You infomercial echoes real apparatus: 1998 "Truth in Love" and Robert Tilton's "Success-N-Life" — documented in `docs/ERA2_EVANGELIST_COMMERCIAL_SCRIPT_2026-06-30.md`. | none — this is a `_doc` production note, not a dossier card; no `status` field exists for it. | URL/KB lookup — check the named doc actually cites both apparatus, then confirm those two real programs against a primary source (broadcast archive, press coverage) before treating the echo as grounded. |
| `data/provotypes/_dummy.json:56,62,68` | Three placeholder lines ("Placeholder documentary/contested/speculative source") — schema-demonstration scaffolding, not narrative content. | documentary/contested/speculative (all literally placeholder text) | None — judgment call only: confirm this file is scaffolding never shipped to the player, so it doesn't belong in a source-verification pass at all. |
| `data/strings/_close_network.schema.json:41` | Not a claim — a schema *description* explaining that a Close-constellation node must not render bright while its source text still carries `[VERIFY SOURCE]`. | n/a (mechanism, not content) | None — flagged only so it isn't mistaken for a 9th real source; the schema itself is PROPOSED/unmigrated per [[close-constellation-as-knowledge-graph]] and has no live nodes yet. |

### D.3 Update triggers (`data/strings/updates.json`) — claims with NO tag anywhere in `data/`

The data file itself (`u2`/`u3`/`u4`) is pure narrative copy — no `[VERIFY SOURCE]` tag
and no `status` field exists on any trigger, unlike the provotype dossiers. The real-world
grounding for each trigger is asserted only in this checklist's own **D5** entry above, not
in `data/`. Listed here because the task brief named them explicitly as in-scope.

| Trigger | Claim (per D5, not in data/) | Dossier status | What verifying it takes |
|---|---|---|---|
| u2 (1997→2003) | "The ~2000 public collapses of ex-gay figureheads" as the documentary grounding candidate for the diary-glitch trigger. | none — untagged in data/, and D5 itself marks it `[VERIFY SOURCE]` | KB lookup — identify which specific figurehead collapse(s) c. 2000 the KB already documents (if any) before this can ground u2; currently a candidate, not a confirmed source. |
| u3 (2003→2016) | Exodus International's 2013 shutdown + public apology grounds "the accountability network is no longer able to vouch for itself." | none — untagged in data/; D5 marks it `[VERIFY SOURCE — likely already in KB]` | KB lookup only — D5's own note says this is probably already sourced elsewhere in the KB; confirm and, if so, this row closes fast. |
| u4 (2016→now) | Malta 2016 (Act LV of 2016, first European nationwide ban) grounds the u4 install; D5 claims this is "cleared in shipped `s3.json` `_sourceDoc`." | none in this file — D5 asserts it was already CONFIRMED in the **shipped build's** `s3.json`, which does not exist in this reinterp worktree (`data/dialog/s3_queue.json` here is the unrelated E3 GraceQueue file). | Judgment call — the shipped-build file this claim depends on isn't present to re-check from inside `data/`; either pull it from the shipped repo/branch to confirm, or treat Act LV of 2016 as needing a fresh URL check here. |
| u4 (2016→now) | App-store removals of conversion-therapy apps c. 2019, proposed as a candidate addition to u4's grounding. | none — untagged; D5 marks it `[VERIFY SOURCE]` | URL check — Apple/Google both pulled specific named apps in 2018–2019 press coverage; confirm dates and which apps before citing "c. 2019" as fact. |

### D.4 Adjacent note (not a new claim — a stale cross-reference caught in this sweep)

This checklist's own **D24** (2026-07-12) says "Tape B's ad captions carry `[VERIFY SOURCE]`
per line (period-shifted from … `s2_media.json`)." That was true of the file **at the time**.
`data/dialog/s1_tapes.json`'s Tape B segments were replaced in **D36** (Session 32) with your
delivered "Discover The New You" song lyrics — the current file has **zero** `[VERIFY SOURCE]`
tags on Tape B, because it's now invented/original jingle lyrics rather than a documentary
ad-copy claim. Not a gap to verify — a judgment call to confirm: are you fine with Tape B now
reading as pure invented content (no real-world claim to source), superseding D24's framing?

---

# ✅ DECIDED — 2026-08-17, all four answered and applied
*Kept rather than deleted: the reasoning is the record of why the piece is the way it is.*

| | His answer | Applied as |
|---|---|---|
| **D-A** duck licence | **CC0, CreativeTrio** (poly.pizza/m/oH3dEdlDpB) | No row in `ATTRIBUTIONS.md` — CC0 owes no credit and padding a CC-BY table hides the obligations. Recorded in `assets/LICENSES.md` |
| **D-B** the s2 send | **"keep the 38s for now"** | `app.ts` `dollySeconds: 2.4 → 38`. ⚑ Derived, not chosen: the distance that gave 6.874 m/s over 2.4 s gives ≈0.43 m/s over ~38 s. **s3/s4 stay decline-only until the audit proves all three legs inside the envelope** |
| **D-C** Maya's deadname | **"its just MAYA no Daniela"** | `personFormerName` in `s4_l.json`, resolved by a new `{formerName}` token. **Maya's record no longer speaks Daniel's name.** ⚑ The name itself is a PLACEHOLDER-draft and the reader gate is untouched |
| **D-D** the programme | **New Morning** | `s1_end.json:47`. Now agrees with Caleb, the intake form, and the file's own `_doc` |

---

# ⚑ THE ORIGINAL DECISION BLOCK — 2026-08-17 (answered above, kept for the reasoning)
*Added because he asked "where are these?" and the honest answer was: scattered across three register
sections and one attributions row, in a file last updated 27 July. **This block is now the one place
to look.** Each says what the question is, what the evidence is, what happens either way, and my
recommendation. ⚑ None of them blocks other work — they are all genuinely his.*

## D-A · The rubber duck's licence — **the only one that touches something already shipping**
**Where:** `docs/reinterp/ATTRIBUTIONS.md`, the row marked `⚑ "Rubber Duck" | SOURCE UNCONFIRMED`.
**The question:** `rubberDuck.glb` came from `~/Pc_Simulation/Assests/`, whose neighbours include
"Casette Player" — already credited here as Jason Toff via Poly Pizza. So it is **probably** a Poly
Pizza model under CC-BY or CC0. **Probably is not a credit.**
**Either way:** CC-BY → one row beside the monkey and racket. CC0 → no row here, an entry in
`assets/LICENSES.md`.
⚑ **Why it is first:** the duck is **in the build and deploying right now**. An invented attribution
is worse than a missing one because it credits the wrong person, so it is flagged rather than guessed.
**Recommendation:** find where you downloaded it; it is a one-line fix either way.

## D-B · The s2 send — lengthen the dolly, or make it a blink cut
**Where:** `08_STATUS_REGISTER.md` §17.
**The question:** accepting the s2 send flies the camera at **6.874 m/s against a 0.43 m/s comfort
envelope — sixteen times over** — and it sits on E2's *ordinary* path, not a side branch.
**Either way:** lengthen the dolly to ~38 s, **or** make it the blink cut R28 §1 prescribes for
cross-room travel.
⚑ **What is already true:** S87 made s3/s4 draw **decline-only**, withholding the "go" affordance
until you rule, because they share the same machinery. **So this decision unblocks two more sends,
not just one.** On a tablet the motion is merely unpleasant; in a headset it is what the comfort law
exists to prevent — and A11 has never run.
**Recommendation:** the blink cut. R28 already prescribes it for cross-room travel, and a 38-second
dolly is a long time to spend on a beat that is not about the journey.

## D-C · ⚑ Maya's deadname field — the one with a deadline attached
**Where:** `08_STATUS_REGISTER.md` §22.
**The question:** Era 4's deadname beat renders **"Daniel"**, because `s4_l.json:124`'s `{name}`
resolves from `ledger.name`, which `os.ts:286` sets from `opening.o3_prefilled_name` = `"Daniel"`.
That is **deliberate** — the beat's own doc says the record holds "the name IT ASSIGNED thirty years
ago". **But that reading requires Maya and Daniel to be one person**, and the build plan says Room 1
= Daniel, Room 2 = Vera, Room 3 = Maya, while the orienting card promises the player *"different
lives."* Vera's and Maya's own names are both hardcoded; only the deadname reaches for Daniel's field.
**Either way:** one life or three. That is a narrative decision, not a bug fix.
> ⚑ **THE DEADLINE:** the beat is `BLOCKED-ON-READER-PASS` (§14) and that pass has not happened.
> **If the trans reader reviews this wording while it sits on an unexamined identity conflation, they
> are reviewing the wrong question — and you likely need a second pass.** Reader passes are scarce.
**Recommendation:** **separate the plumbing now, decide the narrative later.** Giving Maya's former
name its own field costs almost nothing, needs no reader, and does not pre-empt your answer.

## D-D · "The Turning" or "New Morning" — the residential programme's name
**Where:** `08_STATUS_REGISTER.md` §23. The data: `data/dialog/s1_end.json:47`.
**The question:** the packet says **"The Turning"**. Caleb says **"New Morning"** in the `felt` scene
(`s2_caleb.json:86`), the intake form says New Morning, and ⚑ **`s1_end.json`'s own `_doc` says New
Morning** — the file's documentation contradicts its own display text.
**Either way:** change the packet, or change the other three.
⚑ **Why it is not cosmetic:** it is the name of the place where Daniel and Caleb met and were
separated — *"i keep thinking about New Morning. the last night. you know the one."* A player meets
one name once and the other twice, with nothing linking them.
**Recommendation:** **make the packet say New Morning.** Three files and a `_doc` already agree; the
packet is the outlier and reads like a stray edit rather than a rename. One command either way.

---
### Also open, but NOT decisions — work, waiting on budget
The teddy bear still has no model and is not in your asset folder (needs sourcing) · S81's visibility
audit is mostly unrun · **141 draw calls at Maya's turned E4 seat against a ≤75 budget** — diagnosed
as unbatched GLB furniture across three simultaneously-open rooms, architectural, unfixed · the
Vision-Pro headset restyle, scoped as a follow-up rather than half-built · **A11, the in-headset pass,
has never run in this project's history.**

