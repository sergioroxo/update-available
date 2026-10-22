STATUS: live

# Prompts for Codex — after the opening: G1 blockers · G2 Lamby the guide · G3 the Start menu as the map · G4 one guided version (2026-10-15)
*Designed in a cloud session (Claude, Sonnet 5.5) from `OPENING_NOTES_2026-10-15.md` (the brief), `PROMPTS_CODEX_2026-10-11.md`
(the PREAMBLE and the earlier prompts' style), `PLAN_ENTRANCE_RESTORE_SESSION_2026-10-13.md` and the code each group touches.
No code was changed to write this. Everything marked **FOUND** below was checked on `origin/reinterp` (f4dd4db) in a headless
Chrome against a dev server; everything marked **READ** was read in the code and not run. Paste the PREAMBLE from
`PROMPTS_CODEX_2026-10-11.md` first, then ONE prompt. Codex works in its own worktree and never merges.*

## For the lead — what to run, in what order, and what collides

| prompt | what | port | merge-ready alone? | collides with |
|---|---|---|---|---|
| **G1** | blockers: Caleb never arrives in 2003 · fullscreen lost on Restart / idle return · mIRC's X dead · "start here" missing | 3220 | **yes — run first, merge first** | **G2** (small: both edit `os.ts`, in different regions — resolve by hand) · G4 (none of substance) |
| **G2** | Lamby the guide from 1997 (balloon, Yes/No, pointer, "take me there"), the setup's WIP + Start-menu teaching, About removed, CLAUDE.md R28 §2 revised | 3221 | yes, after G1 | **G3** (heavy: `os.ts` Start menu + taskbar, `startPanel.ts`; G2 renames the button to "Start" and G3 builds on it) · **G4** (`setup.ts` + `setup.json`: G4 removes the version step G2 renumbers) |
| **G3** | the Start menu as the map: every step in order with ticks, "What to do" always one press away, JUMP between eras, in all four eras | 3222 | yes, after G2 (or G1 alone, with a bigger merge) | **G2** (see above) · **G4** (G4 adds "More to explore" to G3's menu) |
| **G4** | ONE guided version (Speedrun's pacing as the spine), the full version's extras behind the Start menu, fewer presses, 1997's form cut to the essentials | 3223 | yes, after G3 | **G3** (the menu), **G2** (`setup.ts`) |

**Safe orders.** Sequence: **G1 → G2 → G3 → G4** (each rebased on the last; no real conflicts). Two at once: **G1 ‖ G2** is fine
(different regions; resolve `os.ts` by hand); **G1 ‖ G4's data half** is fine; **never G2 ‖ G3** and **never G3 ‖ G4** — they rewrite
the same menu and the same setup file. The earlier rule stands: at most two Codex chats at once (each starts its own browser).

**Two decisions for him, found while writing.** (1) *G1 / 1997 "If you are struggling, start here":* that exact line exists nowhere in
1997 — the nearest are 2003's story page (`data/dialog/s2_testimony.json:105`, "Are you struggling too? Start here →") and 1997's
Fellowship page (`data/dialog/s1_browser.json` `portal`, "Join #stillstruggling"). G1 reads it as: the 1997 Fellowship page should say
it, as the programme's invitation. Strike that if he meant something else (e.g. only the Getting Started card). (2) *G4 / the form:* the
kept three questions (father; the walk/talk/sit correction; the silence) are a proposal — the form's wording is his, so G4 only
*skips* the other three by data and edits no word of it.

## How to probe fast (paste with every prompt — learned while writing these)
*A full walk is slow and missed the 2003 block. Probe the human path instead.* In this Linux cloud box a 1280×720 3D page ran at
**1.8 fps** in headless Chrome (SwiftShader) — timers inside the piece (the spine's 9 s, toasts, the idle cycle) crawl. A
**400×225 viewport ran at ~11 fps**: use that for logic probes, and a larger one only for the screenshot at the end. `?flat=1`
is fast but does **not** expose `window.__os`/`__ledger`/`__spine` — do not use it for probes. On the lead's Mac use the
puppeteer-core setup of `tools/stills.mjs`; here the launch args were
`--no-sandbox --use-gl=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --autoplay-policy=no-user-gesture-required`.
URL: `http://localhost:<PORT>/?reinterp=1&debug=1&descent=0&home=0&kiosk=0&era=2` (`era=1..4`; `kiosk=1&idlescale=4` makes the
idle cycle 20 s / 40 s). Read state from `window.__os` (private fields are reachable in JS: `os.hits`, `os.toast`,
`os.messagePending`, `os.caleb`, `os.startPanels.e2.open`, `os.sendOffer`, `os.desktopEra`), `window.__ledger()` (a copy),
`window.__spine().step`, `window.__attract.state()`. Press as a human does: find the rect in `os.hits` and call
`os.handleClick(x+w/2, y+h/2)` (or `page.mouse.click` on its projected point). **Two traps seen:** after ~15 s idle the Word of the
Day modal (`wotd-ok`) sits on top and swallows presses — dismiss it first; and `await wait()` in probes must be sized to the fps.

---

## G1 · Blockers (port 3220) — must be mergeable alone

*His words (OPENING_NOTES §G1, 15 Oct): "In 2003 everyone got blocked: after Caleb's video, Caleb's message never arrived. Also: 'you close
the What to do [panel] and it breaks, no Caleb appears.'" · "The screensavers keep taking the piece out of full screen." · "Restart goes to
`#home-armed` and leaves full screen (it reloads the page) — restart must keep full screen." · "1997: the mIRC window's close box (X) does not
work, and it is the only way to reach the fellowship form." · "1997: 'If you are struggling, start here' is not showing."*

### What the cloud session found (so you do not have to rediscover it)

**1 · Caleb never arrives — REPRODUCED, cause named.** On `origin/reinterp` at `?era=2`: (a) close the "What to do" panel (`startpanel-close`)
or leave it open — *the result is the same*; (b) finish the story (`os.openTestimony(); os.testimony.onFile('testimony-online'); os.testimony.onDone()`);
(c) the spine offers the first summons (`sendOffer: 's1'`, `__spine().step === 'e2_s1'`); (d) press `wotd-ok` if up, then `icon-send` → `send-decline`
(or `send-go`). Result: `ledger.sends = ['s1:declined']`, **`os.messagePending === false`, no toast, no Messenger icon, `os.caleb === null`** — thirty seconds
later the spine has simply moved on to `e2_s2`. Caleb never lands. And since the residue (`ledger.caleb … 'residue'`) is 2003's only exit, 2003 cannot end.
**Cause:** `src/desktop/os.ts` `maybeLandMessage()` (≈L1336) has, since S226 (`a45f597`, "the summons first, then Caleb"), the guard
`if (!ledger.sends.some(s => s.id === 's1' && (s.outcome === 'visited' || s.outcome === 'declined'))) return;`. It is called **once**, from
`this.testimony.onDone` (≈L1284) — the very instant `testimony-online` is filed. But `src/narrative/spine.ts` (`case 'e2'`, ≈L187) offers `s1` only *after*
`testimony-online`, so at the one moment `maybeLandMessage` runs, `s1` can never be resolved yet; and `os.onSendResolve` (`src/engine/app.ts` ≈L1023) and
`resolveSend` (`os.ts` ≈L1776) never call it again. The only other caller is the debug jump. It is **not** the F1 merge (toast holding, `clearDeskForCaleb`)
and **not** the start panel: `clearDeskForCaleb` only runs once Caleb exists, and `startPanels.e2.close()` is harmless — those would matter only after the fix.
The lead's "after Caleb's video" is the story's end (`ts-done`); "close the What to do and it breaks" is the same defect seen from a different click path.

**2 · Fullscreen — REPRODUCED, cause named.** With `kiosk=1&idlescale=4` the page entered fullscreen (`document.fullscreenElement` true) and the
screensavers (stars, text, lexicon, lambs, flock) **kept it** for the whole attract phase. It was lost at the idle clock's RETURN
(10 min real / 40 s scaled): `src/frame/attract.ts` `freshVisit()` ends in `window.location.reload()`, and **a reload always leaves fullscreen**. Every other
exit is the same: `src/frame/attract.ts` `startAgain()`, `src/desktop/gameMenu.ts` `doRestart()` (≈L637, which also writes `#home-armed` — meaningless under
the restore entrance, which never mounts Home), `src/engine/app.ts` ≈L959 and ≈L4911 (the Close/Library "Start again"), `src/desktop/home/lambyosHome.ts` ≈L686.
**Also READ:** under the default restore entrance **nothing requests fullscreen at all any more** — the S86 ruling ("he wants the piece to start fullscreen")
was carried by LambyOS Home's Enter (`lambyosHome.ts` `goFullscreen`) and the orienting card, neither of which the restore entrance mounts; the only entry now is
the game menu's Fullscreen row (`gameMenu.ts` ≈L506). (Esc also exits fullscreen at the browser level before the page sees it — nothing to fix, but do not rely on it.)

**3 · The mIRC window's X — READ.** `src/desktop/apps/irc.ts` `draw()` (≈L402) calls `ui.windowFrame(ctx, 14, 30, 400, 290, …, 'irc')` and **never publishes
`c.closeBox`** (compare `kit.ts` L222, `lambyRigFile.ts` L69, `mediaPlayer.ts` L60, which push `{...c.closeBox, id}`), and `IrcApp.handleClick` has no close
branch. The X is drawn and inert. The window (x 14–414, y 30–320) covers the 1997 icon column (x≈10), so the **Family Form icon** (`icon-provotype-intake`,
`os.ts` ≈L2636, drawn at (10,152) once `formAvailable`) is hidden under it. (The minimise box does exist — key `'irc'` — but the lead found the X.)
Same pattern, **audit them**: `diary.ts`, `packet.ts`, `web1997.ts`, `netvision.ts`, `restorify.ts`, `caleb.ts`, `update.ts`, `graceQueueLite.ts` call `windowFrame` and
publish no close box — most are *meant* to be unclosable (felt / mandatory / ritual); the 1997 desktop windows the player opens by choice (`irc`, `web`) are not.

**4 · "If you are struggling, start here" — NOT REPRODUCED.** I could not get 1997 to reach its desktop in a headless probe at `?era=1` (it sits in the
opening profile; a human clicks through). So this part is *read + decided*: see item D below.

### Prompt

```
TASK = opening-blockers. Five defects found by the lead at the opening (15 Oct 2026), the first two of which stopped every visitor. Read CLAUDE.md, then
docs/reinterp/PROMPTS_CODEX_OPENING_2026-10-15.md §G1 ("What the cloud session found"). REPRODUCE EACH ONE FIRST on a clean checkout of reinterp (probe
recipes in that file's "How to probe fast"); save the failing probe's output under out/opening-blockers/before/, then fix, then save the passing output under
out/opening-blockers/after/. No full walk until the very end.

A. CALEB NEVER ARRIVES (src/desktop/os.ts; src/narrative/spine.ts is read-only context).
   Make his arrival independent of ORDER. Add one private method on DesktopOS, `deliverCaleb()`, called once a frame from the update loop where
   `maybeWotd()` / `maybePause()` are called, doing exactly: if `desktopEra==='e2'` and `e2Stage==='active'` → `this.maybeLandMessage()`; then, if
   `messagePending && !messageNoticeShown && !this.caleb && this.desktopIdle() && this.screenFacing && !this.sendOffer` → `this.maybeAnnounceMessage()`.
   Keep the testimony.onDone call as it is (harmless, idempotent). `maybeLandMessage` keeps ALL its guards (testimony-online filed, s1 answered, once per session) —
   do not weaken the S226 rule "the summons first, then Caleb". Also call `this.maybeLandMessage()` at the end of `resolveSend()` so the frame after s1 is
   answered is the frame he lands. Check by reading that nothing double-announces: `messageNoticeShown` already guards it; `sendOfferPending` already holds the
   spine while his door-toast is up (`toast.act==='message-open'`), so s2 will not land on top of him.
   Order of the experience that must result: story online → summons s1 (answered either way) → ≈ a beat → Lamby's one-line toast "A message came in…" with its
   door → the Messenger's unread mark on the desktop (kept if the toast is ignored) → his window. If the player visited s1's room (a dolly turn), the toast
   waits until they face the screen again (the toast already only spends life while `screenFacing`).
   Also verify the "What to do" panel path both ways: panel left open, and panel closed with its X, and closed with its own Close button — Caleb must arrive in all three.
   PROBE (400×225; dismiss `wotd-ok` whenever it is in `os.hits`):
     load …&era=2 → wait for `os.startPanels.e2.open` → (variant A leave it / B press `startpanel-close` / C press its Close) →
     `os.openTestimony(); os.testimony.open=false; os.testimony.onFile('testimony-online'); os.testimony.onDone();` →
     wait until `os.sendOffer?.id==='s1'` → press `icon-send` (if `!os.sendOffer.open`) then `send-decline` → within 20 s (probe seconds) assert
     `os.messagePending===true` AND (`os.toast?.act==='message-open'` OR the `icon-messenger` hit exists) → press `toast-act`/`icon-messenger` → assert `os.caleb` is set and
     `__ledger().caleb` has an `opened` entry. Repeat once with `send-go` (visited). All three variants × two answers must pass, console clean.
   Then run the same probe with `&cut=speedrun` (testimony.ts L161 files tapes+cut at once; the path to `testimony-online` is shorter but ends in the same onDone).

B. FULLSCREEN SURVIVES EVERYTHING. New file src/frame/fullscreen.ts exporting: `isFullscreen()`, `requestFullscreenSoft()` (the existing goFullscreen body from
   lambyosHome.ts — try/catch, swallow the rejection, never throws, no-op if already fullscreen or unsupported, e.g. iPhone), `markFullscreenForReload()` and
   `reenterFullscreenIfMarked()`. NO storage: the marker is the URL only — `markFullscreenForReload()` does
   `history.replaceState(history.state,'', pathname + search-with-fs=1 + hash)` just before a reload when `document.fullscreenElement` is set, and
   `reenterFullscreenIfMarked()` reads `fs=1`, deletes it at once with replaceState (a later reload is a fresh visit), and returns true if it was set.
   New file src/frame/restart.ts exporting ONE `restartVisit({ armed?: boolean })` used by every reload site: wipeLedger(); strip review params (`era`, `morph`, `close`,
   `reveal`, `cut`, `setup`) exactly as attract.ts `freshVisit` strips them; REMOVE the `#home-armed` hash when the restore entrance is the front door (it is not
   mounted, so the hash is dead and visible in the address bar — keep it only for `?entrance=home`); call `markFullscreenForReload()`; reload (with the headset branch of
   attract.ts: end the XR session first). Replace the reload code in: attract.ts `freshVisit` + `startAgain`, gameMenu.ts `doRestart`, app.ts ≈L959 and ≈L4911,
   lambyosHome.ts ≈L686 (grep `location.reload` to be sure of every site; `leaveForGood`'s fallback may keep its plain reload).
   At the wake screen, the FIRST press or key (src/engine/app.ts ≈L3652 `restoreEntrance.press()` path, and its pointer equivalent — find them; a keydown other than Escape and a
   pointerdown are both valid user activations) calls `requestFullscreenSoft()` ONLY IF `reenterFullscreenIfMarked()` returned true OR the visit is a first visit on a device that
   can (restores the S86 ruling "start the piece fullscreen"; skip on phones where the API is absent; the lead can strike the first-visit half). Be explicit in the report which
   half did what. Honest limit to state in the report and in README: a reload cannot keep fullscreen *by itself* — there is a moment (the page loading, the wake starfield
   showing) where the browser is windowed until the visitor's press brings it back; in a Chrome kiosk (`--kiosk`/F11) fullscreen never drops at all, which is how the exhibition
   machine runs. (Do not attempt a soft in-place restart this round.)
   PROBE: kiosk=1&idlescale=4 → click once with a pointerdown listener that requests fullscreen → assert `document.fullscreenElement` stays set through the whole attract phase
   (it did before the fix) → at the idle return the page reloads → assert the URL no longer carries `era`/`#home-armed` and carries NO leftover `fs=1` after the first press →
   press once on the wake screen → assert `document.fullscreenElement` is set again. Repeat through the game menu's Restart and through `startAgain` (Start from the beginning? → Start).

C. 1997 mIRC's CLOSE BOX (src/desktop/apps/irc.ts + os.ts). In `IrcApp.draw` push `{...c.closeBox, id:'irc-close'}` into a new `closeRect` the app owns (publish it
   the way kit.ts does, so tools/walk.mjs's structural scan finds it), handle it first in `IrcApp.handleClick`, and give the app `onClose?: () => void`;
   os.ts `joinChannel` sets `this.irc.onClose = () => this.minimiseWindow('irc')`. The X therefore = the minimise box: nothing is lost, the channel keeps its
   state, the taskbar button and the `icon-irc` icon bring it back, Rob's escalation clock still runs (`escalate()` is not tied to `open`). While a DM request,
   a DCC send or Rob's picture (`requestPending`, `sendPending`, `yesOpen`) owns the window the X must not close it from under the question: let it close only when
   `replyRects` holds no `dm-accept`/`dcc-accept`/`reply:*` (a live question is never dismissable by the X — the tray has the minimise box for that).
   Then AUDIT the other 1997/2003 windows listed in "What the cloud session found §3": for each `windowFrame` caller that is a window the player opens by choice
   (web1997 `Web1997App`, diary excluded — it is felt), either publish the close box or add a one-line comment saying why it is deliberately inert. Report the table.
   PROBE (era=1 reached from the walker's shortcut or by clicking through the profile): open the channel, press `irc-close` → `os.irc.open===false`, taskbar button present,
   `icon-provotype-intake` hit now exists once `os.formAvailable`; press the icon → the form opens; `icon-irc` → the channel is back with its scrollback.

D. 1997 "IF YOU ARE STRUGGLING, START HERE". First report (in REPORT.md, with a screenshot) whether 1997's "Getting Started" card (`src/desktop/apps/startPanel.ts`, era 'e1',
   `os.startPanels.e1`, `startPanelCalm()` ≈L1113) opens ≈1.5 s after the desktop is calm; if it does not, name the guard that blocks it and fix that guard (not the card).
   Then add the line the lead quoted to 1997's Fellowship page as the programme's invitation: new key `portal.start` in data/dialog/s1_browser.json =
   "If you are struggling, start here." drawn in src/desktop/apps/web1997.ts (the portal page, `portal.heading`/`welcome`/`join`) as a bold navy line directly above the Join button,
   made part of the Join button's hit rect (pressing the line = pressing "Join #stillstruggling"). Programme voice, era-1 palette only (ERA1 from src/desktop/theme/era1.ts), FILTER_NEAREST,
   integer positions, no new colours. It files nothing. If the same words must also appear in the Getting Started card, they go in as its `lead` only if the card was invisible and the lead
   asks — do not add them there on your own.

RULES (CLAUDE.md): no storage of any kind (the fullscreen marker is URL-only and stripped at once); no runtime network; every new display string in data/strings or data/dialog;
Win95 chrome from src/desktop/theme/chrome.ts; felt scenes untouched; nothing here is filed in the ledger.
Checks: tsc; npm test; screenshots (1280×720) of: the 1997 portal page with the new line; the mIRC window with the X pressed (the desktop with the form icon visible); the 2003 desktop
when Caleb's toast is up; all in out/opening-blockers/. FINISH WITH ONE walk only: `node tools/walk.mjs --port 3220 --max 2600 --require-close` under caffeinate -i (it must still reach the Close).
Report: the five before/after probe outputs; the list of every reload site changed; the audit table of windows; anything you could not verify (fullscreen on iPad/iPhone; XR).
```

---

## G2 · Lamby the guide, from 1997 — and the setup (port 3221)

*His words (OPENING_NOTES, 15 Oct): "We need to reinstate Lamby as the connection point of the correction and forcing you to do stuff." — "Lamby becomes a Clippy-style guide FROM 1997
(pop-up balloon with Yes/No, hints when you stall, an offer to take you to where to press; always ignorable, so a visitor can explore instead)." — (6) "Lamby in every era from 1997 as the Clippy-style guide:
what to do next; hints when you stall ('Have you checked the Start menu?'); an offer to take you there (a pointer/highlight on the thing to press, or doing the step for you); always ignorable. Use real tutorial
practice (just-in-time hints, escalating help after inactivity, show-don't-tell, one step at a time)." — (7) "when Rob talks about the form, Lamby offers to open it directly ('Want me to open the form for you?'), not a
hunt through a website." — (8) "The setup (LambyOS Setup with Lamblippy): add 'Work in progress' (as Lamblippy's line, plus where to report problems); teach the Start menu there; REMOVE 'About this project' from the setup
(it belongs to the Credits / the Close)." — (9) "The clock in the setup is good (keep)." His reference is Microsoft's Clippy: the PATTERN only — balloon, buttons, a pointer — drawn as Lamby; nothing of Microsoft's is copied.*

### The ruling to record: CLAUDE.md R28 §2 (his revision, 2026-10-15)
Replace the current paragraph 2 of "REINTERP AMENDMENTS" (it begins "**Guidance (revises the Assistant caps):** Era 1 has NO assistant character…") with:

> 2. **Guidance (revises the Assistant caps):** ⚑ **REVISED 2026-10-15 (Sérgio, after the opening: "We need to reinstate Lamby as the connection point of the correction and forcing you to do stuff.")**
> Lamby is a Clippy-style guide **from 1997**: a pop-up balloon with Yes/No, hints when the visitor stalls, and an offer to take them to what to press — always ignorable, so a
> visitor can explore instead. The 1997 impersonal side-messages (src/narrative/guide.ts) stay as the taskbar line; Lamby is the character that offers, points and, if asked,
> does the step. Unchanged and non-negotiable: never during `felt` scenes, never jokes at the victim, never delivers Dossier text, dismissal always works and is logged.
> Unsolicited offers keep the cap (≤5 per era); help the visitor asks for (the tray Lamby) is not capped. *(Replaces: "Era 1 has NO assistant character — only impersonal
> system side-messages… The Lamby character-conductor debuts with the Era-2 update and conducts thereafter, ≤2 lines per conduction beat.")*

Also fix the one line in CLAUDE.md's header block that says the Assistant is "absent in Stages 0–1" (it is now absent only in *felt* scenes and before the setup ends), and add the date to the line at "Tone & register laws".

### Prompt

```
TASK = lamby-guide. Read CLAUDE.md, docs/reinterp/OPENING_NOTES_2026-10-15.md, docs/reinterp/PROMPTS_CODEX_OPENING_2026-10-15.md §G2 (the lead's words and the ruling are quoted there), then
src/narrative/guide.ts (1997's impersonal side-messages — keep), src/frame/helper.ts (the frame's idle helper — keep), src/witness/map.ts (`mapState`, `nextHint`, `beatDone`),
data/strings/map.json (the beats, with `hint`, `where`, `optional`, `quiet`), src/desktop/os.ts (`drawLambyDialog`/`drawLambySeated`, the 2003 Lamby, `fileLambyRecord`, `ledger.assistant.dismissals`,
`pressStart` ≈L2396, `drawStartMenu` ≈L2349, the taskbar ≈L2784 where the button reads 'MENU'), src/desktop/apps/lambyChar.ts (`drawLambyChar`, moods, actions 'idle'|'point'|'appear'|'disappear'),
src/room/graceQueueLite.ts (`lambSay`, Lambient's lamb, the aero taskbar `drawTaskButton` ≈L1724), src/desktop/apps/browser.ts (`sayLine`, GraceOS), src/desktop/setup/setup.ts + data/strings/setup.json (the setup).
Build Lamby as ONE guide with four skins. FIRST update CLAUDE.md as written in §G2 "The ruling to record" (quote his words, date 2026-10-15).

A. THE ENGINE — new src/narrative/lambyGuide.ts (pure logic, no drawing; unit-testable). It owns a small state machine per era, reading `mapState(os)` (the current beat) and idle time:
   LADDER (just-in-time, escalating, one step at a time; every threshold is data in data/strings/lambyGuide.json `timing`, scaled by the helper's `idleScale`):
     L0 silent while the visitor is doing things (any press/drag/key resets the clock).
     L1 `cue` (after 25 s still): Lamby's small head in the tray lifts and blinks — no text, no sound.
     L2 `tip` (after 50 s): the balloon with the step's tip and [Show me] [No thanks].
     L3 `show` (pressed Show me): the POINTER — a pixel ring in the era's accent colour pulsing around the target rect (3-frame cycle, 1 px steps, integer positions), plus a pixel arrow in 90° steps
        from Lamby to the target; the balloon becomes the step's `here` line with [Take me there] [Got it].
     L4 `again` (a tip was dismissed and the visitor is still stuck after 90 s): the step's second line; after THAT, the stall line "Have you checked the Start menu?" with the pointer on the Start button —
        once per step. Then Lamby is silent for that step until the step changes. No fifth rung: it never nags.
   "Take me there" performs the step's `act` (data): `press:<hit id>` (call `os.handleClick` at the centre of that rect, exactly as `pressStart` does for programs), `open:form` (os `openProvotype(originIntakeProvotypeData)`),
   or `move:<node>` for things in the 3D room (the piece's existing scripted turn — find it via src/room/movementNodes.ts / `__requestMove` in app.ts; the rule is "we take the viewer there"). It never types for the
   visitor, never chooses an answer in a story window, never presses an answer to Rob, a check-in, a story topic, the release, or a take: those are the person's.
   CAPS AND SILENCE: ≤5 UNSOLICITED balloons per era (L2/L4 count, L1 and the tray do not); help the visitor asks for by pressing the tray Lamby is not capped (it speaks the current step's tip, then the pointer).
   Lamby is SILENT (no cue, no balloon, no pointer, tray hidden) whenever: `mapState(os).quiet`; a `felt` window is open (`os.caleb`, the residue, `os.testimony?.playbackActive`, the Family Form's states, `os.accountability`
   (the alert), `os.yesOpen` (Rob's picture), `os.pauseOpen`, the update ritual `os.updateApp`, an open send offer); the Close; the frame's game menu; `register: respite`. One voice at a time: while a 1997
   side-message (guide.ts) or 2003's Lamby conduction line or a toast is on screen, Lamby waits; while Lamby's balloon is up the frame helper (src/frame/helper.ts) stays silent on the desktop (add a
   `lambyGuide.active` check to its `enabled`), and the helper still serves the headset plate.
   LOG: pressing No thanks, the balloon's × or Got it: `ledger.assistant.dismissals += 1` (No thanks/× only) and `fileLambyRecord('dismissed', 'guide:<beat>', …)` the way os.ts does for the 2003 notices; Show me /
   Take me there file `'begun'`. Memory only, wiped with the ledger. Nothing is stored.
   THE FORM OFFER (the lead's example): when `os.formAvailable` becomes true (Rob has said he spoke with the mother) and the form has not been opened, Lamby offers ONCE, without waiting for a stall, with the balloon
   below and the act `open:form`; after the form opens Lamby is silent (the form has felt states). This is the only unsolicited offer that skips the ladder.

B. THE DRAWING — one helper src/desktop/apps/lambyGuideDraw.ts: `drawLambyGuide(ctx, skin, state, hits)` called last in each surface's draw (above windows, below the frame's toasts):
   - 1997 (`e1`) and 2003 (`e2`): in src/desktop/os.ts after the windows (≈L2728): Lamby seated bottom-right above the taskbar tray, scale ~0.5 via `drawLambyChar` (mood 'cheerful'; action 'point' while pointing),
     with a yellow Win95 tooltip-style balloon (ERA1.tooltip ground, ERA1.black 1 px border, a 6 px tail toward Lamby, bevelled buttons from chrome.ts `button`) — the SAME balloon grammar Lamblippy has in the setup
     (reuse its drawing from src/desktop/setup/setup.ts; extract it, do not copy). 2003 uses the same grammar on the XP-era paper (ERA1.paper) as the other 2003 windows do.
   - 2016 (`e3`): in src/room/graceQueueLite.ts, Lambient's lamb: the aero glass card from src/desktop/theme/era3.ts (`aero.px`/`aero.button`, ERA3.glassEdge, accent rule), tail toward the tray.
   - 2026 (`e4`): in src/desktop/apps/browser.ts: GraceOS's paper card (CHROME.field/fieldEdge/button from src/desktop/theme/era4.ts), flat, one filled control, with Lamby's small head (drawLambyChar head only) — do NOT invent
     a new character.
   Hit ids (published like any window's, so tools/walk.mjs sees them): `lg-show`, `lg-later`, `lg-take`, `lg-ok`, `lg-x`, `lg-tray` (the tray Lamby, always present on the taskbar except in silence, label "Lamby").
   Palettes only from src/desktop/theme/; FILTER_NEAREST; integer positions; 90°-step rotations only; no easing curves on the pointer (it steps). No sound for Lamby. Reduced motion (`reducedMotion()`): the pointer is a static ring.

C. THE WORDS — all in new data/strings/lambyGuide.json (programme voice: short, cheerful, "you", never about the felt content, never a joke at anyone, no exclamation mark pile-ups: one per line at most).
   `ui`: show "Show me" · later "No thanks" · take "Take me there" · ok "Got it" · tray "Lamby" · trayTip "Need a hand? Press me." · here "It's right here!" · nothing "You're doing fine. Carry on!" · startNudge "Have you checked the Start menu?"
   `timing`: cueSeconds 25 · tipSeconds 50 · againSeconds 90 · capPerEra 5.
   Per era and per step — `tip` (L2) · `here` (L3) · `again` (L4) · target (hit id) · act:
   1997 (e1, Win95 Lamby):
     kit      tip "There's a disk on your desktop! Press the A:\ icon to start."            here "That's the one. The A:\ icon."                    again "The disk is still waiting. Shall I point to it?"                        target icon-a            act press:icon-a
     read     tip "Read the programme, then press Done."                                      here "Done is at the bottom of the window."            again "Take your time. When you've read it, press Done."                         target the kit's Done/next hit (find the id in kit.ts)     act press
     pray     tip "Next is the tape. Press Play and follow the words."                         here "Play is right here."                              again "The words stay on screen. You can start whenever you like."              target the kit's play hit
     pledge   tip "A pledge card! Sign it, or set it aside — either way you can go on."       here "Sign it here, or set it aside."                   again "Not sure? Setting it aside is fine."                                       target the card's two hits
     connect  tip "Now we go online. Press Connect and the wizard will dial."                 here "Connect is the big button."                       again "The wizard is ready when you are."                                         target the kit's connect hit
     web      tip "This is the fellowship's page. Press Join to go to the channel."           here "Join is right here."                              again "Look around first if you like. Join will still be here."                 target the portal's Join (web1997.ts)
     channel  tip "The chat is waiting. Press the line at the bottom to answer."              here "That's your answer line."                         again "Or just read on — the chat moves by itself."                              target irc `reply:0`   (L2 only AFTER a 50 s stall; no L4)
     form     (the one-time form offer)  "Rob mentioned the Family Form! Want me to open the form for you?"   buttons [Open it] [No thanks]   act open:form
   2003 (e2, XP-era Lamby, Restorify):
     checkin  tip "Restorify's daily check-in is on the desktop. Press the Restorify icon."   here "It's the icon in the top corner."                  again "A tick or two is all it takes."                                            target icon-restorify
     story    tip "There's a new video waiting: Your Story. Press it to begin."                here "Your Story is the icon with the little dot."     again "Your Story is waiting. Shall I point?"                                    target icon-story
     release  tip "Nearly there! Read the release, then press Agree."                         here "Agree is at the bottom."                          again "The release is already filled in for you."                                 target the release's agree hit (testimony.ts)
     tapes    tip "Play your take through to the end, then send it to editing."               here "Play is here. Editing is the next button."       again "I'll wait. Press Play when you're ready."                                  target the tapes hits
     cut      tip "The programme is cutting your story. Sit tight!"                            (no target, no again — informational, shown once)
     online   tip "Your story is ready. Press Watch to see it online."                         here "Watch is here."                                   again "Your story is waiting for you."                                            target the notice's hit
     send     tip "You have a summons. Press the envelope on the desktop."                     here "The envelope is on the left."                     again "It won't take long. The envelope is on the left."                         target icon-send       act press:icon-send
   2016 (e3, Lambient's lamb):
     signin   tip "Welcome to GracePlatform! Press Sign in to begin your first shift."         here "Sign in is right here."                            again "Your shift starts when you sign in."
     consent  tip "Lambient has a quick question. Answer it and we're off."                    here "Your answer goes here."                            again "Either answer works — Lambient carries on."   (a note for the walker: both answers must remain equal)
     work     tip "Pick a card on the board and work it through to the end."                   here "Any card will do. Start with the first."          again "One card at a time. The first one is fine."
     phone    tip "Your phone has a message. Pick it up from its stand."                       here "It's on its stand, to your left."                  again "Shall I take you to the phone?"                                            act move:phone
     vote     tip "The group sent a link. Open it when you're ready."                          here "The link is on the phone."                         again "The link is waiting."
   2026 (e4, GraceOS):
     browser  tip "Your session is back. Press the browser to look around."                    here "The browser is on your desktop."                   again "Your session is waiting in the browser."
     results  tip "Press Search and let the engine finish it."                                 here "Search is right here."                              again "It finishes by itself. You only press once."
     program  tip "Open the first result to begin."                                            here "That's the first result."                           again "The first result is the one to open."
     steps    tip "L has a question. Answer it one step at a time."                            here "Your answer goes here."                             again "One step, then the next."
     headset  tip "Time for the headset. It's on the desk — shall I take you there?"           here "It's on the desk."                                  again "Shall I take you to the headset?"                                          act move:headset
   The FORM OFFER's own strings go in `form`: text "Rob mentioned the Family Form! Want me to open the form for you?" · yes "Open it" · no "No thanks".
   Drafts are Claude's; the lead edits. Use them verbatim; if a target hit id does not exist yet in the code you read, find the real one and say so in the report — never a guess.

D. THE SETUP (src/desktop/setup/setup.ts; data/strings/setup.json) — the lead's item 8:
   1. REMOVE "About this project" from the setup: the balloon "Want to know what this place is?", the `about` window (`WindowKind 'about'`, its drawing and `aboutPage`), the "About this project" desktop icon in
      `icons`, and its hit rects. Move the paragraphs VERBATIM to new data/strings/about.json (keep "More to be added soon.") and show them in two places that exist outside the setup: the Close's plaque
      (home.json `return.plaque` already carries the explainer — leave it) and a new first row "About this project" in the game menu's Credits & attributions view (src/desktop/gameMenu.ts, frame voice, plain text).
   2. ADD the Work-in-progress line, as Lamblippy's balloon, immediately after the greeting (balloon 2 now). Words:
        text: "Quick heads-up: I'm still being finished! If something gets stuck, press Esc for the menu, or reload the page."
        buttons: [Got it]
        and a second line in the same balloon, smaller: "Found a problem? Tell us: {report}"   — {report} comes from setup.json `report` ("[ADDRESS TO COME FROM THE LEAD]" until he sets it; if the value
        still starts with "[" render only the first sentence and list it under "Needs the lead" in your report).
      (The wake screen already carries the frame-voice version of this, entrance.json `wip`; keep it. Lamblippy's is the programme voice; the report address is the frame's fact, so it stays in plain words.)
   3. TEACH THE START MENU (new balloon, after "Which sounds…/How to look", before the content note): the setup's taskbar already draws an inert "Start" button (≈L246 `ui.button(ctx, 4, 360, 54, 21, copy.startMenu)`).
        text: "This is the Start button. Press it any time to see what to do next, and what's on the desktop. Try it!"     buttons: [Show me] [Later]
        [Show me] makes the button live for this step only: pressed, a small demo menu opens above it with the REAL section heads from data/strings/slice.json `desktop.startMenu` (Now · Programs · In the room, sample rows
        in grey, nothing pressable except to close), the pointer (§B) ringing the button first, and the balloon becomes: "That's it. Everything you can do is in there." [Got it].
        If G3 has not merged yet, the sentence above is true as written ("what to do next, and what's on the desktop"); G3's prompt updates it.
   4. REFACTOR the step indices to named steps (greet, wip, whose, sound, look, start, note, version, advert, allset) while you are in the file — the file currently uses `this.step === 3/4/5/6/7/8` and
      tools/walk.mjs waits for `setupStage === 'balloon-9'` (≈L455); adding and removing balloons would silently break both. Keep `stage` strings stable as `balloon-<n>` for the walker or update the walker in the same commit.
   5. THE CLOCK STAYS (item 9): do not touch `clock`/the taskbar clock drawing.
   6. Lamblippy stays text-only, no sound, the programme's voice; she never states the content note, facts or sources.

E. THE TASKBAR BUTTON LABEL. The 1997/2003 taskbar button reads 'MENU' (os.ts ≈L2784). Lamby's lines say "Start menu": rename the button to "Start" (data/strings/slice.json `desktop.startMenu.button`: "Start"; keep the hit id
   `start-menu` so the walker and G3 do not change). 2016 and 2026 get their Start button in G3; until then Lamby's stall line points at the nearest equivalent (the era's own menu/“?” chip if it exists) or is skipped there.

RULES: CLAUDE.md in full — the Assistant is absent in felt scenes and never delivers dossier text; dismissal always works and is logged; era palettes only; Win95/XP/aero/GraceOS chrome per era; the frame's voice
(helper, content note, facts) and Lamby's voice (programme) stay apart: never the same words, never both at once; no storage; no network; no sound; words in data/strings; `[VERIFY SOURCE]` untouched.
Checks (HUMAN PATH, headless probes at 400×225 on port 3221, see "How to probe fast"):
 1. `?era=2`: do nothing for the L2 time (scaled with the helper's idleScale; use `?idlescale` if needed) → `lg-show` appears with the 2003 `checkin` or `story` tip; press `lg-later` → `ledger.assistant.dismissals===1`, no balloon; wait the L4 time → the second line;
    then the Start nudge once; then nothing more for that step. Assert at most ONE of {Lamby balloon, frame helper plate, toast} is on screen at any frame (sample 50 frames).
 2. Same, press `lg-show` → pointer present on `icon-restorify` (assert the ring's rect equals the hit rect ±2 px) → press `lg-take` → the Restorify window opens (the act performed).
 3. 1997: `os.formAvailable=true` forced via the same ledger line the game files (use the real path: Rob's "i spoke with your mother" line — or the debug beat if the walker has one, say which) → the form offer appears once without a stall; `lg-take` opens the form;
    after that no Lamby while the form is open; closing the form → no repeat.
 4. Silence: open the Messenger thread (`debugJump('calebChat')`) → no cue, no balloon, tray hidden; during `testimony.playbackActive` the same.
 5. The setup (`?setup=1` review route): the balloon order greet → wip → whose → sound → look → start → note → version → advert → allset; no About icon, no About window; the Start step's demo menu opens and closes; the WIP text shows only its first sentence while `report` still starts with "[".
 6. Screenshots at 1280×720 and 390×844 of: the 1997 balloon with the pointer; the 2003 balloon; the 2016 card; the 2026 card; the setup's WIP and Start steps; the game menu's new About row → out/lamby-guide/, LOOKED AT next to the setup's Lamblippy (same grammar).
 7. tsc; npm test; `node tools/walk.mjs --port 3221 --max 1400 --one-era` reaches 2003 (the walker must not press `lg-*` unless it is the only way on: add `^lg-(later|x)$` to its FORBIDDEN-or-ignore list the way other optional controls are handled — say what you chose).
Report: every new/changed string as a numbered BEFORE/AFTER list (CLAUDE.md edit included, as a diff); the table of steps → real hit ids; what you could not verify (the headset's 3D targets).
```

---

## G3 · The Start menu as the map (port 3222)

*His words (OPENING_NOTES §G3): "The Start menu (each era's OS) becomes the guide: every action you can do, in order, from the beginning (ticks for done), and a way to JUMP between all the experiences (the eras / chapters) for anyone." —
"The 'what to do' panels (1997, 2003; check 2016 and 2026 have them) are always one press away, from the Start menu and a taskbar button. In 2003 it is 'very good' — keep it, make it always accessible, with Lamby as the guide."*

**What exists (READ).** 1997/2003: `src/desktop/os.ts` `drawStartMenu` (≈L2349) draws NOW / PROGRAMS / IN THE ROOM / Shut Down… / Leave… from `mapState(this)`; `pressStart` (≈L2396) answers it; the taskbar button
says 'MENU' (G2 renames it "Start"). The "what to do" panels: `src/desktop/apps/startPanel.ts` — **all four eras have them** (`os.startPanels.e1/e2`; 2016 `graceQueueLite.ts` ≈L510 `new StartPanel('e3')`, a card or a strip;
2026 `browser.ts` ≈L168 `new StartPanel('e4')`), each opening once after 1.5 s calm; `os.ts` L1361 closes 2003's when Caleb comes; once closed (`close()` → `seen=true`) **nothing reopens it** — and the 2003 one is closed by
`clearDeskForCaleb`, so it cannot be recovered. **2016 and 2026 have no Start menu** (`aero.taskbar` has one job button; GraceOS has a browser chrome). The map (`src/witness/map.ts`) already knows every beat in order with
`done` conditions and `optional` flags. An in-place jump already exists: `src/engine/app.ts` `jumpToEraSettled(era)` (≈L4820; used by `?era=`, the debug panel and the Close's era computers via `leaveClose`).

### Prompt

```
TASK = start-menu-map. Read CLAUDE.md, docs/reinterp/OPENING_NOTES_2026-10-15.md, docs/reinterp/PROMPTS_CODEX_OPENING_2026-10-15.md §G3 (his words and "What exists" are there), then src/desktop/os.ts (`drawStartMenu`, `pressStart`,
`startPanels`, the taskbar ≈L2784, `clearDeskForCaleb` ≈L1352), src/desktop/apps/startPanel.ts, src/witness/map.ts + data/strings/map.json, data/strings/slice.json (`desktop.startMenu`), data/strings/startPanel.json, src/room/graceQueueLite.ts
(the aero taskbar ≈L1267, `drawTaskButton` ≈L1724, the panel at ≈L510–537 and L1478), src/desktop/apps/browser.ts (the panel at ≈L168/L624), src/state/gameMenuBus.ts, src/desktop/gameMenu.ts (the "Where you are" view), src/engine/app.ts `jumpToEraSettled`/`leaveClose`.
G2 (Lamby the guide) is merged: the button is already called "Start" and Lamby's stall line points at it. Build, in all four eras, ONE Start menu that is the piece's map and guide.

A. THE MENU'S CONTENT — the same four-part model in every era (the era's own chrome; the words from the map + the strings below):
   1. NOW — the current beat (label + its hint, as today).
   2. NEXT — the next two beats after it (label only, grey), so the order is visible without opening anything.
   3. "All the steps…" — opens the era's WHAT-TO-DO window (B) listing EVERY beat of the era in order from the beginning, ticked when done (`mapState(os).eras.find(e=>e.here).beats`, state done/current/ahead), the current one marked, optional beats
      marked "(extra)", and for a beat that lives away from the screen its place ("In the room: the handheld, on the bed") using the existing `roomPrefix` words. It reads the cut: the Speedrun/guided version lists only the beats that version has (map.json `labelSpeedrun`/`hintSpeedrun`; G4 owns the rest).
   4. PROGRAMS (1997/2003 only: what is on the desktop, as now) · IN THE ROOM (as now) · JUMP TO… (C) · Shut Down… (refused, as now) · Leave… (as now).
   Section heads and rows keep the exact current look in 1997/2003 (ERA1 palette, bevel, the vertical banner); the menu may grow taller — cap at the canvas height and, if the rows exceed it, drop PROGRAMS to a "Programs ▸" row that opens a plain list (no scrolling menus).
B. "WHAT TO DO" ALWAYS ONE PRESS AWAY — in every era:
   - `StartPanel` gets `reopen()` (sets `open=true`, `seen=true`) and a `toggle()`; it no longer depends on the first-time calm timer to be reachable. The first-time auto-open stays as is.
   - A taskbar button **"What to do"** next to Start in 1997/2003 (os.ts, hit id `taskbar-whattodo`; period-true small bevelled button; ERA1), in 2016 a "?" chip at the left of the aero taskbar (`aero.button`, id `whattodo`), in 2026 a "?" control in GraceOS's top bar (CHROME.button, id `whattodo`). Pressing it toggles the era's panel (2016's strip variant included). Never greyed, never hidden except in felt scenes (G2's silence list: Caleb, the residue, a story playing, the alert).
   - "All the steps…" in the Start menu opens the FULL list window (A3); the small panel stays the 3–5 essential steps (his "very good" 2003 panel — do not change its look or its words, only make it reopenable). Both windows have a close box and a Close button published as hits (`startpanel-close` as today; `steps-close` for the list).
   - `clearDeskForCaleb` (os.ts ≈L1361) keeps closing 2003's panel — but the taskbar button and the menu now reopen it. Add nothing else to Caleb's moment.
   - The list window and the panel are NEVER drawn over a required modal or a felt scene (reuse `startPanelCalm()` for the panel; the list window is opened by a press, so it only needs the felt-silence rule).
C. JUMP BETWEEN THE EXPERIENCES, for anyone:
   - `gameMenuBus.jumpToEra?: (era: 'e1'|'e2'|'e3'|'e4') => void`, set in src/engine/app.ts to a function that: closes whatever the OS has open the way `leaveClose` does, calls `jumpToEraSettled(era)`, `spine?.reopen(era)` and sets the cut/`speedrun` state untouched. (Reuse; do not write a second jump.) The Close is reached by playing, not by jumping; the Library already has its era computers.
   - Start menu → "Jump to…" opens a sub-list in the era's chrome: the four era labels from map.json (`1997 · Daniel`, `2003 · Daniel`, `2016 · Vera`, `2026 · Maya`; the current one marked and not pressable). Pressing one opens a FRAME-voice confirm (plain, as the Shut Down refusal window is drawn) — title "Jump to {era}?", body "You will go straight there and skip what comes between. You can jump back the same way.", buttons "Jump" / "Stay here" — then calls `jumpToEra`. Dimmed (with the title "Not during this scene") while a felt window is open (the same silence rule as Lamby).
   - The game menu's "Where you are" view (src/desktop/gameMenu.ts) gets a "Go here" button on each era row: it is the frame's own door, works in any state the menu can be opened from (including mid-felt, since the frame never plays) and calls the same function after the same confirm in frame words. This is the always-available route for a visitor who is stuck anywhere.
   - Jumping files NOTHING in the ledger (it is navigation, not a choice), and wipes nothing: the map already reads an era left behind as done. Reduced motion irrelevant (a settled jump cuts).
D. 2016 AND 2026 GET THEIR OWN START MENU (new):
   - 2016 (graceQueueLite.ts): a "Start" orb/button at the left of `aero.taskbar` opens an aero glass menu (ERA3.glass*, white card, accent rule, the same four parts, rows via `aero.px`/`aero.button`). The workstation canvas is the only 2016 surface; hits go through the same `this.rects` the panel uses.
   - 2026 (browser.ts): a "Menu" control in GraceOS's bar opens a flat paper menu (CHROME.field/fieldEdge/ink, one filled control) with the same parts. No Windows chrome in 2026.
   - Both reuse one data model: extract `buildStartModel(os|partial, era)` into src/witness/startModel.ts (pure; returns now/next/steps/jump rows from `mapState`), used by all four renderers — one source of truth, no per-era copy of the logic. `os` may be absent (Vera's workstation and the 2026 browser hold no DesktopOS: use `beatDone(key, fakeOs(...))` exactly as startPanel.ts does).
E. WORDS — add to data/strings/slice.json `desktop.startMenu` (frame/machine voice: plain, never a quest log):
   button "Start" (exists after G2) · whatToDo "What to do" · now "Now" · next "Next" · allSteps "All the steps…" · jump "Jump to…" · extra "(extra)" · listLead "Everything on this list, in order:" ·
   listTitle per era: e1 "Getting Started — all the steps" · e2 "Restorify 2003 - all the steps" · e3 "GETTING STARTED — ALL THE STEPS" · e4 "EVERYTHING ON TODAY'S LIST" ·
   jumpTitle "Jump to…" · confirmTitle "Jump to {era}?" · confirmBody "You will go straight there and skip what comes between. You can jump back the same way." · confirmYes "Jump" · confirmNo "Stay here" · notNow "Not during this scene".
   Update G2's setup Start-menu balloon to the now-true words: "This is the Start button. It lists everything you can do, in order, with ticks as you go — and lets you jump to any year. Try it!" (setup.json), and its demo menu to include "All the steps…" and "Jump to…" as grey rows.
   Game menu (frame voice, data/strings/gameMenu.json): per-era button "Go here"; confirm the same words as above, in the frame's plain tone.
RULES: CLAUDE.md (palettes from src/desktop/theme only; Win95 chrome in 1997/2003, aero in 2016, flat paper in 2026; pixel discipline; no storage; no network; no new colours; felt scenes untouched; the frame never plays — the jump confirm is frame voice, the menu rows are the machine's, plain).
Checks (HUMAN PATH; 400×225 probes on port 3222; see "How to probe fast"):
 1. `?era=2`: press `start-menu` → `os.startHits` has `sm-allsteps`, `sm-jump`; press `sm-allsteps` → a list window with 17 rows (2003's beats in the full cut) and the first ticks matching `mapState`; complete a beat (use the real path or `os.debugJump`) and assert its tick appears.
 2. Close the "What to do" panel (`startpanel-close`) → press `taskbar-whattodo` → `os.startPanels.e2.open===true` again. Trigger Caleb's `clearDeskForCaleb` → the panel closes → press the button → it reopens.
 3. `sm-jump` → pick 2016 → confirm → `os.desktopEra==='e3'`, `__spine().step==='e3'`, ledger unchanged except era state (assert `__ledger().records` identical before/after). Jump back to 1997 the same way. Cancel path ("Stay here") changes nothing.
 4. 2016: press the Start orb → the aero menu lists the same four parts; `whattodo` toggles the strip/card. 2026: same in GraceOS. (Reach them with `era=3`/`era=4`; `__graceQueue()` and `__os.e4.browser` expose the surfaces.)
 5. Game menu → Where you are → "Go here" on 2026 from mid-1997 → confirm → arrives; Esc still works everywhere.
 6. Felt silence: with the Messenger thread open the Start menu's Jump rows are dimmed ("Not during this scene"); the game menu's Go here still works.
 7. Screenshots at 1280×720 and 390×844 for each era: the Start menu, the all-steps window, the jump confirm, the taskbar button → out/start-menu-map/, LOOKED AT.
 8. tsc; npm test; `node tools/walk.mjs --port 3222 --max 1400 --one-era` reaches 2003; the walker must NOT press `sm-jump*` or `steps-close` as story presses (add `^(sm-jump.*|jump-.*|go-here.*)$` to FORBIDDEN so it never travels).
Report: each new/changed string BEFORE/AFTER; a per-era table of the menu rows; the mapping of beat ids → "All the steps" rows (so the lead can see the full list for each era); what you could not verify (headset).
```

---

## G4 · One guided version, fewer clicks (port 3223)

*His words (OPENING_NOTES §G4): "People want to watch the action develop in front of them: a version with far fewer clicks, more guided and automatic (things play out; you press to go on)." — "The full and the Speedrun versions
differ too much (the helpful panels did not appear in one). Combine them: ONE guided version (the Speedrun's pacing as the spine) with the full version's optional content reachable from the Start menu for whoever wants to explore.
Turn the separate full version off (keep the code)." — "1997's form: too many questions — cut to the essential few."*

**What exists (READ + the walk).** `src/state/cut.ts`: `currentCut()` is 'full' unless `?cut=speedrun`; `chooseCut()` is called by the setup's version step (`setup.ts` ≈L183/212, balloon "Which version would you like?"), by LambyOS Home (`lambyosHome.ts` `cutChoice`)
and nowhere else. `isSpeedrun()` branches at: `kit.ts` L305/430/595 (the prayer's Amen at once; the reading pages jump to the last), `testimony.ts` L161 (tapes + cut filed at once), `startPanel.ts` (steps `speedrun:false`, `textSpeedrun`, `doneSpeedrun`),
`os.ts` ≈L2357 (the Start menu lists no room side trips), `space.ts` L388/393/826 (2026's session breath and card timing), `graceQueueLite.ts` L213/899/948 (2016: one task before the phone; the starter tools), `ball.ts` L213, `home`/`setup` (the choice).
The Speedrun walk (`docs/reinterp/WALK_2026-10-14_SPEEDRUN.md`) still took **564 presses**: 1997 144 (≈11 of them the opening profile), 2003 **275**, 2016 54, 2026 68. 1997's Family Form (`data/provotypes/origin_intake_e1.json`) has **six states**:
the father (verbatim, vdA), the father and sexual identity (verbatim), the boyhood games (paraphrase), this week's walk/talk/sit correction, the "healthy friendship" log, and the silence (no options; auto-reveals).

### Prompt

```
TASK = one-guided-version. Read CLAUDE.md, docs/reinterp/OPENING_NOTES_2026-10-15.md, docs/reinterp/PROMPTS_CODEX_OPENING_2026-10-15.md §G4 (his words, the call sites and the proposal about the form are there), docs/reinterp/WALK_2026-10-14_SPEEDRUN.md (the press counts),
src/state/cut.ts, then every `isSpeedrun()` site listed in §G4. G3 (the Start menu as the map) is merged; this prompt builds on it. Make ONE version.

A. ONE VERSION, THE OLD ONE SWITCHED OFF (not deleted).
   - src/state/cut.ts: the guided version IS today's 'speedrun' cut (keep the internal names `Cut`, `isSpeedrun()` and the `speedrun` fields in data — renaming them would touch 40 files for nothing). `currentCut()` now defaults to 'speedrun';
     `?cut=full` (a REVIEW parameter, documented in README next to `?kiosk=0`) selects the old full version; nothing in the visitor-facing UI can reach it. Update the file's header comment: "ONE version for visitors (2026-10-15, the lead);
     the full cut is kept for review behind ?cut=full".
   - REMOVE the visitor's choice of version: setup.ts (the balloon "Which version would you like?", its two buttons, `setup-choice-*` for that step, the `cut` field's UI, the `chooseCut` calls) and LambyOS Home's `cutChoice` (src/desktop/home/lambyosHome.ts; Home is not the default door but must not
     show a dead choice). Keep `startSetup()`'s resolved `{ cut }` (it now resolves with `currentCut()`), so the entrance code does not change. Delete the strings only after grep shows nothing uses them (setup.json `balloons[…"Which version"]`, home.json `speedrun` card) — keep them under a `_unused_` key if in doubt. NO ONE-LINE in the UI may say "Speedrun" any more (grep data/strings and src for the word; the Credits and the map's `labelSpeedrun` fields are internal and fine).
   - tools/walk.mjs: it chooses `setup-choice-0` for the version; update it for the new setup (one fewer choice) and make the default walk the guided one; `--cut full` keeps the old walk for review.
   - The helpful panels must appear in the one version in every era (the lead: "the helpful panels did not appear in one"): verify the start panel (A6), G2's Lamby and G3's menu behave identically under `isSpeedrun()` — write one probe that loads each era in the default cut and asserts the panel and the Start menu exist.
B. THE FULL VERSION'S EXTRAS, REACHABLE FROM THE START MENU. G3's menu gets a section **"More to explore"** (after PROGRAMS/IN THE ROOM) listing, per era, the content the guided cut skips, each pressable ONCE to switch that piece of the full version on for the rest of the visit
   (memory only: a Set in src/state/cut.ts, `enableExtra(id)` / `extraOn(id)`; the `isSpeedrun()` call sites ask `isSpeedrun() && !extraOn('<id>')`). Candidate extras — derive the real list from the `isSpeedrun()` sites, and the labels below are drafts (frame/machine voice, plain):
     e1  "The whole prayer" (kit.ts L305/430: Amen only after the full song) · "The programme in full" (kit.ts L595: every reading page) · "Side trips in the room" (the ○ beats: the racket, the handheld, Root Cause Digger — the current Start menu hides them in the Speedrun cut)
     e2  "Play your takes" (testimony.ts L161: the tapes and the edit) · "Harbor Forums" and "The application" and "CLEAR" (the ○ beats; icons may already be on the desktop — the entry just lists them with their place)
     e3  "More work on the board" (graceQueueLite.ts L213: the full count before the phone) · "The other jobs" (the ○ beats: recommend, group)
     e4  "The whole session" (space.ts L388/826: the session breath and the longer card) · "The console" (the ○ beat: MATCH MADE SIMPLE on the bed)
   Switching an extra on must be safe mid-era: it only widens what is still ahead (never rewinds a beat already passed, never removes anything). If an extra cannot be switched on after its moment has passed (the prayer already ended), list it greyed with "(already passed)".
   Words to add to slice.json `desktop.startMenu`: more "More to explore" · alreadyPassed "(already passed)" · on "(on)". Per-extra labels in data/strings/extras.json (one file; the drafts above, edited in your report).
C. FEWER PRESSES, MORE GUIDED, THINGS PLAY OUT. Target: from 564 to ≲ 300 presses end to end, with no press that is only a "confirm" of the obvious. Method: run the guided walk (`node tools/walk.mjs --port 3223 --max 2600 --require-close`), read its PATH table, and for each era list the presses by control id;
   then, in this order of payoff (2003 first: 275 presses):
     1. 2003 story prep (testimony.ts topics `ts-*`): where a topic needs a press only to show the next line, let it play out and put ONE "Go on" at the end of the group (the lead's "you press to go on"). Do not remove any choice the player makes about their story.
     2. The 1997 opening profile (11 presses): keep every choice, but make a choice press AUTO-ADVANCE to the next group when its group is complete (no separate Next).
     3. Modal chains: the Word of the Day (`wotd-ok`), the pause (`pause-close`), the "Remind me later" that works once, the update's EULA — each stays (they are diegetic and he asked for them), but never two in a row: if one modal has just closed, the next waits for a calm second.
     4. Sends and toasts that need a press to be read: where a toast already has its own door, do not also open a window to confirm it.
   NEVER remove: the content note (the only gate), any felt scene's own pacing, the pledge/prayer's meaning, Caleb's thread, anything that files a choice the dossier reads. Report the press count per era before/after and each cut as a numbered BEFORE/AFTER; lines marked `_s` are his and are never touched (CLAUDE.md, the F1/F2 rules).
D. 1997's FAMILY FORM, CUT TO THE ESSENTIAL FEW (data/provotypes/origin_intake_e1.json; src/desktop/apps/provotype.ts `states`, `goto`, `stateIndex`).
   The form's wording is the lead's; this prompt EDITS NO WORD. It adds a per-state flag `"guided": false` on the states to skip in the guided version, and `provotype.ts` skips those states (and any `goto` pointing at one is re-pointed to the next kept state; ledger tags/witness lines of skipped states are simply not filed).
   PROPOSAL (the lead confirms in the PR): KEEP states 0 "Describe your emotional relationship with your father.", 3 "This week, did you correct how you walk, talk, and sit…" and 5 (the silence — it is the point of the form and has no options); SKIP 1 (father and sexual identity), 2 (boyhood games, paraphrase) and 4 (the friendship log).
   Check the form still ends exactly as before (the silence → debrief → the ledger tag `origin_intake_e1`), that `beatDone('formDone')` still ticks (`ledger.provotypes` has the form), and that `?cut=full` still plays all six. If the three kept states reference the skipped ones in `response`/`debrief` copy, report the lines — do not edit them.
E. THE REST OF THE BRIEF'S G4 CONSISTENCY: README's "versions" section, docs/reinterp/EXHIBITION_GUIDE_2026-10-15.md and the printed card (EXHIBITION_CARD_2026-10-15.html) mention two versions — list every place, change ONLY README in this PR and give the lead the other two as a BEFORE/AFTER list to edit (they are his texts).
RULES: CLAUDE.md in full; no storage (the extras Set is memory only); no new colours; frame voice for menus, felt scenes untouched; every string in data/strings; do not rename the internal 'speedrun' identifiers.
Checks (HUMAN PATH; 400×225 probes on port 3223): (1) fresh load, default entrance: the setup has no version step (balloon sequence greet → wip → whose → sound → look → start → note → advert → allset); `currentCut()==='speedrun'`; `?cut=full` gives 'full'. (2) `?era=2`: the Start menu shows "More to explore" with "Play your takes"; press it → `extraOn('tapes')`; `os.testimony` reaches the tapes stage instead of filing both at once (use the real topic path, say which). (3) `?era=1`: the form has 3 states in the guided cut and 6 under `?cut=full`. (4) the panel, Lamby and the Start menu exist in each era's default cut. (5) screenshots (1280×720, 390×844) of the Start menu's "More to explore" in each era → out/one-guided-version/, LOOKED AT. (6) tsc; npm test; the guided walk to the Close with the press-count table before/after; `node tools/walk.mjs --port 3223 --max 2600 --require-close --cut full` still reaches the Close (the old version is off, not broken).
Report: press counts per era before/after; the list of extras with their final labels; the form's kept/skipped states; every BEFORE/AFTER string; what you could not verify.
```

---

## Notes the lead may want before sending
- **Credits:** the cloud budget for this document was spent on reading and on reproducing G1; the probes above were run on a Linux box with SwiftShader, not on the Mac — the 400×225 / 11 fps recipe is only for logic probes.
- **Each prompt is self-contained** except for the PREAMBLE (workspace rules, ports, commit format) in `PROMPTS_CODEX_2026-10-11.md` and the "How to probe fast" block above: paste PREAMBLE + that block + one prompt.
- **After G1 merges**, the lead should replay 2003 by hand once from `?era=2` (the summons, then Caleb) — that is the one defect that stopped everyone, and it is the cheapest to check by feel.
- **Open words for him** (marked in the prompts): the report address in the setup's WIP balloon (`report`); Lamby's hint lines (all of §G2 C); the Start-menu labels (§G3 E); the "More to explore" labels (§G4 B); which three form questions stay (§G4 D); whether "If you are struggling, start here" belongs on 1997's Fellowship page (§G1 D).
