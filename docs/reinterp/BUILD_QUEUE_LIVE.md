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
| — | ~~S77 — L, and the room rewrites~~ (E4 Stage 2b) | ↓ below, in this file | ✅ **SHIPPED 2026-08-09.** ⚑ The deadname beat is built and is **BLOCKED-ON-READER-PASS** — a gate, not a review step |
| — | ~~S78 — the offers, and the hand-off~~ (2c) | ↓ below | **SHIPPED + VERIFIED 2026-08-06** — nine-beat pass and A/B captures recorded; no phone-viewport pass |
| — | ~~S79 — TRANSCENDANCE~~ (Stage 3) | ↓ below | ✅ **SHIPPED 2026-08-13.** The ball is built, the turn works, the record stays blank. ⚑ The BUILD gate was lifted; the **reader pass is still shut**, every MC line is a draft, and the MC may never be voiced by TTS |
| — | ~~S73 — Era 4 exists (one giant Stage 2)~~ | superseded | ⚑ **RETIRED 2026-08-06** — the space reframe split it into S76–S79 |
| — | ~~S75~~ | never written as a block | ⚑ **RETIRED 2026-08-06** — the number the STOPPED run used for itself; its one artefact (`src/desktop/theme/era4.ts`) is salvaged |
| — | ~~S80 — fix picking, then the gyro look-mode~~ | ↓ at the tail of this file | ✅ **SHIPPED 2026-08-09.** Its picking fix is closed; S77 and S78 subsequently shipped |
| **1** | **S85 — the third device pass** (relocation skip · the `📷 shot` button exits the piece on iOS · re-verify duck + entrance tap · warn that a debug jump's aftermath is not evidence) | ↓ at the tail of this file | ⚑ **QUEUED 2026-08-13, dispatchable now.** Both faults READ FROM SOURCE, not guessed: `app.ts:2348` still ends the relocation on pointerdown, and `panel.ts:543` uses `a.download`, **which iOS Safari ignores — it navigates to the blob and wipes the run** |
| **2** | **S81 — the visibility audit, read as broken interactions** | ↓ at the tail of this file | ⚑ **UNBLOCKED by S80** — its numbers mean something now, and it must run at a PORTRAIT viewport too. ⚑ **S79 ADDS ONE MEASUREMENT TO ITS SCOPE:** the settled E4 seat, turned 180°, renders **177 draw calls** against a ≤75 budget, and no audit run has ever sampled a turned seat (08 §20) |
| — | ~~S68 — gyroscope look-around on iPad~~ | never written | ⚑ **RETIRED 2026-08-05, and that retirement was WRONG** — reinstated as S80, new number per the reuse rule |

~~**⚑ S73 IS QUEUED**~~ **⚑ CORRECTED 2026-08-12: S73 is RETIRED; S79 is the next
unshipped implementation session.** Two other candidates the S72 audit
produced remain open and un-dispatched, both in the session log with their measurements: **the
comfort violations on the send seam** (10–16× the envelope; **⚑ S82 CORRECTION: the failing s2 leg
is ordinary-path reachable in E2, while failing s3/s4 remain inaccessible on Daniel's E3 CRT**; the
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
**⚑ PROMPT STATUS: SHIPPED — 2026-08-09 (Session 77). E4 Stage 2b: L's voice.**
*Built: ten conversation units / 32 drafted lines in `data/dialog/s4_l.json`; `LVoice`
(`src/desktop/apps/lVoice.ts`) drawing captions, chips and the label field over S76's place;
⚑ the room rewrites AND the captions run out (wrong, wrong, an offer, then a held silence and
`no category — held for review`); ⚑ both deadname instances, landing as paperwork, with the advisory
on the pre-fiction panel and the unvoiced opt-out in the game menu; the shrinking choice across three
stages including the correction chip's one-unit disappearance and its return; the batch-TTS pipeline
wired (32 lines, one voice, one sitting) with ⚑ NOT ONE LINE VOICED, by plan.
⚑ **BLOCKED-ON-READER-PASS:** the deadname beat, the advisory and the menu row are PLACEHOLDER-draft
and the trans reader pass is a GATE, not a review step — none of it ships without one.
Not done, and named: `?flat=1` still cannot reach Era 4 (08 §9's older debt, unchanged); the audio
registry in `src/audio/tapeAudio.ts` still needs the filenames after the render (outside the fence);
the master plan says "Echo" in prose at lines 146/153/156/157 (the fence said thread table only).
Record: `01_SESSION_LOG.md` (2026-08-09, S77) + `08_STATUS_REGISTER.md` §14.*

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
**⚑ PROMPT STATUS: SHIPPED + VERIFIED 2026-08-06.** ~~Its first session ended before acceptance:
nobody had played the beats in order, there were no screenshots, and there was no session-log
entry.~~ **⚑ CORRECTED:** the follow-up ran all nine beats, committed the A/B captures, and recorded
the kept droppable half. See `08_STATUS_REGISTER.md` §15. **Do not re-dispatch this block.**

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
**⚑ PROMPT STATUS: SHIPPED 2026-08-13 — the ball is built and verified; the number is retired, do not
dispatch. See BUILD_LOG.md, `01_SESSION_LOG.md` and `08_STATUS_REGISTER.md` §20. ⚑ WHAT IS STILL OPEN
IS NOT THE BUILD: the reader pass (ethics #16 + deep pass §5.3) remains a GATE before this scene is
shown, every MC line is a draft written to be replaced, the MC's audio must never be TTS, and A11 has
not run — the ball's captions are DOM chrome and do not render inside an immersive WebXR session.**
*Historical: ~~QUEUED — UNBLOCKED 2026-08-12 because S78 shipped.~~ ~~BLOCKED — on S78.~~ Stage 3:
the ball, and the only thing in the era that is not work.*
**⚑ RUN AFTER S84, AND NEVER ALONGSIDE IT.** Their fences overlap on `src/debug/panel.ts`,
`src/room/cluster.ts` and `src/state/ledger.ts`, and two sessions in this worktree share one git
index. S84 is a Codex tablet pass; this one is here, not Codex — it is register and ethics work.
⚑ **When you start, re-read `docs/REINTERP_DEVICE_FINDINGS_2026-08-12.md` §7 and 08 §§17–18** — S84
will have changed the debug panel's labelling and possibly the witness panel, both of which this
session touches.

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
  composed in TS · Quest ≤75k tris, ~~≤60 draw calls~~ **⚑ CORRECTED 2026-08-12: ≤75 draw calls**,
  72 Hz · no real people, orgs or logos in the fiction · ⚑ ETHICS #7 and the detransition rail: the target is ALWAYS the apparatus and its
  automation — NEVER detransitioners, never trans people, never the gender-exploratory clinical
  debate (both captions, unresolved).
  ⚑ `npm run audit` currently EXITS 1 on three send legs (78 grouped draw calls; s2 6.87 m/s,
  s3/s4 4.42 m/s). **S82 CORRECTION: s2 is ordinary-path reachable; s3/s4 are E3-inaccessible.**
  DO NOT fix, DO NOT raise the ratchet, do not let it block you. 08 §16 explains it.
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
   ⚑ AND MIND THE RHYME S77 CREATED, because it is a gift and a trap at once. S77 built the
   captions-running-out beat and its last state reads `ITEM · no category — held for review` — on a
   MENDED HOODIE. That is the same failure at private scale: the machine's vocabulary is *original*
   and *damaged*, and a repaired thing is neither.
   ⚑ SO THE BALL IS NOT THE FIRST TIME THE PLAYER SEES THIS. It is the second, and it must be the
   LARGER one — the same limitation, in public, with people in it, where the hoodie was one object
   alone in a room. USE the rhyme; do NOT repeat the wording. If the ball's line is a copy of the
   hoodie's, the ending is a callback instead of a discovery. Word it so a player who noticed the
   hoodie feels it land twice, and a player who did not still meets it whole.
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
**⚑ PROMPT STATUS: SHIPPED 2026-08-09 — picking fixed and verified, look-mode 3 built. Do not dispatch; the number is retired (see BUILD_LOG.md and 01_SESSION_LOG.md). ⚑ Its item 1 was S77's prerequisite and is now closed: a press in the back hemisphere is no longer discarded, so S77's chips will land.**
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
---

# S82 — THE INTEGRITY PASS: narrative, structure, and the bugs that keep coming back · **Codex GPT 5.6, high effort**
**⚑ PROMPT STATUS: SHIPPED 2026-08-12. Independent of S79/S81.**
*Sérgio, 2026-08-09: "I want Codex to do a narrative pass and an overall audit of the logic and
structure of the project and to lock down overbearing bugs."*

## ⚑ Why this is the right job for Codex, and where the line is
The project's own lane rule (`NEXT_PROMPTS_2026-07-30.md`) is that **Codex takes well-specified work
whose acceptance is `tsc` + `npm test` + `npm run build`, and its prompts must never claim visual
verification.** A narrative pass in the sense of *does this beat land* is explicitly NOT its lane —
that is register judgement and it stays with Sérgio and Claude.

**But there is a narrative job here that is exactly Codex-shaped and has never been done:**
**97 live design documents, 52 source files and 32 PLACEHOLDER data files, with a week of amendments
layered on top of each other.** Nobody has ever read the whole thing at once and asked *do these
agree?* That is consistency work, it is mechanical, it is large, and it is the single most likely
place a silent contradiction is hiding.

```
Audit session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch reinterp,
?reinterp=1). ⚑ YOU ARE AUDITING. Report first, fix only what is PROVABLY wrong (below).

READ, in this order:
  CLAUDE.md · docs/ETHICS_CONSTRAINTS.md ·
  ⚑ docs/reinterp/08_STATUS_REGISTER.md IN FULL — all fifteen sections. It is the map, and §5 tells
    you how it is meant to stay true. §6, §12 and §15 name failure CLASSES, not just instances ·
  docs/reinterp/01_SESSION_LOG.md (the tail, and NEXT UP) ·
  docs/reinterp/BUILD_QUEUE_LIVE.md (what is queued, shipped and retired) ·
  docs/REINTERP_MASTER_PLAN_v2_2026-07-12.md (the spine) ·
  then every `STATUS: live` doc under docs/ — there are ~97; you do not have to quote them, you have
    to notice where they disagree ·
  then src/, data/, tools/check-spec.mjs, tools/room-audit.mjs, tools/shots.mjs.

⚑ THREE RULES THAT GOVERN THE WHOLE SESSION:
  1. REPORT, DO NOT REDECORATE. Fix ONLY what is provably wrong by inspection: a referenced id that
     does not exist, a doc asserting something the code contradicts, dead code, a broken link, a
     stale pointer. EVERYTHING ELSE IS A FINDING, not an edit. Do not rewrite narrative text, do not
     make register calls (`operable`/`felt`/`respite`), do not touch tone, and do not "improve"
     copy — all of that is Sérgio's and the co-creation norm covers it.
  2. ⚑ NEVER CLAIM VISUAL VERIFICATION. You cannot drive the browser. Your acceptance is `tsc`,
     `npm test`, `npm run build`. If a finding needs eyes, say "needs a visual pass" and stop.
  3. A "not found" IS a finding. If you check something and it is fine, say so — a clean result on a
     suspected fault is worth as much as a hit, and this project has been bitten by assuming.

──────────────────────────────────────────────────────────────────────
PART A · NARRATIVE AND DOCUMENT INTEGRITY  (the part nobody has ever done)

A1. ⚑ CROSS-DOCUMENT CONTRADICTIONS. ~97 live docs, many amended this week with "CORRECTED",
    "SUPERSEDED", "revision N" headers. Find every place TWO LIVE DOCS DISAGREE about a decision.
    ⚑ The known shape of this fault: `08 §6` — a schema dated 2026-07-22 encoded a rule the
    co-creation norm retired on 2026-07-24, and a session read the older file and believed it.
    THE OLDER FILE IS NOT ALWAYS THE WRONG ONE. Report both sides and which is dated later; do not
    decide.

A2. ⚑ DOES THE BUILD MATCH ITS OWN DOCS? For each era, take what the design docs say EXISTS and check
    it against `src/` and `data/`. Two directions, both matter:
      (a) documented but absent — a beat, a prop, a string, a mechanic a doc claims is built
      (b) ⚑ BUILT BUT UNDOCUMENTED — code with no design doc behind it. This is the quieter fault and
          it is how a piece drifts from its own intention.
    ⚑ The class name for (a) is in the register already: "planned, partially done, assumed complete."

A3. NARRATIVE SPINE CONSISTENCY. `MASTER_PLAN_v2` §5b names six continuity threads (the watcher, the
    board, the machine, the name/file, the warm objects, the law outside) with a value per era.
    ⚑ Check each thread actually appears in each era's data/code. A thread with a gap is a real
    finding, and the table has never been checked against the build.

A4. NAME AND TERM DRIFT. The assistant is Lamby → Lambient → **L**. Rooms map: Room 1 = Daniel
    (E1+E2), Room 2 = Vera (E3), Room 3 = Maya (E4). Check for stale names, wrong room/era mappings,
    and any surviving "Echo". ⚑ Also check invented marks are used consistently and that NO REAL
    organisation, person or brand has leaked into `data/` (they are dossier/provenance only).

A5. THE PLACEHOLDER AND VERIFY LEDGER. **132 `[VERIFY SOURCE]` markers and 32 PLACEHOLDER data files.**
    Nothing counts them and nothing tracks whether they are being retired or accumulating. Produce
    the census, grouped by era and by kind. ⚑ This is the "Dossier's evidential health" audit named
    in `REINTERP_THE_AUDIT_SYSTEM_2026-08-04.md` and never built — **the one the article will be
    judged on.**

──────────────────────────────────────────────────────────────────────
PART B · LOGIC AND STRUCTURE

B1. ⚑ REACHABILITY ON THE ORDINARY PATH — assertion 6 of the audit system, NEVER BUILT, and the
    register is now THREE FAULTS DEEP behind it (`08 §14`). Trace, statically, whether every beat is
    reachable by ordinary clicking from the front door — no debug jumps. You cannot click, so do it
    by reading the state machines: `spine.ts`, `os.ts`'s phase graph, `E4Shell`, `LVoice`, the update
    rituals. ⚑ REPORT ANY BEAT THAT ONLY A DEBUG BUTTON CAN REACH. That is the S64 class of bug that
    misled three playthroughs.

B2. ORPHANS AND DEAD SEAMS. Find code that nothing calls and seams nothing fires. ⚑ Known: `sends.ts`
    is a complete runtime whose own header says no beat triggers it. Find the rest. For each, say
    whether it is DEAD (delete) or LATENT-BY-DESIGN (a seam waiting for content) — those are
    different and must not be conflated.

B3. STATE AND LEDGER INTEGRITY. `ledger.ts` is in-memory only and wiped on exit — verify nothing
    writes to storage anywhere, and that every `wipeLedger` path is complete. ⚑ Check the FILING
    doctrine holds: some beats deliberately file NOTHING (Malta, Tape C, the ball, FloppySheep,
    playing Noa's video) because the apparatus did not ask for them. Confirm those are still silent.

B4. DATA SCHEMA DRIFT. Fields honoured at one end and dropped in the middle — this codebase has been
    bitten at least three times (`modelScale`, the ledger name prefill, the r3 `props` override that
    replaces rather than merges). Look for more of that exact shape.

──────────────────────────────────────────────────────────────────────
PART C · THE BUGS THAT KEEP COMING BACK

C1. ⚑ THE YAW-FOR-PLACE CLASS (`08 §12`) — a global yaw standing in for a place. Three instances
    found (S70's unclickable tablet, S71's wrong `CURRENT:` readout, S80's Recentre). S80 removed it
    from PICKING. ⚑ ONE INSTANCE IS KNOWINGLY OPEN: the keyboard is still gated on `facingBack`.
    FIND EVERY REMAINING PLACE the code compares a yaw to a threshold to answer "where am I?" or
    "what am I looking at?". Report each with a verdict: still correct here, or the same bug again.

C2. `?flat=1` (`08 §14`): it cannot reach E3 or E4, and it mounts NO DEBUG PANEL, so it is
    unreachable AND un-inspectable past E2. ⚑ NOTE THE FRAMING FIRST — CLAUDE.md was corrected on
    2026-08-06 and **flat is a REVIEW TOOL, not a fallback**. So this is a tooling gap, not a broken
    audience path. Scope what it would take; do not build it.

C3. THE LATENT SEND LEGS: over budget (78 draw calls against 75) AND over the comfort envelope
    (6.87 m/s against 0.43) — both on a seam no beat fires. Confirm still latent. ⚑ DO NOT FIX and
    DO NOT un-exclude them from the ratchet; note that whoever wires the first send beat owns both.

C4. Confirm the eight `terminalFrame` console asserts S71 closed are still at zero, and that no new
    console errors have appeared.

C5. ⚑ ANY BUG YOU FIND THAT IS NOT ON THIS LIST is the most valuable thing you can return. Say how
    you found it.

──────────────────────────────────────────────────────────────────────
FIX ONLY THESE, and only if provable by inspection: broken cross-references and dead links in docs ·
ids referenced but never defined · stale pointers (a doc naming a file/symbol that no longer exists) ·
genuinely dead code with no caller · a doc asserting something the code plainly contradicts (correct
the DOC, note it, and ⚑ never silently — this project corrects in place with the wrong claim left
visible, because the wrong claim is usually the interesting part).
⚑ EVERYTHING ELSE IS A REPORT.

LAWS: no runtime network calls · no storage · palette ratchet 33 · C1–C8 must still pass · C8: flip
this block to SHIPPED · Quest ≤75k tris, ≤75 draw calls · `npm run audit` currently exits 1 ONLY on
the three latent send legs — do not fix, do not raise, do not un-exclude.
Git: EXPLICIT PATHSPECS only — never `git add -A`; another session may share this worktree's index.

DELIVERABLE: `docs/reinterp/S82_INTEGRITY_AUDIT_<date>.md`, STATUS header, findings ⚑ WORST FIRST,
each with: what it is · where (file:line) · how you found it · FIXED or REPORTED · and for reported
ones, what it would take. Plus a one-line summary per part. Plus ONE line in BUILD_LOG.md, and a
`08_STATUS_REGISTER.md` section for anything that is a CLASS rather than an instance.

⚑ REPORT FAITHFULLY. If a part turns up nothing, say so plainly — do not manufacture findings to
fill a section. If you could not complete a part, name it and say why. A short honest audit is worth
more than a long one that pads.
```

---

# S83 — THE HORIZON IS LOPSIDED ON A REAL iPAD · **Codex GPT 5.6, high effort**
**⚑ PROMPT STATUS: SHIPPED 2026-08-12 — fix + always-visible `?debug=1` hardware diagnostic landed; UNVERIFIED ON HARDWARE until Sérgio photographs the iPad readout in portrait and both landscape directions.**
*Sérgio, 2026-08-12, on an iPad in landscape, over the deployed Pages build: the world is rolled
about 90° — the room is tilted and the laptop screen's text runs vertically. **Gyro is otherwise
working**: the permission was granted, `Stop device look` is on screen, E3 loaded.*

## ⚑ THE SHAPE OF THIS JOB, and why it is a Codex job with one condition
The fix is mechanical and well-specified. **But neither you nor a headless browser can rotate a
physical iPad**, so you cannot verify it — S80 built this whole path against synthetic events at a
fixed viewport, which is exactly why the fault survived to a device.

**So the deliverable is TWO things, and the second is what makes the first checkable:**
1. the fix, and
2. ⚑ **an on-device diagnostic readout** Sérgio can read on the iPad in ten seconds.
**A fix he cannot confirm is worth less than a fix plus a number he can photograph.**

```
Bug-fix session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch
reinterp). Read CLAUDE.md (⚑ the three look-modes; ?flat=1 is a REVIEW TOOL, not a fallback),
docs/REINTERP_THE_LOOK_MODES_2026-08-06.md, docs/REINTERP_MODE3_ASSESSMENT_2026-08-06.md,
⚑ /Users/sergiogalvaoroxo/Pc_Simulation/Sources/Deep Research/Cross-Platform PlayCanvas 360 Interactiv.md
(the q₀ × q₁ × q₂ chain this implements), docs/reinterp/08_STATUS_REGISTER.md §11 and §18, then
src/engine/app.ts around lines 1600–1740 (`screenAngle`, `composeMotion`, `applyMotionLook`,
`onDeviceOrientation`, and the `orientationchange` listeners near 1826).

THE SYMPTOM: on a real iPad in Safari, landscape, the entire world is rolled ~90°. Portrait is
reportedly fine. Gyro is otherwise live and the permission flow worked.

⚑ THE LEADING HYPOTHESIS, and it is a hypothesis — prove or disprove it before you change anything:
`screenAngle()` at app.ts:1637 does this —
    const so = window.screen?.orientation?.angle;
    if (typeof so === 'number') return so;
    const legacy = (window as { orientation?: number }).orientation;
    return typeof legacy === 'number' ? legacy : 0;
**If NEITHER API reports on iPadOS Safari, it returns 0 and the screen term q₂ vanishes** — so the
world is rolled by exactly however far the device was physically turned. **A 90° device rotation
produces a 90° error. That matches the report precisely.**
⚑ THE SECOND CANDIDATE, which produces a DIFFERENT error and must be distinguished: the sign. The
line `qScreen.setFromAxisAngle(pc.Vec3.FORWARD, screenAngle())` uses FORWARD = (0,0,−1), and its
comment claims that absorbs a sign flip from the three.js formulation. **If that reasoning is wrong,
the term rotates the wrong way and landscape is out by 180°, not 90°.** Work out which error the
symptom actually describes and say so.

SCOPE:
1. ⚑ FIX `screenAngle()` SO IT CANNOT SILENTLY RETURN A WRONG ANSWER. Returning 0 when it does not
   know is the failure — a 0 that means "portrait" and a 0 that means "no idea" are different facts
   and this code cannot tell them apart. Consider deriving orientation independently of the API —
   `matchMedia('(orientation: landscape)')` and the viewport aspect are always available — and
   reconciling that with the reported angle. ⚑ NOTE THE LIMIT: aspect alone cannot distinguish
   landscape-left from landscape-right (+90 vs −90), so say how you resolve that rather than
   assuming.
2. VERIFY THE SIGN AND THE AXIS of q₂ against the research spec's derivation. If the FORWARD-absorbs-
   the-flip reasoning holds, say so and leave it; if it does not, fix it and correct the comment IN
   PLACE with the wrong claim left visible, which is this project's house rule.
3. RE-ZERO ON ROTATION. `orientationchange` and `screen.orientation.change` both set `motionWantZero`
   (app.ts ~1826). ⚑ Check they FIRE on iPadOS — `orientationchange` is deprecated and the
   `screen.orientation` listener may not exist at all on the very platform where it is needed. If
   both are unreliable, poll the derived orientation instead and re-zero on change.
4. ⚑⚑ BUILD THE ON-DEVICE DIAGNOSTIC — this is half the deliverable, not a nicety. Behind `?debug=1`,
   a small always-visible readout showing, live:
     · what `screenAngle()` returns, AND which source it came from (screen.orientation / legacy /
       derived / unknown) — ⚑ the SOURCE is the finding, not just the number
     · raw alpha / beta / gamma
     · the derived orientation from matchMedia and the aspect
     · the resolved camera yaw/pitch/roll
   Sérgio reads it on the iPad and photographs it. **One look answers this bug AND several §13
   questions at once** — sensor noise (do the raw angles jitter at rest?) and whether the listeners
   fire (does the readout change when he rotates?).
5. WHILE YOU ARE IN THERE, and only if cheap: note whether anything else in this path assumes a
   viewport shape. Do NOT force an orientation — the piece must work held either way.

⚑ WHAT YOU MUST NOT DO
- **Do not claim you verified this.** You cannot rotate a device. Your acceptance is `tsc`,
  `npm test`, `npm run build`, plus reasoning you can show. Say plainly, in your report and in the
  session log, that the fix is UNVERIFIED ON HARDWARE and names what Sérgio must check.
- Do not touch the comfort envelope, the movement law, geometry, pacing or any narrative text.
- Do not "fix" the s2 send (08 §17) — that is a separate decision and it is Sérgio's.
- Do not add smoothing or filtering to the gyro to hide jitter. ⚑ Lag is its own nausea and the
  no-smoothing choice is deliberate. If the diagnostic shows real noise, REPORT it; do not damp it.

LAWS: no runtime network calls · no storage — the recentre zero and any orientation state live in the
in-memory ledger ONLY · input stays click/tap + the movement press + Esc; ⚑ the gyro is a LOOK and
must never select anything · palette ratchet 33 · C6 panel completeness, src/debug/panel.ts IS IN THE
FENCE · C8 flip this block to SHIPPED · `npm run audit` currently exits 1 on the s2/s3/s4 send legs —
do not fix, do not raise, do not un-exclude.

FILE FENCE: src/engine/app.ts, src/debug/panel.ts, src/state/ledger.ts, src/desktop/gameMenu.ts,
data/strings/gameMenu.json, docs/reinterp/{BUILD_QUEUE_LIVE.md,01_SESSION_LOG.md,08_STATUS_REGISTER.md},
BUILD_LOG.md. Git: EXPLICIT PATHSPECS only.

DONE WHEN: tsc + npm test + npm run build green; the diagnostic renders under ?debug=1 at a mobile
viewport; the session log states exactly what is unverified and what Sérgio should photograph.
⚑ AND WRITE THE ONE-LINE INSTRUCTION HE NEEDS: which URL to open on the iPad, and what a correct
readout looks like versus a broken one.
```

---

# S84 — THE TABLET PASS: every device-facing defect in one session · **Codex GPT 5.6, high effort**
**⚑ PROMPT STATUS: SHIPPED 2026-08-13 — automated checks and iPad-sized browser reasoning green;
UNVERIFIED ON HARDWARE. ⚑ RUN BEFORE S79 AND NEVER ALONGSIDE IT** — their fences overlap on
`src/debug/panel.ts`, `src/room/cluster.ts` and `src/state/ledger.ts`.
*Sérgio, 2026-08-12, after two real iPad passes: **"tablet will be the most used method (for the
exhibition at least)."** So these are not polish. They are the primary target. Findings and diagnoses:
`docs/REINTERP_DEVICE_FINDINGS_2026-08-12.md` §§1–7.*

```
Bug-fix session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch
reinterp). Read CLAUDE.md (⚑ the THREE look-modes; `?flat=1` is a REVIEW TOOL, not a fallback),
⚑ docs/REINTERP_DEVICE_FINDINGS_2026-08-12.md IN FULL — it carries the diagnosis for every item
below and you should not re-derive them — then docs/reinterp/08_STATUS_REGISTER.md §§11–18,
docs/REINTERP_MODE3_ASSESSMENT_2026-08-06.md, and the code: src/engine/app.ts, src/debug/panel.ts,
src/desktop/orientingCard.ts, src/room/cluster.ts, src/room/era1room.ts, data/room/*.json,
tools/room-audit.mjs, index.html.

⚑ YOU CANNOT VERIFY ON A DEVICE, and every item here is device-facing. Your acceptance is `tsc`,
`npm test`, `npm run build` plus reasoning you can show. **For each item, say what Sérgio must look
at on the iPad to confirm it.** A fix he cannot check is worth less than a fix plus an instruction.

──────────────────────────────────────────────────────────────
1 · ⚑ THE BLACK BOARD IN E2 — and there is a precedent, so DIAGNOSE BEFORE YOU MOVE ANYTHING
The large black rectangle on the wall is `witnessPanelFrame` — `[0, 1.5, 3.52]`, 1.8 × 1.4 × 0.1,
`#1a1a24`, on `wallSouth` at z 3.72. What Sérgio photographed is **the frame with nothing drawn on
it.**
⚑ THIS EXACT FAILURE HAS HAPPENED BEFORE. Session 27: the record plane's z was 3.685/3.865, **both
deeper than the frame's own near face (~3.649)**, so the plane fell BEHIND the frame the instant an
era transition ran and the surface read as a bare board. It was corrected once. It is black again,
at E2, after a transition.
**FIND WHAT RE-BROKE IT before touching any z.** If a later session re-introduced a `setPlaneZ`-style
override that runs on era shift, that is the bug — not the number. Report the mechanism, then fix it.

2 · ⚑ THE DUCK — MEASURE, DO NOT NUDGE
`node tools/room-audit.mjs` flags it in EVERY state, not only E3:
  `FLOATING  rainbowDuck  1.560 m of air under it (base y 1.560, nearest support below y 0)`
S71 fixed the r3 case; the original placement was never right.
  rainbowDuck  pos [1.98, 1.60, 0.38]  size 0.09 × 0.08 × 0.10
  shelfBoard3  pos [1.98, 1.54, 0.75]  size 0.28 × 0.04 × 0.85
Taken as centres, the duck's base is 1.56 and the board's top is 1.56 — they should touch, yet the
audit finds the FLOOR as nearest support. ⚑ Note the duck is at **z 0.38** while the board spans
**z 0.325–1.175**: it sits on the front lip, 5 cm from falling off. **Work out whether the audit has
a false negative on the support or the prop is genuinely misplaced, and say which.**
⚑ THE REAL TEST IS NOT THE AUDIT NUMBER: Sérgio cannot SEE the duck on the device. Fixing the number
without him then finding it has fixed nothing. Report where it should be visible from, in degrees off
the Room-1 seat bearing.
⚑ Do the same check for `teddyBox`, which shares its shelf and its history.

3 · THE FLOATING TAPE IN E2 — ⚑ NOT REPRODUCED, so investigate rather than assume
`room-audit` flags only `rainbowDuck`, `w_cardigan` and `e_hoodie`. **The last two are drapes** —
a cardigan over a chair back has nothing beneath it by design; that is an accepted pattern, not a
bug. **No tape is flagged in any state.** So either a tape's support is real and it only READS as
floating from that angle, or the audit misses a class. Check every tape prop (`tapeA`, `tapeB`,
`mixtape`, the shelf tapes) against its support in E2 specifically. ⚑ If they are all supported, SAY
SO — a clean result is a finding, and it tells Sérgio to send a framing rather than a bug.

4 · THE ENTRANCE — one regression and one design change
4a. ⚑ TAPPING MUST NOT SKIP THE ENTRANCE. `app.ts`'s pointer handler opens with
    `if (descentActive) { endDescent(); return; }` — firing on PRESS, ahead of S80's tap-versus-drag
    threshold. On a mouse this was deliberate and good (S48: the descent is skippable by anything, as
    a way OUT of a move). **On a tablet it is a trap: the first thing anyone does is touch the screen,
    and touching it to LOOK AROUND destroys the opening.** Route the skip through the same
    10 px / 1.2 s discrimination S80 already built — a press that travels is a look, a press that
    stays is a tap. Keep it skippable; make it deliberate.
4b. THE LIGHTS COME UP MID-FLIGHT (Sérgio's call, adopted). The room currently wakes on arrival; it
    should wake DURING the descent, so the player watches the room become itself rather than finding
    it already awake. ⚑ Do NOT change `DESCENT_SECONDS` (12.0, set deliberately — 08 §10) or any
    camera path; this is the light rig's timing only.

5 · FULLSCREEN, AND THE BETTER ANSWER BESIDE IT
⚑ iPadOS Safari supports the Fullscreen API; **iPhone Safari historically does not** — so the button
must HIDE ITSELF when unavailable rather than sit there dead. Put it in the game menu
(`src/desktop/gameMenu.ts`), which is frame-voice and already carries Restart and Recentre.
⚑ AND ADD THE WEB-APP MANIFEST + iOS meta tags, because on iOS "Add to Home Screen" gives MORE screen
than fullscreen does — no tab bar, no address bar — and it survives reloads. Both are small. Say in
your report which one you would recommend to an exhibition visitor.

6 · THE DEBUG PANEL — a labelling job, not a rewrite
Sérgio: *"too long, with no clear instructions of what to play around; some don't do anything."*
⚑ THE SECOND HALF IS A REAL KNOWN CLASS (S49 finding 6): many buttons jump INTO the middle of a
thread, and a beat whose prerequisites were never met **renders as nothing happening**. That is why
one button already reads "⏵ LINEAR ENTRY (play from here)".
**Give every button one of three marks, and put a one-line key at the top of the panel:**
  ⏵ ENTRY  — safe to press cold; plays forward from here
  JUMP     — lands mid-thread; may need state that is not set
  ACTION   — does something only while its beat is already live
⚑ Where you can cheaply tell that a beat is not armed, say so on the button ("not armed yet") rather
than letting it look broken. **Do not remove buttons and do not rename ids** — C6 fails, and it is
Sérgio's map of the piece.

7 · ⚑ ORIENTATION — VERIFY, DO NOT REDO
S83 fixed `screenAngle()` so it distinguishes "unknown" from a real 0, reconciles against gravity,
and polls rotation every gyro frame. **IT IS UNVERIFIED ON HARDWARE, WHICH IS NOT THE SAME AS
KNOWN-WRONG.** ⚑ DO NOT re-fix it. Read it, confirm the reasoning holds, and if you find an actual
defect say so with the line number. Otherwise leave it alone and note that Sérgio's photograph of the
`?debug=1` readout — specifically the SOURCE line — is what closes it.
While you are there: check nothing ELSE in the render path assumes a viewport shape.

──────────────────────────────────────────────────────────────
LAWS: no runtime network calls · no storage — everything in the in-memory ledger · input stays
click/tap + the movement press + Esc; the gyro is a LOOK and never selects · palette ratchet 33 ·
C6 panel completeness (src/debug/panel.ts IS IN THE FENCE) · C8 flip this block to SHIPPED · Quest
≤75k tris, ≤75 draw calls · ⚑ `npm run audit` exits 1 on the s2/s3/s4 send legs — DO NOT fix, do not
raise, do not un-exclude; that is a separate decision and it is Sérgio's (08 §17).
⚑ DO NOT change comfort timings, the movement law, narrative text, register calls or tone.

FILE FENCE: src/engine/app.ts, src/debug/panel.ts, src/desktop/orientingCard.ts,
src/desktop/gameMenu.ts, src/room/cluster.ts, src/room/era1room.ts, src/state/ledger.ts,
data/room/*.json, data/strings/*.json, index.html, public/ (the manifest + icons),
docs/REINTERP_DEVICE_FINDINGS_2026-08-12.md (status only),
docs/reinterp/{BUILD_QUEUE_LIVE.md,01_SESSION_LOG.md,08_STATUS_REGISTER.md}, BUILD_LOG.md.
Git: EXPLICIT PATHSPECS only — never `git add -A`. ⚑ COMMIT YOUR WORK; the last two sessions left it
uncommitted and someone else had to verify and commit it for them.

DONE WHEN: tsc + npm test + npm run build green; `node tools/room-audit.mjs` re-run and its numbers
reported; the era still plays by ordinary clicking; ⚑ AND A SHORT LIST FOR SÉRGIO — one line per item
saying exactly what to look at on the iPad to confirm it.

⚑ REPORT FAITHFULLY. Anything you could not diagnose, say so plainly rather than shipping a guess as
a fix. "I could not reproduce this" is a result.
```

---

# S85 — THE THIRD DEVICE PASS: the choreography, and the button that exits the piece
**⚑ PROMPT STATUS: QUEUED 2026-08-13 · Codex · dispatchable now.**
*Fence: `src/engine/app.ts`, `src/debug/panel.ts`, `BUILD_LOG.md`, `docs/reinterp/01_SESSION_LOG.md`,
`docs/reinterp/08_STATUS_REGISTER.md`. ⚑ Do NOT enter `src/room/`, `src/desktop/apps/` or `data/` —
S79 has just landed there and its texture is fresh.*

Sérgio ran the deployed build on an iPad on 2026-08-13. **The orientation fix is confirmed working**
and §18 is closed — his readout said `q₂ 90.0° · derived (API said 0.0°)` with `events legacy 0 ·
screen 0`, which proves both of S83's defences are load-bearing. **Do not touch that code.**

He found three things. **Two are diagnosed below and you should trust the diagnosis over your own
first guess — both were read from the source, not from behaviour.**

## 1 · ⚑ THE RELOCATION IS STILL SKIPPABLE — S84 fixed one of the two paths
> Sérgio: *"When jumping from era to era, you should be able to look around if you need, but tapping
> should not jump ahead."* … *"all the camera movements are still skippable."*

**He is exactly right, and `app.ts:2348` is why.** S84 rebuilt the descent to defer to S80's release
test, and left the line below it on the old immediate path:
```js
if (descentActive) { press = {…, opening: true}; …; return; }   // S84: deferred to release ✅
if (relocLeg) { endRelocation(); return; }                       // ⚑ still fires on POINTERDOWN
```
**Make the relocation behave exactly like the descent.** Same `opening: true` press record, same
10 px / 1.2 s release test, same "never fall through onto the landed room". The `pointerup` handler's
`if (p.opening)` branch must end **whichever** move is live:
```js
if (p.opening) { if (descentActive) endDescent(); else if (relocLeg) endRelocation(); return; }
```
⚑ **Leave the `keydown` path (2416–2417) alone** — a key is unambiguous and always was.

**Why this matters more than it looks:** the relocation is the longest scripted move in the piece and
it is *the argument about the building* — that these rooms are one building, and you are being moved
through it. **Losing that to an accidental thumb is not a UI annoyance; it is the thesis going by
unseen.** A drag to look around during the move is welcome and must keep working.

### ⚑ AND THERE IS A SECOND HALF TO THIS, MEASURED S85a — "keep working" is not the state today
**A drag during ANY driven camera leg does not look. It moves one frame and snaps back.**
`app.ts:2515–2516` rewrites `camPitch`/`camYaw` from the curve every frame, so the deltas
`pointermove` accumulates at `:2369–2370` are discarded on the next tick. Measured live on the
entrance, 2 s in: a 100 px drag took yaw **42.44° → 26.44°**, and the following frame put it back at
**42.40°** — a 16° jerk that returns, which is worse than inert.

> ⚑ **So fixing only the skip delivers a transition that ignores the hand entirely** — the tap no
> longer cuts it, and the drag still does nothing. Sérgio's sentence asks for both halves: *"you
> should be able to look around if you need, but tapping should not jump ahead."*
>
> **The shape of the fix (yours to design, this is the constraint, not the code):** carry the drag as
> an OFFSET applied on top of the curve's prescribed yaw/pitch, not as a write to `camYaw` the curve
> then overwrites — the same layering `applyMotionLook()` already uses for the gyro, which is exactly
> why the gyro DOES compose during the descent today and the drag does not. ⚑ Do NOT change
> `DESCENT_SECONDS`, the relocation leg durations, or any authored pose; the curve's own path must
> arrive where it always arrived. And the offset must not survive the landing — `endDescent()` /
> `endRelocation()` both commit an authored seat pose, and a leftover offset would tilt it.

## 2 · ⚑⚑ THE `📷 shot` BUTTON EXITS THE PIECE ON iOS — diagnosed, cause certain
> Sérgio: *"the snapshot button breaks the experience."*

`panel.ts:543`'s handler ends with `a.download = …; a.click();`.
**iOS Safari does not implement the `download` attribute. It ignores it and NAVIGATES to the blob
URL** — so the page is replaced, the run ends, and **the in-memory ledger is wiped** (it is the only
store there is; nothing persists by law). That is the whole of "breaks the experience".

**Two further faults in the same eight lines, both real:**
- `URL.revokeObjectURL(url)` fires **synchronously after `a.click()`**, which can revoke the blob
  before anything has read it. Race, not a certainty — but wrong on every platform.
- The out-of-band `app.render()` renders a frame outside the engine's own loop.

> ### ⚑ THE FIX IS TO HIDE IT, NOT TO REPAIR IT
> **`📷 shot` is a desktop review affordance and `tools/shots.mjs` is the real capture path.** There
> is no reason for it to exist on a tablet. Gate the button on a non-touch pointer
> (`matchMedia('(pointer: fine)')`) and **omit it entirely otherwise** — do not render it disabled,
> which invites the press. Keep it working unchanged on desktop.
>
> ⚑ **This is the same shape as the fullscreen row S84 built: capability-gated, absent when useless.**
> Follow that precedent rather than inventing a second pattern.

## 3 · The duck and the entrance tap — RE-VERIFY, do not re-fix
> ⚑ **DONE 2026-08-14 by S85a (08 §21) — both check out; change nothing.** The duck's base is
> **y 1.615**, exactly the bookcase's top board, footprint fully inside with 8 cm of front margin;
> `teddyBox` base **y 0.703** = its shelf top. The entrance was exercised live: a 100 px drag left
> `descent: true`, a stationary press+release landed the seat. **The E2 tape and the black board were
> re-derived too** — no tape floats in r2 by measurement, and the black board is
> `intake.ts:89–106`'s `drawDormant()` on an empty ledger, 12.5 cm IN FRONT of `terminalFrame`, so
> occlusion is arithmetically impossible. Read §21 before re-opening any of them.

He reported both still broken, **but he was testing a stale build** — the deploy was manual until
2026-08-13 and the fixes had landed without publishing. **Confirm on the current tree before changing
anything.** The duck is at **84.2° right of Room-1 forward**; a review pose facing forward will not
see it and that is the design. **If both check out, say so plainly and change nothing** — a fix
applied twice to a working thing is how the E2 `setPlaneZ` authority came back.

## 4 · ⚑ AND ONE THING TO WRITE DOWN, NOT TO FIX
> ⚑ **DONE 2026-08-14 by S85a.** The panel header now carries a second, amber line:
> *"⚑ a JUMP also leaves the ROOM mid-fold — a blank wall or a missing prop after one is not
> evidence. Re-check it on the played path."* Verified rendering. Nothing left here.

Three of his findings carried the same qualifier — *"if i jump from the debug mode."* **S84 could not
reproduce the tape, the board or a duck fault on the ordinary path and was telling the truth:** a cold
E2 has no filed record, so the board is *correctly* black, and a cold jump leaves props in a fold the
era never reaches.

S84 labelled the buttons **⏵ ENTRY / JUMP / ACTION**, which helps. **It did not warn that a JUMP can
also leave the ROOM in a state the played path never produces.** Add that to the panel's own header,
in one line, where the labels already are: *what you see right after a jump is not evidence about the
piece.* ⚑ **This is the highest-value thing in the session** — it is why three non-bugs cost two
sessions and an afternoon of device testing.

## Acceptance
- A **drag** during a relocation looks around and the move continues; a **tap** ends it; a key ends it.
- `📷 shot` is absent on a touch device and unchanged on desktop.
- Duck and entrance tap re-verified on the current tree, with the result stated either way.
- The debug panel says, in its own header, that a jump's aftermath is not evidence.
- `npx tsc --noEmit`, `npm test`, `npm run build` green. ~~**⚑ Run `npm run audit` and report the
  numbers** — S84 changed the entrance lighting and did not run it, so the blank-frame assertion may
  have moved.~~ ⚑ **RUN 2026-08-14 (S85a):** legs 68 / 39 / 57 / 62 / 78 unchanged, console asserts
  0, and **the blank-frame count IMPROVED to 0 against a baseline of 1** — the entrance lighting did
  not cost a frame. The only failures are the three retained send legs. **Still run it yourself and
  report; do not quietly re-baseline anything that moves.**
- One BUILD_LOG line; session log entry; commit on `reinterp`. **⚑ The deploy is now automatic on
  push** — so a push puts this on Sérgio's iPad. Do not push a build you have not tested.

---

# S81 — THE VISIBILITY AUDIT, READ AS BROKEN INTERACTIONS
**⚑ PROMPT STATUS: QUEUED 2026-08-13 · Codex · dispatchable after S85 (they share `01`/`08`/BUILD_LOG).**
*Fence: `tools/shots.mjs`, `tools/room-audit.mjs`, `docs/reinterp/01_SESSION_LOG.md`,
`docs/reinterp/08_STATUS_REGISTER.md`, `BUILD_LOG.md`, and ONE new doc,
`docs/REINTERP_VISIBILITY_AUDIT_2026-08-13.md`. ⚑ **Change no `src/` file except to fix a fault this
audit proves**, and if you do, say which measurement forced it.*

## ⚑⚑ READ THIS FIRST — the guardrail, and it is the whole risk of this session
**Turning IS the mechanic.** R28 §1: the player never walks; rotation is the exploration; the turn is
the piece's signature bodily ask. **So a prop being out of the default frame is NOT a defect — it is
very often the design working.** S71's P3 desks sit 41–51° below a 21° half-FOV and that was left as
a framing call, deliberately, and is carried in `OFF_FRAME_BASELINE = 6` so it is re-surfaced by
measurement rather than re-argued by hand.

> ### ⚑ THE FAILURE MODE TO AVOID IS "FIXING" THIS BY RE-AIMING THINGS INTO THE FRAME.
> That would flatten the piece into a picture of a room and delete the one gesture it is built on.
> **You are producing a MAP OF WHAT TURNING COSTS, not a list of things to move.**

**The distinction that makes this session worth running** — and it is the phrase in its own title:

| | |
|---|---|
| **Scenery out of frame** | **composition.** Measure it, print the bearing, leave it. Sérgio's call, and mostly he will say keep it |
| **⚑ An interaction the piece ASKS FOR, out of frame** | **a broken interaction.** The system offers, the player is asked to act, and nothing actionable is in front of them. **This is a bug and it is what you are hunting** |

**The known case, and your worked example:** at E1's belongings window (`Remind me later` on the first
update) the piece asks the player to choose what to keep — and **not one of the eight eligible props
was in the default frame**: mixtape 69.9°, duck 80.8°, cdStack 95.8°. That is the shape of the fault.
An offer with an empty frame reads as a broken window, not as an invitation to turn.

## THE FOUR MEASUREMENTS
The rig already has `framing()`, `toCameraSpace()`, `subjectsInFrame()` and the draw-call peaks.
**Extend it; do not rewrite it.** `tools/shots.mjs` has been thrown away and rebuilt three times in
this project's history and S72 consolidated it deliberately.

### 1 · REACHABILITY, as a bearing — not a boolean
For **every clickable prop in every era** (not one authored subject per seat — that is the existing
check and it stays), report the **yaw offset from the seat's authored forward at which it enters
frame**, and its elevation. **A bearing is information; `false` is not.** Sort the report by bearing,
because the ordering *is* the finding: it shows what the piece asks you to turn for, and how far.

⚑ **Flag separately, and loudly, any prop that is offered by a live beat while out of frame** — join
against the offer/belongings data rather than eyeballing it. That join is the session's core output.

### 2 · PORTRAIT — the viewport nobody has ever audited
Every sweep in this project has run landscape. **A phone in the hand is portrait**, and portrait is
not a crop of landscape: the horizontal FOV is far narrower, so things comfortably framed in landscape
leave frame entirely. **Run the whole framing pass at a portrait aspect as well and report both
columns side by side.** ⚑ Expect this to be the ugliest number in the report. Do not soften it.

### 3 · HIT SIZE — because a thumb is not a mouse
Project each clickable prop's hit rect (`window.__os.*.hits` — see the recall note in
`reinterp-real-click-verification`) and report its size **in CSS pixels at both viewports**.
**Apple's own HIG floor is 44×44 pt.** Anything under it is not reliably hittable with a thumb, and
S80's 10 px / 1.2 s tap threshold is a *desktop-measured* number sitting on top of it.
**Report; do not resize anything.** Several of these are small on purpose.

### 4 · ⚑⚑ DRAW CALLS AT TURNED SEATS — the number S79 surfaced
> **The settled E4 seat, turned 180°, renders 177 draw calls against a ≤75 budget** (`08 §20`).

**No audit run has ever sampled a turned seat except `r1-turned`.** So sample every seat at its
authored forward **and** at 180°, in every era, and print the matrix.

**Two things to hold while you do it:**
- **The ball is not the cause.** S79 measured it at **zero** draw calls — two omni lights and an
  ambient, no mesh, no stage, no canvas. It was 177 with and without. **The turn has cost this since
  S67.** Do not go looking for the ball.
- **⚑ It matters NOW because the ball is the first beat that gives a player a reason to hold that
  facing for three minutes.** A peak you pass through is not a sustained load at 72 Hz. **Root-cause
  it as far as the numbers go** — which meshes, which room, whether it is Room 3's belongings again
  (Session 74 traced the sends' +18 to exactly that) — and **write the diagnosis down even if the fix
  is a separate session.** A named cause is the deliverable; a fix is a bonus.

## THE RATCHET LAW — it applies to you
`BLANK_BASELINE`, `OFF_FRAME_BASELINE = 6`, `ASSERT_BASELINE = 0` and the draw ratchet all exist to
**fail on growth and nag downward**. **You may not raise a baseline to make a run pass.** If a number
has moved, that is the finding — report it and say what moved it. ⚑ **S84 changed the entrance
lighting and did not run `npm run audit`, so the blank-frame assertion may legitimately have shifted;
if it has, diagnose it rather than absorbing it.**

Any NEW baseline you add (portrait framing, hit size) starts at **the measured value with the fault
count named in a comment**, exactly as `OFF_FRAME_BASELINE`'s comment names S71's three desks. **A
baseline whose comment does not say what is in it is a number nobody can ever lower.**

## ACCEPTANCE
- `npm run audit` runs all four measurements and prints them as **one report with one exit code**.
- The reachability table is sorted by bearing and **names every offered-but-unframed interaction**.
- Portrait and landscape appear **side by side**, not in separate runs.
- The turned-seat draw-call matrix is printed, and **177 has a named cause** — or a written account of
  how far the numbers got and what would close it.
- `docs/REINTERP_VISIBILITY_AUDIT_2026-08-13.md` carries the findings **separated into COMPOSITION
  (Sérgio's call) and BROKEN INTERACTION (a bug)**. ⚑ **That separation is the deliverable.** A flat
  list of "things not in frame" is the failure mode of this session — it would read as an indictment
  of the piece's central gesture.
- No baseline raised. `npx tsc --noEmit`, `npm test`, `npm run build` green.
- One BUILD_LOG line; session log entry; `08` section. Commit on `reinterp`.
  ⚑ **The deploy is automatic on push** — if you touch only `tools/` and `docs/`, the published build
  is unchanged, which is the expected outcome here.
