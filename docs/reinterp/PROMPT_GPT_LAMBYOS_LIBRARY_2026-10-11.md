STATUS: live

# Prompt for GPT: LambyOS Home — The Library (the end of the visit, on the Close's computer) (2026-10-11)
*His idea (2026-10-11): "I was talking about the LambyOS Home for the computer at the end that gets you to the receipt,
etc. Wouldn't it make sense to finish there? This version inside the computer, with a different layout like a library
where the Lexicon and [restart] would make more sense? And 4 thematic computers for each era." So the piece ends ON
Daniel's computer at the Close: its screen becomes LambyOS Home's library, drawn in the same style as the front door
(round 4), and everything the end offers lives there. Because it is drawn on the computer in the 3D room, it also works
in the headset. Same loop as the front door: he pastes this to GPT; GPT builds output/lambyos-library/; Claude reviews,
writes the next round's feedback here, and ports it.*

Attach with the prompt: docs/reinterp/refs/lambyos_home_bob_style_reference_2026-10-11.png and
output/lambyos-home/round4/laptop-preview.png (the front door it must match).

---

```
You made "LambyOS Home" (round 4, attached), the cheerful 1995-style front door of an art piece about how
conversion-practice networks targeted queer people online from 1997 to 2026. Now make its second room, in EXACTLY the
same style, palette, light and quality: "LambyOS Home — The Library". It is where the visit ENDS: it appears on the
screen of an old computer at the very end of the piece, after the story is over. The programme is still cheerful and
too happy; the room is a showroom library where everything from the visit is filed away.

PART 1 — THE ART (as big as possible: 3840×2160; generate at the highest size you can, upscale cleanly where needed,
and keep the untouched originals in sources/). Lossless PNG, separate layers, like round 4. Landscape 16:9 only (it is
shown on a computer screen, also inside a VR headset).

Image A — the room backdrop: a cosy, saturated 1995 cartoon LIBRARY seen front-on: tall wooden bookshelves with chunky
coloured books, a rolling ladder, a round window with the same sunny countryside, warm lamps, a patterned rug, the
same thick deep-plum outlines (#2E1A47), cel shading and soft highlights as round 4. A painted wooden sign over the
middle reading "LambyOS Home — Library" (drawn lettering is fine; it is the fictional brand). Leave clear spots for
the objects below. No people, no readable text other than the sign, no real logos.

Image B — the objects, each a separate transparent layer at the same scale:
1. THE LEXICON: a big, important book on a reading stand (lectern) in the centre, glowing softly, with a ribbon
   bookmark — the star of the room.
2. FOUR ERA COMPUTERS, each on its own little desk or plinth along the front, each unmistakably of its year:
   (a) 1997 — a beige Windows-95-era PC with a curved CRT, a floppy drive, a little dot-matrix sticker;
   (b) 2003 — a silver-and-black XP-era tower with a first flat LCD screen and a round webcam on top;
   (c) 2016 — a slim office workstation with a widescreen monitor and a smartphone on a stand beside it;
   (d) 2026 — a sleek white all-in-one with a VR headset resting next to it.
   Each screen shows a soft glowing colour, no text. Each should look pressable.
3. THE RECEIPT: a till-roll receipt printer on a small counter, with a long curling paper receipt (squiggle lines,
   no readable text).
4. A FRAMED PLAQUE on the wall (for "about this piece"), blank brass plate.
5. THE FRONT DOOR: the same cherry-red door with the round window as round 4 (it is Leave).
6. A big friendly START AGAIN object: an old-fashioned brass service bell on the counter OR a big round lamb-shaped
   button — your choice, pressable-looking.
7. LAMBY, the mascot from round 4, in two poses: waving; and holding a little book proudly.
8. An empty speech bubble, as in round 4.

PART 2 — layout.json: for each object its id, its rectangle in the 3840×2160 coordinates, its visual bounds, and a
Tab order: Lexicon, 1997, 2003, 2016, 2026, receipt, plaque, start again, door, Lamby. Also deliver a preview PNG with
the layers placed.

Do NOT build a web page this time; the piece draws the layers itself. Note anything you could not do in NOTES.md.
Put everything in output/lambyos-library/round1/.
```
