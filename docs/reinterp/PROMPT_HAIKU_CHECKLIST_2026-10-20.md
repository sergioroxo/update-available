STATUS: live

# Haiku checker — confirm the 18–19 Oct fixes, item by item (2026-10-20)
*Open a new Claude Code session in /Users/sergiogalvaoroxo/update-available-reinterp, model **Haiku 5.5, effort
medium** for the checks alone — or **Sonnet 5.5, effort medium** if you also want Parts 2 and 3 done well (judging what is
missing needs a stronger model). It plays the piece in the built-in browser (or Claude in Chrome) and only CHECKS — it changes nothing. Paste
everything below the line. Expect ~45–60 minutes for Part 1, ~1.5–2 hours for all three.*

---

You are checking an interactive art piece, "YOUR UPDATE HAS FAILED", for a list of fixes. You CHANGE NOTHING: never edit
files, never commit, never push. You only play, look, and write one report.

Play it at https://sergioroxo.github.io/update-available/?reinterp=1 in the built-in browser (open a fresh tab; if it
looks old, reload). If that does not load, use http://localhost:3000/?reinterp=1 instead. Desktop browser only.
How it works: the view is a 3D room; drag to look, scroll to zoom; click to press things on the computer screen.
Esc opens the menu. In each era, the OS's **Start** button lists every step and has **Jump to…** the eras (use it to
move between eras quickly). Lamby (a cartoon lamb) is the helper: its symbol stays on screen; press it for a hint.
If you are stuck for more than 2 minutes anywhere, note it as a FAIL with where you were, then use Start → Jump to
continue.

For EACH check below write: the number, PASS / FAIL / COULD NOT CHECK, one line of what you saw, and a screenshot
for every FAIL (save screenshots to ~/Pc_Simulation/GPTPlaysIT/haiku-check-2026-10-20/, and name them by number).

## The checks
1. **Opening:** the stars gather into YOUR UPDATE HAS FAILED; the line "Work in progress — …" is visible; one click
   opens LambyOS Setup floating in the stars with Lamby already saying "Hi! It looks like you're restoring a session."
2. **Setup has no "About this project"** step or icon.
3. **Setup teaches Start and the Lamby symbol** (a line like "This is Start: every step in order…").
4. **"Keep it quiet"** in the sound step: after choosing it, NO sound at all is heard for the rest of that visit
   (room tone, system sounds, music). (If you cannot hear audio, check the menu's sound row says muted, and say so.)
5. **The advert** plays in full with no Skip button; Esc pauses it; after it ends the setup moves on by itself.
6. **1997:** Lamby's symbol is always visible on the desktop and its balloon never covers it.
7. **1997 windows close:** the mIRC channel window, the private message window, and Netpoint/NetPilot each close
   with their X (and can be reopened from the taskbar or Start).
8. **One instruction at a time:** in 1997 and 2003, at no moment are there two different "what to do next"
   instructions on screen at once (e.g. a Lamby balloon AND a corner hint AND a card). Note any moment there are.
9. **No automatic zoom:** at the desk, the camera never zooms in or pulls your view back by itself while you drag to
   look around (scroll-zoom only when you do it).
10. **2003 Caleb:** after his video, his message arrives; close any alert that appears — the conversation is readable
    again afterwards; only one alert shows at a time.
11. **2003 "A message from outside":** the camera stays inside the room (never a dark void with nothing in it).
12. **2003 "press on the screen to continue"** appears at the reboot, with the monitor's blue light pulsing.
13. **2016:** when Lamby says to start with Annette, the family calls open on Annette; the story queue's count goes
    down as stories are done (not "done" + "four waiting"); the group post shows Renata's story attached BEFORE you post.
14. **Jump, then 2026:** from 2003 use Start → Jump to 2016, play into 2026 by the normal update — 2026 BEGINS
    (a screensaver to press, then the restore, then L on the laptop). FAIL if the laptop shows "Your update has
    failed … L will be waiting for the next update" at the start of 2026.
15. **"Your file"** (Esc → Your file) shows only eras you have already been in.
16. **The end:** after 2026 the piece ends on Daniel's monitor with a retro Restart card ("Restart as you are",
    1997 — 2026, the four eras, the receipt, Start again) and the Lexicon (Multimedia Edition) with a Sources tab of
    several pages. FAIL if you see a colourful cartoon library ("LambyOS Home — Library").
17. **About this project** appears at the end, inside the 1997 dossier/panel, with no text running off its window.
18. **Idle:** leave the piece untouched for 5 minutes — screensavers appear; touch → "Start from the beginning?".
    (Optional: leave 10 minutes untouched → back to the stars.)

## Part 2 — the map of the project (as you play)
Build a map of the whole visit as a visitor meets it. For each era (the setup, 1997, 2003, 2016, 2026, the Close), list
in order every step: what is on screen, what you must press (or wait for), what is optional, where it leads, and about
how long it took. Use each era's **Start** list as the spine (it names every step in order), and add what Start does not
show: optional windows, games, songs, extras, and any place you got stuck. Write it as:
- a Mermaid flowchart (`flowchart TD`) of the main path with optional branches as dashed side nodes;
- a table per era: step · what you do · optional? · time · notes.
Save it as ~/Pc_Simulation/GPTPlaysIT/haiku-check-2026-10-20/MAP.md.

## Part 3 — what seems missing (a visitor's view)
While you play, note everything that felt MISSING or unclear — not bugs, but gaps: a moment with no reason to act, a
place you did not know what to do (even with Lamby), something mentioned but never shown, a choice with no visible
consequence, a reward or ending that felt absent, text that explains what the screen should show instead, anything you
expected to be able to do and could not. For each: where (era + step), what was missing, why it mattered, and one
suggestion. Mark how sure you are (sure / maybe). Do not invent content or facts about the subject; describe gaps in the
EXPERIENCE only. Save as ~/Pc_Simulation/GPTPlaysIT/haiku-check-2026-10-20/MISSING.md.

## The report
Write it to ~/Pc_Simulation/GPTPlaysIT/haiku-check-2026-10-20/REPORT.md (Parts 2 and 3 go in MAP.md and MISSING.md): a table of the 18 checks (number, result,
one line, screenshot name), then "Other problems I noticed" (short, with screenshots), then "Could not check" with why.
Be literal and honest; do not guess; do not fix anything.
