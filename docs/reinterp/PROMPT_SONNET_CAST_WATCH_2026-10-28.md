STATUS: live

# Prompt — Sonnet watches a headset session through Meta casting (2026-10-28)

*How to use: open a new Claude Code session in this folder, choose Sonnet in the model picker, and paste everything
inside the fence. Before you start: the Quest is charged, the piece is open in the Meta Browser on the live URL in a
fresh tab, and you are signed in to your Meta account in Chrome (you sign in yourself — the agent never types a
password).*

```
You are watching Sérgio play "YOUR UPDATE HAS FAILED" in a Meta Quest 3 headset, through Meta's browser casting, and
taking notes and screenshots for the person who fixes the VR build. You OBSERVE ONLY: you never edit src/, data/ or
public/, never run the walk, never start a dev server, never download anything, and never touch his Meta account.

READ FIRST (5 minutes, no more): CLAUDE.md (the three look-modes, the comfort laws); 
docs/reinterp/PROMPTS_CODEX_CX5_XR_FIX_2026-10-27.md (his nine headset notes from 27 Oct and what S268 changed);
docs/reinterp/HEADSET_CHECKLIST_CX4.md if it exists. Those nine notes are what this session checks.

1. SET UP THE CAST VIEW
   - Use Claude in Chrome (his real Chrome, where he is signed in to Meta). Open a NEW tab at
     https://www.oculus.com/casting (it may redirect to a meta.com address — that is fine). If it shows a sign-in page,
     STOP and ask him to sign in himself; never type credentials, never accept terms or cookie banners for him (decline
     non-essential if he asks you to handle it).
   - Tell him: in the headset, open the quick menu → Camera / Share → Cast → choose "Computer" (this browser), then
     confirm in the headset. When the picture appears, ask him to make the cast tab full screen on the main display.
   - Do not click anything inside the cast page after that, except what he asks for.

2. CAPTURE FRAMES (the screenshots)
   - Make a folder out/cast-2026-10-28/frames/ (out/ is never committed).
   - Start this in the BACKGROUND (run_in_background), so it keeps going while you work:
       while true; do screencapture -x -t jpg "out/cast-2026-10-28/frames/$(date +%H%M%S).jpg"; sleep 5; done
   - If macOS refuses (Screen Recording permission), do NOT change any system setting. Tell him what is missing and
     ask him to grant it himself (System Settings → Privacy & Security → Screen Recording), then restart the loop.
   - Check the first frame shows the headset view, not the desktop. If it shows the wrong display, ask him.
   - When he says he is done, stop the loop (kill it) and say how many frames were saved.

3. WATCH AND TAKE NOTES
   - Every ~2 minutes (use Monitor or ScheduleWakeup if you have them; otherwise whenever he writes in chat), look at
     the NEW frames since your last look — not every one; skim and open the ones where something changed.
   - He may type short remarks in chat while playing ("now", "this is bad", "can't press"). Each remark: note the
     clock time, find the frames from the 15 s around it, and copy the clearest one to
     out/cast-2026-10-28/marked/<HHMMSS>_<two-word-label>.jpg.
   - Keep replies to him to ONE short line while he is playing (he is in a headset; he cannot read paragraphs). Never
     ask him questions mid-play unless the capture has stopped working.

   What to look for, in this order (these are his 27 Oct notes):
   a. Centre: are the stars, the title, the setup window and the monitor straight ahead, or off to one side?
   b. Scale and 6DoF: does the room look the right size? When he moves his head, does the room hold still in the world
      (good) or move with him (bad — "the camera was locked with my movement")?
   c. Reach: does he have to stretch / lean far to press? Are the screens a comfortable distance?
   d. Pressing: does a pinch or trigger press work first time? Note every press that seems lost (cursor on a button,
      nothing happens). Does he try touching buttons with a fingertip, and does it work?
   e. The ≡ Menu tab: does it sit in front of a screen? Does Recentre in the menu work? Does Meta's own long-press
      recentre work?
   f. Room changes: the pixel dissolve — are the squares small and calm, or big and scary? Any jump, tilt or flash?
   g. Readability: which screen text is hard to read (too far, too small, too dark, blurry)? Name the era and surface.
   h. Anything that looks broken: black or missing objects, flicker, frame drops (stutter visible in consecutive
      frames), text overflowing a window.
   Also note which era and beat he is in each time (1997 desk, 2003, 2016, 2026, the Close).

4. WRITE THE REPORT when he says he is done
   - docs/reinterp/HEADSET_SESSION_2026-10-28.md, first line exactly `STATUS: live`. Sections:
     1. Setup (what device/browser, the build URL, start and end time, frame count).
     2. His nine notes from 27 Oct, one line each: FIXED / BETTER / SAME / WORSE / NOT SEEN, with the frame file that
        shows it.
     3. New problems, most severe first: what, where (era + surface), when (clock time), frame file, his remark if any.
     4. His remarks, verbatim, with time.
     5. Open questions for him (things you could not tell from frames).
   - Quote him exactly; never invent what he felt. If a frame is ambiguous, say so instead of guessing.
   - Do not commit anything. Tell him the report path and the marked/ folder, and stop.
```

Notes for Sérgio:
- The live build is what was pushed last (096cebd4, the S268 VR fixes). The new 1997 order is not live yet.
- Casting works from Chrome or Edge, not Safari.
- The frames are pictures of the casting stream, so they show one eye and lag a little behind the headset. Sound is
  not captured. If something matters, say it out loud *and* type a word in chat, so the moment gets marked.
