STATUS: live

# THE WALK — 2026-08-31_JUMPED_update2

> ⚑ **DIAGNOSTIC RUN, NOT A REACHABILITY PROOF.** This walk began with
> `debugJump("update2")` and therefore says NOTHING about whether a player can
> reach that beat by playing. Everything after the jump is ordinary clicking, but
> the way in was the very crutch this tool exists to do without. Only an unjumped
> run is evidence.


**Reached** `e2` · spine `e2_s1` · **11 presses** over 18 steps · 3 presses changed nothing

## THE PATH

| # | control | surface | on surface | on screen | era | phase | ledger |
|---|---|---|---|---|---|---|---|
| 4 | `icon-a` | os | 29, 24 | 343, 364 | e1 | desktop |  |
| 5 | `update-now` | updateApp | 360, 246 | 776, 655 | e1 | desktop | +1 |
| 6 | `eula-readon` | updateApp | 300, 311 | 698, 740 | e1 | desktop |  |
| 7 | `eula-agree` | updateApp | 400, 311 | 828, 740 | e1 | desktop |  |
| 8 | `icon-send` | os | 29, 216 | 343, 615 | e2 | desktop | +1 |
| 9 | `icon-send` | os | 29, 216 | 343, 615 | e2 | desktop |  |
| 10 | `icon-send` | os | 29, 216 | 343, 615 | e2 | desktop |  |
| 12 | `icon-send` | os | 29, 216 | 343, 615 | e2 | desktop |  |
| 14 | `icon-send` | os | 29, 216 | 343, 615 | e2 | desktop |  |
| 15 | `lamby-hello` | os | 370, 317 | 789, 748 | e2 | desktop | +1 |
| 16 | `lamby-begin` | os | 370, 317 | 789, 748 | e2 | desktop | +1 |

## PRESSES WITH NO OBSERVABLE EFFECT

*Not the same as a dead control.* This walk can see the era, the phase, the spine step, the
queue mode, the ledger size and the set of live controls — so a press that only changes
something DRAWN (a profile chip selected, a page turned inside a modal) reads as "nothing"
here even though it worked. Read this list as a place to look, not as a defect list.

- step 9: `icon-send` on os
- step 10: `icon-send` on os
- step 12: `icon-send` on os

## SURFACES THAT OWN NO HIT RECTS AT ALL

*Structural, not a snapshot.* These own the screen while open and hold no rect field of any
kind — their button geometry is computed a second time inside `handleClick`, so the numbers
exist twice and nothing can check the copies agree. `kit`'s two copies had already drifted by
40 px. A surface that is merely EMPTY right now (Caleb between beats, L while she speaks) is
not listed here — that is the piece working, and an earlier version of this report wrongly
conflated the two. The walker finds these by sweeping; the coordinate it found is below.

- none encountered

## CONSOLE

- clean

## STOPPED BECAUSE

- ran to the step limit without stopping
