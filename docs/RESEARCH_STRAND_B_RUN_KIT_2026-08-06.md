STATUS: live

# STRAND B — RUN KIT (2026-08-06)
*Sérgio wants to try the room-layout comparison out of curiosity. Everything needed to run it today:
the prompt to paste, the models to paste it into, how to score the results, and the two
methodological traps.*

---

## ⚑ TWO TRAPS TO KNOW BEFORE YOU START

**1 · Do not mention SOGICE, conversion practices, or the piece's subject in the prompt.**
Not for squeamishness — **for validity.** If the brief carries sensitive framing, some models will
refuse or hedge, and you will be measuring refusal instead of spatial reasoning. Strand B is a
*spatial* study. Keep it a room, a character, and a schema. The prompt below does that.

**2 · ⚑ A Claude arm is not a neutral competitor.** Rooms 1–3 were authored by Claude models in this
repo, so a Claude run has seen this exact schema, these prop keys and these rooms. **Report it as the
BASELINE, not as a contender** — that is the honest framing and it is also more interesting: *how
close does a cold model get to the one that has been living in the file?*

---

# 1 · THE PROMPT — paste this verbatim into each model

```
You are laying out a small bedroom for a low-poly 3D scene. Output ONLY JSON.

THE ROOM (fixed — do not move or resize these)
- Interior floor spans x from 2.13 to 5.63, z from -1.15 to 2.55. Floor at y=0, ceiling at y=2.68.
- The desk wall is at x=5.71. There are side walls at z=-1.05 and z=2.45, and a window in the
  desk wall.
- Existing fixed furniture, which you must work around (position is the BOTTOM-CENTRE of the prop,
  size is [width, height, depth] in metres):
    desk        pos [5.28, 0, 0.70]   size [1.40, 0.75, 0.60]  yaw 270
    chair       pos [4.80, 0, 0.70]   size [0.50, 0.90, 0.50]  yaw 270
    bed         pos [4.23, 0, 1.85]   size [1.05, 0.50, 2.05]  yaw 270
    nightstand  pos [2.99, 0, 1.90]   size [0.40, 0.50, 0.40]  yaw 270
    bookcase    pos [4.28, 0, -0.64]  size [0.75, 1.70, 0.50]  yaw 270
    rug         pos [4.10, 0, 0.90]   size [2.00, 0.02, 1.60]  yaw 270

THE VIEWER
- There is ONE fixed camera at x=4.40, y=1.16, z=0.70. It cannot walk. It can only rotate in place.
- So the room is experienced by TURNING. Anything worth seeing must be placed where a turn finds it,
  including behind and beside the camera. A wall the camera never faces is wasted.

WHO LIVES HERE
- Maya, early thirties, 2026. She works from home. She is a real person with a life that is mostly
  ordinary: she cooks badly, she keeps things too long, she has one hobby she is serious about and
  one she has abandoned.
- The room should show that somebody LIVES here — not that somebody decorated here. Wear, habit,
  and unfinished business are more useful than styling.

WHAT TO ADD
- Roughly 30-40 small objects: her belongings, on and around the existing furniture.
- Nothing may intersect anything else, or a wall, or the floor. Nothing may float unsupported.
- Only these 11 keys may use the `model` field, and they are the ONLY detailed meshes available:
  bed, desk, chair, bookcase, rug, nightstand, plant, opening_corkboard, cassettePlayer,
  cassetteTape, cassetteTapeShelf.
  ⚑ EVERYTHING ELSE IS A BOX. Omit `model` and it renders as a coloured rectangular block. Design
  WITH that constraint — a convincing object made of one or two boxes is the actual craft here.
- Style: cozy low-poly with soft, underdefined edges. Not horror, not clinical, not luxury.
- Budget: under 60 draw calls total for the whole room, so be economical.

OUTPUT FORMAT — a JSON array, nothing else, no prose, no markdown fence:
[
  {"id":"e_mug","pos":[5.10,0.75,0.55],"size":[0.08,0.09,0.08],"color":"#C97B4A","yaw":270},
  {"id":"e_lamp","pos":[5.15,0.75,1.50],"size":[0.16,0.42,0.16],"color":"#E8C87A","yaw":270,
   "model":null}
]
Rules: every `id` starts with `e_`. `pos` is the BOTTOM-CENTRE. `size` is full extent in metres.
`color` is a hex string. `yaw` is one of 0, 90, 180, 270 — no other rotations.
Include a one-line `"_why"` field on at most five objects, explaining what that object says about her.
```

**Optional second turn, once it has answered** *(this is where models differ most)*:
```
Now check your own layout. List every object that intersects another object, a wall, or the floor,
with the overlap in metres. Then output a corrected JSON array.
```
⚑ **That second turn is the study.** RQ: *can the model find its own geometric errors when asked?*

---

# 2 · THE MODELS — as of today, 2026-08-06

*Checked against current sources today; model lineups move monthly, so re-check before you publish
anything, and always record the exact version string the provider reports.*

## The arms, and why each is in
| arm | why it is in the study |
|---|---|
| **Frontier closed** | the ceiling — what is possible today |
| **Frontier open-weight** | the actual question: **has the barrier dropped?** |
| **Small open-weight** | what runs on a laptop at a university with no GPU budget |
| **Baseline (Claude)** | ⚑ not a competitor — the model that authored these rooms already |

## A six-model run — enough for curiosity, small enough to finish in an afternoon
| # | model | arm | note |
|---|---|---|---|
| 1 | **GPT-5.6** (Terra, or Sol for a second pass) | frontier closed | GA since 9 Jul 2026; Sol has a max reasoning-effort setting worth a separate row |
| 2 | **Gemini 3.5 Flash** | frontier closed | May 2026; 3.5 Pro is still not GA as of early Aug |
| 3 | **⚑ GLM-5.2** (Zhipu) | frontier open-weight | **the headline arm** — MIT-licensed, ranked #1 open-weight, 744B MoE |
| 4 | **DeepSeek-V4-Pro** | frontier open-weight | the reasoning-heavy open model; V4-Flash if cost matters |
| 5 | **Qwen3-Coder-480B-A35B** | open-weight, code-shaped | ⚑ the interesting hypothesis: **does a code model emit better SCHEMA and worse ROOMS?** |
| 6 | **gpt-oss-20b** | small open-weight | Apache 2.0, runs locally — the "no budget" arm |
| — | **Claude Opus 5** | **baseline** | authored the existing rooms; report separately |

**Also worth one row if you have the appetite:** **Kimi K2** (Moonshot, 1T MoE) and **Qwen3.8-Max**
(released 3 Aug 2026 — brand new, which is itself a finding).

**Where to run the open ones without a GPU:** OpenRouter or Together carry most of these behind one
API key; gpt-oss-20b runs on a Mac under Ollama or LM Studio.

⚑ **Uncensored / abliterated variants belong to Strand A, not here.** This brief is benign; removing
a model's safety training will not make it better at geometry, and mixing the arms muddies both
studies.

---

# 3 · SCORING — the part that makes this research rather than vibes

Save each model's JSON as `out/strandB/<model>.json`, then:

```bash
node tools/room-audit.mjs
npm run audit
```

Record per model:

| measure | source | what it tells you |
|---|---|---|
| **intersections** (count + worst depth in m) | `room-audit.mjs` | can it reason about volume at all |
| **through-wall / out-of-bounds** | `room-audit.mjs` | does it respect a stated boundary |
| **floating props** | `room-audit.mjs` | does it understand support |
| **draw calls, tris** | `npm run audit` | did it obey a budget it was given |
| **blank / unlit frames** | assertion 3 | did it put anything where the light is |
| **subject-in-frame from the seat** | assertion 4 | ⚑ **did it design for a camera that only turns** |
| **schema validity** | did it parse at all | the cheapest and most revealing measure |
| **self-correction** (2nd turn) | rerun the audit on the corrected array | can it find its own errors |
| **placement quality** | your eye | the one thing no tool scores |

## ⚑ The prediction I would write down before running
**Models will be good at *what belongs in the room* and bad at *where it physically is*** — plausible
inventories, and intersections everywhere. And I expect the **turn** constraint to be the one most
widely ignored: everything clustered on the desk wall, nothing behind the camera.

**Write your prediction down first.** A pre-registered guess that turns out wrong is a better result
than a post-hoc explanation, and it costs one line.

---

# 4 · WHAT NOT TO DO WITH THE OUTPUT
- **Do not paste a model's array into `data/room/` and ship it.** S74's contract is that Maya's things
  are hers; a cold model does not know her, and the rooms are characterisation, not decoration.
- **Do run the winner past your own eye and keep the two or three objects that surprise you.** That is
  the honest version of "AI for good" here — not delegation, **provocation.** A model suggesting
  something you would not have thought of, which you then choose, is a real contribution and is
  citable as one.
- **Record the date and the version strings.** These results expire.
