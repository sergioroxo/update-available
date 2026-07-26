STATUS: live

# S54 — THE BOOMBOX SITS DOWN, THE TAPES BECOME USABLE
*Sérgio's second pass on S52, from his screenshot: "the boombox is now facing us but it turn upwards
which makes no sense, so it should be horizontal (drop 45 degrees to the right), and the tapes are
just floating and should just be on the shelf, also they need to be understandable that you'll need
to touch them to play, so they should be a bit bigger and displayed in a way that would make sense
to use them."*

## What the screenshot shows
S52 fixed the *facing* — the deck, grille and buttons now point at the seat, which they didn't
before. But it fixed it by standing the unit **on its end**: it reads as a tall tower or a vending
machine, not a boombox. A boombox is a **landscape** object — wider than tall, handle on top,
speakers flanking a centre deck, resting on its base.

The tapes are the second half of the same problem: they're small flat rectangles floating slightly
off the shelf. They don't read as objects you can pick up, so the interaction is invisible even
though it works (S49 proved the whole insert/eject chain fires).

## ✅ RESOLVED — it is 90°, not 45°
Sérgio (2026-07-25): *"Yes I meant 90 degrees not 45."* So there is no conflict with CLAUDE.md's
pixel discipline (**"90°-step rotations only"**) — laying the unit flat is a clean 90° move and the
law holds. Build it as a **90° rotation**; verify by eye from the seat pose.

---

```
Build session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch
reinterp, ?reinterp=1). Read CLAUDE.md (aesthetic laws — note the 90°-step rule and the flag below),
docs/REINTERP_S54_BOOMBOX_TAPES_2026-07-25.md (THIS SPEC), the Session 52 and 54 entries in
docs/reinterp/01_SESSION_LOG.md (S52 added the tilt/tiltOffset mechanism in src/room/assets.ts and
re-measured the docked-tape spot — read what it did before changing it), src/narrative/tapes.ts,
data/room/era1.json, data/room/reinterp_deltas.json.

CONTEXT: S52 made the cassette player face the seat, but by standing it upright — it now reads as a
tower, not a boombox. The tape logic is CORRECT and verified (S49 + S52 both proved insert/eject/
swap with real clicks). Everything here is about how these objects READ and whether a player
understands they can be touched. Do not re-engineer working logic.

SCOPE:
1. LAY THE BOOMBOX DOWN — a clean 90° ROTATION (Sérgio confirmed 90°, not 45°, so the aesthetic
   law's 90°-step rule holds and no deviation is needed). Goal: it rests HORIZONTALLY on its base —
   landscape, wider than tall, handle up, speakers flanking the centre deck — with its face toward
   the Room-1 seat. Use S52's existing tilt/tiltOffset mechanism; don't add a parallel one. Verify
   by eye from the actual seat pose.
2. RE-MEASURE THE DOCKED-TAPE SPOT AFTER ROTATING. S52 learned this the hard way: it moved the
   boombox and the docked tape ended up INSIDE the solid body. The dock must sit on the new front
   face, visible from the seat.
3. THE TAPES REST ON THE SHELF. They currently float. Measure the real shelf surface (S49 found it
   at y 0.76 — verify, don't assume) and seat them on it.
4. ⚑ MAKE THE AFFORDANCE LEGIBLE — this is the actual goal, not decoration. Sérgio: they must be
   "a bit bigger and displayed in a way that would make sense to use them." Today three small flat
   rectangles read as debris. Make them BIGGER, and arrange them so they read as a set you choose
   from — e.g. standing on edge in a row like cassettes in a rack, or leaning against the player —
   rather than lying flat. The test is not "is it pretty", it is: **would a first-time player at the
   seat understand these are things they can touch?** Judge it from a real seat-pose screenshot and
   say in the log why your arrangement reads as usable.
5. Re-verify the click geometry after every move — position changes invalidate the hit targets, and
   this is the third session in a row where that has been the trap.
6. teddyBox likely has the same shelf-height bug S52 fixed on cdStack (S52 flagged it in the data
   rather than fixing it, since it wasn't reported). Fix it here — it's the same class and you're
   already measuring that shelf.

FILES YOU MAY TOUCH: data/room/era1.json, data/room/reinterp_deltas.json, data/room/models.json,
src/room/assets.ts, src/room/clusterMorph.ts, src/engine/app.ts (prop/click geometry only),
src/narrative/tapes.ts, docs/reinterp/01_SESSION_LOG.md. NOT: src/desktop/**, data/dialog/**,
data/provotypes/**. If an asset is added or changed, assets/LICENSES.md + ATTRIBUTIONS.md are IN
scope — S52 was right to treat "no asset lands without a row" as binding.

ACCEPTANCE: from the real Room-1 seat pose (not a debug camera), a screenshot shows a boombox that
reads as a boombox lying horizontally, face to the player, with three clearly-sized tapes resting on
the shelf arranged so their usability is obvious. All three still insert, eject and swap with real
clicks after the moves. npm test (check-rooms catches bad prop folds) + npm run build green;
baselines / and ?flat=1 unaffected.
GIT DISCIPLINE (mandatory): explicit pathspecs only — `git commit -- <your files>`; never bare
`git commit` or `git add -A`; check `git status --short` first and leave anything that isn't yours
alone. Blocked ≠ improvise: STOP and log BLOCKED.
```

## Housekeeping worth folding in (both already logged, neither done)
- `check-spec.mjs`'s palette baseline can tighten **44 → 42** after S53's literal removals; the tool
  prints the hint itself. S53 couldn't touch that file (out of fence).
- Two S51 follow-ups in `app.ts`/`os.ts`: `netvisionWasPlaying` is never reset (a second video open
  in one page load gets no audio — debug-only today), and the `netvisionBreak` debug jump seeks
  `duration - 3`, which at the new 114s length lands at 111s — deep in the tear rather than at the
  break's start. **The second one matters for review**, since it's how the break gets inspected.
