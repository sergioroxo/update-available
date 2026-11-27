STATUS: live

# 2016's clocks, audited (S428, UiB job 38 A3)

*Every clock left in 2016 that could move the story, after job 38. October's map is CADENCE_STUDY_2026-10-10 §3a; a lot has
moved since (the training, the memory, the conducted Act III). His rule (26 Nov): **"The automatic is 2026 not 2016 … think of
cadency of actions, ifttt - if this than that."** So: nothing on the phone or the monitor opens by itself, and no story step waits
on the clock. The fiction's own times stay (a typing line, a message's reading hold, the removal's steps, the boots).*

Verdicts: **KEEP** = the fiction's own time (it runs inside something she started or is watching, and then waits);
**CADENCE** = the row of the A2 table it now waits for (her press, a finished thing, a page closed, a message read, a return);
**gone** = removed. Code that was replaced wholesale is kept at **40a59042** (this job's start).

## The table

| # | Clock (where) | What it did | Verdict | Now |
|---|---|---|---|---|
| 1 | The phone's and taskbar's clock, `EVENING_START` 18:04 + a minute a minute (`phoneE3.ts`) | the time on her phone and taskbar | **gone** | the visitor's real time of day (`new Date()`, read once a second); the day stays Tuesday 6 December 2016. Each message is still stamped with the minute it lands. Nothing waits on it. |
| 2 | The arrival: `DARK_SECONDS` 1.6, `BOOT_LINE_SECONDS` 1.5, `BOOT_TAIL_SECONDS` 3.6, `INSTALL_LINE_SECONDS` 1.5, the installed line's hold (`graceQueueLite.ts`) | the machine boots, installs, shows Sign in | **KEEP** | the machine's own boot, then it waits for Sign in (row 1) |
| 3 | Lambient's lane line: `max(10, readHold)` (`graceQueueLite.ts` update) | the line goes; the phone may deliver after it | **KEEP** | a line's reading time (one voice at a time); a press clears it at once |
| 4 | Lesson 1's Watch: Lambient's line `max(3, readHold)`, its own cut (`CUT_STEP`), its teaching line `max(4, readHold)` | Lambient makes the first cut | **KEEP** | the fiction's own time (Lambient demonstrating); it waits while she plays the film, and then waits for her Apply |
| 5 | `CUT_STEP` per cut (mark, change, hold: 2–9 s) | a rule's cut made in front of her | **KEEP** | the fiction's own time after her Apply; the film then waits for her Play |
| 6 | Renata's film (0:40, then 0:20) | plays | **KEEP** | only on her Play |
| 7 | A message's reading hold: `READ_HOLD` 6, `HOLDS` (Orla 8, Mam 9), the reading rule (`phoneE3.ts` deliverEvent) | the next message waits for the last | **KEEP** | the fiction's own time; it never opens anything |
| 8 | A finished lesson's message, delivered "at rest" | Mentor / Orla / Mam land when the board is clear | **CADENCE**, row 3 | they land when she is back on the board (her Back to Today), as notifications; the phone's screen is never changed by one |
| 9 | Heartwood's offer: `due` after Lesson 1 and the Mentor's message, then a quiet board (`app.ts`, `teachingTv.ts`) | Lamby offers to bring the set | **KEEP** (an offer) | Lamby's unasked offer, inside the era's cap, ignorable; it opens nothing. It is no longer made once she has opened Lesson 2 ("goes with this lesson") |
| 10 | Lesson 2 waiting for that offer to be answered or let go | Lesson 2 lit only after the offer settled | **CADENCE**, row 3 | Lesson 2 opens to her when Lesson 1 is finished |
| 11 | `offerHold` 16 s (the offer let go unanswered) | Lesson 2 lit after 16 s | **KEEP**, no longer moves the story | it only takes the balloon down; Lesson 2 does not wait for it. ⚑ His finding 20 (the balloon left before he could press it) is job 39's |
| 12 | `HEARTWOOD_FAILSAFE` 30 s | Lesson 2 lit anyway | **gone** | nothing waits for the offer |
| 13 | Lesson 3: Lambient answers Maureen (`LIGHT_AT`, `SEND_AT`, `MOVE_AT`, about 8 s; `familyCalls.ts`) | Lambient's example, then Annette | **KEEP** | the fiction's own time; then Annette waits for her reply (C3, saying it plainly, is S429's) |
| 14 | The memory card after Mam's message had its banner hold, and S336's failsafe `offerWaitT` 12 s | the card came without her opening Mam's message | **CADENCE**, row 4 / failsafe **gone** | the card comes when she is on the board with the training done **and Mam's message opened and read** (its reading time counted from her opening it) |
| 15 | `MEMORY_AGAIN_SECONDS` 6 | after Not now, the card back after 6 quiet seconds | **CADENCE**, row 5b | back once, Look back alone, the next time she returns to the board (she left it — a job, a card, the menu, the window down — and is back) |
| 16 | The memory page's turn: the published story's reading time | the page turns to her own words | **KEEP** (row 5 as built) | the fiction's own time on a page she opened; ⚑ his call: finding 32 asked whether the turn should wait for his press |
| 17 | `memoryStage 'wait'`: her words' reading time on the page, or `MEMORY_CLOSED_BREATH` 2 s on the board | her Notes opened by themselves | **gone** → **CADENCE**, rows 6–7 | closing the page puts a Notes notification on her phone; her tap opens the Notes |
| 18 | Her line typing: `REFUSAL_BREATH` 1.2 s, 7 letters a second | the note types | **KEEP** | the fiction's own time after her tap; then the Notes wait for her |
| 19 | The note's reading hold, then the lock screen by itself | the phone locked by itself | **gone** → **CADENCE**, row 8 | her Back closes the Notes; the phone locks |
| 20 | `holdFor = 2` after the lock | a breath before Nuala's message lands | **KEEP** | the breath after her press (row 8) |
| 21 | Nuala read → `maltaPending 'news'` → `MALTA_CLEAR_SECONDS` 1.5 s → the group opened by itself | Bea's news began, the group opened | **gone** → **CADENCE**, rows 9–10 | she opens Nuala's message; after its reading time (KEEP, from her opening it) a notification from Maiden-to-be with Bea's first line; her tap opens the group |
| 22 | `maltaWaitT` 40 s | put away cards that held the news back | **gone** | nothing waits for a clear board |
| 23 | Bea's news: `NEWS_FIRST` 0.6, `newsWait` (the reading rule, at least 4.5 s) | each message after the one before | **KEEP**, row 10 | runs once she has opened the group, whatever else she opens; the last one's reading time counts while the group is on her glass (row 11: "read") |
| 24 | The kit after the news (`kitPending`, at rest) | the URGENT pop-in | **CADENCE**, row 11 | she has read the last of Bea's messages, and is on the board |
| 25 | `KIT_POPIN_AUTO` 22 s | the platform opened the kit itself | **gone** | the kit opens only on her press. Its 2 Hz flash stays (still under reduced motion) |
| 26 | The kit left → `maltaPending 'review'` → 1.5 s clear board → the group opened, the review began | the review started itself | **gone** → **CADENCE**, rows 12–13 | leaving the kit puts a notification from the group on her phone ("GracePlatform is reviewing this group"); opening the group starts the review |
| 27 | The phone's clock paused while a job or the game was open (`!jobOpen && !floppy.open`; `if (!visible) return`) | the review froze (the stall of 26 Nov) | **gone** | nothing she opens or plays pauses the news or the review: a job, a finished lesson, the game, a minimised window |
| 28 | The review: `REVIEW_LEAD` (the bar's reading time), `OUTLINE_S` 1.5, `REMOVING_S` 1.5, `GREY_S` 1, `REVIEW_GAP` 1, the outline at 3 Hz | outline, removing, grey, fold | **KEEP**, row 13 | the platform's own time on the thread she opened |
| 29 | The forwards: `CASCADE_STEP` 0.75, a person's words their reading time | the women forward faster than it can follow | **KEEP**, rows 13–14 | the same |
| 30 | `TAIL_HOLD_SECONDS` 8, `TAIL_AFTER_SECONDS` 2 | the end held, then the update allowed | **gone** → **CADENCE**, row 15 | the end waits in the group for her |
| 31 | `FINAL_GAP` 6 s with nothing open (`era3Devices.ts`) | the update notice | **gone** → **CADENCE**, row 15 | she forwards the link once "Review could not keep up.", or closes the group after it has been on her glass: the notice comes at once. Only her notebook in her hand holds it (a felt object) |
| 32 | `MINIMISED_RETURN_SECONDS` 30, and the return whenever the platform brought something forward | the window came back by itself | **gone** | the taskbar button brings it back; "Take me there" restores it; her phone beside it still brings its news (a minimised window counts as at rest) |
| 33 | The workstation's lock screen, `SAVER_SECONDS` 150 of quiet on the board | the lock screen | **KEEP** | the machine resting; it moves no story step and opens nothing; any press wakes it |
| 34 | Lamby's guide: `cueSeconds` 25, `tipSeconds` 50, `againSeconds` 90 (`lambyGuide.json`) | just-in-time hints when she stalls | **KEEP** | G2's own clock: an unasked hint, ignorable, at most 8 an era, never over a felt beat; it never opens anything. Her own press on Lambient's button is answered at once |
| 35 | `GuideWait` 20 s (a system surface waits for a balloon at most 20 s) | one voice at a time | **KEEP** | it only orders voices |
| 36 | Her notebook's `maxHold` 60 s (`veraDesk.ts`) | put down by itself | **KEEP** | it closes, never opens; it moves no story step |
| 37 | The room's light: `LIFT_DELAY_SECONDS` 1.4, `LIFT_SECONDS` 5 | the room brightens on Bea's card | **KEEP** | felt before understood; it follows the card she is reading |
| 38 | The update's `REMIND_SECONDS` 40 after "Remind me later" (`update.ts`), the install's own time | the notice comes back once | **KEEP** | the update is the system's (CLAUDE.md: updates are triggered by documented failures, never by the player; "Remind me later" works once). ⚑ His call whether 2016's notice should wait for a press too |
| 39 | `kitWaitT` 10 s | a console line for diagnosis | **KEEP** (no effect) | moves nothing |

## What the chain now waits for (A2, as built)

1 Sign in · 2 Allow / Not now · 3 a finished lesson (and Back to Today: its message arrives as a notification) · 4 Mam's message
opened and read · 5 Look back (5b: Not now → her next return) · 6 Close on the memory page · 7 her tap on the Notes notification ·
8 her Back on her Notes · 9 opening Nuala's message · 10 opening the group · 11 reading the last of Bea's news · 12 opening the kit,
then Back to today · 13 opening the group · 14 (the platform's own time) · 15 forwarding the link, or closing the group.

## Failsafes

None is kept. Every one above waited on a clock because the chain could stall; it cannot now: each row waits on her, the Start
map's Now names the step she is on and offers "Take me there" (the press her own would be), and Lambient's button answers on every
operable surface. The two probes (tools/s428-chain-probe.mjs, tools/s428-stall-probe.mjs) and `npm test` (tools/e3-chain-test.mjs)
run two minutes with no press at every row that waits.
