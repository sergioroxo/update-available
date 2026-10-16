STATUS: live

# One guided version — 16 October 2026

Implemented on top of the existing G1–G3 working tree. The source/tools session-only patch is `out/one-guided-version/session-changes.patch`; it excludes earlier work. README wording is listed separately below (README was not included in the initial frozen snapshot). The requested `docs/reinterp/PROMPTS_CODEX_OPENING_2026-10-15.md` is absent in this checkout; the supplied task, opening notes, CLAUDE.md, ethics constraints, script updates, existing walk and every actual `isSpeedrun()` site were used.

## The visitor version and extras

`currentCut()` defaults to `speedrun`, including its no-window/error fallback. `?cut=full` selects the retained review version. Setup and Home have no version selector. `startSetup()` still resolves `{ cut: currentCut() }`; the entrance's existing `chooseCut(cut)` handover remains unchanged. No `Speedrun` display string remains in `data/strings` (metadata and internal identifiers excluded); internal data names are retained.

`enableExtra(id)` / `extraOn(id)` use an in-memory Set. Passed branch points use a second in-memory Set. Both clear with the existing ledger-generation wipe on Restart/exit, persist across chapter jumps, and never persist to disk. A repeated or stale press cannot switch an extra off or enable an elapsed branch. The menu renders `(on)` or a grey `(already passed)`, with no actionable hit for disabled rows. Menus, map and helpful panels read the same flags. All colors come from existing era palettes.

| Era | ID | Final label | Place shown under it |
|---|---|---|---|
| e1 | `prayer` | The whole prayer | — |
| e1 | `programme` | The programme in full | — |
| e1 | `room` | Side trips in the room | The racket, handheld and Root Cause Digger |
| e2 | `tapes` | Play your takes | Your Story: the tapes and the edit |
| e2 | `forum` | Harbor Forums | On the desktop |
| e2 | `application` | The application | In Harbor Forums |
| e2 | `clear` | CLEAR | The phone on the desk |
| e3 | `work` | More work on the board | Before the phone rings |
| e3 | `jobs` | The other jobs | On the board: Tag the video and Post to the group |
| e4 | `session` | The whole session | On the headset |
| e4 | `console` | The console | MATCH MADE SIMPLE on the bed |
| e4 | `commons` | More of the Commons | The full programme in the hall |

The draft labels were retained. The place lines are new. `commons` was added because `ball.ts` has a real shortening site beyond the candidate list: it selects the arrival, greeting, categories, closing and intrusion composition. That opt-in uses the unchanged full composition, chosen before invitation; it cannot rewrite an ongoing Commons scene.

Current data details: the programme already has only **two reading pages**, so first-and-last and every-page routes currently coincide. 2016's two starter lists contain the **same three jobs in different orders**; the other tools already arrive as optional updates. Enabling `jobs` after the board has opened appends any missing starters without reordering installed jobs or clearing completion. These extras also restore the corresponding optional map entries. Forum, application, CLEAR, room side trips and console remain reachable through their existing doors, as well as being listed with their places in the menu.

Irreversible boundaries: prayer → Amen or the song ending; programme → the guided page jump or Done; tapes/edit → Agree to release; more board work → phone armed; session → Begin; Commons composition → invitation. The whole-prayer opt-in waits for the song's end; the retained full review route keeps its existing chorus-stop rule. Other optional doors can be enabled at any point while their era remains available.

## Numbered cuts and pacing changes

1. **BEFORE:** Setup asks “Which version would you like?” with two buttons; Home repeats the choice. **AFTER:** one guided visit; the content note leads directly to the advert. One fewer setup choice. Full is available only by the review URL.
2. **BEFORE:** 2003 preparation has five “Next topic” presses and one “Done”. **AFTER:** all six unchanged topics reveal at 3.5-second intervals, accumulate on the page, and end with one “Go on”. No story answer or release choice is removed. The preparation has no answer choices in the current data. Five required presses removed.
3. **BEFORE:** 1997's profile lets the audit cycle through all icons/chips and requires a separate Continue. **AFTER:** an icon advances to the chips; three chips advance to the goal; a goal advances to the existing recap. Every icon, chip, goal and decline choice remains. Back permits revision. The recap's own press remains because it changes the meaning of what was filed.
4. **BEFORE:** the family form has six states, including three additional questions and their response/felt beats. **AFTER:** the proposed guided subset keeps original states 0, 3 and 5. Full review retains all six. No word in the form is edited. Only kept choices file tags; silence, close, debrief and completion filing are unchanged.
5. **BEFORE:** a dismissed Word of the Day/pause could be followed immediately by another modal; cascade → notice → EULA also changed modal without a gap. **AFTER:** those closes/transitions leave one calm second. The content note, once-only Remind me later, EULA pages, I Agree and install/restart remain. No press is added for the gap.
6. **BEFORE:** the walk is an exhaustive explorer and repeatedly minimises/reopens optional windows while the script speaks. Its restore setup also always selected Full, even when the URL requested the shorter cut. **AFTER:** the default walk follows the guided route; `--explore` retains the exhaustive navigation policy, and `--cut full` reviews the old full route. The guided policy waits for scripted action and follows the required path; it does not seek media, skip felt pacing, write the ledger or call debug navigation. This measurement-policy change must be considered when comparing counts.
7. **BEFORE:** the walker ignores the existing frame call button and can cycle completed 2026 tabs while the headset sits off screen. **AFTER:** it reads the visible call's bounds and presses it with ordinary mouse down/up; the guided policy stops revisiting the five completed turns. The failed 264-press run is retained under `out/one-guided-version/failed-guided/`; it is not counted as a completed visit. The map also now uses the browser’s real completed-turn gate: the headset is step five and has no `step:search` button/filing. Previously that nonexistent filing prevented the frame call and kept Start/help on the finished turns. No room/camera code changed.
8. **Door/toast audit:** the current G1–G3 Caleb toast already opens Messenger directly and no message-confirmation window is activated. The web Join already minimises its browser and opens the channel. Send accept/refuse remains a real choice. No further confirmation was removed from these seams.

## Press counts and controls

| Stage | Historical reference | Frozen guided-cut baseline (explore policy) | Final guided visit | Full review verification |
|---|---:|---:|---:|---:|
| entrance | 13 | 15 | 14 | 14 |
| e1 | 144 | 128 | 64 | 158 |
| e2 | 275 | 181 | 49 | 196 |
| e3 | 54 | 102 | 47 | 58 |
| e4 | 67 | 68 | 50 | 74 |
| close | 11 | 11 | 12 | 10 |
| **Total** | **564** | **505** | **236** | **510** |

The requested historical reference is **564** total presses: entrance **13**, 1997 **144**, 2003 **275**, 2016 **54**, and 2026 including the Close **78**. The comparison above separates Close at the first log entry with `spine: done`, consistently for all four JSON reports; that gives the historical reference **67** e4 presses plus **11** Close presses. This boundary avoids mixing different PATH/report groupings.

The current pre-change snapshot was also walked, with its version selector corrected to honor `--cut speedrun`. That frozen server ran on port 3224 so implementation could continue on 3223. Both completed post-change walks use port 3223. The retained full walk completed before the final map-only headset-call correction; the final guided walk verifies that additional door. Timing depends on the automated browser; these counts describe the named routes, not audience timing. The historical walk includes optional exploration and repeated/inert presses; the new guided policy omits that exploration, so a lower count is not evidence that hundreds of narrative choices were deleted.

Every control ID and its count, grouped by era for the historical reference, frozen baseline and final guided path, is in `out/one-guided-version/presses-by-control.md`. Full PATH/JSON evidence is also retained there.

The tapes probe takes the actual `checkin:steady` → `checkin-continue` → `icon-story` path. Preparation reveals BEFORE → WHAT I BELIEVED → TURNING POINT → WHAT CHANGED → WHERE I AM NOW → TO SOMEONE STRUGGLING, followed by `ts-prep-done` (Go on) and `ts-agree`. With `tapes` enabled in Start first, Agree opens `tapes` without filing tapes/edit completion; `ts-file:daniel` → full playback → `ts-folder` → `ts-send` reaches the editor (`cut`). No debug topic/stage jump is used. The component probe also advances all three existing cuts, exports, verifies the `testimony-cut` filing and returns online. The prayer probe checks Amen remains absent at song-end minus 0.25 seconds and appears at the authored end.

## The form, verbatim copy preserved

Kept: **0** father relationship; **3** this week's walk/talk/sit correction; **5** the silence (no options). Skipped only in guided: **1** father and sexual identity; **2** boyhood play; **4** friendship log. `guided: false` is the sole form-data addition, and the schema documents it. Original indexes remain stable; numeric `goto` to a skipped state resolves forward to the next kept state. A target after the final kept state closes the vignette normally.

The probe follows 0→3→5 and 0→1→2→3→4→5, then silence→close→debrief→Return, and verifies a completed `origin_intake_e1` ledger entry, the `provotype:origin_intake_e1` tag and `beatDone('formDone')`. Guided records no father-regard, play-pattern or friendship-log tag.

Kept responses do not refer to a skipped question: states 0 and 3 say “Recorded for the file.” State 5 says “Every answer here is recorded the same way. / Recommendation: further support recommended.” The debrief body refers to the instrument in general. One **unchanged debrief source line needs the lead's attention**: `data/provotypes/origin_intake_e1.json:106`, the first source, ends “Two prompts quote it directly; the childhood-play question paraphrases it.” In guided only one direct-quote prompt remains and the play question is skipped. It is dossier phrasing, so it has been reported, not edited.

## Every display-string change

These changes are relative to this session's starting tree, not to HEAD, which already contains the earlier opening work. No `_s` value changed anywhere in data. Metadata comments and internal IDs are excluded. The existing `s2_testimony.json` strings remain available for full review; the guided UI replaces “Next topic” ×5 and “Done” with the new “Go on” once.

| File · key | BEFORE | AFTER |
|---|---|---|
| `data/strings/setup.json · balloons.version.buttons.0` | The full piece | absent |
| `data/strings/setup.json · balloons.version.buttons.1` | The Speedrun Version | absent |
| `data/strings/setup.json · balloons.version.text` | Which version would you like? | absent |
| `data/strings/home.json · cut.full` | The full piece | absent |
| `data/strings/home.json · cut.legend` | Which version? | absent |
| `data/strings/home.json · cut.speedrun` | The Speedrun Version | absent |
| `data/strings/slice.json · desktop.startMenu.alreadyPassed` | absent | (already passed) |
| `data/strings/slice.json · desktop.startMenu.more` | absent | More to explore |
| `data/strings/slice.json · desktop.startMenu.on` | absent | (on) |
| `data/strings/extras.json · back` | absent | Back |
| `data/strings/extras.json · e1.0.label` | absent | The whole prayer |
| `data/strings/extras.json · e1.0.place` | absent |  |
| `data/strings/extras.json · e1.1.label` | absent | The programme in full |
| `data/strings/extras.json · e1.1.place` | absent |  |
| `data/strings/extras.json · e1.2.label` | absent | Side trips in the room |
| `data/strings/extras.json · e1.2.place` | absent | The racket, handheld and Root Cause Digger |
| `data/strings/extras.json · e2.0.label` | absent | Play your takes |
| `data/strings/extras.json · e2.0.place` | absent | Your Story: the tapes and the edit |
| `data/strings/extras.json · e2.1.label` | absent | Harbor Forums |
| `data/strings/extras.json · e2.1.place` | absent | On the desktop |
| `data/strings/extras.json · e2.2.label` | absent | The application |
| `data/strings/extras.json · e2.2.place` | absent | In Harbor Forums |
| `data/strings/extras.json · e2.3.label` | absent | CLEAR |
| `data/strings/extras.json · e2.3.place` | absent | The phone on the desk |
| `data/strings/extras.json · e3.0.label` | absent | More work on the board |
| `data/strings/extras.json · e3.0.place` | absent | Before the phone rings |
| `data/strings/extras.json · e3.1.label` | absent | The other jobs |
| `data/strings/extras.json · e3.1.place` | absent | On the board: Tag the video and Post to the group |
| `data/strings/extras.json · e4.0.label` | absent | The whole session |
| `data/strings/extras.json · e4.0.place` | absent | On the headset |
| `data/strings/extras.json · e4.1.label` | absent | The console |
| `data/strings/extras.json · e4.1.place` | absent | MATCH MADE SIMPLE on the bed |
| `data/strings/extras.json · e4.2.label` | absent | More of the Commons |
| `data/strings/extras.json · e4.2.place` | absent | The full programme in the hall |
| `data/strings/extras.json · goOn` | absent | Go on |

## Documentation wording and the lead's texts

Only README was edited. Its affected places:

1. Home in XR: **BEFORE** “the content-note gate and full/Speedrun cut remain in lambyosHome.ts” → **AFTER** “the content-note gate remains in lambyosHome.ts; every device enters the same guided version.”
2. Beside `?kiosk=0`: **BEFORE** no single-version/review-cut explanation → **AFTER** “One guided version for visitors”, memory-only More to explore and `?cut=full` explicitly labeled as a review parameter.
3. Opening sequence: **BEFORE** “About → Whose session? → sound → How to look → the plain content note → version → the advert introduction → Start.” → **AFTER** “Greet → Work in progress → Whose session? → sound → How to look → Start-menu lesson → the plain content note → the advert introduction → All set / Start.” The obsolete About-pages sentence is removed; the version-duration sentence becomes “There is one guided visitor version; Setup has no version choice.”
4. Setup handover: **BEFORE** “awaits { cut: 'full' | 'speedrun' }” → **AFTER** “awaits { cut: currentCut() }”; the existing internal union type is still documented.
5. Old walker instructions: **BEFORE** “The walker chooses full and skips the advert offer; advert Play is forbidden because the 114-second film exceeds its per-step patience. The capture checks Play and immediate Skip separately.” → **AFTER** the walker defaults to guided, teaches Start, waits for the mandatory advert, and `--cut full` reviews the retained route. Neither route has a version chooser or advert Skip.

6. Advert description: **BEFORE** “The optional advert uses…” → **AFTER** “The advert uses…”; the existing mandatory/no-Skip rule remains.

Lead's files, **not edited**:

1. `docs/reinterp/EXHIBITION_GUIDE_2026-10-15.md`, §2, lines 27–29: **BEFORE** “note (the only gate; a Reduce motion box is there) → full piece or Speedrun Version → the LambyOS advert…” → **PROPOSED AFTER** “note (the only gate; a Reduce motion box is there) → the LambyOS advert…” Add after that bullet: “One guided version; optional content is under More to explore in the Start menu.” This is the only two-version reference in that file.
2. `docs/reinterp/EXHIBITION_CARD_2026-10-15.html`: **BEFORE** the current card has no version-choice wording anywhere. **PROPOSED AFTER** no removal is needed; optional addition, if the lead wants it: “Start lists what to do and More to explore.” The card's existing words are unchanged.

## Verification and limits

- `npm run dev -- --host 127.0.0.1 --port 3223`: working. Hot reload was disabled for the long verification walks so edits could not reset them.
- `npx tsc --noEmit`, `npm run build`, `npm test`, and `git diff --check`: pass. Existing production chunk-size warning only.
- `node tools/one-guided-probe.mjs 3223`: **14 checks pass**, no page errors. The retained Home entrance also passes `--only=Home` (separate evidence).
- A separate 400×225 physical probe (`--only=physical`) follows Start → Play your takes → steady check-in → all six prep topics → release → Daniel playback → editor through projected mouse down/up and natural clocks. No handler calls or story-state writes. Other isolated probes use published canvas hit handlers and controlled update ticks; the form grammar and update cadence are component-level checks.
- 400×225 probes assert the default/review cut, automatic panel appearance and reopening, the same Lamby instance wired to each surface, Start menus, the real check-in→prep→release→Daniel tape→editor path, both form routes/completion, full-song/programme extras, the live work gate and its passed row, cross-era extras retention and generation wipe, modal gaps and once-only deferral. The actual fresh entrance follows greet→wip→whose→sound→look→start→note→advert→allset, honoring the mandatory film and content-note arm.
- `node tools/walk.mjs --port 3223 --max 2600 --require-close`: **236 presses, Close reached** (guided policy). All steps are physical projected-canvas clicks/ordinary movement selections; debug globals are read-only.
- `node tools/walk.mjs --port 3223 --max 2600 --require-close --cut full`: **510 presses, Close reached** (retained full review, exploratory policy).
- Frozen baseline corrected to select the requested shorter cut: **505 presses, Close reached** on port 3224.
- Protected `_s` values compared against the session snapshot: no changes. `data/strings` scanned recursively excluding metadata/internal keys: no displayed Speedrun text.
- Both forms' completion routes are verified without editing their copy. No physical headset/phone test or audience timing study is claimed.
- Final isolated rechecks: `--only=2003` exports the restored editor and returns online; `--only=1997 extras` checks the stricter whole-song end boundary. Both pass.

Screenshots: all eight requested views (1280×720 and 390×844, four eras) plus source-canvas views are in `out/one-guided-version/`. Both contact sheets and all eight final individual captures were opened and visually inspected: labels/locations fit, palette and chrome match each era, no entry is clipped. The legacy menu collapses Programs to keep the extras section visible; extra labels/statuses wrap when needed.

The 400×225 entrance test uses the optional Start lesson's Later button: the floating lesson's demonstration Start button is below that very short viewport. The complete 1280×900 walk exercises Show me → Start → Got it. This existing small-landscape setup framing limitation is recorded rather than changing the camera/entrance module in this task.

No physical phone, Quest 3 or Vision Pro run was performed. XR/headset note: desktop surface/menu changes share the existing monitor texture and input path; in-headset legibility and touch/controller feel remain unverified. No room geometry, movement or camera code was changed by this session. The build's existing large-chunk warning remains.
