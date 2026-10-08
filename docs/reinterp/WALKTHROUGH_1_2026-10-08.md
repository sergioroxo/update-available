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
| W1-A1 | **The opening, inspired by Microsoft Bob.** The colleague did not understand how the narrative plays out, and the opening panel does not explain the project. A Bob-style room that explains what the piece is, lets you choose the mode and device, and teaches how to play (W1-C14: "the BOB should explain the way to play"). His concept image above. | L | local (room/DOM) + his (image, copy) | open |
| W1-A2 | **Image generation.** He can have GPT render what I envision: I write him the prompt(s) for the Bob room's art (a backdrop and the objects as separate layers). | S | his (prompts from me) | open |
| W1-A3 | **The festival cut is named "Speedrun Version".** Joins P7-33 / L-02 / B28 (the festival cut, "after people review"). | S | local | open |
| W1-A4 | **A pre-game advert video** (his, 2026-10-08: "what do you think, what are your suggestions?"), a weird explainer of the topic in the programme's own voice ("come join us in the lives of those who struggle"), like Theme Hospital's intro films. He is unsure it should START the piece; it could live inside the Bob room as its explainer. | M | local + his | open: his ruling on where |
| W1-A5 | **The Lexicon also on the Bob room's shelf.** | S | local | open |
| W1-A6 | **A "what you can do here" panel at the start of EVERY era.** The colleague liked the one level panel that said what you could do. | M | local | open |

## B · Across the piece
| id | note | size | where | status |
|---|---|---|---|---|
| W1-B1 | **Too much text overall.** "We need more images and less text"; "more visual-based interactions". | L | local | open |
| W1-B2 | **A Haiku 5.5 visual walkthrough:** screenshots of every element, with an analysis of the quantity of text per surface. This drives B1 with numbers. | M | cloud (or a local agent, since it needs stills) | open: run first |
| W1-B3 | **Cadence:** "how we can be in the narrative and expand on the other activities is still not working well". More play/pause: wait for the player's interaction before the narrative moves on. Re-check every place where the story talks while the player is busy. | L | local | open |
| W1-B4 | **A guide you can call on.** "Intelligently have more control of the way the narrative flows": like the Un-Walk in 1997, clear instructions you can follow or go back to. "If needed, press this icon." It can also suggest ("wanna learn how to Fit-In? Grab your handheld"). One consistent help icon per era. | L | local | BUILT S219 (part): LambyOS Start menu on the 1997/2003 taskbar — Now, Programs, In the room, Shut Down… (2016/2026 to follow) |
| W1-B5 | **The "go back" cues need checking across the piece.** A closed window brought the diary up, which is good as a safety net, but the cue was unclear. | M | local | open |
| W1-B6 | **Helper messages are timed for the device.** At a computer you stand still much longer than on a phone or in a headset. | S | local | BUILT S219: the helper waits 1.8× longer at a computer |
| W1-B7 | **Playing a game on the computer moved the camera when its buttons were pressed,** which frustrated people. | M | local | BUILT S219: a game in play takes its keys before the camera (handheld d-pad/A/B/START; ROOTCAUSE arrows dig) |
| W1-B8 | **The handheld is too small;** hold it closer to the eye. | S | local | open |
| W1-B9 | **Make the computer's screen feel bigger.** | M | local | open |
| W1-B10 | **The reinterp marker blocks the X (close) button.** | S | local | BUILT S219: the dev marker (the bars) only under ?debug=1 |
| W1-B11 | **The travels between eras pass through walls.** | M | local | open: bug |
| W1-B12 | **"Still opted out of the deadname": a recurring error that should be gone already.** The exact wording is not in data/; the likeliest surfaces are 2026's old-file lines (`s4_l.json` lines with `deadname: true`, `textUnvoiced`) and the record. Trace the exact screen, remove it, and log a research finding that it keeps returning (see §H). | M | local + research note | BUILT S219: the old-name opt-out row and its opening advisory removed (the beat says no name); finding logged |
| W1-B13 | **Message sounds are too much** (2016, and anywhere they repeat). | S | local | BUILT S219 (2016 cascade: one per 1.5 s, repeats quieter); other eras to check |
| W1-B14 | **The Word of the Day did not appear at all** in the colleague's play. He also suggests it as a way to tell people what they can do (with B4 and A6). | M | local | BUILT S219: the Word of the Day appears in all four eras (no longer behind the pause) |

## C · 1997 (Daniel)
| id | note | size | where | status |
|---|---|---|---|---|
| W1-C1 | **Make it clearer that you choose 3 things about yourself** (the profile). | S | local | open |
| W1-C2 | **The floppy disk sound is not good.** | S | local | open |
| W1-C3 | **The Un-Walk's Cancel button broke the system.** | S | local | BUILT S219 (agent): no hard break found; Cancel now minimises to the taskbar, with a guide line back |
| W1-C4 | **During the prayer, people look at the radio rather than the computer.** | S | local | BUILT S219: the prayer plays from the computer (his option 2) |
| W1-C5 | **The tape's help guide** (his ruling, 2026-10-08): "it should not so easily happen", and with this much text it becomes too much. Make the guide rarer and later. | S | local | BUILT S219: the tape guide waits (not while playing; after 20 s idle) |
| W1-C6 | **FIT IN** (his, 2026-10-08): "FIT-IN is an amazing name". The clarity it needs is in the guide's suggestions ("wanna learn how to FIT-IN? grab your handheld"); see B4. Keep the name, spelled FIT-IN. | S | local | open (with B4) |
| W1-C7 | **Seekr needs more space, so less text.** | S | local | open |
| W1-C8 | **The flip:** it should zoom out, and more slowly. More time after the ask to flip, because the narrative is still playing (see B3). | M | local | open |
| W1-C9 | **"The form is on the desk"** should come after the person says yes, so they can continue and not worry where to go. | S | local | open |
| W1-C10 | **Picking things up** (his ruling, 2026-10-08): drop the mechanic, and drop it from the text. | M | local | BUILT S219: the gathering is off; its lines removed |
| W1-C11 | **The ministry-by-state printout** feels clickable but doesn't press, and its design is very hard to read. Make it work without zoom being the main mode of interaction. | M | local | open |
| W1-C12 | **Pastor Rob's image** (his clarification, 2026-10-08): when Rob sends the image, its descriptions sit outside the frame. | S | local | BUILT S219 (agent): the picture viewer's foot wraps inside its frame |
| W1-C13 | **The transition from 1997 to 2003 wasn't clear.** | M | local | open |
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
| W1-D7 | **The helper keeps showing lines while your story's videos play.** | S | local | open |
| W1-D8 | **Caleb's video should be different from Daniel's.** | M | local | open |
| W1-D9 | **The B-roll doesn't make sense.** | M | local + his | open |
| W1-D10 | **The room tone is not working** (the shoot's room_tone). | S | local | BUILT S219 (agent): a hall room tone made and played under the shoot |
| W1-D11 | **The editing system is too confusing and unnecessary.** Submit the videos and get the final version. | M | local | open |
| W1-D12 | **The playback needs more quality** when you see the video you made. | M | local | open |
| W1-D13 | **"Read the Mail" should wait while the person is talking with Caleb.** | S | local | open |
| W1-D14 | **Caleb is very important here but feels lost in all the text.** | M | local + his | open |
| W1-D15 | **The purity streak is slow.** It should add by layers, not wait for new ones. | S | local | open |
| W1-D16 | **Caleb's message conflicts with the rest of the mail arriving.** | S | local | open |
| W1-D17 | **The pop-up doesn't work with Caleb's message.** | S | local | BUILT S219 (agent): Caleb's message toast is a door that is not talked over (likely also D16) |
| W1-D18 | **"Still very confusing the cadence there."** (see B3) | M | local | open |
| W1-D19 | **After Caleb's "I'm coming to you"** there is a break that makes no sense until the glitch. And the glitch is not great, again. | M | local | open |

## E · 2016 (Vera)
| id | note | size | where | status |
|---|---|---|---|---|
| W1-E1 | **Far too much reading in 2016** ("too crazy amount"). | L | local | open |
| W1-E2 | **Reduce Vera's options to about three;** the player can unlock the rest ("update to new functionalities"). | M | local | open |
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
| W1-F3 | **The Commons is too noisy;** the overlapping songs are too much. | S | local | open |
| W1-F4 | **The Commons' steps are confusing.** | M | local | open |
| W1-F5 | **The several spots in the Commons don't work;** streamline to one area. | M | local | open |
| W1-F6 | **The square layer around the "VR" doesn't work.** | S | local | BUILT S219 (agent): the visor's hard frame no longer floats in the ball or the Commons |
| W1-F7 | **The Speedrun Version's sequence must be clearer** about where you need to go. | M | local | open (with A3) |

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
| W1-J1 | **TIDY is replaced by ANTIVIRUS (2026, Maya):** a "Scan & Clean" utility that flags her life under "social contagion". Prototype first. | M | prototype agent → then local port | open |
| W1-J2 | **CAMP TYCOON (2003),** "a whole separate thing for later". | L | later | parked |
| W1-J3 | **CLEAR is the v7 Zuma (letters spell "I KNOW WHO I AM").** Waiting on his eye: the cut diary line, the two new dismissal lines, SAME-SEX ATTRACTION on the belt, a colour-blind aid. | M | his, then port | open |
| W1-J4 | **FloppySheep v7** (the paced cannons) to bring into the piece. | M | port | open |
