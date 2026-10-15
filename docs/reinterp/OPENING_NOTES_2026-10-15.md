STATUS: live

# After the opening — his notes (15 Oct 2026) and the plan
*Budgets: Claude's weekly 5% left; cloud $14. So: a cloud session (Claude, Sonnet 5.5 high) designs detailed Codex prompts
from this file; Codex builds; no full walks for now (they are slow and did not catch the 2003 block) — targeted checks
that follow the HUMAN path instead.*

## ⚑ His research finding from the opening (a ruling, 2026-10-15)
Visitors got lost and blocked. "We need to reinstate Lamby as the connection point of the correction and forcing you to
do stuff." Lamby becomes a Clippy-style guide FROM 1997 (pop-up balloon with Yes/No, hints when you stall, an offer to
take you to where to press; always ignorable, so a visitor can explore instead). This REVISES CLAUDE.md R28 §2 ("Era 1
has NO assistant character") — the revision is his; update that paragraph with this date and quote. What does not
change: never during `felt` scenes, never jokes at the victim, never delivers dossier text, dismissal always works.
(His reference image is Microsoft's Clippy: the pattern only — balloon, buttons, a pointer — drawn as Lamby; nothing
of Microsoft's is copied.)

## His notes, grouped
**G1 — Blockers (fix first)**
1. In 2003 everyone got blocked: after Caleb's video, Caleb's message never arrived. Also: "you close the What to do
   [panel] and it breaks, no Caleb appears." (Suspect the overnight F1 merge: it holds corner toasts while a clip plays,
   puts windows away for Caleb's moment, and puts the era's start panel down — and/or the A6 start panel's close.)
2. The screensavers keep taking the piece out of full screen.
3. Restart goes to `#home-armed` and leaves full screen (it reloads the page) — restart must keep full screen.
4. 1997: the mIRC window's close box (X) does not work, and it is the only way to reach the fellowship form.
5. 1997: "If you are struggling, start here" is not showing.

**G2 — Lamby the guide (from 1997), and the setup**
6. Lamby in every era from 1997 as the Clippy-style guide: what to do next; hints when you stall ("Have you checked the
   Start menu?"); an offer to take you there (a pointer/highlight on the thing to press, or doing the step for you);
   always ignorable. Use real tutorial practice (just-in-time hints, escalating help after inactivity, show-don't-tell,
   one step at a time).
7. Example: when Rob talks about the form, Lamby offers to open it directly ("Want me to open the form for you?"), not a
   hunt through a website.
8. The setup (LambyOS Setup with Lamblippy): add "Work in progress" (as Lamblippy's line, plus where to report problems);
   teach the Start menu there; REMOVE "About this project" from the setup (it belongs to the Credits / the Close).
9. The clock in the setup is good (keep).

**G3 — The Start menu as the map**
10. The Start menu (each era's OS) becomes the guide: every action you can do, in order, from the beginning (ticks for
    done), and a way to JUMP between all the experiences (the eras / chapters) for anyone.
11. The "what to do" panels (1997, 2003; check 2016 and 2026 have them) are always one press away, from the Start menu
    and a taskbar button. In 2003 it is "very good" — keep it, make it always accessible, with Lamby as the guide.

**G4 — Fewer clicks, more guided, one version**
12. People want to watch the action develop in front of them: a version with far fewer clicks, more guided and
    automatic (things play out; you press to go on).
13. The full and the Speedrun versions differ too much (the helpful panels did not appear in one). Combine them: ONE
    guided version (the Speedrun's pacing as the spine) with the full version's optional content reachable from the
    Start menu for whoever wants to explore. Turn the separate full version off (keep the code).
14. 1997's form: too many questions — cut to the essential few.

## The cloud prompt (paste into claude.ai/code, repo sergioroxo/update-available; Sonnet 5.5, effort high)
```
SETUP: git fetch origin reinterp && git checkout -B cloud/opening-prompts origin/reinterp
Read CLAUDE.md, docs/reinterp/OPENING_NOTES_2026-10-15.md (THE BRIEF), docs/reinterp/PROMPTS_CODEX_2026-10-11.md (the
PREAMBLE and how earlier Codex prompts were written), docs/reinterp/PLAN_ENTRANCE_RESTORE_SESSION_2026-10-13.md, and
the code each group touches (the setup src/desktop/setup/, the entrance src/room/restoreEntrance.ts, the eras' OS
src/desktop/os.ts and apps/, the start panels src/desktop/apps/startPanel.ts, the witness map src/witness/map.ts, the
guide src/narrative/guide.ts, Caleb src/desktop/apps/caleb.ts + data/dialog/s2_caleb.json, the testimony
src/desktop/apps/testimony.ts, the cut src/state/cut.ts, the idle cycle src/frame/attract.ts, the game menu's Restart
src/desktop/gameMenu.ts, 1997's IRC/forum/form apps). Do NOT change code. WRITE docs/reinterp/PROMPTS_CODEX_OPENING_2026-10-15.md
(STATUS: live) holding FOUR detailed Codex prompts, G1–G4, one per group in the brief, each self-contained and in the
style of the existing ones: the lead's words quoted; the exact files and functions to change (you have read them —
name them); the design rules that keep the piece's quality (era palettes, pixel discipline, Win95/XP chrome per era,
voices kept apart, felt scenes bare, no storage, words in data/strings); every new display string drafted in full
(Lamby's hint lines per era and per step — short, cheerful programme voice, never about the felt content — the Start
menu labels, the setup's WIP line); acceptance checks that follow the HUMAN path and are quick (headless puppeteer
probes on a dev server at a given port: e.g. play 2003 from ?era=2 closing the start panel and confirm Caleb's message
arrives; fullscreen kept through the screensavers and Restart) — NOT the full walk. For G1, first REPRODUCE the 2003
block on origin/reinterp (and name the cause) before writing the prompt. Order: G1 must be mergeable alone (blockers);
G2–G4 may build on G1. Say for each which other prompt it conflicts with, so the lead can run them in sequence or in
parallel. Also note the CLAUDE.md R28 §2 revision (his ruling) inside G2. Commit only that doc, open a PR "Opening
prompts — DO NOT MERGE (review)". Keep it efficient: credits are limited.
```
