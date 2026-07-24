STATUS: live

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
  entry. **Open for a build session to confirm:** do LOOK/INTERACT survive as ambient teaching, or
  retire with the power-press?
- **S40 (2026-07-24)** → its optional power-press is superseded by auto-boot; its cork-board
  preservation is superseded by full retirement. S40's panel-retirement and side-message plumbing
  stand.

## The one consequence Sérgio should confirm (my read, not yet his call)
The cork board was the **warm first note of the witness lineage** (MASTER_PLAN_v2: "warm cork you
pin your profile to → cold filed record → dashboards → Maya's wall → constellation"). With it
gone, the natural replacement is: **the lit room + "complete your profile, Daniel" IS the warm
state**, which then hardens to the cold intake record on first filing. That keeps the lineage's
warm→cold arc intact with the new front door. **Sérgio: is that the intended reading, or does the
warmth relocate elsewhere?** (Only real open question here.)

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

## Open for Sérgio
1. The witness-lineage warm-note relocation above — confirm or redirect.
2. LOOK/INTERACT side-messages: keep as ambient in-room teaching, or retire with the power-press?
3. Anything the controls display must show beyond the basics (VR: look + point + trigger;
   desktop: drag + click) — snap-turn? Leave? your call on how much.
