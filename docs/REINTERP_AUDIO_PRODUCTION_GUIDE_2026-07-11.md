# REINTERP AUDIO PRODUCTION GUIDE — the prayer, the VO, the tools (2026-07-11)

*Fable, for Sérgio. Practical, paste-ready. Tool limits checked against current (2026) docs.
Companion to `REINTERP_R28-2_GUIDED_NARRATIVE_SPEC_2026-07-10.md` Appendix A and
`EVANGELIST_JINGLE_PROMPT_2026-06-30.md`. All lyrics PLACEHOLDER — your pass is final (G1).*

---

## §1 Tool limits that matter (checked 2026-07)

| | **Suno (v4.5/v5)** | **Sonauto** |
|---|---|---|
| Style/prompt field | ~1,000 characters | give **tags + lyrics** OR **prompt + lyrics** — you cannot use prompt AND tags AND lyrics together |
| Lyrics field | 5,000 chars (practical sweet spot ~3,000 before it rushes) | custom lyrics supported; empty lyrics = instrumental |
| A cappella | the tag `a cappella` works; reinforce with negatives ("no instruments") — it still sometimes sneaks instruments in, so generate several takes | vocal generation with custom lyrics; put "unaccompanied, voices only" in tags |
| Length | fine for 60–90s pieces | up to ~4:45 (V3 preview); extendable |
| Cost | credits | free/unlimited (no credit system) |

("Trebo" from the old jingle doc: if that's a distinct tool you use, the same pattern applies —
keep style/tags separate from lyrics, front-load the a-cappella instruction.)

## §2 The prayer — paste-ready versions

### Suno version
**Style field (fits the 1,000-char limit):**
```
a cappella congregational singing, unaccompanied voices only, small church group of mixed
voices, one uncertain teenage male voice slightly apart from the group, slow simple original
hymn melody, minor key resolving to major, recorded on a cheap 1990s cassette recorder in a
carpeted room, close and intimate, slightly muffled, warm tape hiss, amateur congregation not
a choir, plain and sincere, 60-90 seconds. no instruments, no piano, no guitar, no organ, no
drums, no reverb tail, no professional polish, no modern production
```
**Lyrics field:** the Appendix A1 lyrics exactly as written (Verse 1 / Chorus / Verse 2 /
Bridge / Final chorus), and change the final chorus header to:
```
[Final Chorus - the group fades out, one young male voice alone, fragile]
```

### Sonauto version
Use **tags + lyrics** (no prompt): tags =
```
a cappella, congregational hymn, unaccompanied vocals, 1990s cassette recording, lo-fi,
amateur church group, intimate, tape hiss, minor key, slow, sincere, voices only
```
lyrics = same as above.

### The "boy alone on the last line" trick
Both tools are unreliable at "one voice separates from the group" inside a single generation.
The dependable route: **generate the full-group version; then a second generation of ONLY the
final chorus** with style "solo teenage male voice, fragile, a cappella, same cassette
character" — and we crossfade the two in post (a 2-minute edit; I'll handle it or script it).
If a single take happens to nail the separation, even better — keep it.

### If it keeps coming out too polished
Add "amateur, slightly out of tune, untrained congregation" to the style. And remember the
post-degradation pass (§4) buys a lot — pick the take with the best *feeling*, not the best
fidelity.

## §3 The commercial VO — your instinct is right, and here's the menu

First, one correction: **Ollama won't do this** — it runs text models only, no audio out. But
free digital voices absolutely exist, and a slightly synthetic read actually FITS (the
apparatus's broadcast voice), especially for the Announcer:

| Route | What it is | Best for | Effort |
|---|---|---|---|
| **edge-tts** (free CLI, Microsoft neural voices) | dozens of voices, one `pip install`, one command per line | fastest full cast; Announcer especially | minutes |
| **Kokoro** (open-weights local TTS) | natural, warm, runs fine on a Mac | Pastor Dale + Marcus (they need warmth) | ~30 min setup |
| **Piper** (light local TTS) | fast, slightly synthetic timbre | the Announcer's "too-smooth broadcast" voice | ~15 min setup |
| **Bark** (open-source TTS) | characterful, unpredictable, does laughs/hesitation | wildcard takes | slower |
| ElevenLabs free tier | best quality, limited minutes | if the free minutes cover the ~20 lines, done | minutes |

**Recommendation:** edge-tts or ElevenLabs free tier for a first full pass of all lines from
`s2_media.json` (three distinct voices: too-warm host, earnest graduate, bright announcer) —
have it in an afternoon; upgrade individual voices later only if one grates. The unifier is §4.

## §4 The VHS/cassette degradation pass (the great equalizer)

Everything — jingle, VO, even mediocre takes — goes through one local processing chain that
makes it read as taped-off-broadcast 2003 / taped-in-a-church-room 1997: band-limit the
frequencies (AM-radio narrowness), a touch of pitch wow, a hiss floor mixed under, slight
saturation. This is an offline production step (ffmpeg/sox — free, local, nothing at runtime),
and it's why NONE of the sources need to be perfect. When your files land I'll commit a small
`tools/` script with two presets (`--tape97`, `--vhs03`) so the treatment is one command and
identical across all assets.

## §5 Delivery

Drop finished (or raw — I can degrade them) files anywhere under `Pc_Simulation/` like you did
with Chase_The_Clouds.mp3, ideally named plainly: `prayer_group.mp3`, `prayer_solo_end.mp3`,
`newyou_jingle.mp3`, `newyou_jingle_instrumental.mp3`, `vo_dale_01.mp3`… and tell me where.
Import into the repo (with provenance in assets/LICENSES.md) happens in the build lane.

**Your queue, in order of narrative value: 1. the prayer (group + solo-end takes) ·
2. the jingle + instrumental (prompt doc is ready) · 3. the VO cast · 4. mixtape tracks
(Appendix A4).** Nothing blocks on any of it — placeholder hiss ships first.
