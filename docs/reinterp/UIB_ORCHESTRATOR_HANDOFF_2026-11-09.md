STATUS: live

# Handoff (LIVE from 9 Nov evening): the UiB session becomes the orchestrator (9 Nov → Sat 14 Nov 2026)

*Sérgio's personal account is at 78% of its week. Until Saturday 14 Nov the UiB (Enterprise) session leads. The
personal session is kept for emergencies only.*

## Where you work now

Open the UiB terminal in the MAIN folder, which you now run:
`cd ~/update-available-reinterp && CLAUDE_CONFIG_DIR=~/.claude-uib claude`

You are on branch `reinterp`; GitHub Pages deploys every push. Before each commit, run `git branch --show-current`
(Codex has switched branches in this folder before).

## How the orchestrator works (keep doing it this way)

- **The list:** docs/reinterp/TODO.md, the one list. Tick rows with the session number, move done items down, add
  his new notes as rows. TRACKER.md is history.
- **Build log:** one line in BUILD_LOG.md per session. The next number is S345 (UiB job 4) and then S346 for you.
- **Big builds go to branches:** a worktree (`git worktree add -b <branch> ../<folder> origin/reinterp`, symlink
  node_modules), or a sub-agent with worktree isolation. The orchestrator merges.
- **Merging:**
  - First set his README aside, because README.md is his and holds uncommitted edits:
    `git stash push -m <tag> -- README.md`.
  - Then `git merge --no-ff --no-commit origin/<branch>`, then `git checkout HEAD -- README.md`.
  - Resolve BUILD_LOG.md conflicts by keeping both sides.
  - Then `node tools/gen_era_sites.mjs`, `npx tsc --noEmit -p .` and `npm test`. Commit, then apply and drop the
    stash by its tag.
  - Never `git add -A`. Never stage README.md.
- **The full walk after every merge**, the regression gate:
  - Start Vite detached: `nohup npx vite --port 3141 --host 127.0.0.1 &`.
  - Then `caffeinate -i node tools/walk.mjs --port 3141 --max 2600 --require-close` in the background.
  - It must print "✓ reachability: the walk reached the Close".
  - **Never edit src/ or data/ while a walk runs.** It reloads the page and breaks the walk; this happened on 8 Nov.
  - Watch for `PAGE NOTE [e3] …` lines: they are 2016 stall diagnostics.
  - Branch builders walk only their own era (`--from-era N --one-era`). The full walk is yours.
- **itch ZIP** when he asks: `npm run build:itch && python3 tools/package-itch.py <date>`. Then load the unzipped
  folder in a sandboxed iframe (out/probes/zipload.mjs) and check for no errors and no requests to other hosts.
- **Him:** dyslexic, so short plain replies with numbered questions. He decides ethics and wording that is his
  (`_s` lines). The writing is Claude's. Read MEMORY.md (shared): his rulings live there and in
  docs/reinterp/DESIGN_* files.
- **Codex** works on this machine too, with low quota: small jobs only. Its prompts must use `git worktree add`, and
  it walks only its own era.

## ⚑ LIVE FROM 9 NOV (evening), Sérgio's decision

The personal session is at 88% of its week. It stays for talking ideas through with him, not for building or
merging. **You now orchestrate.** Run in ~/update-available-reinterp (the main folder). The ~/update-available-uib
worktree is free for builder sub-jobs, or use sub-agents with worktree isolation, on model sonnet unless a task
truly needs Opus.

### State when you take over
- `reinterp` includes UiB jobs 1–7 (S339–S348), all merged.
- The personal session started a full walk after job 7 (port 3141). If `git log` shows no "S348 (walk)" line in
  BUILD_LOG.md, run the full walk yourself first.

### Your queue, in order (none of this needs the headset)
1. **The full walk after job 7.** If it fails, fix it, then walk again.
2. **The itch ZIP**, rebuilt from the walked build:
   - run `npm run build:itch && python3 tools/package-itch.py <date>`;
   - unzip it into a scratch folder and load it in a sandboxed iframe with out/probes/zipload.mjs (serve it with
     `python3 -m http.server 3130` from that folder, and kill any old server on 3130 first);
   - there must be no errors and no requests to other hosts;
   - tell him the path and size. He uploads it to itch himself.
3. **T12, "which build is the Quest running?":** show the short git commit and the build date on the game menu's
   About/credits line and on the debug plate, so he can see at a glance whether the headset loaded today's build.
   Inject it at build time with Vite `define` (no network). Then he never tests an old build by mistake again
   (this happened on 8 Nov).
4. **T58:** add "struggler" to the Lexicon at the end (data/strings/lexicon.json, in its own format; see 1997's
   Root Cause glossary for the definition pair).
5. **T44, the visual culture of 2016 and 2026** (1997 and 2003 got their pass in jobs 1–3). This is for his article
   on visual culture: each era's OS and apps should look like their time.
   - 2016: GracePlatform and the Handset Window in the flat "material/iOS 7" idiom of 2016.
   - 2026: Kettle, the browser and the bot in today's soft, rounded, AI-assistant idiom.
   - No real marks, colours only from the theme.
   - Photograph before and after from the seat.
6. **T54, Noa in 2026 (a proposal only, no build):** write docs/reinterp/DESIGN_NOA_2026_2026-11-09.md
   (`STATUS: draft`). Use 2 or 3 options for where Noa (the trans woman whose story was 2016's, now retired there)
   could appear in 2026. She is a different person from Maya (guard 1). Possible places: the "someone who went back"
   recording, a viewer in the fundraiser stream, the bot's "stories" page. For each option, give what it adds, its
   risk, and its cost. He picks.
7. **Before any account switch or big milestone,** refresh the conversation archive:
   ~/Documents/YUHF-conversations-archive/<date>/ (see the memory note conversation-archive.md). Make three tar.gz
   files (personal ~/.claude/projects/*update-available*, UiB ~/.claude-uib/projects/*update-available*, and the
   Codex sessions mentioning the project) plus a README.
8. **When he sends a headset report,** turn it into TODO rows, then into jobs.

The old "Open now" list below is history; items 2 and 3 there are done (UiB jobs 5–7).

## Open now

1. UiB job 4 (UIB_JOB_4_2026-11-09.md) is running in ~/update-available-uib on `uib/work`. Merge it when he passes
   its summary.
2. **Yours next: T08, the era changes.**
   - No fades to black anywhere, before or after an era.
   - Remove the dollhouse (his ruling: "we just remove the dollhouse, we add that to the research"). It's already in
     ARTICLE_COMPANION §7g.
   - The era change gets an install sound with music, more time, and a morph into the new room instead of a fade.
   - Desktop and headset both. Look at src/frame/xrLayer.ts (the dollhouse), src/frame/xrComfort.ts (the particle
     veil) and the desktop transition in src/engine/app.ts.
3. **Desktop, his 9 Nov notes:**
   - **(a) Straight lines from any angle (NOT a camera change).** When he moves and sees a screen at an angle, in the
     headset or on the computer, lines and letters break into stair-steps ("Welcome back, Daniel" in Profile setup).
     The view must stay free.
     - The cause is the screens' `FILTER_NEAREST` sampling (CLAUDE.md's pixel law).
     - The fix, which he approves for SCREENS only (9 Nov): sample the screen canvases with mipmaps and anisotropic
       filtering (linear-mipmap, max anisotropy the device allows), so edges stay straight at oblique angles. The
       canvases are already drawn at 3×, so head-on text stays crisp.
     - The 3D room's own textures keep `FILTER_NEAREST`.
     - Codex's density table in CODEX_XR_TEXT_REPORT_2026-11-08.md has the numbers; src/engine/screenTexture.ts and
       src/frame/xrTextures.ts are where the screen textures are made.
     - Uploads stay on-change only. Check that the mip chain is rebuilt on each upload.
     - Photograph a monitor at 0°, 30° and 60° before and after.
     - Add one line to CLAUDE.md's Aesthetic laws noting the screens-only exception, dated 9 Nov.
   - **(b)** Add the team skip on the computer too, debug builds only (`?debug=1`): press the N key ten times within
     5 s to jump to the next year. It mirrors the headset's 10× B/Y (S340, src/engine/app.ts, search "TEAM'S SKIP").
     Visitors' builds never have it.
4. Later: T54 (where Noa appears in 2026; ask him); T57, T09 and T10 (his headset tests); a headset session using
   docs/reinterp/PROMPT_CAST_WATCH_2026-11-08.md.

## The last state

- `reinterp` is at 678aa760 or later.
- The UiB jobs 2 and 3 merge (S344) is being walked by the personal session right now. If you start before it
  reports, run the full walk yourself first.
