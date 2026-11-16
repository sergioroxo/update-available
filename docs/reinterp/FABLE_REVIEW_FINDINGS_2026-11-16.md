STATUS: live

# Fable 5.2 review: findings (16 Nov 2026, T74)

*An outside review of "YOUR UPDATE HAS FAILED", branch `reinterp`. Brief: `FABLE_REVIEW_2026-11-16.md`.
Nothing in `src/`, `data/`, `public/` or `tools/` was changed. Written section by section.*

**How to read the labels**
- **Severity:** *blocks a visitor* / *weakens the piece* / *polish*.
- **Whose call:** **HIS** (ethics, his words, a change of direction) or **BUILD** (can simply be built).
- **Looked at** means I saw a picture, a measurement or a walk line. **Read only** means source or a doc.
  I say which each time.

---

# §1 · The engine and the text in the headset

## 1.0 Recommendation first

1. **Stay on PlayCanvas. Do not change engine.** No other engine fixes the two problems he asked about.
   A change would cost one to three months and put every walked path at risk.
2. **PlayCanvas is not old.** 2.19.6 is recent. It already contains the WebGPU headset path. The gap is
   in the engine's design: its WebGL headset code only knows the old single layer. A newer version does
   not have to be awaited; a small patch can close the gap (§1.2).
3. **The soft text is first a size problem, then a pixel problem.** The earlier report measured this and
   I agree with it. Letters on the monitors are 0.7–0.8° tall. Comfortable reading starts near 1.0–1.2°.
   No engine changes that. Design changes it.
4. **The next step is one 20-minute Quest session, in a fixed order** (§1.1). The fixes shipped on 12 Nov
   (the fonts, the large-text mode, the bigger glass: S373, S374) have **never been judged on a real
   Quest**. Judge them first. Then run the layer test, with one change to its design.
5. **Draw calls are not an engine problem.** They come from how many separate things the scene holds.
   The current fix (S396) is sound. The 214 spike has a cheap fix (§1.4).
6. **Unity:** keep the licence for a possible second edition (a native Quest app for festivals). It
   cannot replace this build, because it loses the iPhone and the browser.

**What only a real Quest can settle** is listed in §1.5.

## 1.1 Is the four-step quad-layer test the right next step?

**Short answer: yes, but second, and with step 2 changed.**

**What I checked (read the code and the docs):** `src/frame/xrMonitorQuad.ts`,
`tools/patch-playcanvas-xr.mjs`, the installed `webgl-xr-bridge.js`, `IDEAS_XR_TEXT_2026-11-12.md` §4,
`CODEX__REPORT_2026-11-02.md`, `HEADSET_TRIAGE_2026-11-10.md` §0.

**Finding 1.1-a · The test is in the wrong place in the queue.** *Severity: weakens the piece. BUILD + his
headset.*
- TODO row T69 says the type floor and bigger glass "PASS" on text angle. That pass is a calculation
  in headless Chrome. His own eye has not seen it.
- If the bigger letters are enough, the layer work (about two weeks) is not needed at all.
- So the session should start with the cheap question, not the expensive one.

**Finding 1.1-b · The six bugs listed in IDEAS §4 are real.** I confirm them in the code:
- `isStatic: true` on a screen that changes (`xrMonitorQuad.ts`, the `createQuadLayer` call);
- it switches on at the first headset frame, in the stars, because the only test is `era() === 'e1'`;
- the order `[room, quad]` puts the monitor in front of the hands, the ray and Lamby;
- the only way back is an exception, and a black screen throws nothing.

**Finding 1.1-c · Step 2 has the wrong "stop".** *HIS to know; BUILD to do.*
- Step 2 asks: does the Quest show our old-style layer (`XRWebGLLayer`) when it sits in the new
  `layers` list? If it is black, the plan says stop.
- That is the least-travelled road. three.js and Meta's own samples do not do this. They use a
  **projection layer** made by `XRWebGLBinding`. That road is used by most WebXR work on the Quest.
- So a black screen at step 2 should not end the idea. It should send us to the projection layer.
- **Change:** split step 2 into **2a** (the old layer in the list, as now) and **2b** (a projection
  layer). 2b needs the bridge patch in §1.2. Build 2b before the session, so one session answers both.

**Finding 1.1-d · Judge sharpness side by side, not by switching.** *BUILD.*
- The plan uses a controller button to switch the quad on and off. Memory of sharpness is poor, even
  over one second.
- **Better:** step 3's test card should show **two panels at once**, 1 m ahead: the left one drawn the
  old way (a textured plane), the right one as a compositor layer. Same text on both, in three sizes
  (0.6°, 0.8°, 1.0°). He reads the smallest line he can on each. That gives a number, not a feeling.
- Keep the button too. It is the way out of a black screen.

**Finding 1.1-e · Plug in the cable before step 1, not after a failure.** *HIS (setup).*
- On 10 Nov the screen was black for a minute and nothing was learned.
- With the Quest in developer mode, on a USB cable, the Mac's Chrome (`chrome://inspect`) shows the
  headset's console live. Every step then leaves evidence even when the picture is black.

**The session, in order (about 20 minutes):**

| # | What | He looks at | Decides |
|---|---|---|---|
| 0 | `?reinterp=1&debug=1`, Enter VR, 1997 | The debug plate: the font line, the eye-buffer size, fps | Is the heavy font really drawn? What is the true pixel density? |
| 1 | Same build, read the 1997 monitor, then pick up the handheld | Can he read body text from the seat without leaning? | **If yes: stop here. Park the layers.** |
| 2 | 2003 film, then 2016 with Floppy Sheep | fps on the plate | Are 2003 and 2016 still under 72? |
| 3 | `quad=feature` | Does VR still start? | The feature itself |
| 4 | `quad=room` (2a), then `quad=proj` (2b) | Is the room shown? | Which road works |
| 5 | `quad=test`: the two-panel card | The smallest line he can read on each side | **The real gain, as a number** |
| 6 | `quad=1`: the 1997 monitor | Text, hands in front, Recentre | Roll out or not |

**Cost:** steps 0–2 need no build. Steps 3–6 need about one builder week first (§1.2).

## 1.2 Inside PlayCanvas

**"Are we using an old PlayCanvas version?" No.**
- Installed: 2.19.6. Its bundle already has a second headset bridge, for WebGPU, which makes a projection
  layer (`node_modules/playcanvas/build/playcanvas.mjs` around line 11770: `createProjectionLayer`).
- Its WebGL bridge still makes one old-style layer and sets it as `baseLayer`
  (`webgl-xr-bridge.js`, `attachPresentation`). That is why "layers only in WebGPU mode" is true.
- It is a gap in the engine, not our age. 2.24.1 has not closed it (§1.6).

**Is a WebGL projection-layer path feasible by patching the bridge? Yes.** *BUILD. About one week. Risk:
medium.*
- The bridge is small (about 170 lines) and has three jobs: say which framebuffer to draw into, say
  its size, and say each eye's viewport. The project already patches all three reads.
- A projection layer gives the engine a texture per frame instead of a framebuffer. The patch must:
  1. make the layer with `XRWebGLBinding.createProjectionLayer({ textureType: 'texture' })`;
  2. each frame, ask for the sub-image, attach its colour and depth textures to a framebuffer of our
     own, and hand that to the engine as the default framebuffer;
  3. return the sub-image's viewport for each eye;
  4. keep the smoothing (MSAA). A projection layer's texture is not multisampled. On the Quest this is
     done with the `WEBGL_multisampled_render_to_texture` extension. **This is the risky part.** If it
     fails, edges get worse, not better. It must be seen on the Quest.
- After that, a quad layer for a monitor is the normal, documented use, and it can sit behind or in
  front of the room in the list.
- The fail-closed check in `tools/patch-playcanvas-xr.mjs` (it refuses any version but 2.19.6) is the
  right safety. Keep it.

**What would upgrading 2.19.6 → 2.24 change?**
- Nothing for the headset text (§1.6, point 1). The WebGL headset path is unchanged up to 2.24.1.
- An upgrade breaks the patch on purpose (the version check), so it costs a re-audit of the bridge and
  a full walk. Do it only for a fix we need elsewhere.

**Is WebGPU mode usable for visitors on the Quest today? I would not ship it.** *HIS to know.*
- It needs the browser's WebGPU and its WebXR–WebGPU binding to be on by default in Quest Browser.
  They are not: Meta lists them as experimental (§1.6, point 3).
- Even if it is on, it would change the renderer for **every** visitor, on a path almost nobody has
  walked. The piece's own raw WebGL code would stop working in that mode: the quad experiment, the
  headset MSAA layer in `app.ts` (about line 675, which already checks for a WebGL device), and any
  custom shader piece.
- Desktop Chrome and recent Safari have WebGPU, older phones do not, so the build would carry two
  renderers and need two sets of walks.
- **Gain for the text: none by itself.** A WebGPU projection layer is drawn into the same eye buffer.
  Only a quad layer is sharper, and quad layers under WebGPU are newer still.

## 1.3 Other engines

The table is my judgement. Sharpness means "can the monitors be drawn as compositor layers".

| | Sharper text | Draw calls | iPhone (gyro, no WebXR) | Static, no network | Rewrite cost |
|---|---|---|---|---|---|
| **PlayCanvas (stay)** | With the §1.2 patch | Same scene, same count. Each eye is drawn separately | Works now | Works now | **About 1 week for the patch** |
| **three.js** | Half-way. Uses a projection layer itself; quad-layer helpers only in its WebGPU renderer (§1.6) | Same count. Can draw both eyes in one pass (multiview), which halves the real cost | Works (WebGL) | Yes | **6–10 weeks**, then every walk again |
| **Babylon.js** | Yes, it has a layers feature | Same count | Works (WebGL) | Yes | 6–10 weeks |
| **Unity, web export** | No official WebXR. A community add-on only | Unity batches well, but the web build is heavy | Poor: big download, high memory, weak on phones | Yes | **3+ months.** The 2D desktop (about 150 files drawn with the browser's canvas) has no home in Unity |
| **Unity, native Quest app** | **The best possible.** Native compositor layers are the tested road | Best | **None. It is a Quest app only** | Yes (an installed app) | **3–5 months**, and it becomes a second product |
| **webxr-to-native** (his link) | Not stated. Quad layers are not listed | Claims less time per frame | Not a target | Yes (bundled files) | See below |

**Why the rewrite is costly here.** `src/` is 194 files and about 83,000 lines. `src/engine/app.ts` alone
is 6,145 lines and holds the rooms, the seats, the era changes and the headset code together. The 2D
screen layer (`src/desktop/`) would survive a move to three.js or Babylon unchanged, because it is plain
canvas drawing. Everything spatial would be rewritten. And this project's main defect class is "content
that exists and cannot be met": a rewrite re-opens every one of those.

**The two links.**
- **`Srile/webxr-to-native`** (read on 16 Nov). It runs a WebXR page as a native Quest app with no
  browser. It is **one week old** (first commit 9 Nov 2026, 8 commits, 16 stars). It names three.js and
  Wonderland, not PlayCanvas. Its page says: no `<video>` or `<audio>` playback; the 2D canvas is "a
  subset"; canvas **text is off by default**. This piece is made of canvas text, sound clips and
  video tapes. **Not usable now.** Worth a look again in six months: it could be the cheap road to a
  store app.
- **IWER, Meta's emulator** (read on 16 Nov). It imitates a headset's WebXR in a desktop browser, with a
  Quest 3 profile, controllers, and recorded actions that can be replayed. It is **a test tool, and a
  good one for us**: today the tools fake a headset by forcing `app.xr.active`. With IWER, `walk.mjs`
  could one day do a real headset walk. It does **not** imitate the Quest's compositor, so it cannot
  answer the layer question. It would be a development-only dependency, never in the shipped build.
  Installing it needs his yes.

## 1.4 Draw calls

**Is the current approach sound? Yes.** *Looked at:
`research/article-images-2026-11-16/job28-partB-S396/vera-drawcalls/NOTES.md` and `src/room/seatCull.ts`.*
- Two measures: do not draw what the seat cannot see through a wall; merge plain boxes into one draw.
- The proof is strong: each pose rendered with and without, 0 pixels differ.
- Every headset look is now ≤ 63 against a budget of 75.

**Three cautions.**
1. **The count is per picture, and the headset draws two pictures.** PlayCanvas on WebGL draws each eye
   in its own pass. So 63 in the report is about 126 real draws per frame on the Quest. The budget of
   75 was set in the same unit, so the comparison holds. But the margin is the frame rate, and that has
   only been read on the Quest before S396.
2. **Nothing in S396 ran on a Quest.** Its own notes say so.
3. **The 214 spike is at the worst possible moment.** It happens during the 2016 → 2026 change, while
   the camera flies. Dropped frames while the view moves are what cause nausea. He already reported "a
   little vertigo" in an earlier change (H25).

**What would remove the spike.** *BUILD. 1–2 days. Risk: low.*
- Cause (read in `src/room/cluster.ts` around line 557): before a morph, the **whole** room batch is
  torn down, so every prop becomes its own draw until the state settles.
- **Fix A (do this):** tear down only the props that this change moves, scales or recolours. Everything
  that stays as it is keeps its batch. Most of the building does not morph in any one change.
- **Fix B (add if needed):** during the flight, hide the small props of the room being left once the
  camera is above the wall line. The seat cull already knows the rooms as boxes.
- **Check:** the S396 probe already has `--change`. Add one assert: no moment of any change above 75.

**Would another engine fix draw calls? No.** The count comes from the scene. three.js could halve the
real cost with multiview. At 63 that is not worth a rewrite.

## 1.5 Recommendation, and what only a Quest can settle

**Do, in this order:**
1. **His 20 minutes in the headset, steps 0–2** (no build needed). This decides whether anything else in
   this section is needed.
2. **BUILD now, whatever he sees:** the era-change spike (Fix A) and the assert.
3. **BUILD only if step 1 says "still cannot read":** the projection-layer bridge patch, the two-panel
   test card, the corrected quad. Then steps 3–6.
4. **Design, in any case:** treat the headset monitor as a **40-column screen**. At the seat, the 1997
   monitor gives about 11 logical pixels per degree. A letter of 1.2° is then 13 pixels tall, and a
   512-pixel line holds about 45 characters. 2016 and 2026 pack more pixels into the same angle, so
   their text falls under the floor first. Fewer words per screen is the fix that no engine and no layer
   can replace. This is also his own note H08 ("too much text").

**Only a real Quest can settle:**
- whether the 12 Nov fixes made the text readable (S373, S374);
- the true eye-buffer size and field of view (the plate now shows them);
- frame rate in 2003 and 2016, and during the two long era changes;
- whether the Quest shows an old-style layer inside the `layers` list (step 2a);
- whether MSAA survives on a projection layer (step 2b);
- the real gain of a quad layer, as the smallest readable line (step 5);
- comfort with the monitors 1.2× larger and devices held at 0.5 m.

## 1.6 What the web check found (16 Nov, read by a helper; the pages are named)

These answer the points that were open while §1 was written. Two of them correct lines above; the lines
are corrected in place.

1. **PlayCanvas 2.20 → 2.24.1 does not add layers on WebGL.** The engine's current main file
   (`webgl-xr-bridge.js` on GitHub) is the same as ours: one old-style layer as `baseLayer`, and no
   `createProjectionLayer`. The release notes for 2.20–2.24 list XR work only for WebGPU, menus and
   navigation. No issue or pull request about WebXR Layers on WebGL was found in the engine's
   repository. **So an upgrade gives the headset text nothing. Do not upgrade for it.**
2. **The headset bridge is new, not old.** It was merged into the engine on 11 May 2026 (PR #8712) and
   shipped in 2.19. We are on the first version that has it.
3. **WebGPU on the Quest is still experimental.** Meta's browser release notes list every WebGPU item of
   2026 as experimental (the latest: "experimental WebGPU composition layers", 2 Oct 2026). Nothing says
   it is on by default. PlayCanvas's own experiment (issue #7404, closed 26 Sep 2026) found WebGPU XR
   **slower** than WebGL on a Quest 3, most of all with MSAA. **This confirms: do not ship WebGPU mode.**
4. **The WebXR Layers text allows an old-style layer in the list** (W3C draft §11.2 and §11.5). So step
   2a is legal. But no engine does it, and nobody could be found who has shown it working on a Quest.
   The projection layer (step 2b) is what three.js and Babylon.js use. **This supports splitting step 2.**
5. **three.js, corrected.** Its WebGL renderer uses a projection layer by itself, with 4× MSAA. But its
   ready-made quad-layer helpers (`createQuadLayer`, added in March 2025) exist only in its newer
   WebGPU renderer. On WebGL a quad layer would be hand-written there too. So three.js is closer to
   sharp text than PlayCanvas by half the work, not all of it.
6. **Babylon.js** has a layers feature on WebGL with a documented `createQuadLayer`. Its own docs call
   parts of it experimental.
7. **Unity** has no official WebXR export. The community add-on (De-Panther, 0.25.0, May 2026) calls
   itself experimental. Unity's web build officially runs on iOS Safari 15 and newer; reported sizes for
   an empty project are about 2–11 MB before any content *(sizes from search snippets, not opened)*.
8. **iOS:** Safari still has no WebXR (caniuse, every version). Safari 26 has WebGPU.

**Net effect on the recommendation: none. It is firmer.** The only road to compositor-sharp text on
this build, today, is the bridge patch in §1.2, and it should wait for his 20 minutes in the headset.

---

# §2 · The piece itself: a director's pass

**What I looked at.** The 16 Nov walk and its text census (`research/article-images-2026-11-16/
s397-menu-line/walk-30cc0d9f/`). The 12 Nov contact sheets of every era in computer and headset views
(`research/article-images-2026-11-12/job19-partA-S375/sheet-*.png`). The three v6 tapes, as one frame
every three seconds plus their captions. Fresh photographs of today's build, taken with
`tools/stills.mjs` on my own port (5240), kept in my scratch folder, not in the repo. The scripts
v0.3–v0.8, R28 and the Cadence Study came to me as a helper's digest; I did not read every line of them.
**I did not play the piece with my own hands, and I did not hear it.** Everything about sound below is
from the walk's list of clips played, not from listening.

## 2.0 Director's note

**What the piece is now.**
It is a careful, well-sourced museum of interfaces. You sit in front of a monitor in a warm, soft room.
On that monitor, thirty years of software try to correct three people. The software is the best-made
thing in the piece: the 1997 chat room, the 2003 check-in program, Vera's correction queue, the 2026
assistant, and above all the three teaching tapes. They are funny, exact and frightening, and each one
stands on a real page of a real document.

The piece is strongest when **the interface does something to a person while you watch, and you had a
hand in it**. Daniel's diary that the program cannot delete. Caleb's messages going black line by line.
Vera pressing APPLY on another woman's words. The assistant muting Maya's friend. "You, restored · 2027".
These are the moments a visitor will carry out of the room.

**Where it is weaker than it should be.**
1. **The body has almost nothing to do.** The script's one bodily ask was the turn: turn round, and see
   the file kept on you. Two later rulings (never require a look; no conducted turns in the headset)
   were right for comfort. But together they removed the turn and put nothing in its place. In the
   photographs, 30 of 36 frames of each era are the same picture: a monitor, a lamp, a desk. In a
   headset this is a 40-minute piece about looking at a flat screen. The space holds the screens. It
   does not yet carry the story.
2. **The thesis object is behind your back.** "Many hands, one file" is the argument. The file is a dark
   panel on the wall behind the seat (looked at: my still `e1-04-the-turn`). Its letters are about 0.5°
   in the headset, under any reading floor. No rule takes the visitor to it. A visitor hears a stamp
   after each press (about 60 times in the walk) and never sees what was stamped until the Close.
3. **The visit has grown lopsided.** 1997, 2003 and 2016 each take about 6 minutes. 2026 takes 13.6
   minutes and 187 presses, many of them the same three tabs opened again. With the entrance and the
   Close, a visit is about 40–45 minutes. The "short default" has grown from about 255 presses in
   October to 437 now.
4. **There is more to read than anyone can read.** The walk met about 9,400 words on the screens. 2016
   alone shows 3,230 words in 6.6 minutes. That is nearly 500 words a minute, on a monitor that fills a
   quarter of the picture. Visitors will skim, and the skimmed part is where the argument lives.
5. **The start is slow.** Before Daniel's room there are the stars, the title, about fourteen setup
   dialogs and a 90-second film. The first minute is forms.

**What it could be.**
Keep everything that is good: the updates as plot, the rooms, Lamby, the tapes. Then do three things.
- **Let the screen leave the monitor, a little more in each era**, until in 2026 it is the whole room.
  That turns the article's argument (the interface becomes ambient) into something the body feels, and
  it is all in front of the visitor, so no look is required.
- **Bring the file to the visitor's hands at the end of each era**, the way the tapes and the Game Boy
  already come. Thicker each time.
- **Open on thirty seconds of 2026, then fall back to 1997.** The piece is called *Your Update Has
  Failed*. Let the first thing that happens be an update failing.

These three are spelled out in §2.D, with cost and risk. The rest of this section is the evidence.

## 2.A · The visitor's arc

**A1 · The first 60 seconds are administration.** *Weakens the piece. HIS (he made the film mandatory).*
- Looked at: `sheet-entrance-p1.png`. Stars → title → Lamblippy asks five things in a row (whose
  session, a "still being finished" note, sound, how to look, the Start button) → content note → "let me
  show you what we do" → a 90 s film → "All set!".
- The film is good, and its end ("OVER 30 YEARS SOLD AS CARE!") is the thesis. But it states the thesis
  before the visitor has met anyone. After it, 1997 has less to reveal.
- **Fix:** four setup steps at most (session, sound, content note, go). Move "how to look" and "the Start
  button" to the moment they are first needed; Lamby already gives just-in-time hints. For the film, see
  Proposal 3.

**A2 · Where attention rises** (protect these):
- 1997: the private message from MentorRob ("i spoke with your mother. she's relieved"), and the diary.
- 2003: Caleb's thread going black, the streak dying.
- 2016: the first APPLY. The light lifting at Malta.
- 2026: the assistant's "I read your mail"; the picture of "You, restored · 2027"; the friends arriving
  in the stream ("waiting years for a clinic isn't a sign. it's a waiting list").
- Each tape, once it is in the hand.

**A3 · Where attention drops:**
- **1997, middle** (walk steps 124–145): the walker pressed the IRC icon and the intake icon eleven
  times, and nothing changed. A visitor will have the same minute. *BUILD: find what the piece is
  waiting for there and say it, or let Lamby take them.*
- **2003, the testimony** (steps 222–249): the story window opened and closed nine times in a row.
  The walk lists it as presses that did nothing. *BUILD.*
- **2016, the board.** Five jobs, each a screen of 100–150 words in small type. The idea (she is the
  hand now) lands with the first job. Jobs two to five repeat it. *HIS: which two jobs carry it? I
  would keep the testimony job and the places list, because the places list removes a lesbian bar from
  a woman's own post, and nothing else in the piece is that plain.*
- **2026, the browser** (steps 479–733): 250 steps in three tabs. Mail rows, news pages and search are
  each visited four to six times. The assistant's conversation is the spine and it is good, but it is
  cut into pieces by tab-keeping. *BUILD after HIS yes: one pass through mail, one through news, then
  the conversation runs without leaving its tab.*
- **The Close.** After 40 minutes it offers four more pages, a lexicon and nine cards. See A6.

**A4 · Is the length right? No. It is about ten minutes too long, and the extra is in the wrong
place.** *HIS.*
- Target: **about 30 minutes** to the Close. 1997 6, 2003 6, 2016 5, 2026 8, entrance 2, changes 3.
- The headset makes this pressing. Reading soft text for 40 minutes is tiring, and Meta's own comfort
  advice is against it.
- Nothing has to be deleted. The full cut (`?cut=full`) already exists as the home for the rest.

**A5 · Does each era say one clear thing?**

| Era | The one thing | Does the visitor feel it? |
|---|---|---|
| 1997 | The kindest voice is the one that routes you. | **Yes.** Rob's message does it. The diary seals it. |
| 2003 | The program reads your love as evidence. | **Yes**, in the Caleb thread. Before it, the check-in and testimony steps feel like chores, which is partly the point, but they run long. |
| 2016 | Now you are the hand. | **Yes at the first APPLY, then it thins.** Too many jobs, too many words. Vera herself is faint: I can say what she does, not what she wants. |
| 2026 | The machine that "only wants to help" is the newest door to the same room. | **Partly.** The assistant is strong. But the era also carries Mum, Dad, the clinic letter, the LGB group, three news stories, a game, a photo tool, a headset session, a stream, a raid and a naming. It says six things. |

**A6 · The Close asks for reading when the visitor has no reading left.** *Weakens the piece. BUILD for
the order; HIS for the cut.*
- Looked at: `research/article-images-2026-11-13/job21-partA-S380/after/desktop-02-panels-wide.png`, and
  `sheet-close-p1.png`. The four era panels stand at steep angles. The 1997 panel runs off the right
  edge of the frame, mid-word. Each is about 85 words of small type on a slant.
- **Limit of this evidence:** those pictures are from 12–13 Nov. Today's `tools/stills.mjs` could not
  photograph the Close: its frame named "the panels" shows only stars, and it reports "the Close never
  ended… no Restart page still". The 16 Nov walk did reach the Restart page, so I read this as the
  stills tool being out of step with the Close, not the Close being broken. *BUILD: bring the tool up
  to date, then re-check this finding on today's build.*
- The strongest thing at the Close is the **receipt** (*hands: 13 · file: 1*). It is three clicks deep:
  the machine, its page, then the receipt.
- **Fix:** take the visitor to the receipt first, by itself, as the last beat of the story. Then the
  panels, the sites and the Lexicon open as a library for whoever wants them. Turn the panels to face
  the seat.

**A7 · Explains instead of shows.**
- The four Close panels retell each era in prose ("Daniel is sixteen. His mother has found…"). The
  visitor has just lived it. *Cut each to its one sourced sentence and its status.*
- The entrance film (A1).
- 2026's "AI summary · may contain mistakes" boxes explain what the assistant's own lies already show.

**A8 · Shows what no visitor will meet.** *This is the project's known defect class.*
- **The games.** In the guided walk, FIT IN, CLEAR and Floppy Sheep are not on the path at all. Only
  MATCH MADE is played. The article leans on "games that cannot be won" as one of its two kinds of
  failure (companion §4). Today most visitors never touch one. *HIS: either one game per era is put on
  the path for 30 seconds, or the article says they are optional.*
- **The file on the wall** (note 2 above).
- **The room behind the seat.** Looked at in `sheet-1997-p1`, `sheet-2026-p1`: 1997's left wall is one
  poster and a racket on bare plaster; 2026's right wall is empty. Since nobody is asked to turn, this
  costs nothing now. But it also means "rotation IS the exploration" (R28) is no longer true of the
  build.

## 2.B · The space

**B1 · The three rooms are well made and nearly the same picture.** *Weakens the piece. HIS.*
- Looked at: the four era sheets side by side. Each room is framed the same way: window top left, lamp
  left of the monitor, calendar and a poster top right, tower or mug on the right.
- What changes between them is colour and the monitor's shape. That is elegant as "one machine, new
  casing". But it means the era change, which is spectacular, lands the visitor in a picture they have
  already been looking at for six minutes.
- The posters carry real story (the 1997 camp poster "CHANGE STARTS HERE", 2016's "MARCH FOR THE
  FAMILY", 2026's "FOR TRANS YOUTH · COME AS YOU ARE"). They sit at the very top edge of the frame,
  half cut off in the computer view.
- **Fix (BUILD, small):** lower each room's story poster so it is whole in the seat's first view. **Fix
  (HIS, larger):** give each room one thing the others do not have, in front of the visitor: see
  Proposal 1.

**B2 · The turn is gone, and the documents still claim it.** *HIS: a change of direction to name.*
- The one-pager says: "The only thing your body does is turn… the moment its argument lands."
- CLAUDE.md now says no beat may depend on a look, and his 15 Nov note says no conducted turns in the
  headset.
- Both rulings are sound. But the build now has no bodily ask at all. The walk's ledger has one line
  for it in the whole piece (`e4Space:turn:turned`), and that one is conducted.
- **Say it plainly in the one-pager and the article: the piece no longer asks for the turn.** Then
  decide what the body does instead. My answer is Proposals 1 and 2.

**B3 · Seats and sends.**
- One seat per room is right. It keeps the comfort and it keeps the piece honest about being a desk.
- The sends between rooms (the flyover) are the only time the house is seen as a house. They are the
  best spatial idea in the build (looked at: `sheet-era-changes-p1.png`; `sheet-close-p1.png` frames
  `close-t022` to `close-t048`, where the camera lifts out through the roof).
- In 2026 he asked for fewer seat changes and got them. Keep it so.

**B4 · Light and colour.** *Looked at only in stills.*
- The warm lamp against the cold monitor reads clearly in 1997 and 2003. In 2016 the room is the
  warmest and the screen the whitest, which fits "wellness". In 2026 the room goes pale and bare.
- The plan of record says "two lights fight for one room". In the stills the lamp always wins: the room
  stays cosy to the end. **The monitor's light never takes the room.** If 2026 is not gentle (his
  28 Sep correction), the room's light should show it: by the end of 2026 the only light should be the
  screen's. *BUILD, small, after HIS yes.*

**B5 · Sound.** *Not heard. From the walk's list of 160+ clips.*
- Every era has a bed, a boot, a loop for each program and its own notification. That is a full score.
- `stamp_witness.mp3` plays after almost every press: about 60 times in one visit. A sound heard 60
  times stops meaning anything by the tenth. **Suggestion:** keep the stamp for presses that file a
  *named* line (the ledger's `records:`), and let it grow heavier each era. *BUILD; HIS ear decides.*

**B6 · The three look-modes.**
- **Computer:** the monitor fills about a quarter of the frame at the seat (looked at: `sheet-1997-p1`,
  `e1-desktop`). Small text is hard to read there too. The piece has a zoom on the monitor; the stills
  marked "close" show it working. The default view should sit closer than it does.
- **Phone:** the best surprise. A held device fills the screen and reads well (looked at:
  `research/article-images-2026-11-15/job27-partB-S394/pairs/after-phone-1997-held.jpg`). The phone
  suits "bring it to the eye" better than either other mode. But gyro-look has never run on a real
  phone (CLAUDE.md says so). For every Apple device this mode is the piece. **That is the largest
  untested risk in the project, larger than the Quest text.** *HIS: ten minutes with an iPhone.*
- **Headset:** the monitors are bigger in view (looked at: `sheet-2016-xr-p1.png`), and a yellow helper
  plate sits under each one. The view is right. The problem is §1: it is a reading piece in a device
  that is poor for reading.

**B7 · "Never require the visitor to look": where a beat still depends on a look.**
- **The file on the wall** (see the director's note). Not a beat, so no rule is broken. But it is the
  thesis, and it depends on a look.
- **The posters** (B1).
- **2026, the stream.** The walk pressed "the stream" plane 14 times with no effect while waiting
  (steps 757–789). A visitor who does not know where to look or what is live will do the same. *BUILD:
  check what the visitor is shown during those waits.*
- I found no story beat in the walk that is *triggered* by a look. The rule holds.

**B8 · Where taking the visitor there feels forced.**
- **The LambyVision call, three times the same.** In 1997, 2016 and 2026 Lamby calls, the set comes to
  the hand, two minutes play. The grammar is right. But by the third time the visitor knows the ritual,
  and it comes at the same point in each era. *Vary it: in 2026 the "tape" should not be a tape. It is
  a parents' webinar; let it arrive as a tab the assistant opens "for your mum".* *HIS.*
- **2026's headset session** puts a visor on the visitor inside a headset. On the computer it is a
  clear beat. In the Quest it is a picture over a picture. *His eye in the Quest decides.*

## 2.C · The laws and the facts

**C1 · Tone laws. I found no breach in what I looked at.** Checked: the three tapes frame by frame,
the walk's ledger, the text census's 40 heaviest screens.
- Satire stays on the system's own surfaces (the film, the tapes' adverts, Lamby, the games).
- The victims are never the joke. Daniel's chat is written straight ("i don't know if i'm ready").
- The clinical debate: the 2026 news page gives the US review and its critics in two lines, unresolved.
  The 2026 tape says ROGD "is not a diagnostic classification" in its margin, as he ruled.
- No real person is shown or named on a surface I saw. Names on the 2026 tape's Prayer Wall are
  invented first names.

**C2 · Three things to check against the laws.** *All HIS. None is a clear breach.*
1. **Lamby and the Caleb thread.** The Caleb thread is `felt`. The walk's ledger shows
   `caleb:comfort:intervened`, and `data/dialog/s2_caleb.json:315` files it as "support: provided —
   subject reassured". The Cadence Study (§9.11) already called Lambient on screen during Bea's thread
   a breach of the same law. If the comfort in Caleb's thread is spoken by Lamby, it is the same case.
   It may be meant: the system consoling is the cruelty. Then the law's wording should say that the
   system may *intrude on* a felt scene, and the guide may not *guide* in one.
2. **Real organisations on the TV.** The tapes' source line names Love in Action, Exodus, Focus on the
   Family and others, on the system's own screen, while the tape plays. CLAUDE.md allows naming "only
   where the KB documents them", and these are documented to the page. The older rule kept names on
   dossier cards. He ruled for the margin on 15 Nov, so this is his decision, already made. I only
   note that the law's text and the build now differ. *Update the law's wording.*
3. **A real product name.** 2026's inbox has "Greenway Buses · Your 16–17 Saver has ended". "16-17
   Saver" is a real British railcard. The law says invented marks only. *Rename; BUILD.*

**C3 · Period truth.** *Looked at in stills and tapes; dates checked by reasoning, not on the web.*
- **Right:** 1997's teal desktop, floppy kit, dial-up, IRC with nicks and a topic line ("did anyone
  tape the x-files"); the camp poster's 12 July 1997 is a Saturday. 2003's blue program, flip phone,
  messenger. 2016's flat platform board and a phone game in the Flappy Bird mould; the poster's 22
  October 2016 is a Saturday. 2026's assistant with "Memory on", tabs, a hybrid console.
- **To check:**
  1. *2026 tape, source [7]:* "The Christian Post, 5 Aug 2003". As far as I know that paper began
     publishing in 2004. The article may sit on its site with an earlier date. **Open the page and
     confirm the date and the outlet.** *HIS (source).*
  2. *2026 tape, source [13]:* an AP report of 28 Oct 2026. I cannot know it. It is two weeks old;
     keep a saved copy.
  3. *2016 tape as a DVD menu.* He ruled it a DVD. In 2016 a church course was more often a streamed
     video with a PDF workbook. It works as it is, because the tape's own look sells it. Polish.
  4. *2016's date.* The workstation clock reads 06/12. Malta's law is the beat. See §2.C4 for the date
     check.
  5. *2026's country.* The mail reads British (an adult gender service waiting list, an LGB-only
     charity). The news is American. He ruled "no specific country" for the stream. The mix is true to
     how this reaches a young person online, so I would keep it, but it should be a choice.

**C4 · The Close: do claims match sources and status?** *A helper is checking fourteen claims against
the repo's own source notes. Its table is added as §2.C5 when it returns. What I can say now:*
- The four era panels carry one status each: 1997 documentary, 2003 documentary, 2016 **contested**,
  2026 **speculative** (`data/strings/close_network.json`).
- **A status on a whole panel is too coarse.** The 2016 panel holds a plain legal fact (Malta's law)
  and an invented person (Vera) in one paragraph, under one word, "contested". A reader cannot tell
  which part is contested. The same for 2026: the AI assistant is speculative; the executive order and
  the US review in its sources are documentary. *Give the status to the sentence, not the panel. HIS:
  dossier phrasing is his.*
- The tapes' reference lists are the best-sourced text in the project: an archive box and folder, a
  printed page and a PDF page for each quote. They are the model for the rest.
- 2016's date holds: the phone in Vera's screen reads "Tuesday 6 December", and 6 December 2016 was a
  Tuesday (looked at: my still `e3-03-close-the-platform`).

## 2.C5 · The Close's claims against their sources (the spot-check)

*Done by a helper against the repo's own source notes, then read by me. It checked 17 claims. "KB" means
the project's verification notes in `docs/`. Nothing was looked up on the web.*

**The count.** 71 dossier cards: 50 documentary, 6 contested, 15 speculative. Every card has a valid
status. No `[VERIFY SOURCE]` marker sits on text a visitor reads, with one exception (row 7 below).

**Eleven of seventeen match their notes.** Among them: the 1997 questionnaire "never validated"; the
Love in Action application's $80 fee; Malta's Act (final reading 5 Dec 2016, unanimous, Europe's first);
*Ferguson v. JONAH*; the LGB Alliance letter of 30 March 2021; the PLOS ONE correction of 19 March 2019;
Littman's figures, rightly marked contested.

**Six need his eye.** *All HIS: dossier phrasing is his.*

| # | Where | The problem | Severity |
|---|---|---|---|
| 1 | `data/provotypes/e4_offers.json:69` | Says the European Commission "replied … with a non-binding recommendation". The project's own note says the Commission *intends to adopt* one in **2027**. The card states as done what is announced | **Weakens: a factual overstatement on a `documentary` card** |
| 2 | `data/provotypes/origin_intake_e1.json:155` | Bearman & Brückner 2001: "conditional and identity-bound rather than protective". The link pass already wrote: "'rather than protective' is stronger than the paper. Not changed." | Weakens. Known, and left |
| 3 | `data/provotypes/e3_theday.json:74` | Evergreen's 2004 homepage: the card lists "Church Leaders" as an audience. The capture note lists "Everyone" and has no "Church Leaders" | Polish, but it is a quoted list |
| 4 | `e4_offers.json:82` | *Chiles v. Salazar*, "31 March 2026, 8–1", marked documentary/high. The only source in the notes is Wikipedia | Weakens. Needs the court's own page |
| 5 | Close labels (`data/strings/close_network.json:38, 54, 58, 62`) | "Exodus referral map 1996", "Love Won Out curricula", "NARTH position 2006", "Exodus women's initiative 2008": each traces only to a planning note of 2 July. No verification note was found | **Weakens: named organisations with a date, unverified** |
| 6 | `origin_intake_e1.json` cards 9 and 11 | "Insider, 2025" for a video whose upload date in the notes is 5 Feb 2026 | Polish |
| 7 | `e4_offers.json:83` | The UK draft bill is verified. The Royal College of Psychiatrists and Stonewall positions in the same card are marked "listing only, [VERIFY SOURCE]" in the notes, and they are in the shown text | Weakens |

**Three wider points.**
- **The 2016 panel's "contested" is a blend.** Malta's law is documentary. Vera's job is invented: the
  project's own card says "No source documents a platform worker editing women's testimonies". The
  panel then says Malta made "practices like hers" an offence. That sentence joins a real law to an
  invented job. *Reword so the law is about conversion practices, and her job is named as imagined.*
- **The 2009 APA report.** He took it out of the tapes as "quite contested" and said it may stay in the
  Lexicon. It is still cited in 11 Lexicon rows, two dossier cards marked documentary/high
  (`origin_intake_e1.json:148`, `pillow.json:178`), one Close label and eight rows of the era sites'
  model. *One decision should cover all of them.*
- **Real people.** The dossier and Close name researchers and authors as sources (Littman, Turban,
  Ashley, D'Angelo, Conley, Cohen, four US justices, ballroom figures). Citing an author is not using a
  person as a character, so I read this as inside the law. One case is closer to the line: Garrard
  Conley's account is paraphrased at some length in three cards. It is published memoir, not private
  testimony, and it is not verbatim. *HIS to confirm he is content with it.*

## 2.D · Proposals

### D9 · Era by era: protect, change, add

| Era | Strongest moment (protect) | Weakest (cut or change) | One addition |
|---|---|---|---|
| **1997** | Rob's private message, then the diary the program cannot erase. The tape "Understanding Your Roots": the felt board, "garbage in, garbage out", "Unplug it!" | The stall in the middle where two icons do nothing (walk steps 124–145). The profile screen's 13 presses before anything happens | When Rob says "i spoke with your mother", let one thing change **in the room in front of you**: the hall light under the door comes on, or the printed form on the desk gains her signature. The routing leaves the screen |
| **2003** | Caleb's thread going black; the streak falling to 0; "what is left" | The testimony window opened nine times; the check-in that repeats | His line "Then it was never me that was broken…" is in the build, as the one chip under Caleb's last message (`data/dialog/s2_caleb.json:303`). It is the turn of the whole piece. Give it its own silence: nothing else on screen, no sound, three seconds before the update notice |
| **2016** | The first APPLY. "Your 2014 story reached 211 women": Vera was corrected first, and now corrects. Malta, and the light lifting | Jobs three to five. 3,230 words | Make "your 2014 story" matter: the first story in her queue should be **her own**, sent back for one more correction. Then she is hand and target in one press |
| **2026** | "I read your mail." The assistant muting Junie. "You, restored · 2027". The friends in the stream. The tape HEDGE™ ("It remembers what you tell it. And it holds you to it.") | 250 steps of tab-keeping. Six themes at once. Three news stories | Nothing. **This era needs taking away, not adding.** One mail from the clinic, one from Mum, the assistant, the picture, the stream |

### D10 · Three bold proposals

#### Proposal 1 · The screen leaves the monitor

**What the visitor experiences.** In 1997 everything the system says stays inside the glass. In 2003
its marks start to land on the desk: when Caleb's lines go black, a black bar also falls across the
photo or the CD beside the keyboard. In 2016 the correction marks appear on Vera's own wall: the
strike-through and the added scripture are laid over her poster and her calendar, in the same blue as
the platform. In 2026 the assistant's panels stand in the air around the desk before the visor ever
goes on, and by the end the room's only light is theirs. Each era, the interface takes more of the
room. All of it is in front of the visitor, inside about 45° either side.

**Why it is better.**
- It gives the space a story of its own: enclosure. Today the space only changes colour.
- It is the article's argument made physical: the interface goes from a box, to a companion, to
  ambient. Lamby already makes this journey. The room does not.
- It answers the headset's reading problem from the other side. A black bar on a photograph needs no
  reading.
- It needs no look and no turn. It keeps both of his rulings.

**What it replaces.** The turn, as the piece's bodily idea. Nothing is removed from the build.

**Cost.** 8–12 builder days: one overlay surface per room (a single extra draw call each), four to six
authored moments, the light change in 2026, walks in three modes. **Risk:** medium. It could look like
decoration if the marks are not tied to a press the visitor just made. Each mark must follow a press
within a second. Draw calls are safe if each room uses one overlay.

**Reverses a ruling?** No. It touches "the 3D room is staging, not UI" in CLAUDE.md: the overlays are
not pressable, so the one-surface law holds, but the sentence should be updated.

#### Proposal 2 · The file comes to your hands

**What the visitor experiences.** At the end of each era, just before the update notice, the system
"prints your record". A folder comes up before the eye, the way the tapes and the Game Boy do. It holds
three or four lines, each one a thing the visitor just did and what it was filed as: *"spoke in
channel — receptive"*, *"resistant — proceed; consent already on file"*. It is on the screen for about
fifteen seconds. Then the update takes it: "Migrating your file…". Next era, it comes back thicker, with
a new cover and a kinder name. At the Close the same object is the receipt: *hands: 13 · file: 1*.

**Why it is better.**
- "Many hands, one file" is the thesis, and today the visitor sees the file once, at the end, three
  clicks deep. The stamp sound promises a file for 40 minutes and never shows it.
- It is already built as data: the ledger holds every line (the walk prints 170 of them). The wall
  panel already draws them. This moves them to where they can be read, at 1.2° or more.
- It makes the visitor's own presses the evidence. Ethics rule 10 asks for exactly that: every line
  traceable to the visitor's own act.
- It gives each era the same last beat, so the update lands on something.

**What it replaces.** The wall record as the only place the file lives. The 60 stamps become four
moments that matter.

**Cost.** 4–6 builder days: one held object with four skins (index card, printout, dashboard card,
"memory" chip), a 40-word limit per era, the Close's receipt tied to it. **Risk:** low. It adds about a
minute in all. The lines must be the system's cold wording, never a comment by the piece.

**Reverses a ruling?** No. It follows his 15 Nov rule (bring it close).

#### Proposal 3 · Start in 2026, for thirty seconds

**What the visitor experiences.** Stars, the title. Then, at once, a calm modern screen: *"Happy
birthday, Maya. I'm always here."* A progress ring. Then: *"Your update has failed. Restoring from an
earlier version…"* The years count down, 2026 … 2016 … 2003 … 1997, the room un-builds around the
seat, and the visitor is at Daniel's beige monitor. Setup is now three questions asked by 1997's own
software. Thirty-five minutes later the piece arrives back at that same birthday screen, and this time
the visitor knows what is behind it. The last update fails again. Restart.

**Why it is better.**
- The first minute is the story, not the setup.
- It answers the piece's own claim on the one-pager: that these practices are shown as "historical or
  foreign" when they are contemporary. Today the visitor spends the first twenty minutes in history.
- It makes the title mean something in the first minute, and again at the end. The Restart card stops
  being a menu and becomes the loop closing.
- The era-change machinery (the morph, the flyover) already exists and runs backwards in principle.

**What it replaces.** The Lamblippy setup in the stars and the mandatory 90-second film as the way in.
The film is not lost: it becomes what plays on the LambyVision set in 2003, where a 2003 infomercial
belongs, or it stays in the attract loop for exhibitions.

**Cost.** 5–8 builder days: a 30 s authored opening, a fast reverse of the three morphs (or a cut
through them), setup folded into 1997's boot, the ending tied back. **Risk:** medium. It must not spoil
"You, restored". The opening shows only the greeting, nothing of the plot. The 214-draw-call spike
(§1.4) must be fixed first, because this plays three morphs in a row.

**Reverses a ruling? Yes, two.** (1) The entrance as stars → Lamblippy's setup → Daniel's room (13 Oct).
(2) The film made mandatory (October). **His call.**

### D11 · Where the build drifted from the intent

| Intent (script) | Build today | Better or worse? |
|---|---|---|
| "The system updates because it failed, and never says so" | Built, four times, and the diary now *causes* the first one | **Better.** The 31 Oct diary ruling is the best single change in the project |
| The emotional wave: warmth → intrusion → witness → breath → update | Warmth, intrusion and update are there. **Witness and breath are thin.** The witness is behind the seat. Only one scene in the data is marked `respite` | **Worse.** Proposal 2 restores the witness. The breath needs one quiet beat per era |
| The turn as the true refusal ("what it cannot survive is being watched") | Gone | **Neither.** Right to drop for comfort; wrong to leave the hole |
| Movement as permission: the leash widens until "everywhere is already its space" | One seat per room; the system sends you | **Better for comfort, and the idea survives** in the sends. Proposal 1 carries the rest |
| Short path 15 min, full path 35–40 min | One guided cut of about 40 min, called short | **Worse.** The default has become the long one |
| The Close: a version history stamped FAILED; "UPDATE AVAILABLE — for the world, not for you. Status: not yet installed"; "Restart as you are" | The receipt, four era pages, a lexicon, "Restart as you are" | **Mixed.** More honest and better sourced. But the line "for the world, not for you" was the piece's one sentence of hope, and I did not find it on the path. *HIS: is it still wanted?* |
| TransJesus stream as the uncorrupted `respite` that survives every update | An AI-hosted stream that friends raid | **Better as an idea, riskier as a law.** The respite is now the friends, not the stream. Make sure the friends' arrival is the scene marked `respite`, and that nothing of the system speaks during it |
| Lamby absent from 1997; ≤5 lines | One guide from 1997, ≤8 balloons | **Better for visitors.** His ruling, and the exhibition showed why |
| Helper lines sourced to "documented failures" | The tapes go further: real pages, quoted | **Much better.** Not in any script; found in the making |

### D12 · The decided creative choices, challenged

**Keep, without change:**
- **Era changes as software updates.** It is the piece's best structural idea, and it is his thesis in
  a ritual. The flyover and morph are worth their cost on the computer. In the headset, fix the spike
  and offer a plain cut under "Reduce motion".
- **The LambyVision tapes.** The strongest material in the build, and the clearest research result.
  Two minutes each is right. His "no pause" ruling was right. Only vary how the third one arrives (B8).
- **The over-the-top satire that collapses.** It collapses where I looked: the film ends in noise and
  small print; each tape ends on a typed quotation of the programme's own cruelty and "…is invented.
  What it teaches is not."
- **Pixel discipline and soft lo-fi.** The rooms are handsome. The witness side being the sharp side
  is right, and Proposal 2 would at last show it.
- **One seat per room, three rooms that age.**

**Keep, but change:**
- **Lamby, one guide with four skins.** Keep. The risk is that the visitor's helper and the
  perpetrator's mascot are the same voice, so the piece's own voice has nowhere to stand. That is
  intended, and it is sharp. But then **the Close must be visibly Lamby-free**, and today the Close's
  own page is titled "LambyOS · 1997 — 2026" (`data/strings/close_restart.json:74`). *HIS: should the
  piece's last page carry the system's brand?* I would not.
- **The games that cannot be won.** The idea is right and his law for them is right. But in the default
  visit only one is played. Put one on the path per era for half a minute, or stop claiming them as a
  mechanism (A8).
- **The Close and its Restart card.** Keep the parts. Change the order: receipt first, library after
  (A6).
- **The short default visit.** Keep the idea; make it true again. About 30 minutes (A4).

**Question:**
- **The entrance** (stars, setup, film, Daniel's room). It is charming and it delays the piece by about
  four minutes. Proposal 3 replaces it. **This reverses his 13 Oct entrance and the mandatory film.**
- **The turn.** Already gone in practice. Say so, and let Proposals 1 and 2 take its place.
- **The three rooms as three near-identical desks** (B1). Keep the rooms; give each one thing in front
  of the visitor that only it has.

---

# §3 · The research (notes for Sérgio)

*Read: `ARTICLE_RESTRUCTURE_IDEA_2026-10-31.md` (whole); the companion's §1, §2, §4, §6, §8 and its
outline of §7; `ARTICLE_FIGURES_2026-10-31.md`; `ARTICLE_MATERIALS.md` §7–§8; the head of your
`ARTICLE_EVIDENCE_LOG.md` (read, not touched). I did **not** read the companion's §3, §5 or §7a–§7v line
by line. Where a note depends on them I say "check".*

## 3.1 Does the built piece support your argument?

Your argument: digital SOGICE is "a visual and interface culture that keeps redesigning coercion as
care", shown through failure.

**Yes. And the build supports the first half better than the second.**

**Strongest evidence.**
1. **The teaching tapes.** Each is a redesign of the same teaching in the look of its decade: a 1997
   felt board, a 2016 workbook with a watercolour tree, a 2026 exposé webinar. The words are the
   programmes' own, with archive box, folder and page. And you found the same computer metaphor twice
   in the archive: "our mind works like a computer" (Love in Action, 1995) and "she has no file to put
   it in" (Exodus, 1993). **The programmes described people as faulty software before your piece did.**
   That is a finding, not an illustration. It should be near the front of the article.
2. **The helper's four skins.** Mascot → companion → ambient badge → a voice with "Memory on". The same
   job in four casings.
3. **The update ritual**, four times, each with a changelog that renames the same function.
4. **The 2016 queue.** Coercion as care with the visitor's hand on the button.

**Where a reviewer will push back.**
1. **"Failure" is doing two jobs.** Systemic failure (the update) is on the path for every visitor.
   Creative failure (the unwinnable games) is mostly **off** the default path: the 16 Nov walk plays one
   game of five. If the article claims both as the mechanism, the piece must show both, or the article
   must say the games are optional (§2.A8).
2. **"Reconstructs this culture" versus invented marks.** Every interface is invented in the genre of a
   real one. A reviewer will ask how a reader can tell a reconstruction from an invention. Your answer
   exists and is good: the status words, the source lines, "TriedPath and its products are invented.
   What it teaches is not." State that rule as method, early. Then the seven soft spots in §2.C5 matter
   more, because the method's promise is that the sourced layer is exact.
3. **The 2026 era is the most speculative and the longest.** Its panel is marked speculative. It is
   also 13.6 of 32 minutes. A reviewer may say the piece spends most time where the evidence is
   thinnest. The chat front doors card (three real ministry chatbots, 2025–2026) is the answer: lead
   with it.
4. **No audience evidence.** There is the exhibition survey and your own headset notes. The companion
   says this honestly in §8. Keep that section.
5. **"The body" claims.** The one-pager and figure 4 present the turn as where the argument lands. The
   build no longer asks for it (§2.B2). Do not claim it.

## 3.2 What is new here for interactive digital narrative research

**The two or three strongest contributions, and the scenes that carry them.**

1. **The update as plot: a narrative whose protagonist is the system, told through its own version
   history.** The visitor does not change the story; the system changes itself and calls it care. This
   is a clear position on agency in IDN: *the withheld choice as the meaning*. Scenes: the diary that
   forces the 1997 update; the four changelogs; "Remind me later" working once; Shut Down refused.
2. **Second-person complicity that moves.** The visitor is addressed as the target (1997, 2003), then
   as the operator (2016), then as the one being helped by a machine (2026). Most IDN fixes the
   player's role. Here the role is the argument. Scenes: Rob's private message; the first APPLY;
   "I read your mail."
3. **The sourced fiction: every invented surface tied to a status and a page, inside the work.** The
   three-word status (documentary, contested, speculative) and the tapes' running source line are a
   small, reusable method for documentary IDN. Scenes: the tapes' margin; the Close's cards.

A fourth, if you want a headset claim: **one scene in three look-modes as a design constraint**, with
iOS having no WebXR. It is honest and useful to practitioners. But it is the least tested part.

## 3.3 The method

**Worth reporting.**
- **The walk as the gate.** A tool that clicks from the door to the end, and the rule that nothing is
  done until it has. Also what it found: content that existed and could not be met. That defect class
  is a real result about making IDN with AI builders: *the builders verify existence; only a traversal
  verifies encounter.*
- **Your overrides as data.** The memory folder holds about thirty of your corrections, dated, in your
  words, with the reason and what changed after. Examples: "2026 is not gentle" (28 Sep); "None of them
  make me like it… they need to be ridiculous and over-the-top" (1 Oct); "we need to take the viewer
  there" (10 Oct); "I didn't do it" on the music credit (14 Nov); "you are using SOGICE references to
  claim the SOGICE references?" (15 Nov). **This is the most valuable method material you have.** It
  shows where human direction changed what the AI would have made, and in which direction: nearly
  always toward more honesty, more excess in the satire, and less hedging.
- **The research states.** The tapes v1–v6 and the TransJesus trials, kept as versions with your note
  on each.
- **The cost.** Tokens and money, already in §7u.
- **The failures of the process**, which you already list: a credit that was wrong, an archive that was
  listed and not read, tapes handed over unwatched.

**What is missing.**
1. **A single decision log a reader can audit.** The decisions are spread over TODO.md (214 lines of
   very long rows), BUILD_LOG.md (2,300 lines), the memory folder and the companion. For the article,
   make one table: date, your words, what the AI had proposed, what was built instead. Thirty rows.
   The memory files are the source.
2. **Who wrote which words.** CLAUDE.md says the writing is Claude's since 17 Aug, except your `_s`
   lines. The article should give a count: how many shown strings are yours verbatim, how many are
   Claude's, how many are quotations from sources. It can be counted from `data/`.
3. **Which model did what.** Opus 5.5 built and orchestrated; Codex and GPT did named parts; Sonnet
   helped; this review is a different model again. A short table.
4. **What was not checked by a human.** Be exact: you watched the tapes and the headset; nobody has
   read all 9,400 words on the path in order, in the piece.

**What a reviewer will question.**
- Whether "critical making" holds when the maker directs and does not hand-make. Your overrides are
  the answer: the criticality is in the direction. Say that.
- The retired reader gate. Section 8 says no survivor or trans reader has reviewed it. State what
  replaced the gate (the law in CLAUDE.md: no deadname, no borrowed testimony, more care not less) and
  that the offer stands.
- An AI writing survivor-adjacent text. State the limits you set, and give one example of a line you
  rejected.

## 3.4 Gaps

**Claims in the companion the build no longer matches** (from the parts I read):
- §8: "2016 and 2026 cost ~170–196 draw calls… Not yet fixed." **Fixed on 16 Nov** (S396): every headset
  look ≤ 63.
- §6: "the guided version walks in ~251–258 presses". **Now 437.**
- §2 step 5 describes the Close as it was on 31 Oct. Since then: the computer panel and CRT in the row
  (S378–S380), the era websites, the Lexicon in the menu.
- §4's table lists five games as "creative failure". On the default path today: one.
- §8: "The VR layer is days old and has not been in a headset yet." It has now (10 and 12 Nov).
- *Check:* §5 (the headset) and figures 17–26 describe VR-layer features (Lamby with a body, the
  dollhouse, the mouse in the hand). Your 15 Nov rulings changed the headset's grammar. Confirm each
  feature is still in the build before it is claimed.

**Figures to reshoot.** All 26 are dated 31 Oct, and about 100 sessions have landed since. At least:
- fig 4 (the turn): reframe, or drop the claim;
- fig 9 and fig 16 (captioned as draw-call evidence): the problem they show is fixed;
- fig 10–14: already on your list (ARTICLE_MATERIALS §7.1);
- fig 11 (the Commons "as the respite"): the Commons was rebuilt on 10 Nov;
- fig 12–13 (the Close, the receipt): the Close changed on 12–13 Nov.
- **New figures to add:** one frame from each tape with its source line; the LambyVision set in the
  hand on a phone; the three tapes' computer metaphors side by side.
- **No figure is from a real headset.** The figures page says so. Take two through the Quest's cast.

**Sources still open** (from the spot-check, §2.C5):
- ARTICLE_MATERIALS §7.2: the tie between medical fear and the anti-gender movement, still
  `[VERIFY SOURCE]`.
- The Cass Review lines in the Lexicon: only a summary was seen (`data/strings/lexicon.json:775`).
- The UK survey's "13% vs 7%" (`data/strings/close_message.json:7`), never opened at its source.
- The four Close labels with no verification note (§2.C5 row 5).
- *Chiles v. Salazar* from Wikipedia only.
- The 2026 tape's [7] (Christian Post date) and [13] (the AP report): §2.C3.
- The rights to the reference images (ARTICLE_MATERIALS §7.4).

## 3.5 What to study next

**A playtest should measure:**
1. **What they think the piece is about, in one sentence, straight after.** Then compare with "the
   apparatus is never defeated; it is upgraded". This is the test of the argument.
2. **Role.** "Who were you in 1997? In 2016? In 2026?" This tests the moving second person (3.2,
   point 2).
3. **What they read.** Which three things on any screen can they recall? This tests the reading load
   (§2 director's note, point 4).
4. **Whether they noticed the file.** "Was anything being kept about you?" Before and after Proposal 2,
   if it is built.
5. **Where they wanted to stop**, by minute. And whether they knew they could.
6. **Fiction or document?** Show three surfaces: which is invented, which is quoted? This tests the
   sourced-fiction method.
7. **Mode.** The same questions for computer, phone and headset visitors. I expect the phone to do
   better than the headset on reading. That would be a publishable result.
8. **Comfort** in the headset: the era changes above all.

Keep it small and qualitative: eight to twelve people, think-aloud for the first era, a short
interview after. With queer participants, follow the care protocol your ethics file already asks for.

**The research states that best show the process:**
- **The tapes, v1 → v6**, with your notes between them. The clearest case: a counter-voice that
  interrupted (v3), your rule that the system's screen speaks only as the system, the margin (v4), the
  cut to two minutes (v6). It shows a design principle being found.
- **The entrance**, through its versions (the door, Bob, Lamblippy in the stars). It shows your
  rulings on what the frame may and may not do.
- **The 2026 era, v1 → v3**: from a gentle game, to "2026 is not gentle", to pressure and the machine
  as her only friend. It shows the ethics shaping the form.
- The TransJesus trials are a good fourth, for the AI-image side.

---

# §4 · Code health (a short pass)

*Read only. I ran no tests and measured nothing here. Ten findings, most important first.*

1. **`src/engine/app.ts` is 6,145 lines** and holds rooms, seats, era changes, the headset layer and
   the debug hooks together. `src/desktop/os.ts` is 4,855. Every job touches them, which is why
   parallel builders collide. *Do not refactor now. Before the next big feature, lift the headset code
   and the era change out into their own files.* Weakens. BUILD.
2. **Hit areas are computed twice.** The walk reports it: the diary and the update ritual "own no hit
   rects", so their button positions exist once for drawing and once for clicking, and "`kit`'s two
   copies had already drifted by 40 px". The update ritual is the one control every visitor must press
   four times. *Give both one shared rect.* Blocks a visitor if it drifts. BUILD.
3. **Controls that are offered and do nothing.** The walk lists 14, and 143 of 437 presses changed
   nothing. Some are the walker's policy. Some are real: the 1997 icons (§2.A3), the 2003 story window,
   2026's stream plane. Weakens. BUILD.
4. **The headset is tested with a fake.** The probes force `app.xr.active` on in desktop Chrome. That
   checks layout and counts. It cannot check a real session, two eyes or the compositor. Green there
   says little about the Quest. *IWER (§1.3) would be a truer fake. Nothing replaces the device.*
5. **A parked experiment patches the engine on every install.** `postinstall` runs
   `tools/patch-playcanvas-xr.mjs`, and `npm test` checks the patch, for `?quad=1`, which went black
   and is parked. The patch is inert without the flag. But it pins the engine to 2.19.6: any upgrade
   fails the install. *Keep it if §1's test goes ahead. Remove it and `xrMonitorQuad.ts` if not.*
6. **Two probes already fail and are known.** `tools/cx4-xr-check.mjs` and
   `tools/travel-walls-lifecycle.mjs` (S396's notes). A failing check that everyone knows about trains
   everyone to ignore failing checks. *Fix or delete.*
7. **191 files in `tools/`, most of them one-off probes** named after a session (`s362-…`, `cx3b-…`).
   They are evidence of the process and worth keeping for the article. But they are not a test suite,
   and nobody knows which still run. *Move the one-offs to `tools/archive/`; keep a short list that
   `npm test` runs.*
8. **Dead code from superseded designs.** The Bob-style Home and Library (kept on your word, unused);
   `data/paths.json` (the script audit calls it dead); `_dummy.json` provotype cards; the unused `home`
   key in `close_restart.json`; the retired `closeMonitor` and `machinePanel` (S380). Each is small.
   Together they are what a new builder trips on. *List them in one file with "dead, kept because…".*
9. **Stale notes inside data.** `e3_theday.json:79` still says the NYT text is "not yet read", and it
   was read on 13 Nov. `_doc` notes in two files still give Malta's bill title, not the Act's. Old docs
   call the 2026 panel "contested"; the data says speculative. Not shown to visitors, but they mislead
   the next session.
10. **The working tree.** `README.md` is modified and uncommitted; `README.md.orig` and a file named
    `:memory:.ses` sit untracked at the top. The second looks like a database opened with the wrong
    path. *Check and remove.* Polish.

**Checks that pass while proving nothing** (the brief asked):
- the text-angle "PASS" (a calculation, not an eye);
- the draw-call budget (a mono software renderer, not a Quest);
- `--jump` and `?era=` stills as proof of anything a visitor meets (the tool's own header says so);
- "77 checks pass" on a tape nobody watched (your 15 Nov note). The rule you made then is the right
  one: scan, look at frames, then hand over.

---

# The ten most important, ranked

| # | Finding or proposal | Section | Whose call |
|---|---|---|---|
| 1 | **Twenty minutes in the Quest, in a fixed order, before any more headset work.** The 12 Nov fixes have never been seen on the device | §1.1, §1.5 | HIS |
| 2 | **Ten minutes with an iPhone.** Gyro-look is the piece for every Apple device and has never run on one | §2.B6 | HIS |
| 3 | **The file is behind the visitor's back.** Bring it to the hands at the end of each era (Proposal 2) | §2.0, §2.D | HIS, then BUILD |
| 4 | **The body has nothing to do since the turn went.** Let the screen leave the monitor, more each era (Proposal 1) | §2.B2, §2.D | HIS, then BUILD |
| 5 | **2026 is twice as long as any other era and says six things.** Cut the tab-keeping; aim for 8 minutes and a 30-minute visit | §2.A3–A5 | HIS, then BUILD |
| 6 | **Stay on PlayCanvas.** No engine fixes the text or the draw calls. The layer path is a one-week patch, only if #1 says it is needed | §1.0–§1.3 | HIS to know |
| 7 | **Fix the 214-draw-call spike in the era change** (keep the batch for props that do not morph) | §1.4 | BUILD |
| 8 | **Seven soft spots in the Close's sources**, above all the EU "recommendation" stated as done and four dated labels with no verification | §2.C5 | HIS |
| 9 | **The Close: receipt first, library after; panels turned to face the seat and cut to one sourced sentence** | §2.A6 | BUILD + HIS |
| 10 | **Start in 2026 for thirty seconds** (Proposal 3). Reverses his entrance and the mandatory film | §2.D | HIS |

Just outside the ten: the games are off the default path while the article claims them (§2.A8, §3.1);
the article's figures and three of its numbers are out of date (§3.4); 2016's reading load (§2.A3).

# One build job for the builder (needs no call from him)

**UIB_JOB_29 (outline). All in one branch, walked in its own worktree, three modes photographed.**

- **A · The era-change spike.** In `src/room/cluster.ts`, before a morph, tear down only the props the
  change touches. Add to `tools/s396-drawcalls-probe.mjs --change`: fail if any moment is over 75.
  Done when: 2016 → 2026 peaks under 75 in the headset mock, 0 pixels differ.
- **B · Dead presses.** 1997's IRC and intake icons during the wait (walk steps 124–145); 2003's story
  window (steps 222–249); 2026's stream plane (steps 757–789). For each: say what the piece is waiting
  for, or let the press do something. Done when: the walk's "presses that changed nothing" falls below
  80 from 143.
- **C · One hit rect each** for the diary and the update ritual, shared by drawing and clicking. Done
  when: the walk's "surfaces that own no hit rects" list is empty.
- **D · The Close's panels face the seat** and sit whole inside the frame on computer, phone and
  headset. No text change. Done when: a still from the seat shows all four panels uncut.
- **E · Each room's story poster whole in the seat's first view** (1997 camp, 2016 march, 2026 stream).
- **F · Rename "16–17 Saver"** to an invented name.
- **G · Stale notes:** `e3_theday.json:79`; the Malta `_doc` titles; mark the two failing probes fixed
  or delete them; check and remove `:memory:.ses` and `README.md.orig`.
- **H · For the headset session:** a `?debug=1` test card with one line of text at 0.6°, 0.8°, 1.0° and
  1.2°, 1 m ahead. He reads the smallest he can. It needs no layer work and gives the first real
  number.

**His calls, listed separately:**
1. Proposals 1, 2 and 3: yes, no, or a smaller version of each.
2. The length: is 30 minutes the target? Which 2016 jobs and which 2026 threads stay on the default
   path?
3. The entrance and the mandatory film (Proposal 3 reverses both).
4. The games: on the path, or described as optional in the article.
5. The 2009 APA report: one decision for the Lexicon, the two cards, the label and the era sites.
6. The seven source rows in §2.C5, and the wording of the 2016 panel.
7. The Close's last page under the name "LambyOS".
8. The felt law's wording: may the system *intrude on* a felt scene (Caleb's comfort line)?
9. Whether "for the world, not for you" still belongs at the end.
10. The headset layer work: only after his twenty minutes.

*End of findings. Written by Fable 5.2 on 16 Nov 2026. Not played by hand, not heard, not seen in a
headset: see the first lines of §2 for what was and was not looked at.*


---

# Orchestrator's check (16 Nov, S357dv; Opus 5.5)

*Added after the review, so Sérgio knows which claims were checked before he decides. Fable's text above
is unchanged.*

**Holds (checked in the repo):**
- The walk's numbers: 2026 13.6 min and 187 presses; 437 presses, 143 that changed nothing
  (`WALK_2026-11-16_SPEEDRUN_GUIDED.md` lines 14–24); 2016 3,230 words, 9,448 in all (`TEXT_CENSUS` line 9).
- One game on the default path: the walk presses only 2026's `game-play`; FIT IN, CLEAR and Floppy Sheep
  never appear.
- "For the world, not for you" is not in `data/` or `src/`.
- "16–17 Saver": `data/dialog/s4_v3.json:205`. "LambyOS · 1997 — 2026": `data/strings/close_restart.json:74`.
- Only `data/provotypes/e4_ball.json` is marked `respite`.

**Holds, but milder:**
- The EU card (`e4_offers.json`, §2.C5 row 1) says the Commission "replied … with a non-binding
  recommendation, and declined to propose a law". The note it was verified from
  (`RESEARCH_CLOSE_MESSAGE_2026-10-02.md` C15) says "a non-binding recommendation, planned for 2027". The
  missing words are "planned for 2027". Dossier phrasing, so his call.

**Overstated:**
- *"Never sees what was stamped until the Close"* (§2.0 point 2). The record can be opened at any time from
  the Start menu, under My account (`data/strings/map.json:418`, marked optional; the hint is in
  `pauses.json:59`). The point stands in a weaker form: it is optional, and no beat brings it to the visitor.
- *Caleb's comfort line* (§2.C2 point 1). The "comfort" is Lamby's ⟨S⟩ line "I caught it in time." in the
  accountability program, after the redaction (`src/desktop/apps/accountability.ts:19–23`, `:341`). It is
  his own verbatim line, on the system's surface, and designed so (S2R.3C: the apparatus looks hurt). The
  guide does not speak in the felt thread. Probably no breach; his to confirm.

**Resolved:**
- The 2026 tape's source [7] (§2.C3 point 1). The page shows "Tuesday, August 05, 2003", by Pauline J.
  Chang, with the "gender identity deficits" quote (fetched 16 Nov; the address is in
  `TEACHING_TAPES_2026-11-14.md:2156`). The date holds.

**Not checked:** the web facts in §1.6, the stills tool failing at the Close (§2.A6), and the wall
record's 0.5° size.
