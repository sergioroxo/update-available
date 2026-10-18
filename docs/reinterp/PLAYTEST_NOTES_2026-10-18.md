STATUS: live

# His notes while watching Codex play the piece (18 Oct 2026) — the brief for the next Codex round
*Source: his messages of 2026-10-18, and Codex's own playtest in
/Users/sergiogalvaoroxo/Pc_Simulation/GPTPlaysIT/browser-playtest-2026-10-18 (read it). Claude's weekly budget is nearly
spent, so Codex works from this file directly. Work in a WORKTREE on a branch (the PREAMBLE in
PROMPTS_CODEX_2026-10-11.md), not the main checkout; commit; report every changed string BEFORE/AFTER; quick checks on
the HUMAN path (headless probes), plus one full walk at the end.*

## P0 — breaks the visit (fix first)
1. **2003 · "A message from outside": the screen goes dark and the camera ends in a VOID**, with no way out. (Screenshot:
   a wall edge on night-blue, "Look with your device".) Reproduce from the start; find what moves the camera there
   (the call / take-the-viewer / a send / Caleb's moment) and fix; the visitor must always land in the room.
2. **You can't close the mIRC window; you can't close Netpoint.** Every window's X must close it.
3. **The "What to do" button doesn't reopen.** And his design: it should not be its own button — the Start menu is
   that. The what-to-do lives in the Start menu, on Lamby's symbol, and/or as a desktop icon.
4. **The debug panel is broken: it can't jump ahead.** Restore the debug jumps (review tool).
5. **"The About this panel still appears — why?"** It was to be removed from the setup (it lives in the Credits).

## P1 — the guide (Lamby) and teaching
6. **Lamby is always available**: its symbol always on screen; reduce the message box so it never blocks the symbol.
7. **Teach the Lamby symbol as the helper** (in the setup, with the Start menu lesson).
8. **Zoom**: no automatic zooms unless the visitor asks for them (the zoom-in he saw is unnecessary and too fast). The
   scroll wheel is taught in How to look ("drag to look; scroll to zoom in and out") — check it shows, and is clear.
9. **Rob's line + Lamby's pop-up**: the overlay is good, but a tiny bit too fast — give it more time.
10. **The IRC wait is confusing**: while the channel plays out, tell the visitor to wait/watch (Lamby or the frame).
11. **How do you do the form?** Make the way to the form obvious (Lamby offers to open it).
12. **The diary's message options — when do they appear?** Make it clear when and how.
13. **When are you told you can play the video game, and the other songs?** Lamby mentions them at the right moment
    (optional extras).
14. **Un-Walk's "Remind me later"**: make it clear you can come back to it via the X / the Start menu if you want to
    explore the room first.
15. **"Are you struggling too? Start here"** — the arrow points at what? Say plainly what to do now.
16. **"Turn and look" with a flyover** — what is it, is it desktop-only? Explain it or remove it if unneeded.
17. **2003 "Press to continue"**: make the monitor's blue light flash, or say "press on the screen to continue".

## P2 — content and order
18. **Why is the 1997 profile setup now in three parts?** Explain or recombine into one clear step.
19. **Does it say "Daniel"?** Check the 1997 questionnaire/profile names Daniel correctly (or deliberately not).
20. **The father questionnaire should come right before the Racket experience** — the recommended order there.
21. **2003 room tone is too loud** — lower it; it muffles Lamby's opening.
22. **Restorify Media — Your Story's six steps**: do they come by click or in sequence? Add a "faster" button for
    visitors who want to go quicker.
23. **"Your file — what the system recorded"**: add it as a research finding (dossier wording his), with image
    examples.

## Added later on 18 Oct (his second message and the second playtest)
24. **P0 · 2026 ends at once after a route that used Start → Jump** (both playtests; his screenshot shows "update to
    era 5" filed with 2 of 9 beats done): the laptop shows the Close's "Your update has failed… L will be waiting for
    the next update — coming soon." Under investigation by Claude (a walk from 2003 to the Close is reproducing it).
    One cause fixed (S254: a jump left the 2026 shell marked handed-off — now a fresh shell after every jump).
25. **"About this" belongs at the END, with the era-1 dossier** (see browser-playtest/10-dossier-overflow.png — it also
    overflows there; fix the overflow).
26. **"LambyOS Home still appears at the end"** — the Library on Daniel's monitor uses the Bob art and the sign
    "LambyOS Home — Library". His call: keep the Library, or return the end to the retro OS look until the Bob version.
27. **Mute**: in the "muted" version the room tone and system sounds were still audible — fixed by Claude (S254: the
    setup's "Keep it quiet" now uses the menu's full mute — tapes, room beds, one-shots).
28. **2003: too much camera adjusting** by the system — when the visitor moves, the system forces the view back. Only
    move the camera when the story needs it (the C4 desk lean-in/out is the likely cause; make it gentler and never
    fight a drag).
29. From Codex's second playtest (browser-playtest-continuation-2026-10-18/review.md): (1) Caleb's chat stays redacted
    after the first alert is closed and the alerts stack — one alert at a time, and the conversation readable after;
    (2) the media release: preselected channels + one "I Agree" — keep it as the coercion it depicts, but make the
    decline visible (his call); (3) "Your file" shows entries from UNPLAYED eras (spoiler) — only show what was met;
    (4) posting the group message silently attaches Renata's story — show the attachment before posting; (5) Lamby says
    "Annette first" but the family calls open on Ruth — open Annette; (6) "no template matches" beside four replies —
    reword; (7) the queue card says "done" and "four waiting" — fix the count; (8) the story page's BROADBAND option and
    "Start here" do nothing — wire or disable.
30. **Research findings logged** (docs/reinterp/ARTICLE_EVIDENCE_LOG.md): F-EXH-1 Lamby as Clippy; F-EXH-2 "Your file".
31. **⚑ His decision (18 Oct): the END gets the retro OS look again, and the old Lexicon.** Replace the Library on
    Daniel's monitor (the Bob-art "LambyOS Home — Library", commits "CODEX: library — end the Close on Daniel's monitor"
    186faf4 and "CODEX: library-2 …" f5ae2bc) with the Close's earlier retro ending on that monitor: the Restart card in
    the era's OS style (Go back to a room · Start again · the receipt · the Lexicon) and the Lexicon as it was at the
    Close (The Words, The Reasons, Your Words, with the Sources tab kept). Keep the Bob art and library code in the repo
    (unused) for the later Bob version; "About this" moves here with the era-1 dossier (item 25).
32. **Evidence for item 24 (Claude, 18 Oct, for Codex):**
    - `src/desktop/os.ts closeForEraJump()` called `e4.closeForEraJump()` → `debugStopDevice()`, which sets
      `handedOff = true` on the live 2026 shell; any later arrival found a finished session → `finishHandOff`-like end
      state and the close update. FIXED in S254 (a fresh `newE4Shell()` after every jump). Re-test the playtester's
      route: Start → Jump to 2003 → play to 2026 normally → 2026 must begin (screensaver → restore → L) and run to the
      Close.
    - A second, separate stall: `node tools/walk.mjs --from-era 2 --require-close` (review boot `?era=2&descent=0`)
      reaches 2026 with the browser DORMANT and the laptop off, forever (out/walks/WALK_2026-10-18_FROM_e2_SPEEDRUN_GUIDED.md,
      out/walk-shots-e2/walk_end.png). `os.e4.beginSession()` is only called from app.ts `endRelocation` (key 'e3-e4') and
      `jumpToEraSettled`; under `descent=0` (no relocation flight) the E3→E4 arrival seems never to call it. Earlier
      from-era walks (14 Oct) passed, so check whether G4 (one guided version) changed the e3→e4 arrival. Fix so the
      session begins on EVERY arrival path (flight, no flight, reduced motion, jump).
    - The playtester's own symptom (the laptop's END face right after arriving, "update to era 5" filed with 2 of 9
      beats) still needs reproducing from the human route; S254's fix may cover it.
