STATUS: live

# WHAT IS MISSING — the narrative audit
*Sérgio, 2026-08-04: "let's go back to the narrative builds and check what is missing, that is the
most important part." Counted from the BUILD, not from what the docs claim: the debug panel (which
C6 forces to be complete), `data/dialog/`, and `src/desktop/apps/`.*

## ⚑ The headline, and it is one sentence

**Three eras are built and the fourth is an empty room. The ending is one button.**

| | desktop beats in the panel | dialog data | verdict |
|---|---|---|---|
| **E1 · 1997** | **14** — boot, profile, re-caption, kit, packet, diary + glitch, two provotypes, two easter eggs, the T1 ritual | `s1_end` `s1_guide` `s1_irc` `s1_kit` `s1_tapes` | ✅ **dense** |
| **E2 · 2003** | **18** — silence, boot, Lamby's debut, Restorify, the whole Caleb thread, the NetVision infomercial + the break, PureMail, the residue, the T2 ritual, the dispersal | `s2_caleb` `s2_lamby` `s2_media` | ✅ **dense** |
| **E3 · 2016** | the correction list, Noa's video + the preset, the comments + propagation, FloppySheep, Malta, the light | `s3_queue` `s3_comments` `s3_floppysheep` | ✅ **built** — §1 of a six-surface design |
| **E4 · now** | ⚑ **ZERO.** The panel's only E4 row is `update4` — the ritual that *arrives* there. | ⚑ **none. There is no `s4_*.json`.** | ❌ **does not exist** |
| **The Close** | **1** — `closeUpdate` | — | ❌ **one button** |

**You can walk into Era 4 and there is nothing to do.** The room is built (Room 3, the fluid niche,
the facets), the transition into it is built and now comfort-measured, the era state folds — and the
apparatus that has spoken to you for three decades has nothing to say when you arrive.

**That is the gap, and everything else on this page is smaller than it.**

---

## What E4 is supposed to be — and it is fully designed, which makes this cheaper than it looks
`REINTERP_MASTER_PLAN_v2_2026-07-12.md` §5 is unambiguous, and `REINTERP_E4_AUDIO_FIRST_DESIGN` and
`REINTERP_E4_ECHO_SCRIPT_DRAFT` are both `STATUS: live`:

- **AUDIO-FIRST** (Sérgio's own 2026-07-12 revision): the era is carried by **spoken conversation
  with the AI. Echo is a VOICE** — the apparatus finally sounds like a person — and the player
  answers by chip, never by keyboard.
- **Two foregrounded vectors:** ⚑ **deadnaming** — the system speaks the old name aloud, the
  un-overwritable-name beat inverted, *Maya is the name it cannot file* — and the **LGB-anti-trans
  split**, sourced, composites playable.
- **The Soft Lock and the Shrinking Choice become conversational** — the narrowing happens in what
  Echo offers you to say.
- **⚑ TRANSCENDANCE** — the uncaptionable dance-stream, `NO CATEGORY FOUND`. **The only respite in
  the era, and the community rather than the AI is what saves.** E3 deliberately has none; E4 must.
- **The finale:** glitch → cyclorama slits → four era panels → the Close.

**And E4 is where the two things you have asked for most recently land:** the detransition-service
beat (apparatus and AI usage only, never detransitioners) and the alt-platform migration that is
period-wrong for 2016. Neither has anywhere to go until E4 exists.

## And the Close, whose canon has been fixed for months and built for none of them
Survivors speak first · TRANSCENDANCE plays clean · *"Your update has failed."* · the dossier reframe
· the one uninstalled update · **`Restart as you are.`** · the unfinished line (x.b3), which is yours
alone.

Today: one button that jumps to the last of those, over a constellation whose **topology is still
flagged decorative-not-real** in the status register.

---

## The rest of the list, worst first

**2 · E3's other five surfaces.** `REINTERP_E3_THE_JOB_2026-08-03.md` §§2–6 are unbuilt: the Story
(vertical, expires), the podcast (the clips accumulate), the course (the funnel gets a price), the
livestream (ambient), the filters generalised. §1 shipped and is the strongest thing in the era —
but the workday is one surface wide.

**3 · ⚑ The sends never fire.** `src/room/sends.ts` is a complete runtime — offer / visit / decline,
symmetric filing, carry-back props — and its own header says it plainly: *"No beat in this worktree
triggers sends yet."* The summons seam, which is how cross-room tasks were supposed to work from E3
on, is **built and unused.** It is also the thing S72 measured at 6.87 m/s, so it is armed and
over-speed at the same time.

**4 · The voice pass — 27 data files carry `PLACEHOLDER`.** Every string in E3 is a draft of mine
awaiting yours: the Malta two-liner, the correction names and rationales, the verse form, the three
submissions, twelve commenters, six templates and their echoes. **This is not a build task and it
cannot be delegated** — CLAUDE.md gives you final wording, and the co-creation norm means my drafts
exist to be reacted to, not shipped.

**5 · The read-aloud accessibility principle** (2026-07-24: long in-world text should be
read-aloud-able, build-time TTS, apparatus voice only) has a `tools/tts` renderer and no coverage.
⚑ It stops being an accessibility feature and becomes the *medium* in E4, where Echo is a voice —
so it should be solved as part of E4 rather than bolted on after.

**6 · A11 — the in-headset pass has still never run.** Every comfort figure in this repo, including
the two violations S72 just found, is desktop-measured. The XR entry point exists now; nothing has
been judged in a headset.

---

## ⚑ What I would do, in order, and why

1. **⚑ ERA 4, AS A WHOLE ERA.** It is the only place the piece is *missing*, rather than thin. It is
   fully designed and unusually cheap for its size — the room, the transition, the era state and the
   morph all exist; what is absent is content. Everything else on this list is an improvement to
   something that already works. **This is the difference between a piece with an ending and a piece
   that stops.**
2. **The Close**, immediately after, because E4's finale runs into it and the two share the cyclorama.
   It also inherits the choreography's grammar — the fourth rise, the one where you do not come down.
3. **The sends**, small and high-leverage: a built runtime that no beat calls is free content once a
   beat calls it. Fix the 6.87 m/s first.
4. **E3's remaining surfaces**, which are enrichment rather than absence.
5. **The voice pass**, continuously and by you, not as a phase.

**The honest counter-argument**, since I have been asked for these: E3 got five passes and is the
best-designed era in the piece, and a case exists for finishing its workday first while the thinking
is warm. I do not think it wins. **A piece whose last quarter is an empty room cannot be shown**, and
the article deadline is real — the thing that most needs to exist by then is the ending.
