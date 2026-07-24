# CODEX BRIEF — review + build lanes after Session 17 (2026-07-07)
STATUS: history-only

*Prepared by Fable 5 for Codex, at Sérgio's instruction. Two jobs: (A) REVIEW the
Session 16–17 work; (B) BUILD the scoped lanes below. Read
`docs/reinterp/00_START_HERE.md` first — its hard rails and session protocol are
binding, including: worktree only (`/Users/sergiogalvaoroxo/update-available-reinterp/`,
branch `reinterp`), the original folder is read-only, no-flag `/` and `?flat=1`
must stay byte-identical, `npm test` + `npm run build` green at session end, one
`BUILD_LOG.md` line + a `01_SESSION_LOG.md` entry, ALL display text in `data/`
with `_doc: "PLACEHOLDER — Sérgio voice pass pending"`, no ethics/creative calls
(route them `→ FABLE ROUND` in the session log).*

## State of the build (what exists as of commit 7dd5b12)

- **The space:** three fixed rooms that age across 30 years (E1/E2 Room 1 = Daniel,
  E3 Room 2 = Vera, E4 Room 3 = Maya), one shell, axis-aligned doorways, dolly
  camera with per-room seats, X/T layout switcher (`?layout=x`). Kenney CC0
  furniture (native tones — Sérgio approved multi-tone) in the side rooms.
- **The narrative spine (`src/narrative/spine.ts` + `data/paths.json
  reinterp_festival`):** the piece plays end-to-end — opening → E1 (kit → O7
  reveal → provotypes) → T1 update ritual → E2 (sends s1/s2) → T2 → E3 (s3/s4) →
  T3 → E4 (the TURN) → bare final restart → the point-cloud Close.
- **The update ritual (`src/desktop/apps/update.ts`,
  `data/strings/updates.json`):** notification (Remind-me-later works exactly
  once) → EULA (one live I Agree on the last page) → changelog-as-thesis install →
  restart → `os.onEraShift` → morph. The final (`close`) ritual is bare by design.
- **The send seam (`src/room/sends.ts`, `data/sends.json`):** offer/visit/decline,
  symmetric filing (Ethics #10), carry-back props, witness cross-reference lines,
  desktop summons UI (`os.offerSend`).
- **Perf:** static batch phase 1 done (constants batched, morph skips them);
  `?nobatch=1` A/B; live draw-call readout in the `?debug=1` panel.
- **Review tools:** `?debug=1` panel (era/room/facet/send/ritual jumps, links),
  `window.__ledger()`, `window.__os`, `window.__app`, `window.__camProbe(yaw,pitch)`.

## (A) REVIEW lane — check these specifically

1. **Spine pacing + hold-breath logic** (`spine.ts`): timers are placeholders;
   verify no dead-lock when a player abandons a summons window or pauses (ESC)
   mid-ritual, and that `debugJump` era jumps can't double-arm updates.
2. **UpdateApp click geometry** vs `chrome.ts windowFrame` (the content-rect
   math is duplicated by convention — kit.ts does the same; confirm no drift).
3. **Batching** (`src/room/batching.ts`, `clusterMorph.constantPropIds`): confirm
   every runtime `enabled` toggle on batched props rebatches cleanly on Quest-class
   hardware, and that no code path mutates a shared static material.
4. **The morph skip:** constants no longer glitch during cascades — sanity-check
   no prop that SHOULD move is in the constant set after future delta edits
   (`npm test` runs `tools/check-rooms.mjs`; consider extending it to assert the
   constant set matches `constantPropIds`).
5. **Baseline regression:** `/` and `?flat=1` byte-clean (no `data-reinterp`, no
   probes, console clean) — re-verify after every change.

## (B) BUILD lanes, in priority order (one session each, log each)

### B1 — Batching phase 2 (the Quest budget)
Batch the ~100 VARIABLE props: share materials per (state, colour) instead of
mutating per-prop materials in `clusterMorph.applyTarget`, un-batch animating
props for the cascade window, regenerate the group after each fold settles.
Target: worst-case ceiling ~155 → ≤100 mesh instances. Constraint: the cascade's
visual (per-prop colour lerp + glitch) must survive — if material sharing breaks
the lerp, batch only the END STATES and un-batch during animation. Measure with
`window.__drawCalls` + `__batchedProps`; report before/after in the log.

### B2 — Room 1 full modelization
Give Room 1 the Kenney treatment (bed/desk/chair/shelf) — CAREFUL: its desk
carries the kit floppy, power button and opening choreography (`app.ts` POWER_BTN
/ KIT_FLOPPY world positions) — re-measure those anchors against the model desk.
Its bed placement depends on the T/X layout (X frees a wall). Manifest:
`data/room/models.json`; template pattern: `tools/gen_rooms.mjs`.

### B3 — The ending arm content (layout X)
`?layout=x` opens the back into a dark 4th arm; the point-cloud Close should be
ENTERED through it (Sérgio: "glow-in-the-dark star set"). Rebuild `enterClose` so
under X the dolly travels INTO the arm and the constellation surrounds the seat
(under T it stays the current cut). The cloud exists (`src/room/pointCloud.ts`).
Spatial-feel calls (node density, brightness) → FABLE ROUND, do not decide.

### B4 — Era-2+ desktop theming (visual only)
The monitor keeps the Era-1 theme in every era. After each `onEraShift`, the
desktop should re-skin minimally (palette + wallpaper + clock text) per era —
data-driven (`data/strings/` + a small per-era palette in `src/desktop/theme/`),
NO new mechanics, PLACEHOLDER strings. The update ritual already announces the
new-era product names (Restorify / GracePlatform — see `updates.json`).

### B5 — Content-merge lane (the big one; coordinate with Sérgio first)
Port from MAIN's shipped build (read-only reference:
`/Users/sergiogalvaoroxo/update-available/`): e1.b07 diary (felt), e1.b08
escalation, e1.b09 glitch (the REAL T1 trigger — replace the spine's placeholder
trigger in `spine.ts` when it lands), e2.b02 Restorify onboarding, e2.b06 webcam
thread. Keep them data-driven; every ported string keeps its provenance flags.

## Do NOT touch (Fable/Sérgio lanes)
- Any final copy (everything is PLACEHOLDER until Sérgio's voice pass).
- The G6/G7-gated provotype content; the trans-masc alcove content; R6/R11.
- The Close's unfinished line (x.b3) — never completed by any model, ever.
- The trans-flag facet rebuild of Room 3 (Phase C design, Fable round pending).
- `docs/reinterp/01_SESSION_LOG.md` history (append only).
