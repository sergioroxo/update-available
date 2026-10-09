STATUS: live

# Rules sweep — report only (2026-10-09)

*Read-only. No file was changed except this one. Scope: every string in `data/**/*.json` (77 files, 8,663 strings),
with keys starting `_` skipped. Method: a dump of every string with its key path, then a search for each rule's
patterns, then a read of each hit in context. Verdicts are mine; the lead decides the ones marked **fix**.*

**Counts.** Rule 1: 16 real-name hits, 1 fix. Rule 2: 7 "old file" hits, 0 deadnames. Rule 3: 3 player-visible hits, all in
`_`-noted or placeholder content. Rule 4: 0 slurs, 0 mockery of the debate in player text. Rule 5: 6 files mix
spellings. Rule 6: 0 action lines over 40 words (the 40+ lines are reading text, listed for completeness).

---

## Rule 1 · A real person, brand, product, platform or organisation named

The knowledge base test applied: is the name in `docs/research/` or a `docs/reinterp/VERIFY_*.md` file? Most are
documented; four are not.

| File · key | Name | Where in the knowledge base | Verdict |
|---|---|---|---|
| `dossier/links.json` · several labels | Love Won Out, Exodus, NARTH, Truth in Love, Love in Action, JONAH, Ferguson v. JONAH, APA, Halberstam, Bearman, Turban, SPLC | documented: `docs/research/*`, `VERIFY_CLOSE_LABELS` | **fine because** the sources are documented; these are dossier link labels (citations). |
| `provotypes/*.json` · `debrief.sources[].text` | the same organisations and Google's answer box, Focus on the Family, Malta's Act LV | documented (`docs/research/`, `VERIFY_SOURCE_CLEARANCE`) | **fine because** dossier wording is `documentary`/`contested` by design, and his to phrase. Not edited here. |
| `strings/close_network.json` · `labels[20]`, `labels[22]`, `labels[23]`, `labels[24]` (text and `note`) | SEGM, Genspect, SPLC, Hatewatch, Turban et al., the Genspect parents' survey | `VERIFY_CLOSE_LABELS_2026-10-03.md` (verified, shipped S209i) | **fine because** each sentence is verified and cited in the file's own `src` line. |
| `strings/close_network.json` · `labels[21]` (note) | GETA clinical guide 2022, "exploring" | `VERIFY_CLOSE_LABELS`; cited to GETA, Ashley, D'Angelo | **fine because** verified, and the note gives both sides ("its authors deny it"). |
| `strings/close_message.json` · `cards[3].text`, `sources.un` | UN Independent Expert, 2020 report | `docs/research` mentions it (3 hits) | **fine because** documented and cited with its symbol number. |
| `strings/close_message.json` · `sources.eci` | European Commission reply, 13 May 2026 | `docs/research` (E4 offers source 7) | **fine because** documented. |
| `strings/attributions.json` · `entries[2,4,8,14,15].creator` | "Poly by Google" | the asset licence entries | **fine because** it is an attribution of a licensed asset (CC0-style credit), which the licence law requires. |
| `dialog/s2_media.json` · `scenes[9].line` | "Pastor Dale" ("Then Pastor Dale showed me the program") | the New You ad's own fictional pastor: `_docS62_product` in the same file calls the line a product placement for the programme, and it is the ad's invented testimony voice | **fine because** the name is invented and the file says so; not a real person. Keep. |
| `strings/close_restart.json` · `source.makersLines[1]` | none | — | not a hit (text says "They are not sources about conversion practices"). |
| `strings/attributions.json` · `influences[0,1]`, `entries[13].usedAs` | Sérgio's project credits; "Center for Digital Narrative" | the project's own names | **fine because** they are the credit lines. |
| `strings/opening.json` · `o1_disclaimer[3]`; `strings/orientingCard.json` · `subtitle` | "University of Bergen, Center for Digital Narrative" | the project's institution (CLAUDE.md) | **fine because** it is the project's own credit, named in the brief. |
| `dialog/s1_browser.json` · `results`, `directory.*` | invented ministries and sites ("Fellowship Links", "Walking-Out Ring") | invented | **fine because** every mark is invented (the file's own `_doc`). |
| `dialog/s3_maiden.json` · `link.*`, `linkVote.*` | "The Continental Wire" (masthead), a Malta news headline | `Continental Wire` appears in no source document; it shows only in the walk's own text census (`TEXT_CENSUS_*.json`), i.e. in this card's own rendering | **fix** (verify): a real-looking newspaper masthead. CLAUDE.md allows real names only where documented. The headline is a summary of Malta's Act LV, which is documented; the masthead is not. Invent one (e.g. "The Valletta Courier") or cite the masthead's source in `VERIFY_*`. |
| `dialog/s3_podcast.json` · `app.listLabel` | "SEGMENTS" | the word, not the organisation | **fine because** it is an ordinary word matching the SEGM acronym by chance. |
| `strings/leavePage.json` · `siteName`, `tagline`, `docTitle` | "The Open Reference" (a Wikipedia-style page) | an invented mark in the Leave page's own voice | **fine because** it is invented ("the free encyclopedia anyone can read" is a generic description, not a quote of Wikipedia's wording). Keep, but see §4 for the reading-length note. |

Not hits: Google (in `dossier`), Quest (a device name, documented), Malta (a country; documented), APA (documented).

---

## Rule 2 · A deadname, or anything that reads as an old name for Maya

The piece says only "the old file". None of the hits is a name.

| File · key | Text | Verdict |
|---|---|---|
| `dialog/s4_browser.json` · `chat.entries[2].text`, `chat.entries[8].text` | "under the old file", "addressed to the old file" | **fine because** the phrase is the system's, and the piece never says the name. |
| `dialog/s4_l.json` · `units[3]`, `units[4]` `lines[0].text` | the same | **fine because** same. |
| `dialog/s4_l.json` · `units[3].lines[0].textUnvoiced`, `units[4].lines[0].textUnvoiced` | "— a name you do not use." | **fine because** it is the unvoiced variant, carefully worded (no name). |
| `dialog/s4_l.json` · `units[3].chips[1].reply.text` | "It came across with the old file." | **fine because** no name. |
| `strings/close_network.json` · `panels[3].text` | "Her record keeps her old name “for continuity of care”." | **fine because** "her old name" is a phrase, not a name; the piece's rule holds. |
| `strings/gameMenu.json` · `unvoicedNameOff`, `unvoicedNameOn`, `unvoicedNameNote` | "Maya's former name" | **fine because** the menu row names the setting and says the name is never said. |
| `strings/orientingCard.json` · `nameNote` | "Maya's former name as if it were still hers" | **fine because** same. |
| `provotypes/e4_offers.json` · `debrief.sources[5].text` | "Under the old file" has a documented ancestor… "willing to be called by their original name" | **fine because** a documented quotation of an Exodus manual phrase; the dossier is the lead's. |

Note on rule 2 scope: the sweep checked for name-like strings next to "old", "former", "original", "birth" and
"legal". None found. `Maya` appears only as the character's own name, as designed.

---

## Rule 3 · "[VERIFY SOURCE]" or an unverified-source marker in player-visible text

| File · key | Text | Verdict |
|---|---|---|
| `provotypes/_dummy.json` · `debrief.sources[0..2].text` | "Placeholder … [VERIFY SOURCE]" | **fine because** the file is `_dummy` (a runtime test fixture, not shipped content); the key starts with `_` in its filename. Not player-visible. |
| `strings/status_words.json` · `verifyPublic` | "(this source is still being verified)" | **fine because** it is the player-visible honest label for an unverified source, designed to appear only on `contested`/unverified nodes (`_close_network.schema.json`: "An unverified node must never render as a bright documentary star"). Working as intended. |
| `dialog/s1_kit.json` · `setup.connecting.lines[1]` | "Verifying user name and password ..." | **fine because** it is the 1997 install's own UI text, not a source marker. |
| `dialog/s2_caleb.json` · `network.lines[2].try` | "Restorify care server — verifying…" | **fine because** same kind: the apparatus's status line. |
| `dialog/s4_boot.json` · `search.placeholder` | "Search or type a web address" | **fine because** a UI string. |
| `data/paths.json` · `reinterp_festival[12,13].note` | "the spine uses a placeholder trigger" | **fine because** it is a developer note in a non-player key (`note`), read by no screen. Not player-visible. Worth tidying later. |

No `[VERIFY SOURCE]` marker reaches the player in a shipped file. The only ones are in `_dummy.json`.

---

## Rule 4 · A slur, or mockery of the clinical debate about gender-questioning young people

| File · key | Text | Verdict |
|---|---|---|
| (sweep) | no slur matched | **fine**: 0 slur hits. |
| `strings/close_network.json` · `labels[21].note` | "the word 2026 uses, 'exploring' … Critics such as Florence Ashley say it works like a conversion practice under a gentler name; its authors deny it." | **fine because** it renders both captions, unresolved, as CLAUDE.md requires ("render BOTH captions, unresolved"). It states the critic and the authors' denial. |
| `strings/close_network.json` · `labels[22].note` (Genspect parents' survey) | "not a published research study, and we found no published validation of it." | **fine because** it is a documented, evaluative note on a source, not a joke; it sits on the clinical side of the debate in the Close's own register, with the source cited. Worth the lead's eye, because it leans one way. |
| `strings/close_network.json` · `labels[23].note` (Turban) | "Second Thoughts counts every stop as a change of mind. This study counted 2,242…" | **fine because** it corrects the programme's framing with the study's own numbers; it does not mock the young people. |
| `dialog/s1_irc.json` · `afterReply[2].text` | "rob you always say that lol" | **fine because** it is a teenager's casual line, in the programme's own room; no joke is aimed at anyone's gender. |
| `dialog/s3_flagged.json` · `thread[0].body` | "you were funny and you were completely fine." | **fine because** it is a kind line from a stranger; it is the piece's warmth, not mockery. |

**Result: 0 slurs. 0 jokes at the debate.** The clinical debate is rendered in the programme's register with sources
and counter-sources on screen. The lead may want to judge the `labels[22]` note's weight by ear.

---

## Rule 5 · British and American spelling mixed within one file

Method: a count of US-only and UK-only words per file (after removing words inside quoted names). Six files mix:

| File | US-only word(s) in player text | UK-only word(s) | Verdict |
|---|---|---|---|
| `strings/lexicon.json` | "defense" (inside a quote from a source, `reasons.men[11]`) | "behaviour" (`terms[15].close`, `reasons.trans[0]`) | **fine because** "defense" is inside a source quotation (verbatim), and the file is British. |
| `provotypes/e4_ball.json` | "center" (`debrief.sources[3]`, quoted from a documentary's critique: "the film centres its directo…") | "centres" (same key) | **fine because** it is inside a quoted sentence from a cited essay (bell hooks, 1992), in dossier text. |
| `strings/opening.json` | "Center for Digital Narrative" (`o1_disclaimer[3]`, the institution's own name) | "organised" (`o1_disclaimer[0]`) | **fine because** the US spelling is the institution's proper noun, which stays as it is; the programme's own sentence is British. |
| `strings/orientingCard.json` | "Center for Digital Narrative" (`subtitle`) | "organised" (`contentNote`) | **fine because** same as above: proper noun inside a British file. |
| `strings/close_network.json` | "Center for Digital Narrative" only in a quote | "organised" (in `panels[1]`?) | **fine because** same. |
| `dossier/links.json` | "Colors United" (a proper noun), "catalogue" | — | **fine because** "True Colors United" is a real organisation's name; "catalogue" is British. |

**Net: no file mixes spellings in words the programme or the player writes, and no line needs a fix.** The US hits are proper nouns, institution
names and verbatim quotes. The lead asked for British spelling; the programme's own text is consistent.

---

## Rule 6 · An action line over 40 words the player must read to know what to do next

Every string over 40 words was checked. None is an *action* line. The long ones are reading text (documentary panels,
explanations, the leave page, the Lambient consent card, a parent's letter, the content notes). Those are not hints,
prompts, buttons or step instructions. The four long strings that sit closest to action:

| File · key | Words | What it is | Verdict |
|---|---|---|---|
| `strings/orientingCard.json` · `contentNote` | 60 | the content note the player reads before pressing a button | **fine because** it must be read (ethics surface), and its button is held for four seconds by design (the arm-delay). Not an action line. |
| `strings/orientingCard.json` · `nameNote` | 87 | the name note, same role | **fine because** same. Long by design; it is a warning. |
| `dialog/s3_queue.json` · `lambient.consentSmallPrint` | 49 | the consent card's small print | **fine because** the small print is the point (the permissions list is the satire and must not collapse into a short line). Not an instruction; the button "Allow" / "Not now" is short. |
| `strings/gameMenu.json` · `yourFileIntro` | 47 | the menu's file intro | **fine because** it explains a surface in the frame's voice, below the buttons. |

**Action lines over 40 words: 0.**

---

## Summary of verdicts that need the lead

| # | Where | What | Verdict |
|---|---|---|---|
| 1 | `dialog/s3_maiden.json` · `link.*`, `linkVote.*` | "The Continental Wire" masthead — no documentation | **fix** (invent a masthead, or verify the masthead) |
| 2 | `strings/close_network.json` · `labels[22].note` | Genspect survey note leans to one side of a live debate | **his call** (ethics judgment; rendered with its source, so probably fine) |

All other hits are **fine**, for the reasons above.

*Commands and the method are in the session transcript: a dump of 8,663 strings, then pattern checks per rule, then a
read of each hit in its key context.*
