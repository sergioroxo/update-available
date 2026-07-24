# HOW TO RUN A SESSION — plain-language operator's guide (added Round 14, 2026-07-03)
STATUS: live

*For Sérgio. Answers the standing question: "how do I actually get Opus/Sonnet/Codex to do something?"
No coding knowledge assumed.*

## The mechanics, stated plainly

**There is no automatic hand-off between models in this system.** Fable doesn't call Opus; Opus doesn't
call Sonnet. Every lane on the dispatch board is a **separate chat window you open yourself**, with the
model set to whichever one the board names, sitting in the right folder. You paste in a prompt Fable wrote,
let that session run on its own from start to finish, and then bring what it produced back to Fable (this
chat) in your next round report. Fable is the coordination hub; nothing here orchestrates itself
automatically. (Inside a running session, that session's own model *can* spin up its own internal
sub-tasks if it decides to — that's normal and not something you need to manage — but that's different
from "does Opus call Sonnet," which it doesn't.)

## The two folders — always check which one you're in

- **`/Users/sergiogalvaoroxo/update-available`** — the ORIGINAL folder. Fable rounds happen here (this is
  where Fable's memory and the plan docs live). Never build here.
- **`/Users/sergiogalvaoroxo/update-available-reinterp`** — the WORKTREE. Every Opus/Sonnet/Codex build
  session happens here, always. It's a separate, isolated copy — nothing done here touches the shipped
  build in the original folder.

## Starting any session, step by step

1. Open a new chat window/session.
2. Set the model to whatever the dispatch board says for that lane (Opus 4.8, Sonnet 5, etc.) — use your
   app's model picker/switcher before you start typing.
3. Make sure the session is working in the right folder (worktree for any build lane; original folder only
   for Fable rounds).
4. Paste the FULL prompt for that lane — either from this doc, or from `02_SONNET_SESSION_TEMPLATE.md` once
   Fable has filled it for a specific session.
5. Let it run to completion — it will verify itself (tests, build, a browser check) and log what it did.
6. Bring the result back to Fable: paste its summary/report (or just tell Fable what happened) in your next
   round message here.

## Running a Fable round (this chat)

Open a NEW Fable chat in the ORIGINAL folder, paste everything under the rule in
`docs/reinterp/04_FABLE_ROUND_PROMPT.md`, then add your round report underneath (results, decision
answers, new ideas — raw is fine). You're already doing this correctly.

---

## READY-TO-PASTE PROMPTS — Round 14's dispatch items

### Opus 4.8 — the fluid-trans-cluster geometry doc

Open a new session, **model = Opus 4.8**, folder = the ORIGINAL folder (`/Users/sergiogalvaoroxo/update-available`) — this is a DESIGN DOC, not a build, so it stays with the plan docs, not the worktree. Paste:

```
You are writing a design/geometry doc for the reinterpretation of "YOUR UPDATE HAS FAILED." — NOT
building code this session. Read, in order: CLAUDE.md, docs/ETHICS_CONSTRAINTS.md,
docs/REINTERP_MASTER_PLAN_v1_2026-07-02.md (Rounds 12–14 especially — R12-3, R13-3, R14-2), and
docs/REINTERP_TRANS_REALITY_ERA_VISION_2026-07-03.md in full.

Your task: write a first-pass GEOMETRY DESIGN DOC (in the style of the piece's existing
ERA3_ROOM_AND_SCREEN_DESIGN-type docs) for the fluid trans-identity room/cluster — save it as
docs/REINTERP_FLUID_TRANS_ROOM_GEOMETRY_2026-07-03.md in the ORIGINAL folder (this is a design doc, not
code — do not touch the worktree this session).

Sérgio has CONFIRMED the following creative direction (master plan §R14-2) — do not re-litigate it, design
FROM it:
- E1: the room is near-dark, structural-only (the one legible thing is the same-assigned-sex-mentor rule,
  not identity-specific content).
- E2: the room defaults to a trans-feminine lean (the "homosexual continuum" diagram as its object).
- E3: the room can hold all three facets (trans-woman / trans-man / non-binary) AT ONCE — this is the
  "all three" convergence state, earned because 2016 is when the apparatus's own sorting categories
  multiply (rhymes with the Sides chart debuting complete the same year). ALSO stage a Lesbian/
  Trans-masculine dilemma connective beat here, tying Vera's lead lesbian room to the trans-masculine
  facet (research grounding: the butch/FTM "borderland," documented from the late 1990s onward).
- E4: the room is trans-feminine-LED (Maya's own lead room functions as this facet — question whether a
  separate trans-feminine alcove space is even needed here) with an OPTIONAL trans-masculine "phone"
  side-presence, interactable only if the player seeks it out. Sérgio's framing to preserve exactly: this
  is a deliberate choice about where suffering concentrates at that point in the story, NOT symbolic
  erasure of trans-masculine content.
- Proposed switching mechanism (era-vision doc §3, not yet locked): each era carries a DEFAULT facet
  weighting; the default can be pulled toward a non-default facet by a cross-cluster storyline send or
  sustained player gaze; "all three at once" is reserved for earned convergence moments (E3 primarily).

Your doc should resolve, as a DESIGN PROPOSAL (not final): the actual spatial/geometric shape (seated
center, gaze-only, no locomotion — CLAUDE.md invariant), how the facet-switching mechanism would be
represented as DATA (not hardcoded — tags/weights per era, pull triggers), how this interacts with the
existing radial-cluster geometry question (C3 in the master plan archive — witness ceiling overhead per
R8-3, alcoves on the lateral arcs), and Quest 3 budget implications (≤75k tris, ≤60 draw calls, ≤3 hero
objects — note where the "three facets" idea needs simplification to hit budget, don't just assume it fits).

Flag anything you genuinely cannot resolve on paper as an open question for Fable/Sérgio — do not guess
past a real ambiguity. This is still gated at G1 for the trans-masculine content specifically (design
proposal only, not build-ready copy). End with a short "what this unblocks" section.

When done: do NOT commit anywhere (this session doesn't touch git) — just confirm the doc is written and
give Sérgio a 3-5 sentence summary of the proposed shape for his round report back to Fable.
```

### Sonnet 5 — R4, the Origin Story Intake ('97)

Open a new session, **model = Sonnet 5**, folder = the WORKTREE (`/Users/sergiogalvaoroxo/update-available-reinterp`). Paste:

```
You are running ONE build session on the reinterpretation branch of "YOUR UPDATE HAS FAILED."
You are in the worktree /Users/sergiogalvaoroxo/update-available-reinterp (branch reinterp).
The original project at /Users/sergiogalvaoroxo/update-available is READ-ONLY reference — never edit it,
never commit to main.

Step 0 — doc sync: copy any files matching REINTERP_*.md, CHATGPT_DEEPRESEARCH_*.md,
CODEX_PROMPT_REINTERP_*.md, docs/reinterp/00_START_HERE.md, docs/reinterp/02_SONNET_SESSION_TEMPLATE.md,
docs/reinterp/05_HOW_TO_RUN_A_SESSION.md from /Users/sergiogalvaoroxo/update-available/docs/ into this
worktree's docs/ where the original differs, and commit the sync first.

Step 1 — read, in order: CLAUDE.md, docs/reinterp/00_START_HERE.md, docs/reinterp/01_SESSION_LOG.md,
docs/REINTERP_MASTER_PLAN_v1_2026-07-02.md (§R4 in the v1 body's phased roadmap, plus the archived
Round-2 candidate-merge note and Round-4 archival unlock — read
docs/REINTERP_MASTER_PLAN_ARCHIVE_ROUNDS_1-11_2026-07-02.md sections "R2-4" and "R4-2" specifically for
this session), src/desktop/apps/provotype.ts (the R1 framework, now revised per the Session 3-revision
commit 607a542 — read that diff too, since this is the SECOND provotype built on the grammar and should
use its room-presence / felt-beat / close-phase pattern, not the original pillow's pre-revision shape).

Step 2 — the session: build R4, the Origin Story Intake — a 1997-set provotype in Era 1. This is a
present-day-composite intake questionnaire a well-meaning adult figure administers, using VERBATIM
period-true wording from van den Aardweg's 1997 "Anamnestic Questionnaire" (The Battle for Normality) —
questions like "Describe your emotional relationship with your father…" and "How did your father regard
and treat you as far as your sexual identity was concerned?", plus the war-toys/dolls play questions
(archive R4-2 has the exact framing). Every answer path is accepted and returns "further support
recommended" — this is a SILENCE failure shape (nothing changes no matter what's answered), not a glitch.
Files: data/provotypes/origin_intake_e1.json (new); reuse src/desktop/apps/provotype.ts unchanged unless
you find a genuine framework gap (if so, STOP and log it under BLOCKED rather than improvising). Invitation
should use the kit/booklet grammar already established for Era 1 (s1_kit idiom) rather than a Restorify-
style app, since this is 1997 and pre-digital. Debrief sources: van den Aardweg's Anamnestic Questionnaire
(status: documentary, high confidence for wording; composite label for delivery context — say so exactly),
plus Love Won Out conference-guide material for the school/family framing (status per what you can verify;
mark [VERIFY SOURCE] if uncertain).

Step 3 — hard rails: this involves a MINOR — gate G7 applies (family surveillance / adult-imposed
questioning of a child). Do not soften this into something an adult chooses for themselves — the minor
status and the adult administering it are load-bearing, not incidental. Failure = silence (per ◆5). All
copy PLACEHOLDER with the standard _doc tag. No score/streak/timer UI. Leave/Pause live from frame one.

Step 4 — verify: npm test + npm run build green; full playthrough at ?flat=1&reinterp=1 on this worktree's
own dev server port; baseline ?flat=1 unchanged.

Step 5 — close out: append to docs/reinterp/01_SESSION_LOG.md, one BUILD_LOG.md line, commit on reinterp.
Report back: files touched, verification evidence, anything routed → FABLE ROUND.
```

### Sonnet 5 — R5, the femininity homework ('16) and the moodboard pass

Both follow the exact same shape as the R4 prompt above. Fable will fill their Step 2 specifics (R5's
scope is in the master plan archive §R5; the moodboard's scope is
`docs/REINTERP_TRANS_REALITY_ERA_VISION_2026-07-03.md` §2) into a fresh copy of this template on request —
ask for either by name next round and a paste-ready version comes back, the same way R4's did here.
