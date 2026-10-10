STATUS: live

# Prompts for the cloud (claude.ai/code), 2026-10-09
*His ask, 2026-10-09: "Give me the prompts to run stuff on the cloud version of this." Each block below is a whole
prompt: paste it into a new cloud session pointed at the GitHub repository **sergioroxo/update-available**, branch
**reinterp**. A cloud session sees only what is pushed to GitHub: nothing in `~/Pc_Simulation`, nothing uncommitted.*

**⚑ First run (2026-10-09):** the session cloned `main`, not `reinterp`, and found a Playwright Chromium at `/opt/pw-browsers` (4 cores, 15 GiB). Every prompt now starts by switching to `reinterp` itself, and the walker finds that Chromium without help.

**Which model, at which effort, for which prompt** (set both in the cloud session before pasting)

| Prompt | Model | Effort | Why |
|---|---|---|---|
| 0 — machine check | **Haiku 5.5** | **low** | mechanical: run commands, report; nothing to judge |
| 1 — text cut | **Opus 5.5** | **high** | it rewrites display text, including felt scenes: the writing and the care are the job |
| 2 — LambyOS Home | **Opus 5.5** | **high** | design and the advert's script, with ethics questions to raise for you |
| 3 — 2003 cadence | **Sonnet 5.5** | **high** | tracing timers and triggers through several files is where shallow reading goes wrong |
| 4 — Vera's options | **Sonnet 5.5** | **medium** | a plan built from reading code and counting text; no final writing |
| 5 — rules sweep | **Haiku 5.5** | **medium** | thousands of lines, each a yes/no check against six rules, with a one-line verdict each |

Cost order is Haiku < Sonnet < Opus, and higher effort costs more of each. If credits run short, lower the effort before
the model (3 and 4 at medium still work; 1 and 2 should stay Opus at high). xhigh and max are not worth it here: these
are long, careful tasks, not hard puzzles.

**⚑ Second run (2026-10-09):** on `reinterp` the build, the four checks and the dev server all pass; the walk timed out loading the page. Two causes, both in the walker, both fixed (S223e): it waited for "network idle" while the cloud's Chromium kept retrying its own blocked calls home (www.google.com — the browser, not the piece: src/ names no host and the invariant check passed), and a cold dev server needs more than a minute to prepare every file on first load. Run Prompt 0 once more; it should end "walks possible: yes".

**⚑ After the first text cut (2026-10-09):** his worry, rightly: *"when it says cut it makes me scared, we need to visually see the differences"*. The first pass removed whole lines from the 1997 channel and Rob's messages and trimmed the 2016 members' stories. Prompt 1 now SHORTENS ONLY (whole-line removals are listed, never applied), and every text change gets a numbered before/after page (I build it locally from the branch) before anything is merged.

**How to use them**
- **Run Prompt 0 first, once.** It only checks what the cloud machine can do, and changes nothing. Whether a cloud session can run the walk (it needs Chrome) decides how far Prompts 1–5 can verify their own work.
- **Prompts 1–5 are independent.** Run them in parallel if you like. Each works on its own new branch and opens a pull request. **None merges or pushes to `reinterp`.** I review each one locally, walk it, and merge.
- **Writing and decisions stay where they are.** Where a prompt changes display text, it changes it on its branch and lists every before/after. Your `_s` lines and dossier wording are never touched, and ethics calls come back to you as questions.

---

## Prompt 0 — what can this machine do? (no changes; ~10 min)
**Model: Haiku 5.5 · effort: low**
```
SETUP FIRST (the session starts on main; the project lives on the reinterp branch):
  git fetch origin reinterp && git checkout -B cloud/check origin/reinterp && npm ci
  (tools/walk.mjs finds the machine's Chromium at /opt/pw-browsers by itself; do not download a browser.)
Do not commit, push or open a PR in this session.
Read CLAUDE.md fully first (it is the project's law).
Report, as a short checklist, what this cloud machine can and cannot do for this project:
1. Run npm ci, then npm test (report pass/fail and the four OK lines).
2. Start the dev server: npx vite --port 3000 --strictPort (in the background), and curl it.
3. Which Chromium tools/walk.mjs will use (it looks on PATH, then in /opt/pw-browsers). Do NOT download one.
4. If Chrome is present: run node tools/walk.mjs --port 3000 --max 120 --from-era 4 --one-era and report the
   last 15 lines of its output (it is a smoke test; it will not finish the era in 120 steps).
5. How many CPU cores and how much memory the machine has.
End with one line: "walks possible: yes/no".
```

---

## Prompt 1 — cut the heaviest text (W1-B1/B2: "we need more images and less text")
**Model: Opus 5.5 · effort: high**
```
SETUP FIRST (the session starts on main; the project lives on the reinterp branch):
  git fetch origin reinterp && git checkout -B cloud/text-cut-1 origin/reinterp && npm ci
  (tools/walk.mjs finds the machine's Chromium at /opt/pw-browsers by itself; do not download a browser.)
Read CLAUDE.md fully first; it binds. Then read docs/reinterp/WALKTHROUGH_1_2026-10-08.md (items W1-B1, B2, C7,
E1, D14) and docs/reinterp/TEXT_CENSUS_2026-10-08.md (every distinct screen of text the full walk saw, ranked by
words; canvases marked ATLAS hold several panels at once — judge each panel on its own).

Task: for the 25 heaviest REAL screens (skip pure atlases unless a single panel in them is over 80 words), cut
the display text by about half without losing what the screen is FOR. Every string lives in data/ (data/strings,
data/dialog); find each line by grepping its text.
Rules (non-negotiable, from CLAUDE.md and the lead's standing orders):
- Never edit a key ending in _s (his own verbatim words), any dossier wording (data/provotypes/*), or any line
  with a source/citation. Never invent sources. No real people or brands; invented marks only.
- Register: 'felt' scenes (the person) stay bare and are cut with the MOST care — never speak for queer people,
  no borrowed testimony; satire only in the perpetrator's own voice; the clinical debate stays unsatirised.
- Instructions the player needs to act must survive (shorter, not gone). Prefer showing over telling: where a
  paragraph explains what a picture or a button already shows, cut the paragraph.
- SHORTEN, do not remove: keep every line, message and list item that exists (a chat line, a step, a story);
  make each one shorter. Removing a whole line needs the lead's yes — list such proposals separately in the PR,
  do not apply them. Lines where a person speaks (chat members, Rob, the 2016 members' stories, Caleb) are
  shortened only where the screen already shows what the words said, and each is flagged in the PR.
- NEVER edit a file while a walk is running: the dev server reloads the page and the walk dies mid-run (the first
  text-cut run lost three of its four walks this way). Finish all edits, then walk.
- Display text only. Do not change code, layout or timing. Keep JSON valid; keep each file's _doc keys and
  add a short _docS223cut note where you cut ("cut for W1-B1, cloud, 2026-10-09").
Verify: npm test must pass. If the machine can run the walk (see Prompt 0), also run
  npx vite --port 3000 --strictPort &   then   node tools/walk-eras.mjs --port 3000
  and report each era's result line.
Deliver: commit on cloud/text-cut-1 (explicit paths, message ending "Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>"), push the branch, open a PR into reinterp titled "W1-B1: text cut, first pass" whose
body is a table: screen, file/key, words before → after, and the before/after text for each change. Do not merge.
```

---

## Prompt 2 — LambyOS Home, the front door (W1-A1, A2, A4, A5, A7)
**Model: Opus 5.5 · effort: high**
```
SETUP FIRST (the session starts on main; the project lives on the reinterp branch):
  git fetch origin reinterp && git checkout -B cloud/lambyos-home origin/reinterp && npm ci
  (tools/walk.mjs finds the machine's Chromium at /opt/pw-browsers by itself; do not download a browser.)
Read CLAUDE.md fully first. Then read docs/reinterp/WALKTHROUGH_1_2026-10-08.md sections A (the opening,
inspired by Microsoft Bob) and K, the current opening (src/desktop/orientingCard.ts and data/strings/
orientingCard.json; the reinterp opening beats in src/desktop/os.ts, phases r_boot / r_splash / r_profile /
r_recap), and the lexicon (data/strings/lexicon.json).

Task: a DESIGN DOCUMENT only — no code — for "LambyOS Home" (his name for it): the programme's own front door,
the way Bob was Windows', a cosy room that explains what the piece is and how to play before the fiction starts.
It must cover, each as its own section:
1. What the visitor learns there and in what order (the piece, the three ways to look — computer, phone/tablet,
   headset — the controls, the content warning, Leave), and what stays in the frame's voice (the frame never
   plays: no scores, no quests, no "achievements") versus the programme's voice.
2. The objects in the room and what each one does when pressed (one object = one thing to learn), including
   the Lexicon on a shelf (A5) and the advert as a VHS tape (A4: "a weird explainer of the topic in the
   programme's own voice") — write the advert's script (60–90 s), in the programme's voice, satirical in the
   perpetrator's self-presentation only and collapsing at its end; no real organisations or people.
3. How it hands over to Era 1, and how a returning visitor skips it.
4. Accessibility: click/tap only, no timers, captions, the R28 laws in CLAUDE.md.
5. Three image-generation prompts the lead can give GPT (A2): the room as a backdrop, the objects as separate
   layers on a plain background, in the project's Soft Lo-Fi doctrine (cozy low-poly, underdefined edges, not
   horror-dark), with the palette described in words (src/desktop/theme/ has the real hexes; quote them).
6. Open questions for the lead, as a numbered list (ethics calls are his).
Write it to docs/reinterp/LAMBYOS_HOME_DESIGN_2026-10-09.md; its first line must be "STATUS: draft".
Deliver: commit (explicit paths, message ending "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"),
push the branch, open a PR into reinterp titled "LambyOS Home: design draft". Do not merge.
```

---

## Prompt 3 — 2003's cadence (W1-B3, D1, D2, D7, D13, D14, D16, D18, D19)
**Model: Sonnet 5.5 · effort: high**
```
SETUP FIRST (the session starts on main; the project lives on the reinterp branch):
  git fetch origin reinterp && git checkout -B cloud/cadence-2003 origin/reinterp && npm ci
  (tools/walk.mjs finds the machine's Chromium at /opt/pw-browsers by itself; do not download a browser.)
Read CLAUDE.md fully first. Then docs/reinterp/WALKTHROUGH_1_2026-10-08.md (B3 and section D). 2003 is Daniel's
era (Caleb, the forum, the story videos, the mail, the purity streak, the glitch).

Task, in two parts.
Part A — a TIMELINE, as a document: map 2003 from its arrival to the update ritual as the code actually runs it
(src/desktop/os.ts e2 stages and the 2003 apps under src/desktop/apps/, data/dialog/s2_*.json, the helper in
src/frame/helper.ts and the map in src/witness/map.ts). For every beat: what triggers it (a press, a timer, a
ledger record), what the player is doing at that moment, and what else is talking or arriving at the same time.
Mark every place where the story moves on while the player is busy or talks over a video or Caleb (his notes D7,
D13, D16: "the helper keeps showing lines while your story's videos play"; "'Read the Mail' should wait while the
person is talking with Caleb"; "Caleb's message conflicts with the rest of the mail arriving").
Part B — a RE-TIMING PLAN: for each conflict, the smallest change that makes the narrative wait for the player
(play/pause cadence), with file/function names. Implement ONLY the changes that are purely about waiting (a
condition that defers a line, a toast or an arrival until the player is idle or a video has ended) — no new
text, no removed beats. Each change carries a comment "S223 cloud / W1-Dxx" quoting his note.
Verify: npm test. If the machine can walk (Prompt 0): npx vite --port 3000 --strictPort & then
node tools/walk.mjs --port 3000 --max 1500 --from-era 2 --one-era, and report its result line and STOPPED BECAUSE.
- NEVER edit a file while a walk is running: the dev server reloads the page and the walk dies mid-run (the first
  text-cut run lost three of its four walks this way). Finish all edits, then walk.
Write the document to docs/reinterp/CADENCE_2003_2026-10-09.md (first line "STATUS: draft").
Deliver: commit (explicit paths; message ending "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"),
push the branch, open a PR into reinterp titled "2003 cadence: timeline and waits". Do not merge.
```

---

## Prompt 4 — 2016's reading load and Vera's options (W1-E1, E2, E5)
**Model: Sonnet 5.5 · effort: medium**
```
SETUP FIRST (the session starts on main; the project lives on the reinterp branch):
  git fetch origin reinterp && git checkout -B cloud/vera-options origin/reinterp && npm ci
  (tools/walk.mjs finds the machine's Chromium at /opt/pw-browsers by itself; do not download a browser.)
Read CLAUDE.md fully first. Then docs/reinterp/WALKTHROUGH_1_2026-10-08.md section E ("far too much reading in
2016"; "reduce Vera's options to about three; the player can unlock the rest — 'update to new functionalities'";
"the link-clicking cadence of the messages is too much"). 2016 is Vera's era: the workstation's moderation board
(src/room/graceQueueLite.ts), her phone (src/desktop/apps/phoneE3.ts), data/dialog/s3_*.json.
Task: a DESIGN DOCUMENT with a plan, no code: (1) every action Vera is offered on the board and the phone today,
with how often it appears and how much text comes with it; (2) a proposal of the three she starts with and the
order the rest unlock, each unlock presented as the platform's own "update" (diegetic, the programme's voice —
the frame never plays); (3) which messages can be merged or shortened, with word counts before/after; (4) what
this does to the era's ending triggers (check what the cascade and the final arm depend on, in
src/room/era3Devices.ts and graceQueueLite.ts) so nothing becomes unreachable; (5) questions for the lead.
Write it to docs/reinterp/VERA_OPTIONS_2026-10-09.md (first line "STATUS: draft").
Deliver: commit (explicit paths; message ending "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"),
push, open a PR into reinterp titled "2016: three options, then updates (plan)". Do not merge.
```

---

## Prompt 5 — a rules sweep across all the text (cheap; Haiku-suitable)
**Model: Haiku 5.5 · effort: medium**
```
SETUP FIRST (the session starts on main; the project lives on the reinterp branch):
  git fetch origin reinterp && git checkout -B cloud/rules-sweep origin/reinterp && npm ci
  (tools/walk.mjs finds the machine's Chromium at /opt/pw-browsers by itself; do not download a browser.)
Do not change any file except the one report below.
Read CLAUDE.md fully first. Then check every string in data/**/*.json (keys starting with "_" are notes, skip
them) against these rules, and list every hit with file, key and the text:
1. A real person, brand, product, platform or organisation named (the invented marks — Compass, HopeRestored,
   Pastor.AI, Sift, Restorify, Lamby, Second Thoughts, LambyOS… — are fine; organisations are allowed only where
   the knowledge base documents them: grep docs/research and docs/reinterp/VERIFY_*.md).
2. Anything that could read as a deadname or an old name for Maya (the piece says only "the old file").
3. "[VERIFY SOURCE]" or any unverified-source marker in player-visible text.
4. A slur, or the clinical debate about gender-questioning young people being mocked.
5. British/American spelling mixed within one file (the piece writes British: programme, colour, authorised).
6. Any line over 40 words that the player must read to know what to do next.
Write the report to docs/reinterp/RULES_SWEEP_2026-10-09.md (first line "STATUS: live"), grouped by rule, with a
one-line verdict per hit ("fine because…" or "fix"). Commit it on the branch cloud/rules-sweep (message ending
"Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"), push, open a PR titled "Rules sweep (report only)".
```

---

## Prompt 6 — cadence, not clock: every timed beat, and every route to each era's end (W1-B3; his 2026-10-10)
**Model: Opus 5.5 · effort: high** — it is a design study across the whole piece; reading timers right and judging the
dramaturgy both matter.

*His words: "We should try and not use time-based sequences, and make them cadence-wise, so to study the multiple
pathways to achieve the resolution."*
```
SETUP FIRST (the session starts on main; the project lives on the reinterp branch):
  git fetch origin reinterp && git checkout -B cloud/cadence-study origin/reinterp && npm ci
  (tools/walk.mjs finds the machine's Chromium at /opt/pw-browsers by itself; do not download a browser.)
Read CLAUDE.md fully first; it binds. Then docs/reinterp/WALKTHROUGH_1_2026-10-08.md (B3, section D, E5, F4) and
docs/reinterp/CADENCE_2003_2026-10-09.md (the 2003 timeline already made; its six waits are merged or being merged).

The lead's direction: the piece should move by CADENCE, not by CLOCK. A beat should happen because the player did
something (pressed, finished, turned, put something down, came back), or because they have been quiet for a while,
never because N seconds passed while they were busy. And there are many ways through each era; he wants to see them.

Task: a STUDY DOCUMENT, no code. For each of the four eras (1997, 2003, 2016, 2026) and the Close:
1. THE CLOCKS: every time-based trigger in the era: every setTimeout, every `…At`/`…T`/`…Seconds`/`HOLD`/`DELAY`
   constant, every "after N seconds" in src/ and data/ (grep widely: os.ts, the apps under src/desktop/apps/,
   src/room/graceQueueLite.ts, era3Devices.ts, space.ts, src/narrative/*, src/frame/helper.ts, data/dialog/*). For
   each: what it starts, what the player is likely doing at that moment, and whether it can land while they are
   busy (a video playing, a conversation open, a game in hand, a window being read).
2. A VERDICT for each clock, one of: (a) KEEP — it is the fiction's own time and should stay (a song's length, a
   dial-up, a typing animation, the ball's 3½ minutes of stillness: "stillness is not a dead end"); (b) CADENCE — it
   should wait for a player event instead, and which event; (c) IDLE — it should wait for the player to be quiet,
   and for how long. Give the smallest code change for (b) and (c), with file/function names.
3. THE PATHWAYS: a map of the routes from each era's arrival to its update (and from 2026 to the Close): the beats
   on the required spine (src/narrative/spine.ts, the map in src/witness/map.ts and data/strings/map.json), the
   optional ones, and the different orders a player can take them in. Draw it as a table and as a mermaid graph per
   era. Mark every place where one route makes a beat unreachable or plays two beats on top of each other.
4. THE FIRST BATCH: the ten (b)/(c) changes that would most improve the cadence his notes complain about, ranked.
5. Questions for the lead (ethics and dramaturgy are his), numbered.
If the machine can walk, you may run node tools/walk-eras.mjs --port 3000 (after npx vite --port 3000 --strictPort &)
to see how the walker experiences the timing, but change NO file while it runs.
Write it to docs/reinterp/CADENCE_STUDY_2026-10-10.md (first line "STATUS: draft").
Deliver: commit (explicit paths; message ending "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"), push,
open a PR into reinterp titled "Cadence, not clock: the study". Do not merge.
```

---

## Prompt 7 — streamline the Commons (W1-F3, F4, F5, F7; his 2026-10-10)
**Model: Opus 5.5 · effort: high** — a redesign of the era's last stretch, with felt and respite material in it.

*His words: "All of them. The need to jump to different places, the way the sequence flows and the length. There is
too much information with the ball notes etc, so this needs to be more streamlined." And his rule for the whole piece
(CLAUDE.md, R28 amendment 1, revised 2026-10-10): "We should not expect people to look around at any part, we need to
take the viewer there."*
```
SETUP FIRST (the session starts on main; the project lives on the reinterp branch):
  git fetch origin reinterp && git checkout -B cloud/commons-streamline origin/reinterp && npm ci
  (tools/walk.mjs finds the machine's Chromium at /opt/pw-browsers by itself; do not download a browser.)
Read CLAUDE.md fully first; it binds — especially the R28 amendment 1 revision of 2026-10-10 (take the viewer there).
Then docs/reinterp/WALKTHROUGH_1_2026-10-08.md section F (F3 "too noisy; the overlapping songs are too much", F4
"the steps are confusing", F5 "the several spots don't work; streamline to one area", F7 "the Speedrun Version's
sequence must be clearer about where you need to go"), docs/reinterp/CADENCE_STUDY_2026-10-10.md (§ on 2026 and §9,
his answers), and the 2026 code: src/desktop/apps/space.ts (E4Shell, the ball, the Commons), src/room/era3Devices.ts
(the visor), src/room/pointCloud.ts, data/dialog/s4_*.json.

Task: a REDESIGN DOCUMENT, no code. The Commons today, then the Commons streamlined:
1. TODAY: every place the player is moved to or asked to go, every note/card/text on screen, every sound layer, every
   step, with its trigger and its length (a table), and where the player is expected to look on their own.
2. ONE AREA: the whole Commons in one place, the player taken through it as a sequence of actions (a press, a
   put-down, a turn the piece conducts) — never by asking them to look around, never by a clock alone. Keep what the
   lead has protected: the respite (genuine queer joy; never a trap, never revealed as fake), Junie, the ball's
   stillness as the work's slowest intentional beat, the programme's intrusions and their failure.
3. LESS INFORMATION: which notes, cards and lines go, merge or shorten (before → after words). Felt and respite
   lines are shortened, never removed; removals are listed for his yes, not applied.
4. ONE SOUND AT A TIME: a plan so songs and voices never overlap (F3).
5. THE SPEEDRUN VERSION (F7): the shortest clear route through the same area.
6. The code changes it implies, with file/function names, in the order to build them; what the walk must check.
7. Questions for the lead, numbered (ethics and dramaturgy are his).
Write it to docs/reinterp/COMMONS_STREAMLINE_2026-10-10.md (first line "STATUS: draft"). Change no other file.
Deliver: commit (explicit paths; message ending "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"), push,
open a PR into reinterp titled "The Commons, streamlined (design)". Do not merge.
```
