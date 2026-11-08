STATUS: live

# 2016 (Vera): cadence fix, 8 November 2026 (S327)

Branch `claude/e3-cadence-fix`. Answers the lead's headset test of 2016
(`docs/reinterp/HEADSET_SESSION_2026-11-08_PART2.md`): "no cadence of the
sequence", "a bunch of changes made at the same time". TODO rows T04, T05, T06,
T07, T23, T24, T25, T31, T32.

The rule now: **one voice at a time, and nothing runs by itself.** The phone
holds every message until the platform is at rest, then gives them one at a
time. The two things the piece does by itself (the Wick card, the Malta
cascade) are conducted beats: the piece takes her there, and nothing else
speaks while they run.

## What changed

1. **One phone (T04).** The handset and its cradle are off the desk in 2016.
   The Handset Window on the monitor is her phone. Nothing in the era needed
   the handset in a hand any more: the cascade already ran while the window was
   up, and the "call" to lift the phone only fires when the window is gone.
   The two props are parked (not deleted) under `r3._retiredS327` in
   `data/room/reinterp_deltas.json`, with their history; the phone's screen
   plane stays off (`src/room/era3Devices.ts`, `setEra`). This also removes the
   "phone should follow my head" problem: there is no phone to hold.
2. **The Handset Window (T05, T31).** One back button (the chevron on each
   screen's own bar; the second one at the foot is gone). "Reply on your phone"
   is gone. No minimise box. Pressing a notification opens that person's
   thread, and the banner clears once it is opened. Each person is ONE thread:
   older messages from them sit above tonight's. Messages lists tonight's
   people newest first, so the Mentor is at the top when he writes.
3. **Messages arrive between jobs (T06).** No message arrives while a job, a
   page or a card is open, while Lambient or the guide is speaking, or while a
   conducted beat runs. Each finished thing (a story, the send, its receipt, her
   2014 record) earns the next message; the phone delivers it at the next quiet
   moment on the board, four seconds after the one before. The phone no longer
   turns to Notes or to its inbox by itself in the middle of work: her unsent
   reply to Mam is shown once, after Mam's message has been read, at rest.
4. **The update has a story reason (T07).** The vote and the cascade are
   conducted: when she leaves the campaign kit, the Handset Window comes forward
   over the board on the group's thread and the group fills faster than review
   can ("9 items could not be reviewed"). Then the window goes back, Orla's last
   message arrives, Lambient says the board is still there, and only then the
   update arrives. Its first two lines now name the failure: "Tonight the review
   queue was outnumbered. / Messages went out that nobody reviewed." Its type is
   larger (12 px).
5. **No highlight boxes under the update (T07).** While the notice is up, the
   board draws no glow, no guide, no Lambient lane. In the headset the ray now
   aims at the notice's own buttons, not at the board's buttons underneath it.
   That old snapping is the likely reason "Remind me later did nothing": the
   press was moved onto a board tile under the notice.
6. **Remind me later leads somewhere (T07).** It returns her to the board with
   one quiet Lambient line: "Of course. The update will ask once more." The
   notice comes back once (after 40 s), with the reminder spent.
7. **The campaign kit (T23, T24).** One family, a heading that says what it is
   ("Campaign kit — your stories, for the law vote"), one plain line about Malta
   ("Malta's parliament has voted to ban conversion practices. The network's
   campaign answers with three stories."), three rows (Renata, Vera, Deb M.),
   the small print small, one primary button (Approve kit, then Back to today).
   The news itself still arrives as the pretend newspaper carrying the real law
   (the link card on her phone).
8. **The guide (T25).** The guide's tray on the taskbar is bigger
   ("Lambient", 12 px, a lit edge) and is drawn whenever the platform is not in
   a felt scene, also while Lambient's lane speaks (its balloon waits; one
   voice). It used to vanish after any press on the Handset Window until the
   next press on the platform. It is still never shown over a person's words.
9. **The Wick card (T32).** It rests flat on the desk by the notepad, face up,
   readable from the chair. The rise-once starts and ends there.
10. **The "error" in the testimony editor (his addition, 8 Nov).** No error
    message exists in the 2016 code; two things read as one, and both are
    fixed. (a) The first press on a job opened NOTHING and only showed
    Lambient's two lines, a press that seemed to fail. A press now always
    opens the job; Lambient says how Apply and Skip work on the board
    beforehand, once the consent lines have been read. (b) The frame the
    house edit removes from Renata's publication strip was an empty grey box,
    like a broken video. It is now labelled "cut", the cause on screen.
    The jobs' CONTENT (what is flagged, why, Malta among her removals) is not
    rewritten here: the lead wants all of 2016's jobs reworked and connected
    to the phone as one design (`docs/reinterp/DESIGN_2016_CONNECTIONS_2026-11-08.md`,
    the orchestrator's). A first draft of a Malta "review queue" was built and
    withdrawn for that design; its patch is in
    `out/e3-cadence/review-queue-draft.patch` (git-ignored) for reference.
11. **The held phone (T47).** Moot in 2016: there is no handset to pick up
    any more (item 1). The desk monitors stay in the room.
12. **Lettering.** All of 2016 now uses one family: the platform sans its own
    pages (editor, record, send page) already used. The board, buttons, sign-in
    and notices are no longer monospace beside them. The smallest sizes are
    semi-bold for the headset (`src/desktop/theme/fonts.ts`). This also touches
    2016's dossier cards and the 2016 labels in the constellation.

## The 2016 sequence, beat by beat (as it now plays)

1. The machine boots and installs GracePlatform. The sign-in screen. Nothing
   stands in front of the monitor.
2. The Wick card rises from the desk, faces her for three seconds, settles back
   flat by the notepad. (Felt. Silent. Nothing else moves.)
3. Orla's message arrives in the Handset Window: one banner, "quiz at the wick
   tonight…". The stamp line is in the same thread.
4. Sign in. Lambient's question (Allow / Not now). The board. Lambient answers
   and gives the day's order (two lines).
5. Correct a testimony: Renata, three Apply / Skip. Nothing arrives on the
   phone. The story is done; Back to today.
6. The platform takes her to the send page. Send to all four; the receipt;
   Back to today.
7. The board, at rest, with "New: Kindredraft · Install" in its header. The
   held messages arrive one at a time, four seconds apart: the Maiden-to-be
   check-in; Mam; her unsent reply to Mam (Notes, three seconds); the Mentor
   ("I know Tuesday is that bar…").
   If she presses Install before they are all in, the rest wait.
8. Install. Her own 2014 story (felt; nothing arrives; no guide). Close record.
9. The campaign kit. Approve it, or not; Take my story down is optional.
   Nothing arrives while the kit is open.
10. Back to today. Malta, conducted: the Handset Window comes forward over the
    board on the group's thread. Bea's news, the link (The Continental Wire:
    "Malta votes to outlaw conversion practices"), then the cascade: links
    forwarded, people added, "Review is still running", then "9 items could not
    be reviewed". Lambient is silent.
11. The window goes back to its place. Any message still held arrives (on a
    fast visit, the Mentor's 21:30 one). Then Orla: "missed you tonight x",
    with the photo of the empty chair.
12. Lambient: "Everything on your board is still there. / Take the time you
    need with it."
13. About eleven quiet seconds later: the update. "Tonight the review queue was
    outnumbered. Messages went out that nobody reviewed. Kindredraft is being
    archived…" Update now / Remind me later.
14. Remind me later: the board, one line ("Of course. The update will ask once
    more."). The notice returns once, the reminder spent. Update now → the
    terms → the install (the phone disconnects) → 2026.

## Verification

- `npx tsc --noEmit -p .` clean; `npm test` green (the 2016 era site was
  regenerated: one map hint changed).
- Photographs, driven with real presses on the platform's own rects, from the
  seat: `out/e3-cadence/01…23-*.png` (git-ignored). Also `tools/stills.mjs
  --only e3 --out out/e3-cadence/stills`.
- Walk, 2016 only (`node tools/walk.mjs --port 3122 --from-era 3 --one-era --max 1200`): reached 2026 in 19 presses (`out/walks/WALK_2026-11-08_FROM_e3_SPEEDRUN_GUIDED_ONE_ERA.md`).
- Not verified: anything in a headset. The ray-aiming fix under the update
  notice is checked by code only.

## Open questions for Sérgio

1. **The handset is retired in 2016.** Is that right, or do you want a phone
   object back on the desk (dark, beside the lamp) as set dressing only?
2. **One Orla banner.** On 7 Nov you asked for the stamp line as a follow-up
   banner; on 8 Nov two Orla messages "didn't make sense". The stamp line now
   sits in her thread under the first message, with no second banner. Keep?
3. **The tail is quiet and long.** From the end of the cascade to the update is
   about 20–40 seconds with nothing to press (window back, one or two
   messages, Lambient's line, the update). Too long, or right for the ending?
4. **Four seconds between messages.** Is that enough to read in the headset?
5. **The jobs' content** (testimony flags, the video, the comments, Malta
   among her removals) waits for the 2016 connections design. Where each job
   lives, for that build:
   - Correct a testimony: `data/dialog/s3_queue.json` (`submissions`,
     `corrections`: rule, why, manual, verse, edit, chip); drawn in
     `src/room/graceQueueLite.ts` (`drawTestimonyStudio`, `drawList`,
     `drawCorrections`, `drawCurrent`).
   - Return the family calls: `data/dialog/s3_family.json` →
     `src/desktop/apps/familyCalls.ts`.
   - Post to the group: `data/dialog/s3_group.json` →
     `src/desktop/apps/groupTask.ts`.
   - Cut the Story: `data/dialog/s3_queue.json` (`story`, and correction 3's
     `edit.find`) → `src/desktop/apps/storyCut.ts`.
   - Clear the comments: `data/dialog/s3_flagged.json` (+ `s3_comments.json`)
     → `src/desktop/apps/clearComments.ts`.
   - Send / Kindredraft record / campaign kit: `data/dialog/s3_vera.json` →
     `src/desktop/apps/veraSurfaces.ts` and `graceQueueLite.ts`
     (`drawVeraPage`).
   - The phone: `data/strings/e3_mirror.json` (the evening's messages, their
     order is `EVENING_ORDER` in `graceQueueLite.ts`) and
     `data/dialog/s3_maiden.json` (the group, Malta, the cascade, the backlog)
     → `src/desktop/apps/phoneE3.ts`.
   - The update notice: `data/strings/updates.json` `u4`.
6. Codex's probes `tools/e3-mirror-*.mjs` that press the physical handset will
   now fail (they are not part of `npm test`).
