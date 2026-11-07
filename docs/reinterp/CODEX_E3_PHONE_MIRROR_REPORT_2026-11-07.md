STATUS: live

# 2016 phone mirror — 7 November 2026

Branch: `codex/e3-phone-mirror`, based on `origin/reinterp` at `066b8d46`.
Worktree: `/Users/sergiogalvaoroxo/codex-e3-mirror`.

The phone is a second program beside GracePlatform. Its painter, screen, threads, inbox page, read state, Notes and camera roll belong to one `PhoneE3` instance. Neither surface copies or files her messages. All phone content is felt. Reading has no send, keyboard, reply chips or account consequence.

## What changed

1. Scripted Lambient takes the operable voice immediately. Its bounded hold releases to the guide after ten seconds. Its first-task instruction is seen on Today before opening the testimony, rather than disappearing behind a felt screen. Requested “Take me there” turns to the workstation and points to a live control; it never answers consent, applies a correction or presses Send.
2. The sign-in notice and `personal-message` map row are retired. The platform occupies 484 of the workstation’s 676 logical pixels; the mirror uses a 188-pixel neutral window with a four-pixel gap. Its title bar toggles a larger reading viewport. Minimise and taskbar restore work. There is no close box.
3. The approved evening copy is in `data/strings/e3_mirror.json`. Work beats queue arrivals; the displayed clock advances with delivered story events. Rapid work cannot overwrite queued evening messages. The next arrival follows a short reading hold; there is no deadline or penalty. Story Record suspends arrivals and hides the banner on both screens.
4. The first completed testimony conducts the Mam draft, with a blinking caret, for three seconds, then returns home. Notes contains exactly the Mam draft and shopping list. The camera roll contains the three cake sprites, bus screenshot and, after arrival, Orla’s empty-chair photo. These canvases request no assets and add no GPU draw calls.
5. Malta arrives alongside the kit. Closing the kit starts the vote and existing cascade without requiring phone input. The old managed-device sheets and phone-reading check-ins are retired: the platform cannot inspect her private groups. News/navigation progress lives in `veraDay`, separately from the witness ledger. The two existing post-cascade Lambient lines remain on the operable board.
6. Installation displays “This device is no longer supported. Phone disconnected.” in the mirror’s own chrome, then closes it. The physical phone goes dark. Disconnection clears its private event queue, messages, read state, open thread and banner. The u4 changelog adds `- phone link: not supported`.
7. The 2016 activity chip and pulse are gone. Start → “My account · activity” opens the existing record. The game menu’s file and other eras are unchanged. The focus-mode offer appears once; both answers leave notification delivery unchanged. Its inclusion is still the lead’s stated ethics decision, not an implementation gate.

## Corrections from the lead (7 Nov)

1. **Narrow text:** the complete welcome subline wraps inside the platform. The testimony studio reflows its film and transcript columns; the correction references wrap together. Board labels wrap. The kit’s copy and controls fit without covering one another. The comparison documents and the longer optional testimony use ordinary page controls to preserve their complete text at readable type. Family reply labels wrap within taller buttons. Both Noa captions retain the same type and ink. All platform painting is clipped to its own window before the mirror is painted, so it cannot run under the mirror.
2. **One Orla message:** the lock screen suppresses a retained card only while that same message is the banner. The follow-up stamp banner therefore leaves the earlier quiz message once on the lock screen; the banner and open thread never duplicate their current message. The inbox also has one Orla thread, rather than separate old-notice and new-arrival rows.
3. **Wick card:** the original printed prop lifts over 0.5 seconds, faces the authored seat for three seconds, and settles over 0.5 seconds, once. It has no new light, sound or ledger event. Lambient, its mark, guide and glow are silent during this felt conduction. The follow-up banner is exactly “dee says you're one stamp off a free one x”, at 18:04. The printed plane is reused; its redundant backing box is not drawn, keeping the draw-call delta at zero.
4. **Lane clearance:** Sign in has a clear gap above Lambient’s lane, which ends above the taskbar. The lane is hidden during the conducted card, private reading and other quiet scenes.

Photographs: `out/codex-e3-mirror/stills/e3-lead-01-wick-conducted.png`, `e3-lead-02-orla-stamp-banner.png`, `e3-02-seat-board.png`; screen-by-screen images `01-signin.png` through `27-dark-phone.png` in `out/codex-e3-mirror/`. The guide target photographs are `guide-*.png`. Room/menu/update photographs are in `out/codex-e3-mirror/scene/`.

## Lambient investigation and evidence

The first commit is the Step 0 repair (`6d4601d8`). Baseline walks were started before it; live Vite reloads interrupted them while implementation continued. They are not represented as completed baseline evidence. The final uninterrupted runs and focused checks provide the functional evidence below.

| Lead | Finding and repair |
|---|---|
| Empty `e3.phone.target` | Confirmed. First repaired to real phone IDs. With the mirror’s automatic news path, the final guide offers live platform kit controls and never points into the mirror. |
| Lane versus balloon | Confirmed: `lambSay` waited on the balloon, its lane was additionally suppressed by a phone call, and the first-task instruction opened behind a felt screen. Scripted lane priority, bounded release, and the board conduction repair these separate causes. |
| Stand versus held phone | Phone rectangles were already published by its painter on the stand. Their data could exist without being in the camera’s view; the mirror removes that requirement. The walker additionally projected FloppySheep’s physical controls onto the workstation; that projection is corrected. |
| Trial guide targets | `pipeline`, `vera-install` and `vera-kit` have real controls. Their guide acts now focus those controls instead of silently doing nothing. Eight requested-help states are checked against freshly painted rectangles. |
| `--jump e3` | `DesktopOS.debugJump` has no `e3` beat. The walker now treats this spelling as an Era-3 diagnostic boot, so room and desktop agree. It is explicitly not an entrance reachability proof. |

`tools/e3-mirror-guide-check.mjs`: **65 checks passed**. Requested help reaches live controls for sign-in, consent, work, pipeline, Kindredraft installation, the Send receipt, kit and phone/kit navigation. The checks assert no consent/decision/job entry is filed by a guide action, dismissal works, the unsolicited cap stays at five, requested help remains available, quiet gates win and the lane releases the guide.

Timestamped lane and balloon logs are recorded by `--lambient-log` from actual paint calls. They include the screen and elapsed browser time, deduplicated per voice/screen/line. Requested balloon text and dismissal/action logs are also saved in `out/codex-e3-mirror/guide-check.json`. The finished log tables are below. The sign-in greeting is additionally photographed in `01-signin.png`.


### Minimum visitor: painted Lambient log

This run reached the Close with 73 presses. It made no private phone-control press in 2016. Times are elapsed browser seconds, not the story clock.

| Time | Screen | Voice | Displayed lines |
|---:|---|---|---|
| 4.97s | signin | lane | Keep the room gentle. |
| 11.24s | board | lane | Lovely. I'll keep the room gentle. / A testimony first. Then the family calls, then the group's post. |
| 13.51s | board | lane | Apply what fits. Skip what doesn't. / Either way it's recorded, so you can't get it wrong. |
| 39.95s | board | lane | Your phone's lit — someone's writing to you. / Pick it up when you like. You can always put it down. |
| 49.95s | board | lane | Your phone is connected. Focus mode can hold notifications while you work. |
| 53.85s | board | lane | Everything on your board is still there. / Take the time you need with it. |
| 69.57s | board | lane | GracePlatform — Today's language: DEPENDENCY. / Loving someone too much is a symptom. Don't worry, we have a worksheet for love. |

Every requested Step 0 lane beat is present once: greeting; consent reply and day order; first-task pair; phone pair; post-cascade pair. No unsolicited guide balloon was painted during this busy run. The separate requested-help log records every balloon text and action for the eight control states.

### Entrance walk: painted Lambient log

The uninterrupted entrance run reached the Close with **248 presses**, all four eras reached, `spine: done`, and the Restart card showing. No diagnostic jump was used. Times include the earlier eras. This run painted no unsolicited E3 guide balloon.

| Time | Screen | Voice | Displayed lines |
|---:|---|---|---|
| 1083.32s | board | lane | Lovely. I'll keep the room gentle. / A testimony first. Then the family calls, then the group's post. |
| 1085.35s | board | lane | Apply what fits. Skip what doesn't. / Either way it's recorded, so you can't get it wrong. |
| 1111.85s | board | lane | Your phone's lit — someone's writing to you. / Pick it up when you like. You can always put it down. |
| 1141.32s | board | lane | Everything on your board is still there. / Take the time you need with it. |
| 1206.88s | board | lane | Your phone is connected. Focus mode can hold notifications while you work. |

The focused minimum E3 run above also painted the sign-in greeting and the second post-cascade line. Requested-help photographs and the 65-check guide log verify all eight guide states, including the receipt’s live Back control.

## Legibility and draw calls

Measured at the authored seat `(-4.4, 1.16, 0.7)`, pitch `-8°`, yaw `93°`, browser vertical FOV `42°`, viewport `1280 × 720`:

| Measurement | Result |
|---|---:|
| Monitor projected corners | x 368–1021; y 157–538; all in view |
| Monitor vertical angular size | 22.523° |
| 11-pixel platform type, approximate angular height | 0.635° |
| 11-pixel phone type in the normal mirror, approximate angular height | 0.584° |
| Normal mirror phone scale | 331 / 360 ≈ 0.919 |
| Enlarged phone viewport scale | 331 / 240 ≈ 1.379 |
| Seat draw calls | 43 |
| E3→E4 transition peak | 59 |
| Change versus the merged Brief 8 measurements | +0 at seat; +0 peak |
| Additional photo requests / GPU draws | 0 / 0 |

The 11 scene checks also pass: real ray-resolved pickup with a banner, menu pause, regular installation and visible disconnection, persistent darkness in Era 4, restart, the final Leave control, the shipped build and flat review tool, with no browser exceptions. The production build succeeds.

The 32-check additional reading regression checks both complete Noa captions at equal type and ink, every original Marisol word across four reader pages, all four complete reply labels within their buttons, and activity-record return routes from Today, Send and the kit without making a job choice.

The 54-check focused regression paints the screen steps and verifies shared state, minimise/restore, enlarge, quiet reading, conducted Notes, photos, Send, record silence, mentor arrivals, kit approval, take-down, news, Start activity, focus dismissal and disconnection. Its raw text overflow probe includes intentionally clipped profile rows and translated thumbnail painters; screenshots, rather than those untransformed coordinates, are the visual check.

Real Quest still owed: reading both windows without leaning, the enlarged view and page controls, whether the neutral second program reads as her phone rather than platform surveillance, the lit physical phone, the conducted stamp card, and controller picking. These are browser/scene measurements, not a claim of in-headset verification. No phone-hardware gyro test was performed.

## Privacy consumers

The merged base had already removed the `e3_backlog` inbox push. It remains absent. Backlog and new thread reading use `PhoneE3.readMessages`; neither creates a check-in. The old `witness.backlogOpened` string has no runtime consumer.

The former generic consumer is the `ledger.checkins` loop in `src/witness/record.ts`: it classifies E3 check-ins as contacts. Its `entriesByEra()` output supplies Your file, the 2016 account record and the phone’s Walk With view. `recordCount()` feeds the witness pulse in `src/witness/pulse.ts`. The phone now contributes no group-open, Malta-open or cascade check-in to any of these. Progress conditions in `src/witness/map.ts`, `src/narrative/spine.ts` and `src/room/era3Devices.ts` use private navigation state instead. Platform actions—consent, corrections, distribution, kit approval and take-down—retain their own authored witness entries.

## Name and period-source check

PocketPane is already an actual mirroring product: [product site](https://pocketpane.app/). [PocketLoom also has an existing games publisher](https://www.pocketloom.games/). After the lead asked for another suggestion, the branch uses the descriptive title **Handset Window**. Its display title is one editable data string.

The period premise is supported by [Samsung’s original SideSync announcement](https://news.samsung.com/global/samsungs-sidesync-bringing-your-mobile-and-pc-closer-together-than-ever), opened during this session: phone-screen sharing and computer/phone connection predate 2016. [PCWorld’s 21 April 2014 report](https://www.pcworld.com/article/438862/samsung-brings-sidesync-phone-connectivity-to-all-pcs.html), also opened, confirms a resizable phone window over USB or Wi-Fi on Windows PCs. No actual company’s identity, logo or software UI is reproduced.

## Verification and commits

`npx tsc --noEmit -p .`, `npm test` and `npm run build` pass. The production build retains the repository’s existing large-chunk warning. `npm run dev` serves this worktree on **3115**: 3114 is already occupied by the earlier `/Users/sergiogalvaoroxo/codex-e3-message` Vite process. That process was not stopped or repointed. All tests for this branch use 3115.

Completed walks (all on 3115, all exit 0 with the Restart card showing):

| Route | Presses | Evidence folder |
|---|---:|---|
| Entrance, `--max 2600 --require-close --lambient-log` | 248 | `out/codex-e3-mirror/final-entrance-minimum/` |
| Minimum E3 visitor, `--from-era 3` | 73 | `out/codex-e3-mirror/minimum-e3/` |
| E3 diagnostic, `--jump e3` | 126 | `out/codex-e3-mirror/verified-e3/` |
| Full E3 cut, `--from-era 3 --cut full` | 141 | `out/codex-e3-mirror/verified-full-e3/` |
| Final committed E3 speedrun | 73 | `out/codex-e3-mirror/final-e3/` |

The entrance route ran at `bae309f7`; the final `638719f1` changes preserve separate hit geometry, retain the previous Orla message, wrap the two optional captions and resolve requested help to the live receipt control. Final focused checks after those changes passed: mirror 54, requested guide 65, reading 32, message retention 9 and viewport controls 7. Earlier real scene checks passed 11. These include actual physical pickup; the final enlarged-view check also presses the physical unlock while the mirror is enlarged. Both kit branches are exercised: approval in the focused route, admin handling through Back in the minimum visitor walk, with take-down available in both. The `?era=3` review boot calls `settleArrival`, already exercised by all focused browser checks.

The final committed runtime (`638719f1`) was also rerun with `--from-era 3 --max 2600 --require-close --lambient-log`: **73 presses, exit 0, Close reached, Restart card showing**. Evidence: `out/codex-e3-mirror/final-e3/`. This final run takes the kit’s Back/admin branch and the focus-mode Yes answer. The separate 54-check route takes kit approval and focus dismissal.

The photographs were refreshed after the final source commit. In particular, `01-signin.png` shows the whole welcome line, one retained quiz message below the different stamp banner, and the clear Sign in/lane/taskbar gaps. `retention/01-first.png` shows no duplicate while the first banner is current. The two `stills/e3-lead-*.png` images show the original Wick print facing the seat during the quiet lift and the follow-up banner. `reading/noa-both-captions.png` preserves both captions, and the 17 `platform/` stills cover every platform surface.

The final viewport renderer preserves the physical screen’s hit geometry and shared first-visible-item offset. Title-bar enlargement and taskbar restore enter quiet reading. A dedicated seven-check browser regression verifies physical unlock while enlarged, reachable Notes controls and stable inbox/camera-roll position.

Implementation commits, in order:

- `6d4601d8` — fix(e3): give scripted Lambient a bounded guide handoff
- `ec8e92e2` — feat(e3): mirror the shared phone beside GracePlatform
- `aa0a0057` — feat(e3): deliver the evening through beat-driven phone banners
- `1a9e5a52` — feat(e3): conduct the unfinished Mam draft and add the empty-chair photo
- `a28acd08` — feat(e3): disconnect the phone when the update installs
- `47385ccf` — feat(e3): move activity into the Start menu and remove the pulse chip
- `2f0e9295` — feat(e3): offer the ineffectual focus mode once
- `fcc2bf5c` — fix(e3): finish mirror flow, felt gates and lead corrections
- `9cd54746` — fix(e3): make requested guide navigation and mirror game controls live
- `ce5f67a5` — test(e3): verify guide targets, phone lifecycle and the minimum route
- `bcbf2b5c` — fix(e3): keep complete reading and banners visible at mirror width
- `bae309f7` — fix(e3): keep private phone focus silent until work resumes
- `638719f1` — fix(e3): preserve phone viewports and retain each Orla message once

The final documentation commit adds this report and exactly one S321 BUILD_LOG line. README is unchanged; its existing development commands remain valid.


### Final committed E3: painted Lambient log

| Time | Screen | Voice | Displayed lines |
|---:|---|---|---|
| 4.57s | signin | lane | K / e / e / p /   / t / h / e /   / r / o / o / m /   / g / e / n / t / l / e / . |
| 10.84s | board | lane | Lovely. I'll keep the room gentle. / A testimony first. Then the family calls, then the group's post. |
| 13.04s | board | lane | Apply what fits. Skip what doesn't. / Either way it's recorded, so you can't get it wrong. |
| 39.53s | board | lane | Your phone's lit — someone's writing to you. / Pick it up when you like. You can always put it down. |
| 49.53s | board | lane | Your phone is connected. Focus mode can hold notifications while you work. |
| 53.43s | board | lane | Everything on your board is still there. / Take the time you need with it. |
| 69.10s | board | lane | GracePlatform — Today's language: DEPENDENCY. / Loving someone too much is a symptom. Don't worry, we have a worksheet for love. |
