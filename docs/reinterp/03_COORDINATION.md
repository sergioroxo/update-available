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

## DISPATCH BOARD (2026-07-03 · Round 16 — browser IS the 3D room; greybox GO; paste prompts in the round response)
| Lane | Who | Task | Status |
|---|---|---|---|
| A | Sonnet 5 | **R4 revision chore** — layout errors, trim text, remove player-facing source-origin display, fix leftover "brochure" string | READY — paste list |
| B | Opus 4.8 | **Fluid-niche greybox** per the approved (and de-gated) geometry doc | READY — paste list |
| B | Opus 4.8 | **Session OP-1 (revised)** — opening beats O1–O3 in the 3D room per spec §0-REV (browser = 3D room law; auto-cam option; platform select) — moved from Sonnet to Opus (it's camera/engine work now) | READY — paste list |
| C | Fable 5 (next round) | **Assistant-as-guide spec** + **where the documentary record surfaces player-facing** (R16-4's routed question — the provotype close no longer renders provenance; the Dossier surface is the candidate home) + logo v2 from Sérgio's notes | due next round |
| A | Sonnet 5 | R5 femininity homework · moodboard pass · Creed/Lenny + `_schema.json` chores | READY — paste list on request |
| D | Deep Research | *(creative/documentary questions only — nothing queued)* | idle |

**Done:** Session 0 (`8a04d7a`) · R0 flag (`90947c9`) · R1 framework (`fc3686f`) · R2 pillow (`fcaca92`) ·
Lamby rig (`d66ac3e`) · pillow embodiment fixes (`607a542`) · **R4 Origin Story Intake (Sonnet `6d4ffa4`)** ·
geometry doc (approved R16, de-gated) · Opening & Flow spec (+ §0-REV) · logo draft v1
(`REINTERP_LOGO_SPEC_2026-07-03.md`).

## DECISION QUEUE (for Sérgio)
1. **React to the logo draft v1** (`REINTERP_LOGO_SPEC_2026-07-03.md`) — its four v2 questions: orange
   temperature; tip-fracture vs full crack; stacked vs horizontal lockup; typeface direction.
2. Run the three paste prompts (R4 revision → Sonnet; greybox + OP-1 → Opus) in any order — they're
   file-fenced against each other.

## Standing rules (carried from the plan, so no prompt has to restate them)
Shipped build never touched · everything behind `?reinterp=1` · all copy PLACEHOLDER until Sérgio ·
gates G1–G12 bind regardless of lane · one session, one scope · blocked ≠ improvise: STOP and log.
