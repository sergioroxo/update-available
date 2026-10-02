STATUS: live

# REVIEW ROUND 5 — the eight-reviewer fleet (plan, ready to launch)
*His ask (2026-10-01): "we have a lot of limit to use until Saturday… very resource-intensive work… Multiple Sonnet
5.5 reviews?… Prepare the idea of the 8 agents, and I'll run it later tonight or tomorrow, depending on the changes we
make now." This is that plan. To run it, he says **"launch the fleet"** in a session. Each prompt below is also
self-contained, so it can be pasted into a fresh session by hand.*

## How it runs
0. **Me, first (about 1 h, one machine):**
   - the dev server: `preview_start reinterp-dev`, port 3000;
   - a fresh walk: `node tools/walk.mjs --port 3000 --max 2600 --require-close`, which writes `docs/reinterp/WALK_<date>.md`;
   - one photo set: `node tools/stills.mjs --port 3000 --out out/review5/stills`;
   - 2026: `node tools/tour-e4.mjs`.

   All eight read these SAME frames. They never run puppeteer at once against one server, and never run `walk.mjs` (it rewrites the WALK doc).
1. **The fleet (parallel, Sonnet 5.5, read-only):** eight agents, one lens each. Each writes ONE file,
   `docs/reinterp/REVIEW5_<LENS>_<date>.md`, with `STATUS: live` as its first line. No agent edits src/, data/, public/ or another doc.
2. **Me, after (Opus):**
   - verify every finding against the code or a frame, and drop the false ones (a probe measures its own policy; a still can catch the wrong state);
   - merge the duplicates;
   - rank the rest into `REVIEW_ROUND_5_<date>.md` with his checkboxes, in the format of `REVIEW_ROUND_4_2026-09-22.md`;
   - nothing is built until he has ticked it.
3. **Then the fix rounds**, walked after each batch, as in S103–S109.

**Cost, roughly:** each reviewer reads 150k–400k tokens (the book digest agent used ~550k for a whole book), so the
fleet is about 2–3 M Sonnet tokens plus my verification pass. That suits the "use it before Saturday" ask.

## The shared preamble (goes at the top of every prompt)
> You are reviewing YOUR UPDATE HAS FAILED, an academic interactive-narrative piece (University of Bergen, Center for
> Digital Narrative). It is a browser + WebXR room, played in four eras: 1997 Daniel, 2003 Daniel, 2016 Vera, 2026 Maya. It shows how
> conversion-practice (SOGICE) networks target queer people online. Repo: /Users/sergiogalvaoroxo/update-available-reinterp
> (branch `reinterp`). **READ-ONLY**: do not edit any file except the one review file you are asked to write; do not run
> tools/walk.mjs, tools/stills.mjs or any browser; do not download anything. Read first: CLAUDE.md (the laws),
> docs/ETHICS_CONSTRAINTS.md, docs/reinterp/OPEN_ITEMS.md (what is known and ruled — do not re-report a ruled item as a
> defect; P7-26 lists things that are BY DESIGN), docs/reinterp/NARRATIVE_FLOW_2026-09-17.md,
> docs/reinterp/PROGRESSION_LAW_2026-09-17.md, and the newest docs/reinterp/WALK_*.md (the interaction map of a full
> click-through). The photos are in out/review5/stills/ (with its own index .md) and out/tour-e4/ (or wherever the
> tour wrote).
> **Report format**, at most 25 findings, most severe first. Each finding gives:
> - an id (`<LENS>-NN`);
> - WHERE (era · beat · `file:line` or still filename);
> - WHAT A PLAYER EXPERIENCES (not what the code does);
> - WHY IT MATTERS (the law, ruling, research or craft principle it breaks, named);
> - SEVERITY (blocker / high / medium / low);
> - a CONFIDENCE (verified in code / seen in a still / inferred);
> - a SUGGESTED FIX in one or two sentences.
>
> Then a short "what works and must not be touched" list (max 8). Do not invent defects to fill the list; "nothing
> found" is a valid result. Never quote more than 15 words from any outside source. Write in plain English.

## The eight lenses (each prompt = preamble + this)

**1 · ERA97 — 1997, Daniel.** Play it in your head from the walk map and the stills: the room, the dial-up, the web,
the kit and its wizard, the prayer, the channel and Rob's DM, the yes-poster, the racket, the games, the pause, the
update. Ask:
- Is every beat reachable and legible?
- Is the pacing right? 1997 is ~half the piece by presses (P7-33).
- Do the side doors funnel back (SKETCH_BRANCHES_AND_SIDE_DOORS §1, §4)?
- Is any text overflowing?
- Does the register law hold (operable surfaces may play; felt scenes bare)?

Also use RESEARCH_DAME_GRIFF_TWO_REVOLUTIONS_2026-10-01.md §4: AOL's flat fee, the dial-up failure rates, room policy. Write `REVIEW5_ERA97_<date>.md`.

**2 · ERA03 — 2003, Daniel.** Cover:
- Restorify;
- the streak and the check-ins;
- the forum and Harbor;
- Your file;
- REACH;
- the testimony (prep, release, Tape 04, the Story Editor, the page);
- the ad and its REAL STORIES opening;
- Caleb;
- the residue;
- the pause and the ways back.

Is the media economy (testimony ↔ infomercial, SKETCH §3) legible to a first-time player? Does the testimony's tape stay bare (the felt register)? Is Caleb's thread earned? Write `REVIEW5_ERA03_<date>.md`.

**3 · ERA16 — 2016, Vera.** Cover:
- the workstation and its correction list (APPLY/SKIP);
- the board's jobs (Cut the Story, the group, recommend);
- Lambient;
- the phone and FloppySheep;
- Noa (unresolved by design);
- the "This week" card;
- the lock screen;
- the cascade and the ending.

⚑ His 2026-10-01 ruling: 2016 is dedicated to the lesbian story — nothing from the gay era's people or footage belongs there. Does the era give lesbian women visibility rather than using them? Write `REVIEW5_ERA16_<date>.md`.

**4 · ERA26 + CLOSE — 2026, Maya, and the Close.** Cover:
- the arrival orb;
- the browser and its tabs;
- the programme on rails;
- L;
- the Commons;
- the session breaking;
- the ball (3½ min of no controls is BY DESIGN — "stillness is not a dead end");
- the door;
- the flight;
- the Close (the panels, the sources, the printout, Restart, Leave).

His 2026-09-28 correction is binding: 2026 is not gentle (open anti-trans campaigns; be direct, never "cosy persuasion"); the clinical debate is never satirised. Write `REVIEW5_ERA26_<date>.md`.

**5 · EVIDENCE — the build against the research.** Read:
- `~/Pc_Simulation/Sources/Deep Research/sogice-social-media-layer.md`;
- RESEARCH_DAME_GRIFF_TWO_REVOLUTIONS_2026-10-01.md;
- VERIFY_TESTIMONY_LINKS_2026-10-01.md;
- SOURCES_*.md;
- data/dossier/ and data/provotypes/ (the dossier cards and their `status`).

For every on-screen mechanic or claim that implies a historical practice, ask: documented, contested or speculative, and does the piece label it right?

Known: streaks/points/gamified retention were NOT FOUND in any source, so 2003's streak must read as speculative. Also known: dossier source 17's two corrections are pending his word.

List each mismatch with the exact data file. Never propose dossier WORDING (that is his); only flag. Write `REVIEW5_EVIDENCE_<date>.md`.

**6 · ETHICS — tone and care.** Against docs/ETHICS_CONSTRAINTS.md and CLAUDE.md's tone laws:
- satire only in the perpetrator's self-presentation, and it must collapse;
- `felt` scenes bare (no assistant, no mechanics);
- `respite` never a trap;
- no real people, logos or verbatim testimony;
- invented marks only;
- no deadnames;
- nothing that speaks FOR survivors;
- the Assistant caps, and dismissal works;
- the clinical debate never satirised (both captions, unresolved).

Read data/dialog/ and data/strings/ in full. Flag every line that breaks a law, with the file and the key. Write `REVIEW5_ETHICS_<date>.md`.

**7 · COPY — every word on screen.** Read data/strings/ and data/dialog/ (skip `_doc*` keys).

Flag:
- typos;
- inconsistent names and marks across eras (GracePlatform/GraceOS/Restorify/Lamby/L/Un-Walk/TriedPath);
- inconsistent voice;
- lines too long for their surface;
- text that only makes sense to someone who has read the design docs.

Copy is Claude's to write, except `_s`-marked lines (his verbatim words, never touched) and dossier wording (his). Give each finding with a proposed rewrite. Write `REVIEW5_COPY_<date>.md`.

**8 · PLATFORM — performance, devices, access.**

- **Quest 3 budget:** ≤75k triangles, ≤75 draw calls, 72 Hz, no realtime shadows, render-texture uploads only on dirty. See QUEST_E4_2026-09-16.md and `tools/quest-e4.mjs`'s last report if present; look for per-frame `version++` or `dirty = true` that is not on a step.
- **The look-modes:** the phone gyro path (S80) and the drag look.
- **The input law:** a tap resolves on release, 10 px / 1.2 s; a pinch is camera FOV; there is no keyboard text.
- **Esc/pause.**
- **Hard invariants:**
  - no network after load;
  - no storage of user input;
  - every `new Audio` goes through the registry.
- **Accessibility:** text size at phone width, colour contrast on each era's palette, read-aloud coverage (L-05).

Write `REVIEW5_PLATFORM_<date>.md`.

## After the fleet, the questions for him
Each reviewer's "what works and must not be touched" list goes to him with the ranked findings. Anything that touches
ethics, the dossier, his `_s` lines or a ruled item goes to him as a question, never as a fix.
