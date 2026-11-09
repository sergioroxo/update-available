STATUS: live

# UiB job 5, built (S346, 9 Nov 2026): the era changes, straight lines, the desktop skip

*Branch `uib/work`. The job: docs/reinterp/UIB_JOB_5_2026-11-09.md (details in UIB_ORCHESTRATOR_HANDOFF_2026-11-09.md,
"Open now" items 2 and 3). TODO rows: T08, T58, T59.*

## 1. T08: the era changes

His words (8 Nov headset, 12:18 and 12:42): no fades to black, "before or after"; more sound; more time; "instead of
the flyover, it needs to morph into the space"; and the ruling "we just remove the dollhouse, we add that to the
research".

**No fade to black anywhere.** A new piece, `src/engine/viewMorph.ts` (the view morph), replaces every dark cover:

- The view from where you are going is rendered once into a picture (a second camera, one frame).
- That picture arrives through drifting pixel particles (S281's particles, which he liked) until it has replaced the
  room you are in.
- The cut happens under that full cover, where the live room behind it is already the same room. Then the
  particles thin out and drift on.
- Used by:
  - the desktop's seat jumps (the blink: 0.45 s in, 0.35 s out; it was 0.13 / 0.22 s of black);
  - the 2016 → 2026 turn at the top of the flight (1.6 s in, 1.0 s out);
  - reduced motion's cuts;
  - every re-forming of the room in a headset (xrComfort). The headset's old veil had a near-black wash under the
    particles. That veil is gone.
- If a picture can't be made, the fallback cover is the lamp's warm colour from the theme, never black.

**The headset no longer flies at an era change.**
- The visitor stays in the chair. The room ages around them for the plan's full time: 1997→2003 15 s,
  2003→2016 19 s, 2016→2026 32 s. Before, all of it collapsed into about 2 s of cuts. The cascade and the
  calendar run on the same plan as on the desktop.
- Then ONE slow morph (2.6 s in, 1.8 s out) takes them into the new seat.
- 2016 → 2026 no longer turns mid-air in the headset.
- Any press still lands them at once, as before.

**The dollhouse is removed:** VR-06 in `src/frame/xrLayer.ts`, the browser's miniature, the headset menu's
Dollhouse row and its string, and the dollhouse parts of two review tools. The article companion (§3 list, the
three-modes table, §7g) records the change.

**The install's own music:** `passage_install`.
- It replaces the low wind under the whole change, from the I Agree press to the landing. It is synthesized and ours
  (`tools/make_passage_install.py`).
- 16 bars in D♭ at 72 BPM, 53.3 s, a seamless loop. It has a pad, a music-box arpeggio that climbs an octave
  halfway (the years going by), a slow FM electric-piano melody and a sub bass.
- The installer's progress ticks thin out as the new room arrives.
- Plain, not satire: the passage is the building's time, not the programme's voice.
- Registered (`tapeAudio.ts`), levelled (`levels.json` 0.631, bed level 0.5, music channel), captioned ("[music: the
  update installing, the years passing]"), with a LICENSES row.

**Measured** (`tools/era-morph-probe.mjs`, frames sampled every ~0.1–0.25 s; reports in `out/s346/morph*/`):

| | darkest frame (0–255) | what was seen |
|---|---|---|
| desktop seat jump | 61 | the destination arrives through the particles |
| desktop 2016 → 2026 | 84 | rise, the turn as a morph (25 frames), crossing, descent; bed: passage_install → bed_2026 |
| emulated headset 2016 → 2026 | 46 (the room's own 2026 light going down, not a cover) | 7 s rise + 25 s build in Vera's chair, then the morph into Maya's seat; landed at (4.6, 0.7) facing 270 |

Photographs:
- out/s346/morph/sheet-turn.png (the desktop turn);
- out/s346/morph/sheet-exp2.png (the cover at 0, 0.3, 0.5 and 1);
- out/s346/morph-xr/sheet-xr.png (the headset landing).

## 2. Straight lines at any angle (T58)

- The screens are sampled as a screen now: `makeScreenTexture(…, 'screen')` gives mipmaps, trilinear, the device's
  maximum anisotropy and a linear magnify.
- Screens covered: Daniel's monitor, the witness wall, every 2016/2026 device screen and the visor, held devices,
  the Close's monitor, the Home window, the site viewer, and the setup window ("Welcome back, Daniel").
- The room's textures keep `FILTER_NEAREST`. The keychain's tiny LCD and the frame's own panels are unchanged.
- CLAUDE.md's Aesthetic laws carry the dated exception.
- Measured on the monitor: sampler `minFilter 5 (linear-mipmap-linear), magFilter linear, anisotropy 16` (the device
  max). In 3 s there were **31 `generateMipmap` calls for 32 screen uploads**, so the mip chain is rebuilt on each
  upload, and uploads stay on-dirty.
- Photographs at 0°, 30° and 60°, before and after: `out/s346/before/` and `out/s346/after/`
  (`monitor-<deg>-glass.png` is the crop). At 60°, before, "Welcome back, Daniel" breaks into broken strokes; after,
  it reads. Head-on, the screen is as crisp as before.
- Tool: `tools/screen-angles.mjs`.

## 3. The desktop team skip (T59)

- In debug builds only (`?debug=1`), N pressed ten times within 5 s jumps to the start of the next year
  (1997 → 2003 → 2016 → 2026), seated, through the same path as the headset's 10× B/Y.
- A small note says "Team skip → 2016". The first nine presses do nothing new.
- Checked: in 2003 with `?debug=1`, nine presses left it in e2 and the tenth went to e3. Without `?debug=1` the code
  is not reached.

## The walks

All four era changes were touched, so each era was walked to the next with
`node tools/walk.mjs --port 3171 --from-era N --one-era --max 900` (reports in `out/walks/`, git-ignored):

| from | result |
|---|---|
| 1997 | ✓ reached 2003 in 85 presses |
| 2003 | ✓ reached 2016 in 79 presses |
| 2016 | ✓ reached 2026 in 37 presses |
| 2026 | ✓ reached the Close in 80 presses |

The walker presses through the flights (any press lands you), so the morphs themselves were measured by the probe
above, not by the walk.

## For Sérgio to check

1. **In the headset, an era change:**
   - You stay in the chair while the room changes. Is the length right? 2016 → 2026 is the longest, about 32 s
     before the morph.
   - Is the morph itself the "morph into the space" you meant?
2. **The music:** listen at an era change (1997 → 2003 is the first). It is mine; tell me if it should be sadder,
   plainer or more like an installer.
3. **On the computer:** turn to look at a screen from the side. Are the letters straight now?

## Not done / notes

- Not run on a Quest: every headset check here is the emulated headset in a desktop browser.
- `passage_wind` stays on disk and registered (unused now). It can be retired later.
