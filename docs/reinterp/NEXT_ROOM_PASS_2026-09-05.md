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

The card now carries **her** name under the era-4 stamp. The misfile still reads, and reads better:
`under the old file` in amber above, `migrated ×3` below. The file moved three times and was never
re-registered — the same sentence, told without borrowing anyone.

⚑ **"The rest seems okay"** — so the era-4 wording (`RETAINED FOR CONTINUITY OF CARE`,
`carried forward — no origin on file`, `RETAINED`) is approved as it stands. Removing it from the
waiting list.

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
