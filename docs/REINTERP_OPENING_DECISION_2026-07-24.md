STATUS: live
BUILT: Session 44 (2026-07-24) — all four calls shipped; see docs/reinterp/01_SESSION_LOG.md.
KILLS: src/main.ts#mountStartupOverlay
KILLS: src/engine/app.ts#buildOpeningBoardDressing
KILLS: src/engine/app.ts#OpeningBoardMode
KILLS: src/engine/app.ts#showOpeningSurface
KILLS: src/engine/app.ts#setOpeningBoardVisibleForEra
KILLS: src/engine/app.ts#filePreBootMessage
KILLS: src/engine/app.ts#PRE_BOOT_MESSAGES
KILLS: src/witness/intake.ts#drawCorkBoard
KILLS: src/witness/intake.ts#drawPinnedNote
*(On the anchoring: check-spec C5 requires the `src/<path>` in a KILLS line to EXIST on disk — a
line pointing at a deleted file fails the checker rather than passing it. `src/desktop/opening.ts`
and `src/room/openingBoardDressing.ts` are DELETED (Session 44), so the symbols they used to export
are anchored above to the file that used to reach them — `main.ts` for the overlay, `app.ts` for the
board dressing. The assertion still does the job it was written for: CI fails the moment any file
under `src/` mentions one of these names again. The two `intake.ts` entries are ordinary in-file
kills. Known limit: a symbol re-introduced INSIDE its anchor file is not caught, since C5 exempts
the declaring file.)*

# THE OPENING — decided 2026-07-24 (Sérgio, in-session; no Fable round needed)
*Sérgio chose this directly rather than routing to Fable. It SUPERSEDES the opening design in
`REINTERP_RESTRUCTURE_R28_2026-07-10.md §4` and reverses part of what Session 40 just shipped —
both noted below so the change is tracked, not silent. This doc is the record a build session
works from; fold into MASTER_PLAN_v2 at the next consolidation.*

## The decision, in one line
Kill the in-room cork board. **A richer non-diegetic INTERIM PANEL** (project + controls) is the
whole front door: you **log in → the room wakes by itself** (main light on + computer auto-boots)
→ **complete your profile, Daniel** → the fiction proper.

## The four calls (Sérgio's words, resolved)

1. **The in-room cork board is retired.** "I would've liked the cork board to actually work, but
   there've been so many issues with the design of it that I don't think it's worth it." No real
   diegetic panel inside the room. This retires: `src/desktop/opening.ts` (already dead),
   `openingBoardDressing.ts`, the in-scene wall board, and the O3 profile-pinning-ON-cork. The
   cork board is fully out.

2. **The interim panel carries the weight instead — "a halfway consensus."** Make the
   non-diegetic panel *more creative*, with the real content on it: what the project is, and **how
   to move — shown for BOTH VR and computer** (not a one-line hint; an actual controls display —
   also an accessibility gain). This is the evolution of the existing orienting card (D43), not a
   new surface. It ends with a **log-in / enter** action to begin.

3. **Entry = the room wakes, automatically. Power-press is replaced by AUTO-BOOT.** On log-in,
   **the main light turns on and the computer boots on its own** — until now the room was only
   moonlit through the window. It's symbolic (someone entering a room and flipping the switch),
   and it fixes the sequence: no fiddly "press the power button" gate, no "what if they can't find
   it" fallback logic — the auto-boot IS the entry. **This reverses S40's optional early
   power-press.** The lights-coming-up is the new signature entry gesture.

4. **Profile creation survives, after the room wakes.** "The sequence with the computer is the
   same — Daniel is already chosen, we just complete the profiles as we were doing." Keep the O3
   "Welcome back / let's complete your profile, Daniel" flow (the "they already know your name"
   beat). It doesn't need to be the most logical framing — "let's complete your profile, Daniel"
   is enough.

## What this supersedes (tracked, per the R29 discipline)
- **R28 §4 three-layer opening** → collapses. Layer 1 (orienting card) becomes this richer
  interim/login panel. Layer 3's "teach the verbs" is absorbed: the *entry* verb is taught by the
  panel's controls display + the auto-wake; LOOK/INTERACT as in-room diegetic side-messages (S40's
  `s1_guide.json` look/interact) may still run inside the now-lit room, but they no longer gate
  entry. ~~**Open for a build session to confirm:** do LOOK/INTERACT survive as ambient teaching, or
  retire with the power-press?~~ **ANSWERED (S44): retired** — see "Open for Sérgio" item 2 below.
- **S40 (2026-07-24)** → its optional power-press is superseded by auto-boot; its cork-board
  preservation is superseded by full retirement. S40's panel-retirement and side-message plumbing
  stand.

## ✅ CONFIRMED by Sérgio 2026-07-24 (was: the one open consequence)
The cork board was the **warm first note of the witness lineage** (MASTER_PLAN_v2: "warm cork you
pin your profile to → cold filed record → dashboards → Maya's wall → constellation"). With it
gone, the natural replacement is: **the lit room + "complete your profile, Daniel" IS the warm
state**, which then hardens to the cold intake record on first filing. That keeps the lineage's
warm→cold arc intact with the new front door. **Sérgio confirmed this reading (2026-07-24):** the
lit room + "complete your profile, Daniel" IS the lineage's warm first note; it hardens to the cold
intake record on first filing, as before. The cork board's retirement costs the lineage nothing.

## Build shape (for the session that implements it)
- The interim panel: extend the existing orienting-card surface (`orientingCard.ts`) — richer
  layout, a VR-vs-desktop controls display, a Leave, and the log-in/enter action (keep the ethics
  arm-delay so "enter" can't be hit instantly).
- On enter: trigger the room's light-up (lamp/main light on) + the existing boot crawl
  automatically — reuse S40's auto-boot timer path, just make it the ONLY path (drop the optional
  power-press branch). Then O3 profile as built.
- Retire: `opening.ts`, `openingBoardDressing.ts`, in-scene board geometry, cork profile-pinning —
  add `KILLS:` lines (S41's C5) so the checker catches any lingering references.
- `npm test` + `npm run build` green; baselines `/` and `?flat=1` unaffected; verify with real
  clicks (opening state machine, per S40's note).

## ✅ TRANSPARENCY UNBLOCKED — Sérgio, 2026-07-25
S53 built the log-in panel's transparency (verified legible: worst-case contrast 14.8→14.7:1 body,
4.08→4.04:1 faintest) but it **reveals nothing**, because `main.ts` calls `startApp` *inside this
panel's own continue callback* — no room exists behind it yet. S53 correctly stopped, flagging it as
an ethics call rather than a build one: rendering the room behind the content note means the piece is
visually present before that note is acknowledged.

**Sérgio's ruling:** *"I would assume that us seeing a bit of the space is not the start of the
experience."* → **APPROVED.** A dark, still, moonlit room behind a legible note is not the experience
beginning; the 4s arm-delay and the note both still hold.

**What a session must now do** (needs `main.ts`, outside S53's fence):
1. Move engine start ahead of the panel so a room exists behind it — moonlit, static.
2. **Hold the descent until the player presses enter.** The arc must NOT play out behind the panel;
   the entrance is the *response* to logging in, and spending it unseen would waste the whole gesture.
3. Keep every word legible — if the live room costs readability where the injected stand-in didn't,
   back the veil off and say so. The content note wins over atmosphere.
4. Re-verify: the note is fully readable, the arm-delay still gates enter, `?descent=0` still works.

*(Sérgio also noted he hasn't seen screenshots of this — worth showing him the panel-over-room once
it exists, since the transparency was judged against an injected stand-in rather than the real room.)*

## Open for Sérgio
1. ~~The witness-lineage warm-note relocation above — confirm or redirect.~~ **CONFIRMED** by
   Sérgio 2026-07-24 (see the section above); built and verified in Session 44.
2. ~~LOOK/INTERACT side-messages: keep as ambient in-room teaching, or retire with the
   power-press?~~ **RETIRED** — the build session's call (Session 44, reasoning in the session
   log): LOOK's target (the lamp) is now lit BY the wake rather than pointed at, INTERACT's only
   real referent was the power button this decision deletes, and the interim panel teaches both
   verbs for both platforms before anything starts. Both entries are gone from
   `data/dialog/s1_guide.json`; the guide thread now opens on `floppy`. **Reversible** if you want
   ambient teaching back — say so and it returns as ungated in-room side-messages.
3. Anything the controls display must show beyond the basics — it currently lists, per platform:
   look (drag / head-turn), choose (click / point+trigger), move to a floor marker, and the menu
   (Esc or the corner glyph / the headset menu button), plus one line saying you never walk and
   nothing is timed. **Still yours:** the exact wording (all PLACEHOLDER), and whether it should
   also name snap-turn or the ⟲ turn control.
4. **New, small:** the panel's own copy — the project blurb (`about`), the log-in label ("Log in"),
   and the leave state ("You left. / Nothing was kept.") are Claude drafts in frame voice, awaiting
   your pass. `data/strings/orientingCard.json`.
