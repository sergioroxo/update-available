STATUS: live

# THE WALKER TURNS ITS HEAD, AND ERA 4 TURNS OUT TO HAVE BEEN UNPLAYABLE
*2026-09-11. Supersedes §5 and §6.1 of `ERA4_STATE_2026-09-10.md`. Tree green, walk green:
282 presses, `spine: done`, the headset 36.9° off the seat bearing.*

---

# 1 · WHAT WAS ASKED
Teach `tools/walk.mjs` to turn its head — it projected controls only from the authored camera pose,
so anything off-axis read as unreachable, and that was the only reason Era 4's headset sat at 20.6°
instead of in the periphery Sérgio asked for twice. Then move the headset out and re-walk.

# 2 · WHAT THE TURNING HEAD FOUND
The tool was fixed in the morning. The first walk with it was green. **The second thing it found
was that Era 4's playable middle had never been playable.**

| | |
|---|---|
| **The six tabs could not be opened by anyone.** | `E4Space.pressBrowser` had zero callers; `E4Browser.handOverLid` had zero callers; `handleWorkstationPointer`'s `test()` knew the workstation, the phone and the laptop — no monitor. The browser was drawn on a screen nothing routed a press to. |
| **Every walk since S126 was green anyway.** | `walk.mjs` aims a rect published on the OS canvas at whichever plane shows it, and tried the *visor* first in `e4`. A press on the visor while the device is off the face is `wear()`. So the era's opening press filed `headset:worn` instead of opening a tab, and every later tab press was swallowed by the worn picture. |
| **The ledger had been saying so all along.** | Four days of walks ended with `e4Space` holding `session:read, headset:worn, laptop:read` and **not one tab**. Nobody read the ledger against the claim. |
| **Once pressable, the browser kept advertising after the device went on.** | Six rects published, all swallowed — the walker judged each inert, 45 times over, and starved the offers of presses until the run died. The walker's own report has a name for this shape: *"advertised as reachable while being physically unreachable."* |

⚑ This is `content-that-cannot-be-met` — the project's dominant bug class — in the newest work in the
piece, and it was hidden by the exact instrument built to find it. The lesson is not new; the
comment three blocks above the one I edited in `walk.mjs` says *"a hardcoded list of sub-apps would
be a second copy of the architecture, and it would go stale the first time somebody adds a
screen."* Somebody added a screen, and the person who wrote the warning walked past it for four days.

# 3 · WHAT LANDED (one commit)
**The piece**
- `era3Devices.ts` — `test()` learns `'monitor'`; while the device is on the stand a press on that
  glass goes to `pressBrowser`. A press that hits no tab is **consumed**, on the same law the worn
  visor follows — otherwise it falls through to the headset sphere and puts the device on, the one
  thing the reading stage must never do by accident.
- `browser.ts` / `space.ts` — `draw(…, pressable)`: the browser publishes controls only while it is
  the surface in front of her. From the moment it is worn it draws and says nothing.
- `reinterp_deltas.json` + `PLACEMENT.visor` — the headset, its stand and its visor plane move
  z 0.40 → 0.10: **36.9° off the seat bearing, off-screen at x −226 from the seat.** Glasses,
  controller and sketchbook re-laid so nothing clips. ⚑ 36.9°, not the 33.0° the old note had
  pencilled in: three degrees past the frame edge is still the corner, and the corner is where the
  frame keeps its chrome (S117).

**The tool** — `tools/walk.mjs`
- Every rejected projection now carries **how far round** the thing is (yaw, pitch, distance); a
  bare plane that cannot be aimed at is a finding, not a silence.
- It turns with the **arrow keys** — `app.ts`'s 6°/5° look-in-place, real player input. Not a drag:
  the press law resolves a tap on *release*, so a drag that ends short is a click. Not `__camFree`:
  same crutch as `debugJump`.
- Cap **80° of yaw**: the three rooms are one space that ages, and a dead machine two eras back is
  still "turnable to" at 150°.
- A turn that finds nothing is **undone by measuring** — pressing the opposite arrow the same number
  of times drifts, because a press landing during a camera curve spends itself cancelling the curve.
- **Look, then touch**: a turn that finds its target gets a grace step to press it, and the grace
  lasts until a choice is made, not until the next iteration (the `listening` hold was eating it).
- **A turn is forgiven by the ledger** where a press is not. Era 4 sits at `e4|desktop|e4|board`
  from the update to the Close; under the press-cap's coarser test the walker got one turn toward the
  headset for the whole era, and the ball's hand-back is a second one.
- `osPoint` learns Room 3's docked monitor, and the `e4` order **follows the device**: desk first off
  the face, visor first on it.
- "Nothing here" now includes "nothing *new* here" — twelve presses that move nothing is the cue to
  look up, well inside the 45-press backstop.

# 4 · THE WALK, READ HONESTLY
```
Reached e4 · spine done · 282 presses over 565 steps
```
Four turns, every one load-bearing:

| turn | what it unlocked |
|---|---|
| +41.6° | the headset — `headset:worn`, **after** the tabs |
| −42° | back to the monitor |
| +41.6° | the ball's hand-back |
| −64.1° | the laptop — **the Close** |

And the ledger, for the first time, reads the era in the order it was designed:
`session:read → tab:chat → tab:record → tab:photos → tab:care → tab:extra → record:read →
care0–3:read → headset:worn → turn:turned → laptop:read`.

⚑ `turn:turned` — *"orientation: changed — view unchanged"* — fires only when the head turns while
worn. It has almost certainly never been reached by a walk before today.

# 5 · ⚑ THE LENGTH NUMBER, CORRECTED AGAIN
`ERA4_STATE_2026-09-10.md` §5 said Era 4 was 52% of the traversal and that the walker's exhaustive
reading made the number meaningless. Both were true and both are now different: **Era 4 is 211 of
565 steps — 37%.** Not because anything was cut, but because the era is now genuinely playable and
the walker no longer spends its budget on controls that did nothing. A minimum-path mode would still
be the honest measure of the *optional* path; this is the honest measure of the exhaustive one.

# 6 · OPEN, in order
1. **A minimum-path walker mode** — unchanged from the last handoff; more motivated now that the
   tabs are real.
2. **`tab0` is covered by the "Look with your device" button** when the head is turned toward the
   monitor from certain poses (the walk logs it as `covered by BUTTON … at 185,72`). The walker
   routes round it; a player on a phone may not. S117's shape, on a new surface.
3. **The browser's cursor blink** still bumps the monitor's version twice a second while the device
   is worn — harmless, but the walker holds 900 ms every time, and it is an upload for nothing.
4. The credits surface (Zsky, CC-BY). The `search` tab's four lines, for Sérgio's eye. The Close
   rework. Cosmetics — all as in the 09-10 handoff.

# 7 · THINGS THAT COST TIME TODAY
- ⚑ **A step budget is iterations, not log lines.** `--max 400` stopped a healthy walk three presses
  short of Era 3 and I read it as a regression for ten minutes. A full traversal needs ~500.
- ⚑ **`; echo "EXIT=$?"` on a background command masks the exit code** the task system reports.
- ⚑ **`debugJump('e4Place')` is the broken-jump class** — it leaves the room unfollowed (monitor
  disabled, visor never created), so a probe from it measures the flag. `BROKEN_JUMPS` should name it.
- ⚑ **Seven walks to green**, each ~25 minutes, each finding the next layer. Every one of the
  layers was real. The only way to have found them faster was to have read the ledger against the
  claim on the day the tabs were built.
