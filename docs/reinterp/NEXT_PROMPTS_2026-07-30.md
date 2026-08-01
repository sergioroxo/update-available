STATUS: live

# NEXT PROMPTS — with a Codex lane, and the real answer on VR testing (2026-07-30)

## ⚑ FIRST, A CORRECTION I OWE YOU ABOUT VR

I have been reporting **A11 (the in-headset playtest) as a scheduling gate waiting on Sérgio.**
That was wrong, and I should have checked sooner.

**The build has no WebXR entry point at all.** `grep` for `navigator.xr`, `app.xr.start`,
`immersive-vr` across `src/` returns nothing. So opening the URL in the Quest browser today gives a
**flat web page floating in a window** — not an immersive session. A11 was never blocked on his
calendar; it is blocked on a build task nobody had identified.

That also means the comfort work S53 and S61 did — the entrance curve, the 29-second relocation — is
unverifiable *by construction*, exactly as those sessions honestly said.

### And a hardware fact worth saving him the afternoon
**Meta Quest Link is Windows-only. There is no Mac→Quest tethering**, so the Meta/Oculus desktop app
cannot put this build in his headset. Don't try that route.

### What actually works (both are correct instincts he already had)
WebXR requires **HTTPS** — `localhost` is exempt only on the same device, and the Quest is a
different device. So:

| Route | How | Best for |
|---|---|---|
| **GitHub Pages** | `vite.config` already sets `base: './'`; push, then open the Pages URL in the Quest browser | stable builds, sharing, the exhibition |
| **Tailscale (already in the README!)** | `npm run dev -- --host` then `tailscale serve --https=443 localhost:<port>` → open that HTTPS URL in the Quest browser | **fast iteration** — edit on the Mac, reload in the headset |

*(README §"Quest 3 loop" says port 5173; the launch config uses `autoPort` and today served on 3000.
Worth correcting in the README.)*

**So the order is: build the XR entry point (S65) → then A11 is possible, by either route.**

---

## The split: what goes to Codex, what stays here

**Codex GPT 5.6** suits well-specified, mechanical, code-level work with tight file fences and
verification that doesn't need dramaturgy. **⚑ Its prompts must not claim visual verification** —
assume it cannot drive the browser, so its acceptance is `tsc` + `npm test` + `npm run build`, and
Sérgio or I confirm the look afterwards.

| Session | Goes to | Why |
|---|---|---|
| **S63** debug panel rebuild + screenshot fix | **Codex** | UI mechanics, fully specified, no narrative judgement |
| **S64** mirrored constellation labels | **Codex** | self-contained billboarding maths in one file |
| **S65** WebXR entry point | **Codex** | PlayCanvas has built-in XR support; this is scaffolding, not design |
| **S66** E3 sends build | **here** | narrative, register laws, felt/operable calls |
| **S67** the provotype space | **here** | dramaturgy — must be Lamby offering, never a level select |

---

# S63 — REBUILD THE DEBUG PANEL (+ fix the screenshot button) · Codex GPT 5.6

```
Codebase: /Users/sergiogalvaoroxo/update-available-reinterp (branch reinterp). Read CLAUDE.md,
src/debug/panel.ts, src/engine/app.ts (the ?debug=1 block, ~line 264), tools/check-spec.mjs (C6
enforces panel completeness — do not break it), and docs/reinterp/NEXT_PROMPTS_2026-07-30.md.

TWO PROBLEMS, both reported by the project lead after using it:
1. "The debug panel is still messy and difficult to understand." It is one long column of ~39 beat
   buttons plus eras, rooms, facets, witness and sends. It is his MAP of the piece, so legibility is
   the feature, not polish.
2. "The screenshot button just produces black images." CONFIRMED CAUSE: the PlayCanvas app is
   created WITHOUT `preserveDrawingBuffer` (app.ts ~line 252), so any canvas readback taken outside
   the render call returns an empty buffer. panel.ts's `cv.toBlob(...)` therefore captures black.

SCOPE:
1. FIX THE SCREENSHOT. Force a render immediately before the readback in the same synchronous block
   (`app.render()` then `toBlob`), OR set `preserveDrawingBuffer: true` in graphicsDeviceOptions.
   PREFER the explicit-render fix: preserveDrawingBuffer costs performance on every frame and this
   project has a 72Hz Quest budget. The panel will need an app reference — pass it in via the
   existing options object rather than reaching for a global.
2. MAKE THE PANEL LEGIBLE. It must stay a complete map (C6 fails otherwise), so improve STRUCTURE,
   not coverage: collapsible sections that remember their state, the current era/phase shown at the
   top, and clear visual grouping so the piece's spine is readable at a glance. Keep every existing
   id reachable. Do not remove buttons; do not rename ids.
3. Keep it out of the way: it currently covers the left half of the viewport at 1280px, which makes
   review screenshots unusable. Make it narrower and/or collapsed by default.

FILES YOU MAY TOUCH: src/debug/panel.ts, src/engine/app.ts (the debug wiring + graphicsDeviceOptions
only), docs/reinterp/01_SESSION_LOG.md (append). NOT: src/desktop/**, src/room/**, src/narrative/**,
data/**, tools/check-spec.mjs.

ACCEPTANCE: `npx tsc --noEmit`, `npm test` (C6 must still report every debugJump id covered) and
`npm run build` all green. ⚑ DO NOT claim visual verification — state in the log that the look needs
a human check. Append one line to BUILD_LOG.md.
GIT: commit with explicit pathspecs only — `git commit -m "..." -- <files>`; never bare `git commit`
or `git add -A`. Blocked ≠ improvise: STOP and log BLOCKED.
```

# S64 — THE CONSTELLATION'S LABELS READ BACKWARDS · Codex GPT 5.6

```
Codebase: /Users/sergiogalvaoroxo/update-available-reinterp (branch reinterp). Read
src/room/pointCloud.ts in full, and docs/reinterp/ABSTRACT_EVIDENCE_2026-07-30.md (the bug report).

THE BUG: the Close's hub labels are drawn as a single textured quad mesh with fixed orientation, so
any label whose node sits behind the viewer's plane renders MIRRORED — the text reads backwards.
Confirmed in a free-camera capture; roughly half the labels are affected. This is the one surface in
the piece whose entire job is to be read.

SCOPE: make the labels always face the camera (billboarding), or otherwise guarantee they are never
mirrored from any viewing angle.
⚑ CONSTRAINTS THAT MAKE THIS NON-TRIVIAL — read pointCloud.ts's header before choosing an approach:
- The labels are deliberately ONE merged mesh as part of a 5-draw-call budget for Quest. A naive
  per-label billboard entity would multiply draw calls and break that budget. Preserve it, or state
  clearly in the log what the new cost is and why it is acceptable.
- Geometry is generated once at construction and "nothing allocates after construction" — respect
  that; per-frame allocation is a regression.
- The 90°-step rotation discipline in CLAUDE.md applies to pixel-art surfaces, not to this 3D
  billboarding; do not let it block a correct fix, but do not restyle anything either.

FILES YOU MAY TOUCH: src/room/pointCloud.ts, docs/reinterp/01_SESSION_LOG.md (append).
NOT: anything else.

ACCEPTANCE: `npx tsc --noEmit`, `npm test`, `npm run build` green; draw-call impact stated explicitly
in the log. ⚑ DO NOT claim visual verification — say plainly that a human must confirm the labels read
correctly from several angles. Append one line to BUILD_LOG.md.
GIT: explicit pathspecs only. Blocked ≠ improvise: STOP and log BLOCKED.
```

# S65 — THE WEBXR ENTRY POINT (this is what actually unblocks A11) · Codex GPT 5.6

```
Codebase: /Users/sergiogalvaoroxo/update-available-reinterp (branch reinterp). Read CLAUDE.md (the
Quest budget and the comfort law are binding), src/engine/app.ts, src/desktop/orientingCard.ts,
README.md §"Quest 3 loop", and docs/reinterp/NEXT_PROMPTS_2026-07-30.md.

THE SITUATION: this project has been designed as a WebXR piece for a year and HAS NO XR ENTRY POINT.
`navigator.xr`, `app.xr.start` and `immersive-vr` appear nowhere in src/. Opening the build in a
Quest browser therefore shows a flat page in a window. Every comfort decision made so far — the
entrance curve, the 29-second E2→E3 relocation — is unverifiable until this exists.

SCOPE — scaffolding only. Do NOT redesign anything for VR in this session.
1. Detect XR support (`navigator.xr?.isSessionSupported('immersive-vr')`) and, when available, offer
   an ENTER VR affordance on the existing log-in panel (orientingCard). When unsupported, change
   nothing — the desktop path must behave exactly as it does today.
2. Start/stop an immersive-vr session using PlayCanvas's built-in XR support (`app.xr.start(...)`
   with the existing camera). Handle session end by returning cleanly to the desktop path.
3. The camera is the head in XR. The piece's law is that the player TURNS but never walks, so:
   do NOT add locomotion, teleport, or thumbstick movement. Existing scripted camera moves
   (the entrance descent, the relocation, the TURN) must still run — but flag clearly in the log
   which of them move the camera while the head is tracked, because that is the comfort risk A11
   exists to test.
4. `?flat=1` must continue to render the desktop canvas alone, untouched.

FILES YOU MAY TOUCH: src/engine/app.ts, src/desktop/orientingCard.ts,
data/strings/orientingCard.json (an Enter VR label, PLACEHOLDER-draft), README.md (correct the
"Quest 3 loop" port — it says 5173 but the launch config uses autoPort and served 3000),
docs/reinterp/01_SESSION_LOG.md. NOT: src/desktop/apps/**, src/room/**, src/narrative/**.

ACCEPTANCE: `npx tsc --noEmit`, `npm test`, `npm run build` green; the desktop path is
byte-for-byte unchanged in behaviour when XR is unsupported; `?flat=1` unaffected. ⚑ YOU CANNOT TEST
THIS IN A HEADSET — say so plainly and list exactly what a human must verify on device. Append one
line to BUILD_LOG.md.
GIT: explicit pathspecs only. Blocked ≠ improvise: STOP and log BLOCKED.
```

---

## Staying on this thread (narrative work, not mechanical)
- **S66 — E3 sends build.** `REINTERP_E3_SENDS_SCRIPTS_2026-07-13.md` is scripted and unbuilt; Era 3's
  connective tissue, the equivalent of what S57 did for Era 2.
- **S67 — the provotype space.** Lamby offers the provotypes from Daniel's abandoned machine
  (Q-D50 + D33). Needs the dramaturgy held: an offer, never a menu; declining always works and is
  filed; nothing rewarded.

Both need register-law judgement and felt/operable calls, so they are poor fits for a mechanical lane.

---

# ⚑ TESTING RECIPE — with Tailscale installed (2026-07-30)
*He has Tailscale on both devices, plus Mozilla XR Viewer on the iPad.*

**The Mac serves, the iPad/Quest opens it.** On the Mac:
```bash
npm run dev -- --host --port 3000
tailscale serve --https=443 localhost:3000
```
Then open **`https://h7cw2l44vg.tail379051.ts.net/?reinterp=1`** on the iPad. Tailscale is installed
there, so the tailnet URL resolves and WebXR's HTTPS requirement is satisfied.

**For the Quest**, which has no Tailscale: `tailscale serve` is tailnet-only, so use
**`tailscale funnel`** instead — it publishes a public HTTPS URL needing nothing installed on the
headset. (Or deploy to GitHub Pages, which is the stable route.)

### What to expect, and the empirical test that beats speculation
S65 gates the button on `navigator.xr?.isSessionSupported('immersive-vr')`. **So: open it and look.**
If "Enter VR" appears, XR is live. If not, it isn't — no debugging required.

- **iPad Safari:** almost certainly no button (Apple ships WebXR on visionOS, not iPadOS).
- **Mozilla XR Viewer:** it exposes WebXR on iOS, but it was built around ARKit and `immersive-ar`,
  and the project was archived. It may report no `immersive-vr` support. **Worth two minutes to try;
  don't sink an afternoon into it.**
- **Quest 3 browser:** this is the real target and should work.

### ⚑ The better iPad route — and it tests the thing that matters
A **gyroscope "magic window"** (`DeviceOrientation`) is not WebXR: no stereo, no headset. But you
physically turn the iPad and the room turns — which is **exactly the piece's only bodily ask**. It
would let the turn, the entrance descent and the 29-second relocation be felt on a device that
already has Tailscale, without waiting on the Quest. Small, self-contained, and a good Codex job.

**Suggested: S68 — gyroscope look-around fallback · Codex GPT 5.6, medium effort.**

---

# S66 — ERA 3: THE CORRECTION LIST · Opus, high effort · **here, not Codex**
*Rewritten 2026-07-30 against `REINTERP_E3_THE_CORRECTION_LIST_2026-07-30.md` rev 4. The earlier
S66 in `REINTERP_E3_STUDIO_SPEC_2026-07-30.md` targeted the superseded studio design — **ignore it.**
This is narrative + register work; it must not go to Codex.*

```
Build session, reinterp worktree (/Users/sergiogalvaoroxo/update-available-reinterp, branch reinterp,
?reinterp=1). Read, in this order: CLAUDE.md (the register laws are the mechanic here, not a
constraint), docs/ETHICS_CONSTRAINTS.md, docs/REINTERP_E3_THE_CORRECTION_LIST_2026-07-30.md (THE
SPEC — read revision 4 especially), docs/REINTERP_E3_REVAMP_BRIEF_2026-07-30.md revision 3 (the
evidence; every correction below is sourced there), docs/reinterp/08_STATUS_REGISTER.md, then
src/room/graceQueueLite.ts, src/room/era3Devices.ts, src/room/cluster.ts (the ambientLight /
setLight machinery — the break needs it), src/desktop/theme/era3.ts, src/debug/panel.ts,
tools/check-spec.mjs.

THE MECHANIC, in one line: Vera applies corrections from a style guide. Every correction is
footnoted with scripture. Then the law changes, and the light in the room changes with it.

⚑ THE SINGLE BIGGEST CHANGE — the queue's verbs are wrong and must be replaced.
graceQueueLite.ts currently offers Approve / Move to review / Let it stand. That is Vera JUDGING
whether a story is allowed, which the research rates CONTESTED (forum-moderation records are largely
private or unarchived). Testimony PRODUCTION — narratives edited and published by the network — is
FULLY DOCUMENTED. So the submissions are already accepted, and the verb becomes APPLY / SKIP on a
per-correction checklist. Do not keep the old verbs alongside the new ones; replace them, and note
the retirement in the file header the way this codebase already does.

SCOPE:
1. THE CORRECTION LIST (laptop). One submission at a time, big type, no crowding — keep S37's
   maximized-UI lesson. Beside it, the seven corrections from the spec's rev-4 table, each an item
   with: the rule, a one-line rationale, a proof-text line, and APPLY / SKIP. Every item is skippable
   and skipping is filed to the ledger. The header reads `3 of 7 applied` and NOTHING ELSE happens —
   no metric moves, no one comments, the work simply stays there.
2. ⚑ EVERY CORRECTION IS A PLATFORM. Items 3-6 (clip for the broadcast / attach the invitation / add
   to the companion / pair with a partner) each name a documented 2010s distribution form — podcast,
   course funnel, mobile app, influencer partnership. Applying one must VISIBLY move the person onto
   that channel (a chip appears on the submission: `queued · audio`, `in the companion`, a partner
   card attaches). The era's content is six named real forms, not "the internet."
3. ⚑ ITEM 7, "ROUTE FOR MENTORSHIP", IS THE ERA'S HINGE. It flags a submitter for personal
   follow-up. It must read, without a word of commentary, as the moment this stops being editing and
   becomes recruitment: someone told a story, and the system's response is to send a person. Give it
   the quietest presentation on the screen. It is the one correction E4 will NOT be able to automate.
4. SCRIPT AND SCRIPTURE. Under each rule, a proof-text in THE SAME grey, size and citation format as
   the style reference. The player must not be able to tell which authority is which, because the
   interface does not distinguish them. Invented book only — the spec's draft is `The Ordering`
   (the manual) citing `Household` (the verses). NO REAL SCRIPTURE, ever, as the apparatus's
   justification. The verse text is always gentle and always about care or belonging; the cruelty is
   entirely in what it is footnoting.
5. NOA'S TWO CORRECTIONS, both rendered, neither endorsed: "soften the flannel; brighten the voice"
   AND "possible gender confusion — route to exploratory mentorship", on the SAME submission. The
   piece never answers for her. If any beat resolves Noa, STOP and flag it.
6. ⚑ THE BREAK — MALTA, on the phone. December 2016, Act LV. It arrives from an unnamed peer
   moderator in another country (NOT Noa — she is on the list; see rev 4 §1). Two lines, both
   PLACEHOLDER-draft. The reply field below it is active and blinking; pressing it does nothing but
   hold the cursor in an empty field. There is no keyboard in this piece and there is no reply.
7. ⚑ AND THEN THE LIGHT — the one inversion. Every glitch in this piece so far is DEGRADATION. This
   one BRIGHTENS: the room's ambient lifts and the laptop's grade warms, using cluster.ts's existing
   ambientLight machinery. Nothing in the software changes. Not one character of the correction list
   changes. It is simply lit well enough to be read as what it is. Get this beat right or the era
   has no ending — it is the whole point of the pass.
8. WHAT THE BREAK CHANGES: nothing, and everything. She does not quit, the list does not vanish, the
   next item is still there. The era ends on a person who can no longer un-know what the work is.

REGISTER CALLS (state them in the session log, and check-spec C2 will enforce them):
- the correction list, the chips, the proof-texts, the `3 of 7` counter: `operable`. May be tidy and
  charming. The satire is in the TOOL.
- the submissions themselves, and the Malta message: `felt`. Bare. No Lambient, no mechanics, no
  satire. The submitters are sincere and are NEVER the joke — the target is the apparatus.
- E3 has NO respite. That is deliberate and confirmed by Sérgio; do not add one.

LAWS THAT WILL FAIL CI IF BROKEN:
- No runtime network calls; no localStorage/sessionStorage/indexedDB/cookies. Ledger only.
- Palette from src/desktop/theme/ — check-spec C4's hex ratchet must not rise.
- check-spec C6: EVERY new beat needs a debug-panel button. src/debug/panel.ts IS IN SCOPE. (Three
  previous sessions shipped beats with no buttons and Sérgio could not reach the content.)
- No real people, orgs, logos or hashtags in the fiction. Real names are dossier/provenance only.
- All display text in data/ as PLACEHOLDER-draft, never composed in TS.

FILE FENCE (edit only these):
  src/room/graceQueueLite.ts, src/room/era3Devices.ts, src/room/cluster.ts,
  src/desktop/theme/era3.ts, src/state/ledger.ts, src/debug/panel.ts,
  data/dialog/s3_queue.json, data/strings/era3_devices.json,
  docs/REINTERP_E3_THE_CORRECTION_LIST_2026-07-30.md (status/decisions only),
  docs/reinterp/01_SESSION_LOG.md, docs/reinterp/08_STATUS_REGISTER.md, BUILD_LOG.md
Git discipline: stage with EXPLICIT PATHSPECS only, never `git add -A` or `git commit -a` — another
session may share this worktree's index.

DONE WHEN: npm run dev works; npm test passes; check-spec clean; every new beat reachable from the
debug panel; BUILD_LOG gets ONE line (one line — not a paragraph); the session log gets the register
calls and the retirement note for the old queue verbs.

ACCEPTANCE, BY FEEL (Sérgio's criteria, checkable by playing it):
- Applying a correction feels like copy-editing, not like harm. If it feels like harm, it is too
  loud and the era stops working.
- The proof-text is unremarkable. The player may not consciously notice it for several items.
- "Route for mentorship" lands as a small cold drop, with no music sting and no commentary.
- The brighten is the first time in the piece that a glitch is good news, and it should be felt
  before it is understood.
```
