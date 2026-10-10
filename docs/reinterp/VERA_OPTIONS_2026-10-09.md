STATUS: draft

# Vera's options — three to start, then updates (plan, 2026-10-09)

*W1-E1 ("far too much reading in 2016"), W1-E2 ("reduce Vera's options to about three; the player can unlock the rest —
'update to new functionalities'"), W1-E5 ("the link-clicking cadence of the messages is too much"). A plan only: no code
and no data changed. Read at `d540be4` (branch `reinterp`, after the first text cut was merged): src/room/graceQueueLite.ts,
src/desktop/apps/phoneE3.ts, src/room/era3Devices.ts, data/dialog/s3_*.json, data/strings/map.json.*

**Words are counted from the data files with `_`-keys left out. For a job, the file total is an upper bound on what is
on screen. Presses are the minimum read from each job's `complete()`, not measured by a human.** The only measured
figure is the walker's, from `docs/reinterp/WALK_2026-10-08.md`: 2016 took it 118 presses, 76 of them on the workstation.

## 0 · What I found, in six lines

1. **The board offers nine tiles at once** (eight jobs and her record), all mounted. The player can already skip any of
   them, and the era's real path is small (two pieces of work, then the phone). The load is *choice* and *volume*, not
   a required reading list. Only the first three jobs she picks decide the volume she meets.
2. **The era's ending asks for very little from the board:** two finished "units" arm the phone (§4). A *unit* is one
   testimony story to its end (there are four) or any other finished job. That is why three starting options are safe,
   if one of them is the testimony job.
3. **Her record counts as a job.** Viewing it completes a tile and counts as one unit toward the phone. That is probably
   not intended: reading is not work (its own `_doc` says "it has no work in it").
4. **The link-clicking cadence (E5) is six presses and two sheets:** unlock → notification → link → *Okay* → link →
   *Okay*; the cascade then runs itself for 7.2 s. The two cards in the thread show only a masthead and a headline
   (9–10 words). Their `standfirst` fields (40 and 38 words) are **never drawn**.
5. **Two things the board reads from the roster must be re-pointed** before any job is hidden: the "You're caught up"
   state, and Lambient's wait lines (§4).
6. **The unlock should be the player's.** I recommend one persistent *Update* chip on the board's title bar (§2),
   and offer a quieter auto-installing ribbon as the alternative. That is question 1.

---

## 1 · What Vera is offered today

### 1a · The board (`BOARD` in s3_queue.json; drawn by `graceQueueLite.drawBoard`)

All nine tiles appear at once from sign-in. A tile greys when its job is complete. A job can always be put down
(`backToBoard`); a finished job returns to the board after `JOB_RETURN_SECONDS` 2.0 s (W1-E3). Per tile, once per run.

| # | Tile (label · note) | Tile words | What it is | Words in its data file | Min. presses to complete | Counts toward the phone? |
|---|---|---|---|---|---|---|
| 1 | **Correct a testimony** · four waiting | 5 | 4 stories (Renata, Noa, Deb, Marisol), 11 corrections, each a rule + why + manual + verse. The only job where the unit is a *story*. | 624 on screen (stories 238, corrections 386) | 11 decisions + 3 "Next story" = 14 for the job; 2–3 per story | **Yes: 4 units** (one per story) |
| 2 | **Clear the comments** · flagged replies | 5 | Strangers' replies to Renata's testimony; four flagged, all kind. | 689 in `s3_comments.json` + 182 in `s3_flagged.json` | 4 (the flagged ones) | Yes: 1 |
| 3 | **Return the family calls** · from relatives | 6 | Three mothers; Annette is the one the interface cannot help. | 386 | 3 replies (+3 selects) = 6 | Yes: 1 |
| 4 | **Cut the Story** · forty seconds | 5 | Choose the sentence a conference clip starts from (Renata's). | 50 + her text | 2 (a sentence, then Publish) | Yes: 1 |
| 5 | **Order the podcast** · three clips | 5 | Reorder three clips with up/down arrows; Publish. | 113 | 1 (+0–2 arrows) | Yes: 1 |
| 6 | **Build the course module** · modules and pricing | 7 | Include or leave out five modules; choose a price; Publish. | 129 | 1 (the walker pressed 5 modules + 5 prices) | Yes: 1 |
| 7 | **Post to the group** · this week's story | 7 | Post a ready-written testimony to the network's group. | 171 | 1 (Post) | Yes: 1 |
| 8 | **Tag the video** · keywords | 4 | Tag the house vocabulary; preview as viewer; Up next walks to the video she tagged. | 165 | 1 (leave) to ~8 (6 tags + preview) | Yes: 1 |
| 9 | **Your record** · account · activity | 5 | The platform's file on her. Opening it completes the tile. | 67 | 1 | **Yes: 1** (probably unintended) |

Tile text in all: 49 words. The board's own lines: `boardSub` ("Start anywhere. The order is yours.") and Lambient's
`firstBoard1`, `firstTask1/2`, `waitLine1/2` (one-offs, once each).

**Everything else the workstation offers** (none of it a job): the *Your record* chip at the bottom of every
signed-in screen (always available, the device-side twin of the wall — keep); the sign-in; Lambient's consent card
(title + 2 hello lines + 49-word small print + wake word + Allow / Not now — 85 words, once); the once-per-era
"This week" pause (after the first job, `boardQuietT > 6`); the Word of the Day (`boardQuietT > 12`); Lambient's
"waiting" lines (`boardQuietT > 25` and the group or the tag job unfinished); the lock screen saver.

### 1b · The phone (`PhoneE3`; texts in s3_maiden.json)

| Action | When it appears | Presses | Text with it |
|---|---|---|---|
| **Unlock** | lock screen, from the start (the pill). | 1 | "Unlock" |
| **The notification** (Bea) | when two units are finished (`armMalta`); and again at the vote. | 1 each | preview line: 6 words (Malta one), 2 words (the vote) |
| **The group thread** ("Maiden-to-be") | via the notification, the home icon or the inbox. | 1 | history 104 words (6 messages); then Malta one (4 messages, 41 words); then vote (5 messages, 12 words) |
| **Link 1** (the bill) | in the thread, live only at `first`. | 1 | card: masthead + headline, 9 words. *Not drawn:* `standfirst` 40 words |
| **The sheet** (Lambient's card, "Okay") | after the link; or by itself ("capture either way"). | 1 | opened 34 words / ignored 31 words |
| **Link 2** (the vote) | live only at `voted`. | 1 | card 10 words. *Not drawn:* `standfirst` 38 words |
| **The sheet again** | after link 2. | 1 | the same text again |
| **The cascade** | after the second *Okay*, by itself. | 0 | 16 messages 0.45 s apart (7.2 s): 6 text messages (21 words) + 10 link cards (~95 words of headlines, all spent but still answering a press); `after` 14 words |
| **Messages** (the inbox) | home grid, always. | 0–6 | 6 messages from outside, 134 words; files nothing |
| **Live now** (the platform stream) | home grid. | 0 | a tile, no screen of its own (`stream` returns true) |
| **FloppySheep** | home grid. | 0+ | a game; one line per run (W1-K3) |
| **Walk With** | home grid. | 0+ | read-only partners' report |

**The cadence the colleague met:** unlock, notification, link, Okay, link, Okay (six presses) with two sheets of ~34
words and two link cards between; then 7.2 s of cascade. The next beat is the update (u4: notice 31 words, EULA 168,
changelog 79).

### 1c · The era's reading, end to end (words a diligent player meets)

| Stretch | Words |
|---|---|
| Arrival: boot + changelog | 49 |
| Sign-in + consent | ~100 |
| Board tiles + Lambient board lines | 49 + ~45 |
| The nine jobs, if she does them all | ~2,580 (testimony 624, comments 871, family 386, group 171, tags 165, course 129, podcast 113, story 50+, record 67) |
| The phone, standard path | ~270 (history 104, Malta 53, sheets 68, cascade text 21, cards ~20) |
| The update (u4 notice, EULA, changelog) | 278 |

The jobs are about three quarters of the reading. A player who takes only the testimony job meets ~630 words; one who takes the
three I propose below, ~960.

---

## 2 · Three to start with, and the order the rest unlock

### 2a · The three

| | Start with | Why |
|---|---|---|
| 1 | **Correct a testimony** | The era's centre and its only felt job. It supplies four of the units alone, so the phone can arm without anything else. Its text volume stays (624 words); that is for text cuts, not for this plan. |
| 2 | **Post to the group** | The shortest real job (1 press) and the platform's own frame; the tile the waiting lines refer to. |
| 3 | **Tag the video** | The recommendation event: "who selects the next thing is now the platform". It is also referenced by the waiting lines. |

**The record stays out of the three.** It is a chip, always available; the tile goes (§4, risk 3).

**Why not family or comments to start.** They are the heaviest (386 and 689+182 words). Annette's call is the moral
spine of the era, so it is the one I'd least want a player to miss: question 3.

### 2b · The five that unlock

In order, lightest reading first, the heaviest and most felt last:

| Order | New tool | Board tile | Words in file | Notice text (draft, platform voice) |
|---|---|---|---|---|
| U1 | Podcast Studio | Order the podcast | 113 | "New in Contributor tools: Podcast Studio." |
| U2 | Course Builder | Build the course module | 129 | "New in Contributor tools: Course Builder." |
| U3 | Story Editor | Cut the Story | 50+ | "New in Contributor tools: Story Editor." |
| U4 | Family Line | Return the family calls | 386 | "New in Contributor tools: Family Line." |
| U5 | Comment Review | Clear the comments | 871 | "New in Contributor tools: Comment Review." |

"Contributor tools" is not new language: the era's last update (u4's changelog) already ends with
**"- contributor tools: retired"**, **"- the moderation queue: retired"**, **"- the waiting: retired"**. The tools
arrive by updates; the last update takes them away. That is the diegetic frame.

### 2c · How an unlock is presented (the programme's voice; the frame never plays)

**Recommended: one persistent *Update* chip** on the board's title bar, in GracePlatform's own chrome.

- It appears when the next tool is *available*: after each finished unit, on her return to the board. Not before the
  first unit; **not on the return where the phone lights** (the phone's turn is the era's, and an update must not
  arrive with Bea's notification); the next unit after that.
- It reads "Update" with the version in small type ("GracePlatform 4.1"). Pressing it installs the next tool in the
  order above: the tile appears on the board; a single plain line sits under the title for the rest of that visit:
  "New in Contributor tools: Podcast Studio." The line goes when she opens any tile. It is not modal.
- **Nothing else changes.** No sound beyond the platform's existing chime (or none), no animation beyond the tile
  appearing, no count ("3 of 8"), no "unlocked", no badge on opened tools, no reward. The chip and the line are the
  platform advertising its own tools, in its own voice. The player's decision to install is hers; **declining is
  just not pressing it**, and nothing is filed for that.
- It never expires and has no clock.
- Lambient says nothing about it (the assistant caps are untouched).

**Alternative: the update installs by itself** when she returns to the board after a unit, with the same one-line
notice and no chip. Fewer presses, but the unlock is no longer hers. Question 1.

**Not recommended: a modal "Update now / Later".** It would echo the era-ending updates the spine arms (u2, u3, u4,
"never the player") and teach the wrong lesson.

### 2d · Words this changes

| | Before | After (start only) |
|---|---|---|
| Tiles on the board | 9 (49 words) | 3 (16 words) |
| Jobs she can meet without choosing to update | 9 | 3 |
| Reading volume if she does all she is offered at the start | ~2,580 | ~960 |
| Added text | | 5 notices × 7 words, plus "Update" |

---

## 3 · Messages that can be merged or shortened (W1-E1, W1-E5)

*Proposals only. The group thread and the testimonies are `felt` and the group is never satirised: nothing here is
a change I would make without his yes. All counts are words.*

| # | What | Today | Proposal | Before → after | Note |
|---|---|---|---|---|---|
| M1 | `m.link.standfirst` and `m.linkVote.standfirst`, and the two `tapHint`s | text in the data, **never drawn** | delete the unused fields | 78 + 6 → 0 | No change for the player at all; removes dead text from the census. `phoneE3.ts` reads only masthead and headline. |
| M2 | The second sheet (after link 2) | the same sheet as the first: 34 words opened / 31 ignored | first sheet unchanged; second sheet shows title and note only, e.g. "Not available on your work profile" / "I let the team know." (or ignored: "Just so you know" / "It has been passed on.") | 34 → 12 and 31 → 10 for the second view | Both ledger lines (`e3_malta_first`, `e3_malta_voted`) stay. The cadence is two presses either way. |
| M3 | Cascade link cards | 10 spent link cards among 16 messages | keep the 6 text messages and the 3 "added" lines; halve the link cards to 5 (keep one per name: Susan, Hanne, Deirdre, Aoife, Bea) | 16 → 11 messages; 7.2 s → 4.95 s; headline reading ~95 → ~48 | "Outnumbered" must still read as more than one person at a time. Nothing in the ledger counts the messages (it files `e3_cascade` at the end). Needs a look in the headset. |
| M4 | Malta one: the first two messages | "is anyone else reading about malta" / "there's a bill. they're about to make it an offence to try to change somebody. an actual law, with a penalty on it." | one message: "is anyone else reading about malta. there's a bill, they're about to make it an offence to try to change somebody." | 29 → 21 | Bea's voice; his call. |
| M5 | Malta two: the first two messages | "they voted." / "unanimous. not one against it." | "they voted. unanimous." | 7 → 3 | Susan's "unanimous" and Hanne's "read that again susan" already echo it. |
| M6 | The first sheet's button and the cards' link text | — | none: the cards are already 9–10 words | 0 | The E5 cadence is the number of presses, not the words. See M7. |
| M7 | The cadence itself | link → Okay → link → Okay | **one change to consider:** after link 1's sheet, link 2 appears as before, but its sheet is the short one (M2) and the cascade starts on *its* dismissal | presses unchanged (6) | Merging the two sheets into one would remove a press, but it would drop the `e3_malta_voted` filing and the "capture either way" second chance. That is the lead's call (question 6). |
| M8 | The group thread's history | 6 messages, 104 words, in the thread's first screen | leave | 0 | It establishes that the group is kind (Deirdre moved the call for Susan; Bea answers Hanne plainly). The cascade pays it off. Cutting it would weaken the ending, not the reading. |
| M9 | The inbox (6 messages, 134 words) | optional, files nothing | leave | 0 | Felt, from outside the programme; the only messages in the era that are welcome. |
| M10 | The corrections' `manual` and `verse` lines | repeated per card: 3 rules appear twice across stories (ids 2/10, 3/11, 7/12) | show them in full the first time a rule is met; the second time, the rule and the reason only | ~60 words saved over a full run | **Breaks the doubling law** (`_docScripture`: same weight, shape and citation every time), so it is the lead's call. Citation text is not edited, only not repeated. |

**Total from M1–M5:** about 165 words of data, of which **84 are never seen**; the visible saving is ~80 words (M2 ~22, M3 ~47, M4 8, M5 4) and 2.25 s.
That is small. The reading in 2016 is the *jobs* (about 2,600 words), which §2 addresses by showing three at the
start, and the text cut (PR #1) addresses in the strings themselves.

---

## 4 · What this does to the era's ending

### 4a · What the ending actually depends on (read from the code)

| Beat | Triggered by | Where |
|---|---|---|
| Phone lights ("Malta") | `workDone() ≥ MALTA_AFTER_TASKS` (= 2) → `armMalta()` | graceQueueLite.ts `updateGate` (~606), `decide` (~969), `nextSubmission` (~996); `MALTA_AFTER_TASKS` (line 199) |
| `workDone()` | stories fully decided (0–4) + every non-testimony job in `tasks()` that is complete (record included) | graceQueueLite.ts ~884 |
| Records `e3-job-done`, `e3-two-jobs` | the first and second unit | ~610–613, 968, 1012; read by `map.ts` (`oneJobDone`, `twoJobsDone`) |
| "Capture either way" | link opened, **or** one more unit finished after the phone lit (`onWorkDone`), twice (at `first`, at `voted`) | graceQueueLite.ts ~617; phoneE3.ts `onWorkDone` |
| Stage `first → voted → cascade → after` | the *Okay* on each sheet (`dismissCard`) | phoneE3.ts ~182 |
| `e3_cascade` check-in | the last cascade message lands | phoneE3.ts `tick` ~165 |
| **The update that ends the era (u4)** | `e3_cascade` filed **and** `!phoneHeld && !graceQueueLite.busy` (a job open or a card on the phone's glass count as busy) for `FINAL_GAP` 6 s, paused while busy | era3Devices.ts ~1203 → `e4Bridge().armFinal()` |
| `e3-day-done` | every *visible* tile complete | graceQueueLite.ts ~970; read by `map.ts` `allJobsDone` (optional beat) |

`spine.ts`'s `case 'e3'` arms nothing (the era's end is the room's). **Nothing in the ending reads *which* jobs she
did, only how many units.**

### 4b · With three starting jobs

| Path | Units available from the start three | Needed | Reachable? |
|---|---|---|---|
| Fastest: two stories | 4 + 2 | 2 | **Yes** |
| Group + tag (no testimony) | 2 | 2 | **Yes** (as today) |
| Open both links | — | 2 units + 2 presses | **Yes** |
| Ignore both links ("capture either way") | 6 | 2 + 1 (sheet 1) + 1 (sheet 2) = 4 | **Yes**, with 2 to spare |
| Ignore both and never do more work | — | — | Same as today: she can always open the link. No dead end. |

The unlocks are therefore never *needed*; they only add. If she never installs an update, the ending is unchanged.

### 4c · What has to change in the code to hide jobs (so nothing breaks)

1. **"You're caught up" must not appear while a tool is still available.** `backToBoard` sets mode `done` when
   `completedCount() ≥ tasks().length`. Hiding jobs makes that true after the third starter. Fix: while an update is
   available or uninstalled, the board shows the chip beside "You're caught up" (the platform says exactly this), and
   `e3-day-done` is filed only when **the whole roster** (eight jobs) is complete, not the visible tiles.
2. **Lambient's waiting lines** refer to the group and the tag job by checking `surfaces.get(id)` (mounted), not
   unlocked (graceQueueLite.ts ~509). The two jobs stay in the starting three, so this holds; if the lead chooses
   differently, that check has to read "unlocked".
3. **Her record counts as a unit.** Hide the *tile* and keep the chip. `workDone()` then no longer counts the record
   as work, which closes the cheap route (one story + a look at her record → the phone lights) and removes nothing
   the ending needs (§4b). The map's `record` beat is optional and still ticks from `recordViewed`.
4. **Tile ids are index-based** (`task-0` … in `drawBoard`; `openTask(index)` reads `tasks()[index]`). If unlocked
   tiles keep `BOARD` order, indexes shift when a middle tool appears: harmless to a player, but `tools/walk.mjs`
   ranks `^task-` ids (line 193), so the walker needs one walk after the change. Appending in unlock order avoids
   the shift.
5. **The update line is not modal and not "busy".** `busy` is `mode === 'list' || phone.cardOpen`. The chip and the
   line live on the board (mode `board`), so the exit's `clear` condition is unaffected. If the lead wants a card
   instead, it must be added to `busy` or it can sit under the u4 notice.
6. **Do not let an update land with the phone.** Skip the install offer on the return where `armMalta()` fires (and
   while the phone is held or a card is up); the next unit makes the next tool available.
7. **Text that names tools**: the map's `work` hint says "Annette's family calls are on the board" (map.json
   `eras[2].beats[3]`). With Family Line behind U4 that is untrue at first. It should say "Work a story through…
   then another story, or another job." The `jobs`, `recommend` and `group` hints are fine (`recommend` and `group`
   are in the starting three).
8. **The pause ("This week")** builds its list from what is left (`pauseItems('e3', …)`): its "More jobs on the
   board, in any order." is true once the chip exists.

### 4d · What it does to the record

If an unlock files a line, the Close receipt's era count changes (2016 shows "entries filed: 26"). Recommendation:
**file nothing**, as Malta does ("the record answers for what the apparatus asked you to do"); installing a tool
the platform advertises is not an act on her. Question 5.

---

## 5 · Order of work if he approves (no estimates, in sequence)

1. Dead fields: M1 (data only).
2. The roster, in `graceQueueLite`: an `unlocked` set seeded with the three; `tasks()` filters by it and by `BOARD`
   order; `mountTask` unchanged; the record tile dropped from `tasks()`.
3. The *Update* chip and its line, in the board's chrome, with the availability rule of §2c.
4. §4c's re-pointing: `done` mode, `e3-day-done`, the map's `work` hint.
5. M2 (the short second sheet), M3 and M4/M5 (his yes first).
6. One walk of 2016 from the era (`--from-era 3 --one-era`) and one of the full path; both must still reach 2026.

---

## 6 · Questions for the lead

1. **Who installs the update: the player or the platform?** I recommend a persistent *Update* chip the player presses
   (the unlock is hers; declining is not pressing). The alternative installs by itself on her return to the board.
   Or something else: an "Update now / Later" modal (not recommended, §2c).
2. **Are the three right?** Testimony + Post to the group + Tag the video. The alternative swaps Post for Return the
   family calls (the moral spine, 386 words) or Order the podcast (113 words, a lighter start).
3. **Annette.** The family calls are unlocked fourth in my order. If she must be met by every player who plays
   2016, she belongs in the starting three (replace Tag the video), or in U1. It costs 386 words up front.
4. **The unlock order.** Lightest first (podcast, course, cut, family, comments). Should the comments (the kind ones
   are the flagged ones) come earlier than the family line?
5. **Does an update file a line in the record?** I recommend not (§4d). Filing five would change the 2016 count on
   the Close receipt.
6. **The cadence (E5).** Keep two sheets (shorten the second, M2/M7), or merge them into one and drop the second
   "capture either way" chance? The first keeps every ledger line; the second removes a press.
7. **M3, M4, M5 and M10** are text changes on `felt` material or on the "doubling" device. Which, if any, may I draft
   in a text-cut branch?
8. **Her record as work.** OK to stop counting a look at her record as a unit (§4c.3)? It closes a cheap route to
   the phone.
9. **"Contributor tools" and "Update"** as the diegetic wording. The version numbers ("GracePlatform 4.1") read as a
   product, not a score; is there any reading of them you want to avoid?
10. **Headset.** None of this has been run: M3 (the shorter cascade) and the chip's place on the board need a look in
    the headset before they are final.

---

## 7 · His answers (2026-10-10)
- **Q1, who installs an update: "the system asks for the update, and the player confirms".** Neither of my two: the
  platform offers each update itself (its own voice, "New in Contributor tools: …"), and nothing installs until Vera
  presses to accept. Declining or ignoring it leaves the board as it is. Still no count, no "unlocked", no reward,
  nothing filed.
- **The proposal (§2: start with Correct a testimony, Post to the group, Tag the video; then the five tools, lightest
  first; each arriving as "new in Contributor tools", the last update retiring them): "I think I agree".**
- **Q3 (Annette) and Q7 (the felt text changes M3, M4, M5, M10): he asked for a plainer explainer** — given in the
  session on 2026-10-10; still open.
- **Still open:** Q2 (are the three right), Q3, Q4 (unlock order), Q5 (does an update file a line: recommended no),
  Q6 (one sheet or two), Q7, Q8 (her record as work), Q9 (the wording), Q10 (headset).
