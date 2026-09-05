STATUS: live

# THE NEXT ROOM PASS — Sérgio's four notes of 2026-09-05, prepared not built
*Written at the end of a session, deliberately, so none of it is reconstructed from memory next time.
Three of these are his rulings and one is a question I answered. The Daniel fix was NOT deferred — it
is an ethics correction and it shipped the same hour (see §2).*

---

## §1 · THE FLAG — keep the idea, lose the affirmation
> *"I would love for the idea of the TransFlag to be there, but it should not be affirming, it should
> be something more related."*

**He is right and it is my error to own.** I hung five flat bands on the wall and argued in the prop's
own `_doc` that it was "small, low, among ordinary things" — but placement was never the issue.
**A flag on a wall is a declaration, and the declaration is the WORK's, not Maya's.** This piece's
whole method is that it *depicts* a life the apparatus targets around; it does not stand next to that
life and affirm it. The moment the room says something on her behalf, the room has a position, and
`respite` becomes advocacy.

⚑ *"Something more related"* is a direction, not a spec, so here are the four readings I can build,
worst to best as I see them. **His pick, not mine.**

| | what it would be | why |
|---|---|---|
| A | the flag **folded, half-packed** — on the bed, or in an open drawer | it is a thing she owns rather than a thing she announces. Also rhymes with `movingBox1/2` in Room 1: rooms in this piece get packed |
| B | **the colours without the flag** — a wristband on the desk, a pin on the backpack strap, the photo-strip on the pinboard | incidental, the way most people actually carry it. The room stops speaking and just *is* |
| C | the flag **face-turned / behind the pinboard**, only an edge showing | closest to "not affirming", but risks reading as shame, which is a different and worse statement |
| D | ⚑ the colours as **the APPARATUS's** — a Restorify/GracePlatform "ally" badge, pride-branded, in the software's own voice | the sharpest satire available and the one that collapses on its own. But it puts the flag in the perpetrator's mouth, and that needs his ethics call before anything else |

**Fence when it happens:** `data/room/reinterp_deltas.json` (`e_flagA`–`e_flagE`, one line to strike),
plus whichever new prop the pick needs. `e_flagA`'s `_doc` already says it is his to strike.

## §2 · THE INTAKE'S "Daniel" — ⚑ DONE, not deferred
> *"Please prepare for the 'Daniel' from the Intake, that is not okay. The rest seems okay!"*

**Fixed the same hour** (`src/witness/intake.ts`). S106 printed the file's registered 1997 name on the
index card in era 4, arguing that the gap between it and the SUBJECT row (`Maya — under the old file`)
*was* the beat. The gap is real. What it costs is that **a name belonging to someone else is printed,
in 2026, on a panel in Maya's bedroom, and a viewer has no way to know it is a different person's
rather than hers.** The piece has one absolute rule about this surface — *no name that is not Maya's
is ever rendered here* — and "it is Daniel's, not a deadname" is an argument the screen cannot make.

The card first carried **her** name instead, with the misfile still reading above it. ⚑ **Then §3b
superseded that an hour later** — the whole migration went, so there is no era-4 panel for either name
to appear on, and the record carries the file's own registered name and nothing else. Both steps are
in the history and the second one makes the first moot; this section is kept because the RULE it
states is the one that will matter again: *no name that is not Maya's is ever rendered on that
surface*, and "it belongs to a different character" is an argument the screen cannot make.

⚑ **"The rest seems okay"** approved the era-4 wording as it stood — and then that wording was retired
with the link it described. What survives of S106 is the record ageing inside Daniel's own six years
(`witness.eras` e1/e2), which is what R1's A-3 actually asked for.

## §3 · THE BOXES ON THE FLOOR — ⚑ answered: yes, and it was my documentation that failed
> *"The boxes on the floor are supposed to be there?"*

`movingBox1` (0.5 × 0.4 × 0.5) and `movingBox2` (0.4 × 0.3 × 0.4), in **Room 1**, arriving at the `r3`
fold — the same fold whose own doc says *"Room 1 closes (Daniel 'transferred') in the same state."*
**They are his room being packed.** They carried no `_doc` at all, so the one prop in that room that
carries the whole event read as leftover geometry. Both now documented.

⚑ **Open, small:** if they stay they should read as moving boxes rather than as two plain cubes — a
taped seam, a label. Noted for the Room 1 pass.

## §3b · ⚑ THE LINK IS CUT — and Maya's wall now has a gap
> *"The whole narrative of Daniel and Maya was not working, so it needs to be cleared out"* — scoped by
> him, same day, to **the link between them**: both people stay, they stop being the same file.

Done (`cluster.ts`, `intake.ts`, `slice.json`, `reinterp_deltas.json`). `TERMINAL_E4` and
`migrateTerminal()` are retired, the record is now hidden at E4 exactly as it is at E3, the era-4
misfile vocabulary is gone with it, and `e_recordMount` — which existed only to frame the migrated
plane — is deleted. The record lives and ages entirely inside Daniel's own six years now.

⚑ **What it leaves:** Room 3's desk wall is bare from z 1.31 to 2.42 — the 1.1 m the record occupied,
above the head of the bed. Her shelf, poster, photograph and lights all sit at z ≤ 1.26, so the
resting view is unchanged; it is the turn to the right that now finds nothing. **Do not just refill
it** — §4's note ("there are details we can remove") applies here first: a bed with bare wall over it
is ordinary, and Room 3 gained 32 props from me the day before.

## §4 · ROOM 2's WALL — remove, don't add
> *"The wall on the Room2 has too many erros still like 3 postes all close toghter, you can remove the
> bookshelf in Room 2 and the books there. They have no use. So there are details we can remove."*

⚑ **This is the note I want to keep hold of, because it inverts the instinct of the last three
sessions.** S66 added ~38 belongings to Room 2 and S115 added 32 to Room 3, both under "the room must
show somebody lives here". His correction is that a count is not a room: **things nothing uses are
clutter, and clutter is a cost — draw calls, occlusion, and a reader's attention spent on nothing.**

**The three-posters fault, measured.** Room 2's west wall carries `w_poster`/`w_posterFrame` at
z −0.22 and `w_sign`/`w_signFrame` at z 0.34 — 0.56 m apart, both at y 1.6, on a wall that also holds
its window. That is the SAME row-of-frames arrangement S115 already broke up in Room 3 by stacking her
two into one column at z 0.88. **Room 2 needs the same treatment it never got**, and the third thing
he is counting is most likely `w_frame` (the small leaning photo at x −4.14, y 1.45) reading as a
third picture from the seat.

**The bookcase and its books: strike.** `w_bookcase` (model) plus **eighteen** `w_bookRow*` props in
three rows of six — 19 props, all inert, none referenced by any beat, ledger entry or hit test. On the
draw-call side that is real money at exactly the pose S108 could not get under budget: the E3 turn
faces this wall.

**Fence when it happens:** `data/room/reinterp_deltas.json` — remove `w_bookcase`, `w_bookRow0_*`,
`w_bookRow1_*`, `w_bookRow2_*` (19 ids); re-place `w_poster`/`w_sign`/`w_frame`. Then re-measure the
E3 turn (146 before this pass) and re-run `room-audit`.

⚑ **And the same eye should go over Room 1 and Room 3.** He said *"there are details we can remove"* —
plural, general. Room 3 gained 32 props from me yesterday; some of them will be on this list, and I
should be the one to say which rather than defend the lot.

---

## What is still his, unchanged
1. **The ball's recording** (R1-1) — the only thing holding `AUDIO_BASELINE` at 2.
2. **The Close's four panels** — reviewed in place when S114 runs, per his own instruction.
3. ⚑ **The palette at the turn** (new, from S108): the E4 turn draws **140** against a ≤75 budget, and
   the remaining gap is the number of distinct colours in one frustum, not the batching. §4's removals
   push in the right direction on their own — which is the first time "fewer things" and "cheaper"
   have pointed the same way in this project.

---

# ⚑ §5 · THE ROOMS THAT EMPTY BEHIND YOU — Sérgio's idea, 2026-09-05, and it is the real answer
> *"what you mean with this is having the rooms all opened that it creates issues when you turn around
> to see them right? so maybe we can remove stuff from the other two rooms to help out and if needed we
> can make a new state to the rooms after we've been in them so they can have a fuller state when we
> visit, but when we move away they become bare — maybe we can even make it into an element of choice,
> as a symbol of the trying to erasure the person, or maybe even of hope, that they got out of the
> cycle of capture of SOGICE (maybe we can do this)"*

**He has read the problem exactly right, and then solved it in the piece's own language rather than in
the renderer's.** Recording it in full because it is the strongest structural idea to arrive in weeks
and it must not be reconstructed from memory.

## §5.1 · The diagnosis is confirmed — and my first evidence for it was junk
Yes: the cost is that all three rooms are open and furnished at once, so the turn holds the whole
building.

⚑ **BUT THE MEASUREMENT I FIRST OFFERED WAS INVALID, AND HE CAUGHT IT.** I reported that striking Room
2's bookcase and its eighteen books moved "the E3 turn from 146 to 146" and concluded that deleting a
prop which shares a colour saves nothing, anywhere. Sérgio: *"You have to check the way then this
happened."* He was right to. **That pose never contained the props.** Projected from it, the
bookcase's own position lands at (13195, 3324) with depth 0 — behind the camera. I had measured a view
that could not have changed and reported the non-change as a finding.

**The real A/B**, same build, four poses, before and after the removal:

| pose | before | after | |
|---|---|---|---|
| Room 2, facing where the bookcase stood | 32 | **27** | −5 |
| Room 2's own seat | 34 | **30** | −4 |
| **the E4 turn** | 139 | **139** | **0** |
| Room 2 turned away (the pose I wrongly used) | 168 | 168 | 0 — it faces the other way |

So: **removing props DOES cut draw calls where you are standing near them** — 16% in Room 2 — and it
does **nothing** at the turn, which is the pose the budget is about. My conclusion about the turn
survives; the sweeping version of it ("deleting a shared-colour prop saves nothing") does not, and I
should not have generalised from one pose without checking the prop was in it.

⚑ **Why the turn is unmoved is the thing that matters, and it points at his idea harder than my wrong
version did.** A batch's bounding box spans the whole building, so once a colour is alive anywhere it
is in the turn's frustum from everywhere. Thinning ONE room cannot remove a colour the other two still
wear. **Emptying a room can.** That is the difference between a diet and his proposal, and it is why
the diet is worth doing for legibility while only §5.2 buys the frame back.

## §5.2 · The mechanism: rooms are FULL when occupied and BARE when left
A per-room state on top of the existing era fold: a room is dressed while the era lives in it, and
strips back to its shell once the piece moves on. From Room 3's seat in 2026 the turn would then hold
one furnished room and two emptied ones — which is where the draw calls go, because the emptied rooms
carry a handful of colours instead of a hundred.

⚑ **The machinery already exists and is nearly free.** `clusterMorph` folds prop deltas per state and
`batching.ts` rebakes on settle; an "emptied" pass is another delta, not a new system. The honest cost
is authoring which props survive in each room, and that is a design pass, not an engineering one.

## §5.3 · What it MEANS, which is his real point and the part I must not flatten
He offers two readings and they are not the same:

- **Erasure** — the room is emptied because the person was processed out of it. Room 1 already says
  this: `movingBox1/2` arrive at the fold where Daniel is *transferred*, and the room closes. Extending
  that to every room makes the building an argument: *this is what the apparatus does to a life, and it
  does it three times.*
- **Hope** — the room is emptied because they LEFT. They got out of the cycle. Same geometry, opposite
  sentence.

⚑ **The piece cannot assert both, and it must not hedge.** But it can decline to say which — an empty
room is genuinely ambiguous, and this work's whole method is to show the apparatus's traces and let the
viewer read the person. My reading, offered and not decided: **let the room empty without commentary,
and let ONE object stay.** Which object it is carries the whole sentence — a packed box says processed,
a bare hook where the flag was says erased, and the drained flag left behind on the wall says something
worse and truer than either.

⚑ And his *"maybe we can even make it into an element of choice"* is the sharpest version and the one
that needs his ethics call before a line is written: if the PLAYER decides what stays, the piece is
asking them to author somebody's ending. That is either the most honest thing in the work or the most
presumptuous, depending entirely on what the choice is phrased as, and it is not mine to phrase.

## §5.4 · What it would cost, honestly
An emptied delta per room (data), a fourth fold state or a per-room flag (`clusterMorph`), and the
authoring pass above. The draw-call win is large and structural rather than incremental. **Nothing
about it is urgent** — the piece plays end to end today — and it should not be started until §5.3 is
answered, because the mechanism is cheap and the meaning is everything.


---

# ⚑ §6 · THE TURN, DECOMPOSED — measured 2026-09-05, and it names the room
*Sérgio: "So we probably can also clean some elements on Room 3 with Maya, to help reduce the draw
calls." — a fair thing to ask after §5, and the measurement says **no, and here is where to go
instead.***

Each row hides one more layer and re-reads `window.__drawCalls` at the E4 turn (4.4, 1.16, 0.7,
yaw 90), which is the pose the ≤75 budget is about:

| what is in the frame | draw calls |
|---|---|
| everything, as it ships today | **139** |
| minus the 32 props S115 added to Room 3 | 135 |
| minus **all of Room 3** | 124 |
| minus Rooms 2 **and** 3 | 97 |
| the bare shell alone — walls, floors, ceilings, doors, lintels | **19** |

**So, per room, at the turn:** Room 1's contents **78** · Room 2's **27** · Room 3's **15** · shell 19.

## §6.1 · Cleaning Room 3 is not the lever, and the number is blunt about it
⚑ **You could delete Maya's room entirely — all 67 props — and the turn would still draw 124.**
Removing everything S115 added buys **4**. And her own seat is **52**, already comfortably inside the
budget. There is a craft case for thinning Room 3 (fewer specific things beat many vague ones, and it
is his standing note), but there is **no performance case at all**, and cutting her belongings for a
frame rate they do not affect would be the worst of both.

## §6.2 · ⚑ ROOM 1 IS THE 78, AND IT IS ALSO THE ROOM THE PIECE HAS ALREADY LEFT
Daniel's room carries **more than half of the turn's cost on its own** — 107 props, most of the
building's GLB furniture, all still fully dressed in 2026, four eras after anyone lived in it.

**And it is the room with the strongest narrative reason to be empty.** `movingBox1/2` already arrive
at the fold where he is *transferred* and the room closes; the piece has already said this room got
packed. It is currently packed in dialogue and furnished in geometry.

⚑ **So §5's emptied-room state, applied to Room 1 FIRST, is worth about 78 draw calls** — and taking
Room 2 with it lands the turn near **34** (19 shell + 15 Room 3), which is not "closer to 75", it is
half of it. The idea he proposed as a symbol turns out to be the entire performance answer as well,
and it wants doing in the order the story already implies: Room 1, then Room 2, and leave Maya's alone.

## §6.3 · What Meta's own guidance adds (fetched 2026-09-05)
`developers.meta.com/horizon/.../webxr-perf-bp` gives **no numeric draw-call budget** — it is explicit
that measurement beats prescription, which is the same position `tools/shots.mjs` already takes. The
one directly applicable line is about LIGHTS: *"You typically want to limit yourself to one directional
light or one point light if you're making heavy use of PBR materials."* This scene has **sixteen**, of
which ten are enabled and **six of those sit at intensity 0** (screenGlow, roomFill, moonlight,
witnessWash, ballAttention, ballRoom).

⚑ **Measured honestly: switching all six off changes the draw calls by ZERO** (52/139 before and
after). Under clustered lighting a light is not a draw call. Meta's warning is about *fragment* cost,
and this harness — swiftshader, capped at 60 fps — cannot see fragment cost at all. So: switching a
light off when its intensity reaches zero is free and obviously correct and may well help on device,
and **I have no measurement that says it does.** Recorded as a plausible on-device saving, not a
result. It wants a headset and `tools/shots.mjs comfort`, not another desktop run.
