STATUS: live
S84 STATUS: SHIPPED 2026-08-13; every device-facing result remains UNVERIFIED ON HARDWARE
S85a STATUS: RE-VERIFIED 2026-08-14 in the running engine — §§7.1, 7.2, 7.3, 5.1, 5.2, 3, 4 all hold
(evidence and measurements in docs/reinterp/08_STATUS_REGISTER.md §21). ⚑ ONE NEW GAP, and it is
S85's: a drag during a driven camera leg moves one frame and snaps back, so "look while it flies"
does not actually work yet. ⚑ STILL UNVERIFIED ON HARDWARE — no iPad, iPhone or headset was used.

# THE FIRST DEVICE SESSION — findings, and what still needs testing
*Sérgio's first pass on a real iPad, 2026-08-12, over the deployed Pages build. ⚑ Written while S83
runs in Codex, so `app.ts`, `panel.ts`, `ledger.ts`, `gameMenu.ts`, `BUILD_LOG.md` and the register
are all inside its fence and untouched here. Only `orientingCard.ts` was changed.*

---

# 1 · WHAT HE FOUND

| # | finding | status |
|---|---|---|
| 1 | **The horizon is rolled ~90° in landscape** | ⚑ **S83, running now.** `08 §18` |
| 2 | **The opening panel gets cut off — should be wider** | ✅ **fixed here** (below) |
| 3 | **No fullscreen button** | ⚑ queued, and there is a platform catch — §3 |
| 4 | **The debug panel is too long and unclear**; some buttons "don't do anything" | ⚑ queued — §4, and part of it is a real bug |
| 5 | **The entrance: the lights should come up MID-FLIGHT**, not on arrival | design change — §5 |
| 6 | **⚑ Tapping should NOT skip the entrance** | ⚑ a real regression *caused by* mode 3 — §5 |

## 2 · FIXED — the opening panel, and it was my fault
`orientingCard.ts` was `min(660px, 96vw)`. It carries **three** control blocks since the gyro
look-mode was added, each `flex: 1 1 240px; min-width: 220px` — **a single row needs ≈772px.** At 660
they wrapped 2+1 and the card grew taller than an iPad's browser viewport, which is the cut-off.

**⚑ Adding the third block is what broke it; the width never moved.** Now `min(900px, 96vw)`.
Re-check on the device — if it is still clipped, the cause is vertical and the fix is different
(`align-items: center` on a scrollable flex parent can make the top unreachable), so say which edge.

---

# 3 · FULLSCREEN — wanted, and there is a platform catch worth knowing first
**iPadOS Safari supports the Fullscreen API. iPhone Safari historically does not.** So a fullscreen
button is real on the iPad and may be a no-op on the phone — it must **hide itself when unavailable**
rather than sit there dead.

⚑ **And the better answer on iOS may not be fullscreen at all: it is "Add to Home Screen."** A
web-app launched from the home screen runs without Safari's chrome entirely — no tab bar, no address
bar — which is more screen than fullscreen gives and it survives reloads. It costs a manifest and a
meta tag.

**My read: build the fullscreen button AND add the manifest**, and let the home-screen route be the
one recommended for a proper look. Both are small. ⚑ Neither is a `?flat=1` question — this is about
browser chrome, not about the piece's modes.

---

# 4 · THE DEBUG PANEL — and part of this is a bug, not just clutter
> *"The debug should be more clear as it is too long, with no clear instructions of what to play
> around, as on jumps and the others don't do anything."*

**Two separate problems, and they need separating:**

**(a) It is a map that has outgrown its own legibility.** 63 beats plus eras, rooms, facets, sends,
the building and the controls, in one column. S63 rebuilt it once for exactly this reason. It is
Sérgio's map of the piece, so legibility is the feature.

**(b) ⚑ "The others don't do anything" is probably REAL, and it is a known class.** S49 finding 6
already recorded it: **many buttons jump INTO the middle of a thread, and a beat whose prerequisites
were never met renders as nothing happening.** `e2Silence` is labelled "⏵ LINEAR ENTRY (play from
here)" precisely because of this.

> ⚑ **So the panel needs to distinguish three kinds of button, which it currently does not:**
> **⏵ ENTRY** — safe to press cold, plays forward · **JUMP** — lands mid-thread, may need state ·
> **ACTION** — does something only when its beat is already live.

**That is a labelling job, not a rewrite**, and it would turn "doesn't do anything" into "not armed
yet" — which is information rather than a dead end.

---

# 5 · THE ENTRANCE — one design change and one regression

## 5.1 · The lights should come up mid-flight *(design — Sérgio's call, adopted)*
Currently the room wakes on arrival. He wants it **during** the descent. **It is the better beat:**
the descent is 12 seconds of drifting in toward a dark room, and having the light arrive *while you
are still moving* means you watch the room become itself rather than find it already awake.
⚑ It also gives the descent something to *do* dramatically, which is the honest answer to "is it
comfortable or merely slow."

## 5.2 · ⚑ TAPPING SKIPS THE ENTRANCE — a regression that mode 3 created
`app.ts`'s pointer handler still opens with:
```
if (descentActive) { endDescent(); return; }
```
**That fires on PRESS, before S80's tap-versus-drag threshold applies to anything else.**

**On a mouse this was a deliberate, good design** (S48: the descent is skippable by anything, always
— it is a way *out* of a move, not a click on the room). **On a touch screen it is a trap:** the
first thing anyone does with a tablet is touch it, and touching it *to look around* destroys the
opening.

> **The fix is the one S80 already built and this path bypasses: a press that travels is a look, a
> press that stays is a tap.** The skip should require a deliberate tap — and arguably should not
> exist at all on touch, where dragging to look is the natural first gesture.

⚑ **Not fixed here** — `app.ts` is inside S83's fence. It goes in the next code session.

---

# 6 · ⚑ WHAT ELSE TO TEST ON THE iPAD
*The cheapest possible order — each answers something nothing else can.*

## First, because they gate everything else
1. **Re-open the front door.** Is the panel readable now at 900px, in **both** orientations? Which
   edge clips if any.
2. **The turn itself.** Stand up, turn your body 180°. ⚑ **Does the witness wall arrive where your
   body expects it?** This is the piece's one bodily ask and no simulation can answer it.
3. **Recentre** (game menu). Use it after facing away, and check forward is where you left it.
4. **Drag and gyro together.** Drag to look while the gyro is live — do they fight, or compose?

## Then the things §13 lists that only hands answer
5. **Pinch to zoom.** Is 30°–80° the right range, and is the sensitivity right in the hand?
6. **Does a drag ever fire a prop?** S80's threshold is 10 px / 1.2 s — that is a *desktop* number
   and a thumb is not a mouse. ⚑ **If a look ever selects something, say so — that is the highest-
   value bug you can find on this device.**
7. **Sensor noise at rest.** Put the iPad on a table. Does the view drift or jitter?
8. **The belongings window** (E1, "Remind me later" on the first update). ⚑ **Can you reach the duck
   at 80° and the cdStack at 96°?** On a phone, turning your body should make that *easier* than a
   mouse drag — that is the claim mode 3 rests on, and it has never been tested.

## And two that need no interaction at all
9. **Read the correction list in E3 at arm's length.** The screenshot you sent shows it legible in
   landscape — confirm that holds at a normal holding distance, not zoomed.
10. **⚑ Battery and heat over ten minutes.** A WebGL scene at 60 fps on a tablet is a real load, and
    an exhibition piece that cooks the device is a finding nobody has looked for.

## ⚑ DO NOT DO THIS ONE YET
**Do not accept the s2 send on a Quest** (`08 §17`) — 6.874 m/s against a 0.43 envelope, on E2's
ordinary path. On the iPad it is merely unpleasant; in stereo it is the thing the comfort law exists
to prevent.


---

# 7 · SECOND iPAD PASS (2026-08-12, afternoon) — four visual defects, three diagnosed
*⚑ Sérgio's priority, adopted: **tablet first.** "If this is working here I am sure it'll mostly be
easier to convert to Quest, because tablet will be the most used method (for the exhibition at
least)." So the Quest list in `08 §13` waits; everything below is tablet-facing.*

## 7.1 · ⚑ THE BLACK BOARD IN E2 — diagnosed, and it has a documented precedent
The large black rectangle on the wall is **`witnessPanelFrame`** — `[0, 1.5, 3.52]`, 1.8 × 1.4 × 0.1,
colour `#1a1a24`, sitting on `wallSouth` at z 3.72. **It is the witness record's FRAME**, and what he
photographed is the frame with nothing drawn on it.

**⚑ This exact failure is already in the repo's history.** Session 27's note: the record plane's z
was 3.685/3.865, *both deeper than the frame prop's own near face (~3.649)* — so the plane fell
**behind** the frame the instant an era transition ran, and the surface read as a bare board.
**The z was corrected once. This is E2, after a transition, and it is black again.**

**So the hypothesis to test first is the same one: the record plane is behind its frame at E2.**
⚑ Do not re-nudge the z until you know *what re-broke it* — that is the instruction S66 was given
about the shelf, for the same reason.

## 7.2 · ⚑ THE DUCK — the audit already flags it, in EVERY state
`node tools/room-audit.mjs`:
```
FLOATING  rainbowDuck   1.560 m of air under it (base y 1.560, nearest support below y 0)
```
**Not just at E3 — at r1 as well.** S71 fixed the *r3* case and the original placement was never
right. The geometry is ambiguous and I will not guess it:

| | |
|---|---|
| `rainbowDuck` | pos `[1.98, 1.60, 0.38]`, size `0.09 × 0.08 × 0.10` |
| `shelfBoard3` | pos `[1.98, 1.54, 0.75]`, size `0.28 × 0.04 × 0.85` |

Taking pos as centre, the duck's base is **1.56** and the board's top is **1.56** — they should touch.
**But the audit finds the FLOOR as the nearest support**, which means something in x/z is not
overlapping as it looks. ⚑ Note the duck sits at **z 0.38** while the board spans **z 0.325–1.175** —
it is right on the front lip, 5 cm from falling off.

> **⚑ Measure it; do not nudge it.** And the user-facing symptom is the real test: **Sérgio cannot see
> the duck on the device.** Fixing the audit number without him then finding it has fixed nothing.

## 7.3 · The floating tape in E2 — ⚑ NOT reproduced, and that is worth saying
`room-audit` flags only three FLOATING props: `rainbowDuck`, `w_cardigan`, `e_hoodie`. **The last two
are drapes** — a cardigan over a chair back has nothing directly beneath it by design, and that is an
accepted pattern, not a bug. **No tape is flagged in any state.**

So either the tape's support is real and it only *reads* as floating from that angle, or it is a
class the audit does not catch. ⚑ **This one needs Sérgio to say which shelf and which era** — a
screenshot with the tape in frame and the `?debug=1` era chip visible is enough.

## 7.4 · ⚑ THE CD STACK — his design question, and the evidence favours cutting it
> *"the cd stack shouldn't be in another era, since there are the tapes here?"*

**Period-wise it is fine.** 1997 is exactly when CDs were everywhere; a teenager owning both is true
to the year, and cutting it for anachronism would be wrong.

**⚑ But the argument for cutting it is better than the period argument for keeping it, and it is
evidential rather than taste:**
- **`cdStack` is the only prop on that shelf with NO `_doc`.** Every neighbour — teddyBox,
  rainbowDuck, the books — carries a note saying why it exists and which session put it there.
  **A prop with no stated reason is the definition of decoration**, and this room's law is that
  belongings are a life, not set dressing.
- **It competes with the one object the era is built on.** The mixtape is *the* designed candidate,
  Tape C carries the era's refusal, and the boombox is the room's warm instrument. **E1's medium is
  the cassette on purpose.** A stack of CDs beside it does not contradict the period; it dilutes the
  shelf's meaning.
- ⚑ And it is not the apparatus's medium either — **the kit inserted into the machine is a floppy**
  (`KIT_FLOPPY`), not a CD-ROM. So the stack belongs to neither side of the argument.

**My read: cut it, or give it a reason.** Sérgio's call, and either answer is defensible — but
"it has no `_doc`" is the honest reason it feels wrong, and it is his own instinct being right.


---

# 8 · THIRD iPAD PASS (2026-08-13) — ⚑ THE ORIENTATION IS CONFIRMED FIXED, and a pattern emerges

## 8.1 · ⚑ THE DIAGNOSTIC ANSWERED IT, EXACTLY AS HOPED
From the live readout, iPad in landscape:
```
q₂ 90.0° · derived (API said 0.0°)
events legacy 0 · screen 0
```
**Two facts, both decisive:**
1. **`screen.orientation.angle` returned 0.0° while the device was physically in landscape.** The
   §18 hypothesis was right — and the old code's silent `return 0` fallback was therefore returning
   *the API's own wrong answer*, not just a default.
2. **`events legacy 0 · screen 0` — NEITHER orientation event fired, ever.** So S83's decision to
   **poll** rather than listen was not belt-and-braces; **it is the only reason this works at all.**

⚑ **Both of S83's defences are load-bearing. Remove either and it is broken again.** Sérgio: *"now
the image is no longer sideways, great."* **§18 is closed.**

*(One number to keep an eye on: the same readout showed `pitch 173° roll −176°`. Those sit near ±180
rather than near 0, and the acceptance line said roll should settle near 0°. He reports the picture as
upright, so this is most likely a reporting convention rather than a fault — but it is worth one look
at whether the readout's own angles are being printed in the frame it claims.)*

## 8.2 · ⚑⚑ THE PATTERN: three "bugs" are debug-jump artifacts, not defects
His own words give it away — *"The tape on E2 is still there **if i jump from the debug mode**."*

**S84 could not reproduce the tape, the black board, or a duck fault on the ORDINARY path, and it was
telling the truth.** The artifacts appear when a debug button drops the world into a state the played
path never produces: a cold E2 has no filed record (so the board is legitimately black), and a cold
jump leaves props in a fold the era would never have reached.

> **This is the same class as "some buttons don't do anything" — now producing VISUAL artifacts that
> read as defects.** S84 labelled the buttons ⏵ ENTRY / JUMP / ACTION, which helps; **it did not warn
> that a JUMP can also leave the ROOM in an unreachable state.**

⚑ **The next session should make that explicit** — a jump is a review tool, and what it shows is not
evidence about the piece. Until then: **anything found immediately after a debug jump needs
re-checking on the played path before it is treated as a bug.**

## 8.3 · Still open, and needing a re-check on the CURRENT build
Sérgio tested before re-running the deploy, so these may be stale-build results:
| | |
|---|---|
| **The duck** | *"still no duck; are you sure the changes were even committed?"* ⚑ Fair challenge — they were (`c8e82bd`, verified). But it is at **84.2° right of Room-1 forward**, so it needs a real turn. Re-check on the current build, turning right until the shelf is centred |
| **Tapping skips the entrance** | S84 says a drag no longer skips and a ≤10 px / 1.2 s tap still does. He reports it still jumping. Re-check on the current build |

## 8.4 · ⚑ NEW, and both are real
1. **THE SNAPSHOT BUTTON BREAKS THE EXPERIENCE.** S63 fixed it producing black images; it now does
   something worse on a tablet. **Needs diagnosing, and it may be simplest to hide it on touch
   devices** — it is a desktop review affordance and there is no reason it must exist on an iPad.
2. **⚑ ALL CAMERA MOVES ARE STILL SKIPPABLE, not just the entrance.** Sérgio: *"when jumping from era
   to era, you should be able to look around if you need, but tapping should not jump ahead."*
   S84 fixed the **entrance**; the **relocation legs** (the choreography — rise, build, descend) still
   end on any press. **The same tap-versus-drag rule must apply to `endRelocation()` as to
   `endDescent()`**: dragging to look during a transition is welcome, tapping should not cut it short.
   ⚑ That is his design intent stated plainly, and it is the stronger reading — **the choreography is
   the piece's argument about the building, and losing it to an accidental thumb is a real loss.**

## 8.5 · ✅ CONFIRMED WORKING
Fullscreen opens · the debug panel's ⏵ ENTRY / JUMP marks are legible and useful · the horizon holds.
