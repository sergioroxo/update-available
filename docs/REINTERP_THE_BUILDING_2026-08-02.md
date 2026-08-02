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

### 3 · ⚑ CORRECTED (Sérgio, 2026-08-02) — driven movement is allowed. I read the law too strictly.
I argued this must be blink-cuts because "R28 forbids smooth locomotion." **That conflated two
different things, and Sérgio drew the line correctly:**

> *"we are not talking about artificial locomotion — that one can and already happens, and was
> happening before. What I am talking about is the user walking around in the space with the joystick
> as if this was a 3D game inside a house. I don't want that locomotion. But artificial one, of being
> driven to a new space and stuff, yes of course."*

**The law is about AGENCY, not about smoothness.** What is forbidden is the player *walking* —
free joystick travel through a modelled house. What is permitted, and already shipped, is the piece
**driving** you: the entrance descent, the relocation's three legs, the sends. The distinction is who
is steering, and it always was.

So the choreography **can be a driven move.** It does not have to be a cut.

**What remains true is a comfort constraint, not a law**, and it is a measured number rather than a
taste call: the relocation's descent leg was lengthened from 10 s to 11.5 s because it measured
0.477 m/s against S53's 0.43 m/s envelope. **Driven movement is allowed; fast driven movement is
what makes people sick.** And every one of those numbers is desktop-measured, because A11 — the
in-headset pass — has still never run.

**The turn survives anyway, and should.** Once you are up there, being *held* and turning to find the
rooms is stronger than being carried past them: it is the piece's own gesture at full scale, the same
turn you have made in every room, now with three lives behind you instead of a wall. So the shape is
**driven up, then turn** — not driven around.

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

---

# ⚑ REVISION 1 — THE CHOREOGRAPHY (Sérgio, 2026-08-02)
*His question 1 turned a one-off ending into the piece's movement grammar, and it is the best
structural consequence of the whole idea:*

> *"Would it make sense to do the same narrative of coming up to see externally the exchange for
> Room 1 between the 2 eras? That would create a visual language for the flow, making them make more
> sense while you travel around."*

**Yes — and it does something neither of us was aiming at: it gives the rise an ARC.** If the camera
comes up at every era change, then *what you see when you come up* is itself the story, and it
changes four times.

| Transition | You rise, and… | What it says |
|---|---|---|
| **E1 → E2** | there is **one room** below you. The walls stay **on**. It ages beneath you and sets you back down in the same place. | *time moved; you did not.* And you assume this is all there is. |
| **E2 → E3** | the walls come **off**, and there are **three**. You are set down in a different one. | **they were always there.** You were never shown. |
| **E3 → E4** | three rooms again, and you move again. Familiar now, almost routine. | the apparatus does this constantly. The horror is that it is no longer strange. |
| **→ THE CLOSE** | you rise, and **you do not come down** — until you come down somewhere new. | the fourth room. |

**⚑ And this resolves a canon conflict rather than creating one.** The master plan is explicit that
**E1→E2 ages the same room with the walls CLOSED — "the homecoming is private."** My first instinct
was that his proposal overrides that. It does not, and the reconciliation is better than either
version:

**At E1→E2 the rise happens and the opening does not.** You come up; the walls stay on; you see one
lit box in the dark and nothing around it. The privacy of the homecoming is perfectly preserved —
nobody sees in, and you do not see out — while the *movement* is established as the piece's grammar.

**Which makes the E2→E3 wall-drop a payoff instead of an effect.** You have done this before. Last
time there was one room. This time the walls come off. **The mechanic teaches you to expect one
thing and then shows you the building** — which is the sentence, performed, without a word.

### ⚑ A convergence worth recording, because it was arrived at independently
`REINTERP_MASTER_PLAN_v2_2026-07-12.md` §3 already carries, from mining FIND #10:
*"The E4 finale carries the cyclorama concept: slits-of-countless-rooms resolving into the four
walkable era panels."*

**Countless rooms, resolving into four.** That is this proposal, written months earlier from the
other direction — the finale reaching for other people's rooms before there was a reason for them.
The building gives that beat its argument, and the cyclorama gives the building its scale: **three
rooms are the ones you know; the slits are everyone else.**

*(One conflict to settle there: "four walkable era panels" vs. Sérgio's confirmed "only look." The
cyclorama's walkability is the older idea and should probably yield.)*

## Sérgio's answers to the open questions (2026-08-02)
1. **Rise at every era change — CONFIRMED**, and it becomes the visual language. See the table above.
2. **The building is IMPLIED, not modelled — CONFIRMED.** Floor, doorplates, the suggestion of a
   shared wall. No apartment block geometry.
3. **From above you can only LOOK, never enter — CONFIRMED.** *"Exactly, only look."*
4. **The line** — open, and unhurried. *"We can think about that."*

## ⚑ And the identity work is not just Room 2
> *"each room not having an identity as a 'livable existence' … should be something to do for all
> 4 moments."*

**Confirmed and scoped up.** S66's contract of intent applies to every room, not only Vera's: each
space must show that somebody lives there. This matters more now than it did an hour ago — **if the
player is going to be lifted above these rooms and asked to recognise them as lives, they have to be
lives when you are inside them.** The choreography's payoff is only as strong as the rooms it reveals.

Room 1 has tapes, a kit, a diary and is the benchmark. Room 2 has furniture. Room 3 and the E4 state
are unbuilt in this respect.

---

## Open — the ones that actually change the build

1. **Do the other rooms become visible EARLIER than the ending?** *My read, unchanged: no.* The
   choreography shows them at E2→E3 and E3→E4 and never from inside a room. Making them visible
   throughout would turn the isolation into a level select and spend the ending early.
2. ~~Is the building literal?~~ **ANSWERED — implied.**
3. ~~Enter, or only look?~~ **ANSWERED — only look.**
4. **The line itself is yours**, and unhurried. Everything above is structure. What you wrote in
   chat is already better than anything I would draft; it needs a form, not a rewrite.
5. **⚑ NEW, and it is now the load-bearing one: does the Close-as-fourth-room happen in this pass,
   or after?** The choreography is cheap, reuses measured motion, and pays off immediately. The
   fourth room is a real rebuild of a specced-but-unbuilt scene whose constellation topology is
   *already* flagged as decorative-not-real in the status register, and whose source verification is
   incomplete. **My read: build the choreography first, and let the Close inherit it.** The rise at
   the Close is then the fourth instance of a grammar the player already knows — which is exactly
   what makes "you do not come down" register as an ending rather than a camera move.

---

# ⚑ THE THINKING ROUND IS CANCELLED (2026-08-02)
*Sérgio: "Maybe we don't need the prompt for the thinking? … unless you feel like we should or
consult with Codex."*

**Agreed — dropped, and the prompt that was here is deleted rather than left to rot.** Between this
doc and his four answers the thinking is done: the movement law is clarified, the choreography has a
four-beat arc, the building is implied, looking-not-entering is settled, and the Close's role is
decided. A round asking "think this over" would now be asking for a document that already exists.

**And it should not go to Codex.** The project's own split says Codex takes well-specified mechanical
work whose acceptance is `tsc` + tests, and explicitly *"its prompts must not claim visual
verification."* This is camera dramaturgy judged by feel in a headset — the single worst fit for a
lane that cannot look at the screen.

**What replaces it: a BUILD prompt for the choreography**, written when S66 (the rooms as livable
places) is done — in that order, because the choreography reveals rooms, and revealing rooms that
are not yet places would spend the reveal on furniture.
