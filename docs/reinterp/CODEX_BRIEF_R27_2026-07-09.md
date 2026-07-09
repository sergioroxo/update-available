# CODEX BRIEF — R27 review results + plan of action (2026-07-09)

*Prepared by Fable 5 after live-reviewing the 9-commit batch since
`CODEX_BRIEF_R26_VERIFIED_2026-07-08.md` (dd971c9 through 71e1bba). Read
`00_START_HERE.md` first as always: worktree-only, `reinterp` branch,
`/` + `?flat=1` byte-identical, `npm test` + `npm run build` green, all
display text `_doc` PLACEHOLDER, no ethics/creative calls (route → FABLE
ROUND).*

## Review verdict: CLOSED, no rework needed

- **B4 (ceiling-witness retirement)** — correct as shipped.
- **B5 (era desktop skins)** — correct as shipped. One low-priority note: an
  open provotype/sendOffer is silently discarded (no abandonment filed) if an
  era shift ever lands mid-interaction. Not reachable in the current beat
  sequence — no action needed unless a future beat makes it reachable.
- **Batching phase 2** — correct, and the material-clone step in
  `clearSettledBatch` is a real, non-obvious fix (prevents the cascade from
  corrupting a shared canonical material). No action needed.
- **The cork-board physicalization** — architecturally sound, verified
  end-to-end with real click-driven playthroughs (O1 → O3 pick/commit →
  hardening → intake record). One bug found and **already fixed by Fable this
  session** (commit pending in this session's log): the physical corkboard
  prop stayed visible at Room 1's old spine position after E4's TURN migrates
  the flat content to Maya's wall, showing an orphaned empty board. Fixed via
  `setOpeningBoardVisibleForEra()` in `app.ts`. Verified live; no further work
  needed on this specific bug.

## Process note for the next session (important)

**`os.debugJump()` does not drive the new opening-wall state machine.** The
cork-board physicalization added an engine-level `openingWallActive` flag
(owned in `app.ts`'s closure, driven by `witness.setStartupBoard`/
`continueFromOpeningWall`) that sits ALONGSIDE the OS's own phase state. A
debug jump to `'profile'` or `'recap'` changes the OS phase correctly but
does NOT clear `openingWallActive`, so the physical board's `startup.active`
flag stays stuck showing the O1 disclaimer regardless of OS phase. **When
testing the opening in this build, drive it with real pointer events against
the actual rendered screen position, not `debugJump` + `os.handleClick` with
hand-computed logical coordinates** — the latter is fragile (this session
lost significant time to a self-inflicted coordinate-math error that looked
exactly like a chip-selection bug but wasn't one).

## Next build lanes (priority order)

### C1 — Room 1 full modelization (carried from S17 B2, still open)
Give Room 1 the same Kenney-model treatment the side rooms already have.
Careful: Room 1's desk carries the kit floppy + power button + the opening
choreography's world-space anchors (`POWER_BTN`/`KIT_FLOPPY` in `app.ts`) —
re-measure those against the model desk's actual geometry before wiring.

### C2 — The layout-X ending arm content (carried from S17 B3, still open)
`?layout=x` opens the back into a dark 4th arm toward the ending; the
point-cloud Close should be entered THROUGH it under X (Sérgio's "glow in the
dark star set" framing) while T keeps the current cut. `enterClose()` in
`app.ts` is the natural place to branch on layout. Spatial-feel calls (node
density/brightness) → FABLE ROUND, do not decide unilaterally.

### C3 — Era-1 diary/glitch content voice pass readiness check
Now that B2 (Session 18's diary-glitch port) and the cork-board opening are
both verified working together end-to-end, this is a good moment for
Sérgio's G6/G7 ethics + voice-pass read of the full Era-1 chain in one
sitting (kit → IRC → escalation → packet → diary → glitch → update), since
it now plays as one continuous piece rather than disconnected fragments.
Not a build task — flagging so it's not lost.

### C4 — Batching phase 3 (optional, low priority)
Current worst-case ceiling wasn't re-measured this session at every seat;
if Sérgio's in-headset pass (still gated, A11) flags remaining draw-call
pressure, revisit model-prop batching (currently models are excluded from
both static and settled groups entirely — `h.model` check in `batching.ts`).
Do not start this speculatively; only if the A11 playtest asks for it.

## Do NOT touch (unchanged)
Final copy (all PLACEHOLDER); G6/G7-gated provotype content; the trans-masc
alcove; the Close's unfinished line (x.b3); the trans-flag facet rebuild of
Room 3; `01_SESSION_LOG.md` history (append only).
