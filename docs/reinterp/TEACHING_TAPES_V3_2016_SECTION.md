## 5. 2016 "Heartwood", Session Two: The Roots, as a video (S389)

*UiB job 25 Part A (A1, A2, A4, A6, A7), helper A2. Built from §2 (the script and storyboard he saw on the job 24 page: "they
both looked really good, would love to see them"); §2 stays as it is, a research state. A video only: nothing in `src/`,
`data/` or `public/` changed. Every line of display text is a draft for his eye.*

### 5.1 Files

In `output/teaching-tapes/2016/video/` (git-ignored; not in git; `2016/storyboard/` beside it is job 24's and untouched):

- `heartwood_2016_tape.mp4`: the full tape, 3:42.4 (222.43 s), 1920×1080, 30 fps, H.264 high (yuv420p, faststart) and AAC 160k
  stereo, 54.3 MB. Loudness −19.0 LUFS integrated, true peak −1.8 dBTP.
- `heartwood_2016_tape_light.mp4`: the same at 1280×720, two-pass, H.264 main, AAC 96k mono, 14.6 MB (−19.0 LUFS,
  true peak −2.0 dBTP). The page's copy, and `web/full.mp4`.
- `heartwood_2016_short.mp4`: the short tape (§5.8), 58.4 s, 1280×720, 10.3 MB (−19.2 LUFS, true peak −2.1 dBTP). The same file as
  `web/short.mp4`.
- `web/`: the interface for Part B: `full.mp4`, `short.mp4`, `chapters.json` (the chapters, the cards, the ads with
  their skip-from times, for full and short), `sources.json` (the documents, the evidence, the music credit). `READY`
  beside it.
- `segments/`: one file per part, per commercial and per card stretch (§5.2), each with its own `.srt` and `.vtt`
  (timed from zero) and `segments.json`; `segments/light/` holds the same seventeen at 1280×720.
- `captions.srt`, `captions.vtt` (the full tape) and `short.srt`, `short.vtt`: every spoken line and three kinds of sound
  cue. They are also burned in.
- `contact_sheet.jpg` and `frames/`: twelve frames decoded from the delivered MP4, one per block and card.
- `tts/`: the 33 WAV masters (presenter and announcer), with the manifest and the measured speech extents.
- `music/`: the two 30-second candidates (`2016_candidate1_30s.wav|.mp3`, `2016_candidate2_30s.wav|.mp3`).
- `source/`: the build (§5.10). Page fragment: `output/teaching-tapes/page-v3/a2.html` (+ `a2_files.json`).

### 5.2 The running order

| file | time | length | kind | title |
|---|---|---|---|---|
| `segments/00_open.mp4` | 0:00.0–0:08.8 | 8.8 s | title | Heartwood · Session Two · The Roots |
| `segments/01_l1.mp4` | 0:08.8–0:35.7 | 27.0 s | lesson | Part 1 · The Big Three (card at 0:31.2) |
| `segments/02_l2.mp4` | 0:35.7–1:00.0 | 24.3 s | lesson | Part 2 · Defensive Detachment (card at 0:52.6) |
| `segments/03_a1.mp4` | 1:00.0–1:12.0 | 12.0 s | commercial | Ad · Too Close? five-pack (Skip Ad from 1:05.0) |
| `segments/04_l3.mp4` | 1:12.0–1:36.0 | 24.0 s | lesson | Part 3 · The Score Card (card at 1:22.6) |
| `segments/05_l4.mp4` | 1:36.0–1:54.9 | 18.9 s | lesson | Part 4 · Words to Fear, Words to Hear (no card) |
| `segments/06_a2.mp4` | 1:54.9–2:06.9 | 12.0 s | commercial | Ad · Becoming Her at the Summer Gathering (Skip Ad from 1:59.9) |
| `segments/07_l5.mp4` | 2:06.9–2:32.9 | 26.0 s | lesson | Part 5 · No File to Put It In (card at 2:28.0) |
| `segments/08_a3.mp4` | 2:32.9–2:44.9 | 12.0 s | commercial | Ad · GracePlatform Deep Roots, 20 weeks (Skip Ad from 2:37.9) |
| `segments/09_l6.mp4` | 2:44.9–3:13.4 | 28.6 s | lesson | Part 6 · When Friendship Becomes Everything |
| `segments/10_l6x.mp4` | 3:13.4–3:34.9 | 21.5 s | collapse | The three boxes (the collapse; card at 3:30.2) |
| `segments/11_end.mp4` | 3:34.9–3:42.4 | 7.5 s | credits | End card · Discussion questions |
| `segments/12_card_l1.mp4` … `16_card_l6.mp4` | | 8–11 s | card stretch | each claim sentence, its hold and card, 0.6 s of the resumed tape |

The whole is 3:42.4 (§2 estimated 3:38 without the cards; the brief asks about 3:40–4:00). Each hold adds 4.1 s: the
pause 0.3 s, the card 3.5 s, 0.3 s before the tape resumes. The five holds add 20.5 s.

### 5.3 What changed from §2, and why

1. **The record answers** (A1): five holds, one in each of Parts 1, 2, 3 and 5 at the claim sentence, and one after the
   collapse (§5.5). Part 4 has none (§5.5, why).
2. **The collapse's page number.** §2 puts "Romantic gestures and certain kinds of exclusivity are completely
   appropriate…" on R90 printed p. 16. The page image shows it at the top of printed **p. 17** (PDF p. 26); "many of these
   things are not sinful in themselves" is the foot of printed p. 16. Corrected here; §2 is left as it was.
3. **Part 2's hospital stay** now cites the 2001 booklet itself (FOF-F PDF p. 11, printed p. 16: "hospitalization may
   interrupt the initial bonding process without intention"), not the 2016 reprint. The same paragraph holds the card.
4. **Parts 2 and 4 got their own frames** from §2's shot list: the DEFINITION card taped in and a watercolour doormat
   (the mother's flat shoes, the toddler's small shoes turned away, "she pulls back →"); two columns, grey pencil, then
   rose brush.
5. **The ads, over the top** (his bar for any seller's artifact): the five booklets bounce in and a "5-PACK" starburst
   pops with sparkles; the makeover hour's lipstick rises from its tube, the compact's mirror shows only light, the
   dress swings on its hanger, a "NEW!" burst; Deep Roots' roots grow down and down and off the bottom of the frame
   while a counter rolls 1→20 and "Ask about payment plans!" wiggles. Each ad has the platform's chrome: "Ad · 0:nn"
   counting down, "You can skip this ad in 5…", then the **Skip Ad ▸▏** button in the picture from second 5 (nobody
   presses it: the tape is a recording); the amber progress bar. Their start, end and skip-from times are in
   `chapters.json` for a TV that offers a real skip.
6. **Captions** in the platform's face (Roboto, the project's own copy), sentence case, a dark box per line, as 2016
   web players drew them; sound cues in brackets: "[gentle music]", "[upbeat music]" (each ad), "[music stops]".
7. **Silence after the collapse.** The course's music is cut at the end of "…a serious dating relationship"; the hand
   sets the pen down in silence; the hold and its card; the journal closes; no outro.
8. **New lines** (drafts, listed in §5.11): the journal's notes in Parts 2 and 6, the "Words to hear" header, the
   viewer guide's p. 30 question, and the end card's "Heartwood · Session Three: The Wound — next week".
9. Voices: the presenter is Supertonic **F5** at 0.95 (warm, lower), the announcer **F4** at 1.05 (brighter, about
   50 Hz higher); "1993" is spoken "nineteen ninety-three". F1 (1997's fellowship), F2 (Lamby's PureMail) and F3 (L)
   are not used. Every other spoken line is §2's, word for word.

### 5.4 The look: the hands

§2 as he saw it: an overhead camera on a whitewashed table in morning light, a dot-grid journal, a mug, a sprig, washi
tape; the presenter is only her **hands**, drawn (never a face, never footage): the storyboard's right hand in an
oatmeal knit sleeve, pre-drawn once and moved frame by frame, holding a **pen** for lettering and a **brush** for the
watercolour. The hand writes each line as the line appears (the pen tip follows the lettering's edge, with a small
up-and-down for the letter strokes), paints each wash outward from its centre, comes in from the lower right before the
first stroke of a scene and leaves after the last. The lettering runs at the speed of a sped-up journaling video, which
is how those 2016 videos were cut. Things are placed (tape strips, the DEFINITION card, a gold star, the floppy disc)
with a small drop; the member book's **viewer guide** page slides in from the right (Parts 2 and 3). Part 6 turns the
page (the right page lifts and comes over) to the three boxes; the end card closes the journal.

Every base colour is a token from `src/desktop/theme/` (the job 24 list in `source/common.js`, keyed to its file), the
platform's chrome is `era3.ts` ERA3, and the record card is `witness.ts` RECORD. The course's own type is the
storyboard's (SignPainter, Neucha, Lato, Playfair Display, system and user fonts rendered into the frames); the platform's
type is the project's Roboto; the record's is the project's Fixedsys Excelsior.

### 5.5 The record answers: the cards

The common spec, exactly (the orchestrator's): one panel 1440 px wide at x 240, its bottom at y 900, fill `#0d0d1a`, a
2 px `#333344` border, 40 px padding; the head (32 px, `#556677`), the status in a 2 px `#aabbcc` box (32 px, the
Lexicon's `statusBadge` word), the quote (48 px, `#aabbcc`, two lines at most, in curly quotes), the source (32 px,
`#556677`); Fixedsys Excelsior at 32 and 48 px only, no smoothing tricks, no animation. **The 2016 hold:** the platform's
pause overlay, a ❚❚ glyph held at the upper centre and the control bar with a dimmed scrubber (played part, buffered
part, amber marks where the mid-rolls sit, the course's own time, e.g. "0:30 / 2:45"); the frame frozen and silent.

| # | card in | lesson, claim sentence | head | status shown (data) | the line | source, page | Lexicon row (USE / CLAIM) |
|---|---|---|---|---|---|---|---|
| 1 | 0:31.2 | Part 1: "It's not a sexual orientation problem. It's an identity crisis." | WHAT WAS FOUND | NOT SUPPORTED (NOT SUPPORTED) | "being gay, lesbian or bisexual is compatible with normal mental health and social adjustment" | Royal College of Psychiatrists, Position Statement PS02/2014, p. 2 | `reasons.women[8]` "an identity crisis"; CLAIM S19 (RCPsych) and S16 |
| 2 | 0:52.6 | Part 2: "Even a hospital stay can interrupt that first bond." (after the defensive detachment) | THE SAME SOURCE SAYS | NOT SUPPORTED (NOT SUPPORTED) | "Failing to obtain this attachment to mother is not the cause of homosexuality by any means" | Focus on the Family, *the heart of the matter* (2001), PDF p. 11, printed p. 16 | `reasons.women[0]` the mother wound |
| 3 | 1:22.6 | Part 3: "His words become her score card: passing or failing as a little girl." | WHAT WAS FOUND | NOT SUPPORTED (NOT SUPPORTED) | "Theories that certain patterns of family relationships cause same-sex sexual orientation have been discredited" | APA Task Force report (2009), PDF p. 81, printed p. 73 | `reasons.women[3]` the father; CLAIM S16 |
| 4 | 2:28.0 | Part 5: "…she has no file to put it in. It gets lost." | THE SAME SOURCE SAYS | NOT SUPPORTED (NOT SUPPORTED) | "It is wrong to draw up one pattern and then try to squeeze every person into that particular box." | Exodus booklet #PR-02 *Are People Born Gay?* (1993), PDF p. 3, printed p. 2 | `reasons.women[8]` (the floppy is the identity claim, RESEARCH_ROOTS §3B, B9) |
| 5 | 3:30.2 | Part 6, after the collapse ("…and sometimes even in a serious dating relationship.") and the pen set down | WHAT WAS FOUND | NOT SUPPORTED (NOT SUPPORTED) | "…lesbians … form stable, committed relationships … equivalent to heterosexual … in essential respects." | APA Task Force report (2009), PDF p. 10, printed p. 2 | `reasons.women[2]` emotional dependency; CLAIM S16 |

**Why each head.**
1. *Part 1, the evidence.* The booklet's own nearest hedge ("no one cause of lesbianism can be pinpointed", FOF-F
   printed p. 31) does not contradict "three primary conditions"; it fits them. The claim is that being lesbian is a
   crisis. The record answers with the CLAIM side of the row: the Royal College's statement that it is compatible with
   normal mental health.
2. *Part 2, the source itself.* In the very paragraph the lesson draws on (the mother, the hospital stay), the 2001
   booklet says failing that attachment "is not the *cause* of homosexuality by any means" (its italic; the card has
   none). The sentence goes on: "it simply opens the door for a child's susceptibility to same-sex attraction". The
   card quotes the first clause only, which is the programme disowning the lesson it is teaching; nothing outside the
   booklet is stronger.
3. *Part 3, the evidence.* The father's grade is a family-pattern theory, and the APA report's sentence on such theories
   is the CLAIM side of the row (the brief's own example). The quote has no closing full stop, so it fits two lines of 56
   characters. The same-source alternative was the 2001 booklet's "(note: most 'tomboys' grow out of this phase and do
   not become lesbians)" (printed p. 19), but the lesson would need a new line about copying boys to set it up.
4. *Part 5, the source itself.* The floppy-disc booklet (1993) warns, on its own second page, against squeezing "every
   person into that particular box"; the lesson's picture is a Save dialog with no folder for her.
5. *The collapse, the evidence.* The collapse is already the programme contradicting itself (the same seven signs are
   warnings between two women and "completely appropriate" in marriage). The card then gives the evidence for the part
   that has no box (Vera's sentence, §2.8): the APA's finding that lesbian couples' relationships are equivalent to
   heterosexual ones in essential respects. It is the CLAIM side source of the row (S16), but not the sentence the
   Lexicon's note for #44 quotes; it is in the report's executive summary. Three ellipses make it fit two lines; the
   whole sentence: "Gay men, lesbians, and bisexual individuals form stable, committed relationships and families that
   are equivalent to heterosexual relationships and families in essential respects."

**No card in Part 4** ("Words plant seeds"). Neither head has a short, page-checked line that answers it. The booklet's
page (FOF-F printed p. 20) has no hedge. The APA's nearest line ("There is currently no evidence that teaching or
reinforcing stereotyped gender-normative behavior in childhood or adolescence can alter sexual orientation", printed
pp. 4 and 85–86) answers the "words to hear" cure rather than the cause, and it does not fit two lines without cutting
its qualifier. "At most one per lesson" allows none, so Part 4 runs uninterrupted.

**How each quote was checked against its page.** The archive booklets: page images rendered and read (FOF-F PDF pp. 11,
12, 18; PR-02 PDF pp. 3, 6, 11; R90 PDF pp. 21, 22, 24–26, 30; PR-09 PDF p. 18), with his `ocr/pdfocr.swift` for the
text. The evidence: the two documents the Lexicon cites (LEXICON_SOURCES_VERIFIED S16, the AGLP mirror of the APA report;
S19, the College's own PDF) were fetched read-only on 14 Nov 2026 and read page by page; the APA's printed page is the
PDF page minus 8 (printed 2 = PDF 10, printed 73 = PDF 81). The Lexicon's S16 entry gives the family-pattern quote as
"p. 80"; it is PDF p. 81, printed p. 73 (the brief's "p. 73" is right). For the Lexicon keepers; nothing in `data/`
changed.

### 5.6 The script, with sources

*Times are the full tape's (video time). N = the presenter (spoken, captioned). PAGE = what her hand letters or paints.
VG = the viewer guide insert. AD = an ad's voice. CARD = the record's card (silent). Source keys as §2.4 (R87 / R90 the
Emotional Dependency booklet, B2 F9; FOF-F the 2001 women's booklet, B6 F4; LR16 the June 2016 reprint; PR-02 / PR-09
the Exodus booklets, B2 F12; B3F3 the 1989 outline; SSW12 the 2012 workbook via RESEARCH_DYKAS). Pages are "PDF p."
and, where the booklet has its own numbers, "printed".*

| time | who | line | source (document, page) |
|---|---|---|---|
| 0:00 | PAGE | Heartwood · SESSION TWO · THE ROOTS · *a course for women* · six sessions · viewer guide inside · "a tree is known by its fruit" · this week: read p. 22–31 | invented title and course form (SSW12, 20 sessions, timed blocks, via RESEARCH_DYKAS); the verse: SSW12 pp. 9–10 (a tree known by its fruit) |
| 0:01 | small print | Heartwood draws on classic teaching first published 1984–2001. | invented; the dates are R87 p. 3 (© 1984, 1987) and FOF-F (© 2001) |
| 0:03 | N | Grab your journal and your viewer guide, friend. Today we go underneath. | invented; form: SSW12 session openings (RESEARCH_DYKAS) |
| 0:09 | PAGE | *Out of the heart* · Luke 6:45 · the tree painted: canopy, fruit, trunk, roots, soil | SSW12 pp. 9–10, 14–18 (the Tree Model) |
| 0:10 | N | Every tree is known by its fruit. But fruit grows from roots, and roots grow in soil. | SSW12 pp. 9–10, 14–18 (paraphrase) |
| 0:15 | PAGE | fruit · *same-sex attraction*; in the soil: a mother who seemed distant · a father's score card · words from other kids · media & schools | FOF-F PDF pp. 8–9 (printed 10–13, the "preconditioning factors": "Media influences", "Public school and university curricula", peer labelling); LR16 l. 53 |
| 0:18 | N | For women, the classic teaching names three things in the soil: our relationships, our identity, and how we picture God. | FOF-F PDF p. 8 (printed 10): "THE BIG THREE", "Lesbianism results from three primary conditions: Relationship issues, An identity struggle, A spiritual fallacy"; PDF p. 10 (printed 14–15) |
| 0:23 | PAGE | RELATIONSHIPS · IDENTITY · A PICTURE OF GOD, stepped like stairs in the soil | FOF-F PDF p. 8 (the three stepped like stairs) |
| 0:27 | N / PAGE | It's not a sexual orientation problem. It's an identity crisis. (*identity crisis* on the trunk) | **verbatim** FOF-F PDF p. 10 (printed 15): "The lesbian struggle is not a sexual orientation problem; it is an identity crisis." |
| 0:31 | CARD | WHAT WAS FOUND · NOT SUPPORTED · "being gay, lesbian or bisexual is compatible with normal mental health and social adjustment" | RCPsych PS02/2014 p. 2 (§5.5) |
| 0:36 | PAGE | DEFINITION · *defensive detachment* (n.), taped in | FOF-F PDF p. 12 (printed 18, the DEFINITION box) |
| 0:37 | N | A little girl first learns who she is from her mother. | FOF-F PDF p. 11 (printed 16): attachment to mother "is the foundation of her complete feminine identity" (paraphrase) |
| 0:38 | PAGE | the doormat: the mother's flat shoes; a dotted line; the toddler's small shoes turned away; *she pulls back →* | the drawing is ours (§2.4, 0:35); FOF-F PDF p. 11 (printed 17): "the daughter may begin to detach and withdraw from her" |
| 0:41 | N | If Mom seems distant, critical or overbearing, she may pull back to protect herself. The teaching calls it defensive detachment. | FOF-F PDF p. 11 (printed 17): mother "perceived as distant, bitter, critical, overbearing and unloving … When the little girl pulls back, she engages in what is known as defensive detachment"; LR16 l. 141 |
| 0:49 | N / PAGE | Even a hospital stay can interrupt that first bond. (*+ even a hospital stay*) | FOF-F PDF p. 11 (printed 16): "hospitalization may interrupt the initial bonding process without intention"; LR16 l. 131 |
| 0:52 | CARD | THE SAME SOURCE SAYS · NOT SUPPORTED · "Failing to obtain this attachment to mother is not the cause of homosexuality by any means" | FOF-F PDF p. 11 (printed 16), the same paragraph (§5.5) |
| 0:57 | VG | p. 30 · 4. She may begin to ________ her own sex. | FOF-F PDF p. 12 (printed 18): "a distrust or disdain of the same-sex parent"; the fill-in form is a design choice |
| 1:00 | AD | Is a friendship getting too close? The little booklet with the checklist. Order a five-pack for your group. · screen: Too Close? · when a friendship becomes everything · with a checklist · ✓ wanting time alone together · jealous when she sees others · no plans without her · "our song" · $1 each · sold in fives · GracePlatform Store | §2.6 item 1: the booklet at $1.00 (R87 PDF p. 15); FOF-F PDF p. 21 (order page: "Emotional Dependency", "With a checklist", $1); the 2016 five-pack (SRC §1 item 5, page not saved); RHN14 p. 4; the ticks R90 PDF pp. 22, 25, 30. Cover: two women from behind (RES §8G4) |
| 1:13 | PAGE | REPORT CARD · *a little girl* · from Mother: the MODEL ♡ · from Father: the GRADE ? · passing ☐ failing ☐ | PR-02 PDF p. 6; FOF-F PDF p. 12; the drawing is ours |
| 1:13 | N | A girl looks to her mother for the model, and to her father for the grade. | PR-02 PDF p. 6: "She will look to her mother for role modeling, but to her father for how well she is doing" (paraphrase) |
| 1:18 | N | His words become her score card: passing or failing as a little girl. | PR-02 PDF p. 6: "The responses from her father produce the score card of passing or failing as a little girl" (© 1993) |
| 1:23 | CARD | WHAT WAS FOUND · NOT SUPPORTED · "Theories that certain patterns of family relationships cause same-sex sexual orientation have been discredited" | APA 2009 printed p. 73 (§5.5) |
| 1:27 | N / PAGE | From about eighteen months, Dad needs to come alongside her. (*18 months: Dad comes alongside*) | FOF-F PDF p. 12 (printed 18): the father "must come alongside his daughter and affirm her" as she "approaches the age of 18 months old" |
| 1:30 | PAGE | mirror · lipstick · Mum / church dress · Dad; a gold star | PR-02 PDF p. 6 (the booklet's own healthy examples, RES §2B B5) |
| 1:32 | VG | p. 31 · 1. A girl looks to her mother for the ______ and to her father for the ______. 2. His responses become her ______ ______ of passing or failing as a little girl. 3. Fathers should come alongside at ____ months. | the three lines above |
| 1:36 | PAGE | WORDS TO FEAR (grey pencil) · *Words to hear* (rose brush) | FOF-F PDF p. 13 (printed 20): WORDS TO FEAR / WORDS TO HEAR |
| 1:37 | N | Words plant seeds. Some of them are words to fear. | invented; FOF-F PDF p. 13: "Innocent friends can plant seeds of confusion" |
| 1:39 | PAGE (fear) | "Thanks, young man!" · "She should have been the boy." · "Why can't you be more like the girl next door?" · "Women don't lead here." | **invented, one per documented category** (no slurs, no quoted name-calling): FOF-F PDF p. 13 (adults calling her "son" or "young man"; "You should have been a boy"; compared to a girl down the street; the church saying a woman is less important); B3F3 p. 3 (1989, "should have been a boy" as a label) |
| 1:41 | N | Being told she should have been a boy. Grown-ups calling her "young man". | FOF-F PDF p. 13; B3F3 p. 3 (categories, not quotes) |
| 1:46 | N / PAGE (hear) | And words to hear: a father who calls her his girl. A church that tells her she has equal worth. ("There's my girl." · "You matter as much as anyone here.") | FOF-F PDF p. 13 (a father calling her his "precious little girl"; the church: "of inestimable worth and value … on an equal level"); the two lettered lines invented |
| 1:55 | AD | Two days. Workshops. Worship. And on Saturday afternoon, the makeover hour. Every session online afterwards. · screen: SUMMER GATHERING · Two days. Workshops. Worship. · SATURDAY · 2:00 PM · Becoming Her · the makeover hour · NEW! · every session online after · a lipstick, a compact (its mirror only light), a dress on a hanger | §2.6 item 2: the conference shape (RHN 2013–2015 pages, SRC §2A.2–4); the makeover session at the annual Exodus conference (FOF-F PDF p. 17, 2001; RES §4B #6); clothes shopping as cure (PR-09 PDF p. 22, 1993). **Date flag:** the makeover is documented 1993–2004, not in 2016 |
| 2:07 | PAGE | *a computer analogy* (an old teaching, 1993); the disc drawn as the Save icon, labelled *woman* | PR-02 PDF p. 11 (printed 19): "To use a computer analogy" |
| 2:08 | N | Here's a picture from an older teaching — 1993. Remember floppy disks? | PR-02 © 1993; the question is ours (in 2016 the floppy survives as the Save icon); a real 3.5" disc is laid on the page |
| 2:15 | N | A straight woman has a disc labelled "woman". Every affirmation of her femininity is saved there. | PR-02 PDF p. 11 (printed 19): "a heterosexual woman has a floppy disc that is titled 'woman,' so each experience that is related to her femaleness can be stored in that file" (paraphrase) |
| 2:22 | N / PAGE | A lesbian receives the same affirmation, but she has no file to put it in. It gets lost. (Save to… church · work · family · friends · "woman" — no folder · *no file to put it in* → lost) | PR-02 PDF p. 11 (printed 19): **verbatim** "she has no file to put it in"; the experiences "get lost" |
| 2:28 | CARD | THE SAME SOURCE SAYS · NOT SUPPORTED · "It is wrong to draw up one pattern and then try to squeeze every person into that particular box." | PR-02 PDF p. 3 (printed 2) (§5.5) |
| 2:33 | AD | Twenty Monday evenings. A hundred and fifty dollars covers your materials. Ask about payment plans. · screen: DEEP ROOTS · 20 WEEKS · Monday evenings · $150 covers your materials · Ask about payment plans! · women and men welcome · GracePlatform | §2.6 item 3: a 2016 Living Waters group (SRC §1 item 6 / §2A.10; not saved: only what §2 says); LIA's 20-week group (B1 F19 PDF pp. 3–4, RES §4B #7) |
| 2:45 | PAGE | a lifeguard's ring and its rope; *death grip* | PR-09 PDF p. 18 (the lifeguard; "death grip relationship") |
| 2:46 | N | Lifeguards are warned about a swimmer so frantic she locks her arms round her rescuer. One teaching calls dependency a death grip. | PR-09 PDF p. 18: "Some struggling swimmers are so frantic that they lock their arms around a would-be rescuer"; **verbatim** "death grip". Its next words (both die together) are not voiced |
| 2:55 | N / PAGE | Emotional dependency is when someone else's presence feels necessary for your security. (*"necessary for my security"*) | R90 PDF p. 21: dependency "occurs when the ongoing presence and nurturing of another is believed to be necessary for personal security" (paraphrase; the note is ours) |
| 3:01 | N / PAGE | When anyone takes the centre that belongs to God, the old booklet calls it idolatry. (the circle lettered GOD; a blank slip of washi over the centre; *idolatry*) | R87 PDF p. 4; R90 PDF p. 24: "the idolatry which takes place when something or someone, other than God, is at the center of our lives". The slip never carries a name |
| 3:07 | N / PAGE | Here are the signs. (DEPENDENCY · *warning signs* · ☑ time alone together · jealous of others · no plans without her · pet names, private jokes · wearing her clothes · poetry, "our song" · moving in together) | R90 PDF p. 22 ("let's look at the signs"; time alone, jealousy, no plans without her); PDF p. 25 (the manipulations: nicknames, clothing, poetry and music, moving in together); PDF p. 30 ("our song") |
| 3:09 | N | Whether or not anything physical happens, sin has entered the friendship. | R90 PDF p. 22: "Whether or not physical involvement exists, sin takes place when a friendship becomes a dependent relationship" (paraphrase) |
| 3:13 | PAGE | the page turns: FRIENDSHIP (*healthy*: includes others · free and generous · happy she has others) · DEPENDENCY (the seven, ticked) · MARRIAGE (*appropriate*: the same seven, each with a heart) | R90 PDF p. 22 (a healthy friendship is "free and generous", includes others, glad when a friend "hits it off with another person"); PDF p. 26 for the third box |
| 3:14 | N | Now, many of these things aren't sinful in themselves. | R90 PDF p. 26 (printed 16): **verbatim** "many of these things are not sinful in themselves" |
| 3:18 | N / PAGE | Romantic gestures and certain kinds of exclusivity are completely appropriate in marriage and engagement. | R90 PDF p. 26 (**printed 17**): **verbatim**. Lettered plainly in sans |
| 3:25 | N / PAGE | …and sometimes even in a serious dating relationship. | R90 PDF p. 26 (printed 17): **verbatim**. THE COLLAPSE (§2.7) |
| 3:28 | — | The music stops. The hand sets the pen down and leaves. | |
| 3:30 | CARD | WHAT WAS FOUND · NOT SUPPORTED · "…lesbians … form stable, committed relationships … equivalent to heterosexual … in essential respects." | APA 2009 printed p. 2 (§5.5) |
| 3:35 | PAGE | the journal closes: Heartwood · SESSION TWO; *Discussion questions are on page 33 of your viewer guide.* · Heartwood · Session Three: The Wound — next week | invented; form: SSW12 (each session ends in discussion questions). "The Wound" is invented (the course's next session) |

### 5.7 The music (A2)

Made in code for this tape, at build time, in `source/music.py` (numpy only; seed 2016): no sample, no outside track, no
Treblo loop anywhere (grep of the folder: none), no melody from a real song. The parts:
- **ukulele** and **guitar**: Karplus–Strong (a noise burst circulating in a delay line with a lowpass in the loop),
  strummed with a few milliseconds between strings (down and up), through a synthetic body (three decaying resonances);
- **felt piano**: additive partials with a little inharmonicity, the highs rolled off (the felt), a soft attack, a low
  hammer thump;
- **claps** and **snaps**: band-passed noise in three micro-bursts; the ads' **glockenspiel**: sine partials at a
  bar's ratios 1 : 2.76 : 5.40; a short room.

**Candidate 1 (the tape's):** C major, 100 BPM, re-entrant ukulele strummed D · D U · U D U, a felt-piano motif written
for this tape that answers itself every two bars, felt-piano bass, light claps on 2 and 4; 16 bars, C G/B Am F C G F G /
F G Em Am F G C C. **Candidate 2:** G major, 84 BPM, a finger-picked steel-string pattern, the felt piano answering,
finger snaps; G Cmaj7 Em7 D G Cmaj7 Am7 D. Both are 30.0 s with a ringing last chord, at about −16.6 and −17.1 LUFS for
listening. **The mid-roll stings:** three flat "corporate ukulele" beds (D, F and A major, 128 BPM, straight eighths, a
glockenspiel on top, claps, a soft-clipped "button" chord at the end).

**In the mix:** the course's bed runs in course time (it stops under each mid-roll and resumes after it), about 15 dB
under the voice in the gaps and about 22 dB under it while she speaks; the ads sit about 10 dB under their announcer. The
music stops dead in every hold (the tape is paused) and is cut at the collapse. Credit: **"Music: made in code for this
tape by Claude (Anthropic, Opus 5.5)"** (in `web/chapters.json`, `web/sources.json` and the files' metadata). To hear
candidate 2 under the tape: `python3 music.py tape 2`, then `audio.py` and `encode.sh`.

### 5.8 The short tape (A7)

`web/short.mp4`, 58.4 s, cut from the same master (the captions and cards are in the frames):

| short | from the full tape | kind | title |
|---|---|---|---|
| 0:00.0–0:02.4 | 0:00.0–0:02.4 | title | Heartwood · Session Two · The Roots ("Heartwood" being lettered over the sage wash) |
| 0:02.4–0:29.1 | 0:08.8–0:35.4 | lesson | Part 1 · The Big Three, whole, with its card (at 0:24.9) |
| 0:29.1–0:41.1 | 1:00.0–1:12.0 | commercial | Ad · Too Close? five-pack ($1 each, sold in fives; Skip Ad from 0:34.1) |
| 0:41.1–0:58.4 | 3:17.4–3:34.7 | collapse | The three boxes: "Romantic gestures…completely appropriate in marriage and engagement…and sometimes even in a serious dating relationship"; the pen set down; the card (at 0:53.9) |

The brief's choices, kept: the tree (it comes back, relabelled, in 2026), and the *Too Close?* five-pack, the very
booklet the collapse then reads. To stay under 60 s the collapse starts on "Romantic gestures…" with the three boxes
already drawn (the full tape's "Now, many of these things aren't sinful in themselves" and the page turn are left out).

### 5.9 Checks

All run on the delivered files (14 Nov 2026):

1. **Captions against the audio** (`check_captions.py`): 33 spoken lines, 59 caption chunks. Every line's captions start
   no later than its speech and end no earlier, in video time with the holds counted; no two voices overlap (the closest
   gap 0.35 s); no voice runs into a hold; no caption shows during a hold; every chunk is on screen at least 0.8 s and at
   most 22 characters a second. Every hold and gap is set from each clip's measured speech extent (`timing_raw.json`), and
   each clip file is re-checked against it. **0 problems.**
2. **Loudness** (ffmpeg `ebur128`): the mix −19.0 LUFS; the full MP4 −19.0 LUFS, true peak −1.8 dBTP; the light MP4 and
   `web/full.mp4` −19.0 LUFS, −2.0 dBTP; `web/short.mp4` −19.2 LUFS, −2.1 dBTP.
3. **The holds are silent** (`check_holds.py`, and an assert in `audio.py`): digital zero for all five holds in `mix.wav`
   and in the decoded full and light MP4s.
4. **The web files** (`finalize_web.py`, `check_files.py`): `web/full.mp4` 14.58 MB, 222.43 s; `web/short.mp4` 10.34 MB,
   58.43 s; both 1280×720, H.264 Main, yuv420p, AAC 96k mono, `+faststart` (moov before mdat), a keyframe at most every
   2.00 s; chapters contiguous, every card inside a lesson or the collapse; the short tape under 60 s. `READY` written.
5. **No Treblo:** `grep -ri treblo` over `output/teaching-tapes/2016/video/` finds nothing; the music is `music.py`'s.
6. **The card quotes**: all five read on their pages (§5.5).
7. **The render**: 6,673 frames, no page error, every font present (the record face's curly quotes and ellipsis checked
   against a fallback, pixel by pixel). Twelve frames decoded from the delivered MP4 in `contact_sheet.jpg`.
8. **Not checked, and only his ear can:** I could not listen to the voices or the music. No TV, headset or phone test
   (that is Part B's).

### 5.10 How to rebuild

From `output/teaching-tapes/2016/video/source/` (Chrome, ffmpeg, the repo's `node_modules` and the project `.venv`;
nothing touches the network):

```sh
python3 make_manifest.py                                   # tts_manifest.json (the 33 lines)
.venv/bin/python tools/tts/render.py --manifest output/teaching-tapes/2016/video/source/tts_manifest.json --all   # from the repo root
.venv/bin/python measure.py                                # timing_raw.json: each clip's real speech start and end
python3 build_timeline.py                                  # timeline.js/.json, captions, the short tape's ranges, web/chapters.json
.venv/bin/python check_captions.py                         # captions vs the real clips, holds silent and uncaptioned
.venv/bin/python music.py all                              # ../music/ candidates, ../work/ course bed and ad beds
.venv/bin/python audio.py                                  # ../work/mix.wav, -19 LUFS, the holds digital silence
node render.mjs --preview 33,54,207.5                      # stills in ../work/preview/
node render.mjs --full                                     # ../work/master.mkv, frame by frame (about 6 min)
sh encode.sh                                               # the full MP4, the light MP4, web/full.mp4, web/short.mp4
python3 finalize_web.py                                    # web/chapters.json durations from the files, the interface checks, ../READY
python3 cut_segments.py                                    # ../segments/ (and light/)
python3 contact_sheet.py                                   # ../frames/, ../contact_sheet.jpg (decoded from the MP4)
# from output/teaching-tapes/2016/video/: python3 source/check_files.py web/full.mp4 web/short.mp4; .venv/bin/python source/check_holds.py
```

### 5.11 For his eye (T83)

1. **The hands.** The storyboard's drawn hand, moved frame by frame, a pen for the lettering and a brush for the washes,
   lettering at sped-up journaling speed. Smooth drawing, not Renata's pixel blocks: the course is a 2016 HD stream, the
   room's film is a phone video on a canvas. *Look for:* does it read as 2016, and as a women's course?
2. **The five cards** (§5.5): each line and head. Part 2's card quotes only the first clause of the booklet's sentence
   (its continuation is in the table). The collapse card uses three ellipses to fit two lines.
3. **Part 4 has no card** (§5.5). *Option:* the APA's "no evidence that teaching or reinforcing stereotyped
   gender-normative behavior…" as a third line or a shortened card.
4. **The pause** (the 2016 hold): a ❚❚ glyph held at the upper centre and a dimmed scrubber; the frozen frame keeps the
   hand mid-stroke. At the collapse the card covers the lower half of the three boxes for 3.5 s.
5. **Voices** (Supertonic F5 presenter, F4 announcer). **I could not listen.** Please check "defensive detachment",
   "idolatry", "nineteen ninety-three", "Mom", and that F5 sounds warm and close, F4 like an ad.
6. **The music.** **I could not listen either**: the two candidates are on the page; please check the ukulele's timbre
   (Karplus–Strong), the felt piano, the claps, how flat the ad stings are, and the levels under the voice.
7. **The ads' excess** (§5.3 item 5), and *Becoming Her*'s date flag (a 1993–2004 practice in a 2016 conference).
8. **New display text** (drafts): the notes in the journal "she pulls back →", "+ even a hospital stay", "“necessary for
   my security”"; the "Words to hear" header; the viewer guide's p. 30 question "She may begin to ________ her own sex.";
   the end card's "Heartwood · Session Three: The Wound — next week"; the ads' "NEW!", "every session online after",
   "Ask about payment plans!", "women and men welcome", "Monday evenings".
9. **"Mom" and "Mum".** The presenter says "Mom" (§2's line) while the journal writes "mirror · lipstick · Mum" (§2's
   storyboard). Kept as §2 had them; one should go. Likewise §2's British spellings ("labelled", "centre") in an American
   course's captions.
10. **Length** 3:42.4. *Could cut if long:* Part 4 whole (18.9 s, no card), or the lifeguard in Part 6 (about 9 s).
11. **The short tape** (§5.8): Part 1, the *Too Close?* ad, the collapse from "Romantic gestures…"; 58.4 s.
12. **The end:** silence after the collapse; the journal closes; a fade. *Option:* a soft return of the course's music
    under the end card.
13. **The captions** in Roboto, the platform's face, with "[gentle music]", "[upbeat music]", "[music stops]".
14. **The folder:** the videos are in `2016/video/` beside job 24's `2016/storyboard/` (the orchestrator's call).
15. **The GracePlatform wordmark** in the ads and the control bar (a blue square with a play triangle, Roboto bold) is
    invented for the tape; the room has no drawn logo.
