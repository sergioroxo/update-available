STATUS: live

# THE LOOK MODES — and why "flat is the fallback" was breaking things
*Sérgio, 2026-08-06: "That is a misinterpretation of the WebXR application here. The Flat is not a
fallback. The Browser version is the fallback in case the VR version is not possible… the browser
version of this experience is being designed at the same time as the VR. Please correct that and all
the things that have been limiting the development."*

**He is right, the wording in CLAUDE.md was mine to have questioned, and it has cost real work.
Corrected in place. This file is the reasoning and the consequences.**

---

# 1 · THE THREE LOOK-MODES, and `?flat=1` is not one of them

| # | mode | device | state |
|---|---|---|---|
| 1 | **Immersive WebXR** — the head is the camera | Quest 3 · Vision Pro | entry point built (S65), **never tested in a headset (A11)** |
| 2 | **Browser, drag-to-look** — framed camera, same 3D room | desktop, laptop | built |
| 3 | **⚑ Browser, GYRO-to-look** — you turn the device | phone, tablet | **NOT BUILT** |

**`?flat=1` is a REVIEW TOOL.** The desktop canvas alone, for inspecting 2D work without the room.
**Not an audience target. No design decision may be justified by it.**

## ⚑ How the old wording actually did damage
It is not a semantic quibble. *"Universal fallback"* made `?flat=1` sound like the safety net under
everything, which had three effects:

1. **It let the 3D room be treated as staging rather than as an audience-facing build.** If the canvas
   "always works alone," then a prop nobody can see is a cosmetic issue rather than a broken
   interaction. **That is exactly the state §3 below documents.**
2. **⚑ It let me justify a design decision with it, two days ago.** The E4 space argument leaned on
   *"Option A survives `?flat=1` intact."* **That reasoning was void** — the real constraint was never
   flat, it was *does this work in a 3D room you look around in, by drag and by gyro*. The conclusion
   happens to survive; the argument for it does not, and I should not have used it.
3. **It hid the fact that half the piece cannot be played flat at all.** S76 found E3 and E4 have no
   flat path (E3 has been room-device-only since S37). Under the old framing that reads as an alarming
   regression. Under the correct framing **it is not a defect at all** — flat is a review tool, and
   the review tool not covering the newest content is a minor inconvenience, not a broken fallback.

---

# 2 · ⚑ THE DEVICE FACTS, verified today — and they make mode 3 mandatory

- **Safari implements WebXR only on visionOS.** There is **no WebXR on iOS, iPadOS or macOS Safari**;
  `navigator.xr` will not fire there. ([Safari 18 / visionOS 2.0](https://multiwaresolutions.com/blog/spatial-computing-webxr-in-safari-18-2026-06-08) · [state of WebXR on iOS](https://xrdoctors.pro/blog/webxr-on-ios-what-actually-works))
- **So for every Apple device except Vision Pro, mode 3 IS the experience.** There is no other route.
- **`DeviceOrientationEvent.requestPermission()` is required from iOS 13 on**, and it needs **HTTPS**
  plus **transient activation** — a real user gesture. ⚑ **It cannot be requested on page load**, so
  it needs a deliberate button, and that button is a design object, not a technicality.
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static))
- **Android grants orientation without a prompt** — so the two platforms need different entry flows.

## ⚑ I retired S68 and I was wrong twice
On 2026-08-05 I retired the gyroscope look-around unbuilt, arguing that S65's XR entry point had made
the iPad unnecessary and that a non-VR approximation would produce a meaningless comfort reading.

**Both halves were wrong.** S65's entry point **can never fire on an iPad**, because Safari has no
WebXR there — so it unblocked nothing on that device. And it is not an approximation of the turn for
testing purposes: **it is how every phone and tablet audience will ever experience this piece.**

**S68 is un-retired as a requirement.** *(Its number stays retired per the numbering rule; it returns
as a new session — see the queue.)*

---

# 3 · ⚑ AND THIS IS WHY THE PROPS ARE INVISIBLE

Sérgio: *"most of them are broken and not existent or not visible — like the rainbow duck, I've never
been able to see it while you claim to be there."*

**Measured from Room 1's seat, against a ~29.7° horizontal half-FOV:**

| prop | horizontal bearing | vertical | note |
|---|---|---|---|
| keyboard | 0.0° | **−37.1°** | dead ahead and **below the frame** |
| poster1 | 34.3° | +15.2° | just outside |
| **mixtape** | **69.9°** | −36.3° | ⚑ *the designed belongings candidate* |
| **rainbowDuck** | **80.8°** | +12.4° | ⚑ **nearly perpendicular to the gaze** |
| teddyBox | 84.2° | −12.7° | |
| book1 | 85.7° | +1.4° | |
| book3 | 87.1° | +14.4° | |
| **cdStack** | **95.8°** | −12.7° | ⚑ **behind the player's shoulder** |

**⚑ NOT ONE of the eight belongings-eligible props is in the default frame.** Every one requires a
deliberate 70–96° turn to find. He has never seen the duck because **the duck is essentially at his
right ear.**

## The diagnosis, and it is not "the props are misplaced"
The piece's law is *rotation IS the exploration* — so props being off-axis is correct **in
principle.** The failure is that **nothing teaches or rewards the 80° turn, and the belongings beat
depends on it.**

> **The props are placed for a player who explores by turning. The build never taught anyone to turn
> that far, and never gave them a reason to.**

**And mode 2 makes it worse.** Dragging 80° with a mouse is an effortful, deliberate act. In a
headset it is a glance. **The browser build — which is a co-equal audience target, not a fallback —
is the one where this hurts most**, and it went unexamined for exactly the reason in §1.1.

**So the belongings gathering window is, in practice, mostly unreachable.** Nine eligible items,
eight of them past 69°, on a timed beat, with no prompt to look. That is not a prop bug. **It is an
interaction that was never verified in the mode most people will play it in.**

---

# 4 · WHAT THIS CHANGES — the consequences worth acting on

1. **⚑ Build mode 3 (gyro).** Requirement, not convenience. With the permission button as a designed
   object — and ⚑ on a phone, **turning the device to look behind you is natural in a way dragging
   never is**, so mode 3 may partly *solve* §3 rather than inherit it.
2. **⚑ A visibility pass on every interactive prop, in mode 2.** Not "is it placed correctly" but
   **"can a player find it, and does anything tell them to look?"** L4's assertion 4 already measures
   subject-in-frame and sits at a ratchet of **6 tolerated failures** — that ratchet was set when the
   3D room was thought of as staging. It should be re-read now as a list of broken interactions.
3. **Stop citing `?flat=1` in design arguments.** Including mine.
4. **The provotypes need the same audit.** Sérgio says they are broken, absent or invisible; §3 shows
   the mechanism by which that happens silently. **They have never been checked from a seat.**
5. **A11 is now more urgent, not less** — mode 1 has never run, and mode 3 does not exist, so **two of
   the three ways a person can experience this piece are unverified or absent.**
