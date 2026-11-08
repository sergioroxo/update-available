STATUS: live

# 2026 v3 room — Codex, 8 November 2026

Branch: `codex/e4-v3-room`, based on `origin/reinterp` at `452ef090`.

## Controller hands (step 6)

Skipped as permitted. The complete TRYON reveal remains on the glass. A controller-hand replacement requires a reliable tracked-hand lifetime and a single ownership switch for the glass painter; without an in-headset check, that would risk showing two pairs of hands or leaving a controller unrepresented. No second reveal was added.

Quest 3 / Vision Pro: no headset was available. Conducted turns, ceiling readability and room staging still need an in-headset check; browser captures cannot establish XR comfort or performance.

## Scope and provenance of every returned belonging

Only Maya's belongings are instantiated by `src/room/e4Room.ts`; it is mounted only behind `?reinterp=1`, and enabled only during 2026. The old remove lists are unchanged. No Vera/Daniel belongings, Nuala's mug, Wick card, racket, release poster, retired ballroom lamps or house banners are restored.

I checked the `_doc` notes in `data/room/reinterp_deltas.json` and `git log -S` for `e_plant_pot`, `e_throw`, `e_frame`, `e_flagA`, `e_pinPhotoA` and `e_pinboard`, then read the removal/ownership commit messages. The distinction matters: these are new readable depictions of Maya's things, rather than wholesale resurrection of the old Room 3 dressing.

| Returned belonging | Previous ownership/removal evidence | What this branch returns |
|---|---|---|
| Plant (`maya-pot`, `maya-leaves`) | `14ae67ec` (S74) explicitly describes Maya's newly furnished room; `e_plant_pot`'s note puts her plant near her window. `8b8fca07` removes pot/top because the primitive boxes were unreadable, not because they belonged to a previous resident. | Same floor location, a cylindrical pot and a single mesh of seven leaves. Both render instances are culled at `number`. |
| Pride flag (`maya-pride`) | `60a568b1` describes the flag among Maya's own dressing; `a50a9437` records its desaturation. `427d5ff7` removes five unreadable planks, explicitly as a geometry/readability correction. | One painted textile in the existing theme's muted blue/pink/cream, not the old five blocks or the apparatus's ally badge. Removed at `meridian`. |
| Friends' strip (`maya-friends`) | `60a568b1` identifies her photographs as hers. `427d5ff7` removes the pinboard/photo rectangles as unreadable cuboids. The new friends' strip itself is required by the v3 plan and this brief. | Three original faceless group snapshots of Maya's friends. No image from the retired ballroom is reused. Removed at `left`, replaced by the system's framed goal. |
| Pink throw (`maya-pink-throw`) | `14ae67ec` adds Maya's personal belongings; `8b8fca07` removes `e_throw` among Room 3's last primitive boxes. The v3 plan specifically gives Maya a pink throw. | A thin textile at the authored bed location, pink initially and grey at `left`. |
| Desk frame (`maya-desk-photo`) | `14ae67ec` introduces `e_frame` as Maya's small frame; its note records the later correction of a floating frame onto the shelf. `427d5ff7` removes the unreadable 0.11 m frame. The present brief relocates its narrative job to her desk. | A painted frame standing on her desk at `(5.02, 0.88, 0.30)`; the shared goal from `newyou`, her original at `original`. |

The existing bed, rug and curtains stay in place. Their materials become the system's crude grey defaults at `meridian`, then restore exactly. They are excluded from shared batching so tinting one cannot recolour another prop or persist into another era.

## Implementation

- `number`: the plant disappears; a deli ticket shows the browser's read-only `currentClinicNumber`. Every increase repaints and enlarges the ticket.
- `meridian`: the pride flag disappears; bedding, curtains and rug lose their own colours.
- `left`: the friends' strip disappears, the pink throw turns grey, and the shared `drawGoalPicture` replaces the strip with a framed system portrait.
- After a 1.5 s breath, the existing conducted camera mechanism turns toward the changed room. The 9.2 s turn and 0.5 s settling hold fit inside `ROOM_WAIT.max` (11.2 s after `left` under the normal authored seat). `room` is marked only after the move finishes at its target, never on a look. Its quiet row is present in the frame map and generated era site.
- One article strip appears per opened article. All four strips share one painted mesh and one texture, preserving holes between the papers. The strips and ticket are readable from the seat at the conducted bearing.
- The ceiling shares `drawContagionClip` and the monitor's read-only presentation clock. Room painting happens after the screens update, so both sample the same clock. Junie's node changes from red to warm when `junie` is marked. During the stream, the network becomes the audience and follows the stream's actual 41 → 42 count.
- All painted textures use `FILTER_NEAREST`. The frame uploads only when its image changes, the news only when the article count changes, the ticket only when its number changes, and the animated ceiling at an 8 Hz presentation boundary. Removed personal props use `cullAbsentProps`, so zero scale does not leave a draw call behind.
- The fundraiser poster replaces the old ballroom wording and trophy. The broadcast carries its birthday/fundraiser title and a mutual-aid bar. There is no donation control and the apparatus records no funding information.
- `terminated`: Maya's belongings, their poses and colours return; both goal pictures leave; the strips, ticket and ceiling apparatus disappear. Changes are reapplied on `ledgerGeneration`, even when the beat module's version did not change.

## The lot's evening

The five supplied lines are exact in `data/dialog/s4_v3.json`, with the `house` id preserved. They arrive every seven seconds after the bot's mute answer, whether the answer muted the chat or left it open. A muted list exposes only a grey unread count and the word “muted”, never the message previews; no arrival calls a sound, glow, guide or filing. An open, unmuted thread shows the arrivals normally.

When the device returns, Kettle opens its list. The muted chat reads “the lot · 5 unread” and opens to the waiting messages; small thread pages let every line be read on the laptop. Opening the chat clears its unread count. The stopped device routes those presses directly to the messenger without re-entering the system's browser. A ledger wipe clears the evening state.

## Verification and measurements

- `npm run dev -- --host 127.0.0.1 --port 3116`: running successfully from the isolated worktree.
- `npx tsc --noEmit -p .`: passed.
- `npm test`: passed, including no-network/no-storage, room folding, spec/ethics, licences, generated sites and Lamby checks. Generated map/era-site assets are committed.
- `node tools/e4-room-check.mjs`: passed. It exercises actual render instances, the number getter, both evening-message choices, all five retained lines, termination restoration and a generation-only ledger wipe. The diagnostic explicitly distinguishes state checks from reachability.
- `node tools/tour-e4.mjs --port 3116 --host 127.0.0.1 --out out/tour-e4-room-verified`: 58 principal frames plus the room/ceiling views, **zero page errors**. Every contract beat reached in order, including `left → room → search`, then `tryon → stream → terminated`.
- `node tools/stills.mjs --port 3116 --only e4 --no-close --out out/stills-e4-room-verified`: 8 stills. No entrance/full-era walk was run.
- Focused seat reveal: `out/e4-room-readable.png`; renderer/chat data: `out/e4-room-check.json`; budget data: `out/e4-room-budget.json`. The tour's images and `TOUR.md` are regenerable local artifacts, not committed binaries.

The fullest opening is measured at `(4.4, 1.16, 0.84)`, pitch −10°, in all four directions. A second focused renderer pass compares the same bearings after all three refusals:

| Seat bearing | Opening | After the refusals |
|---|---:|---:|
| 267° (desk) | 34 | 34 |
| 357° | 20 | 18 |
| 87° | 67 | 66 |
| 177° | 23 | 25 |
| Peak of the four bearings | **67** | **66** |

The room layer's drawn meshes drop **6 → 5**, despite adding the ticket, goal portrait and article papers. Every removed prop is actually culled. The news shares one draw call; the ceiling adds one only when its beat is active. New objects can move work between bearings, hence the 177° view rises by two while the peak falls. Nothing measured exceeds 75.

The stream measures **7 / 7 / 7 / 7** at yaw 270° / 300° / 240° / 90°. The ceiling's audience surface is above those horizontal views. These are browser draw-call measurements, not a claim of Quest frame rate or headset validation.

## Feature commits

| Step | Commit |
|---|---|
| 1 — Maya's belongings and the full restyle | `d9c54e7a` |
| 2 — article papers and current clinic ticket | `6ded2d07` |
| 3 — conducted reveal and map row | `f07e25dd` |
| 4 — ceiling network and shared clip | `681c89b1` |
| 5 — the lot's evening, muted or visible | `a7e062d6` |
| 6 — permitted hands omission, recorded | `0e24002b` |
| 7 — birthday fundraiser and viewers | `5955a546` |
| 8 — the room restored | `ae2d63c7` |

Capture-driven integration fixes: `d32a2941` (private materials, shared news mesh, dirty uploads, diagnostic tools) and `3a4346cd` (readable side-wall orientation and reveal framing).


## 2026-only walk

`node tools/walk.mjs --port 3116 --from-era 4 --max 900 --require-close` ran in the background with output redirected to a file. I read only its final lines and the completed report, `out/walks/WALK_2026-11-08_FROM_e4_SPEEDRUN_GUIDED.md`.

**PASS — exit 0; Close reached; spine done; retro Restart card showing on Daniel's monitor.** 212 steps, 74 presses, clean console. The ledger contains all 18 contract beats, with `left → room → search` in order. The walk chose **Not yet** at the mute choice; the full capture tour chose **Mute 2 more**, and the focused checks cover both branches and all five supplied messages. This was a 2026-only run, not an entrance-to-Close claim.

The completed walk and 58-frame tour ran at `3a4346cd`. Final polish `0f959f5a` then moved the fund bar above the dancer, made muted badges neutral grey, kept the stopped messenger's threads readable, and made room completion depend on the scripted leg rather than the visitor's later bearing. That last change only removes a possible stall: a real two-key, 12° look away now still produces `left → room` (captured yaw 203°, authored target 215°). The final TypeScript check, `npm test`, actual stopped-laptop press route and free-look regression all pass. A fresh 8-still pass is in `out/stills-e4-room-release`; its fundraiser image shows the unobstructed fund bar. No additional full walk was spent on those bounded follow-up changes.

The stopped-device check opens **Open the lot**, pages through all five lines through the shell's real `pressLaptop` route, clears the unread count and confirms **zero additional ledger entries**. `out/e4-room-returned-release.png` shows the final grey badge before opening.

The branch preserves the shipped build's behaviour. Quest 3/Vision Pro hardware validation remains pending, as noted above; no claim of measured headset frame rate is made.
