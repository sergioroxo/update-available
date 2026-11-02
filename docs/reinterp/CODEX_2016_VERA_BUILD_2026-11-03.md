STATUS: live

# Codex prompt — rebuild 2016 around Vera (his yes, 3 Nov 2026)

*Paste everything below the line into a NEW Codex chat.*

---

Repository: /Users/sergiogalvaoroxo/update-available-reinterp (PlayCanvas + Vite + TypeScript browser/WebXR narrative
piece "YOUR UPDATE HAS FAILED"). `git fetch && git checkout -b codex/vera-2016 origin/reinterp`. Read CLAUDE.md and
docs/ETHICS_CONSTRAINTS.md first — they bind you (invented marks only; no real people; 2016 is dedicated to the lesbian
story, no Daniel footage; registers operable/felt/respite — Lambient never in felt or respite scenes, respite never a
trap; no free text, no timers that punish; one press per beat; colours only from src/desktop/theme/*; ≤75 draw calls;
every docs/**.md starts with `STATUS:`; one BUILD_LOG.md line (next session number); explicit `git add` paths, never
-A; never stage README.md). Do not push.

**The design (approved):** docs/reinterp/RESEARCH_2016_VERA_APPARATUS_2026-11-01.md — read all of it. Also
docs/reinterp/STORIES_VERA_MAYA_2026-10-31.md §3 and §8 (his rulings: V2 her own testimony "if well done"; Nuala a
former partner, NO clothing as memory objects; objects allowed), docs/reinterp/RESEARCH_DYKAS_MODEL_2026-11-01.md
(the "Tree Model" ideas), docs/reinterp/WEAPONISED_CARE_NOTE_2026-11-01.md (the spine: injury judged → correction
offered → testimony used as evidence).

**His three calls:** NO "trans as trigger" metrics row; KEEP the optional "Take my story down" press (it shows the
copies and the retained original; it undoes nothing); FIRST check the marks "Story Record", "Freedom to Choose",
"Story Steward" with a web search for real products/ministries of those names — replace any that collide with a new
invented mark and say so in the report. No "trigger-safe" mode in 2016.

**Build the 8 beats** in the 2016 workstation and phone (src/room/graceQueueLite.ts, src/desktop/apps/phoneE3.ts,
data/dialog/s3_*.json, data/strings/map.json e3 beats, data/strings/lambyGuide.json e3 steps,
src/witness/map.ts conditions): "Story Record" replaces the contributor tools and is offered before Malta; installing
it opens Vera's own 2014 story ("as sent" against "as published"); Nuala's thread (felt) and The Wick (respite: a mug
and a stamp card on Vera's desk — they replace the pen that did nothing; data/room/reinterp_deltas.json r3) ; Malta
breaks the system by outnumbering it; the optional take-down press. Keep the existing jobs that still serve the
pipeline; cut the contributor-tools changelog and anything that carries no person. Write the text yourself, lesbian-
specific and plain; finish it (no placeholders). Keep the glow logic working (src/witness/pathGlow.ts and the
workstation's `stepTargets`).

**Verify:** `npx tsc --noEmit -p .`, `npm test`; start Vite on port 3112
(`npx vite --port 3112 --strictPort &`) and photograph every 2016 beat with puppeteer-core (Chrome at
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless, args ['--enable-unsafe-swiftshader',
'--use-gl=angle','--no-sandbox','--disable-audio-output']; load `/?reinterp=1&kiosk=0&era=3&debug=1&descent=0&home=0`,
press via the surfaces' published hits) into out/tour-e3-v2/; look at the frames and fix what reads badly. Then the
full walk: `node tools/walk.mjs --port 3112 --max 2600 --require-close` must reach the Close (update the walker's e3
policy if the new presses need it). Write docs/reinterp/ERA3_V2_BUILT_<date>.md (STATUS: live): the sequence as built
with its on-screen text, what was cut, the mark check, open questions.

Reply with: branch, commits, whether the walk reached the Close, a 10-line plain summary (short sentences; the lead is
dyslexic), and the 6 best frames.
