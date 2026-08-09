STATUS: live

# TESTING ON REAL DEVICES VIA GITHUB PAGES
*Sérgio, 2026-08-06: "prepare a way for the reinterp to be testable inside of GitHub, because that
way I can easily try it on various devices with GitHub Pages."*
**Yes — and it does more than convenience.**

## ⚑ Why this unblocks the whole device list
Pages serves over **HTTPS**, and HTTPS is a hard requirement for two of the three look-modes:

| | needs HTTPS because |
|---|---|
| **Mode 1 · WebXR** (Quest) | `navigator.xr` is secure-context only |
| **Mode 3 · gyro** (phone, tablet) | ⚑ `DeviceOrientationEvent.requestPermission()` is secure-context only — **and on iOS it fails SILENTLY over HTTP.** No console warning; the listener simply never fires |
| Mode 2 · desktop | works anywhere |

**So one URL closes all ten questions in `08_STATUS_REGISTER.md` §13** — no Tailscale, no Mac serving, no laptop awake. Open it on the iPad, open it on the Quest, done.

---

## Running it
**Actions → `pages` → Run workflow → branch: `reinterp`.**

**⚑ It is manual only, deliberately.** It never fires on a push. Publishing is outward-facing, and
this piece has open ethics gates — so it goes out when you say so, not when a build session lands.

**It runs `npm test` before it publishes anything.** Invariants, room folds and C1–C8. A build that
breaks its own laws must never reach a device, least of all one someone is testing on.

`vite.config.ts` already sets `base: './'`, so the bundle is path-relative and works from a repo
subpath without knowing the repo name. Nothing to configure there.

### First run only — one setting in the repo
**Settings → Pages → Build and deployment → Source: GitHub Actions.** Without that, the deploy step
fails with a permissions error and nothing else is wrong.

---

# ⚑ BEFORE THE FIRST PUBLISH — read this, it is your decision and not mine

**GitHub Pages on a public repo is reachable by anyone with the URL.** The repo is
`sergioroxo/update-available`; if it is public, so is the build.

**What is currently in it:**

| | state |
|---|---|
| **The Era-4 deadname beat** | ⚑ **BUILT BUT NOT PASSED.** The trans reader pass is a **gate**, not a review step, and it has not happened (S77; `08 §14`) |
| Every display string | **PLACEHOLDER-draft** — my drafts, awaiting your voice pass |
| The Era-3 correction list, Noa's video, the comments | built, unvoiced, survivor-adjacent |
| Ethics #15's Scene 2.6 (deliverance) | ✅ **not a problem — it does not exist in the code.** Nothing to compile out |

**Three things already protect it, and they are weak on their own:**
- `index.html` carries `<meta name="robots" content="noindex">` — search engines are asked not to
  index it. **It is a request, not a barrier.**
- The URL is not linked from anywhere.
- The piece opens on the pre-fiction panel with the content note and the 4-second ethics delay before
  anything can start.

**⚑ My read, and it is a recommendation rather than a decision:** for a device-testing pass this is
fine — an unlinked, noindexed, work-in-progress URL is ordinary practice. **What I would not do is
treat it as a soft launch.** Do not put the URL in a paper, a talk or a post until the reader pass has
happened and your voice pass has landed. The gap between *testable* and *published* is exactly the
gap those two gates cover.

**If you want it genuinely private:** GitHub Pages access control on a private repo needs a paid
plan. The alternative that costs nothing is `tailscale funnel` from the Mac — public HTTPS URL, but
only while your machine is serving, and you can stop it at any time.

---

## What to do once it is up — the device session
`08_STATUS_REGISTER.md` §13 is the checklist. **Ten questions, one afternoon, and they are all
judgements — the measurements are done.**

**On the iPad or iPhone**, in Safari: does the permission modal appear · is the sensor jittery · is
pinch sensitivity right in the hand · ⚑ **does the turn feel right** · is the portrait crop annoying ·
does rotating the device keep the horizon level.

**On the Quest 3**, in its browser: ⚑ **A11 — the in-headset pass, which has never run in the
project's history** · whether 75 draw calls is right · whether the 12-second entrance reads as
comfortable or merely slow · whether E3→E4's 42.5-second crossing reads as routine or as boring.

⚑ **Useful review URLs** (append to the Pages address):
```
?reinterp=1                 the piece, from the front door
?reinterp=1&debug=1         + the debug panel — every beat reachable by button
?reinterp=1&era=3&debug=1   land straight in Era 3
?reinterp=1&era=4&debug=1   land straight in Era 4
?reinterp=1&descent=0       skip the entrance descent (for the comfort A/B)
```
*(`?flat=1` is a review tool for inspecting 2D work without the room — **not a fallback**, and it
cannot currently reach E3 or E4. It also mounts no debug panel. See `08 §14`.)*
