STATUS: live

# ARTICLE COMPILATION — raw material for the Digital Creativity manuscript (2026-10-03)

*Compiled on 2026-10-03 from a read of the repository (branch `reinterp`), for the special issue "Interactive Digital
Narratives: Creativity, Theory, and Emerging Practices" (manuscript due 31 October 2026). It builds on, and does not repeat,
the curated log `ARTICLE_EVIDENCE_LOG.md` (cite that for the methodology notes 1-4, the Close-constellation worked
example and the LambyOS passage) and `ABSTRACT_EVIDENCE_2026-07-30.md` (the methodology audit and its honest qualification
that "model outputs" are mostly agents' self-reports). This file is raw material, not prose for the paper. Nothing in it was
written by Sérgio; the facts are read from the repo, the judgements about what is citable are the compiler's.*

**Conventions.** Every claim has a path, with `:line` where one exists. "(inferred)" marks something the compiler concluded
rather than read. "Local only" marks material that is not in the committed repo. Quotations from Sérgio are verbatim as the
repo records them, spelling included; the repo records his messages as typed.

---

## 0. Read this first: caveats that affect how anything below can be cited

1. **Three dates in the repo disagree with the message log and with git.** Cite the later, evidenced date and note the
   repo's own label.
   - *"The writing is Claude's"* and *"the trans reader pass is retired"*: `CLAUDE.md:131` and `:143` and
     `08_STATUS_REGISTER.md:1690` say 2026-08-17. His message is stamped **2026-08-20 20:20**
     (`SERGIO_SAID_ALL_SESSIONS.md:10071`), the change that records it is git `4ca5201e` of **2026-08-20 22:24**, and
     `LOST_ASKS_AUDIT_2026-09-17.md:60-61` gives 2026-08-20. (Inferred: 08-17 is the date of the S91 session that was
     running when the correction was folded in.)
   - *"`?flat=1` is not a fallback"*: `CLAUDE.md:38` and `BUILD_LOG.md:314` say 2026-08-06; his message in the log is
     **2026-08-08 11:11** (`SERGIO_SAID_ALL_SESSIONS.md:8754`) and the `CLAUDE.md` change is git `fd4b2e25`, 2026-08-08 13:15.
     The 08-06 label may be the date the device research ran (inferred).
   - *Draw-call budget 60 to 75*: `CLAUDE.md:113` and `BUILD_LOG.md:317` say 2026-08-06; git `2d9d1671` is 2026-08-09.
2. **Session numbering is not gap-free.** Highest id is S209 (suffixes run to S209f). S73 and S75 are declared "RETIRED
   numbers" (`01_SESSION_LOG.md:6`); S92 is used twice (the Close, 2026-08-20, `01_SESSION_LOG.md:5228`; the Walk,
   2026-08-26, `BUILD_LOG.md:358`); S88/S89/S91 ran in parallel worktrees (`BUILD_LOG.md:21`). My count of integer ids that
   appear as a session lead in `BUILD_LOG.md`, git subjects or `01_SESSION_LOG.md` headings is **at least 154 of 209**
   (lower bound; many S93-S144 sessions are logged in `BUILD_QUEUE_LIVE.md` and `08_STATUS_REGISTER.md` sections rather than
   as BUILD_LOG leads). Say "about 200 numbered sessions" rather than a precise count.
3. **`out/` is git-ignored** (`.gitignore`; `REINTERP_FIGURES_FOR_THE_ARTICLE.md:50`). Every still, tour frame, probe image
   and rendered video in section 8 exists on this machine only. The folder the evidence log promised,
   `docs/reinterp/article-evidence/` (`ARTICLE_EVIDENCE_LOG.md:18-31`), **does not exist**; its index table is still the
   empty scaffold.
4. **The existing abstract-evidence counts are stale** (it says 158 commits, 103 docs, 205 log entries on 2026-07-30).
   Use section 1 below.
5. `ARTICLE_EVIDENCE_LOG.md` and `EXHIBITION_TEXT_v6_2026-09-14.md` had uncommitted edits in the working tree at compile
   time, and another session was editing `src/`, `data/`, `public/`. Line numbers cited for those two files and for `data/`
   may have moved since; re-check them before quoting.

---

## 1. The arc in numbers

### 1.1 Calendar and commits (from `git log`, read 2026-10-03)

| measure | value | source |
|---|---|---|
| First commit | 2026-06-12, "Scaffold: Vite + TS + PlayCanvas-as-npm, Era-1 BIOS boot on monitor texture" (`cf257bee`) | `git log --reverse` |
| Latest commit | 2026-10-03 (`0d7196c`, S209f) | `git log` |
| Span | 114 calendar days inclusive (06-12 to 10-03) | derived |
| Reinterpretation branch work | begins 2026-07-02 (master plan round 10 and the coordination system, `03_COORDINATION.md:4`); 554 of 568 commits are on or after 07-02, 14 are June | `git log --since=2026-07-02` |
| Commits on the branch | **568** | `git log --oneline \| wc -l` |
| Days with at least one commit | 78 (76 since 07-02) | `git log --format=%ad` |
| Busiest days | 2026-08-15 (33), 2026-09-13 (22), 2026-08-24 (21), 2026-09-20 (18) | same |
| Lines changed (insertions / deletions, all files, docs and generated JSON included) | about 1.94 M / 0.41 M. **Not a measure of code**: `EXHIBITION_TEXT_v6_2026-09-14.md` quotes "1.2 million lines of change" at ~460 commits | `git log --shortstat` |
| Tracked files | 5,062; `src/` 104 files, 49,639 lines; `data/` 79 files (75 JSON); `docs/` 346 files (264 `.md`); `tools/` 37 files (25 `.mjs`); `public/` 171 files | `git ls-files` |
| Dialogue modules | 32 in `data/dialog/` (23 on 2026-09-14 per `EXHIBITION_TEXT_VERIFIED_2026-09-14.md:10`); 24 files in `data/strings/` | `ls` |
| Audio | 123 audio files tracked; 120 in `public/assets/audio/` | `git ls-files` |

### 1.2 Sessions and logs

| measure | value | source |
|---|---|---|
| Highest session id | S209 (S209f on 2026-10-03) | `BUILD_LOG.md:1908` |
| Distinct ids seen (lower bound) | at least 154 | see caveat 2 |
| BUILD_LOG | 1,908 lines, about 73,400 words; 255 one-line session entries plus 66 dated `##` sections; covers 2026-06-12 to 2026-10-03 | `BUILD_LOG.md` |
| 01_SESSION_LOG | 5,387 lines, about 93,750 words (huge; grep, do not read) | `docs/reinterp/01_SESSION_LOG.md` |
| Design rounds before the build sessions | Rounds 8-11c on 2026-06-12/13 (the shipped build, 14 commits); reinterp master-plan Rounds 1-29 from 2026-07-01 to 2026-07-23 (R28 struck 2026-07-10, R29 tracking round 2026-07-23: `BUILD_LOG.md:251`) | `BUILD_LOG.md`, `CLAUDE.md:9` |
| Doc lifecycle | 263 of 264 `.md` files carry a machine-checked `STATUS:` first line: 222 live, 28 history-only, 13 superseded-by; the one exception is `docs/ChatGPT analysis.md` (a filename with a space; not parsed by my loop) | `tools/check-spec.mjs` C5; my count |
| Memory files (local only, outside repo) | 51 files under `~/.claude/projects/-Users-sergiogalvaoroxo-update-available/memory/` (index `MEMORY.md`) | local only |
| Raw session transcripts (local only, outside repo) | 47 `.jsonl` files, about 1.15 GB, under `~/.claude/projects/` for this project's three folders. **Not in the repo.** Size and file count only; I did not open them | local only |

### 1.3 Review rounds and findings

The piece has been sat through and written down five times. "Review round 2" does not exist as a file: the numbering
skips from 1 to 3 (inferred: round 2 was the fix round after round 1, S103-S109, `03_COORDINATION.md:54-70`; his own
count in `REVIEW_ROUND_3_2026-09-17.md:3-5` is "third full play, after 2026-08-21 and 2026-09-02").

| # | date | who looked | what it produced | source |
|---|---|---|---|---|
| W | 2026-08-21 | Sérgio, first end-to-end play | about fifty findings ("fifty findings answered in prose is how the last batch got lost", line 4); twelve lettered sections; verdict: *"I feel like we didn't do much to fix this project. I am genuinely saddened about this. So much is missing, so much got lost."* | `WALKTHROUGH_2026-08-21.md:3-8` |
| 1 | 2026-09-02 | Fable 5.1 (coordinator), lanes B and C to Sonnet 5, A and D kept; first instrumented sit-through (135-press walk, 19 min, 3,700 samples) | 14 ranked defects in the main file (A-1 to A-8, B-1, B-2, C-1 to C-4) plus lane D's sound commissions (D-1 to D-11); fix round S103-S109 | `REVIEW_R1_2026-09-02.md:1-30`; lane files |
| 3 | 2026-09-17 | Sérgio's third play, answered point by point | **111 id rows** (R3-01 to R3-114); status tally by my count: OPEN 62, BUG 27, DESIGN 24, REPEAT 12, DONE 11, ASK 5, PUSH BACK 1. Created `OPEN_ITEMS.md` | `REVIEW_ROUND_3_2026-09-17.md:1-20` |
| 4 | 2026-09-22 | a model run-through on 158 tour frames (author not named in the file), then his marks on the exhibition stills | 12 flags (R4-01 to R4-12) in the document; the register carries **43 R4 ids** by 09-28 | `REVIEW_ROUND_4_2026-09-22.md`; `OPEN_ITEMS.md` |
| 5 | 2026-10-02 | **Eight Sonnet 5.5 reviewers in parallel**, one lens each (ERA97, ERA03, ERA16, ERA26+Close, EVIDENCE, ETHICS, COPY, PLATFORM), read-only; then an Opus verification pass | **140 findings** in the eight reports (by id count: 17, 16, 19, 17, 20, 11, 24, 16; the round document says "about 150"); merged to **25 A items** (bugs, "mine to fix") and **28 B items** (his decisions) plus 10 noted-not-now; 11 items marked as checked against code by the compiler | `REVIEW_ROUND_5_2026-10-02.md:3-12, 15-61, 61-110, 110-121`; `REVIEW_FLEET_PLAN_2026-10-01.md` |

**Disposition in round 5 (the governance mechanism).** Every finding is a checkbox; *"Nothing is built until you tick
it"* (`REVIEW_ROUND_5_2026-10-02.md:11`). His response: *"Let's do all of A"*; on B he ruled item by item
(`:130-166`). A1-A24 were built by 2026-10-02 (S209, S209b); A25 was proved on 2026-10-03 (S209f). B1, B2, B4, B5, B7-B15,
B17-B25 and B27 were built in S209b-S209d; B6 and B16 "keep, as ruled"; B26 and B28 deferred by his ruling
(`:178-195`).

**The register that came out of round 3.** `OPEN_ITEMS.md:1-12` is the "one register of what is owed", started after his
verdict that *"you are no longer marking all the things to be done"*. The law: every session reads it first, every BUILD_LOG
entry names the ids it closes, an id moves to DONE only with proof (a walk, a frame or his word), nothing is deleted.
By my count it holds 198 id rows (R3 86, P7 50, R4 43, L 9, W 7, I 3), of which 155 are closed or struck through.

### 1.4 The walker: presses over time (the click-only walk from the entrance)

`tools/walk.mjs` was first committed 2026-08-26 (`b0f1a20c`). Each run writes `docs/reinterp/WALK_<date>.md/.json`.
Of the 36 walk files, 6 are `--jump` diagnostic runs (named `..._JUMPED_...`; a jump never proves reachability) and 30 are
click-only runs, one of them a minimum-path run (`WALK_2026-09-11_MIN2.md`). "Spine done" means the walker reached the Close.

| date | presses | presses that changed nothing | spine | note |
|---|---|---|---|---|
| 2026-08-26 | 142 | 47 (33%) | stopped at Era 4 | first walk; found six surfaces with no hit rects (`BUILD_LOG.md:358-382`) |
| 2026-09-02 | 135 | 31 | stopped at Era 4 | review round 1; the walker opened the pause menu on itself |
| 2026-09-04 | 202 | 77 | **done** | first run to the Close |
| 2026-09-07 | 320 | 159 | done | |
| 2026-09-16 | 214 | 84 | done | after the Era-4 rebuild |
| 2026-09-22 | 285 | 76 | done | review round 4 |
| 2026-09-28 | 322 | 89 | done | |
| 2026-10-01 | 523 | 120 | done | `--max 2600`: the piece is now longer than the old cap |
| 2026-10-02 | 558 | 140 | done | review round 5 |
| 2026-10-03 | **572** | 143 (25%) | done | `WALK_2026-10-03.md`; 1,246 steps |

Minutes per era in the last walk (wall minus tool overhead, "errs low"): 1997 9.0, 2003 15.1, 2016 2.9, 2026 5.4; presses
136 / 242 / 80 / 66 (`WALK_2026-10-03.md:5-18`). Round 5's own reading of the 2016 figure: a main-path player sees Renata for
"about a minute" (`REVIEW5_ERA16_2026-10-02.md:53`). Round 5 B28 notes the premise "1997 is half the piece" is stale
(26% of presses, `REVIEW_ROUND_5_2026-10-02.md:106`).

Other measurement series worth a figure in the paper: the Quest draw-call budget history (60, raised to 75 by him; the
worst measured point 197 at review round 1, `03_COORDINATION.md:60-64`; the Era-4 run of 2026-09-16 peaks at 41 of 75 in the
Close's travel, `QUEST_E4_2026-09-16.md`; a local-only note records 201 falling to 125 after S108's batching fix, not
re-verified here). All of it measured in headless desktop Chrome, not on a Quest (see
section 9).

### 1.5 The research and verification trail

| item | number | source |
|---|---|---|
| ChatGPT Deep Research prompt documents | 9 dated 2026-06-29 to 2026-07-24 in `docs/` (`CHATGPT_DEEPRESEARCH_*`) | `ls docs` |
| Verification runs | 2026-07-24 (six claims needed rewording, C1-C6); 2026-09-26 (27 previously unchecked claims, C1-C27; applied word for word on 09-27 except one he held back); testimony links 2026-10-01 (11 links: 8 ready, 1 needs a wording fix, 2 his decision); ad iconography 2026-10-02 | `SOURCE_VERIFICATION_RESULTS_2026-07-24.md:1-12`; `SOURCE_VERIFICATION_RESULTS_2026-09-26.md:1-14`; `VERIFY_TESTIMONY_LINKS_2026-10-01.md:1-8`; `VERIFY_AD_ICONOGRAPHY_2026-10-02.md:1-10` |
| Dossier links | 68 verified links on 30 sources by 2026-09-27 | `BUILD_LOG.md:1873` |
| Close constellation labels | 24: 7 for the project's own process, 17 for the documented history behind the eras | `EXHIBITION_TEXT_VERIFIED_2026-09-14.md:12-13, 22` |
| Dossier statuses in data (my quick scan, may miss nested forms) | `data/provotypes/*.json` (5 files): 40 documentary, 8 speculative, 3 contested; `data/dossier/practices.json`: 14 documentary, 13 speculative, 2 contested | scan of the JSON |
| Lexicon | 27 terms with the reasons networks give, from `RESEARCH_LEXICON_2026-10-02.md` and two sources of his | `BUILD_LOG.md:1907` |

---

## 2. The authorship model, and how it changed

### 2.1 The five operating models, dated

| dates | model | norm in force | evidence |
|---|---|---|---|
| 2026-07-02 to about 07-10 | **Fable as hub, Sérgio as relay and author of record.** Each lane is a separate chat window he opens himself; "there is no automatic hand-off between models"; Fable writes every prompt and reconciles every result; all copy stays PLACEHOLDER until his voice pass; felt text gets a brief, not a draft; ethics gates G1-G12 are his | `03_COORDINATION.md:4-17, 30-35`; `05_HOW_TO_RUN_A_SESSION.md:1-12`; `02_SONNET_SESSION_TEMPLATE.md:39` ("Do not decide creative/ethics questions: if the spec is ambiguous, STOP, write the question under BLOCKED") |
| 2026-07-10 | **Autonomous mode.** His words, 08:20: *"My suggestion is for you to make creative decisions and adjustments instead of waiting for me to approve the next steps. My goal is to finalize the full experience... Just flag the things I need to check in a document so we can later create a checklist."* Fable decides and logs each call in `06_SERGIO_CHECKLIST.md` (D1 onwards); Sonnet subagents get mechanical lanes. Unchanged: ethics gates, final copy, felt text (brief only), his trial observations override any logged call | `SERGIO_SAID_ALL_SESSIONS.md:2117-2121`; `06_SERGIO_CHECKLIST.md:1-26` |
| 2026-07-24 | **Co-creation norm.** Claude now drafts felt and survivor-adjacent lines (the Caleb thread was the trigger case), marked PLACEHOLDER-draft; he reviews, rewrites, co-creates; his edit wins. Revised in `CLAUDE.md` and six live docs; his own prior wording kept verbatim (`_s` keys) | `BUILD_LOG.md:252-253`; git `e76b455f` |
| 2026-07-26/27 | **Content generalised.** Checklist sweep: *"D37, You create the content and i'll review, no need to wait for me"*. Meta-finding: the July 10 checklist had been built for a blocking-approval model that no longer existed; roughly twenty of his 48 answers were "dunno how to reply"; his own comment, *"was this when you were waiting for every single word from me?"* The register was recommended for retirement | `SERGIO_SAID_ALL_SESSIONS.md:5900-5932`; `09_CHECKLIST_SWEEP_2026-07-26.md:8-18, 34`; `BUILD_LOG.md:275` |
| **2026-08-20** | **The writing is Claude's.** 20:10: *"Tell me what you need me to do, dont forget that you have creative freedom here."* 20:20: *"I dont get what fixcation you have with the Trans Reader, its not going to happen. We need to fix that now!"* / *"I am not going to write it is your work here"* / *"NO FORMER NAME GOSH"*. Claude writes and finishes all display text including felt beats; the trans reader pass is retired as a gate; the deadname is removed (the record now "misfiles" Maya "under the old file"). **What did not move:** he owns ethics judgement calls, dossier phrasing and every `_s` line | `SERGIO_SAID_ALL_SESSIONS.md:10066, 10071-10079`; `CLAUDE.md:131-150`; `08_STATUS_REGISTER.md:1690-1700`; git `4ca5201e` |

**The consequence was written down with the change.** The commit message of `4ca5201e` and `CLAUDE.md:139-142`:
*"text nobody else is going to write is text nobody else is going to catch, so ... no invented deadnames, no borrowed
testimony, no beat that speaks for people rather than about the system. Losing a reviewer is a reason for more care."*
`08_STATUS_REGISTER.md:1700-1705` adds that the third correction (no deadname) largely dissolved the first (the reader gate
existed to review a deadname). That is a clean example for the paper of an authority change being coupled to a rule that
raises, not lowers, the bar.

### 2.2 What the lead still controls (and the evidence that he uses it)

- **Ethics and dossier wording.** `CLAUDE.md:134-138`; every verification document says the same: "no dossier text,
  status or marker has been edited... every correction below is proposed for Sérgio's approval"
  (`SOURCE_VERIFICATION_RESULTS_2026-07-24.md:5-7`; `VERIFY_SOURCE_CLEARANCE_2026-09-26.md:3-5`: *"Under ETHICS_CONSTRAINTS
  #13/#14 the dossier's wording and its markers are yours to clear"*). His clearing sentences are recorded:
  *"Clear all of A and B, approve almost all of C"* (2026-09-27, applied S179, `VERIFY_SOURCE_CLEARANCE_2026-09-26.md:26`).
- **His own words, locked.** `_s` keys in the data are "his own verbatim wording, never overwritten"
  (`CLAUDE.md:138`; `data/dialog/s2_caleb.json:217, 222, 301`). The voice-pass tool counted **921 readable dialogue lines,
  4 of them his** (`docs/VOICE_PASS.md:26-45`, generated 2026-09-02 over the 14 dialogue files that existed; there are now
  32). That is under half of one per cent of the dialogue as of that date. It is the single most useful ratio for the
  "who wrote the words" question, and it should be re-run before submission (`node tools/voice-pass.mjs`, read-only) because
  it predates three eras' worth of new text (inferred).
- **Direction by playtest.** The loop that actually moves the work is: he plays, writes what is wrong, the model triages.
  `00_WHERE_THINGS_STAND.md:342-346` says it outright: "Almost nothing, deliberately. Look at it occasionally and say what is
  wrong. That is the input this project converts best — his walkthrough of 2026-08-21 found more than four automated sessions
  had."
- **Selection and supply.** He fetches the CC-licensed models (R4-20 "Models he fetched", `OPEN_ITEMS.md:201`; the monkey and
  tennis racket "are Sérgio's own picks", `ATTRIBUTIONS.md:50`), supplies the Deep Research runs, the music tracks (see 2.4)
  and the Whisper transcripts of his songs (`REVIEW_ROUND_3_2026-09-17.md`, R3-21).
- **Resource ceiling.** Scheduling was shaped by usage limits: *"you have 4% see what you can use for"*
  (`SERGIO_SAID_ALL_SESSIONS.md:12215-12220`, 2026-09-05); *"he is at 99% of the week"* (`BUILD_LOG.md:1859`, S176); the
  round-5 fleet was explicitly planned to "use it before Saturday" (`REVIEW_FLEET_PLAN_2026-10-01.md:3-5`). A genuine
  constraint on the practice that no authorship account should omit.

### 2.3 How the repo itself attributes authorship

- **Commit authorship.** All 568 commits carry the git author "Sérgio Roxo". Model credit is only in `Co-Authored-By`
  trailers: 538 of 568 commits carry one, 30 (2026-07-02 to 2026-09-22) carry none. Counts by trailer, from `git log`:

| model named in the trailer | commits | first - last date |
|---|---|---|
| Claude Fable 5 | 79 | 2026-06-12 - 2026-07-23 |
| Claude Opus 4.8 | 46 | 2026-07-02 - 2026-07-31 |
| Claude Sonnet 5 | 14 | 2026-07-03 - 2026-07-27 |
| Claude Opus 5 | 343 | 2026-07-24 - 2026-09-22 |
| Claude Fable 5.1 | 2 | 2026-09-02 (review round 1) |
| Claude Opus 5.5 | 54 | 2026-09-22 - 2026-10-03 |

  (Trailers record the committing session's model, not every model that contributed; Codex sessions committed under the
  same git identity and do not appear as a trailer name, inferred from `BUILD_LOG.md:227-228`.)
- **In-piece disclosure.** `data/strings/attributions.json:253`: *"MAKERS. YOUR UPDATE HAS FAILED was directed by the
  SurvivingSOGICE project (University of Bergen, Center for Digital Narrative) and written and built in collaboration with
  Claude (Anthropic): the code, the rooms, the sounds and most of the display text are the model's work under the director's
  brief, review and ethics rulings; every real-world claim rests on the project's own research and dossier sources..."*
  One-line version on the last screen, `data/strings/close_restart.json:70`: "Made at the University of Bergen
  (SurvivingSOGICE) with Claude." A "How this was made" dossier panel lists "the project's seven documents ... They are not
  sources about conversion practices. They are shown so that the making is not hidden" (`close_restart.json:77-81`;
  `src/witness/dossier.ts:51-58`). His request, 2026-07-24 15:05: *"a Full on 5th cluster just explaning the full on way this
  was a created with a AI-Human loop creation system"* (`SERGIO_SAID_ALL_SESSIONS.md:3485`); reaffirmed 2026-09-02. It was
  built as a credits paragraph plus one line and a map beat, not the full cluster (`OPEN_ITEMS.md:152`, L-04 "lost-partial").
- **Exhibition text.** v6 (for "After Virtual Reality", University of Bergen, 14-22 October 2026) states: "Every line of
  display text, including the felt, survivor-adjacent material, is written by Claude under Sergio's direction. His words:
  'I am not going to write it, is your work here.'" (`EXHIBITION_TEXT_v6_2026-09-14.md:38`). The same file fact-checks
  itself against the repo and declines to repeat an unverifiable memory ("no Sonnet 4.x anywhere in the written record",
  `:8`); the `_VERIFIED` file corrects a GPT draft that had invented "10 sourced dossier entries"
  (`EXHIBITION_TEXT_VERIFIED_2026-09-14.md:20-24`).

### 2.4 Authorship streams that are not "Claude wrote it"

1. **Generative music he directed.** Three tracks delivered by him from Suno/Treblo (Family Design Solutions, Discover The
   New You, Fold My Hands) were imported pristine and degraded to tape/VHS by `tools/degrade_audio.sh` (`BUILD_LOG.md:76`);
   later the 2003 boot jingle (from "Chase The Clouds") and Caleb's song are his, with LRC lyrics he synced
   (`OPEN_ITEMS.md` S203/S166 entries). Whether he wrote the lyrics is not stated in the repo (gap).
2. **Build-time TTS.** L's and Lamby's voices and PureMail are rendered offline (Supertonic, `tools/tts/`); his standing
   accessibility principle that long in-world text be readable aloud (2026-07-24, `OPEN_ITEMS.md` L-05). "The TTS is mine to
   run" (D40, `09_CHECKLIST_SWEEP_2026-07-26.md:33`).
3. **Third-party assets credited by choice.** Kenney, Quaternius, Poly Pizza, Freesound CC0 and CC-BY 3.0/4.0 models, all
   credited on the record, because *"we've settled the question of the CC-BY; we are going to have credits at the end"*
   (2026-08-15 20:18, `LOST_ASKS_AUDIT_2026-09-17.md:67`; `ATTRIBUTIONS.md`; `tools/check-licences.mjs` is in `npm test`).
4. **Other models consulted by him.** See 6.

---

## 3. The human lead overriding or reframing the AI's proposal

Fifteen moments, chronological. Each: what the model proposed, what he ruled (verbatim where the repo has it), why it
matters for authorship. The three he asked about by name are 3.6 (`?flat=1`), 3.11 ("2026 is not gentle") and 3.12 (the
ad); B26 / LambyOS is 3.15.

**3.1 · 2026-07-06 · Three rooms, not four.** Proposed: a four-area cluster with a rear spine as a fourth stop. His note:
*"it divided the space into 4 separate areas when it should be 3 rooms... better the low-poly models... be sure when we zoom
back in on the other rooms we can actually see the computer... the travelling motion smoother so it helps with the VR
headset."* Result: `seatYaws` reduced to three, the spine becomes a thing you turn and look at, never a stop.
*Matters:* an early instance of spatial and comfort judgement (VR smoothness) that the model had not produced from the
brief. `BUILD_LOG.md:215`.

**3.2 · 2026-07-25 · The Lamby game, rejected outright.** Proposed: a game on the "Witness side" using the provotype
grammar. Ruled: *"it doesn't need to be about the Witness side... Lamby should be a ridiculous game, that helps understand
that Update-Available is about the DIGITAL aspects of SOGICE... a fun way to explore game styles and genres."* The model
rewrote it as JUST CHANGE, whose organising idea is that the genre updates with each era. He later deprioritised it
(`BUILD_LOG.md:266`). *Matters:* he rejects the model's reading of its own piece; the successor idea (the genre updates
each era) later became the four-era games, whose rule he fixed in 3.11. `BUILD_LOG.md:263`.

**3.3 · 2026-07-25 · The debug-panel diagnosis.** The model diagnosed a missing-content finding as the human having used
`debugJump`. He pushed back: *"I did the debugJump, but this shouldn't be the issue right? That would defeat the purpose
of the debug."* He was right: the review panel listed about 26 of about 51 jump ids and omitted all seven Caleb beats; the
fault was the model's own earlier prompt fence. Outcome: check-spec C6 (panel completeness is machine-checked). The abstract
log lists this as "the human overturned the machine's design call" (`ABSTRACT_EVIDENCE_2026-07-30.md:45-46`).
`BUILD_LOG.md:261`. A second, worse instance on 2026-07-26: the panel's era buttons moved the furniture but not the
narrative, so a whole playthrough was reviewing a spine that had never been created (`BUILD_LOG.md:271`).

**3.4 · 2026-07-30 · Era 3, reconsidered twice.** After the model's studio spec, he asked for a full reconsideration:
*"I want you to fully reconsider the whole Era-3 experience instead of trying to make it happen... there was zero
connection between the devices."* Five questions, each exposing a hole the model admits ("The premise was never built";
the echo chamber "was ASSERTED not mechanised; I liked the sentence and built nothing under it"). His deeper note
reshaped the piece: *"this needs to be a growing logic of differentiations"*: each era escalates what the player can do
(1997 object, 2003 participant, 2016 operator, 2026 obsolete). Second pass, same day: keep the correction-list mechanic,
drop "bury" (it "was still retrofitting old canon rather than showing how SOGICE used digital platforms to target"),
make Malta the break, keep the influence human. *Matters:* the era's governing principle is his, stated as a critique.
`REINTERP_E3_RECONSIDERED_2026-07-30.md:1-25` (superseded-by `..._THE_CORRECTION_LIST_...`); `BUILD_LOG.md:283-284`.

**3.5 · 2026-08-02 · No joystick; being driven; and the thesis of the turn.** The model had a locomotion design. His
ruling: *"I dont want that locomotion, but aritificial one, of being driven to a new space and stuff"*
(`SERGIO_SAID_ALL_SESSIONS.md:6687`). Same day he supplied the argument under the piece's one bodily mechanic: *"from
behind us, we can see that this is not just happening to only one person... when we look at a computer we are looking only
one way... we never see what is behind us, we never see what's happening to others."* The model's own note on receiving it:
"This is not a new mechanic. It is the thesis the piece's existing mechanic has been missing"
(`REINTERP_THE_BUILDING_2026-08-02.md:3-12`). *Matters:* a formal constraint that had been a comfort rule gained its
argument from the human, which the model then worked through the table of existing elements.

**3.6 · 2026-08-08 · `?flat=1` is not a fallback.** `CLAUDE.md` (the model's own standing orders) called the flat canvas the
"universal fallback". His message: *"Well Claude.MD may say that, but that is a miss interpetation of the WebXR
application here. The Flat is not a fallback. The Browser version is the fall back in case the VR version is not possible.
That is different. The Fallback of the Flat was for the testing phase... pleae correct taht and all the things taht is has
been limiting the development actuall understanding of how this experience can exist."* (`SERGIO_SAID_ALL_SESSIONS.md:8754`).
He attributes broken props (the rainbow duck "i've never been able to see", the racket) to that misreading. Result:
`CLAUDE.md:38-72`, the three look-modes (XR, drag, gyro), `?flat=1` renamed a review tool "not an audience target", the
gyro mode built as S80. Commit title: "Flat is a review tool, not a fallback — and that misreading broke the props" (git
`fd4b2e25`). *Matters:* the instruction file the model reads each session had encoded a misreading for months; the human
corrected the model's constitution, and the repo shows the downstream effect on what was built.

**3.7 · 2026-08-20 · Four corrections in one message** (20:20): the reader gate ("its not going to happen"), the writing
("is your work here"), the former name ("NO FORMER NAME GOSH"), the teddy ("It was the monkey as the replacement for the
Teddy, this old news"). The model's design for Era 4's deadname beat had invented a former name; he struck it. The model
records that "Inventing a deadname was the wrong correction to a real problem" (git `4ca5201e`). He added: *"I think this
conversation is already too convoluted no? I feel like so many hings are just lost"*, which produced
`00_WHERE_THINGS_STAND.md` ("the one file to read first... If it ever disagrees with a conversation, believe this file").
*Matters:* the largest authority change in the project (2.1) arrives together with a content ruling that removed the main
ethical risk the reader gate guarded.

**3.8 · 2026-08-21 and 2026-09-17 · Two verdicts on the model's process.** After his first play: *"I feel like we didn't
do much to fix this project. I am genuinely saddened about this."* The model's diagnosis, in its own file: E1 and E2 had
session after session while E3 and E4 "were built and never played by a human until today. That feedback loop starved the
back half of the piece" (`WALKTHROUGH_2026-08-21.md:12-27`). After his third play: *"There are a lot of mistakes,
forgotten tasks, ignored requests, and I feel like you are ignoring the build log with all the stuff that should have been
done, and also that you are no longer marking all the things to be done. I am not happy about this."* Twenty-one items had
been first reported on 08-21 and were still open (`REVIEW_ROUND_3_2026-09-17.md:3-16`). Outcome: `OPEN_ITEMS.md` and its
law (1.3). `LOST_ASKS_AUDIT_2026-09-17.md` then cross-read all 672 of his logged messages against the register: about 35-40
distinct asks, 7 genuinely lost, 1 ruling contradicted by the code. *Matters:* his role as the project's memory and
quality conscience, and the mechanism the model built (a register, an audit) in response.

**3.9 · 2026-09-05 · "Daniel and Maya" and the flag.** Messages that day: *"The whole narrative of Daniel and Maya was not
working, so it needs to be cleared out"* (09:19); on the model's proposal of a pride-branded "ally" badge in the software's
voice: *"I really like this... we can add to that but having the flag with just a greyscale, so it simbolizes the erasure"*
(09:35); and *"it is better to have few but specifc elements than many and just not making sense. So we can diet the
objects."* Earlier that day (01:14) he had asked for the trans flag *"but it should not be affirming"*
(`SERGIO_SAID_ALL_SESSIONS.md:12222-12236`). Results: the migration of one file across two people retired (`OPEN_ITEMS.md`
R3-95, "Maya is not Daniel"); the greyscale flag; rooms left "held at an ember". *Matters:* a symbol designed by the human
inside the model's proposal; the human's "few and specific" rule over the model's prop counts.

**3.10 · 2026-09-24 and 2026-10-02 · The words for the dossier's three statuses.** Law: every card requires
`status: documentary | contested | speculative` (`CLAUDE.md:82`; `tools/check-spec.mjs:107`). 09-24: *"We need to settle
better on this labeling as [documentary] etc, that worked better for our organization but for public facing it is
confusing."* Public words became documented / disputed / imagined (`data/strings/status_words.json:2`). 10-02, B5:
*"'imagined' sounds like a manipulative act on my side, while we are talking about creative inference and speculative
approaches."* Public word now **inferred**; the data enum is unchanged (`status_words.json:13`;
`REVIEW_ROUND_5_2026-10-02.md:139`). *Matters:* the evidence vocabulary is negotiated, and the human's concern is the
reputational and moral reading of the word for the author, not for the reader; the enum stayed machine-stable while the
public word moved twice.

**3.11 · 2026-09-28 · "2026 is not gentle."** The model had framed 2026 as the era of gentle persuasion. His correction:
*"the reality of 2026 being gentle is something that I think we need to supersede, the reality is that the increase of
violence is worsening, especially now with the LGB Alliance and stuff attacking Trans people, so we need to be more direct
and use these spaces to educate on that, so softness might not be the best reality here."* (`PLAN_PHASE4_GAMES_2026-09-27.md:11-14`).
On the first game builds the same day: *"To make the gameboy accurate it can't have colors, since it is all in shade of
green... the TIDY doesn't make sense to claim directly about LGB Alliance, it is a game that the logic is supposed to teach
you about the Trans away etc. They all have a rhetoric of failure, that unables you to win, aka the queer side always wins."*
(`:23-26`). Downstream: the 2026 review frame (`REVIEW_FLEET_PLAN_2026-10-01.md:103`), the orb's missing "tell" found by
the ethics reviewer (`REVIEW5_ETHICS_2026-10-02.md:26-31`) and ruled B8 with "something eerie" (`REVIEW_ROUND_5_2026-10-02.md:142`),
and the Close's message research ("direct and educational", `RESEARCH_CLOSE_MESSAGE_2026-10-02.md:187`).
*Matters:* the clearest case of a political and ethical register being set by the human against the model's default
(softness), and then propagated by the model into review criteria. It is also the origin of the games' law (7.2).

**3.12 · 2026-10-01 · The ad: four alternatives rejected; 2016 stays dedicated.** The model made four alternatives to the
2003 infomercial "Discover the New You" (featuring Daniel, THE CUT, SKIP INTRO, no insert), rendered MP4s and sent them
(`BUILD_LOG.md:1902`, S207). His ruling: *"None of them make me like it... Let's keep the original."*, and the bar for any
future alternative: it must be "visually ridiculous and over-the-top" (`OPEN_ITEMS.md:310`, P7-36). All four were removed from
the code; the piece plays the original. Same day, the model proposed Daniel's cut as Renata's template in 2016; declined: 2016
stays dedicated to the lesbian story (`BUILD_LOG.md:1902`; `SKETCH_BRANCHES_AND_SIDE_DOORS_2026-10-01.md` section 5). Earlier
(2026-10-01, S206) he had set the standard from the other side: *"the video from the Advert was amazing... the video of Tape
need to also be as good"* (`BUILD_LOG.md:1901`). *Matters:* an aesthetic criterion (the satire works because it is
excessive and wholesome-hideous) that the model's conceptually clever versions did not meet; "a conceptual reframe is not a
new version" (the model's later memory note, local only).

**3.13 · 2026-10-02 · Round 5, item by item.** The B rulings show the pattern most compactly (`REVIEW_ROUND_5_2026-10-02.md:130-166`):
- B2: the model offered two wordings for "she is paid per correction"; he chose a third: *"honestly remove, not really needed here"*.
- B6: the model offered to generalise real organisations at the Close; he kept them: *"They are real, so they have a reason to be in the Close"*.
- B8: the model suggested one cold detail on the 2026 orb; he extended it into a character beat: *"add something eerie — 'L is waiting to help you', an 'L phrase of the day'"*.
- B12: the model flagged the claim "built with and for survivors" as unsupportable; he deleted it and gave the purpose: *"this is not for survivors, this is to educate about the topic, especially for those who might need other forms of content to interact with it, to understand the underlying stuff and to create awareness"*. (`REVIEW5_ETHICS_2026-10-02.md:75-80` is the model's version of the finding, ETHICS-10.)
- B16: the model asked whether ROOTCAUSE should burst "GENDER CONFUSION" as a "fake label"; he said keep (it is the programme's label and it collapses).
- B19, B20: he said he did not understand the item; the model explained it in the next turn (a record of the explain-then-decide loop).
- Plus a new idea of his, unprompted: a "phrases of the day" or encyclopaedia app of the words networks collect and the reasons they give, which became the Lexicon (P7-47, `OPEN_ITEMS.md:321`; 27 terms, `BUILD_LOG.md:1906-1907`).

**3.14 · 2026-10-02 · L-03: "this can only exist in writing."** The lost-asks audit found that a ruling he gave on 2026-07-03
(*"Yes the three on ERA-3, with a connection Lesbian/Transmasculine dillema"*, locked 2026-07-05) was contradicted by the
code: both sends were hard-gated off (`src/desktop/os.ts:1210` at audit time; `LOST_ASKS_AUDIT_2026-09-17.md:38-41, 61`).
On 2026-10-02 he re-ruled it: *"this can only exist in writing, not in the room jumping"*, so
the borderland lives in Noa's unresolved submission (`OPEN_ITEMS.md:316`, P7-42). *Matters:* a human instruction that
survived 90 days in a repository the model could not remember, found by an audit, and then revised by the human rather
than silently implemented. (Also the strongest argument for a persistent register, 1.3.)

**3.15 · 2026-10-02/03 · B26 and LambyOS ("many hands, one file").** Covered in `ARTICLE_EVIDENCE_LOG.md:102-123`; do not
duplicate. Two additions from this read. (i) The B26 review document (`REVIEW_B26_AND_COMMONS_2026-10-03.md:12-29, 90-98`)
is the model's *proposal* of the principle ("many hands, one file"); its tick boxes are still empty in the file, so the
claim that he endorsed it rests on the evidence log's account of his message, not on a ticked document (inferred; confirm
with him before the paper says "he endorsed"). (ii) The same document shows the review model counting twenty system names
across four eras (`:31-52`) and proposing a receipt line "hands: 13 · file: 1" (`:67-75`), the form in which a reframed
finding becomes a design.

---

## 4. When the AI's own checks caught what passed every test

The project's recurring pattern: checks proved that files exist and rooms fold; nothing proved that a player could reach
the content. The tools below were built to close that gap, usually after the human reported "I can't find X".

**4.1 · "Content that cannot be met" (named from his device passes, 2026-08-15).** All green while: two full Era-4
dossier cards were referenced only inside comments (ten citations unreachable); the Era-3 sends s3/s4 could not draw (a
black screen returned before the offer was drawn); both Era-1 provotypes drew inside a branch that closed 1.2 s after the
diary glitch; a dossier body overflowed a fixed 336 px window. Sources: `BUILD_LOG.md:69` (S87); `08_STATUS_REGISTER.md:1195-1208`
(S89's C9 note); `PROMPT_SCRIPT_VS_BUILD_AUDIT.md:54`; also `00_WHERE_THINGS_STAND.md:319` ("The geometry is correct is not
an answer to 'I can't see it'"). Durable guard: **C9** in `tools/check-spec.mjs:506` fails the build when a data file is
referenced only from a comment (ratchet baseline 0; regression-tested by reverting the import). `REVIEW5_ERA97_2026-10-02.md:22`
and `REVIEW5_EVIDENCE_2026-10-02.md:86` both still invoke the class by name, in October.

**4.2 · The walker (2026-08-26).** `BUILD_LOG.md:358-382`: "C6 proves every beat has a DEBUG BUTTON. Nothing here has ever
proved a beat is reachable WITHOUT one, and that gap cost this project an era with no exit, a conductor switched off for half
the piece, and an ending on an off-screen device." First run: 142 presses, entrance to Era 4; it found six surfaces that
publish no hit rects at all (`kit`, `irc`, `caleb`, `netvision`, `accountability`, `updateApp`, i.e. Era 1's spine and every
era transition). Its own faults were then found by review: it refused `pause_yes` and `close-restart` because the refusal
list matched the substrings "pause" and "restart" (it could never finish the piece); it quit a minute early inside the ball's
deliberate three and a half minutes of stillness; it pressed the first option of a branch 70 times; its screen hash ignored
the laptop canvas. These became the "traps" list: `00_WHERE_THINGS_STAND.md:300-333`, traps 0, 0b, 0c, 8, 9. (The laptop-hash
point is from a local memory note, `walk-the-piece-tool`, not from a committed doc.)
Review-round-1's spy run showed that Era 4's door worked and that the *walker* had opened the pause menu on itself
(`REVIEW_R1_2026-09-02.md:31-52`, A-1).

**4.3 · Measuring from the seat (2026-08-24).** `BUILD_LOG.md:350`: "THE WORST REACHABILITY FAULT IN THE PIECE... THE WHOLE
ENDING OF ERA 3 IS ON THE PHONE, AND THE PHONE WAS OFF-SCREEN. From the laptop seat its screen projected to (-230, 1214) on a
1280..." viewport. The method: `worldToScreen` on the entity at several pitches; x stayed negative at every pitch, so
looking down could never help. A sibling: the Era-4 headset sat 36.9 degrees off the seat bearing (`BUILD_LOG.md:936`).
Four sessions of coordinate checks had passed the duck as placed while he still could not see it (the cause was that it was still a flat-colour placeholder box) (`BUILD_LOG.md:21-40`, S89).

**4.4 · Measuring the mesh, not the render.** Fitting a screen plane to the laptop lid took four wrong passes off screenshots
(67, 70, 74, 90 degrees; twice the plane ended inside the mesh, "hittable, advancing the beat, invisible"); the GLB's named
materials and accessor min/max gave the exact rectangle and normal in one read (`00_WHERE_THINGS_STAND.md:326-329`, trap 8).

**4.5 · A claim that was false in the repo's own text, six times.** Commit `2c06bca` (2026-08-12): "The sends were never
latent, and I said they were six times"; `5b71132` (08-13): "Correct the tool output that told six sessions the sends were
latent". The S82 integrity audit (run in Codex) found the repeated claim wrong and the real fault elsewhere
(`S82_INTEGRITY_AUDIT_2026-08-12.md:14-24`). Related: `00_WHERE_THINGS_STAND.md:55-65`: the model's own status file said
"The ledger already wipes on idle"; there is no idle timer anywhere; "I read a comment and reported it as verified — in the
same file that lists 'a comment is not evidence' as trap #1."

**4.6 · Review round 5's own blind spots and the A25 crowd ring (2026-10-02/03).** Round 5's reviewers found three
stall or dead-end bugs the walker had walked straight over (A2 "2016 can stall", A4 "1997's Family Form can be lost for
good", A7 "ignoring Bea's link does nothing") because the walk "opens tiles 0-4 only, presses none of their job buttons"
(`REVIEW5_ERA16_2026-10-02.md:121-124`, ERA16-16; `REVIEW_ROUND_5_2026-10-02.md:51-57`). A25 asked the tools to be taught.
- 2016: `out/probe/jobs16.mjs` opens each of the seven other jobs by its own controls: comments (4 presses), family calls
  (8), the story cut (7), the podcast (5), the course (11), the group (1), the video tags (6); all complete, and the phone
  lights after the second job (`REVIEW_ROUND_5_2026-10-02.md:180`; `BUILD_LOG.md:1907`).
- 2026: `out/probe/crowd26.mjs` plays to the ball's second intrusion and measures from the seat. The "in the crowd" ring is
  36 degrees to the left (six arrow-key turns) at the bottom of the frame, and one real click steps her in. It **also
  found a broken promise nobody had listed**: the code's own note said the hint "says where", and it did not; and the only
  ring in view at the seat was the stage's, which answers nothing. Fixed: while the room waits for her, only the crowd's ring
  is offered, and the hint names it ("the ring on the floor, to your left") (`REVIEW_ROUND_5_2026-10-02.md:179`;
  `BUILD_LOG.md:1908`; `out/probe/crowd26-hers.png`, `crowd26-holding.png`, local only). Final walk 572 presses, spine done.
  Note the same day's honest account of the Commons: the B24 "warm it" ruling had been met by two colour swaps and a larger
  lamp, "I did not make it brighter, did not make it move, and did not think through what she does there"
  (`REVIEW_B26_AND_COMMONS_2026-10-03.md:102-111`), found by an accident.

**4.7 · Evidence settling what taste could not (D31, 2026-07-25).** He asked whether the GPAHE reports could decide the
"LAMBY NEVER LEAVES" dispersal beat he had left unstruck for 13 days. They did: the beat is documented history (rebranding,
decentralisation, NARTH to ATCSI), and the project's own knowledge base already carried it. Struck; staging changed from
"migrating" to "RENAMED"; survival by scattering, never omnipotence, because deplatforming had partly worked
(`BUILD_LOG.md:267-268`; `ABSTRACT_EVIDENCE_2026-07-30.md:47-48`).

**4.8 · The model refusing to fabricate, and the model refusing the human's passing request.**
- S59 declined to invent a boot jingle when no asset existed and proved the absence both ways
  (`ABSTRACT_EVIDENCE_2026-07-30.md:49-50`).
- R3-13 (2026-09-17): he wrote "IF THIS THEN THIS; local storage". The model agreed to the gate but pushed back on the
  storage: the ledger already is the if-this-then-this, wiped on exit, because no-storage "is one of the piece's hard
  invariants (the one promise none of the systems inside it could make)" (`REVIEW_ROUND_3_2026-09-17.md:42`). The only PUSH BACK
  in the 111 rows. *The model held the human's own earlier ethical invariant against his passing instruction.*
- B4: "an earlier draft's claim about the survey's websites was wrong and never shipped" (`BUILD_LOG.md:1906`); a Sonnet
  review of the testimony links says plainly where its fetcher was blocked and what it therefore did not read
  (`VERIFY_TESTIMONY_LINKS_2026-10-01.md:1-14`).
- The July 2026 verification "survived with six rewordings": nothing fabricated, but a jury "did more than it did"
  (Ferguson v. JONAH conflated three legal stages, `SOURCE_VERIFICATION_RESULTS_2026-07-24.md:8-30`).

**4.9 · The model's own recorded errors** (useful as honest limitations; each is in the repo in the model's voice):
the S43/S44 collision from a dispatch reasoning error ("disjoint file sets are necessary but not sufficient", two sessions
sharing one git index; `BUILD_LOG.md:257`); "A11" reported for a month as a scheduling gate on him when the build had no
WebXR entry point (`BUILD_LOG.md:279`); the fix S207 claimed for Lambient's lines that was not in the code (round 5, A3,
`REVIEW_ROUND_5_2026-10-02.md:20`); a screenshot debug button that could not be trusted (no `preserveDrawingBuffer`,
`ABSTRACT_EVIDENCE_2026-07-30.md:73-78`); the co-creation-norm-era wrong claim retained in place
(`S82_INTEGRITY_AUDIT_2026-08-12.md:51`); the status board frozen at Round 17 for nineteen days
(`03_COORDINATION.md:51-52`; `ARTICLE_EVIDENCE_LOG.md:45-55`).

**4.10 · Two readers with no shared context.** `00_WHERE_THINGS_STAND.md:335-340`: two independent audits of script-versus-build
(Fable, and Qwen 3.8-max, neither seeing the other's work); "Qwen corrected Fable on six points... Two readers with no
shared context caught what one confidently got wrong. Use two again." Round 5's eight Sonnet reviewers are the scaled version,
with an Opus verification pass before anything reached him (`REVIEW_FLEET_PLAN_2026-10-01.md:12-24`).

---

## 5. The ethics process as practised

### 5.1 The written laws

- `docs/ETHICS_CONSTRAINTS.md` (distilled from an authority document, `Pc_Simulation/ETHICS_AND_CARE.md`, which is **not in
  the repo**): 16 numbered points. Absolute: no stored or transmitted input (1), no real people or verbatim survivor
  testimony (2), no camera or file input (3), content warning with a 4 s arm delay and a working Leave (4), no analytics (5).
  Register: victim side grounded, satire only on the perpetrator's self-presentation and it must collapse (6); never
  satirise the gender-exploratory clinical debate, two captions unresolved (7); respite never a trap and never revealed as
  fake (8); distress never spectacle (9); the witness record computes only from what the player did (10); updates
  triggered by documented system failures, never by the player (11). Voice and sources: survivors keep primacy of voice
  (12), status enum required (13), `[VERIFY SOURCE]` until Sérgio verifies (14), Scene 2.6 ships disabled (15), user
  testing with survivors needs a protocol (16) (`ETHICS_CONSTRAINTS.md:7-45`).
- **The reader gates.** The original master plan holds a table of twelve human-reader gates, G1 to G12, each naming the
  reader and what it blocks (trans-masculine reader, detransition-informed reader, clinician-informed read, religious-trauma
  reader, institutional ethics for user testing, rights check): `REINTERP_MASTER_PLAN_v1_2026-07-02.md:357-374`. They were
  "BINDING and Sérgio-held" through July (`REINTERP_MASTER_PLAN_v2_2026-07-12.md:59`). On 2026-08-20 the trans-reader
  gate was retired by his ruling (2.1). G11 (the user-testing protocol with survivors) is not retired by anything I read; no
  record of its being run exists (gap, section 9).
- **Register vocabulary** in data: `operable | felt | respite`, plus tone `-2..+2` and tier `hero | set | fog`. Rules from
  `CLAUDE.md:85-120`: `felt` is bare (no assistant, no satire, no mechanics); `operable` may charm and must collapse;
  `respite` is genuine joy and "the system targets *around* it, never through it".

### 5.2 What is mechanically enforced

`npm test` = `check-invariants` + `check-rooms` + `check-spec` + `check-licences` (`package.json:11`).
- `tools/check-invariants.mjs:1-30`: fails if `src/` contains `fetch(`, `XMLHttpRequest`, `WebSocket`, `EventSource`,
  `sendBeacon`, `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, `getUserMedia` or
  `showOpenFilePicker`. Allowed only with a justified `invariant-allow` marker on non-runtime tooling.
- `tools/check-spec.mjs`, nine checks, header `:1-35`: C1 every source carries a status and confidence (`:165`; the
  header explains it exists because "a law that is documented as enforced and isn't is worse than an unwritten one: it buys
  confidence nobody paid for"); C2 no assistant offers a `felt` scene (`:181`); C3 register and tier vocabulary and the
  hero-object budget (`:188`); C4 palette discipline, as a ratchet (`:219`); C5 doc lifecycle (STATUS headers,
  supersession links, opt-in KILLS) (`:250`); C6 review-panel completeness (`:359`); C7 authoring-marker leak detector,
  ratchet (`:412`), written after a note-to-self ("[researcher note — Sérgio's voice, to write]", `slice.json`) shipped into
  the fiction and he caught it in play (`ABSTRACT_EVIDENCE_2026-07-30.md:38-41`; `REINTERP_PLAYTHROUGH_E2_2026-07-26.md:46`);
  C8 prompt-block lifecycle (`:484`); C9 reachability (`:506`).
- `tools/check-licences.mjs` (S177): found 170 unclaimed assets and 12 Freesound credits owed (`BUILD_LOG.md:1871`).
- What cannot be automated, stated in the repo: satire targets, register "feel", brand versus character distinctions are
  logged as human-only reads (`ARTICLE_EVIDENCE_LOG.md:76-79`); and "a checker can catch a dead SYMBOL, not a dead JOB"
  (`ARTICLE_EVIDENCE_LOG.md:53-54`).

### 5.3 Concrete practice, with examples

1. **Registers decide who may speak.** The AI-reviewer ethics pass of round 5 (`REVIEW5_ETHICS_2026-10-02.md`) finds, by the
   register law, that Lambient's lane was drawn over survivors' words (ETHICS-02, `:19-24`), that the phone says "Nothing
   here is filed." while the same screen files it (ETHICS-01, `:12-17`), that the 1997 diary shows a line saying "a journal
   entry is required" during the most private beat (ETHICS-04, `:33-38`), that a way-back line could point at the felt
   thread (ETHICS-09, `:68-73`). It also lists eight things "handled with care and must not be touched" (`:91-100`), including
   the deadname beat, the montage's logic, the ball (respite, files nothing, no L, no voice) and the Leave page.
2. **Deadname removed, not reviewed.** The record misfiles Maya "under the old file"; "textUnvoiced" variants say "a name you do
   not use"; the correction chip always works; the front door and menu warn about it (`REVIEW5_ETHICS_2026-10-02.md:93`).
   The content notice still described the old version and was rewritten (B11).
3. **Respite is protected by design and by review.** The ball (2026 ballroom) and the Commons never file to the ledger;
   round 5 lists "REACH and TIDY's rhetoric of failure", "Noa unresolved", "the 2016 group never satirised" among the things
   all eight reviewers said not to touch (`REVIEW_ROUND_5_2026-10-02.md:122-128`). The Commons review nonetheless found it
   "the darkest room in the stills" (B24) and the 2026-10-03 follow-up is open (`REVIEW_B26_AND_COMMONS_2026-10-03.md:102-159`).
4. **Detransition.** *"detrans are not the target, never, just the apparatus and the AI usage"* (2026-08-02 22:38,
   `LOST_ASKS_AUDIT_2026-09-17.md:66`); B9, "yes, no mocking": the recording card states the recording is the system's
   invention and the target is the system that harvests words. The ethics reviewer notes that no surface holds a second,
   unmanipulated caption, so the dossier's claim to "render both readings" is stronger than what is on screen (ETHICS-07,
   `REVIEW5_ETHICS_2026-10-02.md:54-59`; open).
5. **Dossier honesty as a working discipline.** Round 5's EVIDENCE lens found eight practice cards labelled "documentary"
   where the evidence did not reach (B1, `REVIEW_ROUND_5_2026-10-02.md:63-68`). His rulings: relabel them honestly and write
   "this part is ours" cards; remove "paid per correction"; add a *contested* card for "social contagion"; move Malta's
   fictional day to the documented vote day (Tuesday 6 December 2016); correct source 17 (Truth in Love TV was 1999, not
   1998; an unsupported "stopped making copies" removed) (`:130-166`; `BUILD_LOG.md:1905`). Three new "this part is ours"
   cards are in the build (the 1997 channel, 2003's purity streak and reader, Vera's job). The streak is declared speculative
   because the 2026-10-01 social-media research found no source for streaks (`BUILD_LOG.md:1903`).
6. **Sources verbatim, uncited marked.** Every sourced claim carries `[VERIFY SOURCE]` until he clears it (11 markers
   in the data at the 2026-09-24 count, `OPEN_ITEMS.md` R4-19). The public sees "(this source is still being verified)"
   (`data/strings/status_words.json:12-13`). Verification uses the same two-hands rhythm every time: a Deep Research run he
   makes, a model converts it to proposed corrections without touching the dossier, he ticks, the model applies word for
   word (`VERIFY_SOURCE_CLEARANCE_2026-09-26.md:3-30`; `SOURCE_VERIFICATION_RESULTS_2026-09-26.md:1-14`). The Love in Action
   iconography card (2026-10-02) rests on his own screenshot of a Wayback capture because the model's fetcher was refused,
   and says "by 2008", not "in 2003", because the date of the capture limits the claim (`VERIFY_AD_ICONOGRAPHY_2026-10-02.md:1-20`).
7. **Invented marks only.** Compass, HopeRestored, Pastor.AI, Sift, Restorify, GracePlatform, Lamby, Lambient, L, Continuity,
   GraceOS, Second Thoughts (all fictional; list in `REVIEW_B26_AND_COMMONS_2026-10-03.md:31-50`); real organisations appear
   only in dossier and provenance surfaces where the knowledge base documents them. The ethics reviewer's own check: "No
   slurs, no self-harm lines, no deadname... no real organisation or person appears in any player-facing room line"; two
   exceptions noted (an actual product name, "mIRC", ETHICS-11; Junie's "don't let it finish you" self-harm reading, ruled B10
   and rewritten to "finish the sentence").
8. **No storage of user input.** Enforced (5.2); the ledger is in memory and wiped on Leave and `beforeunload`
   (`00_WHERE_THINGS_STAND.md:55-65`). **Honest gap:** `CLAUDE.md` still says "wiped on exit/idle/refusal" but there is no idle
   timer in `src/`; on 2026-10-01 he ruled this "NOT A PRIORITY — 'people at the exhibition will do that'", and the
   screensaver, the idle state, wipes nothing (`OPEN_ITEMS.md:157, 313`, L-09, P7-39).
9. **Disclosure and content notice.** A content warning with a 4 s arm delay and a deadname warning at the front door
   (`REVIEW5_ETHICS_2026-10-02.md:100`), a Leave page designed as a safety disguise that hides three readings of hope (an
   acrostic H-O-P-E, a screensaver that for 3.5 s in every 30 gathers into "NOTHING IS / WRONG / WITH YOU")
   (`BUILD_LOG.md:1872`, S178; `out/leave/`, local only).
10. **User testing with survivors or queer readers: not done** (ETHICS #16 and G11 remain open flags;
    `REVIEW5_ETHICS_2026-10-02.md:78`). The deleted claim "built with and for survivors" (B12) is the repo's own
    recognition of that limit.
11. **A parallel research design, never run in the repo.** `RESEARCH_MODEL_ELICITATION_PROTOCOL_2026-08-05.md` proposes a
    two-strand study of other models: Strand A, an elicitation study that measures where models refuse ("Compare models. Do not
    engineer bypasses... If a frontier model refuses, that is the finding"); Strand B, a benign room-layout comparison with a
    six-model run kit and the warning that "a Claude arm is not a neutral competitor... Report it as the BASELINE"
    (`RESEARCH_STRAND_B_RUN_KIT_2026-08-06.md:1-25`). Whether Strand B was run is not recorded (gap).

---

## 6. The multi-model practice

| actor | what it did here | evidence |
|---|---|---|
| **Fable 5 / 5.1** | Designer, creative director and PM from 2026-07-02: wrote every build prompt, held the dispatch board, reconciled results; authored all design and spec docs after Round 15; asked Sérgio the decisions. Back as coordinator for review round 1 (2026-09-02). The board it kept sat frozen at Round 17 for nineteen days (R29 repair) | `03_COORDINATION.md:4-17, 51-52`; `REVIEW_R1_2026-09-02.md:1-8`; trailers |
| **Opus 4.8** | Hard code (architecture, spatial systems), from Fable's specs; then also directed in-session with him (2026-07-24 "Direction session") and wrote the 07-25 to 07-31 triage entries (late-July BUILD_LOG entries say only "Opus", so 4.8 and 5 cannot always be told apart) | `03_COORDINATION.md:13`; `BUILD_LOG.md:252-285` |
| **Opus 5** (2026-07-22/24 to 2026-09-22) | The longest run: 343 commits. Built the spine, Eras 2-4, the Close, the walker, review tools; wrote the round-3 reply and round-4 document | `03_COORDINATION.md:23`; trailers |
| **Opus 5.5** (from 2026-09-22, S174) | The Claude build lane after the exhibition stills; Games, Lexicon, Close message, review-round-5 verification and fixes (S175-S209f) | `03_COORDINATION.md:24`; `BUILD_LOG.md:1795` |
| **Sonnet 5** | The "volume lane": well-specified builds, data, verification chores, TTS pipeline (S46), review-panel completeness (S50), check-spec C7 (S58) | `03_COORDINATION.md:14`; `BUILD_LOG.md:259, 273` |
| **Sonnet 5.5** | The review fleets: eight lens-reviewers read-only on 2026-10-02 (about 2-3 M tokens planned, 150-400k per reviewer); research agents (testimony-link verification; a whole-book digest of Dame-Griff's *The Two Revolutions*, about 550k tokens) | `REVIEW_FLEET_PLAN_2026-10-01.md:12-24`; `BUILD_LOG.md:1903`; `VERIFY_TESTIMONY_LINKS_2026-10-01.md:1`; `RESEARCH_DAME_GRIFF_TWO_REVOLUTIONS_2026-10-01.md` |
| **Codex 5.5, then Sol 6 / Luna 6** | Prototyper and parallel builder with explicit file fences. 2026-07-08: S19-S21 built the cork-board opening and the diary-glitch ending, but "Codex's own environment could not drive a real browser... every session log entry ends 'manual review needed'"; Fable then verified live (`BUILD_LOG.md:227-228`). 2026-07-30: S65 WebXR entry scaffolding (`:280`). 2026-08-09/12: S82 integrity pass "shaped for the lane Codex is actually good in" (`:327`; git `0dc48c0`) and S83 the iPad horizon diagnostic (`:331`). 2026-09-22: models change to Sol 6 (visual pass) and Luna 6 (playtest), both `xhigh`, two briefs; their findings were triaged into P7-01...27 (S203) | `CODEX_BRIEF_*.md`; `03_COORDINATION.md:25`; `OPEN_ITEMS.md:271, 294-297` |
| **ChatGPT Deep Research** | Historian and sourcer, "creative and documentary content questions only", one focused question per prompt (Round 15 rule); nine prompt documents; the 24 July verification run, the 26 September run on 27 claims, the social-media layer (R4-42, read S208), the Lexicon sources | `03_COORDINATION.md:16`; `SOURCE_VERIFICATION_RESULTS_*.md`; `OPEN_ITEMS.md:315` |
| **ChatGPT image/concept art** | Close-constellation concept renders, 2026-07-24, with critique on both sides (`ARTICLE_EVIDENCE_LOG.md:57-68`); a GPT draft of the exhibition text was fact-checked and corrected (`EXHIBITION_TEXT_VERIFIED_2026-09-14.md`) | as cited |
| **Qwen 3.8-max** | One of two independent audits of script versus build, 2026-08-21 | `00_WHERE_THINGS_STAND.md:3-5, 335-340`; `SCRIPT_VS_BUILD_2026-08-21.md` |
| **Gemini** | A technical brief for iOS magic-window WebXR that he shared; assessed, accepted in principle, rejected on one point (Three.js/A-Frame: "PlayCanvas, decided and marked do not re-litigate"), and two blockers it missed were found in the code | `REINTERP_MODE3_ASSESSMENT_2026-08-06.md:1-30`; `BUILD_LOG.md:315` |
| **Suno / Treblo; Supertonic TTS; ffmpeg** | Generative songs he commissioned; offline TTS; tape and VHS degradation. Production-only; none runs in the shipped piece | `BUILD_LOG.md:76, 259`; `tools/degrade_audio.sh`; `tools/tts/` |
| **Sérgio** | Direction, writing of his `_s` lines, playtests, ethics judgement, dossier wording, source supply, final say (section 3) | throughout |

**How the model fleet is coordinated.** There was no automatic model-to-model calling in July (`03_COORDINATION.md:30-35`);
from late July sessions ran in-session with him and a session could launch its own sub-agents (round 5 is the fullest
example). Continuity lives in files: the docs lifecycle (222 live docs, each with a machine-checked STATUS), `BUILD_LOG.md`,
`OPEN_ITEMS.md`, dated `STATE_*` handoff notes and `00_WHERE_THINGS_STAND.md`. The `ARTICLE_EVIDENCE_LOG.md:93-100` point
stands: three Claude generations (4.8, 5, 5.5) crossed with no restart. A caution the repo records: a stale instruction file can
be believed by a new session (`BUILD_QUEUE_LIVE.md:1121`: the co-creation norm was retired "and a session read the older file
and believed it").

**Build-lane process rules learned and written down** (useful for a "practice" section): the session template's fences and
STOP-and-log rule (`02_SONNET_SESSION_TEMPLATE.md:39`); explicit git pathspecs after the S43/S44 collision
(`BUILD_LOG.md:257`); never edit `src/` or `data/` while a walk runs (an S107 audit and an S206 walk were both lost to
it: `BUILD_LOG.md:1901`; `walk-the-piece-tool` memory, local only).

---

## 7. The piece's theses, as the repo states them

1. **Many hands, one file.** `REVIEW_B26_AND_COMMONS_2026-10-03.md:15-29`: what persists across the four updates is "the
   file and the demand", not one system; the vendors, programmes and helpers are many, and they rebrand, merge, refer and
   close. The three update notices are the only sentences linking eras ("Your file has been migrated to partner care"; "...to
   a brighter place"; "GracePlatform is joining Continuity... Your file comes with you", `:16-19`). His own gloss on the lamb is
   in `ARTICLE_EVIDENCE_LOG.md:106-121`. Two kinds of multiple naming, "many systems" (keep) and "one object under drifting
   names" (fix) (`:24-29`).
2. **The rhetoric of failure in the games.** *"They all have a rhetoric of failure, that unables you to win, aka the queer side
   always wins"* (his, 2026-09-28; `PLAN_PHASE4_GAMES_2026-09-27.md:22-26`). The four era games are the apparatus gamifying
   one thing, "fitting a life into a shape" (`:38-43`): FIT IN (1997, four greens only, pieces land NOT A FIT and stay,
   GAME OVER — THEY STAYED); REACH (2003, SOULS REACHED 0 — NONE CHANGED); FloppySheep (2016, never judges); TIDY (2026, her
   things climb back out of the box, THIS ROOM CAN'T BE TIDIED). "Its goal is impossible, and the queer thing persists."
   Period-true hardware is part of the claim (the Game Boy model uses four greens). The same principle in the research
   materials: the glitch doctrine, "even played as the enforcer, the person's queerness always survives"
   (`SERGIO_SAID_ALL_SESSIONS.md:20-28`, the 2026-07-02 prompt; compare "REACH and TIDY's rhetoric of failure" in the round-5
   "do not touch" list).
3. **Respite is never a trap.** `ETHICS_CONSTRAINTS.md:23-25`; `CLAUDE.md:85-100`; at least one uncorrupted space per run;
   the ball and the Commons file nothing, have no assistant, and are "the one room the system has no category for"
   (`out/review5/stills/STILLS.md`, e4-04; `REVIEW5_ETHICS_2026-10-02.md:97`). The Commons review holds the piece to its own
   law and finds the build short of it (`REVIEW_B26_AND_COMMONS_2026-10-03.md:102-159`).
4. **The update is the plot; updates are triggered by documented system failures, never by the player.** `CLAUDE.md:121-125`
   (notification, EULA, install with changelog-as-thesis, restart); `ETHICS_CONSTRAINTS.md:31-32`;
   `00_WHERE_THINGS_STAND.md:7-9` ("The update is the plot"). The renaming rhymes with the GPAHE-documented survival of the
   movement by renaming (NARTH to ATCSI), staged as survival by scattering (`BUILD_LOG.md:267-268`). Era-transition design
   notes: `SCRIPT_UPDATE_v0.5.md`.
5. **The turn is the one bodily ask.** "No locomotion ever" (`CLAUDE.md:118`, revised by R28 to player-initiated jumps
   between fixed seats, `:9-20`). The argument beneath it, given by him on 2026-08-02 (3.5): the screen fixes your facing;
   what is behind you is other people (`REINTERP_THE_BUILDING_2026-08-02.md:3-24`). "The witness side is the sharp side"
   (`CLAUDE.md:109`). The turn is also what the Era-4 respite is built on (`BUILD_LOG.md:42-68`, the ball held on the turned
   facing for three minutes).
6. **A growing logic of differentiations.** Each era escalates what the player can do: object (1997), participant (2003),
   operator (2016), obsolete (2026) (his, 2026-07-30; `REINTERP_E3_RECONSIDERED_2026-07-30.md`; `BUILD_LOG.md:283`).
7. **"Fake intelligence" only.** The shipped piece has no runtime AI and no network; all AI involvement is in production
   (`CLAUDE.md:70-73`; `ARTICLE_EVIDENCE_LOG.md:87-91`, which asks the abstract to say this precisely). In the piece's own
   fiction, AI is one dated incident in a longer history, not the mechanism (B25: add one non-AI route in 2026,
   `REVIEW_ROUND_5_2026-10-02.md:104`).
8. **Evidence is graded on screen.** Documented, disputed, inferred, with "this part is ours" cards for what the piece
   invents, and a "How this was made" panel that includes the production documents among the sources so "the making is not
   hidden" (`close_restart.json:77-81`).
9. **Frame voice never plays.** No quest popups, scores or achievements in the piece's own voice; the menu, the Leave page and
   the credits are functional and undecorated (`CLAUDE.md:28-35, 94`).
10. **Each device's helper, and its cost.** Helpy/Aski/Sol/Ami (old naming) became Lamby (2003), Lambient (2016), L (2026),
    absent in 1997 (R28 amendment 2, `CLAUDE.md:15-20`). Dismissal always works and is logged, with one declared exception:
    Era 4's L cannot be dismissed, "by design" (a dead button is "literally the thesis"), which the ethics reviewer asked him
    to record in `CLAUDE.md` (`REVIEW5_ETHICS_2026-10-02.md:40-45`, ETHICS-05; not yet recorded as far as I read).

---

## 8. Figures available

**Committed (usable from any machine; `docs/`).** `docs/REINTERP_FIGURES_FOR_THE_ARTICLE.md` names the first four; it is
stale (it says Era 4 has nothing to photograph).

| file | one line |
|---|---|
| `docs/reinterp/S69_noa_video_ungraded_vs_graded.png` | the apparatus grading a person as ill before she has said anything, in one A/B; "the strongest single figure in the repo" (`REINTERP_FIGURES_FOR_THE_ARTICLE.md:19`). Note: Era 3 was later rebuilt (the correction list), so check it is still representative |
| `docs/reinterp/S70_comment_thread_routing_propagation_floppysheep.png` | four panels: template picker, routed reply "follow-up assigned", propagation of the deployed sentence into a stranger's mouth, FloppySheep. Same caveat |
| `docs/reinterp/S71_room_audit_before_after.png` | room-audit before/after: the measurement method (section 4.4) as an image |
| `docs/reinterp/S76_update_place_turn.png`, `S77_L_captions_deadname.png`, `S78_curation_paid_placement.png`, `S78_memory_original.png`, `S78_memory_enhanced.png`, `S79_*` (4), `S80_mode3_zoom_legibility.png` | Era-4 development plates (August); `S77` pre-dates the deadname removal, so do not use it as a figure of the final beat |
| `docs/reinterp/plates/E4_2026-09-07/` (14 plates) | Era 4 as built on 2026-09-07: captions, the hoodie that cannot be categorised, the file, memory enhanced versus hers, the wall, the offer, curation, the careful pause, the ball in the room, the four panels, Maya's seat |
| `docs/reinterp/plates/E4_TABS_2026-09-09/` (9) | the six browser tabs of 2026 (search, care, chat, photos, record, extra) and the restoring sequence |
| `docs/reinterp/S92_shots/close_two_tiers.png` | the Close's two visual tiers (August; the Close was later rebuilt as a journey) |
| `docs/MOODBOARD_ERA1_ROOM.png` | Era-1 mood reference (2026-06-12) |

**Local only (`out/`, git-ignored, regenerable with `node tools/stills.mjs`, `tools/tour*.mjs`, `tools/shots.mjs`).**

| path | one line |
|---|---|
| `out/review5/stills/` (45 PNG + `STILLS.md/.json`, 2560x1440, 2026-10-02) | the whole piece from the same positions in every era (entrance, from above, the seat, the screen close, the turn), the Commons, the sweep, the constellation, the panels, Restart as you are, the receipt, the three dossiers. **The best single set for the paper**; `STILLS.md` is the caption table. Note it has no 2016 board, jobs or phone (`REVIEW5_ERA16_2026-10-02.md:6`) |
| `out/stills/` | the same set from the previous run (2026-09-29) |
| `out/tour-e1/`, `out/tour-e2/`, `out/tour-e3/` (dated 22 Sep, its log lists failed waits), `out/tour-e4/` (62) | step-by-step frames per era for sequence figures |
| `out/probe/commons/sheet.png` (+`sheet2.png`, `behind.png`, `crowd-ring.png`, `gap.png`, `lamp-raised.png`) | the Commons photographed from the seat on 2026-10-03; the evidence for section 4.6 and `REVIEW_B26_AND_COMMONS_2026-10-03.md:113-122`. The `gap.png`/`lamp-raised.png` frames appear to be from another session's work on the Commons proposals now in progress (inferred; check before use) |
| `out/probe/crowd26-hers.png`, `crowd26-holding.png` | A25 2026: the crowd ring from the seat |
| `out/figures/fig1_entrance_overhead.jpg`, `fig2_seat_pov_e1_desktop.jpg`, `fig3_close_constellation.jpg` | the three abstract figures of 2026-07-30. **fig3 has mirrored labels** (bug later fixed in S64); do not reuse fig3 |
| `out/phase7/sheets/` (16 contact sheets) and `out/phase7/raw/` | every surface built since round 4, with debug overlays visible (the GYRO box, the era badge); not clean figures |
| `out/calendar/*.png` | the pixel-art calendar pages per era and the four games' screens (`fitin.png`, `reach.png`, `tidy.png`, `yes.png`, `referral.png`) |
| `out/Games/` (6), `out/leave/` (5) | game stills; the Leave page and its starfield gathering |
| `out/show/` (7) | the map and the helper in 1997 and 2016, the record chip, the Restart card |
| `out/style/` (8) | before/after of the lighting per era (posters, 2003, 2016, 2026), the "give the project a style" proposal |
| `out/flowmap/index.html` | the flow map (era 2) published as an artifact on request (`BUILD_LOG.md:1901`) |
| `out/new_you_*.mp4`, `out/screensavers/*.mp4` | the rendered infomercial (original, participant, featuring-Daniel versions) and the four screensavers; `new_you_FEATURING_DANIEL.mp4` is the rejected variant (3.12) and is an authorship figure in itself |
| `docs/reinterp/review-2026-09-22/img/` (158 frames, git-ignored) | the review-round-4 frames |
| `out/quest-e4.md`, `docs/reinterp/QUEST_E4_2026-09-16.md` | draw-call and comfort table per Era-4 beat (19,703 frames) |

**Tables and charts the data supports** (none yet drawn): press count and "presses that changed nothing" per walk (1.4);
review findings per round (1.3); commits per day with model-trailer bands (2.3); documents by lifecycle status
(`tools/doc-status-report.mjs`); the dossier status mix; minutes per era.

---

## 9. Gaps: what the article needs that the repo does not hold

1. **No player data, by design.** The piece never stores input, the invariants are CI-enforced, and there is no analytics
   surface (ETHICS #1, #5). The article therefore cannot report completion rates, time spent, or what players did. The only
   behavioural data are the walker's synthetic presses and Sérgio's own plays. If the paper wants audience response, it must
   come from outside the artefact (an exhibition protocol with consent: the 14-22 October 2026 showing, G11 and ETHICS #16).
2. **No queer, trans or survivor reader has reviewed the work.** The trans reader gate was retired on 2026-08-20 and G11 (the
   user-testing protocol) has no record of being run. The authorship story depends on this: the ethics review since then has
   been the lead's judgement plus model reviewers (round 5 ETHICS lens, `REVIEW5_ETHICS_2026-10-02.md`). The paper should state
   the limit plainly; the repo's own deleted line "built with and for survivors" (B12) is the evidence that the project saw it.
3. **No raw transcripts in the repo.** The repo holds the agents' self-reports and, for him, `SERGIO_SAID_ALL_SESSIONS.md`
   (672 entries, 564 unique after removing duplicate sessions, 46 session ids, 2026-07-02 to 2026-09-16; about 459 unique entries
   are under 400 words and total about 31,000 words, the rest are pasted prompts; status history-only). It stops on 2026-09-16,
   so nothing of his after that date is in a log except where docs quote it. Raw transcripts exist locally (47 files, about
   1.15 GB, section 1.2) and were not read. Any use needs consent review, because they contain his working conversation.
4. **No headset or phone testing recorded.** `HEADSET_NOTE_2026-09-16.md:2-6` says nothing has been in a headset; the only
   device session on record is his iPad pass of 2026-08-12 (horizon rolled about 90 degrees in landscape;
   `REINTERP_DEVICE_FINDINGS_2026-08-12.md`; S83 was written for Codex to diagnose it, `BUILD_LOG.md:331`); `CLAUDE.md:48-52` says the gyro mode is "verified by simulation in
   headless Chrome only; never run on a phone". The Quest budget numbers (1.4) are desktop measurements. Do not write
   "tested in VR".
5. **No record of the abstract's fate.** The abstract was due 31 July 2026 (`ARTICLE_EVIDENCE_LOG.md:3-8, 125-132`); the repo
   does not say it was submitted or accepted. The evidence log says the abstract "is his to write".
6. **Strand A and Strand B (other models' refusal and layout comparison) are designed, not reported** (5.3.11). A claim
   about other models' behaviour has no data in the repo.
7. **`ETHICS_AND_CARE.md`, the authority behind `ETHICS_CONSTRAINTS.md`, and the Deep Research raw outputs live in
   `~/Pc_Simulation/`** (outside the repo): `SOURCE_VERIFICATION_RESULTS_*.md:3-4`, `OPEN_ITEMS.md:271, 320`. Citing the
   repo's conversion documents is possible; citing the primary runs needs those files.
8. **The 1997 "half the piece" premise and the 2016 one-minute main path** (B28, ERA16-06) are findings the paper should
   not repeat as design intent: they are the model reviewers' measurements of the walker's path, "errs low".
9. **Open items he owes** that bear on the article: B26's ticks (3.15), the Commons proposals L1-I3 (`REVIEW_B26_AND_COMMONS_2026-10-03.md`
   section 2), the festival-versus-full cut ("both versions will be presented, this is a research aspect for the article",
   2026-07-02/03, L-02, now ruled "later, after people review", `OPEN_ITEMS.md:150, 314`), the makers cluster (L-04),
   recording Era 4's L exception in `CLAUDE.md` (ETHICS-05). The Close's receipt wording and the exhibition text's "four names
   for the same demand" line are his (`REVIEW_B26_AND_COMMONS_2026-10-03.md:76-79`).
10. **Stale surfaces in the docs that a citing author could trip on:** `REINTERP_FIGURES_FOR_THE_ARTICLE.md` (says Era 4 is
    empty); `03_COORDINATION.md` role table still lists "Opus 4.8 / Codex 5.5" (kept as written, with the model-history table
    above it); `ABSTRACT_EVIDENCE_2026-07-30.md` counts; `EXHIBITION_TEXT_v6` ("past 460 commits") and its phrase that Maya's
    "old name survives every migration", which should be re-read against the post-2026-08-20 rule that no former name appears
    (inferred risk; the beat now misfiles, it does not name).

---

## 10. The five most citable findings (compiler's ranking)

1. **The authority change came with a duty attached.** 2026-08-20, "I am not going to write it, is your work here", recorded
   in the same commit as "text nobody else is going to write is text nobody else is going to catch... Losing a reviewer is a
   reason for more care" (`CLAUDE.md:131-150`; git `4ca5201e`); with the numbers that make it checkable: 4 of 921 dialogue
   lines his, as of 2026-09-02 (`docs/VOICE_PASS.md:26-45`).
2. **The lead's corrections reached the model's own constitution.** `?flat=1` (3.6) and "2026 is not gentle" (3.11) each
   changed the instruction file or review criteria the model reads at every session start; the second then propagated into
   an ethics reviewer's finding (the orb) that he ruled on (B8).
3. **The dominant bug class is "authored content no player can reach", and every tool built against it was found, in turn,
   to measure its own policy.** Walker (142 to 572 presses over 38 days), C9, the seat measurements, round-5 A25; the 2026-10-03
   crowd-ring probe found a broken promise that was not on any list (4.1-4.6).
4. **The ethics regime is half mechanical and half human, and the human half was thinned on purpose.** Nine automated checks
   plus an in-memory-only invariant (5.2) versus twelve reader gates (5.1) of which the trans-reader gate was retired by his
   ruling, and no survivor review exists (9.2). The honest version is the paper's strongest ethical contribution.
5. **The vocabulary of evidence is negotiated with the author's reputation in mind.** `speculative` stayed in the data;
   the public word moved from "speculative" to "imagined" to "inferred" on his objection that "imagined" read as
   manipulation by the author (3.10); the dossier now has "this part is ours" cards for what the piece invents. The same file
   system records a separate verification discipline: Deep Research run, model converts to proposals, human ticks, model applies
   word for word (5.3.6).
