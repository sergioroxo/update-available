STATUS: live

# ERA 3 — THE BUILD PLAN
*From `ERA3_NARRATIVE.md` (third draft). Written 2026-08-21 so nothing in that spec is lost between
here and a working era. **Sérgio: "I would redo the whole OS system of Era-3 and the whole UX/UI of
GracePlatform… be careful on what you re-use — there are elements that will bring confusion."***

---

# 0 · ⚑ WHAT IS REUSED, WHAT IS RETIRED — decide this first or the rebuild inherits the confusion

## KEEP — earns its place, no change of meaning
| | why |
|---|---|
| **FloppySheep** | his own ask, already built, and now load-bearing: the cheerful product of the same publisher, on her phone, playable at any moment. **Do not gate it, do not reward it, do not score it** |
| **The submissions** — Renata, Noa, Deb | the felt core of the era. Their text is not touched |
| **The corrections' content** — rules, rationales, manual refs, verses | ⚑ the DOUBLING is the era's best formal idea and it survives the rebuild intact |
| **The ERA3 palette** (`src/desktop/theme/era3.ts`) | Windows 7 Aero, ported from the shipped build, not invented. **The rebuild re-skins the LAYOUT, never the palette** |
| **Malta** | now the connection point in two states (§7.3 of the narrative) |
| **Lambient** | promoted: from a lane of text to the era's figure of oppression |

## ⚑ RETIRE — these are the confusion
| | why it goes |
|---|---|
| **The tablet** | Sérgio, 2026-08-21. Two devices only. Its seat, pose and draw path all go |
| **The three-seat room model** (laptop / tablet / phone seats) | with the tablet gone and the phone in her hand, "jump to a device" is no longer the movement. **One desk seat; the phone is held** |
| **The comments as a TABLET surface** | the beat survives — it becomes **a task on the board** (clear the comments), on the desktop, where her employer's words belong |
| **s3 / s4 sends** | already gated off: their targets point at the retired radial layout. ⚑ **Do not "restore" them in this rebuild** — the era now has its own interruption (the phone) and does not need a summons |
| **The linear queue** | replaced by the board. `n of m applied` and the "You're caught up" screen are re-authored, not ported |

---

# 1 · ASSETS — three new models, and two need converting
| asset | licence | state |
|---|---|---|
| **Phone** — Quaternius | **CC0** | `.glb`, 15 KB. Ready |
| **Computer Screen** — Kenney | **CC0** | ⚑ **`.obj` + `.mtl` — needs OBJ→GLB** |
| **Computer Keyboard** — Kenney | **CC0** | ⚑ **`.obj` + `.mtl` — needs OBJ→GLB** |

⚑ **All three are CC0, so none needs an ATTRIBUTIONS.md row** (that file is for CC-BY debts). They go
in `assets/LICENSES.md` with source URLs. **Crediting them anyway is courteous and optional.**

**Conversion, per `cassetteTape`'s precedent:** `obj2gltf`, then strip textures with `@gltf-transform`
(the no-textures law is about what SHIPS), then measure the native bbox and write `models.json`
`scale`/`cx`/`cz`/`baseY` from it — **never eyeballed**, and never a per-model constant unrelated to the
authored box (that was the 72-finding bug).

---

# 2 · THE DESKTOP — Windows 7 Aero, rebuilt
**Reference:** `Pc_Simulation/Oses/Win7.jpeg`. **Palette already exists and is authored — do not invent.**

**What "rebuild the OS" means concretely:**
- **Aero window chrome** — translucent title bars, soft gradient, the round orb in a dark glass taskbar.
- ⚑ **Minimise, not just X.** Sérgio's earlier note, still unfixed: *"they should have a minimise button
  not just an X so people can know."* A window you can put down is a window you can come back to.
- **The task board replaces the queue** — thumbnails, greying out as they complete, Trello/Slack-shaped.
- **Density down.** *"the Grace software is so filled with text… we need something more dynamic."*
  ⚑ Every task should be legible as a THUMBNAIL before it is legible as text.

# 3 · GRACEPLATFORM — the board, and the seven tasks
**The board:** 6–7 tiles, any order, **2–3 completed opens the next stage**, completed tiles grey out.
No count is shown, no progress bar, nothing is scored. ⚑ **The frame never plays.**

| task | surface | act | build state |
|---|---|---|---|
| **Correct a testimony** | desktop | apply / skip | ⚑ exists — re-skin only |
| **Clear the comments** | desktop | delete affirming replies | ⚑ **NEW.** Sharpest item in the pool |
| **Return the family calls** | desktop | mark a mother's message handled | ⚑ **NEW.** Nothing in `data/` carries it |
| **Cut the Story** | phone | tap where the 40s starts | copy written 2026-08-21; surface unbuilt |
| **Order the podcast** | desktop | order three clips | unbuilt |
| **Build the course module** | desktop | modules **+ the price** | unbuilt |
| **Approve the house look** | desktop | one grade for every face | ⚑ exists (S69) — becomes a tile |

# 4 · THE PHONE
**Held, not a seat.** Contents:
- ⚑ **"Maiden-to-be"** — the ex-lesbian group. Bea is here. **Never satirised.**
- **The unread backlog** — family, old friends, ⚑ **the Butch bar's birthday coupon**, arriving during
  the era. Readable at any time; **nothing files either way; the piece never makes her open them.**
- **FloppySheep.**
- **The livestream**, already running, that nobody asked her to watch.

# 5 · THE MECHANICS THAT MUST NOT BE SIMPLIFIED
1. ⚑ **CAPTURE EITHER WAY.** Open the link → Lambient knows. Ignore it → Lambient comes anyway.
   **There is no compliant path.** This is the era's thesis and the reason the ending must be collective.
2. ⚑ **THE CASCADE IS VOLUME, NOT DAMAGE.** No crash screen, no corruption glyphs. **Lambient stays
   polite to the end.** The block keeps working; there are simply more messages than blocks.
3. ⚑ **"YOU CAN'T UNSEE IT."** After the cascade the tasks are still there, still working, still
   greyable — **and unusable in a way nothing enforces.**
4. **The outcome never changes.** Register, never branch.

# 6 · ORDER OF WORK
1. **Assets** — convert, measure, register. *(Mechanical; agent-safe.)*
2. **The room** — remove the tablet, collapse to one desk seat + held phone, place screen/keyboard/phone.
3. **The desktop shell** — Aero chrome, minimise, the board.
4. **The two new tasks** — comments, family calls. *(Writing + surface.)*
5. **The phone** — group chat, backlog, FloppySheep, stream.
6. **The ending** — capture-either-way, the cascade, the break.
7. **The three unbuilt media tasks** — Story, podcast, course.

⚑ **Steps 1–3 are safe to parallelise. Steps 5–6 are one job** — the phone and the ending are the same
beat and splitting them will produce a phone nobody has a reason to look at.

# 7 · ⚑ RESEARCH — PULLED 2026-08-24, AND IT MOVED THE DESIGN
**Evidence, verbatim:** `RESEARCH_PULL_E3_2026-08-24.md`. **What it changed:**
`RESEARCH_PULL_E3_CONSEQUENCES.md`. The brief that produced it: `RESEARCH_BRIEF_E3.md`.

⚑ **Two consequences bind the build and are not optional:**
1. **"Return the family calls" is a queue about MOTHERS, not about daughters.** The record does not
   support a worker holding an adult child's file, and says so twice. The mother is the client; the
   daughter has no record on this screen; **the asymmetry is the scene.** §3's row below is superseded
   by `RESEARCH_PULL_E3_CONSEQUENCES.md` §1.
2. **The women's strand has its own vocabulary — emotional dependency, boundaries, femininity,
   relational wounds** — and must never be men's reparative language with the pronouns swapped.

⚑ **And a list of things that may NOT be claimed** (all `[VERIFY SOURCE]`): daily group check-ins as a
standard form, terms of direct address, greeting formulas, WhatsApp as a movement norm, any escalation
ladder, any word for a woman who leaves. The writing invents these **openly**, and the Dossier says so.

## the original brief, kept for the record

The group chat and the family calls are the two new pieces of writing, and both touch documented
practice. **Before drafting either**, pull what the knowledge base has on: peer accountability groups
in ex-gay/ex-lesbian networks (form, tone, how members address each other), and family-contact
practices. ⚑ **Cite or mark `[VERIFY SOURCE]`; never invent an organisation; the group's name is ours
and its shape must be theirs.**
