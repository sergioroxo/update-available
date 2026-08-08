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

## 3.1 · ⚑ THE SCREEN-IN-A-SCREEN PROBLEM — the real risk, and it is not technical
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

## 3.3 · Portrait, on a 4:3 canvas, in a landscape room
A phone held upright shows a tall slice of a room whose content was composed for a wide frame. Either
the piece asks for landscape (a real, common, acceptable ask) or the composition has to survive
portrait. ⚑ **Decide it before building, because the seat framings and the whole subject-in-frame
audit depend on the aspect ratio** — S76's own measurement moved from 29.7° to 34.3° just between
1280×860 and 16:9.

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
