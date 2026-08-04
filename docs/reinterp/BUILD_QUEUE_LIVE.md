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
| — | ~~S70 — the comments, and the recruitment floor~~ | ↓ below, in this file | **SHIPPED 2026-08-03** — number retired |
| — | ~~S71 — walk the space and report what is wrong~~ | ↓ below, in this file | **SHIPPED 2026-08-04** — number retired |
| — | ~~S72 — the audit system (L3 capture + L4 assertions)~~ | ↓ below, in this file | **SHIPPED 2026-08-04** — number retired. 5 of 6 assertions live; assertion 6 (reachability) NOT built, named as such |
| — | S68 | *(soft-claimed by the gyroscope look-around suggestion, `NEXT_PROMPTS_2026-07-30.md` tail — not written)* | — |

**⚑ NOTHING IS QUEUED.** The next session's job is Sérgio's to name. Two candidates the S72 audit
produced, both in the session log with their measurements: **the comfort violations** (the entrance
descent at 1.2× and the send seam at 10–16×, exact durations proposed, nothing applied — his call
because both are pacing), and **assertion 6**, the ordinary-path traversal S72 did not build.

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

---

# S70 — THE COMMENTS, AND THE RECRUITMENT FLOOR · Opus, high effort · **here, not Codex**
**⚑ PROMPT STATUS: SHIPPED 2026-08-03 — built as the comment thread on the tablet and FloppySheep on the phone. Do not dispatch; the number is retired (see BUILD_LOG.md and 01_SESSION_LOG.md, Session 70).**
*Sérgio approved 2026-08-03 with four conditions, all of which are IN the prompt and none of which
are preamble: the logic must be **dynamic, not basic**; the register is **eerie + satirical +
serious, mixed**; **Vera is never the joke and neither are the commenters**; and **FloppySheep must
be there**. Design: `docs/REINTERP_E3_THE_JOB_2026-08-03.md`. This is the first surface of the
reframe — Vera is a social-media manager and the correction list is her morning queue.*

```
Build session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch reinterp,
?reinterp=1). Read, in order: CLAUDE.md (⚑ the register laws ARE the mechanic here),
docs/ETHICS_CONSTRAINTS.md, docs/REINTERP_E3_THE_JOB_2026-08-03.md (THE DESIGN — §1 THE COMMENTS is
this session), docs/REINTERP_E3_THE_CORRECTION_LIST_2026-07-30.md (the shipped era this sits beside;
its ✅ BUILT header says what is already code), docs/REINTERP_E3_REVAMP_BRIEF_2026-07-30.md rev 3
(the sourced forms), docs/reinterp/08_STATUS_REGISTER.md, then src/room/graceQueueLite.ts,
src/room/era3Devices.ts, data/dialog/s3_queue.json, src/desktop/theme/era3.ts, src/debug/panel.ts.

THE BEAT: "Route for mentorship" is a checkbox in the shipped list. Here it becomes a CONVERSATION.
Someone posts something vulnerable under a testimony. Vera replies — and she writes nothing, because
there are PINNED TEMPLATES. She picks one. Then she flags the account for follow-up. That is the
recruitment floor, live: someone said they were struggling, and the system's answer was to send a
person to their door.

⚑ IT MUST BE DYNAMIC, NOT A LIST YOU CLICK DOWN (Sérgio's explicit condition). Four mechanisms, and
the third is the one that makes the era's argument:
1. THE THREAD IS LIVE. New comments arrive while you are still handling earlier ones. It does not
   empty and nothing announces that. Arrival is authored (a scripted schedule in data/), NEVER a
   random generator — this piece's branching is scripted "fake intelligence" only.
2. YOU CHOOSE THE TEMPLATE, NOT THE WORDS. No free text anywhere (the input law). Templates carry
   warm names — the tell is that a redirect is called something like "Meet Them Where They Are".
3. ⚑ THE TEMPLATES PROPAGATE, AND THIS IS THE SESSION'S BEST IDEA. Some comments later, a DIFFERENT
   account uses the sentence you deployed — spontaneously, as their own words, to someone else. You
   taught them how to sound. The echo chamber has been ASSERTED in this project's docs since the
   revamp brief and never mechanised; this mechanises it in one data field. It must never be pointed
   at, named, or remarked on by anything.
4. THE ROUTING IS THE QUIET ONE. Some templates carry the follow-up flag and some do not, and the
   interface makes no distinction in how they look. The one that sends a person is the same size as
   the one that says hello.

⚑ REGISTER — EERIE + SATIRICAL + SERIOUS, ALL THREE, AND THEY DO NOT MIX ON THE SAME OBJECT:
- SATIRICAL: the TOOL. The template picker, its warm names, its keyboard shortcuts, its tidy little
  grid, the software congratulating her diegetically. It may charm and it may be genuinely pleasant
  to use. That is the horror — the work is enjoyable.
- EERIE: the propagation (3), the thread never emptying, and the fact that nothing ever comments on
  either. Eeriness here is ABSENCE, not atmosphere — no stingers, no dread music, no dimming. What
  is unsettling is that it is all perfectly normal.
- SERIOUS: the commenters. `felt`. One of them is unmistakably a person in trouble, and THERE IS NO
  RIGHT TEMPLATE — the interface has no button for what they actually need, and nothing acknowledges
  that. Do not resolve them, do not punish the player, do not have anyone notice.
⚑ VERA IS NEVER THE JOKE AND NEITHER IS ANY COMMENTER. Sérgio, verbatim: "Vera is never the joke and
the victims as well, they are not a joke." If any beat reads as mocking a person, the fix is ALWAYS
to make the tool more pleased with itself — NEVER to make the person more ridiculous. If you cannot
make a beat work that way, cut it and say so.

⚑ FLOPPYSHEEP — REQUIRED THIS SESSION (Sérgio: "just feel like the need to the FloppySheep to be
there would be good"). It is the mascot game on the phone, canon since the E3 addenda, and the name
is his. Build it as a REAL, PLAYABLE, GENUINELY FUN little game — one thumb, no timer, no score
shown to the piece.
  - WHY IT BELONGS, and this must be built rather than written down: it is one tap away WHILE A
    COMMENT SITS UNANSWERED. That is what everyone does at work, it is not cruel to her, and the
    piece says NOTHING about it — no scolding, no timer, no guilt, no ledger entry.
  - It is the same publisher's lamb. The brand still ships delight while its serious arm has become
    a workflow. That is the joke and it is on the apparatus.
  - ⚑ IT IS NOT RESPITE. E3 has no respite — Sérgio's decision, confirmed. FloppySheep is `operable`:
    the apparatus's own cheerful product, not a shelter. Do not treat it as one and do not let it
    become a reward.

METRICS — ⚑ THE ONE COLLISION WITH A SHIPPED DECISION. The era deliberately has no view counts (an
earlier draft's arithmetic coercion was cut as contrived). Numbers MAY EXIST here because a social
job without them would be false. NOTHING MAY GATE ON THEM: no task requires a number to rise, nobody
remarks on one, she is never asked to improve one. If you find yourself using a metric as pressure,
you have re-broken the thing that took four passes to fix.

LAWS THAT WILL FAIL CI: no runtime network calls, no storage (in-memory ledger only) · no free-text
keyboard anywhere · palette from src/desktop/theme/ (ratchet 33, must not rise) · check-spec C6 —
every new beat needs a debug-panel button and src/debug/panel.ts IS IN THE FENCE · C8 — mark this
prompt SHIPPED when done · all display text in data/ as PLACEHOLDER-draft, never composed in TS ·
no real people, orgs, logos or hashtags in the fiction · Quest budget unchanged.

FILE FENCE: src/room/graceQueueLite.ts, src/room/era3Devices.ts, src/desktop/apps/ (new comments +
FloppySheep surfaces), src/desktop/theme/era3.ts, src/state/ledger.ts, src/debug/panel.ts,
data/dialog/ (new), data/strings/, docs/REINTERP_E3_THE_JOB_2026-08-03.md (status only),
docs/reinterp/BUILD_QUEUE_LIVE.md (⚑ IN THE FENCE — flip this block to SHIPPED),
docs/reinterp/01_SESSION_LOG.md, docs/reinterp/08_STATUS_REGISTER.md, BUILD_LOG.md.
Git: EXPLICIT PATHSPECS only — never `git add -A`.

DONE WHEN: npm run dev works; tsc + npm test + npm run build green; ?flat=1 clean; every beat
reachable from the debug panel; screenshots of the thread, the template picker, the propagation beat
and FloppySheep in the session log; BUILD_LOG gets ONE line.

ACCEPTANCE, BY FEEL:
- Picking a template is quick and satisfying, and you do several before you think about it.
- You notice the propagation a beat LATE, and nothing has pointed at it.
- The person in trouble stays with you, and you cannot say what you should have pressed.
- FloppySheep is actually fun, and you are not punished for playing it.
- Nothing in the piece's own voice comments on any of the above, ever.
```

---

# S71 — WALK THE SPACE AND REPORT WHAT IS WRONG · Opus, medium-high effort
**⚑ PROMPT STATUS: SHIPPED 2026-08-04 — done. Do not dispatch; the number is retired (see BUILD_LOG.md and 01_SESSION_LOG.md). The reusable half is `tools/room-audit.mjs`: run it after any room change instead of re-dispatching this.**
*Sérgio, 2026-08-03: "I wish we'd make a prompt that would walk around the space to see corrections
to be made." Positional debt has been accumulating faster than it is being paid: S66 found a bed
inside a desk and a bookcase 0.26 m deeper than its own bounding box, S67 found the E4 witness record
landing outside Room 3, and he can still see errors. ⚑ This session AUDITS. It fixes only what is
provably wrong by measurement and PROPOSES everything that is a judgement call — improvising art
direction across the whole piece is exactly the failure mode to avoid.*

```
Audit session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch reinterp,
?reinterp=1). Read, in order: CLAUDE.md, docs/REINTERP_3D_STYLE_DIRECTION* (the Soft Lo-Fi law),
docs/reinterp/08_STATUS_REGISTER.md, docs/reinterp/01_SESSION_LOG.md Sessions 66-67 (⚑ the measured
findings and the SOLVER S66 built — reuse it, do not reinvent it), then src/room/cluster.ts,
src/room/assets.ts, src/room/era1room.ts, src/room/movementNodes.ts, src/engine/app.ts, data/room/*.

THE JOB: visit the whole piece systematically and report every positional, framing and lighting fault
in one prioritised list. The player turns and never walks, so "walking around" means: EVERY SEAT ×
EVERY ERA STATE × EVERY ROOM, plus each overlook pose from the S67 choreography.

SCOPE:
1. ⚑ LEAVE A REUSABLE TOOL BEHIND: tools/room-audit.mjs (or equivalent). S66's overlap solver was
   ad-hoc and is gone. This must be runnable again after every future room change, and it should
   report: prop-in-prop overlaps with measured penetration depths; props intersecting walls/floor;
   props outside their room's bounds; and any prop whose RENDERED extent disagrees with its AUTHORED
   scale (the class of bug S66 found — a field honoured at both ends and dropped in the middle).
2. THE VISUAL SWEEP: screenshot every seat in every era state, and every overlook. For each frame
   report anything unlit, anything out of frame that should be in it, anything clipping, and any
   surface reading as an untextured block.
3. KNOWN OPEN ITEMS — confirm, measure, and either fix-by-measurement or write up:
   - the `?debug=1` "CURRENT:" readout reports Room 1 at BOTH device seats (S66, unfixed)
   - Room 1 carries the same inherited scale debt S66 fixed per-prop in Room 2 (deliberately not
     regressed; decide and propose)
   - the desk seat frames the monitor tightly enough that the desk surface sits below default gaze
   - E3→E4's cascade peaks at 63 draw calls against a ≤60 Quest budget (62 of it pre-existing; cause
     is in src/room/batching.ts)
   - eight pre-existing `terminalFrame` batch asserts
4. ⚑ THE DOORPLATES ARE CUT — Sérgio, 2026-08-03: "the doorplates aren't good." Remove them and their
   data. The choreography itself STAYS; only the plates go. S66 removed their job: they captioned
   rooms that had no identity, and Room 2 now has one.

⚑ WHAT YOU MAY FIX vs WHAT YOU MAY ONLY PROPOSE:
  FIX: anything provably wrong by measurement — geometry inside geometry, a prop through a wall, a
  rendered extent that disagrees with its authored scale, a light that is not reaching a surface,
  a readout naming the wrong room. Measure first, then fix, and report the numbers.
  PROPOSE ONLY: anything that is taste — framing, composition, what a seat should look at, palette,
  what a room should contain. Write it up with a screenshot and a one-line rollback. DO NOT
  redecorate the piece. Room 1 is the benchmark and is NOT to be regressed without Sérgio's word.

LAWS: Soft Lo-Fi · ≤3 hero objects per scene · palette ratchet 33, must not rise · Quest budget
≤75k tris, ≤60 draw calls, 72 Hz · no runtime network, no storage · C6 (panel completeness) and C8
(mark this block SHIPPED when done) both apply.

FILE FENCE: tools/room-audit.mjs (new), src/room/*.ts, src/engine/app.ts, src/debug/panel.ts,
data/room/*.json, data/strings/, docs/reinterp/BUILD_QUEUE_LIVE.md (flip this block to SHIPPED),
docs/reinterp/01_SESSION_LOG.md, docs/reinterp/08_STATUS_REGISTER.md, BUILD_LOG.md.
Git: EXPLICIT PATHSPECS only.

DELIVERABLE: a prioritised findings list in the session log — WORST FIRST, each with its measurement,
whether it was fixed or proposed, and a screenshot reference. Plus the reusable tool. Plus ONE line
in BUILD_LOG.md. ⚑ Report faithfully: if something is still wrong at the end, say so plainly rather
than describing it as addressed.
```

---

# S72 — THE AUDIT SYSTEM: L3 + L4 · Opus, high effort
**⚑ PROMPT STATUS: SHIPPED 2026-08-04 — do not dispatch; the number is retired. `tools/shots.mjs`
+ `npm run audit`; 5 of the 6 assertions are live, assertion 6 (reachability on the ordinary path)
was NOT built and is named as not built. See BUILD_LOG.md and 01_SESSION_LOG.md.**
*Sérgio, 2026-08-04: "We for sure will have in the future to make a system of analysis and audit for
the experience so we can catch errors in time." Design: `docs/REINTERP_THE_AUDIT_SYSTEM_2026-08-04.md`.
⚑ The salvaged rig is already in `tools/harness/` — READ ITS README FIRST; it was written three times
and thrown away three times, and this session exists so that stops happening.*

```
Build session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch reinterp,
?reinterp=1). Read, in order: docs/REINTERP_THE_AUDIT_SYSTEM_2026-08-04.md (THE DESIGN — the five
tiers; L3 and L4 are this session), tools/harness/README.md (⚑ the salvage, and what is hardcoded in
it), tools/room-audit.mjs (L2 — the model for how a tool in this repo should be written: no browser,
no dependencies, cross-checked against the live engine), tools/check-spec.mjs (L1 — and the RATCHET
pattern every numeric check here must copy), docs/reinterp/01_SESSION_LOG.md Sessions 66-71 (where
the nine uncaught faults came from), then src/engine/app.ts, src/room/cluster.ts, src/debug/panel.ts,
package.json.

THE JOB: turn the thrown-away capture rig into a permanent one (L3), and add the six assertions that
make frames fail a build (L4). ⚑ NINE FAULTS REACHED SÉRGIO WITH ZERO COVERAGE — the design doc lists
them, and each assertion below exists because of a specific one.

SCOPE — L3, the capture tool:
1. Consolidate tools/harness/ into ONE tool with a CLI (tools/shots.mjs or similar): the visual sweep
   (every seat × era state × room + the S67 overlooks), the device-canvas grabs, and the contact-sheet
   composite. Keep asserts.mjs's console counting and relocmeasure.mjs's camera sampling as modes.
2. ⚑ PARAMETERISE WHAT IS HARDCODED, and the third one matters most: the Chrome path (macOS-only
   today); the dev-server port (5173 assumed, has served on 3000); and THE SEAT AND OVERLOOK POSE
   TABLES, which are currently COPIES of app.ts's and will silently rot. Read them from the app —
   expose them on the existing debug surface rather than duplicating them.
3. puppeteer-core stays a devDependency and must be OPTIONAL: `npm test` must never require a browser
   or a running dev server. If Chrome is absent, L3/L4 skip with a clear message and exit 0.

SCOPE — L4, the six assertions (all six; each cites the fault that motivates it):
1. ⚑ THE COMFORT ENVELOPE — sample the live camera rig through EVERY driven leg (entrance descent,
   all three choreography transitions, every scripted send); FAIL above 0.43 m/s or 9.1 °/s.
   relocmeasure.mjs already samples; it needs a threshold and an exit code. THIS IS THE HIGHEST-STAKES
   CHECK IN THE PIECE — E3→E4 shipped at 3.667 m/s, 8.5× the envelope, and nothing noticed.
2. DRAW-CALL CEILING — peak across every transition, as a RATCHET starting at today's real value
   (62 against a ≤60 budget). Nag downward; do not block on day one.
3. ⚑ BLANK-FRAME CHECK — a captured frame whose luminance variance is near zero is an unlit block or
   a dead screen. Ratchet the count. This one statistic covers three of Sérgio's own reports ("unlit
   black blocks", "photographs as brown mud", "Maya's screen is blank at the E4 home seat"). Tune the
   threshold against REAL frames, and report what it flags rather than trusting a guessed constant.
4. SUBJECT-IN-FRAME — each seat declares what it is for; assert that thing's projected position is
   inside the FOV. Catches the desk seat framing its subject 45-51° below a 21° half-FOV. The seat→
   subject mapping is DATA, authored, not inferred.
5. CONSOLE ASSERTS = 0 — S71 got the eight `terminalFrame` asserts to zero and nothing keeps them
   there. asserts.mjs already counts them.
6. REACHABILITY ON THE ORDINARY PATH — C6 proves every beat has a debug button; nothing proves a beat
   is reachable WITHOUT one. That is the S64 class of bug (`?era=` killed the spine and misled three
   playthroughs). If a full ordinary-path traversal is too large for this session, SAY SO and ship the
   other five rather than a fake version of this one.

⚑ THE DESIGN RULES, and they are not style notes — each one is why an existing check survived:
- RATCHETS, NOT PERFECTION. Every numeric check starts at today's real value and fails on GROWTH.
  The palette ratchet went 157 -> 33 because it nagged instead of blocking. A check that fails on day
  one gets disabled on day one.
- ONE COMMAND: `npm run audit`. If it takes three commands and a dev server by hand, it runs once.
- REPORT, DON'T REDECORATE: fix only what is provably wrong by measurement; PROPOSE anything that is
  taste. Nothing in this system may retune a composition on its own.
- CROSS-CHECK BEFORE TRUSTING. room-audit.mjs was verified against the live engine to 0.00000 m
  before a single number was believed, and that is why its findings held. Do the same here: if an
  assertion disagrees with the engine, the assertion is wrong until proven otherwise.

LAWS: no runtime network calls in src/ (the harness is a dev tool and lives in tools/) · no storage ·
palette ratchet 33 must not rise · C6 and C8 both apply (mark this block SHIPPED when done) ·
EXPLICIT PATHSPECS only, never `git add -A`.

FILE FENCE: tools/shots.mjs (new), tools/harness/*, tools/check-spec.mjs, package.json (scripts +
optional devDependency ONLY), src/debug/panel.ts (to expose the pose tables), src/engine/app.ts (to
export them), docs/REINTERP_THE_AUDIT_SYSTEM_2026-08-04.md (status only),
docs/reinterp/BUILD_QUEUE_LIVE.md (flip this block to SHIPPED), docs/reinterp/01_SESSION_LOG.md,
docs/reinterp/08_STATUS_REGISTER.md, BUILD_LOG.md.

DONE WHEN: `npm run audit` runs end to end and prints a readable report; `npm test` still passes
WITHOUT a browser or dev server; tsc + build green; every ratchet baseline set to a MEASURED value
with a comment saying which session measured it; BUILD_LOG gets ONE line.

⚑ REPORT FAITHFULLY: state which assertions are live, which are ratcheted and at what, and which you
could not build. A skipped check named plainly is worth more than a check that always passes.
```
