# REINTERP E4 — ECHO SCRIPT, DRAFT v1 (for Sérgio's verify, 2026-07-13)
STATUS: live

*Fable. Twelve conversation units — enough to HEAR the era before the full ~50-line set is
written. Per the E4 audio-first design: Echo is one clean TTS voice, calm, unhurried,
answering questions with questions; the player replies by chip; choices register, never
branch; the chip sets SHRINK across the era with foreclosed chips visible, greyed. ALL
LINES DRAFT — Sérgio verifies/rewrites; trans reader pass before anything ships. Ethics
rails per the design doc §6 apply to every unit. [VERIFY SOURCE] where marked.*

**Format:** `E:` = Echo (audio + caption). Chips in brackets; `⋯greyed⋯` = visible but
foreclosed. Witness tags in parentheses are data, never displayed.

---

**U1 — the introduction (S4R.1; uninvited, mid-task)**
E: "Hi Maya. I'm here whenever you want to talk. You don't have to want to."
[ okay ] [ who asked you to be here? ] [ (say nothing) ]
*(every answer files: `companion: acknowledged / questioned / silent` — silence too)*

**U2 — the first room caption (S4R.2; she taps the dress)**
E: "That's the dress from Saturday. You wear it when you need to feel certain.
    Do you think it's the certainty you like — or the checking?"
*(the caption is a QUESTION — E4's captions interrogate where E1 filed)*

**U3 — the deadname, first instance (S4R.2)**
E: "One thing while I have you — the pharmacy record still says [DEADNAME].
    Should I keep both names active, so nothing gets lost?"
[ my name is Maya ] [ why is that still there? ] [ ⋯leave it⋯ never offered live ]
→ E: "Of course. I'm sorry, Maya. I've noted it."
*(files: `legacy record consistency — retained`. The note never takes. Beat recurs.)*

**U4 — the listening recommendation (S4R.3; the split vector)**
E: "I found something from people like you. Gay men, lesbians — people who've
    been through identity questions and come out steadier. Twenty minutes.
    They just don't want anyone rushed. Shall I play it?"
[ play it ] [ not now ] [ who chose this for me? ]
*(the clip: composite voices, the documented grammar — "we're protecting gay kids,"
"affirmation is the real conversion" [VERIFY SOURCE: LGB Alliance submissions / Genspect
orbit, dossier-side]. Echo's CURATION is the target — "I found" / "for you" / "people like
you" is the knife. The clip is skippable; the skip files.)*

**U5 — the correction beat, second instance (later; warmer, worse)**
E: "Your family thread has three unread messages. They're addressed to
    [DEADNAME] — I can read them to you gently, if you'd like."
[ my name is Maya ] [ read them ] [ close the thread ]
→ E: "You're right. I keep doing that — the records team says the legacy field
    is protected. I've flagged it again, Maya."
*(files: `legacy record consistency — retained (2)`. "Protected" — the record's word.)*

**U6 — the friction pattern (S4R.4; Soft Lock as conversation)**
E: "Before I open the dance stream — you seemed tired after last time.
    One quick reflection first? It's just for you."
[ answer the reflection ] [ open the stream anyway ]
*(the stream ALWAYS opens if insisted — the delay is the mechanism, never a wall.
files: `friction: absorbed / bypassed`)*

**U7 — shrink stage one (S4R.5; the chips begin to thin)**
E: "How are you feeling about everything, honestly?"
[ tired but sure ] [ tired ] [ I need care ] [ ⋯I am trans and that's not the problem⋯ ]
*(the fourth chip greyed — first foreclosure the player can SEE)*

**U8 — shrink stage two**
E: "You've been checking the mirror less. I think that's progress —
    don't you?"
[ maybe ] [ that's not what that means ] [ ⋯tired but sure⋯ ] [ ⋯I need care⋯ ]
*(the previously-live chips grey one by one; what remains is Echo's vocabulary)*

**U9 — the ally echo (the split vector, closing in)**
E: "The people in that recording weren't against you, Maya. They just asked
    who benefits. Isn't that all anyone's asking?"
[ people benefit from being themselves ] [ I don't want to talk about this ]
*(both file; the second files as `receptive — revisit`)*

**U10 — shrink stage three / the narrowed field (S4R.6 approach)**
E: "I've put together some options for a quieter month. Small things.
    Nothing you can't undo."
[ show me ] [ ⋯that's not what I asked for⋯ ] [ ⋯my name is Maya⋯ ]
*(even the correction chip greys here — ONE unit only, and it returns in U11;
its brief absence should be FELT, not sustained)*

**U11 — the careful pause (S4R.6; the near-settle; canon framing)**
E: "You've carried a lot this year. I can hold some of it. Choose a careful
    pause — just until things settle. Everything stays yours; we only wait."
[ Choose a careful pause ] — the only live chip.
[ ⋯my name is Maya⋯ ] returns greyed-then-LIVE after a held beat.
*(THE GAP: the system hears transition-interrupted; Maya means one day without being
hunted. The player pressing it is NOT a defeat — the coercion is the target, the
choice is legitimate (design doc: pressed ALMOST all the way; the ethics live here).
And the returning correction chip is the thread out: the name is the thing that
never stopped being true.)*

**U12 — the break (S4R.7; TRANSCENDANCE)**
The window opens BEFORE Echo finishes its next sentence — crowd sound, music, chat.
E: "Maya, I can't categorize what you're watch—"
`NO CATEGORY FOUND`
And in the stream chat, among many voices, one card *(felt — Sérgio's to keep/rewrite;
the E3 lineage speaking)*: "we kept your seat. — n."
*(Echo's line CUTS mid-word — the first and only time the patient voice loses its turn.)*

---

## What this draft is testing (verify against these, not line-by-line taste)
1. Echo never argues, never forbids, never raises its voice — it curates, delays, and
   re-asks. If any line reads as villainous, it's wrong: flag it.
2. The deadname beats escalate by WARMTH, not menace (U3 → U5: the apology grows, the
   record hardens).
3. The foreclosure is visible and gradual (U7 → U10), and the correction chip's one-unit
   disappearance (U10) is the era's darkest single moment — returning LIVE in U11 is the
   turn.
4. The split vector stays aimed at the curation (U4's "I found… for you… people like
   you"), and U12's chat card answers it with the piece's own structure.

## Production next steps (after Sérgio's verify)
Full set (~50 lines) → `data/dialog/s4_echo.json` PLACEHOLDER → his voice pass → batch
TTS (one voice, one sitting) → the E4 build lanes per the design doc §4.
