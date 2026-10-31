STATUS: live

# The dollhouse: twelve creative possibilities (Sonnet, 31 Oct 2026)

*For Sérgio. Plain, short sentences. These are ideas, not decisions. Nothing here is built.*
*Read first: CLAUDE.md, VR_AS_A_LAYER §5 (VR-06), DESIGN_MISSING_YEARS §0 and §5, both research versions (Claude §4 and §7, GPT §7), `src/frame/xrLayer.ts` (dollhouse), `src/engine/app.ts` (relocation).*

---

## 0. What I found in the code (so the ideas are buildable)

1. **VR-06 today.** `xrLayer.dollhouse()` runs at `os.onEraRelocate` (when "I Agree / Install" is pressed). It copies the room's current **batched meshes**, leaves out the ceilings, scales them to about 45 cm, and holds them about 45 cm in front of the head, 38 cm lower, for **4.2 s**. A small pulsing cube marks the seat. It reuses the same meshes and materials, so it adds **no new textures** and few draw calls (one per batch material).
2. **It shows only what is built now.** In 1997 and 2003 the house is **one room**. From 2016 it is the **three-room house**. So at 2003 to 2016 the model can show Room 1 aged and Room 2 arriving. At 2016 to 2026 it shows all three.
3. **The house is one building, three rooms on one axis.** Room 1 front (Daniel), Room 2 west (Vera), Room 3 east (Maya). The rooms **age** by state (`reinterp_deltas.json`, folded by `clusterMorph.ts`). The record plane runs on a spine behind the seats.
4. **The browser flies.** `RELOC_POSES`: rise to an overlook, hold, descend. The legs run 7 to 25 s. At the overlook the visitor already sees the whole house from outside. So the browser **already has a dollhouse**: the real house, seen from above. It needs the same layers, not a model.
5. **The light arc is canon.** Per-era rigs: lamp-dominant night, then office fluorescent, then pastel diffuse "the lamp a leftover", then interface-lit near-dark with **"the lamp survives as the one warm pocket, CARRIED to Maya's desk"**. The lamp is also the logo.
6. **Belongings exist.** In 1997 the visitor keeps small objects (mixtape, plant, duck). `ledger` holds them. They can drive the model.
7. **Calendars exist.** Pixel-art calendar pages and a calendar model (S177).

## 1. The rules every idea must pass

- No beat depends on looking. The model is **held in front** and runs by itself. Everything below is **extra**: if the visitor sees none of it, nothing is lost.
- **The house only.** No New Morning, no clinic, no camp, no ministry, no programme building. Things that arrive from outside the house **come in through the front door, the wall or the wire**, and the other end is off the edge of the model.
- **No figures.** No likeness. The lamp is the occupant mark.
- **No smooth travel in VR.** The model scales up and dissolves. It does not fly at the visitor. Spins are the **model's** own, slow, on its own base (not the visitor's view).
- **Operable / felt / respite.** The dollhouse is a gap between scenes. I treat it as **felt-quiet**: no mascot, no system voice, no text, no mechanics. Where an idea shows the **system's** view, it is marked operable and stays wordless and short.
- **The frame never plays.** No score, no reward, no "you found X".
- **Budget.** Quest at most 75 draw calls. The model reuses the room's batches. **Rule for every idea: all new lit bits share ONE emissive material and ONE small mesh set**, so the cost is **+1 draw call**, not +1 per bit. Measure in headset (debug plate).
- He said **"too explanatory"**. So: pictures, not labels. At most one short plate, and only if he asks.

---

## 2. The twelve ideas

### D1. The Same Window

**Pitch.** The same window, seen from the model, across thirty years. What is outside it changes. The room inside barely does.

**What the visitor sees and does.**
- *VR.* The model has a small **yard** on its base: a fence, a street light, one tree. Each change, the yard steps forward: a sapling (1997) to a young tree (2003) to a tall tree with a satellite dish on the roof edge (2016) to the same tree, bare, a router glow in the window (2026). The window glass on the model is a small lit card. The visitor does nothing.
- *Browser (desktop, phone).* The flight's overlook already shows the outside of the building. Put the same yard and tree on the real exterior. The tree **grows during the hold** (a 3 s baked step, no new camera move). Drag or gyro look is free and not needed.

**Narrative work.** Carries **2003 to 2016 (13 years)** and **2016 to 2026 (10 years)**. Time passes **outside**. The people stay in their rooms. The world moves on, and so does what reaches in.

**Register.** Felt-quiet. Soft, low-poly, underdefined edges. It is the soft side.

**Cost.** Small to medium. New assets: a tree in three or four low-poly steps (one mesh with colour steps), a fence, a dish. **+1 draw call** if the yard is one batch. No shadows.

**Risks.** A yard is outside the house. It must not become a street scene or a world. Keep it to one tree, one fence, one pole. The view must not be read as a place people go. Reads slowly in 4 s: so it is detail, never the main read.

---

### D2. Core Sample (paint strata)

**Pitch.** The cut edge of each wall shows its coats of paint, like tree rings.

**What the visitor sees and does.**
- *VR.* Because a dollhouse has no roof and is cut open, the wall tops are visible. Each wall's top edge is striped: beige (1997), blue (2003), pastel (2016), cool grey (2026). A new stripe **slides on** at each change, while the old ones stay. The visitor does nothing.
- *Browser.* At the overlook the walls open (`opensWalls`). Show the same stripes on the wall cut faces, lit by the existing light.

**Narrative work.** Carries the **whole thirty years** in one object. The house keeps what was painted over. It says the rooms are one building that is **redone, never left alone**. It matches "rooms that age".

**Register.** Felt-quiet.

**Cost.** Small. One stripe texture or four thin box strips per wall (one material). **+1 draw call.**

**Risks.** **The Daniel to Maya link was struck (2026-09-05): "a file cannot follow someone it was never about."** Strata can read as "the same person, layered". Fix: show **paint only, never objects**, and the layers are **per room, not stacked across people**. Room 2 and Room 3 start with their own first coat. Keep this idea's wording to the house, not to a person. Medium risk, easy to keep clean.

---

### D3. Turning Leaves (the calendar, and what goes and what comes)

**Pitch.** A big tear-off calendar stands by the house. Its leaves peel off by themselves, a year each, and the model's desk swaps its devices as they fall.

**What the visitor sees and does.**
- *VR.* Beside the model (to the right, at the edge of comfort) is a chunky calendar block, 12 cm wide. Leaves peel off in a fast roll, and the year number on the front leaf counts: 2003, 04, 05 ... 16. At the same time, on the model's desk, **the Game Boy goes, the flip phone comes** (1997 to 2003), then the flip phone goes and Vera's phone stands (2003 to 2016), then the phone gives way to the visor on the desk (2016 to 2026). The last leaf lands and holds. No press, no look needed.
- *Browser.* The same calendar is a **3D object in the hold of the flight**, near the overlook pose, turning its leaves during the hold. The desk swap is visible in the building as it ages, as it already does.

**Narrative work.** Carries each jump by **number**: 6 years, 13 years, 10 years. It is the plainest "missing time" marker. This is what his note already asks for (§5): **build this as the base layer**. It is the Unpacking lesson: what goes and what stays says the time.

**Register.** Felt-quiet (no text but a year number).

**Cost.** Small. The calendar model and pixel-art leaves exist. A leaf-peel is a few quads on one texture. **+1 to +2 draw calls.**

**Risks.** **The flip is a timer in the visitor's eyes?** No: it is a scripted animation, not a deadline. Still, no countdown look. Keep the leaves quick and quiet, never a ticking clock. Year numbers are text; keep them 14 px or more on the leaf (the VR text rule).

---

### D4. Who's Home (the lamps)

**Pitch.** The three rooms are lit **one at a time**. One lamp is on. At the Close all three are lit together, once.

**What the visitor sees and does.**
- *VR.* Each room on the model has a small lamp glow. At 2003 to 2016: Room 1's lamp **dims but never goes out**, then Room 2's glow comes up. At 2016 to 2026: Room 2's glow dims (never out), and Room 3's rises. The canon already says the lamp "survives as the one warm pocket, **carried** to Maya's desk": so the warm glow can **slide along the wall's bottom edge** from one room to the next, like a hand passing a candle. The visitor does nothing.
- *Browser.* At the overlook, the same lamp glows: three small warm discs over the rooms, lit one at a time, using the real lamp lights the rig already tunes. At the Close, if the dollhouse is used as the overview (VR-06's idea), all three rise together.

**Narrative work.** Carries **2003 to 2016 and 2016 to 2026**, and the **Close**. Three people never meet. The house is the only thing that holds all three. At the Close the three lamps lit together is the one time the house says it. "Light the same room, not the same person."

**Register.** Felt. Warm. It is the soft side. **The lamp is the logo**, so it is already the piece's own mark.

**Cost.** Small. Three emissive discs on one material. **+1 draw call.** No realtime light needed in the model.

**Risks.** **A room that goes fully dark reads as death.** So: **rooms dim, they never go out.** Never a spotlight on one person (that is the system's way). The glow must not look like the system's scan. Keep it warm and low, never the cold light. The "lamp carry" is canon, but must not say "Daniel's lamp is Maya's lamp" (the struck link). Show it as **the house's lamp**, a thing in the building, not a person's soul.

---

### D5. Sharper (the instruments get crisp)

**Pitch.** The house is soft. Its **devices** are sharp. Every change, more of the model is sharp.

**What the visitor sees and does.**
- *VR.* The model's life (walls, bed, rug) stays soft and warm. Each **device** (monitor, phone, laptop, visor) gets a thin bright pixel edge and a tiny lit dot. In 1997: one device, one dot. 2003: three. 2016: a handful. 2026: dots everywhere, on the walls too. The count rises as the model forms. The visitor does nothing. It reads as a "constellation" settling on the house.
- *Browser.* At the overlook the same dots hover over the real devices as small sprites. They fade up with the building's aging. This is exactly the point-cloud Close's two-tier law, shown early.

**Narrative work.** Carries **all three jumps** with the piece's thesis: **"the witness side is the sharp side."** It also carries the doc's line: **desk, pocket, hand, face.** The devices move onto the body, and the dots move with them. Nothing is said. The house gets watched.

**Register.** Operable-adjacent (it is the system's definition of the house), no mascot, no text, no satire.

**Cost.** Small to medium. The dots are one small mesh set, one emissive material. The device edges: a second slightly larger copy of those few device meshes in the same emissive material. **+1 draw call.** Needs a list of "device" entities per era (a data list).

**Risks.** Could read as "decoration" or Christmas lights. Keep dots tiny, cold, and few. Do not make the rooms look hostile or sinister. The house must stay a home. Do not turn it into a score (the dots are not a count the visitor earns).

---

### D6. The Line In

**Pitch.** A wire reaches the house from the street. Each era replaces it. By 2026 there is no wire.

**What the visitor sees and does.**
- *VR.* A thin line runs from a small pole at the edge of the base to the wall socket. 1997: a thin **phone wire**, a slow pulse (dial-up). 2003: a **fat cable**, steady. 2016: no wire; **concentric pixel arcs** rise from a small router box. 2026: no wire, no router; the walls of the model glow faintly, and a faint halo is around the model's edge. The line "runs off the model" at the far end: nothing is there. The visitor does nothing.
- *Browser.* Same pole and wire on the real house exterior at the overlook (the building is already a closed shell there). Pulse and arcs fade between eras.

**Narrative work.** Carries **all three jumps** with the piece's subject: **how the system reaches a person at home.** Dial-up, then broadband, then Wi-Fi, then the air. It is the "desk to pocket to hand to face" line, told as infrastructure. It does what the annex wanted (shows where the contact comes from) **without any programme space**: the far end is just the edge of the model.

**Register.** Operable-adjacent. Wordless. No satire.

**Cost.** Small. Thin boxes, a small pole, a router box, two or three arc rings. All in one emissive material. **+1 draw call.**

**Risks.** The far end must stay empty. A pole going to nowhere is fine. A building at the end would break his "no programme spaces" ruling. Do not draw a "signal into the head". Keep it neutral infrastructure.

---

### D7. The Letterbox (the post across the years)

**Pitch.** The front door has a letterbox. Its contents are the missing years in paper.

**What the visitor sees and does.**
- *VR.* At the front door of the model, a small box (and a mat) holds paper. 1997 to 2003: a few **plain envelopes** pile up, then **three go back out** and fade ("Contact requests: 3. Declined on your behalf"). 2003 to 2016: a card-sized parcel sits on the mat. 2016 to 2026: nothing on the mat; a small lit rectangle (a phone) lies there instead. The visitor does nothing.
- *Browser.* The real front of the house at the overlook shows the same mat. Same objects.

**Narrative work.** Carries **1997 to 2003** (the boot-line fact, in a picture), then **2003 to 2016** (post becomes a parcel) and **2016 to 2026** (post becomes the screen). Time passing as **mail**. It gives the "declined on your behalf" idea a body without a word.

**Register.** Mixed. The returned letters are the system's act (operable). The pile is felt. Keep the picture bare: no text on the envelopes.

**Cost.** Small. A few boxes. **+1 draw call** if on the shared emissive/plain material. No new texture.

**Risks.** **The three returned letters must not mock Daniel**, and must not name who wrote them (that stays Caleb's, in the thread). Keep them unlabelled. The mat is outside the house; it must not become "a world". Reads small: detail only.

---

### D8. The Show Home (the system's picture, then the people's)

**Pitch.** The house is shown twice. First the way the programme would draw it: tidy, bright, aligned. Then it **slumps back** into how it really is.

**What the visitor sees and does.**
- *VR.* The model rises **cool, flat-lit, every object snapped to a grid**, posters straight, no clutter (small props hidden), a tiny **Lamby sprite on the doorstep** in the era skin (this is the perpetrator's self-presentation). After 1.5 s the picture **glitches and collapses** into the warm, lived-in model, with its real mess. The warm one holds for the rest of the 4 s. The visitor does nothing.
- *Browser.* At the overlook, a quick flat/cool grade with props snapped to the grid, then the glitch back to the real light. (A post-effect plus hiding small props: both exist.)

**Narrative work.** The **system's map of the household versus the people's own.** It carries **2016 to 2026** best (platform era, "managed" tidy look) and can open the **Close**. It is Laurie Simmons' method (Claude §4): the programme's own picture of a restored home is a dollhouse too: tidy, over-lit, wrong. **The satire sits only in the perpetrator's self-presentation, and it collapses**, as the law asks.

**Register.** Operable for the first beat (glitter allowed), then felt for the landing. The collapse is the hinge.

**Cost.** Medium. Needs a "tidy" variant: hide small-prop batches, flatten the tint, one extra unlit pass. A Lamby doorstep sprite. **+2 draw calls** while it shows; the tidy pass **replaces** the normal one (not on top of it).

**Risks.** **The most explanatory idea on this list.** It must stay wordless. Satire must never touch the people: only the programme's picture. Lamby is operable-only, never in the felt landing; the collapse must complete before the new room (a felt scene) forms. Do not run it before a felt or respite scene without checking the next scene's register. Do not use it every time: **once**.

---

### D9. The Turn (the model shows its back)

**Pitch.** The model slowly turns on its own base and shows the **back of the house**, where the record runs through every room.

**What the visitor sees and does.**
- *VR.* The model rises facing the visitor, then **turns by itself** on its small plate, 90 degrees over 3 s, and shows the spine behind the three seats: a thin lit line (the record) running through all the rooms. If the visitor grabs the model's plate they can spin it more. Hands are **optional** and the model also works untouched. It never moves the visitor's view.
- *Browser.* The flight already rises and holds. Add the same spine line on the real house, lit during the hold. The drag-to-look is free; the camera needs no new move.

**Narrative work.** Carries **the whole thirty years** and the piece's other rule: **the record is behind the seat in every era.** The record is one line across three rooms. "The turn" (the signature bodily ask) is **done by the model, so the visitor needn't turn**. That matches "we take the viewer there".

**Register.** Operable (the system's record), wordless.

**Cost.** Medium. A turntable tween (small). One thin emissive quad for the spine. Grab-to-spin is an extra: reuse the Game Boy's grab. **+1 draw call.**

**Risks.** Grab and spin touches the "hands and controllers both work" rule: it must work with a pinch and a trigger. The model must never rotate **fast** or the visitor will feel it as camera motion (use at most 30 degrees a second, eased). The spine must not link Daniel's file to Maya (struck): it is the **building's** line.

---

### D10. Boxes by the Door (what is carried out)

**Pitch.** At each change, a few boxes leave a room and stack in the hall. The boxes hold only the things **this visitor** chose to keep.

**What the visitor sees and does.**
- *VR.* From the 1997 belongings beat, the ledger knows what they kept (the mixtape, the plant, the duck). In the model, **small cubes** (one per kept item, plain brown, no label) slide to the front door and stack by the mat at 2003 to 2016. At 2016 to 2026 one or two more join them. Nothing is carried **into** the next room. By the Close, the pile is the house's. The visitor does nothing.
- *Browser.* The same stack appears in the hall/door area of the real house at the overlook, driven by the same ledger.

**Narrative work.** Carries **2003 to 2016** (the long gap in which Daniel leaves the room) and builds to the **Close**. Each visitor gets a slightly different dollhouse: their own choices left a mark on the house. It is "traces of each person's belongings", but the house keeps them, not the next person.

**Register.** Felt.

**Cost.** Medium. Needs a ledger-to-cube mapping and a stack animation. Reuses boxes. **+1 draw call.**

**Risks.** **High on ethics.** (1) **It must not read as Daniel's effects after a death** (Edith Finch caution: shrines). Boxes read as *moving*, not *memorial*: warm brown, taped, stacked by the door, with the lamp on. (2) **It must not carry Daniel's feelings to Vera or Maya** (GPT: "do not transfer Daniel's feelings or streak"; the link is struck). Boxes leave **and stay by the door**; nothing enters the next room. (3) A visitor who kept nothing sees an empty hall. That is fine. Do not shame it. (4) It makes the visitor's earlier choice visible: do not score it ("the frame never plays").

---

### D11. The House Installs

**Pitch.** The change of room is shown as the house **installing**: a thin bar fills along the base, and the new room builds block by block over the old one.

**What the visitor sees and does.**
- *VR.* The model's old room is **wireframe-pale** and the new room **fills in** from the floor up in coarse pixel blocks as a thin bar along the base fills. At 99% the bar jumps (a glitch), a pixel row tears, and then it lands. The seat marker pulses once. The visitor does nothing. It mirrors VR-07 (the update ring around the seat) in miniature.
- *Browser.* The flight's `buildSeconds` leg already opens walls and builds the new room (7 to 25 s). Add the base bar along the building's base during the leg.

**Narrative work.** The house **updates like software.** It says "updates are triggered by documented system failures, never by the player", and that the house is the thing being updated, not the person. It carries every jump the same way, so it is a **language** for the transition, not a one-off.

**Register.** Operable. The bar glitters and fails; it never mocks anyone.

**Cost.** Medium. The old/new swap needs two room states in the model at once (the old batches and the new batches), which the current code does not hold: it rebuilds the geometry if the batches change. A thin bar is cheap. **+2 draw calls** during the change.

**Risks.** **Duplicates the install screen** that the visitor has just seen (changelog, glitch). It might feel redundant, or like the frame "playing" with a progress bar. Keep the bar **thin and without numbers**. The model is also built from batches that get rebuilt at the change: needs care (the `prerender` guard exists).

---

### D12. Fingerprints (the receipt, in miniature)

**Pitch.** At the Close, the model of the house shows where **this visitor** touched it. Their hands left marks on the glass of the rooms.

**What the visitor sees and does.**
- *VR.* At the Close the model rises one last time (stars, then the house). Faint soft marks sit on the model's rooms: more on the rooms where the visitor pressed more. Nothing is counted aloud. On Restart the marks wipe off and the model dissolves.
- *Browser.* At the Close, the real house seen from the outside carries soft smudges on its windows, in the same places, from the ledger (`provotypes`, `sends`, `checkins`).

**Narrative work.** Carries **the Close** and the **thirty years as the visitor's own act**. The Close already counts "hands that touched each file". This makes that count **seen**. It answers his Close note ("the ledger has been recording the player, and the ending never reads it back") without text.

**Register.** Operable at the Close (the system keeps it), then respite for the last breath (no marks, the lamp on).

**Cost.** Medium. A ledger-to-smudge map: three soft decals per room (one material). **+1 draw call.**

**Risks.** **Ethics call (his), like VR-09 (the head count).** It names the visitor as the one who did the pressing: it must not feel like a trap or a blame. The marks should be soft and warm, **the same as a child's hand on a window**, not a red alert. Memory only, wiped with the ledger, never sent. The Close's order is his.

---

## 3. How the ideas stack (so the dollhouse does not become a pile)

| beat | what carries it | optional extras |
|---|---|---|
| 1997 to 2003 (same room, six years) | D3 calendar, D7 the three returned letters | D2 first new stripe, D1 tree step |
| 2003 to 2016 (Room 2 appears) | D4 Room 1 dims, Room 2 rises, D3 | D10 boxes by the door, D6 cable to air, D1 |
| 2016 to 2026 (Room 3 appears) | D4 the lamp slides on, D5 more dots | D8 the show home, D9 the turn, D6 |
| The Close (all three) | D4 all three lit, D12 fingerprints | D9, D10 the whole pile |

Rules for the stack:
- **At most three layers in any one change.** More than that reads as clutter in 4 s.
- **Order inside the 4 s:** (1) the lamp, (2) the one change that carries the time, (3) a quiet detail.
- **Same shared material for all bits**, so the cost is +1 draw call in total, not per idea.
- **Browser parity.** Every idea above is also shown on the **real building** at the flight's overlook hold. That is where the browser "has" a dollhouse: no model, same information.

## 4. Risks against his rulings, all ideas

| ruling | the ideas that touch it | the guard |
|---|---|---|
| No beat depends on looking | all | everything is extra, the model sits in front, spins are the model's own |
| No programme spaces | D6, D7, D8 | the far end of any wire or post is the **edge of the model**, never a building |
| "Too explanatory" | D8, D11, D12 | wordless; at most one plate, and only if he asks |
| VR comfort (no smooth travel) | D9 | the model turns, the view does not; at most 30 degrees a second, eased |
| Felt / respite have no mascot, no satire | D8 | the Lamby sprite exists only in the first beat; it collapses before any felt room forms |
| The frame never plays | D3, D10, D12 | no counts shown, no reward, no "you found" |
| No timers | D3 | the leaf-roll is a scripted animation with no countdown look |
| The Daniel to Maya link is struck | D2, D4, D9, D10 | objects and lamps belong to the **house**; nothing enters the next person's room |
| Quest at most 75 draw calls | all | one shared emissive material; the model drops the ceilings already; measure first |

## 5. Ranking: my top 3

**1. D4 Who's Home (the lamps).**
- It **reads in one second**, which is all a 4-second beat can promise.
- It uses the piece's own mark (the lamp) and its own canon (the lamp carry, the light arc).
- It is the **cheapest** idea: three emissive discs, +1 draw call.
- It carries the people without a figure, and it ends in the **Close**: the only moment all three lamps are lit together.
- Its one risk (a dark room reads as death) is solved by one rule: **dim, never out**.

**2. D6 The Line In.**
- It is the only idea that shows **what the piece is about** (how a system reaches a person at home) and **how it changed across the missing years**, in one image: phone wire, cable, Wi-Fi arcs, the air.
- It does what the rejected annex tried to do (show where the contact comes from) **without any programme space**.
- Wordless, small, +1 draw call, and the browser shows the same wire on the real house.

**3. D5 Sharper (the instruments get crisp).**
- It is the piece's own law made visible, early: **the witness side is the sharp side**.
- It gives a reason for the model to exist in every change: the house stays soft, the dots go up.
- It pairs with D6 (wire in, dots out) as the system's growth in the house, and with D4 (warm soft vs cold sharp).
- Cheap, and wordless.

**Always build alongside:** D3 Turning Leaves. It is his own request ("the calendar flips the years"). It is the base, not an idea to rank.

**Why not the bolder ones.** D8 (Show Home) is the most original but the most explanatory and the most register-risky. D10 and D12 are the most personal but need his ethics call. Keep them for a second round.

## 6. Smallest first build for D4 Who's Home

**Goal.** In VR, at the 2003 to 2016 and 2016 to 2026 changes, the model shows a warm glow over each room. The old room's glow dims but stays. The new room's glow rises. Nothing else changes.

**Where.** `src/frame/xrLayer.ts`, inside `dollhouse()` and `tickDoll()`. No new file. No data change except one small list.

**Steps (about half a day).**
1. **Room glow anchors.** Add a three-entry list: Room 1 centre, Room 2 centre (west), Room 3 centre (east), in the same world coordinates as the batches. The room centres are in `reinterp_deltas.json` and `cluster.json` (side rooms are at about plus and minus 3.88 on x). Read them from the data, do not hard-code.
2. **One emissive material.** Reuse `markMat` (already emissive, unlit) but as a warm copy using an era-1 palette colour that already exists in `src/desktop/theme/`. (Law: never invent colours.)
3. **Three discs.** In `dollhouse()`, after `buildGeo`, add three flat thin boxes (a 90-degree-step "disc", pixel discipline) as children of `root`, sized about 2 cm in the model, placed over each room. Put them on the same `layers: [deps.frame.layerId]`.
4. **Which is old, which is new.** `dollhouse()` gets one argument: the target era (`os.onEraRelocate` already has `era`; the call at `app.ts:1209` becomes `xrLayer?.dollhouse(era)`). The previous room is the one the visitor is in now.
5. **Animate in `tickDoll`.** New room: scale 0 to 1 over the first 1.2 s, then hold. Old room: scale 1 to 0.4 over 1.5 s and **hold at 0.4** (never 0). Third room (if any): 0.4 from the start (it exists and is not the focus), but skip it for 1997 to 2003 (only one room exists).
6. **One short pulse** for the seat cube is already there. Leave it.
7. **Dispose.** `endDoll()` already destroys `root`. The discs are children, so they go with it.

**Do not build yet.** The slide of the glow along the wall (the lamp carry), the Close's all-three-lit beat, sound, and any text.

**Check by feel (definition of done).**
- In the headset, at the 2003 to 2016 change, a warm glow dims over the front room and rises over the west room, while the pixel dissolve runs.
- No room ever goes dark.
- Draw calls: read the debug plate before and after. The change should be **+1 at most** while the model shows.
- `npm test` passes; `npm run dev` works; one line in BUILD_LOG; in-headset note.

**Then, next, in order:** D3 Turning Leaves (his own ask), D6 The Line In, D5 Sharper.

**Browser twin (same session, small).** At `RELOC_POSES` overlook hold, enable three warm sprites over the real rooms with the same dim/rise values, so both builds say the same thing.

## 7. Questions for him

1. Is the lamp-as-occupant enough, or does he want **nothing** lit on the model (only the house)?
2. D10 and D12 name the visitor in the house. Does he want them considered, or kept out?
3. D8 (Show Home): one use only, at 2016 to 2026 or at the Close? Or not at all?
4. Should the 1997 to 2003 jump (same room, six years) get a **dollhouse at all**? It is one room. The calendar (D3) and the letters (D7) may carry it better on the screen.
