STATUS: live

# SÉRGIO'S FULL WALKTHROUGH — 2026-08-21
*⚑ His first end-to-end play of the whole piece. **Every item below is his, captured before anything
was fixed**, because fifty findings answered in prose is how the last batch got lost. He ended it:
**"I feel like we didn't do much to fix this project. I am genuinely saddened about this. So much is
missing, so much got lost."** That verdict is the most important line in this file and it is not
softened anywhere below.*

---

# ⚑ THE DIAGNOSIS THIS LIST FORCES
**E1 and E2 have had session after session. E3 and E4 were built and never played by a human until
today.** Every one of my sessions chased the faults Sérgio reported — and he could only report on the
eras he could reach. **That feedback loop starved the back half of the piece**, and his walkthrough is
what starving looks like: *"Okay so I missed all of Era-3… broken room, broken logic."*

**Second, harder finding:** `room-audit.mjs` has reported ~62 findings for weeks and every session,
mine included, triaged most of them as *intentional*. **He has now walked the rooms and they are not
intentional.** Floating books, stacked posters, loose boxes, a screen in mid-air, a CRT in 2026.
⚑ **We collectively learned to read a failing check as noise.**

**His challenge, verbatim and fair:** *"where is this Three.js knowledge… this is very badly done. we
had much more advanced stuff. if you can make the room give the script and I'll send to another model
to do it."*

---

# A · WHAT IS NOW RIGHT (his words — the list is not all bad)
- **"I can finally see the duck and the teddy/monkey"** ⚑ *(but it faces the wall, and it should be the monkey — see D)*
- **"Finally it doesn't jump ahead."**
- **"when we go back the Intake record is a cool addition!"** · **"when I got back it was already waiting for my reply, good."**
- **"Very good the transition to the placement and the message on the menu bar."**
- **"Really like 'a companion tape is included. the player is on the shelf.'"**
- **"The pop-up of the Caleb message is great."** · **"'now playing' great."**
- **"The 'New You' program is just great here!"** · **"The removing of Restorify is cool."**
- **"the grace software has interesting elements"** *(but see E)*

---

# B · ⚑ ROOMS ARE BROKEN — the largest class, and the one he is angriest about
**ERA 3 room:** *"filled with mistakes — the books are floating, the boards on the wall are like 3
posters on top of each other, there is a purple box on the left side of the armchair, the screen is
still floating, there are numerous temporary assets just boxes hanging around."* → *"this room is
super broken."*
**ERA 4 room:** *"such a horrible mess. Why is this older computer here? A CRT makes no sense in 2026.
Why is the Intake panel in the middle of the wall with stuff clipping into it? Why is there a blue box
on the right armchair?"*
**Era bleed:** *"The room should open to Era-3 but the Era-4 room should NOT be visible now."*
**Era 2 staging:** *"needs more changes and elements that make it look like we jumped in time."*
**Era 2 props:** *"the Duck and Monkey are here"* (should they age out?) · *"I've not jumped and the
tape is still there."*

# C · ⚑ ERA 3 IS UNPLAYABLE — sequence and interaction
- *"There is still the 'source file' appearing on the 'Welcome back Vera' screen."* · *"I had to press the source file because it was in front of the text."*
- *"I pressed 'turn and look' — a white box appeared on the table, I touched it and the fly-over just locked itself… now it says 'no cell'."*
- *"Again by mistake I pressed the screen to be able to turn around and it locked up and disappeared."*
- *"Now an update message appeared out of the blue, why? I was still reading Renata and now I had to continue on the 'Continuity of Care'."*
- *"Now I'm updating? What happened? Is this ended already?"*
- **The Grace software is too text-heavy:** *"so filled with text right from the beginning… we need something more dynamic, maybe more visual changes than text, because it is really long to read."*
- *"no connection to the other devices. their models are broken."*

# D · PROPS, MODELS AND MEANING
- **The duck/monkey faces the wall** — *"it is facing the wall, and should be the person."*
- *"Wasn't the duck supposed to have a pride flag?"*
- *"On Era-1 there was nothing that connected to the racket — shouldn't it be part of the training of this era?"*

# E · ⚑ GUIDANCE — his biggest DESIGN idea in this pass, and it is a good one
> *"'insert companion disk' — we risk people not knowing what a disk is… maybe the floppy can lightly
> glow? This is something we should implement throughout the experience: **that it can be conducted —
> not as a symbolism to conversion practices, but as a guide.** That would allow people to understand
> what to do, and the companion tools like Lamby and the messages should offer this guidance."*

- **The tapes need to be identifiable on the shelf** *"because the user doesn't know — also it would help with the glow, because then the person knows what to click."*
- **⚑ The mouse cursor is doing the affordance work:** *"the mouse gives you indications of what is — how would that work on tablet and VR?"*
- *"'companion cassette insert' is not clear what it is, maybe remove."*
- **Windows need minimise, not just X**, so people know they can return to them.

# F · THE LEAVE BUTTON — a real design proposal
> *"The Leave button should let you get back if you want to… it should create an interim space that
> could be safe and affirming to either LGBT and SOGICE people, but should let you go back to the
> narrative if you wanted, or give you a timed countdown."*

**And a naming collision:** the in-fiction apps (Family Companion, Restorify Assistant) also use
**"leave"** — *"should have a different name… maybe 'Go Back'"*, because it reads as leaving the piece.

# G · AUDIO — nothing is scored, and the lyrics do not sync
- *"We need to consider sounds and scoring of the experience."*
- *"I press the prayer and it is very slow to start playing — can only hear the noise. The lyrics are not synced."*
- *"On the computer screen the prayer should match the lyrics and have something guiding you through them."*
- **⚑ He has supplied word-timed Whisper transcripts** (verified present): `Fold My Hands.{json,srt}`,
  `discover_the_new_you_tape97_radio.{json,srt}`, `family_design_solutions_tape97.{json,srt}` in
  `~/Pc_Simulation/Trials Songs/`.
- **Lamby needs sound** — *"need to check how Clippy sounded."*
- **⚑ Captions must be everywhere if this is the VR point** — *"the caption system should be implemented throughout the experience."*

# H · ERA 1→2 SEQUENCE FAULTS
- *"(Press to keep it) is half blocked by the red bar — put it next to 'It cannot be removed.'"*
- *"On the system notice — do you know what the 'Remind me later' button does?"*
- **The fly-over:** *"When it ends, if I am not in the final position it shouldn't force me to be — it jumps very awkwardly. The reboot sequence is missing glitching beforehand, so 'what's new' can appear later as the computer still needs to reboot… maybe make the fly-over slower."*
- **MentorRob:** *"the transition from 'Hi Daniel' to 'you must…' doesn't need a button press."*
- **Connecting to the network** should show *"a very pixelated GIF of a connection symbol"* (he sent the Internet Setup Wizard reference).
- **⚑ The E1→E2 transition is missing work we already designed:** *"missing the cascade of windows that we talked about previously and the glitching effects… you need to go back and check."*

# I · ERA 2 SEQUENCE FAULTS
- **Messenger** *"should already be on the desktop before I press 'how was my walk' — it's the red dot of a new message that changes."*
- *"Too much time after Caleb stops typing and our replies appear — we need more fluidity."*
- **After the video:** *"a message appears on screen like '1 new message – c'? You don't need that, you already have the pop-up… and on the menu bar. Be careful not to remove the video."*
- **PureMail ordering:** *"the 'PureMail – Inbox' coming from the glitch is great but it should NOT come before the interaction with the new message from Caleb."* → *"the Caleb message was blocked and I had to press PureMail."*
- *"'the message, in Lamby's voice' is not needed."*
- **The un-censoring:** *"too slow and the program just stops? Something is off here."*
- **The residue:** *"I pressed 'then it was never me that was broken' and it repeated itself on screen — fix. Also it makes no sense to go back to the desktop. 'Restorify – Service Transition' needs to come earlier, or 'It was never me' can't be like that, because it's not clear if it's a glitch or not."*
- **Era transition:** *"should come as a press, not automatic."*
- *"On Era-2, what does the 'not now' button of Restorify do?"*
- **The Intake record must age:** *"on Era 2 it should change styles and content — it still says era-1."*

# J · ⚑ THE INTAKE PANEL — his structural proposal, worth its own session
> *"Didn't we decide what to do with the intake panel? Where would it go now? **We must use the intake
> panel to have more information about this. Think of the intake panel as a way to add more layers and
> explainers without this experience having to explain every single detail.** The menu button can
> reside there as well."*

Concretely: an intake panel that **ages per era**, carries a **terminology button** opening period
data, and hosts the menu.

# K · BROWSER CONTROLS
- *"On the browser version, why can't I use the scroll wheel or trackpad to zoom in or out?"*
- **Era 4:** *"I turned around, there was an image playing on Daniel's computer… it jumped to the VR, makes no sense."* · *"What is all this text? Why am I seeing the sunroom? I had to restart. Completely broken."*
