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

### ⚑ FIRST RUN — TWO settings, and the second one is what failed on 2026-08-06
**1. Settings → Pages → Build and deployment → Source: GitHub Actions.**

**2. ⚑ Settings → Environments → `github-pages` → Deployment branches and tags → add `reinterp`**
(or set it to allow all branches).

**Why:** GitHub creates the `github-pages` environment with a protection rule that permits deploys
**only from the default branch.** All our work is on `reinterp`, so the first run failed with:

> `Branch "reinterp" is not allowed to deploy to github-pages due to environment protection rules.`

⚑ **The build had already SUCCEEDED** — a 12.2 MB artifact was produced, which means `npm test`
passed on CI and the bundle is sound. **Only the publish step was refused.** Nothing is wrong with
the code or the workflow; it is one permission, and it is deliberate on GitHub's part.

### Two smaller things from that run
- **`pages.yml` must live on `main` as well as `reinterp`.** `workflow_dispatch` workflows only
  appear in the Actions UI if they exist on the **default branch**. It is there now.
  ⚑ Note the resulting subtlety: **the branch you pick in the UI chooses which workflow FILE runs;
  the `ref` input chooses what gets CHECKED OUT and built.** They are not the same thing. Pick
  `reinterp` in both and it does what you expect.
- **The Node 20 deprecation warning is benign.** It is about the *actions'* own runtime, not ours —
  GitHub is forcing `checkout`/`setup-node`/`upload-artifact` onto Node 24 and they still work. Our
  build still runs on Node 20 deliberately, to match the local toolchain. **Not a failure, and not
  worth chasing** until an action actually breaks.

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

## ✅ DECIDED — Sérgio, 2026-08-06
> *"I have no issues with it being public, the trial version. As long as there is no access to the
> repo then it's okay for the link to be public."*

**Confirmed and correct on the mechanics:** GitHub's own caution says it plainly —
*"This repository is private but the published site will be public."* Pro does not include
access-controlled Pages. **The repo stays private; the built site is reachable by URL.** That is the
arrangement he has approved.

**⚑ The one line I would still hold, and it is not about access:** *testable* is not *published*.
Don't put the URL in a paper, a talk or a post until the **trans reader pass** on Era 4's deadname
beat has happened and your voice pass has landed. That gap is exactly what those two gates cover, and
it is unaffected by who can reach the link.

---

## ⚑⚑ ONE SAFETY NOTE BEFORE THE HEADSET — added 2026-08-12
**S82 found that the s2 send is on the ordinary path, not latent** (`08 §17`). Accepting it flies the
camera at **6.874 m/s against a 0.43 m/s envelope — sixteen times over** — and it sits on E2's
critical path, because the era cannot advance until s2 resolves.

> ### ⚑ ON THE iPAD: fine. ON THE QUEST: **do not accept the s2 send until it is fixed.**
> A phone or tablet is a window you hold; the same motion in **stereo, head-locked**, at 16× the
> comfort envelope is exactly what that envelope exists to prevent. **Decline the send, or use
> `?era=3` to enter past it.**

Everything else in the device list is safe. This is one beat, it is known, and the fix is a decision
Sérgio has to make (lengthen the dolly to ~38 s, or make it the blink-cut R28's movement law
prescribes for cross-room travel).

## What to do once it is up — the device session
`08_STATUS_REGISTER.md` §13 is the checklist. **Ten questions, one afternoon, and they are all
judgements — the measurements are done.**

**On the iPad or iPhone**, in Safari: does the permission modal appear · is the sensor jittery · is
pinch sensitivity right in the hand · ⚑ **does the turn feel right** · is the portrait crop annoying ·
does rotating the device keep the horizon level.

**On the Quest 3**, in its browser: ⚑ **A11 — the in-headset pass, which has never run in the
project's history** · whether 75 draw calls is right · whether the 12-second entrance reads as
comfortable or merely slow · whether E3→E4's 42.5-second crossing reads as routine or as boring.

## ⚑⚑ THE BARE URL SHOWS THE OLD PIECE — AND THAT IS CORRECT
**This caught Sérgio on the first deploy and it will catch every device tester after him.**

**`https://sergioroxo.github.io/update-available/` runs the SHIPPED build, not the reinterp.**
It is not a stale deploy and nothing is wrong: `src/main.ts:19` reads
`const reinterp = query.get('reinterp') === '1'`, and CLAUDE.md's own law is that the reinterp
amendments apply **ONLY behind `?reinterp=1`** while the shipped build's laws stay exactly as
written. **One deployed bundle contains both pieces; the query string chooses which one you get.**

> ### ⚑ BOOKMARK THIS, NOT THE BARE ADDRESS
> ```
> https://sergioroxo.github.io/update-available/?reinterp=1
> ```

**To confirm the deploy is actually current** (rather than an older publish), open
`?reinterp=1&debug=1` — the debug panel should list the **E4 sections** (`e4Offers`, `e4Memory`,
`e4Wall`, the finale trio). If those buttons are there, the build is at or after S78. If the panel
has no E4 block, the Actions run did not publish and you are seeing a previous deployment.

⚑ **Anyone you hand the link to gets the shipped piece unless the query is on it.** For a device test
that is a silent wrong-piece failure, so send the full URL, never the root.

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
