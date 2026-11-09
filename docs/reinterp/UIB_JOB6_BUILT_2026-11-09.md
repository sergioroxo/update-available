STATUS: live

# UiB job 6, built (S347, 9 Nov 2026): the era change shines, seated; its own music and its own sounds

*Branch `uib/work`. The job: docs/reinterp/UIB_JOB_6_2026-11-09.md (his notes on job 5). TODO row: T60.*

## 1. "It goes dark" → the space morph that shines, in the chair

**What was dark, measured.** The landing's picture was never the problem: photographed and shown under a full cover,
the room reads 134 against 133 live (out of 255). The darkness was the *light* in the rooms being photographed:

- 2003 → 2016 switched to a near-black `hold` rig (ambient 0.05, the room light at 0) with ballast dips to 0.05;
- 2016 → 2026 crossfaded Vera's room to 2026's cold light while you were still sitting in it, and then photographed
  Maya's room half-way through that crossfade, so the next room arrived as dark brown squares.

**What it is now, on the computer and in the headset alike** (`SEATED_ERA_CHANGE`, `src/engine/eraChange.ts`):

1. **You stay in the chair.** No rise, no flight, no turn mid-air. The install runs on the monitor in front of you.
2. **The room folds into its next year around you**: the diagonal cascade from the shipped build (clusterMorph),
   and now it **shines** (`src/room/morphShine.ts`, `src/room/clusterMorph.ts`):
   - each thing glows warm (the lamp's colour) as the fold reaches it, and settles as it lands, breathing at 2.4 Hz:
     smooth, never a strobe (the old glitch flashed at random every frame);
   - small warm **glints** drift up off whatever is changing, drawn additively, so they can only add light;
   - a warm **light travels with the fold**, lighting the walls and furniture that do not change as it passes;
   - the furniture models now **fold** too (they grow in with a small overshoot, or shrink away); before, they just
     appeared and vanished, and they are most of the furniture;
   - the glitch's scale jitter stays (stepped, it is a glitch); it moves, it never flashes.
3. **The light never goes down around you.** Where the chair changes, the new year's light arrives *brighten-only*:
   no light dims, the next room is lit before it is photographed, and the exact new light settles in after the cut,
   over 4 s. The `hold` rig and the ballast dips are gone from the seated change. In the same chair (1997 → 2003),
   2003's light arrives during the fold, as the time cue it was written to be.
4. **One slow, bright morph into the new seat**: 2.6 s in, then the cut, then 1.8 s out, the comfort rule's
   "at most one slow move at the end". The particles now carry a warm rim and a small glint. 1997 → 2003 keeps
   the same chair, so there is no landing morph there.
5. **2016 → 2026 is shorter in the chair**: 7 s install + **14 s** of change (it was 25). The 25 s was the flight's
   7.2 m crossing at the comfort speed. In Vera's chair only her own desk folds in view; Rooms 1 and 3 change behind
   her. The other two keep their lengths: 1997 → 2003 8.3 + 7 s, 2003 → 2016 8.3 + 11 s.
6. **Reduced motion**: one gentle cross-change of the room (3 s, no glow, no glints, no jitter) and a plain soft
   dissolve into the new seat (no particles), in the headset too.

**Measured** (`tools/era-change-probe.mjs`, every frame's mean brightness 0–255; reports and sheets in
`out/s347/change/`; the reduced-motion run is in `out/s347/change-rm/`):

| change | where | in the chair | darkest during | brightest while folding | after landing | verdict |
|---|---|---|---|---|---|---|
| 1997 → 2003 | desktop | 143 | 114 (2003's light arriving, in the fold) | 164 | 113 | ✓ |
| 1997 → 2003 | headset | 153 | 125 | 162 | 125 | ✓ |
| 2003 → 2016 | desktop | 87 | 87 | 107 | 96 | ✓ (was 82 before the brighten-only fix kept the old colours) |
| 2003 → 2016 | headset | 120 | 100 (Vera's room arriving, at its own light) | 133 | 100 | ✓ |
| 2016 → 2026 | desktop | 99 | 99 | 140 | 114 | ✓ |
| 2016 → 2026 | headset | 102 | 102 | 138 | 112 | ✓ |
| 2003 → 2016, reduced motion | desktop / headset | 87 / 120 | 87 / 100 | — | 96 / 100 | ✓ (no glow, no glints; a plain dissolve) |

In every run: the camera did not move before the landing; the shine's light peaked at 0.75–0.8 and up to 160 glints
were alive at once; the beds ran passage → the new year's bed, and the morph's sound layer started with the fold.
Two corrections came out of these sheets. A first pass washed the headset view to 169 when Vera's monitor folded at
arm's length, so the light and the glow came down by about a third. The glints were too big and white at first, and
are now small and gold.

Contact sheets (12 frames each, labelled):
- out/s347/change/sheet-e1-desktop.png and sheet-e1-xr.png (1997 → 2003);
- out/s347/change/sheet-e2-desktop.png and sheet-e2-xr.png (2003 → 2016);
- out/s347/change/sheet-e3-desktop.png and sheet-e3-xr.png (2016 → 2026);
- out/s347/change-rm/sheet-e2-desktop.png and sheet-e2-xr.png (reduced motion).

"In the chair" is the room as you sit in it once the change has begun. The shift itself turns the monitor over to
the install, which is the screen and not the room's light. The check is his: no frame darker than the dimmer of the
two rooms themselves, the one you sit in and the one you land in. The landing's reveal *is* the next room, at its
own light. The camera did not move before the landing in any run.

## 2. The music: new, and the morph's own sound layer

`passage_install` stays registered and on disk for another moment. It is no longer played at the era change.

**Listened to first** (spectra and tempo with ffmpeg): Lamby's home loop and "Chase the Clouds" both sit near
**65 BPM, in G major with a Lydian lift** (C♯), mid-forward, and bright on top. So the new music lives in Lamby's key
and tempo, and then moves.

**Two layers, one per change, each rendered to that change's own seconds** (`tools/make_era_change_audio.py`,
synthesized and deterministic):

- `passage_1997_2003` / `passage_2003_2016` / `passage_2016_2026`: **the music** (music channel). It starts at the
  press or the restart and has six voices:
  - a liquid **pulse**: "water-marimba" notes that drop into pitch, ping-ponging left and right, one per beat during
    the install, **accelerating to four per beat while the room folds**, slowing as you land;
  - a **pad** through a **resonant filter sweep** that opens with the fold and closes as you land;
  - **granular shimmer**: grains that glide a little, denser as the fold builds;
  - a **gliding lead** (portamento, slow vibrato) that lands on the ♯11 at the cut and resolves;
  - **droplets**;
  - a **sub**.
  - The chords: Gmaj9 → Em9 → Cmaj7♯11 → D6/9 → Gmaj9♯11.
- `morph_1997_2003` / `morph_2003_2016` / `morph_2016_2026`: **the place shapeshifting** (room channel). It starts the
  moment the room starts to change, and fades out if you skip:
  - a **rising shimmer** of glassy grains, climbing in pitch and density;
  - **glass creaks**: ratchets ringing inharmonic glass modes that bend in pitch;
  - **soft whooshes** that cross the stereo field with the diagonal fold (bigger and lower where 2003 → 2016's walls
    fold away);
  - at the landing, a whoosh rising into the cover, a **glass bloom at the cut**, and a sparkle out.
- **Mix:** during the fold the morph's sounds sit 4–5 dB over the music; the landing's bloom stands about 10 dB
  over it.
- **Registration:** registered (`tapeAudio.ts`), levelled (`levels.json`, −23 LUFS baseline), on their channels
  (`channels.json`), captioned ("[music: liquid, shifting, quickening as the room changes]", "[the room changing
  shape: soft whooshes, glass creaking, a rising shimmer]", "[the walls folding away: …]"), and with a LICENSES row.
- **Listen offline:** mixdowns of each change as the room plays them are in
  `out/s347/audio/preview_<from>_<to>.mp3`.

## 3. The screens at an angle

He accepts them as they are (sharp head-on, slightly soft at an angle). No change.

## The walks

Every era change was touched, so each era was walked to the next with
`node tools/walk.mjs --port 3181 --from-era N --one-era --max 900` (reports in `out/walks/`, git-ignored):

| from | result |
|---|---|
| 1997 | ✓ reached 2003 in 85 presses |
| 2003 | ✓ reached 2016 in 79 presses |
| 2016 | ✓ reached 2026 in 37 presses |
| 2026 | ✓ reached the Close in 74 presses |

The walker presses through the changes (any press lands you, and the morph's sound layer fades out), so the changes
themselves were measured by the probe above, not by the walk.

## For Sérgio to check

1. **In the headset, an era change:** does the room shine and change around you now, without going dark? Is the
   glow too much or too little? It is the one number to tune (`clusterMorph.ts`, the shine's 0.3 / 0.5).
2. **2016 → 2026:** 14 s in Vera's chair, then Maya's room. Most of 2026's change happens behind you (Rooms 1 and 3).
   If it feels thin, the next step I would take is to let Room 3 finish folding *after* you land in Maya's seat, so
   you see her room become 2026. That would put the move in the middle rather than at the end, so it is your call.
3. **The music and the morph's sounds**, on headphones: is the pulse's quickening right, and does the morph sit over
   the music the way you meant?

## Not done / notes

- Not run on a Quest: every headset check is the emulated headset in a desktop browser.
- The probe replays 1997 → 2003 through the debug panel's relocation replay (now also `__relocate`, `?debug=1`),
  because 1997 has no review jump (`?era=` is 2–4). The other two run through the real restart hook.
- `?debug=1` gained `__seatCut(yaw)` and `__relocate(from, to)` for the probe. `__camPose` reports the shine (light
  and glints) and the morph's sound layer.
