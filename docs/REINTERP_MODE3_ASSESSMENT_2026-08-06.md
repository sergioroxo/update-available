STATUS: live

# MODE 3 (GYRO) — the brief assessed, and the two things that will actually break
*Sérgio shared a Gemini-authored technical brief for iOS magic-window WebXR. It is sound general
advice and worth having. Below: what it gets right, the one item that does not apply here, the three
items we already have — and ⚑ **two blockers it does not mention that would each break mode 3 on day
one**, both verified in our code today.*

---

## 1 · Its five items, judged against this codebase

| its recommendation | verdict here |
|---|---|
| **Don't gate on `navigator.xr`; render plain WebGL and add orientation** | ✅ **Right, and it is the correct framing.** Matches what I verified: Safari has WebXR only on visionOS |
| **`DeviceOrientationEvent.requestPermission()` with a user gesture** | ✅ **Right and mandatory.** ⚑ We have **no orientation code at all** — `grep DeviceOrientation src/` returns nothing |
| **Use Three.js or A-Frame** | ❌ **Does not apply.** This is **PlayCanvas**, decided and marked *do not re-litigate*. Swapping engines is a full rewrite of the room, morph, batching, screen-texture and XR layers — and PlayCanvas already does everything the brief wants. **Take the advice, not the framework** |
| **Implement raycasting bound to touch events** | ⚑ **Already built** — `hitPlane()`, prop picking, screen-plane routing, `BELONGINGS_HIT`; S70 verified it with real projected pointer presses. **But see §2, because it is conditionally broken** |
| **Touch-drag fallback (OrbitControls, panning off)** | ⚑ **Already built** as drag-to-look — but see §2.1, which is the part the brief glosses |

## ⚑ AND THE FULLER RESEARCH SÉRGIO SUPPLIED CONFIRMS THREE THINGS I HAD FLAGGED
`Cross-Platform PlayCanvas 360 Interactive Experience` (his deep-research pass) is written **for
PlayCanvas**, which makes it directly usable where the shorter brief was not:
- ⚑ **It resolves taps on `onTouchEnd`, "only if single tap"** — independently arriving at §2.1's fix.
- **It gives the full gyro quaternion chain** (`q₀ × q₁ × q₂`, plus an additive `q_touch` for drag),
  so drag and gyro compose rather than fight.
- ⚑ **It kills the Mozilla WebXR Viewer route definitively** — deprecated, unmaintained, and it
  requires a download, which breaks the zero-install premise. *(I had suggested trying it back on
  2026-07-30. It should not be tried.)*

**So the brief's value is confirmation, not architecture.** It independently arrives at the same
conclusion the device research did, which is worth something. It just describes building from scratch
what mostly exists.

---

# 2 · ⚑ THE TWO BLOCKERS IT DOES NOT MENTION — both verified in our code

## 2.1 · ⚑ Interaction fires on `pointerdown`, so every drag-look is also a click
`app.ts`'s handler is `canvasEl.addEventListener('pointerdown', …)` — the prop hit-tests, the power
button, the kit, the belongings geometry, all of it resolves **on press**. `pointermove` then drags
the camera.

**There is no tap-versus-drag discrimination anywhere.**

On a mouse this is survivable: you click precisely, and you start drags on empty space by habit. **On
a touch screen it is a defect on first contact** — *every attempt to look around that begins on a prop
also activates that prop.* And mode 3's whole navigation is touch-drag, on a screen where your thumb
covers several props.

> **This must be fixed before the gyro, not after.** The fix is ordinary — resolve interactions on
> `pointerup`, with a movement threshold and a time limit, so a press that travels is a look and a
> press that stays is a tap. ⚑ **But it touches every interactive surface in the piece**, so it is
> the riskiest single change in mode 3 and it needs the audit rerun after it.

## 2.2 · ⚑ Picking is gated on which way you are facing
The entire hit-test block sits behind `if (!facingBack)`. That is the yaw-based witness hemisphere:
turn past a threshold and presses are discarded, because you are deemed to be looking at the record.

- S70 hit this and patched **only** the held-device case.
- S76 confirmed it is still open, and warned it will silently discard **S77's chips**.
- ⚑ **Mode 3 makes it systemic.** On a phone you are physically turning; the player will be at every
  yaw there is, constantly, and *a whole hemisphere of the room will simply not respond to touch.*

**A yaw-based hemisphere was a reasonable shortcut in a one-room build. In a three-room building with
a device you rotate, it is wrong.** It should be replaced by *what the ray actually hits*, which is
information the picking code already has.

---

# 3 · WHAT THE BRIEF ALSO MISSES — three design problems gyro does not solve

## 3.1 · ⚑ CORRECTED — pinch-to-zoom FOV, NOT "fill the viewport"

**Sérgio, 2026-08-06:** *"I wouldn't make touching the screen turn it into flat inside the mobile. We
can have zooms, that is different, but I don't want the 'fill up' — that would be webxr to flat by
tapping, and no."*

**He is right and my recommendation was wrong.** A canvas that takes the viewport **is** flat-by-
tapping: the 3D room disappears and the spatial frame — the whole point of the piece — goes with it.
I described S66's held read as "fills the viewport," which is both a bad description of it and a bad
idea in mode 3.

⚑ **And his own deep-research spec supplies the right answer, which I should have found:
PINCH-TO-ZOOM ON THE CAMERA'S FIELD OF VIEW, clamped between 30° and 80°.**

```
Δd  = current pinch distance − previous
FOV = clamp(FOV − Δd · sensitivity, 30°, 80°)
```

**Why this is the correct solution and not a compromise:**
- **The room never leaves.** You narrow the frame and see *less* of the room, *larger*. Nothing is
  replaced, nothing is swapped, no mode is entered. **You are still in the space the entire time.**
- **It is the native 360-video gesture**, which is exactly the vocabulary he asked for — people
  already know it from every panorama and map they have ever used.
- **It is the camera, not the fiction.** No diegetic cost, no new surface, no law bent. It does not
  touch the one-UI-surface rule because it does not add a surface.
- **It is what a person actually does** when something across a room is too small to read: they look
  harder, or they get closer. **Zoom is getting closer. "Fill" is teleporting to a different medium.**

**So the screen-in-a-screen problem is solved by optics, not by architecture** — and the design
question I raised as *(a) leave it / (b) fill / (c) reflow* had a fourth answer I missed.
⚑ **Open, and it is a real question:** at 30° FOV, is the 512×384 canvas actually legible on a 6"
phone? **That is measurable and must be measured**, not assumed, before mode 3 is called done.

## 3.1b · The old framing, kept as the record of the error
This piece's UI is a **512×384 logical canvas**, pixel-art, `FILTER_NEAREST`, textured onto a monitor
mesh **inside** the 3D room. On a phone, that is a small screen showing a room containing a smaller
screen carrying the text.

**No amount of gyro fixes that.** ⚑ **This is the question mode 3 actually turns on, and it is a
design decision, not an implementation one:**

- **(a) Leave it.** The player leans in, and the smallness is honest — you are looking at a computer.
- **(b) A read-mode.** Tapping the screen brings the canvas up to fill the viewport, and you tap out
  to return to the room. ⚑ **We already have this gesture** — S66's held read lifts the tablet and
  phone into your hands. **The same mechanic, applied to whatever screen you tap.**
- **(c) Reflow the canvas for small viewports** — a second layout. Expensive, and it breaks pixel
  discipline.

**My read: (b).** It reuses a built and Sérgio-approved mechanic, it keeps one canvas and one layout,
and it stays diegetic — *you pick a thing up to read it*, which is what the piece already says about
devices. **It is his call and it is the one that most changes what mode 3 feels like.**

## 3.2 · No absolute yaw on iOS, so mode 3 needs a RECENTRE
`DeviceOrientationEvent`'s compass heading is unreliable or absent on iOS without absolute
orientation, so magic-window implementations track **relative** yaw from a chosen zero — and drift.

**So there must be a recentre affordance.** ⚑ And it is not merely plumbing: this piece's one bodily
ask is the turn, and *where "forward" is* is therefore load-bearing. A recentre is the frame telling
the player where the room's front is — which makes it a **game-menu** object (frame-voice, functional),
alongside the restart and the caption setting.

## 3.3 · Portrait vs landscape — ⚑ SOLVED BY THE SPEC, not by decree
I said this had to be *decided* before building. **It does not: the research handles it
mathematically.** The screen-orientation angle `so ∈ {0°, 90°, −90°, 180°}` becomes a quaternion `q₂`
applied about the local Z axis, recomputed on `orientationchange`:

> `q_gyro = q₀ × q₁ × q₂` — **the horizon stays level relative to gravity, with no axis flipping**,
> whichever way the phone is held.

So the piece **does not have to demand landscape.** ⚑ What remains true, and is now the only open part:
**composition** still changes with aspect ratio — S76's own half-FOV moved 29.7° → 34.3° between
1280×860 and 16:9 — so **the subject-in-frame audit (S81) must run at a portrait viewport as well as
a desktop one**, or it is only checking one of the shapes people will actually hold.

## 3.4 · ⚑ AND THE SPEC RAISES A QUESTION ABOUT OUR OWN BUDGET
Its Quest draw-call targets are **< 80 per frame on Quest 2** and **< 120 on Quest 3**, with triangle
budgets of 250k and 500k.

**CLAUDE.md's law is ≤60 draw calls and ≤75k tris** — *substantially stricter than this spec on every
axis.* Which means the numbers we have been treating as failures may be miscalibrated: **the latent
send leg at 78 sits inside this spec's Quest-2 budget and well inside Quest 3's.**

⚑ **I am not changing the law.** Our number may be a deliberate margin for stereo rendering, for the
render-texture uploads, or simply for headroom — and **A11 has never run**, so nobody has measured
frame time on the actual device. **But it is worth Sérgio knowing that our ceiling is roughly half
what an outside spec recommends**, and that the honest way to settle it is one in-headset frame-time
capture, not another argument.

---

# 4 · AND IT CONNECTS BACK TO THE INVISIBLE PROPS
`REINTERP_THE_LOOK_MODES_2026-08-06.md` §3 measured every belongings prop past 69° from the seat, the
duck at 80.8°, the cdStack behind the shoulder.

**⚑ Mode 3 is the mode where that gets better, not worse.** On a phone, turning your body to look
behind you is natural — far closer to the headset than a mouse drag will ever be. So mode 3 partly
*repairs* the exploration the desktop build made effortful.

**But only if 2.1 and 2.2 are fixed first.** Otherwise the player turns to the duck — and the
hemisphere guard eats the tap, or the drag that got them there triggers three other props on the way.

**That is the honest sequence: fix picking, then build gyro, then re-run the visibility audit and read
its ratchet as a list of broken interactions rather than tolerated noise.**
