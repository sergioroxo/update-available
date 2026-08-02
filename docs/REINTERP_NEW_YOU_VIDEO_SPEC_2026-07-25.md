STATUS: live

# THE NEW YOU VIDEO — rebuild to the real song (2026-07-25)
*From Sérgio's playthrough: "the video itself is very not related to the content of the song, and
also the song doesn't yet play." Diagnosed against the files he supplied. **All four of his audio
complaints have one root cause: the built video is a 48-second PARAPHRASE of a song that is
actually 1:54 and was never wired up.** Everything needed to fix it now exists.*

## The diagnosis (verified)

| Symptom | Cause |
|---|---|
| **No sound** | `s2_media.json` sets `audioTrack: "new_you_program_song.mp3"` — that file is neither in `public/assets/audio/` nor registered in `tapeAudio.ts`. It has never existed. |
| **Jingle cuts off too quickly** | The only related asset is `discover_the_new_you_tape97_radio.mp3` — **366 KB**, a short excerpt. The real song is **2.7 MB / 1:54**. Also `duration: 48` truncates it regardless. |
| **Sounds like a radio, not a tape** | The registered file is literally `…_tape97_RADIO.mp3` — degraded with a radio preset. Correct for a 1997 radio spot; wrong for this. `tools/degrade_audio.sh` holds the presets. |
| **Lyrics out of sync** | The 13 scenes are hand-written *paraphrases* on invented timings. They were never derived from the song. |
| **Video unrelated to song** | Same cause — plus the ORDER is wrong: the real song puts *"Three easy payments of yourself"* **before** *"Operators of grace are standing by"*; the build has them reversed. |

**And the biggest miss:** the real song ends with the **triple "Call now"** at 1:40.30 / 1:40.60 /
1:45.32. The piece's staging has always been *"the triple 'Call now!' loops and warps"* — **the
break beat is already written into the song, and the build never lands on it.**

## Source assets (Sérgio, 2026-07-25)
- Audio: `~/Pc_Simulation/Trials Songs/Infomercial/Discover the New You_Infomercial.mp3` (1:54)
- Line-timed lyrics: `…/discover_the_new_you_infomercial (line).txt`
- **Word-timed** lyrics: `…/discover_the_new_you_infomercial (word).txt` ← enables a real karaoke ball
- Background: `~/…/SurvivingSOGICE/Digital Storytelling/Discover The New You.md`

## The real structure — build the video to THIS

| t (s) | Lyric | Shot | Note |
|---|---|---|---|
| 5.92 | Tired of feeling like yourself? | `host` ANNOUNCER | the hook — victim-blaming frame |
| 8.78 | I know that ache, friend, I carried it too | `host` PASTOR DALE | the "I was you" move |
| 12.70 | The world says it's who you are, we say | `host` PASTOR DALE | |
| 17.16 | It's a weight you can set down | `host` PASTOR DALE | the whole ideology in one line |
| 21.50 | Introducing the new you program | `brand` | product reveal |
| 25.73 | I tried everything, I thought this was just me | `testimony` MARCUS | `grade: before` |
| 33.43 | Then Pastor Dale showed me the program | `testimony` MARCUS | |
| 37.07 | Now I'm flourishing | `testimony` MARCUS | `grade: after` — the era's word |
| 41.65 | Three gentle steps | `host` PASTOR DALE | |
| 43.21 | **Confess it** | step card 1 | one beat each — they land like a countdown |
| 44.29 | **Submit it** | step card 2 | |
| 45.11 | **Let us hold it for you** | step card 3 | the actual ask |
| 49.19 | Won't you come home | `crowd` | |
| 52.05 | To the self he meant you to be | `crowd` | |
| 58.51 | Feeling lost and incomplete inside | `crowd` chorus | **karaoke from here** |
| 62.39 | Let go of everything you hide | chorus | |
| 66.55 | Discover the new you today | chorus | |
| 70.79 | It's a brighter, lighter way | chorus | *(the real line — the build invented "good as true")* |
| 74.85 | Yes, discover the new | chorus | |
| 78.91 | The new you | chorus climax | |
| ~79–88 | *(instrumental ~9s)* | product / phone number | room to breathe; use it |
| 88.25 | **Three easy payments of yourself** | `offer` | ⚑ THE STING — selfhood as a payment plan |
| 91.70 | Operators of grace are standing by | `offer` | *(note: AFTER the payments line, not before)* |
| ~92–100 | *(instrumental ~9s)* | offer / phone | the last calm before the break |
| **100.30** | **Call now** | `offer` | ⚑ **THE BREAK STARTS HERE** |
| **100.60** | **Call now** | degrading | tape drags, smiles hold too long |
| **105.32** | **Call now** | tearing | signal tears → Caleb's toast cuts in |
| ~108–114 | *(outro)* | static / notice | the disclaimer crawl, then auto-close |

**Duration: 114s** (was 48). **Break: ~100s** (was 42.5). Skip still arms at 15s per S48.

---

# S51 — THE NEW YOU VIDEO, REBUILT TO THE SONG · Opus, high effort
**⚑ PROMPT STATUS: SHIPPED — do not dispatch.** Kept as the reasoning trail only.

```
You are building ONE session of the reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp,
branch reinterp, ?reinterp=1). Read first: CLAUDE.md, docs/ETHICS_CONSTRAINTS.md,
docs/REINTERP_NEW_YOU_VIDEO_SPEC_2026-07-25.md (THE SPEC — the timing table is authoritative),
docs/REINTERP_AUDIO_PRODUCTION_GUIDE_2026-07-11.md, tools/degrade_audio.sh, src/audio/tapeAudio.ts,
src/desktop/apps/netvision.ts, data/dialog/s2_media.json, and the tail of 01_SESSION_LOG.md.

THE PROBLEM: the built video is a 48-second paraphrase of a song that is really 1:54, wired to an
audio file that does not exist. Sérgio loves the OS aesthetic, the scanlines and the noise — DO NOT
restyle any of that. This session makes the video BE the song.

SCOPE:
1. AUDIO. Copy the real track in and register it:
   source: "/Users/sergiogalvaoroxo/Pc_Simulation/Trials Songs/Infomercial/Discover the New You_Infomercial.mp3"
   → public/assets/audio/ (keep the repo's snake_case naming), registered in src/audio/tapeAudio.ts,
   and referenced by s2_media.json's audioTrack. Verify it actually PLAYS in-build — a missing file
   currently degrades silently, which is exactly why nobody noticed.
   ⚑ TAPE, NOT RADIO (Sérgio): the existing discover_the_new_you_tape97_radio.mp3 was degraded with
   a RADIO preset and he says it "makes no logic here" — the diegetic source is a VHS/tape, not a
   broadcast. Use tools/degrade_audio.sh's tape treatment, and go LIGHTER on the static than the
   current asset: he said the noise is "a bit too much". The degradation should read as tape
   generation-loss, not as interference. If the tape preset needs authoring, do it in that script.
2. RETIME THE 13 SCENES to the spec's table — every `at` value comes from the real line-timed
   lyrics. Set duration 114. The lyric TEXT should match the song as sung (the build currently
   paraphrases, e.g. it invented "brighter, lighter, good as true" where the song says "It's a
   brighter, lighter way"). Fix the ORDER: "Three easy payments of yourself" (88.25) comes BEFORE
   "Operators of grace are standing by" (91.70) — the build has them reversed.
3. THE THREE STEPS get their own beats: "Confess it" (43.21) / "Submit it" (44.29) / "Let us hold
   it for you" (45.11) land one after another like a countdown — they are ~1s apart in the song and
   the build currently compresses them into a single line.
4. ⚑ THE BREAK MOVES TO THE REAL TRIPLE. The song ends with "Call now" at 100.30 / 100.60 / 105.32.
   That IS the break the spec always described ("the triple 'Call now!' loops and warps"). Stage the
   existing degradation there — it is written into the music, so let the music drive it. Caleb's
   cut-off toast arrives through the tear, as built. Keep the existing glitch vocabulary; invent none.
5. KARAOKE, REAL. There is a WORD-TIMED lyric file:
   "…/discover_the_new_you_infomercial (word).txt" — use it so the bouncing ball actually tracks the
   sung words during the chorus (58.51 → 78.91). If per-word sync is too costly, per-line is
   acceptable — say which you did and why in the log.
6. Two ~9s instrumental gaps (79–88, 92–100) are shot opportunities, not dead air — product card,
   phone number, crowd. Keep them calm; the break should feel like it interrupts something placid.

FILES YOU MAY TOUCH: data/dialog/s2_media.json, src/desktop/apps/netvision.ts, src/audio/tapeAudio.ts,
public/assets/audio/** , tools/degrade_audio.sh, docs/reinterp/01_SESSION_LOG.md. NOT:
src/desktop/apps/caleb.ts or accountability.ts, src/engine/app.ts, any provotype or dossier file.

ACCEPTANCE: you have WATCHED THE WHOLE 114s AT REAL SPEED with sound and can state in the log that
the subtitles land on the sung words; the track plays (prove it — a missing file degrades silently);
the audio reads as tape, not radio, with less static than before; the break fires on the real triple;
skip still arms at 15s. npm test + npm run build green; baselines unaffected.
GIT DISCIPLINE (mandatory): explicit pathspecs only — `git commit -- <your files>`; never bare
`git commit` or `git add -A`; check `git status --short` first.
Blocked ≠ improvise: STOP and log BLOCKED.
```

---

# S52 — E1 PROPS: THE BOOMBOX AND THE TAPES · Sonnet 5, high effort
**⚑ PROMPT STATUS: SHIPPED — do not dispatch.** Kept as the reasoning trail only.

```
Build session, reinterp worktree (…/update-available-reinterp, branch reinterp, ?reinterp=1).
Read CLAUDE.md (aesthetic laws + the Quest budget), docs/REINTERP_NEW_YOU_VIDEO_SPEC_2026-07-25.md
(this section), src/narrative/tapes.ts, src/room/*.ts, data/room/era1.json, and the tail of
01_SESSION_LOG.md. Session 49 made the cassette player real and the tapes reachable; Sérgio played
it and found what is still wrong.

SCOPE — all four are his direct observations:
1. THE BOOMBOX FACES THE WRONG WAY. Its face (deck, speakers, controls) is currently oriented UP;
   it must face the PLAYER at the seat. Rotate the model so the front is presented to the room —
   90°-step rotations only, per the aesthetic law. Re-verify the click geometry after rotating: S49
   placed the hit targets against the old orientation.
2. THE TAPES HAVE NO MODEL AND FLOAT. They are currently untextured boxes and do not rest on the
   shelf surface. Give them a real cassette model (check the staged Kenney/Quaternius library first
   — S49 found the cassettePlayer GLB already present and unused for 17 sessions; a cassette may
   likewise already be there) and seat them properly on the measured shelf surface.
3. TAPES SHOULD DISAPPEAR WHEN INSERTED, AND COME BACK ON EJECT. Right now a tape stays on the
   shelf after being put in the player. Clicking a tape should take it OFF the shelf and into the
   deck; changing tapes should return the previous one to its slot. This is the physical logic the
   scene implies and it is currently broken.
4. Two loose ends S49 logged and left: `cdStack` is ~12cm sunk into the bookcase model, and
   guide.ts's stale comment claiming "tapePlayed waits for the R28-2b tape system" (it shipped in
   Session 32) should be deleted.

FILES YOU MAY TOUCH: data/room/era1.json, data/room/reinterp_deltas.json, data/room/models.json,
src/room/*.ts, src/narrative/tapes.ts, src/narrative/guide.ts, src/engine/app.ts (prop/click
geometry only), docs/reinterp/01_SESSION_LOG.md. NOT: src/desktop/**, data/dialog/**.

ACCEPTANCE: from the seat, the boombox reads as a boombox facing you; three tapes rest visibly ON
the shelf with real models; clicking a tape moves it into the deck and it LEAVES the shelf;
swapping returns the old one. Verified with real clicks and screenshots from the actual seat pose,
not a debug camera. npm test (check-rooms will catch bad prop folds) + npm run build green.
GIT DISCIPLINE (mandatory): explicit pathspecs only. Blocked ≠ improvise: STOP and log BLOCKED.
```

---

# S53 — THE ENTRANCE, REFINED · Opus, high effort
**⚑ PROMPT STATUS: SHIPPED — do not dispatch.** Kept as the reasoning trail only.

```
Build session, reinterp worktree (…/update-available-reinterp, branch reinterp, ?reinterp=1).
Read CLAUDE.md (the comfort law is load-bearing), docs/REINTERP_OPENING_DECISION_2026-07-24.md,
the S48 session-log entry on the descent, src/engine/app.ts, src/desktop/orientingCard.ts, and the
tail of 01_SESSION_LOG.md.

CONTEXT: S48 built the overhead descent Sérgio asked for. He has now played it and wants it softer
and less mechanical. His words: "I would like to see a little bit of transparency on the beginning
screen and also feel like the zoom in to place should be more in a curve, it can start a bit down
in the room, not centered with the chair, that way we 'enter' the room and the camera also rotates
to be in front of the screen, not so mechanical of going down to the seat and up to the screen,
that way it can slowly flow."

SCOPE:
1. TRANSPARENCY on the log-in panel — let the moonlit room read faintly THROUGH the opening screen,
   so the space exists before you enter it. Keep every word legible (this panel carries the content
   note and the controls; readability wins over atmosphere — if transparency costs legibility, back
   it off and say so).
2. THE DESCENT BECOMES A CURVE, NOT A DROP. Today it falls straight down at a forced pitch and then
   levels — two mechanical phases. Replace with ONE continuous curved path: start lower, OFF-CENTRE
   from the chair, and arc in toward the seat while the camera's aim eases around to face the
   monitor. Position and orientation should resolve TOGETHER at the end, so it reads as entering a
   room and settling, not as a crane shot hitting two marks.
3. ⚑ THE COMFORT LAW STILL BINDS, and S48 flagged this as the piece's only artificial locomotion in
   a work whose bodily law is "you never walk". Simultaneous translation + rotation is exactly what
   provokes VR sickness, so the curve must be SLOW and gentle: keep peak angular rate well under
   S48's measured 41°/s, keep translation under ~1 m/s, ease in and out, and never roll. Preserve
   `?descent=0` for the A11 A/B. State your measured peaks in the log. If you cannot make the
   simultaneous version comfortable, keep them sequential and say so — comfort beats elegance.
4. Then S44's wake (lights up, machine boots) as built. Do not change it.

FILES YOU MAY TOUCH: src/engine/app.ts (the descent only), src/desktop/orientingCard.ts,
data/strings/orientingCard.json, docs/reinterp/01_SESSION_LOG.md. NOT: src/desktop/apps/**,
src/witness/intake.ts, any dialog or provotype data.

ACCEPTANCE: watched at real speed; the entrance reads as one flowing move; the panel is transparent
AND fully legible; measured peak angular/linear rates logged and within the stated limits;
?descent=0 still works. npm test + npm run build green; baselines unaffected. VR remains unverified
here (no XR entry point in this build) — say so plainly rather than implying otherwise.
GIT DISCIPLINE (mandatory): explicit pathspecs only. Blocked ≠ improvise: STOP and log BLOCKED.
```
