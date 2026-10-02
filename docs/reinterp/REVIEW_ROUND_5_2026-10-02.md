STATUS: live

# REVIEW ROUND 5 — what eight reviewers found, checked and ranked (2026-10-02)
*Eight Sonnet 5.5 reviewers read the whole piece in parallel, one lens each. They read the walk of 2026-10-02 (525
presses, green), a fresh photo set (out/review5/stills, out/tour-e4), the code and the data. Their full reports are
`REVIEW5_<LENS>_2026-10-02.md` (1997 · 2003 · 2016 · 2026+Close · evidence · ethics · copy · platform), about 150
findings in all, each with its file and line.*

*I checked the ones below against the code before listing them; **✔** means I saw it myself. I merged duplicates (several
reviewers found the same thing from different sides) and left out what was already ruled. Each line gives the reviewer
ids so you can open the detail. **Tick what I should do.** Nothing is built until you tick it.*

---

## A · Bugs and broken promises — mine to fix, no ruling needed (tick to approve the batch, or strike a line)

**The ones a visitor would hit**
- [ ] **A1 · The pause menu stops nothing.** With Esc or the menu open, the tapes, the room's ambient sound, L's voice, the songs and the ad keep playing, and the captions drift. **✔** `app.ts:3420` returns before the pause reaches the audio. *(PLATFORM-01)*
- [ ] **A2 · 2016 can stall.** Only the first job, "Correct a testimony", moves Vera's story on, though the board says "Start anywhere". A player who does any other job first gets no phone, no card and no map tick. **✔** *(ERA16-01)*
- [ ] **A3 · Lambient's last lines in 2016 never show.** "Everything on your board is still there. Take the time you need with it." is wiped before it is drawn, along with two other lines. **✔** I had claimed to fix this in S207, and the fix is not in the code. *(ERA16-02; ETHICS-06)*
- [ ] **A4 · 1997's Family Form can be lost for good.** The placement letter arrives 2.4 s after the last reply, the diary opens and takes every press, and the form can never be reached; the map keeps pointing at it. *(ERA97-02)*
- [ ] **A5 · 1997's "Did you know?" pause drops over Lume's welcome**, the first warm contact, while the channel is still typing. **✔** Its conditions never check the channel. *(ERA97-01)*
- [ ] **A6 · The 2003 screensaver can cover Lamby's first hello**, the Begin dialog or the return screen; the first press then only wakes it. **✔** It does not wait for the era to start. *(ERA03-09; PLATFORM)*
- [ ] **A7 · Ignoring Bea's link in 2016 does nothing**, and the player is stuck. "Capture either way", the era's best mechanic, is reachable only through the debug menu. *(ERA16-04)*
- [ ] **A8 · Peeking at "Tag the video" and pressing Back** files "video left untagged", greys the job and blocks a later real tag. *(ERA16-09)*
- [ ] **A9 · The story page in 2003 ends on a greyed Close** until two 9 px links are found. Make the still itself the play button. *(ERA03-10)*

**What the screen says that is not true**
- [ ] **A10 · The 2026 record says "the laptop offered a restart".** It no longer does. **✔** *(ERA26-03)*
- [ ] **A11 · The map tells the 2026 player to "press through L's lines"**, which no longer play. **✔** *(ERA26-09)*
- [ ] **A12 · L's "while it settles" line offers things she has already opened.** **✔** It tests the wrong record. *(ERA26-17)*
- [ ] **A13 · "1 entries", and the "four names" under three people's buttons.** No count anywhere in the piece can be singular. **✔** Fix: number-first labels such as "entries filed: 1". *(COPY-02, COPY-04, ERA26-13)*
- [ ] **A14 · The credits show build notes to the public**: ⚑ marks, "Owed since it shipped", markdown, code ids, "reinterp only". *(COPY-01)*
- [ ] **A15 · L says "three things were taken care of"; the Care page lists four.** *(COPY-06)*
- [ ] **A16 · The 1997 wall record says "every line below"; the lines are above.** *(COPY-08)*
- [ ] **A17 · 2003's streak reads "1 day" in the boot cartoon and "412 days" thirty seconds later.** *(ERA03-14)*
- [ ] **A18 · Lambient's lane sits under Renata's own words**, on a felt screen, which breaks the file's own law. *(ERA16-03, ETHICS-02)*
- [ ] **A19 · Lamby's "Back to it" toast repeats on every close**, even after two seconds. It should come once per door, and only after a real visit. *(ERA03-08)*
- [ ] **A20 · Small craft:**
  - "attracted , and" on the key 2016 edit (ERA16-13);
  - the jingle's lyric band over the taskbar text (ERA03-13, COPY-22);
  - "ASSIGN COMPANIO" clipped on the 2003 wall (ERA03-16);
  - "Lambie" in the jingle captions (COPY-16);
  - the menu's "puts forward back" (COPY-17);
  - the orb's "press to restore" at 9 px, grey on near-black (ERA26-11, PLATFORM);
  - the Malta link card timed 14:10 after 15:47 (COPY-12a);
  - "5 members" never changing while people are added (ERA16-15);
  - "imported history" on Vera's record tile (ERA16-14).

**Sound and devices**
- [ ] **A21 · There is no mute after 1997.** The only mute shows while a tape is in. Put one mute in the menu. *(PLATFORM-02)*
- [ ] **A22 · The VR menu opens only by grip squeeze**, so Vision Pro and hand-tracking have no way to Resume or Leave (inferred). *(PLATFORM-03)*
- [ ] **A23 · Portrait phones crop the monitor at the seat**: the vertical view is fixed (inferred; needs a phone). *(PLATFORM-04)*
- [ ] **A24 · "Start again" reloads the page.** In a headset that throws the visitor out of VR. In XR, rebuild in place instead. *(ERA26-04)*

**The tools' blind spots** (why the walk stayed green over A2, A4 and A7)
- [ ] **A25 · Teach the walker 2016's jobs, the phone, the 2003 ad path and the step into the crowd in 2026.** Re-shoot the 2016 photos: there are none of the board, the jobs or the phone. *(ERA16-16, ERA03 note, ERA26-14)*

---

## B · Your decisions (each is ethics, the dossier, his own words, or a design ruling)

**The dossier's honesty — the biggest block** *(EVIDENCE review; ✔ I confirmed the statuses)*
- [ ] **B1 · Eight practice cards say "documentary" where the evidence does not reach.** They are channel, referral, media, check-in, update, arrival, record and queue. Several point at the same single source card. Examples:
  - the 2003 morning check-in and its **Purity Streak** — no source anywhere found streaks;
  - the 1997 chat channel with a mentor's DMs — "do not present as documented";
  - the file that migrates between updates — your own card calls that device imagined.

  ☐ re-label them honestly (speculative or contested) · ☐ write a "this part is ours" card for 2003 (the streak), as source 18 already does for the release form · ☐ leave as is. *(EVID-01…04, ERA03-03)*
- [ ] **B2 · "She is paid per correction"** (the Close's 2016 panel and its card): nothing in the piece or its sources supports it; the era shows only a quota ("SHIFT 60 CORR."). ☐ say "a quota of corrections per shift" · ☐ mark it speculative. *(ERA16-08, EVID-05)*
- [ ] **B3 · Dossier source 17's two corrections** (the paragraph behind 2003's "The testimony" card, `data/provotypes/e3_theday.json` #17): Truth in Love TV in **1999**, not 1998; and the *I Do Exist* "2007… stopped making copies", which no source supports. ☐ apply both as worded in VERIFY_TESTIMONY_LINKS · ☐ other. *(EVID-19)*
- [ ] **B4 · "SOCIAL CONTAGION · HIGH" / "reason: social contagion"** — 2026's gate line — is explained nowhere. Add a *contested* card: what the phrase claims, who uses it, that it is not a settled finding. Your wording, my research. *(ERA26-02, EVID)*
- [ ] **B5 · 2026's hard facts sit on page 5 of a Sources window, under an "Imagined" banner.** The 2026 panel most visitors read calls the room speculative. ☐ one plain documentary sentence on the panel's face, naming who campaigns now, and the campaign card first. Your "be direct" ruling applies. *(ERA26-01)*
- [ ] **B6 · Real organisations float as stars at the Close with no claim attached** (SEGM, Genspect, GETA, SPLC, Fenway). ☐ one attributed sentence each · ☐ generic labels, with the names kept in the cards. *(ERA26-07)*
- [ ] **B7 · Malta's date:** the fiction's Tuesday 13 December falls after the Act's documented publication (9 December). ☐ move the scene to Tuesday 6 December · ☐ leave it. Also the Close's "made what she does an offence" overclaims; suggested: "made practices like hers an offence". *(ERA16-11/12, COPY-12)*

**Ethics and tone**
- [ ] **B8 · The 2026 wellness orb has no tell.** It is the only screensaver whose softness never shows its hand, against your "2026 is not gentle". ☐ add one cold detail (e.g. a tiny "session recorded" under the orb, or the affirmations ending on "we kept your file") · ☐ leave it, since the arrival is meant to seduce. *(ETHICS-03)*
- [ ] **B9 · The recorded "someone who went back" (2026)** could be read as the piece mocking detransition. ☐ one plain line on its card: the recording is the system's invention, detransition is real, the target is the system that harvests words. *(ERA26-08)*
- [ ] **B10 · Junie's "don't let it finish you"** carries a self-harm reading. Suggested: "don't let it finish the sentence" (it rhymes with the cut-off recording). *(ERA26-12)*
- [ ] **B11 · The content notice promises a spoken name that is never spoken.** The deadname beat changed to "the old file"; the notice and its toggle still describe the old version. COPY-03 offers a rewrite. *(COPY-03)*
- [ ] **B12 · "This story is built with and for survivors"** (in the shipped build's opening) — a claim the project cannot support. ☐ delete · ☐ "it does not speak for them". *(COPY-13, ETHICS)*
- [ ] **B13 · The word "lesbian" appears once in 2016, as the word being struck out.** Your ruling: visibility. ☐ let it be said once, plainly, somewhere the system cannot edit (the Wick's message, or Aunt Cliona), and name the women on the Close's 2016 panel. *(ERA16-05)*
- [ ] **B14 · The two jobs the era points to (Tag the video, Post to the group) are not about women** ("Tomas R., Day 40"). ☐ make the video Renata's own cut and the group's poster a woman. *(ERA16-07)*
- [ ] **B15 · 2016's main path is three presses on one woman** (about a minute). ☐ raise the gate to two jobs, or make Annette's family calls part of the main beat. *(ERA16-06)*
- [ ] **B16 · ROOTCAUSE bursts "GENDER CONFUSION" and calls it a "fake label".** ☐ keep (it is the programme's label, and it collapses) · ☐ change. *(ERA97)*
- [ ] **B17 · The ball credit says the piece "borrows no vernacular"**, but "Category —", "House of …", the floor and the turn are the form. ☐ soften the credit · ☐ change the calls. *(COPY-23)*

**Design**
- [ ] **B18 · The ad is shown only to the player who presses Okay on Lamby's alert.** This was designed ("the era does not chase"). But the montage now carries Daniel's own tape, so whoever closes the alert misses the media economy's other half. ☐ also offer it as an unread icon after a dismissal · ☐ keep as designed. *(ERA03-01)*
- [ ] **B19 · The ad's skip arms at 15 s; the montage is at 25.7 s**, so the first press skips it. ☐ arm the skip after the montage (about 34 s) · ☐ keep. *(ERA03-02)*
- [ ] **B20 · The montage never says the centre tile is Daniel**, and Marcus's name sits under the whole wall. ☐ the tape's own "TAPE 04" mark on his tile, and Marcus's name only once it cuts to him. *(ERA03-04)*
- [ ] **B21 · Caleb is a stranger until 2003.** ☐ plant one trace in 1997: a second name on the placement letter, or one line in the channel. *(ERA03-05)*
- [ ] **B22 · 2003's documented core act is missing:** asking for an accountability partner on the board, and "stay off the computer"; "Mark T." appears from nowhere. ☐ make the board's request pressable, which assigns Mark T., plus one veteran line. *(ERA03-06)*
- [ ] **B23 · Two stage directions narrate Tape 04's bare footage** ("(the tape keeps running)", "(the AFTER set, being dressed…)"). ☐ delete both, and let the picture say it. *(ERA03-07)*
- [ ] **B24 · The Commons, the one respite, is the darkest room in the stills**, with faceless boxes and lamps too small to see. ☐ warm it, raise the lamps to string-light height, maybe its "house rules" on a wall (Dame-Griff). *(ERA26-05)*
- [ ] **B25 · 2026 shows AI as the whole mechanism; the research says AI is one dated incident.** ☐ add one non-AI route: a short video whose comments point to a "survivor network". *(ERA26-06)*
- [ ] **B26 · Names across eras:**
  - 1997's machine is both "LambyOS" and "PHASE/2 95";
  - 2026 introduces Continuity, then GraceOS, never connected;
  - the 1997 kit has five names (disk, kit, booklet, brochure, Family Companion);
  - the 1997 trip is a "weekend", a week and a fortnight.

  ☐ unify as COPY-07/09/10/11 propose. *(COPY)*
- [ ] **B27 · The Close has no map beats**, so the Restart card, the receipt and the dossier are found by luck. ☐ four plain optional beats. *(ERA26-10)*
- [ ] **B28 · The "1997 is half the piece" premise is stale:** in this walk 1997 is 26% of presses; about 100 of its 135 are side-door exploring, and its main path is about 6–7 minutes. This bears on the festival-cut question (P7-40, after people review). *(ERA97-09)*

---

## C · Noted, not for now
- The 2026 turn reveals little (ERA26-15).
- A "People also ask" box on the results page, from Dame-Griff (ERA26-16).
- The prep sheet pairs file lines to topics by index (ERA03-11).
- 1997's icons in the 2003 desktop (ERA03-15).
- Spelling drift: program/programme, enrol (COPY-14).
- The quote style (COPY-24).
- Two uncompressed WAVs (PLATFORM).
- No reduced-motion line (PLATFORM).
- The two 404s are probably the favicon (PLATFORM-11).
- The idle wipe (his ruling: not a priority).

## What all eight said must not be touched
Tape 04's outtake ("…Caleb?"), the sign-in-sheet line, Noa unresolved, the 2016 group never satirised, the backlog
inbox, the tab order of 2026 as an argument, the record tab's locked rows, the failure on both screens, the printout's
closing line, REACH and TIDY's rhetoric of failure, Harbor's dead "I Do Not Agree", the screensavers' gate and the
flock's one halo-less lamb, the lock screen's climbing counter, and "No Daniel in Vera's room".

---

## HIS RULINGS (2026-10-02)
*A: "Let's do all of A." B, item by item, in his words where they matter:*

| B | Ruling | What I build |
|---|---|---|
| B1 | "Relabel and write on the needed parts" | re-label the eight cards honestly; write the missing "this part is ours" cards (2003's streak, the 1997 channel, the migrating file) |
| B2 | "honestly remove, not really needed here" | remove "paid per correction" from the Close's 2016 panel and its card |
| B3 | "Correct" | done (source 17); anything still unverified goes on the deep-research list |
| B4 | yes | a contested card: what "social contagion" claims, who uses it, that it is not a settled finding |
| B5 | yes — and **"Inferred" rather than "Imagined"**: "'imagined' sounds like a manipulative act on my side, while we are talking about creative inference and speculative approaches" | the plain documentary sentence on the 2026 panel's face; the campaign card first; the dossier's "Imagined" banner becomes "Inferred" everywhere |
| B6 | "They are real, so they have a reason to be in the Close" | keep the names |
| B7 | align the fiction's day with the real record (not before it) | set Malta's day to the documented vote date, verified first |
| B8 | add something eerie — "L is waiting to help you", an "L phrase of the day" | the orb gains its tell |
| B9 | "yes, no mocking" | the line on the recording's card |
| B10 | yes | "don't let it finish the sentence" |
| B11 | rewrite | the content notice and its toggle, to what plays now |
| B12 | delete — "this is not for survivors, this is to educate about the topic, especially for those who might need other forms of content to interact with it, to understand the underlying stuff and to create awareness" | delete the line |
| B13 | yes | "lesbian" said plainly once where the system cannot edit it; the women named on the Close's 2016 panel |
| B14 | yes | the tagged video is Renata's own cut; the group's poster is a woman |
| B15 | part of the main beat | Annette's family calls join 2016's main beat |
| B16 | keep | — |
| B17 | "you decide" | soften the credit: the piece invents its houses, categories and names and depicts no real ball |
| B18 | "Maybe also offer" | the ad also offered as an unread icon after a dismissal |
| B19 | "don't fully know what this is" | explained to him: the ad's skip arms at 15 s, the montage starts at 25.7 s |
| B20 | "okay? or already resolved?" | explained to him: still open (the centre tile is never named as Daniel's) |
| B21 | "Uh that's lovely" | one trace of Caleb in 1997 |
| B22 | "I think so" | the board's accountability-partner request becomes pressable; Mark T. is assigned there |
| B23 | "can you show me that?" | stills of the two stage directions sent to him |
| B24 | "Warm it please!" | the Commons warmed; the lamps raised to string-light height |
| B25 | yes | one non-AI route in 2026: a short video whose comments point to a "survivor network" |
| B26 | "needs to be reviewed in more detail… we are talking about a multitude of actions and systems, they are never one" | NOT a unification — a design note first: the names stay many, and the piece shows they are many |
| B27 | add | four optional Close beats on the map |
| B28 | after people review | — |

**A new idea of his (2026-10-02):** nothing in the piece shows the TERMS the networks use and the "REASONS" they give for
being LGBTQIA+ — "phrases of the day? an extra app installed with every update — an association game, a trivia, or an
encyclopedia of the words we've found them collecting and the reasons they give for being gay or trans?" → a proposal
to him first (see the session's reply).

**The Close's message (RESEARCH_CLOSE_MESSAGE_2026-10-02.md), his notes:**
- "trans and gender diverse", not the binary pair — B2's line to be worded to what FRA measured;
- drop the search-results detail ("not relevant to common people");
- the EU: "a non-committal recommendation… 2027 means nothing, because it killed the law";
- "Love the B5";
- his B6: *"The next update is still being written, but their perpetrators are already making more victims."*
