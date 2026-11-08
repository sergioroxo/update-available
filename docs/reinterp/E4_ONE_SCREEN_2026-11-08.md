STATUS: live

# 2026 on one screen (S328, 8 Nov 2026)

Branch `claude/e4-one-screen`. Answers his headset test of 8 Nov (`HEADSET_SESSION_2026-11-08_PART2.md`) and
TODO rows **T02, T03, T25, T43, T46**. Plan of record stays `DESIGN_2026_V3_PRESSURE_2026-11-07.md`; the four acts and
every beat id in `src/narrative/e4Beats.ts` are kept and still marked in order.

## In short

- **The laptop is gone**, in the browser and in the headset (prop out of `reinterp_deltas.json` r4, its screen plane
  never enabled, never drawn, never pressed). There is one screen: the monitor.
- **The monitor holds two windows side by side**: the browser (the system: news, clinic, search, the bot, Photos) and
  **Kettle** (the people: the lot, Mum, Dad, Junie). The window the story is on is the larger one. Pressing the other
  window's title bar enlarges it instead. Nothing is ever behind the other.
- **Time is a scroll.** Mum's years (2023 → today), Dad's September and today, Junie's Tuesday and today, the lot's
  morning and tonight: each is one scrolling thread. No "2024 ›", no "Today ›". Wheel, drag, thumbstick, touch.
- **The seat is in the chair, at the desk** (browser and headset). Recentre lands there.
- **One obvious first press**: the sleeping monitor shows a big "Press to wake the screen". Nothing arrives during the
  restore. Then the birthday messages come one at a time.
- **L lives in the monitor's taskbar** ("Ask L for help" + the L), whenever no felt thread is open.
- **The shelf on the bed was the pink throw** (a 4 cm slab along the wall side). It now lies thin, folded across the
  foot of the bed. **The phone on the nightstand is removed** (his ruling: no phone in 2026).

## What changed, file by file

| file | change |
|---|---|
| `src/desktop/apps/browser.ts` | The monitor composes two windows (`draw`, `layout`, `WIN`). Each page keeps ONE logical width (browser 556, Kettle 190) and is drawn under a scale, so enlarging changes the size, never the layout. Public `hits` are in monitor coordinates (browser + Kettle + title bars + L); the page's own are `pageTargets`. `handleClick` routes L → title bar → Kettle → browser. `face('laptop')` now means "enlarge Kettle" and only asks the room to turn if she is not already facing the monitor; when the browser takes focus, Kettle goes back to its list (no felt thread beside the bot). Wake button on the screensaver. Birthday messages at 2.2 / 4.6 / 7.0 s after the screen opens (`HOUSE_FIRST`, `HOUSE_GAP`). Mum's "today" now waits on `mumAtToday` (she scrolled there). `scrollAt` / `scrollsAt` for wheel, drag, stick. Search page, new-you sheet, bot chat and clinic letter refitted to 556 px. The machine's last line (`close_message.laptopLine`, his P7-48) moved from the lid to the monitor's failed page. Her own wallpaper returns at `original`. |
| `src/desktop/apps/messenger.ts` | Kettle as a window view: one scrolling thread per chat, dated separators, a scroll bar with ▲ ▼ (scroll controls, not "next"), "Scroll down to read on" in the bar while there is more below, the header shows the date of what is on screen. Mum's thread opens at 2023 the first time and drifts on by itself after 9 s without a scroll (no beat waits on the gesture). Junie's unmuted thread opens at Tuesday's first line. Evening paging replaced by the thread. |
| `src/desktop/apps/space.ts` | `drawLaptop` / `pressLaptop` draw and take nothing (a stale route cannot place a control). The lot's evening bumps the monitor. |
| `src/room/era3Devices.ts` | Laptop plane never enabled, never redrawn. New `monitorPoint(ray)` for the wheel/drag scroll. |
| `src/engine/app.ts` | `seatPose(270)` = (4.6, 1.16, 0.70), pitch −8, yaw 270 (was 4.4, 0.84, −10, 267). onFace skips the move if she already faces the monitor (browser, gyro and XR). Guide activation faces the monitor. Wheel over Kettle's thread scrolls it (else zoom as before); a drag that starts on Kettle's thread scrolls it (a press that stays is still a tap); the XR thumbstick scrolls it when the era sites are shut. |
| `src/room/e4Room.ts` | Pink throw: thin, across the foot of the bed. Ceiling network centred over the new seat. |
| `data/room/reinterp_deltas.json` | r4: `e_laptop`, `e_phoneBody`, `e_phoneCam` removed (Maya's own; nothing of Vera's or Daniel's touched). |
| `data/dialog/s4_v3.json` | `oneScreen` block (window titles, taskbar date, wake button, "Ask L for help"); `messenger.scrollHint`; the lot's button "Read your friends" (his "What is open the lot?"). |
| `data/dialog/s4_boot.json` | "Restoring your session" → "Opening your things where you left them". |
| `src/desktop/theme/era4.ts` | `V3.desk`, `title`, `titleOn`, `titleOnInk` (existing palette entries only). |
| `tools/tour-e4.mjs`, `tools/walk.mjs`, `tools/shots.mjs` | Tour presses Kettle on the monitor and scrolls Mum/Dad; frames from the new seat. Walk never presses `win-*` or `scroll-up`. Shots audits the monitor, not the laptop. |

## Seat (T02), measured from the seat

- Chair at r4 spans x 4.44–4.93, z 0.45–0.95. Desk front edge x 4.99. Monitor glass x 5.395, 0.533 × 0.288 m.
- Browser eye (4.6, 1.16, 0.70): 0.80 m from the glass; the monitor fills about two thirds of a 1280-wide frame,
  whole, with desk below (tour frame `03-lid-birthday`).
- Headset eye (xrComfort leans 0.15 m in): (4.75, 1.16, 0.70), over the front of the chair's seat, 0.23 m from the
  desk edge, 0.65 m from the glass; the monitor is about 44° wide. Not tried in a headset.

## Fonts (T43)

One size per window, in the era's bold 600 face: the larger window's body reads at about 15 px on the monitor
(browser 17 px × 0.90; Kettle 10 px × 1.53); the smaller window's body about 11–13 px. Monospace only for dates and
system lines.

## Draw calls

Desk from the seat: **33** (was 37 with the laptop). Four bearings at the fullest opening: 33 / 19 / 70 / 23 (the
back of the room at yaw 90 is the peak, as before). Stream: 7 / 7 / 7 / 7. Budget 75.

## The 2026 sequence, beat by beat, as it now plays

1. **Arrival.** The room, the one monitor asleep: GraceOS's orb and one green button, **Press to wake the screen**.
2. **Restore.** "L — booting up for you, Maya." then "Opening your things where you left them". Nothing arrives.
3. **eighteen** (felt). The screen opens quiet: browser left, Kettle right (enlarged). Then, one at a time: Ola, Priya,
   Rae in **the lot**. One button: **Read your friends** → **❤ Reply**.
4. **newyou.** The browser enlarges; the sheet "Welcome back, Maya. Your defaults are restored." Kettle shows its new
   lock screen (the goal). **Continue**.
5. **mum** (felt). Kettle enlarges; Mum's two messages arrive. **Open Mum**: the thread opens at **Jun 2023** and she
   scrolls down through Dec 2024, Apr 2025, Mar 2026 (the loft photo) to **Today** (it drifts on by itself if she
   does not scroll). At today: "You're 18 now…", her unsent draft "Mum, I".
6. **dad** (felt). Banner "Dad: Your mother's upset." **Read Dad**: one thread, Sep 2025 then today. **Back to Mum**.
7. **link.** **Open link**: the browser enlarges, Kettle returns to its list; the News tab, four articles.
8. **number.** "Open letter": the clinic, 4,812, the two readings. **Support while you wait**.
9. **meridian.** Send → the refusal → Close → the number grows.
10. **left** (felt). Kettle enlarges: "Sam left the group." **Read your friends**.
11. **room.** The conducted turn to the barer room (unchanged; from the new seat).
12. **search → bot → map.** The browser enlarges: the sentence finished for her, the ad, Second Thoughts, her week,
    the goal and the ring, the clip takes the page, the map, Mute 2 more / Not yet, "Rest now."
13. **junie** (felt). Kettle enlarges: Junie's badge. **Open Junie** → **Unmute** (opens at Tuesday's lines) →
    **thank you** → "x".
14. **original.** The bot's collapse, Photos, Keep current (no match), **Use original** → Match: Maya. Her own
    wallpaper comes back in Kettle.
15. **tryon → stream → terminated.** The headset, unchanged.
16. **Failed.** The device stops: the browser window shows the stream still live (or the failure and L's last line);
    Kettle beside it shows the lot's evening, readable. The Close begins by itself.

## Verification

- `npx tsc --noEmit -p .` clean; `npm test` green.
- `node tools/tour-e4.mjs --port 3123 --host 127.0.0.1 --out out/tour-e4-one-screen`: 58 frames, 0 page errors, all
  17 contract beats in order (eighteen → … → room → … → terminated). I looked at the frames from the seat; fixes made
  from them: Kettle's header overlap, the clinic letter under a longer right column, Kettle back to its list when the
  browser takes focus, Junie's thread from its first line.
- 2026-only walk (`node tools/walk.mjs --port 3123 --from-era 4 --max 900 --require-close`): **reached the Close**
  (spine done, Restart card on Daniel's monitor), 205 steps, 75 presses, exit 0. Its path through the one screen:
  wake, row-house, ❤ Reply, Continue, (the FloppySheep bookmark, a wander), Mum, scroll-down, Read Dad, Back to Mum,
  Open link, the News pager, Open letter, Support while you wait, Send, Close, the lot, the search, the ad, the bot's
  chips, Junie (Unmute, thank you), Confirm, Keep current, Use original, the headset, Junie's link, the Close's cards.
  Report: `out/walks/WALK_2026-11-08_FROM_e4_SPEEDRUN_GUIDED.md` (not committed; `out/` is ignored).

## Open questions for him

1. The window the story is on grows, the other shrinks (never hides). Is the size jump comfortable, or should both
   stay the same size?
2. Mum's thread drifts on by itself after 9 s without a scroll. Right, or should it wait for her?
3. The ▲ ▼ on the scroll bar: are they "buttons to press through time" to him, or fine as a scroll bar's arrows?
4. The pink throw now lies across the foot of the bed. Is that what he saw as the "shelf", and does it read now?
5. The VR controller beside the headset stays (it is the headset's kit). Is that the "phone on the table" he meant?
   If so, it can go too.
6. Not tried in a headset: the new seat (eye over the front of the chair), text size on the monitor, the scroll on
   the thumbstick, L's light at the monitor's corner.
