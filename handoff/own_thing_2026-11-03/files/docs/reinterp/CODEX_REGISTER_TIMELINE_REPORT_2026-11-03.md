STATUS: live

# Register timeline diagnostic

Branch: `codex/register-timeline`, created from freshly fetched `origin/reinterp`.

Added `tools/register-timeline.mjs`: run with Node from any working directory;
`--md` also writes `docs/reinterp/REGISTER_TIMELINE_2026-11-03.md`.
The compact Markdown printout and console output cover all four eras in
`data/strings/map.json` order, including optional and full-cut beats. They show
register symbols/counts, longest known operable run, first known person-beat
index, operable:person ratio, quiet indices and every unknown beat. Counts
measure map beats, not elapsed time; optional routes are not a single playthrough.

The diagnostic reads structured register fields in provotype/dialog JSON;
it does not interpret register descriptions in `_doc` prose. Two identity joins
are verified against `src/witness/map.ts`: `formDone` → `origin_intake_e1` and
`pillowDone` → `pillow`. Both obtain `operable` from their provotype data.
Other source records join only by exact era-qualified ID or a matching ID and
era. Conflicting/unsupported registers remain unknown. Schema/dummy files are
excluded. Registered records with no safe map join are listed separately.

**Finding: 68 beats; 2 known operable and 66 unknown.** Dialog files currently
have no structured `register` fields. Quiet does not distinguish felt, respite
and other silent scenes. Even the update beats remain `?` without a register.
No missing classification was supplied, including in E3. In particular the
unjoined old `e4_ball` respite record was not assigned to the current stream.
The report therefore exposes a metadata gap; it cannot yet establish the
person/system rhythm. Unknowns interrupt known operable runs, so run lengths
are lower bounds and ratios/first-person positions are incomplete.

Added the command to the existing README Run command list, preserving its
pre-existing edits. README is intentionally excluded from the commit. No
runtime/bundle imports, narrative data or player-facing text changed.

Checks passed:

- `node tools/register-timeline.mjs` and `--md`: all four eras and unknown lists.
- `node --test tools/register-timeline.test.mjs`: missing metadata, quiet flags,
  transition symbols, run boundaries, ratios/indices, joins, era isolation,
  documentation exclusion and conflicts.
- `npx tsc --noEmit -p .` and `npm test`.
- `npm run dev -- --host 127.0.0.1 --port 3236 --strictPort`: Vite started;
  server stopped after the smoke check.

Sérgio's decision: approve a separate structured-register authoring pass and
the current beat-to-source associations before using this as a rhythm verdict.
No ethics classification or survivor-adjacent wording was authored here.
No headset pass is required for this offline tool; no headset testing is claimed.
Build log uses S307, following the highest existing session S306 (the last
physical entry is an out-of-order S293). No push performed.
