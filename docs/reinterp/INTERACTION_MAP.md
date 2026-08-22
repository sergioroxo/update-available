STATUS: live

# THE INTERACTION MAP
*Every element a player can act on, what kind of act it is, and what answers back. **Built from the
code, 2026-08-21** — not from the design docs, because the gap between them is the subject.*

> ⚑ **Why it exists.** Three questions Sérgio asked in one message proved the need better than any
> argument: he could not tell the belongings were window-only, I could not see the racket belonged to
> the pillow provotype, and neither of us knew the prayer opens with 18 seconds of unvoiced captions.
> **None of those is a bug. All three are interaction-readability failures** — and none was visible
> from the code, the docs, or playing.

---

# 1 · THE SPINE — mandatory, and it is SHORT
**Eight beats carry the whole piece.** They are the guide's own side-messages, which is the honest
definition: the system tells you to do these, and waits.

| # | beat | act | the room's answer |
|---|---|---|---|
| 1 | **floppy** | insert the disk on the desk | ⚑ the floppy lifts (emphasis) |
| 2 | **kit** | read the booklet | pages turn |
| 3 | **tape** | play a tape | ⚑ player + all three tapes lift |
| 4 | **channel** | connect to the fellowship | the modem beat |
| 5 | **packet** | acknowledge the placement | the form fills itself |
| 6 | **diary** | write to your future self | ⚑ deletion fails — the glitch |
| 7 | **update** | press through the ritual | ⚑ the error cascade, then the era turns |
| 8 | **belongings** | keep what you can carry | the gathering window |

⚑ **This is the SHORT PLAY, and it already exists.** A visitor who does only these eight things gets
Era 1 whole. Eras 2–4 have the same shape with fewer named hints — which is itself a finding: **the
scaffolding thins as the eras go on, and nobody decided that.**

# 2 · OPTIONAL — where the piece gets richer, and where it is thinnest
| element | where | state |
|---|---|---|
| **Tape A · the prayer** | Room 1 shelf | ⚑ opens with **18s of captions and no audio** — needs TTS or a cut |
| **Tape B · the jingle** | Room 1 shelf | plays; synced 2026-08-21 |
| **Tape C · the mixtape** | Room 1 shelf | plays; ⚑ files **nothing** to the record — the one tape the system does not take |
| **`lamby_rig.exe`** | E1 desktop icon | opens the rig lab |
| **The found file** | any era, idle desktop | silent icon, never advertised |
| **FloppySheep** | E3 laptop | one tap, no timer, nothing to beat |
| **The comments thread** | E3 tablet | reply with pinned templates |
| **The Close's dossier cards** | game menu → Credits | 10 sourced entries, reachable since S87 |
| **⚑ `pillow` provotype** | E1 desktop icon | **the racket in Room 1 is its instrument** — and nothing connects them |
| **⚑ `origin_intake_e1` provotype** | E1 desktop icon | the Family Form |

⚑ **CORRECTED 2026-08-21 — S86 ALREADY FIXED THIS AND I REPORTED IT AS BROKEN.** Both launchers are
carried onto the **E2** desktop under the found file's own law (`desktopIdle()`): never during a felt
scene, never over a window, never announced. The fiction was already carrying them — E2's boot crawl
says *JOURNEY FILE … MIGRATED*.
**What remains open is E3/E4, and S86 flagged it as a composition call rather than a bug:** E3 leaves
Daniel's monitor dead by law and E4 has no desktop, so "carry forward" cannot mean "forever" without
answering where an OS surface lives after Room 1. ⚑ **I wrote this section from the audit rather than
from the code — the exact failure this map exists to prevent.**

# 3 · SECRET — currently, almost none
The framework's category is real and the piece has **one** genuine instance:

- **Dismissing the assistant.** Always works, always logged. The record notices refusal.

⚑ **Everything else the piece could reward — waiting, repeating, refusing, revisiting — it does not
notice.** That is not a gap to fill with puzzles; it is a place where this piece is unusually well
positioned, because **its whole subject is a system that watches and files.** A record that notices you
did nothing is more on-theme than any hidden object.

# 4 · ⚑ THE READABILITY FAULTS — the reason this document exists
| fault | why it reads as broken |
|---|---|
| **Belongings are window-only** | the plant, books, poster, duck and monkey are clickable **only during the gathering window**. Outside it they are inert with no feedback — so "clickable" is true of a beat a player may never open |
| **The racket is inert** | it is the pillow provotype's own instrument (*"Raise the racket"*) and has no hit, no emphasis, no link |
| **The prayer's opening** | 18 s of hiss under captions for audio that does not exist |
| **Emphasis covers 2 of 8 hints** | six mandatory beats point at nothing in the room |
| **No feedback for a failed press** | pressing an inert prop does nothing at all — no sound, no shrug. The framework's rule: *avoid interactions that appear important but produce no readable response* |

# 5 · SHORT PLAY / LONG PLAY — what the map is actually for
The elements already divide cleanly, and this is the structure Sérgio asked for:

- **~10 min · the spine.** The eight beats, one era. Complete and coherent alone.
- **~25 min · the spine + the room.** Tapes, provotypes, the found file. ⚑ **Needs the provotypes to
  survive the era turn** — otherwise the long play is only available to someone who moves fast.
- **~45 min · all four eras + the Close.** The dossier, FloppySheep, the comments, the ball.

⚑ **The cadence problems have one cause: nothing distinguishes these tiers, so every player is offered
everything at once and the mandatory beats compete with optional ones for attention.** Naming the
tiers is what lets the pacing be designed instead of emerging.

# 6 · WHERE THIS MAP SHOULD LIVE — Sérgio's idea, and it is the right one
> *"The map can even live on the Intake record as a button that would display all the 'elements' that
> are playable here."*

⚑ **This is diegetically exact.** The intake record is the apparatus's own file on you. A list of what
you have and have not touched is **the system indexing you** — the map is not a menu bolted on, it is
the record doing what the record does. It also solves the ageing problem: the panel must change per era
anyway, and *what it has of you so far* is the thing that changes.

**It must not become a checklist.** Show what has been touched, never what remains — a completion list
would make the frame play, and the frame never plays.
