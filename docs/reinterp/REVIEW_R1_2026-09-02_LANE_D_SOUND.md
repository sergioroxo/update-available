STATUS: live

# REVIEW ROUND 1 · LANE D — SOUND DESIGN: what the piece asks for, what it never asked for, and how to get each
*Fable 5.1, 2026-09-02. Written for Sérgio to paste from. Companion to
[`REVIEW_R1_2026-09-02.md`](REVIEW_R1_2026-09-02.md) (the round report) and to the standing
[`REINTERP_AUDIO_PRODUCTION_GUIDE_2026-07-11.md`](../REINTERP_AUDIO_PRODUCTION_GUIDE_2026-07-11.md),
whose Suno/Sonauto limits and degradation chain still apply. Everything here is a BRIEF; nothing here
was built. Every commission carries a route (Suno · sound bank · in-house ffmpeg · TTS) and a
recommendation.*

## ⚑ THE GATE, FIRST
- Build-time TTS renders **the apparatus and never a person** (`data/audio/tts_manifest.json` law;
  `render.py` refuses `register ≠ apparatus`). Nothing below proposes synthesizing a human voice.
- **The ball is unvoiced by law.** Its 38 `ball_*` MC/room lines are an ethical refusal written on
  purpose (`s4_ball.json` `_docVoice`, `tts_manifest.json` `_docNoBall`). **This lane does not
  commission them and no lane may.** What it does raise (D-7) is the ball's ROOM — music heard in a
  building — which is a different object from a voice, and that is a decision for Sérgio, not for me.
- Music is invented, never a real song; no real ministry recordings, no real OS sounds (Microsoft's
  chords and Apple's chime are copyrighted works — an "error ding" has to be ours).
- Anything acquired gets a row in `assets/LICENSES.md` and, if CC-BY, an entry in
  `docs/reinterp/ATTRIBUTIONS.md` (→ `npm run gen-attributions` → `data/strings/attributions.json`,
  which the game menu's credits already render). Filter every sound-bank search to **CC0 or CC-BY 4.0
  only** — never NonCommercial: the piece is public on GitHub Pages and will be shown at festivals.
- Delivery: WAV master into `assets/audio/` (the archive), shipped copy into `public/assets/audio/`
  (mp3 96 kbps mono for voice via `tools/tts/publish_mp3.sh`; tapes through `tools/degrade_audio.sh`),
  **plus one line in `src/audio/tapeAudio.ts`'s REGISTRY** — an unregistered name is never requested and
  sounds exactly like a file that was never made (S102's lesson, `rendered-audio-needs-registering`).

---

## §1 INVENTORY — measured from `tapeAudio.ts`'s REGISTRY, every `audio` name in `data/`, and the files on disk

| class | count | what |
|---|---|---|
| registered AND on disk (plays) | **54** | 47 L clips (E4) · 4 tape tracks (Fold My Hands · New You radio · New You infomercial · Family Design Solutions) · `tape-hiss.mp3` (6 s loop) · `tapeA_side_one_intro.wav` (TTS, 15.0 s) · `lamby_puremail_apology.wav` (TTS, 30.8 s) |
| declared, unregistered, **by ethical refusal** | **38** | every `ball_o*/c*/z*` MC line. Not a commission. |
| declared, unregistered, **awaiting sound design** | **3** | `lambyos_2003_boot.mp3` (the E2 boot jingle, `s2_lamby.json:19`) · `ball_room_bed.mp3` · `ball_room_landing.mp3` (`s4_ball.json:130–131`). ⚑ `check-spec` counts only the first as missing (baseline 1): the two ball-room names match its `/^ball_/` names-only rule, so they are invisible to the check even though they are room sound, not voice. And **`ball.ts` never plays `bed` or `landing` at all** — only `lines[].audio` goes through `playOnce`. When the bed exists, nothing will play it. (Build item, see the dispatch board.) |
| **delivered and orphaned** | **1** | `Chase_The_Clouds.mp3` (30.8 s) sits in `~/Pc_Simulation/Trials Songs/` and is not in the repo, not declared, not registered. The master plan calls the sweet/broken jingle pair "E2's audio spine"; the collapse beat's *"the jingle returns broken — slow, detuned, dying music box"* has **no audio hook in any data file.** The asset exists; the piece cannot meet it. |
| **never asked for** (fiction-derived, §3) | — | room tone × 4 eras · the machines of four decades · the five update rituals · the three camera passages (21 s / 29.5 s / 42.5 s of travel with no sound whatsoever) · the Close's silence |

What is audible today, era by era, on a real run: **E1** hiss + the three tapes when pressed; **E2**
the PureMail read-aloud if pressed; **E3 nothing at all**; **E4** L; **transitions nothing**;
**the Close nothing.** Sérgio's own #1 ("the piece is nearly silent where it was designed to be
sound") stands, and the silence is not evenly distributed — Era 3 and every transition are mute.

---

## §2 THE COMMISSIONS THE PIECE ALREADY ASKS FOR

### D-1 · `lambyos_2003_boot.mp3` — the LambyOS 2003 boot jingle
**What it is.** The machine coming back up after the u2 update, at a new version, "saying so, with its
jingle" (`s2_lamby.json` `_osBootDoc`). It plays from `startE2Boot()` under a 220-character crawl at
0.030 s/char (≈6.6 s) + a 2.2 s hold + the 1.6 s "finishing installation" beat — a **6–9 s** window.
Register: `operable` — the system's confident cheer, 2003 consumer software, the propaganda's charm.
**What it must not do.** Not be a song; not quote a real OS; not exceed ~9 s or it will still be
playing when Lamby's first line lands.
**Route — RECOMMENDED: cut it from `Chase_The_Clouds.mp3`, not Suno.** The jingle already exists and
is Sérgio's; a 5–7 s startup sting that is recognisably its hook (first phrase → resolve) makes the
boot *the jingle's first appearance* and the infomercial its second — the ear learns the mark before
the mouth sells it. Two ffmpeg passes and a listen:
```
ffmpeg -i "Chase_The_Clouds.mp3" -ss <hook start> -t 6.5 -af "afade=t=out:st=5.5:d=1.0,loudnorm=I=-18:TP=-1.5" assets/audio/lambyos_2003_boot.wav
```
(Sérgio picks `<hook start>` by ear — the bar where the melody states itself; I cannot listen.)
**Suno alternative** (only if the hook does not cut cleanly). Style field:
```
short software startup jingle, 6 seconds, early-2000s consumer PC, bright synth bell arpeggio rising to one warm major chord, friendly, corporate-optimistic, clean digital, no vocals, no drums, ends on a held chord with a soft shimmer, instrumental only
```
Lyrics field: `[Instrumental]`. Generate four, keep the one that ends cleanly; trim to ≤7 s.
Registry line: `'lambyos_2003_boot.mp3': \`${AUDIO_BASE}lambyos_2003_boot.mp3\`` (mp3 via publish step).

### D-2 · The broken jingle — Chase The Clouds, dying (E2 collapse) — **an asset that exists, a hook that does not**
**What it is.** S2R.6: the infomercial's jingle "returns broken — slow, detuned, dying music box" under
the composite apology. Master-plan canon; zero data hook. Two deliverables: (a) `chase_the_clouds.mp3`
(the sweet 30 s, degraded via `degrade_audio.sh --tape03` since it is heard off the era's media) and
(b) `chase_the_clouds_broken.mp3`.
**Route — in-house, no generation needed.** The "dying music box" is a treatment of the file we have:
```
ffmpeg -i Chase_The_Clouds.mp3 -af "asetrate=44100*0.82,aresample=44100,atempo=0.92,vibrato=f=0.6:d=0.35,lowpass=f=2400,highpass=f=180,aecho=0.6:0.3:60:0.25,afade=t=out:st=20:d=8" assets/audio/chase_the_clouds_broken.wav
```
(pitch down ~3½ semitones and slowing, a slow wobble, band-limited, a short room, dying away at 20 s).
This is the same instinct as the tape97/tape03 chains: degrade what is real rather than synthesize
what is fake. Needs a data hook (`s2_media.json` or `s2_caleb.json`'s collapse beat: an `audio` field)
and a registry line — build items.

### D-3 · The ball's room — `ball_room_bed.mp3` and `ball_room_landing.mp3` — **⚑ DECISION FOR SÉRGIO, see §5**
Deferred to §5 because the route is an ethics call, not a production one.

---

## §3 WHAT THE PIECE IS MISSING THAT IT HAS NEVER ASKED FOR — argued from the fiction

The thesis the audio design already states for E4 ("one voice that never stops talking to you is
surveillance; many voices talking over each other is company") only lands if the ear has something
to compare it to. Thirty years of silence before it is not a contrast; it is an absence. Each item
below is placed where the fiction already has a beat that a sound would *explain*, and none of them
adds a beat.

### D-4 · ROOM TONE, one bed per era — the thing under everything
The bus already loops one bed (`tape-hiss.mp3`, E1's boombox) and layers one clip. Per-era beds are
the smallest possible change with the largest effect: the room *sounds* like a year. Each ~60 s,
seamless loop, mixed at the hiss bed's own level (≈ −18 dB, the "genuinely quiet floor" the bus comment
names), and each is the destination's bed that the passage (D-6) fades in.
| era | bed | argument |
|---|---|---|
| **E1 · 1997, night** | a beige PC's PSU fan, hard-disk seeks now and then, a 15.7 kHz CRT whine *implied* by a faint high shelf (the real 15.7 kHz will not survive 96 kbps and half the audience cannot hear it), a house asleep: heating pipes, one car far off | the bedroom at night; the machine is the loudest thing in it, which is the era's whole situation |
| **E2 · 2003, daylight** | the same room by day: a bigger fan, a bird outside, a door somewhere in the house, a kettle — a house being lived in *around* him | S2R.0 says "no music, silence"; silence with a house in it is what "homecoming" sounds like. Keep E2's bed the quietest of the four so Lamby's arrival has room |
| **E3 · 2016, Vera's workstation** | open-plan HVAC, a photocopier two rooms away, other people's keyboards, one phone buzzing on a desk that is not hers | the era is a *workday*, and its beat is that the light LIFTS at Malta (D-9): a lift you can hear needs a hum that can stop |
| **E4 · 2026, Maya's room** | almost nothing: a laptop fan at idle, a fridge through a wall, the building's ventilation | the design's own line — "near-silence; the quiet is what L fills" — so this bed is a *floor*, and the loudest thing in it should be the headset's ready-glow (D-10) |
**Route — sound bank, CC0 (Freesound), then ffmpeg-assembled.** Search terms: `room tone bedroom night`,
`computer fan idle 90s`, `hard drive seek`, `office ambience open plan air conditioning`,
`refrigerator hum through wall`, `laptop fan quiet`, `house interior daytime distant birds`. Filter:
licence = **Creative Commons 0** first, **Attribution** second; sample rate ≥ 44.1 k; reject anything
with music or speech. Assemble with `amix` and `afade`; loop-check with `ffmpeg -stream_loop 3`.
**Why not Suno:** Suno makes music; room tone from it comes back with a pulse in it.
**Code needed:** the bus wants `setBed(name)` with a 2.5 s crossfade, driven off the era (build item).

### D-5 · THE MACHINES OF FOUR DECADES — one-shots, diegetic, each on a beat that already exists
| cue | where in the build | sound | route |
|---|---|---|---|
| **1997 power-on** | Era 1's room WAKES and auto-boots (`r_boot`) | relay click, CRT degauss thunk, one PC-speaker POST beep, drive spin-up under the crawl | Freesound CC0: `CRT degauss`, `PC speaker beep`, `relay click`; the beep can be ffmpeg: `-f lavfi -i "sine=f=1000:d=0.18"` |
| **cassette mechanics** | the three tapes: insert, PLAY, stop, eject (`src/narrative/tapes.ts`) | plastic clack of the door, the deck's play-key thunk, the eject spring | Freesound CC0: `cassette deck insert`, `cassette play button`, `tape eject`. The era's mechanic is *physical media at the digital threshold* and today it has no body |
| **the error cascade** (u2 only) | 7 windows, one every 420 ms (`updates.json` u2 `cascade`) | one invented error ding per window: 7 dings, 420 ms apart, piling up — the "glitching effects" Sérgio missed, heard | **in-house, licence-free:** `ffmpeg -f lavfi -i "sine=f=660:d=0.12" -f lavfi -i "sine=f=523:d=0.16" -filter_complex "[0][1]concat=n=2:v=0:a=1,afade=t=out:st=0.2:d=0.08" assets/audio/err_ding_1997.wav` — a two-note fall, ours, no OS quoted. Code: `playOnce` per window |
| **E2 chat ping** | Caleb's messenger arrives ("a chat window pings", E2 script §S2R.3); the accountability alert ("encouragement may arrive at any hour") | 2003: a two-note soundcard chime, brighter than 1997's; the accountability alert the same chime *lower*, so care and surveillance share a voice | ffmpeg sines again (880→1175 Hz, 90 ms each) or Freesound CC0 `notification chime soft`; never a real messenger's sound |
| **E3 phone cascade** | `phoneE3.ts` `CASCADE_STEP = 0.45` — messages land every 0.45 s | a phone buzzing on a desk, once per message, the buzzes overlapping into a rattle | Freesound CC0: `phone vibrate on desk`; one file, triggered per message |
| **E3 APPLY / SKIP** | the correction list (`taskSurface.ts`) | APPLY: a soft confirm tick, warm; SKIP: **the same tick, nothing warmer or colder** — the record is symmetric and the sound must not editorialise where the ledger does not | ffmpeg: a 40 ms filtered click |
| **E3 → Malta, the lift** | `E3_LIFT_SECONDS = 5.0` (`cluster.ts`) | ⚑ **a sound REMOVED, not added:** the HVAC hum of D-4's E3 bed cuts out over the 5 s as the light lifts. The only glitch that brightens is also the only cue that is a silence | code only, once D-4 exists: fade the bed to zero on `setEra3Lift(true)` |
| **E4 headset** | ready-glow, the wear (0.55 s), the return to the desk (`era3Devices.ts`) | ready: a single soft ascending tone, ≤ +1 on the tone dial; the wear: nothing (her act is silent); the return: one small contact as it settles — *it stops*, and the sound is the desk, not the device | ffmpeg tone + Freesound CC0 `small object set down on wood` |
| **E4 the glitch** | `GLITCH_SECONDS = 1.2` | **SILENT — decided S101, keep it.** "the picture fails while the voice does not" | none |

### D-6 · THE FIVE UPDATE RITUALS — one family, four ages, then nothing
Every era transition runs notification → EULA → install → restart (`update.ts`), and today all five
are silent. Measured lengths: install 7.5 s (u2) / 13.5 s (u3, u4); restart dark beat 2.2 s; the
cascade 2.9 s. The ritual is *the same instrument in a new casing*, so the sounds should be the same
four gestures re-voiced per decade:
| gesture | 1997→2003 (u2) | 2003→2016 (u3) | 2016→now (u4) | **the Close** |
|---|---|---|---|---|
| **notice arrives** | PC-speaker two-tone | soundcard chime (D-5's) | a polished glass "ting" | **none** |
| **install** | a 7.5 s drive-grind loop under the typing changelog, stuttering with the bar at 72–96 % | 13.5 s fan-up + disk, and under Lamby's dispersal a faint detuned echo of the jingle (D-2's broken render, 4 s excerpt) | 13.5 s of near-nothing: one soft progress pulse per changelog line | **none** |
| **restart, 2.2 s dark** | power-down whine + fan spin-down, then room tone returns with the new era's bed (D-4) | same gesture, quieter machine | same gesture, almost inaudible | **silence, and it must stay silence.** "Your update has failed." is the title being spoken; a sound under it would be the system's, and the Close is the person's |
**Route:** Freesound CC0 (`hard drive grind`, `computer fan spin down`, `power supply click`) + the
ffmpeg tones above. **Not Suno.** ⚑ The Close row is a *design decision recorded here*: the bare
restart has no terms, no changelog, and should have no sound. If Sérgio wants the constellation to
have a sound at all, see D-11.

### D-7 · THE THREE PASSAGES — 21 s, 29.5 s and 42.5 s of travel with nothing to hear
The relocations (`cluster.ts` RELOCATIONS): E1→E2 rise 7 + build 7 + descend 7 = **21 s**; E2→E3
7 + 11 + 11.5 = **29.5 s**; E3→E4 7 + 24 + 11.5 = **42.5 s**. The audit puts every leg inside the
comfort envelope; nothing puts a sound in them. Forty-two seconds of camera travel in silence is the
single longest dead-air stretch in the piece (Lane A's timeline confirms; see the round report).
**What it should be — not music.** The passage is the building's: the origin's bed (D-4) fades over
the first third, the destination's arrives over the last third, and in between the *building itself* —
a low ventilation drone that is the same in every era, because the building never changed, only the
tenants did. That is the three-rooms-that-age thesis, heard.
**Route:** one 60 s CC0 `large building ventilation drone` / `empty corridor room tone` from Freesound,
looped, plus code: on `startCamMove` for a relocation, crossfade bed → drone → bed. Suno is wrong here
for the same reason as D-4.

### D-8 · A VOICE FOR LAMBY (E2) — the lineage L completes
Sérgio asked for this on 2026-07-24 (memory `tts-read-aloud-accessibility`): Lamby is the apparatus,
so a synthetic voice is register-correct. Today Lamby speaks only the PureMail read-aloud. With L now
voiced, the conductor lineage reads: **E1 no voice** (impersonal side-messages) → **E2 Lamby, a 2003
text-to-speech** → **E3 Lambient, silent** (seven settled marks; the style guide does the talking) →
**E4 L, too clean.** The arc is the era thesis: the machine learns to sound like a person.
**Route — TTS, Supertonic (`tools/tts/render.py`, register `apparatus`), a different voice slot from
L's F3, then a period treatment** so 2003 does not sound like 2026:
```
ffmpeg -i lamby_<id>.wav -af "aresample=11025,aresample=44100,acrusher=bits=10:mode=log:aa=1,lowpass=f=4200,volume=1.4" lamby_<id>_2003.wav
```
Scope: the `s2_lamby.json` conduction lines (≤2 per beat) and the check-in; **never** Caleb, never the
residue, never anything in a `felt` window. Captions then dwell on `max(hold, clip)` exactly as
`lVoice.ts` does — the S102 fix, reused. Build item; the manifest gains entries with `audioPrefix`
`lamby_`.

### D-9 · THE DIARY (E1) — typing, and one silence
`diary.ts`: they type at 13 cps, the flag sits 2.2 s, the deletion takes 5.5 s, the truth surges back
in 1.1 s, the split holds 3 s. A keystroke per character (a 1997 membrane keyboard, Freesound CC0
`keyboard typing single key`) for the writing; **no sound for the deletion** — the system erases
silently, that is what it does — and for the reassert, the keystrokes again, faster. The glitch has
its own sound in the cascade (D-5) that follows 1.2 s later.

### D-10 · THE E4 FLOOR IS ALREADY RIGHT — do not add to it
E4 has 47 voiced lines, a silent glitch and (pending §5) the ball. The design's "near-silence" is the
argument; the only additions this lane proposes there are the headset one-shots in D-5 and the floor
bed in D-4. Anything more would spend the contrast the ball needs.

### D-11 · THE CLOSE'S OWN SILENCE — recommended: keep it, with one exception that is not mine to make
The constellation opens out of the ceiling in silence and the four panels are read in silence. That
is correct: the frame never plays, and the Close is frame-adjacent. The master plan's Close canon says
*"TRANSCENDANCE plays clean"* — i.e. the ball's music, heard degraded through walls in E4, returns
unfiltered here. **That is the one sound the Close could carry, and it depends entirely on §5.** If
the ball's room is made, its clean version at the Close costs nothing (same file, no filter). If it is
not, the Close stays silent and loses nothing it had.

---

## §4 THE SUNO PROMPTS — paste-ready, for the pieces where a produced piece is right
Only two things in this lane are *music*; everything else is a recording or a tone.

**S-1 · Boot jingle fallback (D-1)** — style field (≤1000 chars):
```
short software startup jingle, 6 seconds, early-2000s consumer PC, bright synth bell arpeggio rising to one warm major chord, friendly, corporate-optimistic, clean digital, no vocals, no drums, ends on a held chord with a soft shimmer, instrumental only
```
lyrics: `[Instrumental]`

**S-2 · The ball's music — ONLY IF §5 RULES FOR OPTION A, which I recommend against** — style field:
```
instrumental, underground house, 124 bpm, late-night, hand-clap and crash accents on the downbeat, warm sub bass, a small crowd whooping and clapping between phrases, recorded in a hall with a long room, slightly distorted PA, live not produced, no vocals, no lyrics, loopable, 90 seconds
```
lyrics: `[Instrumental]`. ⚑ Read §5 before using this.

---

## §5 ⚑ DECISION FOR SÉRGIO — THE BALL'S ROOM (`ball_room_bed.mp3`, `ball_room_landing.mp3`)
**The fiction asks for it in its own words.** The MC says *"Music stays on. Nobody has to go anywhere."*
The E4 design says TRANSCENDANCE is "CROWDED and warm — music, chat sounds, many voices at once,
laughter bleeding through … the community's stream is alive, not produced." Today the ball is **46
silent captions over ~3.6 minutes** of a warming room, and the line about music plays over nothing.
Lane A watched it; it is the biggest single gap the review found in what a player *feels*.

**Three routes, and they are not equal:**
- **A · Suno (S-2).** Fast. ⚑ Ethically the weakest: the scene exists to be *made with rather than
  about* the people it is indebted to (`_docNoBall`; `BALLROOM_PROVENANCE §5`), and a generative
  model performing house music is a machine performing the community's form — the exact inversion
  the beat refuses for the MC's voice, one step removed. I would not.
- **B · Commission a real track** from a producer in the scene, paid and credited by name. The
  right answer; the slow one; budget and outreach are yours.
- **C · A found recording, abstracted — RECOMMENDED NOW, B LATER.** A CC0/CC-BY field recording of a
  party or club *heard through a wall* — bass, crowd, laughter, no identifiable song — is what the
  staging literally is: "sound and light in a building that has been standing since 1997." The
  `landing` is the same file with the wall taken away (the through-wall version is
  `lowpass=f=320`, the landing is the unfiltered file, and the Close's "plays clean" is that same
  file again). One recording, three states, no music generated by anyone. Freesound search:
  `party through wall`, `club neighbours bass`, `crowd cheering indoor`, `house party ambience`;
  licence CC0 or CC-BY 4.0; reject anything with an identifiable track in it (a recognisable song
  through a wall is still a real song).
**What it turns on:** whether "music" in the MC's mouth may be *music heard*, not music played.
My reading of the scene is that it may — nobody in this room is on a stage — and that C keeps every
law while A breaks the spirit of one. Either way, `ball.ts` needs the code path to play `bed` and
`landing`, which it does not have.

---

## §6 SEARCH ROUTE — the same for every found sound
1. **Freesound** (freesound.org): search term → filter *License: Creative Commons 0* → then *Attribution*.
   Sort by rating. Download the WAV/FLAC, never the preview mp3. Note the URL, the uploader and the
   licence in `assets/LICENSES.md` at once (the duck's row went unconfirmed for a month).
2. If nothing: **Pixabay Sound Effects** (Pixabay licence: attribution-free, embedded use permitted).
3. The BBC Sound Effects archive is research/educational-only — usable for a university piece in
   principle, but the repo is public; treat it as a last resort and record the RemArc terms if used.
4. Never: YouTube rips, "royalty-free" packs with unknown provenance, any real OS/app sound.

## §7 WHAT THIS LANE HANDS THE DISPATCH BOARD (code, not sound)
- `TapeAudioBus.setBed(name, crossfadeSeconds)` driven off the era + relocations (D-4, D-7).
- `ball.ts` plays `bed` at `arrival`/`ball` and `landing` at the ball's first line (D-3/§5).
- A data hook + registry line for the broken jingle (D-2); `playOnce` per cascade window (D-5).
- The `lamby_` manifest entries + caption dwell on clip length (D-8).
- `check-spec`'s `/^ball_/` names-only rule should exclude the 38 voices and **count** the two room
  files, so the bed cannot hide behind the refusal.
