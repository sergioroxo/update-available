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
- Sound: the host has a synthesized voice (build-time TTS is allowed for the apparatus; never for a person); the
  stream's music takes over at the cut, as now.

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
