STATUS: live

# Fable 5.2 review — 16 Nov 2026 (T74)

*Sérgio: open a new Claude Code session on your personal account, choose Fable 5.2, in
`/Users/sergiogalvaoroxo/update-available-reinterp`, and paste the one line the orchestrator gave you.
The free Fable reset expires Mon 17 Nov 08:59.*

---

You are **Fable 5.2**, asked by Sérgio Roxo (project lead, UiB Center for Digital Narrative) for an
**outside review** of "YOUR UPDATE HAS FAILED" (the reinterpretation, branch `reinterp`). The work has
been built by a builder session and checked by an orchestrator session, both Opus 5.5. He wants a read
that is **not anchored on theirs**. Disagree with them where the evidence says so.

He wants it to be **really useful**: not only what is wrong, but what would make the piece stronger,
meaning the narrative, the space and the whole experience. The sessions so far have mostly built, fixed
and reconciled. You are asked to **direct**.

**This is a review, not a build.** Write findings and proposals; change no code.

## 0 · Ground rules (binding)

- **Git:** run `git branch --show-current` first; it must say `reinterp`. Never switch branches, never
  commit, never push, never `git add`. Another session works in `~/update-available-uib`: don't touch
  it.
- **You write one file:** `docs/reinterp/FABLE_REVIEW_FINDINGS_2026-11-16.md`. Write it **section by
  section as you go**, so a cut-off still leaves a usable report. The orchestrator commits it.
- **Servers:** if you run the piece, use your own port in 5240–5249 (`--port`), never 5173. Stop only
  servers you started. Long walks take about an hour; prefer existing evidence first (below).
- **Privacy:** no web search containing the project's name or Sérgio's name. Don't download or install
  anything without asking him. Don't use online chatbots.
- **Words he owns:** dossier phrasing, the Lexicon's close lines and every `_s` line are his. Report
  on them; never rewrite them.
- **The laws:** `CLAUDE.md` (it outranks other docs) and `docs/ETHICS_CONSTRAINTS.md`. His corrections
  are in the memory folder `~/.claude/projects/-Users-sergiogalvaoroxo-update-available/memory/`: read
  the files whose frontmatter says `type: feedback`. Where one disagrees with `CLAUDE.md`, `CLAUDE.md`
  wins (for example, the writing is now Claude's, 17 Aug).
- **Which docs are current:** `docs/reinterp/TODO.md` is the one live list. `00_WHERE_THINGS_STAND.md`
  dates from 5 Sep and is stale. Before trusting any doc, check its `STATUS:` line.
- **Look, don't only read.** This project's main defect class is content that exists and cannot be
  met by a visitor. A finding about what a visitor sees must cite a frame, a measurement or a walk
  line, not source alone.
- **He may paste a note while you work** (for example what he saw in the Quest). Fold it into the
  right section.

## 0.5 · How to spend your allowance

- The free allowance ends **Mon 17 Nov 08:59**. Plan for it to run out before you finish.
- Order: **§1** (about a quarter of your effort: a decision memo, not a build), then **§2** (the main
  part), then **§3** only if allowance remains.
- Write each section to the findings file as soon as it is done.
- Use helper subagents on a cheaper model (Sonnet) for mechanical work: extracting frames, listing
  files, counting words, grepping. Keep the looking, the judging and the writing for yourself.
- **Look at many pictures and hold the whole piece at once.** That is what the earlier reviewers could
  not do in one sitting.

## 1 · First, his technical questions

His words (16 Nov): *"Is there another [3D engine] we should use? have you consider that? also is the
Drawcalls fixable with another 3D engine? I have a Unity Education Grant License."* And, on hearing
that PlayCanvas exposes WebXR layers only in WebGPU mode: *"wait but this isnt compatible with us? are
we using an old PlayCanvas version?"* He also sent two links to assess:
https://github.com/Srile/webxr-to-native and https://meta-quest.github.io/immersive-web-emulation-runtime/

**The problem:** text in the Quest is serrated and hard to read unless very close (TODO T09, open since
early Nov). Nothing has yet been confirmed on a real Quest.

**What exists, all in the repo:**
- `docs/reinterp/IDEAS_XR_TEXT_2026-11-12.md`: pixels-per-degree measurements, ranked ideas, and in §4
  a four-step staged Quest test for a compositor quad layer on the 1997 monitor (not built).
- `docs/reinterp/CODEX__REPORT_2026-11-02.md`: why WebXR layers clear `baseLayer`, which PlayCanvas's
  WebGL XR bridge needs.
- `src/frame/xrMonitorQuad.ts` + `tools/patch-playcanvas-xr.mjs` (the patched attempt: `?quad=1` went
  black on his Quest, 10 Nov; `HEADSET_TRIAGE_2026-11-10.md` §0); `src/frame/xrTextures.ts`;
  `src/engine/app.ts` (the `XRWebGLLayer` replacement for MSAA and scale, around lines 675–695).
- `docs/reinterp/CODEX_XR_TEXT_REPORT_2026-11-08.md`; TODO rows T09, T10, T57, T58, T69.
- Installed PlayCanvas 2.19.6 (`node_modules/playcanvas`); npm's latest is 2.24.1.

**What the piece must stay:** one scene, three look-modes, all first-class:
1. immersive WebXR on Quest 3;
2. the browser with drag-to-look;
3. the phone and tablet with gyro-to-look. **iOS has no WebXR, so for every Apple device except Vision
   Pro, mode 3 is the experience.**

It is a static GitHub Pages build with no runtime network calls and no storage (`CLAUDE.md`
invariants). Quest budget: ≤75 draw calls and a 72 Hz floor. The latest measurements put every headset
look at ≤63 draw calls, with one moment of 214 during the 2016→2026 era change (LambyVision v6 page
and BUILD_LOG S396).

**Answer, with evidence and an honest estimate of cost:**
1. Is the four-step quad-layer test (IDEAS §4) the right next step? Is its design right? What would
   you change?
2. Within PlayCanvas: is a WebGL projection-layer path feasible by patching the WebGL XR bridge? What
   would upgrading 2.19.6 → 2.24.x change? Is WebGPU mode usable for visitors on Quest Browser today,
   and what would it break for desktop and phones?
3. Other engines: three.js, Babylon.js, Unity (his Education licence: WebGL + a WebXR export, or a
   native Quest app), and the two links. For each: sharpness, draw calls, the three look-modes (above
   all iPhone), the static/no-network invariants, and the rewrite cost given this codebase. About 45 of
   194 `src` files import PlayCanvas; `src/desktop/` is the 2D screen layer.
4. Draw calls: is the current approach sound? What would remove the era-change spike?
5. **Your recommendation**, and what only a real Quest can settle.

## 2 · Then the piece itself: a director's pass (the main part)

Judge the piece **as a visitor meets it**, then **propose**. Stay inside `CLAUDE.md` and the ethics.

**The intent (read before judging, so you can see where the build drifted):**
- `docs/PROJECT_ONE_PAGER.md`
- `docs/PRODUCTION_SCRIPT_v0.3.md` and `docs/SCRIPT_UPDATE_v0.4.md` … `v0.8.md`
- `docs/REINTERP_RESTRUCTURE_R28_2026-07-10.md` (the reinterpretation's plan of record)
- `docs/reinterp/CADENCE_STUDY_2026-10-10.md` (a draft), `OPENING_NOTES_2026-10-15.md`,
  `RESTRUCTURE_1997_2003_2026-10-31.md`
- `docs/reinterp/SCRIPT_VS_BUILD_2026-08-21.md` (an older promise-vs-build audit; check what is still
  true)

**The evidence (no walk needed):**
- The latest walk, 16 Nov, entrance → the Restart page:
  `research/article-images-2026-11-16/s397-menu-line/walk-30cc0d9f/WALK_2026-11-16_SPEEDRUN_GUIDED.md`
  (its "MINUTES PER ERA" table gives the timings) plus its `TEXT_CENSUS_*`.
- Photos: `research/article-images-2026-11-16/` (job 28, the Lamby sets in three modes, the era
  sites).
- The three v6 teaching tapes, about 2 minutes each. Find them through `data/room/teaching_tapes.json`;
  their plan is `docs/reinterp/TEACHING_TAPES_V4_PLAN_2026-11-15.md` and the research is
  `RESEARCH_TRANS_CAUSES_1997_2026_2026-11-15.md`. To watch, extract frames (`ffmpeg`, 1 fps) and read
  the `captions.vtt`.
- `docs/reinterp/VISUAL_REVIEW_2026-11-12.md` and `docs/reinterp/ARTICLE_COMPANION_2026-10-31.md`.
- To photograph more yourself: `tools/stills.mjs` (pass your own `--port`). Photograph the headset
  and phone views too, not only the computer.

**A · The visitor's arc**
1. The first 60 seconds; each era's first and last minute; the era changes; the Close. Where does
   attention rise, and where does it drop? Is the length of a visit right?
2. Does each era (1997, 2003, 2016, 2026) say one clear thing, and does the visitor feel it?
3. Where does the piece explain instead of show? Where does it show something no visitor will meet?

**B · The space**
4. The three rooms that age across 30 years; the turn (the piece's one bodily ask); the seats and the
   sends; light, colour and sound. Does the space carry the story, or does it only hold the screens?
   Judge each look-mode: headset, computer, phone.
5. The rule "never require the visitor to look" (`CLAUDE.md`, R28 amendment 1). Where does a beat still
   depend on a look? Where does taking the visitor there feel forced?

**C · The laws and the facts**
6. Any breach of the tone laws: satire outside perpetrator self-presentation, the clinical debate
   satirised, a `felt` or `respite` scene touched by the system, invented testimony, a real person?
7. Period truth: anything anachronistic in the software, devices or language of each era?
8. The Close: do its claims match their sources and their `documentary | contested | speculative`
   status? Spot-check at least ten.

**D · Proposals**
9. For each era: its strongest moment (to protect), its weakest (to cut or change), and one addition.
10. **Three bold proposals:** larger changes that would make the piece stronger, not bound by the
    current plan. For each: what the visitor would experience, why it is better, what it replaces, the
    cost in days of building, and the risk.
11. Where the build drifted from the intent: was the drift for better or for worse?

## 3 · If allowance remains: code health

A short pass: the riskiest modules, dead code from superseded designs, and checks that pass while
proving nothing. Ten findings at most.

## 4 · The report's shape

`docs/reinterp/FABLE_REVIEW_FINDINGS_2026-11-16.md`:
- **§1** answers Part 1's five questions, recommendation first.
- **§2** opens with a one-page **director's note**: what the piece is now, and what it could be. Then
  findings A–C, then the proposals D.
- **§3** code health.
- Each finding gives what you found, the evidence (frame path, measurement, `file:line`, walk line),
  its severity (blocks a visitor / weakens the piece / polish), a suggested fix, and whether it needs
  **his** call (ethics, his words, a change of direction) or can simply be built.
- **End:** the ten most important findings and proposals ranked, and the outline of one build job for
  the builder (only what needs no call from him; list his calls separately).

Plain, short sentences: Sérgio is dyslexic and reads this himself.
