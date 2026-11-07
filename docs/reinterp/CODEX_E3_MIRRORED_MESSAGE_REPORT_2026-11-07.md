STATUS: live

# E3 mirrored message — 7 November 2026

Branch: `codex/e3-mirrored-message`, based on `origin/reinterp` at `32dc6914`.
Worktree: `/Users/sergiogalvaoroxo/codex-e3-message`; dependencies symlinked from the main worktree.

## Scope and decisions

Built the explicitly requested 3 November Brief 8 core, then (a), (b), (c), using Sérgio's 7 November decisions in this chat. The fetched branch marks that brief superseded by `CODEX_BRIEF8_PHONE_MIRROR_2026-11-07.md`. The explicit task here takes precedence: this branch implements the sign-in notice, not PocketPane or that replacement brief's evening, mentor, or focus-mode scenes.

S317 still puts `signin` first, before `consent` and platform work. Its SisterSignal screen retains “Welcome back, Vera.” The notice is a separate lower-right card after the existing surface painter. It does not occupy Lambient's lane or cover Sign in. Both normal arrival and `settleArrival()` arm it once. Its exact Orla text is shared with the phone lock card and thread. There is no extra desktop layer, mode, light, entity, or geometry.

The Lamb mark, guide, glow, Start-map guidance and getting-started helper are silent during the notice and personal thread. The same quiet gates cover held Notes and Photos. Desktop misses pass through; Sign in, Start and minimise act on that release. Opening, dismissing, picking up the phone, era navigation and restart clear the desktop notice. Pausing preserves it. Its phone lock card remains unread until read or superseded by Malta's existing `arm()`. Nothing expires or repeats on a clock. The required group stays visible on every inbox page. The first entrance walk exposed that paging could otherwise hide Malta; that fix was folded into the core commit before the rerun. Both surfaces use `PhoneE3`'s thread painter and read state; the desktop back chevron and close control work.

## Independent build commits

| Increment | Commit | Result |
| --- | --- | --- |
| Core | `2dc9a181` | Orla's notice and phone card, shared thread, quiet gates, memory-only optional map row, focused review tool. |
| (a) | `5523c7c1` | The Wick lot: muted, 87 unread; SisterSignal team: 3 unread. Static metadata, no invented messages behind those rows. |
| (b) | `acd3e72b` | Notes tile opens the exact Mam draft, then the shop and car-park notes, newest first. Read-only. |
| (c) | `f0b11827` | Four cached authored raster sprites; read-only grid and individual viewers. Three cake images dated 14 March, one blurred, plus the exact bus screenshot. |

The later report/validation commit records the final results and adds the scene-level review tool. It also fixes a full-cut walker loop: the read-only probe exposes the family-call app’s existing `complete()` predicate, and completed row selectors stop being audit candidates. All three family decisions are still pressed normally; no runtime state or story gate is changed. No README was staged. The generated 2016 source site/model was refreshed because the added optional map row otherwise failed `npm test`'s freshness gate. S318's transition copy was not edited.

## Privacy and guards

S307 had already removed the `e3_backlog` push from the phone inbox. It remains absent; the new personal message, notes and photos add no ledger event. The repository audit finds no runtime `e3_backlog` references. `witness.backlogOpened` remains an unused legacy string in `data/dialog/s3_maiden.json`; it has no source consumer. The historical consumer described by the brief is the generic `ledger.checkins` loop in `src/witness/record.ts`, which classifies E3 check-ins as contacts. Its entries feed Your file, the platform record and `PhoneE3.drawWalk()` via `entriesByEra()`, and the stamp/pulse through `recordCount()` in `src/witness/pulse.ts`. With no inbox push, none gains an inbox reading entry. Old WALK documents are untouched.

Message reading lives in `PhoneE3.readMessages`; `veraDay.personalMessageSeen` is navigation state for the optional map condition, reset with the era's state, never a filing. The row is optional/quiet, between migrate and signin, so required progression is unchanged. The existing `veraDay.quiet` signal reaches the frame helper. The room's existing `phoneVersion` / `drawPhone` path lights the phone at arrival; no `era3Devices.ts`, `os.ts` or `lambyGuide.ts` change was necessary. Phone-only changes do not dirty the workstation unless its personal quiet state actually changes.

These additions are felt, never respite. They make no acceptance declaration and carry no identity signal. No private files or biography pass to Maya. Existing approved backlog prose was preserved. Period mute UI and unsent-notes practice remain `[VERIFY SOURCE]`; this build makes no new documentary claim about them.

## Camera-roll budget, measured before integration

The real external asset loader is `src/room/assets.ts`, loading registered models from `public/assets/models/`; screen textures use `src/engine/screenTexture.ts`. There is no `public/textures/` dependency. The roll instead rasterises fixed drawings once, on demand, inside the existing phone canvas, as pre-authored sprites. No image download, registry addition, camera/file input or permission is involved.

Budget stated before wiring the roll into PhoneE3: at most 8 KiB gzip sprite source, 96 KiB retained decoded sprites, and 10 ms initial local rasterisation. Measurement: **2,333 source bytes; 1,062 gzip bytes; 82,944 decoded bytes; 7.3 ms rasterisation**. Added asset preload: **0 bytes / 0 ms**, since there is no external asset. Rasterisation is measured separately from application startup; it is not a headset timing claim. The blurred version uses one transient 20,736-byte scratch canvas during creation. All drawings use the existing ERA3 palette, integer positions and nearest-neighbour canvas scaling. New scene draw calls: zero.

## Verification and photographs

- `npx tsc --noEmit -p .`: passed after each increment and on the final source.
- `npm test`: passed after each increment and on the final source, including invariants, era-site freshness and guide tests.
- `npm run dev -- --port 3114 --host 127.0.0.1`: working.
- `node tools/e3-personal-check.mjs core|a|b|c`: each increment photographed. The final run passes **52 checks**: normal arrival, jump arrival, desktop/phone opening, shared read state, witness count unchanged, a miss, direct Sign in, both consent answers, dismissal, no repeat, Start, minimise, pickup, exit, fresh restart state, every backlog row reachable, the required group pinned on every page, Notes/Photos and all four viewers, Malta and the completed cascade.
- `node tools/e3-personal-live-check.mjs`: real scene pause/resume, real frame-menu restart, seat photographs and draw-call sampling. Notice/thread/dismissed: **43/43/43 draws**. E3→E4 review ritual: **43–59 draws**, under 75. No new 3D draw submission exists in these changes. This is browser evidence, not a Quest benchmark.
- Baseline (`?debug=1`) and flat review (`?reinterp=1&flat=1&debug=1&home=0`) boot smoke checks: canvas present, no page errors.
- `node tools/stills.mjs --port 3114 --only e3 --out out/codex-e3-message/stills`: five additional room/platform stills completed.
- Photographs and machine-readable checks: `out/codex-e3-message/{core,a,b,c,live,stills}/`. These are ignored local review artifacts; the committed tools reproduce them.

- `node tools/walk.mjs --port 3114 --from-era 3 --one-era --max 2600`: passed, **51 presses**, reached E4 after Malta, the cascade, EULA and update.
- `node tools/walk.mjs --port 3114 --cut full --from-era 3 --one-era --max 2600`: passed, **78 presses**, reached E4 after the full-cut E3 work, Malta, the cascade, EULA and update. This is an E3 traversal check, not a claim about reaching E3 from the entrance.
- Both E3 walk logs and text censuses are under `out/codex-e3-message/walk-e3-fixed/` and `out/codex-e3-message/walk-full-e3-final/`.
- The initial failed entrance run, before the pinned-group correction, is retained under `out/codex-e3-message/walk-first-failed/`.

- Required command, unchanged: `node tools/walk.mjs --port 3114 --max 2600 --require-close` — **PASSED (exit 0)**. **262 presses / 514 logged steps**, no debug jump, from the real entrance through all four eras. `isReachabilityProof: true`, `spine: done`; Restart card showing on Daniel’s monitor. The final assertion says: “the walk reached the Close”.
- Final entrance walk and text census: `out/codex-e3-message/walk-close/`.

## Real-device work still owed

No real Quest or phone was used. Check that the notice and lit handset read as two devices rather than platform surveillance; read both from the authored seat; pick up and put down the phone; inspect the cake blur and nearest-neighbour sprites in XR; confirm silence on both surfaces and transition comfort/performance. This branch is built and browser-verified, not declared headset-final.
