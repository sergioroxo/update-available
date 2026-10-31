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

## 3. The dollhouse, creative possibilities (Sonnet)

PROMPT STATUS: SHIPPED. Sent 31 Oct to a Sonnet 5.5 agent. Output: `DOLLHOUSE_IDEAS_SONNET_2026-10-31.md`.

```
You are a creative designer for "YOUR UPDATE HAS FAILED". It is an interactive narrative piece about how conversion-practice (SOGICE) networks target queer people online. It is set in one house that ages across 1997, 2003, 2016 and 2026, with three rooms:
- Daniel's room: 1997 and 2003, the gay story;
- Vera's room: 2016, the lesbian story;
- Maya's room: 2026, the trans story.

It runs as a browser 3D room (desktop and phone) and in VR (Quest 3, seated). The project lead, Sérgio (a researcher, dyslexic: plain short sentences), asked for CREATIVE POSSIBILITIES for "the dollhouse".

WHAT THE DOLLHOUSE IS NOW: in VR, at a change of room (2003→2016, 2016→2026), the room pixel-dissolves into a small model of the house, held about 45 cm in front of the visitor for about 4 seconds. It is built from the room's own meshes, scaled down. Then the visitor is in the new room. The browser has no dollhouse: it flies the camera between rooms.

HIS RULINGS (never break):
- "We should not expect people to look around at any part, we need to take the viewer there." No beat may depend on looking somewhere.
- He rejected a "New Morning annex" (a model of the conversion programme's building): "too explanatory… recreating SOGICE spaces which I don't think is needed". So: NO programme spaces, no camps, no clinics, no ministries in miniature. The house only.
- He wants the dollhouse to "expand on the narrative… for the missing elements of the transition of time", and it "can also exist in the browser version".
- VR comfort: no smooth camera travel in VR, no locomotion; the world comes to the visitor. Blink cuts and pixel dissolves only.
- Laws: invented marks only; no real people; felt and respite scenes have no mascot, no satire and no mechanics; the frame never plays (no scores or achievements in the piece's own voice); no timers; Quest budget of at most 75 draw calls.

READ FIRST, in /Users/sergiogalvaoroxo/update-available-reinterp (skim; do not edit):
- CLAUDE.md
- docs/reinterp/VR_AS_A_LAYER_2026-10-31.md (§5 the flights, VR-06)
- docs/reinterp/DESIGN_MISSING_YEARS_2026-10-31.md (his rulings, §5 dollhouse, §0)
- docs/reinterp/RESEARCH_CALEB_AND_TIME_2026-10-31_CLAUDE.md (§4 precedents for time and dioramas, §7 dollhouse proposals)
- docs/reinterp/RESEARCH_CALEB_AND_TIME_2026-10-31.md (GPT's version, §7)
- src/frame/xrLayer.ts (search "dollhouse"), to see how it is built now
- in src/engine/app.ts, search "relocation" and "relocPlan" to see the browser flight between rooms

THEN THINK BOLDLY, BUT BUILDABLY. Write 8–12 distinct ideas. For each:
1. Its name and a one-line pitch.
2. What the visitor sees and does, in VR and in the browser (desktop and phone), described separately. Remember the browser can fly the camera; VR cannot.
3. What narrative work it does: which missing time it carries (1997→2003, 2003→2016, 2016→2026, or the whole 30 years at the Close), and what it says about the house, the people, or the system.
4. Register (operable / felt / respite) and why.
5. Cost: small, medium or large; any new assets; the draw-call risk on Quest.
6. Risks against his rulings.

Include ideas from different directions. For example:
- time-lapse in the miniature: objects appearing and leaving, calendars, light through a day or a year;
- the three rooms lit one at a time;
- the dollhouse as the Close's overview;
- a hand-held object the visitor turns;
- the house "updating" like software;
- traces of each person's belongings carried between rooms;
- seasons, wallpapers, the same window seen across thirty years;
- the dollhouse as something the SYSTEM shows (its map of the household) versus something the PEOPLE own.

Then:
- rank your top 3 with reasons;
- give a "smallest first build" for the top one.

Write to /Users/sergiogalvaoroxo/update-available-reinterp/docs/reinterp/DOLLHOUSE_IDEAS_SONNET_2026-10-31.md. The very first line must be exactly: STATUS: live
Plain, short sentences. Edit no other file. When done, reply with your top 3 in 6 lines.
```

## 4. The dollhouse, creative possibilities (Haiku)

PROMPT STATUS: SHIPPED. Sent 31 Oct to a Haiku 5.5 agent. Output: `DOLLHOUSE_IDEAS_HAIKU_2026-10-31.md`.

```
You are a creative designer for "YOUR UPDATE HAS FAILED". It is an interactive narrative piece about how conversion-practice (SOGICE) networks target queer people online. It is set in one house that ages across 1997, 2003, 2016 and 2026, with three rooms:
- Daniel's room: 1997 and 2003, the gay story;
- Vera's room: 2016, the lesbian story;
- Maya's room: 2026, the trans story.

It runs as a browser 3D room and in VR (Quest 3, seated). The project lead, Sérgio (dyslexic: plain short sentences), wants CREATIVE POSSIBILITIES for "the dollhouse".

NOW: in VR, at a change of room, the room dissolves into a small model of the house, held 45 cm in front of you for about 4 seconds. Then you are in the new room. The browser has no dollhouse; it flies the camera between rooms.

HIS RULES:
- No beat may depend on the visitor choosing to look somewhere; the piece takes them there.
- NO model of a conversion programme's building, camp or clinic ("recreating SOGICE spaces… not needed"). The house only.
- He wants the dollhouse to "expand on the narrative… for the missing elements of the transition of time", in the browser AND in VR.
- In VR: no smooth camera travel, no walking. The world comes to the visitor.
- No real people. Invented brand names only. No scores or achievements. No timers. Felt scenes have no mascot and no mechanics.

READ (skim, do not edit), in /Users/sergiogalvaoroxo/update-available-reinterp:
- CLAUDE.md
- docs/reinterp/DESIGN_MISSING_YEARS_2026-10-31.md (§0 and §5)
- docs/reinterp/VR_AS_A_LAYER_2026-10-31.md (§5)

Write 8 fresh, surprising, concrete ideas. Be playful and unexpected; quantity and variety matter. For each:
- its name;
- what you see and do in VR;
- what you see and do in the browser;
- what missing time it tells;
- one risk.

Then pick your favourite 2 and say why.

Write to /Users/sergiogalvaoroxo/update-available-reinterp/docs/reinterp/DOLLHOUSE_IDEAS_HAIKU_2026-10-31.md. The very first line must be exactly: STATUS: live
Short sentences. Edit no other file. When done, reply with your favourite 2 in 4 lines.
```

## 5. Heartfelt stories for Vera and Maya

PROMPT STATUS: SHIPPED. Sent 31 Oct to a Sonnet 5.5 agent. Output: `STORIES_VERA_MAYA_2026-10-31.md`.

```
You are a narrative designer and writer for "YOUR UPDATE HAS FAILED". It is an interactive narrative piece about how conversion-practice (SOGICE) networks target queer people online. It is set in one house across four eras:
- Daniel (gay): 1997 and 2003;
- Vera (lesbian): 2016;
- Maya (trans): 2026.

The project lead, Sérgio (a researcher, dyslexic: plain short sentences), feels Vera's and Maya's stories "might be lacking a bit by comparison, of the emotional connection to creative background storylines". Daniel's story now has a person he loves (Caleb), traces of their past, and objects that carry six missing years. He wants heartfelt background stories for Vera and Maya that give the visitor the same emotional connection.

READ FIRST, in /Users/sergiogalvaoroxo/update-available-reinterp (do not edit anything but your report):
- CLAUDE.md, especially the tone and register laws and "THE WRITING IS CLAUDE'S" with its care clause.
- docs/ETHICS_CONSTRAINTS.md
- The Daniel model to learn from:
  - docs/reinterp/DESIGN_MISSING_YEARS_2026-10-31.md (the 1997 folder, the traces, Caleb, the pocket pet);
  - data/dialog/s2_caleb.json (the felt thread and its _doc).
- Vera, 2016:
  - data/dialog/s3_group.json, s3_family.json, s3_maiden.json, s3_queue.json, s3_podcast.json, s3_comments.json, s3_recommend.json, s3_flagged.json, s3_course.json;
  - data/provotypes/e3_theday.json (read its _doc and the dossier cards, including the "WHAT COULD NOT BE SOURCED" card);
  - search docs/reinterp for "Vera" (grep -l) and skim the most relevant 2–3 docs.
- Maya, 2026:
  - data/dialog/s4_l.json, s4_browser.json, s4_space.json, s4_ball.json, s4_offers.json, s4_update.json, s4_boot.json;
  - data/provotypes/e4_ball.json, e4_offers.json;
  - search docs/reinterp for "Maya" and skim the most relevant 2–3 docs.
- Memory notes in the docs: 2026 is NOT gentle. It is a time of worsening violence and open anti-trans campaigns: be direct, never "cosy persuasion". Never satirise the gender-exploratory clinical debate; if it appears, both captions are rendered, unresolved.

FIRST write "What exists now": for each of Vera and Maya, who they are in the build, what the visitor does with them, which people they have (friends, family, a love), what objects carry their life, and where the felt beats are. Be exact and cite the file.

THEN identify the gap: what makes Daniel–Caleb land, and what Vera and Maya lack. Examples: a specific person they love or are loved by; a shared object across time; a past the visitor can find; a moment of respite (genuine queer joy, never a trap, never revealed as fake).

THEN PROPOSE, for each of Vera and Maya, 5–7 heartfelt background storylines or elements. For each:
- the pitch, in 1–2 lines;
- who is involved (invented people only: a girlfriend, a best friend, a sibling, a chosen family, an online friend, a teacher who was kind…);
- what the visitor actually meets: an object in the room, a file, a message, a song, a photo, a beat; and where, so that it can be FOUND, but the story never DEPENDS on looking;
- the register (felt / respite / operable) and why;
- how it connects to the house's other lives, if it does (e.g. a trace of Daniel's in Vera's room, or Vera's in Maya's), without making them all one story;
- the documented pattern it rests on, with a URL if you can find one by web search (mark [VERIFY SOURCE] if not);
- the risks (speaking FOR people rather than about the system; borrowed testimony; a deadname — NEVER invent one; trauma as spectacle).

Also draft 2–3 short sample texts for each person (a message, a note, a caption), so he can feel the voice. Keep them bare and ordinary, not poetic-explanatory. No verbatim survivor testimony. No real people.

Finally:
- your top 3 per person, ranked;
- one cross-house idea that links the three lives gently (for example, an object passed down, a song, a mark on the window frame);
- the decisions he needs to make.

Write to /Users/sergiogalvaoroxo/update-available-reinterp/docs/reinterp/STORIES_VERA_MAYA_2026-10-31.md. The very first line must be exactly: STATUS: live
Plain, short sentences. Edit no other file. When done, reply with the top 3 for each person in 8 lines.
```

## 6. The ad-campaign pages (Truth in Love, 1999)

PROMPT STATUS: SHIPPED. Sent 31 Oct to a Sonnet 5.5 agent. Output: `SOURCES_AD_CAMPAIGNS_2026-10-31.md`.

```
You are researching period sources for "YOUR UPDATE HAS FAILED". It is an interactive narrative piece about how conversion-practice (SOGICE) networks targeted queer people, set in 1997, 2003, 2016 and 2026. The project lead (Sérgio, a researcher, dyslexic) found these archived pages. Read them and write a sources record. Write in plain, short sentences.

PAGES (web.archive.org captures; WebFetch cannot reach web.archive.org, so read them with Bash `curl -sL --max-time 30 <url>` and strip the HTML yourself, for example by piping to python3 or sed):
1. https://web.archive.org/web/20011204191826/http://www.cwfa.org/library/family/truthinlove/ (the "Truth in Love" television ads page, 1999)
2. https://web.archive.org/web/20011126031813/http://www.cwfa.org/library/family/truthinlove/mom.shtml (a script page with images for the "mom" ad)
3. https://web.archive.org/web/20080516071642/http://geocities.com/exgaylinks/links.html (an ex-gay links directory on GeoCities)
4. https://web.archive.org/web/20011127053432/http://www.religioustolerance.org/hom_ads.htm (a 2001 page about the ad campaigns)
Also follow at most 5 more links ON THOSE PAGES, if they are other script pages of the same ad campaign or an index of the ads. Only HTML pages.

STRICT RULES:
- Do NOT download images, audio, video or RealMedia (.rm, .ram) files. Do not save any fetched file to disk except your report. Read HTML into the terminal only. For images and media, record the URL and the alt text or caption only.
- No sign-ups, no API keys, no installs.
- Copyright: quote at most one short phrase (under 15 words) per source. Summarise everything else in your own words. Never reproduce a whole script. Describe the script's STRUCTURE instead: shots, order, what the image shows, where the words fall, the call to action, the phone number position. Do not write out the phone number.
- No real people's names beyond public organisations and the campaign's own title. Do not name private individuals who appear in the ads.
- Mark anything uncertain [VERIFY SOURCE].
- Do NOT edit any file except your report.

ALSO READ, for cross-reference (local notes he collected; do not edit them):
- /Users/sergiogalvaoroxo/Pc_Simulation/Terra_Search/SOGICE_visual_culture.md
- /Users/sergiogalvaoroxo/Pc_Simulation/Terra_Search/SOGICE_reference_starter.md
- /Users/sergiogalvaoroxo/update-available-reinterp/data/dialog/s2_testimony.json, especially its "cut" block and _docMerge. The piece's 2003 "Story Editor" cuts Daniel's testimony into an infomercial by chapters BEFORE / THE PROGRAM / AFTER / CALL NOW. The project already cites Truth in Love's TV spots of 1999 as its precedent.
- /Users/sergiogalvaoroxo/update-available-reinterp/docs/reinterp/SOURCES_TESTIMONY_2026-10-01.md, to see how sources are recorded there.

Write the report to /Users/sergiogalvaoroxo/update-available-reinterp/docs/reinterp/SOURCES_AD_CAMPAIGNS_2026-10-31.md. The very first line must be exactly: STATUS: live

Sections:
1. Summary (8 lines).
2. Each page: the exact URL (verbatim), the capture date (from the URL timestamp), the publisher as shown, what is on it, its structure and look (layout, colours if described, image placement), and what it proves (documentary) versus only claims.
3. The "mom" script page in detail. Shot by shot: what each image shows in general terms, what text sits with it, the order, how it ends (contact / call to action), and the running time if stated.
4. What this means for the piece's 2003 Story Editor. Concretely: does the editor's chapter structure (BEFORE / THE PROGRAM / AFTER / CALL NOW) match this script's shape? What could the editor borrow (a storyboard view with images and lines, a "script" panel, the mother's point of view), without copying a real ad or a real person? Use invented marks only.
5. What this means for the academic article. The argument: SOGICE as a visual and interface culture that redesigns coercion as care. 3–5 findings, each with its source URL.
6. Cross-reference with the Terra_Search notes: which of their leads these pages confirm, and which they leave open.
7. The RealMedia files. List each .rm/.ram URL you find with its size if shown. State that they were NOT downloaded, pending his permission.
8. Sources: every URL, one line each.

When finished, reply with a 6-line summary.
```

## 7. Checking his archived links and taking screenshots

PROMPT STATUS: SHIPPED. Sent 31 Oct to a Sonnet 5.5 agent. Output: `REFERENCE_LINKS_CHECKED_2026-10-31.md`.

```
You are checking research links and taking reference screenshots for "YOUR UPDATE HAS FAILED". It is an interactive narrative piece about how conversion-practice (SOGICE) networks targeted queer people, with eras set in 1997, 2003, 2016 and 2026. The project lead, Sérgio, is writing an academic article on SOGICE as a visual and interface culture. He needs the ORIGINAL reference links (exact URLs, capture dates) and screenshots, to judge which pages make sense as references. He is dyslexic: plain, short sentences.

WORKING DIRECTORY: /Users/sergiogalvaoroxo/update-available-reinterp. Do not edit anything in src/, data/, public/ or tools/. A walk test may be running on localhost:3000: do not touch that port.

INPUTS:
1. Every link in /Users/sergiogalvaoroxo/Pc_Simulation/Terra_Search/SOGICE_archived_links.md (38 links). Read the file; do not edit it.
2. These three mirror pages:
   https://www.thefrugalgamer.net/archived/ReligiousTolerance/hom_ads.htm
   https://www.thefrugalgamer.net/archived/ReligiousTolerance/hom_ads1.htm
   https://www.thefrugalgamer.net/archived/ReligiousTolerance/hom_ads2.htm
3. His earlier finds (already recorded elsewhere, screenshot them too):
   https://web.archive.org/web/20010605015624/http://www.exodusnorthamerica.org/resources/
   https://web.archive.org/web/20080516071642/http://geocities.com/exgaylinks/links.html
   https://web.archive.org/web/20011204191826/http://www.cwfa.org/library/family/truthinlove/
   https://web.archive.org/web/20011126031813/http://www.cwfa.org/library/family/truthinlove/mom.shtml
4. FIND period website captures for the piece's 1997 and 2003 eras. Use the Wayback CDX API with curl, for example:
   curl -s "https://web.archive.org/cdx/search/cdx?url=exodusnorthamerica.org&from=1996&to=1998&output=json&limit=5&filter=statuscode:200"
   Try these domains:
   - exodus-international.org, exodusintl.org, exodusnorthamerica.org
   - loveinaction.org, newdirection.ca, evergreeninternational.org
   - pfox.org, narth.com
   - regenerationministries.org, ha-us.org or homosexuals-anonymous.org
   - exodus.to, outpostministries.org
   For each domain, find the capture closest to 1997 and the one closest to 2003 (homepage). Record them as
   https://web.archive.org/web/<timestamp>/<original url>.

SCREENSHOTS:
- Write a Node script in /Users/sergiogalvaoroxo/update-available-reinterp/out/probes/refshots.mjs. Use puppeteer-core with executablePath '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless, viewport 1280x900.
- Run it from the project directory so node_modules resolves.
- For each HTML page: go to it (timeout 60 s), wait 3 s, and take a screenshot clipped to the first 2400 px of the page height.
- Save screenshots to /Users/sergiogalvaoroxo/update-available-reinterp/output/reference-shots-2026-10-31/<nn>_<short-name>.png. The output/ folder is never committed.
- For PDFs, take no screenshot. Do a HEAD check only (curl -sI) and record status, content-type and size.
- Record failures (404, a capture without content, timeouts) honestly.
- Do NOT download media files (audio, video, .rm). Do not log in or accept anything beyond what a page shows by default. If a cookie banner appears, do not click it; just screenshot.
- Look at a sample of your screenshots (the Read tool can view PNGs) to judge them. Do not invent what a page shows.

WRITE THE REPORT to /Users/sergiogalvaoroxo/update-available-reinterp/docs/reinterp/REFERENCE_LINKS_CHECKED_2026-10-31.md. The very first line must be exactly: STATUS: live

Sections:
1. Summary (10 lines): how many links work, how many fail, and the 10 best references for the article.
2. A table of every link checked:
   number | exact URL | type (period capture / archive collection / contemporary article / later research / PDF) | date of the material, if known | works? | screenshot file | what it shows (one line) | use: article / piece's look / context only / drop.
3. The 1997 and 2003 ministry website captures you found:
   - each with the exact Wayback URL and timestamp;
   - what the page looks like (layout, colours, navigation, images, any web-ring badge, counter, "best viewed in" line);
   - how it could inform the piece's 1997 and 2003 screens, using invented marks only.
4. Visual-culture notes for the article: 5–8 observations, each tied to a screenshot and its URL. For example: the catalogue layout, the left navigation of categories, the group photo as proof, the end card with a phone number, web rings.
5. Caveats: what is later research and not a period artifact; dates to verify; [VERIFY SOURCE] marks.

RULES: no real private individuals named (public organisations are fine); no long quotes (at most one short phrase per source); invented marks only for anything proposed for the piece.

When finished, reply with an 8-line summary, including the paths of the 5 most useful screenshots.
```
