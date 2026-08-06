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
| 1 | **S73 — Era 4 exists** (E4 Stage 2) | ↓ below, in this file | **QUEUED — S74 has shipped; both narrative gates were already closed 2026-08-06** |
| — | ~~S68 — gyroscope look-around on iPad~~ | never written | ⚑ **RETIRED unbuilt 2026-08-05** — see below |

**⚑ S73 IS QUEUED** (above) now that S74 has shipped Room 3. Two other candidates the S72 audit
produced remain open and un-dispatched, both in the session log with their measurements: **the
comfort violations on the send seam** (10–16× the envelope, still latent — no beat fires it; the
entrance descent's own COMFORT figure is fine, see Session 74's numbers), and **assertion 6**, the
ordinary-path traversal S72 did not build. ⚑ NEW, measured by Session 74: the draw-call ratchet (67)
is now exceeded — entrance 68, sends 78 — a side effect of Room 3's belongings; not root-caused this
session (see 01_SESSION_LOG.md's own account of the investigation).

### ⚑ S68 is retired, not pending (2026-08-05)
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

# S73 — ERA 4 EXISTS (Stage 2) · Opus, high effort · **here, not Codex**
**⚑ PROMPT STATUS: QUEUED — S74 shipped 2026-08-06 (Room 3 has its belongings, headset and dark CRT;
both phones have real models). Both narrative gates were already closed 2026-08-06. Dispatch this one.**
*Rewritten 2026-08-06 against the deep pass; the earlier version predated it and would have built the
wrong ball. Stage 2 of `REINTERP_E4_BUILD_PLAN_2026-08-05.md`. ⚑ THE BALL IS NOT THIS SESSION — it is
Stage 3, after the reader.*

## ✅ BOTH GATES CLOSED — Sérgio, 2026-08-06
1. ~~The ball reader~~ **LIFTED.** *"The ball reader is symbolic, you don't have to copy Black/Latinx
   people, this is interpretive. Read from the culture and infer."* The technique that makes that
   hold is in `REINTERP_E4_SOURCE_PASS_2026-08-06.md` §4: **the MC performs the FUNCTION — announce,
   categorise, celebrate — with NO ballroom vernacular, and invented categories in the piece's own
   register, exactly as `Household` is invented scripture.** The ball does not quote ballroom; it
   does what ballroom does. Ballroom is still credited as the influence on a Dossier card — a
   citation, not a gate. (Stage 3, still not this session.)
2. ~~Whose name the record retains~~ **ANSWERED BY FACT: Daniel.** ⚑ My §4.2 proposal rested on a
   false premise — **the reinterp build has no typed name.** `os.ts beginReinterpOpening()` sets
   `ledger.name = opening.o3_prefilled_name` = **"Daniel"**, under *"Welcome back,"* and *"we filled
   this in for you."* The typed path (`confirmName`) belongs to the shipped, non-reinterp build.
   **And the prefilled version is stronger:** the name was never the player's to give. So L saying
   *Daniel* to Maya in 2026 is not the record keeping something you offered — **it is the record
   still holding the name it assigned you thirty years ago.** One place in the ledger, no decision to
   defer. *(Note: CLAUDE.md's "the typed name … lives in the ledger" is stale for this branch.)*

## ⚑ AND THE SOURCE PASS CHANGED TWO THINGS — read `REINTERP_E4_SOURCE_PASS_2026-08-06.md`
- **L's FORM is now `documentary`, not `speculative`.** detrans.ai (Sept 2025; built on an
  open-weight model; scraped from ~2,700 r/detrans posters; investigated by Rewire News Group, 15 Jul
  2026) is a conversational AI doing this work. **It is also E3's correction list automated** — the
  same operation at 2,700 people with nobody's hands on it. Our L stays invented and labelled.
- **The LGB-split beat has a law attached** (source pass §2): a lobbying campaign with a named
  author, a documented purpose and an unsupported premise is **NOT** the gender-exploratory clinical
  debate. Attribute and source the first; both-captions-unresolved is reserved for the second.
  ⚑ Collapsing them would give a lobbying position the epistemic protection the piece reserves for
  genuine uncertainty — the worst error Era 4 could make.

```
Build session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch reinterp,
?reinterp=1). ⚑ VERIFY S74 HAS SHIPPED FIRST — if Room 3 still has no belongings and the phone has no
`model` field, STOP and say so; this session builds software into a room and the room is Stage 1.

Read, in order: CLAUDE.md, docs/ETHICS_CONSTRAINTS.md,
docs/REINTERP_E4_DEEP_PASS_2026-08-05.md (⚑ THE DESIGN — read before the older docs; it supersedes
their TRANSCENDANCE section), docs/REINTERP_E4_THE_ARGUMENT_2026-08-05.md (the rename, the export
source, the speculation ledger, the four decisions),
docs/REINTERP_E4_THE_DEVICE_2026-08-05.md (⚑ the headset, the visor-as-screen, and STAGE 0 CLOSED —
the touchless budget is a RULE), docs/REINTERP_E4_BUILD_PLAN_2026-08-05.md (you are Stage 2),
docs/REINTERP_E4_AUDIO_FIRST_DESIGN_2026-07-12.md + docs/REINTERP_E4_ECHO_SCRIPT_DRAFT_2026-07-13.md
(the era's design and twelve draft conversation units — ⚑ every "Echo" now reads "L"),
docs/reinterp/08_STATUS_REGISTER.md, then src/desktop/os.ts, src/room/era3Devices.ts (the screen-
mount pattern), src/room/fluidNiche.ts, src/state/ledger.ts, src/debug/panel.ts, tools/tts/,
data/dialog/s3_*.json (the shape a dialog file takes here).

⚑ SCOPE HONESTY: this is most of an era. If it does not fit, BUILD THE SPINE END TO END AND SAY WHAT
IS THIN. A playable era with four beats beats half an era with twelve, and the era must never be left
unreachable at the end of the session.

THE ERA: 2026, Room 3, Maya. The apparatus finally has a voice, and it is called **L** (Lamby →
Lambient → L: the dispersal finishing as a file designation). The player's position has escalated one
last time — E1 receive, E2 respond, E3 operate, **E4 watch.**

SCOPE:
1. ⚑ THE DEVICE IS A HEADSET AND THE VISOR IS THE SCREEN. She picks it up and puts it on. The 2D
   canvas this piece has textured onto a monitor for three eras now mounts on the visor — SAME canvas,
   same FILTER_NEAREST, same `?flat=1` fallback. **The one-surface law is untouched; only the mount
   point changed.** S74 built the prop and left a named seam; use it. Do NOT build a passthrough UI.
2. ⚑ THE TOUCHLESS BUDGET IS A RULE, NOT A MOOD: *if a beat can advance itself, it does.* The
   player's presses are reserved for THREE things — answering L by chip, the memories undo, and the
   turn. No menus, no confirmations, no "continue". The era is the only one where the piece moves
   without you, and that is what obsolete feels like from the inside.
3. ⚑ L MUST SOUND GOOD. The session's biggest trap. A voice that reads as sinister lets the real
   thing off the hook — the player concludes "I would notice", and they would not. L is warm,
   competent, unhurried, genuinely pleasant. More patient than E1's counsellor, kinder than E3's
   moderator, never tired of you. The uncanniness is in what it OFFERS, never in how it sounds.
4. ⚑ SUBTITLES ON EVERY SPOKEN LINE — accessibility AND safety: a caption read a half-second before
   the audio is the only warning an audio beat can give. Caption preference lives in the in-memory
   ledger ONLY. No storage, ever.
5. THE ROOM REWRITES — L captions Maya's objects, spoken, gentle and diagnostic. ⚑ And the captions
   RUN OUT: bring one thing it cannot place and L captions it wrong, twice, offers a third, then
   stops. The instrument visibly reaching.
6. ⚑ THE PHOTO EDITOR IS NOT AN APP — it is a MEMORIES feature. The system resurfaces her own
   photographs (*two years ago today*) and they have been ENHANCED. Nobody asked; nothing announced
   it. **The cruelty is that it is a GOOD photo** — well lit, flattering, cleaner. The system is
   pleased and thinks it did her a favour. Undo exists and works (the dismissal law); the next memory
   is already enhanced. ⚑ NO camera, NO file input, EVER — pre-authored sprites, same law as the
   Restoration Filter. Ethics #13: this claim stays `speculative [DO NOT CITE YET]`.
7. ⚑ THE DEADNAME BEAT — the highest-risk thing in the whole piece, and the era's truest.
   - NEVER a shock. No sting, no reverb, no dwelling. L says it the way a FORM says it — neutrally,
     in passing, as correct data. The violence is the neutrality.
   - A content advisory before the era, and A WAY NOT TO HEAR IT that is neither punishment nor loss
     of meaning: the caption still shows the system used a name Maya does not use, unvoiced.
   - Maya's name is NEVER in doubt to the player. The system is wrong. Not staged as a question.
   - ⚑ BUILD IT SO EITHER ANSWER TO THE OPEN DECISION DROPS IN (Daniel's 1997 file, or the name the
     PLAYER typed) — the name comes from ONE place in the ledger and nowhere else. DO NOT CHOOSE.
   - ⚑ TRANS READER PASS IS A GATE, NOT A REVIEW STEP. Mark the beat PLACEHOLDER-draft and
     BLOCKED-ON-READER-PASS and say so in the session log.
8. THE EXPORT (Byline Times, 14 Aug 2024 — the argument doc §1): US groups running European
   conferences, retreats in Poland and England, ~$300 online courses, directories pointing home.
   ⚑ THIS IS E3'S PAYOFF — Malta made it illegal SOMEWHERE and the apparatus moved to where the law
   was not. Stage it, do not explain it: one line does the whole argument if it is the right line
   (something is *"available in your region"* — a phrase only ever said by something that checked).
   Real orgs are DOSSIER-ONLY with the citation; the fiction uses invented marks.
9. THE LGB-ANTI-TRANS SPLIT, heard not read — L recommends "people like you". Render both sides,
   endorse neither, and ⚑ THE TARGET IS L'S CURATION, never the speakers. One counter-beat REQUIRED.
   Needs its own source pass: mark [VERIFY SOURCE] and do not assert.
10. ⚑ THE SPECULATION LEDGER (argument doc §2). E4 dramatises NOW, so the evidentiary burden goes UP.
    Every speculative beat gets a dossier card marked `speculative` — above all **L itself**, which is
    our extrapolation, not a documented product. AN UNLABELLED SPECULATIVE BEAT BECOMES A CLAIM.
    detrans.ai is in NO repo document: [VERIFY SOURCE], assert nothing about what it is.
11. THE FINALE sets up the Close and DOES NOT SPEND IT: glitch → cyclorama slits → four era panels →
    hand off. The cyclorama's "countless rooms" is the same image as the choreography's building —
    reuse that grammar, do not invent a second one.

⚑ WHAT IS **NOT** IN THIS SESSION:
   - **TRANSCENDANCE / the ball.** Stage 3, after the reader. Leave a clean, named seam for it and
     build NOTHING of it — not the audio, not the MC, not `NO CATEGORY FOUND`. ⚑ If you build a
     placeholder ball, Stage 3 will inherit your texture, and that texture is the one thing in this
     piece that is not ours to draft.
   - **The Close** (survivors first, "Your update has failed.", the dossier reframe, `Restart as you
     are.`). E4 hands off to it and must not pre-empt it.

AUDIO: L is batch-TTS through tools/tts/ — ONE voice, ONE description, ALL lines in one batch (drift
kills the effect). ⚑ Audio is generated only AFTER Sérgio's voice pass, so this session ships LINES AS
DATA + CAPTIONS with the pipeline wired and the clips pending. Say plainly that no line is voiced.

LAWS THAT WILL FAIL CI: no runtime network calls, no storage (ledger only) · no free-text keyboard ·
palette ratchet 33, must not rise · C1 (dossier cards REQUIRE status) · C2 (⚑ L is an assistant, so a
`felt` beat is a beat L is ABSENT from) · C6 (panel completeness; src/debug/panel.ts IS IN THE FENCE) ·
C8 (flip this block to SHIPPED) · all display text in data/ as PLACEHOLDER-draft · Quest ≤75k tris,
≤60 draw calls, 72 Hz · no real people, orgs or logos in the fiction · ⚑ ETHICS #7 and the
detransition rail: the target is ALWAYS the apparatus and its automation — NEVER detransitioners,
never trans people, never the gender-exploratory clinical debate (both captions, unresolved).

FILE FENCE: src/desktop/os.ts, src/desktop/apps/ (new E4 surfaces), src/desktop/theme/,
src/room/fluidNiche.ts, src/room/era3Devices.ts, src/room/cluster.ts, src/state/ledger.ts,
src/debug/panel.ts, data/dialog/s4_*.json (new), data/strings/, data/audio/ + tools/tts/ (wiring
only), docs/REINTERP_E4_*.md (the Echo→L rename + status),
docs/REINTERP_MASTER_PLAN_v2_2026-07-12.md (the rename in the thread table ONLY),
docs/reinterp/BUILD_QUEUE_LIVE.md, docs/reinterp/01_SESSION_LOG.md,
docs/reinterp/08_STATUS_REGISTER.md, BUILD_LOG.md.
Git: EXPLICIT PATHSPECS only — never `git add -A`.

DONE WHEN: npm run dev works; tsc + npm test + npm run build green; ?flat=1 clean; `npm run audit`
run and reported — ⚑ it currently exits 1 on the LATENT send legs (6.87 m/s, no beat fires them);
do not fix those here, do not add a new violation, and do not let the blank-frame or subject-in-frame
ratchets rise. The era playable end to end BY ORDINARY CLICKING. Screenshots of every beat in the
session log. BUILD_LOG gets ONE line.

ACCEPTANCE, BY FEEL:
- L is genuinely nice to be around, and you notice that you are answering it.
- The chips shrink and you only see it in retrospect.
- The deadname lands as paperwork, not as a scare, and it is worse for that.
- The enhanced photo is one you would have been pleased with, before you noticed.
- You reach the end of the era and the ball is missing in a way that feels like a held breath.
```

---

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
