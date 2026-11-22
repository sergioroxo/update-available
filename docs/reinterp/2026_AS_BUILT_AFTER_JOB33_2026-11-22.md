STATUS: live

# 2026 as built after job 33 (S412–S415, walked at 7763b962)

⚑ **S417 (job 34 Part A, 22 Nov): the screen is a desktop now.** The two panes are two windows on an invented 2026 operating
system (`src/desktop/apps/desk26.ts`: a wallpaper, a menu bar with **the Menu button** — the piece's Start menu in this OS's
skin —, a dock with her six apps, rounded windows, one notification at a time), and L lives in its window like a modern AI
chat app (its chat list, the model chip, a big greeting, rounded answers, the composer "Ask L anything"; the voice switch
beside the composer). The beats, lines, timings and presses below are unchanged. Job 33's frame (the V3 desk, the title bars,
the thin taskbar) is kept in git: `src/desktop/apps/lScreen.ts` `draw`/`drawAi` at **bfad99bd** (walked at 7763b962).

⚑ **S418 (job 34 Part B, 22 Nov): three brands, louder each act.** The desktop wears the product in front
(`screen.desk.skin`; desk26.ts `LOOKS`, lScreen.ts `AI_LOOKS`, src/desktop/apps/brands26.ts): **L** (beats 1–4) glossy — its ✦
in the menu bar with its boast "✦ 1,204 things handled for you this year", a sheen and a mint glow on its window, ✦ in its
answers, a lavish birthday card (her flag, balloons, confetti that falls in 8 steps as it arrives, "personalised for you",
"✦ made for you by L"), and the sponsored card as the loudest thing on the glass (a yellow glow, a hazard band, "FREE FROM 18");
**Second Thoughts** (beats 5–8) a yellow takeover of the whole desktop — its yellow menu bar ("SECOND THOUGHTS™ · is using your
computer", her greyed "Take back control" there during the takeover: job 33's banner, moved), its tile in the dock and her apps
dimmed, a dark wallpaper under hazard stripes, every window's chrome yellow, its own window near-black with its wellbeing score
(34 ▼, "3 doors closed this week") and achievement stickers as each act is done, "MUTED FOR YOU" on the rows it muted, its pages
(the review, the console, the film card with its big play button) in its dark and yellow; **Shepherd Live™** (beats 9–10) live
television about her through either door — a LIVE bug, the gold title, "exploratory session · episode 1", its sponsors, a navy
set with stage lights, her photo turned into the show's graphic (the pictures to one side, "BECOMING" a big gold ring at 99%, the
studio's APPLAUSE sign), its notes as on-screen captions, a gold flip ticker, one phrase at a time, a hard cut every 3 s, held while her photo is altered (S418c). **At her Yes the brands
fall** (the show's chrome, then the yellow, then the last of it torn off, then the plain OS: 2.5 changes a second; reduced motion:
a cut). Her friends' tiles, Settings, the Remove dialog, Junie's words, Maya's words and the stream keep their own plain look.
Beats 11–13 are as job 33 built them. The beats, lines, timings and presses are unchanged; S417's look is in git at **ba86112b**.

⚑ **S420 (job 34, 22 Nov; his "it keeps on using that image of male 'maya' that I've asked to be replaced"): the suited figure
is retired.** The filter no longer turns her photo into a man (the quiff, jacket, collar, tie and grin, the gloss, the
"You, restored · 2027" caption: in git at **bd3b0203**, `src/desktop/theme/era4.ts` GOAL_* layers and `paintPortrait`,
`src/desktop/apps/goalPicture.ts`). The system's target is its **default avatar, default.png** (a grey head and shoulders, no
face, no hair, no clothes; `paintDefaultAvatar`, the `DEFAULT_PNG` greys from OS26). At beat 9 the filter works **by removal**
on "me, after.jpg", in its order: her flag, her pin, her earrings, the pink of her top, the length of her hair, each selected
under marching ants (one notch a step; still under reduced motion) and lifted out to the grey-and-white checkerboard of
deleted pixels, her room draining to grey in lines. At 99% her face is still there and the selection waits round it;
default.png sits inside the BECOMING ring, its name under the word. The same filter, in the same order, is on the console's
Pride '24 picture at beat 6 (MATCH MADE SIMPLE, and its copy on the 2026 era site). Beats, lines, holds and presses unchanged.

One monitor, two panes (the AI on the left, her world on the right); thirteen beats in three acts and an end. Code:
`src/desktop/apps/e4Acts.ts` (the director), `lScreen.ts` (the screen), `e4ActOne.ts`, `e4ActTwo.ts`, `e4ActThree.ts`
(+ `shepherd.ts`), `e4ActFour.ts` (+ `streamCover.ts`); words in `data/dialog/s4_acts.json`.

| # | Beat | Caused by | On the screen | Her presses | Part |
|---|---|---|---|---|---|
| 1 | The birthday card | Press to wake the screen | L reads her week (cards into its circle), *Happy 18th, Maya* | Catch me up · I'll look myself | A |
| 2 | The softened father | "catch me up" | Kettle, one thread at a time; L: "I softened your dad's message…" | ✦ (his real lines), or nothing | A |
| 3 | Three doors, Mum's course | Mum's email | Larkpost: clinic (4,815), Meridian's no + her draft, Mum + HEDGE™ | the HEDGE link (LambyVision beside the screen) | A |
| 4 | Her search | "Want me to finish it?" | L finishes her sentence; three stories; the yellow card | a story · ✚ Add to L · Not now | A |
| 5 | It adds itself | the ad | *L · Second Thoughts*, the pane wider, ✦ locked | — | B |
| 6 | Risk review, takeover | what it is for | Your wellbeing review; its cursor mutes Junie (Undo once), the lot, answers Dad, the console | Review each · Do it for me (Undo, Open it) | B |
| 7 | Made for her alone | "at risk" | Making your video… THE GREAT BECOMING, 58 s | ▶ | B |
| 8 | Her answer, deleted | the video | her words typed, deleted letter by letter; "Booked ✓ · today." | her one answer | B |
| 9 | The session | the booking | Shepherd Live™ (the 2003 theme; L's voice, no switch); her photo altered, "Becoming 99%"; notes "Sent as Maya" | Join in VR · Join here (the headset) | C |
| 10 | The friends break in | the message "from Maya" | Junie's tell; two sign-ins, two cursors, two tiles; Settings → Remove | Yes | C |
| 11 | The stream (respite) | Junie's "i know. come in." | her link; transjesus.str fills the monitor (either door); friends on camera, Rae's candles, TransJesus dancing, the chat, 41 → 42, the fund "for Maya's name change"; its light fills the room | dance · stay | D |
| 12 | The shutdown | the system, only damaged | the grey band; SESSION TERMINATED · reason: social contagion; the picture frozen; the glitch (≤ 3 steps a second), the light out | — | D |
| 13 | Coming soon | the termination | the dark; Junie: "we'll still exist."; L's line, its voice slowing and breaking; "Your update has failed." | — | D |
| → | Into the Close | the update's report | the turn to the room (a camera turn on a screen; one cut in a headset), the crossing forward to Daniel's seat (no morph), his line, the stars, the cards | press to continue | D |

Retired as research states (kept in their files): s4_l.json (S357), s4_v3.json's old conversation (S413), s4_ball.json's host,
link, raid, naming, backstage, session (S414), its frame, gather and the 3D stream space (S415), map and guide rows
(`_retiredS41x`). Stills for every beat: `research/article-images-2026-11-21/job33/S412/` … `S415/`.

## Walked (22 Nov)

The whole visit at **7763b962** (job33/all: S412–S415, S414b, S415b, and T100 on top), from the entrance to the Restart
page, once through each door of beat 9. Both passed: `isReachabilityProof` true, `reachedEra` e4, spine done, console [].
Join in VR took 284 presses and Join here 281. "line met daniel-2003 / caleb-2003 NOT MET" is the same as in every walk
since S404. The reports are in `research/article-images-2026-11-21/job33/final-7763b962/walk-vr/` and `walk-here/`.

## Timing (seconds from "Press to wake the screen", from the two walks, computer)

| beat | Join in VR: starts | lasts | Join here: starts | lasts |
|---|---|---|---|---|
| 1 week | 0.1 | 24.9 | 0.7 | 28.4 |
| 2 messages | 25.0 | 81.6 | 29.0 | 81.6 |
| 3 mail | 106.6 | 86.8 | 110.6 | 86.8 |
| 4 search | 193.3 | 22.3 | 197.4 | 22.3 |
| 4 the card (bot) | 215.7 | 17.3 | 219.7 | 17.3 |
| 5–6 review | 233.0 | 31.4 | 237.0 | 31.4 |
| 6 takeover | 264.4 | 65.4 | 268.4 | 65.4 |
| 7 video | 329.8 | 82.7 | 333.9 | 82.5 |
| 8 answer | 412.5 | 34.7 | 416.4 | 37.4 |
| 9 session | 447.1 | 35.9 | 453.8 | 33.7 |
| 9 photo | 483.0 | 21.2 | 487.5 | 21.2 |
| 10 friends | 504.2 | 36.8 | 508.7 | 36.0 |
| 10 restored | 541.0 | 11.0 | 544.7 | 11.1 |
| 11 stream | 552.1 | 72.2 | 555.8 | 69.0 |
| 12 shutdown | 624.3 | 23.4 | 624.8 | 23.4 |
| 13 end | 647.7 | 19.9 | 648.3 | 19.9 |
| Close: lead, turn, travel, line, look up, hold | 667.6 | 101.4 | 668.1 | 101.5 |
| **the Close's first card** | **769.0** | | **769.6** | |

- **12.8 minutes** from the wake to the Close's first card in both doors. The target was 14–15. The walker never opens
  Mum's optional HEDGE tape (123 s); with it, about 14.9 minutes.
- On a screen the turn into the Close is 32 s. In the headset it is one snap, so the headset is about 30 s shorter.
- **Still for more than 20 s:** only in `mail` (25.7 s from 133 s, and 20.8 s from 166 s in the VR walk), and something
  could be pressed both times. Nothing is both still and unpressable.

## Draw calls (budget 75)

A sweep at every 2026 jump (`e4Act1` … `e4Act4End`), with the head turned every 30° at pitch 0° and −25°, and the
end left to run into the Close (`research/…/job33/final-7763b962/drawcalls/`):

- **headset mock:** 48 through the acts (50 in the VR door's session), and **60** at worst, looking back during the
  Close's line on Daniel's CRT;
- LambyVision beside the screen (Act I): 33–36;
- **computer:** 29–30 through the acts, and **41** at worst, during the crossing.

The frame rates at the console (26-14) and at the photo (26-18) were measured on a CPU slowed four times (S413, S414).
Only the Quest can confirm them.
