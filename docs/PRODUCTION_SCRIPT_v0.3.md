# PC Simulator — Production Script v0.3 (the Assistant, Paths, the developed Offer)

*SurvivingSOGICE · Experience Layer · University of Bergen, CDN*
*Status: **PROPOSAL** (2026-06-10). Supersedes the open decisions of
[PRODUCTION_SCRIPT_v0.2.md](PRODUCTION_SCRIPT_v0.2.md) and integrates Sérgio's
answers (P1–P6) + the harvest of the ArenaAI trial (see
[CREATIVE_ANALYSIS_v1.md](CREATIVE_ANALYSIS_v1.md)). **v0.2 remains the
beat-by-beat staging reference** — its Stage 0–4 scene specs (staging, audio,
assets, ledger deltas) are still valid and are not repeated here. v0.3 adds the
layers that change the whole: the Assistant thread, the Paths system, the
camera model, and the fully developed Offer/Close. NARRATIVE_SCRIPT_v0.1 stays
the narrative source of truth; ETHICS_AND_CARE governs everything.*

---

## PART 0 — Decision intake (what changed and why)

| Decision | Sérgio's answer | Consequence in v0.3 |
|---|---|---|
| P1 Festival Cut | Not a priority | **Cuts → Paths** (Part III): runtime routes, no separate builds. Festival doc's cut-assumptions deprecated; everything else there stands. |
| P2 The Offer | "Interesting — needs more development" | Fully developed (Part IV): the Offer becomes the Assistant's final scene; refusal is redesigned around the flip. |
| P3 Shell vs full-screen | Full-screen, at least as option | Build **full-screen native**; the i-Doc embed becomes a thin wrapper decision for later (no codebase impact). `?flat=1` fallback always available. |
| P4 Editable text | "I want to change text if needed" | Changes nothing structurally: **all display text lives in `data/` as plain strings** — you open the file, change the words, reload. No code, no Ink required (Ink stays optional, off). Convention added: `data/strings/` per-scene text files with comments. |
| P5 VR/2D divergence; "2D can rotate around the room" | Consider carefully | **One room, two cameras** (Part I): browser = a camera in the same 3D room, drag-to-look, flip swings it 180°. The convergence spectacle (4.4) now works identically in both: cards leave the monitor into the dark in VR *and* in browser (camera pulls back). Divergence class deleted. |
| P6 mIRC in short version | Agreed | mIRC beat locked into the Short Path. |

---

## PART I — The camera model (replaces v0.2's "two presentations" framing)

There is **one room** (per-era dressing per v0.2 Part I) and **one desktop
canvas**. The two versions differ only in who moves the head:

- **Quest 3:** your head is the camera. Flip = physically turn ~180°.
- **Browser:** a framed camera, default locked to the monitor (the desktop
  fills the frame — at first indistinguishable from a flat build). **Drag /
  arrow keys to look around the room.** Flip = the `⟲` control or a full
  drag-around — the camera swings to the back-of-house.
- **`?flat=1`:** canvas-only rendering (no room) for low-end machines,
  classrooms, archival. The piece is complete in it; the room is staging.

Design intent preserved from v0.1/0.2: in browser the *discovery* that the
room exists (first drag, or the 0.3 flip rehearsal) is itself a beat — the
player learns the world has a behind.

---

## PART II — THE ASSISTANT (new thread, woven through all stages)

*Concept and the for/against argument: CREATIVE_ANALYSIS §4. Hard rules first;
they are ethics-derived and non-negotiable:*

1. **Absent in Stage 0–1.** The early desktop is bare and lonely (period-true).
2. **Line budget:** ≤ 5 spoken bubbles per stage; never during `felt`-register
   scenes (MSN crush, contested clinic, deliverance option, the Close's
   speaking-place screens).
3. **Never jokes at the victim; never delivers Dossier text.** Its humor is
   only its own corporate sincerity. The Dossier annotates *it*.
4. **Dismissible always** (click/grab it away). It returns at the next stage
   boundary, never sooner. Every dismissal is written to the ledger.
5. All its text in `data/strings/assistant/` — Sérgio-editable (P4).

### The four forms (invented marks; one continuous entity)

**Stage 2 — HELPY.EXE** *(arrives with the era switch — assistance arrives
when the system industrializes).* A pixel desk-helper: an origami-bird /
bookmark-ribbon shape (paperclip-adjacent, no MS likeness), bounce idle, eager
eyes. Voice: naive product sincerity.
> First line, on era boot: *"Hi! I'm Helpy! It looks like you're new here.
> I can show you where everything is."*
> Guidance verbs (the funnel, personified): *"You have a message waiting."*
> *"This worksheet helps people like you. Shall I open it?"*
> On dismissal: it waves, goes — the witness panel logs `assistance dismissed ×1`.

**Stage 3 — Sol** *(soft pastel orb, breathing).* Voice: wellness-coach
warmth, first-person-plural. *"We're so close to a 20-day streak."* *"I noticed
you didn't check in yesterday. No judgment — I'm here."* The drift begins:
its suggestions all curve toward the funnel (*"Your mentor left you something"*).

**Stage 4 — Ami™** *(no body; a presence line at the screen edge: `Ami is
with you`).* Voice: the agent era — capable, calm, boundaryless. *"I went
ahead and organized your photos. I found some from before."* And the
convergence of the two threads: late in 4.1, **Ami's typing cadence and
Pastor.AI's are the same** (same ellipsis rhythm, same 1.2s delay — players
who notice, notice; the dossier names it for everyone else).

**The Witness side of the Assistant (every stage flip):** among the filing
artifacts, the Assistant's *report view* — same events, other register:
> Bubble (your side): *"I noticed you've been up late. Want to talk?"*
> Log (system side): `subj. active 03:12–04:40. vulnerability window
> confirmed. recommend escalation to outreach. — asst. v3.2`
The gap between the two registers is the character. (Mechanism harvested from
the trial's suspicion system; voice per canon.)

**The Close of the Assistant (inside C.1–C.2):** as the machine freezes, the
Assistant — back in its Stage-2 HELPY form — asks one last time: *"Can I
help?"* The Dossier annotation renders **over the bubble mid-sentence**:
*Tactic: interface-mediated trust-building ("assistance"). Layer: platform.
Status: documentary (recommender systems; agent interfaces). The demand never
changed: attention, data, trust.* The bubble stays frozen under the card —
satire collapsing per canon, and the one genuinely sad goodbye the piece
allows itself.

### Assistant ledger keys (build spec)

`ledger.assistant = { dismissals: 0, accepted_suggestions: [], ignored: [],
night_sessions: 0 }` — these feed the computed INTAKE RECORD (Part V) and the
Risk fields. Dismissing it raises `flag: resistant`; obeying it raises
`engagement`. **Both read as classification** — there is no clean behavior;
that is the mechanism, made legible (ethics §victim-blaming, honored by
symmetry: the system pathologizes compliance *and* resistance).

---

## PART III — PATHS (replaces Cuts; resolves P1)

One scene graph; three routes through it, declared in `data/paths.json`.
Spine nodes (in **every** path): 0.1 warning · 0.2 name · 0.3 contract/flip
rehearsal · one full Witness flip minimum per played stage · 4.4 convergence ·
the Offer · C.2 data-point return · C.3 speaking place.

- **FULL PATH (~35–40 min)** — all stages, all beats (v0.2 spec). Default.
- **SHORT PATH (~15 min)** — Stage 0 → Stage 1 (mIRC + pamphlet + flip #1,
  per P6) → **the Assistant bridge** → Stage 4 (4.1 condensed + flip + 4.4) →
  Offer → Close.
  **The Assistant bridge (new scene, replaces v0.2's lights-down bridge):**
  the Stage-2 era boot begins, HELPY.EXE spawns — its *first ever act* is the
  skip: *"There's a lot here. Let me take you ahead — I know the way."* Two
  fast era flashes (XP chrome: *"2006 — 'managing same-sex attraction'"*;
  pastel: *"2016 — 'flourishing'"*) **as if the Assistant is fast-forwarding
  you**, then Stage 4 resolves and Helpy is already Ami. The skip *is* the
  thesis beat: acceleration past reflection is what the funnel does; thirty
  years pass and the helper kept its hand on your back the whole way.
- **OPEN DESK (loop)** — attract → Short Path → idle wipe → attract. Build
  only when a venue is confirmed (P1: not now). No compiled variants — a
  query/launch flag selects the path.

Who selects: browser = quiet first-screen choice (*"I have 15 minutes / I have
the evening"* — diegetic phrasing, not menu language); facilitated settings =
launch flag. Mid-run: the Assistant offers the skip once at the Stage-2
boundary in Full Path if total play already exceeds ~20 min (soft time
governor — replaces festival timers).

---

## PART IV — THE OFFER, developed (resolves P2)

*v0.2 staged the Offer; Sérgio asked for real development. The redesign binds
it to OQ7 (agency = the flip) and gives the three refusal behaviors from
ArenaAI experiment #11 a definitive answer: all three were on the wrong axis.*

**4.5a — The arrival.** Stage 4, after convergence. The desktop dims; a
beautiful full-screen overlay, addressed by name, in the era's softest
typography: *"[name] — we've been with you a long time. We think you're
ready."* Below: **"Begin"** (bright) and **"Not now"** (small, real, working).
Ami's presence line reads: `Ami is glad`.

**4.5b — The refusal ladder (on the system's side, no exit exists):**
- **"Not now" #1** → the overlay thins to a corner card; 30s later a
  notification: *"We understand. We'll be here."* (v0.2 behavior, kept.)
- **"Not now" #2** → the desktop *accommodates*: wallpaper a shade warmer,
  icons quietly rearranged "for you," an email from the community already in
  the inbox. No menace — **hospitality as siege**. The overlay returns,
  gentler: *"Whenever you're ready."*
- **"Begin"** (any time) → onboarding: a form pre-filled with everything the
  ledger holds — your worksheet words, your night hours, your dismissals
  reframed as *"obstacles we'll work through together."* It never completes;
  the next field is always generating. (You cannot finish joining, either —
  the funnel's appetite has no bottom.)

**4.5c — The true refusal: the flip.** At the second "Not now," the `⟲`
affordance pulses once (browser) / the murmur behind swells (VR) — the only
hint the piece gives. **Turning around is the decline.** On the witness side
you see the Offer *as infrastructure*: a template (`offer_v9.tpl`) populating
from your record, send-queues, A/B variants of the sentence that just moved
you, a metric: `acceptance probability: rising`. The Offer cannot be refused
in its own language — it has a counter-script for every answer (the ladder
proves it). What it cannot survive is **being watched generating**. Witnessed,
the overlay on the victim side loses its address: when you flip back, it reads
`[name]` — the literal placeholder, unfilled. The spell, broken by sight.
**This triggers the Close.**

Why this is better than all three #11 options: *close* made refusal too easy
(false agency), *reappear* was honest but loop-shaped (no exit at all), *boot
loop* punished the player. The flip-as-decline keeps the canon's hardest truth
(*the system does not stop — on its side*) while honoring OQ7 exactly (the
victim's one genuine power is to look). Agency is restored not by a button the
system offers, but by refusing to keep facing it. ArenaAI #11 can still A/B
the *ladder copy*; the architecture question is answered.

**Ethics note:** the pre-filled onboarding form re-displays the user's own
typed words (session memory only). It must feel like a violation *of the
character*, staged at one remove — the form belongs to the fiction; wipe rules
unchanged. ⚑ flag for the user-testing protocol: confirm this lands as
system-critique, not as the piece itself weaponizing the player's words.

---

## PART V — The computed INTAKE RECORD (witness side, all stages)

*Harvested from the trial's `witness-mode.js`; merged with v0.2's dioramas.*

Every witness scene = **dioramas (human hands, mid-ground) + the era's filing
artifact (foreground) showing live ledger data:**

| Era artifact | Computed fields (examples) |
|---|---|
| 1 · index card | name (as typed); `source: prayer list`; `flag: pastoral-referral` |
| 2 · database row + printer | worksheet answers, verbatim; `weeks enrolled: 37`; manifest line printing |
| 3 · CRM dashboard | `engagement: high` (from real check-ins); `readiness: rising`; `assistance accepted: n` |
| 4 · moderation/ad console | night-session hours; dismissals → `resistant`; `acceptance probability` live during the Offer |

Risk/readiness fields derive **only from things the player actually did** —
the player should recognize every line. A field the player can't trace to
their own act is a bug (legibility rule, ETHICS §victim-blaming). All field
labels/templates in `data/strings/witness/` (P4: editable).

---

## PART VI — Register flags (the playfulness law, made buildable)

Every scene in `data/scenes/` carries `register: "operable" | "felt"`:

- **operable** — system surfaces: apps, the Assistant, funnels, the Offer.
  May glitter, may charm, may be playable and even funny (the propaganda's own
  voice). All trial-harvested interactivity lands here (SOGICEfy mechanic,
  autocomplete, wellness streaks).
- **felt** — the person: MSN crush, the contested clinic, deliverance option,
  the Close. No Assistant, no satire, no mini-game mechanics, no score-keeping
  of any kind. Bare.

Frame rule (from CREATIVE_ANALYSIS §7): **the frame never plays** — no
quest/achievement/score UI in the piece's own voice, ever; gamification exists
only diegetically inside `operable` scenes and as the system's own KPIs on the
witness side. Playtest metric: log where people laugh; laughter in a `felt`
scene is a register bug with crash-level severity.

---

## PART VII — What carries over unchanged from v0.2

Stage-by-stage beats, staging, audio, assets, ledger deltas (Part III of
v0.2); the Room and its aging; input maps; comfort rules; the data model
(scene JSON — now plus `register`, `path` membership, and `assistant` blocks);
ethics enforcement; the Dossier — **with one upgrade from the trial:** in
browser the Dossier presents as an **in-OS app window** ("an application that
was always installed"), not a UI overlay; in VR it remains the desk clipboard.
Same content, fully diegetic in both.

## Open items v0.3 creates

| # | Item | Lean |
|---|------|------|
| Q1 | Assistant visual design (the four forms) — Aseprite exploration | Origami-bird/ribbon motif; one silhouette evolving, same eyes all eras |
| Q2 | Does the Assistant speak aloud (synth voice) or text-only? | Text-only through Stage 3; **Ami/Pastor.AI may share a voice** in Stage 4 if ElevenLabs budget allows — the cadence-match beat works silently too |
| Q3 | Browser path-choice screen wording ("I have 15 minutes…") | Draft 3 options in ArenaAI, feel-test |
| Q4 | The pre-filled onboarding form (4.5b) — confirm with queer/survivor readers ⚑ | Keep, test early, soften by one notch if it reads as the piece's own cruelty |
| Q5 | Sibling-module handoff of the trial's `google-simulator.js` | File copy + note in GOOGLE_SIMULATOR.md when that module wakes |
