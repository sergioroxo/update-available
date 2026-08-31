STATUS: live

# THE WALK — 2026-08-28_JUMPED_e4Standby

> ⚑ **DIAGNOSTIC RUN, NOT A REACHABILITY PROOF.** This walk began with
> `debugJump("e4Standby")` and therefore says NOTHING about whether a player can
> reach that beat by playing. Everything after the jump is ordinary clicking, but
> the way in was the very crutch this tool exists to do without. Only an unjumped
> run is evidence.


**Reached** `e4` · spine `e1` · **8 presses** over 37 steps · 0 presses changed nothing

## THE PATH

| # | control | surface | on surface | on screen | era | phase | ledger |
|---|---|---|---|---|---|---|---|
| 4 | `e4-touch` | os | 256, 192 | 640, 584 | e4 | desktop | +1 |
| 7 | `ok` | e4.voice | 169, 267 | 526, 681 | e4 | desktop | +1 |
| 15 | `(swept) ritual` | os | 212, 332 | 582, 767 | e4 | desktop | +1 |
| 19 | `correct1` | e4.voice | 169, 253 | 526, 663 | e4 | desktop | +2 |
| 23 | `absorb` | e4.voice | 169, 276 | 526, 693 | e4 | desktop | +1 |
| 27 | `correct2` | e4.voice | 169, 253 | 526, 663 | e4 | desktop | +2 |
| 31 | `(swept) ritual` | os | 344, 318 | 755, 749 | e4 | desktop |  |
| 32 | `sure` | e4.voice | 169, 230 | 526, 633 | e4 | desktop | +1 |

## PRESSES WITH NO OBSERVABLE EFFECT

*Not the same as a dead control.* This walk can see the era, the phase, the spine step, the
queue mode, the ledger size and the set of live controls — so a press that only changes
something DRAWN (a profile chip selected, a page turned inside a modal) reads as "nothing"
here even though it worked. Read this list as a place to look, not as a defect list.

- none: every press moved something this walk can see

## SURFACES THAT PUBLISH NO HIT RECTS

*Found by the walk, not by reading the code.* These own the screen while they are open and
compute their button geometry inline inside `handleClick`, so nothing — not this tool, not
any future check — can confirm their controls are reachable. The walker had to find each one
by sweeping the canvas, and the coordinate it found is the one recorded below.

- none encountered

## CONSOLE

- clean

## STOPPED BECAUSE

- ran to the step limit without stopping
