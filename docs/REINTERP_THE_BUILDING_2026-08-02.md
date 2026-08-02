STATUS: live

# THE BUILDING — what is behind us, and why the piece already asks you to turn
*Sérgio, 2026-08-02: "from behind us, we can see that this is not just happening to only one person…
when we look at a computer we are looking only one way, even though the internet allows us to expand
our horizons, we never see what is behind us, we never see what's happening to others."*

## ⚑ First, the thing worth saying plainly

**This is not a new mechanic. It is the thesis the piece's existing mechanic has been missing.**

The work's one bodily law is *you never walk; you turn.* That has been a formal decision — a comfort
constraint, a VR discipline, a signature. It has never had an argument under it. **The sentence above
is the argument.** A screen fixes your facing. The turn is the only thing it cannot do for you, and
what is behind you is other people.

Every existing element clicks into that:

| Already in the piece | What the sentence makes it mean |
|---|---|
| the turn is the only bodily ask | the screen faces one way; you have to *choose* to look away from it |
| **the witness side is the sharp side** | what is behind you is in higher definition than your own life |
| two lights fight for one room | the room you are in is lit by the work; the building is lit by something else |
| three rooms that age, one at a time | the isolation is not a budget decision, it is **authored** |

So I would not treat this as a new feature request. **I would treat it as the piece finally being
able to say what it is about**, and let it back-justify the turn everywhere.

---

## ⚑ Second: it is already half-built, and that changes the cost enormously

`RELOCATION` (S61) in `src/room/cluster.ts:129` already does the move he is describing, once:

```
rise      7.0s   — up out of the chair, inside the still-closed Room 1
build    11.0s   — "the walls leave and the three rooms resolve — the camera barely moves"
descend  11.5s   — down into Room 2's seat
```

**At E2→E3 the player already rises out of one room, watches the walls come off, sees three rooms,
and is set down in a different one.** The building exists. It is on screen for eleven seconds, once,
in the middle of the piece, and **nothing is said about it.**

That is a large amount of built, comfort-tuned machinery pointed at an idea nobody had written down
yet. The descent leg is calibrated to a measured envelope (0.415 m/s against S53's 0.43 ceiling —
`descendSeconds` is 11.5 rather than 10 *because of that measurement*), so the motion vocabulary for
an ending pass is already proven rather than speculative.

**What the proposal actually adds is not the view. It is the meaning of the view, and a second, longer
look at the end that knows what it is showing.**

---

## The shape, as I would build it

### 1 · The mid-piece pass stays exactly as it is — and stays *unexplained*
At E2→E3 you see the building for eleven seconds and are given nothing. No panels, no names, no line.
It should feel like a transit, and slightly too fast to read.

**That is the setup, and it must not be improved.** The end only lands if you have already been shown
this and did not understand it.

### 2 · The ending is the entrance played backwards
The piece opens with a descent — `DESCENT_FROM` high on the door side, aimed down at the moonlit
window, ten seconds, one continuous move (`app.ts:97`). **The Close should be that in reverse:** you
rise out of the last room the same way you came into the first.

That is a rhyme the piece can afford, it needs no new motion grammar, and it gives the ending a shape
the current Close does not have: *you are leaving the same way you arrived, and now you can see.*

### 3 · ⚑ It must be blink-cuts between overlooks, NOT a flythrough
R28 is unambiguous: **no smooth locomotion, ever** — movement is blink/fade jumps, and the descent is
already flagged in the source as *"the one piece of artificial locomotion in a work whose entire
bodily law is you never walk."* A smooth orbiting tour of a building would be the piece's single
worst VR comfort case and would break its own law at the exact moment it makes its point.

**So: you rise once, and then you TURN.** You are held above the building, and the rooms are around
you. Reaching each one is a look, or at most a blink-cut to a fixed overlook per room.

**This is better than a tour, not a compromise.** A flythrough shows you the building. Turning in
place above it makes you *do the piece's gesture at full scale* — the same turn you have made in every
room, now with three lives behind you instead of a wall. The mechanic and the meaning become the same
action in the last minute of the work.

### 4 · The panels — yes, and they are the voice
One per room: **era, name, and one line.** Read in sequence, three plaques do the work of the
narration without anyone narrating.

They should look like **building signage, not exhibition labels** — the flat plate beside a door, the
name slot on a buzzer, the number on a mailbox. That keeps them diegetic and it keeps them cheap. The
piece's Dossier grammar already exists for the longer material; this is the doorplate, not the card.

### 5 · ⚑ The one thing I would push back on: the spoken line
> *"we listen to a similar phrase that I wrote here"*

**The idea is right; a narrator would break the frame law.** CLAUDE.md: *the frame never plays* — the
piece has no voice of its own that explains itself, and it has held that line for four eras. A
voice-over stating the thesis over the ending image is the one move that could make the whole piece
read as an essay with rooms attached.

Three ways to keep the sentence and not break it, best first:

1. **⚑ The plaques say it, in pieces.** No line is the thesis; three plaques in a row are. The player
   assembles it, which is the only way a line like that ever lands.
2. **The apparatus says it, and it is not comforting.** If anything is spoken, it should be the
   system's voice, describing its own reach as a metric — *"we're in this many homes tonight."* Same
   fact, opposite feeling, and it is the register the piece already permits (build-time TTS, apparatus
   voice only — the standing accessibility principle). The player supplies the horror.
3. **It is written, once, and it is the last text in the piece.** Not spoken, not during the turn —
   after it, when you are already looking at the fourth room.

**My recommendation: 1 for the rooms, 3 for the ending, and never 2 at the Close** — the apparatus
should not get the last word in a work whose Close is *named, witnessed, refused.*

### 6 · The fourth room — and it does NOT reopen R24
Worth being precise, because it looks like it contradicts a closed decision. **It does not.** R24 put
E4 in Room 3 and that stands: there are still three *era* rooms, three lives, and Maya's era happens
in Room 3.

**The fourth space is not a fourth era. It is yours** — and what it actually does is give the Close a
body. Today the Close is a constellation over a room fading to quarter-visible, camera seated
(`REINTERP_CLOSE_CONSTELLATION_BRIEF_2026-07-24.md` §5). His version makes it **a room like the other
three, in the same building, containing pieces of all of them, whose lights are the sources.**

That is a real improvement on the current spec for three reasons:
- It makes the constellation **located** instead of abstract. The sources are not a star field; they
  are in a room, in the building, with the three lives.
- It answers *"whose room is the Close?"*, which the current brief does not.
- **It completes the sentence.** You spent the piece in rooms that could not see each other. The last
  room is the one that can — and it is the one you are in.

⚑ **Ethics check, and it holds:** the fourth room is the makers'/sources' room. It is the one place
in the piece where real names are permitted (dossier/provenance), which is exactly where the
constellation already puts them. No fiction moves into it.

---

## What this costs, honestly

| Piece | Cost | Why |
|---|---|---|
| Meaning of the mid-piece pass | **zero** | it is built; it just stops being decorative |
| The rise at the Close | **small** | reuse `RELOCATION.rise` + the entrance curve's tuned parameters |
| Overlooks + turn-in-place | **small–medium** | fixed poses and blink-cuts; no new motion grammar |
| Doorplates ×3 | **small** | one prop, three strings |
| The Close as a room | **medium–large** | it is a real change to a specced-but-unbuilt scene, and the constellation's topology is *already* flagged as decorative-not-real in the status register |
| Comfort verification | **blocked** | still no in-headset pass (A11). Every motion number here is measured on desktop only. |

**The honest sequencing consequence:** the first four rows are cheap and mostly reuse. The fifth is
the Close rebuild, which was already on the board and already blocked on source verification. **This
proposal does not add that work — it gives it a shape it was missing.**

---

## ⚑ Open for Sérgio — the ones that actually change the build

1. **Do the other rooms become visible EARLIER than the ending?** The mid-piece pass shows them once
   at E2→E3. *My read: no — one unexplained glimpse, then nothing until the Close. Making them
   visible throughout would turn the isolation into a level select and spend the ending early.*
2. **Is the building literal?** Apartments on a corridor, or three rooms floating in dark with no
   structure between them? *My read: implied, not modelled — floor, doorplates, and the suggestion
   of a shared wall. A rendered apartment block is a lot of geometry for one minute, and the piece's
   Soft Lo-Fi law wants underdefined edges anyway.*
3. **Can the player still enter the other rooms from up there, or only look?** *My read: only look,
   and this is the harder call — being able to go back in would be generous, but "you can see them
   and you cannot reach them" is the truer version of the sentence.*
4. **The line itself is yours.** Everything above is structure. The sentence he wrote in chat is
   already better than anything I would draft, and it needs a form, not a rewrite.

---

# ⚑ THE PROMPT — think this through before anything is built
*Sérgio: "Let's probably write a prompt to think this over." This is a THINKING round, not a build.
It produces a spec and a decision, not code.*

```
Design round, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch reinterp).
Read, in order: CLAUDE.md, docs/ETHICS_CONSTRAINTS.md,
docs/REINTERP_THE_BUILDING_2026-08-02.md (THIS DOC — the proposal and its open questions),
docs/REINTERP_RESTRUCTURE_R28_2026-07-10.md (the movement law — blink-cuts, never smooth travel),
docs/REINTERP_CLOSE_CONSTELLATION_BRIEF_2026-07-24.md (what the Close currently is),
docs/REINTERP_MASTER_PLAN_v2_2026-07-12.md §R24 (three rooms that age — this must NOT be reopened),
src/room/cluster.ts (RELOCATION + ClusterMorph — the building is already built, at E2→E3),
src/engine/app.ts lines 90-140 (the entrance descent, its comfort envelope, and ?descent=0),
src/room/pointCloud.ts, data/strings/close_network.json, docs/reinterp/08_STATUS_REGISTER.md.

THE IDEA, in the project lead's words: "when we look at a computer we are looking only one way — the
internet allows us to expand our horizons, but we never see what is behind us, we never see what's
happening to others." The piece's only bodily ask has always been the turn. This proposes that the
turn's meaning is other people, revealed at the Close by rising out of the last room and seeing that
the three rooms were always in one building.

DO NOT BUILD ANYTHING. Produce a spec and a recommendation.

WHAT TO WORK OUT:
1. THE STAGING. Where exactly does the player rise to, and what is the geometry of "the building"?
   Reuse RELOCATION's measured legs and the entrance curve rather than authoring new motion. The
   result must be TURN-IN-PLACE at fixed overlooks with blink-cuts between them — smooth orbiting is
   forbidden by R28 and would be the piece's worst VR comfort case. Give real poses and real seconds.
2. THE SEQUENCE. What the player does, beat by beat, from the last moment of Era 4 to the last
   moment of the Close. Where the doorplates are read. Where the fourth room is entered. Whether the
   other rooms can be re-entered or only seen (see open question 3 — argue it, don't dodge it).
3. THE FOURTH ROOM. Turn the Close from a constellation over a fading room into a room in the same
   building — the player's — containing pieces of all three and whose lights are the sources. Say
   precisely what changes in pointCloud.ts and close_network.json, and what does NOT change. Note
   that the constellation's topology is ALREADY flagged as decorative-not-real in the status
   register; this spec should say whether that debt must be paid first.
4. ⚑ THE VOICE. The frame never plays. Work out how the sentence lands WITHOUT a narrator — the doc
   proposes three doorplates carrying it in pieces plus one written line at the end. Test that
   proposal hard and propose better if there is better. A voice-over stating the thesis is the one
   move that would make the whole piece read as an essay, and it must not happen.
5. WHAT IT COSTS AND WHAT IT BREAKS. Which existing scenes, docs and STATUS entries this touches;
   what it supersedes; what it makes dead. Be specific and check for deprecation before proposing
   work on any surface.
6. ⚑ WHAT ARGUES AGAINST IT. Required section. The strongest honest case for NOT doing this, or for
   doing a smaller version. If the smaller version is better, say so — the mid-piece pass gaining
   meaning may be 80% of the value at 10% of the cost.

CONSTRAINTS THAT ARE NOT NEGOTIABLE: no smooth locomotion; the frame never plays; R24's three aging
rooms stay; real names remain dossier/provenance only (the fourth room is where they already live);
Quest budget (≤75k tris, ≤60 draw calls, 72Hz); comfort numbers are MEASURED, not estimated, and
A11 (the in-headset pass) has still never run — say plainly which of your numbers are unverified.

DELIVERABLE: docs/REINTERP_THE_BUILDING_SPEC_<date>.md with STATUS header, a beat sheet, real poses
and durations, the Close delta, the voice solution, a supersession list, and the argument against.
Then ONE line in BUILD_LOG.md. No source files edited.
```
