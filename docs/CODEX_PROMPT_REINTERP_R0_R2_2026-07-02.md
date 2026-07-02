# Prompt for Codex — reinterpretation build, phase R0→R2 (fork · flag · provotype framework · pillow)

*Sérgio: hand this to the coding agent. It implements the first slice of
`docs/REINTERP_MASTER_PLAN_v1_2026-07-02.md` (read it, especially §2, R0–R2, §R2-1/§R2-2, §R3-4).
Companion dramaturgy source: `Pc_Simulation/Sources/Deep Research/Provotypes for a SOGICE VR
documentary.md` (the pillow's beat structure + draft copy — use as PLACEHOLDER text, flagged for Sérgio's
voice pass). One module per session per house rules; this is ~3 sessions: R0, R1, R2.*

---

## HARD CONSTRAINTS (CI-enforced; breaking these = wrong by definition)
- **Never touch the shipped experience in place.** All work on a branch/worktree; without `?reinterp=1`
  the piece must render byte-identically to main. `npm test` (no-network/no-storage invariants) green at
  every step. `npm run build` green.
- No fetch/XHR/WebSocket/storage; in-memory ledger only. CLICK/TAP only — no keyboard, no timer/reflex/
  score/streak/win-lose UI, ever. All display text in `data/` JSON (`_doc`/`_source` fields for hidden
  sourcing). Geometry/layout in `.ts` is fine.
- Real practitioners/orgs are dossier-only (never named in player-facing copy outside the provenance
  panel, never characters). The reference photograph behind the pillow exercise is NOT an asset — no
  reproduction/tracing; stylized low-poly rendering only.
- A working Leave/pause visible from the first frame of every provotype, never moves.
- Register flags per scene: `operable | felt` (no `respite` in this slice).

## SESSION R0 — the flag + namespaces
1. Branch/worktree per your judgment (name suggestion: `reinterp`).
2. Add a `?reinterp=1` mount flag, same idiom as `?flat=1` (see `src/flat/flat.ts` + `src/engine/app.ts`
   for how `flat` is detected). Behind the flag: nothing yet except a debug-panel marker so presence is
   testable. Without it: zero behavioral diff (verify by playing E1→E2 start in `?flat=1`).
3. Create empty namespaces: `data/provotypes/` (with `_schema.json`), `data/panels/`.
4. Done = dev+build+test green; BUILD_LOG line appended.

## SESSION R1 — the provotype framework
A small data-driven runtime, `src/desktop/apps/provotype.ts`, rendering on the era's desktop canvas using
that era's theme tokens (`src/desktop/theme/` — never invent colors):
- **Structure per provotype JSON** (`data/provotypes/*.json`): `id`, `era`, `register`,
  `failure: "silence" | "glitch"`, `cuts: ["festival"|"full"|"side-quest"]` (see master plan §R3-4 — beat
  ids must be addressable so `data/paths.json` can sequence cuts later), `invitation` (the diegetic
  assistant lines that offer it — provotypes are never queued by the frame), `frame` (≤2 sentences),
  `states[]` (the vignette's click states: prompt text, button labels, system responses, optional `felt`
  lines), `debrief` (provenance panel: body text + `sources[]` each with
  `status: documentary|contested|speculative` and a `confidence` label — confidence is PLAYER-VISIBLE),
  `ledgerTags`.
- **Persistent `Pause` and `Leave` buttons from frame one, fixed position.** Leave exits cleanly to the
  era desktop; nothing punitive.
- Ledger integration: writes tags via `src/state/ledger.ts`; the witness side (`src/witness/intake.ts`)
  gains one line per completed/abandoned provotype (both filed — abandonment is not invisible).
- No score/counter/progress chrome anywhere. Repetition is allowed but never juiced.
- Done = a dummy provotype JSON round-trips (invite → frame → 3 states → debrief) in `?flat=1&reinterp=1`;
  tests green; BUILD_LOG line.

## SESSION R2 — the pillow ("Somatic Reprocessing", Era 2)
- **Data:** `data/provotypes/pillow.json`, copy taken from the Fable reply's draft (screen title
  "Somatic Reprocessing"; opening panel; `Lift`/`Exhale`/`Strike` confirmations; the three escalating
  system responses "Surface tension registered…" → "Incomplete emergence…" → "Resistance pattern
  unchanged…"; Daniel's `felt` one-liners "My shoulders hurt." / "I said it louder that time." / "I am
  doing exactly what you said."; the `Finish for now` close + provenance card). **Every string carries a
  `_doc: "PLACEHOLDER — Sérgio voice pass + G6 ethics gate pending"` flag.**
- **Invitation:** Lamby/Restorify offers it diegetically on the Era-2 desktop ("Release Work — today's
  session"), reachable behind `?reinterp=1` only.
- **The interaction is click-confirm only** — each of Lift/Exhale/Strike triggers a *restrained* low-poly
  canvas animation on Daniel's side of the frame (a few frames, no screen shake, no impact juice, no
  rhythm buildup — the player must NOT get swing satisfaction; this is a design law, see master plan
  §R2-2). After each full cycle: the system response + `Repeat` / `Finish for now`. Choosing `Repeat`
  forever changes nothing — that is the point; no cap, no reward, no fail.
- **Provenance card** (`debrief`): the anger-release exercise is documented (`documentary`); the exact
  phrase "until deeper feelings emerge" is NOT verified in a primary source — do not include it in the
  provenance text (master plan §R2-2); JONAH consumer-fraud finding phrasing per the source-grounding
  report; APA/UK no-evidence line. All with `status` + confidence labels, `[VERIFY SOURCE]` in `_doc`
  where flagged.
- **Ledger/witness:** reps counted internally (never shown as a score); witness line reads compliance-
  without-outcome (e.g. `compliance: exemplary · outcome: none` — copy in data, not TS).
- Done = full playthrough in `?flat=1&reinterp=1` (invite → 3 cycles → repeat-loop check → finish →
  provenance → clean exit; Leave works mid-cycle); shipped build unchanged without the flag; tests green;
  BUILD_LOG line; screenshot for the review pass.

## EXPLICITLY OUT OF SCOPE (do not build)
The graying task (R7 — separate session after Sérgio confirms §R3-1), any radial/spatial work (gated on
the in-headset playtest), the point-cloud close, panels beyond the provotype debrief, any Era-4 content,
any copy finalization (all text ships PLACEHOLDER-flagged).
