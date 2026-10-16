STATUS: live

# Start menu map — 16 October 2026

Implemented G3 behind the reinterp experience. Existing opening work in the dirty worktree was preserved. `CLAUDE.md`, the opening notes, ethics constraints and the requested code were read. `docs/reinterp/PROMPTS_CODEX_OPENING_2026-10-15.md` is absent from this checkout; the supplied task contains the G3 requirements used here.

## Behaviour

All four machines use `buildStartModel` (`src/witness/startModel.ts`), derived from the witness map. The shared canvas menu renderer (`src/desktop/apps/startMenuMap.ts`) applies each era’s palette and chrome. NOW includes its hint; NEXT shows the following two beats in grey. The short What to do panel and the full All the steps list are separate. The short panels keep their existing text, first-arrival timing and calm-screen rules. Explicit help reopens them; 2016’s board uses its strip. Every panel/list has close hits. Full-list rows retain their map order, done/current/ahead state, optional marker and room location.

The menus and frame map call the same `gameMenuBus.jumpToEra` bridge, which reuses `jumpToEraSettled` and `spine.reopen`. The machine refuses a jump during felt content; the frame remains available. Jump confirmations are frame voice. No jump calls story answers, dismissal callbacks, completion callbacks or record filing; cut selection and ledger contents remain intact. Scene cleanup includes held media, interrupted camera choreography, device state, the setup and the Close. The Close itself is never a jump destination.

The menu has a What to do row as well as All the steps, so the short panel is reachable from both requested doors. When PROGRAMS would make a legacy menu too tall it becomes Programs ▸ and opens a plain list, with no scrolling menu. Reading a menu/list holds off idle screensavers and board notices.

## String before/after

Only display strings added or changed by this task are listed. All map labels/hints and `startPanel.json` words are reused unchanged. Chrome’s ×/tick/arrow glyphs are structural marks.

| File · key | Before | After |
|---|---|---|
| slice.json · desktop.startMenu.whatToDo | absent | What to do |
| slice.json · desktop.startMenu.next | absent | Next |
| slice.json · desktop.startMenu.allSteps | absent | All the steps… |
| slice.json · desktop.startMenu.jump | absent | Jump to… |
| slice.json · desktop.startMenu.extra | absent | (extra) |
| slice.json · desktop.startMenu.listLead | absent | Everything on this list, in order: |
| slice.json · desktop.startMenu.jumpTitle | absent | Jump to… |
| slice.json · desktop.startMenu.confirmTitle | absent | Jump to {era}? |
| slice.json · desktop.startMenu.confirmBody | absent | You will go straight there and skip what comes between. You can jump back the same way. |
| slice.json · desktop.startMenu.confirmYes | absent | Jump |
| slice.json · desktop.startMenu.confirmNo | absent | Stay here |
| slice.json · desktop.startMenu.notNow | absent | Not during this scene |
| slice.json · desktop.startMenu.paperMenu | absent | Menu |
| slice.json · desktop.startMenu.help | absent | ? |
| slice.json · desktop.startMenu.programsMore | absent | Programs ▸ |
| slice.json · desktop.startMenu.listTitle.e1 | absent | Getting Started — all the steps |
| slice.json · desktop.startMenu.listTitle.e2 | absent | Restorify 2003 - all the steps |
| slice.json · desktop.startMenu.listTitle.e3 | absent | GETTING STARTED — ALL THE STEPS |
| slice.json · desktop.startMenu.listTitle.e4 | absent | EVERYTHING ON TODAY'S LIST |
| gameMenu.json · goHere | absent | Go here |
| gameMenu.json · jumpConfirmTitle | absent | Jump to {era}? |
| gameMenu.json · jumpConfirmBody | absent | You will go straight there and skip what comes between. You can jump back the same way. |
| gameMenu.json · jumpConfirmYes | absent | Jump |
| gameMenu.json · jumpConfirmNo | absent | Stay here |
| setup.json · balloons.start.text | This is the Start button. Press it any time to see what to do next, and what's on the desktop. Try it! | This is the Start button. It lists everything you can do, in order, with ticks as you go — and lets you jump to any year. Try it! |

`desktop.startMenu.button = Start`, `now = Now`, `programs = Programs`, `room = In the room`, `shutDown = Shut Down…`, `leave = Leave…`, the refusal text, `nothing` and `roomPrefix = {where}: {hint}` are unchanged. The setup’s demonstration adds All the steps… and Jump to… as grey rows using the same strings. The four era labels remain 1997 · Daniel, 2003 · Daniel, 2016 · Vera, 2026 · Maya.

## Menu rows by era

NOW/NEXT below describe the settled review-entry sample, not a hard-coded initial state. They update as progress changes. Optional room rows disappear when done. The current year in the Jump sub-list is marked and disabled.

| Era / surface | Menu rows in order | Short-panel door | Full-list rows (full / Speedrun) |
|---|---|---|---|
| 1997 · Win95 / desktop | NOW (label + hint); NEXT (two grey labels); What to do; All the steps…; PROGRAMS (desktop icons or Programs ▸); IN THE ROOM (unfinished optional room beats); Jump to…; Shut Down…; Leave… | Start → What to do; taskbar What to do | 20 / 20 |
| 2003 · Win95 / desktop | NOW (label + hint); NEXT (two grey labels); What to do; All the steps…; PROGRAMS (desktop icons or Programs ▸); IN THE ROOM (CLEAR while unfinished); Jump to…; Shut Down…; Leave… | Start → What to do; taskbar What to do | 17 / 15 |
| 2016 · Aero / workstation | NOW (label + hint); NEXT (two grey labels); What to do; All the steps…; IN THE ROOM when the map has unfinished optional room beats (none currently); Jump to…; Shut Down…; Leave… | Start → What to do; left taskbar ?; card at sign-in, strip on the short board | 12 / 12 |
| 2026 · flat paper / GraceOS bar | NOW (label + hint); NEXT (two grey labels); What to do; All the steps…; IN THE ROOM (The console while unfinished); Jump to…; Shut Down…; Leave… | Menu → What to do; top-bar ? | 10 / 10 |

| Sample entry | NOW | NEXT 1 | NEXT 2 |
|---|---|---|---|
| e1 | The questionnaire | The disk | Un-Walk, the programme |
| e2 | The daily check-in | Your story — the request | The release |
| e3 | The migration | Sign in | Lambient's question |
| e4 | The search, finished | Second Thoughts | The console |

1997’s sample desktop programs are A:\, Session and lamby_rig.exe. 2003’s sample programs are Restorify, Care Log, Release Work ’97, Family Form ’97 and Your file. These are read from the icons actually drawn, so later desktop programs appear automatically.

## Beat id → All the steps row

✓ means done, ▸ current, · ahead. The state comes directly from `mapState`; the table below shows the stable row text and cut membership, without imposing a sample tick. All optional rows retain (extra), including after completion. Locations reuse the existing In the room and roomPrefix wording.

### 1997 · Daniel

| # | Beat id | Full-cut list row | Speedrun |
|---|---|---|---|
| 1 | `e1:profile` | The questionnaire | same |
| 2 | `e1:kit` | The disk | same |
| 3 | `e1:read` | Un-Walk, the programme | same |
| 4 | `e1:pray` | The prayer | same |
| 5 | `e1:pledge` | The pledge card | same |
| 6 | `e1:connect` | Going online | same |
| 7 | `e1:web` | The fellowship's page | same |
| 8 | `e1:browse` | The web and the ring (extra) | same |
| 9 | `e1:channel` | The channel | same |
| 10 | `e1:wall` | The wall behind you (extra) · In the room: behind you | same |
| 11 | `e1:request` | Rob's request | same |
| 12 | `e1:image` | The picture | same |
| 13 | `e1:dm` | The private message | same |
| 14 | `e1:packet` | The placement letter | same |
| 15 | `e1:form` | The Family Form | same |
| 16 | `e1:diary` | DIARY.TXT | same |
| 17 | `e1:racket` | The racket on the wall (extra) · In the room: the wall by the bed, to your left | same |
| 18 | `e1:rootcause` | Root Cause Digger (extra) | same |
| 19 | `e1:handheld` | Your handheld (extra) · In the room: the bed | same |
| 20 | `e1:update` | The update | same |

### 2003 · Daniel

| # | Beat id | Full-cut list row | Speedrun |
|---|---|---|---|
| 1 | `e2:assistant` | The assistant | same |
| 2 | `e2:checkin` | The daily check-in | same |
| 3 | `e2:story` | Your story — the request | same |
| 4 | `e2:release` | The release | same |
| 5 | `e2:tapes` | The tapes | omitted |
| 6 | `e2:cut` | The edit | omitted |
| 7 | `e2:online` | Your story, online | same |
| 8 | `e2:yourfile` | Your file (read only) (extra) | same |
| 9 | `e2:forum` | Harbor Forums (extra) | same |
| 10 | `e2:apply` | The application (extra) | same |
| 11 | `e2:clear` | CLEAR (extra) · In the room: the desk | same |
| 12 | `e2:send` | A summons · In the room: the floor | same |
| 13 | `e2:message` | A message from outside | same |
| 14 | `e2:thread` | The thread | same |
| 15 | `e2:alert` | The intervention | same |
| 16 | `e2:residue` | What is left | same |
| 17 | `e2:update` | The update | same |

### 2016 · Vera

| # | Beat id | Full-cut list row | Speedrun |
|---|---|---|---|
| 1 | `e3:migrate` | The migration | same |
| 2 | `e3:signin` | Sign in | same |
| 3 | `e3:consent` | Lambient's question | same |
| 4 | `e3:work` | Two pieces of work | One piece of work |
| 5 | `e3:record` | Your record (extra) | same |
| 6 | `e3:jobs` | The other jobs (extra) | same |
| 7 | `e3:recommend` | Tag the video (extra) | same |
| 8 | `e3:group` | Post to the group (extra) | same |
| 9 | `e3:phone` | The phone · In the room: the phone on its stand, left of the monitor | same |
| 10 | `e3:vote` | The vote · In the room: the phone | same |
| 11 | `e3:cascade` | The group · In the room: the phone on its stand | same |
| 12 | `e3:update` | The update | same |

### 2026 · Maya

| # | Beat id | Full-cut list row | Speedrun |
|---|---|---|---|
| 1 | `e4:wake` | The screensaver | same |
| 2 | `e4:l` | L, on the laptop · In the room: the laptop | same |
| 3 | `e4:search` | The search, finished | same |
| 4 | `e4:site` | Second Thoughts | same |
| 5 | `e4:matchmade` | The console (extra) · In the room: the bed | same |
| 6 | `e4:steps` | L's five turns | same |
| 7 | `e4:headset` | The headset · In the room: the headset on the desk | same |
| 8 | `e4:session` | The session on the glass · In the room: the glass | same |
| 9 | `e4:commons` | The Commons · In the room: the hall | same |
| 10 | `e4:close` | The update fails · In the room: the desk | same |

Speedrun membership mirrors the currently implemented cut: 2003 skips the tapes player and edit; both are excluded via `map.json` metadata. 2016 uses One piece of work, its existing Speedrun hint and `oneJobDone`, so its tick agrees with the short panel. Other optional content remains listed because that cut still permits it; G4’s future route changes are not assumed.

## Verification

- `npm run dev -- --host 127.0.0.1 --port 3222 --strictPort`: serving this workspace. The stale server previously occupying 3222 served `/private/tmp/opening-blockers-clean`; it was stopped before the successful runs.
- `npm run build`: PASS (includes TypeScript). Vite reports its existing large-chunk warning.
- `npm test`: PASS — invariants, rooms, spec, licences and Lamby guide.
- `node tools/start-menu-map-probe.mjs 3222`: 21/21 PASS, zero page errors.
- `node tools/walk.mjs --port 3222 --max 1400 --one-era`: PASS — 181 presses over 277 steps, reached e2 with spine e2 and an empty console; no `sm-jump*`, `jump-*` or `go-here*` story presses. Output: `out/walks/WALK_2026-10-16_ONE_ERA.{json,md}`.

Targeted checks:
- PASS — 2003 full list: 17 ordered rows, map ticks update through debug beat.
- PASS — 2003 What to do reopens, also after Caleb clears the desk.
- PASS — 2003 → 2016 → 1997 through menus; cancel preserves records and era.
- PASS — era 1: menu, list, confirm and help at both viewports.
- PASS — era 2: menu, list, confirm and help at both viewports.
- PASS — era 3: menu, list, confirm and help at both viewports.
- PASS — era 4: menu, list, confirm and help at both viewports.
- PASS — felt Messenger dims machine Jump; frame Go here works and Esc closes.
- PASS — 2016 board strip reopens from ? and Start; both close controls are published.
- PASS — frame Go here from mid-1997; navigation files nothing and leaves the cut alone.
- PASS — menu jumps out of 2026 never complete the Commons or add arrival records.
- PASS — list rendering ticks and current marker match the map, before and after progress.
- PASS — crowded 2003 Start collapses Programs into a plain sub-list.
- PASS — machine maps still name their era after the Close was previously completed.
- PASS — era 3: existing Lamby Start nudge points to and opens the new menu.
- PASS — era 3: Shut Down refusal stays in the machine's own chrome.
- PASS — era 4: existing Lamby Start nudge points to and opens the new menu.
- PASS — era 4: Shut Down refusal stays in the machine's own chrome.
- PASS — 2016 required notice covers the full list and retains its one-press close.
- PASS — taskbar help remains one press away while the Start menu is open in every era.
- PASS — Speedrun uses its own work label and excludes skipped testimony player/edit.

Evidence is in `out/start-menu-map/`: `probe-results.json`, 1280×720 and 390×844 room screenshots of the Start menu, full list, confirmation and What to do control for every era; source-canvas close-ups in `surfaces/`; the 2016 board strip and frame confirmation as additional captures. All 32 requested viewport captures were inspected in per-era contact sheets; source canvases were inspected for typography, row order, ticks, close controls and clipping. The 2016 strip was also inspected, along with Lamby’s new Start pointers and the native 2016/2026 Shut Down refusals.

The walker’s FORBIDDEN pattern excludes `sm-jump*`, `jump-*`, `go-here*`, `steps-close` and non-story help/list controls. Targeted probes exercise these controls separately. The post-Close map test seeds a completed-close ledger entry; it is not a fresh full-piece walk. Lamby’s existing Start nudge now points to and opens the new 2016/2026 controls too. The taskbar/top-bar help controls remain live while the menu is open.

Not verified: an actual Quest 3 / Vision Pro headset, controller hit testing, 72 Hz performance, or a physical phone/tablet with gyro/touch. Desktop/portrait browser screenshots are headless Chrome evidence, not device or headset evidence.

## Files

New: `src/witness/startModel.ts`, `src/desktop/apps/startMenuMap.ts`, `tools/start-menu-map-probe.mjs`, this report. Existing OS, workstation, GraceOS browser, start panels, witness map, frame menu/bus, settled jump and device/media cleanup were integrated in place. No new colour definitions, storage or runtime network calls were introduced.
