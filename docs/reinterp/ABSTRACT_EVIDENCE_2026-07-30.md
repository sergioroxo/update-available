STATUS: live

# ABSTRACT SUBMISSION — figures + methodology verification (2026-07-30)
*Sérgio asked for (a) screenshots for the abstract, and (b) a check that his methodology claim is
actually supported by the repo. The claim audited here, verbatim:*

> "the methodology combines research-through-design, reflective practice, and artefact analysis.
> Production logs, prompts, model outputs, design documents, code revisions, and spatial experiments
> trace how creative agency is negotiated across ideation, interface writing, audiovisual development,
> and prototyping."

## ✅ The claim is supported. Counts, as of 2026-07-30

| Artefact class claimed | What exists | Count |
|---|---|---|
| **Production logs** | `BUILD_LOG.md` + `docs/reinterp/01_SESSION_LOG.md` | 205 entries / 30,367 words · 2,994 lines / 61,930 words |
| **Prompts** | ChatGPT deep-research prompt docs · Codex build briefs · Fable round prompts · session prompts embedded in specs | 9 · 7 · 2 · 8 docs |
| **Model outputs** | retained research results, TTS renders, the rendered video | 2 docs · 1 WAV · 1 MP4 (regenerable) |
| **Design documents** | `.md` under `docs/`, each carrying a machine-checked `STATUS:` header | 103 (69 live · 8 superseded · 26 history-only · 0 unreviewed) |
| **Code revisions** | commits on `reinterp` | 158 total · 144 since branch |
| **Spatial experiments** | room data + superseded archive + the spatial-versions doc | 7 live · 1 archived · present |

## ⚑ One honest qualification, and it strengthens the claim
**"Model outputs" are mostly retained as SELF-REPORTS, not raw transcripts.** The 61,930-word session
log and the 30,367-word build log are largely *agents describing their own work* — what they built,
what they got wrong, what they refused to decide. Raw conversation transcripts are not in the repo.

If a reviewer asks "where are the model outputs?", the accurate answer is: **the corpus is the
agents' accounts of their own reasoning, versioned alongside the code they produced.** That is
arguably a better artefact for studying negotiated agency than a raw transcript, because each entry
was written *to be read by the next agent and by the human* — but it should be described accurately
rather than as "model outputs" plain.

## ⚑ The strongest methodological evidence is something the claim currently undersells
The repo contains **machine-enforced ethics**. `tools/check-spec.mjs` grew seven checks (C1–C7) that
fail CI when the project's own stated laws are violated — dossier sourcing, felt-scene purity, the
Quest budget, palette discipline, doc lifecycle, review-surface completeness, and authoring-marker
leaks into player-facing text. **C7 exists because an authoring note ("researcher note — Sérgio's
voice, to write") shipped into the fiction and the project lead caught it in play.**

That is a *diff*, not a claim: the negotiation of agency is visible as tests that constrain what
either party can ship. Worth a sentence in the abstract — it is unusual and it is citable.

Four further documented instances, all with reasoning preserved, if useful as examples:
1. **The human overturned the machine's design call** — the debug-panel diagnosis (three times the
   review tooling misled a playthrough; the third time he pushed back and the root cause was mine).
2. **Evidence settled what taste could not** — D31's dispersal beat was decided by GPAHE reports
   rather than by either party's preference.
3. **The machine refused to fabricate** — S59 declined to invent a boot jingle when no asset existed,
   and proved the absence both ways instead.
4. **Sessions argued dramaturgy rather than executing it** — S57 was asked to choose how the residue
   connects to the era's end, rejected two options with stated reasons, and logged the argument.

## The figures (`out/figures/`, regenerable — see below)
| File | Shows | Why it earns a slot |
|---|---|---|
| `fig1_entrance_overhead.jpg` | the overhead entrance into Room 1, 1997, lamp-lit | the descent Sérgio asked to see — the piece's first gesture, and the spatial model in one frame |
| `fig2_seat_pov_e1_desktop.jpg` | the seat POV: the CRT filling the view, E1 desktop with `lamby_ri…` and `referral…` visible | **the architecture in one image** — one UI surface, textured onto a monitor inside a 3D room |
| `fig3_close_constellation.jpg` | the Close's point cloud with its provenance labels | the ending, and the knowledge-graph argument |

**Not captured, and why:** the witness record renders only while the flip is active, so it needs
either a real turn in play or a flat-mode capture — worth doing before submission since "the witness
side is the sharp side" is a load-bearing law.

## ⚑ BUG FOUND while capturing — the constellation's labels mirror
In `fig3`, roughly half the labels read **backwards** ("production script v0.3", "Truth in Love
campaign 1998"). The label quads are single-sided and do not billboard toward the camera, so any node
behind the viewer's plane shows its text reversed. In play the camera is seated with a slow drift, so
it is less obvious than in a free-camera figure — **but it is still wrong, and this is the surface
whose whole job is to be read.** Logged for a session; do not use a mirrored-label frame as a figure
without fixing it first.

## Reproducing the figures
Dev server + `?reinterp=1&debug=1`, then in the console: `__camFree(x,y,z,pitch,yaw)` poses a free
review camera and `__app.render()` forces a frame. Captured via a canvas readback taken immediately
after an explicit render (the engine runs without `preserveDrawingBuffer`, so a readback on any other
frame returns blank — that is why the debug panel's own screenshot button cannot be trusted, which is
itself worth fixing).
