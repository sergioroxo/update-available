# CODEX BRIEF — R26 (2026-07-08) · Era-1 playtest fixes + the missing opening

*Prepared by Fable 5 from Sérgio's R26 Era-1 playtest. SUPERSEDES the forward
lanes of `CODEX_BRIEF_S17_2026-07-07.md` where they overlap; that brief's
"Do NOT touch" fences still hold. Read `docs/reinterp/00_START_HERE.md` first
(worktree-only, `reinterp` branch, `/` + `?flat=1` byte-identical, `npm test`
+ `npm run build` green, all display text in `data/` with `_doc` PLACEHOLDER,
no ethics/creative calls — route them `→ FABLE ROUND`).*

## 0. PROCESS DIRECTIVES (Sérgio, binding — this is why the regression happened)

1. **Review in a real Chrome window, not just the narrow preview pane.** The
   dolly/space only reads at full viewport. Use the `?debug=1` panel's links +
   `window.__camProbe(yaw,pitch)` / `__os` / `__ledger` probes.
2. **Never ship an OS beat that MAIN already resolved.** Before touching any
   Era-1 desktop beat (IRC, kit, diary, ending), DIFF against
   `/Users/sergiogalvaoroxo/update-available/src/desktop/` (read-only) and take
   MAIN's newer version. The reinterp worktree forked before several beats were
   finished; assume MAIN is ahead on OS content unless proven otherwise.
3. **Verify the exact bundle you're reviewing** (the `?debug=1` BUILD_TAG says
   which). Don't compare against a stale dev server.

## 1. ALREADY FIXED THIS SESSION (commit 211136b — do NOT redo)

- **IRC un-regressed**: ported MAIN's lurk-only channel + turn-by-turn Rob
  reply buttons (`src/desktop/apps/irc.ts`, `data/dialog/s1_end.json`
  `escalation.turns[]`). No typing anywhere; the flip earns the escalation (24s
  fallback); `onEscalationDone` files `escalation-done` → the spine arms the T1
  update. **Verified end-to-end.** This fixes: "can't advance", "typing
  shouldn't exist", "reply buttons missing", "ask for Rob" (kit copy → passive).
- **Floppy camera tilt-up REMOVED** (`app.ts onKitInserted`) — no more "camera
  up to nothing".
- **O7 wall seams ("white bars") + ceiling-wake on reveal REMOVED**
  (`cluster.ts reveal()`) — radial-era vestige; reveal is now a pure state flag.
- **Kit BACK button permanently greyed** ("victims can't go back").
- **Spine door frame aligned** (lintel spans jamb outer edges, same z) — the
  slit/top-frame mismatch. **PLEASE re-check in Chrome** — I could not get a
  clean straight-on angle in the preview; the numbers are aligned but Sérgio's
  eye confirms.
- **Room 2/3 bookcase** rotated (yaw 180) + pulled flush. **Also re-check in
  Chrome** — orientation looks right (open shelves face the room) but the
  flush-to-wall depth is eyeballed.

## 2. BUILD LANES (priority order; one session each, log each)

### B1 — THE CORK-BOARD OPENING (the missing scene) + the witness lineage
**This is the headline.** The new opening scene "with the cork board" was never
built in this worktree — the current opening is the O1 disclaimer overlay + the
O2/O3 boot/profile/recap on the monitor (`app.ts` mountStartupOverlay,
`os.ts drawReinterpProfile/Recap`). Sérgio's design intuition (confirm with him
before building): **the cork board and the witness board are the SAME surface,
transformed.**

Fable design spec (for Codex to build; Sérgio ratifies the feel):
- The **opening profile (O3)** is a warm CORK BOARD on the wall BEHIND the seat
  (the spine wall — where the witness terminal lives today). You pin your
  self-presentation to it (the icon grid / chips / goal that O3 already
  collects — reuse `data/strings/opening.json` sets, all PLACEHOLDER).
- As the system files you, **the same board hardens into the witness record**:
  warm cork → cold terminal, pinned notes → filed entries. The aesthetic law
  ("the witness side is the sharp side") is literally this transformation.
- **"Look behind you"** = turning to see what your self-presentation has BECOME.
  This is the reunderstanding Sérgio asked for: the thing behind you is not a
  generic panel, it's YOUR cork board being converted to a file. It's also what
  earns Rob's escalation (already wired: the flip → `beginEscalation`).
- **Where it lives in later steps**: it is the persistent record surface. E4's
  TURN already migrates it to Maya's wall (`cluster.ts migrateTerminal`); the
  Close already lifts its lines into the constellation (`pointCloud.ts`). So the
  lineage is cork board → witness terminal → Maya's shared wall → constellation.
  Build the cork-board *front end* of that chain; the rest exists.
- Keep it diegetic, click-only, PLACEHOLDER copy. The `witness/intake.ts` record
  content ("still struggling" log) is GOOD per Sérgio — keep the content, change
  only the surface's opening state (cork) and the hardening transition.

### B2 — Era-1 ending content-merge (the REAL T1 trigger)
Only the IRC was ported this session. MAIN's `s1_end.json` also has the resolved
**diary → deletion → glitch** ending (the diary is flagged "dangerous", the
system tries to erase it, FAILS — the person's glitch — and jumps into the
update). That is the true `e1.b09` T1 trigger (the spine currently fires T1 on
`escalation-done` as a stand-in). Port MAIN's PacketApp/DiaryApp beats +
`s1_end.json` packet/diary/ritual blocks; replace the spine's placeholder
trigger with the diary-glitch. Coordinate with Sérgio (this is the script §7
content-merge lane; G-gates on any survivor-adjacent copy).

### B3 — The tape / hymn: sound or not? (Sérgio decides, then fix the mishap)
`data/dialog/s1_kit.json`: the companion-cassette page shows `"hymn.mid — now
playing"` + literal `"(tape hiss)"` / `"(tape ends)"` as on-screen text.
Sérgio's question: **is this going to be actual audio?**
- If YES: add a local audio asset (allowed — no network; but the piece has been
  silent, so this is a deliberate choice), and the "(tape hiss)/(tape ends)"
  become real sound, not printed stage directions.
- If NO: remove the stage-direction lines and the "now playing" claim; render it
  as a silent period artifact (the cassette insert as image/text only).
Either way the current state is a mishap. → SÉRGIO decides; Codex implements.

### B4 — Witness / ceiling reconception (finish what §1 started)
The ceiling-witness IRIS still shows overhead in E2+ (the `buildCeilingWitness`
overhead presence, woken by the T1 cascade in `cluster.ts`). With the cork-board
lineage (B1) carrying the witness role on the WALL, the overhead ceiling iris is
likely redundant — retire it or repurpose it. Also confirm the spine witness
terminal doesn't z-fight/"glitch" (Sérgio saw it "glitching"); it sits at
`clusterData.witnessTerminal` — nudge off the spine plane if it z-fights.
Spatial-feel calls → FABLE ROUND.

### B5 — Carried from S17 (unchanged priority, after B1–B4)
Batching phase 2 (~155→≤100 draw calls); Room 1 full modelization; the layout-X
ending arm (enter the constellation through the 4th arm); per-era desktop
re-skin after `onEraShift`.

## 3. DESIGN QUESTIONS — resolved / for Sérgio
- **Cork board = witness board?** → RECOMMENDED YES (B1 spec above). Sérgio
  ratifies.
- **Should Rob wait for the look-around?** → RESOLVED (main-parity, now ported):
  YES — the flip earns the escalation, with a 24s fallback so a non-flipper
  still advances. Feel-tune the 24s in playtest.
- **Tape as sound?** → SÉRGIO (B3).
- **The "still struggling" log** → keep (Sérgio likes it); only the surface it
  lives on changes (B1).

## 4. Do NOT touch (Fable/Sérgio lanes)
Final copy (all PLACEHOLDER); G6/G7 provotype content; the trans-masc alcove;
the Close's unfinished line (x.b3); the trans-flag facet rebuild; the
`01_SESSION_LOG.md` history (append only).
