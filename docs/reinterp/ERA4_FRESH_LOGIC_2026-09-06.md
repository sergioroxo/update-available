STATUS: live

# ERA 4 — THE FRESH LOGIC
*Sérgio, 2026-09-06: "maybe Era-4 needs a revision because the whole narrative was based on the
already superseded narrative, so it needs a fresh logic. Also is the Photo editor included? the
original ideas for the Era-4? … if stuff are mostly text based then it will be quite tiresome, so
it may need some more playable logic!"*

**He is right on all three, and the third one is measurable. Nothing is built in this pass — this is
the decision sheet.** Companion to `ERA4_STORYTELLING_2026-09-06.md`, which trimmed lines; this one
asks whether the structure under them still stands.

---

# 1 · ⚑ WHAT WAS SUPERSEDED, AND WHY ERA 4 IS LEANING ON A DELETED WALL

`PROJECT_ONE_PAGER.md` defines Era 4 as **three** things:

| the original pillar | state today |
|---|---|
| an AI assistant | ✅ **L** — built, voiced, 47 clips |
| a "restoration" photo filter | ⚠️ **half built** — see §2 |
| **a record holding a name she does not use** | ❌ **retired** (2026-09-05, §3b) |

⚑ **One pillar of three is gone, one is half, and the era's writing still points at all three.**

## 1.1 · The precise damage: L apologises to something the player cannot see
Era 4's spine is a **name-correction arc in four states** — taken · hardened · withheld · returned
(u4 · u6 · u9 · u10, plus a fifth in the offers). Every one of those chips files a second, silent
line underneath the apology:

> `legacy record consistency — retained`

**That line is the antagonist.** The apology is the surface; the retention is the truth; the beat is
the gap between them. And the surface that was built to show the gap — the intake record — is
`setTerminalVisible(era !== 'e3' && era !== 'e4')`: **switched off for the whole of Era 4.**

⚑ **`ledger.l` is written by every chip in the era and read by nothing.** Zero consumers, verified by
grep. So the arc's entire second half happens in memory, and what the player actually experiences is
**a kind machine apologising five times and meaning it.** That is not the beat. That is L winning.

**This is not a trim problem. It is the load-bearing wall**, and it is the same hole
`THE_CLOSE_NEXT_2026-09-06.md` §2 found from the other end. Two independent reads, one missing
surface.

## 1.2 · The decision: what answers back? — ⚑ HIS RULING
| | what it is | cost |
|---|---|---|
| **a** | bring the record back **for E4 only** | undoes part of §3b, which he cut for good reasons. I would not |
| **b** | ⚑ **L's own interface becomes the record** — the filings surface on the visor, in the apparatus's own typeface, under the apology that just denied them. No Daniel, no migration, no new object | one draw pass; `labelField()` already exists and is the era's designated "sharp object" |
| **c** | **the Close reads the ledger back** (the Close brief's layer B) | a ledger→panel pass, no new writing |

⚑ **b and c compose, and I think they should both happen.** **b** makes the retention *felt in the
moment* — you watch it file the thing it just apologised for. **c** makes it *land at the end*. b is
the smaller job and the bigger fix.

---

# 2 · ⚑ IS THE PHOTO EDITOR INCLUDED? — half of it, and the missing half is the good half

**Canon** (`REINTERP_E4_DEEP_PASS_2026-08-05.md` §2, from his own note *"don't forget about the AI
editor of the photos"*): it is **not** an app Maya opens. *"An editor you choose to use is a choice,
and E4's thesis is that the choice is gone."* It is a **memories feature** — the system resurfaces
her own photographs, already enhanced, and nobody asked.

## ✅ BUILT
`s4_offers.json` `memories` — two beats. `m1` arrives enhanced silently; `m2` arrives enhanced **and
admits it** (*"The light was against you that day, so I've helped it along a little… It's a better
photograph than it was. I hope that's alright."*). Undo works on both. The cruelty is intact: **it is
a good photo.** `era4.ts:423 photograph(…, enhanced: boolean)` renders both states.

## ❌ NEVER BUILT — and it is the half that makes it a mechanism
> **§2, verbatim from the design:** *"The ball photographs cannot be enhanced. L tries — the same
> automatic pass it ran on everything else — and returns them **unchanged**, with something bland:
> `no enhancement available`. Not because it refuses. Because it cannot tell what it is looking at.
> `NO CATEGORY FOUND`, in the image pipeline, silently."*

Grep: **no such string exists anywhere in the repo.** The inverse was designed in detail and never
made.

⚑ **And it is nearly free.** `photograph()` already takes the `enhanced` boolean. The missing half is
a photograph the flag does nothing to.

## ⚑ Two more originals that were designed and quietly lost
- **§3.3 — "bring one ball object home and L captions it wrong."** This became **the hoodie** (u3),
  which is a fine beat but is *not from the ball*. The loop back from the respite into the room was
  cut without being ruled on.
- **§1.4 — "the ball is the room; the stream is how the apparatus receives it."** u5 says *"Before I
  open the stream…"* and then **"Opening it now"** — and the ball arrives **eight minutes and a whole
  offers sequence later.** The friction beat and its payoff are in different halves of the era.

---

# 3 · ⚑ "TOO TEXT-BASED AND TIRESOME" — measured, and he is right

From `WALK_2026-09-05.json`, the click-only traversal, counted per era:

| era | real presses | that changed anything | distinct controls | ⚑ **waited with nothing to press** |
|---|---|---|---|---|
| **e1** | 82 | 56 | **32** | **0** |
| **e2** | 49 | 22 | 20 | 10 |
| **e3** | 24 | 21 | 12 | **0** |
| **e4** | 45 | 21 | 17 | ⚑ **167** |

⚑ **Era 4 has 167 waiting-out events. Every other era in the piece, combined, has ten.**

And its 45 presses flatter it: **24 of them are the walker hammering the laptop and visor planes,
which do nothing.** The real interaction list for the whole ten minutes is **seventeen presses**:

> `laptop-next` ×3 · `e4-touch` ×2 · nine of L's chips · two photo undos · `pause_yes` · `close-restart`

**Nine of the seventeen are the same act:** pick one of two or three chips in a conversation that
does not branch — `lVoice.ts:376`, *"A chip changes what the record says about her and nothing else
about where the conversation goes."*

## 3.1 · ⚑ But the thesis is not the fault, and this is the distinction that matters
The design argues, correctly, that **E4's verb is *watch*** and that giving the player agency would
betray the era's whole point. **That argument is about choice. His complaint is about hands.** They
are not the same thing:

> **"Your choices change nothing" is the thesis — keep it.**
> **"There is nothing to touch for four minutes" is a fault — fix it.**

⚑ **Era 1 already proves the two can coexist.** Its intake provotype is *also* non-branching — you
fill in the form and it files you, and nothing you enter alters a single outcome. But it has
**thirty-two distinct controls**: stars, tapes, flowers, chips, goals, a diary, IRC. The player's
hands are busy for the entire era and the ending is fixed. **That is the model Era 4 needs, and the
piece already contains it.**

---

# 4 · FOUR WAYS TO MAKE ERA 4 PLAYABLE WITHOUT GIVING IT CHOICES
*Every one of these adds activity and zero agency. None adds a score, a timer, a rhythm game or an
achievement — the frame still never plays.*

### P1 · ⚑ THE PHOTOGRAPHS, FLIPPABLE — and it finishes the original design
Turn "See original" from a one-shot undo into **a strip of her photographs you can flip, freely,
as many times as you like.** Flipping is the whole verb. It costs nothing, it is never refused, and
**the enhanced version is the one the system keeps** — you can look at the original forever and it is
still not what is stored.

⚑ **Then the ball photographs.** You flip them, and they do not flip. `no enhancement available`.
**The player discovers the inversion with their own hand instead of being told it.**

> This is §2's designed beat, made playable, at no cost to the thesis — and `photograph()` already
> takes the boolean. **My pick for first build.**

### P2 · ⚑ THE ROOM CAPTIONS FOLLOW YOUR HEAD
Right now L captions three objects on a timer (u2), and the hoodie on another (u3). Room 3 has
**67 props**. Instead: **L captions whatever you look at.** The instrument follows your attention.

- It uses **the turn** — the era's own verb, the piece's one bodily ask, and the thing the ball is
  about. No new mechanic, no instruction.
- The hoodie stops being a scheduled beat and becomes **something you found**.
- The machine reaching its limit becomes **something you caused**.
- ⚑ It converts the 167 waiting events into the exact activity the era is arguing about: *being
  looked at is what happens to you.*

**Cost:** honest — a caption per prop is a writing job, and it wants a small set (8–12 objects), not
67. This is the biggest of the four and probably the best.

### P3 · THE OFFERS WALL, OPENABLE
Four cards currently appear on a 1.1 s timer and sit there for ten seconds. **The payload is the
fine print** — *Available in your region · On by default · Sponsored · No appointment* — and nobody
reads it, because it is small type on a screen that is about to move on. **Let the player open each
card.** Opening is not accepting. Cheap, and it makes §3.4's "one line does the whole transnational
argument" actually readable.

### P4 · MOVE THE FRICTION BEAT TO THE BALL'S DOOR
u5 (*"Before I open the stream — one short reflection first?"*) currently pays off into nothing.
Move it to **immediately before the ball**, where the deep pass says the stream always was. Then:
the reflection is the last thing the apparatus asks of her, **the player's press opens the ball**,
and the era's one moment of respite is the one thing they caused. ⚑ **Costs nothing — it is a
re-order, not a rewrite.**

---

# 5 · WHAT I WOULD DO, IN ORDER
1. **§1.2 (b)** — the filings surface in L's own interface. *Without this the era's spine is
   inaudible, and it is the smallest of the structural fixes.*
2. **P1** — the flippable photographs and the un-enhanceable ball. *Finishes the photo editor,
   answers "is it included", and is the cheapest playable win in the era.*
3. **P4** — move u5. *Free.*
4. **P2** — captions follow the turn. *The real answer to "tiresome", and the biggest job.*
5. **P3** — openable offer cards. *Small, do it whenever.*
6. **§1.2 (c)** — the Close reads the ledger back. *Already the Close brief's recommendation;
   this pass is the second vote for it.*

# ⚑ WHAT IS HIS TO RULE ON
- **§1.2** — a, b or c (or b **and** c, which is my reading).
- **P2's scope** — how many of Room 3's props get a caption, since that is a writing commitment.
- **Whether "the choice is gone" survives P1–P4 intact.** I believe it does — none of them lets the
  player change an outcome — but *he owns the thesis*, and if any of these makes Era 4 feel like a
  game he should say so and I will pull it.
- Still open from before: the ball's two recordings, panel 4's `contested` (already correct in the
  file), and §5.3's erasure-or-hope.
