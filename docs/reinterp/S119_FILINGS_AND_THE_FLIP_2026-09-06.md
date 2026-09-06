STATUS: live

# S119 — THE MACHINE'S FILE, AND THE FLIP THAT COSTS NOTHING
**⚑ PROMPT STATUS: SHIPPED 2026-09-06** — built, typechecked, and walked click-only from
the entrance (`WALK_2026-09-06`, 213 presses, `spine: done`, the new beat pressed in play).
*On Sérgio's instruction: "start with the filings surface and P1." Briefs:
`ERA4_FRESH_LOGIC_2026-09-06.md` §1.2(b) and §4 P1.*

---

# 1 · THE FILINGS SURFACE — the era's spine had a top and no underneath

**The fault.** Era 4's name arc runs in four states and every chip in it files a
second line beneath the apology: `legacy record consistency — retained`. The apology is
the surface, the retention is the truth, and the beat is the gap. ⚑ **`ledger.l` was
written by every chip in the era and read by nothing** — zero consumers — and the one
surface built to show it, the intake record, is switched off for the whole era. So what a
player met was a kind machine apologising five times and meaning it. **That is L winning.**

**The build.** `ledger.ts e4Filings()` reads `l` + `e4Offers` newest-first;
`era4.ts filingStrip()` paints it; L's surface draws it every frame the era is live, and
the offers draw the *same* strip from the *same* selector, so the two cannot drift.

⚑ **Four rules, and each one is load-bearing:**
1. **Every line looks the same.** The retention is not coloured, boxed, delayed or
   emphasised. `name: corrected by subject` and `legacy record consistency — retained`
   are drawn at identical weight, because that is how a record treats them. The moment
   this surface points at one, the piece is narrating instead of showing.
2. **Nothing announces it.** One clerical word — `session file` — in the machine's own
   meta type. No heading that explains, no alert.
3. **Not pressable, and never will be.** It is the instrument's notes, not something she
   is being offered. She cannot edit it. That is the era.
4. **Newest at the top, older ones dim, nothing ever leaves.** The cap is a layout fact,
   not an editorial one.

**Verified by render, not by reading.** Press *"My name is Maya"* at u4 and the strip
reads, top to bottom: `legacy record consistency — retained` / `name: corrected by
subject`. The retention sits above her correction, same weight, and nothing points at it.

# 2 · P1 — THE PHOTOGRAPHS, AND THE ONE THAT WILL NOT TAKE THE PASS

## 2.1 · The flip is free now
`See original` used to be a one-way undo: press it once and the control disappeared,
which made the single act in the beat a thing you could spend but not hold. It is now a
toggle she can work forever, at no cost, never refused.

⚑ **The first press is still the act** — it files `enhancement withdrawn at subject's
request` and L answers it. **Every press after it files nothing**, because a person
looking at their own photograph twice is not a decision, and filing it would make the
strip say she withdrew the enhancement nine times, which is a lie about what she did.

**One new string,** `memories.kept`: **"See the version we kept"** — the label going the
other way. The machine, matter-of-factly, in its own register, naming which of the two it
holds. Not a warning and never to be styled as one. ⚑ Nothing announces the enhancement
*before* she presses; after she has, being plain about it is more chilling than hiding it.

## 2.2 · The half of the photo editor that was designed in 2026-08-05 and never built
> `REINTERP_E4_DEEP_PASS_2026-08-05.md` §2: *"The ball photographs cannot be enhanced. L
> tries — the same automatic pass it ran on everything else — and returns them
> **unchanged**… Not because it refuses. Because it cannot tell what it is looking at."*

New stage `ballshots`, between the ball and the finale — the one window that exists for
it, and L's voice returning after the only stretch of the era without it. Same card, same
geometry, same small grey line in the same place, so a player who has flipped her own
photograph four times reaches for this one out of habit. **It does not flip.** The line
stops offering and starts reporting: `no enhancement available`.

⚑ **The mechanism is in the renderer, not in a line of dialogue.** `photograph()`'s new
variant 2 does not read `enhanced` at all — there is no branch anywhere saying "and if it
is the ball, refuse". The enhancement pass simply has nothing to take hold of. **L does
not speak on the press.** A line there would be the piece explaining its own best beat.

## 2.3 · ⚑ AND IT FILES NOTHING — watch the file not grow
`s4_ball.json`'s witness block states the doctrine: the ball is the one thing in thirty
years that enters no record. **A logged failure to process would still be a record of the
evening**, so `advanceStage`'s `ballshots` case is the only one in the switch that does
not file, and the omission is commented so nobody adds one by tidiness.

⚑ With the strip now on screen, **the player can watch the file not grow.** That is the
first time since 1997 that something they did is not written down. Verified: the ledger is
byte-identical before and after the press.

**Register check.** The ball is `respite` and the law is absolute — *never a trap, never
revealed as fake; the system targets around it, never through it.* L does not sour, doubt,
warn about or comment on the evening; it treats the pictures as ordinary material and
cannot process them. The picture is warm and crowded and is not glitched, dimmed or
distorted. **The machine's failure is the machine's, not the room's.**

⚑ `b1b` — *"I've left it as it is"* — is lifted from **u3c**, the hoodie: *"Or you're
keeping it as it is."* It is the machine's one gesture for a thing it has no category for,
and it now appears twice: on a mended jumper, and on a whole room of people. Nothing
points at it and nothing may.

---

# 3 · ⚑ TWO BUGS THIS BUILD FOUND, both fixed

## 3.1 · EVERY E4 DEBUG BUTTON HAD BEEN BROKEN FOR FIVE DAYS
`os.ts e4Place` wears the headset by calling `wear()`. On 2026-09-01 the era gained its
laptop opening, after which `wear()` **correctly** refuses while `stageNow === 'laptop'`
— the headset is not a door until L has finished on the machine. **The debug route was
never updated.** From that day, all twenty-odd E4 panel buttons landed on Maya's closed
laptop and sat there: the voice never ticked, the offers never drew. A reviewer pressing
*"⚑⚑ THE DEADNAME"* got a laptop.

⚑ **Trap 0 exactly** — *a fix can open the hole it is closing* — and trap 2, *content that
exists cannot be met.* Nothing caught it because `tools/walk.mjs` plays the era LINEARLY
and so reads the three laptop lines the way a player does. **Only the panel was broken,
and the panel is the only surface in this project with no automated reader.**
Fixed: `space.ts debugSkipLaptop()`, which consumes the laptop beat as read and files
exactly what pressing through it files, so a jumped review and a played one leave the same
record.

⚑ **Worth a standing note:** if Sérgio reviewed Era 4 from the debug panel at any point
since 2026-09-01, he was looking at a laptop, not at the era.

## 3.2 · The strip painted across her photograph
First placement put it in the 132 px gutter beside the memory card. The longest witness
line in the data is about 205 px, `filingStrip` did not clip, and
`legacy record consistency — retained` printed straight over the picture. Found by
**looking at a render** — the only way this class of fault is ever found here. Fixed twice
over: the strip moved below the card (a 340 px band at y 236, clear of both the card at
52..228 and the caption at ~322), and `filingStrip` now clips to its own box so no
authored string can ever bleed again.

⚑ **And a colour note that cost a render:** `ERA4.photoHair` and `PLACE.ink` are the SAME
hex (`#74492F`). The ball photograph's first pass used one for the room and the other for
the crowd, so the people and the wall were literally the same colour and it read as mud.
Three warm values apart now, darkest to lightest: `photoFrame` < `ink` < `floorLo`.

---

# 4 · WHAT IS STILL SÉRGIO'S
- **The art in the ball photograph is PLACEHOLDER-draft**, like every other era-4
  photograph. It reads as a room now; it is not finished.
- **P4** (move u5 to the ball's door), **P2** (captions follow the turn) and **P3**
  (openable offer cards) are unbuilt — the fresh-logic brief's build order.
- **§1.2(c)** — the Close reading the ledger back. This build makes the file visible
  *during* the era; the Close still ends without it.
- The ball's two recordings; §5.3's erasure-or-hope; the Close rework's layer choice.
