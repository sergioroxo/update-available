# COORDINATION SYSTEM — roles, protocol, and the live dispatch board
STATUS: live

*Established 2026-07-02 (master plan Round 10). Fable 5 is project coordinator/PM: it maintains this
board, writes every prompt, reconciles every result, and asks Sérgio the decisions. Sérgio runs the
prompts and owns all voice/ethics/greenlight calls. This file is updated by Fable every round — check
the DISPATCH BOARD for what to run next.*

## The team (restructured Round 15 — Fable designs, Opus/Sonnet build)
| Model | Role | Gets | Never does |
|---|---|---|---|
| **Fable 5** | **Designer + creative director + PM.** ALL design/geometry/flow/spec docs are authored by Fable directly (Round 15 — no longer dispatched to Opus); maintains the plan, queues, memory; writes every build prompt; reconciles results; surfaces decisions. Every round response ends with a READY-TO-PASTE prompt list | Sérgio's round reports | build code · web research · finalize copy · ethics calls |
| **Opus 4.8** | **Hard code** — architecture, spatial systems, engine work, complex builds — from Fable's specs | a filled session prompt naming its spec | design authoring · copy finalization · running past scope |
| **Sonnet 5** | **Code + content, the volume lane** — well-specified builds, data sessions, chores, verification | a filled paste-ready prompt | architecture-shaping · ambiguity resolution (STOP + log BLOCKED) |
| **Codex 5.5** | Prototyper / parallel builder — standalone experiments with explicit file fences | a self-contained task prompt | files another session owns · integration without a spec |
| **ChatGPT Deep Research** | Historian/sourcer — **creative/documentary content questions ONLY** (Round 15: no process/logistics/meta research — ever); one focused question per prompt | a single-focus `CHATGPT_DEEPRESEARCH_*.md` prompt doc | multi-part bundles · process/ethics-logistics topics |
| **Sérgio** | Author of record — voice passes, ethics judgment, playtests, greenlights, assets; runs each lane in its own chat window | the ROUND REPORT + the paste list | (everything is ultimately his) |

**How sessions actually run (added Round 14 — see `05_HOW_TO_RUN_A_SESSION.md` for the full plain-language
version):** there is no automatic model-to-model calling in this system. Each lane above is a SEPARATE chat
window Sérgio opens himself, with the model set to whatever the dispatch board names, in the right folder
(worktree for any build lane, original folder for Fable). He pastes the prompt Fable wrote, lets that
session run to completion on its own, then brings the result back to Fable in the next round. Fable is the
hub; nothing here orchestrates itself.

## The round protocol (each exchange with Fable)
**Sérgio sends:** (a) results/paths of any runs since last round, (b) answers to the DECISION QUEUE,
(c) new ideas/notes — raw is fine. **Fable returns:** (a) reconciliation (master plan round + memory
updated, conflicts named plainly), (b) the refreshed DISPATCH BOARD with paste-ready prompts, (c) the
DECISION QUEUE, (d) any new research prompt docs. State lives in files, not in anyone's memory:
master plan (decisions) · worktree `01_SESSION_LOG` (build state) · this file (dispatch) · Fable's
persistent memory (cross-session continuity).

## DOC MAP (updated 2026-09-02)
**Read order:** `CLAUDE.md` → `docs/ETHICS_CONSTRAINTS.md` →
[`REINTERP_MASTER_PLAN_v2_2026-07-12.md`](../REINTERP_MASTER_PLAN_v2_2026-07-12.md) (PLAN OF RECORD) →
the tail of [`01_SESSION_LOG.md`](01_SESSION_LOG.md). Every other doc's lifecycle status lives in
[`08_STATUS_REGISTER.md`](08_STATUS_REGISTER.md) — the R29 register; the live state is [`00_WHERE_THINGS_STAND.md`](00_WHERE_THINGS_STAND.md); the latest review is [`REVIEW_R1_2026-09-02.md`](REVIEW_R1_2026-09-02.md) (docs / code / data /
sources, four separate axes) — until the S41 STATUS-header pass makes the headers themselves the truth.
*This board sat frozen at Round 17 (2026-07-04) for nineteen days while the project reached R29 — that
drift is the subject of R29 and the reason the register + checker now exist.*

## DISPATCH BOARD (2026-09-02 · REVIEW ROUND 1 — the fix round that follows it)
*Source: [`REVIEW_R1_2026-09-02.md`](REVIEW_R1_2026-09-02.md) §3 carries the paste-ready prompts; this
table is the order. One session at a time in the worktree (two share one git index).*
| # | Who | Task | Status |
|---|---|---|---|
| S103 | Sonnet 5 | **the walker's three blind spots** (laptop canvas in the screen hash; DOM/audio as activity; `--jump update3`) — so A-1 can be judged by a tool that can see | READY — run first |
| S104 | Opus 4.8 | **Era 4's door**: Era 2's `icon-send` rect still live on the visor in Era 4 and the pause button sitting over the headset (A-1, resolved — the piece's door works, the walker opened the menu on itself), **the hand-back after the ball is unreachable on desktop (A-8)**, the Close's Restart button gets a hit rect (A-2), ready = glow not a black slab (A-4) | READY after S103 |
| S105 | Sonnet 5 | **dirty-only uploads** in `os.ts`/`intake.ts` (B-1: 240 uploads/s flat) | READY — parallel-safe by file, not by worktree |
| S106 | Sonnet 5 | **the record ages** (`intake.ts:266` literal "era 1"; clip the panel) | READY |
| S107 | Sonnet 5 | **audit hygiene**: `SEAT_SUBJECTS.r3` → `e_laptop`; add `r3-turned`; record 197 and the clean envelope | READY — 20 min |
| S108 | Opus 4.8 | **the batch at the turn**: 197 / 84 / 81 vs 75, §32's Phase-2 rebake; ratchet never raised | READY after S104 |
| S109 | Sonnet 5 | **sound plumbing** (`setBed`, the ball's bed/landing, relocation crossfades, check-spec's names-only rule) — needs no assets | READY |
| D | Sérgio | **Lane D's commissions** ([`REVIEW_R1_2026-09-02_LANE_D_SOUND.md`](REVIEW_R1_2026-09-02_LANE_D_SOUND.md)): D-1 boot jingle (cut from Chase The Clouds), D-2 broken jingle (ffmpeg), D-4 room tone ×4 (Freesound CC0), D-5 machines, D-6 rituals, D-7 passages | paste-ready |

**Done through this round:** Sessions 0–102 (the whole spine built, E4 voiced, the Close built) ·
**Review round 1** (2026-09-02): the click-only walk to Era 4 (135 presses), the audit, four lanes, the
first instrumented sit-through with audio and captions measured.

## DECISION QUEUE (for Sérgio — fewest, ordered by what they unblock)
1. **The ball's room — music heard, not played?** (Lane D §5). REC: a found through-the-wall recording now,
   a commissioned producer later, never Suno for this scene. Unblocks S109's assets and the Close's one sound.
2. **Room 3's seat now that the desk holds a laptop** (REVIEW §4-3). REC: re-measure from the seat; your S96
   ruling was about the CRT.
3. **Sound on the four rituals, silence on the Close** (Lane D D-6). REC: as written.
4. **Lamby's voice** (Lane D D-8), 2003-treated Supertonic, apparatus register. REC: yes.
5. **The record's Era-4 card wording** (S106) — the stamp is yours; the misfile line stays *under the old file*.
6. **S104 before S108.** REC: the door before the frame rate.
*(Unchanged and still yours: the four Close panels' wording; panel 4's `status: contested`.)*

## Standing rules (carried from the plan, so no prompt has to restate them)
Shipped build never touched · everything behind `?reinterp=1` · all copy PLACEHOLDER until Sérgio ·
gates G1–G12 bind regardless of lane · one session, one scope · blocked ≠ improvise: STOP and log.
