# LambyOS — Welcome Home · the advert, as a video (review only)

**File:** `lambyos_welcome_home.mp4`. 1920×1080, 30 fps, H.264 (yuv420p, CRF 23) with AAC 192k stereo. Length **1:36**. A 720p preview sits beside it, and
`voice_auditions.mp4` holds the voice auditions (the old voice, then nine Kokoro voices reading the same lines).
**Contact sheet:** `contact_sheet.png` (12 frames, one per beat, with the time of each).
**Branch:** `cloud/advert-video`, which is never merged. This is a picture to review. It is not wired into the piece.

The brief is `docs/reinterp/LAMBYOS_HOME_DESIGN_2026-10-09.md` §"The advert" (with its revised ending of 2026-10-13) and
the programme's kit from `LAMBYOS_HOME_THINKING_2026-10-12.md` §6–7. The rules come from `CLAUDE.md`.

---

## What you see, beat by beat

| Time | Beat | Picture | Narrator / on-screen type |
|---|---|---|---|
| 0:00–0:04.6 | **Ident** | VCR blue and PLAY ▶. The tracking lines settle. On Floppysheep's own morning field a pixel lamb hops the fence (*boing*), then the LambyOS chime. Chunky 3D type **LambyOS™ — Home Edition** bounces in, with a lens flare sweep and sparkles. | *(chime)* [captioned] |
| 0:04.6–0:14.2 | **Kitchen table** | A low-poly 3D kitchen at night: a warm lamp, a cup of tea, the night window. A mother's hand (cardigan sleeve) slides a LambyOS floppy disk across. A teenager's hand (hoodie sleeve) comes in from the other side and stops short. Hands and sleeves only: no bodies, no faces. **Over 30 years of care.\*** fades in, with a glint. | "Does someone you love seem… far away? Since 1997, we have been there for families. Quietly. Gently. At the kitchen table." |
| 0:14.2–0:32.7 | **Product parade** | A star wipe into a sunburst showroom. A candy-striped pedestal spins, and each product turns on it with a brass sting and a chunky title. Star wipes between items: **THE TAPE** (cassette), **THE DISK** (floppy), **THE STREAK** (CD-ROM with a little flame), **THE PLATFORM** (phone, glossy "GracePlatform" app, 412 days), **IMMERSIVE SESSIONS** (headset in a gift box, "HEADSET INCLUDED!" starburst). Then **BUT WAIT — THERE'S MORE!** with an orchestra hit. Then the Home Kit flashes by, each item with a **FREE!** badge: **The "Let go!" box** *for the old things* (a mixtape, a band T-shirt, a photo face-down), **The House Rules sampler** *doors always open* (cross-stitched: Doors open at all times · Modest dress · House meeting Sundays · Never alone), **The guest book** *approved callers only* (NAME / APPROVED Y/N, three lines filled, the rest blank). | The design's five lines, then "But wait — there's more!" (draft). The kit is type only, with no narration. |
| 0:32.7–0:44.6 | **How it works** | A chart spins in (a 1997 DVE move) on Restorify's sunrise. Each box pops with a bell *ding* as it is named, and the arrows draw themselves on: **a feeling → a NAME → a ROOT CAUSE → a MENTOR → a NEW YOU**. The last box is a starburst with a flare. It contains words only: nobody is "made new". | The design's lines, verbatim. |
| 0:44.6–0:55.2 | **Four empty rooms** | The piece's own rooms, photographed from the build (below), with slow push-ins and dissolves: **1997** (the CRT on, the desktop), **2003** (the PC on), **2016** (the phone glowing on the duvet), **2026** (the headset on the made bed). Each has a chunky year and v1.0…v4.0. Nobody is there. | "Come join us in the lives of those who struggle. One room. One machine. Thirty years. And every year, an update — because we never stop improving." |
| 0:55.2–1:01.7 | **Pack shot** | The piece's Lamby (cheerful, silent) stands on the spinning pedestal against the sunrise. **LambyOS™**, and the slogan builds word by word: **Everything is set up already.** | "LambyOS. Everything is set up already. You don't need to do anything." |
| 1:01.7–1:08.4 | **Small print, fast** | The disclaimer scrolls up under the logo, too fast to read. | The disclaimer, read fast (captioned in full). |
| 1:08.4–1:18.3 | **The collapse** | The scroll slows to reading speed by itself. The picture loses its hold (tracking tears, colour drains) and the tape counter slows. The music and the voice stretch down together. | "Results not typical. No result has been shown to be typical. No result has been shown. What has been shown is —" |
| 1:18.3–1:21.3 | **The tape chews** | The last picture freezes, so Lamby's smile holds too long. The picture rolls once (no strobe), then dissolves into TV noise. The VCR's on-screen display goes with the tape. | [the tape chews] · [TV hiss] |
| 1:21.3–1:28.3 | **The noise gathers** | Era-grey static. Its dots drift together, as the piece's starfield does, into **OVER 30 YEARS / SOLD AS CARE!** in the piece's own DOT glyphs. | [TV hiss] (silence under the hiss) |
| 1:28.3–1:36.3 | **The end card** (frame voice) | Under the words, the programme's own small print appears and stays still: **"…not therapy, not a cure… your old self may not be recoverable…"**. It does not scroll, and there is no Sources line (his note, 2026-10-13). At the end the TV goes dark. | [TV hiss, quieter] |

Both the tape and the frame are present on screen. The VHS layer (chroma bleed, tracking, head-switching noise,
scanlines, timecode, PLAY) belongs to the tape and dies with it. After the chew, the picture is the TV's glass only, with
scanlines and a little bloom: the end card is the frame's, not the programme's.

---

## How it was made (all local, all from code)

- **3D: PlayCanvas, as the piece uses it.** The kitchen, the pedestal and the products are a PlayCanvas scene built from
  boxes, cylinders and cones plus the piece's own GLBs from `public/assets/models/`: `cassetteTape.glb`, `vrHeadset.glb`,
  `cupOfTea.glb`, `lampSquareTable.glb`. Models are recoloured flat in code, as `src/room/assets.ts` does it. Printed
  faces are canvas textures with `FILTER_NEAREST`: the floppy label, the app, the "LET GO!" label, the cross-stitch and
  the guest-book pages.
- **The four rooms are the piece itself.** `src/plates.mjs` opens the real build (`?reinterp=1&era=N`), flies the
  debug camera (`__camFree`, as `tools/stills.mjs` does) on a slow push-in, and saves one screenshot per frame. Two props
  are moved for the shot, in memory only and never in `data/`: Vera's phone goes from her desk onto her duvet, and Maya's
  headset goes from its stand onto her made bed, because the design asks for exactly that. **The 2026 framing keeps the
  wall's party poster ("CATEGORY IS: ALL WELCOME") and the party calendar out of frame.** Those are Maya's respite
  objects, and the advert (the programme's voice) must not target through them.
- **Colour: every value is imported** from `src/desktop/theme/`. Restorify's sunrise and the lamb come from `CAL_2003`,
  the band poster's night and lights from `CAL_1997`, Floppysheep's field and its approved spectacle colours from
  `FLOPPY` and `FLOPPY_BOMB`, the machine from `ERA1`, the 1997 web blue from `WEB97`, and Daniel's room from
  `PLACE`/`WALL` and `data/room/era1.json`. `advert.ts` writes no hex. The spectacle colours are never set out as a
  six-band rainbow. **`CAL_2026` (the queer party's palette) is deliberately not used.**
- **Lamby** is drawn by the piece's `drawLambyChar` (cheerful, idle). He is a picture only, with no voice and no speech
  bubble.
- **The end card** reads exactly what the piece's own end card (`src/desktop/setup/advertEnd.ts`) reads: the DOT glyphs
  from `src/frame/leavePage.ts`, the two lines from `data/strings/setup.json`, and the small
  print from `data/dialog/s2_media.json`.
- **The voice** is the narrator, who is the apparatus and never Lamby. It is **Kokoro-82M**, voice `am_michael` (US
  male), a neural TTS model run locally on CPU through `kokoro-onnx`; no online TTS service is involved. The model files
  (`kokoro-v1.0.onnx`, `voices-v1.0.bin`) come from the kokoro-onnx GitHub release `model-files-v1.0`. They are kept
  on disk and are not committed (≈350 MB). Kokoro is **Apache-2.0**. The first cut used espeak-ng with the MBROLA `us2`
  diphone voice. That voice is still one switch away: `script.json` → `voice`, or `--voice mbrola:mb-us2`. **To try
  another voice:** `python3 out/lambyos-advert/src/make_audio.py --voice bm_george`, then re-render. Everything
  downstream is re-timed from the new line lengths. The project's own Supertonic pipeline still can't run here: its
  weights are on Hugging Face, which this cloud machine cannot reach.
- **Music: "LambyOS Home Edition" jingle, composed and synthesised by Claude for the project** (SurvivingSOGICE,
  University of Bergen CDN, 2026). It is written in numpy/scipy, sample by sample: an FM electric piano, FM bells, a
  pulse-wave lead singing the hook, a square bass, synthesised drums, brass stabs and an orchestra hit, at 120 bpm in C
  (C–Am–F–G). It plays soft under the kitchen table and full in the parade and the pack shot. In the collapse the whole
  bed slows like a stretching tape, with the pitch sinking. The chime, the stings, the dings, the chew and the hiss are
  synthesised the same way.
- **Captions** are burned in for every spoken line. Long lines are paged two lines at a time, each page held for its
  share of the words. Sounds are captioned too, in italic brackets. The captions are drawn crisp over the tape, the way a
  TV's caption decoder overlays them.
- **Rendering** is deterministic, like `tools/render-video.mjs`: nothing is timed by the clock. `src/advert.ts` is
  bundled with esbuild and opened in headless Chromium. The driver asks for frame N, and each frame goes straight into
  ffmpeg.

### Rebuild

```
npx vite --port 3000 &                                        # the piece, for the room plates
python3 out/lambyos-advert/src/make_audio.py --work .advert-tmp   # voice + music + timeline.json   (needs kokoro-onnx + model files in .advert-tmp/kokoro, numpy, scipy)
node out/lambyos-advert/src/plates.mjs --port 3000            # the four rooms (~1 h in software GL)
node out/lambyos-advert/src/render.mjs                        # → lambyos_welcome_home.mp4 + contact_sheet.png
node out/lambyos-advert/src/render.mjs --stills 9s,30s,84s    # review frames only
```

The words live in `src/script.json`: the narrator lines, the on-screen type, and each shot's minimum length.

---

## Checked against the rules

- **Satire is only of the programme's pitch, and it collapses.** The joke is the brochure: the stings, the FREE!
  badges, "But wait — there's more!". It breaks the way the design says: the small print slows, the tape chews, and the
  noise answers the asterisk. The only documented sentence is the frame's, after the tape has died.
- **Hands, backs and empty rooms.** The only people are two hands at a table. No face, survivor, likeness or testimony
  appears, and nobody is "fixed". The NEW YOU box is a word in a starburst.
- **Invented marks only.** LambyOS, Home Edition, Restorify, GracePlatform, Un-Walk, Continuity and TriedPath Fellowship
  are all the piece's own marks. No real organisation is named or painted.
- **Faith is not mocked.** The advert's own graphics show no cross, Bible or verse. The piece's rooms keep their own
  posters, exactly as built.
- **No gender-exploratory clinical debate.** The 2026 item is the changelog's "immersive sessions · headset included",
  as in the design.
- **Lamby never speaks.** The frame never plays: no score, badge or achievement appears in the piece's own voice. The
  badges and stings are the programme's.
- **Flashing.** Nothing strobes. The star wipes, flares and pops are smooth. The chew rolls the picture once. The TV
  noise is the end card's own even grey field, re-rolled 12×/s with constant mean luminance (as in `advertEnd.ts`), and
  it fades as the dots gather.
- **Pixel discipline (a deliberate departure).** The brief asked for spinning pedestals, bounces and flares, so the
  advert uses smooth rotation and anti-aliased 3D. It is a video and not a surface of the piece. Its textures are still
  nearest-filtered, and its colours are still the palettes.

---

## Deviations and things for Sérgio to decide

1. **Length: 1:36, not ~75 s.** The design's own shot table runs to 1:27 and beyond, the kit beat adds about 6 s, and
   every caption needs reading time. To get nearer 75 s, cut in this order: the kit montage (−6 s), the fast disclaimer
   (−6.5 s), the end card's hold (−3 s), then tighten the pauses. The minimums are in `script.json`.
2. **Claude's drafts, not his words** (the design's narration is used verbatim everywhere else):
   - narrated: "But wait — there's more!";
   - on screen: the product titles (THE TAPE … IMMERSIVE SESSIONS), "HEADSET INCLUDED!", "FREE!", "HOW IT WORKS", the
     kit labels ("The 'Let go!' box — for the old things", "The House Rules sampler — doors always open", "The guest
     book — approved callers only");
   - the sampler's four rules: doors open (House Rules, B1 F22), modest dress and the Sunday house meeting (B1 F22), and
     "Never alone" (the in-phase rule, B1 F25). They are shortened from the documents as summarised in
     LAMBYOS_HOME_THINKING §1, so **[VERIFY SOURCE]** before they are kept;
   - the guest-book entries: Mom / Dad / Group leader — Y, the rest blank;
   - the extra fast small print: "…are marks of the TriedPath Fellowship. Not available in all regions. Sessions may be
     recorded for quality and care.";
   - the app screen ("GracePlatform", "412 days walking", "Polish my story"). 412 days is Restorify's streak elsewhere
     in the piece.
3. **The voice:** Kokoro `am_michael` is my pick from the auditions (`voice_auditions.mp4`), and the choice is his.
   Kokoro is Apache-2.0, so it is fine for exhibition use with a credit. If he goes back to the MBROLA voice, its
   licence only covers use where nothing is charged.
4. **Attribution, if this is ever shown:** `cassetteTape.glb` (Poly by Google, CC-BY 3.0) and `vrHeadset.glb`
   (J-Toastie, CC-BY 3.0) need the credits the piece already gives them. `cupOfTea` and `lampSquareTable` are CC0. The
   fonts baked into the picture are Inter, Liberation, DejaVu and Unifont, all free. The narrator is Kokoro-82M
   (Apache-2.0). The music is made by Claude for the project.
5. **The rooms' two moved props** (the phone onto the duvet, the headset onto the bed) exist only in this video.
6. **No "Close · Play again".** Those are buttons in the piece; the video simply ends.
