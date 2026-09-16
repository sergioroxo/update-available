STATUS: live

# THE WITNESS SYSTEM — the map, the helper, and the record on the device
*2026-09-16, S145. Sérgio, after the Record landed: "it must also include the interactive mapping of
the project so the person can have a space to follow through; there should be a helper system for
people to know what to do next; a clearer design for the witness system; think how it functions for
the user; on Era 3 and Era 4, since it lives on the devices, it should be more visible where it is —
should we create an app for that?" This is the plan and the order it is built in. It extends
`THE_RECORD_PLAN_2026-09-15.md` (one file, four faces, one reading) and changes none of its laws.*

---

## 1 · What the player has today, and where they get lost

| Need | What exists | The gap |
|---|---|---|
| "Where am I in this?" | Nothing. The era is legible from the room; the *shape* of the piece (four eras, ~30 beats, 45 min) is not. | A player cannot tell if they are a third or nine-tenths of the way through 1997, or that 2003 exists. His fear: "people will feel a bit lost". |
| "What do I do now?" | Era 1: the guide's side-messages (diegetic, terse, condition-driven). Era 2+: Lamby's conduction, ≤2 lines. The seat markers. `moveHint` (frame, once). | Both voices are the *apparatus's* — they can only say what the apparatus wants. When a player sits for a minute not knowing that the next thing is *behind them*, nothing plain tells them. |
| "It is tracking me" | E1/E2: the wall record (a map since S144, pulsed). E3: a *Your record* tile on the board. E4: the record tab + the Legacy file. The stamp on every filing. | From 2016 the record is a tile among six and a tab among six. The stamp is heard; on the devices nothing is *seen* to move when it files. The 2016 profile shows only imported history — not what the platform files *today*. |
| "What is this teaching me?" | The Dossier's *Your file* (menu): per era, what you did → what it filed → the practice → status → source. | Reached only by a player who already wants to read. Nothing at the point of play says a practice is being performed on them. |

## 2 · The principle

**Two voices, kept apart — and one map they share.**

- The **FICTION's** record is cold and never explains: four faces, the pulse, the count. It gets
  MORE visible on the devices (2016, 2026) — a chip in the platform's chrome, a badge on the browser
  tab — because that is where the record lives in those decades, and the point of the faces is that
  you can see it *following you into each new machine*.
- The **FRAME's** reading (the game menu) is where the piece may explain itself, because the frame
  never plays. It gains **THE MAP**: where you are, what has happened, what is next — and under each
  era, what the software has done to you so far, with the dossier's status. The map is the "space to
  follow through"; its current beat's plain hint is the "what to do next".
- The **HELPER** is the map's current hint, surfaced in frame chrome when the player has stalled —
  undecorated, dismissable by any press, never during a bare beat, never filed.

Why not a diegetic helper: the apparatus already has two guiding voices with hard caps (R28-2), and
a third that is *honest* would be the apparatus telling the truth. The frame is the only honest
voice the piece has. Why not a diegetic map: a system that shows you the shape of the piece is a
system stepping outside itself — the Close is the only place the fiction is allowed to do that.

## 3 · The build

**A · `data/strings/map.json` + `src/witness/map.ts` — the map's model.** Four eras; per era a list
of beats `{id, label, done, hint, where?, quiet?}`. `done` is a condition key resolved in code against
the ledger and the OS (the guide's own pattern — conditions in code, content in data); `hint` is the
plain frame line for what to do; `where` is the plain direction ("behind you", "the phone on the
nightstand"); `quiet` marks beats where the helper must not appear (felt/respite: Caleb's thread,
the ball, the Close). `mapState()` returns each era's beats with `done | current | ahead`, the
current beat, and the record's per-era practice list. Pure; never writes.

**B · THE MAP in the menu ("Where you are" — the first row).** Four columns (year · person); the
beats with ✓ ▸ ·; the current beat's hint and `where` at the top in one line; under each era, *so
far the software has:* the practices met (title · status) from the record; a link to *Your file* for
the entries and sources. Era rows are pressable → expand to that era's file (the yourFile view,
scrolled to the era). Frame voice; plain type; nothing animates.

**C · THE HELPER (`src/frame/helper.ts`).** A DOM line in the moveHint idiom, bottom-centre. It
appears when: (i) no press or look for `idleSeconds` (data, 40 s) while the current beat is not
`quiet`; or (ii) the player opens the menu's map and resumes (the hint stays up until the next
press). Any press or drag hides it and resets the clock; a beat change hides it. Text = the map's
current `hint` (+ `where`). It never files. ⚑ The click/tap law's "no timers" forbids pressure on the
clock; an idle helper is the opposite, and it is documented here as such.

**D · THE RECORD ON THE DEVICE — 2016.** `graceQueueLite` grows a persistent **record chip** in the
platform's taskbar, beside *Tasks*: `Your record · N` — the count live off `recordCount()`, the chip
LIT for 1.6 s when the count grows (the device-side twin of the wall's lit row). Pressable from every
platform screen: it opens the *Your record* surface (the existing TaskSurface) and *Back* returns
to wherever she was (board or job). The profile page gains the **2016 rows** — what the platform has
filed today (corrections, comments, contact, the consent decision), newest first, above the imported
history — so the face is the whole file, not the archive.

**E · THE RECORD ON THE DEVICE — 2026.** The browser's *Your information* tab carries a **badge**
with the file's count that lights on growth (the tab bar already has a badge language — the program's
step numbers); the Legacy page gains *this session · N* with the 2026 rows. Nothing new is pressable
on the rails — the badge is a sign, not a control.

**F · ONE PULSE (`src/witness/pulse.ts`).** The wall's `recordSeen`/`witness.pulse()` in app.ts
becomes a shared observer: `pulse.tick(dt)` once per frame, `pulse.k()` (0..1, 1.6 s) read by the
wall, the 2016 chip and the 2026 badge; the stamp plays here. One filing → one stamp, three surfaces.

Order: A → B → C (the frame, one session) · then F → D → E (the devices) · then the walk.

## 4 · How it works for the player (the through-line)

1997. Daniel's room; the guide says *insert the disk*; the player does; the stamp sounds and — if
they have turned — the wall's newest row lights. They have not turned. They stall for forty seconds
on the desktop. A plain line appears at the bottom: *"Next: the kit on the disk — read it to its
last page. (On the desk.)"* They press; it goes. Later, curious, they press the corner glyph: the
menu's first row says **Where you are · 1997 · Daniel · the channel** with four columns beneath;
1997 has three ticks and a pointer; 2003, 2016, 2026 are ahead, their beats listed but unlit. Under
1997: *so far the software has: asked you to describe yourself (documentary) · given you software
that had already decided what you needed (documentary) · routed you to people like you, and kept the
transcript (documentary)*. They resume; the helper shows the current hint once and then leaves them.

2016. Vera signs in; the taskbar reads *Your record · 31*; she applies a correction — the stamp,
and the chip lights: *32*. She presses it: the profile page — 2016's rows first (the correction she
just made, in the platform's words), then *imported · 1997–2003 · read-only*, thirty-one lines.
Back. The board. She now knows the thing counting is the thing she is working inside.

2026. The tab bar: *Your information · 58*. Each step of the program lights it. The Legacy file page
says *this session · 6* over the thirty years. On the visor, in the ball, the system says *47 present
· you*. Then the Close's panels: *IN THIS ROOM, YOU …* — her own lines. Then the menu, if they open
it before leaving: the map is all ticks, the file is 70 entries, 12 flagged, every practice with its
status. That is the reading.

## 5 · Laws that bind
- The fiction's faces never explain; the frame's reading never plays. The helper is frame chrome
  and never appears during a `quiet` beat.
- No new claims: the map's knowledge is the practices already in `practices.json`, with their
  existing source pointers.
- No storage: the map is derived from the ledger every time it is drawn.
- No WASD, no new input: the map and the chip are presses; the helper is text.
- The witness is symmetric: the chip counts refusals as it counts compliance.
- ⚑ In immersive XR the frame has no surface (the game menu is DOM) — the map and the helper are
  browser-only until the frame gets an XR face. Named here, not solved here.
