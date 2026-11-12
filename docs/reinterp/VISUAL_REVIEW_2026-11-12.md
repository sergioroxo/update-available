STATUS: live

# Visual review of the whole piece, and the ten weakest surfaces (S375, UiB job 19 Part A)

*12 November 2026. Judged by Opus from the S375 photography run (Sonnet): 614 surfaces in
`~/update-available-uib/out/s375/` (`INDEX.md`, `index.json`, the contact sheets `sheet-*.png`), every contact sheet
looked at, and about forty frames and canvases opened at full size. Nothing in `src/`, `data/` or `public/` changed.
The mocks are drawn PNGs made by `tools/s375-mocks.py` (committed with this doc) into `out/s375/mocks/` (untracked).
Every colour in a mock is read from `src/desktop/theme/*.ts` at run time, or sampled from the photograph it answers;
the faces are job 18's vendored ones (Fixedsys Excelsior, Roboto, Inter).*

Paths below are relative to `~/update-available-uib/out/s375/` unless they start with `src/`, `data/`, `public/` or
`tools/`.

## How to read the scores

Each surface (near-identical states grouped) gets five scores, 1–5:

- **C, craft.** Finished (5), or a placeholder that stayed (1–2)?
- **P, period truth.** Does it look like its year's real software and hardware?
- **R, register.** The system's surfaces may glitter; felt scenes stay bare; the witness side is sharp; the frame is plain.
- **L, legibility,** as *computer / headset*. "–" means there is no headset photograph (see the gaps at the end).
- **Co, coherence.** Does it sit well beside its neighbours?

**The bar is the benchmark surfaces**, which score as follows. They are on his keep list and were not redrawn or
nominated.

| benchmark | C | P | R | L | Co |
|---|---|---|---|---|---|
| THE GREAT BECOMING, its sign pictures and check marks (2026 clip) | 5 | 5 | 5 | 4/4 | 5 |
| MATCH MADE SIMPLE (title, board, the picture, the card) | 5 | 5 | 5 | 4/4 | 5 |
| The 2026 screens (AI Mode, Summary by AI, Sponsored, Memory updated; Larkpost, Mum's sites) | 5 | 5 | 5 | 3/3 | 5 |
| The Lexicon after job 17 B | 5 | 4 | 5 | 4/– | 5 |

**reached:** W = drawn on the walk (`?cut=speedrun`, the default visit); T = real presses by a tour; R = review route
only. R is not "unreachable" (INDEX "Notes and gaps"), but no R surface was put in the ten.

---

## 1 · The ten weakest surfaces a player meets

The ranking is by the five scores, weighted by how long and how early a player meets the surface. Keep-list
surfaces were left out (see §3). Every one of the ten is on the walk's path or in the default view from a seat.

| rank | surface | part | before (photo) | mock | one line |
|---|---|---|---|---|---|
| 1 | **The 1997 window**: a flat navy slab and a 12 cm white square for the moon | room (C) | `xr/sweep/e1-room-front.png`, `browser/stills/e1-00-entrance.png` | `mocks/m01-1997-window.png` (+ `m01-night1997-print-x8.png`) | Draw the night (a `night1997` print, as 2003/2016/2026 already have), with the moon in it. |
| 2 | **The 1997 profile pictures**: two of six are pale yellow on paper (≈1.05 : 1), the rest sit at a third of their tiles | screens (B) | `browser/sweep/e1-profile.png` + `.canvas-os.png`, `browser/tour-e1/03-profile-icons.png` | `mocks/m02-1997-profile-pictures.png` | Six 32 × 32 icons in the Win95 manner (1 px black outline, flat fills). |
| 3 | **The 2003 desktop**: a flat Restorify-blue field with a navy slab across the top, behind all of 2003 | screens (B) | `xr/sweep/e2-held-phone.png` (the headset view of the desktop), `browser/sweep/e2-message-toast.png` + canvas | `mocks/m03b-2003-desktop-calm.png` (default), `mocks/m03-2003-desktop.png` (louder) | A Restorify wallpaper in XP's manner (hill, sky, the lamb, from CAL_2003), the brand as an OEM mark, the status in a tray balloon. |
| 4 | **The Close's four panels**: plates baked on 26 Sep (2003's blank window, 2026's removed laptop), the hint drawn under the Sources button ("…to ope"), system faces | screens (B) | `browser/sweep/close-panel-1997.png`, `close-panel-2026.png`, `public/assets/close/era1–4.jpg` | `mocks/m04-close-panels.png` | Re-bake the plates from today's rooms, wrap the hint to the left of the button, set the title in Fixedsys and the paragraph in a vendored face. |
| 5 | **The Close in front of the machine**: two source labels and a link line cross Daniel's CRT under the 1997 panel; at the Restart card a label is blown up across its bezel | room (C) | `close-flow/desktop-f070.png`, `close-flow/desktop-f088.png` (`xr-f088.png`) | `mocks/m05-close-machine.png` | Nothing between the seat and the machine (R4-15's rule, regressed). |
| 6 | **Lamby's cartoon** (2003, the software's boot over the jingle): grey blocks on a black void | screens (B) | `browser/sweep/e2-cartoon.png`, `e2-cartoon-late.png` + canvases | `mocks/m06-2003-lamby-cartoon.png` | A 2003 Flash cartoon of itself: his room at night, a puffed cloud of static, then the screen's sunburst. |
| 7 | **Daniel's 1997 bed**: the blanket reads as a near-black slab, the darkest mass in the warm room | room (C) | `browser/stills/e1-00-entrance.png`, `xr/sweep/e1-room-back.png` | `mocks/m07-1997-bed.png` | The navy-and-red plaid PLAN_ROUND5 promised, muted, as a printed surface. |
| 8 | **The 2016 lock screen** (the Handset Window, met all evening): grey target rings | screens (B) | `browser/sweep/e3-board.canvas-phone.png`, `xr/sweep/e3-board.png` | `mocks/m08-2016-lock-screen.png` | A photograph that is hers (the harbour wall at dusk, nobody in it) under the clock. |
| 9 | **The 2003 flip phone held to the eye**: a dark slab that reads as a 2016 phone | room (C) | `browser/sweep/e2-held-phone.png` | `mocks/m09-2003-flip-phone.png` | A clamshell: earpiece, a printed mark, the hinge and the keypad half falling away. |
| 10 | **GracePlatform's Today board**: three of the four job cards show grey bars as their picture | screens (B) | `browser/sweep/e3-board.canvas-workstation.png`, `xr/sweep/e3-board.png` | `mocks/m10-2016-board-cards.png` | A flat 2016 picture of each job (a map with flagged pins, a phone with waiting calls, the group's faceless members). |

**Next in line** (if one of the ten cannot be built, take the next): 11. the 2026 shelf CRT, a black square on Maya's
left wall (`xr/sweep/e4-room-left.png`); 12. the SisterSignal sign-in, a big empty pane with one pale button
(`browser/sweep/e3-floppy-finale.canvas-workstation.png`); 13. the dormant record on the 1997 back wall, a bare black
rectangle (`xr/sweep/e1-room-back.png`); 14. `lamby_rig.exe`, a developer's rig on a 1997 desktop
(`browser/sweep/e1-lamby-rig.canvas-os.png`); 15. the 2016/2026 marquee screensavers, a line of plain text on a slate
(`index.json` `screensavers-marquee-e3-1280x720`, in the photo worktree's `out/more-screensavers/`; review route).

### #1 · ROOM · The 1997 window (Daniel's night) — C 1 · P 3 · R 3 · L – · Co 2

**Where:** in the default view from the seat at the start of the piece, left of the monitor and almost as big as it;
in the 1997 still and on the Close's 1997 panel. **What is wrong:** `windowPane` is a flat emissive `#2C3A5C` box and
`moon` a 12 cm `#F3EAD8` cube in front of it (`data/room/era1.json` lines 12–13). S299 gave 2003, 2016 and 2026 a drawn
view of their own year (`printArt.ts` `dusk2003`, `evening2016`, `night2026`) and left 1997 alone so the moon would be
"untouched". Beside three drawn windows, the one the piece opens on is the only placeholder left. **Proposal:** a
`night1997` print, drawn like the other three with the prints' palette: the moonlit sky in bands, dithered at the
seams; a full moon with a halo and craters (the cold light the July direction promised, now visible as a thing); a few
stars; a suburban street in silhouette (gabled roofs, a chimney, a tree, a telephone pole and its wire); one window
still lit across the street, and a streetlamp's pool. It is quiet and cold, the system's light, against the lamp's
warmth. The moon cube goes: the moon is in the picture. **Files:** `src/room/printArt.ts` (add `'night1997'` to
`PrintId` and `PRINT_SIZE` (72 × 82, like `dusk2003`), a `night1997()` beside `dusk2003()`, and its case in
`drawPrint`); `data/room/era1.json` (`windowPane` gains `"print": "night1997"`, or add a `winView1997` plate in
`data/room/reinterp_deltas.json` the way `winView2003` sits at z −0.672; then drop the `moon` prop). **Check:** the wake
(`src/engine/app.ts` ≈4983–4992, `moonlight` 0.42 → 0.14) still reads, because the pane is the room's only light before
the switch; `src/room/clusterMorph.ts` "restores the small room, the moon" on a jump back, so grep it for `moon`;
the 2003 plate still covers the pane in 2003; draw calls the same or one fewer. The pane stays `FILTER_NEAREST`, a
room texture.

### #2 · SCREEN · The 1997 profile pictures — C 2 · P 3 · R 4 · L 2/2 · Co 3

**Where:** the first screen of Daniel's room, right after the entrance (walk: `walk-e1-006`). **What is wrong:**
`drawProfileIcon` (`src/desktop/os.ts` 3791) draws the star and the moon in `ERA1.tooltip` (#ffffcc) on `ERA1.paper`
(#f5f4ed): about 1.05 : 1, so they are invisible on the computer and in the headset. The other four are 20–24 px
marks in 36 px wells. The rest of the window is good, which makes the row look unfinished. **Proposal:** six 32 × 32
icons in the Win95 icon manner (a 1 px black outline, flat fills, one dithered shade): a five-point star, a cassette
(the tapes), a red flower, a blue bird, a heart, a crescent on a navy disc. ERA1 colours only. The chosen picture comes
back as "self-image: aspirational" in the recap, so it should look like something a sixteen-year-old would pick.
**Files:** `src/desktop/os.ts` `drawProfileIcon` (the six cases) and its one caller in `drawReinterpProfile` (≈3850:
offset `boxX + 4, boxY + 4` for a 32 px icon in the 36 px well). **Keep:** the ids in `data/strings/opening.json`
`o3_icons`, the hits `picon:<id>`, the selection ring.

### #3 · SCREEN · The 2003 desktop — C 2 · P 2 · R 3 · L 5/4 · Co 2

**Where:** behind every window of 2003, from Lamby's introduction to the update (walk frames, the 2003 stills, the
headset view `xr/sweep/e2-held-phone.png`). **What is wrong:** `drawDesktop` fills the screen with `ERA1.titleBlue`
(`desktopColors()` for e2, `src/desktop/os.ts` 2038) and `drawEraDesktopChrome` paints a navy slab 460 × 44 across the
top with "Restorify 2003 / journey file migrated" (os.ts 3421). This is S24's "minimal per-era desktop re-skin",
still there. S295 gave 2003 XP windows, buttons and a taskbar; the ground under them is still a placeholder.
**Proposal:** a Restorify wallpaper in XP's manner, drawn in bands and dithered in CAL_2003's own colours (the 2003
calendar's palette): a blue sky, two clouds, a sun low on the left, two rolling green hills, and the lamb on the
brow. This is the programme's picture of "one day at a time", and a period OEM wallpaper. The brand moves onto the
wallpaper as an OEM mark (bottom right, "one day at a time" under it). The status line is said once, in an XP tray
balloon above the clock, then goes. Icon labels get XP's dark drop shadow so they read on a picture. **Taste:** the
calm version (`m03b`) is the period-true default; the version with hard sunburst rays (`m03`) is "over the top", for
his eye. **Files:** `src/desktop/os.ts` `drawDesktop` (the e2 ground) and `drawEraDesktopChrome` (no slab for e2);
`drawIcon` (the label shadow when `desktopEra === 'e2'`); a `restorifyWallpaper(ctx, W, H)` in `src/desktop/theme/`,
drawn once into an offscreen canvas and blitted (no per-frame cost). `data/strings/slice.json` `eraSkins.e2.brand` and
`status` are reused, not changed. **Keep:** every icon id and position (`icon-restorify`, `icon-era-N`,
`icon-provotype`, `icon-your-file`, the Messenger, `placement.txt`), `toast-act`, the start map's hits.

### #4 · SCREEN · The Close's four panels — C 2 · P – · R 4 · L 3/3 · Co 2

**Where:** the Close, after the nine cards, where the player reads each year's paragraph (walk: `close-panel-*`,
`close-flow-19/20`). **What is wrong:** (a) the plates (`public/assets/close/era1–4.jpg`) were baked on 26 Sep
(S177c). 2003's window is blank (before S299's dusk), 2016's desk is the old one, and 2026 shows the laptop he removed
on 8 Nov, a bare wall, no posters, no flag and no lamp. The panel says "this is the room" and shows a room that no
longer exists. (b) `panelHint` is drawn at `TEXT_X`, 24 px monospace, straight under the Sources button
(`pointCloud.ts` 785 vs `SRC_BTN`), so every panel reads "Press anywhere on this panel to ope". (c) The title is
`bold 54px monospace` and the paragraph `"Helvetica Neue", Helvetica, Arial` (`READING_FACE`, 663): system faces that
resolve differently on each machine. Job 18 vendored the piece's faces. **Proposal:** re-bake the four plates from
today's rooms, using the same seat-past-the-chair framing as now, with S177c's method. Wrap the hint into the space
left of the button, two lines, in the button's era face. Set the title in Fixedsys (the Close's own face, `FACES.close`)
and the paragraph in a vendored face (Inter), keeping S146's 28 px floor. **Files:** `public/assets/close/era1–4.jpg`;
`src/room/pointCloud.ts` `drawStoryCell` / `drawText` (the hint and the faces) and `READING_FACE`. **Keep:**
`__closePanels`'s published button rects, `panelAt`, the press-anywhere law, `tools/text-angle.mjs` green.
**His:** the 2026 paragraph itself, see §3.

### #5 · ROOM · The Close in front of the machine — C 3 · P – · R 3 · L 5/4 · Co 2

**Where:** while the 1997 panel is read, the source labels "Exodus referral map 1996" and "van den Aardweg
questionnaire 1997" and a link line run across Daniel's CRT below it (`close-flow/desktop-f070.png`). At the Restart
card, the last frame of the walk, "van den Aardweg" is blown up to a quarter of the frame and lies across the
CRT's bezel (`desktop-f088.png`). **What is wrong:** R4-15 ("Nothing between you and it — no stars, labels, link lines
or panels on the line from your eye to the machine, far or near") has regressed. The end card is the piece's last
image and it is smudged. **Proposal:** labels and link lines are kept off the seat's line to the machine. Any label
whose screen rectangle meets the machine's is moved round its arc, or faded, while the machine is in view. While the
Restart card is up the constellation recedes: labels fade, link lines go, stars stay. **Files:** `src/room/pointCloud.ts`
(the label and link pass: a cull against the machine's bounds); `src/room/closeMonitor.ts` (publish its world AABB);
the Restart card's own state for the fade. Also look at the yellow slabs round the panels (anchors or specks seen edge
on, in every panel photograph), which read as matchsticks, not stars (`src/room/specks.ts` / the anchors in
`pointCloud.ts`). **Check:** the whole machine in frame with nothing in front, on the computer and in the headset.

### #6 · SCREEN · Lamby's cartoon — C 2 · P 3 · R 3 · L 4/4 · Co 3

**Where:** 2003's software boot, over the jingle, 24 s, before Lamby's introduction (walk). **What is wrong:** the
programme's own media, which his rule says must be over the top, is grey rectangles on a black void: a block of
dashes for the cloud, outline squares for a bed, a dark box for a monitor. It is the least finished picture in 2003
and sits right between the crawl and the introduction. **Proposal:** draw it as a 2003 Flash cartoon of itself. *Asleep*:
his room at night (a dithered navy wall, a window with a crescent, the bed with a teal-and-navy quilt), a puffed white
cloud with a black outline full of a scribble of static ("never a picture of anything", the S166 law), "z z Z", the
monitor dark on its desk. *The light*: the screen switches on and throws hard sunburst rays across the room, the cloud
breaks into pixels, the wall and floor turn the CAL_2003 sky and hill, sparkles appear, and the screen shows the tick,
RESTORIFY, PURITY STREAK, 412 days. Lamby stands and points. The timeline (`E2_CARTOON`) and Lamby's own drawing
(`drawLambyChar`) are kept; the lyric band is unchanged. **Files:** `src/desktop/apps/lambyCartoon.ts` (the scene's
draw per phase), colours from `ERA1` and `CAL_2003` (`src/desktop/theme/calendar.ts`). **Keep:**
`data/dialog/s2_lamby.json` `cartoon.*` strings; the jingle's phrase onsets. **Taste:** how loud the light frame is.

### #7 · ROOM · Daniel's 1997 bed — C 2 · P 3 · R 3 · L – · Co 2

**Where:** the 1997 still (the room as it is first shown), the seat's left and back views, the entrance's room shots.
**What is wrong:** the Kenney bed's `carpet` part is `#2F3F66` (S179, "a navy blanket on cream sheets — bought by his
mother"; `data/room/reinterp_deltas.json` `bedModel` `partColors`). Under the lamp's orange it renders as a
near-black slab, the heaviest mass in a soft room. PLAN_ROUND5 Phase 1, which he approved ("yes to all four"), asked
for "a navy-and-red plaid (a teenager's, bought by his mother)". It was built as plain navy. **Proposal:** the plaid
as a printed surface, like the calendars: navy ground, red bands, a thin cream line, crossings dithered, a quarter of
the way toward the wall's tone (his "personal stuff muted"). The 2003 bed stays flat beige-grey, as planned.
**Files:** a `quilt1997` print in `src/room/printArt.ts` (method of `src/room/calendarArt.ts`); the bed's `carpet`
material in `bedModel`. **Measure the mesh first:** if the GLB's `carpet` UVs collapse onto one palette texel, the
print cannot show on it, so lay a thin printed plate on the blanket's top face instead, a separate prop. Never batch
it (`src/room/batching.ts`, the batch-duplication rule). +1 draw call at most (1997 reads 44–51). **Taste:** plaid
(his plan) against the plain navy (his S179 build).

### #8 · SCREEN · The 2016 lock screen — C 2 · P 3 · R 3 · L 5/4 · Co 3

**Where:** the Handset Window beside GracePlatform, all evening, every 2016 frame (2,196 walk samples carry its
"Tuesday 6 December"). **What is wrong:** `wallpaper()` (`src/desktop/theme/phone.ts` ≈418) is three slate bands and
white rings at 10 % alpha. It reads as a radar or a placeholder, and nothing on the phone is Vera's. Her phone is the
life side of the room; it is where Nuala's thread and the group's news arrive. **Proposal:** a lock-screen photograph
that is hers: the harbour wall at dusk, the sea, a sun road, two masts, a bollard and a lamp, nobody in it (no
likeness). It is a place the system's own "places to avoid" list would flag, held quietly on her phone. It is drawn
soft (the 2016 phone is a smooth, mipmapped display, R4-37), in PHONE, ERA3 and PRINT colours, with the lock screen's
own dim so the clock reads. **Files:** `src/desktop/theme/phone.ts` `wallpaper()` (used by
`src/desktop/apps/phoneE3.ts` 604 and 696, the lock and home screens). **Keep:** the clock, date and Unlock positions
and hits; job 18's phone type floor. **Taste:** the subject (harbour, two mugs on a sill, the Wick's window); felt
side, so no satire and no mechanics.

### #9 · ROOM · The 2003 flip phone held to the eye — C 2 · P 2 · R 4 · L 5/– · Co 3

**Where:** 2003, when the phone is brought to the eye (walk: `e2-held-phone`, `-play`). **What is wrong:** the held body
is a flat dark rectangle with a thin rim around a large LCD: a 2016 slab, not a 2003 clamshell. Selective fidelity
asks for the system's instruments to be the most defined objects, and this one is the accountability app's carrier.
**Proposal:** model the held phone as an open clamshell. The top half has a rounded shell with an earpiece grille and
a printed RESTORIFY mark under the glass; a hinge barrel with a charging LED runs across the bottom; the keypad half
falls away beyond it, foreshortened. Body colours come from HANDHELD and CLEAR. The LCD canvas is unchanged. The phone
at rest on the desk can stay a closed bar. **Files:** `src/room/heldDevice.ts`, `src/room/deviceHardware.ts` (the
2003 phone's held geometry). **Check:** ≤3 heroes in 2003 (monitor, phone, …); the hand ray still finds it.

### #10 · SCREEN · GracePlatform's Today board — C 3 · P 4 · R 4 · L 4/3 · Co 3

**Where:** 2016's hub, every time she comes back to Today (walk). **What is wrong:** "Correct a testimony" has a little
picture of a room, but "The places list" and "Return the family calls" have grey bars with a coloured tick, and "Post
to the group" has two blue bars. Beside the material-design cards and the testimony editor's red strike-throughs,
three of the four pictures are wireframes. **Proposal:** a flat 2016 picture of what each job does. Places: a street
map with three flagged pins, one red. Calls: a phone disc with a count badge and three waiting message bubbles with
the rose spine. Group: the group's bar with "New Hope Stories", six round members with no faces, a composer. ERA3
colours only. The system's surface may charm, and should. **Files:** each surface's `thumb(ctx, x, y, w, h)` called by
`drawTile` (`src/room/graceQueueLite.ts` ≈2274): `src/desktop/apps/placesList.ts` (33), `familyCalls.ts` (140),
`groupTask.ts` (33). The other jobs' thumbs (`clearComments.ts`, `courseBuilder.ts`, `podcastOrder.ts`,
`recommendTask.ts`, `storyCut.ts`) should be checked the same way when their tiles are on the board; their sweep
frames show the board, see §5. **Keep:** tile rects and hits, labels and notes from `data/dialog/s3_queue.json`.

### What the ten need from Parts B and C (for the builder)

- **Part B (screens):** #2, #3, #4, #6, #8, #10. All are 2D canvas. Keep every hit id, every published affordance and
  every string. A before/after for each from the seat on the computer and in the headset. `tools/text-angle.mjs` green.
- **Part C (room):** #1, #5, #7, #9. #1 and #7 are printed surfaces (`printArt.ts`), #5 is composition at the Close,
  #9 is a held device. Measure the mesh, never batch a written material, `generate()` with numeric ids, ≤75 draw
  calls, no glass moved or shrunk.

---

## 2 · Every surface, scored

Grouped; ids are `index.json`'s. "walk-eN-NNN" frames are the walk's own views of the surfaces below and are scored
with them.

### The entrance (41 surfaces; all W; no headset photographs, see §5)

| surface (ids) | what / where | C | P | R | L | Co |
|---|---|---|---|---|---|---|
| `entrance-*-wake-title`, `setup-stars-desktop-00-wake`, `entrance-played-01/02` | the front door: YOUR UPDATE HAS FAILED in the 5×7 face over the stars | 5 | 4 | 5 | 5/– | 5 |
| `entrance-*-arrival-star`, `entrance-played-03`, `-26/27` | the stars gathering; "Restoring previous session" | 4 | – | 4 | 4/– | 4 |
| `setup-stars-*`, `entrance-played-04…14`, `-24` | Lamblippy Setup floating in the stars: the teal desktop, Lamby's balloon, Yes/No | 4 | 5 | 4 | 4/– | 4 |
| `entrance-played-07/11/15/16` | the setup's windows: whose session, How to look (three pictograms), the content note | 4 | 4 | 5 | 4/– | 4 |
| `entrance-played-08/09` | the chime test and volume | 4 | 4 | 4 | 4/– | 4 |
| `entrance-played-17…23` | the opening film (THE PLATFORM, the 1997 desk, LambyOS ad, OVER 30 YEARS SOLD AS CARE!) | 4 | 4 | 5 | 4/– | 4 |
| `setup-laptop-*`, `entrance-played-28` | the setup and boot on Daniel's CRT as the room arrives | 4 | 5 | 4 | 3/– | 4 |

### 1997 · Daniel's room (96; 74 W)

| surface (ids) | what / where | reached | C | P | R | L | Co |
|---|---|---|---|---|---|---|---|
| `e1-room-front/left/right/back/desk`, `tour1-room`, `tour1-seat-desk`, `stills-e1-00/01/02` | the room: the box lamp, three pixel-art posters and the calendar (good), the CRT and tower, **the window (#1)**, **the bed (#7)**, a bare back wall | W (front) / looking | 3 | 4 | 4 | – | 3 |
| `e1-boot`, `tour1-boot`, `walk-e1-003/004` | LambyOS starting up ("This computer was made for you") | W | 4 | 5 | 4 | 4/4 | 5 |
| `e1-profile`, `tour1-profile-icons`, `tour1-look-profile-filled` | Profile setup, **the pictures (#2)** | W | 3 | 4 | 4 | 3/3 | 4 |
| `e1-recap`, `tour1-look-recap` | Profile complete ("You can change none of this.") | W | 4 | 4 | 5 | 5/4 | 5 |
| `e1-desktop`, `tour1-look-desktop` | the teal desktop and its icons | W | 4 | 5 | 4 | 4/4 | 4 |
| `e1-kit`, `tour1-look-kit*` | Un-Walk: reading drive A:, Welcome, steps 1–3, pray, pledge, connect | W | 4 | 5 | 5 | 4/4 | 4 |
| `tour1-look-setup*` | the Internet Setup Wizard, dialing | W | 4 | 5 | 4 | 4/3 | 4 |
| walk-e1 web frames | NetPilot, Seekr, the Fellowship portal, the webring, GeoCities pages, FIT IN's small ad | W | 4 | 5 | 5 | 3/3 | 4 |
| `tour1-look-irc` | the channel (Rob, Lume) | W | 4 | 5 | 4 | 4/3 | 4 |
| `e1-pillow` | Release Work (S339's racket movement; the illustration well is mostly white in the still) | W | 3 | 4 | 4 | 4/4 | 4 |
| `e1-intake` | the Family Form (S343's ministry print) — not judged, the frame shows Release Work under the word-of-the-day modal | W | – | – | – | – | – |
| `e1-packet` | the placement letter | W | 4 | 5 | 4 | 4/4 | 4 |
| `e1-diary`, `-glitch`, `tour1-look-diary*` | DIARY.TXT, "before you go", the glitch (felt, bare) | W | 4 | 4 | 5 | 4/4 | 4 |
| `e1-update-notice`, `-eula-1/2`, `-install-early/late`, `-restart`, `stills-e1-07` | the cascade, Terms of Continued Care, the XP-shaped installer and its changelog, Restarting… | W/R | 4 | 4 | 5 | 4/4 | 4 |
| `tour1-flip-wall`, `tour1-look-wall-record`, `stills-e1-04/04b` | the wall behind you: the INTAKE RECORD (sharp, cold, the witness side) | W | 5 | 4 | 5 | 4/3 | 5 |
| (dormant) `e1-room-back` | the record before it wakes: a bare black rectangle on a bare wall (next in line, 13) | looking | 2 | – | 3 | – | 2 |
| `tour1-map-e1*`, `tour1-frame-menu`, `tour1-helper-e1` | the frame: menu, "Where you are", the helper (plain, as the law asks; Fixedsys headings beside a system sans list) | W | 4 | – | 5 | 4/3 | 3 |
| `e1-found-file`, `e1-lamby-rig` | `lamby_rig.exe`: a developer's rig window; the icon is on the walk's desktop (next in line, 14) | R | 2 | 3 | 3 | 4/– | 2 |
| `e1-screensaver-stars/text` | the 1997 screensavers | R | 4 | 5 | 4 | 4/– | 4 |
| `e1-held-handheld*` | FIT IN on the handheld, four greens | R | 4 | 5 | 4 | 4/– | 4 |
| `e1-off` | the monitor off | R | – | – | – | – | – |

### 2003 · Daniel's room, aged (67; 48 W)

| surface (ids) | what / where | reached | C | P | R | L | Co |
|---|---|---|---|---|---|---|---|
| `e2-room-*`, `tour2-room`, `stills-e2-00/01/01b` | the room at dusk: the S299 view, NEW CREATURE and HOPE FOR TOMORROW, the Restorify calendar, the closed flip phone a grey bar | W / looking | 4 | 4 | 4 | – | 4 |
| `e2-silence`, `tour2-seat-after` | "Welcome back, Daniel. Press on the screen to continue with reboot." | W | 4 | 4 | 5 | 4/4 | 4 |
| `e2-boot-post`, `e2-boot-crawl` | POST and the crawl (USER PROFILE … RESTORED) | R/W | 4 | 5 | 4 | 4/4 | 5 |
| `e2-cartoon`, `-late`, `stills-e2-02/03` | **Lamby's cartoon (#6)** | W | 2 | 3 | 3 | 4/4 | 3 |
| `e2-lamby-intro`, `-program` | Lamby's introduction on dark teal ("Hello", "Begin") | W | 4 | 4 | 4 | 5/4 | 4 |
| `e2-message-toast`, `e2-restorify` (ground), `stills-e2-04` | **the 2003 desktop (#3)** | W | 2 | 2 | 3 | 5/4 | 2 |
| `e2-restorify`, `stills-e2-04b` | Restorify · Today: the steps, the daily check-in (XP skin) | W | 4 | 4 | 4 | 4/4 | 4 |
| `e2-caleb-chat/commit/sad/caught/alert`, `stills-e2-05/06` | the HopeRestored Messenger with Caleb (felt): MSN bubbles, the redaction bars, Lamby's Accountability card | W | 4 | 5 | 5 | 4/4 | 4 |
| `e2-netvision*` | NetVision Player: THE NEW WAY TO RECOVER, ORDER NOW, the guarantee seal, static | W/R | 4 | 5 | 5 | 4/3 | 4 |
| `e2-puremail` | PureMail: "We have to stop." | W | 4 | 5 | 4 | 4/4 | 4 |
| `e2-residue`, `tour2-look-residue-dark`, `stills-e2-07` | "Then it was never me that was broken…"; the dark | W | 4 | 4 | 5 | 4/4 | 4 |
| `e2-screensaver-lambs` | Truth of the Day; the lambs saver | W | 4 | 4 | 4 | 4/4 | 4 |
| `e2-update-notice/-eula/-dispersal` | Service Transition, GracePlatform's Community Guidelines, Removing Restorify 2003 | W | 4 | 4 | 4 | 4/4 | 4 |
| `e2-held-phone`, `-play` | **the flip phone held (#9)**; its LCD (big digits, RESTORIFY) is good | W | 3 | 2 | 4 | 5/– | 3 |
| `tour2-map-e2`, `tour2-look-message-toast` | the frame map; Lamby names the message | W | 4 | – | 5 | 4/3 | 4 |
| `e2-splash` | the retired CD-ROM splash (review only, retired S166) | R | — not counted — |||||

### 2016 · Vera's room (121; 71 W)

| surface (ids) | what / where | reached | C | P | R | L | Co |
|---|---|---|---|---|---|---|---|
| `e3-room-*`, `tour3-room`, `stills-e3-00/01/04` | the room: BRAVE & NEW, the retreat sign, the march flyer, the calendar, the rain-city window, the box lamp (his ruling), the Wick card; the left view a door and a bare wall | W / looking | 4 | 4 | 4 | – | 4 |
| `e3-arrival`, `e3-idle`, `tour3-look-signin`, sign-in frames | SisterSignal: starting services; "Welcome back, Vera", one pale Sign in on an empty pane (next in line, 12) | W | 3 | 4 | 4 | 5/4 | 3 |
| `e3-board`, `tour3-look-board`, `stills-e3-02` | **GracePlatform · Today (#10)** | W | 3 | 4 | 4 | 4/3 | 3 |
| every 2016 frame (`*.canvas-phone`) | **the Handset Window lock screen (#8)** | W | 2 | 3 | 3 | 5/4 | 3 |
| `e3-list`, `e3-item7`, `e3-board-done`, `e3-malta-*` | the testimony editor: Renata, tracked changes in red, Soften the term, "This story is done" | W | 5 | 5 | 5 | 4/3 | 5 |
| `e3-grade-apply/skip` | the places list: Áine's post, places to avoid, Trending | W | 4 | 5 | 5 | 4/3 | 4 |
| `e3-family-*` | the family calls: Ruth, Maureen, Annette; suggested replies | W | 4 | 5 | 5 | 4/3 | 4 |
| `e3-consent*` | "Let Lambient work alongside you?" | W | 4 | 5 | 4 | 4/3 | 4 |
| `e3-comments-*`, `e3-course-*`, `e3-podcast-*`, `e3-story-*` | the other jobs — not judged: the sweep's frames show the board, not the job (§5) | W | – | – | – | – | – |
| `e3-noa*` | Noa's clip (the hands) | W | 4 | 4 | 5 | 4/3 | 4 |
| `e3-phone-after`, `e3-phone-cascade`, `e3-phone-*` (R) | the phone: inbox, the group thread, Malta, home screen | W/R | 4 | 5 | 5 | 4/3 | 4 |
| `e3-update-notice` | the 2016→2026 update notice | W | 4 | 4 | 4 | 4/4 | 4 |
| `tour3-map-e3*`, `tour3-look-task`, `-back-to-job` | the frame map; Back to today | W | 4 | – | 5 | 4/3 | 4 |
| `e3-floppy-*` | FloppySheep (optional door) | R | 4 | 4 | 5 | 4/– | 4 |
| `e3-light`, `e3-minimise` | the brighten at Malta; the minimised platform | R | 4 | – | 5 | – | 4 |
| `e3-platform-*` | platform job previews and records (debug beats) | R | 4 | 5 | 5 | 4/– | 4 |
| `e3-tablet-*` | the tablet (review route; its place in the Nov rebuild unclear) | R | — not counted — |||||

### 2026 · Maya's room (134; 80 W)

| surface (ids) | what / where | reached | C | P | R | L | Co |
|---|---|---|---|---|---|---|---|
| `e4-room-*`, `stills-e4-00/01/03c` | the room: lilac walls, the trans flag, LIVE STREAM and TransJesus posters, photo strip, the lamp's beacon, the headset on its box; the old CRT on the left wall a black square (next in line, 11) | looking | 4 | 4 | 4 | – | 4 |
| `close-t004`, `e4-standby`, `e4-browser-restore` | the orb on standby ("Press to wake the screen", small) | W | 4 | 4 | 4 | 3/3 | 4 |
| `tour4-seat-*`, `tour4-lid-*`, walk-e4-002…033 | the 2026 screens: New search, Second Thoughts, Larkpost, Mum's three sites, the AI overview, Kettle — **keep list** | W | 5 | 5 | 5 | 3/3 | 5 |
| `tour4-seat-bot-clip`, `-clip-takeover*` | THE GREAT BECOMING — **keep list** | W | 5 | 5 | 5 | 4/4 | 5 |
| `game-matchmade-*`, `e4-held-console*`, walk-e4-031/032 | MATCH MADE SIMPLE — **keep list** | W/R | 5 | 5 | 5 | 4/4 | 5 |
| `tour4-worn-tryon-*`, `tour4-worn-link` | the try-on mirror | W | 4 | 5 | 5 | 3/3 | 4 |
| `e4-stream-*`, `stills-e4-04`, walk-e4-035…042 | the Commons and the stream: host, chat, raid, terminated — **keep list** (§3) | W/R | 3 | 4 | 4 | 4/4 | 3 |
| walk-e4-040/041 | Shepherd Live operator view; then the same card empty, ruled lines and Back (§3) | W | 4 | 5 | 5 | 4/– | 3 |
| `e4-finale-*`, `tour4-device-stopped`, `stills-e4-05` | the failure on both screens | W/R | 4 | 4 | 5 | 4/4 | 4 |

### The era changes (3; W) — keep list

| surface (ids) | what / where | reached | C | P | R | L | Co |
|---|---|---|---|---|---|---|---|
| `era-change-1997-2003`, `-2003-2016`, `-2016-2026` | the flyover and the glob morph | W | 4 | – | 5 | – | 4 |

### The Close (53; 44 W)

| surface (ids) | what / where | reached | C | P | R | L | Co |
|---|---|---|---|---|---|---|---|
| `close-flow-01…07`, `close-t004…062`, `stills-e4-05b/06` | the flight from Maya's room, Daniel's place, up to the stars | W | 4 | – | 5 | – | 4 |
| `close-card-1…9`, `close-flow-08…16` | the nine message cards — **keep list** (§3) | W | 4 | – | 5 | 3/3 | 4 |
| `close-panel-*`, `close-flow-17…20`, `stills-e4-07` | **the four panels (#4)** | W | 2 | – | 4 | 3/3 | 2 |
| labels and stars round the panels | source labels, link lines, yellow slabs | W | 3 | – | 4 | 4/4 | 3 |
| `close-flow-21`, `close-t110` | **the machine and the Restart card (#5)** | W | 3 | 3 | 4 | 5/4 | 3 |
| `close-receipt` | the receipt — no photograph (the file is missing) | R | – | – | – | – | – |
| `close-dossier-*` | the dossier cards (retired in every mode, S365) | R | — not counted — |||||

### Home, sites, Leave, screensavers, support (99; all R)

| surface (ids) | what / where | C | P | R | L | Co |
|---|---|---|---|---|---|---|
| `lexicon-home-*` | the Lexicon's Sources pages — **keep list** | 4 | 4 | 5 | 3/– | 4 |
| `sites-hub*`, `sites-1997…2026*`, `sites-sources*` | the hub and four era sites (GeoCities, portal, platform, app) | 4 | 4 | 5 | 4/– | 4 |
| `viewer-app-*`, `viewer-harness-*` | the site viewer in a period window, browser and headset panel | 4 | 4 | 5 | 4/3 | 4 |
| `leave-*` | the Leave page: the encyclopedia's Screensaver, H-O-P-E | 5 | 5 | 5 | 5/– | 5 |
| `screensavers-flock*`, `-maze*`, `-pipes*`, `-lexicon*` | idle screensavers | 4 | 5 | 4 | 5/– | 4 |
| `screensavers-marquee*` | the marquee: a line of plain text on a slate (next in line, 15) | 3 | 3 | 4 | 5/– | 3 |
| `support-*` | "If this touched something for you" (the frame, plain by law) | 4 | – | 5 | 4/– | 4 |

---

## 3 · His list

### Keep-list surfaces with a weakness (left unchanged)

1. **The stream (the Commons).** The crowd are untextured block figures; in the headset photographs
   (`xr/sweep/e4-stream-*.png`) they read as mannequins rather than people. And `walk-e4-041`
   (`walk/shots/1794483500019.jpg`) shows the operator-view card empty, six ruled lines and a Back pill. That may be
   the raid wiping the record by design, or an empty state; I could not tell from the frame.
2. **The Close's nine cards.** Small monospace in a large black sky. In the browser frame (`close-flow-08…16`) a
   line is about a third of the frame wide and the glyphs about 11 px at 1280 × 720. Legibility only.
3. **The 2026 screens from the seat.** In the walk's 1280 × 900 frames the browser's body text is very small at the
   seat's distance. Job 18 B's bigger glass waits for his headset, so this is not judged further.
4. **The era change, 2016 → 2026.** One flyover frame on `sheet-era-changes.png` has a white blown-out rectangle. At
   sheet size I cannot tell a lit window from a fault.
5. **The Lexicon's Sources page.** Dense monospace over a busy illustrated library; review route only.

### Content (his phrasing, not touched)

6. **The 2026 Close panel's paragraph describes the old 2026** (`data/strings/close_network.json` `panels[3].text`):
   "Her record keeps her old name…", "Her photographs come back improved", "A headset offers an immersive session.
   Then a friend's invitation, inside that same headset…". Today's 2026 is Second Thoughts, the clip, MATCH MADE SIMPLE
   and the stream. It also does not fit: it falls from S146's 28 px floor to about 22 px. Panel copy is dossier
   phrasing, so it is his. The mock (#4) shows it cut at 30 px.

### Taste calls (the more period-true choice is the default; each waits for his eye in T71)

7. **#3 the 2003 wallpaper:** calm, Bliss-like (default, `m03b`), or the sunburst rays (`m03`).
8. **#6 Lamby's cartoon:** how loud the light frame is (the mock is loud; his rule says the system's media should be).
9. **#7 Daniel's bed:** PLAN_ROUND5's navy-and-red plaid (default) or S179's plain navy.
10. **#8 Vera's lock screen:** the subject of her photograph (harbour wall at dusk by default).
11. **#1 the 1997 window:** whether the moon sits in the frame from the seat (the mock puts it high, left of centre).
12. **#4 the panels' paragraph face:** Inter (default, the legible one) or Fixedsys throughout.
13. **The Restart card's face.** It draws in Inter on Daniel's beige 1997 CRT ("LambyOS 1997 — 2026"), although
    `fonts.ts` gives the Close `MONO_HEAVY` (Fixedsys). It is frame voice, so plain is right; which face is his call.
14. **The 2003 system accent.** PLAN_ROUND5 kept "Restorify's blue on the desk only (the M2 'tell', kept small)". It is
    not visible in the 2003 stills. Raise it a little, or leave it.

---

## 4 · The July style promises (STYLE_PROPOSAL_2026-09-27), checked against the build

STYLE_PROPOSAL was partly superseded by PLAN_ROUND5 (27 Sep, "the daylight idea is withdrawn"). Its Phase 1 (an
evening light per era, a beacon in 2026, muted personal models, bedding per life) and Phase 2 (posters as prints,
evening windows) were built in S180. The four stills side by side now tell the years apart: warm yellow, peach dusk,
orange-pink, lilac. So **the lights are not in the ten.** What is still owed:

- printed surfaces: **1997's window (#1)** and **Daniel's plaid (#7)**; the rug's pattern and the book spines (not
  nominated);
- definition = attention: the system's instruments crisp. **The 2003 phone (#9)** is the one held instrument that is
  not;
- the system's accent in 2003 (taste call 14).

---

## 5 · What I could not judge, and why

- **No headset photographs** of the entrance, Lamblippy Setup, the Leave page, the era websites or the Lexicon Home
  (INDEX "Notes and gaps": their tools time out on this build). Their L scores are computer-only.
- **The emulated headset** is mono, 75°, with no stereo, foveation, serration (T09) or Quest timing. Headset
  legibility here is a floor, not a verdict.
- **1997's sweep canvases are covered by the Word for the Walk modal** (ROOT) on every frame where the sweep left it
  up: `e1-desktop`, `e1-diary`, `e1-kit`, `e1-packet`, `e1-pillow`, `e1-intake`. The walk never drew that modal on the
  speedrun cut (0 samples), so it is an artefact of the run. It hid the Family Form (`e1-intake` shows Release Work)
  and part of Release Work.
- **2016's other jobs** (comments, course, podcast, story, group): their sweep frames show the Today board, not the
  job, so their screens were not judged. Their board thumbs are in #10.
- **The games running:** the 1997 handheld and the 2003 flip phone's CLEAR show their idle screens in `-play`.
- **The receipt:** `close-receipt`'s photograph is missing from the run.
- **Draw calls and Quest frame times:** not measured in Part A (Part C measures).
- **Release Work's animation** (S339): judged from one still.

---

## 6 · The mocks

All are in `~/update-available-uib/out/s375/mocks/`, made by `python3 tools/s375-mocks.py --photos <out/s375>`
(`--only m01,m04` for some). Each is before | mock, labelled.

| mock | file | how |
|---|---|---|
| m01 | `m01-1997-window.png`, `m01-night1997-print-x8.png` | the print drawn at 72 × 82 and laid on the pane's exact emissive hue in two photographs |
| m02 | `m02-1997-profile-pictures.png` | the six icons drawn at 32 × 32 into the profile canvas at the tiles' own coordinates |
| m03 | `m03b-2003-desktop-calm.png`, `m03-2003-desktop.png`, `m03-2003-desktop-canvas.png` | the wallpaper drawn at 512 × 384 ×3 under the desktop canvas's own icons and taskbar |
| m04 | `m04-close-panels.png` | a panel cell redrawn at pointCloud.ts's own layout (1536 × 768), today's room as the plate |
| m05 | `m05-close-machine.png` | the labels painted out of two Close frames (a sketch of the composition, not a render) |
| m06 | `m06-2003-lamby-cartoon.png` | both frames drawn at 512 × 384 ×3 with Lamby's sprites cut from the canvases |
| m07 | `m07-1997-bed.png` | the plaid print laid on the blanket's faces in the 1997 still, in their own shading |
| m08 | `m08-2016-lock-screen.png` | the lock screen redrawn at the phone canvas's size (540 × 1080) |
| m09 | `m09-2003-flip-phone.png` | the clamshell drawn round the photograph's own LCD |
| m10 | `m10-2016-board-cards.png` | three thumbs drawn at the tiles' measured rects in the workstation canvas |
