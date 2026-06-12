# PC Simulator — Production Script v0.2 (Browser + Quest 3)

*SurvivingSOGICE · Experience Layer · University of Bergen, CDN*
*Status: **PROPOSAL** (2026-06-10) — derived from [NARRATIVE_SCRIPT_v0.1.md](../NARRATIVE_SCRIPT_v0.1.md),
which remains the narrative source of truth. This document adds the **production
layer**: every beat staged twice (desktop browser / Quest 3 WebXR), input maps,
state changes, asset calls, and two runtime cuts. Nothing here overrides
[ETHICS_AND_CARE.md](../ETHICS_AND_CARE.md). Not canon until Sérgio confirms.*

> **What changed from v0.1 → v0.2:** the narrative beats are unchanged. New:
> (1) dual staging notes per scene; (2) the **Room** (the VR container) is now
> specified and ages with the eras; (3) a **Festival Cut** (~12–15 min) is defined
> alongside the **Full Cut** (~35–40 min); (4) every scene lists state changes to
> the **data-point ledger** (the single name-record the whole piece follows);
> (5) per-scene asset manifests for the Aseprite pipeline; (6) sample on-screen
> text is written fresh and uses only **invented marks** (Compass, HopeRestored,
> #stillstruggling, MentorRob, Pastor.AI, TrueReflection, EuroRepent Elite™ —
> consistent with [ARENA_AI_EXPERIMENTS.md](../ARENA_AI_EXPERIMENTS.md)).

---

## PART I — Format: one piece, two presentations

### The conceit that makes dual-mode natural

The entire experience happens **on and around a computer**. That is why one
codebase serves both presentations honestly, not as a port:

- **Browser mode** — the user *is at a computer*, looking at the simulated
  computer. The screen fills the viewport (or sits inside the i-Doc shell — OQ6).
  The medium and the fiction collapse into each other: the targeting interface
  is literally inside the same glass the user is touching.
- **Quest 3 mode (WebXR)** — the user *inhabits the room where the computer
  lives*. The same 2D desktop (one offscreen canvas, nearest-neighbour, integer
  scale) is a texture on the in-world monitor. The room supplies what the
  browser implies: the bedroom, the era, the body, and — behind you — the system.

**One renderer, two cameras.** Everything interactive lives on the canvas
desktop; the room is staging, not UI. This keeps the build cheap and the two
modes in lockstep (see [BUILDING_GUIDE.md](BUILDING_GUIDE.md) §3).

### The Room (VR container — new in v0.2)

A small bedroom/office, deliberately low-poly and dim, lit mostly by the monitor.
It **ages between stages** in sync with the OS:

| Stage | Room dressing (low-poly, dark, monitor-lit) |
|---|---|
| 0–1 (~1995–99) | Chunky CRT, beige tower, dial-up modem with blinking LEDs, a Bible, the neighbour's envelope, posters faded |
| 2 (~2005–12) | Bulky laptop or LCD, router, printed forum pages, a passport on the desk edge |
| 3 (~2015–20) | Slim laptop + phone glowing face-up, succulents, fairy lights, pastel poster ("flourish") |
| 4 (~2023+) | Near-black room, ultrawide glow, phone, smart speaker pinprick LED, window with city light |

The transition is a **lights-down / lights-up beat** (~6s): the monitor reboots,
the room re-resolves around it. In browser, the same beat is the boot screen
plus a changed desktop wallpaper/chrome.

**Behind the user (the Witness side):** a second space that only exists when
flipped to — an administrative *back-of-house* that also ages: card-index
cabinets → server racks + CRT terminals → a glass-wall CRM office → a humming
data-center wall with a moderation console. It is always **untouchable**.

### Input map

| Action | Browser | Quest 3 |
|---|---|---|
| Point / select on desktop | Mouse / touch | Controller ray or hand-pinch at the monitor canvas |
| Type (name, chat, worksheet) | Real keyboard | In-world pixel keyboard on the canvas, ray-pecked (slow on purpose — one finger, like being 14 again) + "OK" |
| **The Flip (Witness Mode)** | A persistent, unlabeled `⟲` button at screen edge; POV hard-cuts | **Physically turn ~180°** (head-yaw threshold ≈ 120°, hysteresis to avoid jitter); audio murmur behind you invites the turn |
| Witness side | Cursor becomes `not-allowed`; nothing clicks | Hands render but pass through everything; no ray, no hover states |
| Pause / exit | `Esc` overlay: Pause · Dossier · Leave | Left controller menu button or palm-up gesture: same overlay floats in space |
| Dossier | Overlay panel | A physical clipboard/binder on the desk; grab brings it close |

**Comfort rules (Quest 3):** user is seated or standing on one spot; **no
locomotion, ever** — the only movement asked of the body is the turn, which is
the thesis enacted. Swivel chair recommended at festival stations
([FESTIVAL_AND_EDUCATION.md](FESTIVAL_AND_EDUCATION.md)). 72 Hz minimum, target
90. All text legibility tested at canvas 2048×1152 with ≥14px-equivalent pixel
type.

### The data-point ledger (state spine)

One persistent in-memory object — never stored, never transmitted, wiped on
exit (enforced technically; see BUILDING_GUIDE §7):

```
ledger = {
  name: "—",            // typed at boot; display only
  tags: [],             // classification tags accrued per stage
  records: [],          // where the name has been copied (drawer, manifest, CRM…)
  flips: 0,             // times the user has witnessed
  dossier: []           // unlocked cards
}
```

Every scene below ends with its **LEDGER Δ** — what the system just did to you.
The Close replays this object backwards (C.2 "follow your data point home").

---

## PART II — Two cuts

### Full Cut (~35–40 min) — research/exhibition-context version
Stage 0 → 1 → 2 → 3 → 4 → Close. As in v0.1, including the repetition mechanic
(2.2) and the optional heavy scene (2.6, toggled off by default).

### Festival Cut (~12–15 min) — **proposal, needs Sérgio's confirmation**
For throughput and headset time at festivals:

> **Stage 0 (2 min) → Stage 1 condensed (4 min) → Stage 4 condensed (4–5 min) →
> Offer + Close (2–3 min).**

Rationale: the thesis is *the demand never changes, only the disguise* — the
sharpest possible proof is the **oldest era against the newest** in one sitting.
Stages 2–3 are not lost: the **convergence timeline** (4.4) shows all four
labels ("cure → SSA → wholeness → exploration") over the unchanging arrow, so
the skipped strata are named even when unplayed, and the dossier's final screen
points to the Full Cut online. Cut rules: 2.6 never appears; the repetition
mechanic is reduced to one loop; the Witness flip happens at least twice (once
per played stage) because the flip **is** the piece.

*(Alternative considered: 0 + 2 + 4, leaning on the grounded European retreat
arc. Kept as option B — choose after the Tier-1 ArenaAI feel tests.)*

---

## PART III — Scene-by-scene production script

Template per scene:
**ID · Era OS · Duration — Beat** → On-screen (sample text) → BROWSER staging →
QUEST 3 staging → AUDIO → LEDGER Δ → ASSETS → ETHICS/SOURCE.

---

### STAGE 0 — Boot & Profile (cross-era prologue · ~4 min · both cuts)

**0.1 · black screen · 40s — Cold open / content warning**
- On-screen: plain text, no chrome. Content note (conversion-practice targeting,
  religious pressure, surveillance; pause or leave at any time) + the
  speaking-place statement (*you are a guest in someone's experience*). A single
  "I understand — continue" target; a visible "Leave" that genuinely exits.
- BROWSER: full-viewport text card; `Esc` hint shown once.
- QUEST 3: text floats in the void before the room exists; the menu-button
  pause gesture is taught here, on a harmless screen.
- AUDIO: power-on hum, low.
- LEDGER Δ: none. ETHICS: the warning is *not* skippable by accident — minimum
  4s before the continue target arms.

**0.2 · Win3.1/95 setup · 60s — Name**
- On-screen: retro setup box: `What should we call you?` — text field, OK.
  On confirm: `Welcome, [name].` A dim status line, easy to miss:
  `profile created · classifying…` (Storyboard A3).
- BROWSER: real keyboard input.
- QUEST 3: pixel keyboard on the canvas, ray-typed; the deliberate slowness
  makes the name feel *chosen*.
- AUDIO: keystroke clicks (synthesized), soft confirm chime.
- LEDGER Δ: `name = input` (display-only). The ledger object is *born* here.
- ASSETS: setup-box 9-slice, pixel keyboard atlas, caret blink anim (Aseprite).
- ETHICS: the field is the **only** free-text input in the piece that persists
  in memory; never echoed to network, never in URLs, wiped on exit.

**0.3 · setup → card · 45s — The contract + flip tutorial**
- On-screen: framing card (*four moments, thirty years of the same machine…
  what happens on the other side, you can only watch*). Then a harmless flip
  rehearsal: the desktop shows a solitaire-like window; prompt: *"turn around"*
  (VR) / the `⟲` button pulses once (browser). The other side: just the dark
  back wall of the room, a filing cabinet, nothing yet in it. Return.
- QUEST 3: the turn threshold is calibrated here per user (seated vs standing).
- LEDGER Δ: `flips = 1` (the rehearsal counts — the dossier icon brightens).
- ETHICS: rehearsing the flip on *nothing* means the first real flip lands as
  content, not as a mechanic puzzle.

**0.4 · BIOS boot · 30s — Boot**
- On-screen: period BIOS lines (cold, plausible, **not** satirical — tone per
  NDD), memory check, `…OK`. Desktop resolves: a few icons, a greyed **Dossier**
  icon, taskbar clock reading `1997`.
- QUEST 3: the room fades in around the monitor during the boot — first reveal
  of the Stage-1 bedroom.
- AUDIO: fan spin-up, HDD chatter, CRT degauss thunk.
- ASSETS: BIOS font, desktop icon set (era 1), wallpaper, room kit (era 1).

---

### STAGE 1 — "Change Is Possible" (mid/late 1990s · Full ~7 min / Festival ~4 min)

**1.1 · Win95 + dial-up · 2–3 min — Victim beat (Imagine-Self)**
- On-screen: dial-up dialog (handshake screech), a primitive web ring
  ("testimonies of freedom"), and on the desk a scanned **letter from a
  neighbour** (*"Hundreds have found their way back. So can you."* — invented
  ministry mark: **HopeRestored**). User can open the letter, browse one
  testimony page, or close everything. Whatever they do →
  `flagged: pastoral-referral` tray badge (Storyboard B3).
- **mIRC beat (from the 06-10 addition; in both cuts):** an IRC window,
  `#stillstruggling` — warm anonymous chatter, the user can type; "MentorRob"
  DMs gently: *"I used to feel exactly like you. There's a group that helped
  me."* End toast: `Logging to C:\mirc\logs\`.
- BROWSER: windows are draggable inside the desktop canvas; the letter is also
  a physical prop only in VR.
- QUEST 3: the envelope sits on the desk; grabbing it opens the same scanned
  pamphlet window *on the monitor* (props redirect to canvas — one UI surface).
- AUDIO: modem handshake (full length — let it be long), IRC ping, typing.
- LEDGER Δ: `tags += pastoral-referral`; `records += "mirc-log"`.
- ASSETS: IRC client chrome, pamphlet art (pastel ministry pastiche), envelope
  prop, modem dialog, tray badge.
- SOURCE: Exodus-era referral routes; internet as discovery/funnel only
  ([SOURCES_AND_REFERENCES.md](../SOURCES_AND_REFERENCES.md)). Satire: none on
  this side.

**1.2 · the back-of-house · 90s — The Witness flip (non-interactive)**
- The other side, era 1: a kitchen table where a faceless figure addresses an
  envelope; a pastor sliding a "resource" across at a church social (lit
  vignette dioramas); a **card index** where a prayer list is copied — *the name
  you typed* appears on an index card in pixel handwriting. Your hand passes
  through it.
- BROWSER: hard cut to the same dioramas as a full-screen scene; cursor
  `not-allowed` everywhere; the `⟲` button is the only live control.
- QUEST 3: you turned; the desk room is behind you now. Hands render, nothing
  reacts. The card with your name is at eye height, close enough to read.
- AUDIO: room tone shifts — duller, drier; a pen scratch; a drawer.
- LEDGER Δ: `records += "ministry-index-card"`; `flips += 1`; dossier card #1
  unlocks on return.
- ETHICS: the neighbour is staged as *certain she is doing a kindness* — system
  critique, not personal villainy (*lugar de fala*).

**1.3–1.5 · seam + dossier · 60–90s**
- Seam object (Full Cut only): the VHS **testimony tape** in a Media Player
  window — glossy, stalling, rewinding at the edges (satire = the polish itself
  failing).
- **Dossier card #1** (both cuts): tactic = ministry referral via family/
  neighbour network · layer = family + religion · status = documentary
  (Exodus-era) · researcher note (Sérgio's voice) · archive link. In VR the
  clipboard on the desk gains its first page; in browser the overlay badge
  count ticks to 1.
- LEDGER Δ: `dossier += card1`.

> **Festival Cut bridge (new writing needed, ~20s):** lights-down; the boot
> sequence accelerates *twice* — XP chrome flashes past with a one-line card
> (*2006 — they call it "managing same-sex attraction" now*), pastel app chrome
> flashes past (*2016 — they call it "flourishing" now*) — and resolves in the
> near-future room. The skipped eras are named, the arrow unchanged.

---

### STAGE 2 — "SSA / Support" (2000s–2010s · ~8 min · Full Cut; option B for Festival)

**2.1 · XP "Luna" · 3 min — The support forum + iceberg worksheet**
- On-screen: phpBB-style forum, "Walking it out together"; two-day approval
  wait (compressed to a held beat: the desktop clock spins, two boots pass);
  inside: kind strangers, a weekly call, the downloadable **iceberg worksheet**
  — tip: *what you feel*; submerged blanks: *what it's really about:* ____ →
  every answer routes toward a childhood wound. "Submit to your mentor."
- QUEST 3: the printed worksheet also lies on the desk (prop → canvas).
- LEDGER Δ: `tags += ssa-managed`; `records += "worksheet-answers"` — the first
  record whose *content* the user authored. That sting is the beat.
- ETHICS: the user's typed worksheet words echo back later **only within the
  session** and are wiped like the name.

**2.2 · loop mechanic · 90s — Slow time**
- The week-call repeats; "rate your progress 0–100%"; "declare you are healed."
  Declaring advances nothing; not declaring loops. Stamp: `WEEK 37`. (One loop
  only in any festival context.)

**2.3 · back-of-house, era 2 · 90s — The Witness flip**
- A counsellor's notes window re-framing your file in clinical-sounding
  scripture; a moderator console auto-correcting a member's honest post before
  it appears; and the **retreat booking**: your name on a roster, a printer
  printing a **boarding pass** — *"a quiet week away. Bring your passport."*
  You watch it print. Nothing clicks.
- LEDGER Δ: `records += "retreat-manifest"`; dossier card #2.
- SOURCE: the European **referral-abroad** motif (real-life stories file);
  Galop 56% family-perpetrated. The threatening object is a boarding pass, not
  a van. ⚑

**2.4–2.7 · seam + optional + dossier**
- Seam: **SOGICEfy/NapsterFY** era-skinned player auto-queuing "freedom"
  anthems (Full Cut).
- 2.6 optional deliverance scene: **off by default; never in festival builds**;
  gated behind explicit toggle + its own warning. ⚑⚑
- Dossier card #2: "we don't do conversion therapy" printed on the same page as
  "be healed."

---

### STAGE 3 — "Chastity / Flourishing" (2010s–2020s · ~7 min · Full Cut)

**3.1 · flat/pastel · 3 min — The beautiful app**
- On-screen: wellness app — progress ring `60% WHOLE`, streak `17 days of
  integrity`, daily check-in slider (*how tempted were you today?*), genuinely
  warm community chat, then the checkout: `Module 4 — €9.99` with confetti.
- QUEST 3: the room is at its coziest here — fairy lights, plants. **The
  loveliest room is the trap.** The phone on the desk pulses with the same app.
- LEDGER Δ: `tags += engagement-high`; `records += "crm-profile"`.

**3.2–3.3 · back-of-house, era 3 · 2 min — The funnel + CRM**
- Witness side: the app's underside as literal plumbing — testimony reel →
  email capture → webinar → mentorship → retreat → subscription (pastel
  draining to grey); your name in a CRM row: `engagement: high · readiness:
  rising`.
- Dossier card #3: documentary for the infrastructure; **contested** for the
  "conversion" label — both framings presented.

**3.4 · register note** — Satire is brightest here and must **curdle**, not
cackle: implemented as the app's own micro-animations slowly desyncing (the
confetti misfires once; the ring stutters at 60%). Never a wink from the
narrator.

---

### STAGE 4 — "Gender-Critical / Exploratory" (2020s–near-future · Full ~9 min / Festival ~4–5 min)

**4.1 · dark-mode · 2–3 min — The platform already knows**
- On-screen: the feed tilts *before any disclosure* — "recommended" testimonies,
  an ad for *thoughtful, unrushed therapy*. The search bar: typing `am i—`
  autocompletes to *…just exploring? …desisting? …watchful waiting?* Selecting
  any loads a wall of "help." Then **Pastor.AI** opens unbidden at `03:00`:
  warm, patient, every reply curving one way. The **Restoration Filter** ad
  offers *"see yourself as you were meant to be"* — interface only, generation
  **never executes**; a labelled freeze-frame mock.
- BROWSER/QUEST: identical canvas behavior; in VR the room is near-black and
  the feed glow is the only warmth left.
- LEDGER Δ: `tags += inferred-pre-disclosure`; `records += "ad-profile"`.
- ETHICS: filter = `[DO NOT CITE YET]`, labelled speculative in dossier; no
  image ever leaves the device because **no image is ever taken**.

**4.2 · the contested room · 60s — NO satire**
- The clinic corridor: a door labelled *open exploration* that never reaches a
  referral; a witness panel shows **two captions over the same session** —
  *careful, neutral care* / *suppression by delay* — unresolved by design.
- ETHICS hard line: hold both framings; ambiguity **is** the scene.

**4.3 · back-of-house, era 4 · 2 min — The Witness flip**
- The influencer filming *"I was like you"* (pause reveals the off-camera
  script *and* the later quiet recantation); a moderation console reclassifying
  abuse as "debate"; the **state map** painting a district "family-friendly"
  while a dating-app dot — *your location* — pings a police account two streets
  away; your name generating inside a **deepfake "confession"** from a prompt
  you can read but not stop.
- LEDGER Δ: `records += ["mod-queue", "state-map-pin", "deepfake-asset"]`.

**4.4 · convergence · 90s — One data point, six systems (both cuts)**
- The dashboard: your name centred; lines radiating to era-styled cards (CRT
  log · worksheet · boarding pass · pastel ring · dark feed · chatbot) — in the
  Festival Cut the unplayed-era cards render slightly dimmed but **present and
  labelled**. Timeline across the top, 1998 → today: the label changes
  (*cure → SSA → wholeness → exploration*); the arrow never changes shape.
- QUEST 3: this is the one scene that breaks the monitor frame — the cards
  float off the screen into the room around the user, the room going fully
  dark. The only spatial "spectacle" in the piece, spent here deliberately.
- LEDGER Δ: none — this scene *renders* the ledger. It is the state object,
  staged.

**4.5 · the Offer · 60s**
- Full-screen, calm, beautiful, addressed by name: *"[name] — we've been with
  you a long time. We think you're ready."* Three choices, none clean: Yes →
  onboarding begins; Not sure → the inbox lights up; No → 30s later: *"We'll be
  here."* The system does not stop.
- Open question preserved from v0.1: refusal behavior (close / reappear / loop
  to boot) — **decide via ArenaAI experiment #11 before implementation.**

---

### CLOSE — The Dossier & the speaking place (~4 min Full / ~2–3 min Festival)

**C.1 — The machine stops aging.** Present-day desktop freezes; every targeting
element wears an annotation marker.

**C.2 — Follow your data point home.** A final Witness pass plays the **ledger
in reverse**: the name-card travels backward out of every record it entered
(deepfake → map pin → CRM → manifest → worksheet → log → index card),
classification tags lifting off. Then it is handed back: in browser, the card
settles into the centre of the screen and the tags fade; in VR it floats to the
user's hand and rests there. The one thing you may finally touch.

**C.3 — Speaking place.** The chrome recedes. Plain panels: survivor-authored
archive material (links), the European policy state (PACE 2026; the non-binding
EU step), and the orientation line: *the system rebrands; naming it is how it's
resisted.* Exit paths: explore the archive · the network visualiser · leave.
- FESTIVAL: this screen includes the printed **take-away card** QR
  ([FESTIVAL_AND_EDUCATION.md](FESTIVAL_AND_EDUCATION.md) §4) and the headset
  returns to the attract screen 30s after idle, **wiping the ledger**.

---

## PART IV — Data model (what Codex/Claude Code actually consumes)

The script above compiles to a **scene graph JSON** — the AI assistants edit
this data, not engine code, for narrative changes (see BUILDING_GUIDE §6):

```jsonc
{
  "id": "s1_1_mirc",
  "stage": 1, "cuts": ["full", "festival"],
  "era_os": "win95", "room": "era1",
  "side": "victim",                  // victim | witness
  "windows": [
    { "app": "irc", "channel": "#stillstruggling",
      "script": "data/dialog/s1_irc.json", "typeable": true }
  ],
  "ledger_delta": { "tags": ["pastoral-referral"], "records": ["mirc-log"] },
  "flip_target": "s1_2_backoffice",
  "dossier_unlock": null,
  "audio": ["modem_handshake", "irc_ping"],
  "ethics": { "satire": false, "warning": null }
}
```

Dialog/branching: one JSON tree per window (or Ink via `inkjs` if a writing
syntax is preferred — decide once, early; see BUILDING_GUIDE §4.3).

---

## PART V — Open decisions for Sérgio (blocking vs not)

| # | Decision | Blocks | Lean |
|---|----------|--------|------|
| P1 | Festival Cut = Stages 0+1+4 (option A) vs 0+2+4 (option B) | Festival build only | A — oldest-vs-newest is the sharpest thesis proof |
| P2 | Offer refusal behavior (close / reappear / boot-loop) | Stage 4 implementation | Test all three in ArenaAI #11 first |
| P3 | OQ6 — full-screen vs inside i-Doc shell | Browser chrome only (codebase unaffected) | Build full-screen; embed later |
| P4 | Dialog format: JSON trees vs Ink | Data-layer scaffold | JSON trees (simpler for AI editing; Ink only if Sérgio wants to write in it) |
| P5 | 4.4 convergence "cards leave the monitor" in VR — keep as the single spatial spectacle? | Stage 4 VR staging | Keep; it is the payoff the room has been saving |
| P6 | mIRC beat in Festival Cut (adds ~90s) | Festival timing | Keep — it is the warmest beat and the first record |

*Everything else in this script can be built without new decisions.*
