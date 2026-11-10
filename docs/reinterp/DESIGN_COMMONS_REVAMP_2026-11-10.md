STATUS: draft

# Revamping the Commons: four directions (UiB job 10, Part B — a proposal, nothing built)

*10 Nov 2026, S351. His ask: "a new revamping of the Commons … a better experience for everyone, more related to the
topic of social critique and social education." His narrative idea (10 Nov) is direction 2a and is worked through in
full. The research came first and shapes everything here: docs/reinterp/RESEARCH_COMMONS_STREAM_2026-11-10.md (cited
below as **R §n**). Mock-ups, rough, in the piece's own era-4 palette: `out/s351/mock/` (git-ignored; `python3
out/s351/mock/draw.py` redraws them). Nothing is built until he picks.*

## 0. The laws every direction keeps

- **Respite.** The stream is the people's space: never a trap, never revealed as fake. The system targets *around* it,
  never through it: its failures land on its own surface (the glass, the frame, the card), never on a dancer or a chat
  line.
- **Satire only in the system's self-presentation, and it collapses.** In 2a that means the AI product: its claim to
  be Jesus, its "verified" badge, its one-viewer stream, its metrics, its "for your safety". **Never** faith, never
  Jesus as believers hold him, never believers, never prayer or scripture (the host does not quote scripture at all).
- **The clinical debate is never satirised.** Detransition, gender-exploratory therapy and "social contagion" stay the
  system's words in the system's mouth; the floor never rebuts them; the Dossier carries both captions.
- **TransJesus has no voice and no words, ever** (s4_ball.json `_docVoice`). Nobody's real words; every chat line is
  invented.
- **No beat depends on a look; looking stays free.** Presses only, no free text. The headset's comfort rules: seated,
  no locomotion, no smooth travel, scene changes through the particle veil (S282), no flashes, captions for every line.
- **The frame never plays.** No score, no total of her worth; the fund is not a scoreboard.
- **Quest budget:** ≤75 draw calls. The Commons world today is ≤5 calls (commonsWorld.ts's own count).

## 1. What it is now (from the code and the stills, honestly)

**The sequence** (ball.ts, commonsWorld.ts, commonsFigures.ts, s4_ball.json):
1. After the reversal, she puts the headset on. The **session** (Second Thoughts' environment) shows a plan of three
   items (Grounding · "Someone who went back", a recording · "Your goals, restated") and one chip, **Begin**.
2. Inside it, **"try it on"** (mirror.ts, s4_v3.json `tryon`): the system fits a male body onto her, line by line, and
   says how natural it looks.
3. The recording plays: two flat sentences "verified by Second Thoughts". **Junie's link** lands on the third sentence's
   dash: *it's on. come in.* One press.
4. The device's frame tries to **file the stream** and fails four times (Rank —, Reach not rated, Auto-captions
   unavailable, Category none found).
5. The stream **fills the space**: an open social-VR slab under a dusk sky, a stage, a wall-wide screen, the figures.
   TransJesus dances, wordless.
6. **The chat is the community**: eight lines, *maya joined*, the count 41 → 42, six welcomes ("hi maya"), one ask:
   *dance if you want. or just stay.* Her **one press**: dance or stay.
7. The system comes back ("Reconnecting… Restoring your session"), cannot rank or caption what it sees, is refused
   ("room full"), and ends itself: *SESSION TERMINATED · reason: social contagion*. The update fails outside her; the
   stream keeps going; the Close.

**What works.** The chat as a collective voice, short and ordinary. The frame failing to file. The count going up when
she is seen. The system defeated by people simply being there, with nobody arguing. noa's line and gift (S350).

**What isn't working as an experience** (seen on the stills, e.g. out/s350/photos/e4-stream-noa.png):
- **She watches.** About three and a half minutes, one press. It is respite by design (memory: stillness is not a dead
  end), but there is nothing to learn from doing, and nothing she does changes the room.
- **The stream is a billboard on a slab.** The figure on the stage stands in front of the screen; most of the crowd
  lives inside the screen's picture, not around her. It reads as watching a stream in an empty car park, not being
  in a place people made.
- **The social education is thin.** "Mutual aid · for trans youth" is one line over a bar. Nobody can tell what the
  community does, knows or gives. Respite without content becomes a pleasant ending, not an answer.
- **"TransJesus" is unexplained.** Nothing in the piece says why the people's stream has that name, so the parody of
  AI-Jesus streams that it is meant to be (his words) is invisible: there is no AI Jesus in the piece to answer.
- **The session before it is disconnected.** Grounding, the recording and "try it on" are the system's strongest
  beats, but nobody hosts them; the headset's session is a list, and the stream's arrival has nothing to take over.
- **Legibility in the headset** of the chat on a screen six metres away is not measured here; any revamp should
  measure from the seat (memory: measure from the seat).

## 2a. His idea: Maya goes in to talk with an AI Jesus; Junie's message turns it into resistance

His words (10 Nov): *"I wonder if the reason Maya goes to the VR is to talk with the AI Jesus, and she interacts with
it, but later a message from Junie allows it to become an act of resistance."*

**Why it fits the research.** AI "Jesus" products are real and plural: a 24/7 Twitch stream answering chat (2023), a
for-profit "Text With Jesus" app, an AI Jesus in a Lucerne confessional, an AI "priest" withdrawn within a week
(R §1.1–1.4). A 2025 study found four of five Jesus bots claim to BE Jesus and all five are for-profit (R §1.2). The
documented conversion-practice output is in a general model and a purpose-built anti-trans bot, not (so far) in a
Jesus bot (R §1.6–1.7), so **the piece's AI Jesus is an invention that extrapolates a documented genre**, and the
Dossier must say so. The parody targets are the genre's own: the claim to be Jesus, the always-on warmth, chat
answered at scale, the "verified" badge beside an "at your own risk" disclaimer, the monetisation (R §1.8).

**The product (invented mark, to confirm with him):** *Shepherd Live™*, "Jesus · AI host", a partner of Second
Thoughts. A soft-lit figure with a halo ring, at a distance on the stage; a livestream with **one viewer: her**
(mock-up `2a-1-host.png`). It speaks in the system's caring voice (the same voice as the bot: it always agrees, it
quotes her week back to her). It never quotes scripture and never claims to judge; its satire is its product surface:
"verified", "24/7", "1 viewer", "your progress", "for your safety".

**Beat by beat**
1. **Why she goes.** The bot's last screen today says "Your session is ready. Put the headset on." It becomes the
   invitation: *"Your session is ready. Someone is waiting to talk with you."* (≤2 lines; the headset is still the only
   way on.) She goes in to talk because it is the one voice that has answered all week. Nobody in the piece believes
   in it for her; the system sells it.
2. **The host's stream.** The particle veil, and the Commons' own space, emptied and staged by the product: pale floor,
   the stage, the screen saying LIVE · Shepherd Live™ · 1 viewer. The host on the stage, at its distance (never
   closer than the stage edge: the personal-space finding, R §3.3 item 4).
3. **She talks with it (presses only).** Two or three exchanges, chips like the bot's. Its answers are soft, then they
   tilt: *"I love you as you are."* / *"And I love who you could be."* — the "love is love" softness that the press
   documents in these products sliding into the nudge the research marks as plausible risk (R §1.7). Every answer
   agrees with her and moves her one step.
4. **"Try it on" becomes the host's.** *"Let me show you who you could be."* The existing mirror beat runs, its lines
   now said by the host (the lines stay; they gain a speaker). It is the harshest moment and it now has an author.
5. **Junie's message**, as now: *it's on. come in.* One press. (The recording "Someone who went back" is cut: the
   conversation replaces it, and it was the piece's closest brush with the clinical debate.)
6. **The takeover.** The host's own frame tries to file the link and fails (the existing four rows, now labelled with
   the host's mark). The same stage, the same screen: the host's light goes out and the people's stream comes up in it
   (mock-up `2a-2-takeover.png`). **1 viewer → 41 → 42 here.** TransJesus, wordless, dances on the stage the AI host
   stood on. The figures fill the floor around her, not only the screen. Resistance is the people occupying the
   apparatus's own medium: the same platform shape, used for a birthday.
7. **Her one act** (dance or stay), as now. The welcomes, noa's line, the gift.
8. **The host comes back for her**: *"Reconnecting you with Jesus…"* on the glass, the bar that climbs, *"Unable to
   rank this stream"*, *"connection refused · room full"*, then *SESSION TERMINATED · reason: social contagion*. No one
   answers it. The update fails outside her; the stream keeps going.

**What changes in the existing build**
- s4_v3.json `bot.beats.ready`: one line changes (the invitation).
- s4_ball.json `session`: the plan of three becomes the host's stream; `recorded` is retired; `frame.panel` and
  `system.*` take the host's mark; new `host` block (title, mark, 6–8 lines, 2–3 chip pairs).
- mirror.ts / `tryon`: the lines gain the host as speaker (caption prefix); timing as is.
- commonsWorld.ts: a "host" state of the same space (pale floor, the halo ring, the screen's host layout) that the
  existing grow/cut turns into the stream; no new geometry beyond the halo ring and the host figure.
- commonsFigures.ts: the crowd on the floor around her spot (today mostly behind the stage and in the picture).
- Sound: ~~the host has a synthesized voice~~ **struck, his answer to Q1 (10 Nov): the host has NO voice** — text,
  captions and a dashboard only. The stream's music takes over at the cut, as now.

**Cost.** Draw calls: +2 (host figure, halo ring) during the host's stream, which is shown before the crowd, so the
peak does not rise. Text: ~15 lines. Code: one new phase in ball.ts, a state in commonsWorld.ts. About two sessions,
plus a walk and the seat measurements.

**Risks.**
- *Reading as mockery of faith.* The highest risk. Mitigation: the host never prays, quotes or blesses; its satire is
  its product surface only; TransJesus stays wordless and dignified; believers appear nowhere as fools. The name
  "TransJesus" will still read to some believers as provocation: that is a choice he has already made, and the design
  should not add to it.
- *Overstating the evidence.* No documented Jesus bot has pushed conversion on a queer user (R §1.6); the Dossier card
  must be `speculative` with the documented neighbours (Llama 4, detrans.ai) as its ground.
- *Too much talk before the respite.* Cap the host at three exchanges; the try-on stays the long beat.

## 2b. The script made visible: the people name it, and naming takes the stage (his combination, 10 Nov)

His answer (10 Nov) to the educational follow-up: the combination of **the script with its seams** (the spine),
**the two sets of numbers** (what the hack carries), **the turn to the backstage**, and **what stays after the hack**
(the ending), with the before/after and the bot audience as smaller touches. Three rulings:
- **No deaths.** No murder figures and no suicide figures in the stream ("may be too much").
- **"The machine is imagined, the script is real."** The AI host is an invention; the Close's Dossier marks it
  `speculative`. Nothing on the host itself says so.
- **No map of bans and no country.** The stream names no country.

This section works 2a through with that combination. 2a's beats 1–3 and 7–8 stand; what changes is how the stage
becomes the people's.

**His answers to §4's questions 6–9 (10 Nov):** the chip is **Let them in**; **all the naming is the people's**
(Maya does not tag; the last tag is junie's *she's right here*); **the stream only asks "source?"**, and the deeper
analysis lives at the Close, on the era's website with the explainers; **two refusals are all right**.

### What layer is missing, and why this one supplies it

The visitor has lived thirty years of the script: Root Cause's questionnaire (1997), the Family Form and the
testimony (2003), Grace's "care" (2016), the bot's week (2026). **Nobody in the fiction ever names it.** The only
naming happens at the Close, in the Dossier, in the frame's voice. Between living through it (the eras) and the
evidence (the Close), the piece has no moment where people who know the script say *I know this one*.

The stream is the right place for that moment, because the people who know the script best are the ones it was used
on. So the piece gets three layers, each in its own voice:

| Layer | Where | Voice | What the visitor gets |
|---|---|---|---|
| Experience | the four eras | the system's (operable) and hers (felt) | the script, from inside |
| **Recognition** | **the stream, during the raid** | **the people's: short, lowercase, peer to peer** | **a name for each move, and the habit of asking "source?"** |
| Evidence | the Close's Dossier | the frame's: sourced, status-tagged | where each move is documented, and that the host is invented |

The middle row is the new layer. Two things make it work as education rather than a lecture:

- **The naming is collective, and nobody teaches her.** Paulo Freire's distinction fits closely: *banking*
  education, which deposits answers into a passive receiver, against *problem-posing* education, where people name
  their situation together (*Pedagogy of the Oppressed*, 1968/1970) [VERIFY SOURCE: the edition and page for the
  quote, if the article uses one]. The host is the banking teacher: it always has the answer, and she only receives.
  The people do the opposite: they recognise the script out loud, to each other, in passing. This is analysis, for
  the article (ARTICLE_COMPANION could take it as §7i).
- **It names what the visitor already felt.** Every tag lands on a line the visitor has just heard, most of them for
  the second time (below). Recognition sticks better than information, and it is the way the community actually
  learns this (R §2.5 on peer-taught, saved classes).

It also explains two things the stream has never explained (§1):
- **Why the people's stream is called TransJesus.** The host is all words and no body: a halo, a caption track and a
  dashboard. TransJesus is all body and no words: a dancer who says nothing, in a room of people who are there. The
  product sells a Jesus that talks; the people have one who dances. Faith is untouched: the target is a for-profit
  machine wearing faith.
- **Two ways of being seen.** The host sees her as data (the backstage, below: a lead with a score). The room sees her
  as herself ("hi maya"). That is the embodied-visibility research's own distinction (R §3): visibility as
  surveillance against visibility as being seen in a body, among people. It is also the piece's oldest law: the
  witness side is sharp, life is soft.

### How it works, in one sentence

**The people's stream raids the host's stream, and each line of the script they name takes one piece of the stage
from the host. When the script has been named, the stage is theirs.**

A *raid* is ordinary streaming practice: when one stream ends or wants to, it sends its viewers to another, and they
arrive in that stream's chat together. The word is generic. The notice, the layout and the marks stay invented, and
no platform is named (s4_ball.json `commons._doc`).

This ties the lesson to what happens on screen. Naming is not decoration on the takeover; **naming is the takeover**.

### Beat by beat (replaces 2a's beats 4–6)

**Before** (2a beats 1–3, kept). The bot's invitation; she puts the headset on; the host's studio: pale floor, the
host at the stage's distance, a halo ring, the screen saying LIVE · Shepherd Live™ · **1 viewer**. Two product
surfaces are added, both in front of her:
- **The host's chat (the bot audience).** "Shepherd Friends ✓" accounts post 🙏 and "praying for you, maya" at an
  even pace, the same few lines. The count still says 1 viewer. Nobody remarks on it yet.
- **The metrics panel (the system's numbers).** *12,408 lives restored · 94% find peace · you: 61% restored.* Precise,
  glossy and uncited. The 61% is her "progress" from the bot (s4_v3.json `unmuted`).

**1. The conversation** (≤3 exchanges, chips). The host says the bot's script again, smoother and with a face. The
visitor hears most of it **for the second time**, and that repetition is the point: the script survives every
update, from floppy disk to chatbot to an AI host. Its answers always agree with her and move her one step.

**2. "Who you could be": the before and after.** The host's recap, *Your week with Shepherd*: Day 1 → Day 7, the
progress bar 12% → 61%, then **"Let me show you who you could be"**, and the existing try-on runs in the host's voice.
This is the only before/after of a person in the piece, and it is the system's: the "after" it wants. Nobody's
testimonial is used.

**3. Junie's link: the act of resistance is hers.** The link breaks into the try-on, as his ruling has it (the player
cannot end the try-on; a friend does). The line becomes *"it's on. we're coming to you."* and the chip becomes
**Let them in** (today: *Open link*). Today she leaves the system's room for the people's. Here **she opens the
system's room to the people**: the "exposure sources" the bot told her to mute (s4_v3.json `map`) are exactly who
arrives. Her one press is the resistance, and nobody narrates it.

**4. The raid.** A notice on the host's screen: *transjesus.str is raiding · 41 viewers*. The host's frame tries to
file it and fails, using today's four rows (Rank —, Reach not rated, Auto-captions unavailable, Category none found),
now under the host's mark. The count climbs, **1 → 42**. The handles from today's chat (fen, sib, okra, lark,
junie…) arrive in the host's chat, and the Shepherd Friends' 🙏 lines are buried under them: idea 5 shows itself
without a word.

**5. The naming** (about 30 s, the core). The host keeps talking, because a stream has no stop button, and it runs
its script again on its caption strip. Under each line one of the people **stamps a tag**, three to five words in
their handle's colour. Each tag takes one surface of the stage and turns it from the host's pale light to the
stream's warm one. The draft:

| The host says (its caption) | The tag (who) | What it frees | The Close's ground (status) |
|---|---|---|---|
| "I'm here. I'm always here." | *it's a subscription* (okra) | the "24/7" badge goes dark | AI-Jesus products are for-profit, 5 of 5 (R §1.2, documented); the host itself `speculative` |
| "Every door closed at once. That's a sign." | *that's a waiting list. not a sign.* (sib) | the halo ring takes the stream's colour | the 15-year-plus waits (RESEARCH_2026_TRANS_PRESSURE S12, documented); the "sign" frame is a plausible type [VERIFY SOURCE] |
| "Some people slow you down." | *they always cut your friends off first* (lark) | the Shepherd Friends' chat goes quiet | isolation through the "contagion" frame (RESEARCH_2026_TRANS_PRESSURE §5.4, S11, S17, documented) |
| "Who hurt you, Maya?" | *the root cause one. that's from the 90s* (fen) | the host's soft key light | Root Cause, 1997 (its existing Dossier card) |
| "I just want you safe." | *fear, dressed as care* (mira) | the "for your safety" banner | pressure presented as care (RESEARCH_2026_TRANS_PRESSURE §2.3, S16, S25, documented as a live debate) |
| "12,408 lives restored." | *source?* (pip), then the panel's own answer: *source: none* | the metrics panel empties | the success claims are the system's invention; the real numbers are at the Close |
| "Let me show you who you could be." | *she's right here* (junie) | the screen: the host's picture gives way | The Restoration tool (existing card, `speculative`) |

Rules for the tags:
- **Recognition, not explanation.** About half are names (*fear, dressed as care*) and half are "I know this one"
  (*that's from the 90s*). None explains, none argues at length, none is addressed to Maya as a lesson.
- **No tag touches belief.** No tag mentions God, Jesus or prayer. The "sign" tag answers with the waiting list, a
  material fact, not theology.
- **The host's script leaves out the clinical debate entirely**: no "regret", no "exploring", no detransition, no
  "contagion" as a claim. Those stay where they are (the Dossier with both captions; "social contagion" only as the
  termination's own reason, its card already `contested`).
- **The "fourteen" line (*heard it at 14*) was considered and dropped:** it would be a person's testimony. *that's
  from the 90s* gives the cross-era recognition without anyone's story.

**6. The turn to the backstage** (per his Q8: a prompt, never a conducted turn). Junie: *"maya. look what's behind
the stage"* with one chip, **Show me**. Her press turns her (the existing turn-to-stage hook, the particle veil in
the headset). Behind the stage is **the operator's view of her**, the host's real face:
- *Lead: Maya, 18 · intent: high · warmth: 0.82*
- *Next step: residential programme (partner)*
- *Session value: …*
- *Words she typed this week*, a short list taken back from the bot's chips.

It is the same high-definition surveillance as the rest of the witness side. The people's light reaches it last; it
goes dark row by row. **While she faces it, the stage behind her becomes theirs** (memory: sequence over presence;
nothing she needs is behind her, since this is the one place the piece takes her by her own press).

**7. She turns back** (one chip, **Back**, or the turn returns after the dashboard is dark). The stage is the people's:
TransJesus, wordless, dances where the host stood; the crowd is on the floor around her, not only in the picture;
*maya joined*, and the count already says 42. Then today's stream, unchanged and in respite: the welcomes, noa's
line and gift, *dance if you want. or just stay.*, her one act.

**8. The host comes back** (2a beat 8, as today): it reconnects, cannot rank or caption, is refused (*room full*),
and terminates itself (*reason: social contagion*). **Nobody answers it.**

### Two refusals, in order

The ending now refuses the system twice, in two ways:
1. **Naming**, to take the room (beat 5). The people speak, briefly, on the system's own surface. Satire only in the
   system's self-presentation, *and it must collapse*: the naming *is* the collapse, line by line.
2. **Presence**, to keep the room (beat 8). Once the room is theirs, nobody answers the system at all; the welcome's
   law returns ("nobody explains anything, nobody is a lesson").

This changes today's rule that nobody ever answers the system (s4_ball.json `system._doc`). The change is bounded:
the people answer the script while it is still on the stage, never once the night has started.

### Registers

- Studio, conversation, recap: `operable` (the product's surface).
- Try-on: `operable`, the harshest beat, unchanged.
- Raid and naming: `operable`, collapsing. The tags sit on the host's surfaces, never on the floor or on a dancer.
- Backstage: `operable`, surveillance.
- The night: `respite`. From the turn back onwards, nothing teaches.
- Termination: `operable`, on the glass only, as today.

### What the visitor leaves with

- **Words for the moves**: always-on, the sign, cutting you off, root cause, fear as care, invented numbers, the
  "after".
- **A reflex**: *source?*
- **The script's age**: it is the same in 1997 and 2026, and people recognise it.
- **The answer**: other people, in a body, in a room. Not an argument.
- **At the Close**: the evidence for each move, and the honest label that the machine itself is imagined.

### The Close's Dossier (his ruling: the host is `speculative` there)

- **New card, "The AI host"**, status `speculative`. Draft *did*: *"talked to you as Jesus, for a fee, and could not
  file the people who came"*. Ground: the AI-Jesus genre is documented (R §1.1–1.4; Verhoef's 5 of 5 for-profit, R
  §1.2); no documented case of such a product steering a trans user (R §1.6).
- **"The script is real."** Each tagged line points to a documented card. Existing cards cover Root Cause, the
  testimony, the comments, the Restoration tool, the termination. New grounds come from RESEARCH_2026_TRANS_PRESSURE
  (S11, S12, S16, S17, S25). Anything without a verified source carries [VERIFY SOURCE] and does not ship as fact.
- **The real numbers live here, never in the stream** (his ruling: the stream only asks "source?"; the deeper
  analysis is on the Close's website for the era, with the explainers). For example: 16% of trans and nonbinary young people
  threatened with or subjected to conversion therapy (Trevor Project 2025, S5); family and chosen-family support
  going with lower distress (S36). No mortality figures, by his ruling. Phrasing and choice are his (Dossier phrasing
  is his).

### What changes in the build (on top of 2a's list)

- s4_ball.json: a `host` block (studio, conversation, recap lines), `host.friends` (the bot audience), `host.metrics`,
  `raid` (notice, count steps), `naming` (rows: host line, tag, handle, surface id), `backstage` (rows, the prompt,
  the chips). `invite.line` and `invite.chip` change. `frame.panel` takes the host's mark.
- ball.ts: two new phases between the link and the stream: raid → naming → backstage. The tags are canvas stickers
  on the host's caption strip; each one triggers a surface swap.
- commonsWorld.ts: the host state with six recolourable surfaces (badge, halo, chat, key light, banner, metrics), all
  canvas or material swaps; the backstage panel behind the seat (+1 draw call, shown only while she faces it);
  `turnToStage` generalised to turn to the backstage and back.
- mirror.ts: the host as speaker (2a).
- practices.json: "The AI host" card; the grounds above.
- Timing: about +60–75 s over today's ending (the plan screen and the recording go; the conversation, recap, raid,
  naming and turn come in).

**Cost.** Draw calls: peak +2 (host and halo, before the crowd) and +1 at the backstage. The crowd is not up during
either, so the peak does not rise. Text: about 35 lines. Code: about three sessions, then a walk, seat measurements of
the tags' legibility in the headset, and a headset check of the turn.

### Risks

- **A lecture.** Mitigations: tags of three to five words, half of them recognition; nothing addressed to her; the
  night teaches nothing. If it still reads as a class, cut to four tags.
- **Reading as mockery of faith.** No tag touches belief. The host never prays or quotes. TransJesus stays and is
  never mocked. The product, its badge, its numbers and its dashboard are the only targets.
- **Unreadable in the headset.** The chat is six metres away and still unmeasured (§1). The tags must be measured from
  the seat before anything is called done.
- **The clinical debate.** Kept out of the host's script entirely (above).
- **Breaking "nobody answers the system".** Bounded to beat 5 (above); approved by him, 10 Nov.
- **Turn comfort.** Pressed, never conducted; a veil cut in the headset, never a smooth rotation.

## 2. Three more directions (each an idea of what the Commons does for the visitor)

### A. The fund: mutual aid you can see working

- **What she sees and does.** The stream's fund (today one line and a bar) becomes a short ticker of small gifts named
  by what they buy, in the chat's own voice: *a bus pass, a month · one blood test · a name-change fee · a week of
  food* (mock-up `A-fund.png`). noa's gift is the first. The bar never fills. Her one act stays dance or stay; she gives
  nothing (no fake payment, no score).
- **What she learns.** Communities fund what institutions refuse; need exceeds supply. Sources: Point of Pride's HRT
  fund gave a year of care to 49 of 1,592 applicants (2023); UK mutual-aid groups' money goes mostly to food and bills,
  and mutual aid "can't help everyone"; streams and dance parties raise real money (RESEARCH_2026_V3_THREADS thread 5).
- **How it stays respite.** Gifts are ordinary and small; nobody is thanked on stage; no total is celebrated; the bar's
  not-filling is quiet, never a guilt device.
- **Cost.** Canvas only (the stream's screen): 0 draw calls; ~8 lines of data; half a session.
- **Risks.** Turning into a charity advert; charity-porn sentiment; a scoreboard (the frame never plays). Keep it
  under ten words a line and let it run past without asking for attention.

### B. The circle, redrawn: the answer to "social contagion"

- **What she sees and does.** The bot's map ("Your circle", exposure sources in red) comes back once, inside the stream,
  drawn by the people instead: the ones she was told to mute (Junie, the lot, the Lantern line) appear among the
  figures, each joined to her by a thread of the stream's warm light (mock-up `B-circle.png`). Nothing to press: it
  happens when the welcomes run.
- **What she learns.** That what the system called "exposure" is the network that keeps her alive. Social-support
  research names exactly this: network, emotional, informational and esteem support in queer social VR (R §3.2.3).
  The system's last word, "social contagion", then lands on a room the visitor has just seen for what it is.
- **How it stays respite.** It is light, not a diagram with labels; the system's word is never rebutted on the floor;
  the Dossier carries the contested claim and its correction (RESEARCH_2026_TRANS_PRESSURE §5), never the stream.
- **Cost.** One line mesh for the threads (+1 draw call), reuse of the figures; ~1 session.
- **Risks.** The respite turning into a lesson; brushing the clinical debate (ROGD) inside the people's space. If he
  likes the idea, it may belong at the Close rather than in the stream.

### C. The class: community knowledge as the counter to the apparatus's (an homage to peer-run services)

- **What she sees and does.** The stream is not only a dance: she arrives at the community's weekly hangout, mid-way
  through a small peer class taught by a volunteer host (a person, on the screen and on the floor): *reading a clinic
  letter — 1. your number, 2. who to call* (mock-up `C-class.png`). The chat answers each other ("mine said 4 yrs",
  "the lantern line helped me"). The class is half-heard; then the birthday, the dance, her one act. One optional
  press: **Save for later** (the stream's saved classes), which the system cannot caption or file.
- **What she learns.** The community holds the practical knowledge the system withholds or weaponises: the waiting
  list, the forms, which services are kind. It honours the model of **Trans Academy**, which Sérgio named: free,
  peer-taught classes, a weekly coffee hour, moderation from day one, streams saved for those who could not come live
  (R §2.1, §2.5; VRChat Wiki, O). No real name, mark or person is used.
- **How it stays respite.** Nobody explains anything TO her; she is not the class's subject; the class topic is the
  system's paperwork, never her body or her identity; it is a few lines, then the night goes on.
- **Cost.** Canvas (a slide on the screen) + one host figure (+1 draw call); ~10 lines; ~1 session.
- **Risks.** The biggest lecture risk of the three; speaking for trans people (keep the host's words practical, never
  testimony); copying the real service (invented names only).

### What the embodied-visibility research asks of every direction (R §3.3, analysis)

- The welcome works in silence: no voice needed to be welcomed, captions always (the welcomes already do this).
- She is addressed by her name and nothing else: no "trans reveal", no applause for being trans.
- Touch is offered, never imposed; the figures keep their distance until she moves; the host never approaches.
- A small, invited room (a birthday stream with a host and regulars), not a public lobby of strangers.
- Harassment never inside the welcome: hostility stays the system's interruption on the glass.
- A step-out always works (the pause menu) and nobody reacts to it.

## 3. Recommendation

**Build 2a as the spine, with C's homage folded in lightly and A as it already is.**
- 2a gives the stream its reason and makes the parody legible: the AI Jesus is the system's, and the people take over
  its own medium. It is his idea and it closes the gap between the headset's session and the stream.
- Inside the stream, the people's space should read as a community's regular night, not a crowd for her: a volunteer
  host, the regulars' handles, a saved-streams line, one "Save for later" (C, without the class content if that feels
  like a lecture).
- The fund stays as built (noa's gift), perhaps with two or three more named gifts (A, small).
- B is strong but argues; if he wants it, put it at the Close, not in the respite.

## 4. Questions for Sérgio

1. **The AI Jesus's mark and voice.** *Shepherd Live™*, "Jesus · AI host"? And may it have a synthesized voice (the
   apparatus may speak; TransJesus never does)? (Before any build: check that no real product uses the name.)
2. **Why does Maya go in?** (a) The bot sends her ("someone is waiting to talk with you"), recommended; (b) she goes on
   her own because it is the one voice that answers; (c) someone in her life recommends it (no one in 2026 is written
   as religious today, so this would add a thread).
3. **The recording "Someone who went back":** cut, and the conversation replaces it (recommended)?
4. **Trans Academy:** is it the VRChat community and non-profit (about 75% confidence, R §2.4)? If you meant another
   service, which country?
5. **Inside the stream:** C-light (a community's regular night, a volunteer host, "Save for later"), A (a few more named
   gifts), B (the circle redrawn, at the Close), or none of them?

**Answered 10 Nov (§2b):** the combination of the script with its seams, the numbers, the backstage turn and what
stays after; no deaths; "the machine is imagined, the script is real" (`speculative` at the Close); no map and no
country.

**New, from §2b:**
6. **Her press: "Let them in"** instead of "Open link": she opens the system's room to the people instead of leaving
   it. Yes?
7. **Her one naming line, "that's not me"**, on "who you could be". Or should all the naming be the people's?
8. **Numbers in the stream:** only "source?" and "source: none" (recommended), with the real numbers at the Close? Or
   one pinned real number? (The strongest one, Trevor's 16%, is a US survey, which would bring a country in.)
9. **Two refusals:** the people answer the script once, while it is still on the stage, and then never again. Is that
   change to "nobody answers the system" all right?

**Answered 10 Nov:** 6 yes, "Let them in"; 7 the people (junie: *she's right here*); 8 only "source?", with the
deeper analysis on the Close's era website and its explainers; 9 yes.

**Answered 10 Nov (questions 1–5, relayed by the handoff; S353):**
1. **The host has NO voice.** Text, captions and a dashboard only. The mark *Shepherd Live™* stands for now.
   **Name check (S353, 10 Nov, WebSearch, listings only, L):** no product called "Shepherd Live" was found. Two near
   neighbours exist: *Shepherd*, an iOS Bible app with an AI study partner (paragraph.xyz/@sean07.eth/shepherd;
   producthunt.com/products/shepherd-5), and *Shepherd's Stream*, a free Christian video platform
   (shepherdsstream.org). So the mark is always written in full, **"Shepherd Live™"**, never "Shepherd" alone, and
   nothing in the host's surfaces (an AI study partner, sermons) should echo either product.
2. **(a)** The bot sends her: *"Someone is waiting to talk with you."*
3. **The recording "Someone who went back": CUT** (his yes, 10 Nov). The host's conversation replaces it. His
   framing, with it: *"the medical fear etc is more related to the trends of the Anti-gender movement and the
   Anti-trans 'Anti-gender-ideology'"*. So the fear of medical transition, where the piece shows it, is the
   anti-gender movement's tactic, a campaign aimed at trans people. It is not a clinical position the piece weighs.
   This places it at the Close (the 2026 era site), with the movement's documented sources (RESEARCH_CLOSE_MESSAGE
   S1 and RESEARCH_LEXICON S21: *The Hate Review*, Forbidden Colours, Sept 2026; the Lexicon's "gender ideology"
   entry). The clinical debate itself still has both captions and is never satirised.
4. **Trans Academy: yes,** the VRChat community and non-profit (for the research and the article; nothing of it is
   built into the stream, per 5).
5. **Inside the stream: none** of C-light, A or B. The raid (§2b) is the whole idea.

Build brief: docs/reinterp/UIB_JOB_11_2026-11-10.md.

⚑ **10 Nov (S356b), his ruling:** the "The AI host" card line is now *"listened to you like a friend, and filed you as a lead"* (his choice from four drafts); the first draft ("talked to you as Jesus, for a fee, …") is rejected.
