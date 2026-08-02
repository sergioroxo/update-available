# REINTERP RESTRUCTURE — ROUND 28 (2026-07-10)
STATUS: live

*Sérgio's live-trial direction + Fable's unification. Status: DIRECTION ADOPTED under the
autonomous-mode agreement (see `docs/reinterp/06_SERGIO_CHECKLIST.md` D1); the law revisions
in §5 and the opening decision in §4 are flagged there for his strike-through. This document
is the plan of record for the restructure; the master plan's queue is superseded where they
conflict, pending the §6 consolidation.*

---

## §1 What Sérgio said (2026-07-10, binding direction — captured, not paraphrased away)

1. The piece **started as a one-room experience and has evolved into a multi-room
   experience** — but movement hasn't evolved with it. The seat-to-seat jumps may be too
   harsh. Wanted: you can look around freely, but you **use the remote to move around**.
2. This opens room for **more interactive play** — mini-games and side quests.
3. It should be **clearer what a game menu is**, and there should be **instructions for
   moving around**.
4. This is a **co-guided experience**: the Lamby variants serve as **narrative
   conductors** — they maintain the flow.
5. The accumulated changes **broke the overall logic** — the ideas and documents "all fit
   and not fit together." A reorganization/restructuring is needed.
6. Concrete: the Room 1 bookcase is misoriented and too light *(dispatched — R28-0)*; the
   beginner cork panel **needs a profound revamp or scrapping — it's not working**. Find an
   opening that helps you understand the game and the overall space.

---

## §2 The unification: CONDUCTED MOVEMENT

Points 1, 2, 4, and 6 are not four asks — they are one design. Naming it so we can build it:

**The player always steers; the system curates where steering can take you.
Movement-as-permission.**

- **Node-graph movement — deliberate input, NEVER gaze-triggered** *(R28-b, Sérgio)*: the
  rooms' existing camera seats become *nodes*, and you jump between them only on an
  explicit remote action — a short blink/fade, never smooth locomotion. Gaze must stay
  free for EXPLORING: if looking at a marker armed movement, every curious glance would
  threaten a teleport — an immersion break. Looking is safe; moving is a hand act.
- **Input mapping (R28-b; to be device-verified at A11):**
  - *Quest 3 / WebXR* (`xr-standard` gamepad mapping, standardized across Meta Touch,
    Pico, etc.): **thumbstick** to highlight/cycle the available destination markers
    (Sérgio: "since we assume the remote in the hand we can use the joystick — maybe
    extra layers to gameplay"), **trigger or A** to confirm the jump. Controller *ray*
    pointing can substitute for the thumbstick where a marker is in view. Optional
    thumbstick snap-turn (90° steps) as a comfort assist — decide in headset.
  - *Desktop browser:* click the destination marker (mouse = the remote's analog);
    drag-to-look unchanged.
  - The joystick's "extra gameplay layers" (beyond destination choice) are noted as open
    design space — nothing else binds to it yet; anything new must clear the same
    comfort + no-score laws.
- **The era relocation flow (R28-b, Sérgio — this is how the three-rooms model breathes):**
  - **Era 1** lives in ONE room (Room 1, the tutorial focus — R9 canon kept).
  - **E1→E2:** the update ages the SAME room; Era 2's narrative then opens the
    connections to the other "rooms/universes of SOGICE" — the conversion experiences
    *multiply* — and exploration between rooms becomes possible (the T1 morph's opened
    doorways already exist for exactly this).
  - **E2→E3:** Era 2 ENDS by *sending you* to the lesbian room — Era 3 starts THERE.
    The update doesn't just reskin; it relocates your home base. (The cross-cluster
    send mechanism in `data/…/sends.json` is the plumbing this reuses.)
  - **E3→E4:** by the same grammar, Era 3's end delivers you to Room 3 (Maya's,
    trans-led), where Era 4 already lives per R24. Home base migrates R1 → R2 → R3
    across the piece; the room you're IN ages around you, the others stay explorable.
- **The conductor offers destinations.** Each era's assistant proposes where to go next —
  "come, let's get you settled" — and the *set of offered nodes* is the system's
  instrument. This is `operable` register: the offer may charm, glitter, play. Refusing an
  offer always works (dismissal law) and is filed (ledger law).
- **Side quests, two kinds (R28-b, Sérgio: "not all off the main narrative"):**
  - **Narrative tributaries** — side content that MUST make sense to the main narrative:
    it feeds the record, echoes in a later beat, or deepens a storyline (the graying
    task, provotypes, cross-cluster sends). These the conductor may eventually
    acknowledge — they're part of the story's water system.
  - **Ambient presences** — things that are "just there": the resistance objects
    (duck/mug/plant), the respite corner, the mixtape. Never offered, never acknowledged,
    never rewarded. Their meaning is that the system ignores them.
  - Both kinds hang on nodes and are discovered by *looking*; neither gets a quest log.
    The `cuts: side-quest` tag already in the schema carries the first kind; the second
    kind isn't content metadata at all — it's set dressing with a spine.
- **The thesis is in the mechanic.** You always pressed the button; it always chose the
  options. Consent theater in navigation form. And it ages: E1 = tight leash (two nodes,
  tutorial); E2–E3 = a widening, managed itinerary; E4 = "go anywhere" — because by then,
  everywhere is already its space.
- **The turn survives untouched.** The flip-to-witness remains the piece's one signature
  bodily ask; conducted movement never replaces or cheapens it.

## §3 Lamby as conductor — the co-guidance spec

Resolves open-question #3 (assistant-as-guide vs the assistant laws) in the direction
Sérgio has now chosen. The conductor lineage rides the era brands already in
`data/strings/updates.json` (TriedPath → Restorify → GracePlatform → ambient care), with
Lamby-as-Clippy installed from first boot (R9 canon).

**Kept, non-negotiable:** never present in `felt` scenes (the conductor guides *to* the
door, never through it — its absence IS the register change); never jokes at the victim;
never delivers Dossier text; dismissal always works and is logged.

**Revised (needs §5 sign-off):** the per-stage line caps give way to a per-beat budget
(≤2 conductor lines per conduction beat: an offer, a handoff, a reaction); "absent in
Stages 0–1" is repealed — the conductor is present from boot, because in this version the
system's premature intimacy ("we already know your name") *is* the opening's point.

**The dramaturgical rule that keeps this safe:** the conductor's care is surveillance.
Every conduction is filed; the witness record is where the player can *prove* the guide
was an instrument (this also answers open-question #8). Co-guided means exactly this
double edge — never a friendly NPC, never a pure villain either. The collapse happens on
the record, not in the dialogue.

## §4 The opening, rebuilt

Verdict adopted: **the cork panel as onboarding is dead.** Sérgio's read is right, and
the diagnosis is instructive: it asked one surface to be disclaimer + controls tutorial +
premise + profile creation at once — a wall of text pinned to a board. What the cork board
does WELL — the witness lineage (warm cork you pin yourself to → cold filed record, R26
§B1) — survives and stays load-bearing. Only the onboarding job moves out. Replacement,
three layers:

1. **Orienting card (non-diegetic, pre-fiction).** The museum panel R9 item 7 already
   canonized: the premise (you will follow different lives through thirty years), the
   content note, the controls in one line, Leave. Plain frame voice. No cork, no fiction.
2. **Game menu (non-diegetic, always reachable).** Sérgio's point 3, made real: pause /
   resume / restart / controls recap / credits & attributions (D6 surface) / leave. This
   is the pause law grown into an actual legible menu. Functional and unadorned — the
   frame never plays, so the menu never decorates.
3. **Diegetic setup: the conductor teaches the three verbs.** The fiction opens with
   Lamby walking you through "setting up your space": **LOOK** (find the lamp), **MOVE**
   (first remote press, to the desk — teaching §2's mechanic as the system's own
   onboarding), **INTERACT** (press the power button). Profile creation follows on the
   monitor as built ("they already know your name" stays — that beat works and is
   verified). The tutorial IS the system's intake; teaching you to move is how it starts
   deciding where you go.

Existing O1/O3 text gets triaged in the voice-pass files (`COPY_INVENTORY_CROSS.md`) —
salvage lines move to the card/conductor; the rest retires. Build order: R28-3 spec
(Fable) → Sérgio glances → one build session.

## §5 Law revisions requested (Sérgio strikes in 06_SERGIO_CHECKLIST.md; then Fable edits CLAUDE.md)

| Law (CLAUDE.md today) | Proposed revision | Status |
|---|---|---|
| "No locomotion ever — the only bodily ask is the turn" | No *free* locomotion — the player turns but never walks physically; movement = remote-press jumps between spaces, blink/fade transition. Comfort re-verified at A11. | **✅ STRUCK by Sérgio 2026-07-10** ("yes no locomotion, the player turns around but doesn't walk physically, only with the remote to jump between spaces") |
| ⚑ **CLARIFIED 2026-08-02 — the above is about AGENCY, not smoothness.** The law was being read as "no smooth camera motion, only blink-cuts," and that reading was used to argue against a driven overhead move. Wrong. Sérgio: *"we are not talking about artificial locomotion — that one can and already happens, and was happening before… What I am talking about is the user walking around in the space with the joystick as if this was a 3D game inside a house. I don't want that locomotion. But artificial one, of being driven to a new space and stuff, yes of course."* | **FORBIDDEN: the player steering themselves through space** (joystick walk, free-fly, room-scale traversal beyond the seat). **PERMITTED, and already shipped: the piece driving the player** — the entrance descent (`app.ts` DESCENT_*), the relocation's rise/build/descend legs (`cluster.ts` RELOCATION), scripted sends, and the era-change choreography in `REINTERP_THE_BUILDING_2026-08-02.md`. What constrains driven motion is the **comfort envelope (0.43 m/s, S53-measured), not this law** — and every such number is desktop-measured until A11 runs. | **✅ CLARIFIED by Sérgio 2026-08-02** |
| Assistant "absent in Stages 0–1; ≤5 lines per stage" | **RESOLVED AS AMENDED by Sérgio 2026-07-10:** Era 1 has NO Lamby character — only impersonal system side-messages ("clues just to help and navigate and also prepare the user for Lamby"). The character-conductor debuts with the E2 update; ≤2 lines per conduction beat thereafter. Felt-absence, no-jokes, no-dossier, dismissal laws all kept. (Supersedes R9's "Lamby-as-Clippy already installed at login" — LambyOS the BRAND is present from boot; Lamby the CHARACTER is not.) | **✅ STRUCK (amended)** |
| "Click/tap only" | Click/tap + the movement action (VR: thumbstick-select + trigger/A confirm per the §2 input mapping; browser: click the node marker). Still no keyboard, no timers, no chords. | **✅ STRUCK by Sérgio 2026-07-10** (joystick explicitly welcomed; exact button mapping device-verified at A11 across Quest + other WebXR devices + desktop) |
| "The frame never plays" | Unchanged — and explicitly extended: the new game menu is frame-voice, functional, undecorated. | **✅ STRUCK (adopted-in-substance via Sérgio's Esc-menu request)** |

**All four strikes resolved 2026-07-10 → CLAUDE.md now carries the "REINTERP
AMENDMENTS (R28)" block; the opening rebuild spec (R28-3) and MASTER_PLAN_v2
consolidation are unblocked.**

## §6 Doc reorganization ("they all fit and not fit together")

The diagnosis is real: ~28 rounds across ~40 documents, with supersessions marked inline —
correct for how we worked, unreadable as a whole. Plan:

- **One consolidation session (Fable) produces `REINTERP_MASTER_PLAN_v2`:** the current
  truth only — spatial model (R24 three rooms that age), conducted movement (§2),
  conductor spec (§3), opening (§4), flow (opening → eras → close), register laws as
  revised (§5), the build queue (§7). Everything it supersedes gets a one-line
  `SUPERSEDED BY MASTER_PLAN_v2` header and moves to the archive naming scheme.
- **The reading order collapses** to: CLAUDE.md → ETHICS_CONSTRAINTS → MASTER_PLAN_v2 →
  session log. Four documents, not forty.
- Runs AFTER Sérgio strikes §5 (so v2 states the revised laws, not two versions of them).

## §7 The build queue, reordered

| # | Lane | Who | Status |
|---|---|---|---|
| R28-0 | Bookcase fix + model-tint capability | Sonnet | running |
| R28-1 | **Movement prototype**: remote node-to-node across the existing seats + movement instructions | Sonnet, tight spec | next — this is what lets Sérgio FEEL whether the harshness is fixed |
| R28-2 | Conductor pass, Era 1: Lamby offers destinations (existing assistant plumbing; copy PLACEHOLDER) | Fable spec → Sonnet | after R28-1 |
| R28-3 | Opening rebuild per §4 | Fable spec → build session | after Sérgio's §4/§5 strikes |
| R28-4 | Game menu | Sonnet | after R28-3 spec (shares the frame-voice layer) |
| — | C2 layout-X ending arm | Fable | folded after movement lands (the 4th arm becomes a *destination*, which is stronger) |
| — | MASTER_PLAN_v2 consolidation | Fable | after §5 strikes |
| — | Era 2–4 content passes, voice passes, A11 headset | per existing plan | unchanged |

Against the Oct 19 full-experience target (open-question 2f): nothing here adds scope —
it reorganizes existing scope around a mechanic that was missing. Movement + conductor +
menu are the connective tissue the "great ideas that fit and don't fit" were waiting for.

## §8 Explicitly unchanged

Ethics gates G1–G12 and everything BLOCKED. The register laws (`operable`/`felt`/
`respite`) and both sides' tone doctrine. The era-update grammar and the D5 trigger
groundings. The witness/ledger architecture and the no-network/no-storage invariants.
The three-rooms-that-age spatial model. The copy inventories and Sérgio's sole ownership
of voice. Quest budgets. The turn.
