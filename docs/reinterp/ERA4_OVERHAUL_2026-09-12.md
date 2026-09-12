STATUS: live

# ERA 4 — THE OVERHAUL, from Sérgio's review of the deployed build
*2026-09-12. Supersedes `ERA4_STATE_2026-09-10.md` §1 and §3, the S133 Commons as built, and the
offers as a beat. Rulings are his, verbatim where quoted; the build order is mine.*

---

## 0 · The sentence the era is built on now
> *"We are taken to a correction system, but Junie's invitation inside of the VR world takes us to a
> place we didn't know, and they take you to a place where Trans is okay, and that makes the system
> glitch out, because she wasn't supposed to see it."*

Four rulings the same day: **cut the offers entirely** · the Commons is **figures in the room AND a
livestream window** · the takeover is **pure rails** · the Restart is **Daniel's 1997 monitor lit inside
the Close**.

⚑ And a correction I owe first: he gave me the livestream, the ball playing and VRChat on the 11th,
and I built lamps and captions. *"You keep ignoring me."* He is right. This document exists so that
does not happen again: everything below is traceable to a sentence of his.

## 1 · Bugs found in the review (why "everything broke")
| what he saw | cause | fix |
|---|---|---|
| every tab press → "Restoring your session" | `E4Browser.handleClick` HANDS THE BROWSER OVER on a press that hits no rect | a miss does nothing |
| the search never clears from the address bar | one address string for every tab | per-tab address |
| Era 4's monitor floating in the Close | `era3-device-monitor` never added to `closeRoomPending` | add it |
| no boot-up after the flyover | the boot exists (`d50f88a`) and is not in the played path | in the path, timed to the landing |
| a box on the laptop; a blue box on the right; the laptop's screen half-hidden | Room 3 desk props; laptop yaw | measure, clear, turn the laptop toward the seat |

## 2 · The era, beat by beat
1. **Arrival.** The flight lands. ~3 s to settle. The monitor boots: *"L — booting up for you, Maya."*
   → *"Restoring your session."* → the tabs come back one by one.
2. **The program.** The browser is Chrome-styled properly and its tabs are **steps L assigns**, mandatory,
   on rails. The laptop is **L's console**: what to do next, in the machine's voice — the guidance he
   asked for. It never mirrors the monitor again.
3. **Search.** Pressing the unfinished search chooses a completion for her and opens the **detrans
   "support" agent** — invented mark, a play on Detrans.AI — which takes over the laptop and locks the
   monitor into the program. *"The system is forcing you to do something."* No refusal is offered.
4. **Photos — the Restoration exercise.** An upload button opens a **diegetic file window inside the
   canvas** — pre-authored folders, pre-authored files — she picks one, and the site returns her
   "restored" to look cis from pre-authored sprite pairs. ⚑ CLAUDE.md invariant holds: never camera or
   file input, never a permission. The record files `photograph: restored — not requested`.
5. **Record · Care · Chat.** Evidence, each with one acknowledgement she must press: the file she cannot
   correct; the care action done for her; the transcript she is asked to confirm.
6. **The headset — the correction session.** One screen: the program's immersive step. No memories, no
   wall, no careful pause. *(Cut, his ruling.)*
7. **Junie's invitation, inside the VR.** *Go in.* The space transforms: a floor and a stage, **a dozen
   low-poly figures** (CC0, batched), **the TransJesus livestream** as a window in the space
   (`transjesus.str` is one of the piece's own marks), the MC calling the four categories, the filter
   failing on the glass — `NO CATEGORY FOUND`. A place where being trans is fine.
8. **The glitch — she wasn't supposed to see it.** The update fails because of what she saw. **The stars
   begin to fall with the glitch**, slowly. The device stops.
9. **The Close.** The flight back to Daniel's seat. Light → dark → blue, **smoothed**. The particles come
   in. **Four panels around her — the explanation and an image of each era's room** (the room plates
   rendered into the panels: the diorama, where he said it belongs) — with each era's **data cluster
   beside its panel**. The slow turn stays. Nothing of this on the headset.
10. **Restart.** ~20 s after the panels settle, **Daniel's 1997 monitor lights up in the Close space** —
    the first object in the piece is the last thing lit — showing *Restart as you are* and the four eras
    to return to.

## 3 · What this retires
- The offers (`offers.ts` as a beat): memories, the wall, curation, the careful pause, the finale's
  glitch/cyclorama/panels on the visor. The code stays; nothing plays it.
- The Commons of S133 (lamps only). The lamps may survive as the room's light; they are not the content.
- The Sunroom as the headset's environment.

## 4 · What holds
Invented marks only · no real names · the photo filter takes no real input · respite is never a trap
and the system targets around it · the frame never plays · no free text · the player never triggers an
update — the failure is the apparatus's, and the cause is what she saw · Quest budget: figures are
batched and counted.

## 5 · Build order
**A · the bugs** (§1) — today, then a deploy, so the browser works again in his hands.
**B · the program** — Chrome restyle; the boot in the path; L on the laptop; search → the agent takeover;
Photos with the diegetic file window and sprite pairs; the acknowledgements.
**C · the headset** — the correction session; the invitation; the Commons with figures and the stream.
**D · the Close** — the glitch-fall; smoothed light; panels with era images and clusters; Daniel's
monitor and the Restart.
Each phase walked and pushed on its own.

## 6 · Still his
The Restart card's wording · the four panels' text · whether the TransJesus stream carries any voice
(none of it may be synthesized) · the two room recordings.
