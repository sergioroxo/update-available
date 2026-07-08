# CODEX BRIEF — R26 VERIFICATION + next lanes (2026-07-08, follow-up)

*Prepared by Fable 5. Codex's Sessions 19–21 (commits 74f456e, 77e468a, 363306d) built
B1 (cork-board opening) and B2 (diary-glitch ending) from `CODEX_BRIEF_R26_2026-07-08.md`,
but Codex's own environment could not drive a real browser (CDP blocked; in-app browser
rejected localhost) — every session log entry ends "manual review needed." **This brief
is that review.** I drove the full chain live (Claude's Chrome-backed preview tooling,
not a static read) and it works. Read `00_START_HERE.md` first as always.*

## What I verified (all PASS — do not redo B1/B2/B3)

Full click-driven playthrough, fresh page load, no shortcuts: O1 → O3 profile (cork board
rendering correctly, no black-terminal bleed-through) → re-caption (hardening transition,
cold terminal returns, all 5 profile tags filed and legible, no field overflow) → desktop →
kit → IRC (lurk-only, verified **no input field**) → 5 reply-button turns (each filed its
witness label) → **placement packet** (renders exactly per spec: TriedPath Fellowship form,
dead "Ask a question" button, live OK) → **DIARY.TXT** (write → committed → flagged →
deleting → **the tug-of-war**: first press surges the truth back in blue and arms round 2,
second press wins it for good) → `deletion-failed` + `diary-glitch` filed → warm non-strobe
glitch wash fires → **T1 update notice appears** ("TriedPath Un-Walk — System Notice") →
EULA → changelog → restart → **the room morphs to E2** (wall scale confirmed 0) → witness
record shows the full lineage (enrollment/diary/deletion/glitch lines, pixel-confirmed lit).
Baselines `/` and `?flat=1` re-checked clean (no `data-reinterp`, no probes, no console
errors) — these commits touched shared files (`os.ts`, `app.ts`, `intake.ts`) and the
guard held. `npm test` + `tsc` + `npm run build` all green.

**One false alarm, resolved:** mid-session the camera flip (⟲) appeared stuck after a very
long manual test sequence (many debug jumps + manual camera probes in one page load). On a
**fresh** navigation it worked perfectly (`E2 · spine · door + record`). This was leftover
tween/dolly state from my own test harness, not a code regression — the flip mechanic
itself was untouched by these commits. No action needed.

**B3 (tape/audio) is also already resolved** — Session 19 removed `hymn.mid`/`(tape hiss)`/
`(tape ends)` and reframed the prayer page as a printed cassette insert. Confirmed in
`data/dialog/s1_kit.json` + `kit.ts`. Close this item.

## What's still open (next priorities, in order)

### B4 — Witness/ceiling reconception (carried, now sharper)
The overhead ceiling-witness iris still wakes at every era transition
(`cluster.ts` — `ceiling.wake()` in the T1 cascade schedule and in `morphToEra` for every
`toIdx >= 1`). With the cork-board/spine-wall surface now carrying the witness role
end-to-end (opening → hardening → intake → ending lineage → E4's migrated wall → the
Close), the overhead iris is very likely redundant presence-doubling. Recommend: retire
`ceiling.wake()`/`wakeInstant()` calls (keep `buildCeilingWitness` itself harmless/inert
so nothing else breaks, or remove the calls only) and confirm nothing else depends on the
iris waking. Spatial-feel call → confirm with Sérgio in a screenshot, but this is a small,
mechanical change once he agrees.

### B5 — Per-era desktop re-skin (newly sharpened by this verification)
Confirmed live: after the T1 update completes and the 3D room morphs to E2 (rooms open),
**the desktop monitor content is still the Era-1 IRC transcript** — there is no `os.ts`
re-skin keyed to `onEraShift`. This was already flagged in `CODEX_BRIEF_S17_2026-07-07.md`
B4 but is now confirmed as a real, visible gap rather than a hypothetical: the room ages
but the screen the player spends most of their time looking at does not. Recommend this
be the next build lane — minimal scope: on `os.onEraShift`, swap desktop wallpaper/palette
+ retire the finished IRC/packet/diary windows + surface era-appropriate icons (Restorify
per `updates.json` u2, GracePlatform per u3, etc. — names already exist in that file).
Keep it data-driven and PLACEHOLDER; no new mechanics.

### Carried unchanged from `CODEX_BRIEF_S17_2026-07-07.md`
Batching phase 2, Room 1 full modelization, the layout-X ending arm content. Still valid,
still lower priority than B4/B5 above.

## Process note (for Codex, so future sessions don't end in "manual review needed")
Your environment's browser access is unreliable (documented CDP/localhost failures across
three sessions). When you cannot independently verify a change, say so plainly in the log
(you did — good) and stop there; do not mark a build lane's status beyond "implemented,
unverified." Fable/Sérgio will close the verification loop, as this brief does. Do not
attempt workarounds that reduce rigor (e.g., assuming success from a lack of build errors).

## Do NOT touch (unchanged)
Final copy (PLACEHOLDER throughout); G6/G7 provotype content; the trans-masc alcove; the
Close's unfinished line (x.b3); the trans-flag facet rebuild; `01_SESSION_LOG.md` history.
