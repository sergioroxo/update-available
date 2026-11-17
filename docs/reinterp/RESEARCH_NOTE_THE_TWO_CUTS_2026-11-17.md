STATUS: live

# Research note: the two cuts, and the version that stayed "for review" (17 Nov 2026)

*Written by the orchestrator (Opus 5.5) at Sérgio's request, for his research. The history comes from the project's
own documents, cited by file and line. The full cut is frozen as a research state (§5), not deleted.*

His words, 17 Nov 2026, after the orchestrator explained a change "for the full version":

> "There is not short/full version anymore. what are you talking about? So we've been double working is that what you
> meant? what does the full version have that he short doesnt?"

Then, asked whether to stop writing for it and keep it only as a frozen research state:

> "Yes, freeze it (include the situation to research document)"

## 1. How there came to be two

| Date | Session | What happened | Source |
|---|---|---|---|
| 8 Oct | Walkthrough 1 | His notes: the festival cut is named "Speedrun Version" (W1-A3); its sequence "must be clearer about where you need to go" (W1-F7) | `WALKTHROUGH_1_2026-10-08.md:26, :112` |
| 10 Oct | — | His call: the exhibition offers both, the full piece and the Speedrun Version (W1-K13) | `WALKTHROUGH_1_2026-10-08.md:152` |
| 10–11 Oct | S227 | The Speedrun Version is built as one switch, `src/state/cut.ts` (commit 26b5bbb5): 1997's Amen at once and two reading pages, 2003's programme assembles his story, 2016 straight to Annette, no side trips | `BUILD_LOG.md:1937` |
| 13 Oct | Codex | LambyOS Setup asks the visitor to choose: full or Speedrun | `BUILD_LOG.md:1974` |
| 14 Oct | S246d | The Speedrun Version walked whole from the entrance for the first time (564 presses) | `BUILD_LOG.md:1994` |
| 15 Oct | Opening notes, G4 | His note, as recorded: the two "differ too much (the helpful panels did not appear in one). Combine them: ONE guided version (the Speedrun's pacing as the spine) with the full version's optional content reachable from the Start menu for whoever wants to explore. Turn the separate full version off (keep the code)." | `OPENING_NOTES_2026-10-15.md:44–49` |
| 16 Oct | G4, one guided version | The choice leaves Setup and Home. One guided visit (236 presses). The full route's optional parts become twelve doors in the Start menu ("The other jobs"). The full route itself is **kept for review** behind a hidden address, `?cut=full` (510 presses) | `BUILD_LOG.md:2008`; `ONE_GUIDED_VERSION_REPORT_2026-10-16.md` |

So from 16 October there was **one version for visitors**. His instruction was to turn the other one off and keep the
code. What was built kept the code *and* left the other one running, reachable by anyone who typed the address.

## 2. What "kept for review" cost

Nobody visited `?cut=full`, but every change had to decide what it did there. Inside the code the visitor's version
kept its working name, "speedrun", so the data carries pairs: a beat's label and its `labelSpeedrun`, a hint and its
`hintSpeedrun`, 2016's `starters` and `startersSpeedrun`, Lambient's `firstOrder` and `firstOrderSpeedrun`, and beats
marked `"speedrun": false`. Each pair is a line written twice, or a choice made twice. Examples from the last week:

- **Job 29 B (S399, 16–17 Nov):** 2016's family calls left the visitor's board but stayed in the full route.
- **Job 30 B (S403, 17 Nov):** the "Ready to share" page (four previews, "Send to all four") left the visitor's
  version but stayed in the full route.
- **Job 30 B4 (17 Nov):** the editor's button became "Send to the network" for visitors; the full route was kept on
  "Send to all four". Its old strings were kept in a note.
- **The map hint (17 Nov, e0d4d63c):** written twice, one wording per route.
- **The 2016 era site at the Close:** the builder found that it still read the full route's wording ("Four places, one
  story") while the visit itself said something else. Nobody had chosen that; it was a side effect of two wordings.
- **The tools:** six of them (the walker, the era walker, the flow audit, the itch smoke test and two probes) carry a `--cut full` mode.

The vocabulary outlived the decision. On 17 Nov the orchestrator itself explained to him that "the normal visit has
been the short cut since 11 Nov". The date was wrong (it has been one version since 16 Oct), and the words "short" and
"full" described a choice the visitor had not been offered for a month. His question above is the correction.

## 3. What the full route held that the visit does not

At the freeze (§5), almost everything in the full route is reachable in the one version through the twelve doors of
"The other jobs" (the whole prayer, the programme in full, side trips in the room, the cassette player; the tapes, the
forums, the application, CLEAR; more work on the board, the other jobs; the whole session, the console;
`data/strings/extras.json`). What only the full route had:

- **Longer waits.** 1997: 60 s before the packet arrives (the visit: 20 s), 60 s between the form and what follows (25 s),
  45 s of grace before the check-in (15 s) (`src/desktop/os.ts:141–149`).
- **More questions.** 1997's family form in all six states; the visit keeps three of them (states 0, 3 and 5), with no
  word of the form edited (`ONE_GUIDED_VERSION_REPORT_2026-10-16.md`, cut 4).
- **More presses.** 2003's preparation one topic per press (the visit reveals the six topics by itself and asks for one
  "Go on"); 1997's profile with a separate Continue (cuts 2 and 3 of the same report).
- **2016's "Ready to share" page**, with the four previews and "Send to all four" (since job 30 B).

These are differences of pace, not of story: the long route is slower, asks more and waits longer. Every beat the story
needs is in the one version.

## 4. The reading

*For the article:* a version kept "for review" is not free. It goes on taxing every change, and its words go on shaping
how the makers think, after the decision that retired it. Here it also hid the decision from the person who made it:
the director heard about "the full version" a month after he had asked for one version. This sits beside the piece's own
argument about guidance. The rule of 10 October ("we need to take the viewer there") produced one guided visit; the long
route that was cut is evidence of what the piece was before that rule, and of what the cut cost (waiting, more
questions, more presses). That is why it is kept, frozen, rather than deleted.

## 5. The freeze (17 Nov)

- **The research state.** The full route is frozen at reinterp **403a0652** (job 29 A and B with job 30 B merged: the
  last build in which both routes were kept up), as the git tag **`research/full-cut-2026-11-17`**, and as a built copy
  in `~/Documents/YUHF-research-archive/full-cut-2026-11-17/` (open it with `?cut=full`). It is never changed again.
- **From now on, one version.** Every change is written once, for the visit. No new `…Speedrun` keys, no
  `"speedrun": false`, no full-route wording.
- **The live build stops answering `?cut=full`** (his 15 Oct instruction, now carried out: "Turn the separate full
  version off (keep the code)"). The code stays in place; the address no longer selects it. The tools' `--cut full` modes
  point to the frozen tag instead. This rides with job 29 Part D's walk.
- **The 2016 era site** reads the visit's wording.
