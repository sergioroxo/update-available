STATUS: live

# Cloud prompts 11–15, filled in and ready to paste (2026-10-15)
*One new cloud session per block (claude.ai/code, repo sergioroxo/update-available). Set the model and effort shown before pasting.*

## F3 — Sonnet 5.5 · high

```
SETUP FIRST: git fetch origin reinterp && git checkout -B cloud/F3 origin/reinterp && npm ci
Chromium: /opt/pw-browsers. Dev server if needed: npx vite --port 3000 --strictPort (background).
Read CLAUDE.md first and obey it (display text in data/strings/ and data/dialog/; never touch `_s` lines or dossier
text; shorten never delete; no network; no storage).
TASK: 1997: less reading (W1-B1). Do for Era 1 (data/dialog/s1_*.json, the 1997 desktop's strings in data/strings/) exactly what docs/reinterp/TEXT_CHANGES_2016_F2_2026-10-15.md did for 2016: shorten lines (never delete a line), keep every fact and every documented phrase, leave felt scenes and `_s` lines, the prayer's lyrics and the tapes' lyrics untouched. Report words per surface before/after and EVERY changed line as a numbered BEFORE/AFTER list. Check: npx tsc --noEmit, npm test, node tools/walk.mjs --port 3000 --max 1400 --one-era.
DELIVER: commit on cloud/F3 with explicit paths (never `git add -A`), message "CLOUD: F3 — …" ending with
Co-Authored-By: Claude <the model you are> <noreply@anthropic.com>; write out/F3/REPORT.md and use it as the PR
description; open a pull request into reinterp titled "F3 — DO NOT MERGE (review)". Never push to reinterp.
```

## F4 — Sonnet 5.5 · high

```
SETUP FIRST: git fetch origin reinterp && git checkout -B cloud/F4 origin/reinterp && npm ci
Chromium: /opt/pw-browsers. Dev server if needed: npx vite --port 3000 --strictPort (background).
Read CLAUDE.md first and obey it (display text in data/strings/ and data/dialog/; never touch `_s` lines or dossier
text; shorten never delete; no network; no storage).
TASK: 2026: less reading (W1-B1, F-rows). The same for Era 4 (data/dialog/s4_*.json, data/strings for GraceOS, L, the browser and its six tabs, the Commons). L's voice stays L's; the clinical-debate lines (ETHICS: both captions, unresolved) are NOT shortened. Report as F3. Check: tsc, npm test, node tools/walk.mjs --port 3000 --max 2600 --require-close.
DELIVER: commit on cloud/F4 with explicit paths (never `git add -A`), message "CLOUD: F4 — …" ending with
Co-Authored-By: Claude <the model you are> <noreply@anthropic.com>; write out/F4/REPORT.md and use it as the PR
description; open a pull request into reinterp titled "F4 — DO NOT MERGE (review)". Never push to reinterp.
```

## R1 — Haiku 5.5 · medium

```
SETUP FIRST: git fetch origin reinterp && git checkout -B cloud/R1 origin/reinterp && npm ci
Chromium: /opt/pw-browsers. Dev server if needed: npx vite --port 3000 --strictPort (background).
Read CLAUDE.md first and obey it (display text in data/strings/ and data/dialog/; never touch `_s` lines or dossier
text; shorten never delete; no network; no storage).
TASK: Update the walkthrough register docs/reinterp/WALKTHROUGH_1_2026-10-08.md: for every row still marked `open`, find in BUILD_LOG.md (and docs/reinterp/PLAN_ENTRANCE_RESTORE_SESSION_2026-10-13.md) whether it was built since 2026-10-08, and if so set its status to `BUILT S<n>: <one-line what>` citing the BUILD_LOG session; leave genuinely open rows open; add a section at the end 'Still open after the opening (2026-10-15)' listing them. Docs only — no code. Check: npm test.
DELIVER: commit on cloud/R1 with explicit paths (never `git add -A`), message "CLOUD: R1 — …" ending with
Co-Authored-By: Claude <the model you are> <noreply@anthropic.com>; write out/R1/REPORT.md and use it as the PR
description; open a pull request into reinterp titled "R1 — DO NOT MERGE (review)". Never push to reinterp.
```

## H1 — Sonnet 5.5 · medium

```
SETUP FIRST: git fetch origin reinterp && git checkout -B cloud/H1 origin/reinterp && npm ci
Chromium: /opt/pw-browsers. Dev server if needed: npx vite --port 3000 --strictPort (background).
Read CLAUDE.md first and obey it (display text in data/strings/ and data/dialog/; never touch `_s` lines or dossier
text; shorten never delete; no network; no storage).
TASK: Write docs/reinterp/HEADSET_CHECKLIST_2026-10-19.md (STATUS: live) for the lead's first Quest 3 check on Mon 19 Oct: read README.md, CLAUDE.md (the Quest budget: ≤75 draw calls, 72 Hz), src/room/restoreEntrance.ts (stars, the floating setup window), src/desktop/home/homeXr.ts, src/frame/xrInput.ts, src/frame/xrFrame.ts, the Library (src/room/closeMonitor.ts) and the advert in the setup; produce a numbered checklist in plain language (what to do, what to look for, what counts as a fail, where to write the note), grouped: entering VR, the stars and title, the setup window + Lamblippy + the advert (sound, readability), the room arriving, each era's key moments, the specks, the Close and the Library, comfort (turns, flights), performance (how to read the debug FPS), leaving. Docs only. Check: npm test.
DELIVER: commit on cloud/H1 with explicit paths (never `git add -A`), message "CLOUD: H1 — …" ending with
Co-Authored-By: Claude <the model you are> <noreply@anthropic.com>; write out/H1/REPORT.md and use it as the PR
description; open a pull request into reinterp titled "H1 — DO NOT MERGE (review)". Never push to reinterp.
```

## W1 — Sonnet 5.5 · medium

```
SETUP FIRST: git fetch origin reinterp && git checkout -B cloud/W1 origin/reinterp && npm ci
Chromium: /opt/pw-browsers. Dev server if needed: npx vite --port 3000 --strictPort (background).
Read CLAUDE.md first and obey it (display text in data/strings/ and data/dialog/; never touch `_s` lines or dossier
text; shorten never delete; no network; no storage).
TASK: Fix the walker's from-era-4 shortcut: `node tools/walk.mjs --port 3000 --max 900 --from-era 4 --require-close` stalls with 'GOING NOWHERE: 45 presses without the era advancing' in Era 4's six-tab loop on every build (the full walk from the start reaches the Close fine). Find why the `?era=4` boot leaves the walker in a loop (compare the state a full walk arrives with) and fix the walker (tools/walk.mjs) or the review boot — never the piece's audience path. Check: that command reaches the Close; the full walk still does.
DELIVER: commit on cloud/W1 with explicit paths (never `git add -A`), message "CLOUD: W1 — …" ending with
Co-Authored-By: Claude <the model you are> <noreply@anthropic.com>; write out/W1/REPORT.md and use it as the PR
description; open a pull request into reinterp titled "W1 — DO NOT MERGE (review)". Never push to reinterp.
```
