# COORDINATION SYSTEM — roles, protocol, and the live dispatch board

*Established 2026-07-02 (master plan Round 10). Fable 5 is project coordinator/PM: it maintains this
board, writes every prompt, reconciles every result, and asks Sérgio the decisions. Sérgio runs the
prompts and owns all voice/ethics/greenlight calls. This file is updated by Fable every round — check
the DISPATCH BOARD for what to run next.*

## The team (who does what — never swap lanes)
| Model | Role | Gets | Never does |
|---|---|---|---|
| **Fable 5** | Creative director / PM / dramaturg. Maintains the master plan, the queues, memory; writes all specs + prompts; reconciles results; arbitrates conflicts; surfaces decisions | Sérgio's round reports (run results + decisions + new ideas) | build code · web research · finalize copy · ethics calls |
| **Opus 4.8** | Senior engineer — architecture sessions: new runtimes, OS plumbing, spatial systems, hard integration + deep verification | a filled session prompt naming its spec | creative redesigns · copy finalization · running past scope |
| **Sonnet 5** | Content engineer + verifier — data-driven sessions on existing frameworks; verification chores; small fixes (the cost-effective lane) | a filled `02_SONNET_SESSION_TEMPLATE` prompt | architecture-shaping · ambiguity resolution (STOP + log BLOCKED instead) |
| **Codex 5.5** | Prototyper / parallel builder — standalone experiments, scaffolds, parallel-safe lanes with their own mounts | a self-contained task prompt with explicit file fences | files another session owns · integration without a spec |
| **ChatGPT Deep Research** | Historian/sourcer — multi-source syntheses with status tags | a `CHATGPT_DEEPRESEARCH_*.md` prompt doc | (Sérgio runs; results come back as files) |
| **Sérgio** | Author of record — voice passes, ethics judgment, playtests, greenlights, audio/visual assets, running everything above | the ROUND REPORT format below | (everything is ultimately his) |

## The round protocol (each exchange with Fable)
**Sérgio sends:** (a) results/paths of any runs since last round, (b) answers to the DECISION QUEUE,
(c) new ideas/notes — raw is fine. **Fable returns:** (a) reconciliation (master plan round + memory
updated, conflicts named plainly), (b) the refreshed DISPATCH BOARD with paste-ready prompts, (c) the
DECISION QUEUE, (d) any new research prompt docs. State lives in files, not in anyone's memory:
master plan (decisions) · worktree `01_SESSION_LOG` (build state) · this file (dispatch) · Fable's
persistent memory (cross-session continuity).

## DISPATCH BOARD (2026-07-02 · Round 10)
| Lane | Model | Task | Prompt | Status |
|---|---|---|---|---|
| A | Sonnet 5 | **Session 3 (R2): the pillow** + per-choice tagging | delivered in chat (Round 8 reply); template: `02_SONNET_SESSION_TEMPLATE.md` | READY — Sérgio to run |
| B | Codex 5.5 | **Lamby rig prototype** (`?lambyrig=1`, procedural-vs-sprite verdict) | delivered in chat (Round 9 reply); spec: master plan §R9-4 | READY — Sérgio to run |
| C | Fable 5 | **OPENING & FLOW SPEC** (R9-1 sequence + per-beat browser/VR logistics + ceiling-panel refinement) → then the **assistant-as-guide spec** (now with Lamby-variant lineage) | next Fable round(s) — needs only the decision queue below | QUEUED |
| D | Deep Research | global-transphobia / LGB-to-T pass | HELD — gated on the G4 early ethics read | GATED |
| E | Sonnet 5 (chore) | verify Creed/Lenny app + exact marketing wording | `02_SONNET_SESSION_TEMPLATE.md` verification variant | READY — anytime |

## DECISION QUEUE (for Sérgio — answers unblock lane C and the gates)
1. **Profile creation details:** besides the icon — which get-to-know-you elements does the player pick
   (2–3 items)? And does any pick influence which room lights first, or does the system route everyone
   identically ("we know what this really is")? (Last open piece of R8-2.)
2. **Lamby-variant names:** lineage locked (Round 10). Want Fable to draft per-era name candidates in
   the guide spec (E1 proto-Lamby · E2 Lamby · E3 Lambient · E4 Echo-as-Lamby-descendant?) for you to
   pick from, as with TriedPath/Restorify?
3. **The in-headset playtest date** — still the single gate on ALL spatial work (cluster, ceiling panel,
   point-cloud VR). Even a rough target week helps sequencing.
4. **Ethics readers pipeline:** do you have candidate readers lined up for the gates that bind soonest —
   G6 (pillow: exposing-not-teaching + religious-trauma glance), then G1 (trans-masculine reader)? If
   not, sourcing them should start now; the pillow will be playable before the readers are.
5. **Is there a target festival/date for the Festival cut?** (Shapes prioritization honestly.)

## Standing rules (carried from the plan, so no prompt has to restate them)
Shipped build never touched · everything behind `?reinterp=1` · all copy PLACEHOLDER until Sérgio ·
gates G1–G12 bind regardless of lane · one session, one scope · blocked ≠ improvise: STOP and log.
