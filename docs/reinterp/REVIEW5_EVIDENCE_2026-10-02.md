STATUS: live

# REVIEW 5 — EVIDENCE lens (the build against the research) — 2026-10-02

*Read-only review. Nothing was edited except this file. Method: every on-screen mechanic or claim that implies a historical practice (data/dialog, data/strings, data/provotypes, data/dossier) was checked against `sogice-social-media-layer.md` (its labels DOCUMENTED / REPORTED / SPECULATIVE and its "Gaps" list), the Dame-Griff note, `VERIFY_TESTIMONY_LINKS`, the `SOURCES_*` files, and the dossier cards' own `status`. Public words: documentary = "documented", contested = "disputed", speculative = "imagined". No dossier wording is proposed anywhere below (that is the project lead's). "Verified" = I read both sides in the repo; "inferred" = my reading of what a player would take away or of a source I could not open.*

*How the player meets a status: the Close panel (and Menu > Credits > the Close's panels) shows each room's whole-panel status, then each practice with its `[documented / disputed / imagined]` tag and ONE card text (`src/witness/dossier.ts`, `src/desktop/gameMenu.ts` closeSourcesView / yourFileView). Every card on every file is on the public sources page (`tools/gen_sources_page.mjs`). A practice's tag and pointer live in `data/dossier/practices.json`.*

---

## FINDINGS (most severe first)

### EVID-01 · The Purity Streak / Daily Realignment — gamified retention, shown as a documented practice
- **WHERE:** 2003 · Lamby's boot cartoon, the Restorify check-in, the Caleb alert, PureMail, pauses, the Close receipt, the calendar. `data/dialog/s2_lamby.json` lines 23-24 (`streakLabel`, `streakDays`), 53-55 (`streakValue` "412 days", `streakNote` "includes supervised period"), checkin responses ("Your streak is safe today"); `data/dialog/s2_caleb.json` 223-227, 279-286, 307 (412 → 0); `data/strings/pauses.json` 33 ("Everything in Restorify counts toward your streak"); `data/strings/close_restart.json` 49 (receipt: "your Daily Realignment, and a purity streak"); `src/room/calendarArt.ts` ~307-350. Practice: `data/dossier/practices.json` `checkin` (status documentary, source `e3_theday#1`); Close panel `data/strings/close_network.json` panels[1].text (line 116), whole-panel status documentary.
- **WHAT A PLAYER EXPERIENCES:** The most vivid 2003 mechanic is a counter that Daniel holds at 412 days and then loses on screen. In the Close and "Your file" the daily check-in reads "[documented]" and its attached source is a paragraph about what accountability programmes ask (Living Waters, accountability software). Nothing on any card, in any room, says the streak is the piece's invention.
- **WHY IT MATTERS:** The research states twice that streaks / points / gamified retention were NOT FOUND (2016 §3 "Streaks or points: nothing found"; 2026 §3; "Gaps I could not fill"; its recommendation: "If you depict these, label them speculative"). OPEN_ITEMS P7-41 recorded this as a pending flag and "a build-vs-research audit (proposed)". `e3_theday#14` says daily check-ins were not a standard form, but that is about 2016 phone groups and is not pointed at by any practice. No dossier card mentions "streak" anywhere (grep of `data/dossier`, `data/provotypes`: none). CLAUDE.md dossier law / ETHICS #13; the Close's own legend ("Imagined — the piece's own projection ... marked as such") is not applied here.
- **SEVERITY:** high. **CONFIDENCE:** verified.
- **SUGGESTED FIX:** Decide (his call) whether the streak and the Daily Realignment get an imagined-status card or practice of their own, and re-point `checkin` away from a card that does not cover it. Wording is his.

### EVID-02 · The file that migrates across systems is listed as documented in three practices, while the dossier's own card says it is not
- **WHERE:** 1997→2026 · every update. `data/dossier/practices.json` `update` (documentary → `e4_offers#1`), `arrival` (documentary → `e4_offers#1`), `record` (documentary → `e3_theday#6`); versus `data/provotypes/origin_intake_e1.json` source #5 (status speculative: "no case has been found of a programme's client file being carried across decades"). Surfaces: `data/strings/updates.json` u2/u3/u4 EULAs and changelogs ("Daniel's file: carried over, scanned", "Your record (1997, 2003, 2016) is carried forward without alteration"), `data/strings/institution.json`, the Close panel for 2016 and 2026.
- **WHAT A PLAYER EXPERIENCES:** The piece's central device (one file following one person from paper to scan to platform to retained legacy field) appears in the Close and "Your file" as "[documented]", with a source card about cross-border conferences (`e4_offers#1`) or about smartphone accountability software (`e3_theday#6`, which itself says it is "adjacent evidence ... not proof"). The card that says "this is the piece's device" (#5) is not pointed at by any practice, so it is only on the public sources page.
- **WHY IT MATTERS:** Direct contradiction inside the dossier, approved by him on 2026-09-27 ("approve the source line"); ETHICS #13 (status must match what the card shows); his own `origin_intake_e1#5` text. The piece's "who could know what" arc is documented step by step; the file travelling is not.
- **SEVERITY:** high. **CONFIDENCE:** verified.
- **SUGGESTED FIX:** Re-point or re-status `update`, `arrival` and `record` so the tag a player reads for the migration agrees with card #5; flag for him which of the three practices describe the device and which describe a documented act.

### EVID-03 · 1997's online fellowship channel and mentor DMs are tagged documented, on a card that is about parents' conference material
- **WHERE:** 1997 · IRC `#stillstruggling`, MentorRob's DMs, `yes.gif`, Un-Walk floppy. `data/dialog/s1_irc.json`, `data/dialog/s1_end.json` escalation turns, `data/dialog/s1_kit.json`; practices `channel`, `referral`, `media` (all documentary → `origin_intake_e1#1`, the Love Won Out parents' guide); Close panel 1 text `close_network.json` line 107 ("Anonymous boards and mailing lists were used by conversion practices in their move online ... offered to whoever searched"), panel status documentary.
- **WHAT A PLAYER EXPERIENCES:** A 1997 live chat with a mentor who messages a 16-year-old, tells him he spoke to his mother, and arranges a placement. In the dossier this is "[documented]" and the visible source is a card about teaching parents to intervene.
- **WHY IT MATTERS:** The research's 1997 verdict: evidence for an online layer is thin; "No source I found documents how individual users located online ex-gay content"; search discovery is SPECULATIVE; build advice "Keep out: any 'group' feature. Nothing documents one." Online forums with ministries start in the record at 1998 (self-description) and boards at 2001 (Weiss et al.). Dame-Griff 4.1 item 10: "do not present [a ministry mentor DMing a minor] as documented." His own 1997 finds (SOURCES_1997_WEB) are dated 1996 (a faculty referral page, an anonymous mailer) and 1999-2005 captures for the rest; "chat rooms" appear on the 2003 links page. What IS documented and supports the 1997 spine: referral directories and the mailer (1996), print ads and conferences. SOURCES_1997_WEB §3.4 proposes citing them on `referral`; not applied (pending his wording).
- **SEVERITY:** high. **CONFIDENCE:** verified (the gap and the pointer); inferred (how players read the panel).
- **SUGGESTED FIX:** Separate the documented referral/directory/mailer layer from the invented channel-and-mentor layer in the practice tags; point `referral` at the verified 1996-98 evidence once he approves it, and mark `channel` accordingly. His wording.

### EVID-04 · 2003's contact-monitoring chain is "documented features of accountability software of the period", but the card is dated 2015 and calls itself adjacent
- **WHERE:** 2003 · the Caleb thread, flag "HOMOSEXUAL CONDUCT", content blocked, streak reset, escalation to "Mark T." / mentor line / care server / regional office. `data/dialog/s2_caleb.json` alert and network blocks; practice `contact` (documentary → `e3_theday#6`); Close panel 2 text (line 116): "Daily self-reports, logging and the monitoring of contacts are documented features of accountability software of the period."
- **WHAT A PLAYER EXPERIENCES:** The software reads an incoming friend message, classifies it as conduct, blocks it, and escalates to the person's network. The Close says this is documented for 2003.
- **WHY IT MATTERS:** `e3_theday#6` says "By the middle of the period ... smartphones" and "ADJACENT evidence ... not proof that an ex-lesbian organisation used such a tool"; its verified links are a 2015 cheat sheet, a company history and a 2022 article. The research documents 2003 accountability as PEER requests on hosted boards (Weiss et al.), not automatic classification of messages. The Covenant Eyes company-history link may support an earlier desktop tool, but the card text does not say so and I could not open it. A message-by-message "conduct" classifier, a block, and a four-step escalation have no source in the repo.
- **SEVERITY:** high. **CONFIDENCE:** verified (card text and dating); inferred (what the company-history link supports).
- **SUGGESTED FIX:** Check the dating on the Covenant Eyes link and decide whether the panel's "of the period" and the practice's tag stay; the classifier/escalation chain needs a status of its own. Not mine to word.

### EVID-05 · "She is paid per correction" is asserted in the Close and in a practice line, with no source and no on-screen payment
- **WHERE:** 2016 · `data/strings/close_network.json` panels[2].text (line 125); `data/dossier/practices.json` `queue` ("paid you per correction to edit other people's accounts", documentary → `e3_theday#4`).
- **WHAT A PLAYER EXPERIENCES:** The Close and "Your file" state as a documented practice that the platform paid per correction. In play, no pay, rate or earnings appear anywhere (grep for pay/earn/per correction in data and apps: only these two lines).
- **WHY IT MATTERS:** Card #4 documents the euphemistic vocabulary (replace "lesbian"), not payment. Nothing in the research or the Dame-Griff note documents piece-rate editors for a ministry platform (Dame-Griff: AOL moderators were volunteers or paid by time online). The claim comes from an earlier draft (`ERA4_DRAFTS_2026-09-12.md` line 56) and was never sourced.
- **SEVERITY:** medium-high. **CONFIDENCE:** verified.
- **SUGGESTED FIX:** Flag for him: either the line goes imagined/unsourced or the pay mechanic is dropped from the Close and the practice's `did` line.

### EVID-06 · 2016 recommendation "rabbit hole" is tagged documented; the research labels it speculative for 2016
- **WHERE:** 2016 (and 2003's recommended thread) · `data/dialog/s3_recommend.json` (tag keywords for Recommended, "Up next", "84% match"); practice `recommendation` (documentary → `e3_theday#15`, whose text applies the 2023 audit to "Era 3's tagging and Era 2's recommended thread"); `data/dialog/s2_forum.json` toast "David recommends a thread". The job file's own `_doc` marks the 2016 routing `[I]` (inferred).
- **WHAT A PLAYER EXPERIENCES:** Tagging a video so the platform recommends it, then watching it chain into a testimony. The dossier tags this practice "[documented]".
- **WHY IT MATTERS:** Research §2016: "Suggestion systems: DOCUMENTED for 2021 to 2023. For 2016: SPECULATIVE"; evidence table "Suggestion-system rabbit holes in 2016 — SPECULATIVE"; build advice "Keep out: algorithmic recommendation (undocumented for 2016)." The 2003 case is a human sending a link, not a system. Also `src/witness/record.ts` files the 'group' post under this same practice ("chose the next thing you would see").
- **SEVERITY:** medium-high. **CONFIDENCE:** verified.
- **SUGGESTED FIX:** Flag for him: the card's documented core (2021-23 vocabulary-driven results) and the piece's 2016/2003 placement need separate tags; correct the 'group' mapping.

### EVID-07 · "SOCIAL CONTAGION · HIGH" and "reason: social contagion" are unlabelled anywhere in the dossier
- **WHERE:** 2026 · the Commons termination. `data/dialog/s4_ball.json` line 31 and 413; `NARRATIVE_FLOW_2026-09-17.md` gate row 15. No dossier card, practice or panel line mentions it (grep: only these dialog lines).
- **WHAT A PLAYER EXPERIENCES:** The system ends the session for "your safety" citing social contagion. A reader unfamiliar with the clinical debate cannot tell from the dossier whether the term is the apparatus's ideology, a contested clinical hypothesis, or the piece's own position. The practice `termination` (imagined) points at the LGB Alliance card, which does not discuss the term.
- **WHY IT MATTERS:** The commissioning brief for this era (`CHATGPT_DEEPRESEARCH_ERA4_AND_CROSSERA_2026-06-29.md` ethics block) required the term to be "labelled as such". Dame-Griff 4.5 and §6: the book supports only a structural "technopanic" resemblance (INFERENCE) and gives ROGD one sentence. ETHICS #7 (never satirise the clinical debate; render both) means the label must be handled carefully. This is flagged, not resolved: the wording is his.
- **SEVERITY:** medium-high. **CONFIDENCE:** verified (absence); inferred (reader effect).
- **SUGGESTED FIX:** Add it to his ethics/dossier decisions: whether a card names the term and its status.

### EVID-08 · Several practice tags point at cards that do not support the practice line
- **WHERE:** `data/dossier/practices.json`. Mismatches (practice → pointer; what the card actually covers):
  - `kit` ("gave you software that had already decided what you needed") → `origin_intake_e1#2` (composited behaviour-monitoring questions from survivor testimony). No source for ministry software on a floppy in 1997.
  - `placement` ("arranged a residential programme with your family, then told you") → `origin_intake_e1#3` (professional bodies' statements). The closest documented form is `origin_intake_e1#7` (Love in Action application, 2001), not pointed at.
  - `media` ("recorded whether you watched it through") → `origin_intake_e1#1` (parents' guide). Documented media is Truth in Love TV spots (1999) and I Do Exist (2004); watch-completion logging has no source; the infomercial's own `_sourceNote` in `s2_media.json` says the format is "an authorial design choice, not a historical claim" and is not player-visible.
  - `moderation` ("had you answer families in the platform's voice") → `e3_theday#8` (families' ministry). The ledger entries this practice labels are comment replies and removals (`record.ts`), not family calls; family calls file as `contact`.
  - `diary` (contested) → `e3_theday#7` (software marketed as care). Nothing about reading or erasing private writing; Dame-Griff ch5 p.164 (family PC read by parents) is the documented mechanism and is not in the dossier.
  - `assistant` ("guided you, and filed whether you let it") → `e3_theday#7`, used for 1997, 2003 and 2016 assistants alike.
  - `pledge` → `origin_intake_e1#4` documents the abstinence-pledge literature; the card itself says this programme's card is invented (fine), but the practice tag reads documented.
- **WHAT A PLAYER EXPERIENCES:** "[documented]" next to a source that is about something else.
- **WHY IT MATTERS:** ETHICS #13 and the sources law ("a pointer, never a new claim", `practices.json` `_doc`) — a pointer that does not support its practice is a new claim by implication.
- **SEVERITY:** medium. **CONFIDENCE:** verified.
- **SUGGESTED FIX:** A single pass over the pointer table (his sign-off on each), splitting practices whose first half is documented and second half is the piece's device.

### EVID-09 · Whole-room status "documented" on the 1997 and 2003 panels, and the 2003 panel leaves out the era's testimony and forum
- **WHERE:** `data/strings/close_network.json` panels[0].status and panels[1].status (documentary); panels[1].practices = checkin, assistant, diary, contact, update — no `testimony`, `recommendation`, `placement`, `media`. `data/dossier/practices.json` `testimony` (S205) is reachable only in "Your file" and on the sources page's card list.
- **WHAT A PLAYER EXPERIENCES:** Opening the 2003 panel gives "Documented — this happened, and the sources show it", then a list that omits the fifteen-minute testimony shoot (the era's best-sourced thread) and carries the streak, the classifier and Lamby (EVID-01, -04) under the same banner.
- **WHY IT MATTERS:** The panel-level status is meant to apply "to the panel's claims as a whole" (`_panelsDoc`). 1997's panel includes the invented channel (EVID-03); 2003's includes the streak. The 2016 panel is "disputed" and 2026 "imagined", which reads as more candid than the two eras whose machinery is equally the piece's.
- **SEVERITY:** medium. **CONFIDENCE:** verified.
- **SUGGESTED FIX:** Flag for him: panel statuses and the 2003 practice list after the fixes above; do not change statuses without his word.

### EVID-10 · The cards that say "this part is ours" are not reachable from the in-world dossier
- **WHERE:** `origin_intake_e1#5` (the file device, imagined), `e3_theday#13` (Era 3's ending is ours), `#14` (what could not be sourced), `#18` (testimony limits, imagined), none pointed at by any practice in `practices.json`. In-world views (Close panel press, Menu > Credits > the Close's panels, Your file) print only each practice's single pointed card (`dossier.ts`, `gameMenu.ts`).
- **WHAT A PLAYER EXPERIENCES:** In the headset-and-room experience the only imagined tags a player sees for 1997-2016 are `tapes` and `belongings` (no source). The honest negative cards exist only on the public sources page.
- **WHY IT MATTERS:** CLAUDE.md: "content that cannot be met" is the project's dominant bug class; those cards were written as the safeguard ("the Dossier must carry the distinction for a reader who has not had that conversation", `e3_theday#13`). They are carried only for a reader who opens the web page.
- **SEVERITY:** medium. **CONFIDENCE:** verified.
- **SUGGESTED FIX:** Decide whether the in-world room dossier should list these negative cards under their room; mechanics are mine, wording his.

### EVID-11 · Evidence that post-dates the room, with the card silent about the date
- **WHERE:** (a) `pillow.json` #0: a 2005 profile and GLAAD summary ground the racket exercise in a 1997 room; (b) `e3_theday#0-#2`: the verified link is the Living Waters Leader's Guide (June 2024) for a 2016 room (`data/dossier/links.json`); (c) `e3_theday#15`: 2023 audits for 2016 tagging and 2003's recommended thread; (d) Close panel 2 "of the period" on a 2015 source (EVID-04).
- **WHAT A PLAYER EXPERIENCES:** A documented tag with no indication that the sources are decades later than the scene. #14 is the one card that dates its own source honestly.
- **WHY IT MATTERS:** Research scope limits: GPAHE snapshots (2021-23) "only where the source says when something happened"; the 2016 section is "mostly documented in retrospect". Retrospective grounding is legitimate, but undisclosed it overstates.
- **SEVERITY:** medium. **CONFIDENCE:** verified for the link dates; inferred for the card text's silence (cards #0-#2 carry no date).
- **SUGGESTED FIX:** Flag the four cards for him to date or tag; no rewording from me.

### EVID-12 · The apology-and-closure ending of 2003, and the documented groundings of the update triggers, are not labelled
- **WHERE:** 2003 · PureMail "We have to stop ... No one changed" and "Restorify is closing" (`s2_caleb.json` pureMail block); update triggers in `data/strings/updates.json` `_sourceGrounding` (Paulk 2000, the Exodus closure and renaming, Malta, the single app-store case), all marked "awaiting Sérgio" since S47/S58 and not player-visible.
- **WHAT A PLAYER EXPERIENCES:** A ministry-run programme sends its users a letter saying it never worked, then shuts. No card tells the player what is documented (Exodus' closure 2013, a former director leaving 2008, repudiations by former leaders in ILGA's report) and what is the piece's own (the letter, the trigger being one message).
- **WHY IT MATTERS:** ETHICS #11 (updates triggered by documented failures); the research documents closure then rebrand (NARTH to ATCSI 2014, Brothers Road, Restored Hope), not an apology cascade. Era 3 has its "ending is ours" card (#13); Era 2 has none.
- **SEVERITY:** medium. **CONFIDENCE:** verified (no card; groundings invisible); inferred (reader effect).
- **SUGGESTED FIX:** Flag for him: surface or retire the pending groundings; decide a card for Era 2's collapse.

### EVID-13 · 1997 dates and the "1997 boards" node run ahead of the evidence
- **WHERE:** `data/strings/close_network.json` label "ex-gay discourse boards 1997" (line 41); `data/dialog/s1_browser.json` counter "OVER 22,000 visitors since June 1996" (his source's counter says since June 1999); the Walking-Out Ring and directory pages.
- **WHAT A PLAYER EXPERIENCES:** A reference node that dates ex-gay discourse boards to 1997.
- **WHY IT MATTERS:** Research: the only 1997 online board is the small mixed-sides Bridges forum (REPORTED, one account); ministry-run board evidence starts 1998 (self-description) and public ex-gay boards May 2001 (Weiss et al.). His archive finds for the directory and the ring are captured 1999-2008 (SOURCES_1997_WEB §2); only the faculty page's change log reaches 1996-98. Fictional counters are fine; the label and the era claim are what to check.
- **SEVERITY:** low. **CONFIDENCE:** verified.
- **SUGGESTED FIX:** Check the label's date against what it stands for; his call.

### EVID-14 · 2003's documented counter-side and "stay off the computer" are absent
- **WHERE:** 2003 · Harbor forum (`data/dialog/s2_forum.json`). grep for blog / LiveJournal / survivor / "off the computer" in the era's data: none.
- **WHAT A PLAYER EXPERIENCES:** The 2003 web is entirely the ministry's: rules, rooms, threads, accountability posts, books.
- **WHY IT MATTERS:** Research §2003: surviving online voices are mostly survivors and critics (Ex-Gay Watch 2003, LiveJournal, the 2005 MySpace case); the commonest practical advice was avoiding the computer (14 of 32), "links directly to the IRC layer"; the board archive could be public or private; its build table recommends pairing the board with a survivor blog on the other side of the same page. Dame-Griff 4.2 item 6 gives the same counter-space. Not a defect against a law, an unused documented spine.
- **SEVERITY:** low-medium. **CONFIDENCE:** verified.
- **SUGGESTED FIX:** Offer to him as a 2003 addition; no action needed to stay honest.

### EVID-15 · "What you were allowed to take" is tagged imagined, but a documented source exists
- **WHERE:** `data/dossier/practices.json` `belongings` (speculative, source null); `data/dialog/s1_end.json` packet "Leave behind: music, journals, anything from 'before'"; the room's belongings beat. Documented: `e4_offers#6` (Love in Action women's manual, 2001: "False Images" put away; staff recorded items removed) and the 2001 application (#7).
- **WHAT A PLAYER EXPERIENCES:** A safe-side error: a documented rule is labelled imagined.
- **WHY IT MATTERS:** Over-caution in the other direction; the manual in question is the women's one, so 1997's men's version is still the piece's extension.
- **SEVERITY:** low. **CONFIDENCE:** verified.
- **SUGGESTED FIX:** Flag for him; consider whether the tag stays.

### EVID-16 · Era 3's correction rules beyond "soften the term" have no card saying they are the piece's
- **WHERE:** `data/dialog/s3_queue.json` corrections 1, 2, 7, 8 (remove the unresolved; clip for the broadcast; adjust presentation; "Gender clarity review ... route to exploratory mentorship"). Practice `queue` → `e3_theday#4` covers only the vocabulary swap.
- **WHAT A PLAYER EXPERIENCES:** Five editorial verbs presented as the house's rulebook; one is documented.
- **WHY IT MATTERS:** #18's retrospective note (pressure toward a cleaner "changed" story is reported) supports the "remove the unresolved" idea for 2003 testimony but is attached to 2003, not these 2016 rules; `e3_theday#3` supports "a femininity to be recovered". "Gender clarity review" and "route to exploratory mentorship" have no source (the borderland beat is flagged unresolved elsewhere).
- **SEVERITY:** low-medium. **CONFIDENCE:** inferred.
- **SUGGESTED FIX:** Flag for him whether the correction list needs its own "documented shape, invented texture" card, as the group already has (#14).

### EVID-17 · Close constellation: Era 4 and borderland labels name real bodies with no card
- **WHERE:** `data/strings/close_network.json` labels 18-23: "butch/FTM borderland (Halberstam/Hale)", "SEGM-Genspect-GETA mesh", "GETA clinical guide 2022", "Genspect parent survey", "detransition cohort study (Fenway)", "SPLC detrans reporting".
- **WHAT A PLAYER EXPERIENCES:** References the room "drew on" that no dossier card cites; "mesh" implies a link among named organisations.
- **WHY IT MATTERS:** CLAUDE.md names organisations only where the KB documents them; `dossier.ts` says labels make no per-label claim, but "mesh" is a relational word. Dame-Griff 4.6 states the book is not a source on the butch/trans-masc borderland. Overlaps known open item R4-22 (link pass); listed for the wording of "mesh" and the unclaimed Halberstam/Hale source.
- **SEVERITY:** low. **CONFIDENCE:** inferred (I could not check the KB behind them).
- **SUGGESTED FIX:** Fold into the R4-22 link pass; flag "mesh" for his and the ethics lens's judgement.

### EVID-18 · The "Second Thoughts" tagline repeats a figure the source pass calls misleading
- **WHERE:** `data/dialog/s4_browser.json` `extra.lines[1]` "Trained on 60,000 accounts, in their own words." Source pass (`REINTERP_E4_SOURCE_PASS_2026-08-06.md`): the real tool's "60,000+" is the subreddit's subscriber count; the dataset is about 2,700 users. `e4_offers#3` does not mention the figure.
- **WHAT A PLAYER EXPERIENCES:** In-world marketing, in the perpetrator's own voice (allowed). Nothing tells the reader it overstates.
- **WHY IT MATTERS:** Minor: the real finding (an overclaim on the real tool's own page) is not on the card.
- **SEVERITY:** low. **CONFIDENCE:** verified.
- **SUGGESTED FIX:** Flag only.

### EVID-19 · Known, pending his word: dossier source 17 (`e3_theday#17`, testimony) — listed, not re-argued
Per `VERIFY_TESTIMONY_LINKS_2026-10-01.md` and OPEN_ITEMS P7-43:
1. Truth in Love: the page puts newspaper ads in 1998 and the first TV spot in May 1999; the referral number is documented for the TV spot, not shown for the newspaper ads. The card's sentence reads as 1998 for both.
2. I Do Exist: "In 2007 ... the producer stopped making copies" is not reachable from anything read; the evidence supports 2008, the producer disowning the film as evidence of change and offering it on limited terms, and a participant's later public piece. Salem Grove Press (item 9) could not be read.
3. In `SOURCES_TESTIMONY_2026-10-01.md` (not the dossier): the Smithsonian "VHS, audio, DVD and disks" list is not on the page I verified ("audio-visual materials"); PubMed item 5 supports newspaper ads only; item 4's hosting is a personal blog (his call).
- **SEVERITY:** medium (it is shown on the sources page and in Your file). **CONFIDENCE:** verified. **FIX:** his decision; links.json waits.

### EVID-20 · Small mapping fault: 'group' post filed as a recommendation
- **WHERE:** `src/witness/record.ts`, `ledger.era3Jobs` loop pushes every job (`group`, `recommend`) as `recommendation` ("chose the next thing you would see, and filed what you were shown").
- **WHAT A PLAYER EXPERIENCES:** Posting this week's story to a private group appears under "The recommendation".
- **SEVERITY:** low. **CONFIDENCE:** verified (code and `groupTask.ts` line 101). **FIX:** a mechanics fix; mine to make when allowed.

---

## WHAT IS WELL-GROUNDED AND MUST NOT BE TOUCHED
1. The honest negative cards: `e4_offers#0` (the photograph beat is invented), `e3_theday#13`, `#14`, `#18`, `origin_intake_e1#5` — the project's best habit; they just need to be reachable (EVID-10).
2. 2003's Anchor application (`s2_forum.json` apply block) matches the documented Love in Action form (fee, parent reference, pastor question, $1,500 / $2,500), cited on `origin_intake_e1#7`.
3. The Harbor forum's core act (accountability-partner requests, a moderator reviewing new members, an application gate) matches Weiss et al. and the ministry self-descriptions in the research.
4. Era 3's private group with admin approval and the weekly report to a named partner follow GPAHE's private-group and vetting findings; the group's invented texture is declared in `e3_theday#14`.
5. Malta (`e3_theday#12`, the masthead invented, the law real) and the family cards `#9`/`#10`, which state the absence of a documented practice rather than inventing one.
6. Era 4's Detrans.ai card (`e4_offers#3`, "an adopter, not a developer"; Rewire's "every scenario" confirmed in `SOURCE_VERIFICATION_RESULTS_2026-09-27.md`) and the BetterHelp card tagged disputed (`e4_offers#4`).
7. `tapes` tagged imagined with no source (the honest default), and `photos` tagged imagined.
8. The ball cards (`e4_ball#0-#5`), including the plain statement that no source links ballroom to conversion survivors, and the outsider's-homage framing.

*Summary count: 20 findings (4 high, 3 medium-high, 7 medium, 6 low/low-medium; EVID-19 is the known pending item). Streak check, as briefed: no dossier card says the Restorify streak is imagined; the tag a player sees on the check-in practice is "documented".*
