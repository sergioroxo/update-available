STATUS: live

# DESIGN NEXT — his notes of 2026-09-27, thought through
*Four design questions from Sérgio's 2026-09-27 message, each with what exists, what I recommend, and what
waits on him. Nothing here is built except where marked BUILT.*

---

## 1 · The Witness system — does his research fit? (`~/Pc_Simulation/Sources/Deep Research/Witness system.md`)
**Yes, closely.** It read our own plans (THE_RECORD_PLAN, THE_WITNESS_SYSTEM_PLAN) and the code, and found the
same gap his ear found: **a player hears the stamp without seeing what was filed.** The thump was the stamp
(S177 made it a tick); a tick nobody can connect to anything is still noise.

| its recommendation | where we are | my call |
|---|---|---|
| **One guided first filing**: the stamp, the wall row lighting, and an Era 1 system side-message pointing behind you | the stamp plays and the caption strip already says `[a stamp: filed]`; the wall is behind the player and optional on the map | **Yes — build it.** Era 1 has no assistant, but impersonal side-messages are allowed (R28 §2): the first time only, *"Something was filed about you. It is behind you."* while the wall row glows. After that, silence and choice. |
| **Era-specific counts on the devices** (Vera's chip, Maya's badge show the whole run's count while their pages list only their own) | confirmed in the code: `graceQueueLite.ts` chip and `browser.ts` badge both read `witnessPulse.count()` | **Yes — a bug. BUILT S178** (`pulse.countFor(era)`): the device shows its person's count; the run's total stays in the menu and the Close. |
| **Per-entry reading**: what you did → what was filed → the practice → how well it is documented | exists in the menu's *Your file* | **Yes, a way in from the device records** — the record page gets one line: *"what this means — menu › Your file"*. |
| Each update transition says whose file it is, what carries across, what changes | the map has the eras; the transitions do not say it | **Yes, in the update's changelog** (it is already the place the system talks about itself): one line per update — *"Records migrated: 1 (scanned)"* at 2003; *"New record: 1 — prior records retained"* at 2016 and 2026. The system's voice, telling the truth about itself. |
| Feedback = the experience showing the player how they were classified, not collecting comments | agrees with the no-storage law | **Yes.** |

**On the new stamp sound:** it IS higher than the thump — a short bright tick (12 ms of noise above 2.5 kHz and
a faint high ping). If it reads as too sharp or "pitchy" on your speakers, the middle option is a dry wooden
*tock* around 1 kHz — no bass, no ping. Tell me which after you hear it.

## 2 · FloppySheep — a reworked game, and its song
**What he asked:** more worked, in the Chrome-dino style, connected to the conversion programme; the song
(`Pc_Simulation/Trials Songs/FloppySheep/…v3 (Extended 1).ogg`, 4:38, with its timed lyrics) playing in the big
white space, with a button, the lyrics passing there.

**Proposal:**
- **The run** — the dino's grammar exactly: one button, a flat monochrome horizon, speed that creeps up. The
  sheep runs **the narrow path** between two fences ("Mind the fences!" is already the game's tagline). What it
  jumps over are the programme's own words for a life — *"a second glance"*, *"old friends"*, *"a song on the
  radio"* — printed on the hurdles in the platform's cheerful type. Satire of the seller only: the hurdles are
  the programme's vocabulary, never queer people or things.
- **The score is a streak.** Distance is *"days pure"*; a collision is not "game over" but **"LAPSE — report
  to your group?"** with one live button (*Report*) and one greyed (*Don't*), the platform's own accountability
  (e3_theday #0–#2: a lapse is confessed, not punished). The run restarts at zero. The song's own lines: *"Every
  death is one step more"*, *"Every flap is a confession"*.
- **The white space** — a *♪ Play* button; the lyrics scroll there line by line in time (his LRC file carries
  the timestamps), karaoke-style, in the game's palette. Off by default; the game is silent until pressed.
- **The song** is his (Treblo generation) — project-owned, a row in LICENSES.md, registered in tapeAudio.

**Other mini-games — one per era, each the apparatus gamifying the same thing:**
- **1997 · "Virtue Pet"** — a Tamagotchi-shaped pet on Daniel's screen that is fed by answered questionnaire
  items and gets sad when he skips them. (Invented mark; the pet is the programme's.)
- **2003 · "Straight & Narrow"** on the flip phone — a snake that must never turn back on itself, its length the
  streak. (Not "Snake" — invented mark, own rules.)
- **2016 · FloppySheep** (above).
- **2026 · "Daily Spin"** — a reward wheel in L's app that always lands on *"Try again tomorrow"*: the streak
  mechanic with nothing left inside it.
Each is small, optional and never required to finish an era. **His call which to build.**

## 3 · Social media — the groups, the pages, the servers
**He is right that it is thin.** What the piece has: 1997 message boards and an IRC channel; 2003 a messenger;
2016 a private group chat (Maiden-to-be) and a comments feed; 2026 a browser, an agent, the Commons. What it
lacks: **the public-facing recruitment layer** — Facebook groups and pages, YouTube testimony channels,
Discord servers with roles and bots, recommendation feeds that route a search to a "ministry".

**Yes — ask GPT, and I will think alongside.** A prompt to paste (Deep Research, as before):

> I am designing an interactive artwork about how conversion-practice (SOGICE) networks reach LGBTQ+ people
> online, across four eras (1997, 2003, 2016, 2026). The piece already stages message boards, IRC, a
> messenger, a private group chat, a comments feed, a browser and an AI agent. I want to understand the SOCIAL
> MEDIA layer it is missing. For each era, and with sources: (1) which platforms and group forms were used
> (e.g. Facebook groups/pages, YouTube channels, Discord servers, Telegram, forums, apps), (2) how people were
> found and drawn in (search, recommendation, ads, invitations, testimony videos, influencers), (3) how groups
> kept members (moderation, roles, accountability, streaks, private channels), (4) what platform moderation did
> and did not do (removals, policy changes, evasion by rebranding), and (5) what is documented versus reported
> versus speculative. Flag anything contested; do not generalise from one case. Cite primary sources and
> independent reporting (GPAHE, Outright International, academic studies).

**My first thoughts, before his run comes back:** the strongest single addition is probably **2016's public
page** — the group Vera moderates for has a public face (a page with testimonies, likes, a "join our private
group" button), and her work queue is where the public comments are "corrected" before anyone sees them. It
ties the social layer to the labour the era is already about. For 2026, a **Discord-like server** in the
browser, with a welcoming bot and a role you are given on arrival, would show how the apparatus now lives inside
community tools.

## 4 · The style — mock-ups
Separate document with images: `STYLE_PROPOSAL_2026-09-27.md` (in progress).

## 5 · The Leave page — BUILT S178
All three readings, as he asked ("can they all be included?"): the burn-in paragraph, the H-O-P-E acrostic
under See also, the starfield that gathers into *NOTHING IS / WRONG / WITH YOU* for 3.5 s of every 30 (never
in the first 23 s — a person may have opened the page because someone is looking). Screens: `out/leave/`
(`node tools/leave-stills.mjs`).
