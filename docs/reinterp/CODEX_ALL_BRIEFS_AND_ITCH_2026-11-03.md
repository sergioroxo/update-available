STATUS: live

# Codex prompt — all the briefs, then the itch.io festival build (3 Nov 2026)

*Paste everything below the line into a NEW Codex chat.*

---

Repository on GitHub: sergioroxo/update-available, branch `reinterp` (PlayCanvas + Vite + TypeScript browser/WebXR
piece "YOUR UPDATE HAS FAILED").

**IMPORTANT — work in your OWN folder.** The folder /Users/sergiogalvaoroxo/update-available-reinterp is used by
another agent; never run `git checkout` there. Create your own worktree:
`cd /Users/sergiogalvaoroxo/update-available-reinterp && git fetch origin && git worktree add -b codex/festival ../codex-festival origin/reinterp`
then work only in /Users/sergiogalvaoroxo/codex-festival (symlink node_modules from the main folder:
`ln -s ../update-available-reinterp/node_modules node_modules`). Check `git log --oneline -3` shows
"Prompts: Codex 2016 Vera build" (f9f3f011) or later — it contains S293, the 2026 v2 build.

Read CLAUDE.md first — its laws bind you (no runtime network calls; no storage of input; colours only from
src/desktop/theme/*; click/tap only; ≤75 draw calls; uploads on change only; every docs/**.md starts with `STATUS:`;
one BUILD_LOG.md line per task (sessions S307 onward); explicit `git add` paths, never -A; never stage README.md).
Commit after each task. Push the branch `codex/festival` at the end (not `reinterp`).

**Part A — the briefs, in order** (all in docs/reinterp/CODEX_BRIEFS_2026-11-02.md; brief 1, quad layers, is DONE —
blocked by PlayCanvas, see docs/reinterp/CODEX__REPORT_2026-11-02.md — skip it):
1. Brief 3 — one voice at a time, everywhere.
2. Brief 2 — playing the handheld games with hands.
3. Brief 4 — the dollhouse builds the next room + a "Dollhouse" row in the headset menu.
4. Brief 5 — the full walk: start Vite on port 3113 from your folder, `node tools/walk.mjs --port 3113 --max 2600
   --require-close`; it must reach the Close; fix stalls at their cause; commit the WALK report. Run it AFTER 1–3.
After each: `npx tsc --noEmit -p .` and `npm test` must pass.

**Part B — the itch.io festival build for CPH:DOX** (today): follow docs/reinterp/CODEX_ITCH_CPHDOX_2026-11-02.md
exactly, but on your `codex/festival` branch so it includes Part A. There is earlier itch work on the local branch
`codex/itch-cphdox` (commit 2800da1e "Verify festival playtest fixes…") — look at it, keep what is good
(cherry-pick its commits onto codex/festival if they apply), and drop anything that only duplicates this prompt.
Produce the zip in release/ (gitignored), the doc docs/reinterp/ITCH_CPHDOX_2026-11-02.md with the exact itch.io
settings (HTML project, the zip "played in the browser", viewport, fullscreen button, Visibility → Restricted →
password — itch's own setting, never a password in the repo), and the juror notes.

**Reply with:** the branch, each task's commit, whether the walk reached the Close, the zip path/size/file count, and
a 12-line plain summary (short sentences; the lead is dyslexic) including the itch.io settings to choose.
