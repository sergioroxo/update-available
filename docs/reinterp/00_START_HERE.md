# REINTERP BUILD SYSTEM — start here (for ANY model: Opus 4.8, Sonnet 5, Codex, Fable)

*You are building the REINTERPRETATION VERSION of "YOUR UPDATE HAS FAILED." on an isolated copy. The
shipped version (Eras 1–3 built, Era 4 spec'd) is the funded, exhibitable asset and is NEVER touched in
place. Sérgio (project lead, non-coder) directs; you execute one session at a time and log it.*

## Read order (before your first action)
1. This file.
2. `../../CLAUDE.md` — the standing orders. Hard invariants, register laws, aesthetic laws. Binding.
3. `../ETHICS_CONSTRAINTS.md` — binding before ANY content work.
4. `../REINTERP_MASTER_PLAN_v1_2026-07-02.md` — the plan of record. Read the calls table (◆), the
   roadmap (R0–R11), and ALL feedback rounds (F1–F9, R2-*, R3-*, R4-*) — later rounds supersede earlier
   items where marked. Do not act from the v1 body alone.
5. `01_SESSION_LOG.md` — what's done, what's next. **Your session = the top item of NEXT UP, unless
   Sérgio says otherwise.**
6. The build spec for the current phase (per the queue below).

## The one-time setup (Session 0 — skip if `update-available-reinterp/` already exists)
```
cd /Users/sergiogalvaoroxo/update-available
git worktree add ../update-available-reinterp -b reinterp
```
Then, inside the NEW worktree, verify the reinterp doc set exists (`docs/REINTERP_*.md`,
`docs/CODEX_PROMPT_REINTERP_R0_R2_2026-07-02.md`, `docs/reinterp/`). If any are missing there (they may
be uncommitted in the main working dir), COPY them from
`/Users/sergiogalvaoroxo/update-available/docs/` into the worktree's `docs/` and commit them **on the
`reinterp` branch only**. Never commit to `main`; never modify the original folder. From then on, ALL
build work happens in `/Users/sergiogalvaoroxo/update-available-reinterp/`.

## Hard rails (violating any of these = the session is wrong, revert it)
- The original `/Users/sergiogalvaoroxo/update-available/` folder: read-only reference. All edits happen
  in the worktree, committed to `reinterp`.
- Without `?reinterp=1`, the piece renders EXACTLY like the shipped build (regression baseline).
- `npm test` (no-network/no-storage invariants) + `npm run build` green at the end of every session.
- No fetch/XHR/storage; in-memory ledger only. Click/tap only — no keyboard, timer, score, streak,
  win/lose UI ever. All display text in `data/` JSON; geometry/layout in `.ts`.
- New display text carries `_doc: "PLACEHOLDER — Sérgio voice pass pending"` plus any ethics-gate flag
  the plan names (G1–G12, see master plan §4). Never finalize copy.
- Real people/orgs: dossier/provenance-panel only. No reproduction of real reference photography.
- A working Leave/pause from the first frame of every new scene, fixed position.
- Every new beat/provotype/panel registers a beat id + `cuts: ["festival"|"full"|"side-quest"]` metadata
  (Festival/Full cuts are composed later via `data/paths.json` — nothing hardcoded to one order).

## Session protocol (every session, no exceptions)
0. **DOC SYNC first:** Fable maintains the plan docs in the ORIGINAL folder
   (`/Users/sergiogalvaoroxo/update-available/docs/`). Copy into this worktree any files there that are
   newer than the worktree's copies, matching: `REINTERP_*.md`, `CHATGPT_DEEPRESEARCH_*.md`,
   `CODEX_PROMPT_REINTERP_*.md`, `docs/reinterp/00_START_HERE.md`. Commit the sync on `reinterp` before
   starting work. (Never sync the other direction; never edit the original folder.) The worktree's
   `01_SESSION_LOG.md` is the live log — do NOT overwrite it from the original.
1. Read this file + the session log. Confirm which session you are running.
2. Do ONE session's scope. Do not run ahead into the next item even if it's tempting.
3. Verify in the preview (`?flat=1&reinterp=1` for 2D work) before calling anything done. Also verify the
   no-flag baseline is unchanged.
4. Append to `01_SESSION_LOG.md`: date, session id, what shipped, what's verified, anything discovered
   that changes the plan (flag it `→ FABLE ROUND` if it needs a dramaturgy/reconciliation decision —
   don't decide creative/ethics questions yourself).
5. One line in the worktree's `BUILD_LOG.md`. Commit on `reinterp` with a clear message.
6. If blocked on a decision only Sérgio can make: STOP, write the question into the session log under
   `BLOCKED`, and tell him. Do not guess around an ethics gate.

## The session queue (top = next; Fable maintains this via the master plan)
| # | Session | Spec | Notes |
|---|---|---|---|
| 0 | Worktree setup + doc sync | this file, above | one-time |
| 1 | R0 — `?reinterp=1` flag + `data/provotypes/` + `data/panels/` namespaces | `docs/CODEX_PROMPT_REINTERP_R0_R2_2026-07-02.md`, Session R0 | |
| 2 | R1 — provotype framework (frame → vignette → debrief runtime) | same doc, Session R1 | include `cuts` metadata in the schema |
| 3 | R2 — the pillow ("Somatic Reprocessing", Era 2) **+ small framework addition: per-choice ledger/witness tagging** (`states[].choices[].ledgerTag` + optional per-choice response line — choices REGISTER, never branch; master plan §R8-5) | same doc, Session R2 + draft copy in `Pc_Simulation/Sources/Deep Research/Provotypes for a SOGICE VR documentary.md` | all copy PLACEHOLDER; Sonnet-eligible (see `02_SONNET_SESSION_TEMPLATE.md`) |
| 4 | R7 — the graying task (E1) | master plan §R3-1 (needs its own build spec first → FABLE ROUND writes it after R2 ships) | mixtape = the resisting element (locked) |
| 5 | R4 — Origin Story Intake ('97) | master plan R4 + §R4-2 (van den Aardweg 1997 wording, documentary) | after R7 |
| 6 | Character-creation opening (E1: replaces name-typing) | master plan §R8-2 — **spec does not exist yet**; Fable round writes it after Sérgio answers the R8-2 questions | do NOT improvise this |
| — | PARALLEL (not a build session): moodboard pass — tinted trans room + cluster shell | house convention `docs/MOODBOARD_*_ROOM.md`; brief → FABLE ROUND | feeds the geometry doc; does NOT block 1–5 |
| ⛔ | GATED — all spatial work (radial shell, tinted-room build, point-cloud VR) | gated on Sérgio's in-headset playtest (A11 gate) | do not start |
| ⛔ | BLOCKED — trans-man alcove content, R6 drafting, R11 drafting | ethics gates G1/G2/G3/G4 (master plan §4) | do not start |

## Who does what (so you don't do someone else's job)
- **You (build model):** execute the queue, verify, log. No creative redesigns, no copy finalization, no
  ethics calls.
- **Fable:** dramaturgy, reconciliation, plan/queue maintenance, new build specs. If your session
  surfaces a design question, route it there via the session log.
- **ChatGPT Deep Research / Sonnet 5:** sourcing and verification (Sérgio runs these).
- **Sérgio:** all voice/copy passes, all ethics judgment calls, the in-headset playtest, greenlights.
