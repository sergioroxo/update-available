STATUS: live

# Codex prompts CX3a (bugs + visibility) and CX3b (his seven decisions) — 24 Oct 2026
*Brief: docs/reinterp/PLAYTEST_NOTES_2026-10-24.md (his notes + the Haiku checker; ALL seven decisions are YES),
docs/reinterp/MISSING_SONNET_2026-10-24.md (Sonnet's "what seems missing"), and
~/Pc_Simulation/GPTPlaysIT/haiku-check-2026-10-20/REPORT.md + MAP.md. Run CX3a first; CX3b after Claude has merged
CX3a. Each in a new Codex chat with the PREAMBLE from PROMPTS_CODEX_2026-10-11.md first (own worktree + branch, own
port, commit, never merge). Suggested: CX3a Luna 6 High; CX3b Luna 6 Extra High (more design and writing).*

## CX3a · Bugs and visibility (port 3216)
```
TASK = cx3a-bugs. Read CLAUDE.md, docs/reinterp/PLAYTEST_NOTES_2026-10-24.md, docs/reinterp/MISSING_SONNET_2026-10-24.md
and the checker's REPORT.md/MAP.md (~/Pc_Simulation/GPTPlaysIT/haiku-check-2026-10-20/). Fix each item, verified by a
short headless probe on the VISITOR's path (tools/, results in out/cx3a/), screenshots looked at:
1. THE ROOT CAUSE MUST BE FINDABLE (his ask: neither checker could find it). The 1997 "Did you know" tip promises
   ROOTCAUSE.EXE on the desktop and it is not there. Give the Root Cause app (src/desktop/apps/rootCause.ts,
   data/strings/rootcause.json) a visible 1997 desktop icon, a row in Start's list at its place in the order (and in
   Programs), and one Lamby hint when it becomes relevant; check its NetPilot "Understanding the Root" link opens it.
   Reword the cross-reference "in the dossier: the questionnaire — asked you to describe yourself, then filed the
   answers as a case" to "See also, in your dossier: the questionnaire you filled in" (same pattern wherever
   `dossierMark` is used).
2. Leave "Lamby Rig Lab" exactly as it is (his decision pending, 2026-10-24: it may become part of the experience —
   a separate build).
3. "Look with your device" only where device orientation exists (touch/mobile); never on a desktop without a gyro.
4. The 1997 profile setup: ONE step again, not three (his).
5. Setup: Lamby's balloons come one at a time, each waiting for the visitor (no pile-up before the advert).
6. Start always opens, even while a Lamby balloon is up (it closes the balloon). Clicking a step in Start's list
   closes the list; the story never stays paused behind it (2016 clock stuck at 9:48).
7. Start's list never runs ahead of the story: a step ("Accept the request", "Accept the picture") is listed as the
   NEXT step only once its thing is on screen; before that the list shows the step that is actually current.
8. Jump never marks unplayed eras as done (jumping to 2026 showed 1997/2003/2016 as 17/17, 12/12, 9/9); "Jump to the
   Close" from 1997 must work or not be offered.
9. 2016: the "This week on GracePlatform" popup must not swallow the click on a Today card; the "Your phone has a
   message" toast goes once the phone is picked up; the phone thread's "Type a message" box either offers its replies
   or is hidden; "An update notice will arrive on its own" — make the words match what happens (it came as a banner).
10. 2003: after "Go to the next task" the camera must never turn to an empty dark view (CX1 fixed one send; find this
    one) — always land in the room. The closure letter ("Then it was never me that was broken…"): give a clear, quiet
    way on after it (frame voice "Continue", no Lamby — felt scene); a click must never black the screen.
11. The blue light/tone that keeps flashing: stop after a set time or once the visitor declines.
12. 2026: the rug in Maya's room flashes (bands of light) — find and fix (z-fighting, the specks, or the Commons lamps).
13. 2026: the laptop's text runs off its edge in the default view — fit it.
14. 1997 diary: say plainly that the entry continues by itself (it is a felt scene: frame voice, no Lamby).
15. Controls help lists W A S D — remove (there is no walking); Junie's muted message gets its Unmute; Credits say the
    years and rooms people know ("2016", "Vera's room"), not internal names ("Era 3", "Room 1").
Rules: no new storage; era palettes; list every changed string BEFORE/AFTER. Do NOT change: the advert being
mandatory, the prayer having no skip, Rob's request having no Ignore, "Not today" on the pledge still filing — those are
the piece's coercion (his rulings); the NetPilot search box stays non-typing (CLAUDE.md: no free-text keyboard) but its
"Search" must offer the suggestions to press instead of only a tip. Finish with one full walk
(`node tools/walk.mjs --port 3216 --max 2600 --require-close`, `caffeinate -i`).
```

## CX3b · His seven decisions (port 3217) — after CX3a is merged
```
TASK = cx3b-decisions. Read CLAUDE.md (R28 §2: Lamby one guide, four skins), docs/reinterp/PLAYTEST_NOTES_2026-10-24.md
items 14–20 (ALL approved by him), and the CX3a merge. Build:
1. Free exploration after Rob asks for the form: the visitor may do other things; the story picks up when they file the
   form on the desktop; Lamby nudges (≤1 unsolicited balloon) after a while with "Want me to open the form?".
2. A tape player in 1997 reachable from Start's extras (and the boombox): all three tapes — the prayer, the broadcast
   jingle, the mixtape — with Play/Stop, captions as they already are (data/dialog/s1_tapes.json).
3. 2003's "Restorify — Today" back as Restorify's OWN Today screen (the programme's to-do list, ticks from the witness
   map), opened from Restorify and from Start — not a separate frame card; nothing else repeats it on screen at once.
4. 2026: the laptop is L's home — the helper's 2026 skin is L living on the laptop (its symbol and balloons there),
   not the Lamby symbol on the monitor. Lamby → Lambient → L: one helper changing skin. Keep L's voiced lines as they are.
5. Caleb's Messenger (2003, HopeRestored Messenger): ONE quiet line recalling that he and Daniel shared a room (find
   what the piece already establishes about them — the 1997 form, s2_caleb.json — and stay consistent; do not invent
   other backstory). Felt text: draft it, mark it `"_draft": "for his approval"`, list it first in the report.
6. The IRC window (1997 #stillstruggling) restyled closer to a period chat client: nick list, topic bar, status
   window, timestamps, monospace — invented names only, no real client's logo or name.
7. Lamby mentions once (≤1 balloon) that Esc → "Where you are" holds the whole map of the visit.
Rules as CX3a. Finish with one full walk under caffeinate; report every string BEFORE/AFTER.
```
