STATUS: live

# WHERE THINGS STAND
*⚑ The one file to read first. Rewritten 2026-08-21 from **two independent audits** (Fable and
Qwen 3.8-max, run separately, neither seeing the other's work). If this file disagrees with a
conversation, believe this file. If it disagrees with a code comment, **believe the code.***

## The piece, in one line
A browser/WebXR narrative work about how organised "conversion" networks followed queer people online
and kept updating. One room, one computer, four eras, thirty years. **The update is the plot.**

---

# ⚑ THE HEADLINE, AND IT IS GOOD NEWS
> **The whole played spine is built, wired and triggered end to end** — opening → E1 → T1 → E2 → T2 →
> E3 → T3 → E4 → the Close — **including the hardest beats:** the diary glitch, the dispersal, Caleb's
> collapse, Noa's video, Malta's light lift, the misfile beat, and the ball.

Sérgio's fear was *"so much is missing, so much got lost."* **Both audits, independently, say the
spine is intact.** What is missing is real and countable rather than structural:

| **24 MISSING** | **5 ORPHANED** | **10 PARTIAL** |
|---|---|---|

⚑ **ORPHANED is the class to watch** — authored content that nothing triggers. It is this project's
signature failure and it is why "it's in the data" has never meant "a player sees it."

---

# THE TEN THAT A PLAYER ACTUALLY FEELS
1. **⚑ The piece is nearly silent where it was designed to be sound.** Audio-first E4, the ball, every
   transition — **six audio files, none present.** Biggest single gap in the work.
2. **The E1→E2 transition spectacle** — Sérgio named this from memory and he was right.
   ⚑ **Verified: `os.onGlitch('system')` has no caller.** Only `'person'` ever fires (`os.ts:412`,
   `os.ts:2245`). The machinery exists; the error cascade sits authored and unreachable at
   `s1_end.json:82–104`.
3. **E3's "rest of the workday" surfaces** — Story / Podcast / Course / Livestream
   (`REINTERP_E3_THE_JOB` §§2–5) were confirmed by Sérgio and **never dispatched.** His walkthrough
   complains about exactly this: *"no connection to the other devices."*
4. **s3/s4 visit legs are gated off** (`os.ts:1134`) — stranding the dormant-file payoff and the
   trans-masc borderland. ⚑ **Deliberate and correct for now:** their targets point at a retired
   radial layout, so accepting one flies the camera nowhere. Ungate only after retargeting.
5. **The Close dropped its version-history receipt and the uninstalled-update hope** — still canon in
   MASTER_PLAN, retired by no document.
6. **⚑ No idle wipe and no attract state.** See the correction below.
7. **The graying task** (glitch #1) — zero code.
8. **The intake record never ages** (`intake.ts:266`) — Sérgio hit this: *"on Era 2 it should change
   styles and content… it still says era-1."*
9. **The trans-masc thread is thinned.**
10. **E3's felt anchors are orphaned** — the Sides chart, the convergence triptych.

---

# ⚑ A CORRECTION TO THIS FILE, AND IT IS THE POINT
The previous version of this document said, of the exhibition: *"The ledger already wipes on idle —
that part is done."* **It is not done. There is no idle timer anywhere in the codebase.**

The ledger wipes on `beforeunload` and on the Leave button (`orientingCard.ts:328`). The claim came
from a doc comment at `ledger.ts:6` describing an *intended* "idle reset" that was never built.

> **I read a comment and reported it as verified — in the same file that lists "a comment is not
> evidence" as trap #1.** That is how this project loses things, demonstrated on itself. **Nothing in
> this file is now stated as done unless the code was read.**

---

# THE THREE THINGS THAT DECIDE WHETHER IT IS GOOD
| | state | whose |
|---|---|---|
| **1 · Audio** | ⚑ **Now ranked #1 by both audits.** Six files absent; nothing is scored; lyrics unsynced (word-timed Whisper transcripts exist and are unwired) | Claude |
| **2 · The writing** | 917 lines, most still drafts. `docs/VOICE_PASS.md` lists them in play order. Claude's to finish (2026-08-17) | Claude |
| **3 · The exhibition** | **No attract state, no idle wipe, no design for a stranger arriving.** Not started | Claude |

# KNOWN AND NOT FIXED
- **197 draw calls at Maya's turned E4 seat** vs a ≤75 budget — architectural (unbatched GLB furniture
  across three open rooms), diagnosed, unfixed (`08 §28`). ⚑ **197, not the 141 this line carried until
  2026-09-03** — Lane C re-measured it settled, 5 samples over 5 s, at `yaw = r3.yaw + 180` from the
  authored seat (R1 C-1). The number drifted upward with real geometry added to that seat since 141 was
  taken (S98's laptop, S96/S97's headset mesh and strap, S101's chrome bar), and the turn is the piece's
  one bodily ask — **not a latent leg like the scripted sends.** S107 added the pose to
  `tools/shots.mjs`'s sweep (`r3-turned`) so it is photographed every run instead of being reached by
  hand; S108 owns the batching fix, and **the ratchet is not to be raised to meet it** (trap 6).
- ~~The comfort envelope's historic hazards (3.667 m/s on E3→E4, 6.87 m/s on the send legs)~~ —
  **MEASURED CLEAN 2026-09-02.** R1 Lane C ran the full envelope: **all 13 driven legs sit inside the
  0.43 m/s / 9.1 °/s law**, sustained figures included (worst: 0.423 m/s and 8.87 °/s, both on the
  scripted-send dolly). Neither historic violation reproduces — whatever fixed them holds. ⚑ This
  retires the hazard, **not** the check: the envelope is the one assertion in `shots.mjs` that is a law
  rather than a ratchet, and it stays that way.
- **A11 — the in-headset pass — has never run.** Every comfort figure in this project is desktop-measured,
  the clean envelope above included.
- ~~Era 4 room faults: a CRT in 2026~~ — **RULED AND FIXED 2026-09-01.** Sérgio: *"it doesn't make
  sense to come from a wide computer to CRT."* He is right and the data agreed: Room 2's Era-3 machine
  is a 645 × 372 mm widescreen, so the piece ran 1997 CRT → 2016 widescreen → **2026 CRT**. The machine
  is now KEPT rather than USED — on its own wall shelf as a remembrance — and Maya's desk has a real
  laptop. Still open from that walkthrough: the intake panel clipping the wall, a blue box on the
  armchair.
- Room audit: **72 findings → 34** after the scale fix. The rest are mostly a tool blind spot
  (a garment draped over a chair back has nothing directly beneath it).

# RETIRED — do not re-raise
- **The trans reader pass is not a gate.** Nothing waits on an outside reader.
- **There is no deadname.** The E4 record misfiles Maya ("under the old file"); it never misnames her.
- **`?flat=1` is a review tool, not a fallback.** No design decision may cite it.
- **The monkey is the teddy's mesh**, not a second prop.
- ⚑ **THE FOUR SILENT SUPERSESSIONS — RULED BY SÉRGIO, 2026-08-21.** They are no longer open:
  - **Zap! / JUST CHANGE™ ad-games — RETIRED.** *"We had some game done on Era-3, the FloppySheep,
    so then we don't need the Just Change ads or game there on Era-1."* The playable-ad idea is
    discharged by FloppySheep; v0.5 §6 and the E1 floppy game are both closed. **Do not rebuild them.**
  - **TransJesus — SUPERSEDED BY THE BALL, conditionally.** *"TransJesus is now the Ball, it would be
    back if the ball fails."* ⚑ So the E2/E3 discovery beats stay retired **while the ball works**.
    If the ball is ever cut or fails to land, this is the beat that returns in its place — the only
    supersession here carrying a live fallback.
  - **SOGICEfy player / the dual life — RETIRED.** *"No longer here anymore, too complex to fix now."*
    E1's tapes carry "your music"; the witness-side corrected library is closed.
  - **The locked subtitle ("Nothing to update. Change has failed.") — REWORK.** Not restored as
    written. ⚑ It now collides with the Close's `Your update has failed.`, which S92 built as the
    piece's title finally being spoken. **Two lines that close on the same words cannot both land**;
    the rework has to decide which one owns the sentence.

---

# ⚑ WHERE ERA 4 STANDS — 2026-09-01, and this is the live front

**The opening moved onto the laptop.** Era 4 used to begin with a headset on a dock and no reason for
it. It now begins on Maya's own machine: L introduces itself there, says there is nothing for her to
do, and sends her to the headset. Three presses, one line each. `laptop:read` is filed before
`headset:worn`. Verified by clicking, not by reading.

**The laptop mirrors the headset** once it is on — Sérgio's own idea, the SteamVR/Meta-desktop move —
so the room can see what is being shown to her from outside her head.

**The ending is staged as Sérgio set it:** the device stops and returns to the desk BY ITSELF (nobody
takes it off her), and the Close arrives on the laptop as an update — one notice, one **Restart**
button, armed through the same door the other four updates use.

**Reachability, measured this session rather than assumed:**
- ✅ All ten of L's units play, in order.
- ✅ Her last unit's `handoff` chip starts the offers; they run `curation → pause`.
- ✅ The laptop beat, the wear, the hand-off and the Restart press all work under real pointer presses.
- ✅ **The tail past `pause` — WATCHED, 2026-09-02.** One run on its own clock, 7½ minutes, no review
  params past the era jump: `pause → held → the ball (arrival · off · ball · after) → the press →
  cyclorama → the four year-panels → the glitch → the lid's card`. It finishes.

## ⚑ UPDATED 2026-09-02 (S101) — the three above are now one

1. ~~**THE GLITCH**~~ **BUILT.** 1.2 s, silent, on the visor only, the band-tear over the finale's own
   field with the light going out of it; the device stays on her face through it and eases back to the
   desk afterwards. Both open questions (length, whether L speaks) were decided as mine under the
   autonomous norm and are one-line changes — see the build plan's Stage 4.
2. ~~**L HAS NO VOICE.**~~ **SHE HAS ONE — 2026-09-02.** All 47 clips rendered in one sitting
   (Supertonic F3, `register: apparatus`), **registered** one name at a time in `tapeAudio.ts` — the
   step the data's own note warned about, because an unregistered name is never requested and that
   silence looks exactly like having rendered nothing — and the captions now dwell for whichever is
   longer, the authored reading time or the clip. 22 of the 47 clips ran longer than the hold written
   for them; before this the beat advanced mid-word and started the next line over the top of it.
   Measured in the browser: 34 clips constructed, every one played to its full duration, no overlaps,
   all HTTP 200. `check-spec` audio 91/92, baseline tightened 48 → 1.
   ⚑ **The one that remains is not a TTS job:** `lambyos_2003_boot.mp3`, the E2 boot jingle, a piece of
   sound design nobody has made. It stays declared and unregistered on purpose.
   ⚑ **Era 4 has nothing missing now.** The next thing is Sérgio's ear, not more building.
3. ~~**The tail past `pause`**~~ watched — see above.

### ⚑ AND TWO FAULTS THE GLITCH UNCOVERED, both fixed the same day
Writing the beat made the NEXT surface visible, and the next surface was not there:
- **The Close's restart notice was drawn on the visor** — a plane the hand-off switches off — so
  `Restart as you are.` and then **`Your update has failed.`**, the sentence the work is named after,
  were rendering where nobody could see or press them. The laptop's own card is the notice now, and
  from the dark beat on the lid mirrors the ritual.
- **The ending never arrived.** The conductor holds its breath for the whole era, so its own 22 s hold
  had not begun; the ritual completed and nothing was listening. `Spine.onEra('close')` is an ending
  now, not an arrival. Measured: card → title → constellation.

### ⚑ 2026-09-03/04 — THE FIX ROUND LANDED, AND THE PIECE IS AUDIBLE
S103 · S104 · S105 · S107 · S109 are all in, each verified by observation:

- **The ending is reachable.** The hand-back after the ball sat behind the visor plane's enabled flag,
  which S101 had switched off during that beat — so the glitch, the device returning, the Restart card
  and the Close were all unreachable. Proven fixed through the room's own ray routing.
- **Era 4's opening instruction was off the bottom of the frame.** S107 measured it: the laptop's
  readable panel runs 1.7° past a 21° half-frame from the seat the era is played from, so *"press to
  continue"* was never on screen. Moved up the lid rather than tilting the camera — a rig pitch is a
  world tilt in XR and gyro.
- **The device's "Ready to wear" prompt had never once been drawn.** Same plane gate. Fixed so that the
  affordance IS the auditor's target.
- **~240 texture uploads/s → 2.6–3.6/s**, and `window.__uploads` now exists so the law can be checked
  rather than believed. It had been broken for months with every check green because nothing in the
  repo could see an upload happen.
- **Every era has a room bed**, crossfaded, with the building's drone under the three passages; the
  ball plays its own room. **92 audio names declared, 90 on disk** — the two outstanding are the
  ball's bed and landing, waiting on Sérgio's recording.
- **60 candidate sounds licence-checked** against the Freesound API (59 CC0, 1 rejected CC-BY-NC),
  13 ingested; 13 more synthesized outright (`tools/make_tones.sh`).

### ⚑ AND THE CLOSE ITSELF (Sérgio's 2026-09-02 ask, built)
The ceiling's glow-stars are a real merged mesh the constellation OPENS OUT OF; every network anchor
carries the era of the piece it grounds, so the mesh has a topology at last (frame overhead, four arcs,
three crossings); and four panels — one per era, one per bearing — carry the why/how/what.
`docs/REINTERP_THE_CLOSE_TREATMENT_2026-08-17.md` §6. **Open for him: the panel wording, and era 4's
`status`, which I set to `contested`.**

---


# ⚑ REVIEW ROUND 1 — 2026-09-02, and where it moves this file
Read [`REVIEW_R1_2026-09-02.md`](REVIEW_R1_2026-09-02.md). In one paragraph: the piece is clickable from
the entrance to Era 4 in 135 presses; **the headset works on the played path** — the two runs that could not wear it had pressed Era 2's
`icon-send` rect, still registered on the visor in Era 4, whose projection lands on the frame's pause
button (A-1, resolved by spies; two real defects: a stale rect, and chrome over the headset — S104);
**after the ball nothing can be pressed — the tail to the Close is unreachable by the ordinary route** (A-8, the visor plane is disabled during the ball and the press route sits behind it); the Close's Restart button publishes no hit rect (A-2); the OS and witness textures upload every
frame (B-1); the record still says *Daniel · era 1* in 2026 (A-3, observed on the played path); the
"ready" visor is a black slab again (A-4); Maya's turn draws **197**, not 141 (C-1); the audit's
"Maya's screen" FAIL is a stale line (C-2 — **fixed S107, 2026-09-03:** the seat declares `e_laptop`,
the CRT is re-declared on the quarter turn that S97 placed it for, and both subject-in-frame failures
are gone with the ratchet untouched); the ball is mute and its bed has no code path (A-6); the
three passages are silent (A-7). **Corrections to this file:** the comfort envelope is clean on all 13
legs (retire the hazard — **applied above, S107**); the draw calls at Maya's turned seat are 197, not
141 (**applied above, S107**); the blue box and the clipping panel are resolved; Era 2's monitor is not
blank on the played path; the walker has three blind spots that inflated the last two walk reports.
The three things that decide whether it is good are now ranked audio → the door → the writing.

# THE TRAPS THIS PROJECT HAS PAID FOR
0. ⚑ **A fix can open the hole it is closing.** S104 made Era 4's hand-back reachable by a proximity
   sphere — right for a person, who presses a headset and not a rectangle — and thereby made the last
   press in the work invisible to the only tool that can prove the work ends. **If a player and an
   auditor are looking for different objects, one of them will rot silently.** Here the player's
   version had been invisible for its whole existence and nobody had noticed, because nothing was
   looking at it either.
0b. ⚑ **Stillness is not a dead end.** The walker's loop backstop called the ball — three and a half
   minutes with no controls, ON PURPOSE, the one place the piece asks nothing of you — a loop, and quit
   a minute short of the ending. Any "nothing is happening" heuristic must outlast the work's slowest
   intentional beat, and this work's slowest beat is its most important one.
0c. ⚑ **A refusal list must be anchored.** `tools/walk.mjs` refused `pause_yes` and `close-restart`
   because its FORBIDDEN pattern matched `pause` and `restart` as bare substrings. It could never
   finish the piece. `^pause$` is the frame's control; `pause_yes` is the era's, and the difference is
   the difference between quitting the work and playing it.

1. **A comment is not evidence.** Six sessions repeated a stale header claim; a decision was applied to
   a config constant nothing read; **and this file made the same mistake about the idle wipe.**
2. **Content that exists cannot always be met.** C9 now fails the build on unreferenced data files.
3. **"The geometry is correct" is not an answer to "I can't see it."**
4. **Old behaviour on a device is the Safari cache, not a failed deploy.** Test in a Private tab.
5. **Read test output whole.** Truncating it turns red into green.
6. **Never raise a ratchet baseline to make a run pass.**
7. ⚑ **Placement and rendering were two different numbers.** Props were positioned by an authored box
   and drawn at an unrelated model scale. One fix, 72 findings → 34.
8. ⚑ **MEASURE THE MESH, NOT THE RENDER (2026-09-01).** Fitting a screen plane to the laptop lid took
   four wrong passes off screenshots — 67°, 70°, 74°, 90°, and twice the plane ended up INSIDE the mesh:
   hittable, advancing the beat, invisible. The GLB had the answer all along: materials are NAMED
   (`Screen`) and glTF accessors carry exact min/max, so `node -e` on the file gives the true rectangle
   and its normal in one read. The normal is what settled a 5.39° lean no bounding box could express.
9. ⚑ **A PROBE THAT ALWAYS PRESSES THE FIRST OPTION MEASURES ITS OWN POLICY.** `tools/walk.mjs` took a
   provotype's repeat branch 70 times in Era 1; a hand-written probe then took L's `correct3` loop
   forever and I nearly reported "Era 4's offers never start". Both times the content was fine. When a
   beat appears not to advance, check which branch is being taken before believing the finding.

# THE AUDITS THEMSELVES
`SCRIPT_VS_BUILD_2026-08-21.md` (Qwen) · `..._Claude.md` + `..._SIDE_FINDINGS_Claude.md` (Fable).
⚑ **Run independently, and the disagreements are the valuable part.** Qwen corrected Fable on six
points — e1.b03's staging was Sérgio's own R26 retirement rather than a loss, Room 3 has 68 belongings
props, its CRT is a documented decision, Tape C track 1 is a real recording. **Two readers with no
shared context caught what one confidently got wrong. Use two again.**

# WHAT SÉRGIO NEEDS TO DO
**Almost nothing, deliberately.** Look at it occasionally and say what is wrong. That is the input this
project converts best — his walkthrough of 2026-08-21 found more than four automated sessions had.
