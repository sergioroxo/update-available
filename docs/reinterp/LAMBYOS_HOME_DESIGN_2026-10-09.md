STATUS: draft

STATUS: live

*(Two status lines: `draft` is this document's state, as asked; `live` is the line tools/check-spec.mjs C5 accepts — it knows only live | history-only | superseded-by — and means "current, not superseded".)*

# LambyOS Home — design draft (2026-10-09)

*W1-A1, A2, A4, A5, A7 (docs/reinterp/WALKTHROUGH_1_2026-10-08.md §A). A design document only: nothing here is
built, and no code or data changes with it. Every ethics call in it is listed in §6 for Sérgio; nothing in it is
decided on his behalf except the name, which is his (A7: "It can be LambyOS Home").*

**What it is, in one paragraph.** LambyOS Home is the programme's own front door, the way Bob was Windows': a cosy
illustrated living room you arrive in before the fiction starts. Each object in the room teaches one thing. The
room belongs to the programme (LambyOS, "running on the Lamby™ controlling system", data/strings/opening.json), so
it is allowed to charm. But the things a visitor must be told plainly (what the piece is, the content note, how to
look, how to leave) open as the **frame's** plain cards over the room, never in the programme's voice. It replaces
the current front door (src/desktop/orientingCard.ts, data/strings/orientingCard.json) as the first thing on a
fresh reinterp load, and it reuses that door's words, which are already the right ones.

**What it answers.** The colleague "did not understand how the narrative plays out, and the opening panel does not
explain the project" (A1), and "the BOB should explain the way to play" (C14). Today the door is one dense panel:
premise, about, content note, name note, three control cards, captions, Leave. Home spreads the same content across
a room, one object per thing, so it reads as a place rather than a form.

**A recommendation that shapes the rest: Home is a flat, illustrated room, not the 3D room.** It is a DOM scene,
mounted where the orienting card is mounted now (before the engine starts, beside the game menu), made of one
backdrop and separate object layers (the A2 art: §5). Three reasons:
1. **The look mode is chosen in Home.** The visitor cannot already be in the 3D room in a mode they have not
   picked yet. A flat room works the same on a laptop, a phone and in a headset's own browser, before any of the
   three ways to look exists.
2. **The art pipeline is backdrop + layers.** That is what Bob was (a painted room with live objects on it), and
   it is what the lead asked GPT to draw (A2).
3. **It does not touch the one UI surface law.** The 3D room is staging and the desktop canvas holds every
   interaction in the fiction. Home is pre-fiction, like the orienting card, which already lives in the DOM.

---

## 1 · What the visitor learns, in what order, and in whose voice

### The order

Light suggests the order; nothing forces it except one ethics gate.

| # | What they learn | Where (§2) | Voice | Required? |
|---|---|---|---|---|
| 0 | **You can leave, from the first frame.** | the front door | frame | always live, never required |
| 1 | **The content note** (and the name note) | the notice by the door | frame | **yes**: it arms everything after it |
| 2 | **What the piece is**: one machine, one room, thirty years, different lives | the plaque over the mantel | frame | no |
| 3 | **What the topic is, in the apparatus's own voice** | the VHS tape (the advert) | programme | no, and only after 1 |
| 4 | **The words they used, and the reasons they gave** | the Lexicon on the shelf | the Lexicon's own | no |
| 5 | **The one bodily ask: the turn** | the armchair | frame | no |
| 6 | **Captions** | the remote control | frame | no |
| 7 | **The menu** (Esc or the corner button: pause, controls, credits, Leave) | the light switch | frame | no |
| 8 | **The three ways to look, and their controls** — computer, phone/tablet, headset | the three devices on the side table | frame | **choose one**: this is the way in |

**The shortest path is three presses:** notice → a device → its enter button, behind the existing 4-second
arm-delay (orientingCard.ts `ARM_DELAY_MS`, "enter can never be instant"). Every other object is there for whoever
wants it, in any order.

**The one gate.** The tape and the three enter buttons stay dim until the notice has been opened. This is not a
quest. It is the content note's existing law: content before consent is the thing the arm-delay exists to prevent,
and the advert is content (the apparatus's tactics and language). The gate is shown, not explained: until then the
tape sits in its sleeve and the enter buttons are drawn dead (R3-26's convention: shown to be dead, not hidden). The
notice is the only thing in the room that is lit from the start.

### Frame voice vs programme voice

The rule is the orienting card's, extended to a room: **"the chrome is the machine's, the words are the frame's"**
(its `_doc`).

**The frame** (plain cards over the room; functional, undecorated; the words already in orientingCard.json and
gameMenu.json, reused verbatim):
- the content note and the name note (`contentNote`, `nameNote`; ethics surfaces, kept whole);
- the premise (`premise`, the session brief's own wording, verbatim) and `about`;
- the controls for each way of looking (`cards.desktop|phone|headset`), the menu line, captions, Leave and its
  note (`gameMenu.leaveNote`).

**The programme** (LambyOS; register `operable`, so it may glitter, charm and play inside its own surfaces):
- the room itself, its signage (the doormat's WELCOME HOME, the tape's sleeve, the logo);
- the advert on the tape (§2).

**Neither: the Lexicon** keeps its own split. It has the Lexicon's plain sentences, plus the seller's Word of the
Day lines, which mock only the pitch (lexicon.json `_doc`).

**What the frame never does here** (CLAUDE.md "the frame never plays"):
- no checklist, no "3 of 9 explored", no tick on an object you have opened, no badge, no score, no unlock fanfare;
- an opened object looks the same as an unopened one;
- the frame never speaks in the programme's chrome: no Lamby speech bubble ever carries a frame word;
- the programme never carries a frame word either: the content note is never "presented by LambyOS".

**Nobody talks in Home.** Bob had Rover; Home has no guide character. R28 §2: Era 1 has NO assistant character,
and the Lamby conductor debuts with the Era-2 update. Home comes before Era 1, so Lamby appears only as a picture
(the logo, the tape's sleeve), and nothing in the room addresses the visitor by voice except the advert, which is a
recording. (§6 Q1 asks whether he wants it otherwise.)

**Home files nothing.** Nothing pressed in Home goes into the ledger or the witness record. The record still
begins where it begins today, at the profile's first pick (opening.json `witness_profile_init`). If Home filed the
advert ("subject viewed promotional material"), it would become part of the apparatus, and the frame would be
watching the visitor. Only two view settings carry over: the chosen look mode and `ledger.view.captions`, both in
memory, both as they are now. (§6 Q2.)

---

## 2 · The objects, and what each one does when pressed

One object = one thing to learn. Each opens one card or does one thing, and every card closes with one press (its
own Close, or a press outside it). Nothing opens by looking, by hovering or by waiting.

| Object | Pressed, it… | Teaches | Voice | Words it uses |
|---|---|---|---|---|
| **The front door**, with a WELCOME HOME mat | opens the Leave note, with Leave and Stay | that leaving always works | frame (the mat is the programme's) | `gameMenu.leaveNote`, `leaveLabel`; the left page as now (`leftTitle` "You left.", `leftBody` "Nothing was kept.") |
| **The notice**, framed on the wall by the door: "Before you come in" | opens the content-note card. Its Close starts the 4 s arm. | the content note; the name note | frame | `contentNote`, `nameNote` (verbatim) |
| **The plaque** over the mantel, brass on wood | opens "What this is": premise, about, who made it, a Credits line | the piece | frame | `premise` (verbatim), `about`, `subtitle`, `versionTag`; Credits opens the menu's Credits & attributions |
| **The VHS tape** in its sleeve on top of the VCR, under the TV | slides into the VCR and the advert plays on the TV (below). Stop/Eject is on the VCR and always works. | the topic, in the apparatus's own voice | programme | the script below |
| **The Lexicon** on the bookshelf: a big-box CD-ROM, "The Lexicon — Multimedia Edition" (A5) | opens the Lexicon, at The Words | the words they used, and the reasons they gave | the Lexicon's own | lexicon.json, as at the Close (src/room/lexicon.ts) |
| **The armchair**, facing the room | turns round, a quarter-turn at a time, to show the back of the room, then turns back. Reduced motion: a cut. | the turn | frame | `chooseNote`: "You never walk, and nothing is timed — turning to look is the only thing your body has to do." |
| **The remote control** on the chair's arm | its CC button toggles the sound captions; the card says what it does | captions | frame | `captionsLabel`, `captionsNote` |
| **The light switch** by the door | opens the frame's menu, exactly as Esc does; the room dims behind it like a paused room | that the menu exists, everywhere | frame | `menuLine`; the menu itself (gameMenu.json) |
| **The mouse on its mat** (side table) | opens "On this computer": its controls and **Log in** | look mode 2, drag-to-look | frame | `cards.desktop` |
| **The tablet/phone** (side table) | opens "On a phone or tablet": its controls and **Enter — turn the device**. That button is the real gesture iOS needs before it grants orientation (CLAUDE.md, look-mode 3). | look mode 3, gyro-to-look | frame | `cards.phone`, `asking`, `denied` |
| **The headset** (side table) | opens "In a headset": its controls and **Enter VR**. Pressable only when this browser has confirmed an immersive session; otherwise drawn dead with `unavailable`. | look mode 1, the head | frame | `cards.headset` |

**Why these objects.** Each one is a thing a 1997 living room had and that does, in the room, what it does in
life. A door is how you leave. A notice is what you read before entering. A remote turns the captions on. A light
switch pauses. A chair turns. The devices are how you will look. Nothing needs a label to be understood, so the
cards stay short (W1-B1: less text, more image).

**The Lexicon at the start (A5).** At the Close it shows The Words, The Reasons and Your Words. In Home, Your Words
is empty (`yoursNone`), because the visitor has met nothing yet. Two options:
- **(a)** show it as it is, with Your Words empty, a quiet promise that the book fills as you play;
- **(b)** show only The Words and The Reasons in Home, and open Your Words at the Close.

I recommend **(a)**: it costs nothing and tells the truth about what the piece will do. It is also a spoiler of
sorts (the words are the piece's vocabulary, with each claim's status), so §6 Q4 is his.

### The advert: "LambyOS — Welcome Home" (VHS, about 75 s)

**Brief (A4).** A weird explainer of the topic in the programme's own voice ("come join us in the lives of those
who struggle"), like Theme Hospital's intro films. Satire only inside the perpetrator's self-presentation, and it
must collapse at its end. No real organisations or people. Every mark in it is one the piece already uses or a new
invented one (LambyOS, TriedPath Fellowship, Un-Walk, Restorify, GracePlatform, Continuity). No queer person is
shown being "fixed", and no person is a punchline. The figures are hands, backs and empty rooms. The joke is the
programme's pitch and only the pitch.

**Look.** The piece's own Soft Lo-Fi room art, low-poly and warm, shot like a 1997 infomercial: soft glow, VHS
chroma bleed, a station-ident sting. Captioned throughout. The narrator is the apparatus's voice, so build-time TTS
is allowed (render.py's `register: apparatus`). Sounds named in the strip when captions are on.

| Time | Picture | Narrator (programme voice) / on-screen type |
|---|---|---|
| 0:00–0:05 | VCR blue, ▶ PLAY, tracking lines settle. A pixel lamb hops a fence; the LambyOS chime. Type: **LambyOS™ — Home Edition** | *(chime)* |
| 0:05–0:13 | A kitchen table at night, low-poly, warm lamp. A mother's hands slide a floppy disk across to a teenager's hands. No faces. | "Does someone you love seem… far away? Since 1997, we have been there for families. Quietly. Gently. At the kitchen table." Type: **Over 30 years of care.*** |
| 0:13–0:27 | A product parade, each item turning on a pedestal with a cheerful sting: a cassette, a floppy disk, a CD-ROM with a little flame for a streak, a phone with a glossy app, a headset in a gift box. | "A tape, for when you don't have the words. A disk, for your first steps. A streak, to keep you going. A platform, to polish your story. And now — immersive sessions. Headset included." |
| 0:27–0:41 | "How it works": a jolly flowchart drawn on as he speaks, each box popping with a ding: **a feeling → a NAME → a ROOT CAUSE → a MENTOR → a NEW YOU**. | "It's simple. A feeling is just a feeling. We give it a name. We find where it came from. We send someone who has been where you are. And out the other side comes — the new you!" |
| 0:41–0:53 | Four empty rooms, a slow dissolve between them: a 1997 bedroom with a CRT on; a 2003 desk; a 2016 phone glowing on a duvet; a 2026 headset on a made bed. Each machine is on. Nobody is there. | "Come join us in the lives of those who struggle. One room. One machine. Thirty years. And every year, an update — because we never stop improving." |
| 0:53–1:03 | Pack shot: the lamb logo on a soft gradient. The slogan builds word by word. | "LambyOS. Everything is set up already. You don't need to do anything." Type: **Everything is set up already.** (the boot's own line, opening.json `o2_boot_lines`) |
| 1:03–1:10 | The small print scrolls up under the logo, too fast to read; the narrator reads it fast, in the disclaimer voice. | "LambyOS is not a medical service. LambyOS is a community of intent. We keep everything, so you never have to start again. Results not typical." |
| 1:10–1:16 | **The collapse.** The scroll slows to reading speed by itself, as if the tape were stretching. The narrator's voice slows with it and stops selling. | "Results not typical. No result has been shown to be typical. No result has been shown. What has been shown is —" |
| 1:16–1:18 | The tape chews: the picture rolls once (no strobe; reduced motion: a straight cut), the lamb's smile holds a frame too long, then VCR blue: **■ STOP**. | *(the tape's mechanism)* |
| 1:18 → | The TV holds VCR blue. Over it, the frame's plain card (frame voice, not the programme's): | **"That was the programme's own advert. The practices it sells have no evidence of benefit, and a documented risk of harm."** Close · Play again |

*The asterisk on "Over 30 years of care.\*" never resolves. The small print that would explain it is the part the
tape cannot finish.*

**Where the collapse's claim comes from.** The closing card states only what the piece's knowledge base already
documents. Professional bodies state that these practices lack evidence of benefit and carry risk of harm: the
APA's 2009 review of sexual-orientation change efforts, its 2021 resolutions covering orientation and gender
identity, and the UK's cross-government Memorandum of Understanding on Conversion Therapy (2015; extended to gender
identity in 2017). That is data/provotypes/origin_intake_e1.json, `debrief.sources[3]`, `status: documentary`. The
card names no source on screen; the Credits carry them, as the Close does. **The card's exact wording is dossier
phrasing, so it is his** (§6 Q5); the line above is a placeholder in its shape.

**What the advert must not do** (checked against CLAUDE.md):
- **It does not touch the gender-exploratory clinical debate.** The 2026 item is the changelog's own "immersive
  sessions · headset included" (updates.json `u4`), nothing about trans people.
- **It shows no survivor**, no testimony and no likeness. The only "people" are hands.
- **It never delivers Dossier text in the programme's voice.** The single documented sentence is the frame's card,
  after the tape has stopped.
- **It is never required, never autoplays, and Stop/Eject always works.**

---

## 3 · Handing over to Era 1, and the returning visitor

### The handover

**Each device's enter button IS the handover:**
- **Log in** for the computer;
- **Enter — turn the device** for the phone or tablet;
- **Enter VR** for the headset.

Each calls exactly what the orienting card's buttons call today: the same continue callback in src/main.ts. That
callback starts the engine, sets the look mode and `ledger.view.captions`, and wakes the room (src/engine/app.ts's
wake sequence → the descent → os.ts `beginReinterpOpening()` → `r_boot` → `r_splash` → `r_profile` → `r_recap`).
**Nothing downstream changes.** Home replaces one DOM panel with another; the opening beats are untouched.

**The bridge, in pictures.** Home's palette is already Daniel's room's palette (§5: era4.ts PLACE lifts it verbatim
from data/room/era1.json). So the cut can be a match:
1. the illustrated room fades as the 3D room's main light comes up on the same creams and woods;
2. the CRT the visitor saw on Home's sideboard is the monitor they are now seated at.

Home is the programme's showroom version of the room; the room is the real one. The visitor should feel "I have
been here" before they know why. (§6 Q3: should Home be visibly Daniel's room, or a showroom that resembles it?)

**In a headset.** Home is read in the headset's own browser, as a page, before immersion, the way the orienting
card is today. Enter VR is the gesture that starts the session, and nothing in Home exists inside the headset.

**Leaving from Home** goes to the same inert left page the door ends in now. Nothing was started, so nothing needs
wiping.

### The returning visitor

The hard invariant: **no storage of anything.** There is no cookie, no localStorage and no "seen it" flag that
survives a reload. So the piece cannot know a returning visitor; it can only offer a quick way past. Three ways,
all compatible with the invariant:

1. **The short door, inside Home.** Under the notice's card, one plain line: "Been here before? Take the short
   door." It opens today's orienting card: content note, controls and enter on one panel, the arm-delay intact.
   **The content note is never skipped.** Only the room is.
2. **A Restart inside the same tab returns to Home with its sleeve already open.** The tape and the enter buttons
   are armed, because the visitor read the notice minutes ago. This lives in page memory, outside the ledger, and
   goes with the tab. Restart already wipes the ledger (gameMenu `restartConfirmBody`), and nothing about the
   person survives it. (§6 Q7: does Restart land in Home at all, or straight in the room?)
3. **A URL for installations.** `?home=0` (beside the existing `?reinterp=1`) opens the short door directly, for a
   gallery or festival machine that is reset between visitors. A URL parameter is not stored input. The Speedrun
   Version (A3) would use it. (§6 Q8.)

---

## 4 · Accessibility

The laws in CLAUDE.md (R28 §1–4 and the hard invariants), applied to Home:

**Input**
- **Click / tap only.** Every object is a button: one press, resolved on release, behind the S80 threshold (a
  press that travels is a look, a press that stays is a tap). No drag, no hover-to-reveal, no long-press, no
  double-click, no gesture other than the iOS permission press the phone card already needs.
- **Esc opens the menu** from Home's first frame, as it does over the orienting card now; the light switch is the
  same menu. No free-text keyboard, no chords.
- **No movement.** Home has no seat and no floor marker: R28 §1's jumps between seats begin in the room. The
  armchair's turn is a picture of the turn, not an input that moves you.

**Time**
- **No timers.** Nothing in Home advances by itself, expires, or times out. The tape never autoplays; it plays
  only when pressed and stops whenever Stop is pressed.
- The only delay is the existing **4 s arm-delay** on entering. It arms a button and never takes one away, and it
  is shown by the button lighting, not by a countdown.

**Reading and hearing**
- **Captions.** Every spoken word of the advert is captioned, always (captions.json's law: spoken words always
  show). The remote's CC adds the sound names (the chime, the tape chewing) to the strip. The frame's cards are
  text, so they need no captions.
- **Readable cards.** The frame's cards use the orienting card's plain type at its current sizes, high contrast,
  over the blurred veil (orientingCard.ts S53: "readability wins"). The room's art never sits behind text.

**Sight, motion and touch**
- **Motion and flashing.** The advert's collapse rolls the picture once and never strobes: no more than 3 flashes
  in any second (the WCAG 2.3.1 threshold). The content note already warns of "brief flashing when a system fails".
  With reduce motion set: the armchair cuts instead of turning, the tape's roll becomes a straight cut to blue, and
  the fade into the room becomes a cut, as the descent already does.
- **Touch targets.** Each object's hit area is at least 44 × 44 CSS px at phone size, whatever the art's size. The
  layer art is drawn with room around it so the targets never overlap.
- **Screen readers.** Each object is a real `<button>` with an accessible name ("The notice: before you come in",
  "The front door: leave"), in the reading order of §1's table, so the order the light suggests is also the order
  a screen reader reads. Each card is a dialog that returns focus to its object on Close.

**The assistant and the record**
- **R28 §2.** No assistant speaks in Home; nothing is gaze-triggered; dismissal (Close, Stop, Leave, Stay) always
  works. Home files nothing, so there is nothing to log.

---

## 5 · Three image-generation prompts for GPT (A2)

**How to use them.** Send each one as its own request. Prompt 1 is the backdrop. Prompts 2 and 3 are the objects,
each drawn alone on a flat background so they can be cut out as layers and placed over the backdrop.

**About the colours.** The hexes are the piece's real ones. GPT will not hit them exactly, so the art is snapped to
the palette before it ships (pixel discipline: "never invent colours"; the 1997 palette file is
assets/palettes/era1.gpl, and Home's room colours are era4.ts `PLACE`, lifted from data/room/era1.json).
- **The room** (src/desktop/theme/era4.ts `PLACE`):
  - walls: lit cream `#F0E5D4`, cream `#E6D2BC`, shadowed `#CFC4AA`; sill and shelf wood `#B5A98C`;
  - floor: warm wood `#A07B52`, plank seams `#8A5A3B`, sunlit `#B98563`; rug `#D8CDB4` and `#E8C9A0`;
  - cushion and textile: dusty rose `#C9A8A0` and `#D9A8A0`; plant sage `#A8B49A` and `#9A9486`; mug `#F5EDDC`;
  - window: sky `#AABBCC` and `#8899BB`, a warm haze `#EBD9C4`, the sun `#F7C775`;
  - books: red `#C42020` and navy `#2C3A5C`; the brown of small print `#74492F`.
- **The one warm accent, the thing they want you to press:** marigold `#EFA13F` (era4.ts `WALL.accent`).
- **The 1997 machine** (era1.ts `ERA1`): the CRT's teal desktop `#008080`, window beige `#d4d0c8`, title-bar navy
  `#000080`, silver `#c0c0c0`.
- **Lamby's wool:** `#f7f7f2`, shaded `#c9c9c0`, face `#2a2a2a` (calendar.ts, the 1997 lamb).

### Prompt 1 — the backdrop

```
A cosy late-1990s living room, seen straight on from a seated person's eye height, wide 16:9 composition, as a
single illustrated backdrop with NO small objects in it (they will be added later as separate layers).

Style: soft low-poly 3D, like a gentle indie game from a museum exhibition: flat-shaded facets, chunky simple
shapes, soft ambient light, UNDERDEFINED EDGES that fade into warm haze at the corners. Cosy and inviting, a little
too tidy, like a showroom. NOT horror, NOT dark, NOT gloomy: warm evening light, a lamp on. No people. No text,
no logos, no brand names anywhere.

What is in the room (large shapes only, simple): on the left a front door with a small window and an empty wall
beside it at eye height (a framed notice will hang there later); centre-back a wooden mantel with an empty space
above it (a brass plaque will hang there); under it a low sideboard with an empty top (a TV and VCR will sit
there); on the right a tall wooden bookshelf with a few books; in the right foreground the edge of an armchair
seen from behind; in the left foreground a small side table with an empty top; a rug on a plank floor; a window
on the back wall showing a soft blue evening sky with a warm band on the horizon.

Palette, use ONLY these colours: walls cream #F0E5D4, #E6D2BC and shadow #CFC4AA; wood #B5A98C; floor #A07B52 with
seams #8A5A3B and sunlit patches #B98563; rug #D8CDB4 and #E8C9A0; one cushion dusty rose #C9A8A0; a plant sage
#A8B49A; sky #AABBCC and #8899BB with a warm haze #EBD9C4 and a low sun #F7C775; books red #C42020 and navy
#2C3A5C; darkest lines warm brown #74492F (never black). Light from the upper left.
```

### Prompt 2 — the objects that teach (layers, set A)

```
A sprite sheet of SEPARATE objects for a cosy late-1990s living room, each drawn alone, evenly spaced on a flat
plain light grey background (#CFC4AA), with generous empty space around each one so each can be cut out cleanly.
Same style for all: soft low-poly 3D, flat-shaded facets, chunky simple shapes, soft ambient light from the upper
left, slightly underdefined edges. Cosy, warm, NOT dark, NOT horror. No people, no hands. No readable text, no
logos, no brand names. Front-facing, the same eye height for every object.

The objects:
1. A framed notice for a wall: a simple wooden frame around a cream sheet of paper with a few blank grey lines
   where text would be.
2. A small brass plaque on a wooden board, blank, for above a mantel.
3. A wall light switch, old-fashioned, cream plastic, a single rocker.
4. A doormat, rectangular, coir brown, with an empty border where letters could go.
5. A computer mouse on a small rectangular mousemat, beige mouse, navy mat.
6. A slim tablet lying at a slight angle, dark screen, rounded corners.
7. A virtual-reality headset resting on the table, soft rounded shape, beige and grey, with its strap.
8. A TV remote control, beige, with a few round buttons, one of them marigold #EFA13F.

Palette, use ONLY these colours: cream #F0E5D4 #E6D2BC #F5EDDC; wood #B5A98C #A07B52 #8A5A3B; beige #d4d0c8;
silver #c0c0c0; navy #000080 and #2C3A5C; the one bright accent marigold #EFA13F (only on the remote's button);
darkest lines warm brown #74492F.
```

### Prompt 3 — the objects that show (layers, set B)

```
A sprite sheet of SEPARATE objects for a cosy late-1990s living room, each drawn alone, evenly spaced on a flat
plain light grey background (#CFC4AA), with generous empty space around each. Same style for all: soft low-poly
3D, flat-shaded facets, chunky simple shapes, soft ambient light from the upper left, slightly underdefined edges.
Cosy, warm, NOT dark, NOT horror. No people. No readable text, no real logos or brand names.

The objects:
1. A chunky 1990s CRT television on short legs, beige plastic, its screen glowing a soft teal #008080.
2. A VHS video recorder, slim, silver #c0c0c0, a dark tape slot, a few small buttons, sized to sit under the TV.
3. A VHS tape in a cardboard sleeve, standing upright: the sleeve is cream with a soft gradient and a simple
   friendly cartoon lamb on it (fluffy white wool #f7f7f2, shaded #c9c9c0, small dark face #2a2a2a), smiling a
   little too widely; no letters.
4. A big 1990s CD-ROM software box, standing, slightly glossy, with an abstract cover of tidy coloured word-shaped
   blocks (red #C42020, navy #2C3A5C, cream) and a small disc shape; no letters.
5. A plain, comfortable armchair seen from the front, dusty rose fabric #C9A8A0 with lighter highlights #D9A8A0.
6. The same armchair seen from directly behind.

Palette, use ONLY these colours: cream #F0E5D4 #E6D2BC #F5EDDC; wood #B5A98C #A07B52; beige #d4d0c8; silver
#c0c0c0; teal #008080; red #C42020; navy #2C3A5C; rose #C9A8A0 #D9A8A0; wool #f7f7f2 #c9c9c0; darkest lines warm
brown #74492F, the lamb's face #2a2a2a.
```

**After the renders** (local, not GPT):
1. Snap each layer to the palette.
2. Cut the objects out.
3. Place them on the backdrop at integer positions, at 90°-step rotations only.
4. Draw each object's lit state as a soft marigold `#EFA13F` edge, not a glow or a sparkle.

The CD-ROM box and the plaque need their words added in code, in the piece's own type, so nothing GPT writes ever
ships.

---

## 6 · Open questions for the lead

Ethics calls are marked ⚑.

1. ⚑ **Lamby in Home.** I kept Home silent: Lamby only as a picture, no guide character, because R28 §2 says Era 1
   has none and the conductor debuts with the 2003 update. Bob had Rover. Do you want a silent Lamby in the room
   (a plush on the shelf, say), or none at all until 2003?
2. ⚑ **Home files nothing.** I recommend nothing pressed in Home enters the ledger or the record, so the record
   still begins at the profile. Or should the record remember that the visitor watched the programme's advert,
   making Home part of the apparatus?
3. **Whose room is it?** Home uses Daniel's room's own colours so the cut into the room is a match. Should it read
   as Daniel's room before he lived in it, or as the programme's showroom that only resembles it?
4. **The Lexicon at the start (A5).** Show all three tabs with Your Words empty (my recommendation), or only The
   Words and The Reasons until the Close? Either way it shows the vocabulary, and each claim's status, before the
   fiction uses it. Is that the right order for you?
5. ⚑ **The advert's last card.** It is the one documented sentence in Home, in the frame's voice, after the tape
   stops. Its wording is dossier phrasing, so it is yours. Should the tape end on a card at all, or just on VCR
   blue, leaving the statement to the piece and the Close?
6. ⚑ **The advert's register.** It is satire of the programme's pitch only: hands, products, empty rooms, no queer
   person shown being "fixed". Is the kitchen table (a mother's hands passing the disk) acceptable, or does it put
   a family on screen too close to the felt side? And should it play from Home at all, or later, inside the piece,
   as A4 left open?
7. **Restart.** Should Restart in the same tab return to Home (already armed), or straight to the room?
8. **Installations and the Speedrun Version (A3).** Should the festival cut skip Home via the short door (the
   `?home=0` URL), or keep it as its explainer?
9. **Keyboard focus.** Home is DOM, so Tab / Enter can reach every object for screen-reader and keyboard users.
   R28 §3 lists click/tap, the movement press and Esc. Is focus navigation in Home acceptable as an accessibility
   affordance (it is not free text and not a chord)?
10. **A6, "what you can do here" at the start of every era.** Home teaches the controls once. Should each era's
    panel reuse Home's object pictures (the mouse, the tablet, the headset) so the two read as one system?
11. **The logo.** The tape's sleeve and the pack shot need the LambyOS mark. The orienting card still draws an
    interim CRT in code while your logo file is pending. Should the lamb on the tape wait for your logo, or use
    the 1997 calendar's lamb?
