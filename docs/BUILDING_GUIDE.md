# PC Simulator — Building Guide v1.0
STATUS: superseded-by CLAUDE.md

*Companion to [PRODUCTION_SCRIPT_v0.2.md](PRODUCTION_SCRIPT_v0.2.md). Status:
**PROPOSAL** (2026-06-10). Audience: Sérgio (non-coder, directing AI
assistants) + occasional collaborators who code. This guide turns the decisions
already recorded in [TECHNICAL_BUILD.md](../TECHNICAL_BUILD.md) into a concrete,
sequenced, budget-conscious build path. It changes no prior decisions.*

> **Decisions inherited (not re-litigated here):** PlayCanvas **as an npm
> package** + Vite + TypeScript, all code in a Git repo; WebXR-native, one
> codebase for browser + Quest; desktop = 2D offscreen canvas → texture on a
> monitor mesh, `FILTER_NEAREST`, integer scaling; Aseprite spritesheet+JSON
> pipeline; "fake intelligence" only; the typed name never stored/transmitted;
> Twine/Construct rejected; ArenaAI = disposable feel tests only.

---

## 0. The one-paragraph build philosophy

You are not building a game engine; you are building **one room, one monitor,
and a deck of 2D "apps" drawn onto that monitor** — plus a non-interactive
back-of-house behind the user. Almost all content work is therefore **2D pixel
art + JSON data**, which is exactly what AI assistants and a non-coder pipeline
are good at. The 3D work (room, lighting, the flip, XR session) is small,
finite, and front-loaded: get it right once in the vertical slice and you
barely touch it again. Spend your money and energy on the canvas apps, the
writing, and the audio — that's where the piece lives.

---

## 1. Repo & project skeleton

```
pc-simulator/
├── CLAUDE.md                  # AI working rules (see §6.2 — this file is load-bearing)
├── AGENTS.md -> CLAUDE.md     # same rules for Codex
├── README.md                  # run/deploy steps, kept current by the AI
├── docs/
│   ├── PRODUCTION_SCRIPT_v0.2.md   # copy of the script (the build contract)
│   └── ETHICS_CONSTRAINTS.md       # distilled hard lines (see §7)
├── src/
│   ├── engine/                # PlayCanvas boot, XR session, the flip state machine
│   ├── room/                  # per-era room kits, lighting, props
│   ├── desktop/               # the offscreen-canvas OS: window manager + apps
│   │   └── apps/              # irc.ts, msn.ts, forum.ts, wellness.ts, feed.ts, pastorai.ts…
│   ├── witness/               # non-interactive back-of-house scenes
│   ├── dossier/               # overlay (browser) + clipboard (VR)
│   └── state/                 # the ledger + scene-graph runner
├── data/
│   ├── scenes/                # one JSON per scene (the script compiled to data)
│   ├── dialog/                # branching trees per window
│   └── cuts.json              # full vs festival scene lists
├── assets/
│   ├── aseprite/              # source .aseprite files (committed!)
│   ├── atlases/               # exported spritesheet PNG+JSON (build artifact)
│   ├── audio/                 # synth-first; files only where needed
│   └── fonts/                 # pixel fonts (licensed/free — see §2.4)
├── tools/
│   └── export-atlases.sh      # Aseprite CLI batch export (see §2.3)
└── scripts in package.json    # dev / build / deploy / export
```

Why this shape matters for AI building: **narrative changes never touch
`src/`** — they edit `data/`. Aesthetic changes mostly touch `assets/` +
palette constants. The AI can be trusted with wide changes in `data/` and
`assets/` and held to careful review in `src/engine/` (the only genuinely
fragile code).

First session: `git init`, push to a **private GitHub repo** (free), enable
GitHub Pages or wire Cloudflare Pages for WIP builds (§5.4).

---

## 2. The pixel-art aesthetic — how to actually connect to it

### 2.1 Why pixel art is the right call here (so the style stays purposeful)

The style is not nostalgia decor; it does argumentative work — keep these four
justifications in view whenever an art decision comes up, and the aesthetic
will stay coherent:

1. **The OS evolution is the timeline.** Pixel art lets four very different
   period UIs (Win95 → XP → flat pastel → dark-mode) read as *one* artwork —
   the consistent grain says "same machine, same demand," while the chrome
   says "new disguise." A photoreal approach would make the eras look like
   different products.
2. **Abstraction is an ethics tool.** No real faces, no real likenesses is a
   hard line ([ETHICS_AND_CARE.md](../ETHICS_AND_CARE.md)); pixel faces at
   16–32px are *categorically* abstract. The style enforces the rule.
3. **Distance with intimacy.** Pixel art holds heavy material at a bearable
   remove ("darkness earned") while period UI sounds/chrome land with
   uncanny personal recognition for anyone who lived those eras.
4. **It is cheap and AI-friendly.** Small palettes, small canvases, batch
   pipelines, easy redo. The whole look is achievable by one person + AI.

### 2.2 The style bible (constants to fix early, in one file)

Create `src/desktop/theme/` with **one palette file per era** and treat these
as law (the AI must import, never invent, colors):

| Era | Master palette | Type | Chrome rules |
|---|---|---|---|
| 1 (~1995–99) | 16 colors: beige/teal/grey + 1 warning red | MS-Sans-style pixel font, 8–9px grid | Bevelled 2px borders, hard shadows, scanline overlay on CRT |
| 2 (~2005–12) | ~24 colors: XP blue/green + gloss ramps | Tahoma-like pixel font | Rounded-corner sprites, gradient title bars (banded, not smooth) |
| 3 (~2015–20) | pastel set + white space (use restraint: ~12 colors) | Geometric rounded pixel font | Flat, generous padding, soft 1px shadows, confetti sprite |
| 4 (~2023+) | near-black + 2 neon accents + grey ramp | Crisp condensed pixel font | Glassy panels = dither, not alpha blur; glow = 1px halo sprites |

Plus **cross-era constants**: the name-card sprite (the data point — identical
in every era, the one unchanging object), the `not-allowed` cursor, the dossier
marker, the flip affordance.

- **Canvas resolution:** author the desktop at **512×288** (Stage 1–2) and
  **640×360** (Stage 3–4), displayed at integer multiples; render-texture at
  2048×1152 in VR for legibility. Test text in the headset *first* — VR is the
  constraint, browser will always look fine.
- **Pixel discipline:** nearest-neighbour everywhere (`FILTER_NEAREST`), no
  rotation of sprites except 90° steps, no sub-pixel movement on the canvas
  (move whole pixels; the period UIs did).
- **CRT effect (era 1–2):** cheap and convincing = scanline overlay sprite +
  slight barrel only on the *room's monitor mesh* (free — the mesh is curved),
  not a shader pass. Avoid full CRT shaders on Quest (fill-rate cost).
- **The room (3D)** stays low-poly flat-shaded with a *quantized* palette per
  era so the 3D never upstages the 2D: bake or vertex-color lighting, no
  realtime shadows except the monitor glow.

### 2.3 The Aseprite pipeline (author → export → engine, scriptable)

1. Author in **Aseprite** (~$20 once; or compile free from source — §5.2).
   One `.aseprite` file per app/window-chrome/icon-set, organized by era tags.
2. Batch-export via CLI in `tools/export-atlases.sh`:
   `aseprite -b assets/aseprite/*.aseprite --sheet-pack --data atlases/{title}.json --sheet atlases/{title}.png`
   — run as an npm script so Codex/Claude Code can regenerate atlases without
   you opening the app.
3. Engine loads atlas JSON; a tiny `Sprite9` helper handles window chrome
   9-slices. Animations (caret blink, modem LEDs, confetti misfire) ride the
   Aseprite frame tags.
4. **Commit the `.aseprite` sources.** They are the design record; the PNG
   atlases are disposable build artifacts.

### 2.4 Free raw materials that fit the style

- **Palettes:** lospec.com palette list (search "Win95", "CGA", "SLSO8",
  pastel sets) — free, attribution-light.
- **Pixel fonts:** "Press Start"-style fonts are wrong (arcade, not OS); look
  for *UI* pixel fonts (e.g., W95-style fonts on itch.io; many CC0/free for
  noncommercial — verify license per font and record it in `assets/fonts/LICENSES.md`).
- **Sound:** synthesize first (§4.4); free archives (freesound.org, CC0) for
  modem handshake/HDD only if synthesis disappoints.
- **AI-generated pixel art:** usable for *backgrounds and props* via the
  pipeline in TECHNICAL_BUILD (generate → downscale → nearest → palette-
  quantize against the era palette file). **Never** for faces or anything
  resembling a person (ethics + style coherence). UI chrome should be drawn,
  not generated — generators get period chrome subtly wrong, and wrongness
  here is the *narrative's* job, not the artist's accident.

### 2.5 Aesthetic QA ritual

Once per milestone, run the **"era smell test"**: screenshot each app at 1×,
put it beside a real period screenshot (reference only, never traced), and ask
(a) would someone who lived this era feel it in their spine? (b) is every
*deliberate* wrongness (flickering field, misaligned options) clearly authored
against an otherwise-correct ground? Deliberate anomalies only read if the
surrounding period accuracy is strict.

---

## 3. The 3D/XR layer (small, finite — build once)

- **Scene:** one PlayCanvas scene; per-era room kits toggled by the scene
  graph. The monitor mesh carries the desktop render-texture. The back-of-house
  is a second "stage set" behind the player spawn, lit only when flipped.
- **The flip state machine** (the only tricky engine code):
  states `victim ⇄ witness`; trigger = button (browser) / head-yaw threshold
  with hysteresis (VR); on enter-witness: input layer dies (`not-allowed`
  cursor; rays off), audio bed crossfades, ledger marks the flip. Shared
  narrative state lives in `state/` regardless of facing. Write this once in
  the vertical slice with tests; freeze it.
- **XR session:** standard WebXR `immersive-vr` request with graceful fallback
  ("Enter VR" button hidden when unsupported). Seated + standing reference
  space; recenter on long-press (festival staff will use this constantly).
- **Quest 3 performance budget:** ≤ 75k tris total, ≤ 60 draw calls, one
  2048×1152 render-texture updated only on dirty rects, no realtime shadows,
  72 Hz floor. The piece is *a dark room with one screen* — if it ever drops
  frames, something is wrong, not "optimize later."
- **Testing loop without cables:** dev server `vite --host` on the Mac Studio →
  **`tailscale serve`** gives you an HTTPS URL (you already run Tailscale) →
  open in Quest Browser. WebXR needs HTTPS; this solves it with zero deploy.
  Desktop-side: the **Immersive Web Emulator** browser extension fakes a Quest
  for daily iteration; do real-headset checks at least weekly and before any
  show.

---

## 4. Tools to edit and manage the system (the non-coder's cockpit)

| Layer | Tool | Why / notes |
|---|---|---|
| Code & AI direction | **VS Code + Claude Code / Codex CLI** | You direct; AI drafts. §6 is the method. |
| Versioning | **Git + GitHub (private, free)** | Every working day ends with a commit the AI writes and you skim. Tag milestones (`slice-v1`, `festival-cut-rc1`). |
| Pixel art | **Aseprite** | The one paid tool worth it. Free fallbacks: §5.2. |
| Narrative data | **JSON in `data/` edited via AI** + any node-graph viewer for sanity checks | You never hand-edit JSON: you tell Claude Code "in s2_1, make the mentor's third reply gentler" and review the diff. Ask the AI to maintain a generated `data/FLOW.md` (Mermaid diagram of the scene graph) so you can *see* the structure. |
| Dialog writing (option) | **Ink + inkjs** | Only if you want to write branching text yourself in a writer-friendly syntax (decide P4 in the script). |
| Audio | **Web Audio synthesis first**; jsfxr/ChipTone for one-shots; **ElevenLabs** only for the EuroRepent narrator; Audacity (free) for cleanup | Period UI sounds are synthesizable (beeps, clicks, modem). PROMPTS §B8 already sketches this. |
| In-world video | Local pipeline from TECHNICAL_BUILD (Draw Things / ComfyUI on the M2 Ultra) → CapCut | Only EuroRepent + influencer pastiche need video at all. |
| Playtesting notes | **BUILD_LOG.md** (existing convention) | One line per test: what felt true, what felt fake. |
| Deploy | GitHub Pages / Cloudflare Pages (free) | Static build; push-to-deploy. A stable URL doubles as the festival kiosk target. |
| Quest management | Meta Quest Developer Hub (free) | Screenshots/recordings from the headset for documentation; battery/guardian config for shows. |

**System-management habits that keep a solo+AI project sane:**
- The repo's `README.md` always answers: how to run, how to deploy, what works
  today. Make the AI update it as part of every task ("definition of done").
- One feature per AI session per branch; merge only after you've *felt* it in
  the browser (and in-headset for anything XR-touching).
- Keep `docs/` inside the repo in sync with this knowledge base **by copy, not
  by reference** — the AI assistants working in the repo can only see the repo.

---

## 5. Making it cheaper — the realistic budget map

### 5.1 Where money could leak, and the cheap route for each

| Cost center | Expensive route | Cheap route (recommended) |
|---|---|---|
| Engine/editor | PlayCanvas cloud-editor seats | **Engine-as-npm = $0** (already decided) |
| Feel prototyping | Building real features to discover they feel wrong | **ArenaAI throwaway tests** (§5.3) — the cheapest mistakes you'll ever make |
| Pixel art | Commissioning everything | Aseprite (~$20) + you + AI-assisted props with palette-quantize; commission only hero assets (e.g., the name-card, era wallpapers) if at all |
| Audio | Licensed SFX packs, composer | Web Audio synthesis + CC0; ElevenLabs free/starter tier for the one narrator |
| Video artifacts | Hosted gen-AI subscriptions (Runway/Kling at volume) | **Local on the Mac Studio** (already validated route: Draw Things/ComfyUI) — $0/clip, no filters fighting the satire, private |
| Hosting | Paid hosts, custom backend | **Static site = GitHub/Cloudflare Pages free tier.** There is *no backend by design* (the no-storage ethic makes hosting free) |
| Headsets | Buying multiple Quests early | Develop on the one Quest 3 + browser; festival fleet = borrow/rent via CDN/UiB AV pool when a show is confirmed |
| Translation/captions | Agencies | AI-drafted, human-reviewed (you're the human for PT/EN; NO via colleagues) |
| Testing | Formal lab sessions early | Corridor tests with the browser build (a URL is enough); formal survivor/queer-reader testing saved for when it matters (and budgeted/ethics-reviewed properly — don't cheap out on *that* one ⚑) |

### 5.2 Free-tool fallbacks (if even small costs must wait)

Pixel art: **Libresprite** or **Pixelorama** (both free, Aseprite-like;
Pixelorama exports spritesheets). Audio: **ChipTone / jsfxr** in-browser.
Video: skip hosted tools entirely; the local route is already free.
Fonts/palettes: itch.io CC0 packs + lospec. The only near-unavoidable spend is
~$20 for Aseprite (or an afternoon compiling it free) and a Quest 3 you
already have.

### 5.3 ArenaAI: what to send there, and what never to send

ArenaAI's role is already correctly scoped in
[ARENA_AI_EXPERIMENTS.md](../ARENA_AI_EXPERIMENTS.md) — single-screen,
disposable, browser-only feel tests. Sharpened guidance:

**Send to ArenaAI (cheap, high-information):**
- Any **single-window 2D interaction** whose *feeling* is uncertain: the name
  field, the dead-controls flip (#4), autocomplete drift (#8), the three Offer
  refusal behaviors (#11 — this directly resolves script decision P2).
- **Tone calibration**: is MentorRob warm enough before the nudge? Does the
  wellness app earn a second of genuine liking? Iterating *copy* in ArenaAI is
  far cheaper than in the engine.
- **A/B beats**: two versions of the same screen with one variable changed
  (e.g., the saved-log toast appearing at once vs. after a delay).

**Never send to ArenaAI:**
- Anything VR, the flip-as-turn, the room, performance questions — it cannot
  answer them and the answers wouldn't transfer.
- **Pixel-perfect aesthetics** — its output is not a reference asset (existing
  rule); judge style only against your own Aseprite work.
- Anything you'd be tempted to keep. The moment an ArenaAI artifact feels
  "good enough to reuse," stop — rebuild it properly in the repo instead.
  (Also: assume anything pasted there is processed by a third party — fine for
  invented marks and composed dialogue, which is all these prompts contain;
  never paste archive material or survivor testimony.)

**Budget rhythm:** run ArenaAI Tier 1 (#1, #4, #2, #3) **before** scaffolding
the repo. Four feel tests cost approximately nothing and de-risk the two most
expensive assumptions (the name hook; the dead-controls flip).

### 5.4 The zero-backend dividend

Because the ethics already forbid storing or transmitting anything, the entire
piece is a **static site**: no server, no database, no accounts, no GDPR
processing surface, free hosting forever, trivially mirrorable for festivals
(runs from a local file server if venue wifi dies — see
[FESTIVAL_AND_EDUCATION.md](FESTIVAL_AND_EDUCATION.md) §3). The cheapest
architecture and the most ethical one are the same architecture; protect that
property when anyone proposes analytics.

---

## 6. Building with Codex / Claude Code — the working method

### 6.1 The division of labor

You are the **director and editor**; the AI is the **crew**. Concretely:
- **You:** decide beats, judge feel, write/approve all survivor-adjacent and
  dossier text, review diffs at the level of "what does this change do," keep
  BUILD_LOG.
- **AI:** scaffolding, engine code, canvas apps, JSON scene/dialog drafting
  (to your dictation), atlas export wiring, README upkeep, refactors, test
  harnesses, deploy config.
- **Never delegated:** ethics judgment calls; final wording of anything a
  survivor might read as being about them; source citations (AI drafts must
  carry `[VERIFY SOURCE]` until you check them — repo rule).

### 6.2 `CLAUDE.md` — the repo's standing orders (write this first)

The single highest-leverage artifact for AI-assisted building. It should
contain, at minimum:

```md
# PC Simulator — working rules for AI assistants
- Stack: PlayCanvas (npm) + Vite + TS. Static build. No backend, no network
  calls at runtime, no analytics, no cookies, no localStorage of user input.
- The typed name and all user inputs live in memory only and are wiped on
  exit. Any PR that persists or transmits them is wrong by definition.
- Narrative content lives in data/, not src/. Prefer editing data.
- Pixel discipline: import era palettes from src/desktop/theme/; never invent
  colors; FILTER_NEAREST; integer positions on the canvas.
- Tone: grounded, cold, institutional on the victim side. Satire only inside
  perpetrator self-presentation artifacts, and it must collapse. Never
  satirize the gender-exploratory clinical debate (render both captions).
- No real people, likenesses, logos, or verbatim testimony. Invented marks
  only (Compass, HopeRestored, Pastor.AI, EuroRepent Elite™…).
- Every scene change must keep the Festival Cut (data/cuts.json) valid.
- Definition of done: runs via `npm run dev`; README updated; one-line entry
  appended to BUILD_LOG.md; in-headset check noted for XR-touching changes.
```

This makes every AI session inherit the ethics and aesthetics without you
re-explaining — the knowledge base's hard lines, compiled into enforcement.

### 6.3 Prompt pattern for build tasks (refines PROMPTS §E)

Structure every feature request as: **context pointer → task → constraints →
acceptance criteria.** Example:

> Read docs/PRODUCTION_SCRIPT_v0.2.md scene s1_1 and data/scenes/s1_1.json.
> Implement the IRC app (src/desktop/apps/irc.ts): scrolling channel,
> typeable input, scripted regulars from data/dialog/s1_irc.json, MentorRob
> DM window after the third user message, closing "Logging to C:\mirc\logs\"
> toast. Constraints: CLAUDE.md; era-1 palette; canvas 512×288. Accept: in
> `npm run dev` I can type in #stillstruggling, receive the DM, see the
> toast; ledger gains records:"mirc-log"; no network calls (assert in test).

Rules of thumb learned from this project's own history:
- **One module per session** (the `Random 5` tip still holds). Big multi-system
  prompts produced the unrunnable `Random 2` transcript; small accepted slices
  produce a repo.
- **Always demand acceptance criteria you can check by feel** ("I can type and
  the DM arrives"), not by reading code.
- **Make the AI write tests for the two invariants that protect people:**
  (1) no runtime network requests; (2) ledger wiped on exit/idle-reset. These
  run in CI (GitHub Actions free tier) on every push.
- When output is wrong, **iterate with adjectives, not diffs**: "the boot is
  too funny — make it colder, plausible, boring" works; hand-fixing generated
  code as a non-coder doesn't.
- Use **Claude Code for repo-wide work** (it sees the whole project, runs the
  dev server, can screenshot) and either assistant for single-file app work.
  Keep `AGENTS.md` symlinked to `CLAUDE.md` so both obey the same law.

### 6.4 Build order (sequenced for learning + de-risking)

1. **Feel tests** — ArenaAI Tier 1 (#1, #4, then #2/#3). Decide P2 with #11
   later. *Exit criterion: the name hook and dead-controls flip both land.*
2. **Repo scaffold** — CLAUDE.md, skeleton (§1), CI invariant tests, deploy
   pipeline to a WIP URL. One AI session.
3. **Vertical slice** = Stage 0 complete + Stage 1's mIRC beat + the real flip
   into 1.2 + dossier card #1 — in browser **and** Quest 3. This exercises
   every subsystem once (canvas OS, typing, prop→canvas, flip, witness
   deadness, dossier, ledger). *This is the hard milestone; everything after
   is content production.*
4. **In-headset review + corridor tests** of the slice; BUILD_LOG; adjust the
   flip threshold, text sizes, pacing.
5. **Short Path** — Stage 4 condensed + convergence + Offer + Close, plus
   the Assistant bridge. (Before Full Path: nearest external-deadline shape;
   forces the convergence payoff to work.)
6. **Full Path** — Stages 2 and 3, seam objects, EuroRepent artifact, optional
   2.6 behind its gate.
7. **Hardening** — accessibility pass, kiosk/idle-reset mode, localization
   hooks, the archive-link wiring for the dossier (depends on the public
   archive timeline).

Each milestone = git tag + one BUILD_LOG paragraph + a deployed URL you can
send to supervisors.

### 6.5 Open models in VS Code + the PlayCanvas connection *(added 2026-06-10, per Sérgio)*

**The two-tier AI crew (cost-aware division of labor):**

| Tier | Models / tools | Use for | Why |
|---|---|---|---|
| Frontier | **Claude Code** (terminal/VS Code), **Codex** | Architecture, `src/engine/` (the flip, XR session), repo-wide refactors, reviewing the other tier's output | The fragile 20% where mistakes cost days |
| Local / open | Open-weight coder models (e.g. Qwen-Coder-class, ~30B fits the **Mac Studio M2 Ultra 64GB**) served via **Ollama / LM Studio / MLX**, routed through the **LiteLLM** instance Sérgio already runs, surfaced in VS Code via an agent extension (**Continue / Cline / Roo Code** — pick one, record in PROCESS_REGISTER) | Bulk drafting in `data/`: dialog trees, strings, EULA/changelog variants, persona cards, autocomplete lists, test scaffolds | Zero marginal cost, private (nothing leaves the machine — fits the project's own ethics), endless iteration on text |

**Working rules for the local tier:**
- Same law applies: the extension must load `CLAUDE.md` (Continue/Cline support
  rules files; symlink or paste it into their config). Open models drift toward
  camp and gamification *faster* than frontier ones — generate with local,
  **review with frontier or by feel**, never merge local output unread.
- Local models write `data/` and tests; they do not touch `src/engine/`.
- Tailscale means the same LiteLLM endpoint also serves any laptop used on
  the road — one model server, every editor.

**PlayCanvas inside VS Code:** with the engine-as-npm decision, PlayCanvas
*is already VS Code-native* — `npm i playcanvas` ships TypeScript types, so
IntelliSense, go-to-definition, and AI-assistant code awareness all work with
zero setup; `vite` hot-reloads the scene on save. That is the "connection":
the editor experience the cloud Editor sells is replaced by VS Code + types +
hot reload. The official **PlayCanvas VS Code extension** (cloud-editor
project sync) exists `[VERIFY current state]` but only matters if assets ever
flow through the cloud Editor — our path doesn't, so it stays uninstalled
unless a collaborator brings cloud-editor scenes.

---

## 7. Enforcing the ethics technically (so care isn't a promise but a property)

- **No-storage invariant:** no `localStorage`/`sessionStorage`/IndexedDB/
  cookies for user input; ledger is a plain in-memory object; `beforeunload`
  and kiosk idle-reset wipe it. CI test greps for storage APIs.
- **No-network invariant:** after asset load, zero runtime requests. CI test +
  CSP header (`connect-src 'none'`) as belt-and-braces — this also *proves*
  the privacy claim to any reviewer, festival, or ethics board: the page
  cannot phone home even if code tried.
- **The photo-filter never sees a photo:** the Restoration Filter UI takes no
  camera/file input at all; the "preview" is a pre-authored sprite. Enforced
  by simply never requesting permissions (Quest will show no permission
  prompts — verify in QA).
- **Content gates:** scene 2.6 ships disabled via `data/cuts.json`; festival
  builds are compiled without it (not just hidden).
- **Pause/exit always reachable:** input layer guarantees the pause overlay
  preempts every scene including the Offer; test on both modes each milestone.
- **Speculative labels:** dossier card schema has a required
  `status: documentary | contested | speculative` field — a card without it
  fails the build. Methodological honesty as a type error.

---

## 8. QA checklist (run before every show / supervisor demo)

- [ ] Browser: Chrome + Firefox + Safari, 1080p and a small laptop; text crisp
      at integer scales; `Esc` overlay works everywhere.
- [ ] Quest 3: 72 Hz held through stage transitions and 4.4; flip threshold
      comfortable seated *and* standing; recenter works; no permission prompts.
- [ ] Type legibility in-headset for the smallest dossier text.
- [ ] Full ledger wipe on exit, idle, and refusal-path endings.
- [ ] Zero network requests after load (devtools + CI both).
- [ ] Content warning cannot be skipped in under 4s; Leave works.
- [ ] Audio: captions render for all spoken/voiced media (EuroRepent included).
- [ ] Festival build: 2.6 absent; idle-reset to attract screen at 30s.
- [ ] The era smell test (§2.5) on any new screens.

---

## 9. What this guide deliberately does not cover

Festival operations, headset hygiene, facilitation, classroom use →
[FESTIVAL_AND_EDUCATION.md](FESTIVAL_AND_EDUCATION.md). Narrative content →
the production script. Sourcing/verification → the existing KB conventions
(tags stay in force in all new repo text).
