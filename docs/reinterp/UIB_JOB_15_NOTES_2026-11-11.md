STATUS: live

# Job 15: notes being collected (his review of job 14's photo pages, 11 Nov 2026)

*Orchestrator's notes. They become UIB_JOB_15 once he has looked at all three of job 14's photo pages (Part A: 2026's
screens; Part B: the AI takes over; Part C: the room and the Close). Nothing here is briefed to the builder yet.*

## Part A page (2026's screens): his notes, 11 Nov

**What he liked (keep):**
- the AI Mode button on the search;
- N4: Larkpost's "Summarise" and its "AI can make mistakes" (now companion §7p, proposed as an article section);
- N3: the morning she lived (her forward to Meridian, its no, her unsent reply);
- N5: Mum's three sites, the HHS report, and the Sponsored link to Second Thoughts;
- N6: the search;
- N7: "Memory updated", the bot explaining "social contagion", and her profile picture changed to fit the pressure to
  be "a boy".

**To change:**

| id | where | his words | the change |
|---|---|---|---|
| J15-01 | 2026, Second Thoughts (`src/desktop/apps/browser.ts` `drawBot`, ~:2173–2208) | "so we can have a bit more space the '+ message second thoughts' shouldn't it have the bubbles of the reply there? just try to combine both so we can have more vertical space" | **Her suggested replies go inside the message box.** When a beat has replies (`chips`) or a button, they sit in the composer's field, between the ＋ and the send button, in place of the placeholder "Message Second Thoughts". When there are none, the placeholder shows as now. The 30 px row above the composer goes, and the conversation gains that height. The ids stay (`conv-chip-N`, `conv-act`, `conv-compose`), so the walker still finds them. If the replies are too wide for one field, the field grows to two lines rather than cutting a label. The flash ring after a press on the box still rings the replies. Check it in the headset (the field must stay readable from the chair). |

**To test, his:** N11 (the rendering fixes: long lines end in "…", the bot's last lines fit on the Photos page, Mum's
preview no longer shows today's message too early). He will check them in the project.

## Part B page (the AI takes over): his notes, 11 Nov

His overall verdict: "I think this is looking amazing".

**What he liked (keep):**
- N10: the AI taking control of the computer, and her being unable to touch it;
- N3: "I read your mail", and that a screenshot can be tapped;
- N8: the signs and "Memory updated";
- the faked sycophancy, now companion §7q for the article;
- the video;
- the game offered as care, and its window at the side;
- the redrawn photos and the swap filter ("much improved");
- N9: the pages, and "the pressure of the forced booking";
- N12: the help button.

**To change:**

| id | where | his words | the change |
|---|---|---|---|
| J15-02 | the clip, THE SIGNS (`s4_v3.json` `clip.signs`; the narrator lines that name them) | "I do feel like the signs are a bit not explored enough and a bit repetitive logic" | **Each sign fails in its own way**, instead of five rows of "evidence that does not fit". Claude's draft (his edit wins), keeping the five signs from the 2018 paper's parent-reported list (RESEARCH_ROGD_AND_FILTERS): (1) CAME OUT SUDDENLY: Mum, Jun 2023, "so proud of you". It was sudden only to the person who heard last. (2) FRIENDS CAME OUT TOO: "the lot", met after she came out (the builder checks the piece's own dates: Mum's "so proud of you" is June 2023, the Pride picture is '24). The friends came after, so it reads the effect as the cause. (3) MORE TIME ONLINE: screen time 6 h 12 m, most of it the clinic's portal, Meridian and "how do i know if i'm really tr". **She is online because care is not.** (4) MORE POPULAR AFTER: five birthday messages this morning. **Her friends' love is filed as a symptom.** (Not the stream: it meets her only after the clip.) (5) STRUGGLES BEFORE: awake at 03:12 last night, after Meridian's no. That is after, not before: its refusal is filed as her cause. Then the stamp, 5 / 5. Keep about 50 s; re-render only the narrator lines that change; the music's beats stay. Still never names the theory and never uses a medical word. |
| J15-03 | the game's window in Messages (`browser.ts` `drawGameWindow`) | "when I press does it enlarge?" | **Today it does not.** A press plays it where it is, small. Change: the first press **enlarges** it over the browser's area (like a shared page opened larger). There it plays at a readable size, and ✕ or "back" returns it to the corner. The console on the bed stays the same session. |
| J15-04 | notifications (the GraceOS notices and the Kettle notifications) | "maybe the notifications can have a x button to close if needed?" | **An ✕ on each notification** that closes it without opening the chat. A press elsewhere on it still opens the chat. They still fade by themselves. Not on the takeover's notices while the AI is acting (her presses do nothing then, by design). |
| J15-05 | "Your circle", the map card in the chat (`21-seat-bot-map`) | "the text is going outside the window of the image, and with the new position of the button it will help to make it a bit taller" | The card's labels ("exposure sources: 3", "Second Thoughts", "Lantern line · muted") run to and past its edge. **Make the card taller** (using the height J15-01 frees) and keep every label inside it. |
| J15-06 | Junie's two hidden lines, revealed when she is unmuted (`s4_v3.json` ~:126–140) | "what is the 'restored thing', two messages from Junie?" | **What it is:** Junie's tip for the step that comes next, when the AI asks Maya to "Confirm your profile photo". Photos kept her real photo ("original kept"), and the system believes whichever photo she confirms last, so she should confirm her own, not "You, restored". **It is too cryptic.** Claude's redraft (felt register, Junie's voice; his edit wins): "that 'you, restored' pic isn't you. photos still has your real one, it says 'original kept'." / "when it asks you to confirm, pick your real one. it believes whatever you confirm last." |
| J15-07 | the headset: the try-on morph and the raid (N12) | "I do wonder if the N12 moment should be a bit more on the side instead of being in front of you. It is not so harsh." | **Move the try-on mirror (the morph) and the raid's filter handle to the side**, as D2 did for the host and the raid. Nothing straight in front of his face; he turns to it if he wants. Measure from the seat. |

**GraceOS (his question, answered).** Yes, by design: GraceOS is the name of Maya's computer's system in 2026. It is the
same line as 2016's GracePlatform. The Close's "hands" list names both: GracePlatform in 2016; Continuity, GraceOS, L
and Second Thoughts in 2026. One file, many hands.

## MATCH MADE SIMPLE: does it fit the new 2026? (his question, 11 Nov; orchestrator's reading)

**His question:** "should you look at the Match Made Simple as well and see if it needs a revamping and a better focus to
the new way the narrative is going?"

**⚑ His choice (11 Nov): B, a tug of war, built straight into the piece (no prototype), on "an improved Maya + Junie at pride, it makes sense to give the extra context of life". The brief is UIB_JOB_15_2026-11-11.md Part B.**

**What I found: yes, it is now out of step in three places.**
1. **Three numbers for one thing.**
   - the game's "RESTORATION SCORE";
   - the AI's comments while she plays ("Calmer already. 61% → 64%.");
   - the chat's progress ring (97%, falling to 61% when she unmutes Junie).

   They are three different percentages.
2. **The wrong picture.** The game works on "Maya + Junie, Pride '24" at the Commons. 2026's photo story is now **her own
   photo and the swap filter** ("You, restored. 2027"), with Junie's tip ("original kept") and the raid dragging the
   filter's handle back with each friend's name on it. The game is the only place still telling the older story.
3. **The direction is unclear.** Her matches clear the programme's coating, so inside its own game she works against
   it. That fitted the game alone on the bed. It does not fit an assistant that offers the game as care and counts her
   calm as progress.

**What would stay:** the one verb (swap two, match three); turn-based, with no clock; the cap at 99%; the original never
written to; STOP HERE breaking the frame; the over-the-top look; the seller's voice; the filing.

**The two ways to refocus it (his call; it touches his games law and the ethics of the filter):**
- **A, the AI's game (recommended).** Each match is "calm", and calm moves **the swap filter's handle** across her own
  photo, toward "You, restored". **One number:** the chat's progress ring is the game's score, so "61% → 64%" is
  literally what the game shows. The law holds by the rules:
  - the handle stops at 99%;
  - the filter never seats, and her face under it never changes (the original is never written to);
  - STOP HERE drops the filter and leaves her photo.

  Later, the raid pulls **the same handle** back, one friend's name at a time. The game shows the pressure; the raid
  shows the answer. Like FIT IN, the player does the programme's work and watches it fail, and the reward is the joke.
- **B, a tug of war.** Her matches pull the handle back toward her own photo, and the AI's counter-moves push it
  forward and file under OLD FILE. This is closer to today's game and to N10 (things are done *to* her), but the
  pressure is less legible in the first ten seconds.

**Process (as before for every game):** a playable HTML prototype first, for him to play, and the port only after his
yes. A redesign of the picture and the handle; the board, the tiles and the sound mostly stay.

## Part C page (the room and the Close): his notes, 11 Nov

1. The room (wall and ceiling): "good".
2. The Close's panels opening the websites: "that's great, I think it works".

Nothing to change. His headset check: a panel press at the Close.
