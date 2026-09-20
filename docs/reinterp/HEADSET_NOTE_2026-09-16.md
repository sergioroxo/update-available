STATUS: live

# IN-HEADSET NOTE — what S147 built for the Quest, and what only a headset can check
*2026-09-16. CLAUDE.md's definition of done asks for an in-headset note on every XR-touching
change. This is the note; the pass itself is Sérgio's. Nothing below has been in a headset — the
sandbox has none. It was verified by the desktop review (`?debug=1` → `__xrFrame.open()` /
`.press()` / `.hint()`), by the walk (the ray path the trigger feeds is the mouse's), and by
type-checking against PlayCanvas 2.6's XR API.*

## What is new in the headset
1. **The trigger presses.** Until S147 the immersive build could look and could not press — every hit
   test began from a mouse event. Now `select` on either controller sends the controller's ray through
   the same `resolveTapRay` a mouse tap uses (`src/frame/xrInput.ts` → `src/engine/app.ts`): the
   monitor, the workstation, the visor, the floor markers, the disk, the tapes, the belongings, in the
   same order and with the same guards. A driven move swallows the press, as it swallows a pointer.
2. **The grip is Esc.** `squeezestart` toggles the game menu through the same bus, so the piece pauses
   exactly as on the desktop.
3. **The menu, the map and the hint as planes.** `src/frame/xrFrame.ts`: a 0.62 m plane 0.62 m in front
   of the head (≈53° of view) with Resume · Where you are · Controls · Restart · Leave; the map view
   is the five columns; a 0.5 m plate below the view centre carries the helper's line. Both draw over
   the room (depth test off) so no desk or wall hides them. A ring on the plane shows where the ray
   lands; a row under the ray lights.
4. **Wands.** A thin line from each controller along its ray, 1.6 m, in the frame's ink.
5. **Nothing is gaze-driven.** A `gaze` input source is ignored outright; looking at a row, a marker
   or a screen for any length of time does nothing.

## What to check, in order (say what you saw)
- Does the trigger press the disk (A:\ on the desk), the monitor's buttons, a floor marker? Does a
  press during the descent do nothing (correct)?
- Squeeze the grip: does the menu plane appear in front of you at a comfortable distance and size?
  Is 24 px monospace on a 1024-wide canvas at 0.62 m readable? (≈ the size of a phone held at arm's
  length.) If it is too close, `PLANE_DIST` and `PLANE_W` in xrFrame.ts.
- Point at *Where you are* and pull the trigger: the map. Is the 16 px column text readable? If not
  the map needs a wider plane in the headset (or fewer columns per page).
- Resume, then wait 40 s without pressing: does the hint plate appear below your view, and does the
  next trigger press hide it?
- Are the wands visible against the dark rooms and the Commons? Do they obscure the visor's glass
  in Era 4? (They are 4 mm thick; `WAND_THICK`.)
- Draw calls: the Quest budget is 75; the worst measured desktop peak is 41 (the Close's travel).
  Two wands + two planes add at most four.

## Known limits, named
- The unvoiced-name setting and Credits are not on the plane (read them on the pre-fiction panel /
  the desktop menu before the headset goes on).
- The pre-fiction panel itself is DOM: Enter VR is pressed from it, on the desktop, before the
  session starts. That is by design (WebXR needs the click).
- The Quest's own menu button is the system's and cannot be used; the grip is the piece's.

## Added 2026-09-20 (S152–S153) — still never worn
- **The sentence line.** In the headset the controller's ray names what it rests on, on the hint
  plane's first line (`aimNameUnderRay`, `xrFrame.setHint`). Check: point at a tape on the shelf —
  "◈ companion tape (a prayer)"; at the racket; at a floor marker — "move: …". Over the monitor it
  says nothing (the screen names its own). The helper's line returns when the ray rests on nothing.
- **ROOTCAUSE.EXE.** A window on the 1997 monitor; every press is one turn (the trigger through
  `resolveTapRay` → `os.handleClick`). Cells are 30×26 logical px — at the seat's distance that is
  the smallest target in the piece so far; if the trigger misses cells, the fix is bigger cells
  (`CELL_W/CELL_H` in `src/desktop/apps/rootCause.ts`), not a different input.
