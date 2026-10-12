STATUS: live

# Plan — the entrance becomes "Restore previous session" (2026-10-13, revised the same day)
*His decision (2026-10-13), replacing LambyOS Home (Bob) as the front door for now: "I want to keep the retro language of
the project and later … further develop the project with the BOB … utilize the language we've been creating for the
screensavers … and from that state of wake we 'restore the session' as a symbolic entrance … the desktop of the windows
95, with Lamby version Clippy that … asks you questions with buttons …" Revised after his second message: "The exhibition
only opens on the 15th at 17h … I would remove the timing of the regular version and the speedrun … I really like the
style of the pixelated space you already built for the stars that turn into the title as the screensaver, maybe we can
keep that here? Please make sure that this would make sense aesthetically with … the full style of the project."
His answers to the Plan B questions: Lamby has no voice (text bubbles only); the Enter glitch — yes; the manuals — not
now ("more to be added soon"). LambyOS Home (Bob) and Plan B's art wait for the later version; the code stays.*

## 1 · The shape: stars → room → screen
1. **WAKE — the starfield (the frame's screensaver).** The piece opens in the night-blue space of the screensaver we
   already made (the Leave page's and the idle card's warp starfield): pixel stars stream, then gather into **YOUR UPDATE
   HAS FAILED**, with "Click or press any key" and, small, "Session still active." Built IN the 3D scene (not a flat
   page) so it is the same in a headset: the stars stream past the viewer and gather into a dot-matrix title in front
   of them.
2. **RESTORE — the stars become the room.** A press: "Restoring previous session…" types in; the stars fly to points on
   Daniel's 1997 room and, where they land, the room's low-poly surfaces fade up — the room is rebuilt out of points.
   "Room found. User profile pending." The camera is taken to the seat, facing the monitor.
3. **SETUP — on the monitor (Windows 95).** The 1997 PC boots into **LambyOS Setup**: a Win95 desktop with
   **Lamblippy** (Lamby as a Clippy-style assistant: text balloon with buttons, no voice). Steps in §2. Start → the
   **Enter glitch** (under a second, the room flickers into its bare fluorescent "as it was" state) → 1997 begins.
After 30 untouched minutes the idle cycle returns to the WAKE starfield, so the exhibition's attract mode and the
entrance are one thing.

## 2 · Why it fits the piece's whole style (the aesthetic check)
- **One language, already the piece's own.** The warp starfield is the frame's screensaver (the Leave page's hidden
  hope lines; the idle card). Night-blue, never black — the rule the Close's space has kept since Round 18.
- **A bookend.** The Close ends with the room giving way to a constellation of points (src/room/pointCloud.ts: warm,
  soft, unlabelled PERSON points; cool, sharp, labelled APPARATUS points). The entrance runs it backwards: points become
  a room. The piece begins as data restoring a life and ends as a life read back as data.
- **Soft Lo-Fi kept.** The restored room is the same cosy low-poly room with underdefined edges; the stars are the
  only sharp thing in the dark, as the witness side is the sharp side. Not horror: the dark is night-blue and the stars
  are warm.
- **Pixel discipline where it belongs.** The dot-matrix title uses the starfield's existing 3×5 dot letters; the setup
  is drawn on the desktop canvas in the era-1 Win95 palette with FILTER_NEAREST, like every 1997 screen.
- **The voices stay apart.** The frame (plain) for the wake lines, the restore lines, the content note and every fact;
  the programme (Lamblippy, operable, cheerful) for the questions. Era 1 still has no assistant: Lamblippy belongs to the
  setup before the story and says "See you later!" — Lamby comes back with 2003's update, as written.
- **Pipes** (GPT's first image) are dropped for the entrance: they are Windows' screensaver, not ours. They can join the
  idle cycle later as one more saver.

## 3 · Lamblippy's setup — the words (Claude's drafts; his to edit)
Programme voice in the balloon; frame voice in the windows it opens. No durations anywhere (his ruling).
1. Balloon: "Hi! It looks like you're restoring a session. Want a hand?" — [Yes, please] [I know what to do]
   ("I know what to do" jumps to step 5, the content note, which nobody skips.)
2. Balloon: "Want to know what this place is?" — [Show me] [Later]
   → a 1997 browser window, "About this project": the three paragraphs already approved for the plaque
   (home.json `return.plaque`), then "More to be added soon."
3. Balloon: "Can you hear me? Things sound better with headphones." — [Play a test sound] [Sound on] [Keep it quiet]
   ("Keep it quiet" turns captions on.)
4. Balloon: "You won't need to walk. Just turn!" — [Show me how]
   → window "How to look": a small pixel picture per way in — on a computer, drag to look; on a phone or tablet, turn
   the device (with the "Look with your device" button where the phone needs it); in a headset, turn your head.
   "The piece will take you wherever you need to be."
5. Balloon: "One more thing before we start." → the **content note** window (the existing text; the only gate: opened
   and closed, then four seconds).
6. Balloon: "Which version would you like?" — [The full piece] [The Speedrun Version]
7. Balloon: "Want to see our advert first?" — [Play it] [Skip]
   → "Discover the New You" in a period player window; after it, the asterisk card (his choice (c); wording his).
8. Balloon: "All set! See you later!" — [Start] → the Enter glitch → 1997.

## 4 · Plan of action — to track (☐ open · ☑ done)
| # | when | what | who | status |
|---|---|---|---|---|
| 1 | Tue 13 | push yesterday's work after the full walk (Codex C1b–C5, the Win95 window) | Claude | ☐ walk running |
| 2 | Tue 13 | remove the durations from the version choice (LambyOS Home's cards now; the setup has none) | Claude | ☐ after the walk |
| 3 | Tue 13 | send **E1** (wake starfield → the stars become the room → the monitor; the glitch; idle → wake) to Codex | **he** | ☐ |
| 4 | Tue 13 | send **E2** (LambyOS Setup with Lamblippy, all windows) to Codex, in a second chat at the same time | **he** | ☐ |
| 5 | Tue 13 | edit Lamblippy's words in §3 if he wants (else they ship as drafted) | **he** | ☐ |
| 6 | Tue 13 eve | review E1 + E2, merge, full walk with `--entrance restore` | Claude | ☐ |
| 7 | Wed 14 | he plays the new entrance on laptop and phone; notes → one fix round (Codex or Claude) | he → Claude | ☐ |
| 8 | Wed 14 | make the restore entrance the default (`?entrance=home` keeps Bob) once the walk passes | Claude | ☐ |
| 9 | Wed 14 | the advert's asterisk card wording (his, dossier phrasing) | **he** | ☐ |
| 10 | Wed 14 eve | full walk + Speedrun walk; push; build for the exhibition machine (offline, C5) | Claude | ☐ |
| 11 | Thu 15 am | final walk, push, exhibition machine set up (Chrome kiosk, sound, idle cycle check) — **freeze at noon** | Claude + he | ☐ |
| 12 | Thu 15 17:00 | **opening** — fixes only after this | — | ☐ |
| 13 | Mon 19 | headset check (the starfield and the setup in a headset) | **he** | ☐ |
| 14 | Tue 20 | his presentation | **he** | ☐ |
| later | — | Bob (LambyOS Home + Plan B art + the manuals), pipes as an idle saver, D8/D9/D12/D14, the B-rows | — | ☐ |
**Fallback:** if the new entrance is not walked clean by Wed 14 evening, the exhibition opens on LambyOS Home (walked,
working) and the restore entrance lands after the opening.

## 5 · Guardrails
The content note stays plain frame voice and the only gate. Lamblippy never states the content note, facts or sources.
No voice for Lamby. Nothing depends on looking around. Era palettes only; night-blue, never black. Under 3 flashes a
second; reduced motion skips the glitch and slows the assembly. Same in the browser, on a phone and in a headset.
