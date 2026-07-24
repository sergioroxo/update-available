# COPY INVENTORY — SESSION SUMMARY
STATUS: live

**Generated: 2026-07-10 | Reinterp branch sweep**

**Fable review (2026-07-10): ACCEPTED for Sérgio's use.** Spot-checked against
source JSON — verbatim text, context, and ethics-gate flags are accurate. Two
conventions to know when reading: (1) each update ritual is filed under its
DESTINATION era (u2→E2, u3→E3, u4→E4 — the EULA voice belongs to the incoming
brand); (2) a few clearly-labeled metadata rows (`toEra` etc.) are included in
the counts — skip anything marked "Metadata only." Fill the blank "voice pass:"
lines directly in these files; Fable folds accepted lines back into `data/`.

Five markdown files created in `docs/reinterp/` cataloging every player-visible display string from `data/` JSON files. Each era is a separate working checklist for Sérgio's voice passes.

---

## Files Written

1. **COPY_INVENTORY_CROSS.md** — 88 entries | 71 placeholders
   - Opening O1–O3 (opening.json)
   - Updates close ritual (updates.json)
   - Research network labels (close_network.json)
   - Framework chrome (reinterp.json)
   - Lamby rig lab (lamby_rig.json, test-only)
   - All four send offers S1–S4 (sends.json)

2. **COPY_INVENTORY_E1.md** — 95 entries | 88 placeholders
   - Starter Kit (s1_kit.json): ministry, program, 5 pages, cassette insert, dial sequence
   - IRC channel #stillstruggling (s1_irc.json): ambient messages, welcome, DM from MentorRob
   - Era 1 ending ritual (s1_end.json): escalation with Rob, placement packet, diary + deletion attempt, update ritual, slice close
   - Desktop & witness chrome (slice.json): warning, boot, splash, name entry, desktop (clock: 1997), pause, witness panel, dossier card
   - Origin intake provotype (origin_intake_e1.json): van den Aardweg form (Questions 1–5, silence summary), debrief with 4 sources
   - Pillow strike provotype (pillow.json): frame, 3 cycles × 3 taps, terminal loop, close, debrief with 4 sources

3. **COPY_INVENTORY_E2.md** — 21 entries | 20 placeholders
   - Update ritual U2 (updates.json): notification, EULA (2 paragraphs), install, changelog
   - Desktop skin (slice.json eraSkins.e2): clock (2003), brand (Restorify 2003), status, icons

4. **COPY_INVENTORY_E3.md** — 21 entries | 20 placeholders
   - Update ritual U3 (updates.json): notification, EULA (2 paragraphs), install, changelog
   - Desktop skin (slice.json eraSkins.e3): clock (2016), brand (GracePlatform), status, icons

5. **COPY_INVENTORY_E4.md** — 21 entries | 20 placeholders
   - Update ritual U4 (updates.json): notification, EULA (2 paragraphs), install, changelog
   - Desktop skin (slice.json eraSkins.e4): clock (NOW), brand (Continuity of Care), status, icons

---

## Totals

| Inventory | Entries | Placeholders | Status |
|-----------|---------|--------------|--------|
| CROSS     | 88      | 71           | Ready for voice pass |
| E1        | 95      | 88           | Ready for voice pass |
| E2        | 21      | 20           | Ready for voice pass |
| E3        | 21      | 20           | Ready for voice pass |
| E4        | 21      | 20           | Ready for voice pass |
| **TOTAL** | **257** | **219**      | **All placeholders remaining** |

---

## Format Reference

Each entry follows this structure:

```
**key path** (e.g., opening.json → o1_disclaimer_title)
> Current text (verbatim, blockquote if multiline)

Context: speaker/surface (monitor? overlay? IRC? desktop?), register if stated (operable/felt/respite), ethics gate if named (G1–G12), _doc guidance compressed to one sentence.

Voice pass:
```

The blank "Voice pass:" line is for Sérgio to fill during his voice/ethics passes.

---

## Ambiguities Filed Under CROSS

1. **Opening sequence (O1–O3)**: Spans all eras conceptually but appears only in opening.json; filed CROSS per spec.
2. **Recaptions dictionary** (opening.json): System reinterpretation of player choices—appears in witness panel later but defined at opening; filed CROSS.
3. **Lamby rig lab** (lamby_rig.json): Test-only surface (?lambyrig=1), never in production; filed CROSS as structural chrome.
4. **Sends S1–S4** (sends.json): Reference E2 and E3 content but all four offers are defined in one file; filed CROSS with era notes per send.

---

## Key Findings

### Player-Visible Text Coverage

- **E1 (1997)**: Highest density. Kit, IRC, escalation, residential placement, diary, intake form, pillow exercise, desktop shell = 95 entries. All marked PLACEHOLDER in _doc.
- **E2 (2003)**: Update ritual + desktop shell = 21 entries. EULA and changelog form the thesis statement ("same instrument, new casing").
- **E3 (2016)**: Update ritual + desktop shell = 21 entries. Kinder vocabulary masks continuity of files.
- **E4 (NOW)**: Update ritual + desktop shell = 21 entries. "Ambient," "no button to close," "interest is consent"—the totalizing framing.
- **CROSS**: Opening O1–O3, witness chrome, network labels, framework chrome = 88 entries. Cork board, O3 recap, recaptions all demonstrated as "system's self-presentation, not final copy."

### Ethics Gates Present

Entries flagged with:
- **G1** (religious pressure, shame, guilt): Kit prayer, EULA language
- **G6** (predetermined assessment, no evidence): Intake form universal outcome, pillow terminal loop
- **G7** (minor status, adult-administered): Placement packet, framing text ("Mom wants this done")
- **G10** (grooming via trusted contact): MentorRob DM, "fellowship wrote to us about"
- **G11** (person's truth is indestructible): Diary glitch, felt lines in provotypes

### Source Verification Flags

**Every debrief source carries [VERIFY SOURCE]:**
- Van den Aardweg's Anamnestic Questionnaire (1997, documentary)
- Love Won Out monitoring practices (documentary, medium confidence)
- Behavioral monitoring composited from testimony + clinical literature (documentary, medium confidence)
- Cohen's pillow-strike technique (documentary, via Washington Post & GLAAD)
- Ferguson v. JONAH consumer-fraud judgment (documentary)
- APA/UK MOU on conversion-practice lack of evidence (documentary, all sources)
- "Deeper feelings" phrase in pillow script (speculative, low confidence, omitted as framing)

---

## Next Steps for Sérgio

1. **Voice passes per era**: Read each inventory file; fill the "Voice pass:" blank with final wording, tone guidance, or ethics notes.
2. **Placeholder review**: 219 entries marked PLACEHOLDER in their _doc fields — prioritize these. Many carry ethics-gate flags that require Sérgio's judgment (G7 minor status, G10 grooming rhetoric, G11 person's truth).
3. **Source verification**: Flag any [VERIFY SOURCE] entries that need knowledge-base confirmation before final copy (especially Love Won Out, behavioral monitoring composite, Cohen's specific wording).
4. **Cork board & opening**: O1–O3 opening board is labeled "demonstration only — Sérgio picks final set." Confirm icon/chip/goal selections; ensure each can "return, recontextualised, in the witness record or an assistant line" per spec.
5. **Lamby voice**: Lamby_rig.json moods (cheerful/clinical/sterile) are test-only; confirm whether any will ship in final OS (personality not yet decided per spec).

---

## Files Unchanged

No edits made to:
- data/ (all JSON files read-only)
- 01_SESSION_LOG.md
- BUILD_LOG.md
- Any source (.ts, .tsx) or config files

Inventories are new documentation files for Sérgio's workflow only.
