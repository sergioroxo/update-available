STATUS: live

# 2016 (Vera): every job meets the phone — built, 8 Nov 2026 (S332)

Branch `claude/e3-connections`. Plan of record: `DESIGN_2016_CONNECTIONS_2026-11-08.md`, last section ("His second
answers… the build spec"). Builds on the cadence fix (`E3_CADENCE_FIX_2026-11-08.md`): one phone (the Handset
Window), one voice at a time, messages only between jobs, the update with a story reason.

## The sequence, beat by beat (words on screen)

1. **Arrival.** The machine boots, GracePlatform installs, sign-in. The Wick stamp card rises once from the desk
   (felt, silent) and settles by the notepad. *No message arrives now* (Orla's invitation moved to job 2).
2. **Sign in, Lambient's question, the board.** Lambient: "A testimony first. Then the places list, the family calls
   and the group's check-in." Four tiles: Correct a testimony · The places list · Return the family calls · Post to the
   group. ("Cut the Story" and "Clear the comments" are retired as tiles.)
3. **Job 1 — Correct a testimony (Renata).** Three rules, each Apply or Skip. Lambient teaches each in the rule panel:
   - Soften the term — "We say “same-sex attracted” because it names a feeling, not a person. Feelings can change."
   - Name the dependency, not the person — "We say “dependency” because a name can hurt someone."
   - Route for mentorship — "Someone kind will check in within two days. Nobody should carry this alone."
   Cuts are drawn in the house's red. When "Name the dependency, not the person" is applied (by anyone), the left
   column becomes **"Your story was edited with this rule too (2014)"** — Vera's own sentence, as sent, with the same
   cuts in the same red ("because of Nuala, and", "We had lived together.", "her"). Back to Today → the send page
   (unchanged: Send to all four, the receipt). Back on the board, at rest, the phone: **Mentor** — "You and Orla text a
   lot. Remember the signs we talked about. Not a rule. Just love." (His older "I know Tuesday is that bar…" now sits
   above it in the same thread, from Sunday.)
4. **Job 2 — The places list.** A member's post (Áine, felt, bare): "If anyone's ever in town on a Tuesday there's a
   quiz at The Wick, upstairs on Fenn Street. A lesbian bar, all welcome. I went once and nobody asked me anything."
   Rule: "Add the place to the list" — "Location may lead members to unsafe environments." Lambient: "Some places are
   not safe to show. We keep a list, so nobody walks in somewhere unprepared." Add to the list / Leave it off. The
   list: four invented places, then "The Wick · Fenn Street" (proposed → added, "done by you / Lambient / an
   administrator"); her post now reads "[location removed]" in red. "The list is up to date. The post stays up. The
   place does not." Trending box beside it (below). Back on the board: **Orla** — "quiz at the wick tonight. dee's
   keeping the corner table. no pressure x" (and "dee says you're one stamp off a free one x" in the same thread).
   When it has been read, the Wick card rises again to her eye and is **stamped BANNED** at the top of the rise (one
   redraw of its texture, one upload), then settles back on the desk, stamped.
5. **Job 3 — Return the family calls.** Ruth, Maureen, Annette (unchanged words). Four suggested replies, or "Don't
   send a script". Lambient, in the list column: "Families need words. We give them gentle ones: warmth first, then the
   truth." Back on the board: **Mam** — "Pastor's wife was asking for you. Their women's group meets Tuesdays, just tea.
   No pressure love x"; then, at rest, her unsent reply in Notes (three seconds), as before.
6. **Job 4 — Post to the group (Maiden-to-be).** Drawn close to a 2016 closed group: the blue bar ("gather", invented),
   a cover photo, "Maiden-to-be", "Closed group · 5 members", Joined / + Add members / Notifications, "Admin" badges
   (Deirdre, Vera). Composer, drafted for her: "Tuesday check-in: one place you were tempted this week, and one place
   you walked away. Reply in the thread." Post / Not this week. Lambient: "Accountability keeps us honest. A question
   every Tuesday is how we look after each other." Feed: Bea — "I'm going to sit this week's check-in out. Not going
   anywhere. Just sitting it out." (the first sign she is leaving); Deirdre; Hanne. Sidebar: About, Trending. Back on
   the board: the **same check-in arrives on her own phone**, from Maiden-to-be.
7. **The Story Record.** With the four jobs done and the phone quiet: "New: Kindredraft · Your 2014 story is ready for
   its first refresh · Install". Her record (felt, no guide): as published / as sent. Close record. At rest:
   **Nuala** — "The second mug's still on the hook. I'm not making a thing of it." When it has been read, the platform
   brings the **campaign kit** ("Campaign kit — your stories, for the law vote"; Renata, Vera, Deb M.). Approve kit, or
   Back to today (an administrator approves it), Take my story down optional.
8. **Malta.** Leaving the kit, the Handset Window comes forward on the Maiden-to-be thread. Bea's news lands, one
   message at a time (21:41–21:43): "is anyone else reading about malta. they voted to make it an offence to try to
   change somebody. i keep going back to it." · the link (The Continental Wire: "Malta outlaws conversion practices —
   unanimous vote") · "i'm not saying anything about us. i just read it four times." · Susan: "the whole parliament.
   unanimous." · Hanne: "read that again susan". Then her one reply is offered, a single press: **"finally. about time
   x"** — her only words in the era, on the right where her words would always have been. (Offered, not required:
   after 20 s unpressed the platform goes on.)
9. **The takeover.** The window goes back to its place and GracePlatform shows **"Automatic review is on" —
   "GracePlatform is reviewing Maiden-to-be by itself." — "Political content is removed to keep the community calm."**
   It removes the Malta posts one by one ("removed", in red; on the phone each bubble becomes "Removed by
   GracePlatform"), then her reply. Then the forwards arrive (Susan, Hanne, Bea "putting it in the other group as
   well", Deirdre, "Aoife was added", "3 people were added"…) faster than it can remove them: "not reviewed". It ends
   on **"4 items could not be reviewed"** (the number is whatever it missed). A "Back to Today" button lets her leave
   the review running.
10. **The end.** The window settles; **Orla 22:51** — "missed you tonight x", with the empty-chair photo; Lambient:
    "Everything on your board is still there. / Take the time you need with it."; then the update: "Tonight the review
    queue was outnumbered. / Messages went out that nobody reviewed. …" Its changelog now also reads
    "- manual review: retired" and "= the campaign kit: scheduled".

## Comply or refuse (one ladder for the shift)

Every job can be refused: Skip (Renata's rules only), Leave it off, Don't send a script, Not this week, Back to today
on the kit. One ladder for the whole shift (`src/desktop/apps/lambientDesk.ts`, words in `s3_queue.json` `refusal`):
1st refusal — Lambient: "That's not how we keep the room gentle." (the job stays open); 2nd — "I've asked kindly."
(stays open); 3rd — "Done for you. This has been noted." (Lambient does it); from the 4th — "An administrator did it
for you." (tagged GRACEPLATFORM). A refuser therefore spends two refusals on Renata's first rule, and from her second
rule on, an administrator does every job. No score, no counter. Every refusal is filed to her record (the dismissal
law). On a forced rule the line names it ("Name the dependency, not the person: An administrator did it for you.").
Noa's, Deb's and Marisol's stories keep a plain Skip: nothing may force one of Noa's two captions.

**The update is not triggered by refusing** (ETHICS 11: updates follow documented system failures). The trigger stays
Malta, the queue outnumbered; what refusal builds is the reason the next system needs no hands ("- manual review:
retired").

## Malta waits for the board (the S329 entrance-walk bug)

The full entrance walk on reinterp closed the kit, opened another job, and Malta never came (0 rects, 45 presses). Now
Malta's conducted clock (the news, the takeover, the cascade) runs only while no job is open: a job opened during it
pauses it, the window is never brought over an open job, and it resumes the moment she is back on the board. The
removals page always has a way back. Tested: kit → open Noa's story at once → work it → back → Malta runs → the update
(`out/e3-connections/detour/`).

## Documented vs inferred

| On screen | Status |
|---|---|
| "Emotional dependency" vocabulary; "Name the dependency, not the person" as a house rule | Vocabulary documented (Harvest USA, 30 Mar 2016; Robinson & Spivey 2015). The editing job and the rule are the piece's inference. |
| A list of places to avoid | Advice to avoid lesbian venues documented (SMH 2018). The list and the job: inference. |
| Family scripts ("grace and truth") | Documented ministry practice (e3_theday cards 8, 10). |
| Closed women's group with admins and a weekly check-in | Form documented (moderated application-only forums; accountability disclosure, *Outlove* excerpt). This group: invented. |
| Malta, Act LV of 2016, unanimous, 5 Dec 2016 | Documented. |
| GracePlatform removing the Malta posts by itself | Inference (ARTICLE_COMPANION §7g: Vera's job is a composite of platform moderation and SOGICE narrative control). |
| The two Trending items (the US election result; a photo app hiding #lesbian) | Documented, opened 8 Nov 2026 — `SOURCES_2016_FRAME_2026-11-08.md`. |

## Sound

One GracePlatform loop was asked for. No registered track fits: `bed_2016.mp3` (synthesized office-duct room tone) is
already the era's one bed under everything; `lambyos_home_loop.mp3` belongs to LambyOS Home; `install_work.mp3` is the
update's. Nothing was added. A platform loop needs a new file (his Suno generation or a CC0/CC BY track) registered
in `src/audio/tapeAudio.ts` with its credit.

## Where it lives

`data/dialog/s3_places.json` + `src/desktop/apps/placesList.ts` (job 2) · `s3_family.json` + `familyCalls.ts` ·
`s3_group.json` + `groupTask.ts` · `s3_queue.json` (`refusal`, `teach` on rules 1/3/7, the board) ·
`s3_vera.json` (`ownCut`, `removals`, `forcedBy`) · `s3_maiden.json` (`news`, `reply`, `removedLine`, the Mentor's
older message, Nuala's May thread) · `e3_mirror.json` (the events and their `slots`) · `e3_news.json` + `e3Trending.ts` ·
`lambientDesk.ts` · `phoneE3.ts` (news → takeover → after) · `graceQueueLite.ts` (`JOB_EVENTS`, `updateConnections`,
`drawOwnCut`, `drawRemovals`) · `era3Devices.ts` + `printArt.ts` (`stampBanned`) · `tools/walk.mjs` (four jobs in
order; `--refuse`).

## Verification

- `npx tsc --noEmit -p .` clean; `npm test` green (the 2016 era site regenerated: the map's hints changed).
- Photographs from the seat and of the workstation canvas, driven by presses on the platform's own rects:
  `out/e3-connections/comply/`, `refuse/`, `detour/` (git-ignored; driver `out/e3-connections/drive.mjs`).
- Walks, 2016 only (`node tools/walk.mjs --port 3124 --from-era 3 --one-era --max 1500`): **complying, reached 2026
  in 37 presses** (her reply to Bea pressed; the removals page left by its Back to Today); **refusing (`--refuse`),
  reached 2026 in 35 presses** (five Skips on Renata: two pushes, then Lambient, then administrators; every other job
  done by an administrator; the kit left unapproved).
- The S329 bug's path (kit → open a remaining job → finish it → Malta → the update): `out/e3-connections/detour/`
  — Malta held at Bea's first message while Noa's story was open, resumed on the board, reached the update.
- Not verified: anything in a headset; the BANNED stamp's legibility at Quest resolution.

## Open questions for Sérgio

1. **Lambient on job screens.** S208/A18 kept Lambient off job screens because they show people's words. Your second
   answers ask it to teach at each job. It now speaks only in the rule panel (the tool's side), never on a person's
   card or the phone. Right?
2. **The ladder is per shift, not per job.** After two refusals on Renata's first rule, every later refusal is done by
   an administrator at once. Would you rather each job start its own ladder?
3. **Her reply is offered, not required** (20 s, then the platform goes on). Keep, or make it wait for her press?
4. **The other three stories** (Noa, Deb M., Marisol) stay reachable behind "Next story" but are no longer part of the
   day's path. Keep or retire?
5. **The send page** (Send to all four) is still the end of job 1. Keep?
6. **Sources on the era site.** The Trending sources are recorded in `SOURCES_2016_FRAME_2026-11-08.md` but not yet
   on the 2016 era site's Sources tab (they need your tick, as in Batch 3).
7. **A GracePlatform loop**: none exists; do you want to make one?
