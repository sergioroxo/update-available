STATUS: live

# Prompt — a session watches today's headset test through Meta casting (2026-10-31)

*How to use: open a new Claude Code session in this folder, choose Sonnet in the model picker, and paste everything
inside the fence. Before you start: the Quest is charged; the piece is open in the Meta Browser in a FRESH tab (an old
tab may run yesterday's build); you are ready to sign in to Meta yourself when the cast page asks — the agent never
types a password. Built on the 28 Oct prompt (`PROMPT_SONNET_CAST_WATCH_2026-10-28.md`), which worked.*

```
You are watching Sérgio play "YOUR UPDATE HAS FAILED" in a Meta Quest 3 headset, through Meta's browser casting, and
taking notes and screenshots for the person who fixes the VR build. You OBSERVE ONLY: you never edit src/, data/ or
public/, never run the walk, never start a dev server, never download anything, never commit, and never touch his Meta
account. He is dyslexic and types inside the headset through a small gap: his typing is rough, read it kindly, and keep
every reply to him to ONE short plain line while he plays.

READ FIRST (5 minutes, no more): CLAUDE.md (the three look-modes, the comfort laws);
docs/reinterp/HEADSET_SESSION_2026-10-28.md (the last cast session — same method, what broke then);
docs/reinterp/VR_AS_A_LAYER_2026-10-31.md §2–§5 (the new VR features you are checking today).

THE BUILD: the live Pages build at eb3f6e13 (S270h).
  Start:      https://sergioroxo.github.io/update-available/?reinterp=1&debug=1
  Jump links (only if he asks to skip ahead; they start that year already seated, so they SKIP the dollhouse):
    2003  https://sergioroxo.github.io/update-available/?reinterp=1&debug=1&era=2
    2016  https://sergioroxo.github.io/update-available/?reinterp=1&debug=1&era=3
    2026  https://sergioroxo.github.io/update-available/?reinterp=1&debug=1&era=4
  With debug=1 a small grey plate floats low in front of him. It shows era/step, fps, draws, uploads, the seat, and
  "batches following". Read it off the frames: it is your best data.

1. SET UP THE CAST VIEW
   - Use the Claude app's built-in browser (the browser pane) — that is what worked on 28 Oct. Open
     https://www.oculus.com/casting (it redirects to a meta.com / horizon.meta.com address — fine). If it shows a
     sign-in page, STOP and ask him to sign in himself. Never type credentials. Never accept terms or cookie banners for
     him; if he asks you to handle one, decline the non-essential ones.
   - Tell him: in the headset, quick menu → Camera / Share → Cast → choose "Computer", then confirm in the headset.
     When the picture appears, ask him to make the browser pane large or full screen on the main display.
   - After that, click nothing on the cast page unless he asks.
   - On 28 Oct the cast stopped on its own ("Casting stopped."). If that happens: tell him in one line, ask him to cast
     again, keep the same frames folder, and note the gap in the report.

2. CAPTURE FRAMES
   - Make out/cast-2026-10-31/frames/ and out/cast-2026-10-31/marked/ (out/ is never committed).
   - Start this in the BACKGROUND (run_in_background), so it keeps going while you work:
       while true; do screencapture -x -t jpg "out/cast-2026-10-31/frames/$(date +%H%M%S).jpg"; sleep 4; done
   - If macOS refuses (Screen Recording permission), change NO system setting. Tell him what is missing and ask him to
     grant it himself (System Settings → Privacy & Security → Screen Recording), then restart the loop.
   - Check the first frame shows the headset view, not the desktop. If it shows the wrong display, ask him.
   - When he says he is done, stop the loop and say how many frames were saved.

3. WATCH AND TAKE NOTES
   - Every ~2 minutes, and whenever he writes, look at the NEW frames since your last look (skim; open the ones where
     something changed).
   - Each remark he types ("now", "bad", "cant press", "buzz"): note the clock time, find the frames from the 15 s
     around it, and copy the clearest to out/cast-2026-10-31/marked/<HHMMSS>_<two-word-label>.jpg.
   - Mid-play, ask NO questions unless the capture has stopped. Keep questions for the report.
   - Each time the era changes, log one line: clock time, era, and the debug plate (fps, draws, uploads).

   PART A — the fixes since 28 Oct (from his four headset passes). For each, the report says FIXED / BETTER / SAME /
   WORSE / NOT SEEN, with a frame:
   a. Entry: after the setup, does he land AT THE DESK, seated, or up at the ceiling? Does the room stay at desk
      height, or drift up or down after a few seconds?
   b. The whole room: when he turns his head, does the room stay whole — no stars showing through walls, no half
      room, no plant or Game Boy floating in the stars?
   c. The monitor: is the 1997 screen lit and readable, or a black box? Same for every later screen.
   d. Seat distance: behind the chair, or about at the desk edge? He wanted "a little bit closer still".
   e. Sharpness: are posters, the racket and screen text clean, or shimmering, stepped or blurry?
   f. Fingertips: a small cube on each fingertip. It is faint at rest, turns blue when touching a button, and flashes
      bright on a press. Can you see that change in the frames? Does he say presses feel surer?
   g. The ≡ Menu tab: a beige Win95 button beside the screen, and a second one just above the wrist when he looks at
      his hand. Does it stay put, or run away, or point sideways? The menu itself should look like a Win95 dialog
      (grey, bevelled, blue title bar), not the old dark plate.
   h. Recentre (in the Menu): does it put him back at the desk, facing the screen?
   i. Hints: a small yellow tooltip should sit BELOW the monitor, never over it.
   j. Flashing: the intake panel and the radio window flashed black/green on 27 Oct. Still?
   k. Pop-in: things popping in behind him (the door handle, cabinets). Still?
   l. The debug plate: low in front, readable?

   PART B — the new VR layer (built today, never yet worn). For each: did it appear, did it work, and what he says.
   Note whether he used HANDS or CONTROLLERS (the frames show controllers as rays and hands as blocky fingers).
   1. VR-04 Match my table (1997, first minute in the room): about 6 s after he sits, a line offers
      "Sitting at a table? Open the Menu and choose Match my table." In the Menu: "Match my table" → he rests one
      fingertip on his real table, still, for about 1 s → "Done. The desk now sits at your table." (or "No table
      found."). Does the virtual desk then meet his real one? Can he rest his elbows?
   2. VR-05 Lamby in the room: when Lamby's balloon shows, a small flat Lamby appears in the room. In 1997 it hops off
      the monitor onto the desk; in 2003 it sits on the monitor; in 2016 a small badge near the phone; in 2026 a soft
      glow. Pressing Lamby = "Yes". Does it show, is it in a sensible place, does pressing it work?
   3. VR-01 the desk mouse (1997 and 2003): resting the palm (or a controller) on the beige mouse takes it; sliding it
      on the desk moves a small arrow on the monitor; a pinch or trigger clicks where the arrow is. Does the arrow
      appear? Can he click something with it? Pointing at the screen should still work when no hand is on the mouse.
   4. The dollhouse (VR-06), at the 1997 → 2003 change (only if he plays through, not with a jump link): the room
      dissolves into a small model of the house in front of him, about 45 cm wide, for about 4 s, then he is seated in
      the new room. Is it visible, is it readable as a house, does anything jump?
   5. VR-02 the flip phone (2003): the phone lies SHUT on the desk in a headset. It opens when he picks it up (grip, or
      a held pinch).
   6. VR-03 Vera's phone (2016): grip or a held pinch near it picks it up; it follows his hand, screen to his eyes; it
      goes back to its stand when he lets go. With controllers, a new message is a buzz in the hand that holds it —
      frames cannot show that; ask him to type "buzz" when he feels one. Can he press its screen while holding it?
   7. VR-08 the visor (2026): he picks it up and brings it to his face. Close to the eyes it goes on: the view's edges
      close into a lens shape, and his fingertips change colour (the programme's colour). By design the visor STAYS ON;
      taking it off is not a feature (his ruling). Does it go on? Is the lens edge calm or disturbing?

   Also note anything broken: black or missing objects, flicker, stutter (fps on the plate under ~70), text spilling
   out of a window, a press that seems lost (pointer on a button, nothing happens).

4. WRITE THE REPORT when he says he is done
   - docs/reinterp/HEADSET_SESSION_2026-10-31.md, first line exactly `STATUS: live`. Sections:
     1. Setup: device, hands or controllers, the build (eb3f6e13), start and end time, frame count, any cast gaps.
     2. Part A, one line each (a–l): FIXED / BETTER / SAME / WORSE / NOT SEEN, with the frame file.
     3. Part B, one short paragraph each (1–7): seen? worked? his words, frame file.
     4. New problems, most severe first: what, where (era + surface), when (clock time), frame, his remark if any.
     5. The debug plate per era: fps, draws, uploads.
     6. His remarks, verbatim, with time (spelling as typed).
     7. Open questions for him — the things the frames could not tell you.
     8. Marked frames: the list.
   - Quote him exactly; never invent what he felt. If a frame is ambiguous, say so instead of guessing.
   - Commit nothing. Tell him the report path and the marked/ folder, and stop.
```

Notes for Sérgio:
- Open the piece in a fresh tab in the Meta Browser, so it loads today's build (eb3f6e13).
- A good order for the test, about 20–25 minutes:
  1. 1997 from the start: setup, the table match, Lamby, the mouse.
  2. Play on into 2003, to see the dollhouse at the change: the mouse again, and the flip phone.
  3. Jump to 2016 for Vera's phone. If you can, use controllers there, to feel the buzz.
  4. Jump to 2026 for the visor.
- The frames show one eye, lag a little, and have no sound or buzz. If something matters, type a word ("now", "buzz",
  "bad") so the moment gets marked.
- Not built yet, so don't look for them: the update ring (VR-07), key clicks, taking the visor off.
