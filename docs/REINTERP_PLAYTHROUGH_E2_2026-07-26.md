STATUS: live

# PLAYTHROUGH — Era 2, end to end (Sérgio, 2026-07-26)
*His fullest review yet: ~30 findings. Triaged against the code before grouping. **A large cluster
shares ONE root cause — the debug ERA button is a geometry-only jump that desynchronises the spine,
the OS and the room.** That is good news (the build is less broken than the session felt) and bad
news (the review tooling misled him — the third time in this project).*

---

## ⚑ ROOT CAUSE #1 — the debug ERA button doesn't move the narrative, only the furniture

`src/engine/app.ts:1697` wires the panel's era buttons as:
```
onEra: (era) => driveMorph(era)
```
`driveMorph` **only morphs the room geometry.** The real transition path is `os.onEraShift`
(`app.ts:328–331`), which calls `driveMorph` **and** `spine?.onEra(era)`.

**And worse** — `app.ts:325–327`:
```
const reviewMode = !!(options.era || options.close || options.reveal || options.morphDemo);
if (!reviewMode) spine = createSpine(os, …);
```
**With `?era=` in the URL, the narrative spine is never created at all.** No sends, no updates, no
era transitions — the conductor is absent.

**This single fault explains, or partly explains:**
- **"The whole experience is locked, nothing lets you advance"** — with the spine absent or stuck in
  an E1 step, u3 can never arm. *Not an S57 bug: S57 verified the LINEAR path end to end with real
  clicks. Sérgio's path was the debug jump.*
- **"Service Transition doesn't appear by itself, had to go to debug."** Same cause.
- **"The witness board is still behind us"** and **"a yellow cassette tape is still on the shelf"** —
  E1 room state was never retired, because no era shift occurred.
- **"GracePlatform… is installing on the Era-2 session"** and **"pressing Daniel's computer changes
  the screen"** — stale E1/E2/E3 state mixed together.

**Fix:** the era buttons must drive the REAL transition (`os.onEraShift`), and `?era=` must not
silently kill the spine — or, if review mode genuinely needs no spine, the panel must say so on
screen. **Until this is fixed, no playthrough via the era buttons can be trusted**, and we will keep
mistaking tooling artifacts for content bugs.

## ⚑ ROOT CAUSE #2 — an authoring note is shipping to the player
`data/strings/slice.json:127`:
```
"note": "NOTE: [researcher note — Sérgio's voice, to write]",
```
That is a **note-to-self rendering as in-game text.** Sérgio: *"Why is there a Dossier on the
Desktop? Makes no sense and it says my name? 'Researcher note — Sérgio voice' — like please no."*
He is right: it breaks the fiction and puts the author's name inside the piece.
**Two fixes needed:** (a) remove/replace that string; (b) a **check-spec C7** that fails when any
player-visible string contains authoring markers (`PLACEHOLDER`, `to write`, `Sérgio`, `TODO`,
`[VERIFY SOURCE]`, `researcher note`). This is the same lesson as C5/C6 — if it can leak silently,
it will.

**✅ THE DOSSIER ITSELF — ANSWERED.** Sérgio: *"I think it can stay as like an easter egg with a
different name and like an explainer of the program."* So it is **kept, renamed, and repositioned**
— not cut. It becomes a **diegetic explainer of the program**, found rather than served, in the same
family as `lamby_rig.exe` (S55): an unremarked file on the desktop that rewards looking. The tactic
content he called interesting survives; what dies is the authoring voice and the front-and-centre
placement. **Rules inherited from the S55 easter egg:** never advertised, never rewarded, never
during a `felt` scene, filed silently. **Sérgio owns the new name and its copy** (it is in-world text).

---

## REAL FINDINGS (independent of the tooling fault)

### A · The E2 arrival doesn't introduce Lamby
1. **"Welcome Back Daniel" typeface is not visible enough.** Legibility fix.
2. **No boot sequence for the new LambyOS version** — no boot sound, no jingle. E1 had one; E2's
   version change passes unmarked.
3. **⚑ Lamby is never PRESENTED.** He simply appears. Sérgio: *"we need to be presented to Lamby…
   it doesn't make much connection with the overall experience."* This is the biggest narrative gap
   in the era — his debut is the whole point of E2's guidance lineage.
4. **Lamby should present RESTORIFY to us.** Right now the two feel like competing systems; Lamby
   introducing the program resolves the conflict and gives him a job on arrival.

### B · Restorify / the check-in
5. **"Not Now" on the Daily Realignment — what does it do?** (See the dead-button cluster below.)
6. ✅ **Its background colour differs from the desktop — KEEP** (his explicit note).
7. **"How was your walk" resolves into nothing** — the card vanishes and jumps to the Messenger with
   nothing said. It needs a response.
8. **No notification that a message arrived.** Lamby should tell you, so opening the Messenger is
   motivated. *More guidance needed here generally.*

### C · The Caleb thread
9. **Replies should be attributed to "Daniel"** — the piece knows his name; the chat should use it.
10. **"Click to Reply" appears while Caleb is still typing** — you must wait for the boxes anyway,
    so the affordance lies. Show it when it's true.
11. ✅ **Sad Lamby — loved.**
12. **✅ ANSWERED — the dead buttons.** Sérgio: *"the 'not now' either should be greyed out or just
    do the same as continue."* So: **no branching, no invented consequence.** And his simpler answer
    is the better one — **a greyed-out "not now" is honest and carries the thesis:** the apparatus
    displays an option that is not one. *You may not decline this.* That says more as UI than a
    hidden ledger difference would. **Pick greyed-out where the beat is coercive** (the "we'll get
    the days back" reassurance, the "don't be discouraged" pop-up); make it a plain synonym for
    continue only where greying would read as a bug. Do NOT invent divergent paths.
13. **Lamby's second pop-up uses a DIFFERENT SYMBOL** — is that intended? Reads as inconsistent.

### D · NetVision — mostly working
14. ✅ **"Great."** ✅ **Three steps — amazing.** ✅ **Karaoke bubble — so great.**
15. **Each image needs more animation** — the shots are static.
16. **✅ ANSWERED — the seals are DRTV OFFER-SCREEN FURNITURE.** Sérgio sent a reference: a classic
    late-night infomercial end-frame with **$29.99**, payment-card logos, *"Please allow 6-8 weeks
    for delivery / Express delivery for U.S. only / Terms and conditions may apply"*, **ORDER NOW!**,
    a website, a 1-800 number, and a gold **"30 DAY MONEY BACK GUARANTEE"** rosette.
    So the offer screen needs that whole apparatus of trust: the guarantee rosette, the card badges,
    the delivery fine print, the phone number. **Why this is more than dressing:** it puts *"three
    easy payments of yourself"* into its native visual grammar — and a **money-back guarantee on
    selfhood** is the single most damning object the era could put on screen. The satire is entirely
    in the apparatus's self-presentation, exactly as the tone law requires.
    ⚑ **ETHICS: the card logos in the reference are REAL BRANDS (Visa, Mastercard, AmEx, Discover).
    Every badge must be INVENTED** — same rule as everything else in the fiction.
17. **⚑ Caleb's toast arrives too early** — it covers the end-of-video disclaimer scroll (*"a great
    text"*), then disappears with no way to interact. **Move it after the scroll**, and make it
    persistent/actionable rather than a flash.

### E · PureMail / Accountability — the confused moment
18. **The Accountability window pops back when PureMail opens — why?** Two things compete for
    attention with no way to choose.
19. **It says "now playing" — playing WHAT?** Unexplained state.
20. **"1 new message — C___" in the system bar is barely visible AND not clickable.** He tried to
    open it and couldn't. Either it's an affordance or it isn't.
21. **⚑ Lamby should READ the PureMail message aloud.** *This is exactly what S46's TTS pipeline was
    built for* — `lamby_puremail_apology.wav` already exists, rendered and committed. **It is built
    and not wired.** Highest value-per-effort item in the list.

### F · The residue
22. **After "Continue", Caleb's messages were cleared — did he say anything or not?** The
    un-redaction beat did not read.
23. ✅ **Scanlines — loved.** ✅ **The residue line as a button — loved.**
24. **It needs a drop shadow** so it reads as clickable.
25. **⚑ On click it "appeared repeated on the screen and jumped back to the Restorify desktop."**
    That is a bug — and it's also where the era should have ended. Needs diagnosis with the spine
    actually running.

### G · The u3 transition
26. **"Remind me later" — what does it do?** (Law says it works ONCE; unclear in play.)
27. **GracePlatform opens barebones, says 2016, "a design that makes no sense", and installs on the
    Era-2 session.** Partly root-cause #1; the barebones look may be real.
28. ✅ **"Absolutely LOVED the Lamby deletion animation."** — the dispersal lands.
29. **The transition needs explaining** — focus on the update and Restorify; **GraceProgram should
    load on VERA's computer**, not Daniel's.
30. **⚑ The fly-over must be SLOWER** — *"let you see the room being built, so you understand the
    new space and the passage of time."* The relocation is currently too fast to read as a change
    of life.
31. **Era 3 shouldn't start without the computer's boot-up** — same missing-boot note as E2 (#2).
32. **The witness panel is still visible in Room 2.**

### H · Room 2's details (his doodles)
33. **A black rectangle in the ceiling** — *"a black square in the sky"*, unexplained.
34. **Circled as "weird":** a pale blue rectangle and a pink strip on the wall, the left-hand
    monitor, a beige box on the floor, the chair base. Room 2's dressing needs a pass.

---

## Suggested order
1. **S58 — Fix the review tooling** *(small, and everything depends on it)*: era buttons drive the
   real transition; `?era=` doesn't silently kill the spine; add **C7** for authoring-marker leaks;
   remove the `slice.json:127` note. **Then re-play before building anything else** — several
   findings above may evaporate, and we should know which.
2. **S59 — The E2 arrival + the desktop's introduction layer**: LambyOS boot + jingle, Lamby's
   presentation of himself and of Restorify, the "Welcome back Daniel" legibility fix, the message
   notification, the walk-card response — and the **dossier rebuilt as a renamed diegetic easter-egg
   explainer** (root cause #2), since that is also "what the E2 desktop presents". The era's missing
   front door.
3. **S60 — The dead buttons, the PureMail moment, and the NetVision offer screen**: grey out "not
   now" (never invent divergent paths), wire the **already-built** Lamby TTS to PureMail, fix the
   taskbar affordance, move Caleb's toast after the disclaimer scroll, add the residue drop shadow,
   diagnose the residue click — **plus the DRTV offer-screen seals (#16) and per-shot animation
   (#15)**, which belong here because they share `netvision.ts` with the toast fix and would
   otherwise collide.
4. **S61 — The transition**: slow the fly-over so the room builds visibly, GraceProgram on Vera's
   machine, E3 boot sequence, retire the witness panel in Room 2, Room 2 dressing pass.

## ✅ All three questions answered by Sérgio, 2026-07-26
1. **The seals** → DRTV offer-screen furniture (guarantee rosette, card badges, fine print, 1-800
   number), with every badge INVENTED. → **S60**
2. **The dossier** → kept, renamed, repositioned as a diegetic easter-egg explainer of the program.
   → **S59**
3. **The dead buttons** → greyed out, or a plain synonym for continue. **No invented paths.** → **S60**

## Still open
- **#13** — Lamby's second pop-up uses a different symbol. Intended, or a slip? (Cheap to fix either
  way; flagging so it is not "corrected" into something Sérgio wanted.)
