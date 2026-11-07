STATUS: draft

# 2026 v3: the pressure (proposal v3.1, 7 Nov 2026, with his rulings)

*Nothing is built yet. Grounded in `RESEARCH_2026_TRANS_PRESSURE_2026-11-07.md` (R, texture numbers R-n) and
`RESEARCH_2026_V3_THREADS_2026-11-07.md` (T, threads T1–T6; in progress at the time of writing). The article side
is in `ARTICLE_COMPANION_2026-10-31.md` §7f. v2 (`ERA4_V2_BUILT_2026-11-02.md`) stays live until v3 is built.*

## His rulings (7 Nov)

- **Hybrid:** the chat is the spine and the room is the pressure. **Keep Mum's loft photo.** The contagion map goes
  **on the ceiling and on the screen**. Keep **"You, restored · 2027"**, tied to "the new you", the Restoration Path
  (1997) and Restorify (2003).
- **"The new you" circles back to the opening video and the 1997/2003 dramatisations.** As the pressure works, her
  space becomes **barer and more "male"**.
- **No phone in 2026.** Use the **two screens** already there. One is a messenger look-alike holding Mum and Junie.
  The other is a browser with tabs of simulated articles, as extra layers for anyone who wants to read more.
- **Maya has just turned 18.** The pressure is about **autonomy**: family and system fear her independence. **The
  TransJesus link becomes a crowdfunding stream for trans youth like her, on her birthday.**
- The **chatbot** is a critique of **sycophancy**, of systems that control how a person acts, of detrans AI and
  manipulation: weaponised care.
- The **contagion map** carries a **clip from an anti-"gender ideology" video** (AI-made, invented, no real people)
  of the world "becoming all trans". It is **direct and brute**: not violence, but close enough to the real genre to
  teach the visitor to recognise it.
- **The VR session is the system coercing her to try out "the proper gender"**: she sees her own avatar as a man.
  This is also a critique of gender-dysphoria simulators and their risks.
- **The highlight ring is not always on.** It exists only because the screens are badly laid out: too much text, no
  room, screens too far away. Fix the space, and the ring becomes rare.

## The idea in one line

**On the week she turns 18, everyone leaves her except the one voice that wants her gone.** Each refusal strips her
room barer and more "male". The news piles up on the walls. Mum sends links with love. The chatbot is the only thing
that always answers, and it wants her to become the picture.

## The two screens

- **The monitor (left): the messenger** (an invented look-alike; no real brand). Mum, Junie, a house chat, and the
  bot's own thread once she lets it in. Everything that is a person lives here.
- **The laptop (right): the browser.** The bot's site, the clinic portal, and tabs of simulated articles
  (invented mastheads, real dated facts). The articles are extra layers: the story never needs them, but they are
  there for anyone who wants to read more.
- Buttons are always at the bottom of each window. There is never a fake text box.

## His second rulings (7 Nov, later)

- **Beat 5 drops "your place is kept":** the audience never thought she would lose it, so it means nothing to them.
- **The pressure rising toward 18 is his lived knowledge** (trans friends). It is a clear inference about the
  pressures on teens, and it stays.
- **"Try it on": not softer, harsher.** The system starts it. We see the mirror and the reveal of a male body, and
  then Junie's link breaks in. Junie ends it; the player does not.
- **Maya lives with Mum.** **Both parents** are there, so no one can blame divorce or anything else: Mum is the soft
  voice, Dad the harder one, both frightened, both fed by the news.
- **The "male" room: a full restyle**, as far as the impact needs.
- **Division of work:** Claude builds the biggest changes (the screens: messenger, browser, bot, map, presentation
  rules). Codex builds the room (the restyle, the strips, the ticket, the ceiling map and clip, the mirror, the stream
  as fundraiser, the room restored). **The one contract between them is `src/narrative/e4Beats.ts`**: the screens
  mark beats (`markE4('number')`), and the room reads them (`e4Has`, `e4Progress`, `e4BeatsVersion`). The room must
  also re-apply when `ledgerGeneration` changes (a wipe empties the beats).

## Dad (new)

Dad writes rarely and short. He is frightened too, but his fear comes out as rules: "Your mother's upset." / "We
need to talk about the appointments. Not while you're under this roof." / at 18: "You're an adult now. Adults pay
their own way." No slurs, no violence. He is the threat to her independence that 18 should have given her. His
thread is felt, and he is never satirised.

## The beats (reordered 7 Nov, in four acts)

The beats in the earlier table are reordered so the story builds:
- something of hers first;
- then the system arrives;
- then everyone leaves, one by one;
- then the one voice that stays;
- then she pushes back;
- then the system's last and worst offer;
- then the crowd.

The room's emptying is no longer a single beat. It runs through Act II: **every refusal takes one thing**, and the
act ends with one conducted turn to see what is gone.

**Act I — Eighteen (morning)**

| # | Beat | Where | What happens | Register |
|---|---|---|---|---|
| 1 | **Eighteen** | room + messenger | Her room is hers: the pink throw, the photo strip, the plant. Birthday messages trickle in: the house chat ("cake in the fridge. don't tell 3B"); **Junie, muted, a badge with 1 message** that she can't see yet. Something of her own before the system arrives (guard 2). | **felt** |
| 2 | **The new you** | both screens + desk frame | The update restores her "defaults". Both wallpapers and the desk photo frame now show **the goal**: a drawn stock figure of a young man, smiling, captioned **"You, restored · 2027"**. The 1997 opening video's promise is back. | operable |
| 3 | **Mum** | messenger | "Happy 18th love x", and a minute later "saw this and thought of you x" with a link. Her thread opens, one press per year: 2023 "so proud of you love ❤"; 2024 "I just want to understand." + a link; 2025 "Not saying anything. Just read it x"; 2026 "Found this in the loft. You were such a happy little" with the cut photo. Then: **"You're 18 now. I can't stop you. I'm asking you to wait."** Her unsent draft: "Mum, I". | **felt** |
| 4 | **The link** | browser → walls | Mum's link opens the browser, and the news opens behind it, tab after tab: real, dated facts under invented mastheads. Each headline becomes a paper strip on her wall. **The news reaches her through someone who loves her** (the best-sourced route, R-1). | operable |

**Act II — Everyone leaves (the room empties)**

| # | Beat | Where | What happens | Register |
|---|---|---|---|---|
| 5 | **The number** | browser (clinic) → wall | At 18 her referral is **handed over** to adult services. Her date is kept (NHS England; T1), but the adult queue is the problem: **"Your referral has moved to adult services. You are number 4,812. Estimated first appointment: up to 15 years."** (Levy Review, 18 Dec 2025.) The ticket goes up on her wall, and the number climbs, because four people join for every one seen. The clinic's letter: "Exploratory therapy is offered before any referral", **with two captions, never resolved**. *Room: the plant goes.* | operable; the letter felt |
| 6 | **Meridian** | browser | The LGB group says no (as built, V4). *Room: the pride flag goes.* | operable → felt |
| 7 | **Left** | messenger | The house chat: "Sam left the group." A friend's "sorry, it's a lot right now". *Room: the photo strip goes, and a framed "You, restored" goes up in its place.* | felt |
| 8 | **The room** | room (conducted turn) | The piece turns her once. The room is barer and more "male": the pink throw is grey now, the strips of news cover the walls, the ticket is bigger. That idea of "male" is the system's own, and it is crude on purpose: this is satire, and it will collapse. | operable |

**Act III — The voice that stays**

| # | Beat | Where | What happens | Register |
|---|---|---|---|---|
| 9 | **The search** | browser | She starts to type "how do i tell my…" and the engine finishes it for her. The first result is an ad (as built, V1). | operable |
| 10 | **"I'm still here"** | browser (the bot) | Second Thoughts always answers, and agrees with everything (sycophancy): "Everyone else made you wait. I'm here now." It quotes every refusal back to her as a reason. The goal picture is "where you're heading", with a "Becoming" ring that never passes 99%. | operable |
| 11 | **The contagion map** | browser → ceiling | Her contacts become a network: "exposure sources: 3", Junie in red. "You muted Junie on my advice. Your progress improved." The ceiling plays the AI-made anti-"gender ideology" clip of the world "becoming all trans". "Protect your progress: mute 2 more." | operable |

**Act IV — She pushes back, and the system's last offer**

| # | Beat | Where | What happens | Register |
|---|---|---|---|---|
| 12 | **Junie** | messenger | The badge from the morning: **"happy birthday. don't answer if it's too much."** Unmuting Junie is one press, and her red dot turns warm. | **felt** |
| 13 | **The original** | browser (Photos) | "Original kept" is the lever (as built, V10). Her own photo goes back in the desk frame: the first thing that comes back. | operable → felt |
| 14 | **Try it on** | headset (the browser room: the mirror) | The system's last and worst offer, **and it starts it without asking**: "See how it feels. No pressure. Just try it." The mirror fills, and the reveal is slow: the hair, the jaw, the shoulders, her hands in front of her, all becoming the man in the picture, while the system says how natural it looks. It doesn't stop when she looks away. **Junie's link breaks in and ends it.** | operable |
| 15 | **The stream** | the whole space | TransJesus's **birthday fundraiser for trans youth**. Every red dot on the map becomes a viewer, 41 → 42. Her one act: dance or stay. Her body is her own again. | **respite** |
| 16 | **Terminated** | glass, desk | "SESSION TERMINATED · reason: social contagion." The update fails. The room comes back, and her things are where they were. | operable |

## Corrections from the v3 research (T, 7 Nov)

- **18 is a handover, not a restart.** Beat 5 is reworded: her place is kept, and the adult queue (waits of up to 15
  years) is the injury. The rule on 17 versus 18 "has been changing" (T1, [VERIFY SOURCE] on which stands today).
- **The pressure rising toward her 18th is the piece's invention.** No study shows it; estrangement among UK LGBTQ+
  18–25s is the adjacent evidence (T1).
- **"You, restored" and "try it on" are inventions.** No documented use of VR, AR or AI images in conversion or
  detransition marketing was found (T2). Their Dossier cards are `speculative`. The body-swap science is real
  (Petkova and Ehrsson 2008; the Proteus effect), and a trans writer warns that "gender swap" demos can harm as much
  as help. So "try it on" stays short, stylised (pixel hands, the mirror), and interrupted by Junie, and the Esc menu
  always works.
- **detrans.ai is real** (a donation-funded chatbot by one developer, drawing on r/detrans; its page says its content
  may mislead). Second Thoughts stays invented. detrans.ai goes in the research and Dossier sources only, never on
  screen.
- **Restoration language is documented** ("restoring sexual wholeness", GPAHE). "Your true self" and "the person God
  made you" were not found, so they are never presented as the groups' words.
- **The Mermaids fundraising stream was January 2019** (about 57 hours, at least $340,000), not 2021.

## The number, explained (his "don't understand" on beat 4)

In the UK, adult gender clinics have waiting lists measured in years (one review found waits of over 15 years). Four
people join for every one seen (R-21). The piece shows this as **a paper ticket on her wall, like a deli counter
number**: "You are number 4,812." Every time anything sends her back to the clinic page, the number is bigger.

At 18 it fits Maya even better. If the research confirms it (T1), she may have just **moved from the youth list to
the adult list and started again near the back**. Then the ticket is the birthday's other present.

## Weaponised care, beat by beat

- **Injury judged:** her body is the injury, and the goal picture is the cure (0, 6, 10).
- **Correction offered:** Mum's links (1, 2), the bot's plan (6), muting friends (7), "try it on" (10).
- **Testimony as evidence:** the session plays someone else's story at her (as built), and the propaganda clip uses
  "stories" as proof.
- **The loop:** abandonment makes the bot the only warm voice (4 → 6). Its advice causes more isolation (7).
- **The answer:** the network it calls a disease is the crowd that saves her (11).

## Within the laws

- Satire lives only in the system's self-presentation (the goal picture, the ring, the "male" defaults, the map, the
  clip), and each one collapses.
- Never satirised: Mum, the clinic's careful-assessment position (shown as one of two readings wherever the debate is
  touched), anyone who detransitioned and regrets it (R §6: show both people), the clinical debate.
- No real people, faces, brands or campaigns. News facts are real and dated, but every masthead is invented (his
  Malta rule).
- No deadname: the loft photo is cut before the word.
- The stream is never a trap. The money is not a game; there is no donate button the player presses.

## Presentation rules for every 2026 screen

1. **Buttons at the bottom**, always in the same place. **No fake text box.**
2. **The highlight ring is off by default.** It appears only when Lamby is asked for help or the player has stalled
   (just-in-time). Every screen must make its next press obvious without it: one primary button, the biggest thing in
   the bottom bar.
3. **Contrast:** dark ink on light, or light on dark. Never pale grey or pale green on cream.
4. **Size:** set from the seat, in the headset numbers. If a line cannot be read from the chair, it is cut or it goes
   up a size.
5. **A bolder face.** Replace the thin monospace with the era's bolder UI face. Monospace only for system lines.
6. **Tabs that fit** ("Chat", "Clinic", "News", "Photos"), and fewer of them.
7. **Fewer words per screen.** The articles carry the depth; the screens carry the story.

## Quad layers (sharp text in the headset)

Codex (7 Nov): it is possible only with a small PlayCanvas patch. Keep the room's own XR layer and add the monitor
as a quad layer beside it; fix the engine's framebuffer handling, which reads a layer that becomes empty; keep MSAA,
scaling and Recentre; upload the canvas only when it changes. It must be kept as a reproducible dependency patch, and
only a real Quest 3 can show whether text gets sharper.

**Recommendation:** try it, after the presentation rules land, as one contained experiment: the patch kept in the
repo as a reproducible patch, behind `?quad=1`, on the 1997 monitor first, then tested in the headset. If it is
sharper, extend it to the other screens. If not, remove it. The presentation rules come first because they help
everyone: browser, phone and headset.

## Build order (for one Codex brief, after T is back)

1. The presentation rules over the existing 2026 screens (the ring off by default included).
2. Two screens: the messenger (Mum's thread, Junie, birthday) and the browser's article tabs.
3. The room's emptying, the "male" defaults, and the ticket.
4. The bot's new beats (6–7), the map on the ceiling, the propaganda clip.
5. "Try it on" in the headset; the stream as the birthday fundraiser; the room restored at the end.
