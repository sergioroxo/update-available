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

**Your queue, in order of narrative value: 1. ~~the prayer~~ ✅ DELIVERED 2026-07-11
("Fold My Hands", Trials Songs/Prayer, Suno v4.5) · 2. the jingle + instrumental (REVISED
prompt below, §7) · 3. the VO cast (script below, §6) · 4. mixtape tracks (Appendix A4).**
Nothing blocks on any of it — placeholder hiss ships first.

## §6 The infomercial VO — the exact TTS script (from the authored `s2_media.json`)

Three voices + one crowd line. Generate each LINE as its own file (easier to sync than one
long take). Naming: `vo_announcer_01.mp3`, `vo_dale_01.mp3`, `vo_marcus_01.mp3`… in order.

**ANNOUNCER** — bright, too-smooth broadcast voice; the synthetic TTS timbre actively helps:
1. "Tired of feeling like yourself?"
2. "Introducing… the New You Program."
3. "Operators of grace are standing by. Call now!"
4. "Three easy payments of yourself. Supplies of you may run dry."
5. *(fast, mumbled, run-together — the disclaimer)* "…not therapy, not a cure… your old
   self may not be recoverable…"

**PASTOR DALE** — warm, unhurried, pastoral; too kind; never sinister on the surface:
1. "I know that ache, friend. I carried it too."
2. "The world says it's who you are. We say — it's a weight you can set down."
3. "Three gentle steps: confess it, submit it, let us hold it for you."
4. "Won't you come home — to the self He meant you to be?"

**MARCUS** ("program graduate") — earnest, a little rehearsed, smiling-through-it:
1. "I tried everything. I thought this was just me."
2. "Then Pastor Dale showed me the Program. Now I'm flourishing."

**CROWD** *(sung by the jingle's chorus — you do NOT need to generate this as VO; it's the
karaoke line the jingle already carries)*: "the new you — brighter, lighter, good as true!"

Delivery note: everything gets the §4 degradation pass afterward, so aim for CHARACTER over
quality. The disclaimer line (Announcer #5) is the punchline of the whole piece — speed it up,
flatten it, let it trail off.

### §6b Hugging Face fields (Qwen3-TTS and description-driven models) — paste-ready

Sérgio is using huggingface.co/spaces/Qwen/Qwen3-TTS (and similar). Those interfaces want
**Text to Synthesize + Language + Voice Description** per generation. Language = **English**
for all. One generation per line (text from §6), with these descriptions:

**ANNOUNCER (lines 1–4):**
> Adult male American English TV-commercial announcer, bright and polished, always audibly
> smiling, fast confident pacing, punchy emphasis, compressed broadcast tone, 2000s
> infomercial energy.

**ANNOUNCER (line 5, the disclaimer — its own description):**
> Adult male American English, very fast flat legal-disclaimer read, monotone, mumbled,
> quiet, words run together, trailing off at the end.

**PASTOR DALE:**
> Middle-aged male American English, warm low pastoral voice, slow and unhurried, gentle
> and reassuring, soft southern US inflection, intimate close-microphone feel, too kind.

**MARCUS:**
> Young adult male American English, earnest and hopeful, slightly nervous, rehearsed
> sincerity as if repeating a story he has told many times, medium pacing, a small smile
> in the voice.

**Other HF spaces worth trying if Qwen3-TTS fights you** (all free demos): **Parler-TTS**
(built exactly around natural-language voice descriptions — the blocks above paste straight
in), **Kokoro-82M** (very consistent, preset voices — good if you want the same voice across
many lines), **F5-TTS / XTTS-v2** (voice cloning from a short reference clip — only if you
want to record one line yourself and clone it), **Chatterbox** (expressive, good emotion
control). Consistency tip: generate ALL of a character's lines in one sitting with the same
description/voice/seed, or the voice will drift between lines.

## §7 The jingle, REVISED (Sérgio 2026-07-11: "more hyper, shorter — it's making a 2-minute song")

The fix is mostly in the LYRICS: Suno sizes the song to the lyric sheet, so the full
verse/verse/bridge structure from the old prompt yields 2 minutes. Cut to chorus + tag only.

**Style field:**
```
30-second TV advertising jingle, 2000s contemporary christian praise-pop, fast and hyper,
135 BPM, bright major key, punchy acoustic strum, tambourine, twinkly piano, earnest backing
choir, squeaky-clean, relentlessly upbeat, sing-along hook, ends on a big held note with a
spoken tagline, short jingle NOT a full song. no verses, no bridge, no long intro, no fade-out
```
**Lyrics field (this is the WHOLE thing — resist adding more):**
```
[Jingle - big and bright from the first beat]
The New You! (the new you!)
Brighter, lighter, good as true!
Smile a little wider, let the old one fade —
The New You comes with a money-back parade!

[Tag - choir holds the note]
The New Yoooou!

[Spoken - announcer, fast]
Call 1-800-NEW-YOU8. Operators of grace are standing by!
```
If it still runs long: generate, then use Suno's crop/trim on the best 30s — the jingle only
needs one clean chorus + tag. Instrumental pass: same style + empty-chorus trick or the
`[Instrumental]` tag, for the karaoke bed.

### §7b REVISED PLAN (Sérgio 2026-07-11: Suno insists on ~1 minute → we design FOR 60s)

Accept the minute. The commercial becomes 60s and the VO sits ON the jingle. Generate TWO
takes from the same prompt: **(a) the vocal take** (chorus sung) and **(b) the instrumental**
— assembly uses the instrumental as the bed under all VO and cuts to the vocal take for the
chorus + tag. You only generate; the cutting is a build-side job (I'll script the assembly
with the degradation pass).

**The 60-second cue sheet (when each voice enters — retimed from s2_media.json):**

| time | audio | on screen |
|---|---|---|
| 0.0–1.2 | static burst → instrumental bed fades in LOW | static → studio |
| 1.2 | **ANN 1** "Tired of feeling like yourself?" | host set |
| 4.5 | **DALE 1** "I know that ache, friend…" | Pastor Dale portrait |
| 8.5 | **DALE 2** "The world says it's who you are…" | — |
| 13.5 | **ANN 2** "Introducing… the New You Program." (bed rises) | brand card |
| 16.5 | **MARCUS 1** "I tried everything…" | BEFORE portrait |
| 20.5 | **MARCUS 2** "…Now I'm flourishing." | AFTER portrait |
| 24.5 | **DALE 3** "Three gentle steps…" | steps card |
| 29.5 | **DALE 4** "Won't you come home…" (bed swells) | — |
| 33.5–41.5 | **VOCAL CHORUS** — no VO — karaoke bouncing ball | karaoke bar |
| 41.5 | **ANN 3** "Operators of grace are standing by. Call now!" (bed vamps) | phone card |
| 45.0 | **ANN 4** "Three easy payments of yourself…" | fine print starburst |
| 49.0–57.0 | **VOCAL TAG** ("The New Yoooou!") held under → **ANN 5 disclaimer** mumbled
  UNDER the held note from ~51.5, trailing off | speed-crawl fine print |
| 57.0–60.0 | snap to static; a small `✓ viewed` ticks on the record | static |

Your VO takes don't need to match these lengths exactly — the sheet flexes ±1s per slot at
assembly; just keep each line inside ~4s (the disclaimer inside ~6s). The jingle prompt
stays as §7 wrote it; if Suno's minute has a verse before the chorus, that verse section of
the INSTRUMENTAL becomes the 0–33s bed — which is exactly what we want.

### §7c FINAL APPROACH (Sérgio 2026-07-11): loopable instrumental FIRST, jingle as a remix

Decision: stop fighting for one perfect jingle. **Two assets, built in order:**

**Asset 1 — the loopable instrumental bed (generate this first; it's the foundation):**
```
Instrumental 2000s contemporary christian praise-pop advertising bed, upbeat and bright,
major key, acoustic guitar strum, twinkly piano, tambourine, light drums, 110 BPM, written
to LOOP SEAMLESSLY - no intro, no outro, no fade, no key change, constant cheerful energy
throughout, 30 to 60 seconds, instrumental only. no vocals, no choir, no build-ups, no drops
```
Loopable = the commercial (and any future use — Restorify hold music, the E2 desktop
ambience) can enter and exit it at ANY point, and VO can run as long as it runs.

**Asset 2 — the sung hook, remixed FROM the bed:** use Suno's Cover/Extend on your best
bed take with ONLY the chorus lyrics (The New You! four lines + the held tag) so the sung
hook is in the same key/tempo/sound family — a 10–15s stinger we drop onto the loop at the
karaoke moment (33.5s in the §7b cue sheet) and at the end tag. If Cover fights you,
generate it standalone with: "short sung advertising jingle hook, 2000s christian praise-pop,
earnest choir and bright lead, big singable, 10-15 seconds, same feel as an existing upbeat
acoustic-and-piano bed, ends clean on a held note."

Assembly then = loop bed under everything + VO per the §7b cue sheet + hook stinger at the
chorus and tag + degradation pass. Maximum flexibility, no dependence on Suno's song-length
whims.
