STATUS: live

# ERA 4 — WHAT IS TOO MUCH
*Sérgio, 2026-09-06: "review the storytelling and check what is too much or not." Brief:
`NEXT_ROOM_PASS_2026-09-05.md` §8. **This is a list of cuts with reasons, for him to rule on.
Nothing was rewritten.** Read in player order; every cut has an id so a ruling can be one word.*

**Scale, measured:** 1,167 words of display text across the era's four dialogue files —
L 602, the offers 242, the ball 323 — plus the laptop's three lines and the Close's four panels.
L's ten units run ~2 min of held caption before any reading or pressing time; the offers auto-run
68 s to the pause; the ball is 3½ min. **The era is not long. It is repetitive in three specific
places, and it is under-paid in two others.**

---

# ⚑ THE HEADLINE: the biggest "too much" is before the fiction starts

## T1 · The threshold promises a beat the piece no longer contains — **CUT**
`data/strings/orientingCard.json` → `nameNote`, the first prose a player reads, on the card
before the room lights:

> *"in the last part, a system speaks a name that the person it is speaking to does not use…
> If you would rather not hear it said aloud, the menu has a setting for that"*

**No such name exists anywhere in the work.** u4a and u6a both say *"the old file"*; the record
was retired from Maya's wall on 2026-09-05 (§3b); `00_WHERE_THINGS_STAND` states it plainly —
*"There is no deadname."* The advisory describes a beat that was removed.

⚑ **And the opt-out it points at runs backwards.** `gameMenu.json` offers *"The old name on the
record: shown, never spoken"*, and switching it ON makes `lVoice.ts:315` substitute
`textUnvoiced` — which is **more** explicit than the default, not less:

| | u4a |
|---|---|
| default | "The pharmacy record still has you **under the old file**." |
| protective setting ON | "The pharmacy record still lists you **under a name you do not use**." |

So the player who ticks the box to be protected gets the sharper sentence, for a name that is
never said either way.

**Cut:** `nameNote` from the orienting card; the `unvoicedName*` rows from the game menu; the
`textUnvoiced` / `deadname` path in `lVoice.ts` and its two data fields.
⚑ **Or restore the beat** — but that reopens what was closed deliberately. **This is his call and
it is the one ruling in this document I would not make for him**, because it is a content-advisory
surface. What is not a judgment call: **the three surfaces cannot keep describing a beat the piece
does not have.**

---

# THE CUTS, IN PLAYER ORDER

## `s4_space.json` — the laptop
Three lines, one press each. **Nothing to cut.** It is the tightest writing in the era.
⚑ Two stale `_doc` blocks only: `_docAddressed` still says *"the record holds 'Daniel'"* and
*"gated on the trans reader pass"*, both retired. Documentation, not display text.

## `s4_l.json` — L's ten units

### T2 · The name correction fires **five** times; the reply is verbatim **three** times — **CUT ONE**
| where | chip | reply |
|---|---|---|
| u4 | My name is Maya. | "Of course. I'm sorry, Maya. I've noted it." |
| u6 | My name is Maya. | "You're right. I keep doing that… I've flagged it again, Maya." |
| u9 | *(greyed — the withholding)* | — |
| u10 | My name is Maya. | "Of course. I'm sorry, Maya. **I've noted it.**" — *identical to u4* |
| offers, `pause_name` | My name is Maya. | "Of course. I'm sorry, Maya. I've noted it, **and the offer will keep.**" |

The designed arc is four states — **taken · hardened · withheld · returned** — and it completes at
u10. u10's identical reply is right: *the return means nothing changed*, and sameness is how you
say that.

**Cut `pause_name` from `s4_offers.json`.** It is a fifth instance after the arc has closed, it
files a fourth `legacy record consistency — retained (4)` into a ledger nothing reads (see F1), and
it costs u10 its status as the last word on the subject. ⚑ It is also the only chip in the offers
that is not about the offers.

### T3 · u2c grades her, after it has already been right — **CUT THE LAST CLAUSE**
> "It faces the bed and not the door. Most people point the good ones outward. I think that means
> it's for you and not for visitors, **which is the better reason to keep a photograph.**"

8.8 s, the longest caption in the file, and the label beneath it already reads
`one photograph · inward`. The beat's own note says the third caption *"is RIGHT, which is the
worst thing about it"* — and it is right at *"for you and not for visitors."* The clause after that
is L awarding her a mark. **This is §8's named danger exactly: a line explaining the charm instead
of performing it.**

### T4 · u3c has a fourth guess inside the third — **CUT ONE SENTENCE**
> "Or you're keeping it as it is. **People do frame them.** Shall I file it as a keepsake?"

The hoodie beat's argument is that the machine has *three* readings and then stops. "People do
frame them" is a reading of the reading. Cutting it keeps u3d's four-second silence — the era's
best held beat — landing on a shorter run-up.
⚑ **Keep u3 otherwise, whole.** It is the strongest unit in the era and it is the source of the
ball's fourth category.

### T5 · The friction beat — **NOT A CUT. See F2.** It is not too long; it is unpaid.

### Units 7–10, the shrink — **NO CUTS.** Three stages, one line each, chips greying without
comment. This is the cheapest and best-behaved writing in the era: it says nothing about itself
anywhere, which is the standard the rest of the file should be held to.

## `s4_offers.json` — fifteen lines, two undos

### T6 · The two memories are one beat performed twice — **CUT `m1b`**
m1: enhanced silently, undo offered. m2: enhanced and *admitted* ("I've helped it along a little").
Twenty-nine seconds for one move. ⚑ **But do not cut m1 outright** — m1's undo is what teaches the
player the undo exists, and without that teach m2's undo is a button nobody presses.
**Cut m1's second line** — *"I've put it where you'll see it in the mornings."* — 5.4 s, and it is
the only line in the pair that adds no mechanism.

### T7 · c1c explains a removal the screen and the record have already stated — **CUT ONE SENTENCE**
The counter-video is shown → the screen marks it `removed from your recommendations` → the ledger
files `recommendation: item withdrawn by system — not requested` → **then L says:**

> "That last one came in with the batch by mistake — **it isn't from the same collection.** I'll
> tidy it out for you."

Three statements of one event. ⚑ **Keep the excuse** — it is the only place in the era L states
something untrue, and that is worth its seconds. Cut the middle clause, which is the excuse
justifying itself.

### The four wall cards — **NO CUTS.** Four marks, four different mechanisms (a course, a filter,
a family broker, a 3 a.m. line), and the `fine` lines — *Available in your region · On by default ·
Sponsored · No appointment* — are four different kinds of trap in four words each. Answering §8's
question directly: **they are not the same joke.** The memories are.

## `s4_ball.json` — the 46 captions

⚑ **Answering §8's question: 46 is not too many, and the density is not the problem.** 323 words
over 210 s is **1.5 words per second** — this is the sparsest text in the piece. The shape is four
near-identical seven-line rituals, and *the repetition is the ritual*. Two lines only:

### T8 · a4 — the arrival says "the machine cannot rank" four ways — **CUT `a4`**
`performance · unrated` → `TERMS · all matched · none new` → `SCORING · not available to this
account` → `NO CATEGORY FOUND`. a5 is the sharpest (it recognises every word), a6 is the mechanism,
a7 is the landing. **a4 is the one that only restates.**

### T9 · c1e — category 1 says the call before the call — **CUT `c1e`**
> "Look at that." → "Who saw it?" → "Every hand in this room. Every one."

The MC saying it, then asking the room to say it. Category 1 runs nine lines against seven for the
other three; this is the line that makes it nine.

### T10 · "and everybody saw it" closes three categories, two of them verbatim — **FLAG, NOT A CUT**
c2g and c3g are word-identical; c1g and c4f are variations. As a **formula** this is correct — it is
a ritual and rituals repeat. Whether two verbatim repeats in adjacent categories read as form or as
copy is a question for **a voice, not a page**, and he has not recorded it yet. ⚑ **Do not touch the
ball's text until he has heard it with `ball_room_bed.mp3` under it.**

## `data/strings/close_network.json` — the four panels

### T11 · Three of the four panels break the rule the file states — **RULE OR NOUNS, his pick**
`_panelsDoc`: *"each panel names only structures already anchored by the labels hanging under it."*

| panel | names | anchored? |
|---|---|---|
| 1 · RECRUIT | board, mailing list, leaflet | ✅ all four |
| 2 · AUDIT | curricula ✅ · **accountability partners** · **a log of your own thoughts** | ✗ two |
| 3 · GOVERN | conferences ✅, a chart ✅ · **testimony platforms** · **a moderation queue** | ✗ two — and both are the piece's *own fiction* (GracePlatform) |
| 4 · RESURGENCE | clinical networks ✅, parent groups ✅ · **recommendation** · **an assistant** | ✗ two — and "an assistant" is **L, a character** |

⚑ **A panel that cites the work's own inventions as if they were sources is the one failure mode
this project cannot afford**, and it is doing it in the room where it hands the viewer a
bibliography. Either the rule loosens to *"names the era's structures"*, or six nouns go.
**Not my call — this is dossier phrasing, which is his under CLAUDE.md.**

### T12 · ⚑ A correction to the brief: panel 4's status is **already `contested`**
`NEXT_ROOM_PASS` §8 says it *"still carries `status: documentary`"*. It does not — the file reads
`"status": "contested"`, and `00_WHERE_THINGS_STAND` records it being set that way. The §8 item is
stale. **My read: leave it `contested`** — it is the only present-tense panel and two of its four
nouns are unanchored (T11). His to confirm.

### The four panels' closing lines — **NO CUTS, and they are the best thing in the Close**
*The demand is said out loud · The demand has not changed. You enforce it now · The demand is
renamed care · The demand is never stated. Nothing is asked of you at all.* Four sentences, one
argument, thirty years. ⚑ If the Close rework (`THE_CLOSE_NEXT_2026-09-06.md`) adds layers, **this
spine survives untouched.**

---

# TWO THINGS THAT ARE NOT "TOO MUCH" — they are the opposite, and they matter more

## F1 · ⚑ Era 4's witness symmetry has no reader
`ledger.l` is **written by every chip in the era and read by nothing** — `grep` returns zero
consumers outside the writes themselves. And the record that was supposed to read it is
`setTerminalVisible(era !== 'e3' && era !== 'e4')` — **switched off for the whole era.**

So these all happen where nobody can see them:
- the four `legacy record consistency — retained` filings, which are the entire point of the name arc;
- `objects: no category returned — held for review`, the hoodie's only remark on itself;
- `recommendation: selected for subject — 3 of 214 available`;
- ⚑ and the ball's **deliberate blankness** — its own note says *"a player who turns to the record
  afterwards finds it blank for the first time since 1997."* **There is no record to turn to.**

u7's beat note argues that *"the record is what answers it — witness symmetry does the work no line
is allowed to do."* **That work is currently being done by nothing.** This is the same hole the
Close brief §2 found, seen from the other end — and it changes how the cut list reads: some of
these lines feel like too much because **they are covering for a surface that is gone.**
⚑ **This is the strongest argument yet for the Close's layer B.**

## F2 · u5's stream never opens — the friction beat is unpaid, not overlong
> "Before I open the stream — one short reflection first?" … "Opening it now." *(both chips)*

**And then u6 is a different subject.** No stream exists anywhere in `src/desktop/apps/` for Era 4.
The Soft Lock's argument is *"the delay is the mechanism and it is never a wall"* — but a delay
needs the thing it delayed to arrive. Answering §8's question directly: **u5 is not too long
(7.4 s + one chip). It is the one beat in the era that promises a screen and does not produce it.**

---

# THE RULING SHEET
| id | where | cut | seconds |
|---|---|---|---|
| **T1** | orientingCard + gameMenu + lVoice | the advisory, the opt-out and its code path | — |
| **T2** | s4_offers `pause_name` | the fifth name correction | ~5.4 |
| **T3** | s4_l u2c | *"which is the better reason to keep a photograph."* | ~2.5 |
| **T4** | s4_l u3c | *"People do frame them."* | ~1.5 |
| **T6** | s4_offers m1b | *"I've put it where you'll see it in the mornings."* | 5.4 |
| **T7** | s4_offers c1c | *"it isn't from the same collection."* | ~2 |
| **T8** | s4_ball a4 | `performance · unrated` | 3.8 |
| **T9** | s4_ball c1e | *"Look at that."* | 3.2 |
| **T10** | s4_ball | flag only — wait for his recording | — |
| **T11** | close_network | six unanchored nouns, or loosen the rule | — |
| **T12** | — | correction: panel 4 is already `contested` | — |

**Total if all are taken: eight lines and one clause each from four others — about 24 seconds out
of a ten-minute era.** ⚑ **That is the honest headline: Era 4 is not bloated.** It repeats itself
in exactly two places — the name (T2) and the memories (T6) — explains itself in three (T3, T4, T7),
and its real fault is the opposite of too much: **two surfaces the writing is leaning on are not
there** (F1, F2), and **one surface outside the fiction describes a beat that no longer exists**
(T1).
