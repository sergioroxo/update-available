STATUS: live

# THE WALK — 2026-09-01_JUMPED_e4Standby

> ⚑ **DIAGNOSTIC RUN, NOT A REACHABILITY PROOF.** This walk began with
> `debugJump("e4Standby")` and therefore says NOTHING about whether a player can
> reach that beat by playing. Everything after the jump is ordinary clicking, but
> the way in was the very crutch this tool exists to do without. Only an unjumped
> run is evidence.


**Reached** `e4` · spine `e1` · **0 presses** over 21 steps · 0 presses changed nothing

## THE PATH

| # | control | surface | on surface | on screen | era | phase | ledger |
|---|---|---|---|---|---|---|---|

## PRESSES WITH NO OBSERVABLE EFFECT

*Not the same as a dead control.* This walk can see the era, the phase, the spine step, the
queue mode, the ledger size and the set of live controls — so a press that only changes
something DRAWN (a profile chip selected, a page turned inside a modal) reads as "nothing"
here even though it worked. Read this list as a place to look, not as a defect list.

- none: every press moved something this walk can see

## CONTROLS PUBLISHED AS LIVE THAT DID NOTHING

*Pressed, and not one pixel or field changed.* The usual cause is a modal above them: while
a provotype is open `os.handleClick` delegates every click to it and returns, yet the kit
underneath goes on registering its NEXT rect and IRC its replies. Those controls are
advertised as reachable while being physically unreachable — the same class as a button
drawn where nothing can press it.

- none: every published control did something

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

- STUCK. 1 hit rect is registered and none can be aimed at — unlock (phone, era3-device-phone is disabled) (at `e4` / `desktop` / `e1`)
