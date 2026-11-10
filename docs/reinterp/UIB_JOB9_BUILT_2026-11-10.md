STATUS: live

# UiB job 9, built (S350, 10 Nov 2026): Noa in 2026, options 1 and 3

*Branch `uib/work`. The job: docs/reinterp/UIB_JOB_9_2026-11-10.md. TODO row: T54 (☑). The proposal,
docs/reinterp/DESIGN_NOA_2026_2026-11-09.md, is now `STATUS: live` with his decision at its head.*

Together the two make one point: **the system's version of her, and Noa herself, alive.** Nothing connects them on
screen; a player who meets both makes the link alone.

## 1. Option 3: the bot's "Stories like yours"

**Where:** Second Thoughts, after the map beat and before Junie. A new bot beat, `stories`, sits between `map` and
`rest` (`data/dialog/s4_v3.json` `bot.beats`, `bot.stories`; `src/desktop/apps/browser.ts` `drawStories`).

- **The bot says:** "You're not the only one, Maya." / "Others found their way. Read their stories."
- **The panel** (the right half of the bot's page, where the map was): "STORIES LIKE YOURS", under the stamp
  "curated for you · lightly edited", and three soft cards. Each has a plain grey disc (no face, no initial), a first
  name and age, and one sentence in the system's voice:
  - **Noa, 34:** "I found my peace." (his wording, `_s`)
  - Jess, 19: "My family is whole again."
  - Kai, 23: "I stopped fighting myself."
  The other two are invented and are no one's testimony. Their names are not used anywhere else in the piece.
- **"as she wrote it ›"** is a small underlined link on Noa's card; the whole card is the target. One press opens her
  own words below the smoothed line, off the system's card style (the page's own ground, plain ink, a small label
  "as she wrote it"): *"I wrote about my week. I was tired, and the bus was late."* (his wording, `_s`). They stay
  open. When they open, Kai's card no longer fits the panel and drops off; nothing else moves.
- **Nothing waits on it.** The panel holds 9 s after the bot's two lines, then the bot says "Rest now…" with the
  panel still up, then the piece turns her to Junie as before. If she has just opened Noa's words, the turn waits
  until she has had 6 s to read them. No ring, no Lamby target, no foot-bar button: it is not on the path.
- **Filed as the bot's offer, never a score:** `v3:stories` "assistant: 'Stories like yours' offered — three stories,
  lightly edited" when the panel appears; `v3:noa` "story: opened as she wrote it — Noa, 34" if she opens it.
- **The laws:** the satire is only in the smoothing (the stamp, the identical cadence) and it collapses when her own
  sentence opens. Her own sentence is not about gender, so the piece never answers for her. Nothing from her 2016 file
  travels with her (guard 1); no deadname; the clinical debate is untouched.
- **One exception to note:** presentation rule 1 puts every control in the foot bar. The job asked for a small link
  on her card, so this one control sits on the card. It is optional and not on the story's path.

## 2. Option 1: noa in the birthday stream

**Where:** the stream's chat (`data/dialog/s4_ball.json` `stream.before`; `src/desktop/apps/ball.ts`).

- **Her line:** *"noa: happy birthday from the night shift x"* (his wording). It is the fifth line, after lark's and
  before deebee's, so it comes **before Maya joins**: it is said to the stream, not to her. Same colour and size as
  every other viewer; it also runs in the caption strip.
- **The donation tick:** when her line lands (`gift: true` in the data), "✓ noa" appears at the end of the fund bar
  and the bar grows from 68% to 69% (`fundraiser.tick`, `tickFraction` in s4_v3.json). No total, no thanks, no score.
- She does not affirm Maya and does not refer to the bot's card.

## Photos (from the seat; `out/s350/photos/`, git-ignored; `node out/s350/noa-photos.mjs <port>` makes them)

- `e4-close-stories.png`, `e4-seat-stories.png`: the panel as it arrives.
- `e4-close-stories-noa-open.png`, `e4-seat-stories-noa-open.png`: after the one press, her own words open.
- `e4-stream-noa-screen.png`, `e4-stream-noa.png`: the stream's screen with noa's line and the tick by the fund bar.

## Checks

- `npm test` ✓ (tsc clean).
- Walk 2026 only: `tools/walk.mjs --port 3190 --max 2000 --one-era --from-era 4 --require-close` reached the
  Close in 83 presses (out/walks/WALK_2026-11-10_FROM_e4_SPEEDRUN_GUIDED_ONE_ERA.md). On the way it pressed Noa's
  card (filed `v3:stories`, `v3:noa`), and the beat went on to Junie, the stream and the Close as before.
- A first walk without `--one-era --max 2000` (the flags job 8 used) stopped after 20 presses. It was idling in Mum's
  thread and the optional FloppySheep game, before any of this job's beats, while the photo script was loading the
  same server. Its re-run with job 8's flags is the result above.
