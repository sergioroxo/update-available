STATUS: live

# Walkthrough 1: a colleague's play-through, and his ideas (2026-10-08)
*His notes after a colleague played the whole piece, plus his own ideas. Every note is here, in his words where it
matters, with an id, an era, a size and where it gets done. Nothing is dropped: an item leaves this register only
when it is DONE (with the session that closed it), RULED OUT (with his reason), or MOVED (with where to).*

**Size:** S = an hour or two · M = a session · L = several sessions.
**Where:**
- **local**: needs the browser, the room, the walk or WebGL; done in this session.
- **cloud**: self-contained code, research or review with a written brief, its own branch, merged after my review and a walk.
- **his**: an ethics call, wording, an image prompt, or his own research.

**Concept image:** his GPT render of the start screen, `~/Pc_Simulation/Walkthrough_2026-10-08/bob_launcher_concept_gpt.webp`.
It shows a warm 1990s study as the launcher: the CRT carrying the title and the content note, a phone on a stand, a
headset on books, a plush lamb, a wall calendar, and three mode plates (*On this computer: Log in · On a phone or
tablet: Enter · In a headset: Enter VR*), with Sound captions, Controls, Credits and Leave on a taskbar.

---

## A · The opening: a Microsoft Bob front door (his ideas)
| id | note | size | where | status |
|---|---|---|---|---|
| W1-A1 | **The opening, inspired by Microsoft Bob.** The colleague did not understand how the narrative plays out, and the opening panel does not explain the project. A Bob-style room that explains what the piece is, lets you choose the mode and device, and teaches how to play (W1-C14: "the BOB should explain the way to play"). His concept image above. | L | local (room/DOM) + his (image, copy) | BUILT S227: LambyOS Home, the Bob-style front door (art S231, window S237); no longer the default since S240 (the restore entrance; ?entrance=home keeps it) |
| W1-A2 | **Image generation.** He can have GPT render what I envision: I write him the prompt(s) for the Bob room's art (a backdrop and the objects as separate layers). | S | his (prompts from me) | BUILT S227: GPT art prompts for the Home room's separate layers (PROMPT_GPT_LAMBYOS_HOME_2026-10-11.md); layers in S231 |
| W1-A3 | **The festival cut is named "Speedrun Version".** Joins P7-33 / L-02 / B28 (the festival cut, "after people review"). | S | local | BUILT S227: the festival cut is the Speedrun Version (src/state/cut.ts) |
| W1-A4 | **A pre-game advert video** (his, 2026-10-08: "what do you think, what are your suggestions?"), a weird explainer of the topic in the programme's own voice ("come join us in the lives of those who struggle"), like Theme Hospital's intro films. He is unsure it should START the piece; it could live inside the Bob room as its explainer. | M | local + his | BUILT S245: the LambyOS advert ('Welcome Home') opens the piece inside the setup, mandatory, no skip; re-cut S246 |
| W1-A5 | **The Lexicon also on the Bob room's shelf.** | S | local | BUILT S230: the Lexicon on LambyOS Home's shelf, opening the Close's Lexicon on return |
| W1-A7 | **The Bob room is named "LambyOS Home"** (his, 2026-10-08: "It can be LambyOS Home"). Diegetic: the programme's own front door, the way Bob was Windows'. | — | — | DECIDED |
| W1-A6 | **A "what you can do here" panel at the start of EVERY era.** The colleague liked the one level panel that said what you could do. | M | local | BUILT S229: a 'what you can do here' card at the start of every era (src/desktop/apps/startPanel.ts) |

## B · Across the piece
| id | note | size | where | status |
|---|---|---|---|---|
| W1-B1 | **Too much text overall.** "We need more images and less text"; "more visual-based interactions". | L | local | open |
| W1-B2 | **A Haiku 5.5 visual walkthrough:** screenshots of every element, with an analysis of the quantity of text per surface. This drives B1 with numbers. | M | cloud (or a local agent, since it needs stills) | BUILT S221: text census per screen, in words (TEXT_CENSUS_*.md, tools/walk.mjs); the screenshot catalogue itself is not logged |
| W1-B3 | **Cadence:** "how we can be in the narrative and expand on the other activities is still not working well". More play/pause: wait for the player's interaction before the narrative moves on. Re-check every place where the story talks while the player is busy. | L | local | open |
| W1-B4 | **A guide you can call on.** "Intelligently have more control of the way the narrative flows": like the Un-Walk in 1997, clear instructions you can follow or go back to. "If needed, press this icon." It can also suggest ("wanna learn how to Fit-In? Grab your handheld"). One consistent help icon per era. | L | local | BUILT S219 (part): LambyOS Start menu on the 1997/2003 taskbar — Now, Programs, In the room, Shut Down… (2016/2026 to follow) |
| W1-B5 | **The "go back" cues need checking across the piece.** A closed window brought the diary up, which is good as a safety net, but the cue was unclear. | M | local | BUILT S238: clearer way-back cues (C4) |
| W1-B6 | **Helper messages are timed for the device.** At a computer you stand still much longer than on a phone or in a headset. | S | local | BUILT S219: the helper waits 1.8× longer at a computer |
| W1-B7 | **Playing a game on the computer moved the camera when its buttons were pressed,** which frustrated people. | M | local | BUILT S219: a game in play takes its keys before the camera (handheld d-pad/A/B/START; ROOTCAUSE arrows dig) |
| W1-B8 | **The handheld is too small;** hold it closer to the eye. | S | local | BUILT S222: a held device placed by the view, ~1.9 / ~1.7 screen px per game px (K4) |
| W1-B9 | **Make the computer's screen feel bigger.** | M | local | BUILT S238: bigger desk views (C4) |
| W1-B10 | **The reinterp marker blocks the X (close) button.** | S | local | BUILT S219: the dev marker (the bars) only under ?debug=1 |
| W1-B11 | **The travels between eras pass through walls.** | M | local | BUILT S238: scripted travel clear of walls, 33 paths audited (C3) |
| W1-B12 | **"Still opted out of the deadname": a recurring error that should be gone already.** The exact wording is not in data/; the likeliest surfaces are 2026's old-file lines (`s4_l.json` lines with `deadname: true`, `textUnvoiced`) and the record. Trace the exact screen, remove it, and log a research finding that it keeps returning (see §H). | M | local + research note | BUILT S219: the old-name opt-out row and its opening advisory removed (the beat says no name); finding logged |
| W1-B13 | **Message sounds are too much** (2016, and anywhere they repeat). | S | local | BUILT S219 (2016 cascade: one per 1.5 s, repeats quieter); other eras to check |
| W1-B14 | **The Word of the Day did not appear at all** in the colleague's play. He also suggests it as a way to tell people what they can do (with B4 and A6). | M | local | BUILT S219: the Word of the Day appears in all four eras (no longer behind the pause) |

## C · 1997 (Daniel)
| id | note | size | where | status |
|---|---|---|---|---|
| W1-C1 | **Make it clearer that you choose 3 things about yourself** (the profile). | S | local | BUILT S227: three boxes that fill for the three things about yourself |
| W1-C2 | **The floppy disk sound is not good.** | S | local | open |
| W1-C3 | **The Un-Walk's Cancel button broke the system.** | S | local | BUILT S219 (agent): no hard break found; Cancel now minimises to the taskbar, with a guide line back |
| W1-C4 | **During the prayer, people look at the radio rather than the computer.** | S | local | BUILT S219: the prayer plays from the computer (his option 2) |
| W1-C5 | **The tape's help guide** (his ruling, 2026-10-08): "it should not so easily happen", and with this much text it becomes too much. Make the guide rarer and later. | S | local | BUILT S219: the tape guide waits (not while playing; after 20 s idle) |
| W1-C6 | **FIT IN** (his, 2026-10-08): "FIT-IN is an amazing name". The clarity it needs is in the guide's suggestions ("wanna learn how to FIT-IN? grab your handheld"); see B4. Keep the name, spelled FIT-IN. | S | local | open (with B4) |
| W1-C7 | **Seekr needs more space, so less text.** | S | local | open |
| W1-C8 | **The flip:** it should zoom out, and more slowly. More time after the ask to flip, because the narrative is still playing (see B3). | M | local | BUILT S227: the flip is slower and the view widens |
| W1-C9 | **"The form is on the desk"** should come after the person says yes, so they can continue and not worry where to go. | S | local | BUILT S227: the form line comes after the yes |
| W1-C10 | **Picking things up** (his ruling, 2026-10-08): drop the mechanic, and drop it from the text. | M | local | BUILT S219: the gathering is off; its lines removed |
| W1-C11 | **The ministry-by-state printout** feels clickable but doesn't press, and its design is very hard to read. Make it work without zoom being the main mode of interaction. | M | local | open |
| W1-C12 | **Pastor Rob's image** (his clarification, 2026-10-08): when Rob sends the image, its descriptions sit outside the frame. | S | local | BUILT S219 (agent): the picture viewer's foot wraps inside its frame |
| W1-C13 | **The transition from 1997 to 2003 wasn't clear.** | M | local | BUILT S229: the 1997→2003 morph shows time passing (the wall calendar turns, a year counter) |
| W1-C14 | **The Bob room should explain the way to play** (see A1). | — | — | merged into A1 |

## D · 2003 (Daniel, Caleb)
| id | note | size | where | status |
|---|---|---|---|---|
| W1-D1 | **Remove the first Not Now button in 2003.** | S | local | open |
| W1-D2 | **The check-in file isn't clear about what to do after Not Now.** | S | local | open |
| W1-D3 | **Harbor: how do you get out after posting?** | S | local | BUILT S219 (agent): after a post, Back to the board / Close Harbor; Home works |
| W1-D4 | **2003 shows 2016 references on several pages.** | S | local | BUILT S219 (agent): Harbor's Resources no longer cite 2016 |
| W1-D5 | **The application process runs off the screen.** | S | local | BUILT S219 (agent): the application fits |
| W1-D6 | **The story preparation has text cut off.** | S | local | BUILT S219 (agent): the prep sheet wraps |
| W1-D7 | **The helper keeps showing lines while your story's videos play.** | S | local | BUILT S225: the helper is silent while the story plays (cloud PR #3) |
| W1-D8 | **Caleb's video should be different from Daniel's.** | M | local | open |
| W1-D9 | **The B-roll doesn't make sense.** | M | local + his | open |
| W1-D10 | **The room tone is not working** (the shoot's room_tone). | S | local | BUILT S219 (agent): a hall room tone made and played under the shoot |
| W1-D11 | **The editing system is too confusing and unnecessary.** Submit the videos and get the final version. | M | local | BUILT S227: the programme cuts his story, so the editing step is gone (my reading of this row; see report) |
| W1-D12 | **The playback needs more quality** when you see the video you made. | M | local | open |
| W1-D13 | **"Read the Mail" should wait while the person is talking with Caleb.** | S | local | BUILT S226: the mail waits for Caleb's note (reading A) |
| W1-D14 | **Caleb is very important here but feels lost in all the text.** | M | local + his | open |
| W1-D15 | **The purity streak is slow.** It should add by layers, not wait for new ones. | S | local | open |
| W1-D16 | **Caleb's message conflicts with the rest of the mail arriving.** | S | local | BUILT S225: the mail waits for the redaction, so it no longer lands over Caleb's note (cloud PR #3) |
| W1-D17 | **The pop-up doesn't work with Caleb's message.** | S | local | BUILT S219 (agent): Caleb's message toast is a door that is not talked over (likely also D16) |
| W1-D18 | **"Still very confusing the cadence there."** (see B3) | M | local | BUILT S226: 2003 cadence fixes (summons first, waits, his Phase 1 answers); the feel is unverified |
| W1-D19 | **After Caleb's "I'm coming to you"** there is a break that makes no sense until the glitch. And the glitch is not great, again. | M | local | open |

## E · 2016 (Vera)
| id | note | size | where | status |
|---|---|---|---|---|
| W1-E1 | **Far too much reading in 2016** ("too crazy amount"). | L | local | open |
| W1-E2 | **Reduce Vera's options to about three;** the player can unlock the rest ("update to new functionalities"). | M | local | BUILT S227: three starter jobs, then five tools by a persistent Update (Vera's jobs; VERA_OPTIONS) |
| W1-E3 | **Finishing a card should return you to the Today panel.** | S | local | BUILT S219 (2016 agent): a finished job returns to the board |
| W1-E4 | **After pressing the button, it still says unread.** | S | local | BUILT S219 (2016 agent): unread clears when opened |
| W1-E5 | **The link-clicking cadence of the messages is too much.** | S | local | open |
| W1-E6 | **Clicking the link does nothing after the sequence ends.** | S | local | BUILT S219 (2016 agent): spent links answer, dimmed, file nothing |
| W1-E7 | **After reading the messages, it still says 17 messages.** | S | local | BUILT S219 (2016 agent): the count falls to 0; the sixth message fits |
| W1-E8 | **"Important Changes" is cut off.** | S | local | BUILT S219 (2016 agent): u4 notice sized to its lines |

## F · 2026 (Maya) and the Commons
| id | note | size | where | status |
|---|---|---|---|---|
| W1-F1 | **Maya's screens are badly scaled** ("all so poorly scaled"). | M | local | BUILT S219 (agent): Room-3 screens minify with mipmaps (strokes no longer lost from the seat); body type still small, monitor-closer is the next step |
| W1-F2 | **Make clearer that Maya is building, with AI, her own programme of conversion therapy.** The search brings her to an AI that gives a plan to recover, offers support, shows her before and after, and so on. | L | local + his | open |
| W1-F3 | **The Commons is too noisy;** the overlapping songs are too much. | S | local | BUILT S227b: one sound at a time in the Commons |
| W1-F4 | **The Commons' steps are confusing.** | M | local | BUILT S227b: the Commons streamlined to one spot with a 'press to turn' prompt (COMMONS_STREAMLINE §8) |
| W1-F5 | **The several spots in the Commons don't work;** streamline to one area. | M | local | BUILT S227b: the Commons' several spots are one area |
| W1-F6 | **The square layer around the "VR" doesn't work.** | S | local | BUILT S219 (agent): the visor's hard frame no longer floats in the ball or the Commons |
| W1-F7 | **The Speedrun Version's sequence must be clearer** about where you need to go. | M | local | BUILT S227: the Speedrun Version (src/state/cut.ts); it lists its own steps on the start card (S229) |

## G · The Close
| id | note | size | where | status |
|---|---|---|---|---|
| W1-G1 | **Remove the rotation at the Close.** | S | local | BUILT S219 (agent): the Close no longer spins her round; the quarter-turn eases over two legs (≤4.3 °/s) |
| W1-G2 | **Clicking the panels activates the computer.** | S | local | BUILT S219 (agent): panels and labels are asked before the machine; not reproduced by a real click — retest |
| W1-G3 | *Kept:* the panels of text are very good; they really liked the stars; the flow is much better. | — | — | keep |

## H · Research notes (his, to be filed)
- **Three kinds of capture, one per life.** Daniel is captured by his family; Vera is part of the system, trying to escape it; Maya is captured by the algorithm. File this into the narrative docs and the article evidence log.
- **A recurring regression (W1-B12).** The deadname / opt-out line came back after it was meant to be gone. This is a finding about the build process: a fix in one surface does not hold when another surface is regenerated. Log it with each date it was seen.

## I · Kept, said in the walkthrough
The website for the still-struggling, the Close's panels, the stars, and the overall flow. "There is amazing stuff here,
like a lot of levels that are amazing… but then the other parts fall off."

## J · Games (his rulings 2026-10-07/08)
| id | note | size | where | status |
|---|---|---|---|---|
| W1-J1 | **ANTIVIRUS rejected** (his, 2026-10-08: "interesting elements but not well conceptualised or even realised"). He sends GPT a context-only prompt for **three** mini-games on the 2026 console (`PROMPT_GPT_SWITCH_GAMES_2026-10-08.md`); he picks one, then a local port. | M | his (GPT) → port | BUILT S227: ANTIVIRUS rejected (S221); MATCH MADE SIMPLE picked and ported to the 2026 console |
| W1-J2 | **CAMP TYCOON (2003),** "a whole separate thing for later". | L | later | parked |
| W1-J3 | **CLEAR v7 approved** (his, 2026-10-08: "a really good idea and just needs to change the font, as it is very difficult to read, and I fear with a smaller screen it will get lost"). v8: the 3×5 type replaced by a 5×7 dot-matrix alphabet (the LCD type of the period). Then the port onto the 2003 flip phone. | M | v8 local → port | in progress |
| W1-J4 | **FloppySheep v7 approved** (his, 2026-10-08: "amazing and that's it"). Port onto Vera's phone, replacing the S70 version. | M | port (worktree agent) | in progress |

## K · Follow-ups (his, 2026-10-08, after S219)
| Id | His words / the item | Size | How | State |
|---|---|---|---|---|
| W1-K1 | **"Shut down should not work, but leave can… Shut down should pop up a message saying 'you are not authorised to leave your treatment'."** Shut Down… is refused in LambyOS's voice (one line, OK, nothing filed); **Leave…** sits under it and opens the frame's menu at a short note ("Opens a different, plain page outside the story. You can come back from it.", Leave / Stay). The main menu's Leave keeps the quick exit: the same note as a grey line under the row, no extra press (my call, so a shared room stays one press away; his to reverse). | S | local | BUILT S220 |
| W1-K2 | **"(The monitor)… if it is the system you can remove it."** It was the place, not the system: the "Next:" line now names the place only when it is somewhere else in the room. | S | local | BUILT S220 |
| W1-K3 | **Games file one line per GAME, not per round** (his, 2026-10-08: "one line per game yes, not round"). FIT IN, CLEAR (and REACH before it) already do. | — | — | DECIDED |
| W1-K4 | **"They haven't been played on a phone, but we need to be sure they can play well on the screen, closer to the screen"** (joins W1-B8, "the handheld is too small; hold it closer to the eye"). Measured from the room's numbers on a 1280 × 720 window: FIT IN's glass shows at ~121 px for 144 game pixels (0.84 screen px per game px: the 5×7 letters lose rows), CLEAR's at ~352 px for 320 (1.1), the 2026 console's at ~210 px for 72 (2.9). Fix: on a flat screen the held device is placed by the view (the glass fills a set share of the frame, whatever the window or phone shape), at least ~1.5 screen px per game px; in a headset it stays at a comfortable arm's distance. Then photographed held, at laptop and phone sizes. | M | local | BUILT S222 (FIT IN ~1.9 / ~1.55, CLEAR ~1.7 / ~1.3 screen px per game px, laptop / phone; whole consoles in frame) |
| W1-K5 | **The advert ends on "the asterisk answered"** (his choice of four, 2026-10-10) **and plays both in LambyOS Home and, unexplained, inside the piece** ("Lets do Both"). LAMBYOS_HOME_DESIGN §7. | — | — | DECIDED |
| W1-K6 | **2016's updates: "the system asks for the update, and the player confirms"**; the three starters + five tools by update, agreed. VERA_OPTIONS §7. | M | local | DECIDED (build waits on Q2–Q10) |
| W1-K7 | **Cadence, not clock** (his, 2026-10-10: "we should try and not use time-based sequences, and make them cadence-wise, so to study the multiple pathways to achieve the resolution"). A whole-piece study: cloud Prompt 6. 2003's six waits (cloud PR #3) are the first piece of it. | L | cloud study → local | open |
| W1-K8 | **Take the viewer there** (his rule, 2026-10-10): no beat depends on the player choosing to look; the piece brings them to it as a sequence of actions. CLAUDE.md R28 amendment 1, revised. | L | everywhere | DECIDED (applies to all future work) |
| W1-K9 | **The cadence study's twelve answers** (CADENCE_STUDY_2026-10-10.md §9): Rob's fallback waits for quiet; the alert stays automatic; "i'm coming to you" break ~4 s; the mail waits for Caleb's note; the Close's cards wait for a press; corner lines live until seen; the Close's sweep shortened; Lambient never beside Bea's thread; the niche files on a press. The 2003 summons come FIRST (before Caleb's message) so every player meets them. | M | local | BUILT S226: the first batch of the cadence answers (Rob's quiet fallback, break ~4 s, mail waits, Close cards on a press, corner lines, Close sweep 44→26 s); answer 11 not clearly logged |
| W1-K10 | **The Commons streamlined** (his F4 answer: "all of them"): cloud Prompt 7. | L | cloud design → local | BUILT S227b: the Commons streamlined (merged) |
| W1-K11 | **The 2026 console game is MATCH MADE SIMPLE** (GPT's, his: "the idea is good to use here"; needs improving): a v2 prototype at 320 × 180 first, then the port. | M | v2 → port | in progress |
| W1-K12 | **Match Made Simple v2 approved** ("Yes it is very good indeed!"); his answers: the stars for the string lights; **the counter-move MAY re-coat their faces** ("increases the challenge and it is a poetic reference"); keep the looks (the purple-hair finding, ARTICLE_EVIDENCE_LOG 2026-10-10); keep L's lines; a hand-drawn 99. Port onto the console, replacing TIDY. | M | agent | in progress |
| W1-K13 | **The exhibition offers BOTH** the full piece and the Speedrun Version (his, 2026-10-10). | M | local | in progress |
| W1-K14 | **The Commons design answered** (COMMONS_STREAMLINE §8): the lamp, never depends on her, three removals, the party ends at the glitch, Junie's category in the Speedrun, a "someone is calling you — press to go" prompt instead of a conducted turn, the wall of firsts in front. | L | agent | in progress |

## Still open after the opening (2026-10-15)
*Checked against BUILD_LOG.md (S218 onward) and PLAN_ENTRANCE_RESTORE_SESSION_2026-10-13.md on 2026-10-15. A row is
BUILT above only when its own ask is in the log; a partly built row stays open here, with what is missing. The restore
entrance (S240) is the default front door; LambyOS Home waits behind `?entrance=home`, as the plan says.*

| id | note | what is still missing |
|---|---|---|
| W1-B1 | Too much text overall; more images, more visual interactions | First text cut (S224: 22 screens, 1746 → 1347 words) is done; the image-led interactions are not, and the census (TEXT_CENSUS_2026-10-15.md) still shows the heaviest screens at 400–640 words |
| W1-B3 | Cadence: wait for the player before the story moves on | 2003's waits and the Phase 1 answers are built (S225, S226); the whole-piece re-check is K7 |
| W1-C2 | The floppy disk sound is not good | Not in the log since 10-08 |
| W1-C6 | FIT-IN: keep the name; the clarity comes from the guide | The name stays; the guide lines wait on B4 (the Start menu is built for 1997/2003 only) |
| W1-C7 | Seekr needs more space, so less text | Not in the log since 10-08 |
| W1-C11 | The ministry-by-state printout feels clickable but does not press; hard to read | S227 shows the printout up close; no log line says it presses without zoom |
| W1-D1 | Remove the first Not Now button in 2003 | Not in the log. S227 cites "W1-D1" for Lamby's greeting close box, which is a different item, so it was not counted here |
| W1-D2 | The check-in file is unclear after Not Now | Not in the log |
| W1-D8 | Caleb's video should differ from Daniel's | Not in the log |
| W1-D9 | The B-roll does not make sense | Not in the log (needs his input too) |
| W1-D12 | The playback needs more quality | Not in the log |
| W1-D14 | Caleb is important but lost in the text | The text cut (B1) helps; no Caleb-specific change is logged (needs his input) |
| W1-D15 | The purity streak should add by layers | Not in the log |
| W1-D19 | The break after "I'm coming to you" makes no sense until the glitch; the glitch is not great | The break is shortened to ~4 s (S226); the glitch itself is not changed in the log |
| W1-E1 | Far too much reading in 2016 | Text cut (S224) covered the heaviest screens; no 2016-specific cut is logged |
| W1-E5 | The link-clicking cadence of the 2016 messages is too much | S224-cloud was a plan only (VERA_OPTIONS); no build logged |
| W1-F2 | Make clearer that Maya is building, with AI, her own conversion programme | Not in the log; a content and ethics call (his) |
| W1-K7 | Cadence, not clock: a whole-piece study | The 2003 waits (S225) are the first piece; the study of the other eras and the whole-piece pass are not done |
