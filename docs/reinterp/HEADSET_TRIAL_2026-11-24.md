STATUS: live

# Headset trial, job 35 (2016's second half, the update, the flight, the Close) — 24 Nov 2026

*His words, 24 Nov: "Yes Push it live, and plan those checklist into a way I can do that while with the headset and for
the system to look for them. Also remember that we want to connect the headset to the computer and to be able to run the
screenshot system of casting etc". Live at reinterp **097b097d** (the headset's debug line says build **097b097**).
Written by the orchestrator (S357gf). The two checklists it replaces for this trial: `HEADSET_CHECKLIST_JOB35_2026-11-23.md`
and `HEADSET_CHECKLIST_JOB35D_2026-11-24.md`.*

## The idea

**You don't carry the checklist into the headset.** You play, and you talk as you go. The Mac follows the game through the
USB cable and finds the moment of every check by itself. It takes the headset's own picture every 4 seconds and measures
the frame rate and the draw calls. Afterwards one report puts, beside each check, the pictures, the numbers and what you
said at that moment.

## Before you put it on (about 5 minutes)

1. **Phone:** Meta Horizon app → your headset → Headset settings → **Developer mode on**. (Once only. If it asks for a
   developer account, make the free one.)
2. **Cable:** a USB-C cable that carries data, from the Quest to the Mac. In the headset: **"Allow USB debugging?" →
   tick "Always allow from this computer" → Allow.**
3. **Quest Browser:** open **https://sergioroxo.github.io/update-available/?reinterp=1&era=3&debug=1**
   (`era=3` starts at 2016, where the checks begin; the debug line shows **build 097b097**).
4. **Casting:** cast to the Mac as usual, so I can watch live. The pictures for the report now come through the cable,
   not from the cast.
5. **Your voice:** QuickTime audio on the Mac, as on 20 Nov. Say the time with the seconds when you start (for example
   "11:42 and 30 seconds").
6. **I start the recorder** and tell you when it can see the game. Then you begin.

## Six things to do on purpose

Everything else, just play as anyone would.

1. **2016, Heartwood:** when Lambient offers the set, press **Bring it**, then **▶**. Later, press the set's body to put it back.
2. **2016, Malta:** in the group chat, press **▲ Earlier messages** once, then **▼ New messages**.
3. **2016, Malta:** press **↪ Forward the link**.
4. **The Close:** when the stars come down, **turn all the way round** once.
5. **The Close:** open **Daniel's machine**, then press **Back to the panels**. Point the ray at the **white 2016 site** and
   at the **Lexicon**.
6. **The Close:** press **Start again** at the very end.

## While you play

- **Say "good" or "problem", and why**, whenever something strikes you. The report puts your words beside the check that
  was happening at that moment.
- Say **"mark"** when something is wrong. The pictures from that moment go to the top of the report.

## What the Mac looks for (17 checks, in the order you meet them)

| # | check | the Mac finds it by | what only your eye can judge |
|---|---|---|---|
| 1 | 16-8 This week first | Lambient allowed | the card over the board; Begin easy to reach |
| 2 | 16-11 · 16-6 Training, Lesson 1 | Lesson 1 applied | 2 and 3 veiled; Lambient's own cut readable; no verse lines |
| 3 | 16-7 Heartwood, offered once | the offer answered | the set above the monitor, whole; nothing plays before ▶ |
| 4 | Lessons 2 and 3 | the day done | the Wick marked; Annette is yours to answer |
| 5 | 16-14 A memory from 2014 | the day ends | a small card; her story, then her own words |
| 6 | 16-13 Her Notes | the Notes open | in the phone's column, no window over another; nothing speaks |
| 7 | 16-16 Bea's news | the news starts | the group in its column; no line cut; a pace you can read; the scroll |
| 8 | 16-15 The kit | your answer to the kit | "GracePlatform chose your story." reads clearly |
| 9 | 16-17 The removal | the review starts | slow and calm; "removing…", the grey, the fold |
| 10 | 16-17 · 16-18 Outnumbered, the ending | the review falls behind | "Review could not keep up."; Forward the link; **does 2016's ending land?** |
| 11 | 16-20 · 16-19 The update | the update to 2026 | the changelog is about Vera; short terms; "Next page" |
| 12 | 16-21 · 16-23 · 16-22 The flight | 2026 begins | the turn starts as you rise; no white hole; **comfortable?** |
| 13 | 2026 | the wake press | anything you notice (not on this list) |
| 14 | C-1 Her line stays | the Close's "line" | the monitor stays in front, never slides aside |
| 15 | C-2 · C-10 The stars | the stars descend | every label readable from the seat; only stars behind you |
| 16 | C-6 The cards | the first card | each card in the same place, nothing over it |
| 17 | C-7 · C-5 · C-8 · C-9 · C-4 The panels | the panels open | at eye level; Back to the panels; the ray on white; Start again |

The 12 calls in the two checklists (the 7.5° turn of the computer view, the red stripe, the slower removal…) are not
asked again here. Mention any of them if you notice it.

## After

1. I stop the recorder and make the report: `node tools/trial-report.mjs --out out/trial-2026-11-24 --voice "<your _clock.tsv>"`.
   It lists the 17 checks, says FOUND or NOT FOUND for each, and puts beside each one the pictures, the lowest frame rate
   in VR, the peak draw calls, any console errors, and your words.
2. Your recording is transcribed on the Mac Studio, as on 20 Nov.
3. Readers look at each check's pictures and your words, and write WORKS / PROBLEM / NOT SEEN.
4. You get the problems in plain numbered points, with the pictures.

## Then, with the cable still in: T57 (if there is time)

The sharper-text test from `HEADSET_EDGES_AND_LAYERS_2026-11-24.md` §5: open the piece with `?quad=1`. I read on the Mac
why it went black on 10 Nov. Meta's `metavr` stays optional, only with your yes before anything is installed.

## The tools (for the next session)

- `tools/trial-watch.mjs`:
  - finds the Quest on the cable;
  - forwards the Quest Browser's DevTools to the Mac;
  - reads the page once a second through the `?debug=1` probes;
  - takes the headset's own picture every 4 s (`adb exec-out screencap -p`) and the Mac's screen (`screencapture`);
  - records console errors;
  - writes `log.jsonl` on the Mac's clock.
  It only reads: nothing is stored on the Quest, and the piece makes no network call. Tested 24 Nov against the live
  site in Chrome on the Mac (45 reads in 45 s, fps and draw calls read). **Not yet tested with the Quest itself.**
- `tools/trial-items.json`: the 17 checks, each with the log entry that starts it.
- `tools/trial-report.mjs`: the report. Tested on a made-up log (17/17 found).
- If `adb exec-out screencap` turns out to give no picture of the VR view in the Quest, the cast pictures from the Mac's screen
  are the fallback (they are taken anyway).
