STATUS: live

# THE WALK — 2026-08-31_JUMPED_update4

> ⚑ **DIAGNOSTIC RUN, NOT A REACHABILITY PROOF.** This walk began with
> `debugJump("update4")` and therefore says NOTHING about whether a player can
> reach that beat by playing. Everything after the jump is ordinary clicking, but
> the way in was the very crutch this tool exists to do without. Only an unjumped
> run is evidence.


**Reached** `e4` · spine `e4` · **12 presses** over 32 steps · 6 presses changed nothing

## THE PATH

| # | control | surface | on surface | on screen | era | phase | ledger |
|---|---|---|---|---|---|---|---|
| 4 | `update-now` | updateApp | 360, 246 | 776, 655 | e1 | desktop |  |
| 5 | `eula-readon` | updateApp | 298, 349 | 695, 789 | e1 | desktop |  |
| 6 | `(swept) ritual` | os | 278, 346 | 669, 785 | e1 | desktop |  |
| 7 | `eula-agree` | updateApp | 418, 349 | 852, 789 | e1 | desktop |  |
| 8 | `icon-a` | os | 29, 24 | 343, 364 | e1 | desktop |  |
| 9 | `(swept) ritual` | os | 366, 304 | 784, 731 | e4 | desktop | +4 |
| 12 | `ok` | e4.voice | 169, 267 | 454, 609 | e4 | desktop |  |
| 13 | `who` | e4.voice | 169, 290 | 454, 658 | e4 | desktop |  |
| 14 | `silent` | e4.voice | 169, 313 | 454, 708 | e4 | desktop | +1 |
| 25 | `(swept) ritual` | os | 124, 304 | 467, 731 | e4 | desktop | +1 |
| 29 | `correct1` | e4.voice | 169, 253 | 454, 579 | e4 | desktop |  |
| 30 | `why1` | e4.voice | 169, 276 | 454, 628 | e4 | desktop |  |

## PRESSES WITH NO OBSERVABLE EFFECT

*Not the same as a dead control.* This walk can see the era, the phase, the spine step, the
queue mode, the ledger size and the set of live controls — so a press that only changes
something DRAWN (a profile chip selected, a page turned inside a modal) reads as "nothing"
here even though it worked. Read this list as a place to look, not as a defect list.

- step 5: `eula-readon` on updateApp
- step 8: `icon-a` on os
- step 12: `ok` on e4.voice
- step 13: `who` on e4.voice
- step 29: `correct1` on e4.voice
- step 30: `why1` on e4.voice

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
