STATUS: live

# ⚑ THE LIVE BUILD QUEUE — the only file to dispatch from
*Created 2026-08-02, the same day a superseded prompt got dispatched (`423bd62`). Every other file in
`docs/` that contains an `# S<n> —` block is now marked **SHIPPED — do not dispatch**, and
`check-spec.mjs` C8 fails the build if that stops being true. **If a prompt is not listed here, it is
not live.***

| # | Session | Prompt lives at | Status |
|---|---|---|---|
| — | ~~S66 — the rooms as livable places~~ | ↓ below, in this file | **SHIPPED 2026-08-02** — number retired |
| — | ~~S67 — the choreography~~ | `docs/REINTERP_THE_BUILDING_2026-08-02.md`, tail | **SHIPPED 2026-08-02** — number retired |
| — | ~~S69 — the presets on Noa's video~~ | ↓ below, in this file | **SHIPPED 2026-08-02** (`11ef26e`) — number retired |
| 1 | **S70 — the comments, and the recruitment floor** | *not yet written — see `docs/REINTERP_E3_THE_JOB_2026-08-03.md`* | **NEXT, pending Sérgio's go** |
| — | S68 | *(soft-claimed by the gyroscope look-around suggestion, `NEXT_PROMPTS_2026-07-30.md` tail — not written)* | — |

**Numbers are not reused.** S66 previously named two other jobs (the retired testimony studio; the
correction list, shipped as Session 64). Both are marked SHIPPED where they sit and neither is
dispatchable. See `08_STATUS_REGISTER.md` §6.

---

# S66 — ROOM 2 IS NOT A PLACE · Opus, high effort · **here, not Codex**
**⚑ PROMPT STATUS: SHIPPED 2026-08-02 — this was the live S66 and it is done. Do not dispatch; the number is retired (see BUILD_LOG.md and 01_SESSION_LOG.md).**
*From Sérgio's 2026-08-01 play pass: six of his eleven notes are this one job, and the software is
now ahead of the room it sits in. Full context at `docs/reinterp/01_SESSION_LOG.md` NEXT UP item 0,
including the creative-leeway amendment, which is part of the brief and not preamble.*

```
Build session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch reinterp,
?reinterp=1). Read, in order: CLAUDE.md, docs/reinterp/01_SESSION_LOG.md NEXT UP item 0 (THE BRIEF —
including the ⚑ creative-leeway amendment, which is instructions), docs/REINTERP_3D_STYLE_DIRECTION*
(the Soft Lo-Fi law — do NOT improvise art direction), docs/REINTERP_THE_BUILDING_2026-08-02.md (why
this matters more than it looks: the player will later be lifted ABOVE these rooms and asked to
recognise them as lives), docs/reinterp/08_STATUS_REGISTER.md, then src/room/era1room.ts,
src/room/assets.ts, src/room/cluster.ts, src/room/era3Devices.ts, src/room/movementNodes.ts,
data/room/*.json, src/debug/panel.ts.

THE CONTRACT OF INTENT — you are given this, not a prop list:
  Room 2 must show that somebody lives here, and that person is not the story — she is who the story
  is happening to. Room 1 has tapes, a kit, a diary. Room 2 has furniture and three screens. Vera
  owns nothing on screen, which is why every seat reads as a dead end: WHEN YOU TURN, THERE IS
  NOTHING TO HAVE TURNED TOWARD. Room 1 is the benchmark to match, not to copy.

⚑ LEEWAY IS GRANTED AND IS THE POINT OF THIS SESSION. Do not wait for a list. Choose the belongings,
place them, light them, sit in every seat, screenshot, change your mind, do it again. Iterate
IN-ENGINE and report what you learned. This is warranted by evidence, not optimism: the two biggest
findings of the last two sessions (the corrections never touched her words; Room 2 had literally no
readable light) were both found by BUILDING AND LOOKING, and neither was catchable in a doc.

⚑ WHERE THE LEEWAY STOPS. Staging, logistics, props, lighting, placement, framing, the order of a
read: yours, decide them. WHAT RETURNS, AND WHO THE ERA IS ABOUT: not yours. Session 65 correctly
identified that nothing recurs in Era 3 and proposed that Vera's own testimony should eventually
enter her own queue. That is a real story decision, it is Sérgio's, and it is NOT in scope — building
toward it would repeat the four-pass Era-3 mistake one layer down. THE RULE: if it can be judged by
sitting in the seat, decide it yourself. If it changes what the era MEANS, propose it in the session
log and stop.

SCOPE — the four lettered items are the FLOOR, not the ceiling:
(a) ⚑ THE DEVICES MUST COME TO THE PLAYER at a device seat — Sérgio's own fix and the right one: a
    held, framed close read instead of a camera craning down at a 7 cm phone from 0.77 m. The floor
    discs at the seat's own (x,z) have been a flagged prototype simplification since R28-1
    (nodes.json's own _doc says so); this is where that debt comes due. Touches nodes.json, app.ts's
    seat cut, era3Devices.ts's placements. THIS IS THE BIGGEST ITEM — the era's whole content is
    currently unreadable at the seat it is read from.
(b) CLIPPING AND MISPLACEMENT — props through props, and the SHELF is in the wall again. It has been
    fixed before: FIND OUT WHAT RE-BROKE IT before re-nudging numbers.
(c) THE DESK/PC ASSEMBLY READS AS UNLIT BLACK BLOCKS. Sérgio's "block symbol" on the bed→chair jump
    is a PROP, not a glyph. Materials and lighting, not geometry.
(d) MARKER LOGISTICS BEYOND THE CAPTION — S65 stopped the hint nagging, but the deeper question is
    untouched: what does a marker MEAN when the thing it takes you to is a screen you then cannot
    read? (a) probably answers this; say so if it does.

PROPOSE BEYOND THE BRIEF. If the room wants something not listed, build it, screenshot it, and say
why — WITH A NAMED ROLLBACK so Sérgio can cut it in one line. A proposal he can delete cheaply is
worth more than a question that blocks everything until he answers it.

LAWS: Soft Lo-Fi (cozy low-poly, underdefined edges, NOT horror-dark; tone dial per scene, extremes
forbidden) · selective fidelity, ≤3 hero objects per scene on Quest · palette from
src/desktop/theme/ (ratchet 34, must not rise) · Quest budget ≤75k tris, ≤60 draw calls, 72 Hz, no
realtime shadows · no runtime network, no storage · check-spec C6: every new beat needs a debug-panel
button and src/debug/panel.ts IS IN THE FENCE · all display text in data/ as PLACEHOLDER-draft.
⚑ Vera is never the joke, and her belongings are not evidence — they are a life.

FILE FENCE: src/room/*.ts, src/engine/app.ts, src/debug/panel.ts, data/room/*.json,
data/strings/ (new), docs/reinterp/01_SESSION_LOG.md, docs/reinterp/08_STATUS_REGISTER.md,
BUILD_LOG.md. Git: EXPLICIT PATHSPECS only — never `git add -A`; another session may share the index.

DONE WHEN: npm run dev works; tsc + npm test + npm run build green; ?flat=1 clean; SCREENSHOTS FROM
EVERY SEAT, before and after, in the session log; BUILD_LOG gets ONE line (one line, not a paragraph).

ACCEPTANCE, BY FEEL: turn in any seat and something of hers is there to find. The devices are
READABLE at the seat you read them from. Nothing reads as an unlit block. And the room should feel
lived in rather than decorated — if it looks like a set, it is wrong.
```

---

# S69 — THE PRESETS, ON NOA'S VIDEO · Opus, high effort · **here, not Codex**
**⚑ PROMPT STATUS: SHIPPED 2026-08-02 — built as the presets on Noa's video (`11ef26e`). Do not dispatch; the number is retired.**
*Sérgio approved 2026-08-02. Spec: `REINTERP_E3_THE_CORRECTION_LIST_2026-07-30.md` **revision 5**.
This is the salvage the retired studio spec's supersession header always reserved — presets-as-
ideology and the sourced three-phase grammar — returning as ONE correction item inside the shipped
design, never as a rebuild of the studio.*

```
Build session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch reinterp,
?reinterp=1). Read, in order: CLAUDE.md, docs/ETHICS_CONSTRAINTS.md,
docs/REINTERP_E3_THE_CORRECTION_LIST_2026-07-30.md — ⚑ REVISION 5 IS THE SPEC, and the ✅ BUILT
header tells you what is already code — docs/REINTERP_E3_REVAMP_BRIEF_2026-07-30.md revision 3 (the
SOURCED three-phase production grammar: grade, framing, music bed, posture — every control comes from
there), then src/room/graceQueueLite.ts, data/dialog/s3_queue.json, src/desktop/theme/era3.ts,
src/debug/panel.ts.

THE PREMISE, and it is already half-true in the data: Noa's submission opens "I sent a video this
time instead of writing it out." THERE IS NO VIDEO. The player corrects a recording they have never
watched. That was a template shortcut; make it DELIBERATE.

SCOPE:
1. BUILD THE VIDEO. Pre-authored pixel frames on the laptop, drawn from what she actually says: her
   hands ("my hands don't know where to go"), the brother's flannel. ⚑ FACELESS, per the law. It must
   be TENDER — it is `felt`, bare, no chrome over her, no Lambient. ⚑ NO camera, NO file input, ever
   — same law as the Restoration Filter: it is a sprite, and the piece never requests a permission.
2. ⚑ THE PRESET IS OFFERED BEFORE YOU HAVE PLAYED IT. You can grade her without watching. Playing is
   optional, nobody asks you to, skipping costs nothing. The apparatus has not seen her either. Do
   not comment on this anywhere — build it and leave it.
3. CORRECTION 13 on submission 2, in the same list, same shape, same manual/verse doubling as every
   other item. The preset name sounds like CARE, NOT CRAFT — the tell is that a colour-grade is
   called something like "Honest Light". What it does: cools and desaturates her, tightens the crop,
   drops a minor pad underneath. What that MEANS: the documented codebook's phase 1 is
   "pre-conversion sickness", so the preset makes her look like a BEFORE. The apparatus grades her as
   ill before she has said anything.
4. ⚑ IT RESOLVES NOTHING ABOUT HER. The grade has no opinion on her gender and must not acquire one.
   It does not answer what corrections 8 and 9 disagree about. A third correction lands on the same
   person from a third direction and, like the other two, is never commented on. THE PIECE STILL
   NEVER ANSWERS FOR NOA — if any beat you build answers for her, it is wrong; stop and flag it.
5. THE GRADE AS A VISIBLE TRANSFORM, exactly as the text edits already work (see s3_queue.json's
   `_docEdit`): applying it changes the picture in front of you, skipping it visibly does not.
6. TRACKED CHANGES, FOR AN IMAGE. Text corrections show what was taken (struck through, grey). The
   image needs its equivalent — the ungraded frame stays available beside it, small, the way the cut
   sentence stays on the page. THE LAPTOP REMEMBERS; THE TABLET PUBLISHES CLEAN.
7. THE E4 BRIDGE — SET UP, NOT SPENT. This is one person's video, graded by hand, one preset at a
   time. E4's image changer is the same operation on anyone, instantly, with nobody there. DO NOT
   gesture at that here. Build the hand-operated version well and E4 inherits the rhyme.

⚑ THE TONE LAW IS ABSOLUTE: the satire is in the TOOL. If any frame of the graded video reads as
mocking Noa, the beat is wrong — and the fix is ALWAYS to make the panel more pleased with itself,
never to make her more ridiculous.

LAWS: no runtime network, no storage · palette from src/desktop/theme/ (ratchet 34, must not rise) ·
check-spec C6, src/debug/panel.ts IS IN THE FENCE · all display text in data/ as PLACEHOLDER-draft,
never composed in TS · no real people or likenesses.

FILE FENCE: src/room/graceQueueLite.ts, src/room/era3Devices.ts, src/desktop/theme/era3.ts,
src/debug/panel.ts, data/dialog/s3_queue.json, docs/REINTERP_E3_THE_CORRECTION_LIST_2026-07-30.md
(status only), docs/reinterp/01_SESSION_LOG.md, docs/reinterp/08_STATUS_REGISTER.md, BUILD_LOG.md.
Git: EXPLICIT PATHSPECS only.

DONE WHEN: npm run dev works; tsc + npm test + npm run build green; the beat reachable from the debug
panel; screenshots of the video ungraded and graded, side by side, in the session log; BUILD_LOG gets
ONE line.

ACCEPTANCE, BY FEEL: the ungraded video is tender and you want to keep watching it. The graded one is
not cruel — it is PROFESSIONAL, and that is worse. And you notice, a beat late, that you were allowed
to grade her without ever pressing play.
```
