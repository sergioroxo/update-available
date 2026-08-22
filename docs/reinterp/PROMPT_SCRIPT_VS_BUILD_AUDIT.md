STATUS: live

# AUDIT PROMPT — what the scripts promise vs what the build contains
*⚑ For a fresh model with no history here (Fable 5, or any capable model). Written 2026-08-21 because
the project lead said **"so much is missing, so much got lost"** and no document can currently prove
him right or wrong. Paste everything below the line.*

---

You are auditing a browser/WebXR narrative artwork for **missing content**. Repository:
`/Users/sergiogalvaoroxo/update-available-reinterp`, branch `reinterp`.

## THE ONE QUESTION

**Every beat the scripts promise — does it exist in the build, and can a player reach it?**

Nothing else. Not code quality, not bugs, not style. **Only: was it promised, and is it there.**

## WHY THIS EXISTS — read it, it tells you where to look

The piece has been built over months by a series of AI sessions. Its documentation is enormous — 142
files, ~620,000 words — while the artwork itself is about 900 lines of player-facing text. **Beats
were designed in conversation, implemented from prompts written from memory, and there is no document
that records what was decided but never built.** The lead can name one from memory: *"the transition
from Era 1 to Era 2 is missing the cascade of windows that we talked about previously and the
glitching effects."* Nobody knows how many more there are. **You are here to produce that list.**

⚑ **Assume nothing is true because a document says so.** This project lost six work sessions to a
stale header comment that everyone believed. **A promise in a script is evidence. A claim in a status
document is not.** Check the data and the code.

## THE SOURCES OF TRUTH — in this priority order

1. `docs/PRODUCTION_SCRIPT_v0.3.md` — the base script
2. `docs/SCRIPT_UPDATE_v0.4.md` … `v0.8.md` — successive revisions; **later supersedes earlier**
3. `docs/reinterp/REINTERP_RESTRUCTURE_R28_2026-07-10.md` — the current structural plan
4. `CLAUDE.md` — binding law, including which older decisions are RETIRED

⚑ **Where two scripts disagree, the later one wins, and say so in your report.** Some of what looks
"missing" was deliberately superseded — `CLAUDE.md` and `docs/reinterp/00_WHERE_THINGS_STAND.md`
list retirements. **A retired beat is not a loss. Do not report it as one.**

## WHERE THE BUILD ACTUALLY LIVES

- **Player-facing text:** `data/dialog/*.json`, `data/strings/*.json`
- **Rooms and props:** `data/room/*.json`
- **Sequence and triggers:** `src/narrative/spine.ts` (the state machine that decides what fires when)
- **Screens and beats:** `src/desktop/` and `src/desktop/apps/`
- **3D rooms:** `src/room/`

**Tracing method:** for each promised beat, find the data that carries it, then find the code that
reads that data, then find what triggers that code. ⚑ **A beat whose data exists but which nothing
triggers is MISSING for a player, and that is the most valuable kind of finding in this audit** — the
project has hit it repeatedly and calls it *"content that cannot be met."*

## WHAT TO PRODUCE

One markdown file: `docs/reinterp/SCRIPT_VS_BUILD_2026-08-21.md`. **Do not change any other file.**

Organise **by era** (Era 1 · 1997, Era 2 · 2003, Era 3 · 2016, Era 4 · now, the Close), and within each,
walk the script in order. For every promised beat, one row:

| verdict | meaning |
|---|---|
| **BUILT** | data exists, code reads it, something triggers it. One line, move on |
| **⚑ MISSING** | promised and absent. **The deliverable.** Quote the script line and say what would have to exist |
| **⚑ ORPHANED** | data or code exists but nothing reaches it on the played path. Say where the chain dies, with `file:line` |
| **PARTIAL** | some of it landed. Say precisely which part is absent |
| **SUPERSEDED** | a later script or CLAUDE.md retired it. Cite which, and do not count it as a loss |

Then a short section: **THE TEN MOST DAMAGING ABSENCES, ranked** — where "damaging" means a player
feels the gap, not where the diff is largest.

## RULES
- **Read-only.** Do not fix anything, do not refactor, do not "improve" a file you pass through. If you
  find a one-line fix, write it in the report and leave the code alone.
- **Cite `file:line` for every claim**, on both sides — the script line and the build location.
- **Where you cannot determine reachability, write `UNDETERMINED` and say what blocked you.** An honest
  undetermined is worth more than a confident guess and much more than a repeated document claim.
- **Do not report style, bugs, dead code, or performance.** Other passes own those. Absence only.
- You will read material about organised "conversion" practices targeting queer people, including
  survivor-adjacent writing. **Do not rewrite, improve, or comment on the ethics of any of it.** You are
  taking an inventory.

## THE POSTURE THAT MATTERS
The lead's own summary of the situation is: *"I've forgotten all the ideas I've had and that makes me
paranoid and afraid to be losing quality."* ⚑ **This audit exists to replace that fear with a list.**
A short honest list beats a long speculative one. **If the piece is in better shape than he fears, say
so plainly — that is a real and useful finding too.**
