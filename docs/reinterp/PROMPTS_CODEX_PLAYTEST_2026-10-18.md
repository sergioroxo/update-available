STATUS: live

# Codex prompts after the 18 Oct playtests — CX1 (blockers + the end) and CX2 (guidance polish)
*Run CX1 first; run CX2 only after Claude has reviewed and merged CX1 (they touch the same files). Each in its own Codex
chat, with the PREAMBLE from docs/reinterp/PROMPTS_CODEX_2026-10-11.md pasted first (own worktree + branch, own port,
commit, never merge). Brief: docs/reinterp/PLAYTEST_NOTES_2026-10-18.md (items 1–32) and the two playtest folders.*

## CX1 · Blockers, 2026, and the end back to the retro look (port 3214)
```
TASK = playtest-blockers. Read CLAUDE.md, docs/reinterp/PLAYTEST_NOTES_2026-10-18.md (all 32 items), and the playtests
in /Users/sergiogalvaoroxo/Pc_Simulation/GPTPlaysIT/browser-playtest-2026-10-18/ and
.../browser-playtest-continuation-2026-10-18/ (review.md + screenshots). Fix ONLY these, in this order, each verified by
a short headless puppeteer probe that follows the VISITOR's path on your port (save the probes in tools/, results in
out/playtest-blockers/):
1. 2026 must always begin and reach the Close (items 24, 32): (a) re-test the playtester's route — Start → Jump to 2003,
   then play on normally into 2026 — the session must begin (screensaver → restore → L) and never open on its end face;
   S254 already gives a fresh 2026 shell after every jump: confirm or finish that fix; (b) `os.e4.beginSession()` must be
   called on EVERY arrival path into 2026 (the flight's endRelocation, no flight under descent=0, reduced motion, the
   Start-menu jump) — today the no-flight path leaves the browser dormant forever
   (`node tools/walk.mjs --from-era 2 --require-close` stalls there); (c) "Your file" must not show entries from eras the
   visitor has not reached (playtest 2, finding 3).
2. 2003 "A message from outside" must never leave the camera in a VOID (item 1): reproduce, find what moves the camera
   there, and keep the visitor in the room.
3. Every window's close box works: mIRC (IRC), Netpoint, and any other window the playtests could not close (item 2).
4. Caleb's chat (playtest 2, finding 1): one alert at a time, and after an alert is dismissed the conversation is readable
   again (not left redacted).
5. The END goes back to the RETRO OS look with the old Lexicon (item 31): on Daniel's monitor, replace the Library (the
   Bob-art "LambyOS Home — Library" from commits 186faf4 / f5ae2bc) with the Close's earlier retro ending — the Restart
   card in the era's OS style: Go back to a room, Start again, the receipt, the Lexicon (The Words, The Reasons, Your
   Words, plus the Sources tab added since). Find the pre-Library version with `git log -- src/room/closeMonitor.ts` and
   bring back its look and behaviour, keeping the later fixes (Sources paging, the mixer, full screen, the walker's end
   condition at the Close). Keep the Library code and art in the repo, unused. Move "About this project" here, inside
   the era-1 dossier view at the end, and fix its text overflow (item 25 and 10-dossier-overflow.png). It must not
   appear anywhere in the setup (item 5).
6. The debug panel's era/beat jumps work again (item 4).
Rules: change no display text except where a fix needs it (list every string BEFORE/AFTER); no storage; era palettes;
keep Lamby, the Start menu map and the guided version as they are. Finish with one full walk
(`node tools/walk.mjs --port 3214 --max 2600 --require-close`, under `caffeinate -i`) AND
`node tools/walk.mjs --port 3214 --max 2000 --from-era 2 --require-close`; both must reach the Close. Report with
screenshots of each fix.
```

## CX2 · Guidance and polish (port 3215) — after CX1 is merged
```
TASK = playtest-polish. Read CLAUDE.md (R28 §2: Lamby the guide), docs/reinterp/PLAYTEST_NOTES_2026-10-18.md and the
two playtest folders. Do these, each checked by a short headless probe on the visitor's path (out/playtest-polish/):
0. FIRST — ONE WAY OF SAYING WHAT TO DO (his note, 2026-10-19: "we have repetitive ways of explaining what to do").
   Audit every channel that tells the visitor what to do next — Lamby's guide balloons (src/narrative/lambyGuide.ts),
   the era start panels ("what you can do here", src/desktop/apps/startPanel.ts), the Start menu's map
   (startMenuMap.ts / src/witness/startModel.ts), the frame helper's corner hints (src/frame/helper.ts), Era 1's
   side-messages, the taskbar status line, the game menu's "Where you are", the call button (src/frame/call.ts), the
   Word of the Day — and list, per era, where the SAME instruction appears twice or more (a table in the report).
   Then apply this hierarchy (Claude's recommendation, pending his OK — implement it, he reviews):
   - LAMBY is the one voice that says what to do next (balloon + pointer + "take me there"), on stall and on its symbol.
   - The START MENU is the list (every step in order, ticks, the era jumps) — reference, silent.
   - REMOVE the era start panels (their content already lives in the Start menu), and remove "next step" wording from
     the frame helper, the taskbar line and the game menu's map (they keep only what is theirs: controls like "Esc
     opens the menu", the OS's own status, the frame's plain map). Keep the call button for its moments only, and
     never at the same time as a Lamby balloon. Era 1's impersonal side-messages stay only where Lamby has nothing to say.
   Never two instructions on screen at once; one voice at a time (CLAUDE.md R28 §2).
1. Lamby is ALWAYS available: its symbol always on screen in every era; shrink its balloon so it never covers the
   symbol (item 6). The setup teaches the symbol as the helper, beside the Start-menu lesson (item 7).
2. "What to do" stops being its own button: it lives in the Start menu (already the map) and on Lamby's symbol, and
   reopens every time (item 3) — consistent with step 0.
3. Camera: no automatic zoom unless the visitor zooms (item 8); in 2003 the system stops pulling the view back while the
   visitor looks around (item 28 — the desk lean-in/out from the "screen-and-cues" commit: make it gentle, and never
   fight a drag).
4. Timing and clarity, with Lamby's balloon or the frame's line (draft the words; list them BEFORE/AFTER for Claude's
   review; Lamby's voice is short and cheerful, never about felt content, never during felt or respite scenes):
   Rob's overlay a little slower (9); the IRC wait — tell the visitor to watch (10); Lamby offers to open the form (11);
   when the diary's message options come (12); the game and the songs as optional extras (13); "Remind me later" — you can
   come back via the X or the Start menu (14); "Are you struggling too? Start here" says what to do (15); explain or
   remove the "turn and look" flyover (16); 2003 "press on the screen to continue" plus the monitor's blue light
   pulsing (17).
5. 2003's room tone lower so Lamby's opening is clear (21); Your Story's six steps get a "faster" button (22).
6. 2016 fixes from playtest 2: Lamby's "Annette first" opens Annette (5); "no template matches" reworded beside the
   replies (6); the queue card's "done / four waiting" count fixed (7); the story page's BROADBAND option and "Start
   here" either work or are visibly disabled (8); before posting the group message, show that Renata's story is attached
   (4).
Do NOT change: the media release's preselected channels and single "I Agree" (that coercion is the point — playtest 2
finding 2 is his call, not yours); the order of 1997's beats (item 20 is his call); any dossier wording or `_s` line.
Finish with one full walk (`--max 2600 --require-close`) under `caffeinate -i`, and report every string BEFORE/AFTER.
```
