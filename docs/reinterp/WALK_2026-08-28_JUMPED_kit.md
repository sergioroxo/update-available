STATUS: live

# THE WALK — 2026-08-28_JUMPED_kit

> ⚑ **DIAGNOSTIC RUN, NOT A REACHABILITY PROOF.** This walk began with
> `debugJump("kit")` and therefore says NOTHING about whether a player can
> reach that beat by playing. Everything after the jump is ordinary clicking, but
> the way in was the very crutch this tool exists to do without. Only an unjumped
> run is evidence.


**Reached** `e1` · spine `e2` · **32 presses** over 53 steps · 14 presses changed nothing

## THE PATH

| # | control | surface | on surface | on screen | era | phase | ledger |
|---|---|---|---|---|---|---|---|
| 4 | `next` | kit | 385, 326 | 809, 759 | e1 | desktop | +1 |
| 5 | `next` | kit | 385, 326 | 809, 759 | e1 | desktop |  |
| 6 | `next` | kit | 385, 326 | 809, 759 | e1 | desktop |  |
| 7 | `next` | kit | 385, 326 | 809, 759 | e1 | desktop | +1 |
| 8 | `next` | kit | 405, 326 | 835, 759 | e1 | desktop | +1 |
| 10 | `(swept) kit` | os | 146, 318 | 496, 749 | e1 | desktop | +1 |
| 12 | `(swept) irc` | os | 366, 220 | 784, 621 | e1 | desktop | +2 |
| 13 | `irc (known control)` | irc | 366, 220 | 784, 621 | e1 | desktop |  |
| 15 | `(swept) irc` | os | 234, 290 | 611, 712 | e1 | desktop | +2 |
| 16 | `irc (known control)` | irc | 234, 290 | 611, 712 | e1 | desktop |  |
| 18 | `(swept) irc` | os | 190, 304 | 554, 731 | e1 | desktop | +1 |
| 19 | `irc (known control)` | irc | 190, 304 | 554, 731 | e1 | desktop |  |
| 21 | `(swept) irc` | os | 190, 304 | 554, 731 | e1 | desktop | +1 |
| 22 | `irc (known control)` | irc | 190, 304 | 554, 731 | e1 | desktop |  |
| 24 | `(swept) irc` | os | 190, 304 | 554, 731 | e1 | desktop | +1 |
| 25 | `irc (known control)` | irc | 190, 304 | 554, 731 | e1 | desktop |  |
| 27 | `(swept) irc` | os | 190, 304 | 554, 731 | e1 | desktop | +1 |
| 28 | `irc (known control)` | irc | 190, 304 | 554, 731 | e1 | desktop |  |
| 30 | `(swept) irc` | os | 388, 304 | 813, 731 | e1 | desktop | +2 |
| 31 | `irc (known control)` | irc | 388, 304 | 813, 731 | e1 | desktop |  |
| 33 | `(swept) irc` | os | 388, 318 | 813, 749 | e1 | desktop | +1 |
| 34 | `irc (known control)` | irc | 388, 318 | 813, 749 | e1 | desktop |  |
| 36 | `(swept) irc` | os | 234, 304 | 611, 731 | e1 | desktop | +1 |
| 37 | `irc (known control)` | irc | 234, 304 | 611, 731 | e1 | desktop |  |
| 39 | `(swept) irc` | os | 102, 318 | 439, 749 | e1 | desktop | +2 |
| 40 | `irc (known control)` | irc | 102, 318 | 439, 749 | e1 | desktop | +1 |
| 41 | `irc (known control)` | irc | 102, 318 | 439, 749 | e1 | desktop |  |
| 43 | `(swept) irc` | os | 124, 248 | 467, 657 | e1 | desktop | +1 |
| 44 | `irc (known control)` | irc | 124, 248 | 467, 657 | e1 | desktop |  |
| 46 | `(swept) irc` | os | 476, 346 | 928, 785 | e1 | desktop | +1 |
| 47 | `irc (known control)` | irc | 476, 346 | 928, 785 | e1 | desktop |  |
| 51 | `(swept) irc` | os | 36, 304 | 352, 731 | e1 | desktop |  |

## PRESSES WITH NO OBSERVABLE EFFECT

*Not the same as a dead control.* This walk can see the era, the phase, the spine step, the
queue mode, the ledger size and the set of live controls — so a press that only changes
something DRAWN (a profile chip selected, a page turned inside a modal) reads as "nothing"
here even though it worked. Read this list as a place to look, not as a defect list.

- step 5: `next` on kit
- step 6: `next` on kit
- step 13: `irc (known control)` on irc
- step 16: `irc (known control)` on irc
- step 19: `irc (known control)` on irc
- step 22: `irc (known control)` on irc
- step 25: `irc (known control)` on irc
- step 28: `irc (known control)` on irc
- step 31: `irc (known control)` on irc
- step 34: `irc (known control)` on irc
- step 37: `irc (known control)` on irc
- step 41: `irc (known control)` on irc
- step 44: `irc (known control)` on irc
- step 47: `irc (known control)` on irc

## SURFACES THAT PUBLISH NO HIT RECTS

*Found by the walk, not by reading the code.* These own the screen while they are open and
compute their button geometry inline inside `handleClick`, so nothing — not this tool, not
any future check — can confirm their controls are reachable. The walker had to find each one
by sweeping the canvas, and the coordinate it found is the one recorded below.

- `kit` — its control was at 146, 318 on the OS canvas
- `irc` — its control was at 366, 220 on the OS canvas

## CONSOLE

- clean

## STOPPED BECAUSE

- ran to the step limit without stopping
