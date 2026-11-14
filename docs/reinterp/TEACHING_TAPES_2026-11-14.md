STATUS: live

# The teaching tapes (14 Nov 2026, S387, UiB job 24 Part B)

*Drafts for Sérgio to watch and read before anything is built into the piece. Nothing in `src/`, `data/` or `public/`
changed. Every line of display text is a draft for his eye. Brief: `UIB_JOB_24_2026-11-14.md` Part B. Research:
`RESEARCH_ROOTS_CAUSES_LIA_2026-11-14.md` (the archive read: §2 the causal model as taught, §4 the marketplace, §5 and
§8G the ethics flags, §6 and §8F the segments) and `SOURCES_TO_FETCH_2016_2026_2026-11-14.md` (§7, his 14 Nov downloads,
which serve 2016 and 2026).*

## The three tapes

One tape for each room, each a teaching tape of its period that explains "why you are like this" the way the
programmes taught it.

| room | year | who | the tape | here |
|---|---|---|---|---|
| 1 | 1997 | Daniel (gay) | TriedPath Fellowship, "Understanding Your Roots": six lessons on the causes, cut by four ministry commercials | §1, a video |
| 2 | 2016 | Vera (lesbian) | the women's teaching of the period | §2, script and storyboard |
| 3 | 2026 | Maya (trans) | a course for her parents | §3, script and storyboard |

The same rules hold for all three. Each tape teaches the theory as it was taught, from dated documents, and every line
cites a document and a page. Satire lives only inside the programme's own self-presentation, and each tape collapses
in its own sources' words. No real names, no faces, no testimony, no slurs; invented marks only. Later, the TV in each
room could play one segment at a time (his 14 Nov note: "the TV present on the three spaces"). That is a later build.

**Why v2, and how it differs from v1 and from the opening advert.** His note on v1 (job 23): the content was good,
"minus the abusive use of static and noise", but its message was "very similar to the initiation video from the
start". v1 explained the programme's procedure (answers, a root, a mentor, the family, a placement, consent), and that
procedure is what the opening advert's "how it works" already shows. v2 teaches the theory instead: why the programme
said you are gay. It drops the procedure and the consent form.

| | opening advert ("LambyOS — Welcome Home") | v1, the orientation tape (13 Nov) | v2, this tape |
|---|---|---|---|
| what it does | sells: an infomercial | explains the procedure to someone enrolled | teaches the theory of causes; sells only in its breaks |
| subject | the product | answers, root, mentor, family, placement, consent | the triangle, the father's words, the safe years, envy, memory tapes, decisions |
| picture | star wipes, pedestals, a product parade, chunky 3D type | one felt board, five numbered steps | the same church felt board, used as a classroom board; four cheap local spots |
| static | the tape chews into noise | a hiss bed, snow, an eject into snow | no snow, no hiss; a soft tracking line at each join; the eject at the very end, into the deck's blue |
| ending | "SOLD AS CARE!" | "Your confirmation was not required." | the programme's own library: "something they never chose" |

## 1. 1997: "Understanding Your Roots"

### 1.1 Files

In `output/teaching-tapes/1997/` (git-ignored; not in git):

- `teaching_tape_1997_v2.mp4`: 3:42.9 (222.9 s), 1920×1080 with the 4:3 picture pillarboxed (as v1), 30 fps,
  H.264 (yuv420p, faststart) and AAC stereo, 86.4 MB. Loudness −19.0 LUFS integrated (v1's level), true peak −0.9 dBTP (the mix itself peaks at −1.5 dBFS).
- `teaching_tape_1997_v2_light.mp4`: the same at 720×540 (the 4:3 picture alone; the captions sit inside it), 13.5 MB,
  −19.1 LUFS, true peak −1.7 dBTP (mono AAC behind a limiter). This is the page's copy.
- `segments/`: one file per lesson and per commercial, plus the title and the close (table in §1.2), each with its own
  `.srt` and `.vtt` (timed from zero) and `segments.json`. `segments/light/` holds the same twelve at 720×540.
- `contact_sheet.jpg` and `frames/`: twelve frames decoded from the delivered MP4, one per block.
- `captions.srt`, `captions.vtt`: every spoken line, every bubble, the sound cues. They are also burned in (line-21
  style, as v1; `>>` marks the announcer, as period captions marked a new speaker).
- `tts/`: the 42 narrator and announcer WAV masters, with a copy of the manifest (`tts_manifest.json`) and the measured
  speech extents (`timing_raw.json`); the originals are in `source/`.
- `source/`: the build (§1.11). Review page: `output/teaching-tapes/page/index.html`.

### 1.2 The running order

| file | time | length | kind | title |
|---|---|---|---|---|
| `segments/00_intro.mp4` | 0:00.0–0:17.4 | 17.4 s | title | Title and introduction |
| `segments/01_p1.mp4` | 0:17.4–0:41.4 | 24.0 s | lesson | Part 1: HOMOSEXUAL BY THREE? |
| `segments/02_c1.mp4` | 0:41.4–0:51.7 | 10.3 s | commercial | TriedPath Pocket Library (booklets) |
| `segments/03_p2.mp4` | 0:51.7–1:12.9 | 21.2 s | lesson | Part 2: THE POWER OF WORDS |
| `segments/04_p3.mp4` | 1:12.9–1:35.5 | 22.6 s | lesson | Part 3: THE SAFE YEARS |
| `segments/05_c2.mp4` | 1:35.5–1:45.8 | 10.3 s | commercial | Roots & Recovery (VHS) |
| `segments/06_p4.mp4` | 1:45.8–2:15.4 | 29.6 s | lesson | Part 4: COMPARISON = ADMIRATION = ENVY |
| `segments/07_c3.mp4` | 2:15.4–2:25.9 | 10.5 s | commercial | Un-Walk Steps (a class, binder included) |
| `segments/08_p5.mp4` | 2:25.9–2:52.8 | 26.9 s | lesson | Part 5: YOUR MEMORY TAPES |
| `segments/09_c4.mp4` | 2:52.8–3:05.4 | 12.6 s | commercial | Women Relating to Men (a church class) |
| `segments/10_p6.mp4` | 3:05.4–3:25.5 | 20.0 s | lesson | Part 6: A SERIES OF DECISIONS |
| `segments/11_x.mp4` | 3:25.5–3:42.9 | 17.4 s | close | For further study (the close) |

Each lesson runs 21–30 s and each commercial 10–13 s, as the brief asks; the whole is 3:42.9. The title block
(17 s) and the close (17 s, with the eject) are their own files, so a TV can play a single lesson without them.

### 1.3 The look

**The lessons: v1's church video, now a classroom board.** The same camcorder on a tripod in a church hall, the same
felt board, the same CG part cards in navy and yellow, the same line-21 captions. What is on the board changes: paper
word strips, faceless felt figures with paper name tags, a felt ruler of ages, red yarn for the bonds, rubber stamps, a
workbook page. The documents give the look (research §8F1): the handbook's workbook page (a numbered question with space
to write, which becomes the pause in Part 4), the class manual's equation with its "=" signs, the outline's capitals.
Pieces are placed one at a time by an unseen hand, as in v1.

**The commercials: a cheaper source.** Each is a 1997 local Christian-TV or ministry spot with a phone number in a navy
bar and, where a period price is documented, the price. The over-the-top comes from cheapness (his bar for any
seller-voice artifact), never from the advert's grammar.

1. **TriedPath Pocket Library**: a rostrum camera pans by hand across a fan of thirteen booklets on a blue cloth, then
   lurches onto a hand-lettered "$1.00 each" card on a little easel.
2. **Roots & Recovery (VHS)**: the box stands on a wood-grain table. As the small print "Picture quality may vary" comes
   up, the spot's own picture starts to wobble and tear, like a dub of a dub.
3. **Un-Walk Steps**: a still of a church classroom (a binder, a red journal, a whiteboard reading "Fear · Isolation ·
   Envy", stacking chairs). The class rules tick in, then "KEEP A JOURNAL!", then "There is no free lunch!" where a
   price would be.
4. **Women Relating to Men**: a photocopied flyer (Comic Sans, clip art, copier speckle) pinned on a cork board; the
   camera tilts down it as the announcer reads.

**Static.** No snow anywhere, no hiss bed. A soft tracking line rolls through each join for half a second, with a faint
tick. The VHS softness, the colour bleed and the head-switching band stay at v1's level; dropouts are rarer than in v1.
The deck starts with a soft band and ends with the eject: a jolt, the picture rolls, the deck's empty blue, black.

**Lamby** is v1's felt Lamby (from `src/desktop/apps/lambyChar.ts`), silent, with seven felt bubbles, one per block.
He never appears in the commercials, which belong to other producers. He is not at the close.

**Colour** is v1's: every fill is a token from `src/desktop/theme/` (the list is at the top of `source/tape.js`). Felt
fibre, paper grain, shadows and tape softness are those colours darkened or lightened at low alpha.

[VERIFY SOURCE] for the period claims in this section (local Christian-TV spots with phone numbers in the 1990s,
church teaching on felt boards, line-21 decoders in US televisions from 1993). They are design reasons, not dossier
claims.

### 1.4 The script, with sources

*N = the narrator (the fellowship; spoken, captioned). A = the announcer (the commercials; spoken, captioned). L =
Lamby's bubble (silent, captioned). CG = character generator. board / screen = text placed on the board or shown in a
spot. Quotes are short; the tape paraphrases. Pages are "PDF p." (the scan) and, where the booklet has its own numbers,
"printed".*

| time | who | line | source (document, page) | invented, dated or noted |
|---|---|---|---|---|
| 0:01 | CG | TriedPath Fellowship presents / UNDERSTANDING YOUR ROOTS / A Teaching Tape in Six Parts / For home study and small groups. | Invented marks (TriedPath Fellowship is 1997 canon). The title echoes the back-cover line of PR-02 1993, "Understanding the Roots of Homosexuality" (PDF p. 12). | Six parts and the small print are invented. |
| 0:01 | N | TriedPath Fellowship presents: Understanding Your Roots. A teaching tape, in six parts. | Reads the title. |  |
| 0:10 | L | Hi! Let's find your roots! | — | Invented. |
| 0:10 | N | You were not born this way. It grew, one response at a time. And what was learned can be unlearned. | OUTLINE 1989 p. 2: "not as simple as someone being born gay"; it "usually stems from many intricate responses". HANDBOOK 1995 PDF p. 19 (printed 11): evidence "does not support the theory of constitutional homosexuality"; PDF p. 88 (printed 80): learned "from an early age". | Paraphrase. |
| 0:18 | N | Part one. Homosexual by three? | HANDBOOK 1995 PDF p. 20 (printed 12): the heading "Homosexual by Three?". |  |
| 0:18 | board | Ruler: BIRTH · 6 MO. · 18 MO. · 3 YRS | HANDBOOK 1995 PDF p. 20 (printed 12): a child "knows if he is wanted or not" by six months; "gender identity" forms "from eighteen to thirty-six months". | The handbook gives no source for either claim [VERIFY SOURCE]. Shown as the teaching, not as fact. |
| 0:20 | N | A child's security rests on three bonds: mother to child, father to child, and father to mother. | HANDBOOK 1995 PDF p. 21 (printed 13): "a three-way bond: mother to child, father to child and ... father to mother". | The triangle, from a 1984 text: no need for the 2001 booklet. |
| 0:27 | N | Any break in this triangle produces insecurity. Real, or only perceived, the results are the same. | HANDBOOK 1995 PDF p. 21 (printed 13): "Any break in this triangle will produce insecurity"; "whether the break is real or only perceived ... the results are the same". | Close paraphrase. |
| 0:34 | L | Even if nothing happened! | — | Invented. It says what "real or only perceived" means: the theory needs no event. Aimed at the teaching, never at the child. |
| 0:35 | N | So, is a boy homosexual by three? No. But the roots may all be in place. | HANDBOOK 1995 PDF p. 20 (printed 12): "No. But the root causes ... may be all in place by that time." |  |
| 0:42 | A | The TriedPath Pocket Library. Thirteen little booklets. The roots, the way out, and help for the family. Just one dollar each. | The series: EXODUS BACK PAGE (codes #PR-01 to #PR-13; booklets © 1993–1998). The price: EXODUS PRICE 1987, an Exodus booklet priced 1.00 (PDF p. 15). | Booklet titles on the covers are invented. Phone 1-800-555-0143 is in the fictional 555-01xx range. |
| 0:47 | screen | PR-1 to PR-13 · Society · Prevention & Recovery · Counseling · Family & Friends · Church | EXODUS BACK PAGE: the five categories as printed. |  |
| 0:52 | N | Part two. The power of words. | PR-02 1993 PDF p. 5 (printed 8): the subhead "Power of Words". |  |
| 0:55 | N | Between two and six, a boy must leave his mother's world, and his father must welcome him into his own. | PR-02 1993 PDF p. 5 (printed 8): the boy must "transfer his identification with 'mom'" to "dad"; PDF p. 6 (printed 9): ages "two to six"; "He needs his father to welcome him into the male world." | Paraphrase. |
| 1:00 | board | WORDS TO HEAR: "Let's go for a walk, just us." (says: you belong with me) · "You're just like your dad!" (says: you are one of the men). WORDS TO FEAR: "You're too old for hugs now." (says: you are on your own) · "Go help your mother in the kitchen." (says: you belong with the women) | Patterns: PR-02 1993 PDF p. 6 (printed 9), "let's go for a walk together"; PDF p. 5 (printed 8), "you are just like your daddy!"; PDF pp. 6–7 (printed 9–10), fathers who withdraw affection; FOF 2001 PDF p. 12 (printed 18–19), a mother calling the boy indoors to bake; PR-02 PDF p. 8 (printed 13), "stays in the kitchen with mom". | The four lines and glosses are invented, in the documented pattern; no slurs. The two-column form and the glosses are the 2001 booklet's (PDF p. 12; dated, later than 1997). |
| 1:07 | N | Words to hear open the door. Words to fear close it. | PR-02 1993 PDF p. 8 (printed 13): rejection "closes another door to entering the world of men". | Invented framing. |
| 1:10 | L | Every word counts! | — | Invented. Addressed to parents: the teaching puts the cause in ordinary family talk. |
| 1:13 | N | Part three. The safe years. | PR-02 1993 PDF p. 7 (printed 11): the subhead The "Safe" Years. |  |
| 1:16 | N | God designed the years from six to twelve as the safe years, for a boy to bond with other boys. | PR-02 1993 PDF p. 7 (printed 11): "The years from six to twelve are designed by God as the 'safe' years to explore same-sex relationships". | Paraphrase. |
| 1:22 | N | But a boy with no welcome from his father finds none among the boys. So he stays in the kitchen, with his mother. | PR-02 1993 PDF p. 8 (printed 13): with no father, a boy looks to other boys; if they reject him, "the little boy stays in the kitchen with mom". |  |
| 1:29 | N | And the names he is called take root. That must be who I am. | PR-02 1993 PDF p. 9 (printed 14): labels move a child "into the actual behavior that fits the label"; "that must be who I am". | The booklet's own examples of names are slurs: never voiced or shown. |
| 1:29 | board | Labels on the boy: SMALL · PICKED LAST · TEACHER'S PET | Patterns: OUTLINE 1989 p. 3 (teased "about being small and lack of sport ability"; a gym teacher's ridicule). | Invented; not slurs. |
| 1:33 | L | Go play with the boys! | — | Invented. Kind on its face; it is the cure, sent to a child. |
| 1:36 | A | Roots & Recovery. Now on video. The developmental factors, and nine proven principles. Twenty dollars. | FOF 2001 PDF p. 22 (order page): a video, "Understanding Homosexuality: Roots and Recovery", that "looks at developmental factors", with "nine proven principles", $20. | Dated 2001, later than 1997 (the video's own date is not printed). The title on the box is shortened. Phone 1-800-555-0119, fictional. |
| 1:43 | screen | Picture quality may vary. Offered for the relevance of its message. | FOF 2001 PDF p. 22: "product quality is not typical of Focus on the Family offers. However, we make this resource available due to the relevance of its message." | Paraphrase. The spot's own picture gives way as the line comes up. |
| 1:46 | N | Part four. Comparison, admiration, envy. | STEPS OUT c.1994 pp. 284–285: "Comparison = Admiration = Envy = Inappropriate Response" (the on-screen title uses its "="). |  |
| 1:50 | N | Without his father's protection, a boy withdraws: into fear, isolation, and envy. | HANDBOOK 1995 PDF p. 23 (printed 15): with an absent father the child feels "exposed and unprotected"; withdrawal "produces three negative side-effects: FEAR, ISOLATION and ENVY". | First published 1984. |
| 1:56 | N | He compares himself with other boys. Comparison becomes admiration. Admiration slips into envy. | HANDBOOK 1995 PDF pp. 25–26 (printed 17–18): "simple COMPARISON of one's self with others", then "ADMIRATION", then "this admiration slips into ENVY and a strong desire to possess". |  |
| 2:03 | N | At puberty, the envy becomes eroticized. | HANDBOOK 1995 PDF p. 26 (printed 18): "Thus, envy becomes eroticized." |  |
| 2:04 | board | = INAPPROPRIATE RESPONSE | STEPS OUT c.1994 pp. 284–285, the equation's last term. | The same page calls the factors "open to speculation". |
| 2:06 | N | Question twenty-five. Describe envy in your early life. Pause the tape, and write your answer. | HANDBOOK 1995 PDF p. 26 (printed 18), question 25: "Describe envy in your early life and its effects today." The numbered-question column beside the text is the handbook's form. | "Pause the tape" and the 3-second pause are invented. |
| 2:12 | L | Take your time! | — | Invented. Over the blank lines of the homework. |
| 2:16 | A | Un-Walk Steps. A weekly class for men. Lessons read. Homework done. Pen and binder in hand. Keep a journal. And be on time. | STEPS OUT c.1994 pp. ii–v: "Come prepared—lessons read, homework done, pen and binder in hand", "KEEP A JOURNAL!", "Be on time!". | Un-Walk is the 1997 programme's invented mark. "Weekly" and "7:30" are invented. Phone 555-0186, fictional. No price: none is documented. |
| 2:22 | screen | There is no free lunch! | STEPS OUT c.1994 p. ii: "(There is no free lunch!)". | It stands where a price would be. |
| 2:26 | N | Part five. Your memory tapes. | HANDBOOK 1995 PDF p. 140 (printed 132): "your memory tapes". |  |
| 2:29 | N | The orientation was learned early. It is nothing more than a deeply ingrained habit. | HANDBOOK 1995 PDF p. 88 (printed 80): the orientation is "nothing more than a deeply ingrained habit. It has been learned from an early age". |  |
| 2:35 | N | Your mind works like a computer. Garbage in, garbage out. | HANDBOOK 1995 PDF p. 143 (printed 135): "Our mind works like a computer"; PDF p. 139 (printed 131): "garbage in/garbage out". |  |
| 2:39 | N | In thirty days, we forget eighty percent of what we learned. For you, that is a blessing. | HANDBOOK 1995 PDF p. 137 (printed 129): after thirty days "we forget about 80 percent of everything we learned"; for someone leaving "the gay lifestyle, this principle can be a blessing". | The figure is the handbook's, cited to unnamed college surveys [VERIFY SOURCE]. Shown as the teaching, not as fact. |
| 2:45 | N | So fill your memory tapes with new material, until the bulk of it ejects the old. | HANDBOOK 1995 PDF p. 140 (printed 132): "adding mountains of material to your memory tapes. It will be this bulk of the material that ejects the desires and temptations of the old way of life." |  |
| 2:46 | board | New tapes: BIBLE STUDY · PRAYER · FELLOWSHIP · SERVICE | HANDBOOK 1995 PDF p. 138 (printed 130): "Bible study, prayer, concern for others, fellowship, service and Scripture memorization". |  |
| 2:50 | L | Record over it! | — | Invented. A tape telling its viewer to record over himself. |
| 2:53 | A | You may be saying: "I don't want to go to this class!" Women Relating to Men. For all married and single women. Thursday, at seven-thirty. Don't end up saying: "I wish I had gone." | WOMEN ONLY 1992 PDF pp. 17–18: the title, "For All Married and Single Women", both hooks, "Thursday, 7:30 P.M.". The five topics on screen are the flyer's (one is "Single women relating to ex-gay men"). | The presenters' names, the church and its address are not used; "TriedPath Fellowship · Fellowship Hall" replaces them. Phone 555-0168, fictional. No price on the flyer. |
| 3:06 | N | Part six. A series of decisions. | PR-02 1993 PDF p. 3 (printed 2). |  |
| 3:09 | N | Every stage was a response. And every response was a decision. | PR-02 1993 PDF p. 3 (printed 2): "a series of decisions in response to our life development process". | Paraphrase. |
| 3:13 | N | Homosexuality develops out of a series of decisions. So new decisions, made as an adult, can undo it. | PR-02 1993 PDF p. 3 (printed 2): "I believe that homosexuality develops out of a series of decisions"; "making new decisions as adults, those who pursue freedom ... can find it." | The research file gives printed p. 3; the page image shows printed p. 2. |
| 3:16 | board | Stage cards bonds · words · peers · envy, each stamped DECISION; the ADULT card turns to "new decision" | Staging of the same sentence. | Invented. |
| 3:21 | L | You can choose again! | — | Invented. |
| 3:22 | N | Burn your bridges. The decision is yours. | HANDBOOK 1995 PDF p. 44 (printed 36): "Bridges must be burned. A decisive decision must be made."; "Again, the decision is yours." |  |
| 3:26 | N | For further study: the Pocket Library, booklet one. | Invented link to the library sold at 0:42. |  |
| 3:30 | N | Homosexual people say they never asked for their orientation. In most cases, that is true. | PR-01 1996 PDF p. 34 (printed 17): "Their claim of not having asked for their orientation is, in most cases, true". | Paraphrase. Same Exodus series, under the same back page, as the "series of decisions" booklet. |
| 3:31 | screen | The booklet page: "We can allow that genetics may one day be found to play a role. We can agree that the attraction often begins very early in life." | PR-01 1996 PDF p. 34 (printed 17): "the possibility of genetics someday being found to play a role"; the condition "begins very early in life". | Paraphrase. The booklet (PR-1 "Born That Way?") is invented; its page number 17 is the real page's. |
| 3:37 | N | Something they never chose. | PR-01 1996 PDF p. 34 (printed 17): "something they never chose". | The booklet's own four words. THE COLLAPSE (§1.6). |

**The documents** (Smithsonian National Museum of American History, Archives Center, NMAH.AC.1428, the Mattachine
Society of Washington "Love in Action" Collection; local copies in `~/Pc_Simulation/Sources/Boy Erased/`). Authors and
staff are identified by role only; no name goes into the piece.

- **OUTLINE 1989**: Smithsonian NMAH.AC.1428 (Love in Action Collection), Box 3 Folder 3, "What Can Lead to Homosexuality?": a typed lecture outline, numerals I–XIV, dated by hand 1-23-89 on each page; unsigned. 4 PDF pp. Local: Nov additions/NMAH-AC1428-B003-F003.pdf (OCR in ocr/).
- **HANDBOOK 1995**: NMAH.AC.1428 Box 2 Folder 13, "Helping People Step out of Homosexuality", the Love in Action founder's handbook "for pastors, counselors, lay workers"; revised edition © 1995, first published © 1984 as "Steps Out of Homosexuality". 190 PDF pp. Cited as PDF p. (printed p.). Local: Nov additions/NMAH-AC1428-B002-F013.pdf.
- **PR-02 1993**: NMAH.AC.1428 Box 2 Folder 12, Exodus International Resource Booklets (folder dated 1998): booklet #PR-02 "Are People Born Gay?", by Love in Action's director, © 1993 (first a series in LIA's Lifelines newsletter). PDF pp. 1–12, two printed pages per PDF page. Re-OCR'd from New/NMAH-AC1428-B002-F012.pdf for this job; page images checked.
- **PR-01 1996**: Same folder: booklet #PR-01 "Is Homosexuality Inborn?", an excerpt of a 1996 book by an Exodus leader, © 1996. PDF pp. 25–36.
- **EXODUS BACK PAGE**: Same folder: the back page "Resource Booklets", printed after each booklet (PDF pp. 13, 24, 37, 50, 65): five categories, codes #PR-01 to #PR-13, no prices.
- **EXODUS PRICE 1987**: NMAH.AC.1428 Box 2 Folder 9: the 1987 Exodus edition of "Emotional Dependency"; its back cover is priced 1.00 (PDF p. 15). Used here only for the price of an Exodus booklet before 1997.
- **STEPS OUT c.1994**: NMAH.AC.1428 Box 13 Folder 1, Love in Action "Steps Out Program Class Manual"; latest dated item inside June 1994. Manual pp. ii–v (the class rules) and pp. 284–285 (the equation). Local: New/NMAH-AC1428-B013-F001.md.
- **WOMEN ONLY 1992**: NMAH.AC.1428 Box 1 Folder 3, "Women Only": the flyer "Women Relating to Men", Thursday 11 June 1992, 7:30 P.M. (PDF pp. 17–18). Local: Nov additions/NMAH-AC1428-B001-F003.pdf.
- **FOF 2001**: NMAH.AC.1428 Box 6 Folder 5, Focus on the Family, "the truth comes out: The Roots and Causes of Male Homosexuality" (2001): the "Words to Hear / Words to Fear" panel (PDF p. 12, printed 18–19; re-OCR'd and checked for this job) and the order page (PDF p. 22). Later than 1997: dated where used.

**Period truth.** Every lesson line rests on a document dated 1998 or earlier: the 1989 outline, the 1984 handbook (in
its 1995 revision), the 1993 and 1996 Exodus booklets, the c. 1994 class manual. Two things are later and dated in the
table: the two-column "Words to Hear / Words to Fear" form (2001) and the VHS spot (a 2001 order page). Nothing from the
2001 "Roots and Causes" booklets is taught as text.

**One correction to the research file.** RESEARCH_ROOTS §2A (A10) gives the "series of decisions" sentence as PR-02
printed p. 3. The page image shows it on printed p. 2 (PDF p. 3). The 2001 booklet's Words panel is on its PDF p. 12
(printed 18–19).

### 1.5 The storyboard

| time | picture | what is placed, what happens |
|---|---|---|
| 0:00–0:17 | the deck; the CG title; the board | A soft band rolls away. The CG title on navy, with TriedPath's mark (a sunrise over a path). Dissolve to the felt board; the camcorder refocuses. A paper banner, UNDERSTANDING YOUR ROOTS. A felt ground strip; a sprout grows in three steps, its roots growing below the ground, on "It grew, one response at a time". Lamby is placed: "Hi! Let's find your roots!" |
| 0:17–0:41 | Part 1, the board | Part card. A felt ruler: BIRTH, 6 MO., 18 MO., 3 YRS. MOTHER, FATHER and CHILD placed as a triangle. Red yarn is drawn as each bond is named. On "Any break" the father–mother yarn snaps and both halves fall. Strips REAL = PERCEIVED. "Even if nothing happened!" A pin at 3 YRS with the tag HOMOSEXUAL BY THREE?; a red NO stamp on it; felt roots grow under the child on "the roots may all be in place". |
| 0:41–0:52 | C1, a rostrum shot | Thirteen booklets fanned on blue cloth, the camera panning by hand. The CG TriedPath POCKET LIBRARY; the five categories; the phone bar; a clumsy push onto the "$1.00 each" card. |
| 0:52–1:13 | Part 2, the board | Close on MOTHER, BOY, a closed door, FATHER. The door opens on "welcome him"; the boy crosses to his father. The camera pulls back: felt headers WORDS TO HEAR (green) and WORDS TO FEAR (red); four strips placed in turn, with only music, each with its gloss ("says: …"). "Every word counts!" |
| 1:13–1:35 | Part 3, the board | A ruler 0 to ADULT; a green felt bracket THE SAFE YEARS over 6–12. The boy. Three boys with a ball arrive, then move off. A kitchen (a window, a stove, a KITCHEN tag, MOTHER); the boy goes in. Three name tags are pinned on him: SMALL, PICKED LAST, TEACHER'S PET. Roots under him. "Go play with the boys!" |
| 1:35–1:46 | C2, a table | The VHS box on wood grain. NINE PROVEN PRINCIPLES; $20 in a red box; the phone bar; the small print, and the picture gives way. |
| 1:46–2:15 | Part 4, the board | Felt cards FEAR, ISOLATION, ENVY. Strips COMPARISON = ADMIRATION = ENVY, then = INAPPROPRIATE RESPONSE. The camera pushes onto a workbook page: "25. Describe envy in your early life and its effects today", ruled lines, a pencil. CG: PAUSE THE TAPE / and write your answer. Three seconds of quiet. "Take your time!" |
| 2:15–2:26 | C3, a classroom | The class still; Un-Walk STEPS; three ticks; KEEP A JOURNAL!; the phone bar; "There is no free lunch!" |
| 2:26–2:53 | Part 5, the board | A felt head in profile (no features) with a tape deck inside. The OLD tape and its HABIT tag. GARBAGE IN at the back of the head, GARBAGE OUT at the face. A calendar DAY ONE · 30 · DAYS LATER and a tag 80% FORGOTTEN. Four new tapes slide in and stack: BIBLE STUDY, PRAYER, FELLOWSHIP, SERVICE. The OLD tape is ejected out of the back of the head and falls. "Record over it!" |
| 2:53–3:05 | C4, a cork board | The flyer, top to bottom: the title, the first hook, the topics, the second hook, "Thursday, 7:30 P.M."; the phone bar. |
| 3:05–3:26 | Part 6, the board | A ruler; five stage cards: bonds, words, peers, envy, ?. A red DECISION stamp lands on each of the first four. The "?" card turns to "new decision". THE DECISION IS YOURS. "You can choose again!" |
| 3:26–3:43 | the close | The music stops. Booklet PR-1 (the one sold at 0:42) is pinned above the board; the camera goes to it. Cut to its page 17. The narrator reads; a highlighter runs under the sentence, then under "something they never chose". The part card comes back over the page: PART 6, A SERIES OF DECISIONS. Two seconds of silence. The eject: a jolt, the picture rolls, the deck's blue, black. |

### 1.6 The collapse, and why it is the plainest

The tape says its thesis three times (0:10, 3:09, 3:13): it was not born in you; it grew; it "develops out of a series
of decisions", so new decisions undo it. The source is the 1993 booklet PR-02 (printed p. 2). Then the close reads
booklet one of the same library: PR-01 (© 1996, printed p. 17), sold in the same Exodus series under the same back
page. It says that most gay people never asked for their orientation, "something they never chose". The part card
returns over the page, so the lesson's title and the library's sentence sit in one frame. Nothing is added: no joke, no
comment, no music.

The documents offer other cracks. Each is weaker:

1. **"A lack of agreement"** (the 1989 outline's point I; PR-02 printed 1). An opening hedge that the speaker absorbs at
   once ("I believe…"). It qualifies the thesis; it does not contradict it.
2. **"Real or only perceived, the results are the same"** (handbook PDF p. 21). It shows the theory needs no event, but
   the viewer has to work that out. The tape gives it to Lamby instead ("Even if nothing happened!").
3. **"It is wrong to draw up one pattern and then try to squeeze every person into that particular box"** (PR-02
   printed 2, right after the thesis). True, but a disclaimer, and soft.
4. **"They can't 'just stop'"** (handbook PDF p. 141) against "a deeply ingrained habit". A nuance about the process.
5. **"Open to speculation"** (class manual p. 285). A hedge in small print.

PR-01's sentence is the plainest because it states the opposite of the tape's own thesis, in four plain words, in the
programme's own library, before 1997. It needs no outside evidence, no inference and no added satire. The viewer needs
to know nothing except what the tape has just said.

### 1.7 What is placeholder or invented

1. **All display text is a draft:** the narrator's 30 lines, the announcer's 12 lines (four spots), Lamby's seven
   bubbles, the CG, the board text.
2. **Invented:** the title, "six parts" and the small print; the four "words" lines and their glosses (in the documented
   pattern); the name tags; the stage cards; "Pause the tape"; the booklet titles; the class's "weekly" and "7:30"; the
   phone numbers (all in the fictional 555-01xx range); "TriedPath Fellowship · Fellowship Hall" on the flyer; the text
   of PR-1's page (a paraphrase around the four quoted words).
3. **Later than 1997, dated in §1.4:** the two-column Words form (2001) and the VHS spot (2001 order page).
4. **New drawings for this video:** the felt figures, the head, the sprout, the cassettes, the booklet covers, the VHS
   box, the classroom and the flyer, all in the piece's palette. The felt Lamby is v1's.
5. **Fonts** are macOS system fonts rendered into the frames (Marker Felt, American Typewriter, Helvetica Neue, Arial
   Rounded, Georgia, Copperplate, Comic Sans MS, Brush Script MT, Menlo). Fine for a draft; a built-in version would use
   the piece's fonts and its licence check.
6. **The tape alone:** no TV, no room, no turn. Playing one segment at a time on each room's TV is a later job.

### 1.8 The laws, checked

- **No real names on screen** (authors, staff, clients): none. The flyer's presenters, church and address are removed.
  In this file, documents are identified by archive folder and the author's role.
- **No faces:** every figure is a faceless felt silhouette; the head in Part 5 is a featureless profile; no cover shows a
  person.
- **No testimony:** none of the booklets' "true stories", case names or authors' own stories (research §5C, §8G3). The
  outline's italic memories and the handbook's own story are not used.
- **No slurs:** the "Words to Fear" lines and the name tags are invented and are not slurs. The booklets' own
  name-calling is never voiced or shown.
- **No abuse figures, anywhere:** abuse taught as a cause (§5A6) is not on this tape at all; no survey or harm figure
  appears. The only number is the handbook's "80 percent forgotten", a learning claim, marked [VERIFY SOURCE] and shown
  as the teaching.
- **§5 and §8G flags, none on the tape:** the transsexuality tab, suicide, AIDS, deliverance, the parents' prayer, the
  genogram and its adjacency, depression as selfishness, the group rules. "Your Family, Mapped" was left out: it is
  c. 1999–2001 and puts H beside Criminal/Jail and Death-suicide. "Who Plays Whom at Home?" was left out: the 1998
  chart never names homosexuality, so a 25-second segment would need to say so and teach little.
- **Invented marks only:** TriedPath Fellowship and Un-Walk (1997 canon); TriedPath Pocket Library, Roots & Recovery and
  Un-Walk Steps (new). HopeRestored (2003 and 2026 in the piece) is kept off this tape. No real organisation is named
  on screen.
- **Every line cites a document and a page:** §1.4.

### 1.9 Credits

- **Script, storyboard, animation, sound design and edit:** Claude (Anthropic, Opus 5.5), UiB job 24 (S387), for *YOUR
  UPDATE HAS FAILED* (SurvivingSOGICE, University of Bergen, Center for Digital Narrative). The felt Lamby, the
  renderer's base and the VHS layer are v1's (job 23, S385).
- **Music:** Sérgio Galvão Roxo's own loops, from `Pc_Simulation/Sources/Jingle_Brand New/`: "Morning Joy Loop – Hope
  Path Loops" under the lessons; "– Guided Future Jingle" (C1); "– Better Version Jingle" (C2, with wow and flutter);
  "– Optimized Transitions" (C3); "– Rainbow Valley Loop" (C4). Mono and band-limited like a VHS linear track. The close
  has no music.
- **Narrator:** build-time Supertonic 3, stock voice F1, speed 0.94, `register: apparatus`, through
  `tools/tts/render.py`. It is the fellowship's voice (1997 tape A, and v1), not the advert's M3.
- **Announcer (the commercials):** Supertonic 3, stock voice M1, speed 1.0, `register: apparatus`. No other line in the
  piece uses M1.
- **Lamby** has no voice.
- **Sound effects** (the deck, the felt, the stamps, the yarn, the CG blips, the felt-tip, the eject): made in code for
  this tape (`source/audio.py`, seed 1997).
- **Sources:** §1.4. Archive: Smithsonian NMAH.AC.1428; finding aid links have the form
  https://mads.si.edu/mads/id/NMAH-AC1428-B002-F013.

### 1.10 For his eye (T82)

1. **The segments and their order.** *Choice:* Homosexual by Three? → The Power of Words → The Safe Years → Comparison =
   Admiration = Envy → Your Memory Tapes → A Series of Decisions. *Why:* the order of a life (birth to three, two to
   six, six to twelve, puberty, adulthood), as the booklets stage it, ending on the thesis the close undoes. *Left out:*
   Your Family, Mapped (c. 1999–2001; the H beside Criminal/Jail), Is This My Fault? (2002, and the parents' material
   belongs to the 2026 course), What Can Lead To…? and Strength, Power, Protection (their lines are folded into the
   intro and Part 2).
2. **The commercials.** *Choice:* a booklet library ($1.00), a VHS ($20), a men's class with a binder, a church class
   for women. *Why:* the brief's booklets, VHS and class, with documented prices where any exist. *Not used:* the summer
   conference (its only details sit inside a testimony) and the cassettes (no period price or wording found). *Look
   for:* is the women's class (the 1992 flyer, nearly verbatim) too comic, or right?
3. **Prices.** Only two spots show a price, because only those prices are documented: $1.00 (an Exodus booklet, 1987)
   and $20 (the 2001 order page). The class shows "There is no free lunch!" from its own manual; the flyer shows none.
4. **The collapse.** PR-01's "something they never chose", read flat, with the part card above it (§1.6). *Decide:* is
   the returning part card too pointed, or the right amount?
5. **Lamby's lines.** "Hi! Let's find your roots!", "Even if nothing happened!", "Every word counts!", "Go play with the
   boys!", "Take your time!", "Record over it!", "You can choose again!". *Look for:* "Go play with the boys!" is
   addressed to a child; kind on its face, it carries the cure. Is that within "never jokes at the victim"? I think yes,
   because the joke, if any, is on the teaching.
6. **The announcer.** A second voice (M1) for the commercials, so the breaks sound like breaks. *Option:* no voice in
   the spots, text and music only.
7. **The music.** His loops, one per spot, and Hope Path under the lessons. **I could not listen:** please check that
   none of these loops has a vocal line, and how the wow and flutter on C2 sounds.
8. **Static.** None between parts; a half-second tracking line at each join; the eject at the end into blue, not snow.
   *Look for:* still too much, or now too clean?
9. **Length.** 3:42.9. *Could cut:* the title block by about 4 s; the pause in Part 4 by 1 s.
10. **The pause to write** (Part 4): three seconds of near-silence under PAUSE THE TAPE. *Decide:* longer (a real
    workbook pause) or shorter.
11. **The title.** *Choice:* "Understanding Your Roots, a teaching tape in six parts", not "Tape 2 of 3", so it does not
    depend on v1. *Option:* make it Tape 2 of the orientation series.
12. **The 12s.** On screen: the safe years' "6–12" and "12" (from the source) and booklet PR-12 in the fan. No case or
    drawer number.
13. **Listen for** the pronunciation of "Tried Path" (given as two words), "Un Walk", "eroticized" and "Homosexual". I
    checked the clips by length and level only.
14. **Loudness.** The commercials sit about 1 LU above the lessons (C4 1.7 LU), as real breaks do. *Option:* level them.
15. **The words lines** are close to the booklets' own examples ("Let's go for a walk together"; "you are just like your
    daddy"). *Look for:* close enough to be recognisable, or too close?

### 1.11 How to rebuild

From `output/teaching-tapes/1997/source/` (Chrome, ffmpeg, the repo's `node_modules` and the project `.venv`; nothing
touches the network):

```sh
python3 make_manifest.py                                   # tts_manifest.json (the 42 lines)
.venv/bin/python tools/tts/render.py --manifest output/teaching-tapes/1997/source/tts_manifest.json --all   # from the repo root
.venv/bin/python measure.py                                # timing_raw.json: each clip's real speech start and end
python3 build_timeline.py                                  # timeline.js/.json, captions, per-segment captions
.venv/bin/python audio.py                                  # ../work/mix.wav, normalised to −19 LUFS
node render.mjs --preview 25,60,120                        # stills in ../work/preview/
node render.mjs --full                                     # ../work/master.mkv, frame by frame (~8 min)
sh encode.sh                                               # the full MP4 and the light MP4
python3 cut_segments.py                                    # ../segments/ (and light/)
python3 contact_sheet.py                                   # ../frames/, ../contact_sheet.jpg (decoded from the MP4)
python3 script_rows.py && python3 make_doc.py && python3 make_page.py   # this file and the review page
```

## 2. 2016

(written by the B2/B3 helper; merged by the orchestrator)

## 3. 2026

(written by the B2/B3 helper; merged by the orchestrator)
