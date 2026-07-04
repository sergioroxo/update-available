# COORDINATION SYSTEM — roles, protocol, and the live dispatch board

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

## DOC MAP (updated Round 14)
Master plan is now v1 body + Rounds 12–14 only; Rounds 1–11 live in
[`REINTERP_MASTER_PLAN_ARCHIVE_ROUNDS_1-11_2026-07-02.md`](../REINTERP_MASTER_PLAN_ARCHIVE_ROUNDS_1-11_2026-07-02.md)
(reference only). **New: [`05_HOW_TO_RUN_A_SESSION.md`](05_HOW_TO_RUN_A_SESSION.md)** — plain-language
"how do I actually start a session with X model" guide, with paste-ready filled prompts for this round's
ready dispatch items. Also new: the focused consult-mechanics prompt
[`CHATGPT_DEEPRESEARCH_CONSULT_ENGAGEMENT_MECHANICS_2026-07-03.md`](../CHATGPT_DEEPRESEARCH_CONSULT_ENGAGEMENT_MECHANICS_2026-07-03.md).
Prior-round docs: era vision
[`REINTERP_TRANS_REALITY_ERA_VISION_2026-07-03.md`](../REINTERP_TRANS_REALITY_ERA_VISION_2026-07-03.md),
pillow diagnosis
[`REINTERP_PROVOTYPE_EMBODIMENT_ANALYSIS_2026-07-03.md`](../REINTERP_PROVOTYPE_EMBODIMENT_ANALYSIS_2026-07-03.md).

## DISPATCH BOARD (2026-07-04 · Round 17 — the 3D style push)
| Lane | Who | Task | Status |
|---|---|---|---|
| B | Opus 4.8 | **V1 — E1 room style pass** per `REINTERP_3D_STYLE_DIRECTION_2026-07-04.md` §2-E1 (two-temperature rig, soft-vs-crisp material split, hero/set/fog, niche as cold sliver) | READY — paste list in the round response |
| A | Sonnet 5 | **R4 revision chore** (layout, trim, remove player-facing provenance, "brochure" string) — from Round 16, still pending | READY — paste list in Round-16 response, unchanged |
| C | Fable 5 (next round) | **Assistant-as-guide spec** · documentary-record surfacing answer · O3 chip/goal/icon set proposal (with the voice pass) · logo v3 from Sérgio's v2 reaction | due |
| A | Sonnet 5 | V2 prop dressing (after Sérgio reacts to V1) · R5 · Creed/Lenny + `_schema.json` chores | queued |
| D | Deep Research | *(nothing queued)* | idle |

**Done:** Sessions 0–6 — flag (`90947c9`) · framework (`fc3686f`) · pillow (`fcaca92`) + embodiment fixes
(`607a542`) · Lamby rig (`d66ac3e`) · R4 intake (`6d4ffa4`) · **OP-1 opening O1–O3 (Opus `aa39aa7`)** ·
**fluid-niche greybox (Opus `1c464ce`)** · geometry doc · Opening & Flow spec · 3D style direction
(`REINTERP_3D_STYLE_DIRECTION_2026-07-04.md`) · logo v2 lamp concept.

## DECISION QUEUE (for Sérgio)
1. **React to the 3D style direction's governing idea** (§1: two lights fight for one room; the room
   gradually inherits the interface) — it steers every visual pass from here.
2. **React to logo v2 (the lamp)** — concept yes/no before any refinement.
3. E1 warmth reference images, if any (words are enough).

## Standing rules (carried from the plan, so no prompt has to restate them)
Shipped build never touched · everything behind `?reinterp=1` · all copy PLACEHOLDER until Sérgio ·
gates G1–G12 bind regardless of lane · one session, one scope · blocked ≠ improvise: STOP and log.
