STATUS: live

# The two research prompts of 31 Oct 2026

*Both were sent to background agents in the build session on 31 Oct, after his notes on the headset session and the
exhibition survey. Kept here verbatim so he can read them, rerun them, or give them to another model.*

## 1. Caleb, the missing years, dollhouses and virtual pets

PROMPT STATUS: SHIPPED. Sent 31 Oct to a Sonnet 5.5 agent. Output: `RESEARCH_CALEB_AND_TIME_2026-10-31.md`
(running at the time of writing).

```
You are doing research for "YOUR UPDATE HAS FAILED". It is an interactive narrative piece (browser plus VR) about how
conversion-practice (SOGICE) networks target queer people online. The piece follows Daniel through 1997 and 2003,
then two other people through 2016 and 2026, in one house that ages over thirty years. The project lead (Sérgio, a
researcher, dyslexic, non-coder) wants storytelling IDEAS, grounded in sources, for two gaps:

GAP 1 — Daniel and Caleb. Exhibition visitors found their relationship unclear.
- Caleb appears in 1997 only as one line on the placement letter: "ROOM SHARED WITH .... Caleb".
- The 14 days at "New Morning" (a residential programme abroad) are never shown.
- In 2003 they meet again by chance at a testimony video shoot: "…Caleb?"
- Then come a message from Caleb, a chat thread, an "intervention" by the accountability system, and Daniel leaving
  the programme.
- A survey visitor wrote: "The abandonment of the therapy happened rather suddenly before I could be fully experienced
  the trauma of the forced therapy."

GAP 2 — the passage of time between eras, especially 1997 to 2003 (the same room, six years later). The lead's idea is
a "dollhouse": a miniature model of the house shown at each era change. It could carry the missing elements of the
passing years, in VR and in the browser.

Also research one specific cultural reference he raised. In 2003, the programme ("Restorify") has a daily check-in
"streak", with the mascot Lamby as the guide. He wants to rework the personalisation of Lamby as a virtual-pet /
Tamagotchi-style care object. You care for the pet daily; it gets sad if you skip; it has buttons. Find the cultural
and design history:
- virtual pets 1996–2004 (feed / play / discipline buttons, guilt, death);
- streak and habit-tracking design;
- critiques of "care" as compliance.

READ FIRST (in /Users/sergiogalvaoroxo/update-available-reinterp):
- CLAUDE.md
- docs/ETHICS_CONSTRAINTS.md
- docs/REINTERP_E2_CALEB_SCRIPT_DRAFT_2026-07-24.md
- docs/REINTERP_LOVE_AS_LIBERATION_SOURCES_2026-07-24.md
- data/dialog/s2_caleb.json (its _doc)
- data/dialog/s1_end.json (the placement letter)
- docs/reinterp/RESTRUCTURE_1997_2003_2026-10-31.md (the current proposal)
- docs/reinterp/SOURCES_TESTIMONY_2026-10-01.md (how sources are recorded)

RESEARCH (web search; cite a URL for every claim; prefer scholarly, journalistic, archival or museum sources):
1. Documented features of ex-gay residential and youth programmes, late 1990s to early 2000s:
   - rules (no contact between participants, "no music", "false images", journals confiscated);
   - room-sharing and how friendships or attachments between participants were treated;
   - aftercare, follow-up and "accountability partners".
   Use only documented patterns, never a real participant's testimony verbatim.
2. Queer youth culture and the visual and interface culture of 1997–2003 that two young men could plausibly share
   and carry across six years:
   - mixtapes and burned CDs;
   - letters and postcards;
   - disposable cameras;
   - ICQ, AIM and MSN screen names and away messages;
   - LiveJournal;
   - keychain virtual pets;
   - pagers and SMS on early phones;
   - yearbook-style "signing".
   For each, how it could appear as an OBJECT or INTERFACE in the room or on the screens.
3. Precedents for showing passing time with a diorama or dollhouse or miniature in games, interactive narrative and
   installation art. Examples: Gone Home; What Remains of Edith Finch; Unpacking; Florence; "Before Your Eyes";
   museum period rooms; Do Ho Suh's houses; Laurie Simmons' dollhouses. What each does and what the piece could
   borrow.
4. Virtual pets and streaks, as above.

THEN PROPOSE (clearly marked as proposals, not facts):
- 6–10 concrete storytelling elements that make the Daniel–Caleb relationship legible across 1997 → New Morning →
  2003. Each is an object, a screen or a short beat. Say for each:
  - which era;
  - which register (operable / felt / respite: felt and respite scenes have NO mascot, NO satire, NO mechanics);
  - which source grounds it.
- How the dollhouse could carry the missing years: what changes in the miniature, what text if any (in the system's
  voice), and how it works in VR and in the browser.
- A design for the Lamby virtual-pet streak in 2003: what you press, what it shows, how it collapses (satire lives
  only inside the perpetrator's self-presentation and must collapse).

LAWS (never break):
- Invented brand names only (Restorify, TriedPath, New Morning, Lamby…). No real people, likenesses or logos inside
  the piece. Real games, artists and products can be named in the research doc as references only.
- No verbatim survivor testimony. Never invent a deadname. Speak about the system, not for people.
- Never satirise the people harmed. Queer joy ("respite") is never a trap and never revealed as fake.
- Anything you cannot source: mark [VERIFY SOURCE].
- Do NOT edit any file except your report. No downloads, no sign-ups.

Write the report to
/Users/sergiogalvaoroxo/update-available-reinterp/docs/reinterp/RESEARCH_CALEB_AND_TIME_2026-10-31.md. The very first
line must be exactly: STATUS: live
Write it in plain, short sentences (he is dyslexic).
Sections: 1 Summary (10 lines); 2 Documented: the programmes; 3 Documented: the culture and objects 1997–2003;
4 Precedents for time and dioramas; 5 Virtual pets and streaks; 6 Proposals: Daniel and Caleb; 7 Proposals: the
dollhouse; 8 Proposal: the Lamby pet streak; 9 Sources (every URL, one line each, with what it supports).
When finished, reply with a short summary of the strongest 5 ideas.
```

## 2. Jev, for the walks and the project

PROMPT STATUS: SHIPPED. Sent 31 Oct to a Haiku 5.5 agent, on his offer. Output: `RESEARCH_JEV_2026-10-31.md` (done).

```
Research TypeSafe AI's "Jev" model (a "System One model") and write a short, plain-English report for a non-coder
project lead with dyslexia (short sentences, short paragraphs).

Sources to start from (read them fully, then search the web for more: docs, SDK READMEs, examples, posts, GitHub):
- https://typesafe.ai/blog/introducing-system-one-models-and-jev
- https://openrouter.ai/docs/guides/community/jev
- OpenRouter's model page for typesafe/jev (find it), and TypeSafe's own docs.

Find out, with the URL for each fact:
1. Exactly what Jev does: its question types (Choice, Score, Box, and "Noul" or whatever the fourth is), the request
   and response shape (a small example of each), image input, the limits (context, the ~32 KB long-context mode,
   choice count), speed, and the price on OpenRouter.
2. Whether people use it for browser or game automation, UI testing, or screenshot judging.

Then judge each of these fits for a project. The project is an interactive narrative piece (a PlayCanvas
WebXR/browser experience). It already has an automated "walker" (tools/walk.mjs, Puppeteer). The walker plays the
whole piece by pressing labelled hit-rectangles on canvas screens, and logs a map of the interactions. For each fit,
say whether it would work, how, what it would cost per walk in tokens/dollars roughly, and its risks:
   a. Jev as the walker's DECISION POLICY: at each step, given the list of labelled pressable targets plus a short
      state description (and optionally a screenshot), choose the next press, as an alternative to "always press
      option one".
   b. Jev as a VISUAL CHECKER on screenshots ("visual walking"): Box to locate a named button; Score for "is this text
      readable / overflowing its window"; Choice for "which era is this screenshot".
   c. Jev as a NARRATIVE EXPLORER: enumerate and rank branches ("which unvisited choice is most likely to reveal new
      content").
   d. Jev as a project NAVIGATOR: route a plain-language question to the right file from a list of document titles.
Be honest about what it cannot do (no prose, no code, no reasoning traces). Compare briefly with simply using a Claude
model (e.g. Haiku) for the same jobs.

RULES:
- Do NOT sign up for anything, do NOT use or ask for any API key, do NOT download or install anything, do NOT run
  network calls other than web search and fetching pages.
- Do NOT edit any file except the one report below.
- Quote at most one short phrase per source; summarise otherwise.

Write the report to /Users/sergiogalvaoroxo/update-available-reinterp/docs/reinterp/RESEARCH_JEV_2026-10-31.md. The
very first line must be exactly: STATUS: live
Sections: 1 What Jev is (with sources); 2 How to call it (with tiny examples); 3 The four fits a–d (verdict, how,
cost, risks); 4 Recommendation (what to try first, smallest experiment); 5 Sources (every URL used).
When finished, reply with a 5-line summary.
```
