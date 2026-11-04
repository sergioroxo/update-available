STATUS: live

# Codex build brief, 3 Nov 2026: E3-B (the mirrored message)

*This follows on from `CODEX_BRIEFS_OWN_THING_2026-11-03.md` Brief 7 and uses its format. It builds the
E3-B plan in Codex's options doc `docs/reinterp/E3_E4_OPENERS_2026-11-03.md` (branch
`codex/e3-e4-openers`). The placement, mirror and notification decisions below are Sérgio's
(revision, 3 Nov). Where they differ from the options doc, they win. Paste Brief 8 into Codex. It
starts from `origin/reinterp` on its own branch. The E4-B brief was dropped (see the last line).*

Names checked against `origin/reinterp` @ `7ccf737`. Things found while checking that the options doc
did not say are marked **[checked]** where they change what Codex must do.

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

`<name>` = `e3-mirrored-message`. Plan of record: `E3_E4_OPENERS_2026-11-03.md` § "E3-B", amended here.

**Why.** Before Vera opens the platform, an ordinary message from her life shows on the workstation's
existing sign-in screen and on the phone beside the monitor at the same moment. The two arriving
together is the cue that the phone is a separate device. Signing in is the player's own act. Lambient
speaks only once GracePlatform is open, and is silent while the message is open. `felt`, never respite.

**Decided by Sérgio (do not reopen).** Mirror ON. Notification clears on the next real navigation:
no clock, no expiry, no repeat. (A phone-only variant was considered and set aside. Do not build it.)

**[checked] Placement: the existing sign-in screen. Nothing new is built for the workstation.**
- `graceQueueLite.draw()` paints `dark → boot → install` as the whole panel. Then comes `signin`: the
  maximised `aero.windowFrame` titled `s3_queue.json` `app.shellTitle` "SisterSignal", with
  `aero.taskbar` under it. Then `consent` (Lambient's question) and `board` ("GracePlatform · Today").
- **Why `signin`** (entered when the arrival ends, `arrivalT = -1`; jump path `settleArrival()`): it is
  the earliest existing screen that takes input, and it comes before any platform work. Lambient has not
  spoken yet, because `decideConsent()`'s two `lambSay` lines follow the sign-in press, so nothing has
  to drain and no voices overlap (S304). Signing in stays the player's own later act. "After consent"
  would land inside Lambient's live two-line beat.
- Draw the notice in `draw()` after `drawSurfaceContent` (where the Start button is drawn), as a small
  card over the sign-in screen's lower right, clear of the `signin` button rect. Use existing
  `src/desktop/theme/era3` primitives. **Do not add or cost a new desktop layer, Mode or arrival
  timing.** ⚑ `drawSignIn` already draws Lambient's mark (`drawLambMark`). Report whether it reads as
  Lambient "watching". Do not remove it without Sérgio's say.
- The phone: on its stand left of the monitor (`map.json` `phone.where`), not on the nightstand. Before
  `phone.arm()`, the lock screen (`stage === 'quiet'`) shows only an unlock pill, so the personal card
  can sit there. `arm()` (Malta, after the work) resets to `lock` and takes the screen, and that is
  correct. The existing `'notification'` rect opens the GROUP. Use a new id, and never call
  `phone.arm()`.
- Map: optional rows never become `current` (`witness/map.ts` ~215), so silence must come from
  `guideSilent`, not from `quiet`. Map conditions get `os: DesktopOS`, and `graceQueueLite` is not on
  it. Follow `os.yourFileSeen` or a read-only exported getter, never a ledger filing.

**Build (core, one commit).**
1. `data/dialog/s3_maiden.json`: add `personalMessage` (`_doc: "PLACEHOLDER — Sérgio voice pass pending"`, ⚑)
   with `from`, `firstWords` and `thread: [...]`, each set to `"⚑ TEXT PENDING"`. **Mundane rule** (copy it into the
   `_doc`): an ordinary everyday message. No declared acceptance. NOT Aunt Cliona's acceptance line. Do
   not move The Wick's 14 March birthday. No mention of the programme. No question that needs an
   answer. Fix the stale "THE ERA'S RESPITE" in `_docBacklog` to `felt`, and keep "nothing is filed"
   true. Never overwrite approved text.
2. `src/desktop/apps/phoneE3.ts`: **audit first** and list every `e3_backlog` / `witness.backlogOpened`
   consumer in the report. **[checked]** found: `src/witness/record.ts:133` (an e3 "contact" entry shown
   in Your file and the phone's Walk With) and `recordCount()` (witness pulse). No map, spine or
   `era3Devices` gate reads it. Leave old `WALK_*.md` snapshots alone. Then remove the push from
   `press` case `inbox`, and keep read state in `readMessages`. Add the phone-owned personal thread, a
   quiet-stage lock card, and a small API (e.g. `openPersonalThread()`, `personalSeen`,
   `drawThreadView(ctx,w,h)`) on the one shared `PhoneE3`. Read-only: no "Type a message", no reply
   chips, no send (24 Oct bug 7).
3. `src/room/graceQueueLite.ts`: a one-shot notification state, armed on entering `signin`. Opening it
   shows the phone's own thread over the sign-in screen (drawn from `drawThreadView`, not a platform widget).
   Routing does not block: outside its rect, a tap reaches the sign-in/board control **on the same
   release** (24 Oct bug 6). **Clearing:** the desktop notification and its rects clear on the next
   real navigation (sign-in press, Start, minimise, dismiss, opening the thread, picking up the
   phone, era exit, restart). The phone's own lock card stays until read or until `arm()`, as an
   ordinary unread message would, with no glow. Extend `guideSilent` and the toast/pause gates while
   the thread is open on either surface. If the player signs in with it open, close it first.
   Lambient never comments.
4. `src/room/era3Devices.ts`: the phone lights from the same state, through `graceQueueLite.phoneVersion`
   / `drawPhone` (a painted screen). No new light, entity or geometry. Check that pick-up and
   press-past still route with the notification up. Touch `src/desktop/os.ts` /
   `src/narrative/lambyGuide.ts` only if the silent signal cannot reach them otherwise, and say which.
5. `data/strings/map.json`: one row `personal-message` between `migrate` and `signin`, with `optional: true`,
   `quiet: true`, a draft label/hint `⚑ PLACEHOLDER`, and `done: "personalMessageSeen"`. Required order
   unchanged. `src/witness/map.ts`: a state-based condition. `data/strings/lambyGuide.json`: nothing for this row.

**Increments. Each is its own commit, built in this order, so Sérgio can cut any one.**
- **(a) Muted friends group vs work group.** `s3_maiden.json` row metadata: a friends' group marked
  muted with a large static unread count, beside a work group with a small one. `phoneE3.ts` draws the
  marker and the counts. They are authored constants: no live arrivals, no score, no countdown, no
  invented messages behind them. Period mute UI `[VERIFY SOURCE]`.
- **(b) The unsent reply to Mam, read-only.** A notes view under the existing `home.fNotes` tile showing one
  pre-authored draft (`"⚑ TEXT PENDING"`). No typing, no send, no copy into the thread, no preview,
  no guessing why she stopped. Felt, files nothing. `[VERIFY SOURCE]`.
- **(c) Camera roll (in scope).** Under `home.fPhotos`: a read-only grid and viewer of a few near-duplicate
  pre-authored sprite photos and one timetable screenshot. No faces of real people, no identity clues,
  no captions that explain. It is not a "folder of her past". No camera or file input, no permission
  request. Era palette, `FILTER_NEAREST`, integer positions. Painted into the phone canvas (+0 draws).
  **[checked]** `public/textures/` does not exist on `reinterp`. Find the real loader/registry under
  `public/assets/`. **Gate:** measure the bytes added and the preload time first, and stop for Sérgio
  if they are over the budget you state in the report.

**Acceptance checks by feel.**
- When the sign-in screen appears, one small notice (sender + first words) shows on it as the phone lights. Nobody speaks.
- Pressing Sign in with the notice up signs in on that press. The notice goes, and the phone keeps its message.
- Either surface opens the same thread, with the same read state and no reply box. Lambient, guide,
  toast and glow are all silent.
- Ignoring it costs nothing. Malta still arrives and the era ends on the cascade. Your file and Walk With show no backlog entry.

**Done when:** `npx tsc --noEmit -p .` and `npm test` pass. `npm run dev` works. `node tools/walk.mjs
--port 3000` (speedrun) and `--cut full` reach E3's `update`. A focused regression covers: open on
desktop, open on phone, dismiss, miss, sign in at once, both consent answers, menu pause, restart,
`settleArrival` jump, Malta, exit. `?flat=1` unchanged. Draw calls measured at the seat and the E3→E4
transition (target +0). One BUILD_LOG line. Report:
`docs/reinterp/CODEX_E3_MIRRORED_MESSAGE_REPORT_2026-11-03.md`, with each commit hash.

**What needs a real Quest.** Whether the notice and the lit phone read as two devices, not "the platform sees my
phone". Reading both from the seat. Phone pick-up/put-down. Silence on both screens. Lamb mark. Transition peak.

---

## Order of operations and decisions still owed by Sérgio

1. Confirm the guard-2 reading in `E3_E4_OPENERS_2026-11-03.md` and approve E3-B with this brief's placement (sign-in screen, not after consent).
2. Say whether the Lamb mark on the sign-in screen may stay while the personal notice is up.
3. Paste Brief 8. Review the core, then (a) → (b) → (c), one commit each. (c) waits on its asset-budget number.
4. Write the copy: the personal message, the group details, the Mam draft, the photo set (all `⚑ TEXT PENDING`).
5. Decide what "silent" covers on the sign-in screen: the Start menu map and the guide glow (`stepTargets`) as well as Lambient.
6. After the build, run a headset session on the "What needs a real Quest" list before anything is called final.

E4 deferred by Sérgio, 3 Nov 2026.
