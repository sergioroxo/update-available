STATUS: live

# THE LAMBYOS 2003 BOOT — a 30-second splash, spec'd before it is tried
*Sérgio, 2026-09-04, having listened to all three 6.5 s cuts: **"None of them, the 6 second doesn't
fit. Would it make sense for the full 30 sec jingle? we can do some like animation like to old disney
game cd-rom?"** His ear, and it settles the cuts — they are withdrawn. This is the alternative,
written down first because Era 4's glitch taught this project that a beat improvised into existence
takes three passes and a measurement to undo.*

---

## §1 · Why he is right, and it is not just "the file is 30 s long"

The 6 s sting was reasoning from the WINDOW — the boot crawl is 6.6 s, so cut the jingle to 6.5 s.
That gets the arithmetic right and the object wrong. **A startup sting is what an operating system
has. A 30-second animated splash is what a CD-ROM has**, and 2003's LambyOS is not really an
operating system: it is consumer software that arrived on a disc and wants you to know it cost
somebody money.

And the era's own law permits exactly this. `operable` surfaces "may glitter, charm, play"
(CLAUDE.md), and E2 is where the apparatus is at its most confident — the update has just installed
itself, the machine has come back at a new version, and it is *pleased*. **A splash you cannot skip,
that plays its own theme at you for half a minute before it will let you do anything, is the era
performing its self-regard.** That is the satire, and it collapses later without anyone commenting on
it: by E4 the same company's product opens with no splash at all, because by then it is already
inside the room and does not have to sell itself.

⚑ **It is diegetic, so "the frame never plays" is not violated.** This is the software's splash, in
the software's voice, on the software's surface. The frame stays silent and undecorated throughout.

## §2 · Where it goes, measured

The E2 arrival as it stands (`os.ts`'s `startE2Boot`, timings from the R1 walkthrough):

| beat | now |
|---|---|
| boot crawl (220 chars @ 0.030 s/char) | 6.6 s |
| hold | 2.2 s |
| "Restorify — finishing installation…" | 1.6 s |
| intro (Lamby's debut) | 2.8 s |

**~13 s total, and silent.** The 30 s splash does not replace the crawl — it precedes it. The order
is the one every disc-based product of that decade used: *the publisher's animation, then the
machine's own boot text, then the program.*

⚑ **It does not compete with the changelog.** The changelog-as-thesis types during the INSTALL,
before the restart; this is after it. Two different beats, and R1's §4-2 complaint (the camera leaves
while the changelog is still typing) is a separate fix and stays separate.

## §3 · What it must be, and must not be

**Must:** the era's palette from `src/desktop/theme/` and nothing invented. Pixel discipline —
`FILTER_NEAREST`, integer positions, 90°-step rotations only. On the 512 × 384 offscreen canvas,
which is the piece's one UI surface. Built as a timeline the jingle drives, not a loop that happens
to run underneath it: **the animation should land its beats on the music**, which is the whole reason
the full track is better than a cut of it.

**Must not:**
- **Quote anything real.** No Disney, no Microsoft, no Broderbund, no Humongous. The reference is a
  *register*, not an asset. The mark is ours — Restorify's own.
- **Be skippable.** The point is that it holds you. (⚑ Sérgio's call if he disagrees; the accessible
  alternative is that Esc/pause works throughout, which it already does everywhere, and that is a
  frame affordance rather than a diegetic one — so the fiction is untouched.)
- **Be beautiful in the piece's voice.** It should be beautiful in *2003 consumer software's* voice,
  which is a different and slightly worse thing: gradients faked with dither, a bevelled logo, a
  shine sweep, a tagline that arrives letter by letter.

## §4 · The shape, as a timeline against the track

`Chase_The_Clouds` is 30.77 s, ~64.6 BPM (measured), with phrase onsets at 0.12 · 3.34 · 5.20 · 9.64
· 20.71 · 23.66 s. A four-bar phrase is ≈ 3.72 s. **A first pass should hang its beats on those
onsets** rather than on round numbers:

| t | on screen |
|---|---|
| 0.0 | black, then the mark's first stroke arrives with the opening phrase |
| 3.3 | the wordmark assembles — letter by letter, or a wipe on the second phrase |
| 5.2 | the shine sweep; the tagline types under it |
| 9.6 | the mark settles; a slow bevel/pulse holds while the middle of the track runs |
| 20.7 | "a product of" line, small, the way a publisher's card sits under a logo |
| 23.7 | the last phrase; everything fades to the boot's own black |
| 30.8 | the crawl begins — the existing 6.6 s, unchanged |

**None of these are decisions, they are a starting grid.** The person who builds it should be looking
at the waveform and moving them.

## §5 · What it costs, honestly

A real build: a timed drawing routine in `src/desktop/`, in the era's theme, plus the mark itself
(which does not exist yet — Restorify has a name and no logo). Call it a session, and it is the first
purely *decorative* session this project has had. ⚑ That is worth saying out loud: everything built so
far has been a mechanism or a beat. This is thirty seconds of a company being pleased with itself,
and its value is entirely in how completely it commits to that.

**⚑ Open for Sérgio:**
1. **Skippable or not** (§3).
2. **Does the mark exist?** If Restorify is to have a logo, it needs designing — and that is an
   aesthetic call, not a build one.
3. **Does E3 get one too?** R1 measured 28 s of blank workstation at Era 3's arrival — the longest
   dead air on a lit surface in the piece. A 2016 product would NOT have a CD-ROM splash; it would
   have a two-second wordmark and a spinner. **The same idea, aged**, is one of the strongest
   era-contrast devices available and it costs a fraction of this one.

## §6 · What was withdrawn today
The three 6.5 s cuts in `assets/audio/candidates/` and the shipped `lambyos_2003_boot.mp3` are
Sérgio's "none of them". They stay on disk — a cut is cheap to re-make and the measurement work
(phrase onsets, tempo) is reusable — but nothing should be built on them.
⚑ `check-spec`'s audio count still passes: the shipped file exists and is registered, so the piece is
not broken by this; it is simply playing a placeholder nobody has approved.
