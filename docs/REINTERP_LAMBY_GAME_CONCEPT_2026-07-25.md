STATUS: live

# ALWAYS YOUR LAMBY — an external provotype + an in-piece easter egg
*Sérgio, 2026-07-25: "I've seen the LambyRig and I love it… I truly believe this should be included
as an easter egg and honestly even considering an external provotype game that can be used as a
promotional element for the experience." Prioritised as he asked: **the external game first**, the
easter egg second ("we probably already have enough stuff"). Concept + build spec below; nothing
built yet.*

## Why this works — the song already is the thesis
`~/Pc_Simulation/Testing/Lamby Song/` holds *"Always Your Lamby — Lamby Knows What Goes on Inside
(Inside Dream Remix)"* by **Treblo**, 4:45, with word-timed `.lrc`. Its opening:

> Lamby sees you / Lamby loves you / Always there inside your dreams
> Lamby keeps you / Lamby holds you / **Closer than it really seems**
> I'm always watching you

That is the entire piece compressed into a nursery rhyme: **care as surveillance, love as capture,
the watcher who insists it is a friend.** A promotional artifact built on that song doesn't need to
explain the project — it performs its argument in four minutes.

---

# PART 1 · THE EXTERNAL GAME (priority)

## What it is
**Always Your Lamby** — a small, shareable, standalone web toy (~4–6 minutes, the length of the
song). You adopt a desktop assistant. It is delightful. It would like to know you a little better.
Everything you tell it is filed, and everything you *refuse* is also filed. Then it collapses, names
what it was doing, and hands you the real work.

It is not "a game about conversion therapy." It is a **toy that behaves the way the apparatus
behaves**, so the player learns the mechanism from the inside in the time it takes to hear a song.

## It obeys the provotype grammar (`data/provotypes/_schema.json`)
Same spine as the in-piece provotypes, so this is a genuine sibling and not a spin-off:
**diegetic invitation → short frame → interactive vignette (states) → dossier-grade debrief.**
And the same laws: **no score, no streak, no timer, no win/lose**; Leave always live; choices
**REGISTER, never branch** — they change how you are filed, never what happens.

## The loop
1. **Invitation.** Lamby appears with the rig's squash-stretch bounce. *"Would you like me to keep
   you company?"* Accept, or don't — either is filed.
2. **The check-ins.** Small, warm, escalating: a name, a mood, "is there anything you'd like to set
   down?" Answers are **chips, never typed** (the input law travels with the grammar). Each one is
   answered with charm — and, in the corner, a counter you did not ask for begins.
3. **The song plays under it**, its lyrics arriving as the mechanic reveals itself. When it reaches
   *"I'm always watching you,"* the player has already been watched for two minutes.
4. **⚑ THE TURN, translated.** The main piece's signature bodily ask is turning around to face the
   witness side. Here it becomes one control: **flip the toy over.** On the back is your record —
   cold, high-definition, every chip you pressed and every one you declined, in the apparatus's
   register. *The witness side is the sharp side*, exactly as in the piece.
5. **Dismissal always works, and is logged.** You can close Lamby at any moment. It closes
   instantly and without protest — and the closing is filed as data. That is the joke, and it is
   also the thesis: there is no interaction with this system that is not an interaction.
6. **The collapse.** The charm must break — satire lives only inside perpetrator self-presentation
   and **must collapse** (CLAUDE.md). Lamby's warmth curdles into the language of the record.
7. **The debrief.** Dossier-grade: what real mechanism this dramatises, `status: documentary |
   contested | speculative` on every claim, then the outward links — the full experience, and
   **SurvivingSOGICE** at the University of Bergen. This is where the promotional function lives:
   the player arrives at the research having just *felt* why it matters.

## What makes it promotional rather than merely grim
It is **short, funny, and shareable up front** — the aesthetic Sérgio loves does the work: the
Clippy-lineage bounce, the pixel chrome, a genuinely charming lamb. People share it because it is
delightful. The turn is what they tell others about. The debrief is what they act on.

## Ethics (binding — the same gates as the piece)
- **Satire targets the apparatus, never queer people, never survivors.** Lamby is the joke; the
  player never is.
- **No real organisations, people, or testimony in the toy.** Invented marks only. Real names appear
  **only** in the debrief, statused, as provenance.
- **No data actually leaves the browser.** The "record" is in-memory and wiped on exit — the piece's
  own no-network / no-storage invariant travels with it. The toy must not do the thing it depicts.
  Say so in the debrief: *nothing you typed here was kept — which is not true of the systems this is
  about.*
- **Nothing gated opens itself:** this is a new outward-facing artifact under the project's name, so
  it needs Sérgio's explicit greenlight before release, and a content note before it starts.

## Practical
Standalone repo, same stack (Vite + TS + canvas, no framework), deployable to itch.io or GitHub
Pages. **Reuses `lambyChar.ts`** — S48 already made it the single source of truth, so the toy and
the piece share one Lamby by construction. Song licensing with Treblo must be cleared before
release; a silent build should work as a fallback.

---

# PART 2 · THE EASTER EGG (lower priority, per Sérgio)

`?lambyrig=1` already exists as a dev surface. The strongest diegetic home for it:

**A file on the Era-2 desktop that shouldn't be there** — `lamby_rig.exe`, or an unlabelled icon in
a folder the player has no reason to open. Opening it reveals **the apparatus's own puppet-rigging
tool**: sliders for mood (`cheerful | clinical | sterile | sad`), the motion vocabulary, the
speech-bubble copy. You can make Lamby look sad on demand.

**Why this is the right easter egg and not just a cameo:** it reveals that Lamby's warmth is an
*authored artifact* — someone chose the deflate, someone tuned the guilt. Found, never explained.
The player who opens it discovers the machine's sincerity has a settings panel. That earns its place
next to the shame beat in S2R.3C rather than distracting from it.

Register: `operable` (a system surface — it may glitter). It must never appear during a `felt`
scene, and finding it must never be rewarded — no achievement, no acknowledgement. **The frame never
plays.** It is simply there, for whoever looks.

*(Deliberately NOT: a hidden minigame, a collectible, or anything that scores. Those would break the
frame law and cheapen the find.)*

---

## Open for Sérgio
1. **Greenlight the external game at all?** It is a new public artifact under the project's name —
   your call, and the ethics gate is yours.
2. **Song rights** — is Treblo's track cleared for an outward-facing release, or is this a
   commission/"inspired by" situation? Affects whether the toy ships with audio.
3. **Scope** — full ~5-minute toy, or a 90-second "one check-in and the turn" teaser? *(My read: the
   90-second version is the better promo and far cheaper; the turn is the whole payload and it
   arrives faster.)*
4. **Where it lives** — itch.io, a project site, or bundled with the exhibition?
5. Easter egg: adopt `lamby_rig.exe` on the E2 desktop, or hold it until the E2 desktop is finalised?
