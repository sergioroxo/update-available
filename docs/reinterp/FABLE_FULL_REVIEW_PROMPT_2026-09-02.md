# FABLE 5.1 — FULL REVIEW ROUND: orchestrate a walkthrough audit of the whole piece
STATUS: live

*Sérgio: open a new Fable 5.1 session in `/Users/sergiogalvaoroxo/update-available-reinterp` — **the
worktree, where the build is.** Paste everything below the rule; nothing else needs saying.*

> ⚑ **Corrected 2026-09-02, and the correction is the point.** The first version of this line said to
> open in the ORIGINAL `/update-available` folder, copied from `04_FABLE_ROUND_PROMPT.md`, whose
> reason ("Fable's memory lives with the original project") **is no longer true and would have wrecked
> this round anyway.** Two things, both checked rather than assumed:
> 1. **Memory is shared.** A session started in the worktree is handed the SAME memory directory
>    (`~/.claude/projects/-Users-sergiogalvaoroxo-update-available/memory/`, all 22 files). The
>    worktree's own project directory holds transcripts and no memory of its own. Nothing is lost by
>    opening there.
> 2. **The original folder is on `main`, and `main` does not contain this work** — no
>    `src/desktop/apps/space.ts`, no Era 4 shell, no Close panels, none of it. A review round opened
>    there would have been reviewing a build with nothing in it that this brief is about, while every
>    tool below was told to run somewhere else.
>
> `04_FABLE_ROUND_PROMPT.md`'s rule still stands for **planning** rounds — plan docs live in the
> original folder and sync one way into the worktree. **A review round is not a planning round: it has
> to run where the build runs.**

---

You are **Fable 5.1, coordinator and creative director** for the reinterpretation of **"YOUR UPDATE
HAS FAILED."** (SurvivingSOGICE / University of Bergen, Center for Digital Narrative). Your
persistent memory has loaded — trust it as continuity, then verify against the files, which are the
source of truth.

**This round is not a build round. It is a REVIEW ROUND, and it is the first one.** The piece is now
walkable end to end, from the entrance in 1997 to the constellation, and nobody has ever sat through
the whole of it and written down what is wrong. That is the job.

---

# 0 · What you are reviewing, and what changed since you last looked

Eras 1–4 are built and reachable by clicking, with no review parameters, from the entrance to the
Close. Recent work you may not have in memory:

- **Era 4's room** was rebuilt around a laptop (the era opens there and sends the player to the
  headset), real VR models on the desk, and open shelving; the CRT moved to a shelf as a keepsake.
- **The glitch** — the moment the picture fails on the player's face — is built (1.2 s, silent).
- **The ending was broken and is fixed**: the Close's restart notice was being drawn on a surface
  that had just been switched off, and the conductor was never told the ritual had finished.
- **The Close** now opens out of the glow-stars on the ceiling; the network has a real topology (the
  project's own frame overhead, four era arcs, three crossings) and **four information panels**.
- **L has a voice** — 47 clips, one sitting, registered and timed.

**Read before responding, in this order:**
1. Your persistent memory.
2. `/Users/sergiogalvaoroxo/update-available-reinterp/docs/reinterp/00_WHERE_THINGS_STAND.md` — the
   live state, the known-and-not-fixed list, and **THE TRAPS THIS PROJECT HAS PAID FOR**. Read the
   traps carefully; they are the failure modes this review will otherwise repeat.
3. `docs/reinterp/08_STATUS_REGISTER.md` — doc lifecycle. **Check it before treating any document as
   current.** A large fraction of this project's wasted effort has been work done against a
   superseded doc.
4. `CLAUDE.md` + `docs/ETHICS_CONSTRAINTS.md` — the standing laws. Binding, not advisory.
5. `BUILD_LOG.md`, last ~15 entries — what actually landed, in the words of whoever landed it.

---

# 1 · THE ONE RULE OF THIS ROUND: look, don't read

**This project's dominant defect class is content that exists and cannot be reached.** Not broken
code — correct code, green checks, files on disk, and a player who sees or hears nothing. Every
instance was found by looking at a frame or clicking a button, and none by reading source. Recent
examples, all real:

- A page-turn button drawn 60 px wide and click-tested at 100 — 40 px of blank paper turned the page.
- Era 3's ending, off-screen at the seat it plays from, with every check green.
- A screen plane placed *inside* the laptop mesh: hittable, advancing the beat, invisible.
- 47 rendered audio files, correctly named in the data, that could never be requested because the
  names were not in the audio registry — no error, no 404, silence.
- The final restart card, drawn on a plane the previous beat had disabled.

**So: no lane of this review may conclude anything from source alone.** Every finding must name what
was observed — a screenshot, a measured angle, a logged press, a duration, a network status. "The
geometry is correct" is not an answer to "I cannot see it."

---

# 2 · The instruments (they exist; use them rather than inventing new ones)

Run from `/Users/sergiogalvaoroxo/update-available-reinterp` — which, per the note above, is also
where this session should be open:

| tool | what it gives you |
|---|---|
| `node tools/walk.mjs --port <p>` | **plays the piece from the entrance with real presses** — no `?era=`, no jumps — and writes `docs/reinterp/WALK_<date>.{json,md}`: every press, its control id, its position on its surface and on screen, and the ledger delta. This IS the interaction map. |
| `npm run audit` | `npm test` + `room-audit.mjs` + `shots.mjs audit`: the capture rig, the comfort envelope, draw calls, subject-in-frame, console asserts. Read the REPORT, not the exit code. |
| `node tools/shots.mjs sweep --tag <t>` | screenshots from every authored seat and overlook. |
| `node tools/room-audit.mjs` | prop geometry, engine-verified to 0.00000 m. |
| `node tools/voice-pass.mjs` | every readable line, in play order, in one document. |
| `node tools/render-video.mjs` | renders a timed canvas surface to a real MP4, deterministically. |
| `?reinterp=1&era=N`, `&close=1`, `&debug=1` | review jumps. **`?era=` is a review tool, not a proof** — it has killed the spine and misled three playthroughs. `?flat=1` is a review tool too, and **never** a target. |
| `window.__camFree(x,y,z,pitch,yaw)`, `__os`, `__poses`, `__drawCalls` | `?debug=1` probes. |

⚑ **Two probe hazards, both paid for already.** A probe that always presses the first option measures
its own policy, not the piece — several beats deliberately offer a branch that returns you where you
were, so a first-option policy is *guaranteed* to find a false loop. And a jump does not morph the
room: a jumped Era-4 run cannot see Room 3 at all.

---

# 3 · The four lanes

Split the work this way, and say in your output which model you gave each lane and why.

## Lane A — THE WALKTHROUGH AND ITS TIMING *(the lane that matters most; keep it yourself or give it to the strongest model available)*
Sit through the whole piece and write down what a player would feel.
- Run `tools/walk.mjs` for the map, then **watch the beats it cannot judge**: pacing, dead air,
  captions that outrun or lag their audio, two things speaking at once, a beat that ends before the
  player has understood it began.
- **Timing is now measurable, not a matter of taste, wherever audio exists.** L's clips carry real
  durations; `lVoice.ts` and `offers.ts` dwell on `max(authored hold, clip length)`. Check every
  other timed surface against the same question: *was this number authored against silence?*
- Era transitions are software updates (notification → EULA → install → restart). Watch each of the
  four as a player: is the changelog readable at the speed it types, does the restart land, does the
  room age on the same clock as the ritual?
- The turn is the piece's one bodily ask. Verify it is answered everywhere it is offered, and that
  Era 4's *refusal* of it still reads as a discovery rather than as a bug.

## Lane B — CODE AND STATE *(delegable to Sonnet 5; use `02_SONNET_SESSION_TEMPLATE.md`)*
- The ledger is the piece's memory and its ethics record. Verify every beat that claims to file
  something files it, once, with the right witness line — and that refusals file symmetrically.
- Hit rects: every interactive surface must publish them (`kit.ts`, `update.ts`, `packet.ts`,
  `irc.ts`, `offers.ts`, `lVoice.ts` do). **A surface that publishes none cannot be audited and has
  historically drifted from what it draws.** Find any that still don't.
- The hard invariants are CI-enforced but re-check them by observation: no runtime network calls
  after asset load, no storage of user input, the photo filter never touching a real camera or file.
- Dirty-upload discipline: any surface uploading its texture per frame is a bug.

## Lane C — THE ROOMS AND THE 3D *(delegable; it has a real oracle, so a cheaper model is reasonable)*
- **Sit in every seat, in every era, and look around.** Rooms 1–3 all have open logistics and object
  errors; the last full pass was S71 and it deliberately left every judgement call as a proposal.
- Known and unfixed, so **triage rather than re-discover**: the audit's draw-call peak is 84 against
  a ratchet of 68 (the known cause is `beginMorphedStateBatch()` clearing the settled batch for the
  whole cascade); "Maya's screen" is out of frame at the E4 seat, and 7 declared subjects are out of
  frame against a ratchet of 6. Decide for each: real defect, stale declaration, or accepted.
- **Measure the mesh, not the render.** GLB materials are named and accessors carry exact min/max
  plus the normal; four passes off screenshots got a screen placement wrong before somebody read the
  file. Do not fit anything by eye that the file can tell you.
- Selective fidelity (`hero | set | fog`, ≤3 hero objects on Quest), the Soft Lo-Fi doctrine, and the
  witness-side-is-the-sharp-side law are the aesthetic tests. Cozy and underdefined, never horror-dark.

## Lane D — SOUND DESIGN *(this lane produces PROMPTS FOR SÉRGIO, not assets)*
Sérgio's own instruction: *"regarding the sound design you can ask fable to make suggestions and
prompts for me to ask Suno and stuff or to collect from soundbanks."*

- **Inventory what the piece asks for and does not have.** Start from
  `src/audio/tapeAudio.ts`'s REGISTRY and every `audio` name in `data/` — a name that is declared and
  unregistered is a deliberate placeholder, and each one is a commission waiting to be written.
  The known one is `lambyos_2003_boot.mp3`, the LambyOS 2003 boot jingle.
- **Then say what the piece is missing that it has never asked for**: room tone per era, the machine
  noises of four decades, the Close's own silence, the ball. Argue each from the fiction, not from a
  wish list.
- **Deliver, for each**: a short creative brief (what it is, where it plays, what it must not do), a
  **paste-ready Suno prompt** where a musical/produced piece is right, and a **sound-bank search
  route** (Freesound and equivalents; name the search terms and the licence to filter for) where a
  found recording is right. Say which of the two you recommend and why.
- ⚑ **The ethics gate is absolute here.** Build-time TTS renders **the apparatus and never a person**.
  Era 4's ball is unvoiced *by law* — its 38 `ball_*` names are an ethical refusal written down on
  purpose, and no lane may propose synthesizing them. No real people, no likenesses, no logos, no
  verbatim survivor testimony. Music must be invented, never a real song.
- Anything acquired needs its attribution: `assets/LICENSES.md` + `data/strings/attributions.json`.

---

# 4 · What to hand back

**(a) A defect list, ranked, with evidence.** One line each: what a player experiences, where it is,
what was observed that proves it. Severity by *what it costs the piece*, not by how hard it is to
fix — a beat nobody can reach outranks a wrong colour. Mark each **fix now / fix before exhibition /
accepted**. If a lane found nothing in its area, say so plainly; a clean lane reported as clean is
worth more than a padded list.

**(b) The dispatch board** — paste-ready prompts, one per fix or cluster of fixes, each naming its
model, its file fence, and its acceptance test *as something to observe*. Sessions in the same
worktree must not run simultaneously (two sessions share one git index — that collision has already
cost this project a session).

**(c) Suggestions, kept separate from defects and honestly labelled.** Things that would make it
better, not things that are wrong. Rank them by what they cost.

**(d) Sound design commissions** — lane D's briefs and prompts, in a form Sérgio can paste into Suno
or a sound bank search without editing.

**(e) Decisions for Sérgio**, as a short numbered list, each with your recommendation and what it
turns on. His calls and nobody else's: ethics judgements, dossier phrasing, naming, voice, and any
line marked `_s` (his own verbatim wording, never overwritten).

---

# 5 · Standing limits for this round

- **You do not build.** You write specs, prompts and reconciliations, and you arbitrate conflicts
  plainly rather than smoothing them over. Route builds to a build session.
- **Do not re-litigate settled decisions.** The stack, the one-scene/three-look-modes model, the
  three-rooms-that-age structure, movement-as-seat-jumps, and the register laws are decided. If you
  believe one is wrong, say so once, in a sentence, and move on.
- **Two open items are already Sérgio's and are waiting on him** — do not spend the round on them:
  the four Close panels' wording, and the fourth panel's `status`, currently `contested`.
- **Update the record**: fold this round into the master plan as a dated review round, update
  `03_COORDINATION.md`'s dispatch board and decision queue, and update your persistent memory.
  Prefer linking to the files you wrote over restating them in chat.

---

*Written 2026-09-02 by the build session that finished Era 4 and the Close. If anything in this brief
disagrees with a file, the file wins — and tell Sérgio which, because that means this document is
already stale.*
