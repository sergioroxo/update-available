STATUS: live

# Festival browser playtest repairs — 2 November 2026

Sérgio's browser playtest found real audience-path faults that the original opening-only iframe smoke check did not cover.
That check is no longer treated as evidence that the whole piece is ready for jurors.

## Repairs

| Report | Cause / change | Evidence |
|---|---|---|
| 1997 instructions missing | Earlier playtest polish made `StartPanel.tick()` and `reopen()` no-ops. Restore 1997's existing Getting Started card on a calm desktop, with working Close and reopening; keep the later eras' own overviews. No new character biography was written. | OS publishes `startpanel-close`; screenshot `out/itch/regressions/1997-instructions.png`. |
| Restorify Today late | Acknowledging the first check-in closed the window, requiring a later reopen. Return directly to Today; dismissing the initial Lamby also leaves Restorify available immediately. | Actual Restorify hit controls check-in → Continue → Today. |
| Caleb uncensored before the video / letter | `onAlertDone` restored his transcript before the later collapse. Keep it blocked until the failure letter closes. The failure timer also waits while the video offer or video is open. | Callback leaves phase sealed; Watch opens the player; failure deadline is held during offer and video. |
| Next task moves the view | Remove the 2003 referral callback's recenter. The task is read at the current desk. | Camera position, rotation and FOV unchanged after pressing `send-go`. |
| CLEAR cannot be played by mouse | The shared monitor hit plane could consume a click on the held game in front of it. A held device now receives input before the monitor and movement markers; misses cannot click through it. | Real Chrome mouse click: device receives one press; desktop receives none. CLEAR's board tap fires a shot. |
| Browser lacks dollhouse | The miniature's opening and lifetime were XR-only. Show the same miniature in the browser, carried in front of the camera, with the year plate. XR table, hand and mouse interactions stay XR-only. | `browser-dollhouse.png`; the live scene contains its miniature after the transition call. |
| 2016 advances without opening the phone | Finishing later jobs called the phone's ignored-link path before any group message was seen. That path now requires viewed messages. The cascade clock pauses unless the phone is held and its group thread is visible. | Work-only tests trigger no card or light lift. An unseen cascade files nothing; the visible cascade completes. |
| Green navigation rings imposed | Navigation rings are now off initially, with **Navigation highlights: off/on** in the game menu. Preference is session-only and wiped with the ledger. The drawing helper enforces the preference across surfaces. | Off draws no ring; enabling draws rings; no content or controls removed. |
| Old/new 2026 mixture | The completed S293 v2 lived on `worktree-agent-afc47c4668b1cb907` and was absent from `reinterp`. Integrate its five commits' net changes (through `f4f52387`), preserving later reinterp work. | `ERA4_V2_BUILT_2026-11-02.md`; browser tour in `out/itch/tour-e4-v2/`. |
| Close music missing | The Close explicitly set the bed to null when approaching its monitor. Retain `close_score.mp3` under the card, receipt and Lexicon. | After pressing the Close cards and advancing its own clocks to the monitor, the live audio element is playing `close_score.mp3` at volume 0.55. |

The new 2026 sequence is restored defaults → sponsored search → Second Thoughts agent → Meridian refusal → composite → Junie → original photo → headset session → TransJesus stream. The retired ballroom, categories and lamps are removed. The unapproved 2016 rebuild is not included.

## Verification and limits

`npx tsc --noEmit -p .` and `npm test` pass after the v2 integration and regeneration of the era-site viewer model.
Run `node tools/itch-playtest-regressions.mjs --port 5190` against a fresh Vite server to repeat the targeted checks.
The harness uses developer hooks only in the ordinary review build; the festival edition still ignores debug parameters.
Its report and screenshots are in `out/itch/regressions/`.

A clean Vite restart matters for these developer-module tests: after hot reload, importing a source module without its
cache-busting timestamp can create a second test-only module instance. A full-page restart avoids mixing ledger instances.

The complete 2026 tour passed: 46 screens, zero page errors (`out/itch/tour-e4-v2/TOUR.md`). The front-door-to-Close walk also passed: 550 steps / 277 presses, `spine: done`, Restart card showing, console clean. Evidence: `out/itch/walk-v2.log` and `out/itch/walk-v2/WALK_2026-11-02_SPEEDRUN_GUIDED.{json,md}`. Its old Markdown footer incorrectly defaulted to “step limit” on a successful natural finish; the actual `--require-close` assertion passed. The reporter is corrected for future runs. A successful automated walk proves that route is reachable; it does not replace Sérgio's
mouse playthrough or physical Quest/iPhone testing.

In-headset note: browser access to the existing miniature has been added, but its shared renderer and the integrated v2
stream have not been tested in a physical headset in this session. Do that on the uploaded page before promising VR entry.

## Completion note

The targeted harness passes thirteen checks, including a real mouse press routed to the held game, the offered video
holding the failure letter, unchanged camera position/rotation/FOV for Next task, and live Close playback at volume 0.55.
Highlight changes now invalidate the 1997/2003 desktop, the 2016 board and phone, and the 2026 browser on the next frame.
The phone cascade also pauses while FloppySheep covers its screen. Foreground held games take precedence over all room
props, as well as the monitor behind them. These final input/display refinements were checked with the targeted harness;
the complete route had already passed before them.

The festival zip is rebuilt after these changes and checked again by the sandboxed iframe smoke test. It is a local
replacement archive; no itch upload or Git push is performed. The physical-device and uploaded-page checklist still applies.
