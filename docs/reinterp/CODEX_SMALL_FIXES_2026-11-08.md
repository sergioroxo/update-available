STATUS: live

# Ten small headset-session fixes — 8 November 2026

Branch: `codex/small-fixes-8nov`, base `f84abe63`. One implementation commit; independent of the XR text branch.

| ID | Change |
|---|---|
| T14 | PureMail has no read-aloud row or playback callback; text only. |
| T19 | The initial Removal stalled state already had no timer. Removed the remaining 3-second automatic completion after the successful hold: the completed diary waits for an explicit Continue press. |
| T20 | Family Form's final label is Continue. |
| T26 | Each Caleb message arrives whole with the notification beep; authored gaps between messages remain. |
| T27 | The wrist hint is returned only while a tracked hand source is present. Controller-only input gets no wrist wording. |
| T30 | Profile chips widened into two columns, goals/refusal moved down; next-task button 102→182 px; PureMail window 306→330 px high to clear its footer rule; Caleb reply widths follow the complete labels; permission sticker moved above the button row, left aligned. Font sizes unchanged. |
| T31 | Completed 2016 screens retain the lower Back control; the top exit remains only while work is unfinished. Removed the handset mirror's minimise glyph and target, following TODO's 'should have no minimise button'. |
| T32 | Wick card lies flat beside the notepad before/after its one lift. Centre y=0.752 m with 0.004 m thickness: lower face y=0.750 m, on the table. Rest pose is reapplied after the animation so the room cannot leave it aloft. |
| T33 | 1997 startup chime begins with the first LambyOS boot screen, rather than the later splash. |
| T42 | Disabled buttons use one flat unavailable style; Read on has the primary outline before the last page, and only the last page registers Agree. |

Verification:

- `npx tsc --noEmit -p .`: passed.
- `npm test`: passed.
- Vite on port 3118: ready.
- `node tools/stills.mjs --port 3118 --small-fixes --out out/small-fixes-8nov`: 11 targeted stills (T30 has both profile and letter), one per ID otherwise; affected e2/e3 shots refreshed separately. `STILLS.md`/`STILLS.json` record poses. These are labelled review states, not reachability claims. The T27 still is static; the conditional source check, not a photograph, distinguishes hands/controllers. Sound timing also needs listening.
- Requested background `node tools/walk.mjs --port 3118 --from-era 2 --one-era`: final lines report **73 presses, reached e3; one era walked from e2 to e3**. No full walk. An earlier run was interrupted by a Vite reload while edits were still in progress; the final run completed.
- Card's final 4 mm height correction followed that walk; type/test checks and its still were rerun. No narrative-flow change followed the walk.

Quest 3 check still needed: listen for the startup chime at the first boot screen; confirm controller-only wrist silence and that hand tracking restores the hint; inspect all five text-fit cases at the seat; watch Wick lift once and settle on the table. Read PureMail in silence, wait at the completed diary, and confirm Continue alone advances. Stills cannot verify sound, physical input mode, or stereo depth.
