STATUS: draft

# The piece through time: a plan for the before and after (T63) — 25 Nov 2026

*His words, 10 Nov: "later we will do a profound before and after through the time". 25 Nov, to the offer of a plan:
"that would be great". Drafted by the orchestrator (S357gh). A draft: it waits on his three answers (§7). Nothing is
photographed or built before his yes.*

## 1. What it is for

The article argues that the piece was made in conversation between him and the models, and that every earlier version
is a research state. A before and after through time makes that visible: **the same view, at the same size, on ten
dates.** Each picture gets one line saying what changed and whose words moved it.

## 2. The picture: one grid, read two ways

- **Down (one era through time):** for example 2016 on ten dates. This is the strongest reading, because each era
  changed for its own reasons.
- **Across (the whole piece on one date):** the entrance, 1997, 2003, 2016, 2026 and the Close, side by side.
- **An empty cell is data.** If an era did not exist yet on a date, the cell says so ("not built yet").

## 3. The ten dates (each is the last commit of that day)

| # | date | commit | why this date |
|---|---|---|---|
| 1 | 13 Jun | e66a219c | the first build's second day: one era, the BIOS, mIRC, the flip, the first dossier card |
| 2 | 10 Jul | aa1eacd1 | the restructure (R28) begins: three rooms that age, the seat, the turn |
| 3 | 31 Jul | fe1169a8 | 2016's correction list; the abstract's month |
| 4 | 10 Aug | 86cf3d25 | the three ways to look (headset, computer, phone) |
| 5 | 2 Sep | 1242f153 | his first full sit-through (review round 1) |
| 6 | 22 Sep | 3f465d66 | the whole piece photographed for review round 4 |
| 7 | 15 Oct | f4dd4dbb | the opening: Lamby back as the guide, one guided visit |
| 8 | 31 Oct | 05843946 | the day of the 26 article figures; the era websites came the next day |
| 9 | 17 Nov | 3e3457b6 | the full cut frozen (tag `research/full-cut-2026-11-17`); the back wall gone |
| 10 | 24 Nov | b9387e5e | now: job 35 live (2016's second half, the flight, the Close) |

**Before the repository (7 Jun – 5 Jul):** the early versions were chats, not builds
(`RESEARCH_NOTE_EARLY_VERSIONS_2026-11-18.md`). They become a row of words only, unless pictures from then are found.

### 3b. January to June, and what the sweep changed (26 Nov)

The sweep (`T63_SWEEP_JANUARY_TO_NOW_2026-11-26.md`) found no picture of the piece before 7 June. So January to June
becomes **a strip before the grid**, one cell per month: words for January and February, the sister games for March to
May (if he says yes, question D), and the piece's own first pictures for 1–12 June (the 7 Jun concept, the 10 Jun ArenaAI
build, the 12 Jun moodboard). Two changes to §5: **the pilot starts with the 13 Jun build kept in the backup**
(`~/Documents/YUHF-research-archive/project-backup-2026-06-13/`, no rebuild needed), and **10 July needs a working old
build most**, because no picture of it exists.

## 4. The views (the same for every cell)

1. **From the seat:** what a visitor sees, monitor and all.
2. **The room, wide:** the camera pulled back, which the piece never gives you.
3. **The era's main screen, flat:** the canvas itself.

All on the computer at 2560 × 1440, with `tools/stills.mjs`. That gives 10 dates × 6 places × 3 views = up to 180 pictures,
fewer where an era did not exist yet.

**The headset is not re-shot.** Old builds cannot be put back in his Quest as they were. Instead his own headset frames
sit beside the grid, marked "in the headset, that day":
- **8 Nov:** 870 frames, 641 MB, still on disk. They were held for this plan (§7, question C).
- **20 Nov:** the 10 frames kept, and the 94 contact sheets.

## 5. How it is made (one builder job, no change to the piece)

1. **A pilot first, on two dates** (13 Jun and 10 Aug). Each date gets its own worktree, `npm ci`, a build, and its own
   port. Does it open? Can it be photographed?
   - `stills.mjs` needs probes that only exist since 22 Sep (S173). Older builds will need a simpler driver: the seat
     pose read from that build's own code.
   - If the pilot shows a date cannot run, that date uses **the pictures of the time** instead: the 22 Sep stills, the
     31 Oct figures, `research/article-images-*`. These are marked "photographed then", not "now".
2. **Then the other eight dates**, the same way.
3. **The line for each row**, from BUILD_LOG, `DECISION_LOG_AND_COUNTS_2026-11-20.md` and
   `CO_CREATION_ACCOUNT_2026-11-20.md`: what changed, and whose words moved it, with the date and the quote.
4. **Out:**
   - the full set in `research/article-images-<date>/through-time/`;
   - the grid, and one strip per era;
   - a photo page to look through;
   - a new section in the article companion and a row in ARTICLE_MATERIALS.
   - **OneDrive gets only the grid and the six strips** (his rule of 12 Nov: only the comparisons).

**Size:** one builder job, about two sessions. Images stay on the Mac (not in git); docs are committed.

## 6. What it must not claim

- An old build photographed today runs on today's browser and computer. It shows how that code draws now, not exactly
  what he saw then. The "photographed then" pictures are the check.
- The computer view is not the headset view. Every caption says which one it is.
- A cell shows a state, not a judgment. "Better" or "worse" belongs in the text, with his words.

## 7. His three answers

- **A. The main reading:** one era through time (down), or the whole piece on each date (across)?
  **My pick: down,** with across as the second page.
- **B. The ten dates:** keep them, or add or remove one? (For example, 1 Nov, the first era websites.)
- **C. The 8 Nov headset frames (641 MB):** choose about 20 for the article and let the rest go, or keep all of them?
  **My pick: choose 20,** after the grid is made, so they are chosen against it.

### His answers (26 Nov)

- **A:** "Both option would be best so I can later compare" → both readings are made in full: one era through time
  (down) **and** the whole piece on each date (across), from the same pictures.
- **B:** "The dates look fine, and also we need to include the dates since the start of the project in January. Do like
  a deep sweep on trying to find more data." → the ten dates stay; January to June is added before them (§3b, after
  the sweep). The sweep was started the same day (S357gk): pictures and prototypes January–June, chats and documents
  January–June, and every picture of the piece already taken since June, by day.
- **C:** "Yes, We can pick after the grid I guess" → the 8 Nov headset frames stay whole until the grid exists; about
  20 are chosen then, against it.

### The sweep's four questions (26 Nov; in `T63_SWEEP_JANUARY_TO_NOW_2026-11-26.md` §7)

- **D.** The sister games for March–May in the strip, marked "sister work"? **My pick: yes.**
- **E.** Extra dates? **My pick: add 7 Sep and 1 Nov.**
- **F.** His Downloads folder: the camera button's `uhf_reinterp_*.png` may fill the July gap (his action).
- **G.** The 7 June concept image in the article as it is, captioned? **My pick: yes.**

**His answer to D–G (26 Nov):** "On your picks. You can build the grids, but also have the files without the grid in case
I wish to do a diffrent design." → D yes, E add 7 Sep and 1 Nov (twelve dates), G as is. **The job delivers the loose
files too**: every picture named `<date>_<era>_<view>.png` in one folder, beside the grids, so he can lay them out himself.
F: his Downloads copy (`~/Pc_Simulation/From Downloads/`) fills part of June and July (sweep §8).

