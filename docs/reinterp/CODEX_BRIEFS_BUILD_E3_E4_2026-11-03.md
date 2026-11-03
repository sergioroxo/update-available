STATUS: live

# Codex build briefs, 3 Nov 2026: E3-B (the mirrored message) and E4-B (the unfinished search)

*These follow on from `CODEX_BRIEFS_OWN_THING_2026-11-03.md` Brief 7 and use its format. They build the
plans in Codex's options doc `docs/reinterp/E3_E4_OPENERS_2026-11-03.md` (branch `codex/e3-e4-openers`).
They implement those plans and do not re-derive them. Paste ONE brief into Codex. Each brief starts
from `origin/reinterp` on its own branch. ⚑ Do not paste either one until Sérgio has approved that
candidate in the options doc (its "Decisions" section).*

Names checked against `origin/reinterp` @ `7ccf737`. Things the options doc did not say, found while
checking, are marked **[checked]** where they change what Codex must do.

---

## 8 · E3-B build: the mirrored message (`codex/e3-mirrored-message`)

> Repository: /Users/sergiogalvaoroxo/update-available-reinterp (PlayCanvas + Vite + TypeScript WebXR art piece).
> First `git fetch && git checkout -b codex/<name> origin/reinterp`. Read CLAUDE.md and
> docs/ETHICS_CONSTRAINTS.md before anything — their laws bind you: no runtime network calls; no storage;
> colours only from src/desktop/theme/*; click/tap only, no free text, no timers that punish, no scores;
> respite is never a trap and never revealed as fake; the system targets AROUND it, never through it;
> E3 has no respite (Sérgio, confirmed). GUARD 1: nothing may read as one person's identity trajectory (Daniel E1→E2 is one person; Vera and Maya are different people; no inherited private files or biography). GUARD 2: a person's own thing is an ordinary private object or act, never an identity signal, and no one declares acceptance of her in order to make the scene work. Every docs/**.md starts with `STATUS:`. All new display text is
> a draft: `_doc: "PLACEHOLDER — Sérgio voice pass pending"` and marked ⚑ — you do NOT write final
> survivor-adjacent text or make ethics calls; you flag them. Uncited facts carry `[VERIFY SOURCE]`.
> One line in BUILD_LOG.md (next session number after the last one — check). Commit with explicit paths,
> never `git add -A`; never stage README.md. Verify with `npx tsc --noEmit -p .` and `npm test` (both
> must pass). Do not push; leave the branch for review. Write a short report file
> docs/reinterp/CODEX_<NAME>_REPORT_2026-11-03.md (STATUS: live): what you changed, how you checked it,
> what still needs a real headset or Sérgio's decision.

`<name>` = `e3-mirrored-message`. Plan of record: `E3_E4_OPENERS_2026-11-03.md` § "E3-B", steps 1–6.

**Why.** Between Lambient's question and the work, one ordinary message from Vera's own life arrives. The
player may read it, turn to the phone, or ignore it. The platform says nothing and files nothing. `felt`, never respite.

**Two switches. Set both at the top of the report before writing code. ⚑ Sérgio chooses.**
- **Variant.** Default `mirror: on`: the notification shows on the workstation as a mirrored copy of
  the phone, and the resting phone lights in the same state change. `mirror: off` (narrow variant):
  no desktop notification and no desktop thread view. Only the phone lights. Use one constant (e.g.
  `E3_PERSONAL_MIRROR` in `graceQueueLite.ts`), not two code paths.
- **Notification lifetime.** Default `clear-on-navigation`: no clock. The notification clears on the
  next real navigation (work selected, dismiss, thread opened, era exit, restart). Alternative
  `bounded`: a presentation lifetime with no penalty, no "ignored" classification and no repeat,
  paused while the game menu (`pauseOpen`) is up. Build the default. Add the alternative only if
  Sérgio has picked it.

**[checked] Facts that change the plan.** (1) The phone sits on its stand left of the monitor, not on
the nightstand (`map.json` `phone.where`; `reinterp_deltas.json` `w_phoneDevice`). "The phone lights"
means that phone. Do not move it. (2) `witness/map.ts` never makes an `optional` row `current`
(line ~215), so `quiet: true` on an optional row does NOT silence the helper. The silence has to come
from `graceQueueLite.guideSilent`. (3) Map conditions receive `os: DesktopOS`, and `graceQueueLite` is
not reachable from it. Follow the `os.yourFileSeen` precedent (`yourFileSeen` condition) or a
read-only exported getter, and do not use a ledger filing. (4) The lock screen already publishes a
`'notification'` rect that opens the GROUP (`phoneE3.ts` ~345, ~683). The personal message needs its
own id, and it must never call `phone.arm()`.

**Build (core, one commit).**
1. `data/dialog/s3_maiden.json`: add a `personalMessage` block with `_doc: "PLACEHOLDER — Sérgio voice
   pass pending"` and ⚑, holding `from`, `firstWords` and `thread: [...]`, every text value
   `"⚑ TEXT PENDING"`. **Mundane-content rule** (put it in the `_doc` too): an ordinary everyday
   message. Nobody declares acceptance. Do NOT use Aunt Cliona's acceptance line. Do NOT move The
   Wick's 14 March birthday. No mention of the programme. No question that needs an answer. Correct
   the stale "THE ERA'S RESPITE" wording in `_docBacklog` to `felt`, and keep "nothing is filed" true.
   Never overwrite existing `_s` or approved text.
2. `src/desktop/apps/phoneE3.ts`: **audit first** and list every `e3_backlog` / `witness.backlogOpened`
   consumer in the report. **[checked]** found: `src/witness/record.ts:133` (an e3 "contact" entry, shown in
   Your file and the phone's Walk With) and `recordCount()` (witness pulse). No map/spine/`era3Devices`
   gate reads it. Leave old `WALK_*.md` snapshots alone. Then remove the `e3_backlog` push from `press`
   case `inbox`, and keep read state in memory (`readMessages`). Add the phone-owned personal thread and a
   small API (e.g. `openPersonalThread()`, `personalSeen`, `drawThreadView(ctx,w,h)`) on the one shared
   `PhoneE3`. Read-only: no "Type a message" box, no reply chips, no send (24 Oct bug 7).
3. `src/room/graceQueueLite.ts`: add one-shot notification state, armed only after `decideConsent()`'s
   two `lambSay` lines have drained (`lambLines` back to null/greet). Do not arm it on the consent
   ledger push alone. If work has already started, cancel the notification and never deliver it
   later. Never delay work for it. Desktop thread-view mode (when the mirror is on). Hit routing that
   does not block: a tap outside the notification rect reaches the board control **on the same
   release** (24 Oct bug 6, the swallowed Today click). The notification and its rects clear on
   every route listed in "Two switches". Extend `guideSilent` (and the toast/pause gates) so they are
   true while the thread is open. Keep the Malta group notification and the work counts independent.
4. `src/room/era3Devices.ts`: the resting phone's lit state comes from the same one-shot state through
   `graceQueueLite.phoneVersion` / `drawPhone`. That means a painted screen. No new light, entity,
   geometry or second phone. Check that press-to-pick-up and press-past-to-work still route correctly
   with the mirror up. Touch `src/desktop/os.ts` / `src/narrative/lambyGuide.ts` only if the silent
   signal cannot reach them otherwise, and say which in the report.
5. `data/strings/map.json`: add one row `personal-message` between `consent` and `work`, with
   `optional: true`, `quiet: true`, a draft `label`/`hint` (`⚑ PLACEHOLDER`), and
   `done: "personalMessageSeen"`. The required order stays unchanged. `src/witness/map.ts`: add the
   `personalMessageSeen` condition, which reads state and never the ledger. `data/strings/lambyGuide.json`:
   no tip, invitation or commentary for this row.

**Gated increments. Each is its own commit, so Sérgio can cut any one. Do them in this order. Stop
after any one if he says so.**
- **(a) Muted friends group vs work group (do first, cheapest).** `s3_maiden.json` inbox-row metadata:
  a friends' group marked muted with a large static unread count, beside a work group with a small one.
  `phoneE3.ts` draws the mute marker and the counts. They are authored constants: no live arrivals, no
  score, no countdown, and no invented messages behind them. Period mute UI `[VERIFY SOURCE]`.
- **(b) The unsent reply to Mam, read-only.** A notes view under the existing `home.fNotes` tile
  (`phoneE3.ts`) showing one pre-authored draft (`"⚑ TEXT PENDING"`). No typing, no send, no copy into
  the thread, no notification preview, no guessing why she stopped. Felt, files nothing. `[VERIFY SOURCE]`.
- **(c) Camera roll (LAST, and cut first).** Under the existing `home.fPhotos` tile, add a small
  read-only grid and viewer of pre-authored sprite photos (a few near-duplicates) and one timetable
  screenshot. Rules: no faces of real people, no identity clues, no captions that explain. It is not
  a "folder of her past". No camera or file input, no permission request. Era palette from
  `src/desktop/theme/`, `FILTER_NEAREST`, integer positions. **[checked]** `public/textures/` does
  not exist on `reinterp`. Find the real asset loader/registry (look under `public/assets/`) and use
  that. **Measure the asset budget**: report bytes added and preload time. Painted into the phone
  canvas, so +0 draws.

**Acceptance checks by feel.**
- Right after Lambient finishes, one small notice (sender + first words) appears and the phone lights. Nobody speaks over it.
- Tapping a work tile while the notice is up starts the work on that same tap, and the notice is gone.
- Either surface opens the same thread, with the same read state, no reply box, and silence from Lambient, guide, toast and glow.
- Ignoring it costs nothing: Malta still arrives, the era ends on the cascade, and Your file / Walk With show no backlog entry.
- With the mirror off, only the phone lights.

**Done when:** `npx tsc --noEmit -p .` and `npm test` pass. `npm run dev` works. `node tools/walk.mjs
--port 3000` (speedrun) and `--cut full` reach E3's `update`. A focused regression covers: open via
desktop, open via phone, dismiss, miss, work at once, both consent answers, menu pause, restart,
Malta, exit. `?flat=1` unchanged. Draw calls measured at the seat and the E3→E4 transition (target
+0). One BUILD_LOG line. Report: `docs/reinterp/CODEX_E3_MIRRORED_MESSAGE_REPORT_2026-11-03.md`, with
each increment's commit hash.

**What needs a real Quest.** Reading phone and monitor together from the seat. Whether the mirror
reads as "my phone" or "the platform sees my phone" (⚑ Sérgio's call). Picking up and putting down the
phone with the notice up. Silence on both screens. Draw/frame peak at the transition.

---

## 9 · E4-B build: the unfinished search (`codex/e4-unfinished-search`)

> Repository: /Users/sergiogalvaoroxo/update-available-reinterp (PlayCanvas + Vite + TypeScript WebXR art piece).
> First `git fetch && git checkout -b codex/<name> origin/reinterp`. Read CLAUDE.md and
> docs/ETHICS_CONSTRAINTS.md before anything — their laws bind you: no runtime network calls; no storage;
> colours only from src/desktop/theme/*; click/tap only, no free text, no timers that punish, no scores;
> respite is never a trap and never revealed as fake; the system targets AROUND it, never through it;
> E3 has no respite (Sérgio, confirmed). GUARD 1: nothing may read as one person's identity trajectory (Daniel E1→E2 is one person; Vera and Maya are different people; no inherited private files or biography). GUARD 2: a person's own thing is an ordinary private object or act, never an identity signal, and no one declares acceptance of her in order to make the scene work. Every docs/**.md starts with `STATUS:`. All new display text is
> a draft: `_doc: "PLACEHOLDER — Sérgio voice pass pending"` and marked ⚑ — you do NOT write final
> survivor-adjacent text or make ethics calls; you flag them. Uncited facts carry `[VERIFY SOURCE]`.
> One line in BUILD_LOG.md (next session number after the last one — check). Commit with explicit paths,
> never `git add -A`; never stage README.md. Verify with `npx tsc --noEmit -p .` and `npm test` (both
> must pass). Do not push; leave the branch for review. Write a short report file
> docs/reinterp/CODEX_<NAME>_REPORT_2026-11-03.md (STATUS: live): what you changed, how you checked it,
> what still needs a real headset or Sérgio's decision.

`<name>` = `e4-unfinished-search`. Plan of record: `E3_E4_OPENERS_2026-11-03.md` § "E4-B", steps 1–6.

**⛔ HARD GATE. Read this before anything else.** The restored fragment (what Maya typed) and the
engine's completion are not yours to write. **STOP and ask Sérgio unless `data/dialog/s4_boot.json`
already contains an `unfinished` block whose `approved` field is `true`, together with his name and
date.** **[checked]** At `7ccf737` there is no such block. The current `search.typed` ("how do i tell
my") and `completions` are the existing E4 search. They are NOT an approved opener fragment. If the
gate is closed, build only this, as one commit, and stop: the stub below, plus a schema check in
`npm test` that fails loudly if `unfinished.approved !== true` while the opener flag is on. Keep the
opener behind a flag that is off by default, so the shipped path is unchanged.

```json
"unfinished": {
  "_doc": "PLACEHOLDER — Sérgio voice pass pending. ⚑ HARD GATE: fragment + completion are Sérgio's.",
  "approved": false, "approvedBy": "", "approvedOn": "",
  "fragment": "⚑ TEXT PENDING",
  "completionTail": "⚑ TEXT PENDING",
  "sessionCue": "⚑ TEXT PENDING",
  "continueLabel": "⚑ TEXT PENDING"
}
```
`fragment` is what she typed. `completionTail` is only what the engine adds. The full steered query is
`fragment + completionTail`, and it must equal `s4_browser.json` `program.chosen` once approved (add a
test).

**Ethics rails (verbatim, binding).**
- apparatus and AI use only, never detransitioners
- never satirise the gender-exploratory clinical debate
- both captions stay together and unresolved elsewhere
- no clothing/prop interactions
- no deadname
- the stream and the wall calendar must never become a loss
- the fragment must be practical and non-clinical
- the autocomplete diversion is fictional extrapolation, `[VERIFY SOURCE]` if presented as fact, and no new factual Dossier card

**Why.** Before the defaults take over, the player sees a small, practical search Maya typed last night
and never finished. The engine then finishes it differently and steers to the sponsored result and the
agent. The gap between her request and the completion is the mechanism, shown without explanation.

**Build (only once the gate is open).**
1. `data/dialog/s4_boot.json`: use the approved `unfinished` block. Align `search.typed` (= `fragment`),
   `completions` and `tabs[0].title` to it. While the opener is up, `boot.bootLine` ("L — booting up
   for you, Maya.") does not show. Do not delete it. Say in the report where it still shows, if
   anywhere.
2. `data/dialog/s4_browser.json`: align `program.chosen` and the results query/history to
   `fragment + completionTail`. Reuse the existing sponsored result and agent route as they are.
   Existing clinical captions/results stay together, unresolved, and outside the opener.
3. `src/desktop/apps/browser.ts`: add an explicit opener state (e.g. `phase === 'open'` plus a
   `unfinishedUp` flag) that holds before `defaultsOpen` can become true. In it, draw only the
   restored fragment, the session cue and one deliberate **Continue** (rect id e.g. `unf-continue`).
   No blinking cursor, no timeout, no wait-for-look. Do not rely on `BOOT_SECONDS` for reading time.
   **While the state is up, suppress** the `wake()` and `file()` ledger writes (`e4Space` `saver` and
   `session`), `pauseWords`, word-of-day, idle screensaver, history tabs, guide (`guideSilent` true;
   `feltUp` covers only Junie's thread now, so extend it), console voice and glow. On Continue, enter
   defaults. The later `defaults` and agent filings are unchanged. **Completion styling:** the
   engine-added tail is visibly distinct from her fragment, in a different palette tint from
   `src/desktop/theme/` and/or a different position (e.g. the tail drawn after a gap or on the
   suggestion row, never merged into her text). The distinction stays visible in `typing` and
   `results` modes. Add reset/debug handling.
4. `src/desktop/apps/space.ts`: the laptop is neutral and silent while the opener owns the monitor.
   Check the console text and the guide rendering, not only `space.laptop.lines` (`laptopLine` is
   already 3, so it is dormant). `data/dialog/s4_space.json`: edit only an active status string, if one
   is needed. `data/dialog/s4_l.json`: audit for overlap only. No edits, and do not revive it.
5. `data/strings/map.json`: E4 prefix `wake → l → defaults → search → agent` becomes
   `wake → l → unfinished → defaults → search → agent`. The rest is unchanged. Mark `wake`, `l`,
   `unfinished` as `quiet`. `unfinished` is required, `done: "unfinishedSeen"`, with a draft label
   (`⚑ PLACEHOLDER`). Keep the id `l`, but replace its displayed L label/hint with neutral draft
   restore wording. `src/witness/map.ts`: add `unfinishedSeen` (browser state via `os.e4.browser`),
   and change `saverPressed` so it no longer depends on the suppressed `saver` filing. Also confirm
   `browserOpen` still turns true. `data/strings/lambyGuide.json`: no entry for the prefix. `e4.defaults`
   resumes only after felt exits.
6. `tools/tour-e4.mjs`: add the Continue press (through `__os.e4.pressBrowser` on the published
   rect, never a jump) and the frames `unfinished-fragment` and `search-completed`.

**Acceptance checks by feel.**
- After the restart: one still card with her few typed words. L, laptop, glow and helper all silent. Stay as long as you like.
- One Continue press moves on. The defaults never cover the fragment.
- When the search runs, you can tell at a glance which words were hers and which the engine added. The ad is first, and the agent opens.
- Nothing in the opener reads as clinical, identity-debate or about detransitioners. Stream and calendar are untouched at the Close.

**Done when:** `npx tsc --noEmit -p .` and `npm test` pass, including the gate/schema test and the
`program.chosen` equality test. `npm run dev` works. `node tools/tour-e4.mjs --port 3000 --out
out/tour-e4` reaches the Close. `node tools/walk.mjs --port 3000` and `--cut full` pass E4. The
report asserts: zero new `e4Space`/ledger entries during the opener, no L/guide/voice on either
device, the sponsored result reachable, and both captions present together after search. Draw calls
re-measured at the seat and at the E3→E4 transition peak (≤75; historical 25–41 is not a new
measurement). One BUILD_LOG line. Report: `docs/reinterp/CODEX_E4_UNFINISHED_SEARCH_REPORT_2026-11-03.md`
(state whether the gate was open or closed).

**What needs a real Quest.** Whether the fragment is legible from the seat right after the restart
turn. Whether the tint/position difference between fragment and tail reads at headset resolution.
L/guide silence on monitor and laptop together. Comfort of the one added press. Frame and draw
peak across the E3→E4 update.

---

## Order of operations and decisions still owed by Sérgio

1. Sérgio approves E3-B and/or E4-B in `E3_E4_OPENERS_2026-11-03.md`, and confirms the guard-2 reading.
2. E3-B: choose the variant (mirror on/off; the surveillance reading) and the notification policy (clear on navigation vs bounded).
3. Paste Brief 8. Review the core, then approve or cut increments (a) → (b) → (c) one commit at a time.
4. E3-B copy: write the personal message, the friends/work group details, the Mam draft and the photo set (all `⚑ TEXT PENDING`).
5. E4-B: write and mark `approved` the `unfinished` fragment and completion in `s4_boot.json`. Until then Brief 9 stops at the stub.
6. After either build, do a headset session on the "What needs a real Quest" lists before any wording is called final.
