STATUS: live

# THE PROGRESSION LAW — the sandbox, the gate, and the glitch
*2026-09-17. Sérgio: "the progression of this is quite limited and not very practical. Every event
should be able to be followed and be playable… there is too much constraint on the narrative flow."
He forwarded a three-part architecture (global states = eras; local sandbox = the actions inside an
era; a sequence gate whose trigger is the glitch). This document says what of that the piece already
has, what it does wrong, and the rule from here.*

## 1 · What exists, honestly
- **Global states exist.** `narrative/spine.ts` is the era state machine (e1 → e2 → e3 → e4 → close);
  the updates are its transitions, and they are the glitch (SCRIPT_UPDATE v0.5 §1).
- **Event listeners exist.** Every act files into the ledger; the map, the spine and the record read
  it. That IS the "if this then this" — in memory, wiped on exit (the no-storage invariant).
- **The sandbox does NOT exist as a rule.** Inside an era the desk is *partly* free (the icons are
  there) but the story advances on TIMERS and on the SPINE, not on what the player has seen: the
  Family Form is on the desk before Rob's call; the DM arrives before the channel is read; Restorify
  opens on a clock; the "source file" icon appears on its own; Era 3's update armed over an open job
  because the phone's "ignored" path advanced the stage on work done; Era 4's photos step
  auto-advanced to care. Every one of those is the same fault: **a beat fired on a clock or on a
  count, not on the player having met the previous beat.**
- **The gate is not visible.** The player cannot tell what ends an era; things "appear out of
  nowhere" because the gate is hidden inside the spine's timers.

## 2 · The law
1. **Inside an era, everything on the desk is a sandbox.** Every app, file, tape, song and game the
   era offers can be opened at any time and put down at any time; none of them blocks another; none
   of them changes the era's ending. They exist to be lived in (Gemini's "atmosphere before the
   forced jump" — here: the apparatus's ordinary day).
2. **Some of them are BEATS.** A beat is a thing the era needs the player to have *seen* — not done
   in a particular way, seen. The map's beats (`data/strings/map.json`) are the list, per era, in
   the order the story prefers; the player may take them in any order the sandbox allows.
3. **A beat opens on the previous beat being seen, never on a clock.** The DM comes after the channel
   has been read; the Family Form after Rob's call; the phone's message after the first job; the
   session after the five steps are *understood*. A clock may DELAY a beat (a pause for breath); it
   never *causes* one. (The click/tap law already forbids pressure on the clock; this extends it.)
4. **The gate is the last beat, and it is named.** An era ends when its required beats have been
   seen — and the map shows exactly which. The player can always open the map and see "3 of 7".
5. **The glitch fires only when the gate is met AND nothing is open.** No update over an open job, an
   open chat, a held phone or a running video. The apparatus's failure waits for the player to put
   the thing down — and, if they do not, it waits. (Era 3's phone bug, R3-73, is the first case.)
6. **Optional beats stay optional and stay visible.** The wall, the tapes, the racket, the record chip:
   marked ○ on the map, never required, never hidden.

## 3 · What this changes, per era (the ids in OPEN_ITEMS.md)
- **1997:** the kit's First Steps become the beat list on screen (R3-19); the Family Form gated on
  Rob (R3-13); the DM gated on the channel (R3-26); the racket and the tapes as optional sandbox
  with a glow (R3-38, W-E1); the update on the diary — and only once the IRC and the kit are closed.
- **2003:** Restorify's check-in on the Lamby greeting being seen; the messenger's dot on the
  check-in; PureMail after the thread (R3-55); the residue as the gate; the update waits for the
  desktop to be clear (R3-40).
- **2016:** sign-in → board (sandbox of seven jobs) → the phone's message after the first job → the
  vote → the cascade as the gate; the update never over an open job (R3-73, R3-82).
- **2026:** L introduces itself (R3-96) → the search as a results page (R3-89) → each step is a
  conversation turn, none auto-advances (R3-98, R3-93) → the headset only after the fifth → the
  session → the link → the world → the termination is the gate.

## 4 · How it is built
- `witness/map.ts` already holds the beat conditions per era. The spine reads THEM instead of its
  own timers: `gateMet(era) = every required beat done`; `clear() = nothing open on any surface`.
- Each surface that opens a beat asks `beatSeen(prev)` before it offers the next (a pure read of
  the ledger, the way the guide already reads conditions).
- The glitch shader stays what it is (the update ritual); it moves later, never earlier.
- The walk proves it: a run that presses out of order must still end; a run that opens a job and
  waits must never see the update until the job is put down (a new walker assertion).

## 5 · What this does NOT change
- No WASD, no free walking: the sandbox is the desk and the room's seats, not a world.
- The frame never plays; the map explains, the fiction does not.
- The updates are still the apparatus's documented failures, never the player's press.
