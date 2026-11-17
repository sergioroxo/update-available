STATUS: live

# Research note: the system's side of the room, and Lamby (16 Nov 2026)

*Written by the orchestrator (Opus 5.5) at Sérgio's request, for his research. The history below comes from the
project's own documents, cited by file and line. The photos of the change itself ("After") are added by UiB job 29,
Part D4. Earlier versions are research states: nothing here replaces them.*

His words, 16 Nov 2026, deciding to remove the back-wall record:

> "Yes it should go, and we can make the "your file" on the computer more present of the system tracking you, that way
> keeping the importance of the element tha the walk was bringing here — all of this should go for the research
> docuemnt as it was an importnat element of from the start of this research that had stopped functionign (include the
> previosu versions of the mages whete half the room had the side of the system etc). And now how Lamby keeps evoling
> into this helping figure that representeb by the system as well."

## 1. What the back wall was

From the first script, the room had two sides. In front of the seat was the person's life: soft, warm, low-poly. Behind
the seat was the system's side: sharp, cold, high-definition. The visitor reached it with one bodily act, the turn.

- **The turn was the refusal.** PRODUCTION_SCRIPT v0.3 (June 2026), §4.5c "The true refusal: the flip": "Turning
  around is the decline." On the other side the visitor sees the Offer "as infrastructure": the template filling from
  their record (`docs/PRODUCTION_SCRIPT_v0.3.md:172–176`). Part V describes "the computed INTAKE RECORD (witness side,
  all stages)" (`:200`).
- **The witness side is the sharp side.** The first mood board splits the palette into "life side, soft" and
  "witness, sharp", with the intake record as "the only sharp surface" (`docs/MOODBOARD_ERA1_ROOM.png`, 12 Jun). The law
  is still in CLAUDE.md: "surveillance is high-definition; life is soft".
- **The first room.** The Era 1 blockout (12 Jun) built "an oversized sharp repository wall (1.8 × 1.0 m) in the dark
  back-of-house"; "the flip stays the meaningful act" (`BUILD_LOG.md:95–113`). Round 9 unclamped the yaw so the visitor
  could drag round to it (`:115–126`).

## 2. How it changed (June to November)

| Date | Session | What changed | Source |
|---|---|---|---|
| 5 Jul | S12, Round 22 | The hexagon / "wedge" model: three 120° facings around the chair | `docs/reinterp/01_SESSION_LOG.md:3379` |
| 6 Jul | S15, Round 24 | Three intimate rooms that age over thirty years; "two lights fight for one room" (warm = life, cold = the system) | `BUILD_LOG.md:216–220`; `01_SESSION_LOG.md:3017` |
| 8 Jul | S18, R26 | The turn earns the escalation: the story waits until the witness side has been seen, with a 24-second fallback | `BUILD_LOG.md:226` |
| 10 Jul | R28 | Movement becomes jumps between fixed seats; "the turn remains the signature bodily ask" | `CLAUDE.md`, Reinterp Amendments §1 |
| 8 Aug | S76 | In 2026 the turn does nothing: nothing comes of it | `docs/reinterp/S76_update_place_turn.png` |
| 15 Sep | S144 | Sérgio: "aren't we missing the whole system of Witness?" The answer: THE RECORD, one file with four faces | `BUILD_LOG.md:1117`; `THE_RECORD_PLAN_2026-09-15.md:4` |
| 16 Sep | S145 | The witness system: one pulse (`src/witness/pulse.ts`). Whenever the record grows the stamp sounds, the wall's newest row lights, and the 2016 chip and 2026 badge light with it | `THE_WITNESS_SYSTEM_PLAN_2026-09-16.md:78` |
| 27 Sep | S181, S183 | The institution's corner is built around the record: the cabinet, drawer 12, the intake terminal, Daniel's suitcase. It ages to a status light by 2026, and the card goes into drawer 12 as you turn | `BUILD_LOG.md:1875, :1877`; `src/room/institution.ts` |
| 10 Oct | Cadence study | Sérgio: "We should not expect people to look around at any part, we need to take the viewer there. This is a rule for all." | `CLAUDE.md` R28 §1 (revised); `CADENCE_STUDY_2026-10-10.md` §9 |
| 13 Nov | Critique | "Nobody is taken there." The guided walk presses 71 times in 1997, every press on the monitor, and never turns round | `INTAKE_CRITIQUE_2026-11-13.md:9` |
| 14 Nov | S385 | His "make the video first": the 1997 orientation tape, video only | `BUILD_LOG.md:2257` |
| 15 Nov | S394 | LambyVision: a teaching set in every room. 1997's set sits behind the seat and is brought before the eye | `BUILD_LOG.md:2289` |
| 16 Nov | Fable review | "The file is behind the back." Sérgio rejects bringing the file to the hands ("even more text to read"), then rules that the wall and its stamp go and the file comes to the screen | `FABLE_REVIEW_FINDINGS_2026-11-16.md`; `FABLE_DECISIONS_2026-11-16.md` A1, B8 |

## 3. Why it stopped working

The wall was the piece's first idea of how a system watches a person. The record was always there, always growing, and
the visitor could only see it by turning away from the life in front of them. Three later decisions undid it:

1. **The seat.** Once the visitor could no longer walk (R28), the wall could only be seen by turning in the chair. On
   a computer that is a drag; on a phone, a turn of the body; in a headset, a turn of the head while seated. Most
   visitors never did it.
2. **The rule of 10 October.** No story beat may depend on the visitor choosing to look somewhere. The wall depended on
   exactly that. It was never removed, but from that day it could no longer carry anything the story needed.
3. **The sound outlived the sight.** The stamp went on playing each time the record grew, about sixty times a visit.
   It came from a wall the visitor did not see. Sérgio, on the second round of the review: "If we removed the panel in
   the back, we must remove those sounds, as they no longer have a direct application of the diegetic/non-diegetic."

The critique of 13 Nov also found that the corner did not read when it was seen: "an office in a bedroom", and a crowd
of twelves (CASE 12, drawer 12, DEPART 12 JUL, the tag's 12–19) that meant nothing in the story
(`INTAKE_CRITIQUE_2026-11-13.md:16–18`).

## 4. What carries it now

- **The explanation goes to the tapes.** Sérgio asked for the video first (13–14 Nov). The orientation tape became the
  LambyVision teaching tapes: the system teaching its own method, on a set brought before the eye.
- **The file comes to the screen** (job 29, D2). Each era's desktop shows the person's file, always in view, in the
  era's own software. When something is filed it changes there, silently. The surveillance moves to where the visitor
  is already looking: it is no longer a place you turn to, it is part of the tool you use.
- **The stamp goes** (job 29, D1).

## 5. Lamby: the helper who is the system

The system's side did not only move from a wall to a screen. It also took a face.

| Date | What changed | Source |
|---|---|---|
| June | The Assistant is a separate character per era (Helpy → Aski → Sol → Ami™), absent in the first stages, ≤5 lines a stage | `PRODUCTION_SCRIPT_v0.3.md:66, :76`; CLAUDE.md, Tone laws |
| 3 Jul | A rig prototype for Lamby (`?lambyrig=1`) | `BUILD_LOG.md:202` |
| 10 Jul | R28: Era 1 has no assistant; guidance is impersonal | quoted in `OPENING_NOTES_2026-10-15.md:12` |
| 25–26 Jul | Lamby rewritten as the programme's mascot ("JUST CHANGE"), with `lamby_rig.exe` in 1997 as its precursor. "Lamby is never presented, he simply appears" | `BUILD_LOG.md:263, :271` |
| 20–21 Sep | Lamby's own 1997 game (Root Cause Digger); Lamby's cartoon over the jingle | `BUILD_LOG.md:1310–1320, :1601` |
| 9–13 Oct | LambyOS: the system becomes an operating system with Lamby's name. The setup in the stars is LambyOS Setup, with a silent Lamblippy | `LAMBYOS_HOME_DESIGN_2026-10-09.md`; `BUILD_LOG.md:1974–1975` |
| 15 Oct | Sérgio: "We need to reinstate Lamby as the connection point of the correction and forcing you to do stuff." One guide, four era skins, from 1997: hints when the visitor stalls, a balloon with Yes/No, an offer to take them to the thing to press | `OPENING_NOTES_2026-10-15.md:8–9, :27–32`; CLAUDE.md R28 §2 |
| 16 Oct | One guide, four skins, five unsolicited balloons per era (raised to eight on 9 Nov) | `LAMBY_GUIDE_REPORT_2026-10-16.md`; CLAUDE.md |
| 14–15 Nov | The teaching tapes, then LambyVision: the programme teaches its method on a set in every room | `TEACHING_TAPES_2026-11-14.md`; `BUILD_LOG.md:2289` |
| 16 Nov | The back wall goes; Lamby may point the visitor to their own file ("I've kept everything for you") | job 29, D2 |

**The reading.** At the start the system had two separate bodies: a wall that watched (behind you, sharp) and an
assistant that helped (beside you, charming). Over five months they became one. The help is the watching. The figure who
offers to take you to the right button is the one who keeps your file, names the operating system you live in, and
teaches its method on a television in your room. Lamby is how the correction feels from inside: friendly, patient,
always ready to help, never ignorable for long, and recording everything. The 1997 premise was a system you could turn
round and look at; by 2026 it has no back to turn to.

*For the article:* this is a design finding, not only a story finding. A seated, take-the-viewer-there piece cannot hide
its argument behind the visitor. The argument has to be in the hand that helps.

## 6. Photos: before

All paths start at `/Users/sergiogalvaoroxo/update-available-reinterp/`. Each was looked at.

| Path | Date | What it shows | Thread |
|---|---|---|---|
| `docs/MOODBOARD_ERA1_ROOM.png` | 12 Jun | The first mood board: soft life side, and the sharp "witness" palette with the intake-record panel | wall |
| `docs/reinterp/S76_update_place_turn.png` | 8 Aug | The 2016 update on Vera's laptop; the 2026 room; the same room after a 96° turn | wall |
| `docs/reinterp/review-2026-09-22/img/e1-28-flip-wall.png` | 22 Sep | 1997 after the turn: the door and the INTAKE RECORD panel (Daniel, 15 entries) | wall |
| `output/article-figures-2026-10-31/fig04_e1-04-the-turn.jpg` | 31 Oct | The same wall at full size: "press the flip control to return", the cabinet's edge | wall |
| `output/article-figures-2026-10-31/fig15_e1-front.jpg` | 31 Oct | 1997's front for contrast: the CRT booting, the lamp, the camp posters | wall |
| `research/article-images-2026-11-12/job18-partA-S373/computer/e1-back-browser.png` | 12 Nov | 1997 turned round on a computer: the door and the record panel, dark | wall |
| `research/article-images-2026-10-31/cropped/02_lambyos-welcome-in-the-stars_224759.jpg` | 31 Oct | LambyOS "Welcome Home" in the stars, Lamby on a pedestal (headset) | Lamby |
| `research/article-images-2026-10-31/cropped/07_2003-desk-lamby-on-the-monitor_112810.jpg` | 31 Oct | 2003: the Un-Walk window, Lamby's balloon "Make Lamby yours!", Lamby on the monitor | Lamby |
| `output/article-figures-2026-10-31/fig17_e1-lamby.jpg` | 31 Oct | 1997: the pixel lamb on the companion-disk sheet | Lamby |
| `output/article-figures-2026-10-31/fig20_e4-lamby.jpg` | 31 Oct | 2026: GraceOS's "L" orb (L, not Lamby: for contrast) | Lamby |
| `research/article-images-2026-11-16/job28-partB-S396/held-clear/after-desktop-1997-lamby-held-paused.png` | 16 Nov | The LambyVision set held before the eye: "TriedPath Fellowship presents Understanding Your Roots" | Lamby |

**Not found:** no image of the July hexagon / wedge model, and none of the 27 Sep institution's corner seen whole (the
cabinet, drawer 12, the suitcase). Job 29 D1 photographs the corner in all four eras before it is removed.

## 7. After (job 29, Part D4)

*Added by the UiB builder (Opus 5.5), 17 Nov 2026. The wall went in S401 (commit c7d6ddfd, branch `job29/d-s401`).
All paths below start at `/Users/sergiogalvaoroxo/update-available-uib/research/article-images-2026-11-17/job29-partD-S401/`.
Each picture was looked at. Computer pictures are 1280 × 720 from the seat; headset pictures are the seated mock
(1000 × 1000, 90° view); phone pictures are 390 × 844. Nothing here ran on a Quest or a phone. The build these
describe was walked from the entrance to the Restart page at 7f574d64 (`walk-7f574d64/`: proof, console clean); the
walk saw the file change in every era.*

### 7.1 The seat turned round, before and after

The **before** set was taken at c7059df0, the last build with the wall. Its `*-wide.png` frames show the institution's
corner whole for the first time (the gap noted in §6): the door, the INTAKE RECORD panel, the intake terminal ("CASE 12
PLAN"), the grey cabinet with drawer 12 pulled out, the brown suitcase and the "Ministries by state" leaflet. The
**after** set was taken at 7f574d64, the walked build (`backwall/after-d1/` is the same views at c7d6ddfd, kept as a
research state).

| Era | Before | After | Draw calls turned round (before → after) |
|---|---|---|---|
| 1997 | `backwall/before/before-1997-turned.png`, `-wide.png` | `backwall/after/after-1997-turned.png`, `-wide.png` | 22 → 6 |
| 2003 | `backwall/before/before-2003-turned.png`, `-wide.png` | `backwall/after/after-2003-turned.png`, `-wide.png` | 19 → 6 |
| 2016, Daniel's room | `backwall/before/before-2016-daniel-turned.png`, `-wide.png` | `backwall/after/after-2016-daniel-turned.png`, `-wide.png` | 29 → 23 |
| 2026, Daniel's room | `backwall/before/before-2026-daniel-turned.png`, `-wide.png` | `backwall/after/after-2026-daniel-turned.png`, `-wide.png` | 25 → 24 |

The view from the seat (`*-front.png`) is the same before and after in every era (draw calls 15 / 20 / 25 / 27,
unchanged). Vera's and Maya's rooms turned round (`*-2016-turned`, `*-2026-turned`) are their own rooms, which never
held the wall; they are photographed for completeness. What is left behind Daniel's seat in 1997 is a door in a plain
warm wall.

### 7.2 The file on the screen

The record did not leave; it moved to the tool the visitor is already using (D2). One item per era, in view from the
first look at the desktop. When something is filed, its count goes up and it lights for a moment, without sound;
pressing it opens that era's entries. Measured on each era (`file-on-screen/file-probe-computer.json`): drawn, the
count up by one on a filing, lit, opened, no errors.

| Era | The item | Pictures (`file-on-screen/`) |
|---|---|---|
| 1997 | a folder and its count in the tray, beside Lamby (3 → 4); opens "Your file (read only)" | `1997-computer-1-first-view.png`, `1997-canvas-2-filed-lit.png`, `1997-canvas-4-file-open.png` |
| 2003 | the "Your file" icon that came with him, wearing its count (1997 and 2003 together) | `2003-computer-1-first-view.png`, `2003-canvas-2-filed-lit.png`, `2003-canvas-4-file-open.png` |
| 2016 | "My account · activity" in GracePlatform's title bar (moved out of the Start menu) | `2016-computer-1-first-view.png`, `2016-canvas-2-filed-lit.png`, `2016-canvas-4-file-open.png` |
| 2026 | "Memory" on GraceOS's taskbar | `2026-computer-1-first-view.png`, `2026-canvas-2-filed-lit.png`, `2026-canvas-4-file-open.png` |

Lamby points at it once per era, as the helper who is also the system: "I've kept everything for you, Daniel. Your file
is right down here — it grows as you go." (1997); "I keep everything for you, Maya. It's all in Memory." (2026). The
same voice that guides is the one that keeps the file. That is the turn §5 traces: what the wall said from behind the
visitor, Lamby now says to their face, kindly.

The `*-canvas-*` frames are the desktop as the glass shows it; the `*-computer-*` frames are the room from the seat.
`wip-opera-gx/file-on-screen/` holds the first pictures of the same items, taken in Opera GX on 17 Nov while Google
Chrome would not start: a research state, superseded by these.

### 7.3 His line at Daniel's desk, then the Close

At the end of 2026 the crossing lands at Daniel's seat. His monitor (the 1997 CRT the Close keeps in its row) is brought
before the eye, and on its dark glass, plain: his line, "Then it was never me that was broken…" (Sérgio's own wording,
from 2003), and Caleb's answer, "it never was, d. not once." No sound, no Lamby, no frame. After about fourteen seconds
the monitor goes back to the desk and the room becomes the Close as before.

| Mode | Both lines held | Then the Close |
|---|---|---|
| computer | `line-at-the-desk/play-computer-3-both-lines.png` | `line-at-the-desk/play-computer-4-back-on-the-desk.png`, `-5-the-close.png` |
| phone | `line-at-the-desk/play-phone-3-both-lines.png` | `line-at-the-desk/play-phone-4-back-on-the-desk.png`, `-5-the-close.png` |
| headset | `line-at-the-desk/play-headset-3-both-lines.png` | `line-at-the-desk/play-headset-4-back-on-the-desk.png`, `-5-the-close.png` |

Each mode also has `-1-dark` (the moment before) and `-2-his-line` (his line alone, Caleb's still to come). The
`review-*` frames are the review route (`?close=1`), where the lines go on the 1997 room's own CRT. The measured numbers
are in `line-at-the-desk/line-probe.json`.

One thing the pictures show that the brief did not foresee: the crossing keeps the visitor's bearing (no spin at the
Close: walkthrough 1, 8 Oct, W1-G1, "remove the rotation at the Close"; `src/engine/app.ts` `advanceClose`), so at the moment of the lines the seat is Daniel's but the view still faces east, through
the doorway into Maya's room. His line is read with her room behind it. Whether that stays, or the desk itself should
be seen first, is his call (T91·D).
