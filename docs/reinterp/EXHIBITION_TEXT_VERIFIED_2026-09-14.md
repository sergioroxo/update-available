STATUS: history-only

# YOUR UPDATE HAS FAILED (PC Simulator) — exhibition text, verified draft

*Checked against the repo (branch `reinterp`) on 2026-09-14: CLAUDE.md, ETHICS_CONSTRAINTS.md, docs/reinterp/INTERACTION_MAP.md, data/strings/close_network.json, data/strings/attributions.json, BUILD_LOG.md S101-S143, and `git log`.*

## Fact-check on the GPT draft

Confirmed exactly:
- 23 dialogue modules (`data/dialog/*.json`, counted: 23)
- 8 mandatory spine actions (docs/reinterp/INTERACTION_MAP.md: "Eight beats carry the whole piece" -- insert the disk, read the booklet, play a tape, connect to the channel, acknowledge the placement, write to your future self, press through the update, keep what you can carry)
- 47 Era 4 lines (BUILD_LOG S102: "Rendered all 47 of Era 4's lines in one sitting")
- 55+ audio cues (BUILD_LOG S141: walk.mjs prints "55+ clips from the 1997 boot to the Close's sky")
- Three people, not four, across four eras (Daniel in 1997 and 2003, Vera in 2016, Maya in 2026 -- `data/strings/close_network.json` panels)
- Three rooms that age (docs/REINTERP_RESTRUCTURE_R28_2026-07-10.md)
- "documentary / contested / speculative" is the dossier's own required status vocabulary (CLAUDE.md, ETHICS_CONSTRAINTS.md)
- No locomotion, ever -- turning is the only bodily ask (CLAUDE.md hard invariant)
- Three ways to experience it: headset, drag-to-look on desktop, gyro-to-look on phone/tablet (CLAUDE.md, look-modes)

Off or unsupported, corrected below:
- "~54 data files" -> actual count is 53 JSON files under `data/`
- "25 source labels" -> actual count is 24 (`close_network.json`: 7 project/process labels + 17 documenting SOGICE across the four eras)
- "10 sourced dossier entries" -> no such figure exists anywhere in the repo; this looks invented. The real figure is the 24 above.
- "~200 presses" -> real range is 201-285 depending on route and build date (minimum-path walks land at 201-212); "roughly two hundred" is a fair simplification for the minimum path, not the full one
- The tools/stack paragraph ("Claude's Fable, Sonnet, and Opus passes; Codex prototypes; ChatGPT Deep Research; PlayCanvas...") breaks your own hard rule from the prompt ("the AI collaboration... is disclosed in one plain sentence") and reads like a spec sheet, not the piece's own voice. The piece already has its own one-sentence version of this, in `data/strings/attributions.json`, and I used that register instead.

New, verified, not in any GPT draft:
- **1,226,367 total lines changed** (1,174,280 insertions, 52,087 deletions) across **468 commits** on the `reinterp` branch, from **12 June to 14 September 2026** (today), solo-authored by Sergio, working with Claude. "More than 1 million lines of code changes" is not just plausible, it understates it -- real number is past 1.2 million.
- **198 markdown design/production documents** in `/docs`.
- **BUILD_LOG.md runs to entry S143**, dated today.

---

## Wall text (word count: ~420)

YOUR UPDATE HAS FAILED (PC Simulator) is a browser and WebXR narrative about SOGICE, sexual orientation and gender identity change efforts: the practices that treat a queer or trans life as an error waiting to be corrected.

One desk sits inside three rooms that keep being rebuilt around it. Across thirty years and four eras, three people take the same seat. In 1997, Daniel is sixteen; a message board and a printed questionnaire ask whether he has corrected the way he walks, talks and sits. In 2003, the same Daniel is older, and the promise has become software: a daily check-in, a record of who writes to him, a file that will outlive the group that opened it. In 2016, Vera earns her wage correcting other people's testimony for a platform, one rule at a time, until a law arrives in her phone's group chat and makes what she does a crime; nobody in the room says anything. In 2026, Maya's session restores itself before she has touched a thing. A companion finishes her searches. Her photographs come back "improved." Her old name survives every migration, kept "for continuity of care."

Nothing plays from outside the chair. You read the screen, then you turn: the room's other face is the filing side, where attention becomes evidence. You never walk. The interaction stays deliberately small: insert the disk, play the tape, connect to the channel, accept the placement, write to a future self, press through the update, decide what you can carry. Eight such acts, repeated and varied, are enough to have the piece whole.

Every device arrives by the same rite: a notice, terms, an install, a restart, and eventually a failure that is answered with a new name, not an ending. Then, in the last room, an invitation reaches Maya's headset that the apparatus did not send. What is on the other side has no category the system can file it under, and its labels start to fail.

The fiction is built from documented history, never from the people who lived it. Its closing constellation carries twenty-four labels: seven for the project's own research and ethics process, seventeen tracing the documented history behind each era, each rated by the piece's own evidentiary law: documentary, documentary, contested, and, for the room that has not happened yet, speculative.

It was written and built with Claude (Anthropic), under the project's direction, research and ethics rulings: past 460 commits and 1.2 million lines of change since June.

Content note: conversion practices, family and community coercion, and a system that will not get a person's name right.

---

## Programme blurb (word count: 73)

A browser and WebXR narrative about SOGICE, sexual orientation and gender identity change efforts, and the devices that have carried it online for thirty years. Three people take the same seat across four eras as a questionnaire becomes software, software becomes a platform, and a platform becomes an ambient companion. You never walk, only turn. Built with Claude under the project's ethics rulings, from a dossier of twenty-four documented, contested and speculative sources.

---

## One line

One desk, thirty years, four names for the same demand, until the system meets someone it cannot file.
