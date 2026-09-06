STATUS: live

# THE CLOSE IS NOT WHAT HE ENVISIONED — the brief, written before anything is built
*Sérgio, 2026-09-06, on the four panels photographed the same morning: **"The Close its okay, not
really what I envisioned, as probably more like an aesthetical need to be more visually interesting
and have a more clear understanding of the content, like information on the character, why the choices
were done etc. More informative."***

---

## §1 · What he is actually pointing at, and it is not decoration
Two complaints in one sentence, and the second is the bigger one.

**"More visually interesting"** is the surface note. **"Information on the character, why the choices
were done"** is the structural one — and reading it against what the Close currently IS makes the gap
obvious:

> ⚑ **The Close is entirely about the APPARATUS, and says nothing about the three people or about the
> player.** Four panels describe how the system recruited, audited, governed and resurged; the
> constellation below them is a graph of the system's own sources — NARTH, Exodus, the Sides chart,
> Genspect, the detrans cohort study. A viewer finishes the piece and is handed a bibliography of the
> thing that did it, and nothing at all about who it was done to or what they themselves just did.

That is a defensible ending for an essay. It is a thin one for a work whose last ninety minutes were
spent in three bedrooms.

## §2 · What the piece already has and does not surface
⚑ **The ledger has been recording the player the whole time and the ending never reads it back.**
`src/state/ledger.ts` holds, per playthrough: `provotypes`, `sends`, `guidance`, `belongings`,
`lamby`, `checkins`, `media`, `caleb`, `era3Arrival`, `graceQueue`, `tags`, `records` — every one with
a `witness` line already written for the intake record. The Close reads **none** of it.

⚑ **And the surface that DID read it back is gone.** The intake record was the piece's one "here is
what you did" object, and 2026-09-05 retired its migration to Maya's wall for good reasons. The Close
is now the only place that could carry that function, and it doesn't.

## §3 · Three layers the Close could carry — his to choose between or combine
| | what it adds | cost |
|---|---|---|
| **A · THE PEOPLE** | one cluster per room: who Daniel, Vera and Maya were, what the apparatus did to each, and what became of the room. Answers "information on the character" directly | writing (mine, per CLAUDE.md) + three panel quads on the existing atlas |
| **B · WHAT YOU DID** | the ledger read back: the provotypes you finished or abandoned, the corrections you applied or skipped, the guidance you declined, the belongings you kept, the offers you undid. ⚑ Every line already exists as a `witness` string | code (a ledger→panel pass) + layout. No new writing |
| **C · WHY** | the makers cluster: why the piece made the choices it made — the invented marks, the retired deadname, the refusal to satirise the clinical debate. Already half-canon and motivated by the IDN paper's co-authorship disclosure | writing + one cluster |

⚑ **My reading, offered not decided: B is the one that answers his sentence.** "Why the choices were
done" reads most naturally as *the player's* choices, not the authors' — and B is the only layer that
costs no new writing, because the piece has been writing it all along and throwing it away at the end.
A is the strongest addition on its own merits. C is the paper's need more than the work's.

## §4 · The visual half
The panels are 1.62 × 0.81 m cards at 3.05 m, one atlas, one mesh, one draw call, and they do not
billboard. That restraint is right and should survive. What is missing is **hierarchy**: everything on
screen is the same weight — every node the same size, every label the same colour, four panels at four
identical bearings. Nothing tells the eye where to start.
⚑ Cheapest real gains, in order: a **reading order** (the four eras lit in sequence rather than all at
once); **weight** (a person-node and an apparatus-node should not look alike — `personSlotAspect` and
`apparatusNodeSize` already exist and are barely used); and **proximity** (his own note: fewer, more
specific nodes beat a dense field nobody can parse).

## §5 · ⚑ 8th Wall — checked, and it does not fit
He linked `github.com/8thwall/engine`. It is the **WebAR** engine binary — world/face effects, image
targets, sky effects — distributed compiled, under a *limited-use licence*, and explicitly not the
MIT-licensed one. Three of this project's own hard invariants collide with it head-on:

1. **It is camera AR, not WebXR VR.** This piece is a headset/browser 3D room; 8th Wall's subject is
   the phone camera looking at the real world.
2. ⚑ **CLAUDE.md: "The photo-filter never takes camera/file input… Never request permissions."** A
   camera-AR runtime is the exact opposite of that invariant, which exists for ethics reasons.
3. **"No runtime network calls after asset load"** — a licensed commercial runtime phones home.
   And a binary under a limited-use licence in a public repo bound for festivals is the same class of
   problem as the CC-BY-NC sound that was rejected in September.

**So: not a stack change.** ⚑ But if he linked it for something SPECIFIC — a look he saw in their
showcase, a feature, a way they handle information overlays — that is worth knowing, because the
answer above is to the repo and not to whatever he actually saw.
