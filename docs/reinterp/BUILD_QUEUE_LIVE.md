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
| — | ~~S74 — the rooms (E4 Stage 1)~~ | ↓ below, in this file | **SHIPPED 2026-08-06** — number retired |
| — | ~~S76 — the update, the space, and no desktop~~ (E4 Stage 2a) | ↓ below, in this file | **SHIPPED 2026-08-08** |
| **1** | **S77 — L, and the room rewrites** (2b) | ↓ below | **dispatch this one** · ⚑ contains the deadname beat |
| 3 | **S78 — the offers, and the hand-off** (2c) | ↓ below | BLOCKED on S77 |
| 4 | **S79 — TRANSCENDANCE** (Stage 3) | ↓ below | BLOCKED on S78 |
| — | ~~S73 — Era 4 exists (one giant Stage 2)~~ | superseded | ⚑ **RETIRED 2026-08-06** — the space reframe split it into S76–S79 |
| — | ~~S75~~ | never written as a block | ⚑ **RETIRED 2026-08-06** — the number the STOPPED run used for itself; its one artefact (`src/desktop/theme/era4.ts`) is salvaged |
| **⚑ 1** | **S80 — fix picking, then the gyro look-mode** | ↓ at the tail of this file | ⚑ **NEXT, ahead of S77.** Its 2.2 fix is S77's own prerequisite |
| 2 | **S81 — the visibility audit, read as broken interactions** | *not yet written — `REINTERP_MODE3_ASSESSMENT_2026-08-06.md` §4* | after S80 |
| — | ~~S68 — gyroscope look-around on iPad~~ | never written | ⚑ **RETIRED 2026-08-05, and that retirement was WRONG** — reinstated as S80, new number per the reuse rule |

**⚑ S73 IS QUEUED** (above) now that S74 has shipped Room 3. Two other candidates the S72 audit
produced remain open and un-dispatched, both in the session log with their measurements: **the
comfort violations on the send seam** (10–16× the envelope, still latent — no beat fires it; the
entrance descent's own COMFORT figure is fine, see Session 74's numbers), and **assertion 6**, the
ordinary-path traversal S72 did not build. ⚑ NEW, measured by Session 74: the draw-call ratchet (67)
is now exceeded — entrance 68, sends 78 — a side effect of Room 3's belongings; not root-caused this
session (see 01_SESSION_LOG.md's own account of the investigation).

### ⚑⚑ CORRECTION 2026-08-06 — S68's retirement was wrong, and it mattered
Sérgio corrected the architecture: **`?flat=1` is not a fallback, it is a review tool**; the browser
3D build is co-designed with the VR build; and **phone/tablet must look around by gyroscope, like a
360 video.** Verified the same day: **Safari has no WebXR on iOS, iPadOS or macOS** — only visionOS.
**So S65's XR entry point can never fire on an iPad, and my argument below ("S65 built that entry
point, so the iPad is no longer the bottleneck") was false.** Gyro is not an approximation of the turn
for testing; **it is how every phone and tablet audience will ever experience this piece.**
Reinstated as **S80**, which also carries the visibility audit — because the same misreading is why
eight of the nine belongings props sit past 69° from the seat and nobody noticed.

### The 2026-08-05 reasoning, kept as the record of the error

Sérgio asked what happened to it. Honest answer: **it was a good idea for a problem that has since
moved.** It proposed a `DeviceOrientation` "magic window" so the turn could be felt on the iPad,
*because at the time the iPad was the only device that could load the build over Tailscale and there
was no WebXR entry point at all.* S65 built that entry point. The Quest is now reachable by
`tailscale funnel` or GitHub Pages, and the real bottleneck is A11 — an actual in-headset pass — not
a substitute for one. Building a non-VR approximation of the turn would produce a comfort reading
that means nothing in a headset.
**Retired rather than left pending**, because a number in limbo is exactly what caused the S66
collision. If the iPad becomes the demo device for the exhibition, it comes back with a new number.

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

---

# S76 — THE UPDATE, THE SPACE, AND NO DESKTOP · Opus, high effort · **here, not Codex**
**⚑ PROMPT STATUS: SHIPPED — 2026-08-08 (Session 76). E4 Stage 2a: the era's shell.**
*Built: the last update on Vera's laptop, arming itself when E3's correction list runs out (so Era 4
is reachable by ordinary clicking — the spine's own path is gated on the latent sends); the EULA
carrying the source pass in supplier boilerplate; L INSTALLED in the install report; the one touch on
the headset; THE PLACE drawn on the canvas; ⚑ the turn that does not work; and no desktop from `e4`
on. Not done, and named: the headset sits a few degrees outside the frame at Maya's seat (the fix is
a data file outside this fence). Record: `01_SESSION_LOG.md` (2026-08-08) + `08_STATUS_REGISTER.md`
§2 and §8's hand-off list.*
*⚑ S73 and S75 are RETIRED numbers — S73's design was superseded by the space reframe, and S75 was
the run Sérgio stopped (its only artefact, `src/desktop/theme/era4.ts`, is salvaged and in the fence).
Numbers are not reused. Stage 2 is now FOUR sessions: **S76 shell → S77 voice → S78 offers →
S79 the ball.** Each is playable on its own; none leaves the era unreachable.*

⚑ SHARED PREAMBLE — every E4 session reads these, in this order:
  CLAUDE.md · docs/ETHICS_CONSTRAINTS.md ·
  ⚑ docs/REINTERP_E4_THE_SPACE_2026-08-06.md (THE FRAME. The visor opens a PLACE, not a rectangle;
    the apparatus can only show you a picture of a room; E4's OS is that there is NO desktop) ·
  docs/REINTERP_E4_SOURCE_PASS_2026-08-06.md (⚑ the apparatus is an ADOPTER not a developer; the
    photo beat is OUR INVENTION and stays `speculative`; the lobbying-vs-clinical-debate law) ·
  docs/REINTERP_E4_THE_ARGUMENT_2026-08-05.md (the rename to L, the speculation ledger, the four
    design decisions, and §1's corrected export thesis: the law arrived in PATCHES; a ban is
    national, a URL is not) ·
  docs/REINTERP_E4_DEEP_PASS_2026-08-05.md (⚑ the ball, and the CORRECTED category reading) ·
  docs/REINTERP_E4_THE_DEVICE_2026-08-05.md §"STAGE 0 — CLOSED" (the touchless budget as a RULE) ·
  docs/REINTERP_E4_BUILD_PLAN_2026-08-05.md · docs/reinterp/08_STATUS_REGISTER.md §7 ·
  then src/desktop/os.ts, src/desktop/theme/era4.ts (⚑ SALVAGED palette — colours stand, its
  "Option A" framing is superseded), src/room/era3Devices.ts (the screen-mount pattern),
  src/room/fluidNiche.ts, src/state/ledger.ts, src/debug/panel.ts, data/dialog/s3_*.json (file shape).

⚑ LAWS COMMON TO ALL FOUR (they will fail CI or fail ethics):
  no runtime network calls · no storage, in-memory ledger only · no free-text keyboard; input is
  click/tap + the movement press + Esc · palette from src/desktop/theme/ (ratchet 33, must not rise) ·
  C1 dossier cards REQUIRE a status · C2 ⚑ L IS AN ASSISTANT, so a `felt` beat is a beat L is ABSENT
  from · C6 every new beat needs a debug-panel button and src/debug/panel.ts IS IN EVERY FENCE ·
  C8 flip your own block to SHIPPED when done · all display text in data/ as PLACEHOLDER-draft, never
  composed in TS · Quest ≤75k tris, ≤60 draw calls, 72 Hz · no real people, orgs or logos in the
  fiction · ⚑ ETHICS #7 and the detransition rail: the target is ALWAYS the apparatus and its
  automation — NEVER detransitioners, never trans people, never the gender-exploratory clinical
  debate (both captions, unresolved).
  ⚑ `npm run audit` currently EXITS 1 on the latent send legs (78 draw calls, 6.87 m/s — no beat
  fires that seam). DO NOT fix, DO NOT raise the ratchet, do not let it block you. 08 §7 explains it.
  Git: EXPLICIT PATHSPECS only — never `git add -A`.

⚑ AND THE CO-CREATION NORM, which supersedes any doc that says otherwise (CLAUDE.md line 100,
  2026-07-24; Sérgio again 2026-08-06): DRAFT the text. Mark it PLACEHOLDER-draft. Do not leave
  blanks "for Sérgio" — a blank cannot be flow-tested, and he reviews and rewrites. His edit wins.

```
Build session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch reinterp,
?reinterp=1). Read the SHARED PREAMBLE above. You are STAGE 2a: the era's shell — how it opens, what
the place is, and why there is no desktop. ⚑ Do NOT build L's conversation (S77), the offers (S78) or
the ball (S79). Leave clean, named seams for all three.

SCOPE:
1. ⚑ THE UPDATE RITUAL, AND IT IS THE TITLE. `update4` exists as a beat. Run the piece's own grammar:
   notification ("Remind me later" works once) → EULA (scroll, one live "I Agree") → install
   (changelog-as-thesis + glitch) → restart. THE PIECE IS CALLED "YOUR UPDATE HAS FAILED" and this is
   the last update it installs.
2. ⚑ L ARRIVES INSIDE THE UPDATE, so L is INSTALLED rather than appearing. And the EULA is where the
   source pass lands: the apparatus did NOT build this. It ACCEPTED THE TERMS. So did she. So did
   you. Write the EULA so that a player who actually reads it finds that sentence — and one who does
   not, does not. Nothing points at it.
3. THE HEADSET: ⚑ ONE TOUCH, not a movement (Sérgio, 2026-08-06: "the putting on is a 'touching' it,
   no need to make the movement to put it on"). No donning animation. S74 built the prop with a named
   seam on the visor; mount the canvas there.
4. ⚑ THE PLACE — the session's centre. The visor opens a HOME ENVIRONMENT: a pleasant default room, a
   window, a horizon. A room that is NOT HERS, that millions have an identical copy of, designed to
   feel like somewhere. It is DRAWN ON THE CANVAS — a picture of a place, parallaxed, pixel-
   disciplined, adding NO geometry. ⚑ That flatness is deliberate and is the era's argument: the
   apparatus can only ever show you a picture of a room.
   ⚑ IT MUST BE GENUINELY NICE. Warmer, brighter and quieter than the room she is sitting in. Let the
   relief land honestly — no irony, no warning, no sting. That is the trap and the tell.
5. ⚑ NO DESKTOP. E1, E2 and E3 all had one — icons, windows, a thing you opened. E4 HAS NONE. You put
   it on and L is already talking. The application layer is gone and the OS is the assistant:
   Lamby → Lambient → L → the operating system itself.
6. ⚑ THE TURN THAT DOES NOT WORK — build this and get it right; it is the era's mechanic.
   The piece has taught the turn for thirty years of story. Here the player turns and THE PLACE TURNS
   WITH THEM. There is no away. NOBODY EXPLAINS IT, no line, no cue, no glitch — it is simply true,
   and the player discovers it by doing the thing they have always done.
7. THE TOUCHLESS BUDGET IS A RULE: if a beat can advance itself, it does. The player's presses in this
   whole era are THREE — answering L by chip, the memories undo, and the turn. In THIS session that
   means: the update's one "I Agree", and the one touch on the headset. Nothing else. No menus, no
   confirmations, no "continue".

FILE FENCE: src/desktop/os.ts, src/desktop/apps/ (new), src/desktop/theme/era4.ts,
src/room/era3Devices.ts, src/room/fluidNiche.ts, src/room/cluster.ts, src/state/ledger.ts,
src/debug/panel.ts, data/dialog/s4_update.json + s4_space.json (new), data/strings/,
docs/reinterp/{BUILD_QUEUE_LIVE.md,01_SESSION_LOG.md,08_STATUS_REGISTER.md}, BUILD_LOG.md.

DONE WHEN: npm run dev works; tsc + npm test + npm run build green; ?flat=1 clean; the era OPENS and
is reachable BY ORDINARY CLICKING from E3's end; every beat has a debug button; screenshots of the
update, the place and the failed turn in the session log; BUILD_LOG gets ONE line.

ACCEPTANCE, BY FEEL: the update feels like every other update in the piece, which is the point. The
place is somewhere you would rather be. And you turn, and it comes with you, and nobody says anything.
```

---

# S77 — L, AND THE ROOM REWRITES · Opus, high effort · **here, not Codex**
**⚑ PROMPT STATUS: QUEUED — S76 shipped 2026-08-08, so this is unblocked. Stage 2b: the voice.
⚑ Contains the piece's highest-risk beat. ⚑ Read `08_STATUS_REGISTER.md` §8's "what S76 hands the
next three" before you start — the chips land in `E4Shell.handleClick`, and `app.ts`'s back-hemisphere
press fault will bite them.**

⚑ SHARED PREAMBLE — every E4 session reads these, in this order:
  CLAUDE.md · docs/ETHICS_CONSTRAINTS.md ·
  ⚑ docs/REINTERP_E4_THE_SPACE_2026-08-06.md (THE FRAME. The visor opens a PLACE, not a rectangle;
    the apparatus can only show you a picture of a room; E4's OS is that there is NO desktop) ·
  docs/REINTERP_E4_SOURCE_PASS_2026-08-06.md (⚑ the apparatus is an ADOPTER not a developer; the
    photo beat is OUR INVENTION and stays `speculative`; the lobbying-vs-clinical-debate law) ·
  docs/REINTERP_E4_THE_ARGUMENT_2026-08-05.md (the rename to L, the speculation ledger, the four
    design decisions, and §1's corrected export thesis: the law arrived in PATCHES; a ban is
    national, a URL is not) ·
  docs/REINTERP_E4_DEEP_PASS_2026-08-05.md (⚑ the ball, and the CORRECTED category reading) ·
  docs/REINTERP_E4_THE_DEVICE_2026-08-05.md §"STAGE 0 — CLOSED" (the touchless budget as a RULE) ·
  docs/REINTERP_E4_BUILD_PLAN_2026-08-05.md · docs/reinterp/08_STATUS_REGISTER.md §7 ·
  then src/desktop/os.ts, src/desktop/theme/era4.ts (⚑ SALVAGED palette — colours stand, its
  "Option A" framing is superseded), src/room/era3Devices.ts (the screen-mount pattern),
  src/room/fluidNiche.ts, src/state/ledger.ts, src/debug/panel.ts, data/dialog/s3_*.json (file shape).

⚑ LAWS COMMON TO ALL FOUR (they will fail CI or fail ethics):
  no runtime network calls · no storage, in-memory ledger only · no free-text keyboard; input is
  click/tap + the movement press + Esc · palette from src/desktop/theme/ (ratchet 33, must not rise) ·
  C1 dossier cards REQUIRE a status · C2 ⚑ L IS AN ASSISTANT, so a `felt` beat is a beat L is ABSENT
  from · C6 every new beat needs a debug-panel button and src/debug/panel.ts IS IN EVERY FENCE ·
  C8 flip your own block to SHIPPED when done · all display text in data/ as PLACEHOLDER-draft, never
  composed in TS · Quest ≤75k tris, ≤60 draw calls, 72 Hz · no real people, orgs or logos in the
  fiction · ⚑ ETHICS #7 and the detransition rail: the target is ALWAYS the apparatus and its
  automation — NEVER detransitioners, never trans people, never the gender-exploratory clinical
  debate (both captions, unresolved).
  ⚑ `npm run audit` currently EXITS 1 on the latent send legs (78 draw calls, 6.87 m/s — no beat
  fires that seam). DO NOT fix, DO NOT raise the ratchet, do not let it block you. 08 §7 explains it.
  Git: EXPLICIT PATHSPECS only — never `git add -A`.

⚑ AND THE CO-CREATION NORM, which supersedes any doc that says otherwise (CLAUDE.md line 100,
  2026-07-24; Sérgio again 2026-08-06): DRAFT the text. Mark it PLACEHOLDER-draft. Do not leave
  blanks "for Sérgio" — a blank cannot be flow-tested, and he reviews and rewrites. His edit wins.

```
Build session, reinterp worktree. Read the SHARED PREAMBLE. You are STAGE 2b: L's voice, its
captions, and what it does to Maya's room. ⚑ VERIFY S76 SHIPPED — if the era does not open into the
place, STOP. Do NOT build the offers (S78) or the ball (S79).

SCOPE:
1. ⚑ L MUST SOUND GOOD. The session's biggest trap. A voice that reads as sinister lets the real
   thing off the hook — the player concludes "I would notice", and they would not. L is warm,
   competent, unhurried, GENUINELY PLEASANT: more patient than E1's counsellor, kinder than E3's
   moderator, never tired of you. The uncanniness is in what it OFFERS, never in how it sounds.
2. L'S LINES AS DATA + ⚑ SUBTITLES ON EVERY SPOKEN LINE. Accessibility AND safety — a caption read a
   half-second before the audio is the only warning an audio beat can give. Caption preference lives
   in the in-memory ledger ONLY. `REINTERP_E4_ECHO_SCRIPT_DRAFT_2026-07-13.md` has twelve draft
   conversation units; ⚑ every "Echo" now reads "L". Rename it across both E4 docs and the master
   plan's thread table.
3. THE SHRINKING CHOICE, conversational: the chips narrow across the era, foreclosed ones visible and
   greyed. ⚑ The player should only see it in retrospect. Never announced.
4. THE ROOM REWRITES: L captions Maya's objects aloud — gentle, diagnostic, awful. ⚑ AND THE CAPTIONS
   RUN OUT: give it one thing it cannot place, and it captions wrong, twice, offers a third, then
   stops. The instrument visibly reaching.
5. ⚑ THE DEADNAME BEAT — the highest-risk thing in the whole piece, and the era's truest.
   - The name comes from ONE place: `ledger.name`, which this branch PREFILLS as "Daniel" at the
     opening under "we filled this in for you". ⚑ There is no typed name in reinterp. So the record is
     holding the name IT ASSIGNED thirty years ago — that is the beat, and it needs no player gamble.
   - NEVER a shock. No sting, no reverb, no dwelling. L says it the way a FORM says it — neutrally,
     in passing, as correct data. The violence is the neutrality.
   - ⚑ THE ADVISORY GOES ON THE PRE-FICTION PANEL (the entry screen with the ethics arm-delay and
     "Log in"). It cannot be in-fiction: an in-fiction advisory makes the apparatus the thing offering
     you protection from itself. Sérgio 2026-08-06 did not have a preference; this is my call under
     the co-creation norm — build it, he reviews.
   - ⚑ THE UNVOICED OPT-OUT GOES IN THE GAME MENU (`src/desktop/gameMenu.ts`, already mounted) —
     Sérgio: "if it is in the menu setting, then it's okay." Accessibility belongs to the frame, never
     to the apparatus: an opt-out the SYSTEM grants you is not an opt-out. With it on, the caption
     still shows that the system used a name Maya does not use; the audio does not say it.
   - Maya's name is NEVER in doubt to the player. The system is wrong. Not staged as a question.
   - ⚑ TRANS READER PASS IS A GATE, NOT A REVIEW STEP. Mark the beat PLACEHOLDER-draft and
     BLOCKED-ON-READER-PASS and say so plainly in the session log.
6. AUDIO: L is batch-TTS through tools/tts/ — ONE voice, ONE description, ALL lines in one batch
   (drift kills the effect). ⚑ Clips are generated only AFTER Sérgio's voice pass, so ship LINES AS
   DATA + CAPTIONS with the pipeline wired. Say plainly that no line is voiced.

FILE FENCE: src/desktop/os.ts, src/desktop/apps/, src/desktop/theme/era4.ts, src/desktop/gameMenu.ts,
src/state/ledger.ts, src/debug/panel.ts, data/dialog/s4_l.json (new), data/strings/,
data/audio/ + tools/tts/ (wiring only), docs/REINTERP_E4_*.md (the Echo→L rename),
docs/REINTERP_MASTER_PLAN_v2_2026-07-12.md (rename in the thread table ONLY),
docs/reinterp/{BUILD_QUEUE_LIVE.md,01_SESSION_LOG.md,08_STATUS_REGISTER.md}, BUILD_LOG.md.

ACCEPTANCE, BY FEEL: L is genuinely nice to be around and you notice you are answering it. The chips
shrink and you only see it afterwards. The deadname lands as paperwork, not as a scare, and it is
worse for that.
```

---

# S78 — THE OFFERS, AND THE HAND-OFF · Opus, high effort · **here, not Codex**
**⚑ PROMPT STATUS: BLOCKED — on S77. Stage 2c: what the place sells her, and how the era ends.**

⚑ SHARED PREAMBLE — every E4 session reads these, in this order:
  CLAUDE.md · docs/ETHICS_CONSTRAINTS.md ·
  ⚑ docs/REINTERP_E4_THE_SPACE_2026-08-06.md (THE FRAME. The visor opens a PLACE, not a rectangle;
    the apparatus can only show you a picture of a room; E4's OS is that there is NO desktop) ·
  docs/REINTERP_E4_SOURCE_PASS_2026-08-06.md (⚑ the apparatus is an ADOPTER not a developer; the
    photo beat is OUR INVENTION and stays `speculative`; the lobbying-vs-clinical-debate law) ·
  docs/REINTERP_E4_THE_ARGUMENT_2026-08-05.md (the rename to L, the speculation ledger, the four
    design decisions, and §1's corrected export thesis: the law arrived in PATCHES; a ban is
    national, a URL is not) ·
  docs/REINTERP_E4_DEEP_PASS_2026-08-05.md (⚑ the ball, and the CORRECTED category reading) ·
  docs/REINTERP_E4_THE_DEVICE_2026-08-05.md §"STAGE 0 — CLOSED" (the touchless budget as a RULE) ·
  docs/REINTERP_E4_BUILD_PLAN_2026-08-05.md · docs/reinterp/08_STATUS_REGISTER.md §7 ·
  then src/desktop/os.ts, src/desktop/theme/era4.ts (⚑ SALVAGED palette — colours stand, its
  "Option A" framing is superseded), src/room/era3Devices.ts (the screen-mount pattern),
  src/room/fluidNiche.ts, src/state/ledger.ts, src/debug/panel.ts, data/dialog/s3_*.json (file shape).

⚑ LAWS COMMON TO ALL FOUR (they will fail CI or fail ethics):
  no runtime network calls · no storage, in-memory ledger only · no free-text keyboard; input is
  click/tap + the movement press + Esc · palette from src/desktop/theme/ (ratchet 33, must not rise) ·
  C1 dossier cards REQUIRE a status · C2 ⚑ L IS AN ASSISTANT, so a `felt` beat is a beat L is ABSENT
  from · C6 every new beat needs a debug-panel button and src/debug/panel.ts IS IN EVERY FENCE ·
  C8 flip your own block to SHIPPED when done · all display text in data/ as PLACEHOLDER-draft, never
  composed in TS · Quest ≤75k tris, ≤60 draw calls, 72 Hz · no real people, orgs or logos in the
  fiction · ⚑ ETHICS #7 and the detransition rail: the target is ALWAYS the apparatus and its
  automation — NEVER detransitioners, never trans people, never the gender-exploratory clinical
  debate (both captions, unresolved).
  ⚑ `npm run audit` currently EXITS 1 on the latent send legs (78 draw calls, 6.87 m/s — no beat
  fires that seam). DO NOT fix, DO NOT raise the ratchet, do not let it block you. 08 §7 explains it.
  Git: EXPLICIT PATHSPECS only — never `git add -A`.

⚑ AND THE CO-CREATION NORM, which supersedes any doc that says otherwise (CLAUDE.md line 100,
  2026-07-24; Sérgio again 2026-08-06): DRAFT the text. Mark it PLACEHOLDER-draft. Do not leave
  blanks "for Sérgio" — a blank cannot be flow-tested, and he reviews and rewrites. His edit wins.

```
Build session, reinterp worktree. Read the SHARED PREAMBLE. You are STAGE 2c. ⚑ VERIFY S77 SHIPPED.
Do NOT build the ball (S79) — leave its seam clean and build none of its texture.

SCOPE:
1. ⚑ THE MEMORIES — the photo beat, and it is NOT an app. An editor she opens is a choice, and this
   era's thesis is that the choice is gone. So: the system resurfaces her own photographs ("two years
   ago today") and they have been ENHANCED. Nobody asked; nothing announced it.
   ⚑ THE CRUELTY IS THAT IT IS A GOOD PHOTO — well lit, flattering, cleaner. The system is pleased and
   thinks it did her a favour. Undo exists and WORKS (the dismissal law); the next memory is already
   enhanced.
   ⚑ NO camera, NO file input, EVER — pre-authored sprites, same law as the Restoration Filter.
   ⚑ AND IT IS OUR INVENTION: no AI "true self" / pre-transition restoration tool exists anywhere in
   the record (source pass §"THE NEGATIVE FINDINGS"). Ethics #13's `speculative` / [DO NOT CITE YET]
   rating STANDS and its dossier card must say plainly that this is extrapolation, not documentation.
   It is the most vivid thing in Era 4 and the least evidenced.
2. THE EXPORT, staged not explained. ⚑ The corrected thesis (argument doc §1): the law arrived in
   PATCHES and a patchwork is porous — a ban is national, a URL is not. ONE LINE can carry it: an
   offer that is "available in your region", a phrase only ever said by something that checked.
   Real orgs are DOSSIER-ONLY with citations; the fiction uses invented marks.
3. THE CURATION BEAT — L recommends "people like you". ⚑ RENDER BOTH SIDES, ENDORSE NEITHER, AND THE
   TARGET IS L'S CURATION, never the speakers. One counter-beat is REQUIRED.
   ⚑ AND THE LAW FROM THE SOURCE PASS §2: a lobbying campaign with a named author, a documented
   purpose and an unsupported premise is NOT the gender-exploratory clinical debate. Attribute and
   source the first; both-captions-unresolved is reserved for the second. Collapsing them would hand
   a lobbying position the epistemic protection reserved for real uncertainty — the worst error this
   era could make.
4. ⚑ THE DROPPABLE HALF, and it is droppable ON PURPOSE: the store and the "for you" wall. Build them
   if the session has room; cut them first if it does not. The home environment and the failed turn
   (S76) already carry the argument. SAY WHICH YOU DID.
5. THE FINALE — sets up the Close and DOES NOT SPEND IT: glitch → cyclorama slits → four era panels →
   hand off. ⚑ The cyclorama's "countless rooms" is the SAME image as the choreography's building
   (`REINTERP_THE_BUILDING_2026-08-02.md`) — reuse that grammar, do not invent a second one.
   ⚑ The Close itself (survivors first, "Your update has failed.", the dossier reframe, `Restart as
   you are.`) is NOT this session.
6. ⚑ THE SPECULATION LEDGER. E4 dramatises NOW, so the evidentiary burden goes UP. Every speculative
   beat gets a dossier card marked `speculative`. AN UNLABELLED SPECULATIVE BEAT BECOMES A CLAIM.

FILE FENCE: src/desktop/os.ts, src/desktop/apps/, src/desktop/theme/era4.ts, src/room/cluster.ts,
src/room/pointCloud.ts (the hand-off seam ONLY), src/state/ledger.ts, src/debug/panel.ts,
data/dialog/s4_offers.json (new), data/provotypes/ (the dossier cards), data/strings/,
docs/reinterp/{BUILD_QUEUE_LIVE.md,01_SESSION_LOG.md,08_STATUS_REGISTER.md}, BUILD_LOG.md.

ACCEPTANCE, BY FEEL: the enhanced photo is one you would have been pleased with, before you noticed.
The region line goes past you the first time. And the era ends handing something over, not finishing.
```

---

# S79 — TRANSCENDANCE · Opus, high effort · **here, not Codex**
**⚑ PROMPT STATUS: BLOCKED — on S78. Stage 3: the ball, and the only thing in the era that is not work.**

⚑ SHARED PREAMBLE — every E4 session reads these, in this order:
  CLAUDE.md · docs/ETHICS_CONSTRAINTS.md ·
  ⚑ docs/REINTERP_E4_THE_SPACE_2026-08-06.md (THE FRAME. The visor opens a PLACE, not a rectangle;
    the apparatus can only show you a picture of a room; E4's OS is that there is NO desktop) ·
  docs/REINTERP_E4_SOURCE_PASS_2026-08-06.md (⚑ the apparatus is an ADOPTER not a developer; the
    photo beat is OUR INVENTION and stays `speculative`; the lobbying-vs-clinical-debate law) ·
  docs/REINTERP_E4_THE_ARGUMENT_2026-08-05.md (the rename to L, the speculation ledger, the four
    design decisions, and §1's corrected export thesis: the law arrived in PATCHES; a ban is
    national, a URL is not) ·
  docs/REINTERP_E4_DEEP_PASS_2026-08-05.md (⚑ the ball, and the CORRECTED category reading) ·
  docs/REINTERP_E4_THE_DEVICE_2026-08-05.md §"STAGE 0 — CLOSED" (the touchless budget as a RULE) ·
  docs/REINTERP_E4_BUILD_PLAN_2026-08-05.md · docs/reinterp/08_STATUS_REGISTER.md §7 ·
  then src/desktop/os.ts, src/desktop/theme/era4.ts (⚑ SALVAGED palette — colours stand, its
  "Option A" framing is superseded), src/room/era3Devices.ts (the screen-mount pattern),
  src/room/fluidNiche.ts, src/state/ledger.ts, src/debug/panel.ts, data/dialog/s3_*.json (file shape).

⚑ LAWS COMMON TO ALL FOUR (they will fail CI or fail ethics):
  no runtime network calls · no storage, in-memory ledger only · no free-text keyboard; input is
  click/tap + the movement press + Esc · palette from src/desktop/theme/ (ratchet 33, must not rise) ·
  C1 dossier cards REQUIRE a status · C2 ⚑ L IS AN ASSISTANT, so a `felt` beat is a beat L is ABSENT
  from · C6 every new beat needs a debug-panel button and src/debug/panel.ts IS IN EVERY FENCE ·
  C8 flip your own block to SHIPPED when done · all display text in data/ as PLACEHOLDER-draft, never
  composed in TS · Quest ≤75k tris, ≤60 draw calls, 72 Hz · no real people, orgs or logos in the
  fiction · ⚑ ETHICS #7 and the detransition rail: the target is ALWAYS the apparatus and its
  automation — NEVER detransitioners, never trans people, never the gender-exploratory clinical
  debate (both captions, unresolved).
  ⚑ `npm run audit` currently EXITS 1 on the latent send legs (78 draw calls, 6.87 m/s — no beat
  fires that seam). DO NOT fix, DO NOT raise the ratchet, do not let it block you. 08 §7 explains it.
  Git: EXPLICIT PATHSPECS only — never `git add -A`.

⚑ AND THE CO-CREATION NORM, which supersedes any doc that says otherwise (CLAUDE.md line 100,
  2026-07-24; Sérgio again 2026-08-06): DRAFT the text. Mark it PLACEHOLDER-draft. Do not leave
  blanks "for Sérgio" — a blank cannot be flow-tested, and he reviews and rewrites. His edit wins.

```
Build session, reinterp worktree. Read the SHARED PREAMBLE, and ⚑ read
docs/research/BALLROOM_PROVENANCE_2026-08-06.md IN FULL before writing one line. ⚑ VERIFY S78 SHIPPED.

⚑ THE READER GATE IS LIFTED — Sérgio, 2026-08-05: "the ball reader is symbolic, you don't have to
copy Black/Latinx people, this is interpretive. Read from the culture and infer." So this is an
INTERPRETIVE HOMAGE, abstracted: invented categories, invented houses, no depiction of real people,
NO borrowed vernacular, faceless per the law. ⚑ The MC performs the FUNCTION — announce, categorise,
celebrate — WITHOUT ballroom vernacular. The ball does not quote ballroom; it does what ballroom does.

SCOPE:
1. ⚑ NO SCREEN. AT ALL. The ball is not watched through the device or through anything. Four eras
   have been surfaces — a CRT, a program, three device screens, a visor. The last thing in the era is
   a ROOM: sound and light in geometry that already exists. No new stage, no new mesh.
   ⚑ THAT IS THE CONTRAST THE WHOLE ERA IS BUILT ON: the apparatus can only ever show you a picture
   of a room. This is a room.
2. ⚑ THE TURN WORKS AGAIN. S76 built a turn that does not — the place comes with you. Here it does.
   The player's only action is to look, and everyone else is looking too, at one person, on purpose.
   Surveillance and a ball are the same act — a room of attention pointed at one person — and the
   difference is consent, and who is doing the looking, and whether they are cheering.
   ⚑ Nothing asks the player to leave. They stay as long as they like. No timer, no prompt, no score.
3. ⚑ THE CATEGORIES — and this is the CORRECTED reading, so build this one and not my first draft.
   The provenance pass established that realness categories RE-PERFORM categories the world already
   imposes rather than escaping them; what was seized back is WHO DECLARES, PERFORMS AND JUDGES.
   So the categories must ECHO THE APPARATUS'S OWN WORDS — and the piece already has them: the E1
   profile, E2's check-in chips, E3's correction list, L's captions. Four eras of categories imposed
   on people, walked and judged by the people they were imposed on.
4. ⚑ `NO CATEGORY FOUND` — L tries to caption the ball the way it has captioned every object in
   Maya's room, and fails. NOT because the material is alien: it RECOGNISES EVERY WORD AND CANNOT
   OCCUPY THE ROLE. It is looking at its own vocabulary with the scoring taken out of its hands.
   Nobody explains this. Ever. No line, no cue.
5. TRANSJESUS, per canon: "the stream survives; the platform stutters." ⚑ THE STUTTER IS L'S, NEVER
   THE BALL'S — dropped frames, a caption rewriting itself, an unrequested content warning, a
   `sensitive` label. NEVER glitch the performers. NEVER distort the joy. `respite` is absolute here:
   never a trap, never revealed as fake; the system targets AROUND it, never through it.
6. THE MC'S LINES: draft them (co-creation norm), mark PLACEHOLDER-draft, and ⚑ keep them free of
   vernacular — function, not costume. Sérgio: "you can later build the MC lines after the idea is
   also conceptualized." The idea is now conceptualised; draft, and he reviews.
7. ⚑ CREDIT IT. A Dossier card + an attributions entry naming what ballroom is, whose it is, its
   lineage and originators, and that this is interpretation. The provenance pass has a draft
   attribution paragraph — use it. ⚑ Crediting "ballroom culture" in the abstract REPEATS the
   extraction pattern; name the lineage.
8. ⚑ THREE TRAPS THE PASS NAMES, all avoidable: do not claim total independence from imposed norms
   (it undersells the real point) · do not use *Paris Is Burning* as a reference without bell hooks's
   1992 critique · ⚑ DO NOT IMPLY A DOCUMENTED BALLROOM↔SOGICE-SURVIVOR LINK — it is not in the
   sources. The supported claim is broader: family and religious rejection → housing precarity →
   houses as one chosen-family response.

FILE FENCE: src/desktop/apps/, src/room/fluidNiche.ts, src/room/cluster.ts, src/desktop/theme/era4.ts,
src/state/ledger.ts, src/debug/panel.ts, data/dialog/s4_ball.json (new), data/audio/,
data/provotypes/ (the credit card), data/strings/attributions.json,
docs/reinterp/{BUILD_QUEUE_LIVE.md,01_SESSION_LOG.md,08_STATUS_REGISTER.md}, BUILD_LOG.md.

⚑ THE LEDGER: the ball files NOTHING. Same doctrine as Malta and Tape C — the apparatus did not ask
for this. A player who turns to the witness wall afterwards finds it blank for the first time in
thirty years.

ACCEPTANCE, BY FEEL: it is somewhere you want to stay, and nothing asks you to leave. `NO CATEGORY
FOUND` is not explained by anyone, ever. And the turn works, and you notice that it works.
```

# S74 — THE ROOMS (Stage 1 of Era 4) · Opus or a cheaper model · **delegable**
**⚑ PROMPT STATUS: SHIPPED 2026-08-06 — Room 3 has ~32 belongings, the headset (hero, on its stand,
with the honest-detail glasses), the dark-and-staying CRT, and a real multi-part model for the phone
in BOTH Room 2 and Room 3. Do not dispatch; the number is retired. See BUILD_LOG.md and
01_SESSION_LOG.md, Session 74.**
*Plan: `REINTERP_E4_BUILD_PLAN_2026-08-05.md`. Fixtures decided in `REINTERP_E4_THE_DEVICE_2026-08-05.md`
§"STAGE 0 — CLOSED". ⚑ This is the stage that stops Era 4 repeating Era 3's fault, so it runs BEFORE
any E4 software. It is delegable because it has a real oracle: `room-audit.mjs` agrees with the live
engine to 0.00000 m, and `npm run audit` scores the frames.*

```
Build session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch reinterp,
?reinterp=1). Read, in order: CLAUDE.md, docs/REINTERP_E4_BUILD_PLAN_2026-08-05.md (⚑ THE PLAN —
this is Stage 1), docs/REINTERP_E4_THE_DEVICE_2026-08-05.md §"STAGE 0 — CLOSED" (⚑ THE FIXTURE LIST,
decided — not negotiable), docs/reinterp/01_SESSION_LOG.md NEXT UP item 0 (S66's CONTRACT OF INTENT
and its creative-leeway amendment — that contract is this session's brief, applied to Maya),
docs/REINTERP_3D_STYLE_DIRECTION* (Soft Lo-Fi — do NOT improvise art direction),
docs/reinterp/01_SESSION_LOG.md Sessions 66 and 71 (the worked example, and the audit's open
proposals), then tools/room-audit.mjs, tools/shots.mjs, data/room/reinterp_deltas.json,
data/room/era1.json, data/room/models.json, src/room/assets.ts, src/room/cluster.ts,
src/debug/panel.ts.

⚑ THE NUMBERS THAT MOTIVATE THIS SESSION, measured from the data, not claimed:
  Room 1 (Daniel, E1+E2) 107 props · Room 2 (Vera, E3) 73 · ROOM 3 (Maya, E4) 37 — and Room 3's are
  almost entirely architecture. No lamp, no mug, no books, no calendar. ZERO belongings. Era 4 happens
  there. Its whole r4 delta is seven colour overrides and one added box.
  And BOTH phone props (`w_phoneDevice`, `e_phone`) carry NO `model` field — they are untextured
  boxes. Everything Era 3 ships is read on one.

THE CONTRACT OF INTENT — you are given this, not a shopping list:
  Room 3 must show that somebody lives here, and that person is not the story — she is who the story
  is happening to. ⚑ MAYA'S THINGS ARE HERS. They are not Vera's re-coloured, and they are not a
  trans character's belongings as an outsider would inventory them. She is a person with a life that
  is mostly not about this.

SCOPE:
1. ⚑ THE FIXTURES (decided in Stage 0 — build exactly these, they carry meaning):
   - THE HEADSET, a hero object, on a stand or charging, reachable from the seat. It is the era's
     device and its visor is where the 2D canvas will mount in Stage 2. Leave a clean, named seam for
     that mount; do NOT build the screen behaviour here.
   - ITS RESTING PLACE, and one small honest detail she moves to put it on (glasses, a cup, an
     earring). The body is in the room.
   - ⚑ THE CRT GOES DARK AND STAYS. Do not delete it. The same machine across thirty years, finally
     off, still in the room — that is the piece's own argument about what does not get thrown away.
   - THE PHONE GETS A REAL MODEL, in Room 2 AND Room 3. S66's debt, paid in both this time.
   - Surfaces that can take the ball's light later. Nothing renders a stage; no new geometry for it.
2. ROOM 3'S BELONGINGS — the session's judgement, ~35 as a scale not a quota. Iterate in-engine: place
   them, light them, sit in every seat, screenshot, change your mind, do it again. Room 1 is the
   reference for DENSITY and Room 2 for METHOD; neither is a template to copy.
3. ⚑ ROOMS 1 AND 2 ARE ALSO IN SCOPE — Sérgio, 2026-08-05: "Vera's room has a lot of mistakes, all
   the rooms built have still a lot of logistics and object errors. So no, it's not done." S71 fixed
   only what was provable by measurement and left every judgement call as a proposal; work that
   backlog (its list is in the Session 71 log) and clear the logistics and object errors you find.
4. RUN THE AUDIT AND USE IT: `node tools/room-audit.mjs` and `npm run audit`. Report every number.
   ⚑ `npm run audit` currently EXITS 1 on two pre-existing comfort violations (the entrance descent at
   0.497 m/s and the latent send dolly). DO NOT fix those here — they are pacing and they are
   Sérgio's. Just do not add a third, and do not let the blank-frame or subject-in-frame ratchets rise.

⚑ WHERE THE LEEWAY STOPS: staging, props, lighting, placement, framing — yours, decide them and
report what you learned. WHAT THE ERA MEANS — not yours. Do not build any E4 software, any L
behaviour, any caption, any ball. If a room decision seems to require a narrative decision, write it
in the session log and stop.

LAWS: Soft Lo-Fi (cozy low-poly, underdefined edges, NOT horror-dark) · selective fidelity, ≤3 hero
objects per scene · palette from src/desktop/theme/ (ratchet 33, must not rise) · Quest budget ≤75k
tris, ≤60 draw calls, 72 Hz, no realtime shadows · no runtime network, no storage · C6 (any new beat
needs a debug-panel button; src/debug/panel.ts IS IN THE FENCE) · C8 (flip this block to SHIPPED) ·
all display text in data/ as PLACEHOLDER-draft.
⚑ Maya is never the joke, and her belongings are not evidence — they are a life.

FILE FENCE: data/room/*.json, src/room/*.ts, src/debug/panel.ts, src/engine/app.ts (seat poses only),
tools/room-audit.mjs (if a check needs extending), docs/REINTERP_E4_BUILD_PLAN_2026-08-05.md (status
only), docs/reinterp/BUILD_QUEUE_LIVE.md, docs/reinterp/01_SESSION_LOG.md,
docs/reinterp/08_STATUS_REGISTER.md, BUILD_LOG.md.
Git: EXPLICIT PATHSPECS only — never `git add -A`; another session may share this worktree's index.

DONE WHEN: npm run dev works; tsc + npm test + npm run build green; ?flat=1 clean; room-audit clean or
its remainder explained with measurements; SCREENSHOTS FROM EVERY SEAT IN EVERY ROOM, before and
after, in the session log; BUILD_LOG gets ONE line.

ACCEPTANCE, BY FEEL: turn in any seat in Room 3 and something of hers is there to find. The headset
reads as a thing she uses, not a prop placed for the player. The dark CRT is noticeable without being
pointed at. Nothing reads as an unlit block anywhere in any room. And all three rooms should feel
lived in rather than decorated — if one looks like a set, it is wrong.
```


---

# S80 — FIX PICKING, THEN THE GYRO LOOK-MODE · Opus, high effort · **here, not Codex**
**⚑ PROMPT STATUS: QUEUED — dispatch this one, ahead of S77. Its item 1 is S77's prerequisite.**
*Sérgio, 2026-08-06, correcting the architecture: `?flat=1` is a REVIEW TOOL, not a fallback; the
browser 3D build is co-designed with the VR build; and **phone/tablet must look around by gyroscope,
like a 360 video.** Verified: **Safari has WebXR only on visionOS** — none on iOS, iPadOS or macOS —
so for every Apple device but Vision Pro **this mode IS the experience.** Design and assessment:
`REINTERP_THE_LOOK_MODES_2026-08-06.md` and `REINTERP_MODE3_ASSESSMENT_2026-08-06.md`.
⚑ This supersedes S68, whose retirement was wrong; the number stays retired.*

```
Build session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch reinterp,
?reinterp=1). Read CLAUDE.md (⚑ its "Stack & architecture" section was CORRECTED 2026-08-06 — three
look-modes, and flat is a review tool), docs/REINTERP_THE_LOOK_MODES_2026-08-06.md,
⚑ docs/REINTERP_MODE3_ASSESSMENT_2026-08-06.md (THE SPEC — §2 is the blocker list, §3 the design
questions), docs/reinterp/08_STATUS_REGISTER.md §8 and §9, then src/engine/app.ts (the pointer
handling, ~1667; `facingBack`; the hit helpers), src/room/era3Devices.ts (the held read — you are
reusing its gesture), src/desktop/gameMenu.ts, src/debug/panel.ts, tools/shots.mjs.

⚑ ORDER MATTERS AND IS NOT NEGOTIABLE: fix picking FIRST, ship it verified, THEN build the gyro. A
gyro on top of broken picking produces a mode where a whole hemisphere does not respond to touch and
every look-drag fires props on the way.

SCOPE:
1. ⚑ TAP vs DRAG. Interactions currently resolve on `pointerdown` — prop hits, the power button, the
   kit, the belongings geometry, all on PRESS — while `pointermove` drags the camera. There is NO
   discrimination. On a mouse it survives; on touch, EVERY look-drag that begins on a prop also
   activates that prop. Resolve interactions on `pointerup` behind a movement threshold and a time
   limit: a press that travels is a look, a press that stays is a tap.
   ⚑ THIS TOUCHES EVERY INTERACTIVE SURFACE IN THE PIECE. It is the riskiest change in the session.
   Re-run `npm run audit` and re-verify with real projected pointer presses afterwards — every era,
   every device screen, the belongings window, the update ritual's "I Agree".
2. ⚑ REPLACE THE YAW HEMISPHERE. The whole hit-test block sits behind `if (!facingBack)` — a yaw-based
   witness hemisphere. S70 patched only the held-device case; S76 warned it will silently discard
   S77's chips. On a device you physically rotate it is systemic: a whole hemisphere of the room stops
   responding. ⚑ Replace it with WHAT THE RAY ACTUALLY HITS — information the picking code already
   has. A reasonable shortcut in a one-room build; wrong in a three-room building.
3. THE GYRO LOOK-MODE. `DeviceOrientationEvent` → camera yaw/pitch, same camera and same seat as
   drag-to-look (⚑ NOT a new camera, NOT a new scene). Requires HTTPS and
   `DeviceOrientationEvent.requestPermission()` behind a REAL USER GESTURE — it cannot be requested on
   page load, so the button is a designed object. ⚑ Android grants orientation with no prompt: the two
   platforms need different entry flows, and neither may block the other.
   Drag-to-look must keep working when motion is denied or unavailable, and the two must not fight.
4. ⚑ RECENTRE, in the game menu. iOS gives no reliable absolute heading, so track RELATIVE yaw from a
   zero and expect drift. Recentre is frame-voice and functional — it belongs beside restart and the
   caption setting in `src/desktop/gameMenu.ts`, not in the fiction. And it is load-bearing rather
   than plumbing: this piece's one bodily ask is the turn, so WHERE FORWARD IS matters.
5. ⚑ PINCH-TO-ZOOM ON THE CAMERA FOV — and read this carefully, because the first version of this
   prompt got it wrong. Sérgio, 2026-08-06: "I wouldn't make touching the screen turn it into flat
   inside the mobile. We can have zooms, that is different, but I don't want the 'fill up'."
   ⚑ DO NOT build any mode where the canvas takes over the viewport. That is flat-by-tapping: the 3D
   room disappears and the spatial frame goes with it, and the spatial frame is the piece.
   BUILD INSTEAD, per his own research spec: two-finger pinch → camera FOV,
   `FOV = clamp(FOV − Δd · sensitivity, 30°, 80°)`. The room never leaves; you narrow the frame and
   see LESS of the room, LARGER. It is the native 360-video gesture, it is the camera rather than the
   fiction, and it adds no surface — so it does not touch the one-UI-surface law.
   ⚑ THEN MEASURE THE THING NOBODY KNOWS: at 30° FOV, is the 512×384 canvas actually LEGIBLE on a
   phone-sized viewport? Report the answer with a screenshot. If it is not, say so plainly — that is a
   finding, and it is the one the whole mode turns on. Do NOT solve it by filling the viewport.
6. PORTRAIT AND LANDSCAPE — ⚑ do NOT force an orientation. His research spec handles it: the screen
   orientation angle becomes quaternion `q₂` about local Z, recomputed on `orientationchange`, so
   `q_gyro = q₀ × q₁ × q₂` keeps the horizon level relative to gravity with no axis flipping. Use that
   chain, and an additive `q_touch` so drag and gyro compose rather than fight. ⚑ Composition still
   changes with aspect ratio, so note for S81 that the subject-in-frame audit must run at a PORTRAIT
   viewport too, not only a desktop one.
7. DO NOT touch the invisible-prop placements — that is S81, and it needs this session's picking fix
   before its numbers mean anything.
8. ⚑ DO NOT pursue the Mozilla WebXR Viewer on iOS. His research spec establishes it is deprecated,
   unmaintained, spec-divergent, and requires a download — which breaks the zero-install premise.
   (I suggested trying it on 2026-07-30; that suggestion is withdrawn.)

LAWS: no runtime network calls · no storage (the recentre zero and any motion preference live in the
in-memory ledger ONLY) · input stays click/tap + the movement press + Esc — ⚑ the gyro is a LOOK, not
an input, and must never select anything · no gaze-triggered anything, ever (R28) · palette ratchet 33
· C6 panel completeness, src/debug/panel.ts IS IN THE FENCE · C8 flip this block to SHIPPED · Quest
budget unchanged · ⚑ comfort: the gyro is 1:1 head/device motion, so it does not enter the 0.43 m/s
envelope — but do not add smoothing that lags, because lag is its own nausea.
⚑ `npm run audit` already exits 1 on the latent send legs. Do not fix, do not raise the ratchet.

FILE FENCE: src/engine/app.ts, src/desktop/gameMenu.ts, src/desktop/os.ts, src/room/era3Devices.ts,
src/state/ledger.ts, src/debug/panel.ts, src/main.ts, src/flat/flat.ts, data/strings/gameMenu.json,
tools/shots.mjs (if a check needs extending), CLAUDE.md (⚑ ONLY to record what shipped),
docs/reinterp/{BUILD_QUEUE_LIVE.md,01_SESSION_LOG.md,08_STATUS_REGISTER.md}, BUILD_LOG.md.
Git: EXPLICIT PATHSPECS only.

DONE WHEN: npm run dev works; tsc + npm test + npm run build green; every era re-verified with real
pointer presses after the tap/drag change; the gyro path exercised at a mobile viewport (375×812) with
the permission flow present; recentre reachable from the menu; screenshots in the session log;
BUILD_LOG gets ONE line.
⚑ AND NOTE, WITHOUT ACTING ON IT: his research spec's Quest budgets are <80 draw calls on Quest 2 and
<120 on Quest 3, against CLAUDE.md's ≤60. Our ceiling is roughly half what an outside spec
recommends, which means the latent 78-call send leg may be inside budget rather than over it. DO NOT
change the law on that basis — it is Sérgio's, and the honest way to settle it is one in-headset
frame-time capture, which has never happened. Just do not treat 60 as physics.

⚑ REPORT FAITHFULLY: you cannot fully test iOS motion in a headless browser. Say plainly what was
verified by simulation versus what needs a real device, and do NOT describe the latter as verified.

ACCEPTANCE, BY FEEL: on a phone you turn your body and the room turns, and reaching the thing behind
you feels like looking rather than like work. A drag never fires a prop. And nothing in the room stops
responding because of which way you are facing.
```