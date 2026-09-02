STATUS: live

# ERA 4 — THE BUILD PLAN, STAGED SO THE ROOM DOES NOT GET LEFT BEHIND
*Sérgio, 2026-08-05: "run a room design layer, and an OS design layer, and the overall design of the
system… but let's not fall in the same issue of what happened with Era 3 that still has a room to be
actually built (like the phone doesn't exist etc). So be careful to think the steps beforehand."*

## ⚑ He is right, and the numbers are worse than the complaint

Counted from `data/room/reinterp_deltas.json`, not from any doc:

| | props | what they are |
|---|---|---|
| **Room 1** (Daniel) | **107** | the benchmark — tapes, kit, diary, mixtape, belongings |
| **Room 2** (Vera) | **73** | shell + furniture + ~38 belongings **added by S66** |
| **⚑ Room 3** (Maya) | **37** | shell + furniture + **zero belongings** |

**Room 3's 36 props are almost entirely architecture** — floor, ceiling, three walls, lintel, seven
window pieces, curtains, poster, sign, door — plus desk, chair, bed, nightstand, bookcase, rug, a CRT
in five pieces, keyboard, mouse, two folders. **No lamp, no mug, no cardigan, no books, no calendar.**

> **Room 3 today is in the state Room 2 was in BEFORE S66** — the exact state Sérgio complained
> about. And Era 4 happens there.
> *(Clarifying my own bad sentence, which read as if I had confused the mapping. I had not, and it is:
> **Room 1 = Daniel, Eras 1 AND 2** · **Room 2 = Vera, Era 3** · **Room 3 = Maya, Era 4.** The
> comparison above is of BUILD STATE, not of which room belongs to which era.)*

### And the phone really does not exist
```json
{"id":"w_phoneDevice","pos":[-2.42,0.51,-0.72],"size":[0.07,0.012,0.14],"color":"#2C2C34","yaw":90}
{"id":"e_phone","pos":[4.9,0.77,1.12],"size":[0.09,0.012,0.17],"color":"#1A1A24","yaw":270}
```
**No `model` field on either.** They are untextured boxes. The comments thread, the template picker,
the propagation, FloppySheep and Malta are all read on a small dark rectangle.

### What Era 4 currently changes about its own room
`r4` = **seven colour/position overrides and one added box.** Three window panes go dark, the CRT
screen goes blue, the lamp moves 3 cm, and a phone appears. **That is the entire physical difference
between 2016 and 2026** in the room the last quarter of the piece takes place in.

**So building S73's software first would reproduce the Era-3 fault precisely, one era later.**

---

# ⚑ THE ORDER, and why it is not the obvious one

The instinct is *room first, since the room is behind.* **That is wrong on its own** — a room built
before the era is designed guesses at what it must hold. Where does L's voice come from? What is the
"all-in-one" the design keeps referring to? Where is the ball watched from? Where do the memories
surface? **A room that guesses those gets rebuilt.**

So: **a cheap design stage first, then the room, then the software.**

## Stage 0 · THE SYSTEM DESIGN — small, no code, here
**The only job: decide what the room must physically contain**, so Stage 1 cannot guess wrong.
Roughly a half-session, and it unblocks everything:

**✅ ITEMS 1–4 ARE ANSWERED** by `REINTERP_E4_THE_DEVICE_2026-08-05.md` (Sérgio's headset question,
2026-08-05). The device is **the headset**; captions live on the visor, which is **the same 2D canvas
remounted**, so the one-surface law survives intact; the memories are served to the visor; and the
ball is deliberately **NOT** watched through it. What remains for Stage 0 is item 5 and the prop list
that falls out of the above.

1. ~~What is the device?~~ **the headset** — the all-in-one the audio design asked for and the data
   never had.
2. ~~Where do captions live?~~ **the visor surface** — accessibility and the one-surface law agree.
3. ~~Where is the ball watched from?~~ **not through the device.** The one thing not served.
4. ~~Where do the memories appear?~~ **the visor.** They arrive at her face; that is the point.
5. **⚑ THE TOUCHLESS BUDGET** (below) — still open, and now load-bearing: the device is *how* the
   apparatus gets past the turn.

## ⚑ Stage 0.5 · "Almost touchless" — Sérgio's own note, made into a rule
> *"I kinda like that this era is almost touchless, as the system navigates through you."*

**Adopt it as an input budget that shrinks era over era, and it completes the escalation:**

| | verb | what the player does |
|---|---|---|
| E1 1997 | *receive* | inserts, answers, types **one name** |
| E2 2003 | *respond* | chips, check-ins, one commit-press |
| E3 2016 | *operate* | applies, skips, replies, publishes — the busiest era |
| **E4 now** | *watch* | ⚑ **almost nothing. The beats advance themselves; L moves you.** |

**And TRANSCENDANCE gives the one input back.** In the era where you have stopped being asked for
anything, the ball is the only place you *do* something — and it is the turn, the piece's oldest
gesture. **The input budget bottoms out and then returns, once, in the only room that wants you.**

That is a better argument for the ball than anything in the deep pass, and it came out of his note.

## ⚑ Stage 1 · THE ROOMS — and it is all three, not just Room 3
**CORRECTED by Sérgio, 2026-08-05:** *"Vera's room has a lot of mistakes, all the rooms built have
still a lot of logistics and object errors. So no, it's not done."*

**I framed Room 2 as finished and Room 3 as behind it. That was wrong, and it would have set the
wrong target** — building Room 3 up to a standard that is itself not met. Room 2's 73 props are a
*count*, not a verdict, and S71 deliberately fixed only what was provable by measurement and left
every judgement call as a proposal. **That backlog is still open, in every room.**

So Stage 1 is a pass over **all three rooms**: Room 3 needs a life it has never had, and Rooms 1 and 2
need the logistics and object errors cleared. `npm run audit` and `room-audit.mjs` catch the
measurable half; the rest is Sérgio's eye and a session sitting in every seat.

### Room 3 as a livable place
**S66's contract of intent, applied to Maya**, exactly as he asked on 2026-08-03 (*"should be
something to do for all 4 moments"*): the room must show somebody lives here, and she is not the
story — she is who the story is happening to. Room 1 is the benchmark; Room 2 is the recent worked
example; **~35 belongings is the target**, not 38 copied.

Plus the fixtures Stage 0 named, plus **the phone and the device given actual models** — the S66 debt
paid in both rooms this time, not one.

**Judged by:** screenshots from every seat, `node tools/room-audit.mjs`, and `npm run audit`.
⚑ **This stage has a real oracle** — a measuring tool, a benchmark room, and a before/after — which
is exactly what makes it delegable.

## Stage 2 · THE OS + THE AUDIO SPINE
L's lines as data + captions, the shrinking chips, the room's spoken captions, the memories feature
and its inverse, the export beat, the deadname beat, the finale hand-off. **The TTS pipeline wired
and the clips pending Sérgio's voice pass.**

## Stage 3 · THE BALL
Built last, after the concept settles and **after the reader** — Sérgio: *"you can later build the MC
lines after the idea is also conceptualized."* The scene, the sound design, the turn, the failing
captions and `NO CATEGORY FOUND` are buildable now; **the MC's words are not mine to draft.**

---

# ⚑ CAN SUBAGENTS DO THIS IN ONE RUN? — the honest answer

**Partly, and the split is not where it looks.**

**✅ Stage 1 (the room) is genuinely delegable to a cheaper model.** It has a measurable oracle
(`room-audit.mjs` agrees with the engine to 0.00000 m), a benchmark to match, and acceptance you can
see in a screenshot. It touches `data/room/*.json` and `src/room/*` and nothing else.

**❌ Stage 2 (the OS) is not.** Every beat in it is a register call or an ethics gate — the deadname,
the LGB-split curation, the speculation labels, `felt` scenes L must be absent from. That is the
judgement this project has repeatedly had to correct, and it should not be split across contexts.

**❌ And they must not run simultaneously in this worktree.** Disjoint file sets are necessary but not
sufficient: **two sessions in one worktree share one git index** — the S43/S44 collision. If Stage 1
and Stage 2 are to overlap at all, Stage 1 goes in its own worktree.

**⚑ The cost that is easy to miss:** a subagent starts cold and re-derives context, and the context
here is CLAUDE.md + the ethics constraints + four E4 documents. For a stage with a mechanical oracle
that is worth paying. For one with an ethics gate it is a false economy — the re-derivation is
exactly where the judgement gets lost.

**Recommendation:**
- **Stage 0 here, now** — half a session, no code, unblocks the rest.
- **Stage 1 as its own session** (delegable; a cheaper model is reasonable).
- **Stage 2 as its own session** (Opus, high effort, not delegated).
- **Stage 3 after the reader.**

**Four sessions, not one.** Era 3 took five and its room is still unbuilt — the difference is that
this time the room is stage one instead of a follow-up that never came.

---

# Corrections and confirmations recorded (Sérgio, 2026-08-05)
- ✅ **Invented material only** — confirmed, no exceptions.
- ✅ **The MC's lines come later**, after the concept is settled.
- ⚑ **CORRECTION — E1 has no handwritten label.** My "handwriting disappears across the eras" idea
  assumed the mixtape carried one. It does not. **So this is an ADDITION to Era 1, not a discipline
  to maintain** — it costs an art pass on a shipped era, and it should be judged on that basis rather
  than as a free through-line. Parked as a proposal, not folded into any stage.
- ✅ **`Household` / house stays unglossed.**

---

# ⚑ Stage 4 · THE GLITCH — added 2026-09-01, and it is SPEC, not built

**Why it is written here instead of tried.** Sérgio, 2026-09-01: *"regarding the
needs of the glitch. This needs to be inscribed to the ERA_4 building plan so it
can be built before being tried."* He is right, and this era in particular has
form: S76/S77/S79 each left a seam named and empty, and the two that got built by
improvisation (the headset's read, the visor's own screen) each took three passes
and a measurement to undo. The glitch is a *register* decision before it is a
visual one, so it gets specified first.

## What already exists around it

The staging Sérgio set is BUILT and verified by clicking (S100):

- `E4Shell.handOff()` drops `worn`, so the visor eases back to its rest pose on
  the desk on its own.
- The visor plane is disabled unless the device is worn or waiting, so the
  headset is only the model once it has stopped.
- The laptop carries the Close as an update — *"L is still here. / this session
  did not end / The headset stopped responding and returned to standby."* and one
  **Restart** button, which arms the `close` update through the ordinary door.

**What is missing is the moment between**: right now the picture simply ends and
the device is back on the desk. There is no glitch.

## The spec

**Where it plays.** On the VISOR, and nowhere else. Not on the laptop (which is
calm throughout — it is the machine that survives), not on the room, not on the
frame. `theme/era4.ts` already has `glitchBands(ctx, W, H, k)`, written for the
install and unused here.

**When.** Inside `handOff()`, before `worn` drops: a `glitching` stage of ~1.2 s,
then the visor goes dark, then the plane disables and the device is on the desk.
The Close's laptop card arrives after it, not during.

**⚑ THE REGISTER, and this is the part to get right.** L stays polite to the very
end — that is the era's law (`s4_l.json`'s `_docVoice`, and E3's own `_docBlock`
before it). So the glitch is NOT violence and NOT horror:

- **It is not L breaking.** L does not distort, stutter, or turn menacing. If L
  speaks at all here it is one ordinary line, at ordinary volume.
- **It is the PICTURE failing while the voice does not.** The Sunroom is what
  comes apart — the room that was "arranged for you" — and the thing that keeps
  working is the apparatus. That is the same move the E3 cascade makes: the
  software is not broken, it is outnumbered.
- **Tone dial ≤ +1.** No red, no alarm, no error glyphs, no sound of damage.
  `ERA4`'s own palette only.
- **It must not read as the player's fault.** Nothing the player pressed caused
  it; the era's law is that updates are triggered by documented system failures,
  never by the player (CLAUDE.md).

**Acceptance, checkable by feel:** you are inside a room that was made for you, it
stops being able to hold itself together, the voice that made it says nothing
unkind, and then you are looking at your own desk with the headset on it and your
laptop asking you to restart. Nobody took the device off you.

**Open for Sérgio:** how long, and whether L says anything at all during it. My
read is ~1.2 s and silence — she has already said everything, and a line here
would be the piece explaining its own ending.

## ⚑ BUILT 2026-09-02 (S101) — and both open questions were decided, not dodged

Sérgio said *"please see that your plan is done. We need to continue"*, so both
were taken as mine under the autonomous norm, and both are one-line changes if he
disagrees:

- **1.2 s** (`GLITCH_SECONDS` in `src/desktop/apps/space.ts`), quantised into 12
  steps so a failing picture costs twelve texture uploads, not one per frame.
- **Silence.** L says nothing and does not distort.

What was built, exactly as specified: a `glitch` stage between the finale and the
desk; the band-tear over the finale's own field with the light going out of it;
`E4Shell.pinned` so the room keeps the plane on her face through it and eases the
device back to its stand only afterwards; and `handOff()` split so nothing —
neither the spine nor the laptop's card — moves until the picture has finished
failing.

### ⚑ AND THE BEAT AFTER IT WAS BROKEN, WHICH THE SPEC DID NOT KNOW

Writing the glitch made the next surface visible, and the next surface was not
there. Two faults, both fixed in the same session, both of the *"content that
cannot be met"* class this project keeps paying for:

1. **The Close's restart notice was drawn on the visor.** `UpdateApp` draws on the
   OS canvas; in E4 that canvas IS the visor plane; the hand-off switches that
   plane off. So the bare `Restart as you are.` card and then `Your update has
   failed.` — the sentence the work is named after — were rendering onto a
   surface that had left the room. The laptop's own card is the notice now
   (`UpdateApp.acceptNow`), and from the dark beat on the lid mirrors the ritual.
2. **The ending never arrived.** The conductor holds its breath for the whole of
   Era 4 (`os.sendOfferPending`), so its own 22 s hold had not begun, let alone
   elapsed; the ritual completed and nothing was listening. `Spine.onEra('close')`
   is an ENDING now, not an arrival.

**Measured end to end, twice** — the tail on its own clock (7½ min: headset on →
ten L units → offers → pause → ball → finale → glitch → the lid's card) and the
card → the title → the constellation.
