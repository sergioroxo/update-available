# W1 — walker `--from-era 4` stall (DO NOT MERGE — review)

## Result
`node tools/walk.mjs --port 3000 --max 900 --from-era 4 --require-close` now **reaches the Close** (101 presses, "spine: done, Library showing on Daniel's monitor"). Before: `GOING NOWHERE: 45 presses without the era advancing` (~step 118) on every build.

## Cause
`?era=4` boots with the seat looking at the desk, so the **laptop and monitor are off-screen**. In `tools/walk.mjs`, `turnable()` returned only the single *nearest* off-screen control, and the caller then refused it because it had already been turned to in that state. After the laptop and the monitor had each had their one glance, the headset (third nearest, and the only way on once Era 4's five-step program is done) was never considered. The walker kept pressing the browser's six tabs. Measured at the stall: browser `mode=program`, last step, turn answered, `programDone` true, headset published but off-screen at x≈-831. A full walk arrives with the laptop/monitor already in frame, so it never hit this.

## Change (tools/walk.mjs only; piece and audience path untouched)
- `turnable()` now excludes candidates already in `turnedFor` for the current state, so the next-nearest off-screen control is tried.
- Diagnostic: the probe records the browser program state (`bstate`) and the `GOING NOWHERE` note includes it.

## Verification
- `--from-era 4 --max 900 --require-close`: reaches the Close. ✓
- Full walk from the start (`--max 2000 --require-close`): **not confirmed in this environment.** It stopped in Era 1 (`GOING NOWHERE`, looping `web-ring:next`, 231 presses) with this change, with **no head turns taken**. The unmodified `reinterp` walker, run the same way, stops at the same place (268 presses), so this is **not caused by this change**; it looks environment/timing-dependent and is left for a separate look. The committed `docs/reinterp` full-walk report on `reinterp` shows a pass (563 presses, reached e4).
- I did not commit regenerated `docs/reinterp` walk outputs.

## Not done
- Full walk reaching the Close here (see above).
- BUILD_LOG/README lines: tooling-only change; add if wanted.
