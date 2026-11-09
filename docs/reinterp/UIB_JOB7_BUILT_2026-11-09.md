STATUS: live

# UiB job 7, built (S348, 9 Nov 2026): the flyover and the glob morph, back on the computer and now in the headset

*Branch `uib/work`. The job: docs/reinterp/UIB_JOB_7_2026-11-09.md, built to his FINAL WORD ("the version of the desktop
where you fly over and you see the objects appear and disappear with a glob effect on them. That is what I want for
the VR as well"). TODO row: T61.*

## 1. The computer: the era changes as they were before job 5

`src/room/clusterMorph.ts`, `src/room/cluster.ts`, `src/engine/viewMorph.ts` and the relocation code in
`src/engine/app.ts` are back at their pre-job-5 / pre-job-6 state. Job 6's shine is gone: `morphShine.ts`, the theme's
`morph.ts`, and the seated mode with `eraChange.ts`. So the change is again:

- **the rise** out of the chair;
- **the flyover** over the house;
- **the descent** into the new seat;
- **the room's glob cascade** while you are up there: the diagonal sweep, each object flickering, jittering and
  growing in, shrinking away or changing, the furniture models popping in and out (his "clunky morphing of objects
  disappearing and appearing as new");
- 2003 → 2016's ballast flicker and the other rooms' lights coming up as the walls go.

All the timings are the pre-job-5 ones.

**Kept from job 5:** no fade to black. Before job 5 the one black thing in an era change was the **blink that turned
you at the top of 2016 → 2026**. Job 5 made it a particle cover, which he has now ruled out ("no squares, no overlay").
It is now **a smooth turn in place**: 6 s, smoothstep, about 44°/s at its peak, on the computer. The plan carries the 6 s
(`RELOCATIONS['e3-e4'].turnSeconds`), so the crossing, the 2026 light (which goes out as you come down) and the music
all keep step.

Also kept from job 5, because they are not the era change: the seat jumps' view morph, the straight screen lines, the
dollhouse's removal, and the team skip.

## 2. The headset: the same flyover, the same glob

Before job 5, a headset jumped each leg as a cut under a dark veil. Jobs 5 and 6 kept you in the chair. **Now it flies
the same legs as the computer**, over the same glob cascade:

- **The world follows the flight every frame** (`xrComfort.setFollow`): no re-forming, no dissolve, no cover.
- **The horizon never tilts.** Only the place and the facing are followed; the overlook's look down (−40°) is the
  browser camera's alone. In the headset you look down yourself.
- **Constant speed.** Each leg eases in and out over 18 % of its time and runs at constant speed in between. The peak
  is about 1.2 × the average speed, where the computer's curves peak at 1.875 ×.
- **No sudden turns.** The facing turns slowly and evenly across the *whole* flight, from the chair you leave to the
  seat you land in: 0° for 1997 → 2003, 90° for 2003 → 2016, 177° for 2016 → 2026. On 2016 → 2026 the "turn" leg
  only holds the place while that slow turn carries on, so both platforms share one timeline.
- **No black.** Nothing covers the view at any point of the flight. Pressing to skip still lands you at once; that one
  cut uses the ordinary seat-jump dissolve.
- **Reduced motion** (computer and headset): the same flight, flown the headset's way (straight, constant speed, the
  slow turn spread over the whole flight) — his "the flight becomes a slow drift". The glob cascade now plays under
  reduced motion too ("the glob effect stays"); before, reduced motion snapped the room.

**The headset's flight, by the numbers** (straight legs at constant speed; peak = 1.22 × the average):

| change | legs (distance, time, peak speed) | the slow turn |
|---|---|---|
| 1997 → 2003 | rise 1.51 m / 8.3 s / 0.22 m/s; hold 1.69 m / 7 s / 0.29 m/s; descent 2.83 m / 13 s / 0.27 m/s | none (the same chair) |
| 2003 → 2016 | rise 1.51 m / 8.3 s / 0.22; crossing 2.57 m / 11 s / 0.29; descent 2.43 m / 11.5 s / 0.26 | 93° over 30.8 s, peak 3.7°/s |
| 2016 → 2026 | rise 1.37 m / 7 s / 0.24; hold 6 s; crossing 7.15 m / 25 s / 0.35; descent 2.02 m / 11.5 s / 0.21 | 177° over 49.5 s, peak 4.4°/s |

All of it sits inside the piece's own comfort envelope, which S53 measured for the opening descent: 0.43 m/s and
9.1°/s. No roll, and no pitch of the world.

**⚑ One deviation, in the headset only.** The glob's flicker adds +0.7 of white at random on every frame to whatever is
changing. On a wall-sized surface that flashes a whole wall white at the frame rate, and in a headset that wall is most
of what you see. The first headset photographs showed it filling the view at 2003 → 2016 (9.6 s) and 2016 → 2026
(7.5 s). So **in the headset, surfaces larger than 1 m² glow at a third of the brightness while they flicker**. The flash is
the surface's own colour plus 0.7 as light, so the whole glow is scaled. The brightest headset frame of 2016 → 2026
went from 206 to 136 (out of 255). Small things keep the full flicker, the jitter is unchanged, and the computer is
exactly as before. It is one factor in `clusterMorph.ts` (`wide ? 0.3 : 1`) if you want the full flash back in the
headset too.

## 3. The sounds he loves, on the glob

The music and the morph sounds are job 6's synthesis, unchanged in character, **re-timed to the flyover**
(`tools/make_era_change_audio.py`).

**The music** (`passage_*`) follows the flight's own seconds:
- the pulse runs one per beat through the rise;
- it quickens to four per beat as the room globs;
- it holds there across the crossing, and slows down the descent;
- the lead resolves as you land.

**The morph sounds** (`morph_*`) now sit **on the glob events themselves**. These are computed from the room data in
clusterMorph's own order: the same diagonal sweep, the same start times, the models swapping at the cascade's start.
- **1997 → 2003:** 96 events (42 vanish, 24 appear, 6 change), all in the first 4 s of the 7 s cascade.
- **2003 → 2016:** 178 events (18 vanish, 123 appear, 8 change, 24 wall moves) in the first 6.6 s of 11 s.
- **2016 → 2026:** 158 events (83 vanish, 8 appear, 5 change) in the first 6.6 s of 11 s.

What each event sounds like:
- a glass **creak bending down** where things vanish, **bending up** where they appear, a level one where they change;
- a small glass tick where they only flicker;
- a **bigger, lower whoosh** where a wall moves;
- the **rising shimmer** over the cascade;
- a long soft fall of air through the descent;
- the **glass bloom on the landing**.

The morph sounds start with the cascade (`cluster.onSpaceChange`) and fade if you skip. The files are re-levelled; the
captions and the LICENSES row stand.

## 4. The photographs

`tools/era-change-probe.mjs` sampled each change on both platforms, then put 12 frames on a sheet: 2 of the rise, 6
inside the glob cascade, then the travel, the descent and the landing. Brightness is the frame's mean, out of 255.

| change | where | flew | cover frames | headset follows the flight | at the change → darkest / brightest in flight → landed |
|---|---|---|---|---|---|
| 1997 → 2003 | computer | ✓ | 0 | — | 144 → 113 / 158 → 113 |
| 1997 → 2003 | headset | ✓ | 0 | 269 / 269 frames | 144 → 115 / 184 → 115 |
| 2003 → 2016 | computer | ✓ | 0 | — | 86 → 84 / 150 → 96 |
| 2003 → 2016 | headset | ✓ | 0 | 290 / 291 | 107 → 95 / 187 → 95 |
| 2016 → 2026 | computer | ✓ | 0 | — | 100 → 84 / 202 → 115 |
| 2016 → 2026 | headset | ✓ | 0 | 475 / 476 | 99 → 88 / 139 → 106 |

There are no squares, no veil and no cover anywhere. The darkest frames are the flight's own views: 2016 → 2026's
crossing looks along the open house in the 2026 light, the same as before job 5. The brightest headset frames of
1997 → 2003 and 2003 → 2016 are the warm room seen whole from above as the daylight comes in.

Sheets:
- 1997 → 2003: out/s348/change/sheet-e1-desktop.png and sheet-e1-xr.png;
- 2003 → 2016: out/s348/change/sheet-e2-desktop.png and sheet-e2-xr.png;
- 2016 → 2026: out/s348/change/sheet-e3-desktop.png and sheet-e3-xr.png.

On each sheet, the same moments read the same on both platforms: the rise, the room globbing below, the crossing,
the descent into the new seat.

## The walks

Each era was walked to the next with `node tools/walk.mjs --port 3181 --from-era N --one-era --max 900` (reports in
`out/walks/`, git-ignored): 1997 → 2003 ✓ (85 presses), 2003 → 2016 ✓ (79), 2016 → 2026 ✓ (37), 2026 → the Close ✓
(81). The walker presses through the flights (a press lands you), so the flights themselves were measured by the
probe.

## For Sérgio to check on the Quest (comfort)

1. **Sit in the chair, then press I Agree on the 1997 update** (1997 → 2003, about 28 s): the rise, a hold over the
   room, the descent back into the same chair.
   - Any sickness at the start or the end of a leg?
   - Does the room feel as if it tilts? It should not: only your own head tilts it.
2. **2003 → 2016** (about 31 s): the rise, then the flight across the open house to Vera's desk, the facing turning a
   quarter round. Is the turn slow enough to feel like nothing?
3. **2016 → 2026** (about 50 s, the longest): the rise over Vera's room, a 6 s hold while the world keeps turning, the
   25 s crossing, the descent into Maya's room. Half a turn spread over 50 s.
   - Is the crossing too long to sit through?
   - Does the slow turn ever feel like the room swimming? If it does, the alternative is to turn only during the
     crossing.
4. **Look down at the room while you are up there.** The glob happens below you. Do you see objects appear and
   disappear?
5. **Press the trigger during a flight:** it should land you at once.
6. **With reduced motion on** (the menu's motion setting / the system's): the same flight. Is it gentle enough?

## Not done / notes

- Not run on a Quest: the headset frames are the emulated headset in a desktop browser. Its head is pitched 20° down
  for the photographs, as a seated visitor looking at the room below would be.
- The morph sounds sit on the cascade's events as the room data defines them. A kept belonging (R28-2c) skips its fold,
  so a creak may play for it. Inaudible in practice.
- If a relocation starts away from the seat, its rise is lengthened for comfort (`relocationPlanFromHere`). The
  pre-rendered music then runs a little ahead of the room. In play every era change starts from the seat.
