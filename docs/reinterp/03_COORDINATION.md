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

## DOC MAP (updated R29, 2026-07-23)
**Read order:** `CLAUDE.md` → `docs/ETHICS_CONSTRAINTS.md` →
[`REINTERP_MASTER_PLAN_v2_2026-07-12.md`](../REINTERP_MASTER_PLAN_v2_2026-07-12.md) (PLAN OF RECORD) →
the tail of [`01_SESSION_LOG.md`](01_SESSION_LOG.md). Every other doc's lifecycle status lives in
[`08_STATUS_REGISTER.md`](08_STATUS_REGISTER.md) — the R29 one-page register (docs / code / data /
sources, four separate axes) — until the S41 STATUS-header pass makes the headers themselves the truth.
*This board sat frozen at Round 17 (2026-07-04) for nineteen days while the project reached R29 — that
drift is the subject of R29 and the reason the register + checker now exist.*

## DISPATCH BOARD (2026-07-23 · R29 — the tracking round)
| Lane | Who | Task | Status |
|---|---|---|---|
| A | Sonnet 5 | **S40 — R28 §4 layer 3 + retire the startup-options panel** (the impersonal side-messages teach LOOK/INTERACT per D48's arbitration; the panel `intake.ts` still serves dies; the cork board's witness-lineage role and O3 profile survive) | READY — paste prompt in the R29 round response |
| A | Sonnet 5 | **S41 — the tracking build**: `STATUS:` headers on all 83 docs (from the register §1), check-spec **C5** (ratchet + supersession-target + `KILLS:` assertions), `tools/doc-status-report.mjs`; chore: `pointCloud.ts` label cap 28→32 | READY — after S40 or parallel (disjoint files) |
| B | Haiku/Sonnet | **S42 — generate checklist §D**: the piece-wide `[VERIFY SOURCE]` queue from `data/` (promised since Q3, never generated) | READY — cheap, parallel-safe |
| C | Fable (next round) | **C2 layout-X ending arm + Close entry spec** (v2 §9 item 7) · fold R29 queue changes into v2 §9 | due |
| — | Sonnet 5 | E2 back half: Caleb thread → collapse → residue → send (v2 §9 items 4–5) | GATED on Sérgio's S2R.3 read |
| D | Deep Research | *(nothing queued — TRANSMAN_CONSULT_SOURCING optional-run is Sérgio's call, see 07)* | idle |

**Done through R29:** Sessions 0–39 + the 2026-07-22 tooling pair — E1 complete and verified
end-to-end · E2 built through the infomercial+dispersal (S31–35, back half Caleb-gated) · opening
layers 1–2 (S36) · E3 three-screen foundation + GraceQueue strip + screen-format pass (S37–39) ·
E3 sends scripted · spec-law CI gate (`check-spec.mjs`, closed a false "CI-enforced" claim) ·
palette 157→51 · Close-graph schema+criteria (nothing migrated) · the R29 status register
(`08_STATUS_REGISTER.md`). Full record: the session log.

## DECISION QUEUE (for Sérgio — fewest, ordered by what they unblock)
1. **The Caleb read (E2 script S2R.3)** — still THE gate on Era 2's emotional core and now the
   longest-standing blocker in the queue (items 4–5 of the build queue wait on it). ~10 min.
2. **Schedule the source-verification pass before Oct 19?** All 8 dossier sources are unverified;
   S42 will surface the full piece-wide list. REC: one ~2h sitting once S42's queue lands — it
   un-gates the constellation's brightness idea and firms the u2/u3/u4 trigger groundings.
3. **`opening.ts` (the dead DOM overlay):** retire, or keep-with-header? REC: retire — its claimed
   VR future is already better served by the physicalized in-scene board; git history keeps the code.
4. **The Close's procedural links** — the final frame draws proximity-decoration while the captions
   claim provenance ("the network of knowledge the piece itself is built from"), in a piece whose rule
   is "cite only sources verified in the knowledge base." Either bless it as explicitly figurative
   (caption wording softens at your voice pass) or adopt the derived graph when the dossier grows
   dense enough to justify it (schema ready; today it derives a shallow 8-source fan, honestly thin).
   Copy is yours either way.
5. **Ratify (or veto) two D48 arbitrations** made under autonomous mode: (a) E1's verb-teacher is the
   impersonal side-message system, NOT Lamby (R28 §4's pre-amendment wording loses to CLAUDE.md
   amendment 2); (b) the startup-options panel retires in the same session that ships layer 3, never
   before (no onboarding gap).

## Standing rules (carried from the plan, so no prompt has to restate them)
Shipped build never touched · everything behind `?reinterp=1` · all copy PLACEHOLDER until Sérgio ·
gates G1–G12 bind regardless of lane · one session, one scope · blocked ≠ improvise: STOP and log.
