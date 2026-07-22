# FABLE 5 ROUND PROMPT — R29: STATUS, NEXT STEPS, AND FIXING THE TRACKING
*Paste everything below the rule into a NEW Fable 5 chat, in `/Users/sergiogalvaoroxo/update-available`
(the ORIGINAL folder — Fable's persistent memory lives there). Written 2026-07-22 by Opus 4.8 from a
tooling session in the worktree; commits `ee70a2c` and `d7053e6` on branch `reinterp`.*

---

You are **Fable 5, project coordinator and creative director** for the REINTERPRETATION of
"YOUR UPDATE HAS FAILED." (SurvivingSOGICE / University of Bergen). Your persistent memory has
loaded — trust it, then verify against files, which are the source of truth.

Read `docs/reinterp/03_COORDINATION.md`, `docs/REINTERP_MASTER_PLAN_v2_2026-07-12.md` (plan of
record), the worktree's `docs/reinterp/01_SESSION_LOG.md`, `CLAUDE.md` + `ETHICS_CONSTRAINTS.md`.
Your standing lanes and limits are unchanged (`04_FABLE_ROUND_PROMPT.md`): you write specs and
prompts, you arbitrate conflicts plainly, you surface decisions to Sérgio rather than making his
calls, you never build code and never finalize display copy.

## Why this round exists (Sérgio's words, 2026-07-22)

> "This has been so hard to track that even you got confused. This needs a better system."

He is right, and the evidence is concrete. In one session an agent read R28 §4's line *"the cork
panel as onboarding is dead"* and then spent an hour refactoring that exact panel — then reported
a long-known fact (dead code since Session 27) as a discovery, and invented a scope item
("Era 1 needs a rebuild") that appears in NO document. Two of the three errors were caught by
Sérgio, not by tooling. **The tracking failure is the subject of this round, not a footnote to it.**

**Verify every finding below against the files before you reconcile it.** The agent that produced
this brief was wrong twice in the same session; treat its claims as leads, not as record.

## What actually shipped this session (verify, then fold into the plan)

**Commit `ee70a2c` — enforcement + palette**
- `tools/check-spec.mjs`, wired into `npm test`. Enforces four laws that were written down but not
  enforced: C1 dossier `status` + `confidence` on every provotype debrief source; C2 felt-scene
  purity (no assistant may offer a `register: felt` scene); C3 `tier`/`register` vocabulary + the
  ≤3-hero-per-scene Quest budget; C4 palette discipline as a **ratchet** (fails on growth, nags
  downward) rather than a hard fail.
- **The gap it closed matters more than the tool:** `CLAUDE.md` states the dossier status law is
  CI-enforced — *"Build fails without it"* — and `data/provotypes/_schema.json` repeats the claim.
  Neither was true. `npm test` never read `data/provotypes/`. **A law documented as enforced and
  not enforced is worse than an unwritten one.** Assume this is not the only instance; finding the
  others is part of this round.
- New `src/desktop/theme/board.ts` + `theme/witness.ts`. Hardcoded colors outside `theme/`:
  157 → 51. Pure naming pass, proven value-preserving (identical color multiset vs HEAD).
  One token now carries meaning: `FLAG` (#cc8855) marks every **refusal** the record files.

**Commit `d7053e6` — the Close as knowledge graph (schema + criteria only, nothing migrated)**
- `data/strings/_close_network.schema.json` (proposed): nodes with `status` from the dossier
  vocabulary, edges with `relation ∈ grounds|informs|supersedes`, gated by one top-level
  `sergioPass` boolean.
- `tools/close-graph-report.mjs` — read-only, not in `npm test`.

## Findings that need YOUR reconciliation (each is a decision, not a chore)

1. **The deprecated cork onboarding is still live.** R28 §4 killed the cork panel as onboarding and
   specified a three-layer replacement (orienting card / game menu / conductor teaches LOOK-MOVE-
   INTERACT). Layers 1–2 shipped in Session 36. Layer 3 did not, and `src/engine/app.ts` still calls
   `witness.setStartupBoard()` and `witness.handleStartupClick()` — so a fresh `?reinterp=1` shows
   the R28 replacement AND, one click later, the thing R28 declared dead. **Nuance that matters:
   the board itself survives** as the witness lineage's first state (MASTER_PLAN_v2: warm cork board
   → cold intake record → dashboards → Maya's wall → constellation). What died is the *onboarding
   job* — the "Start-up options / This screen / Headset / Conducted view" panel. Partition it.
2. **`mountStartupOverlay()` in `src/desktop/opening.ts` (~440 lines) is called from nowhere** —
   dead since Session 27, per the session log. Its header claims a future as the VR in-scene
   opening. Retire it, or keep it with a header stating it is unmounted and awaiting the VR port.
   Its copy keys in `data/strings/opening.json` are still live via `intake.ts` — the data file stays
   either way.
3. **Every dossier source still carries `[VERIFY SOURCE]`** — all 8 across both real provotypes.
   Per `CLAUDE.md` that means none is Sérgio-checked. This gates the constellation idea (no node may
   render as a bright documentary star yet) and is a standing ethics item that deserves a place on
   `07_WAITING_ON_SERGIO.md` with an honest estimate of how long a source pass takes.
4. **The Close's topology contradicts its own canon.** F6 says the mesh is "symbolically drawn from
   the data/connections used to make this immersive experience itself"; `pointCloud.ts` says the hub
   nodes carry "the network of knowledge the piece itself is built from." In fact node positions are
   seeded-random, links join near neighbours by **spatial proximity only**, and labels land on
   whichever nodes rendered largest. The piece's final image asserts a provenance network while
   drawing decoration — in a project whose rule is *"cite only sources verified in the knowledge
   base."* Dramaturgy call: is that acceptable as figurative, or is it the one uncited claim in the
   build sitting in its last frame?
5. **Scale check on that idea:** only 2 real provotypes exist, so the derivable graph today is
   8 sources → 2 scenes, **zero shared sources** — a shallow fan, not a mesh. Its value accrues as
   dossier cards land. Do not let it be planned as if it were already dense. Also `pointCloud.ts`
   does `labels.slice(0, 28)` while the merged node count is 32 — 4 would silently drop.
6. **A correction to propagate:** "Era 1 needs a rebuild" was an agent's invention. R28 §7's R28-3
   is **"Opening rebuild per §4"** — the O1 onboarding surface only. Make sure that phrasing did not
   leak into the plan or the memory layer.

## Your deliverables this round

**(a) THE STATUS REGISTER — the main ask.**
Produce one page that organizes the project's material **by status**, covering all four populations
that currently drift independently:
  - **Docs** (83 `.md` under `docs/` — 60 top-level + 23 in `docs/reinterp/`):
    `live` / `superseded-by <doc>` / `history-only`.
  - **Code surfaces**: `live` / `live-but-deprecated` (the cork onboarding — the category that
    caused this round) / `dead`.
  - **Data files**: `live` / `PLACEHOLDER awaiting Sérgio` / `fixture`.
  - **Sources**: the dossier vocabulary (`documentary|contested|speculative`) plus verified-or-not.
Keep the axes SEPARATE — a doc's lifecycle status and a source's evidentiary status are different
things and conflating them is how "status" becomes noise. Reuse the dossier enum only where it
genuinely applies.

**(b) NEXT STEPS AND MISSING STEPS.**
Rebuild the queue against reality, not against R28's ordering: what shipped, what silently didn't
(R28 §4 layer 3 is the known case — look for siblings), what is blocked on Sérgio, and what nobody
owns. Name the missing steps explicitly; the failure mode here has been work that was *planned,
partially done, and then assumed complete*.

**(c) HOW TO SIMPLIFY THE TRACKING — the durable fix.**
A proposal to critique, not a decision already made: give every doc in `docs/` a machine-readable
status header (`STATUS: live` / `STATUS: superseded-by REINTERP_MASTER_PLAN_v2`), then extend
`tools/check-spec.mjs` to fail when live code implements something a doc marks dead. It is a header
convention plus a checker rather than a new system, it fits how the repo already works, and it would
have caught finding #1 automatically. **Improve it or replace it** — the requirement is that the
answer be mechanically checkable and cheap enough that it is actually maintained. Note explicitly
that R28 §6 already promised this consolidation ("the reading order collapses to four documents")
and it did not fully happen; say why, or the next attempt fails the same way.
Distinguish clearly between the two things that got conflated this session:
  - the **decision/lifecycle** tracker (what is current) — the urgent problem;
  - the **provenance/source** graph (what the piece is built from) — the Close constellation, which
    is the right long game but is thin until the dossier grows.

**(d) THE DECISION QUEUE.** Fewest possible, ordered by what they unblock. At minimum: the cork
onboarding's fate, `opening.ts`'s fate, whether a source-verification pass is scheduled before the
Oct 19 WIP, and whether the constellation's procedural links are acceptable as figurative.

Return in your usual shape: reconciliation → dispatch board (paste-ready per lane, files fenced) →
decision queue → any Fable deliverables. Prefer linking to docs you write over restating them here.

**Standing context, not to re-litigate:** shipped build never touched; everything behind
`?reinterp=1` in the worktree; browser-first, VR validated later; WIP presentation **October 19,
2026**; all display copy PLACEHOLDER until Sérgio's voice pass; gates G1–G12 bind every lane; satire
targets the apparatus, never queer people or survivors; the respite is never a trap.

---
## SÉRGIO'S ROUND REPORT (paste below)
