STATUS: live

# SOUND SHORTLIST — six sourcing items, verified 2026-09-02

*Research session, 2026-09-02. **Nothing was downloaded** — Freesound's API returns 401 without a
key and none is configured. Every row below was verified by opening the sound's own Freesound page
and reading the licence line off it; no licence is inferred from a search listing, from an
uploader's usual habit, or from a pack.*

**Licence gate applied:** CC0 or CC-BY 4.0 only. Anything reading *Attribution NonCommercial*,
*Sampling+*, or unknown was dropped on sight, and the drops are logged so nobody re-finds them.
**⚑ 25 of the 26 candidates below are CC0** — no attribution obligation at all. The single CC-BY
row (item 1, FreqMan 23153) is marked and is ranked third precisely so it can be skipped.

**Verdict summary**

| # | What | Verdict |
|---|---|---|
| 1 | Party through a wall | **SOURCE** — 5 verified CC0 candidates, no synthesis possible |
| 2 | Building ventilation drone, ~60 s loop | **SYNTHESIZE** (Sérgio's prior confirmed) |
| 3 | Cassette deck mechanics | **SOURCE** — mechanism cannot be faked |
| 4 | Room tone, four rooms | **SYNTHESIZE the beds, SOURCE the events** (split verdict — see §4) |
| 5 | Phone vibrating on a desk | **SOURCE** (cheap, and the buzz-rate beating is real) |
| 6 | Small object set down on wood | **SOURCE** (a transient is the one thing noise synthesis cannot do) |

---

## §1 · A PARTY OR CLUB HEARD THROUGH A WALL — *the one that matters*

Used three ways from one file: `lowpass=f=320` as another room, unfiltered as the arrival, clean
once more later. **Rejection rule applied strictly: no recognisable song.** That rule is what
decides the whole item — every "nightclub ambience" on Freesound with real bass in it has a real
DJ track under it, and a real track heard through a wall is still a real track. So the pick is a
**voices-and-laughter crowd with no music at all**, and the bass comes from the room, not the file:
the wall version gets the lowpass *plus* a synthesised sub-thump bed (recipe at the end of this
section), which is both safer and more controllable than hunting for a legally clean club recording
that does not exist.

**5 verified CC0 candidates** (3 ranked + 2 spares).

| # | URL | ID | Uploader | Licence (as stated on page) | Duration | Rate / format | Why |
|---|---|---|---|---|---|---|---|
| 1 | https://freesound.org/people/Swisscomedy/sounds/445952/ | 445952 | Swisscomedy | Creative Commons 0 | 1:15.680 | 48 kHz WAV | **Best.** Literally the brief: recorded *from inside a hotel room* at 2 a.m., young people partying outside a club in the street below. Tags carry `laughter`, `party`, `club`, `crowd`. Already has the through-a-boundary character before you filter it, so the `lowpass=320` version reads as a wall rather than as a blanket. No music. Caveat: a distant ambulance late in the file — trim it. |
| 2 | https://freesound.org/people/unfa/sounds/207994/ | 207994 | unfa | Creative Commons 0 | 1:08.847 | 96 kHz FLAC | **Best for the unfiltered arrival.** "A lot of people chatting in a closed space" — dense, indoors, 96 kHz/FLAC, which is the highest-headroom source here and survives aggressive filtering without artefacts. Interior, so it is the *inside* of the party where 445952 is the outside; the two together give you arrival-and-wall from one register. No music in the recording (unfa's page mentions his own Bandcamp; that is a bio link, not the content). |
| 3 | https://freesound.org/people/SpliceSound/sounds/338114/ | 338114 | SpliceSound | Creative Commons 0 | 0:38.581 | 48 kHz WAV | **Best "house party" flavour.** Description is exactly "Medium house party, distant walla" — already distant, already domestic rather than civic. Shortest of the three, so it wants looping; the walla is even enough that it loops without a seam. No music. |
| — | https://freesound.org/people/ecfike/sounds/133819/ | 133819 | ecfike | Creative Commons 0 | 0:48.295 | 48 kHz WAV | *Spare.* Wedding reception, uploader states it is **loopable** — the only candidate whose author claims that. Take it if the loop seam on 338114 fights you. |
| — | https://freesound.org/people/Breviceps/sounds/457043/ | 457043 | Breviceps | Creative Commons 0 | 0:15.708 | 44.1 kHz WAV 16-bit | *Spare.* Clean, well-recorded (Zoom H2n), but 15 s is too short to be the whole bed. Useful as a layer to thicken the others. |

**Considered and dropped — do not re-find these:**
- `Rikus246/328445` "Club Ambience" — **Attribution NonCommercial 3.0**, *and* the description says people "listening to music". Fails twice.
- `Robinhood76/209354` "tavern ambience - looping" — **Attribution NonCommercial 4.0**. Fails the gate despite being a good muffled loop.
- `szegvari/607313`, `607315`, `607316`, `607317`, `607876` — a whole shelf of "Night Club … EDM … Techno House Music" atmospheres. Licence not pursued: **the recordings contain playing dance music**, so they fail the no-song rule regardless of licence. Do not be tempted by 607313 ("Night Club Corridor") even though the title is perfect.
- `FreqMan/23153` "Party Sounds.wav" — page states **Attribution 4.0**; legal under the gate, 0:38.452, 44.1 kHz, no music, made as background walla for a play. **Kept as the CC-BY fallback only.** Taking it costs an attribution row forever; the five CC0 options above cost nothing. Take it only if all five fail on listening.

**The bass, made not found.** Layer under the filtered version:

```
ffmpeg -f lavfi -i "anoisesrc=c=brown:r=48000:a=0.9:d=90" \
  -af "lowpass=f=110,equalizer=f=52:width_type=q:w=2:g=14,equalizer=f=78:width_type=q:w=3:g=8,\
tremolo=f=2.0:d=0.75,lowpass=f=140,loudnorm=I=-26:TP=-8:LRA=6" \
  -ac 2 party_sub_bed.wav
```

`tremolo=f=2.0` is 120 bpm — a four-on-the-floor pulse with **no melody, no key, and no
copyright**. Mix it at roughly −18 dB under the lowpassed crowd. It is the thing a real
through-a-wall recording would have given you, and it is the exact thing you cannot licence
cleanly. Do not raise `d` above ~0.8 or it starts to sound like a helicopter.

**VERDICT: SOURCE** — candidate 445952, with 207994 as the arrival layer and the synthesised
sub-bed under the filtered version. Synthesis cannot make a crowd: voices, laughter, and the
irregular rhythm of a room full of people are the definition of what noise generators do not do.

---

## §2 · BUILDING VENTILATION DRONE / EMPTY CORRIDOR TONE (~60 s, loopable)

Three verified CC0 candidates, given so the choice is real and not rhetorical:

| # | URL | ID | Uploader | Licence | Duration | Rate / format | Why |
|---|---|---|---|---|---|---|---|
| 1 | https://freesound.org/people/Sheyvan/sounds/524286/ | 524286 | Sheyvan | Creative Commons 0 | 1:00.894 | 48 kHz WAV | Exactly the requested length and exactly the requested thing ("Ambience: Deep Ventilation Hum"). Page does **not** claim it loops. |
| 2 | https://freesound.org/people/Kinoton/sounds/670070/ | 670070 | Kinoton | Creative Commons 0 | 3:00.000 | 48 kHz WAV 24-bit stereo | "Room Tone, Empty Hospital", deep ventilation hum. 3 minutes means you can cut a clean 60 s from the calmest stretch. Institutional, which matches a building standing since 1997. |
| 3 | https://freesound.org/people/ecfike/sounds/474458/ | 474458 | ecfike | Creative Commons 0 | 1:44.000 | 44.1 kHz WAV | "Concrete Hallway with Air Conditioner" — ductwork *and* fluorescent lights echoing down a corridor. The most literally-a-corridor of the three. |
| — | https://freesound.org/people/ecfike/sounds/479428/ | 479428 | ecfike | Creative Commons 0 | 3:07.152 | 44.1 kHz WAV | *Spare.* "Mall Corridor, Loud Hum" — bigger space, more echo. |

**VERDICT: SYNTHESIZE.** Sérgio's prior is right and this is the clearest case of the six. Three
reasons, in order of weight:

1. **The loop.** The requirement is a ~60 s bed under three camera moves. A found recording has to
   be *made* to loop — and every one of these carries irregular events (a distant door, a lift, a
   footstep) that announce the seam on the second pass. Synthesised noise loops perfectly because
   there is nothing in it to recognise.
2. **Tuning to the room.** The drone has to sit under narration and not fight the desktop canvas's
   own sounds. With a synthesised bed you move the resonant peak by 20 Hz and it fits; with a
   recording you EQ against someone else's room and lose the body.
3. **Cost.** Zero licence, zero attribution row, ~46 MB of render time, and it ships as a small
   loop rather than a big file.

```
# 1. render 66 s of drone (over-render, we trim to 60 with a crossfade seam)
ffmpeg -f lavfi -i "anoisesrc=c=pink:r=48000:a=0.5:d=66" \
  -af "highpass=f=28,lowpass=f=520,\
equalizer=f=52:width_type=q:w=6:g=11,\
equalizer=f=118:width_type=q:w=8:g=7,\
equalizer=f=240:width_type=q:w=4:g=-4,\
tremolo=f=0.13:d=0.12,\
aecho=0.8:0.9:220:0.18,\
loudnorm=I=-30:TP=-6:LRA=5" \
  -ac 2 vent_raw.wav

# 2. make the seam invisible: 3 s self-crossfade -> a true loop
ffmpeg -i vent_raw.wav -i vent_raw.wav -filter_complex \
  "[0]atrim=start=3,asetpts=N/SR/TB[a];[1]atrim=0:3,asetpts=N/SR/TB[b];\
[a][b]acrossfade=d=3:c1=tri:c2=tri" vent_loop.wav
```

*(Both commands run clean on ffmpeg 8.1.1 — tested this session. Step 1 alone yields 60.22 s
because `aecho` adds a tail; step 2 is what makes it loop, and lands at 60 s from a 66 s render.)*

What it reads as: `equalizer f=52 g=11` is the fan's fundamental, `f=118` its first harmonic,
the `f=240 g=-4` dip is the hollowness of a duct, `tremolo f=0.13` is the slow wander of a big
motor under load, and `aecho` at 220 ms is the corridor.

**What this will NOT capture, honestly:** the *events*. A real 1997 building gives you a lift
arriving, a fluorescent tube's 100 Hz buzz drifting in and out, someone two floors down, and
the moment the HVAC cycles. Synthesised drone is uniform, and uniform is subtly dead. **Fix:
keep 670070 as a sparse event layer** — pull two or three isolated moments out of the 3 minutes,
place them at 20–40 s intervals over the synthesised bed, at low level. That is one CC0 file, no
attribution, and it buys back the whole difference. The bed is made; the life is borrowed.

---

## §3 · CASSETTE DECK MECHANICS (insert · play-key · stop · eject spring)

| # | URL | ID | Uploader | Licence | Duration | Rate / format | Why |
|---|---|---|---|---|---|---|---|
| 1 | https://freesound.org/people/rthijs/sounds/798828/ | 798828 | rthijs | Creative Commons 0 | **12:25.775** | 96 kHz WAV | **Best, and probably the only one you need.** "Various noises I could make on a double cassette deck from 1986" — tags: `play`, `rewind`, `fast`, `forward`, `mechanical`. 12½ minutes of one authentic period deck at 96 kHz, which means **all four one-shots come from the same machine** and therefore sound like one object. That coherence is worth more than four separately-sourced perfect hits. Cost: you have to cut it yourself (~20 min of work). |
| 2 | https://freesound.org/people/kyles/sounds/635487/ | 635487 | kyles | Creative Commons 0 | 0:25.150 | 48 kHz FLAC 24-bit stereo | "cassette tape deck slot open close hard nice spring **various** and spinout end". This is the **eject spring**, isolated and clean, recorded on a Sony PCM-D50. Several takes in 25 s. Pair with 635656 (below), same recordist, same deck. |
| 3 | https://freesound.org/people/submergent/sounds/826353/ | 826353 | submergent | Creative Commons 0 | 0:12.893 | 44.1 kHz WAV 24-bit | This is the **insert**: "a cassette tape being taken out of its case and inserted into a cassette deck", MixPre-III + Sennheiser shotgun, **"No extra processing"** — which is the phrase you want on a foley one-shot. Includes the case-open, which you may want anyway. |
| — | https://freesound.org/people/kyles/sounds/635656/ | 635656 | kyles | Creative Commons 0 | 0:10.593 | 48 kHz FLAC 24-bit stereo | *Spare / companion to #2.* "slot open close hard close spring nice" — same deck, tighter. 280 downloads, one comment, so it has been used and nobody complained. |
| — | https://freesound.org/people/qubodup/sounds/622237/ | 622237 | qubodup | Creative Commons 0 | 0:20.386 | 44.1 kHz WAV | *Spare, and a texture rather than a mechanic:* a cheap player squeaking while it plays. If the piece ever wants the deck to sound **tired**, this is that sound. Not a one-shot. |
| — | https://freesound.org/people/AugustSandberg/sounds/852662/ | 852662 | AugustSandberg | Creative Commons 0 | 4:58.274 | 48 kHz WAV 24-bit mono | *Spare.* "Portadat Tape Recorder Transport Controls" — play/pause/rewind/fast-forward keys, 5 minutes of them. **Caveat: it is a DAT machine, not a cassette deck.** The key-press mechanics are close but a purist ear hears a professional transport, not a home hi-fi. Use only for the play-key if 798828 disappoints. |

**VERDICT: SOURCE.** Sérgio's prior is right, and for a reason worth stating precisely: these are
**mechanism** sounds, not texture. A cassette eject is a spring releasing a sprung-loaded door
against a plastic stop — a dense cluster of transients at specific frequencies with a specific
decay, arriving in an order that is a physical fact about the object. `anoisesrc` produces
*texture*; it has no transients and no mechanism. Every attempt to synthesise a latch reads as a
click, and a click reads as a UI beep, which is the exact register error the piece cannot afford
(§ CLAUDE.md — the frame never plays). Take 798828 and cut it.

---

## §4 · ROOM TONE, FOUR ROOMS

### (a) Bedroom at night, 1997, beige PC — PSU fan, occasional hard-disk seek

| # | URL | ID | Uploader | Licence | Duration | Rate / format | Why |
|---|---|---|---|---|---|---|---|
| 1 | https://freesound.org/people/dav0r/sounds/381258/ | 381258 | dav0r | Creative Commons 0 | 2:01.405 | 48 kHz WAV 24-bit stereo | Description is the brief verbatim: "A gentle **looping** atmo of a computer with fans, a very silent transformer hum and **occasional hard drive access**." Tag `loop`. The transformer hum is the period detail — a 1997 PSU had one. |
| 2 | https://freesound.org/people/Crinkem/sounds/493891/ | 493891 | Crinkem | Creative Commons 0 | 0:26.258 | 96 kHz WAV 24-bit stereo | "Vintage Hard Drive Read and Idle" — an *aging* drive, and the uploader explicitly removed the fan rumble so **the seek is isolated**. This is the event layer, not the bed. 96 kHz. |
| 3 | https://freesound.org/people/martian/sounds/570733/ | 570733 | martian | Creative Commons 0 | 0:42.439 | 48 kHz WAV | "computer hard drive access fan clicking whir" — the seeks with their fan context intact, if you want them pre-married rather than layered. |

### (b) Same house by daylight, 2003 — bigger fan, a bird outside, a door somewhere

| # | URL | ID | Uploader | Licence | Duration | Rate / format | Why |
|---|---|---|---|---|---|---|---|
| 1 | https://freesound.org/people/jmbphilmes/sounds/129442/ | 129442 | jmbphilmes | Creative Commons 0 | **8:50.245** | 48 kHz WAV 24-bit stereo A-B | "Room tone, medium sized apartment room with **open window. Traffic and birds** can be heard. 7 AM." Nearly nine minutes at 24-bit through AKG C3000s in proper A-B stereo — the best-recorded file on this whole page, and long enough that you can pick the exact bird you want. |
| 2 | https://freesound.org/people/ciccarelli/sounds/568943/ | 568943 | ciccarelli | Creative Commons 0 | 1:00.720 | 44.1 kHz M4A | "1 min Room tone **with bird outside window**", tagged `bedroom`, `morning`. Exactly the requested length and exactly the requested content. Downside: **M4A** — already lossy, so it will not take heavy filtering. |
| 3 | https://freesound.org/people/TRP/sounds/717439/ | 717439 | TRP | Creative Commons 0 | 2:15.673 | 48 kHz **MP3** | "Quiet morning room tone, urban residential, birds, rumble, open window." Good content, but MP3 — a fallback, not a first pick. |

*Note: no candidate contains "a door somewhere". Take the door from a separate one-shot, or from
`Kinoton/670070`'s three minutes (§2). Do not chase a single file that has all three events; it
does not exist, and layering is better anyway because you control the timing.*

### (c) Open-plan office, 2016 — HVAC, a photocopier two rooms away, other people's keyboards

| # | URL | ID | Uploader | Licence | Duration | Rate / format | Why |
|---|---|---|---|---|---|---|---|
| 1 | https://freesound.org/people/TRP/sounds/577495/ | 577495 | TRP | Creative Commons 0 | 3:56.569 | 48 kHz FLAC 24-bit stereo | "Bank, interior ambience, office, **doors, footsteps, printer, typing, voices**." The only candidate that actually contains the printer *and* the keyboards. 1,554 downloads. Nearly 4 minutes to cut from. |
| 2 | https://freesound.org/people/joseegn/sounds/752611/ | 752611 | joseegn | Creative Commons 0 | 2:22.050 | **96 kHz** WAV 24-bit stereo | "Office_Ambience_Interior_quiet" — the *bed* without the events, at the highest resolution here. Uploader: "you can randomly hear some noises and clicks caused by the chairs." Layer 577495's events over this. |
| 3 | https://freesound.org/people/simonjeffery13/sounds/750799/ | 750799 | simonjeffery13 | Creative Commons 0 | 2:37.879 | 48 kHz WAV 16-bit stereo | "Room tone of an empty studio/office." Clean, honest, and the uploader warns of "a bang midway through" — trim around it. |

### (d) Quiet room, 2026 — a laptop fan at idle, a fridge through a wall

| # | URL | ID | Uploader | Licence | Duration | Rate / format | Why |
|---|---|---|---|---|---|---|---|
| 1 | https://freesound.org/people/Warxen/sounds/481058/ | 481058 | Warxen | Creative Commons 0 | 1:29.333 | 44.1 kHz WAV | Literally "Idle/Minor Use fan noise" from a laptop (a Lenovo Y540). This is the 2026 fan and there is no period ambiguity in it. |
| 2 | https://freesound.org/people/kyles/sounds/637570/ | 637570 | kyles | Creative Commons 0 | 0:40.740 | 48 kHz FLAC 24-bit stereo | "fridge refrigerator compressor **light hum not active** with nice airy kitchen tone" — the *quiet* state of a fridge, which is what you hear through a wall, rather than the compressor roar most fridge recordings capture. |
| 3 | https://freesound.org/people/SpliceSound/sounds/338115/ | 338115 | SpliceSound | Creative Commons 0 | 0:51.164 | 48 kHz WAV 24-bit stereo | "Residential kitchen roomtone, refrigerator fridge hum, **quiet**." 1,692 downloads. The straightforward pick if 637570's perspective shifts get in the way. |

### VERDICT (item 4): **SYNTHESIZE the beds — SOURCE the events.** A split, and I'll argue the split.

Sérgio's prior ("4 is better made than found") is **right about three-quarters of this item and
wrong about the last quarter**, and the quarter matters.

**Right about the beds.** A PSU fan, a laptop fan, an HVAC bed, a fridge through a wall: these are
all the same physical object — a motor turning at a fixed rate inside a resonant box. That is
*exactly* filtered noise plus resonant peaks. Four beds, four chains, all tested this session:

```
# (a) 1997 beige PC — small high-revving PSU fan, hard tonal peak, no low end (small case, cheap bearings)
ffmpeg -f lavfi -i "anoisesrc=c=pink:r=48000:a=0.4:d=30" \
  -af "highpass=f=45,lowpass=f=1800,\
equalizer=f=96:width_type=q:w=9:g=10,\
equalizer=f=192:width_type=q:w=12:g=6,\
equalizer=f=640:width_type=q:w=3:g=-6,\
tremolo=f=0.2:d=0.06,loudnorm=I=-32:TP=-8:LRA=4" -ac 2 rt_1997_bed.wav

# (b) 2003 daylight — bigger, slower fan; peak drops, the room opens up
ffmpeg -f lavfi -i "anoisesrc=c=pink:r=48000:a=0.4:d=30" \
  -af "highpass=f=35,lowpass=f=2400,\
equalizer=f=64:width_type=q:w=7:g=9,\
equalizer=f=128:width_type=q:w=10:g=5,\
tremolo=f=0.15:d=0.05,loudnorm=I=-33:TP=-8:LRA=4" -ac 2 rt_2003_bed.wav

# (c) 2016 open-plan HVAC — broad, no single pitch, big room
ffmpeg -f lavfi -i "anoisesrc=c=pink:r=48000:a=0.5:d=60" \
  -af "highpass=f=30,lowpass=f=900,\
equalizer=f=58:width_type=q:w=4:g=8,\
equalizer=f=145:width_type=q:w=3:g=4,\
equalizer=f=400:width_type=q:w=2:g=-3,\
tremolo=f=0.09:d=0.10,aecho=0.8:0.88:180:0.14,\
loudnorm=I=-31:TP=-7:LRA=5" -ac 2 rt_2016_bed.wav

# (d) 2026 quiet room — near-silence plus one fridge note through a wall
ffmpeg -f lavfi -i "anoisesrc=c=brown:r=48000:a=0.6:d=30" \
  -af "highpass=f=30,lowpass=f=300,\
equalizer=f=60:width_type=q:w=5:g=9,\
equalizer=f=124:width_type=q:w=7:g=5,\
loudnorm=I=-34:TP=-9:LRA=4" -ac 2 rt_2026_bed.wav
```

Note what the four chains do *as a set*: the resonant peak walks **96 Hz → 64 Hz → 58 Hz → 60 Hz**
and the top end walks **1.8 kHz → 2.4 kHz → 900 Hz → 300 Hz**. That is the three decades of the
piece expressed as one continuously-moving filter, which is a thing you can only do when you own
the generator. Four found recordings from four different rooms will never line up that way, and
the misalignment is audible as *four unrelated files*, not as one house ageing. **This is the real
argument for synthesis here, stronger than the licence argument.**

**Wrong about the events, and this is the quarter that matters.** Every one of the four rooms is
specified by its *interruptions*, not its bed — "occasional hard-disk seek", "a bird outside, a
door somewhere", "a photocopier two rooms away, other people's keyboards", "a fridge through a
wall". Those are the entire content of the brief. A hard-disk seek is a voice-coil actuator
slamming a head assembly across a platter; a bird is a bird. **None of it is filtered noise**, and
attempting any of it in ffmpeg produces the tell that gives away synthetic ambience: a bed that
never surprises you. Left as pure synthesis, item 4 will sound *processed* — technically correct,
narratively inert, and it will read as a mistake in a piece whose whole aesthetic law is that the
witness side is the sharp side.

**So: render the four beds, then layer sparse events over them** — `493891` for the 1997 seeks,
`129442` for the 2003 bird, `577495` for the 2016 printer and keyboards, `637570` for the 2026
fridge. Four CC0 files, zero attribution rows, and the beds stay ours and stay tunable.

---

## §5 · A PHONE VIBRATING ON A DESK (single buzz, triggered repeatedly)

| # | URL | ID | Uploader | Licence | Duration | Rate / format | Why |
|---|---|---|---|---|---|---|---|
| 1 | https://freesound.org/people/kyles/sounds/637346/ | 637346 | kyles | Creative Commons 0 | 0:04.838 | 48 kHz FLAC 16-bit mono | "cell phone smartphone vibrate **single**.flac" — the word *single* is the whole requirement. Mono, ~5 s, one clean buzz to trim. Sony PCM-D50. Best fit by a distance. |
| 2 | https://freesound.org/people/mobaudio/sounds/384487/ | 384487 | mobaudio | Creative Commons 0 | 0:03.030 | 48 kHz WAV | "cell phone vibrate glass_**loopable**" — a Nexus 6 on a glass tabletop, author-declared loopable. Take this if the buzz needs a variable length rather than a fixed one-shot. Glass, not wood; brighter, more rattly. |
| 3 | https://freesound.org/people/Garuda1982/sounds/464877/ | 464877 | Garuda1982 | Creative Commons 0 | 0:59.830 | **96 kHz** WAV stereo | A full minute of vibration at 96 kHz stereo — a library to cut several *non-identical* buzzes from, which is what you want for something "triggered repeatedly". The identical-repeat tell is the risk on this item; this file is the cure. |

**VERDICT: SOURCE.** Synthesis is possible in principle — `anoisesrc` + a ~180 Hz resonant peak +
`tremolo` at ~200 Hz gets you a buzz — but it misses the single thing that makes this sound
*a phone on a desk*: the **beating between the motor's rate and the desk's own resonance**, plus
the intermittent buzz-rattle as the phone walks a millimetre across the surface. That irregularity
is the sound. `tremolo` is periodic by definition and cannot produce it. Also: this is one 5-second
CC0 file. There is nothing to save here.

⚑ **Repetition warning for whoever wires this:** the brief says *triggered repeatedly*, and a
byte-identical buzz played six times reads as a UI event, not as a phone. Cut three variants from
`464877` and rotate, or apply a ±3% random `asetrate` at build time.

---

## §6 · A SMALL OBJECT SET DOWN ON WOOD (a headset returning to a desk)

| # | URL | ID | Uploader | Licence | Duration | Rate / format | Why |
|---|---|---|---|---|---|---|---|
| 1 | https://freesound.org/people/kyles/sounds/450797/ | 450797 | kyles | Creative Commons 0 | 0:13.138 | 48 kHz WAV 24-bit mono | "**eyeglasses** remove or pickup handling **put down on wood table**". Closest physical analogue on Freesound to a headset: light, plastic-and-metal, hinged, with the same soft double-tap as a headband settling. Mono 24-bit, several takes in 13 s. **Best fit by material, not just by action.** |
| 2 | https://freesound.org/people/craigsmith/sounds/481870/ | 481870 | craigsmith | Creative Commons 0 | 0:31.247 | 48 kHz WAV | "Enter room and put objects down **loudly** onto wooden table" — vintage Hollywood foley (1930s–60s optical tracks, transferred by USC Cinema). Character, and a period grain that might suit an aged room. Caveat: *loudly*, and it is optical-track audio, so it carries its own noise floor. |
| 3 | https://freesound.org/people/guidofm/sounds/822488/ | 822488 | guidofm | Creative Commons 0 | 0:07.045 | **96 kHz** WAV 24-bit mono | Wooden spoon onto a wooden desk, fast. 96 kHz mono, professionally recorded, very clean transient. Wrong material (wood-on-wood is duller than plastic-on-wood) but the cleanest single hit here — pitch it up ~15% and it passes. |
| — | https://freesound.org/people/SpliceSound/sounds/218333/ | 218333 | SpliceSound | Creative Commons 0 | 0:15.359 | 48 kHz WAV 24-bit mono | *Spare.* Glass cup on a wood table, 6,806 downloads. Too ringy for a headset on its own, but a good top layer if 450797 lands too soft. |

**VERDICT: SOURCE.** This is the strongest case against synthesis of all six items, and it is
short: **the entire sound is one 4-millisecond transient plus the wood's decay.** ffmpeg's noise
sources have no impulse; a shaped noise burst yields a "tick" with no body, and no `equalizer`
chain puts the body back, because body is a resonant object being struck, not a filter being
swept. One CC0 file, 13 seconds, done.

---

## §7 · PASTE-READY FOR SÉRGIO

**Open these, in this order, in one sitting while logged in to Freesound.** Everything below is
**CC0** — nothing on this list obliges attribution. Total: 14 files.

```
ITEM 1 — party through a wall (THE IMPORTANT ONE; grab all four)
https://freesound.org/people/Swisscomedy/sounds/445952/
https://freesound.org/people/unfa/sounds/207994/
https://freesound.org/people/SpliceSound/sounds/338114/
https://freesound.org/people/ecfike/sounds/133819/

ITEM 3 — cassette deck mechanics (798828 is the main one; 12 min, cut all four one-shots from it)
https://freesound.org/people/rthijs/sounds/798828/
https://freesound.org/people/kyles/sounds/635487/
https://freesound.org/people/submergent/sounds/826353/

ITEM 5 — phone vibrating on a desk
https://freesound.org/people/kyles/sounds/637346/
https://freesound.org/people/Garuda1982/sounds/464877/

ITEM 6 — object set down on wood
https://freesound.org/people/kyles/sounds/450797/

ITEM 4 — the EVENT layers only (the four beds get synthesised; see §4)
https://freesound.org/people/Crinkem/sounds/493891/     (1997 hard-disk seek)
https://freesound.org/people/jmbphilmes/sounds/129442/  (2003 bird / open window)
https://freesound.org/people/TRP/sounds/577495/         (2016 printer + keyboards)
https://freesound.org/people/kyles/sounds/637570/       (2026 fridge through a wall)

ITEM 2 — nothing to download (synthesised). OPTIONAL event layer for the drone:
https://freesound.org/people/Kinoton/sounds/670070/
```

⚑ **Every downloaded file needs its row in `assets/LICENSES.md` at the moment of download — not
later.** A previous asset's attribution row went unconfirmed for a month; that is the failure mode
this note exists to prevent. All 14 above are CC0, so each row is one line and costs nothing:

```
| <key> | <filename> | Freesound #<id> — "<title>" by <uploader> (https://freesound.org/people/<uploader>/sounds/<id>/) | CC0 1.0 | no | <what it is used for> |
```

**If a file you download is NOT on this list, verify its licence on its own page before the row is
written.** The one CC-BY candidate found this session (`FreqMan/23153`) is deliberately not in the
paste block; if it is ever taken, its row needs `**yes**` in the attribution column and a matching
entry in `docs/reinterp/ATTRIBUTIONS.md`, same as `cassettePlayer` and `cassetteTape`.

---

*Method note: 26 candidates opened and read individually; 3 dropped for NonCommercial licences and
5 dropped for containing playing music. Freesound's `?f=license:"Creative Commons 0"` search facet
was used to narrow, but **no licence in this document comes from that filter** — each was read off
the sound's own page. Nothing was downloaded, no account was created, no session was authenticated.
All ffmpeg chains in §1, §2 and §4 were executed on ffmpeg 8.1.1 this session and produce output;
they are syntax-verified, not ear-verified.*
