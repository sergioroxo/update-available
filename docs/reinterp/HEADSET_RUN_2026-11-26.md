STATUS: live

*T106, the first headset run with the Mac following (orchestrator S357gr). Read by an Opus reader from the headset's
pictures, the game's log and his own recording (his transcription, shifted 490 s to the Mac clock); not edited by it.
Spot-checked by the orchestrator against the code: the stall (`graceQueueLite.ts` S332 comment and the phone's tick,
~977–983), Match my table (`xrLayer.ts` ~166–176), the Shut Down refusal not drawn when quiet (`startMenuMap.ts` ~102),
the Lesson 1 lines (`data/dialog/s3_queue.json` `systemLine`, `editLabel`). His word on the end: "It felt stuck".
The sheets are local (`out/trial-2026-11-26/sheets/`, untracked).*

# Headset run, 26 Nov 2026 — what the pictures and the code say

Era 3 (2016, Vera's room), Quest 3, live build 5d7cc91, about 22:00 to 22:17:11 (Mac clock; he left VR at 22:17:11).
His words are moved to Mac time (the recording's clock minus 8 min 10 s).
Frames: `out/trial-2026-11-26/frames/HHMMSS.png`, left eye. Contact sheets and zooms: `out/trial-2026-11-26/sheets/`.

The dark see-through plate over the lower left of the monitor in every frame is the `?debug=1` readout. It is a test-mode thing. It is not counted below, except once (finding 40), where it sat over the Start menu's last two rows.

Key: **P** = a problem in the piece · **Q** = the Quest itself (a headset setting) · **G** = something he liked · **?** = his question, answered here.

---

## The five most serious

1. **The era froze at the end, and nothing could get it moving again.** The removal on the phone *did* start (22:14:27). Then "Answer the mothers" was open again by 22:14:33. While any job is open, the phone's clock stops. Nothing closes the job, nothing says so, and the end never came.
2. **Lamby/Lambient was missing for most of 2016, the stuck end included.** The guide is hidden whenever a job is open, the phone is being read, or a quiet ("felt") beat is running. So from Lesson 2 on he could not even ask for help.
3. **There was no way out from inside the piece at the end.** In that state, Shut Down shows nothing (its "refused" box is not drawn), and Leave… sits on the bottom row of the menu, right on top of Start. A press a little low hits Start and just closes the menu.
4. **The Heartwood offer did not take his presses, and the set landed in a poor place.** No answer was ever recorded. The balloon went away by itself after 16 s. When the set came, it stood high above the monitor, small, and he had to tip his head back to read it. It also does not go back when he moves on.
5. **Recentre and "Match my table" are wrong in the headset.** Recentre plays a dissolve (frame 22:00:20 shows a double image), which goes against his "no fades" ruling. It also comes out lopsided and pushed forward. "Match my table" takes any still point, so a controller or a hand in his lap sets the desk too high.

---

## Findings in time order

**1 · 22:00:18–22:00:34 · "a very horrible fade… recentred lopsided… on top of the chair instead of the middle"**
- Frames: 220014, 220020, 220027, 220033, 220039.
- Seen: 220020 is a double exposure: two room poses blended, with the monitor and window doubled. That is the dissolve. In 220033 and 220039 he is looking straight down at the chair seat.
- **P.**
- Cause:
  - Recentre starts a dissolve (`calibrate()` sets `elapsed = 0`, src/frame/xrComfort.ts:91–97; the debug line says "· dissolving").
  - Recentre uses the head's position and turn *as they were when the menu opened* (`menuHead`, xrComfort.ts:86–96). If he was turned or leaning then, the room comes out lopsided.
  - The eye is also moved 0.15 m forward on purpose (`LEAN`, xrComfort.ts:61). That may be the "on top of the chair" feeling.
- Fix idea: make Recentre a cut with no dissolve. Take the turn from the seat's own facing, not from the head. Check whether `LEAN` should apply after a recentre.

**2 · 22:00:48 · "the Meta recenter puts me to the side… Match my table is too high… use the controller, not the hands, or the camera"**
- Frames: 220045–220134. They show the room, but I cannot measure the desk height from a still.
- **P**, plus **Q** for the Meta button.
- Cause:
  - "Match my table" takes the first input point that stays still for 1.5 s anywhere 0.2–0.85 m below the eye (src/frame/xrLayer.ts:166–176). A controller's tracked point sits several cm above the table top. A hand resting in his lap also counts. Either way the desk ends up high.
  - The Meta long-press recenter re-seats the room from the head as it is at that moment (xrComfort.ts:98–110). If his head is turned, the room follows the turn.
- Fix idea: accept controllers only. Ask for the controller's ring or tip on the table and subtract that offset. Using the Quest's own table (WebXR plane detection) would need a permission prompt. That is his call (CLAUDE.md: "Never request permissions").

**3 · 22:01:55 · "a little bit of clipping"**
- Frames: 220146–220205.
- Seen: nothing clipped in these stills. The near clip is 5 cm (src/engine/app.ts:691), so it only bites if the head is almost inside something.
- **?** — not seen.

**4 · 22:01:58 · "it needs to be a stable 72"**
- Log: 80–89 fps in this stretch, one low of 72 at 22:02:41.
- Fine here. The real drop comes later (finding 42).

**5 · 22:02:04 and 22:02:56 · "things appear and disappear when I move my head… compensating the draws"**
- Frames: 220205–220323.
- Seen: frames 6 s apart cannot show popping. The log shows draw calls jumping between 38 and 64 with the seat unchanged (for example 22:02:35 → 38, 22:02:41 → 60). Whole groups are being culled and un-culled as the head turns.
- **P** (likely). See answer c.

**6 · 22:02:10 · likes the calendar, the posters, March for the Family, the mug, the card, the notebook, LambyVision**
- Frames: 220205–220230.
- Seen: all visible. In 220230 the 2014 notebook is in his hand and readable.
- **G.**

**7 · 22:02:51 · "Good on the song."**
- **G.**

**8 · 22:02:53 · "Let Lambient answer when you say Lamby — confusing, we're not using voice"**
- Frame: 220248.
- Seen: a checkbox reading "Let Lambient answer when you say 'Lamby'.", and a yellow "not yet available" sticker on Not now.
- **?** / P.
- Where: data/dialog/s3_queue.json:116 and :119.
- Fix idea: cut the wake-word line, or make it read clearly as the platform's own hype. His call.

**9 · ~22:03:00 · "Lambient moves, I never noticed"**
- Frames: 220248–220341 (the dotted mark animates).
- **G.**

**10 · 22:03:50 · "is there music for GracePlatform? … it started inside the lessons instead of the training… the panel isn't related to the tutorial… the video is much better"**
- Frames: 220347–220440.
- Seen:
  - 220347/220353: the "This week" card ("Your training starts today", with Begin).
  - 220359: Lesson 1, with Lambient doing the first cut ("Watch. I'll do the first one.").
  - 220405–220434: the board again.
  - 220440: Lesson 1 again ("Your turn").
- **P** for the music. **?** for the training framing. **G** for the video.
- Cause of the silence: the "This week" card reuses the pause flag (`openWeek` sets `pauseOpen`, src/room/graceQueueLite.ts:1090). The platform's music waits whenever `pauseOpen` is set (:550). So no music plays while the card is up. This looks unintended.
- Fix idea: give the card its own flag, or let the loop ignore it.

**11 · 22:05:05 · "the controller stops and it changes to hand tracking" · "the specks now move — beautiful"**
- Frame: 220611 shows a tracked grey hand with its ray at the desk.
- **Q** for the hands: this is the Quest's "switch to hands automatically" setting (Settings › Movement tracking › hand tracking). Turn it off for runs. **G** for the specks.

**12 · 22:05:40–22:05:49 · "cutting, cropped out, second cup, self on the photo… I like this very much"**
- Frames: 220535–220553.
- Seen: the "second person / cropped out", "second cup / removed", "shelf photo / blurred" tags on the film.
- **G.**

**13 · 22:05:52–22:05:57 · "can I play? … I need to press on the video"**
- Frames: 220547–220605.
- Seen: after the cuts the film waits on a small "Play". 220559 is playing from 0:01/0:20.
- **?** — this is by design since 16-5 ("the video should play when I want to"). The Play button is small in the headset.

**14 · 22:06:11–22:06:17 · "it decided to control my hands out of the blue"**
- Frame: 220611 (the hand model).
- **Q** (as finding 11).

**15 · 22:06:20 · "a lot of reading… Renata's story runs 40 seconds, the campaign needs 20… then Campaign cut 20 — too repetitive"**
- Frames: 220618–220700.
- Seen: the heading "Lesson 1 · Renata's story runs 40 seconds. The campaign needs 20." The right column says "Campaign cut · 0:20" and later "As GracePlatform publishes it · 0:20".
- **P** (text).
- Where: data/dialog/s3_queue.json:161 (systemLine) and :165 (editLabel).
- Fix idea: keep one of the two; for example, drop "The campaign needs 20" from the heading.

**16 · ~22:06:50 · "now it's out of… moved places, be careful"**
- Frames: 220642 → 220648.
- Seen: after the last Apply, the page re-lays itself. The right column header changes, a "Free from dependency" label lands on the film, "Send to the network" replaces Apply/Skip, and "This story is done." replaces the rule.
- **?** — I cannot tell which move he meant. Ask him.

**17 · 22:06:59–22:07:01 · "Send to network." "Back to today."**
- Frames: 220648, 220700, 220706.
- Works (log 22:06:59 "Sent. Shared with 38 ministries in 9 countries.").

**18 · 22:07:04 · "clipping in and out of the Wick and the posters"**
- Frames: 220700–220712.
- Seen: not visible in stills.
- **P?** See answer c.

**19 · 22:07:15–22:07:18 · "a stop before every time it loops the song"**
- **P.** See answer g. The file itself loops cleanly. The gap comes from how it is played.

**20 · 22:07:32 · "pressing on the Lamby messages about Heartwood, the buttons weren't working"**
- Frames: 220712–220742, plus the zoom `r26/tvcall.jpg`.
- Seen:
  - 220718–220730: the offer "Session Two of Heartwood goes with this lesson. Shall I bring the set? [Bring it] [Not now]" floats over the board. Its right end, with the yellow "Lamby" aim tag and the ×, lies over the Handset Window.
  - In all three frames the ray rests on the card's right edge (the "Lamby" tag), not on the buttons.
  - The card is gone by 220736.
- **P** (with a possible **Q**).
- See answer d.

**21 · ~22:07:48–22:09:05 · "why does it go there… it should be next to us, in front, or by the bed… very difficult to see… if I continue it should go back to its space"**
- Frames: 220748–220908, plus the zoom `r26/set2.jpg`.
- Seen:
  - 220748: the set arrives above the monitor's top-left, in front of the calendar and window, showing "Assigned to you · Heartwood · Session Two: The Roots".
  - 220800–220832: he is looking up at it.
  - 220844/220850: the slides' small print (source lines) is tiny.
  - 220856/220902: the "LambyVision — put it back" and "⏮ back a part" tags.
  - 220908: the set is gone; he put it back himself.
- **P.**
- See answer d.

**22 · ~22:09:10 · "Lesson 2 — where is the Lambient, the one down here, it disappeared"**
- Frames: 220908–221006, plus the taskbar zoom `r26/taskbars.jpg`.
- **P.** See answer e.

**23 · 22:09:29–22:09:38 · "what is this symbol under the minimise? … that's the Lambient, but it's not there"**
- Frames: 220925, 220931.
- Seen: a small dotted Lambient mark just under the window's "–" and "×".
- **?** It is Lambient's mark, which job pages carry instead of its voice (`drawLambMark`, graceQueueLite.ts:2808). The taskbar button is what went missing (answer e).

**24 · 22:09:47 · "I don't fully remember what I had to do"**
- Frames: 220908–220954.
- Seen: the Lesson 2 page. The task is the small line "Add the place to the list" with Lambient's "Some places aren't safe to show. We keep a list." and two buttons. It took him about 50 s (log: places done at 22:09:59). Coming straight off the set may have broken his thread.
- **P** (minor): the lesson's one ask is not the loudest thing on the page.

**25 · 22:10:03 · "the Back to Today button is on top of the Trending panel"**
- Frames: 221000, 221006, plus the zoom `r26/misc1.jpg`.
- Seen: confirmed. The blue "Back to Today" covers the last line of the Trending item ("The Continental Wire").
- **P.**
- Cause: the finished-job "Back to Today" is pinned to the bottom-right of every job page (graceQueueLite.ts:2801–2805). Lesson 2's Trending column sits there (src/desktop/apps/placesList.ts / e3Trending.ts).
- Fix idea: place the button under the left column, or let the job page reserve the space.

**26 · ~22:10:10–22:10:58 · "Earlier messages doesn't work this way… it should scroll, like a 2016 phone"**
- Frames: 221017, 221041, 221047, 221053.
- Seen: "▲ Earlier messages" jumps a whole page back (Orla's "Somebody sent me a photo of you…"), then "▼ Latest" jumps back again. There is a large blank gap above the newest messages.
- **P.**
- Cause: the thread pages by a fixed step (`scroll-up` / `scroll-down`, src/desktop/apps/phoneE3.ts:1243–1244).
- Fix idea: real scrolling, with the thumbstick or a drag on the thread, and no blank band.

**27 · 22:11:04–22:11:25 · "Maureen: encourage patience. Annette: send grief. When I do Maureen it should jump to Annette"**
- Frames: 221105, 221111, 221117.
- Seen: at 221105 Maureen is open, "Encourage patience" is lit, and his ray is already on Annette in the list.
- **?** / small P. It already jumps. Lambient sends Maureen's reply itself, then moves to Annette 2.4 s later (src/desktop/apps/familyCalls.ts:97–124). He was ahead of it and thought he had answered Maureen himself.
- Fix idea: shorten the wait, or make it plainer that Lambient answered Maureen.

**28 · 22:11:28 · "Lambient disappeared, still hasn't come back"**
- **P.** See answer e.

**29 · 22:11:35–22:11:46 · "what is the phone button there? I don't know what it means"**
- Frames: 221134, 221140, 221146.
- Seen: the small handset icon at the bottom-right corner of the Handset Window.
- **?** It is the Handset Window's taskbar button: an icon only, its name removed at S358/H07 (graceQueueLite.ts:2161–2166). It restores the window if minimised. The window has no minimise any more, so in practice it does nothing visible. Right after his press the phone showed its home screen (221146; log 22:11:45 "home").
- Fix idea: remove it, or make it do one clear thing.

**30 · ~22:11:50–22:12:10 · "a memory from 2014… what would happen if I said no — 'Not now' — we need to know this"**
- Frames: 221204–221215.
- **?** Not now works once. After 6 quiet seconds on the board the card comes back with only "Look back" (graceQueueLite.ts:2415–2420; `MEMORY_AGAIN_SECONDS` = 6). So it cannot really be refused.

**31 · ~22:12:20 · "why did the music stop at Kindred heart draft?"**
- Frames: 221221–221250.
- **?** By design: the platform's music stops for the memory page (`veraPage !== 'record'`, graceQueueLite.ts:550). His call whether to keep that.

**32 · ~22:12:35–22:12:55 · "it moved without me touching… the button should be on the right, not the left"**
- Frames: 221221, 221227, 221232, 221238, 221244, 221250.
- Seen:
  - 221221–221232: the published version, with [See what you wrote] on the left and [Close] on the right.
  - 221238: the page has turned to her own words with the cuts struck through. His ray was not on "See what you wrote".
  - "Close" has jumped to the left edge.
- **P** (button) and **?** (turning by itself).
- Cause:
  - The page turns by itself once the published text has had its reading time (graceQueueLite.ts:2422–2425; S425, "the piece takes her there").
  - When "See what you wrote" goes away, "Close" slides into its place on the left (:2545–2556).
- Fix idea: keep Close on the right in both states. Ask him whether the turn should wait for his press.

**33 · 22:13:06 · "it should open a specific window of the Notes app… why did it go by itself to the panel and open Maiden-to-be — this cannot be automatic, it needs a logic"**
- Frames: 221250–221325.
- **P** / **?** See answer f.

**34 · ~22:13:20–22:13:50 · "I don't like this earlier message… it gets cut, there are blank spaces, no sense on a phone"**
- Frames: 221319–221350.
- Seen: Bea's thread starts with "▲ Earlier messages". At 221350 there is a white band between that pill and Susan's message.
- **P** (as finding 26).

**35 · ~22:13:56 · "now that the URGENT appeared, the song started back in"**
- Frames: 221356–221409.
- Seen: the "URGENT · Campaign kit · the Malta vote — GracePlatform chose your story. [Open the kit]" pop-in.
- **?** By design: the music is off while Bea's news runs (`cascadeConduct`) and comes back when it ends, which is when the kit pops in (graceQueueLite.ts:550, 985–986). His call whether the platform's song should come back on "URGENT".

**36 · ~22:14:20–22:14:26 · "Take my story down is still here, I don't know why, didn't we remove that… I just press continue and it disappears"**
- Frames: 221415, 221421, 221426.
- Seen: the kit page (221415/221421, ray on "Take my story down"), then the board (221426).
- The page after Take my story down was up for less than 5 s, so no frame caught it. From the code it is headed with the same words as the button ("Take my story down"), lists the copies that stay, and has one "Back to today" (src/desktop/apps/veraSurfaces.ts:64–86).
- **P** (wording): a heading identical to the button reads as "nothing happened, the button is still there".
- Fix idea: head it with what happened ("Taken down. The copies stay.").

**37 · 22:14:33 → end · the stall**
- Frames: 221426–221705.
- **P.** See answer a.

**38 · 22:14:46 · "GracePlatform is reviewing this group, you don't need to do anything" · 22:14:55 · "It is broken."**
- Frames: 221433, 221444, plus `r26/phones_end.jpg`.
- Seen: the blue bar "GracePlatform · reviewing this group · You do not need to do anything." sits over the group. No message is ever outlined, greyed or folded, not even at 221653 (Bea's Malta message, untouched).
- **P** (answer a).

**39 · 22:15:11 · "I don't have Lamby here."**
- **P** (answer e). During the review the guide is silenced on two counts: a job is open, and the conducted beat is running.

**40 · 22:15:17 · "so this 'more to explore' is all that's happening"**
- Frames: 221438, 221508, 221514, 221519.
- Seen: the Start menu's "Now" says "The group, outnumbered — With the kit closed, GracePlatform removes the news from the group, one message at a time. The women forward it faster." That is exactly the beat that was frozen. It also says "Jump to… — Not during this scene".
- **P**: the map describes a beat the visitor cannot see happening, and offers no way to it.

**41 · 22:15:25–22:16:40 · not mentioned: the window went down, then the phone game**
- Frames: 221525, 221531–221640.
- Seen:
  - 221525: the whole monitor turns to the blue wallpaper. A press on "GracePlatform" in the taskbar minimises the window when it is up (S382).
  - 221531–221640: back up, still on Lesson 3. He plays the phone game.
- **P** (contributes): the game also stops the phone's clock (graceQueueLite.ts:983). Minimising does not close the job, so the review stays frozen.

**42 · 22:16:21 · "the frames per second are about 58… there's no movement"**
- Log: 57–64 fps from 22:15:37 to 22:16:39, exactly while the game was open; 80 again at 22:16:46, once he left it. Draws were steady at 54.
- **P.**
- Likely cause: the game redraws the Handset Window inside the workstation's own canvas every frame (graceQueueLite.ts:2189–2201). So the whole screen texture is re-uploaded every frame, and screens are drawn at ×4 in a headset with a mip chain rebuilt on every upload (src/engine/screenTexture.ts:35–42).
- Fix idea: give the game its own small texture with no mips (the `'film'` mode, screenTexture.ts:29–33), or cap its redraws.

**43 · ~22:16:50–22:17:05 · "Shut Down doesn't do anything, Leave doesn't do anything, so I just left"**
- Frames: 221508 (menu open), 221653, 221659, 221705, plus `r26/end2.jpg`.
- **P.** See answer b.

**44 · 22:17:11 · he leaves VR**
- Frames: 221712–221726 (passthrough, the 2D browser).
- The log records a console error "Uncaught (in promise)" in the same second the XR session ended. It probably comes from the session ending. Not investigated further.

---

## Answers to a–h

### a. The start of the stall (22:14:25–22:14:40)

**What happened (log + frames):**
1. ~22:14:21–25: "Take my story down" (log `take-down`), then the short take-down page.
2. ≤22:14:26: "Back to today" (log `kit`: "left unapproved — administrator scheduled it"). Frame 221426 shows the board: "Training done · 3 of 3", all three tiles greyed "done", and the Lambient button back on the taskbar. The ray's end is in empty board space under the tiles. That is where the kit's "Back to today" had been.
3. ~22:14:27: **the review began.** The log shows phone stage `takeover` at 22:14:32. Only `beginReview()` sets that (graceQueueLite.ts:1241–1247 → phoneE3.ts:284–288). So the board stayed clear for the 1.5 s the review waits for (graceQueueLite.ts:969–978; `MALTA_CLEAR_SECONDS`, :269). The phone put up its bar, "reviewing this group".
4. ≤22:14:33: "Lesson 3 · Answer the mothers" is open (221433). The ray is now on the taskbar's "GracePlatform" button.

**One press landing twice?** Very unlikely, for three reasons:
- The kit (and the take-down page) and the board are never drawn in the same frame (graceQueueLite.ts:2265–2268: `veraPage` is its own branch). So no board tile can sit under a kit button in the same hit list, which is what caused the S403 bug.
- Both pages put "Back to today" in the window's bottom 40 px (kit :2619–2628; take-down page veraSurfaces.ts:86). On the board that strip is empty: the tiles end well above it. Frame 221426 shows the ray resting exactly there, on nothing. A second firing at that spot would hit nothing.
- A controller trigger fires one select per press (src/frame/xrInput.ts:175–190).

**Most likely he opened it himself:** finished tiles stay pressable, and `openTask` has no "done" check (graceQueueLite.ts:1800–1820). That fits the moment: the board was silent, Lamby had just been hidden, the phone said "you do not need to do anything", and he went looking. I cannot see the press itself; there is no frame between 22:14:26 and 22:14:33.

**Does the review wait for a clear board?** Yes, to *start*. But once started, its clock only runs while no job is open and the game is closed:
- `this.phone.tick(dt, (phoneInHand || mirrorAvailable) && !floppy.open && !jobOpen)` (graceQueueLite.ts:983).
- `if (!visible) return;` (phoneE3.ts:461).
- So with Lesson 3 open, the review stopped before its first message was even outlined. The opening bar (`REVIEW_LEAD`, phoneE3.ts:80) was still holding. The frames agree: no outline, grey or fold, ever (221433 → 221653).

**Does anything close the page or tell the player?** No.
- The 40 s failsafe (graceQueueLite.ts:977) only runs *before* the review starts (while `maltaPending`), and only puts away cards, never a job (`!this.openSurface`).
- A finished job opened again never returns by itself (`doneAtOpen`, :1375).
- Lamby is hidden (`guideSilent`: `mode === 'list'` and `personalQuiet` ⊃ `cascadeConduct`, :478 and :523).
- The way-out glow is not drawn while `personalQuiet` (:2106).
- The reopened job has no big "Back to Today", only the small one at its top left (221433).
- The Start menu is "silent" (finding 43).
- The only way out was that small "Back to Today", and nothing pointed to it.

**Fix ideas:**
- (1) Let the review and forwards run whenever the Handset Window is showing. It is in its own column and visible beside any job, so drop `!jobOpen` for the `takeover` and `after` stages. Or:
- (2) When the review starts, put any open job down, and keep finished tiles shut during Act III.
- (3) Add a failsafe: review started + a job open for N s → `backToBoard()`, plus a line from Lambient.

### b. "Shut Down doesn't do anything, Leave doesn't do anything" (~22:16:50–22:17:05)

**Frames:** 221508 shows the menu open earlier. Its last two rows, "Shut Down…" and "Leave…", sit directly on top of the Start button. In 221659 and 221705 the ray is on Start and no menu or dialog is showing. In both, the debug plate covers the Start corner and the strip above it.

**Code (2016's menu is graceQueueLite's own; e3 presses go straight to it, src/room/era3Devices.ts:1986):**
- **Shut Down…** → `startMap.close(); startMap.refused = true` (graceQueueLite.ts:3881). The refusal box is drawn only when the menu is not "silent": `if (this.refused && !silent)` (src/desktop/apps/startMenuMap.ts:102). In this state it *is* silent, because `startMapSilent = personalQuiet || phoneInHand || playing` (graceQueueLite.ts:874) and `personalQuiet` includes `cascadeConduct`, which the frozen review leaves on. So the press is refused **with nothing shown**. Refusing is by design since S219; showing nothing is not. The invisible "refused" state also keeps `startMap.active` true, which hides Lamby too (`guideSilent`, :478).
- **Leave…** → `startMap.close(); gameMenuBus.openLeave()` (:3882). In XR that opens the headset menu, which has its own Leave (src/engine/app.ts:1547–1550 → src/frame/xrFrame.ts:548). So the code path works whenever the row is actually hit.
- The row is the last one and short: `rh = min(15, (h−12)/rows)`, startMenuMap.ts:324. It sits 3 canvas px above the Start button. Start stays live while the menu is open (graceQueueLite.ts:2123), so a press a little low lands on Start and **closes the menu**. That matches the frames.
- I cannot prove which of his presses landed where. Shut Down's silence is certain from the code; Leave's miss is the likely reading.

**Fix ideas:**
- Always draw the Shut Down refusal, quiet scene or not; it is frame voice.
- Make Leave… a taller row, with a gap above Start.
- In XR, show the headset menu's own tab during quiet scenes.

### c. Objects popping in and out when he moves his head (22:02, and the Wick and posters at 22:07:04)

- **Not visible in the frames** (6 s apart).
- The log shows big draw-call swings at the same seat: 38↔64 at 22:02, and 30–68 around 22:07:47–22:08:37 (the brought set accounts for part of that). Something large is culled and un-culled as the head turns.
- Three things in the code hide meshes every frame, depending on where the head is:
  1. **Engine frustum culling with the batches' bounds swapped by hand.** xrComfort.ts:215–243 re-parents every static batch onto the moved room and swaps its bounds into headset space before each draw (S270b, after walls "culled whenever that point left the view"). If any batch's bounds are wrong (for example a batch rebuilt by `markGroupDirty` after a prop moved, :210–214), whole groups would blink at the edges of view. The Wick card and the posters are batched props. This is my first suspect.
  2. **seatCull** (src/room/seatCull.ts): hides meshes in *other* rooms between precull and postcull. Vera's own props should never be touched. It is built to err towards drawing.
  3. **Props swapped while unseen** (the "sequence over presence" rule, e.g. the Wick card's BANNED stamp). At 22:07:04 the stamp had not come yet, so this is not the Wick case then.
- Near-plane clipping is unlikely: the near clip is 0.05 m (app.ts:691).
- Fix idea: a headset A/B with `?nobatch=1`, then `?noseatcull=1`, in the same seat, turning the head. Whichever makes the popping stop names the cause.

### d. LambyVision / the Heartwood set (22:07:10–22:09:05)

**Why "Bring it" / "Not now" did not respond:**
- No answer was ever recorded. Either button writes `guide:tvcall` to the ledger (src/narrative/lambyGuide.ts:223–236 → src/desktop/os.ts:671–676), and the log has none.
- The card went away by itself between 220730 and 220736. That matches the offer's 16 s limit, after which it is "let go" and nothing is recorded (`offerHold: 16`, data/room/teaching_tvs.json:35; src/room/teachingTv.ts:1388–1395).
- So none of his presses reached the card's buttons.
- In all three frames the ray rests on the card's right edge (its "Lamby" aim tag), which lies over the Handset Window, not on the buttons.
- Two possible reasons, and I cannot choose between them from stills:
  - **Q**: the Quest had switched him to hand tracking a minute earlier (findings 11 and 14), and trigger presses do nothing in that mode.
  - **P**: the card is drawn on top of everything but floats 0.68 m away, while the monitor glass is 0.56 m away (teaching_tvs.json:31). The buttons look as if they sit on the monitor but are behind it in depth. Only `pressCard` runs first in XR (app.ts:1428), so this *should* still work. Worth one bench check.

**How the set still came:** it arrived at 220748, about 12 s after the card went. A press on the lit set by the door brings it "the same way" without writing to the ledger (teachingTv.ts:1388–1391 and `bringTo`, :1584). I cannot see whether he pressed it.

**Where it went:** in a headset, a brought set stands "beside the monitor" inside `xrFitDeg: 43`, which came out *above the monitor's top-left*, in front of the calendar and window (data/room/teaching_tvs.json:10–11 and :23; teachingTv.ts:711–741 `planBeside`/`takeFitted`). The S425 note says it "reads larger than the monitor's text". In the headset it was high and small, and its source lines were tiny (220844/220850).

**Where he wants it:** next to him, in front of him, or by the bed. That is the held-set grammar of S394/S396 ("bring it close", 0.5 m before the eyes, teaching_tvs.json:20–21) and his 15 Nov headset rule.

**Going back when he continues:** a held set goes back only when a voice arrives, the update starts, or his seat changes (teachingTv.ts:1501–1531). Opening Lesson 2 is none of those, so it stays.

**"If I want to play it there I can — the upper player?":** unclear. Possibly he means he should be able to play it where it rests. Ask him.

**Fix ideas:**
- In XR, bring it close (the held grammar) or to a fixed spot by the bed, not above the monitor.
- Put it back with `putBack(…, 'story')` when a lesson opens.
- Check the card's buttons with a controller, and with hands.
- Make the card's ray hit area larger.

### e. Lambient missing from the taskbar from Lesson 2 on

**Frames (`r26/taskbars.jpg`):** the "Lambient" taskbar button is there on the board at 220405, 220736 and 220856, and again at 221426. It is missing on every job page (220908–221006 Lesson 2, 221105–221140 Lesson 3, the stall) and on the board whenever the phone was being read: 221011–221059 (Orla's thread), 221158 (Mam), 221319–221350 (Bea's news).

**Code:** that button is Lamby's guide in its 2016 skin. It is drawn only when `!this.guideSilent && !this.startMap.active && !this.phone.voiceBusy` (graceQueueLite.ts:2132). `guideSilent` (:478) is true when:
- a job is open (`mode === 'list'`);
- anything counts as "personal quiet" (:523): the phone being read (`mirrorReading && quietReading`), her Notes, `cascadeConduct`, and so on;
- the memory page is open, or a card is up.

From Lesson 2 on, at least one of these was true almost all the time. The "symbol under the minimise" is Lambient's mark on job pages (:2808).

**Why it matters:** G2 says visitor-requested help is uncapped and dismissal always works. Here help cannot even be *asked for*, including in the stall.

**Fix idea:** keep the button drawn and pressable at all times. Silence only the balloons that come by themselves during felt beats, and let a press during a quiet beat answer with a short, neutral line.

### f. The Notes opening by themselves, then Maiden-to-be by itself (22:12:50–22:13:20)

All of it is the conducted Act II → Act III chain, and each step fires on a timer or on the step before, never on a press:
1. **Close on the memory page** (≈22:12:52) → `memoryStage = 'wait'` (graceQueueLite.ts:2399–2406).
2. **After a 2 s breath with the board clear** (`MEMORY_CLOSED_BREATH`, :282), her Notes open in the Handset Window and a line types itself: "It wasn't dependency. I was in love with her." (`conductMemoryNotes`, :2427–2441; phoneE3.ts:441–455). Log: notes at 22:12:55, the line written at 22:13:00. Frames 221256, 221301.
3. **Written and held**, the phone goes to its lock screen (log 22:13:06). Nuala's message lands there (221307/221313: "The second mug's still on the hook…").
4. **Nuala read** → `maltaPending = 'news'` (:2446–2453) → after 1.5 s of clear board, `beginMaltaConduct()` (:1226–1234) opens the group, "Maiden-to-be", by itself (log 22:13:18; frame 221319).

This is the "take the viewer there" law working as built. He says it needs a logic: something the player does, or a visible reason. **P / ?**

His "it should open a specific window of the Notes app and show there" reads as: show the Notes as their own window or app, rather than the phone column switching screens under him. Confirm with him.

**Fix ideas:**
- Open the Notes on a press: a "Notes" notification he taps.
- Bring Bea's group in as a notification he opens.
- Or keep both automatic, but have Lambient or the phone say why ("Nuala sent you something").

### g. The music: a gap before every loop; stops at Kindredraft; back on URGENT

- **Code:** GracePlatform's loop is `grace_loop_2016.mp3` (public/assets/audio/), started and stopped by `syncGraceLoop()` (graceQueueLite.ts:548–559), and played as a looping HTML audio element (`playLoop`, src/audio/tapeAudio.ts:732–736).
- **The gap is in how it is played, not in the file.** Decoded gaplessly, the file is exactly 64.000 s with no silence at either end. Its loudness at the first and last 50 ms is -13 and -15 dB, the same as the middle. It was made to loop (tools/make_graceloop.py: "ending on the dominant so the join… is seamless").
- But it is an MP3 with LAME's 576-sample delay and 576-sample padding (read from its header). A looping HTML audio element does not loop sample-accurately: on each wrap it seeks back, and the browser can play the padding and the seek gap, about 50–100 ms of silence every 64 s.
- **Fix idea:** play this loop through Web Audio (an `AudioBufferSourceNode` with `loop = true` and the loop points trimmed to the real start and end). Or crossfade two elements a little before the end. Or ship it as WAV or Ogg.
- **Stops at Kindredraft:** by design (`veraPage !== 'record'`, :550: "stops for the Story Record").
- **Back on URGENT:** by design. It stops while Bea's news runs (`cascadeConduct`) and resumes when that ends, which is the moment the kit pops in (:985–986).
- **No music under "This week":** not by design (finding 10).

### h. Things in the frames he did not mention

- **220020:** the double-exposure recentre dissolve (finding 1).
- **220838, once:** a jagged black band cuts across the bottom of the brought set and the top of the monitor and Handset Window title (`r26/misc1.jpg`). It is not in the frames before or after. It is probably a reprojection or capture tear while the head moved. Unsure; watch for it.
- **221006:** "Back to Today" covers the Trending item's last line (he did mention this; confirmed).
- **221017, 221350:** blank bands in phone threads under "▲ Earlier messages" (findings 26 and 34).
- **221238–221250:** "Close" jumps from right to left when the memory page turns (finding 32).
- **The take-down page's heading is the button's words** (finding 36; from the code, not seen).
- **221433:** the reopened finished job has no big "Back to Today", only the small one top left, and no glow (answer a).
- **221438 / 221508:** the Start menu's "Now" describes the frozen beat as if it were happening (finding 40).
- **221525:** pressing "GracePlatform" on the taskbar while the window is up minimises it to the bare blue desktop. While stuck, that looks like more breakage.
- **221653:** Bea's Malta message sits in the group untouched under the "reviewing" bar: the review never reached it.
- **221659 / 221705:** the debug plate covers the Start corner, where Shut Down… and Leave… open (test-mode only, but it hid the exit).

**Unsure, said plainly:**
- Whether he pressed the Lesson 3 tile himself (very likely, but not seen).
- Whether his Heartwood presses failed from hand tracking or from aim.
- What brought the set at 22:07:48.
- Which mesh pops.
- What "moved places" (finding 16) and "the upper player" mean.

---

## His answers (26 Nov, after the reading)

- **The clock:** "We had already talked about removing the limitations being clock based. The clock could be the real
  time, there is no need to have them like that" → `UIB_JOB_38_2026-11-26.md` A (read as: nothing in 2016 waits on a
  clock that can stop; the clock she sees is the real time of day; his edit wins).
- **LambyVision, where:** "beside the monitor" → `UIB_JOB_39_2026-11-26.md` C.
- **The training:** "It should welcome right from the start to the turtoral of the system. Like this needs that logic
  of someone being introduced to the system" → `UIB_JOB_40_2026-11-26.md`.
- **The music:** "Why? What is the logic of stopping there? either the music is part of the scene or not" →
  `UIB_JOB_38_2026-11-26.md` D (it plays through the scene; lowers under a sound of its own, never restarts).
- Still open, no hurry: "now it's out of moved places" (finding 16) and "the upper player" (answer d): ask him.
