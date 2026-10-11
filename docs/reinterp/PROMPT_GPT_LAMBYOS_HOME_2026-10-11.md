STATUS: live

# Prompt for GPT: LambyOS Home, built by GPT, tested by Claude (2026-10-11)
*His note on the first GPT render (a tasteful beige low-poly living room): "your prompts are not well done, and they
don't have the pop of color I want from BOB here… your previous was also quite weak for the quality this needs. Maybe
we should ask GPT to build that element and you then build and test and give GPT the feedback?"*

**Why the first prompts failed.** They asked for the piece's *Soft Lo-Fi* look (cosy low-poly, underdefined edges,
muted palette). That doctrine is for the 3D rooms. LambyOS Home is the PROGRAMME'S SHOWROOM, an `operable` surface: it
may glitter, charm and play, and it should look like 1995 software selling itself, loud and too happy. The new prompt
asks for Bob's real traits: saturated cartoon, thick outlines, patterned surfaces, oversized friendly objects, every
object looking pressable.

**The loop.** He pastes the prompt below into GPT. GPT returns the art and one HTML file. I port it into the piece
(replacing the coded art in src/desktop/home/homeArt.ts, keeping the working Home logic), test it at laptop and phone
size and through the walk, and write GPT a numbered feedback list. Repeat until he is happy.

**The colours.** Home gets its own palette in the theme files (src/desktop/theme/home.ts), named HOME_1995: the 16 VGA
system colours of a 1995 PC plus the softer tints a 256-colour cartoon of the period used. GPT's art is snapped to it
when ported.

---

```
You are designing and building one screen of an interactive art piece: "LambyOS Home", the front door of a fictional
1995-style home-computer operating system called LambyOS. The piece is a museum work about how conversion-practice
networks targeted queer people online from 1997 to 2026; LambyOS is the programme's own cheerful software. This
screen is the programme selling itself: a cartoon house you enter before the story begins. It must look like
mid-1990s "home" interface software (think Microsoft Bob, 1995, and the Windows 95-era illustrated home screens of
that time): LOUD, saturated, playful, a little too happy. Not tasteful, not muted, not modern.

PART 1 — THE ART (generate images)

Image A — the room backdrop, 16:9, 1920×1080:
A cartoon living room seen from a slightly exaggerated wide-angle, front-on viewpoint, as if the room is leaning in
to welcome you. Style: 1995 software illustration — chunky rounded shapes, thick dark outlines (deep plum #2E1A47,
never pure black), flat saturated colour with simple two-tone cel shading and soft airbrushed highlights, a hint of
256-colour dithering in the gradients. Everything slightly oversized and friendly, every object looking like a button
you could press. Busy, decorated surfaces: striped or floral wallpaper, a checkerboard rug, a patterned border along
the ceiling.
What is in it (as part of the backdrop, simple big shapes): a bright front door on the left (cherry red, with a little
round window and a brass knob); a big window on the back wall with a cartoon sunny sky and fluffy clouds; a mantel on
the back wall with an empty space above it; a low sideboard under it with an empty top; a tall bookshelf on the right
with chunky coloured books; a fat armchair in the right foreground seen from behind; a small side table in the left
foreground with an empty top; a floor lamp; a potted plant. Leave clear, empty spots for the objects in Image B (on
the wall left of the window, above the mantel, on the sideboard, on the side table, on one shelf).
Palette (saturated, Bob-like; use these as the base, tints of them are fine): sunflower yellow #FFD23F, cherry red
#E63946, grape purple #7B2CBF, teal #00A6A6, lime #8AC926, sky blue #4CC9F0, tangerine #FF8C42, bubblegum pink
#FF70A6, cream #FFF4D6, outlines deep plum #2E1A47. Light is bright and even, like a sunny showroom.
No people, no hands, no readable text, no real logos or brand names.

Image B — the objects, one sprite sheet, each object drawn alone on a flat pale grey background (#D9D9D9) with space
around it, same style, same outline, same light:
1. a framed notice (a sheet with a few squiggle lines, a bright frame); 2. a brass plaque on a board, blank;
3. a chunky light switch; 4. a TV remote with a few big round buttons, one tangerine; 5. a beige 1995 PC with a CRT
monitor showing a teal screen; 6. a slim tablet; 7. a rounded VR headset with its strap; 8. a VHS tape in a cardboard
sleeve with a smiling cartoon lamb on it (fluffy white wool, small dark face), no letters; 9. a fat CD-ROM software box,
no letters; 10. the mascot, LAMBY: a round, fluffy white cartoon lamb with a small dark face, big shiny eyes, rosy
cheeks and a wide, slightly-too-eager smile, standing, waving — friendly, a little uncanny in how happy it is;
11. Lamby again, a second pose, pointing; 12. an empty cartoon speech bubble, white with the plum outline.

PART 2 — THE SCREEN (one HTML file)
Build LambyOS Home as ONE self-contained HTML file (lambyos_home.html) that uses Image A as the backdrop and the
Image B objects as separate layers, embedded as data URIs (no external files, no libraries, no network requests, no
cookies or storage of any kind, no camera or microphone). It must fill a 16:9 frame and also work on a tall phone
screen (re-arrange the objects into a tall layout there; every pressable object at least 44 px).
What each object does when pressed — each opens a small plain card in a 1995 dialog style (grey window, navy title
bar, one short paragraph, a Close button); use placeholder text in a TEXT object at the top of the file, I will
replace it:
- the framed notice: the content note. It is the ONLY gate: until it has been opened and closed, the three devices'
  "Enter" buttons are disabled; they unlock 4 seconds after it closes. Show the notice glowing until it is opened.
- the plaque: what this piece is (two sentences).
- the armchair: "you can turn around" (how looking works).
- the remote: captions on/off (a toggle in its card).
- the light switch: opens the piece's menu (placeholder: a card with a button "Open the menu").
- the front door: Leave (a card with "Leave" and "Stay").
- the PC, the tablet, the headset (together on the side table): three ways to experience the piece — each card says
  how to look and has an "Enter" button (disabled until the notice is read) and a choice "The full piece (about 60
  minutes)" / "The Speedrun Version (about 20 minutes)", full piece selected by default.
- LAMBY stands in the room and talks only in speech bubbles (like Bob's helper): short cheerful lines, one at a time,
  shown when you arrive and when you press Lamby, never on a timer, hidden while a card is open, with a small × to
  dismiss. Lamby never talks about the content note, leaving, or the topic.
- the VHS tape and the CD-ROM box are present but do nothing yet.
Motion: small playful idle wiggles (Lamby bobbing, the notice glowing) — gentle, nothing flashing more than 3 times a
second; with prefers-reduced-motion, no idle motion. Every object is a real <button> reachable by keyboard Tab, in this
order: notice, plaque, armchair, remote, light switch, door, PC, tablet, headset, Lamby. Expose one function
window.lambyHome.onEnter = (device, cut) => {} that the Enter buttons call ('computer'|'tablet'|'headset',
'full'|'speedrun') — I will wire it into the piece.
Deliver: the two images, the HTML file, and a short note of anything you could not do.
```

---

## Round 1 feedback (Claude, 2026-10-11, on output/lambyos-home)
*Read in the folder: desktop-preview.png, phone-preview.png, NOTES.md, art-prompts.json, assets/ (18 layers). GPT moved
the scene to his own pixel-art study reference (a desk, not a living room) — that is right; the pop is there.*

```
Round 1 is a big step: the colour, the 1995 pixel-art study, Lamby and the three ways in are right. Keep all of
that. Changes for round 2, in order of importance:

1. THE GATE MUST BE THE FIRST THING. The content note is the only gate, but it looks like one object among twelve
   (a small frame top-right). On arrival: the notice pulses with a warm marigold (#FF8C42) edge (no faster than once
   a second), Lamby uses its POINTING pose aimed at it, and the three devices show as clearly locked (dimmed, a small
   padlock) until the notice has been opened and closed (then the 4-second unlock, as now).
2. FAR FEWER LABELS. Twelve grey label tags make it read like a form; Bob had none. On a laptop, show a label only on
   hover or keyboard focus — EXCEPT the three devices and the content note, which keep visible labels. On a phone
   (no hover) keep only those four labels; the other objects are discovered by touch.
3. THE DOOR IS LEAVE, SO SHOW THE DOOR. On the laptop layout the red front door is cut off at the left edge; on the
   phone "Leave" floats as a grey label over the window. Make the door a full, visible object (it is the room's exit;
   Leave must always be findable). The bottom bar may keep Leave too.
4. BUG: a label is clipped at the right edge of the laptop layout (it shows only "nd").
5. WHOSE ROOM IT IS. The title bar says "YOUR UPDATE HAS FAILED · PC Simulator" — that is the art piece's title (the
   frame). Inside the scene, the PROGRAMME should brand its showroom: a "LambyOS Home" sign, banner or welcome mat in
   the pixel art itself (drawn lettering is fine here — it is the fictional brand, not a real one). Keep the piece's
   title bar small.
6. THE PHONE LAYOUT IS A STACK, NOT A ROOM. On the tall screen the objects are listed down a scrolling, sliced
   backdrop (the window frame is chopped up). Make a second backdrop composed for a TALL 9:16 screen (1080×1920) —
   the same room, re-arranged vertically — with the objects placed in it, and no scrolling.
7. ONE PIXEL GRID. Generated pixel art mixes pixel sizes. Draw the room and every layer on ONE native grid: the room
   at 480×270 (laptop) and 270×480 (phone), each shown at an integer scale; the objects at that same pixel size, so
   they belong to the room. Plum outlines one native pixel thick.
8. WEIGHT. The HTML is 9.5 MB (each layer 120–500 KB). Deliver the layers as indexed (256-colour) PNGs at the native
   grid size — the whole set should be well under 1.5 MB.
9. EXTRA OBJECTS. The clock, calendar and books are good, playful extras — but they must not add reading. Clock and
   calendar: keep them as toys (no card). Books: no cards for now; keep ONE book on the right shelf visibly special
   (glowing spine, a bookmark) and disabled — it will become the Lexicon later.
10. A LAYOUT FILE. Alongside the HTML, give me layout.json: for each object, its id, its rectangle in native pixels
   for the laptop and for the phone backdrop, and its Tab order. I place the layers in the piece from that.
11. MUSIC: keep it (off until chosen, stops on Enter or Leave). Note in NOTES.md that it was generated with Web Audio
   by you, so it can be credited.
```
