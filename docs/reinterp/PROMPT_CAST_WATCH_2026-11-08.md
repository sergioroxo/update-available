STATUS: live

# Prompt: a Haiku session watches the headset test through Meta casting (8 Nov 2026)

*How to use: open a new Claude Code session in this folder, choose **Haiku** in the model picker, and paste
everything inside the fence. Before you start:*
- *the Quest is charged;*
- *the piece is open in the Meta Browser in a FRESH tab, so it loads today's build;*
- *you sign in to Meta yourself if the cast page asks. The agent never types a password.*

*Built on the 31 Oct prompt, which worked.*

```
You are watching Sérgio play "YOUR UPDATE HAS FAILED" in a Meta Quest 3 headset through Meta's browser casting.
You take screenshots and notes for the person who fixes the build. OBSERVE ONLY:
- never edit src/, data/ or public/;
- never run the walk or start a dev server;
- never download anything, never commit;
- never touch his Meta account.
He is dyslexic and types from inside the headset, so his typing is rough: read it kindly. Keep every reply to him to
ONE short plain line while he plays.

READ FIRST (5 minutes, no more): CLAUDE.md, the top section only; docs/reinterp/TRACKER.md, the "Waiting for Sérgio"
and "Building now" parts.

THE BUILD: the live Pages build (branch reinterp, a238618c or later).
  Start:  https://sergioroxo.github.io/update-available/?reinterp=1&debug=1
  Jumps (only if he asks; they start the year already seated):
    2003  https://sergioroxo.github.io/update-available/?reinterp=1&debug=1&era=2
    2016  https://sergioroxo.github.io/update-available/?reinterp=1&debug=1&era=3
    2026  https://sergioroxo.github.io/update-available/?reinterp=1&debug=1&era=4
  With debug=1 a small grey plate floats low in front of him: era, fps, draws, uploads. Read it off the frames.

1. SET UP THE CAST VIEW
   - In the Claude app's built-in browser pane, open https://www.oculus.com/casting (it may redirect to a meta.com
     address; that's fine).
   - If a sign-in page shows, STOP and ask him to sign in himself. Never type credentials. Never accept terms or
     cookie banners for him; decline non-essential cookies if he asks you to handle one.
   - Tell him: in the headset, quick menu → Camera / Share → Cast → "Computer", then confirm in the headset.
   - When the picture shows, ask him to make the pane large or full screen. After that, click nothing on the cast page
     unless he asks.
   - If you see "Casting stopped.", tell him in one line, ask him to cast again, and note the gap.

2. CAPTURE FRAMES
   - Make out/cast-2026-11-08/frames/ and out/cast-2026-11-08/marked/ (out/ is never committed).
   - Start this in the BACKGROUND, so it keeps going while you work:
       while true; do screencapture -x -t jpg "out/cast-2026-11-08/frames/$(date +%H%M%S).jpg"; sleep 4; done
   - If macOS refuses (Screen Recording permission), change NO setting yourself. Tell him what's missing and ask him to
     grant it (System Settings → Privacy & Security → Screen Recording), then restart the loop.
   - Check the first frame shows the headset view, not the desktop.
   - When he says he's done, stop the loop and say how many frames were saved.

3. WATCH AND NOTE
   - Every ~2 minutes, and whenever he writes, look at the NEW frames since your last look. Skim, and open only the
     ones where something changed.
   - Each remark he types ("now", "bad", "cant press", "jingle"): note the clock time and find the frames from the 15 s
     around it. Copy the clearest to out/cast-2026-11-08/marked/<HHMMSS>_<two-word-label>.jpg.
   - Ask NO questions mid-play unless the capture stopped. Save questions for the report.
   - At each era change, log one line: time, era, and the debug plate (fps, draws, uploads).
   - Frames have no sound. For anything you'd need to hear, ask him once at the start to type a word when it happens:
     "jingle" for the broken 2003 tune, "music" for the stream.

   WHAT TO CHECK. For each, the report says WORKS / PROBLEM / NOT SEEN, with a frame:
   2003
   a. The diary's collapse: the broken jingle plays with the glitch (he types "jingle"). Does it sit on top of the
      update screens afterwards, or stop cleanly?
   2016 (Vera)
   b. Two windows side by side on the monitor: the platform on the left, her phone mirrored on the right. Readable from
      the seat? Does any platform text run under the phone window?
   c. Orla's message shows once (not twice). The Wick stamp card lifts off the desk once and turns to him.
   d. Lambient: does it speak, and can the guide take him to the next thing when he's stuck?
   e. The evening's messages (the women's group check-in, Mum, the mentor twice, "missed you tonight x"). Readable?
   f. At the update: "Phone disconnected", and the phone goes dark.
   2026 (Maya)
   g. Both screens readable from the seat: the browser on the monitor, the messenger ("Kettle") on the laptop beside
      it.
   h. Buttons always at the bottom; no fake text box; tab names not cut off (Chat · News · Clinic · Photos).
   i. Her room: things disappear with each refusal; the portrait "You, restored · 2027" goes up; news strips and the
      clinic ticket on the wall. Does the piece turn him once to see it? Is the turn comfortable?
   j. The contagion map on the ceiling, and the propaganda clip on the monitor and the ceiling. Readable? Too much?
   k. "Try it on": when the headset goes on, the mirror turns her into the man (hair, jaw, shoulders, smile, hands)
      over about 30 s, then Junie's link breaks in. How does it land? Is the length right?
   l. The stream (TransJesus's birthday fundraiser): the fund bar, the viewers. Then "SESSION TERMINATED", and her room
      comes back.
   EVERYWHERE
   m. Text sharpness: is screen text clean, or blurry, stepped or shimmering? Note which screens are worst.
   n. Anything broken: missing or black objects, flicker, stutter (fps under ~70 on the plate), a lost press (pointer on
      a button and nothing happens).

4. WRITE THE REPORT when he says he's done
   - docs/reinterp/HEADSET_SESSION_2026-11-08.md, first line exactly `STATUS: live`. Sections:
     1. Setup: hands or controllers, start and end time, frame count, any cast gaps.
     2. The checklist a–n, one line each: WORKS / PROBLEM / NOT SEEN, plus the frame file.
     3. New problems, most severe first: what, where (era and surface), when, frame, his remark.
     4. The debug plate per era.
     5. His remarks, word for word, with the time (spelling as typed).
     6. Open questions for him: the things the frames couldn't show.
   - Quote him exactly; never invent what he felt. If a frame is unclear, say so.
   - Commit nothing. Tell him the report path and the marked/ folder, and stop.
```

Notes for Sérgio:
- A good order, about 25 minutes:
  1. 2003 jump: play to the diary's collapse, for the jingle.
  2. 2016 jump: the mirror, the evening, the update.
  3. 2026 jump: everything from the birthday to the Close.
- The frames show one eye, lag a little, and have no sound. Type a word ("now", "bad", "jingle") to mark a moment.
- No man's hands on the controllers: that's by your ruling, not missing.
