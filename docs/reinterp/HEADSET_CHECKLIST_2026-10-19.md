STATUS: live

# HEADSET CHECKLIST — the first Quest 3 check, Monday 19 October 2026
*For Sérgio. Plain language. Nothing in this piece has ever been worn: every XR line below was built and
checked only on a flat screen with a mocked headset. This is the first time anyone finds out if it works.
Written 2026-10-15 from `README.md`, `CLAUDE.md`, `src/room/restoreEntrance.ts`, `src/desktop/home/homeXr.ts`,
`src/frame/xrInput.ts`, `src/frame/xrFrame.ts`, `src/room/closeMonitor.ts` and the strings in `data/strings/`.
It sits beside `HEADSET_NOTE_2026-09-16.md` (the controller, the menu plane, the wands), which it does not replace.*

**What this checks.** Whether a person can get into the headset, press things, sit through four eras and the Close,
and leave — without being unwell, lost or stuck — at a frame rate the headset can hold.

**The numbers that matter** (CLAUDE.md): **≤75 draw calls**, **72 Hz floor**, ≤75k triangles, no walking ever —
the only bodily ask is the turn. Flights are capped at **0.43 m/s and 9.1°/s**.

## Before you start (10 minutes)
- Build and serve over **trusted HTTPS** (WebXR needs it): `npm run dev -- --host --port 3000`, then
  `tailscale serve --https=443 localhost:3000`, and open that URL in the **Quest browser**. (README, "Quest 3 loop".)
- Use the address with **`?reinterp=1`** — the default door is the starfield. Add **`&debug=1`** for the first flat
  look (it shows the FPS and draw-call lines, see group 9). Do **not** add `?home=0`, `?flat=1` or `?entrance=home`
  for the main pass; `?entrance=home` is only for the optional extra check in 2.5.
- Quest battery above 50%, a clear space, seated on a chair that does not swivel into a wall. Controllers charged.
  Have a way to write notes without taking the headset off each time (a voice memo, or a person with a laptop).
- A second pass costs little: keep **Reduce motion** in mind (group 8) — try it once on a later run.

**How to read each item.** *Do* = what you do. *Look* = what you should see/hear. **FAIL** = write it down; one fail does
not stop the pass unless it says STOP. **Where to write:** a line per item in
`docs/reinterp/HEADSET_NOTES_2026-10-19.md` (new file; copy the item numbers; one line each: `3.2 FAIL — text blurry on the
left edge`). If you can't type, speak it into a memo with the item number first and paste it in afterwards.
Write "ok" for passes — a blank line looks like a skipped one.

---

## 1. Entering VR
1.1 **Do:** On the Quest browser (not in VR yet), open the page and look at the screen.
 **Look:** a night-blue starfield and a title made of points; "Click or press any key"; below, in small type, the
 work-in-progress note ("Work in progress — if something gets stuck, press Esc for the menu, or reload the page.").
 **FAIL:** a black or blank page; a console error you can see; nothing responds to a trigger press on the 2D page.
1.2 **Do:** Look bottom-right for the **Enter VR** button (it appears only once the browser says a headset is available).
 **Look:** the button is there and reads "Enter VR". **FAIL:** no button on a Quest — report this first
 (`restoreEntrance.ts` hides it until `available:vr`). STOP if absent: nothing else can be checked.
1.3 **Do:** Press Enter VR.
 **Look:** the headset session starts straight away (one press, no second prompt other than the Quest's own permission).
 You are inside the starfield. **FAIL:** a second Enter VR press needed; the session starts then ends at once; the
 browser page goes blank in the headset.
1.4 **Do:** Look around slowly. Look at your hands.
 **Look:** two thin lines (the wands) leave your controllers along where they point. **FAIL:** no wands; wands
 only in one hand; wands thick enough to block sight; the lines point somewhere other than where you point.
1.5 **Do:** Note where the floor seems to be. You are seated.
 **Look:** the starfield should feel at eye level with a sense of depth, not stuck to your face. **FAIL:** the
 scene is far above/below you, tilted, or you feel the "floor" is wrong (the piece sets no height itself).

## 2. The stars and the title
2.1 **Do:** Wait without pressing anything. Count a slow 36 seconds.
 **Look:** points drift toward you; larger ones gather over about 4.5 seconds into the title **YOUR UPDATE / HAS FAILED**
 in front of you, hold roughly 25 seconds, then loosen and fly on, then it repeats. Under the title, two small lines:
 "Click or press any key" and "Session still active." on a small plate low in front of you (a 2.4 m wide panel).
 **Look for:** the letters readable as letters, not smeared; the plate text legible. **FAIL:** letters not legible;
 points flicker or tear between eyes; the title is behind or beside you; you get eye strain within a minute.
2.2 **Do:** Squeeze the **grip** on either controller.
 **Look:** the **Menu** plane appears about 0.6 m in front of you (Resume · Controls · Restart · Leave). Read the
 line at the bottom: "Point and pull the trigger to choose. Squeeze the grip to close this." Squeeze again to close.
 **FAIL:** nothing appears; it appears behind you or too close to read; text is unreadable at that distance.
2.3 **Do:** With the menu closed, find the small **≡ Menu** tab (low and slightly to the right of your gaze). Point at it
 and pull the **trigger**.
 **Look:** the menu opens. **FAIL:** the tab isn't there; it doesn't open; or looking at it opens it (nothing may ever
 respond to gaze alone — if gaze presses anything that is a serious fail).
2.4 **Do:** Point at a bit of empty star and pull the trigger — then do nothing.
 **Look:** this is the **wake press**. It must start the soft music and bring in the setup window (next group).
 Pull the trigger **only once** and note how long before the window arrives. **FAIL:** nothing happens after two presses;
 the window appears but with no music; music loud enough to startle (it should be soft).
2.5 **Optional extra** (only if there is time; separate run): open `?reinterp=1&entrance=home` instead. Press the
 headset card's **View Home in VR**. **Look:** an illustrated room on one 2.4 m window about 2.2 m ahead; the trigger
 (and a hand pinch, if hand-tracking is on) presses the same things as a mouse; the content note gate works. This is the
 older Home door and is not the default route — note it only if it works or breaks loudly.

## 3. The setup window, Lamblippy, and the advert
*The setup is "LambyOS Setup": a floating 2 m wide window, 2.2 m ahead, with stars visible around it. Lamblippy is
silent; his balloons carry the questions. It must feel like pressing a real programme, not a
menu.*
3.1 **Do:** After the wake press, watch the window arrive.
 **Look:** a single star comes in from the left and unfolds into the window over about 2.3 seconds. **FAIL:** it pops
 in with no animation (that's fine only with Reduce motion on); it arrives off to one side or behind you; it clips
 into the stars in a way that hurts to look at.
3.2 **Do:** Read Lamblippy's first balloon: "Hi! It looks like you're restoring a session. Want a hand?"
 **Look:** text sharp enough to read **without leaning forward**; buttons ("Yes, please" / "I know what to do") large
 enough to hit with a controller ray. **FAIL:** you can't read a full balloon at a normal posture; the button you aim at
 is not the one that presses; the ray drifts a lot (jitter) — note how many tries to hit a button.
3.3 **Do:** Go through the balloons in order: **About** (the project text with Back/Forward) → **Whose session?** →
 **sound** → **How to look** → the plain **content note** → **version** (full piece / Speedrun) → the **advert** → **Start**.
 For each one note: readable? pressable? Does Back/Forward on About work? Does Close close each information window?
 **FAIL:** any control you cannot press with the trigger; a page of text that is cut off; a control that stays greyed.
3.4 **Do:** In the sound balloon press **Play a test sound**, then use the **− / +** volume buttons, then choose a level
 (Sound on / Keep it quiet).
 **Look/hear:** the chime plays in your ears, not from one side; − and + change the loudness each press; the setup
 music (soft) is still audible under it. **FAIL:** no sound at all; sound only in one ear; sudden loud peak on a
 press (hearing safety — write the item number loudly); volume bar doesn't change anything.
3.5 **Do:** In **How to look**, read the three captions (computer / phone / headset: "In a headset, turn your head.").
 **FAIL:** a button offering device motion that does nothing useful in the headset and can't be dismissed.
3.6 **Do:** Open the **content note**. It is the only gate. It says there is brief flashing and moments when the view is
 moved for you. Close it, then watch **Start**.
 **Look:** Start is disabled and comes alive **four seconds** after you close the note. **FAIL:** Start live at once;
 Start never goes live; the note can't be closed with the ray. If you tick **Reduce motion** here, remember you did.
3.7 **Do:** The **advert** (the opening film, "LambyOS — Welcome Home", ~114 seconds). Play it from the offer.
 *The two docs disagree about Skip:* `README.md` says there is a Skip; `data/strings/setup.json` says the film is
 mandatory with no Skip. Write down which you see.
 **Look/hear:** the picture is sharp enough to read its captions; the film's own sound plays and the setup music steps
 aside while it runs, then comes back; the ending card ("OVER 30 YEARS / SOLD AS CARE!" and the Sources line) is
 readable; a single plain **Close** button closes it. **FAIL:** sound and picture out of step; video stutters at any
 point; captions too small to read; the window stops responding afterwards; you can't close the final card.
3.8 **Do:** Press **Start** (the "All set! See you later!" balloon).
 **Look:** the window folds into one star leaving to the right. **FAIL:** window stays; window folds left/behind you.
 **Do not skip this:** Esc/Leave must work throughout — squeeze the grip once during the setup and check Resume works,
 then continue.

## 4. The room arriving
4.1 **Do:** Watch after Start. Don't press anything.
 **Look:** the text "Restoring previous session…" is typed out; stars grow into small coloured square pixels while
 Daniel's room fades in over about 9 seconds; the camera moves on an arc toward his monitor. No black gap. **FAIL:** a
 black frame; the room appears in one flash (white light flash is a FAIL — the code deliberately dims, never brightens);
 stutter during the 9 seconds.
4.2 **Do:** Stay still, watch the arc to the seat.
 **Look:** a smooth glide (0.43 m/s top). You end seated in front of the 1997 monitor. **FAIL:** you feel pulled,
 off-balance, or the horizon tilts; any sudden jerk. Rate comfort 0–10 (0 none, 10 would remove the headset).
4.3 **Do:** Note the "Enter" moment: a single subdued interruption (a quick glitch, ~0.65 seconds) that hands over to 1997.
 **FAIL:** flashing that is bright, strobing, or that makes you flinch. (With Reduce motion it is skipped.)
4.4 **Do:** Look at the monitor: is the desktop sharp?
 **Look:** pixel-art text readable at the seat distance. **FAIL:** text shimmering, or blurry at the centre.

## 5. Each era — the key moments
*Do the steps in order inside each era; the full piece is about 7 + 15 + 3 + 6 = ~31 minutes at walking pace
(`WALK_2026-10-15.md`). Don't try to hit every optional item — the aim is to meet every kind of interaction.*

### Era 1 — 1997, Daniel (the monitor, the bed, the wall)
5.1 **The questionnaire** — press the profile icons and chips on the monitor with the trigger.
 *The smallest targets are on this screen.* **FAIL:** missing a chip more than 2 times in 5; you must lean in.
5.2 **The disk** (A:\ on the desk) and **Un-Walk, the programme**. **Look:** disk icon pressable; programme windows legible.
5.3 **Going online → the fellowship's page → the channel → the private message.**
 **FAIL:** text too small to read a paragraph; scrolling a window with a trigger press fails.
5.4 **Optional "behind you" and "left" beats:** turn on your chair to the wall behind you; turn left to the racket on the
 wall; look at the handheld on the bed. **Look:** turning your head reveals things; hint line names what the ray rests on
 (e.g. "companion tape"). **FAIL:** anything needing you to stand or walk.
5.5 **ROOTCAUSE.EXE (Root Cause Digger)** — cells are 30×26 px, the smallest target in the piece. Note hits/misses.
 **FAIL:** cannot reliably select a cell.
5.6 **The Family Form** and **DIARY.TXT** — felt scenes. **Look:** no Assistant, no jokes, bare. **FAIL:** the helper
 speaking during these (that breaks the piece's law).
5.7 **The update #1** — notification ("Remind me later" works once) → EULA (scroll, one live "I Agree") → install →
 restart. **Do** the scroll with the ray. **FAIL:** can't scroll the EULA; "I Agree" not pressable.
 **Look** at the flight: the era change is a driven move (see group 8). Time it.

### Era 2 — 2003, Daniel (the assistant, the tapes, the thread)
5.8 **The assistant** appears (in the Helpy → Aski → Sol → Ami™ line). **Look:** lines short; dismissal always works. **FAIL:**
 cannot dismiss.
5.9 **The tapes** (shelf) — point at a tape: hint "◈ companion tape (…)". **Hear:** the tape's audio from the right place.
5.10 **A summons** (a floor marker) — point at the glowing marker on the floor and pull the trigger.
 *This is the one place the piece moves you from a floor marker, yet you never walk.* **FAIL:** the marker is behind
 you / below your reach; the move starts but feels like walking.
5.11 **"The thread" and "What is left"** — quiet scenes. **FAIL:** any pop-up or joke over them.
5.12 **The update #2** (as 5.7).

### Era 3 — 2016, Vera (the workstation, the phone)
5.13 **The migration → Sign in → Lambient's question → Two pieces of work.** Windows at the workstation.
 **FAIL:** text unreadable; too many windows overlap so the ray lands on the wrong one.
5.14 **The phone** on its stand left of the monitor — turn left, point, select. **Look:** the phone's screen legible.
5.15 **The vote / the group.** Quiet. **The update #3.**

### Era 4 — 2026, Maya (laptop, headset-in-the-headset, the Commons)
5.16 **The screensaver → L, on the laptop → The search, finished → Second Thoughts → L's five turns.**
 **Look:** clear, readable chat. **FAIL:** can't read the five turns without moving closer.
5.17 **The headset on the desk** and **The session on the glass** (a visor you "wear" inside the piece).
 **Look:** the visor glass, the wand not covering it. **FAIL:** wand lines obscure the glass; visor view doubles; any
 double-vision from wearing a headset inside a headset.
5.18 **The Commons** (the hall) — the larger space. **Look:** nothing swims; frame rate holds (see group 9).
5.19 **The update fails** — the last update fails. **Look:** the failure is a plain failure, not a gag.

## 6. The specks
*About forty warm and cool pixel-sized dust points sit in the corners and near the walls of every room and drift slowly.
They are one mesh, no interaction, and never over a reading area.*
6.1 **Do:** In each room (1997, 2003, 2016, 2026) look at the corners and walls for a minute.
 **Look:** a few faint points drifting; they look like dust in a lamp, not noise. **FAIL:** a speck sits in front of
 a screen's text; they flicker or shimmer at different depths in each eye; they feel like something on the lens.
6.2 **Do:** Compare the starfield points of the entrance with the same points settled as specks — a few "stay" where
 they landed. **FAIL:** none remain, or a speck appears floating in the middle of the room, away from corners.
6.3 **Reduce motion:** with Reduce motion on, the specks freeze. **FAIL:** they still drift.

## 7. The Close and the Library
*After Era 4 the machine on Daniel's desk — Daniel's CRT, now far back in the sky — becomes the **Library**. A scripted
approach brings you to it.*
7.1 **Do:** After "The update fails", wait for the approach. **Look:** panels in the sky (look up); the CRT body far ahead,
 slightly right of your seat; the glass lights up over about 3 seconds. **FAIL:** the machine is invisible or sits behind
 a panel; the glass stays dark.
7.2 **Do:** Press the far glass once. **Look:** the eye moves to about 1.55 m from it. **FAIL:** a press does nothing;
 you can't tell it's pressable.
7.3 **Do:** At the near glass read the Library: **Lexicon** (with Sources), the **receipt**, the four **era computers**,
 the **plaque**, the **Start again** bell, the **Leave** door, and **Lamby**'s bubbles. Press each with the trigger.
 **Look:** each response is the same as with a mouse. Tab order isn't relevant here (no keyboard). **FAIL:** any
 hit rectangle offset from its picture (press the thing, the wrong thing opens); text too small — the receipt's
 9-pixel type is the smallest in the piece; if the receipt cannot be read in the headset, say so and where.
7.4 **Do:** Open the receipt; wait for the printout (7 lines/second). **Look:** the paper rising from the printer; **Back**
 when done. **FAIL:** printout flickers; Back never appears.
7.5 **Do:** Hear the Library music (`lambyos_home_loop.mp3` at 0.18). **FAIL:** no sound; sound doesn't stop on Leave.
7.6 **Do:** Dismiss a Lamby bubble with its ×. **Look:** it goes and stays gone. **FAIL:** it covers an object you need.
7.7 **Do:** Press an **era computer** (e.g. 1997) to go back to that era. **Look:** return works and the Library returns.
 *(Optional, only if you can spare 10 minutes — otherwise on the flat build.)*
7.8 **Do:** *Don't* press Start again in the headset before group 10 is done: it wipes the session and reloads with
 `#home-armed`, ending XR. Test it last, by itself.

## 8. Comfort — turns and flights
*The piece asks one thing of your body: **turn**. It never asks you to walk. Flights are driven moves at ≤0.43 m/s and
≤9.1°/s.*
8.1 **Do:** Throughout the pass, mark the three scripted moves: (a) the room arrival and descent to the seat,
 (b) each era change (the 2003/2016/2026 "rises" and the 39-second cross-room reset), (c) the Close approach.
 **Look:** each should be slow, smooth, with a steady horizon; walls near the path should fade, not clip your head.
 **FAIL:** any move you could call fast; any wall/door you can see through or that hits your head; a flight that makes
 you queasy. Rate each flight 0–10 and note its duration.
8.2 **Do:** Turn your head left/right/back (180°) in each room, seated, slowly. **Look:** the monitor stays where it
 was; the room stays put. **FAIL:** drift (the world creeps on its own); a 180° turn being the only way to reach a
 thing and leaving you stuck (e.g. the racket on the wall). Write which things needed a turn.
8.3 **Do:** Stay for at least **10 minutes** in one go, then ask how you feel. **FAIL:** eyestrain, headache,
 nausea, or a "swimmy" feeling — note the minute it began. If strong, take it off; that is a result.
8.4 **Do (second run, if time):** switch on **Reduce motion** in the setup (or `?motion=reduced`). **Look:** flights
 become cuts, flashing is skipped, points freeze. **FAIL:** a flight still plays.
8.5 **Do:** In a flight, pull the trigger. **Look:** nothing happens (a driven move swallows the press; a pointer
 does the same). **FAIL:** a press changes anything during a flight.
8.6 **Do:** Squeeze the grip during a flight. **Look:** the menu opens and the piece pauses; Resume continues where
 it was. **FAIL:** the flight keeps moving under the open menu.

## 9. Performance — how to read the debug FPS
*Honest limits first.* The `?debug=1` readout (top-right box: **"FPS n · ms · worst ms"**, and a "draw calls: n"
line in the debug panel) is **page DOM**. **It cannot be seen inside the headset**, and in an immersive session the
page's own frames stop — so it measures only the flat Quest-browser window. The headset's real frame rate must be
read some other way (see 9.4). The debug jump panel and `__drawCalls` are not available in the headset either.
9.1 **Flat read (before Enter VR):** open `?reinterp=1&debug=1` in the Quest browser window and watch the box: "FPS 72"
 (or 90) with "worst" under ~20 ms means the Quest can draw the 2D page at speed. **FAIL:** FPS under ~60, or worst
 over ~30 ms, on the starfield. (A flat window can legitimately run at its own refresh, so don't over-read a number
 that's just under the 72; the real test is 9.4.)
9.2 **Draw calls (flat):** open the debug panel (⚙ pill) and read **"draw calls: n"**. Budget **≤75**. From the 2026-10
 notes: the entrance measures ~68, the quietest rooms ~40–60, and a few moments run higher (Maya's turned seat was once recorded at 197 and is struck
 through as fixed in `00_WHERE_THINGS_STAND.md`; the E3→E4 cascade 62). **FAIL:** any steady-state value above 75; write the room and the number.
9.3 **Walk the same readout through the eras** on the flat build: after each update look again. Write the highest draw
 count you see at each of the entrance, Era 1, 2, 3, 4, the Commons and the Close.
9.4 **In the headset:** use Meta's own tools, since the page's counter won't show. Options (any one): the **Meta Quest
 Developer Hub** live performance (FPS, CPU/GPU level), or the **OVR Metrics Tool** overlay, or the headset's built-in
 performance overlay if your firmware has one. Read the **frame rate**. **FAIL:** a frame rate below 72 anywhere,
 or sustained dips in the Commons, the Close, or a flight (that's where the budget is thinnest). Note the lowest
 number you see and the moment.
9.5 **Feel check (no tool needed):** if the image judders when you turn your head, or dark smears follow bright pixels,
 note the place — that is the most trustworthy test even without a number.
9.6 **Uploads:** screens should redraw only when something changes. **FAIL:** a static screen shimmering or "crawling"
 for no reason (a sign something is redrawing every frame).
9.7 **Loading:** note any hitch when a new room arrives (model loading, four at a time). **FAIL:** a freeze over
 ~1 second inside the headset (while in VR it is jarring).

## 10. Leaving
10.1 **Do:** Squeeze the grip. Choose **Leave** from the Menu plane with the trigger.
 **Look:** the Leave page appears; the way back lands you somewhere sensible (the arrival Home, not the middle of a
 scene). **FAIL:** Leave does nothing; the way back from the Leave page doesn't land in Home.
10.2 **Do:** Back in the browser, press the Quest button's own "exit immersive" (or Leave): confirm the session ends cleanly.
 **FAIL:** a frozen frame in the headset after the session ends; the page stuck in a "loading" state.
10.3 **Do:** Reload the page. **Look:** your name and any answers are gone (nothing is stored). **FAIL:** anything
 remembered after reload (that would break the no-storage law — an *urgent* fail).
10.4 **Do:** Leave the headset idle for 15 minutes in the starfield or a room (or run with `?idlescale=1` for 15 s per
 "minute" on a later run). **Look:** at 15 min the screensavers and the call-in card; a touch asks "Start from the
 beginning?"; at 30 min, the arrival Home. **FAIL:** the idle cycle triggers in the middle of a scene while you are
 playing.
10.5 **Do:** Take the headset off. Say how you feel; write down the time spent in VR.

---

## What to write at the end (five lines)
1. Did it enter VR in one press? (1.3)
2. Could you read all of the setup and press every control? (3.2–3.8)
3. Were all flights comfortable? Highest comfort score and which flight. (8.1)
4. Lowest frame rate and where; highest draw count and where. (9.2–9.4)
5. The single worst moment, and the single best.

## Known unknowns (so a surprise isn't blamed on the wrong thing)
- Nothing here has run on real hardware: stereo rendering, controller feel, hand tracking, comfort and 72 Hz are all
  unverified (`README.md`). Headless checks only cover the mocked manager and mono WebGL.
- The page's debug box measures the flat window only (see group 9).
- Pinch (hand tracking) is mentioned for Home; the main game path is the controller trigger and grip.
- The Quest's own menu button belongs to the system; the piece's menu is the grip or the ≡ Menu tab.
- `CLAUDE.md` and `README.md` are the authority if this file disagrees with them.
