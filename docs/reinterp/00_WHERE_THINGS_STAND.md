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
- **141 draw calls at Maya's turned E4 seat** vs a ≤75 budget — architectural (unbatched GLB furniture
  across three open rooms), diagnosed, unfixed (`08 §28`).
- **A11 — the in-headset pass — has never run.** Every comfort figure in this project is desktop-measured.
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
"Maya's screen" FAIL is a stale line (C-2); the ball is mute and its bed has no code path (A-6); the
three passages are silent (A-7). **Corrections to this file:** the comfort envelope is clean on all 13
legs (retire the hazard); the blue box and the clipping panel are resolved; Era 2's monitor is not
blank on the played path; the walker has three blind spots that inflated the last two walk reports.
The three things that decide whether it is good are now ranked audio → the door → the writing.

# THE TRAPS THIS PROJECT HAS PAID FOR
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
