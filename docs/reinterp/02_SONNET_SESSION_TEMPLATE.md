# SONNET 5 SESSION PROMPT TEMPLATE — cost-effective build sessions
STATUS: live

*Fable fills this per session; Sérgio pastes the result into a Sonnet 5 session opened in the WORKTREE
folder (`/Users/sergiogalvaoroxo/update-available-reinterp`). Sonnet performs best with narrow, explicit,
scope-fenced specs — this template front-loads everything so the session never has to infer intent.*

*Standing division of labor: architecture-shaping sessions → Opus 4.8 / Codex. Well-specified content/
data sessions and verification chores → Sonnet 5. When in doubt, ask Fable which lane a session is in.*

---

## TEMPLATE (fill the ⟨brackets⟩, delete these instructions)

You are running ONE build session on the reinterpretation branch of "YOUR UPDATE HAS FAILED."
You are in the worktree `/Users/sergiogalvaoroxo/update-available-reinterp` (branch `reinterp`).
The original project at `/Users/sergiogalvaoroxo/update-available` is READ-ONLY reference — never edit
it, never commit to `main`.

**Step 0 — doc sync:** copy any files matching `REINTERP_*.md`, `CHATGPT_DEEPRESEARCH_*.md`,
`CODEX_PROMPT_REINTERP_*.md`, `docs/reinterp/00_START_HERE.md`, `docs/reinterp/02_SONNET_SESSION_TEMPLATE.md`
from `/Users/sergiogalvaoroxo/update-available/docs/` into this worktree's `docs/` where the original
differs, and commit the sync first. Never overwrite this worktree's `docs/reinterp/01_SESSION_LOG.md`.

**Step 1 — read, in order:** `CLAUDE.md` · `docs/reinterp/00_START_HERE.md` ·
`docs/reinterp/01_SESSION_LOG.md` · ⟨the session's spec doc + exact section⟩ · ⟨any content-source doc⟩.

**Step 2 — the session:** ⟨SESSION ID + one-paragraph scope. Enumerate EVERY file to create/edit with
its path. Enumerate EVERY data key. State what is explicitly OUT of scope, by name.⟩

**Step 3 — hard rails (violating any = revert):**
- Without `?reinterp=1` the piece renders byte-identically to the shipped build.
- No network/storage; in-memory ledger only. Click/tap only — no keyboard/timer/score/streak/win-lose UI.
- ALL display text in `data/` JSON with `_doc: "PLACEHOLDER — Sérgio voice pass pending"` on every new
  string; geometry/layout in `.ts`. Era theme tokens only (`src/desktop/theme/`) — never invent colors.
- Leave/Pause visible from frame one of any new surface, fixed position, always works.
- Real people/orgs only in debrief/provenance data marked `status` + confidence; never player-facing
  outside the panel. No reproduction of real photography.
- Do not decide creative/ethics questions: if the spec is ambiguous, STOP, write the question under
  `BLOCKED` in the session log, and end the session cleanly.

**Step 4 — verify (all required):**
- `npm test` and `npm run build` green.
- Playthrough in the browser at `/?flat=1&reinterp=1` — run the dev server from THIS worktree on a
  separate port (e.g. `npm run dev -- --port 5174`) so you don't hit the main worktree's server.
  Screenshot the key states: ⟨list the exact states to screenshot⟩.
- Baseline check: `/?flat=1` (no flag) shows no new surfaces, no console errors.

**Step 5 — close out:** append to `docs/reinterp/01_SESSION_LOG.md` (what shipped, what's verified,
anything routed `→ FABLE ROUND`); one line in `BUILD_LOG.md`; commit on `reinterp` with a clear message.
Report: files touched, verification evidence, open questions.

---

## Verification-chore variant (even cheaper — no build)
For single-fact checks (URL pinning, citation confirmation, name-collision checks): skip steps 0/2–5,
list the facts to verify with their source docs, require per-fact verdicts
(`confirmed / corrected: … / could not verify`), and have the results written into a dated
`docs/SONNET_VERIFY_⟨date⟩.md` in the ORIGINAL folder — verification notes are planning docs, not build
artifacts. Current queue: the Creed/Lenny app + exact "tiny sheep companion" marketing wording (Round 7);
the Van Loon-style single-citation checks as they accumulate.
