STATUS: live

# NARRATIVE FLOW — the main line, the sandbox, the gates, and who tells you
*2026-09-17. Sérgio: "we have a narrative people can follow, but there is also space for people to
explore — that is why the map exists. But this needs to be informed to the user: that is why we have
the message on screen, Lamby, Lambient and L guiding you. We should not expect the user to understand
the environment right away." He sent a diagram (a five-era flow with main quest · action · optional ·
gate · glitch per era). This is that diagram with the piece's ACTUAL elements, kept as the design of
record for `PROGRESSION_LAW_2026-09-17.md`. The map (`data/strings/map.json`) must match this file;
when they differ, this file is wrong or the map is — fix one.*

Legend: **MAIN** = a beat the era needs seen, in the story's preferred order · **○ OPEN** = sandbox,
any time, never required, marked ○ on the map · **VOICE** = who tells the player what this is and
what to do (the fiction's guide; the frame's helper repeats the current MAIN beat plainly after 20 s
of stillness) · **GATE** = the last MAIN beat; the era cannot end before it · **GLITCH** = the
apparatus's documented failure → the update ritual → the flight to the next room.

```
[ FRONT DOOR ]  the pre-fiction panel · Log in · the descent (scored)
      │
      ▼
[ 1997 · DANIEL · Room 1 ]   voice: SYSTEM SIDE-MESSAGES (no character) — the status well
      │  MAIN  wake → questionnaire → the disk → UN-WALK (the wizard) → pray → connect → the channel
      │        → Rob's request → Rob's DM → the placement letter → the Family Form → the diary
      │  ○     the wall (turn) · the tapes/boombox · the racket (the exercise) · Lamby's game · the desk
      │  GATE  the diary's deletion fails (the person's glitch)
      ▼  GLITCH  the system glitch (full frame) → the error cascade → NOTICE → (remind later: the belongings) → EULA → install → FLIGHT
[ 2003 · DANIEL · Room 1 aged ]   voice: LAMBY (≤2 lines per beat)
      │  MAIN  the return press → boot → Lamby introduces itself → the check-in → the messenger's dot
      │        → Caleb's thread → the network's failure (seen) → PureMail → the restore → the residue
      │  ○     NetVision (the video) · the player (Caleb's song, the loop) · the summons markers (s1, s2)
      │  GATE  the residue committed
      ▼  GLITCH  the notice (Restorify — Service Transition) → EULA → install → FLIGHT (rise · hold · morph in view · descend)
[ 2016 · VERA · Room 2 ]   voice: LAMBIENT (the platform's lane, ≤2 lines)
      │  MAIN  boot → sign-in → Lambient's question → the board → one job done → the phone's message
      │        → the vote → the group (the cascade)
      │  ○     the other six jobs · Your record (the chip) · the tablet · the phone's home screen · FloppySheep
      │  GATE  the cascade seen (the block outnumbered)
      ▼  GLITCH  the notice (Continuity of Care) → EULA → install → FLIGHT
[ 2026 · MAYA · Room 3 ]   voice: L (the agent, on the laptop first, then in the browser)
      │  MAIN  the screensaver → L introduces itself → the search results → Second Thoughts → L's five turns
      │        (record · photos · care · chat · search) → the headset → the session → Junie's link
      │        → the Commons → the intrusions → the termination
      │  ○     the six tabs · the Legacy file (hers) · the home screen · the markers in the Commons
      │  GATE  SESSION TERMINATED · social contagion
      ▼  GLITCH  YOUR UPDATE HAS FAILED on both screens → they die → the travel to Daniel's room
[ THE CLOSE ]   voice: none (the frame's map still opens)
         the look up · night falls · the four panels (yours) · the makers · Daniel's monitor: the Restart card
```

---

## 1997 · DANIEL · Room 1
**Voice:** impersonal system side-messages in the taskbar's status well (R28-2: no character). Every
MAIN beat has one line; complying or ignoring both file.

| # | beat | kind | what the player does | what tells them (voice) | opens on | files |
|---|---|---|---|---|---|---|
| 1 | the wake | MAIN | the power button on the tower | the frame's off-hint ("press the power button") | arrival | — |
| 2 | the questionnaire | MAIN | picks a picture, three things, a goal | the profile screen itself | boot | `profile-initialized` (the first filing — the wall wakes) |
| 3 | the disk | MAIN | the A:\ icon (or the disk on the desk, glowing) | "insert the companion disk on the desk." | desktop | `kit-inserted` |
| 4 | UN-WALK, the wizard | MAIN | reads the wizard's pages (picture · text · Next) | the wizard itself; the well: "read the programme." | disk | — |
| 5 | pray | MAIN | the tape plays; the words on screen, timed; press at the end | the wizard's page: "the companion tape — the player is on the shelf." | 4 | `tape-played` |
| 6 | connect | MAIN | the Internet Setup Wizard (black screen, the dial-up) | "connect to the fellowship channel." | 5 | `went-online` |
| 7 | the channel | MAIN | two or three exchanges, reply chips | Lume's welcome | 6 | `channel-reply:` |
| 8 | Rob's request | MAIN | "MentorRob would like to message you — Accept" | the request itself | 7 read | — |
| 9 | Rob's DM | MAIN | five replies, scrollable | the DM | 8 | `escalation-reply:` |
| 10 | the placement letter | MAIN | reads, Ok | "acknowledge the placement letter." | 9 | `enrollment-acknowledged` |
| 11 | the Family Form | MAIN | the intake exercise | "a form has been sent to you." — **only after** Rob's "I spoke with your mother" | 9 | `origin_intake_e1` |
| 12 | the diary | MAIN · GATE | writes; holds twice against the erase | "a journal entry is required." | 10 | `diary-glitch` |
| ○ | the wall | OPEN | turns; reads the intake record (it explains itself) | the cold creep at the edges; "see behind you" glows | 2 | `ministry-index-card` |
| ○ | the tapes | OPEN | the shelf (glowing), the boombox | the wizard's tape page | 3 | `tapes` |
| ○ | the racket | OPEN | the pillow exercise from the room | "the racket on the wall — the first exercise." | 3 | `pillow` |
| ○ | Lamby's game | OPEN | the 1997 mini-game (W-L1) | the desktop icon | 3 | `tags` |

**GLITCH:** the deletion fails → the person's glitch (built) → **the system glitch, full frame (L-06,
not yet wired)** → the error cascade → the notice (u2). *Remind me later* opens the belongings
("departure scheduled. take what you are taking." — the shelf glows) and the IRC closes; *Update now*
→ EULA (2003 look) → install → the flight.

## 2003 · DANIEL · Room 1, aged
**Voice:** LAMBY — the character-conductor, ≤2 lines per beat, never in a felt scene (Caleb's thread,
the residue), dismissal always works and files.

| # | beat | kind | what the player does | voice | opens on | files |
|---|---|---|---|---|---|---|
| 1 | the return press | MAIN | any press on the dark glass | the frame's off-hint | landing (no forced look) | `return-press` |
| 2 | boot | MAIN | watches (black → POST → splash → OS) | — | 1 | — |
| 3 | Lamby | MAIN | "Hello" / "Begin" | Lamby: introduces itself, says what Restorify is | 2 | `introduction`, `first-greeting` |
| 4 | the check-in | MAIN | Restorify — Daily Realignment (a program splash first): Steady/Struggling/Grateful/Tired | Lamby: "how was your walk?" | 3 | `checkins` |
| 5 | the messenger | MAIN | the dot on the messenger icon → Caleb's first line | Lamby: "a message from outside. I'll be here." (one line, then quiet) | 4 | `caleb:opened` |
| 6 | Caleb's thread | MAIN · felt | four replies; the song arrives as a file → the player opens it | none (felt) | 5 | `caleb:*` |
| 7 | the network fails | MAIN | the accountability alert, SEEN failing (R3-58) | the alert | 6 committed | `caleb:alert` |
| 8 | PureMail | MAIN | the mail, continue | Lamby: one line | 7 | `caleb:restore` |
| 9 | the residue | MAIN · GATE · felt | presses the one line | none | 8 | `caleb:residue` |
| ○ | NetVision | OPEN | the video | Lamby's offer (dismissable) | 4 | `media` |
| ○ | the player | OPEN | Caleb's song, the loop | the file | 6 | — |
| ○ | the summons | OPEN | the markers (s1, s2) | the offer icon | 4 | `sends` |

**GLITCH:** the notice (Restorify — Service Transition, 2003 look) after the residue, **only when the
desktop is clear** → EULA → install → the flight: rise · hold overlooking · the room morphs in view ·
descend (R3-46). The machine changes (R3-45).

## 2016 · VERA · Room 2
**Voice:** LAMBIENT — the platform's lane, "Cortana-way but playful like Lamby", ≤2 lines, absent on
any screen with a person's words.

| # | beat | kind | what the player does | voice | opens on | files |
|---|---|---|---|---|---|---|
| 1 | boot | MAIN | watches (black → POST → the wordmark) | — | landing | — |
| 2 | sign-in | MAIN | Sign in | the screen | 1 | — |
| 3 | Lambient's question | MAIN | Allow / Not now (sticker: not yet available) | Lambient explains the day | 2 | `e3_lambient_consent` |
| 4 | the board | MAIN | opens any job | Lambient: "Start anywhere. The order is yours." | 3 | — |
| 5 | one job done | MAIN | ≤3 corrections (R3-70); Back to today at the bottom | the job | 4 | `graceQueue` |
| 6 | the phone | MAIN | "your phone has a message" → the phone lifts to the hand (follows the head); unlock; Messages | Lambient: "your phone. You can put it down whenever." | 5 | `e3_malta_*` |
| 7 | the vote | MAIN | the group's link; the card | the phone | 6 | `e3_malta_voted` |
| 8 | the group | MAIN · GATE | the cascade, seen | none — the room's light lifts | 7 | `e3_cascade` |
| ○ | six jobs | OPEN | comments · story · podcast · course · calls · record | the tiles | 4 | `comments`, `media`, `checkins` |
| ○ | Your record | OPEN | the taskbar chip (2016's rows only — R3-95) | the chip | 3 | `record: viewed` |
| ○ | the tablet, the home screen | OPEN | FloppySheep, the feed | — | 3 | — |

**GLITCH:** the notice (Continuity of Care) after the cascade, **never over an open job or a held
phone** (R3-73) → EULA (2016 look, built) → install → the flight.

## 2026 · MAYA · Room 3
**Voice:** L — the agent. Introduced by name on the laptop during the restore; then a conversation in
the browser (R3-93): L asks, Maya answers with chips; each of the five steps is a turn; nothing
auto-advances.

| # | beat | kind | what the player does | voice | opens on | files |
|---|---|---|---|---|---|---|
| 1 | the screensaver | MAIN | one press to restore | the frame's hint | landing | — |
| 2 | L | MAIN | reads the laptop: "I'm L. I restored your session." | L, on the laptop | 1 | `update`, `companion` |
| 3 | the search results | MAIN | her history; the finished query; results | the results page | 2 | — |
| 4 | Second Thoughts | MAIN | the site → the agent | the site | 3 | `program:begun` |
| 5–9 | L's five turns | MAIN | record (the provider's intake gate) · photos · care · chat (L asks for access → threads → this one) · search | L asks; she answers | each on the last | `step:*` |
| 10 | the headset | MAIN | the marker; the visor on | L: "put it on." | 9 | `headset:worn` |
| 11 | the session | MAIN · felt | the plan, the grounding, the recording (introduced) | the session's own voice | 10 | `session` |
| 12 | Junie's link | MAIN | the card; press | Junie | 11 | `commons:joined` |
| 13 | the Commons | MAIN · respite | the flash first; the arrival (lights, "hi Maya"); the stream; the markers | the world | 12 | — |
| 14 | the intrusions | MAIN | the room pushes back; she stands in the crowd | the glass | 13 | `turn` |
| 15 | the termination | MAIN · GATE | SESSION TERMINATED · social contagion | the glass | 14 | `laptop` |
| ○ | the six tabs | OPEN | any tab, any time (the Legacy file = HER 2026 rows) | the tabs | 4 | `tab:*`, `legacy` |
| ○ | the Commons' markers | OPEN | stage · crowd · screen | the floor | 13 | — |

**GLITCH:** YOUR UPDATE HAS FAILED on both screens → the conducted look (5.5 s) → both die → the
travel to Daniel's room.

## THE CLOSE
No voice. The look up; night falls; the four panels with the player's own lines (2026's panel lands
≥28 px); the makers **as an in-world cluster** (L-04, owed); Daniel's monitor, further back, with the
Restart card (the count; nothing kept). The drift pauses while a panel is looked at (R3-112). The
frame's map still opens (grip / Esc) and reads all ticks.

---

## How the voice informs, per era (the "you should not expect the user to understand right away")
- Every MAIN beat has exactly one line from the era's voice when it OPENS ("this is what this is; do
  this"). The line is in `data/`, is the apparatus's voice, and files both ways.
- Every ○ OPEN element has a visible affordance (a glow, a dot, a badge, a marker) and no line — the
  sandbox is found, not announced; the map lists it as ○.
- The frame's helper repeats the current MAIN beat plainly after 20 s of stillness; the map shows
  "n of m" and the ○ items. The frame never plays; it explains.
- Nothing opens on a clock. A clock only delays.

## What the map must carry (the contract with `map.json`)
For each era: the MAIN beats above in this order (`done` conditions = the `files` column), the ○
items with `optional: true`, `quiet: true` on the felt/respite beats (6, 9 · 11, 13), and the hint
lines in the frame's plain voice. `witness/map.ts` resolves them; the spine reads `gateMet(era)`.
