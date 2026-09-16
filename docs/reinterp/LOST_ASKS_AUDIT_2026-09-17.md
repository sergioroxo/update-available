STATUS: live

# LOST ASKS AUDIT — 2026-09-17
*Cross-reads `docs/reinterp/SERGIO_SAID_ALL_SESSIONS.md` (all 672 messages) against
`OPEN_ITEMS.md`, `REVIEW_ROUND_3_2026-09-17.md`, `REVIEW_R1_2026-09-02.md`,
`WALKTHROUGH_2026-08-21.md`, `06_SERGIO_CHECKLIST.md`, `07_WAITING_ON_SERGIO.md`,
`00_WHERE_THINGS_STAND.md`, `SCRIPT_VS_BUILD_2026-08-21.md`, `BUILD_LOG.md`, and the
live `src/`/`data/` tree. Method note at the end explains exactly how much of the
672 was read verbatim vs. sampled, and why.*

## Summary
- **~35–40 distinct concrete asks/rulings** were extracted and checked (many more raw
  messages repeat the same ask across sessions — those are counted once).
- **Most are tracked or built.** The OPEN_ITEMS.md register created 2026-09-17 and the
  three review docs it draws on cover the overwhelming majority of what he asked for
  in the last month, and the reinterp's own `00_WHERE_THINGS_STAND.md` (2026-08-21)
  had already independently found several of the gaps below.
- **7 items below are genuinely LOST or LOST-PARTIAL** — never built, and absent from
  OPEN_ITEMS.md even though at least one is self-documented elsewhere in the repo.
  **1 additional item (idle wipe) is flagged outside the strict table** because it is
  a violated project invariant rather than a quoted session ask.
- **9 RULINGS** were checked for consistency; 8 are respected, **1 is contradicted**
  by the current code (the trans-masc send gate — same root cause as L-03 below).
- **0 confirmed CLAIMED-NOT-FOUND** cases survive to today — the one candidate (the
  idle-wipe claim in an earlier `00_WHERE_THINGS_STAND.md`) was already self-corrected
  in that same file on 2026-08-21, before this audit started.

---

## LOST and LOST-PARTIAL items

| id | date | his words | what it asks | evidence checked | priority bucket |
|---|---|---|---|---|---|
| L-01 | 2026-07-02 13:18 | "when you do that the queer elements that still existed on the room turn gray" | the identity-erasure "graying" mechanic: the guide sends you to find apparatus objects in the room; each find grays a queer prop, refusal-symmetric | `data/paths.json:16` still reads `"id": "e1.b06_graying", "built": false`; zero "gray"/"graying" code anywhere in `src/`; not in OPEN_ITEMS.md; independently confirmed still-missing in `00_WHERE_THINGS_STAND.md:46` ("zero code") | 2 (Era 1 conducted) |
| L-02 | 2026-07-02 15:12 / 07-03 12:02 | "Both version will be presented, this is a research aspect for the article that I am writing around this project." | a real FESTIVAL-cut vs. FULL-cut selection, driven by data, so both cuts exist and compose from one source | `data/paths.json` is dead metadata — `spine.ts:4` only references it in a header comment, never imports it; one hardcoded sequence in `spine.ts:46–51`; no cut-selection surface anywhere; not in OPEN_ITEMS.md | 7 (frame) |
| L-03 | 2026-07-03 14:22 | "Yes the three on ERA-3, with a connection Lesbian/Transmasculine dillema" | Era 3 should route to a trans-masculine "borderland" beat — locked as a design decision 2026-07-05 (Round-20: "trans-masc device = routing-form spine + one E3 inspection point") | `src/desktop/os.ts:1210`: `const allowVisit = this.sendOffer.id !== 's3' && this.sendOffer.id !== 's4';` — both sends are still hard-gated off; the dormant-file reopening and the trans-masc dilemma beat are authored (`sends.json:95–141`) but unreachable; not in OPEN_ITEMS.md; independently confirmed in `00_WHERE_THINGS_STAND.md:40–42,52` ("the trans-masc thread is thinned") | 5 (Era 3's devices) |
| L-04 | 2026-07-24 15:05 & 15:27; reaffirmed 2026-09-02 08:21 | "a Full on 5th cluster just explaning the full on way this was a created with a AI-Human loop creation system" / (Sept 2) "I would still want to keep the idea of the Stars in the cealing becoming the network of the data used to create this project with the 4 panels with the information" | the Close's constellation should include an in-world, educational "makers" cluster/panels disclosing the project's own AI-human production process (tied explicitly to his Digital Creativity/IDN special-issue disclosure motivation) | `BUILD_LOG.md` S143 (2026-09-14): "MAKERS: a paragraph in the Credits view, generated from ATTRIBUTIONS.md, and one line on the Restart card" — a non-diegetic credits blurb, not the in-world 4-panel explainer he described twice, a month and a half apart; `ERA4_DRAFTS_2026-09-12.md`'s four Close panels are about the four SOGICE eras, not about the project's own making; no R3/W id covers a "makers"/production-network panel | 8 (the Close) |
| L-05 | 2026-07-24 16:19 | "we can even use the TTS to read out-loud (this is something of an acessibilty element important to be applied on the project, please register)" | build-time TTS read-aloud as a **standing accessibility principle for long in-world text**, not a one-off | Built for specific instances only: PureMail (S60), Lamby/L's voice lines. No general read-aloud button/registry entry exists for Era 1's kit/diary/tape text or Era 3's testimony text; not tracked as a distinct open item (W-G2 in OPEN_ITEMS covers visual captions, not audio read-aloud) | 3 (sound) |
| L-06 | 2026-08-21 (`00_WHERE_THINGS_STAND.md`, no direct session quote — Claude's own audit, corroborating his named complaint at WALKTHROUGH §H: "the reboot sequence is missing glitching effects") | — | the E1→E2 update's full-frame system glitch and the pre-update "error-999" cascade | `os.onGlitch('system')` has no caller anywhere in `src/` (only `'person'` fires, `os.ts:412,2245`); the authored ritual block (`s1_end.json:82–104`: error/errorRetry/errorCancel/loading) is read by no file; not in OPEN_ITEMS.md | 2 (Era 1 conducted) / 4 (flight) |
| L-07 | 2026-07-02/07-24 (Close design threads), no single session quote naming this exact beat | — | the Close's "version history" receipt (every era's update stacked, each stamped FAILED) and "the one uninstalled update" ending beat ("for the world, not for you… Status: not yet installed") | Still canon in `MASTER_PLAN_v2` per `00_WHERE_THINGS_STAND.md:43-44`; retired by no document; the built Close instead has a Restart card ("Restart as you are… Go back to a room, or start the machine again") — a plausible but different substitute nobody formally chose over the original beat; not in OPEN_ITEMS.md | 8 (the Close) |
| L-08 (UNSURE) | 2026-09-05 09:35 | "maybe we can even make it into an element of choice, as a symbol of the trying to erausre the person, or maybe even of hope, that they got out of the cycle of capture" | rooms you've left should visibly go "bare" vs. stay "full" depending on whether you were there, as either an erasure or a hope symbol | Session immediately after (09-05 09:47) shows the draw-call diet attempt failed to change the turn's cost at all ("Striking those 19 props moved the E3 turn from 146 → 146… Nothing") and no design decision is recorded afterward either way; not in OPEN_ITEMS.md. Genuinely unclear whether this was dropped or just deferred — flagged UNSURE rather than dropped | 8 (the Close) / general |

*Additional flagged risk, outside the quote-required table above (not a session ask —
a violated project invariant):* **no idle-timer / attract-state code exists anywhere
in `src/`** (confirmed live: only `beforeunload` and the Leave button wipe the
ledger). CLAUDE.md's hard invariant says the ledger is "wiped on exit/idle/refusal."
`00_WHERE_THINGS_STAND.md:58-66` already caught and corrected its own earlier false
claim that this was done — but that correction was never carried into `OPEN_ITEMS.md`,
so under the project's own "one register" law this gap is currently invisible. Given
the piece is meant to run unattended on exhibition hardware, this is worth a line in
OPEN_ITEMS regardless of table format.

---

## RULINGS — design laws he stated, and whether the current register respects them

| ruling | date, his words | respected? |
|---|---|---|
| Maya is not Daniel | 2026-09-05 09:19: "The whole narrative of Daniel and Maya was not working, so it needs to be cleared out" | Yes — tracked as R3-95, Priority 1, OPEN |
| The trans-reader gate is retired | 2026-08-20 20:20: "I dont get what fixcation you have with the Trans Reader, its not going to happen. We need to fix that now!" | Yes — CLAUDE.md updated 2026-08-17/amended; OPEN_ITEMS carries no reader-pass gate |
| Claude writes the display text, Sérgio reviews | 2026-08-20 20:20: "I am not going to write it is your work here" | Yes — CLAUDE.md's 2026-08-17 amendment quotes this near-verbatim |
| No deadname, ever | 2026-08-20 20:20: "NO FORMER NAME GOSH" | Yes — the record misfiles Maya "under the old file," never a name |
| `?flat=1` is a review tool, not the fallback | 2026-08-08 11:11: "The Flat is not a fallback. The Browser version is the fall back in case the VR version is not possible." | Yes — CLAUDE.md now states this almost word for word |
| No locomotion, only the turn + system-sent jumps | 2026-08-02 09:12: "I dont want that locomotion, but aritificial one, of being driven to a new space" | Yes — R28 amendments; ERA4_OVERHAUL explicitly restates "no WASD ever" |
| Trans-masc gets a real E3 connection (Round-20, locked 2026-07-05) | 2026-07-03 14:22: "Yes the three on ERA-3, with a connection Lesbian/Transmasculine dillema" | **No — contradicted.** `os.ts:1210` still hard-gates both trans-masc-adjacent sends off. Same finding as L-03 |
| Detransition/detrans people are never the target | 2026-08-02 22:38: "detrans are not the target, never, just the apparatus and the AI usage" | Yes — matches CLAUDE.md's "detransition is legitimate and never vilified" |
| CC-BY/mixed-license assets are fine if credited at the end | 2026-08-15 20:18: "we've settled the question of the CC-BY; we are going to have credits at the end" | Yes — `assets/LICENSES.md` / `ATTRIBUTIONS.md` exist and are wired into the Credits view |

---

## CLAIMED, NOT FOUND
No item currently in a **live** tracked document claims something built that isn't
there. The one candidate — an earlier version of `00_WHERE_THINGS_STAND.md` stating
"The ledger already wipes on idle — that part is done" — was self-caught and corrected
in the same file's 2026-08-21 rewrite (see its own §"A CORRECTION TO THIS FILE"), before
this audit began. It is listed above as a flagged risk because the underlying gap is
still real, even though the false claim itself no longer stands anywhere live.

---

## What was already found and is NOT lost (checked, so as not to double-report)
- The Lamby 1997 mini-game reference (`Pc_Simulation/Lamby Games/Mini-Games_LAmby.md`)
  and the Windows-era reference screenshots (`Pc_Simulation/References images/`,
  16 files incl. Win95/98/XP/7/10/11 desktops, the Internet Setup Wizard, Make New
  Connection) were found unreferenced in the repo as of this session's start — **but
  a concurrent session added `W-L1` and updated `R3-15`/`R3-24` in `OPEN_ITEMS.md`
  while this audit was running**, citing exactly those files. Confirmed current, not
  re-reported as lost.
- `Chase_The_Clouds.mp3` (the Lamby jingle he supplied 2026-07-10) — registered and
  wired (`tapeAudio.ts`, `s2_lamby.json`), not orphaned.
- The Close constellation's "fake topology" complaint (2026-07-22/24) — the apparatus
  tier was rebuilt as a real, sourced graph in S92 (2026-08-20); only the **makers**
  half of his ask (L-04) remains outstanding.
- Bussee/Cooper research for the Caleb thread, the "Maiden-to-be" ex-lesbian group
  chat and Bea's phone thread for Era 3, the mandatory AI-photo "restoration" exercise,
  the ball's room audio, and the map/helper Witness-system work he asked for on
  2026-09-15/16 — all found built (`REINTERP_LOVE_AS_LIBERATION_SOURCES`, `s3_maiden.json`,
  `browser.ts`'s "THE RESTORATION EXERCISE," `ball_room_bed/landing.mp3`, S145/S146).

## Method — how the 672 messages were actually read
- **Messages 1–144** (2026-07-02 through 2026-07-24, line 1–3936 of
  `SERGIO_SAID_ALL_SESSIONS.md`): read in full, in chronological order, including the
  long pasted build-session transcripts, to establish which early architecture (the
  four-room/radial-cluster/fluid-niche design) was later superseded by R24's three-
  fixed-rooms model — this matters because a large share of July's asks are asks
  *about an architecture that no longer exists* and are correctly not "lost," just
  obsolete.
- **The remaining 528 messages**: every message of **50 lines or fewer (477 of
  them)** was read in full — per the task's own guidance, his actual asks are the
  short, direct messages, and a line-length census of the whole file confirms this:
  the 51 messages over 50 lines are, without exception on inspection of their first
  six lines each, either dispatch-style build prompts (a Fable/Claude-authored
  template pasted by him to the next session) or an agent's own session narration
  that he relayed back — never a case where a substantive ask of his opened a long
  message and was missed by this filter.
- Every candidate finding was then checked against `OPEN_ITEMS.md`, the three review
  docs, `BUILD_LOG.md` (grepped, not just trusted), and — where the claim was about
  code — the live `src/`/`data/` tree directly (not a doc's claim about the tree).
- **Total messages read or directly inspected: 672 of 672.**
