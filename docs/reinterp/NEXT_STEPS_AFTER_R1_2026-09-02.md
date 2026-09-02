STATUS: live

# AFTER REVIEW ROUND 1 — the completed queue, the gates, and the prompts R1 did not write
*Written 2026-09-02 by the build session, on top of [`REVIEW_R1_2026-09-02.md`](REVIEW_R1_2026-09-02.md)
§3. R1's board (S103–S109) is correct and unchanged; this file adds what it stopped short of — the
dependency order, which sessions a decision actually blocks, and four more paste-ready prompts
(S110–S114) for work the review identified and did not schedule. ⚑ Sérgio answered every gate
the same day — see the table below; nothing here is blocked.*

---

## §1 · THE ORDER, with what gates what

```
S103  walker's blind spots ────┐                       (no gate)
                               ├──> S104  Era 4's door  (no gate — the top item)
S107  audit hygiene ───────────┘                │
                                                ├──> S108  the batch at the turn
S105  dirty-only uploads   (no gate, parallel by file)
S106  the record ages      (builds with a placeholder stamp; his wording lands later)
S109  sound plumbing       (needs no assets)
S110  the two pacing fixes                                          ⟵ NEW
S111  the writing round    (ethics gates are per-line, not per-session)   ⟵ NEW
S112  sound assets         ✅ R1-1 + R1-3 answered                    ⟵ NEW
S113  Lamby's voice        ✅ R1-4 answered                           ⟵ NEW
S114  the Close panels     (runs, then he reviews the text in place)  ⟵ NEW
```

**Run first, in this order:** S103 → S104. Everything else is genuinely parallel *by file*, but never
two sessions in this worktree at once — one git index, and that collision has already cost a session.

## ⚑ ANSWERED 2026-09-02 — every gate in this file is open

| decision | answer | what it released |
|---|---|---|
| **R1-1** the ball's room | **a found recording, *and* audition Suno beside it** — "just need prompt" | S112 item 1 + the Close's one possible sound. Lane D's objection to Suno for this scene is recorded and overruled as an experiment; see §6 for both routes and the one production note that decides between them |
| **R1-3** sound on the rituals | **as Lane D wrote it** — the four gestures re-voiced per decade, the Close silent | S112's ritual rows |
| **R1-4** Lamby's voice | **yes, 2003-treated** | S113 entirely |
| **R1-5** the Era-4 card stamp | his, and nothing waits on it — S106 builds with a placeholder | — |
| **R1-2** Room 3's seat | not a decision; a measurement folded into S107 (§3) | — |
| **R1-6** S104 before S108 | taken | — |
| **the Close's panels** | **"send them to me when I need to review them, we will adjust it while building"** | S114 is neither parked nor settled: the draft ships, and that session surfaces the text and panel 4's `status` for review *when it runs* |

**So nothing in the queue below is gated any more.** The order in §1 is now purely dependency and
judgement: S103 → S104 first, everything else parallel by file, never two sessions in this worktree.

---

## §2 · ⚑ ONE CORRECTION TO S104's PROMPT, and it changes the fix

R1's A-1 says `icon-send` "stays registered on the OS canvas in Era 4." **Checked in source: it may not
be `os.hits` at all.** `os.draw()` clears `this.hits` on its first line and the Era-4 branch pushes only
`e4-touch` before returning, so nothing from Eras 1–3 can survive in that list. `icon-send` is drawn by
`drawSendOfferInto(ctx, hits, …)`, and the workstation route calls it through
`drawSendOfferExternal` into a **separate** `externalHits` list — which the walker's reflective rect
collector will happily pick up, because its key pattern matches any field ending in `hits`/`rects`.

**So S104 must first establish WHICH list carried it**, because the two fixes are different:
- if `os.hits` — clear/guard the Era-4 branch (R1's stated fix);
- if the workstation's `externalHits` — that list must be emptied when the workstation stops being
  drawn, i.e. at the era change, **and** the walker must stop treating a stale external list as live.

Either way **the second half of A-1 is independent and confirmed by projection: frame chrome sits over
the headset.** Fix that regardless of which list is at fault.

⚑ And **A-8 is real, and it is mine.** The hand-back after the ball is unreachable because
`handleWorkstationPointer`'s only route to `shell.wear()` sits behind `visor?.entity.enabled`, and the
per-frame gate I wrote in S101 disables that plane during `stage === 'ball'`. My own "watched the tail"
probe called `shell.handleClick()` directly and so went through a door a player does not have. The
`rayNear` sphere around the headset must be tested whenever the shell is in `ball`/`after`, independent
of the plane.

---

## §3 · Room 3's seat (R1-2) — a measurement, not a question

R1 raises it as a decision because your S96 "keep it close" ruling was made about a CRT that has since
moved to a shelf. **The measurement is work I can do and should:** `worldToScreen` the laptop's lid and
the record panel from the r3 seat at several pitches, and report what fills the frame. Fold it into
**S107** as a proposal-only step — it changes no pose, it produces a number. The *ruling* on that
number stays yours.

---

## §4 · THE FOUR PROMPTS R1 DID NOT WRITE

Same contract as R1's board: read `CLAUDE.md`, `docs/reinterp/00_WHERE_THINGS_STAND.md` (the traps),
and the lane report cited; **verify by observation** before closing; `npm test`; one line in
`BUILD_LOG.md`; commit. Fence = the only files you may edit.

### S110 · Sonnet 5 — the two pacing faults (R1 §4-1, §4-2). No gate; cheap; high player value.
Fence: `src/room/era3Devices.ts`, `src/engine/app.ts` (relocation start only), `data/room/cluster.json`.

1. **The Era-3 arrival's 28 s of blank workstation.** Measured: after the E2→E3 descent lands, Vera's
   screen is dark blue and empty for 28 s before `e3_arrival`'s boot begins, with the frame hint
   *"Click a marker to move."* over it (`REVIEW_R1` §2). It is the longest dead air on a *lit* surface in
   the piece, and it happens at an arrival. Start the arrival boot when the descent ends rather than on
   its own clock — or, if that clock exists for a reason the code states, give the dark screen one line.
2. **The camera must not leave during the u2 changelog.** Observed: `driven = true` from the install's
   first frame (timeline 269.9 s) while the changelog is still typing six lines over ~5.7 s. The room
   leaves while the thesis is being read. Start the rise at the restart's dark beat instead.

**Acceptance, observed:** a timeline sample of the E2→E3 arrival showing < 5 s between the descent
landing and the first boot glyph; and a u2 sample showing the changelog's last line drawn before
`driven` goes true. Screenshot both.

### S111 · Opus 5 — the writing round (R1 §4-7). No gate. **This is Claude's work, not Sérgio's** (CLAUDE.md, 2026-08-17).
Fence: `data/dialog/**`, `data/strings/**` — display text only. **Never** a line marked `_s`.

`node tools/voice-pass.mjs` emits `docs/VOICE_PASS.md`: 921 readable lines in play order, 4 locked. The
review counted **96 `PLACEHOLDER` + 35 `PLACEHOLDER-draft` markers across 34 data files.** Finish them.

- Work in play order, era by era, and **read the surrounding beat before writing the line** — most of
  these placeholders are one line inside a scene whose register is already set.
- `register: felt` beats get *more* care, not less: no invented deadnames, no borrowed testimony, no
  beat that speaks *for* people rather than about the system. The system is the target; the person is
  not material.
- Satire only inside perpetrator self-presentation, and it must collapse. Never the
  gender-exploratory clinical debate — render both captions, unresolved.
- Dossier text: cite only what the knowledge base verifies; anything uncited carries `[VERIFY SOURCE]`.
- Where a line is genuinely Sérgio's call (a naming pick, an ethics judgement, dossier phrasing), leave
  it marked and list it at the end of the session rather than guessing.

**Acceptance, observed:** the marker count falls and the number is reported; `npm test`'s
authoring-marker leak check stays at its baseline; a fresh `voice-pass` run reads as one voice per
register when read end to end. ⚑ Report what you left for him and why.

### S112 · Sonnet 5 + Sérgio — the sound assets. **UNGATED — R1-1 and R1-3 answered.**
Fence: `assets/audio/`, `public/assets/audio/`, `src/audio/tapeAudio.ts` (registry lines only),
`data/dialog/s2_media.json` + `s2_caleb.json` (the broken-jingle hook), `assets/LICENSES.md`,
`docs/reinterp/ATTRIBUTIONS.md`.

Work the commissions in `REVIEW_R1_2026-09-02_LANE_D_SOUND.md` in this order, because each one's
absence costs the piece more than the next:
1. **The ball's room** (D-3/§5) — **two candidates auditioned side by side** (§6): a CC0
   through-the-wall field recording, and a Suno generation. Either way it is ONE file in three states
   (through-wall `lowpass=f=320` in E4, the landing unfiltered, the Close's clean pass). ⚑ **Judge the
   candidates UNFILTERED** — the wall hides everything, and the landing and the Close play clean.
2. **The three passages** (D-7) — one CC0 building-ventilation drone; 42.5 s of silent travel is the
   longest dead air in the work.
3. **Room tone, four beds** (D-4) — assembled from CC0 sources with `amix`/`afade`, loop-checked.
4. **The boot jingle** (D-1) — cut from `Chase_The_Clouds.mp3` if the hook cuts cleanly; Sérgio picks
   the bar by ear, since neither of us can listen for him.
5. **The broken jingle** (D-2) — an ffmpeg treatment of a file that already exists, plus the data hook
   it has never had.
6. **The one-shots and the ritual family** (D-5, D-6) — *the ritual rows only after R1-3*.

⚑ **Every acquired file needs three things or it is silent**: the file in `public/assets/audio/`, a line
in `tapeAudio.ts`'s REGISTRY, and the name in the data. And a licence row at the moment of download —
the duck's row went unconfirmed for a month. **CC0 or CC-BY 4.0 only; never NonCommercial** (the repo
is public and this goes to festivals).

**Acceptance, observed:** a `window.Audio`-wrapped run per era showing one bed alive, the crossfade at
each passage, and the ball's bed under its captions; `npm run gen-attributions` clean.

### S113 · Sonnet 5 — Lamby's voice (Lane D D-8). **UNGATED — R1-4 answered: yes, 2003-treated.**
Fence: `data/audio/tts_manifest.json`, `tools/tts/`, `src/desktop/apps/lambyChar.ts` (or whichever
surface draws Lamby's lines), `src/audio/tapeAudio.ts`, `data/dialog/s2_lamby.json`.

A manifest batch entry: `register: apparatus`, a **voice slot that is not L's F3**, `audioPrefix:
"lamby_"` (the per-line gate S102 added), over `s2_lamby.json`'s conduction lines and the check-in —
**never** Caleb, never the residue, never any `felt` window. Render in ONE sitting, then the 2003
treatment (`aresample=11025` → back up, `acrusher`, `lowpass=f=4200`) so the era sounds like its year,
then `publish_mp3.sh`, then the registry.

⚑ **Then the pacing, or it will talk over itself** — the S102 lesson, reused: Lamby's holds were
authored against silence too. Whatever surface draws its lines must dwell on
`max(authored hold, CAPTION_LEAD + clip duration + tail)`, read off the element.

**Acceptance, observed:** a wrapped run through Era 2 showing every Lamby clip played to its full
duration, none overlapping, all 200; and the E2 surface's captions still leading the audio.

### S114 · Sonnet 5 — the Close's panels. **NOT gated and NOT settled** — Sérgio, 2026-09-02: *"send
them to me when I need to review them, we will adjust it while building."* Run the session, then put
the four panels' text and panel 4's `status` in front of him and adjust in place.
Fence: `data/strings/close_network.json` only.
Apply his text verbatim to the four `panels[].lines`, set `panels[3].status`, and drop the
"open for Sérgio" flags in `_panelsDoc` and in `REINTERP_THE_CLOSE_TREATMENT_2026-08-17.md` §6.
**Acceptance:** a `?close=1` screenshot of each of the four bearings with the final text legible.

---

## §5 · What is NOT scheduled, on purpose

- **A-6's ball captions are DOM and invisible in a headset** (`ball.ts`'s own header says so). That is a
  real problem for the XR build and it is not in any session above, because the fix is a design
  decision — put the ball's captions on the visor surface, or accept that the ball is a browser-only
  beat. **Raise it in R2; do not let it be fixed by improvisation.**
- **C-4, the record that "migrates to Room 3's wall and becomes readable again"** resolves in the data
  to a blank photo frame. Lane C is right that this is a doc-vs-build gap, not a defect. It belongs to
  whoever next dresses Room 3, and Room 3's dressing has never had its own session.
- **The 45 `room-audit` findings** (garment floats, the 2 cm `terminalFrame` seam, model-scale drift)
  are unchanged and unranked. They want one dressing session with Sérgio's eye, not a fix list.


---

## §6 · THE BALL'S ROOM — both routes, as he asked for them

Sérgio, 2026-09-02: *"Found Recording and we can try Suno (just need prompt)."* So both, auditioned
against each other rather than argued about.

### Route C — the found recording (Lane D's recommendation)
Freesound, filter **License: Creative Commons 0** first, **Attribution** second. Sort by rating,
download the WAV/FLAC (never the preview mp3), and write the row into `assets/LICENSES.md` at the
moment of download.

Search terms, best first: `party through wall` · `club neighbours bass` · `house party ambience` ·
`crowd cheering indoor` · `nightclub ambience distant`.
**Reject anything with an identifiable track in it** — a recognisable song through a wall is still a
real song.

### Route A — Suno, as an audition candidate
```
instrumental, underground house, 124 bpm, late-night, hand-clap and crash accents on the downbeat,
warm sub bass, a small crowd whooping and clapping between phrases, recorded in a hall with a long
room, slightly distorted PA, live not produced, no vocals, no lyrics, loopable, 90 seconds
```
Lyrics field: `[Instrumental]`. Generate four; keep the one whose crowd sounds like people rather
than a texture, and whose loop point is invisible.

### ⚑ The one production note that will decide it for you
The same file plays **three** times and only one of them is through a wall:

| where | treatment |
|---|---|
| E4, the ball, heard from the room | `lowpass=f=320` — the wall |
| the landing | the file, unfiltered |
| the Close (if R1-3's exception is ever taken) | the same file again, clean |

**So audition both candidates UNFILTERED.** Through 320 Hz almost anything sounds like a party
downstairs; the landing is where a generated track has nowhere to hide. If the Suno take survives
being heard clean next to the field recording, it has earned the scene. If it only works behind the
wall, that is the wall doing the work, not the music.

```
ffmpeg -i <candidate>.wav -af "lowpass=f=320,volume=0.8" ball_room_bed.wav
ffmpeg -i <candidate>.wav -af "loudnorm=I=-18:TP=-1.5"   ball_room_landing.wav
```

⚑ Lane D's objection to Suno for this scene is on the record and stands as a *criterion*, not a veto:
the beat exists to be made **with** rather than **about** the people it is indebted to. If both takes
work, that is the tiebreak.
