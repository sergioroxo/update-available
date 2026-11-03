STATUS: live

# Bounded Lamby hand-offs (session 306)

Branch: `codex/lamby-opener-waits`, based on fetched `origin/reinterp`.
Implemented 2026-11-03; filename retains the requested review date.

`GuideWait` holds pending actions in memory and gives each opener its own maximum
20 seconds from its first blocked attempt. Dismissal releases it on the next update.
Retries retain the action and its original deadline. Desktop waits are enabled only
in reinterp, cleared on era change, exit and the residue ending, and paused with the
desktop. Counting time does not mark a canvas dirty. No display copy, palette,
geometry, network, storage or texture-upload policy changed.

## Opener audit

All waits below test the active guide balloon; existing content/quiet/scene guards
remain. The cap limits the added guide wait, not an existing felt or quiet gate.

| Surface / opener | Wait / disposition |
| --- | --- |
| 1997 placement `openPacket()` | Existing form/racket/delay and 1.2-second quiet gates, then bounded guide wait (replaces `packetLambyT`). |
| Timed diary `openDiary()` | Original arrival time, then bounded guide wait. |
| `formForced` activation | Original intermission and busy-window guards, then bounded guide wait. |
| Forced `openProvotype(origin_intake)` | Next eligible press queues one bounded hand-off; delivery checks that the form is still outstanding. Lamby's controls, Start and menu retain their earlier routing. |
| `checkinForced` / check-in-due toast | Original grace period, then bounded guide wait. |
| Forced `openRestorify()` | Eligible press queues a bounded hand-off; rechecks that the check-in is outstanding and Caleb is absent. |
| Evening `openRestorify()` + `startEvening()` + evening toast | Original testimony/summons/idle prerequisites, then one shared bounded wait. |
| Message-arrival toast / `maybeAnnounceMessage()` | Bounded wait before marking notice delivered or clearing the desk. Caleb's felt window is unchanged. |
| `openAccountabilityAlert()` | Operable alert callback waits, bounded; Caleb's own rendering and timing are unchanged. |
| PureMail network-failure opener | Existing Caleb/redaction/break-toast guards, then bounded wait. |
| IRC hooked/log toast | Retained callback waits, bounded. |
| Behind-screen toast | Existing idle/picture gates, then bounded wait. |
| Forum recommendation toast | Retained callback waits, bounded. |
| Summons `offerSend()` toast | Icon remains available; its toast waits, bounded. |
| Optional-surface way-back toast | Retained callback waits, bounded. |
| 2003 “while you wait” toast | Existing idle/forum guards, then bounded wait. |
| 1997/2003 pause and word-of-day dialogs | Existing prerequisites, then bounded guide wait. |
| Deferred update opener | Existing modal-calm gates, then bounded guide wait. |
| IRC fallback escalation | Original fallback clock, then bounded guide wait. |
| Desktop getting-started card | Calm predicate yields to guide, bounded. |
| 2016 getting-started card | Calm predicate yields to guide, bounded. |
| 2016 “This week” pause | Existing quiet-board/job guards, then bounded guide wait. |
| 2016 word-of-day and waiting-job Lambient lines | Existing quiet-board gates, then bounded guide wait; delivery uses the same deadline, avoiding two consecutive waits. |
| 2016 phone-broken Lambient line | Bounded guide wait, with the same deadline used for delivery. |
| Other Lambient conduction via `lambSay()` (consent/task/phone/return/map) | Retained hand-off waits, bounded. Delivered conduction owns the lane until the next visitor press; guide yields through `guideVoice`. |
| 2016 tool-update offer | Work/phone prerequisites, then bounded guide wait. Offer progress is not consumed early. |
| 2016 completed-job return | Original final-state hold, then bounded guide wait; deadline is cleared for the next job. |
| Screensavers | Desktop already excludes active/waiting guide. 2016 now also excludes active guide; decorative saver has no story deadline. |

Explicit icon/menu/guide-requested opens (`openPacket`, both `openProvotype`
variants, `openRestorify`, etc.) remain immediate: they are visitor actions.
Kit connection/browser opening occurs inside the kit's existing voice-owned
surface. Era-status, greeting-dismissal and Start-map toasts are transition/press
responses rather than timed arrivals. The baseline kit reminder is unchanged.
Boot/install/splash transitions already silence the guide. Program loading-box
expiry does not open another surface. Caleb, the 1997 folder, and their felt
content are untouched; their silence rules remain in force.

## Checks

- `npx tsc --noEmit -p .` — passed.
- `npm test` — passed, including new real-guide hand-off regressions: no early
  delivery, independent 20-second deadlines, dismissal release, exactly-once
  delivery, retry deduplication and cancellation on retirement.
- `npm run dev -- --host 127.0.0.1` — Vite started successfully.
- `git diff --check` — passed.
- No README changes staged; pre-existing workspace changes retained.

## Still needs a real headset

Quest 3 / Headset B: read an active Lamby balloon through each timed arrival,
dismiss it, and separately leave it unanswered for 20 seconds. Check forced form
and check-in presses remain queued without swallowing guide/menu dismissal;
verify the evening/check-in/message sequence and 2016 Lambient lane are readable,
including an update offer and a completed-job return. Confirm dirty uploads remain
idle while waiting, draw calls stay within 75, and Caleb/1997-folder silence is
preserved. No headset or phone run was performed in this session.
